import { PATIENT_PROFILES } from '@/data/patientProfiles';
import {
  LAB_TESTS, LAB_TEST_BY_ID, LAB_TUBES, LAB_GROUPS,
  getTube, resolveAnalyteRange,
} from '@/data/labCatalog';

/* Worklist rows for the `lab` module (src/pages/lab/LabQueuePage.jsx). Mock
   data, not wired to a backend — same tier as treatmentQueue.js /
   pharmacyQueue.js. The test definitions themselves live in labCatalog.js;
   this file is only the day's orders on top of that catalog.

   Rebuilt against `Lab dicussion with team.pdf` in the Kaebrain folder of
   the MIH-Docs-Vault Obsidian vault, which supersedes the earlier
   TOR-only shape (3 statuses, free-text specimen, no accession). */

/* ─────────────────────────────────────────────────────────────────────────
   STATUS FLOW

   The team wrote the pipeline out as prose:

     รับคำสั่งแพทย์
     เก็บสิ่งส่งตรวจ เช่น เก็บเลือดใส่ Tube
     รับตัวอย่างตรวจ เช่น รวบรวมสิ่งส่งตรวจไปให้ จนท LAB
     รอผลตรวจ
     อนุมัติผล (ต้องมีคนอนุมัติผล)
     ออกรายงานผล

   …and then drew it as six worklist tabs in the widget mockup, which is the
   authoritative rendering: รอรับคำขอ · รอเก็บ/รับตัวอย่าง · กำลังตรวจ ·
   ส่งตรวจภายนอก · รอรับรองผล · รายงานผลแล้ว. Note "ส่งตรวจภายนอก" is a
   parallel branch, not a step between กำลังตรวจ and รอรับรองผล — a specimen
   sent to an outside lab (lab-out) leaves the in-house analyser queue and
   rejoins at รอรับรองผล when the external result lands.

   `terminalForDoctor` marks where a doctor may finally read the result:
   the team was explicit that "แพทย์จะดูได้ต่อเมื่อได้รับอนุมัติผล" — approval
   gates visibility, so only `reported` clears it. */
export const LAB_STATUSES = [
  { key: 'requested', label: 'รอรับคำขอ',        short: 'รอรับคำขอ',   icon: 'assignment',        color: 'neutral', terminalForDoctor: false },
  { key: 'collect',   label: 'รอเก็บ/รับตัวอย่าง', short: 'รอเก็บ',      icon: 'colorize',          color: 'info',    terminalForDoctor: false },
  { key: 'analysing', label: 'กำลังตรวจ',         short: 'กำลังตรวจ',   icon: 'biotech',           color: 'warning', terminalForDoctor: false },
  { key: 'external',  label: 'ส่งตรวจภายนอก',     short: 'ส่งนอก',      icon: 'send',              color: 'yellow',  terminalForDoctor: false },
  { key: 'approval',  label: 'รอรับรองผล',        short: 'รอรับรอง',    icon: 'fact_check',        color: 'info',    terminalForDoctor: false },
  { key: 'reported',  label: 'รายงานผลแล้ว',      short: 'รายงานผล',    icon: 'check_circle',      color: 'success', terminalForDoctor: true },
];

export const LAB_STATUS_BY_KEY = Object.fromEntries(LAB_STATUSES.map((s) => [s.key, s]));

/* Off-pipeline outcomes — reachable from the worklist row actions the team
   listed ("ปุ่ม: พิมพ์ label, เก็บแล้ว, reject, เจาะซ้ำ") but not tabs of
   their own, since a rejected specimen is re-drawn and re-enters at
   `collect` rather than sitting in a dead-end bucket. */
export const LAB_EXCEPTIONS = [
  { key: 'rejected', label: 'ปฏิเสธสิ่งส่งตรวจ', icon: 'block',    color: 'error' },
  { key: 'redraw',   label: 'เจาะซ้ำ',           icon: 'replay',   color: 'warning' },
];

/* ความเร่งด่วน — "STAT / ด่วน / Routine … STAT ต้องเด้งขึ้นบนสุด (สีแดง)".
   `rank` drives the STAT-ก่อน sort; `slaMinutes` drives the aging column
   the team justified with "ดู aging / SLA รอคิวนานเกินไหม". */
export const LAB_URGENCIES = [
  { key: 'stat',    label: 'STAT',    rank: 0, slaMinutes: 60,  color: 'error' },
  { key: 'urgent',  label: 'ด่วน',    rank: 1, slaMinutes: 240, color: 'warning' },
  { key: 'routine', label: 'Routine', rank: 2, slaMinutes: 480, color: 'neutral' },
];

