/* rehabVisits.js — mock data + session-scoped state for
   งานเวชศาสตร์ฟื้นฟูและกายภาพบำบัด (TOR §1.10.10).

   Shape and philosophy mirror `ncdVisits.js` / `ancVisits.js` (playbook §3):
   a static roster of realistic Thai BMA-health-center patients (HNs reused
   from `patientProfiles.js` / `mrPatients.js` so PatientCard + MR lookups
   keep resolving) plus sessionStorage-backed helpers that make
   บันทึก / แก้ไข / ยกเลิก / ส่งตรวจ real inside one browser session.

   Clinical vocabulary comes from the legacy HCIS manual
   "คู่มือระบบงานสังคมสงเคราะห์และเวชศาสตร์ฟื้นฟู" §2.3–2.4:
     • บันทึกหัตถการทั่วไป — หัตถการ rows + Treatment & Progress note
       (Chief complaint ดึงจากหน้าซักประวัติ) + annotated body images
     • บันทึกแบบประเมินคนไข้ — the 7 tabs: ข้อมูลการวินิจฉัย (Vital Signs +
       Treatment Course + Diagnosis + Goal), ROM, Motor/Brunnstrom,
       Sensation, Reflex/Pathologic reflex, Barthel, Special test
   The manual's สส.2 / แว่นสายตา / ตรวจการได้ยิน chapters belong to the
   social-work TOR item and are deliberately OUT of scope here. */

/* ─── กลุ่ม/สาเหตุการฟื้นฟู ─────────────────────────────────────── */

export const REHAB_CAUSES = [
  { key: 'stroke',   label: 'โรคหลอดเลือดสมอง (Stroke)',        short: 'Stroke',   badge: 'purple', icd10: 'I69.3', icd10Label: 'I69.3 — Sequelae of cerebral infarction' },
  { key: 'sci',      label: 'บาดเจ็บไขสันหลัง (SCI)',            short: 'SCI',      badge: 'indigo', icd10: 'T91.3', icd10Label: 'T91.3 — Sequelae of injury of spinal cord' },
  { key: 'tbi',      label: 'บาดเจ็บสมอง (TBI)',                 short: 'TBI',      badge: 'red',    icd10: 'S06.9', icd10Label: 'S06.9 — Intracranial injury, unspecified' },
  { key: 'fracture', label: 'กระดูกหัก / หลังผ่าตัดกระดูก',       short: 'Fracture', badge: 'orange', icd10: 'S72.0', icd10Label: 'S72.0 — Fracture of neck of femur' },
  { key: 'tka',      label: 'หลังผ่าตัดเปลี่ยนข้อเข่า (TKA)',     short: 'TKA',      badge: 'teal',   icd10: 'Z96.65', icd10Label: 'Z96.65 — Presence of artificial knee joint' },
  { key: 'lbp',      label: 'ปวดหลังส่วนล่าง (Low back pain)',    short: 'LBP',      badge: 'yellow', icd10: 'M54.5', icd10Label: 'M54.5 — Low back pain' },
  { key: 'frozen',   label: 'ข้อไหล่ติด (Frozen shoulder)',       short: 'Frozen',   badge: 'blue',   icd10: 'M75.0', icd10Label: 'M75.0 — Adhesive capsulitis of shoulder' },
  { key: 'bell',     label: 'อัมพาตใบหน้า (Bell’s palsy)',        short: 'Bell',     badge: 'green',  icd10: 'G51.0', icd10Label: 'G51.0 — Bell’s palsy' },
];

export const resolveRehabCause = (key) => REHAB_CAUSES.find((c) => c.key === key) || null;

/** ประเภทผู้รับบริการ — ทั่วไป vs Intermediate Care (IMC, กรอบ 6 เดือนจาก onset). */
export const REHAB_SERVICE_TYPES = [
  { value: 'general', label: 'ฟื้นฟูทั่วไป' },
  { value: 'imc',     label: 'Intermediate Care (IMC)' },
];

/** ระยะ IMC ตามแนวทาง สปสช. (mock — ทบทวนทางคลินิกก่อนใช้งานจริง). */
export const REHAB_IMC_PHASES = [
  { value: 'phase1', label: 'ระยะที่ 1 — ประคับประคอง/เริ่มฟื้นฟู (0–1 เดือน)' },
  { value: 'phase2', label: 'ระยะที่ 2 — ฟื้นฟูเข้มข้น (1–3 เดือน)' },
  { value: 'phase3', label: 'ระยะที่ 3 — คงสภาพและกลับสู่ชุมชน (3–6 เดือน)' },
];

export const resolveImcPhase = (v) => REHAB_IMC_PHASES.find((p) => p.value === v) || null;

export const REHAB_DISCHARGE_STATUS = [
  { value: 'ongoing',   label: 'อยู่ระหว่างการฟื้นฟู' },
  { value: 'completed', label: 'ครบ Course — บรรลุเป้าหมาย' },
  { value: 'partial',   label: 'ครบ Course — บรรลุบางส่วน' },
  { value: 'refer',     label: 'ส่งต่อหน่วยบริการอื่น' },
  { value: 'defaulted', label: 'ขาดการติดต่อ / ไม่มาตามนัด' },
];

export const resolveDischargeStatus = (v) => REHAB_DISCHARGE_STATUS.find((s) => s.value === v) || null;

export const REHAB_THERAPIST_OPTIONS = [
  'กภ.ณิชาภัทร ธำรงค์',
  'กภ.ศุภกร พูนสวัสดิ์',
  'กภ.พรนภา อินทโชติ',
  'นพ.ธนวัฒน์ เวชศาสตร์ (แพทย์เวชศาสตร์ฟื้นฟู)',
  'พญ.กมลชนก วรกิจ (แพทย์เวชศาสตร์ฟื้นฟู)',
];

export const REHAB_REFER_HOSPITALS = [
  'โรงพยาบาลกลาง',
  'โรงพยาบาลตากสิน',
  'โรงพยาบาลเจริญกรุงประชารักษ์',
  'โรงพยาบาลราชพิพัฒน์',
  'โรงพยาบาลสิรินธร',
  'ไม่มี (Walk-in / ส่งจากคลินิกในศูนย์)',
];

/* ผู้ปฏิบัติงานที่ล็อกอินอยู่ — ใช้ประทับ audit trail (ผู้บันทึก / ผู้แก้ไข /
   ผู้ยกเลิก). ระบบจริงอ่านจาก auth session. */
export const REHAB_CURRENT_USER = { name: 'กภ.ณิชาภัทร ธำรงค์', role: 'นักกายภาพบำบัด' };

/* ─── Date helpers (พ.ศ.) ───────────────────────────────────────── */

