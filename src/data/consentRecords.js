/* Consent Management mock data — Figma "PHCIS | Consent" (node 1:4).
   Drives the consent registry table, summary cards, tabs, and the
   per-status action column (annotation: "แต่ละ Status, CTA ใน Column
   การดำเนินการจะต่างกัน").

   No API — all values are local mock rows. UI copy is Thai. */

import {
  DEFAULT_SERVICE_CENTER_CHANNEL,
  MOBILE_APP_CHANNEL,
  consentSignChannelOfIndex,
} from '@/data/consentChannels';
import { resolveConsentFormForWorklistType } from '@/data/consentFormRecords';

/* ── Consent type → ColorfulBadge tone (Figma type pills) ───────────── */
export const CONSENT_TYPE_TONE = {
  'PDPA':     'indigo',
  'เบิกจ่าย': 'magenta',
};

/* ── Status meta — badge tone + which tab it belongs under + the action
   CTA shown in the "การดำเนินการ" column for that status. ──────────── */
export const CONSENT_STATUS = {
  'รอลงนาม':          { tone: 'orange', tab: 'sent',      action: { label: 'ยกเลิกคำขอ', kind: 'brandSubdue', confirm: 'cancel' } },
  'อยู่ระหว่างลงนาม':  { tone: 'orange', tab: 'sent',      action: { label: 'ยกเลิกคำขอ', kind: 'brandSubdue', confirm: 'cancel' } },
  /* ผู้รับบริการ request เพิกถอนผ่าน Mobile App / ที่ศูนย์ — รอเจ้าหน้าที่ดำเนินการ */
  'ขอเพิกถอน':        { tone: 'red',    tab: 'pending',   action: { label: 'เพิกถอน', kind: 'brand', confirm: 'revoke' } },
  'ยินยอมแล้ว':        { tone: 'green',  tab: 'consented', action: { label: 'เพิกถอน',    kind: 'brandSubdue', confirm: 'revoke' } },
  'ปฏิเสธ':           { tone: 'grey',   tab: 'rejected',  action: { label: 'Reconsent',  kind: 'brand', confirm: 'reconsent' } },
  'ถอนความยินยอม':    { tone: 'red',    tab: 'rejected',  action: { label: 'Reconsent',  kind: 'brand', confirm: 'reconsent' } },
  'ใกล้หมดอายุ':       { tone: 'yellow', tab: 'expiring',  action: { label: 'Reconsent',  kind: 'brand', confirm: 'reconsent' } },
  'หมดอายุ':          { tone: 'red',    tab: 'expired',   action: { label: 'Reconsent',  kind: 'brand', confirm: 'reconsent' } },
  /* Edge case (Figma note 312:97428): เทมเพลตออกเวอร์ชันใหม่ — ฉบับเดิมถูกแทนที่
     (read-only) · ระบบสร้างคำขอ รอลงนาม อัตโนมัติไปเวชระเบียน */
  'ถูกแทนที่ด้วยเวอร์ชันใหม่': {
    tone: 'blue',
    tab: 'consented',
    label: 'ถูกแทนที่',
    action: null,
  },
  /* legacy localStorage — map ไปพฤติกรรม superseded ใหม่ */
  'มีเวอร์ชันใหม่': {
    tone: 'blue',
    tab: 'consented',
    label: 'ถูกแทนที่',
    action: null,
  },
  /* ด.1.1.7 — Re-Consent ครบวงจร: record เดิมที่มีคำขอ reconsent เกิดขึ้นแล้ว
     ย้ายมาสถานะนี้ (ไม่ hard delete — ประวัติคงอยู่)
     แสดง badge เป็น «หมดอายุ» และยังมี CTA Reconsent เหมือนแถวหมดอายุอื่น */
  'หมดอายุ-Reconsent': {
    tone: 'red',
    tab: 'expired',
    label: 'หมดอายุ',
    action: { label: 'Reconsent', kind: 'brand', confirm: 'reconsent' },
  },
  /* ด.1.1.4 — เจ้าหน้าที่ยกเลิกคำขอที่ยังไม่ลงนาม (audit คงอยู่) */
  'ยกเลิกคำขอ':        { tone: 'grey',   tab: 'rejected',  action: { label: 'Reconsent', kind: 'brand', confirm: 'reconsent' } },
};

