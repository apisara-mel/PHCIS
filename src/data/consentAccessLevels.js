/* PHCIS | Consent — สิทธิเข้าถึงข้อมูลผู้ป่วยตามระดับความยินยอม (TOR ด.1.1.18
   + ด.1.1.14). ระดับความยินยอม × หมวดข้อมูล (ศัพท์ HCIS เดียวกับ DATA_TYPES
   ใน consentReports) × บทบาทผู้ใช้ (Admin / Editor / Viewer).

   Mock local — สิทธิจริงมาจาก backend + consent record ที่ลงนามแล้ว. */

/* ── ระดับความยินยอมที่ผู้ป่วยลงนามได้ ──────────────────────────────────── */
export const CONSENT_LEVELS = [
  { key: 'full',      label: 'เต็มรูปแบบ',      tone: 'green',  description: 'ยินยอมให้เข้าถึงข้อมูลทุกหมวดเพื่อการรักษาและบริหารจัดการ' },
  { key: 'treatment', label: 'เฉพาะการรักษา',   tone: 'blue',   description: 'ยินยอมเฉพาะข้อมูลที่จำเป็นต่อการรักษาพยาบาลโดยตรง' },
  { key: 'partial',   label: 'บางส่วน',         tone: 'orange', description: 'ยินยอมเป็นรายหมวดตามที่ระบุในเอกสารความยินยอม' },
  { key: 'research',  label: 'วิจัย',           tone: 'purple', description: 'ยินยอมให้ใช้ข้อมูลเพื่อโครงการวิจัยที่ระบุเท่านั้น' },
  { key: 'none',      label: 'ยังไม่มีความยินยอม', tone: 'grey', description: 'ยังไม่มีเอกสารความยินยอมที่ลงนามและมีผลอยู่' },
];

export const LEVEL_BY_KEY = Object.fromEntries(CONSENT_LEVELS.map((l) => [l.key, l]));

/* ── หมวดข้อมูล (ชุดเดียวกับ DATA_TYPES ใน consentReports — ศัพท์ HCIS) ── */
export const DATA_CATEGORIES = [
  { key: 'history',  label: 'ประวัติการรักษา', icon: 'clinical_notes' },
  { key: 'lab',      label: 'ผลตรวจ Lab',     icon: 'labs' },
  { key: 'xray',     label: 'ภาพรังสี',        icon: 'radiology' },
  { key: 'rx',       label: 'ใบสั่งยา',        icon: 'prescriptions' },
  { key: 'rights',   label: 'ข้อมูลสิทธิ',     icon: 'id_card' },
];

/* ── บทบาทผู้ใช้ (ชุดเดียวกับ ROLES ในรายงาน 16.4) ─────────────────────── */
export const MATRIX_ROLES = [
  { key: 'Admin',  label: 'Admin',  tone: 'purple' },
  { key: 'Editor', label: 'Editor', tone: 'blue' },
  { key: 'Viewer', label: 'Viewer', tone: 'grey' },
];

/* ── สิทธิพื้นฐานตามระดับความยินยอม ─────────────────────────────────────
   defaultMatrix[level][categoryKey] = รายชื่อ role ที่เข้าถึงได้ */
const ALL = ['Admin', 'Editor', 'Viewer'];
const RW  = ['Admin', 'Editor'];
const A   = ['Admin'];
const NONE = [];

export const LEVEL_DEFAULT_MATRIX = {
  full: {
    history: ALL, lab: ALL, xray: ALL, rx: ALL, rights: RW,
  },
  treatment: {
    history: RW, lab: RW, xray: RW, rx: RW, rights: A,
  },
  partial: {
    history: RW, lab: A, xray: NONE, rx: RW, rights: A,
  },
  research: {
    history: A, lab: A, xray: NONE, rx: NONE, rights: NONE,
  },
  none: {
    history: NONE, lab: NONE, xray: NONE, rx: NONE, rights: NONE,
  },
};

/* ประเภท Consent (worklist) → ระดับความยินยอม */
export const TYPE_TO_LEVEL = {
  'PDPA':     'full',
  'ผ่าตัด':    'treatment',
  'การรักษา':  'treatment',
  'เลือด':     'treatment',
  'การวิจัย':  'research',
};

/* ── ประวัติการเพิ่ม/ยกเลิกสิทธิ (seed ต่อ HN) ─────────────────────────── */
export const RIGHTS_HISTORY_SEED = {
  '67-00008': [
    { id: 'h1', action: 'เพิ่มสิทธิ', category: 'ภาพรังสี', role: 'Viewer', period: '1 มิ.ย. – 31 ส.ค. 2569', by: 'ลดา ดีงาม', at: '1 มิถุนายน 2569 · 09:12', ref: 'PH-004 · V 1.0' },
    { id: 'h2', action: 'ยกเลิกสิทธิ', category: 'ข้อมูลสิทธิ', role: 'Editor', period: '-', by: 'นที ทองคำ', at: '15 มิถุนายน 2569 · 14:40', ref: 'คำสั่งหัวหน้าศูนย์ฯ' },
  ],
  '67-00009': [
    { id: 'h3', action: 'เพิ่มสิทธิ', category: 'ผลตรวจ Lab', role: 'Viewer', period: '10 มิ.ย. – 10 ก.ย. 2569', by: 'ลดา ดีงาม', at: '10 มิถุนายน 2569 · 10:02', ref: 'PH-003 · V 2.1' },
  ],
};

/* การปรับสิทธิเฉพาะราย (grant/revoke ทับค่า default) — seed ให้เห็น state
   จริงบนหน้า matrix. key = `${hn}:${categoryKey}:${role}` → true=เพิ่ม, false=ตัด */
export const RIGHTS_OVERRIDE_SEED = {
  '67-00008:xray:Viewer': true,
  '67-00008:rights:Editor': false,
  '67-00009:lab:Viewer': true,
};
