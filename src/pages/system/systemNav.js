/* ระบบจัดการระบบ (PHCIS | Assess control) — side menu.
   Single source of truth for the admin/assess Side Menu, matching the Figma
   "Side Menu · System=Assess control" (node 17:25402 Open / 1:2559 Hide).
   The shared <Sidebar> renders the Open/Hide (expand/collapse) states; this
   list only defines the menu items, their icons (Material Symbols) and routes.

   Keys are chosen to cover the activeKey every admin/assess page already
   passes, so both the /admin/* and /assess/* page sets show ONE identical
   menu without per-page edits. (SystemRolesPage keeps its own /admin/roles
   route but is no longer surfaced here — replaced by "สิทธิการเข้าถึง".) */
export const SYSTEM_NAV = [
  { key: 'system-overview',       label: 'แดชบอร์ด',        icon: 'bar_chart_4_bars', path: '/admin' },
  { key: 'system-centers',        label: 'ศูนย์บริการ',      icon: 'domain',           path: '/admin/centers' },
  { key: 'assess-group-policy',   label: 'Group Policy',    icon: 'business_center',  path: '/assess/group-policy' },
  { key: 'assess-departments',    label: 'แผนก',            icon: 'local_hospital',   path: '/assess/departments' },
  { key: 'assess-positions',      label: 'ตำแหน่ง',          icon: 'account_tree',     path: '/assess/positions' },
  { key: 'assess-access-control', label: 'สิทธิการเข้าถึง',   icon: 'how_to_reg',       path: '/assess/access-control' },
  /* ด.1.1.18 — matrix สิทธิเข้าถึงข้อมูลผู้ป่วยตามระดับความยินยอม (เพิ่ม/ยกเลิกสิทธิ) */
  { key: 'system-consent-access-rights', label: 'สิทธิตามความยินยอม', icon: 'verified_user', path: '/assess/consent-access-rights' },
  { key: 'system-staff',          label: 'บุคลากร',          icon: 'group',            path: '/assess/users' },
];

export default SYSTEM_NAV;
