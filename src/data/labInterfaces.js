import { LAB_TESTS, LAB_TEST_BY_ID } from '@/data/labCatalog';
import { appendLabAudit } from '@/data/labAudit';

/* การเชื่อมต่อ LIS และเครื่องตรวจวิเคราะห์ — TOR ภาคผนวก ก §1.15.1
   "สามารถเชื่อมต่อกับระบบสารสนเทศห้องปฏิบัติการ (LIS) ของสำนักอนามัยได้".

   ── HONEST LIMITATION, STATED UP FRONT ────────────────────────────────
   This clause cannot be satisfied by a frontend. There is no backend here,
   no HL7 v2.5.1 parser, no ASTM E1381/E1394 driver and no socket. What
   this module provides is the CONFIGURATION SURFACE the clause implies —
   endpoint + credentials + a connection test, the analyser roster, the
   analyser-code ↔ TMLT mapping table, and an inbound/outbound message log
   — backed by mock transport. The page says so on its own face, and the
   manifest reports §1.15.1 as `partial`. Claiming `done` on the single
   most auditable clause in the section would be a false claim.
   ──────────────────────────────────────────────────────────────────────

   Field names for the LIS connection come from the MyHOSPITAL Lab manual
   (~/MIH-Docs-Vault/Kaebrain/คู่มือการใช้งาน - Lab.pdf, p.4 "ตั้งค่าเชื่อมต่อ
   ฐานข้อมูล": Server Host / Port / Database / Username / Password), and the
   per-instrument ประเภทการรายงานผล (Normal / Manual / Automatic) comes from
   the same manual's setup screen (p.8).

   NOT built on src/data/treatmentInterfaces.js. That file implements an
   LIS/PACS interface MONITOR for §1.4.7 — a clinician's view of whether
   their orders came back — and it lives in a directory this module is
   forbidden to touch. This one is the LABORATORY's view: credentials,
   instrument roster, code mapping, message queue. Two mock stores now
   describe the same imaginary LIS; a later wave should reconcile them at
   the data layer rather than by having one page import the other's store. */

/* ─────────────────────────────────────────────────────────────────────────
   1. การเชื่อมต่อ LIS สำนักอนามัย */

export const LIS_PROTOCOLS = [
  { key: 'hl7v2',  label: 'HL7 v2.5.1 (MLLP over TCP)', hint: 'มาตรฐานหลักสำหรับ ORM/ORU ระหว่าง HIS กับ LIS' },
  { key: 'astm',   label: 'ASTM E1381 / E1394',         hint: 'ใช้กับเครื่องตรวจวิเคราะห์รุ่นเดิมที่ต่อตรงผ่าน serial' },
  { key: 'restapi', label: 'REST API (JSON over HTTPS)', hint: 'ใช้กับ LIS รุ่นใหม่ของสำนักอนามัย' },
  { key: 'db',     label: 'เชื่อมต่อฐานข้อมูลโดยตรง (ODBC)', hint: 'ตามหน้า "ตั้งค่าเชื่อมต่อฐานข้อมูล" ของระบบเดิม' },
];

const connection = {
  host: 'lis.bangkok.go.th',
  port: '5432',
  database: 'PHCIS_LIS',
  username: 'phcis_lab_svc',
  /* Never a real secret — a placeholder the PasswordField masks, exactly as
     it would mask a real one. */
  password: '••••••••••••',
  protocol: 'hl7v2',
  endpoint: 'mllp://lis.bangkok.go.th:5432/PHCIS',
  siteCode: 'HC-04-DINDAENG',
  /* Populated by testConnection(); a config that has never been tested must
     not be saveable, which is what the page's disabled-save gate reads. */
  lastTestAt: '2026-07-31 05:02',
  lastTestOk: true,
  lastTestMessage: 'เชื่อมต่อสำเร็จ · ตอบกลับใน 84 ms · LIS version 4.2.1',
  lastSyncAt: '2026-07-31 08:44',
  queueDepth: 3,
  autoRetry: true,
  retryIntervalSec: 60,
};

const listeners = new Set();
export const subscribeInterfaces = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const notify = () => listeners.forEach((fn) => fn());

export const getConnection = () => ({ ...connection });