export const LAB_URGENCY_BY_KEY = Object.fromEntries(LAB_URGENCIES.map((u) => [u.key, u]));

/* จุดสั่ง / ward — "Ordering location … รู้ว่ามาจาก OPD/ward ไหน", and the
   team clarified "จุดสั่งคือคลินิกที่สั่ง". Values match the destination
   list on the Refer screen in the same deck (IPD / ER / ICU / OPD / ANC)
   plus the specialty clinics shown in the worklist mockup. */
export const LAB_LOCATIONS = [
  'ER', 'ICU', 'ตึกผู้ป่วยใน (Admit IPD)', 'ตรวจรักษาทั่วไป (OPD)',
  'คลินิกฝากครรภ์ (ANC)', 'คลินิกเบาหวาน', 'คลินิก STI', 'OPD อายุรกรรม',
];

/* ─────────────────────────────────────────────────────────────────────────
   ACCESSION NUMBER

   "Barcode ตาม Tube" — one accession per TUBE, not per test, which is the
   whole point of grouping an order's tests by tube in `summariseSelection`.
   Format L{BE-year-2}-{seq} matches the mockup's L69-0712 … L69-0715
   (69 = พ.ศ. 2569). Sticker printing and the barcode scanner both key off
   this string. */
const ACCESSION_YEAR = '69';
const accession = (seq) => `L${ACCESSION_YEAR}-${String(seq).padStart(4, '0')}`;

const NAMED = (i) => PATIENT_PROFILES[i % PATIENT_PROFILES.length];

/* Historical trend for a single analyte (FBS) on the detail panel — a
   plausible mg/dL creep, mirroring VitalsSignGraph's mock-dataset shape. */
const FBS_TREND = [
  { date: '12 ม.ค. 68', value: 92 },
  { date: '3 มี.ค. 68', value: 98 },
  { date: '20 เม.ย. 68', value: 101 },
  { date: '15 มิ.ย. 68', value: 118 },
  { date: '28 ก.ค. 69', value: 142 },
];

/* ─────────────────────────────────────────────────────────────────────────
   ORDERS

   One row per ordered test. Rows sharing an `orderId` came from one doctor's
   order; rows sharing an `accessionNo` were drawn into the same tube.

   The team called for two levels of status: "มี status แยกเป็น status รวม
   และ status ย่อย เช่นแต่ละ LAB ส่งมาไม่พร้อมกัน". So `status` here is the
   per-test SUB-status, and the order-level roll-up is computed by
   `rollUpOrderStatus()` below — an order is only 'reported' once every one
   of its tests is, and shows as 'partial' while they trickle in.

   Per-row TOR flags carried over from the previous shape:
     urgency      §1.15.4.9  ความเร่งด่วน
     abnormal     §1.15.4.6  out of range but not a panic value
     critical     §1.15.3.2  panic value — must notify the doctor
     confidential §1.15.2.4  ปกปิดผลการตรวจที่เป็นความลับ (also on the catalog) */
