/* PHCIS | CPOE §1.5.6 — ส่งปรึกษาแพทย์ภายในหน่วยงาน (Internal Consult).

   โครงล้อ `treatmentRefer.js` (Wave E) ทุกประการ — statuses / blank /
   missing-fields / save-send-cancel-print / byDirection — เพื่อให้
   ConsultRegisterPage ใช้ pattern เดียวกับ ReferralRegisterPage ได้ตรง ๆ.

   คำศัพท์ตามคู่มือ HCIS §2.2 (สถานะสุดท้าย = "ส่งไปคลินิกอื่น/ปรึกษา")
   และ §2.10 (ทะเบียน). Mock in-memory + pub/sub (React 17). */

import { CURRENT_CLINICIAN, stampNow, appendAudit } from '@/data/treatmentAudit';

export const CONSULT_STATUSES = [
  { key: 'draft',     label: 'ร่าง',            badge: 'neutral' },
  { key: 'sent',      label: 'ส่งแล้ว',          badge: 'info'    },
  { key: 'accepted',  label: 'รับเรื่องแล้ว',    badge: 'warning' },
  { key: 'replied',   label: 'ตอบกลับแล้ว',      badge: 'success' },
  { key: 'cancelled', label: 'ยกเลิก',           badge: 'error'   },
];

export const consultStatusMeta = (key) =>
  CONSULT_STATUSES.find((s) => s.key === key) || { key, label: key, badge: 'neutral' };

/* §1.5.6.4 — ประเภทการปรึกษา */
export const CONSULT_TYPES = [
  { key: 'general',  label: 'ปรึกษาทั่วไป' },
  { key: 'urgent',   label: 'ปรึกษาด่วน' },
  { key: 'admit',    label: 'ปรึกษาเพื่อรับตัวไว้รักษาต่อ' },
  { key: 'procedure', label: 'ปรึกษาเพื่อทำหัตถการ' },
  { key: 'second',   label: 'ปรึกษาเพื่อขอความเห็นที่สอง (Second opinion)' },
];

export const consultTypeMeta = (key) =>
  CONSULT_TYPES.find((t) => t.key === key) || { key, label: key || '—' };

export const CONSULT_URGENCIES = [
  { key: 'routine', label: 'ปกติ',     badge: 'neutral', slaHours: 48 },
  { key: 'urgent',  label: 'ด่วน',     badge: 'warning', slaHours: 8  },
  { key: 'stat',    label: 'ด่วนมาก',  badge: 'error',   slaHours: 1  },
];

export const consultUrgencyMeta = (key) =>
  CONSULT_URGENCIES.find((u) => u.key === key) || CONSULT_URGENCIES[0];

/* Trauma / NonTrauma ตามคู่มือ §2.2 */
export const TRAUMA_OPTIONS = [
  { key: 'nontrauma', label: 'NonTrauma (ไม่ได้เกิดจากอุบัติเหตุ)' },
  { key: 'trauma',    label: 'Trauma (เกิดจากอุบัติเหตุ)' },
];

/* §1.5.6.2 — คลินิกที่ส่งปรึกษาได้ (ศูนย์บริการสาธารณสุข กทม.)
   `waiting` = คิวรอปรึกษาปัจจุบัน ใช้ช่วยแพทย์ตัดสินใจเลือกปลายทาง */
