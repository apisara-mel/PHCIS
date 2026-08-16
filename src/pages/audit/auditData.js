import { STAFF_AVATARS } from '@/data/avatarAssets';

/* ระบบประวัติการใช้งาน (Audit / Activity log) — shared mock data across the
   audit overview + log pages. Moved out of จัดการระบบ (SystemActivityPage)
   so the activity history is its own top-level system (Figma 0EDfjwf1 · 12:1624).

   TOR 1.13.11 — Telemedicine user-login / join / recording events append here
   via `appendAuditEvent` so /audit/log shows them in History. */

export const PALETTE = ['#14B8A6', '#08A768', '#6366F1', '#24A899', '#F59E0B', '#94A3B8'];

export const FUNCTION_USAGE = [
  { label: 'OPD / ตรวจรักษา', value: 420 },
  { label: 'เวชระเบียน / ลงทะเบียน', value: 310 },
  { label: 'ห้องยา (Pharmacy)', value: 260 },
  { label: 'ห้องปฏิบัติการ (Lab)', value: 180 },
  { label: 'การเงิน / เคลม', value: 150 },
  { label: 'Telemedicine', value: 96 },
  { label: 'รายงาน / สถิติ', value: 60 },
];

export const PEAK_HOURS = [
  { label: '08:00–10:00', value: 70, tag: 'สูง' },
  { label: '10:00–12:00', value: 100, tag: 'สูงสุด' },
  { label: '13:00–15:00', value: 60, tag: 'ปานกลาง' },
  { label: '15:00–17:00', value: 55, tag: 'ปานกลาง' },
  { label: 'หลัง 17:00', value: 20, tag: 'ต่ำ' },
];

const SEED_LOG = [
  { time: 'วันนี้ 10:52:41', user: 'พญ.สมหญิง รักษาดี', action: 'เข้าสู่ระบบ Telemed',   mod: 'Telemedicine',   ok: true },
  { time: 'วันนี้ 10:51:18', user: 'พญ.สมหญิง รักษาดี', action: 'เข้าร่วมสาย Telemed',   mod: 'Telemedicine',   ok: true },
  { time: 'วันนี้ 10:48:05', user: 'นพ.ธนกร ใจดี',     action: 'เริ่มบันทึกวิดีโอ',     mod: 'Telemedicine',   ok: true },
  { time: 'วันนี้ 10:45:12', user: 'นพ. สมชาย ใจดี',  action: 'เข้าสู่ระบบ',          mod: 'ระบบกลาง',      ok: true },
  { time: 'วันนี้ 10:44:03', user: 'น.ส. แก้วตา ดวงใจ', action: 'บันทึกการตรวจ',        mod: 'OPD / ตรวจรักษา', ok: true },
  { time: 'วันนี้ 10:41:55', user: 'ภก. ใจดี มีสุข',   action: 'จ่ายยา',              mod: 'ห้องยา',         ok: true },
  { time: 'วันนี้ 10:40:22', user: 'นาย วิชัย ใจกล้า', action: 'พยายามเข้าถึง',        mod: 'การเงิน / เคลม',  ok: false },
  { time: 'วันนี้ 10:38:10', user: 'น.ส. มาลี สวยงาม', action: 'ออกใบเสร็จ',          mod: 'การเงิน / เคลม',  ok: true },
  { time: 'วันนี้ 10:35:47', user: 'นพ. สมชาย ใจดี',  action: 'ออกคำสั่งยา',          mod: 'CPOE',          ok: true },
];

