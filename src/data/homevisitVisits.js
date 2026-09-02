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

import { buildEmptyHomeScreening } from '@/data/homeScreeningForm';
import { EMPTY_ADDRESS, buildPersonalDataFromPatient } from '@/data/registrationForm';
import { REGISTRATION_REQUIRED_CONSENT_IDS } from '@/data/registrationConsentForms';
import { findMrPatientByHn } from '@/data/mrPatients';
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
  { value: 'mildDisability',   short: 'พิการช่วยเหลือได้บ้าง', label: 'กลุ่มพิการระยะยาวที่ช่วยเหลือตัวเองได้บ้าง', badge: 'teal'   },
  { value: 'severeDisability', short: 'พิการช่วยเหลือไม่ได้',  label: 'กลุ่มพิการระยะยาวที่ช่วยเหลือตัวเองไม่ได้', badge: 'orange' },
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

/* รายชื่อเขตย้ายไปอยู่ที่ `@/data/centerDistricts` แล้ว (มติผู้ใช้ 2 ก.ย. 69)
   — เขตที่เลือกได้ขึ้นกับศูนย์บริการที่เลือกไว้บน Header ไม่ใช่ค่าคงที่ชุดเดียว
   ทั้งระบบ ใช้ `getCenterDistricts(center)` / `buildDistrictFilterOptions(center)` */

export const HOMEVISIT_TIME_SLOTS = [
  { value: 'morning',   label: 'ช่วงเช้า (08:30–12:00)' },
  { value: 'afternoon', label: 'ช่วงบ่าย (13:00–16:30)' },
];

/* ─── สถานะคิวเยี่ยม (1.18.1) ─────────────────────────────────────── */

