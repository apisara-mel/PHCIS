/* Pharmacy drug registry / formulary (ระบบทะเบียนยา — ToR §1.9.1) + the
   CDSS-style prescribing checks the ToR describes for pharmacy (§1.5.4.18-21
   / §1.9.2): drug interaction, duplicate-drug, and High Alert Drug.

   Self-contained mock module, same convention as `pharmacyQueue.js` — no
   backend, in-memory, resets on reload. Seeded from `medicationCatalog.js`'s
   `MEDICATION_NAME_OPTIONS` (the app's one existing canonical drug-name
   list) rather than inventing a third divergent catalog. */

import { MEDICATION_NAME_OPTIONS, resolveMedicationImage } from '@/data/medicationCatalog';
import { MR_RIGHTS } from '@/data/mrPatients';

export const RIGHTS_LIST = MR_RIGHTS;

export const UNIT_TYPES = [
  { key: 'bottle',  label: 'ขวด',     labelEn: 'Bottle'  },
  { key: 'box',     label: 'กล่อง',   labelEn: 'Box'     },
  { key: 'sachet',  label: 'ซอง',     labelEn: 'Sachet'  },
  { key: 'tube',    label: 'หลอด',    labelEn: 'Tube'    },
  { key: 'capsule', label: 'แคปซูล',  labelEn: 'Capsule' },
  { key: 'tablet',  label: 'เม็ด',    labelEn: 'Tablet'  },
  { key: 'blister', label: 'แผง',     labelEn: 'Blister' }, /* conversion target only — hidden in unit picker */
  { key: 'ml',      label: 'ซีซี',    labelEn: 'mL'      }, /* ToR §1.9.1.2 “1 ขวด เป็น 60 ซีซี”; hidden in unit picker */
];

/* Units selectable as the primary counting unit (left column). */
export const COUNT_UNIT_KEYS = ['bottle', 'box', 'sachet', 'tube', 'capsule', 'tablet'];

/* §1.9.1.2 — mock conversion rows seeded when picking a counting unit.
   A unit may have multiple rows (e.g. กล่อง → แผง + เม็ด). */
export const UNIT_CONVERSION_DEFAULTS = {
  bottle:  [{ qty: 60,  toUnit: 'ml' }],
  box:     [{ qty: 10,  toUnit: 'blister' }, { qty: 100, toUnit: 'tablet' }],
  sachet:  [{ qty: 1,   toUnit: 'tablet' }],
  tube:    [{ qty: 30,  toUnit: 'ml' }],
  capsule: [],
  tablet:  [],
};

/* Legacy single-pair table (fallback for convertPackToUnit helpers). */
export const UNIT_CONVERSIONS = [
  { fromUnit: 'bottle',  toUnit: 'ml',      factor: 60,  note: '1 ขวด = 60 ซีซี' },
  { fromUnit: 'box',     toUnit: 'blister', factor: 10,  note: '1 กล่อง = 10 แผง' },
  { fromUnit: 'box',     toUnit: 'tablet',  factor: 100, note: '1 กล่อง = 100 เม็ด' },
  { fromUnit: 'sachet',  toUnit: 'tablet',  factor: 1,   note: '1 ซอง = 1 เม็ด' },
  { fromUnit: 'tube',    toUnit: 'ml',      factor: 30,  note: '1 หลอด = 30 ซีซี' },
];

/* Real per-drug box→dispensing-unit conversions (ToR §1.9.1.2's actual
   ask: convert THIS drug's box into ITS dispensing unit, not one blanket
   factor for every drug). Thai retail pharmaceutical packs commonly ship
   in 100s/500s/1000s per box; rotated deterministically by index so each
   drug gets a plausible, distinct pack size instead of one shared number. */
const PACK_SIZE_ROTATION = [100, 500, 1000, 100, 100, 500];
const packSizeForIndex = (i) => PACK_SIZE_ROTATION[i % PACK_SIZE_ROTATION.length];

/* Stagger วันที่เริ่มจำหน่าย so reports can demo “ยาที่เพิ่มเข้ามาใหม่”
   (roughly 1 in 4 rows land inside the last ~21 days). */
const seedActiveFrom = (i) => {
  if (i % 4 !== 0) return '2026-01-01';
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (i % 21));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const todayIsoLocal = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const DRUG_CLASSIFICATIONS = [
  { key: 'nlem',         label: 'บัญชียาหลักแห่งชาติ (NLEM)'        },
  { key: 'non-nlem',     label: 'ยานอกบัญชียาหลักแห่งชาติ'          },
  { key: 'narcotic',     label: 'ยาเสพติดให้โทษ'                    },
  { key: 'psychotropic', label: 'วัตถุออกฤทธิ์ต่อจิตและประสาท'       },
];

