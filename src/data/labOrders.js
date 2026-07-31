import { PATIENT_PROFILES } from '@/data/patientProfiles';

/* Mock data for the `lab` module (src/pages/lab/LabQueuePage.jsx). Not
   wired to a backend — same tier as treatmentQueue.js / pharmacyQueue.js.

   Shaped after the real lab test catalog in treatmentVisits.js
   (APPT_ADVANCE_ORDER_OPTIONS, 'lab' group) and the `labs[]` slice
   TreatmentFormPage Step 5 writes (see product-spec.md §10.2 /
   user-flow.md §9.2 in the MIH-Docs-Vault Obsidian vault). */

/* `category` follows TOR ภาคผนวก ก §1.15.4.10 — "แสดงแถบข้อมูลการขอตรวจตาม
   ประเภท ได้แก่ โลหิตวิทยา น้ำเหลืองวิทยา จุลชีววิทยา และสารเสพติด" (at
   least these 4 disciplines). `chemistry` is an extra bucket beyond the
   TOR-mandated 4 — realistic for a clinical-chemistry-heavy panel set, and
   TOR's "อย่างน้อย" (at least) wording allows more. */
export const LAB_CATEGORIES = [
  { key: 'hematology',   label: 'โลหิตวิทยา' },
  { key: 'chemistry',    label: 'เคมีคลินิก' },
  { key: 'serology',     label: 'น้ำเหลืองวิทยา' },
  { key: 'microbiology', label: 'จุลชีววิทยา' },
  { key: 'toxicology',   label: 'สารเสพติด' },
];

/* `specimen` — TOR §1.15.4.9 "แสดงรายการขอตรวจ แสดงข้อมูล...สิ่งส่งตรวจ...".
   `rangeBySex` / `rangeByAge` — TOR §1.15.3.2 "บันทึกค่าวิกฤตและค่าอ้างอิง
   ของผลตรวจแยกตามเพศ อายุ". Only set on tests where the reference range
   actually differs by sex/age in real practice; everything else falls
   back to the flat `normalRange`. Resolved via `resolveReferenceRange()`. */
export const LAB_TEST_CATALOG = {
  'lab-cbc':         { label: 'ความสมบูรณ์ของเม็ดเลือด (CBC)',      unit: '',      normalRange: '',        category: 'hematology',   specimen: 'เลือด (EDTA)',
                       rangeBySex: { male: 'Hb 13–17 g/dL · Hct 40–50%', female: 'Hb 12–15 g/dL · Hct 36–44%' } },
  'lab-fbs-hba1c':   { label: 'น้ำตาลในเลือด (FBS / HbA1c)',        unit: 'mg/dL', normalRange: '70–99',   category: 'chemistry',    specimen: 'เลือด (Plasma)' },
  'lab-lipid':       { label: 'ไขมันในเลือด (Lipid profile)',       unit: 'mg/dL', normalRange: '< 200',   category: 'chemistry',    specimen: 'เลือด (Serum)' },
  'lab-renal':       { label: 'การทำงานของไต (BUN, Creatinine)',   unit: 'mg/dL', normalRange: '0.6–1.3', category: 'chemistry',    specimen: 'เลือด (Serum)',
                       rangeBySex: { male: 'Cr 0.7–1.3', female: 'Cr 0.6–1.1' } },
  'lab-lft':         { label: 'การทำงานของตับ (LFT)',               unit: 'U/L',   normalRange: '7–56',    category: 'chemistry',    specimen: 'เลือด (Serum)' },
  'lab-electrolyte': { label: 'เกลือแร่ในเลือด (Electrolytes)',     unit: 'mmol/L',normalRange: '135–145', category: 'chemistry',    specimen: 'เลือด (Serum)' },
  'lab-ua':          { label: 'การตรวจปัสสาวะ (UA)',                 unit: '',      normalRange: '',        category: 'microbiology', specimen: 'ปัสสาวะ' },
  'lab-thyroid':     { label: 'การทำงานของต่อมไทรอยด์ (TSH, FT4)',  unit: 'mIU/L', normalRange: '0.4–4.0', category: 'serology',     specimen: 'เลือด (Serum)',
                       rangeByAge: [{ maxAge: 59, range: '0.4–4.0' }, { maxAge: Infinity, range: '0.5–5.0 (ผู้สูงอายุ)' }] },
  'lab-anti-hiv':    { label: 'แอนติบอดีเอชไอวี (Anti-HIV)',        unit: '',      normalRange: 'Non-reactive', category: 'serology',     specimen: 'เลือด (Serum)' },
  'lab-hemoculture': { label: 'เพาะเชื้อในเลือด (Hemoculture)',     unit: '',      normalRange: 'No growth',    category: 'microbiology', specimen: 'เลือด (Culture bottle)' },
  'lab-urine-drug':  { label: 'ตรวจสารเสพติดในปัสสาวะ (Urine Drug Screen)', unit: '', normalRange: 'Negative', category: 'toxicology', specimen: 'ปัสสาวะ' },
};

