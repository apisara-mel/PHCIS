/* PHCIS | EMR §1.4.6.1 / §1.4.3.14 / §1.4.11.1 — ทะเบียนการส่งต่อผู้รับบริการ.

   คำศัพท์และรายชื่อฟิลด์ยกมาจากคู่มือระบบเดิม (HCIS)
   "คู่มือระบบงานสืบค้นประวัติและส่งต่อผู้ป่วย" §2.5:
     §2.5.1 แบบส่งต่อ            → REFER_FORM_FIELDS (โครงฟอร์ม)
     §2.5.2 ลำดับการส่งต่อไปยังสถานพยาบาลอื่น → tab 'out'
     §2.5.3 ลำดับการรับผู้ป่วยจากสถานพยาบาลที่ส่งต่อ → tab 'in' (+ วันที่รับ)
   คู่มือมีตัวนับ "จำนวน N รายการ" และ legend "ข้อมูลไม่สมบูรณ์" ซึ่ง
   หน้า ReferralRegisterPage ต้องคงไว้ทั้งคู่. */

import { CURRENT_CLINICIAN, stampNow, appendAudit } from '@/data/treatmentAudit';

export const REFER_STATUSES = [
  { key: 'draft',     label: 'ร่าง',        badge: 'neutral' },
  { key: 'sent',      label: 'ส่งแล้ว',      badge: 'info'    },
  { key: 'replied',   label: 'ตอบกลับแล้ว',  badge: 'success' },
  { key: 'cancelled', label: 'ยกเลิก',      badge: 'error'   },
];

export const referStatusMeta = (key) =>
  REFER_STATUSES.find((s) => s.key === key) || REFER_STATUSES[0];

/* สถานพยาบาลปลายทางที่ใช้บ่อย (บริบท กทม.) */
export const REFER_FACILITIES = [
  { value: 'bmr-klang',   label: 'โรงพยาบาลกลาง',                  phone: '02-220-8000', fax: '02-225-1505', email: 'refer@klanghospital.go.th' },
  { value: 'bmr-taksin',  label: 'โรงพยาบาลตากสิน',                phone: '02-437-0123', fax: '02-437-0388', email: 'refer@taksinhospital.go.th' },
  { value: 'bmr-charoen', label: 'โรงพยาบาลเจริญกรุงประชารักษ์',   phone: '02-289-7000', fax: '02-289-7789', email: 'refer@ckph.go.th' },
  { value: 'bmr-vajira',  label: 'โรงพยาบาลวชิรพยาบาล',            phone: '02-244-3000', fax: '02-243-8900', email: 'refer@vajira.ac.th' },
  { value: 'bmr-ratcha',  label: 'โรงพยาบาลราชวิถี',               phone: '02-206-2900', fax: '02-354-8080', email: 'refer@rajavithi.go.th' },
  { value: 'bmr-siriraj', label: 'โรงพยาบาลศิริราช',               phone: '02-419-7000', fax: '02-411-4746', email: 'refer@si.mahidol.ac.th' },
];

export const facilityMeta = (value) =>
  REFER_FACILITIES.find((f) => f.value === value) || null;

/* ศูนย์บริการสาธารณสุขต้นทาง (ศบส.) */
export const REFER_CENTERS = [
  { value: 'center-4',  label: 'ศูนย์บริการสาธารณสุข 4 ดินแดง',       phone: '02-245-6789', fax: '02-245-6780', email: 'center4@bangkok.go.th' },
  { value: 'center-21', label: 'ศูนย์บริการสาธารณสุข 21 วัดธาตุทอง',  phone: '02-391-1223', fax: '02-391-1224', email: 'center21@bangkok.go.th' },
  { value: 'center-41', label: 'ศูนย์บริการสาธารณสุข 41 คลองเตย',     phone: '02-249-1580', fax: '02-249-1581', email: 'center41@bangkok.go.th' },
];

export const centerMeta = (value) =>
  REFER_CENTERS.find((c) => c.value === value) || REFER_CENTERS[0];

/* หมายเหตุโรคติดต่อ ตามคู่มือ §2.5.1 */
export const COMMUNICABLE_NOTIFY_OPTIONS = [
  { value: 'none',      label: 'ไม่ใช่โรคติดต่อที่ต้องแจ้ง' },
  { value: 'notified',  label: 'เป็นโรคติดต่อ — แจ้งงานระบาดวิทยาแล้ว' },
  { value: 'pending',   label: 'เป็นโรคติดต่อ — ยังไม่ได้แจ้ง' },
];

export const REFER_REASON_SUGGESTIONS = [
  'ขอส่งต่อเพื่อตรวจวินิจฉัยเพิ่มเติมโดยแพทย์เฉพาะทาง',
  'เกินขีดความสามารถของศูนย์บริการ ขอส่งต่อเพื่อรับการรักษาต่อเนื่อง',
  'ขอส่งต่อเพื่อพิจารณาผ่าตัดและนอนโรงพยาบาล',
  'ขอส่งต่อเพื่อทำหัตถการที่ต้องใช้เครื่องมือเฉพาะทาง',
];

export const REFER_HISTORY_SUGGESTIONS = [
  'ผู้รับบริการมีโรคประจำตัวความดันโลหิตสูงและเบาหวาน รักษาต่อเนื่องที่ศูนย์บริการมา 3 ปี',
  'เคยเข้ารับการรักษาด้วยอาการเดียวกันเมื่อ 2 เดือนก่อน อาการดีขึ้นแล้วกลับเป็นซ้ำ',
  'ไม่มีประวัติแพ้ยา ไม่เคยผ่าตัด ปฏิเสธประวัติโรคประจำตัวอื่น',
];

export const REFER_SYMPTOM_SUGGESTIONS = [
  'ปวดท้องบริเวณใต้ชายโครงขวาต่อเนื่อง 3 วัน มีไข้ต่ำ ๆ คลื่นไส้',
  'เหนื่อยง่าย นอนราบไม่ได้ ขาบวมทั้งสองข้างมา 1 สัปดาห์',
  'แน่นหน้าอกร้าวไปแขนซ้าย เป็น ๆ หาย ๆ มา 2 วัน',
];

