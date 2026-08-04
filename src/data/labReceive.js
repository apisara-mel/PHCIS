import { LAB_ORDERS, updateLabOrder, LAB_REJECT_REASON_BY_KEY } from '@/data/labOrders';
import { appendLabAudit } from '@/data/labAudit';

/* สถานีรับสิ่งส่งตรวจ — the receiving half of TOR §1.15.2 / §1.15.4.5.

   Grounded in the legacy HCIS manual `คู่มือระบบชันสูตรโรค.pdf`
   (~/MIH-Docs-Vault/คู่มือระบบงาน/), which splits receiving across four
   separate screens:

     §2.1.2 บันทึกรับคำขอตรวจวิเคราะห์      — the request arrives at the lab
     §2.1.4 บันทึกรับสิ่งส่งตรวจเบื้องต้น     — the physical specimen arrives at
                                              the lab's front counter
     §2.1.5 บันทึกรับสิ่งส่งตรวจที่งาน        — it reaches the bench that will run it
     §2.1.6 บันทึกรับสิ่งส่งตรวจแบบกลุ่ม      — the same, applied to a batch

   Four screens for one physical journey is a vendor artefact, not a
   clinical requirement: a receiving clerk stands at one counter with a rack
   of tubes. So this models the three STAGES as data and the app renders one
   workstation with a stage selector; §2.1.6's batch path is "select several
   rows and apply one disposition", not a fifth screen.

   Deliberately NOT new LAB_STATUSES keys. LabQueuePage derives its tab
   strip, its summary cards, its sort ranking and its action gating from
   LAB_STATUSES, so inserting three receive stages there would put three new
   tabs on the worklist and change what four other screens branch on. A
   receipt is a RECORD attached to the order, and the order's pipeline
   status stays exactly what it was. */

/* The three stages, in the order a specimen physically passes them. */
export const LAB_RECEIVE_STAGES = [
  {
    key: 'request',
    label: 'รับคำขอตรวจวิเคราะห์',
    short: 'รับคำขอ',
    icon: 'assignment_turned_in',
    manual: '§2.1.2',
    hint: 'ใบคำขอมาถึงห้องปฏิบัติการแล้ว — ยังไม่ได้รับตัวอย่าง',
    /* Which pipeline statuses can be worked at this stage. */
    statuses: ['requested'],
  },
  {
    key: 'preliminary',
    label: 'รับสิ่งส่งตรวจเบื้องต้น',
    short: 'รับเบื้องต้น',
    icon: 'inventory_2',
    manual: '§2.1.4',
    hint: 'ตัวอย่างมาถึงจุดรับของห้องปฏิบัติการ — ตรวจคุณภาพและปริมาณ',
    statuses: ['requested', 'collect'],
  },
  {
    key: 'bench',
    label: 'รับสิ่งส่งตรวจที่งาน',
    short: 'รับที่งาน',
    icon: 'biotech',
    manual: '§2.1.5',
    hint: 'ตัวอย่างถึงกลุ่มงานที่จะตรวจจริง — พร้อมขึ้นเครื่อง',
    statuses: ['collect'],
  },
];

export const LAB_RECEIVE_STAGE_BY_KEY = Object.fromEntries(
  LAB_RECEIVE_STAGES.map((s) => [s.key, s]),
);

/* The legacy screen's four-way disposition per row. Not a boolean: "รอ" and
   "ตรวจเพิ่ม" are the two the bench uses most and neither is expressible as
   accept/reject.

     รับ       — accepted, moves on
     ปฏิเสธ    — refused; needs a reason from LAB_REJECT_REASONS
     รอ        — held at this counter (waiting for a missing form, a second
                 tube, or the ward to call back). Not a refusal — the
                 specimen stays and the clock keeps running.
     ตรวจเพิ่ม — accepted, and the ward has asked for an extra test on the
                 same specimen; the added test must be named.

   `advances` marks the dispositions that move the order forward in the
   pipeline. `needsReason` / `needsAddOn` drive the form's validation. */
export const LAB_RECEIVE_DISPOSITIONS = [
  { key: 'accept', label: 'รับ',       icon: 'check_circle', color: 'success', advances: true,  needsReason: false, needsAddOn: false },
  { key: 'reject', label: 'ปฏิเสธ',    icon: 'block',        color: 'error',   advances: false, needsReason: true,  needsAddOn: false },
  { key: 'hold',   label: 'รอ',        icon: 'pause_circle', color: 'warning', advances: false, needsReason: false, needsAddOn: false },
  { key: 'addon',  label: 'ตรวจเพิ่ม', icon: 'add_circle',   color: 'info',    advances: true,  needsReason: false, needsAddOn: true },
];