/* Validation — the two rules a connection form genuinely has. Everything
   else is a free string that only the far end can judge. */
export const validateConnection = (draft) => {
  const errors = {};
  if (!String(draft?.host ?? '').trim()) errors.host = 'ต้องระบุ Server Host';
  if (!/^\d+$/.test(String(draft?.port ?? '').trim())) errors.port = 'Port ต้องเป็นตัวเลข';
  else if (Number(draft.port) < 1 || Number(draft.port) > 65535) errors.port = 'Port ต้องอยู่ระหว่าง 1–65535';
  if (!String(draft?.database ?? '').trim()) errors.database = 'ต้องระบุชื่อฐานข้อมูล';
  if (!String(draft?.username ?? '').trim()) errors.username = 'ต้องระบุ Username';
  return { ok: Object.keys(errors).length === 0, errors };
};

/* ทดสอบการเชื่อมต่อ — mock transport. Deterministic rather than random: a
   connection test that sometimes fails for no reason teaches the user to
   ignore it. Fails only on a config that is genuinely wrong (unreachable
   placeholder host, or a port nobody serves LIS on), which is enough to
   exercise the failure state honestly. */
export const testConnection = (draft, { actor } = {}) => {
  const check = validateConnection(draft);
  if (!check.ok) {
    return { ok: false, message: 'ข้อมูลการเชื่อมต่อยังไม่ครบถ้วน', errors: check.errors };
  }
  const host = String(draft.host).trim();
  const unreachable = host === 'localhost' || host.startsWith('127.') || host.endsWith('.invalid');
  const result = unreachable
    ? { ok: false, message: `เชื่อมต่อไม่สำเร็จ — ไม่พบเซิร์ฟเวอร์ ${host}:${draft.port} (ตรวจสอบ host/port และ firewall)` }
    : { ok: true, message: `เชื่อมต่อสำเร็จ · ตอบกลับใน 84 ms · ${draft.database} พร้อมใช้งาน` };

  connection.lastTestAt = new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
  connection.lastTestOk = result.ok;
  connection.lastTestMessage = result.message;
  appendLabAudit({
    actor,
    scope: 'interface',
    action: 'ทดสอบการเชื่อมต่อ LIS',
    detail: `${draft.host}:${draft.port}/${draft.database} — ${result.ok ? 'สำเร็จ' : 'ไม่สำเร็จ'}`,
    after: { ok: result.ok },
  });
  notify();
  return { ...result, errors: {} };
};

export const saveConnection = (draft, { actor } = {}) => {
  const check = validateConnection(draft);
  if (!check.ok) return { ok: false, errors: check.errors };
  const before = { host: connection.host, port: connection.port, database: connection.database, username: connection.username };
  Object.assign(connection, {
    host: draft.host, port: draft.port, database: draft.database,
    username: draft.username, password: draft.password,
    protocol: draft.protocol, endpoint: draft.endpoint, siteCode: draft.siteCode,
    autoRetry: draft.autoRetry, retryIntervalSec: draft.retryIntervalSec,
  });
  appendLabAudit({
    actor,
    scope: 'interface',
    action: 'บันทึกการตั้งค่าเชื่อมต่อ LIS',
    detail: `${draft.host}:${draft.port}/${draft.database} · ผู้ใช้ ${draft.username}`,
    before,
    after: { host: draft.host, port: draft.port, database: draft.database, username: draft.username },
  });
  notify();
  return { ok: true, errors: {} };
};

export const retryConnection = ({ actor } = {}) => {
  connection.lastSyncAt = new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
  connection.queueDepth = Math.max(0, connection.queueDepth - 1);
  appendLabAudit({ actor, scope: 'interface', action: 'ลองเชื่อมต่อใหม่', detail: `คิวคงเหลือ ${connection.queueDepth} ข้อความ` });
  notify();
};