export const REFER_TREATMENT_SUGGESTIONS = [
  'ให้สารน้ำทางหลอดเลือดดำ NSS 1,000 mL และยาแก้ปวดก่อนส่งต่อ',
  'ให้ยาลดไข้และยาปฏิชีวนะเข็มแรกแล้ว ติดตามสัญญาณชีพก่อนส่ง',
  'ให้ออกซิเจน 3 LPM และพ่นยาขยายหลอดลม 1 ครั้ง อาการทรงตัว',
];

/* ── ทิศทางที่ 3: ส่งต่อภายในหน่วยงาน (TOR §1.5.8.3) ──────────────
   คำศัพท์ปลายทางยกมาจากคู่มือ HCIS §2.1.17 (งานเยี่ยมบ้าน) และ §2.1.19
   (ส่งต่อหน่วยงานภายใน ศบส.) — ไม่ต้องมีสถานพยาบาลปลายทาง/สิทธิเรียกเก็บ
   แต่ต้องมี "ผู้รับมอบหมาย" + "กำหนดวันเยี่ยม/วันนัด" + "เป้าหมายการติดตาม". */
export const INTERNAL_DESTINATIONS = [
  {
    value: 'home-visit',
    label: 'งานเยี่ยมบ้าน (Home Health Care)',
    unit: 'กลุ่มงานเวชศาสตร์ชุมชน · ศบส. 4 ดินแดง',
    dueLabel: 'กำหนดวันออกเยี่ยมบ้าน',
    icon: 'home_health',
    team: [
      'พว.สุชาดา แก้วมณี (พยาบาลเยี่ยมบ้าน)',
      'พว.มานพ เกษมสุข (พยาบาลชุมชน)',
      'กภ.ธนวัฒน์ พูนผล (นักกายภาพบำบัดเยี่ยมบ้าน)',
    ],
  },
  {
    value: 'special-clinic',
    label: 'คลินิกเฉพาะโรค (NCD / เบาหวาน-ความดัน / เลิกบุหรี่)',
    unit: 'คลินิกโรคเรื้อรัง · ศบส. 4 ดินแดง',
    dueLabel: 'วันนัดคลินิกเฉพาะโรค',
    icon: 'medical_services',
    team: [
      'พว.อรทัย ใจดี (พยาบาลคลินิก NCD)',
      'นพ.ปิยะ วัฒนชัย (แพทย์คลินิกโรคเรื้อรัง)',
      'ภก.วราภรณ์ ดีเลิศ (เภสัชกรคลินิกเลิกบุหรี่)',
    ],
  },
  {
    value: 'social-welfare',
    label: 'งานสังคมสงเคราะห์',
    unit: 'ฝ่ายสังคมสงเคราะห์ · ศบส. 4 ดินแดง',
    dueLabel: 'วันนัดสัมภาษณ์/ประเมินทางสังคม',
    icon: 'volunteer_activism',
    team: [
      'นางสาวพัชรี ทองสุข (นักสังคมสงเคราะห์ชำนาญการ)',
      'นายกิตติ ศรีสมบูรณ์ (นักสังคมสงเคราะห์)',
    ],
  },
  {
    value: 'rehab',
    label: 'งานเวชศาสตร์ฟื้นฟู / กายภาพบำบัด',
    unit: 'ห้องกายภาพบำบัด · ศบส. 4 ดินแดง',
    dueLabel: 'วันนัดทำกายภาพบำบัด',
    icon: 'accessible',
    team: [
      'กภ.ธนวัฒน์ พูนผล (นักกายภาพบำบัด)',
      'กภ.ณัฐนรี บุญมา (นักกายภาพบำบัด)',
      'นางสาวศิริพร คงทรัพย์ (นักกิจกรรมบำบัด)',
    ],
  },
];

export const internalDestinationMeta = (value) =>
  INTERNAL_DESTINATIONS.find((d) => d.value === value) || null;

export const INTERNAL_GOAL_SUGGESTIONS = [
  'ติดตามการกินยาและวัดความดันโลหิตที่บ้านสัปดาห์ละ 1 ครั้ง เป็นเวลา 4 สัปดาห์',
  'ประเมินสภาพแวดล้อมในบ้าน ความเสี่ยงพลัดตกหกล้ม และสอนญาติดูแลแผลกดทับ',
  'ฝึกเดินด้วยอุปกรณ์ช่วยเดินและประเมินกำลังกล้ามเนื้อซ้ำใน 2 สัปดาห์',
  'ประเมินสิทธิการรักษาและสภาพเศรษฐกิจครอบครัวเพื่อขอสงเคราะห์ค่าเดินทาง',
];

export const INTERNAL_REASON_SUGGESTIONS = [
  'ผู้รับบริการเป็นผู้สูงอายุติดเตียง ญาติดูแลคนเดียว ขอส่งงานเยี่ยมบ้านติดตามต่อเนื่อง',
  'คุมน้ำตาลไม่ได้ต่อเนื่อง 3 ครั้ง ขอส่งคลินิกเฉพาะโรคเพื่อปรับแผนการรักษา',
  'ผู้รับบริการไม่มีสิทธิการรักษาและไม่มีผู้ดูแล ขอส่งงานสังคมสงเคราะห์ประเมิน',
  'หลังโรคหลอดเลือดสมอง มีอ่อนแรงซีกขวา ขอส่งกายภาพบำบัดฟื้นฟูสมรรถภาพ',
];

/* ── ระบบ e-Referral (TOR §1.5.8.1 / §1.5.8.4) ──────────────────
   หน้าจอฝั่งเราทำได้เต็ม: เลขที่ e-Referral, สถานะคิวส่งออก, วันที่ปลายทาง
   นัดให้ผู้รับบริการมารับบริการ. **ตัว gateway จริงยังไม่มี** — สถานะทุกแถว
   มาจาก mock queue นี้ ไม่ได้ยิง API ออกไปจริง. */
export const EREFERRAL_GATEWAY = {
  name: 'e-Referral Gateway (สำนักอนามัย กทม.)',
  endpoint: 'https://ereferral.bangkok.go.th/api/v1/referral',
  protocol: 'HL7 FHIR R4 · ServiceRequest + Encounter',
  status: 'degraded',
  statusLabel: 'เชื่อมต่อได้บางส่วน',
  lastSyncAt: '8 ส.ค. 2569 · 08:12',
  degradedSince: '8 ส.ค. 2569 · 07:40',
  note: 'ยังไม่มี gateway จริงในระบบต้นแบบ — คิวส่งออกด้านล่างเป็นสถานะจำลองตามรูปแบบข้อความที่กำหนดไว้',
};