const CURATED_ORDERS = [
  /* The four rows the worklist mockup shows literally, in its order. */
  {
    id: 'LAB-0001', orderId: 'ORD-241', accessionNo: accession(712), tubeSeq: 1,
    patient: NAMED(0), testId: 'lab-electrolytes', doctor: NAMED(0).doctor,
    location: 'ER', orderedAt: '05:12', status: 'approval',
    urgency: 'stat', critical: true, abnormal: true,
    /* The mockup labels this row "K⁺ 6.8 ↑ วิกฤต". */
    resultSummary: 'K⁺ 6.8 mmol/L — สูงกว่าค่าปกติ (3.5–5.1)',
    results: { na: 138, k: 6.8, cl: 102, co2: 24 },
    trend: null, labeled: true,
  },
  {
    id: 'LAB-0002', orderId: 'ORD-242', accessionNo: accession(713), tubeSeq: 1,
    patient: NAMED(1), testId: 'lab-antihiv', doctor: NAMED(1).doctor,
    location: 'คลินิก STI', orderedAt: '05:28', status: 'analysing',
    urgency: 'routine', critical: false, abnormal: false,
    /* Mockup shows the name masked as "ปกปิด (VCT)" with HN ••••• — the
       confidential flag comes off the catalog entry, so nothing to set here. */
    resultSummary: null, results: null, trend: null, labeled: true,
  },
  {
    id: 'LAB-0003', orderId: 'ORD-242', accessionNo: accession(713), tubeSeq: 1,
    patient: NAMED(1), testId: 'lab-vdrl', doctor: NAMED(1).doctor,
    location: 'คลินิก STI', orderedAt: '05:28', status: 'analysing',
    urgency: 'routine', critical: false, abnormal: false,
    resultSummary: null, results: null, trend: null, labeled: true,
  },
  {
    id: 'LAB-0004', orderId: 'ORD-243', accessionNo: accession(714), tubeSeq: 1,
    patient: NAMED(2), testId: 'lab-fbs', doctor: NAMED(2).doctor,
    location: 'OPD อายุรกรรม', orderedAt: '05:41', status: 'external',
    urgency: 'routine', critical: false, abnormal: false,
    /* "ส่งตรวจภายนอก" — lab-out upload per the vendor manual's service flow. */
    externalLab: 'ศูนย์แล็บกลาง กทม.', sentOutAt: '06:10',
    resultSummary: null, results: null, trend: FBS_TREND, labeled: true,
  },
  {
    id: 'LAB-0005', orderId: 'ORD-243', accessionNo: accession(714), tubeSeq: 2,
    patient: NAMED(2), testId: 'lab-lipid', doctor: NAMED(2).doctor,
    location: 'OPD อายุรกรรม', orderedAt: '05:41', status: 'external',
    urgency: 'routine', critical: false, abnormal: false,
    externalLab: 'ศูนย์แล็บกลาง กทม.', sentOutAt: '06:10',
    resultSummary: null, results: null, trend: null, labeled: true,
  },
  {
    id: 'LAB-0006', orderId: 'ORD-244', accessionNo: accession(715), tubeSeq: 1,
    patient: NAMED(3), testId: 'lab-hba1c', doctor: NAMED(3).doctor,
    location: 'คลินิกเบาหวาน', orderedAt: '05:55', status: 'collect',
    urgency: 'urgent', critical: false, abnormal: false,
    /* Mockup annotates this row "รอพิมพ์ label" — the sticker hasn't been
       printed yet, which is exactly what `labeled: false` drives. */
    labeled: false,
    resultSummary: null, results: null, trend: null,
  },
  {
    id: 'LAB-0007', orderId: 'ORD-244', accessionNo: accession(715), tubeSeq: 2,
    patient: NAMED(3), testId: 'lab-creatinine', doctor: NAMED(3).doctor,
    location: 'คลินิกเบาหวาน', orderedAt: '05:55', status: 'collect',
    urgency: 'urgent', critical: false, abnormal: false, labeled: false,
    resultSummary: null, results: null, trend: null,
  },
  {
    id: 'LAB-0008', orderId: 'ORD-245', accessionNo: accession(698), tubeSeq: 1,
    patient: NAMED(4), testId: 'lab-cbc', doctor: NAMED(4).doctor,
    location: 'คลินิกฝากครรภ์ (ANC)', orderedAt: '04:30', status: 'reported',
    urgency: 'routine', critical: false, abnormal: false,
    resultSummary: 'WBC 7.2 · Hb 13.8 · Hct 41 · Plt 245 — ปกติ',
    results: { hb: 13.8, hct: 41, wbc: 7.2, plt: 245 },
    approvedBy: 'ทนพ.ญ. อารีย์ วงศ์สุข', approvedAt: '06:02',
    trend: null, labeled: true,
  },
  {
    id: 'LAB-0009', orderId: 'ORD-245', accessionNo: accession(698), tubeSeq: 1,
    patient: NAMED(4), testId: 'lab-abo', doctor: NAMED(4).doctor,
    location: 'คลินิกฝากครรภ์ (ANC)', orderedAt: '04:30', status: 'reported',
    urgency: 'routine', critical: false, abnormal: false,
    resultSummary: 'ABO: O · Rh (D): Positive',
    results: { abo: 'O', rh: 'Positive' },
    approvedBy: 'ทนพ.ญ. อารีย์ วงศ์สุข', approvedAt: '06:02',
    trend: null, labeled: true,
  },

  /* Rows beyond the mockup, covering the states it doesn't show. */
  {
    id: 'LAB-0010', orderId: 'ORD-246', accessionNo: accession(716), tubeSeq: 1,
    patient: NAMED(5), testId: 'lab-fbs', doctor: NAMED(5).doctor,
    location: 'ตรวจรักษาทั่วไป (OPD)', orderedAt: '06:05', status: 'reported',
    urgency: 'stat', critical: true, abnormal: true,
    resultSummary: 'FBS 142 mg/dL — สูงกว่าค่าปกติ (70–99)',
    results: { fbs: 142 },
    approvedBy: 'ทนพ. ธนกฤต ศรีสมบูรณ์', approvedAt: '06:48',
    /* "พยาบาลเจาะน้ำตาลปลายนิ้ว บันทึกผลเองได้เลย" — a nurse-performed
       fingerstick glucose bypasses the lab bench entirely, so the row is
       flagged as bedside and carries the nurse as the performer. */
    bedside: true, performedBy: 'พว. กมลชนก แสงทอง',
    trend: FBS_TREND, labeled: true,
  },
  {
    id: 'LAB-0011', orderId: 'ORD-247', accessionNo: accession(717), tubeSeq: 1,
    patient: NAMED(6), testId: 'lab-cbc', doctor: NAMED(6).doctor,
    location: 'ER', orderedAt: '06:20', status: 'requested',
    urgency: 'stat', critical: false, abnormal: false, labeled: false,
    resultSummary: null, results: null, trend: null,
  },
  {
    id: 'LAB-0012', orderId: 'ORD-248', accessionNo: accession(718), tubeSeq: 1,
    patient: NAMED(7), testId: 'lab-ua', doctor: NAMED(7).doctor,
    location: 'ตรวจรักษาทั่วไป (OPD)', orderedAt: '06:35', status: 'requested',
    urgency: 'routine', critical: false, abnormal: false, labeled: false,
    resultSummary: null, results: null, trend: null,
  },
  {
    id: 'LAB-0013', orderId: 'ORD-249', accessionNo: accession(719), tubeSeq: 1,
    patient: NAMED(8), testId: 'lab-hemoculture', doctor: NAMED(8).doctor,
    location: 'ICU', orderedAt: '03:10', status: 'analysing',
    urgency: 'stat', critical: false, abnormal: false,
    resultSummary: null, results: null, trend: null, labeled: true,
  },
  {
    id: 'LAB-0014', orderId: 'ORD-250', accessionNo: accession(720), tubeSeq: 1,
    patient: NAMED(9), testId: 'lab-urine-drug', doctor: NAMED(9).doctor,
    location: 'ตรวจรักษาทั่วไป (OPD)', orderedAt: '06:50', status: 'approval',
    urgency: 'routine', critical: false, abnormal: true,
    resultSummary: 'Amphetamine: Positive — ตรวจพบสารเสพติดกลุ่มแอมเฟตามีน',
    results: { amphet: 'Positive' }, trend: null, labeled: true,
  },
  {
    id: 'LAB-0015', orderId: 'ORD-251', accessionNo: accession(721), tubeSeq: 1,
    patient: NAMED(10), testId: 'lab-electrolytes', doctor: NAMED(10).doctor,
    location: 'ตึกผู้ป่วยใน (Admit IPD)', orderedAt: '06:15', status: 'collect',
    urgency: 'routine', critical: false, abnormal: false,
    /* A haemolysed sample the bench refused — "reject" from the row actions.
       It re-enters at `collect` with `redraw` set, which is why the
       exception lives on the row rather than replacing the status. */
    exception: 'rejected', rejectReason: 'ตัวอย่างมีภาวะเม็ดเลือดแดงแตก (Hemolysis)',
    resultSummary: null, results: null, trend: null, labeled: true,
  },
  {
    id: 'LAB-0016', orderId: 'ORD-252', accessionNo: accession(722), tubeSeq: 1,
    patient: NAMED(11), testId: 'lab-creatinine', doctor: NAMED(11).doctor,
    location: 'คลินิกเบาหวาน', orderedAt: '06:25', status: 'collect',
    urgency: 'routine', critical: false, abnormal: false,
    exception: 'redraw', rejectReason: 'ปริมาณเลือดไม่พอ (Quantity not sufficient)',
    resultSummary: null, results: null, trend: null, labeled: true,
  },
];

