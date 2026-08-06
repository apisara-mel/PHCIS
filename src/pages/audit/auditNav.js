/* ระบบประวัติการใช้งาน (Audit / Activity log) is a SEPARATE top-level system
   (sibling of PHCIS / จัดการระบบ / Consent), entered from the System Hub
   "ประวัติการใช้งาน" card. Reuses the shared <Sidebar> shell via QueuePageShell
   with its own menu. The activity content used to live inside จัดการระบบ
   (SystemActivityPage) and was moved out here. */
export const AUDIT_NAV = [
  { key: 'audit-overview', label: 'ภาพรวมการใช้งาน', icon: 'bar_chart_4_bars', path: '/audit' },
  { key: 'audit-log',      label: 'บันทึกการใช้งาน',  icon: 'history',          path: '/audit/log' },
  { key: 'audit-record-history', label: 'ประวัติการบันทึกเวชระเบียน', icon: 'edit_note', path: '/audit/record-history' },
  { key: 'audit-pii',      label: 'Log ข้อมูลส่วนบุคคล', icon: 'lock_person', path: '/audit/pii-access' },
];

export default AUDIT_NAV;
