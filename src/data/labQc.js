import { LAB_ANALYZERS, LAB_ANALYZER_BY_KEY } from '@/data/labInterfaces';
import { appendLabAudit } from '@/data/labAudit';

/* ควบคุมคุณภาพภายใน (IQC) และการสอบเทียบเครื่องตรวจวิเคราะห์.

   Not a TOR clause of its own — §1.15 never says "QC" — but it is the
   precondition for §1.15.1's Automatic report mode meaning anything. An
   analyser whose daily control run is out of range is producing numbers
   that must not be released, and an interface that imports from it
   regardless turns the automation into a hazard. So the QC state lives
   beside the analyser roster and gates the import action, rather than
   becoming a screen of its own that nobody opens.

   Evaluation is a simplified Westgard read on the Levey-Jennings z-score:
     |z| < 2      → in control
     2 ≤ |z| < 3  → warning (1-2s: run it again, do not reject on this alone)
     |z| ≥ 3      → out of control (1-3s: reject the run)
   Real Westgard also needs across-level and across-run rules (2-2s, R-4s,
   4-1s, 10-x); those need a run history longer than a mock carries, and
   claiming them here would overstate what this evaluates. */

export const QC_VERDICTS = {
  pass:    { key: 'pass',    label: 'อยู่ในเกณฑ์ควบคุม',       color: 'success', badge: 'success' },
  warning: { key: 'warning', label: 'เตือน (1-2s) — ทวนซ้ำ',   color: 'warning', badge: 'warning' },
  fail:    { key: 'fail',    label: 'หลุดเกณฑ์ (1-3s)',        color: 'error',   badge: 'error' },
};

/* ระดับสารควบคุม — two levels is the minimum a clinical lab runs daily
   (a normal and a pathological), because an analyser can be accurate at
   one concentration and drift badly at another. */
export const QC_LEVELS = [
  { key: 'L1', label: 'Level 1 (Normal)' },
  { key: 'L2', label: 'Level 2 (Abnormal)' },
];

export const evaluateZ = (z) => {
  const a = Math.abs(Number(z) || 0);
  if (a >= 3) return QC_VERDICTS.fail;
  if (a >= 2) return QC_VERDICTS.warning;
  return QC_VERDICTS.pass;
};

/* Worst verdict across the levels of one run — a run is only in control if
   EVERY level is. */
const worstOf = (levels = []) => {
  if (levels.some((l) => evaluateZ(l.z).key === 'fail')) return QC_VERDICTS.fail;
  if (levels.some((l) => evaluateZ(l.z).key === 'warning')) return QC_VERDICTS.warning;
  return QC_VERDICTS.pass;
};

const runs = new Map();      /* analyzerKey → array of runs, newest first */
const calibrations = new Map(); /* analyzerKey → { lastAt, nextDue, by } */
const overrides = new Map(); /* analyzerKey → { reason, by, at } */
const listeners = new Set();

export const subscribeQc = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const notify = () => listeners.forEach((fn) => fn());

let runSeq = 0;

const makeRun = (analyzer, { at, by, levels, lot, note }) => {
  runSeq += 1;
  return {
    id: `QC-${String(1000 + runSeq).slice(1)}`,
    analyzer,
    at,
    by,
    lot,
    note: note ?? '',
    levels,
    verdict: worstOf(levels).key,
    /* Set when this run is replaced by an amendment (id of the replacement)
       or voided. Both stay in `runs` so the trail keeps what was originally
       recorded — the same rule amendReceipt / cancelReceipt follow in
       labReceive.js — but neither counts toward any verdict. */
    supersededBy: null,
    voided: false,
    voidReason: '',
  };
};

const push = (analyzer, run) => {
  const list = runs.get(analyzer) ?? [];
  runs.set(analyzer, [run, ...list].slice(0, 30));
};

/* Seeded so every state on the page is reachable at first load:
   two analysers in control, one warning, one genuinely out of control
   (micro-01, whose incubator temperature is already flagged in
   labInterfaces.js — the two findings are the same physical problem), and
   one offline instrument whose last run is simply stale. */