/* ── ช่องทางลงนาม (ด.1.1.6) — re-export จาก consentChannels.js ─────────── */
export {
  CONSENT_CHANNEL_OPTIONS,
  DEFAULT_SERVICE_CENTER_CHANNEL,
  MOBILE_APP_CHANNEL,
  formatServiceCenterChannel,
  getConsentChannelOptions,
  SERVICE_CENTER_CHANNEL_POOL,
  consentSignChannelOfIndex,
} from '@/data/consentChannels';

/* ── Tabs (Figma TabUnderline) ──────────────────────────────────────── */
/** ช่องทาง/ผู้สร้างเมื่อระบบส่งคำขอ reconsent อัตโนมัติไปเวชระเบียน */
export const AUTO_MR_REQUEST_CHANNEL = 'เวชระเบียน';
export const AUTO_SYSTEM_REQUESTER = 'ระบบ';

export const CONSENT_TABS = [
  { value: 'pending',   label: 'รอดำเนินการ',      icon: 'pending_actions' },
  { value: 'sent',      label: 'รอลงนาม',           icon: 'draw' },
  { value: 'consented', label: 'ยินยอมแล้ว',        icon: 'verified' },
  { value: 'rejected',  label: 'ปฏิเสธ / เพิกถอน',  icon: 'do_not_disturb_on' },
  { value: 'expiring',  label: 'ใกล้หมดอายุ',       icon: 'hourglass_top' },
  { value: 'expired',   label: 'หมดอายุ',           icon: 'hourglass_disabled' },
  { value: 'all',       label: 'ความยินยอมทั้งหมด',  icon: 'list' },
];

/** แท็บรอดำเนินการ — ไม่รวมใกล้หมดอายุ / หมดอายุ (มีแท็บแยก) */
export const PENDING_EXPIRY_WINDOW_DAYS = 30;

export const EXPIRED_CONSENT_STATUSES = ['หมดอายุ', 'หมดอายุ-Reconsent'];

export const isConsentExpiringWithinDays = (record, withinDays = PENDING_EXPIRY_WINDOW_DAYS) => {
  if (!record) return false;
  if (record.status === 'ใกล้หมดอายุ') return true;
  if (record.expiresInDays == null) return false;
  return record.expiresInDays <= withinDays;
};

export const isConsentExpired = (record) => EXPIRED_CONSENT_STATUSES.includes(record?.status);

/** อยู่ในแท็บรอดำเนินการ — เฉพาะงานที่เจ้าหน้าที่ต้องดำเนินการ (ไม่รวม รอลงนาม / ใกล้หมดอายุ / หมดอายุ) */
export const isConsentPendingWorklist = (record) =>
  (CONSENT_STATUS[record?.status] || {}).tab === 'pending';

export const matchesConsentWorklistTab = (record, tab) => {
  if (tab === 'all') return true;
  if (tab === 'pending') return isConsentPendingWorklist(record);
  return (CONSENT_STATUS[record?.status] || {}).tab === tab;
};

/* ── Confirm-dialog copy per action kind (AlertDialog) ──────────────── */
export const CONSENT_CONFIRM = {
  cancel:    { type: 'destructive', title: 'ยืนยันการยกเลิกคำขอ',     description: 'คุณต้องการยกเลิกคำขอความยินยอมนี้',          confirmLabel: 'ยืนยัน' },
  revoke:    { type: 'destructive', title: 'ยืนยันการเพิกถอนความยินยอม', description: 'การเพิกถอนจะมีผลทันที และต้องขอความยินยอมใหม่หากต้องใช้อีกครั้ง', confirmLabel: 'เพิกถอน' },
  reconsent: { type: 'info',        title: 'ส่งคำขอความยินยอมใหม่',     description: 'ระบบจะสร้างคำขอความยินยอมฉบับใหม่และแจ้งผู้ป่วยให้ลงนามอีกครั้ง', confirmLabel: 'ส่งคำขอ' },
};