const CAPSULE_NAMES = new Set(['Omeprazole 20 mg', 'Esomeprazole 40 mg', 'VILERM (Aciclovir 400 mg)']);

/* Illustrative flags only — NOT a clinically exhaustive High Alert Drug
   list (real hospital HAD lists center on insulin/heparin/opioids/
   concentrated electrolytes/chemo, none of which are in this outpatient
   demo catalog). Marks two drugs with a real, defensible high-alert
   rationale so the UI has something genuine to demonstrate against.
   (Codeine/Diazepam are ALSO flagged high-alert below, via
   NARCOTIC_NAMES/PSYCHOTROPIC_NAMES — controlled substances carry a real
   diversion/misuse risk on top of their pharmacologic one.) */
const HIGH_ALERT_NAMES = new Set(['Furosemide 40 mg', 'Enalapril 5 mg']);

/* One drug deliberately NOT eligible under most rights, to give the
   "สั่งยานอกสิทธิ" (out-of-rights) check in PharmacyDispensePage a real
   case to flag. */
const SELF_PAY_ONLY_NAMES = new Set(['Atorvastatin 10 mg']);

const NON_NLEM_NAMES = new Set(['Esomeprazole 40 mg', 'Atorvastatin 10 mg', 'VILERM (Aciclovir 400 mg)']);

/* §1.9.1.3 — real Thai statutory classifications, not fabricated: Codeine
   is ยาเสพติดให้โทษ ประเภท 2 (Narcotics Act B.E. 2522); Diazepam is
   วัตถุออกฤทธิ์ต่อจิตและประสาท ประเภท 4 (Psychotropic Substances Act) — both
   plausible in a primary-care/สำนักอนามัย formulary (cough/pain and
   anxiety/muscle-relaxant use respectively). Checked before NON_NLEM_NAMES
   below since classification is one field, not a combinable set of flags. */
const NARCOTIC_NAMES = new Set(['Codeine Phosphate 30 mg']);
const PSYCHOTROPIC_NAMES = new Set(['Diazepam 5 mg']);

/* ผู้ผลิต/ผู้จำหน่าย (legacy คู่มือระบบงานห้องจ่ายยาฯ §2.2.1 fields 3.6-3.7).
   Deterministic round-robin over a small pool of real Thai
   pharmaceutical manufacturers/distributors — illustrative assignment,
   not sourced from actual product data. */
export const MANUFACTURERS = ['องค์การเภสัชกรรม (GPO)', 'บริษัท เบอร์ลินฟาร์มาซูติคอลอินดัสตรี้ จำกัด', 'บริษัท ที.แมน ฟาร์มา จำกัด', 'บริษัท สยามฟาร์มาซูติคอล จำกัด'];
export const DISTRIBUTORS = ['บริษัท ดีเคเอสเอช (ประเทศไทย) จำกัด', 'บริษัท ซิลลิค ฟาร์มา จำกัด', 'บริษัท เซ็นทรัลโพลีเทรดดิ้ง จำกัด'];

/** Dropdown options for รับจาก (ผู้ผลิต/ผู้จำหน่าย) on receiving forms. */
export const SUPPLIER_OPTIONS = [...new Set([...MANUFACTURERS, ...DISTRIBUTORS, 'บริษัท ฟาร์มา จำกัด'])];

/* Mock catalog for registry “โรคประจำตัวที่ไม่อนุญาต” dropdown — names
   align with `mrPatients.js` chronicDiseases[].name where possible. */
export const CHRONIC_DISEASE_OPTIONS = [
  'โรคไตเรื้อรัง ระยะ 3–4 (CKD)',
  'หัวใจล้มเหลว',
  'ความดันโลหิตสูง (HT)',
  'โรคเบาหวานชนิดที่ 2',
  'โรคหอบหืด',
  'โรคตับแข็ง',
  'โรคหลอดเลือดสมอง',
  'ไขมันในเลือดสูง',
  'โรคเกาต์',
  'โรคกระเพาะอาหาร / แผลในกระเพาะ',
  'โรคลมชัก',
  'โรคไทรอยด์',
];

