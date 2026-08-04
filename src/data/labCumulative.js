import { LAB_ORDERS, withTestLabel } from '@/data/labOrders';
import { LAB_GROUPS, LAB_TEST_BY_ID, resolveAnalyteRange } from '@/data/labCatalog';
import { classifyAnalyte } from '@/data/labResults';

/* ผลตรวจย้อนหลัง / เปรียบเทียบ (cumulative report) — the data behind
   /lab/history/:hn.

   Why a new module rather than a helper on labOrders.js: the order store
   models TODAY's worklist. Its rows carry `orderedAt` as 'HH:MM' with no
   date at all, because every row in it belongs to the current session — that
   is correct for a worklist and useless for a cumulative sheet, which is a
   comparison ACROSS visits. `LAB_HISTORY_BY_HN` in labOrders.js carries the
   right shape for the order-entry duplicate warning (testId + daysAgo +
   a summary sentence) but no analyte values, so nothing can be tabulated
   from it either.

   So the prior visits live here, with real per-analyte values and real
   dates, and today's RELEASED rows are merged in from the live store. Two
   sources, one matrix, and labOrders.js is left exactly as it is.

   Only รับรองผลแล้ว rows are included. An un-approved value is not a result
   — putting one on a cumulative sheet a clinician reads across visits is
   how an unverified number becomes a treatment decision. */

/* The mock's "today", matching LabQueuePage / LabOrderPage / LabSendOutPage. */
export const CUMULATIVE_TODAY = '2026-07-31';

/* Prior visits, keyed by HN, oldest last. Values are per-analyte and use the
   catalog's own analyte keys so the same resolver, the same reference range
   and the same critical thresholds apply to a two-year-old result as to
   this morning's. Clinically coherent series rather than random numbers:
   patient 1 is a diabetic drifting upward, patient 3's lipids respond to
   treatment, patient 5 has a slowly falling haemoglobin. */
