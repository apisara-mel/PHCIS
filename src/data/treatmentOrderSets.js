/* PHCIS | CPOE §1.5.7 (ชุดคำสั่ง) + §1.5.9 (ตั้งค่ารายการสั่งการรักษา)
   + เกณฑ์การแจ้งเตือน CDSS ที่ TOR §1.5.4.18–.21 ย้ำไว้ทุกข้อว่า
   "และมีระบบที่สามารถระบุเกณฑ์การแจ้งเตือนเองได้".

   ชุดคำสั่งหนึ่งชุดผสมได้ทั้ง ยา + Lab + X-ray + หัตถการ (§1.5.7.1).
   Mock in-memory + pub/sub (React 17 — subscribe + useEffect). */

import { CURRENT_CLINICIAN, stampNow, appendAudit } from '@/data/treatmentAudit';

export const ORDER_SET_SCOPES = [
  { key: 'personal', label: 'ของฉัน (รายแพทย์)', badge: 'blue' },
  { key: 'shared',   label: 'ใช้ร่วมทั้งศูนย์',   badge: 'teal' },
];

export const orderSetScopeMeta = (key) =>
  ORDER_SET_SCOPES.find((s) => s.key === key) || ORDER_SET_SCOPES[0];

export const ORDER_SET_ITEM_KINDS = [
  { key: 'medication', label: 'ยา',       icon: 'pill',        badge: 'magenta' },
  { key: 'lab',        label: 'แล็บ',      icon: 'science',     badge: 'blue'    },
  { key: 'xray',       label: 'X-ray',    icon: 'radiology',   badge: 'purple'  },
  { key: 'procedure',  label: 'หัตถการ',   icon: 'medical_services', badge: 'orange' },
];

export const itemKindMeta = (key) =>
  ORDER_SET_ITEM_KINDS.find((k) => k.key === key) || { key, label: key, icon: 'list', badge: 'grey' };

export const blankOrderSet = () => ({
  id: '',
  name: '',
  scope: 'personal',
  owner: CURRENT_CLINICIAN.name,
  description: '',
  items: [],
  active: true,
  createdAt: '',
  updatedAt: '',
  lastUsedAt: '',
  useCount: 0,
});

