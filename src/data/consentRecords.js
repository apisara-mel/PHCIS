/* Consent Management mock data — Figma "PHCIS | Consent" (node 1:4).
   Drives the consent registry table, summary cards, tabs, and the
   per-status action column (annotation: "แต่ละ Status, CTA ใน Column
   การดำเนินการจะต่างกัน").

   No API — all values are local mock rows. UI copy is Thai. */

import {
  DEFAULT_SERVICE_CENTER_CHANNEL,
  MOBILE_APP_CHANNEL,
} from '@/data/consentChannels';
import { resolveConsentFormForWorklistType } from '@/data/consentFormRecords';

/* ── Consent type → ColorfulBadge tone (Figma type pills) ───────────── */
export const CONSENT_TYPE_TONE = {
  'ผ่าตัด':    'blue',
  'การรักษา':  'green',
  'การวิจัย':  'purple',
  'เลือด':     'red',
  'PDPA':      'indigo',
  'เบิกจ่าย':  'magenta',
};

/* ── Status meta — badge tone + which tab it belongs under + the action
   CTA shown in the "การดำเนินการ" column for that status. ──────────── */
export const CONSENT_STATUS = {
  'รอลงนาม':          { tone: 'orange', tab: 'pending',   action: { label: 'ยกเลิกคำขอ', kind: 'subdued', confirm: 'cancel' } },
  'อยู่ระหว่างลงนาม':  { tone: 'orange', tab: 'pending',   action: { label: 'ยกเลิกคำขอ', kind: 'subdued', confirm: 'cancel' } },
  /* ผู้รับบริการ request เพิกถอนผ่าน Mobile App / ที่ศูนย์ — รอเจ้าหน้าที่ดำเนินการ */
  'ขอเพิกถอน':        { tone: 'red',    tab: 'pending',   action: { label: 'ดำเนินการเพิกถอน', kind: 'brand', confirm: 'revoke' } },
  'ยินยอมแล้ว':        { tone: 'green',  tab: 'consented', action: { label: 'เพิกถอน',    kind: 'outline', confirm: 'revoke' } },
  'ปฏิเสธ':           { tone: 'grey',   tab: 'rejected',  action: { label: 'Reconsent',  kind: 'brand',   confirm: 'reconsent' } },
  'ถอนความยินยอม':    { tone: 'red',    tab: 'rejected',  action: { label: 'Reconsent',  kind: 'brand',   confirm: 'reconsent' } },
  'ใกล้หมดอายุ':       { tone: 'yellow', tab: 'expiring',  action: { label: 'Reconsent',  kind: 'brand',   confirm: 'reconsent' } },
  'หมดอายุ':          { tone: 'red',    tab: 'expired',   action: { label: 'Reconsent',  kind: 'brand',   confirm: 'reconsent' } },
  /* Edge case (Figma note 312:97428): เทมเพลตออกเวอร์ชันใหม่หลังผู้ป่วย
     เซ็นไปแล้ว → ฉบับเดิมเป็น superseded ต้องส่งขอเซ็นใหม่ */
  'มีเวอร์ชันใหม่':     { tone: 'blue',   tab: 'pending',   action: { label: 'ส่งเซ็นเวอร์ชันใหม่', kind: 'brand', confirm: 'reconsent' } },
  /* ด.1.1.7 — Re-Consent ครบวงจร: record เดิมที่มีคำขอ reconsent เกิดขึ้นแล้ว
     ย้ายมาสถานะนี้ (ไม่ hard delete — ประวัติคงอยู่) ไม่มี CTA ต่อ */
  'หมดอายุ-Reconsent': { tone: 'grey',   tab: 'expired',   action: null },
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
} from '@/data/consentChannels';

/* ── Tabs (Figma TabUnderline) ──────────────────────────────────────── */
export const CONSENT_TABS = [
  { value: 'pending',   label: 'รอดำเนินการ',      icon: 'pending_actions' },
  { value: 'consented', label: 'ยินยอมแล้ว',        icon: 'verified' },
  { value: 'rejected',  label: 'ปฏิเสธ / เพิกถอน',  icon: 'do_not_disturb_on' },
  { value: 'expiring',  label: 'ใกล้หมดอายุ',       icon: 'hourglass_top' },
  { value: 'expired',   label: 'หมดอายุ',           icon: 'hourglass_disabled' },
  { value: 'all',       label: 'ความยินยอมทั้งหมด',  icon: 'list' },
];