/* ─────────────────────────────────────────────────────────────────────────
   2. เครื่องตรวจวิเคราะห์ (analyser roster)

   `reportMode` is the manual's ประเภทการรายงานผล:
     normal    — ผลเข้าระบบตามปกติ ต้องคีย์เอง
     manual    — เจ้าหน้าที่อ่านจากหน้าจอเครื่องแล้วคีย์
     automatic — เครื่องส่งผลเข้าระบบเอง

   Even in `automatic`, an inbound result is PARKED for human confirmation
   and never auto-released. An analyser cannot know that the tube it just
   aspirated is the one the label says it is; only the person who received
   the specimen can. Auto-release is the single change most likely to turn
   this from a safety net into a hazard, so it is not offered. */
export const LAB_REPORT_MODES = [
  { key: 'normal',    label: 'Normal',    thai: 'ปกติ — คีย์ผลเองที่หน้าบันทึกผล' },
  { key: 'manual',    label: 'Manual',    thai: 'อ่านจากหน้าจอเครื่องแล้วคีย์เข้าระบบ' },
  { key: 'automatic', label: 'Automatic', thai: 'เครื่องส่งผลเข้าระบบเอง (ยังต้องกดยืนยันก่อนรายงาน)' },
];

export const LAB_ANALYZERS = [
  {
    key: 'hema-01',
    name: 'Sysmex XN-550',
    thai: 'เครื่องตรวจความสมบูรณ์ของเม็ดเลือดอัตโนมัติ',
    discipline: 'hematology',
    protocol: 'astm',
    port: 'COM3 · 9600-8-N-1',
    reportMode: 'automatic',
    status: 'online',
    pending: 4,
    lastMessageAt: '08:52',
    serialNo: 'XN550-2401778',
    tests: ['lab-cbc'],
  },
  {
    key: 'chem-01',
    name: 'Roche Cobas c311',
    thai: 'เครื่องตรวจเคมีคลินิกอัตโนมัติ',
    discipline: 'biochemistry',
    protocol: 'hl7v2',
    port: '10.4.12.31:6000 (MLLP)',
    reportMode: 'automatic',
    status: 'online',
    pending: 2,
    lastMessageAt: '08:49',
    serialNo: 'C311-19-4402',
    tests: ['lab-fbs', 'lab-lipid', 'lab-creatinine', 'lab-electrolytes', 'lab-hba1c'],
  },
  {
    key: 'immuno-01',
    name: 'Abbott Architect i1000SR',
    thai: 'เครื่องตรวจภูมิคุ้มกันวิทยา (Immunoassay)',
    discipline: 'immunology',
    protocol: 'hl7v2',
    port: '10.4.12.44:6000 (MLLP)',
    /* Deliberately NOT automatic: an Anti-HIV screen is a confidential
       result and a reactive one has to be seen by a named person before it
       exists anywhere downstream. */
    reportMode: 'manual',
    status: 'online',
    pending: 0,
    lastMessageAt: '08:20',
    serialNo: 'I1000-2211903',
    tests: ['lab-antihiv', 'lab-vdrl'],
  },
  {
    key: 'ua-01',
    name: 'Sysmex UC-3500',
    thai: 'เครื่องอ่านแถบตรวจปัสสาวะ',
    discipline: 'microscopy',
    protocol: 'astm',
    port: 'COM5 · 9600-8-N-1',
    reportMode: 'automatic',
    status: 'offline',
    pending: 0,
    lastMessageAt: '2026-07-30 16:40',
    serialNo: 'UC3500-20-0881',
    tests: ['lab-ua'],
    note: 'ปิดเครื่องหลังเวลาราชการ — เปิดอีกครั้ง 07:30 น.',
  },
  {
    key: 'micro-01',
    name: 'BD BACTEC FX40',
    thai: 'เครื่องเพาะเชื้อในเลือดอัตโนมัติ',
    discipline: 'microbiology',
    protocol: 'astm',
    port: 'COM7 · 9600-8-N-1',
    reportMode: 'manual',
    status: 'warning',
    pending: 1,
    lastMessageAt: '07:05',
    serialNo: 'FX40-18-2210',
    tests: ['lab-hemoculture'],
    note: 'แจ้งเตือนอุณหภูมิห้องเพาะเชื้อ 36.2 °C — ต่ำกว่าเกณฑ์ 0.3 °C',
  },
];

export const LAB_ANALYZER_BY_KEY = Object.fromEntries(LAB_ANALYZERS.map((a) => [a.key, a]));

