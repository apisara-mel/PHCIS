/* Shared mock data + calendar helpers — Figma Appointment file 0k2gyvvXwZ6JR3WQcokvEU */

import { formatThaiBuddhistDate } from '@/data/registrationForm';
import { buildDoctorRoster, DOCTOR_ROSTER_SIZE } from './appointmentDoctorRoster';
import {
  INITIAL_APPOINTMENTS as MOCK_APPOINTMENTS,
  SOMCHAI_AVATAR,
} from './appointmentMockData';
import {
  getFacilityHolidayName,
  getResourcePattern,
  isFacilityHolidayDate,
  isResourceClosedDate,
} from './appointmentSettingsStore';

export { APPOINTMENT_PATIENTS, APPOINTMENT_SEARCH_AVATARS } from './appointmentMockData';

export { DOCTOR_ROSTER_SIZE as STAFF_ROSTER_TOTAL };

export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];
export const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];
export const CAL_DAY_HEADERS = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];
export const CAL_DAY_HEADERS_SUN = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
/* Figma 6:11075 — full weekday names in calendar header row */
export const CAL_DAY_HEADERS_LONG = [
  'อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์',
];
export const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const NATIONAL_HOLIDAYS = [
  { date: '2026-06-01', name: 'วันมาฆบูชา' },
  { date: '2026-06-03', name: 'วันเฉลิมพระชนมพรรษา' },
];

/* Figma 6:11075 — duty-off days (centered “วันหยุด”, no slots) */
export const STAFF_CLOSED_DATES = [
  '2026-06-09', '2026-06-10', '2026-06-11',
  '2026-06-23', '2026-06-24', '2026-06-25',
];

export const ANY_DOCTOR_VALUE = 'ไม่ระบุแพทย์';
export const ANY_DOCTOR_OPTION = { value: ANY_DOCTOR_VALUE, label: 'ไม่ระบุแพทย์' };
export const MONTH_PREVIEW_SLOT_LIMIT = 5;

export const APPT_MIN_LEAD_MS = 60 * 60 * 1000;

/** Figma 19:8245 — pill at top of viewport shortly after popup closes (not 3 min;
   prototype annotation "3 minutes" is not the success-feedback timing). */
export const APPT_CREATE_SUCCESS_TOAST_DELAY_MS = 320;
export const SLOT_MINUTES = 15;
export const SLOT_START_H = 8;
export const SLOT_END_H = 20;
export const PAGE_SIZE = 20;
/** Figma 58:19171 — embedded doctor list view pagination (10 rows). */
export const EMBEDDED_LIST_PAGE_SIZE = 10;

/** Appointment scheduling roster — doctors only (25 unique). */
export const STAFF = buildDoctorRoster();

/** Figma 6:11075 — booked slot patient avatar (HN 67-00001 demo patient). */
export const DEFAULT_PATIENT_AVATAR = SOMCHAI_AVATAR;

export const INITIAL_APPOINTMENTS = MOCK_APPOINTMENTS;

