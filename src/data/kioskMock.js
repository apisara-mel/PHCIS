/* MIH PHCIS · Kiosk mock data
   Drives /kiosk multi-step flow (welcome → service → sub → appointment
   → verify → confirm → ticket). Mirrors the userflow doc at
   docs/kiosk-userflow.html. Replace with backend integration when ready.

   - SERVICES: top-level Step 1 picker (6 cards in 3×2 grid)
   - SUB_SERVICES: Step 1b drill-down (only when service.drill === true)
   - PATIENTS: keyed by 13-digit national ID (Step 3 verify lookup)
   - generateQueueNumber(): deterministic per-day, per-prefix increment
*/

export const SERVICES = [
  {
    key: 'screening',
    label: 'ซักประวัติ',
    desc: 'สำหรับผู้ป่วยใหม่หรือผู้ที่ต้องวัดความดัน/น้ำหนัก',
    icon: 'assignment',
    drill: false,
    queuePrefix: 'S',
  },
  {
    key: 'consultation',
    label: 'ห้องตรวจ',
    desc: 'พบแพทย์เพื่อตรวจวินิจฉัยโรคทั่วไปและเฉพาะทาง',
    icon: 'stethoscope',
    drill: true,
  },
  {
    key: 'finance',
    label: 'การเงิน',
    desc: 'ชำระค่าบริการทางการแพทย์และออกใบเสร็จ',
    icon: 'credit_card',
    drill: false,
    queuePrefix: 'F',
  },
  {
    key: 'pharmacy',
    label: 'รับยา',
    desc: 'รับยาสามัญและยาตามใบสั่งแพทย์',
    icon: 'medication',
    drill: false,
    queuePrefix: 'P',
  },
  {
    key: 'lab',
    label: 'เจาะเลือด/ฉีดยา',
    desc: 'ห้องปฏิบัติการและห้องตรวจทางพยาธิวิทยา',
    icon: 'vaccines',
    drill: false,
    queuePrefix: 'L',
  },
  {
    key: 'other',
    label: 'แผนกอื่นๆ',
    desc: 'เอกซเรย์, กายภาพบำบัด, ทันตกรรม ฯลฯ',
    icon: 'more_horiz',
    drill: true,
  },
];

export const SUB_SERVICES = {
  consultation: [
    { key: 'opd-general', label: 'OPD ทั่วไป',  icon: 'stethoscope',    queuePrefix: 'A' },
    { key: 'anc',         label: 'ตรวจครรภ์',    icon: 'pregnant_woman', queuePrefix: 'B' },
    { key: 'pediatrics',  label: 'กุมารเวช',      icon: 'child_care',     queuePrefix: 'K' },
    { key: 'elderly',     label: 'ผู้สูงอายุ',     icon: 'elderly',        queuePrefix: 'E' },
    { key: 'chronic',     label: 'โรคเรื้อรัง',    icon: 'monitor_heart',  queuePrefix: 'C' },
    { key: 'mental',      label: 'สุขภาพจิต',     icon: 'psychology',     queuePrefix: 'M' },
    { key: 'dental',      label: 'ทันตกรรม',      icon: 'dentistry',      queuePrefix: 'D' },
    { key: 'tb',          label: 'วัณโรค',         icon: 'masks',          queuePrefix: 'T' },
  ],
  other: [
    { key: 'vaccine',  label: 'วัคซีน',         icon: 'vaccines',         queuePrefix: 'V' },
    { key: 'family',   label: 'วางแผนครอบครัว', icon: 'family_restroom', queuePrefix: 'G' },
    { key: 'xray',     label: 'เอกซเรย์',       icon: 'radiology',        queuePrefix: 'X' },
    { key: 'physio',   label: 'กายภาพบำบัด',   icon: 'self_improvement', queuePrefix: 'Y' },
  ],
};

/* Mock patients — keyed by 13-digit national ID.
   Each patient may have 0..N appointments for "today" (mock date 2025-05-25).
   Use a *fresh* Date when comparing in production. */
