/** ปุ่ม "คำขอเข้าถึงข้อมูล" — แสดงเฉพาะหน้า PHCIS, ยกเว้นทุกหน้า dashboard
    (ระบบจัดการความยินยอมถอดออกจาก SubHeader แล้ว 25 ส.ค. 69). */

const normalizePath = (pathname = '') => {
  const bare = pathname.split('?')[0].replace(/\/+$/, '');
  return bare || '/';
};

/** ทุกหน้า dashboard (PHCIS · Consent · e-document ฯลฯ) */
export const isConsentRequestDashboardPath = (pathname = '') => {
  const path = normalizePath(pathname);
  return path === '/dashboard' || /\/dashboard$/.test(path);
};

/** หน้า consent ที่ไม่ต้องมีปุ่มสร้างคำขอใน SubHeader */
const CONSENT_NO_CREATE_ACTION_PATHS = new Set([
  '/consent',                      /* หน้าจัดการความยินยอมไม่มีปุ่มสร้างคำขอส่วนกลาง */
  '/consent/forms/request-access', /* ขอสิทธิ์ — มีฟอร์มสร้างคำขออยู่แล้ว */
  '/consent/access',               /* จัดการสิทธิ์ — หน้าคิว/อนุมัติ ไม่ใช่จุดสร้าง */
]);

const isConsentNoCreateActionPage = (path) => CONSENT_NO_CREATE_ACTION_PATHS.has(path);

/** ระบบระดับ Hub ที่ไม่ใช่ PHCIS / Consent */
const EXCLUDED_SYSTEM_PREFIXES = [
  '/forms',
  '/admin',
  '/audit',
  '/assess',
  '/schedule',
  '/hub',
  '/login',
  '/signin',
  '/kiosk',
  '/m',
  '/mobile',
  '/components',
  '/preview',
  '/doc-template',
  '/questionnaire',                /* แบบสัมภาษณ์ลูกค้า — เครื่องมือภายในทีม BA/SA */
];

const isExcludedSystem = (path) =>
  EXCLUDED_SYSTEM_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

const isConsentSystem = (path) => path === '/consent' || path.startsWith('/consent/');

/** SubHeader / page-title row — แสดงปุ่มสร้างคำขอเมื่ออยู่ใน PHCIS หรือ Consent และไม่ใช่ dashboard */
export const shouldShowCreateConsentRequestAction = (pathname = '') => {
  const path = normalizePath(pathname);
  if (isConsentRequestDashboardPath(path)) return false;
  if (isConsentNoCreateActionPage(path)) return false;
  if (isExcludedSystem(path)) return false;
  /* ระบบจัดการความยินยอมไม่มีปุ่มนี้ใน SubHeader แล้ว (มติผู้ใช้ 25 ส.ค. 69)
     — ยังใช้ได้จากหน้า PHCIS (เวชระเบียน / จ่ายยา ฯลฯ) ซึ่งเป็นจุดที่คนหน้างาน
     ขอสิทธิ์จริง ๆ ส่วนงานฝั่งผู้ดูแลอยู่ที่เมนู "จัดการสิทธิ์ฯ" ใน side menu */
  if (isConsentSystem(path)) return false;
  /* ที่เหลือภายใต้ Router หลัก = workflow PHCIS (Sidebar default nav) */
  return true;
};
