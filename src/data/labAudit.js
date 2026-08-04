/* Shared audit trail for every screen under /lab.

   LabQueuePage.jsx grew its own page-local `logAudit()` while it was the
   only lab screen that changed anything. It is now one of six: receiving,
   send-out, QC override, LIS credential changes and inbound-message import
   all mutate specimen or result state, and an audit trail that only covers
   one of them is worse than none — it reads as complete while missing the
   riskiest actions.

   So the appender lives here and every lab screen writes to the same list.
   Deliberately NOT src/data/treatmentAudit.js: that trail belongs to the
   §1.4 treatment module and mixing two modules' trails into one store would
   make either one impossible to read.

   Same module-state + subscribe/notify shape as labOrders.js — there is no
   backend, and no auth layer either, so `actor` is passed in by the caller
   (each screen has its own CURRENT_ACTOR stand-in for whoever a real auth
   layer would resolve). */

let seq = 0;

/* Newest first — an audit trail is read from the top. Seeded with a few
   entries so the trail is never a blank panel on a fresh load, which reads
   as "auditing is off" rather than "nothing has happened yet". */
export const LAB_AUDIT = [
  {
    id: 'LAUD-0003',
    at: '08:41:20',
    date: '2026-07-31',
    actor: 'ทนพ.ญ. อารีย์ วงศ์สุข',
    action: 'รับรองและรายงานผล',
    detail: 'CBC · L69-0698 — ณัฐธิดา ศรีบุญเรือง',
    scope: 'result',
  },
  {
    id: 'LAUD-0002',
    at: '07:55:02',
    date: '2026-07-31',
    actor: 'เจ้าหน้าที่ห้องปฏิบัติการ',
    action: 'ปฏิเสธสิ่งส่งตรวจและสั่งเจาะซ้ำ',
    detail: 'Electrolytes · L69-0721 — เม็ดเลือดแดงแตก (Hemolysis)',
    scope: 'specimen',
  },
  {
    id: 'LAUD-0001',
    at: '06:10:44',
    date: '2026-07-31',
    actor: 'เจ้าหน้าที่ห้องปฏิบัติการ',
    action: 'ยืนยันส่งคำขอตรวจภายนอก',
    detail: 'FBS + Lipid profile · L69-0714 → ศูนย์แล็บกลาง กทม.',
    scope: 'sendout',
  },
];

const listeners = new Set();

export const subscribeLabAudit = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const notify = () => listeners.forEach((fn) => fn());

/* One append. `before`/`after` are optional and only meaningful for a state
   change — a reveal or a print has no before/after, and forcing empty
   objects onto them would make the trail harder to scan, not easier. */
export const appendLabAudit = ({ actor, action, detail, scope = 'general', before, after }) => {
  seq += 1;
  const entry = {
    id: `LAUD-${String(1000 + seq)}`,
    at: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    date: new Date().toISOString().slice(0, 10),
    actor: actor ?? 'ไม่ระบุผู้ใช้งาน',
    action,
    detail,
    scope,
    before: before ?? null,
    after: after ?? null,
  };
  LAB_AUDIT.unshift(entry);
  /* Bounded so a long session cannot grow the array without limit; a real
     deployment writes through to a server-side log instead. */
  if (LAB_AUDIT.length > 200) LAB_AUDIT.length = 200;
  notify();
  return entry;
};

export const labAuditFor = (scope) =>
  (scope ? LAB_AUDIT.filter((e) => e.scope === scope) : LAB_AUDIT);

/* Scope vocabulary, exported so the screens filter by a shared key rather
   than by a typed string that can drift. */
export const LAB_AUDIT_SCOPES = [
  { key: 'specimen', label: 'สิ่งส่งตรวจ' },
  { key: 'receive',  label: 'การรับสิ่งส่งตรวจ' },
  { key: 'sendout',  label: 'ส่งตรวจภายนอก' },
  { key: 'result',   label: 'ผลตรวจ' },
  { key: 'qc',       label: 'ควบคุมคุณภาพ' },
  { key: 'interface', label: 'การเชื่อมต่อ' },
  { key: 'confidential', label: 'การเปิดดูผลลับ' },
  { key: 'general',  label: 'ทั่วไป' },
];