/* ── Confirm-dialog copy per action kind (AlertDialog) ──────────────── */
export const CONSENT_CONFIRM = {
  cancel:    { type: 'destructive', title: 'ยืนยันการยกเลิกคำขอ',     description: 'คุณต้องการยกเลิกคำขอความยินยอมนี้',          confirmLabel: 'ยืนยัน' },
  revoke:    { type: 'destructive', title: 'ยืนยันการเพิกถอนความยินยอม', description: 'การเพิกถอนจะมีผลทันที และต้องขอความยินยอมใหม่หากต้องใช้อีกครั้ง', confirmLabel: 'เพิกถอน' },
  reconsent: { type: 'info',        title: 'ส่งคำขอความยินยอมใหม่',     description: 'ระบบจะสร้างคำขอความยินยอมฉบับใหม่และแจ้งผู้ป่วยให้ลงนามอีกครั้ง', confirmLabel: 'ส่งคำขอ' },
};

const CONSENT_TYPES = ['ผ่าตัด', 'การรักษา', 'การวิจัย', 'เลือด', 'PDPA', 'เบิกจ่าย'];
const REQUESTERS = ['ลดา ดีงาม', 'นที ทองคำ'];
const MOCK_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน'];

/** 32 rows — one rotation covering every CONSENT_STATUS (pagination demo at PAGE_SIZE 10). */
const MOCK_STATUS_ROTATION = [
  'รอลงนาม', 'รอลงนาม', 'ขอเพิกถอน', 'ขอเพิกถอน',
  'อยู่ระหว่างลงนาม', 'อยู่ระหว่างลงนาม', 'อยู่ระหว่างลงนาม',
  'ยินยอมแล้ว', 'ยินยอมแล้ว', 'ยินยอมแล้ว', 'ยินยอมแล้ว', 'ยินยอมแล้ว', 'ยินยอมแล้ว',
  'ปฏิเสธ', 'ปฏิเสธ', 'ปฏิเสธ',
  'ถอนความยินยอม', 'ถอนความยินยอม', 'ถอนความยินยอม',
  'ใกล้หมดอายุ', 'ใกล้หมดอายุ', 'ใกล้หมดอายุ',
  'หมดอายุ', 'หมดอายุ', 'หมดอายุ',
  'มีเวอร์ชันใหม่', 'มีเวอร์ชันใหม่',
  'หมดอายุ-Reconsent', 'หมดอายุ-Reconsent',
  'ยกเลิกคำขอ', 'ยกเลิกคำขอ', 'ยกเลิกคำขอ',
];

/** HN + seed name — aligned with MR / screening roster (enriched again at render). */
const MOCK_PATIENTS = [
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
  { hn: '67-00006', name: 'ปรียา สุพรรณ' },
  { hn: '67-00008', name: 'มาลีรัตน์ ธนาวัตน' },
  { hn: '67-00012', name: 'วิชัย รุ่งเรือง' },
  { hn: '67-00015', name: 'รัตนาภรณ์ ใสสะอาด' },
  { hn: '67-00020', name: 'กฤษดา ผ่องใส' },
];

const signChannelForStatus = (status, id) => {
  if (status === 'รอลงนาม' || status === 'ยกเลิกคำขอ') return '-';
  if (status === 'ขอเพิกถอน') return id % 2 === 0 ? MOBILE_APP_CHANNEL : DEFAULT_SERVICE_CENTER_CHANNEL;
  if (status === 'อยู่ระหว่างลงนาม') return id % 2 === 0 ? MOBILE_APP_CHANNEL : DEFAULT_SERVICE_CENTER_CHANNEL;
  if (status === 'มีเวอร์ชันใหม่') return DEFAULT_SERVICE_CENTER_CHANNEL;
  if (status === 'หมดอายุ-Reconsent') return '-';
  return id % 2 === 0 ? MOBILE_APP_CHANNEL : DEFAULT_SERVICE_CENTER_CHANNEL;
};