/* Which analyser runs a given test — the lookup the QC release gate and the
   result-entry "ดึงผลจากเครื่องตรวจ" action both need. */
export const analyzerForTest = (testId) =>
  LAB_ANALYZERS.find((a) => a.tests.includes(testId)) ?? null;

export const setAnalyzerReportMode = (key, mode, { actor } = {}) => {
  const a = LAB_ANALYZER_BY_KEY[key];
  if (!a) return false;
  const before = a.reportMode;
  a.reportMode = mode;
  appendLabAudit({
    actor,
    scope: 'interface',
    action: 'เปลี่ยนโหมดรายงานผลของเครื่องตรวจ',
    detail: `${a.name} — ${before} → ${mode}`,
    before: { reportMode: before },
    after: { reportMode: mode },
  });
  notify();
  return true;
};

/* ─────────────────────────────────────────────────────────────────────────
   3. การจับคู่รหัส (analyser/LIS code ↔ catalog test ↔ TMLT ↔ LOINC)

   An UNMAPPED inbound code is not a cosmetic gap: the message arrives, no
   catalog row claims it, and the result is silently lost. So unmapped rows
   are surfaced as an ERROR state on the page, distinct from "no messages
   yet", and the inbound handler quarantines them rather than dropping them. */
const mappings = [
  { code: 'CBC',    analyzer: 'hema-01',   testId: 'lab-cbc' },
  { code: 'GLU-F',  analyzer: 'chem-01',   testId: 'lab-fbs' },
  { code: 'HBA1C',  analyzer: 'chem-01',   testId: 'lab-hba1c' },
  { code: 'LIPID',  analyzer: 'chem-01',   testId: 'lab-lipid' },
  { code: 'CREA',   analyzer: 'chem-01',   testId: 'lab-creatinine' },
  { code: 'LYTE4',  analyzer: 'chem-01',   testId: 'lab-electrolytes' },
  { code: 'HIVAG',  analyzer: 'immuno-01', testId: 'lab-antihiv' },
  { code: 'RPR',    analyzer: 'immuno-01', testId: 'lab-vdrl' },
  { code: 'UA-10',  analyzer: 'ua-01',     testId: 'lab-ua' },
  { code: 'BC-AER', analyzer: 'micro-01',  testId: 'lab-hemoculture' },
  /* Genuinely unmapped — the analyser sends these and nothing claims them.
     Left unmapped ON PURPOSE so the error state is reachable without
     breaking a working configuration. */
  { code: 'ESR',    analyzer: 'hema-01',   testId: null },
  { code: 'AMPH-U', analyzer: 'ua-01',     testId: null },
];

export const getMappings = () => mappings.map((m) => ({
  ...m,
  test: m.testId ? LAB_TEST_BY_ID[m.testId] ?? null : null,
  tmlt: m.testId ? LAB_TEST_BY_ID[m.testId]?.tmlt ?? '' : '',
  loinc: m.testId ? LAB_TEST_BY_ID[m.testId]?.loinc ?? '' : '',
  analyzerName: LAB_ANALYZER_BY_KEY[m.analyzer]?.name ?? m.analyzer,
}));

export const unmappedCount = () => mappings.filter((m) => !m.testId).length;

export const setMapping = (code, analyzer, testId, { actor } = {}) => {
  const row = mappings.find((m) => m.code === code && m.analyzer === analyzer);
  if (!row) return false;
  const before = row.testId;
  row.testId = testId || null;
  appendLabAudit({
    actor,
    scope: 'interface',
    action: testId ? 'จับคู่รหัสเครื่องตรวจกับรายการตรวจ' : 'ยกเลิกการจับคู่รหัส',
    detail: `${code} (${LAB_ANALYZER_BY_KEY[analyzer]?.name ?? analyzer}) → ${testId ? LAB_TEST_BY_ID[testId]?.nameEn ?? testId : '— ไม่จับคู่ —'}`,
    before: { testId: before },
    after: { testId: row.testId },
  });
  notify();
  return true;
};

