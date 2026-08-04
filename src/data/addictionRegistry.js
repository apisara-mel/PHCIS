/* งานบำบัดสารเสพติด (TOR §1.10.5) — ทะเบียน / การติดตาม / ชุมชน (CBTx & HR).

   Companion store to `addictionVisits.js`:
     • ทะเบียนผู้ติดสารเสพติด (1.10.5.6) — list + create/edit + ยกเลิก + จำหน่าย
     • การติดตามการดูแล (1.10.5.8)      — follow-up records + ยา/Lab/X-ray in period
     • ทะเบียน CBTx & HR ชุมชน (1.10.5.9) — community care with mock-map house pin

   Seed rows are static mock data (Thai BMA health-center patients, HNs
   aligned with patientProfiles.js); user writes overlay them via
   sessionStorage so every แสดง/บันทึก/ยกเลิก/แก้ไข action round-trips with
   an audit trail (ผู้บันทึก + เวลา) without a backend. */

import {
  ADDICTION_CURRENT_USER,
  formatAddictionDateTime,
  todayIsoDate,
} from '@/data/addictionVisits';

const hasSession = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const readJson = (key, fallback) => {
  if (!hasSession()) return fallback;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(key) || 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  if (!hasSession()) return;
  window.sessionStorage.setItem(key, JSON.stringify(value));
};

/* ─── ทะเบียนผู้ติดสารเสพติด (1.10.5.6) ────────────────────────────── */

/** สถานะทะเบียน — vocabulary from the legacy manual §2.2.1/2.2.3. */
export const ADDICTION_REGISTRY_STATUSES = [
  { value: 'intake',            label: 'แรกรับ',                 badge: 'blue'   },
  { value: 'treating',          label: 'กำลังบำบัด',             badge: 'orange' },
  { value: 'dischargedFollow',  label: 'จำหน่ายเพื่อติดตามผล',   badge: 'teal'   },
  { value: 'followupComplete',  label: 'ติดตามครบ',              badge: 'green'  },
];

export const resolveRegistryStatus = (value) =>
  ADDICTION_REGISTRY_STATUSES.find((s) => s.value === value) || null;

export const ADDICTION_DISCHARGE_REASONS = [
  'ครบโปรแกรมการบำบัด',
  'ผิดนัดต่อเนื่อง (ติดตามไม่ได้)',
  'ส่งต่อสถานพยาบาลอื่น',
];

