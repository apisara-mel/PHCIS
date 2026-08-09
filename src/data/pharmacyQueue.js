/* Pharmacy dispensing queue — mock data + mock inventory/allergy logic.
   Self-contained module (no external store), mirroring the pattern used by
   `treatmentQueue.js` / `patientProfiles.js`: everything here is in-memory
   and resets on reload — the same ephemerality as the rest of the app's
   mock modules (there is no real cross-system persistence anywhere yet).

   Covers the ToR §1.9 "ระบบงานเภสัชกรรม" scope this module implements:
   §1.9.2 prescription review + pharmacist verification, §1.9.3 dispensing
   prep, §1.9.4 dispensing (refill/no-show/delivery/special-watch), §1.9.5
   general pharmacy (queue-type, Medication Reconciliation, own-meds),
   §1.9.6-1.9.9 two-tier warehouse + requisition/receiving/borrow-return. */

import { findMrPatientByHn } from '@/data/mrPatients';
import { DRUG_REGISTRY, SUPPLIER_OPTIONS } from '@/data/pharmacyRegistry';
import { getPharmacySupportingInfo } from '@/data/pharmacySupportingInfo';
import { getVnByHn } from '@/data/patientProfiles';
import { getStation } from '@/data/queueCenterStore';

export const DISPENSE_STATUS = {
  WAITING:   'waiting',
  CALLED:    'called',
  PREPARING: 'preparing',
  DISPENSED: 'dispensed',
  PARTIAL:   'partial',
  NO_SHOW:   'no_show',
  PROBLEM:   'problem',
  CANCELLED: 'cancelled',
};

export const QUEUE_TYPES = [
  { key: 'urgent',   label: 'ด่วน'       },
  { key: 'few',      label: 'ยาน้อย'     },
  { key: 'general',  label: 'ยาทั่วไป'    },
];

/* สถานะการชำระเงิน (ToR §1.9.5.2) — the item's own rights-eligibility
   already decides WHAT is claimable (see `checkOutOfRights` /
   `currentPrice` in pharmacyRegistry.js); this tracks whether the
   patient-payable portion (self-pay items, or an out-of-rights balance)
   has actually been settled at the cashier yet. `n/a` covers rows with
   nothing payable (fully claimable under rights). */
export const PAYMENT_STATUS = {
  NOT_APPLICABLE: 'n/a',
  UNPAID: 'unpaid',
  PAID: 'paid',
};

/* Taken verbatim from the ToR's own wording ("ลำดับ GPO GPU TPU ชื่อยา/
   เวชภัณฑ์...") — a drug-source classification the spec names but doesn't
   further define; modeled as a plain enum. */
export const DRUG_TYPES = ['GPO', 'GPU', 'TPU'];

/* ฉลากช่วย (auxiliary label — ToR §1.9.2.11) — extra warning/instruction
   stickers printed alongside the main drug label, e.g. "เขย่าขวดก่อนใช้".
   A curated pool of common Thai pharmacy auxiliary-label phrases; each
   item carries the subset that applies (`auxLabels: string[]`). */
export const AUX_LABEL_OPTIONS = [
  'เขย่าขวดก่อนใช้',
  'อาจทำให้ง่วงซึม ห้ามขับรถหรือทำงานกับเครื่องจักร',
  'รับประทานก่อนอาหาร',
  'รับประทานหลังอาหารทันที',
  'ห้ามรับประทานร่วมกับนมหรือยาลดกรด',
  'เก็บในตู้เย็น (2-8°C) ห้ามแช่แข็ง',
  'ห้ามหยุดยาเองโดยไม่ปรึกษาแพทย์',
  'รับประทานยาให้หมดตามแพทย์สั่ง แม้อาการดีขึ้น',
];

/* Illustrative starting defaults for a couple of seed drugs — pharmacist
   can still add/remove per item on the dispense page. */
const AUX_LABEL_DEFAULTS = {
  'Cetirizine 10 mg': ['อาจทำให้ง่วงซึม ห้ามขับรถหรือทำงานกับเครื่องจักร'],
  'Omeprazole 20 mg': ['รับประทานก่อนอาหาร'],
  'Amoxicillin 500 mg': ['รับประทานยาให้หมดตามแพทย์สั่ง แม้อาการดีขึ้น'],
};

export const CURRENT_DISPENSER = { name: 'ภก.สิทธิชัย พรหมจันทร์', subRole: 'dispenser' };
export const CURRENT_CLINICAL_PHARMACIST = { name: 'ภญ.กรรณิการ์ ภู่ตระกูล', subRole: 'clinical-pharm' };

/* Medication name (matches `MEDICATION_NAME_OPTIONS` in medicationCatalog.js)
   → the allergy-class label used by `mrPatients.js`'s `drugAllergies[].name`
   vocabulary ('Penicillin', 'NSAIDs', 'Aspirin', ...). Only drugs that are
   actually in that pharmacological class are mapped — no fabricated
   cross-references. */
export const DRUG_ALLERGY_CLASS = {
  'Amoxicillin 500 mg':  'Penicillin',
  'Amoxicillin 500mg':   'Penicillin',
  'Ibuprofen 400 mg':    'NSAIDs',
  'Ibuprofen 400mg':     'NSAIDs',
  'Naproxen 250 mg':     'NSAIDs',
  'Aspirin 81 mg':       'Aspirin',
};

/* Drug picker options with allergens removed — shared by every "เปลี่ยนยา"
   surface (the medication editor modal AND the dispense table's inline
   quick-swap column) so both stay in sync on one filtering rule instead
   of drifting. `keepName` (the line's current drug) is always kept even
   if it matches an allergy class, so a plain dose/frequency edit never
   finds its own drug missing from the list. */
export const getAllergySafeDrugs = (allergies = [], keepName) => {
  const classes = new Set((allergies || []).map((a) => a.name));
  return DRUG_REGISTRY.filter((d) => d.name === keepName || !classes.has(DRUG_ALLERGY_CLASS[d.name]));
};

/* ── Two-tier warehouse (ToR §1.9.6-1.9.9) ──────────────────────────────
   คลังยาใหญ่ — 1 คลังต่อศูนย์ (bulk store).
   คลังยาย่อย — user-named warehouses in that center; each carries tags for
   จุดบริการ (QUEUE_STATIONS id) + แผนก. Dispensing draws from the default
   sub warehouse (`isDefaultDispense`). */
const addMonths = (date, n) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
};
const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const TODAY = new Date().toISOString().slice(0, 10);

const cloneStockMap = (map, scale = 1) => Object.fromEntries(
  Object.entries(map).map(([name, entry]) => ([
    name,
    {
      ...entry,
      stock: Math.max(0, Math.round(entry.stock * scale)),
      lot: scale === 1 ? entry.lot : `${entry.lot}-B`,
    },
  ])),
);

/* Department labels for warehouse tags (prototype — not full assess CRUD). */
export const PHARMACY_WAREHOUSE_DEPARTMENTS = [
  { id: 'dept-pharm', name: 'เภสัชกรรม' },
  { id: 'dept-im', name: 'อายุรกรรม (Internal Medicine)' },
  { id: 'dept-ncd', name: 'คลินิกโรคเรื้อรัง (NCD)' },
];

export const getPharmacyWarehouseDepartment = (departmentId) => (
  PHARMACY_WAREHOUSE_DEPARTMENTS.find((d) => d.id === departmentId) || null
);

/** User-named sub warehouses — tags: stationId (จุดบริการ) + departmentId (แผนก). */
export const SUB_WAREHOUSES = [
  {
    id: 'wh-sub-pharmacy',
    name: 'คลังยาย่อย — ห้องยา / รับยา',
    stationId: 'st-pharmacy',
    departmentId: 'dept-pharm',
    active: true,
    isDefaultDispense: true,
  },
  {
    id: 'wh-sub-opd',
    name: 'คลังยาย่อย — OPD',
    stationId: 'st-opd',
    departmentId: 'dept-im',
    active: true,
    isDefaultDispense: false,
  },
  {
    id: 'wh-sub-ncd',
    name: 'คลังยาย่อย — คลินิกโรคเรื้อรัง',
    stationId: 'st-ncd',
    departmentId: 'dept-ncd',
    active: true,
    isDefaultDispense: false,
  },
];

const SUB_STOCK_ROOM = {
  'Amoxicillin 500 mg':  { stock: 40,  unit: 'เม็ด',    unitPrice: 3, lot: 'LOT-AMX-24A', expiryDate: addMonths(TODAY, 4)  },
  'Paracetamol 500 mg':  { stock: 200, unit: 'เม็ด',    unitPrice: 1, lot: 'LOT-PCM-24B', expiryDate: addMonths(TODAY, 14) },
  'Ibuprofen 400 mg':    { stock: 5,   unit: 'เม็ด',    unitPrice: 2, lot: 'LOT-IBU-24C', expiryDate: addMonths(TODAY, 2)  },
  'Cetirizine 10 mg':    { stock: 60,  unit: 'เม็ด',    unitPrice: 2, lot: 'LOT-CTZ-24A', expiryDate: addMonths(TODAY, 20) },
  'Metformin 500 mg':    { stock: 150, unit: 'เม็ด',    unitPrice: 1, lot: 'LOT-MET-24D', expiryDate: addMonths(TODAY, 9)  },
  'Omeprazole 20 mg':    { stock: 80,  unit: 'แคปซูล',  unitPrice: 4, lot: 'LOT-OME-24A', expiryDate: addMonths(TODAY, 5)  },
  'Atorvastatin 20 mg':  { stock: 90,  unit: 'เม็ด',    unitPrice: 5, lot: 'LOT-ATV-24B', expiryDate: addMonths(TODAY, 18) },
  'Atorvastatin 10 mg':  { stock: 30,  unit: 'เม็ด',    unitPrice: 5, lot: 'LOT-ATV10-24A', expiryDate: addMonths(TODAY, 11) },
  'Enalapril 5 mg':      { stock: 70,  unit: 'เม็ด',    unitPrice: 2, lot: 'LOT-ENA-24A', expiryDate: addMonths(TODAY, 3)  },
  'Spironolactone 25 mg': { stock: 45, unit: 'เม็ด',    unitPrice: 2, lot: 'LOT-SPI-24A', expiryDate: addMonths(TODAY, 16) },
  'Simvastatin 20 mg':   { stock: 55,  unit: 'เม็ด',    unitPrice: 3, lot: 'LOT-SIM-24A', expiryDate: addMonths(TODAY, 7)  },
  'Amlodipine 5 mg':     { stock: 65,  unit: 'เม็ด',    unitPrice: 2, lot: 'LOT-AML-24A', expiryDate: addMonths(TODAY, 13) },
};