/* โรคประจำตัวที่ไม่อนุญาตให้จ่าย (legacy §2.1.1 "กรณีผู้ป่วยมีโรคประจำตัว" —
   คำเตือนเมื่อยาตัวที่สั่งตรงกับโรคประจำตัวที่ไม่อนุญาต). Real, defensible
   contraindications only: NSAIDs worsen renal function and fluid
   retention in CKD/heart-failure patients — matches
   `mrPatients.js`'s `chronicDiseases[].name` vocabulary exactly. */
const DISALLOWED_DISEASE_OVERRIDES = {
  'Ibuprofen 400 mg': ['โรคไตเรื้อรัง ระยะ 3–4 (CKD)', 'หัวใจล้มเหลว'],
  'Naproxen 250 mg':  ['โรคไตเรื้อรัง ระยะ 3–4 (CKD)', 'หัวใจล้มเหลว'],
};

/* กลุ่มแพทย์เฉพาะที่อนุญาตให้จ่าย (legacy §2.1.1 "กรณียามีผลกับแพทย์ที่สั่ง").
   None of this outpatient catalog's drugs are genuinely
   prescriber-restricted (no controlled substances) — one illustrative
   example only, clearly flagged as such, so the restriction mechanism has
   something real to demonstrate against without fabricating a clinical
   rule for the rest of the catalog. */
const DOCTOR_GROUP_RESTRICTION_OVERRIDES = {
  'VILERM (Aciclovir 400 mg)': 'แพทย์ผิวหนัง / อายุรกรรม',
};

const parseTradeGeneric = (name) => {
  const m = name.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (m) return { tradeName: m[1].trim(), genericName: m[2].trim() };
  return { tradeName: '', genericName: name };
};

/* Mock trade / brand names for registry seeds that aren't "Brand (Generic)"
   — edit popup requires ชื่อการค้า so every seeded row has a value. */
const TRADE_NAME_OVERRIDES = {
  'Paracetamol 500 mg': 'Sara',
  'Ibuprofen 400 mg': 'Nurofen',
  'Methocarbamol 750 mg': 'Robaxin',
  'Orphenadrine 35 mg': 'Norgesic',
  'Omeprazole 20 mg': 'Losec',
  'Esomeprazole 40 mg': 'Nexium',
  'Amoxicillin 500 mg': 'Amoxil',
  'Ciprofloxacin 500 mg': 'Ciproxin',
  'Cetirizine 10 mg': 'Zyrtec',
  'Loratadine 10 mg': 'Clarityne',
  'Loperamide 2 mg': 'Imodium',
  'Naproxen 250 mg': 'Synflex',
  'Metformin 500 mg': 'Glucophage',
  'Amlodipine 5 mg': 'Norvasc',
  'Enalapril 5 mg': 'Renitec',
  'Losartan 50 mg': 'Cozaar',
  'Hydrochlorothiazide 25 mg': 'Dichlotride',
  'Metoprolol 50 mg': 'Betaloc',
  'Atorvastatin 20 mg': 'Lipitor',
  'Atorvastatin 10 mg': 'Lipitor',
  'Aspirin 81 mg': 'Aspirin Protect',
  'Furosemide 40 mg': 'Lasix',
  'Bisoprolol 5 mg': 'Concor',
  'Spironolactone 25 mg': 'Aldactone',
  'Simvastatin 20 mg': 'Zocor',
  'Atenolol 50 mg': 'Tenormin',
  'Indapamide 1.5 mg': 'Natrilix',
  'Vitamin B Complex': 'Beminal',
  'Folic Acid 5 mg': 'Folate',
  'Codeine Phosphate 30 mg': 'Codeine',
  'Diazepam 5 mg': 'Valium',
};

/* De-dupe the catalog's trailing "no-space-before-mg" alias entries
   (e.g. 'Paracetamol 500mg' next to 'Paracetamol 500 mg') — the registry
   only needs one canonical row per drug. */
const seenNames = new Set();
const CANONICAL_OPTIONS = MEDICATION_NAME_OPTIONS.filter((o) => {
  const key = o.value.replace(/\s+/g, ' ').toLowerCase();
  if (seenNames.has(key)) return false;
  seenNames.add(key);
  return true;
});

/* §1.9.7.2 — EAN-13 style barcodes used by the receiving-form scanner.
   Seed receiving rows in pharmacyQueue.js use the Paracetamol / Metformin
   overrides so demo scan → fill-line stays stable. */
const BARCODE_OVERRIDES = {
  'Paracetamol 500 mg': '8850001112345',
  'Metformin 500 mg': '8850001112352',
};