/* Resolves the sex/age-aware reference range for a test + patient, falling
   back to the flat `normalRange` when the test has no sex/age split.
   `patient.age` is a free-text Thai string ("42 ปี - 3 เดือน - 8 วัน") —
   only the leading year count is needed for the age-bracket lookup. */
export const resolveReferenceRange = (test, patient) => {
  if (!test) return null;
  if (test.rangeBySex) {
    const sexKey = patient?.sex === 'ชาย' ? 'male' : 'female';
    if (test.rangeBySex[sexKey]) return test.rangeBySex[sexKey];
  }
  if (test.rangeByAge) {
    const years = parseInt(patient?.age, 10);
    const bracket = test.rangeByAge.find((b) => Number.isNaN(years) || years <= b.maxAge);
    if (bracket) return bracket.range;
  }
  return test.normalRange;
};

/* Pre-set panels — product-spec.md §10.2 names 'CBC + BUN/Cr + electrolyte
   panel' as an existing common order. */
export const LAB_PANELS = [
  { key: 'panel-cbc-renal-lyte', label: 'CBC + BUN/Cr + electrolyte panel', tests: ['lab-cbc', 'lab-renal', 'lab-electrolyte'] },
  { key: 'panel-metabolic',      label: 'Metabolic panel (FBS/HbA1c + Lipid + LFT)', tests: ['lab-fbs-hba1c', 'lab-lipid', 'lab-lft'] },
];

/* Pipeline statuses per product-spec.md §10.2 "Logic sketch":
   sample collection workflow (collected → analysing → reported). */
export const LAB_STATUSES = [
  { key: 'collected',  label: 'เก็บตัวอย่างแล้ว',   color: 'info' },
  { key: 'analysing',  label: 'กำลังวิเคราะห์',     color: 'inprogress' },
  { key: 'reported',   label: 'รายงานผลแล้ว',       color: 'positive' },
];

const NAMED = (i) => PATIENT_PROFILES[i % PATIENT_PROFILES.length];

/* Historical trend points for a single test (e.g. FBS) on the detail panel
   — plausible mg/dL creep, mirrors VitalsSignGraph's mock-dataset shape. */
const FBS_TREND = [
  { date: '12 ม.ค. 68', value: 92 },
  { date: '3 มี.ค. 68', value: 98 },
  { date: '20 เม.ย. 68', value: 101 },
  { date: '15 มิ.ย. 68', value: 118 },
  { date: '28 ก.ค. 69', value: 142 },
];

/* Order rows — one per ordered test (a panel order expands to N rows
   sharing an orderId, matching how a real labs[] slice would flatten).

   Extra fields per TOR ภาคผนวก ก §1.15:
     urgency      — §1.15.4.9 "ความเร่งด่วน" — 'stat' | 'routine'
     abnormal     — §1.15.4.6 "แสดงผลที่มีค่าที่ผิดปกติ" — out-of-range but
                    NOT a critical/panic value (critical is its own, more
                    urgent flag per §1.15.3.2 and stays on `critical`)
     confidential — §1.15.2.4 "ปกปิดผลการตรวจที่เป็นความลับ" e.g. Anti-HIV
     price        — §1.15.4.9 "ราคา และข้อมูลยอดรวมทั้งหมด" (บาท) */
/* Prices per test (บาท) — shared by the curated rows below and the
   generated bulk batch, so both stay consistent with one source. */
const TEST_PRICE = {
  'lab-cbc': 120, 'lab-fbs-hba1c': 180, 'lab-lipid': 250, 'lab-renal': 150,
  'lab-lft': 200, 'lab-electrolyte': 220, 'lab-ua': 80, 'lab-thyroid': 450,
  'lab-anti-hiv': 350, 'lab-hemoculture': 600, 'lab-urine-drug': 400,
};

/* Curated rows — hand-picked to cover every edge case the UI needs to
   demonstrate (critical, abnormal, confidential, STAT, trend chart). */
