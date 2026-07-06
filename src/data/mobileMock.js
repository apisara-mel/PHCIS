/* MIH PHCIS · Mobile Application mock data.

   Drives /m mobile app screens that implement TOR §4 (Mobile Application).
   The mobile app is a citizen-facing companion to the staff-facing PHCIS
   web app, so this dataset uses a single "current visitor" profile plus
   a small pool of appointments / visits / payments / news items.

   Replace each block with backend integration when the matching API lands. */

/* ─── Current signed-in visitor ──────────────────────────────────────── */
export const CURRENT_USER = {
  citizenId: '1234567890123',
  password:  'demo1234',
  prefix:    'นาย',
  firstName: 'สมชาย',
  lastName:  'มีสุข',
  englishName: 'Somchai Misuk',
  birthDate: '15 เมษายน 2526',
  age:       42,
  sex:       'ชาย',
  phone:     '081-234-5678',
  email:     'somchai.m@example.com',
  address:   '88/5 ถ.สุขุมวิท แขวงบางนา เขตบางนา กรุงเทพมหานคร 10260',
  avatar:    '/avatars/somchai-mock.png',
  /* Linked PHCIS records — one row per visited center */
  centers: [
    { code: 'BNA', name: 'ศูนย์บริการสาธารณสุข 8 บางนา', hn: '67-00001', rights: 'บัตรทอง (UC)' },
    { code: 'PRK', name: 'ศูนย์บริการสาธารณสุข 21 พระโขนง', hn: '68-04212', rights: 'บัตรทอง (UC)' },
  ],
  /* Self-reported allergies / chronic conditions (mirrors PHCIS PatientCard) */
  allergies:   ['Penicillin (ผื่นคัน)', 'อาหารทะเล (คันคอ)'],
  chronicDx:   ['Hypertension (I10)', 'Dyslipidemia (E78.5)'],
  riskFactors: ['สูบบุหรี่ <5 มวน/วัน'],
  /* Vitals self-logged inside the app — TOR 4.5.2 */
  selfVitals: [
    { date: '24 พ.ค. 2569 · 07:30', bp: '128/82', pulse: 76, weight: 72.4, height: 172 },
    { date: '23 พ.ค. 2569 · 07:25', bp: '132/85', pulse: 78, weight: 72.6, height: 172 },
    { date: '22 พ.ค. 2569 · 07:40', bp: '130/84', pulse: 74, weight: 72.5, height: 172 },
    { date: '21 พ.ค. 2569 · 07:30', bp: '134/88', pulse: 80, weight: 72.8, height: 172 },
    { date: '20 พ.ค. 2569 · 07:35', bp: '129/82', pulse: 75, weight: 72.6, height: 172 },
  ],
};

/* ─── Clinics & doctors used for "find clinic" + appointment booking ── */
export const CLINICS = [
  {
    code: 'BNA',
    number: '01',
    shortName: 'ดินแดง',
    name: 'ศูนย์บริการสาธารณสุข 8 บางนา',
    address: '88 ถ.สรรพาวุธ บางนา กรุงเทพฯ 10260',
    distanceKm: 1.2,
    phone: '02-361-2580',
    lat: 13.6700, lng: 100.6010,
    hours: 'จ–ศ 08:00–16:00 · ส 08:00–12:00',
    departments: [
      { key: 'general',  label: 'ตรวจรักษาทั่วไป' },
      { key: 'dental',   label: 'ทันตกรรม' },
      { key: 'anc',      label: 'ฝากครรภ์' },
      { key: 'wellbaby', label: 'คลินิกเด็กดี' },
      { key: 'tb',       label: 'คลินิกวัณโรค' },
    ],
  },
  {
    code: 'PRK',
    number: '02',
    shortName: 'พระโขนง',
    name: 'ศูนย์บริการสาธารณสุข 21 พระโขนง',
    address: '1093 ถ.สุขุมวิท 71 พระโขนง กรุงเทพฯ 10260',
    distanceKm: 3.4,
    phone: '02-381-0021',
    lat: 13.7180, lng: 100.5840,
    hours: 'จ–ศ 08:00–16:00',
    departments: [
      { key: 'general', label: 'ตรวจรักษาทั่วไป' },
      { key: 'chronic', label: 'คลินิกโรคเรื้อรัง' },
      { key: 'dental',  label: 'ทันตกรรม' },
    ],
  },
  {
    code: 'KLM',
    number: '03',
    shortName: 'คลองสาน',
    name: 'ศูนย์บริการสาธารณสุข 36 บุคคโล',
    address: '232 ถ.สมเด็จพระเจ้าตากสิน คลองสาน กรุงเทพฯ 10600',
    distanceKm: 6.8,
    phone: '02-466-7110',
    lat: 13.7240, lng: 100.4960,
    hours: 'จ–ศ 08:00–16:00',
    departments: [
      { key: 'general',  label: 'ตรวจรักษาทั่วไป' },
      { key: 'wellbaby', label: 'คลินิกเด็กดี' },
    ],
  },
];