/** Seed registry — HNs align with addictionVisits.js queue + patientProfiles. */
const REGISTRY_SEED = [
  {
    id: 'reg-001', hn: '67-00009', name: 'ประเสริฐ ศรีวิไล', age: 32, gender: 'ชาย',
    mainSubstance: 'ยาบ้า (Methamphetamine)', secondarySubstance: 'กัญชา', useMethod: 'สูบ',
    program: 'matrix', registeredDate: '2026-06-27', screeningScore: 11, severity: 'medium',
    status: 'treating', therapist: 'พว.กรรณิการ์ แสงอรุณ',
    note: 'สมัครใจบำบัด ญาติพามา เข้าโปรแกรม Matrix 16 ครั้ง',
    recordedBy: 'พว.กรรณิการ์ แสงอรุณ', recordedAt: '27 มิถุนายน 2569 09:40',
  },
  {
    id: 'reg-002', hn: '67-00010', name: 'สมชาย บุญมาเรือน', age: 45, gender: 'ชาย',
    mainSubstance: 'เฮโรอีน', secondarySubstance: '', useMethod: 'ฉีด',
    program: 'methadone', registeredDate: '2025-11-03', screeningScore: 18, severity: 'high',
    status: 'treating', therapist: 'นพ.ปกรณ์ จิตอาสา',
    note: 'IDU Care สยส.1-3 รับยาเมทาโดนรายวัน 60 mg',
    recordedBy: 'นพ.ปกรณ์ จิตอาสา', recordedAt: '3 พฤศจิกายน 2568 10:15',
  },
  {
    id: 'reg-003', hn: '67-00012', name: 'วิเชียร คงคาใส', age: 51, gender: 'ชาย',
    mainSubstance: 'บุหรี่/นิโคติน', secondarySubstance: '', useMethod: 'สูบ',
    program: 'smoking', registeredDate: '2026-07-21', screeningScore: 7, severity: 'medium',
    status: 'treating', therapist: 'พว.สุภาพร ใจดี',
    note: 'สูบวันละ 1 ซอง 20 ปี — แบบประเมิน 2 ได้ 6 คะแนน เริ่มแผ่นแปะนิโคติน',
    recordedBy: 'พว.สุภาพร ใจดี', recordedAt: '21 กรกฎาคม 2569 09:20',
  },
  {
    id: 'reg-004', hn: '67-00013', name: 'มะลิวัลย์ พึ่งตนเอง', age: 38, gender: 'หญิง',
    mainSubstance: 'สุรา/แอลกอฮอล์', secondarySubstance: '', useMethod: 'กิน',
    program: 'alcohol', registeredDate: '2026-07-24', screeningScore: 9, severity: 'medium',
    status: 'intake', therapist: 'พว.สุภาพร ใจดี',
    note: 'AUDIT 9 คะแนน — Brief Intervention & Counselling',
    recordedBy: 'พว.สุภาพร ใจดี', recordedAt: '24 กรกฎาคม 2569 10:05',
  },
  {
    id: 'reg-005', hn: '67-00014', name: 'อำนาจ รักษาดี', age: 28, gender: 'ชาย',
    mainSubstance: 'ไอซ์ (Crystal Meth)', secondarySubstance: 'ยาบ้า (Methamphetamine)', useMethod: 'สูบ',
    program: 'matrix', registeredDate: '2026-05-08', screeningScore: 15, severity: 'high',
    status: 'treating', therapist: 'พว.กรรณิการ์ แสงอรุณ',
    note: 'ครั้งที่ 12/16 ผลปัสสาวะไม่พบสารต่อเนื่อง 6 สัปดาห์',
    recordedBy: 'พว.กรรณิการ์ แสงอรุณ', recordedAt: '8 พฤษภาคม 2569 13:30',
  },
  {
    id: 'reg-006', hn: '67-00017', name: 'รัตนา วงศ์สุวรรณ', age: 47, gender: 'หญิง',
    mainSubstance: 'บุหรี่/นิโคติน', secondarySubstance: '', useMethod: 'สูบ',
    program: 'smoking', registeredDate: '2026-06-02', screeningScore: 4, severity: 'low',
    status: 'dischargedFollow', therapist: 'พว.สุภาพร ใจดี',
    dischargedDate: '2026-07-14', dischargeReason: 'ครบโปรแกรมการบำบัด',
    note: 'เลิกบุหรี่ได้ครบ 6 สัปดาห์ จำหน่ายเพื่อติดตามผล 4 ครั้งใน 1 ปี',
    recordedBy: 'พว.สุภาพร ใจดี', recordedAt: '2 มิถุนายน 2569 09:00',
  },
  {
    id: 'reg-007', hn: '67-00019', name: 'จินตนา ทองประเสริฐ', age: 41, gender: 'หญิง',
    mainSubstance: 'สุรา/แอลกอฮอล์', secondarySubstance: '', useMethod: 'กิน',
    program: 'alcohol', registeredDate: '2025-12-15', screeningScore: 5, severity: 'low',
    status: 'followupComplete', therapist: 'พว.กรรณิการ์ แสงอรุณ',
    dischargedDate: '2026-03-20', dischargeReason: 'ครบโปรแกรมการบำบัด',
    note: 'ติดตามครบ 4 ครั้ง ยังหยุดดื่มต่อเนื่อง',
    recordedBy: 'พว.กรรณิการ์ แสงอรุณ', recordedAt: '15 ธันวาคม 2568 11:45',
  },
  {
    id: 'reg-008', hn: '67-00016', name: 'ธนกฤต แซ่ลิ้ม', age: 19, gender: 'ชาย',
    mainSubstance: 'ยาบ้า (Methamphetamine)', secondarySubstance: '', useMethod: 'กิน',
    program: 'matrix', registeredDate: '2026-08-01', screeningScore: 16, severity: 'high',
    status: 'intake', therapist: 'นพ.ปกรณ์ จิตอาสา',
    note: 'ส่งตัวจากศาลเยาวชนฯ เข้าบำบัดแบบสมัครใจ',
    recordedBy: 'นพ.ปกรณ์ จิตอาสา', recordedAt: '1 สิงหาคม 2569 10:30',
  },
  {
    id: 'reg-009', hn: '67-00020', name: 'อนุชา สายน้ำผึ้ง', age: 24, gender: 'ชาย',
    mainSubstance: 'กัญชา', secondarySubstance: 'ยาบ้า (Methamphetamine)', useMethod: 'สูบ',
    program: 'matrix', registeredDate: '2025-12-02', screeningScore: 8, severity: 'medium',
    status: 'dischargedFollow', therapist: 'พว.กรรณิการ์ แสงอรุณ',
    dischargedDate: '2026-05-30', dischargeReason: 'ครบโปรแกรมการบำบัด',
    note: 'ครบ 16 ครั้ง จำหน่ายเพื่อติดตามผล — ยังไม่มีการติดตามหลังจำหน่าย',
    recordedBy: 'พว.กรรณิการ์ แสงอรุณ', recordedAt: '2 ธันวาคม 2568 09:15',
  },
  {
    id: 'reg-010', hn: '67-00018', name: 'สมบัติ เจริญสุข', age: 55, gender: 'ชาย',
    mainSubstance: 'เฮโรอีน', secondarySubstance: 'ยานอนหลับ/ยากล่อมประสาท', useMethod: 'ฉีด',
    program: 'methadone', registeredDate: '2024-09-16', screeningScore: 19, severity: 'high',
    status: 'treating', therapist: 'นพ.ปกรณ์ จิตอาสา',
    note: 'IDU Care ต่อเนื่อง 58 ครั้ง — เมทาโดน 80 mg รายวัน คุมอาการถอนได้ดี',
    recordedBy: 'นพ.ปกรณ์ จิตอาสา', recordedAt: '16 กันยายน 2567 08:50',
  },
];

