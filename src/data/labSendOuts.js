import { updateLabOrder } from '@/data/labOrders';
import { appendLabAudit } from '@/data/labAudit';

/* ส่งตรวจภายนอก (lab-out) — TOR ภาคผนวก ก §1.15.6.2
   "สามารถบันทึกผลตรวจที่ส่งตรวจกับหน่วยงานภายนอกได้".

   The clause reads as one requirement but is two halves, and only the
   second one existed before this file: LabResultEntryPage already records
   the outside lab's reference number for an order sitting in status
   'external'. Nothing anywhere could put an order INTO that status —
   `externalLab` and `sentOutAt` were seed-only fields on the mock rows.

   The missing half is the legacy manual's §2.1.3 "บันทึกส่งคำขอไปหน่วยงาน
   ที่ตรวจ" (~/MIH-Docs-Vault/คู่มือระบบงาน/คู่มือระบบชันสูตรโรค.pdf): select
   the requests this lab cannot run, name the receiving หน่วยงาน and the
   person carrying them, confirm against a summary grouped by ประเภทงาน with
   a รวมจำนวนสิ่งส่งตรวจ block, and print a manifest that travels with the
   cool box.

   All order-status writes go through `updateLabOrder` so LabQueuePage's
   subscribeOrders re-render picks them up — there is exactly one order
   store and this file does not shadow it. */

/* หน่วยงานภายนอกที่ส่งตรวจ — the referral labs a กทม. health centre
   actually uses. `turnaroundDays` is what the expected-return date defaults
   to, and what "เกินกำหนด" on the returned tab is measured against.
   `courier` records how specimens physically travel, because a courier
   pickup window is the constraint that decides whether today's draw makes
   today's run. */
export const LAB_EXTERNAL_LABS = [
  {
    key: 'central',
    name: 'ศูนย์แล็บกลาง กทม. (สำนักอนามัย)',
    short: 'ศูนย์แล็บกลาง กทม.',
    contact: '0 2245 xxxx ต่อ 1204',
    courier: 'รถรับ-ส่งสำนักอนามัย รอบ 10:00 และ 15:00 น.',
    turnaroundDays: 2,
    scope: 'เคมีคลินิก · โลหิตวิทยา · น้ำเหลืองวิทยา',
  },
  {
    key: 'nih',
    name: 'กรมวิทยาศาสตร์การแพทย์ (สถาบันวิจัยวิทยาศาสตร์สาธารณสุข)',
    short: 'กรมวิทยาศาสตร์การแพทย์',
    contact: '0 2951 xxxx',
    courier: 'ส่งโดยเจ้าหน้าที่ศูนย์ฯ (นัดล่วงหน้า 1 วัน)',
    turnaroundDays: 7,
    scope: 'ยืนยันผล Anti-HIV · เพาะเชื้อเฉพาะทาง · ตรวจยืนยันสารเสพติด',
  },
  {
    key: 'ref-hosp',
    name: 'โรงพยาบาลกลาง (ห้องปฏิบัติการอ้างอิง)',
    short: 'โรงพยาบาลกลาง',
    contact: '0 2220 xxxx ต่อ 3311',
    courier: 'รถโรงพยาบาลกลาง รอบ 13:00 น.',
    turnaroundDays: 3,
    scope: 'จุลชีววิทยา · ธนาคารเลือด · พยาธิวิทยา',
  },
  {
    key: 'private',
    name: 'ห้องปฏิบัติการเอกชนคู่สัญญา (N Health)',
    short: 'ห้องปฏิบัติการเอกชน',
    contact: '0 2011 xxxx',
    courier: 'พนักงานรับตัวอย่างเข้ารับทุกวัน 16:00 น.',
    turnaroundDays: 2,
    scope: 'รายการที่ศูนย์ฯ ไม่มีเครื่องตรวจ',
  },
];

export const LAB_EXTERNAL_LAB_BY_KEY = Object.fromEntries(
  LAB_EXTERNAL_LABS.map((l) => [l.key, l]),
);