const CONSENT_TYPES = ['PDPA', 'เบิกจ่าย'];
export { CONSENT_TYPES };
const REQUESTERS = ['ลดา ดีงาม', 'นที ทองคำ'];
const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

/** เดือน/ปีปัจจุบันตามปฏิทินไทย (พ.ศ.) — summary นับเฉพาะเดือนนี้ */
export const getConsentCalendarNow = (now = new Date()) => ({
  month: THAI_MONTHS_FULL[now.getMonth()],
  year: now.getFullYear() + 543,
});

/** วันที่ไทย เช่น "6 พฤษภาคม 2569" อยู่ในเดือนปัจจุบันหรือไม่ */
export const isConsentDateThisMonth = (dateStr, now = new Date()) => {
  if (!dateStr || dateStr === '-') return false;
  const { month, year } = getConsentCalendarNow(now);
  return String(dateStr).includes(month) && String(dateStr).includes(String(year));
};

/** 36 รายการต่อแท็บ (>32) — pagination demo ที่ PAGE_SIZE 20 */
const PER_TAB_COUNT = 36;

const TAB_STATUS_POOLS = {
  pending:   ['ขอเพิกถอน'],
  sent:      ['รอลงนาม', 'อยู่ระหว่างลงนาม'],
  consented: ['ยินยอมแล้ว'],
  rejected:  ['ปฏิเสธ', 'ถอนความยินยอม', 'ยกเลิกคำขอ'],
  expiring:  ['ใกล้หมดอายุ'],
  expired:   ['หมดอายุ', 'หมดอายุ-Reconsent'],
};

/** สัดส่วนสถานะ mock ให้ summary / แท็บดูสมจริง (รวม 216 รายการ) */
const CONSENT_TAB_WEIGHTS = [
  { pool: TAB_STATUS_POOLS.consented, count: 98 },
  { pool: TAB_STATUS_POOLS.sent, count: 42 },
  { pool: TAB_STATUS_POOLS.pending, count: 28 },
  { pool: TAB_STATUS_POOLS.expiring, count: 18 },
  { pool: TAB_STATUS_POOLS.rejected, count: 19 },
  { pool: TAB_STATUS_POOLS.expired, count: 11 },
];

/** สถานะเรียงตามแท็บ — สัดส่วนจาก CONSENT_TAB_WEIGHTS */
const MOCK_STATUS_ROTATION = CONSENT_TAB_WEIGHTS.flatMap(({ pool, count }) =>
  Array.from({ length: count }, (_, i) => pool[i % pool.length]),
);

/** HN + seed name — aligned with MR / screening roster (enriched again at render).
    Exported for consent access-request patient picker (searchable Select). */
