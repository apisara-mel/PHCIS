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
  { key: 'external', label: 'ยานอก'      },
  { key: 'general',  label: 'ยาทั่วไป'    },
];

/* Taken verbatim from the ToR's own wording ("ลำดับ GPO GPU TPU ชื่อยา/
   เวชภัณฑ์...") — a drug-source classification the spec names but doesn't
   further define; modeled as a plain enum. */
export const DRUG_TYPES = ['GPO', 'GPU', 'TPU'];

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

/* ── Two-tier warehouse (ToR §1.9.6-1.9.9) ──────────────────────────────
   คลังยาใหญ่ (main, per-center bulk store) → เบิกจ่าย (requisition) →
   คลังยาย่อย (sub-pharmacy counter stock, what dispensing actually draws
   from). Each stock entry carries a lot + expiry so "near-expiry" (3-6
   months) views have real dates to filter against. */
const addMonths = (date, n) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
};
const TODAY = new Date().toISOString().slice(0, 10);

export const SUB_PHARMACY_STOCK = {
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

export const MAIN_WAREHOUSE_STOCK = {
  'Amoxicillin 500 mg':  { stock: 3000, unit: 'เม็ด', unitPrice: 2.5, lot: 'LOT-AMX-MAIN-24', expiryDate: addMonths(TODAY, 10), receivedFrom: 'องค์การเภสัชกรรม (GPO)', receivedAt: addMonths(TODAY, -2) },
  'Paracetamol 500 mg':  { stock: 8000, unit: 'เม็ด', unitPrice: 0.8, lot: 'LOT-PCM-MAIN-24', expiryDate: addMonths(TODAY, 22), receivedFrom: 'องค์การเภสัชกรรม (GPO)', receivedAt: addMonths(TODAY, -1) },
  'Ibuprofen 400 mg':    { stock: 200,  unit: 'เม็ด', unitPrice: 1.8, lot: 'LOT-IBU-MAIN-24', expiryDate: addMonths(TODAY, 5),  receivedFrom: 'บริษัท ฟาร์มา จำกัด', receivedAt: addMonths(TODAY, -3) },
  'Metformin 500 mg':    { stock: 5000, unit: 'เม็ด', unitPrice: 0.9, lot: 'LOT-MET-MAIN-24', expiryDate: addMonths(TODAY, 16), receivedFrom: 'องค์การเภสัชกรรม (GPO)', receivedAt: addMonths(TODAY, -2) },
  'Omeprazole 20 mg':    { stock: 1500, unit: 'แคปซูล', unitPrice: 3.5, lot: 'LOT-OME-MAIN-24', expiryDate: addMonths(TODAY, 8), receivedFrom: 'องค์การเภสัชกรรม (GPO)', receivedAt: addMonths(TODAY, -4) },
};

export const getStock = (name) => SUB_PHARMACY_STOCK[name] ?? null;
export const getMainStock = (name) => MAIN_WAREHOUSE_STOCK[name] ?? null;

/** True when every item in the list has enough sub-pharmacy stock to dispense. */
export const hasSufficientStock = (items = []) =>
  items.every((item) => {
    const entry = SUB_PHARMACY_STOCK[item.name];
    return !entry || item.quantity <= entry.stock;
  });

/* Mutates the in-memory stock map — module-level, resets on reload (same
   ephemerality as every other mock store in this app). Deducts only the
   `qty` actually handed out (supports partial/refill dispensing). */
export const deductStock = (items = [], qtyKey = 'quantity') => {
  items.forEach((item) => {
    const entry = SUB_PHARMACY_STOCK[item.name];
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

/* ── Requisition (เบิกจ่ายยา/เวชภัณฑ์) + receiving (รับยาเข้าคลังใหญ่) —
   ToR §1.9.6-1.9.7. Mock records + mutators; a single-facility stand-in
   for what would otherwise be a live multi-center warehouse network. */
export const REQUISITIONS = [
  { id: 'req-001', requisitionNo: 'RQ-2026-0142', drugName: 'Amoxicillin 500 mg', quantity: 500, unit: 'เม็ด', requestedBy: CURRENT_DISPENSER.name, requestedAt: addMonths(TODAY, 0), status: 'pending' },
  { id: 'req-002', requisitionNo: 'RQ-2026-0141', drugName: 'Ibuprofen 400 mg',   quantity: 300, unit: 'เม็ด', requestedBy: CURRENT_DISPENSER.name, requestedAt: addMonths(TODAY, 0), status: 'approved' },
  { id: 'req-003', requisitionNo: 'RQ-2026-0130', drugName: 'Paracetamol 500 mg', quantity: 1000, unit: 'เม็ด', requestedBy: CURRENT_DISPENSER.name, requestedAt: addMonths(TODAY, -1), status: 'fulfilled' },
];

export const RECEIVING_RECORDS = [
  { id: 'rcv-001', receiptNo: 'RCV-2026-0088', drugName: 'Paracetamol 500 mg', quantity: 1000, unit: 'เม็ด', lot: 'LOT-PCM-MAIN-24', expiryDate: addMonths(TODAY, 22), receivedFrom: 'องค์การเภสัชกรรม (GPO)', receivedAt: addMonths(TODAY, -1), receivedBy: CURRENT_DISPENSER.name },
  { id: 'rcv-002', receiptNo: 'RCV-2026-0087', drugName: 'Metformin 500 mg',   quantity: 5000, unit: 'เม็ด', lot: 'LOT-MET-MAIN-24', expiryDate: addMonths(TODAY, 16), receivedFrom: 'องค์การเภสัชกรรม (GPO)', receivedAt: addMonths(TODAY, -2), receivedBy: CURRENT_DISPENSER.name },
];

/* ยืม-คืนยาระหว่างศูนย์ (ToR §1.9.9) — borrow/return between health centers. */
export const BORROW_RETURN_RECORDS = [
  { id: 'br-001', type: 'borrow', drugName: 'Ibuprofen 400 mg', quantity: 100, unit: 'เม็ด', counterpartCenter: 'ศูนย์บริการสาธารณสุข 3 บางซื่อ', requestedAt: addMonths(TODAY, 0), status: 'pending' },
  { id: 'br-002', type: 'return', drugName: 'Omeprazole 20 mg', quantity: 50,  unit: 'แคปซูล', counterpartCenter: 'ศูนย์บริการสาธารณสุข 7 บุคคโล', requestedAt: addMonths(TODAY, -1), status: 'completed' },
];

let requisitionSeq = REQUISITIONS.length;
export const createRequisition = ({ drugName, quantity, unit }) => {
  const rq = {
    id: `req-${++requisitionSeq}`,
    requisitionNo: `RQ-2026-${String(200 + requisitionSeq).padStart(4, '0')}`,
    drugName, quantity, unit,
    requestedBy: CURRENT_DISPENSER.name,
    requestedAt: TODAY,
    status: 'pending',
  };
  REQUISITIONS.unshift(rq);
  return rq;
};

let receivingSeq = RECEIVING_RECORDS.length;
export const createReceivingRecord = ({ drugName, quantity, unit, lot, expiryDate, receivedFrom }) => {
  const rcv = {
    id: `rcv-${++receivingSeq}`,
    receiptNo: `RCV-2026-${String(100 + receivingSeq).padStart(4, '0')}`,
    drugName, quantity, unit, lot, expiryDate, receivedFrom,
    receivedAt: TODAY,
    receivedBy: CURRENT_DISPENSER.name,
  };
  RECEIVING_RECORDS.unshift(rcv);
  const entry = MAIN_WAREHOUSE_STOCK[drugName];
  if (entry) entry.stock += quantity;
  return rcv;
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
const SEED = [
  {
    id: 'ph-001', queueNo: 'P-012', hn: '67-00001', issuedAt: '09:05',
    status: DISPENSE_STATUS.WAITING, queueType: 'general',
    diagnosis: { icd10: 'J06.9', name: 'การติดเชื้อทางเดินหายใจส่วนบนเฉียบพลัน' },
    vitalsSnapshot: { bp: '128/82', hr: '76', temp: '37.4', weight: '68' },
    orderChanged: null,
    verifiedBy: null, verifiedAt: null, verificationLog: [],
    pharmacistNotes: [], counselingLog: [],
    noShow: false, noShowReason: '',
    problemFlag: false, problemReason: '',
    deliveryMethod: 'pickup', deliveryAddress: null,
    ownMedications: [], medErrors: [],
    items: [
      { id: 'i-1', name: 'Amoxicillin 500 mg', dosePerTake: '1', unit: 'เม็ด', frequency: 'วันละ 3 ครั้ง', when: 'หลังอาหาร', quantity: 21, instructions: 'รับประทานจนยาหมด แม้อาการดีขึ้น', source: 'new', quantityDispensed: 0, drugType: 'GPO' },
      { id: 'i-2', name: 'Paracetamol 500 mg', dosePerTake: '1', unit: 'เม็ด', frequency: 'ทุก 6 ชั่วโมงเมื่อมีอาการ', when: 'หลังอาหาร', quantity: 20, instructions: 'รับประทานเมื่อมีไข้หรือปวด', source: 'new', quantityDispensed: 0, drugType: 'GPO' },
    ],
  },
  {
    id: 'ph-002', queueNo: 'P-013', hn: '67-00009', issuedAt: '09:12',
    status: DISPENSE_STATUS.WAITING, queueType: 'urgent',
    diagnosis: { icd10: 'M25.5', name: 'ปวดข้อ (Arthralgia)' },
    vitalsSnapshot: { bp: '138/88', hr: '82', temp: '36.9', weight: '54' },
    orderChanged: null,
    verifiedBy: null, verifiedAt: null, verificationLog: [],
    pharmacistNotes: [], counselingLog: [],
    noShow: false, noShowReason: '',
    problemFlag: false, problemReason: '',
    deliveryMethod: 'pickup', deliveryAddress: null,
    ownMedications: [], medErrors: [],
    items: [
      { id: 'i-3', name: 'Ibuprofen 400 mg', dosePerTake: '1', unit: 'เม็ด', frequency: 'วันละ 2 ครั้ง', when: 'หลังอาหารทันที', quantity: 10, instructions: 'งดใช้ร่วมกับยาแก้ปวดกลุ่มเดียวกัน', source: 'new', quantityDispensed: 0, drugType: 'TPU' },
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
    ownMedications: [{ id: 'om-1', name: 'Vitamin B Complex', note: 'ผู้ป่วยรับประทานเองประจำ ไม่ได้มาจากศูนย์' }],
    medErrors: [],
    items: [
      { id: 'i-4', name: 'Paracetamol 500 mg', dosePerTake: '1', unit: 'เม็ด', frequency: 'ทุก 6 ชั่วโมงเมื่อมีอาการ', when: 'หลังอาหาร', quantity: 20, instructions: 'รับประทานเมื่อมีไข้หรือปวด', source: 'new', quantityDispensed: 0, drugType: 'GPO' },
      { id: 'i-5', name: 'Cetirizine 10 mg', dosePerTake: '1', unit: 'เม็ด', frequency: 'วันละ 1 ครั้ง', when: 'ก่อนนอน', quantity: 10, instructions: 'อาจทำให้ง่วงซึม', source: 'remed', quantityDispensed: 0, drugType: 'GPU' },
    ],
  },
  {
    id: 'ph-004', queueNo: 'P-015', hn: '67-00003', issuedAt: '09:24',
    status: DISPENSE_STATUS.WAITING, queueType: 'general',
    diagnosis: { icd10: 'E11.9', name: 'โรคเบาหวานชนิดที่ 2' },
    vitalsSnapshot: { bp: '132/84', hr: '80', temp: '36.6', weight: '77' },
    orderChanged: { at: '09:18', note: 'แพทย์แก้ไขความถี่ยาเป็นวันละ 2 ครั้ง (เดิมวันละ 1 ครั้ง)' },
    verifiedBy: null, verifiedAt: null, verificationLog: [],
    pharmacistNotes: [], counselingLog: [],
    noShow: false, noShowReason: '',
    problemFlag: false, problemReason: '',
    deliveryMethod: 'pickup', deliveryAddress: null,
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
    ownMedications: [], medErrors: [],
    items: [
      { id: 'i-7', name: 'Omeprazole 20 mg', dosePerTake: '1', unit: 'แคปซูล', frequency: 'วันละ 1 ครั้ง', when: 'ก่อนอาหารเช้า', quantity: 14, instructions: 'รับประทานก่อนอาหาร 30 นาที', source: 'new', quantityDispensed: 14, drugType: 'GPO' },
    ],
  },
  {
    id: 'ph-006', queueNo: 'P-017', hn: '67-00007', issuedAt: '09:33',
    status: DISPENSE_STATUS.WAITING, queueType: 'external',
    diagnosis: { icd10: 'E78.5', name: 'ไขมันในเลือดผิดปกติ' },
    vitalsSnapshot: { bp: '140/90', hr: '84', temp: '36.8', weight: '82' },
    orderChanged: null,
    verifiedBy: null, verifiedAt: null, verificationLog: [],
    pharmacistNotes: [], counselingLog: [],
    noShow: false, noShowReason: '',
    problemFlag: false, problemReason: '',
    deliveryMethod: 'pickup', deliveryAddress: null,
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
    orderChanged: null,
    verifiedBy: null, verifiedAt: null, verificationLog: [],
    pharmacistNotes: [], counselingLog: [],
    noShow: false, noShowReason: '',
    problemFlag: false, problemReason: '',
    deliveryMethod: 'pickup', deliveryAddress: null,
    ownMedications: [], medErrors: [],
    items: [
      { id: 'i-10', name: 'Enalapril 5 mg', dosePerTake: '1', unit: 'เม็ด', frequency: 'วันละ 1 ครั้ง', when: 'เช้า', quantity: 30, instructions: 'รับประทานต่อเนื่องตามแพทย์สั่ง', source: 'new', quantityDispensed: 0, drugType: 'GPO' },
      { id: 'i-11', name: 'Spironolactone 25 mg', dosePerTake: '1', unit: 'เม็ด', frequency: 'วันละ 1 ครั้ง', when: 'เช้า', quantity: 30, instructions: 'ติดตามระดับโพแทสเซียมเป็นระยะ', source: 'new', quantityDispensed: 0, drugType: 'GPO' },
      { id: 'i-12', name: 'Paracetamol 500 mg', dosePerTake: '1', unit: 'เม็ด', frequency: 'ทุก 6 ชั่วโมงเมื่อมีอาการ', when: 'หลังอาหาร', quantity: 10, instructions: 'รับประทานเมื่อมีไข้หรือปวด', source: 'new', quantityDispensed: 0, drugType: 'GPO' },
      { id: 'i-13', name: 'Paracetamol 500 mg', dosePerTake: '2', unit: 'เม็ด', frequency: 'ทุก 6 ชั่วโมงเมื่อมีอาการ', when: 'หลังอาหาร', quantity: 10, instructions: 'สั่งซ้ำจากอีกคำสั่ง — ตรวจสอบก่อนจ่าย', source: 'new', quantityDispensed: 0, drugType: 'GPU' },
    ],
  },
];

/* ข้อมูลประกอบการจ่ายยา (ToR §1.9.4.2) — ประวัติการรักษา/ส่งปรึกษา/ผลตรวจ Lab/
   รังสีวิทยา/นัดหมาย. Like `SPECIAL_WATCH_OVERRIDES` in mrPatients.js, this is
   an override map (keyed by queueNo) applied on top of an empty default, since
   Lab/Radiology/Finance are themselves undeveloped stub modules elsewhere in
   this app (see docs/product-spec.md §10) — there's no live cross-module data
   to pull from, only illustrative examples on a couple of demo rows. */
const SUPPORTING_INFO_OVERRIDES = {
  'P-012': {
    treatmentHistory: 'เคยมารับการรักษาอาการคล้ายกันเมื่อ 3 เดือนก่อน (วินิจฉัย: J06.9)',
    consultHistory: null,
    labResults: null,
    radiologyResults: null,
    appointmentInfo: null,
  },
  'P-018': {
    treatmentHistory: 'ติดตามความดันโลหิตสูงต่อเนื่อง 2 ปี',
    consultHistory: 'ส่งปรึกษาอายุรกรรมโรคไต 2 สัปดาห์ก่อน (ประเมินการทำงานของไตก่อนเริ่ม Spironolactone)',
    labResults: [{ test: 'Serum Potassium (K+)', result: '4.6 mEq/L', flag: 'normal' }, { test: 'Creatinine', result: '1.1 mg/dL', flag: 'normal' }],
    radiologyResults: null,
    appointmentInfo: 'นัดติดตามความดันโลหิตและผลเลือด 26 สิงหาคม 2569',
  },
};
const EMPTY_SUPPORTING_INFO = { treatmentHistory: null, consultHistory: null, labResults: null, radiologyResults: null, appointmentInfo: null };

export const PHARMACY_QUEUE = SEED.map((row) => ({
  ...row,
  patientName: patientName(row.hn),
  outOfRightsDocAttached: false,
  supportingInfo: SUPPORTING_INFO_OVERRIDES[row.queueNo] || EMPTY_SUPPORTING_INFO,
  items: row.items.map((it) => ({ ...it, prepared: false })),
}));

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
export const addOwnMedication = (queueNo, name, note = '') => {
  const row = findPharmacyRowByQueueNo(queueNo);
  if (!row) return null;
  const entry = { id: `om-${++ownMedSeq}`, name, note };
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

/* แนบเอกสารประกอบการสั่งยานอกสิทธิ (ToR §1.9.2.9). */
export const setOutOfRightsDocAttached = (queueNo, attached) => {
  updatePharmacyRow(queueNo, { outOfRightsDocAttached: attached });
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
    instructions: '', source: 'new', quantityDispensed: 0, drugType: 'GPO', prepared: false,
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