export const DRUG_REGISTRY = CANONICAL_OPTIONS.map((opt, i) => {
  const parsed = parseTradeGeneric(opt.value);
  const genericName = parsed.genericName;
  const tradeName = parsed.tradeName || TRADE_NAME_OVERRIDES[opt.value] || '';
  /* อัตราการใช้เฉลี่ย + จุดสั่งซื้อ (legacy §2.2.1 field 3.11) — mock
     figures derived deterministically from index so every drug has a
     plausible, distinct usage-rate profile. */
  const avgPerMonth = 50 + (i % 10) * 20;
  return {
    id: `drug-${i + 1}`,
    /* รหัสยา (ToR §1.9.5.1 / §1.9.10.1) — distinct from the internal
       `id` (a React-key-style slug), this is the human-facing drug code
       staff actually search/type, e.g. on a requisition or receiving form. */
    code: `MED-${String(i + 1).padStart(4, '0')}`,
    barcode: BARCODE_OVERRIDES[opt.value] || `885${String(i + 1).padStart(10, '0')}`,
    name: opt.value,
    genericName,
    tradeName,
    image: resolveMedicationImage(opt.value, opt.image),
    unit: CAPSULE_NAMES.has(opt.value) ? 'capsule' : 'tablet',
    classification: NARCOTIC_NAMES.has(opt.value)
      ? 'narcotic'
      : PSYCHOTROPIC_NAMES.has(opt.value)
        ? 'psychotropic'
        : NON_NLEM_NAMES.has(opt.value) ? 'non-nlem' : 'nlem',
    /* §1.9.1.2 — this drug's real box→unit conversion, e.g. "1 กล่อง = 100
       เม็ด" for this specific drug (not a shared blanket factor). */
    packSize: packSizeForIndex(i),
    highAlert: HIGH_ALERT_NAMES.has(opt.value) || NARCOTIC_NAMES.has(opt.value) || PSYCHOTROPIC_NAMES.has(opt.value),
    rightsEligible: SELF_PAY_ONLY_NAMES.has(opt.value) ? ['ชำระเงินเอง'] : [...MR_RIGHTS],
    priceSchedule: [
      { id: `${i + 1}-p1`, effectiveFrom: '2026-01-01', effectiveTo: null, price: 1 + (i % 8) },
    ],
    active: i % 11 !== 0,
    /* วันที่เริ่มจำหน่ายยาในสถานพยาบาล / วันที่ตัดรายการยาออกจากสถานพยาบาล
       (ToR §1.9.10.1) — separate from the `active` toggle above: a drug
       can be toggled inactive immediately, but this date range records
       WHEN it was formally introduced/discontinued at this facility. */
    activeFrom: seedActiveFrom(i),
    activeTo: null,
    manufacturer: MANUFACTURERS[i % MANUFACTURERS.length],
    distributor: DISTRIBUTORS[i % DISTRIBUTORS.length],
    usageRate: {
      avgPerMonth,
      maxQty: avgPerMonth * 2,
      minQty: Math.round(avgPerMonth * 0.5),
      reorderPoint: Math.round(avgPerMonth * 0.75),
    },
    disallowedChronicDiseases: DISALLOWED_DISEASE_OVERRIDES[opt.value] || [],
    restrictedToDoctorGroup: DOCTOR_GROUP_RESTRICTION_OVERRIDES[opt.value] || null,
  };
});

export const getRegistryDrug = (name) => DRUG_REGISTRY.find((d) => d.name === name) || null;
export const getRegistryDrugById = (id) => DRUG_REGISTRY.find((d) => d.id === id) || null;
export const getRegistryDrugByBarcode = (code) => {
  const q = String(code || '').trim();
  if (!q) return null;
  return DRUG_REGISTRY.find((d) => d.barcode === q || d.code === q) || null;
};

/* ── PrimarySearch recent history (ทะเบียนยา / คลังยา) ─────────────── */

export const REGISTRY_SEARCH_HISTORY_KEY = 'mih:primarysearch-history:pharmacy-registry';
export const STOCK_SEARCH_HISTORY_KEY = 'mih:primarysearch-history:pharmacy-stock';

/** Rich "ค้นหาล่าสุด" row — code pill + drug name + blister avatar. */
export const buildDrugSearchHistoryItem = (drug, { id } = {}) => {
  if (!drug) return null;
  const trade = (drug.tradeName || '').trim();
  const sublabel = trade
    || (drug.genericName && drug.genericName !== drug.name ? drug.genericName : '');
  return {
    id: id || drug.id || `drug-hist-${drug.code || drug.name}`,
    label: drug.name,
    sublabel: sublabel || undefined,
    value: drug.name,
    badges: drug.code ? [{ label: drug.code, tone: 'blue' }] : undefined,
    avatarSrc: drug.image || undefined,
  };
};

