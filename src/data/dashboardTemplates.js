/* PHCIS | แดชบอร์ดภาพรวมโรงพยาบาล — Template / builder ของหน้า /dashboard
   (TOR §1.20.11 "รายงาน และ Dashboard อื่น ๆ ตามที่สำนักอนามัยกำหนด").

   ยึด logic ชุดเดียวกับ Consent Dashboard Builder (ด.1.1.12,
   `src/data/consentDashboardTemplates.js`): ทะเบียน template ระดับโมดูล,
   มี template มาตรฐานที่ล็อกไว้เป็น fallback, ตั้งค่าเริ่มต้นได้, บันทึก/ลบได้.
   ต่างกันที่ "widget" ของหน้านี้ไม่ใช่ chart ที่ประกอบเอง แต่เป็นการ์ดจริงที่
   หน้า /dashboard มีอยู่แล้ว — template จึงเก็บเป็น "รายการ + ลำดับ" ของการ์ด.

   Module-level mutable store — mock ใน session เดียว ไม่ persist. */

/* ── หมวดของการ์ด (ใช้จัดกลุ่มใน builder) ─────────────────────────────── */
export const DASHBOARD_WIDGET_GROUPS = [
  { key: 'overview', label: 'ภาพรวมการให้บริการ' },
  { key: 'clinical', label: 'คลินิก / กลุ่มโรค' },
  { key: 'analytic', label: 'รายงานเชิงวิเคราะห์' },
];

/* ── ทะเบียนการ์ดทั้งหมดบนหน้า /dashboard ─────────────────────────────────
   span = คลาส grid ของการ์ดบน 12-column grid (คงพฤติกรรม responsive เดิม
   ของแต่ละแถว: 4 ใบ/แถว, 2 ใบ/แถว, 3 ใบ/แถว, เต็มแถว)                    */
export const DASHBOARD_WIDGET_CATALOG = [
  { key: 'kpi',              group: 'overview', icon: 'analytics',      label: 'การ์ดสรุปภาพรวม (ประชากร/เกิด/ตาย/รับบริการ)', span: 'col-span-12' },
  { key: 'top10',            group: 'overview', icon: 'bar_chart',      label: 'Top 10 อันดับโรคที่พบบ่อย',                     span: 'col-span-12 lg:col-span-6 xl:col-span-3' },
  { key: 'visitTotal',       group: 'overview', icon: 'groups',         label: 'จำนวนการรับบริการรวม',                          span: 'col-span-12 lg:col-span-6 xl:col-span-3' },
  { key: 'agePyramid',       group: 'overview', icon: 'stacked_bar_chart', label: 'ผู้รับบริการตามกลุ่มอายุ',                   span: 'col-span-12 lg:col-span-6 xl:col-span-3' },
  { key: 'rights',           group: 'overview', icon: 'data_usage',     label: 'สัดส่วนสิทธิการรักษา',                          span: 'col-span-12 lg:col-span-6 xl:col-span-3' },
  { key: 'top10Short',       group: 'overview', icon: 'bar_chart',      label: 'Top 10 อันดับโรค (แบบย่อ)',                     span: 'col-span-12 lg:col-span-6' },
  { key: 'monthlyVisits',    group: 'overview', icon: 'show_chart',     label: 'จำนวนผู้รับบริการรายเดือน',                     span: 'col-span-12 lg:col-span-6' },

  { key: 'anc',              group: 'clinical', icon: 'pregnant_woman', label: 'ผลการฝากครรภ์ (ANC)',                           span: 'col-span-12' },
  { key: 'allergy',          group: 'clinical', icon: 'warning',        label: 'ผู้รับบริการที่มีการแพ้ยา',                      span: 'col-span-12' },
  { key: 'disease21',        group: 'clinical', icon: 'clinical_notes', label: 'ผู้รับบริการตาม 21 กลุ่มโรค',                    span: 'col-span-12 lg:col-span-6' },
  { key: 'dmhtNew',          group: 'clinical', icon: 'monitor_heart',  label: 'ผู้ป่วยเบาหวาน/ความดันรายใหม่',                  span: 'col-span-12 lg:col-span-6' },
  { key: 'dmGauge',          group: 'clinical', icon: 'speed',          label: 'อัตราคุมระดับน้ำตาลได้ (DM)',                    span: 'col-span-12 md:col-span-4' },
  { key: 'htGauge',          group: 'clinical', icon: 'speed',          label: 'อัตราคุมความดันได้ (HT)',                        span: 'col-span-12 md:col-span-4' },
  { key: 'workingAge',       group: 'clinical', icon: 'work',           label: 'กลุ่มวัยทำงาน',                                  span: 'col-span-12 md:col-span-4' },
  { key: 'coc',              group: 'clinical', icon: 'home_health',    label: 'การดูแลต่อเนื่อง (COC)',                         span: 'col-span-12 lg:col-span-4' },
  { key: 'consent',          group: 'clinical', icon: 'verified_user',  label: 'ความยินยอม (Consent)',                           span: 'col-span-12 lg:col-span-4' },
  { key: 'dmComplications',  group: 'clinical', icon: 'ecg_heart',      label: 'ภาวะแทรกซ้อนผู้ป่วยเบาหวาน',                     span: 'col-span-12 lg:col-span-4' },

  { key: 'telemed',          group: 'analytic', icon: 'stethoscope',    label: 'สถิติการปรึกษาทางไกล (Telemedicine)',            span: 'col-span-12' },
  { key: 'recentPatients',   group: 'analytic', icon: 'table_rows',     label: 'รายชื่อผู้รับบริการล่าสุด',                       span: 'col-span-12' },
  { key: 'populationPyramid',group: 'analytic', icon: 'stacked_bar_chart', label: 'ปิรามิดประชากร',                              span: 'col-span-12' },
  { key: 'opdTypeLine',      group: 'analytic', icon: 'show_chart',     label: 'แนวโน้มผู้รับบริการ OPD ตามประเภท',              span: 'col-span-12' },
  { key: 'residencePie',     group: 'analytic', icon: 'data_usage',     label: 'สัดส่วนตามพื้นที่อยู่อาศัย',                      span: 'col-span-12' },
  { key: 'serviceCenterMap', group: 'analytic', icon: 'map',            label: 'แผนที่ศูนย์บริการสาธารณสุข',                      span: 'col-span-12' },
];

