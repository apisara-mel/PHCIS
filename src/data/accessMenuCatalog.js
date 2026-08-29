/* PHCIS | Assess-control — แค็ตตาล็อกสิทธิ์การเข้าถึงระบบ 3 ระดับ
   ══════════════════════════════════════════════════════════════════════
   ระบบ (โมดูล) → เมนู (ตาม Side Menu ของระบบนั้น) → เมนูย่อย

   26 ส.ค. 2569 (มติผู้ใช้): สิทธิ์การเข้าถึงระบบต้องกำหนดได้ถึงระดับเมนูย่อย
   ไม่ใช่แค่ "โมดูล" แบน ๆ 17 รายการแบบเดิม. เมนูจึงอ่านจากไฟล์เมนูจริงของ
   แต่ละระบบ — แก้เมนูที่เดียว หน้ากำหนดสิทธิ์ตามทันทีโดยไม่ต้องมาไล่แก้ที่นี่.

   ระดับสิทธิ์กำหนดที่ "ใบ" (เมนูที่ไม่มีเมนูย่อย หรือเมนูย่อยแต่ละอัน) —
   แถวระบบ/เมนูที่มีลูกเป็นตัวสรุป: ลูกเหมือนกันหมด = ระดับนั้น · ไม่เหมือนกัน
   = 'mixed' (กำหนดรายเมนู) · กดที่แถวแม่ = เซ็ตลูกทุกตัวพร้อมกัน. */

import { PHCIS_SIDE_MENU } from '@/data/phcisSideMenu';
import { CONSENT_NAV } from '@/pages/consent/consentNav';
import { EDOCUMENT_NAV } from '@/pages/forms/edocumentNav';
import { AUDIT_NAV } from '@/pages/audit/auditNav';
import { SYSTEM_NAV } from '@/pages/system/systemNav';

/* ══════════════════════════════════════════════════════════════════════
   ระดับสิทธิ์ — ตามมติผู้ใช้ 26 ส.ค. 2569
   ══════════════════════════════════════════════════════════════════════ */
export const PERM_NONE = 'none';
export const PERM_VIEW = 'view';     /* อ่านได้อย่างเดียว */
export const PERM_WRITE = 'write';   /* เขียนได้ (บันทึก/แก้ไข แต่ไม่เปิดดูรายการ) */
export const PERM_EDIT = 'edit';     /* อ่านและเขียนได้ — คีย์เดิมของ record ที่บันทึกไว้แล้ว */

export const PERM_LEVELS = [PERM_NONE, PERM_VIEW, PERM_WRITE, PERM_EDIT];

export const PERM_META = {
  [PERM_NONE]: { label: 'ไม่มีสิทธิ์', short: 'ไม่มีสิทธิ์', badge: 'grey' },
  [PERM_VIEW]: { label: 'อ่านได้อย่างเดียว', short: 'อ่าน', badge: 'blue' },
  [PERM_WRITE]: { label: 'เขียนได้', short: 'เขียน', badge: 'orange' },
  [PERM_EDIT]: { label: 'อ่านและเขียนได้', short: 'อ่าน+เขียน', badge: 'green' },
};

export const permLabel = (level) => (PERM_META[level] || PERM_META[PERM_NONE]).label;

/* ══════════════════════════════════════════════════════════════════════
   โครงต้นไม้ของสิทธิ์
   ══════════════════════════════════════════════════════════════════════ */

/* เมนูของแต่ละระบบ → node ระดับ "เมนู" พร้อมลูก (เมนูย่อย)
   คีย์ประกอบเป็น `<system>.<menu>` และ `<system>.<menu>.<submenu>` เพื่อให้
   record เก็บเป็น map แบน ๆ ได้เหมือนเดิม แต่อ่านลำดับชั้นออกจากคีย์ */
/* `subItems` = เมนูย่อยที่กางเป็น SideSubMenu ข้างราง · `tabItems` = หน้าย่อย
   ที่สลับกันด้วยแท็บในหน้า (เช่น "โครงสร้างองค์กรและสิทธิ์") — ทั้งสองแบบคือ
   "เมนูย่อย" ในสายตาของสิทธิ์เท่ากัน จึงแตกเป็นใบเหมือนกัน (29 ส.ค. 69) */
function menusFromNav(systemKey, nav) {
  return (nav || []).map((item) => ({
    key: `${systemKey}.${item.key}`,
    label: item.label,
    children: (item.subItems || item.tabItems || []).map((sub) => ({
      key: `${systemKey}.${item.key}.${sub.key}`,
      label: sub.label,
    })),
  }));
}

export const ACCESS_SYSTEMS = [
  { key: 'phcis', label: 'ระบบ PHCIS', menus: menusFromNav('phcis', PHCIS_SIDE_MENU) },
  { key: 'consent', label: 'ระบบจัดการความยินยอม', menus: menusFromNav('consent', CONSENT_NAV) },
  { key: 'edocument', label: 'คลังเอกสาร e-document', menus: menusFromNav('edocument', EDOCUMENT_NAV) },
  { key: 'system', label: 'ระบบจัดการระบบ', menus: menusFromNav('system', SYSTEM_NAV) },
  { key: 'audit', label: 'ระบบประวัติการใช้งาน', menus: menusFromNav('audit', AUDIT_NAV) },
];

/** ใบทั้งหมดของเมนูหนึ่ง — ไม่มีเมนูย่อย = ตัวมันเองเป็นใบ */
export function menuLeafKeys(menu) {
  return menu.children.length ? menu.children.map((c) => c.key) : [menu.key];
}