export const MOCK_PATIENTS = [
  { hn: '67-00001', name: 'สมชาย มั่นใจดี' },
  { hn: '67-00002', name: 'สมหญิง มีสุข' },
  { hn: '67-00003', name: 'วีระ ดีงาม' },
  { hn: '67-00004', name: 'ทักษพร ขำใจ' },
  { hn: '67-00005', name: 'สุวัฒน์ จิรพัฒนกุล' },
  { hn: '67-00006', name: 'ปรียา สุพรรณ' },
  { hn: '67-00007', name: 'ธนาพล วศ์กุล' },
  { hn: '67-00008', name: 'มาลีรัตน์ ธนาวัตน' },
  { hn: '67-00009', name: 'น้ำใส โพธิ์' },
  { hn: '67-00010', name: 'นภา มนตรา' },
  { hn: '67-00011', name: 'อรอุมา ดวงสว่าง' },
  { hn: '67-00012', name: 'วิชัย รุ่งเรือง' },
  { hn: '67-00013', name: 'พิมพ์ใจ จันทรา' },
  { hn: '67-00014', name: 'ชัยวัฒน์ ก้องเกียรติ' },
  { hn: '67-00015', name: 'รัตนาภรณ์ ใสสะอาด' },
  { hn: '67-00016', name: 'ปกรณ์ บุญพิทักษ์' },
  { hn: '67-00017', name: 'ภัคจิรา วงศ์อนันต์' },
  { hn: '67-00018', name: 'ด.ญ.ณิชา วงศ์สว่าง' },
  { hn: '67-00019', name: 'นันทิดา พรเลิศ' },
  { hn: '67-00020', name: 'กฤษดา ผ่องใส' },
  { hn: '67-00021', name: 'วรรณภา ทองดี' },
  { hn: '67-00022', name: 'อนุชา สมบูรณ์ทรัพย์' },
  { hn: '67-00023', name: 'ภัทรานิษฐ์ บูรณะ' },
  { hn: '67-00024', name: 'เอกชัย พิทยาคม' },
  { hn: '67-00025', name: 'ภาสกร ชาญฉลาด' },
  { hn: '67-00027', name: 'จิราพร มณีโชติ' },
  { hn: '67-00029', name: 'อาทิตยา บุญเรือง' },
  { hn: '67-00030', name: 'กมลชนก อรุณรุ่ง' },
  { hn: '67-00031', name: 'ธีรพงศ์ สุขสำราญ' },
  { hn: '67-00032', name: 'ศิริพร แก้วมณี' },
  { hn: '67-00033', name: 'พงศ์พัฒน์ เรืองรอง' },
  { hn: '67-00034', name: 'อลิสา จันทร์เพ็ญ' },
];

/* ช่องทางลงนาม — เฉพาะ Mobile App หรือที่ศูนย์บริการ (ไม่มี "-") */
const signChannelForStatus = (_status, id) => consentSignChannelOfIndex(id);

