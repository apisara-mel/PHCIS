/* TOR 1.2.1.4–1.2.1.6 — OPD Walk-in Request store (per-department request board).
   sessionStorage-backed, same pattern as opdScreeningDrafts.js. Requests are
   produced by the OPD Screening "ส่งต่อไปยังแผนก" action (and by the discharge
   popup branch 2 "ส่งต่อแผนกอื่นภายในศูนย์"), then the walk-in board assigns a
   doctor slot which issues the exam queue number bound to the slot time
   (running number per room per period — legacy ลำดับคิวห้องตรวจ vocabulary). */

import { incrementQuotaBooked, todayKey } from './opdRoomConfig';

const STORAGE_KEY = 'mih:opd-walkin-requests';

const canUseSessionStorage = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

/* Status vocabulary — TOR 1.2.1.4 board columns.
     new         คำขอใหม่ (มาจากจุดคัดกรอง ยังไม่มีคนรับเรื่อง)
     waitingSlot รอ Slot ว่างของแพทย์ในแผนก
     assigned    ได้คิวห้องตรวจแล้ว (ผูกกับเวลา slot)
     cancelled   ยกเลิกคำขอ (soft — แถวยังอยู่ให้ตรวจสอบย้อนหลัง) */
export const WALKIN_STATUS = {
  new: { label: 'คำขอใหม่', badge: 'info' },
  waitingSlot: { label: 'รอ Slot', badge: 'warning' },
  assigned: { label: 'ได้คิวแล้ว', badge: 'success' },
  cancelled: { label: 'ยกเลิก', badge: 'error' },
};

export const WALKIN_DEPARTMENTS = [
  'อายุรกรรม',
  'ศัลยกรรม',
  'กุมารเวช',
  'จิตเวช',
  'ตรวจรักษา',
];

/* Departments that exist on the OPD queue but are NOT walk-in destinations
   (no quota row, no doctor pool, no board tab). A request created for one of
   these would be permanently un-assignable, so every producer routes them to
   their nearest walk-in department instead. */
const DEPT_ALIASES = {
  'แผนกสังคมสงเคราะห์และเวชศาสตร์ฟื้นฟู': 'ตรวจรักษา',
  'เวชศาสตร์ฟื้นฟู': 'ตรวจรักษา',
  'สังคมสงเคราะห์': 'ตรวจรักษา',
  'สุขภาพจิต': 'จิตเวช',
  'ศัลยกรรมกระดูก': 'ศัลยกรรม',
  'เวชศาสตร์ครอบครัว': 'ตรวจรักษา',
  'อุบัติเหตุและฉุกเฉิน': 'ตรวจรักษา',
};

/** Map any queue/screening department onto a real walk-in board department.
    Unknown values fall back to ตรวจรักษา (general exam) so a request is never
    stranded on a tab that does not exist. */
export const normaliseWalkinDept = (dept) => {
  if (WALKIN_DEPARTMENTS.includes(dept)) return dept;
  return DEPT_ALIASES[dept] || 'ตรวจรักษา';
};

/* Seed rows — realistic Bangkok health-center walk-in referrals coming out of
   the OPD screening station this morning. HNs align with patientProfiles. */
const SEED_REQUESTS = [
  {
    id: 'WR-001',
    requestQueue: 'R001',
    hn: '67-00003',
    name: 'นางปริญญา รัตนา',
    complaint: 'เจ็บหน้าอกขณะออกแรง ร้าวไปแขนซ้าย',
    esi: 2,
    dept: 'อายุรกรรม',
    requestedAt: '08:40',
    requestedBy: 'พว.กานดา ศรีวิไล',
    status: 'new',
    rightsExpired: false,
  },
  {
    id: 'WR-002',
    requestQueue: 'R002',
    hn: '67-00004',
    name: 'นายภูริ ใจกล้า',
    complaint: 'ปวดท้องน้อยด้านขวา กดเจ็บ',
    esi: 3,
    dept: 'ศัลยกรรม',
    requestedAt: '08:55',
    requestedBy: 'พว.กานดา ศรีวิไล',
    status: 'waitingSlot',
    rightsExpired: true,
  },
  {
    id: 'WR-003',
    requestQueue: 'R003',
    hn: '67-00005',
    name: 'นางสุดา ปลอดโปร่ง',
    complaint: 'ไข้สูง 38.9°C ในเด็ก ซึมลง',
    esi: 3,
    dept: 'กุมารเวช',
    requestedAt: '09:05',
    requestedBy: 'พว.ธิดารัตน์ คงมั่น',
    status: 'assigned',
    assignedSlot: { doctor: 'นพ. จักรพงษ์ โสยรวา', time: '10:20', room: 'ห้องตรวจที่ 3', queueNo: 'B012', period: 'เช้า' },
    assignedBy: 'จนท.สมพร ทองดี',
    assignedAt: '09:12',
    rightsExpired: false,
  },
  {
    id: 'WR-004',
    requestQueue: 'R004',
    hn: '67-00007',
    name: 'นางมาลี อ่อนน้อม',
    complaint: 'ปรึกษาอาการวิตกกังวล นอนไม่หลับ',
    esi: 5,
    dept: 'จิตเวช',
    requestedAt: '09:20',
    requestedBy: 'พว.ธิดารัตน์ คงมั่น',
    status: 'new',
    rightsExpired: false,
  },
  {
    id: 'WR-005',
    requestQueue: 'R005',
    hn: '67-00006',
    name: 'นายศุภชัย แก้วใส',
    complaint: 'ผื่นคันทั่วตัว สงสัยแพ้ยา',
    esi: 4,
    dept: 'ตรวจรักษา',
    requestedAt: '09:31',
    requestedBy: 'พว.กานดา ศรีวิไล',
    status: 'cancelled',
    cancelledReason: 'ผู้ป่วยขอกลับก่อน อาการทุเลา',
    cancelledBy: 'จนท.สมพร ทองดี',
    cancelledAt: '09:48',
    rightsExpired: false,
  },
];