export const widgetMeta = (key) => DASHBOARD_WIDGET_CATALOG.find((w) => w.key === key) || null;

export const widgetLabel = (key) => widgetMeta(key)?.label || key;

/* ลำดับมาตรฐาน = ลำดับที่หน้าจอ /dashboard แสดงอยู่เดิมทุกใบ */
export const ALL_WIDGET_KEYS = DASHBOARD_WIDGET_CATALOG.map((w) => w.key);

/* เรียง key ตามลำดับใน catalog — ใช้ตอนติ๊กเพิ่ม widget ใน builder */
export const sortWidgetKeys = (keys) =>
  ALL_WIDGET_KEYS.filter((k) => keys.includes(k));

/* ── spec สำหรับป๊อปอัปตัวสร้างเทมเพลต (ใช้ wizard ตัวเดียวกับความยินยอม) ──
   ป๊อปอัปนั้นรับ catalog เข้ามาเป็น prop อยู่แล้ว จึงส่งของฝั่ง PHCIS ให้ได้เลย
   ไม่ต้องมีตัวสร้างสองชุด (มติผู้ใช้ 27 ส.ค. 69) */
export const DASHBOARD_LAYOUTS = [
  { key: 'two',   title: '2 โซน', subtitle: 'การ์ดใหญ่ 2 คอลัมน์ เหมาะกับกราฟ', columns: 2 },
  { key: 'three', title: '3 โซน', subtitle: 'สมดุลการ์ดสถิติ + กราฟ',           columns: 3 },
  { key: 'four',  title: '4 โซน', subtitle: 'การ์ดสถิติจำนวนมาก (stat-heavy)',  columns: 4 },
];

/* กี่โซนที่การ์ดใบนั้นควรกินโดยปริยาย — แปลจากคลาส grid ในแคตตาล็อก
   (เต็มแถว → 4, ครึ่งแถว → 2, ที่เหลือ → 1) */
const defaultZonesOf = (span = '') => {
  if (span.includes('lg:col-span-6')) return 2;
  if (span.includes('col-span-3') || span.includes('col-span-4')) return 1;
  return 4;
};