export const CONSULT_CLINICS = [
  { key: 'im',       label: 'คลินิกอายุรกรรม',              short: 'อายุรกรรม',  waiting: 4, icon: 'stethoscope' },
  { key: 'surg',     label: 'คลินิกศัลยกรรมและทำแผล',        short: 'ศัลยกรรม',   waiting: 2, icon: 'health_and_safety' },
  { key: 'ortho',    label: 'คลินิกกระดูกและข้อ',            short: 'กระดูกและข้อ', waiting: 1, icon: 'accessibility_new' },
  { key: 'ped',      label: 'คลินิกเด็กดีและกุมารเวช',        short: 'กุมารเวช',   waiting: 3, icon: 'child_care' },
  { key: 'anc',      label: 'คลินิกฝากครรภ์ (ANC)',          short: 'ANC',        waiting: 2, icon: 'pregnant_woman' },
  { key: 'ncd',      label: 'คลินิกโรคเรื้อรัง (NCD)',        short: 'NCD',        waiting: 6, icon: 'monitor_heart' },
  { key: 'dental',   label: 'คลินิกทันตกรรม',                short: 'ทันตกรรม',   waiting: 5, icon: 'dentistry' },
  { key: 'mental',   label: 'คลินิกสุขภาพจิต',               short: 'สุขภาพจิต',  waiting: 1, icon: 'psychology' },
  { key: 'tb',       label: 'คลินิกวัณโรค',                  short: 'วัณโรค',     waiting: 0, icon: 'coronavirus' },
  { key: 'hivsti',   label: 'คลินิกรักปลอดภัย', short: 'HIV/STI', waiting: 1, icon: 'medical_information', confidential: true },
  { key: 'rehab',    label: 'งานเวชศาสตร์ฟื้นฟูและกายภาพบำบัด', short: 'เวชศาสตร์ฟื้นฟู', waiting: 2, icon: 'directions_run' },
  { key: 'social',   label: 'งานสังคมสงเคราะห์',              short: 'สังคมสงเคราะห์', waiting: 0, icon: 'diversity_3' },
];

export const clinicMeta = (key) =>
  CONSULT_CLINICS.find((c) => c.key === key) || null;

/* §1.5.6.3 — แพทย์/ผู้ให้คำปรึกษาแยกตามคลินิก + สถานะออกตรวจ */
export const CONSULT_DOCTORS = [
  { key: 'd-anucha',   name: 'นพ.อนุชา ศรีวิไล',        clinic: 'im',     onDuty: true,  specialty: 'อายุรศาสตร์ทั่วไป' },
  { key: 'd-pornthip', name: 'พญ.พรทิพย์ วงศ์เจริญ',    clinic: 'im',     onDuty: false, specialty: 'อายุรศาสตร์โรคหัวใจ' },
  { key: 'd-kittipong', name: 'นพ.กิตติพงศ์ ธนกุล',     clinic: 'surg',   onDuty: true,  specialty: 'ศัลยศาสตร์ทั่วไป' },
  { key: 'd-wanchai',  name: 'นพ.วันชัย บุญมาก',        clinic: 'ortho',  onDuty: true,  specialty: 'ออร์โธปิดิกส์' },
  { key: 'd-suphaporn', name: 'พญ.สุภาพร ใจดี',         clinic: 'ped',    onDuty: true,  specialty: 'กุมารเวชศาสตร์' },
  { key: 'd-nattaya',  name: 'พญ.ณัฐญา พงษ์ไพศาล',      clinic: 'anc',    onDuty: true,  specialty: 'สูติ-นรีเวชวิทยา' },
  { key: 'd-somying',  name: 'พญ.สมหญิง รักษ์ดี',       clinic: 'ncd',    onDuty: true,  specialty: 'เวชศาสตร์ครอบครัว' },
  { key: 'd-thanaporn', name: 'ทพ.ธนพร ศรีสุข',        clinic: 'dental', onDuty: true,  specialty: 'ทันตกรรมทั่วไป' },
  { key: 'd-preecha',  name: 'นพ.ปรีชา มั่นคง',         clinic: 'mental', onDuty: false, specialty: 'จิตเวชศาสตร์' },
  { key: 'd-arunee',   name: 'พญ.อรุณี แสงทอง',         clinic: 'tb',     onDuty: true,  specialty: 'อายุรศาสตร์โรคติดเชื้อ' },
  { key: 'd-chalermchai', name: 'นพ.เฉลิมชัย รุ่งเรือง', clinic: 'hivsti', onDuty: true,  specialty: 'อายุรศาสตร์โรคติดเชื้อ' },
  { key: 'd-siriporn', name: 'นักกายภาพบำบัด ศิริพร ทองอยู่', clinic: 'rehab', onDuty: true, specialty: 'กายภาพบำบัด' },
  { key: 'd-manee',    name: 'นักสังคมสงเคราะห์ มณี พูลสุข', clinic: 'social', onDuty: true, specialty: 'สังคมสงเคราะห์ทางการแพทย์' },
];

export const doctorsForClinic = (clinicKey) =>
  CONSULT_DOCTORS.filter((d) => d.clinic === clinicKey);

export const doctorMeta = (key) =>
  CONSULT_DOCTORS.find((d) => d.key === key) || null;