/* ผู้นำส่ง — who physically carried the box. Named, because a specimen that
   never arrived has to be traceable to a person, not to "the courier". */
export const LAB_COURIERS = [
  'นาย สมชาย ใจดี (พนักงานเปล)',
  'นางสาว ปิยะดา ทองแท้ (จพ.วิทยาศาสตร์การแพทย์)',
  'รถรับ-ส่งสำนักอนามัย (รอบเช้า)',
  'รถรับ-ส่งสำนักอนามัย (รอบบ่าย)',
  'พนักงานรับตัวอย่างของหน่วยงานภายนอก',
];

/* เหตุผลที่ต้องส่งตรวจภายนอก — fixed vocabulary for the same reason the
   rejection reasons are: it feeds a capability gap report ("ศูนย์ฯ นี้ส่ง
   HbA1c ออกทุกเดือน" is a case for buying an analyser, not a note). */
export const LAB_SENDOUT_REASONS = [
  { key: 'no-capability', label: 'ศูนย์บริการฯ ไม่มีเครื่อง/น้ำยาสำหรับรายการนี้' },
  { key: 'confirm',       label: 'ส่งยืนยันผล (Confirmatory test)' },
  { key: 'analyzer-down', label: 'เครื่องตรวจวิเคราะห์ขัดข้อง / รอสอบเทียบ' },
  { key: 'reagent-out',   label: 'น้ำยาตรวจหมด / รอเบิก' },
  { key: 'qc-fail',       label: 'QC ไม่ผ่าน — ยังตรวจในหน่วยงานไม่ได้' },
  { key: 'volume',        label: 'ปริมาณงานเกินกำลังของหน่วยงาน' },
];

export const LAB_SENDOUT_REASON_BY_KEY = Object.fromEntries(
  LAB_SENDOUT_REASONS.map((r) => [r.key, r]),
);

/* ─────────────────────────────────────────────────────────────────────────
   SEND-OUT RECORD STORE

   One record per order ROW that has been sent out. Keyed by row id, since
   an order's tests can legitimately go to different outside labs (an
   Anti-HIV confirmation to กรมวิทยาศาสตร์การแพทย์ while its CBC stays
   in-house). */
const records = new Map();
const listeners = new Set();

export const subscribeSendOuts = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const notify = () => listeners.forEach((fn) => fn());

let batchSeq = 0;

export const getSendOut = (id) => records.get(id) ?? null;
export const allSendOuts = () => [...records.values()];

/* Seeded to match the two rows labOrders.js already ships in status
   'external' (LAB-0004 / LAB-0005, ORD-243 → ศูนย์แล็บกลาง กทม.), so the
   "ส่งออกแล้ว / รอผลกลับ" tab is populated on first load and the seed rows
   are not orphans with a status but no record behind it. */
records.set('LAB-0004', {
  id: 'LAB-0004', batchNo: 'SO-690731-001', labKey: 'central',
  labName: 'ศูนย์แล็บกลาง กทม. (สำนักอนามัย)',
  courier: 'รถรับ-ส่งสำนักอนามัย (รอบเช้า)',
  sentAt: '2026-07-31 06:10', expectedAt: '2026-08-02',
  reason: 'no-capability', note: 'ส่งพร้อม Lipid profile ในกล่องเดียวกัน',
  previousStatus: 'analysing', returned: false, cancelled: false,
});
records.set('LAB-0005', {
  id: 'LAB-0005', batchNo: 'SO-690731-001', labKey: 'central',
  labName: 'ศูนย์แล็บกลาง กทม. (สำนักอนามัย)',
  courier: 'รถรับ-ส่งสำนักอนามัย (รอบเช้า)',
  sentAt: '2026-07-31 06:10', expectedAt: '2026-08-02',
  reason: 'no-capability', note: '',
  previousStatus: 'analysing', returned: false, cancelled: false,
});

