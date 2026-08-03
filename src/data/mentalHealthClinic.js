/* mentalHealthClinic.js — mock data + helpers for งานสุขภาพจิต (TOR §1.10.3).

   Vocabulary follows the legacy HCIS manual (คู่มือระบบสุขภาพจิตและคลินิก
   สุขภาพจิต ch.2): ลำดับคิวซักประวัติ (§2.2), ทะเบียนสุขภาพจิต with auto-run
   เลขที่สุขภาพจิต (§2.3), บันทึกคัดกรองทางจิต MSE (§2.6), แบบประเมิน
   2Q → 9Q → 8Q + ST-5 + ภาวะสมองเสื่อม (§2.7), การบำบัดทางจิตและส่งเสริม
   สุขภาพ (§2.8), ส่งต่อสุขภาพจิต (§2.11), ตรวจร่างกาย (§2.5).

   Session-mutable state (queue check-in / cancels, registry saves, visit
   records, drafts, rights toggle, print log) lives in sessionStorage —
   same pattern as `ancVisits.js`: survives route navigation within the
   tab, resets per browser session so the mock always demos clean. */

/* ── sessionStorage plumbing (mirrors ancVisits.js) ────────────────── */
const storageAvailable = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const readJson = (key, fallback) => {
  if (!storageAvailable()) return fallback;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(key) || 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  if (!storageAvailable()) return;
  window.sessionStorage.setItem(key, JSON.stringify(value));
};

const K = {
  checkedIn: 'mih:mh:checked-in',
  queueCancelled: 'mih:mh:queue-cancelled',
  registry: 'mih:mh:registry-overlay',
  registryRun: 'mih:mh:registry-run',
  visits: 'mih:mh:visit-records',
  drafts: 'mih:mh:drafts',
  rights: 'mih:mh:rights',
  printLog: 'mih:mh:print-log',
};

/* ── Date helpers ──────────────────────────────────────────────────── */
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export const formatMhDate = (v) => {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
};

