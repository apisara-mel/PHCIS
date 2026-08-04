/* PHCIS | Consent — จัดการสิทธิ์การเข้าถึง (Figma 363:122327).
   Access-request registry: summary cards · tabs · status meta (tone + tab +
   which CTA is enabled) · row data. Local mock; UI copy is Thai. */

import { resolveConsentPatient } from '@/data/consentPatientDisplay';
import { STAFF_AVATAR } from '@/pages/appointment/appointmentStaffAvatars';

/* Staff org scope — mirrors ConsentFormsPage Group Policy / สาขาย่อย / แผนก. */
const STAFF_ORG_POOL = [
  { group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'อายุรกรรม' },
  { group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'ผู้ป่วยนอก' },
  { group: 'เภสัชกร', subBranch: 'เภสัชกรคลินิก', dept: 'เภสัชกรรม' },
  { group: 'แพทย์', subBranch: 'ทันตแพทย์', dept: 'ทันตกรรม' },
  { group: 'พยาบาล', subBranch: 'พยาบาลเวชปฏิบัติ', dept: 'ผู้ป่วยใน' },
  { group: 'นักเทคนิคการแพทย์', subBranch: 'เทคนิคการแพทย์', dept: 'ห้องปฏิบัติการ' },
  { group: 'แพทย์', subBranch: 'แพทย์ทั่วไป', dept: 'ผู้ป่วยนอก' },
  { group: 'พยาบาล', subBranch: 'ห้องฉุกเฉิน', dept: 'พยาบาลวิชาชีพ' },
];

/** Profile photo keyed to Group Policy (staff portrait pool). */
export const accessAvatarForGroup = (group, seed = 0) => {
  const flip = seed % 2 === 0;
  switch (group) {
    case 'แพทย์':
      return flip ? STAFF_AVATAR.doctorGeneral : STAFF_AVATAR.doctorDental;
    case 'พยาบาล':
      return flip ? STAFF_AVATAR.nurseOpd : STAFF_AVATAR.nurseRecords;
    case 'เภสัชกร':
      return flip ? STAFF_AVATAR.registrarSenior : STAFF_AVATAR.registrar;
    case 'นักเทคนิคการแพทย์':
      return STAFF_AVATAR.admin;
    default:
      return STAFF_AVATAR.reception;
  }
};

export const accessOrgOfIndex = (i) => STAFF_ORG_POOL[i % STAFF_ORG_POOL.length];

/* 32 รายการต่อแท็บสถานะ (รออนุมัติ / อนุมัติแล้ว / ปฏิเสธ / หมดอายุ) */
const PER_TAB = 32;
const TAB_STATUSES = ['รออนุมัติ', 'อนุมัติแล้ว', 'ปฏิเสธ', 'หมดอายุ'];

/* Four header summary cards. info/positive use the statussummarycard token
   pair; danger/neutral override with explicit tile + ink (no token pair). */
export const ACCESS_SUMMARY = [
  { key: 'pending',  icon: 'assignment',         color: 'info',     value: String(PER_TAB), label: 'คำขอรอการอนุมัติ' },
  { key: 'active',   icon: 'verified_user',      color: 'positive', value: String(PER_TAB), label: 'สิทธิ์ที่อนุมัติแล้วและ Active อยู่' },
  { key: 'rejected', icon: 'cancel',             value: String(PER_TAB), label: 'ปฏิเสธ',  tileBg: 'var(--surface-danger-tertiary, #FEE2E2)',  iconInk: 'var(--text-danger-default, #B91C1C)' },
  { key: 'expired',  icon: 'hourglass_disabled', value: String(PER_TAB), label: 'หมดอายุ', tileBg: 'var(--surface-neutral-tertiary, #F4F5F5)', iconInk: 'var(--text-neutral-default, #4D5358)' },
];

