/* ncdVisits.js — mock data + session-scoped state for งานกลุ่มโรคเฉพาะ NCD
   (TOR §1.10.2 — เบาหวาน / ความดันโลหิตสูง / หอบหืด / ถุงลมโป่งพอง).

   Mirrors the ANC data module (`ancVisits.js`) exactly in shape and
   philosophy: a static roster of realistic Thai BMA-health-center patients
   (reusing HNs that already exist in `patientProfiles.js` / `mrPatients.js`
   so PatientCard / MR lookups keep resolving), plus sessionStorage-backed
   helpers that make ยกเลิก/แก้ไข/ส่งตรวจ/บันทึก real within a browser
   session instead of static mocks — no backend required.

   No manual exists specifically for the NCD clinic; the workflow is derived
   from คู่มือระบบคลินิกตรวจรักษา ch.2 (queue → ซักประวัติ → ตรวจ → สั่งการรักษา
   → นัด) with NCD-specific vocabulary (HbA1c / SMBG / PEFR / mMRC / inhaler
   technique) from standard Thai NCD-clinic practice — flagged for clinical
   review in the module manifest. */

/* ─── Disease groups ────────────────────────────────────────────── */

export const NCD_DISEASE_GROUPS = [
  { key: 'dm',     label: 'เบาหวาน',           short: 'DM',     badge: 'blue',   icd10: 'E11.9', icd10Label: 'E11.9 — Type 2 diabetes mellitus' },
  { key: 'ht',     label: 'ความดันโลหิตสูง',    short: 'HT',     badge: 'purple', icd10: 'I10',   icd10Label: 'I10 — Essential (primary) hypertension' },
  { key: 'asthma', label: 'หอบหืด',            short: 'Asthma', badge: 'teal',   icd10: 'J45.9', icd10Label: 'J45.9 — Asthma, unspecified' },
  { key: 'copd',   label: 'ถุงลมโป่งพอง',       short: 'COPD',   badge: 'orange', icd10: 'J44.9', icd10Label: 'J44.9 — COPD, unspecified' },
];

export const resolveNcdGroup = (key) => NCD_DISEASE_GROUPS.find((g) => g.key === key) || null;

export const NCD_SEVERITY_OPTIONS = [
  { value: 'controlled',   label: 'ควบคุมได้' },
  { value: 'uncontrolled', label: 'ควบคุมไม่ได้' },
  { value: 'complication', label: 'มีภาวะแทรกซ้อน' },
];

export const resolveNcdSeverity = (value) =>
  NCD_SEVERITY_OPTIONS.find((s) => s.value === value) || null;

export const NCD_DOCTOR_OPTIONS = [
  'นพ.ปวิณ ราชาธิราช',
  'พญ.ศิรินทร์ พัฒนกุล',
  'พญ.ปริยากร เจริญสุข',
  'นพ.ณัฐวุฒิ บุญมี',
  'พญ.สมหญิง รักษ์ดี',
];

/* On-duty user identity for the audit trail (ผู้บันทึก / ผู้แก้ไข /
   ผู้ยกเลิก). A real deployment reads this from the auth session. */
export const NCD_CURRENT_USER = { name: 'พว.กัลยา สายใจ', role: 'พยาบาลวิชาชีพ' };

/* ─── Date helpers (Buddhist calendar, same as formatAncDate) ───── */

