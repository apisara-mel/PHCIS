import { appendLabAudit } from '@/data/labAudit';

/* ทะเบียนค่าวิกฤต — the register that closes the OTHER half of the
   critical-value loop.

   LabResultEntryPage already enforces the LABORATORY half of the loop
   (LabResultEntryPage.jsx L505–580): a panic value cannot be released until
   ผู้รับแจ้ง + เวลา + ผู้แจ้ง + read-back are all recorded. That is the lab
   proving it made the call.

   What has never existed anywhere is the CLINICAL half: a named person
   acknowledging, at a recorded time, that they received the value and what
   they did about it. Standard practice (and every hospital accreditation
   checklist) treats an un-acknowledged critical value as an open incident,
   not a closed one — the call may have been taken by someone who never
   passed it on.

   The natural home for that acknowledgement is the ordering doctor's own
   screen, which lives in `src/pages/treat` — a directory this module is
   forbidden to touch. So the register lives on the LAB side instead: the
   lab can see, at a glance, which of its calls have been acknowledged and
   which are still hanging, and can record the acknowledgement when the
   doctor calls back. That is a deliberate workaround, not the end state; a
   later wave should surface the same records inside the doctor's worklist.

   Records are written by LabResultEntryPage on รับรองผล, and read by
   src/components/lab/LabCriticalLogPanel.jsx (the drawer behind the
   worklist's ค่าวิกฤต summary card). */

/* Minutes after which an unacknowledged critical value stops being "waiting"
   and becomes an incident. 30 minutes is the interval most Thai hospital
   critical-value policies use for the read-back-to-acknowledgement window;
   past it, the row goes destructive and the queue card counts it. */
export const CRITICAL_ESCALATE_MINUTES = 30;

/* ผู้รับทราบ — who can acknowledge. No auth layer exists, so this is the
   pick-list the form uses instead of resolving a session. Deliberately
   includes the ward nurse: in practice a night-shift critical value is
   acknowledged by the nurse who then pages the doctor, and recording
   "พยาบาลเวร" honestly is better than recording a doctor who never spoke. */
export const LAB_ACKNOWLEDGERS = [
  { key: 'a1', name: 'พญ. ศิริพร วัฒนกิจ',      position: 'นายแพทย์ชำนาญการ · OPD อายุรกรรม' },
  { key: 'a2', name: 'นพ. กิตติพงษ์ เรืองศรี',   position: 'นายแพทย์ปฏิบัติการ · ER' },
  { key: 'a3', name: 'พญ. ณัฐกานต์ พูนสวัสดิ์',  position: 'นายแพทย์ชำนาญการ · คลินิกเบาหวาน' },
  { key: 'a4', name: 'พว. สุนีย์ แจ่มใส',        position: 'พยาบาลวิชาชีพชำนาญการ (เวรตรวจ)' },
];

/* Suggestions for the free-text response field. Every one of these is an
   action a clinician actually takes on a panic value, so the suggestion
   list doubles as a prompt for what the lab should be asking on the phone. */
export const CRITICAL_RESPONSE_SUGGESTIONS = [
  'รับทราบ — สั่งตรวจซ้ำเพื่อยืนยันค่า',
  'รับทราบ — ให้ผู้ป่วยกลับมาโรงพยาบาลทันที',
  'รับทราบ — ติดต่อผู้ป่วยทางโทรศัพท์แล้ว นัดพบแพทย์วันนี้',
  'รับทราบ — ส่งต่อห้องฉุกเฉินเพื่อดูแลทันที',
  'รับทราบ — ปรับยาและนัดติดตามผลภายใน 3 วัน',
  'รับทราบ — สงสัยตัวอย่างผิดพลาด ขอให้เจาะเลือดใหม่',
  'รับทราบ — แจ้งแพทย์เจ้าของไข้ต่อแล้ว',
];

const records = new Map();
const listeners = new Set();