const REGISTRY_OVERLAY_KEY = 'mih:addiction:registry-overlay';
const REGISTRY_CANCEL_KEY = 'mih:addiction:registry-cancelled';

/** Seed + session-created/edited rows (edits win by id). */
export const getRegistryEntries = () => {
  const overlay = readJson(REGISTRY_OVERLAY_KEY, {});
  const merged = REGISTRY_SEED.map((row) => (overlay[row.id] ? { ...row, ...overlay[row.id] } : row));
  const created = Object.values(overlay).filter(
    (row) => !REGISTRY_SEED.some((seed) => seed.id === row.id),
  );
  return [...created, ...merged];
};

export const findRegistryEntryByHn = (hn) =>
  getRegistryEntries().find((row) => row.hn === hn) || null;

/** Create or edit — stamps ผู้บันทึก/ผู้แก้ไข + เวลา (audit trail). */
export const upsertRegistryEntry = (entry) => {
  const overlay = readJson(REGISTRY_OVERLAY_KEY, {});
  const isNew = !entry.id;
  const id = entry.id || `reg-${Date.now()}`;
  const prev = overlay[id] || REGISTRY_SEED.find((row) => row.id === id) || {};
  const stamped = {
    ...prev,
    ...entry,
    id,
    ...(isNew
      ? { recordedBy: ADDICTION_CURRENT_USER, recordedAt: formatAddictionDateTime() }
      : { editedBy: ADDICTION_CURRENT_USER, editedAt: formatAddictionDateTime() }),
  };
  writeJson(REGISTRY_OVERLAY_KEY, { ...overlay, [id]: stamped });
  return stamped;
};

/** จำหน่าย — requires reason; keeps the row with a discharge audit stamp. */
export const dischargeRegistryEntry = (id, reason, note = '') =>
  upsertRegistryEntry({
    id,
    status: 'dischargedFollow',
    dischargedDate: todayIsoDate(),
    dischargeReason: reason,
    dischargeNote: note,
  });

/** ยกเลิกทะเบียน — reason + who/when (audit); reversible for the demo. */
export const cancelRegistryEntry = (id, reason) => {
  const all = readJson(REGISTRY_CANCEL_KEY, {});
  writeJson(REGISTRY_CANCEL_KEY, {
    ...all,
    [id]: { reason, by: ADDICTION_CURRENT_USER, at: formatAddictionDateTime() },
  });
};

export const reactivateRegistryEntry = (id) => {
  const all = readJson(REGISTRY_CANCEL_KEY, {});
  const { [id]: _removed, ...rest } = all;
  writeJson(REGISTRY_CANCEL_KEY, rest);
};

export const getRegistryCancellation = (id) => readJson(REGISTRY_CANCEL_KEY, {})[id] || null;

/* ─── การติดตามการดูแล (1.10.5.8) ──────────────────────────────────── */

/** วิธีติดตาม — manual §2.2.4 บันทึกการติดตามผลการบำบัด. */
export const FOLLOWUP_METHODS = [
  { value: 'phone',     label: 'โทรศัพท์' },
  { value: 'homeVisit', label: 'เยี่ยมบ้าน' },
  { value: 'center',    label: 'มาศูนย์บริการฯ' },
];

export const FOLLOWUP_RESULTS = [
  { value: 'abstinent', label: 'ยังหยุดใช้สารเสพติด', badge: 'green' },
  { value: 'relapsed',  label: 'กลับไปใช้ซ้ำ',         badge: 'red'   },
  { value: 'missed',    label: 'ติดตามไม่ได้/ผิดนัด',   badge: 'yellow' },
];

export const resolveFollowUpMethod = (value) =>
  FOLLOWUP_METHODS.find((m) => m.value === value) || null;

export const resolveFollowUpResult = (value) =>
  FOLLOWUP_RESULTS.find((r) => r.value === value) || null;

