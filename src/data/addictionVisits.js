/* งานบำบัดสารเสพติด (TOR §1.10.5) — mock data + domain logic.

   Source: TOR §1.10.5 (docs/tor-checklist.html) + คู่มือระบบงานบำบัดและ
   รักษาผู้ป่วยติดสารเสพติด (legacy HCIS, ~/MIH-Docs-Vault/คู่มือระบบงาน/).
   Vocabulary lifted from the manual: แรกรับ · กิจกรรม BMA MATRIX MODEL ·
   จำหน่ายเพื่อติดตามผล · ประเมินวินิจฉัยทางสังคม · สยส.1/2/3 · PwP.

   4 treatment programs (manual §2.2-2.5):
     matrix    — BMA Matrix Model (ยาบ้า/สารกระตุ้น, กลุ่มกิจกรรม 16 ครั้ง)
     methadone — ยาเมทาโดนระยะยาว / IDU Care (สยส.1-3, จ่ายยารายวัน)
     smoking   — บำบัดบุหรี่ (แบบประเมิน 1 ความพร้อม / 2 นิโคติน / 3 สาเหตุ)
     alcohol   — บำบัดแอลกอฮอล์ (AUDIT + Brief Intervention & Counselling)

   The legacy manual has ~30 sub-forms (สยส.1, 1/1, 2, 2/1-2/3, PwP1-3,
   แบบประเมิน 1-3, ...) — this model condenses them into program-aware step
   content: TOR-leaf coverage is complete, per-form fidelity representative. */

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const toDate = (v) => (v instanceof Date ? v : new Date(v));

export const formatAddictionDate = (v) => {
  if (!v) return '';
  const d = toDate(v);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
};

export const formatAddictionDateTime = (v = new Date()) =>
  new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(toDate(v));

export const todayIsoDate = () => new Date().toISOString().slice(0, 10);

/** Mock signed-in clinician — audit-trail ผู้บันทึก/ผู้แก้ไข on every write. */
export const ADDICTION_CURRENT_USER = 'พว.กรรณิการ์ แสงอรุณ';

/* ─── โปรแกรมบำบัด ──────────────────────────────────────────────── */

export const ADDICTION_PROGRAMS = [
  { value: 'matrix',    label: 'BMA Matrix Model',            short: 'Matrix',    badge: 'purple' },
  { value: 'methadone', label: 'ยาเมทาโดนระยะยาว (IDU Care)', short: 'เมทาโดน',  badge: 'blue'   },
  { value: 'smoking',   label: 'บำบัดบุหรี่',                  short: 'บุหรี่',    badge: 'teal'   },
  { value: 'alcohol',   label: 'บำบัดแอลกอฮอล์',               short: 'แอลกอฮอล์', badge: 'yellow' },
];

export const resolveProgram = (value) =>
  ADDICTION_PROGRAMS.find((p) => p.value === value) || null;

export const ADDICTION_SUBSTANCES = [
  'ยาบ้า (Methamphetamine)', 'ไอซ์ (Crystal Meth)', 'เฮโรอีน', 'กัญชา',
  'สารระเหย', 'ยาเค (Ketamine)', 'บุหรี่/นิโคติน', 'สุรา/แอลกอฮอล์', 'ฝิ่น', 'ยานอนหลับ/ยากล่อมประสาท',
];

export const ADDICTION_USE_METHODS = ['สูบ', 'ฉีด', 'กิน', 'ดม/สูดดม', 'อื่นๆ'];

/* ─── สิทธิการรักษา (§1.4.2 / CPOE guard) ──────────────────────── */

/** HNs whose สิทธิการรักษา expired — CPOE step warns before billable orders. */
export const ADDICTION_RIGHTS_EXPIRED_HNS = ['67-00016'];

export const isRightsExpired = (hn) => ADDICTION_RIGHTS_EXPIRED_HNS.includes(hn);

/* ─── ข้อมูลลับ (§1.4.2) — clinic-rights mock ──────────────────── */

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

const ACCESS_KEY = 'mih:addiction:clinic-access';

/** Addiction records are ข้อมูลลับ — only staff of งานบำบัดสารเสพติด may
    view them. Mocked as a session flag (default: has rights) so every
    screen can demonstrate the masked/no-rights state. */
export const getAddictionAccess = () => readJson(ACCESS_KEY, true);
export const setAddictionAccess = (allowed) => writeJson(ACCESS_KEY, !!allowed);

/* ─── คิววันนี้ ─────────────────────────────────────────────────── */

/* HNs align with patientProfiles.js so PatientCard / avatars resolve and
   the OPD carried-forward block (1.10.5.3) is demonstrably cross-module. */