const CURATED_ORDERS = [
  { id: 'LAB-0001', orderId: 'ORD-241', patient: NAMED(0),  testKey: 'lab-cbc',         doctor: NAMED(0).doctor,  orderedAt: '08:10', status: 'reported',  urgency: 'routine', critical: false, abnormal: false, confidential: false, price: 120, resultSummary: 'WBC 7.2 · Hb 13.8 · Plt 245 — ปกติ', trend: null },
  { id: 'LAB-0002', orderId: 'ORD-241', patient: NAMED(0),  testKey: 'lab-renal',       doctor: NAMED(0).doctor,  orderedAt: '08:10', status: 'reported',  urgency: 'routine', critical: false, abnormal: false, confidential: false, price: 150, resultSummary: 'BUN 14 · Cr 0.9 — ปกติ', trend: null },
  { id: 'LAB-0003', orderId: 'ORD-241', patient: NAMED(0),  testKey: 'lab-electrolyte', doctor: NAMED(0).doctor,  orderedAt: '08:10', status: 'analysing', urgency: 'routine', critical: false, abnormal: false, confidential: false, price: 220, resultSummary: null, trend: null },
  { id: 'LAB-0004', orderId: 'ORD-242', patient: NAMED(1),  testKey: 'lab-fbs-hba1c',   doctor: NAMED(1).doctor,  orderedAt: '08:25', status: 'reported',  urgency: 'stat',    critical: true,  abnormal: true,  confidential: false, price: 180, resultSummary: 'FBS 142 mg/dL — สูงกว่าค่าปกติ (70–99)', trend: FBS_TREND },
  { id: 'LAB-0005', orderId: 'ORD-243', patient: NAMED(2),  testKey: 'lab-lipid',       doctor: NAMED(2).doctor,  orderedAt: '08:40', status: 'collected', urgency: 'routine', critical: false, abnormal: false, confidential: false, price: 250, resultSummary: null, trend: null },
  { id: 'LAB-0006', orderId: 'ORD-244', patient: NAMED(3),  testKey: 'lab-lft',         doctor: NAMED(3).doctor,  orderedAt: '09:05', status: 'analysing', urgency: 'stat',    critical: false, abnormal: false, confidential: false, price: 200, resultSummary: null, trend: null },
  { id: 'LAB-0007', orderId: 'ORD-245', patient: NAMED(4),  testKey: 'lab-ua',          doctor: NAMED(4).doctor,  orderedAt: '09:15', status: 'collected', urgency: 'routine', critical: false, abnormal: false, confidential: false, price: 80,  resultSummary: null, trend: null },
  { id: 'LAB-0008', orderId: 'ORD-246', patient: NAMED(5),  testKey: 'lab-thyroid',     doctor: NAMED(5).doctor,  orderedAt: '09:20', status: 'reported',  urgency: 'routine', critical: false, abnormal: true,  confidential: false, price: 450, resultSummary: 'TSH 6.8 · FT4 0.9 — สูงกว่าค่าปกติเล็กน้อย (0.4–4.0)', trend: null },
  { id: 'LAB-0009', orderId: 'ORD-247', patient: NAMED(6),  testKey: 'lab-electrolyte', doctor: NAMED(6).doctor,  orderedAt: '09:30', status: 'reported',  urgency: 'stat',    critical: true,  abnormal: true,  confidential: false, price: 220, resultSummary: 'K+ 6.2 mmol/L — สูงกว่าค่าปกติ (3.5–5.1)', trend: null },
  { id: 'LAB-0010', orderId: 'ORD-248', patient: NAMED(7),  testKey: 'lab-cbc',         doctor: NAMED(7).doctor,  orderedAt: '09:45', status: 'collected', urgency: 'routine', critical: false, abnormal: false, confidential: false, price: 120, resultSummary: null, trend: null },
  { id: 'LAB-0011', orderId: 'ORD-249', patient: NAMED(8),  testKey: 'lab-renal',       doctor: NAMED(8).doctor,  orderedAt: '10:00', status: 'analysing', urgency: 'routine', critical: false, abnormal: false, confidential: false, price: 150, resultSummary: null, trend: null },
  { id: 'LAB-0012', orderId: 'ORD-250', patient: NAMED(9),  testKey: 'lab-lipid',       doctor: NAMED(9).doctor,  orderedAt: '10:12', status: 'collected', urgency: 'routine', critical: false, abnormal: false, confidential: false, price: 250, resultSummary: null, trend: null },
  /* Microbiology / toxicology / confidential-serology examples — TOR
     §1.15.4.10 requires these category tabs to exist; the original 12 rows
     only covered hematology/chemistry/UA, so these three fill the rest. */
  { id: 'LAB-0013', orderId: 'ORD-251', patient: NAMED(0),  testKey: 'lab-hemoculture', doctor: NAMED(0).doctor,  orderedAt: '10:20', status: 'analysing', urgency: 'stat',    critical: false, abnormal: false, confidential: false, price: 600, resultSummary: null, trend: null },
  { id: 'LAB-0014', orderId: 'ORD-252', patient: NAMED(1),  testKey: 'lab-urine-drug',  doctor: NAMED(1).doctor,  orderedAt: '10:30', status: 'reported',  urgency: 'routine', critical: false, abnormal: true,  confidential: false, price: 400, resultSummary: 'Amphetamine: Positive — ตรวจพบสารเสพติดกลุ่มแอมเฟตามีน', trend: null },
  { id: 'LAB-0015', orderId: 'ORD-253', patient: NAMED(2),  testKey: 'lab-anti-hiv',    doctor: NAMED(2).doctor,  orderedAt: '10:40', status: 'reported',  urgency: 'routine', critical: false, abnormal: false, confidential: true,  price: 350, resultSummary: 'Non-reactive', trend: null },
];