const buildConsentMockRecords = () => {
  const { month: thisMonth, year: thisYear } = getConsentCalendarNow();
  /* เดือนก่อนหน้า + ปีก่อน — ให้ยอดทั้งระบบ > ยอดเดือนนี้ใน summary */
  const prevMonthIdx = (new Date().getMonth() + 11) % 12;
  const prevMonth = THAI_MONTHS_FULL[prevMonthIdx];
  const prevYear = prevMonthIdx === 11 ? thisYear - 1 : thisYear;

  return MOCK_STATUS_ROTATION.map((status, index) => {
  const id = index + 1;
  const patient = MOCK_PATIENTS[index % MOCK_PATIENTS.length];
  const type = CONSENT_TYPES[index % CONSENT_TYPES.length];
  const day = (index % 27) + 1;
  /* ~2 ใน 3 เป็นเดือนนี้ — สลับตาม (type + cycle) เพื่อไม่ให้บางประเภทหายจากเดือนนี้ */
  const typeIdx = index % CONSENT_TYPES.length;
  const cycle = Math.floor(index / CONSENT_TYPES.length);
  const inThisMonth = (typeIdx + cycle) % 3 !== 0;
  const month = inThisMonth ? thisMonth : prevMonth;
  const year = inThisMonth ? thisYear : (index % 6 === 0 ? thisYear - 1 : prevYear);
  const createdDate = `${day} ${month} ${year}`;
  const signed = [
    'ยินยอมแล้ว', 'ใกล้หมดอายุ', 'หมดอายุ', 'ถูกแทนที่ด้วยเวอร์ชันใหม่',
    'มีเวอร์ชันใหม่', 'หมดอายุ-Reconsent', 'ถอนความยินยอม', 'ปฏิเสธ',
  ].includes(status);
  const onRejectedTab = ['ถอนความยินยอม', 'ปฏิเสธ', 'ยกเลิกคำขอ'].includes(status);
  const signedDate = signed ? `${Math.min(day + 1, 28)} ${month} ${year}` : '-';
  /* แท็บปฏิเสธ/เพิกถอน — mock วันที่ถอนครบทุกแถว (รวมปฏิเสธ · ยกเลิกคำขอ) */
  const withdrawnDate = onRejectedTab
    ? `${Math.min(day + 3 + (index % 5), 28)} ${month} ${year}`
    : '-';
  const signChannel = signChannelForStatus(status, id);
  const { formCode, formName } = resolveConsentFormForWorklistType(type);
  /* ชื่อซ้ำได้เมื่อคนละคำขอ — ไม่ต่อท้าย (2) / ไม่สร้าง HN ปลอม */
  const { hn, name } = patient;

  const record = {
    id,
    hn,
    name,
    type,
    formCode,
    formName,
    version: type === 'การวิจัย' ? 'V 2.1' : `V 1.${index % 3}`,
    status,
    signChannel,
    requester: REQUESTERS[index % REQUESTERS.length],
    createdDate,
    signedDate,
    withdrawnDate,
    history: [],
  };

  if (status === 'ถอนความยินยอม') {
    /* ลงนามก่อนแล้วถอนภายหลัง */
    const signDay = Math.min(day + 1, 26);
    const withdrawDay = Math.min(signDay + 2 + (index % 5), 28);
    record.signedDate = `${signDay} ${month} ${year}`;
    record.withdrawnDate = `${withdrawDay} ${month} ${year}`;
  }
  if (status === 'ปฏิเสธ') {
    record.signedDate = `${Math.min(day + 1, 28)} ${month} ${year}`;
  }
  if (status === 'ยกเลิกคำขอ') {
    /* ยังไม่ลงนาม — ใช้วันที่ยกเลิกในคอลัมน์วันที่ถอนเพื่อ mock ครบแถว */
    record.signedDate = '-';
  }
  if (status === 'ใกล้หมดอายุ') {
    record.expiresInDays = 7 + (index % 21);
    /* ใกล้หมดอายุ — ลงนามปีก่อน แต่ยังนับใน worklist; ถ้าอยากให้อยู่ summary เดือนนี้ให้ created เป็นเดือนนี้ */
    if (inThisMonth) {
      record.createdDate = `${day} ${thisMonth} ${thisYear}`;
      record.signedDate = `${Math.min(day + 1, 28)} ${prevMonth} ${prevYear}`;
    } else {
      record.createdDate = `${day} ${prevMonth} ${thisYear - 1}`;
      record.signedDate = `${Math.min(day + 1, 28)} ${prevMonth} ${thisYear - 1}`;
    }
  }
  if (status === 'หมดอายุ' || status === 'หมดอายุ-Reconsent') {
    if (inThisMonth) {
      record.createdDate = `${day} ${thisMonth} ${thisYear}`;
      record.signedDate = `${Math.min(day + 1, 28)} ${prevMonth} ${prevYear}`;
    } else {
      record.createdDate = `${day} ${prevMonth} ${thisYear - 1}`;
      record.signedDate = `${Math.min(day + 1, 28)} ${prevMonth} ${thisYear - 1}`;
    }
  }
  if (status === 'หมดอายุ-Reconsent') {
    record.pendingReconsent = true;
  }
  if (status === 'รอลงนาม' && id % 2 === 0) {
    record.dueDate = `${Math.min(day + 14, 28)} ${month} ${year}`;
  }
  if (status === 'ขอเพิกถอน') {
    record.createdDate = inThisMonth
      ? `${Math.max(day - 5, 1)} ${thisMonth} ${thisYear}`
      : `${Math.max(day - 5, 1)} ${prevMonth} ${prevYear}`;
    record.signedDate = `${Math.max(day - 28, 1)} ${prevMonth} ${prevYear}`;
    /* วันที่สร้างคำขอเพิกถอน = วันที่แสดงใต้ badge ในคอลัมน์สถานะ */
    record.revokeRequestedDate = record.createdDate;
    record.revokeRequestChannel = consentSignChannelOfIndex(id + 1);
  }

  return record;
  });
};