/* ── suggestions ของทุกช่องข้อความ (§1.5.6.6) ────────────────── */
export const CONSULT_QUESTION_SUGGESTIONS = [
  'ขอความเห็นเรื่องการปรับยาลดความดันโลหิต เนื่องจากยังควบคุมไม่ได้หลังใช้ยา 2 ชนิดเต็มขนาด',
  'ขอประเมินความจำเป็นในการส่งตรวจเพิ่มเติมและวินิจฉัยแยกโรคของอาการปวดท้องเรื้อรัง',
  'ขอความเห็นเรื่องแผนการรักษาแผลเรื้อรังที่ไม่หายภายใน 4 สัปดาห์',
  'ขอประเมินข้อบ่งชี้ในการทำหัตถการและความเสี่ยงของผู้รับบริการรายนี้',
  'ขอความเห็นที่สองเรื่องการวินิจฉัยก่อนแจ้งผลแก่ผู้รับบริการและญาติ',
];

export const CONSULT_CONTEXT_SUGGESTIONS = [
  'สัญญาณชีพวันนี้ปกติ ยกเว้นความดันโลหิตสูง 158/96 mmHg วัดซ้ำ 2 ครั้ง',
  'ผลแล็บล่าสุดผิดปกติ: FBS 168 mg/dL · Creatinine 1.6 mg/dL (eGFR 48)',
  'ยาที่ใช้อยู่ปัจจุบัน: Amlodipine 5 mg วันละครั้ง · Enalapril 5 mg วันละสองครั้ง',
  'มีประวัติแพ้ยา Penicillin (ผื่นลมพิษทั่วตัว) บันทึกไว้ในเวชระเบียน',
  'ผู้รับบริการอาศัยอยู่คนเดียว มีข้อจำกัดในการเดินทางมาตามนัด',
];

export const CONSULT_REQUEST_SUGGESTIONS = [
  'ขอให้ตรวจประเมินและให้คำแนะนำแผนการรักษาเพิ่มเติมภายในวันนี้',
  'ขอให้พิจารณารับผู้รับบริการไว้ในการดูแลของคลินิกเฉพาะโรคต่อเนื่อง',
  'ขอให้ประเมินความเหมาะสมของการทำหัตถการและนัดหมายวันทำ',
  'ขอให้ตอบกลับเป็นลายลักษณ์อักษรเพื่อแนบในเวชระเบียนของผู้รับบริการ',
];

export const CONSULT_REPLY_SUGGESTIONS = [
  'ตรวจประเมินแล้ว เห็นด้วยกับการวินิจฉัยเดิม แนะนำปรับขนาดยาและติดตามอาการใน 2 สัปดาห์',
  'พิจารณาแล้วยังไม่จำเป็นต้องส่งต่อโรงพยาบาลระดับสูงกว่า ให้ติดตามที่คลินิกเฉพาะโรคต่อได้',
  'รับผู้รับบริการไว้ในการดูแลของคลินิกแล้ว นัดครั้งแรกภายในสัปดาห์นี้',
  'แนะนำส่งตรวจเพิ่มเติมก่อนจึงจะสรุปแผนการรักษาได้ — ระบุรายการตรวจไว้ในคำแนะนำ',
];

export const CONSULT_CANCEL_SUGGESTIONS = [
  'ผู้รับบริการปฏิเสธการส่งปรึกษา ขอรับการรักษาที่คลินิกเดิมต่อ',
  'เลือกคลินิกปลายทางผิด — จะออกคำขอปรึกษาฉบับใหม่แทน',
  'อาการดีขึ้นหลังการรักษาเบื้องต้น จึงไม่จำเป็นต้องปรึกษา',
  'ปรึกษาทางโทรศัพท์กับแพทย์ปลายทางแล้ว ไม่ต้องออกคำขอเป็นเอกสาร',
];

/* ── เลขที่คำขอ ─────────────────────────────────────────────── */
let consultSeq = 4;
export const nextConsultNo = () => {
  consultSeq += 1;
  return `CS-2569-${String(consultSeq).padStart(5, '0')}`;
};

