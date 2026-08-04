/* tbVisits.js — บันทึกการรักษาคลินิกวัณโรค (TOR §1.10.4.3–.5, .7) mock store.
   Form defaults + suggestion corpora for every SuggestibleTextarea in
   TbSteps.jsx, the visit-status store (sessionStorage — same contract as
   ncdVisits), and the mock clinic-rights switch used by the confidential
   masking rule (§1.4.2 — TB diagnosis is stigmatized data). */

import { TB_DOCTORS } from '@/data/tbRegistry';

export const TB_CURRENT_USER = { name: 'พว.เพ็ญศรี สุขใจ', role: 'พยาบาลวิชาชีพ คลินิกวัณโรค' };

/* ── Mock clinic-rights switch ────────────────────────────────────────
   sessionStorage 'mih:tb-clinic-readonly' = '1' simulates a user role
   WITHOUT TB-clinic rights: registry becomes a masked read-only view,
   the visit form is inert, and screening rows hide diagnosis detail. */
const ROLE_KEY = 'mih:tb-clinic-readonly';

export const canEditTb = () => {
  try { return sessionStorage.getItem(ROLE_KEY) !== '1'; } catch { return true; }
};

/* Setter คู่กับ canEditTb — ให้หน้าทะเบียนสลับโหมด "สิทธิ์ดูได้อย่างเดียว"
   ได้เพื่อสาธิต/ตรวจรับ (สัญญาเดียวกับ setMentalHealthRights ของสุขภาพจิต).
   `readOnly === true` = ผู้ใช้ไม่มีสิทธิแก้ไขคลินิกวัณโรค. */
export const setTbClinicReadOnly = (readOnly) => {
  try {
    if (readOnly) sessionStorage.setItem(ROLE_KEY, '1');
    else sessionStorage.removeItem(ROLE_KEY);
  } catch { /* mock only */ }
  return !readOnly;
};

/* ชื่อผู้ป่วยแบบปกปิด (§1.4.2) — 'นายกิตติ ศรีสมบูรณ์' → 'นายกิ*** ศ***' */
export const maskTbName = (name = '') => {
  const parts = String(name).trim().split(/\s+/);
  return parts
    .map((p, i) => (i === 0 ? `${p.slice(0, 5)}***` : `${p.slice(0, 1)}***`))
    .join(' ');
};

/* ── Visit form defaults ─────────────────────────────────────────── */

export const TB_SYMPTOM_ITEMS = [
  { key: 'cough2w',     label: 'ไอเรื้อรังเกิน 2 สัปดาห์' },
  { key: 'sputum',      label: 'ไอมีเสมหะ' },
  { key: 'bloodSputum', label: 'ไอมีเลือดปน' },
  { key: 'fever',       label: 'ไข้ต่ำ ๆ ช่วงบ่าย/เย็น' },
  { key: 'nightSweat',  label: 'เหงื่อออกกลางคืน' },
  { key: 'weightLoss',  label: 'น้ำหนักลด' },
  { key: 'anorexia',    label: 'เบื่ออาหาร อ่อนเพลีย' },
  { key: 'chestPain',   label: 'เจ็บหน้าอก' },
];

export const TB_SPUTUM_COLORS = [
  { value: 'white',  label: 'ขาวใส' },
  { value: 'yellow', label: 'เหลือง' },
  { value: 'green',  label: 'เขียว' },
  { value: 'blood',  label: 'ปนเลือด' },
];

export const TB_BCG_OPTIONS = [
  { value: 'scar',    label: 'เคยได้รับ — มีแผลเป็น BCG' },
  { value: 'noScar',  label: 'เคยได้รับ — ไม่พบแผลเป็น' },
  { value: 'never',   label: 'ไม่เคยได้รับวัคซีน BCG' },
  { value: 'unknown', label: 'ไม่ทราบ' },
];

export const TB_DIAGNOSIS_STATUS = [
  { value: 'suspect',   label: 'สงสัยวัณโรค (รอผลตรวจยืนยัน)' },
  { value: 'confirmed', label: 'ยืนยันวัณโรค' },
  { value: 'notTb',     label: 'ไม่ใช่วัณโรค' },
];

export const TB_FINAL_STATUS = [
  { value: 'continue', label: 'นัดรักษาต่อเนื่อง' },
  { value: 'refer',    label: 'ส่งต่อสถานพยาบาลอื่น' },
  { value: 'complete', label: 'ครบการรักษา — เตรียมปิดทะเบียน' },
  { value: 'observe',  label: 'เฝ้าระวัง / รอผลตรวจ' },
];

export const TB_DOCTOR_OPTIONS = TB_DOCTORS.map((d) => ({ value: d, label: d }));

export const TB_APPOINTMENT_TIMES = ['08:30', '09:00', '09:30', '10:00', '10:30', '13:00', '13:30', '14:00'];