/* ─────────────────────────────────────────────────────────────────────────
   VALIDATION — the legacy form's own required set, plus one rule it implies
   but does not state: an expected-return date cannot precede the send date,
   which is the single most common keying slip on a two-date form. */
export const validateSendOutDraft = (draft) => {
  const errors = {};
  if (!draft?.labKey) errors.labKey = 'ต้องเลือกหน่วยงานภายนอก';
  if (!String(draft?.courier ?? '').trim()) errors.courier = 'ต้องระบุผู้นำส่ง';
  if (!String(draft?.sentAt ?? '').trim()) errors.sentAt = 'ต้องระบุวัน-เวลาที่ส่ง';
  if (!String(draft?.expectedAt ?? '').trim()) errors.expectedAt = 'ต้องระบุวันที่คาดว่าจะได้ผล';
  if (!draft?.reason) errors.reason = 'ต้องระบุเหตุผลที่ส่งตรวจภายนอก';

  const sentDate = String(draft?.sentAt ?? '').slice(0, 10);
  if (sentDate && draft?.expectedAt && draft.expectedAt < sentDate) {
    errors.expectedAt = 'วันที่คาดว่าจะได้ผลต้องไม่ก่อนวันที่ส่ง';
  }
  return { ok: Object.keys(errors).length === 0, errors };
};

/* ยืนยันส่งคำขอ — flips every selected row to 'external' and stamps one
   batch number across them, so the printed manifest and the returned rows
   can be matched back to a single physical box. */
export const confirmSendOut = (rows, draft, { actor } = {}) => {
  const check = validateSendOutDraft(draft);
  if (!check.ok || !rows.length) {
    return { ok: false, errors: check.errors, batchNo: null };
  }
  batchSeq += 1;
  const stamp = String(draft.sentAt ?? '').slice(0, 10).replace(/-/g, '').slice(2);
  const batchNo = `SO-${stamp || '690731'}-${String(100 + batchSeq).slice(1)}`;
  const lab = LAB_EXTERNAL_LAB_BY_KEY[draft.labKey];

  rows.forEach((row) => {
    records.set(row.id, {
      id: row.id,
      batchNo,
      labKey: draft.labKey,
      labName: lab?.name ?? draft.labKey,
      courier: draft.courier,
      sentAt: draft.sentAt,
      expectedAt: draft.expectedAt,
      reason: draft.reason,
      note: draft.note ?? '',
      /* Kept so ยกเลิกการส่งออก can put the row back where it came from
         rather than guessing a status. */
      previousStatus: row.status,
      returned: false,
      cancelled: false,
      sentBy: actor ?? '',
    });
    updateLabOrder(row.id, {
      status: 'external',
      externalLab: lab?.short ?? lab?.name ?? draft.labKey,
      sentOutAt: draft.sentAt,
      exception: undefined,
    });
  });

  appendLabAudit({
    actor,
    scope: 'sendout',
    action: 'ยืนยันส่งคำขอตรวจภายนอก',
    detail: `${batchNo} · ${rows.length} รายการ → ${lab?.short ?? draft.labKey} · ผู้นำส่ง ${draft.courier}`,
    after: { batchNo, labKey: draft.labKey, count: rows.length },
  });

  notify();
  return { ok: true, batchNo, errors: {} };
};

/* ยกเลิกการส่งออก — returns the row to the status it held before the send,
   with a mandatory reason. Never a dead end: a cancelled send-out has to
   land the specimen back in someone's worklist or it is simply lost. */
export const cancelSendOut = (row, { reason, actor } = {}) => {
  const rec = records.get(row.id);
  if (!rec || rec.cancelled || !String(reason ?? '').trim()) return false;
  records.set(row.id, {
    ...rec,
    cancelled: true,
    cancelReason: reason,
    cancelledBy: actor ?? '',
    cancelledAt: new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }),
  });
  updateLabOrder(row.id, {
    status: rec.previousStatus ?? 'analysing',
    externalLab: undefined,
    sentOutAt: undefined,
  });
  appendLabAudit({
    actor,
    scope: 'sendout',
    action: 'ยกเลิกการส่งตรวจภายนอก',
    detail: `${row.accessionNo} · ${row.testLabel} — ${reason}`,
    before: { status: 'external', batchNo: rec.batchNo },
    after: { status: rec.previousStatus ?? 'analysing' },
  });
  notify();
  return true;
};