/** Seed follow-up records per HN (ISO dates so the period filter works). */
const FOLLOWUP_SEED = {
  '67-00017': [
    { no: 1, date: '2026-07-21', method: 'phone',     result: 'abstinent', by: 'พว.สุภาพร ใจดี', note: 'ไม่กลับไปสูบ ครอบครัวช่วยเฝ้าระวัง' },
    { no: 2, date: '2026-07-28', method: 'homeVisit', result: 'abstinent', by: 'อสส.สมหญิง แข็งขัน', note: 'เยี่ยมบ้านร่วมกับ อสส. สภาพแวดล้อมดี' },
  ],
  '67-00019': [
    { no: 1, date: '2026-04-20', method: 'phone',     result: 'abstinent', by: 'พว.กรรณิการ์ แสงอรุณ', note: 'หยุดดื่มต่อเนื่อง' },
    { no: 2, date: '2026-05-20', method: 'center',    result: 'abstinent', by: 'พว.กรรณิการ์ แสงอรุณ', note: 'มาตามนัด ผล LFT ปกติ' },
    { no: 3, date: '2026-06-22', method: 'phone',     result: 'abstinent', by: 'พว.กรรณิการ์ แสงอรุณ', note: 'ยังหยุดดื่ม ทำงานปกติ' },
    { no: 4, date: '2026-07-20', method: 'homeVisit', result: 'abstinent', by: 'อสส.สมหญิง แข็งขัน', note: 'ติดตามครบ 4 ครั้ง — ปิดการติดตาม' },
  ],
  '67-00009': [
    { no: 1, date: '2026-07-04', method: 'center', result: 'relapsed',  by: 'พว.กรรณิการ์ แสงอรุณ', note: 'ยอมรับใช้ซ้ำ 1 ครั้ง ให้เทคนิคจัดการความอยาก' },
    { no: 2, date: '2026-07-18', method: 'center', result: 'abstinent', by: 'พว.กรรณิการ์ แสงอรุณ', note: 'ปัสสาวะไม่พบสาร 2 สัปดาห์ติดต่อกัน' },
  ],
  '67-00010': [
    { no: 1, date: '2026-06-15', method: 'center',    result: 'abstinent', by: 'นพ.ปกรณ์ จิตอาสา', note: 'รับเมทาโดนต่อเนื่อง ไม่มีอาการถอน' },
    { no: 2, date: '2026-07-15', method: 'center',    result: 'abstinent', by: 'นพ.ปกรณ์ จิตอาสา', note: 'สุ่มตรวจปัสสาวะไม่พบ Opiates · ตรวจ LFT ตาม สยส.2' },
    { no: 3, date: '2026-07-29', method: 'phone',     result: 'missed',    by: 'อสส.ประยูร มั่นคง', note: 'โทรไม่ติด 2 ครั้ง ประสาน อสส. ลงเยี่ยมบ้าน' },
    { no: 4, date: '2026-08-01', method: 'homeVisit', result: 'abstinent', by: 'อสส.ประยูร มั่นคง', note: 'พบที่บ้าน ยังรับยาตามนัด ไม่พบอุปกรณ์ฉีด' },
  ],
};

const FOLLOWUP_OVERLAY_KEY = 'mih:addiction:followups';
const FOLLOWUP_EDIT_KEY = 'mih:addiction:followup-edits';
const FOLLOWUP_CANCEL_KEY = 'mih:addiction:followup-cancelled';

const followUpRecordKey = (hn, no) => `${hn}:${no}`;

export const getFollowUps = (hn) => {
  const overlay = readJson(FOLLOWUP_OVERLAY_KEY, {});
  const edits = readJson(FOLLOWUP_EDIT_KEY, {});
  return [...(FOLLOWUP_SEED[hn] || []), ...(overlay[hn] || [])].map((row) => {
    const patch = edits[followUpRecordKey(hn, row.no)];
    return patch ? { ...row, ...patch } : row;
  });
};

/** แก้ไขรายการติดตาม — overlay patch keyed hn:no (seed rows editable too);
    stamps ผู้แก้ไข + เวลา for the audit trail. */
export const updateFollowUpRecord = (hn, no, patch) => {
  const edits = readJson(FOLLOWUP_EDIT_KEY, {});
  const key = followUpRecordKey(hn, no);
  writeJson(FOLLOWUP_EDIT_KEY, {
    ...edits,
    [key]: {
      ...(edits[key] || {}),
      ...patch,
      editedBy: ADDICTION_CURRENT_USER,
      editedAt: formatAddictionDateTime(),
    },
  });
};

