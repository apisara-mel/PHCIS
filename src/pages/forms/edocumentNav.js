/* คลังเอกสาร e-document — separate top-level system (sibling of PHCIS /
   ระบบจัดการความยินยอม), entered from the System Hub card. Reuses the
   shared <Sidebar> shell with its own menu — not a PHCIS sidebar item.

   Path order matters: `/forms/dashboard` must precede `/forms` so Sidebar
   path-prefix matching highlights the dashboard item correctly. */

export const EDOCUMENT_NAV = [
  { key: 'edocument-dashboard', label: 'แดชบอร์ด', icon: 'bar_chart_4_bars', path: '/forms/dashboard' },
  { key: 'edocument-catalog', label: 'คลังเอกสาร e-document ทั้งหมด', icon: 'folder_open', path: '/forms' },
  { key: 'edocument-new', label: 'สร้างเอกสาร e-document ใหม่', icon: 'note_add', path: '/doc-template/new' },
];

export const EDOCUMENT_BRAND_TITLE = 'คลังเอกสาร e-document';

export default EDOCUMENT_NAV;