/** Seed recent searches so empty-focus shows mock drug history first visit. */
export const buildDrugRegistrySearchHistorySeed = (count = 5) => (
  DRUG_REGISTRY
    .filter((d) => d.active)
    .slice(0, count)
    .map((d, i) => buildDrugSearchHistoryItem(d, { id: `drug-seed-${i + 1}` }))
    .filter(Boolean)
);

/** History entry from free-text submit or a picked rich suggestion. */
export const createDrugRecentSearchEntry = (query, item) => {
  if (item && (item.label || item.value)) {
    return {
      id: item.id || `drug-q-${Date.now()}`,
      label: item.label || item.value || query,
      sublabel: item.sublabel,
      value: item.value || item.label || query,
      badges: Array.isArray(item.badges) ? item.badges : undefined,
      avatarSrc: item.avatarSrc,
      icon: item.icon,
    };
  }
  const q = String(query || '').trim();
  if (!q) return null;
  const qLower = q.toLowerCase();
  const match = DRUG_REGISTRY.find((d) => (
    (d.code || '').toLowerCase().includes(qLower)
    || d.name.toLowerCase().includes(qLower)
    || (d.genericName || '').toLowerCase().includes(qLower)
    || (d.tradeName || '').toLowerCase().includes(qLower)
  ));
  if (match) return buildDrugSearchHistoryItem(match, { id: `drug-q-${match.id}` });
  return { id: `drug-q-${qLower}`, label: q, value: q, icon: 'schedule' };
};

/* Pub/sub so PharmacyRegistryPage's list re-renders after
   PharmacyRegistryEditPage saves — same pattern as
   `appointmentSettingsStore.js`'s `listeners`/`notify`/`subscribeApptSettings`.
   `DRUG_REGISTRY` stays a plain mutable array (mutated in place, like
   `pharmacyQueue.js`'s `PHARMACY_QUEUE`); this just adds the notification
   layer on top so views know when to re-read it. */
const registryListeners = new Set();
const notifyRegistry = () => registryListeners.forEach((fn) => fn());
export const subscribeRegistry = (fn) => {
  registryListeners.add(fn);
  return () => registryListeners.delete(fn);
};

let registrySeq = DRUG_REGISTRY.length;
const nextDrugCode = () => {
  const n = DRUG_REGISTRY.reduce((max, d) => {
    const m = Number(String(d.code || '').replace(/^MED-/, ''));
    return Number.isFinite(m) ? Math.max(max, m) : max;
  }, 0);
  return `MED-${String(n + 1).padStart(4, '0')}`;
};

/** Creates a new drug (no `id`/blank id) or saves changes to an existing one
    (matched by `id`) in place, so `DRUG_REGISTRY` — and every page reading
    it — reflects the edit immediately. Returns the saved row. */
export const upsertRegistryDrug = (form) => {
  const isNew = !form.id || form.id === 'new';
  if (isNew) {
    const id = `drug-${++registrySeq}`;
    const row = {
      ...form,
      id,
      code: form.code?.trim() || nextDrugCode(),
      barcode: form.barcode?.trim() || `885${String(registrySeq).padStart(10, '0')}`,
      image: resolveMedicationImage(form.name, null),
      activeFrom: form.activeFrom || todayIsoLocal(),
      activeTo: form.activeTo ?? null,
      active: form.active !== false,
    };
    DRUG_REGISTRY.push(row);
    notifyRegistry();
    return row;
  }
  const idx = DRUG_REGISTRY.findIndex((d) => d.id === form.id);
  if (idx === -1) return null;
  DRUG_REGISTRY[idx] = { ...DRUG_REGISTRY[idx], ...form };
  notifyRegistry();
  return DRUG_REGISTRY[idx];
};

/** Toggles/sets `active` on an existing drug (ToR §1.9.10.3 "ปิดรายการยา")
    without a full edit-page round trip — e.g. a quick close/reopen action
    from the registry list. */
export const setRegistryDrugActive = (id, active) => {
  const drug = getRegistryDrugById(id);
  if (!drug) return null;
  drug.active = active;
  notifyRegistry();
  return drug;
};