export const ADDICTION_PATIENTS = [
  { queue: 'B001', hn: '67-00009', name: 'ประเสริฐ ศรีวิไล',    program: 'matrix',    sessionNo: 5,  therapist: 'พว.กรรณิการ์ แสงอรุณ', arrivalType: 'appointment', room: 'ห้อง 1', waitMinutes: 12, statusKey: 'waiting',  mainSubstance: 'ยาบ้า (Methamphetamine)', telemedicine: false },
  { queue: 'B002', hn: '67-00010', name: 'สมชาย บุญมาเรือน',   program: 'methadone', sessionNo: 34, therapist: 'นพ.ปกรณ์ จิตอาสา',     arrivalType: 'walkin',      room: 'ห้อง 2', waitMinutes: 25, statusKey: 'waiting',  mainSubstance: 'เฮโรอีน',                 telemedicine: false },
  { queue: 'B003', hn: '67-00012', name: 'วิเชียร คงคาใส',      program: 'smoking',   sessionNo: 2,  therapist: 'พว.สุภาพร ใจดี',        arrivalType: 'appointment', room: 'ห้อง 3', waitMinutes: 8,  statusKey: 'progress', mainSubstance: 'บุหรี่/นิโคติน',           telemedicine: true  },
  { queue: 'B004', hn: '67-00013', name: 'มะลิวัลย์ พึ่งตนเอง',  program: 'alcohol',   sessionNo: 3,  therapist: 'พว.สุภาพร ใจดี',        arrivalType: 'walkin',      room: 'ห้อง 3', waitMinutes: 0,  statusKey: 'progress', mainSubstance: 'สุรา/แอลกอฮอล์',           telemedicine: false },
  { queue: 'B005', hn: '67-00014', name: 'อำนาจ รักษาดี',       program: 'matrix',    sessionNo: 12, therapist: 'พว.กรรณิการ์ แสงอรุณ', arrivalType: 'appointment', room: 'ห้อง 1', waitMinutes: 0,  statusKey: 'done',     mainSubstance: 'ไอซ์ (Crystal Meth)',      telemedicine: false },
  { queue: 'B006', hn: '67-00016', name: 'ธนกฤต แซ่ลิ้ม',       program: 'matrix',    sessionNo: 1,  therapist: 'นพ.ปกรณ์ จิตอาสา',     arrivalType: 'walkin',      room: 'ห้อง 2', waitMinutes: 41, statusKey: 'waiting',  mainSubstance: 'ยาบ้า (Methamphetamine)', telemedicine: false },
  { queue: 'B007', hn: '67-00017', name: 'รัตนา วงศ์สุวรรณ',    program: 'smoking',   sessionNo: 4,  therapist: 'พว.สุภาพร ใจดี',        arrivalType: 'appointment', room: 'ห้อง 3', waitMinutes: 0,  statusKey: 'draft',    mainSubstance: 'บุหรี่/นิโคติน',           telemedicine: false },
  { queue: 'B008', hn: '67-00018', name: 'สมบัติ เจริญสุข',      program: 'methadone', sessionNo: 58, therapist: 'นพ.ปกรณ์ จิตอาสา',     arrivalType: 'walkin',      room: 'ห้อง 2', waitMinutes: 5,  statusKey: 'waiting',  mainSubstance: 'เฮโรอีน',                 telemedicine: false },
  { queue: 'B009', hn: '67-00019', name: 'จินตนา ทองประเสริฐ',  program: 'alcohol',   sessionNo: 1,  therapist: 'พว.กรรณิการ์ แสงอรุณ', arrivalType: 'appointment', room: 'ห้อง 1', waitMinutes: 0,  statusKey: 'done',     mainSubstance: 'สุรา/แอลกอฮอล์',           telemedicine: true  },
  { queue: 'B010', hn: '67-00020', name: 'อนุชา สายน้ำผึ้ง',     program: 'matrix',    sessionNo: 8,  therapist: 'พว.กรรณิการ์ แสงอรุณ', arrivalType: 'walkin',      room: 'ห้อง 1', waitMinutes: 18, statusKey: 'waiting',  mainSubstance: 'กัญชา',                   telemedicine: false },
];

/** นัดแล้วยังไม่มาติดต่อ (same worklist tab as ANC / legacy HCIS p.2-3). */
export const ADDICTION_SCHEDULED = [
  { appointmentTime: '09:30', hn: '67-00011', name: 'บุญเรือน ใจงาม',   program: 'smoking',   sessionNo: 3,  therapist: 'พว.สุภาพร ใจดี',    clinic: 'บำบัดสารเสพติด' },
  { appointmentTime: '10:00', hn: '67-00015', name: 'วันดี ศรีสมบูรณ์',  program: 'matrix',    sessionNo: 9,  therapist: 'พว.กรรณิการ์ แสงอรุณ', clinic: 'บำบัดสารเสพติด' },
  { appointmentTime: '13:30', hn: '67-00004', name: 'สมพงษ์ พูลทรัพย์', program: 'methadone', sessionNo: 21, therapist: 'นพ.ปกรณ์ จิตอาสา',  clinic: 'บำบัดสารเสพติด' },
];

/* ─── 1.10.5.3 — ผลการซักประวัติ carried from OPD (read-only) ───── */