export const LAB_RECEIVE_DISPOSITION_BY_KEY = Object.fromEntries(
  LAB_RECEIVE_DISPOSITIONS.map((d) => [d.key, d]),
);

/* หน่วยวัดปริมาณที่เก็บ — the legacy form pairs a number with a unit, and
   the unit is not always mL (a 24-hour urine is counted in mL but a swab is
   counted in ชิ้น and a slide in แผ่น). */
export const LAB_RECEIVE_UNITS = ['mL', 'หลอด', 'ขวด', 'ชิ้น', 'แผ่น', 'ถ้วย'];

/* ผู้รับ — the receiving clerk roster. No auth layer exists, so this is the
   pick-list the header uses instead of resolving a session. */
export const LAB_RECEIVERS = [
  { key: 'r1', name: 'ทนพ.ญ. อารีย์ วงศ์สุข',  position: 'นักเทคนิคการแพทย์ชำนาญการ' },
  { key: 'r2', name: 'ทนพ. ธนกฤต ศรีสมบูรณ์',  position: 'นักเทคนิคการแพทย์ปฏิบัติการ' },
  { key: 'r3', name: 'นางสาว ปิยะดา ทองแท้',    position: 'เจ้าพนักงานวิทยาศาสตร์การแพทย์' },
  { key: 'r4', name: 'นาย สมชาย ใจดี',          position: 'พนักงานช่วยเหลือคนไข้ (จุดรับตัวอย่าง)' },
];

/* ─────────────────────────────────────────────────────────────────────────
   RECEIPT STORE

   One receipt per (orderRowId, stage). Keyed as `${id}::${stage}` so a
   specimen can carry a preliminary receipt and a bench receipt at once —
   which is exactly what the legacy four-screen chain produced, and what
   makes "รับเบื้องต้นแล้วแต่ยังไม่ถึงงาน" a state anyone can see. */
const receipts = new Map();
const listeners = new Set();

export const subscribeReceipts = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const notify = () => listeners.forEach((fn) => fn());

const keyOf = (id, stage) => `${id}::${stage}`;

export const getReceipt = (id, stage) => receipts.get(keyOf(id, stage)) ?? null;

export const receiptsFor = (id) => LAB_RECEIVE_STAGES
  .map((s) => ({ stage: s.key, receipt: receipts.get(keyOf(id, s.key)) ?? null }))
  .filter((r) => r.receipt);

/* Seeded so the station is not empty on first load — two specimens already
   received preliminarily, one held waiting for a repeat draw. */
const seed = (id, stage, receipt) => receipts.set(keyOf(id, stage), {
  id, stage, ...receipt, history: [],
});

seed('LAB-0006', 'preliminary', {
  disposition: 'accept', quantity: 3, unit: 'mL', serialNo: 'SN-690731-0041',
  receivedBy: 'นางสาว ปิยะดา ทองแท้', receivedAt: '2026-07-31 07:12',
  qualityOk: true, qualityNote: '', canProceed: true, addOnTest: '',
});
seed('LAB-0007', 'preliminary', {
  disposition: 'accept', quantity: 5, unit: 'mL', serialNo: 'SN-690731-0042',
  receivedBy: 'นางสาว ปิยะดา ทองแท้', receivedAt: '2026-07-31 07:12',
  qualityOk: true, qualityNote: '', canProceed: true, addOnTest: '',
});
seed('LAB-0016', 'preliminary', {
  disposition: 'hold', quantity: 1, unit: 'mL', serialNo: 'SN-690731-0038',
  receivedBy: 'นาย สมชาย ใจดี', receivedAt: '2026-07-31 06:40',
  qualityOk: false,
  qualityNote: 'ปริมาณเลือดไม่พอต่อการตรวจ — ประสานคลินิกเบาหวานให้เจาะเพิ่ม',
  canProceed: false, addOnTest: '',
});

/* ─────────────────────────────────────────────────────────────────────────
   VALIDATION

   Mirrors the legacy form's own rules rather than inventing new ones:
     • ปริมาณที่เก็บ must be a positive number and must carry a unit before
       รับ can be applied — a receipt that says "received" without saying how
       much was received cannot be audited afterwards.
     • ปฏิเสธ needs a reason (the same fixed vocabulary the worklist uses).
     • ตรวจเพิ่ม must name the test being added, otherwise nobody downstream
       knows what to run.
     • The quality assessment, once marked "ไม่เหมาะสม", must say why —
       the legacy form's "ไม่สามารถดำเนินการตรวจได้เพราะ …" line. */