export const SUB_STOCK_BY_WAREHOUSE = {
  'wh-sub-pharmacy': SUB_STOCK_ROOM,
  'wh-sub-opd': cloneStockMap({
    'Paracetamol 500 mg': SUB_STOCK_ROOM['Paracetamol 500 mg'],
    'Amoxicillin 500 mg': SUB_STOCK_ROOM['Amoxicillin 500 mg'],
    'Ibuprofen 400 mg': SUB_STOCK_ROOM['Ibuprofen 400 mg'],
    'Cetirizine 10 mg': SUB_STOCK_ROOM['Cetirizine 10 mg'],
    'Omeprazole 20 mg': SUB_STOCK_ROOM['Omeprazole 20 mg'],
  }, 0.55),
  'wh-sub-ncd': cloneStockMap({
    'Metformin 500 mg': SUB_STOCK_ROOM['Metformin 500 mg'],
    'Amlodipine 5 mg': SUB_STOCK_ROOM['Amlodipine 5 mg'],
    'Enalapril 5 mg': SUB_STOCK_ROOM['Enalapril 5 mg'],
    'Atorvastatin 20 mg': SUB_STOCK_ROOM['Atorvastatin 20 mg'],
    'Atorvastatin 10 mg': SUB_STOCK_ROOM['Atorvastatin 10 mg'],
    'Simvastatin 20 mg': SUB_STOCK_ROOM['Simvastatin 20 mg'],
  }, 0.7),
};

/** Default dispense warehouse stock — same object as `wh-sub-pharmacy` map. */
export const SUB_PHARMACY_STOCK = SUB_STOCK_BY_WAREHOUSE['wh-sub-pharmacy'];

export const MAIN_WAREHOUSE_STOCK = {
  'Amoxicillin 500 mg':  { stock: 3000, unit: 'เม็ด', unitPrice: 2.5, lot: 'LOT-AMX-MAIN-24', expiryDate: addMonths(TODAY, 10), receivedFrom: 'องค์การเภสัชกรรม (GPO)', receivedAt: addMonths(TODAY, -2) },
  'Paracetamol 500 mg':  { stock: 8000, unit: 'เม็ด', unitPrice: 0.8, lot: 'LOT-PCM-MAIN-24', expiryDate: addMonths(TODAY, 22), receivedFrom: 'องค์การเภสัชกรรม (GPO)', receivedAt: addMonths(TODAY, -1) },
  'Ibuprofen 400 mg':    { stock: 200,  unit: 'เม็ด', unitPrice: 1.8, lot: 'LOT-IBU-MAIN-24', expiryDate: addMonths(TODAY, 5),  receivedFrom: 'บริษัท ฟาร์มา จำกัด', receivedAt: addMonths(TODAY, -3) },
  'Metformin 500 mg':    { stock: 5000, unit: 'เม็ด', unitPrice: 0.9, lot: 'LOT-MET-MAIN-24', expiryDate: addMonths(TODAY, 16), receivedFrom: 'องค์การเภสัชกรรม (GPO)', receivedAt: addMonths(TODAY, -2) },
  'Omeprazole 20 mg':    { stock: 1500, unit: 'แคปซูล', unitPrice: 3.5, lot: 'LOT-OME-MAIN-24', expiryDate: addMonths(TODAY, 8), receivedFrom: 'องค์การเภสัชกรรม (GPO)', receivedAt: addMonths(TODAY, -4) },
};

export const listSubWarehouses = ({ activeOnly = true } = {}) => (
  SUB_WAREHOUSES.filter((w) => (activeOnly ? w.active : true))
);

export const getSubWarehouse = (warehouseId) => (
  SUB_WAREHOUSES.find((w) => w.id === warehouseId) || null
);

export const getDefaultDispenseWarehouseId = () => (
  SUB_WAREHOUSES.find((w) => w.isDefaultDispense)?.id || SUB_WAREHOUSES[0]?.id || null
);

export const getSubStockMap = (warehouseId) => {
  const id = warehouseId || getDefaultDispenseWarehouseId();
  return SUB_STOCK_BY_WAREHOUSE[id] || SUB_PHARMACY_STOCK;
};

/** Resolve จุดบริการ + แผนก tags for a sub warehouse (for UI badges). */
export const resolveSubWarehouseTags = (warehouse) => {
  const wh = typeof warehouse === 'string' ? getSubWarehouse(warehouse) : warehouse;
  if (!wh) return { stationLabel: '—', departmentLabel: '—', zone: '', floor: '' };
  const station = getStation(wh.stationId);
  const dept = getPharmacyWarehouseDepartment(wh.departmentId);
  return {
    stationLabel: station?.label || wh.stationId || '—',
    departmentLabel: dept?.name || wh.departmentId || '—',
    zone: station?.zone || '',
    floor: station?.floor || '',
  };
};

export const getStock = (name, warehouseId) => getSubStockMap(warehouseId)[name] ?? null;
export const getMainStock = (name) => MAIN_WAREHOUSE_STOCK[name] ?? null;

/** True when every item has enough stock in the (default) sub warehouse. */
export const hasSufficientStock = (items = [], warehouseId) => {
  const stockMap = getSubStockMap(warehouseId);
  return items.every((item) => {
    const entry = stockMap[item.name];
    return !entry || item.quantity <= entry.stock;
  });
};

/* Mutates the in-memory stock map — module-level, resets on reload. */
export const deductStock = (items = [], qtyKey = 'quantity', warehouseId) => {
  const stockMap = getSubStockMap(warehouseId);
  items.forEach((item) => {
    const entry = stockMap[item.name];
    const qty = item[qtyKey] ?? item.quantity;
    if (entry) entry.stock = Math.max(0, entry.stock - qty);
  });
};

/** Stock entries expiring within `monthsAhead` months (default 6, per ToR "3-6 เดือน"). */
export const nearExpiryEntries = (stockMap, monthsAhead = 6) => {
  const cutoff = addMonths(TODAY, monthsAhead);
  return Object.entries(stockMap)
    .filter(([, entry]) => entry.expiryDate <= cutoff)
    .map(([name, entry]) => ({ name, ...entry }));
};

/** Aggregate near-expiry count across every active sub warehouse. */
export const nearExpirySubWarehouseCount = (monthsAhead = 6) => (
  listSubWarehouses().reduce((sum, w) => sum + nearExpiryEntries(getSubStockMap(w.id), monthsAhead).length, 0)
);

/** Flatten all sub-warehouse stock rows (for center-level summary cards). */
export const allSubWarehouseRows = () => (
  listSubWarehouses().flatMap((w) => (
    Object.entries(getSubStockMap(w.id)).map(([name, entry]) => ({
      name, ...entry, warehouseId: w.id, warehouseName: w.name,
    }))
  ))
);

/* สถานะการทำงานของคลัง (ToR §1.9.8.1/§1.9.9.1) — main is one status;
   each named sub warehouse has its own status. */
export const WAREHOUSE_STATUS_OPTIONS = [
  { key: 'open',        label: 'เปิดดำเนินการ'   },
  { key: 'maintenance', label: 'ปิดปรับปรุง'      },
  { key: 'suspended',   label: 'ระงับชั่วคราว'    },
];

const mkStatus = () => ({ status: 'open', updatedAt: TODAY, updatedBy: CURRENT_DISPENSER.name });

export const WAREHOUSE_OPERATING_STATUS = {
  main: mkStatus(),
  /* legacy key — mirrors default sub warehouse for older callers */
  sub: null,
  bySubWarehouse: Object.fromEntries(SUB_WAREHOUSES.map((w) => [w.id, mkStatus()])),
};
WAREHOUSE_OPERATING_STATUS.sub = WAREHOUSE_OPERATING_STATUS.bySubWarehouse[getDefaultDispenseWarehouseId()];

export const getWarehouseOperatingStatus = (tier, warehouseId) => {
  if (tier === 'main') return WAREHOUSE_OPERATING_STATUS.main;
  const id = warehouseId || getDefaultDispenseWarehouseId();
  return WAREHOUSE_OPERATING_STATUS.bySubWarehouse[id] || WAREHOUSE_OPERATING_STATUS.sub;
};

export const setWarehouseOperatingStatus = (tier, status, warehouseId) => {
  const entry = getWarehouseOperatingStatus(tier, warehouseId);
  if (!entry) return null;
  entry.status = status;
  entry.updatedAt = TODAY;
  entry.updatedBy = CURRENT_DISPENSER.name;
  return entry;
};

/* รายการที่ต้องเบิกเพิ่มเติม (ToR §1.9.8.3) — cross-references stock below
   `usageRate.reorderPoint` against the drug's NLEM classification to split
   into the two channels the ToR names: NLEM items route through
   กองเภสัชกรรม (the standard requisition channel this module already
   models in §1.9.6); non-NLEM items are the ones a center would instead
   need to request extra funding for from สปสช. */
export const reorderNeededEntries = (stockMap) =>
  Object.entries(stockMap)
    .map(([name, entry]) => ({ name, ...entry, drug: DRUG_REGISTRY.find((d) => d.name === name) }))
    .filter((r) => r.drug && r.stock < r.drug.usageRate.reorderPoint)
    .map((r) => ({
      name: r.name, stock: r.stock, unit: r.unit,
      reorderPoint: r.drug.usageRate.reorderPoint,
      channel: r.drug.classification === 'nlem' ? 'pharmacy-division' : 'nhso',
    }));

/* ── Requisition (เบิกจ่ายยา/เวชภัณฑ์) + receiving (รับยาเข้าคลังใหญ่) —
   ToR §1.9.6-1.9.7. Mock records + mutators; a single-facility stand-in
   for what would otherwise be a live multi-center warehouse network. */

/* ประเภทการเบิก — urgency of the request. */
export const REQUISITION_TYPES = [
  { key: 'regular',     label: 'ปกติ'                  },
  { key: 'urgent',      label: 'ด่วน'                   },
  { key: 'other-unit',  label: 'จ่ายให้หน่วยงานอื่น'    },
];

/* ประเภทรายการที่เบิก (ToR §1.9.6.7 "เลือกประเภทที่ต้องการทำการเบิกได้") —
   distinct from `REQUISITION_TYPES` above (which is the request's
   urgency): this is WHAT KIND of item the line is. */
export const REQUISITION_ITEM_CATEGORIES = [
  { key: 'drug',      label: 'ยา'       },
  { key: 'supply',    label: 'เวชภัณฑ์' },
  { key: 'equipment', label: 'ครุภัณฑ์' },
];