export const OPD_CARRIED_SCREENING = {
  '67-00009': { chiefComplaint: 'นอนไม่หลับ ใจสั่น อยากใช้ยาบ้าซ้ำหลังหยุด 3 วัน', screeningNote: 'BP 138/86 · HR 96 · คัดกรอง 2Q ปกติ · ญาติพามาสมัครใจบำบัด', recordedBy: 'พว.อารีย์ คำแก้ว (OPD)', recordedAt: 'วันนี้ 08:42' },
  '67-00010': { chiefComplaint: 'มารับยาเมทาโดนตามนัดรายวัน', screeningNote: 'ไม่มีอาการถอนยา · แผลฉีดยาเก่าแห้งดี · นัด Chest X-Ray ประจำปีตาม สยส.2', recordedBy: 'พว.อารีย์ คำแก้ว (OPD)', recordedAt: 'วันนี้ 08:15' },
  '67-00012': { chiefComplaint: 'ไอเรื้อรัง อยากเลิกบุหรี่ สูบวันละ 1 ซอง มา 20 ปี', screeningNote: 'BP 145/92 · แนะนำเข้าคลินิกบำบัดบุหรี่ · ประเมินความพร้อมแล้วสมัครใจ', recordedBy: 'นพ.วีระ ตั้งตรง (OPD)', recordedAt: 'วันนี้ 09:03' },
  '67-00013': { chiefComplaint: 'ครอบครัวพามา ดื่มสุราทุกวัน เคยหกล้มขณะเมา', screeningNote: 'AUDIT-C เบื้องต้น 7 คะแนน · ตับโต 2 FB · ส่งเข้าคลินิกบำบัดแอลกอฮอล์', recordedBy: 'นพ.วีระ ตั้งตรง (OPD)', recordedAt: 'วันนี้ 09:20' },
  '67-00016': { chiefComplaint: 'ถูกส่งตัวจากศาลเยาวชนฯ เข้าบำบัดแบบสมัครใจ', screeningNote: 'แรกรับ ครั้งที่ 1 · ปัสสาวะพบ Methamphetamine · ไม่มีโรคประจำตัว', recordedBy: 'พว.อารีย์ คำแก้ว (OPD)', recordedAt: 'วันนี้ 10:12' },
};

export const getOpdCarriedScreening = (hn) => OPD_CARRIED_SCREENING[hn] || null;

/* ─── Step 2 — แบบคัดกรองและแบบประเมิน ─────────────────────────── */

/** แบบคัดกรองการใช้สารเสพติด (ASSIST-style, ทุกโปรแกรม) — 5 ข้อ ย่อจาก
    ASSIST 8 ข้อของ WHO เพื่อคงเจตนา ต่ำ/กลาง/สูง ของ manual §2.2.1. */
export const ASSIST_QUESTIONS = [
  { key: 'craving',   label: 'ใน 3 เดือนที่ผ่านมา ท่านรู้สึกอยากใช้สารเสพติดอย่างรุนแรงบ่อยเพียงใด' },
  { key: 'frequency', label: 'ใน 3 เดือนที่ผ่านมา ท่านใช้สารเสพติดบ่อยเพียงใด' },
  { key: 'problem',   label: 'การใช้สารเสพติดก่อปัญหาสุขภาพ ครอบครัว การเงิน หรือกฎหมายบ่อยเพียงใด' },
  { key: 'failedDuty', label: 'ท่านละเลยหน้าที่การงาน/การเรียนเพราะการใช้สารเสพติดบ่อยเพียงใด' },
  { key: 'failedQuit', label: 'ท่านเคยพยายามหยุดหรือลดการใช้แต่ทำไม่สำเร็จบ่อยเพียงใด' },
];

export const ASSIST_SCALE = [
  { value: 0, label: 'ไม่เคย' },
  { value: 1, label: 'นานๆ ครั้ง' },
  { value: 2, label: 'ทุกเดือน' },
  { value: 3, label: 'ทุกสัปดาห์' },
  { value: 4, label: 'เกือบทุกวัน' },
];

/** ระดับความรุนแรงแรกรับ (manual §2.2.1) — ต่ำ/กลาง/สูง. */
export const interpretAssistScore = (total) => {
  if (total >= 14) return { level: 'high',   label: 'ความรุนแรงสูง — ควรบำบัดแบบเข้มข้น/ส่งต่อ',    badge: 'red'    };
  if (total >= 6)  return { level: 'medium', label: 'ความรุนแรงปานกลาง — เข้าโปรแกรมบำบัดต่อเนื่อง', badge: 'yellow' };
  return { level: 'low', label: 'ความรุนแรงต่ำ — ให้คำแนะนำแบบสั้น (Brief Advice)', badge: 'green' };
};

export const ADDICTION_SEVERITY_LEVELS = [
  { value: 'low',    label: 'ต่ำ',      badge: 'green'  },
  { value: 'medium', label: 'ปานกลาง', badge: 'yellow' },
  { value: 'high',   label: 'สูง',      badge: 'red'    },
];