export const DOCTORS = [
  { id: 'D-01', name: 'นพ.สมชาย ใจดี',     specialty: 'อายุรแพทย์โรคหัวใจ', dept: 'general', clinics: ['BNA', 'PRK'], availableToday: true },
  { id: 'D-02', name: 'พญ.สมหญิง รักษ์ดี', specialty: 'อายุรกรรมทั่วไป', dept: 'general', clinics: ['BNA'], availableToday: true },
  { id: 'D-03', name: 'พญ.วิภา สุขศรี',    specialty: 'อายุรกรรมทั่วไป', dept: 'general', clinics: ['BNA', 'KLM'], availableToday: false },
  { id: 'D-04', name: 'นพ.ธวัช ทันใจ',     specialty: 'ทันตแพทย์', dept: 'dental',  clinics: ['BNA', 'PRK'], availableToday: true },
  { id: 'D-05', name: 'พญ.รัตนา หล่อรูป',  specialty: 'สูตินรีเวช', dept: 'anc',     clinics: ['BNA'], availableToday: true },
  { id: 'D-06', name: 'นพ.ปรีชา ปรารถนา', specialty: 'อายุรกรรมโรคเรื้อรัง', dept: 'chronic', clinics: ['PRK'], availableToday: false },
];

/* ─── Appointments (mix of upcoming + past, mix of types) ───────────── */
export const APPOINTMENTS = [
  {
    id: 'APT-2401',
    type: 'video',
    status: 'upcoming',
    date: '2569-05-24',
    time: '10:30',
    clinic: 'BNA',
    deptKey: 'general',
    deptLabel: 'อายุรกรรมทั่วไป',
    doctor: 'พญ.สมหญิง รักษ์ดี',
    note: 'ปรึกษาแพทย์ออนไลน์ (ติดตามอาการ)',
    locationLabel: 'ศูนย์ 4, ดินแดง',
  },
  {
    id: 'APT-2402',
    type: 'video',
    status: 'upcoming',
    date: '2569-06-04',
    time: '14:30',
    clinic: 'BNA',
    deptKey: 'chronic',
    deptLabel: 'คลินิกโรคเรื้อรัง (Telemedicine)',
    doctor: 'นพ.ปรีชา ปรารถนา',
    staffPhone: '02-381-0021',
    note: 'ปรึกษาผลแลบและทบทวนยา',
  },
  {
    id: 'APT-2403',
    type: 'homevisit',
    status: 'upcoming',
    date: '2569-06-12',
    time: '10:00',
    clinic: 'BNA',
    deptKey: 'home',
    deptLabel: 'เยี่ยมบ้าน',
    doctor: 'พ.ว.อรอนงค์ ดูแล',
    staffPhone: '081-543-0099',
    note: 'ตรวจวัดสัญญาณชีพและประเมินสภาพแวดล้อม',
  },
  {
    id: 'APT-2398',
    type: 'visit',
    status: 'past',
    date: '2569-04-02',
    time: '08:30',
    clinic: 'BNA',
    deptKey: 'general',
    deptLabel: 'ตรวจรักษาทั่วไป',
    doctor: 'พญ.สมหญิง รักษ์ดี',
    note: 'ปวดหลังช่วงล่าง',
  },
  {
    id: 'APT-2380',
    type: 'video',
    status: 'past',
    date: '2569-03-15',
    time: '11:00',
    clinic: 'BNA',
    deptKey: 'general',
    deptLabel: 'ปรึกษาผลตรวจ',
    doctor: 'นพ.สมชาย ใจดี',
    note: 'แจ้งผลแลบ + แนะนำการดูแลตัวเอง',
  },
];

