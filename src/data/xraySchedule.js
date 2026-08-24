/* ตารางนัดตรวจรังสี — TOR §1.12.3 "การนัดตรวจ"
   ────────────────────────────────────────────────────────────────────────
   §1.12.3 asks for more than a datetime field: a นัดตรวจ has to land on a
   real room slot, and the person booking has to see what is already full
   before they promise a time to the patient. This module is that schedule.

   Shape of the problem, as the ศบส. radiology room actually runs:
     • one physical room serves a fixed set of modalities (the plain-film
       room also shoots dental; the ultrasound room does not shoot bone),
     • rooms do not open every weekday (US runs จ/พ/ศ, MG runs อ/พฤ),
     • a booking occupies as many CONSECUTIVE slots as the selected exams
       need — a 30-นาที ultrasound cannot be squeezed into the last 15-นาที
       slot before lunch,
     • referral-only modalities (CT / MRI / FL / BD-referral) have no room
       here at all, so the honest answer is "จองในระบบนี้ไม่ได้" rather than
       an empty calendar.

   Existing load comes from three places and is merged before display:
     1. curated/bulk rows in xrayOrders.js that already carry scheduledAt,
     2. a deterministic pseudo-load so the calendar is not suspiciously
        empty (hash-based, NOT Math.random — the same day must render the
        same twice),
     3. bookings made in this session (sessionStorage).                    */

import { XRAY_ORDERS } from './xrayOrders';
import { XRAY_EXAM_BY_ID, XRAY_MODALITY_BY_KEY } from './xrayCatalog';

/* ── sessionStorage (guarded — node smoke tests and SSR have no window) ── */
const STORE_KEY = 'mih:xray:bookings:v1';