/** Live history log (newest first). Mutated in place so importers of `LOG` stay in sync. */
const MOCK_LOG_ACTIONS = ['เปิดดูข้อมูล', 'บันทึกการตรวจ', 'แก้ไขข้อมูล', 'เข้าสู่ระบบ', 'ส่งออกรายงาน'];
const MOCK_LOG_MODULES = ['OPD / ตรวจรักษา', 'เวชระเบียน / ลงทะเบียน', 'ห้องยา', 'ห้องปฏิบัติการ', 'รายงาน / สถิติ'];
const MOCK_LOG_USERS = ['นพ.กิตติ สุขใจ', 'พว.ณัฐชา แสงทอง', 'ภก.ปรีชา วัฒนกุล', 'น.ส.ชลธิชา บุญมี', 'นายธนกร ศรีสวัสดิ์'];
const MOCK_LOG_TARGETS = ['ผู้รับบริการ HN 67-00001', 'ผู้รับบริการ HN 67-00002', 'คำสั่งยา Amoxicillin 500 mg', 'ผลตรวจ CBC · HN 67-00003', 'รายงานสรุปการให้บริการ'];
const MOCK_LOG_DETAILS = ['เปิดดูข้อมูลผู้รับบริการ', 'บันทึกข้อมูลการตรวจรักษา', 'แก้ไขรายการยาและวิธีใช้', 'ส่งออกข้อมูลเพื่อจัดทำรายงาน', 'ปรับปรุงข้อมูลเวชระเบียน'];
const MOCK_LOG_POLICIES = ['แพทย์เวชปฏิบัติทั่วไป', 'พยาบาลผู้ป่วยนอก', 'เภสัชกรจ่ายยา', 'เจ้าหน้าที่เวชระเบียน', 'ผู้ดูแลระบบ'];
const MOCK_LOG_POSITIONS = ['แพทย์', 'พยาบาลวิชาชีพ', 'เภสัชกร', 'เจ้าหน้าที่เวชระเบียน', 'ผู้ดูแลระบบ'];
const MOCK_LOG_ROWS = Array.from({ length: 91 }, (_, i) => ({
  time: `${String((i % 28) + 1).padStart(2, '0')} มิ.ย. 2569 ${String(8 + (i % 10)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}:00`,
  startedAt: `${String(8 + (i % 10)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}`,
  endedAt: `${String(8 + (i % 10) + (i % 2)).padStart(2, '0')}:${String(((i * 7) + 12 + (i % 40)) % 60).padStart(2, '0')}`,
  user: MOCK_LOG_USERS[i % MOCK_LOG_USERS.length],
  action: MOCK_LOG_ACTIONS[i % MOCK_LOG_ACTIONS.length],
  mod: MOCK_LOG_MODULES[i % MOCK_LOG_MODULES.length],
  target: MOCK_LOG_TARGETS[i % MOCK_LOG_TARGETS.length],
  detail: MOCK_LOG_DETAILS[i % MOCK_LOG_DETAILS.length],
  groupPolicy: MOCK_LOG_POLICIES[i % MOCK_LOG_POLICIES.length],
  position: MOCK_LOG_POSITIONS[i % MOCK_LOG_POSITIONS.length],
  ok: i % 13 !== 0,
  avatarUrl: STAFF_AVATARS[i % STAFF_AVATARS.length],
}));
export const LOG = [...SEED_LOG, ...MOCK_LOG_ROWS].map((row, i) => ({ ...row, avatarUrl: row.avatarUrl || STAFF_AVATARS[i % STAFF_AVATARS.length] }));
const listeners = new Set();

const pad2 = (n) => String(n).padStart(2, '0');

const formatAuditTime = (date = new Date()) => {
  const h = pad2(date.getHours());
  const m = pad2(date.getMinutes());
  const s = pad2(date.getSeconds());
  return `วันนี้ ${h}:${m}:${s}`;
};

/** Snapshot of the live history log (newest first). */
export const getAuditLog = () => LOG.slice();

export const subscribeAuditLog = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * Append a telemed / system audit row (TOR 1.13.11).
 * @param {{ user: string, action: string, mod?: string, ok?: boolean }} entry
 */
export const appendAuditEvent = ({
  user,
  action,
  mod = 'Telemedicine',
  ok = true,
}) => {
  const row = {
    time: formatAuditTime(),
    user,
    action,
    mod,
    ok: Boolean(ok),
  };
  LOG.unshift(row);
  listeners.forEach((fn) => {
    try { fn(); } catch { /* ignore subscriber errors */ }
  });
  return row;
};