export const EREFERRAL_QUEUE_STATUSES = [
  { key: 'sent',    label: 'ส่งสำเร็จ',      badge: 'success' },
  { key: 'pending', label: 'รอส่งในคิว',     badge: 'warning' },
  { key: 'failed',  label: 'ส่งไม่สำเร็จ',    badge: 'error'   },
];

export const eReferralStatusMeta = (key) =>
  EREFERRAL_QUEUE_STATUSES.find((s) => s.key === key) || EREFERRAL_QUEUE_STATUSES[1];

let seq = 0;
const uid = () => `ref-${Date.now().toString(36)}-${(seq += 1)}`;

let refNoSeq = 27;
export const nextReferNo = () => {
  refNoSeq += 1;
  return `RF-2569-${String(refNoSeq).padStart(5, '0')}`;
};

/* เลขที่ใบส่งต่อภายใน — ชุดเลขคนละชุดกับใบส่งต่อภายนอก (คู่มือ §2.1.19) */
let internalNoSeq = 131;
export const nextInternalReferNo = () => {
  internalNoSeq += 1;
  return `IR-2569-${String(internalNoSeq).padStart(5, '0')}`;
};

export const nextReferNoFor = (direction) =>
  (direction === 'internal' ? nextInternalReferNo() : nextReferNo());

/* แถวว่างของแบบส่งต่อ — ทุกฟิลด์ตามคู่มือ §2.5.1

   ห้ามออกเลขที่ใบส่งต่อที่นี่: ใบภายในใช้ชุด IR- คนละชุดกับ RF- ถ้าออกเลข
   ตั้งแต่สร้างแถวว่าง ทุกใบภายใน (และแถว seed ทุกแถว) จะกินเลข RF- ทิ้ง
   ทำให้ทะเบียนกระดาษมีเลขขาดหาย. ผู้เรียกเป็นคนกำหนดเลขตามทิศทางเอง
   (`nextReferNoFor(direction)`) และ `saveReferral()` เป็นตาข่ายกันพลาด
   ให้ใบที่ถูกบันทึกจริงมีเลขเสมอ. */
export const blankReferral = (patient = {}) => ({
  id: '',
  direction: 'out',
  referNo: '',
  cardNo: '',
  hn: patient.hn || '',
  cid: patient.nationalId || '',
  name: patient.name || '',
  lastVisitDate: '',
  billingCenter: 'center-4',
  fromCenter: 'center-4',
  toFacility: '',
  toFacilityOther: '',
  patientAddress: {
    houseNo: '', moo: '', soi: '', road: '',
    subDistrict: '', district: '', province: 'กรุงเทพมหานคร', zipcode: '',
  },
  patientPhone: patient.phone || '',
  rights: patient.rights || '',
  rightsExpired: false,
  history: '',
  symptom: '',
  labResult: '',
  treatmentGiven: '',
  requirement: '',
  communicableNotify: 'none',
  note: '',
  validUntil: '',
  sender: CURRENT_CLINICIAN.name,
  sentDate: '',
  receivedDate: '',
  status: 'draft',
  printCount: 0,
  printCopies: 2,
  cancelledAt: '', cancelReason: '',
  createdBy: CURRENT_CLINICIAN.name, createdAt: '', amendedAt: '',

  /* ส่งต่อภายในหน่วยงาน (§1.5.8.3) — ใช้เฉพาะ direction === 'internal' */
  internalDestination: '',
  assignee: '',
  dueDate: '',
  followUpGoal: '',
  assignedAt: '',
  assignmentAcceptedAt: '',

  /* e-Referral (§1.5.8.1 / §1.5.8.4) — ทะเบียนเลขที่และคิวส่งออก */
  eReferralNo: '',
  eReferralStatus: '',
  eReferralAttempts: 0,
  eReferralError: '',
  appointmentDate: '',
});