export const blankOrderSetItem = (kind = 'medication') => ({
  id: `osi-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
  kind,
  refId: '',
  label: '',
  /* ค่า default ต่อรายการ */
  dosePerTake: '',
  frequency: '',
  days: '',
  urgency: 'routine',
  note: '',
});

const ORDER_SETS = [
  {
    id: 'os-1',
    name: 'ชุดตรวจติดตามเบาหวาน (DM follow-up)',
    scope: 'shared',
    owner: 'ศูนย์บริการสาธารณสุข 4 ดินแดง',
    description: 'ชุดมาตรฐานสำหรับผู้ป่วยเบาหวานมาตามนัดทุก 3 เดือน',
    items: [
      { id: 'os1-1', kind: 'lab', refId: 'lab-hba1c', label: 'HbA1C', urgency: 'routine', note: 'ติดตามน้ำตาลสะสม' },
      { id: 'os1-2', kind: 'lab', refId: 'lab-fbs', label: 'FBS (น้ำตาลในเลือดหลังงดอาหาร)', urgency: 'routine', note: 'งดอาหาร 8 ชม.' },
      { id: 'os1-3', kind: 'lab', refId: 'lab-creatinine', label: 'Creatinine', urgency: 'routine', note: 'ประเมินการทำงานของไต' },
      { id: 'os1-4', kind: 'lab', refId: 'lab-lipid', label: 'Lipid profile', urgency: 'routine', note: 'งดอาหาร 12 ชม.' },
      { id: 'os1-5', kind: 'medication', refId: '', label: 'Metformin 500 mg', dosePerTake: '1', frequency: 'วันละ 2 ครั้ง', days: '90', note: 'หลังอาหารเช้า-เย็น' },
    ],
    active: true,
    createdAt: '12 ม.ค. 2569 · 09:00', updatedAt: '2 เม.ย. 2569 · 14:10',
    lastUsedAt: '6 พ.ค. 2569 · 09:12', useCount: 47,
  },
  {
    id: 'os-2',
    name: 'ชุดไข้หวัดและติดเชื้อทางเดินหายใจส่วนบน',
    scope: 'personal',
    owner: 'พญ.สมหญิง รักษ์ดี',
    description: 'ยาตามอาการสำหรับ URI ที่ไม่มีข้อบ่งชี้ยาปฏิชีวนะ',
    items: [
      { id: 'os2-1', kind: 'medication', refId: '', label: 'Paracetamol 500 mg', dosePerTake: '1', frequency: 'ทุก 6 ชั่วโมง เมื่อมีไข้', days: '3', note: 'ไม่เกินวันละ 8 เม็ด' },
      { id: 'os2-2', kind: 'medication', refId: '', label: 'Cetirizine 10 mg', dosePerTake: '1', frequency: 'วันละ 1 ครั้ง', days: '5', note: 'ก่อนนอน อาจง่วง' },
      { id: 'os2-3', kind: 'medication', refId: '', label: 'Bromhexine 8 mg', dosePerTake: '1', frequency: 'วันละ 3 ครั้ง', days: '5', note: 'หลังอาหาร' },
    ],
    active: true,
    createdAt: '3 ก.พ. 2569 · 10:20', updatedAt: '3 ก.พ. 2569 · 10:20',
    lastUsedAt: '6 พ.ค. 2569 · 10:40', useCount: 128,
  },
  {
    id: 'os-3',
    name: 'ชุดประเมินอาการปวดท้องเฉียบพลัน',
    scope: 'shared',
    owner: 'ศูนย์บริการสาธารณสุข 4 ดินแดง',
    description: 'ตรวจพื้นฐานสำหรับผู้รับบริการปวดท้องที่ยังแยกโรคไม่ได้',
    items: [
      { id: 'os3-1', kind: 'lab', refId: 'lab-cbc', label: 'CBC', urgency: 'urgent', note: 'ประเมินการติดเชื้อ' },
      { id: 'os3-2', kind: 'lab', refId: 'lab-ua', label: 'Urinalysis (UA)', urgency: 'routine', note: 'แยกโรคทางเดินปัสสาวะ' },
      { id: 'os3-3', kind: 'xray', refId: 'xr-acute-abd', label: 'เอกซเรย์ช่องท้องเฉียบพลัน', urgency: 'urgent', note: 'ซักประวัติตั้งครรภ์ก่อนถ่ายภาพ' },
      { id: 'os3-4', kind: 'procedure', refId: '', label: 'ให้สารน้ำทางหลอดเลือดดำ (IV fluid)', note: 'ประเมินภาวะขาดน้ำก่อน' },
    ],
    active: true,
    createdAt: '18 มี.ค. 2569 · 13:05', updatedAt: '18 มี.ค. 2569 · 13:05',
    lastUsedAt: '5 พ.ค. 2569 · 16:22', useCount: 19,
  },
  {
    id: 'os-4',
    name: 'ชุดทำแผลและตัดไหม',
    scope: 'personal',
    owner: 'พญ.สมหญิง รักษ์ดี',
    description: 'ยาและหัตถการสำหรับติดตามแผลหลังเย็บ',
    items: [
      { id: 'os4-1', kind: 'procedure', refId: '', label: 'ทำแผลสะอาดขนาดเล็ก', note: 'ล้างด้วย NSS ปิดผ้าก๊อซ' },
      { id: 'os4-2', kind: 'procedure', refId: '', label: 'ตัดไหม', note: 'นัดหลังเย็บ 7 วัน' },
      { id: 'os4-3', kind: 'medication', refId: '', label: 'Paracetamol 500 mg', dosePerTake: '1', frequency: 'ทุก 6 ชั่วโมง เมื่อปวด', days: '3', note: '' },
    ],
    active: false,
    createdAt: '5 เม.ย. 2569 · 08:45', updatedAt: '20 เม.ย. 2569 · 09:30',
    lastUsedAt: '20 เม.ย. 2569 · 09:30', useCount: 6,
  },
];

const setListeners = new Set();
const emitSets = () => setListeners.forEach((fn) => fn(ORDER_SETS));

export const subscribeOrderSets = (fn) => {
  setListeners.add(fn);
  return () => { setListeners.delete(fn); };
};

export const getOrderSets = () => ORDER_SETS.map((s) => ({ ...s, items: s.items.map((i) => ({ ...i })) }));

export const orderSetsForMe = () => getOrderSets().filter(
  (s) => s.active && (s.scope === 'shared' || s.owner === CURRENT_CLINICIAN.name),
);

let setSeq = ORDER_SETS.length;

export const upsertOrderSet = (row) => {
  if (!row.id) {
    setSeq += 1;
    const created = {
      ...blankOrderSet(),
      ...row,
      id: `os-${setSeq}`,
      createdAt: stampNow(),
      updatedAt: stampNow(),
    };
    ORDER_SETS.unshift(created);
    emitSets();
    appendAudit({
      category: 'document', field: `สร้างชุดคำสั่ง "${created.name}"`,
      oldValue: '—', newValue: `${created.items.length} รายการ · ${orderSetScopeMeta(created.scope).label}`,
      by: CURRENT_CLINICIAN.name,
    });
    return { ...created };
  }
  const target = ORDER_SETS.find((s) => s.id === row.id);
  if (!target) return null;
  const before = `${target.name} · ${target.items.length} รายการ`;
  Object.assign(target, row, { updatedAt: stampNow() });
  emitSets();
  appendAudit({
    category: 'document', field: `แก้ไขชุดคำสั่ง "${target.name}"`,
    oldValue: before, newValue: `${target.name} · ${target.items.length} รายการ`,
    by: CURRENT_CLINICIAN.name,
  });
  return { ...target };
};

export const setOrderSetActive = (id, active, reason = '') => {
  const target = ORDER_SETS.find((s) => s.id === id);
  if (!target) return null;
  target.active = active;
  target.updatedAt = stampNow();
  emitSets();
  appendAudit({
    category: 'document', field: `${active ? 'เปิด' : 'ปิด'}ใช้งานชุดคำสั่ง "${target.name}"`,
    oldValue: active ? 'ปิดใช้งาน' : 'เปิดใช้งาน',
    newValue: active ? 'เปิดใช้งาน' : `ปิดใช้งาน — ${reason || 'ไม่ได้ระบุเหตุผล'}`,
    by: CURRENT_CLINICIAN.name,
  });
  return { ...target };
};

/* ยกเลิกชุดคำสั่ง = ปิดใช้งานพร้อมเหตุผล ไม่ลบทิ้ง (คงร่องรอย) */
export const cancelOrderSet = (id, reason) => setOrderSetActive(id, false, reason);

export const markOrderSetUsed = (id) => {
  const target = ORDER_SETS.find((s) => s.id === id);
  if (!target) return null;
  target.useCount = (target.useCount || 0) + 1;
  target.lastUsedAt = stampNow();
  emitSets();
  return { ...target };
};

/* ── §1.5.9.2 ประวัติการเปลี่ยนราคายา ─────────────────────────
   pharmacyRegistry.priceSchedule เก็บ "ราคาที่มีผล" อยู่แล้ว ไฟล์นี้เก็บ
   "ใครเปลี่ยนเมื่อไร" ซึ่งทะเบียนยาไม่ได้เก็บ */
const PRICE_HISTORY = [
  {
    id: 'ph-1', drugId: 'drug-1', drugName: 'Paracetamol 500 mg',
    oldPrice: 0.75, newPrice: 1, effectiveFrom: '2026-01-01',
    by: 'ภก.วราภรณ์ ดีเลิศ', at: '28 ธ.ค. 2568 · 15:20',
    reason: 'ปรับตามราคากลางองค์การเภสัชกรรมปี 2569',
  },
  {
    id: 'ph-2', drugId: 'drug-5', drugName: 'Amlodipine 5 mg',
    oldPrice: 4, newPrice: 5, effectiveFrom: '2026-04-01',
    by: 'ภก.วราภรณ์ ดีเลิศ', at: '25 มี.ค. 2569 · 10:05',
    reason: 'ผู้จำหน่ายปรับราคาขึ้นตามสัญญาจัดซื้อรอบใหม่',
  },
];

const priceListeners = new Set();
export const subscribePriceHistory = (fn) => {
  priceListeners.add(fn);
  return () => { priceListeners.delete(fn); };
};

export const priceHistoryFor = (drugId) =>
  PRICE_HISTORY.filter((p) => !drugId || p.drugId === drugId).map((p) => ({ ...p }));

let priceSeq = PRICE_HISTORY.length;

export const recordPriceChange = ({ drugId, drugName, oldPrice, newPrice, effectiveFrom, reason }) => {
  priceSeq += 1;
  const row = {
    id: `ph-${priceSeq}`, drugId, drugName,
    oldPrice, newPrice, effectiveFrom,
    by: CURRENT_CLINICIAN.name, at: stampNow(),
    reason: reason || 'ไม่ได้ระบุเหตุผล',
  };
  PRICE_HISTORY.unshift(row);
  priceListeners.forEach((fn) => fn(PRICE_HISTORY));
  appendAudit({
    category: 'document', field: `เปลี่ยนราคายา ${drugName}`,
    oldValue: `${oldPrice} บาท`, newValue: `${newPrice} บาท (มีผล ${effectiveFrom}) — ${row.reason}`,
    by: CURRENT_CLINICIAN.name,
  });
  return { ...row };
};

/* ── เกณฑ์การแจ้งเตือน CDSS ที่ตั้งเองได้ (§1.5.4.18–.21) ────── */
export const CDSS_SEVERITIES = [
  { key: 'info',     label: 'ทุกระดับ (รวมข้อมูลทั่วไป)', rank: 1 },
  { key: 'warning',  label: 'ตั้งแต่ระดับเตือน',          rank: 2 },
  { key: 'critical', label: 'เฉพาะระดับรุนแรง',           rank: 3 },
];

export const CDSS_ENFORCEMENTS = [
  { key: 'warn',  label: 'เตือนแล้วผ่านได้ (ระบุเหตุผล)' },
  { key: 'block', label: 'บล็อก — ต้องแก้ก่อนจึงบันทึกได้' },
];

export const CDSS_RULE_DEFS = [
  { key: 'allergy',     label: 'แพ้ยา (Drug Allergy)',            tor: '1.5.4.19', hint: 'ตรงตัวและข้ามกลุ่มจากประวัติแพ้ยาของผู้รับบริการ', lockedOn: true },
  { key: 'interaction', label: 'ปฏิกิริยาระหว่างยา (Interaction)', tor: '1.5.4.20', hint: 'คู่ยาที่มีเอกสารอ้างอิงในทะเบียนยา' },
  { key: 'duplicate',   label: 'ยาซ้ำซ้อน (Duplicate)',           tor: '1.5.4.21', hint: 'ซ้ำในใบเดียวกันและซ้ำภายในวันเดียวกัน' },
  { key: 'dose',        label: 'ขนาดยาเกินเพดาน (Dose limit)',    tor: '1.5.4.18', hint: 'เทียบ mg/kg/dose และ mg/kg/day กับเพดานตามน้ำหนัก' },
  { key: 'highalert',   label: 'ยาความเสี่ยงสูง / ยาควบคุม',       tor: '1.5.4.18', hint: 'High Alert · ยาเสพติดให้โทษ · วัตถุออกฤทธิ์' },
  { key: 'rights',      label: 'สิทธิเบิกไม่ครอบคลุม',            tor: '1.5.1.4',  hint: 'ยา/รายการตรวจที่สิทธิของผู้รับบริการเบิกไม่ได้' },
];

const CDSS_SETTINGS = {
  allergy:     { enabled: true,  minSeverity: 'info',    enforcement: 'block' },
  interaction: { enabled: true,  minSeverity: 'warning', enforcement: 'warn'  },
  duplicate:   { enabled: true,  minSeverity: 'warning', enforcement: 'warn'  },
  dose:        { enabled: true,  minSeverity: 'warning', enforcement: 'warn'  },
  highalert:   { enabled: true,  minSeverity: 'warning', enforcement: 'warn'  },
  rights:      { enabled: true,  minSeverity: 'info',    enforcement: 'warn'  },
};

/* override หน้าต่างเวลา "สั่งซ้ำ" ต่อรายการ Lab / X-ray (§1.5.2.4 / §1.5.3.6) */
const REPEAT_OVERRIDES = {
  lab:  { 'lab-fbs': 3 },
  xray: {},
};

const cdssListeners = new Set();
const emitCdss = () => cdssListeners.forEach((fn) => fn());

export const subscribeCdssSettings = (fn) => {
  cdssListeners.add(fn);
  return () => { cdssListeners.delete(fn); };
};

export const getCdssSettings = () => ({
  rules: Object.fromEntries(Object.entries(CDSS_SETTINGS).map(([k, v]) => [k, { ...v }])),
  repeatOverrides: {
    lab: { ...REPEAT_OVERRIDES.lab },
    xray: { ...REPEAT_OVERRIDES.xray },
  },
});

export const getCdssRule = (key) => ({ ...(CDSS_SETTINGS[key] || { enabled: true, minSeverity: 'info', enforcement: 'warn' }) });

export const isCdssRuleOn = (key) => !!CDSS_SETTINGS[key]?.enabled;

export const cdssBlocks = (key) => CDSS_SETTINGS[key]?.enforcement === 'block';

export const setCdssRule = (key, patch) => {
  const def = CDSS_RULE_DEFS.find((d) => d.key === key);
  const before = { ...(CDSS_SETTINGS[key] || {}) };
  CDSS_SETTINGS[key] = { ...CDSS_SETTINGS[key], ...patch };
  /* แพ้ยาตรงตัวปิดไม่ได้ — TOR ถือเป็นความปลอดภัยขั้นพื้นฐาน */
  if (def?.lockedOn) CDSS_SETTINGS[key].enabled = true;
  emitCdss();
  appendAudit({
    category: 'document', field: `เกณฑ์แจ้งเตือน CDSS — ${def?.label || key}`,
    oldValue: `${before.enabled ? 'เปิด' : 'ปิด'} · ${before.minSeverity} · ${before.enforcement}`,
    newValue: `${CDSS_SETTINGS[key].enabled ? 'เปิด' : 'ปิด'} · ${CDSS_SETTINGS[key].minSeverity} · ${CDSS_SETTINGS[key].enforcement}`,
    by: CURRENT_CLINICIAN.name,
  });
  return getCdssRule(key);
};

export const setRepeatOverride = (kind, itemId, days) => {
  if (!REPEAT_OVERRIDES[kind]) return null;
  if (days == null || days === '') delete REPEAT_OVERRIDES[kind][itemId];
  else REPEAT_OVERRIDES[kind][itemId] = Number(days);
  emitCdss();
  appendAudit({
    category: 'document', field: `หน้าต่างเวลาสั่งซ้ำ (${kind}) — ${itemId}`,
    oldValue: '—', newValue: days == null || days === '' ? 'ใช้ค่ามาตรฐาน' : `${days} วัน`,
    by: CURRENT_CLINICIAN.name,
  });
  return REPEAT_OVERRIDES[kind][itemId] ?? null;
};

/* หน้าต่างเวลาที่มีผลจริง — panel เรียกตัวนี้แทน repeatWindowDays ตรง ๆ */
export const effectiveRepeatWindow = (kind, itemId, fallbackDays) =>
  REPEAT_OVERRIDES[kind]?.[itemId] ?? fallbackDays;

/* ── §1.5.2.10 เทมเพลตแบบฟอร์มใบคำขอตรวจ (store กลาง) ────────
   ก่อนหน้านี้ CpoeDocumentsStep เก็บ list ของตัวเองใน component state
   และ LabOrderPanel เก็บอีก list หนึ่งคนละ shape — เทมเพลตที่สร้าง/แก้/ลบ
   ที่ขั้นเอกสารจึงไม่เคยไปโผล่ใน dropdown ของใบขอตรวจแล็บจริง.
   ย้ายมาไว้ที่นี่ shape เดียว ทั้งสองหน้าจออ่านผ่าน useTreatmentStore. */
const REQUEST_TEMPLATES = [
  {
    id: 'tpl-standard',
    name: 'ใบคำขอมาตรฐาน ศบส.',
    header: 'ศูนย์บริการสาธารณสุข 4 ดินแดง สำนักอนามัย กรุงเทพมหานคร',
    fields: ['hn', 'name', 'rights', 'doctor', 'tests', 'note'],
    prepText: 'กรุณางดอาหารและเครื่องดื่มที่มีน้ำตาลอย่างน้อย 8 ชั่วโมงก่อนเจาะเลือด',
    owner: 'ระบบ (แก้ไขไม่ได้)',
    locked: true,
  },
  {
    id: 'tpl-ncd',
    name: 'ใบคำขอคลินิกโรคเรื้อรัง (NCD)',
    header: 'คลินิกโรคเรื้อรัง (NCD) — ศบส. 4 ดินแดง',
    fields: ['hn', 'name', 'rights', 'doctor', 'tests', 'note', 'prep'],
    prepText: 'งดอาหาร 12 ชั่วโมงก่อนตรวจไขมันในเลือด · นำยาที่ใช้อยู่มาแสดงทุกครั้ง',
    owner: CURRENT_CLINICIAN.name,
    locked: false,
  },
];

const templateListeners = new Set();
const emitTemplates = () => templateListeners.forEach((fn) => fn(REQUEST_TEMPLATES));

export const subscribeRequestTemplates = (fn) => {
  templateListeners.add(fn);
  return () => { templateListeners.delete(fn); };
};

export const getRequestTemplates = () =>
  REQUEST_TEMPLATES.map((t) => ({ ...t, fields: [...(t.fields || [])] }));

export const getRequestTemplate = (id) => {
  const t = REQUEST_TEMPLATES.find((x) => x.id === id);
  return t ? { ...t, fields: [...(t.fields || [])] } : null;
};

let templateSeq = REQUEST_TEMPLATES.length;

export const upsertRequestTemplate = (row) => {
  if (!row?.id) {
    templateSeq += 1;
    const created = {
      id: `tpl-${templateSeq}-${Date.now().toString(36)}`,
      name: row?.name || '',
      header: row?.header || '',
      fields: [...(row?.fields || [])],
      prepText: row?.prepText || '',
      owner: CURRENT_CLINICIAN.name,
      locked: false,
    };
    REQUEST_TEMPLATES.push(created);
    emitTemplates();
    appendAudit({
      category: 'document', field: 'เทมเพลตแบบฟอร์มคำขอตรวจ',
      oldValue: '—', newValue: `สร้าง "${created.name}"`,
      by: CURRENT_CLINICIAN.name,
    });
    return { ...created };
  }
  const target = REQUEST_TEMPLATES.find((t) => t.id === row.id);
  if (!target) return null;
  /* เทมเพลตของระบบแก้ไม่ได้ — กันไว้ที่ store ด้วย ไม่ใช่แค่ที่ UI */
  if (target.locked) return null;
  const before = target.name;
  Object.assign(target, {
    name: row.name ?? target.name,
    header: row.header ?? target.header,
    fields: [...(row.fields || target.fields || [])],
    prepText: row.prepText ?? target.prepText,
  });
  emitTemplates();
  appendAudit({
    category: 'document', field: 'เทมเพลตแบบฟอร์มคำขอตรวจ',
    oldValue: before, newValue: `แก้ไขเป็น "${target.name}"`,
    by: CURRENT_CLINICIAN.name,
  });
  return { ...target };
};

export const removeRequestTemplate = (id, reason = '') => {
  const idx = REQUEST_TEMPLATES.findIndex((t) => t.id === id);
  if (idx < 0) return false;
  if (REQUEST_TEMPLATES[idx].locked) return false;
  const [removed] = REQUEST_TEMPLATES.splice(idx, 1);
  emitTemplates();
  appendAudit({
    category: 'document', field: `ลบเทมเพลตแบบฟอร์มคำขอ "${removed.name}"`,
    oldValue: removed.name, newValue: `ลบแล้ว — ${reason || 'ไม่ได้ระบุเหตุผล'}`,
    by: CURRENT_CLINICIAN.name,
  });
  return true;
};

/* ── §1.5.9.4 สรุปสิทธิ์การสั่งการรักษาตาม role (อ่านอย่างเดียว) ── */
export const ROLE_ORDER_MATRIX = [
  { role: 'แพทย์',            medication: 'สั่งได้', lab: 'สั่งได้', xray: 'สั่งได้', procedure: 'สั่งได้', consult: 'สั่งได้', cancel: 'ยกเลิกได้ (ระบุเหตุผล)' },
  { role: 'ทันตแพทย์',        medication: 'สั่งได้', lab: 'สั่งได้', xray: 'เฉพาะทันตกรรม', procedure: 'เฉพาะทันตกรรม', consult: 'สั่งได้', cancel: 'ยกเลิกของตนเองได้' },
  { role: 'พยาบาลวิชาชีพ',    medication: 'ดูอย่างเดียว', lab: 'สั่งตามแนวทาง (standing order)', xray: 'ดูอย่างเดียว', procedure: 'กิจกรรมพยาบาลเท่านั้น', consult: 'ดูอย่างเดียว', cancel: 'ยกเลิกกิจกรรมพยาบาลของตนเอง' },
  { role: 'เภสัชกร',          medication: 'ทบทวน/ทักท้วง', lab: 'ดูอย่างเดียว', xray: 'ดูอย่างเดียว', procedure: 'ดูอย่างเดียว', consult: 'ดูอย่างเดียว', cancel: 'ไม่ได้' },
  { role: 'นักเทคนิคการแพทย์', medication: 'ไม่เห็น', lab: 'รับคำสั่ง/รายงานผล', xray: 'ไม่เห็น', procedure: 'ไม่เห็น', consult: 'ไม่เห็น', cancel: 'ไม่ได้' },
  { role: 'ผู้ช่วยเหลือคนไข้',  medication: 'ดูอย่างเดียว', lab: 'ดูอย่างเดียว', xray: 'ดูอย่างเดียว', procedure: 'ดูอย่างเดียว', consult: 'ดูอย่างเดียว', cancel: 'ไม่ได้' },
];

export default ORDER_SETS;