/* Bulk-generated rows (LAB-0016…LAB-0044) — fills the worklist out to 44
   total so status counts / pagination / sorting read like a real day's
   volume, without hand-typing 29 more literals. Deterministic (no
   Math.random) so the mock dataset stays stable across reloads. Mostly
   plain "ปกติ" results with occasional STAT/critical/abnormal sprinkled
   in — the curated rows above already cover the interesting edge cases. */
const BULK_TEST_KEYS = Object.keys(LAB_TEST_CATALOG);
const BULK_STATUSES = ['collected', 'analysing', 'reported'];

const BULK_ORDERS = Array.from({ length: 29 }, (_, i) => {
  const n = i + 16; // LAB-0016..LAB-0044
  const testKey = BULK_TEST_KEYS[i % BULK_TEST_KEYS.length];
  const test = LAB_TEST_CATALOG[testKey];
  const patient = NAMED(10 + i); // continues past the curated rows' patients 0–9
  const status = BULK_STATUSES[i % BULK_STATUSES.length];
  const minutesFromStart = 45 + i * 12; // continues right after the last curated row's 10:40
  const hour = 10 + Math.floor(minutesFromStart / 60);
  const minute = minutesFromStart % 60;
  const isStat = i % 7 === 0;
  const isCritical = i % 11 === 3;
  const isAbnormal = isCritical || i % 9 === 5;
  const resultSummary = status !== 'reported'
    ? null
    : (isCritical || isAbnormal
      ? `ผล ${test.label} อยู่นอกช่วงอ้างอิงปกติ — ดูรายละเอียดในระบบ`
      : `${test.label} — ปกติ`);
  return {
    id: `LAB-${String(n).padStart(4, '0')}`,
    orderId: `ORD-${254 + i}`,
    patient,
    testKey,
    doctor: patient.doctor,
    orderedAt: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    status,
    urgency: isStat ? 'stat' : 'routine',
    critical: isCritical,
    abnormal: isAbnormal,
    confidential: testKey === 'lab-anti-hiv',
    price: TEST_PRICE[testKey],
    resultSummary,
    trend: null,
  };
});

export const LAB_ORDERS = [...CURATED_ORDERS, ...BULK_ORDERS];

/* Resolves which pre-set panel (if any) a test belongs to — TOR §1.15.4.9
   "ชุดตรวจ". A test is only tagged when it's part of exactly one panel's
   `tests` list; a standalone single-test order resolves to `null`. */
const resolvePanel = (testKey) => LAB_PANELS.find((p) => p.tests.includes(testKey)) ?? null;

/* VN (Visit Number) — per-visit identifier, same '69-XXXXX' convention as
   src/pages/opd/QueuePage.jsx. Derived from orderId so every row sharing
   an orderId (a panel order flattened to N rows) shares the same VN. */
export const withTestLabel = (order) => ({
  ...order,
  testLabel: LAB_TEST_CATALOG[order.testKey]?.label ?? order.testKey,
  category: LAB_TEST_CATALOG[order.testKey]?.category ?? null,
  specimen: LAB_TEST_CATALOG[order.testKey]?.specimen ?? null,
  panel: resolvePanel(order.testKey)?.label ?? null,
  vn: `69-${order.orderId.replace('ORD-', '').padStart(5, '0')}`,
});
