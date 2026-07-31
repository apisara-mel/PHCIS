import { LAB_TEST_BY_ID, resolveAnalyteRange } from '@/data/labCatalog';

/* Result validation and critical-value evaluation — the logic behind
   TOR ภาคผนวก ก §1.15.6.1:

     "สามารถบันทึกผลตรวจทางห้องปฏิบัติการได้ โดยมีระบบป้องกันการลงข้อมูล
      ผิดพลาดตามชนิดข้อมูลของผล Lab นั้น"

   The operative phrase is "ตามชนิดข้อมูลของผล Lab นั้น" — the guard has to be
   driven by each test's declared result type, not by one generic rule. So
   every analyte resolves to one of the three types the Setup page offers
   (labCatalog.js LAB_RESULT_TYPES) and each type gets its own validator:

     numeric — must parse as a number, and must fall inside a plausibility
               window. A typo like 1420 for a potassium of 4.2 is caught here
               rather than being telephoned to a ward as a panic value.
     enum    — must be one of the values configured for that analyte; free
               text is rejected outright.
     text    — accepted as written, but not blank.

   Separately from validity, a numeric result is CLASSIFIED against the
   patient's reference range and the panic limits (§1.15.3.2), because those
   two consequences differ: abnormal is reported, critical must be phoned. */

/* An analyte may override its parent test's result type (Urinalysis is an
   `enum` panel whose RBC member is numeric and whose Sediment member is
   free text), so resolve narrow-to-wide. */
export const analyteResultType = (test, analyte) =>
  analyte?.resultType ?? test?.resultType ?? 'text';

/* Plausibility window for a numeric entry. Derived from the panic limits
   where they exist — a value an order of magnitude beyond the panic
   threshold is a keying error, not a patient in extremis. Without panic
   limits, fall back to the reference range's own magnitude. This is a typo
   guard, NOT a clinical judgement: anything inside the window is accepted
   and then classified. */
const plausibleBounds = (analyte) => {
  const lo = analyte?.criticalLow;
  const hi = analyte?.criticalHigh;
  if (typeof hi === 'number') {
    return { min: 0, max: hi * 10 };
  }
  /* Parse the leading number out of a range string like "70–99" or "< 200"
     to get a sense of scale when no panic limit is configured. */
  const m = String(analyte?.normalRange ?? '').match(/(\d+(?:\.\d+)?)/);
  const scale = m ? Number(m[1]) : null;
  if (scale) return { min: 0, max: Math.max(scale * 50, 100) };
  return { min: 0, max: Number.MAX_SAFE_INTEGER };
};

/* Validates ONE analyte entry. Returns `{ ok, error }` — `error` is the
   Thai message the field renders underneath itself. An empty value is
   reported as `{ ok: false, empty: true }` so the caller can distinguish
   "not filled in yet" (blocks release, but shows no red error while the
   technician is still working) from "filled in wrongly". */
export const validateAnalyteValue = (test, analyte, raw) => {
  const type = analyteResultType(test, analyte);
  const value = typeof raw === 'string' ? raw.trim() : raw;

  if (value === '' || value == null) return { ok: false, empty: true, error: null };

  if (type === 'numeric') {
    /* Reject anything that is not purely a number — "4.2 mmol" or "~5"
       would otherwise coerce to NaN or 4.2 silently. */
    if (!/^-?\d+(\.\d+)?$/.test(String(value))) {
      return { ok: false, error: 'ต้องเป็นตัวเลขเท่านั้น (ไม่ต้องใส่หน่วย)' };
    }
    const n = Number(value);
    if (!Number.isFinite(n)) return { ok: false, error: 'ค่าตัวเลขไม่ถูกต้อง' };
    if (n < 0) return { ok: false, error: 'ค่าติดลบไม่ถูกต้องสำหรับรายการนี้' };
    const { min, max } = plausibleBounds(analyte);
    if (n < min || n > max) {
      return {
        ok: false,
        error: `ค่าอยู่นอกช่วงที่เป็นไปได้ (${min}–${max}) — ตรวจสอบว่าพิมพ์ผิดหรือไม่`,
      };
    }
    return { ok: true, value: n };
  }

  if (type === 'enum') {
    const options = analyte?.options ?? [];
    if (options.length && !options.includes(value)) {
      return { ok: false, error: `ต้องเลือกจาก: ${options.join(' / ')}` };
    }
    return { ok: true, value };
  }

  /* text */
  return { ok: true, value: String(value) };
};

/* Parses a reference-range string into numeric bounds so a numeric result
   can be classed normal/abnormal without the range having to be stored
   twice. Handles the three shapes the catalog actually uses:
     "70–99" / "70-99"  → { low: 70,  high: 99 }
     "< 200" / "<5.7"   → { high: 200 }
     "> 40"  / "≥ 90"   → { low: 40 }
   Returns null when the range is not numeric (e.g. "Negative"). */
export const parseRange = (range) => {
  const s = String(range ?? '').trim();
  if (!s) return null;

  const between = s.match(/^(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)/);
  if (between) return { low: Number(between[1]), high: Number(between[2]) };

  const under = s.match(/^[<≤]\s*(\d+(?:\.\d+)?)/);
  if (under) return { high: Number(under[1]) };

  const over = s.match(/^[>≥]\s*(\d+(?:\.\d+)?)/);
  if (over) return { low: Number(over[1]) };

  return null;
};