const REFERRALS = [
  {
    ...blankReferral(),
    id: 'ref-seed-1', direction: 'out', referNo: 'RF-2569-00021', cardNo: 'BKK-4-6900021',
    hn: '67-00001', cid: '1-1010-01234-56-7', name: 'นายสมชาย มั่นคง',
    lastVisitDate: '6 พฤษภาคม 2569', billingCenter: 'center-4', fromCenter: 'center-4',
    toFacility: 'bmr-klang',
    patientAddress: { houseNo: '99/12', moo: '-', soi: 'ลาดพร้าว 15', road: 'ลาดพร้าว', subDistrict: 'จอมพล', district: 'จตุจักร', province: 'กรุงเทพมหานคร', zipcode: '10900' },
    patientPhone: '081-234-9999', rights: 'ประกันสังคม', rightsExpired: false,
    history: 'ผู้รับบริการมีโรคประจำตัวความดันโลหิตสูงและโรคไตเรื้อรังระยะ 3 รักษาต่อเนื่องที่ศูนย์บริการมา 3 ปี',
    symptom: 'เหนื่อยง่าย นอนราบไม่ได้ ขาบวมทั้งสองข้างมา 1 สัปดาห์',
    labResult: 'Creatinine 2.4 mg/dL (H) · eGFR 31 · BUN 32 mg/dL (H) · K 5.4 mmol/L (H)',
    treatmentGiven: 'ให้ Furosemide 40 mg IV 1 ครั้ง และงดยา NSAIDs ทั้งหมด ติดตามสัญญาณชีพก่อนส่ง',
    requirement: 'ขอส่งต่อเพื่อประเมินภาวะหัวใจล้มเหลวและพิจารณารับไว้รักษาในโรงพยาบาล',
    communicableNotify: 'none', note: '',
    validUntil: '6 มิถุนายน 2569', sender: 'พญ.สมหญิง รักษ์ดี', sentDate: '6 พฤษภาคม 2569',
    status: 'sent', printCount: 2, createdAt: '6 พ.ค. 2569 · 10:40',
  },
  {
    ...blankReferral(),
    id: 'ref-seed-2', direction: 'out', referNo: 'RF-2569-00019', cardNo: '',
    hn: '67-00003', cid: '1-1101-34561-67-9', name: 'นายวีระ ดีงาม',
    lastVisitDate: '28 เมษายน 2569', billingCenter: 'center-4', fromCenter: 'center-4',
    toFacility: 'bmr-taksin',
    patientAddress: { houseNo: '18', moo: '4', soi: '', road: 'เจริญนคร', subDistrict: 'คลองต้นไทร', district: 'คลองสาน', province: 'กรุงเทพมหานคร', zipcode: '10600' },
    patientPhone: '089-564-2425', rights: 'ข้าราชการ', rightsExpired: false,
    history: 'เบาหวานชนิดที่ 2 คุมน้ำตาลไม่ได้ ไขมันในเลือดสูง',
    symptom: 'แผลที่เท้าขวาเรื้อรังไม่หาย 3 สัปดาห์ มีกลิ่นและมีหนอง',
    labResult: 'FBS 246 mg/dL (H) · HbA1c 10.2% (H)',
    treatmentGiven: '',
    requirement: 'ขอส่งต่อคลินิกเท้าเบาหวานเพื่อประเมินและทำแผลโดยทีมเฉพาะทาง',
    communicableNotify: 'none', note: '',
    validUntil: '', sender: 'นพ.ปิยะ วัฒนชัย', sentDate: '',
    status: 'draft', printCount: 0, createdAt: '28 เม.ย. 2569 · 15:11',
  },
  {
    ...blankReferral(),
    id: 'ref-seed-3', direction: 'out', referNo: 'RF-2569-00014', cardNo: 'BKK-4-6900014',
    hn: '67-00004', cid: '1-1101-34561-67-9', name: 'นางทักษพร ขำใจ',
    lastVisitDate: '2 เมษายน 2569', billingCenter: 'center-4', fromCenter: 'center-4',
    toFacility: 'bmr-vajira',
    patientAddress: { houseNo: '55/3', moo: '-', soi: 'สุทธิสาร 8', road: 'สุทธิสารวินิจฉัย', subDistrict: 'สามเสนนอก', district: 'ห้วยขวาง', province: 'กรุงเทพมหานคร', zipcode: '10310' },
    patientPhone: '086-889-1120', rights: 'บัตรทอง (UC)', rightsExpired: true,
    history: 'ไม่มีโรคประจำตัว ปฏิเสธประวัติแพ้ยา',
    symptom: 'คลำพบก้อนที่เต้านมซ้าย ขนาดประมาณ 2 ซม. ไม่เจ็บ',
    labResult: '', treatmentGiven: '',
    requirement: 'ขอส่งต่อเพื่อตรวจ Mammogram และประเมินโดยศัลยแพทย์',
    communicableNotify: 'none', note: 'สิทธิหมดอายุ — ต้องยืนยัน ศบส.ที่เรียกเก็บก่อนส่ง',
    validUntil: '2 พฤษภาคม 2569', sender: 'พญ.สมหญิง รักษ์ดี', sentDate: '2 เมษายน 2569',
    status: 'replied', printCount: 1, createdAt: '2 เม.ย. 2569 · 11:25',
  },
  {
    ...blankReferral(),
    id: 'ref-seed-4', direction: 'out', referNo: 'RF-2569-00009', cardNo: 'BKK-4-6900009',
    hn: '67-00005', cid: '1-1005-00432-11-2', name: 'นางสาวปิยะดา ชูใจ',
    lastVisitDate: '14 มีนาคม 2569', billingCenter: 'center-4', fromCenter: 'center-4',
    toFacility: 'bmr-charoen',
    patientAddress: { houseNo: '7', moo: '-', soi: '', road: 'ประชาสงเคราะห์', subDistrict: 'ดินแดง', district: 'ดินแดง', province: 'กรุงเทพมหานคร', zipcode: '10400' },
    patientPhone: '084-221-7788', rights: 'ประกันสังคม', rightsExpired: false,
    history: 'วัณโรคปอดกำลังรักษาระยะเข้มข้น',
    symptom: 'ไอมีเสมหะปนเลือด น้ำหนักลด 4 กก. ใน 1 เดือน',
    labResult: 'AFB 2+ · CXR: infiltration at RUL',
    treatmentGiven: 'เริ่มสูตรยา 2HRZE ครบ 3 สัปดาห์',
    requirement: 'ขอส่งต่อเพื่อประเมินภาวะดื้อยาและตรวจเสมหะเพาะเชื้อ',
    communicableNotify: 'notified', note: '',
    validUntil: '14 เมษายน 2569', sender: 'นพ.อนุชา ศรีวิไล', sentDate: '14 มีนาคม 2569',
    status: 'cancelled', cancelledAt: '18 มี.ค. 2569 · 09:04',
    cancelReason: 'ผู้รับบริการขอเปลี่ยนสถานพยาบาลปลายทาง — ออกใบส่งต่อฉบับใหม่แทน',
    printCount: 1, createdAt: '14 มี.ค. 2569 · 13:30',
  },
  /* ── รับเข้า (§2.5.3) ─────────────────────────────────────── */
  {
    ...blankReferral(),
    id: 'ref-seed-5', direction: 'in', referNo: 'RF-KLG-69-0442', cardNo: 'KLG-6900442',
    hn: '67-00002', cid: '1-1001-08881-44-6', name: 'นางสาวสมหญิง มีสุข',
    lastVisitDate: '30 เมษายน 2569', billingCenter: 'center-4', fromCenter: 'center-4',
    toFacility: 'bmr-klang',
    patientAddress: { houseNo: '112', moo: '-', soi: 'อินทามระ 22', road: 'สุทธิสาร', subDistrict: 'ดินแดง', district: 'ดินแดง', province: 'กรุงเทพมหานคร', zipcode: '10400' },
    patientPhone: '082-114-5566', rights: 'บัตรทอง (UC)', rightsExpired: false,
    history: 'ผ่าตัดไส้ติ่งเมื่อ 20 เมษายน 2569 ที่โรงพยาบาลกลาง',
    symptom: 'แผลผ่าตัดแห้งดี ไม่มีไข้',
    labResult: 'CBC ปกติ',
    treatmentGiven: 'ตัดไหมแล้วที่โรงพยาบาลกลาง',
    requirement: 'ส่งกลับเพื่อทำแผลและติดตามอาการต่อที่ศูนย์บริการใกล้บ้าน',
    communicableNotify: 'none', note: '',
    validUntil: '30 พฤษภาคม 2569', sender: 'นพ.ชัยวัฒน์ (รพ.กลาง)',
    sentDate: '30 เมษายน 2569', receivedDate: '2 พฤษภาคม 2569',
    status: 'replied', printCount: 0, createdAt: '2 พ.ค. 2569 · 08:40',
    incomingMedications: [
      { name: 'Paracetamol 500 mg', strength: '500 mg', usage: 'รับประทานครั้งละ 1 เม็ด ทุก 6 ชม. เมื่อปวด', startedOn: '20 เม.ย. 2569', prescriber: 'นพ.ชัยวัฒน์ (รพ.กลาง)' },
      { name: 'Cephalexin 500 mg', strength: '500 mg', usage: 'รับประทานครั้งละ 1 แคปซูล วันละ 4 ครั้ง', startedOn: '20 เม.ย. 2569', prescriber: 'นพ.ชัยวัฒน์ (รพ.กลาง)' },
    ],
  },
  {
    ...blankReferral(),
    id: 'ref-seed-6', direction: 'in', referNo: 'RF-TKS-69-0118', cardNo: '',
    hn: '', cid: '3-1009-00777-22-1', name: 'นายบุญส่ง แซ่ลี้',
    lastVisitDate: '', billingCenter: 'center-4', fromCenter: 'center-4',
    toFacility: 'bmr-taksin',
    patientAddress: { houseNo: '', moo: '', soi: '', road: '', subDistrict: '', district: '', province: 'กรุงเทพมหานคร', zipcode: '' },
    patientPhone: '', rights: '', rightsExpired: false,
    history: '', symptom: 'ความดันโลหิตสูงควบคุมไม่ได้ ขอส่งกลับดูแลต่อเนื่องใกล้บ้าน',
    labResult: '', treatmentGiven: '',
    requirement: 'ติดตามความดันโลหิตและจ่ายยาต่อเนื่อง',
    communicableNotify: 'none', note: '',
    validUntil: '', sender: 'พญ.กมลชนก (รพ.ตากสิน)',
    sentDate: '1 มิถุนายน 2569', receivedDate: '3 มิถุนายน 2569',
    status: 'sent', printCount: 0, createdAt: '3 มิ.ย. 2569 · 09:15',
  },
  /* ── ส่งต่อภายในหน่วยงาน (§1.5.8.3 · คู่มือ HCIS §2.1.17 / §2.1.19) ── */
  {
    ...blankReferral(),
    id: 'ref-seed-7', direction: 'internal', referNo: 'IR-2569-00131', cardNo: 'BKK-4-IN-69131',
    hn: '67-00001', cid: '1-1010-01234-56-7', name: 'นายสมชาย มั่นคง',
    lastVisitDate: '6 พฤษภาคม 2569', fromCenter: 'center-4', toFacility: '',
    patientAddress: { houseNo: '99/12', moo: '-', soi: 'ลาดพร้าว 15', road: 'ลาดพร้าว', subDistrict: 'จอมพล', district: 'จตุจักร', province: 'กรุงเทพมหานคร', zipcode: '10900' },
    patientPhone: '081-234-9999', rights: 'ประกันสังคม', rightsExpired: false,
    internalDestination: 'home-visit',
    assignee: 'พว.สุชาดา แก้วมณี (พยาบาลเยี่ยมบ้าน)',
    dueDate: '13 พฤษภาคม 2569',
    followUpGoal: 'ติดตามการกินยาขับปัสสาวะ ชั่งน้ำหนักทุกวัน และวัดความดันโลหิตที่บ้านสัปดาห์ละ 2 ครั้ง เป็นเวลา 4 สัปดาห์',
    history: 'ความดันโลหิตสูงและโรคไตเรื้อรังระยะ 3 อาศัยอยู่กับภรรยาสูงอายุ บ้านชั้นเดียวไม่มีลิฟต์',
    symptom: 'ขาบวมทั้งสองข้าง เหนื่อยง่ายเวลาเดินขึ้นบันได',
    requirement: 'ขอส่งงานเยี่ยมบ้านติดตามอาการบวมและการใช้ยาที่บ้าน',
    communicableNotify: 'none',
    sender: 'พญ.สมหญิง รักษ์ดี', sentDate: '6 พฤษภาคม 2569',
    assignedAt: '6 พ.ค. 2569 · 11:02', assignmentAcceptedAt: '6 พ.ค. 2569 · 13:20',
    status: 'sent', printCount: 1, createdAt: '6 พ.ค. 2569 · 10:55',
  },
  {
    ...blankReferral(),
    id: 'ref-seed-8', direction: 'internal', referNo: 'IR-2569-00127', cardNo: '',
    hn: '67-00003', cid: '1-1101-34561-67-9', name: 'นายวีระ ดีงาม',
    lastVisitDate: '28 เมษายน 2569', fromCenter: 'center-4', toFacility: '',
    patientAddress: { houseNo: '18', moo: '4', soi: '', road: 'เจริญนคร', subDistrict: 'คลองต้นไทร', district: 'คลองสาน', province: 'กรุงเทพมหานคร', zipcode: '10600' },
    patientPhone: '089-564-2425', rights: 'ข้าราชการ', rightsExpired: false,
    internalDestination: 'special-clinic',
    assignee: '',
    dueDate: '',
    followUpGoal: '',
    history: 'เบาหวานชนิดที่ 2 คุมน้ำตาลไม่ได้ต่อเนื่อง 3 ครั้ง',
    symptom: 'แผลที่เท้าขวาเรื้อรัง น้ำตาลปลายนิ้วสูงตลอด',
    requirement: 'ขอส่งคลินิกเฉพาะโรคเพื่อปรับสูตรยาและสอนการดูแลเท้า',
    communicableNotify: 'none',
    sender: 'นพ.ปิยะ วัฒนชัย', sentDate: '',
    status: 'draft', printCount: 0, createdAt: '28 เม.ย. 2569 · 15:30',
  },
  {
    ...blankReferral(),
    id: 'ref-seed-9', direction: 'internal', referNo: 'IR-2569-00118', cardNo: 'BKK-4-IN-69118',
    hn: '67-00004', cid: '1-1101-34561-67-9', name: 'นางทักษพร ขำใจ',
    lastVisitDate: '2 เมษายน 2569', fromCenter: 'center-4', toFacility: '',
    patientAddress: { houseNo: '55/3', moo: '-', soi: 'สุทธิสาร 8', road: 'สุทธิสารวินิจฉัย', subDistrict: 'สามเสนนอก', district: 'ห้วยขวาง', province: 'กรุงเทพมหานคร', zipcode: '10310' },
    patientPhone: '086-889-1120', rights: 'บัตรทอง (UC)', rightsExpired: true,
    internalDestination: 'social-welfare',
    assignee: 'นางสาวพัชรี ทองสุข (นักสังคมสงเคราะห์ชำนาญการ)',
    dueDate: '9 เมษายน 2569',
    followUpGoal: 'ประเมินสิทธิการรักษาที่หมดอายุและสภาพเศรษฐกิจครอบครัวเพื่อขอสงเคราะห์ค่าเดินทางไปตรวจ Mammogram',
    history: 'ไม่มีโรคประจำตัว สิทธิบัตรทองหมดอายุ ไม่มีรายได้ประจำ',
    symptom: 'คลำพบก้อนที่เต้านมซ้าย ต้องส่งตรวจต่อแต่ไม่มีค่าเดินทาง',
    requirement: 'ขอส่งงานสังคมสงเคราะห์ช่วยประเมินและประสานสิทธิ',
    communicableNotify: 'none',
    sender: 'พญ.สมหญิง รักษ์ดี', sentDate: '2 เมษายน 2569',
    assignedAt: '2 เม.ย. 2569 · 14:10',
    status: 'cancelled', cancelledAt: '4 เม.ย. 2569 · 09:30',
    cancelReason: 'ผู้รับบริการต่ออายุสิทธิบัตรทองเรียบร้อยแล้ว จึงไม่ต้องส่งสังคมสงเคราะห์',
    printCount: 1, createdAt: '2 เม.ย. 2569 · 13:45',
  },
  {
    ...blankReferral(),
    id: 'ref-seed-10', direction: 'internal', referNo: 'IR-2569-00104', cardNo: 'BKK-4-IN-69104',
    hn: '67-00002', cid: '1-1001-08881-44-6', name: 'นางสาวสมหญิง มีสุข',
    lastVisitDate: '30 เมษายน 2569', fromCenter: 'center-4', toFacility: '',
    patientAddress: { houseNo: '112', moo: '-', soi: 'อินทามระ 22', road: 'สุทธิสาร', subDistrict: 'ดินแดง', district: 'ดินแดง', province: 'กรุงเทพมหานคร', zipcode: '10400' },
    patientPhone: '082-114-5566', rights: 'บัตรทอง (UC)', rightsExpired: false,
    internalDestination: 'rehab',
    assignee: 'กภ.ธนวัฒน์ พูนผล (นักกายภาพบำบัด)',
    dueDate: '7 พฤษภาคม 2569',
    followUpGoal: 'ฝึกการเคลื่อนไหวหลังผ่าตัดช่องท้อง ประเมินความแข็งแรงกล้ามเนื้อหน้าท้องซ้ำใน 2 สัปดาห์',
    history: 'หลังผ่าตัดไส้ติ่ง 20 เม.ย. 2569 แผลแห้งดี',
    symptom: 'ลุกนั่งลำบาก ปวดตึงแผลเวลาเปลี่ยนท่า',
    requirement: 'ขอส่งกายภาพบำบัดฟื้นฟูหลังผ่าตัด',
    communicableNotify: 'none',
    sender: 'นพ.อนุชา ศรีวิไล', sentDate: '2 พฤษภาคม 2569',
    assignedAt: '2 พ.ค. 2569 · 09:05', assignmentAcceptedAt: '2 พ.ค. 2569 · 09:40',
    status: 'replied', printCount: 2, createdAt: '2 พ.ค. 2569 · 08:55',
  },
];

