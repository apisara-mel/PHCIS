/* ระบบหน้าห้องตรวจทางไกล (Telemedicine worklist) — mock store.
   โครงตาม ~/MIH-Docs-Vault/คู่มือ Telemed/ตัวอย่างคู่มือ Telamed.pdf บทที่ 3
   §4 "ระบบหน้าห้องตรวจ": ตรวจวันนี้ / นัดหมายวันนี้ / walk-in / รอเข้าตรวจ /
   กำลังตรวจ / ตรวจแล้ว  →  ติ๊กเลือกรายการ แล้วกด "ส่งตรวจ"

   บริบท: ศูนย์บริการสาธารณสุข กทม. รับปรึกษาทางไกลจาก รพ.สต. / ศบส.สาขา
   ในพื้นที่ (TOR §1.13.3 เชื่อมโยง PHCIS + §4.3.5 แจ้งเตือนก่อนคิวนัด).

   ไม่มี API — เป็น store ในหน่วยความจำที่ mutate ได้ + subscribe ได้
   เพื่อให้ worklist / assessment / report เห็นข้อมูลชุดเดียวกัน. */

/* ── helpers ─────────────────────────────────────────────────────────── */
const pad2 = (n) => String(n).padStart(2, '0');

/** ISO ของ "วันนี้ เวลา HH:MM" — คิวสาธิตจึงเลื่อนตามวันที่เปิดหน้าจอเสมอ */
export const todayAt = (h, m = 0) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const formatClock = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())} น.`;
};

export const formatThaiDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })} ${pad2(d.getHours())}:${pad2(d.getMinutes())} น.`;
};

/* ── ค่าคงที่ของ worklist ─────────────────────────────────────────────── */

/** สถานะตามคู่มือบท 3 §4 — soft-cancel เท่านั้น (ไม่มี hard delete) */
export const TELEMED_VISIT_STATUS = {
  appointment: { label: 'นัดหมายวันนี้', tone: 'blue',   tab: 'appointment' },
  walkin:      { label: 'Walk-in',       tone: 'purple', tab: 'walkin' },
  waiting:     { label: 'รอเข้าตรวจ',     tone: 'orange', tab: 'waiting' },
  inprogress:  { label: 'กำลังตรวจ',      tone: 'teal',   tab: 'inprogress' },
  done:        { label: 'ตรวจแล้ว',       tone: 'green',  tab: 'done' },
  cancelled:   { label: 'ยกเลิก',         tone: 'grey',   tab: 'cancelled' },
};

export const TELEMED_WORKLIST_TABS = [
  { key: 'today',       label: 'ตรวจวันนี้',    icon: 'today' },
  { key: 'appointment', label: 'นัดหมายวันนี้',  icon: 'event_available' },
  { key: 'walkin',      label: 'Walk-in',       icon: 'directions_walk' },
  { key: 'waiting',     label: 'รอเข้าตรวจ',     icon: 'pending_actions' },
  { key: 'inprogress',  label: 'กำลังตรวจ',      icon: 'videocam' },
  { key: 'done',        label: 'ตรวจแล้ว',       icon: 'check_circle' },
  { key: 'cancelled',   label: 'ยกเลิก',         icon: 'cancel' },
];

/** สถานะ Authen Code สปสช. (คู่มือ บท 2 — เวชระเบียนขอ Authen ก่อนส่งตรวจ) */
export const AUTHEN_STATUS = {
  ok:      { label: 'Authen แล้ว',      tone: 'green' },
  pending: { label: 'รอ Authen',        tone: 'orange' },
  none:    { label: 'ยังไม่ขอ Authen',   tone: 'red' },
  na:      { label: 'ไม่ต้อง Authen',    tone: 'grey' },
};

/** หน่วยบริการต้นทางที่ส่งเคสเข้ามาปรึกษาทางไกล */
export const TELEMED_ORIGIN_UNITS = [
  'รพ.สต. บางบัวทอง 2',
  'ศบส.4 ดินแดง (หน่วยชุมชน)',
  'ศบส.41 คลองเตย (ชุมชนล็อค 1-2-3)',
  'รพ.สต. คลองสามวา',
  'ศบส.21 วัดธาตุทอง (หน่วยเคลื่อนที่)',
  'ศบส.15 ลาดพร้าว',
];