/* หน่วยงานที่ส่งคำร้องไป (ToR §1.9.6.5) — who the requisition is
   addressed to, distinct from the requesting center itself. */
export const REQUISITION_TARGETS = [
  { key: 'main-warehouse',    label: 'คลังยาใหญ่ศูนย์'                              },
  { key: 'pharmacy-division', label: 'กองเภสัชกรรม สำนักอนามัย'                      },
  { key: 'nhso',               label: 'สำนักงานหลักประกันสุขภาพแห่งชาติ (สปสช.)'     },
];

/* ประเภทการรับ (ToR §1.9.7.2 "ประเภทการรับ"). */
export const RECEIVING_TYPES = [
  { key: 'purchase', label: 'จัดซื้อ'              },
  { key: 'transfer', label: 'โอนจากหน่วยงานอื่น'   },
  { key: 'donation', label: 'รับบริจาค'             },
];

/* §1.9.6 mock list — 40 rows seeded from ทะเบียนยา for filter/sort/pagination demos. */
const REQ_UNIT_LABEL = {
  tablet: 'เม็ด', capsule: 'แคปซูล', bottle: 'ขวด', box: 'กล่อง',
  sachet: 'ซอง', tube: 'หลอด', blister: 'แผง', ml: 'ซีซี',
};
const REQ_SEED_REQUESTERS = [
  { name: CURRENT_DISPENSER.name, position: 'เภสัชกร' },
  { name: CURRENT_CLINICAL_PHARMACIST.name, position: 'เภสัชกรคลินิก' },
  { name: 'ภญ.ปิยะดา จันทร์เพ็ญ', position: 'เภสัชกร' },
  { name: 'ภก.วรากรณ์ สุขใจ', position: 'เภสัชกร' },
];
const REQ_SEED_CENTERS = ['hc-4', 'hc-3', 'hc-5', 'hc-7', 'hc-1'];
const REQ_SEED_NOTES = [
  '', '', 'ใกล้หมดสต็อกย่อย', 'เร่งด่วน — คลินิกโรคเรื้อรัง',
  'เบิกสำรองเดือนนี้', 'สำหรับจุดบริการ OPD', 'ยาใกล้หมดอายุ — เร่งใช้',
];
const REQ_SEED_STATUSES = ['pending', 'approved', 'fulfilled', 'cancelled', 'pending', 'approved'];

const buildRequisitionSeeds = (count = 40) => {
  const drugs = DRUG_REGISTRY.length ? DRUG_REGISTRY : [{ name: 'Paracetamol 500 mg', unit: 'tablet', packSize: 1000 }];
  const typeKeys = REQUISITION_TYPES.map((t) => t.key);
  const categoryKeys = REQUISITION_ITEM_CATEGORIES.map((c) => c.key);
  const targetKeys = REQUISITION_TARGETS.map((t) => t.key);
  return Array.from({ length: count }, (_, i) => {
    const drug = drugs[i % drugs.length];
    const unit = REQ_UNIT_LABEL[drug.unit] || 'เม็ด';
    const packQty = drug.packSize > 0 ? Number(drug.packSize) : 100 + (i % 5) * 100;
    const quantity = 100 + (i % 12) * 50;
    const status = REQ_SEED_STATUSES[i % REQ_SEED_STATUSES.length];
    const requester = REQ_SEED_REQUESTERS[i % REQ_SEED_REQUESTERS.length];
    const requisitionCount = 1 + (i % 7);
    const hasPrevious = requisitionCount > 1;
    const requisitionNo = `RQ-2026-${String(200 - i).padStart(4, '0')}`;
    const approved = status === 'approved' || status === 'fulfilled' ? quantity : null;
    return {
      id: `req-${String(i + 1).padStart(3, '0')}`,
      requisitionNo,
      groupId: requisitionNo,
      seq: 1,
      drugName: drug.name,
      quantity,
      unit,
      packSize: String(packQty),
      itemCategory: categoryKeys[i % categoryKeys.length],
      requestedBy: requester.name,
      requestedByPosition: requester.position,
      requestingCenter: REQ_SEED_CENTERS[i % REQ_SEED_CENTERS.length],
      targetUnit: targetKeys[i % targetKeys.length],
      requisitionType: typeKeys[i % typeKeys.length],
      previousRequestQty: hasPrevious ? Math.max(50, quantity - 50) : null,
      previousRequestAt: hasPrevious ? addDays(TODAY, -(30 + (i % 20))) : null,
      requisitionCount,
      approvedQuantity: approved,
      notes: REQ_SEED_NOTES[i % REQ_SEED_NOTES.length],
      requestedAt: addDays(TODAY, -(i % 45)),
      status,
      ...(status === 'cancelled' ? { cancelReason: 'ยกเลิกโดยเภสัชกร (mock)' } : null),
    };
  });
};

export const REQUISITIONS = buildRequisitionSeeds(40);

/* §1.9.7 mock list — 40 rows seeded from ทะเบียนยา for filter/sort/pagination demos. */
const RCV_SEED_DEPARTMENTS = [
  'คลังยาใหญ่ศูนย์ 4 ดินแดง',
  'คลังยาใหญ่ศูนย์ 3 บางซื่อ',
  'คลังยาใหญ่ศูนย์ 5 ดินแดง',
  'คลังยาใหญ่ศูนย์ 7 บุคคโล',
  'คลังยาใหญ่ศูนย์ 1 พญาไท',
];
const RCV_SEED_RECEIVERS = [
  CURRENT_DISPENSER.name,
  CURRENT_CLINICAL_PHARMACIST.name,
  'ภญ.ปิยะดา จันทร์เพ็ญ',
  'ภก.วรากรณ์ สุขใจ',
];
const RCV_SEED_STATUSES = [
  undefined, undefined, undefined, undefined, 'cancelled',
  undefined, undefined, undefined,
];

const buildReceivingSeeds = (count = 40) => {
  const drugs = DRUG_REGISTRY.length
    ? DRUG_REGISTRY
    : [{ name: 'Paracetamol 500 mg', unit: 'tablet', packSize: 1000 }];
  const typeKeys = RECEIVING_TYPES.map((t) => t.key);
  const suppliers = SUPPLIER_OPTIONS.length
    ? SUPPLIER_OPTIONS
    : ['องค์การเภสัชกรรม (GPO)'];
  return Array.from({ length: count }, (_, i) => {
    const drug = drugs[i % drugs.length];
    const unit = REQ_UNIT_LABEL[drug.unit] || 'เม็ด';
    const packQty = drug.packSize > 0 ? Number(drug.packSize) : 1000;
    const quantity = packQty * (1 + (i % 5));
    const costPrice = Number((0.5 + (i % 12) * 0.15).toFixed(2));
    const salePrice = Number((costPrice + 0.2 + (i % 5) * 0.05).toFixed(2));
    const claimablePrice = Number((salePrice - 0.05).toFixed(2));
    const receiptNo = `RCV-2026-${String(120 - i).padStart(4, '0')}`;
    const lotStem = String(drug.name || 'DRUG').replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase() || 'DRUG';
    const status = RCV_SEED_STATUSES[i % RCV_SEED_STATUSES.length];
    const monthsAgo = 1 + (i % 10);
    return {
      id: `rcv-${String(i + 1).padStart(3, '0')}`,
      receiptNo,
      groupId: receiptNo,
      seq: 1,
      department: RCV_SEED_DEPARTMENTS[i % RCV_SEED_DEPARTMENTS.length],
      scanCode: `8850001${String(112345 + i).padStart(6, '0')}`,
      drugName: drug.name,
      quantity,
      unit,
      packSize: `${unit}ละ ${packQty}`,
      drugType: DRUG_TYPES[i % DRUG_TYPES.length],
      lot: `LOT-${lotStem}-${String(24 + (i % 3)).padStart(2, '0')}${String.fromCharCode(65 + (i % 6))}`,
      expiryDate: addMonths(TODAY, 6 + (i % 24)),
      costPrice,
      salePrice,
      claimablePrice,
      receivingType: typeKeys[i % typeKeys.length],
      poNumber: `PO-2026-${String(80 - (i % 40)).padStart(4, '0')}`,
      purchaseDate: addMonths(TODAY, -(monthsAgo + 1)),
      deliveryNoteNumber: `DN-2026-${String(100 - (i % 40)).padStart(4, '0')}`,
      deliveryDate: addMonths(TODAY, -monthsAgo),
      receivedFrom: suppliers[i % suppliers.length],
      receivedAt: addDays(TODAY, -(i % 45)),
      receivedBy: RCV_SEED_RECEIVERS[i % RCV_SEED_RECEIVERS.length],
      ...(status === 'cancelled'
        ? { status: 'cancelled', cancelReason: 'ยกเลิกรายการรับเข้า (mock)' }
        : null),
    };
  });
};

export const RECEIVING_RECORDS = buildReceivingSeeds(40);

/* ยืม-คืนยา + แลกล็อตยาระหว่างศูนย์ (ToR §1.9.9.4-5) — `direction` splits
   the list into "ผู้ส่งคำร้อง" (`outgoing` — requests this center made to
   another) vs "ผู้รับคำร้อง" (`incoming` — requests another center sent
   here, which this center can confirm). `type` covers all three request
   kinds the ToR names: ยืม (borrow) / คืน (return) / แลกล็อต (lot-exchange,
   for near-expiry stock swaps between centers). */
export const BORROW_RETURN_TYPES = [
  { key: 'borrow',       label: 'ยืม'       },
  { key: 'return',       label: 'คืน'       },
  { key: 'lot-exchange', label: 'แลกล็อต'   },
];

/* §1.9.9.4–5 history must cover all three TOR kinds (แลกล็อต / ยืมยา /
   ยาที่ต้องคืน) for both ผู้ส่งคำร้อง and ผู้รับคำร้อง — include completed
   rows so the table reads as ประวัติ, not only open requests.
   `requestedBy` = ชื่อผู้สร้างคำร้อง. */