/* e-Referral: เติมเลขที่/สถานะคิวส่งออกให้ใบส่งต่อภายนอกที่ส่งแล้ว
   (mock — ไม่ได้ยิงออก gateway จริง) */
const EREFERRAL_SEED = {
  'ref-seed-1': { eReferralNo: 'ERF-6900021-KLG', eReferralStatus: 'sent',    eReferralAttempts: 1, appointmentDate: '12 พฤษภาคม 2569' },
  'ref-seed-3': { eReferralNo: 'ERF-6900014-VJR', eReferralStatus: 'failed',  eReferralAttempts: 3, eReferralError: 'ปลายทางตอบกลับ 409 — เลขบัตรประชาชนไม่ตรงกับทะเบียนราษฎร์', appointmentDate: '' },
  'ref-seed-4': { eReferralNo: 'ERF-6900009-CKP', eReferralStatus: 'pending', eReferralAttempts: 0, appointmentDate: '' },
};
REFERRALS.forEach((r) => { if (EREFERRAL_SEED[r.id]) Object.assign(r, EREFERRAL_SEED[r.id]); });

const listeners = new Set();
const emit = () => { listeners.forEach((fn) => fn(REFERRALS)); };

export const subscribeReferrals = (fn) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};

export const getReferrals = () => REFERRALS.map((r) => ({ ...r }));

