/* ระบบจัดการระบบ (PHCIS | Assess control) — side menu.
   Single source of truth for the admin/assess Side Menu, matching the Figma
   "Side Menu · System=Assess control" (node 17:25402 Open / 1:2559 Hide).
   The shared <Sidebar> renders the Open/Hide (expand/collapse) states; this
   list only defines the menu items, their icons (Material Symbols) and routes.

   Keys are chosen to cover the activeKey every admin/assess page already
   passes, so both the /admin/* and /assess/* page sets show ONE identical
   menu without per-page edits. (SystemRolesPage keeps its own /admin/roles
   route but is no longer surfaced here — replaced by "สิทธิ์การเข้าถึงระบบ".) */
/* แท็บของเมนู "โครงสร้างองค์กรและสิทธิ์" — แหล่งความจริงเดียวของทั้งแถบแท็บ
   (OrgStructureSubNav) และของสิทธิ์ระดับเมนูย่อย (accessMenuCatalog).
   key ยังเป็นคีย์เดิมของทั้ง 5 หน้า จึงยังตรงกับ route/หน้าที่มีอยู่. */
export const ORG_STRUCTURE_TABS = [
  { key: 'system-structures',     label: 'รูปแบบโครงสร้างศูนย์', path: '/admin/structures'      },
  { key: 'system-centers',        label: 'ศูนย์บริการ',          path: '/admin/centers'         },
  { key: 'assess-positions',      label: 'ตำแหน่ง',              path: '/assess/positions'      },
  { key: 'assess-activity',       label: 'บทบาท',                path: '/assess/activities'     },
  { key: 'assess-access-control', label: 'สิทธิ์การเข้าถึงระบบ',  path: '/assess/access-control' },
];

