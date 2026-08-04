/* Registration ส่งตรวจ / Visit-opening mock data — TOR §1.1.2.x
   (คู่มือระบบเวชระเบียน.pdf บทที่ 2: ห้องบัตร → ส่งตรวจ → เปิด Visit Number).

   Module-level mutable store, same convention as `pharmacyQueue.js` /
   `mrPatients.js` mutators — no backend, resets on reload. Pages keep a
   local `version` counter and bump it after each mutator call.

   Also hosts the mock Mobile-Application push log (TOR 1.1.2.2 — the
   arrival-confirmation "notification" is a SIMULATION: toast + log entry
   only, no real push infrastructure). */

/** ผู้ใช้งานปัจจุบัน (mock) — เจ้าหน้าที่เวชระเบียนที่ล็อกอินอยู่ */
export const REGISTRATION_CURRENT_USER = {
  name: 'น.ส.พิมพ์ใจ ลงทะเบียน',
  position: 'เจ้าพนักงานเวชสถิติ (ห้องบัตร)',
  /* Mock role gate — TOR §1.4.2 / edge case "ผู้ใช้งานไม่มีสิทธิแก้เวชระเบียน".
     สถานะ read-only เปิดดูได้ 3 ทาง (ไม่ต้องแก้โค้ด):
       1. เปิด /registration/visit?readOnly=1  ← ทางที่ reviewer/QA ใช้
       2. push router state { readOnly: true }
       3. ตั้ง canEditMedicalRecords: false ที่นี่
     ผลลัพธ์: ฟอร์มส่งตรวจเป็น read-only ทั้งหน้า + ซ่อนปุ่มบันทึก + ปิดปุ่ม
     แก้ไข/ยกเลิก VN ในตาราง */
  canEditMedicalRecords: true,
};

/* ห้องตรวจ / คลินิกปลายทาง — ศูนย์บริการสาธารณสุข กทม. */
export const VISIT_CLINICS = [
  'ห้องตรวจโรคทั่วไป (OPD)',
  'คลินิกโรคเรื้อรัง เบาหวาน-ความดัน (NCD)',
  'คลินิกฝากครรภ์ (ANC)',
  'คลินิกสุขภาพเด็กดี (WCC)',
  'คลินิกทันตกรรม',
  'คลินิกวัณโรค (TB)',
  'คลินิกสุขภาพจิตและยาเสพติด',
  'ห้องทำแผล / ฉุกเฉิน',
];

export const VISIT_DOCTORS = [
  'นพ.ประวิทย์ ชาญเวชกิจ',
  'พญ.สมหญิง รักษ์ดี',
  'นพ.ณัฐวุฒิ บุญมี',
  'พญ.อรทัย ใจอารี',
  'ทพญ.วรางคณา ฟันสวย',
];

/* ความเร่งด่วน — คู่มือเวชระเบียน บทที่ 2 (ส่งตรวจ) */
export const VISIT_URGENCIES = [
  { key: 'normal',    label: 'ปกติ',       badge: 'success' },
  { key: 'accident',  label: 'อุบัติเหตุ',  badge: 'warning' },
  { key: 'emergency', label: 'ฉุกเฉิน',    badge: 'error'   },
  { key: 'urgent',    label: 'เร่งด่วน',    badge: 'warning' },
];

/* การเข้ามาของผู้ป่วย — TOR 1.1.2.4 (ห้องบัตร / นัดมา / ส่งมาจากสถานพยาบาลอื่น) */
export const VISIT_ARRIVALS = [
  { key: 'walkin',      label: 'ห้องบัตร (Walk-in)' },
  { key: 'appointment', label: 'นัดมา (นัดหมายล่วงหน้า)' },
  { key: 'referral',    label: 'ส่งมาจากสถานพยาบาลอื่น (Refer-in)' },
];

/* สถานพยาบาลต้นทาง — refer-in catalog (กทม. และปริมณฑล) */
export const REFERRAL_HOSPITALS = [
  'โรงพยาบาลกลาง',
  'โรงพยาบาลตากสิน',
  'โรงพยาบาลเจริญกรุงประชารักษ์',
  'โรงพยาบาลสิรินธร',
  'โรงพยาบาลราชพิพัฒน์',
  'โรงพยาบาลหลวงพ่อทวีศักดิ์ ชุตินฺธโร อุทิศ',
  'ศูนย์บริการสาธารณสุข 21 วัดธาตุทอง',
  'ศูนย์บริการสาธารณสุข 41 คลองเตย',
  'คลินิกชุมชนอบอุ่น เขตพระโขนง',
  'โรงพยาบาลราชวิถี',
  'โรงพยาบาลศิริราช',
];

