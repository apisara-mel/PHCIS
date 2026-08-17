/* งานเยี่ยมบ้าน / Home Visit (TOR §1.10.12 + §1.18) — โดเมนหลัก + mock data.

   คำศัพท์ทั้งหมด (HHC, HV, Health Desk–HV, มารดาและทารก–HV, Family Folder,
   เยี่ยม/ติดตามประเมินผล) อ้างอิง "คู่มือระบบงานสาธารณสุขและระบบงานควบคุม
   ป้องกันและส่งเสริมสุขภาพในชุมชน" บทที่ 2 §2.1–2.2 (ระบบเดิมของสำนักอนามัย).

   ⚠ GIS ตัวจริงเป็นขอบเขตของทีมอื่น (TOR §2.3) — ทุกพิกัด/แผนที่ในโมดูลนี้
   ใช้ mock projection ของ `AddressMapBlock` (กล่อง 0.10° รอบกรุงเทพฯ ชั้นใน)
   เท่านั้น ไม่ได้ต่อ tile server / API แผนที่จริง.

   ไฟล์นี้เก็บ "โดเมน + คิว + แบบประเมิน + store ของการบันทึกเยี่ยม";
   ทะเบียนผู้รับบริการ + ข้อมูลย้อนหลังรายบุคคลอยู่ใน `homevisitRegistry.js`
   (ซึ่ง import ไฟล์นี้ — ห้าม import กลับทางเพื่อกัน circular import). */

import {
  MNA_ITEMS,
  countMnaAnswered,
  isMnaComplete,
  SCREEN_9Q_QUESTIONS,
  count9qAnswered,
  is9qComplete,
} from '@/data/homevisitAssessments';

/* ─── วันที่ / เวลา ────────────────────────────────────────────────── */

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const toDate = (v) => (v instanceof Date ? v : new Date(v));

