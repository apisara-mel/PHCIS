/* schoolHealthCore.js — โครงพื้นฐานของงานอนามัยโรงเรียน (TOR §3.1–3.4, §3.6)

   รวม session plumbing / วันที่แบบไทย / ผู้บันทึก + ตำแหน่ง (audit trail ตาม
   คู่มือ HCIS "ผู้บันทึกรายงาน") / สิทธิใช้งาน / ปีการศึกษา-ภาคเรียน /
   ระดับชั้น เพื่อให้ schoolHealthSchools · schoolHealthStudents ·
   schoolHealthServices ใช้ร่วมกันโดยไม่เกิด import วน
   (core ← schools ← students ← services ทิศทางเดียว).

   ทุก state ที่แก้ได้ระหว่าง session (ทะเบียน, บริการ, เลื่อนชั้น, สิทธิ)
   เก็บใน sessionStorage — pattern เดียวกับ ancVisits.js / immunizationClinic.js */

/* ── sessionStorage plumbing ──────────────────────────────────────── */
const storageAvailable = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

export const readJson = (key, fallback) => {
  if (!storageAvailable()) return fallback;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(key) || 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

export const writeJson = (key, value) => {
  if (!storageAvailable()) return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — mock ยอมให้เงียบได้ */
  }
};

export const SH_KEYS = {
  schools: 'mih:sh:schools-overlay',
  schoolRun: 'mih:sh:schools-run',
  classrooms: 'mih:sh:classrooms-overlay',
  activities: 'mih:sh:activities-overlay',
  activityRun: 'mih:sh:activities-run',
  students: 'mih:sh:students-overlay',
  studentRun: 'mih:sh:students-run',
  promotion: 'mih:sh:promotion-log',
  queue: 'mih:sh:queue-overlay',
  services: 'mih:sh:service-overlay',
  serviceRun: 'mih:sh:service-run',
  drafts: 'mih:sh:service-drafts',
  referrals: 'mih:sh:referrals',
  batches: 'mih:sh:batch-log',
  rights: 'mih:sh:rights',
  printLog: 'mih:sh:print-log',
};

/** ตัวนับ running number ต่อ prefix — คงที่ตลอด session เดียว */
export const nextRunNo = (key, width = 4) => {
  const n = (readJson(key, 0) || 0) + 1;
  writeJson(key, n);
  return String(n).padStart(width, '0');
};

/* ── วันที่ / เวลา (พ.ศ.) ──────────────────────────────────────────── */
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const TH_MONTHS_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

export const toDate = (v) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(`${String(v).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const formatShDate = (v) => {
  const d = toDate(v);
  if (!d) return '—';
  return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
};

export const formatShDateFull = (v) => {
  const d = toDate(v);
  if (!d) return '—';
  return `${d.getDate()} ${TH_MONTHS_FULL[d.getMonth()]} ${d.getFullYear() + 543}`;
};

export const formatShDateTime = (v) => {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${formatShDate(d)} ${hh}:${mm} น.`;
};