const PRIOR_VISITS = {
  '67-00001': [
    {
      date: '2026-07-29', orderId: 'ORD-198', location: 'คลินิกเบาหวาน', doctor: 'พญ.สมหญิง รักษ์ดี',
      results: { 'lab-fbs': { fbs: 118 }, 'lab-electrolytes': { na: 139, k: 4.6, cl: 103, co2: 25 } },
    },
    {
      date: '2026-05-14', orderId: 'ORD-102', location: 'คลินิกเบาหวาน', doctor: 'พญ.สมหญิง รักษ์ดี',
      results: { 'lab-fbs': { fbs: 132 }, 'lab-hba1c': { hba1c: 7.4 }, 'lab-creatinine': { cr: 1.1, egfr: 78 } },
    },
    {
      date: '2026-02-20', orderId: 'ORD-044', location: 'ตรวจรักษาทั่วไป (OPD)', doctor: 'พญ.สมหญิง รักษ์ดี',
      results: { 'lab-fbs': { fbs: 108 }, 'lab-hba1c': { hba1c: 6.8 }, 'lab-cbc': { hb: 14.2, hct: 43, wbc: 7.1, plt: 265 } },
    },
    {
      date: '2025-11-06', orderId: 'ORD-011', location: 'ตรวจรักษาทั่วไป (OPD)', doctor: 'นพ.สมชาย ใจดี',
      results: { 'lab-fbs': { fbs: 99 }, 'lab-hba1c': { hba1c: 6.2 } },
    },
  ],
  '67-00002': [
    {
      date: '2026-07-10', orderId: 'ORD-176', location: 'คลินิกฝากครรภ์ (ANC)', doctor: 'นพ.สมชาย ใจดี',
      results: { 'lab-cbc': { hb: 10.8, hct: 33, wbc: 9.2, plt: 210 } },
    },
    {
      date: '2026-04-02', orderId: 'ORD-081', location: 'คลินิกฝากครรภ์ (ANC)', doctor: 'นพ.สมชาย ใจดี',
      results: { 'lab-cbc': { hb: 11.6, hct: 35, wbc: 8.4, plt: 232 }, 'lab-hba1c': { hba1c: 5.4 } },
    },
  ],
  '67-00003': [
    {
      date: '2026-07-22', orderId: 'ORD-190', location: 'OPD อายุรกรรม', doctor: 'พญ.วิภา สุขศรี',
      results: { 'lab-lipid': { chol: 232, tg: 188, hdl: 44, ldl: 152 }, 'lab-creatinine': { cr: 0.9, egfr: 88 } },
    },
    {
      date: '2026-04-18', orderId: 'ORD-090', location: 'OPD อายุรกรรม', doctor: 'พญ.วิภา สุขศรี',
      results: { 'lab-lipid': { chol: 254, tg: 214, hdl: 41, ldl: 172 } },
    },
    {
      date: '2026-01-09', orderId: 'ORD-021', location: 'OPD อายุรกรรม', doctor: 'พญ.วิภา สุขศรี',
      results: { 'lab-lipid': { chol: 268, tg: 236, hdl: 39, ldl: 186 }, 'lab-fbs': { fbs: 104 } },
    },
  ],
  '67-00004': [
    {
      date: '2026-06-30', orderId: 'ORD-160', location: 'ตรวจรักษาทั่วไป (OPD)', doctor: 'นพ.ณัฐวุฒิ บุญมี',
      results: { 'lab-cbc': { hb: 15.1, hct: 45, wbc: 6.8, plt: 288 } },
    },
  ],
  '67-00005': [
    {
      date: '2026-07-25', orderId: 'ORD-193', location: 'ตรวจรักษาทั่วไป (OPD)', doctor: 'พญ.สมหญิง รักษ์ดี',
      results: { 'lab-cbc': { hb: 10.2, hct: 31, wbc: 5.6, plt: 178 }, 'lab-creatinine': { cr: 1.4, egfr: 44 } },
    },
    {
      date: '2026-03-12', orderId: 'ORD-060', location: 'ตรวจรักษาทั่วไป (OPD)', doctor: 'พญ.สมหญิง รักษ์ดี',
      results: { 'lab-cbc': { hb: 11.4, hct: 35, wbc: 6.1, plt: 201 }, 'lab-creatinine': { cr: 1.2, egfr: 52 } },
    },
    {
      date: '2025-12-01', orderId: 'ORD-015', location: 'ตรวจรักษาทั่วไป (OPD)', doctor: 'นพ.ณัฐวุฒิ บุญมี',
      results: { 'lab-cbc': { hb: 12.6, hct: 38, wbc: 6.4, plt: 224 } },
    },
  ],
};

export const priorVisitsFor = (hn) => PRIOR_VISITS[hn] ?? [];

/* Every HN this screen can show something for — used by the page's patient
   picker when it is reached without a usable :hn. */
export const cumulativePatients = () => {
  const seen = new Map();
  LAB_ORDERS.map(withTestLabel).forEach((r) => {
    if (!seen.has(r.patient.hn)) seen.set(r.patient.hn, r.patient);
  });
  Object.keys(PRIOR_VISITS).forEach((hn) => {
    if (!seen.has(hn)) {
      const found = LAB_ORDERS.find((o) => o.patient.hn === hn);
      if (found) seen.set(hn, found.patient);
    }
  });
  return [...seen.entries()].map(([hn, patient]) => ({ hn, patient }));
};

/* Builds the cross-tab.

   Rows are ANALYTES (grouped into their catalog section), columns are
   collection dates newest-first. A matrix keyed by test would collapse a CBC
   into one cell and lose the four numbers a clinician is actually comparing.

   Options:
     from / to     — ISO date bounds, inclusive; blank means unbounded
     group         — a LAB_GROUPS key, or null for all
     abnormalOnly  — keep only analyte rows that have at least one non-normal
                     cell (the "เฉพาะค่าผิดปกติ" toggle)
     includeConfidential — when false, confidential tests are still LISTED
                     (so their existence is not hidden from the clinician)
                     but their values render as masked; the page decides. */
