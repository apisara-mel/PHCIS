import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import SidebarProfileMenu from '@/components/layout/SidebarProfileMenu';
import SideSubMenu from '@/components/layout/SideSubMenu';
import Icon from '@/components/icons/Icon';
import LabNotificationCountBadge from '@/components/badge/LabNotificationCountBadge';
import { FilterDropdown } from '@/components/forms/FilterTag';
import { useClinicFilter } from '@/components/layout/HeaderClinicContext';
import { PHCIS_CURRENT_USER } from '@/data/phcisCurrentUser';
import FontSizeControls from '@/components/layout/FontSizeControls';
import DoctorProfileAvatar from '@/components/layout/DoctorProfileAvatar';
import {
  subscribeLabNotifications, unreadLabNotificationCount,
} from '@/data/treatmentInterfaces';

const OFFICE_HEALTH_LOGO = '/images/office-health-logo.png';

/* Soft drop-inner-shadow fades at the top/bottom of the nav scroller —
   appear only when the menu items overflow the viewport and the user has
   scrolled past the corresponding edge. Mirrors the pattern used by
   <HistoryTimeline> ("ประวัติการวัด") so the visual language is identical
   across scrollable surfaces.

   Brand-aware tint — `--PrimaryShadow-602/600` resolve to
   `rgb(var(--brand-p600-rgb) / α)`, so the fade retints automatically when
   the brand mode flips. Stacked /602 (12%) over /600 (8%) for a slightly
   stronger near-edge falloff, matching --shadow-header. */
const NAV_FADE_HEIGHT = 4;
const NAV_FADE_TOP =
  'linear-gradient(to bottom, var(--PrimaryShadow-602) 0%, var(--PrimaryShadow-600) 50%, transparent 100%)';
const NAV_FADE_BOTTOM =
  'linear-gradient(to top, var(--PrimaryShadow-602) 0%, var(--PrimaryShadow-600) 50%, transparent 100%)';

/* Primary nav + notification labels — match SideSubMenu item text (design.md §6.31.3). */
const SIDEMENU_LABEL_SIZE = 'var(--type-size-base, 16px)';

/* แผนกย่อยในระบบบันทึกการรักษา — เมนู "คัดกรอง" ไม่ใช้แล้ว (จุดคัดกรองเดียว) */
const TREAT_MODULE_SUBITEMS = [
  { key: 'consult',    label: 'ทะเบียนการส่งปรึกษาแพทย์',             path: '/treat/consult' },
  { key: 'order-settings', label: 'ตั้งค่ารายการสั่งการรักษาและ CDSS', path: '/treat/order-sets' },
  /* นโยบายการเข้าถึงข้อมูล (ABAC · TOR §1.4.8.1 / §1.4.2.1) — หน้าตั้งค่าของ
     ผู้ดูแลระบบของโมดูลการรักษา. นิยาม Role ยังเป็นของ /users — หน้านี้กำหนด
     เฉพาะกฎ role × หน่วยงาน × หมวดข้อมูล. */
  { key: 'access-policy', label: 'นโยบายการเข้าถึงข้อมูล (ABAC)',     path: '/treat/access-policy' },
  { key: 'interfaces', label: 'สถานะการเชื่อมต่อระบบภายนอก',         path: '/treat/interfaces' },
];