/** Edge-case overlays — history, guardian, superseded version narrative. */
const CONSENT_RECORD_OVERRIDES = {
  1: {
    history: [
      {
        date: '6 พฤษภาคม 2569',
        dateTime: '6 พฤษภาคม 2569 · 09:30',
        action: 'ให้ความยินยอม',
        fromStatus: 'รอลงนาม',
        toStatus: 'ยินยอมแล้ว',
        formCode: 'PH-001',
        formName: 'ใบยินยอมเข้ารับการผ่าตัด',
        type: 'ผ่าตัด',
        version: 'V 1.0',
        status: 'ยินยอมแล้ว',
        channel: DEFAULT_SERVICE_CENTER_CHANNEL,
      },
    ],
  },
  6: {
    status: 'ถอนความยินยอม',
    signChannel: MOBILE_APP_CHANNEL,
    type: 'การวิจัย',
    formCode: 'PH-001',
    formName: 'ใบยินยอมเข้าร่วมโครงการวิจัย (Research Consent / ICF)',
    version: 'V 2.1',
    createdDate: '2 มีนาคม 2569',
    signedDate: '4 มีนาคม 2569',
    withdrawnDate: '18 มีนาคม 2569',
    history: [
      {
        date: '4 มีนาคม 2569',
        dateTime: '4 มีนาคม 2569 · 11:20',
        action: 'ให้ความยินยอม',
        fromStatus: 'รอลงนาม',
        toStatus: 'ยินยอมแล้ว',
        formCode: 'PH-014',
        formName: 'ใบยินยอมเข้าร่วมโครงการวิจัย (Research Consent / ICF)',
        type: 'การวิจัย',
        version: 'V 2.1',
        status: 'ยินยอมแล้ว',
        channel: MOBILE_APP_CHANNEL,
      },
      {
        date: '18 มีนาคม 2569',
        dateTime: '18 มีนาคม 2569 · 10:15',
        action: 'ถอนความยินยอม',
        fromStatus: 'ยินยอมแล้ว',
        toStatus: 'ถอนความยินยอม',
        formCode: 'PH-014',
        formName: 'ใบยินยอมเข้าร่วมโครงการวิจัย (Research Consent / ICF)',
        type: 'การวิจัย',
        version: 'V 2.1',
        status: 'ถอนความยินยอม',
        channel: MOBILE_APP_CHANNEL,
      },
    ],
  },
  17: {
    status: 'ถูกแทนที่ด้วยเวอร์ชันใหม่',
    type: 'ผ่าตัด',
    formCode: 'PH-004',
    formName: 'ใบยินยอมผ่าตัด / หัตถการ (Surgical / Procedure Consent)',
    version: 'V 1.0 → V 2.0',
    signChannel: DEFAULT_SERVICE_CENTER_CHANNEL,
    createdDate: '8 มีนาคม 2569',
    signedDate: '9 มีนาคม 2569',
    supersededById: 37,
    history: [
      {
        date: '9 มีนาคม 2569',
        dateTime: '9 มีนาคม 2569 · 14:00',
        action: 'ให้ความยินยอม',
        fromStatus: 'รอลงนาม',
        toStatus: 'ยินยอมแล้ว',
        formCode: 'PH-004',
        formName: 'ใบยินยอมผ่าตัด / หัตถการ (Surgical / Procedure Consent)',
        type: 'ผ่าตัด',
        version: 'V 1.0',
        status: 'ยินยอมแล้ว',
        channel: DEFAULT_SERVICE_CENTER_CHANNEL,
      },
      {
        date: '28 มีนาคม 2569',
        dateTime: '28 มีนาคม 2569 · 08:45',
        action: 'ถูกแทนที่ด้วยเวอร์ชันใหม่',
        fromStatus: 'ยินยอมแล้ว',
        toStatus: 'ถูกแทนที่ด้วยเวอร์ชันใหม่',
        formCode: 'PH-004',
        formName: 'ใบยินยอมผ่าตัด / หัตถการ (Surgical / Procedure Consent)',
        type: 'ผ่าตัด',
        version: 'V 2.0',
        status: 'ถูกแทนที่ด้วยเวอร์ชันใหม่',
        channel: AUTO_MR_REQUEST_CHANNEL,
      },
    ],
  },
  37: {
    hn: '67-00017',
    name: 'ภัคจิรา วงศ์อนันต์',
    status: 'รอลงนาม',
    type: 'ผ่าตัด',
    formCode: 'PH-004',
    formName: 'ใบยินยอมผ่าตัด / หัตถการ (Surgical / Procedure Consent)',
    version: 'V 2.0',
    signChannel: '-',
    requestChannel: AUTO_MR_REQUEST_CHANNEL,
    requester: AUTO_SYSTEM_REQUESTER,
    autoSent: true,
    supersededFromId: 17,
    createdDate: '28 มีนาคม 2569',
    signedDate: '-',
    withdrawnDate: '-',
    history: [
      {
        date: '28 มีนาคม 2569',
        dateTime: '28 มีนาคม 2569 · 08:45',
        action: 'ส่งอัตโนมัติ',
        fromStatus: 'ถูกแทนที่ด้วยเวอร์ชันใหม่',
        toStatus: 'รอลงนาม',
        formCode: 'PH-004',
        formName: 'ใบยินยอมผ่าตัด / หัตถการ (Surgical / Procedure Consent)',
        type: 'ผ่าตัด',
        version: 'V 2.0',
        status: 'รอลงนาม',
        channel: AUTO_MR_REQUEST_CHANNEL,
      },
    ],
  },
  18: {
    status: 'ยินยอมแล้ว',
    signChannel: DEFAULT_SERVICE_CENTER_CHANNEL,
    name: 'ด.ญ.ณิชา วงศ์สว่าง',
    type: 'การรักษา',
    formCode: 'PH-012',
    formName: 'ใบยินยอมอนามัยโรงเรียน',
    version: 'V 1.2',
    createdDate: '18 มีนาคม 2569',
    signedDate: '18 มีนาคม 2569',
    guardian: 'นางสาวสุภาพร วงศ์สว่าง (มารดา)',
    history: [
      {
        date: '18 มีนาคม 2569',
        dateTime: '18 มีนาคม 2569 · 15:30',
        action: 'ให้ความยินยอม',
        fromStatus: '—',
        toStatus: 'ยินยอมแล้ว',
        formCode: 'PH-016',
        formName: 'ใบยินยอมการรักษาผู้เยาว์ (โดยผู้ปกครอง)',
        type: 'การรักษา',
        version: 'V 1.2',
        status: 'ยินยอมแล้ว',
        channel: DEFAULT_SERVICE_CENTER_CHANNEL,
      },
    ],
  },
};