export const subscribeCritical = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const notify = () => listeners.forEach((fn) => fn());

let seq = 0;

const clockLabel = (d) => d.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });

/* Seeded relative to module load rather than to a pinned date, because the
   whole point of this register is an AGE — a fixture stamped 2026-07-31
   would read as "1,000 นาที" forever and the escalation state would never be
   distinguishable from the normal one. Two records: one comfortably inside
   the 30-minute window, one well past it, so both states are on screen at
   first load. */
const seedAt = (minutesAgo) => new Date(Date.now() - minutesAgo * 60000);

const seed = (rec) => {
  seq += 1;
  const found = seedAt(rec.minutesAgo);
  records.set(rec.id, {
    ...rec,
    foundAtIso: found.toISOString(),
    foundAtLabel: clockLabel(found),
    acknowledged: false,
    cancelled: false,
    history: [],
  });
};

seed({
  id: 'CRIT-0001',
  minutesAgo: 12,
  rowId: 'LAB-0001',
  accessionNo: 'L69-0712',
  orderId: 'ORD-241',
  testLabel: 'Electrolytes',
  patientName: 'ประสงค์ ทองสุข',
  hn: '69-00412',
  confidential: false,
  doctor: 'พญ. ศิริพร วัฒนกิจ',
  location: 'ER',
  valueSummary: 'K⁺ 6.8 mmol/L (ค่าวิกฤตสูง ≥ 6.0)',
  notifiedTo: 'พญ. ศิริพร วัฒนกิจ',
  notifiedBy: 'ทนพ. ธนกฤต ศรีสมบูรณ์',
  notifiedAt: '08:41',
  readBack: true,
  note: 'แจ้งทางโทรศัพท์ภายใน 1234',
});

seed({
  id: 'CRIT-0002',
  minutesAgo: 48,
  rowId: 'LAB-0016',
  accessionNo: 'L69-0731',
  orderId: 'ORD-255',
  testLabel: 'FBS',
  patientName: 'บุญเรือน สายทอง',
  hn: '69-00588',
  confidential: false,
  doctor: 'พญ. ณัฐกานต์ พูนสวัสดิ์',
  location: 'คลินิกเบาหวาน',
  valueSummary: 'FBS 428 mg/dL (ค่าวิกฤตสูง ≥ 400)',
  notifiedTo: 'พว. สุนีย์ แจ่มใส',
  notifiedBy: 'ทนพ.ญ. อารีย์ วงศ์สุข',
  notifiedAt: '08:05',
  readBack: true,
  note: 'แพทย์ออกตรวจ — ฝากพยาบาลเวรแจ้งต่อ',
});

/* ─────────────────────────────────────────────────────────────────────────
   READ */

export const allCriticalRecords = () => [...records.values()]
  .filter((r) => !r.cancelled)
  .sort((a, b) => (a.foundAtIso < b.foundAtIso ? 1 : -1));

export const criticalRecordFor = (rowId) =>
  allCriticalRecords().find((r) => r.rowId === rowId) ?? null;

/* Minutes since the value was found. `now` is injectable so a caller that
   already has a ticking clock does not create a second one. */
export const criticalAgeMinutes = (rec, now = Date.now()) => {
  if (!rec?.foundAtIso) return 0;
  const t = new Date(rec.foundAtIso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.round((now - t) / 60000));
};

/* Only an OPEN record escalates. An acknowledged value that took 90 minutes
   is a quality-review item, not a live alarm, and colouring it destructive
   forever would train people to ignore the colour. */
export const isCriticalEscalated = (rec, now = Date.now()) =>
  !rec?.acknowledged && criticalAgeMinutes(rec, now) >= CRITICAL_ESCALATE_MINUTES;

export const openCriticalRecords = () => allCriticalRecords().filter((r) => !r.acknowledged);
export const acknowledgedCriticalRecords = () => allCriticalRecords().filter((r) => r.acknowledged);