export const TELEMED_DOCTORS = [
  'พญ.สมหญิง รักษาดี',
  'นพ.ธนกร ใจดี',
  'พญ.วราภรณ์ สุขใจ',
  'นพ.ปรัชญา อินทรวิเชียร',
];

export const TELEMED_DEPARTMENTS = [
  'อายุรกรรมทั่วไป',
  'คลินิกโรคเรื้อรัง (NCD)',
  'คลินิกผู้สูงอายุ',
  'เวชศาสตร์ครอบครัว',
];

/* ── แคตตาล็อกคำสั่งการรักษาระหว่างสาย (ย่อ) ────────────────────────────
   หมายเหตุ integrator: โมดูลนี้แตะ src/pages/treat · lab · xray ไม่ได้ จึง
   ย่อแคตตาล็อกไว้ที่นี่ และ deep-link ด้วย string เท่านั้น — ต้องเชื่อมกับ
   medicationCatalog / labCatalog / xray จริงภายหลัง. */
export const TELEMED_MED_CATALOG = [
  { code: 'MET500',  name: 'Metformin 500 mg',        sig: 'รับประทาน 1 เม็ด หลังอาหารเช้า-เย็น', qty: '60 เม็ด' },
  { code: 'ENA5',    name: 'Enalapril 5 mg',          sig: 'รับประทาน 1 เม็ด ก่อนอาหารเช้า',      qty: '30 เม็ด' },
  { code: 'AMLO5',   name: 'Amlodipine 5 mg',         sig: 'รับประทาน 1 เม็ด หลังอาหารเช้า',      qty: '30 เม็ด' },
  { code: 'SIM20',   name: 'Simvastatin 20 mg',       sig: 'รับประทาน 1 เม็ด ก่อนนอน',           qty: '30 เม็ด' },
  { code: 'PARA500', name: 'Paracetamol 500 mg',      sig: 'รับประทานครั้งละ 1-2 เม็ด เวลาปวด',   qty: '20 เม็ด' },
  { code: 'SALB',    name: 'Salbutamol MDI 100 mcg',  sig: 'พ่น 2 ครั้ง เวลาหอบเหนื่อย',          qty: '1 หลอด' },
];

export const TELEMED_LAB_CATALOG = [
  { code: 'HBA1C', name: 'HbA1c', note: 'ติดตามการควบคุมน้ำตาลสะสม' },
  { code: 'FBS',   name: 'Fasting Blood Sugar (FBS)', note: 'งดอาหาร 8 ชม.' },
  { code: 'LIPID', name: 'Lipid Profile', note: 'งดอาหาร 12 ชม.' },
  { code: 'BUNCR', name: 'BUN / Creatinine + eGFR', note: 'ติดตามการทำงานของไต' },
  { code: 'CBC',   name: 'Complete Blood Count (CBC)', note: '' },
  { code: 'UA',    name: 'Urine Analysis', note: 'เก็บปัสสาวะช่วงกลาง' },
];

export const TELEMED_XRAY_CATALOG = [
  { code: 'CXR',   name: 'Chest X-ray (PA upright)', note: 'ตรวจที่ศูนย์บริการต้นทาง' },
  { code: 'KUB',   name: 'KUB (Plain abdomen)', note: '' },
  { code: 'KNEE',  name: 'X-ray Knee both (AP/Lateral)', note: '' },
];

export const TELEMED_CONSULT_TARGETS = [
  'อายุรแพทย์โรคไต ศบส.4',
  'อายุรแพทย์โรคหัวใจ ศบส.4',
  'จิตแพทย์ (คลินิกสุขภาพจิต)',
  'เภสัชกรคลินิกโรคเรื้อรัง',
];

