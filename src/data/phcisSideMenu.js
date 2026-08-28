/* PHCIS — เมนูข้าง (Side Menu) ของระบบ PHCIS
   ══════════════════════════════════════════════════════════════════════
   ย้ายออกจาก <Sidebar> เมื่อ 26 ส.ค. 2569 เพื่อให้เป็น "แหล่งความจริงเดียว"
   ที่ใช้ได้ทั้งการวาดเมนูจริง และการกำหนดสิทธิ์การเข้าถึงระบบ (ระดับ
   ระบบ → เมนู → เมนูย่อย ใน accessMenuCatalog) — เดิมโครงนี้ฝังอยู่ใน
   Sidebar.jsx จึงอ้างอิงจากที่อื่นไม่ได้.

   Icon names = Material Symbols Outlined glyphs (โหลดใน index.html)
   map มาจาก Figma SideMenu (node 1:2363, PHCIS · Open=Yes).
   `subItems` (ถ้ามี) = เมนูย่อยที่กางเป็น <SideSubMenu> ข้างราง. */


/* คลินิกย่อยในระบบบันทึกการรักษา — เมนู "คัดกรอง" ไม่ใช้แล้ว (จุดคัดกรองเดียว) */
/* กองกลางของทุกคลินิก — รายการแรกสุดของเมนู "บันทึกการรักษา" (มติผู้ใช้
   28 ส.ค. 69) ในศูนย์ที่ไม่ระบุแพทย์ตั้งแต่จุดคัดกรอง นี่คือหน้าที่แพทย์เปิด
   เป็นอันแรกของวัน คลินิกต่าง ๆ จะมีงานก็ต่อเมื่อมีคนหยิบเคสจากกองนี้ไปแล้ว */
const TREAT_UNASSIGNED_SUBITEM =
  { key: 'unassigned', label: 'คิวรวมรอรับเคส', path: '/treat/unassigned' };

const TREAT_MODULE_SUBITEMS = [
  { key: 'consult',    label: 'ทะเบียนการส่งปรึกษาแพทย์',             path: '/treat/consult' },
  { key: 'order-settings', label: 'ตั้งค่ารายการสั่งการรักษาและ CDSS', path: '/treat/order-sets' },
  /* นโยบายการเข้าถึงข้อมูล (ABAC · TOR §1.4.8.1 / §1.4.2.1) — หน้าตั้งค่าของ
     ผู้ดูแลระบบของโมดูลการรักษา. นิยาม Role ยังเป็นของ /users — หน้านี้กำหนด
     เฉพาะกฎ role × หน่วยงาน × หมวดข้อมูล. */
  { key: 'access-policy', label: 'นโยบายการเข้าถึงข้อมูล (ABAC)',     path: '/treat/access-policy' },
  { key: 'interfaces', label: 'สถานะการเชื่อมต่อระบบภายนอก',         path: '/treat/interfaces' },
];

/* export เพื่อให้ "คิวรวมรอรับเคส" ใช้รายชื่อคลินิกชุดเดียวกับเมนู — ถ้าเพิ่ม
   คลินิกใหม่ในเมนู หน้าคิวรวมจะเห็นทันทีโดยไม่ต้องแก้สองที่ให้ตรงกัน */