export const WIDGET_TYPES = DASHBOARD_WIDGET_CATALOG.map((w) => ({
  key: w.key,
  label: w.label,
  icon: w.icon,
  description: DASHBOARD_WIDGET_GROUPS.find((g) => g.key === w.group)?.label || '',
}));

/* การ์ดของหน้านี้ผูกกับชุดข้อมูลของแดชบอร์ดโรงพยาบาลอยู่แล้ว ไม่มีให้เลือกหลายชุด
   เหมือนฝั่งความยินยอม — ใส่ไว้ชุดเดียวเพื่อให้ wizard ตัวเดียวกันใช้ได้ */
export const WIDGET_DATASETS = [
  { key: 'phcis', label: 'ข้อมูลแดชบอร์ดโรงพยาบาล' },
];
export const WIDGET_TYPE_DATASETS = Object.fromEntries(
  DASHBOARD_WIDGET_CATALOG.map((w) => [w.key, ['phcis']]),
);
export const WIDGET_DEFAULT_SPAN = Object.fromEntries(
  DASHBOARD_WIDGET_CATALOG.map((w) => [w.key, defaultZonesOf(w.span)]),
);

let TEMPLATE_SEQ = 2;

/* ── เทมเพลตมาตรฐาน (ลบไม่ได้ — เป็น fallback ของค่าเริ่มต้น) ─────────── */
const asWidgets = (keys) => keys.map((key, i) => ({
  id: `w-${key}-${i}`,
  type: key,
  title: DASHBOARD_WIDGET_CATALOG.find((w) => w.key === key)?.label || key,
  dataset: 'phcis',
  span: WIDGET_DEFAULT_SPAN[key] || 1,
}));

const STANDARD_TEMPLATE = {
  id: 'std',
  name: 'แดชบอร์ดมาตรฐาน (ภาพรวมโรงพยาบาล)',
  layout: 'four',
  locked: true,
  updatedAt: '1 สิงหาคม 2569',
  updatedBy: 'ระบบ',
  widgets: asWidgets(ALL_WIDGET_KEYS),
};

let templates = [
  STANDARD_TEMPLATE,
  {
    id: 'tpl-2',
    name: 'จอเฝ้าระวังโรคเรื้อรัง (NCD)',
    layout: 'three',
    locked: false,
    updatedAt: '2 สิงหาคม 2569',
    updatedBy: 'ลดา ดีงาม',
    widgets: asWidgets(['kpi', 'disease21', 'dmhtNew', 'dmGauge', 'htGauge', 'workingAge', 'dmComplications', 'recentPatients']),
  },
];

let defaultTemplateId = 'std';

/* ── Store API (mock — mutate ในหน่วยความจำ) ──────────────────────────── */
export const listDashboardTemplates = () =>
  templates.map((t) => ({ ...t, widgets: t.widgets.map((w) => (typeof w === 'string' ? w : { ...w })) }));

export const getDashboardTemplate = (id) =>
  listDashboardTemplates().find((t) => t.id === id) || null;

export const getDefaultDashboardTemplateId = () => defaultTemplateId;

export const getDefaultDashboardTemplate = () =>
  getDashboardTemplate(defaultTemplateId) || getDashboardTemplate('std');

export const setDefaultDashboardTemplate = (id) => {
  if (templates.some((t) => t.id === id)) defaultTemplateId = id;
};

export const saveDashboardTemplate = (tpl) => {
  const stamp = new Date().toLocaleDateString('th-TH', { dateStyle: 'long' });
  /* ลำดับที่ผู้ใช้จัดเองใน builder เป็นลำดับที่หน้าจอ render จริง */
  const widgets = [...(tpl.widgets || [])];
  if (tpl.id && templates.some((t) => t.id === tpl.id)) {
    templates = templates.map((t) => (
      t.id === tpl.id ? { ...t, ...tpl, widgets, locked: t.locked, updatedAt: stamp } : t
    ));
    return tpl.id;
  }
  const id = `tpl-${++TEMPLATE_SEQ}`;
  templates = [...templates, {
    ...tpl,
    id,
    widgets,
    locked: false,
    updatedAt: stamp,
    updatedBy: tpl.updatedBy || 'ลดา ดีงาม',
  }];
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