export const TELEMED_REFER_TARGETS = [
  'รพ.กลาง (สำนักการแพทย์ กทม.)',
  'รพ.เจริญกรุงประชารักษ์',
  'รพ.ตากสิน',
  'รพ.ราชพิพัฒน์',
];

export const TELEMED_ORDER_KIND = {
  med:     { label: 'สั่งยา',            icon: 'pill',            tone: 'green' },
  lab:     { label: 'สั่งตรวจ LAB',      icon: 'labs',            tone: 'blue' },
  xray:    { label: 'สั่ง X-ray',        icon: 'radiology',       tone: 'purple' },
  consult: { label: 'ส่งปรึกษาภายใน',    icon: 'forum',           tone: 'teal' },
  refer:   { label: 'ส่งต่อภายนอก',      icon: 'move_up',         tone: 'orange' },
};

/* ── seed rows ───────────────────────────────────────────────────────── */
const SEED_VISITS = [
  {
    id: 'TMV-001', queue: 'T-01', hn: '67-00001', name: 'นายสมชาย มีสุข', sex: 'ชาย', age: 42,
    type: 'appointment', status: 'waiting',
    appointmentAt: todayAt(9, 30), checkinAt: todayAt(9, 12),
    rights: 'สิทธิประกันสังคม รพ.พระนั่งเกล้า (10686)', rightsExpired: false,
    authen: 'ok', authenCode: 'AUT-6801-2394',
    originUnit: 'รพ.สต. บางบัวทอง 2', doctor: 'พญ.สมหญิง รักษาดี', department: 'คลินิกโรคเรื้อรัง (NCD)',
    phone: '081-234-5678', consentKey: 'TMC-001',
    chiefComplaint: 'ติดตามระดับน้ำตาลและความดัน ผู้ป่วยเบาหวานชนิดที่ 2',
    notifications: [{ seq: 1, at: todayAt(8, 30), channel: 'SMS' }],
    orders: [], evidence: [],
    startedAt: null, endedAt: null,
  },
  {
    id: 'TMV-002', queue: 'T-02', hn: '67-00002', name: 'นางสาวดวงใจ พินิจ', sex: 'หญิง', age: 29,
    type: 'appointment', status: 'appointment',
    appointmentAt: todayAt(10, 0), checkinAt: null,
    rights: 'สิทธิบัตรทอง (UC) ศบส.4 ดินแดง', rightsExpired: false,
    authen: 'pending', authenCode: '',
    originUnit: 'ศบส.4 ดินแดง (หน่วยชุมชน)', doctor: 'นพ.ธนกร ใจดี', department: 'อายุรกรรมทั่วไป',
    phone: '089-555-1200', consentKey: 'TMC-002',
    chiefComplaint: 'ปวดศีรษะเรื้อรัง 2 สัปดาห์ ขอปรึกษาก่อนมาตรวจที่ศูนย์',
    notifications: [], orders: [], evidence: [],
    startedAt: null, endedAt: null,
  },
  {
    id: 'TMV-003', queue: 'T-03', hn: '67-00007', name: 'นางบุญมา ทองดี', sex: 'หญิง', age: 68,
    type: 'appointment', status: 'inprogress',
    appointmentAt: todayAt(9, 0), checkinAt: todayAt(8, 51),
    rights: 'สิทธิบัตรทอง (UC) ศบส.41 คลองเตย', rightsExpired: false,
    authen: 'ok', authenCode: 'AUT-6801-2388',
    originUnit: 'ศบส.41 คลองเตย (ชุมชนล็อค 1-2-3)', doctor: 'พญ.สมหญิง รักษาดี', department: 'คลินิกผู้สูงอายุ',
    phone: '086-773-4412', consentKey: 'TMC-003',
    chiefComplaint: 'ความดันสูงต่อเนื่อง อสม. วัดได้ 168/96 ติดกัน 2 ครั้ง',
    notifications: [{ seq: 1, at: todayAt(8, 0), channel: 'SMS' }, { seq: 2, at: todayAt(8, 45), channel: 'Mobile App' }],
    orders: [], evidence: [],
    startedAt: todayAt(9, 4), endedAt: null,
  },
  {
    id: 'TMV-004', queue: 'T-04', hn: '67-00011', name: 'นายประเสริฐ วัฒนกุล', sex: 'ชาย', age: 57,
    type: 'walkin', status: 'walkin',
    appointmentAt: null, checkinAt: todayAt(10, 22),
    rights: 'ชำระเงินเอง (สิทธิหมดอายุ 31 ก.ค. 2569)', rightsExpired: true,
    authen: 'none', authenCode: '',
    originUnit: 'รพ.สต. คลองสามวา', doctor: 'นพ.ปรัชญา อินทรวิเชียร', department: 'เวชศาสตร์ครอบครัว',
    phone: '', consentKey: 'TMC-004',
    chiefComplaint: 'เจาะน้ำตาลปลายนิ้วที่บ้านได้ 62 mg/dL มีอาการใจสั่น',
    notifications: [], orders: [], evidence: [],
    startedAt: null, endedAt: null,
  },
  {
    id: 'TMV-005', queue: 'T-05', hn: '67-00005', name: 'นางสาวกาญจนา ศรีสุข', sex: 'หญิง', age: 35,
    type: 'appointment', status: 'done',
    appointmentAt: todayAt(8, 30), checkinAt: todayAt(8, 18),
    rights: 'สิทธิข้าราชการ (เบิกจ่ายตรง)', rightsExpired: false,
    authen: 'na', authenCode: '',
    originUnit: 'ศบส.15 ลาดพร้าว', doctor: 'พญ.วราภรณ์ สุขใจ', department: 'อายุรกรรมทั่วไป',
    phone: '082-114-9080', consentKey: 'TMC-005',
    chiefComplaint: 'ติดตามผลตรวจไทรอยด์ + ปรับขนาดยา',
    notifications: [{ seq: 1, at: todayAt(7, 30), channel: 'SMS' }],
    orders: [
      { id: 'ORD-5001', kind: 'med', label: 'Levothyroxine 50 mcg', detail: 'รับประทาน 1 เม็ด ก่อนอาหารเช้า 30 นาที · 30 เม็ด', at: todayAt(8, 52), by: 'พญ.วราภรณ์ สุขใจ', status: 'active' },
      { id: 'ORD-5002', kind: 'lab', label: 'TSH / Free T4', detail: 'นัดเจาะเลือดที่ ศบส.15 ก่อนพบแพทย์ครั้งถัดไป', at: todayAt(8, 54), by: 'พญ.วราภรณ์ สุขใจ', status: 'active' },
    ],
    evidence: [
      { id: 'EV-5001', name: 'screenshot-consult-0830.png', kind: 'image', size: '412 KB', at: todayAt(8, 56), by: 'พญ.วราภรณ์ สุขใจ' },
    ],
    startedAt: todayAt(8, 34), endedAt: todayAt(8, 58),
  },
  {
    id: 'TMV-006', queue: 'T-06', hn: '67-00009', name: 'นายวิเชียร มั่นคง', sex: 'ชาย', age: 61,
    type: 'appointment', status: 'appointment',
    appointmentAt: todayAt(13, 30), checkinAt: null,
    rights: 'สิทธิบัตรทอง (UC) ศบส.21 วัดธาตุทอง', rightsExpired: false,
    authen: 'ok', authenCode: 'AUT-6801-2401',
    originUnit: 'ศบส.21 วัดธาตุทอง (หน่วยเคลื่อนที่)', doctor: 'นพ.ธนกร ใจดี', department: 'คลินิกโรคเรื้อรัง (NCD)',
    phone: '090-889-2311', consentKey: 'TMC-006',
    chiefComplaint: 'HbA1c 9.2% ครั้งล่าสุด — เข้าเกณฑ์ส่งปรึกษาทางไกลตามคู่มือ',
    notifications: [], orders: [], evidence: [],
    startedAt: null, endedAt: null,
  },
  {
    id: 'TMV-007', queue: 'T-07', hn: '67-00013', name: 'นางมาลี ศรีวิไล', sex: 'หญิง', age: 73,
    type: 'walkin', status: 'waiting',
    appointmentAt: null, checkinAt: todayAt(10, 40),
    rights: 'สิทธิบัตรทอง (UC) ศบส.4 ดินแดง', rightsExpired: false,
    authen: 'pending', authenCode: '',
    originUnit: 'ศบส.4 ดินแดง (หน่วยชุมชน)', doctor: 'พญ.สมหญิง รักษาดี', department: 'คลินิกผู้สูงอายุ',
    phone: '081-990-0022', consentKey: 'TMC-007',
    chiefComplaint: 'ผู้ป่วยติดบ้าน ลูกหลานขอปรึกษาแทน เรื่องแผลกดทับที่สะโพก',
    notifications: [{ seq: 1, at: todayAt(10, 45), channel: 'SMS' }],
    orders: [], evidence: [],
    startedAt: null, endedAt: null,
  },
  {
    id: 'TMV-008', queue: 'T-08', hn: '67-00016', name: 'นายอนุชา เรืองศรี', sex: 'ชาย', age: 45,
    type: 'appointment', status: 'cancelled',
    appointmentAt: todayAt(11, 0), checkinAt: null,
    rights: 'สิทธิประกันสังคม รพ.กลาง', rightsExpired: false,
    authen: 'na', authenCode: '',
    originUnit: 'รพ.สต. คลองสามวา', doctor: 'นพ.ปรัชญา อินทรวิเชียร', department: 'เวชศาสตร์ครอบครัว',
    phone: '087-441-2255', consentKey: 'TMC-008',
    chiefComplaint: 'ตรวจติดตามอาการปวดหลัง',
    notifications: [{ seq: 1, at: todayAt(9, 55), channel: 'SMS' }],
    orders: [], evidence: [],
    startedAt: null, endedAt: null,
    cancel: { reason: 'ผู้รับบริการแจ้งติดธุระ ขอเลื่อนเป็นสัปดาห์หน้า', by: 'นายวีรยุทธ พงษ์ไพศาล', at: todayAt(10, 5) },
  },
];

