/* TOR §1.17.5.5 — ระบบแจ้งเตือน: ศูนย์รวมการแจ้งเตือน + ตั้งค่าช่องทางรายบุคคล.

   หมวดเหตุการณ์ตาม TOR: รับส่งตัว · รับผล · ส่งตรวจ · ค่าวิกฤต

   ⚠️ ขอบเขต: การ "รับทราบ" ที่นี่เป็น mock ของงานผู้ดูแลระบบเท่านั้น —
   ทะเบียนค่าวิกฤตจริงของงานห้องปฏิบัติการอยู่ที่ src/data/labCritical.js
   (อ่านอย่างเดียวเพื่ออ้างอิงคำศัพท์/เกณฑ์เวลา) การรับทราบที่หน้านี้จะไม่
   เขียนทับสถานะฝั่งแลป ต้องไปรับทราบในระบบแลปแยกต่างหาก. */

import { CRITICAL_ESCALATE_MINUTES } from '@/data/labCritical';
import { USERS } from '@/data/usersAccess';

export const NOTIFICATION_CATEGORIES = [
  { key: 'transfer', label: 'รับส่งตัว',  icon: 'sync_alt',        tone: 'indigo', desc: 'ส่งต่อผู้ป่วยเข้า/ออก · การตอบรับหรือปฏิเสธการส่งต่อ' },
  { key: 'result',   label: 'รับผล',      icon: 'lab_profile',     tone: 'teal',   desc: 'ผลแลป / ผลรังสี ส่งกลับมาที่คลินิกต้นทาง' },
  { key: 'order',    label: 'ส่งตรวจ',    icon: 'send',            tone: 'blue',   desc: 'คำสั่งตรวจถูกส่ง หรือถูกรับเข้าห้องปฏิบัติการ' },
  { key: 'critical', label: 'ค่าวิกฤต',   icon: 'emergency',  tone: 'red',    desc: 'ค่าวิกฤต (critical value) ต้องรับทราบภายในเวลาที่กำหนด' },
];

export const SEVERITIES = [
  { key: 'normal',   label: 'ปกติ',     tone: 'grey'   },
  { key: 'urgent',   label: 'เร่งด่วน', tone: 'orange' },
  { key: 'critical', label: 'วิกฤต',    tone: 'red'    },
];

export const AUDIENCES = [
  { key: 'me',     label: 'ถึงฉัน' },
  { key: 'dept',   label: 'ถึงแผนก' },
  { key: 'center', label: 'ทั้งศูนย์' },
];

export const CHANNELS = [
  { key: 'inapp', label: 'ในระบบ', icon: 'notifications' },
  { key: 'email', label: 'อีเมล',  icon: 'mail' },
  { key: 'sms',   label: 'SMS',    icon: 'sms' },
];

/** เกณฑ์ escalation ของค่าวิกฤต — ยึดค่าเดียวกับทะเบียนแลป (อ่านอย่างเดียว). */
export const DEFAULT_ESCALATE_MINUTES = CRITICAL_ESCALATE_MINUTES;

