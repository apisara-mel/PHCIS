/* Staff roster augmented with scheduleStatus — Schedule Management system
   (ระบบจัดการตารางเวร · Figma node 16:52625).

   This is a TOP-LEVEL system, sibling of PHCIS. It reuses the base roster
   from appointmentStaffRoster.js as the data source, then layers on the
   `scheduleStatus` field that drives the 5 status tabs on Page A.
*/
import { buildStaffRoster, STAFF_ROSTER_TOTAL } from '../appointment/appointmentStaffRoster';

export { STAFF_ROSTER_TOTAL };

export const SCHEDULE_STATUS_KEYS = ['pending', 'inprogress', 'done', 'draft'];

/* Tab labels + icons per Figma Schedule-Management 16:52474 subheader.
   Figma layer names are mixed-convention (Lucide-PascalCase for "Users",
   "Clock", "Check circle", "Save" + Material Symbols snake_case for
   "edit_calendar"). The shared <TabUnderline /> now defers to the project's
   <Icon> adapter, which routes the curated Lucide-style names to their
   exact SVG and falls through to Material Symbols Outlined font for the
   rest — so these strings mirror Figma's layer names 1:1. */
/* "รอจัดตารางเวร" มาก่อน และ "ทั้งหมด" ไปอยู่ท้ายสุด (มติผู้ใช้ 31 ส.ค. 69) —
   สี่แท็บแรกเรียงตามลำดับที่งานเดินจริง (รอจัด → กำลังจัด → จัดแล้ว → ที่ร่างไว้)
   คนที่เปิดหน้านี้มาทำงานต้องเจอกองที่ยังไม่ได้ทำก่อน ส่วน "ทั้งหมด" เป็นมุมมอง
   ภาพรวมที่เปิดดูทีหลัง ไม่ใช่จุดเริ่ม */
export const STATUS_TABS = [
  { key: 'pending',    label: 'รอจัดตารางเวร',     icon: 'clock' },
  { key: 'inprogress', label: 'กำลังจัดตารางเวร',  icon: 'edit_calendar' },
  { key: 'done',       label: 'จัดตารางเวรแล้ว',    icon: 'check-circle' },
  { key: 'draft',      label: 'ที่ร่างไว้',          icon: 'save' },
  { key: 'all',        label: 'ทั้งหมด',           icon: 'users' },
];

export const SCHEDULE_STATUS_META = {
  pending:    { label: 'รอจัดตารางเวร',    tone: 'orange' },
  inprogress: { label: 'กำลังจัดตารางเวร', tone: 'teal' },
  done:       { label: 'จัดตารางเวรแล้ว',   tone: 'green' },
  draft:      { label: 'ที่ร่างไว้',         tone: 'purple' },
};

function statusForIndex(i) {
  return SCHEDULE_STATUS_KEYS[i % SCHEDULE_STATUS_KEYS.length];
}

export function buildScheduleStaff(total = STAFF_ROSTER_TOTAL) {
  return buildStaffRoster(total).map((row, i) => ({
    ...row,
    scheduleStatus: statusForIndex(i),
  }));
}

export function countByStatus(rows) {
  const counts = { all: rows.length, pending: 0, inprogress: 0, done: 0, draft: 0 };
  for (const r of rows) {
    if (counts[r.scheduleStatus] !== undefined) counts[r.scheduleStatus]++;
  }
  return counts;
}
