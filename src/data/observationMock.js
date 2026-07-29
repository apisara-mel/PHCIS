/* Mock data for Observation System (1.14 ระบบสังเกตอาการ / ER-Observation / Day Bed)
   Based on Obsidian BMA Health TOR Requirements:
   - Timed vital-sign trend (กราฟ/ตารางแนวโน้มสัญญาณชีพตามช่วงเวลา + EWS Score)
   - Stat/urgent orders & nursing interventions
   - Observation bed Floor Map / Queue Management
   - Discharge summary & disposition (Discharge Home, Refer, Admit IPD, OPD) */

import { PATIENT_PROFILES } from '@/data/patientProfiles';

export const EWS_RISK_TIERS = {
  NORMAL: { level: 'low', label: 'ปกติ (EWS 0-1)', style: 'success', color: '#00875A' },
  WARNING: { level: 'medium', label: 'เฝ้าระวัง (EWS 2-4)', style: 'yellow', color: '#D97706' },
  CRITICAL: { level: 'high', label: 'วิกฤต/ต้องติดตาม (EWS ≥5)', style: 'error', color: '#DE350B' },
};

/** Calculate National Early Warning Score (NEWS / EWS) based on vitals */
export function calculateEwsScore({ bpSys, pulse, temp, spo2, rr }) {
  let score = 0;
  if (!bpSys || !pulse || !temp || !spo2 || !rr) return { score: 0, tier: EWS_RISK_TIERS.NORMAL };

  // Respiratory Rate
  if (rr <= 8 || rr >= 25) score += 3;
  else if (rr >= 21 && rr <= 24) score += 2;
  else if (rr >= 9 && rr <= 11) score += 1;

  // Oxygen Saturation
  if (spo2 <= 91) score += 3;
  else if (spo2 >= 92 && spo2 <= 93) score += 2;
  else if (spo2 >= 94 && spo2 <= 95) score += 1;

  // Systolic BP
  if (bpSys <= 90 || bpSys >= 220) score += 3;
  else if (bpSys >= 91 && bpSys <= 100) score += 2;
  else if (bpSys >= 101 && bpSys <= 110) score += 1;

  // Pulse Rate
  if (pulse <= 40 || pulse >= 131) score += 3;
  else if (pulse >= 111 && pulse <= 130) score += 2;
  else if (pulse >= 41 && pulse <= 50 || pulse >= 91 && pulse <= 110) score += 1;

  // Temperature
  if (temp <= 35.0) score += 3;
  else if (temp >= 39.1) score += 2;
  else if (temp >= 35.1 && temp <= 36.0 || temp >= 38.1 && temp <= 39.0) score += 1;

  let tier = EWS_RISK_TIERS.NORMAL;
  if (score >= 5) tier = EWS_RISK_TIERS.CRITICAL;
  else if (score >= 2) tier = EWS_RISK_TIERS.WARNING;

  return { score, tier };
}