/** ใบทั้งหมดของระบบหนึ่ง */
export function systemLeafKeys(system) {
  return system.menus.flatMap(menuLeafKeys);
}

/** ใบทั้งหมดของทุกระบบ — ใช้ตั้งค่าเริ่มต้นและนับสถิติ */
export const ALL_LEAF_KEYS = ACCESS_SYSTEMS.flatMap(systemLeafKeys);

/** ระดับสรุปของกลุ่มใบ: เหมือนกันหมดคืนระดับนั้น · ไม่เหมือนคืน 'mixed' */
export const PERM_MIXED = 'mixed';

export function rollupLevel(permissions, leafKeys) {
  const levels = new Set(leafKeys.map((k) => permissions[k] || PERM_NONE));
  if (levels.size === 1) return [...levels][0];
  return PERM_MIXED;
}

/** เซ็ตระดับให้ทุกใบในกลุ่มพร้อมกัน */
export function setLevelForLeaves(permissions, leafKeys, level) {
  const next = { ...permissions };
  leafKeys.forEach((k) => { next[k] = level; });
  return next;
}

/* ══════════════════════════════════════════════════════════════════════
   record เดิม (สิทธิ์ระดับโมดูลแบน ๆ) → ต้นไม้ใหม่
   ══════════════════════════════════════════════════════════════════════
   คีย์เดิม 17 ตัวจับคู่กับ "เมนู" ของโครงใหม่ แล้วกระจายลงทุกเมนูย่อยของเมนูนั้น
   คีย์ไหนไม่มีคู่ (โมดูลเดิมที่ไม่ตรงกับเมนูจริง) ก็ปล่อยทิ้ง — สิทธิ์ที่เหลือ
   เป็น 'none' ซึ่งปลอดภัยไว้ก่อน */
const LEGACY_MODULE_MAP = {
  'phcis.dashboard': 'phcis.dashboard',
  'phcis.mr': 'phcis.registration',
  'phcis.opd': 'phcis.opd',
  'phcis.treatment': 'phcis.treat',
  'phcis.radiology': 'phcis.radiology',
  'phcis.pharmacy': 'phcis.pharmacy',
  'phcis.finance': 'phcis.finance',
  'phcis.appointment': 'phcis.appoint',
  'consent.dashboard': 'consent.consent-dashboard',
  'consent.manage': 'consent.consent-manage',
  'consent.forms': 'consent.consent-forms',
  'consent.create': 'consent.consent-new',
  'consent.access': 'consent.consent-access',
  'consent.reports': 'consent.consent-reports',
  'edocument.dashboard': 'edocument.edocument-dashboard',
  'edocument.catalog': 'edocument.edocument-catalog',
  'edocument.create': 'edocument.edocument-new',
};

const MENU_BY_KEY = new Map(
  ACCESS_SYSTEMS.flatMap((s) => s.menus.map((m) => [m.key, m])),
);

/** true = map นี้ยังเป็นสิทธิ์ยุคโมดูลแบน ๆ (ไม่มีคีย์ของต้นไม้ใหม่เลย) */
export function isLegacyPermissions(permissions) {
  const keys = Object.keys(permissions || {});
  if (!keys.length) return false;
  return keys.some((k) => LEGACY_MODULE_MAP[k]) && !keys.some((k) => ALL_LEAF_KEYS.includes(k));
}

export function migrateLegacyPermissions(permissions) {
  let next = emptyPermissions();
  Object.entries(permissions || {}).forEach(([legacyKey, level]) => {
    const menuKey = LEGACY_MODULE_MAP[legacyKey];
    const menu = menuKey && MENU_BY_KEY.get(menuKey);
    if (!menu || !level || level === PERM_NONE) return;
    next = setLevelForLeaves(next, menuLeafKeys(menu), level);
  });
  return next;
}

export function emptyPermissions() {
  return Object.fromEntries(ALL_LEAF_KEYS.map((k) => [k, PERM_NONE]));
}

/** สิทธิ์ที่อ่านออกมาใช้งานได้เสมอ — เติมใบที่ขาด ย้าย record ยุคเก่าให้อัตโนมัติ */
export function normalizePermissions(permissions) {
  const source = isLegacyPermissions(permissions)
    ? migrateLegacyPermissions(permissions)
    : (permissions || {});
  return { ...emptyPermissions(), ...pickLeafLevels(source) };
}

function pickLeafLevels(source) {
  return Object.fromEntries(
    Object.entries(source).filter(([k, v]) => ALL_LEAF_KEYS.includes(k) && PERM_LEVELS.includes(v)),
  );
}

/** นับใบตามระดับ — ใช้กับคอลัมน์สรุปในทะเบียนและการ์ดในหน้ารายละเอียด */
export function countPermissionLevels(permissions) {
  const p = normalizePermissions(permissions);
  const acc = { none: 0, view: 0, write: 0, edit: 0 };
  ALL_LEAF_KEYS.forEach((k) => { acc[p[k] || PERM_NONE] += 1; });
  return acc;
}

/** ระบบที่แม่แบบนี้แตะถึง (มีอย่างน้อยหนึ่งใบที่ไม่ใช่ 'ไม่มีสิทธิ์') */
export function grantedSystems(permissions) {
  const p = normalizePermissions(permissions);
  return ACCESS_SYSTEMS.filter((s) => systemLeafKeys(s).some((k) => p[k] && p[k] !== PERM_NONE));
}