export const formatRehabDate = (v) => {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('th-TH-u-ca-buddhist', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
};

export const formatRehabDateTime = (v) => {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(d);
};

export const todayIso = () => new Date().toISOString().slice(0, 10);

/** วันคงเหลือของ golden period IMC (6 เดือนนับจากวันเกิดโรค). */
export const imcGoldenPeriod = (onsetIso) => {
  if (!onsetIso) return null;
  const onset = new Date(`${onsetIso}T00:00:00`);
  if (Number.isNaN(onset.getTime())) return null;
  const deadline = new Date(onset);
  deadline.setMonth(deadline.getMonth() + 6);
  const daysLeft = Math.ceil((deadline.getTime() - new Date(`${todayIso()}T00:00:00`).getTime()) / 86400000);
  return {
    deadlineIso: deadline.toISOString().slice(0, 10),
    daysLeft,
    expired: daysLeft < 0,
  };
};

/* ─── คิววันนี้ (TOR 1.10.10.1 / .2) ─────────────────────────────── */

export const REHAB_PATIENTS = [
  {
    hn: '67-00012', name: 'วิชัย รุ่งเรือง', therapist: 'กภ.ณิชาภัทร ธำรงค์',
    cause: 'stroke', queue: 'R-001', room: 'PT1',
    courseNo: 'C-2569-014', visitNo: 8, courseTotal: 12,
    serviceType: 'imc', statusKey: 'waiting', waitMinutes: 14, visitType: 'followup',
  },
  {
    hn: '67-00018', name: 'ธีรเดช อัครพงศ์', therapist: 'กภ.ศุภกร พูนสวัสดิ์',
    cause: 'lbp', queue: 'R-002', room: 'PT2',
    courseNo: 'C-2569-021', visitNo: 3, courseTotal: 10,
    /* ชำระเอง / สิทธิหมดอายุ — record page แสดง banner เตือนก่อนสั่ง CPOE */
    serviceType: 'general', statusKey: 'progress', waitMinutes: 4, visitType: 'followup', rightsExpired: true,
  },
  {
    hn: '67-00021', name: 'วรรณภา ทองดี', therapist: 'กภ.พรนภา อินทโชติ',
    cause: 'tka', queue: 'R-003', room: 'PT2',
    courseNo: 'C-2569-018', visitNo: 5, courseTotal: 15,
    serviceType: 'general', statusKey: 'waiting', waitMinutes: 22, visitType: 'followup',
  },
  {
    hn: '67-00016', name: 'ปกรณ์ บุญพิทักษ์', therapist: 'นพ.ธนวัฒน์ เวชศาสตร์ (แพทย์เวชศาสตร์ฟื้นฟู)',
    cause: 'sci', queue: 'R-004', room: 'PT1',
    courseNo: 'C-2569-009', visitNo: 11, courseTotal: 20,
    serviceType: 'imc', statusKey: 'waiting', waitMinutes: 9, visitType: 'followup',
    telemedicine: true, telemedTime: '10:30',
  },
  {
    hn: '67-00017', name: 'ภัคจิรา วงศ์อนันต์', therapist: 'กภ.พรนภา อินทโชติ',
    cause: 'frozen', queue: 'R-005', room: 'PT3',
    courseNo: 'C-2569-026', visitNo: 1, courseTotal: 8,
    serviceType: 'general', statusKey: 'waiting', waitMinutes: 6, visitType: 'first',
  },
  {
    hn: '67-00011', name: 'อรอุมา ดวงสว่าง', therapist: 'กภ.ศุภกร พูนสวัสดิ์',
    cause: 'bell', queue: 'R-006', room: 'PT3',
    courseNo: 'C-2569-024', visitNo: 4, courseTotal: 10,
    serviceType: 'general', statusKey: 'done', waitMinutes: 0, visitType: 'followup',
  },
  {
    hn: '67-00020', name: 'กฤษดา ผ่องใส', therapist: 'กภ.ณิชาภัทร ธำรงค์',
    cause: 'fracture', queue: 'R-007', room: 'PT1',
    courseNo: 'C-2569-020', visitNo: 6, courseTotal: 12,
    serviceType: 'general', statusKey: 'draft', waitMinutes: 0, visitType: 'followup',
  },
  {
    hn: '67-00024', name: 'เอกชัย พิทยาคม', therapist: 'พญ.กมลชนก วรกิจ (แพทย์เวชศาสตร์ฟื้นฟู)',
    cause: 'tbi', queue: 'R-008', room: 'PT2',
    courseNo: 'C-2569-011', visitNo: 9, courseTotal: 18,
    serviceType: 'imc', statusKey: 'done', waitMinutes: 0, visitType: 'followup',
    telemedicine: true, telemedTime: '14:00',
  },
];

/** นัดแล้วยังไม่มาติดต่อ — แท็บแยกตาม ANC contract. */
export const REHAB_SCHEDULED_TODAY = [
  {
    hn: '67-00013', name: 'พิมพ์ใจ จันทรา', therapist: 'กภ.พรนภา อินทโชติ',
    appointmentTime: '09:30', clinic: 'PT3', cause: 'lbp',
    serviceType: 'general', visitType: 'followup', courseNo: 'C-2569-027', visitNo: 2,
  },
  {
    hn: '67-00019', name: 'นันทิดา พรเลิศ', therapist: 'กภ.ศุภกร พูนสวัสดิ์',
    appointmentTime: '13:30', clinic: 'PT2', cause: 'fracture',
    serviceType: 'general', visitType: 'followup', courseNo: 'C-2569-025', visitNo: 3,
  },
];

export const getRehabPatientByHn = (hn) =>
  REHAB_PATIENTS.find((p) => p.hn === hn)
  || REHAB_SCHEDULED_TODAY.find((p) => p.hn === hn)
  || null;

/* ─── ทะเบียนผู้รับบริการฟื้นฟู + IMC (TOR 1.10.10.6) ─────────────── */

export const REHAB_REGISTRY_BASE = [
  {
    hn: '67-00012', name: 'วิชัย รุ่งเรือง', cause: 'stroke', icd10: 'I69.3',
    serviceType: 'imc', imcPhase: 'phase2',
    onsetDate: '2026-05-02', admitDate: '2026-05-20', barthelAdmit: 35,
    referHospital: 'โรงพยาบาลกลาง', owner: 'กภ.ณิชาภัทร ธำรงค์',
    courseNo: 'C-2569-014', courseTotal: 12, dischargeStatus: 'ongoing',
    registeredBy: 'กภ.ณิชาภัทร ธำรงค์', registeredAt: '2026-05-20T09:12:00',
  },
  {
    hn: '67-00016', name: 'ปกรณ์ บุญพิทักษ์', cause: 'sci', icd10: 'T91.3',
    serviceType: 'imc', imcPhase: 'phase2',
    onsetDate: '2026-04-11', admitDate: '2026-04-30', barthelAdmit: 20,
    referHospital: 'โรงพยาบาลราชพิพัฒน์', owner: 'นพ.ธนวัฒน์ เวชศาสตร์ (แพทย์เวชศาสตร์ฟื้นฟู)',
    courseNo: 'C-2569-009', courseTotal: 20, dischargeStatus: 'ongoing',
    registeredBy: 'กภ.ศุภกร พูนสวัสดิ์', registeredAt: '2026-04-30T10:41:00',
  },
  {
    hn: '67-00024', name: 'เอกชัย พิทยาคม', cause: 'tbi', icd10: 'S06.9',
    serviceType: 'imc', imcPhase: 'phase3',
    onsetDate: '2026-02-18', admitDate: '2026-03-05', barthelAdmit: 45,
    referHospital: 'โรงพยาบาลสิรินธร', owner: 'พญ.กมลชนก วรกิจ (แพทย์เวชศาสตร์ฟื้นฟู)',
    courseNo: 'C-2569-011', courseTotal: 18, dischargeStatus: 'ongoing',
    registeredBy: 'กภ.พรนภา อินทโชติ', registeredAt: '2026-03-05T13:26:00',
  },
  {
    hn: '67-00021', name: 'วรรณภา ทองดี', cause: 'tka', icd10: 'Z96.65',
    serviceType: 'general', imcPhase: '',
    onsetDate: '2026-06-08', admitDate: '2026-06-22', barthelAdmit: 65,
    referHospital: 'โรงพยาบาลตากสิน', owner: 'กภ.พรนภา อินทโชติ',
    courseNo: 'C-2569-018', courseTotal: 15, dischargeStatus: 'ongoing',
    registeredBy: 'กภ.พรนภา อินทโชติ', registeredAt: '2026-06-22T08:55:00',
  },
  {
    hn: '67-00018', name: 'ธีรเดช อัครพงศ์', cause: 'lbp', icd10: 'M54.5',
    serviceType: 'general', imcPhase: '',
    onsetDate: '2026-06-25', admitDate: '2026-07-10', barthelAdmit: 85,
    referHospital: 'ไม่มี (Walk-in / ส่งจากคลินิกในศูนย์)', owner: 'กภ.ศุภกร พูนสวัสดิ์',
    courseNo: 'C-2569-021', courseTotal: 10, dischargeStatus: 'ongoing',
    registeredBy: 'กภ.ศุภกร พูนสวัสดิ์', registeredAt: '2026-07-10T14:02:00',
  },
  {
    hn: '67-00020', name: 'กฤษดา ผ่องใส', cause: 'fracture', icd10: 'S72.0',
    serviceType: 'general', imcPhase: '',
    onsetDate: '2026-05-29', admitDate: '2026-06-18', barthelAdmit: 55,
    referHospital: 'โรงพยาบาลเจริญกรุงประชารักษ์', owner: 'กภ.ณิชาภัทร ธำรงค์',
    courseNo: 'C-2569-020', courseTotal: 12, dischargeStatus: 'ongoing',
    registeredBy: 'กภ.ณิชาภัทร ธำรงค์', registeredAt: '2026-06-18T11:33:00',
  },
  {
    hn: '67-00011', name: 'อรอุมา ดวงสว่าง', cause: 'bell', icd10: 'G51.0',
    serviceType: 'general', imcPhase: '',
    onsetDate: '2026-06-30', admitDate: '2026-07-04', barthelAdmit: 95,
    referHospital: 'ไม่มี (Walk-in / ส่งจากคลินิกในศูนย์)', owner: 'กภ.ศุภกร พูนสวัสดิ์',
    courseNo: 'C-2569-024', courseTotal: 10, dischargeStatus: 'ongoing',
    registeredBy: 'กภ.ศุภกร พูนสวัสดิ์', registeredAt: '2026-07-04T09:20:00',
  },
  {
    hn: '67-00017', name: 'ภัคจิรา วงศ์อนันต์', cause: 'frozen', icd10: 'M75.0',
    serviceType: 'general', imcPhase: '',
    onsetDate: '2026-07-15', admitDate: '2026-08-08', barthelAdmit: 90,
    referHospital: 'ไม่มี (Walk-in / ส่งจากคลินิกในศูนย์)', owner: 'กภ.พรนภา อินทโชติ',
    courseNo: 'C-2569-026', courseTotal: 8, dischargeStatus: 'ongoing',
    registeredBy: 'กภ.พรนภา อินทโชติ', registeredAt: '2026-08-08T08:31:00',
  },
  {
    hn: '67-00013', name: 'พิมพ์ใจ จันทรา', cause: 'lbp', icd10: 'M54.5',
    serviceType: 'general', imcPhase: '',
    onsetDate: '2026-07-02', admitDate: '2026-07-21', barthelAdmit: 90,
    referHospital: 'ไม่มี (Walk-in / ส่งจากคลินิกในศูนย์)', owner: 'กภ.พรนภา อินทโชติ',
    courseNo: 'C-2569-027', courseTotal: 8, dischargeStatus: 'ongoing',
    registeredBy: 'กภ.พรนภา อินทโชติ', registeredAt: '2026-07-21T15:44:00',
  },
  {
    hn: '67-00019', name: 'นันทิดา พรเลิศ', cause: 'fracture', icd10: 'S72.0',
    serviceType: 'general', imcPhase: '',
    onsetDate: '2026-06-05', admitDate: '2026-06-27', barthelAdmit: 60,
    referHospital: 'โรงพยาบาลตากสิน', owner: 'กภ.ศุภกร พูนสวัสดิ์',
    courseNo: 'C-2569-025', courseTotal: 12, dischargeStatus: 'ongoing',
    registeredBy: 'กภ.ศุภกร พูนสวัสดิ์', registeredAt: '2026-06-27T10:07:00',
  },
  {
    /* จำหน่ายแล้ว — ทะเบียนยังอยู่ในระบบเพื่อดูประวัติย้อนหลัง */
    hn: '67-00014', name: 'ชัยวัฒน์ ก้องเกียรติ', cause: 'stroke', icd10: 'I69.3',
    serviceType: 'imc', imcPhase: 'phase3',
    onsetDate: '2025-10-12', admitDate: '2025-11-03', barthelAdmit: 40,
    referHospital: 'โรงพยาบาลกลาง', owner: 'กภ.ณิชาภัทร ธำรงค์',
    courseNo: 'C-2568-088', courseTotal: 20, dischargeStatus: 'completed',
    registeredBy: 'กภ.ณิชาภัทร ธำรงค์', registeredAt: '2025-11-03T09:02:00',
  },
];

/* ─── Session-scoped persistence ────────────────────────────────── */

const canUseSessionStorage = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const readJson = (key, fallback) => {
  if (!canUseSessionStorage()) return fallback;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(key) || 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.setItem(key, JSON.stringify(value));
};

const REGISTRY_OVERRIDE_KEY = 'mih:rehab-registry-overrides';  // hn -> { fields, editHistory }
const REGISTRY_ADDED_KEY    = 'mih:rehab-registry-added';      // hn -> full row
const CANCELLED_KEY         = 'mih:rehab-cancelled-registry';  // hn -> { reason, cancelledBy, cancelledAt }
const CHECKED_IN_KEY        = 'mih:rehab-checked-in-today';    // hn -> true
const VISIT_STATUS_KEY      = 'mih:rehab-visit-status';        // hn -> { statusKey, by, at, reason? }
const VISIT_HISTORY_KEY     = 'mih:rehab-visit-history';       // hn -> [records]
const USER_ROLE_KEY         = 'mih:rehab-user-role';           // 'edit' (default) | 'view'
const APPOINTMENT_KEY       = 'mih:rehab-appointments';        // hn -> appointment record

/** สิทธิ์ผู้ใช้ — read-only mode (playbook §5). ตั้ง
    sessionStorage['mih:rehab-user-role'] = '"view"' เพื่อทดสอบ view-only. */
export const canEditRehab = () => readJson(USER_ROLE_KEY, 'edit') !== 'view';

/* ── ทะเบียน: แสดง / บันทึก / แก้ไข / ยกเลิก + เปิดใช้งานใหม่ ────── */

export const getRehabRegistryRows = () => {
  const overrides = readJson(REGISTRY_OVERRIDE_KEY, {});
  const added = readJson(REGISTRY_ADDED_KEY, {});
  const apply = (row) => {
    const o = overrides[row.hn];
    return o ? { ...row, ...o.fields, editHistory: o.editHistory || [] } : { ...row, editHistory: [] };
  };
  return [...REHAB_REGISTRY_BASE.map(apply), ...Object.values(added).map(apply)];
};

export const getRehabRegistrationByHn = (hn) =>
  getRehabRegistryRows().find((r) => r.hn === hn) || null;

/** ขึ้นทะเบียนใหม่ (TOR 1.10.10.6 "บันทึก") — ประทับ audit จากผู้ใช้ที่ล็อกอิน. */
export const addRehabRegistration = (row) => {
  if (!row?.hn) return;
  const added = readJson(REGISTRY_ADDED_KEY, {});
  added[row.hn] = {
    ...row,
    registeredBy: REHAB_CURRENT_USER.name,
    registeredAt: new Date().toISOString(),
  };
  writeJson(REGISTRY_ADDED_KEY, added);
};

/** แก้ไขทะเบียน — เก็บ diff ต่อครั้งเพื่อให้ audit panel แสดงค่าที่เปลี่ยน. */
export const updateRehabRegistration = (hn, fields, changesLabel) => {
  if (!hn) return;
  const overrides = readJson(REGISTRY_OVERRIDE_KEY, {});
  const prev = overrides[hn] || { fields: {}, editHistory: [] };
  overrides[hn] = {
    fields: { ...prev.fields, ...fields },
    editHistory: [
      ...(prev.editHistory || []),
      { by: REHAB_CURRENT_USER.name, at: new Date().toISOString(), changes: changesLabel || 'แก้ไขข้อมูลทะเบียน' },
    ],
  };
  writeJson(REGISTRY_OVERRIDE_KEY, overrides);
};

/** ยกเลิกทะเบียน — ต้องมีเหตุผล, ย้อนกลับได้, แถวยังแสดงพร้อม badge. */
export const cancelRehabRegistration = (hn, reason) => {
  if (!hn) return;
  const store = readJson(CANCELLED_KEY, {});
  store[hn] = {
    reason: reason || 'ไม่ระบุเหตุผล',
    cancelledBy: REHAB_CURRENT_USER.name,
    cancelledAt: new Date().toISOString(),
  };
  writeJson(CANCELLED_KEY, store);
};

export const reactivateRehabRegistration = (hn) => {
  if (!hn) return;
  const store = readJson(CANCELLED_KEY, {});
  delete store[hn];
  writeJson(CANCELLED_KEY, store);
};

export const getRehabCancellation = (hn) => readJson(CANCELLED_KEY, {})[hn] || null;

/* ── นัดหมายต่อเนื่องใน Course (TOR 1.10.10.5) ──────────────────── */

export const REHAB_SLOT_MINUTES = 30;

export const rehabSlotRange = (time) => {
  if (!time || !/^\d{1,2}:\d{2}$/.test(time)) return '';
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + REHAB_SLOT_MINUTES;
  const eh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const em = String(total % 60).padStart(2, '0');
  return `${time}-${eh}:${em}`;
};

export const getRehabAppointment = (hn) => (hn ? readJson(APPOINTMENT_KEY, {})[hn] || null : null);

export const getRehabBookedAppointments = (includeCancelled = false) =>
  Object.values(readJson(APPOINTMENT_KEY, {}))
    .filter((a) => includeCancelled || a.status !== 'cancelled')
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

/** บันทึก/แก้ไขนัดหมาย — เขียนครั้งแรกประทับผู้บันทึก, ครั้งถัดไปประทับผู้แก้ไข. */
export const saveRehabAppointment = (hn, appt) => {
  if (!hn) return null;
  const store = readJson(APPOINTMENT_KEY, {});
  const prev = store[hn];
  const now = new Date().toISOString();
  const record = {
    ...(prev || {}),
    ...appt,
    hn,
    id: prev?.id || `A-REHAB-${hn}-${Date.now()}`,
    status: 'active',
    createdBy: prev?.createdBy || REHAB_CURRENT_USER.name,
    createdAt: prev?.createdAt || now,
    ...(prev ? { updatedBy: REHAB_CURRENT_USER.name, updatedAt: now } : {}),
    cancelledBy: undefined, cancelledAt: undefined, cancelReason: undefined,
  };
  store[hn] = record;
  writeJson(APPOINTMENT_KEY, store);
  return record;
};

/** ยกเลิกนัดหมาย — ต้องมีเหตุผล, แถวถูกเก็บไว้ (ไม่ลบ) เพื่อ audit trail. */
export const cancelRehabAppointment = (hn, reason) => {
  if (!hn) return null;
  const store = readJson(APPOINTMENT_KEY, {});
  const prev = store[hn];
  if (!prev) return null;
  const record = {
    ...prev,
    status: 'cancelled',
    cancelReason: reason || 'ไม่ระบุเหตุผล',
    cancelledBy: REHAB_CURRENT_USER.name,
    cancelledAt: new Date().toISOString(),
  };
  store[hn] = record;
  writeJson(APPOINTMENT_KEY, store);
  return record;
};

export const REHAB_APPOINTMENT_TIMES = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
];