export const SYSTEM_NAV = [
  { key: 'system-overview',       label: 'แดชบอร์ด',        icon: 'bar_chart_4_bars', path: '/admin' },
  /* โครงสร้างองค์กรและสิทธิ์ — 5 หน้าที่เคยเป็น 5 เมนูแยก ยุบเป็นเมนูเดียว
     29 ส.ค. 69 (มติผู้ใช้) สลับหน้ากันด้วยแท็บ TabUnderline ของ
     `components/system/OrgStructureSubNav.jsx` แบบเดียวกับ pharmacy / lab /
     homevisit — ไม่ใช่ `subItems` เพราะ subItems กาง SideSubMenu ข้างราง แทนที่
     จะพาไปหน้าแรกของกลุ่ม. ลำดับแท็บ = ลำดับขั้นตอนตั้งค่าจริง:
       รูปแบบโครงสร้างศูนย์ (แม่แบบแผนก/คลินิก + ห้องตรวจ/เตียง ตั้งครั้งเดียว
       ใช้ซ้ำได้) → ศูนย์บริการ → ตำแหน่ง → บทบาท → สิทธิ์ของบทบาทนั้น
     `tabItems` ไม่ถูก Sidebar ใช้เลย — มีไว้ให้ accessMenuCatalog แตกสิทธิ์
     ถึงระดับเมนูย่อยได้เหมือนตอนยังเป็น 5 เมนู (มติผู้ใช้ 26 ส.ค. 69) */
  {
    key: 'system-org',
    label: 'โครงสร้างองค์กรและสิทธิ์',
    icon: 'corporate_fare',
    path: '/admin/structures',
    tabItems: ORG_STRUCTURE_TABS,
  },
  /* "แผนก" ถูกซ่อนจากเมนู 10 ส.ค. 2569 — แผนกไม่ใช่ทะเบียนลอย ๆ อีกต่อไป แต่
     ผูกกับศูนย์บริการ สร้าง/แก้ที่ step "แผนกและคลินิก" ของหน้าเพิ่มศูนย์บริการ
     ตามลำดับชั้น แผนก → คลินิก → ห้อง/เตียง. route /assess/departments ยังเปิด
     อยู่สำหรับลิงก์เดิม แค่ไม่มีเมนูของตัวเอง — แบบเดียวกับ SystemRolesPage. */
  { key: 'system-staff',          label: 'บุคลากร',          icon: 'group',            path: '/assess/users' },
  /* มาสเตอร์การเยี่ยมบ้าน — ผู้ดูแลระบบตั้งเพดาน สปสช. และรอบติดตามระดับ
     สำนักอนามัย; งานคิว/ทะเบียน/บันทึกยังอยู่ที่ rail `homevisit` ตามเดิม. */
  { key: 'system-homevisit',      label: 'ตั้งค่าการเยี่ยมบ้าน', icon: 'home_health',   path: '/admin/homevisit-settings' },
  /* ซ่อนชั่วคราว 26 ส.ค. 69 (มติผู้ใช้) — route /opd/room-config ยังเข้าได้ตาม
     ลิงก์เดิม เอากลับมาโดยลบคอมเมนต์ออก
       TOR §1.2.7 — ห้องตรวจ × แพทย์ประจำห้อง + โควตารายวัน (เดิมอยู่เมนู OPD)
  { key: 'system-opd-room-config', label: 'ตั้งค่าห้องตรวจและโควตารายวัน', icon: 'meeting_room', path: '/opd/room-config' },
  */
  /* ด.1.1.18 — matrix สิทธิเข้าถึงข้อมูลผู้ป่วยตามระดับความยินยอม: ถอดออกจากเมนู
     25 ส.ค. 69 (มติผู้ใช้) route /assess/consent-access-rights ยังเข้าได้ตามลิงก์เดิม */
  /* EMR §1.4.2.1 — การจัดการข้อมูลลับ: ถอดออกจากเมนู 25 ส.ค. 69 (มติผู้ใช้)
     route /admin/confidential-data ยังเข้าได้ตามลิงก์เดิม */
  /* ซ่อนชั่วคราว 26 ส.ค. 69 (มติผู้ใช้ — "วันหลังจะเอากลับมา"): route ทั้งคู่ยัง
     เปิดอยู่ตามลิงก์เดิม แค่ไม่มีเมนูของตัวเอง เอากลับมาโดยลบคอมเมนต์ออก
       • CPOE §1.5.7 — ชุด preset กลาง แบ่งตามอาการ/โรค พร้อมกำหนดผู้มีสิทธิ์ใช้งาน
       • ทะเบียนยา — master data ของเภสัช หน้าเภสัชปฏิบัติการยัง deep-link เข้าได้
  { key: 'system-order-sets', label: 'ชุดคำสั่งการรักษา', icon: 'playlist_add', path: '/admin/order-sets' },
  { key: 'system-pharmacy-registry', label: 'ทะเบียนยา', icon: 'medication', path: '/admin/pharmacy/registry' },
  */
  /* ทะเบียนรายการตรวจ (Lab) — master data ของห้องปฏิบัติการ: รายการตรวจ รหัส
     TMLT/LOINC หลอด/สิ่งส่งตรวจ และข้อมูลบนสติกเกอร์. ย้ายมาจากแท็บในงานชันสูตร
     โรค 28 ส.ค. 69 (มติผู้ใช้) — เป็นของที่ผู้ดูแลระบบตั้ง ไม่ใช่ของที่เจ้าหน้าที่
     หน้าเบนช์แก้ระหว่างทำงาน. route เดิม /lab/setup redirect มาที่นี่ */
  { key: 'system-lab-registry',   label: 'ทะเบียนรายการตรวจ', icon: 'biotech',    path: '/admin/lab/registry' },
  /* วันหยุดประจำปี — ทะเบียนกลางตามประกาศสำนักนายกฯ ใช้ร่วมกันทุกศูนย์
     ย้ายมาไว้ล่างสุดของเมนู 25 ส.ค. 69 (มติผู้ใช้) */
  { key: 'system-holidays',       label: 'วันหยุดประจำปี',   icon: 'event_busy',       path: '/admin/holidays' },
  /* เทมเพลตแดชบอร์ด — ตัวสร้างย้ายมาจากหน้าแดชบอร์ดมาเป็นงานผู้ดูแลระบบ
     (มติผู้ใช้ 27 ส.ค. 69) หน้าแดชบอร์ดเหลือแค่ "เลือกใช้" */
  { key: 'system-dashboard-templates', label: 'เทมเพลตแดชบอร์ด', icon: 'dashboard_customize', path: '/admin/dashboard-templates' },
  /* เมนูนี้คือ "ตั้งค่าอุปกรณ์คิว" ของจัดการระบบ — ตู้กดบัตรคิวและจอแสดงผล
     (มติผู้ใช้ 31 ส.ค. 69) ชื่อเดิม "ระบบบริหารจัดการคิว" ทับกับระบบคิวฝั่ง
     ปฏิบัติการใน PHCIS (ออกคิว/เรียกคิว) ซึ่งเป็นคนละเมนูกัน */
  { key: 'queue-center', label: 'ตู้กดบัตรคิวและจอแสดงผล', icon: 'campaign', path: '/queue-center/kiosk-settings' },
];

export default SYSTEM_NAV;