export const blankConsult = () => ({
  id: '',
  consultNo: '',
  direction: 'out',
  status: 'draft',
  hn: '',
  cid: '',
  name: '',
  rights: '',
  age: '',
  gender: '',
  visitId: '',
  /* §1.5.6.1 — ระบบเติมวันเวลาและผู้ขอให้เอง (อ่านอย่างเดียวบนฟอร์ม) */
  requestedAt: stampNow(),
  requestedBy: CURRENT_CLINICIAN.name,
  requestedByLicense: CURRENT_CLINICIAN.license,
  fromClinic: 'ตรวจรักษาทั่วไป (OPD)',
  fromCenter: CURRENT_CLINICIAN.center,
  /* §1.5.6.2 / §1.5.6.3 */
  toClinic: '',
  toDoctor: '',
  /* §1.5.6.4 */
  consultType: 'general',
  urgency: 'routine',
  trauma: 'nontrauma',
  /* §1.5.6.5 — auto-fill จากหน้าบันทึกการรักษา */
  provisionalDx: '',
  provisionalDxAutoFilled: false,
  provisionalDxSource: '',
  /* §1.5.6.6 */
  question: '',
  context: '',
  request: '',
  doctorNote: '',
  /* การตอบกลับ */
  acceptedAt: '', acceptedBy: '',
  replyBody: '', replyAdvice: '', replyAttachments: [], repliedAt: '', repliedBy: '',
  /* ร่องรอย — เก็บทั้งสตริงไทย (แสดงผล) และ ISO (คำนวณเวลา/SLA) */
  createdAt: '', createdAtIso: '', createdBy: '', sentAt: '', sentAtIso: '',
  cancelledAt: '', cancelReason: '', cancelledBy: '',
  printCount: 0, lastPrintedAt: '',
  confidential: false,
});