push('hema-01', makeRun('hema-01', {
  at: '2026-07-31 07:05', by: 'ทนพ.ญ. อารีย์ วงศ์สุข', lot: 'XN-CTRL-2607',
  levels: [{ level: 'L1', value: 12.4, mean: 12.5, sd: 0.3, z: -0.33 }, { level: 'L2', value: 8.1, mean: 8.0, sd: 0.25, z: 0.4 }],
}));
push('chem-01', makeRun('chem-01', {
  at: '2026-07-31 07:12', by: 'ทนพ. ธนกฤต ศรีสมบูรณ์', lot: 'PNU-2214',
  levels: [{ level: 'L1', value: 96, mean: 95, sd: 2.4, z: 0.42 }, { level: 'L2', value: 258, mean: 250, sd: 6.0, z: 1.33 }],
}));
push('immuno-01', makeRun('immuno-01', {
  at: '2026-07-31 06:55', by: 'ทนพ.ญ. อารีย์ วงศ์สุข', lot: 'ARCH-QC-0625',
  levels: [{ level: 'L1', value: 0.32, mean: 0.30, sd: 0.01, z: 2.1 }, { level: 'L2', value: 3.9, mean: 4.0, sd: 0.12, z: -0.83 }],
  note: 'ค่า L1 เข้าเกณฑ์เตือน 1-2s — ทวนซ้ำแล้วได้ z = 1.4',
}));
push('micro-01', makeRun('micro-01', {
  at: '2026-07-31 06:30', by: 'นางสาว ปิยะดา ทองแท้', lot: 'BACTEC-QC-11',
  levels: [{ level: 'L1', value: 41.2, mean: 36.0, sd: 1.5, z: 3.47 }],
  note: 'อุณหภูมิห้องเพาะเชื้อต่ำกว่าเกณฑ์ — แจ้งช่างแล้ว รอเข้าตรวจสอบ',
}));
push('ua-01', makeRun('ua-01', {
  at: '2026-07-30 08:10', by: 'นางสาว ปิยะดา ทองแท้', lot: 'UC-CTRL-0417',
  levels: [{ level: 'L1', value: 1.018, mean: 1.020, sd: 0.002, z: -1.0 }],
  note: 'เครื่องปิดหลังเวลาราชการ — ยังไม่ได้รัน QC ของวันนี้',
}));

calibrations.set('hema-01',   { lastAt: '2026-06-18', nextDue: '2026-09-18', by: 'บริษัทผู้แทนจำหน่าย Sysmex' });
calibrations.set('chem-01',   { lastAt: '2026-07-02', nextDue: '2026-10-02', by: 'บริษัทผู้แทนจำหน่าย Roche' });
calibrations.set('immuno-01', { lastAt: '2026-05-28', nextDue: '2026-08-28', by: 'บริษัทผู้แทนจำหน่าย Abbott' });
calibrations.set('ua-01',     { lastAt: '2026-04-11', nextDue: '2026-08-11', by: 'บริษัทผู้แทนจำหน่าย Sysmex' });
calibrations.set('micro-01',  { lastAt: '2026-03-20', nextDue: '2026-07-20', by: 'ช่างเครื่องมือแพทย์ สำนักอนามัย' });

/* ─────────────────────────────────────────────────────────────────────────
   READ */

/* Everything ever recorded, newest first — what the history list shows, so an
   amended or voided run is still visible with the reason beside it. */
export const qcRunsFor = (analyzer) => runs.get(analyzer) ?? [];

/* Only the runs that still count: not superseded by an amendment, not
   voided. Every verdict, the Levey-Jennings strip and the import gate read
   this one, so a run corrected at the bench stops driving the instrument. */
export const activeQcRunsFor = (analyzer) => (runs.get(analyzer) ?? [])
  .filter((r) => !r.voided && !r.supersededBy);

export const lastQcFor = (analyzer) => activeQcRunsFor(analyzer)[0] ?? null;
export const calibrationFor = (analyzer) => calibrations.get(analyzer) ?? null;
export const qcOverrideFor = (analyzer) => overrides.get(analyzer) ?? null;

/* The calendar day of a run, as ISO, or '' when it cannot be read.

   Runs carry `at` as free text because that is what the bench types, and two
   shapes reach here: the ISO-prefixed 'YYYY-MM-DD HH:mm' the QC popup
   writes (and the seeds use), and the Thai short date 'D/M/BBBB HH:mm' that
   toLocaleString('th-TH') produces. Both must resolve — a control that ran
   this morning being read as stale would block an instrument that is fine,
   which is the mirror image of the bug this whole check exists to prevent. */