/* Bulk-generated rows — fills the day out so tab counts, sorting and
   pagination read like real volume without hand-typing every literal.
   Deterministic (no Math.random) so the mock stays stable across reloads,
   and no Date.now() so it stays stable across sessions. */
const BULK_TEST_IDS = LAB_TESTS.map((t) => t.id);
const BULK_STATUS_KEYS = ['requested', 'collect', 'analysing', 'external', 'approval', 'reported'];

const BULK_ORDERS = Array.from({ length: 42 }, (_, i) => {
  const n = i + 17;
  const testId = BULK_TEST_IDS[i % BULK_TEST_IDS.length];
  const test = LAB_TEST_BY_ID[testId];
  const patient = NAMED(12 + i);
  /* Weighted so 'reported' dominates — the mockup's tab counts run
     4 / 9 / 6 / 5 / 3 / 58, i.e. a long tail of finished work. */
  const status = i % 5 === 0
    ? BULK_STATUS_KEYS[i % BULK_STATUS_KEYS.length]
    : 'reported';
  const minutesFromStart = 200 + i * 7;
  const hour = 3 + Math.floor(minutesFromStart / 60);
  const minute = minutesFromStart % 60;
  const isStat = i % 13 === 0;
  const isUrgent = !isStat && i % 7 === 0;
  const isCritical = i % 17 === 3 && status === 'reported';
  const isAbnormal = isCritical || (i % 9 === 5 && status === 'reported');

  return {
    id: `LAB-${String(n).padStart(4, '0')}`,
    orderId: `ORD-${252 + i}`,
    accessionNo: accession(723 + i),
    tubeSeq: 1,
    patient,
    testId,
    doctor: patient.doctor,
    location: LAB_LOCATIONS[i % LAB_LOCATIONS.length],
    orderedAt: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    status,
    urgency: isStat ? 'stat' : isUrgent ? 'urgent' : 'routine',
    critical: isCritical,
    abnormal: isAbnormal,
    labeled: status !== 'requested',
    externalLab: status === 'external' ? 'ศูนย์แล็บกลาง กทม.' : undefined,
    approvedBy: status === 'reported' ? 'ทนพ. ธนกฤต ศรีสมบูรณ์' : undefined,
    resultSummary: status !== 'reported'
      ? null
      : (isCritical || isAbnormal
        ? `ผล ${test.nameEn} อยู่นอกช่วงอ้างอิงปกติ — ดูรายละเอียดในระบบ`
        : `${test.nameEn} — ปกติ`),
    results: null,
    trend: null,
  };
});

