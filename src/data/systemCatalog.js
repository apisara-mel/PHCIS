/* MIH · System catalog — shared between SystemHubPage and the Header
   apps-grid launcher (SystemGridMenu). Order matches Figma PHCIS-Signin
   hub grid left→right, top→bottom (9 tiles, 3×3). Icons are single
   composed SVGs from public/illustration/hub/. */

export const SYSTEM_CATALOG = [
  {
    key: 'phcis',
    illustration: '/illustration/hub/icon-phcis.svg',
    title: 'ระบบ PHCIS',
    gridLabel: 'ระบบ PHCIS',
    desc: 'ระบบสารสนเทศศูนย์บริการสาธารณสุข สำหรับบริหารจัดการข้อมูลผู้ป่วย การรักษา และการบริการระดับปฐมภูมิอย่างครบวงจร',
    lastUsed: 'วันนี้, 08:30 น.',
    route: '/dashboard',
  },
  {
    key: 'community-health',
    illustration: '/illustration/hub/icon-community-health.svg',
    title: 'ระบบงานสาธารณสุขและระบบงานควบคุมป้องกันและส่งเสริมสุขภาพในชุมชน',
    gridLabel: 'งานสาธารณสุชุมชน',
    desc: 'แพลตฟอร์มจัดการข้อมูลงานสาธารณสุข การเฝ้าระวังโรคติดต่อ และการส่งเสริมสุขภาพเชิงรุกในระดับพื้นที่และชุมชน',
    lastUsed: 'วันนี้, 08:30 น.',
    route: null,
  },
  {
    key: 'school-health',
    illustration: '/illustration/hub/icon-school-health.svg',
    title: 'ระบบสุขภาพนักเรียน',
    gridLabel: 'สุขภาพนักเรียน',
    desc: 'ระบบจัดเก็บข้อมูลประวัติสุขภาพ การฉีดวัคซีน และการเฝ้าระวังพัฒนาการของเด็กนักเรียนในสถานศึกษา',
    lastUsed: 'วันนี้, 08:30 น.',
    route: null,
  },
  {
    key: 'inventory',
    illustration: '/illustration/hub/icon-inventory.svg',
    title: 'ระบบคลังยาและเวชภัณฑ์',
    gridLabel: 'คลังยาและเวชภัณฑ์',
    desc: 'ระบบควบคุมและติดตามการเบิกจ่าย การจัดซื้อ และการคงคลังของยา วัสดุทางการแพทย์ และเวชภัณฑ์ต่างๆ',
    lastUsed: 'วันนี้, 08:30 น.',
    route: '/pharmacy/stock',
  },
  {
    key: 'schedule',
    illustration: '/illustration/hub/icon-schedule.svg',
    title: 'ระบบจัดตารางเวร',
    gridLabel: 'จัดตารางเวร',
    desc: 'จัดตารางเวรบุคลากร กำหนด แก้ไข และติดตามชั่วโมงการทำงานรายเดือน',
    lastUsed: 'วันนี้, 08:30 น.',
    route: '/schedule',
  },
  {
    key: 'consent',
    illustration: '/illustration/hub/icon-consent.svg',
    title: 'ระบบจัดการความยินยอม',
    gridLabel: 'จัดการความยินยอม',
    desc: 'จัดการความยินยอมเปิดเผยข้อมูลส่วนบุคคล (PDPA) — กำหนด แก้ไข และติดตามสถานะ รอลงนาม ยินยอมแล้ว ปฏิเสธ และหมดอายุ',
    lastUsed: 'วันนี้, 08:30 น.',
    route: '/consent/dashboard',
  },
  {
    key: 'doc-template',
    illustration: '/illustration/hub/icon-doc-template.svg',
    title: 'คลังเอกสาร e-document',
    gridLabel: 'คลังเอกสาร e-document',
    desc: 'รวมแม่แบบเอกสารทางการแพทย์ แบบฟอร์มยินยอมการรักษา/ผลแล็บ/เคลม และเอกสารออกจากระบบ — นอกเหนือจากความยินยอมเปิดเผยข้อมูล (PDPA) ในระบบจัดการความยินยอม',
    lastUsed: 'วันนี้, 08:30 น.',
    route: '/forms/dashboard',
  },
  {
    key: 'audit',
    illustration: '/illustration/hub/icon-audit.svg',
    title: 'ประวัติการใช้งาน',
    gridLabel: 'ประวัติการใช้งาน',
    desc: 'บันทึกกิจกรรมทุกอย่างที่เกิดขึ้นในระบบแบบอัตโนมัติ ครอบคลุมการสร้าง แก้ไข ลบ และเข้าถึงข้อมูล Consent ของผู้ใช้ทุกคน',
    lastUsed: 'วันนี้, 08:30 น.',
    route: '/audit',
  },
  {
    key: 'admin',
    illustration: '/illustration/hub/icon-admin.svg',
    title: 'จัดการระบบ',
    gridLabel: 'จัดการระบบ',
    desc: 'ศูนย์กลางสำหรับผู้ดูแลระบบในการกำหนดโครงสร้างและนโยบายการใช้งานทั้งหมด การกำหนด Role และสิทธิ์การเข้าถึงของผู้ใช้แต่ละคน',
    lastUsed: 'วันนี้, 08:30 น.',
    route: '/admin',
  },
];

/* ตั้งใจไม่อยู่ในแคตตาล็อกนี้ — /kiosk, /m (mobile), /telemed และ
   /queue-center (ระบบบริหารจัดการคิว + จอ TV, TOR §1.3):
   ทั้งหมดเป็น sub-system **ภายใน** PHCIS ไม่ใช่ระบบระดับเดียวกับ PHCIS จึงเข้า
   ผ่านเมนู Sidebar ของ PHCIS แทน (queue-center และ telemed อยู่ใน ITEMS ของ
   Sidebar.jsx — telemed เป็นเมนูที่มี subItems: worklist / RPM / consent /
   reports โดยรายการหลักชี้ /telemed/worklist ไม่ใช่ /telemed ที่เปิดสายทันที).
   อีกสองเหตุผลเชิงกลไก: ทุกรายการที่นี่ต้องมีภาพประกอบใน public/illustration/hub/
   ซึ่งยังไม่มีของคิว และ SYSTEM_CATALOG_ROWS ข้างล่างตัดเป็น 3×3 พอดี — รายการ
   ที่ 10 ขึ้นไปจะไม่ถูก render เลย. ถ้าจะเพิ่มจริงต้องแก้ทั้ง grid และเพิ่ม asset. */

/** 3×3 rows for hub grid + apps-grid overlay (Figma 359:129936). */
export const SYSTEM_CATALOG_ROWS = [
  SYSTEM_CATALOG.slice(0, 3),
  SYSTEM_CATALOG.slice(3, 6),
  SYSTEM_CATALOG.slice(6, 9),
];

export default SYSTEM_CATALOG;