export const BORROW_RETURN_RECORDS = [
  { id: 'br-001', type: 'borrow', direction: 'outgoing', drugName: 'Ibuprofen 400 mg', quantity: 100, unit: 'เม็ด', counterpartCenter: 'ศูนย์บริการสาธารณสุข 3 บางซื่อ', requestedBy: CURRENT_DISPENSER.name, requestedAt: addMonths(TODAY, 0), status: 'pending' },
  { id: 'br-002', type: 'return', direction: 'outgoing', drugName: 'Omeprazole 20 mg', quantity: 50, unit: 'แคปซูล', counterpartCenter: 'ศูนย์บริการสาธารณสุข 7 บุคคโล', requestedBy: CURRENT_DISPENSER.name, requestedAt: addMonths(TODAY, -1), status: 'completed' },
  { id: 'br-004', type: 'borrow', direction: 'outgoing', drugName: 'Amoxicillin 500 mg', quantity: 200, unit: 'เม็ด', counterpartCenter: 'ศูนย์บริการสาธารณสุข 5 ดินแดง', requestedBy: 'ภญ.กรรณิการ์ ภู่ตระกูล', requestedAt: addMonths(TODAY, -2), status: 'completed' },
  { id: 'br-005', type: 'lot-exchange', direction: 'outgoing', drugName: 'Paracetamol 500 mg', quantity: 500, unit: 'เม็ด', counterpartCenter: 'ศูนย์บริการสาธารณสุข 9 หลวงพ่อทวีศักดิ์', requestedBy: CURRENT_DISPENSER.name, requestedAt: addMonths(TODAY, -3), status: 'completed' },
  { id: 'br-003', type: 'lot-exchange', direction: 'incoming', drugName: 'Atorvastatin 20 mg', quantity: 60, unit: 'เม็ด', counterpartCenter: 'ศูนย์บริการสาธารณสุข 21 วัดธาตุทอง', requestedBy: 'ภก.วรากรณ์ สุขใจ', requestedAt: addMonths(TODAY, 0), status: 'pending' },
  { id: 'br-006', type: 'borrow', direction: 'incoming', drugName: 'Metformin 500 mg', quantity: 150, unit: 'เม็ด', counterpartCenter: 'ศูนย์บริการสาธารณสุข 12 บางคอแหลม', requestedBy: 'ภญ.ปิยะดา จันทร์เพ็ญ', requestedAt: addMonths(TODAY, -1), status: 'completed' },
  { id: 'br-007', type: 'return', direction: 'incoming', drugName: 'Cetirizine 10 mg', quantity: 40, unit: 'เม็ด', counterpartCenter: 'ศูนย์บริการสาธารณสุข 8 บางขุนเทียน', requestedBy: 'ภก.ธนวัฒน์ ศรีสุข', requestedAt: addMonths(TODAY, -2), status: 'completed' },
];

/* §1.9.9.5 — confirm an incoming request from another center (ยืนยันการ
   แลกล็อต / ยืนยันการให้ยืม). Only meaningful for `direction: 'incoming'`. */
export const confirmBorrowReturnRequest = (id) => {
  const row = BORROW_RETURN_RECORDS.find((r) => r.id === id);
  if (!row) return null;
  row.status = 'completed';
  return row;
};

let borrowReturnSeq = BORROW_RETURN_RECORDS.length;
/* §1.9.9.4 — "ผู้ส่งคำร้อง" creating a NEW ยืม/คืน/แลกล็อต request to
   another center (the create-side counterpart to `confirmBorrowReturnRequest`
   above, which only handles the receiving side). Always `direction:
   'outgoing'` since this center is the one sending the request. */
export const createBorrowReturnRequest = ({ type, drugName, quantity, unit, counterpartCenter, requestedBy }) => {
  const row = {
    id: `br-${++borrowReturnSeq}`,
    type, direction: 'outgoing', drugName, quantity: Number(quantity) || 0, unit, counterpartCenter,
    requestedBy: requestedBy || CURRENT_DISPENSER.name,
    requestedAt: TODAY, status: 'pending',
  };
  BORROW_RETURN_RECORDS.unshift(row);
  return row;
};

/** ประมาณ "เหลือถึงวันเบิกใหม่" — days of sub-pharmacy stock left, from
    current stock ÷ this drug's average monthly usage (`pharmacyRegistry.js`
    `usageRate.avgPerMonth`). Returns null when either figure is unknown. */
export const estimateDaysUntilNextRequisition = (drugName, warehouseId) => {
  const stockEntry = getStock(drugName, warehouseId);
  const avgPerMonth = DRUG_REGISTRY.find((d) => d.name === drugName)?.usageRate?.avgPerMonth;
  if (!stockEntry || !avgPerMonth) return null;
  return Math.max(0, Math.round((stockEntry.stock / avgPerMonth) * 30));
};

let requisitionSeq = REQUISITIONS.length;
let requisitionGroupSeq = REQUISITIONS.length;
/* §1.9.6.9 — one requisition DOCUMENT can carry multiple drug lines.
   `items` is `[{ drugName, quantity, unit, packSize? }, …]`; every line
   shares one `requisitionNo`/`groupId` and gets its own row (matching the
   flat-table shape the requisition/print views already read) plus its own
   §1.9.6.2 "ครั้งที่เบิก" ordinal, computed from how many prior rows exist
   for that same drug. Returns the created rows. */
export const createRequisition = ({
  items, requisitionType = 'regular', notes = '', requestedByPosition = 'เภสัชกร',
  requestingCenter, targetUnit, itemCategory = 'drug',
}) => {
  const lines = items && items.length ? items : [];
  const requisitionNo = `RQ-2026-${String(200 + ++requisitionGroupSeq).padStart(4, '0')}`;
  const created = lines.map((line, i) => {
    const previous = REQUISITIONS.find((r) => r.drugName === line.drugName);
    const priorCount = REQUISITIONS.filter((r) => r.drugName === line.drugName).length;
    const rq = {
      id: `req-${++requisitionSeq}`,
      requisitionNo, groupId: requisitionNo, seq: i + 1,
      drugName: line.drugName, quantity: line.quantity, unit: line.unit, packSize: line.packSize || '-',
      itemCategory, requisitionType, notes,
      requestedBy: CURRENT_DISPENSER.name,
      requestedByPosition, requestingCenter, targetUnit,
      previousRequestQty: previous?.quantity ?? null,
      previousRequestAt: previous?.requestedAt ?? null,
      requisitionCount: priorCount + 1,
      approvedQuantity: null,
      requestedAt: TODAY,
      status: 'pending',
    };
    REQUISITIONS.unshift(rq);
    return rq;
  });
  return created;
};

/* §1.9.6.1 — edit/cancel an EXISTING requisition line (create already
   existed above). Cancelling stores a reason the way `cancelPharmacyOrder`
   does for the dispense queue. */
export const updateRequisition = (id, patch) => {
  const idx = REQUISITIONS.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  REQUISITIONS[idx] = { ...REQUISITIONS[idx], ...patch };
  return REQUISITIONS[idx];
};

export const cancelRequisition = (id, reason = '') =>
  updateRequisition(id, { status: 'cancelled', cancelReason: reason });

export const deleteRequisition = (id) => {
  const idx = REQUISITIONS.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  REQUISITIONS.splice(idx, 1);
  return true;
};

export const approveRequisition = (id, approvedQuantity) =>
  updateRequisition(id, { status: 'approved', approvedQuantity });

let receivingSeq = RECEIVING_RECORDS.length;
let receivingGroupSeq = RECEIVING_RECORDS.length;
/* §1.9.7.4 — one receiving DOCUMENT can carry multiple lines, each with
   its own `receivedFrom` manufacturer/supplier (the multi-manufacturer
   case the ToR calls out), sharing one receiptNo/groupId/department/PO/
   delivery-note header. `items` is
   `[{ drugName, quantity, unit, lot, expiryDate, drugType, costPrice,
       salePrice, claimablePrice, packSize, receivedFrom }, …]`. */
export const createReceivingRecord = ({
  items, receivingType = 'purchase', department = '', scanCode = '',
  poNumber = '', purchaseDate = TODAY, deliveryNoteNumber = '', deliveryDate = TODAY,
}) => {
  const lines = items && items.length ? items : [];
  const receiptNo = `RCV-2026-${String(100 + ++receivingGroupSeq).padStart(4, '0')}`;
  const created = lines.map((line, i) => {
    const rcv = {
      id: `rcv-${++receivingSeq}`,
      receiptNo, groupId: receiptNo, seq: i + 1, department, scanCode,
      drugName: line.drugName, quantity: line.quantity, unit: line.unit, packSize: line.packSize || '-',
      drugType: line.drugType || 'GPO', lot: line.lot, expiryDate: line.expiryDate,
      costPrice: line.costPrice ?? 0, salePrice: line.salePrice ?? 0, claimablePrice: line.claimablePrice ?? line.salePrice ?? 0,
      receivingType, poNumber, purchaseDate, deliveryNoteNumber, deliveryDate,
      receivedFrom: line.receivedFrom || '',
      receivedAt: TODAY,
      receivedBy: CURRENT_DISPENSER.name,
    };
    RECEIVING_RECORDS.unshift(rcv);
    const entry = MAIN_WAREHOUSE_STOCK[line.drugName];
    if (entry) entry.stock += line.quantity;
    return rcv;
  });
  return created;
};

/* §1.9.7.1 — edit/cancel an EXISTING receiving line (create already
   existed above). Cancelling reverses the main-warehouse stock bump that
   `createReceivingRecord` applied, and stores a reason. */
export const updateReceivingRecord = (id, patch) => {
  const idx = RECEIVING_RECORDS.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  RECEIVING_RECORDS[idx] = { ...RECEIVING_RECORDS[idx], ...patch };
  return RECEIVING_RECORDS[idx];
};

export const cancelReceivingRecord = (id, reason = '') => {
  const row = RECEIVING_RECORDS.find((r) => r.id === id);
  if (!row || row.status === 'cancelled') return null;
  const entry = MAIN_WAREHOUSE_STOCK[row.drugName];
  if (entry) entry.stock = Math.max(0, entry.stock - row.quantity);
  return updateReceivingRecord(id, { status: 'cancelled', cancelReason: reason });
};

export const deleteReceivingRecord = (id) => {
  const row = RECEIVING_RECORDS.find((r) => r.id === id);
  if (!row) return false;
  if (row.status !== 'cancelled') {
    const entry = MAIN_WAREHOUSE_STOCK[row.drugName];
    if (entry) entry.stock = Math.max(0, entry.stock - row.quantity);
  }
  const idx = RECEIVING_RECORDS.findIndex((r) => r.id === id);
  RECEIVING_RECORDS.splice(idx, 1);
  return true;
};

/* Cross-references each prescribed item's drug class against the patient's
   `drugAllergies`. Returns [] when there's no conflict. */
export const checkAllergyConflicts = (patient, items = []) => {
  const allergies = patient?.drugAllergies || [];
  if (allergies.length === 0) return [];
  const conflicts = [];
  for (const item of items) {
    const drugClass = DRUG_ALLERGY_CLASS[item.name];
    if (!drugClass) continue;
    const allergy = allergies.find((a) => a.name === drugClass);
    if (allergy) {
      conflicts.push({ item, allergyClass: drugClass, symptom: allergy.symptom, severity: allergy.severity });
    }
  }
  return conflicts;
};