const SEED = [
  {
    id: 'nt-001', category: 'critical', severity: 'critical', center: 'hc-4',
    title: 'ค่าวิกฤต: Potassium 6.8 mmol/L', patient: 'นางสมศรี ทองดี', hn: '00123456',
    body: 'ผลแลปเคมีคลินิกเกินเกณฑ์วิกฤต (K > 6.5) — ห้องปฏิบัติการโทรแจ้งแล้ว 10:41 น.',
    source: 'ห้องปฏิบัติการ', link: '/lab/results', audience: 'dept', dept: 'opd',
    at: '3 ส.ค. 2569 10:42', ageMinutes: 18, read: false, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-002', category: 'critical', severity: 'critical', center: 'hc-4',
    title: 'ค่าวิกฤต: Hb 5.2 g/dL', patient: 'นายประสิทธิ์ แซ่ลิ้ม', hn: '00119874',
    body: 'ผลโลหิตวิทยาต่ำกว่าเกณฑ์วิกฤต — ต้องรับทราบภายใน 30 นาที',
    source: 'ห้องปฏิบัติการ', link: '/lab/results', audience: 'me', dept: 'opd',
    at: '3 ส.ค. 2569 09:58', ageMinutes: 62, read: true, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-003', category: 'transfer', severity: 'urgent', center: 'hc-4',
    title: 'ส่งต่อผู้ป่วยเข้า — จากศูนย์ 25 ห้วยขวาง', patient: 'นางสาวมณี ศรีทอง', hn: '00131209',
    body: 'ขอส่งต่อเพื่อรับยาต้านไวรัสต่อเนื่อง — รอการตอบรับจากศูนย์ปลายทาง',
    source: 'ระบบส่งต่อผู้ป่วย', link: '/referral', audience: 'center', dept: 'std',
    at: '3 ส.ค. 2569 09:30', ageMinutes: 90, read: false, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-004', category: 'transfer', severity: 'normal', center: 'hc-4',
    title: 'ปลายทางตอบรับการส่งต่อแล้ว', patient: 'นายวิรัตน์ เกิดผล', hn: '00128877',
    body: 'โรงพยาบาลราชวิถีตอบรับการส่งต่อ นัดตรวจ 6 ส.ค. 2569 เวลา 09:00 น.',
    source: 'ระบบส่งต่อผู้ป่วย', link: '/referral', audience: 'me', dept: 'opd',
    at: '3 ส.ค. 2569 08:55', ageMinutes: 125, read: true, acknowledged: true, ackBy: 'นางสาวมาลี เจริญสุข', ackAt: '3 ส.ค. 2569 09:02', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-005', category: 'result', severity: 'urgent', center: 'hc-4',
    title: 'ผลรังสีกลับมาแล้ว — CXR ผิดปกติ', patient: 'นายสมพงษ์ ใจงาม', hn: '00120033',
    body: 'พบฝ้าที่ปอดขวาบน — รังสีแพทย์แนะนำให้ส่งตรวจเสมหะเพิ่ม',
    source: 'งานรังสีวินิจฉัย', link: '/xray', audience: 'dept', dept: 'tb',
    at: '3 ส.ค. 2569 08:40', ageMinutes: 140, read: false, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-006', category: 'result', severity: 'normal', center: 'hc-4',
    title: 'ผลแลปพร้อมแล้ว — CBC, FBS, Lipid', patient: 'นางบุญมี สุขสันต์', hn: '00114520',
    body: 'ผลครบทุกรายการ อยู่ในเกณฑ์ปกติ',
    source: 'ห้องปฏิบัติการ', link: '/lab/results', audience: 'me', dept: 'opd',
    at: '3 ส.ค. 2569 08:15', ageMinutes: 165, read: true, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-007', category: 'order', severity: 'normal', center: 'hc-4',
    title: 'คำสั่งตรวจถูกรับเข้าห้องแลปแล้ว', patient: 'นายเอกชัย รุ่งเรือง', hn: '00126641',
    body: 'รับสิ่งส่งตรวจครบ 3 หลอด — คาดว่าผลออกภายใน 2 ชั่วโมง',
    source: 'ห้องปฏิบัติการ', link: '/lab/receive', audience: 'me', dept: 'opd',
    at: '3 ส.ค. 2569 08:05', ageMinutes: 175, read: true, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-008', category: 'order', severity: 'normal', center: 'hc-4',
    title: 'ส่งตรวจใหม่ — HbA1c', patient: 'นางสาวจันทร์เพ็ญ ดีงาม', hn: '00130012',
    body: 'คำสั่งตรวจถูกส่งไปยังห้องปฏิบัติการเรียบร้อย',
    source: 'คลินิกโรคเรื้อรัง (NCD)', link: '/lab/orders', audience: 'dept', dept: 'opd',
    at: '3 ส.ค. 2569 07:52', ageMinutes: 188, read: false, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: true,
  },
  {
    id: 'nt-009', category: 'critical', severity: 'critical', center: 'hc-25',
    title: 'ค่าวิกฤต: Glucose 32 mg/dL', patient: 'นายสุชาติ พูนทรัพย์', hn: '00140088',
    body: 'ระดับน้ำตาลต่ำวิกฤต — ต้องรับทราบและติดต่อผู้ป่วยทันที',
    source: 'ห้องปฏิบัติการ', link: '/lab/results', audience: 'center', dept: 'opd',
    at: '3 ส.ค. 2569 10:20', ageMinutes: 40, read: false, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-010', category: 'transfer', severity: 'normal', center: 'hc-25',
    title: 'ส่งต่อผู้ป่วยออก — ไปศูนย์ 4 ดินแดง', patient: 'นางกัลยา วงศ์ทอง', hn: '00141277',
    body: 'ขอส่งต่อเพื่อทำทันตกรรม — รอศูนย์ปลายทางตอบรับ',
    source: 'ระบบส่งต่อผู้ป่วย', link: '/referral', audience: 'dept', dept: 'dental',
    at: '3 ส.ค. 2569 09:10', ageMinutes: 110, read: false, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-011', category: 'result', severity: 'normal', center: 'hc-25',
    title: 'ผลแลปพร้อมแล้ว — Urine analysis', patient: 'นายกิตติ ทรัพย์เจริญ', hn: '00142001',
    body: 'พบเม็ดเลือดขาวในปัสสาวะเล็กน้อย — แนะนำติดตามอาการ',
    source: 'ห้องปฏิบัติการ', link: '/lab/results', audience: 'me', dept: 'opd',
    at: '2 ส.ค. 2569 15:44', ageMinutes: 1096, read: true, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
  {
    id: 'nt-012', category: 'order', severity: 'urgent', center: 'hc-15',
    title: 'คำสั่งตรวจด่วน — Troponin I', patient: 'นายอำนวย สุขใจ', hn: '00150432',
    body: 'ผู้ป่วยเจ็บหน้าอก — ส่งตรวจด่วน รอผลภายใน 30 นาที',
    source: 'ห้องอุบัติเหตุ-ฉุกเฉิน', link: '/lab/orders', audience: 'center', dept: 'opd',
    at: '3 ส.ค. 2569 10:05', ageMinutes: 55, read: false, acknowledged: false, ackBy: '', ackAt: '', assignedTo: '', sourceCancelled: false,
  },
];

let ITEMS = SEED.map((n) => ({ ...n }));
const listeners = new Set();
const notify = () => listeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });

