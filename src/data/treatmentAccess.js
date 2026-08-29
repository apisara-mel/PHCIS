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
import { appendAudit, CURRENT_CLINICIAN } from '@/data/treatmentAudit';

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

/* Demo default — full edit + confidential so SOAP / CPOE panels open
   without flipping the SafetyRail. Presenters can still switch to
   "ไม่มีสิทธิ์" mid-demo; a refresh lands back on full access. */
export const DEMO_DEFAULT_TREATMENT_MODE = 'edit';

try {
  if (typeof window !== 'undefined') {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw == null || raw === 'none') {
      window.localStorage.setItem(STORAGE_KEY, DEMO_DEFAULT_TREATMENT_MODE);
    }
  }
} catch (e) { /* SSR / private mode */ }

const readMode = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && TREATMENT_PERMISSION_MODES.some((m) => m.key === raw)) return raw;
  } catch (e) { /* SSR / private mode — fall through to derived default */ }
  return DEMO_DEFAULT_TREATMENT_MODE;
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
  const mode = TREATMENT_PERMISSION_MODES.find((m) => m.key === overrideKey);
  if (mode) {
    return {
      mode: mode.key,
      permission: mode.perm,
      canView: mode.perm !== PERM_NONE,
      canEdit: mode.perm === PERM_EDIT,
      canSeeConfidential: mode.confidential,
    };
  }
  /* Fallback when localStorage is unavailable — still prefer full edit
     for demo; otherwise derive from accessControlStore. */
  const perm = derivedModulePerm() || PERM_EDIT;
  const editMode = TREATMENT_PERMISSION_MODES[0];
  if (perm === PERM_EDIT) {
    return {
      mode: editMode.key,
      permission: editMode.perm,
      canView: true,
      canEdit: true,
      canSeeConfidential: true,
    };
  }
  return {
    mode: perm === PERM_VIEW ? 'viewOnly' : 'none',
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

/* ═══════════════════════════════════════════════════════════════
   §1.4.8.1 — นโยบายการเข้าถึงข้อมูลแบบ ABAC (Attribute-based)

   ช่องว่างที่ gap report ระบุ: "ยังไม่มีการกำหนดสิทธิ์รายฟิลด์/รายเอกสาร
   จากหน้าผู้ดูแลระบบ" — /users กำหนดได้แค่ระดับ Role × โมดูล ส่วนการ
   mark ข้อมูลลับทำได้จากหน้าใช้งานเท่านั้น จึงยังไม่ใช่ ABAC เต็มรูปแบบ.

   โมเดลที่ใช้: กฎหนึ่งข้อ = การรวม attribute 3 แกน
     role (ตำแหน่ง) × unit (คลินิก/หน่วยงาน) × category (หมวดข้อมูล)
   → effect (ระดับการเข้าถึง 4 ระดับ เท่ากับ 4 โหมดของ treatmentAccess)

   กฎที่ชนกัน: ใช้ effect ที่ "เข้มกว่า" เสมอ (deny wins) และต้องบอกได้ว่า
   กฎข้อไหนเป็นตัวชนะ เพื่อให้ผู้ดูแลระบบ debug ได้.

   ข้อจำกัดที่ต้องรายงานตามจริง: นโยบายนี้กั้นที่ชั้น UI เท่านั้น —
   การบังคับใช้จริงต้องทำที่ API/DB ฝั่ง backend และ field-level encryption
   at rest ยังไม่มี. */

/* 4 ระดับผลลัพธ์ เรียงจากเข้มไปหลวม (index ต่ำ = เข้มกว่า) */
export const POLICY_EFFECTS = [
  { key: 'hidden',   label: 'ซ่อน (••••)',   rank: 0, badge: 'error',   description: 'ปิดบังค่าเป็นจุดไข่ปลา — ต้องผ่านประตูขอเปิดดูพร้อมเหตุผลจึงจะเห็น' },
  { key: 'readOnly', label: 'อ่านอย่างเดียว', rank: 1, badge: 'warning', description: 'เห็นค่าได้ แต่ปุ่มบันทึก/แก้ไขถูกปิดพร้อมบอกเหตุผล' },
  { key: 'write',    label: 'บันทึกได้',      rank: 2, badge: 'info',    description: 'เพิ่ม/แก้ไขข้อมูลในหมวดนี้ได้ แต่ยังไม่เห็นค่าที่ทำเครื่องหมายข้อมูลลับ' },
  { key: 'full',     label: 'เต็ม',          rank: 3, badge: 'success', description: 'เห็นและแก้ไขได้ทั้งหมด รวมถึงค่าที่ทำเครื่องหมายข้อมูลลับ' },
];

export const policyEffectMeta = (key) =>
  POLICY_EFFECTS.find((e) => e.key === key) || POLICY_EFFECTS[0];

/* แกนที่ 1 — บทบาท (ยึดตำแหน่งจริงของ ศบส.) */
export const POLICY_ROLES = [
  { value: 'doctor',      label: 'แพทย์' },
  { value: 'nurse',       label: 'พยาบาลวิชาชีพ' },
  { value: 'pharmacist',  label: 'เภสัชกร' },
  { value: 'labTech',     label: 'นักเทคนิคการแพทย์' },
  { value: 'radTech',     label: 'นักรังสีการแพทย์' },
  { value: 'medRecord',   label: 'เจ้าหน้าที่เวชระเบียน' },
  { value: 'finance',     label: 'เจ้าหน้าที่การเงิน' },
  { value: 'socialWork',  label: 'นักสังคมสงเคราะห์' },
  { value: 'admin',       label: 'ผู้ดูแลระบบ' },
];

export const policyRoleLabel = (v) =>
  POLICY_ROLES.find((r) => r.value === v)?.label || v;

/* แกนที่ 2 — หน่วยงาน / คลินิกที่ผู้ใช้สังกัด */
export const POLICY_UNITS = [
  { value: 'all',        label: 'ทุกหน่วยงาน' },
  { value: 'opd',        label: 'ห้องตรวจทั่วไป (OPD)' },
  { value: 'ncd',        label: 'คลินิกโรคเรื้อรัง (NCD)' },
  { value: 'anc',        label: 'คลินิกฝากครรภ์ (ANC)' },
  { value: 'mentalHealth', label: 'คลินิกสุขภาพจิต' },
  { value: 'hiv',        label: 'คลินิกรักปลอดภัย' },
  { value: 'pharmacy',   label: 'ห้องยา' },
  { value: 'lab',        label: 'ห้องปฏิบัติการ' },
  { value: 'homeVisit',  label: 'งานเยี่ยมบ้าน' },
  { value: 'finance',    label: 'งานการเงิน' },
];

export const policyUnitLabel = (v) =>
  POLICY_UNITS.find((u) => u.value === v)?.label || v;

/* แกนที่ 3 — หมวดข้อมูล (ระดับฟิลด์/เอกสารตามที่ TOR สั่ง) */
export const POLICY_CATEGORIES = [
  { value: 'vitals',      label: 'สัญญาณชีพและการคัดกรอง',        kind: 'field'    },
  { value: 'diagnosis',   label: 'การวินิจฉัยโรค (ICD-10/SNOMED)', kind: 'field'    },
  { value: 'labResult',   label: 'ผลตรวจทางห้องปฏิบัติการ',        kind: 'field'    },
  { value: 'radResult',   label: 'ผลตรวจทางรังสีวิทยา',            kind: 'field'    },
  { value: 'medication',  label: 'รายการยาและการสั่งจ่าย',          kind: 'field'    },
  { value: 'soapNote',    label: 'บันทึก SOAP / บันทึกทางคลินิก',   kind: 'field'    },
  { value: 'hivStatus',   label: 'สถานะ HIV / โรคติดต่อทางเพศฯ',    kind: 'field',    confidentialByDefault: true },
  { value: 'mentalNote',  label: 'บันทึกสุขภาพจิต',                kind: 'field',    confidentialByDefault: true },
  { value: 'socialNote',  label: 'บันทึกทางสังคมสงเคราะห์',         kind: 'field',    confidentialByDefault: true },
  { value: 'certificate', label: 'ใบรับรองแพทย์',                  kind: 'document' },
  { value: 'referDoc',    label: 'เอกสารการส่งต่อ',                kind: 'document' },
  { value: 'consentDoc',  label: 'แบบฟอร์มความยินยอม',             kind: 'document' },
  { value: 'attachment',  label: 'ไฟล์แนบในเวชระเบียน',            kind: 'document' },
  { value: 'billing',     label: 'ค่าใช้จ่ายและสิทธิเรียกเก็บ',      kind: 'field'    },
];

export const policyCategoryMeta = (v) =>
  POLICY_CATEGORIES.find((c) => c.value === v) || null;

export const policyCategoryLabel = (v) => policyCategoryMeta(v)?.label || v;

let policySeq = 0;
const policyUid = () => `pol-${Date.now().toString(36)}-${(policySeq += 1)}`;

/* กฎตั้งต้น — สะท้อนการทำงานจริงของ ศบส. (แพทย์เห็นทุกอย่าง, เภสัชกร
   ไม่ต้องเห็นบันทึกสุขภาพจิต, การเงินเห็นเฉพาะค่าใช้จ่าย ฯลฯ) */
const POLICIES = [
  { id: 'pol-seed-1',  role: 'doctor',     unit: 'all',        category: 'diagnosis',   effect: 'full',     active: true, note: 'แพทย์เป็นเจ้าของการวินิจฉัย' },
  { id: 'pol-seed-2',  role: 'doctor',     unit: 'all',        category: 'labResult',   effect: 'full',     active: true, note: '' },
  { id: 'pol-seed-3',  role: 'doctor',     unit: 'all',        category: 'medication',  effect: 'full',     active: true, note: '' },
  { id: 'pol-seed-4',  role: 'doctor',     unit: 'all',        category: 'soapNote',    effect: 'full',     active: true, note: '' },
  { id: 'pol-seed-5',  role: 'nurse',      unit: 'opd',        category: 'vitals',      effect: 'full',     active: true, note: 'พยาบาลคัดกรองเป็นผู้บันทึกสัญญาณชีพ' },
  { id: 'pol-seed-6',  role: 'nurse',      unit: 'opd',        category: 'diagnosis',   effect: 'readOnly', active: true, note: 'พยาบาลอ่านผลวินิจฉัยได้แต่ไม่แก้' },
  { id: 'pol-seed-7',  role: 'nurse',      unit: 'all',        category: 'medication',  effect: 'readOnly', active: true, note: '' },
  { id: 'pol-seed-8',  role: 'pharmacist', unit: 'pharmacy',   category: 'medication',  effect: 'full',     active: true, note: 'เภสัชกรจ่ายยาและบันทึกการให้คำปรึกษา' },
  { id: 'pol-seed-9',  role: 'pharmacist', unit: 'pharmacy',   category: 'diagnosis',   effect: 'readOnly', active: true, note: 'ต้องเห็นวินิจฉัยเพื่อตรวจสอบข้อบ่งใช้' },
  { id: 'pol-seed-10', role: 'pharmacist', unit: 'all',        category: 'mentalNote',  effect: 'hidden',   active: true, note: 'ไม่จำเป็นต่อการจ่ายยา' },
  { id: 'pol-seed-11', role: 'labTech',    unit: 'lab',        category: 'labResult',   effect: 'full',     active: true, note: '' },
  { id: 'pol-seed-12', role: 'labTech',    unit: 'lab',        category: 'soapNote',    effect: 'hidden',   active: true, note: '' },
  { id: 'pol-seed-13', role: 'radTech',    unit: 'all',        category: 'radResult',   effect: 'full',     active: true, note: '' },
  { id: 'pol-seed-14', role: 'medRecord',  unit: 'all',        category: 'attachment',  effect: 'write',    active: true, note: 'สแกนเอกสารเข้าเวชระเบียน' },
  { id: 'pol-seed-15', role: 'medRecord',  unit: 'all',        category: 'hivStatus',   effect: 'hidden',   active: true, note: 'ข้อมูลลับตามระเบียบ' },
  { id: 'pol-seed-16', role: 'finance',    unit: 'finance',    category: 'billing',     effect: 'full',     active: true, note: '' },
  { id: 'pol-seed-17', role: 'finance',    unit: 'finance',    category: 'diagnosis',   effect: 'readOnly', active: true, note: 'ใช้ประกอบการเรียกเก็บตามสิทธิ' },
  { id: 'pol-seed-18', role: 'finance',    unit: 'all',        category: 'soapNote',    effect: 'hidden',   active: true, note: '' },
  { id: 'pol-seed-19', role: 'socialWork', unit: 'homeVisit',  category: 'socialNote',  effect: 'full',     active: true, note: '' },
  { id: 'pol-seed-20', role: 'socialWork', unit: 'all',        category: 'labResult',   effect: 'hidden',   active: true, note: '' },
  { id: 'pol-seed-21', role: 'doctor',     unit: 'mentalHealth', category: 'mentalNote', effect: 'full',    active: true, note: 'เฉพาะแพทย์ในคลินิกสุขภาพจิต' },
  { id: 'pol-seed-22', role: 'doctor',     unit: 'opd',        category: 'mentalNote',  effect: 'hidden',   active: true, note: 'แพทย์ OPD ทั่วไปไม่เห็นบันทึกสุขภาพจิต — กฎนี้ชนะกฎ "แพทย์เห็นเต็ม" เพราะเข้มกว่า' },
  { id: 'pol-seed-23', role: 'doctor',     unit: 'hiv',        category: 'hivStatus',   effect: 'full',     active: true, note: '' },
  { id: 'pol-seed-24', role: 'nurse',      unit: 'anc',        category: 'vitals',      effect: 'full',     active: true, note: '' },
  { id: 'pol-seed-25', role: 'admin',      unit: 'all',        category: 'attachment',  effect: 'readOnly', active: true, note: 'ผู้ดูแลระบบดูได้เพื่อสนับสนุน แต่ห้ามแก้เนื้อหาเวชระเบียน' },
  { id: 'pol-seed-26', role: 'doctor',     unit: 'all',        category: 'certificate', effect: 'full',     active: true, note: '' },
  { id: 'pol-seed-27', role: 'nurse',      unit: 'all',        category: 'certificate', effect: 'readOnly', active: false, note: 'ปิดใช้ชั่วคราว — รอสำนักอนามัยยืนยันระเบียบการออกใบรับรองโดยพยาบาล' },
  { id: 'pol-seed-28', role: 'doctor',     unit: 'all',        category: 'referDoc',    effect: 'full',     active: true, note: '' },
  { id: 'pol-seed-29', role: 'socialWork', unit: 'homeVisit',  category: 'referDoc',    effect: 'write',    active: true, note: 'รับใบส่งต่อภายในและบันทึกผลการเยี่ยม' },
  { id: 'pol-seed-30', role: 'nurse',      unit: 'homeVisit',  category: 'socialNote',  effect: 'readOnly', active: true, note: '' },
];

const policyListeners = new Set();
const emitPolicies = () => { policyListeners.forEach((fn) => fn(POLICIES)); };

export const subscribeAccessPolicies = (fn) => {
  policyListeners.add(fn);
  return () => { policyListeners.delete(fn); };
};

export const getAccessPolicies = () => POLICIES.map((p) => ({ ...p }));

export const blankAccessPolicy = () => ({
  id: '', role: '', unit: 'all', category: '', effect: 'readOnly',
  active: true, note: '',
});

/* บันทึกลง audit — treatmentAudit.js ไม่ import ไฟล์นี้ จึงไม่มี cycle
   (ห้ามใช้ require() ที่นี่: Vite เป็น ESM ล้วน require จะ undefined) */
const auditPolicy = (entry) => {
  appendAudit({ hn: '—', category: 'policy', by: CURRENT_CLINICIAN.name, ...entry });
};

const describePolicy = (p) =>
  `${policyRoleLabel(p.role)} × ${policyUnitLabel(p.unit)} × ${policyCategoryLabel(p.category)}`;

export const saveAccessPolicy = (draft) => {
  const isNew = !draft.id || !POLICIES.some((p) => p.id === draft.id);
  if (isNew) {
    const row = { ...draft, id: policyUid() };
    POLICIES.unshift(row);
    emitPolicies();
    auditPolicy({
      field: `เพิ่มกฎการเข้าถึง ${describePolicy(row)}`,
      oldValue: '—',
      newValue: policyEffectMeta(row.effect).label,
    });
    return { ...row };
  }
  const row = POLICIES.find((p) => p.id === draft.id);
  const before = policyEffectMeta(row.effect).label;
  Object.assign(row, draft);
  emitPolicies();
  auditPolicy({
    field: `แก้ไขกฎการเข้าถึง ${describePolicy(row)}`,
    oldValue: before,
    newValue: policyEffectMeta(row.effect).label,
  });
  return { ...row };
};

/* ปิด/เปิดใช้กฎ — การปิดต้องมีเหตุผลเสมอ (TOR edge case) */
export const setAccessPolicyActive = (id, active, reason) => {
  const row = POLICIES.find((p) => p.id === id);
  if (!row) return null;
  const before = row.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน';
  row.active = !!active;
  if (!active) row.disabledReason = reason || 'ไม่ได้ระบุเหตุผล';
  else row.disabledReason = '';
  emitPolicies();
  auditPolicy({
    field: `${active ? 'เปิดใช้' : 'ปิดใช้'}กฎการเข้าถึง ${describePolicy(row)}`,
    oldValue: before,
    newValue: `${active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}${!active && reason ? ` — ${reason}` : ''}`,
  });
  return { ...row };
};

/* ── ตัวตัดสิน: กฎไหนชนะสำหรับ (role, unit, category) ──────────────
   กฎที่ unit='all' ใช้กับทุกหน่วยงาน. เมื่อมีหลายกฎเข้าเงื่อนไข ให้ใช้
   effect ที่ rank ต่ำที่สุด (เข้มที่สุด) และคืน `winner` + `considered`
   เพื่อให้ UI อธิบายได้ว่าทำไมถึงได้ผลลัพธ์นี้.

   `policies` เผื่อให้ผู้เรียกส่ง "ชุดกฎสมมติ" เข้ามาได้ — popup แก้ไขกฎ
   ต้องคำนวณผลของกฎ *ฉบับที่กำลังพิมพ์อยู่* ไม่ใช่ฉบับที่ยังค้างในสโตร์
   ไม่งั้นจะเตือนว่า "มีกฎอื่นเข้มกว่า" โดยชี้ไปที่กฎที่ผู้ใช้กำลังแก้เอง. */
export const resolvePolicy = (role, unit, category, policies = getAccessPolicies()) => {
  const considered = policies.filter((p) => p.active
    && p.role === role
    && p.category === category
    && (p.unit === 'all' || p.unit === unit));

  if (considered.length === 0) {
    return {
      effect: 'hidden',
      winner: null,
      considered: [],
      /* ไม่มีกฎ = ปฏิเสธโดยปริยาย (deny by default) ซึ่งเป็นหลักของ ABAC */
      reason: 'ไม่มีกฎที่ตรงกับคุณลักษณะนี้ — ระบบปฏิเสธโดยปริยาย (deny by default)',
    };
  }

  const winner = considered.reduce((a, b) =>
    (policyEffectMeta(b.effect).rank < policyEffectMeta(a.effect).rank ? b : a));

  return {
    effect: winner.effect,
    winner,
    considered,
    reason: considered.length > 1
      ? `มีกฎที่เข้าเงื่อนไข ${considered.length} ข้อ — ใช้กฎที่เข้มที่สุด (${policyEffectMeta(winner.effect).label}) จาก "${describePolicy(winner)}"`
      : `ใช้กฎเดียวที่ตรงเงื่อนไข: ${describePolicy(winner)}`,
  };
};

/* ผลของ role หนึ่งต่อทุกหมวดข้อมูล — ใช้ในโหมด "ทดลองมุมมอง" */
export const previewPolicyFor = (role, unit) =>
  POLICY_CATEGORIES.map((c) => ({
    category: c,
    ...resolvePolicy(role, unit, c.value),
  }));

/* แปลง effect → รูปแบบเดียวกับ getTreatmentAccess() เพื่อให้ MaskedValue /
   GuardedAction ที่มีอยู่แล้วใช้ผลจากนโยบายได้โดยไม่ต้องเขียน gate ใหม่ */
export const effectToAccess = (effect) => ({
  mode: effect,
  permission: effect === 'hidden' ? PERM_NONE : effect === 'readOnly' ? PERM_VIEW : PERM_EDIT,
  canView: effect !== 'hidden',
  canEdit: effect === 'write' || effect === 'full',
  canSeeConfidential: effect === 'full',
});

/* หมวดที่ถูกทำเครื่องหมาย "ข้อมูลลับโดยค่าเริ่มต้น" (§1.4.2.1 ฝั่ง UI) */
export const defaultConfidentialCategories = () =>
  POLICY_CATEGORIES.filter((c) => c.confidentialByDefault);