/* Classifies one validated analyte value.

   Returns 'critical' | 'abnormal' | 'normal' | 'unknown'.

   Critical is checked FIRST and independently of the reference range: a
   panic value is defined by its own thresholds, and a test can have panic
   limits without a numeric reference range (and vice versa). This mirrors
   the two separate TOR clauses — §1.15.3.2 ค่าวิกฤต and §1.15.4.6 ผลผิดปกติ. */
export const classifyAnalyte = (test, analyte, value, patient) => {
  const type = analyteResultType(test, analyte);

  if (type === 'numeric') {
    const n = Number(value);
    if (!Number.isFinite(n)) return 'unknown';

    if (typeof analyte.criticalLow === 'number' && n <= analyte.criticalLow) return 'critical';
    if (typeof analyte.criticalHigh === 'number' && n >= analyte.criticalHigh) return 'critical';

    /* Reference range is resolved per patient — TOR §1.15.3.2 "แยกตามเพศ
       อายุ" — so the same Hb of 12.5 is normal for a woman and low for a man. */
    const bounds = parseRange(resolveAnalyteRange(analyte, patient));
    if (!bounds) return 'unknown';
    if (typeof bounds.low === 'number' && n < bounds.low) return 'abnormal';
    if (typeof bounds.high === 'number' && n > bounds.high) return 'abnormal';
    return 'normal';
  }

  /* enum / text — anything other than the configured normal answer reads as
     abnormal. For Anti-HIV that means 'Reactive'; for a urine drug screen,
     'Positive'. There is no numeric panic concept for these. */
  const expected = String(analyte?.normalRange ?? '').trim();
  if (!expected) return 'unknown';
  return String(value).trim() === expected ? 'normal' : 'abnormal';
};

/* Evaluates a whole result set for one ordered test.

   Returns:
     rows       — per-analyte { analyte, raw, validation, status }
     errors     — count of invalid entries (blocks save)
     missing    — count of not-yet-entered analytes (blocks release)
     critical   — the analytes at panic values (drives the notify block)
     abnormal   — abnormal but not critical
     overall    — 'critical' | 'abnormal' | 'normal' | 'incomplete'
     summary    — the Thai one-liner stored on the order as `resultSummary` */
export const evaluateResult = (testId, values = {}, patient = null) => {
  const test = LAB_TEST_BY_ID[testId];
  if (!test) return null;

  const rows = (test.analytes ?? []).map((analyte) => {
    const raw = values[analyte.key];
    const validation = validateAnalyteValue(test, analyte, raw);
    const status = validation.ok
      ? classifyAnalyte(test, analyte, validation.value, patient)
      : 'unknown';
    return { analyte, raw, validation, status };
  });

  const errors = rows.filter((r) => !r.validation.ok && !r.validation.empty);
  const missing = rows.filter((r) => r.validation.empty);
  const critical = rows.filter((r) => r.status === 'critical');
  const abnormal = rows.filter((r) => r.status === 'abnormal');

  const overall = missing.length || errors.length
    ? 'incomplete'
    : critical.length ? 'critical'
      : abnormal.length ? 'abnormal'
        : 'normal';

  /* Summary reads like the ones already in labOrders.js so a freshly
     entered result is indistinguishable from the seeded mock rows. */
  const fmt = (r) => {
    const range = resolveAnalyteRange(r.analyte, patient);
    const unit = r.analyte.unit ? ` ${r.analyte.unit}` : '';
    return `${r.analyte.label.replace(/\s*\(.*\)$/, '')} ${r.raw}${unit}${range ? ` (ปกติ ${range})` : ''}`;
  };
  let summary = null;
  if (overall === 'critical') summary = `${critical.map(fmt).join(' · ')} — ค่าวิกฤต`;
  else if (overall === 'abnormal') summary = `${abnormal.map(fmt).join(' · ')} — ผิดปกติ`;
  else if (overall === 'normal') {
    const shown = rows.slice(0, 4).map((r) => `${r.analyte.label.replace(/\s*\(.*\)$/, '')} ${r.raw}`);
    summary = `${shown.join(' · ')} — ปกติ`;
  }

  return { test, rows, errors, missing, critical, abnormal, overall, summary };
};

/* ─────────────────────────────────────────────────────────────────────────
   CRITICAL-VALUE NOTIFICATION

   Not spelled out as its own TOR clause, but it is what ค่าวิกฤต exists FOR,
   and the team's worklist legend labels the flag "ค่าวิกฤต (แจ้งแพทย์)" —
   the notification is the point. Standard laboratory practice (and every
   hospital accreditation standard) requires three things recorded:

     • who was told (a named clinician, not "the ward")
     • when they were told
     • read-back — the receiver repeated the value back, proving it was
       transmitted correctly over a noisy phone line

   `isNotifyComplete` gates release: a critical result cannot be reported
   until all three exist. */
export const blankNotify = () => ({
  notifiedTo: '',
  notifiedAt: '',
  notifiedBy: '',
  readBack: false,
  note: '',
});

export const isNotifyComplete = (n) =>
  Boolean(n && n.notifiedTo?.trim() && n.notifiedAt?.trim() && n.notifiedBy?.trim() && n.readBack);

/* ─────────────────────────────────────────────────────────────────────────
   AMENDED REPORTS

   A result that has already been released cannot simply be overwritten —
   the ward may have acted on it. Correcting one produces an AMENDMENT: the
   original values are preserved, the report is stamped as corrected, and a
   reason is mandatory so the record explains itself.

   Returns the amendment entry to push onto the order's `amendments[]`. */
export const makeAmendment = ({ previousValues, previousSummary, reason, by, at }) => ({
  previousValues: { ...previousValues },
  previousSummary: previousSummary ?? null,
  reason,
  by,
  at,
});
