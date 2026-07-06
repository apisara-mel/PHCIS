/* ระบบประวัติการใช้งาน (Audit / Activity log) — shared mock data across the
   audit overview + log pages. Moved out of จัดการระบบ (SystemActivityPage)
   so the activity history is its own top-level system (Figma 0EDfjwf1 · 12:1624). */

export const PALETTE = ['#14B8A6', '#08A768', '#6366F1', '#24A899', '#F59E0B', '#94A3B8'];

export const FUNCTION_USAGE = [
  { label: 'OPD / ตรวจรักษา', value: 420 },
  { label: 'เวชระเบียน / ลงทะเบียน', value: 310 },
  { label: 'ห้องยา (Pharmacy)', value: 260 },
  { label: 'ห้องปฏิบัติการ (Lab)', value: 180 },
  { label: 'การเงิน / เคลม', value: 150 },
  { label: 'รายงาน / สถิติ', value: 60 },
];

export const PEAK_HOURS = [
  { label: '08:00–10:00', value: 70, tag: 'สูง' },
  { label: '10:00–12:00', value: 100, tag: 'สูงสุด' },
  { label: '13:00–15:00', value: 60, tag: 'ปานกลาง' },
  { label: '15:00–17:00', value: 55, tag: 'ปานกลาง' },
  { label: 'หลัง 17:00', value: 20, tag: 'ต่ำ' },
];

export const LOG = [
  { time: 'วันนี้ 10:45:12', user: 'นพ. สมชาย ใจดี',  action: 'เข้าสู่ระบบ',          mod: 'ระบบกลาง',      ok: true },
  { time: 'วันนี้ 10:44:03', user: 'น.ส. แก้วตา ดวงใจ', action: 'บันทึกการตรวจ',        mod: 'OPD / ตรวจรักษา', ok: true },
  { time: 'วันนี้ 10:41:55', user: 'ภก. ใจดี มีสุข',   action: 'จ่ายยา',              mod: 'ห้องยา',         ok: true },
  { time: 'วันนี้ 10:40:22', user: 'นาย วิชัย ใจกล้า', action: 'พยายามเข้าถึง',        mod: 'การเงิน / เคลม',  ok: false },
  { time: 'วันนี้ 10:38:10', user: 'น.ส. มาลี สวยงาม', action: 'ออกใบเสร็จ',          mod: 'การเงิน / เคลม',  ok: true },
  { time: 'วันนี้ 10:35:47', user: 'นพ. สมชาย ใจดี',  action: 'ออกคำสั่งยา',          mod: 'CPOE',          ok: true },
];