/* อาการสำคัญ (CC) — suggestion list for the mandatory SuggestibleTextarea
   pattern (CLAUDE.md: ทุกช่องที่บุคลากรพิมพ์ต้องมี voice + suggestions +
   minChars). Phrasing follows ห้องบัตร ศูนย์บริการสาธารณสุข กทม. */
export const VISIT_CHIEF_COMPLAINT_SUGGESTIONS = [
  'ไข้ ไอ เจ็บคอ 2 วัน',
  'ไอเรื้อรังเกิน 2 สัปดาห์ มีเสมหะ',
  'ปวดศีรษะ เวียนศีรษะ',
  'ปวดท้องบริเวณลิ้นปี่ คลื่นไส้',
  'ท้องเสีย ถ่ายเหลว 3 ครั้ง',
  'มาตามนัดติดตามเบาหวาน รับยาต่อเนื่อง',
  'มาตามนัดติดตามความดันโลหิตสูง รับยาต่อเนื่อง',
  'ปวดหลังส่วนล่าง ร้าวลงขา',
  'ผื่นคันตามลำตัว',
  'แผลที่เท้าจากอุบัติเหตุ ทำแผลต่อเนื่อง',
  'มาฉีดวัคซีนตามเกณฑ์',
  'มาฝากครรภ์ครั้งแรก',
  'เจ็บหน้าอก เหนื่อยง่ายเวลาออกแรง',
  'ตรวจสุขภาพประจำปี',
];

/* เหตุผล / การวินิจฉัยจากสถานพยาบาลต้นทาง — refer-in note (TOR 1.1.2.4) */
export const REFERRAL_REASON_SUGGESTIONS = [
  'ส่งต่อเพื่อรับยาต่อเนื่องใกล้บ้าน',
  'ส่งต่อเพื่อติดตามอาการหลังจำหน่ายจากโรงพยาบาล',
  'ส่งต่อเพื่อทำแผลต่อเนื่อง',
  'ส่งต่อเพื่อกายภาพบำบัดต่อเนื่อง',
  'ส่งต่อเพื่อตรวจคัดกรองวัณโรค',
  'ส่งต่อเพื่อฝากครรภ์ต่อเนื่องใกล้บ้าน',
  'เกินศักยภาพการรักษาของหน่วยบริการต้นทาง',
  'ผู้รับบริการย้ายที่อยู่มาในพื้นที่รับผิดชอบ',
];

/* สภาพผู้รับบริการครั้งนี้ — TOR 1.1.2.5 (per-visit; Step 5 mobility ของ
   ทะเบียนผู้ป่วยเป็นค่า default ระดับ patient แล้ว pre-select ที่นี่) */
export const VISIT_CONDITIONS = [
  { key: 'walk',   label: 'เดิน' },
  { key: 'wheel',  label: 'รถเข็น' },
  { key: 'gurney', label: 'เปลนอน' },
  { key: 'other',  label: 'อื่นๆ' },
];

/** Map patient-level mobility (mrPatients.mobility) → per-visit condition key. */
export const mobilityToConditionKey = (mobility) => {
  const s = String(mobility ?? '');
  if (s.includes('รถเข็น')) return 'wheel';
  if (s.includes('เปล')) return 'gurney';
  if (!s || s.includes('เดิน')) return 'walk';
  return 'other';
};

/* ── VN generator — VN-<ปีพ.ศ. 2 หลัก>-##### (running) ─────────────── */
const BE_YEAR_2 = String((new Date().getFullYear() + 543) % 100).padStart(2, '0');
let vnSeq = 217;
export const peekNextVn = () => `VN-${BE_YEAR_2}-${String(vnSeq + 1).padStart(5, '0')}`;
const nextVn = () => `VN-${BE_YEAR_2}-${String(++vnSeq).padStart(5, '0')}`;

