/* PHCIS | Consent — Template / builder ของหน้าจอแดชบอร์ด (TOR ด.1.1.12).
   แม่แบบ layout + palette ของ widget ที่ผูกกับ dataset consent จริง
   (consentRecords / consentReports). Module-level mutable store — mock ใน
   session เดียว ไม่ persist. */

/* ── แม่แบบ layout (จำนวนโซนต่อแถวบน canvas) ──────────────────────────── */
export const DASHBOARD_LAYOUTS = [
  { key: 'two',   title: '2 โซน',  subtitle: 'การ์ดใหญ่ 2 คอลัมน์ เหมาะกับกราฟ', columns: 2 },
  { key: 'three', title: '3 โซน',  subtitle: 'สมดุลการ์ดสถิติ + กราฟ',           columns: 3 },
  { key: 'four',  title: '4 โซน',  subtitle: 'การ์ดสถิติจำนวนมาก (stat-heavy)',   columns: 4 },
];

/* ── Widget palette — ผูก dataset consent ─────────────────────────────── */
export const WIDGET_TYPES = [
  { key: 'stat',     label: 'การ์ดสถิติ',           icon: 'analytics',   description: 'ตัวเลขสรุป — ทั้งหมด / ยินยอมแล้ว / รอดำเนินการ / ปฏิเสธ' },
  { key: 'overview', label: 'สัดส่วนตามสถานะ',       icon: 'data_usage',  description: 'Donut สัดส่วนสถานะความยินยอม พร้อมคำอธิบายสี' },
  { key: 'bars',     label: 'แนวโน้มรายเดือน',       icon: 'bar_chart',   description: 'กราฟแท่ง ยินยอม / ไม่ยินยอม ต่อเดือน' },
  { key: 'hbar',     label: 'จำนวนตามประเภทข้อมูล',  icon: 'view_list',   description: 'แท่งแนวนอนแยกตามวัตถุประสงค์การเปิดเผยข้อมูล' },
  { key: 'table',    label: 'รายการล่าสุด',          icon: 'table_rows',  description: 'รายการความยินยอมล่าสุด — HN · แบบฟอร์ม · สถานะ' },
];

/* dataset ที่ widget เลือกผูกได้ (มาจาก mock consent จริงของระบบ) */
export const WIDGET_DATASETS = [
  { key: 'summary',   label: 'สรุปสถานะความยินยอม' },
  { key: 'records',   label: 'รายการความยินยอมทั้งหมด' },
  { key: 'reports',   label: 'สถิติจากรายงานความยินยอม' },
  { key: 'forms',     label: 'ทะเบียนแบบฟอร์มความยินยอม' },
  { key: 'access',    label: 'คำขอเข้าถึงข้อมูล' },
];

/* dataset ที่แต่ละ widget type ผูกแล้วมีผลต่อการ render จริง — Select ใน
   builder เสนอเฉพาะรายการนี้ (กัน dead control) ตัวแรกคือค่าเริ่มต้น */
export const WIDGET_TYPE_DATASETS = {
  stat:     ['summary', 'reports', 'forms', 'access'],
  overview: ['records', 'reports', 'forms', 'access'],
  donut:    ['records', 'reports', 'forms', 'access'],
  bars:     ['reports', 'records', 'forms'],
  hbar:     ['records', 'forms', 'access'],
  table:    ['records', 'forms', 'access'],
};

/** จำนวนโซนที่ widget แต่ละชนิดกินพอดีเมื่อเพิ่มใหม่ (ผู้ใช้ปรับเองได้) */
export const WIDGET_DEFAULT_SPAN = {
  stat: 2, overview: 1, donut: 1, bars: 2, hbar: 1, table: 2,
};

let TEMPLATE_SEQ = 3;

/* ── เทมเพลตมาตรฐาน (ลบไม่ได้ — เป็น fallback ของค่าเริ่มต้น) ─────────── */
const STANDARD_TEMPLATE = {
  id: 'std',
  name: 'แดชบอร์ดมาตรฐาน (สำนักอนามัย)',
  layout: 'three',
  locked: true,
  updatedAt: '1 สิงหาคม 2569',
  updatedBy: 'ระบบ',
  widgets: [
    { id: 'w1', type: 'stat',     title: 'สรุปความยินยอม',    dataset: 'summary', span: 3 },
    { id: 'w2', type: 'overview', title: 'สัดส่วนตามสถานะ',   dataset: 'records', span: 1 },
    { id: 'w3', type: 'hbar',     title: 'จำนวนตามวัตถุการเปิดเผยข้อมูล', dataset: 'records', span: 2 },
  ],
};

let templates = [
  STANDARD_TEMPLATE,
  {
    id: 'tpl-2',
    name: 'จอติดตามการเพิกถอน (PDPA)',
    layout: 'two',
    locked: false,
    updatedAt: '2 สิงหาคม 2569',
    updatedBy: 'ลดา ดีงาม',
    widgets: [
      { id: 'w5', type: 'stat',  title: 'ปฏิเสธ / ถอนความยินยอม', dataset: 'summary', span: 2 },
      { id: 'w6', type: 'table', title: 'รายการเพิกถอนล่าสุด',    dataset: 'records', span: 2 },
    ],
  },
];

let defaultTemplateId = 'std';

/* ── Store API (mock — mutate ในหน่วยความจำ) ──────────────────────────── */
export const listDashboardTemplates = () => templates.map((t) => ({ ...t, widgets: t.widgets.map((w) => ({ ...w })) }));

export const getDashboardTemplate = (id) =>
  listDashboardTemplates().find((t) => t.id === id) || null;

export const getDefaultDashboardTemplate = () =>
  getDashboardTemplate(defaultTemplateId) || getDashboardTemplate('std');

export const getDefaultDashboardTemplateId = () => defaultTemplateId;

export const setDefaultDashboardTemplate = (id) => {
  if (templates.some((t) => t.id === id)) defaultTemplateId = id;
};

export const saveDashboardTemplate = (tpl) => {
  const stamp = new Date().toLocaleDateString('th-TH', { dateStyle: 'long' });
  if (tpl.id && templates.some((t) => t.id === tpl.id)) {
    templates = templates.map((t) => (t.id === tpl.id ? { ...t, ...tpl, locked: t.locked, updatedAt: stamp } : t));
    return tpl.id;
  }
  const id = `tpl-${++TEMPLATE_SEQ}`;
  templates = [...templates, { ...tpl, id, locked: false, updatedAt: stamp, updatedBy: tpl.updatedBy || 'ลดา ดีงาม' }];
  return id;
};

export const deleteDashboardTemplate = (id) => {
  const target = templates.find((t) => t.id === id);
  if (!target || target.locked) return false;
  templates = templates.filter((t) => t.id !== id);
  /* ลบ template ที่เป็นค่าเริ่มต้น → สลับกลับ template มาตรฐาน (edge case) */
  if (defaultTemplateId === id) defaultTemplateId = 'std';
  return true;
};
