/* PHCIS | Consent — จัดการสิทธิ์การเข้าถึง (Figma 363:122327).
   Access-request registry: summary cards · tabs · status meta (tone + tab +
   which CTA is enabled) · row data. Local mock; UI copy is Thai. */

import { resolveConsentPatient } from '@/data/consentPatientDisplay';
import { ACCESS_TYPE_DISPLAY_LABEL } from '@/pages/consent/AccessRequestForm';
import { STAFF_AVATAR } from '@/pages/appointment/appointmentStaffAvatars';

/* Staff org scope — mirrors ConsentFormsPage Group Policy / สาขาย่อย / แผนก. */
const STAFF_ORG_POOL = [
  { group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'อายุรกรรม' },
  { group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'ผู้ป่วยนอก' },
  { group: 'เภสัชกร', subBranch: 'เภสัชกรคลินิก', dept: 'เภสัชกรรม' },
  { group: 'แพทย์', subBranch: 'ทันตแพทย์', dept: 'ทันตกรรม' },
  { group: 'พยาบาล', subBranch: 'พยาบาลเวชปฏิบัติ', dept: 'ผู้ป่วยใน' },
  { group: 'นักเทคนิคการแพทย์', subBranch: 'เทคนิคการแพทย์', dept: 'ห้องปฏิบัติการ' },
  { group: 'แพทย์', subBranch: 'แพทย์ทั่วไป', dept: 'เวชศาสตร์ฉุกเฉิน' },
  { group: 'พยาบาล', subBranch: 'ห้องฉุกเฉิน', dept: 'พยาบาลวิชาชีพ' },
  { group: 'แพทย์', subBranch: 'ศัลยแพทย์', dept: 'ศัลยกรรม' },
  { group: 'แพทย์', subBranch: 'กุมารแพทย์', dept: 'กุมารเวชกรรม' },
  { group: 'แพทย์', subBranch: 'สูตินรีแพทย์', dept: 'สูตินรีเวช' },
  { group: 'แพทย์', subBranch: 'ออร์โธปิดิกส์', dept: 'ออร์โธปิดิกส์' },
  { group: 'แพทย์', subBranch: 'โสต ศอ นาสิก', dept: 'หู คอ จมูก' },
  { group: 'แพทย์', subBranch: 'จักษุแพทย์', dept: 'จักษุวิทยา' },
  { group: 'แพทย์', subBranch: 'จิตแพทย์', dept: 'จิตเวช' },
  { group: 'นักเทคนิคการแพทย์', subBranch: 'รังสีเทคนิค', dept: 'รังสีวิทยา' },
  { group: 'พยาบาล', subBranch: 'พยาบาลวิสัญญี', dept: 'วิสัญญีวิทยา' },
  { group: 'เภสัชกร', subBranch: 'เภสัชกรโรงพยาบาล', dept: 'คลังยา' },
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

/* สัดส่วนสถานะ mock — ดู ACCESS_STATUS_PLAN ด้านล่าง (รวม 124 รายการ) */

const MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

/* Four header summary cards. info/positive use the statussummarycard token
   pair; danger/neutral override with explicit tile + ink (no token pair). */
const ACCESS_SUMMARY_META = [
  { key: 'pending',  icon: 'assignment',         color: 'info',     label: 'คำขอรอการอนุมัติ' },
  { key: 'active',   icon: 'verified_user',      color: 'positive', label: 'สิทธิ์ที่อนุมัติแล้วและ Active อยู่' },
  { key: 'rejected', icon: 'cancel',             label: 'ปฏิเสธ',  tileBg: 'var(--surface-danger-tertiary, #FEE2E2)',  iconInk: 'var(--text-danger-default, #B91C1C)' },
  { key: 'expired',  icon: 'hourglass_disabled', label: 'หมดอายุ', tileBg: 'var(--surface-neutral-tertiary, #F4F5F5)', iconInk: 'var(--text-neutral-default, #4D5358)' },
];

const fmtCount = (n) => Number(n || 0).toLocaleString('th-TH');

const isAccessDateThisMonth = (dateStr, now = new Date()) => {
  if (!dateStr || dateStr === '-') return false;
  const month = MONTHS[now.getMonth()];
  const year = now.getFullYear() + 543;
  return String(dateStr).includes(month) && String(dateStr).includes(String(year));
};

const isAccessDatePrevMonth = (dateStr, now = new Date()) => {
  if (!dateStr || dateStr === '-') return false;
  const prevMonthIdx = (now.getMonth() + 11) % 12;
  const prevMonth = MONTHS[prevMonthIdx];
  const year = now.getFullYear() + 543;
  const prevYear = prevMonthIdx === 11 ? year - 1 : year;
  return String(dateStr).includes(prevMonth) && String(dateStr).includes(String(prevYear));
};

const countAccessBucket = (rows, key) => {
  switch (key) {
    case 'pending':
      return rows.filter((r) => r.status === 'รออนุมัติ').length;
    case 'active':
      return rows.filter((r) => r.status === 'อนุมัติแล้ว' && r.active).length;
    case 'rejected':
      return rows.filter((r) => r.status === 'ปฏิเสธ').length;
    case 'expired':
      return rows.filter((r) => r.status === 'หมดอายุ').length;
    default:
      return 0;
  }
};

const pctOfTotal = (part, whole) => (
  whole > 0
    ? `${((part / whole) * 100).toFixed(1)}% ของทั้งหมด`
    : '0% ของทั้งหมด'
);

const monthOverMonthIndicator = (thisCount, prevCount) => {
  const delta = thisCount - prevCount;
  if (delta > 0) {
    return { indicator: `เพิ่มขึ้น ${delta} จากเดือนที่แล้ว`, indicatorIcon: 'trending_up' };
  }
  if (delta < 0) {
    return { indicator: `ลดลง ${Math.abs(delta)} จากเดือนที่แล้ว`, indicatorIcon: 'trending_down' };
  }
  return { indicator: 'เท่าเดิมจากเดือนที่แล้ว', indicatorIcon: null };
};

/** สรุป summary cards จาก rows ปัจจุบัน — บรรทัดที่ 2 เป็น MoM / % ของทั้งหมด */
export const buildAccessSummary = (rows = [], now = new Date()) => {
  const thisMonthRows = rows.filter((r) => isAccessDateThisMonth(r.createdDate, now));
  const prevMonthRows = rows.filter((r) => isAccessDatePrevMonth(r.createdDate, now));

  return ACCESS_SUMMARY_META.map((meta) => {
    const value = countAccessBucket(rows, meta.key);
    if (meta.key === 'pending') {
      const thisMo = countAccessBucket(thisMonthRows, meta.key);
      const prevMo = countAccessBucket(prevMonthRows, meta.key);
      return { ...meta, value: fmtCount(value), ...monthOverMonthIndicator(thisMo, prevMo) };
    }
    return {
      ...meta,
      value: fmtCount(value),
      indicator: pctOfTotal(value, rows.length),
      indicatorIcon: null,
    };
  });
};

/** Snapshot จาก mock เริ่มต้น — กำหนดหลัง ACCESS_RECORDS ด้านล่าง */
let ACCESS_SUMMARY = [];

/* Each status owns its own tab (Figma 363:120109): 4 status tabs + all last. */
export const ACCESS_TABS = [
  { value: 'pending',  label: 'รออนุมัติ',   icon: 'schedule' },
  { value: 'approved', label: 'อนุมัติแล้ว',  icon: 'how_to_reg' },
  { value: 'rejected', label: 'ปฏิเสธ',     icon: 'person_cancel' },
  /* ด.1.1.17.2 — สิทธิตามช่วงเวลา: หมดช่วงเวลาแล้วสถานะเป็น Inactive อัตโนมัติ */
  { value: 'expired',  label: 'หมดอายุ', icon: 'hourglass_disabled' },
  { value: 'all',      label: 'การขอเข้าถึงแบบฟอร์มทั้งหมด', icon: 'group' },
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

/** เวลาสร้างคำขอ — "HH:MM น." (24h, zero-padded). */
export const formatAccessCreatedTime = (time) => {
  if (!time || time === '-') return '';
  const raw = String(time).trim().replace(/\s*น\.?\s*$/, '');
  const m = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return raw.endsWith('น.') ? raw : `${raw} น.`;
  return `${String(m[1]).padStart(2, '0')}:${m[2]} น.`;
};

/* สัดส่วนสถานะ mock ให้ summary / แท็บดูสมจริง (รวม 124 รายการ) */
const ACCESS_STATUS_PLAN = [
  { status: 'รออนุมัติ', count: 18, momThis: 8, momPrev: 5 },
  { status: 'อนุมัติแล้ว', count: 58, activeCount: 52, momThis: 11, momPrev: 14 },
  { status: 'ปฏิเสธ', count: 11, momThis: 2, momPrev: 4 },
  { status: 'หมดอายุ', count: 37, momThis: 5, momPrev: 8 },
];

const ACCESS_STATUS_SEQUENCE = ACCESS_STATUS_PLAN.flatMap(({ status, count }) =>
  Array.from({ length: count }, () => status),
);

export const ACCESS_RECORDS = (() => {
  const thisMonthIdx = new Date().getMonth();
  const prevMonthIdx = (thisMonthIdx + 11) % 12;
  let globalIdx = 0;
  const bucketSlot = Object.fromEntries(ACCESS_STATUS_PLAN.map((p) => [p.status, 0]));

  return ACCESS_STATUS_SEQUENCE.map((status) => {
  const i = globalIdx++;
  const plan = ACCESS_STATUS_PLAN.find((p) => p.status === status);
  const slot = bucketSlot[status]++;
  const n = i + 1;
  const day = (n % 27) + 1;
  const month = slot < plan.momThis
    ? MONTHS[thisMonthIdx]
    : slot < plan.momThis + plan.momPrev
      ? MONTHS[prevMonthIdx]
      : MONTHS[i % MONTHS.length];
  const file = FILES[i % FILES.length];
  /* อนุมัติแล้ว: สลับช่วงเวลาที่ยังไม่หมด (Active) / ใกล้หมด — หมดอายุ: ช่วงในอดีต */
  const approved = status === 'อนุมัติแล้ว';
  const expired = status === 'หมดอายุ';
  const periodStart = approved ? isoShift(-10 - (i % 5)) : expired ? isoShift(-40) : null;
  const periodEnd = approved ? isoShift(3 + (i % 4) * 9) : expired ? isoShift(-3 - (i % 4)) : null;
  const formOnly = i % 4 === 0;
  const hn = formOnly ? '-' : `67-${String(1 + n).padStart(5, '0')}`;
  const patient = formOnly ? null : resolveConsentPatient(hn);
  /* stride 5 — เดือนเดียวกันได้หลายกลุ่มวิชาชีพ (pie ไม่พังตอน filter รายเดือน) */
  const org = accessOrgOfIndex(i * 5);
  const active = approved && slot < (plan.activeCount ?? plan.count);
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
    createdTime: `${String((i % 9) + 1).padStart(2, '0')}:00 น.`,
    hn,
    patientName: patient?.name || '',
    purpose: PURPOSES[i % PURPOSES.length],
    reason: REASONS[i % REASONS.length],
    accessType: formOnly ? 'form' : 'patient_consent',
    accessTypeLabel: formOnly
      ? ACCESS_TYPE_DISPLAY_LABEL.form
      : ACCESS_TYPE_DISPLAY_LABEL.patient_consent,
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
    active,
    audit: approved
      ? { by: 'ลดา ดีงาม', at: `${day} ${month} 2569 · 10:2${i % 10}` }
      : null,
  };
  });
})();

ACCESS_SUMMARY = buildAccessSummary(ACCESS_RECORDS);
export { ACCESS_SUMMARY };

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
    createdTime: formatAccessCreatedTime(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })),
    /* คำขอแบบฟอร์มอาจผูกกับผู้รับบริการเฉพาะรายได้ — อย่าทิ้ง HN/ชื่อจากเมนูคำขอ */
    hn: payload.hn || payload.patientHn || '-',
    patientName: payload.patientName || payload.patient?.name || '',
    purpose: payload.purpose || '-',
    reason: payload.reason || '-',
    note: payload.note || '',
    accessType,
    accessTypeLabel: payload.accessTypeLabel
      || ACCESS_TYPE_DISPLAY_LABEL[accessType]
      || accessType,
    formId: payload.formId || '',
    formCode: payload.formCode || '',
    formName: payload.formName || '',
    requestedPeriodStart: payload.requestedPeriodStart || '',
    requestedPeriodEnd: payload.requestedPeriodEnd || '',
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