export const PATIENTS = [
  {
    nationalId: '1100400123456',
    hn: '00012345',
    fullName: 'นางสมศรี แสนดี',
    age: 68,
    gender: 'หญิง',
    bloodType: 'O+',
    rightsGroup: 'บัตรทอง',
    phone: '08x-xxx-1234',
    appointments: [
      {
        id: 'apt-001',
        date: '2025-05-25',
        time: '09:30',
        sub: 'chronic',
        subLabel: 'คลินิกโรคเรื้อรัง',
        doctor: 'นพ.อนันต์ พงศ์ภักดี',
        room: 'B-3',
        zone: 'โซน B ชั้น 2 หน้าห้องตรวจ 3',
      },
    ],
  },
  {
    nationalId: '1100400987654',
    hn: '00098765',
    fullName: 'นายสมชาย ใจดี',
    age: 28,
    gender: 'ชาย',
    bloodType: 'A+',
    rightsGroup: 'ประกันสังคม',
    phone: '08x-xxx-5678',
    appointments: [],
  },
  {
    nationalId: '3101200456789',
    hn: '00045678',
    fullName: 'น.ส.สุดา รุ่งเรือง',
    age: 24,
    gender: 'หญิง',
    bloodType: 'B+',
    rightsGroup: 'ชำระเงินเอง',
    phone: '08x-xxx-9012',
    appointments: [
      {
        id: 'apt-002',
        date: '2025-05-25',
        time: '10:15',
        sub: 'anc',
        subLabel: 'คลินิกฝากครรภ์',
        doctor: 'พญ.นภาพร อภิรักษ์',
        room: 'C-1',
        zone: 'โซน C ชั้น 3 หน้าห้องตรวจ 1',
      },
    ],
  },
  {
    nationalId: '1100400111222',
    hn: '00033445',
    fullName: 'ด.ช.กิตติ พิทักษ์',
    age: 6,
    gender: 'ชาย',
    bloodType: 'AB+',
    rightsGroup: 'บัตรทอง',
    phone: null,
    appointments: [
      {
        id: 'apt-003',
        date: '2025-05-25',
        time: '14:00',
        sub: 'vaccine',
        subLabel: 'คลินิกวัคซีน',
        doctor: 'พญ.จิตรา ขจรเกียรติ',
        room: 'A-2',
        zone: 'โซน A ชั้น 1 หน้าห้องตรวจ 2',
      },
    ],
  },
  {
    nationalId: '1100400333444',
    hn: '00099887',
    fullName: 'นายธีระ มากมี',
    age: 52,
    gender: 'ชาย',
    bloodType: 'O-',
    rightsGroup: 'ข้าราชการ',
    phone: '08x-xxx-3456',
    appointments: [],
  },
];

export const findPatientById = (nationalId) =>
  PATIENTS.find((p) => p.nationalId === nationalId.replace(/[^0-9]/g, '')) || null;

/* Pick a random "demo" patient for the testing shortcut button — biased
   to one with an appointment ~50% of the time so testers see both
   branches without having to hand-pick IDs. */
export const pickDemoPatient = () => {
  const withAppt = PATIENTS.filter((p) => p.appointments.length > 0);
  const withoutAppt = PATIENTS.filter((p) => p.appointments.length === 0);
  const pool = Math.random() < 0.5 ? withAppt : withoutAppt;
  return pool[Math.floor(Math.random() * pool.length)] || PATIENTS[0];
};

/* Find appointment matching the chosen service/sub for "appointment" flow.
   Returns the appointment object or null. */
export const findTodayAppointment = (patient, subKey) => {
  if (!patient?.appointments) return null;
  // Mock date — in prod compare against new Date().toISOString().slice(0,10)
  const today = '2025-05-25';
  return patient.appointments.find(
    (a) => a.date === today && (!subKey || a.sub === subKey),
  ) || null;
};

/* Pretend we're in the middle of a service day — generates a queue
   number with a stable hash so re-renders show the same number until
   the user explicitly resets the flow.

   prefix:  one-letter code per service/sub (A, B, C, ...)
   seed:    any string (e.g. patient HN + sub key) — same seed = same num */
export const generateQueueNumber = (prefix, seed = '') => {
  // Tiny string hash (FNV-1a-ish) for deterministic numbers per session
  let h = 0x811c9dc5;
  const s = `${prefix}|${seed}|${new Date().toDateString()}`;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  const n = (h % 200) + 12; // produce 012..211 — mirrors a real morning queue
  return `${prefix}-${String(n).padStart(3, '0')}`;
};

/* Mock "currently calling" queue number — always 7 behind the issued one
   so the UI always shows a plausible "wait ~X people". */
export const callingNowFor = (issuedNumber) => {
  if (!issuedNumber) return null;
  const [prefix, numStr] = issuedNumber.split('-');
  const n = Math.max(parseInt(numStr, 10) - 7, 1);
  return `${prefix}-${String(n).padStart(3, '0')}`;
};

export const estimateWaitMinutes = (issued, calling) => {
  if (!issued || !calling) return null;
  const diff = parseInt(issued.split('-')[1], 10) - parseInt(calling.split('-')[1], 10);
  return Math.max(diff * 3, 1); // mock: ~3 min/person
};