export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function isoKey(d) {
  if (typeof d === 'string') return d;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addMinutes(time, mins) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${pad2(Math.floor(total / 60) % 24)}:${pad2(total % 60)}`;
}

export function buildTimeSlots() {
  const slots = [];
  for (let h = SLOT_START_H; h < SLOT_END_H; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      slots.push(`${pad2(h)}:${pad2(m)}`);
    }
  }
  return slots;
}

export const TIME_SLOTS = buildTimeSlots();

export function buildMonthGrid(year, month, weekStartsOn = 'sunday') {
  const firstDay = new Date(year, month, 1);
  const offset = weekStartsOn === 'monday'
    ? (firstDay.getDay() + 6) % 7
    : firstDay.getDay();
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - offset);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({
      day: d.getDate(),
      inMonth: d.getMonth() === month,
      key: isoKey(d),
      weekdayKey: WEEKDAY_KEYS[d.getDay()],
    });
  }
  return cells;
}

/** Figma 6:11075 — six week rows × seven day cards */
export function buildMonthWeekRows(year, month, weekStartsOn = 'sunday') {
  const cells = buildMonthGrid(year, month, weekStartsOn);
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

export function startOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

export function startOfWeekSunday(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export const MONTH_PREVIEW_TIMES = TIME_SLOTS.filter(
  (t) => t >= '08:00' && t <= '09:15',
).slice(0, MONTH_PREVIEW_SLOT_LIMIT);

export function isStaffClosedDay(dateKey, staffId) {
  if (isResourceClosedDate(staffId, dateKey)) return true;
  return STAFF_CLOSED_DATES.includes(dateKey);
}

export function getNationalHoliday(dateKey) {
  if (isFacilityHolidayDate(dateKey)) {
    return { date: dateKey, name: getFacilityHolidayName(dateKey) || 'วันหยุดสถานพยาบาล' };
  }
  return NATIONAL_HOLIDAYS.find((h) => h.date === dateKey) || null;
}

export function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** True when the calendar day is strictly before today (local). */
export function isPastDate(dateKey) {
  if (!dateKey) return false;
  return startOfLocalDay(parseDateKey(dateKey)).getTime()
    < startOfLocalDay(new Date()).getTime();
}

export const APPT_STATUS_PENDING = 'pending';
export const APPT_STATUS_CONFIRMED = 'confirmed';
export const APPT_STATUS_COMPLETED = 'completed';
export const APPT_STATUS_NO_SHOW = 'no_show';
export const APPT_STATUS_CANCELLED = 'cancelled';

/** List column + filters — Figma 58:19193 family. */
export const APPT_STATUS_PRESENTATIONS = {
  [APPT_STATUS_PENDING]: { label: 'รอการยืนยัน', style: 'warning' },
  [APPT_STATUS_CONFIRMED]: { label: 'ยืนยันแล้ว', style: 'info' },
  [APPT_STATUS_COMPLETED]: { label: 'เสร็จสิ้น', style: 'success' },
  [APPT_STATUS_NO_SHOW]: { label: 'ไม่มาตามนัด', style: 'yellow' },
  [APPT_STATUS_CANCELLED]: { label: 'ยกเลิก', style: 'error' },
};

/** True when the appointment start time is before now (includes prior calendar days). */
export function isAppointmentSlotPast(appt) {
  if (!appt?.date) return false;
  if (isPastDate(appt.date)) return true;
  const time = appt.time || slotRangeToTime(appt.slotRange);
  if (!time) return false;
  const day = parseDateKey(appt.date);
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  day.setHours(h, m, 0, 0);
  return day.getTime() < Date.now();
}

/** Resolve status at render time — past slots default to เสร็จสิ้น unless marked no-show. */
export function getAppointmentDisplayStatus(appt) {
  if (!appt) return APPT_STATUS_CONFIRMED;
  const stored = appt.status;
  if (stored === APPT_STATUS_NO_SHOW) return APPT_STATUS_NO_SHOW;
  if (stored === APPT_STATUS_CANCELLED) return APPT_STATUS_CANCELLED;
  if (stored === APPT_STATUS_COMPLETED || stored === 'done') return APPT_STATUS_COMPLETED;
  if (isPastDate(appt.date) || isAppointmentSlotPast(appt)) return APPT_STATUS_COMPLETED;
  if (stored === APPT_STATUS_PENDING) return APPT_STATUS_PENDING;
  return APPT_STATUS_CONFIRMED;
}

export function getAppointmentStatusPresentation(appt) {
  const status = getAppointmentDisplayStatus(appt);
  return APPT_STATUS_PRESENTATIONS[status] ?? APPT_STATUS_PRESENTATIONS[APPT_STATUS_CONFIRMED];
}

/** True when the exam has finished (attended or inferred from elapsed slot). */
export function isAppointmentCompleted(appt) {
  return getAppointmentDisplayStatus(appt) === APPT_STATUS_COMPLETED;
}

/** Figma 73:15735 — read-only detail when past slot, finished, no-show, or cancelled. */
export function isAppointmentReadOnly(appt) {
  if (!appt) return false;
  const status = getAppointmentDisplayStatus(appt);
  return (
    status === APPT_STATUS_COMPLETED
    || status === APPT_STATUS_NO_SHOW
    || status === APPT_STATUS_CANCELLED
  );
}

export function isSlotDisabled(dateKey, time) {
  if (isPastDate(dateKey)) return true;
  const day = parseDateKey(dateKey);
  const [h, m] = time.split(':').map(Number);
  day.setHours(h, m, 0, 0);
  return day.getTime() < Date.now() + APPT_MIN_LEAD_MS;
}

/** Slot interval for a staff member (minutes) — defaults to 15. */
export function getStaffSlotMinutes(staff) {
  const raw = staff?.slotMinutes ?? staff?.avgExamMin;
  if ([10, 15, 20, 30].includes(raw)) return raw;
  return SLOT_MINUTES;
}

const DEFAULT_WORK_HOURS = { start: '08:00', end: '16:00' };

/** Working window for a calendar day (null when off duty). */
export function getStaffWorkHours(staff, dateKey) {
  if (!staff || !dateKey) return DEFAULT_WORK_HOURS;
  if (isStaffClosedDay(dateKey, staff.id)) return null;
  const day = parseDateKey(dateKey);
  const weekdayKey = WEEKDAY_KEYS[day.getDay()];

  const pattern = getResourcePattern(staff.id);
  if (pattern) {
    if (pattern.weekdays?.length && !pattern.weekdays.includes(weekdayKey)) return null;
    return { start: pattern.start, end: pattern.end, pattern };
  }

  const daySched = staff.schedule?.[weekdayKey];
  if (daySched && daySched.on === false) return null;
  return {
    start: daySched?.start ?? staff.workHours?.start ?? DEFAULT_WORK_HOURS.start,
    end: daySched?.end ?? staff.workHours?.end ?? DEFAULT_WORK_HOURS.end,
  };
}

/**
 * TOR 1.6.1.4 — nested major→minor slots with queue numbers.
 * e.g. 09:00–12:00, major 60m, minor 6m, capacity 10 → queues 1–10, 11–20, 21–30.
 */
export function buildNestedSlotRanges({
  start,
  end,
  majorMinutes = 60,
  minorMinutes = 6,
  capacityPerMajor = 10,
}) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (![sh, sm, eh, em].every(Number.isFinite)) return [];
  const startTotal = sh * 60 + sm;
  const endTotal = eh * 60 + em;
  const slots = [];
  let majorIndex = 0;
  for (let majorStart = startTotal; majorStart + majorMinutes <= endTotal; majorStart += majorMinutes) {
    const baseQueue = majorIndex * capacityPerMajor;
    for (let i = 0; i < capacityPerMajor; i++) {
      const t = majorStart + i * minorMinutes;
      if (t + minorMinutes > majorStart + majorMinutes) break;
      if (t + minorMinutes > endTotal) break;
      const endM = t + minorMinutes;
      const queueNo = baseQueue + i + 1;
      slots.push({
        value: `${pad2(Math.floor(t / 60))}:${pad2(t % 60)}-${pad2(Math.floor(endM / 60))}:${pad2(endM % 60)}`,
        queueNo,
        majorIndex,
        label: `${pad2(Math.floor(t / 60))}:${pad2(t % 60)}–${pad2(Math.floor(endM / 60))}:${pad2(endM % 60)} · คิว ${queueNo}`,
      });
    }
    majorIndex += 1;
  }
  return slots;
}

/** Build Timeslot range labels for one duty day, e.g. 08:00-08:15 (15 min). */
export function buildSlotRangesForWindow({ start, end, slotMinutes }) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (![sh, sm, eh, em].every(Number.isFinite)) return [];
  const startTotal = sh * 60 + sm;
  const endTotal = eh * 60 + em;
  const slots = [];
  let i = 0;
  for (let t = startTotal; t + slotMinutes <= endTotal; t += slotMinutes) {
    const endM = t + slotMinutes;
    i += 1;
    slots.push({
      value: `${pad2(Math.floor(t / 60))}:${pad2(t % 60)}-${pad2(Math.floor(endM / 60))}:${pad2(endM % 60)}`,
      queueNo: i,
      label: `${pad2(Math.floor(t / 60))}:${pad2(t % 60)}-${pad2(Math.floor(endM / 60))}:${pad2(endM % 60)}`,
    });
  }
  return slots;
}

/** All bookable ranges for staff on `dateKey`, aligned to nested TOR pattern when set. */
export function getStaffScheduleSlots(staff, dateKey) {
  const hours = getStaffWorkHours(staff, dateKey);
  if (!hours) return [];
  if (hours.pattern) {
    return buildNestedSlotRanges({
      start: hours.start,
      end: hours.end,
      majorMinutes: hours.pattern.majorMinutes,
      minorMinutes: hours.pattern.minorMinutes,
      capacityPerMajor: hours.pattern.capacityPerMajor,
    });
  }
  return buildSlotRangesForWindow({
    start: hours.start,
    end: hours.end,
    slotMinutes: getStaffSlotMinutes(staff),
  });
}

/** Earliest free slot across staff (TOR 1.6.2.1) within [fromDate, days]. */
export function findEarliestFreeSlot({
  staffList,
  appointments,
  resourceType,
  groupPolicy = '',
  subDivision = '',
  dept = '',
  fromDate,
  days = 14,
}) {
  const start = fromDate ? parseDateKey(fromDate) : startOfLocalDay(new Date());
  const pool = (staffList || []).filter((s) => {
    if (groupPolicy && s.groupPolicy !== groupPolicy) return false;
    if (subDivision && s.subDivision !== subDivision) return false;
    if (dept && s.dept !== dept) return false;
    if (!resourceType || resourceType === 'all') return true;
    if (resourceType === 'dental') return s.dept === 'ทันตกรรม';
    if (resourceType === 'internal') return s.dept === 'อายุรกรรม';
    return true;
  });
  for (let d = 0; d < days; d++) {
    const day = new Date(start);
    day.setDate(start.getDate() + d);
    const key = isoKey(day);
    for (const staff of pool) {
      if (isStaffClosedDay(key, staff.id)) continue;
      const ranges = getStaffScheduleSlots(staff, key);
      for (const slot of ranges) {
        const time = slotRangeToTime(slot.value);
        if (isSlotDisabled(key, time)) continue;
        const taken = (appointments || []).some((a) => (
          a.staffId === staff.id && a.date === key && a.time === time && a.status !== 'cancelled'
        ));
        if (!taken) {
          return {
            staff,
            date: key,
            time,
            slotRange: slot.value,
            queueNo: slot.queueNo,
            label: slot.label || slot.value,
          };
        }
      }
    }
  }
  return null;
}

/** Map a stored start time (HH:MM) or range to a Timeslot label for `slotMinutes`. */
export function timeToSlotRange(time, slotMinutes = SLOT_MINUTES) {
  if (!time) return '';
  const raw = String(time);
  if (raw.includes('-')) return raw;
  const [h, m] = raw.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return '';
  const startM = h * 60 + m;
  const slotStartM = Math.floor(startM / slotMinutes) * slotMinutes;
  const endM = slotStartM + slotMinutes;
  return `${pad2(Math.floor(slotStartM / 60))}:${pad2(slotStartM % 60)}-${pad2(Math.floor(endM / 60))}:${pad2(endM % 60)}`;
}

/** Start time persisted on appointments from a Timeslot range label. */
export function slotRangeToTime(range) {
  if (!range) return '';
  return String(range).split('-')[0]?.trim() ?? '';
}

/** Thai Buddhist label for appointment history list rows. */
export function formatApptListDate(dateKey) {
  if (!dateKey) return '—';
  return formatThaiBuddhistDate(parseDateKey(dateKey));
}

/** Appointments for one HN, newest date/time first. */
export function findAppointmentsByHn(appointments, hn) {
  if (!hn || !Array.isArray(appointments)) return [];
  const needle = String(hn).trim();
  return [...appointments]
    .filter((a) => String(a.hn || '').trim() === needle)
    .sort((a, b) => {
      const da = parseDateKey(a.date).getTime();
      const db = parseDateKey(b.date).getTime();
      if (db !== da) return db - da;
      return (b.time || '').localeCompare(a.time || '');
    });
}

/** Read-only exam-mode label (matches AppointmentFormPopup options). */
export function formatApptExamModeLabel(examMode) {
  if (examMode === 'tele' || examMode === 'telemedicine') {
    return 'ปรึกษาแพทย์ออนไลน์ (Telemedicine)';
  }
  if (examMode === 'homevisit' || examMode === 'home') {
    return 'นัดหมายเยี่ยมบ้าน (Home visit)';
  }
  return 'ตรวจที่โรงพยาบาล (Onsite)';
}

/** Open print dialog for appointment slip + preparation (TOR 1.6.3.1). */
export function printAppointmentSlip(appt) {
  if (!appt) return;
  const dateLabel = formatApptListDate(appt.date);
  const mode = formatApptExamModeLabel(appt.examMode);
  const prep = appt.prep || '—';
  const reason = appt.reason || '—';
  const queue = appt.queueNo != null ? `คิวที่ ${appt.queueNo}` : '';
  const html = `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"/><title>ใบนัดหมาย</title>
<style>
  body{font-family:Sarabun,sans-serif;padding:32px;color:#232B36}
  h1{font-size:20px;color:#007549;margin:0 0 8px}
  .meta{color:#858C92;font-size:12px;margin-bottom:24px}
  table{width:100%;border-collapse:collapse}
  td{padding:8px 4px;border-bottom:1px solid #E2E4E6;font-size:14px;vertical-align:top}
  td:first-child{width:160px;color:#858C92}
  .prep{margin-top:24px;padding:16px;background:#F4FBF8;border-radius:8px}
  .prep h2{font-size:14px;margin:0 0 8px;color:#007549}
  @media print{body{padding:0}}
</style></head><body>
  <h1>ใบนัดหมาย · สำนักอนามัย</h1>
  <div class="meta">พิมพ์เมื่อ ${new Date().toLocaleString('th-TH')} ${queue}</div>
  <table>
    <tr><td>ผู้ป่วย</td><td>${appt.patient || '—'} (HN ${appt.hn || '—'})</td></tr>
    <tr><td>วัน–เวลานัด</td><td>${dateLabel} · ${appt.time || '—'}</td></tr>
    <tr><td>คลินิก</td><td>${appt.clinic || '—'}</td></tr>
    <tr><td>แพทย์</td><td>${appt.doctor || '—'}</td></tr>
    <tr><td>รูปแบบ</td><td>${mode}</td></tr>
    <tr><td>เหตุผลที่นัด</td><td>${reason}</td></tr>
  </table>
  <div class="prep"><h2>การเตรียมตัว</h2><div>${prep}</div></div>
  <script>window.onload=function(){window.print();}</script>
</body></html>`;
  const w = window.open('', '_blank', 'noopener,noreferrer,width=720,height=900');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/**
 * TOR 1.6.3.1 — พิมพ์ใบนัดหลายใบในเอกสารเดียว (นัดต่อเนื่องทั้งชุด / นัดกลุ่ม /
 * รายการที่ยังไม่มาติดต่อ) แทนการเปิดหน้าต่างพิมพ์ทีละใบ.
 */
export function printAppointmentSlipBatch(appts, { heading = 'ใบนัดหมาย' } = {}) {
  const rows = (appts || []).filter(Boolean);
  if (!rows.length) return;
  if (rows.length === 1) {
    printAppointmentSlip(rows[0]);
    return;
  }
  const slips = rows.map((appt, i) => `
    <section class="slip">
      <h1>${heading} · สำนักอนามัย</h1>
      <div class="meta">ใบที่ ${i + 1} จาก ${rows.length}${appt.seriesSeq ? ` · ครั้งที่ ${appt.seriesSeq}/${appt.seriesTotal || rows.length}` : ''}${appt.queueNo != null ? ` · คิวที่ ${appt.queueNo}` : ''}</div>
      <table>
        <tr><td>ผู้ป่วย</td><td>${appt.patient || '—'} (HN ${appt.hn || '—'})</td></tr>
        <tr><td>วัน–เวลานัด</td><td>${formatApptListDate(appt.date)} · ${appt.time || '—'}</td></tr>
        <tr><td>คลินิก</td><td>${appt.clinic || '—'}</td></tr>
        <tr><td>แพทย์</td><td>${appt.doctor || '—'}</td></tr>
        <tr><td>รูปแบบ</td><td>${formatApptExamModeLabel(appt.examMode)}</td></tr>
        <tr><td>เหตุผลที่นัด</td><td>${appt.reason || '—'}</td></tr>
      </table>
      <div class="prep"><h2>การเตรียมตัว</h2><div>${appt.prep || '—'}</div></div>
    </section>`).join('');
  const html = `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"/><title>${heading} (${rows.length} ใบ)</title>
<style>
  body{font-family:Sarabun,sans-serif;padding:32px;color:#232B36}
  .slip{page-break-after:always;margin-bottom:32px}
  .slip:last-child{page-break-after:auto}
  h1{font-size:20px;color:#007549;margin:0 0 8px}
  .meta{color:#858C92;font-size:12px;margin-bottom:16px}
  table{width:100%;border-collapse:collapse}
  td{padding:8px 4px;border-bottom:1px solid #E2E4E6;font-size:14px;vertical-align:top}
  td:first-child{width:160px;color:#858C92}
  .prep{margin-top:16px;padding:16px;background:#F4FBF8;border-radius:8px}
  .prep h2{font-size:14px;margin:0 0 8px;color:#007549}
  @media print{body{padding:0}}
</style></head><body>${slips}
<script>window.onload=function(){window.print();}</script>
</body></html>`;
  const w = window.open('', '_blank', 'noopener,noreferrer,width=820,height=1000');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/** Read-only pre-order summary. */
export function formatApptPreOrderLabel(appt) {
  if (appt?.preOrder === 'has' || appt?.advance === 'has') return 'มีคำสั่งล่วงหน้า';
  return 'ไม่มีคำสั่งล่วงหน้า';
}