export const LAB_ORDERS = [...CURATED_ORDERS, ...BULK_ORDERS];

/* ─────────────────────────────────────────────────────────────────────────
   ORDER STORE

   The worklist and the result-entry screen are separate routes, so entering
   a result on one has to be visible when you navigate back to the other.
   Same subscribe/notify shape as labCatalog.js's catalog store — module
   state plus a version bump, deliberately minimal because there is no
   backend behind any of this.

   `LAB_ORDERS` is mutated in place rather than reassigned so modules that
   captured the array at import time keep seeing the same list. */
const orderListeners = new Set();

export const subscribeOrders = (fn) => {
  orderListeners.add(fn);
  return () => orderListeners.delete(fn);
};

const notifyOrders = () => orderListeners.forEach((fn) => fn());

export const getLabOrder = (id) => LAB_ORDERS.find((o) => o.id === id) ?? null;

/* Patch one order row. Returns the updated row, or null if the id is
   unknown. Callers pass only the fields they are changing. */
export const updateLabOrder = (id, patch) => {
  const idx = LAB_ORDERS.findIndex((o) => o.id === id);
  if (idx < 0) return null;
  LAB_ORDERS[idx] = { ...LAB_ORDERS[idx], ...patch };
  notifyOrders();
  return LAB_ORDERS[idx];
};

/* Removes an order row — TOR §1.15.4.9 "สามารถลบข้อมูลได้". Deleting a
   REQUEST is legitimate (a doctor cancels an order before the specimen is
   drawn); deleting a released RESULT is not, so the caller is expected to
   gate this on status. */
export const deleteLabOrder = (id) => {
  const idx = LAB_ORDERS.findIndex((o) => o.id === id);
  if (idx < 0) return false;
  LAB_ORDERS.splice(idx, 1);
  notifyOrders();
  return true;
};

/* ─────────────────────────────────────────────────────────────────────────
   DERIVED VIEWS

   `withTestLabel` decorates a raw order row with everything the worklist
   columns need, all of it resolved from the catalog so the tube/colour can
   never drift from the test ("รายกลุ่มตรวจ และสีหลอดจะ relate กัน"). */
