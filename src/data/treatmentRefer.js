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

let seq = 0;
const uid = () => `ref-${Date.now().toString(36)}-${(seq += 1)}`;

let refNoSeq = 27;
export const nextReferNo = () => {
  refNoSeq += 1;
  return `RF-2569-${String(refNoSeq).padStart(5, '0')}`;
};

/* แถวว่างของแบบส่งต่อ — ทุกฟิลด์ตามคู่มือ §2.5.1 */
export const blankReferral = (patient = {}) => ({
  id: '',
  direction: 'out',
  referNo: nextReferNo(),
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
];

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

/* legend "ข้อมูลไม่สมบูรณ์" ของคู่มือ §2.5.2 — แถวที่ยังขาดฟิลด์บังคับ */
export const REQUIRED_REFER_FIELDS = [
  { key: 'toFacility', label: 'สถานพยาบาลปลายทาง' },
  { key: 'symptom',    label: 'อาการ / เหตุผลการส่ง' },
  { key: 'sender',     label: 'ผู้ส่ง' },
];

export const missingReferFields = (row) => REQUIRED_REFER_FIELDS
  .filter((f) => !String(row?.[f.key] || '').trim())
  .map((f) => f.label)
  .concat(!String(row?.hn || '').trim() ? ['HN ในระบบ'] : []);

export const isReferIncomplete = (row) => missingReferFields(row).length > 0;

export const saveReferral = (draft) => {
  const isNew = !draft.id || !REFERRALS.some((r) => r.id === draft.id);
  if (isNew) {
    const row = {
      ...draft,
      id: uid(),
      createdBy: CURRENT_CLINICIAN.name,
      createdAt: stampNow(),
    };
    REFERRALS.unshift(row);
    emit();
    appendAudit({
      hn: row.hn, category: 'refer', field: `สร้างใบส่งต่อ ${row.referNo}`,
      oldValue: '—', newValue: `${referStatusMeta(row.status).label} → ${facilityMeta(row.toFacility)?.label || 'ยังไม่ระบุปลายทาง'}`,
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

export const sendReferral = (id) => {
  const row = REFERRALS.find((r) => r.id === id);
  if (!row) return null;
  row.status = 'sent';
  row.sentDate = row.sentDate || stampNow().split(' · ')[0];
  row.amendedAt = stampNow();
  emit();
  appendAudit({
    hn: row.hn, category: 'refer', field: `ส่งแบบส่งต่อ ${row.referNo}`,
    oldValue: 'ร่าง', newValue: `ส่งแล้ว → ${facilityMeta(row.toFacility)?.label || '—'}`,
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

/* ยาที่ติดมากับใบส่งตัวขาเข้า — ป้อนให้ Med Rec (screen 5) */
export const incomingMedicationsFor = (hn) => getReferrals()
  .filter((r) => r.direction === 'in' && r.hn === hn && Array.isArray(r.incomingMedications))
  .flatMap((r) => r.incomingMedications.map((m) => ({
    ...m,
    sourceLabel: `ยาจากสถานพยาบาลอื่น (${facilityMeta(r.toFacility)?.label || 'ใบส่งตัว'} · ${r.referNo})`,
  })));

export default REFERRALS;