export const formatMhDateTime = (v) => {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${formatMhDate(d)} ${hh}:${mm} น.`;
};

/* ── Current user (mock) + confidentiality rights (§1.4.2) ─────────── */
export const MH_CURRENT_USER = 'พว.กานดา แสงจันทร์';

/* Mental-health records are ข้อมูลลับ — only users holding the
   mental-health-clinic right may read diagnosis/assessment content.
   sessionStorage-backed so the "สิทธิไม่พอ" masked state is demoable. */
export const hasMentalHealthRights = () => readJson(K.rights, 'granted') === 'granted';
export const setMentalHealthRights = (granted) => writeJson(K.rights, granted ? 'granted' : 'denied');

export const maskConfidential = (text) =>
  (hasMentalHealthRights() ? text : '••••••••');

/* ── Assessors (ผู้ประเมิน / ผู้คัดกรอง) ───────────────────────────── */
export const MH_ASSESSORS = [
  'พว.กานดา แสงจันทร์',
  'พว.รุ่งนภา ทองสุก',
  'นักจิตวิทยา วริษา ตั้งตรง',
  'นพ.ประวิทย์ จิตต์เมตตา',
  'พญ.ชลิดา วัฒนโกศล',
];

export const MH_DOCTORS = ['นพ.ประวิทย์ จิตต์เมตตา', 'พญ.ชลิดา วัฒนโกศล'];

/* ── ระดับการเฝ้าระวัง (suicide-watch badge on the queue) ──────────── */
export const resolveMhWatchLevel = (row) => {
  if ((row.last9Q ?? 0) >= 7 || (row.last8Q ?? 0) > 0) {
    return { key: 'suicideRisk', label: 'เสี่ยงฆ่าตัวตาย', style: 'red' };
  }
  if ((row.last9Q ?? 0) > 0) return { key: 'monitor', label: 'เฝ้าระวังซึมเศร้า', style: 'yellow' };
  return { key: 'normal', label: 'ปกติ', style: 'green' };
};

/* ── Queue (ลำดับคิวซักประวัติ — manual §2.2) ──────────────────────── */
const todayAt = (h, m) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const MH_QUEUE_PATIENTS = [
  {
    queue: 'M01', hn: '67-00002', name: 'ดวงใจ พินิจ', sex: 'หญิง', age: '29 ปี',
    cid: '3401200458931', insurance: 'สิทธิบัตรทอง',
    mhNumber: 'สจ.69-0004', chiefComplaint: 'นอนไม่หลับ เบื่อหน่าย 2 สัปดาห์',
    last9Q: 9, last8Q: 0,
    doctor: 'นพ.ประวิทย์ จิตต์เมตตา', room: 'จิตเวช 1',
    telemedicine: false, statusKey: 'waiting', waitMinutes: 25, visitType: 'followup',
  },
  {
    queue: 'M02', hn: '67-00010', name: 'นพดล ช่วยเหลือ', sex: 'ชาย', age: '35 ปี',
    cid: '1100600384912', insurance: 'ชำระเอง',
    mhNumber: '', chiefComplaint: 'เครียดจากงาน ใจสั่น ปวดศีรษะ',
    last9Q: 0, last8Q: 0,
    doctor: 'พญ.ชลิดา วัฒนโกศล', room: 'จิตเวช 2',
    telemedicine: false, statusKey: 'waiting', waitMinutes: 12, visitType: 'first',
  },
  {
    queue: 'M03', hn: '67-00008', name: 'ธนพร สุนทรา', sex: 'หญิง', age: '31 ปี',
    cid: '1101400785632', insurance: 'สิทธิบัตรทอง',
    mhNumber: 'สจ.69-0002', chiefComplaint: 'ติดตามอาการซึมเศร้า รับยาต่อเนื่อง',
    last9Q: 13, last8Q: 2,
    doctor: 'นพ.ประวิทย์ จิตต์เมตตา', room: 'จิตเวช 1',
    telemedicine: true, telemedAppointmentAt: todayAt(10, 30),
    statusKey: 'progress', waitMinutes: 41, visitType: 'followup',
  },
  {
    queue: 'M04', hn: '67-00016', name: 'ปกรณ์ บุญพิทักษ์', sex: 'ชาย', age: '24 ปี',
    cid: '1100401473652', insurance: 'สิทธิประกันสังคม',
    mhNumber: '', chiefComplaint: 'วิตกกังวล หายใจไม่อิ่ม ส่งต่อจาก OPD',
    last9Q: 0, last8Q: 0,
    doctor: 'พญ.ชลิดา วัฒนโกศล', room: 'จิตเวช 2',
    telemedicine: false, statusKey: 'progress', waitMinutes: 18, visitType: 'first',
  },
  {
    queue: 'M05', hn: '67-00005', name: 'สุดา ปลอดโปร่ง', sex: 'หญิง', age: '67 ปี',
    cid: '3550900192864', insurance: 'สิทธิบัตรทอง',
    mhNumber: 'สจ.69-0001', chiefComplaint: 'หลงลืมบ่อย ญาติพามาตรวจภาวะสมองเสื่อม',
    last9Q: 2, last8Q: 0,
    doctor: 'นพ.ประวิทย์ จิตต์เมตตา', room: 'จิตเวช 1',
    telemedicine: false, statusKey: 'done', waitMinutes: 0, visitType: 'followup',
  },
  {
    queue: 'M06', hn: '67-00020', name: 'กฤษดา ผ่องใส', sex: 'ชาย', age: '33 ปี',
    cid: '1100600296481', insurance: 'สิทธิประกันสังคม',
    mhNumber: 'สจ.69-0005', chiefComplaint: 'ติดตามหลังปรับยา ประเมิน 9Q ซ้ำ',
    last9Q: 5, last8Q: 0,
    doctor: 'พญ.ชลิดา วัฒนโกศล', room: 'จิตเวช 2',
    telemedicine: true, telemedAppointmentAt: todayAt(14, 0),
    statusKey: 'done', waitMinutes: 0, visitType: 'followup',
  },
  {
    queue: 'M07', hn: '67-00013', name: 'พิมพ์ใจ จันทรา', sex: 'หญิง', age: '26 ปี',
    cid: '1809900739581', insurance: 'สิทธิประกันสังคม',
    mhNumber: '', chiefComplaint: 'ร้องไห้บ่อย หลังคลอดบุตร 1 เดือน',
    last9Q: 0, last8Q: 0,
    doctor: 'นพ.ประวิทย์ จิตต์เมตตา', room: 'จิตเวช 1',
    telemedicine: false, statusKey: 'draft', draftStep: 2, waitMinutes: 0, visitType: 'first',
  },
  {
    queue: 'M08', hn: '67-00018', name: 'ธีรเดช อัครพงศ์', sex: 'ชาย', age: '55 ปี',
    cid: '5670012467128', insurance: 'สิทธิหมดอายุ (ชำระเอง)', rightsExpired: true,
    mhNumber: 'สจ.69-0003', chiefComplaint: 'ดื่มสุราหนัก ครอบครัวพามาปรึกษา',
    last9Q: 8, last8Q: 4,
    doctor: 'พญ.ชลิดา วัฒนโกศล', room: 'จิตเวช 2',
    telemedicine: false, statusKey: 'waiting', waitMinutes: 7, visitType: 'followup',
  },
];

/* ผู้ป่วยนัดที่ยังไม่มาติดต่อ (§2.2 tab 2) */
export const MH_SCHEDULED_TODAY = [
  {
    hn: '67-00023', name: 'ภัทรานิษฐ์ บูรณะ', sex: 'หญิง', age: '36 ปี',
    cid: '3401200971563', insurance: 'สิทธิประกันสังคม',
    mhNumber: 'สจ.69-0006', appointmentTime: '13:00',
    chiefComplaint: 'นัดติดตามผลปรับยา Sertraline', last9Q: 6, last8Q: 0,
    doctor: 'นพ.ประวิทย์ จิตต์เมตตา', clinic: 'สุขภาพจิต', visitType: 'followup',
  },
  {
    hn: '67-00011', name: 'อรอุมา ดวงสว่าง', sex: 'หญิง', age: '48 ปี',
    cid: '3401200583926', insurance: 'สิทธิประกันสังคม',
    mhNumber: 'สจ.69-0007', appointmentTime: '14:30',
    chiefComplaint: 'นัดทำจิตบำบัดรายบุคคล ครั้งที่ 3', last9Q: 4, last8Q: 0,
    doctor: 'พญ.ชลิดา วัฒนโกศล', clinic: 'สุขภาพจิต', visitType: 'followup',
  },
];

export const checkInMhAppointment = (hn) => {
  const checked = readJson(K.checkedIn, []);
  if (!checked.includes(hn)) writeJson(K.checkedIn, [...checked, hn]);
};

export const getMhScheduledNotArrived = () => {
  const checked = readJson(K.checkedIn, []);
  return MH_SCHEDULED_TODAY.filter((r) => !checked.includes(r.hn));
};

export const getMhQueueRows = () => {
  const checked = readJson(K.checkedIn, []);
  const arrivals = MH_SCHEDULED_TODAY.filter((r) => checked.includes(r.hn)).map((r, i) => ({
    queue: `M${String(MH_QUEUE_PATIENTS.length + i + 1).padStart(2, '0')}`,
    hn: r.hn, name: r.name, sex: r.sex, age: r.age, cid: r.cid, insurance: r.insurance,
    mhNumber: r.mhNumber, chiefComplaint: r.chiefComplaint,
    last9Q: r.last9Q, last8Q: r.last8Q,
    doctor: r.doctor, room: 'จิตเวช 1', telemedicine: false,
    statusKey: 'waiting', waitMinutes: 0, visitType: r.visitType,
  }));
  return [...MH_QUEUE_PATIENTS, ...arrivals];
};

/* ยกเลิกคิว — audit line (ผู้ยกเลิก + เวลา + เหตุผล) per playbook §5 */
export const cancelMhQueue = (hn, reason) => {
  const cancelled = readJson(K.queueCancelled, {});
  cancelled[hn] = { reason: reason || '', by: MH_CURRENT_USER, at: new Date().toISOString() };
  writeJson(K.queueCancelled, cancelled);
};
export const restoreMhQueue = (hn) => {
  const cancelled = readJson(K.queueCancelled, {});
  delete cancelled[hn];
  writeJson(K.queueCancelled, cancelled);
};
export const getMhQueueCancellation = (hn) => readJson(K.queueCancelled, {})[hn] || null;

/* ── ทะเบียนสุขภาพจิต (manual §2.3, TOR 1.10.3.6) ──────────────────── */
export const MH_ISSUED_AT_OPTIONS = [
  { value: 'center', label: 'ศบส. (ศูนย์บริการสาธารณสุข)' },
  { value: 'community', label: 'ชุมชน' },
  { value: 'school', label: 'โรงเรียน' },
];

export const resolveMhIssuedAt = (value) =>
  MH_ISSUED_AT_OPTIONS.find((o) => o.value === value)?.label || '—';

export const EMPTY_MH_FAMILY = { name: '', birthDate: '', occupation: '' };

const REGISTRY_SEED = [
  {
    id: 'reg-1', mhNumber: 'สจ.69-0001', hn: '67-00005', name: 'สุดา ปลอดโปร่ง',
    issuedAt: 'center', registeredDate: '2026-01-12', status: 'active',
    recordedBy: 'พว.กานดา แสงจันทร์', recordedAt: '2026-01-12T09:42:00',
    currentAddress: '47/3 ซ.พระราม 2 ซอย 25 บางขุนเทียน กรุงเทพมหานคร 10150',
    houseRegAddress: '47/3 ซ.พระราม 2 ซอย 25 บางขุนเทียน กรุงเทพมหานคร 10150',
    family: {
      father: { name: 'นายปลอด ปลอดโปร่ง (ถึงแก่กรรม)', birthDate: '', occupation: '—' },
      mother: { name: 'นางแปลก ปลอดโปร่ง (ถึงแก่กรรม)', birthDate: '', occupation: '—' },
      spouse: { name: 'นายสมพงษ์ ปลอดโปร่ง', birthDate: '2497-03-02', occupation: 'ข้าราชการบำนาญ' },
    },
  },
  {
    id: 'reg-2', mhNumber: 'สจ.69-0002', hn: '67-00008', name: 'ธนพร สุนทรา',
    issuedAt: 'center', registeredDate: '2026-02-03', status: 'active',
    recordedBy: 'พว.รุ่งนภา ทองสุก', recordedAt: '2026-02-03T10:15:00',
    currentAddress: '99/8 ซ.รามคำแหง 24 หัวหมาก บางกะปิ กรุงเทพมหานคร 10240',
    houseRegAddress: '12 หมู่ 4 ต.บ้านฉาง อ.เมือง จ.ปทุมธานี 12000',
    family: {
      father: { name: 'นายธนกฤต สุนทรา', birthDate: '2500-06-14', occupation: 'เกษตรกร' },
      mother: { name: 'นางบุญมี สุนทรา', birthDate: '2503-11-02', occupation: 'แม่บ้าน' },
      spouse: { ...EMPTY_MH_FAMILY },
    },
  },
  {
    id: 'reg-3', mhNumber: 'สจ.69-0003', hn: '67-00018', name: 'ธีรเดช อัครพงศ์',
    issuedAt: 'community', registeredDate: '2026-03-19', status: 'active',
    recordedBy: 'พว.กานดา แสงจันทร์', recordedAt: '2026-03-19T14:02:00',
    currentAddress: '215 ชุมชนวัดไผ่ตัน สามเสนใน พญาไท กรุงเทพมหานคร 10400',
    houseRegAddress: '215 ชุมชนวัดไผ่ตัน สามเสนใน พญาไท กรุงเทพมหานคร 10400',
    family: {
      father: { ...EMPTY_MH_FAMILY },
      mother: { ...EMPTY_MH_FAMILY },
      spouse: { name: 'นางอรทัย อัครพงศ์', birthDate: '2516-08-25', occupation: 'ค้าขาย' },
    },
  },
  {
    id: 'reg-4', mhNumber: 'สจ.69-0004', hn: '67-00002', name: 'ดวงใจ พินิจ',
    issuedAt: 'center', registeredDate: '2026-04-07', status: 'active',
    recordedBy: 'นักจิตวิทยา วริษา ตั้งตรง', recordedAt: '2026-04-07T11:20:00',
    currentAddress: '88/12 ซ.พหลโยธิน 32 จตุจักร กรุงเทพมหานคร 10900',
    houseRegAddress: '88/12 ซ.พหลโยธิน 32 จตุจักร กรุงเทพมหานคร 10900',
    family: {
      father: { name: 'นายพินิจ พินิจ', birthDate: '2495-01-30', occupation: 'ข้าราชการบำนาญ' },
      mother: { name: 'นางเพ็ญศรี พินิจ', birthDate: '2500-05-18', occupation: 'แม่บ้าน' },
      spouse: { ...EMPTY_MH_FAMILY },
    },
  },
  {
    id: 'reg-5', mhNumber: 'สจ.69-0005', hn: '67-00020', name: 'กฤษดา ผ่องใส',
    issuedAt: 'center', registeredDate: '2026-05-22', status: 'active',
    recordedBy: 'พว.รุ่งนภา ทองสุก', recordedAt: '2026-05-22T09:05:00',
    currentAddress: '124/64 พงษ์เวชอนุสรณ์ 2 สุขุมวิท บางจาก พระโขนง กรุงเทพมหานคร 10260',
    houseRegAddress: '56 หมู่ 2 ต.บางรักน้อย อ.เมือง จ.นนทบุรี 11000',
    family: {
      father: { name: 'นายผ่อง ผ่องใส', birthDate: '2498-09-09', occupation: 'รับจ้างทั่วไป' },
      mother: { name: 'นางใส ผ่องใส', birthDate: '2502-12-24', occupation: 'ค้าขาย' },
      spouse: { name: 'นางสาวมนัสนันท์ ผ่องใส', birthDate: '2537-04-11', occupation: 'พนักงานบริษัท' },
    },
  },
  {
    id: 'reg-6', mhNumber: 'สจ.69-0006', hn: '67-00023', name: 'ภัทรานิษฐ์ บูรณะ',
    issuedAt: 'school', registeredDate: '2026-06-10', status: 'active',
    recordedBy: 'นักจิตวิทยา วริษา ตั้งตรง', recordedAt: '2026-06-10T13:48:00',
    currentAddress: '77/1 ซ.ลาดพร้าว 101 คลองจั่น บางกะปิ กรุงเทพมหานคร 10240',
    houseRegAddress: '77/1 ซ.ลาดพร้าว 101 คลองจั่น บางกะปิ กรุงเทพมหานคร 10240',
    family: {
      father: { name: 'นายบูรพา บูรณะ', birthDate: '2501-02-17', occupation: 'ครูเกษียณ' },
      mother: { name: 'นางบุษบา บูรณะ', birthDate: '2505-07-08', occupation: 'แม่บ้าน' },
      spouse: { ...EMPTY_MH_FAMILY },
    },
  },
  {
    id: 'reg-7', mhNumber: 'สจ.69-0007', hn: '67-00011', name: 'อรอุมา ดวงสว่าง',
    issuedAt: 'community', registeredDate: '2026-06-28', status: 'cancelled',
    recordedBy: 'พว.กานดา แสงจันทร์', recordedAt: '2026-06-28T10:33:00',
    cancellation: { reason: 'ย้ายไปรับการรักษาที่ รพ.ศรีธัญญา', by: 'พว.กานดา แสงจันทร์', at: '2026-07-15T15:20:00' },
    currentAddress: '31/5 ชุมชนริมคลองบางซื่อ จตุจักร กรุงเทพมหานคร 10900',
    houseRegAddress: '31/5 ชุมชนริมคลองบางซื่อ จตุจักร กรุงเทพมหานคร 10900',
    family: {
      father: { ...EMPTY_MH_FAMILY },
      mother: { name: 'นางดวงดี ดวงสว่าง', birthDate: '2490-10-05', occupation: '—' },
      spouse: { name: 'นายสว่าง ดวงสว่าง', birthDate: '2515-06-30', occupation: 'ขับรถแท็กซี่' },
    },
  },
];

/* Registry rows = seed + sessionStorage overlay (new/edited/cancelled). */
export const getMhRegistryRows = () => {
  const overlay = readJson(K.registry, {});
  const seedIds = REGISTRY_SEED.map((r) => r.id);
  const merged = REGISTRY_SEED.map((r) => (overlay[r.id] ? { ...r, ...overlay[r.id] } : r));
  const added = Object.values(overlay).filter((r) => !seedIds.includes(r.id));
  return [...merged, ...added];
};

export const getMhRegistrationByHn = (hn) =>
  getMhRegistryRows().find((r) => r.hn === hn && r.status !== 'cancelled')
  || getMhRegistryRows().find((r) => r.hn === hn)
  || null;

/* เลขที่สุขภาพจิต auto-runs ONLY on successful save (manual §2.3) —
   before save the field stays read-only/blank. Format: สจ.<ปีงบ พ.ศ. 2 หลัก>-<run>. */
const nextMhNumber = () => {
  const base = 7; /* seed already used สจ.69-0001 … สจ.69-0007 */
  const run = readJson(K.registryRun, base) + 1;
  writeJson(K.registryRun, run);
  return `สจ.69-${String(run).padStart(4, '0')}`;
};

export const saveMhRegistration = (entry) => {
  const overlay = readJson(K.registry, {});
  const isNew = !entry.id;
  const saved = {
    ...entry,
    id: entry.id || `reg-new-${Date.now()}`,
    mhNumber: entry.mhNumber || nextMhNumber(),
    registeredDate: entry.registeredDate || new Date().toISOString().slice(0, 10),
    status: entry.status || 'active',
    recordedBy: MH_CURRENT_USER,
    recordedAt: new Date().toISOString(),
  };
  overlay[saved.id] = saved;
  writeJson(K.registry, overlay);
  return { saved, isNew };
};

export const cancelMhRegistration = (id, reason) => {
  const overlay = readJson(K.registry, {});
  const current = getMhRegistryRows().find((r) => r.id === id);
  if (!current) return;
  overlay[id] = {
    ...current,
    status: 'cancelled',
    cancellation: { reason: reason || '', by: MH_CURRENT_USER, at: new Date().toISOString() },
  };
  writeJson(K.registry, overlay);
};

export const reactivateMhRegistration = (id) => {
  const overlay = readJson(K.registry, {});
  const current = getMhRegistryRows().find((r) => r.id === id);
  if (!current) return;
  overlay[id] = { ...current, status: 'active', cancellation: null };
  writeJson(K.registry, overlay);
};

/* ── บันทึกคัดกรองทางจิต — MSE (manual §2.6) ───────────────────────── */
export const MH_MSE_CHOICE_FIELDS = [
  { key: 'speech', label: 'Speech (การพูด)', notePlaceholder: 'เช่น พูดช้า เสียงเบา ตอบคำถามตรงประเด็น' },
  { key: 'affect', label: 'Affect (อารมณ์)', notePlaceholder: 'เช่น เศร้า หมองเหงา อารมณ์แกว่ง' },
  { key: 'thought', label: 'Thought (ความคิด)', notePlaceholder: 'เช่น คิดว่าตนเองไร้ค่า ไม่พบหลงผิด' },
  { key: 'perception', label: 'Perception (การรับรู้)', notePlaceholder: 'เช่น ไม่พบหูแว่ว ภาพหลอน' },
  { key: 'conscious', label: 'Conscious (ความรู้สึกตัว)', notePlaceholder: 'เช่น รู้สึกตัวดี ตื่นตัวปกติ' },
];

export const MH_MSE_TEXT_FIELDS = [
  { key: 'orientation', label: 'Orientation (การรับรู้วัน เวลา สถานที่ บุคคล)', placeholder: 'เช่น บอกวัน เวลา สถานที่ และบุคคลได้ถูกต้อง' },
  { key: 'memory', label: 'Memory (ความจำ)', placeholder: 'เช่น ความจำระยะสั้น/ระยะยาวปกติ' },
  { key: 'concentration', label: 'Concentration (สมาธิ — ให้ลบเลข 100-7 ต่อเนื่อง)', placeholder: 'เช่น 100-7 ได้ถูกต้อง 4 ใน 5 ครั้ง' },
  { key: 'insight', label: 'Insight (ความเข้าใจการเจ็บป่วยของตนเอง)', placeholder: 'เช่น ยอมรับว่าตนเองป่วยและต้องการรักษา' },
  { key: 'judgement', label: 'Judgement (การตัดสินใจ)', placeholder: 'เช่น ตัดสินใจแก้ปัญหาในชีวิตประจำวันได้เหมาะสม' },
];

export const MH_MSE_NOTE_SUGGESTIONS = [
  'พูดตอบคำถามตรงประเด็น น้ำเสียงปกติ',
  'อารมณ์เศร้า ร้องไห้ระหว่างสัมภาษณ์',
  'ไม่พบอาการหูแว่วหรือภาพหลอน',
  'ความคิดอยากทำร้ายตนเองเป็นบางครั้ง',
  'รู้สึกตัวดี ให้ความร่วมมือในการตรวจ',
];

/* ── แบบประเมิน 2Q (manual §2.7) ───────────────────────────────────── */
export const MH_2Q_QUESTIONS = [
  { key: 'q1', label: '1. ใน 2 สัปดาห์ที่ผ่านมา ท่านรู้สึกหดหู่ เศร้า หรือท้อแท้สิ้นหวังหรือไม่' },
  { key: 'q2', label: '2. ใน 2 สัปดาห์ที่ผ่านมา ท่านรู้สึกเบื่อ ทำอะไรก็ไม่เพลิดเพลินหรือไม่' },
];

export const interpret2Q = (answers) => {
  const answered = Object.keys(answers || {}).filter((k) => answers[k] !== undefined);
  const complete = answered.length === MH_2Q_QUESTIONS.length;
  const positive = Object.values(answers || {}).some((v) => v === true);
  return {
    complete,
    positive: complete && positive,
    negative: complete && !positive,
    label: !complete ? 'ยังประเมินไม่ครบ' : positive
      ? 'ผลบวก — มีแนวโน้มภาวะซึมเศร้า ให้ประเมินต่อด้วย 9Q'
      : 'ปกติ — ไม่มีแนวโน้มภาวะซึมเศร้า (ข้าม 9Q/8Q ได้)',
    style: !complete ? 'grey' : positive ? 'orange' : 'green',
  };
};

/* ── แบบประเมิน 9Q ─────────────────────────────────────────────────── */
export const MH_9Q_SCALE = [
  { value: 0, label: 'ไม่มีเลย (0)' },
  { value: 1, label: 'บางวัน 1-7 วัน (1)' },
  { value: 2, label: 'บ่อย >7 วัน (2)' },
  { value: 3, label: 'ทุกวัน (3)' },
];

export const MH_9Q_QUESTIONS = [
  { key: 'q1', label: '1. เบื่อ ไม่สนใจอยากทำอะไร' },
  { key: 'q2', label: '2. ไม่สบายใจ ซึมเศร้า ท้อแท้' },
  { key: 'q3', label: '3. หลับยาก หลับๆ ตื่นๆ หรือหลับมากไป' },
  { key: 'q4', label: '4. เหนื่อยง่าย ไม่ค่อยมีแรง' },
  { key: 'q5', label: '5. เบื่ออาหาร หรือกินมากเกินไป' },
  { key: 'q6', label: '6. รู้สึกไม่ดีกับตัวเอง คิดว่าล้มเหลว หรือทำให้ครอบครัวผิดหวัง' },
  { key: 'q7', label: '7. สมาธิไม่ดี เวลาทำอะไร เช่น ดูโทรทัศน์ ฟังวิทยุ หรือทำงาน' },
  { key: 'q8', label: '8. พูดช้า ทำอะไรช้าจนคนอื่นสังเกตเห็น หรือกระสับกระส่ายอยู่ไม่นิ่ง' },
  { key: 'q9', label: '9. คิดทำร้ายตนเอง หรือคิดว่าถ้าตายไปคงจะดี' },
];

export const score9Q = (answers) =>
  MH_9Q_QUESTIONS.reduce((sum, q) => sum + (Number(answers?.[q.key]) || 0), 0);

export const is9QComplete = (answers) =>
  MH_9Q_QUESTIONS.every((q) => answers?.[q.key] !== undefined);

/* Standard Thai 9Q bands — <7 no depression, 7-12 mild, 13-18 moderate, ≥19 severe.
   ≥7 additionally hard-requires the 8Q suicide assessment + ส่งแพทย์ (manual §2.7). */
export const interpret9Q = (total) => {
  if (total >= 19) return { label: 'ซึมเศร้าระดับรุนแรง', style: 'red', referDoctor: true, requires8Q: true };
  if (total >= 13) return { label: 'ซึมเศร้าระดับปานกลาง', style: 'orange', referDoctor: true, requires8Q: true };
  if (total >= 7) return { label: 'ซึมเศร้าระดับน้อย', style: 'yellow', referDoctor: true, requires8Q: true };
  return { label: 'ไม่มีอาการซึมเศร้า หรือมีน้อยมาก', style: 'green', referDoctor: false, requires8Q: false };
};

/* ── แบบประเมิน 8Q (การฆ่าตัวตาย) ──────────────────────────────────── */
export const MH_8Q_QUESTIONS = [
  { key: 'q1', label: '1. คิดอยากตาย หรือคิดว่าตายไปจะดีกว่า', period: 'ใน 1 เดือนที่ผ่านมา', yesScore: 1 },
  { key: 'q2', label: '2. อยากทำร้ายตนเอง หรือทำให้ตนเองบาดเจ็บ', period: 'ใน 1 เดือนที่ผ่านมา', yesScore: 2 },
  { key: 'q3', label: '3. คิดเกี่ยวกับการฆ่าตัวตาย', period: 'ใน 1 เดือนที่ผ่านมา', yesScore: 6 },
  { key: 'q4', label: '4. คิดว่าจะทำจริงตามความคิดฆ่าตัวตายนั้น', period: 'ใน 1 เดือนที่ผ่านมา', yesScore: 8 },
  { key: 'q5', label: '5. วางแผนการฆ่าตัวตาย', period: 'ใน 1 เดือนที่ผ่านมา', yesScore: 8 },
  { key: 'q6', label: '6. เตรียมการที่จะทำร้ายตนเอง หรือเตรียมการฆ่าตัวตาย', period: 'ใน 1 เดือนที่ผ่านมา', yesScore: 9 },
  { key: 'q7', label: '7. ทำให้ตนเองบาดเจ็บ แต่ไม่ตั้งใจให้เสียชีวิต', period: 'ใน 1 เดือนที่ผ่านมา', yesScore: 4 },
  { key: 'q8', label: '8. เคยพยายามฆ่าตัวตาย', period: 'ตลอดชีวิตที่ผ่านมา', yesScore: 4 },
];

export const score8Q = (answers) =>
  MH_8Q_QUESTIONS.reduce((sum, q) => sum + (answers?.[q.key] === true ? q.yesScore : 0), 0);

export const is8QComplete = (answers) =>
  MH_8Q_QUESTIONS.every((q) => answers?.[q.key] !== undefined);

export const interpret8Q = (total) => {
  if (total >= 17) return { label: 'แนวโน้มฆ่าตัวตายระดับสูง — ส่งแพทย์ทันที', style: 'red', referDoctor: true };
  if (total >= 9) return { label: 'แนวโน้มฆ่าตัวตายระดับปานกลาง — ส่งแพทย์', style: 'orange', referDoctor: true };
  if (total >= 1) return { label: 'แนวโน้มฆ่าตัวตายระดับน้อย — เฝ้าระวังใกล้ชิด', style: 'yellow', referDoctor: false };
  return { label: 'ไม่มีแนวโน้มฆ่าตัวตายในปัจจุบัน', style: 'green', referDoctor: false };
};

/* ── แบบประเมินความเครียด ST-5 ─────────────────────────────────────── */
export const MH_ST5_SCALE = [
  { value: 0, label: 'แทบไม่มี (0)' },
  { value: 1, label: 'เป็นบางครั้ง (1)' },
  { value: 2, label: 'บ่อยครั้ง (2)' },
  { value: 3, label: 'เป็นประจำ (3)' },
];

export const MH_ST5_QUESTIONS = [
  { key: 'q1', label: '1. มีปัญหาการนอน นอนไม่หลับ หรือนอนมาก' },
  { key: 'q2', label: '2. มีสมาธิน้อยลง' },
  { key: 'q3', label: '3. หงุดหงิด กระวนกระวาย ว้าวุ่นใจ' },
  { key: 'q4', label: '4. รู้สึกเบื่อ เซ็ง' },
  { key: 'q5', label: '5. ไม่อยากพบปะผู้คน' },
];

export const scoreSt5 = (answers) =>
  MH_ST5_QUESTIONS.reduce((sum, q) => sum + (Number(answers?.[q.key]) || 0), 0);

export const isSt5Complete = (answers) =>
  MH_ST5_QUESTIONS.every((q) => answers?.[q.key] !== undefined);

export const interpretSt5 = (total) => {
  if (total >= 10) return { label: 'เครียดมากที่สุด — ควรพบผู้เชี่ยวชาญ', style: 'red' };
  if (total >= 8) return { label: 'เครียดมาก', style: 'orange' };
  if (total >= 5) return { label: 'เครียดปานกลาง', style: 'yellow' };
  return { label: 'เครียดน้อย', style: 'green' };
};

/* ── แบบคัดกรองภาวะสมองเสื่อม (AMT — ตอบถูก = 1 คะแนน) ────────────── */
export const MH_DEMENTIA_QUESTIONS = [
  { key: 'q1', label: '1. อายุเท่าไร' },
  { key: 'q2', label: '2. ขณะนี้เวลาเท่าไร (คลาดเคลื่อนได้ 1 ชั่วโมง)' },
  { key: 'q3', label: '3. ที่อยู่ปัจจุบัน (ทวนซ้ำได้ตอนท้าย)' },
  { key: 'q4', label: '4. ปีนี้ปีอะไร (พ.ศ.)' },
  { key: 'q5', label: '5. ขณะนี้อยู่ที่ไหน' },
  { key: 'q6', label: '6. จำบุคคล 2 คนได้ (เช่น แพทย์ พยาบาล)' },
  { key: 'q7', label: '7. วัน/เดือน/ปีเกิดของตนเอง' },
  { key: 'q8', label: '8. เหตุการณ์สำคัญในอดีต (เช่น ปีที่เกษียณ)' },
  { key: 'q9', label: '9. ชื่อนายกรัฐมนตรีคนปัจจุบัน' },
  { key: 'q10', label: '10. นับถอยหลัง 20 ถึง 1' },
];

export const scoreDementia = (answers) =>
  MH_DEMENTIA_QUESTIONS.reduce((sum, q) => sum + (answers?.[q.key] === true ? 1 : 0), 0);

export const isDementiaComplete = (answers) =>
  MH_DEMENTIA_QUESTIONS.every((q) => answers?.[q.key] !== undefined);

export const interpretDementia = (correct) => (
  correct >= 8
    ? { label: 'ปกติ — ไม่พบภาวะสมองเสื่อม', style: 'green', refer: false }
    : { label: 'สงสัยภาวะสมองเสื่อม — ควรส่งประเมินโดยละเอียด', style: 'orange', refer: true }
);

export const interpretMhAssessment = (tool, score) => {
  switch (tool) {
    case '9Q': return interpret9Q(score).label;
    case '8Q': return interpret8Q(score).label;
    case 'ST-5': return interpretSt5(score).label;
    case '2Q': return score > 0 ? 'ผลบวก — ประเมินต่อด้วย 9Q' : 'ปกติ';
    case 'สมองเสื่อม': return interpretDementia(score).label;
    default: return '—';
  }
};

/* ── ตรวจร่างกาย (manual §2.5) ─────────────────────────────────────── */
export const MH_PHYSICAL_FIELDS = [
  { key: 'height', label: 'ส่วนสูง (Ht, ซม.)', placeholder: '160' },
  { key: 'weight', label: 'น้ำหนัก (Wt, กก.)', placeholder: '55' },
  { key: 'temp', label: 'อุณหภูมิ (Temp, °C)', placeholder: '36.8' },
  { key: 'hr', label: 'ชีพจร (HR, /นาที)', placeholder: '78' },
  { key: 'resp', label: 'การหายใจ (Resp, /นาที)', placeholder: '18' },
  { key: 'bp', label: 'ความดันโลหิต (BP, mmHg)', placeholder: '120/80' },
  { key: 'fundiRt', label: 'Fundi (Rt)', placeholder: 'ปกติ' },
  { key: 'fundiLt', label: 'Fundi (Lt)', placeholder: 'ปกติ' },
];

export const MH_PHYSICAL_NOTE_SUGGESTIONS = [
  'ตรวจร่างกายทั่วไปอยู่ในเกณฑ์ปกติ',
  'พบรอยแผลเก่าบริเวณข้อมือซ้าย',
  'น้ำหนักลดลงจากครั้งก่อน 3 กิโลกรัม',
  'มือสั่นเล็กน้อย สงสัยผลข้างเคียงจากยา',
];

/* ── วินิจฉัย — ICD-10 F-codes ─────────────────────────────────────── */
export const MH_ICD10_F_CODES = [
  { code: 'F32.0', label: 'F32.0 — Depressive episode, mild' },
  { code: 'F32.1', label: 'F32.1 — Depressive episode, moderate' },
  { code: 'F32.2', label: 'F32.2 — Depressive episode, severe' },
  { code: 'F41.0', label: 'F41.0 — Panic disorder' },
  { code: 'F41.1', label: 'F41.1 — Generalized anxiety disorder' },
  { code: 'F41.2', label: 'F41.2 — Mixed anxiety and depressive disorder' },
  { code: 'F43.2', label: 'F43.2 — Adjustment disorders' },
  { code: 'F51.0', label: 'F51.0 — Nonorganic insomnia' },
  { code: 'F10.2', label: 'F10.2 — Alcohol dependence syndrome' },
  { code: 'F03', label: 'F03 — Unspecified dementia' },
  { code: 'F20.0', label: 'F20.0 — Paranoid schizophrenia' },
  { code: 'F53.0', label: 'F53.0 — Postpartum depression' },
];

export const MH_DIAGNOSIS_SUGGESTIONS = [
  'ภาวะซึมเศร้าระดับปานกลาง ตอบสนองต่อยาดี',
  'วิตกกังวลทั่วไป ร่วมกับปัญหาการนอน',
  'ปรับตัวผิดปกติจากความเครียดเรื่องงาน',
  'ติดตามภาวะสมองเสื่อม ญาติดูแลใกล้ชิด',
];

/* ── สั่งการรักษา / การบำบัด (manual §2.8) / ส่งต่อ (§2.11) ────────── */
export const MH_MED_ORDERS = [
  { key: 'sertraline', label: 'Sertraline 50 mg — 1x1 เช้า' },
  { key: 'fluoxetine', label: 'Fluoxetine 20 mg — 1x1 เช้า' },
  { key: 'amitriptyline', label: 'Amitriptyline 10 mg — 1x1 ก่อนนอน' },
  { key: 'lorazepam', label: 'Lorazepam 0.5 mg — 1x1 ก่อนนอน (ระยะสั้น)' },
  { key: 'risperidone', label: 'Risperidone 1 mg — 1x1 ก่อนนอน' },
  { key: 'lithium', label: 'Lithium carbonate 300 mg — 1x2 เช้า-เย็น (ติดตามระดับยา)' },
  { key: 'donepezil', label: 'Donepezil 5 mg — 1x1 ก่อนนอน' },
];

export const MH_THERAPY_OPTIONS = [
  { key: 'counseling', label: 'การให้คำปรึกษารายบุคคล (Counseling)' },
  { key: 'individualPsychotherapy', label: 'จิตบำบัดรายบุคคล' },
  { key: 'familyTherapy', label: 'ครอบครัวบำบัด' },
  { key: 'groupTherapy', label: 'กลุ่มบำบัด' },
  { key: 'relaxation', label: 'ฝึกเทคนิคผ่อนคลายความเครียด' },
  { key: 'psychoeducation', label: 'สุขภาพจิตศึกษา (Psychoeducation)' },
  { key: 'behaviorActivation', label: 'กระตุ้นพฤติกรรม / กิจกรรมส่งเสริมสุขภาพจิต' },
];

export const MH_COUNSELING_SUGGESTIONS = [
  'ให้คำปรึกษาเรื่องการจัดการความเครียดและการนอน',
  'ทำจิตบำบัดรายบุคคล เน้นปรับความคิดอัตโนมัติด้านลบ',
  'ให้สุขภาพจิตศึกษาแก่ผู้ป่วยและญาติเรื่องโรคซึมเศร้า',
  'ฝึกเทคนิคหายใจคลายเครียด แนะนำฝึกต่อที่บ้านทุกวัน',
  'นัดครอบครัวเข้าร่วมการบำบัดครั้งถัดไป',
];

export const MH_REFERRAL_DESTINATIONS = [
  { value: 'somdet', label: 'สถาบันจิตเวชศาสตร์สมเด็จเจ้าพระยา' },
  { value: 'srithanya', label: 'โรงพยาบาลศรีธัญญา' },
  { value: 'rajanukul', label: 'สถาบันราชานุกูล' },
  { value: 'nearby', label: 'โรงพยาบาลแม่ข่าย (ตามสิทธิ)' },
];

export const MH_REFERRAL_SUGGESTIONS = [
  'ส่งต่อเพื่อพบจิตแพทย์ ประเมินและปรับแผนการรักษา',
  'ส่งต่อด่วน — ผล 8Q ระดับสูง ต้องเฝ้าระวังการฆ่าตัวตาย',
  'ส่งต่อประเมินภาวะสมองเสื่อมโดยละเอียด',
];

/* ── Step-1 intake (read-only ผลการซักประวัติ = TOR 1.10.3.3) ──────── */
export const MH_INTAKE_BY_HN = {
  '67-00002': {
    vitals: { bp: '118/76', hr: 88, temp: 36.6, rr: 18, spo2: 99, weight: 52, height: 158 },
    nurseNote: 'ผู้ป่วยมาด้วยอาการนอนไม่หลับ เบื่อหน่าย 2 สัปดาห์ ซักประวัติเบื้องต้นแล้วส่งพบแพทย์',
    drugAllergies: ['ไม่มีประวัติแพ้ยา'],
    chronicDiseases: ['ไม่มีโรคประจำตัว'],
  },
  '67-00008': {
    vitals: { bp: '110/70', hr: 76, temp: 36.5, rr: 16, spo2: 99, weight: 49, height: 160 },
    nurseNote: 'มารับยาต่อเนื่อง อาการซึมเศร้าดีขึ้นบางส่วน ยังมีปัญหาการนอน',
    drugAllergies: ['Penicillin — ผื่นคัน'],
    chronicDiseases: ['โรคซึมเศร้า (รักษาต่อเนื่อง)'],
  },
  '67-00005': {
    vitals: { bp: '134/82', hr: 72, temp: 36.4, rr: 18, spo2: 98, weight: 58, height: 152 },
    nurseNote: 'ญาติพามาด้วยอาการหลงลืมมากขึ้น 6 เดือน ช่วยเหลือตนเองได้บางส่วน',
    drugAllergies: ['ไม่มีประวัติแพ้ยา'],
    chronicDiseases: ['ความดันโลหิตสูง', 'ไขมันในเลือดสูง'],
  },
  '67-00018': {
    vitals: { bp: '142/90', hr: 92, temp: 36.9, rr: 18, spo2: 97, weight: 70, height: 168 },
    nurseNote: 'ดื่มสุราวันละ 4-5 แก้ว มา 10 ปี ครอบครัวพามาปรึกษา มือสั่นตอนเช้า',
    drugAllergies: ['ไม่มีประวัติแพ้ยา'],
    chronicDiseases: ['โรคพิษสุราเรื้อรัง'],
  },
};

export const DEFAULT_MH_INTAKE = {
  vitals: { bp: '120/80', hr: 80, temp: 36.7, rr: 18, spo2: 99, weight: 60, height: 165 },
  nurseNote: 'ซักประวัติเบื้องต้นที่จุดคัดกรอง แล้วส่งต่อคลินิกสุขภาพจิต',
  drugAllergies: ['ไม่มีประวัติแพ้ยา'],
  chronicDiseases: ['ไม่มีโรคประจำตัว'],
};

export const getMhIntakeByHn = (hn) => MH_INTAKE_BY_HN[hn] || DEFAULT_MH_INTAKE;

export const MH_ILLNESS_HISTORY_SUGGESTIONS = [
  'ไม่เคยมีประวัติการรักษาทางจิตเวชมาก่อน',
  'เคยรักษาโรคซึมเศร้าเมื่อ 2 ปีก่อน หยุดยาเอง',
  'มีประวัติพยายามทำร้ายตนเอง 1 ครั้งเมื่อวัยรุ่น',
  'เริ่มมีอาการหลังสูญเสียบุคคลในครอบครัว',
];

export const MH_FAMILY_HISTORY_SUGGESTIONS = [
  'ไม่มีประวัติโรคทางจิตเวชในครอบครัว',
  'มารดามีประวัติโรคซึมเศร้า',
  'ญาติสายตรงมีประวัติฆ่าตัวตาย',
  'บิดามีประวัติติดสุรา',
];

export const MH_BEHAVIOR_SUGGESTIONS = [
  'ไม่สูบบุหรี่ ไม่ดื่มสุรา',
  'ดื่มสุราเป็นครั้งคราวงานสังคม',
  'สูบบุหรี่วันละ 5-10 มวน',
  'ออกกำลังกายสม่ำเสมอ สัปดาห์ละ 3 ครั้ง',
  'นอนดึกเป็นประจำ ใช้โทรศัพท์ก่อนนอน',
];

/* ── เอกสารแนบ (TOR 1.10.3.4) ──────────────────────────────────────── */
export const MH_UPLOAD_ACCEPT = '.pdf,.png,.jpg,.jpeg';
const MH_UPLOAD_MAX_MB = 10;

export const validateMhUpload = (fileName, sizeBytes) => {
  const ok = /\.(pdf|png|jpe?g)$/i.test(fileName || '');
  if (!ok) return `ชนิดไฟล์ไม่รองรับ — แนบได้เฉพาะ ${MH_UPLOAD_ACCEPT}`;
  if (sizeBytes != null && sizeBytes > MH_UPLOAD_MAX_MB * 1024 * 1024) {
    return `ไฟล์ใหญ่เกิน ${MH_UPLOAD_MAX_MB} MB`;
  }
  return null;
};

/* ── นัดหมาย (TOR 1.10.3.5) ────────────────────────────────────────── */
export const MH_APPOINTMENT_TYPES = [
  { value: 'followup', label: 'ติดตามอาการ / รับยาต่อเนื่อง' },
  { value: 'therapy', label: 'นัดทำจิตบำบัด' },
  { value: 'assessment', label: 'นัดประเมินซ้ำ (9Q/8Q)' },
  { value: 'family', label: 'นัดครอบครัวบำบัด' },
  { value: 'telemed', label: 'นัด Telemedicine' },
];

/* ── Visit record + draft (TOR 1.10.3.7 แสดง/บันทึก/ยกเลิก/แก้ไข) ─── */
export const DEFAULT_MH_VISIT = {
  /* step 1 */
  illnessHistory: '', familyHistory: '', healthBehavior: '',
  documents: [],
  /* step 2 — MSE */
  mse: {}, /* {speech: {result:'normal'|'abnormal', note:''}, ...} */
  mseText: {}, /* {orientation:'', ...} */
  mseAssessor: '', mseAt: '',
  /* step 2 — questionnaires */
  q2Answers: {}, q9Answers: {}, q8Answers: {}, st5Answers: {}, dementiaAnswers: {},
  dementiaTaken: false,
  assessor: '', assessedAt: '',
  /* step 3 */
  physical: {}, physicalResult: '', physicalNote: '',
  /* step 4 */
  diagnoses: [], diagnosisNote: '',
  /* step 5 */
  medOrders: {}, therapies: {}, counselingNote: '',
  referralEnabled: false, referralDestination: '', referralReason: '',
  /* step 6 */
  appointment: { date: '', time: '', type: '', note: '', cancelled: false },
  /* meta */
  doctor: '',
};

export const saveMhVisitRecord = (hn, record) => {
  const all = readJson(K.visits, {});
  const list = all[hn] || [];
  all[hn] = [...list, { ...record, savedBy: MH_CURRENT_USER, savedAt: new Date().toISOString() }];
  writeJson(K.visits, all);
};

export const getMhVisitRecords = (hn) => readJson(K.visits, {})[hn] || [];

export const saveMhDraft = (hn, form, stepIndex) => {
  const drafts = readJson(K.drafts, {});
  drafts[hn] = { form, stepIndex, savedAt: new Date().toISOString() };
  writeJson(K.drafts, drafts);
};
export const getMhDraft = (hn) => readJson(K.drafts, {})[hn] || null;
export const clearMhDraft = (hn) => {
  const drafts = readJson(K.drafts, {});
  delete drafts[hn];
  writeJson(K.drafts, drafts);
};

/* Stepper "completed" ticks — a step counts done once its core fields hold
   anything, mirroring getAncCompletedSteps' shape. */
export const getMhCompletedSteps = (form, stepIndex = 0) => [
  !!(form.illnessHistory || form.familyHistory || form.healthBehavior || (form.documents || []).length),
  Object.keys(form.mse || {}).length > 0 || interpret2Q(form.q2Answers).complete,
  Object.keys(form.physical || {}).length > 0 || !!form.physicalResult,
  (form.diagnoses || []).length > 0,
  Object.values(form.medOrders || {}).some(Boolean) || Object.values(form.therapies || {}).some(Boolean) || !!form.counselingNote,
  !!form.appointment?.date && !form.appointment?.cancelled,
  stepIndex === 6,
];

/* ── Follow-up data (TOR 1.10.3.8) ─────────────────────────────────── */
export const MH_ASSESSMENT_HISTORY = {
  '67-00008': [
    { date: '2026-02-03', tool: '2Q', score: 2, assessor: 'พว.รุ่งนภา ทองสุก' },
    { date: '2026-02-03', tool: '9Q', score: 16, assessor: 'พว.รุ่งนภา ทองสุก' },
    { date: '2026-02-03', tool: '8Q', score: 9, assessor: 'นพ.ประวิทย์ จิตต์เมตตา' },
    { date: '2026-03-05', tool: '9Q', score: 14, assessor: 'พว.กานดา แสงจันทร์' },
    { date: '2026-03-05', tool: '8Q', score: 3, assessor: 'พว.กานดา แสงจันทร์' },
    { date: '2026-04-09', tool: '9Q', score: 12, assessor: 'นักจิตวิทยา วริษา ตั้งตรง' },
    { date: '2026-04-09', tool: 'ST-5', score: 8, assessor: 'นักจิตวิทยา วริษา ตั้งตรง' },
    { date: '2026-05-14', tool: '9Q', score: 10, assessor: 'พว.กานดา แสงจันทร์' },
    { date: '2026-06-18', tool: '9Q', score: 8, assessor: 'พว.รุ่งนภา ทองสุก' },
    { date: '2026-06-18', tool: 'ST-5', score: 6, assessor: 'พว.รุ่งนภา ทองสุก' },
    { date: '2026-07-21', tool: '9Q', score: 13, assessor: 'พว.กานดา แสงจันทร์' },
    { date: '2026-07-21', tool: '8Q', score: 2, assessor: 'นพ.ประวิทย์ จิตต์เมตตา' },
  ],
  '67-00002': [
    { date: '2026-04-07', tool: '2Q', score: 1, assessor: 'นักจิตวิทยา วริษา ตั้งตรง' },
    { date: '2026-04-07', tool: '9Q', score: 11, assessor: 'นักจิตวิทยา วริษา ตั้งตรง' },
    { date: '2026-04-07', tool: '8Q', score: 0, assessor: 'นักจิตวิทยา วริษา ตั้งตรง' },
    { date: '2026-05-19', tool: '9Q', score: 9, assessor: 'พว.กานดา แสงจันทร์' },
    { date: '2026-06-23', tool: '9Q', score: 9, assessor: 'พว.รุ่งนภา ทองสุก' },
    { date: '2026-06-23', tool: 'ST-5', score: 7, assessor: 'พว.รุ่งนภา ทองสุก' },
  ],
  '67-00005': [
    { date: '2026-01-12', tool: 'สมองเสื่อม', score: 7, assessor: 'พว.กานดา แสงจันทร์' },
    { date: '2026-04-20', tool: 'สมองเสื่อม', score: 6, assessor: 'นพ.ประวิทย์ จิตต์เมตตา' },
    { date: '2026-07-27', tool: 'สมองเสื่อม', score: 6, assessor: 'พว.กานดา แสงจันทร์' },
  ],
  '67-00018': [
    { date: '2026-03-19', tool: '2Q', score: 2, assessor: 'พว.กานดา แสงจันทร์' },
    { date: '2026-03-19', tool: '9Q', score: 8, assessor: 'พว.กานดา แสงจันทร์' },
    { date: '2026-03-19', tool: '8Q', score: 4, assessor: 'พญ.ชลิดา วัฒนโกศล' },
    { date: '2026-05-28', tool: '9Q', score: 8, assessor: 'พว.รุ่งนภา ทองสุก' },
    { date: '2026-07-30', tool: 'ST-5', score: 9, assessor: 'พว.รุ่งนภา ทองสุก' },
  ],
};

export const MH_LAB_RESULTS = {
  '67-00008': [
    { date: '2026-02-03', test: 'CBC — Hb', value: '12.8', unit: 'g/dL', ref: '12-16', flag: 'normal' },
    { date: '2026-02-03', test: 'TSH', value: '2.1', unit: 'mIU/L', ref: '0.4-4.0', flag: 'normal' },
    { date: '2026-05-14', test: 'FT4', value: '1.1', unit: 'ng/dL', ref: '0.8-1.8', flag: 'normal' },
    { date: '2026-07-21', test: 'CBC — Hb', value: '12.5', unit: 'g/dL', ref: '12-16', flag: 'normal' },
  ],
  '67-00018': [
    { date: '2026-03-19', test: 'AST', value: '82', unit: 'U/L', ref: '0-40', flag: 'high' },
    { date: '2026-03-19', test: 'ALT', value: '65', unit: 'U/L', ref: '0-41', flag: 'high' },
    { date: '2026-05-28', test: 'GGT', value: '210', unit: 'U/L', ref: '0-60', flag: 'high' },
  ],
  '67-00020': [
    { date: '2026-05-22', test: 'Lithium level', value: '0.7', unit: 'mmol/L', ref: '0.6-1.0', flag: 'normal' },
    { date: '2026-07-10', test: 'Lithium level', value: '1.2', unit: 'mmol/L', ref: '0.6-1.0', flag: 'high' },
    { date: '2026-07-10', test: 'Creatinine', value: '0.9', unit: 'mg/dL', ref: '0.6-1.2', flag: 'normal' },
  ],
};

export const MH_VISIT_EVENTS = {
  '67-00008': [
    { date: '2026-02-03', type: 'exam', title: 'ตรวจครั้งแรก + ลงทะเบียนสุขภาพจิต', detail: 'วินิจฉัย F32.1 เริ่ม Sertraline 50 mg', by: 'นพ.ประวิทย์ จิตต์เมตตา' },
    { date: '2026-03-05', type: 'therapy', title: 'จิตบำบัดรายบุคคล ครั้งที่ 1', detail: 'ปรับความคิดอัตโนมัติด้านลบ ผู้ป่วยให้ความร่วมมือดี', by: 'นักจิตวิทยา วริษา ตั้งตรง' },
    { date: '2026-04-09', type: 'exam', title: 'ติดตามอาการ', detail: '9Q ลดลงเหลือ 12 — คงยาเดิม', by: 'นพ.ประวิทย์ จิตต์เมตตา' },
    { date: '2026-05-14', type: 'appointment', title: 'นัดติดตาม 1 เดือน', detail: 'นัดวันที่ 18 มิ.ย. 2569 เวลา 09:30', by: 'พว.กานดา แสงจันทร์' },
    { date: '2026-06-18', type: 'therapy', title: 'จิตบำบัดรายบุคคล ครั้งที่ 2', detail: 'ฝึกเทคนิคผ่อนคลาย มอบหมายฝึกที่บ้าน', by: 'นักจิตวิทยา วริษา ตั้งตรง' },
    { date: '2026-07-21', type: 'referral', title: 'ปรึกษาจิตแพทย์แม่ข่าย', detail: '9Q กลับขึ้น 13 — ส่งปรึกษาปรับยา', by: 'นพ.ประวิทย์ จิตต์เมตตา' },
  ],
  '67-00002': [
    { date: '2026-04-07', type: 'exam', title: 'ตรวจครั้งแรก + ลงทะเบียนสุขภาพจิต', detail: 'วินิจฉัย F41.2 ให้คำปรึกษา + สุขอนามัยการนอน', by: 'นพ.ประวิทย์ จิตต์เมตตา' },
    { date: '2026-05-19', type: 'exam', title: 'ติดตามอาการ', detail: 'อาการนอนไม่หลับดีขึ้น', by: 'นพ.ประวิทย์ จิตต์เมตตา' },
    { date: '2026-06-23', type: 'appointment', title: 'นัดประเมินซ้ำ', detail: 'นัดประเมิน 9Q ซ้ำ 1 เดือน', by: 'พว.รุ่งนภา ทองสุก' },
  ],
  '67-00005': [
    { date: '2026-01-12', type: 'exam', title: 'ตรวจภาวะสมองเสื่อมครั้งแรก', detail: 'AMT 7/10 — เริ่มประเมินต่อเนื่อง', by: 'นพ.ประวิทย์ จิตต์เมตตา' },
    { date: '2026-04-20', type: 'referral', title: 'ส่งต่อประเมินโดยละเอียด', detail: 'AMT 6/10 — ส่งต่อ รพ.แม่ข่าย ประเมิน MoCA', by: 'นพ.ประวิทย์ จิตต์เมตตา' },
    { date: '2026-07-27', type: 'therapy', title: 'กิจกรรมกระตุ้นสมอง + ให้ความรู้ญาติ', detail: 'สอนญาติจัดกิจกรรมกระตุ้นความจำที่บ้าน', by: 'นักจิตวิทยา วริษา ตั้งตรง' },
  ],
  '67-00018': [
    { date: '2026-03-19', type: 'exam', title: 'ตรวจครั้งแรก + ลงทะเบียน (ชุมชน)', detail: 'วินิจฉัย F10.2 วางแผนลดการดื่ม', by: 'พญ.ชลิดา วัฒนโกศล' },
    { date: '2026-05-28', type: 'therapy', title: 'ให้คำปรึกษาครอบครัว', detail: 'ครอบครัวเข้าร่วม วางกติกาการดื่มร่วมกัน', by: 'นักจิตวิทยา วริษา ตั้งตรง' },
    { date: '2026-07-30', type: 'exam', title: 'ติดตามอาการ', detail: 'ลดการดื่มเหลือ 1-2 แก้ว/สัปดาห์ ST-5 ยังสูง', by: 'พญ.ชลิดา วัฒนโกศล' },
  ],
};

export const MH_EVENT_TYPES = {
  exam: { label: 'ตรวจ', icon: 'stethoscope', style: 'teal' },
  therapy: { label: 'บำบัด', icon: 'psychology', style: 'blue' },
  appointment: { label: 'นัด', icon: 'event_available', style: 'yellow' },
  referral: { label: 'ส่งต่อ', icon: 'send', style: 'red' },
};

const inRange = (date, from, to) => {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
};

export const getMhAssessmentHistory = (hn, from, to) =>
  (MH_ASSESSMENT_HISTORY[hn] || []).filter((r) => inRange(r.date, from, to));

export const getMhLabResults = (hn, from, to) =>
  (MH_LAB_RESULTS[hn] || []).filter((r) => inRange(r.date, from, to));

export const getMhVisitEvents = (hn, from, to) =>
  (MH_VISIT_EVENTS[hn] || []).filter((r) => inRange(r.date, from, to));

/* ── Print log (playbook §5 — พิมพ์เอกสารต้องมี audit) ─────────────── */
export const logMhPrint = (hn, docType) => {
  const log = readJson(K.printLog, []);
  const entry = { hn, docType, by: MH_CURRENT_USER, at: new Date().toISOString() };
  writeJson(K.printLog, [...log, entry]);
  return entry;
};
export const getMhPrintLog = (hn) => readJson(K.printLog, []).filter((e) => e.hn === hn);