export const withTestLabel = (order) => {
  const test = LAB_TEST_BY_ID[order.testId] ?? null;
  const tube = getTube(test);
  const group = LAB_GROUPS.find((g) => g.key === test?.group) ?? null;
  const urgency = LAB_URGENCY_BY_KEY[order.urgency] ?? LAB_URGENCY_BY_KEY.routine;

  return {
    ...order,
    test,
    /* Display name: English short name is what the bench and the mockup
       use; the Thai name rides along for the patient-facing columns. */
    testLabel: test?.nameEn ?? order.testId,
    testNameTh: test?.nameTh ?? '',
    testCode: test?.code ?? '',
    tmlt: test?.tmlt ?? '',
    group: test?.group ?? null,
    groupLabel: group ? `${group.thai} (${group.short})` : '',
    groupShort: group?.short ?? '',
    tube,
    tubeLabel: tube?.label ?? '',
    tubeColor: tube?.color ?? 'var(--surface-colorfulbadge-grey-bold, #858C92)',
    tubeCount: test?.tubeCount ?? 1,
    volumeMl: (test?.tubeCount ?? 1) * (tube?.volumeMl ?? 0),
    /* Confidential is a property of the TEST (Anti-HIV, VDRL), so it is
       resolved here rather than duplicated onto every order row. */
    confidential: Boolean(test?.confidential),
    price: test?.price ?? 0,
    urgency: order.urgency,
    urgencyLabel: urgency.label,
    urgencyRank: urgency.rank,
    slaMinutes: urgency.slaMinutes,
    statusLabel: LAB_STATUS_BY_KEY[order.status]?.label ?? order.status,
    /* VN (Visit Number) — per-visit id, same '69-XXXXX' convention as
       src/pages/opd/QueuePage.jsx. Derived from orderId so every row of one
       order shares a VN. */
    vn: `69-${order.orderId.replace('ORD-', '').padStart(5, '0')}`,
  };
};

/* Order-level roll-up — the "status รวม" half of the team's two-level
   status. Given every row of one order, returns the single status the
   doctor's view should show.

   Rules, in the order they fire:
     • any row still pre-result  → the earliest such stage (work outstanding)
     • all rows reported         → 'reported' (the doctor may now read it)
     • otherwise                 → 'partial'  ("แต่ละ LAB ส่งมาไม่พร้อมกัน") */
export const rollUpOrderStatus = (rows = []) => {
  if (!rows.length) return null;
  if (rows.every((r) => r.status === 'reported')) return 'reported';

  const stageOrder = LAB_STATUSES.map((s) => s.key);
  const outstanding = rows
    .filter((r) => r.status !== 'reported')
    .map((r) => stageOrder.indexOf(r.status))
    .filter((i) => i >= 0);

  if (!outstanding.length) return 'reported';
  /* Some rows already reported while others haven't — that's the partial
     case the team called out; otherwise report the least-advanced stage. */
  const anyReported = rows.some((r) => r.status === 'reported');
  return anyReported ? 'partial' : stageOrder[Math.min(...outstanding)];
};

/* Groups a flat row list by orderId — used by the detail panel and by any
   doctor-facing view that needs the roll-up above. */
export const groupByOrder = (rows = []) => {
  const map = new Map();
  rows.forEach((r) => {
    if (!map.has(r.orderId)) map.set(r.orderId, []);
    map.get(r.orderId).push(r);
  });
  return [...map.entries()].map(([orderId, items]) => ({
    orderId,
    rows: items,
    status: rollUpOrderStatus(items),
    patient: items[0].patient,
    accessionNos: [...new Set(items.map((i) => i.accessionNo))],
  }));
};

/* Patient's prior lab history, for the order-entry duplicate warning
   ("ถ้าเคยตรวจ FBS มา 2 วันก่อน ต้องขึ้นเตือนตรงตัวเลือกนั้นเลย"). Keyed by HN.
   `daysAgo` is a plain integer so nothing here needs Date.now(). */
export const LAB_HISTORY_BY_HN = {
  [PATIENT_PROFILES[0].hn]: [
    { testId: 'lab-fbs',   daysAgo: 2,  resultSummary: 'FBS 118 mg/dL — สูงกว่าค่าปกติเล็กน้อย' },
    { testId: 'lab-cbc',   daysAgo: 40, resultSummary: 'ปกติ' },
  ],
  [PATIENT_PROFILES[1].hn]: [
    { testId: 'lab-hba1c', daysAgo: 21, resultSummary: 'HbA1c 6.9% — สูงกว่าค่าปกติ' },
  ],
  [PATIENT_PROFILES[2].hn]: [
    { testId: 'lab-lipid', daysAgo: 9,  resultSummary: 'Chol 232 mg/dL — สูงกว่าค่าปกติ' },
    { testId: 'lab-abo',   daysAgo: 400, resultSummary: 'ABO: B · Rh (D): Positive' },
  ],
  [PATIENT_PROFILES[3].hn]: [
    { testId: 'lab-fbs',   daysAgo: 0,  resultSummary: 'FBS 96 mg/dL — ปกติ' },
  ],
};