/* ── store ───────────────────────────────────────────────────────────── */
const VISITS = SEED_VISITS.map((v) => ({
  ...v,
  orders: v.orders.map((o) => ({ ...o })),
  evidence: v.evidence.map((e) => ({ ...e })),
  notifications: v.notifications.map((n) => ({ ...n })),
  audit: [],
}));

const listeners = new Set();
const emit = () => listeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });

export const subscribeTelemedVisits = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const getTelemedVisits = () => VISITS.map((v) => ({
  ...v,
  orders: v.orders.map((o) => ({ ...o })),
  evidence: v.evidence.map((e) => ({ ...e })),
  notifications: v.notifications.map((n) => ({ ...n })),
  audit: v.audit.map((a) => ({ ...a })),
}));

export const getTelemedVisit = (id) => getTelemedVisits().find((v) => v.id === id) || null;

export const getTelemedVisitByHn = (hn) => getTelemedVisits().find((v) => v.hn === hn) || null;

const findRaw = (id) => VISITS.find((v) => v.id === id);

const pushAudit = (visit, actor, action, detail) => {
  visit.audit.unshift({
    id: `AUD-${Date.now()}-${Math.round(Math.random() * 999)}`,
    at: new Date().toISOString(),
    by: actor,
    action,
    detail: detail || '',
  });
};