export const addMapping = (code, analyzer, testId, { actor } = {}) => {
  if (!String(code ?? '').trim() || !analyzer) return false;
  if (mappings.some((m) => m.code === code && m.analyzer === analyzer)) return false;
  mappings.push({ code: code.trim(), analyzer, testId: testId || null });
  appendLabAudit({ actor, scope: 'interface', action: 'เพิ่มรหัสจับคู่ใหม่', detail: `${code} · ${LAB_ANALYZER_BY_KEY[analyzer]?.name ?? analyzer}` });
  notify();
  return true;
};

export const removeMapping = (code, analyzer, { actor } = {}) => {
  const i = mappings.findIndex((m) => m.code === code && m.analyzer === analyzer);
  if (i < 0) return false;
  const [gone] = mappings.splice(i, 1);
  appendLabAudit({ actor, scope: 'interface', action: 'ลบรหัสจับคู่', detail: `${gone.code} · ${LAB_ANALYZER_BY_KEY[gone.analyzer]?.name ?? gone.analyzer}` });
  notify();
  return true;
};

/* Catalog options for the mapping dropdown — kept here so the page never
   imports LAB_TESTS just to build a select. */
export const mappableTestOptions = () => [
  { value: '', label: '— ยังไม่จับคู่ —' },
  ...LAB_TESTS.filter((t) => !t.retired).map((t) => ({
    value: t.id,
    label: `${t.nameEn} (${t.nameTh}) · TMLT ${t.tmlt}`,
  })),
];

/* ─────────────────────────────────────────────────────────────────────────
   4. บันทึกข้อความเข้า-ออก (message log)

   `state` values:
     pending     — arrived, mapped, waiting for a human to import it
     imported    — its values were pulled into a result-entry draft
     bounced     — rejected back to the sender with a reason
     unmapped    — arrived with a code nothing claims (quarantined, NOT lost)
     quarantined — arrived for an order that was deleted or rejected

   The last two are the states that make the difference between an interface
   that loses data quietly and one that tells you it lost data. */
export const LAB_MESSAGE_STATES = [
  { key: 'pending',     label: 'รอนำเข้า',        color: 'info' },
  { key: 'imported',    label: 'นำเข้าแล้ว',      color: 'success' },
  { key: 'bounced',     label: 'ตีกลับ',          color: 'error' },
  { key: 'unmapped',    label: 'ไม่พบรหัสที่จับคู่', color: 'error' },
  { key: 'quarantined', label: 'กักไว้ตรวจสอบ',    color: 'warning' },
];

export const LAB_MESSAGE_STATE_BY_KEY = Object.fromEntries(
  LAB_MESSAGE_STATES.map((s) => [s.key, s]),
);