export const referralsByDirection = (direction) =>
  getReferrals().filter((r) => r.direction === direction);

export const referralsForPatient = (hn) =>
  getReferrals().filter((r) => r.hn === hn);

/* legend "ข้อมูลไม่สมบูรณ์" ของคู่มือ §2.5.2 — แถวที่ยังขาดฟิลด์บังคับ

   ปลายทางภายนอกกรอกได้ 2 ทาง: เลือกจาก dropdown (`toFacility`) หรือพิมพ์
   ชื่อสถานพยาบาลนอกรายการเอง (`toFacilityOther`) — ฟอร์มถือว่าทั้งสองทาง
   ใช้ได้ ตัวตรวจจึงต้องรับทั้งคู่ ไม่งั้นใบที่พิมพ์ชื่อเองจะถูกบล็อกที่ปุ่ม
   "ส่งใบส่งต่อ" ทั้งที่ไม่มี error รายฟิลด์ให้แก้. */
export const REQUIRED_REFER_FIELDS = [
  {
    key: 'toFacility',
    label: 'สถานพยาบาลปลายทาง',
    has: (r) => !!String(r?.toFacility || '').trim() || !!String(r?.toFacilityOther || '').trim(),
  },
  { key: 'symptom',    label: 'อาการ / เหตุผลการส่ง' },
  { key: 'sender',     label: 'ผู้ส่ง' },
];