/* บันทึกว่าได้รับผลกลับแล้ว — marks the record returned. The VALUES are
   still keyed on the result-entry screen (where the externalRef field
   already waits); this only closes the outstanding-days clock. */
export const markReturned = (row, { at, actor } = {}) => {
  const rec = records.get(row.id);
  if (!rec) return false;
  records.set(row.id, { ...rec, returned: true, returnedAt: at ?? new Date().toISOString().slice(0, 10) });
  appendLabAudit({
    actor,
    scope: 'sendout',
    action: 'บันทึกรับผลกลับจากหน่วยงานภายนอก',
    detail: `${row.accessionNo} · ${row.testLabel} — ${rec.labName}`,
  });
  notify();
  return true;
};

/* ─────────────────────────────────────────────────────────────────────────
   DERIVED VIEWS */

/* Days a sent specimen has been outstanding, and whether that is past the
   date the outside lab promised. `today` is passed in so nothing here needs
   a clock and the mock stays reproducible. */
export const outstandingDays = (rec, today) => {
  if (!rec?.sentAt) return null;
  const sent = new Date(String(rec.sentAt).slice(0, 10));
  const now = new Date(today);
  if (Number.isNaN(sent.getTime()) || Number.isNaN(now.getTime())) return null;
  return Math.max(0, Math.round((now - sent) / 86400000));
};

export const isOverdueReturn = (rec, today) => {
  if (!rec || rec.returned || rec.cancelled || !rec.expectedAt) return false;
  return rec.expectedAt < today;
};

/* The confirmation summary the legacy screen shows before committing —
   grouped by ประเภทงาน (the catalog's LAB_GROUPS) with a per-specimen-type
   roll-up underneath. Both halves matter: the group grouping is what the
   receiving lab's paperwork is organised by, and the specimen count is what
   the person packing the cool box counts against. */
export const summariseSendOut = (rows = []) => {
  const byGroup = new Map();
  rows.forEach((r) => {
    const key = r.group ?? 'unknown';
    if (!byGroup.has(key)) {
      byGroup.set(key, { key, label: r.groupLabel || 'ไม่ระบุกลุ่มตรวจ', rows: [] });
    }
    byGroup.get(key).rows.push(r);
  });

  const bySpecimen = new Map();
  const seenAccessions = new Set();
  rows.forEach((r) => {
    const key = r.tube?.key ?? 'unknown';
    if (!bySpecimen.has(key)) {
      bySpecimen.set(key, { key, label: r.tube?.thai ?? 'ไม่ระบุชนิด', color: r.tubeColor, specimens: 0, tests: 0 });
    }
    const g = bySpecimen.get(key);
    g.tests += 1;
    if (!seenAccessions.has(r.accessionNo)) {
      seenAccessions.add(r.accessionNo);
      g.specimens += 1;
    }
  });

  const specimenGroups = [...bySpecimen.values()];
  return {
    groups: [...byGroup.values()],
    specimenGroups,
    totalTests: rows.length,
    totalSpecimens: specimenGroups.reduce((s, g) => s + g.specimens, 0),
    totalPrice: rows.reduce((s, r) => s + (r.price ?? 0), 0),
  };
};

/* Which rows are candidates for sending out. Anything already reported has
   no reason to travel, and anything already external is on the other tab. */
export const sendableRows = (rows = []) => rows.filter(
  (r) => r.status !== 'external' && r.status !== 'reported' && !r.bedside,
);

export const sentRows = (rows = []) => rows.filter((r) => {
  const rec = records.get(r.id);
  return rec && !rec.cancelled;
});