export const qcRunDay = (at) => {
  const s = String(at ?? '').trim();
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, '0')}-${String(iso[3]).padStart(2, '0')}`;
  const thai = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (thai) {
    const year = Number(thai[3]) > 2400 ? Number(thai[3]) - 543 : Number(thai[3]);
    return `${year}-${String(thai[2]).padStart(2, '0')}-${String(thai[1]).padStart(2, '0')}`;
  }
  return '';
};

/* ยังไม่ได้รัน QC ของวันนี้ — a control from yesterday says nothing about the
   instrument today. Distinct from a FAILED control: the operator's next
   action is "run it", not "fix it", so the two are never shown as one state.
   `today` is passed in so nothing here needs a clock. */
export const isQcStale = (analyzer, today) => {
  const last = lastQcFor(analyzer);
  if (!last) return true;
  if (!today) return false;
  return qcRunDay(last.at) !== today;
};

/* Whether calibration is past due. `today` is passed in so nothing here
   needs a clock and the mock stays reproducible. */
export const isCalibrationOverdue = (analyzer, today) => {
  const c = calibrations.get(analyzer);
  return Boolean(c?.nextDue && today && c.nextDue < today);
};

/* The gate the interface page reads. An analyser is blocked when its last QC
   run failed OR when no control has been run TODAY — a daily-control gate
   that honours yesterday's control is the failure mode it exists to prevent.
   A supervisor override releases both, because it is the one deliberate,
   reasoned, audited escape hatch either state has.

   `today` must be passed for the staleness half to apply; callers that omit
   it get the old failed-run-only verdict rather than a silent block. */
export const isOutOfControl = (analyzer, today) => {
  if (overrides.has(analyzer)) return false;
  const last = lastQcFor(analyzer);
  if (!last) return true;
  if (isQcStale(analyzer, today)) return true;
  return last.verdict === 'fail';
};

export const qcStateFor = (analyzer, today) => {
  const last = lastQcFor(analyzer);
  const verdict = last ? QC_VERDICTS[last.verdict] : null;
  return {
    analyzer,
    analyzerName: LAB_ANALYZER_BY_KEY[analyzer]?.name ?? analyzer,
    last,
    verdict,
    stale: isQcStale(analyzer, today),
    blocked: isOutOfControl(analyzer, today),
    override: overrides.get(analyzer) ?? null,
    calibration: calibrations.get(analyzer) ?? null,
    calibrationOverdue: isCalibrationOverdue(analyzer, today),
  };
};

export const allQcStates = (today) => LAB_ANALYZERS.map((a) => qcStateFor(a.key, today));

export const qcHealth = (today) => {
  const states = allQcStates(today);
  return {
    blocked: states.filter((s) => s.blocked).length,
    /* Counted separately from `blocked` even though a stale control blocks:
       "รัน QC เช้านี้" and "ซ่อมเครื่อง" are different jobs for different
       people, and one number covering both tells neither of them anything. */
    stale: states.filter((s) => s.stale && !s.override).length,
    failed: states.filter((s) => s.verdict?.key === 'fail' && !s.override).length,
    warning: states.filter((s) => s.verdict?.key === 'warning').length,
    overdueCalibration: states.filter((s) => s.calibrationOverdue).length,
    overridden: states.filter((s) => s.override).length,
  };
};

/* ─────────────────────────────────────────────────────────────────────────
   WRITE */

/* A number that was actually entered.

   `Number.isFinite(Number(v))` alone is NOT this test: Number('') and
   Number(null) are both 0, and 0 is finite — so a blank ค่าที่วัดได้ passed
   validation and saved as value 0. Against mean 95 / sd 2.4 that is
   z = -39.6, which flips the analyser to 'fail' and blocks result import for
   the whole instrument on the strength of an empty box. The blank has to be
   rejected before the coercion, not after it. */
const isNum = (v) => String(v ?? '').trim() !== '' && Number.isFinite(Number(v));

export const validateQcDraft = (draft) => {
  const errors = {};
  if (!String(draft?.by ?? '').trim()) errors.by = 'ต้องระบุผู้ตรวจสอบ';
  if (!String(draft?.at ?? '').trim()) errors.at = 'ต้องระบุวัน-เวลาที่รัน QC';
  if (!String(draft?.lot ?? '').trim()) errors.lot = 'ต้องระบุ Lot ของสารควบคุม';
  const levels = draft?.levels ?? [];
  if (!levels.length) errors.levels = 'ต้องบันทึกอย่างน้อย 1 ระดับ';
  levels.forEach((l, i) => {
    if (!isNum(l.value)) errors[`value-${i}`] = 'ต้องกรอกค่าที่วัดได้เป็นตัวเลข';
    if (!isNum(l.sd) || Number(l.sd) <= 0) errors[`sd-${i}`] = 'SD ต้องเป็นตัวเลขมากกว่า 0';
    if (!isNum(l.mean)) errors[`mean-${i}`] = 'ต้องกรอกค่าเฉลี่ยเป้าหมายเป็นตัวเลข';
  });
  return { ok: Object.keys(errors).length === 0, errors };
};

const levelsWithZ = (draft) => (draft.levels ?? []).map((l) => {
  const mean = Number(l.mean);
  const sd = Number(l.sd);
  const value = Number(l.value);
  return { level: l.level, value, mean, sd, z: sd ? Number(((value - mean) / sd).toFixed(2)) : 0 };
});

const zSummary = (levels) => levels.map((l) => `${l.level} z=${l.z}`).join(', ');

export const recordQcRun = (analyzer, draft, { actor } = {}) => {
  const check = validateQcDraft(draft);
  if (!check.ok) return { ok: false, errors: check.errors };

  const levels = levelsWithZ(draft);
  const run = makeRun(analyzer, { at: draft.at, by: draft.by, lot: draft.lot, levels, note: draft.note });
  push(analyzer, run);
  /* A fresh run supersedes any override — the override was granted against
     the FAILED run, not against the instrument forever. */
  overrides.delete(analyzer);

  appendLabAudit({
    actor: actor ?? draft.by,
    scope: 'qc',
    action: 'บันทึกผลควบคุมคุณภาพ (IQC)',
    detail: `${LAB_ANALYZER_BY_KEY[analyzer]?.name ?? analyzer} · Lot ${draft.lot} — ${QC_VERDICTS[run.verdict].label}`
      + ` (${zSummary(levels)})`,
    after: { verdict: run.verdict },
  });
  notify();
  return { ok: true, errors: {}, run };
};

/* แก้ไขผลที่บันทึกไว้ — a control value keyed one decimal place out is an
   ordinary bench mistake, and before this the only way to correct one was to
   run the control again, which wastes reagent and leaves the wrong number
   driving the gate in the meantime.

   The correction is a NEW run that carries `amendOf`; the original stays in
   the list marked `supersededBy` so the trail shows what was first recorded
   and what replaced it — the same shape amendReceipt uses in labReceive.js.
   Nothing is edited in place and nothing is deleted. */
export const amendQcRun = (analyzer, runId, draft, { actor } = {}) => {
  const list = runs.get(analyzer) ?? [];
  const original = list.find((r) => r.id === runId);
  if (!original) return { ok: false, errors: { form: 'ไม่พบรายการ QC ที่ต้องการแก้ไข' } };
  if (original.voided) return { ok: false, errors: { form: 'รายการนี้ถูกยกเลิกแล้ว — แก้ไขไม่ได้' } };
  if (original.supersededBy) return { ok: false, errors: { form: 'รายการนี้ถูกแก้ไขไปแล้ว — แก้ไขที่รายการล่าสุดแทน' } };

  const check = validateQcDraft(draft);
  if (!check.ok) return { ok: false, errors: check.errors };

  const levels = levelsWithZ(draft);
  const run = makeRun(analyzer, { at: draft.at, by: draft.by, lot: draft.lot, levels, note: draft.note });
  run.amendOf = original.id;
  original.supersededBy = run.id;
  push(analyzer, run);
  overrides.delete(analyzer);

  appendLabAudit({
    actor: actor ?? draft.by,
    scope: 'qc',
    action: 'แก้ไขผลควบคุมคุณภาพ (IQC)',
    detail: `${LAB_ANALYZER_BY_KEY[analyzer]?.name ?? analyzer} · ${original.id} → ${run.id}`
      + ` — ${QC_VERDICTS[run.verdict].label} (${zSummary(levels)})`,
    before: { verdict: original.verdict, levels: zSummary(original.levels) },
    after: { verdict: run.verdict, levels: zSummary(levels) },
  });
  notify();
  return { ok: true, errors: {}, run };
};

/* ยกเลิกผลที่บันทึกผิดทั้งรายการ — for a run that should never have been
   entered at all (wrong instrument, wrong control). It stops counting toward
   the verdict, but stays visible with its reason: a QC record that can
   vanish is a QC record nobody can audit. */
export const voidQcRun = (analyzer, runId, { reason, actor } = {}) => {
  if (!String(reason ?? '').trim()) return false;
  const list = runs.get(analyzer) ?? [];
  const run = list.find((r) => r.id === runId);
  if (!run || run.voided) return false;
  run.voided = true;
  run.voidReason = String(reason).trim();
  appendLabAudit({
    actor,
    scope: 'qc',
    action: 'ยกเลิกผลควบคุมคุณภาพ (IQC)',
    detail: `${LAB_ANALYZER_BY_KEY[analyzer]?.name ?? analyzer} · ${run.id} (${run.at}) — ${run.voidReason}`,
    before: { verdict: run.verdict },
    after: { voided: true },
  });
  notify();
  return true;
};

/* ยกเว้นการบล็อก — a supervisor may release an out-of-control instrument
   (a STAT potassium at 02:00 with no other analyser in the building is a
   real situation), but only with a reason and their name attached. */
export const overrideQcBlock = (analyzer, { reason, actor } = {}) => {
  if (!String(reason ?? '').trim()) return false;
  overrides.set(analyzer, {
    reason,
    by: actor ?? '',
    at: new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }),
  });
  appendLabAudit({
    actor,
    scope: 'qc',
    action: 'ยกเว้นการบล็อกเครื่องที่ QC ไม่ผ่าน',
    detail: `${LAB_ANALYZER_BY_KEY[analyzer]?.name ?? analyzer} — ${reason}`,
    before: { blocked: true },
    after: { blocked: false, override: true },
  });
  notify();
  return true;
};

/* ยกเลิกการยกเว้น — puts the block back. */
export const clearQcOverride = (analyzer, { actor } = {}) => {
  if (!overrides.has(analyzer)) return false;
  const prev = overrides.get(analyzer);
  overrides.delete(analyzer);
  appendLabAudit({
    actor,
    scope: 'qc',
    action: 'ยกเลิกการยกเว้นการบล็อก QC',
    detail: `${LAB_ANALYZER_BY_KEY[analyzer]?.name ?? analyzer} — เดิมยกเว้นโดย ${prev.by || 'ไม่ระบุ'}`,
    before: { override: true },
    after: { override: false },
  });
  notify();
  return true;
};

/* บันทึกการสอบเทียบ — updates the calibration record. Kept separate from a
   QC run: calibration is a vendor/engineer activity on a schedule, QC is a
   daily bench activity, and conflating them hides an instrument that is
   passing daily controls while being years out of calibration. */
export const validateCalibrationDraft = (draft) => {
  const errors = {};
  if (!String(draft?.lastAt ?? '').trim()) errors.lastAt = 'ต้องระบุวันที่สอบเทียบ';
  if (!String(draft?.nextDue ?? '').trim()) errors.nextDue = 'ต้องระบุกำหนดสอบเทียบครั้งถัดไป';
  if (!String(draft?.by ?? '').trim()) errors.by = 'ต้องระบุผู้สอบเทียบ / หน่วยงาน';
  /* Both are ISO dates from the date input, so a plain string compare is the
     ordering test — a next-due date before the calibration itself is a typo,
     and letting it through hides an overdue instrument behind a green date. */
  if (!errors.lastAt && !errors.nextDue && String(draft.nextDue) <= String(draft.lastAt)) {
    errors.nextDue = 'กำหนดครั้งถัดไปต้องอยู่หลังวันที่สอบเทียบ';
  }
  return { ok: Object.keys(errors).length === 0, errors };
};

export const recordCalibration = (analyzer, { lastAt, nextDue, by, actor } = {}) => {
  if (!validateCalibrationDraft({ lastAt, nextDue, by }).ok) return false;
  const before = calibrations.get(analyzer) ?? null;
  calibrations.set(analyzer, { lastAt, nextDue, by });
  appendLabAudit({
    actor: actor ?? by,
    scope: 'qc',
    action: 'บันทึกการสอบเทียบเครื่องตรวจวิเคราะห์',
    detail: `${LAB_ANALYZER_BY_KEY[analyzer]?.name ?? analyzer} — สอบเทียบ ${lastAt} · ครั้งถัดไป ${nextDue} โดย ${by}`,
    before,
    after: { lastAt, nextDue, by },
  });
  notify();
  return true;
};