const TREAT_DEPARTMENT_SUBITEMS = [
  { key: 'opd-treat',  label: 'แผนกอายุรกรรม',                     path: '/treat/queue' },
  { key: 'family',     label: 'แผนกส่งเสริมสุขภาพ(วางแผนครอบครัว)',    path: '/clinic/family-planning' },
  { key: 'std',        label: 'แผนกโรคติดต่อทางเพศสัมพันธ์และโรคเอดส์', path: '/clinic/hiv-sti' },
  { key: 'drug',       label: 'แผนกบำบัดและรักษาผู้ป่วยติดสารเสพติด',   path: '/clinic/addiction' },
  { key: 'anc',        label: 'แผนกฝากครรภ์',                          path: '/treat/anc/queue' },
  { key: 'ncd',        label: 'แผนกโรคเรื้อรัง (NCD)',                  path: '/clinic/ncd' },
  /* "ส่งเสริมสุขภาพเฉพาะกลุ่มที่สำคัญ" = ชื่อคู่มือของระบบงานตรวจสุขภาพ (§1.19) */
  { key: 'wellness',   label: 'แผนกส่งเสริมสุขภาพเฉพาะกลุ่มที่สำคัญ',   path: '/checkup' },
  { key: 'vaccine',    label: 'แผนกสร้างเสริมภูมิคุ้มกันโรค',           path: '/clinic/immunization' },
  { key: 'dental',     label: 'แผนกทันตกรรม',                          path: '/clinic/dental' },
  { key: 'tb',         label: 'แผนกวัณโรค',                            path: '/clinic/tb' },
  { key: 'mental',     label: 'แผนกสุขภาพจิตและคลินิกสุขภาพจิต',        path: '/clinic/mental-health' },
  { key: 'rehab',      label: 'แผนกเวชศาสตร์ฟื้นฟูและกายภาพบำบัด',      path: '/clinic/rehab' },
  /* งานสังคมสงเคราะห์ (TOR §1.10.11) — path ชี้หน้าแรกของโมดูล (ค้นหา + เมนู
     หลัก 5 ปุ่ม ตามมติ คทง.10 ครั้งที่ 3) ไม่ใช่คิว; คิวย้ายไป /clinic/social-work/queue
     หน้าอื่น (ส.ส.3 /referral · ส.ส.4 /activities · รายงาน /reports · โภชนาการ
     /nutrition · ทะเบียน · ผู้ขอวัสดุ) เข้าถึงจากเมนูบนหน้าแรก — pattern เดียวกับ
     pharmacy/lab ที่ rail มีรายการเดียวแล้วสลับหน้าในโมดูลเอง. */
  { key: 'social',     label: 'แผนกสังคมสงเคราะห์',                    path: '/clinic/social-work' },
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
const ITEMS = [
  /* แดชบอร์ด + ระบบรายงาน (TOR §1.20). เดิมเป็นเมนูเดี่ยวชี้ /dashboard; wave นี้
     เพิ่มหน้าจอระดับโมดูลอีก 6 หน้า จึงเปลี่ยนเป็นเมนูที่มี subItems แบบเดียวกับ
     `checkup`/`appoint` — รายการแรกยังเป็นภาพรวมโรงพยาบาลเหมือนเดิม.
     รายการตรงกับ DASHBOARD_NAV_LINKS ใน components/dashboard/DashboardSubNav.jsx
     (TabUnderline ระดับหน้า) — แก้ที่ไหนต้องแก้ให้ตรงกันทั้งสองที่.
     "รายงานเภสัชกรรม (ภาพรวมทุกศูนย์)" คนละหน้ากับ /pharmacy/reports ในเมนู
     ระบบงานเภสัชกรรม ซึ่งเป็นรายงานเชิงปฏิบัติการรายวันของศูนย์เดียว. */
  {
    key: 'dashboard', label: 'แดชบอร์ด', icon: 'bar_chart_4_bars', path: '/dashboard',
    subItems: [
      { key: 'db-overview',  label: 'ภาพรวมโรงพยาบาล',                path: '/dashboard'                  },
      { key: 'db-reports',   label: 'ศูนย์รวมรายงาน',                  path: '/dashboard/reports'          },
      { key: 'db-service',   label: 'รายงานผู้รับบริการ',              path: '/dashboard/reports/service'  },
      { key: 'db-pharmacy',  label: 'รายงานเภสัชกรรม (ภาพรวมทุกศูนย์)', path: '/dashboard/reports/pharmacy' },
      { key: 'db-checkup',   label: 'รายงานตรวจสุขภาพ',                path: '/dashboard/reports/checkup'  },
      { key: 'db-clinics',   label: 'Dashboard คลินิกพิเศษ',            path: '/dashboard/clinics'          },
      { key: 'db-executive', label: 'Dashboard ผู้บริหาร',              path: '/dashboard/executive'        },
    ],
  },
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
      TREAT_DEPARTMENT_SUBITEMS[0],
      ...TREAT_MODULE_SUBITEMS,
      ...TREAT_DEPARTMENT_SUBITEMS.slice(1),
    ],
  },
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

// Glyphs missing from the Material Symbols font (e.g. Thai Baht ฿) fall back
// to inline SVG icons from <Icon>. Keep this set tight — adding a name here
// silently skips the font path.
const CUSTOM_ICONS = new Set(['baht']);

const Sym = ({ name, size = 20, color, className = '' }) => {
  if (CUSTOM_ICONS.has(name)) {
    return (
      <span className={`inline-flex ${className}`} style={{ color }} aria-hidden>
        <Icon name={name} size={size} />
      </span>
    );
  }
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontSize: size, color }}
      aria-hidden
    >
      {name}
    </span>
  );
};

/* `items` defaults to the PHCIS nav (ITEMS) but can be overridden so a
   separate top-level system (e.g. Consent Management — Figma PHCIS|Consent
   Side Menu 270:95324) reuses the exact same shell/header/footer with its
   own menu. `fallbackKey` is the derived-active key when no path matches. */