/** ยกเลิกรายการติดตาม — reason + who/when; reversible for the demo. */
export const cancelFollowUpRecord = (hn, no, reason) => {
  const all = readJson(FOLLOWUP_CANCEL_KEY, {});
  writeJson(FOLLOWUP_CANCEL_KEY, {
    ...all,
    [followUpRecordKey(hn, no)]: { reason, by: ADDICTION_CURRENT_USER, at: formatAddictionDateTime() },
  });
};

export const reactivateFollowUpRecord = (hn, no) => {
  const all = readJson(FOLLOWUP_CANCEL_KEY, {});
  const { [followUpRecordKey(hn, no)]: _removed, ...rest } = all;
  writeJson(FOLLOWUP_CANCEL_KEY, rest);
};

export const getFollowUpCancellation = (hn, no) =>
  readJson(FOLLOWUP_CANCEL_KEY, {})[followUpRecordKey(hn, no)] || null;

export const addFollowUpRecord = (hn, { method, result, note }) => {
  const overlay = readJson(FOLLOWUP_OVERLAY_KEY, {});
  const existing = getFollowUps(hn);
  const entry = {
    no: existing.length + 1,
    date: todayIsoDate(),
    method,
    result,
    note,
    by: ADDICTION_CURRENT_USER,
    at: formatAddictionDateTime(),
  };
  writeJson(FOLLOWUP_OVERLAY_KEY, { ...overlay, [hn]: [...(overlay[hn] || []), entry] });
  return entry;
};

/** ผิดนัดติดตาม — discharged-to-follow patients are due every 30 days;
    overdue when the last record is older than that (or none exists). */
export const getFollowUpOverdue = (hn) => {
  const entry = findRegistryEntryByHn(hn);
  if (!entry || entry.status !== 'dischargedFollow') return null;
  const rows = getFollowUps(hn);
  const lastDate = rows.length
    ? rows.map((r) => r.date).sort().slice(-1)[0]
    : entry.dischargedDate;
  if (!lastDate) return null;
  const days = Math.floor((new Date(todayIsoDate()) - new Date(lastDate)) / 86400000);
  return days > 30 ? { lastDate, daysOverdue: days - 30 } : null;
};

/** ยาที่ได้รับในช่วงเวลา (รวมเมทาโดนรายวัน) — ISO dates. */
export const ADDICTION_MED_HISTORY = {
  '67-00009': [
    { date: '2026-07-04', item: 'วิตามินบีรวม', dose: '1x2 หลังอาหาร', qty: '30 เม็ด' },
    { date: '2026-07-18', item: 'วิตามินบีรวม', dose: '1x2 หลังอาหาร', qty: '30 เม็ด' },
  ],
  '67-00010': [
    { date: '2026-08-01', item: 'เมทาโดน (Methadone) ชนิดน้ำ', dose: '60 mg รายวัน (สยส.3)', qty: '1 ครั้ง' },
    { date: '2026-07-31', item: 'เมทาโดน (Methadone) ชนิดน้ำ', dose: '60 mg รายวัน (สยส.3)', qty: '1 ครั้ง' },
    { date: '2026-07-30', item: 'เมทาโดน (Methadone) ชนิดน้ำ', dose: '60 mg รายวัน (สยส.3)', qty: '1 ครั้ง' },
  ],
  '67-00012': [
    { date: '2026-07-21', item: 'แผ่นแปะนิโคติน', dose: 'แปะวันละ 1 แผ่น', qty: '14 แผ่น' },
  ],
  '67-00017': [
    { date: '2026-06-16', item: 'หมากฝรั่งนิโคติน', dose: 'เคี้ยวเมื่อมีอาการอยาก', qty: '30 ชิ้น' },
    { date: '2026-07-14', item: 'หมากฝรั่งนิโคติน', dose: 'เคี้ยวเมื่อมีอาการอยาก', qty: '30 ชิ้น' },
  ],
  '67-00013': [
    { date: '2026-07-24', item: 'วิตามินบีรวม', dose: '1x2 หลังอาหาร', qty: '60 เม็ด' },
    { date: '2026-07-24', item: 'ไดอาซีแพม (ลดอาการถอน)', dose: '2 mg ก่อนนอน 5 วัน', qty: '5 เม็ด' },
  ],
  '67-00014': [
    { date: '2026-06-20', item: 'วิตามินบีรวม', dose: '1x2 หลังอาหาร', qty: '60 เม็ด' },
    { date: '2026-07-25', item: 'วิตามินบีรวม', dose: '1x2 หลังอาหาร', qty: '60 เม็ด' },
  ],
  '67-00018': [
    { date: '2026-08-03', item: 'เมทาโดน (Methadone) ชนิดน้ำ', dose: '80 mg รายวัน (สยส.3)', qty: '1 ครั้ง' },
    { date: '2026-08-02', item: 'เมทาโดน (Methadone) ชนิดน้ำ', dose: '80 mg รายวัน (สยส.3)', qty: '1 ครั้ง' },
    { date: '2026-07-20', item: 'วิตามินบีรวม', dose: '1x2 หลังอาหาร', qty: '60 เม็ด' },
  ],
  '67-00019': [
    { date: '2026-05-20', item: 'วิตามินบีรวม', dose: '1x3 หลังอาหาร', qty: '90 เม็ด' },
  ],
  '67-00020': [
    { date: '2026-05-16', item: 'วิตามินบีรวม', dose: '1x2 หลังอาหาร', qty: '30 เม็ด' },
  ],
};