/* ── Records (36 ต่อแท็บ × 6 = 216 — pagination @ 20/page) ───────────── */
export const CONSENT_RECORDS = buildConsentMockRecords().map((row) => ({
  ...row,
  ...(CONSENT_RECORD_OVERRIDES[row.id] || {}),
  history: CONSENT_RECORD_OVERRIDES[row.id]?.history ?? row.history,
}));


/* ── Summary stat cards (Figma banner cards) — ค่าตัวเลขนับจาก rows เดือนนี้ ── */
const ICON = '/illustration/consent';

const SUMMARY_CARD_META = [
  {
    key: 'total', iconSvg: `${ICON}/clipboard-list.svg`,
    tileBg: 'var(--surface-statussummarycard-info, #DBEAFE)',
    iconInk: 'var(--text-statussummarycard-info-number, #1D4ED8)',
    label: 'ความยินยอมทั้งหมด',
    indicatorIconSvg: `${ICON}/trending-up.svg`,
  },
  {
    key: 'consented', iconSvg: `${ICON}/check-circle.svg`,
    tileBg: 'var(--surface-statussummarycard-positive, #D1F6EE)',
    iconInk: 'var(--text-statussummarycard-positive-number, #196C65)',
    label: 'ยินยอมแล้ว',
    indicatorIcon: null,
  },
  {
    key: 'pending', iconSvg: `${ICON}/clock.svg`,
    tileBg: 'var(--surface-statussummarycard-inprogress, #FFEDD5)',
    iconInk: 'var(--text-statussummarycard-inprogress-number, #C2410C)',
    label: 'รอดำเนินการ',
    indicatorIcon: null,
  },
  {
    key: 'rejected', iconSvg: `${ICON}/inbox-text-dontshare.svg`,
    tileBg: 'var(--surface-danger-tertiary, #FEE2E2)',
    iconInk: 'var(--text-danger-default, #B91C1C)',
    label: 'ปฏิเสธ / ถอน',
    indicatorIcon: null,
  },
  {
    key: 'expiring', iconSvg: `${ICON}/wait.svg`,
    tileBg: 'var(--surface-info-tertiary, #DBEAFE)',
    iconInk: 'var(--text-info-default, #1D4ED8)',
    label: 'ใกล้หมดอายุ',
    indicatorIcon: null,
  },
  {
    key: 'expired', iconSvg: `${ICON}/hourglass-disabled.svg`,
    tileBg: 'var(--surface-neutral-tertiary, #F4F5F5)',
    iconInk: 'var(--text-neutral-default, #4D5358)',
    label: 'หมดอายุ',
    indicatorIcon: null,
  },
];