const buildConsentMockRecords = () => MOCK_STATUS_ROTATION.map((status, index) => {
  const id = index + 1;
  const patient = MOCK_PATIENTS[index];
  const type = CONSENT_TYPES[index % CONSENT_TYPES.length];
  const day = (index % 27) + 1;
  const month = MOCK_MONTHS[index % MOCK_MONTHS.length];
  const createdDate = `${day} ${month} 2569`;
  const signed = ['ยินยอมแล้ว', 'ใกล้หมดอายุ', 'หมดอายุ', 'มีเวอร์ชันใหม่', 'หมดอายุ-Reconsent'].includes(status);
  const withdrawn = ['ถอนความยินยอม'].includes(status);
  const signedDate = signed ? `${Math.min(day + 1, 28)} ${month} 2569` : '-';
  const withdrawnDate = withdrawn ? `${Math.min(day + 3, 28)} ${month} 2569` : '-';
  const signChannel = signChannelForStatus(status, id);
  const { formCode, formName } = resolveConsentFormForWorklistType(type);

  const record = {
    id,
    hn: patient.hn,
    name: patient.name,
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

  if (status === 'ใกล้หมดอายุ') {
    record.expiresInDays = 7 + (index % 21);
    record.createdDate = `${day} ${month} 2568`;
    record.signedDate = `${Math.min(day + 1, 28)} ${month} 2568`;
  }
  if (status === 'หมดอายุ' || status === 'หมดอายุ-Reconsent') {
    record.createdDate = `${day} ${month} 2568`;
    record.signedDate = `${Math.min(day + 1, 28)} ${month} 2568`;
  }
  if (status === 'หมดอายุ-Reconsent') {
    record.pendingReconsent = true;
  }
  if (status === 'รอลงนาม' && id % 2 === 0) {
    record.dueDate = `${Math.min(day + 14, 28)} ${MOCK_MONTHS[(index + 1) % MOCK_MONTHS.length]} 2569`;
  }
  if (status === 'ขอเพิกถอน') {
    record.createdDate = `${Math.max(day - 30, 1)} ${MOCK_MONTHS[(index + MOCK_MONTHS.length - 1) % MOCK_MONTHS.length]} 2568`;
    record.signedDate = `${Math.max(day - 28, 1)} ${MOCK_MONTHS[(index + MOCK_MONTHS.length - 1) % MOCK_MONTHS.length]} 2568`;
    record.revokeRequestedDate = `${day} ${month} 2569`;
    record.revokeRequestChannel = id % 2 === 0 ? MOBILE_APP_CHANNEL : DEFAULT_SERVICE_CENTER_CHANNEL;
  }

  return record;
});

/** Edge-case overlays — history, guardian, superseded version narrative. */
const CONSENT_RECORD_OVERRIDES = {
  1: {
    history: [
      { date: '6 พฤษภาคม 2569', formCode: 'PH-001', formName: 'ใบยินยอมเข้ารับการผ่าตัด', type: 'ผ่าตัด', version: 'V 1.0', status: 'ยินยอมแล้ว', channel: DEFAULT_SERVICE_CENTER_CHANNEL },
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
      { date: '4 มีนาคม 2569', formCode: 'PH-014', formName: 'ใบยินยอมเข้าร่วมโครงการวิจัย (Research Consent / ICF)', type: 'การวิจัย', version: 'V 2.1', status: 'ยินยอมแล้ว', channel: MOBILE_APP_CHANNEL },
      { date: '18 มีนาคม 2569', formCode: 'PH-014', formName: 'ใบยินยอมเข้าร่วมโครงการวิจัย (Research Consent / ICF)', type: 'การวิจัย', version: 'V 2.1', status: 'ถอนความยินยอม', channel: MOBILE_APP_CHANNEL },
    ],
  },
  17: {
    status: 'มีเวอร์ชันใหม่',
    type: 'ผ่าตัด',
    formCode: 'PH-004',
    formName: 'ใบยินยอมผ่าตัด / หัตถการ (Surgical / Procedure Consent)',
    version: 'V 1.0 → V 2.0',
    signChannel: DEFAULT_SERVICE_CENTER_CHANNEL,
    createdDate: '8 มีนาคม 2569',
    signedDate: '9 มีนาคม 2569',
    history: [
      { date: '9 มีนาคม 2569', formCode: 'PH-004', formName: 'ใบยินยอมผ่าตัด / หัตถการ (Surgical / Procedure Consent)', type: 'ผ่าตัด', version: 'V 1.0', status: 'ยินยอมแล้ว', channel: DEFAULT_SERVICE_CENTER_CHANNEL },
      { date: '28 มีนาคม 2569', formCode: 'PH-004', formName: 'ใบยินยอมผ่าตัด / หัตถการ (Surgical / Procedure Consent)', type: 'ผ่าตัด', version: 'V 2.0', status: 'มีเวอร์ชันใหม่', channel: '-' },
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
      { date: '18 มีนาคม 2569', formCode: 'PH-016', formName: 'ใบยินยอมการรักษาผู้เยาว์ (โดยผู้ปกครอง)', type: 'การรักษา', version: 'V 1.2', status: 'ยินยอมแล้ว', channel: DEFAULT_SERVICE_CENTER_CHANNEL },
    ],
  },
};

/* ── Records (32 rows — pagination @ 10/page) ───────────────────────── */
export const CONSENT_RECORDS = buildConsentMockRecords().map((row) => ({
  ...row,
  ...(CONSENT_RECORD_OVERRIDES[row.id] || {}),
  history: CONSENT_RECORD_OVERRIDES[row.id]?.history ?? row.history,
}));


/* ── Summary stat cards (Figma banner cards) ────────────────────────── */
/* Exported Figma glyph SVGs (node 297:83830) — recoloured per card via MaskIcon.
   See public/illustration/consent/. */
const ICON = '/illustration/consent';

export const CONSENT_SUMMARY = [
  /* Status Summary Card_Horizontal tones — Figma PHCIS | Consent 297:83830.
     Panel cards (border-card-default), glyphs are exact Figma SVG exports.
     The first card carries a trending indicator glyph; the rest show a plain
     "% ของทั้งหมด" line. */
  {
    key: 'total', iconSvg: `${ICON}/clipboard-list.svg`,
    tileBg: 'var(--surface-statussummarycard-info, #DBEAFE)',
    iconInk: 'var(--text-statussummarycard-info-number, #1D4ED8)',
    value: '1,284', label: 'Consent ทั้งหมด',
    indicator: '12% จากเดือนที่แล้ว', indicatorIconSvg: `${ICON}/trending-up.svg`,
  },
  {
    key: 'consented', iconSvg: `${ICON}/check-circle.svg`,
    tileBg: 'var(--surface-statussummarycard-positive, #D1F6EE)',
    iconInk: 'var(--text-statussummarycard-positive-number, #196C65)',
    value: '1,156', label: 'ยินยอมแล้ว',
    indicator: '90.0% ของทั้งหมด', indicatorIcon: null,
  },
  {
    key: 'pending', iconSvg: `${ICON}/clock.svg`,
    tileBg: 'var(--surface-statussummarycard-inprogress, #FFEDD5)',
    iconInk: 'var(--text-statussummarycard-inprogress-number, #C2410C)',
    value: '96', label: 'รอดำเนินการ',
    indicator: '7.5% ของทั้งหมด', indicatorIcon: null,
  },
  {
    key: 'rejected', iconSvg: `${ICON}/inbox-text-dontshare.svg`,
    tileBg: 'var(--surface-danger-tertiary, #FEE2E2)',
    iconInk: 'var(--text-danger-default, #B91C1C)',
    value: '32', label: 'ปฏิเสธ / ถอน',
    indicator: '2.5% ของทั้งหมด', indicatorIcon: null,
  },
  {
    key: 'expiring', iconSvg: `${ICON}/wait.svg`,
    tileBg: 'var(--surface-info-tertiary, #DBEAFE)',
    iconInk: 'var(--text-info-default, #1D4ED8)',
    value: '20', label: 'ใกล้หมดอายุ',
    indicator: '1.8% ของทั้งหมด', indicatorIcon: null,
  },
  {
    key: 'expired', iconSvg: `${ICON}/hourglass-disabled.svg`,
    tileBg: 'var(--surface-neutral-tertiary, #F4F5F5)',
    iconInk: 'var(--text-neutral-default, #4D5358)',
    value: '44', label: 'หมดอายุ',
    indicator: '3% ของทั้งหมด', indicatorIcon: null,
  },
];