export const subscribeNotifications = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const getNotifications = (centerValue = null) =>
  ITEMS.filter((n) => !centerValue || n.center === centerValue).map((n) => ({ ...n }));

export const unreadCount = (centerValue = null) =>
  getNotifications(centerValue).filter((n) => !n.read).length;

export const pendingCriticalCount = (centerValue = null) =>
  getNotifications(centerValue).filter((n) => n.category === 'critical' && !n.acknowledged).length;

export const urgentCount = (centerValue = null) =>
  getNotifications(centerValue).filter((n) => n.severity !== 'normal' && !n.acknowledged).length;

const stamp = () => new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });

export function markRead(id, read = true) {
  const n = ITEMS.find((x) => x.id === id);
  if (n) n.read = read;
  notify();
}

export function markAllRead(centerValue) {
  ITEMS.forEach((n) => { if (!centerValue || n.center === centerValue) n.read = true; });
  notify();
}

/** รับทราบ — บังคับสำหรับค่าวิกฤต, บันทึกผู้รับทราบ + เวลา. */
export function acknowledge(id, actor) {
  const n = ITEMS.find((x) => x.id === id);
  if (!n) return null;
  n.acknowledged = true;
  n.read = true;
  n.ackBy = actor;
  n.ackAt = stamp();
  notify();
  return { ...n };
}

/** ยกเลิกการรับทราบ (กรณีกดผิด) — TOR "ยกเลิก". */
export function revokeAcknowledge(id) {
  const n = ITEMS.find((x) => x.id === id);
  if (!n) return null;
  n.acknowledged = false;
  n.ackBy = '';
  n.ackAt = '';
  notify();
  return { ...n };
}