/* Doctor schedule grid for booking — keyed by `${clinic}_${dept}` */
export const SCHEDULE_SLOTS = {
  BNA_general: {
    '2569-05-28': ['08:00', '08:30', '09:00', '09:30', '10:00', '13:30', '14:00'],
    '2569-05-29': ['08:00', '09:00', '10:00', '11:00', '13:30'],
    '2569-05-30': ['08:00', '08:30', '13:00', '14:00'],
    '2569-06-02': ['08:00', '09:00', '10:00', '13:30', '14:00'],
    '2569-06-03': ['08:00', '09:30', '11:00', '14:00', '14:30'],
    '2569-06-04': ['09:00', '10:30', '13:00'],
  },
  BNA_dental: {
    '2569-05-29': ['09:00', '10:00', '13:30'],
    '2569-06-02': ['08:30', '09:30', '14:00'],
    '2569-06-05': ['08:00', '09:00', '13:00'],
  },
  PRK_chronic: {
    '2569-05-28': ['09:00', '10:00'],
    '2569-06-04': ['14:30', '15:00'],
    '2569-06-11': ['09:00', '10:30'],
  },
};

/* ─── Treatment history (4.6) — visits, home visits, video calls ────── */
export const VISIT_HISTORY = [
  {
    id: 'V-2569-04-02',
    type: 'visit',
    date: '2 เมษายน 2569',
    time: '08:32',
    center: 'ศูนย์ 8 บางนา',
    dept: 'อายุรกรรม',
    doctor: 'พญ.สมหญิง รักษ์ดี',
    cc: 'ปวดหลังช่วงล่างมาก ในเวลาที่ก้ม',
    dx: 'Low back pain (M54.5)',
    rx: 'Paracetamol 500 mg 1 เม็ด ทุก 6 ชม. + PT ครั้งที่ 1',
    status: 'completed',
    plan: 'PT 5 ครั้ง · ติดตามใน 2 สัปดาห์',
    files: ['lab-2569-04-02.pdf', 'xray-spine.jpg'],
  },
  {
    id: 'V-2569-03-15',
    type: 'video',
    date: '15 มีนาคม 2569',
    time: '11:00',
    center: 'ศูนย์ 8 บางนา',
    dept: 'อายุรกรรม',
    doctor: 'นพ.สมชาย ใจดี',
    cc: 'ติดตามผลแลบ',
    dx: 'Health check-up (Z00.0)',
    rx: '—',
    status: 'completed',
    plan: 'แนะนำลดเค็ม + ตรวจซ้ำ 6 เดือน',
    files: ['lab-2569-03-15.pdf'],
  },
  {
    id: 'V-2569-02-02',
    type: 'visit',
    date: '2 กุมภาพันธ์ 2569',
    time: '09:45',
    center: 'ศูนย์ 8 บางนา',
    dept: 'ตรวจรักษา',
    doctor: 'พญ.วิภา สุขศรี',
    cc: 'ปวดศีรษะ',
    dx: 'Tension headache (G44.2)',
    rx: '—',
    status: 'completed',
    plan: 'พักผ่อน · มาเช็คซ้ำถ้าไม่ดีขึ้น',
    files: [],
  },
  {
    id: 'V-2569-01-20',
    type: 'homevisit',
    date: '20 มกราคม 2569',
    time: '10:15',
    center: 'ศูนย์ 8 บางนา',
    dept: 'เยี่ยมบ้าน',
    doctor: 'พ.ว.อรอนงค์ ดูแล',
    cc: 'เยี่ยมประเมินสภาพแวดล้อม',
    dx: 'Health surveillance (Z71)',
    rx: '—',
    status: 'completed',
    plan: 'แนะนำปรับห้องนอน · นัดเยี่ยมซ้ำ 6 เดือน',
    files: ['homevisit-2569-01-20.pdf'],
  },
];