/* ส่งต่อภายในไม่ต้องมีสถานพยาบาลปลายทาง/สิทธิเรียกเก็บ แต่ต้องมี
   หน่วยงานปลายทางภายใน + ผู้รับมอบหมาย + วันเยี่ยม/วันนัด */
export const REQUIRED_INTERNAL_FIELDS = [
  { key: 'internalDestination', label: 'หน่วยงานปลายทางภายใน' },
  { key: 'assignee',            label: 'ผู้รับมอบหมาย' },
  { key: 'dueDate',             label: 'กำหนดวันเยี่ยม / วันนัด' },
  { key: 'symptom',             label: 'อาการ / เหตุผลการส่ง' },
  { key: 'sender',              label: 'ผู้ส่ง' },
];

export const requiredFieldsFor = (direction) =>
  (direction === 'internal' ? REQUIRED_INTERNAL_FIELDS : REQUIRED_REFER_FIELDS);

export const missingReferFields = (row) => requiredFieldsFor(row?.direction)
  .filter((f) => (f.has ? !f.has(row) : !String(row?.[f.key] || '').trim()))
  .map((f) => f.label)
  .concat(!String(row?.hn || '').trim() ? ['HN ในระบบ'] : []);

export const isReferIncomplete = (row) => missingReferFields(row).length > 0;

export const saveReferral = (draft) => {
  const isNew = !draft.id || !REFERRALS.some((r) => r.id === draft.id);
  if (isNew) {
    const row = {
      ...draft,
      id: uid(),
      /* เลขที่ออกตอน "บันทึกจริง" เท่านั้น — ผู้เรียกที่ไม่ได้กำหนดเลขมาเอง
         (เช่น การส่งต่อจากหน้าเฝ้าสังเกตอาการ) จะได้เลขตามทิศทางที่ถูกต้อง */
      referNo: draft.referNo || nextReferNoFor(draft.direction),
      createdBy: CURRENT_CLINICIAN.name,
      createdAt: stampNow(),
    };
    REFERRALS.unshift(row);
    emit();
    appendAudit({
      hn: row.hn, category: 'refer',
      field: `สร้างใบส่งต่อ${row.direction === 'internal' ? 'ภายใน' : ''} ${row.referNo}`,
      oldValue: '—', newValue: `${referStatusMeta(row.status).label} → ${referralTargetLabel(row)}`,
    });
    return { ...row };
  }
  const row = REFERRALS.find((r) => r.id === draft.id);
  const before = referStatusMeta(row.status).label;
  Object.assign(row, draft, { amendedAt: stampNow() });
  emit();
  appendAudit({
    hn: row.hn, category: 'refer', field: `แก้ไขใบส่งต่อ ${row.referNo}`,
    oldValue: before, newValue: referStatusMeta(row.status).label,
  });
  return { ...row };
};

/* ปลายทางของใบนี้ในรูปข้อความ — ใช้ทั้งในตาราง, timeline และ audit */
export const referralTargetLabel = (row) => {
  if (!row) return '—';
  if (row.direction === 'internal') {
    return internalDestinationMeta(row.internalDestination)?.label || 'ยังไม่ระบุหน่วยงานภายใน';
  }
  return facilityMeta(row.toFacility)?.label || row.toFacilityOther || 'ยังไม่ระบุปลายทาง';
};

export const sendReferral = (id) => {
  const row = REFERRALS.find((r) => r.id === id);
  if (!row) return null;
  row.status = 'sent';
  row.sentDate = row.sentDate || stampNow().split(' · ')[0];
  row.amendedAt = stampNow();
  if (row.direction === 'internal') {
    /* ส่งต่อภายใน = มอบหมายงานให้หน่วยงานใน ศบส. — ประทับเวลามอบหมาย
       เพื่อให้การ "แก้ไข" ภายหลังเตือนได้ว่าผู้รับมอบหมายอาจเริ่มงานแล้ว */
    row.assignedAt = row.assignedAt || stampNow();
  } else {
    /* ฝั่งภายนอกเข้าคิว e-Referral — ยังไม่มี gateway จริง จึงเข้าคิวรอส่ง */
    row.eReferralNo = row.eReferralNo || `ERF-${row.referNo.replace(/[^0-9]/g, '').slice(-7)}-OUT`;
    row.eReferralStatus = row.eReferralStatus || 'pending';
  }
  emit();
  appendAudit({
    hn: row.hn, category: 'refer',
    field: `${row.direction === 'internal' ? 'มอบหมายใบส่งต่อภายใน' : 'ส่งแบบส่งต่อ'} ${row.referNo}`,
    oldValue: 'ร่าง',
    newValue: `ส่งแล้ว → ${referralTargetLabel(row)}${row.assignee ? ` (ผู้รับมอบหมาย ${row.assignee})` : ''}`,
  });
  return { ...row };
};

/* ยกเลิกใบที่ส่งแล้ว: คงเลขที่ส่งต่อไว้ในทะเบียนเสมอ (ห้ามลบ) */
export const cancelReferral = (id, reason) => {
  const row = REFERRALS.find((r) => r.id === id);
  if (!row) return null;
  const before = referStatusMeta(row.status).label;
  row.status = 'cancelled';
  row.cancelledAt = stampNow();
  row.cancelReason = reason || 'ไม่ได้ระบุเหตุผล';
  row.cancelledBy = CURRENT_CLINICIAN.name;
  emit();
  appendAudit({
    hn: row.hn, category: 'refer', field: `ยกเลิกใบส่งต่อ ${row.referNo}`,
    oldValue: before, newValue: `ยกเลิก — ${row.cancelReason}`,
  });
  return { ...row };
};