export const validateReceiptDraft = (draft) => {
  const errors = {};
  const d = LAB_RECEIVE_DISPOSITION_BY_KEY[draft?.disposition];
  if (!d) errors.disposition = 'ต้องเลือกผลการรับ';

  if (draft?.disposition === 'accept' || draft?.disposition === 'addon') {
    const q = Number(draft?.quantity);
    if (!Number.isFinite(q) || q <= 0) errors.quantity = 'ปริมาณที่เก็บต้องมากกว่า 0';
    if (!draft?.unit) errors.unit = 'ต้องระบุหน่วย';
  }
  if (d?.needsReason && !draft?.rejectReason) errors.rejectReason = 'ต้องระบุเหตุผลการปฏิเสธ';
  if (d?.needsAddOn && !String(draft?.addOnTest ?? '').trim()) errors.addOnTest = 'ต้องระบุรายการที่ขอตรวจเพิ่ม';
  if (draft?.qualityOk === false && !String(draft?.qualityNote ?? '').trim()) {
    errors.qualityNote = 'ต้องระบุเหตุผลที่ไม่สามารถดำเนินการตรวจได้';
  }
  if (!String(draft?.receivedBy ?? '').trim()) errors.receivedBy = 'ต้องระบุผู้รับ';
  if (!String(draft?.receivedAt ?? '').trim()) errors.receivedAt = 'ต้องระบุวัน-เวลาที่รับ';

  return { ok: Object.keys(errors).length === 0, errors };
};

/* ─────────────────────────────────────────────────────────────────────────
   APPLY / AMEND / CANCEL

   All four verbs the TOR asks of every "แสดง/บันทึก/ยกเลิก/แก้ไข" leaf:
   applyReceipt (บันทึก), amendReceipt (แก้ไข), cancelReceipt (ยกเลิก), and
   getReceipt/receiptsFor (แสดง). Each writes actor + timestamp, and amend
   keeps the superseded version rather than overwriting it. */
export const applyReceipt = (row, draft, { actor } = {}) => {
  const check = validateReceiptDraft(draft);
  if (!check.ok) return { ok: false, errors: check.errors };

  const stage = draft.stage;
  const prev = getReceipt(row.id, stage);
  const record = {
    id: row.id,
    stage,
    disposition: draft.disposition,
    quantity: Number(draft.quantity) || 0,
    unit: draft.unit ?? '',
    serialNo: draft.serialNo ?? '',
    receivedBy: draft.receivedBy,
    receivedAt: draft.receivedAt,
    receiverPosition: draft.receiverPosition ?? '',
    rejectReason: draft.rejectReason ?? '',
    addOnTest: draft.addOnTest ?? '',
    qualityOk: draft.qualityOk !== false,
    qualityNote: draft.qualityNote ?? '',
    canProceed: draft.qualityOk !== false && draft.disposition !== 'reject' && draft.disposition !== 'hold',
    cancelled: false,
    history: prev ? [...(prev.history ?? []), { ...prev, supersededAt: new Date().toISOString() }] : [],
  };
  receipts.set(keyOf(row.id, stage), record);

  /* The receipt drives the ORDER only where the legacy flow says it does.
     Accepting at the bench is what puts a specimen on the analyser; a
     preliminary receipt does not, because the specimen is still in a rack
     at the counter. */
  if (draft.disposition === 'reject') {
    const reason = LAB_REJECT_REASON_BY_KEY[draft.rejectReason];
    updateLabOrder(row.id, {
      status: 'collect',
      exception: reason?.redrawRequired ? 'redraw' : 'rejected',
      rejectReason: reason?.label ?? draft.rejectReason,
      /* Preserved verbatim from LabQueuePage's own reject path: an
         unlabelled or mislabelled tube can never be salvaged by sticking a
         new label on it, so the batch path must not bypass this either. */
      labeled: reason?.patientSafety ? false : row.labeled,
    });
  } else if (draft.disposition === 'hold') {
    updateLabOrder(row.id, { status: 'collect', exception: 'hold', rejectReason: draft.qualityNote || 'รอดำเนินการที่จุดรับสิ่งส่งตรวจ' });
  } else if (stage === 'bench') {
    updateLabOrder(row.id, { status: 'analysing', exception: undefined, labeled: true });
  } else if (stage === 'preliminary') {
    updateLabOrder(row.id, { status: 'collect', exception: undefined, labeled: true });
  }

  appendLabAudit({
    actor: actor ?? draft.receivedBy,
    scope: 'receive',
    action: `บันทึกรับสิ่งส่งตรวจ — ${LAB_RECEIVE_STAGE_BY_KEY[stage]?.label ?? stage}`,
    detail: `${row.accessionNo} · ${row.testLabel} — ${LAB_RECEIVE_DISPOSITION_BY_KEY[draft.disposition]?.label}`
      + (draft.rejectReason ? ` (${LAB_REJECT_REASON_BY_KEY[draft.rejectReason]?.label ?? draft.rejectReason})` : '')
      + (draft.addOnTest ? ` · ตรวจเพิ่ม: ${draft.addOnTest}` : ''),
    before: prev ? { disposition: prev.disposition } : null,
    after: { disposition: record.disposition, quantity: record.quantity, unit: record.unit },
  });

  notify();
  return { ok: true, record };
};