export const resolveSeverity = (value) =>
  ADDICTION_SEVERITY_LEVELS.find((s) => s.value === value) || null;

/** บุหรี่ แบบประเมิน 1 — ความพร้อมในการเลิกบุหรี่ (manual §2.3.2). */
export const SMOKING_READINESS_QUESTIONS = [
  { key: 'wantQuit',   label: 'ท่านต้องการเลิกบุหรี่ในขณะนี้หรือไม่' },
  { key: 'quitIn30',   label: 'ท่านพร้อมจะเริ่มเลิกบุหรี่ภายใน 30 วันหรือไม่' },
  { key: 'triedBefore', label: 'ท่านเคยพยายามเลิกบุหรี่ด้วยตนเองมาก่อนหรือไม่' },
];

/** บุหรี่ แบบประเมิน 2 — การติดสารนิโคติน (Fagerström ย่อ, manual §2.3.3). */
export const NICOTINE_QUESTIONS = [
  {
    key: 'firstSmoke', label: 'สูบบุหรี่มวนแรกหลังตื่นนอนภายในกี่นาที',
    options: [
      { value: 3, label: 'ภายใน 5 นาที' },
      { value: 2, label: '6-30 นาที' },
      { value: 1, label: '31-60 นาที' },
      { value: 0, label: 'มากกว่า 60 นาที' },
    ],
  },
  {
    key: 'perDay', label: 'สูบบุหรี่วันละกี่มวน',
    options: [
      { value: 0, label: '10 มวนหรือน้อยกว่า' },
      { value: 1, label: '11-20 มวน' },
      { value: 2, label: '21-30 มวน' },
      { value: 3, label: 'มากกว่า 30 มวน' },
    ],
  },
  {
    key: 'hardestSkip', label: 'บุหรี่มวนใดที่เลิกยากที่สุด',
    options: [
      { value: 1, label: 'มวนแรกตอนเช้า' },
      { value: 0, label: 'มวนอื่นๆ' },
    ],
  },
  {
    key: 'smokeWhenSick', label: 'ท่านยังสูบบุหรี่แม้เจ็บป่วยจนต้องนอนพักหรือไม่',
    options: [
      { value: 1, label: 'ใช่' },
      { value: 0, label: 'ไม่ใช่' },
    ],
  },
];

export const interpretNicotineScore = (total) => {
  if (total >= 6) return { level: 'high',   label: 'ติดนิโคตินระดับสูง — พิจารณายาช่วยเลิก (NRT)', badge: 'red' };
  if (total >= 3) return { level: 'medium', label: 'ติดนิโคตินระดับปานกลาง', badge: 'yellow' };
  return { level: 'low', label: 'ติดนิโคตินระดับต่ำ', badge: 'green' };
};

/** บุหรี่ แบบประเมิน 3 — สาเหตุการสูบบุหรี่ (manual §2.3.4). */
export const SMOKING_CAUSE_OPTIONS = [
  { key: 'stress',    label: 'คลายเครียด/ความกังวล' },
  { key: 'social',    label: 'เข้าสังคม/เพื่อนชวน' },
  { key: 'habit',     label: 'ความเคยชิน (หลังอาหาร/กาแฟ)' },
  { key: 'stimulate', label: 'กระตุ้นให้กระปรี้กระเปร่า' },
  { key: 'craving',   label: 'อาการอยาก/ขาดนิโคติน' },
  { key: 'boredom',   label: 'ความเบื่อหน่าย/ว่างงาน' },
];

/** AUDIT (แอลกอฮอล์, manual §2.4.3) — 5 ข้อย่อจาก AUDIT 10 ข้อ. */
export const AUDIT_QUESTIONS = [
  { key: 'frequency', label: 'ท่านดื่มสุราบ่อยเพียงใด' },
  { key: 'amount',    label: 'เมื่อดื่ม ท่านดื่มครั้งละมากเพียงใด (ดื่มหนักเกิน 4 หน่วยดื่ม)' },
  { key: 'cantStop',  label: 'ท่านไม่สามารถหยุดดื่มได้เมื่อเริ่มดื่มแล้วบ่อยเพียงใด' },
  { key: 'guilt',     label: 'ท่านรู้สึกผิดหรือเสียใจหลังการดื่มบ่อยเพียงใด' },
  { key: 'morning',   label: 'ท่านต้องดื่มทันทีตอนเช้าเพื่อให้ทำงานได้บ่อยเพียงใด' },
];

export const AUDIT_SCALE = [
  { value: 0, label: 'ไม่เคย' },
  { value: 1, label: 'นานๆ ครั้ง' },
  { value: 2, label: 'ทุกเดือน' },
  { value: 3, label: 'ทุกสัปดาห์' },
  { value: 4, label: 'เกือบทุกวัน' },
];

