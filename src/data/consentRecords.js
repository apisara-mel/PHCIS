/* Consent Management mock data — Figma "PHCIS | Consent" (node 1:4).
   Drives the consent registry table, summary cards, tabs, and the
   per-status action column (annotation: "แต่ละ Status, CTA ใน Column
   การดำเนินการจะต่างกัน").

   No API — all values are local mock rows. UI copy is Thai. */

/* ── Consent type → ColorfulBadge tone (Figma type pills) ───────────── */
export const CONSENT_TYPE_TONE = {
  'ผ่าตัด':    'blue',
  'การรักษา':  'green',
  'การวิจัย':  'purple',
  'เลือด':     'red',
  'PDPA':      'indigo',
};

/* ── Status meta — badge tone + which tab it belongs under + the action
   CTA shown in the "การดำเนินการ" column for that status. ──────────── */
export const CONSENT_STATUS = {
  'รอลงนาม':          { tone: 'orange', tab: 'pending',   action: { label: 'ยกเลิกคำขอ', kind: 'outline', confirm: 'cancel' } },
  'อยู่ระหว่างลงนาม':  { tone: 'orange', tab: 'pending',   action: { label: 'ยกเลิกคำขอ', kind: 'outline', confirm: 'cancel' } },
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

/* ── ช่องทางลงนาม (ด.1.1.6 — หลายช่องทาง) ──────────────────────────────── */
export const CONSENT_CHANNEL_OPTIONS = [
  { value: 'ที่ศูนย์บริการ', label: 'ที่ศูนย์บริการ', icon: 'local_hospital', hint: 'เจ้าหน้าที่บันทึกให้ที่เคาน์เตอร์' },
  { value: 'Mobile App',    label: 'Mobile App',    icon: 'smartphone',      hint: 'ส่งคำขอไปที่แอปผู้รับบริการ' },
  { value: 'QR Code',       label: 'QR Code',       icon: 'qr_code_2',       hint: 'แสดง QR ให้สแกนลงนามบนมือถือ' },
];

/* ── Tabs (Figma TabUnderline) ──────────────────────────────────────── */
export const CONSENT_TABS = [
  { value: 'pending',   label: 'รอลงนาม',          icon: 'schedule' },
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

const CHANNELS = ['ที่ศูนย์บริการ', 'Mobile App', 'QR Code', '-'];

/* ── Records ────────────────────────────────────────────────────────── */
export const CONSENT_RECORDS = [
  {
    id: 1, hn: '67-00001', name: 'สมชาย มั่นใจดี', type: 'ผ่าตัด', version: 'V 1.0',
    status: 'รอลงนาม', signChannel: '-', requester: 'ลดา ดีงาม',
    createdDate: '20 มีนาคม 2569', signedDate: '-', withdrawnDate: '-',
    history: [
      { date: '6 พฤษภาคม 2569', formCode: 'PH-001', formName: 'ใบยินยอมเข้ารับการผ่าตัด', type: 'ผ่าตัด', version: 'V 1.0', status: 'ยินยอมแล้ว', channel: 'ที่ศูนย์บริการ' },
    ],
  },
  {
    id: 2, hn: '67-00002', name: 'สมชาย มีสุข', type: 'การรักษา', version: 'V 1.0',
    status: 'รอลงนาม', signChannel: '-', requester: 'ลดา ดีงาม',
    createdDate: '20 มีนาคม 2569', signedDate: '-', withdrawnDate: '-', history: [],
  },
  {
    id: 3, hn: '67-00003', name: 'วิไล ดีงาม', type: 'การวิจัย', version: 'V 2.1',
    status: 'รอลงนาม', signChannel: '-', requester: 'ลดา ดีงาม',
    createdDate: '20 มีนาคม 2569', signedDate: '-', withdrawnDate: '-', history: [],
  },
  {
    id: 4, hn: '67-00004', name: 'ประสงค์ ใจเย็น', type: 'การรักษา', version: 'V 1.0',
    status: 'อยู่ระหว่างลงนาม', signChannel: 'Mobile App', requester: 'ลดา ดีงาม',
    createdDate: '19 มีนาคม 2569', signedDate: '-', withdrawnDate: '-', history: [],
  },
  {
    id: 5, hn: '67-00005', name: 'กนกพร แสงทอง', type: 'ผ่าตัด', version: 'V 1.2',
    status: 'อยู่ระหว่างลงนาม', signChannel: 'QR Code', requester: 'นที ทองคำ',
    createdDate: '19 มีนาคม 2569', signedDate: '-', withdrawnDate: '-', history: [],
  },
  {
    id: 6, hn: '67-00006', name: 'ธวัช พงษ์ไพร', type: 'การวิจัย', version: 'V 2.1',
    status: 'ถอนความยินยอม', signChannel: 'Mobile App', requester: 'ลดา ดีงาม',
    createdDate: '2 มีนาคม 2569', signedDate: '4 มีนาคม 2569', withdrawnDate: '18 มีนาคม 2569',
    history: [
      { date: '4 มีนาคม 2569',  formCode: 'PH-014', formName: 'ใบยินยอมเข้าร่วมโครงการวิจัย (Research Consent / ICF)', type: 'การวิจัย', version: 'V 2.1', status: 'ยินยอมแล้ว',     channel: 'Mobile App' },
      { date: '18 มีนาคม 2569', formCode: 'PH-014', formName: 'ใบยินยอมเข้าร่วมโครงการวิจัย (Research Consent / ICF)', type: 'การวิจัย', version: 'V 2.1', status: 'ถอนความยินยอม', channel: 'Mobile App' },
    ],
  },
  {
    id: 7, hn: '67-00007', name: 'อารยา สุขสันต์', type: 'การรักษา', version: 'V 1.0',
    status: 'ถอนความยินยอม', signChannel: 'ที่ศูนย์บริการ', requester: 'นที ทองคำ',
    createdDate: '1 มีนาคม 2569', signedDate: '3 มีนาคม 2569', withdrawnDate: '17 มีนาคม 2569', history: [],
  },
  {
    id: 8, hn: '67-00008', name: 'เมธาวี รุ่งเรือง', type: 'ผ่าตัด', version: 'V 1.0',
    status: 'ยินยอมแล้ว', signChannel: 'ที่ศูนย์บริการ', requester: 'ลดา ดีงาม',
    createdDate: '15 มีนาคม 2569', signedDate: '16 มีนาคม 2569', withdrawnDate: '-', history: [],
  },
  {
    id: 9, hn: '67-00009', name: 'ชัยวัฒน์ ภักดี', type: 'การรักษา', version: 'V 1.1',
    status: 'ยินยอมแล้ว', signChannel: 'Mobile App', requester: 'นที ทองคำ',
    createdDate: '14 มีนาคม 2569', signedDate: '14 มีนาคม 2569', withdrawnDate: '-', history: [],
  },
  {
    id: 10, hn: '67-00010', name: 'ปรารถนา ทองดี', type: 'การวิจัย', version: 'V 2.0',
    status: 'ยินยอมแล้ว', signChannel: 'QR Code', requester: 'ลดา ดีงาม',
    createdDate: '12 มีนาคม 2569', signedDate: '13 มีนาคม 2569', withdrawnDate: '-', history: [],
  },
  {
    id: 11, hn: '67-00011', name: 'สุริยา แจ่มใส', type: 'การรักษา', version: 'V 1.0',
    status: 'ปฏิเสธ', signChannel: 'ที่ศูนย์บริการ', requester: 'นที ทองคำ',
    createdDate: '10 มีนาคม 2569', signedDate: '-', withdrawnDate: '-', history: [],
  },
  {
    id: 12, hn: '67-00012', name: 'ดวงใจ พิทักษ์', type: 'ผ่าตัด', version: 'V 1.2',
    status: 'ใกล้หมดอายุ', signChannel: 'ที่ศูนย์บริการ', requester: 'ลดา ดีงาม',
    createdDate: '20 มีนาคม 2568', signedDate: '21 มีนาคม 2568', withdrawnDate: '-', history: [],
    /* ด.1.1.7 — countdown "อีก X วัน" บนแท็บใกล้หมดอายุ */
    expiresInDays: 14,
  },
  {
    id: 13, hn: '67-00013', name: 'วีรชัย กล้าหาญ', type: 'การวิจัย', version: 'V 2.1',
    status: 'ใกล้หมดอายุ', signChannel: 'Mobile App', requester: 'นที ทองคำ',
    createdDate: '25 มีนาคม 2568', signedDate: '26 มีนาคม 2568', withdrawnDate: '-', history: [],
    expiresInDays: 21,
  },
  {
    id: 14, hn: '67-00014', name: 'นภัสสร บุญมา', type: 'การรักษา', version: 'V 1.0',
    status: 'หมดอายุ', signChannel: 'ที่ศูนย์บริการ', requester: 'ลดา ดีงาม',
    createdDate: '1 มกราคม 2568', signedDate: '2 มกราคม 2568', withdrawnDate: '-', history: [],
  },
  {
    id: 15, hn: '67-00015', name: 'อนุชา เพชรงาม', type: 'ผ่าตัด', version: 'V 1.0',
    status: 'หมดอายุ', signChannel: 'QR Code', requester: 'นที ทองคำ',
    createdDate: '5 กุมภาพันธ์ 2568', signedDate: '6 กุมภาพันธ์ 2568', withdrawnDate: '-', history: [],
  },
  {
    id: 16, hn: '67-00016', name: 'จิราพร แก้วใส', type: 'การรักษา', version: 'V 1.1',
    status: 'ยินยอมแล้ว', signChannel: 'Mobile App', requester: 'ลดา ดีงาม',
    createdDate: '11 มีนาคม 2569', signedDate: '11 มีนาคม 2569', withdrawnDate: '-', history: [],
  },
  /* Edge: เซ็น V 1.0 ไปแล้ว → เทมเพลตอัปเดตเป็น V 2.0 → superseded ต้องเซ็นใหม่ */
  {
    id: 17, hn: '67-00017', name: 'พิมพ์ลดา ศรีสุข', type: 'ผ่าตัด', version: 'V 1.0 → V 2.0',
    status: 'มีเวอร์ชันใหม่', signChannel: 'ที่ศูนย์บริการ', requester: 'ลดา ดีงาม',
    createdDate: '8 มีนาคม 2569', signedDate: '9 มีนาคม 2569', withdrawnDate: '-',
    history: [
      { date: '9 มีนาคม 2569',  formCode: 'PH-004', formName: 'ใบยินยอมผ่าตัด / หัตถการ (Surgical / Procedure Consent)', type: 'ผ่าตัด', version: 'V 1.0', status: 'ยินยอมแล้ว',    channel: 'ที่ศูนย์บริการ' },
      { date: '28 มีนาคม 2569', formCode: 'PH-004', formName: 'ใบยินยอมผ่าตัด / หัตถการ (Surgical / Procedure Consent)', type: 'ผ่าตัด', version: 'V 2.0', status: 'มีเวอร์ชันใหม่', channel: '-' },
    ],
  },
  /* Edge: ผู้เยาว์ — ผู้ปกครองลงนามแทน (guardian consent) */
  {
    id: 18, hn: '67-00018', name: 'ด.ญ.ณิชา วงศ์สว่าง', type: 'การรักษา', version: 'V 1.2',
    status: 'ยินยอมแล้ว', signChannel: 'ที่ศูนย์บริการ', requester: 'นที ทองคำ',
    guardian: 'นางสาวสุภาพร วงศ์สว่าง (มารดา)',
    createdDate: '18 มีนาคม 2569', signedDate: '18 มีนาคม 2569', withdrawnDate: '-',
    history: [
      { date: '18 มีนาคม 2569', formCode: 'PH-016', formName: 'ใบยินยอมการรักษาผู้เยาว์ (โดยผู้ปกครอง)', type: 'การรักษา', version: 'V 1.2', status: 'ยินยอมแล้ว', channel: 'ที่ศูนย์บริการ' },
    ],
  },
];

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
    value: '96', label: 'รอลงนาม',
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