const messages = [
  {
    id: 'MSG-0009', direction: 'in', at: '08:52:14', analyzer: 'hema-01',
    code: 'CBC', orderRowId: 'LAB-0011', accessionNo: 'L69-0717',
    type: 'ORU^R01', state: 'pending',
    values: { hb: 11.2, hct: 34, wbc: 14.8, plt: 188 },
    raw: 'OBR|1|L69-0717||CBC^Complete Blood Count|||202607310849',
  },
  {
    id: 'MSG-0008', direction: 'in', at: '08:49:02', analyzer: 'chem-01',
    code: 'LYTE4', orderRowId: 'LAB-0001', accessionNo: 'L69-0712',
    type: 'ORU^R01', state: 'pending',
    values: { na: 138, k: 6.8, cl: 102, co2: 24 },
    raw: 'OBR|1|L69-0712||LYTE4^Serum Electrolytes|||202607310845',
  },
  {
    id: 'MSG-0007', direction: 'in', at: '08:41:55', analyzer: 'chem-01',
    code: 'GLU-F', orderRowId: 'LAB-0010', accessionNo: 'L69-0716',
    type: 'ORU^R01', state: 'imported',
    values: { fbs: 142 },
    raw: 'OBR|1|L69-0716||GLU-F^Fasting Blood Sugar|||202607310838',
  },
  {
    id: 'MSG-0006', direction: 'in', at: '08:30:10', analyzer: 'hema-01',
    code: 'ESR', orderRowId: null, accessionNo: 'L69-0731',
    type: 'ORU^R01', state: 'unmapped',
    values: { esr: 34 },
    raw: 'OBR|1|L69-0731||ESR^Erythrocyte Sedimentation Rate|||202607310825',
    note: 'รหัส ESR ยังไม่ได้จับคู่กับรายการตรวจในระบบ — ผลถูกกักไว้ ไม่ถูกทิ้ง',
  },
  {
    id: 'MSG-0005', direction: 'in', at: '08:12:44', analyzer: 'ua-01',
    code: 'UA-10', orderRowId: 'LAB-9999', accessionNo: 'L69-0699',
    type: 'ORU^R01', state: 'quarantined',
    values: { glucose: 'Negative', protein: 'Trace' },
    raw: 'OBR|1|L69-0699||UA-10^Urinalysis|||202607310805',
    note: 'ไม่พบรายการขอตรวจที่ตรงกับ Accession นี้ (อาจถูกลบหรือปฏิเสธไปแล้ว)',
  },
  {
    id: 'MSG-0004', direction: 'out', at: '07:58:20', analyzer: 'chem-01',
    code: 'LIPID', orderRowId: 'LAB-0005', accessionNo: 'L69-0714',
    type: 'ORM^O01', state: 'imported',
    values: null,
    raw: 'ORC|NW|ORD-243|||||^^^202607310558',
  },
  {
    id: 'MSG-0003', direction: 'in', at: '07:40:31', analyzer: 'immuno-01',
    code: 'RPR', orderRowId: 'LAB-0003', accessionNo: 'L69-0713',
    type: 'ORU^R01', state: 'bounced',
    values: { vdrl: 'Reactive' },
    raw: 'OBR|1|L69-0713||RPR^VDRL|||202607310735',
    note: 'ตีกลับ: เครื่องรายงานก่อนอ่านผลควบคุมคุณภาพประจำวัน',
  },
];

export const getMessages = () => messages.map((m) => ({
  ...m,
  analyzerName: LAB_ANALYZER_BY_KEY[m.analyzer]?.name ?? m.analyzer,
  stateLabel: LAB_MESSAGE_STATE_BY_KEY[m.state]?.label ?? m.state,
  stateColor: LAB_MESSAGE_STATE_BY_KEY[m.state]?.color ?? 'neutral',
}));

export const pendingMessageFor = (orderRowId) =>
  messages.find((m) => m.orderRowId === orderRowId && m.direction === 'in' && m.state === 'pending') ?? null;

export const markMessageImported = (id, { actor } = {}) => {
  const m = messages.find((x) => x.id === id);
  if (!m) return false;
  m.state = 'imported';
  appendLabAudit({
    actor,
    scope: 'interface',
    action: 'นำเข้าผลจากเครื่องตรวจวิเคราะห์',
    detail: `${m.id} · ${m.code} · ${m.accessionNo} (${LAB_ANALYZER_BY_KEY[m.analyzer]?.name ?? m.analyzer})`,
    before: { state: 'pending' },
    after: { state: 'imported' },
  });
  notify();
  return true;
};

export const bounceMessage = (id, reason, { actor } = {}) => {
  const m = messages.find((x) => x.id === id);
  if (!m || !String(reason ?? '').trim()) return false;
  const before = m.state;
  m.state = 'bounced';
  m.note = `ตีกลับ: ${reason}`;
  appendLabAudit({
    actor,
    scope: 'interface',
    action: 'ตีกลับข้อความจากเครื่องตรวจ',
    detail: `${m.id} · ${m.code} — ${reason}`,
    before: { state: before },
    after: { state: 'bounced' },
  });
  notify();
  return true;
};

/* Health summary for the page's cards and for LabQueuePage's banner. */
export const interfaceHealth = () => ({
  connected: connection.lastTestOk,
  queueDepth: connection.queueDepth,
  pendingIn: messages.filter((m) => m.direction === 'in' && m.state === 'pending').length,
  unmappedMessages: messages.filter((m) => m.state === 'unmapped').length,
  quarantined: messages.filter((m) => m.state === 'quarantined').length,
  unmappedCodes: unmappedCount(),
  offlineAnalyzers: LAB_ANALYZERS.filter((a) => a.status === 'offline').length,
  warningAnalyzers: LAB_ANALYZERS.filter((a) => a.status === 'warning').length,
});