export const formatNcdDate = (v) => {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('th-TH-u-ca-buddhist', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
};

export const formatNcdDateTime = (v) => {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(d);
};

/* ─── Today's NCD queue (TOR 1.10.2.1 / 1.10.2.2) ───────────────────
   HNs all exist in patientProfiles.js + mrPatients.js — names/sex/age
   match those rosters so PatientCard renders the same identity the queue
   row shows. Ages skew 36-60 (NCD clinic demographics). */

export const NCD_PATIENTS = [
  {
    hn: '67-00012', name: 'วิชัย รุ่งเรือง', doctor: 'นพ.ปวิณ ราชาธิราช',
    diseaseGroups: ['dm', 'ht'], queue: 'N-001', room: 'NCD1',
    statusKey: 'waiting', waitMinutes: 18, visitType: 'followup',
  },
  {
    hn: '67-00009', name: 'กิตติ ศรีสมบูรณ์', doctor: 'พญ.ศิรินทร์ พัฒนกุล',
    diseaseGroups: ['ht'], queue: 'N-002', room: 'NCD1',
    statusKey: 'progress', waitMinutes: 6, visitType: 'followup', telemedicine: true,
  },
  {
    hn: '67-00007', name: 'มาลี อ่อนน้อม', doctor: 'พญ.ปริยากร เจริญสุข',
    diseaseGroups: ['dm'], queue: 'N-003', room: 'NCD2',
    statusKey: 'waiting', waitMinutes: 25, visitType: 'followup',
  },
  {
    /* ชำระเอง — the "สิทธิหมดอายุ / ไม่มีสิทธิ" edge case: the record page
       shows a non-blocking rights-recheck banner before CPOE orders. */
    hn: '67-00018', name: 'ธีรเดช อัครพงศ์', doctor: 'พญ.ศิรินทร์ พัฒนกุล',
    diseaseGroups: ['copd'], queue: 'N-004', room: 'NCD2',
    statusKey: 'waiting', waitMinutes: 11, visitType: 'followup', rightsExpired: true,
  },
  {
    hn: '67-00021', name: 'วรรณภา ทองดี', doctor: 'นพ.ปวิณ ราชาธิราช',
    diseaseGroups: ['ht', 'dm'], queue: 'N-005', room: 'NCD1',
    statusKey: 'done', waitMinutes: 0, visitType: 'followup',
  },
  {
    hn: '67-00023', name: 'ภัทรานิษฐ์ บูรณะ', doctor: 'พญ.ปริยากร เจริญสุข',
    diseaseGroups: ['asthma'], queue: 'N-006', room: 'NCD2',
    statusKey: 'waiting', waitMinutes: 8, visitType: 'first', telemedicine: true,
  },
  {
    hn: '67-00014', name: 'ชัยวัฒน์ ก้องเกียรติ', doctor: 'พญ.สมหญิง รักษ์ดี',
    diseaseGroups: ['ht'], queue: 'N-007', room: 'NCD1',
    statusKey: 'draft', waitMinutes: 0, visitType: 'followup',
  },
  {
    hn: '67-00015', name: 'รัตนาภรณ์ ใสสะอาด', doctor: 'นพ.ณัฐวุฒิ บุญมี',
    diseaseGroups: ['asthma'], queue: 'N-008', room: 'NCD2',
    statusKey: 'done', waitMinutes: 0, visitType: 'followup',
  },
];

/* นัดแล้วยังไม่มาติดต่อ — same separate-tab pattern as the ANC queue. */
export const NCD_SCHEDULED_TODAY = [
  {
    hn: '67-00022', name: 'อนุชา สมบูรณ์ทรัพย์', doctor: 'นพ.ปวิณ ราชาธิราช',
    appointmentTime: '09:00', clinic: 'NCD1', diseaseGroups: ['ht'], visitType: 'followup',
  },
  {
    hn: '67-00025', name: 'ภาสกร ชาญฉลาด', doctor: 'นพ.ณัฐวุฒิ บุญมี',
    appointmentTime: '10:30', clinic: 'NCD2', diseaseGroups: ['asthma'], visitType: 'followup',
  },
];

export const getNcdPatientByHn = (hn) =>
  NCD_PATIENTS.find((p) => p.hn === hn)
  || NCD_SCHEDULED_TODAY.find((p) => p.hn === hn)
  || null;

/* ─── ทะเบียนผู้รับบริการโรคเฉพาะ (TOR 1.10.2.6) ─────────────────────
   Base registrations — one row per patient enrolled in the clinic.
   Session edits/cancellations layer on top (see helpers below). */

export const NCD_REGISTRY_BASE = [
  {
    hn: '67-00012', name: 'วิชัย รุ่งเรือง', diseaseGroups: ['dm', 'ht'],
    diagnosisDate: '2021-03-16', icd10: 'E11.9', severity: 'uncontrolled',
    doctor: 'นพ.ปวิณ ราชาธิราช',
    registeredBy: 'พว.สุดารัตน์ แก้วใส', registeredAt: '2021-03-16T09:42:00',
  },
  {
    hn: '67-00009', name: 'กิตติ ศรีสมบูรณ์', diseaseGroups: ['ht'],
    diagnosisDate: '2019-11-04', icd10: 'I10', severity: 'controlled',
    doctor: 'พญ.ศิรินทร์ พัฒนกุล',
    registeredBy: 'พว.กัลยา สายใจ', registeredAt: '2019-11-04T10:15:00',
  },
  {
    hn: '67-00007', name: 'มาลี อ่อนน้อม', diseaseGroups: ['dm'],
    diagnosisDate: '2023-06-21', icd10: 'E11.9', severity: 'controlled',
    doctor: 'พญ.ปริยากร เจริญสุข',
    registeredBy: 'พว.กัลยา สายใจ', registeredAt: '2023-06-21T13:20:00',
  },
  {
    hn: '67-00018', name: 'ธีรเดช อัครพงศ์', diseaseGroups: ['copd'],
    diagnosisDate: '2020-01-29', icd10: 'J44.9', severity: 'complication',
    doctor: 'พญ.ศิรินทร์ พัฒนกุล',
    registeredBy: 'พว.สุดารัตน์ แก้วใส', registeredAt: '2020-01-29T11:05:00',
  },
  {
    hn: '67-00021', name: 'วรรณภา ทองดี', diseaseGroups: ['ht', 'dm'],
    diagnosisDate: '2022-08-09', icd10: 'I10', severity: 'controlled',
    doctor: 'นพ.ปวิณ ราชาธิราช',
    registeredBy: 'พว.กัลยา สายใจ', registeredAt: '2022-08-09T09:58:00',
  },
  {
    hn: '67-00023', name: 'ภัทรานิษฐ์ บูรณะ', diseaseGroups: ['asthma'],
    diagnosisDate: '2026-08-03', icd10: 'J45.9', severity: 'controlled',
    doctor: 'พญ.ปริยากร เจริญสุข',
    registeredBy: 'พว.กัลยา สายใจ', registeredAt: '2026-08-03T08:47:00',
  },
  {
    hn: '67-00014', name: 'ชัยวัฒน์ ก้องเกียรติ', diseaseGroups: ['ht'],
    diagnosisDate: '2024-02-14', icd10: 'I10', severity: 'controlled',
    doctor: 'พญ.สมหญิง รักษ์ดี',
    registeredBy: 'พว.สุดารัตน์ แก้วใส', registeredAt: '2024-02-14T14:31:00',
  },
  {
    hn: '67-00015', name: 'รัตนาภรณ์ ใสสะอาด', diseaseGroups: ['asthma'],
    diagnosisDate: '2018-05-30', icd10: 'J45.9', severity: 'controlled',
    doctor: 'นพ.ณัฐวุฒิ บุญมี',
    registeredBy: 'พว.กัลยา สายใจ', registeredAt: '2018-05-30T10:44:00',
  },
  {
    hn: '67-00022', name: 'อนุชา สมบูรณ์ทรัพย์', diseaseGroups: ['ht'],
    diagnosisDate: '2023-12-01', icd10: 'I10', severity: 'uncontrolled',
    doctor: 'นพ.ปวิณ ราชาธิราช',
    registeredBy: 'พว.สุดารัตน์ แก้วใส', registeredAt: '2023-12-01T15:12:00',
  },
  {
    hn: '67-00025', name: 'ภาสกร ชาญฉลาด', diseaseGroups: ['asthma'],
    diagnosisDate: '2025-04-18', icd10: 'J45.9', severity: 'controlled',
    doctor: 'นพ.ณัฐวุฒิ บุญมี',
    registeredBy: 'พว.กัลยา สายใจ', registeredAt: '2025-04-18T09:03:00',
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

const REGISTRY_OVERRIDE_KEY = 'mih:ncd-registry-overrides';   // hn -> partial row + editHistory
const REGISTRY_ADDED_KEY    = 'mih:ncd-registry-added';       // hn -> full row (ขึ้นทะเบียนใหม่)
const CANCELLED_KEY         = 'mih:ncd-cancelled-registry';   // hn -> { reason, cancelledBy, cancelledAt }
const CHECKED_IN_KEY        = 'mih:ncd-checked-in-today';     // hn -> true
const VISIT_STATUS_KEY      = 'mih:ncd-visit-status';         // hn -> { statusKey, by, at, reason? }
const VISIT_HISTORY_KEY     = 'mih:ncd-visit-history';        // hn -> [records]
const USER_ROLE_KEY         = 'mih:ncd-user-role';            // 'edit' (default) | 'view'

/* สิทธิ์ผู้ใช้ — read-only mode (playbook §5 "สิทธิไม่พอ"). Defaults to full
   edit rights; set sessionStorage['mih:ncd-user-role']='view' to exercise
   the view-only branches (forms disabled, action buttons hidden, banner). */
export const canEditNcd = () => readJson(USER_ROLE_KEY, 'edit') !== 'view';

/* ── Registry CRUD (แสดง/บันทึก/แก้ไข/ยกเลิก + reactivate + audit) ── */

export const getNcdRegistryRows = () => {
  const overrides = readJson(REGISTRY_OVERRIDE_KEY, {});
  const added = readJson(REGISTRY_ADDED_KEY, {});
  const base = NCD_REGISTRY_BASE.map((row) => {
    const o = overrides[row.hn];
    return o ? { ...row, ...o.fields, editHistory: o.editHistory || [] } : { ...row, editHistory: [] };
  });
  const extra = Object.values(added).map((row) => {
    const o = overrides[row.hn];
    return o ? { ...row, ...o.fields, editHistory: o.editHistory || [] } : { ...row, editHistory: [] };
  });
  return [...base, ...extra];
};

export const getNcdRegistrationByHn = (hn) =>
  getNcdRegistryRows().find((r) => r.hn === hn) || null;

/** ขึ้นทะเบียนใหม่ (TOR 1.10.2.6 "บันทึก") — audit fields stamped from the
    current on-duty user. */
export const addNcdRegistration = (row) => {
  if (!row?.hn) return;
  const added = readJson(REGISTRY_ADDED_KEY, {});
  added[row.hn] = {
    ...row,
    registeredBy: NCD_CURRENT_USER.name,
    registeredAt: new Date().toISOString(),
  };
  writeJson(REGISTRY_ADDED_KEY, added);
};

/** แก้ไขทะเบียน (TOR 1.10.2.6 "แก้ไข") — stores the field diff so the audit
    panel can show ผู้แก้ไข + เวลา + ค่าที่เปลี่ยน per edit. */
export const updateNcdRegistration = (hn, fields, changesLabel) => {
  if (!hn) return;
  const overrides = readJson(REGISTRY_OVERRIDE_KEY, {});
  const prev = overrides[hn] || { fields: {}, editHistory: [] };
  overrides[hn] = {
    fields: { ...prev.fields, ...fields },
    editHistory: [
      ...(prev.editHistory || []),
      { by: NCD_CURRENT_USER.name, at: new Date().toISOString(), changes: changesLabel || 'แก้ไขข้อมูลทะเบียน' },
    ],
  };
  writeJson(REGISTRY_OVERRIDE_KEY, overrides);
};

/** ยกเลิกทะเบียน (TOR 1.10.2.6 "ยกเลิก") — reason required, reversible. */
export const cancelNcdRegistration = (hn, reason) => {
  if (!hn) return;
  const store = readJson(CANCELLED_KEY, {});
  store[hn] = {
    reason: reason || 'ไม่ระบุเหตุผล',
    cancelledBy: NCD_CURRENT_USER.name,
    cancelledAt: new Date().toISOString(),
  };
  writeJson(CANCELLED_KEY, store);
};

export const reactivateNcdRegistration = (hn) => {
  if (!hn) return;
  const store = readJson(CANCELLED_KEY, {});
  delete store[hn];
  writeJson(CANCELLED_KEY, store);
};

export const getNcdCancellation = (hn) => readJson(CANCELLED_KEY, {})[hn] || null;

/* ── Queue check-in + per-visit status (draft / done / cancelled) ── */

export const checkInNcdAppointment = (hn) => {
  if (!hn) return;
  const store = readJson(CHECKED_IN_KEY, {});
  store[hn] = true;
  writeJson(CHECKED_IN_KEY, store);
};

export const getNcdScheduledNotArrived = () => {
  const checkedIn = readJson(CHECKED_IN_KEY, {});
  return NCD_SCHEDULED_TODAY.filter((p) => !checkedIn[p.hn]);
};

/** Overrides today's queue status for a patient — บันทึกร่าง returns the row
    to ที่ร่างไว้, ยืนยัน moves it to ตรวจเสร็จ, ยกเลิก keeps an audit trail. */
export const setNcdVisitStatus = (hn, statusKey, extra = {}) => {
  if (!hn) return;
  const store = readJson(VISIT_STATUS_KEY, {});
  store[hn] = { statusKey, by: NCD_CURRENT_USER.name, at: new Date().toISOString(), ...extra };
  writeJson(VISIT_STATUS_KEY, store);
};

export const getNcdVisitStatus = (hn) => readJson(VISIT_STATUS_KEY, {})[hn] || null;

export const getNcdQueueRows = () => {
  const checkedIn = readJson(CHECKED_IN_KEY, {});
  const statusStore = readJson(VISIT_STATUS_KEY, {});
  const checkedInRows = NCD_SCHEDULED_TODAY
    .filter((p) => checkedIn[p.hn])
    .map((p, idx) => ({
      ...p,
      queue: `W-${String(idx + 1).padStart(3, '0')}`,
      room: p.clinic,
      statusKey: 'waiting',
      waitMinutes: 0,
    }));
  return [...NCD_PATIENTS, ...checkedInRows].map((row) => {
    const o = statusStore[row.hn];
    return o && o.statusKey !== 'cancelled' ? { ...row, statusKey: o.statusKey } : row;
  });
};

/* ── Visit records — การติดตามการดูแล (TOR 1.10.2.8) ─────────────── */

export const saveNcdVisitRecord = (hn, record) => {
  if (!hn) return;
  const store = readJson(VISIT_HISTORY_KEY, {});
  store[hn] = [...(store[hn] || []), record];
  writeJson(VISIT_HISTORY_KEY, store);
};

/* Static follow-up dataset — one year of visits per patient so the
   follow-up page's ตาราง + กราฟ have real trends to show. ISO dates so the
   date-range filter can compare. `dental` / `xray` are static mock rows
   (NOT imported from the dental module — file-scope rule, playbook §4). */
export const NCD_FOLLOWUP_VISITS = {
  '67-00012': [
    { date: '2025-09-08', type: 'ตรวจตามนัด', bp: '152/94', sbp: 152, dbp: 94, pulse: 84, weight: 71.2, fbs: 168, hba1c: 8.4, ldl: 152, egfr: 68, pefr: null, spo2: 97, exam: 'ชาปลายเท้าเล็กน้อย ชีพจรหลังเท้าปกติ', dental: null, xray: null, note: 'ปรับยา Metformin เพิ่มขนาด' },
    { date: '2025-11-10', type: 'ตรวจตามนัด', bp: '148/90', sbp: 148, dbp: 90, pulse: 82, weight: 70.4, fbs: 154, hba1c: null, ldl: null, egfr: null, pefr: null, spo2: 98, exam: 'ตรวจเท้า — ผิวแห้ง ไม่มีแผล', dental: 'ขูดหินปูน + แนะนำการแปรงฟัน', xray: null, note: 'นัดเจาะ HbA1c ครั้งถัดไป' },
    { date: '2026-01-12', type: 'ตรวจตามนัด', bp: '142/88', sbp: 142, dbp: 88, pulse: 80, weight: 69.6, fbs: 141, hba1c: 7.8, ldl: 138, egfr: 66, pefr: null, spo2: 98, exam: 'ตรวจตา — ส่งจอประสาทตาประจำปี', dental: null, xray: 'CXR — ขนาดหัวใจปกติ ปอดใส', note: 'เริ่มคุมอาหารร่วมกับนักโภชนาการ' },
    { date: '2026-03-16', type: 'ตรวจตามนัด', bp: '138/86', sbp: 138, dbp: 86, pulse: 78, weight: 68.8, fbs: 132, hba1c: null, ldl: null, egfr: null, pefr: null, spo2: 98, exam: 'ชีพจรหลังเท้าปกติ ไม่มีแผล', dental: null, xray: null, note: 'แนวโน้มดีขึ้น คงยาเดิม' },
    { date: '2026-05-18', type: 'ตรวจตามนัด', bp: '134/84', sbp: 134, dbp: 84, pulse: 76, weight: 68.1, fbs: 126, hba1c: 7.1, ldl: 121, egfr: 70, pefr: null, spo2: 99, exam: 'ตรวจเท้าประจำปี — monofilament ปกติ', dental: 'ตรวจช่องปากประจำปี — ปกติ', xray: null, note: 'ควบคุมได้ดีขึ้นต่อเนื่อง' },
    { date: '2026-07-20', type: 'ตรวจตามนัด', bp: '132/82', sbp: 132, dbp: 82, pulse: 76, weight: 67.5, fbs: 118, hba1c: 6.9, ldl: 112, egfr: 72, pefr: null, spo2: 99, exam: 'ไม่พบภาวะแทรกซ้อนใหม่', dental: null, xray: null, note: 'HbA1c < 7 ครั้งแรก — ชมเชยผู้ป่วย' },
  ],
  '67-00009': [
    { date: '2025-10-06', type: 'ตรวจตามนัด', bp: '146/92', sbp: 146, dbp: 92, pulse: 80, weight: 74.0, fbs: 96, hba1c: null, ldl: 142, egfr: 82, pefr: null, spo2: 98, exam: 'หัวใจ-ปอดปกติ', dental: null, xray: null, note: 'เพิ่ม Amlodipine 5 mg' },
    { date: '2026-01-05', type: 'ตรวจตามนัด', bp: '140/88', sbp: 140, dbp: 88, pulse: 78, weight: 73.2, fbs: 94, hba1c: null, ldl: 128, egfr: 84, pefr: null, spo2: 98, exam: 'ไม่มีอาการเวียนศีรษะ', dental: 'อุดฟันกราม 1 ซี่', xray: null, note: 'ยาเดิม วัด BP ที่บ้านต่อเนื่อง' },
    { date: '2026-04-07', type: 'Telemedicine', bp: '136/84', sbp: 136, dbp: 84, pulse: 76, weight: 72.8, fbs: null, hba1c: null, ldl: null, egfr: null, pefr: null, spo2: null, exam: 'ปรึกษาทางไกล — ทบทวน home BP log', dental: null, xray: null, note: 'BP ที่บ้านเฉลี่ย 134/82' },
    { date: '2026-07-06', type: 'ตรวจตามนัด', bp: '132/80', sbp: 132, dbp: 80, pulse: 74, weight: 72.1, fbs: 92, hba1c: null, ldl: 118, egfr: 86, pefr: null, spo2: 99, exam: 'ตรวจร่างกายปกติ', dental: null, xray: 'CXR ประจำปี — ปกติ', note: 'ควบคุมได้ ลดนัดเป็นทุก 3 เดือน' },
  ],
  '67-00007': [
    { date: '2025-12-15', type: 'ตรวจตามนัด', bp: '128/80', sbp: 128, dbp: 80, pulse: 78, weight: 62.4, fbs: 138, hba1c: 7.4, ldl: 132, egfr: 88, pefr: null, spo2: 99, exam: 'ตรวจเท้า — ปกติ', dental: null, xray: null, note: 'เน้นลดของหวานหลังอาหาร' },
    { date: '2026-03-16', type: 'ตรวจตามนัด', bp: '126/78', sbp: 126, dbp: 78, pulse: 76, weight: 61.8, fbs: 121, hba1c: 6.8, ldl: 120, egfr: 90, pefr: null, spo2: 99, exam: 'ตรวจตาประจำปี — ไม่พบ DR', dental: 'ตรวจช่องปากประจำปี — เหงือกอักเสบเล็กน้อย', xray: null, note: 'ควบคุมได้' },
    { date: '2026-06-15', type: 'ตรวจตามนัด', bp: '124/78', sbp: 124, dbp: 78, pulse: 74, weight: 61.2, fbs: 116, hba1c: 6.6, ldl: 112, egfr: 91, pefr: null, spo2: 99, exam: 'ไม่พบภาวะแทรกซ้อน', dental: null, xray: null, note: 'คงแผนการรักษาเดิม' },
  ],
  '67-00023': [
    { date: '2026-02-09', type: 'ตรวจตามนัด', bp: '118/74', sbp: 118, dbp: 74, pulse: 82, weight: 55.0, fbs: null, hba1c: null, ldl: null, egfr: null, pefr: 320, spo2: 97, exam: 'wheezing เล็กน้อยขณะหายใจออก', dental: null, xray: null, note: 'กำเริบกลางคืน 2 ครั้ง/สัปดาห์ — step up ICS' },
    { date: '2026-04-13', type: 'ตรวจตามนัด', bp: '116/72', sbp: 116, dbp: 72, pulse: 78, weight: 55.4, fbs: null, hba1c: null, ldl: null, egfr: null, pefr: 360, spo2: 98, exam: 'ปอดใส ไม่มี wheezing', dental: null, xray: 'CXR — ปกติ', note: 'ทบทวนเทคนิคพ่นยา — ถูกต้อง' },
    { date: '2026-06-08', type: 'Telemedicine', bp: null, sbp: null, dbp: null, pulse: null, weight: null, fbs: null, hba1c: null, ldl: null, egfr: null, pefr: 380, spo2: null, exam: 'ปรึกษาทางไกล — อาการสงบ', dental: null, xray: null, note: 'ไม่มีอาการกำเริบใน 4 สัปดาห์' },
    { date: '2026-07-27', type: 'ตรวจตามนัด', bp: '118/74', sbp: 118, dbp: 74, pulse: 76, weight: 55.6, fbs: null, hba1c: null, ldl: null, egfr: null, pefr: 400, spo2: 99, exam: 'ปอดใส PEFR ดีขึ้นต่อเนื่อง', dental: 'ตรวจช่องปากประจำปี — ปกติ', xray: null, note: 'คุมอาการได้ — คงยาเดิม' },
  ],
  '67-00018': [
    { date: '2025-11-24', type: 'ตรวจตามนัด', bp: '134/84', sbp: 134, dbp: 84, pulse: 88, weight: 58.2, fbs: null, hba1c: null, ldl: null, egfr: null, pefr: 210, spo2: 93, exam: 'หายใจลำบากเมื่อเดินขึ้นบันได (mMRC 2)', dental: null, xray: 'CXR — hyperinflation คงเดิม', note: 'แนะนำเลิกบุหรี่ + วัคซีนไข้หวัดใหญ่' },
    { date: '2026-02-23', type: 'ตรวจตามนัด', bp: '132/82', sbp: 132, dbp: 82, pulse: 86, weight: 57.8, fbs: null, hba1c: null, ldl: null, egfr: null, pefr: 220, spo2: 94, exam: 'เสียงปอดลดลงทั้งสองข้าง ไม่มี acute exacerbation', dental: 'ถอนฟันผุ 1 ซี่', xray: null, note: 'เข้าโปรแกรมฟื้นฟูสมรรถภาพปอด' },
    { date: '2026-06-22', type: 'ตรวจตามนัด', bp: '130/80', sbp: 130, dbp: 80, pulse: 84, weight: 58.0, fbs: null, hba1c: null, ldl: null, egfr: null, pefr: 235, spo2: 95, exam: 'เดินได้ไกลขึ้น (mMRC 1) เทคนิคพ่นยาถูกต้อง', dental: null, xray: null, note: 'ไม่มีกำเริบใน 3 เดือน' },
  ],
};

/** ตาราง/กราฟติดตาม — static dataset merged with visits confirmed this
    session, filtered to the chosen ช่วงเวลา (inclusive ISO date strings). */
export const getNcdFollowUpVisits = (hn, fromIso, toIso) => {
  const stored = readJson(VISIT_HISTORY_KEY, {});
  const all = [...(NCD_FOLLOWUP_VISITS[hn] || []), ...(stored[hn] || [])];
  return all
    .filter((v) => (!fromIso || v.date >= fromIso) && (!toIso || v.date <= toIso))
    .sort((a, b) => a.date.localeCompare(b.date));
};

export const getNcdVisitCount = (hn) =>
  (NCD_FOLLOWUP_VISITS[hn] || []).length + (readJson(VISIT_HISTORY_KEY, {})[hn] || []).length;

/* ── Per-patient control stats (follow-up gauges) ─────────────────
   DmControlGaugeCard / HtControlGaugeCard default to POPULATION-level
   ปีงบฯ 2569 aggregates — the follow-up page overrides title/value/label/
   sub with these per-patient semantics so the card can't be misread as a
   dashboard stat. */
export const computeNcdControlStats = (visits) => {
  const hba1cVisits = visits.filter((v) => v.hba1c != null);
  const bpVisits = visits.filter((v) => v.sbp != null && v.dbp != null);
  const pefrVisits = visits.filter((v) => v.pefr != null);
  const dmControlled = hba1cVisits.filter((v) => v.hba1c < 7).length;
  const htControlled = bpVisits.filter((v) => v.sbp < 140 && v.dbp < 90).length;
  const last = (arr, key) => (arr.length ? arr[arr.length - 1][key] : null);
  return {
    dmVisitCount: hba1cVisits.length,
    dmControlPct: hba1cVisits.length ? Math.round((dmControlled / hba1cVisits.length) * 1000) / 10 : null,
    latestHba1c: last(hba1cVisits, 'hba1c'),
    latestFbs: last(visits.filter((v) => v.fbs != null), 'fbs'),
    htVisitCount: bpVisits.length,
    htControlPct: bpVisits.length ? Math.round((htControlled / bpVisits.length) * 1000) / 10 : null,
    latestBp: last(bpVisits, 'bp'),
    pefrVisitCount: pefrVisits.length,
    latestPefr: last(pefrVisits, 'pefr'),
    firstPefr: pefrVisits.length ? pefrVisits[0].pefr : null,
  };
};

/* ─── แบบประเมิน NCD ตามรูปแบบที่ผู้ใช้งานกำหนด (TOR 1.10.2.7) ────────
   Per-disease assessment templates — the "user-configured form" is mocked
   as a curated template per disease group; a real form-builder integration
   (src/components/form-builder) is a follow-up (noted in manifest).
   Field types: 'text' | 'choice' (ใช่/ไม่ใช่) | 'select'. */

export const NCD_ASSESSMENT_TEMPLATES = {
  dm: {
    label: 'แบบประเมินเบาหวาน (DM)',
    fields: [
      { key: 'smbg',          label: 'ผลน้ำตาลปลายนิ้วที่บ้าน (SMBG)', type: 'text', placeholder: 'เช่น 110-140 mg/dL ก่อนอาหารเช้า' },
      { key: 'hypoEpisode',   label: 'มีอาการน้ำตาลต่ำ (ใจสั่น เหงื่อแตก) ใน 1 เดือน', type: 'choice' },
      { key: 'footNumbness',  label: 'อาการชาปลายมือปลายเท้า', type: 'choice' },
      { key: 'footWound',     label: 'มีแผลที่เท้าที่หายช้า', type: 'choice' },
      { key: 'eyeExamYear',   label: 'ตรวจจอประสาทตาครั้งล่าสุด', type: 'select', options: [
        { value: 'thisYear', label: 'ภายใน 1 ปี' }, { value: 'over1y', label: 'เกิน 1 ปี' }, { value: 'never', label: 'ไม่เคยตรวจ' },
      ] },
      { key: 'medAdherence',  label: 'การกินยาสม่ำเสมอ', type: 'select', options: [
        { value: 'regular', label: 'กินสม่ำเสมอ' }, { value: 'missSome', label: 'ลืมบางมื้อ' }, { value: 'irregular', label: 'ไม่สม่ำเสมอ' },
      ] },
    ],
  },
  ht: {
    label: 'แบบประเมินความดันโลหิตสูง (HT)',
    fields: [
      { key: 'homeBpLog',     label: 'ค่าความดันที่วัดเองที่บ้าน (Home BP)', type: 'text', placeholder: 'เช่น เฉลี่ยเช้า 134/82 เย็น 130/80' },
      { key: 'headache',      label: 'ปวดศีรษะท้ายทอย / เวียนศีรษะ', type: 'choice' },
      { key: 'saltyDiet',     label: 'กินเค็ม / ใช้น้ำปลา-ซอสปรุงรสเป็นประจำ', type: 'choice' },
      { key: 'medAdherence',  label: 'การกินยาสม่ำเสมอ', type: 'select', options: [
        { value: 'regular', label: 'กินสม่ำเสมอ' }, { value: 'missSome', label: 'ลืมบางมื้อ' }, { value: 'irregular', label: 'ไม่สม่ำเสมอ' },
      ] },
      { key: 'sideEffect',    label: 'อาการข้างเคียงจากยา (ไอแห้ง บวม อ่อนเพลีย)', type: 'choice' },
    ],
  },
  asthma: {
    label: 'แบบประเมินหอบหืด (Asthma)',
    fields: [
      { key: 'daySymptoms',   label: 'อาการหอบตอนกลางวัน > 2 ครั้ง/สัปดาห์', type: 'choice' },
      { key: 'nightWaking',   label: 'ตื่นกลางคืนเพราะอาการหอบ', type: 'choice' },
      { key: 'relieverUse',   label: 'ใช้ยาพ่นฉุกเฉิน > 2 ครั้ง/สัปดาห์', type: 'choice' },
      { key: 'triggers',      label: 'สิ่งกระตุ้นอาการ (Aggravating factors)', type: 'text', placeholder: 'เช่น ฝุ่น PM2.5, ไรฝุ่น, ขนสัตว์, อากาศเย็น' },
      { key: 'inhalerTech',   label: 'เทคนิคการพ่นยา', type: 'select', options: [
        { value: 'correct', label: 'ถูกต้อง' }, { value: 'needCoach', label: 'ต้องฝึกเพิ่ม' }, { value: 'incorrect', label: 'ไม่ถูกต้อง' },
      ] },
    ],
  },
  copd: {
    label: 'แบบประเมินถุงลมโป่งพอง (COPD)',
    fields: [
      { key: 'mmrc',          label: 'ระดับอาการเหนื่อย (mMRC)', type: 'select', options: [
        { value: '0', label: '0 — เหนื่อยเมื่อออกแรงหนัก' }, { value: '1', label: '1 — เหนื่อยเมื่อเดินเร็ว/ขึ้นเนิน' },
        { value: '2', label: '2 — เดินช้ากว่าคนวัยเดียวกัน' }, { value: '3', label: '3 — ต้องหยุดพักเมื่อเดิน ~100 ม.' },
        { value: '4', label: '4 — เหนื่อยจนออกจากบ้านไม่ได้' },
      ] },
      { key: 'exacerbation',  label: 'อาการกำเริบใน 3 เดือนที่ผ่านมา', type: 'choice' },
      { key: 'smokingNow',    label: 'ยังสูบบุหรี่อยู่', type: 'choice' },
      { key: 'triggers',      label: 'สิ่งกระตุ้นอาการ (Aggravating factors)', type: 'text', placeholder: 'เช่น ควันบุหรี่, ฝุ่นจากงาน, อากาศเย็น' },
      { key: 'inhalerTech',   label: 'เทคนิคการพ่นยา', type: 'select', options: [
        { value: 'correct', label: 'ถูกต้อง' }, { value: 'needCoach', label: 'ต้องฝึกเพิ่ม' }, { value: 'incorrect', label: 'ไม่ถูกต้อง' },
      ] },
    ],
  },
};

/* ─── Default record form state (NcdFormPage) ────────────────────── */

export const NCD_DEFAULT_VITALS = { bp: '132/84', hr: 78, temp: 36.6, rr: 18, spo2: 98, weight: 68.0, height: 165 };

export const DEFAULT_NCD_VISIT = {
  // Step 2 — ประเมิน NCD (TOR 1.10.2.7)
  illnessHistoryNote: '',       // ประวัติการเจ็บป่วย
  familyHistory: {},            // keyed SelectableTags
  familyHistoryNote: '',
  behaviorFlags: {},            // พฤติกรรมสุขภาพ keyed tags
  behaviorNote: '',
  activeTemplate: '',           // which disease template tab is open
  templateAnswers: {},          // { [diseaseKey]: { [fieldKey]: value } }

  // Step 3 — ตรวจร่างกาย
  vitals: { ...NCD_DEFAULT_VITALS },
  fbs: '',
  pefr: '',
  footExam: '',                 // DM foot exam summary
  lungSound: '',
  physicalExamNote: '',

  // Step 4 — วินิจฉัย + คำสั่งการรักษา (TOR 1.10.2.3/.5)
  diagnosisNote: '',
  icd10: '',
  controlStatus: '',            // NCD_SEVERITY_OPTIONS value
  adviceNote: '',
  // Step5Orders (CPOE — reuse from TreatmentSteps) form contract:
  orderCategory: 'medication',
  medications: [],
  labs: [],
  xrayOrders: [],
  procedureOrders: [],
  consultOrders: [],
  showAllergyAlert: true,

  // Step 5 — เอกสารแนบเพิ่มเติม (TOR 1.10.2.4)
  attachments: [],              // { id, name, sizeLabel, type, addedAt }

  // Step 6 — นัดหมายติดตาม
  appointment: {
    date: '', time: '',
    mode: 'onsite',             // 'onsite' | 'telemedicine'
    telemedStatus: 'none',      // 'none' | 'started' | 'completed'
    note: '',
    skipped: false,             // ไม่ทุกวิสิตต้องนัด — ข้ามได้
  },
};

const hasText = (v) => typeof v === 'string' && v.trim() !== '';

/** Array of 6 booleans driving StepProgress check marks — same contract as
    getAncCompletedSteps / getTreatmentCompletedSteps. */
export const getNcdCompletedSteps = (form, stepIndex = 0) => [
  stepIndex > 0,                                                       // 1 — read-only ผลการซักประวัติ
  hasText(form?.illnessHistoryNote)
    || Object.values(form?.behaviorFlags || {}).some(Boolean)
    || Object.keys(form?.templateAnswers || {}).length > 0,            // 2 — assessment touched
  stepIndex > 2,                                                       // 3 — exam (no hard requirement)
  hasText(form?.diagnosisNote) && !!form?.icd10,                       // 4 — วินิจฉัย required
  stepIndex > 4,                                                       // 5 — attachments optional
  !!form?.appointment?.date || !!form?.appointment?.skipped,           // 6 — booked or explicitly skipped
];

/* นัดหมาย — mock slot map for conflict validation (Step 6). */
export const NCD_APPOINTMENT_TIMES = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '13:00', '13:30', '14:00', '14:30', '15:00',
];

export const NCD_BOOKED_SLOTS = [
  { date: '2026-08-10', time: '09:00' },
  { date: '2026-08-10', time: '10:30' },
  { date: '2026-08-17', time: '13:00' },
];

export const isNcdSlotBooked = (dateIso, time) =>
  NCD_BOOKED_SLOTS.some((s) => s.date === dateIso && s.time === time);

/* ─── SuggestibleTextarea word-lists ─────────────────────────────── */

export const NCD_ILLNESS_HISTORY_SUGGESTIONS = [
  'ควบคุมระดับน้ำตาลได้ดีขึ้นในช่วง 3 เดือนที่ผ่านมา',
  'มีอาการใจสั่น เหงื่อแตก ช่วงก่อนมื้ออาหาร',
  'ปวดศีรษะท้ายทอยตอนเช้า',
  'หอบเหนื่อยเมื่อออกแรง อาการกำเริบกลางคืน',
  'ไอเรื้อรัง มีเสมหะช่วงเช้า',
  'น้ำหนักลดโดยไม่ทราบสาเหตุ',
  'ชาปลายมือปลายเท้าทั้งสองข้าง',
  'ไม่มีอาการผิดปกติ มาตรวจตามนัด',
];

export const NCD_FAMILY_HISTORY_ITEMS = [
  { key: 'dm',     label: 'เบาหวาน' },
  { key: 'ht',     label: 'ความดันโลหิตสูง' },
  { key: 'heart',  label: 'โรคหัวใจและหลอดเลือด' },
  { key: 'stroke', label: 'อัมพฤกษ์/อัมพาต (Stroke)' },
  { key: 'asthma', label: 'หอบหืด/ภูมิแพ้' },
  { key: 'cancer', label: 'มะเร็ง' },
  { key: 'ckd',    label: 'โรคไตเรื้อรัง' },
];

export const NCD_FAMILY_HISTORY_SUGGESTIONS = [
  'บิดาเป็นเบาหวานชนิดที่ 2',
  'มารดาเป็นความดันโลหิตสูง',
  'พี่น้องเป็นโรคหอบหืด',
  'ไม่มีประวัติโรคเรื้อรังในครอบครัว',
  'ญาติสายตรงเสียชีวิตจากโรคหลอดเลือดสมอง',
];

export const NCD_BEHAVIOR_ITEMS = [
  { key: 'smoking',      label: 'สูบบุหรี่' },
  { key: 'alcohol',      label: 'ดื่มแอลกอฮอล์' },
  { key: 'saltyFood',    label: 'กินเค็ม' },
  { key: 'sweetFood',    label: 'กินหวาน/น้ำอัดลม' },
  { key: 'noExercise',   label: 'ไม่ออกกำลังกาย' },
  { key: 'stress',       label: 'เครียด/พักผ่อนน้อย' },
];

export const NCD_BEHAVIOR_SUGGESTIONS = [
  'ออกกำลังกายเดินเร็ววันละ 30 นาที สัปดาห์ละ 5 วัน',
  'เลิกบุหรี่ได้ 6 เดือนแล้ว',
  'ลดปริมาณข้าว-แป้งตามคำแนะนำนักโภชนาการ',
  'ยังดื่มกาแฟ 3 แก้ว/วัน ใส่น้ำตาล',
  'ทำงานกลางคืน พักผ่อนไม่เป็นเวลา',
];

export const NCD_PHYSICAL_EXAM_SUGGESTIONS = [
  'หัวใจและปอดปกติ ไม่มีเสียงผิดปกติ',
  'ตรวจเท้า — ผิวแห้ง ไม่มีแผล ชีพจรหลังเท้าปกติ',
  'monofilament test ปกติทั้งสองข้าง',
  'ฟัง wheezing เล็กน้อยขณะหายใจออก',
  'เสียงปอดลดลงทั้งสองข้าง',
  'ไม่มีอาการบวมที่ขาทั้งสองข้าง',
];

export const NCD_DIAGNOSIS_SUGGESTIONS = [
  'เบาหวานชนิดที่ 2 ควบคุมได้ (T2DM, well controlled)',
  'เบาหวานชนิดที่ 2 ควบคุมไม่ได้ (T2DM, poorly controlled)',
  'ความดันโลหิตสูง ควบคุมได้ (HT, controlled)',
  'ความดันโลหิตสูง ควบคุมไม่ได้ (HT, uncontrolled)',
  'หอบหืดระดับควบคุมได้บางส่วน (Partly controlled asthma)',
  'ถุงลมโป่งพอง อาการคงที่ (Stable COPD)',
  'เบาหวานร่วมกับความดันโลหิตสูง (DM with HT)',
  'สงสัยภาวะแทรกซ้อนทางไต — ส่งตรวจเพิ่มเติม',
];

export const NCD_ADVICE_SUGGESTIONS = [
  'กินยาสม่ำเสมอ ห้ามหยุดยาเอง',
  'ลดอาหารเค็ม-หวาน-มัน เพิ่มผักผลไม้',
  'ออกกำลังกายสม่ำเสมออย่างน้อย 150 นาที/สัปดาห์',
  'วัดความดัน/เจาะน้ำตาลปลายนิ้วที่บ้านและจดบันทึก',
  'สังเกตแผลที่เท้าทุกวัน สวมรองเท้าหุ้มส้น',
  'พกยาพ่นฉุกเฉินติดตัวเสมอ',
  'หลีกเลี่ยงฝุ่น PM2.5 และควันบุหรี่',
  'มาตรวจตามนัดครั้งถัดไป หากอาการกำเริบให้มาก่อนนัด',
];