/* Active medication list (4.4.2 + 4.6) — drawn from latest visit */
export const ACTIVE_MEDS = [
  { name: 'Paracetamol 500 mg',  dose: '1 เม็ด ทุก 6 ชม. เมื่อปวด', start: '2 เม.ย. 2569', remaining: 8 },
  { name: 'Amlodipine 5 mg',     dose: '1 เม็ด ก่อนนอน',           start: '15 มี.ค. 2569', remaining: 22 },
  { name: 'Atorvastatin 20 mg',  dose: '1 เม็ด ก่อนนอน',           start: '15 มี.ค. 2569', remaining: 15 },
];

/* ─── Payments (4.12) — outstanding + history ───────────────────────── */
export const BILLS = [
  {
    id: 'INV-2569-001',
    visitId: 'V-2569-04-02',
    date: '2 เมษายน 2569',
    amount: 320,
    status: 'pending',
    items: [
      { label: 'ค่าตรวจ',      amount: 100 },
      { label: 'ค่ายา (3 รายการ)', amount: 180 },
      { label: 'ค่าบริการ PT', amount: 40 },
    ],
  },
  {
    id: 'INV-2569-002',
    visitId: 'V-2569-03-15',
    date: '15 มีนาคม 2569',
    amount: 0,
    status: 'covered',
    items: [
      { label: 'ค่าตรวจ',      amount: 100 },
      { label: 'สิทธิ UC ครอบคลุม', amount: -100 },
    ],
  },
  {
    id: 'INV-2569-003',
    visitId: 'V-2569-02-02',
    date: '2 กุมภาพันธ์ 2569',
    amount: 50,
    status: 'paid',
    paidDate: '2 ก.พ. 2569 · 11:02',
    paidVia: 'QR PromptPay',
    items: [
      { label: 'ค่าตรวจ', amount: 50 },
    ],
  },
];

/* ─── Service requests (4.8) — citizen-initiated asks ───────────────── */
export const REQUEST_TYPES = [
  { key: 'diapers',     label: 'ขอผ้าอ้อมผู้ใหญ่',      icon: 'baby_changing_station', tone: 'pink',    desc: 'สำหรับผู้ป่วยติดบ้าน-ติดเตียงในความดูแลของศูนย์' },
  { key: 'homevisit',   label: 'ขอเยี่ยมบ้าน',           icon: 'home',                  tone: 'blue',    desc: 'แจ้งความประสงค์ให้พยาบาลเข้าเยี่ยมบ้าน' },
  { key: 'cert',        label: 'ขอใบรับรองแพทย์',         icon: 'description',           tone: 'green',   desc: 'ออกใบรับรองในรูปแบบ e-Document' },
  { key: 'medrecord',   label: 'ขอประวัติการรักษา',       icon: 'medical_information',   tone: 'purple',  desc: 'ขอเอกสารประวัติการรักษาแบบ e-Document' },
  { key: 'transfer',    label: 'ขอส่งต่อหน่วยบริการอื่น', icon: 'send',                  tone: 'indigo',  desc: 'แจ้งความประสงค์ขอใบส่งตัว' },
  { key: 'medicine',    label: 'ขอเติมยาตามใบเดิม',       icon: 'pill',                  tone: 'purple',  desc: 'ยาประจำที่หมดและต้องการขอเติม' },
];

export const REQUESTS_HISTORY = [
  {
    id: 'REQ-2569-001',
    type: 'diapers',
    date: '20 พ.ค. 2569',
    status: 'in-progress',
    statusLabel: 'อยู่ระหว่างจัดส่ง',
    note: 'ขอจำนวน 1 แพ็ก ขนาด L สำหรับคุณพ่อ',
  },
  {
    id: 'REQ-2569-002',
    type: 'cert',
    date: '12 พ.ค. 2569',
    status: 'completed',
    statusLabel: 'พร้อมดาวน์โหลด',
    note: 'ใบรับรองแพทย์เพื่อยื่นบริษัทประกัน',
    eDocUrl: '/edoc/cert-2569-002.pdf',
  },
];