/* Each status owns its own tab (Figma 363:120109): 4 status tabs + all last. */
export const ACCESS_TABS = [
  { value: 'pending',  label: 'รออนุมัติ',   icon: 'schedule' },
  { value: 'approved', label: 'อนุมัติแล้ว',  icon: 'how_to_reg' },
  { value: 'rejected', label: 'ปฏิเสธ',     icon: 'person_cancel' },
  /* ด.1.1.17.2 — สิทธิตามช่วงเวลา: หมดช่วงเวลาแล้วสถานะเป็น Inactive อัตโนมัติ */
  { value: 'expired',  label: 'หมดอายุ', icon: 'hourglass_disabled' },
  { value: 'all',      label: 'สิทธิ์การเข้าถึงแบบฟอร์มทั้งหมด', icon: 'group' },
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
const REASONS = [
  'ต้องใช้แบบฟอร์มในการให้บริการ',
  'ตรวจสอบสถานะความยินยอมก่อนให้บริการ',
  'ส่งต่อ / ประสานงานกับหน่วยงานอื่น',
  'งานวิจัย / ตรวจสอบคุณภาพ',
  'แก้ไขหรืออัปเดตข้อมูลความยินยอม',
];
const FILES = [
  ['consent.pdf', '15 KB'], ['request-access.pdf', '22 KB'],
  ['medical-record.pdf', '48 KB'], ['referral.pdf', '12 KB'],
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

export const ACCESS_RECORDS = Array.from({ length: PER_TAB * TAB_STATUSES.length }, (_, i) => {
  const n = i + 1;
  const day = (n % 27) + 1;
  const month = MONTHS[i % MONTHS.length];
  const file = FILES[i % FILES.length];
  const status = TAB_STATUSES[Math.floor(i / PER_TAB)];
  /* อนุมัติแล้ว: สลับช่วงเวลาที่ยังไม่หมด (Active) / ใกล้หมด — หมดอายุ: ช่วงในอดีต */
  const approved = status === 'อนุมัติแล้ว';
  const expired = status === 'หมดอายุ';
  const periodStart = approved ? isoShift(-10 - (i % 5)) : expired ? isoShift(-40) : null;
  const periodEnd = approved ? isoShift(3 + (i % 4) * 9) : expired ? isoShift(-3 - (i % 4)) : null;
  const formOnly = i % 4 === 0;
  const hn = formOnly ? '-' : `67-${String(1 + n).padStart(5, '0')}`;
  const patient = formOnly ? null : resolveConsentPatient(hn);
  const org = accessOrgOfIndex(i);
  return {
    id: n,
    reqNo: `REQ-2569-${String(40 + n).padStart(4, '0')}`,
    name: NAMES[i % NAMES.length],
    empCode: `EMP-${String(100 + n).padStart(4, '0')}`,
    group: org.group,
    subBranch: org.subBranch,
    dept: org.dept,
    avatarSrc: accessAvatarForGroup(org.group, i),
    createdDate: `${day} ${month} 2569`,
    createdTime: `0${(i % 9) + 1}:00`,
    hn,
    patientName: patient?.name || '',
    purpose: PURPOSES[i % PURPOSES.length],
    reason: REASONS[i % REASONS.length],
    accessType: formOnly ? 'form' : 'patient_consent',
    accessTypeLabel: formOnly
      ? 'ขอเข้าถึงแบบฟอร์มความยินยอม'
      : 'ขอเข้าถึงข้อมูลความยินยอมของผู้รับบริการ',
    formCode: `PH-${String((i % 12) + 1).padStart(3, '0')}`,
    formName: formOnly
      ? 'ใบยินยอมการรักษาทั่วไป'
      : 'ใบยินยอมการใช้ข้อมูลส่วนบุคคล (PDPA)',
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

/** Display label for HN column / detail rows */
export const accessPatientLabel = (row) => {
  if (!row?.hn || row.hn === '-') return '-';
  if (row.patientName) return `${row.patientName} · HN ${row.hn}`;
  return `HN ${row.hn}`;
};

/* Session imports from แบบฟอร์มความยินยอม → ขอสิทธิ์ (ด.1.1.17.1).
   AccessManagementPage consumes on mount so the worklist stays in sync. */
let SESSION_ACCESS_IMPORTS = [];

export const enqueueAccessImport = (payload) => {
  const id = Date.now();
  const accessType = payload.accessType || 'patient_consent';
  const org = payload.group
    ? { group: payload.group, subBranch: payload.subBranch || '-', dept: payload.dept || '-' }
    : accessOrgOfIndex(id);
  const rec = {
    id,
    reqNo: `REQ-2569-${String((id % 9000) + 1000).padStart(4, '0')}`,
    name: payload.name || '-',
    empCode: payload.empCode || '-',
    unit: payload.unit || '-',
    group: org.group,
    subBranch: org.subBranch,
    dept: org.dept,
    avatarSrc: payload.avatarSrc || accessAvatarForGroup(org.group, id),
    createdDate: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }),
    createdTime: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    hn: accessType === 'form' ? '-' : (payload.hn || '-'),
    patientName: accessType === 'form' ? '' : (payload.patientName || ''),
    purpose: payload.purpose || '-',
    reason: payload.reason || '-',
    accessType,
    accessTypeLabel: payload.accessTypeLabel
      || (accessType === 'form' ? 'ขอเข้าถึงแบบฟอร์มความยินยอม' : 'ขอเข้าถึงข้อมูลความยินยอมของผู้รับบริการ'),
    formId: payload.formId || '',
    formCode: payload.formCode || '',
    formName: payload.formName || '',
    /* Data-category scopes from the request form (not org Group Policy). */
    scopes: payload.scopes || [],
    period: '-',
    periodDays: '-',
    file: payload.fileName || 'scanned-form.pdf',
    fileSize: '1.2 MB',
    status: 'รออนุมัติ',
    periodStart: null,
    periodEnd: null,
    active: false,
    audit: { by: 'ลดา ดีงาม', at: new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' }) },
  };
  SESSION_ACCESS_IMPORTS = [...SESSION_ACCESS_IMPORTS, rec];
  return rec;
};

export const consumeAccessImports = () => {
  const pending = SESSION_ACCESS_IMPORTS;
  SESSION_ACCESS_IMPORTS = [];
  return pending;
};