const readStore = () => {
  if (typeof window === 'undefined' || !window.sessionStorage) return [];
  try {
    const raw = window.sessionStorage.getItem(STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

const writeStore = (rows) => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(STORE_KEY, JSON.stringify(rows));
  } catch (e) {
    /* quota / private mode — the booking still lives in memory for this view */
  }
};

/* ── ห้องตรวจ ─────────────────────────────────────────────────────────────
   `days` uses JS getDay() (0 = อาทิตย์). `capacity` is how many patients
   the room can hold in one slot — 1 everywhere today, but the field is
   there because the plain-film room gets a second tube in phase 2.        */
export const XRAY_ROOMS = [
  {
    id: 'room-xr1',
    name: 'ห้องเอกซเรย์ 1',
    short: 'XR-1',
    modalities: ['xr', 'dn'],
    days: [1, 2, 3, 4, 5],
    open: '08:00',
    close: '16:00',
    breakStart: '12:00',
    breakEnd: '13:00',
    slotMinutes: 15,
    capacity: 1,
    note: 'เครื่องเอกซเรย์ทั่วไป + ฟิล์มทันตกรรม',
  },
  {
    id: 'room-xr2',
    name: 'ห้องเอกซเรย์ 2',
    short: 'XR-2',
    modalities: ['xr'],
    days: [1, 2, 3, 4, 5],
    open: '08:00',
    close: '12:00',
    breakStart: null,
    breakEnd: null,
    slotMinutes: 15,
    capacity: 1,
    note: 'เปิดเฉพาะช่วงเช้า',
  },
  {
    id: 'room-us',
    name: 'ห้องอัลตราซาวด์',
    short: 'US',
    modalities: ['us'],
    days: [1, 3, 5],
    open: '08:30',
    close: '15:30',
    breakStart: '12:00',
    breakEnd: '13:00',
    slotMinutes: 30,
    capacity: 1,
    note: 'เปิด จันทร์ / พุธ / ศุกร์',
  },
  {
    id: 'room-mg',
    name: 'ห้องแมมโมแกรม',
    short: 'MG',
    modalities: ['mg'],
    days: [2, 4],
    open: '09:00',
    close: '15:00',
    breakStart: '12:00',
    breakEnd: '13:00',
    slotMinutes: 30,
    capacity: 1,
    note: 'เปิด อังคาร / พฤหัสบดี',
  },
];

export const XRAY_ROOM_BY_ID = Object.fromEntries(XRAY_ROOMS.map((r) => [r.id, r]));

/* วันหยุดราชการที่ห้องตรวจปิด — ปี พ.ศ. 2569 (ค.ศ. 2026) ครึ่งปีหลัง.
   Kept as a plain list so ผู้ดูแลระบบ can extend it without touching logic. */
export const XRAY_SCHEDULE_HOLIDAYS = {
  '2026-08-12': 'วันแม่แห่งชาติ',
  '2026-10-13': 'วันนวมินทรมหาราช',
  '2026-10-23': 'วันปิยมหาราช',
  '2026-12-07': 'ชดเชยวันพ่อแห่งชาติ',
  '2026-12-10': 'วันรัฐธรรมนูญ',
  '2026-12-31': 'วันสิ้นปี',
};

/* ── date helpers ──────────────────────────────────────────────────────── */
const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const THAI_WEEKDAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

export const toDateISO = (d) => {
  if (!d) return '';
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

export const minutesOf = (hhmm) => {
  const [h, m] = String(hhmm ?? '').split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

export const hhmmOf = (mins) =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

/* '2026-08-25' + '09:30' → '25 ส.ค. 2569 09:30' — the same shape
   xrayOrders.js already stores in `scheduledAt`, so a booking made here is
   indistinguishable from a curated one downstream. */
export const formatThaiDateTime = (dateISO, time) => {
  const [y, m, d] = String(dateISO ?? '').split('-').map(Number);
  if (!y || !m || !d) return '';
  const stamp = `${d} ${THAI_MONTHS[m - 1]} ${y + 543}`;
  return time ? `${stamp} ${time}` : stamp;
};

export const thaiWeekdayOf = (dateISO) => {
  const dt = new Date(`${dateISO}T00:00:00`);
  return Number.isNaN(dt.getTime()) ? '' : THAI_WEEKDAYS[dt.getDay()];
};

/* '5 ส.ค. 2569 09:00' → { dateISO:'2026-08-05', time:'09:00' } */
export const parseThaiDateTime = (text) => {
  const m = String(text ?? '').match(/(\d{1,2})\s+([^\s]+)\s+(\d{4})(?:\s+(\d{1,2}:\d{2}))?/);
  if (!m) return null;
  const monthIdx = THAI_MONTHS.indexOf(m[2]);
  if (monthIdx < 0) return null;
  const year = Number(m[3]) - 543;
  return {
    dateISO: `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(Number(m[1])).padStart(2, '0')}`,
    time: m[4] ? m[4].padStart(5, '0') : null,
  };
};

/* ── room ↔ exam matching ───────────────────────────────────────────────── */
const examOf = (id) => XRAY_EXAM_BY_ID[id] ?? null;

/* Which rooms can take THIS basket of exams? A basket is bookable in one
   sitting only if a single room covers every modality in it — mixing a
   chest film with an ultrasound means two appointments, and saying so up
   front is better than silently booking half of it. */
export const roomsForExams = (examIds = []) => {
  const exams = examIds.map(examOf).filter(Boolean);
  const modalities = Array.from(new Set(exams.map((e) => e.modality)));

  const referralOnly = modalities.filter((k) => XRAY_MODALITY_BY_KEY[k]?.referralOnly);
  const rooms = XRAY_ROOMS.filter((r) => modalities.every((k) => r.modalities.includes(k)));

  return {
    rooms,
    modalities,
    referralOnly,
    /* explains an empty `rooms` list in words the front desk can act on */
    blockReason: (() => {
      if (!modalities.length) return 'ยังไม่ได้เลือกรายการตรวจ — เลือกรายการก่อนจึงจะจองคิวได้';
      if (referralOnly.length) {
        const names = referralOnly.map((k) => XRAY_MODALITY_BY_KEY[k]?.thai ?? k).join(' · ');
        return `${names} เป็นรายการส่งต่อหน่วยบริการภายนอก — ไม่มีห้องตรวจในระบบนี้ให้จอง`;
      }
      if (!rooms.length) return 'รายการที่เลือกอยู่คนละห้องตรวจ — ต้องแยกนัดคนละใบ';
      return null;
    })(),
  };
};

export const totalDurationOf = (examIds = []) =>
  examIds.map(examOf).filter(Boolean).reduce((sum, e) => sum + (e.durationMin ?? 15), 0);

/* ── existing load ──────────────────────────────────────────────────────── */

/* FNV-1a — a stable stand-in for "the other patients already on the book".
   Deterministic on purpose: the same day must render identically on every
   re-render and every reload, which Math.random() would not do. */
const hash = (str) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
};

/* Mornings fill up first — that is how the room really books. */
const seededLoad = (roomId, dateISO, startMin) => {
  const chance = startMin < 12 * 60 ? 45 : 25;
  return hash(`${roomId}|${dateISO}|${startMin}`) % 100 < chance ? 1 : 0;
};

/* Appointments already sitting in xrayOrders.js. One order row = one XN;
   several film rows can share it, so collapse by xn before counting. */
const curatedBookings = () => {
  const seen = new Set();
  const rows = [];
  XRAY_ORDERS.forEach((o) => {
    if (o.requestType !== 'appointment' || !o.scheduledAt) return;
    const key = o.xn ?? o.id;
    if (seen.has(key)) return;
    seen.add(key);
    const parsed = parseThaiDateTime(o.scheduledAt);
    if (!parsed || !parsed.time) return;
    const { rooms } = roomsForExams([o.examId]);
    rows.push({
      id: `curated-${key}`,
      xn: o.xn,
      hn: o.hn,
      patientName: o.patient?.fullName ?? o.patient?.shortName ?? '—',
      dateISO: parsed.dateISO,
      time: parsed.time,
      roomId: rooms[0]?.id ?? 'room-xr1',
      examIds: [o.examId],
      durationMin: examOf(o.examId)?.durationMin ?? 15,
      source: 'order',
    });
  });
  return rows;
};

let CURATED = null;
const allBookings = () => {
  if (!CURATED) CURATED = curatedBookings();
  return [...CURATED, ...readStore()];
};

export const listXrayBookings = (dateISO) =>
  allBookings()
    .filter((b) => !dateISO || b.dateISO === dateISO)
    .sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));