/** มอบหมายต่อให้เจ้าหน้าที่คนอื่น. */
export function assignTo(id, userName) {
  const n = ITEMS.find((x) => x.id === id);
  if (!n) return null;
  n.assignedTo = userName;
  n.read = true;
  notify();
  return { ...n };
}

export function resetNotifications() {
  ITEMS = SEED.map((n) => ({ ...n }));
  notify();
}

/** เกินเกณฑ์ escalation แล้วหรือยัง (ยังไม่รับทราบ + อายุ > N นาที). */
export const isEscalated = (n, minutes = DEFAULT_ESCALATE_MINUTES) =>
  n.category === 'critical' && !n.acknowledged && n.ageMinutes > minutes;

/* ── ตั้งค่าช่องทางรายบุคคล ─────────────────────────────────────────────
   เก็บชุดเดียวกับแท็บ "การแจ้งเตือน" ใน UserEditPage — ห้ามแยก store. */

const DEFAULT_PREF = () => ({
  channels: {
    transfer: { inapp: true,  email: true,  sms: false },
    result:   { inapp: true,  email: false, sms: false },
    order:    { inapp: true,  email: false, sms: false },
    critical: { inapp: true,  email: true,  sms: true  },
  },
  quietHours: { enabled: false, start: '22:00', end: '06:00' },
  escalateMinutes: DEFAULT_ESCALATE_MINUTES,
  escalateTo: 'หัวหน้าเวร',
});

const PREFS = new Map();
USERS.forEach((u) => PREFS.set(u.id, DEFAULT_PREF()));
/* ตัวอย่างที่ตั้งค่าต่างจาก default เพื่อให้เห็นว่าเก็บรายบุคคลจริง */
const nightNurse = PREFS.get('u-004');
if (nightNurse) {
  nightNurse.quietHours = { enabled: true, start: '22:00', end: '06:00' };
  nightNurse.channels.result.sms = true;
}

const prefListeners = new Set();
const notifyPrefs = () => prefListeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
export const subscribeNotificationPrefs = (fn) => {
  prefListeners.add(fn);
  return () => prefListeners.delete(fn);
};

export function getNotificationPref(userId) {
  if (!PREFS.has(userId)) PREFS.set(userId, DEFAULT_PREF());
  return JSON.parse(JSON.stringify(PREFS.get(userId)));
}

/** บันทึกการตั้งค่า — บล็อกถ้าปิดทุกช่องทางของหมวดค่าวิกฤต. */
export function saveNotificationPref(userId, pref) {
  const errors = validateNotificationPref(pref);
  if (Object.keys(errors).length) return { ok: false, errors };
  PREFS.set(userId, JSON.parse(JSON.stringify(pref)));
  notifyPrefs();
  return { ok: true, errors: {} };
}

export function validateNotificationPref(pref) {
  const errors = {};
  const crit = pref?.channels?.critical || {};
  if (!crit.inapp) errors.critical = 'หมวดค่าวิกฤตต้องเปิดการแจ้งเตือน "ในระบบ" เสมอ ปิดไม่ได้';
  else if (!crit.inapp && !crit.email && !crit.sms) errors.critical = 'ปิดทุกช่องทางของหมวดค่าวิกฤตไม่ได้';
  const q = pref?.quietHours;
  if (q?.enabled && q.start === q.end) errors.quietHours = 'เวลาเริ่มและสิ้นสุดของช่วงห้ามรบกวนต้องไม่เท่ากัน';
  const mins = Number(pref?.escalateMinutes);
  if (!Number.isFinite(mins) || mins < 5 || mins > 240) errors.escalateMinutes = 'กำหนดได้ระหว่าง 5–240 นาที';
  return errors;
}

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm || '0:0').split(':').map(Number);
  return (h % 24) * 60 + (m || 0);
};

/** ช่วงห้ามรบกวนคร่อมเที่ยงคืนต้องคำนวณถูก (22:00–06:00). */
export function isQuietNow(quietHours, now = new Date()) {
  if (!quietHours?.enabled) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(quietHours.start);
  const end = toMinutes(quietHours.end);
  if (start === end) return false;
  return start < end ? (cur >= start && cur < end) : (cur >= start || cur < end);
}