export const REHAB_BOOKED_SLOTS = [
  { date: '2026-08-11', time: '09:00' },
  { date: '2026-08-11', time: '13:30' },
  { date: '2026-08-18', time: '10:00' },
];

export const isRehabSlotBooked = (dateIso, time, exceptHn) => {
  if (!dateIso || !time) return false;
  if (REHAB_BOOKED_SLOTS.some((s) => s.date === dateIso && s.time === time)) return true;
  return getRehabBookedAppointments().some(
    (a) => a.date === dateIso && a.time === time && a.hn !== exceptHn,
  );
};

/* ── ส่งตรวจ (check-in) + สถานะรายวิสิต ─────────────────────────── */

export const checkInRehabAppointment = (hn) => {
  if (!hn) return;
  const store = readJson(CHECKED_IN_KEY, {});
  store[hn] = true;
  writeJson(CHECKED_IN_KEY, store);
};

/** นัดที่จองจากหน้าบันทึกและวันนัดตรงกับวันนี้ — shape เดียวกับ
    REHAB_SCHEDULED_TODAY เพื่อให้แท็บ "นัดแล้วยังไม่มาติดต่อ" ส่งตรวจได้. */
export const getRehabBookedScheduledToday = () => {
  const today = todayIso();
  return getRehabBookedAppointments()
    .filter((a) => a.date === today)
    .map((a) => ({
      hn: a.hn,
      name: a.patient || a.hn,
      therapist: a.therapist || '—',
      appointmentTime: a.time || '—',
      clinic: a.mode === 'telemedicine' ? 'Telemedicine' : 'PT',
      cause: a.cause || '',
      serviceType: a.serviceType || 'general',
      visitType: 'followup',
      courseNo: a.courseNo || '',
      visitNo: a.visitNo || null,
      fromRecord: true,
    }));
};

export const getRehabScheduledNotArrived = () => {
  const checkedIn = readJson(CHECKED_IN_KEY, {});
  const seen = new Set();
  return [...REHAB_SCHEDULED_TODAY, ...getRehabBookedScheduledToday()].filter((p) => {
    if (checkedIn[p.hn] || seen.has(p.hn)) return false;
    seen.add(p.hn);
    return true;
  });
};

export const setRehabVisitStatus = (hn, statusKey, extra = {}) => {
  if (!hn) return;
  const store = readJson(VISIT_STATUS_KEY, {});
  store[hn] = { statusKey, by: REHAB_CURRENT_USER.name, at: new Date().toISOString(), ...extra };
  writeJson(VISIT_STATUS_KEY, store);
};

export const getRehabVisitStatus = (hn) => readJson(VISIT_STATUS_KEY, {})[hn] || null;

export const getRehabQueueRows = () => {
  const checkedIn = readJson(CHECKED_IN_KEY, {});
  const statusStore = readJson(VISIT_STATUS_KEY, {});
  const alreadyQueued = new Set(REHAB_PATIENTS.map((p) => p.hn));
  const seen = new Set();
  const checkedInRows = [...REHAB_SCHEDULED_TODAY, ...getRehabBookedScheduledToday()]
    .filter((p) => {
      if (!checkedIn[p.hn] || alreadyQueued.has(p.hn) || seen.has(p.hn)) return false;
      seen.add(p.hn);
      return true;
    })
    .map((p, idx) => ({
      ...p,
      queue: `W-${String(idx + 1).padStart(3, '0')}`,
      room: p.clinic,
      statusKey: 'waiting',
      waitMinutes: 0,
      courseTotal: getRehabRegistrationByHn(p.hn)?.courseTotal || null,
    }));
  const today = todayIso();
  return [...REHAB_PATIENTS, ...checkedInRows].map((row) => {
    const o = statusStore[row.hn];
    const withStatus = o && o.statusKey !== 'cancelled' ? { ...row, statusKey: o.statusKey } : { ...row };
    /* TelemedicineQueueBadge ต้องการเวลานัดจริงเพื่อคำนวณสถานะ
       early / countdown / due / overdue — ผูกกับวันนี้เสมอ ไม่ hardcode วันที่ */
    if (withStatus.telemedicine && withStatus.telemedTime) {
      withStatus.telemedAppointmentAt = `${today}T${withStatus.telemedTime}:00`;
    }
    return withStatus;
  });
};