export const getXrayBooking = (xn) => allBookings().find((b) => b.xn && b.xn === xn) ?? null;

/* ── day schedule ───────────────────────────────────────────────────────── */

const closedReasonFor = (room, dateISO) => {
  const holiday = XRAY_SCHEDULE_HOLIDAYS[dateISO];
  if (holiday) return `ปิด — ${holiday}`;
  const dt = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return 'วันที่ไม่ถูกต้อง';
  if (!room.days.includes(dt.getDay())) {
    const openDays = room.days.map((d) => THAI_WEEKDAYS[d]).join(' / ');
    return `${room.name} ไม่เปิดวัน${THAI_WEEKDAYS[dt.getDay()]} — เปิด ${openDays}`;
  }
  return null;
};

/* Every slot the room has on `dateISO`, each already told whether THIS
   basket fits in it. `fits` is the one the UI must gate on: a slot can be
   free itself and still be unbookable because the run of consecutive slots
   the exams need is blocked further down (or runs into lunch / closing). */
export const daySchedule = ({ dateISO, roomId, examIds = [] }) => {
  const room = XRAY_ROOM_BY_ID[roomId];
  if (!room || !dateISO) {
    return { room: null, closed: true, closedReason: 'ยังไม่ได้เลือกห้องตรวจ', slots: [], free: 0, total: 0 };
  }

  const closedReason = closedReasonFor(room, dateISO);
  if (closedReason) {
    return { room, closed: true, closedReason, slots: [], free: 0, total: 0 };
  }

  const openMin = minutesOf(room.open);
  const closeMin = minutesOf(room.close);
  const breakFrom = room.breakStart ? minutesOf(room.breakStart) : null;
  const breakTo = room.breakEnd ? minutesOf(room.breakEnd) : null;
  const inBreak = (start) =>
    breakFrom !== null && breakTo !== null && start < breakTo && start + room.slotMinutes > breakFrom;

  const dayBookings = allBookings().filter((b) => b.dateISO === dateISO && b.roomId === roomId);

  const rawSlots = [];
  for (let start = openMin; start + room.slotMinutes <= closeMin; start += room.slotMinutes) {
    if (inBreak(start)) continue;
    const booked = dayBookings.filter((b) => {
      const bStart = minutesOf(b.time);
      if (bStart === null) return false;
      return start < bStart + (b.durationMin ?? room.slotMinutes) && start + room.slotMinutes > bStart;
    }).length;
    const taken = Math.min(room.capacity, booked + seededLoad(roomId, dateISO, start));
    rawSlots.push({
      start,
      time: hhmmOf(start),
      endTime: hhmmOf(start + room.slotMinutes),
      capacity: room.capacity,
      booked: taken,
      remaining: Math.max(0, room.capacity - taken),
      /* the real bookings only — what the "คิวที่จองไว้" list shows */
      bookings: dayBookings.filter((b) => b.time === hhmmOf(start)),
    });
  }

  /* Consecutive-run check for the basket's total duration. */
  const duration = totalDurationOf(examIds) || room.slotMinutes;
  const need = Math.max(1, Math.ceil(duration / room.slotMinutes));

  const slots = rawSlots.map((s, i) => {
    let fits = true;
    for (let k = 0; k < need; k += 1) {
      const nxt = rawSlots[i + k];
      /* run must be unbroken in time as well as free — a gap means lunch
         or closing sits in the middle of it */
      if (!nxt || nxt.remaining <= 0 || nxt.start !== s.start + k * room.slotMinutes) {
        fits = false;
        break;
      }
    }
    return {
      ...s,
      slotsNeeded: need,
      durationMin: duration,
      fits,
      label: need > 1 ? `${s.time}-${hhmmOf(s.start + need * room.slotMinutes)}` : `${s.time}-${s.endTime}`,
      blockReason: s.remaining <= 0 ? 'เต็ม' : fits ? null : `ต้องการเวลาต่อเนื่อง ${duration} นาที — ช่วงนี้ไม่พอ`,
    };
  });

  const free = slots.filter((s) => s.fits).length;
  return { room, closed: false, closedReason: null, slots, free, total: slots.length, duration, slotsNeeded: need };
};