/** วันที่แบบไทย (พ.ศ.) — ล้อ formatAddictionDate / formatAncDate. */
export const formatHomeVisitDate = (v) => {
  if (!v) return '—';
  const d = toDate(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
};

export const formatHomeVisitDateTime = (v = new Date()) => {
  const d = toDate(v);
  if (Number.isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${formatHomeVisitDate(d)} ${hh}:${mm}`;
};

export const todayIsoDate = () => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

export const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const addDaysIso = (iso, days) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  d.setDate(d.getDate() + days);
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

/** จำนวนวันจาก `fromIso` ถึง `toIso` (บวก = fromIso อยู่ก่อน). */
export const daysBetweenIso = (fromIso, toIso) => {
  if (!fromIso || !toIso) return null;
  const a = new Date(fromIso);
  const b = new Date(toIso);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.round((b - a) / 86400000);
};

/* ─── ผู้ใช้งาน / หน่วยบริการ ──────────────────────────────────────── */

export const HOMEVISIT_CURRENT_USER = 'พว.ศิริพร เยี่ยมสุข';
export const HOMEVISIT_CENTER = 'ศูนย์บริการสาธารณสุข 41 คลองเตย';

/** พิกัดศูนย์บริการฯ (ในกล่อง mock ของ AddressMapBlock) — ใช้เป็นจุดตั้งต้น
    ของการเดินทางและ fallback เมื่อผู้ใช้ปฏิเสธสิทธิ์ Geolocation. */
export const HOMEVISIT_CENTER_LOCATION = { lat: 13.7655, lng: 100.5035 };

/* ─── sessionStorage overlay ──────────────────────────────────────── */

const hasSession = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

export const readJson = (key, fallback) => {
  if (!hasSession()) return fallback;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(key) || 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

export const writeJson = (key, value) => {
  if (!hasSession()) return;
  window.sessionStorage.setItem(key, JSON.stringify(value));
};

/* ─── สิทธิ์เข้าถึงข้อมูลเยี่ยมบ้าน (§1.18.3 / §1.4.2) ─────────────────
   TOR §1.18.3 กำหนดว่า "ดูประวัติย้อนหลังได้ตามสิทธิผู้ใช้" — mock เป็น
   session flag เพื่อให้เดโม state "ไม่มีสิทธิ" ได้ทุกหน้า. */

const ACCESS_KEY = 'mih:homevisit:access';
export const getHomeVisitAccess = () => readJson(ACCESS_KEY, true);
export const setHomeVisitAccess = (allowed) => writeJson(ACCESS_KEY, !!allowed);

/* ─── 6 กลุ่มผู้รับบริการ (TOR 1.10.12.1) ─────────────────────────── */

export const HOMEVISIT_GROUPS = [
  { value: 'curable',          short: 'รักษาหายได้',        label: 'กลุ่มที่รักษาหายได้ (Curable)',                                    badge: 'green'  },
  { value: 'chronic',          short: 'เรื้อรังระยะยาว',    label: 'กลุ่มเจ็บป่วยเรื้อรังระยะยาว (Long-term chronic)',                 badge: 'blue'   },
  { value: 'mildDisability',   short: 'พิการช่วยเหลือได้บ้าง', label: 'กลุ่มพิการระยะยาวที่ช่วยเหลือตัวเองได้บ้าง (Long-term mild disabilities)', badge: 'teal'   },
  { value: 'severeDisability', short: 'พิการช่วยเหลือไม่ได้',  label: 'กลุ่มพิการระยะยาวที่ช่วยเหลือตัวเองไม่ได้ (Long-term extreme disabilities)', badge: 'orange' },
  { value: 'terminal',         short: 'ระยะสุดท้าย',        label: 'กลุ่มผู้ป่วยระยะสุดท้าย (Terminally ill)',                        badge: 'red'    },
  { value: 'special',          short: 'กลุ่มพิเศษ',         label: 'กลุ่มพิเศษ (Special group)',                                       badge: 'purple' },
];

export const resolveGroup = (value) =>
  HOMEVISIT_GROUPS.find((g) => g.value === value) || null;

/** กลุ่มที่ต้องติดธงเตือนติดตัวทุกหน้าจอ (คิว / ทะเบียน / หัวฟอร์มบันทึก). */
export const PERSISTENT_FLAG_GROUPS = ['terminal', 'special'];

/* ─── ธงสถานะเพิ่มเติม (Flag) ─────────────────────────────────────── */

export const HOMEVISIT_FLAGS = [
  { value: 'bedbound',   label: 'ผู้ป่วยติดเตียง',              badge: 'orange' },
  { value: 'fallRisk',   label: 'เสี่ยงหกล้ม',                  badge: 'yellow' },
  { value: 'alone',      label: 'อยู่ลำพัง/ไม่มีผู้ดูแลกลางวัน', badge: 'red'    },
  { value: 'pressureSore', label: 'มีแผลกดทับ',                 badge: 'red'    },
  { value: 'tubeFeeding', label: 'ให้อาหารทางสายยาง',           badge: 'indigo' },
  { value: 'oxygen',     label: 'ใช้ออกซิเจนที่บ้าน',           badge: 'blue'   },
  { value: 'infection',  label: 'เฝ้าระวังการติดเชื้อ',          badge: 'magenta' },
  { value: 'palliative', label: 'ดูแลแบบประคับประคอง',          badge: 'purple' },
];

export const resolveFlag = (value) => HOMEVISIT_FLAGS.find((f) => f.value === value) || null;

/* ─── แหล่งรับเข้า (ประเภทรับเข้า) ────────────────────────────────────
   คู่มือระบบเดิม §2.2: เคสเยี่ยมบ้านเข้าระบบได้ 2 ทาง — "รับต่อจากระบบอื่น"
   (HHC / HV จาก OPD-ห้องสังเกตอาการ / Health Desk–HV / มารดาและทารก–HV)
   หรือ "ศูนย์พบเอง". เคสที่รับต่อมาจะล็อกช่องประเภทรับเข้าไว้ (แก้ไม่ได้)
   และแสดงแถบแหล่งที่รับมาให้เห็นตลอด. */

export const HOMEVISIT_SOURCES = [
  { value: 'hhc',           short: 'HHC',              label: 'HHC — ระบบดูแลผู้ป่วยต่อเนื่องที่บ้าน', badge: 'purple', auto: true  },
  { value: 'hv',            short: 'HV (OPD/สังเกตอาการ)', label: 'HV — ส่งต่อจาก OPD / ห้องสังเกตอาการ', badge: 'blue',   auto: true  },
  { value: 'healthDeskHv',  short: 'Health Desk–HV',   label: 'Health Desk–HV — รับแจ้งผ่านศูนย์ประสาน', badge: 'indigo', auto: true  },
  { value: 'motherChildHv', short: 'มารดาและทารก–HV',  label: 'มารดาและทารก–HV — เยี่ยมหลังคลอด',        badge: 'pink',   auto: true  },
  { value: 'centerFound',   short: 'ศูนย์พบเอง',        label: 'ศูนย์พบเอง — เจ้าหน้าที่ค้นพบในพื้นที่',   badge: 'teal',   auto: false },
  /* มติ คทง.4 ต่อ §1.18.7 — “แบบลงทะเบียน HHC” ต้องรองรับเคสที่ส่งต่อ
     ระหว่างศูนย์บริการสาธารณสุขด้วย ไม่ใช่แค่รับจากโรงพยาบาล/ศูนย์พบเอง */
  { value: 'centerTransfer', short: 'ส่งต่อระหว่างศูนย์ฯ', label: 'ส่งต่อระหว่างศูนย์บริการสาธารณสุข — ผู้ป่วยย้ายพื้นที่รับผิดชอบ', badge: 'yellow', auto: true },
];

export const resolveSource = (value) =>
  HOMEVISIT_SOURCES.find((s) => s.value === value) || null;

/** true = รับต่อจากระบบอื่น → ล็อกช่อง "ประเภทรับเข้า" ในฟอร์มทะเบียน. */
export const isAutoReceivedSource = (value) => !!resolveSource(value)?.auto;

/* ─── ทีม / วิชาชีพผู้รับผิดชอบ ──────────────────────────────────── */

export const HOMEVISIT_PROFESSIONS = [
  { value: 'nurse',      label: 'พยาบาลเยี่ยมบ้าน',   badge: 'teal'   },
  { value: 'social',     label: 'นักสังคมสงเคราะห์',   badge: 'indigo' },
  { value: 'physio',     label: 'นักกายภาพบำบัด',      badge: 'blue'   },
  { value: 'doctor',     label: 'แพทย์',               badge: 'green'  },
  { value: 'pharmacist', label: 'เภสัชกร',             badge: 'orange' },
  { value: 'nutrition',  label: 'นักโภชนาการ',         badge: 'yellow' },
  { value: 'volunteer',  label: 'อสส. ประจำชุมชน',     badge: 'magenta' },
];

export const resolveProfession = (value) =>
  HOMEVISIT_PROFESSIONS.find((p) => p.value === value) || null;

export const HOMEVISIT_STAFF = [
  { name: 'พว.ศิริพร เยี่ยมสุข',    profession: 'nurse'      },
  { name: 'พว.กาญจนา ถึงบ้าน',      profession: 'nurse'      },
  { name: 'พว.ดวงพร ห่วงใย',        profession: 'nurse'      },
  { name: 'นสค.ปิยะ ช่วยชุมชน',      profession: 'social'     },
  { name: 'กภ.ณัฐวุฒิ ฟื้นฟู',       profession: 'physio'     },
  { name: 'นพ.ธนวัฒน์ เมตตา',        profession: 'doctor'     },
  { name: 'ภก.อรทัย จัดยา',          profession: 'pharmacist' },
  { name: 'นภ.พิมพา โภชนาการ',       profession: 'nutrition'  },
  { name: 'อสส.บุญมี รักชุมชน',      profession: 'volunteer'  },
];

export const HOMEVISIT_DISTRICTS = [
  'เขตคลองเตย', 'เขตวัฒนา', 'เขตพระโขนง', 'เขตบางกอกน้อย', 'เขตธนบุรี',
];

export const HOMEVISIT_TIME_SLOTS = [
  { value: 'morning',   label: 'ช่วงเช้า (08:30–12:00)' },
  { value: 'afternoon', label: 'ช่วงบ่าย (13:00–16:30)' },
];

/* ─── สถานะคิวเยี่ยม (1.18.1) ─────────────────────────────────────── */

export const HOMEVISIT_STATUSES = [
  { value: 'scheduled', label: 'นัดวันนี้',       badge: 'blue'   },
  { value: 'toDepart',  label: 'รอออกเยี่ยม',     badge: 'indigo' },
  { value: 'done',      label: 'เยี่ยมเสร็จแล้ว', badge: 'teal'   },
  { value: 'draft',     label: 'ที่ร่างไว้',      badge: 'grey'   },
];

export const resolveVisitStatus = (value) =>
  HOMEVISIT_STATUSES.find((s) => s.value === value) || null;

/* ─── คิวนัดหมายเยี่ยมบ้านวันนี้ (TOR 1.18.1) ─────────────────────────
   `home` ใช้ contract เดียวกับ AddressMapBlock ({lat, lng, pinSaved}) และ
   อยู่ในกล่อง mock 13.74–13.79 N / 100.47–100.54 E เท่านั้น. */

const HOMEVISIT_APPOINTMENT_SEED = [
  {
    id: 'hv-2601', hn: '67-00005', name: 'สุดา ปลอดโปร่ง', age: 67, gender: 'หญิง',
    group: 'severeDisability', source: 'hhc', statusKey: 'toDepart',
    district: 'เขตคลองเตย', community: 'ชุมชนล็อค 1-2-3',
    address: '48/12 ซอยอาจณรงค์ 5 แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
    home: { lat: 13.7702, lng: 100.4906, pinSaved: true },
    responsible: 'พว.ศิริพร เยี่ยมสุข', profession: 'nurse',
    visitDate: null, timeSlot: 'morning', appointmentTime: '09:00',
    lastVisitDate: '2026-06-12', visitCount: 8, confidential: false,
    flags: ['bedbound', 'pressureSore'], routeOrder: 1,
    note: 'ผู้ป่วยติดเตียงหลัง stroke — ทำแผลกดทับ sacrum ทุกสัปดาห์',
  },
  {
    id: 'hv-2602', hn: '67-00012', name: 'วิชัย รุ่งเรือง', age: 60, gender: 'ชาย',
    group: 'chronic', source: 'hv', statusKey: 'toDepart',
    district: 'เขตวัฒนา', community: 'ชุมชนซอยทองหล่อ 20',
    address: '109 ซอยสุขุมวิท 55 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพมหานคร 10110',
    home: { lat: 13.7585, lng: 100.5122, pinSaved: true },
    responsible: 'พว.กาญจนา ถึงบ้าน', profession: 'nurse',
    visitDate: null, timeSlot: 'morning', appointmentTime: '10:30',
    lastVisitDate: '2026-07-10', visitCount: 5, confidential: false,
    flags: [], routeOrder: 2,
    note: 'เบาหวาน + ความดัน ควบคุมไม่ได้ ส่งต่อจาก OPD หลังขาดนัด 2 ครั้ง',
  },
  {
    id: 'hv-2603', hn: '67-00018', name: 'ธีรเดช อัครพงศ์', age: 55, gender: 'ชาย',
    group: 'terminal', source: 'hhc', statusKey: 'toDepart',
    district: 'เขตพระโขนง', community: 'ชุมชนริมคลองพระโขนง',
    address: '77/3 ซอยสุขุมวิท 71 แขวงพระโขนงเหนือ เขตพระโขนง กรุงเทพมหานคร 10260',
    home: { lat: 13.7481, lng: 100.5288, pinSaved: true },
    responsible: 'นพ.ธนวัฒน์ เมตตา', profession: 'doctor',
    visitDate: null, timeSlot: 'morning', appointmentTime: '11:00',
    lastVisitDate: '2026-07-30', visitCount: 12, confidential: true,
    flags: ['palliative', 'oxygen'], routeOrder: 3,
    note: 'มะเร็งปอดระยะสุดท้าย — ดูแลแบบประคับประคองร่วมกับครอบครัว',
  },
  {
    id: 'hv-2604', hn: '67-00027', name: 'จิราพร มณีโชติ', age: 23, gender: 'หญิง',
    group: 'curable', source: 'motherChildHv', statusKey: 'scheduled',
    district: 'เขตคลองเตย', community: 'ชุมชนพัฒนาใหม่',
    address: '15/44 ซอยไผ่สิงโต แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
    home: { lat: 13.7738, lng: 100.4972, pinSaved: true },
    responsible: 'พว.ดวงพร ห่วงใย', profession: 'nurse',
    visitDate: null, timeSlot: 'afternoon', appointmentTime: '13:30',
    lastVisitDate: '2026-08-01', visitCount: 1, confidential: false,
    flags: [], routeOrder: 4,
    note: 'เยี่ยมหลังคลอดครั้งที่ 2 — ประเมินการให้นมแม่และภาวะซึมเศร้าหลังคลอด',
  },
  {
    id: 'hv-2605', hn: '67-00003', name: 'ปริญญา รัตนา', age: 54, gender: 'หญิง',
    group: 'mildDisability', source: 'healthDeskHv', statusKey: 'scheduled',
    district: 'เขตวัฒนา', community: 'ชุมชนสวนอ้อย',
    address: '223 ซอยเอกมัย 12 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพมหานคร 10110',
    home: { lat: 13.7546, lng: 100.5205, pinSaved: true },
    responsible: 'กภ.ณัฐวุฒิ ฟื้นฟู', profession: 'physio',
    visitDate: null, timeSlot: 'afternoon', appointmentTime: '14:30',
    lastVisitDate: '2026-07-18', visitCount: 4, confidential: false,
    flags: ['fallRisk'], routeOrder: 5,
    note: 'อ่อนแรงซีกซ้าย ฝึกเดินด้วย walker — ประเมินความเสี่ยงหกล้มในบ้าน',
  },
  {
    id: 'hv-2606', hn: '67-00021', name: 'วรรณภา ทองดี', age: 50, gender: 'หญิง',
    group: 'chronic', source: 'centerFound', statusKey: 'done',
    district: 'เขตคลองเตย', community: 'ชุมชนคลองเตยล็อค 4-5-6',
    address: '9/88 ซอยอาจณรงค์ 3 แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
    home: { lat: 13.7684, lng: 100.4861, pinSaved: true },
    responsible: 'พว.ศิริพร เยี่ยมสุข', profession: 'nurse',
    visitDate: null, timeSlot: 'morning', appointmentTime: '08:45',
    lastVisitDate: todayIsoDate(), visitCount: 6, confidential: false,
    flags: [], routeOrder: 0,
    note: 'ไตวายเรื้อรังระยะ 4 — ติดตามการจำกัดน้ำและโปรตีน',
  },
  {
    id: 'hv-2607', hn: '67-00009', name: 'กิตติ ศรีสมบูรณ์', age: 52, gender: 'ชาย',
    group: 'chronic', source: 'hv', statusKey: 'draft',
    district: 'เขตธนบุรี', community: 'ชุมชนตลาดพลู',
    address: '18 ซอยเทอดไท 33 แขวงตลาดพลู เขตธนบุรี กรุงเทพมหานคร 10600',
    home: { lat: 13.7442, lng: 100.4756, pinSaved: true },
    responsible: 'พว.กาญจนา ถึงบ้าน', profession: 'nurse',
    visitDate: null, timeSlot: 'afternoon', appointmentTime: '15:30',
    lastVisitDate: '2026-07-25', visitCount: 3, confidential: false,
    flags: [], routeOrder: 6,
    note: 'บันทึกการเยี่ยมค้างไว้ที่ขั้นตอนประเมิน — ยังไม่ส่งข้อมูลกลับศูนย์',
  },
  {
    id: 'hv-2608', hn: '67-00011', name: 'อรอุมา ดวงสว่าง', age: 48, gender: 'หญิง',
    group: 'special', source: 'healthDeskHv', statusKey: 'scheduled',
    district: 'เขตบางกอกน้อย', community: 'ชุมชนวัดระฆัง',
    address: '5/7 ซอยอิสรภาพ 44 แขวงบ้านช่างหล่อ เขตบางกอกน้อย กรุงเทพมหานคร 10700',
    home: { lat: 13.7601, lng: 100.4738, pinSaved: true },
    responsible: 'นสค.ปิยะ ช่วยชุมชน', profession: 'social',
    visitDate: null, timeSlot: 'afternoon', appointmentTime: '14:00',
    lastVisitDate: '2026-05-06', visitCount: 2, confidential: true,
    flags: ['alone'], routeOrder: 7,
    note: 'กลุ่มพิเศษ — ผู้สูงอายุอยู่ลำพัง ประสานสวัสดิการสังคม',
  },
  {
    id: 'hv-2609', hn: '67-00014', name: 'ชัยวัฒน์ ก้องเกียรติ', age: 47, gender: 'ชาย',
    group: 'severeDisability', source: 'hhc', statusKey: 'scheduled',
    district: 'เขตพระโขนง', community: 'ชุมชนสุเหร่าบ้านดอน',
    address: '66/2 ซอยสุขุมวิท 38 แขวงพระโขนง เขตคลองเตย กรุงเทพมหานคร 10110',
    home: { lat: 13.7523, lng: 100.5341, pinSaved: true },
    responsible: 'พว.ดวงพร ห่วงใย', profession: 'nurse',
    visitDate: null, timeSlot: 'morning', appointmentTime: '09:45',
    lastVisitDate: '2026-01-15', visitCount: 9, confidential: false,
    flags: ['bedbound', 'tubeFeeding'], routeOrder: 8,
    note: 'บาดเจ็บไขสันหลัง — ให้อาหารทางสายยาง เปลี่ยนสายสวนปัสสาวะทุกเดือน',
  },
  {
    id: 'hv-2610', hn: '67-00007', name: 'มาลี อ่อนน้อม', age: 45, gender: 'หญิง',
    group: 'curable', source: 'hv', statusKey: 'done',
    district: 'เขตวัฒนา', community: 'ชุมชนซอยร่วมฤดี',
    address: '31 ซอยสุขุมวิท 31 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพมหานคร 10110',
    home: { lat: 13.7566, lng: 100.5148, pinSaved: true },
    responsible: 'พว.ศิริพร เยี่ยมสุข', profession: 'nurse',
    visitDate: null, timeSlot: 'morning', appointmentTime: '08:15',
    lastVisitDate: todayIsoDate(), visitCount: 2, confidential: false,
    flags: [], routeOrder: 0,
    note: 'แผลผ่าตัดหน้าท้องหลังจำหน่าย — ทำแผลครั้งสุดท้าย ตัดไหมแล้ว',
  },
  {
    id: 'hv-2611', hn: '67-00022', name: 'อนุชา สมบูรณ์ทรัพย์', age: 44, gender: 'ชาย',
    group: 'chronic', source: 'centerFound', statusKey: 'scheduled',
    district: 'เขตธนบุรี', community: 'ชุมชนวัดกัลยาณ์',
    address: '212 ซอยเจริญนคร 6 แขวงคลองสาน เขตธนบุรี กรุงเทพมหานคร 10600',
    home: { lat: 13.7412, lng: 100.4885, pinSaved: true },
    responsible: 'ภก.อรทัย จัดยา', profession: 'pharmacist',
    visitDate: null, timeSlot: 'afternoon', appointmentTime: '15:00',
    lastVisitDate: '2025-12-20', visitCount: 1, confidential: false,
    flags: [], routeOrder: 9,
    note: 'ตรวจสอบยาเหลือใช้ที่บ้าน (medication reconciliation)',
  },
  {
    id: 'hv-2612', hn: '67-00017', name: 'ภัคจิรา วงศ์อนันต์', age: 41, gender: 'หญิง',
    group: 'mildDisability', source: 'hhc', statusKey: 'scheduled',
    district: 'เขตบางกอกน้อย', community: 'ชุมชนบ้านช่างหล่อ',
    address: '88 ซอยพรานนก 6 แขวงบ้านช่างหล่อ เขตบางกอกน้อย กรุงเทพมหานคร 10700',
    home: { lat: 13.7628, lng: 100.4712, pinSaved: true },
    responsible: 'กภ.ณัฐวุฒิ ฟื้นฟู', profession: 'physio',
    visitDate: null, timeSlot: 'morning', appointmentTime: '10:00',
    lastVisitDate: '2026-07-28', visitCount: 6, confidential: false,
    flags: ['fallRisk'], routeOrder: 10,
    note: 'ข้อเข่าเสื่อมทั้งสองข้าง ฝึกกล้ามเนื้อต้นขาและปรับสภาพบ้าน',
  },
  {
    id: 'hv-2613', hn: '67-00013', name: 'พิมพ์ใจ จันทรา', age: 26, gender: 'หญิง',
    group: 'curable', source: 'motherChildHv', statusKey: 'scheduled',
    district: 'เขตคลองเตย', community: 'ชุมชนหมู่บ้านพัฒนา',
    address: '3/19 ซอยพระราม 4 ซอย 2 แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
    home: { lat: 13.7719, lng: 100.5011, pinSaved: true },
    responsible: 'พว.ดวงพร ห่วงใย', profession: 'nurse',
    visitDate: null, timeSlot: 'afternoon', appointmentTime: '13:00',
    lastVisitDate: null, visitCount: 0, confidential: false,
    flags: [], routeOrder: 11,
    note: 'เยี่ยมหลังคลอดครั้งแรก (ภายใน 7 วัน) — ยังไม่เคยออกเยี่ยม',
  },
  {
    id: 'hv-2614', hn: '67-00025', name: 'ภาสกร ชาญฉลาด', age: 41, gender: 'ชาย',
    group: 'special', source: 'healthDeskHv', statusKey: 'scheduled',
    district: 'เขตวัฒนา', community: 'ชุมชนใต้ทางด่วนอโศก',
    address: '4 ซอยสุขุมวิท 21 แขวงคลองเตยเหนือ เขตวัฒนา กรุงเทพมหานคร 10110',
    home: { lat: 13.7492, lng: 100.5064, pinSaved: false },
    responsible: 'นสค.ปิยะ ช่วยชุมชน', profession: 'social',
    visitDate: null, timeSlot: 'afternoon', appointmentTime: '16:00',
    lastVisitDate: '2025-08-14', visitCount: 1, confidential: true,
    flags: ['alone', 'infection'], routeOrder: 12,
    note: 'กลุ่มพิเศษ — ผู้ป่วยไร้บ้านมีที่พักชั่วคราว ยังไม่ได้ปักหมุดตำแหน่งบ้าน',
  },
];

/* วันนัดของทุกแถวคือ "วันนี้" เสมอ เพื่อให้คิวมีของทุกครั้งที่เปิดเดโม. */
const withToday = (row) => ({ ...row, visitDate: row.visitDate || todayIsoDate() });

const APPT_OVERLAY_KEY = 'mih:homevisit:appointment-overlay';
const APPT_CANCEL_KEY = 'mih:homevisit:appointment-cancelled';

/** คิวเยี่ยมบ้าน = seed + สิ่งที่ผู้ใช้แก้/สร้างใน session นี้. */
export const getHomeVisitQueueRows = () => {
  const overlay = readJson(APPT_OVERLAY_KEY, {});
  const merged = HOMEVISIT_APPOINTMENT_SEED
    .map(withToday)
    .map((row) => (overlay[row.id] ? { ...row, ...overlay[row.id] } : row));
  const created = Object.values(overlay).filter(
    (row) => !HOMEVISIT_APPOINTMENT_SEED.some((seed) => seed.id === row.id),
  );
  return [...created, ...merged];
};

export const findHomeVisitAppointment = (id) =>
  getHomeVisitQueueRows().find((r) => r.id === id) || null;

export const findHomeVisitAppointmentByHn = (hn) =>
  getHomeVisitQueueRows().find((r) => r.hn === hn) || null;

/** สร้าง/แก้ไขนัดเยี่ยม — ประทับผู้บันทึก/ผู้แก้ไข + เวลาเสมอ (audit trail). */
export const upsertHomeVisitAppointment = (entry) => {
  const overlay = readJson(APPT_OVERLAY_KEY, {});
  const isNew = !entry.id;
  const id = entry.id || `hv-${Date.now()}`;
  const prev = overlay[id] || HOMEVISIT_APPOINTMENT_SEED.find((r) => r.id === id) || {};
  const stamped = {
    ...prev,
    ...entry,
    id,
    ...(isNew
      ? { recordedBy: HOMEVISIT_CURRENT_USER, recordedAt: formatHomeVisitDateTime() }
      : { editedBy: HOMEVISIT_CURRENT_USER, editedAt: formatHomeVisitDateTime() }),
  };
  writeJson(APPT_OVERLAY_KEY, { ...overlay, [id]: stamped });
  return stamped;
};

export const setHomeVisitStatus = (id, statusKey) =>
  upsertHomeVisitAppointment({ id, statusKey });

/** "ออกเยี่ยม" — ย้ายจากรอออกเยี่ยม → กำลังเยี่ยม (คู่กับ 1.18.9 check-in). */

export const cancelHomeVisitAppointment = (id, reason) => {
  const all = readJson(APPT_CANCEL_KEY, {});
  writeJson(APPT_CANCEL_KEY, {
    ...all,
    [id]: { reason, by: HOMEVISIT_CURRENT_USER, at: formatHomeVisitDateTime() },
  });
};

export const reactivateHomeVisitAppointment = (id) => {
  const all = readJson(APPT_CANCEL_KEY, {});
  const { [id]: _removed, ...rest } = all;
  writeJson(APPT_CANCEL_KEY, rest);
};

export const getHomeVisitAppointmentCancellation = (id) =>
  readJson(APPT_CANCEL_KEY, {})[id] || null;

/* ─── เยี่ยม/ติดตามประเมินผล (คู่มือระบบเดิม §2.2.6) ────────────────
   ระบบเดิมกำหนดรอบติดตามตามกลุ่มผู้รับบริการ: กลุ่มระยะสุดท้ายทุก 30 วัน,
   กลุ่มเรื้อรัง/พิการช่วยเหลือไม่ได้ภายใน 6 เดือน, กลุ่มอื่นปีละครั้ง. */

export const GROUP_FOLLOWUP_DAYS = {
  curable: 180,
  chronic: 180,
  mildDisability: 365,
  severeDisability: 180,
  terminal: 30,
  special: 365,
};

/** คืนค่า { dueDate, daysOverdue } เมื่อเลยกำหนดติดตามแล้ว มิฉะนั้น null. */
export const getVisitFollowUpOverdue = (row, asOfIso = todayIsoDate()) => {
  if (!row) return null;
  const window = GROUP_FOLLOWUP_DAYS[row.group] ?? 365;
  /* ยังไม่เคยเยี่ยมเลย → นับจากวันที่ลงทะเบียน/วันนัดแรกแทน */
  const base = row.lastVisitDate || row.registeredDate || row.visitDate;
  if (!base) return null;
  const dueDate = addDaysIso(base, window);
  const overdue = daysBetweenIso(dueDate, asOfIso);
  if (overdue === null || overdue <= 0) return null;
  return { dueDate, daysOverdue: overdue, windowDays: window, lastVisitDate: row.lastVisitDate };
};

/* ─── §1.18.8 พิกัดปัจจุบัน / §1.18.9 บันทึกเวลาถึงบ้าน ──────────────── */

/** ระยะทางโดยประมาณ (เมตร) แบบ equirectangular — พอสำหรับ mock box เล็ก ๆ. */
export const distanceMeters = (a, b) => {
  if (!a || !b) return null;
  if (!Number.isFinite(a.lat) || !Number.isFinite(a.lng)) return null;
  if (!Number.isFinite(b.lat) || !Number.isFinite(b.lng)) return null;
  const R = 6371000;
  const rad = Math.PI / 180;
  const x = (b.lng - a.lng) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  const y = (b.lat - a.lat) * rad;
  return Math.round(Math.sqrt(x * x + y * y) * R);
};

export const formatDistance = (meters) => {
  if (meters === null || meters === undefined) return '—';
  if (meters < 1000) return `${meters} เมตร`;
  return `${(meters / 1000).toFixed(2)} กม.`;
};

/** เกินระยะนี้ถือว่า "ยังไม่ถึงบ้าน" และต้องยืนยันก่อนจึงจะประทับเวลาถึงได้. */
export const ARRIVAL_DISTANCE_THRESHOLD_M = 300;

const CHECKIN_KEY = 'mih:homevisit:arrival-checkin';

export const getArrivalCheckIn = (visitId) => readJson(CHECKIN_KEY, {})[visitId] || null;

/** ประทับเวลาถึงบ้าน — 1 ครั้งต่อการเยี่ยม; การประทับซ้ำต้องส่ง `note`
    (เหตุผล) เข้ามาด้วย และจะถูกเก็บไว้ในรายการ `restamps` เป็น audit. */
export const saveArrivalCheckIn = (visitId, payload) => {
  const all = readJson(CHECKIN_KEY, {});
  const prev = all[visitId];
  const entry = {
    at: formatHomeVisitDateTime(),
    time: nowHHMM(),
    by: HOMEVISIT_CURRENT_USER,
    ...payload,
    restamps: prev
      ? [...(prev.restamps || []), { at: prev.at, time: prev.time, by: prev.by, note: payload?.note || '' }]
      : [],
  };
  writeJson(CHECKIN_KEY, { ...all, [visitId]: entry });
  return entry;
};

export const clearArrivalCheckIn = (visitId) => {
  const all = readJson(CHECKIN_KEY, {});
  const { [visitId]: _removed, ...rest } = all;
  writeJson(CHECKIN_KEY, rest);
};

/* ─── §1.18.4 อ่านค่าสัญญาณชีพจากอุปกรณ์ (mock integration) ─────────── */

const DEVICE_KEY = 'mih:homevisit:device-connected';

export const HOMEVISIT_DEVICE = {
  id: 'mih-hv-kit-02',
  label: 'ชุดอุปกรณ์เยี่ยมบ้าน MIH-HV Kit (BP + SpO2 + เทอร์โมมิเตอร์)',
};

export const getDeviceConnected = () => readJson(DEVICE_KEY, true);
export const setDeviceConnected = (connected) => writeJson(DEVICE_KEY, !!connected);

const randBetween = (min, max, digits = 0) => {
  const v = min + Math.random() * (max - min);
  return digits === 0 ? String(Math.round(v)) : v.toFixed(digits);
};

/** จำลองการดึงค่าจากอุปกรณ์ — คืน null เมื่ออุปกรณ์ยังไม่เชื่อมต่อ. */
export const readDeviceVitals = () => {
  if (!getDeviceConnected()) return null;
  return {
    temp: randBetween(36.2, 37.6, 1),
    pulse: randBetween(62, 104),
    respiration: randBetween(16, 24),
    oxygen: randBetween(92, 99),
    sys: randBetween(112, 168),
    dia: randBetween(68, 102),
    device: HOMEVISIT_DEVICE.label,
    at: formatHomeVisitDateTime(),
    by: HOMEVISIT_CURRENT_USER,
  };
};

/** ช่วงค่าปกติสำหรับ validation (ค่านอกช่วง = แสดง error styling). */
export const VITAL_FIELDS = [
  { key: 'temp',        label: 'อุณหภูมิ',            unit: '°C',    icon: 'thermostat',      min: 30,  max: 43,  normal: [36.0, 37.4] },
  { key: 'pulse',       label: 'ชีพจร',               unit: 'ครั้ง/นาที', icon: 'monitor_heart',  min: 20,  max: 220, normal: [60, 100] },
  { key: 'respiration', label: 'อัตราการหายใจ',       unit: 'ครั้ง/นาที', icon: 'pulmonology',    min: 5,   max: 60,  normal: [12, 20] },
  { key: 'oxygen',      label: 'ออกซิเจนปลายนิ้ว',    unit: '%',     icon: 'spo2',            min: 50,  max: 100, normal: [95, 100] },
  { key: 'sys',         label: 'ความดัน (ตัวบน)',     unit: 'mmHg',  icon: 'blood_pressure',  min: 50,  max: 260, normal: [90, 139] },
  { key: 'dia',         label: 'ความดัน (ตัวล่าง)',   unit: 'mmHg',  icon: 'blood_pressure',  min: 30,  max: 160, normal: [60, 89] },
  { key: 'weight',      label: 'น้ำหนัก',             unit: 'กก.',   icon: 'monitor_weight',  min: 2,   max: 250, normal: null },
  { key: 'height',      label: 'ส่วนสูง',             unit: 'ซม.',   icon: 'height',          min: 40,  max: 230, normal: null },
];

export const resolveVitalField = (key) => VITAL_FIELDS.find((f) => f.key === key) || null;

/** 'empty' | 'invalid' (นอกช่วงที่เป็นไปได้) | 'abnormal' | 'normal'. */
export const evaluateVital = (key, raw) => {
  const field = resolveVitalField(key);
  if (!field) return { status: 'empty' };
  const value = String(raw ?? '').trim();
  if (!value) return { status: 'empty' };
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return { status: 'invalid', message: `${field.label} ต้องเป็นตัวเลข` };
  }
  if (n < field.min || n > field.max) {
    return {
      status: 'invalid',
      message: `${field.label} ต้องอยู่ระหว่าง ${field.min}–${field.max} ${field.unit}`,
    };
  }
  if (field.normal && (n < field.normal[0] || n > field.normal[1])) {
    return {
      status: 'abnormal',
      message: `${field.label} ${value} ${field.unit} อยู่นอกเกณฑ์ปกติ (${field.normal[0]}–${field.normal[1]})`,
    };
  }
  return { status: 'normal' };
};

/** รวมทุกค่าที่ผิดพลาด/ผิดปกติของชุด vitals หนึ่งชุด. */
export const summarizeVitals = (vitals = {}) => {
  const invalid = [];
  const abnormal = [];
  VITAL_FIELDS.forEach((f) => {
    const res = evaluateVital(f.key, vitals[f.key]);
    if (res.status === 'invalid') invalid.push(res.message);
    else if (res.status === 'abnormal') abnormal.push(res.message);
  });
  const filled = VITAL_FIELDS.filter((f) => String(vitals[f.key] ?? '').trim() !== '').length;
  return { invalid, abnormal, filled, total: VITAL_FIELDS.length };
};

export const calcBmi = (weight, height) => {
  const w = Number(weight);
  const h = Number(height) / 100;
  if (!Number.isFinite(w) || !Number.isFinite(h) || h <= 0) return null;
  return Math.round((w / (h * h)) * 10) / 10;
};

/* ─── ADL — ดัชนีบาร์เธล (Barthel Index) ─────────────────────────────
   10 กิจวัตร คะแนนรวม 0–20 ตามแบบประเมิน ADL ของกระทรวงสาธารณสุข
   (กลุ่มติดสังคม 12–20 · ติดบ้าน 5–11 · ติดเตียง 0–4). */

export const BARTHEL_ITEMS = [
  {
    key: 'feeding', label: 'การรับประทานอาหาร (Feeding)',
    options: [
      { value: 0, label: 'ไม่สามารถตักอาหารเข้าปากได้' },
      { value: 1, label: 'ตักเองได้แต่ต้องมีคนช่วย' },
      { value: 2, label: 'ตักอาหารและใช้อุปกรณ์ได้เอง' },
    ],
  },
  {
    key: 'grooming', label: 'ล้างหน้า หวีผม แปรงฟัน (Grooming)',
    options: [
      { value: 0, label: 'ต้องการความช่วยเหลือ' },
      { value: 1, label: 'ทำเองได้' },
    ],
  },
  {
    key: 'transfer', label: 'ลุกจากที่นอนไปเก้าอี้ (Transfer)',
    options: [
      { value: 0, label: 'ไม่สามารถนั่งได้ ต้องใช้คน 2 คนช่วย' },
      { value: 1, label: 'ต้องการคนช่วยมาก 1–2 คน' },
      { value: 2, label: 'ต้องการความช่วยเหลือเล็กน้อย' },
      { value: 3, label: 'ทำเองได้' },
    ],
  },
  {
    key: 'toilet', label: 'การใช้ห้องน้ำ (Toilet use)',
    options: [
      { value: 0, label: 'ช่วยตัวเองไม่ได้' },
      { value: 1, label: 'ต้องการความช่วยเหลือบ้าง' },
      { value: 2, label: 'ทำเองได้' },
    ],
  },
  {
    key: 'mobility', label: 'การเคลื่อนที่ในบ้าน (Mobility)',
    options: [
      { value: 0, label: 'เคลื่อนที่ไม่ได้' },
      { value: 1, label: 'ใช้รถเข็นได้เอง' },
      { value: 2, label: 'เดินได้โดยมีคนช่วย' },
      { value: 3, label: 'เดินได้เองหรือใช้เครื่องช่วยเดิน' },
    ],
  },
  {
    key: 'dressing', label: 'การสวมใส่เสื้อผ้า (Dressing)',
    options: [
      { value: 0, label: 'ต้องมีคนสวมให้' },
      { value: 1, label: 'ทำเองได้บางส่วน' },
      { value: 2, label: 'ทำเองได้ทั้งหมด' },
    ],
  },
  {
    key: 'stairs', label: 'การขึ้นลงบันได 1 ชั้น (Stairs)',
    options: [
      { value: 0, label: 'ขึ้นลงไม่ได้' },
      { value: 1, label: 'ต้องการคนช่วย' },
      { value: 2, label: 'ขึ้นลงได้เอง' },
    ],
  },
  {
    key: 'bathing', label: 'การอาบน้ำ (Bathing)',
    options: [
      { value: 0, label: 'ต้องมีคนช่วย' },
      { value: 1, label: 'อาบเองได้' },
    ],
  },
  {
    key: 'bowels', label: 'การกลั้นอุจจาระ (Bowels)',
    options: [
      { value: 0, label: 'กลั้นไม่ได้' },
      { value: 1, label: 'กลั้นไม่ได้บางครั้ง' },
      { value: 2, label: 'กลั้นได้ปกติ' },
    ],
  },
  {
    key: 'bladder', label: 'การกลั้นปัสสาวะ (Bladder)',
    options: [
      { value: 0, label: 'กลั้นไม่ได้ / คาสายสวน' },
      { value: 1, label: 'กลั้นไม่ได้บางครั้ง' },
      { value: 2, label: 'กลั้นได้ปกติ' },
    ],
  },
];

export const BARTHEL_MAX_SCORE = BARTHEL_ITEMS.reduce(
  (sum, item) => sum + item.options[item.options.length - 1].value,
  0,
);

export const scoreBarthel = (answers = {}) =>
  BARTHEL_ITEMS.reduce((sum, item) => {
    const v = answers[item.key];
    return sum + (Number.isFinite(v) ? v : 0);
  }, 0);

export const countBarthelAnswered = (answers = {}) =>
  BARTHEL_ITEMS.filter((item) => Number.isFinite(answers[item.key])).length;

export const isBarthelComplete = (answers = {}) =>
  countBarthelAnswered(answers) === BARTHEL_ITEMS.length;

export const interpretBarthel = (total) => {
  if (total >= 12) return { level: 'social', label: 'กลุ่มติดสังคม (ช่วยเหลือตัวเองได้ดี)', badge: 'green' };
  if (total >= 5) return { level: 'home', label: 'กลุ่มติดบ้าน (ต้องการความช่วยเหลือบางส่วน)', badge: 'yellow' };
  return { level: 'bed', label: 'กลุ่มติดเตียง (ต้องการความช่วยเหลือทั้งหมด)', badge: 'red' };
};

/* ─── ประเมินการเยี่ยมบ้าน + คัดกรองสุขภาพรายบุคคล ──────────────── */

export const HOME_ENVIRONMENT_ITEMS = [
  { key: 'lighting',   label: 'แสงสว่างเพียงพอ' },
  { key: 'ventilation', label: 'อากาศถ่ายเทดี' },
  { key: 'toilet',     label: 'ห้องน้ำเหมาะสม/มีราวจับ' },
  { key: 'floor',      label: 'พื้นไม่ลื่น ไม่มีสิ่งกีดขวาง' },
  { key: 'water',      label: 'มีน้ำสะอาดใช้' },
  { key: 'waste',      label: 'จัดการขยะ/ของเสียถูกสุขลักษณะ' },
  { key: 'smokeFree',  label: 'ไม่มีควันบุหรี่ในบ้าน' },
  { key: 'pest',       label: 'ไม่มีแหล่งเพาะพันธุ์ยุงลาย' },
];

export const CAREGIVER_OPTIONS = [
  { value: 'family',    label: 'ญาติสายตรงดูแลเต็มเวลา' },
  { value: 'partTime',  label: 'ญาติดูแลบางเวลา' },
  { value: 'hired',     label: 'จ้างผู้ดูแล' },
  { value: 'volunteer', label: 'อสส./จิตอาสาในชุมชนช่วยดูแล' },
  { value: 'none',      label: 'ไม่มีผู้ดูแล (อยู่ลำพัง)' },
];

export const SCREEN_2Q_QUESTIONS = [
  { key: 'q1', label: '2 สัปดาห์ที่ผ่านมา รู้สึกหดหู่ เศร้า หรือท้อแท้สิ้นหวังหรือไม่' },
  { key: 'q2', label: '2 สัปดาห์ที่ผ่านมา รู้สึกเบื่อ ทำอะไรก็ไม่เพลิดเพลินหรือไม่' },
];

export const PAIN_SCALE = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const NUTRITION_OPTIONS = [
  { value: 'good',   label: 'ภาวะโภชนาการดี'  },
  { value: 'risk',   label: 'เสี่ยงขาดสารอาหาร' },
  { value: 'poor',   label: 'ขาดสารอาหารชัดเจน' },
  { value: 'over',   label: 'น้ำหนักเกิน/อ้วน'  },
];

export const PRESSURE_SORE_OPTIONS = [
  { value: 'none',    label: 'ไม่มีแผลกดทับ' },
  { value: 'stage1',  label: 'ระยะที่ 1 — ผิวหนังแดงไม่จางหาย' },
  { value: 'stage2',  label: 'ระยะที่ 2 — ผิวหนังถลอก/ตุ่มน้ำ' },
  { value: 'stage3',  label: 'ระยะที่ 3 — แผลลึกถึงชั้นไขมัน' },
  { value: 'stage4',  label: 'ระยะที่ 4 — แผลลึกถึงกล้ามเนื้อ/กระดูก' },
];

/* ─── §1.18.5 บันทึกตามบทบาทวิชาชีพ (role-scoped EMR notes) ───────── */

export const ROLE_NOTE_SECTIONS = [
  {
    profession: 'nurse',
    label: 'งานพยาบาลเยี่ยมบ้าน',
    placeholder: 'อาการปัจจุบัน การพยาบาลที่ให้ และแผนการดูแลครั้งถัดไป',
    suggestions: [
      'ประเมินสัญญาณชีพปกติ ทำแผลกดทับบริเวณก้นกบ แผลสะอาดขอบแผลไม่แดง',
      'สอนญาติวิธีพลิกตะแคงตัวทุก 2 ชั่วโมงและการดูแลผิวหนังป้องกันแผลกดทับ',
      'ทบทวนการใช้ยาความดัน ผู้ป่วยรับประทานยาต่อเนื่อง ไม่มีอาการข้างเคียง',
      'ให้คำแนะนำการดูแลสายสวนปัสสาวะและสังเกตอาการติดเชื้อทางเดินปัสสาวะ',
    ],
  },
  {
    profession: 'social',
    label: 'งานสังคมสงเคราะห์',
    placeholder: 'สภาพเศรษฐกิจ ครอบครัว สวัสดิการที่ได้รับ และการประสานส่งต่อ',
    suggestions: [
      'ครอบครัวมีรายได้ไม่แน่นอน ประสานขอเบี้ยยังชีพผู้พิการกับสำนักงานเขต',
      'ผู้ป่วยอยู่ลำพัง ประสาน อสส. ในชุมชนช่วยดูแลและแจ้งเหตุฉุกเฉิน',
      'ประสานขอรับบริจาคผ้าอ้อมผู้ใหญ่และเตียงผู้ป่วยจากมูลนิธิในพื้นที่',
      'ให้คำปรึกษาครอบครัวเรื่องการจัดเวรดูแลผู้ป่วยระยะสุดท้ายที่บ้าน',
    ],
  },
  {
    profession: 'physio',
    label: 'งานกายภาพบำบัด',
    placeholder: 'ความสามารถในการเคลื่อนไหว โปรแกรมฝึก และการปรับสภาพบ้าน',
    suggestions: [
      'ฝึกกำลังกล้ามเนื้อต้นขาและการทรงตัว ผู้ป่วยเดินด้วย walker ได้ 20 เมตร',
      'สอนญาติทำ passive exercise ข้อไหล่-ข้อเข่า วันละ 2 รอบ ป้องกันข้อติด',
      'แนะนำติดตั้งราวจับในห้องน้ำและเก็บสายไฟที่พื้นเพื่อลดความเสี่ยงหกล้ม',
      'ประเมินการใช้รถเข็น ปรับความสูงที่วางเท้าให้เหมาะกับผู้ป่วย',
    ],
  },
  {
    profession: 'doctor',
    label: 'บันทึกแพทย์',
    placeholder: 'การประเมินทางคลินิก การวินิจฉัย และแผนการรักษาที่บ้าน',
    suggestions: [
      'ประเมินอาการปวดควบคุมได้ดีด้วยยาเดิม ปรับขนาดมอร์ฟีนตามระดับความปวด',
      'ระดับน้ำตาลปลายนิ้วสูง ปรับยาเบาหวานและนัดเจาะ HbA1c ที่ศูนย์บริการฯ',
      'พิจารณาส่งต่อโรงพยาบาลแม่ข่ายหากมีไข้สูงหรือหอบเหนื่อยมากขึ้น',
      'ทบทวนแผนการดูแลแบบประคับประคองร่วมกับครอบครัวและทีมเยี่ยมบ้าน',
    ],
  },
  {
    profession: 'pharmacist',
    label: 'งานเภสัชกรรม',
    placeholder: 'ยาที่ผู้ป่วยมีอยู่ ความร่วมมือในการใช้ยา และปัญหาที่พบ',
    suggestions: [
      'ตรวจสอบยาเหลือใช้ที่บ้าน พบยาหมดอายุ 3 รายการ แนะนำวิธีทิ้งอย่างปลอดภัย',
      'จัดกล่องยารายสัปดาห์ให้ผู้ป่วยและสอนญาติจัดยาตามมื้อ',
      'พบการใช้ยาสมุนไพรร่วมกับยาต้านการแข็งตัวของเลือด แนะนำหยุดและแจ้งแพทย์',
      'ทบทวนความร่วมมือในการใช้ยา ผู้ป่วยลืมยามื้อเย็นบ่อย แนะนำตั้งเตือน',
    ],
  },
  {
    profession: 'nutrition',
    label: 'งานโภชนาการ',
    placeholder: 'ภาวะโภชนาการ อาหารที่ได้รับ และคำแนะนำ',
    suggestions: [
      'ผู้ป่วยได้รับอาหารทางสายยาง 5 มื้อ/วัน ปรับสูตรเพิ่มพลังงานตามน้ำหนัก',
      'แนะนำอาหารลดเค็มและจำกัดน้ำสำหรับผู้ป่วยไตเรื้อรัง',
      'ประเมินการกลืน ผู้ป่วยสำลักบ่อย แนะนำอาหารข้นและท่านั่งขณะรับประทาน',
    ],
  },
  {
    profession: 'volunteer',
    label: 'บันทึก อสส. ประจำชุมชน',
    placeholder: 'สิ่งที่พบในชุมชน การช่วยเหลือเบื้องต้น และเรื่องที่ต้องส่งต่อ',
    suggestions: [
      'เยี่ยมติดตามระหว่างรอบ ผู้ป่วยรับประทานยาครบ ไม่มีอาการผิดปกติ',
      'พบว่าครอบครัวขาดผู้ดูแลกลางวัน ประสานทีมเยี่ยมบ้านของศูนย์บริการฯ',
      'ช่วยพาผู้ป่วยไปรับยาที่ศูนย์บริการสาธารณสุขในนัดถัดไป',
    ],
  },
];

/* ─── §1.18.7 กิจกรรมการดูแล ──────────────────────────────────────── */

export const CARE_ACTIVITIES = [
  { key: 'vitalCheck',   label: 'ตรวจวัดสัญญาณชีพ',              group: 'พยาบาล' },
  { key: 'woundCare',    label: 'ทำแผล/ดูแลแผลกดทับ',            group: 'พยาบาล' },
  { key: 'suction',      label: 'ดูดเสมหะ',                      group: 'พยาบาล' },
  { key: 'catheter',     label: 'ใส่/เปลี่ยนสายสวนปัสสาวะ',       group: 'พยาบาล' },
  { key: 'ngTube',       label: 'ใส่/เปลี่ยนสายให้อาหาร',         group: 'พยาบาล' },
  { key: 'medReview',    label: 'ทบทวนยาและยาเหลือใช้',           group: 'เภสัชกรรม' },
  { key: 'physioTrain',  label: 'ฝึกกายภาพบำบัด/การเคลื่อนไหว',   group: 'กายภาพบำบัด' },
  { key: 'healthEdu',    label: 'ให้สุขศึกษาผู้ป่วยและญาติ',       group: 'ส่งเสริมสุขภาพ' },
  { key: 'caregiverTrain', label: 'สอนผู้ดูแลเรื่องการดูแลที่บ้าน', group: 'ส่งเสริมสุขภาพ' },
  { key: 'mentalSupport', label: 'ให้คำปรึกษาด้านจิตใจ',          group: 'จิตสังคม' },
  { key: 'welfareCoord', label: 'ประสานสวัสดิการ/อุปกรณ์ช่วย',     group: 'จิตสังคม' },
  { key: 'envAdjust',    label: 'ปรับสภาพแวดล้อมในบ้าน',          group: 'สิ่งแวดล้อม' },
  { key: 'vaccineAdvice', label: 'แนะนำ/ให้วัคซีนตามเกณฑ์',       group: 'ส่งเสริมสุขภาพ' },
  { key: 'referCoord',   label: 'ประสานส่งต่อสถานพยาบาล',         group: 'ส่งต่อ' },
];

/* ─── §1.18.6 สั่งการรักษา (CPOE) ─────────────────────────────────────
   รายการคำสั่งย้ายไปอยู่ที่ `src/data/homevisitCpoe.js` ซึ่งอ้างแคตตาล็อก
   กลางของ CPOE โดยตรง (labCatalog · xrayCatalog · ICD-9-CM · รายการยา/
   เวชภัณฑ์ของ Step5Orders) — ชุดข้อความเดิมของโมดูลนี้ถูกลบทิ้ง เพราะการ
   มีแคตตาล็อกคู่ขนานคือสาเหตุที่คำสั่งจากบ้านนำเข้า CPOE ไม่ได้. */

/* ─── Family Folder (TOR 1.10.12.3) ───────────────────────────────── */

export const FAMILY_RELATIONS = [
  'หัวหน้าครอบครัว', 'คู่สมรส', 'บุตร', 'บิดา', 'มารดา', 'พี่/น้อง', 'ญาติอื่น', 'ผู้ดูแล',
];

export const HOUSE_TYPE_OPTIONS = [
  { value: 'single',   label: 'บ้านเดี่ยว' },
  { value: 'townhome', label: 'ทาวน์เฮาส์/ตึกแถว' },
  { value: 'flat',     label: 'แฟลต/อพาร์ตเมนต์' },
  { value: 'slum',     label: 'บ้านในชุมชนแออัด' },
  { value: 'rent',     label: 'บ้านเช่า/ห้องเช่า' },
];

export const HOUSE_OWNERSHIP_OPTIONS = [
  { value: 'own',    label: 'เป็นเจ้าของ' },
  { value: 'rent',   label: 'เช่า' },
  { value: 'relative', label: 'อาศัยกับญาติ' },
];

export const WATER_SOURCE_OPTIONS = [
  { value: 'tap',     label: 'น้ำประปา' },
  { value: 'bottled', label: 'น้ำบรรจุขวด' },
  { value: 'well',    label: 'น้ำบาดาล/บ่อ' },
];

export const TOILET_OPTIONS = [
  { value: 'flushIn',  label: 'ส้วมชักโครกในบ้าน' },
  { value: 'squatIn',  label: 'ส้วมนั่งยองในบ้าน' },
  { value: 'shared',   label: 'ส้วมรวมของชุมชน' },
];

/* ─── ส่งข้อมูลเข้ารักษาที่ศูนย์บริการสาธารณสุข ─────────────────────── */

const SUBMIT_KEY = 'mih:homevisit:center-submission';

export const getVisitSubmission = (visitId) => readJson(SUBMIT_KEY, {})[visitId] || null;

export const saveVisitSubmission = (visitId, payload = {}) => {
  const all = readJson(SUBMIT_KEY, {});
  const entry = {
    at: formatHomeVisitDateTime(),
    by: HOMEVISIT_CURRENT_USER,
    center: HOMEVISIT_CENTER,
    ...payload,
  };
  writeJson(SUBMIT_KEY, { ...all, [visitId]: entry });
  return entry;
};

/* ─── ร่าง / เสร็จสิ้น / audit การแก้ไข ────────────────────────────── */

const DRAFT_KEY = 'mih:homevisit:draft';
const COMPLETED_KEY = 'mih:homevisit:completed';
const EDIT_LOG_KEY = 'mih:homevisit:edit-log';

export const saveHomeVisitDraft = (visitId, form, stepIndex) => {
  if (!visitId) return;
  const all = readJson(DRAFT_KEY, {});
  writeJson(DRAFT_KEY, {
    ...all,
    [visitId]: { form, stepIndex, savedAt: formatHomeVisitDateTime(), by: HOMEVISIT_CURRENT_USER },
  });
};

export const getHomeVisitDraft = (visitId) => readJson(DRAFT_KEY, {})[visitId] || null;

export const clearHomeVisitDraft = (visitId) => {
  const all = readJson(DRAFT_KEY, {});
  const { [visitId]: _removed, ...rest } = all;
  writeJson(DRAFT_KEY, rest);
};

export const markHomeVisitCompleted = (visitId) => {
  const all = readJson(COMPLETED_KEY, {});
  const entry = { at: formatHomeVisitDateTime(), by: HOMEVISIT_CURRENT_USER };
  writeJson(COMPLETED_KEY, { ...all, [visitId]: entry });
  return entry;
};

export const getHomeVisitCompletion = (visitId) => readJson(COMPLETED_KEY, {})[visitId] || null;

export const logHomeVisitEdit = (visitId, reason = '') => {
  const all = readJson(EDIT_LOG_KEY, {});
  const entry = { by: HOMEVISIT_CURRENT_USER, at: formatHomeVisitDateTime(), reason };
  writeJson(EDIT_LOG_KEY, { ...all, [visitId]: [...(all[visitId] || []), entry] });
  return entry;
};

export const getHomeVisitEditLog = (visitId) => readJson(EDIT_LOG_KEY, {})[visitId] || [];

/* ─── ฟอร์มบันทึกการเยี่ยม (7 ขั้นตอน) ───────────────────────────── */

export const HOMEVISIT_ILLNESS_SUGGESTIONS = [
  'เบาหวานชนิดที่ 2 ร่วมกับความดันโลหิตสูง รักษาต่อเนื่องที่ศูนย์บริการฯ',
  'อัมพาตครึ่งซีกหลังเส้นเลือดสมองตีบ เมื่อ พ.ศ. 2567',
  'มะเร็งปอดระยะแพร่กระจาย อยู่ระหว่างการดูแลแบบประคับประคอง',
  'ไตวายเรื้อรังระยะที่ 4 ยังไม่ได้ฟอกไต',
  'ข้อเข่าเสื่อมทั้งสองข้าง เดินได้ระยะสั้นโดยใช้เครื่องช่วยเดิน',
];

export const HOMEVISIT_ASSESSMENT_SUGGESTIONS = [
  'สภาพบ้านสะอาด อากาศถ่ายเทดี แต่พื้นห้องน้ำลื่นและไม่มีราวจับ',
  'ผู้ป่วยรู้สึกตัวดี สื่อสารได้ ญาติดูแลใกล้ชิดตลอดเวลา',
  'พบแผลกดทับระยะที่ 2 บริเวณก้นกบ ขนาด 2x3 ซม. ไม่มีหนอง',
  'ผู้ป่วยมีอาการซึมเศร้าเล็กน้อย คัดกรอง 2Q ผลบวก 1 ข้อ',
  'ผู้ดูแลมีภาวะเครียดจากการดูแลต่อเนื่อง ควรให้การสนับสนุนเพิ่ม',
];

export const HOMEVISIT_PLAN_SUGGESTIONS = [
  'นัดเยี่ยมซ้ำภายใน 2 สัปดาห์ เพื่อประเมินแผลและปรับแผนการดูแล',
  'ส่งข้อมูลกลับศูนย์บริการฯ เพื่อนัดพบแพทย์และเจาะเลือดติดตาม',
  'ประสานทีมกายภาพบำบัดร่วมเยี่ยมในรอบถัดไป',
  'แจ้งโมดูลงานชุมชนให้ อสส. ติดตามระหว่างรอบการเยี่ยม',
];

export const HOMEVISIT_FAMILY_SUGGESTIONS = [
  'ครอบครัว 4 คน มีผู้สูงอายุ 1 คน ผู้พิการ 1 คน อยู่ในชุมชนแออัด',
  'รายได้หลักจากบุตรคนโต ค่าใช้จ่ายด้านการรักษาเป็นภาระของครอบครัว',
  'บ้านเช่า 1 ห้อง ใช้ห้องน้ำรวมของชุมชน ต้องขึ้นบันไดชัน',
];

export const HOMEVISIT_CANCEL_REASONS = [
  'บันทึกซ้ำ / ข้อมูลผิดพลาด',
  'ผู้รับบริการย้ายออกนอกพื้นที่รับผิดชอบ',
  'ผู้รับบริการหรือครอบครัวปฏิเสธการเยี่ยมบ้าน',
  'ผู้รับบริการเสียชีวิต',
  'ส่งต่อให้หน่วยบริการอื่นรับผิดชอบแทน',
];

const emptyVitals = () => ({
  temp: '', pulse: '', respiration: '', oxygen: '', sys: '', dia: '', weight: '', height: '',
});

/** โครงฟอร์มเปล่าของการบันทึกเยี่ยมบ้าน 1 ครั้ง. */
export const createEmptyHomeVisitForm = (appointment = null, registryEntry = null) => ({
  /* 1 — ข้อมูลทั่วไปและการเดินทาง */
  serviceDate: todayIsoDate(),
  departTime: '',
  visitType: appointment?.visitCount ? 'followup' : 'first',
  team: appointment?.responsible ? [appointment.responsible] : [HOMEVISIT_CURRENT_USER],
  travelNote: '',
  currentLocation: null,
  geolocationDenied: false,
  arrivalTime: '',
  photos: [],
  /* 2 — ประวัติ */
  illnessHistory: registryEntry?.illnessHistory || appointment?.note || '',
  medications: [],
  /* 3 — สัญญาณชีพ */
  vitals: emptyVitals(),
  deviceReading: null,
  vitalsNote: '',
  /* 4 — ประเมิน + คัดกรองด้วยเครื่องมือมาตรฐาน + ADL
     (มติ คทง.4 ต่อ §1.18.5 — MNA-SF · 2Q/9Q · ADL · PPS คำนวณคะแนนอัตโนมัติ
      แทนการให้ผู้บันทึกตัดสิน "ดีขึ้น/แย่ลง" เอง) */
  environment: {},
  caregiver: '',
  mna: {},            /* MNA-SF 6 ข้อ → เติม `nutrition` ให้อัตโนมัติ */
  nutrition: '',      /* ผลแปลจาก MNA-SF (ไม่ให้ผู้ใช้เลือกเองแล้ว) */
  pressureSore: '',
  painScore: null,
  screen2q: {},
  screen9q: {},       /* บังคับเมื่อ 2Q ผลบวก */
  pps: '',            /* Palliative Performance Scale 0–100% */
  assessmentNote: '',
  adlAnswers: {},
  /* 5 — บันทึกตามบทบาท + กิจกรรม */
  roleNotes: {},
  activities: {},
  telemedRequested: false,
  /* 6 — สั่งการรักษา (CPOE) */
  drugOrders: [],
  labOrders: [],
  xrayOrders: [],
  procedureOrders: [],
  orderNote: '',
  /* 7 — Family Folder + ส่งศูนย์ */
  familyMembers: [],
  houseType: '',
  houseOwnership: '',
  waterSource: '',
  toilet: '',
  familyNote: '',
  nextVisitDate: '',
  nextVisitSlot: '',
  planNote: '',
});

/** เปิดฟอร์ม: ใช้ร่างที่ค้างไว้ถ้ามี มิฉะนั้นสร้างใหม่จากนัด + ทะเบียน. */
export const buildHomeVisitForm = (visitId, appointment = null, registryEntry = null) => {
  const draft = visitId ? getHomeVisitDraft(visitId) : null;
  const base = createEmptyHomeVisitForm(appointment, registryEntry);
  if (draft?.form) {
    return {
      form: { ...base, ...draft.form, vitals: { ...base.vitals, ...(draft.form.vitals || {}) } },
      stepIndex: Number.isFinite(draft.stepIndex) ? draft.stepIndex : 0,
      fromDraft: true,
      draftSavedAt: draft.savedAt,
      visitNo: (appointment?.visitCount || 0) + 1,
    };
  }
  return {
    form: base,
    stepIndex: 0,
    fromDraft: false,
    draftSavedAt: null,
    visitNo: (appointment?.visitCount || 0) + 1,
  };
};

/** ขั้นตอนที่ยัง "ไม่ครบ" จะบล็อกปุ่มถัดไป — คืนข้อความ error หรือ null. */
export const getStepValidationError = (form, stepIndex) => {
  switch (stepIndex) {
    case 0:
      if (!form.serviceDate) return 'กรุณาระบุวันที่ให้บริการก่อนไปขั้นตอนถัดไป';
      if (!form.arrivalTime) return 'กรุณากด “บันทึกเวลาถึงบ้าน” ก่อน จึงจะเริ่มบันทึกการเยี่ยมได้ (TOR 1.18.9)';
      return null;
    case 1:
      if (!String(form.illnessHistory || '').trim()) return 'กรุณาบันทึกประวัติการเจ็บป่วยของผู้รับบริการ';
      return null;
    case 2: {
      const { invalid, filled } = summarizeVitals(form.vitals);
      if (invalid.length > 0) return invalid[0];
      if (filled === 0) return 'กรุณาบันทึกสัญญาณชีพอย่างน้อย 1 ค่า (หรือกด “อ่านค่าจากอุปกรณ์”)';
      return null;
    }
    case 3: {
      /* มติ คทง.4 ต่อ §1.18.5 — เครื่องมือมาตรฐานต้องประเมินให้ครบ
         ระบบจึงคำนวณคะแนนและวิเคราะห์ข้อมูลย้อนหลังได้ */
      if (!isMnaComplete(form.mna)) {
        return `ยังประเมินภาวะโภชนาการ MNA-SF ไม่ครบ — ตอบแล้ว ${countMnaAnswered(form.mna)}/${MNA_ITEMS.length} ข้อ`;
      }
      if (!isBarthelComplete(form.adlAnswers)) {
        const missing = BARTHEL_ITEMS
          .map((item, i) => (Number.isFinite(form.adlAnswers?.[item.key]) ? null : i + 1))
          .filter(Boolean);
        return `ยังประเมิน ADL (ดัชนีบาร์เธล) ไม่ครบ — เหลือข้อ ${missing.join(', ')} จาก ${BARTHEL_ITEMS.length} ข้อ`;
      }
      const q2Answered = SCREEN_2Q_QUESTIONS.every((q) => typeof form.screen2q?.[q.key] === 'boolean');
      if (!q2Answered) return 'กรุณาตอบแบบคัดกรองซึมเศร้า 2Q ให้ครบทั้ง 2 ข้อ';
      const q2Positive = SCREEN_2Q_QUESTIONS.some((q) => form.screen2q?.[q.key] === true);
      if (q2Positive && !is9qComplete(form.screen9q)) {
        return `2Q ผลบวก — ต้องประเมิน 9Q ต่อให้ครบ (ตอบแล้ว ${count9qAnswered(form.screen9q)}/${SCREEN_9Q_QUESTIONS.length} ข้อ)`;
      }
      if (form.pps === '' || !Number.isFinite(Number(form.pps))) {
        return 'กรุณาเลือกระดับความสามารถ PPS (Palliative Performance Scale) ของผู้รับบริการ';
      }
      if (!String(form.assessmentNote || '').trim()) return 'กรุณาสรุปผลการประเมินการเยี่ยมบ้าน';
      return null;
    }
    case 4: {
      const hasNote = Object.values(form.roleNotes || {}).some((v) => String(v || '').trim());
      if (!hasNote) return 'กรุณาบันทึกอย่างน้อย 1 วิชาชีพในบันทึกตามบทบาท';
      const hasActivity = Object.values(form.activities || {}).some(Boolean);
      if (!hasActivity) return 'กรุณาเลือกกิจกรรมการดูแลที่ให้ในการเยี่ยมครั้งนี้อย่างน้อย 1 รายการ';
      return null;
    }
    case 5:
      return null; /* CPOE ไม่บังคับ — บางการเยี่ยมไม่มีคำสั่งการรักษา */
    case 6:
      if (!form.nextVisitDate) return 'กรุณาระบุวันนัดเยี่ยมครั้งถัดไป (หรือระบุเหตุผลในบันทึกแผนการดูแล)';
      return null;
    default:
      return null;
  }
};

/** สถานะ "ทำครบแล้ว" ของแต่ละขั้น สำหรับแถบ stepper. */
export const getHomeVisitCompletedSteps = (form, stepIndex = 0) => ([
  !!form.arrivalTime,
  !!String(form.illnessHistory || '').trim(),
  summarizeVitals(form.vitals).filled > 0 && summarizeVitals(form.vitals).invalid.length === 0,
  isBarthelComplete(form.adlAnswers) && isMnaComplete(form.mna)
    && form.pps !== '' && Number.isFinite(Number(form.pps))
    && !!String(form.assessmentNote || '').trim(),
  Object.values(form.roleNotes || {}).some((v) => String(v || '').trim())
    && Object.values(form.activities || {}).some(Boolean),
  stepIndex > 5
    || form.drugOrders.length > 0 || form.labOrders.length > 0
    || form.xrayOrders.length > 0 || form.procedureOrders.length > 0,
  !!form.nextVisitDate,
]);

/** ค่าเริ่มต้นของตัวแปลงคำสั่ง → ข้อความ: ร่างรุ่นเก่าเก็บเป็นข้อความอยู่แล้ว.
    ตั้งแต่ §1.18.6 ผูกกับ CPOE คำสั่งถูกเก็บเป็น id ของแคตตาล็อกกลาง จึงต้อง
    ส่ง `homeVisitOrderLabel` (จาก `homevisitCpoe.js`) เข้ามาแปลงชื่อ —
    ไฟล์นี้ import ไม่ได้เพราะ homevisitCpoe import ไฟล์นี้อยู่ (circular). */
const defaultOrderLabel = (v) => (typeof v === 'string' ? v : v?.name || '');

/** สรุปคำสั่งการรักษาทั้งหมดเป็นข้อความเดียว (ใช้ในใบสรุป/ตารางย้อนหลัง). */
export const summarizeOrders = (form, labelOf = defaultOrderLabel) => {
  const all = [
    ...(form.drugOrders || []),
    ...(form.labOrders || []),
    ...(form.xrayOrders || []),
    ...(form.procedureOrders || []),
  ].map(labelOf).filter(Boolean);
  return all.length ? all.join(' · ') : 'ไม่มีคำสั่งการรักษา';
};