/* ─── แบบประเมิน Barthel ADL Index (แทบ "Barthel" ของคู่มือเดิม) ────
   Classic 10-item Barthel, 0–100 คะแนน (ขั้นละ 5). */

export const BARTHEL_ITEMS = [
  {
    key: 'feeding', label: 'การรับประทานอาหาร (Feeding)',
    options: [
      { score: 0,  label: 'ทำเองไม่ได้ ต้องป้อนทั้งหมด' },
      { score: 5,  label: 'ต้องช่วยหั่น/ตักบางส่วน' },
      { score: 10, label: 'ทำเองได้ทั้งหมด' },
    ],
  },
  {
    key: 'bathing', label: 'การอาบน้ำ (Bathing)',
    options: [
      { score: 0, label: 'ต้องมีคนช่วย' },
      { score: 5, label: 'ทำเองได้ทั้งหมด' },
    ],
  },
  {
    key: 'grooming', label: 'การดูแลความสะอาดใบหน้า-ฟัน-ผม (Grooming)',
    options: [
      { score: 0, label: 'ต้องมีคนช่วย' },
      { score: 5, label: 'ทำเองได้' },
    ],
  },
  {
    key: 'dressing', label: 'การสวมใส่เสื้อผ้า (Dressing)',
    options: [
      { score: 0,  label: 'ทำเองไม่ได้' },
      { score: 5,  label: 'ทำได้บางส่วน ต้องช่วย' },
      { score: 10, label: 'ทำเองได้ทั้งหมด (รวมติดกระดุม/รูดซิป)' },
    ],
  },
  {
    key: 'bowels', label: 'การกลั้นอุจจาระ (Bowels)',
    options: [
      { score: 0,  label: 'กลั้นไม่ได้ / ต้องสวน' },
      { score: 5,  label: 'กลั้นไม่ได้บางครั้ง (≤1 ครั้ง/สัปดาห์)' },
      { score: 10, label: 'กลั้นได้ปกติ' },
    ],
  },
  {
    key: 'bladder', label: 'การกลั้นปัสสาวะ (Bladder)',
    options: [
      { score: 0,  label: 'กลั้นไม่ได้ / คาสายสวน' },
      { score: 5,  label: 'กลั้นไม่ได้บางครั้ง (≤1 ครั้ง/วัน)' },
      { score: 10, label: 'กลั้นได้ปกติ' },
    ],
  },
  {
    key: 'toilet', label: 'การใช้ห้องน้ำ (Toilet use)',
    options: [
      { score: 0,  label: 'ทำเองไม่ได้' },
      { score: 5,  label: 'ต้องมีคนช่วยบางส่วน' },
      { score: 10, label: 'ทำเองได้ทั้งหมด' },
    ],
  },
  {
    key: 'transfer', label: 'การเคลื่อนย้ายตัว เตียง↔เก้าอี้ (Transfer)',
    options: [
      { score: 0,  label: 'ทำไม่ได้ ไม่สามารถนั่งทรงตัว' },
      { score: 5,  label: 'ต้องใช้คนช่วย 1–2 คน' },
      { score: 10, label: 'ต้องช่วยเล็กน้อย / มีคนคอยดูแล' },
      { score: 15, label: 'ทำเองได้ทั้งหมด' },
    ],
  },
  {
    key: 'mobility', label: 'การเคลื่อนที่บนพื้นราบ (Mobility)',
    options: [
      { score: 0,  label: 'เคลื่อนที่ไม่ได้' },
      { score: 5,  label: 'ใช้รถเข็นได้เองบนพื้นราบ' },
      { score: 10, label: 'เดินได้โดยมีคนช่วย/พยุง' },
      { score: 15, label: 'เดินเองได้ (ใช้อุปกรณ์ช่วยได้)' },
    ],
  },
  {
    key: 'stairs', label: 'การขึ้น-ลงบันได (Stairs)',
    options: [
      { score: 0,  label: 'ทำไม่ได้' },
      { score: 5,  label: 'ต้องมีคนช่วย/พยุง' },
      { score: 10, label: 'ขึ้น-ลงเองได้' },
    ],
  },
];

export const BARTHEL_MAX = BARTHEL_ITEMS.reduce(
  (sum, item) => sum + Math.max(...item.options.map((o) => o.score)),
  0,
);

/** ระดับการพึ่งพา — ใช้กับ badge บนแบบประเมินและหน้าติดตาม. */
export const barthelDependency = (total) => {
  if (total == null) return { key: 'unknown', label: 'ยังไม่ได้ประเมิน', badge: 'grey' };
  if (total >= 100) return { key: 'independent', label: 'ช่วยเหลือตนเองได้ทั้งหมด', badge: 'green' };
  if (total >= 91)  return { key: 'slight',      label: 'พึ่งพาเล็กน้อย',        badge: 'teal' };
  if (total >= 61)  return { key: 'moderate',    label: 'พึ่งพาปานกลาง',         badge: 'yellow' };
  if (total >= 21)  return { key: 'severe',      label: 'พึ่งพามาก',             badge: 'orange' };
  return { key: 'total', label: 'พึ่งพาทั้งหมด', badge: 'red' };
};

/** รวมคะแนน Barthel — คืน { total, answered, complete } ไม่เดาคะแนนที่ยัง
    ไม่ตอบ (spec: partial = เตือน ไม่ใช่ 0 ปลอม). */
export const scoreBarthel = (answers = {}) => {
  let total = 0;
  let answered = 0;
  BARTHEL_ITEMS.forEach((item) => {
    const v = answers[item.key];
    if (typeof v === 'number') {
      total += v;
      answered += 1;
    }
  });
  return { total, answered, complete: answered === BARTHEL_ITEMS.length };
};

/* ─── ตรวจร่างกาย 7 แทบ (คู่มือเดิม §2.4) ──────────────────────── */

export const ROM_JOINT_OPTIONS = [
  'Shoulder', 'Elbow', 'Wrist', 'Hip', 'Knee', 'Ankle', 'Cervical spine', 'Lumbar spine', 'Finger', 'Trunk',
];

export const ROM_MOTION_OPTIONS = [
  'Flexion', 'Extension', 'Abduction', 'Adduction',
  'Internal rotation', 'External rotation', 'Supination', 'Pronation',
  'Dorsiflexion', 'Plantar flexion', 'Lateral bending',
];

/** Manual Muscle Testing grade 0–5 (Oxford scale). */
export const MUSCLE_GRADE_OPTIONS = [
  { value: '0', label: '0 — ไม่มีการหดตัวของกล้ามเนื้อ' },
  { value: '1', label: '1 — มีการหดตัวแต่ไม่เกิดการเคลื่อนไหว' },
  { value: '2', label: '2 — เคลื่อนไหวได้เมื่อไม่มีแรงโน้มถ่วง' },
  { value: '3', label: '3 — ต้านแรงโน้มถ่วงได้' },
  { value: '4', label: '4 — ต้านแรงต้านได้บางส่วน' },
  { value: '5', label: '5 — ปกติ' },
];

export const MUSCLE_GROUP_OPTIONS = [
  'Shoulder flexor', 'Shoulder abductor', 'Elbow flexor', 'Elbow extensor',
  'Wrist extensor', 'Grip', 'Hip flexor', 'Knee extensor', 'Ankle dorsiflexor', 'Trunk control',
];

/** Brunnstrom recovery stage I–VI (Arm / Hand / Leg). */
export const BRUNNSTROM_STAGES = [
  { value: 'I',   label: 'Stage I — Flaccid ไม่มีการเคลื่อนไหว' },
  { value: 'II',  label: 'Stage II — เริ่มมี synergy / spasticity' },
  { value: 'III', label: 'Stage III — Synergy เต็มรูปแบบ spasticity สูงสุด' },
  { value: 'IV',  label: 'Stage IV — เริ่มเคลื่อนไหวนอก synergy' },
  { value: 'V',   label: 'Stage V — เคลื่อนไหวอิสระมากขึ้น' },
  { value: 'VI',  label: 'Stage VI — เกือบปกติ ประสานงานดี' },
];

export const BRUNNSTROM_PARTS = [
  { key: 'arm',  label: 'Arm (แขน)' },
  { key: 'hand', label: 'Hand (มือ)' },
  { key: 'leg',  label: 'Leg (ขา)' },
];

export const SENSATION_TYPE_OPTIONS = [
  'Light touch', 'Pin prick', 'Temperature', 'Vibration', 'Proprioception', 'Two-point discrimination',
];

export const SENSATION_RESULT_OPTIONS = [
  { value: 'normal',  label: 'ปกติ (Intact)' },
  { value: 'impaired', label: 'ลดลง (Impaired)' },
  { value: 'absent',  label: 'ไม่รับรู้ (Absent)' },
];

export const REFLEX_OPTIONS = ['Biceps', 'Triceps', 'Brachioradialis', 'Knee jerk', 'Ankle jerk'];

export const PATHOLOGIC_REFLEX_OPTIONS = ['Babinski', 'Hoffmann', 'Clonus', 'Chaddock'];

export const REFLEX_GRADE_OPTIONS = [
  { value: '0',  label: '0 — ไม่มี reflex' },
  { value: '1+', label: '1+ — ลดลง' },
  { value: '2+', label: '2+ — ปกติ' },
  { value: '3+', label: '3+ — ไวกว่าปกติ' },
  { value: '4+', label: '4+ — ไวมากร่วมกับ clonus' },
];

export const PATHOLOGIC_RESULT_OPTIONS = [
  { value: 'negative', label: 'Negative (ไม่พบ)' },
  { value: 'positive', label: 'Positive (พบ)' },
];

export const SPECIAL_TEST_OPTIONS = [
  'Straight leg raising (SLR)', 'Phalen test', 'Tinel sign', 'Neer test',
  'Hawkins–Kennedy test', 'Lachman test', 'McMurray test', 'Thomas test', 'FABER test',
];