export const TREAT_DEPARTMENT_SUBITEMS = [
  /* ชื่อคลินิกยึดตามคู่มือระบบงานของสำนักอนามัย กทม. (S003–S023) และนำหน้าด้วยคำว่า
     "คลินิก" ให้เหมือนกันทั้งชุด (มติผู้ใช้ 28 ส.ค. 69) — เดิมขึ้นต้นด้วย "แผนก"
     และบางรายการใช้ชื่อที่ไม่ตรงคู่มือ (เช่น "อายุรกรรม" ซึ่งเป็นชื่อแผนกแบบ
     โรงพยาบาล ไม่ใช่ชื่อคลินิกของศูนย์บริการสาธารณสุข) */
  { key: 'opd-treat',  label: 'คลินิกตรวจรักษา',                          path: '/treat/queue' },
  { key: 'family',     label: 'คลินิกส่งเสริมสุขภาพ (วางแผนครอบครัว)',      path: '/clinic/family-planning' },
  { key: 'std',        label: 'คลินิกโรคติดต่อทางเพศสัมพันธ์และโรคเอดส์',   path: '/clinic/hiv-sti' },
  { key: 'drug',       label: 'คลินิกบำบัดและรักษาผู้ป่วยติดสารเสพติด',     path: '/clinic/addiction' },
  { key: 'anc',        label: 'คลินิกฝากครรภ์',                            path: '/treat/anc/queue' },
  /* "ส่งเสริมสุขภาพเฉพาะกลุ่มที่สำคัญ" = ชื่อคู่มือ S014 (117 น.) ซึ่งเนื้อในคือ
     ทะเบียนเบาหวาน/ความดัน = NCD จึงเป็นชื่อของเมนูนี้ ไม่ใช่ของ /checkup
     (เดิมสองรายการนี้ใช้ชื่อสลับกัน — แก้ตามมติผู้ใช้ 28 ส.ค. 69) */
  { key: 'ncd',        label: 'คลินิกส่งเสริมสุขภาพเฉพาะกลุ่มที่สำคัญ (NCD)', path: '/clinic/ncd' },
  /* ระบบงานตรวจสุขภาพ (TOR §1.19) — ตรงกับ breadcrumb ของหน้า /checkup */
  { key: 'wellness',   label: 'คลินิกตรวจสุขภาพ',                          path: '/checkup' },
  { key: 'vaccine',    label: 'คลินิกสร้างเสริมภูมิคุ้มกันโรค',             path: '/clinic/immunization' },
  { key: 'dental',     label: 'คลินิกทันตกรรม',                            path: '/clinic/dental' },
  { key: 'tb',         label: 'คลินิกวัณโรค',                              path: '/clinic/tb' },
  { key: 'mental',     label: 'คลินิกสุขภาพจิต',                           path: '/clinic/mental-health' },
  { key: 'rehab',      label: 'คลินิกเวชศาสตร์ฟื้นฟูและกายภาพบำบัด',        path: '/clinic/rehab' },
  /* งานสังคมสงเคราะห์ (TOR §1.10.11) — path ชี้หน้าแรกของโมดูล (ค้นหา + เมนู
     หลัก 5 ปุ่ม ตามมติ คทง.10 ครั้งที่ 3) ไม่ใช่คิว; คิวย้ายไป /clinic/social-work/queue
     หน้าอื่น (ส.ส.3 /referral · ส.ส.4 /activities · รายงาน /reports · โภชนาการ
     /nutrition · ทะเบียน · ผู้ขอวัสดุ) เข้าถึงจากเมนูบนหน้าแรก — pattern เดียวกับ
     pharmacy/lab ที่ rail มีรายการเดียวแล้วสลับหน้าในโมดูลเอง. */
  { key: 'social',     label: 'คลินิกสังคมสงเคราะห์',                       path: '/clinic/social-work' },
];