const fmtCount = (n) => Number(n || 0).toLocaleString('th-TH');
const pctOf = (part, whole, periodLabel = 'เดือนนี้') => (
  whole > 0
    ? `${((part / whole) * 100).toFixed(1)}% ของ${periodLabel}`
    : `0% ของ${periodLabel}`
);

/**
 * สรุปจากชุด rows ที่กรองช่วงเวลาแล้ว (เช่น ตาม FilterDateTag)
 * allTimeTotal = ยอดทั้งระบบ (ไม่กรอง) สำหรับข้อความ "จากทั้งหมด …"
 */
export const buildConsentSummaryFromRows = (
  scopedRows = [],
  { allTimeTotal = scopedRows.length, periodLabel = 'เดือนนี้' } = {},
) => {
  const periodTotal = scopedRows.length;
  const countTab = (tab) => scopedRows.filter((r) => (CONSENT_STATUS[r.status] || {}).tab === tab).length;

  const counts = {
    total: periodTotal,
    consented: countTab('consented'),
    pending: countTab('pending'),
    rejected: countTab('rejected'),
    expiring: countTab('expiring'),
    expired: countTab('expired'),
  };

  return SUMMARY_CARD_META.map((meta) => {
    const value = counts[meta.key] ?? 0;
    if (meta.key === 'total') {
      return {
        ...meta,
        value: fmtCount(value),
        indicator: `${periodLabel} · จากทั้งหมด ${fmtCount(allTimeTotal)} รายการ`,
      };
    }
    return {
      ...meta,
      value: fmtCount(value),
      indicator: pctOf(value, periodTotal, periodLabel),
    };
  });
};

/**
 * Summary = สถิติเดือนนี้เท่านั้น (จาก createdDate)
 * ต้องสัมพันธ์กับจำนวนในแต่ละ tab ของตาราง — และยอดทั้งระบบ (tab ทั้งหมด)
 * ต้องมากกว่ายอด "ความยินยอมทั้งหมด" ใน summary (เดือนนี้)
 */
export const buildConsentSummary = (rows = [], now = new Date()) => {
  const thisMonthRows = rows.filter((r) => isConsentDateThisMonth(r.createdDate, now));
  return buildConsentSummaryFromRows(thisMonthRows, {
    allTimeTotal: rows.length,
    periodLabel: 'เดือนนี้',
  });
};

/** Snapshot จาก mock เริ่มต้น — หน้าจัดการความยินยอมควรใช้ buildConsentSummary(rows) แบบ live */
export const CONSENT_SUMMARY = buildConsentSummary(CONSENT_RECORDS);