export const SPECIAL_TEST_RESULT_OPTIONS = [
  { value: 'negative', label: 'Negative' },
  { value: 'positive', label: 'Positive' },
  { value: 'nt',       label: 'Not tested' },
];

export const SIDE_OPTIONS = [
  { value: 'right', label: 'ขวา (Right)' },
  { value: 'left',  label: 'ซ้าย (Left)' },
  { value: 'both',  label: 'ทั้งสองข้าง' },
];

/* ─── โปรแกรมฟื้นฟู + หัตถการ (คู่มือเดิม §2.3) ────────────────── */

export const REHAB_PROGRAM_ACTIVITIES = [
  { key: 'hotpack',    label: 'Hot pack (ประคบร้อน)' },
  { key: 'coldpack',   label: 'Cold pack (ประคบเย็น)' },
  { key: 'ultrasound', label: 'Ultrasound therapy' },
  { key: 'tens',       label: 'TENS (กระตุ้นไฟฟ้าระงับปวด)' },
  { key: 'es',         label: 'Electrical stimulation (กระตุ้นกล้ามเนื้อ)' },
  { key: 'traction',   label: 'Traction (ดึงคอ/หลัง)' },
  { key: 'exercise',   label: 'Exercise therapy (ออกกำลังกายบำบัด)' },
  { key: 'gait',       label: 'Gait training (ฝึกเดิน)' },
  { key: 'adl',        label: 'ADL training (ฝึกกิจวัตรประจำวัน)' },
  { key: 'chest',      label: 'Chest physical therapy' },
  { key: 'mobilize',   label: 'Joint mobilization / manual therapy' },
  { key: 'speech',     label: 'Speech / swallowing training' },
];

export const resolveRehabActivity = (key) => REHAB_PROGRAM_ACTIVITIES.find((a) => a.key === key) || null;

export const REHAB_FREQUENCY_OPTIONS = [
  { value: '1', label: '1 ครั้ง/สัปดาห์' },
  { value: '2', label: '2 ครั้ง/สัปดาห์' },
  { value: '3', label: '3 ครั้ง/สัปดาห์' },
  { value: '5', label: '5 ครั้ง/สัปดาห์' },
];

/* ─── ค่าเริ่มต้นของฟอร์มบันทึก (RehabFormPage) ─────────────────── */

export const REHAB_DEFAULT_VITALS = { bp: '128/78', hr: 76, temp: 36.5, rr: 18, spo2: 98, weight: 64.0, height: 165 };

export const DEFAULT_REHAB_VISIT = {
  // Step 1 — ประวัติและผลการซักประวัติ (TOR 1.10.10.3)
  chiefComplaint: '',           // ดึงจากหน้าซักประวัติ (read-only seed)
  screeningNote: '',
  historyNote: '',

  // Step 2 — ตรวจร่างกาย (7 แทบตามคู่มือเดิม)
  vitals: { ...REHAB_DEFAULT_VITALS },
  examTab: 'rom',
  romRows: [],                  // { id, joint, motion, right, left, note }
  muscleRows: [],               // { id, group, side, grade, note }
  brunnstrom: {},               // { arm, hand, leg }
  sensationRows: [],            // { id, type, area, side, result }
  reflexRows: [],               // { id, reflex, side, grade }
  pathologicRows: [],           // { id, reflex, side, result }
  specialTestRows: [],          // { id, test, side, result, note }
  examNote: '',
  bodyMarkers: {},              // BodyDiagramPanel markers — keyed by body system (per-system slots)
  bodyDrawings: {},             // BodyDiagramPanel pen strokes — keyed by body system

  // Step 3 — ประเมิน ADLs (Barthel)
  barthel: {},                  // { [itemKey]: score }
  barthelNote: '',

  // Step 4 — วินิจฉัยและเป้าหมาย + Treatment Course
  diagnosisNote: '',
  icd10: '',
  goals: [],                    // { id, text, target, achieved }
  courseNo: '',
  assessDate: '',
  dischargeStatus: 'ongoing',
  courseSummary: '',

  // Step 5 — โปรแกรมฟื้นฟู + หัตถการ + CPOE
  programActivities: {},        // { [activityKey]: true }
  programFrequency: '',
  programWeeks: '',
  programNote: '',
  procedureRows: [],            // { id, name, performer, time, note, cancelled? }
  // Step5Orders (CPOE) contract — shared with TreatmentSteps
  orderCategory: 'medication',
  medications: [],
  labs: [],
  xrayOrders: [],
  procedureOrders: [],
  consultOrders: [],
  showAllergyAlert: true,

  // Step 6 — เอกสารแนบ (TOR 1.10.10.4)
  attachments: [],              // { id, name, sizeLabel, type, addedAt }

  // Step 7 — นัดหมายต่อเนื่อง (TOR 1.10.10.5)
  appointment: {
    date: '', time: '',
    mode: 'onsite',
    therapist: '',
    note: '',
    skipped: false,
  },
};

const hasText = (v) => typeof v === 'string' && v.trim() !== '';

/** Array of 7 booleans สำหรับเครื่องหมายถูกบน stepper. */
export const getRehabCompletedSteps = (form, stepIndex = 0) => {
  const barthel = scoreBarthel(form?.barthel);
  return [
    stepIndex > 0 || hasText(form?.historyNote),
    (form?.romRows || []).length > 0
      || (form?.muscleRows || []).length > 0
      || (form?.sensationRows || []).length > 0
      || (form?.specialTestRows || []).length > 0
      || hasText(form?.examNote),
    barthel.complete,
    hasText(form?.diagnosisNote) && !!form?.icd10,
    Object.values(form?.programActivities || {}).some(Boolean)
      || (form?.procedureRows || []).length > 0,
    stepIndex > 5,
    !!form?.appointment?.date || !!form?.appointment?.skipped,
  ];
};

/* ─── บันทึกการรับบริการ (การติดตาม TOR 1.10.10.8) ──────────────── */

/** Upsert ตาม recordId — ยืนยันซ้ำ (หรือ ยืนยัน → แก้ไข → ยืนยัน) อัปเดต
    แถวเดิมแทนการเพิ่มวิสิตซ้ำในกราฟติดตาม. */
export const saveRehabVisitRecord = (hn, record) => {
  if (!hn) return;
  const store = readJson(VISIT_HISTORY_KEY, {});
  const list = store[hn] || [];
  const idx = record?.recordId ? list.findIndex((r) => r.recordId === record.recordId) : -1;
  store[hn] = idx >= 0
    ? list.map((r, i) => (i === idx ? { ...r, ...record } : r))
    : [...list, record];
  writeJson(VISIT_HISTORY_KEY, store);
};

/* ชุดข้อมูลติดตามแบบ static — 1 แถวต่อครั้งที่รับบริการ.
   `lab` / `xray` เป็น mock ในไฟล์นี้เท่านั้น (ไม่ import จากโมดูล lab/xray —
   กติกาขอบเขตไฟล์ playbook §4). `romKnee` / `romShoulder` เป็นองศาที่วัดได้
   จริงในวันนั้น (null = ไม่ได้วัดครั้งนั้น). */
