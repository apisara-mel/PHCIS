/* TOR §1.17.3 — Routing คำสั่งยาระหว่าง Healthcare Service (คลินิก) กับห้องยา.

   กติกาเป็น "ลำดับความสำคัญ" (priority list): เมื่อคำสั่งยาถูกออกจากคลินิก
   ระบบไล่กติกาจากลำดับ 1 ลงไป กติกาแรกที่ตรงเงื่อนไขทั้งหมดคือผู้ชนะ —
   ถ้าห้องยาปลายทางปิด/นอกเวลาให้บริการ ใช้ห้องยาสำรอง (fallback) และถ้าไม่มี
   กติกาใดตรงเลย คำสั่งจะตกไปยังห้องยากลาง (DEFAULT_PHARMACY).

   ข้อมูลทั้งหมดเป็น mock ในหน่วยความจำ (prototype) — ไม่มี backend. */

import { clinicServices, getHealthcareService } from '@/data/usersAccess';

export const DEFAULT_PHARMACY = 'hs-pharm-1';

export const DRUG_CATEGORIES = [
  { key: 'general',  label: 'ยาทั่วไป',                        tone: 'grey'   },
  { key: 'narcotic', label: 'ยาเสพติดให้โทษ/วัตถุออกฤทธิ์',    tone: 'red'    },
  { key: 'cold',     label: 'ยาเย็น (Cold chain)',              tone: 'blue'   },
  { key: 'chemo',    label: 'ยาเคมีบำบัด',                      tone: 'purple' },
  { key: 'special',  label: 'ยาสั่งพิเศษ / เตรียมเฉพาะราย',     tone: 'orange' },
];

export const VISIT_TYPES = [
  { key: 'appointment', label: 'นัดหมาย' },
  { key: 'walkin',      label: 'Walk-in' },
  { key: 'emergency',   label: 'ฉุกเฉิน' },
];

export const SERVICE_WINDOWS = [
  { key: 'in',   label: 'ในเวลาราชการ',  hours: '08:00-16:00' },
  { key: 'out',  label: 'นอกเวลาราชการ', hours: '16:00-20:00' },
  { key: 'any',  label: 'ทุกช่วงเวลา',   hours: '00:00-24:00' },
];

export const WEEKDAYS = [
  { key: 'mon', label: 'จ.' }, { key: 'tue', label: 'อ.' }, { key: 'wed', label: 'พ.' },
  { key: 'thu', label: 'พฤ.' }, { key: 'fri', label: 'ศ.' }, { key: 'sat', label: 'ส.' },
  { key: 'sun', label: 'อา.' },
];
export const ALL_DAYS = WEEKDAYS.map((d) => d.key);
export const WORK_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];

export const PATIENT_RIGHTS = [
  { key: 'any',   label: 'ทุกสิทธิ' },
  { key: 'ucs',   label: 'บัตรทอง (UCS)' },
  { key: 'sss',   label: 'ประกันสังคม' },
  { key: 'ofc',   label: 'ข้าราชการ (เบิกจ่ายตรง)' },
  { key: 'cash',  label: 'ชำระเงินเอง' },
];