export const MOCK_OBSERVATION_PATIENTS = [
  {
    id: 'obs-001',
    bedNo: 'เตียง 01',
    bedType: 'เตียงไฟฟ้า (High Care)',
    status: 'observing', // observing | ready_discharge | discharged
    severity: 'warning', // normal | warning | critical
    patientName: 'นาย สมชาย ใจดี',
    avatar: '/avatars/patient-mock-01.png',
    hn: '67004128',
    vn: 'VN670728-091',
    age: 58,
    gender: 'ชาย',
    admitTime: '2026-07-28 08:30 น.',
    durationMinutes: 215, // 3h 35m
    chiefComplaint: 'แน่นหน้าอก หายใจไม่สะดวก หลังออกกำลังกาย 1 ชม. ก่อนมา',
    diagnosis: 'Acute Bronchospasm / Observe IHD',
    doctorName: 'นพ. วรวิทย์ เกียรติเจริญ',
    nurseName: 'พว. สุภาพร ชัยมงคล',
    rights: 'สิทธิบัตรทอง (NHSO)',
    vitalsTrend: [
      { time: '08:30 น.', bpSys: 145, bpDia: 92, pulse: 104, temp: 37.2, spo2: 94, rr: 24, note: 'แรกรับเตียง สังเกตอาการ ใส่ O2 Cannula 3L/min', ews: 3 },
      { time: '09:00 น.', bpSys: 138, bpDia: 88, pulse: 96,  temp: 37.1, spo2: 96, rr: 22, note: 'หลังพ่นยา Berodual Neb 1 dose อาการดีขึ้น', ews: 2 },
      { time: '10:00 น.', bpSys: 132, bpDia: 84, pulse: 88,  temp: 36.9, spo2: 98, rr: 20, note: 'ผู้ป่วยรู้สึกตัวดี ไม่มีแน่นหน้าอกเพิ่ม', ews: 0 },
      { time: '11:30 น.', bpSys: 128, bpDia: 82, pulse: 82,  temp: 36.8, spo2: 98, rr: 18, note: 'สัญญาณชีพคงที่ พร้อมประเมินจำหน่าย', ews: 0 },
    ],
    statOrders: [
      { id: 'ord-1', orderTime: '08:35 น.', orderText: 'Oxygen cannula 3 LPM keep SpO2 > 95%', status: 'completed', executedBy: 'พว. สุภาพร', executedTime: '08:37 น.' },
      { id: 'ord-2', orderTime: '08:40 น.', orderText: 'Berodual 1 respule + NSS 3 ml Nebulizer Stat', status: 'completed', executedBy: 'พว. สุภาพร', executedTime: '08:45 น.' },
      { id: 'ord-3', orderTime: '09:15 น.', orderText: 'EKG 12 leads Stat & EKG Serial at 2 hrs', status: 'completed', executedBy: 'นพ. วรวิทย์', executedTime: '09:30 น.' },
      { id: 'ord-4', orderTime: '10:30 น.', orderText: 'NSS 1,000 ml IV drip 80 ml/hr', status: 'in_progress', executedBy: 'พว. สุภาพร', executedTime: '10:35 น.' },
    ],
    nursingNotes: [
      { time: '08:35 น.', nurse: 'พว. สุภาพร', note: 'รับผู้ป่วยเข้านอนเตียงสังเกตอาการ 01 มีอาการหายใจเหนื่อย ให้ออกซิเจน cannula 3 LPM' },
      { time: '09:00 น.', nurse: 'พว. สุภาพร', note: 'พ่นยาขยายหลอดลม Berodual ครบ 1 dose ฟังเสียงปอด Wheezing ลดลง' },
      { time: '11:30 น.', nurse: 'พว. สุภาพร', note: 'ผู้ป่วยลุกนั่งได้ ทานอาหารอ่อนได้ ไม่มีเหนื่อยหอบ V/S Stable' },
    ],
    dischargeSummary: {
      disposition: 'home', // home | refer | admit_ipd | opd
      doctorSummary: 'ผู้ป่วยอาการ bronchospasm ดีขึ้นหลังพ่นยา EKG ปกติ สัญญาณชีพคงที่ อนุญาตให้กลับบ้านพร้อมยาพ่นประจำตัว',
      dischargeVitals: { bpSys: 126, bpDia: 80, pulse: 80, temp: 36.7, spo2: 99, rr: 18 },
      dischargeAdvice: 'พ่นยาตามแพทย์สั่ง เลี่ยงฝุ่น PM2.5 หากเหนื่อยหอบเพิ่มให้รีบมาพบแพทย์ทันที',
      referHospital: '',
      isDischarged: false,
    },
  },
  {
    id: 'obs-002',
    bedNo: 'เตียง 02',
    bedType: 'เตียงกึ่งพิเศษ',
    status: 'observing',
    severity: 'critical',
    patientName: 'นาง สมศรี มีสุข',
    avatar: '/avatars/patient-mock-02.png',
    hn: '67005932',
    vn: 'VN670728-104',
    age: 72,
    gender: 'หญิง',
    admitTime: '2026-07-28 09:45 น.',
    durationMinutes: 140, // 2h 20m
    chiefComplaint: 'เวียนศีรษะ บ้านหมุน คลื่นไส้อาเจียน 3 ครั้ง ความดันสูง 180/105',
    diagnosis: 'Hypertensive Urgency / Acute Vertigo',
    doctorName: 'พญ. ปรียาภรณ์ สุขสวัสดิ์',
    nurseName: 'พว. นิภา วงศ์สว่าง',
    rights: 'สิทธิข้าราชการ (Direct Billing)',
    vitalsTrend: [
      { time: '09:45 น.', bpSys: 182, bpDia: 106, pulse: 112, temp: 37.0, spo2: 96, rr: 22, note: 'ความดันสูงมาก เวียนศีรษะมาก ให้นอนราบ', ews: 3 },
      { time: '10:15 น.', bpSys: 168, bpDia: 98,  pulse: 102, temp: 36.9, spo2: 97, rr: 20, note: 'หลังให้ยา Amlodipine 10mg + Plasil 10mg IV', ews: 2 },
      { time: '11:15 น.', bpSys: 154, bpDia: 92,  pulse: 94,  temp: 36.8, spo2: 97, rr: 19, note: 'ความดันค่อยๆ ลดลง อาการเวียนศีรษะเบาลง', ews: 1 },
    ],
    statOrders: [
      { id: 'ord-21', orderTime: '09:50 น.', orderText: 'Amlodipine (10mg) 1 tab oral Stat', status: 'completed', executedBy: 'พว. นิภา', executedTime: '09:52 น.' },
      { id: 'ord-22', orderTime: '09:50 น.', orderText: 'Plasil (Metoclopramide 10mg) IV Stat', status: 'completed', executedBy: 'พว. นิภา', executedTime: '09:55 น.' },
      { id: 'ord-23', orderTime: '10:45 น.', orderText: 'Re-check BP q 30 min, High Risk Fall Precaution', status: 'in_progress', executedBy: 'พว. นิภา', executedTime: '10:45 น.' },
    ],
    nursingNotes: [
      { time: '09:45 น.', nurse: 'พว. นิภา', note: 'รับนอนเตียง 02 ยกไม้นวดข้างเตียง 2 ข้าง ป้องกันการพลัดตกหกล้ม' },
      { time: '10:15 น.', nurse: 'พว. นิภา', note: 'ให้ยาตามคำสั่งแพทย์ คลื่นไส้ลดลง นอนพักผ่อนบนเตียง' },
    ],
    dischargeSummary: {
      disposition: 'opd',
      doctorSummary: 'ติดตามความดันโลหิต ให้สังเกตอาการต่ออีก 1 ชม. ก่อนส่งกลับคลินิกความดัน',
      dischargeVitals: { bpSys: 154, bpDia: 92, pulse: 94, temp: 36.8, spo2: 97, rr: 19 },
      dischargeAdvice: 'หลีกเลี่ยงการลุกเดินกะทันหัน ทานยาลดความดันสม่ำเสมอ',
      referHospital: '',
      isDischarged: false,
    },
  },
  {
    id: 'obs-003',
    bedNo: 'เตียง 03',
    bedType: 'เตียงพับได้ / Recliner',
    status: 'ready_discharge',
    severity: 'normal',
    patientName: 'เด็กชาย กิตติพงษ์ เด่นดวง',
    avatar: '/avatars/patient-mock-03.png',
    hn: '67008120',
    vn: 'VN670728-052',
    age: 9,
    gender: 'ชาย',
    admitTime: '2026-07-28 07:15 น.',
    durationMinutes: 290, // 4h 50m
    chiefComplaint: 'ไข้สูง 38.8 C ปวดศีรษะ อ่อนเพลีย ซดน้ำเกลือแร่ไม่ได้',
    diagnosis: 'Acute Viral Infection / Dehydration',
    doctorName: 'พญ. นภัสสร สายชล',
    nurseName: 'พว. กัลยา จิตต์มั่น',
    rights: 'สิทธิบัตรทอง (NHSO)',
    vitalsTrend: [
      { time: '07:15 น.', bpSys: 108, bpDia: 68, pulse: 118, temp: 38.8, spo2: 98, rr: 22, note: 'แรกรับ ไข้สูง เช็ดตัวลดไข้ ให้ Paracetamol syrup', ews: 2 },
      { time: '08:15 น.', bpSys: 110, bpDia: 70, pulse: 104, temp: 37.8, spo2: 99, rr: 20, note: 'เช็ดตัวลดไข้ ดื่ม ORS ได้ดีขึ้น', ews: 0 },
      { time: '10:15 น.', bpSys: 112, bpDia: 72, pulse: 92,  temp: 36.8, spo2: 99, rr: 18, note: 'ไข้ลด ร่าเริง กินอาหารว่างได้', ews: 0 },
      { time: '11:45 น.', bpSys: 112, bpDia: 70, pulse: 88,  temp: 36.6, spo2: 99, rr: 18, note: 'อาการทั่วไปปกติ พร้อมกลับบ้าน', ews: 0 },
    ],
    statOrders: [
      { id: 'ord-31', orderTime: '07:20 น.', orderText: 'Paracetamol syrup (250mg/5ml) 7.5 ml oral Stat', status: 'completed', executedBy: 'พว. กัลยา', executedTime: '07:22 น.' },
      { id: 'ord-32', orderTime: '07:25 น.', orderText: 'Tepid sponge Stat for high fever', status: 'completed', executedBy: 'พว. กัลยา', executedTime: '07:30 น.' },
      { id: 'ord-33', orderTime: '08:30 น.', orderText: 'ORS sachet 1 pack dissolve in 250ml water, sip frequently', status: 'completed', executedBy: 'พว. กัลยา', executedTime: '08:35 น.' },
    ],
    nursingNotes: [
      { time: '07:20 น.', nurse: 'พว. กัลยา', note: 'รับเด็กนอนเตียงสังเกตอาการ ไข้ 38.8 C ป้อนยาและเช็ดตัวลดไข้' },
      { time: '10:15 น.', nurse: 'พว. กัลยา', note: 'เด็กไข้ลดลง เล่นของเล่นได้ ไม่งอแง ทานน้ำเกลือแร่หมด 1 แก้ว' },
    ],
    dischargeSummary: {
      disposition: 'home',
      doctorSummary: 'ผู้ป่วยเด็กอาการไข้ viral infection ดีขึ้น ไข้ลดลง ทานอาหารและน้ำได้ดี สัญญาณชีพปกติ อนุญาตจำหน่ายกลับบ้าน',
      dischargeVitals: { bpSys: 112, bpDia: 70, pulse: 88, temp: 36.6, spo2: 99, rr: 18 },
      dischargeAdvice: 'ทานยาปราบไข้ Paracetamol ทุก 4-6 ชม. เมื่อมีไข้ เช็ดตัวลดไข้ต่อเนื่อง หากซึม อ้วก ทานไม่ได้ ให้พามาโรงพยาบาล',
      referHospital: '',
      isDischarged: true,
    },
  },
  {
    id: 'obs-004',
    bedNo: 'เตียง 04',
    bedType: 'เตียงสามัญ',
    status: 'observing',
    severity: 'critical',
    patientName: 'นาย ประเสริฐ ยิ้มแย้ม',
    avatar: '/avatars/patient-mock-04.png',
    hn: '67001099',
    vn: 'VN670728-112',
    age: 64,
    gender: 'ชาย',
    admitTime: '2026-07-28 11:00 น.',
    durationMinutes: 65, // 1h 5m
    chiefComplaint: 'ปวดท้องรุนแรงบริเวณลิ้นปี่ ท้องอืด เหงื่อแตก อาเจียนเป็นเศษอาหาร',
    diagnosis: 'Acute Abdomen / Suspect Peptic Ulcer Perforation',
    doctorName: 'นพ. วรวิทย์ เกียรติเจริญ',
    nurseName: 'พว. สุภาพร ชัยมงคล',
    rights: 'สิทธิประกันสังคม (SSO)',
    vitalsTrend: [
      { time: '11:00 น.', bpSys: 96, bpDia: 60, pulse: 118, temp: 37.6, spo2: 95, rr: 24, note: 'ความดันตก ชีพจรเร็ว ปวดท้องมาก เฝ้าระวัง Shock', ews: 5 },
      { time: '11:30 น.', bpSys: 102, bpDia: 64, pulse: 110, temp: 37.5, spo2: 96, rr: 22, note: 'หลังให้ Acetar 1,000 ml IV load 200 ml/hr', ews: 3 },
    ],
    statOrders: [
      { id: 'ord-41', orderTime: '11:05 น.', orderText: 'NPO (Halt oral intake & water)', status: 'completed', executedBy: 'พว. สุภาพร', executedTime: '11:05 น.' },
      { id: 'ord-42', orderTime: '11:05 น.', orderText: 'IV Acetar 1,000 ml IV load 200 ml/hr', status: 'in_progress', executedBy: 'พว. สุภาพร', executedTime: '11:10 น.' },
      { id: 'ord-43', orderTime: '11:10 น.', orderText: 'Stat CBC, Electrolyte, LFT, Amylase, Lipase, Up-Right Abdomen X-Ray', status: 'in_progress', executedBy: 'พว. สุภาพร', executedTime: '11:15 น.' },
      { id: 'ord-44', orderTime: '11:20 น.', orderText: 'Prepare E-Referral to Central Hospital (โรงพยาบาลตากสิน)', status: 'pending', executedBy: '-', executedTime: '-' },
    ],
    nursingNotes: [
      { time: '11:05 น.', nurse: 'พว. สุภาพร', note: 'ผู้ป่วยปวดท้องระดับ 8/10 หน้านวด กดเจ็บทั่วท้อง (Board-like rigidity) ติดตาม V/S ชิดใกล้' },
    ],
    dischargeSummary: {
      disposition: 'refer',
      doctorSummary: 'สงสัยภาวะสงสัยกระเพาะอาหารทะลุ เตรียมส่งต่อโรงพยาบาลตากสินเพื่อตรวจ CT Abdomen และผ่าตัดด่วน',
      dischargeVitals: { bpSys: 102, bpDia: 64, pulse: 110, temp: 37.5, spo2: 96, rr: 22 },
      dischargeAdvice: 'งดน้ำและอาหารทุกชนิด เดินทางด้วยรถกู้ชีพ EMS พร้อมพยาบาลดูแลระหว่างส่งต่อ',
      referHospital: 'โรงพยาบาลตากสิน (กทม.)',
      isDischarged: false,
    },
  },
  {
    id: 'obs-005',
    bedNo: 'เตียง 05',
    bedType: 'เตียงหมุนมือ',
    status: 'empty',
    severity: 'normal',
    patientName: '',
    hn: '',
    vn: '',
    age: null,
    gender: '',
    admitTime: '',
    durationMinutes: 0,
    chiefComplaint: '',
    diagnosis: '',
    doctorName: '',
    nurseName: '',
    rights: '',
    vitalsTrend: [],
    statOrders: [],
    nursingNotes: [],
    dischargeSummary: null,
  },
  {
    id: 'obs-006',
    bedNo: 'เตียง 06',
    bedType: 'เตียงหมุนมือ',
    status: 'empty',
    severity: 'normal',
    patientName: '',
    hn: '',
    vn: '',
    age: null,
    gender: '',
    admitTime: '',
    durationMinutes: 0,
    chiefComplaint: '',
    diagnosis: '',
    doctorName: '',
    nurseName: '',
    rights: '',
    vitalsTrend: [],
    statOrders: [],
    nursingNotes: [],
    dischargeSummary: null,
  },
  {
    id: 'obs-007',
    bedNo: 'เตียง 07',
    bedType: 'เตียงไฟฟ้า (High Care)',
    status: 'empty',
    severity: 'normal',
    patientName: '',
    hn: '',
    vn: '',
    age: null,
    gender: '',
    admitTime: '',
    durationMinutes: 0,
    chiefComplaint: '',
    diagnosis: '',
    doctorName: '',
    nurseName: '',
    rights: '',
    vitalsTrend: [],
    statOrders: [],
    nursingNotes: [],
    dischargeSummary: null,
  },
  {
    id: 'obs-008',
    bedNo: 'เตียง 08',
    bedType: 'เตียงกึ่งพิเศษ',
    status: 'empty',
    severity: 'normal',
    patientName: '',
    hn: '',
    vn: '',
    age: null,
    gender: '',
    admitTime: '',
    durationMinutes: 0,
    chiefComplaint: '',
    diagnosis: '',
    doctorName: '',
    nurseName: '',
    rights: '',
    vitalsTrend: [],
    statOrders: [],
    nursingNotes: [],
    dischargeSummary: null,
  },
  {
    id: 'obs-009',
    bedNo: 'เตียง 09',
    bedType: 'เตียงพับได้ / Recliner',
    status: 'empty',
    severity: 'normal',
    patientName: '',
    hn: '',
    vn: '',
    age: null,
    gender: '',
    admitTime: '',
    durationMinutes: 0,
    chiefComplaint: '',
    diagnosis: '',
    doctorName: '',
    nurseName: '',
    rights: '',
    vitalsTrend: [],
    statOrders: [],
    nursingNotes: [],
    dischargeSummary: null,
  },
  {
    id: 'obs-010',
    bedNo: 'เตียง 10',
    bedType: 'เตียงสามัญ',
    status: 'empty',
    severity: 'normal',
    patientName: '',
    hn: '',
    vn: '',
    age: null,
    gender: '',
    admitTime: '',
    durationMinutes: 0,
    chiefComplaint: '',
    diagnosis: '',
    doctorName: '',
    nurseName: '',
    rights: '',
    vitalsTrend: [],
    statOrders: [],
    nursingNotes: [],
    dischargeSummary: null,
  },
];