/** จำนวนครั้งสูงสุดที่ส่งข้อความแจ้งเตือนได้ — คู่มือมีแค่ (1) และ (2) */
export const TELEMED_MAX_NOTIFICATIONS = 2;

/**
 * "ส่งตรวจ" — คู่มือบท 3 §4: ติ๊กเลือกหลายรายการแล้วกดปุ่มเดียว.
 * คืนสรุปว่าสำเร็จกี่รายการ / ข้ามกี่รายการ (พร้อมเหตุผลรายตัว).
 */
export const sendVisitsToExam = (ids, actor) => {
  const sent = [];
  const skipped = [];
  ids.forEach((id) => {
    const v = findRaw(id);
    if (!v) { skipped.push({ id, reason: 'ไม่พบรายการ' }); return; }
    if (v.status === 'cancelled') { skipped.push({ id, name: v.name, reason: 'รายการถูกยกเลิกแล้ว' }); return; }
    if (v.status === 'waiting' || v.status === 'inprogress' || v.status === 'done') {
      skipped.push({ id, name: v.name, reason: `อยู่ในสถานะ "${TELEMED_VISIT_STATUS[v.status].label}" อยู่แล้ว` });
      return;
    }
    if (v.rightsExpired) { skipped.push({ id, name: v.name, reason: 'สิทธิการรักษาหมดอายุ — ตรวจสอบสิทธิก่อนส่งตรวจ' }); return; }
    if (v.authen === 'none') { skipped.push({ id, name: v.name, reason: 'ยังไม่ได้ขอ Authen Code สปสช.' }); return; }
    v.status = 'waiting';
    v.sentToExamAt = new Date().toISOString();
    v.sentToExamBy = actor;
    pushAudit(v, actor, 'ส่งตรวจ', 'สถานะเปลี่ยนเป็น "รอเข้าตรวจ"');
    sent.push({ id, name: v.name });
  });
  if (sent.length) emit();
  return { sent, skipped };
};