export const interpretAuditScore = (total) => {
  if (total >= 13) return { level: 'high',   label: 'ติดสุราระดับสูง — Counselling + พิจารณาส่งต่อจิตแพทย์', badge: 'red' };
  if (total >= 6)  return { level: 'medium', label: 'ดื่มแบบเสี่ยง — Brief Intervention & Counselling', badge: 'yellow' };
  return { level: 'low', label: 'ดื่มระดับความเสี่ยงต่ำ — ให้คำแนะนำแบบสั้น', badge: 'green' };
};

/* ─── Step 4 — กิจกรรมบำบัด ─────────────────────────────────────── */

/** กิจกรรม BMA MATRIX MODEL (manual §2.2.2) — กลุ่มกิจกรรมมาตรฐาน. */
export const MATRIX_ACTIVITIES = [
  'กลุ่มทักษะการเลิกยาระยะต้น (Early Recovery Skills)',
  'กลุ่มป้องกันการกลับไปเสพซ้ำ (Relapse Prevention)',
  'กลุ่มครอบครัวศึกษา (Family Education)',
  'กลุ่มสนับสนุนทางสังคม (Social Support)',
  'ให้คำปรึกษารายบุคคล (Individual Counselling)',
];

export const METHADONE_DOSES = ['20 mg', '30 mg', '40 mg', '50 mg', '60 mg', '70 mg', '80 mg'];

/* บันทึกรับ-จ่ายยาเมทาโดนรายวัน (สยส.3, manual §2.5.9-2.5.10) —
   duplicate same-day dispense is blocked per the daily-dose workflow. */
const METHADONE_KEY = 'mih:addiction:methadone-dispense';

export const getMethadoneDispenses = (hn) => readJson(METHADONE_KEY, {})[hn] || [];

export const hasMethadoneDispenseToday = (hn) =>
  getMethadoneDispenses(hn).some((d) => d.date === todayIsoDate());

export const saveMethadoneDispense = (hn, dose) => {
  if (hasMethadoneDispenseToday(hn)) {
    return { error: 'ผู้ป่วยรายนี้รับยาเมทาโดนของวันนี้ไปแล้ว — สยส.3 จ่ายได้วันละ 1 ครั้งเท่านั้น' };
  }
  const all = readJson(METHADONE_KEY, {});
  const rows = all[hn] || [];
  const entry = { date: todayIsoDate(), dose, by: ADDICTION_CURRENT_USER, at: formatAddictionDateTime() };
  writeJson(METHADONE_KEY, { ...all, [hn]: [entry, ...rows] });
  return { entry };
};

/* ─── Step 5 — CPOE catalogs ────────────────────────────────────── */

export const ADDICTION_DRUG_ORDERS = [
  { key: 'methadone',   th: 'เมทาโดน (Methadone) ชนิดน้ำ',       en: 'Methadone syrup', billable: true },
  { key: 'nrtPatch',    th: 'แผ่นแปะนิโคติน',                     en: 'NRT patch',       billable: true },
  { key: 'nrtGum',      th: 'หมากฝรั่งนิโคติน',                   en: 'NRT gum',         billable: true },
  { key: 'vitaminB',    th: 'วิตามินบีรวม',                       en: 'Vitamin B complex', billable: true },
  { key: 'diazepam',    th: 'ไดอาซีแพม (ลดอาการถอน)',            en: 'Diazepam',        billable: true },
];

export const ADDICTION_LAB_ORDERS = [
  { key: 'urineMeth',   th: 'ตรวจปัสสาวะหาสารเมทแอมเฟตามีน',     en: 'Urine Methamphetamine' },
  { key: 'urineOpiate', th: 'ตรวจปัสสาวะหาสารกลุ่มฝิ่น',          en: 'Urine Opiates' },
  { key: 'lft',         th: 'ตรวจการทำงานของตับ',                 en: 'LFT' },
  { key: 'antiHiv',     th: 'ตรวจ Anti-HIV (สมัครใจ, สยส.2)',     en: 'Anti-HIV' },
  { key: 'hbsag',       th: 'ตรวจไวรัสตับอักเสบบี',               en: 'HBsAg' },
];

export const ADDICTION_XRAY_ORDERS = [
  { key: 'cxr', th: 'เอกซเรย์ทรวงอก (ประจำปีตาม สยส.2/3)', en: 'Chest X-Ray' },
];

/* ─── Step 6 — เอกสารระหว่างการรักษา ───────────────────────────── */

export const ADDICTION_DOCUMENT_TYPES = [
  'แบบฟอร์ม สยส.1 (ประวัติผู้ป่วย)',
  'แบบฟอร์ม สยส.2 (ตรวจร่างกาย/Lab)',
  'แบบฟอร์ม สยส.3 (รับ-จ่ายยาเมทาโดน)',
  'ใบส่งตัว/ใบรับรองการบำบัด',
  'ผลตรวจจากภายนอก',
  'เอกสารอื่นๆ',
];

export const DOCUMENT_ACCEPT = '.png,.jpg,.jpeg,.pdf';
export const DOCUMENT_MAX_MB = 5;

