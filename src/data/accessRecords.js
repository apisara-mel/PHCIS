/* PHCIS | Consent — จัดการสิทธิ์การเข้าถึง (Figma 363:122327).
   Access-request registry: summary cards · tabs · status meta (tone + tab +
   which CTA is enabled) · row data. Local mock; UI copy is Thai. */

/* Four header summary cards. info/positive use the statussummarycard token
   pair; danger/neutral override with explicit tile + ink (no token pair). */
export const ACCESS_SUMMARY = [
  { key: 'pending',  icon: 'assignment',         color: 'info',     value: '255', label: 'คำขอรอการอนุมัติ' },
  { key: 'active',   icon: 'verified_user',      color: 'positive', value: '42',  label: 'สิทธิ์ที่อนุมัติแล้วและ Active อยู่' },
  { key: 'rejected', icon: 'cancel',             value: '6',  label: 'ปฏิเสธ',  tileBg: 'var(--surface-danger-tertiary, #FEE2E2)',  iconInk: 'var(--text-danger-default, #B91C1C)' },
  { key: 'expired',  icon: 'hourglass_disabled', value: '10', label: 'หมดอายุ', tileBg: 'var(--surface-neutral-tertiary, #F4F5F5)', iconInk: 'var(--text-neutral-default, #4D5358)' },
];

/* Each status owns its own tab (Figma 363:120109): ทั้งหมด + 4 status tabs. */
export const ACCESS_TABS = [
  { value: 'all',      label: 'ทั้งหมด',    icon: 'group' },
  { value: 'pending',  label: 'รออนุมัติ',   icon: 'schedule' },
  { value: 'approved', label: 'อนุมัติแล้ว',  icon: 'how_to_reg' },
  { value: 'rejected', label: 'ปฏิเสธ',     icon: 'person_cancel' },
  /* ด.1.1.17.2 — สิทธิตามช่วงเวลา: หมดช่วงเวลาแล้วสถานะเป็น Inactive อัตโนมัติ */
  { value: 'expired',  label: 'หมดช่วงเวลา', icon: 'hourglass_disabled' },
];

/* tone = ColorfulBadge style · tab = which tab it falls under · canApprove /
   canReject = whether the ✓ / ✗ action button is enabled for that status
   (Figma: pending=both, approved=neither action, rejected=approve only,
   expired=neither → buttons hidden). */
export const ACCESS_STATUS = {
  'รออนุมัติ':   { tone: 'orange', tab: 'pending',  canApprove: true,  canReject: true },
  'อนุมัติแล้ว': { tone: 'green',  tab: 'approved', canApprove: false, canReject: false },
  'ปฏิเสธ':      { tone: 'red',    tab: 'rejected', canApprove: true,  canReject: false },
  'หมดอายุ':     { tone: 'grey',   tab: 'expired',  canApprove: false, canReject: false },
};

const NAMES = [
  'สมชาย มั่นใจดี', 'สุดารัตน์ ใจงาม', 'ธนวัฒน์ ศรีสุข', 'พิมพ์ชนก ทองดี',
  'อนุชา รักษาวงศ์', 'กมลวรรณ พูนสุข', 'ณัฐพล วงศ์ใหญ่', 'ปวีณา แสงทอง',
  'จิรายุ ตันติกุล', 'รัตนา ผ่องใส', 'วีรภัทร คงทน', 'ศิริพร บุญมา',
];
const PURPOSES = [
  'การรักษาพยาบาล', 'การส่งต่อผู้ป่วย', 'การวิจัยทางการแพทย์',
  'การเบิกจ่ายค่ารักษา', 'การตรวจสอบคุณภาพ', 'การติดตามอาการ',
];
const FILES = [
  ['consent.pdf', '15 KB'], ['request-access.pdf', '22 KB'],
  ['medical-record.pdf', '48 KB'], ['referral.pdf', '12 KB'],
];
const STAT = [
  'รออนุมัติ', 'รออนุมัติ', 'รออนุมัติ', 'รออนุมัติ',
  'อนุมัติแล้ว', 'อนุมัติแล้ว', 'อนุมัติแล้ว', 'อนุมัติแล้ว',
  'ปฏิเสธ', 'ปฏิเสธ', 'หมดอายุ', 'หมดอายุ',
];
const MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน'];

/* ── ช่วงเวลาสิทธิ (ด.1.1.17.2) ────────────────────────────────────────
   periodStart / periodEnd เป็น ISO เทียบกับ "วันนี้" จริง เพื่อให้เห็นทั้ง
   สิทธิที่ยัง Active (วันคงเหลือ > 0) และสิทธิที่หมดช่วงเวลาแล้ว. */
const DAY_MS = 86400000;
const isoShift = (days) => new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);
export const thaiDateOfIso = (iso) => {
  if (!iso) return '-';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
};
export const daysLeftOfIso = (iso) => {
  if (!iso) return null;
  const end = new Date(`${iso}T23:59:59`).getTime();
  return Math.ceil((end - Date.now()) / DAY_MS);
};

export const ACCESS_RECORDS = Array.from({ length: 24 }, (_, i) => {
  const n = i + 1;
  const day = (n % 27) + 1;
  const month = MONTHS[i % MONTHS.length];
  const file = FILES[i % FILES.length];
  const status = STAT[i % STAT.length];
  /* อนุมัติแล้ว: สลับช่วงเวลาที่ยังไม่หมด (Active) / ใกล้หมด — หมดอายุ: ช่วงในอดีต */
  const approved = status === 'อนุมัติแล้ว';
  const expired = status === 'หมดอายุ';
  const periodStart = approved ? isoShift(-10 - (i % 5)) : expired ? isoShift(-40) : null;
  const periodEnd = approved ? isoShift(3 + (i % 4) * 9) : expired ? isoShift(-3 - (i % 4)) : null;
  return {
    id: n,
    reqNo: `REQ-2569-${String(40 + n).padStart(4, '0')}`,
    name: NAMES[i % NAMES.length],
    empCode: `EMP-${String(100 + n).padStart(4, '0')}`,
    createdDate: `${day} ${month} 2569`,
    createdTime: `0${(i % 9) + 1}:00`,
    hn: `67-${String(1 + n).padStart(5, '0')}`,
    purpose: PURPOSES[i % PURPOSES.length],
    period: `${day}-${Math.min(day + 10, 28)} ${month} 2569`,
    periodDays: `${(i % 3) * 5 + 5} วัน`,
    file: file[0],
    fileSize: file[1],
    status,
    /* ด.1.1.17.2 + 17.3 */
    periodStart,
    periodEnd,
    active: approved,
    audit: approved
      ? { by: 'ลดา ดีงาม', at: `${day} ${month} 2569 · 10:2${i % 10}` }
      : null,
  };
});