/* ── seed ──────────────────────────────────────────────────── */
const CONSULTS = [
  {
    ...blankConsult(),
    id: 'cs-1', consultNo: 'CS-2569-00001', direction: 'out', status: 'replied',
    hn: '67-00001', cid: '1-1005-01234-56-7', name: 'นางสาว กัลยา ทองสุข',
    rights: 'บัตรทอง (UC)', age: '42 ปี', gender: 'หญิง', visitId: 'v-2569-04-02',
    requestedAt: '2 เม.ย. 2569 · 10:22', requestedBy: 'นพ.อนุชา ศรีวิไล',
    toClinic: 'im', toDoctor: 'd-pornthip',
    consultType: 'general', urgency: 'routine',
    provisionalDx: 'โรคความดันโลหิตสูงชนิดไม่ทราบสาเหตุ (I10) ควบคุมไม่ได้',
    provisionalDxAutoFilled: true, provisionalDxSource: 'ดึงจากหน้าบันทึกการรักษา 2 เม.ย. 2569',
    question: 'ขอความเห็นเรื่องการปรับยาลดความดันโลหิต เนื่องจากยังควบคุมไม่ได้หลังใช้ยา 2 ชนิดเต็มขนาด',
    context: 'BP 158/96 mmHg วัดซ้ำ 2 ครั้ง · Creatinine 1.2 mg/dL · ยาเดิม Amlodipine 5 mg + Enalapril 5 mg',
    request: 'ขอให้ตรวจประเมินและให้คำแนะนำแผนการรักษาเพิ่มเติมภายในวันนี้',
    createdAt: '2 เม.ย. 2569 · 10:22', createdAtIso: '2026-04-02T10:22:00+07:00',
    createdBy: 'นพ.อนุชา ศรีวิไล',
    sentAt: '2 เม.ย. 2569 · 10:25', sentAtIso: '2026-04-02T10:25:00+07:00',
    acceptedAt: '2 เม.ย. 2569 · 11:02', acceptedBy: 'พญ.พรทิพย์ วงศ์เจริญ',
    repliedAt: '2 เม.ย. 2569 · 13:40', repliedBy: 'พญ.พรทิพย์ วงศ์เจริญ',
    replyBody: 'ตรวจประเมินแล้ว เห็นด้วยกับการวินิจฉัยเดิม ความดันยังไม่ถึงเป้าหมาย',
    replyAdvice: 'เพิ่ม Hydrochlorothiazide 25 mg วันละครั้งตอนเช้า · ติดตาม BP ที่บ้านวันละ 2 ครั้ง · นัดประเมินซ้ำใน 2 สัปดาห์',
    printCount: 1, lastPrintedAt: '2 เม.ย. 2569 · 13:52',
  },
  {
    ...blankConsult(),
    id: 'cs-2', consultNo: 'CS-2569-00002', direction: 'out', status: 'sent',
    hn: '67-00014', cid: '3-1002-09876-54-3', name: 'นาย สมชาย ใจกล้า',
    rights: 'ประกันสังคม', age: '58 ปี', gender: 'ชาย', visitId: 'v-2569-05-06',
    requestedAt: '6 พ.ค. 2569 · 09:48', requestedBy: 'พญ.สมหญิง รักษ์ดี',
    toClinic: 'ortho', toDoctor: 'd-wanchai',
    consultType: 'procedure', urgency: 'urgent', trauma: 'trauma',
    provisionalDx: 'สงสัยกระดูกข้อมือซ้ายหัก หลังลื่นล้มในห้องน้ำ',
    question: 'ขอประเมินข้อบ่งชี้ในการใส่เฝือกและความจำเป็นในการส่งต่อโรงพยาบาล',
    context: 'ภาพรังสีข้อมือซ้าย: สงสัยรอยแตกที่ distal radius · ปวดระดับ 7/10 · บวมชัดเจน',
    request: 'ขอให้ประเมินภายในวันนี้ก่อนผู้รับบริการกลับบ้าน',
    createdAt: '6 พ.ค. 2569 · 09:48', createdAtIso: '2026-05-06T09:48:00+07:00',
    createdBy: 'พญ.สมหญิง รักษ์ดี',
    /* ส่งแล้วยังไม่ตอบกลับ + ผ่านมาเกิน SLA 8 ชม. → เคสตัวอย่าง "เกินกำหนดตอบ" */
    sentAt: '6 พ.ค. 2569 · 09:50', sentAtIso: '2026-05-06T09:50:00+07:00',
  },
  {
    ...blankConsult(),
    id: 'cs-3', consultNo: 'CS-2569-00003', direction: 'in', status: 'accepted',
    hn: '67-00022', cid: '1-1009-11223-44-5', name: 'นาง วิไล สมบูรณ์',
    rights: 'บัตรทอง (UC)', age: '66 ปี', gender: 'หญิง',
    requestedAt: '6 พ.ค. 2569 · 08:30', requestedBy: 'นพ.กิตติพงศ์ ธนกุล',
    fromClinic: 'คลินิกศัลยกรรมและทำแผล',
    toClinic: 'ncd', toDoctor: 'd-somying',
    consultType: 'general', urgency: 'routine',
    provisionalDx: 'แผลเบาหวานที่เท้าขวา ไม่หายภายใน 6 สัปดาห์',
    question: 'ขอความเห็นเรื่องการควบคุมระดับน้ำตาลเพื่อให้แผลหายเร็วขึ้น',
    context: 'HbA1c 9.2% · FBS 210 mg/dL · ใช้ยา Metformin 850 mg วันละสองครั้ง',
    request: 'ขอให้ประเมินการปรับยาเบาหวานและวางแผนติดตามร่วมกัน',
    createdAt: '6 พ.ค. 2569 · 08:30', createdAtIso: '2026-05-06T08:30:00+07:00',
    createdBy: 'นพ.กิตติพงศ์ ธนกุล',
    sentAt: '6 พ.ค. 2569 · 08:31', sentAtIso: '2026-05-06T08:31:00+07:00',
    acceptedAt: '6 พ.ค. 2569 · 09:05', acceptedBy: 'พญ.สมหญิง รักษ์ดี',
  },
  {
    ...blankConsult(),
    id: 'cs-4', consultNo: 'CS-2569-00004', direction: 'out', status: 'draft',
    hn: '67-00031', name: 'นาย ประสิทธิ์ แก้วใส',
    rights: '', age: '35 ปี', gender: 'ชาย',
    requestedAt: '6 พ.ค. 2569 · 11:10', requestedBy: 'พญ.สมหญิง รักษ์ดี',
    toClinic: '', toDoctor: '',
    consultType: 'general', urgency: 'routine',
    provisionalDx: '',
    question: '',
    createdAt: '6 พ.ค. 2569 · 11:10', createdAtIso: '2026-05-06T11:10:00+07:00',
    createdBy: 'พญ.สมหญิง รักษ์ดี',
  },
];