/* ─── News (4.9) — videos / audio / articles ────────────────────────── */
export const NEWS = [
  {
    id: 'N-001',
    type: 'video',
    title: 'การฉีดวัคซีนป้องกันไข้หวัดใหญ่ ประจำปี 2569',
    cover: '/avatars/news-vaccine.jpg',
    duration: '02:48',
    publishedAt: '23 พ.ค. 2569',
    tag: 'ประกาศ',
  },
  {
    id: 'N-002',
    type: 'article',
    title: 'ดูแลความดันโลหิตสูงในผู้สูงอายุ — 5 ข้อควรรู้',
    cover: '/avatars/news-bp.jpg',
    readMinutes: 4,
    publishedAt: '20 พ.ค. 2569',
    tag: 'บทความ',
  },
  {
    id: 'N-003',
    type: 'audio',
    title: 'พอดแคสต์ "สุขใจวัย 50+" ตอน นอนอย่างไรให้หลับลึก',
    cover: '/avatars/news-podcast.jpg',
    duration: '12:30',
    publishedAt: '18 พ.ค. 2569',
    tag: 'พอดแคสต์',
  },
  {
    id: 'N-004',
    type: 'article',
    title: 'PHCIS เปิดบริการ Telemedicine ทุกศูนย์ในเดือนมิถุนายน',
    cover: '/avatars/news-telemed.jpg',
    readMinutes: 2,
    publishedAt: '15 พ.ค. 2569',
    tag: 'ข่าวสาร',
  },
];

/* ─── Pregnancy & well-child tracking (4.6.7) ────────────────────────── */
export const ANC_PROFILE = {
  ga: 28,                                   /* gestational age — weeks */
  edd: '15 สิงหาคม 2569',
  visits: [
    { date: '5 พ.ค. 2569', ga: 26, bp: '118/76', weight: 64.2, ultrasound: 'normal', fhr: 142 },
    { date: '21 เม.ย. 2569', ga: 24, bp: '116/74', weight: 63.4, ultrasound: 'normal', fhr: 138 },
  ],
  child: {
    name: 'ด.ช.ก้อง',
    birthDate: '2 มี.ค. 2568',
    growth: [
      { date: '1 มี.ค. 2569', ageMonths: 12, height: 75.0, weight: 9.6, hc: 46.0 },
      { date: '1 ธ.ค. 2568', ageMonths: 9,  height: 71.5, weight: 8.7, hc: 45.0 },
      { date: '1 ก.ย. 2568', ageMonths: 6,  height: 68.2, weight: 7.6, hc: 43.8 },
    ],
    immunizations: [
      { code: 'BCG',    given: '2 มี.ค. 2568',  done: true },
      { code: 'HepB-1', given: '2 มี.ค. 2568',  done: true },
      { code: 'DTP-1',  given: '2 พ.ค. 2568',  done: true },
      { code: 'DTP-2',  given: '2 ก.ค. 2568',  done: true },
      { code: 'DTP-3',  given: '2 ก.ย. 2568',  done: true },
      { code: 'MMR-1',  given: '5 มี.ค. 2569', done: true },
      { code: 'JE-1',   due:   '20 มิ.ย. 2569', done: false },
    ],
  },
};

/* ─── Helpers ─────────────────────────────────────────────────────────── */
export const findClinic = (code) => CLINICS.find((c) => c.code === code) || null;
export const findAppointment = (id) => APPOINTMENTS.find((a) => a.id === id) || null;
export const findBill = (id) => BILLS.find((b) => b.id === id) || null;
export const findVisit = (id) => VISIT_HISTORY.find((v) => v.id === id) || null;
export const findRequestType = (key) => REQUEST_TYPES.find((r) => r.key === key) || null;
