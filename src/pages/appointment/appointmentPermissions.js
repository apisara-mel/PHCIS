/* Role / permission mock for the appointment module.

   TOR edge case "สิทธิไม่พอ": a viewer role (เช่น เจ้าหน้าที่คลินิกอื่น) must still
   see every list and calendar, but every mutating control — ยืนยัน · ปฏิเสธ ·
   เลื่อน · ยกเลิก · บันทึกตั้งค่า — is disabled with a tooltip, and the detail
   popup opens in the existing `forceReadOnly` mode.

   The active role is stored in sessionStorage so it survives a reload during a
   demo, and can be flipped from /appointment/settings → แท็บ "สิทธิผู้ใช้งาน".
   React 17 — subscribe with useEffect + setTick. */

const STORAGE_KEY = 'mih:appointment-role';

const canUseSessionStorage = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

export const APPT_ROLES = [
  {
    value: 'scheduler',
    label: 'เจ้าหน้าที่ระบบนัดหมาย',
    actor: 'จนท.สมพร ทองดี',
    canManage: true,
    canConfigure: true,
    hint: 'ยืนยัน / ปฏิเสธ / เลื่อน / ยกเลิกนัด และตั้งค่าระบบได้ทั้งหมด',
  },
  {
    value: 'nurse',
    label: 'พยาบาลประจำคลินิก',
    actor: 'พว.กมลชนก แสงทอง',
    canManage: true,
    canConfigure: false,
    hint: 'จัดการนัดหมายได้ แต่แก้ไขการตั้งค่าระบบ (โควตา / วันหยุด) ไม่ได้',
  },
  {
    value: 'viewer',
    label: 'ผู้ใช้งานแบบดูอย่างเดียว',
    actor: 'จนท.ปรีชา ธนบดินทร์ (คลินิกอื่น)',
    canManage: false,
    canConfigure: false,
    hint: 'ดูตารางและรายการได้ แต่ดำเนินการใด ๆ ไม่ได้',
  },
];

export const NO_PERMISSION_TOOLTIP = 'ไม่มีสิทธิดำเนินการ';

let role = null;
const listeners = new Set();

const notify = () => {
  listeners.forEach((fn) => {
    try { fn(); } catch { /* listener errors must not break the store */ }
  });
};

const load = () => {
  if (role) return role;
  if (canUseSessionStorage()) {
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    if (saved && APPT_ROLES.some((r) => r.value === saved)) {
      role = saved;
      return role;
    }
  }
  role = 'scheduler';
  return role;
};

export const subscribeApptRole = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const getApptRole = () => APPT_ROLES.find((r) => r.value === load()) || APPT_ROLES[0];

export const setApptRole = (value) => {
  if (!APPT_ROLES.some((r) => r.value === value)) return;
  role = value;
  if (canUseSessionStorage()) window.sessionStorage.setItem(STORAGE_KEY, value);
  notify();
};

/** ผู้ดำเนินการที่ระบบเซ็ตให้อัตโนมัติ (HCIS: "ผู้ยกเลิก" ห้ามพิมพ์เอง). */
export const getApptActor = () => getApptRole().actor;

export const canManageAppointments = () => getApptRole().canManage;

export const canConfigureAppointments = () => getApptRole().canConfigure;