/* "รายการที่ส่งต่อแล้ว" (already referred/discharged) history — generated
   rather than hand-authored so the queue's referred tab has enough rows
   to exercise its filter tags (วันที่/เตียง/สถานะ/ผู้สั่ง/พยาบาลรับผู้ป่วย)
   and pagination (40 rows / 20 per page). Spans the current + previous
   two months so the "เดือนนี้" default date filter meaningfully narrows
   the list instead of showing everything. Deterministic (index-based,
   no Math.random) so the list is stable across reloads. */
const REFERRED_BED_TYPES = ['เตียงไฟฟ้า (High Care)', 'เตียงกึ่งพิเศษ', 'เตียงพับได้ / Recliner', 'เตียงสามัญ', 'เตียงหมุนมือ'];
const REFERRED_CASE_TEMPLATES = [
  { chiefComplaint: 'แน่นหน้าอก หายใจไม่สะดวก', diagnosis: 'Acute Bronchospasm', doctorName: 'นพ. วรวิทย์ เกียรติเจริญ', nurseName: 'พว. สุภาพร ชัยมงคล' },
  { chiefComplaint: 'เวียนศีรษะ ความดันสูง', diagnosis: 'Hypertensive Urgency', doctorName: 'พญ. ปรียาภรณ์ สุขสวัสดิ์', nurseName: 'พว. นิภา วงศ์สว่าง' },
  { chiefComplaint: 'ไข้สูง ปวดศีรษะ อ่อนเพลีย', diagnosis: 'Acute Viral Infection', doctorName: 'พญ. นภัสสร สายชล', nurseName: 'พว. กัลยา จิตต์มั่น' },
  { chiefComplaint: 'ปวดท้องรุนแรงบริเวณลิ้นปี่', diagnosis: 'Acute Gastritis', doctorName: 'นพ. วรวิทย์ เกียรติเจริญ', nurseName: 'พว. สุภาพร ชัยมงคล' },
  { chiefComplaint: 'หายใจหอบเหนื่อย ไอมีเสมหะ', diagnosis: 'Acute Bronchitis', doctorName: 'พญ. ปรียาภรณ์ สุขสวัสดิ์', nurseName: 'พว. นิภา วงศ์สว่าง' },
  { chiefComplaint: 'อาเจียน ถ่ายเหลว ซึมลง', diagnosis: 'Acute Gastroenteritis / Dehydration', doctorName: 'พญ. นภัสสร สายชล', nurseName: 'พว. กัลยา จิตต์มั่น' },
  { chiefComplaint: 'ลื่นล้ม ปวดบวมข้อเท้า', diagnosis: 'Ankle Sprain, Observe for Fracture', doctorName: 'นพ. วรวิทย์ เกียรติเจริญ', nurseName: 'พว. นิภา วงศ์สว่าง' },
  { chiefComplaint: 'ใจสั่น เหนื่อยง่าย', diagnosis: 'Palpitation, Observe IHD', doctorName: 'พญ. ปรียาภรณ์ สุขสวัสดิ์', nurseName: 'พว. กัลยา จิตต์มั่น' },
];
const REFERRED_RIGHTS = ['สิทธิบัตรทอง (NHSO)', 'สิทธิข้าราชการ (Direct Billing)', 'สิทธิประกันสังคม (SSO)', 'ชำระเงินเอง (Self Pay)'];
const REFERRED_DISPOSITIONS = ['home', 'opd', 'refer'];
const REFERRED_REFER_HOSPITALS = ['โรงพยาบาลตากสิน (กทม.)', 'โรงพยาบาลเจริญกรุงประชารักษ์', 'โรงพยาบาลกลาง'];