/* ─── SuggestibleTextarea suggestion sets ───────────────────────── */

export const ADDICTION_HISTORY_SUGGESTIONS = [
  'ไม่มีโรคประจำตัว ปฏิเสธการแพ้ยา',
  'มีโรคประจำตัวความดันโลหิตสูง รับยาต่อเนื่อง',
  'เคยเข้ารับการบำบัดที่สถานพยาบาลอื่นแต่ไม่ครบโปรแกรม',
  'มีประวัติโรคซึมเศร้า เคยพบจิตแพทย์',
];

export const ADDICTION_FAMILY_SUGGESTIONS = [
  'อาศัยกับครอบครัว ครอบครัวสนับสนุนการบำบัด',
  'บิดามีประวัติดื่มสุราเรื้อรัง',
  'อยู่คนเดียว ขาดผู้ดูแลใกล้ชิด',
  'สมาชิกครอบครัวเคยใช้สารเสพติด',
];

export const ADDICTION_BEHAVIOR_SUGGESTIONS = [
  'เริ่มใช้ครั้งแรกอายุ 18 ปี ใช้ต่อเนื่องช่วงทำงานกลางคืน',
  'ใช้เพิ่มขึ้นช่วง 6 เดือนที่ผ่านมาจากความเครียดเรื่องงาน',
  'หยุดใช้ได้เองนานสุด 2 เดือน กลับไปใช้ซ้ำเมื่อเจอเพื่อนกลุ่มเดิม',
  'ใช้ร่วมกับสุราเป็นครั้งคราว',
];

export const ADDICTION_PSYCH_SUGGESTIONS = [
  'ประเมินและทดสอบทางจิตวิทยา: ไม่พบภาวะซึมเศร้าหรือความเสี่ยงทำร้ายตนเอง',
  '2Q ผลบวก — ส่งประเมิน 9Q ต่อ',
  'มีความวิตกกังวลระดับปานกลาง นัดให้คำปรึกษารายบุคคล',
];

export const ADDICTION_SOCIAL_SUGGESTIONS = [
  'ประเมินวินิจฉัยทางสังคม: มีงานทำมั่นคง ครอบครัวพร้อมสนับสนุน',
  'ว่างงาน รายได้ไม่พอใช้จ่าย — ประสานนักสังคมสงเคราะห์',
  'สภาพแวดล้อมที่พักใกล้แหล่งซื้อขาย เสี่ยงกลับไปใช้ซ้ำ',
];

export const ADDICTION_ACTIVITY_SUGGESTIONS = [
  'เข้าร่วมกิจกรรมกลุ่มครบ มีส่วนร่วมดี',
  'ฝึกทักษะปฏิเสธเมื่อถูกชวนใช้สารเสพติด',
  'ทบทวนสัญญาณเตือนการกลับไปเสพซ้ำร่วมกับครอบครัว',
  'ผู้ป่วยยอมรับว่ามีความอยากใช้ยาช่วงสัปดาห์ที่ผ่านมา ให้เทคนิคจัดการความอยาก',
];

export const ADDICTION_COUNSELING_SUGGESTIONS = [
  'ให้คำปรึกษาแบบสั้น (Brief Intervention) เรื่องผลกระทบต่อสุขภาพ',
  'ตั้งเป้าหมายลดปริมาณการดื่มร่วมกับผู้ป่วย',
  'แนะนำครอบครัวเรื่องการเฝ้าระวังอาการถอนสุรา',
];

export const ADDICTION_PLAN_SUGGESTIONS = [
  'กำหนดวันเลิกบุหรี่ (Quit date) ร่วมกับผู้ป่วยภายใน 2 สัปดาห์',
  'ใช้แผ่นแปะนิโคตินร่วมกับการปรับพฤติกรรม',
  'นัดติดตามทุก 1 สัปดาห์ในเดือนแรก',
];

/* ─── Queue session state (cancel / reactivate / check-in) ──────── */

const CANCELLED_KEY = 'mih:addiction:cancelled-queue';
const CHECKED_IN_KEY = 'mih:addiction:checked-in';

/** ยกเลิกคิว — reason required; ผู้ยกเลิก + เวลา recorded (audit). */
export const cancelAddictionQueue = (hn, reason) => {
  const all = readJson(CANCELLED_KEY, {});
  writeJson(CANCELLED_KEY, {
    ...all,
    [hn]: { reason, by: ADDICTION_CURRENT_USER, at: formatAddictionDateTime() },
  });
};

export const reactivateAddictionQueue = (hn) => {
  const all = readJson(CANCELLED_KEY, {});
  const { [hn]: _removed, ...rest } = all;
  writeJson(CANCELLED_KEY, rest);
};

export const getAddictionQueueCancellation = (hn) => readJson(CANCELLED_KEY, {})[hn] || null;

