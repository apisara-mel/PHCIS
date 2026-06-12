/* Consent Management is a SEPARATE top-level system (sibling of PHCIS),
   entered from the System Hub card. It reuses the shared <Sidebar> shell
   (same สำนักอนามัย header + user footer) but with its OWN menu — Figma
   "PHCIS | Consent" Side Menu (node 270:95324).

   Shared between ConsentManagementPage and CreateConsentFormPage so the
   consent side menu stays identical across the system. "สร้างแบบฟอร์มใหม่"
   points at the IN-CONSENT wizard (/consent/forms/new) — NOT the PHCIS
   forms library (/forms) — so creating a form never leaves the consent
   system. */
export const CONSENT_NAV = [
  { key: 'consent-dashboard', label: 'แดชบอร์ด',           icon: 'bar_chart_4_bars',     path: '/consent' },
  { key: 'consent-manage',    label: 'จัดการความยินยอม',    icon: 'assignment_turned_in', path: '/consent' },
  { key: 'consent-forms',     label: 'แบบฟอร์มความยินยอม',  icon: 'folder_open',          path: '/consent/forms' },
  { key: 'consent-new',       label: 'สร้างแบบฟอร์มใหม่',   icon: 'note_add',             path: '/consent/forms/new' },
  { key: 'consent-access',    label: 'จัดการสิทธิ์การเข้าถึง', icon: 'lock',               path: '/consent/access' },
  { key: 'consent-report',    label: 'สถิติและรายงาน',       icon: 'pie_chart',           path: '/consent/report' },
];

export default CONSENT_NAV;
