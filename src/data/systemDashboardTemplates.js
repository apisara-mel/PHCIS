/* ระบบจัดการระบบ · เทมเพลตหน้าจอแดชบอร์ด — โครงเดียวกับ consentDashboardTemplates
   (TOR ด.1.1.12 ให้ผู้ใช้จัดหน้าจอรวมเองได้) ต่างกันที่ palette ของ widget
   ผูกกับข้อมูลของ "จัดการระบบ" จริง ไม่ใช่ของความยินยอม

   store แบบ mutable ระดับโมดูล — mock ใน session เดียว ไม่ persist
   (เหมือนฝั่งความยินยอม จะได้พฤติกรรมตรงกันทั้งสองหน้า) */

export const DASHBOARD_LAYOUTS = [
  { key: 'two',   title: '2 โซน', subtitle: 'การ์ดใหญ่ 2 คอลัมน์ เหมาะกับกราฟ', columns: 2 },
  { key: 'three', title: '3 โซน', subtitle: 'สมดุลการ์ดสถิติ + กราฟ',           columns: 3 },
  { key: 'four',  title: '4 โซน', subtitle: 'การ์ดสถิติจำนวนมาก (stat-heavy)',   columns: 4 },
];

export const WIDGET_TYPES = [
  { key: 'stat',  label: 'การ์ดสถิติ',        icon: 'analytics',   description: 'ตัวเลขสรุป — ทะเบียนของระบบ หรือสถิติการใช้งาน' },
  { key: 'donut', label: 'สัดส่วนวงกลม',      icon: 'data_usage',  description: 'สถานะการอนุมัติแม่แบบสิทธิ์ หรือบุคลากรตามตำแหน่ง' },
  { key: 'bars',  label: 'ยอดผู้ใช้งานรายเดือน', icon: 'bar_chart',   description: 'กราฟแท่ง 12 เดือนย้อนหลัง (TOR §1.17.4.3)' },
  { key: 'hbar',  label: 'แท่งแนวนอน',        icon: 'view_list',   description: 'บุคลากรตามศูนย์ · ช่วงเวลาการใช้งาน · ปริมาณต่อฟังก์ชัน' },
  { key: 'table', label: 'ตารางทะเบียน',      icon: 'table_rows',  description: 'ทะเบียนที่ต้องดูแล พร้อมจำนวนที่นับจากของจริง' },
];

/* dataset ที่เลือกผูกได้ — ทุกตัวเปลี่ยนภาพที่เรนเดอร์จริง ไม่มี dead control */
export const WIDGET_DATASETS = [
  { key: 'registries',      label: 'ทะเบียนของระบบจัดการระบบ' },
  { key: 'usage',           label: 'สถิติการใช้งานระบบ' },
  { key: 'access',          label: 'สถานะการอนุมัติแม่แบบสิทธิ์' },
  { key: 'staff-position',  label: 'บุคลากรตามตำแหน่ง' },
  { key: 'staff-center',    label: 'บุคลากรตามศูนย์บริการ' },
  { key: 'usage-hours',     label: 'ช่วงเวลาการใช้งาน' },
  { key: 'usage-functions', label: 'ปริมาณการใช้งานแต่ละฟังก์ชัน' },
];

export const WIDGET_TYPE_DATASETS = {
  stat:  ['registries', 'usage'],
  donut: ['access', 'staff-position'],
  bars:  ['usage'],
  hbar:  ['staff-center', 'usage-hours', 'usage-functions'],
  table: ['registries'],
};

export const WIDGET_DEFAULT_SPAN = {
  stat: 3, donut: 1, bars: 2, hbar: 1, table: 3,
};

let TEMPLATE_SEQ = 2;

/* เทมเพลตมาตรฐาน = หน้าจอเดิมของแดชบอร์ดเป๊ะ ๆ — เลือกอันนี้แล้วต้องได้ภาพ
   เหมือนก่อนมีระบบเทมเพลต (ลบไม่ได้ เป็น fallback ของค่าเริ่มต้น) */