/** ผล Lab ในช่วงเวลา — urine screens ฯลฯ (manual สยส.2). */
export const ADDICTION_LAB_HISTORY = {
  '67-00009': [
    { date: '2026-06-27', test: 'Urine Methamphetamine', result: 'พบสาร (Positive)', abnormal: true },
    { date: '2026-07-04', test: 'Urine Methamphetamine', result: 'พบสาร (Positive)', abnormal: true },
    { date: '2026-07-11', test: 'Urine Methamphetamine', result: 'ไม่พบสาร (Negative)', abnormal: false },
    { date: '2026-07-18', test: 'Urine Methamphetamine', result: 'ไม่พบสาร (Negative)', abnormal: false },
    { date: '2026-07-25', test: 'Urine Methamphetamine', result: 'ไม่พบสาร (Negative)', abnormal: false },
    { date: '2026-07-25', test: 'LFT (การทำงานของตับ)', result: 'ปกติ', abnormal: false },
  ],
  '67-00010': [
    { date: '2026-06-15', test: 'Urine Opiates', result: 'พบสาร (Positive)', abnormal: true },
    { date: '2026-07-15', test: 'LFT (การทำงานของตับ)', result: 'AST 42 / ALT 48 — สูงเล็กน้อย', abnormal: true },
    { date: '2026-07-15', test: 'Anti-HIV (สมัครใจ)', result: 'Non-reactive', abnormal: false },
    { date: '2026-07-15', test: 'Urine Opiates', result: 'ไม่พบสาร (Negative)', abnormal: false },
    { date: '2026-07-31', test: 'Urine Opiates', result: 'ไม่พบสาร (Negative)', abnormal: false },
  ],
  '67-00014': [
    { date: '2026-06-20', test: 'Urine Methamphetamine', result: 'ไม่พบสาร (Negative)', abnormal: false },
    { date: '2026-07-04', test: 'Urine Methamphetamine', result: 'ไม่พบสาร (Negative)', abnormal: false },
    { date: '2026-07-25', test: 'Urine Methamphetamine', result: 'ไม่พบสาร (Negative)', abnormal: false },
  ],
  '67-00018': [
    { date: '2026-07-20', test: 'Urine Opiates', result: 'ไม่พบสาร (Negative)', abnormal: false },
    { date: '2026-07-20', test: 'ไวรัสตับอักเสบบี (HBsAg)', result: 'Positive — ส่งต่อคลินิกโรคตับ', abnormal: true },
  ],
  '67-00019': [
    { date: '2026-05-20', test: 'LFT (การทำงานของตับ)', result: 'ปกติ', abnormal: false },
  ],
};

/** ผล X-ray ในช่วงเวลา — Chest X-Ray ประจำปีตาม สยส.2/3 (manual §2.5.8). */
export const ADDICTION_XRAY_HISTORY = {
  '67-00010': [
    { date: '2026-07-15', exam: 'Chest X-Ray (ประจำปีตาม สยส.2)', result: 'ไม่พบความผิดปกติของปอด' },
  ],
  '67-00009': [
    { date: '2026-06-27', exam: 'Chest X-Ray (แรกรับ)', result: 'ปกติ' },
  ],
  '67-00018': [
    { date: '2026-07-20', exam: 'Chest X-Ray (ประจำปีตาม สยส.2)', result: 'พบฝ้าที่ปอดกลีบบนขวา — ส่งตรวจเสมหะหาวัณโรค' },
  ],
  '67-00014': [
    { date: '2026-05-08', exam: 'Chest X-Ray (แรกรับ)', result: 'ไม่พบความผิดปกติ' },
  ],
};

export const FOLLOWUP_NOTE_SUGGESTIONS = [
  'ติดตามทางโทรศัพท์ ผู้ป่วยยังหยุดใช้สารเสพติด ครอบครัวยืนยัน',
  'เยี่ยมบ้านร่วมกับ อสส. สภาพแวดล้อมไม่พบความเสี่ยง',
  'ผู้ป่วยยอมรับกลับไปใช้ซ้ำ นัดกลับเข้าโปรแกรมบำบัด',
  'โทรติดตามไม่ได้ 2 ครั้ง จะประสาน อสส. เยี่ยมบ้านในสัปดาห์นี้',
];