export const REHAB_FOLLOWUP_VISITS = {
  '67-00012': [
    { date: '2026-05-20', visitNo: 1, type: 'ประเมินแรกรับ', bp: '148/90', pulse: 84, barthel: 35, romShoulder: 70, romKnee: 95, muscleGrade: 2, exam: 'Brunnstrom Arm II / Leg III · MMT ซีกขวา 2/5', lab: 'CBC, BUN/Cr — ปกติ', xray: 'CT brain — old infarct MCA ซ้าย', note: 'เริ่มโปรแกรม IMC ระยะที่ 1', therapist: 'กภ.ณิชาภัทร ธำรงค์' },
    { date: '2026-06-03', visitNo: 2, type: 'ฟื้นฟูตามนัด', bp: '142/88', pulse: 82, barthel: 40, romShoulder: 80, romKnee: 100, muscleGrade: 2, exam: 'ฝึก sitting balance ได้ 5 นาที', lab: null, xray: null, note: 'Hot pack + PROM + bed mobility', therapist: 'กภ.ณิชาภัทร ธำรงค์' },
    { date: '2026-06-17', visitNo: 3, type: 'ฟื้นฟูตามนัด', bp: '138/86', pulse: 80, barthel: 50, romShoulder: 95, romKnee: 105, muscleGrade: 3, exam: 'Brunnstrom Arm III / Leg IV · standing with support', lab: null, xray: null, note: 'เริ่ม gait training ด้วย walker', therapist: 'กภ.ณิชาภัทร ธำรงค์' },
    { date: '2026-07-01', visitNo: 4, type: 'ฟื้นฟูตามนัด', bp: '136/84', pulse: 78, barthel: 55, romShoulder: 105, romKnee: 110, muscleGrade: 3, exam: 'เดินด้วย walker ได้ 10 เมตร', lab: 'FBS 118 mg/dL', xray: null, note: 'เพิ่ม ADL training — แต่งตัวท่อนบน', therapist: 'กภ.ณิชาภัทร ธำรงค์' },
    { date: '2026-07-15', visitNo: 5, type: 'Telemedicine', bp: null, pulse: null, barthel: 60, romShoulder: null, romKnee: null, muscleGrade: null, exam: 'ติดตามทางไกล — ญาติรายงานเดินในบ้านได้เอง', lab: null, xray: null, note: 'ทบทวนท่าออกกำลังกายที่บ้าน', therapist: 'กภ.ณิชาภัทร ธำรงค์' },
    { date: '2026-07-29', visitNo: 6, type: 'ฟื้นฟูตามนัด', bp: '134/82', pulse: 78, barthel: 65, romShoulder: 120, romKnee: 115, muscleGrade: 4, exam: 'เดินด้วยไม้เท้า 4 ขา 30 เมตร', lab: null, xray: null, note: 'ประเมิน Barthel เพิ่มขึ้น 30 คะแนนจากแรกรับ', therapist: 'กภ.ณิชาภัทร ธำรงค์' },
    { date: '2026-08-05', visitNo: 7, type: 'ฟื้นฟูตามนัด', bp: '132/80', pulse: 76, barthel: 70, romShoulder: 130, romKnee: 120, muscleGrade: 4, exam: 'ขึ้น-ลงบันได 5 ขั้นโดยมีคนดูแล', lab: 'Lipid profile — LDL 118', xray: null, note: 'เข้าสู่ระยะที่ 3 เตรียมกลับสู่ชุมชน', therapist: 'กภ.ณิชาภัทร ธำรงค์' },
  ],
  '67-00016': [
    { date: '2026-04-30', visitNo: 1, type: 'ประเมินแรกรับ', bp: '118/74', pulse: 72, barthel: 20, romShoulder: 90, romKnee: 80, muscleGrade: 1, exam: 'Incomplete SCI ระดับ T10 · MMT ขาทั้งสองข้าง 1/5', lab: 'UA — no infection', xray: 'MRI T-spine — cord contusion T10', note: 'เริ่ม IMC ระยะที่ 1 · คาสายสวนปัสสาวะ', therapist: 'นพ.ธนวัฒน์ เวชศาสตร์ (แพทย์เวชศาสตร์ฟื้นฟู)' },
    { date: '2026-05-14', visitNo: 2, type: 'ฟื้นฟูตามนัด', bp: '116/72', pulse: 74, barthel: 25, romShoulder: 95, romKnee: 85, muscleGrade: 1, exam: 'ฝึก wheelchair transfer ได้บางส่วน', lab: null, xray: null, note: 'Bladder training เริ่มต้น', therapist: 'นพ.ธนวัฒน์ เวชศาสตร์ (แพทย์เวชศาสตร์ฟื้นฟู)' },
    { date: '2026-06-04', visitNo: 3, type: 'ฟื้นฟูตามนัด', bp: '118/76', pulse: 76, barthel: 35, romShoulder: 105, romKnee: 95, muscleGrade: 2, exam: 'Transfer เตียง↔รถเข็นได้เองด้วยแผ่นสไลด์', lab: null, xray: null, note: 'ถอดสายสวน เริ่ม intermittent catheterization', therapist: 'นพ.ธนวัฒน์ เวชศาสตร์ (แพทย์เวชศาสตร์ฟื้นฟู)' },
    { date: '2026-06-25', visitNo: 4, type: 'ฟื้นฟูตามนัด', bp: '120/78', pulse: 74, barthel: 45, romShoulder: 115, romKnee: 100, muscleGrade: 2, exam: 'นั่งทรงตัวได้ดี ใช้รถเข็นเองบนพื้นราบ', lab: 'UA — no infection', xray: null, note: 'ฝึก ADL อาบน้ำ/แต่งตัวท่อนบน', therapist: 'นพ.ธนวัฒน์ เวชศาสตร์ (แพทย์เวชศาสตร์ฟื้นฟู)' },
    { date: '2026-07-16', visitNo: 5, type: 'ฟื้นฟูตามนัด', bp: '118/74', pulse: 72, barthel: 50, romShoulder: 125, romKnee: 105, muscleGrade: 3, exam: 'Standing frame ได้ 10 นาที', lab: null, xray: null, note: 'เตรียมประเมินอุปกรณ์ช่วยเดิน', therapist: 'นพ.ธนวัฒน์ เวชศาสตร์ (แพทย์เวชศาสตร์ฟื้นฟู)' },
    { date: '2026-08-06', visitNo: 6, type: 'ฟื้นฟูตามนัด', bp: '116/72', pulse: 72, barthel: 55, romShoulder: 130, romKnee: 110, muscleGrade: 3, exam: 'เดินในราวคู่ขนาน 8 เมตร', lab: null, xray: null, note: 'ประเมินบ้านเพื่อปรับสภาพแวดล้อม', therapist: 'นพ.ธนวัฒน์ เวชศาสตร์ (แพทย์เวชศาสตร์ฟื้นฟู)' },
  ],
  '67-00021': [
    { date: '2026-06-22', visitNo: 1, type: 'ประเมินแรกรับ', bp: '132/82', pulse: 80, barthel: 65, romShoulder: null, romKnee: 60, muscleGrade: 3, exam: 'หลังผ่าตัด TKA ขวา 14 วัน · แผลแห้งดี บวมเล็กน้อย', lab: 'CBC — Hb 11.2', xray: 'X-ray knee ขวา — prosthesis in good position', note: 'เริ่ม CPM + quadriceps setting', therapist: 'กภ.พรนภา อินทโชติ' },
    { date: '2026-07-06', visitNo: 2, type: 'ฟื้นฟูตามนัด', bp: '130/80', pulse: 78, barthel: 75, romShoulder: null, romKnee: 85, muscleGrade: 4, exam: 'Knee flexion 85° · เดินด้วย walker ได้เอง', lab: null, xray: null, note: 'ลดบวมด้วย cold pack หลังออกกำลังกาย', therapist: 'กภ.พรนภา อินทโชติ' },
    { date: '2026-07-20', visitNo: 3, type: 'ฟื้นฟูตามนัด', bp: '128/78', pulse: 76, barthel: 85, romShoulder: null, romKnee: 100, muscleGrade: 4, exam: 'Knee flexion 100° · เดินด้วยไม้เท้า', lab: null, xray: null, note: 'ฝึกขึ้น-ลงบันได', therapist: 'กภ.พรนภา อินทโชติ' },
    { date: '2026-08-03', visitNo: 4, type: 'ฟื้นฟูตามนัด', bp: '126/78', pulse: 74, barthel: 90, romShoulder: null, romKnee: 110, muscleGrade: 5, exam: 'Knee flexion 110° · เดินเองได้ในระยะ 100 เมตร', lab: null, xray: 'X-ray knee ขวา ติดตาม — ปกติ', note: 'ใกล้บรรลุเป้าหมาย ROM 120°', therapist: 'กภ.พรนภา อินทโชติ' },
  ],
  '67-00018': [
    { date: '2026-07-10', visitNo: 1, type: 'ประเมินแรกรับ', bp: '138/86', pulse: 82, barthel: 85, romShoulder: null, romKnee: null, muscleGrade: 4, exam: 'SLR ขวา positive 45° · ปวดร้าวลงขาขวา', lab: null, xray: 'X-ray L-S spine — disc space narrowing L4-L5', note: 'เริ่ม traction + TENS', therapist: 'กภ.ศุภกร พูนสวัสดิ์' },
    { date: '2026-07-24', visitNo: 2, type: 'ฟื้นฟูตามนัด', bp: '136/84', pulse: 80, barthel: 90, romShoulder: null, romKnee: null, muscleGrade: 4, exam: 'SLR ขวา 60° · อาการปวดลดลง VAS 4/10', lab: null, xray: null, note: 'เพิ่ม core stabilization exercise', therapist: 'กภ.ศุภกร พูนสวัสดิ์' },
    { date: '2026-08-07', visitNo: 3, type: 'ฟื้นฟูตามนัด', bp: '134/82', pulse: 78, barthel: 95, romShoulder: null, romKnee: null, muscleGrade: 5, exam: 'SLR ขวา 75° · VAS 2/10 · เดินได้ปกติ', lab: null, xray: null, note: 'สอนท่าบริหารหลังที่บ้าน + ปรับท่าทางการทำงาน', therapist: 'กภ.ศุภกร พูนสวัสดิ์' },
  ],
  '67-00024': [
    { date: '2026-03-05', visitNo: 1, type: 'ประเมินแรกรับ', bp: '126/80', pulse: 78, barthel: 45, romShoulder: 85, romKnee: 95, muscleGrade: 2, exam: 'TBI · attention สั้น · MMT ซีกซ้าย 2/5', lab: null, xray: 'CT brain — resolving contusion', note: 'เริ่ม IMC ระยะที่ 1 · ประสาน OT', therapist: 'พญ.กมลชนก วรกิจ (แพทย์เวชศาสตร์ฟื้นฟู)' },
    { date: '2026-04-16', visitNo: 2, type: 'ฟื้นฟูตามนัด', bp: '124/78', pulse: 76, barthel: 55, romShoulder: 100, romKnee: 105, muscleGrade: 3, exam: 'ทำตามคำสั่ง 2 ขั้นตอนได้ · ยืนทรงตัวได้', lab: null, xray: null, note: 'เพิ่ม cognitive-motor dual task', therapist: 'พญ.กมลชนก วรกิจ (แพทย์เวชศาสตร์ฟื้นฟู)' },
    { date: '2026-05-28', visitNo: 3, type: 'ฟื้นฟูตามนัด', bp: '122/78', pulse: 74, barthel: 65, romShoulder: 115, romKnee: 115, muscleGrade: 3, exam: 'เดินเองได้ในบ้าน · ยังต้องเตือนเรื่องความปลอดภัย', lab: null, xray: null, note: 'ฝึก ADL ทำอาหารอย่างง่าย', therapist: 'พญ.กมลชนก วรกิจ (แพทย์เวชศาสตร์ฟื้นฟู)' },
    { date: '2026-07-09', visitNo: 4, type: 'Telemedicine', bp: null, pulse: null, barthel: 75, romShoulder: null, romKnee: null, muscleGrade: null, exam: 'ติดตามทางไกล — ทำกิจวัตรได้เองเกือบทั้งหมด', lab: null, xray: null, note: 'ประเมินความพร้อมกลับไปทำงาน', therapist: 'พญ.กมลชนก วรกิจ (แพทย์เวชศาสตร์ฟื้นฟู)' },
    { date: '2026-08-04', visitNo: 5, type: 'ฟื้นฟูตามนัด', bp: '120/76', pulse: 74, barthel: 85, romShoulder: 130, romKnee: 125, muscleGrade: 4, exam: 'เดินนอกบ้านได้เอง · dual task ผ่าน', lab: null, xray: null, note: 'วางแผนจำหน่ายจาก IMC ภายใน 1 เดือน', therapist: 'พญ.กมลชนก วรกิจ (แพทย์เวชศาสตร์ฟื้นฟู)' },
  ],
  '67-00011': [
    { date: '2026-07-04', visitNo: 1, type: 'ประเมินแรกรับ', bp: '120/76', pulse: 74, barthel: 95, romShoulder: null, romKnee: null, muscleGrade: 2, exam: 'Bell’s palsy ซีกซ้าย House-Brackmann grade IV', lab: null, xray: null, note: 'เริ่ม facial exercise + ES', therapist: 'กภ.ศุภกร พูนสวัสดิ์' },
    { date: '2026-07-25', visitNo: 2, type: 'ฟื้นฟูตามนัด', bp: '118/74', pulse: 72, barthel: 100, romShoulder: null, romKnee: null, muscleGrade: 3, exam: 'House-Brackmann grade III · หลับตาซ้ายได้สนิท', lab: null, xray: null, note: 'อาการดีขึ้นชัดเจน', therapist: 'กภ.ศุภกร พูนสวัสดิ์' },
  ],
  /* ผู้รับบริการที่เพิ่งขึ้นทะเบียน — มีข้อมูลครั้งเดียว (edge case
     "single visit renders table + gauges but suppresses trend axis") */
  '67-00017': [
    { date: '2026-08-08', visitNo: 1, type: 'ประเมินแรกรับ', bp: '124/78', pulse: 76, barthel: 90, romShoulder: 90, romKnee: null, muscleGrade: 4, exam: 'Frozen shoulder ซ้าย · abduction 90° · Neer test positive', lab: null, xray: 'X-ray shoulder ซ้าย — ไม่พบกระดูกผิดปกติ', note: 'เริ่ม ultrasound + mobilization', therapist: 'กภ.พรนภา อินทโชติ' },
  ],
};