const STANDARD_TEMPLATE = {
  id: 'sys-std',
  name: 'แดชบอร์ดมาตรฐาน (จัดการระบบ)',
  layout: 'three',
  locked: true,
  updatedAt: '26 สิงหาคม 2569',
  updatedBy: 'ระบบ',
  widgets: [
    { id: 'sw1', type: 'donut', title: 'สถานะการอนุมัติแม่แบบสิทธิ์', dataset: 'access', span: 1 },
    { id: 'sw2', type: 'donut', title: 'บุคลากรตามตำแหน่ง',        dataset: 'staff-position', span: 1 },
    { id: 'sw3', type: 'hbar',  title: 'บุคลากรตามศูนย์บริการ',      dataset: 'staff-center', span: 1 },
    { id: 'sw4', type: 'bars',  title: 'ยอดผู้ใช้งานรายเดือน',      dataset: 'usage', span: 2 },
    { id: 'sw5', type: 'hbar',  title: 'ช่วงเวลาการใช้งาน',         dataset: 'usage-hours', span: 1 },
    { id: 'sw6', type: 'hbar',  title: 'ปริมาณการใช้งานแต่ละฟังก์ชัน', dataset: 'usage-functions', span: 3 },
    { id: 'sw7', type: 'table', title: 'ทะเบียนที่ต้องดูแล',         dataset: 'registries', span: 3 },
  ],
};

let templates = [
  STANDARD_TEMPLATE,
  {
    id: 'sys-tpl-2',
    name: 'จอติดตามการใช้งานระบบ (TOR §1.17.4.3)',
    layout: 'two',
    locked: false,
    updatedAt: '26 สิงหาคม 2569',
    updatedBy: 'ผู้ดูแลระบบ PHCIS',
    widgets: [
      { id: 'sw8',  type: 'stat', title: 'สถิติการใช้งาน',            dataset: 'usage', span: 2 },
      { id: 'sw9',  type: 'bars', title: 'ยอดผู้ใช้งานรายเดือน',      dataset: 'usage', span: 2 },
      { id: 'sw10', type: 'hbar', title: 'ปริมาณการใช้งานแต่ละฟังก์ชัน', dataset: 'usage-functions', span: 2 },
    ],
  },
];

let defaultTemplateId = 'sys-std';

export const listDashboardTemplates = () =>
  templates.map((t) => ({ ...t, widgets: t.widgets.map((w) => ({ ...w })) }));

export const getDashboardTemplate = (id) =>
  listDashboardTemplates().find((t) => t.id === id) || null;

export const getDefaultDashboardTemplateId = () => defaultTemplateId;

export const setDefaultDashboardTemplate = (id) => {
  if (templates.some((t) => t.id === id)) defaultTemplateId = id;
};

export const saveDashboardTemplate = (tpl) => {
  const stamp = new Date().toLocaleDateString('th-TH', { dateStyle: 'long' });
  if (tpl.id && templates.some((t) => t.id === tpl.id)) {
    templates = templates.map((t) => (t.id === tpl.id
      ? { ...t, ...tpl, locked: t.locked, updatedAt: stamp }
      : t));
    return tpl.id;
  }
  TEMPLATE_SEQ += 1;
  const id = `sys-tpl-${TEMPLATE_SEQ}`;
  templates = [...templates, {
    ...tpl, id, locked: false, updatedAt: stamp, updatedBy: tpl.updatedBy || 'ผู้ดูแลระบบ PHCIS',
  }];
  return id;
};

export const deleteDashboardTemplate = (id) => {
  const target = templates.find((t) => t.id === id);
  if (!target || target.locked) return false;
  templates = templates.filter((t) => t.id !== id);
  if (defaultTemplateId === id) defaultTemplateId = 'sys-std';
  return true;
};