/* Per-day roll-up for the calendar grid — `full` drives Calendar's isFull
   so a booked-out day renders "เต็ม" instead of an enabled number. */
export const dayAvailability = ({ dateISO, roomId, examIds = [] }) => {
  const day = daySchedule({ dateISO, roomId, examIds });
  if (day.closed) return { closed: true, reason: day.closedReason, free: 0, total: 0, full: true };
  return { closed: false, reason: null, free: day.free, total: day.total, full: day.free === 0 };
};

export const monthAvailability = ({ year, month, roomId, examIds = [] }) => {
  const out = {};
  const last = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= last; d += 1) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    out[iso] = dayAvailability({ dateISO: iso, roomId, examIds });
  }
  return out;
};

/* First day from `fromISO` (inclusive) that can actually take the basket —
   what the "นัดว่างเร็วที่สุด" shortcut jumps to. Bounded so a permanently
   full room cannot spin. */
export const firstAvailable = ({ fromISO, roomId, examIds = [], horizonDays = 60 }) => {
  const start = new Date(`${fromISO}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  for (let i = 0; i < horizonDays; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = toDateISO(d);
    const day = daySchedule({ dateISO: iso, roomId, examIds });
    const slot = day.slots.find((s) => s.fits);
    if (slot) return { dateISO: iso, time: slot.time, label: slot.label, room: day.room };
  }
  return null;
};

/* ── booking ────────────────────────────────────────────────────────────── */

let SEQ = 0;

export const bookXraySlot = ({ dateISO, time, roomId, examIds = [], hn, patientName, xn, note }) => {
  const day = daySchedule({ dateISO, roomId, examIds });
  if (day.closed) return { ok: false, reason: day.closedReason, booking: null };

  const slot = day.slots.find((s) => s.time === time);
  if (!slot) return { ok: false, reason: 'ไม่พบช่วงเวลาที่เลือกในตารางห้องตรวจ', booking: null };
  if (!slot.fits) return { ok: false, reason: slot.blockReason ?? 'ช่วงเวลานี้จองไม่ได้', booking: null };

  SEQ += 1;
  const booking = {
    id: `bk-${dateISO}-${time.replace(':', '')}-${SEQ}`,
    xn: xn ?? null,
    hn: hn ?? null,
    patientName: patientName ?? '—',
    dateISO,
    time,
    roomId,
    examIds,
    durationMin: slot.durationMin,
    note: note ?? null,
    source: 'session',
    scheduledAt: formatThaiDateTime(dateISO, time),
  };

  /* Same XN re-booking replaces its old slot rather than double-booking —
     the order page lets the user change their mind before saving. */
  const rows = readStore().filter((b) => !(booking.xn && b.xn === booking.xn));
  writeStore([...rows, booking]);
  return { ok: true, reason: null, booking };
};

export const cancelXraySlot = (id) => {
  const rows = readStore();
  const next = rows.filter((b) => b.id !== id);
  writeStore(next);
  return next.length !== rows.length;
};

export const cancelXrayBookingByXn = (xn) => {
  if (!xn) return false;
  const rows = readStore();
  const next = rows.filter((b) => b.xn !== xn);
  writeStore(next);
  return next.length !== rows.length;
};