/* Slot fullness mock — วันพุธช่วง 09:00 เต็ม (deterministic, no random). */
export const isTbSlotBooked = (dateIso, time) => {
  if (!dateIso || !time) return false;
  const d = new Date(dateIso);
  return d.getDay() === 3 && time === '09:00';
};

export const DEFAULT_TB_VISIT = {
  // Step 1 — ประวัติ + อาการวัณโรค (triage ดึง read-only จาก tbQueue)
  symptoms: {},               // keyed TB_SYMPTOM_ITEMS
  sputumColor: '',
  symptomDurationWeeks: '',
  bcgHistory: '',
  historyNote: '',

  // Step 2 — ตรวจร่างกาย / EMR
  lungExamNote: '',
  physicalExamNote: '',

  // Step 3 — วินิจฉัย
  diseaseSite: '',            // 'pulmonary' | 'extrapulmonary'
  epSite: '',
  diagnosisStatus: '',        // TB_DIAGNOSIS_STATUS
  diagnosisNote: '',

  // Step 4 — สั่งการรักษา (CPOE) + สูตรยา + DOT + VOT
  regimen: '',                // TB_REGIMENS value
  regimenWeightKg: '',
  allergyOverrideNote: '',    // required when regimen conflicts กับแพ้ยา
  dotObserverType: '',
  dotObserverName: '',
  votEnabled: false,
  // Step5Orders (CPOE reuse) form contract:
  orderCategory: 'lab',
  medications: [],
  labs: [],
  xrayOrders: [],
  procedureOrders: [],
  consultOrders: [],
  showAllergyAlert: true,

  // Step 5 — เอกสารแนบ
  attachments: [],

  // Step 6 — นัดหมาย + สรุป
  appointment: { date: '', time: '', mode: 'onsite', note: '', skipped: false },
  doctor: '',
  finalStatus: '',
};

/* Stepper ticks — a step counts as "completed" when its key fields hold
   data (same heuristic as getNcdCompletedSteps). */
export const getTbCompletedSteps = (form) => {
  const done = [];
  if (Object.values(form.symptoms).some(Boolean) || form.bcgHistory || form.historyNote.trim()) done.push(0);
  if (form.physicalExamNote.trim() || form.lungExamNote.trim()) done.push(1);
  if (form.diagnosisStatus && form.diseaseSite) done.push(2);
  if (form.regimen || form.labs.length > 0 || form.xrayOrders.length > 0 || form.medications.length > 0) done.push(3);
  if (form.attachments.length > 0) done.push(4);
  if (form.doctor && form.finalStatus) done.push(5);
  return done;
};

/* ── Visit status (per HN, per session) ──────────────────────────── */

const STATUS_KEY = 'mih:tb-visit-status';

const readStatuses = () => {
  try { return JSON.parse(sessionStorage.getItem(STATUS_KEY)) || {}; } catch { return {}; }
};

export const getTbVisitStatus = (hn) => readStatuses()[hn] || null;

export const setTbVisitStatus = (hn, statusKey, extra = {}) => {
  const all = readStatuses();
  all[hn] = { statusKey, at: new Date().toISOString(), by: TB_CURRENT_USER.name, ...extra };
  try { sessionStorage.setItem(STATUS_KEY, JSON.stringify(all)); } catch { /* mock only */ }
};

/* ── Suggestion corpora (ทุก SuggestibleTextarea ต้องมี) ──────────── */

export const TB_HISTORY_SUGGESTIONS = [
  'ไอมีเสมหะสีเหลืองมา 3 สัปดาห์ ไม่ตอบสนองต่อยาปฏิชีวนะ',
  'มีประวัติสัมผัสผู้ป่วยวัณโรคร่วมบ้านในช่วง 1 ปีที่ผ่านมา',
  'น้ำหนักลด 4 กก. ใน 2 เดือน ร่วมกับเหงื่อออกกลางคืน',
  'เคยรักษาวัณโรคมาก่อนและรับประทานยาครบตามกำหนด',
  'ปฏิเสธการเจ็บป่วยเรื้อรังอื่น ปฏิเสธการแพ้ยา',
];

export const TB_EXAM_SUGGESTIONS = [
  'ฟังปอดพบ crepitation บริเวณปอดขวาส่วนบน',
  'เสียงหายใจลดลงบริเวณชายปอดซ้าย ไม่พบ wheezing',
  'ต่อมน้ำเหลืองที่คอโตขนาด 2 ซม. กดไม่เจ็บ ผิวหนังปกติ',
  'ผอมกว่าเกณฑ์ BMI 17.5 ซีดเล็กน้อย ไม่มีนิ้วปุ้ม (clubbing)',
  'ตรวจร่างกายระบบอื่นอยู่ในเกณฑ์ปกติ',
];

