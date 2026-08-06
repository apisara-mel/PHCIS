/** Routes ภายใต้ Sidebar · คัดกรองและซักประวัติ (`opd` + subItems). */

const normalizePath = (pathname = '') => {
  const bare = pathname.split('?')[0].replace(/\/+$/, '');
  return bare || '/';
};

/** Prefixes from Sidebar.jsx `opd.subItems` + core `/opd/*` workflow. */
export const OPD_SCREENING_MENU_PATH_PREFIXES = [
  '/opd',
  '/clinic/hiv-sti',
  '/clinic/addiction',
  '/clinic/ncd',
  '/clinic/dental',
  '/clinic/tb',
  '/clinic/mental-health',
  '/treat/anc', /* ฝากครรภ์ — รายการใน SideSubMenu ของเมนู คัดกรองและซักประวัติ */
];

export const isOpdScreeningMenuPath = (pathname = '') => {
  const path = normalizePath(pathname);
  return OPD_SCREENING_MENU_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
};