const nowTimeLabel = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} น.`;
};

/* Today's visit list (mock seed) — includes a cancelled row so the
   "ยกเลิก VN คงแถวไว้พร้อม badge + audit" state is visible on entry. */
export const REGISTRATION_VISITS = [
  {
    id: 'visit-seed-1',
    vn: `VN-${BE_YEAR_2}-00215`,
    hn: '67-00002',
    patientName: 'นางสาวสมหญิง มีสุข',
    time: '08:42 น.',
    clinic: 'ห้องตรวจโรคทั่วไป (OPD)',
    doctor: 'พญ.สมหญิง รักษ์ดี',
    urgency: 'normal',
    arrival: 'walkin',
    referral: null,
    chiefComplaint: 'ไอเรื้อรัง 2 สัปดาห์ มีเสมหะ ไม่มีไข้',
    condition: 'walk',
    conditionOther: '',
    status: 'waiting',
    openedBy: REGISTRATION_CURRENT_USER.name,
    openedAt: '08:42 น.',
    cancelledBy: null,
    cancelledAt: null,
  },
  {
    id: 'visit-seed-2',
    vn: `VN-${BE_YEAR_2}-00216`,
    hn: '67-00006',
    patientName: 'นางปรียา สุพรรณ',
    time: '09:10 น.',
    clinic: 'คลินิกโรคเรื้อรัง เบาหวาน-ความดัน (NCD)',
    doctor: 'นพ.ณัฐวุฒิ บุญมี',
    urgency: 'normal',
    arrival: 'appointment',
    referral: null,
    chiefComplaint: 'มาตามนัดติดตามความดันโลหิตสูง รับยาต่อเนื่อง',
    condition: 'wheel',
    conditionOther: '',
    status: 'waiting',
    openedBy: REGISTRATION_CURRENT_USER.name,
    openedAt: '09:10 น.',
    cancelledBy: null,
    cancelledAt: null,
  },
  {
    id: 'visit-seed-3',
    vn: `VN-${BE_YEAR_2}-00217`,
    hn: '67-00003',
    patientName: 'นายวีระ ดีงาม',
    time: '09:24 น.',
    clinic: 'ห้องตรวจโรคทั่วไป (OPD)',
    doctor: '',
    urgency: 'normal',
    arrival: 'walkin',
    referral: null,
    chiefComplaint: 'ปวดศีรษะ เวียนหัวตั้งแต่เช้า',
    condition: 'walk',
    conditionOther: '',
    status: 'cancelled',
    openedBy: REGISTRATION_CURRENT_USER.name,
    openedAt: '09:24 น.',
    cancelledBy: 'พญ.สมหญิง รักษ์ดี',
    cancelledAt: '09:31 น.',
  },
];

let visitSeq = 0;

/** เปิด VN ใหม่ (TOR 1.1.2.1 — บันทึก) */
export const openVisit = (payload) => {
  const entry = {
    id: `visit-new-${++visitSeq}`,
    vn: nextVn(),
    time: nowTimeLabel(),
    status: 'waiting',
    openedBy: REGISTRATION_CURRENT_USER.name,
    openedAt: nowTimeLabel(),
    cancelledBy: null,
    cancelledAt: null,
    doctor: '',
    referral: null,
    conditionOther: '',
    ...payload,
  };
  REGISTRATION_VISITS.unshift(entry);
  return entry;
};

/** แก้ไข VN (TOR 1.1.2.1 — แก้ไข; แถวที่ยกเลิกแล้วเป็น read-only) */
export const updateVisit = (id, patch) => {
  const idx = REGISTRATION_VISITS.findIndex((v) => v.id === id);
  if (idx < 0) return null;
  if (REGISTRATION_VISITS[idx].status === 'cancelled') return null;
  REGISTRATION_VISITS[idx] = { ...REGISTRATION_VISITS[idx], ...patch };
  return REGISTRATION_VISITS[idx];
};

/** ยกเลิก VN (TOR 1.1.2.1 — ยกเลิก; แถวคงอยู่พร้อม badge + audit ผู้ยกเลิก/เวลา) */
export const cancelVisit = (id) => {
  const idx = REGISTRATION_VISITS.findIndex((v) => v.id === id);
  if (idx < 0) return null;
  REGISTRATION_VISITS[idx] = {
    ...REGISTRATION_VISITS[idx],
    status: 'cancelled',
    cancelledBy: REGISTRATION_CURRENT_USER.name,
    cancelledAt: nowTimeLabel(),
  };
  return REGISTRATION_VISITS[idx];
};

/** VN ที่ยัง active (ไม่ยกเลิก) ของ HN นี้ในวันนี้ — duplicate-VN warning */
export const findOpenVisitsByHn = (hn) =>
  REGISTRATION_VISITS.filter((v) => v.hn === hn && v.status !== 'cancelled');

/* ── Mock Mobile-Application push log — TOR 1.1.2.2 (SIMULATION ONLY) ── */

let pushSeq = 0;
export const MOBILE_PUSH_LOG = [
  {
    id: 'push-seed-1',
    hn: '67-00006',
    patientName: 'นางปรียา สุพรรณ',
    queue: 'A004',
    message: 'ยืนยันการมาตามนัด คลินิก NCD เวลา 09:00 น.',
    channel: 'Mobile Application',
    sentAt: '08:56 น.',
  },
];

/** ส่ง (mock) push ยืนยันการมาตามนัดผ่าน Mobile Application — log เท่านั้น */
export const pushArrivalConfirmation = ({ hn, patientName, queue, message }) => {
  const entry = {
    id: `push-new-${++pushSeq}`,
    hn: hn || '',
    patientName: patientName || '',
    queue: queue || '',
    message: message || 'ยืนยันการมาตามนัดหมายวันนี้',
    channel: 'Mobile Application',
    sentAt: nowTimeLabel(),
  };
  MOBILE_PUSH_LOG.unshift(entry);
  return entry;
};