const Sidebar = ({
  activeKey,
  defaultSubmenuKey = null,
  items = ITEMS,
  fallbackKey = 'opd',
  /** Override open rail width — e.g. Consent nav uses 400px for long Thai labels. */
  openWidth,
  /** Allow nav labels to wrap to multiple lines instead of clipping. */
  wrapLabels = false,
}) => {
  const history = useHistory();
  const location = useLocation();
  const clinicFilter = useClinicFilter();
  // Derive active item from current pathname when not explicitly set
  const derivedKey = (() => {
    const match = items.find((it) => it.path && location.pathname.startsWith(it.path));
    return match ? match.key : fallbackKey;
  })();
  const currentKey = activeKey || derivedKey;

  const initialOpen =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('sidebarOpen') === '1';
  const [open, setOpen] = useState(initialOpen);
  const [hovered, setHovered] = useState(false);
  const [hoverItem, setHoverItem] = useState(null);

  // Responsive: below md (768px) the sidebar becomes an off-canvas drawer
  // triggered by Header's hamburger via `mih:toggle-mobile-sidebar` event.
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const open = () => setMobileOpen(true);
    const close = () => setMobileOpen(false);
    const toggle = () => setMobileOpen((v) => !v);
    window.addEventListener('mih:open-mobile-sidebar', open);
    window.addEventListener('mih:close-mobile-sidebar', close);
    window.addEventListener('mih:toggle-mobile-sidebar', toggle);
    return () => {
      window.removeEventListener('mih:open-mobile-sidebar', open);
      window.removeEventListener('mih:close-mobile-sidebar', close);
      window.removeEventListener('mih:toggle-mobile-sidebar', toggle);
    };
  }, []);
  // Close drawer when crossing back to desktop
  useEffect(() => { if (!isMobile) setMobileOpen(false); }, [isMobile]);

  /* §1.4.7.2 — ตัวนับผลแล็บที่ยังไม่รับทราบ (ทั้งระบบ) สำหรับเมนูบันทึกการรักษา */
  const [labUnreadCount, setLabUnreadCount] = useState(() => unreadLabNotificationCount());
  useEffect(() => {
    const refresh = () => setLabUnreadCount(unreadLabNotificationCount());
    refresh();
    return subscribeLabNotifications(refresh);
  }, []);

  // SideSubMenu — open when a primary menu with `subItems` is clicked.
  // submenuKey       = source of truth (which primary menu owns the panel)
  // renderSubmenuKey = lags submenuKey so the panel keeps rendering during
  //                    the exit animation, then unmounts
  // submenuMounted   = controls render lifecycle (true while panel is in
  //                    the DOM, including the exit animation)
  // submenuVisible   = controls the enter/exit transition (transform/opacity)
  // submenuItem      = which sub-department is selected inside the panel
  const [submenuKey, setSubmenuKey] = useState(defaultSubmenuKey);
  const [submenuItem, setSubmenuItem] = useState(null);
  const [submenuVisible, setSubmenuVisible] = useState(!!defaultSubmenuKey);
  const [submenuMounted, setSubmenuMounted] = useState(!!defaultSubmenuKey);
  const [renderSubmenuKey, setRenderSubmenuKey] = useState(defaultSubmenuKey);
  const submenu       = items.find((it) => it.key === submenuKey       && it.subItems);
  const renderSubmenu = items.find((it) => it.key === renderSubmenuKey && it.subItems);
  const sidebarRef  = useRef(null);
  const submenuRef  = useRef(null);

  // Slide-in / fade enter, slide-out / fade exit. Mount before showing so the
  // browser paints the initial (hidden) state, then flip visible on the next
  // frame to trigger the transition. On exit, wait for the transition to
  // finish before unmounting so the panel doesn't pop out.
  const SUBMENU_TRANSITION_MS = 280;
  useEffect(() => {
    if (submenuKey) {
      setRenderSubmenuKey(submenuKey);
      setSubmenuMounted(true);
      const id = requestAnimationFrame(() => setSubmenuVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setSubmenuVisible(false);
    const id = setTimeout(() => {
      setSubmenuMounted(false);
      setRenderSubmenuKey(null);
    }, SUBMENU_TRANSITION_MS);
    return () => clearTimeout(id);
  }, [submenuKey]);

  // Profile popover anchor + open state
  const userAreaRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileRect, setProfileRect] = useState(null);
  const [userHover, setUserHover] = useState(false);
  // While the popover or a sub-menu is open, force the sidebar into expanded
  // state so the anchor stays fixed even if the cursor is over the panel
  // (which lives outside the aside DOM). The popover itself fires `onClose`
  // on mouseLeave, which then allows expanded to relax back to (open || hovered).
  const expanded = isMobile
    ? mobileOpen
    : (open || hovered || profileOpen || !!submenu);
  const userActive = userHover || profileOpen;

  // Close submenu on outside click — clicks inside the sidebar or submenu
  // are ignored so the user can switch between items without losing the panel.
  useEffect(() => {
    if (!submenu) return undefined;
    const onDocMouseDown = (e) => {
      const t = e.target;
      if (sidebarRef.current && sidebarRef.current.contains(t)) return;
      if (submenuRef.current && submenuRef.current.contains(t)) return;
      setSubmenuKey(null);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [submenu]);

  // Escape closes the submenu.
  useEffect(() => {
    if (!submenu) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setSubmenuKey(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [submenu]);

  // Nav scroll-shadow — when the menu items overflow the viewport, fade
  // overlays appear at the top/bottom edges of the scroller. Mirrors the
  // <HistoryTimeline> implementation: track scrollTop / clientHeight /
  // scrollHeight to derive `overflow`, `shadowTop`, `shadowBottom`, then
  // toggle gradient sash opacity. Re-measured on resize via ResizeObserver
  // (collapsed → expanded sidebar resize triggers a fresh measure).
  const navScrollRef = useRef(null);
  const [navScroll, setNavScroll] = useState({
    overflow: false,
    shadowTop: false,
    shadowBottom: false,
  });
  const updateNavScrollShadow = useCallback(() => {
    const el = navScrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const overflow = scrollHeight > clientHeight + 2;
    if (!overflow) {
      setNavScroll({ overflow: false, shadowTop: false, shadowBottom: false });
      return;
    }
    const eps = 2;
    setNavScroll({
      overflow: true,
      shadowTop: scrollTop > eps,
      shadowBottom: scrollTop < scrollHeight - clientHeight - eps,
    });
  }, []);
  useLayoutEffect(() => { updateNavScrollShadow(); }, [expanded, updateNavScrollShadow]);
  useLayoutEffect(() => {
    const el = navScrollRef.current;
    if (typeof ResizeObserver === 'undefined' || !el) return undefined;
    const ro = new ResizeObserver(() => updateNavScrollShadow());
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateNavScrollShadow]);
  const toggleProfile = () => {
    if (profileOpen) { setProfileOpen(false); return; }
    if (userAreaRef.current) setProfileRect(userAreaRef.current.getBoundingClientRect());
    setProfileOpen(true);
  };

  // Profile menu (popover + Mode/Theme settings) is the shared
  // <SidebarProfileMenu> — same component every system shell uses, so theme
  // changes apply globally and the menu stays identical across systems.

  const ease = 'opacity 160ms ease, max-width 220ms ease';
  const widthOpen = openWidth || 'var(--sm-width-open)';
  const labelReserve = wrapLabels ? '68px' : '100px';
  const itemRowHeight = 'var(--dim-size-1000, 48px)';
  const itemRowPadY = 'var(--dim-space-200, 8px)';
  const itemRowPadL = 'calc(var(--sm-space-600, 24px) - var(--sm-stroke-400, 4px))';
  const itemRowPadR = 'var(--sm-space-600, 24px)';
  const navListGap = 'var(--dim-space-150, 6px)';
  const navListPadY = 'var(--dim-space-400, 16px)';
  const collapsedPlainPad = 'calc((var(--sm-width-closed, 64px) - 16px) / 2)';
  const collapsedAvatarPad = 'calc((var(--sm-width-closed, 64px) - 40px) / 2)';

  return (
    <>
      {/* ── Layout placeholder — reserves collapsed width so content
            doesn't reflow when sidebar expands. The aside below is
            position:fixed and overlays content on hover/lock.
            Below md the sidebar becomes an off-canvas drawer, so the
            placeholder collapses to 0 and the main column gets full width. */}
      <div
        aria-hidden
        className='shrink-0'
        style={{ width: isMobile ? 0 : 'var(--sm-width-closed)' }}
      />
      {/* Backdrop — only on mobile when drawer is open */}
      {isMobile && (
        <div
          aria-hidden
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.32)',
            opacity: mobileOpen ? 1 : 0,
            pointerEvents: mobileOpen ? 'auto' : 'none',
            transition: 'opacity 200ms ease',
            zIndex: 'calc(var(--sm-z-overlay) - 2)',
          }}
        />
      )}
    <aside
      ref={sidebarRef}
      onMouseEnter={() => !isMobile && setHovered(true)}
      onMouseLeave={() => !isMobile && setHovered(false)}
      style={{
        ...(openWidth ? { '--sm-width-open': openWidth } : null),
        width: isMobile
          ? widthOpen
          : expanded ? widthOpen : 'var(--sm-width-closed)',
        background: 'var(--surface-navigation-default)',
        /* Figma Design Template 1:2447 — SideMenu shell:
             border-r  = border/brandprimary/quaternary @ stroke/100
             box-shadow = effect "Brand Drop Shadow Top/200"
                          (var(--shadow-sidemenu) — brand-aware, follows
                          [data-brand] across all modes) */
        borderRight: 'var(--dim-stroke-100) solid var(--border-sidemenu-shell)',
        boxShadow:   'var(--shadow-sidemenu)',
        transform: isMobile && !mobileOpen ? 'translateX(-100%)' : 'translateX(0)',
        transition: 'width 220ms cubic-bezier(.4,0,.2,1), transform 220ms cubic-bezier(.4,0,.2,1), box-shadow 220ms ease',
        position: 'fixed',
        left: 'var(--dim-space-0)',
        top: 'var(--dim-space-0)',
        bottom: 'var(--dim-space-0)',
        zIndex: 'var(--sm-z-overlay)',
      }}
      className='flex flex-col overflow-hidden'
    >
      {/* ── Logo area · 64px · logo true-centers when collapsed ─
           Click → System Hub (Figma 291:113045 nav behaviour). */}
      <div
        role='button'
        tabIndex={0}
        onClick={() => history.push('/hub')}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') history.push('/hub'); }}
        title='ไปยังหน้าเลือกระบบ'
        className='flex items-center shrink-0 overflow-hidden cursor-pointer'
        style={{
          height: 64,
          padding: '0 var(--sm-space-300)',
          gap: expanded ? 'var(--sm-space-300)' : 0,
          justifyContent: expanded ? 'flex-start' : 'center',
          borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
        }}
      >
        <div
          className='w-10 h-10 rounded-full shrink-0 overflow-hidden flex items-center justify-center'
          style={{ background: 'var(--surface-brandprimary-quaternary)' }}
        >
          <img
            src={OFFICE_HEALTH_LOGO}
            alt='โลโก้สำนักอนามัย'
            className='w-full h-full object-cover'
          />
        </div>
        <div
          className='flex-1 min-w-0 flex flex-col overflow-hidden'
          style={{
            opacity: expanded ? 1 : 0,
            maxWidth: expanded ? 'calc(var(--sm-width-open) - 100px)' : 0,
            transition: ease,
          }}
        >
          <div
            className='font-bold text-base leading-tight whitespace-nowrap'
            style={{ color: 'var(--text-brand-name)' }}
          >
            สำนักอนามัย
          </div>
        </div>
        <button
          type='button'
          onClick={() => setOpen((v) => !v)}
          aria-label='Toggle lock'
          title={open ? 'ปลดล็อค' : 'ล็อคเปิด'}
          className='shrink-0 rounded flex items-center justify-center'
          style={{
            width: 24, height: 24,
            background: 'transparent',
            color: 'var(--text-content-secondary)',
            opacity: expanded ? 1 : 0,
            maxWidth: expanded ? 32 : 0,
            transition: ease,
          }}
        >
          <Sym name='swap_horiz' size={20} />
        </button>
      </div>

      {clinicFilter && isMobile && (
        <div
          className='shrink-0 w-full md:hidden'
          style={{
            paddingTop: 'var(--dim-space-200)',
            paddingBottom: 'var(--dim-space-200)',
            paddingLeft: 'var(--sm-space-300)',
            paddingRight: 'var(--sm-space-300)',
            borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
          }}
        >
          <FilterDropdown
            className='w-full min-w-0 inline-flex'
            leadingIcon='location_on'
            options={clinicFilter.options}
            value={clinicFilter.clinic}
            onChange={clinicFilter.setClinic}
          />
        </div>
      )}

      {isMobile && (
        <div
          className='shrink-0 w-full md:hidden flex flex-col'
          style={{
            paddingTop: 'var(--dim-space-200)',
            paddingBottom: 'var(--dim-space-200)',
            paddingLeft: 'var(--sm-space-300)',
            paddingRight: 'var(--sm-space-300)',
            borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
            color: 'var(--text-content-secondary)',
          }}
        >
          <FontSizeControls variant='drawer' />
        </div>
      )}

      {/* ── Top nav items ───────────────────────────────────── */}
      <div className='relative flex-1 min-h-0 flex flex-col'>
      <nav
        ref={navScrollRef}
        onScroll={updateNavScrollShadow}
        className='flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden scrollbar-thin'
        style={{
          gap: navListGap,
          paddingTop: navListPadY,
          paddingBottom: navListPadY,
        }}
      >
        {items.map((it) => {
          // While a sub-menu panel is open the owning primary menu wins the
          // "active" visual (brand-p50 bg + 4px left border + chevron),
          // even if the URL doesn't match its path.
          const active = submenu ? it.key === submenu.key : it.key === currentKey;
          const isHover = hoverItem === it.key && !active;
          const tinted = active || isHover;
          const itemColor = tinted
            ? 'var(--text-sidemenu-selected)'
            : 'var(--text-sidemenu-default)';
          const onActivate = () => {
            if (it.subItems && it.subItems.length > 0) {
              // Toggle the sub-menu panel — same key closes, new key swaps.
              setSubmenuKey((k) => (k === it.key ? null : it.key));
              return;
            }
            // No subItems — close any open panel and navigate if a path exists.
            setSubmenuKey(null);
            if (it.path) {
              history.push(it.path);
              if (isMobile) setMobileOpen(false);
            }
          };
          return (
            <div
              key={it.key}
              role='menuitem'
              tabIndex={0}
              data-spotlight={`sidebar-${it.key}`}
              onClick={onActivate}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate(); } }}
              onMouseEnter={() => setHoverItem(it.key)}
              onMouseLeave={() => setHoverItem(null)}
              className={`cursor-pointer flex w-full shrink-0 ${wrapLabels && expanded ? 'items-start' : 'items-center'}`}
              style={{
                height: itemRowHeight,
                minHeight: itemRowHeight,
                boxSizing: 'border-box',
                gap: expanded ? 'var(--sm-space-300)' : 0,
                justifyContent: expanded ? 'flex-start' : 'center',
                paddingTop: itemRowPadY,
                paddingBottom: itemRowPadY,
                // The 4px left border is always present but transparent when
                // not active — keeps the icon column stable across the
                // hover/active transition (no width shift on state change).
                paddingLeft: itemRowPadL,
                paddingRight: expanded ? 'var(--sm-space-300)' : itemRowPadR,
                borderLeft: `var(--sm-stroke-400) solid ${active ? 'var(--border-sidemenu-active)' : 'transparent'}`,
                background: tinted ? 'var(--surface-sidemenu-active)' : 'transparent',
                borderRadius: active ? 0 : 'var(--sm-radius-100)',
                transition: 'background 200ms cubic-bezier(0.32, 0.72, 0, 1), border-color 200ms cubic-bezier(0.32, 0.72, 0, 1)',
              }}
            >
              <Sym
                name={it.icon}
                size={it.iconSize ?? 16}
                color={itemColor}
                style={wrapLabels && expanded ? { marginTop: 'var(--dim-space-100, 4px)', flexShrink: 0 } : undefined}
              />
              <span
                className={`min-w-0 ${expanded ? 'flex-1' : 'shrink-0'} ${wrapLabels ? '' : 'whitespace-nowrap overflow-hidden text-ellipsis'} ${expanded && it.key === 'treat' && labUnreadCount > 0 ? 'inline-flex items-center' : ''}`}
                style={{
                  fontSize: SIDEMENU_LABEL_SIZE,
                  fontWeight: 'var(--type-weight-medium, 500)',
                  color: itemColor,
                  opacity: expanded ? 1 : 0,
                  width: expanded ? undefined : 0,
                  flex: expanded ? undefined : '0 0 0',
                  maxWidth: expanded ? `calc(var(--sm-width-open) - ${labelReserve})` : 0,
                  pointerEvents: expanded ? 'auto' : 'none',
                  transition: ease,
                  overflow: expanded ? (wrapLabels ? undefined : 'hidden') : 'hidden',
                  textOverflow: expanded && !wrapLabels ? 'ellipsis' : undefined,
                  ...(wrapLabels && expanded ? { whiteSpace: 'normal', lineHeight: 1.4 } : null),
                  ...(expanded && it.key === 'treat' && labUnreadCount > 0
                    ? { gap: 'var(--dim-space-150, 6px)' }
                    : null),
                }}
              >
                <span className={expanded && it.key === 'treat' && labUnreadCount > 0 ? 'min-w-0 truncate' : undefined}>
                  {it.label}
                </span>
                {expanded && it.key === 'treat' && (
                  <LabNotificationCountBadge count={labUnreadCount} />
                )}
              </span>
              {active && (
                <span
                  className='shrink-0 overflow-hidden flex items-center justify-center'
                  style={{
                    width: expanded ? 20 : 0,
                    height: expanded ? 20 : 0,
                    minWidth: expanded ? undefined : 0,
                    opacity: expanded ? 1 : 0,
                    maxWidth: expanded ? 24 : 0,
                    transition: ease,
                    ...(wrapLabels && expanded ? { marginTop: 'var(--dim-space-100, 4px)' } : null),
                  }}
                >
                  <Sym name='chevron_right' size={20} color='var(--text-sidemenu-selected)' />
                </span>
              )}
            </div>
          );
        })}
      </nav>

      {/* Top/bottom fade — toggled by scroll position. pointer-events:none
          so it never blocks menu-item clicks. Sits above the scrolling nav
          via absolute positioning on the static wrapper, identical to the
          pattern in <HistoryTimeline> ("ประวัติการวัด"). */}
      <div
        aria-hidden
        className='pointer-events-none absolute left-0 right-0 top-0 transition-opacity duration-150'
        style={{
          height: NAV_FADE_HEIGHT,
          background: NAV_FADE_TOP,
          opacity: navScroll.overflow && navScroll.shadowTop ? 1 : 0,
        }}
      />
      <div
        aria-hidden
        className='pointer-events-none absolute left-0 right-0 bottom-0 transition-opacity duration-150'
        style={{
          height: NAV_FADE_HEIGHT,
          background: NAV_FADE_BOTTOM,
          opacity: navScroll.overflow && navScroll.shadowBottom ? 1 : 0,
        }}
      />
      </div>

      {/* ── Bottom: Notification + User ─────────────────────── */}
      <div
        className='flex flex-col shrink-0'
        style={{ gap: navListGap }}
      >
        {/* Notification */}
        <div
          className='cursor-pointer flex items-center w-full'
          style={{
            height: itemRowHeight,
            minHeight: itemRowHeight,
            boxSizing: 'border-box',
            gap: expanded ? 'var(--sm-space-300)' : 0,
            justifyContent: expanded ? 'flex-start' : 'center',
            paddingTop: itemRowPadY,
            paddingBottom: itemRowPadY,
            paddingLeft: expanded ? 'var(--sm-space-600)' : collapsedPlainPad,
            paddingRight: expanded ? 'var(--sm-space-600)' : collapsedPlainPad,
            borderRadius: 'var(--sm-radius-100)',
            transition: 'background .12s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-sidemenu-active)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <span className='relative inline-flex shrink-0' style={{ width: 16, height: 16 }}>
            <Sym name='notifications' size={16} color='var(--text-sidemenu-default)' />
            {/* red dot */}
            <span
              className='absolute rounded-full'
              style={{
                top: 'var(--dim-space-0)', right: 'var(--dim-space-0)',
                width: 6, height: 6,
                background: 'var(--surface-notification-default)',
                border: '1.5px solid var(--surface-navigation-default)',
              }}
            />
          </span>
          <span
            className={`min-w-0 whitespace-nowrap overflow-hidden ${expanded ? 'flex-1' : 'shrink-0'}`}
            style={{
              fontSize: SIDEMENU_LABEL_SIZE,
              fontWeight: 'var(--type-weight-medium, 500)',
              color: 'var(--text-sidemenu-default)',
              opacity: expanded ? 1 : 0,
              width: expanded ? undefined : 0,
              flex: expanded ? undefined : '0 0 0',
              maxWidth: expanded ? 'calc(var(--sm-width-open) - 100px)' : 0,
              transition: ease,
            }}
          >
            แจ้งเตือน
          </span>
          <span
            className='shrink-0 inline-flex items-center justify-center text-xs font-medium whitespace-nowrap rounded-full overflow-hidden'
            style={{
              background: 'var(--surface-notification-default)',
              color: 'var(--text-danger-on-default)',
              opacity: expanded ? 1 : 0,
              maxWidth: expanded ? 60 : 0,
              padding: expanded ? '2px 8px' : 0,
              transition: 'opacity 160ms ease, max-width 220ms ease, padding 220ms ease',
            }}
          >
            99+
          </span>
        </div>

        {/* User area · avatar true-centers when collapsed */}
        <div
          ref={userAreaRef}
          role='button'
          tabIndex={0}
          aria-haspopup='menu'
          aria-expanded={profileOpen}
          onClick={toggleProfile}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleProfile(); } }}
          onMouseEnter={() => setUserHover(true)}
          onMouseLeave={() => setUserHover(false)}
          className='flex items-center cursor-pointer overflow-hidden shrink-0'
          style={{
            height: expanded ? 'var(--dim-size-1200, 56px)' : itemRowHeight,
            minHeight: itemRowHeight,
            boxSizing: 'border-box',
            paddingTop: itemRowPadY,
            paddingBottom: itemRowPadY,
            paddingLeft: expanded ? 'var(--sm-space-300)' : collapsedAvatarPad,
            paddingRight: expanded ? 'var(--sm-space-300)' : collapsedAvatarPad,
            gap: expanded ? 'var(--sm-space-300)' : 0,
            justifyContent: expanded ? 'flex-start' : 'center',
            borderTop: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
            background: userActive ? 'var(--surface-sidemenu-hover)' : 'transparent',
            transition: 'background .12s',
          }}
        >
          <DoctorProfileAvatar className='shrink-0' />
          <div
            className={`min-w-0 flex flex-col overflow-hidden ${expanded ? 'flex-1' : 'shrink-0'}`}
            style={{
              opacity: expanded ? 1 : 0,
              width: expanded ? undefined : 0,
              flex: expanded ? undefined : '0 0 0',
              maxWidth: expanded ? 'calc(var(--sm-width-open) - 116px)' : 0,
              transition: ease,
              overflow: expanded ? undefined : 'hidden',
            }}
          >
            <div
              className='text-sm leading-tight whitespace-nowrap overflow-hidden'
              style={{
                color: userActive
                  ? 'var(--text-sidemenu-hover)'
                  : 'var(--text-sidemenu-default)',
                transition: 'color .12s',
              }}
            >
              {PHCIS_CURRENT_USER.displayName}
            </div>
            <div
              className='text-xs whitespace-nowrap overflow-hidden'
              style={{ color: 'var(--text-content-tertiary)' }}
            >
              {PHCIS_CURRENT_USER.department}
            </div>
          </div>
          <button
            type='button'
            aria-label='switch user'
            className='shrink-0 overflow-hidden flex items-center justify-center'
            style={{
              width: 24, height: 24,
              color: 'var(--text-content-secondary)',
              opacity: expanded ? 1 : 0,
              maxWidth: expanded ? 24 : 0,
              transition: ease,
            }}
          >
            <Sym name='unfold_more' size={20} />
          </button>
        </div>
      </div>
    </aside>
    {/* SideSubMenu — opens to the right of the rail when the active
        primary menu has sub-departments (Figma node 299:4913).
        Enter: slide in from the left (-16px) + fade in over 280ms.
        Exit:  reverse — slide back + fade out, then unmount. */}
    {submenuMounted && renderSubmenu && (
      <SideSubMenu
        ref={submenuRef}
        header={renderSubmenu.label}
        headerBadgeCount={0}
        items={renderSubmenu.subItems.map((sub) => ({
          ...sub,
          badgeCount: renderSubmenuKey === 'treat' && sub.key === 'opd-treat'
            ? labUnreadCount
            : 0,
        }))}
        selectedKey={submenuItem}
        onSelect={(k) => {
          setSubmenuItem(k);
          const sub = renderSubmenu.subItems.find((s) => s.key === k);
          if (sub && sub.path) {
            history.push(sub.path);
            setSubmenuKey(null);
          }
        }}
        showBottomSpacer={false}
        aria-hidden={!submenuVisible || undefined}
        style={{
          position: 'fixed',
          top: 'var(--dim-space-0)',
          bottom: 'var(--dim-space-0)',
          left: widthOpen,
          /* SideSubMenu's internal nav already scrolls when items overflow
             the panel height (short viewport). */
          zIndex: 'calc(var(--sm-z-overlay) - 1)',
          transform: submenuVisible ? 'translateX(0)' : 'translateX(-16px)',
          opacity:   submenuVisible ? 1 : 0,
          pointerEvents: submenuVisible ? 'auto' : 'none',
          transition: [
            `transform ${SUBMENU_TRANSITION_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
            `opacity ${Math.round(SUBMENU_TRANSITION_MS * 0.8)}ms cubic-bezier(0.32, 0.72, 0, 1)`,
            `box-shadow ${SUBMENU_TRANSITION_MS}ms ease`,
          ].join(', '),
          willChange: 'transform, opacity',
        }}
      />
    )}
    <SidebarProfileMenu
      open={profileOpen}
      anchorRect={profileRect}
      anchorRef={userAreaRef}
      onClose={() => setProfileOpen(false)}
      onLogout={() => history.push('/login')}
    />
    </>
  );
};

export default Sidebar;