export const TB_DIAGNOSIS_SUGGESTIONS = [
  'Pulmonary TB, smear positive — เริ่มสูตรยา CAT-1 และขึ้นทะเบียน',
  'Pulmonary TB, smear negative รอผล GeneXpert ยืนยัน',
  'TB lymphadenitis (วัณโรคต่อมน้ำเหลือง) — ยืนยันจากผล biopsy',
  'สงสัยวัณโรคปอด — ส่งเสมหะ AFB 3 ครั้ง + CXR ติดตาม',
  'ไม่พบหลักฐานวัณโรค — วินิจฉัยเป็นปอดอักเสบจากเชื้อแบคทีเรีย',
];

export const TB_ADVICE_SUGGESTIONS = [
  'กินยาต่อหน้าผู้กำกับทุกวัน ห้ามหยุดยาเองแม้อาการดีขึ้น',
  'ปิดปากจมูกเวลาไอจาม แยกห้องนอนช่วง 2 สัปดาห์แรกของการรักษา',
  'สังเกตอาการแพ้ยา ตาเหลือง คลื่นไส้ ชาปลายมือ — มาก่อนนัดทันที',
  'พาผู้สัมผัสร่วมบ้านทุกคนมาคัดกรองวัณโรคที่ศูนย์ฯ',
  'งดเครื่องดื่มแอลกอฮอล์ตลอดการรักษา เพื่อลดผลข้างเคียงต่อตับ',
];

export const TB_APPOINTMENT_SUGGESTIONS = [
  'นัดรับยาเดือนถัดไป พร้อมเก็บเสมหะส่งตรวจก่อนพบแพทย์',
  'งดน้ำงดอาหารเช้าวันนัดเพื่อเจาะเลือดติดตามการทำงานของตับ',
  'นำกล่องยาและสมุดบันทึกการกินยา (DOT) มาด้วยทุกครั้ง',
  'หากไอเป็นเลือดหรือไข้สูงให้มาก่อนนัดทันที',
  'นัด VOT ผ่าน Telemedicine ตามเวลาเดิมทุกวันทำการ',
];

export const TB_CANCEL_REASON_SUGGESTIONS = [
  'ผู้รับบริการขอยุติการตรวจกลางคัน',
  'บันทึกผิดคน — เปิดบันทึกใหม่ให้ผู้รับบริการที่ถูกต้อง',
  'ส่งต่อโรงพยาบาลทันทีระหว่างการตรวจ',
  'ข้อมูลซ้ำซ้อนกับการบันทึกครั้งก่อน',
];

export const TB_OVERRIDE_SUGGESTIONS = [
  'ทดสอบ challenge dose ภายใต้การดูแลแล้ว — ไม่พบปฏิกิริยาแพ้',
  'ปรึกษาอายุรแพทย์โรคติดเชื้อแล้ว ให้ใช้สูตรเดิมร่วมกับ antihistamine',
  'ประวัติแพ้ไม่ชัดเจน (ผื่นเล็กน้อยปี 2560) — เฝ้าระวังใกล้ชิด 2 สัปดาห์',
];

export const TB_DOT_NOTE_SUGGESTIONS = [
  'กินยาต่อหน้า อสส. ครบถ้วน ไม่มีอาการข้างเคียง',
  'ผู้ป่วยแจ้งคลื่นไส้หลังกินยา แนะนำกินพร้อมอาหาร',
  'ติดต่อไม่ได้ทางโทรศัพท์ — ประสานเยี่ยมบ้านพรุ่งนี้',
  'ทำ VOT ผ่าน Telemedicine เห็นการกลืนยาชัดเจน',
];

export const TB_FOLLOWUP_TYPES = [
  { value: 'นัดรับยา', label: 'นัดรับยา' },
  { value: 'เยี่ยมบ้าน', label: 'เยี่ยมบ้าน' },
  { value: 'ติดตามทางโทรศัพท์', label: 'ติดตามทางโทรศัพท์' },
  { value: 'VOT ผ่าน Telemedicine', label: 'VOT ผ่าน Telemedicine' },
];

export const TB_FOLLOWUP_SUGGESTIONS = [
  'มาตามนัด อาการดีขึ้น ไอลดลง น้ำหนักเพิ่ม',
  'เยี่ยมบ้านพบผู้ป่วย สภาพแวดล้อมระบายอากาศดี',
  'โทรติดตาม — ผู้ป่วยยืนยันกินยาต่อเนื่อง ไม่มีผลข้างเคียง',
  'ขาดนัด — โทรตามแล้วนัดใหม่ภายในสัปดาห์นี้',
];