const patientName = (hn) => {
  const p = findMrPatientByHn(hn);
  return p ? `${p.prefixTh}${p.firstNameTh} ${p.lastNameTh}` : hn;
};

/* Seed rows — HN 67-00001 (5 drug allergies) and 67-00009 (1 allergy) are
   each prescribed a conflicting drug so the allergy banner has real data to
   demonstrate against; 67-00009's Ibuprofen line also exceeds mock stock
   (5 available) to demonstrate the insufficient-stock case. P-014 carries a
   Re-med item; P-017 carries an out-of-rights item (Atorvastatin 10 mg is
   ชำระเงินเอง-only in the registry, patient's right is รัฐวิสาหกิจ); P-015
   demonstrates the "doctor changed the order" alert. */
const MANUAL_SEED = [
  {
    id: 'ph-001', queueNo: 'P-012', hn: '67-00001', issuedAt: '09:05',
    status: DISPENSE_STATUS.CALLED, calledAt: '09:14', queueType: 'general',
    diagnosis: { icd10: 'J06.9', name: 'การติดเชื้อทางเดินหายใจส่วนบนเฉียบพลัน' },
    vitalsSnapshot: { bp: '128/82', hr: '76', temp: '37.4', weight: '68' },
    nurseNote: 'ผู้ป่วยแจ้งเจ็บคอ ไอมีเสมหะ 3 วัน ไม่มีไข้สูง ซักประวัติเบื้องต้นโดยพยาบาลก่อนพบแพทย์',
    orderChanged: null,
    verifiedBy: null, verifiedAt: null, verificationLog: [],
    pharmacistNotes: [], counselingLog: [],
    noShow: false, noShowReason: '',
    problemFlag: false, problemReason: '',
    deliveryMethod: 'pickup', deliveryAddress: null,
    paymentStatus: PAYMENT_STATUS.NOT_APPLICABLE,
    ownMedications: [], medErrors: [],
    items: [
      { id: 'i-1', name: 'Amoxicillin 500 mg', dosePerTake: '1', unit: 'เม็ด', frequency: 'วันละ 3 ครั้ง', when: 'หลังอาหาร', quantity: 21, instructions: 'รับประทานจนยาหมด แม้อาการดีขึ้น', source: 'new', quantityDispensed: 0, drugType: 'GPO' },
      { id: 'i-2', name: 'Paracetamol 500 mg', dosePerTake: '1', unit: 'เม็ด', frequency: 'ทุก 6 ชั่วโมงเมื่อมีอาการ', when: 'หลังอาหาร', quantity: 20, instructions: 'รับประทานเมื่อมีไข้หรือปวด', source: 'new', quantityDispensed: 0, drugType: 'GPO' },
    ],
  },
  {
    id: 'ph-002', queueNo: 'P-013', hn: '67-00009', issuedAt: '09:12',
    status: DISPENSE_STATUS.CALLED, calledAt: '09:19', queueType: 'urgent',
    diagnosis: { icd10: 'M25.5', name: 'ปวดข้อ (Arthralgia)' },
    vitalsSnapshot: { bp: '138/88', hr: '82', temp: '36.9', weight: '54' },
    orderChanged: null,
    verifiedBy: null, verifiedAt: null, verificationLog: [],
    pharmacistNotes: [], counselingLog: [],
    noShow: false, noShowReason: '',
    problemFlag: false, problemReason: '',
    deliveryMethod: 'pickup', deliveryAddress: null,
    paymentStatus: PAYMENT_STATUS.NOT_APPLICABLE,
    ownMedications: [], medErrors: [],
    items: [
      { id: 'i-3', name: 'Ibuprofen 400 mg', dosePerTake: '1', unit: 'เม็ด', frequency: 'วันละ 2 ครั้ง', when: 'หลังอาหารทันที', quantity: 10, instructions: 'งดใช้ร่วมกับยาแก้ปวดกลุ่มเดียวกัน', source: 'new', quantityDispensed: 0, drugType: 'TPU' },
      { id: 'i-3b', name: 'Paracetamol 500 mg', dosePerTake: '1', unit: 'เม็ด', frequency: 'ทุก 6 ชั่วโมงเมื่อมีอาการ', when: 'หลังอาหาร', quantity: 20, instructions: 'รับประทานเมื่อมีไข้หรือปวด', source: 'new', quantityDispensed: 0, drugType: 'GPO' },
      { id: 'i-3c', name: 'Omeprazole 20 mg', dosePerTake: '1', unit: 'แคปซูล', frequency: 'วันละ 1 ครั้ง', when: 'ก่อนอาหารเช้า', quantity: 14, instructions: 'รับประทานก่อนอาหาร 30 นาที', source: 'remed', quantityDispensed: 0, drugType: 'GPO' },
    ],
  },
  {
    id: 'ph-003', queueNo: 'P-014', hn: '67-00002', issuedAt: '09:20',
    status: DISPENSE_STATUS.CALLED, calledAt: '09:31', queueType: 'general',
    diagnosis: { icd10: 'J30.4', name: 'โรคจมูกอักเสบจากภูมิแพ้' },
    vitalsSnapshot: { bp: '118/76', hr: '72', temp: '36.7', weight: '58' },
    orderChanged: null,
    verifiedBy: null, verifiedAt: null, verificationLog: [],
    pharmacistNotes: [], counselingLog: [],
    noShow: false, noShowReason: '',
    problemFlag: false, problemReason: '',
    deliveryMethod: 'pickup', deliveryAddress: null,
    paymentStatus: PAYMENT_STATUS.NOT_APPLICABLE,
    ownMedications: [{ id: 'om-1', name: 'Vitamin B Complex', note: 'ผู้ป่วยรับประทานเองประจำ ไม่ได้มาจากศูนย์', inFormulary: false }],
    medErrors: [],
    items: [
      { id: 'i-4', name: 'Paracetamol 500 mg', dosePerTake: '1', unit: 'เม็ด', frequency: 'ทุก 6 ชั่วโมงเมื่อมีอาการ', when: 'หลังอาหาร', quantity: 20, instructions: 'รับประทานเมื่อมีไข้หรือปวด', source: 'new', quantityDispensed: 0, drugType: 'GPO' },
      { id: 'i-5', name: 'Cetirizine 10 mg', dosePerTake: '1', unit: 'เม็ด', frequency: 'วันละ 1 ครั้ง', when: 'ก่อนนอน', quantity: 10, instructions: 'อาจทำให้ง่วงซึม', source: 'remed', quantityDispensed: 0, drugType: 'GPU' },
    ],
  },
  {
    id: 'ph-004', queueNo: 'P-015', hn: '67-00003', issuedAt: '09:24',
    status: DISPENSE_STATUS.PREPARING, calledAt: '09:30', queueType: 'few',
    diagnosis: { icd10: 'E11.9', name: 'โรคเบาหวานชนิดที่ 2' },
    vitalsSnapshot: { bp: '132/84', hr: '80', temp: '36.6', weight: '77' },
    orderChanged: { at: '09:18', note: 'แพทย์แก้ไขความถี่ยาเป็นวันละ 2 ครั้ง (เดิมวันละ 1 ครั้ง)' },
    verifiedBy: null, verifiedAt: null, verificationLog: [],
    pharmacistNotes: [], counselingLog: [],
    noShow: false, noShowReason: '',
    problemFlag: false, problemReason: '',
    deliveryMethod: 'pickup', deliveryAddress: null,
    paymentStatus: PAYMENT_STATUS.NOT_APPLICABLE,
    ownMedications: [], medErrors: [],
    items: [
      { id: 'i-6', name: 'Metformin 500 mg', dosePerTake: '1', unit: 'เม็ด', frequency: 'วันละ 2 ครั้ง', when: 'หลังอาหาร', quantity: 60, instructions: 'รับประทานต่อเนื่องตามแพทย์สั่ง', source: 'new', quantityDispensed: 0, drugType: 'GPO' },
    ],
  },
  {
    id: 'ph-005', queueNo: 'P-016', hn: '67-00005', issuedAt: '08:40',
    status: DISPENSE_STATUS.DISPENSED, calledAt: '08:52', dispensedAt: '08:58', queueType: 'general',
    diagnosis: { icd10: 'K21.0', name: 'โรคกรดไหลย้อน' },
    vitalsSnapshot: { bp: '122/80', hr: '74', temp: '36.7', weight: '70' },
    orderChanged: null,
    verifiedBy: CURRENT_CLINICAL_PHARMACIST.name, verifiedAt: '08:50',
    verificationLog: [{ id: 'vl-1', actor: CURRENT_CLINICAL_PHARMACIST.name, action: 'ตรวจสอบคำสั่งใช้ยา', note: 'ตรวจสอบแล้ว ไม่พบความผิดปกติ', at: '08:50' }],
    pharmacistNotes: [], counselingLog: [{ id: 'cl-1', by: CURRENT_DISPENSER.name, at: '08:58', note: 'แนะนำรับประทานก่อนอาหาร 30 นาที' }],
    noShow: false, noShowReason: '',
    problemFlag: false, problemReason: '',
    deliveryMethod: 'pickup', deliveryAddress: null,
    paymentStatus: PAYMENT_STATUS.PAID,
    ownMedications: [], medErrors: [],
    items: [
      { id: 'i-7', name: 'Omeprazole 20 mg', dosePerTake: '1', unit: 'แคปซูล', frequency: 'วันละ 1 ครั้ง', when: 'ก่อนอาหารเช้า', quantity: 14, instructions: 'รับประทานก่อนอาหาร 30 นาที', source: 'new', quantityDispensed: 14, drugType: 'GPO' },
    ],
  },
  {
    id: 'ph-006', queueNo: 'P-017', hn: '67-00007', issuedAt: '09:33',
    status: DISPENSE_STATUS.WAITING, queueType: 'general',
    diagnosis: { icd10: 'E78.5', name: 'ไขมันในเลือดผิดปกติ' },
    vitalsSnapshot: { bp: '140/90', hr: '84', temp: '36.8', weight: '82' },
    orderChanged: null,
    verifiedBy: null, verifiedAt: null, verificationLog: [],
    pharmacistNotes: [], counselingLog: [],
    noShow: false, noShowReason: '',
    problemFlag: false, problemReason: '',
    deliveryMethod: 'pickup', deliveryAddress: null,
    paymentStatus: PAYMENT_STATUS.UNPAID,
    ownMedications: [], medErrors: [],
    items: [
      { id: 'i-8', name: 'Atorvastatin 20 mg', dosePerTake: '1', unit: 'เม็ด', frequency: 'วันละ 1 ครั้ง', when: 'ก่อนนอน', quantity: 30, instructions: 'รับประทานต่อเนื่องตามแพทย์สั่ง', source: 'new', quantityDispensed: 0, drugType: 'GPO' },
      { id: 'i-9', name: 'Atorvastatin 10 mg', dosePerTake: '1', unit: 'เม็ด', frequency: 'วันละ 1 ครั้ง', when: 'ก่อนนอน', quantity: 30, instructions: 'ยานอกบัญชี — ตรวจสอบสิทธิก่อนจ่าย', source: 'new', quantityDispensed: 0, drugType: 'TPU' },
    ],
  },
  {
    /* Demonstrates the CDSS-style checks that have no natural trigger
       among the other seed rows: drug interaction (Enalapril +
       Spironolactone — hyperkalemia risk), duplicate drug (Paracetamol
       listed twice), and High Alert Drug (Enalapril). */
    id: 'ph-007', queueNo: 'P-018', hn: '67-00004', issuedAt: '09:40',
    status: DISPENSE_STATUS.WAITING, queueType: 'general',
    diagnosis: { icd10: 'I10', name: 'ความดันโลหิตสูง' },
    vitalsSnapshot: { bp: '148/92', hr: '78', temp: '36.7', weight: '64' },
    nurseNote: 'วัดความดันซ้ำ 2 ครั้งห่างกัน 5 นาที ยืนยันค่าสูงทั้งสองครั้ง ผู้ป่วยไม่มีอาการเวียนศีรษะหรือแน่นหน้าอก',
    orderChanged: null,
    verifiedBy: null, verifiedAt: null, verificationLog: [],
    pharmacistNotes: [], counselingLog: [],
    noShow: false, noShowReason: '',
    problemFlag: false, problemReason: '',
    deliveryMethod: 'pickup', deliveryAddress: null,
    paymentStatus: PAYMENT_STATUS.NOT_APPLICABLE,
    ownMedications: [], medErrors: [],
    items: [
      { id: 'i-10', name: 'Enalapril 5 mg', dosePerTake: '1', unit: 'เม็ด', frequency: 'วันละ 1 ครั้ง', when: 'เช้า', quantity: 30, instructions: 'รับประทานต่อเนื่องตามแพทย์สั่ง', source: 'new', quantityDispensed: 0, drugType: 'GPO' },
      { id: 'i-11', name: 'Spironolactone 25 mg', dosePerTake: '1', unit: 'เม็ด', frequency: 'วันละ 1 ครั้ง', when: 'เช้า', quantity: 30, instructions: 'ติดตามระดับโพแทสเซียมเป็นระยะ', source: 'new', quantityDispensed: 0, drugType: 'GPO' },
      { id: 'i-12', name: 'Paracetamol 500 mg', dosePerTake: '1', unit: 'เม็ด', frequency: 'ทุก 6 ชั่วโมงเมื่อมีอาการ', when: 'หลังอาหาร', quantity: 10, instructions: 'รับประทานเมื่อมีไข้หรือปวด', source: 'new', quantityDispensed: 0, drugType: 'GPO' },
      { id: 'i-13', name: 'Paracetamol 500 mg', dosePerTake: '2', unit: 'เม็ด', frequency: 'ทุก 6 ชั่วโมงเมื่อมีอาการ', when: 'หลังอาหาร', quantity: 10, instructions: 'สั่งซ้ำจากอีกคำสั่ง — ตรวจสอบก่อนจ่าย', source: 'new', quantityDispensed: 0, drugType: 'GPU' },
      { id: 'i-14', name: 'Amlodipine 5 mg', dosePerTake: '1', unit: 'เม็ด', frequency: 'วันละ 1 ครั้ง', when: 'เช้า', quantity: 0, instructions: 'ต่อเนื่องจากรายการเดิม — ไม่มีการจ่ายเพิ่มครั้งนี้', source: 'remed', quantityDispensed: 0, drugType: 'GPO' },
    ],
  },
  {
    /* Demonstrates DISPENSE_STATUS.CANCELLED (ToR §1.9.2.10 — ห้องยาต้อง
       ได้รับแจ้งเตือนเมื่อแพทย์ยกเลิกการสั่งยา). */
    id: 'ph-008', queueNo: 'P-019', hn: '67-00006', issuedAt: '09:45',
    status: DISPENSE_STATUS.CANCELLED, queueType: 'general',
    diagnosis: { icd10: 'R51', name: 'ปวดศีรษะ' },
    vitalsSnapshot: { bp: '124/80', hr: '70', temp: '36.6', weight: '60' },
    orderChanged: null,
    orderCancelled: { at: '09:44', note: 'แพทย์ยกเลิกคำสั่งยาทั้งใบ — เปลี่ยนแผนการรักษาเป็นสังเกตอาการโดยไม่ใช้ยา' },
    verifiedBy: null, verifiedAt: null, verificationLog: [],
    pharmacistNotes: [], counselingLog: [],
    noShow: false, noShowReason: '',
    problemFlag: false, problemReason: '',
    deliveryMethod: 'pickup', deliveryAddress: null,
    paymentStatus: PAYMENT_STATUS.NOT_APPLICABLE,
    ownMedications: [], medErrors: [],
    items: [
      { id: 'i-15', name: 'Paracetamol 500 mg', dosePerTake: '1', unit: 'เม็ด', frequency: 'ทุก 6 ชั่วโมงเมื่อมีอาการ', when: 'หลังอาหาร', quantity: 10, instructions: 'ยกเลิกโดยแพทย์', source: 'new', quantityDispensed: 0, drugType: 'GPO' },
    ],
  },
];

