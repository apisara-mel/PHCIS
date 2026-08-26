/* ระบบจัดการระบบ (PHCIS | Assess control) — side menu.
   Single source of truth for the admin/assess Side Menu, matching the Figma
   "Side Menu · System=Assess control" (node 17:25402 Open / 1:2559 Hide).
   The shared <Sidebar> renders the Open/Hide (expand/collapse) states; this
   list only defines the menu items, their icons (Material Symbols) and routes.

   Keys are chosen to cover the activeKey every admin/assess page already
   passes, so both the /admin/* and /assess/* page sets show ONE identical
   menu without per-page edits. (SystemRolesPage keeps its own /admin/roles
   route but is no longer surfaced here — replaced by "สิทธิ์การเข้าถึงระบบ".) */
export const SYSTEM_NAV = [
  { key: 'system-overview',       label: 'แดชบอร์ด',        icon: 'bar_chart_4_bars', path: '/admin' },
  /* แม่แบบโครงสร้างภายในศูนย์ (แผนก/คลินิก + ห้องตรวจ/เตียง) ตั้งไว้ครั้งเดียว
     แล้วเลือกใช้ซ้ำได้ตอนเพิ่มศูนย์บริการ — ย้ายมาต่อจากแดชบอร์ด 25 ส.ค. 69 (มติผู้ใช้)
     เพราะเป็นของที่ตั้งก่อนเริ่มเพิ่มศูนย์ */
  { key: 'system-structures',     label: 'รูปแบบโครงสร้างศูนย์', icon: 'account_tree',  path: '/admin/structures' },
  { key: 'system-centers',        label: 'ศูนย์บริการ',      icon: 'domain',           path: '/admin/centers' },
  /* ตำแหน่งอยู่ใต้ศูนย์บริการ — ตั้งผังคน/ตำแหน่งต่อจากผังศูนย์ (25 ส.ค. 69 มติผู้ใช้) */
  { key: 'assess-positions',      label: 'ตำแหน่ง',          icon: 'account_tree',     path: '/assess/positions' },
  /* บทบาท (Activity-based Access Control) — แทน Group Policy เดิม 22 ส.ค. 2569
     ลำดับชั้น บทบาทหลัก → บทบาทย่อย; route เดิม /assess/group-policy redirect มาที่นี่
     ป้ายเมนูเปลี่ยนจาก "กิจกรรม" เป็น "บทบาท" 25 ส.ค. 2569 (route/key คงเดิม) */
  { key: 'assess-activity',       label: 'บทบาท',            icon: 'business_center',  path: '/assess/activities' },
  /* "แผนก" ถูกซ่อนจากเมนู 10 ส.ค. 2569 — แผนกไม่ใช่ทะเบียนลอย ๆ อีกต่อไป แต่
     ผูกกับศูนย์บริการ สร้าง/แก้ที่ step "แผนกและคลินิก" ของหน้าเพิ่มศูนย์บริการ
     ตามลำดับชั้น แผนก → คลินิก → ห้อง/เตียง. route /assess/departments ยังเปิด
     อยู่สำหรับลิงก์เดิม แค่ไม่มีเมนูของตัวเอง — แบบเดียวกับ SystemRolesPage. */
  /* ลำดับตามขั้นตอนตั้งค่าจริง: บทบาท → สิทธิ์ของบทบาทนั้น → คนที่ถือสิทธิ์
     (26 ส.ค. 69 มติผู้ใช้) */
  { key: 'assess-access-control', label: 'สิทธิ์การเข้าถึงระบบ',   icon: 'how_to_reg',       path: '/assess/access-control' },
  { key: 'system-staff',          label: 'บุคลากร',          icon: 'group',            path: '/assess/users' },
  /* TOR §1.2.7 — ห้องตรวจ × แพทย์ประจำห้อง + โควตารายวัน (เดิมอยู่เมนู OPD) */
  { key: 'system-opd-room-config', label: 'ตั้งค่าห้องตรวจและโควตารายวัน', icon: 'meeting_room', path: '/opd/room-config' },
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
  /* วันหยุดประจำปี — ทะเบียนกลางตามประกาศสำนักนายกฯ ใช้ร่วมกันทุกศูนย์
     ย้ายมาไว้ล่างสุดของเมนู 25 ส.ค. 69 (มติผู้ใช้) */
  { key: 'system-holidays',       label: 'วันหยุดประจำปี',   icon: 'event_busy',       path: '/admin/holidays' },
];

export default SYSTEM_NAV;