const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn(CONSULTS));

export const subscribeConsults = (fn) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};

export const getConsults = () => CONSULTS.map((c) => ({ ...c }));

export const consultsByDirection = (direction) =>
  CONSULTS.filter((c) => c.direction === direction).map((c) => ({ ...c }));

export const consultsForVisit = (hn, visitId) => CONSULTS
  .filter((c) => c.hn === hn && (!visitId || c.visitId === visitId))
  .map((c) => ({ ...c }));

export const consultsForPatient = (hn) =>
  CONSULTS.filter((c) => c.hn === hn).map((c) => ({ ...c }));

/* ── ข้อมูลไม่สมบูรณ์ (legend เดียวกับทะเบียนส่งต่อ) ──────────── */
export const REQUIRED_CONSULT_FIELDS = [
  { key: 'hn',        label: 'HN ผู้รับบริการ' },
  { key: 'name',      label: 'ชื่อ - นามสกุล' },
  { key: 'toClinic',  label: 'คลินิกที่ส่งปรึกษา' },
  { key: 'question',  label: 'ประเด็นที่ต้องการปรึกษา' },
];

export const missingConsultFields = (row) => REQUIRED_CONSULT_FIELDS
  .filter((f) => !String(row?.[f.key] || '').trim())
  .map((f) => f.label);

export const isConsultIncomplete = (row) => missingConsultFields(row).length > 0;

/* คำขอที่เกินกำหนดตอบ — ส่งแล้ว/รับเรื่องแล้วแต่ยังไม่ตอบกลับ "และ" เวลาที่
   ผ่านไปจริงเกิน SLA ของความเร่งด่วนนั้น. เดิมตัดสินจาก urgency อย่างเดียว
   (slaHours <= 8) ทำให้ทุกคำขอด่วน/ด่วนมากติดป้าย "เกินกำหนด" ตั้งแต่วินาทีแรก.
   เทียบจาก `sentAtIso` / `createdAtIso` ซึ่งเป็น timestamp ที่เครื่องอ่านได้
   (คู่กับสตริงภาษาไทยที่ใช้แสดงผล) — ถ้าไม่มี timestamp ให้ถือว่ายังไม่เกิน */
export const isConsultOverdue = (row) => {
  if (!row || row.status === 'replied' || row.status === 'cancelled' || row.status === 'draft') return false;
  const startedAt = Date.parse(row.sentAtIso || row.createdAtIso || '');
  if (Number.isNaN(startedAt)) return false;
  const hoursElapsed = (Date.now() - startedAt) / 36e5;
  return hoursElapsed > consultUrgencyMeta(row.urgency).slaHours;
};

/* ── การกระทำครบ 4: แสดง / บันทึก / แก้ไข / ยกเลิก ────────────── */
let idSeq = CONSULTS.length;

export const saveConsult = (row) => {
  const isNew = !row.id;
  if (isNew) {
    idSeq += 1;
    const created = {
      ...row,
      id: `cs-${idSeq}`,
      consultNo: row.consultNo || nextConsultNo(),
      status: row.status || 'draft',
      createdAt: row.createdAt || stampNow(),
      createdAtIso: row.createdAtIso || new Date().toISOString(),
      createdBy: row.createdBy || CURRENT_CLINICIAN.name,
    };
    CONSULTS.unshift(created);
    emit();
    appendAudit({
      hn: created.hn, visitId: created.visitId, category: 'refer',
      field: `สร้างคำขอปรึกษา ${created.consultNo}`,
      oldValue: '—',
      newValue: `${clinicMeta(created.toClinic)?.label || 'ยังไม่ระบุคลินิก'} · ${consultTypeMeta(created.consultType).label}`,
      by: CURRENT_CLINICIAN.name,
    });
    return { ...created };
  }
  const target = CONSULTS.find((c) => c.id === row.id);
  if (!target) return null;
  const before = `${clinicMeta(target.toClinic)?.label || '—'} · ${target.question?.slice(0, 60) || '—'}`;
  Object.assign(target, row);
  emit();
  appendAudit({
    hn: target.hn, visitId: target.visitId, category: 'refer',
    field: `แก้ไขคำขอปรึกษา ${target.consultNo}`,
    oldValue: before,
    newValue: `${clinicMeta(target.toClinic)?.label || '—'} · ${target.question?.slice(0, 60) || '—'}`,
    by: CURRENT_CLINICIAN.name,
  });
  return { ...target };
};