const read = () => {
  if (!canUseSessionStorage()) return null;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null');
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const write = (rows) => {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
};

const ensureSeeded = () => {
  const existing = read();
  if (existing) return existing;
  const seeded = SEED_REQUESTS.map((r) => ({ ...r }));
  write(seeded);
  return seeded;
};

export const getWalkinRequests = () => ensureSeeded().map((r) => ({ ...r }));

const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Add a request coming from screening / discharge forward-to-department. */
export const addWalkinRequest = ({ hn, name, complaint, esi, dept, requestedBy }) => {
  const rows = ensureSeeded();
  const nextNum = rows.length + 1;
  const row = {
    id: `WR-${String(nextNum).padStart(3, '0')}`,
    requestQueue: `R${String(nextNum).padStart(3, '0')}`,
    hn: hn || '',
    name: name || '',
    complaint: complaint || 'ส่งต่อจากจุดคัดกรอง',
    esi: esi || 4,
    /* Normalised at the store boundary so screening, discharge and the queue's
       รับลงทะเบียน action are all protected — a request always lands on a tab
       that exists, with a quota row and a doctor pool behind it. */
    dept: normaliseWalkinDept(dept),
    requestedAt: nowHHMM(),
    requestedBy: requestedBy || 'พว.กานดา ศรีวิไล',
    status: 'new',
    rightsExpired: false,
  };
  write([...rows, row]);
  return row;
};

/** Patch any request fields (status transitions stamp their own audit). */
export const updateWalkinRequest = (id, patch = {}) => {
  const rows = ensureSeeded();
  const safePatch = 'dept' in patch
    ? { ...patch, dept: normaliseWalkinDept(patch.dept) }
    : patch;
  const next = rows.map((r) => (r.id === id ? { ...r, ...safePatch } : r));
  write(next);
  return next.find((r) => r.id === id) || null;
};

/** Assign a doctor slot → issues exam queue number bound to the slot time.
    Running number per room per period (B-prefix, morning starts 001,
    afternoon starts 101 so the number encodes the period). */
export const assignWalkinSlot = (id, { doctor, time, room, period, assignedBy }) => {
  const rows = ensureSeeded();
  const target = rows.find((r) => r.id === id);
  const samePeriodCount = rows.filter(
    (r) => r.status === 'assigned'
      && r.assignedSlot
      && r.assignedSlot.room === room
      && r.assignedSlot.period === period,
  ).length;
  const base = period === 'บ่าย' ? 100 : 0;
  const queueNo = `B${String(base + samePeriodCount + 1).padStart(3, '0')}`;
  /* Consume one unit of the department's quota in the SHARED room-config
     store (TOR 1.2.7.2) — guarded so re-assigning an already-assigned row
     never double-counts, and so seed rows that were assigned before this
     session (already folded into `booked`) are not counted twice. */
  if (target && target.status !== 'assigned') {
    incrementQuotaBooked(todayKey(), target.dept, 1);
  }
  return updateWalkinRequest(id, {
    status: 'assigned',
    assignedSlot: { doctor, time, room, period, queueNo },
    assignedBy: assignedBy || 'จนท.สมพร ทองดี',
    assignedAt: nowHHMM(),
  });
};

/** Soft cancel — keeps the row as สถานะยกเลิก, never hard-deleted.
    Releases the quota unit back when the cancelled request had already
    consumed a slot, so the two pages stay in agreement. */
export const cancelWalkinRequest = (id, reason, cancelledBy) => {
  const target = ensureSeeded().find((r) => r.id === id);
  if (target && target.status === 'assigned') {
    incrementQuotaBooked(todayKey(), target.dept, -1);
  }
  return updateWalkinRequest(id, {
    status: 'cancelled',
    cancelledReason: reason || 'ไม่ระบุ',
    cancelledBy: cancelledBy || 'จนท.สมพร ทองดี',
    cancelledAt: nowHHMM(),
  });
};