export const summariseCritical = (now = Date.now()) => {
  const all = allCriticalRecords();
  const open = all.filter((r) => !r.acknowledged);
  return {
    total: all.length,
    open: open.length,
    acknowledged: all.length - open.length,
    escalated: open.filter((r) => isCriticalEscalated(r, now)).length,
  };
};

/* ─────────────────────────────────────────────────────────────────────────
   WRITE

   openCriticalRecord is called by LabResultEntryPage at the moment รับรองผล
   succeeds on a result with a panic value. It is idempotent per order row:
   re-releasing an amended critical result updates the same register entry
   rather than opening a second one, because it is the same clinical event
   and two rows would double-count the queue's ค่าวิกฤต card. */
export const openCriticalRecord = ({
  row, valueSummary, notifyRecord, actor,
}) => {
  if (!row) return null;
  const existing = [...records.values()].find((r) => r.rowId === row.id && !r.cancelled);
  const now = new Date();
  const base = {
    rowId: row.id,
    accessionNo: row.accessionNo,
    orderId: row.orderId,
    testLabel: row.testLabel,
    /* A confidential test keeps the patient masked in the register too —
       the ค่าวิกฤต drawer is a list anyone at the bench can open, and an
       Anti-HIV panic value naming its patient there defeats §1.15.6.4. */
    patientName: row.confidential ? 'ผู้ป่วยปกปิด (VCT)' : (row.patient?.fullName ?? row.patient?.shortName ?? ''),
    hn: row.confidential ? '•••••' : (row.patient?.hn ?? ''),
    confidential: Boolean(row.confidential),
    doctor: row.doctor,
    location: row.location,
    valueSummary: valueSummary ?? row.resultSummary ?? '',
    notifiedTo: notifyRecord?.notifiedTo ?? '',
    notifiedBy: notifyRecord?.notifiedBy ?? actor ?? '',
    notifiedAt: notifyRecord?.notifiedAt ?? '',
    readBack: Boolean(notifyRecord?.readBack),
    note: notifyRecord?.note ?? '',
  };

  if (existing) {
    records.set(existing.id, { ...existing, ...base });
    notify();
    return records.get(existing.id);
  }

  seq += 1;
  const id = `CRIT-${String(1000 + seq).slice(1)}`;
  records.set(id, {
    id,
    ...base,
    foundAtIso: now.toISOString(),
    foundAtLabel: clockLabel(now),
    acknowledged: false,
    cancelled: false,
    history: [],
  });

  appendLabAudit({
    actor: actor ?? base.notifiedBy,
    scope: 'result',
    action: 'เปิดทะเบียนค่าวิกฤต (รอแพทย์รับทราบ)',
    detail: `${base.accessionNo} · ${base.testLabel} — ${base.valueSummary}`,
    after: { notifiedTo: base.notifiedTo, readBack: base.readBack },
  });
  notify();
  return records.get(id);
};

export const validateAcknowledgement = (draft) => {
  const errors = {};
  if (!String(draft?.ackBy ?? '').trim()) errors.ackBy = 'ต้องระบุผู้รับทราบ';
  if (!String(draft?.ackAt ?? '').trim()) errors.ackAt = 'ต้องระบุเวลาที่รับทราบ';
  if (!String(draft?.response ?? '').trim()) errors.response = 'ต้องระบุการดำเนินการหลังรับทราบ';
  return { ok: Object.keys(errors).length === 0, errors };
};

/* กดรับทราบ — records WHO acknowledged, not merely that someone clicked.
   An acknowledgement without a name is decorative: it proves a button was
   pressed, which is not what the policy asks for. */