export const labHistoryFor = (hn) => LAB_HISTORY_BY_HN[hn] ?? [];

/* ─────────────────────────────────────────────────────────────────────────
   PRIOR-ORDER HISTORY — TOR §1.15.4.3

   "สามารถแสดงประวัติการสั่ง Lab และเลือกสั่งตามประวัติเดิมได้."

   Two halves. The first is a readable history, which means grouping by the
   ORDER the doctor placed rather than listing loose test rows — "CBC +
   Creatinine, 12 มิ.ย." is what someone recognises, not two separate lines.
   The second half is re-ordering from it, which the order page turns into a
   one-click action by handing the grouped testIds straight to the picker. */
export const priorOrdersFor = (hn) => {
  const rows = LAB_ORDERS.filter((o) => o.patient.hn === hn);
  const byOrder = new Map();
  rows.forEach((r) => {
    if (!byOrder.has(r.orderId)) {
      byOrder.set(r.orderId, {
        orderId: r.orderId,
        orderedAt: r.orderedAt,
        doctor: r.doctor,
        location: r.location,
        urgency: r.urgency,
        testIds: [],
        rows: [],
      });
    }
    const g = byOrder.get(r.orderId);
    g.testIds.push(r.testId);
    g.rows.push(r);
  });
  /* Most recent first — a doctor re-ordering almost always wants the last
     set, not the first. */
  return [...byOrder.values()].sort((a, b) => b.orderId.localeCompare(a.orderId));
};

/* ─────────────────────────────────────────────────────────────────────────
   ADVANCE ORDERS — TOR §1.15.4.7 / §1.15.4.8

   §1.15.4.7 "สามารถสั่งตรวจทางห้องปฏิบัติการล่วงหน้าได้ และดึงข้อมูลมาใช้ได้เลย
              ในวันที่ผู้รับบริการมา"
   §1.15.4.8 "สามารถแจ้งเตือนรายการที่สั่งล่วงหน้าได้"

   An advance order is deliberately NOT a worklist row. The lab must not see
   it, count it in its queue, or try to draw it — the patient is not in the
   building. It sits in its own list until the day arrives, and only then is
   ACTIVATED into real order rows ("ดึงข้อมูลมาใช้ได้เลยในวันที่ผู้รับบริการมา").

   `scheduledFor` is a plain ISO date string so nothing here needs a clock;
   the caller passes today's date in, which also keeps the mock stable. */
let advanceSeq = 0;

export const LAB_ADVANCE_ORDERS = [
  {
    id: 'ADV-001',
    patient: NAMED(3),
    testIds: ['lab-hba1c', 'lab-creatinine'],
    doctor: NAMED(3).doctor,
    location: 'คลินิกเบาหวาน',
    urgency: 'routine',
    /* Dated in the past relative to the mock's "today" (2026-07-31) so the
       due-alert has something to fire on out of the box. */
    scheduledFor: '2026-07-31',
    note: 'ติดตามระดับน้ำตาลสะสมทุก 3 เดือน — เจาะก่อนพบแพทย์',
    createdAt: '2026-05-02',
    activated: false,
  },
  {
    id: 'ADV-002',
    patient: NAMED(4),
    testIds: ['lab-cbc', 'lab-abo'],
    doctor: NAMED(4).doctor,
    location: 'คลินิกฝากครรภ์ (ANC)',
    urgency: 'routine',
    scheduledFor: '2026-07-31',
    note: 'ANC ครั้งที่ 2 — ตรวจตามชุดมาตรฐาน',
    createdAt: '2026-06-18',
    activated: false,
  },
  {
    id: 'ADV-003',
    patient: NAMED(2),
    testIds: ['lab-lipid'],
    doctor: NAMED(2).doctor,
    location: 'OPD อายุรกรรม',
    urgency: 'routine',
    scheduledFor: '2026-09-15',
    note: 'ประเมินผลหลังปรับยาลดไขมัน 6 สัปดาห์ · ต้องงดอาหาร 12 ชม.',
    createdAt: '2026-07-20',
    activated: false,
  },
];