/** ตาราง/กราฟติดตาม — static dataset รวมกับวิสิตที่ยืนยันใน session นี้,
    กรองตามช่วงเวลา (ISO inclusive). */
export const getRehabFollowUpVisits = (hn, fromIso, toIso) => {
  const stored = readJson(VISIT_HISTORY_KEY, {});
  const all = [...(REHAB_FOLLOWUP_VISITS[hn] || []), ...(stored[hn] || [])];
  return all
    .filter((v) => (!fromIso || v.date >= fromIso) && (!toIso || v.date <= toIso))
    .sort((a, b) => a.date.localeCompare(b.date));
};

export const getRehabVisitCount = (hn) =>
  (REHAB_FOLLOWUP_VISITS[hn] || []).length + (readJson(VISIT_HISTORY_KEY, {})[hn] || []).length;

/** สถิติสรุปช่วงเวลา — ใช้กับ gauge บนหน้าติดตาม. ค่าที่ไม่เคยวัดคืน null
    (ห้ามคืน 0 เพราะจะอ่านเป็น "แย่ที่สุด" แทน "ไม่มีข้อมูล"). */
export const computeRehabStats = (visits, registration) => {
  const withBarthel = visits.filter((v) => v.barthel != null);
  const first = withBarthel.length ? withBarthel[0].barthel : null;
  const last = withBarthel.length ? withBarthel[withBarthel.length - 1].barthel : null;
  const admit = registration?.barthelAdmit ?? first;
  const romKnee = visits.filter((v) => v.romKnee != null);
  const romShoulder = visits.filter((v) => v.romShoulder != null);
  const planned = registration?.courseTotal || null;
  return {
    visitCount: visits.length,
    barthelAdmit: admit,
    barthelFirst: first,
    barthelLatest: last,
    barthelGain: first != null && last != null ? last - first : null,
    latestKneeRom: romKnee.length ? romKnee[romKnee.length - 1].romKnee : null,
    latestShoulderRom: romShoulder.length ? romShoulder[romShoulder.length - 1].romShoulder : null,
    plannedSessions: planned,
    attendedPct: planned ? Math.min(100, Math.round((visits.length / planned) * 100)) : null,
  };
};

/* ─── ผลการซักประวัติจากพยาบาล (TOR 1.10.10.3) ──────────────────────
   คู่มือเดิม §2.3 แทบ "Treatment and Progress": ช่อง "อาการสำคัญ" ดึงจากหน้า
   ซักประวัติ และ "บันทึกแพทย์" ดึงจากหน้าบันทึกการรักษาของแพทย์ — ทั้งคู่เป็น
   read-only ในหน้ากายภาพบำบัด แก้ที่ต้นทางเท่านั้น. */

export const REHAB_SCREENING = {
  '67-00012': {
    chiefComplaint: 'อ่อนแรงแขน-ขาซีกขวา เดินต้องมีคนพยุง มาฟื้นฟูตามนัด',
    screeningResult: 'รู้สึกตัวดี สื่อสารได้ · ความเสี่ยงล้มระดับสูง (Morse 55) · ไม่มีแผลกดทับ',
    doctorNote: 'Sequelae of cerebral infarction — ให้ฟื้นฟูต่อเนื่องตามแผน IMC ระยะที่ 2',
  },
  '67-00016': {
    chiefComplaint: 'ขาสองข้างอ่อนแรง ใช้รถเข็น มาฝึกเดินตามโปรแกรม',
    screeningResult: 'รู้สึกตัวดี · ต้องเฝ้าระวังแผลกดทับบริเวณก้นกบ · ปัสสาวะสวนเป็นเวลา',
    doctorNote: 'Incomplete SCI T10 — เน้น standing/gait training และป้องกันแผลกดทับ',
  },
  '67-00021': {
    chiefComplaint: 'งอเข่าขวาได้ไม่สุดหลังผ่าตัดเปลี่ยนข้อเข่า',
    screeningResult: 'แผลผ่าตัดแห้งดี ไม่มีไข้ · บวมเล็กน้อยปลายวัน',
    doctorNote: 'Post TKA ขวา — เป้าหมาย ROM 120 องศาภายใน 6 สัปดาห์',
  },
  '67-00018': {
    chiefComplaint: 'ปวดหลังส่วนล่างร้าวลงขาขวา ปวดมากตอนนั่งนาน',
    screeningResult: 'VAS 4/10 · ไม่มีอาการชาลามหรือกลั้นปัสสาวะไม่ได้ (ไม่มี red flag)',
    doctorNote: 'Low back pain with radiculopathy — ให้ traction + TENS และสอนท่าบริหาร',
  },
  '67-00017': {
    chiefComplaint: 'ยกแขนซ้ายไม่ขึ้น ปวดไหล่มากตอนกลางคืน เป็นมา 3 สัปดาห์',
    screeningResult: 'ประเมินแรกรับ · ไม่มีประวัติบาดเจ็บ · ไม่มีอาการชาปลายมือ',
    doctorNote: 'Adhesive capsulitis ซ้าย — เริ่ม ultrasound + joint mobilization',
  },
  '67-00011': {
    chiefComplaint: 'ปากเบี้ยว หลับตาซ้ายไม่สนิท มาฝึกกล้ามเนื้อใบหน้า',
    screeningResult: 'สัญญาณชีพปกติ · ไม่มีอาการอ่อนแรงแขนขา',
    doctorNote: 'Bell’s palsy ซ้าย — facial exercise + electrical stimulation',
  },
  '67-00020': {
    chiefComplaint: 'เดินลงน้ำหนักขาซ้ายได้ไม่เต็มที่หลังกระดูกสะโพกหัก',
    screeningResult: 'ใช้ walker · ความเสี่ยงล้มปานกลาง',
    doctorNote: 'Post ORIF femur ซ้าย — partial weight bearing ตามคำสั่งศัลยแพทย์',
  },
  '67-00024': {
    chiefComplaint: 'ทำกิจวัตรประจำวันได้ช้า ต้องมีคนเตือน มาฟื้นฟูต่อเนื่อง',
    screeningResult: 'รู้สึกตัวดี · สมาธิสั้นลง · ต้องมีผู้ดูแลร่วมทุกครั้ง',
    doctorNote: 'Post TBI — เน้น cognitive-motor dual task และเตรียมกลับสู่ชุมชน',
  },
};

export const getRehabScreening = (hn) => (hn ? REHAB_SCREENING[hn] || null : null);

/* ─── ผลตรวจครั้งก่อน (Re-ROM / Re-Muscle copy-forward) ────────────
   คู่มือเดิม §2.4: ปุ่ม "เรียกข้อมูลเดิม" ในแทบ ROM / Motor / Sensation
   ดึงผลครั้งก่อนกลับมาเป็นแถวตั้งต้นแล้วให้แก้ค่าใหม่.
   คีย์เป็น HN เสมอ — ห้ามคีย์จาก cardPatient.hn (ANC DEFAULT_PATIENT bug:
   ผู้ป่วยที่ไม่มีโปรไฟล์จะ fallback ไปดึงผลของคนอื่น). */

export const REHAB_PREVIOUS_EXAM = {
  '67-00012': {
    date: '2026-07-29',
    romRows: [
      { joint: 'Shoulder', motion: 'Flexion',  right: '150', left: '120', note: 'ข้างซ้ายจำกัดจากภาวะอ่อนแรง' },
      { joint: 'Elbow',    motion: 'Flexion',  right: '140', left: '130', note: '' },
      { joint: 'Knee',     motion: 'Flexion',  right: '130', left: '115', note: '' },
    ],
    muscleRows: [
      { group: 'Shoulder flexor', side: 'left', grade: '3', note: '' },
      { group: 'Knee extensor',   side: 'left', grade: '4', note: '' },
    ],
    sensationRows: [
      { type: 'Light touch', area: 'ปลายมือ-ปลายเท้าซ้าย', side: 'left', result: 'impaired' },
    ],
    barthel: 65,
  },
  '67-00016': {
    date: '2026-08-06',
    romRows: [
      { joint: 'Hip',   motion: 'Flexion', right: '95',  left: '90',  note: '' },
      { joint: 'Knee',  motion: 'Flexion', right: '110', left: '105', note: '' },
      { joint: 'Ankle', motion: 'Dorsiflexion', right: '5', left: '5', note: 'จำกัดทั้งสองข้าง' },
    ],
    muscleRows: [
      { group: 'Hip flexor',       side: 'both', grade: '3', note: '' },
      { group: 'Ankle dorsiflexor', side: 'both', grade: '2', note: '' },
    ],
    sensationRows: [
      { type: 'Pin prick', area: 'ต่ำกว่าระดับ T10', side: 'both', result: 'impaired' },
    ],
    barthel: 55,
  },
  '67-00021': {
    date: '2026-08-03',
    romRows: [
      { joint: 'Knee', motion: 'Flexion',   right: '110', left: '135', note: 'ข้างขวาหลังผ่าตัด TKA' },
      { joint: 'Knee', motion: 'Extension', right: '-5',  left: '0',   note: 'ยังเหยียดไม่สุด 5 องศา' },
    ],
    muscleRows: [
      { group: 'Knee extensor', side: 'right', grade: '4', note: '' },
    ],
    sensationRows: [],
    barthel: 90,
  },
  '67-00018': {
    date: '2026-08-07',
    romRows: [
      { joint: 'Lumbar spine', motion: 'Flexion',        right: '', left: '', note: 'ก้มได้ปลายนิ้วห่างพื้น 15 ซม.' },
      { joint: 'Lumbar spine', motion: 'Lateral bending', right: '25', left: '20', note: '' },
    ],
    muscleRows: [
      { group: 'Trunk control', side: 'both', grade: '4', note: '' },
    ],
    sensationRows: [],
    barthel: 95,
  },
  '67-00024': {
    date: '2026-08-04',
    romRows: [
      { joint: 'Shoulder', motion: 'Abduction', right: '160', left: '130', note: '' },
      { joint: 'Knee',     motion: 'Flexion',   right: '130', left: '125', note: '' },
    ],
    muscleRows: [
      { group: 'Grip',          side: 'left', grade: '4', note: '' },
      { group: 'Trunk control', side: 'both', grade: '4', note: '' },
    ],
    sensationRows: [],
    barthel: 85,
  },
};