export const buildCumulative = (hn, {
  from = '', to = '', group = null, abnormalOnly = false, maxColumns = 8,
} = {}) => {
  const patient = LAB_ORDERS.find((o) => o.patient.hn === hn)?.patient ?? null;

  /* Today's released rows, grouped into one column per order. */
  const todayColumns = new Map();
  LAB_ORDERS
    .filter((o) => o.patient.hn === hn && o.status === 'reported' && o.results)
    .map(withTestLabel)
    .forEach((r) => {
      const key = `${CUMULATIVE_TODAY}::${r.orderId}`;
      if (!todayColumns.has(key)) {
        todayColumns.set(key, {
          key,
          date: CUMULATIVE_TODAY,
          orderId: r.orderId,
          location: r.location,
          doctor: r.doctor,
          time: r.approvedAt ?? r.orderedAt,
          results: {},
        });
      }
      todayColumns.get(key).results[r.testId] = r.results;
    });

  const priorColumns = priorVisitsFor(hn).map((v) => ({
    key: `${v.date}::${v.orderId}`,
    date: v.date,
    orderId: v.orderId,
    location: v.location,
    doctor: v.doctor,
    time: '',
    results: v.results,
  }));

  const columns = [...todayColumns.values(), ...priorColumns]
    .filter((c) => (!from || c.date >= from) && (!to || c.date <= to))
    /* Newest on the left — a clinician reads "what is it now, and what was
       it before", not a timeline from the left. */
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.orderId < b.orderId ? 1 : -1))
    .slice(0, maxColumns);

  /* Which analytes appear at all, in catalog order so the sheet's row order
     is stable between patients and between visits. */
  const seenTests = new Set();
  columns.forEach((c) => Object.keys(c.results).forEach((t) => seenTests.add(t)));

  const sections = LAB_GROUPS
    .filter((g) => !group || g.key === group)
    .map((g) => {
      const rows = [];
      [...seenTests].forEach((testId) => {
        const test = LAB_TEST_BY_ID[testId];
        if (!test || test.group !== g.key) return;
        (test.analytes ?? []).forEach((analyte) => {
          const cells = columns.map((c) => {
            const raw = c.results[testId]?.[analyte.key];
            if (raw == null || raw === '') return { key: c.key, empty: true };
            return {
              key: c.key,
              value: raw,
              status: classifyAnalyte(test, analyte, raw, patient),
            };
          });
          if (cells.every((cell) => cell.empty)) return;
          rows.push({
            key: `${testId}::${analyte.key}`,
            testId,
            testLabel: test.nameEn,
            testNameTh: test.nameTh,
            confidential: Boolean(test.confidential),
            analyte,
            label: analyte.label,
            unit: analyte.unit ?? '',
            /* Reference range resolved against THIS patient's sex/age — the
               same resolver LabDetailPanel uses, so a Hb of 12.5 flags for a
               man and not for a woman on both screens. */
            range: resolveAnalyteRange(analyte, patient),
            cells,
            hasAbnormal: cells.some((c) => c.status === 'abnormal' || c.status === 'critical'),
            hasCritical: cells.some((c) => c.status === 'critical'),
          });
        });
      });
      return { key: g.key, label: g.thai, short: g.short, rows: abnormalOnly ? rows.filter((r) => r.hasAbnormal) : rows };
    })
    .filter((s) => s.rows.length > 0);

  return {
    patient,
    columns,
    sections,
    totalRows: sections.reduce((n, s) => n + s.rows.length, 0),
    abnormalRows: sections.reduce((n, s) => n + s.rows.filter((r) => r.hasAbnormal).length, 0),
    criticalRows: sections.reduce((n, s) => n + s.rows.filter((r) => r.hasCritical).length, 0),
    hasConfidential: sections.some((s) => s.rows.some((r) => r.confidential)),
  };
};

/* Points for the full-width TrendChart when a row is selected. Shape matches
   what LabDetailPanel's exported TrendChart already expects ({ date, value }),
   oldest first — a trend line reads left to right even though the matrix
   reads newest-first. */
export const trendPointsFor = (row) => {
  if (!row) return [];
  return row.cells
    .filter((c) => !c.empty && Number.isFinite(Number(c.value)))
    .map((c) => ({ date: String(c.key).slice(5, 10), value: Number(c.value) }))
    .reverse();
};
