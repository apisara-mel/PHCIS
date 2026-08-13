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
  /* แม่แบบโครงสร้างภายในศูนย์ (แผนก/คลินิก + ห้องตรวจ/เตียง) ตั้งไว้ครั้งเดียว
     แล้วเลือกใช้ซ้ำได้ตอนเพิ่มศูนย์บริการ — อยู่ต่อจากศูนย์บริการเพราะผูกกัน */
  { key: 'system-structures',     label: 'รูปแบบโครงสร้างศูนย์', icon: 'account_tree',  path: '/admin/structures' },
  { key: 'assess-group-policy',   label: 'Group Policy',    icon: 'business_center',  path: '/assess/group-policy' },
  /* "แผนก" ถูกซ่อนจากเมนู 10 ส.ค. 2569 — แผนกไม่ใช่ทะเบียนลอย ๆ อีกต่อไป แต่
     ผูกกับศูนย์บริการ สร้าง/แก้ที่ step "แผนกและคลินิก" ของหน้าเพิ่มศูนย์บริการ
     ตามลำดับชั้น แผนก → คลินิก → ห้อง/เตียง. route /assess/departments ยังเปิด
     อยู่สำหรับลิงก์เดิม แค่ไม่มีเมนูของตัวเอง — แบบเดียวกับ SystemRolesPage. */
  /* TOR §1.2.7 — ห้องตรวจ × แพทย์ประจำห้อง + โควตารายวัน (เดิมอยู่เมนู OPD) */
  { key: 'system-opd-room-config', label: 'ตั้งค่าห้องตรวจและโควตารายวัน', icon: 'meeting_room', path: '/opd/room-config' },
  { key: 'assess-positions',      label: 'ตำแหน่ง',          icon: 'account_tree',     path: '/assess/positions' },
  { key: 'assess-access-control', label: 'สิทธิการเข้าถึง',   icon: 'how_to_reg',       path: '/assess/access-control' },
  /* ด.1.1.18 — matrix สิทธิเข้าถึงข้อมูลผู้ป่วยตามระดับความยินยอม (เพิ่ม/ยกเลิกสิทธิ) */
  { key: 'system-consent-access-rights', label: 'สิทธิตามความยินยอม', icon: 'verified_user', path: '/assess/consent-access-rights' },
  /* EMR §1.4.2.1 — การจัดการข้อมูลลับ (ย้ายจาก ระบบประวัติการใช้งาน) */
  { key: 'system-confidential-data', label: 'การจัดการข้อมูลลับ', icon: 'enhanced_encryption', path: '/admin/confidential-data' },
  /* Pharmacy master data belongs to central settings. Operational pharmacy
     screens keep a CTA shortcut that deep-links to the create route. */
  { key: 'system-pharmacy-registry', label: 'ทะเบียนยา', icon: 'medication', path: '/admin/pharmacy/registry' },
  { key: 'system-staff',          label: 'บุคลากร',          icon: 'group',            path: '/assess/users' },
];

export default SYSTEM_NAV;