/* แก้ไขการรับ — same shape as apply, but says so in the trail. */
export const amendReceipt = (row, draft, { actor } = {}) => {
  const result = applyReceipt(row, draft, { actor });
  if (result.ok) {
    appendLabAudit({
      actor: actor ?? draft.receivedBy,
      scope: 'receive',
      action: 'แก้ไขการรับสิ่งส่งตรวจ',
      detail: `${row.accessionNo} · ${row.testLabel} — ${LAB_RECEIVE_STAGE_BY_KEY[draft.stage]?.label}`,
    });
  }
  return result;
};

/* ยกเลิกการรับ — the receipt is retained and flagged, never deleted: a
   receipt that vanishes leaves a specimen that was demonstrably in the
   building with no record of how it got there. */
export const cancelReceipt = (row, stage, { actor, reason } = {}) => {
  const prev = getReceipt(row.id, stage);
  if (!prev || prev.cancelled) return false;
  receipts.set(keyOf(row.id, stage), {
    ...prev,
    cancelled: true,
    cancelReason: reason ?? '',
    cancelledBy: actor ?? '',
    cancelledAt: new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }),
  });
  /* Return the order to the stage it was at before this receipt advanced it. */
  if (stage === 'bench') updateLabOrder(row.id, { status: 'collect' });
  appendLabAudit({
    actor,
    scope: 'receive',
    action: 'ยกเลิกการรับสิ่งส่งตรวจ',
    detail: `${row.accessionNo} · ${row.testLabel} — ${LAB_RECEIVE_STAGE_BY_KEY[stage]?.label}${reason ? ` (${reason})` : ''}`,
    before: { disposition: prev.disposition },
    after: { cancelled: true },
  });
  notify();
  return true;
};

/* ─────────────────────────────────────────────────────────────────────────
   DERIVED VIEWS */

/* Which rows are waiting at a given stage. A row already accepted at that
   stage drops out of its own worklist — otherwise the counter never empties
   and nobody can tell what is left to do. */
export const rowsWaitingAt = (rows, stage) => {
  const def = LAB_RECEIVE_STAGE_BY_KEY[stage];
  if (!def) return [];
  return rows.filter((r) => {
    if (!def.statuses.includes(r.status)) return false;
    const rc = getReceipt(r.id, stage);
    if (!rc || rc.cancelled) return true;
    /* A held row stays visible at its counter — that is the point of รอ. */
    return rc.disposition === 'hold';
  });
};

/* รวมจำนวนสิ่งส่งตรวจ — the legacy footer roll-up, counted per SPECIMEN
   type (tube), never per test row: two tests drawn into one EDTA tube are
   one specimen, and reporting two would overstate the day's workload. */
export const summariseSpecimens = (rows = []) => {
  const byTube = new Map();
  const seen = new Set();
  rows.forEach((r) => {
    const tubeKey = r.tube?.key ?? 'unknown';
    if (!byTube.has(tubeKey)) {
      byTube.set(tubeKey, { tube: r.tube, tubeLabel: r.tube?.thai ?? 'ไม่ระบุชนิด', specimens: 0, tests: 0, volumeMl: 0 });
    }
    const g = byTube.get(tubeKey);
    g.tests += 1;
    const acc = `${tubeKey}::${r.accessionNo}`;
    if (!seen.has(acc)) {
      seen.add(acc);
      g.specimens += 1;
      g.volumeMl += r.volumeMl ?? 0;
    }
  });
  const groups = [...byTube.values()].sort((a, b) => b.specimens - a.specimens);
  return {
    groups,
    totalSpecimens: groups.reduce((s, g) => s + g.specimens, 0),
    totalTests: groups.reduce((s, g) => s + g.tests, 0),
  };
};

/* Convenience for the worklist's stage badge — the furthest stage a row has
   a live (non-cancelled, non-held) receipt for. */
export const receiveStageOf = (id) => {
  for (let i = LAB_RECEIVE_STAGES.length - 1; i >= 0; i -= 1) {
    const rc = getReceipt(id, LAB_RECEIVE_STAGES[i].key);
    if (rc && !rc.cancelled && rc.disposition !== 'hold') return LAB_RECEIVE_STAGES[i];
  }
  return null;
};

/* Rows the receive station could ever touch — used by the summary cards so
   they count against a stable denominator rather than the current tab. */
export const receivableRows = (rows = []) => rows.filter(
  (r) => r.status === 'requested' || r.status === 'collect',
);

export const allOrderRows = () => LAB_ORDERS;