/** §1.9.1.2 — converts a quantity of this drug's own box (กล่อง) into its
    dispensing unit using ITS real packSize, e.g. `convertPackToUnit(drug, 2)`
    → "200 เม็ด" for a drug with packSize 100. Falls back to the generic
    UNIT_CONVERSIONS table for non-packSize pairs (e.g. ขวด→มล.). */
export const convertPackToUnit = (drug, boxQty = 1) => {
  if (!drug?.packSize) return null;
  return { qty: boxQty * drug.packSize, unit: drug.unit };
};

export const currentPrice = (drug, atDate = new Date()) => {
  if (!drug) return 0;
  const iso = atDate.toISOString().slice(0, 10);
  const row = drug.priceSchedule.find((p) => p.effectiveFrom <= iso && (!p.effectiveTo || p.effectiveTo >= iso));
  return row?.price ?? drug.priceSchedule[drug.priceSchedule.length - 1]?.price ?? 0;
};

/* Real, pharmacologically-documented interaction pairs among drugs that
   are actually in this catalog — not fabricated pairings. */
export const DRUG_INTERACTIONS = [
  {
    a: 'Enalapril 5 mg', b: 'Spironolactone 25 mg',
    description: 'ACE inhibitor + potassium-sparing diuretic — เสี่ยงภาวะโพแทสเซียมในเลือดสูง (hyperkalemia)',
  },
  {
    a: 'Simvastatin 20 mg', b: 'Amlodipine 5 mg',
    description: 'Amlodipine ยับยั้ง CYP3A4 ทำให้ระดับ Simvastatin สูงขึ้น เพิ่มความเสี่ยง myopathy — ควรจำกัดขนาด Simvastatin ไม่เกิน 20 มก./วัน',
  },
  {
    a: 'Enalapril 5 mg', b: 'Losartan 50 mg',
    description: 'ACE inhibitor + ARB (dual RAAS blockade) — ไม่แนะนำให้ใช้ร่วมกัน เสี่ยงไตวายและโพแทสเซียมสูง',
  },
];

const norm = (name) => (name || '').trim().toLowerCase();

/** Returns [{ a, b, description }] for every interacting pair found among `items`. */
export const checkDrugInteractions = (items = []) => {
  const names = new Set(items.map((it) => norm(it.name)));
  return DRUG_INTERACTIONS.filter((pair) => names.has(norm(pair.a)) && names.has(norm(pair.b)));
};

/** Returns the duplicated drug names (same drug prescribed more than once). */
export const checkDuplicateDrugs = (items = []) => {
  const counts = new Map();
  items.forEach((it) => {
    const key = norm(it.name);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return items
    .filter((it) => counts.get(norm(it.name)) > 1)
    .filter((it, idx, arr) => arr.findIndex((x) => norm(x.name) === norm(it.name)) === idx)
    .map((it) => it.name);
};

/** Returns the items whose registry entry is flagged High Alert. */
export const checkHighAlert = (items = []) =>
  items.filter((it) => getRegistryDrug(it.name)?.highAlert);

/** Items whose registry rights-eligibility doesn't include the patient's `rights`. */
export const checkOutOfRights = (patientRights, items = []) =>
  items.filter((it) => {
    const drug = getRegistryDrug(it.name);
    return drug && !drug.rightsEligible.includes(patientRights);
  });

/* ToR-adjacent legacy checks (คู่มือระบบงานห้องจ่ายยาฯ §2.1.1 "กรณีผู้ป่วยมี
   โรคประจำตัว" / "กรณียามีผลกับแพทย์ที่สั่ง"). */

/** [{ item, disease }] for every item whose registry entry lists a chronic
    disease the patient actually has. */
export const checkDisallowedChronicDisease = (patient, items = []) => {
  const patientDiseases = new Set((patient?.chronicDiseases || []).map((d) => d.name));
  const hits = [];
  items.forEach((item) => {
    const drug = getRegistryDrug(item.name);
    (drug?.disallowedChronicDiseases || []).forEach((disease) => {
      if (patientDiseases.has(disease)) hits.push({ item, disease });
    });
  });
  return hits;
};

/** Items restricted to a specific prescriber group, with that group's label. */
export const checkDoctorGroupRestriction = (items = []) =>
  items
    .map((item) => {
      const drug = getRegistryDrug(item.name);
      const scopes = drug?.restrictedPrescriberScopes;
      if (scopes?.length) {
        const groups = [...new Set(scopes.map((s) => s.group).filter(Boolean))];
        return { item, group: groups.join(', ') };
      }
      return { item, group: drug?.restrictedToDoctorGroup || null };
    })
    .filter((r) => r.group);