export const HOMEVISIT_STATUSES = [
  { value: 'scheduled', label: 'นัดวันนี้',       badge: 'blue'   },
  /* เดิม "รอออกเยี่ยม" — เปลี่ยนเป็น "กำลังเยี่ยม" ตามคำที่ทีมใช้จริง
     (มติผู้ใช้ 30 ส.ค. 69) `value` คงเดิมเพื่อไม่ให้ข้อมูลที่บันทึกไว้เพี้ยน */
  { value: 'toDepart',  label: 'กำลังเยี่ยม',     badge: 'indigo' },
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
    district: 'เขตดินแดง', community: 'ชุมชนแฟลตดินแดง 1-2-3',
    address: '48/12 ถนนวิภาวดีรังสิต ซอย 3 แขวงดินแดง เขตดินแดง กรุงเทพมหานคร 10400',
    home: { lat: 13.7609, lng: 100.5623, pinSaved: true },
    responsible: 'พว.ศิริพร เยี่ยมสุข', profession: 'nurse',
    visitDate: null, timeSlot: 'morning', appointmentTime: '09:00',
    lastVisitDate: '2026-06-12', visitCount: 8, confidential: false,
    flags: ['bedbound', 'pressureSore'], routeOrder: 1,
    note: 'ผู้ป่วยติดเตียงหลัง stroke — ทำแผลกดทับ sacrum ทุกสัปดาห์',
  },
  {
    id: 'hv-2602', hn: '67-00012', name: 'วิชัย รุ่งเรือง', age: 60, gender: 'ชาย',
    group: 'chronic', source: 'hv', statusKey: 'toDepart',
    district: 'เขตห้วยขวาง', community: 'ชุมชนริมคลองบางซื่อ',
    address: '109 ถนนประชาสงเคราะห์ 26 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310',
    home: { lat: 13.7716, lng: 100.5685, pinSaved: true },
    responsible: 'พว.กาญจนา ถึงบ้าน', profession: 'nurse',
    visitDate: null, timeSlot: 'morning', appointmentTime: '10:30',
    lastVisitDate: '2026-07-10', visitCount: 5, confidential: false,
    flags: [], routeOrder: 2,
    note: 'เบาหวาน + ความดัน ควบคุมไม่ได้ ส่งต่อจาก OPD หลังขาดนัด 2 ครั้ง',
  },
  {
    id: 'hv-2603', hn: '67-00018', name: 'ธีรเดช อัครพงศ์', age: 55, gender: 'ชาย',
    group: 'terminal', source: 'hhc', statusKey: 'toDepart',
    district: 'เขตพญาไท', community: 'ชุมชนวัดไผ่ตัน',
    address: '77/3 ถนนราชวิถี ซอย 4 แขวงสามเสนใน เขตพญาไท กรุงเทพมหานคร 10400',
    home: { lat: 13.7764, lng: 100.5393, pinSaved: true },
    responsible: 'นพ.ธนวัฒน์ เมตตา', profession: 'doctor',
    visitDate: null, timeSlot: 'morning', appointmentTime: '11:00',
    lastVisitDate: '2026-07-30', visitCount: 12, confidential: true,
    flags: ['palliative', 'oxygen'], routeOrder: 3,
    note: 'มะเร็งปอดระยะสุดท้าย — ดูแลแบบประคับประคองร่วมกับครอบครัว',
  },
  {
    id: 'hv-2604', hn: '67-00027', name: 'จิราพร มณีโชติ', age: 23, gender: 'หญิง',
    group: 'curable', source: 'motherChildHv', statusKey: 'scheduled',
    district: 'เขตดินแดง', community: 'ชุมชนประชาสงเคราะห์ 24',
    address: '15/44 ซอยดินแดง 1 แขวงดินแดง เขตดินแดง กรุงเทพมหานคร 10400',
    home: { lat: 13.7627, lng: 100.5539, pinSaved: true },
    responsible: 'พว.ดวงพร ห่วงใย', profession: 'nurse',
    visitDate: null, timeSlot: 'afternoon', appointmentTime: '13:30',
    lastVisitDate: '2026-08-01', visitCount: 1, confidential: false,
    flags: [], routeOrder: 4,
    note: 'เยี่ยมหลังคลอดครั้งที่ 2 — ประเมินการให้นมแม่และภาวะซึมเศร้าหลังคลอด',
  },
  {
    id: 'hv-2605', hn: '67-00003', name: 'ปริญญา รัตนา', age: 54, gender: 'หญิง',
    group: 'mildDisability', source: 'healthDeskHv', statusKey: 'scheduled',
    district: 'เขตห้วยขวาง', community: 'ชุมชนรุ่งมณีพัฒนา',
    address: '223 ถนนประชาสงเคราะห์ 26 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310',
    home: { lat: 13.7824, lng: 100.5769, pinSaved: true },
    responsible: 'กภ.ณัฐวุฒิ ฟื้นฟู', profession: 'physio',
    visitDate: null, timeSlot: 'afternoon', appointmentTime: '14:30',
    lastVisitDate: '2026-07-18', visitCount: 4, confidential: false,
    flags: ['fallRisk'], routeOrder: 5,
    note: 'อ่อนแรงซีกซ้าย ฝึกเดินด้วย walker — ประเมินความเสี่ยงหกล้มในบ้าน',
  },
  {
    id: 'hv-2606', hn: '67-00021', name: 'วรรณภา ทองดี', age: 50, gender: 'หญิง',
    group: 'chronic', source: 'centerFound', statusKey: 'done',
    district: 'เขตดินแดง', community: 'ชุมชนแฟลตดินแดง 4-5-6',
    address: '9/88 ซอยประชาสงเคราะห์ 12 แขวงดินแดง เขตดินแดง กรุงเทพมหานคร 10400',
    home: { lat: 13.7771, lng: 100.5602, pinSaved: true },
    responsible: 'พว.ศิริพร เยี่ยมสุข', profession: 'nurse',
    visitDate: null, timeSlot: 'morning', appointmentTime: '08:45',
    lastVisitDate: todayIsoDate(), visitCount: 6, confidential: false,
    flags: [], routeOrder: 0,
    note: 'ไตวายเรื้อรังระยะ 4 — ติดตามการจำกัดน้ำและโปรตีน',
  },
  /* เคสที่เยี่ยมเสร็จแล้ววันนี้ — แท็บ "เยี่ยมเสร็จแล้ว" เดิมมีตัวอย่างแค่สองราย
     ทำให้ดูเหมือนแท็บว่าง (มติผู้ใช้ 30 ส.ค. 69) */
  {
    id: 'hv-2620', hn: '67-00003', name: 'วิชัย รุ่งเรือง', age: 68, gender: 'ชาย',
    group: 'mildDisability', source: 'hv', statusKey: 'done',
    district: 'เขตห้วยขวาง', community: 'ชุมชนริมคลองบางซื่อ',
    address: '55/12 ซอยพระราม 9 ซอย 41 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310',
    home: { lat: 13.7734, lng: 100.579, pinSaved: true },
    responsible: 'กภ.ณัฐวุฒิ ฟื้นฟู', profession: 'physio',
    visitDate: todayIsoDate(), timeSlot: 'morning', appointmentTime: '09:15',
    lastVisitDate: todayIsoDate(), visitCount: 5, confidential: false,
    flags: ['fallRisk'], routeOrder: 0,
    note: 'ฝึกเดินด้วยไม้เท้าในบ้าน — ประเมินการทรงตัวหลังปรับราวจับ',
  },
  {
    id: 'hv-2621', hn: '67-00013', name: 'พิมพ์ใจ จันทรา', age: 33, gender: 'หญิง',
    group: 'curable', source: 'motherChildHv', statusKey: 'done',
    district: 'เขตดินแดง', community: 'ชุมชนริมคลองสามเสน',
    address: '108/5 ถนนวิภาวดีรังสิต ซอย 3 แขวงดินแดง เขตดินแดง กรุงเทพมหานคร 10400',
    home: { lat: 13.7753, lng: 100.5455, pinSaved: true },
    responsible: 'พว.ดวงพร ห่วงใย', profession: 'nurse',
    visitDate: todayIsoDate(), timeSlot: 'morning', appointmentTime: '10:00',
    lastVisitDate: todayIsoDate(), visitCount: 2, confidential: false,
    flags: [], routeOrder: 0,
    note: 'เยี่ยมหลังคลอดครั้งที่ 2 — ประเมินการให้นมและแผลผ่าคลอด',
  },
  {
    id: 'hv-2622', hn: '67-00011', name: 'อรอุมา ดวงสว่าง', age: 45, gender: 'หญิง',
    group: 'special', source: 'healthDeskHv', statusKey: 'done',
    district: 'เขตดินแดง', community: 'ชุมชนซอยประชาสงเคราะห์ 12',
    address: '77/3 ซอยประชาสงเคราะห์ 12 แขวงดินแดง เขตดินแดง กรุงเทพมหานคร 10400',
    home: { lat: 13.7609, lng: 100.5455, pinSaved: true },
    responsible: 'นสค.ปิยะ ช่วยชุมชน', profession: 'social',
    visitDate: todayIsoDate(), timeSlot: 'afternoon', appointmentTime: '13:45',
    lastVisitDate: todayIsoDate(), visitCount: 3, confidential: false,
    flags: [], routeOrder: 0,
    note: 'อยู่ลำพัง/ไม่มีผู้ดูแลกลางวัน — ประสานเครือข่ายชุมชนช่วยดูแล',
  },
  /* นัดล่วงหน้า — วันนัดอยู่ในอนาคต ใช้เติมแท็บ "นัดล่วงหน้า" ของหน้าคิว
     (มติผู้ใช้ 30 ส.ค. 69) */
  {
    id: 'hv-2630', hn: '67-00005', name: 'สุดา ปลอดโปร่ง', age: 67, gender: 'หญิง',
    group: 'severeDisability', source: 'hhc', statusKey: 'scheduled',
    district: 'เขตพญาไท', community: 'ชุมชนซอยอารีย์สัมพันธ์',
    address: '12/45 ถนนประชาสงเคราะห์ 26 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310',
    home: { lat: 13.7782, lng: 100.5267, pinSaved: true },
    responsible: 'พว.ศิริพร เยี่ยมสุข', profession: 'nurse',
    visitDate: addDaysIso(todayIsoDate(), 2), timeSlot: 'morning', appointmentTime: '09:30',
    lastVisitDate: null, visitCount: 11, confidential: false,
    flags: ['bedbound'], routeOrder: 0,
    note: 'ผู้ป่วยติดเตียง — ตรวจแผลกดทับและเปลี่ยนสายให้อาหาร',
  },
  {
    id: 'hv-2631', hn: '67-00018', name: 'ธีรเดช อัครพงศ์', age: 55, gender: 'ชาย',
    group: 'terminal', source: 'hhc', statusKey: 'scheduled',
    district: 'เขตพญาไท', community: 'ชุมชนวัดไผ่ตัน',
    address: '88/2 ถนนประชาสงเคราะห์ 26 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310',
    home: { lat: 13.7728, lng: 100.5351, pinSaved: true },
    responsible: 'นพ.ธนวัฒน์ เมตตา', profession: 'doctor',
    visitDate: addDaysIso(todayIsoDate(), 5), timeSlot: 'afternoon', appointmentTime: '13:30',
    lastVisitDate: null, visitCount: 5, confidential: false,
    flags: [], routeOrder: 0,
    note: 'ดูแลแบบประคับประคอง — ทบทวนแผนการดูแลร่วมกับครอบครัว',
  },
  {
    id: 'hv-2632', hn: '67-00012', name: 'วิชัย รุ่งเรือง', age: 60, gender: 'ชาย',
    group: 'chronic', source: 'hv', statusKey: 'scheduled',
    district: 'เขตห้วยขวาง', community: 'ชุมชนริมคลองบางซื่อ',
    address: '31/9 ถนนประชาสงเคราะห์ 26 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310',
    home: { lat: 13.7842, lng: 100.5874, pinSaved: true },
    responsible: 'พว.ดวงพร ห่วงใย', profession: 'nurse',
    visitDate: addDaysIso(todayIsoDate(), 9), timeSlot: 'morning', appointmentTime: '10:15',
    lastVisitDate: null, visitCount: 3, confidential: false,
    flags: [], routeOrder: 0,
    note: 'เบาหวาน/ความดัน — ติดตามการใช้ยาและระดับน้ำตาลที่บ้าน',
  },
  {
    id: 'hv-2607', hn: '67-00009', name: 'กิตติ ศรีสมบูรณ์', age: 52, gender: 'ชาย',
    group: 'chronic', source: 'hv', statusKey: 'draft',
    district: 'เขตห้วยขวาง', community: 'ชุมชนตลาดห้วยขวาง',
    address: '18 ซอยรัชดาภิเษก 7 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310',
    home: { lat: 13.768, lng: 100.5748, pinSaved: true },
    responsible: 'พว.กาญจนา ถึงบ้าน', profession: 'nurse',
    visitDate: null, timeSlot: 'afternoon', appointmentTime: '15:30',
    lastVisitDate: '2026-07-25', visitCount: 3, confidential: false,
    flags: [], routeOrder: 6,
    note: 'บันทึกการเยี่ยมค้างไว้ที่ขั้นตอนประเมิน — ยังไม่ส่งข้อมูลกลับศูนย์',
  },
  {
    id: 'hv-2608', hn: '67-00011', name: 'อรอุมา ดวงสว่าง', age: 48, gender: 'หญิง',
    group: 'special', source: 'healthDeskHv', statusKey: 'scheduled',
    district: 'เขตดินแดง', community: 'ชุมชนซอยประชาสงเคราะห์ 12',
    address: '5/7 ซอยประชาสงเคราะห์ 12 แขวงดินแดง เขตดินแดง กรุงเทพมหานคร 10400',
    home: { lat: 13.7735, lng: 100.5539, pinSaved: true },
    responsible: 'นสค.ปิยะ ช่วยชุมชน', profession: 'social',
    visitDate: null, timeSlot: 'afternoon', appointmentTime: '14:00',
    lastVisitDate: '2026-05-06', visitCount: 2, confidential: true,
    flags: ['alone'], routeOrder: 7,
    note: 'กลุ่มพิเศษ — ผู้สูงอายุอยู่ลำพัง ประสานสวัสดิการสังคม',
  },
  {
    id: 'hv-2609', hn: '67-00014', name: 'ชัยวัฒน์ ก้องเกียรติ', age: 47, gender: 'ชาย',
    group: 'severeDisability', source: 'hhc', statusKey: 'scheduled',
    district: 'เขตพญาไท', community: 'ชุมชนซอยอารีย์สัมพันธ์',
    address: '66/2 ถนนมิตรไมตรี แขวงดินแดง เขตดินแดง กรุงเทพมหานคร 10400',
    home: { lat: 13.78, lng: 100.5267, pinSaved: true },
    responsible: 'พว.ดวงพร ห่วงใย', profession: 'nurse',
    visitDate: null, timeSlot: 'morning', appointmentTime: '09:45',
    lastVisitDate: '2026-01-15', visitCount: 9, confidential: false,
    flags: ['bedbound', 'tubeFeeding'], routeOrder: 8,
    note: 'บาดเจ็บไขสันหลัง — ให้อาหารทางสายยาง เปลี่ยนสายสวนปัสสาวะทุกเดือน',
  },
  {
    id: 'hv-2610', hn: '67-00007', name: 'มาลี อ่อนน้อม', age: 45, gender: 'หญิง',
    group: 'curable', source: 'hv', statusKey: 'done',
    district: 'เขตห้วยขวาง', community: 'ชุมชนประชาราษฎร์บำเพ็ญ',
    address: '31 ถนนประชาสงเคราะห์ 26 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310',
    home: { lat: 13.7788, lng: 100.5685, pinSaved: true },
    responsible: 'พว.ศิริพร เยี่ยมสุข', profession: 'nurse',
    visitDate: null, timeSlot: 'morning', appointmentTime: '08:15',
    lastVisitDate: todayIsoDate(), visitCount: 2, confidential: false,
    flags: [], routeOrder: 0,
    note: 'แผลผ่าตัดหน้าท้องหลังจำหน่าย — ทำแผลครั้งสุดท้าย ตัดไหมแล้ว',
  },
  {
    id: 'hv-2611', hn: '67-00022', name: 'อนุชา สมบูรณ์ทรัพย์', age: 44, gender: 'ชาย',
    group: 'chronic', source: 'centerFound', statusKey: 'scheduled',
    district: 'เขตห้วยขวาง', community: 'ชุมชนวัดพระราม 9',
    address: '212 ถนนประชาอุทิศ แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310',
    home: { lat: 13.7698, lng: 100.5874, pinSaved: true },
    responsible: 'ภก.อรทัย จัดยา', profession: 'pharmacist',
    visitDate: null, timeSlot: 'afternoon', appointmentTime: '15:00',
    lastVisitDate: '2025-12-20', visitCount: 1, confidential: false,
    flags: [], routeOrder: 9,
    note: 'ตรวจสอบยาเหลือใช้ที่บ้าน (medication reconciliation)',
  },
  {
    id: 'hv-2612', hn: '67-00017', name: 'ภัคจิรา วงศ์อนันต์', age: 41, gender: 'หญิง',
    group: 'mildDisability', source: 'hhc', statusKey: 'scheduled',
    district: 'เขตดินแดง', community: 'ชุมชนแฟลตดินแดง 7-8',
    address: '88 ถนนมิตรไมตรี แขวงดินแดง เขตดินแดง กรุงเทพมหานคร 10400',
    home: { lat: 13.7717, lng: 100.5497, pinSaved: true },
    responsible: 'กภ.ณัฐวุฒิ ฟื้นฟู', profession: 'physio',
    visitDate: null, timeSlot: 'morning', appointmentTime: '10:00',
    lastVisitDate: '2026-07-28', visitCount: 6, confidential: false,
    flags: ['fallRisk'], routeOrder: 10,
    note: 'ข้อเข่าเสื่อมทั้งสองข้าง ฝึกกล้ามเนื้อต้นขาและปรับสภาพบ้าน',
  },
  {
    id: 'hv-2613', hn: '67-00013', name: 'พิมพ์ใจ จันทรา', age: 26, gender: 'หญิง',
    group: 'curable', source: 'motherChildHv', statusKey: 'scheduled',
    district: 'เขตดินแดง', community: 'ชุมชนริมคลองสามเสน',
    address: '3/19 ถนนวิภาวดีรังสิต ซอย 3 แขวงดินแดง เขตดินแดง กรุงเทพมหานคร 10400',
    home: { lat: 13.7699, lng: 100.5518, pinSaved: true },
    responsible: 'พว.ดวงพร ห่วงใย', profession: 'nurse',
    visitDate: null, timeSlot: 'afternoon', appointmentTime: '13:00',
    lastVisitDate: null, visitCount: 0, confidential: false,
    flags: [], routeOrder: 11,
    note: 'เยี่ยมหลังคลอดครั้งแรก (ภายใน 7 วัน) — ยังไม่เคยออกเยี่ยม',
  },
  {
    id: 'hv-2614', hn: '67-00025', name: 'ภาสกร ชาญฉลาด', age: 41, gender: 'ชาย',
    group: 'special', source: 'healthDeskHv', statusKey: 'scheduled',
    district: 'เขตห้วยขวาง', community: 'ชุมชนใต้ทางด่วนรัชดา',
    address: '4 ซอยพระราม 9 ซอย 41 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310',
    home: { lat: 13.777, lng: 100.5874, pinSaved: false },
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

/* ตัวอย่างนัดที่ถูกยกเลิกไว้แล้ว — การยกเลิกจริงเก็บใน sessionStorage อย่างเดียว
   แท็บ "ยกเลิกนัดแล้ว" จึงว่างเสมอในเซสชันใหม่ (มติผู้ใช้ 30 ส.ค. 69) */
const APPT_CANCEL_SEED = {
  'hv-2611': {
    reason: 'ครอบครัวขอเลื่อน — ผู้รับบริการไปพักกับญาติต่างจังหวัด 2 สัปดาห์',
    by: 'พว.ศิริพร เยี่ยมสุข',
    at: '29 สิงหาคม 2569 16:05',
  },
  'hv-2614': {
    reason: 'ผู้รับบริการเข้ารับการรักษาในโรงพยาบาล — นัดใหม่หลังจำหน่าย',
    by: 'พว.ดวงพร ห่วงใย',
    at: '30 สิงหาคม 2569 08:20',
  },
};

export const cancelHomeVisitAppointment = (id, reason) => {
  const all = readJson(APPT_CANCEL_KEY, {});
  writeJson(APPT_CANCEL_KEY, {
    ...all,
    [id]: { reason, by: HOMEVISIT_CURRENT_USER, at: formatHomeVisitDateTime() },
  });
};

/* เปิดใช้งานอีกครั้ง — เขียน `null` ทับ ไม่ใช่ลบคีย์ทิ้ง เพราะเคสที่ยกเลิกมาจาก
   seed จะกลับมาถูกยกเลิกใหม่ทันทีถ้าไม่มีตัวคั่น */
export const reactivateHomeVisitAppointment = (id) => {
  const all = readJson(APPT_CANCEL_KEY, {});
  writeJson(APPT_CANCEL_KEY, { ...all, [id]: null });
};

export const getHomeVisitAppointmentCancellation = (id) => {
  const stored = readJson(APPT_CANCEL_KEY, {});
  if (Object.prototype.hasOwnProperty.call(stored, id)) return stored[id];
  return APPT_CANCEL_SEED[id] || null;
};

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

/* ระดับความปวด 10 ระดับ (มติผู้ใช้ 2 ก.ย. 69) — เดิมเป็น 0–10 (11 ปุ่ม)
   "ไม่ปวด" คือการไม่เลือกอะไรเลย ไม่ต้องมีปุ่ม 0 */
export const PAIN_SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

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

/* ภาวะสุขภาพของสมาชิกในครอบครัว — ดรอปดาวน์แทนช่องพิมพ์อิสระ (มติผู้ใช้
   30 ส.ค. 69) ข้อความอิสระอย่าง "เบาหวาน" กับ "เป็นเบาหวานมานาน" นับรวมกัน
   ไม่ได้เวลาสรุปภาพครัวเรือนของชุมชน */
export const FAMILY_HEALTH_OPTIONS = [
  { value: 'healthy',    label: 'สุขภาพดี ไม่มีโรคประจำตัว' },
  { value: 'caregiver',  label: 'สุขภาพดี · เป็นผู้ดูแลหลัก' },
  { value: 'ncd',        label: 'มีโรคประจำตัว (เบาหวาน/ความดัน/ไขมัน)' },
  { value: 'chronic',    label: 'มีโรคเรื้อรังอื่น ๆ' },
  { value: 'disability', label: 'มีความพิการ/ต้องพึ่งพิง' },
  { value: 'elderly',    label: 'ผู้สูงอายุที่ช่วยเหลือตัวเองได้' },
  { value: 'child',      label: 'เด็ก/วัยเรียน' },
  { value: 'away',       label: 'ไม่ได้อาศัยอยู่ประจำ (ทำงานต่างพื้นที่)' },
  { value: 'unknown',    label: 'ไม่ทราบ/ไม่ได้ซักถาม' },
];

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

/* ข้อมูลส่วนตัวจากเวชระเบียน — ขั้นแรกของบันทึกการเยี่ยมใช้ `Step1Personal`
   ของหน้าเวชระเบียนทั้งก้อน (มติผู้ใช้ 30 ส.ค. 69) จึงต้องเติมค่าตั้งต้นด้วย
   ชุดฟิลด์เดียวกับที่หน้านั้นใช้ ไม่ใช่คัดมาเป็นช่อง ๆ

   ตัดสองอย่างออกจากชุดที่ยืมมา:
     • คีย์ที่อยู่ — ขั้น "ที่อยู่และการเดินทาง" เป็นเจ้าของ ถ้าปล่อยไว้จะทับ
       ที่อยู่ที่ตั้งค่าไว้ด้านล่างในอ็อบเจกต์เดียวกัน
     • `idCardFromChip` — ธงนี้ล็อกช่องที่มาจากชิปบัตร แต่เราเติมจากทะเบียนกลาง
       ไม่ได้เสียบบัตรจริง ทีมเยี่ยมบ้านจึงต้องแก้ได้ (ปุ่มอ่านบัตรที่หัวหน้า
       เป็นคนตั้งธงนี้เอง) */
const ADDRESS_KEYS_FROM_REGISTRATION = [
  'addressRegistered', 'addressCurrent', 'addressContact',
  'useRegisteredForCurrent', 'useRegisteredForContact', 'useCurrentForContact',
];

/* ฟิลด์ที่ `buildPersonalDataFromPatient` หยิบมาจาก "แถวในทะเบียน MR" ตรง ๆ
   ไม่ได้มาจากโปรไฟล์ผู้ป่วย — ในข้อมูลจำลองชุดนี้แถว MR ของ HN เดียวกัน
   *เป็นคนละคน* กับผู้รับบริการเยี่ยมบ้าน (เช่น 67-00005 = สุดา ปลอดโปร่ง อายุ 67
   ในทะเบียนเยี่ยมบ้าน/โปรไฟล์ แต่แถว MR เป็นเด็กนักเรียนอายุ 10) ถ้าเติมมาทั้งชุด
   หน้าจอจะโชว์ "นักเรียน เกิด 2558" คู่กับผู้ป่วยติดเตียงอายุ 67 — ปล่อยว่างไว้
   ให้ทีมกรอกที่บ้านดีกว่าโชว์ข้อมูลของคนอื่น */
const MR_ROW_ONLY_FIELDS = ['dob', 'ageDisplay', 'education', 'occupation', 'marital', 'idCardAddress'];

const personalFromRegistry = (hn, registryEntry = null) => {
  const patient = findMrPatientByHn(hn);
  if (!patient) return {};
  const data = { ...buildPersonalDataFromPatient(patient) };
  ADDRESS_KEYS_FROM_REGISTRATION.forEach((k) => { delete data[k]; });
  delete data.idCardFromChip;
  MR_ROW_ONLY_FIELDS.forEach((k) => { data[k] = ''; });
  /* ทะเบียนเยี่ยมบ้านเป็นเจ้าของข้อมูลระบุตัวตนของเคสนี้ — ทับค่าที่มันรู้จริง
     ทับทีหลังเสมอ เพื่อให้ช่องในฟอร์มตรงกับหัวแฟ้มที่แสดงอยู่ด้านบนหน้าจอ */
  if (registryEntry?.nationalId) data.nationalId = registryEntry.nationalId;
  if (registryEntry?.gender) data.gender = registryEntry.gender;
  if (registryEntry?.age) data.ageDisplay = `${registryEntry.age} ปี`;
  return data;
};

/** โครงฟอร์มเปล่าของการบันทึกเยี่ยมบ้าน 1 ครั้ง. */
export const createEmptyHomeVisitForm = (appointment = null, registryEntry = null) => ({
  /* 1 — ข้อมูลส่วนตัว · สถานะผู้รับบริการ · ข้อมูลการเยี่ยมครั้งนี้
     ข้อมูลส่วนตัวมาก่อนเสมอ แล้วค่าของงานเยี่ยมทับได้ถ้าชื่อคีย์ชนกัน */
  ...personalFromRegistry(registryEntry?.hn || appointment?.hn, registryEntry),
  /* แบบฟอร์มความยินยอม — ขั้นแรก ใช้ `StepConsent` ของหน้าเวชระเบียน
     ซึ่งอ่าน/เขียนคีย์นี้ (ทะเบียนความยินยอมกลางเป็นตัวจริง ค่านี้คือใบที่
     เพิ่งลงนามในรอบนี้ก่อนบันทึกลงทะเบียน) */
  consentCompletedIds: [],
  /* สถานะผู้รับบริการ (การ์ดเดียวกับหน้าเวชระเบียน) */
  patientStatus: 'active',
  lifeStatus: 'alive',
  deceasedDate: '',
  serviceDate: todayIsoDate(),
  /* `departTime` ยังอยู่ในโมเดลเผื่อรายงานเวลาเดินทาง แต่ไม่มีที่กรอกบนหน้าจอแล้ว */
  departTime: '',
  visitType: appointment?.visitCount ? 'followup' : 'first',
  team: appointment?.responsible ? [appointment.responsible] : [HOMEVISIT_CURRENT_USER],
  travelNote: '',
  currentLocation: null,
  geolocationDenied: false,
  arrivalTime: '',
  photos: [],
  /* รูปถ่ายบ้าน (หน้าบ้าน + เลขที่บ้าน) ของขั้นที่อยู่ — มติผู้ใช้ 2 ก.ย. 69 */
  housePhotos: [],
  /* 2 — ที่อยู่และการเดินทาง · ใช้ชุดฟิลด์เดียวกับขั้น "ที่อยู่" ของหน้าเวชระเบียน
     ทั้งก้อน (ทะเบียนบ้าน / ปัจจุบัน / ติดต่อได้ + ธงยืมที่อยู่) เพื่อให้ทีมเยี่ยมบ้าน
     กรอกด้วยหน้าตาเดียวกันเป๊ะ และข้อมูลสองที่เทียบกันได้ (มติผู้ใช้ 30 ส.ค. 69) */
  /* เติมที่อยู่ให้ตั้งแต่เปิดฟอร์ม — เคสเยี่ยมบ้านมีที่อยู่จากทะเบียน/การลงพื้นที่
     ชุมชนอยู่แล้ว ทีมจึงควรได้ "ตรวจ/แก้" ไม่ใช่ "พิมพ์ใหม่ทั้งชุด"
     (มติผู้ใช้ 30 ส.ค. 69) */
  addressRegistered: { ...EMPTY_ADDRESS, ...(findMrPatientByHn(registryEntry?.hn || appointment?.hn)?.address || {}) },
  /* ที่อยู่ปัจจุบันของงานเยี่ยมบ้านคือบ้านที่ไปเยี่ยมจริง ซึ่งตามทะเบียนบ้านเป็นส่วนใหญ่ */
  useRegisteredForCurrent: true,
  addressCurrent: { ...EMPTY_ADDRESS, ...(findMrPatientByHn(registryEntry?.hn || appointment?.hn)?.address || {}) },
  useRegisteredForContact: false,
  useCurrentForContact: false,
  addressContact: { ...EMPTY_ADDRESS },
  /* 4 — ข้อมูลการติดต่อ · 5 — สิทธิการรักษา (ใช้ `Step3Contact` / `Step4Rights`
     ของหน้าเวชระเบียนทั้งก้อน จึงต้องมีคีย์ตั้งต้นชุดเดียวกัน — `emergency`
     ต้องเป็นอาร์เรย์เสมอ ไม่งั้น `.map` ในขั้นนั้นพัง) */
  phone: '',
  altPhone: '',
  email: '',
  emergency: [{ name: '', last: '', relation: '', relationOther: '', phone: '', tag: '' }],
  rightsLookupDone: false,
  rightsGroups: [],
  /* 7 — ประวัติการแพ้ · โรคประจำตัว · ข้อควรระวัง (ใช้ `Step5Flags` ของหน้า
     เวชระเบียนทั้งก้อน) ต้องมีคีย์ตั้งต้นครบชุดเดียวกัน — ทุกลิสต์ต้องเป็น
     อาร์เรย์และ `flags` ต้องเป็นอ็อบเจกต์ ไม่งั้นสลับแท็บแล้ว `.map` / การอ่าน
     `flags.xxx` พังทันที (บั๊กที่ผู้ใช้เจอ 30 ส.ค. 69) */
  flags: {
    vip: false,
    allergyDrug: false,
    allergyOther: false,
    skinReaction: false,
    chronic: false,
    safety: false,
    dnr: false,
    organDonor: false,
    flagOther: false,
  },
  flagOtherNote: '',
  /* ขั้น "ประวัติการแพ้ / โรคประจำตัว" ของงานเยี่ยมบ้านเก็บเป็นข้อความอิสระ
     (มติผู้ใช้ 2 ก.ย. 69) — ธง `flags.allergyDrug` / `flags.chronic` บอกแค่
     มี/ไม่มี ส่วนรายละเอียดอยู่ในสามคีย์นี้ (พิมพ์หรือพูดผ่าน VoiceTextarea) */
  allergyFreeText: '',
  chronicFreeText: '',
  allergyNote: '',
  drugAllergies: [],
  foodAllergies: [],
  chemicalAllergies: [],
  chronicConditions: [],
  safetyRisks: [],
  safetyNote: '',
  dnrDocNo: '',
  dnrSignedDate: '',
  dnrWitness: '',
  dnrDocuments: [],
  organDonorScopes: [],
  organDonorCardNo: '',
  organDonorDate: '',
  organDonorDocuments: [],
  /* หมุดบ้านที่แก้ได้จากหน้าเยี่ยมบ้าน — ตั้งต้นจากทะเบียน ถ้าทีมแก้ที่หน้างาน
     ค่าจะอยู่ที่นี่ (ทะเบียนกลางยังไม่ถูกเขียนทับ) */
  homeLocation: null,
  /* กลุ่มผู้รับบริการ + ที่มาของเคส — ย้ายมาจากเวชระเบียนเยี่ยมบ้าน ให้กรอก/แก้
     ได้ที่บันทึกการเยี่ยมโดยตรง (มติผู้ใช้ 30 ส.ค. 69) ค่าเริ่มต้นมาจากทะเบียน
     ของเคสนี้ ถ้ามี */
  patientGroup: registryEntry?.group || appointment?.group || '',
  homevisitSource: registryEntry?.source || appointment?.source || '',
  /* สภาพการเคลื่อนไหว — ย้ายมาจากเวชระเบียนเยี่ยมบ้านเช่นกัน เพื่อให้บันทึก
     การเยี่ยมเป็นเจ้าของข้อมูลชุดนี้ทั้งหมดก่อนที่ทะเบียนเล่มนั้นจะถูกยกเลิก */
  mobility: '',
  mobilityOther: '',
  /* 4 — อาการป่วย (ชุดฟิลด์เดียวกับขั้น "อาการป่วย" ของหน้าคัดกรอง OPD
     — มติผู้ใช้ 30 ส.ค. 69 · ทีมเยี่ยมบ้านซักอาการแบบเดียวกับที่จุดคัดกรอง
     ข้อมูลสองที่จึงเทียบกันได้และส่งต่อเข้าห้องตรวจได้ตรงช่อง) */
  chiefComplaint: '',
  symptomDuration: '',
  presentIllness: '',
  triageLevel: null,
  illnessHistory: registryEntry?.illnessHistory || appointment?.note || '',
  /* เปิดฟอร์มมาต้องมีแถวยาว่าง 1 แถวรออยู่เลย (มติผู้ใช้ 30 ส.ค. 69) — ของเดิม
     เป็นข้อความว่างเปล่าที่ต้องกด "เพิ่มรายการ" ก่อนถึงจะกรอกได้ ทั้งที่แทบทุกบ้าน
     มียาอย่างน้อยหนึ่งรายการ · คู่กับกติกา "เหลือแถวเดียวลบไม่ได้" ที่หน้าจอ
     ลิสต์นี้จึงมีอย่างน้อยหนึ่งแถวเสมอ */
  medications: [{ id: 'med-1', name: '', nameOther: '', dose: '', doseOther: '', adherence: '' }],
  /* แบบคัดกรองสุขภาพรายบุคคล (ฟอร์มกระดาษของทีมเยี่ยมบ้าน) — ช่องถูกกระจายไป
     ตามขั้นที่ควรอยู่ (ประวัติ · สัญญาณชีพ · ประเมินและคัดกรอง) แต่เก็บรวมเป็น
     ก้อนเดียวเพื่อให้บันทึก/พิมพ์/ส่งต่อได้ทั้งชุด */
  homeScreening: buildEmptyHomeScreening(),
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
  /* แฟ้มครอบครัวเป็นข้อมูลระดับ *ครัวเรือน* ไม่ใช่ระดับการเยี่ยม 1 ครั้ง
     (คู่มือระบบงานสาธารณสุขในชุมชน S011 — แฟ้มครอบครัวผูกกับบ้าน) จึงเก็บตัวจริง
     ไว้ที่ทะเบียนเยี่ยมบ้านของ HN นั้น แล้วเปิดฟอร์มมาเจอรายชื่อเดิมทุกครั้ง
     (มติผู้ใช้ 30 ส.ค. 69) — เดิมเก็บในร่างของแต่ละครั้ง ทีมจึงต้องพิมพ์
     รายชื่อสมาชิกใหม่ทั้งชุดทุกรอบ · ค่าที่แก้จะถูกเขียนกลับทะเบียนตอนกด
     "ส่งข้อมูลเข้าศูนย์ฯ" */
  familyMembers: (registryEntry?.familyMembers || appointment?.familyMembers || []).map((m) => ({ ...m })),  /* เติม mock ให้ครัวเรือนที่ยังไม่มีข้อมูลที่ `HomeVisitStep7Family` (getFamilyMembers) */
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
  /* ⚠️ ดัชนีต้องตรงกับ `HOMEVISIT_STEPS` ใน HomeVisitRecordPage เสมอ — ตอนแทรก
     ขั้น "ที่อยู่และการเดินทาง" เข้ามา เลข case ไม่ได้ถูกเลื่อน จน `case 4`
     ซ้ำกันสองอัน และด่านของขั้น "บันทึกตามบทบาท" กลายเป็นโค้ดที่ไม่มีวันทำงาน
     (แก้พร้อมกับการแทรกขั้น "แบบฟอร์มความยินยอม" 30 ส.ค. 69) */
  switch (stepIndex) {
    case 0:
      /* แบบฟอร์มความยินยอม — ไม่บล็อก บางบ้านลงนามไม่ได้ในรอบนี้ (ผู้รับบริการ
         ไม่รู้สึกตัว / ผู้มีอำนาจลงนามไม่อยู่) ทีมยังต้องบันทึกการเยี่ยมต่อได้ */
      return null;
    case 1:
      /* ไม่ต้องตรวจ `serviceDate` — ช่องถูกถอดออกจากหน้าจอ ค่าตั้งเป็นวันนี้
         อัตโนมัติเสมอ ด่านที่ผู้ใช้แก้ไม่ได้จึงไม่ใช่ด่าน (มติผู้ใช้ 30 ส.ค. 69) */
      return null;
    case 2:
      /* ขั้นที่อยู่และการติดต่อ (รวมสองขั้นเข้าด้วยกัน มติผู้ใช้ 2 ก.ย. 69) —
         ไม่บังคับ ทีมบางบ้านสำรวจที่อยู่ไม่ครบ และเบอร์ผู้ดูแลอาจได้จาก
         ทะเบียนอยู่แล้ว */
      return null;
    case 3:
      /* สิทธิการรักษา — ไม่บังคับ ที่บ้านตรวจสอบสิทธิออนไลน์ไม่ได้เสมอไป */
      return null;
    case 4:
      /* ขั้น "คัดกรอง" (สัญญาณชีพ + ประวัติการแพ้/โรคประจำตัว รวมกันตั้งแต่
         2 ก.ย. 69) ไม่มีด่าน — การบังคับให้วัดครบและแถบแดง "ค่าไม่ถูกต้อง"
         ถูกถอดออกแล้ว การ์ดแต่ละใบติดป้ายบอกค่าที่ผิดช่วงของตัวเองอยู่ตรงจุด
         ที่กรอก · ส่วนประวัติการแพ้ก็ไม่มีฟิลด์บังคับ (บางรายปฏิเสธการแพ้ทั้งหมด
         ซึ่งก็คือ "ไม่ต้องกรอกอะไร") */
      return null;
    case 5:
      /* ขั้น "ประเมินอาการป่วย" (รวมแบบประเมินทั้งชุดแล้ว) ไม่มีด่าน (มติผู้ใช้ 30 ส.ค. 69) — แถบแดงขึ้นค้างตั้งแต่
         เพิ่งเปิดขั้นทั้งที่ยังไม่ได้เริ่มซักอาการ · ช่องยังติดดาว required
         บนหน้าจอเพื่อบอกว่าควรกรอก แต่ไม่ขวางการไปขั้นถัดไป */
      return null;

    /* ขั้นสุดท้ายคือ "ประเมินอาการป่วย" (index 5) ซึ่งไม่มีด่าน — ด่าน
       "ต้องระบุวันนัดเยี่ยมครั้งถัดไป" ถูกถอดออกพร้อมกับขั้น Family Folder
       ที่ยุบเข้าขั้น "ข้อมูลส่วนตัว" (มติผู้ใช้ 2 ก.ย. 69) `form.nextVisitDate`
       ยังอยู่ในโมเดลและในใบสรุป */
    default:
      return null;
  }
};

/** สถานะ "ทำครบแล้ว" ของแต่ละขั้น สำหรับแถบ stepper. */
export const getHomeVisitCompletedSteps = (form, stepIndex = 0) => ([
  /* 1 แบบฟอร์มความยินยอม — ครบเมื่อลงนามครบทุกใบที่ทะเบียนกำหนดว่าจำเป็น */
  REGISTRATION_REQUIRED_CONSENT_IDS.every(
    (id) => (form.consentCompletedIds || []).includes(id),
  ),
  /* 2 ข้อมูลส่วนตัว — ถือว่าครบเมื่อเลือกประเภทการเยี่ยมแล้ว */
  !!form.visitType,
  /* 3 ที่อยู่และการติดต่อ (ขั้นเดียวกันตั้งแต่ 2 ก.ย. 69) — ครบเมื่อมีที่อยู่
     (อย่างน้อยเลขที่บ้าน/เขต หรือปักหมุดแล้ว) หรือมีเบอร์ติดต่ออย่างน้อยหนึ่งช่อง */
  !!(form.addressRegistered?.houseNo || form.addressRegistered?.district
    || form.addressCurrent?.houseNo || form.homeLocation?.pinSaved
    || String(form.phone || '').trim()
    || (form.emergency || []).some((e) => String(e.phone || '').trim())),
  /* 5 สิทธิการรักษา — ครบเมื่อตรวจสอบสิทธิแล้ว (ธงเดียวกับหน้าเวชระเบียน) */
  !!form.rightsLookupDone,
  /* ขั้น "คัดกรอง" (สัญญาณชีพ + ประวัติการแพ้/โรคประจำตัว) — ครบเมื่อวัด
     สัญญาณชีพได้อย่างน้อยหนึ่งค่าโดยไม่มีค่าผิดช่วง หรือทวนประวัติการแพ้/
     โรคประจำตัวแล้ว (ติดธงอย่างน้อยหนึ่งใบ) */
  (summarizeVitals(form.vitals).filled > 0 && summarizeVitals(form.vitals).invalid.length === 0)
    || Object.values(form.flags || {}).some(Boolean),
  /* ขั้น "ประเมินอาการป่วย" — ครบเมื่อมีประวัติปัจจุบันหรือประวัติเจ็บป่วย
     (ช่อง "อาการสำคัญ" ถูกถอดออกจากหน้าจอแล้ว มติผู้ใช้ 2 ก.ย. 69 — ยังเช็ก
     คีย์เดิมไว้เผื่อร่างที่บันทึกก่อนหน้านั้น) */
  !!(String(form.presentIllness || '').trim()
    || String(form.illnessHistory || '').trim()
    || String(form.chiefComplaint || '').trim()),
]);

/** ค่าเริ่มต้นของตัวแปลงคำสั่ง → ข้อความ: ร่างรุ่นเก่าเก็บเป็นข้อความอยู่แล้ว.
    ตั้งแต่ §1.18.6 ผูกกับ CPOE คำสั่งถูกเก็บเป็น id ของแคตตาล็อกกลาง จึงต้อง
    ส่ง `homeVisitOrderLabel` (จาก `homevisitCpoe.js`) เข้ามาแปลงชื่อ —
    ไฟล์นี้ import ไม่ได้เพราะ homevisitCpoe import ไฟล์นี้อยู่ (circular). */
const defaultOrderLabel = (v) => (typeof v === 'string' ? v : v?.name || '');

/* ยาที่พบที่บ้านเลือกจากทะเบียนยากลาง (MEDICATION_NAME_OPTIONS) — รายการที่
   ไม่มีในทะเบียนเลือก "อื่นๆ" แล้วพิมพ์ชื่อเอง เก็บแยกคีย์กันเพื่อให้รู้ได้ว่า
   ตัวไหนคีย์ตรงกับทะเบียน (เอาไปทบทวนยา/ส่ง สปสช. ต่อได้) ตัวไหนเป็นข้อความ
   อิสระ. ทุกที่ที่ต้องแสดงชื่อยาให้เรียกฟังก์ชันนี้ ไม่ใช่อ่าน `.name` ตรง ๆ */
export const HOMEVISIT_MED_OTHER = '__other__';

/* วิธีใช้ — ประกอบจากคำศัพท์ชุดเดียวกับที่หน้าทะเบียนยา/CPOE ใช้
   (ความถี่ `FREQUENCY_OPTIONS` × เวลา `WHEN_OPTIONS` ใน `AddMedicationPopup`
   และ `administrationDefaultsFor` ใน `pharmacyRegistry.js`) เลือกเฉพาะคู่ที่
   ทีมเยี่ยมบ้านเจอจริงในบ้าน ไม่ใช่ผลคูณทั้งหมดซึ่งยาวเกินกว่าจะกวาดตา.
   พิมพ์เองไม่ได้แล้ว — ข้อความอิสระอย่าง "1x1 เช้า" กับ "1×1 หลังอาหารเช้า"
   คือคนละสตริง เอาไปทบทวนยาข้ามครั้งไม่ได้ */
export const HOMEVISIT_MED_SIG_OPTIONS = [
  'วันละ 1 ครั้ง เช้า หลังอาหาร',
  'วันละ 1 ครั้ง เช้า ก่อนอาหาร',
  'วันละ 1 ครั้ง ก่อนนอน',
  'วันละ 2 ครั้ง เช้า-เย็น หลังอาหาร',
  'วันละ 2 ครั้ง เช้า-เย็น ก่อนอาหาร',
  'วันละ 3 ครั้ง หลังอาหาร',
  'วันละ 3 ครั้ง ก่อนอาหาร',
  'วันละ 4 ครั้ง หลังอาหาร',
  'ทุก 4 ชม. เมื่อมีอาการ',
  'ทุก 6 ชม. เมื่อมีอาการ',
  'ทุก 8 ชม. หลังอาหาร',
  'ทุก 12 ชม. หลังอาหาร',
  'เมื่อมีอาการ (PRN)',
  'ใช้ภายนอก ทาบริเวณที่มีอาการ',
];

export const homeVisitMedicationSig = (med = {}) => (
  med.dose === HOMEVISIT_MED_OTHER
    ? String(med.doseOther || '').trim()
    : String(med.dose || '').trim()
);

export const homeVisitMedicationName = (med = {}) => (
  med.name === HOMEVISIT_MED_OTHER
    ? String(med.nameOther || '').trim()
    : String(med.name || '').trim()
);

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