/** ส่งตรวจ — moves a scheduled appointment into today's waiting queue. */
export const checkInAddictionAppointment = (hn) => {
  const list = readJson(CHECKED_IN_KEY, []);
  if (!list.includes(hn)) writeJson(CHECKED_IN_KEY, [...list, hn]);
};

export const getAddictionQueueRows = () => {
  const checkedIn = readJson(CHECKED_IN_KEY, []);
  const extra = ADDICTION_SCHEDULED
    .filter((a) => checkedIn.includes(a.hn))
    .map((a, i) => ({
      queue: `B0${11 + i}`, hn: a.hn, name: a.name, program: a.program,
      sessionNo: a.sessionNo, therapist: a.therapist, arrivalType: 'appointment',
      room: 'ห้อง 1', waitMinutes: 0, statusKey: 'waiting',
      mainSubstance: '', telemedicine: false,
    }));
  return [...ADDICTION_PATIENTS, ...extra];
};

export const getAddictionScheduledNotArrived = () => {
  const checkedIn = readJson(CHECKED_IN_KEY, []);
  return ADDICTION_SCHEDULED.filter((a) => !checkedIn.includes(a.hn));
};

/* ─── Visit record: draft · completed · edit audit ──────────────── */

const DRAFT_KEY = 'mih:addiction:visit-drafts';
const COMPLETED_KEY = 'mih:addiction:completed-visits';
const EDIT_LOG_KEY = 'mih:addiction:edit-log';

export const saveAddictionDraft = (hn, form, stepIndex) => {
  const all = readJson(DRAFT_KEY, {});
  writeJson(DRAFT_KEY, { ...all, [hn]: { form, stepIndex, savedAt: formatAddictionDateTime() } });
};

export const getAddictionDraft = (hn) => readJson(DRAFT_KEY, {})[hn] || null;

export const clearAddictionDraft = (hn) => {
  const all = readJson(DRAFT_KEY, {});
  const { [hn]: _removed, ...rest } = all;
  writeJson(DRAFT_KEY, rest);
};

/** Visit completed this session → reopens read-only (edge case: audit). */
export const markAddictionVisitCompleted = (hn) => {
  const all = readJson(COMPLETED_KEY, {});
  writeJson(COMPLETED_KEY, { ...all, [hn]: { by: ADDICTION_CURRENT_USER, at: formatAddictionDateTime() } });
};

export const getAddictionVisitCompletion = (hn) => readJson(COMPLETED_KEY, {})[hn] || null;

/** แก้ไข after completion — logs ผู้แก้ไข + เวลา (audit trail). */
export const logAddictionVisitEdit = (hn) => {
  const all = readJson(EDIT_LOG_KEY, {});
  const rows = all[hn] || [];
  const entry = { by: ADDICTION_CURRENT_USER, at: formatAddictionDateTime() };
  writeJson(EDIT_LOG_KEY, { ...all, [hn]: [entry, ...rows] });
  return entry;
};

export const getAddictionVisitEditLog = (hn) => readJson(EDIT_LOG_KEY, {})[hn] || [];

/* ─── Prior treatment sessions (Step 4 history + follow-up view) ── */

export const ADDICTION_PRIOR_SESSIONS = {
  '67-00009': [
    { sessionNo: 4, date: '18 กรกฎาคม 2569', activity: 'กลุ่มป้องกันการกลับไปเสพซ้ำ (Relapse Prevention)', urine: 'ไม่พบสาร', therapist: 'พว.กรรณิการ์ แสงอรุณ', note: 'มีส่วนร่วมดี ญาติมาร่วมกิจกรรม' },
    { sessionNo: 3, date: '11 กรกฎาคม 2569', activity: 'กลุ่มทักษะการเลิกยาระยะต้น (Early Recovery Skills)', urine: 'ไม่พบสาร', therapist: 'พว.กรรณิการ์ แสงอรุณ', note: 'ฝึกทักษะปฏิเสธ' },
    { sessionNo: 2, date: '4 กรกฎาคม 2569',  activity: 'กลุ่มครอบครัวศึกษา (Family Education)', urine: 'พบ Methamphetamine', therapist: 'พว.กรรณิการ์ แสงอรุณ', note: 'ยอมรับว่าใช้ซ้ำ 1 ครั้ง ให้เทคนิคจัดการความอยาก' },
    { sessionNo: 1, date: '27 มิถุนายน 2569', activity: 'ให้คำปรึกษารายบุคคล (Individual Counselling)', urine: 'พบ Methamphetamine', therapist: 'พว.กรรณิการ์ แสงอรุณ', note: 'แรกรับ ทำสัญญาใจเข้าโปรแกรม 16 ครั้ง' },
  ],
  '67-00010': [
    { sessionNo: 33, date: '1 สิงหาคม 2569', activity: 'รับยาเมทาโดนรายวัน 60 mg (สยส.3)', urine: '—', therapist: 'นพ.ปกรณ์ จิตอาสา', note: 'ไม่มีอาการถอน' },
    { sessionNo: 32, date: '31 กรกฎาคม 2569', activity: 'รับยาเมทาโดนรายวัน 60 mg (สยส.3)', urine: 'ไม่พบ Opiates', therapist: 'นพ.ปกรณ์ จิตอาสา', note: 'สุ่มตรวจปัสสาวะประจำเดือน' },
  ],
  '67-00012': [
    { sessionNo: 1, date: '21 กรกฎาคม 2569', activity: 'ประเมินความพร้อม + กำหนด Quit date', urine: '—', therapist: 'พว.สุภาพร ใจดี', note: 'แบบประเมิน 2 ได้ 6 คะแนน เริ่มแผ่นแปะนิโคติน' },
  ],
};