export const printReferral = (id, copies = 1) => {
  const row = REFERRALS.find((r) => r.id === id);
  if (!row) return null;
  row.printCount = (row.printCount || 0) + copies;
  emit();
  appendAudit({
    hn: row.hn, category: 'refer', field: `พิมพ์แบบส่งต่อ ${row.referNo}`,
    oldValue: `พิมพ์แล้ว ${row.printCount - copies} ชุด`, newValue: `พิมพ์เพิ่ม ${copies} ชุด (รวม ${row.printCount})`,
  });
  return { ...row };
};

/* ── ประวัติการส่งต่อรายผู้ป่วยข้าม visit (TOR §1.5.8.2) ────────────
   เรียงตามเวลาเสมอ (ใหม่ → เก่า) แม้ข้ามทิศทาง. ใบที่ยกเลิกยังอยู่ใน
   timeline (ขีดฆ่า ไม่ลบ) และใบหมดอายุถูกคำนวณป้ายให้พร้อมใช้. */
const TH_FULL_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const TH_SHORT_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/* รับได้ทั้ง "6 พฤษภาคม 2569" และ "6 พ.ค. 2569 · 10:40" */
export const parseThaiDateString = (s) => {
  const m = String(s || '').match(/(\d{1,2})\s+(\S+)\s+(\d{4})/);
  if (!m) return null;
  let mi = TH_FULL_MONTHS.indexOf(m[2]);
  if (mi < 0) mi = TH_SHORT_MONTHS.indexOf(m[2]);
  if (mi < 0) return null;
  return new Date(Number(m[3]) - 543, mi, Number(m[1]));
};

export const isReferralExpired = (row) => {
  if (!row?.validUntil) return false;
  const d = parseThaiDateString(row.validUntil);
  return !!d && d.getTime() < Date.now();
};

const referralTimeValue = (row) => {
  const d = parseThaiDateString(row.sentDate)
    || parseThaiDateString(row.createdAt)
    || parseThaiDateString(row.lastVisitDate);
  return d ? d.getTime() : 0;
};

export const referralHistoryForPatient = (hn) => {
  const key = String(hn || '').trim();
  if (!key) return [];
  return getReferrals()
    .filter((r) => r.hn === key)
    .map((r) => ({
      ...r,
      targetLabel: referralTargetLabel(r),
      expired: isReferralExpired(r),
      sortValue: referralTimeValue(r),
    }))
    .sort((a, b) => b.sortValue - a.sortValue);
};

export const referralHistorySummary = (hn) => {
  const rows = referralHistoryForPatient(hn);
  return {
    total: rows.length,
    out: rows.filter((r) => r.direction === 'out').length,
    incoming: rows.filter((r) => r.direction === 'in').length,
    internal: rows.filter((r) => r.direction === 'internal').length,
    cancelled: rows.filter((r) => r.status === 'cancelled').length,
    expired: rows.filter((r) => r.expired).length,
    latest: rows[0] || null,
  };
};

/* ── คิวส่งออก e-Referral (§1.5.8.1 / §1.5.8.4) ───────────────── */
export const eReferralQueue = () => getReferrals()
  .filter((r) => r.direction === 'out' && !!r.eReferralStatus)
  .map((r) => ({
    id: r.id,
    referNo: r.referNo,
    eReferralNo: r.eReferralNo,
    name: r.name,
    hn: r.hn,
    facility: facilityMeta(r.toFacility)?.label || r.toFacilityOther || '—',
    status: r.eReferralStatus,
    attempts: r.eReferralAttempts || 0,
    error: r.eReferralError || '',
    appointmentDate: r.appointmentDate || '',
    sentDate: r.sentDate || '',
  }));

/* ลองส่งซ้ำ — ยังไม่มี gateway จริง จึงจำลองผลลัพธ์แบบตรงไปตรงมา:
   ใบที่ error เพราะข้อมูลไม่ตรงจะ fail ซ้ำจนกว่าจะแก้ข้อมูลต้นทาง */
export const retryEReferral = (id) => {
  const row = REFERRALS.find((r) => r.id === id);
  if (!row) return null;
  const before = eReferralStatusMeta(row.eReferralStatus).label;
  row.eReferralAttempts = (row.eReferralAttempts || 0) + 1;
  if (row.eReferralError) {
    row.eReferralStatus = 'failed';
  } else {
    row.eReferralStatus = 'sent';
    row.appointmentDate = row.appointmentDate || '';
  }
  emit();
  appendAudit({
    hn: row.hn, category: 'refer', field: `ลองส่ง e-Referral ซ้ำ ${row.eReferralNo || row.referNo}`,
    oldValue: before,
    newValue: `${eReferralStatusMeta(row.eReferralStatus).label} (ครั้งที่ ${row.eReferralAttempts})${row.eReferralError ? ` — ${row.eReferralError}` : ''}`,
  });
  return { ...row };
};

/* บันทึกวันที่ปลายทางนัดให้ผู้รับบริการมารับบริการ (§1.5.8.4) */
export const setReferralAppointmentDate = (id, date) => {
  const row = REFERRALS.find((r) => r.id === id);
  if (!row) return null;
  const before = row.appointmentDate || '—';
  row.appointmentDate = date || '';
  emit();
  appendAudit({
    hn: row.hn, category: 'refer', field: `วันที่มารับบริการปลายทาง ${row.referNo}`,
    oldValue: before, newValue: row.appointmentDate || '—',
  });
  return { ...row };
};

/* ยาที่ติดมากับใบส่งตัวขาเข้า — ป้อนให้ Med Rec (screen 5) */
export const incomingMedicationsFor = (hn) => getReferrals()
  .filter((r) => r.direction === 'in' && r.hn === hn && Array.isArray(r.incomingMedications))
  .flatMap((r) => r.incomingMedications.map((m) => ({
    ...m,
    sourceLabel: `ยาจากสถานพยาบาลอื่น (${facilityMeta(r.toFacility)?.label || 'ใบส่งตัว'} · ${r.referNo})`,
  })));

export default REFERRALS;