export const acknowledgeCritical = (id, draft, { actor } = {}) => {
  const rec = records.get(id);
  if (!rec || rec.cancelled) return { ok: false, errors: { ackBy: 'ไม่พบรายการค่าวิกฤตนี้' } };
  const check = validateAcknowledgement(draft);
  if (!check.ok) return { ok: false, errors: check.errors };

  const next = {
    ...rec,
    acknowledged: true,
    ackBy: draft.ackBy,
    ackPosition: draft.ackPosition ?? '',
    ackAt: draft.ackAt,
    ackAtIso: new Date().toISOString(),
    response: draft.response,
    ackMinutes: criticalAgeMinutes(rec),
    history: [...(rec.history ?? []), { at: clockLabel(new Date()), by: actor ?? draft.ackBy, action: 'กดรับทราบ' }],
  };
  records.set(id, next);

  appendLabAudit({
    actor: actor ?? draft.ackBy,
    scope: 'result',
    action: 'แพทย์/ผู้รับผิดชอบกดรับทราบค่าวิกฤต',
    detail: `${rec.accessionNo} · ${rec.testLabel} — รับทราบโดย ${draft.ackBy} เวลา ${draft.ackAt} (ห่างจากที่พบค่า ${next.ackMinutes} นาที) · ${draft.response}`,
    before: { acknowledged: false },
    after: { acknowledged: true, ackBy: draft.ackBy, minutes: next.ackMinutes },
  });
  notify();
  return { ok: true, errors: {}, record: next };
};

/* แก้ไขการรับทราบ — a mistyped name or time has to be correctable, and the
   superseded version is kept rather than overwritten. */
export const amendAcknowledgement = (id, draft, { actor } = {}) => {
  const rec = records.get(id);
  if (!rec || !rec.acknowledged) return { ok: false, errors: { ackBy: 'ยังไม่มีการรับทราบให้แก้ไข' } };
  const check = validateAcknowledgement(draft);
  if (!check.ok) return { ok: false, errors: check.errors };

  const before = { ackBy: rec.ackBy, ackAt: rec.ackAt, response: rec.response };
  records.set(id, {
    ...rec,
    ackBy: draft.ackBy,
    ackPosition: draft.ackPosition ?? rec.ackPosition ?? '',
    ackAt: draft.ackAt,
    response: draft.response,
    history: [...(rec.history ?? []), { at: clockLabel(new Date()), by: actor ?? draft.ackBy, action: 'แก้ไขการรับทราบ', before }],
  });
  appendLabAudit({
    actor: actor ?? draft.ackBy,
    scope: 'result',
    action: 'แก้ไขบันทึกการรับทราบค่าวิกฤต',
    detail: `${rec.accessionNo} · ${rec.testLabel}`,
    before,
    after: { ackBy: draft.ackBy, ackAt: draft.ackAt, response: draft.response },
  });
  notify();
  return { ok: true, errors: {}, record: records.get(id) };
};

/* ยกเลิกการรับทราบ — reopens the record with a mandatory reason. Used when
   the person named turns out not to have been told (it happens: the call
   was taken by a ward clerk who never passed it on). The record goes back to
   รอรับทราบ and its clock keeps running from the ORIGINAL foundAt, because
   the patient's exposure never paused. */
export const cancelAcknowledgement = (id, { reason, actor } = {}) => {
  const rec = records.get(id);
  if (!rec || !rec.acknowledged || !String(reason ?? '').trim()) return false;
  const before = { ackBy: rec.ackBy, ackAt: rec.ackAt };
  records.set(id, {
    ...rec,
    acknowledged: false,
    ackBy: undefined,
    ackAt: undefined,
    ackPosition: undefined,
    response: undefined,
    ackMinutes: undefined,
    history: [...(rec.history ?? []), { at: clockLabel(new Date()), by: actor ?? '', action: `ยกเลิกการรับทราบ (${reason})`, before }],
  });
  appendLabAudit({
    actor,
    scope: 'result',
    action: 'ยกเลิกบันทึกการรับทราบค่าวิกฤต',
    detail: `${rec.accessionNo} · ${rec.testLabel} — ${reason}`,
    before: { acknowledged: true, ...before },
    after: { acknowledged: false },
  });
  notify();
  return true;
};
