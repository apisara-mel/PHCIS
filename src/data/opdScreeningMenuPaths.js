/** Routes ภายใต้ Sidebar · คัดกรองและซักประวัติ (`opd` + subItems). */

const normalizePath = (pathname = '') => {
  const bare = pathname.split('?')[0].replace(/\/+$/, '');
  return bare || '/';
};

/* หมายเหตุ: เมนู "คัดกรอง" ไม่มีรายการย่อยรายคลินิกแล้ว (จุดคัดกรองเดียว)
   รายชื่อ prefix ด้านล่างจึงไม่ได้สะท้อน `opd.subItems` อีกต่อไป — เก็บไว้เพราะ
   `QueuePageShell` ใช้ตัดสินว่าจะยก `summaryTitle` ขึ้นไปเป็นหัวข้อใน SubHeader
   ของหน้าเหล่านี้หรือไม่ (เรื่อง layout ล้วน ๆ ไม่เกี่ยวกับ active menu)
   ถ้าจะแก้ ต้องดูหน้าคลินิกทั้ง 7 ที่พึ่งกฎนี้อยู่ด้วย */
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