export const TB_CONTACT_RELATIONS = [
  'คู่สมรส', 'บุตร', 'บิดา/มารดา', 'พี่น้อง', 'ญาติร่วมบ้าน', 'เพื่อนร่วมงาน', 'เพื่อนร่วมห้องพัก', 'อื่น ๆ',
];

export const TB_SCREENING_SUGGESTIONS = [
  'ผู้สัมผัสร่วมบ้านของผู้ป่วยวัณโรคเสมหะพบเชื้อ — คัดกรองตามรอบ 6 เดือน',
  'ไม่มีอาการสงสัยวัณโรค ผล CXR ปกติ — นัดคัดกรองซ้ำปีหน้า',
  'มีอาการไอเรื้อรัง ส่งเสมหะ AFB 2 ครั้ง และ GeneXpert แล้ว รอผล',
  'ผล GeneXpert พบเชื้อ MTB — ส่งพบแพทย์เพื่อขึ้นทะเบียนรักษาทันที',
  'ปฏิเสธการเก็บเสมหะในวันนี้ — นัดใหม่สัปดาห์หน้า',
];

/* ── เอกสารแนบระหว่างการรักษา (TOR §1.10.4.4) ─────────────────────── */

export const TB_DOC_TYPES = [
  { value: 'cxr',      label: 'ฟิล์ม/ผลอ่าน CXR' },
  { value: 'lab',      label: 'ใบรายงานผล LAB (AFB / Culture / DST)' },
  { value: 'consent',  label: 'ใบยินยอมรับการรักษา' },
  { value: 'referral', label: 'ใบส่งต่อ / ใบตอบกลับ' },
  { value: 'dotCard',  label: 'บัตรบันทึกการกินยา (DOT card)' },
  { value: 'other',    label: 'เอกสารอื่น ๆ' },
];

export const TB_UPLOAD_ACCEPT = '.pdf,.jpg,.jpeg,.png';
export const TB_UPLOAD_MAX_MB = 10;

/* คืนข้อความ error ระดับ field (null = ผ่าน) — ห้ามใช้ alert (spec edge). */
export const validateTbUpload = (file) => {
  if (!file) return 'ยังไม่ได้เลือกไฟล์';
  const name = String(file.name || '').toLowerCase();
  const okExt = TB_UPLOAD_ACCEPT.split(',').some((ext) => name.endsWith(ext.trim()));
  if (!okExt) return `ชนิดไฟล์ไม่รองรับ — อนุญาตเฉพาะ ${TB_UPLOAD_ACCEPT}`;
  const sizeMb = (file.size || 0) / (1024 * 1024);
  if (sizeMb > TB_UPLOAD_MAX_MB) return `ไฟล์ใหญ่เกิน ${TB_UPLOAD_MAX_MB} MB (ไฟล์นี้ ${sizeMb.toFixed(1)} MB)`;
  return null;
};

export const resolveTbDocType = (value) => TB_DOC_TYPES.find((d) => d.value === value) || null;

/* ── DOT observer / VOT (TOR §1.10.4.7) ───────────────────────────── */

export const TB_OBSERVER_NAME_SUGGESTIONS = [
  'อสส.สมพร ใจดี (ศูนย์บริการสาธารณสุข 21)',
  'พว.อรทัย แก้วประเสริฐ (VOT)',
  'ญาติผู้ดูแล — ระบุชื่อและความสัมพันธ์',
];

export const TB_DOT_EDIT_REASON_SUGGESTIONS = [
  'ผู้กำกับแจ้งข้อมูลย้อนหลังหลังออกเยี่ยมบ้าน',
  'บันทึกสถานะผิด — แก้ให้ตรงกับสมุดบันทึกการกินยา',
  'ระบบขัดข้องในวันนั้น จึงบันทึกย้อนหลัง',
  'ผู้ป่วยนำหลักฐานการกินยามาแสดงในวันถัดมา',
];

export const TB_NO_APPOINTMENT_SUGGESTIONS = [
  'ครบการรักษาแล้ว — เตรียมปิดทะเบียนในนัดครั้งนี้',
  'ส่งต่อไปรักษาต่อที่สถานพยาบาลอื่น',
  'ผู้รับบริการย้ายภูมิลำเนา — โอนทะเบียนออก',
  'รอผลตรวจยืนยันก่อนกำหนดนัดครั้งถัดไป',
];

export const TB_PRIOR_TREATMENT_SUGGESTIONS = [
  'ไม่เคยรักษาวัณโรคมาก่อน',
  'เคยรักษาหาย (Cured) จากทะเบียนเดิม — กลับเป็นซ้ำ',
  'ขาดยาจากทะเบียนเดิมนานเกิน 2 เดือน — ขึ้นทะเบียนใหม่เป็น TAD',
  'เคยรักษา CAT-1 แล้วผล DST พบดื้อยา Isoniazid + Rifampicin',
];