/** ส่งข้อความแจ้งเตือนก่อนถึงคิว (TOR §4.3.5 · คู่มือ "ส่งข้อความแจ้งเตือน (1)/(2)") */
export const sendVisitNotification = (id, actor, channel = 'SMS') => {
  const v = findRaw(id);
  if (!v) return { ok: false, reason: 'ไม่พบรายการ' };
  if (!v.phone) return { ok: false, reason: 'ไม่มีเบอร์โทรศัพท์ในทะเบียน — แก้ไขข้อมูลติดต่อก่อนส่งแจ้งเตือน' };
  if (v.notifications.length >= TELEMED_MAX_NOTIFICATIONS) {
    const last = v.notifications[v.notifications.length - 1];
    return { ok: false, reason: `ส่งครบ ${TELEMED_MAX_NOTIFICATIONS} ครั้งแล้ว (ครั้งล่าสุด ${formatClock(last.at)})` };
  }
  const seq = v.notifications.length + 1;
  v.notifications.push({ seq, at: new Date().toISOString(), channel });
  pushAudit(v, actor, `ส่งข้อความแจ้งเตือน (${seq})`, channel);
  emit();
  return { ok: true, seq };
};

/** ยกเลิกรายการ — soft cancel + เหตุผลบังคับ (ยังเห็นในแท็บ "ยกเลิก") */
export const cancelTelemedVisit = (id, reason, actor) => {
  const v = findRaw(id);
  if (!v) return { ok: false, reason: 'ไม่พบรายการ' };
  if (!reason || !reason.trim()) return { ok: false, reason: 'ต้องระบุเหตุผลการยกเลิก' };
  v.prevStatus = v.status;
  v.status = 'cancelled';
  v.cancel = { reason: reason.trim(), by: actor, at: new Date().toISOString() };
  pushAudit(v, actor, 'ยกเลิกรายการ', reason.trim());
  emit();
  return { ok: true };
};

/** กู้คืนรายการที่ยกเลิก (ไม่ hard delete → กู้คืนได้เสมอ) */
export const restoreTelemedVisit = (id, actor) => {
  const v = findRaw(id);
  if (!v || v.status !== 'cancelled') return { ok: false, reason: 'รายการนี้ไม่ได้อยู่ในสถานะยกเลิก' };
  v.status = v.prevStatus || (v.type === 'walkin' ? 'walkin' : 'appointment');
  const restoredFrom = v.cancel;
  v.cancel = null;
  pushAudit(v, actor, 'กู้คืนรายการที่ยกเลิก', restoredFrom ? `เหตุผลเดิม: ${restoredFrom.reason}` : '');
  emit();
  return { ok: true };
};