/* ─── ทะเบียน CBTx & HR ชุมชน (1.10.5.9) ───────────────────────────── */

export const COMMUNITY_CARE_TYPES = [
  { value: 'cbtx', label: 'CBTx — บำบัดฟื้นฟูโดยชุมชน', badge: 'purple' },
  { value: 'hr',   label: 'HR — ลดอันตรายจากยาเสพติด',  badge: 'blue'   },
];

export const resolveCommunityCareType = (value) =>
  COMMUNITY_CARE_TYPES.find((t) => t.value === value) || null;

export const COMMUNITY_CARE_STATUSES = [
  { value: 'active',     label: 'กำลังดูแล',     badge: 'orange' },
  { value: 'monitoring', label: 'เฝ้าระวังต่อเนื่อง', badge: 'blue' },
  { value: 'closed',     label: 'ยุติการดูแล',    badge: 'grey'  },
];

export const resolveCommunityCareStatus = (value) =>
  COMMUNITY_CARE_STATUSES.find((s) => s.value === value) || null;

export const COMMUNITY_DISTRICTS = [
  'เขตบางกอกน้อย', 'เขตบางกอกใหญ่', 'เขตธนบุรี', 'เขตคลองสาน', 'เขตภาษีเจริญ',
];

/** Seed community-care rows — house pin uses the AddressMapBlock contract
    ({lat, lng, pinSaved}) inside its mock central-Bangkok bounding box. */
const COMMUNITY_SEED = [
  {
    id: 'cbtx-001', hn: '67-00009', patientName: 'ประเสริฐ ศรีวิไล',
    community: 'ชุมชนวัดระฆัง', district: 'เขตบางกอกน้อย',
    careType: 'cbtx', responsible: 'อสส.สมหญิง แข็งขัน', status: 'active',
    houseLocation: { lat: 13.7612, lng: 100.4855, pinSaved: true },
    note: 'ครอบครัวร่วมโปรแกรม Matrix กลุ่มครอบครัวศึกษา — อสส. เยี่ยมทุกสัปดาห์',
    recordedBy: 'พว.กรรณิการ์ แสงอรุณ', recordedAt: '30 มิถุนายน 2569 14:20',
  },
  {
    id: 'hr-001', hn: '67-00010', patientName: 'สมชาย บุญมาเรือน',
    community: 'ชุมชนตลาดพลู', district: 'เขตธนบุรี',
    careType: 'hr', responsible: 'อสส.ประยูร มั่นคง', status: 'active',
    houseLocation: { lat: 13.7448, lng: 100.4772, pinSaved: true },
    note: 'IDU Care — แจกอุปกรณ์สะอาด แนะนำป้องกันการติดเชื้อ นัดรับเมทาโดนรายวัน',
    recordedBy: 'นพ.ปกรณ์ จิตอาสา', recordedAt: '12 กรกฎาคม 2569 10:00',
  },
  {
    id: 'cbtx-002', hn: '67-00016', patientName: 'ธนกฤต แซ่ลิ้ม',
    community: 'ชุมชนบ้านช่างหล่อ', district: 'เขตบางกอกน้อย',
    careType: 'cbtx', responsible: 'อสส.วันเพ็ญ ใจบุญ', status: 'monitoring',
    houseLocation: null,
    note: 'เยาวชนส่งตัวจากศาล — รอปักหมุดตำแหน่งบ้านหลังเยี่ยมครั้งแรก',
    recordedBy: 'นพ.ปกรณ์ จิตอาสา', recordedAt: '1 สิงหาคม 2569 11:00',
  },
  {
    id: 'hr-002', hn: '67-00018', patientName: 'สมบัติ เจริญสุข',
    community: 'ชุมชนซอยวัดใหม่ยายนุ้ย', district: 'เขตบางกอกใหญ่',
    careType: 'hr', responsible: 'อสส.ประยูร มั่นคง', status: 'active',
    houseLocation: { lat: 13.7535, lng: 100.4801, pinSaved: true },
    note: 'ผล HBsAg บวก — ให้ความรู้เรื่องการป้องกันการแพร่เชื้อ แจกอุปกรณ์สะอาด',
    recordedBy: 'นพ.ปกรณ์ จิตอาสา', recordedAt: '22 กรกฎาคม 2569 15:10',
  },
  {
    id: 'cbtx-003', hn: '67-00014', patientName: 'อำนาจ รักษาดี',
    community: 'ชุมชนคลองบางหลวง', district: 'เขตภาษีเจริญ',
    careType: 'cbtx', responsible: 'อสส.วันเพ็ญ ใจบุญ', status: 'monitoring',
    houseLocation: { lat: 13.7367, lng: 100.4694, pinSaved: true },
    note: 'ครบ 12/16 ครั้ง ชุมชนตั้งกลุ่มเพื่อนช่วยเพื่อน ติดตามเดือนละครั้ง',
    recordedBy: 'พว.กรรณิการ์ แสงอรุณ', recordedAt: '18 กรกฎาคม 2569 13:40',
  },
  {
    id: 'cbtx-004', hn: '67-00020', patientName: 'อนุชา สายน้ำผึ้ง',
    community: 'ชุมชนสมเด็จย่า', district: 'เขตคลองสาน',
    careType: 'cbtx', responsible: 'อสส.สมหญิง แข็งขัน', status: 'closed',
    houseLocation: { lat: 13.7301, lng: 100.5102, pinSaved: true },
    note: 'ยุติการดูแลเมื่อผู้รับบริการย้ายไปทำงานต่างจังหวัด — ส่งต่อ รพ.สต. ปลายทาง',
    recordedBy: 'พว.กรรณิการ์ แสงอรุณ', recordedAt: '30 พฤษภาคม 2569 16:05',
  },
  {
    id: 'hr-003', hn: '67-00013', patientName: 'มะลิวัลย์ พึ่งตนเอง',
    community: 'ชุมชนตรอกข้าวเม่า', district: 'เขตบางกอกน้อย',
    careType: 'hr', responsible: 'อสส.สมหญิง แข็งขัน', status: 'active',
    houseLocation: null,
    note: 'ดื่มสุราทุกวัน ให้ความรู้ลดอันตรายจากการดื่ม — นัดเยี่ยมบ้านเพื่อปักหมุดตำแหน่ง',
    recordedBy: 'พว.สุภาพร ใจดี', recordedAt: '28 กรกฎาคม 2569 09:35',
  },
];