export const addAdvanceOrder = (order) => {
  advanceSeq += 1;
  const entry = {
    id: `ADV-${String(100 + advanceSeq).padStart(3, '0')}`,
    activated: false,
    ...order,
  };
  LAB_ADVANCE_ORDERS.push(entry);
  notifyOrders();
  return entry;
};

export const cancelAdvanceOrder = (id) => {
  const idx = LAB_ADVANCE_ORDERS.findIndex((a) => a.id === id);
  if (idx < 0) return false;
  LAB_ADVANCE_ORDERS.splice(idx, 1);
  notifyOrders();
  return true;
};

export const advanceOrdersFor = (hn) =>
  LAB_ADVANCE_ORDERS.filter((a) => !a.activated && a.patient.hn === hn);

/* §1.15.4.8 — what the worklist alerts on. Anything scheduled for today or
   earlier is outstanding: an advance order whose date has passed without
   the patient arriving is exactly the case worth surfacing, not hiding. */
export const dueAdvanceOrders = (today) =>
  LAB_ADVANCE_ORDERS.filter((a) => !a.activated && a.scheduledFor <= today);

/* §1.15.4.7's second half — "ดึงข้อมูลมาใช้ได้เลยในวันที่ผู้รับบริการมา".
   Expands one advance order into real worklist rows: one per test, grouped
   into tubes so each tube gets its own accession, exactly as a same-day
   order would. Returns the created rows. */
export const activateAdvanceOrder = (id, { orderedAt = '08:00' } = {}) => {
  const adv = LAB_ADVANCE_ORDERS.find((a) => a.id === id);
  if (!adv || adv.activated) return [];

  const orderId = `ORD-${900 + LAB_ADVANCE_ORDERS.indexOf(adv)}`;
  /* One accession per distinct tube — the same rule as a walk-in order. */
  const tubeToAccession = new Map();
  let seq = 900;

  const created = adv.testIds.map((testId, i) => {
    const test = LAB_TEST_BY_ID[testId];
    const tubeKey = test?.tubeKey ?? 'clot';
    if (!tubeToAccession.has(tubeKey)) {
      seq += 1;
      tubeToAccession.set(tubeKey, accession(seq));
    }
    return {
      id: `LAB-A${adv.id.replace('ADV-', '')}-${i + 1}`,
      orderId,
      accessionNo: tubeToAccession.get(tubeKey),
      tubeSeq: 1,
      patient: adv.patient,
      testId,
      doctor: adv.doctor,
      location: adv.location,
      orderedAt,
      status: 'requested',
      urgency: adv.urgency ?? 'routine',
      critical: false,
      abnormal: false,
      labeled: false,
      resultSummary: null,
      results: null,
      trend: null,
      /* Kept on the row so the worklist can show that this order was placed
         in advance rather than at the counter today. */
      fromAdvanceOrder: adv.id,
      advanceNote: adv.note,
    };
  });

  LAB_ORDERS.push(...created);
  adv.activated = true;
  adv.activatedAt = orderedAt;
  notifyOrders();
  return created;
};

/* ─────────────────────────────────────────────────────────────────────────
   BACK-COMPAT SHIMS

   LabDetailPanel.jsx still imports `LAB_TEST_CATALOG` / `resolveReferenceRange`
   from this module. Both now project off labCatalog.js so there is exactly
   one source of truth; they stay exported so the detail panel keeps working
   while it is migrated onto the richer analyte-level API. */
export const LAB_TEST_CATALOG = Object.fromEntries(
  LAB_TESTS.map((t) => {
    const tube = LAB_TUBES[t.tubeKey];
    const primary = t.analytes?.[0];
    return [t.id, {
      label: `${t.nameTh} (${t.nameEn})`,
      unit: primary?.unit ?? '',
      normalRange: primary?.normalRange ?? '',
      category: t.group,
      specimen: tube ? tube.thai : '',
      rangeBySex: primary?.rangeBySex,
      rangeByAge: primary?.rangeByAge,
    }];
  }),
);

export const resolveReferenceRange = (test, patient) => resolveAnalyteRange(test, patient);

/* Older name for the group list, kept so any straggling import resolves.
   New code should import LAB_GROUPS from '@/data/labCatalog'. */
export const LAB_CATEGORIES = LAB_GROUPS.map((g) => ({ key: g.key, label: g.thai }));