export const sendConsult = (id) => {
  const target = CONSULTS.find((c) => c.id === id);
  if (!target) return null;
  target.status = 'sent';
  target.sentAt = stampNow();
  target.sentAtIso = new Date().toISOString();
  emit();
  appendAudit({
    hn: target.hn, visitId: target.visitId, category: 'refer',
    field: `ส่งคำขอปรึกษา ${target.consultNo}`,
    oldValue: 'ร่าง',
    newValue: `ส่งถึง ${clinicMeta(target.toClinic)?.label || '—'} · ${doctorMeta(target.toDoctor)?.name || 'ยังไม่ระบุแพทย์'}`,
    by: CURRENT_CLINICIAN.name,
  });
  return { ...target };
};

export const acceptConsult = (id) => {
  const target = CONSULTS.find((c) => c.id === id);
  if (!target) return null;
  target.status = 'accepted';
  target.acceptedAt = stampNow();
  target.acceptedBy = CURRENT_CLINICIAN.name;
  emit();
  appendAudit({
    hn: target.hn, visitId: target.visitId, category: 'refer',
    field: `รับเรื่องคำขอปรึกษา ${target.consultNo}`,
    oldValue: 'ส่งแล้ว', newValue: `รับเรื่องโดย ${CURRENT_CLINICIAN.name}`,
    by: CURRENT_CLINICIAN.name,
  });
  return { ...target };
};

export const replyConsult = (id, { body, advice, attachments = [] }) => {
  const target = CONSULTS.find((c) => c.id === id);
  if (!target) return null;
  target.status = 'replied';
  target.replyBody = body || '';
  target.replyAdvice = advice || '';
  target.replyAttachments = attachments;
  target.repliedAt = stampNow();
  target.repliedBy = CURRENT_CLINICIAN.name;
  emit();
  appendAudit({
    hn: target.hn, visitId: target.visitId, category: 'refer',
    field: `ตอบกลับคำขอปรึกษา ${target.consultNo}`,
    oldValue: '—', newValue: (body || '').slice(0, 80),
    by: CURRENT_CLINICIAN.name,
  });
  return { ...target };
};

export const cancelConsult = (id, reason) => {
  const target = CONSULTS.find((c) => c.id === id);
  if (!target) return null;
  /* จับสถานะก่อนเปลี่ยนไว้ก่อน — ไม่งั้น oldValue จะเป็น "ยกเลิก" เสมอ
     และร่องรอยจะไม่บอกว่ายกเลิกจากสถานะไหน (ร่าง / ส่งแล้ว / รับเรื่องแล้ว) */
  const statusBefore = consultStatusMeta(target.status).label;
  target.status = 'cancelled';
  target.cancelledAt = stampNow();
  target.cancelReason = reason || 'ไม่ได้ระบุเหตุผล';
  target.cancelledBy = CURRENT_CLINICIAN.name;
  emit();
  appendAudit({
    hn: target.hn, visitId: target.visitId, category: 'refer',
    field: `ยกเลิกคำขอปรึกษา ${target.consultNo}`,
    oldValue: statusBefore,
    newValue: `ยกเลิก — ${target.cancelReason}`,
    by: CURRENT_CLINICIAN.name,
  });
  return { ...target };
};

export const printConsult = (id, copies = 1) => {
  const target = CONSULTS.find((c) => c.id === id);
  if (!target) return null;
  target.printCount = (target.printCount || 0) + copies;
  target.lastPrintedAt = stampNow();
  emit();
  appendAudit({
    hn: target.hn, visitId: target.visitId, category: 'document',
    field: `พิมพ์ใบส่งปรึกษา ${target.consultNo}`,
    oldValue: `พิมพ์แล้ว ${target.printCount - copies} ครั้ง`,
    newValue: `พิมพ์เพิ่ม ${copies} ชุด (รวม ${target.printCount} ครั้ง)`,
    by: CURRENT_CLINICIAN.name,
  });
  return { ...target };
};

export default CONSULTS;