/* Filler rows P-020..P-079 — pad the mock queue from 8 hand-authored rows
   out to 68 total (68 ÷ PAGE_SIZE 20 = 4 pages), so the queue table's
   pagination and new sort/filter controls have real depth to exercise.
   Sized so the default "รอเรียก" tab lands on ~32 rows (30 filler past
   `SERVED_CUTOFF` + P-017/P-018 from the manual seed) — a morning-rush
   backlog rather than a handful of rows.
   Cycles through the 14 `mrPatients.js` HNs and a small rotation of
   diagnoses/drugs — only drug names already priced in `SUB_PHARMACY_STOCK`
   and classed in `DRUG_ALLERGY_CLASS`/registry, so stock figures and
   pricing on these rows stay real instead of falling back to "ไม่มีข้อมูล"
   everywhere. Deterministic (index-driven), not random, so the seed is
   stable across reloads. */
const FILLER_HNS = [
  '67-00001', '67-00002', '67-00003', '67-00004', '67-00005',
  '67-00006', '67-00007', '67-00008', '67-00009', '67-00010',
  '67-00026', '67-00027', '67-00028', '67-00029',
];
const FILLER_DIAGNOSES = [
  { icd10: 'J06.9', name: 'การติดเชื้อทางเดินหายใจส่วนบนเฉียบพลัน' },
  { icd10: 'M25.5', name: 'ปวดข้อ (Arthralgia)' },
  { icd10: 'J30.4', name: 'โรคจมูกอักเสบจากภูมิแพ้' },
  { icd10: 'E11.9', name: 'โรคเบาหวานชนิดที่ 2' },
  { icd10: 'K21.0', name: 'โรคกรดไหลย้อน' },
  { icd10: 'E78.5', name: 'ไขมันในเลือดผิดปกติ' },
  { icd10: 'I10',   name: 'ความดันโลหิตสูง' },
  { icd10: 'R51',   name: 'ปวดศีรษะ' },
];
const FILLER_DRUGS = [
  { name: 'Paracetamol 500 mg', unit: 'เม็ด',   dosePerTake: '1', frequency: 'ทุก 6 ชั่วโมงเมื่อมีอาการ', when: 'หลังอาหาร', quantity: 20, instructions: 'รับประทานเมื่อมีไข้หรือปวด',              drugType: 'GPO' },
  { name: 'Amoxicillin 500 mg', unit: 'เม็ด',   dosePerTake: '1', frequency: 'วันละ 3 ครั้ง',           when: 'หลังอาหาร', quantity: 21, instructions: 'รับประทานจนยาหมด แม้อาการดีขึ้น',      drugType: 'GPO' },
  { name: 'Cetirizine 10 mg',   unit: 'เม็ด',   dosePerTake: '1', frequency: 'วันละ 1 ครั้ง',           when: 'ก่อนนอน',   quantity: 10, instructions: 'อาจทำให้ง่วงซึม',                          drugType: 'GPU' },
  { name: 'Metformin 500 mg',   unit: 'เม็ด',   dosePerTake: '1', frequency: 'วันละ 2 ครั้ง',           when: 'หลังอาหาร', quantity: 60, instructions: 'รับประทานต่อเนื่องตามแพทย์สั่ง',         drugType: 'GPO' },
  { name: 'Omeprazole 20 mg',   unit: 'แคปซูล', dosePerTake: '1', frequency: 'วันละ 1 ครั้ง',           when: 'ก่อนอาหารเช้า', quantity: 14, instructions: 'รับประทานก่อนอาหาร 30 นาที',        drugType: 'GPO' },
  { name: 'Atorvastatin 20 mg', unit: 'เม็ด',   dosePerTake: '1', frequency: 'วันละ 1 ครั้ง',           when: 'ก่อนนอน',   quantity: 30, instructions: 'รับประทานต่อเนื่องตามแพทย์สั่ง',         drugType: 'GPO' },
  { name: 'Enalapril 5 mg',     unit: 'เม็ด',   dosePerTake: '1', frequency: 'วันละ 1 ครั้ง',           when: 'เช้า',       quantity: 30, instructions: 'รับประทานต่อเนื่องตามแพทย์สั่ง',         drugType: 'GPO' },
  { name: 'Amlodipine 5 mg',    unit: 'เม็ด',   dosePerTake: '1', frequency: 'วันละ 1 ครั้ง',           when: 'เช้า',       quantity: 30, instructions: 'รับประทานต่อเนื่องตามแพทย์สั่ง',         drugType: 'GPO' },
];

/* Build 2–4 line items per prescription so history / queue mock looks like
   real multi-drug scripts (not a single Paracetamol every time). */