const uid = () => `rr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

/** กติกาตั้งต้น — สอดคล้องบริบทศูนย์บริการสาธารณสุข กทม. */
const SEED_RULES = [
  {
    id: 'rr-001', order: 1, name: 'ยาเสพติด/วัตถุออกฤทธิ์ → ห้องยาควบคุมพิเศษ',
    sources: ['hs-opd', 'hs-mental', 'hs-drug', 'hs-er'], destination: 'hs-pharm-nar', fallback: 'hs-pharm-1',
    visitTypes: ['appointment', 'walkin', 'emergency'], window: 'any', days: ALL_DAYS,
    drugCategories: ['narcotic'], right: 'any', enabled: true,
    updatedBy: 'นายวรพล รัศมีพร', updatedAt: '1 ส.ค. 2569 09:12',
    note: 'ตามระเบียบการเก็บรักษายาเสพติดให้โทษ ต้องจ่ายจากห้องมั่นคงเท่านั้น',
  },
  {
    id: 'rr-002', order: 2, name: 'วัคซีน/ยาเย็นทุกคลินิก → ห้องยาเย็น',
    sources: ['hs-vaccine', 'hs-opd', 'hs-anc', 'hs-wellcare'], destination: 'hs-pharm-cold', fallback: 'hs-pharm-1',
    visitTypes: ['appointment', 'walkin'], window: 'in', days: WORK_DAYS,
    drugCategories: ['cold'], right: 'any', enabled: true,
    updatedBy: 'ภญ.กรรณิการ์ ภู่ตระกูล', updatedAt: '28 ก.ค. 2569 14:40',
    note: 'ต้องควบคุมอุณหภูมิ 2-8 °C ตลอดเส้นทาง',
  },
  {
    id: 'rr-003', order: 3, name: 'คลินิกนอกเวลา → ห้องยานอกเวลา',
    sources: ['hs-opd', 'hs-er', 'hs-ncd'], destination: 'hs-pharm-2', fallback: 'hs-pharm-1',
    visitTypes: ['walkin', 'emergency'], window: 'out', days: ALL_DAYS,
    drugCategories: ['general', 'special'], right: 'any', enabled: true,
    updatedBy: 'นายวรพล รัศมีพร', updatedAt: '30 ก.ค. 2569 17:05',
    note: 'ห้องยา 1 ปิด 16:00 น. — คำสั่งหลังเวลานี้ไปห้องยา 2',
  },
  {
    id: 'rr-004', order: 4, name: 'คลินิกทันตกรรม → ห้องยาทันตกรรม',
    sources: ['hs-dental'], destination: 'hs-pharm-dent', fallback: 'hs-pharm-1',
    visitTypes: ['appointment', 'walkin'], window: 'in', days: WORK_DAYS,
    drugCategories: ['general'], right: 'any', enabled: true,
    updatedBy: 'ทพ.ณัฐพงษ์ ศรีสุข', updatedAt: '25 ก.ค. 2569 10:30',
    note: 'ห้องยาทันตกรรมปิดปรับปรุง — ระบบจะใช้ห้องยาสำรองอัตโนมัติ',
  },
  {
    id: 'rr-005', order: 5, name: 'คลินิกวัณโรค (DOT) → ห้องยาผู้ป่วยนอก',
    sources: ['hs-tb'], destination: 'hs-pharm-1', fallback: 'hs-pharm-2',
    visitTypes: ['appointment'], window: 'in', days: WORK_DAYS,
    drugCategories: ['general', 'special'], right: 'any', enabled: true,
    updatedBy: 'พว.วิภา ตันติ', updatedAt: '20 ก.ค. 2569 08:20',
    note: 'จ่ายยาต่อเนื่องตามระบบ DOT — เภสัชกรจ่ายพร้อมให้คำแนะนำ',
  },
  {
    id: 'rr-006', order: 6, name: 'คลินิกเอดส์/โรคติดต่อทางเพศสัมพันธ์ (บ่าย) → ห้องยาผู้ป่วยนอก',
    sources: ['hs-std'], destination: 'hs-pharm-1', fallback: 'hs-pharm-2',
    visitTypes: ['appointment', 'walkin'], window: 'in', days: ['mon', 'wed', 'fri'],
    drugCategories: ['general', 'special'], right: 'any', enabled: true,
    updatedBy: 'พญ.อรุณี สิทธิ์รัตน์', updatedAt: '18 ก.ค. 2569 13:55',
    note: 'ต้องปกปิดข้อมูลผู้รับบริการตามข้อกำหนดข้อมูลลับ',
  },
  {
    id: 'rr-007', order: 7, name: 'คลินิกผู้ป่วยนอกทั่วไป (ในเวลา) → ห้องยาผู้ป่วยนอก',
    sources: ['hs-opd', 'hs-ncd', 'hs-anc', 'hs-wellcare', 'hs-family', 'hs-mental'], destination: 'hs-pharm-1', fallback: 'hs-pharm-2',
    visitTypes: ['appointment', 'walkin'], window: 'in', days: WORK_DAYS,
    drugCategories: ['general'], right: 'any', enabled: true,
    updatedBy: 'นายวรพล รัศมีพร', updatedAt: '15 ก.ค. 2569 09:00',
    note: 'กติกาพื้นฐานของศูนย์',
  },
  {
    id: 'rr-008', order: 8, name: 'ผู้ป่วยสิทธิข้าราชการ คลินิกผู้ป่วยนอก → ห้องยานอกเวลา (นำร่อง)',
    sources: ['hs-opd'], destination: 'hs-pharm-2', fallback: 'hs-pharm-1',
    visitTypes: ['appointment'], window: 'in', days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    drugCategories: ['general'], right: 'ofc', enabled: true,
    updatedBy: 'นายวรพล รัศมีพร', updatedAt: '2 ส.ค. 2569 11:15',
    note: 'กติกานำร่อง — ซ้อนทับกับลำดับ 7 (คลินิกผู้ป่วยนอกทั่วไป ในเวลา) ระบบจึงให้ลำดับ 7 เป็นผู้ชนะ',
  },
];

let RULES = SEED_RULES.map((r) => ({ ...r }));
const listeners = new Set();
const notify = () => listeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });

export const subscribeRoutingRules = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const getRoutingRules = () => RULES.map((r) => ({ ...r })).sort((a, b) => a.order - b.order);
export const getRoutingRule = (id) => RULES.find((r) => r.id === id) || null;

const resequence = () => {
  RULES.sort((a, b) => a.order - b.order).forEach((r, i) => { r.order = i + 1; });
};

const stamp = () => new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });

export function saveRoutingRule(payload, actor = 'ผู้ดูแลระบบ') {
  const existing = payload.id ? RULES.find((r) => r.id === payload.id) : null;
  if (existing) {
    Object.assign(existing, payload, { updatedBy: actor, updatedAt: stamp() });
  } else {
    RULES.push({
      ...payload,
      id: uid(),
      order: RULES.length + 1,
      updatedBy: actor,
      updatedAt: stamp(),
    });
  }
  resequence();
  notify();
  return getRoutingRules();
}

export function deleteRoutingRule(id) {
  RULES = RULES.filter((r) => r.id !== id);
  resequence();
  notify();
  return getRoutingRules();
}

export function toggleRoutingRule(id, enabled, actor = 'ผู้ดูแลระบบ') {
  const rule = RULES.find((r) => r.id === id);
  if (!rule) return getRoutingRules();
  rule.enabled = !!enabled;
  rule.updatedBy = actor;
  rule.updatedAt = stamp();
  notify();
  return getRoutingRules();
}

/** เลื่อนลำดับความสำคัญขึ้น/ลง — ลำดับคือผู้ชนะเมื่อกติกาชนกัน. */
export function moveRoutingRule(id, direction) {
  const sorted = RULES.slice().sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((r) => r.id === id);
  const swapWith = direction === 'up' ? idx - 1 : idx + 1;
  if (idx < 0 || swapWith < 0 || swapWith >= sorted.length) return getRoutingRules();
  const a = sorted[idx];
  const b = sorted[swapWith];
  const tmp = a.order; a.order = b.order; b.order = tmp;
  resequence();
  notify();
  return getRoutingRules();
}

/** คืนกติกาชุดเริ่มต้น (ใช้กับปุ่ม "ยกเลิกการเปลี่ยนแปลงทั้งหมด"). */
export function resetRoutingRules() {
  RULES = SEED_RULES.map((r) => ({ ...r }));
  notify();
  return getRoutingRules();
}

/* ── overlap detection ────────────────────────────────────────────────── */

const intersects = (a = [], b = []) => a.some((x) => b.includes(x));
const windowsOverlap = (a, b) => a === 'any' || b === 'any' || a === b;

/**
 * หาคู่กติกาที่เงื่อนไขตัดกันแต่ปลายทางคนละห้องยา.
 * @returns {Array<{a, b, clinics: string[], reason: string, winner: object}>}
 */
export function detectOverlaps(rules = getRoutingRules()) {
  const active = rules.filter((r) => r.enabled).sort((a, b) => a.order - b.order);
  const found = [];
  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const a = active[i];
      const b = active[j];
      if (a.destination === b.destination) continue;
      const clinics = (a.sources || []).filter((s) => (b.sources || []).includes(s));
      if (!clinics.length) continue;
      if (!intersects(a.drugCategories, b.drugCategories)) continue;
      if (!intersects(a.visitTypes, b.visitTypes)) continue;
      if (!intersects(a.days, b.days)) continue;
      if (!windowsOverlap(a.window, b.window)) continue;
      if (a.right !== 'any' && b.right !== 'any' && a.right !== b.right) continue;
      found.push({
        a, b, clinics,
        winner: a,
        reason: `คลินิกเดียวกัน (${clinics.map((c) => getHealthcareService(c)?.name || c).join(', ')}) · วัน/เวลา/ประเภทยาเหลื่อมกัน แต่ปลายทางคนละห้องยา`,
      });
    }
  }
  return found;
}

/** คลินิกที่ยังไม่มีกติกาเปิดใช้ครอบคลุมเลย → คำสั่งจะตกไปห้องยากลาง. */
export function findUncoveredClinics(rules = getRoutingRules()) {
  const covered = new Set();
  rules.filter((r) => r.enabled).forEach((r) => (r.sources || []).forEach((s) => covered.add(s)));
  return clinicServices().filter((c) => !covered.has(c.id));
}

/** กติกาที่เปิดอยู่ซึ่งครอบคลุมคลินิกนี้ — ใช้เตือนก่อนลบ/ปิดกติกาสุดท้าย. */
export function rulesCoveringClinic(clinicId, rules = getRoutingRules()) {
  return rules.filter((r) => r.enabled && (r.sources || []).includes(clinicId));
}

/* ── simulator ────────────────────────────────────────────────────────── */

/**
 * ทดลองเส้นทาง — ไล่กติกาตามลำดับ คืนกติกาที่ชนะ + ปลายทางจริง.
 * @param {{clinic, visitType, window, day, drugCategory, right}} query
 */
export function resolveRoute(query, rules = getRoutingRules()) {
  const trace = [];
  const active = rules.filter((r) => r.enabled).sort((a, b) => a.order - b.order);
  for (const r of active) {
    const checks = {
      clinic: (r.sources || []).includes(query.clinic),
      drug: (r.drugCategories || []).includes(query.drugCategory),
      visit: (r.visitTypes || []).includes(query.visitType),
      day: (r.days || []).includes(query.day),
      window: r.window === 'any' || r.window === query.window,
      right: r.right === 'any' || r.right === query.right,
    };
    const matched = Object.values(checks).every(Boolean);
    trace.push({ rule: r, checks, matched });
    if (matched) {
      const dest = getHealthcareService(r.destination);
      const useFallback = !dest?.active;
      return {
        matched: true,
        rule: r,
        destinationId: useFallback ? r.fallback : r.destination,
        usedFallback: useFallback,
        fallbackReason: useFallback ? `${dest?.name || r.destination} ปิดให้บริการอยู่ — ใช้ห้องยาสำรองแทน` : '',
        trace,
      };
    }
  }
  return {
    matched: false,
    rule: null,
    destinationId: DEFAULT_PHARMACY,
    usedFallback: false,
    fallbackReason: '',
    trace,
  };
}

/** ตรวจฟอร์มกติกาก่อนบันทึก. */
export function validateRoutingRule(form, rules = getRoutingRules()) {
  const errors = {};
  if (!String(form.name || '').trim()) errors.name = 'กรุณาตั้งชื่อกติกา';
  if (!(form.sources || []).length) errors.sources = 'เลือกคลินิกต้นทางอย่างน้อย 1 รายการ';
  if (!form.destination) errors.destination = 'เลือกห้องยาปลายทาง';
  if (!form.fallback) errors.fallback = 'เลือกห้องยาสำรอง';
  if (form.fallback && form.fallback === form.destination) {
    errors.fallback = 'ห้องยาสำรองต้องไม่ใช่ห้องเดียวกับปลายทางหลัก';
  }
  if (!(form.drugCategories || []).length) errors.drugCategories = 'เลือกประเภทยาอย่างน้อย 1 ประเภท';
  if (!(form.visitTypes || []).length) errors.visitTypes = 'เลือกประเภทผู้รับบริการอย่างน้อย 1 รายการ';
  if (!(form.days || []).length) errors.days = 'เลือกวันให้บริการอย่างน้อย 1 วัน';

  const warnings = [];
  const dest = getHealthcareService(form.destination);
  if (dest && !dest.active) warnings.push(`${dest.name} ถูกปิดใช้งานอยู่ — คำสั่งยาจะถูกส่งไปห้องยาสำรองแทน`);

  /* เตือนกติกาซ้อนทับ "ตอนบันทึก" ไม่ใช่รอกดตรวจ */
  const candidate = { ...form, id: form.id || '__draft__', enabled: form.enabled !== false, order: form.order ?? 9999 };
  const others = rules.filter((r) => r.id !== form.id);
  const conflicts = detectOverlaps([...others, candidate]).filter(
    (c) => c.a.id === candidate.id || c.b.id === candidate.id,
  );
  conflicts.forEach((c) => {
    const other = c.a.id === candidate.id ? c.b : c.a;
    const winner = c.winner.id === candidate.id ? 'กติกานี้' : `ลำดับ ${other.order} (${other.name})`;
    warnings.push(`ซ้อนทับกับลำดับ ${other.order} "${other.name}" — ผู้ชนะจริงคือ ${winner}`);
  });

  return { errors, warnings };
}

/** ฟอร์มเปล่าสำหรับกติกาใหม่. */
export const blankRoutingRule = () => ({
  id: null,
  name: '',
  sources: [],
  destination: '',
  fallback: '',
  visitTypes: ['appointment', 'walkin'],
  window: 'in',
  days: [...WORK_DAYS],
  drugCategories: ['general'],
  right: 'any',
  enabled: true,
  note: '',
});