/** แก้ไขรายการ (แพทย์ / แผนก / อาการเบื้องต้น / Authen Code / เบอร์โทร) */
export const updateTelemedVisit = (id, patch, actor) => {
  const v = findRaw(id);
  if (!v) return { ok: false, reason: 'ไม่พบรายการ' };
  const changed = Object.keys(patch).filter((k) => v[k] !== patch[k]);
  Object.assign(v, patch);
  if (patch.authenCode && patch.authenCode.trim()) v.authen = 'ok';
  v.updatedAt = new Date().toISOString();
  v.updatedBy = actor;
  pushAudit(v, actor, 'แก้ไขรายการ', changed.join(', '));
  emit();
  return { ok: true, changed };
};

/** เปลี่ยนสถานะ (เข้าสาย → กำลังตรวจ · จบสาย → ตรวจแล้ว) */
export const setTelemedVisitStatus = (id, status, actor) => {
  const v = findRaw(id);
  if (!v || !TELEMED_VISIT_STATUS[status]) return { ok: false };
  v.status = status;
  if (status === 'inprogress' && !v.startedAt) v.startedAt = new Date().toISOString();
  if (status === 'done') v.endedAt = new Date().toISOString();
  pushAudit(v, actor, 'เปลี่ยนสถานะ', TELEMED_VISIT_STATUS[status].label);
  emit();
  return { ok: true };
};

/** บันทึกคำสั่งการรักษาระหว่างสาย (ยา / LAB / X-ray / consult / refer) */
export const addTelemedOrder = (id, order, actor) => {
  const v = findRaw(id);
  if (!v) return { ok: false, reason: 'ไม่พบรายการ' };
  const row = {
    id: `ORD-${Date.now()}-${Math.round(Math.random() * 999)}`,
    at: new Date().toISOString(),
    by: actor,
    status: 'active',
    ...order,
  };
  v.orders.push(row);
  pushAudit(v, actor, `${TELEMED_ORDER_KIND[order.kind]?.label || 'คำสั่ง'}`, order.label);
  emit();
  return { ok: true, order: row };
};

/** ยกเลิกคำสั่ง — ต้องถอนจากฝั่งมือถือผู้ป่วยด้วย (สถานะ 'cancelled' ไม่ลบทิ้ง) */
export const cancelTelemedOrder = (visitId, orderId, reason, actor) => {
  const v = findRaw(visitId);
  if (!v) return { ok: false, reason: 'ไม่พบรายการ' };
  const o = v.orders.find((x) => x.id === orderId);
  if (!o) return { ok: false, reason: 'ไม่พบคำสั่งนี้' };
  if (!reason || !reason.trim()) return { ok: false, reason: 'ต้องระบุเหตุผลการยกเลิกคำสั่ง' };
  o.status = 'cancelled';
  o.cancelReason = reason.trim();
  o.cancelledBy = actor;
  o.cancelledAt = new Date().toISOString();
  pushAudit(v, actor, 'ยกเลิกคำสั่งการรักษา', `${o.label} · ${reason.trim()}`);
  emit();
  return { ok: true };
};

/** แก้ไขคำสั่ง (เช่น ปรับ sig / จำนวน) — เก็บค่าเดิมไว้เป็นร่องรอย */
export const updateTelemedOrder = (visitId, orderId, patch, actor) => {
  const v = findRaw(visitId);
  const o = v?.orders.find((x) => x.id === orderId);
  if (!o) return { ok: false, reason: 'ไม่พบคำสั่งนี้' };
  o.previous = { label: o.label, detail: o.detail };
  Object.assign(o, patch);
  o.editedBy = actor;
  o.editedAt = new Date().toISOString();
  pushAudit(v, actor, 'แก้ไขคำสั่งการรักษา', o.label);
  emit();
  return { ok: true };
};

/** อัพโหลดหลักฐานการให้บริการ (คู่มือ 5.3.5 — ไม่มีภาพ+เวลา = เบิกจ่ายไม่ได้) */
export const TELEMED_EVIDENCE_ACCEPT = ['image/png', 'image/jpeg', 'application/pdf'];
export const TELEMED_EVIDENCE_ACCEPT_LABEL = 'PNG · JPG · PDF';
export const TELEMED_EVIDENCE_MAX_MB = 10;