export const getAddictionPriorSessions = (hn) => ADDICTION_PRIOR_SESSIONS[hn] || [];

/* ─── Form seed + step completion ───────────────────────────────── */

export const buildAddictionVisitForm = (hn) => {
  const roster = getAddictionQueueRows().find((r) => r.hn === hn) || null;
  const draft = getAddictionDraft(hn);
  if (draft) {
    return { form: draft.form, stepIndex: draft.stepIndex ?? 0, sessionNo: roster?.sessionNo ?? 1, fromDraft: true, draftSavedAt: draft.savedAt };
  }
  return {
    fromDraft: false,
    stepIndex: 0,
    sessionNo: roster?.sessionNo ?? 1,
    form: {
      program: roster?.program || 'matrix',
      /* Step 1 — แรกรับ / ซักประวัติ (manual §2.2.1) */
      illnessHistory: '',
      familyHistory: '',
      drugBehavior: '',
      firstUseAge: '',
      mainSubstance: roster?.mainSubstance || '',
      secondarySubstance: '',
      useMethod: '',
      /* Step 2 — คัดกรอง/แบบประเมิน */
      assistAnswers: {},
      smokingReadiness: {},
      nicotineAnswers: {},
      smokingCauses: {},
      auditAnswers: {},
      psychNote: '',
      socialDiagnosisNote: '',
      /* Step 3 — ตรวจร่างกาย */
      vitals: { bp: '', hr: '', temp: '', weight: '', height: '' },
      physicalNote: '',
      /* Step 4 — กิจกรรมบำบัด */
      matrixActivity: '',
      activityNote: '',
      methadoneDose: '60 mg',
      smokingQuitDate: '',
      smokingPlanNote: '',
      counselingNote: '',
      telemedStatus: 'none',
      /* Step 5 — CPOE */
      drugOrders: {},
      labOrders: {},
      xrayOrders: {},
      orderNote: '',
      /* Step 6 — เอกสาร */
      documents: [],
      /* Step 7 — นัดหมาย */
      appointment: { date: '', time: '', note: '', status: 'none', savedAt: '' },
    },
  };
};

/** Which assessments already carry answers — drives the program-switch
    guard (edge case: program-specific data kept but hidden). */
export const hasProgramAssessmentData = (form) =>
  Object.keys(form.smokingReadiness || {}).length > 0 ||
  Object.keys(form.nicotineAnswers || {}).length > 0 ||
  Object.values(form.smokingCauses || {}).some(Boolean) ||
  Object.keys(form.auditAnswers || {}).length > 0;

/** Required-score validation blocking step advance out of Step 2. */
export const getAssessmentValidationError = (form) => {
  const assistDone = Object.keys(form.assistAnswers || {}).length === ASSIST_QUESTIONS.length;
  if (!assistDone) return 'ยังตอบแบบคัดกรองการใช้สารเสพติด (ASSIST) ไม่ครบทุกข้อ';
  if (form.program === 'smoking') {
    const nicotineDone = Object.keys(form.nicotineAnswers || {}).length === NICOTINE_QUESTIONS.length;
    if (!nicotineDone) return 'ยังตอบแบบประเมิน 2 (การติดสารนิโคติน) ไม่ครบทุกข้อ';
  }
  if (form.program === 'alcohol') {
    const auditDone = Object.keys(form.auditAnswers || {}).length === AUDIT_QUESTIONS.length;
    if (!auditDone) return 'ยังตอบแบบประเมิน AUDIT ไม่ครบทุกข้อ';
  }
  return null;
};

export const getAddictionCompletedSteps = (form, currentStep) => {
  const done = [];
  if (form.illnessHistory || form.drugBehavior) done.push(0);
  if (!getAssessmentValidationError(form)) done.push(1);
  if (form.vitals.bp || form.vitals.weight) done.push(2);
  if (form.matrixActivity || form.activityNote || form.smokingPlanNote || form.counselingNote) done.push(3);
  if (Object.values(form.drugOrders).some(Boolean) || Object.values(form.labOrders).some(Boolean) || Object.values(form.xrayOrders).some(Boolean)) done.push(4);
  if ((form.documents || []).length > 0) done.push(5);
  if (form.appointment.status === 'saved') done.push(6);
  return done.filter((s) => s !== currentStep);
};