const buildReferredMockPatients = (count) => Array.from({ length: count }, (_, i) => {
  const profile = PATIENT_PROFILES[i % PATIENT_PROFILES.length];
  const dx = REFERRED_CASE_TEMPLATES[i % REFERRED_CASE_TEMPLATES.length];
  /* Spread across this month + the two before it (0 = เดือนนี้). */
  const monthsAgo = i % 3;
  const month = 6 - monthsAgo; // 6 = July (0-indexed) → May..July 2026
  const day = 1 + (i % 27);
  const admitDate = new Date(2026, month, day);
  const yyyy = admitDate.getFullYear();
  const mm = String(admitDate.getMonth() + 1).padStart(2, '0');
  const dd = String(admitDate.getDate()).padStart(2, '0');
  const hour = 7 + (i % 12);
  const ageYears = parseInt(profile.age, 10) || 30;
  const disposition = REFERRED_DISPOSITIONS[i % REFERRED_DISPOSITIONS.length];
  const status = i % 4 === 0 ? 'discharged' : 'ready_discharge';
  const dischargeVitals = { bpSys: 120 + (i % 5), bpDia: 78 + (i % 4), pulse: 76 + (i % 8), temp: 36.6, spo2: 98, rr: 18 };

  return {
    id: `obs-ref-${String(i + 1).padStart(3, '0')}`,
    bedNo: `เตียง ${String((i % 10) + 1).padStart(2, '0')}`,
    bedType: REFERRED_BED_TYPES[i % REFERRED_BED_TYPES.length],
    status,
    severity: 'normal',
    patientName: profile.fullName,
    avatar: profile.avatarUrl,
    hn: profile.hn,
    vn: `VN${String(yyyy).slice(2)}${mm}${dd}-${String(100 + i)}`,
    age: ageYears,
    gender: profile.sex,
    admitTime: `${yyyy}-${mm}-${dd} ${String(hour).padStart(2, '0')}:00 น.`,
    durationMinutes: 120 + (i % 6) * 30,
    chiefComplaint: dx.chiefComplaint,
    diagnosis: dx.diagnosis,
    doctorName: dx.doctorName,
    nurseName: dx.nurseName,
    rights: REFERRED_RIGHTS[i % REFERRED_RIGHTS.length],
    vitalsTrend: [
      { time: `${String(hour).padStart(2, '0')}:00 น.`, ...dischargeVitals, note: 'อาการคงที่ ประเมินพร้อมจำหน่าย', ews: 0 },
    ],
    statOrders: [],
    nursingNotes: [],
    dischargeSummary: {
      disposition,
      doctorSummary: 'ผู้ป่วยอาการคงที่ สัญญาณชีพปกติ อนุญาตจำหน่ายตามแผนการรักษา',
      dischargeVitals,
      dischargeAdvice: 'ปฏิบัติตามคำแนะนำแพทย์ หากมีอาการผิดปกติให้รีบมาพบแพทย์',
      referHospital: disposition === 'refer' ? REFERRED_REFER_HOSPITALS[i % REFERRED_REFER_HOSPITALS.length] : '',
      isDischarged: status === 'discharged',
    },
  };
});

MOCK_OBSERVATION_PATIENTS.push(...buildReferredMockPatients(40));