export const addTelemedEvidence = (id, file, actor) => {
  const v = findRaw(id);
  if (!v) return { ok: false, reason: 'ไม่พบรายการ' };
  if (file.type && !TELEMED_EVIDENCE_ACCEPT.includes(file.type)) {
    return { ok: false, reason: `ชนิดไฟล์ไม่รองรับ — รับเฉพาะ ${TELEMED_EVIDENCE_ACCEPT_LABEL}` };
  }
  if (file.sizeMb && file.sizeMb > TELEMED_EVIDENCE_MAX_MB) {
    return { ok: false, reason: `ไฟล์ใหญ่เกิน ${TELEMED_EVIDENCE_MAX_MB} MB (ไฟล์นี้ ${file.sizeMb.toFixed(1)} MB)` };
  }
  const row = {
    id: `EV-${Date.now()}`,
    name: file.name,
    kind: file.type === 'application/pdf' ? 'pdf' : 'image',
    size: file.size || `${((file.sizeMb || 0.4) * 1024).toFixed(0)} KB`,
    at: new Date().toISOString(),
    by: actor,
  };
  v.evidence.push(row);
  pushAudit(v, actor, 'อัพโหลดหลักฐานการให้บริการ', row.name);
  emit();
  return { ok: true, evidence: row };
};

export const removeTelemedEvidence = (id, evidenceId, reason, actor) => {
  const v = findRaw(id);
  if (!v) return { ok: false, reason: 'ไม่พบรายการ' };
  const idx = v.evidence.findIndex((e) => e.id === evidenceId);
  if (idx < 0) return { ok: false, reason: 'ไม่พบไฟล์นี้' };
  const [removed] = v.evidence.splice(idx, 1);
  pushAudit(v, actor, 'ลบหลักฐานการให้บริการ', `${removed.name} · ${reason || 'ไม่ระบุเหตุผล'}`);
  emit();
  return { ok: true };
};

/** บันทึกเวลาเริ่ม-สิ้นสุดการให้บริการ (คู่มือ: ต้องมีคู่กับหลักฐาน) */
export const setTelemedServiceWindow = (id, { startedAt, endedAt }, actor) => {
  const v = findRaw(id);
  if (!v) return { ok: false, reason: 'ไม่พบรายการ' };
  if (startedAt && endedAt && new Date(endedAt) < new Date(startedAt)) {
    return { ok: false, reason: 'เวลาสิ้นสุดต้องไม่ก่อนเวลาเริ่ม' };
  }
  if (startedAt !== undefined) v.startedAt = startedAt;
  if (endedAt !== undefined) v.endedAt = endedAt;
  pushAudit(v, actor, 'บันทึกเวลาให้บริการ', `${formatClock(v.startedAt)} – ${formatClock(v.endedAt)}`);
  emit();
  return { ok: true };
};

/** ตรวจว่า visit เบิกจ่ายได้ไหม (มีหลักฐาน + เวลาเริ่ม-สิ้นสุดครบ) */
export const isClaimReady = (visit) =>
  Boolean(visit && visit.evidence?.length && visit.startedAt && visit.endedAt);

/** visit ที่ปิดแล้ว / เกิน 24 ชม. → read-only (ต้อง "ขอแก้ไขย้อนหลัง") */
export const isVisitLocked = (visit) => {
  if (!visit) return true;
  if (visit.status === 'done') return true;
  if (!visit.endedAt) return false;
  return (Date.now() - new Date(visit.endedAt).getTime()) > 24 * 60 * 60 * 1000;
};

/** นาทีที่ให้บริการจริง (ใช้ในรายงานสถิติ) */
export const visitDurationMinutes = (visit) => {
  if (!visit?.startedAt || !visit?.endedAt) return null;
  return Math.max(0, Math.round((new Date(visit.endedAt) - new Date(visit.startedAt)) / 60000));
};