const buildFillerItems = (startIdx, count, idPrefix, {
  quantityScale = 1,
  dispensed = false,
} = {}) => {
  const n = Math.max(1, Math.min(count, FILLER_DRUGS.length));
  return Array.from({ length: n }, (_, j) => {
    const drug = FILLER_DRUGS[(startIdx + j) % FILLER_DRUGS.length];
    const quantity = Math.max(1, Math.round(drug.quantity * quantityScale));
    return {
      id: `${idPrefix}-${j}`,
      name: drug.name,
      dosePerTake: drug.dosePerTake,
      unit: drug.unit,
      frequency: drug.frequency,
      when: drug.when,
      quantity,
      quantityDispensed: dispensed ? quantity : 0,
      instructions: drug.instructions,
      source: j === 0 ? 'new' : (j % 2 === 0 ? 'new' : 'remed'),
      drugType: drug.drugType,
    };
  });
};
/* Front-of-queue rows have already been dealt with (a realistic FIFO
   pharmacy queue serves earlier arrivals first); only the tail is still
   `WAITING`. `SERVED_STATUS_CYCLE` covers the first `SERVED_CUTOFF` rows —
   mostly dispensed/called/preparing, with NO_SHOW/PROBLEM sprinkled in as
   already-resolved exceptions — never `WAITING`. Everything from
   `SERVED_CUTOFF` onward is `WAITING`, so "first queues called, last
   queues still waiting" holds by construction instead of by chance. */
const SERVED_CUTOFF = 30;
const SERVED_STATUS_CYCLE = [
  DISPENSE_STATUS.DISPENSED, DISPENSE_STATUS.DISPENSED, DISPENSE_STATUS.CALLED,
  DISPENSE_STATUS.PREPARING, DISPENSE_STATUS.DISPENSED, DISPENSE_STATUS.PARTIAL,
  DISPENSE_STATUS.CALLED, DISPENSE_STATUS.DISPENSED, DISPENSE_STATUS.NO_SHOW,
  DISPENSE_STATUS.DISPENSED, DISPENSE_STATUS.PREPARING, DISPENSE_STATUS.CALLED,
  DISPENSE_STATUS.DISPENSED, DISPENSE_STATUS.PROBLEM, DISPENSE_STATUS.DISPENSED,
];
const FILLER_QUEUE_TYPES = ['general', 'general', 'general', 'urgent', 'few'];
const FILLER_PAYMENTS = [PAYMENT_STATUS.NOT_APPLICABLE, PAYMENT_STATUS.NOT_APPLICABLE, PAYMENT_STATUS.UNPAID, PAYMENT_STATUS.PAID];

const FILLER_COUNT = 60;
const FILLER_SEED = Array.from({ length: FILLER_COUNT }, (_, i) => {
  const n = i + 20; // continues P-012..P-019 → P-020..P-079
  const hn = FILLER_HNS[i % FILLER_HNS.length];
  const diagnosis = FILLER_DIAGNOSES[i % FILLER_DIAGNOSES.length];
  const status = i < SERVED_CUTOFF
    ? SERVED_STATUS_CYCLE[i % SERVED_STATUS_CYCLE.length]
    : DISPENSE_STATUS.WAITING;
  const queueType = FILLER_QUEUE_TYPES[i % FILLER_QUEUE_TYPES.length];
  const paymentStatus = FILLER_PAYMENTS[i % FILLER_PAYMENTS.length];
  /* 8 rows per hour keeps all 60 filler prescriptions inside a plausible
     09:00-16:49 clinic day instead of spilling past closing time. */
  const hour = 9 + Math.floor(i / 8);
  const minute = (i % 8) * 7;
  const issuedAt = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const wasCalled = [DISPENSE_STATUS.CALLED, DISPENSE_STATUS.PREPARING, DISPENSE_STATUS.DISPENSED, DISPENSE_STATUS.PARTIAL].includes(status);
  const wasDispensed = status === DISPENSE_STATUS.DISPENSED;
  const itemCount = 2 + (i % 3); /* 2–4 drugs per script */
  return {
    id: `ph-f${n}`, queueNo: `P-0${n}`, hn, issuedAt,
    status, queueType,
    diagnosis,
    vitalsSnapshot: { bp: '120/80', hr: '76', temp: '36.6', weight: '65' },
    orderChanged: null,
    ...(wasCalled ? { calledAt: issuedAt } : {}),
    ...(wasDispensed ? { dispensedAt: issuedAt } : {}),
    verifiedBy: null, verifiedAt: null, verificationLog: [],
    pharmacistNotes: [], counselingLog: [],
    noShow: status === DISPENSE_STATUS.NO_SHOW,
    noShowReason: status === DISPENSE_STATUS.NO_SHOW ? 'รอเกิน 3 วัน' : '',
    problemFlag: status === DISPENSE_STATUS.PROBLEM,
    problemReason: status === DISPENSE_STATUS.PROBLEM ? 'ลายมือแพทย์อ่านไม่ออก' : '',
    deliveryMethod: 'pickup', deliveryAddress: null,
    paymentStatus,
    ownMedications: [], medErrors: [],
    items: buildFillerItems(i, itemCount, `i-f${n}`, { dispensed: wasDispensed }),
  };
});

const SEED = [...MANUAL_SEED, ...FILLER_SEED];

/* ข้อมูลประกอบการจ่ายยา (ToR §1.9.4.2) — joined live via
   `getPharmacySupportingInfo` (treatment / consult / lab / xray /
   appointment). Per-row overrides below are fallbacks when the live join
   returns null for that field (e.g. Spironolactone kidney-consult demo). */
const SUPPORTING_INFO_OVERRIDES = {
  'P-018': {
    consultHistory: 'ส่งปรึกษาอายุรกรรมโรคไต 2 สัปดาห์ก่อน (ประเมินการทำงานของไตก่อนเริ่ม Spironolactone)',
    radiologyResults: null,
  },
};
export const PHARMACY_QUEUE = SEED.map((row) => ({
  ...row,
  patientName: patientName(row.hn),
  /* VN (Visit Number) — same value the OPD screening queue shows for this
     patient (both read `patientProfiles.js`'s `vn` field — see
     `getVnByHn`'s doc comment). */
  vn: getVnByHn(row.hn),
  /* วันที่ออกใบสั่งยา — the mock only carries one day of seed data (resets
     on reload), so this is always "today"; kept as an explicit field
     (rather than derived) so PharmacyReportsPage's date-range filter has a
     real field to filter against once/if multi-day data exists. */
  issuedDate: TODAY,
  outOfRightsDocAttached: false,
  supportingInfo: getPharmacySupportingInfo(row.hn, SUPPORTING_INFO_OVERRIDES[row.queueNo]),
  items: row.items.map((it) => ({ ...it, prepared: false, auxLabels: AUX_LABEL_DEFAULTS[it.name] || [], refillPlan: null })),
}));

/* §1.9.6.8 "สามารถดูสถิติการใช้ยาแต่ละประเภทได้" — `PHARMACY_QUEUE` above is
   only ever "today" (resets on reload), so PharmacyReportsPage's date-range
   filter had nothing to show for any other day. This backfills the past 6
   days as already-closed (DISPENSED) records — kept in a separate array
   rather than merged into `PHARMACY_QUEUE` itself, since that array also
   backs the LIVE queue board (PharmacyQueuePage) and patient med-history popup,
   neither of which should show old closed prescriptions mixed into "today".
   PharmacyReportsPage is the only reader, via `PHARMACY_USAGE_HISTORY`.
   Quantity is scaled per day by `DAILY_VOLUME_FACTOR` (not a flat repeat) so
   a multi-day range in the report shows a real day-to-day usage trend. */
const dayIso = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};
const DAILY_VOLUME_FACTOR = [0.65, 0.85, 1.15, 0.95, 1.3, 0.75]; // days -1..-6, oldest last
const HISTORY_VERIFIERS = [CURRENT_CLINICAL_PHARMACIST.name, CURRENT_DISPENSER.name];

export const PHARMACY_USAGE_HISTORY = DAILY_VOLUME_FACTOR.flatMap((factor, dayIdx) => {
  const daysAgo = dayIdx + 1;
  const issuedDate = dayIso(daysAgo);
  const rowsToday = Math.max(3, Math.round(FILLER_DRUGS.length * 2 * factor));
  return Array.from({ length: rowsToday }, (_, i) => {
    const hn = FILLER_HNS[(dayIdx * 7 + i) % FILLER_HNS.length];
    const hour = 8 + (i % 8);
    const minute = (i % 6) * 10;
    const issuedAt = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const itemCount = 2 + ((dayIdx + i) % 3); /* 2–4 drugs per past script */
    return {
      id: `ph-h${dayIdx}-${i}`, queueNo: `H-${daysAgo}-${String(i + 1).padStart(2, '0')}`,
      hn, vn: getVnByHn(hn), patientName: patientName(hn), issuedAt, issuedDate,
      dispensedAt: issuedAt, status: DISPENSE_STATUS.DISPENSED,
      verifiedBy: HISTORY_VERIFIERS[i % HISTORY_VERIFIERS.length],
      items: buildFillerItems(dayIdx * 3 + i, itemCount, `i-h${dayIdx}-${i}`, {
        quantityScale: factor,
        dispensed: true,
      }),
    };
  });
});

export const findPharmacyRowByQueueNo = (queueNo) =>
  PHARMACY_QUEUE.find((r) => r.queueNo === queueNo) || null;

/* Mutates a row in place (module-level, like `SUB_PHARMACY_STOCK`'s
   `deductStock`) so status changes made on the dispense page are still
   visible when the queue page remounts after `history.push` navigates
   back — there is no shared store/context wiring these two pages
   together, only this in-memory array both read from. */
export const updatePharmacyRow = (queueNo, patch) => {
  const row = findPharmacyRowByQueueNo(queueNo);
  if (row) Object.assign(row, patch);
  return row;
};

/* ยกเลิกคำสั่งยา (ToR §1.9.2.10 "แจ้งเตือนห้องยาเมื่อแพทย์มีการแก้ไขหรือ
   ยกเลิกการสั่งยา") — makes DISPENSE_STATUS.CANCELLED a first-class,
   fully-triggerable terminal state, mirroring the existing `orderChanged`
   edit-notice field but for a full cancellation. */
export const cancelPharmacyOrder = (queueNo, note) => {
  const row = findPharmacyRowByQueueNo(queueNo);
  if (!row) return null;
  const at = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  const entry = { at, note };
  Object.assign(row, { status: DISPENSE_STATUS.CANCELLED, orderCancelled: entry });
  return entry;
};

let noteSeq = 0;
export const appendPharmacistNote = (queueNo, note, by = CURRENT_CLINICAL_PHARMACIST.name) => {
  const row = findPharmacyRowByQueueNo(queueNo);
  if (!row) return null;
  const entry = { id: `pn-${++noteSeq}`, by, note, at: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) };
  row.pharmacistNotes = [entry, ...row.pharmacistNotes];
  return entry;
};

