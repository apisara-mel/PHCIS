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
  /* ด.1.1.12 — แดชบอร์ดมีหน้าจริงของตัวเองแล้ว (เดิมชี้ /consent) */
  { key: 'consent-dashboard', label: 'แดชบอร์ด',           icon: 'bar_chart_4_bars',     path: '/consent/dashboard' },
  { key: 'consent-manage',    label: 'จัดการความยินยอม',    icon: 'assignment_turned_in', path: '/consent' },
  { key: 'consent-forms',     label: 'แบบฟอร์มความยินยอม',  icon: 'folder_open',          path: '/consent/forms' },
  { key: 'consent-new',       label: 'สร้างแบบฟอร์มใหม่',   icon: 'note_add',             path: '/consent/forms/new' },
  { key: 'consent-request-access', label: 'ขอสิทธิ์การเข้าถึงแบบฟอร์ม', icon: 'upload_file', path: '/consent/forms/request-access' },
  { key: 'consent-access',    label: 'จัดการสิทธิ์การเข้าถึงแบบฟอร์ม', icon: 'lock', path: '/consent/access' },
];

export default CONSENT_NAV;