// Icon names = Material Symbols Outlined glyphs (loaded in index.html).
// Mapped from Figma SideMenu (node 1:2363, PHCIS · Open=Yes) —
// shell border + nav items + bottom user area.
//
// `subItems` (optional) — list of sub-departments rendered in a
// <SideSubMenu> panel to the right of the rail when this primary menu
// is clicked (Figma "Show SideSubMenu" node 299:4913). Menus wired with
// sub-departments: `opd` (หน้าจอย่อยของงานผู้รับบริการนอก), `queue-center`
// (หน้าจอย่อยของระบบบริหารจัดการคิว) and `treat`.
export const PHCIS_SIDE_MENU = [
  /* แดชบอร์ด + ระบบรายงาน (TOR §1.20) — เมนูเดี่ยว ไม่มี subItems.
     หน้าจอระดับโมดูลอีก 6 หน้าเข้าถึงผ่านแถบ Tab ในหน้า (TabUnderline ของ
     `components/dashboard/DashboardSubNav.jsx` = DASHBOARD_NAV_LINKS) แทนการ
     ซ้อนเป็นเมนูย่อยใน rail (มติผู้ใช้ 27 ส.ค. 69) — รายการทั้งหมดจึงอยู่ที่
     DASHBOARD_NAV_LINKS ที่เดียว ไม่ต้องแก้สองที่ให้ตรงกันอีก. */
  { key: 'dashboard', label: 'แดชบอร์ด', icon: 'bar_chart_4_bars', path: '/dashboard' },
  /* คลังเอกสาร e-document เป็นระบบระดับ Hub (systemCatalog doc-template) —
     เมนูของตัวเองผ่าน EDOCUMENT_NAV ไม่ใช่รายการใน PHCIS rail นี้. */
  { key: 'registration', label: 'เวชระเบียน',              icon: 'assignment',       path: '/registration/queue' },
  { key: 'observation',   label: 'สังเกตอาการ',     icon: 'monitor_heart',  path: '/observation' },
  /* คัดกรอง — เดิมชื่อ "ระบบงานผู้รับบริการนอก" แล้วเป็น "คัดกรองและซักประวัติ" (TOR §1.2.2).
     งาน OPD (คิว) อยู่เป็นเมนูย่อยภายใต้โมดูลนี้; รง.506 เป็นเมนูหลักแยก · §1.2.7 อยู่ที่
     ระบบจัดการระบบ (systemNav). `key` ยังเป็น `opd` เพื่อให้ทุกหน้าใน
     /opd/* ส่ง activeKey='opd' ได้โดยไม่ต้องแก้. */
  {
    key: 'opd', label: 'คัดกรอง', icon: 'clinical_notes', path: '/opd/queue',
    /* ไม่มี subItems โดยตั้งใจ — ทุกคนที่เข้ามาใช้ "จุดคัดกรองเดียวกัน" ไม่ว่า
       ปลายทางจะเป็นแผนกไหน เมนูนี้จึงเป็นรายการเดียวจบ ไม่แตกตาม 12 คลินิก
       (ANC · NCD · HIV-STI · ยาเสพติด · วางแผนครอบครัว · ทันตกรรม · วัณโรค ·
       สุขภาพจิต · เวชศาสตร์ฟื้นฟู · สังคมสงเคราะห์ · วัคซีน · ส่งเสริมสุขภาพ)
       ซึ่งย้ายไปอยู่ใต้เมนู "บันทึกการรักษา" ที่เป็นที่ของมันแล้ว

       path ชี้ /opd/queue (คิวจุดคัดกรอง — ที่ทุกคนมารวมกัน) ไม่ใช่
       /opd/screening เพราะหน้าฟอร์มต้องเลือกผู้รับบริการจากคิวก่อน
       ถ้าชี้ตรงไปที่ฟอร์ม คิวจะเข้าไม่ถึงจาก nav เลย */
  },
  /* ระบบบันทึกการรักษา · รังสี · แล็บ · เภสัช — วางถัดจากคัดกรองและซักประวัติ
     (workflow หลังคัดกรอง → ตรวจรักษา → สั่งตรวจ/รังสี/จ่ายยา). */
  {
    key: 'treat', label: 'บันทึกการรักษา', icon: 'stethoscope',
    subItems: [
      TREAT_UNASSIGNED_SUBITEM,
      TREAT_DEPARTMENT_SUBITEMS[0],
      ...TREAT_MODULE_SUBITEMS,
      ...TREAT_DEPARTMENT_SUBITEMS.slice(1),
    ],
  },
  /* Exist Nurse — จุดที่พยาบาลปิดเยี่ยมก่อนผู้รับบริการกลับบ้าน วางถัดจาก
     "บันทึกการรักษา" ตามลำดับที่ผู้รับบริการเดินจริง: คัดกรอง → ตรวจรักษา →
     Exist Nurse เป็นคู่ตรงข้ามของ "คัดกรอง" จึงอยู่ระดับ rail เหมือนกัน ไม่ใช่
     คลินิกใต้บันทึกการรักษา · ชื่อเมนูใช้คำว่า "Exist Nurse" ตามที่ผู้ใช้กำหนด
     (มติผู้ใช้ 28 ส.ค. 69) */
  { key: 'exit',      label: 'Exist Nurse',               icon: 'logout',    path: '/exit' },
  { key: 'radiology', label: 'รังสีวินิจฉัย',              icon: 'radiology', iconSize: 18, path: '/xray/queue' },
  /* Lab module pages cross-link via LabSubNav (TabUnderline) — same flat
     pattern as pharmacy. */
  { key: 'lab',       label: 'ห้องปฏิบัติการ',            icon: 'biotech',  iconSize: 18, path: '/lab/queue' },
  { key: 'finance',   label: 'การเงิน',                   icon: 'baht',      path: '/finance'           },
  { key: 'pharmacy',  label: 'เภสัชกรรม',                 icon: 'pill',      path: '/pharmacy/queue'    },
  /* สิทธิและการเบิกจ่าย — TOR §1.7.3–1.7.5. ตรวจสอบสิทธิ · ส่งเบิก · Claim ·
     ตั้งค่า เป็น tab sections ในหน้าเดียว (/rights) จึงไม่มี subItems.
     วางใกล้งานการเงินเพราะเป็น workflow ต่อกัน (ชำระเงิน → ส่งเบิก). */
  { key: 'rights',    label: 'สิทธิและการเบิกจ่าย',        icon: 'verified_user', path: '/rights' },
  /* ระบบงานตรวจสุขภาพ — TOR §1.19. ชุดตรวจ · กลุ่มเป้าหมาย (import spreadsheet) ·
     คิวตรวจ · คัดกรอง 7 แบบ + แปลผลอัตโนมัติ · รายงาน · กิจกรรมชุมชน. */
  {
    key: 'checkup', label: 'ตรวจสุขภาพ', icon: 'health_metrics', path: '/checkup',
    subItems: [
      { key: 'checkup-queue',     label: 'คิวตรวจสุขภาพ',           path: '/checkup'           },
      { key: 'checkup-targets',   label: 'กลุ่มเป้าหมายตรวจสุขภาพ',  path: '/checkup/targets'   },
      { key: 'checkup-packages',  label: 'ทะเบียนชุดตรวจสุขภาพ',     path: '/checkup/packages'  },
      { key: 'checkup-reports',   label: 'รายงานงานตรวจสุขภาพ',     path: '/checkup/reports'   },
      { key: 'checkup-community', label: 'กิจกรรมสุขภาพชุมชน',       path: '/checkup/community' },
    ],
  },
  /* ระบบการเยี่ยมบ้าน — TOR §1.18 (+§1.10.12). ระบบใหม่ระดับ rail ไม่ใช่คลินิก
     ใน "ระบบบันทึกการรักษา": คิวนัดเยี่ยม · บันทึกเยี่ยม (mock GPS/map) ·
     ทะเบียน · ติดตาม. ทุกหน้าส่ง activeKey='homevisit'. */
  {
    key: 'homevisit', label: 'เยี่ยมบ้าน (Home Visit)', icon: 'home_health', path: '/homevisit',
    /* ไม่มี subItems โดยตั้งใจ — สลับหน้าในโมดูล (คิว · ทะเบียน · ติดตาม)
       ใช้ TabUnderline ที่ `HomeVisitSubNav` เหมือน pharmacy / lab */
  },
  /* งานอนามัยโรงเรียน — TOR §3 (ระบบสุขภาพนักเรียน). เป็นระบบ top-level บน
     System Hub (SYSTEM_CATALOG key 'school-health') แต่หน้าจอทั้งหมดใช้
     chrome ของ PHCIS จึงมีเมนูใน rail นี้ด้วย — ทุกหน้าส่ง
     activeKey='school-health'. รายการแรกคือคิวรับบริการ.
     (เหมือน `opd`/`treat` — SideSubMenu รับเฉพาะ { key, label, path } ไอคอนที่
     builder เสนอไว้ apartment / groups / vaccines / monitoring / summarize
     จึงยังไม่ถูกใช้จนกว่าเมนูย่อยจะรองรับไอคอน) */
  {
    key: 'school-health', label: 'งานอนามัยโรงเรียน', icon: 'school', path: '/clinic/school-health',
    subItems: [
      { key: 'sch-queue',    label: 'คิวรับบริการอนามัยโรงเรียน',      path: '/clinic/school-health'               },
      { key: 'sch-schools',  label: 'ทะเบียนโรงเรียน',                 path: '/clinic/school-health/schools'       },
      { key: 'sch-students', label: 'ทะเบียนนักเรียน',                 path: '/clinic/school-health/students'      },
      { key: 'sch-batch',    label: 'บันทึกบริการรายห้อง (Batch)',      path: '/clinic/school-health/batch-vaccine' },
      { key: 'sch-dashboard',label: 'Dashboard อนามัยโรงเรียน',        path: '/clinic/school-health/dashboard'     },
      { key: 'sch-reports',  label: 'รายงานอนามัยโรงเรียน',            path: '/clinic/school-health/reports'       },
    ],
  },
  /* สถานรับเลี้ยงเด็กกลางวัน — TOR §3.5. แยกเมนูจากอนามัยโรงเรียนตามมติ คทง.5
     เพราะกลุ่มเป้าหมายคือเด็กปฐมวัย 0–5 ปี (เกณฑ์โภชนาการ/พัฒนาการ/วัคซีน
     คนละชุดกับนักเรียน) แต่ layout และ vocabulary ออกแบบให้สอดคล้องกัน
     ตามมติครั้งที่ 3 ("หน้าจอควรสอดคล้องกันทั้งคลินิกเด็กดี สถานรับเลี้ยง
     และโรงเรียน") */
  {
    key: 'daycare', label: 'สถานรับเลี้ยงเด็กกลางวัน', icon: 'child_care', path: '/clinic/daycare',
    subItems: [
      { key: 'dc-children-queue', label: 'เด็กในความดูแล',            path: '/clinic/daycare'            },
      { key: 'dc-registry',       label: 'ทะเบียนเด็ก',               path: '/clinic/daycare/children'   },
      { key: 'dc-lessons',        label: 'กิจกรรมการเรียนการสอน',     path: '/clinic/daycare/lessons'    },
      { key: 'dc-monitoring',     label: 'ติดตามกิจกรรมที่ถึงกำหนด',  path: '/clinic/daycare/monitoring' },
    ],
  },
  /* งานระบาดวิทยา — TOR §1.2.3.6 (EPI-NET). เดิมเป็น submenu ใต้คัดกรอง แล้ว
     ยกเป็นเมนูหลักใน rail ชื่อ "รายงานเฝ้าระวังโรค รง.506".
     `key` + route ยังเป็น opd-rg506 / /opd/rg506 เหมือนเดิม — เปลี่ยนแค่ชื่อเมนู. */
  {
    key: 'opd-rg506', label: 'งานระบาดวิทยา', icon: 'coronavirus', path: '/opd/rg506',
  },
  /* ระบบบริหารจัดการคิว — TOR §1.3. ระบบคิวกลางของศูนย์ (คนละตัวกับคิว
     ผู้รับบริการนอกใน `opd` ซึ่งเป็นคิวของแผนกเดียว) รวมคอนโซลเรียกคิว
     การออกคิว การเชื่อมข้อมูล การตั้งค่า และจอแสดงผล.
     `activeKey='queue-center'` ที่ทุกหน้าในโมดูลส่งมาผูกกับ key นี้.
     (เหมือน `opd`/`treat` — SideSubMenu รับเฉพาะ { key, label, path } ไอคอน
     ที่ builder เสนอไว้ confirmation_number / hub / settings / tv จึงยังไม่ถูกใช้) */
  {
    key: 'queue-center', label: 'ระบบบริหารจัดการคิว', icon: 'campaign', path: '/queue-center',
    subItems: [
      { key: 'qc-console',     label: 'จัดการคิวและเรียกคิว',     path: '/queue-center'             },
      { key: 'qc-issue',       label: 'การออกคิว',                path: '/queue-center/issue'       },
      { key: 'qc-integration', label: 'การเชื่อมต่อข้อมูลคิว',    path: '/queue-center/integration' },
      { key: 'qc-settings',    label: 'ตั้งค่าระบบคิว',           path: '/queue-center/settings'    },
      { key: 'qc-display',     label: 'จอแสดงผลการเรียกคิว',      path: '/queue-center/display'     },
    ],
  },
  /* ทะเบียนการส่งต่อผู้รับบริการ — TOR §1.4.3.14 / §1.4.11.1. เดิมเป็น submenu
     ใต้ระบบบันทึกการรักษา; ยกเป็นเมนูหลักใน rail. Route ยังอยู่ที่ /treat/refer. */
  {
    key: 'refer', label: 'ทะเบียนการส่งต่อผู้รับบริการ', icon: 'send', path: '/treat/refer',
  },
  /* ระบบนัดหมาย — TOR §1.6. เดิมเป็นเมนูเดี่ยวชี้ /appointment. wave นี้เพิ่ม
     หน้าจอระดับโมดูลอีก 4 หน้า (กล่องรับนัด · นัดต่อเนื่อง · รูปแบบการนัดหมาย ·
     ตั้งค่า) จึงเปลี่ยนเป็นเมนูที่มี subItems แบบเดียวกับ `opd`/`queue-center` —
     รายการแรกยังเป็นตารางนัดหมายเหมือนเดิม.
     "ตั้งค่าระบบนัดหมาย" อยู่ที่นี่ ไม่ใช่ใน SYSTEM_CATALOG: แคตตาล็อกนั้นเป็น
     ระบบ **ระดับเดียวกับ PHCIS** และถูกตัดเป็น grid 3×3 พอดี (รายการที่ 10
     จะไม่ถูก render) — ระบบนัดหมายเป็น sub-system ภายใน PHCIS.
     (เหมือน `opd`/`treat` — SideSubMenu รับเฉพาะ { key, label, path } ไอคอนที่
     builder เสนอไว้ inbox / event_repeat / category / tune จึงยังไม่ถูกใช้
     จนกว่าเมนูย่อยจะรองรับไอคอน) */
  {
    key: 'appoint', label: 'ระบบนัดหมาย', icon: 'calendar_clock', path: '/appointment',
    subItems: [
      { key: 'appt-board',     label: 'ตารางนัดหมาย',           path: '/appointment'           },
      { key: 'appt-requests',  label: 'รับนัดหมาย',              path: '/appointment/requests'  },
      { key: 'appt-recurring', label: 'นัดต่อเนื่องและนัดกลุ่ม',  path: '/appointment/recurring' },
      { key: 'appt-types',     label: 'รูปแบบการนัดหมาย',        path: '/appointment/types'     },
      { key: 'appt-settings',  label: 'ตั้งค่าระบบนัดหมาย',       path: '/appointment/settings'  },
    ],
  },
  /* ระบบ Telemedicine / RPM — TOR §1.13 + §4.3. เดิมเข้าได้เฉพาะปุ่มลอยใน
     ระบบบันทึกการรักษา (/telemed เปิดสายทันทีผ่าน TelemedRouteTrigger) wave นี้
     เพิ่มหน้าจัดการระดับโมดูล 4 หน้า จึงต้องมีเมนูจริง.
     รายการแรกชี้ /telemed/worklist **ห้ามชี้ /telemed** เพราะ path นั้นเปิด
     วิดีโอคอลทันที. เหตุผลที่ไม่อยู่ใน SYSTEM_CATALOG เหมือน queue-center/
     appointment: Telemedicine เป็น sub-system ภายใน PHCIS และแคตตาล็อกนั้น
     ตัด grid 3×3 พอดี (รายการที่ 10 จะไม่ถูก render) + ยังไม่มี asset ใน
     public/illustration/hub/. (SideSubMenu รับเฉพาะ { key, label, path } —
     ไอคอนที่ builder เสนอ video_call / monitor_heart / verified_user /
     bar_chart จึงยังไม่ถูกใช้ในเมนูย่อย) */
  {
    key: 'telemed', label: 'ระบบ Telemedicine', icon: 'video_call', path: '/telemed',
    subItems: [
      { key: 'tm-worklist', label: 'หน้าห้องตรวจทางไกล',                        path: '/telemed/worklist' },
      { key: 'tm-rpm',      label: 'กระดานติดตามค่าจากอุปกรณ์ที่บ้าน (RPM)',     path: '/telemed/rpm'      },
      { key: 'tm-consent',  label: 'ทะเบียนความยินยอม PDPA (Telemedicine)',     path: '/telemed/consent'  },
      { key: 'tm-reports',  label: 'รายงานสถิติ + บันทึกการเข้าใช้งาน',           path: '/telemed/reports'  },
    ],
  },
  /* 'ประวัติการใช้งาน' (log) และ 'ผู้ใช้และสิทธิ์การเข้าถึง' (users) ถูกย้ายไป
     แสดงเป็น "ระบบกลาง" บน System Hub แทน — จึงไม่อยู่ในเมนู PHCIS แล้ว. */
];

export default PHCIS_SIDE_MENU;