const COMMUNITY_OVERLAY_KEY = 'mih:addiction:community-overlay';
const COMMUNITY_CANCEL_KEY = 'mih:addiction:community-cancelled';

export const getCommunityEntries = () => {
  const overlay = readJson(COMMUNITY_OVERLAY_KEY, {});
  const merged = COMMUNITY_SEED.map((row) => (overlay[row.id] ? { ...row, ...overlay[row.id] } : row));
  const created = Object.values(overlay).filter(
    (row) => !COMMUNITY_SEED.some((seed) => seed.id === row.id),
  );
  return [...created, ...merged];
};

export const upsertCommunityEntry = (entry) => {
  const overlay = readJson(COMMUNITY_OVERLAY_KEY, {});
  const isNew = !entry.id;
  const id = entry.id || `cbtx-${Date.now()}`;
  const prev = overlay[id] || COMMUNITY_SEED.find((row) => row.id === id) || {};
  const stamped = {
    ...prev,
    ...entry,
    id,
    ...(isNew
      ? { recordedBy: ADDICTION_CURRENT_USER, recordedAt: formatAddictionDateTime() }
      : { editedBy: ADDICTION_CURRENT_USER, editedAt: formatAddictionDateTime() }),
  };
  writeJson(COMMUNITY_OVERLAY_KEY, { ...overlay, [id]: stamped });
  return stamped;
};

export const cancelCommunityEntry = (id, reason) => {
  const all = readJson(COMMUNITY_CANCEL_KEY, {});
  writeJson(COMMUNITY_CANCEL_KEY, {
    ...all,
    [id]: { reason, by: ADDICTION_CURRENT_USER, at: formatAddictionDateTime() },
  });
};

export const reactivateCommunityEntry = (id) => {
  const all = readJson(COMMUNITY_CANCEL_KEY, {});
  const { [id]: _removed, ...rest } = all;
  writeJson(COMMUNITY_CANCEL_KEY, rest);
};

export const getCommunityCancellation = (id) => readJson(COMMUNITY_CANCEL_KEY, {})[id] || null;

export const COMMUNITY_NOTE_SUGGESTIONS = [
  'ประสาน อสส. ประจำชุมชนเยี่ยมบ้านสัปดาห์ละ 1 ครั้ง',
  'ครอบครัวให้ความร่วมมือดี มีผู้ดูแลใกล้ชิด',
  'แจกชุดอุปกรณ์ลดอันตราย (HR) และแนะนำจุดรับบริการ',
  'สภาพแวดล้อมใกล้แหล่งมั่วสุม — เพิ่มความถี่การเยี่ยม',
];

export const CANCEL_REASON_SUGGESTIONS = [
  'บันทึกซ้ำ / ข้อมูลผิดพลาด',
  'ผู้ป่วยย้ายไปรับการบำบัดที่สถานพยาบาลอื่น',
  'ผู้ป่วยขอยกเลิกการเข้าร่วมโปรแกรม',
];