export const toIso = (v) => {
  const d = v instanceof Date ? v : toDate(v);
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const todayIso = () => toIso(new Date());

export const addDaysIso = (iso, days) => {
  const d = toDate(iso);
  if (!d) return '';
  d.setDate(d.getDate() + days);
  return toIso(d);
};

export const daysBetween = (fromIso, toIsoStr) => {
  const a = toDate(fromIso);
  const b = toDate(toIsoStr);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
};

/** อายุเป็นปี (ทศนิยม 1 ตำแหน่ง) ณ วันที่ระบุ — ใช้กับเกณฑ์ BMI for Age */
export const ageYearsAt = (birthDate, atIso) => {
  const b = toDate(birthDate);
  const at = toDate(atIso) || new Date();
  if (!b) return null;
  const ms = at.getTime() - b.getTime();
  if (ms < 0) return null;
  return Math.round((ms / (365.2425 * 86400000)) * 10) / 10;
};

export const formatAgeYears = (birthDate, atIso) => {
  const y = ageYearsAt(birthDate, atIso);
  if (y == null) return '—';
  const whole = Math.floor(y);
  const months = Math.round((y - whole) * 12);
  return months > 0 ? `${whole} ปี ${months} เดือน` : `${whole} ปี`;
};

/* ── ศูนย์บริการสาธารณสุข / ผู้ปฏิบัติงาน ──────────────────────────── */

export const SH_CENTER = {
  id: 'phc-21',
  code: '21',
  name: 'ศูนย์บริการสาธารณสุข 21 วัดธาตุทอง',
  district: 'เขตวัฒนา',
  phone: '0 2391 2129',
};

export const SH_CENTER_OPTIONS = [
  { value: 'phc-21', label: 'ศบส. 21 วัดธาตุทอง' },
  { value: 'phc-15', label: 'ศบส. 15 ลาดพร้าว' },
  { value: 'phc-41', label: 'ศบส. 41 คลองเตย' },
];

export const resolveCenter = (id) =>
  SH_CENTER_OPTIONS.find((c) => c.value === id)?.label || SH_CENTER.name;

export const SH_CURRENT_USER = {
  name: 'พว.ณัฐธิดา บุญมั่น',
  position: 'พยาบาลวิชาชีพชำนาญการ (งานอนามัยโรงเรียน)',
};

export const SH_NURSES = [
  { value: 'nurse-natthida', label: 'พว.ณัฐธิดา บุญมั่น' },
  { value: 'nurse-pornthip', label: 'พว.พรทิพย์ แสงเดือน' },
  { value: 'nurse-kanokwan', label: 'พว.กนกวรรณ ศรีสุข' },
];

export const SH_DENTISTS = [
  { value: 'dent-arisa', label: 'ทพญ.อริสา วงศ์ไพศาล' },
  { value: 'dent-somsak', label: 'ทพ.สมศักดิ์ เจริญพร' },
];

export const resolveStaff = (value) =>
  [...SH_NURSES, ...SH_DENTISTS].find((s) => s.value === value)?.label || value || '—';

/** ลายเซ็น audit ที่แนบทุก record (ผู้บันทึก + ตำแหน่ง + เวลา) */
export const auditStamp = () => ({
  by: SH_CURRENT_USER.name,
  position: SH_CURRENT_USER.position,
  at: new Date().toISOString(),
});

/* ── สิทธิใช้งานงานอนามัยโรงเรียน (§ สิทธิไม่พอ → read-only) ───────── */

export const hasSchoolHealthRights = () => readJson(SH_KEYS.rights, 'granted') === 'granted';
export const setSchoolHealthRights = (granted) =>
  writeJson(SH_KEYS.rights, granted ? 'granted' : 'revoked');

/** ผลสุขภาพจิต/พัฒนาการเป็นข้อมูลอ่อนไหว (§1.4.2) — mock ผูกกับสิทธิเดียวกัน */
export const canViewSensitive = () => hasSchoolHealthRights();

/* ── ปีการศึกษา / ภาคเรียน ────────────────────────────────────────── */

export const SH_ACADEMIC_YEARS = [
  { value: '2569', label: 'ปีการศึกษา 2569' },
  { value: '2568', label: 'ปีการศึกษา 2568' },
  { value: '2567', label: 'ปีการศึกษา 2567' },
];

export const CURRENT_ACADEMIC_YEAR = '2569';

export const SH_TERMS = [
  { value: '1', label: 'ภาคเรียนที่ 1' },
  { value: '2', label: 'ภาคเรียนที่ 2' },
];

export const CURRENT_TERM = '1';

/* ── ระดับชั้น (อ.1 → ม.6) ────────────────────────────────────────── */

export const GRADE_LEVELS = [
  { value: 'k1', label: 'อ.1', order: 1 },
  { value: 'k2', label: 'อ.2', order: 2 },
  { value: 'k3', label: 'อ.3', order: 3 },
  { value: 'p1', label: 'ป.1', order: 4 },
  { value: 'p2', label: 'ป.2', order: 5 },
  { value: 'p3', label: 'ป.3', order: 6 },
  { value: 'p4', label: 'ป.4', order: 7 },
  { value: 'p5', label: 'ป.5', order: 8 },
  { value: 'p6', label: 'ป.6', order: 9 },
  { value: 'm1', label: 'ม.1', order: 10 },
  { value: 'm2', label: 'ม.2', order: 11 },
  { value: 'm3', label: 'ม.3', order: 12 },
  { value: 'm4', label: 'ม.4', order: 13 },
  { value: 'm5', label: 'ม.5', order: 14 },
  { value: 'm6', label: 'ม.6', order: 15 },
];

export const gradeLabel = (value) =>
  GRADE_LEVELS.find((g) => g.value === value)?.label || value || '—';

export const gradeOrder = (value) =>
  GRADE_LEVELS.find((g) => g.value === value)?.order ?? 99;

/** ชั้นถัดไปตามลำดับสากล — ใช้โดยการเลื่อนชั้นอัตโนมัติ */
export const nextGrade = (value) => {
  const order = gradeOrder(value);
  return GRADE_LEVELS.find((g) => g.order === order + 1)?.value || null;
};

/* ── สถานะร่วม ────────────────────────────────────────────────────── */

export const RECORD_STATUS = {
  draft: { key: 'draft', label: 'ที่ร่างไว้', style: 'grey' },
  saved: { key: 'saved', label: 'บันทึกแล้ว', style: 'green' },
  cancelled: { key: 'cancelled', label: 'ยกเลิกแล้ว', style: 'red' },
};

export const STUDENT_STATUS = {
  active: { key: 'active', label: 'กำลังศึกษา', style: 'green' },
  graduated: { key: 'graduated', label: 'จบการศึกษา', style: 'indigo' },
  transferred: { key: 'transferred', label: 'ย้ายออก', style: 'yellow' },
  cancelled: { key: 'cancelled', label: 'ยกเลิกทะเบียน', style: 'red' },
};

export const DISCHARGE_REASONS = [
  { value: 'graduated', label: 'จบการศึกษา' },
  { value: 'transferred', label: 'ย้ายสถานศึกษา' },
  { value: 'moved', label: 'ย้ายภูมิลำเนา' },
  { value: 'duplicate', label: 'ลงทะเบียนซ้ำ' },
  { value: 'other', label: 'อื่น ๆ (ระบุเหตุผล)' },
];

/** ตัวเลขไทยอ่านง่ายในตาราง/การ์ดสรุป */
export const thNum = (n) => (Number(n) || 0).toLocaleString('th-TH');

/** เปอร์เซ็นต์ปลอดภัย (หารศูนย์ → 0) */
export const pct = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);