let counselingSeq = 0;
export const appendCounselingNote = (queueNo, note, by = CURRENT_DISPENSER.name) => {
  const row = findPharmacyRowByQueueNo(queueNo);
  if (!row) return null;
  const entry = { id: `cn-${++counselingSeq}`, by, note, at: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) };
  row.counselingLog = [entry, ...row.counselingLog];
  return entry;
};

let verifySeq = 0;
export const verifyPrescription = (queueNo, note = '', actor = CURRENT_CLINICAL_PHARMACIST.name) => {
  const row = findPharmacyRowByQueueNo(queueNo);
  if (!row) return null;
  const at = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  const entry = { id: `vl-${++verifySeq}`, actor, action: 'ตรวจสอบคำสั่งใช้ยา', note, at };
  row.verifiedBy = actor;
  row.verifiedAt = at;
  row.verificationLog = [entry, ...row.verificationLog];
  return entry;
};

let medErrorSeq = 0;
export const logMedError = (queueNo, description, severity = 'medium') => {
  const row = findPharmacyRowByQueueNo(queueNo);
  if (!row) return null;
  const entry = { id: `me-${++medErrorSeq}`, description, severity, by: CURRENT_DISPENSER.name, at: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) };
  row.medErrors = [entry, ...row.medErrors];
  return entry;
};

let ownMedSeq = 0;
/* §1.9.5.9 — "บันทึกรายการยาที่ผู้รับบริการนำมาเองได้ ทั้งยาที่มีและไม่มีใน
   สำนักอนามัย": `inFormulary` records whether the drug the patient brought
   in is one the health center itself stocks. */
export const addOwnMedication = (queueNo, name, note = '', inFormulary = true) => {
  const row = findPharmacyRowByQueueNo(queueNo);
  if (!row) return null;
  const entry = { id: `om-${++ownMedSeq}`, name, note, inFormulary };
  row.ownMedications = [...row.ownMedications, entry];
  return entry;
};

export const removeOwnMedication = (queueNo, entryId) => {
  const row = findPharmacyRowByQueueNo(queueNo);
  if (!row) return;
  row.ownMedications = row.ownMedications.filter((m) => m.id !== entryId);
};

/* จัดยา checklist (ToR §1.9.3 "บันทึกสถานะการจัด และตรวจสอบรายการยาได้") —
   per-item "ตรวจสอบแล้ว" toggle, gating the PREPARING status transition. */
export const toggleItemPrepared = (queueNo, itemId) => {
  const row = findPharmacyRowByQueueNo(queueNo);
  if (!row) return;
  row.items = row.items.map((it) => (it.id === itemId ? { ...it, prepared: !it.prepared } : it));
};

/* ฉลากช่วย (ToR §1.9.2.11) — toggle one auxiliary-label phrase on/off for
   a given item. */
export const toggleAuxLabel = (queueNo, itemId, label) => {
  const row = findPharmacyRowByQueueNo(queueNo);
  if (!row) return;
  row.items = row.items.map((it) => {
    if (it.id !== itemId) return it;
    const has = (it.auxLabels || []).includes(label);
    return { ...it, auxLabels: has ? it.auxLabels.filter((l) => l !== label) : [...(it.auxLabels || []), label] };
  });
};

/* แนบเอกสารประกอบการสั่งยานอกสิทธิ (ToR §1.9.2.9). */
export const setOutOfRightsDocAttached = (queueNo, attached) => {
  updatePharmacyRow(queueNo, { outOfRightsDocAttached: attached });
};

/* สถานะการชำระเงิน (ToR §1.9.5.2). */
export const setPaymentStatus = (queueNo, status) => {
  updatePharmacyRow(queueNo, { paymentStatus: status });
};

/* Per-line-item add/edit/delete on the medication table — the legacy
   ระบบงานห้องจ่ายยา manual (คู่มือระบบงานห้องจ่ายยาและบริหารเวชภัณฑ์ §2.1.1)
   does this at the same screen: double-click a row to edit its usage, add
   a new line by searching a drug name, delete via checkbox, with a "?"
   marker on any row that conflicts with the patient's allergies/chronic
   conditions/pregnancy/interactions. `updatePharmacyItem` is what lets a
   pharmacist substitute a conflicting drug for a different one (change
   `name`/`unit`/dose fields on an existing line) instead of only being
   able to zero its dispense-now quantity. */
let itemSeq = 0;
export const addPharmacyItem = (queueNo, itemPatch = {}) => {
  const row = findPharmacyRowByQueueNo(queueNo);
  if (!row) return null;
  const entry = {
    id: `item-new-${++itemSeq}`,
    name: '', dosePerTake: '1', unit: 'เม็ด', frequency: '', when: '', quantity: 1,
    instructions: '', source: 'new', quantityDispensed: 0, drugType: 'GPO', prepared: false, auxLabels: [], refillPlan: null,
    ...itemPatch,
  };
  row.items = [...row.items, entry];
  return entry;
};

export const updatePharmacyItem = (queueNo, itemId, patch) => {
  const row = findPharmacyRowByQueueNo(queueNo);
  if (!row) return;
  row.items = row.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it));
};

export const removePharmacyItem = (queueNo, itemId) => {
  const row = findPharmacyRowByQueueNo(queueNo);
  if (!row) return;
  row.items = row.items.filter((it) => it.id !== itemId);
};

/* แบ่งจ่ายยาเป็นงวด (Refill — ToR §1.9.4.5) — splits an item's remaining
   quantity across `visits` future pickups, `intervalDays` apart. The
   first visit is immediately "due" (today's dispense IS visit 1); later
   visits become "due" one at a time as the previous one is picked up. */
export const createRefillPlan = (queueNo, itemId, { visits = 2, intervalDays = 14 } = {}) => {
  const row = findPharmacyRowByQueueNo(queueNo);
  if (!row) return null;
  const item = row.items.find((it) => it.id === itemId);
  if (!item) return null;
  const remaining = item.quantity - (item.quantityDispensed || 0);
  const perVisit = Math.ceil(remaining / visits);
  let seq = 0;
  const planVisits = Array.from({ length: visits }, (_, i) => {
    const qty = Math.max(0, Math.min(perVisit, remaining - perVisit * i));
    return {
      id: `refill-${itemId}-${++seq}`,
      visitNo: i + 1,
      scheduledDate: addDays(TODAY, intervalDays * i),
      quantity: qty,
      status: i === 0 ? 'due' : 'scheduled',
      pickedUpAt: null,
    };
  });
  const plan = { intervalDays, visits: planVisits };
  row.items = row.items.map((it) => (it.id === itemId ? { ...it, refillPlan: plan } : it));
  return plan;
};

export const markRefillVisitPickedUp = (queueNo, itemId, visitId) => {
  const row = findPharmacyRowByQueueNo(queueNo);
  if (!row) return;
  row.items = row.items.map((it) => {
    if (it.id !== itemId || !it.refillPlan) return it;
    const visits = it.refillPlan.visits.map((v) => (v.id === visitId ? { ...v, status: 'picked_up', pickedUpAt: TODAY } : v));
    const nextIdx = visits.findIndex((v) => v.id === visitId) + 1;
    if (nextIdx < visits.length && visits[nextIdx].status === 'scheduled') visits[nextIdx] = { ...visits[nextIdx], status: 'due' };
    return { ...it, refillPlan: { ...it.refillPlan, visits } };
  });
};

/* การเชื่อมต่อข้อมูล (ToR §1.9.11.1 "เชื่อมต่อกับระบบการสั่งยา/CPOE/EMR") —
   this app has no real backend, so "connected" means: the doctor's
   treatment-form order entry (Step5Orders' `form.medications` /
   `form.diagnoses`) can push a brand-new row straight into this same
   in-memory `PHARMACY_QUEUE`, the same way a real CPOE→pharmacy message
   would land a fresh prescription in the dispensing queue. Builds the row
   in the fully-expanded shape (`patientName`/`supportingInfo`/per-item
   `prepared`/`auxLabels`/`refillPlan`) that `PHARMACY_QUEUE`'s SEED.map
   normally provides, since a row pushed after module load bypasses that
   one-time transform. */
let pharmacyQueueSeq = PHARMACY_QUEUE.length;
export const sendPrescriptionToPharmacy = (visit) => {
  const { hn, diagnoses = [], medications = [], vitals } = visit || {};
  if (!hn || medications.length === 0) return null;

  const maxNo = PHARMACY_QUEUE.reduce((max, r) => {
    const n = Number(String(r.queueNo).replace(/^P-/, ''));
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  const queueNo = `P-${String(maxNo + 1).padStart(3, '0')}`;
  const principleDx = diagnoses.find((d) => d.type === 'principle') || diagnoses[0] || null;

  const row = {
    id: `ph-${++pharmacyQueueSeq}`,
    queueNo,
    hn,
    vn: getVnByHn(hn),
    patientName: patientName(hn),
    issuedAt: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    issuedDate: TODAY,
    status: DISPENSE_STATUS.WAITING,
    queueType: 'general',
    diagnosis: { icd10: principleDx?.code || '', name: principleDx?.name || '' },
    vitalsSnapshot: {
      bp: vitals?.bp ?? '-', hr: vitals?.hr ?? '-', temp: vitals?.temp ?? '-', weight: vitals?.weight ?? '-',
    },
    orderChanged: null,
    orderCancelled: null,
    verifiedBy: null, verifiedAt: null, verificationLog: [],
    pharmacistNotes: [], counselingLog: [],
    noShow: false, noShowReason: '',
    problemFlag: false, problemReason: '',
    deliveryMethod: 'pickup', deliveryAddress: null,
    paymentStatus: PAYMENT_STATUS.NOT_APPLICABLE,
    outOfRightsDocAttached: false,
    supportingInfo: getPharmacySupportingInfo(hn),
    ownMedications: [], medErrors: [],
    items: medications.map((m, i) => ({
      id: `item-cpoe-${queueNo}-${i}`,
      name: m.name,
      dosePerTake: m.dosePerTake || '1',
      unit: m.unit || 'เม็ด',
      frequency: m.frequency || '',
      when: m.when || '',
      quantity: m.quantity ?? 1,
      instructions: m.purpose || m.warning || '',
      source: 'new',
      quantityDispensed: 0,
      drugType: 'GPO',
      prepared: false,
      auxLabels: AUX_LABEL_DEFAULTS[m.name] || [],
      refillPlan: null,
    })),
  };
  PHARMACY_QUEUE.push(row);
  return row;
};