/** ผลตรวจครั้งก่อนของ HN นี้ — คืน null เมื่อไม่มี (ปุ่ม "เรียกผลครั้งก่อน"
    จะถูกซ่อน แทนที่จะเติมข้อมูลของคนอื่น). */
export const getRehabPreviousExam = (hn) => (hn ? REHAB_PREVIOUS_EXAM[hn] || null : null);

/** คะแนน Barthel ครั้งก่อน — ใช้เทียบบนแบบประเมิน ADL. */
export const getPreviousBarthel = (hn) => {
  if (!hn) return null;
  const visits = getRehabFollowUpVisits(hn);
  const scored = visits.filter((v) => v.barthel != null);
  if (scored.length) return scored[scored.length - 1].barthel;
  return REHAB_PREVIOUS_EXAM[hn]?.barthel ?? null;
};

/* ─── ชุดคำแนะนำสำหรับ SuggestibleTextarea ─────────────────────── */

export const REHAB_HISTORY_SUGGESTIONS = [
  'อ่อนแรงซีกขวาหลังโรคหลอดเลือดสมอง เดินต้องมีคนพยุง',
  'ปวดหลังส่วนล่างร้าวลงขาขวา เป็นมา 3 สัปดาห์',
  'หลังผ่าตัดเปลี่ยนข้อเข่า งอเข่าได้จำกัด',
  'ยกแขนไม่ขึ้น ปวดไหล่ตอนกลางคืน',
  'กล้ามเนื้อใบหน้าซีกซ้ายอ่อนแรง หลับตาไม่สนิท',
  'ญาติรายงานว่าช่วยเหลือตนเองได้มากขึ้นในช่วง 2 สัปดาห์',
  'มาตามนัดฟื้นฟูต่อเนื่อง ไม่มีอาการผิดปกติเพิ่มเติม',
];

export const REHAB_EXAM_SUGGESTIONS = [
  'ROM ข้อไหล่ซ้ายจำกัดในท่า abduction และ external rotation',
  'MMT ซีกขวา grade 3/5 ทั้งแขนและขา',
  'Brunnstrom Arm stage III · Hand stage II · Leg stage IV',
  'Sensation light touch ลดลงบริเวณปลายเท้าทั้งสองข้าง',
  'Knee jerk ขวา 3+ · Babinski ขวา positive',
  'Straight leg raising ขวา positive ที่ 45 องศา',
  'ทรงตัวขณะนั่งดี ขณะยืนต้องมีคนดูแลใกล้ชิด',
  'ไม่พบภาวะข้อติดหรือแผลกดทับเพิ่มเติม',
];

export const REHAB_BARTHEL_NOTE_SUGGESTIONS = [
  'คะแนนเพิ่มขึ้นจากครั้งก่อนชัดเจนในหมวดการเคลื่อนที่',
  'ยังต้องช่วยเหลือเรื่องการอาบน้ำและขึ้น-ลงบันได',
  'ญาติผู้ดูแลเข้าใจวิธีช่วยเคลื่อนย้ายตัวแล้ว',
  'กลั้นปัสสาวะได้ดีขึ้นหลังฝึก bladder training',
  'ประเมินร่วมกับนักกิจกรรมบำบัดในครั้งถัดไป',
];

export const REHAB_DIAGNOSIS_SUGGESTIONS = [
  'Hemiparesis ซีกขวาจากโรคหลอดเลือดสมองตีบ (Sequelae of cerebral infarction)',
  'Incomplete spinal cord injury ระดับ T10',
  'ภาวะข้อไหล่ติด (Adhesive capsulitis) ข้างซ้าย',
  'ปวดหลังส่วนล่างจากหมอนรองกระดูกเสื่อม L4-L5',
  'ข้อเข่าติดหลังผ่าตัดเปลี่ยนข้อเข่าเทียมข้างขวา',
  'อัมพาตใบหน้าส่วนปลายข้างซ้าย (Bell’s palsy)',
  'ภาวะบกพร่องการทำกิจวัตรประจำวันจากบาดเจ็บสมอง',
];

export const REHAB_GOAL_SUGGESTIONS = [
  'เดินด้วยไม้เท้าได้เองในระยะ 50 เมตรภายใน 4 สัปดาห์',
  'เพิ่มองศาการงอเข่าเป็น 120 องศาภายใน 6 สัปดาห์',
  'คะแนน Barthel เพิ่มขึ้นอย่างน้อย 20 คะแนนภายใน 3 เดือน',
  'ยกแขนเหนือศีรษะได้เองภายใน 8 สัปดาห์',
  'แต่งตัวและอาบน้ำได้เองโดยไม่ต้องมีคนช่วย',
  'ลดระดับความปวดเหลือ VAS ≤ 3/10 ภายใน 4 สัปดาห์',
  'กลับไปทำงานเดิมได้ภายใน 3 เดือน',
];

export const REHAB_PROGRAM_NOTE_SUGGESTIONS = [
  'เน้นเพิ่มพิสัยการเคลื่อนไหวก่อน แล้วจึงเพิ่มความแข็งแรง',
  'ประคบร้อน 15 นาทีก่อนออกกำลังกายทุกครั้ง',
  'สอนญาติผู้ดูแลทำ PROM ต่อที่บ้านวันละ 2 รอบ',
  'หลีกเลี่ยงการยกของหนักเกิน 5 กิโลกรัมระหว่างการฟื้นฟู',
  'ติดตามอาการปวดหลังการรักษาทุกครั้ง หากปวดมากให้ลดความเข้ม',
];

export const REHAB_PROCEDURE_NOTE_SUGGESTIONS = [
  'ทำหัตถการครบตามแผน ผู้รับบริการทนได้ดี ไม่มีอาการข้างเคียง',
  'มีอาการปวดเพิ่มขึ้นระหว่างทำ ลดความเข้มลงและหยุดก่อนกำหนด',
  'ผิวหนังบริเวณที่ประคบแดงเล็กน้อย หายภายใน 10 นาที',
  'ผู้รับบริการทำท่าออกกำลังกายได้ถูกต้องหลังสอนซ้ำ 2 รอบ',
  'ต้องมีผู้ช่วยพยุงตลอดการฝึกเดินเพื่อความปลอดภัย',
];

export const REHAB_COURSE_SUMMARY_SUGGESTIONS = [
  'บรรลุเป้าหมายการเดินและการทำกิจวัตรประจำวันตามแผน',
  'บรรลุเป้าหมายบางส่วน — ยังต้องใช้อุปกรณ์ช่วยเดิน',
  'ส่งต่อโรงพยาบาลแม่ข่ายเพื่อประเมินการผ่าตัดเพิ่มเติม',
  'ผู้รับบริการขาดนัดต่อเนื่อง ติดตามทางโทรศัพท์แล้วไม่สำเร็จ',
  'ครบ Course ตามแผน แนะนำโปรแกรมออกกำลังกายต่อเนื่องที่บ้าน',
];

export const REHAB_VISIT_CANCEL_SUGGESTIONS = [
  'ผู้รับบริการขอยุติการฟื้นฟูกลางคัน',
  'บันทึกผิดคน — เปิดผิด HN',
  'ผู้รับบริการมีอาการไม่พร้อมรับการฟื้นฟูวันนี้',
  'เครื่องมือกายภาพขัดข้อง — เลื่อนการทำหัตถการ',
  'บันทึกซ้ำ — ใช้บันทึกอีกใบแทน',
];

export const REHAB_APPOINTMENT_CANCEL_SUGGESTIONS = [
  'ผู้รับบริการขอเลื่อนนัด — จะติดต่อกลับเพื่อนัดใหม่',
  'ครบจำนวนครั้งใน Course แล้ว ไม่ต้องนัดเพิ่ม',
  'นักกายภาพบำบัดติดราชการในวันดังกล่าว',
  'บันทึกนัดหมายผิดวัน / ผิดคน',
  'ผู้รับบริการนอนโรงพยาบาลในช่วงวันนัด',
];

export const REHAB_REGISTRY_CANCEL_SUGGESTIONS = [
  'ย้ายไปรับการฟื้นฟูที่สถานพยาบาลอื่น',
  'วินิจฉัยใหม่ไม่เข้าเกณฑ์การฟื้นฟูของศูนย์บริการฯ',
  'ขึ้นทะเบียนซ้ำ — ใช้ทะเบียนเลขที่เดิมแทน',
  'ผู้รับบริการเสียชีวิต',
  'พ้นกรอบเวลา Intermediate Care 6 เดือนแล้ว',
];

export const REHAB_APPOINTMENT_NOTE_SUGGESTIONS = [
  'สวมเสื้อผ้าที่เคลื่อนไหวสะดวก และนำอุปกรณ์ช่วยเดินมาด้วย',
  'มาก่อนเวลานัด 15 นาทีเพื่อวัดสัญญาณชีพ',
  'ทำท่าบริหารที่บ้านต่อเนื่องวันละ 2 รอบก่อนถึงวันนัด',
  'นำผลเอกซเรย์เดิมและใบส่งตัวมาด้วยทุกครั้ง',
  'หากมีอาการปวดมากขึ้นให้มาก่อนนัดได้ทันที',
];
