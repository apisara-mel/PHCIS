/* PHCIS | EMR §1.4.2.1 — สิทธิ์การเข้าถึงข้อมูลการรักษา + ข้อมูลลับ.

   ต่อยอดจาก `accessControlStore` (PERM_NONE / PERM_VIEW / PERM_EDIT) ซึ่ง
   เป็นแหล่งสิทธิ์ระดับโมดูลอยู่แล้ว (`phcis.treatment`). สิ่งที่เพิ่มที่นี่
   คือ "feature level" ของข้อมูลลับ ซึ่ง TOR แยกออกจากสิทธิ์แก้ไขปกติ:
   ผู้ใช้อาจแก้ไขบันทึกได้ แต่ยังไม่มีสิทธิ์เห็นค่าที่ถูก mark ข้อมูลลับ.

   ข้อจำกัดที่ต้องรายงานตามจริง: prototype นี้ทำได้แค่ระดับ masking +
   reveal gate + access log — การเข้ารหัสฟิลด์จริง (at-rest encryption)
   ต้องทำฝั่ง backend จึงยังปิดไม่ได้ในเวฟนี้. */

import {
  PERM_NONE, PERM_VIEW, PERM_EDIT, readAccessControls,
} from '@/data/accessControlStore';

export { PERM_NONE, PERM_VIEW, PERM_EDIT };

const STORAGE_KEY = 'mih:treatment-demo-permission';

/* ระดับสิทธิ์ที่ demo สลับได้จากแถบเครื่องมือของหน้า /treat/record —
   มีไว้ให้ตรวจ state "สิทธิ์ไม่พอ" ได้จริงโดยไม่ต้อง login ใหม่. */
export const TREATMENT_PERMISSION_MODES = [
  { key: 'edit',         label: 'แก้ไขได้ + เห็นข้อมูลลับ', perm: PERM_EDIT, confidential: true  },
  { key: 'editMasked',   label: 'แก้ไขได้ · ไม่เห็นข้อมูลลับ', perm: PERM_EDIT, confidential: false },
  { key: 'viewOnly',     label: 'ดูอย่างเดียว',              perm: PERM_VIEW, confidential: false },
  { key: 'none',         label: 'ไม่มีสิทธิ์เข้าถึง',         perm: PERM_NONE, confidential: false },
];

const readMode = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && TREATMENT_PERMISSION_MODES.some((m) => m.key === raw)) return raw;
  } catch (e) { /* SSR / private mode — fall through to derived default */ }
  return null;
};

/* สิทธิ์จริงจาก accessControlStore (ถ้าองค์กรตั้งไว้) — ใช้เป็น default
   เมื่อ demo ยังไม่ override */
const derivedModulePerm = () => {
  const records = readAccessControls() || [];
  const active = records.filter((r) => r.active);
  if (active.length === 0) return PERM_EDIT;
  const levels = active.map((r) => (r.permissions || {})['phcis.treatment'] || PERM_NONE);
  if (levels.includes(PERM_EDIT)) return PERM_EDIT;
  if (levels.includes(PERM_VIEW)) return PERM_VIEW;
  return PERM_NONE;
};

export const getTreatmentAccess = () => {
  const overrideKey = readMode();
  if (overrideKey) {
    const mode = TREATMENT_PERMISSION_MODES.find((m) => m.key === overrideKey);
    return {
      mode: mode.key,
      permission: mode.perm,
      canView: mode.perm !== PERM_NONE,
      canEdit: mode.perm === PERM_EDIT,
      canSeeConfidential: mode.confidential,
    };
  }
  const perm = derivedModulePerm();
  return {
    mode: perm === PERM_EDIT ? 'edit' : perm === PERM_VIEW ? 'viewOnly' : 'none',
    permission: perm,
    canView: perm !== PERM_NONE,
    canEdit: perm === PERM_EDIT,
    canSeeConfidential: perm === PERM_EDIT,
  };
};

const listeners = new Set();
export const subscribeTreatmentAccess = (fn) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};

export const setTreatmentAccessMode = (key) => {
  try { window.localStorage.setItem(STORAGE_KEY, key); } catch (e) { /* ignore */ }
  const next = getTreatmentAccess();
  listeners.forEach((fn) => fn(next));
  return next;
};

/* ข้อความ tooltip มาตรฐานเวลาปุ่มถูก disable เพราะสิทธิ์ไม่พอ */
export const NO_EDIT_RIGHT_TOOLTIP = 'ไม่มีสิทธิ์แก้ไขข้อมูลส่วนนี้';
export const NO_CONFIDENTIAL_RIGHT_TOOLTIP = 'ไม่มีสิทธิ์ระดับ "ข้อมูลลับ" — กดเพื่อขอเปิดดู';
