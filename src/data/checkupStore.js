/* checkupStore — mock data + session-state store for ระบบงานตรวจสุขภาพ (TOR §1.19).

   Terminology follows the legacy HCIS manual (คู่มือระบบงานส่งเสริมสุขภาพ
   เฉพาะกลุ่มที่สำคัญ §2.13 / §2.16 / §2.17):
     • ชุดตรวจ / รหัสชุดตรวจ        — the checkup package + its code
     • รายการตรวจรังสี              — radiology items
     • รายการตรวจทางห้องปฏิบัติการ  — lab items (may be picked as a ชุด Lab)
     • รายการหัตถการและค่าใช้จ่ายอื่น — procedures (ICD-9-CM) + other charges
     • รายการตรวจอื่นๆ              — EKG / BMD / Pap smear / ตรวจเต้านม
     • สรุปผลและข้อแนะนำ            — summary + advice
     • สรุปผลการตรวจ ปกติ/ผิดปกติ   — overall normal / abnormal verdict

   Everything here is prototype mock data. Writes land in sessionStorage so a
   demo session behaves like a real workflow (สร้าง / แก้ไข / ยกเลิก / กู้คืน)
   without a backend. §1.19.6 (เครื่องอ่านบัตรประชาชน) and §1.19.18 level-1
   (ค่าอ้างอิงจาก API) are mocked at the UI boundary — the real integrations
   wait on backend work. */

/* ── session overlay ─────────────────────────────────────────────── */

const STORE_KEY = 'mih:checkup-store:v2';

const emptyStore = () => ({
  packages: {},          /* id → partial patch (or { removed: true }) */
  packagesNew: [],
  groups: {},
  groupsNew: [],
  visits: {},
  visitsNew: [],
  records: {},           /* visitId → record */
  drafts: {},            /* `${kind}:${visitId}` → { form, stepIndex, savedAt } */
  screenings: {},        /* visitId → screening record */
  community: {},
  communityNew: [],
  reports: {},           /* visitId → report state */
  treatmentOrders: {},   /* visitId → คำสั่งการรักษาจากผลตรวจ (§1.19.15) */
  audit: [],             /* newest-first audit trail */
  rights: {},            /* demo permission toggles */
});

const readStore = () => {
  if (typeof sessionStorage === 'undefined') return emptyStore();
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (!raw) return emptyStore();
    return { ...emptyStore(), ...JSON.parse(raw) };
  } catch (e) {
    return emptyStore();
  }
};

const writeStore = (next) => {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(next));
  } catch (e) {
    /* quota / private mode — prototype degrades to in-memory only */
  }
};

const mutate = (fn) => {
  const store = readStore();
  const next = fn(store) || store;
  writeStore(next);
  return next;
};

export const resetCheckupStore = () => writeStore(emptyStore());

/* ── people / audit ──────────────────────────────────────────────── */

export const CHECKUP_STAFF = {
  name: 'พว.ศิรินทร์ทิพย์ บุญมาก',
  role: 'พยาบาลวิชาชีพ · งานตรวจสุขภาพ',
  groupPolicy: 'Nurse — Wellness',
};

export const CHECKUP_DOCTORS = [
  'นพ.ธนพล วิริยะกุล',
  'พญ.ชนิดาภา ศรีสุพรรณ',
  'นพ.กิตติพงศ์ อารีรักษ์',
  'พญ.เมธาวี พงษ์เจริญ',
];

export const CHECKUP_CENTER = 'ศูนย์บริการสาธารณสุข 15 ลาดพร้าว';

const TH_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

/** ISO date (or Date) → "8 สิงหาคม 2569". */
export const formatThaiDate = (iso) => {
  if (!iso) return '—';
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
};

/** ISO datetime → "8 สิงหาคม 2569 · 09:21". */
export const formatThaiDateTime = (iso) => {
  if (!iso) return '—';
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${formatThaiDate(d)} · ${hh}:${mm}`;
};

/** Short numeric Thai date "08/08/2569" for dense comparison tables. */
export const formatShortThaiDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mo}/${d.getFullYear() + 543}`;
};

export const formatBahtTh = (n) => {
  const value = Number(n || 0);
  return `${value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;
};

/** Append an audit entry (TOR 1.19 ทุกฟอร์มต้องมี ผู้บันทึก + วันเวลา). */
export const logCheckupAudit = (entry) => {
  mutate((store) => {
    store.audit = [
      {
        id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        at: new Date().toISOString(),
        by: CHECKUP_STAFF.name,
        ...entry,
      },
      ...store.audit,
    ].slice(0, 200);
    return store;
  });
};

export const getCheckupAudit = (filter) => {
  const rows = readStore().audit;
  if (!filter) return rows;
  return rows.filter((r) => Object.entries(filter).every(([k, v]) => r[k] === v));
};

/* ── permissions (สิทธิ์ผู้ใช้ — read-only / disabled states) ───────── */

const RIGHTS_DEFAULTS = {
  /* §1.19.1/.2 — only a wellness supervisor may edit ทะเบียนชุดตรวจ */
  managePackages: true,
  /* §1.19.21 — only a physician may authorize a report */
  authorizeReport: true,
  /* §1.4.2 — ข้อมูลลับ (HIV / mental-health screening) */
  viewConfidential: true,
};

export const getCheckupRight = (key) => {
  const store = readStore();
  return store.rights[key] ?? RIGHTS_DEFAULTS[key] ?? false;
};

export const setCheckupRight = (key, value) => {
  mutate((store) => {
    store.rights = { ...store.rights, [key]: !!value };
    return store;
  });
};

export const toggleCheckupRight = (key) => setCheckupRight(key, !getCheckupRight(key));

/* Access log for confidential reveals (§1.4.2). */
export const logConfidentialAccess = (what, subject) => logCheckupAudit({
  kind: 'confidential-access',
  entity: what,
  subject,
  detail: `เปิดดูข้อมูลลับ: ${what}`,
});

/* ── item catalog (4 groups per HCIS §2.13.1) ────────────────────── */

export const CHECKUP_ITEM_GROUPS = [
  { key: 'radiology', label: 'รายการตรวจรังสี', icon: 'radiology' },
  { key: 'lab', label: 'รายการตรวจทางห้องปฏิบัติการ', icon: 'biotech' },
  { key: 'procedure', label: 'รายการหัตถการและค่าใช้จ่ายอื่น', icon: 'medical_services' },
  { key: 'other', label: 'รายการตรวจอื่นๆ', icon: 'monitor_heart' },
];

export const CHECKUP_ITEM_GROUP_LABEL = CHECKUP_ITEM_GROUPS
  .reduce((acc, g) => ({ ...acc, [g.key]: g.label }), {});

/* `resultType`:
     numeric  — a value the system interprets against a reference range
     choice   — clinician picks from `choices` (normal-first)
     text     — free-text impression (X-ray / EKG / Pap smear reading) */
export const CHECKUP_CATALOG = [
  /* รายการตรวจรังสี */
  { code: 'XR-CHEST-PA', name: 'X-ray ทรวงอก (Chest PA)', group: 'radiology', price: 220, claimable: 220, resultType: 'text', specimen: null, station: 'X-ray' },
  { code: 'XR-KUB', name: 'X-ray ช่องท้อง (KUB)', group: 'radiology', price: 350, claimable: 300, resultType: 'text', specimen: null, station: 'X-ray' },
  { code: 'MAMMO', name: 'Mammogram เต้านม', group: 'radiology', price: 1200, claimable: 800, resultType: 'text', specimen: null, station: 'X-ray' },

  /* รายการตรวจทางห้องปฏิบัติการ */
  { code: 'CBC', name: 'ความสมบูรณ์ของเม็ดเลือด (CBC)', group: 'lab', price: 120, claimable: 120, resultType: 'numeric', unit: 'g/dL', label: 'Hb', specimen: 'EDTA', station: 'Lab' },
  { code: 'FBS', name: 'น้ำตาลในเลือดขณะอดอาหาร (FBS)', group: 'lab', price: 60, claimable: 60, resultType: 'numeric', unit: 'mg/dL', specimen: 'NaF', station: 'Lab' },
  { code: 'HBA1C', name: 'น้ำตาลสะสม (HbA1c)', group: 'lab', price: 320, claimable: 250, resultType: 'numeric', unit: '%', specimen: 'EDTA', station: 'Lab' },
  { code: 'CHOL', name: 'โคเลสเตอรอลรวม (Total cholesterol)', group: 'lab', price: 80, claimable: 80, resultType: 'numeric', unit: 'mg/dL', specimen: 'Clot', station: 'Lab' },
  { code: 'TG', name: 'ไตรกลีเซอไรด์ (Triglyceride)', group: 'lab', price: 80, claimable: 80, resultType: 'numeric', unit: 'mg/dL', specimen: 'Clot', station: 'Lab' },
  { code: 'HDL', name: 'ไขมันดี (HDL-C)', group: 'lab', price: 90, claimable: 90, resultType: 'numeric', unit: 'mg/dL', specimen: 'Clot', station: 'Lab' },
  { code: 'LDL', name: 'ไขมันเลว (LDL-C)', group: 'lab', price: 90, claimable: 90, resultType: 'numeric', unit: 'mg/dL', specimen: 'Clot', station: 'Lab' },
  { code: 'CREA', name: 'ครีเอตินิน (Creatinine)', group: 'lab', price: 70, claimable: 70, resultType: 'numeric', unit: 'mg/dL', specimen: 'Clot', station: 'Lab' },
  { code: 'EGFR', name: 'อัตรากรองของไต (eGFR)', group: 'lab', price: 0, claimable: 0, resultType: 'numeric', unit: 'mL/min/1.73m²', specimen: 'Clot', station: 'Lab' },
  { code: 'SGPT', name: 'เอนไซม์ตับ (SGPT/ALT)', group: 'lab', price: 80, claimable: 80, resultType: 'numeric', unit: 'U/L', specimen: 'Clot', station: 'Lab' },
  { code: 'UA', name: 'กรดยูริก (Uric acid)', group: 'lab', price: 80, claimable: 80, resultType: 'numeric', unit: 'mg/dL', specimen: 'Clot', station: 'Lab' },
  { code: 'URINE', name: 'ปัสสาวะสมบูรณ์แบบ (Urinalysis)', group: 'lab', price: 60, claimable: 60, resultType: 'choice', choices: ['ปกติ', 'พบเม็ดเลือดขาว', 'พบโปรตีน', 'พบน้ำตาล'], specimen: 'Urine', station: 'Lab' },
  { code: 'STOOL', name: 'อุจจาระและตรวจหาเลือดแฝง (Stool + OB)', group: 'lab', price: 90, claimable: 90, resultType: 'choice', choices: ['ปกติ', 'พบเลือดแฝง (บวก)', 'พบพยาธิ'], specimen: 'Stool', station: 'Lab' },
  { code: 'HBSAG', name: 'ไวรัสตับอักเสบบี (HBsAg)', group: 'lab', price: 140, claimable: 140, resultType: 'choice', choices: ['ลบ (Negative)', 'บวก (Positive)'], specimen: 'Clot', station: 'Lab' },
  { code: 'ANTI-HIV', name: 'ตรวจหาการติดเชื้อเอชไอวี (Anti-HIV)', group: 'lab', price: 180, claimable: 180, resultType: 'choice', choices: ['ลบ (Non-reactive)', 'บวก (Reactive)'], specimen: 'Clot', station: 'Lab', confidential: true },

  /* รายการหัตถการและค่าใช้จ่ายอื่น (ICD-9-CM) */
  { code: '89.7', name: 'ตรวจร่างกายทั่วไปโดยแพทย์ (ICD-9-CM 89.7)', group: 'procedure', price: 150, claimable: 150, resultType: 'choice', choices: ['ปกติ', 'ผิดปกติ'], station: 'ห้องตรวจ' },
  { code: '89.39', name: 'ตรวจวัดสายตาและลานสายตา (ICD-9-CM 89.39)', group: 'procedure', price: 100, claimable: 100, resultType: 'choice', choices: ['ปกติ', 'สายตาสั้น', 'สายตายาว', 'ตาบอดสี'], station: 'ห้องตรวจ' },
  { code: '95.41', name: 'ตรวจการได้ยิน (Audiometry, ICD-9-CM 95.41)', group: 'procedure', price: 250, claimable: 200, resultType: 'choice', choices: ['ปกติ', 'การได้ยินลดลงหูซ้าย', 'การได้ยินลดลงหูขวา', 'การได้ยินลดลงสองข้าง'], station: 'ห้องตรวจ' },
  { code: 'FEE-DOC', name: 'ค่าบริการทางการแพทย์และค่าธรรมเนียมแพทย์', group: 'procedure', price: 200, claimable: 0, resultType: null, station: null },

  /* รายการตรวจอื่นๆ */
  { code: 'EKG', name: 'คลื่นไฟฟ้าหัวใจ (EKG)', group: 'other', price: 300, claimable: 250, resultType: 'text', station: 'EKG' },
  { code: 'BMD', name: 'ตรวจความหนาแน่นกระดูก (BMD)', group: 'other', price: 900, claimable: 600, resultType: 'numeric', unit: 'T-score', station: 'X-ray' },
  { code: 'PAP', name: 'ตรวจคัดกรองมะเร็งปากมดลูก (Pap smear)', group: 'other', price: 250, claimable: 250, resultType: 'text', specimen: 'Cyto', station: 'ห้องตรวจ' },
  { code: 'CBE', name: 'ตรวจเต้านมโดยบุคลากร (CBE)', group: 'other', price: 100, claimable: 100, resultType: 'choice', choices: ['ปกติ', 'คลำได้ก้อน', 'มีน้ำ/เลือดออกจากหัวนม'], station: 'ห้องตรวจ' },
  { code: 'PEFR', name: 'สมรรถภาพปอด (PEFR)', group: 'other', price: 120, claimable: 100, resultType: 'numeric', unit: 'L/min', station: 'ห้องตรวจ' },
];

export const findCatalogItem = (code) => CHECKUP_CATALOG.find((i) => i.code === code) || null;

/** ชุด Lab — pick a whole panel in one click (HCIS §2.13.1 step 7). */
export const LAB_PANELS = [
  { code: 'PANEL-LIPID', name: 'ชุด Lab ไขมันในเลือด (Lipid profile)', members: ['CHOL', 'TG', 'HDL', 'LDL'] },
  { code: 'PANEL-RENAL', name: 'ชุด Lab การทำงานของไต', members: ['CREA', 'EGFR', 'UA'] },
  { code: 'PANEL-METAB', name: 'ชุด Lab คัดกรอง Metabolic', members: ['FBS', 'HBA1C', 'CHOL', 'TG', 'HDL'] },
  { code: 'PANEL-BASIC', name: 'ชุด Lab พื้นฐานตรวจสุขภาพ', members: ['CBC', 'FBS', 'CREA', 'SGPT', 'URINE'] },
];

/* ── reference ranges (§1.19.18 — 3 levels) ──────────────────────── */

export const REF_SOURCES = {
  api: { key: 'api', label: 'รับค่าจาก API', short: 'API', badge: 'indigo', editable: false, order: 1, note: 'ค่าอ้างอิงที่ห้องปฏิบัติการส่งมาพร้อมผลผ่าน API (mock — รอเชื่อม LIS จริง)' },
  hospital: { key: 'hospital', label: 'ตั้งค่าโดยศูนย์บริการสาธารณสุข', short: 'รพ.', badge: 'teal', editable: true, order: 2, note: 'ค่าอ้างอิงที่หน่วยบริการกำหนดเอง — แก้ไขได้ในแท็บเกณฑ์แปลผล' },
  standard: { key: 'standard', label: 'มาตรฐานทางการแพทย์', short: 'มาตรฐาน', badge: 'grey', editable: false, order: 3, note: 'ค่ามาตรฐานทางการแพทย์ที่ระบบติดตั้งมาให้ (read-only)' },
};

/** Priority order used when more than one level supplies a range: API > รพ. > มาตรฐาน. */
export const REF_SOURCE_PRIORITY = ['api', 'hospital', 'standard'];

/* Per-item ranges keyed by source level. `advice` is the auto-generated
   คำแนะนำ attached when the value falls outside the range (§1.19.16/.17). */
export const REFERENCE_RANGES = {
  CBC: {
    standard: { low: 12, high: 16, unit: 'g/dL', advice: 'ค่าฮีโมโกลบินผิดปกติ — แนะนำตรวจหาสาเหตุภาวะซีด และรับประทานอาหารที่มีธาตุเหล็ก' },
    hospital: { low: 12, high: 16.5, unit: 'g/dL', advice: 'ค่าฮีโมโกลบินผิดปกติ — นัดตรวจติดตามที่คลินิกอายุรกรรม' },
  },
  FBS: {
    standard: { low: 70, high: 99, unit: 'mg/dL', advice: 'ระดับน้ำตาลในเลือดสูงกว่าเกณฑ์ — ลดอาหารหวาน แป้ง และนัดตรวจซ้ำภายใน 3 เดือน' },
    hospital: { low: 70, high: 100, unit: 'mg/dL', advice: 'ระดับน้ำตาลสูงกว่าเกณฑ์ของศูนย์ฯ — ส่งพบพยาบาลให้คำปรึกษาโภชนาการ' },
    api: { low: 70, high: 99, unit: 'mg/dL', advice: 'ระดับน้ำตาลในเลือดสูง — เข้าเกณฑ์เสี่ยงเบาหวาน ควรพบแพทย์เพื่อยืนยันการวินิจฉัย' },
  },
  HBA1C: {
    standard: { low: 4, high: 5.6, unit: '%', advice: 'น้ำตาลสะสมสูงกว่าเกณฑ์ — เข้าเกณฑ์เสี่ยงเบาหวาน ควรควบคุมอาหารและออกกำลังกาย' },
    api: { low: 4, high: 5.7, unit: '%', advice: 'น้ำตาลสะสมสูง — ส่งต่อคลินิก NCD เพื่อประเมินเพิ่มเติม' },
  },
  CHOL: {
    standard: { low: 0, high: 200, unit: 'mg/dL', advice: 'โคเลสเตอรอลรวมสูง — ลดอาหารไขมันอิ่มตัว เพิ่มการออกกำลังกายอย่างน้อย 150 นาที/สัปดาห์' },
    hospital: { low: 0, high: 190, unit: 'mg/dL', advice: 'โคเลสเตอรอลสูงกว่าเกณฑ์ของศูนย์ฯ — นัดตรวจไขมันซ้ำใน 6 เดือน' },
  },
  TG: {
    standard: { low: 0, high: 150, unit: 'mg/dL', advice: 'ไตรกลีเซอไรด์สูง — งดเครื่องดื่มแอลกอฮอล์และน้ำหวาน ควบคุมน้ำหนัก' },
  },
  HDL: {
    standard: { low: 40, high: 100, unit: 'mg/dL', advice: 'ไขมันดีต่ำ — เพิ่มการออกกำลังกายแบบแอโรบิกและงดสูบบุหรี่' },
  },
  LDL: {
    standard: { low: 0, high: 130, unit: 'mg/dL', advice: 'ไขมันเลวสูง — ควบคุมอาหาร ลดของทอด และประเมินความเสี่ยงโรคหัวใจและหลอดเลือด' },
    hospital: { low: 0, high: 100, unit: 'mg/dL', advice: 'ไขมันเลวสูงกว่าเป้าหมายของศูนย์ฯ — ส่งพบแพทย์เพื่อพิจารณาการรักษา' },
  },
  CREA: {
    standard: { low: 0.6, high: 1.2, unit: 'mg/dL', advice: 'ค่าครีเอตินินผิดปกติ — ประเมินการทำงานของไตซ้ำและหลีกเลี่ยงยาแก้ปวดกลุ่ม NSAIDs' },
  },
  EGFR: {
    standard: { low: 60, high: 200, unit: 'mL/min/1.73m²', advice: 'อัตรากรองของไตต่ำกว่าเกณฑ์ — ส่งต่อคลินิกโรคไตเพื่อประเมินโรคไตเรื้อรัง' },
  },
  SGPT: {
    standard: { low: 0, high: 40, unit: 'U/L', advice: 'เอนไซม์ตับสูง — งดแอลกอฮอล์ ทบทวนยาและสมุนไพรที่ใช้ และตรวจซ้ำใน 3 เดือน' },
  },
  UA: {
    standard: { low: 2.5, high: 7.2, unit: 'mg/dL', advice: 'กรดยูริกสูง — ลดเครื่องในสัตว์ สัตว์ปีก และเครื่องดื่มแอลกอฮอล์' },
  },
  BMD: {
    standard: { low: -1, high: 4, unit: 'T-score', advice: 'ความหนาแน่นกระดูกต่ำ — เสริมแคลเซียม วิตามินดี และออกกำลังกายแบบลงน้ำหนัก' },
  },
  PEFR: {
    standard: { low: 300, high: 700, unit: 'L/min', advice: 'สมรรถภาพปอดต่ำกว่าเกณฑ์ — ประเมินโรคหืด/ปอดอุดกั้นเรื้อรัง และงดสูบบุหรี่' },
  },
  /* Vital signs interpreted on the record page */
  SBP: {
    standard: { low: 90, high: 139, unit: 'mmHg', advice: 'ความดันโลหิตตัวบนสูง — วัดซ้ำที่บ้าน ลดเค็ม และนัดติดตามที่คลินิก NCD' },
    hospital: { low: 90, high: 129, unit: 'mmHg', advice: 'ความดันตัวบนสูงกว่าเกณฑ์ของศูนย์ฯ — ส่งพบพยาบาลเพื่อวัดซ้ำและให้คำแนะนำ' },
  },
  DBP: {
    standard: { low: 60, high: 89, unit: 'mmHg', advice: 'ความดันโลหิตตัวล่างสูง — ลดเค็ม ควบคุมน้ำหนัก และวัดความดันซ้ำ' },
  },
  BMI: {
    standard: { low: 18.5, high: 22.9, unit: 'kg/m²', advice: 'ค่าดัชนีมวลกายอยู่นอกเกณฑ์ปกติ — ปรับอาหารและออกกำลังกายให้เหมาะสม' },
  },
  WAIST_M: { standard: { low: 0, high: 90, unit: 'ซม.', advice: 'รอบเอวเกินเกณฑ์ชาย (90 ซม.) — เข้าเกณฑ์อ้วนลงพุง ควรลดรอบเอว' } },
  WAIST_F: { standard: { low: 0, high: 80, unit: 'ซม.', advice: 'รอบเอวเกินเกณฑ์หญิง (80 ซม.) — เข้าเกณฑ์อ้วนลงพุง ควรลดรอบเอว' } },
};

/* Values that are physiologically impossible → block interpretation and
   ask the user to re-key (edge case: BP 400). */
export const PLAUSIBLE_BOUNDS = {
  SBP: [50, 300], DBP: [30, 200], BMI: [8, 80],
  FBS: [10, 900], HBA1C: [2, 20], CHOL: [40, 800], TG: [10, 2000],
  HDL: [5, 150], LDL: [5, 500], CREA: [0.1, 20], EGFR: [1, 200],
  SGPT: [1, 2000], UA: [0.5, 25], CBC: [3, 25], BMD: [-6, 6], PEFR: [30, 900],
  WAIST_M: [40, 200], WAIST_F: [40, 200],
};

/**
 * Interpret one measured value (§1.19.16 / .17 / .18).
 *
 * @param code       catalog / vital code
 * @param rawValue   the entered value
 * @param overrides  per-package hospital-level overrides
 *                   ({ [code]: { low, high, unit, advice, enabled } })
 * @returns {{status, source, sourceLabel, range, unit, advice, message}}
 *          status: 'normal' | 'abnormal' | 'no-criteria' | 'implausible' | 'empty'
 */
export const interpretValue = (code, rawValue, overrides = {}) => {
  const empty = rawValue === '' || rawValue === null || rawValue === undefined;
  const base = REFERENCE_RANGES[code] || {};
  const override = overrides[code];
  const levels = { ...base };
  if (override && override.enabled !== false && (override.low != null || override.high != null)) {
    levels.hospital = { ...(base.hospital || base.standard || {}), ...override };
  }
  const sourceKey = REF_SOURCE_PRIORITY.find((k) => levels[k]);
  const source = sourceKey ? REF_SOURCES[sourceKey] : null;
  const range = sourceKey ? levels[sourceKey] : null;

  if (!source) {
    return {
      status: 'no-criteria', source: null, sourceLabel: null, range: null,
      unit: findCatalogItem(code)?.unit || '', advice: '',
      message: 'ยังไม่ตั้งเกณฑ์แปลผลสำหรับรายการนี้ — ระบบไม่แปลผลอัตโนมัติ',
    };
  }
  if (empty) {
    return {
      status: 'empty', source: sourceKey, sourceLabel: source.short, range,
      unit: range.unit, advice: '', message: '',
    };
  }

  const num = Number(rawValue);
  if (Number.isNaN(num)) {
    return {
      status: 'implausible', source: sourceKey, sourceLabel: source.short, range,
      unit: range.unit, advice: '',
      message: 'กรอกเป็นตัวเลขเท่านั้น',
    };
  }
  const bounds = PLAUSIBLE_BOUNDS[code];
  if (bounds && (num < bounds[0] || num > bounds[1])) {
    return {
      status: 'implausible', source: sourceKey, sourceLabel: source.short, range,
      unit: range.unit, advice: '',
      message: `ค่าที่กรอกอยู่นอกช่วงที่เป็นไปได้ (${bounds[0]}–${bounds[1]} ${range.unit || ''}) — โปรดตรวจสอบและกรอกใหม่ก่อนแปลผล`,
    };
  }

  const low = range.low ?? -Infinity;
  const high = range.high ?? Infinity;
  const isNormal = num >= low && num <= high;
  return {
    status: isNormal ? 'normal' : 'abnormal',
    source: sourceKey,
    sourceLabel: source.short,
    range,
    unit: range.unit,
    advice: isNormal ? '' : (range.advice || ''),
    message: '',
  };
};

/** Human-readable reference range text, e.g. "70–99 mg/dL". */
export const formatRange = (range) => {
  if (!range) return '—';
  const { low, high, unit } = range;
  if (low != null && high != null) return `${low}–${high}${unit ? ` ${unit}` : ''}`;
  if (high != null) return `≤ ${high}${unit ? ` ${unit}` : ''}`;
  if (low != null) return `≥ ${low}${unit ? ` ${unit}` : ''}`;
  return '—';
};

/** Which reference levels exist for a code (used by the เกณฑ์แปลผล tab). */
export const referenceLevelsFor = (code, overrides = {}) => {
  const base = REFERENCE_RANGES[code] || {};
  const override = overrides[code];
  return REF_SOURCE_PRIORITY
    .map((key) => {
      if (key === 'hospital' && override && override.enabled !== false && (override.low != null || override.high != null)) {
        return { key, range: { ...(base.hospital || base.standard || {}), ...override }, custom: true };
      }
      return base[key] ? { key, range: base[key], custom: false } : null;
    })
    .filter(Boolean);
};

/* ── ชุดตรวจ / packages (§1.19.1, .2, .18) ──────────────────────── */

const SEED_PACKAGES = [
  {
    id: 'PKG-001',
    code: 'CHK-UC-F35',
    name: 'ตรวจสุขภาพสำหรับสิทธิประกันสุขภาพ (อายุ > 35 ปี และ BMI > 25) เพศหญิง',
    rights: 'สิทธิหลักประกันสุขภาพแห่งชาติ (บัตรทอง)',
    serviceType: 'ประชาชนทั่วไป',
    sex: 'หญิง',
    ageFrom: 35,
    ageTo: 70,
    active: true,
    note: 'ชุดตรวจตามนโยบายสำนักอนามัย — คัดกรองกลุ่มเสี่ยง metabolic ในหญิงอายุเกิน 35 ปี',
    items: ['XR-CHEST-PA', 'CBC', 'FBS', 'CHOL', 'TG', 'HDL', 'LDL', 'CREA', 'EGFR', 'URINE', '89.7', '89.39', 'PAP', 'CBE'],
    refOverrides: { FBS: { low: 70, high: 100, unit: 'mg/dL', advice: 'ระดับน้ำตาลสูงกว่าเกณฑ์ของศูนย์ฯ — ส่งพบพยาบาลให้คำปรึกษาโภชนาการ', enabled: true } },
    createdBy: CHECKUP_STAFF.name,
    createdAt: '2026-02-11T09:12:00',
    updatedBy: CHECKUP_STAFF.name,
    updatedAt: '2026-06-30T14:05:00',
  },
  {
    id: 'PKG-002',
    code: 'CHK-UC-M35',
    name: 'ตรวจสุขภาพสำหรับสิทธิประกันสุขภาพ (อายุ > 35 ปี และ BMI > 25) เพศชาย',
    rights: 'สิทธิหลักประกันสุขภาพแห่งชาติ (บัตรทอง)',
    serviceType: 'ประชาชนทั่วไป',
    sex: 'ชาย',
    ageFrom: 35,
    ageTo: 70,
    active: true,
    note: '',
    items: ['XR-CHEST-PA', 'CBC', 'FBS', 'CHOL', 'TG', 'HDL', 'LDL', 'CREA', 'EGFR', 'UA', 'URINE', '89.7', '89.39', 'EKG'],
    refOverrides: {},
    createdBy: CHECKUP_STAFF.name,
    createdAt: '2026-02-11T09:20:00',
    updatedBy: CHECKUP_STAFF.name,
    updatedAt: '2026-02-11T09:20:00',
  },
  {
    id: 'PKG-003',
    code: 'CHK-GOV-ANN',
    name: 'ตรวจสุขภาพประจำปีข้าราชการและพนักงานเขต',
    rights: 'สิทธิเบิกจ่ายตรงกรมบัญชีกลาง',
    serviceType: 'ข้าราชการ / พนักงานของรัฐ',
    sex: 'ทุกเพศ',
    ageFrom: 18,
    ageTo: 99,
    active: true,
    note: 'ใช้กับรอบตรวจสุขภาพประจำปีของสำนักงานเขต — เบิกได้เต็มตามสิทธิ',
    items: ['XR-CHEST-PA', 'CBC', 'FBS', 'HBA1C', 'CHOL', 'TG', 'HDL', 'LDL', 'CREA', 'EGFR', 'SGPT', 'UA', 'URINE', 'STOOL', '89.7', '89.39', '95.41', 'EKG', 'FEE-DOC'],
    refOverrides: { LDL: { low: 0, high: 100, unit: 'mg/dL', advice: 'ไขมันเลวสูงกว่าเป้าหมายของศูนย์ฯ — ส่งพบแพทย์เพื่อพิจารณาการรักษา', enabled: true } },
    createdBy: 'พว.อรพรรณ สุขเจริญ',
    createdAt: '2026-01-08T10:40:00',
    updatedBy: CHECKUP_STAFF.name,
    updatedAt: '2026-07-21T11:15:00',
  },
  {
    id: 'PKG-004',
    code: 'CHK-ELDER',
    name: 'ตรวจสุขภาพผู้สูงอายุ (60 ปีขึ้นไป)',
    rights: 'สิทธิหลักประกันสุขภาพแห่งชาติ (บัตรทอง)',
    serviceType: 'ผู้สูงอายุ',
    sex: 'ทุกเพศ',
    ageFrom: 60,
    ageTo: 99,
    active: true,
    note: '',
    items: ['XR-CHEST-PA', 'CBC', 'FBS', 'CHOL', 'LDL', 'CREA', 'EGFR', 'URINE', 'STOOL', 'BMD', '89.7', '89.39', '95.41'],
    refOverrides: {},
    createdBy: CHECKUP_STAFF.name,
    createdAt: '2026-03-02T13:00:00',
    updatedBy: CHECKUP_STAFF.name,
    updatedAt: '2026-03-02T13:00:00',
  },
  {
    id: 'PKG-005',
    code: 'CHK-FOOD',
    name: 'ตรวจสุขภาพผู้ประกอบอาหารและผู้สัมผัสอาหาร',
    rights: 'ชำระเงินเอง',
    serviceType: 'ผู้ประกอบอาชีพเฉพาะ',
    sex: 'ทุกเพศ',
    ageFrom: 15,
    ageTo: 70,
    active: false,
    inactiveReason: 'ยกเลิกใช้งานชั่วคราว — รอปรับราคาตามประกาศสำนักอนามัย ปี 2569',
    note: '',
    items: ['XR-CHEST-PA', 'STOOL', 'HBSAG', '89.7', 'FEE-DOC'],
    refOverrides: {},
    createdBy: 'พว.อรพรรณ สุขเจริญ',
    createdAt: '2025-11-19T08:30:00',
    updatedBy: CHECKUP_STAFF.name,
    updatedAt: '2026-07-02T09:00:00',
  },
];

const applyOverlay = (seeds, patches = {}, added = []) => {
  const merged = seeds
    .map((s) => {
      const patch = patches[s.id];
      if (patch?.removed) return null;
      return patch ? { ...s, ...patch } : s;
    })
    .filter(Boolean);
  const extra = added
    .map((a) => (patches[a.id]?.removed ? null : { ...a, ...(patches[a.id] || {}) }))
    .filter(Boolean);
  return [...merged, ...extra];
};

export const listPackages = () => {
  const store = readStore();
  return applyOverlay(SEED_PACKAGES, store.packages, store.packagesNew);
};

export const getPackage = (id) => listPackages().find((p) => p.id === id) || null;

export const packagePrice = (pkg) => {
  const items = (pkg?.items || []).map(findCatalogItem).filter(Boolean);
  return {
    total: items.reduce((s, i) => s + (i.price || 0), 0),
    claimable: items.reduce((s, i) => s + (i.claimable || 0), 0),
    count: items.length,
  };
};

export const nextPackageCode = () => {
  const n = listPackages().length + 1;
  return `CHK-NEW-${String(n).padStart(3, '0')}`;
};

export const savePackage = (pkg) => {
  const now = new Date().toISOString();
  mutate((store) => {
    const isSeed = SEED_PACKAGES.some((s) => s.id === pkg.id);
    const isKnownNew = store.packagesNew.some((s) => s.id === pkg.id);
    if (isSeed) {
      store.packages = { ...store.packages, [pkg.id]: { ...(store.packages[pkg.id] || {}), ...pkg, updatedBy: CHECKUP_STAFF.name, updatedAt: now } };
    } else if (isKnownNew) {
      store.packagesNew = store.packagesNew.map((s) => (s.id === pkg.id ? { ...s, ...pkg, updatedBy: CHECKUP_STAFF.name, updatedAt: now } : s));
    } else {
      store.packagesNew = [...store.packagesNew, {
        active: true, refOverrides: {}, items: [],
        ...pkg,
        createdBy: CHECKUP_STAFF.name, createdAt: now,
        updatedBy: CHECKUP_STAFF.name, updatedAt: now,
      }];
    }
    return store;
  });
  logCheckupAudit({ kind: 'package-save', entity: pkg.id, detail: `บันทึกชุดตรวจ ${pkg.code} — ${pkg.name}` });
  return getPackage(pkg.id);
};

/** A package referenced by an existing visit must never be deleted (edge case)
 *  — it is set inactive with a reason instead. */
export const isPackageInUse = (id) => listVisits().some((v) => v.packageId === id);

export const deactivatePackage = (id, reason) => {
  const pkg = getPackage(id);
  savePackage({ ...pkg, active: false, inactiveReason: reason });
  logCheckupAudit({ kind: 'package-deactivate', entity: id, detail: `ยกเลิกใช้งานชุดตรวจ ${pkg?.code} — เหตุผล: ${reason}` });
};

export const reactivatePackage = (id) => {
  const pkg = getPackage(id);
  savePackage({ ...pkg, active: true, inactiveReason: '' });
  logCheckupAudit({ kind: 'package-reactivate', entity: id, detail: `เปิดใช้งานชุดตรวจ ${pkg?.code} อีกครั้ง` });
};

export const savePackageRefOverride = (id, code, patch) => {
  const pkg = getPackage(id);
  if (!pkg) return;
  savePackage({ ...pkg, refOverrides: { ...(pkg.refOverrides || {}), [code]: patch } });
  logCheckupAudit({ kind: 'package-ref', entity: id, detail: `ตั้งเกณฑ์แปลผล ${code} ของชุดตรวจ ${pkg.code}` });
};

/* ── กลุ่มเป้าหมาย / target groups (§1.19.3, .4, .6) ──────────────── */

const SEED_GROUPS = [
  {
    id: 'GRP-001',
    code: 'TG-2569-DINDAENG',
    name: 'ตรวจสุขภาพประจำปีข้าราชการเขตดินแดง 2569',
    owner: 'สำนักงานเขตดินแดง',
    packageId: 'PKG-003',
    startDate: '2026-08-17',
    endDate: '2026-08-21',
    status: 'active',
    note: 'ตรวจที่ห้องประชุมสำนักงานเขต — ลงรายการตรวจรอล่วงหน้าให้ทั้งกลุ่ม',
    members: [
      { cid: '1369900526072', name: 'นายสมชาย มีสุข', sex: 'ชาย', dob: '1984-05-01', phone: '0812345671', hn: '67-00001', packageId: 'PKG-003', preordered: true, status: 'active' },
      { cid: '3401200583926', name: 'นางอรอุมา ดวงสว่าง', sex: 'หญิง', dob: '1978-04-02', phone: '0812345672', hn: '67-00011', packageId: 'PKG-001', preordered: true, status: 'active' },
      { cid: '3550900462158', name: 'นายกิตติ ศรีสมบูรณ์', sex: 'ชาย', dob: '1974-02-06', phone: '0812345673', hn: '67-00009', packageId: 'PKG-002', preordered: true, status: 'active' },
      { cid: '5100200776655', name: 'นางสาวกมลชนก ปิ่นแก้ว', sex: 'หญิง', dob: '1996-06-18', phone: '0812345674', hn: '', packageId: 'PKG-003', preordered: false, status: 'active' },
      { cid: '3100401872569', name: 'นายชัยวัฒน์ ก้องเกียรติ', sex: 'ชาย', dob: '1979-07-14', phone: '0812345675', hn: '67-00014', packageId: 'PKG-003', preordered: true, status: 'cancelled', cancelReason: 'ลาออกจากหน่วยงานก่อนรอบตรวจ' },
    ],
    createdBy: CHECKUP_STAFF.name,
    createdAt: '2026-07-14T10:00:00',
    updatedBy: CHECKUP_STAFF.name,
    updatedAt: '2026-08-01T15:20:00',
  },
  {
    id: 'GRP-002',
    code: 'TG-2569-ELDER-LP',
    name: 'คัดกรองสุขภาพผู้สูงอายุชุมชนลาดพร้าว 71',
    owner: 'ชมรมผู้สูงอายุลาดพร้าว 71',
    packageId: 'PKG-004',
    startDate: '2026-08-24',
    endDate: '2026-08-24',
    status: 'active',
    note: '',
    members: [
      { cid: '3550900192864', name: 'นางสุดา ปลอดโปร่ง', sex: 'หญิง', dob: '1959-07-13', phone: '0898765431', hn: '67-00005', packageId: 'PKG-004', preordered: true, status: 'active' },
      { cid: '5670012584731', name: 'นายวิชัย รุ่งเรือง', sex: 'ชาย', dob: '1965-11-04', phone: '0898765432', hn: '67-00012', packageId: 'PKG-004', preordered: false, status: 'active' },
    ],
    createdBy: 'พว.อรพรรณ สุขเจริญ',
    createdAt: '2026-07-28T09:30:00',
    updatedBy: 'พว.อรพรรณ สุขเจริญ',
    updatedAt: '2026-07-28T09:30:00',
  },
];

export const listTargetGroups = () => {
  const store = readStore();
  return applyOverlay(SEED_GROUPS, store.groups, store.groupsNew);
};

export const getTargetGroup = (id) => listTargetGroups().find((g) => g.id === id) || null;

export const saveTargetGroup = (group) => {
  const now = new Date().toISOString();
  mutate((store) => {
    const isSeed = SEED_GROUPS.some((s) => s.id === group.id);
    const isKnownNew = store.groupsNew.some((s) => s.id === group.id);
    if (isSeed) {
      store.groups = { ...store.groups, [group.id]: { ...(store.groups[group.id] || {}), ...group, updatedBy: CHECKUP_STAFF.name, updatedAt: now } };
    } else if (isKnownNew) {
      store.groupsNew = store.groupsNew.map((s) => (s.id === group.id ? { ...s, ...group, updatedBy: CHECKUP_STAFF.name, updatedAt: now } : s));
    } else {
      store.groupsNew = [...store.groupsNew, {
        status: 'active', members: [],
        ...group,
        createdBy: CHECKUP_STAFF.name, createdAt: now,
        updatedBy: CHECKUP_STAFF.name, updatedAt: now,
      }];
    }
    return store;
  });
  logCheckupAudit({ kind: 'group-save', entity: group.id, detail: `บันทึกกลุ่มเป้าหมาย ${group.name}` });
  return getTargetGroup(group.id);
};

export const cancelTargetGroup = (id, reason) => {
  const g = getTargetGroup(id);
  saveTargetGroup({ ...g, status: 'cancelled', cancelReason: reason });
  logCheckupAudit({ kind: 'group-cancel', entity: id, detail: `ยกเลิกกลุ่มเป้าหมาย ${g?.name} — เหตุผล: ${reason}` });
};

export const reactivateTargetGroup = (id) => {
  const g = getTargetGroup(id);
  saveTargetGroup({ ...g, status: 'active', cancelReason: '' });
  logCheckupAudit({ kind: 'group-reactivate', entity: id, detail: `เปิดใช้งานกลุ่มเป้าหมาย ${g?.name} อีกครั้ง` });
};

export const addGroupMembers = (id, rows) => {
  const g = getTargetGroup(id);
  if (!g) return null;
  const existing = new Set((g.members || []).map((m) => m.cid));
  const fresh = rows
    .filter((r) => !existing.has(r.cid))
    .map((r) => ({ status: 'active', preordered: false, packageId: g.packageId, ...r }));
  saveTargetGroup({ ...g, members: [...(g.members || []), ...fresh] });
  logCheckupAudit({ kind: 'group-members-add', entity: id, detail: `เพิ่มสมาชิกกลุ่ม ${g.name} จำนวน ${fresh.length} ราย` });
  return fresh.length;
};

export const updateGroupMember = (id, cid, patch) => {
  const g = getTargetGroup(id);
  if (!g) return;
  saveTargetGroup({
    ...g,
    members: (g.members || []).map((m) => (m.cid === cid ? { ...m, ...patch } : m)),
  });
  logCheckupAudit({ kind: 'group-member-edit', entity: `${id}/${cid}`, detail: `แก้ไขสมาชิกกลุ่ม ${g.name}` });
};

export const cancelGroupMember = (id, cid, reason) => {
  updateGroupMember(id, cid, { status: 'cancelled', cancelReason: reason });
  logCheckupAudit({ kind: 'group-member-cancel', entity: `${id}/${cid}`, detail: `ยกเลิกสมาชิกกลุ่ม — เหตุผล: ${reason}` });
};

export const restoreGroupMember = (id, cid) => {
  updateGroupMember(id, cid, { status: 'active', cancelReason: '' });
};

/** Apply one ชุดตรวจ to every active member (ลงรายการตรวจรอล่วงหน้า). */
export const preorderWholeGroup = (id, packageId) => {
  const g = getTargetGroup(id);
  if (!g) return;
  saveTargetGroup({
    ...g,
    packageId,
    members: (g.members || []).map((m) => (m.status === 'cancelled' ? m : { ...m, packageId, preordered: true })),
  });
  logCheckupAudit({ kind: 'group-preorder', entity: id, detail: `ลงรายการตรวจรอล่วงหน้าทั้งกลุ่ม ${g.name} ด้วยชุดตรวจ ${getPackage(packageId)?.code || packageId}` });
};

/* ── Import spreadsheet (§1.19.3 / .4) ───────────────────────────── */

export const MEMBER_IMPORT_HEADERS = ['เลขบัตรประชาชน', 'ชื่อ-นามสกุล', 'เพศ', 'วันเกิด', 'เบอร์โทร'];

export const SAMPLE_MEMBER_CSV = [
  MEMBER_IMPORT_HEADERS.join(','),
  '1101700123456,นายกิตติชัย ศรีนวล,ชาย,1988-05-14,0801112221',
  '3102000654321,นางสาวศิริพร วงศ์ทอง,หญิง,1993-10-02,0801112222',
  '1102200998877,นายธีรเดช พูลสวัสดิ์,ชาย,1975-02-28,0801112223',
  '11022,นางมาลี ขาวสะอาด,หญิง,1969-08-11,0801112224',
  '1100400512345,นายวีระชัย ทองสุข,ชาย,1979-04-12,0812345671',
  '3105500112233,นายภาคภูมิ เรืองแสง,ชาย,2031-01-01,0801112225',
  ',นางสาวไม่มีเลขบัตร ทดสอบ,หญิง,1990-01-01,0801112226',
].join('\n');

export const MEMBER_IMPORT_ACCEPT = '.csv,.txt,.xlsx,.xls';

/** Validate a single parsed row against the rules the TOR edge cases demand. */
const validateMemberRow = (row, seenCids, existingCids) => {
  const errors = [];
  const cid = (row.cid || '').replace(/\D/g, '');
  if (!cid) errors.push('ไม่ระบุเลขบัตรประชาชน');
  else if (cid.length !== 13) errors.push('เลขบัตรประชาชนไม่ครบ 13 หลัก');
  if (!row.name) errors.push('ไม่ระบุชื่อ-นามสกุล');
  if (cid && seenCids.has(cid)) errors.push('เลขบัตรซ้ำกับแถวอื่นในไฟล์');
  if (cid && existingCids.has(cid)) errors.push('เป็นสมาชิกในกลุ่มนี้อยู่แล้ว');
  if (row.dob) {
    const d = new Date(row.dob);
    if (Number.isNaN(d.getTime())) errors.push('รูปแบบวันเกิดไม่ถูกต้อง (YYYY-MM-DD)');
    else if (d.getTime() > Date.now()) errors.push('วันเกิดเป็นวันในอนาคต');
  }
  return { ...row, cid, errors, valid: errors.length === 0 };
};

/**
 * Parse an uploaded member list.
 * Returns { ok, error, headerMissing, rows, passed, failed }.
 * `ok:false` means the file is unusable (wrong type / empty / bad header).
 */
export const parseMemberSpreadsheet = (text, existingMembers = []) => {
  const lines = String(text || '')
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { ok: false, error: 'ไฟล์ว่าง — ไม่พบข้อมูลในไฟล์ที่เลือก', rows: [], passed: [], failed: [] };
  }

  const header = lines[0].split(/[,\t;]/).map((h) => h.trim());
  const headerMissing = MEMBER_IMPORT_HEADERS.filter(
    (h) => !header.some((c) => c.replace(/\s/g, '') === h.replace(/\s/g, '')),
  );
  if (headerMissing.length > 0) {
    return {
      ok: false,
      error: `หัวคอลัมน์ไม่ครบ — ขาด: ${headerMissing.join(' · ')}`,
      headerMissing,
      rows: [],
      passed: [],
      failed: [],
    };
  }

  const body = lines.slice(1);
  if (body.length === 0) {
    return { ok: false, error: 'ไฟล์มีแต่หัวคอลัมน์ ไม่มีรายชื่อผู้รับบริการ', rows: [], passed: [], failed: [] };
  }

  const existingCids = new Set(existingMembers.map((m) => m.cid));
  const seenCids = new Set();
  const rows = body.map((line, idx) => {
    const cells = line.split(/[,\t;]/).map((c) => c.trim());
    const parsed = validateMemberRow({
      rowNo: idx + 2,
      cid: cells[0] || '',
      name: cells[1] || '',
      sex: cells[2] || '',
      dob: cells[3] || '',
      phone: cells[4] || '',
    }, seenCids, existingCids);
    if (parsed.cid) seenCids.add(parsed.cid);
    return parsed;
  });

  return {
    ok: true,
    error: null,
    rows,
    passed: rows.filter((r) => r.valid),
    failed: rows.filter((r) => !r.valid),
  };
};

/** Reject anything that isn't a spreadsheet-ish file (edge case: .docx). */
export const isSpreadsheetFile = (name = '') => /\.(csv|txt|xlsx|xls)$/i.test(name);

/* ── เครื่องอ่านบัตรประชาชน mock (§1.19.6) ───────────────────────── */

const ID_CARD_POOL = [
  { cid: '1103700556677', name: 'นายเอกรัตน์ พูนทรัพย์', sex: 'ชาย', dob: '1986-07-19', address: '88/12 ซอยลาดพร้าว 71 แขวงลาดพร้าว เขตลาดพร้าว กรุงเทพมหานคร 10230', phone: '' },
  { cid: '3100600889900', name: 'นางสาวปิยะดา คำแสน', sex: 'หญิง', dob: '1994-02-05', address: '45 ซอยนาคนิวาส 12 แขวงลาดพร้าว เขตลาดพร้าว กรุงเทพมหานคร 10230', phone: '' },
  /* already a service user → the UI should offer เปิด visit instead of creating a duplicate */
  { cid: '1369900526072', name: 'นายสมชาย มีสุข', sex: 'ชาย', dob: '1984-05-01', address: '124/64 พงษ์เวชอนุสรณ์ 2 สุขุมวิท บางจาก พระโขนง กรุงเทพมหานคร 10260', phone: '0812345671', existingHn: '67-00001' },
];

let idCardCursor = 0;

/**
 * Mock smart-card read. Deterministically fails on the 3rd attempt so the
 * retry path is demoable. Returns { ok, person?, error? }.
 */
export const readIdCardMock = () => {
  idCardCursor += 1;
  if (idCardCursor % 3 === 0) {
    return { ok: false, error: 'อ่านบัตรไม่สำเร็จ — โปรดเสียบบัตรประชาชนให้แน่นแล้วกด "อ่านบัตรอีกครั้ง"' };
  }
  const person = ID_CARD_POOL[(idCardCursor - 1) % ID_CARD_POOL.length];
  return { ok: true, person };
};

/* ── visits / คิวตรวจสุขภาพ (§1.19.5, .10, .20) ─────────────────── */

export const CHECKUP_STEPS = [
  { key: 'register', label: 'ลงทะเบียน', icon: 'how_to_reg' },
  { key: 'collect', label: 'เก็บสิ่งส่งตรวจ', icon: 'colorize' },
  { key: 'lab', label: 'ห้องปฏิบัติการ', icon: 'biotech' },
  { key: 'imaging', label: 'X-ray / EKG', icon: 'radiology' },
  { key: 'doctor', label: 'พบแพทย์', icon: 'stethoscope' },
  { key: 'summary', label: 'สรุปผล', icon: 'fact_check' },
];

export const SPECIMEN_STATUSES = {
  pending: { key: 'pending', label: 'รอเก็บ', badge: 'grey' },
  collected: { key: 'collected', label: 'เก็บแล้ว', badge: 'yellow' },
  sent: { key: 'sent', label: 'ส่ง Lab', badge: 'indigo' },
  resulted: { key: 'resulted', label: 'ผลออก', badge: 'green' },
};

export const VISIT_STATUSES = {
  waiting: { key: 'waiting', label: 'รอตรวจ', badge: 'blue' },
  progress: { key: 'progress', label: 'กำลังตรวจ', badge: 'orange' },
  awaitResult: { key: 'awaitResult', label: 'รอผล', badge: 'yellow' },
  summarised: { key: 'summarised', label: 'สรุปแล้ว', badge: 'green' },
  draft: { key: 'draft', label: 'ที่ร่างไว้', badge: 'grey' },
  cancelled: { key: 'cancelled', label: 'ยกเลิกใบสั่ง', badge: 'red' },
};

const SEED_VISITS = [
  /* ── วันนี้ (2026-08-08) ─────────────────────────────────────── */
  {
    id: 'CKV-690801',
    hn: '67-00001', name: 'นายสมชาย มีสุข', sex: 'ชาย', age: 42,
    packageId: 'PKG-003', groupId: 'GRP-001',
    programName: 'ตรวจสุขภาพประจำปีข้าราชการเขตดินแดง 2569',
    /* ครั้งที่ 2 ของโปรแกรมเดียวกัน (§1.19.10) — ครั้งที่ 1 คือ CKV-690800 */
    round: 2, orderNo: 'ORD-69-000841',
    visitDate: '2026-08-08', visitTime: '08:20',
    doctor: 'นพ.ธนพล วิริยะกุล', unit: 'ห้องตรวจ 3',
    statusKey: 'awaitResult',
    steps: { register: 'done', collect: 'done', lab: 'active', imaging: 'done', doctor: 'pending', summary: 'pending' },
    specimen: 'sent',
    rights: 'สิทธิเบิกจ่ายตรงกรมบัญชีกลาง', rightsValid: true,
    extraItems: ['HBA1C'],
    excludedItems: [],
    createdBy: CHECKUP_STAFF.name, createdAt: '2026-08-08T08:22:00',
  },
  {
    id: 'CKV-690802',
    hn: '67-00011', name: 'นางอรอุมา ดวงสว่าง', sex: 'หญิง', age: 48,
    packageId: 'PKG-001', groupId: 'GRP-001',
    programName: 'ตรวจสุขภาพประจำปีข้าราชการเขตดินแดง 2569',
    round: 1, orderNo: 'ORD-69-000842',
    visitDate: '2026-08-08', visitTime: '08:35',
    doctor: 'พญ.ชนิดาภา ศรีสุพรรณ', unit: 'ห้องตรวจ 3',
    statusKey: 'progress',
    steps: { register: 'done', collect: 'done', lab: 'done', imaging: 'active', doctor: 'pending', summary: 'pending' },
    specimen: 'resulted',
    rights: 'สิทธิหลักประกันสุขภาพแห่งชาติ (บัตรทอง)', rightsValid: true,
    extraItems: [],
    excludedItems: [],
    createdBy: CHECKUP_STAFF.name, createdAt: '2026-08-08T08:36:00',
  },
  {
    id: 'CKV-690803',
    hn: '67-00009', name: 'นายกิตติ ศรีสมบูรณ์', sex: 'ชาย', age: 52,
    packageId: 'PKG-002', groupId: 'GRP-001',
    programName: 'ตรวจสุขภาพประจำปีข้าราชการเขตดินแดง 2569',
    round: 1, orderNo: 'ORD-69-000843',
    visitDate: '2026-08-08', visitTime: '08:52',
    doctor: 'นพ.ธนพล วิริยะกุล', unit: 'ห้องตรวจ 4',
    statusKey: 'waiting',
    steps: { register: 'done', collect: 'active', lab: 'pending', imaging: 'pending', doctor: 'pending', summary: 'pending' },
    specimen: 'pending',
    /* edge case: สิทธิหมดอายุ → banner เตือน + ยอดเบิกได้เป็น 0 */
    rights: 'สิทธิประกันสังคม (หมดอายุ 31 ก.ค. 2569)', rightsValid: false,
    extraItems: [],
    excludedItems: [],
    createdBy: CHECKUP_STAFF.name, createdAt: '2026-08-08T08:53:00',
  },
  {
    id: 'CKV-690804',
    hn: '67-00005', name: 'นางสุดา ปลอดโปร่ง', sex: 'หญิง', age: 67,
    packageId: 'PKG-004', groupId: 'GRP-002',
    programName: 'คัดกรองสุขภาพผู้สูงอายุชุมชนลาดพร้าว 71',
    round: 1, orderNo: 'ORD-69-000844',
    visitDate: '2026-08-08', visitTime: '09:10',
    doctor: 'พญ.เมธาวี พงษ์เจริญ', unit: 'ห้องตรวจ 1',
    statusKey: 'summarised',
    steps: { register: 'done', collect: 'done', lab: 'done', imaging: 'done', doctor: 'done', summary: 'done' },
    specimen: 'resulted',
    rights: 'สิทธิหลักประกันสุขภาพแห่งชาติ (บัตรทอง)', rightsValid: true,
    extraItems: [],
    excludedItems: [],
    createdBy: CHECKUP_STAFF.name, createdAt: '2026-08-08T09:11:00',
  },
  {
    id: 'CKV-690805',
    hn: '67-00012', name: 'นายวิชัย รุ่งเรือง', sex: 'ชาย', age: 60,
    packageId: 'PKG-004', groupId: 'GRP-002',
    programName: 'คัดกรองสุขภาพผู้สูงอายุชุมชนลาดพร้าว 71',
    round: 1, orderNo: 'ORD-69-000845',
    visitDate: '2026-08-08', visitTime: '09:24',
    doctor: 'พญ.เมธาวี พงษ์เจริญ', unit: 'ห้องตรวจ 1',
    statusKey: 'draft',
    draftStep: 1,
    steps: { register: 'done', collect: 'done', lab: 'done', imaging: 'pending', doctor: 'active', summary: 'pending' },
    specimen: 'resulted',
    rights: 'สิทธิหลักประกันสุขภาพแห่งชาติ (บัตรทอง)', rightsValid: true,
    extraItems: [],
    excludedItems: [],
    createdBy: CHECKUP_STAFF.name, createdAt: '2026-08-08T09:25:00',
  },
  {
    id: 'CKV-690806',
    hn: '67-00014', name: 'นายชัยวัฒน์ ก้องเกียรติ', sex: 'ชาย', age: 47,
    packageId: 'PKG-003', groupId: 'GRP-001',
    programName: 'ตรวจสุขภาพประจำปีข้าราชการเขตดินแดง 2569',
    round: 1, orderNo: 'ORD-69-000839',
    visitDate: '2026-08-08', visitTime: '08:05',
    doctor: 'นพ.กิตติพงศ์ อารีรักษ์', unit: 'ห้องตรวจ 4',
    statusKey: 'cancelled',
    cancelReason: 'ผู้รับบริการแจ้งยกเลิก — ไม่ได้งดอาหารก่อนตรวจ นัดใหม่สัปดาห์หน้า',
    steps: { register: 'done', collect: 'pending', lab: 'pending', imaging: 'pending', doctor: 'pending', summary: 'pending' },
    specimen: 'pending',
    rights: 'สิทธิเบิกจ่ายตรงกรมบัญชีกลาง', rightsValid: true,
    extraItems: [],
    excludedItems: [],
    createdBy: CHECKUP_STAFF.name, createdAt: '2026-08-08T08:06:00',
  },
  /* ── ประวัติของ HN 67-00001 (feeds ผลตรวจย้อนหลัง + เปรียบเทียบ) ── */
  {
    id: 'CKV-690800',
    hn: '67-00001', name: 'นายสมชาย มีสุข', sex: 'ชาย', age: 42,
    packageId: 'PKG-003', groupId: 'GRP-001',
    programName: 'ตรวจสุขภาพประจำปีข้าราชการเขตดินแดง 2569',
    round: 1, orderNo: 'ORD-69-000710',
    visitDate: '2026-08-01', visitTime: '08:30',
    doctor: 'นพ.ธนพล วิริยะกุล', unit: 'ห้องตรวจ 3',
    statusKey: 'summarised',
    steps: { register: 'done', collect: 'done', lab: 'done', imaging: 'done', doctor: 'done', summary: 'done' },
    specimen: 'resulted',
    rights: 'สิทธิเบิกจ่ายตรงกรมบัญชีกลาง', rightsValid: true,
    extraItems: [],
    excludedItems: [],
    createdBy: CHECKUP_STAFF.name, createdAt: '2026-08-01T08:31:00',
  },
  {
    id: 'CKV-680701',
    hn: '67-00001', name: 'นายสมชาย มีสุข', sex: 'ชาย', age: 41,
    packageId: 'PKG-003', groupId: null,
    programName: 'ตรวจสุขภาพประจำปีข้าราชการเขตดินแดง 2568',
    round: 1, orderNo: 'ORD-68-000512',
    visitDate: '2025-08-12', visitTime: '08:40',
    doctor: 'นพ.ธนพล วิริยะกุล', unit: 'ห้องตรวจ 3',
    statusKey: 'summarised',
    steps: { register: 'done', collect: 'done', lab: 'done', imaging: 'done', doctor: 'done', summary: 'done' },
    specimen: 'resulted',
    rights: 'สิทธิเบิกจ่ายตรงกรมบัญชีกลาง', rightsValid: true,
    extraItems: [],
    excludedItems: [],
    createdBy: 'พว.อรพรรณ สุขเจริญ', createdAt: '2025-08-12T08:41:00',
  },
  {
    id: 'CKV-670601',
    hn: '67-00001', name: 'นายสมชาย มีสุข', sex: 'ชาย', age: 40,
    packageId: 'PKG-003', groupId: null,
    programName: 'ตรวจสุขภาพประจำปีข้าราชการเขตดินแดง 2567',
    round: 1, orderNo: 'ORD-67-000233',
    visitDate: '2024-06-20', visitTime: '09:05',
    doctor: 'นพ.กิตติพงศ์ อารีรักษ์', unit: 'ห้องตรวจ 2',
    statusKey: 'summarised',
    steps: { register: 'done', collect: 'done', lab: 'done', imaging: 'done', doctor: 'done', summary: 'done' },
    specimen: 'resulted',
    rights: 'สิทธิเบิกจ่ายตรงกรมบัญชีกลาง', rightsValid: true,
    extraItems: [],
    excludedItems: [],
    createdBy: 'พว.อรพรรณ สุขเจริญ', createdAt: '2024-06-20T09:06:00',
  },
];

export const listVisits = () => {
  const store = readStore();
  return applyOverlay(SEED_VISITS, store.visits, store.visitsNew);
};

export const getVisit = (id) => listVisits().find((v) => v.id === id) || null;

export const listVisitsByHn = (hn) => listVisits()
  .filter((v) => v.hn === hn)
  .sort((a, b) => String(b.visitDate).localeCompare(String(a.visitDate)));

/** Today's queue only (the mock "today" is 2026-08-08). */
export const CHECKUP_TODAY = '2026-08-08';

export const listTodayVisits = () => listVisits().filter((v) => v.visitDate === CHECKUP_TODAY);

export const saveVisit = (visit) => {
  const now = new Date().toISOString();
  mutate((store) => {
    const isSeed = SEED_VISITS.some((s) => s.id === visit.id);
    const isKnownNew = store.visitsNew.some((s) => s.id === visit.id);
    if (isSeed) {
      store.visits = { ...store.visits, [visit.id]: { ...(store.visits[visit.id] || {}), ...visit, updatedBy: CHECKUP_STAFF.name, updatedAt: now } };
    } else if (isKnownNew) {
      store.visitsNew = store.visitsNew.map((s) => (s.id === visit.id ? { ...s, ...visit, updatedBy: CHECKUP_STAFF.name, updatedAt: now } : s));
    } else {
      store.visitsNew = [...store.visitsNew, { ...visit, createdBy: CHECKUP_STAFF.name, createdAt: now, updatedBy: CHECKUP_STAFF.name, updatedAt: now }];
    }
    return store;
  });
  return getVisit(visit.id);
};

export const cancelVisitOrder = (id, reason) => {
  const v = getVisit(id);
  saveVisit({ ...v, statusKey: 'cancelled', cancelReason: reason });
  logCheckupAudit({ kind: 'order-cancel', entity: id, detail: `ยกเลิกใบสั่งตรวจ ${v?.orderNo} — เหตุผล: ${reason}` });
};

export const restoreVisitOrder = (id) => {
  const v = getVisit(id);
  saveVisit({ ...v, statusKey: 'waiting', cancelReason: '' });
  logCheckupAudit({ kind: 'order-restore', entity: id, detail: `กู้คืนใบสั่งตรวจ ${v?.orderNo}` });
};

/** ครั้งถัดไปใน 1 โปรแกรม (§1.19.10) + warn when the previous round is open. */
export const openNextRound = (hn, programName) => {
  const rounds = listVisits().filter((v) => v.hn === hn && v.programName === programName);
  const prev = rounds[rounds.length - 1];
  const nextRound = rounds.reduce((max, v) => Math.max(max, v.round || 1), 0) + 1;
  const id = `CKV-${Date.now().toString().slice(-6)}`;
  const visit = saveVisit({
    ...prev,
    id,
    round: nextRound,
    orderNo: `ORD-69-${String(900000 + Math.floor(Math.random() * 9999)).slice(-6)}`,
    visitDate: CHECKUP_TODAY,
    visitTime: new Date().toTimeString().slice(0, 5),
    statusKey: 'waiting',
    cancelReason: '',
    steps: { register: 'done', collect: 'active', lab: 'pending', imaging: 'pending', doctor: 'pending', summary: 'pending' },
    specimen: 'pending',
  });
  logCheckupAudit({ kind: 'visit-open', entity: id, detail: `เปิดการรับบริการครั้งที่ ${nextRound} ในโปรแกรม ${programName}` });
  return { visit, warnPrevOpen: !!prev && prev.statusKey !== 'summarised' && prev.statusKey !== 'cancelled', prev };
};

/** Full item list of a visit = package items + per-visit extras − exclusions.
 *  Removing a package item on one visit never edits the ทะเบียนชุดตรวจ — it is
 *  recorded as a per-visit exclusion so the package stays reusable. */
export const visitItems = (visit) => {
  const pkg = getPackage(visit?.packageId);
  const excluded = new Set(visit?.excludedItems || []);
  const codes = [...new Set([...(pkg?.items || []), ...(visit?.extraItems || [])])]
    .filter((c) => !excluded.has(c));
  return codes.map(findCatalogItem).filter(Boolean);
};

export const visitTotals = (visit) => {
  const items = visitItems(visit);
  const total = items.reduce((s, i) => s + (i.price || 0), 0);
  const claimable = visit?.rightsValid === false
    ? 0
    : items.reduce((s, i) => s + (i.claimable || 0), 0);
  return { total, claimable, payable: total - claimable, count: items.length };
};

export const visitRefOverrides = (visit) => getPackage(visit?.packageId)?.refOverrides || {};

/* ── บันทึกผลตรวจ / records (§1.19.14–.19) ──────────────────────── */

const SEED_RECORDS = {
  /* นางสุดา ปลอดโปร่ง — ผู้สูงอายุ ผลผิดปกติหลายรายการ (ใช้สาธิตแปลผล + รายงาน) */
  'CKV-690804': {
    visitId: 'CKV-690804',
    vitals: { weight: 58, height: 152, waist: 86, sbp: 148, dbp: 88, pulse: 78, temp: 36.6, visionL: '20/40', visionR: '20/30' },
    results: { CBC: '11.4', FBS: '118', CHOL: '236', LDL: '154', CREA: '1.0', EGFR: '62', URINE: 'ปกติ', STOOL: 'ปกติ', BMD: '-1.8', 'XR-CHEST-PA': 'ปอดและหัวใจปกติ ไม่พบรอยโรค', '89.7': 'ปกติ', '89.39': 'สายตายาว', '95.41': 'การได้ยินลดลงสองข้าง' },
    physical: { overall: 'abnormal', detail: 'ฟังเสียงหัวใจปกติ แต่คลำได้ต่อมไทรอยด์โตเล็กน้อยข้างขวา' },
    summaryVerdict: 'abnormal',
    summaryText: 'ผลตรวจสุขภาพพบความผิดปกติหลายรายการ ได้แก่ ความดันโลหิตสูง ระดับน้ำตาลในเลือดสูง ไขมันในเลือดสูง ภาวะซีดเล็กน้อย และความหนาแน่นกระดูกต่ำ',
    adviceText: 'แนะนำควบคุมอาหารลดหวาน–มัน–เค็ม ออกกำลังกายสม่ำเสมอ เสริมแคลเซียมและวิตามินดี นัดติดตามที่คลินิกโรคเรื้อรังภายใน 1 เดือน และตรวจตาที่คลินิกจักษุ',
    adviceAuto: 'ระดับน้ำตาลในเลือดสูงกว่าเกณฑ์ · โคเลสเตอรอลรวมสูง · ไขมันเลวสูง · ค่าฮีโมโกลบินผิดปกติ · ความหนาแน่นกระดูกต่ำ · ความดันโลหิตตัวบนสูง',
    savedBy: 'พญ.เมธาวี พงษ์เจริญ',
    savedAt: '2026-08-08T10:40:00',
  },
  /* นายสมชาย มีสุข — สามครั้งย้อนหลัง (2567 → 2568 → 2569 ครั้งที่ 1)
     ค่าไล่ระดับให้เห็นแนวโน้มทั้งดีขึ้นและแย่ลงในตารางเปรียบเทียบ */
  'CKV-690800': {
    visitId: 'CKV-690800',
    vitals: { weight: 81, height: 170, waist: 93, sbp: 132, dbp: 84, pulse: 76, temp: 36.7, visionL: '20/25', visionR: '20/25' },
    results: { CBC: '14.4', FBS: '106', HBA1C: '5.9', CHOL: '206', TG: '176', HDL: '42', LDL: '132', CREA: '1.05', EGFR: '82', SGPT: '46', UA: '7.4', URINE: 'ปกติ', STOOL: 'ปกติ', 'XR-CHEST-PA': 'ปกติ', EKG: 'Sinus rhythm ปกติ', '89.7': 'ปกติ', '89.39': 'ปกติ', '95.41': 'ปกติ' },
    physical: { overall: 'normal', detail: 'ตรวจร่างกายทั่วไปปกติ' },
    summaryVerdict: 'abnormal',
    summaryText: 'พบภาวะน้ำหนักเกิน อ้วนลงพุง น้ำตาลในเลือดสูงเล็กน้อย และไขมันในเลือดผิดปกติ',
    adviceText: 'ควบคุมอาหาร ลดหวาน มัน เค็ม · ออกกำลังกายอย่างน้อยสัปดาห์ละ 150 นาที · ตรวจน้ำตาลและไขมันในเลือดซ้ำใน 6 เดือน',
    adviceAuto: 'ระดับน้ำตาลในเลือดสูงกว่าเกณฑ์ · น้ำตาลสะสมสูงกว่าเกณฑ์ · โคเลสเตอรอลรวมสูง · ไตรกลีเซอไรด์สูง · ไขมันเลวสูง · เอนไซม์ตับสูง · กรดยูริกสูง',
    savedBy: 'นพ.ธนพล วิริยะกุล',
    savedAt: '2026-08-01T11:05:00',
  },
  'CKV-680701': {
    visitId: 'CKV-680701',
    vitals: { weight: 84, height: 170, waist: 96, sbp: 138, dbp: 86, pulse: 74, temp: 36.5, visionL: '20/25', visionR: '20/25' },
    results: { CBC: '14.2', FBS: '112', HBA1C: '6.1', CHOL: '218', TG: '198', HDL: '38', LDL: '142', CREA: '1.1', EGFR: '78', SGPT: '54', UA: '7.8', URINE: 'ปกติ', STOOL: 'ปกติ', 'XR-CHEST-PA': 'ปกติ', EKG: 'Sinus rhythm ปกติ', '89.7': 'ปกติ', '89.39': 'ปกติ', '95.41': 'ปกติ' },
    physical: { overall: 'normal', detail: 'ตรวจร่างกายทั่วไปปกติ' },
    summaryVerdict: 'abnormal',
    summaryText: 'พบภาวะน้ำหนักเกิน อ้วนลงพุง น้ำตาลในเลือดสูงเล็กน้อย ไขมันในเลือดผิดปกติ และเอนไซม์ตับสูง',
    adviceText: 'ลดน้ำหนักให้ได้ 5–7% ของน้ำหนักตัว งดแอลกอฮอล์ และตรวจติดตามน้ำตาล/ไขมัน/เอนไซม์ตับใน 6 เดือน',
    adviceAuto: 'ระดับน้ำตาลในเลือดสูงกว่าเกณฑ์ · น้ำตาลสะสมสูงกว่าเกณฑ์ · โคเลสเตอรอลรวมสูง · ไตรกลีเซอไรด์สูง · ไขมันดีต่ำ · ไขมันเลวสูง · เอนไซม์ตับสูง · กรดยูริกสูง',
    savedBy: 'นพ.ธนพล วิริยะกุล',
    savedAt: '2025-08-12T11:20:00',
  },
  'CKV-670601': {
    visitId: 'CKV-670601',
    vitals: { weight: 80, height: 170, waist: 92, sbp: 128, dbp: 80, pulse: 72, temp: 36.4, visionL: '20/20', visionR: '20/25' },
    results: { CBC: '14.6', FBS: '98', HBA1C: '5.5', CHOL: '198', TG: '156', HDL: '44', LDL: '124', CREA: '1.0', EGFR: '86', SGPT: '38', UA: '6.9', URINE: 'ปกติ', STOOL: 'ปกติ', 'XR-CHEST-PA': 'ปกติ', EKG: 'ปกติ', '89.7': 'ปกติ', '89.39': 'ปกติ', '95.41': 'ปกติ' },
    physical: { overall: 'normal', detail: 'ตรวจร่างกายทั่วไปปกติ' },
    summaryVerdict: 'normal',
    summaryText: 'ผลตรวจสุขภาพโดยรวมอยู่ในเกณฑ์ปกติ มีเพียงไตรกลีเซอไรด์สูงเล็กน้อย',
    adviceText: 'รักษาพฤติกรรมสุขภาพเดิม ลดอาหารหวานและแป้ง ออกกำลังกายสัปดาห์ละ 150 นาที',
    adviceAuto: 'ไตรกลีเซอไรด์สูง',
    savedBy: 'นพ.กิตติพงศ์ อารีรักษ์',
    savedAt: '2024-06-20T11:00:00',
  },
};

export const EMPTY_RECORD = {
  vitals: { weight: '', height: '', waist: '', sbp: '', dbp: '', pulse: '', temp: '', visionL: '', visionR: '' },
  results: {},
  physical: { overall: '', detail: '' },
  summaryVerdict: '',
  summaryText: '',
  adviceText: '',
  adviceAuto: '',
  adviceOverridden: false,
};

export const getVisitRecord = (visitId) => {
  const store = readStore();
  const seed = SEED_RECORDS[visitId];
  const patch = store.records[visitId];
  if (!seed && !patch) return null;
  return { ...EMPTY_RECORD, ...(seed || {}), ...(patch || {}) };
};

export const saveVisitRecord = (visitId, record, options = {}) => {
  const now = new Date().toISOString();
  const prev = getVisitRecord(visitId);
  mutate((store) => {
    store.records = {
      ...store.records,
      [visitId]: {
        ...(store.records[visitId] || {}),
        ...record,
        visitId,
        savedBy: record.savedBy || CHECKUP_DOCTORS[0],
        savedAt: prev?.savedAt || now,
        editedBy: prev ? CHECKUP_STAFF.name : undefined,
        editedAt: prev ? now : undefined,
      },
    };
    return store;
  });
  if (!options.silent) {
    logCheckupAudit({
      kind: prev ? 'record-edit' : 'record-save',
      entity: visitId,
      detail: prev ? `แก้ไขผลตรวจสุขภาพ visit ${visitId}` : `บันทึกผลตรวจสุขภาพ visit ${visitId}`,
    });
  }
  const visit = getVisit(visitId);
  if (visit && visit.statusKey !== 'summarised') {
    saveVisit({ ...visit, statusKey: 'summarised', steps: { ...visit.steps, doctor: 'done', summary: 'done' } });
  }
  return getVisitRecord(visitId);
};

export const computeBmi = (weightKg, heightCm) => {
  const w = Number(weightKg);
  const h = Number(heightCm) / 100;
  if (!w || !h) return null;
  const bmi = w / (h * h);
  return Math.round(bmi * 10) / 10;
};

export const bmiBand = (bmi) => {
  if (bmi == null) return null;
  if (bmi < 18.5) return { label: 'น้ำหนักน้อย', badge: 'yellow' };
  if (bmi < 23) return { label: 'ปกติ', badge: 'green' };
  if (bmi < 25) return { label: 'น้ำหนักเกิน', badge: 'yellow' };
  if (bmi < 30) return { label: 'อ้วนระดับ 1', badge: 'orange' };
  return { label: 'อ้วนระดับ 2', badge: 'red' };
};

/**
 * Every abnormal finding of a record, with its auto-advice + reference source
 * (§1.19.16 / .17 / .18). Also drives the auto-generated สรุปผลและข้อแนะนำ.
 */
export const collectAbnormalFindings = (visit, record) => {
  const overrides = visitRefOverrides(visit);
  const findings = [];
  const push = (code, label, value, verdict) => {
    if (verdict.status === 'abnormal') {
      findings.push({ code, label, value, ...verdict });
    }
  };

  const v = record?.vitals || {};
  const bmi = computeBmi(v.weight, v.height);
  if (bmi != null) push('BMI', 'ดัชนีมวลกาย (BMI)', bmi, interpretValue('BMI', bmi, overrides));
  if (v.sbp !== '' && v.sbp != null) push('SBP', 'ความดันโลหิตตัวบน (SBP)', v.sbp, interpretValue('SBP', v.sbp, overrides));
  if (v.dbp !== '' && v.dbp != null) push('DBP', 'ความดันโลหิตตัวล่าง (DBP)', v.dbp, interpretValue('DBP', v.dbp, overrides));
  if (v.waist !== '' && v.waist != null) {
    const code = visit?.sex === 'หญิง' ? 'WAIST_F' : 'WAIST_M';
    push(code, 'รอบเอว', v.waist, interpretValue(code, v.waist, overrides));
  }

  Object.entries(record?.results || {}).forEach(([code, value]) => {
    const item = findCatalogItem(code);
    if (!item || value === '' || value == null) return;
    if (item.resultType === 'numeric') {
      push(code, item.name, value, interpretValue(code, value, overrides));
    } else if (item.resultType === 'choice') {
      const isNormal = /^ปกติ|^ลบ|Negative|Non-reactive/i.test(String(value));
      if (!isNormal) {
        findings.push({
          code, label: item.name, value,
          status: 'abnormal', source: 'standard', sourceLabel: REF_SOURCES.standard.short,
          range: null, unit: '',
          advice: `พบผลผิดปกติจาก${item.name} (${value}) — แนะนำพบแพทย์เพื่อประเมินและตรวจยืนยันเพิ่มเติม`,
          message: '',
        });
      }
    } else if (item.resultType === 'text') {
      const text = String(value).trim();
      const readsNormal = !text || /ปกติ|ไม่พบรอยโรค|ไม่พบความผิดปกติ|normal/i.test(text);
      if (text && !readsNormal) {
        findings.push({
          code, label: item.name, value: text,
          status: 'abnormal', source: 'standard', sourceLabel: REF_SOURCES.standard.short,
          range: null, unit: '',
          advice: `${item.name}: ${text} — แนะนำให้แพทย์อ่านผลซ้ำและพิจารณาส่งตรวจเพิ่มเติมตามข้อบ่งชี้`,
          message: '',
        });
      }
    }
  });

  if (record?.physical?.overall === 'abnormal') {
    findings.push({
      code: 'PE', label: 'การตรวจร่างกาย', value: record.physical.detail || 'ผิดปกติ',
      status: 'abnormal', source: 'standard', sourceLabel: REF_SOURCES.standard.short,
      range: null, unit: '',
      advice: 'พบความผิดปกติจากการตรวจร่างกาย — แนะนำพบแพทย์เพื่อประเมินและวางแผนการรักษา',
      message: '',
    });
  }

  return findings;
};

/** Draft สรุปผล + คำแนะนำ generated from the abnormal findings (§1.19.16/.19). */
export const generateSummaryDraft = (visit, record) => {
  const findings = collectAbnormalFindings(visit, record);
  if (findings.length === 0) {
    return {
      verdict: 'normal',
      summaryText: 'ผลการตรวจสุขภาพครั้งนี้อยู่ในเกณฑ์ปกติทุกรายการ ไม่พบความผิดปกติที่ต้องรักษาเพิ่มเติม',
      adviceText: 'แนะนำรักษาพฤติกรรมสุขภาพที่ดีต่อไป รับประทานอาหารครบ 5 หมู่ ออกกำลังกายสัปดาห์ละอย่างน้อย 150 นาที และตรวจสุขภาพประจำปีในปีถัดไป',
      adviceAuto: '',
      findings,
    };
  }
  const list = findings.map((f) => `${f.label}${f.value !== '' ? ` (${f.value}${f.unit ? ` ${f.unit}` : ''})` : ''}`);
  return {
    verdict: 'abnormal',
    summaryText: `ผลการตรวจสุขภาพพบความผิดปกติ ${findings.length} รายการ ได้แก่ ${list.join(' · ')}`,
    adviceText: findings.map((f, i) => `${i + 1}. ${f.advice}`).join('\n'),
    adviceAuto: findings.map((f) => f.advice).join(' · '),
    findings,
  };
};

/* ── drafts (wizard cancel-edit guard) ──────────────────────────── */

const draftKey = (kind, visitId) => `${kind}:${visitId}`;

export const getCheckupDraft = (kind, visitId) => readStore().drafts[draftKey(kind, visitId)] || null;

export const saveCheckupDraft = (kind, visitId, form, stepIndex) => {
  mutate((store) => {
    store.drafts = {
      ...store.drafts,
      [draftKey(kind, visitId)]: { form, stepIndex, savedAt: new Date().toISOString() },
    };
    return store;
  });
};

export const clearCheckupDraft = (kind, visitId) => {
  mutate((store) => {
    const next = { ...store.drafts };
    delete next[draftKey(kind, visitId)];
    store.drafts = next;
    return store;
  });
};

export const listDraftVisitIds = (kind) => Object.keys(readStore().drafts)
  .filter((k) => k.startsWith(`${kind}:`))
  .map((k) => k.slice(kind.length + 1));

/* ── แบบคัดกรอง 7 แบบ (§1.19.7, .13) ────────────────────────────── */

export const METABOLIC_CRITERIA = [
  { key: 'waist', label: 'รอบเอวเกินเกณฑ์ (ชาย ≥ 90 ซม. / หญิง ≥ 80 ซม.)' },
  { key: 'bp', label: 'ความดันโลหิต ≥ 130/85 mmHg หรือกินยาลดความดัน' },
  { key: 'fbs', label: 'น้ำตาลในเลือดขณะอดอาหาร ≥ 100 mg/dL หรือเป็นเบาหวาน' },
  { key: 'tg', label: 'ไตรกลีเซอไรด์ ≥ 150 mg/dL หรือกินยาลดไขมัน' },
  { key: 'hdl', label: 'ไขมันดี HDL < 40 (ชาย) / < 50 (หญิง) mg/dL' },
];

/** เกณฑ์วินิจฉัย Metabolic Syndrome — เข้าเกณฑ์ ≥ 3 ข้อจาก 5. */
export const interpretMetabolic = (checked = {}) => {
  const count = METABOLIC_CRITERIA.filter((c) => checked[c.key]).length;
  return {
    count,
    total: METABOLIC_CRITERIA.length,
    positive: count >= 3,
    label: count >= 3 ? `เข้าเกณฑ์ Metabolic Syndrome (${count}/5 ข้อ)` : `ยังไม่เข้าเกณฑ์ (${count}/5 ข้อ)`,
    badge: count >= 3 ? 'red' : count === 2 ? 'yellow' : 'green',
    advice: count >= 3
      ? 'เข้าเกณฑ์กลุ่มโรค Metabolic — ส่งต่อคลินิกโรคเรื้อรัง (NCD) เพื่อประเมินความเสี่ยงหัวใจและหลอดเลือด พร้อมให้คำปรึกษาการปรับพฤติกรรม'
      : count === 2
        ? 'มีปัจจัยเสี่ยง 2 ข้อ — แนะนำปรับพฤติกรรมและคัดกรองซ้ำใน 6 เดือน'
        : 'ยังไม่พบความเสี่ยงกลุ่มโรค Metabolic — แนะนำคัดกรองซ้ำปีละครั้ง',
  };
};

export const CERVICAL_QUESTIONS = [
  { key: 'sexualActive', label: 'เคยมีเพศสัมพันธ์' },
  { key: 'abnormalBleed', label: 'มีเลือดออกผิดปกติทางช่องคลอด' },
  { key: 'dischargeSmell', label: 'ตกขาวผิดปกติ / มีกลิ่น' },
  { key: 'familyHistory', label: 'มีประวัติคนในครอบครัวเป็นมะเร็งปากมดลูก' },
  { key: 'neverScreened', label: 'ไม่เคยตรวจคัดกรองมะเร็งปากมดลูกใน 5 ปีที่ผ่านมา' },
];

export const TB_QUESTIONS = [
  { key: 'cough2w', label: 'ไอเรื้อรังติดต่อกันเกิน 2 สัปดาห์' },
  { key: 'bloodySputum', label: 'ไอมีเลือดปน' },
  { key: 'weightLoss', label: 'น้ำหนักลดผิดปกติใน 1 เดือน' },
  { key: 'nightSweat', label: 'มีเหงื่อออกมากตอนกลางคืน' },
  { key: 'fever2w', label: 'มีไข้ต่ำ ๆ ติดต่อกันเกิน 2 สัปดาห์' },
  { key: 'contact', label: 'มีประวัติสัมผัสผู้ป่วยวัณโรคปอด' },
];

/** เกณฑ์คัดกรองวัณโรค: ไอ > 2 สัปดาห์ ถือเป็น presumptive TB → ส่ง CXR + เสมหะ. */
export const interpretTb = (answers = {}, cxrAbnormal = false) => {
  const count = TB_QUESTIONS.filter((q) => answers[q.key]).length;
  const presumptive = !!answers.cough2w || !!answers.bloodySputum || cxrAbnormal || count >= 3;
  return {
    count,
    presumptive,
    label: presumptive ? 'สงสัยวัณโรค (Presumptive TB)' : 'ไม่เข้าเกณฑ์สงสัยวัณโรค',
    badge: presumptive ? 'red' : 'green',
    advice: presumptive
      ? 'เข้าเกณฑ์สงสัยวัณโรค — ส่งเอกซเรย์ทรวงอกและตรวจเสมหะ AFB/ Molecular test พร้อมส่งต่อคลินิกวัณโรค'
      : 'ไม่เข้าเกณฑ์สงสัยวัณโรค — แนะนำสังเกตอาการและกลับมาตรวจหากไอเกิน 2 สัปดาห์',
  };
};

export const DENTAL_QUESTIONS = [
  { key: 'caries', label: 'พบฟันผุ' },
  { key: 'calculus', label: 'มีหินปูน / เหงือกอักเสบ' },
  { key: 'missing', label: 'มีฟันสูญเสียที่ต้องใส่ฟันเทียม' },
  { key: 'lesion', label: 'พบแผล/ก้อนในช่องปากที่ต้องประเมินเพิ่ม' },
  { key: 'needScaling', label: 'ควรขูดหินปูน' },
];

export const MH_2Q = [
  '2 สัปดาห์ที่ผ่านมา รู้สึกหดหู่ เศร้า หรือท้อแท้สิ้นหวังหรือไม่',
  '2 สัปดาห์ที่ผ่านมา รู้สึกเบื่อ ทำอะไรก็ไม่เพลิดเพลินหรือไม่',
];

export const MH_9Q = [
  'เบื่อ ไม่สนใจอยากทำอะไร',
  'ไม่สบายใจ ซึมเศร้า ท้อแท้',
  'หลับยาก หลับ ๆ ตื่น ๆ หรือหลับมากเกินไป',
  'เหนื่อยง่าย หรือไม่ค่อยมีแรง',
  'เบื่ออาหาร หรือกินมากเกินไป',
  'รู้สึกไม่ดีกับตัวเอง คิดว่าตัวเองล้มเหลว',
  'สมาธิไม่ดี เวลาทำอะไร',
  'พูดหรือเคลื่อนไหวช้ากว่าปกติ หรือกระวนกระวายอยู่ไม่สุข',
  'คิดทำร้ายตัวเอง หรือคิดว่าตายไปจะดีกว่า',
];

export const MH_9Q_SCALE = [
  { value: 0, label: 'ไม่มีเลย' },
  { value: 1, label: 'เป็นบางวัน (1–7 วัน)' },
  { value: 2, label: 'เป็นบ่อย (>7 วัน)' },
  { value: 3, label: 'เป็นทุกวัน' },
];

export const MH_8Q = [
  { label: 'คิดอยากตาย หรืออยากหลับไปไม่ตื่นอีก', weight: 1 },
  { label: 'อยากทำร้ายตัวเอง หรือทำให้ตัวเองบาดเจ็บ', weight: 2 },
  { label: 'คิดเกี่ยวกับการฆ่าตัวตาย', weight: 6 },
  { label: 'สามารถควบคุมความคิดอยากฆ่าตัวตายได้หรือไม่ (ตอบ "ไม่ได้")', weight: 8 },
  { label: 'มีแผนการที่จะฆ่าตัวตาย', weight: 9 },
  { label: 'เตรียมการที่จะทำร้ายตัวเองหรือฆ่าตัวตาย', weight: 15 },
  { label: 'ใน 1 เดือนที่ผ่านมา เคยทำร้ายตัวเองโดยตั้งใจให้ตาย', weight: 8 },
  { label: 'ตลอดชีวิตที่ผ่านมา เคยพยายามฆ่าตัวตาย', weight: 4 },
];

export const MH_ST5 = [
  'มีปัญหาการนอน นอนไม่หลับหรือนอนมาก',
  'มีสมาธิน้อยลง',
  'หงุดหงิด / กระวนกระวาย / ว้าวุ่นใจ',
  'รู้สึกเบื่อ เซ็ง',
  'ไม่อยากพบปะผู้คน',
];

export const MH_ST5_SCALE = [
  { value: 0, label: 'แทบไม่มี' },
  { value: 1, label: 'เป็นบางครั้ง' },
  { value: 2, label: 'บ่อยครั้ง' },
  { value: 3, label: 'เป็นประจำ' },
];

const sumAnswers = (answers = [], length) => {
  let total = 0;
  for (let i = 0; i < length; i += 1) total += Number(answers[i] || 0);
  return total;
};

export const is2QComplete = (a = []) => MH_2Q.every((_, i) => a[i] === true || a[i] === false);
export const interpret2Q = (a = []) => {
  const positive = a.some((v) => v === true);
  return {
    positive,
    complete: is2QComplete(a),
    label: positive ? 'มีความเสี่ยงซึมเศร้า — ต้องทำ 9Q ต่อ' : 'ไม่มีความเสี่ยงซึมเศร้า',
    badge: positive ? 'yellow' : 'green',
  };
};

export const is9QComplete = (a = []) => MH_9Q.every((_, i) => a[i] != null && a[i] !== '');
export const score9Q = (a = []) => sumAnswers(a, MH_9Q.length);
export const interpret9Q = (score) => {
  if (score >= 19) return { level: 'รุนแรง', badge: 'red', requires8Q: true, advice: 'ซึมเศร้าระดับรุนแรง — ส่งพบแพทย์ทันทีและประเมินความเสี่ยงฆ่าตัวตาย (8Q)' };
  if (score >= 13) return { level: 'ปานกลาง', badge: 'orange', requires8Q: true, advice: 'ซึมเศร้าระดับปานกลาง — ส่งพบแพทย์และประเมิน 8Q' };
  if (score >= 7) return { level: 'น้อย', badge: 'yellow', requires8Q: true, advice: 'ซึมเศร้าระดับน้อย — ให้คำปรึกษาและประเมิน 8Q พร้อมนัดติดตาม' };
  return { level: 'ไม่มีอาการซึมเศร้า', badge: 'green', requires8Q: false, advice: 'ไม่พบภาวะซึมเศร้า — แนะนำดูแลสุขภาพจิตและคัดกรองซ้ำปีละครั้ง' };
};

export const is8QComplete = (a = []) => MH_8Q.every((_, i) => a[i] === true || a[i] === false);
export const score8Q = (a = []) => MH_8Q.reduce((s, q, i) => s + (a[i] === true ? q.weight : 0), 0);
export const interpret8Q = (score) => {
  if (score >= 17) return { level: 'เสี่ยงฆ่าตัวตายรุนแรง', badge: 'red', advice: 'ความเสี่ยงฆ่าตัวตายระดับรุนแรง — ส่งพบแพทย์ทันที ห้ามให้กลับบ้านโดยไม่มีผู้ดูแล' };
  if (score >= 9) return { level: 'เสี่ยงปานกลาง', badge: 'orange', advice: 'ความเสี่ยงฆ่าตัวตายปานกลาง — ส่งพบแพทย์วันนี้และวางแผนความปลอดภัย' };
  if (score >= 1) return { level: 'เสี่ยงน้อย', badge: 'yellow', advice: 'ความเสี่ยงฆ่าตัวตายน้อย — ให้คำปรึกษา แจ้งเบอร์สายด่วน 1323 และนัดติดตาม' };
  return { level: 'ไม่มีความเสี่ยง', badge: 'green', advice: 'ไม่พบความเสี่ยงฆ่าตัวตาย' };
};

export const isSt5Complete = (a = []) => MH_ST5.every((_, i) => a[i] != null && a[i] !== '');
export const scoreSt5 = (a = []) => sumAnswers(a, MH_ST5.length);
export const interpretSt5 = (score) => {
  if (score >= 11) return { level: 'เครียดมากที่สุด', badge: 'red', advice: 'ความเครียดระดับมากที่สุด — ส่งพบนักจิตวิทยา/แพทย์เพื่อประเมินและช่วยเหลือ' };
  if (score >= 8) return { level: 'เครียดมาก', badge: 'orange', advice: 'ความเครียดระดับมาก — แนะนำฝึกคลายเครียดและนัดติดตามภายใน 1 เดือน' };
  if (score >= 5) return { level: 'เครียดปานกลาง', badge: 'yellow', advice: 'ความเครียดปานกลาง — แนะนำจัดการเวลาและฝึกหายใจคลายเครียด' };
  return { level: 'เครียดน้อย', badge: 'green', advice: 'ความเครียดอยู่ในเกณฑ์ปกติ' };
};

/** คัดกรองตามกลุ่มวัย (§1.19.7 ข้อสุดท้าย) — set chosen by age band. */
export const AGE_BAND_SCREENINGS = [
  {
    key: 'child', label: 'วัยเด็ก (0–14 ปี)', from: 0, to: 14,
    items: ['ประเมินการเจริญเติบโต (น้ำหนัก/ส่วนสูง)', 'พัฒนาการตามวัย (DSPM)', 'ตรวจสายตาและการได้ยิน', 'ตรวจฟันและเคลือบฟลูออไรด์', 'ประวัติวัคซีนตามเกณฑ์'],
  },
  {
    key: 'teen', label: 'วัยรุ่น (15–24 ปี)', from: 15, to: 24,
    items: ['ภาวะโภชนาการและ BMI', 'พฤติกรรมเสี่ยงบุหรี่/สุรา/สารเสพติด', 'สุขภาพจิตและความเครียด', 'อนามัยเจริญพันธุ์และการคุมกำเนิด', 'คัดกรองภาวะซีด'],
  },
  {
    key: 'adult', label: 'วัยทำงาน (25–59 ปี)', from: 25, to: 59,
    items: ['คัดกรองความเสี่ยง Metabolic', 'คัดกรองมะเร็งปากมดลูก/เต้านม (หญิง)', 'คัดกรองวัณโรค', 'สุขภาพจิต (2Q)', 'สุขภาพช่องปาก'],
  },
  {
    key: 'elder', label: 'วัยผู้สูงอายุ (60 ปีขึ้นไป)', from: 60, to: 200,
    items: ['ประเมินความสามารถในการทำกิจวัตร (ADL)', 'คัดกรองภาวะสมองเสื่อม (MMSE)', 'คัดกรองภาวะหกล้ม', 'คัดกรองภาวะซึมเศร้า (2Q)', 'สุขภาพช่องปากและการกลืน', 'ตรวจสายตาและการได้ยิน'],
  },
];

export const ageBandFor = (age) => AGE_BAND_SCREENINGS.find((b) => age >= b.from && age <= b.to) || AGE_BAND_SCREENINGS[2];

export const EMPTY_SCREENING = {
  metabolic: { checked: {}, skipped: false, skipReason: '', note: '' },
  cervical: { answers: {}, skipped: false, skipReason: '', papResult: '', note: '' },
  tb: { answers: {}, cxrAbnormal: false, skipped: false, skipReason: '', note: '' },
  hiv: { consent: false, consentAt: '', result: '', skipped: false, skipReason: '', note: '' },
  dental: { answers: {}, skipped: false, skipReason: '', note: '' },
  mental: { q2: [], q9: [], q8: [], st5: [], skipped: false, skipReason: '', note: '' },
  ageBand: { bandKey: '', done: {}, skipped: false, skipReason: '', note: '' },
};

export const getScreening = (visitId) => {
  const rec = readStore().screenings[visitId];
  if (!rec) return null;
  return { ...JSON.parse(JSON.stringify(EMPTY_SCREENING)), ...rec };
};

export const saveScreening = (visitId, data, options = {}) => {
  const now = new Date().toISOString();
  const prev = getScreening(visitId);
  mutate((store) => {
    store.screenings = {
      ...store.screenings,
      [visitId]: {
        ...data,
        visitId,
        savedBy: prev?.savedBy || CHECKUP_STAFF.name,
        savedAt: prev?.savedAt || now,
        editedBy: prev ? CHECKUP_STAFF.name : undefined,
        editedAt: prev ? now : undefined,
      },
    };
    return store;
  });
  if (!options.silent) {
    logCheckupAudit({
      kind: prev ? 'screening-edit' : 'screening-save',
      entity: visitId,
      detail: prev ? `แก้ไขแบบคัดกรอง visit ${visitId}` : `บันทึกแบบคัดกรอง visit ${visitId}`,
    });
  }
  return getScreening(visitId);
};

export const cancelScreening = (visitId, reason) => {
  mutate((store) => {
    const next = { ...store.screenings };
    if (next[visitId]) next[visitId] = { ...next[visitId], cancelled: true, cancelReason: reason };
    store.screenings = next;
    return store;
  });
  logCheckupAudit({ kind: 'screening-cancel', entity: visitId, detail: `ยกเลิกแบบคัดกรอง — เหตุผล: ${reason}` });
};

export const restoreScreening = (visitId) => {
  mutate((store) => {
    const next = { ...store.screenings };
    if (next[visitId]) next[visitId] = { ...next[visitId], cancelled: false, cancelReason: '' };
    store.screenings = next;
    return store;
  });
};

export const listScreenings = () => Object.values(readStore().screenings);

/** Does this screening record hold ข้อมูลลับ (§1.4.2)? */
export const screeningHasConfidential = (s) => {
  if (!s) return false;
  if (s.hiv?.result) return true;
  const i2 = interpret2Q(s.mental?.q2);
  if (i2.positive) return true;
  if (is9QComplete(s.mental?.q9) && score9Q(s.mental?.q9) >= 7) return true;
  return false;
};

/* ── กิจกรรมสุขภาพชุมชน (§1.19.8) ───────────────────────────────── */

export const COMMUNITY_STATUSES = {
  planned: { key: 'planned', label: 'วางแผน', badge: 'grey' },
  running: { key: 'running', label: 'กำลังดำเนินการ', badge: 'blue' },
  done: { key: 'done', label: 'สรุปแล้ว', badge: 'green' },
  cancelled: { key: 'cancelled', label: 'ยกเลิก', badge: 'red' },
};

const SEED_COMMUNITY = [
  {
    id: 'ACT-001',
    name: 'โครงการคนลาดพร้าวสุขภาพดี — ตรวจสุขภาพเชิงรุกชุมชนลาดพร้าว 71',
    date: '2026-08-08', timeStart: '08:00', timeEnd: '12:00',
    place: 'ศาลาชุมชนลาดพร้าว 71 แขวงลาดพร้าว เขตลาดพร้าว',
    location: { lat: 13.8032, lng: 100.5921 },
    groupId: 'GRP-002',
    status: 'done',
    attendees: 87, targetAttendees: 100,
    outcome: 'คัดกรองผู้สูงอายุ 87 ราย พบกลุ่มเสี่ยงเบาหวาน 14 ราย ความดันสูง 21 ราย ส่งต่อคลินิก NCD 12 ราย',
    attachments: [
      { id: 'F1', name: 'โครงการคนลาดพร้าวสุขภาพดี-2569.pdf', size: '1.2 MB', type: 'pdf', uploadedAt: '2026-07-30T10:00:00' },
      { id: 'F2', name: 'สรุปผลกิจกรรม-8สค69.docx', size: '340 KB', type: 'doc', uploadedAt: '2026-08-08T14:20:00' },
    ],
    createdBy: CHECKUP_STAFF.name, createdAt: '2026-07-30T09:40:00',
    updatedBy: CHECKUP_STAFF.name, updatedAt: '2026-08-08T14:22:00',
  },
  {
    id: 'ACT-002',
    name: 'ออกหน่วยตรวจสุขภาพตลาดสดห้วยขวาง (ผู้สัมผัสอาหาร)',
    date: '2026-08-15', timeStart: '06:30', timeEnd: '10:30',
    place: 'ตลาดสดห้วยขวาง ถนนประชาสงเคราะห์ เขตดินแดง',
    location: { lat: 13.7719, lng: 100.5702 },
    groupId: null,
    status: 'planned',
    attendees: 0, targetAttendees: 120,
    outcome: '',
    attachments: [
      { id: 'F3', name: 'แผนออกหน่วยตลาดห้วยขวาง.pdf', size: '780 KB', type: 'pdf', uploadedAt: '2026-08-01T11:00:00' },
    ],
    createdBy: 'พว.อรพรรณ สุขเจริญ', createdAt: '2026-08-01T10:50:00',
    updatedBy: 'พว.อรพรรณ สุขเจริญ', updatedAt: '2026-08-01T10:50:00',
  },
  {
    id: 'ACT-003',
    name: 'กิจกรรมให้ความรู้โรคไม่ติดต่อเรื้อรัง โรงเรียนวัดลาดพร้าว',
    date: '2026-08-08', timeStart: '13:00', timeEnd: '15:00',
    place: 'หอประชุมโรงเรียนวัดลาดพร้าว เขตลาดพร้าว',
    location: { lat: 13.8104, lng: 100.5866 },
    groupId: null,
    status: 'running',
    attendees: 42, targetAttendees: 60,
    outcome: 'บรรยายให้ความรู้ครูและบุคลากร 42 ราย พร้อมวัดความดันและ BMI',
    attachments: [],
    createdBy: CHECKUP_STAFF.name, createdAt: '2026-08-05T16:10:00',
    updatedBy: CHECKUP_STAFF.name, updatedAt: '2026-08-08T13:40:00',
  },
];

export const listCommunityActivities = () => {
  const store = readStore();
  return applyOverlay(SEED_COMMUNITY, store.community, store.communityNew);
};

export const getCommunityActivity = (id) => listCommunityActivities().find((a) => a.id === id) || null;

export const saveCommunityActivity = (activity) => {
  const now = new Date().toISOString();
  mutate((store) => {
    const isSeed = SEED_COMMUNITY.some((s) => s.id === activity.id);
    const isKnownNew = store.communityNew.some((s) => s.id === activity.id);
    if (isSeed) {
      store.community = { ...store.community, [activity.id]: { ...(store.community[activity.id] || {}), ...activity, updatedBy: CHECKUP_STAFF.name, updatedAt: now } };
    } else if (isKnownNew) {
      store.communityNew = store.communityNew.map((s) => (s.id === activity.id ? { ...s, ...activity, updatedBy: CHECKUP_STAFF.name, updatedAt: now } : s));
    } else {
      store.communityNew = [...store.communityNew, {
        status: 'planned', attachments: [], attendees: 0,
        ...activity,
        createdBy: CHECKUP_STAFF.name, createdAt: now, updatedBy: CHECKUP_STAFF.name, updatedAt: now,
      }];
    }
    return store;
  });
  logCheckupAudit({ kind: 'community-save', entity: activity.id, detail: `บันทึกกิจกรรมชุมชน ${activity.name}` });
  return getCommunityActivity(activity.id);
};

export const cancelCommunityActivity = (id, reason) => {
  const a = getCommunityActivity(id);
  saveCommunityActivity({ ...a, status: 'cancelled', cancelReason: reason });
  logCheckupAudit({ kind: 'community-cancel', entity: id, detail: `ยกเลิกกิจกรรม ${a?.name} — เหตุผล: ${reason}` });
};

export const restoreCommunityActivity = (id) => {
  const a = getCommunityActivity(id);
  saveCommunityActivity({ ...a, status: 'planned', cancelReason: '' });
};

export const COMMUNITY_FILE_ACCEPT = '.doc,.docx,.pdf';

export const isCommunityDocFile = (name = '') => /\.(doc|docx|pdf)$/i.test(name);

/** Duplicate filenames get a "(n)" suffix instead of silently overwriting. */
export const uniqueAttachmentName = (name, existing = []) => {
  const taken = new Set(existing.map((f) => f.name));
  if (!taken.has(name)) return name;
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let n = 2;
  while (taken.has(`${stem} (${n})${ext}`)) n += 1;
  return `${stem} (${n})${ext}`;
};

/* ── รายงานผลรายบุคคล (§1.19.19, .21) ───────────────────────────── */

export const REPORT_STATUSES = {
  draft: { key: 'draft', label: 'ฉบับร่าง', badge: 'grey' },
  pending: { key: 'pending', label: 'รอแพทย์อนุมัติ', badge: 'yellow' },
  authorized: { key: 'authorized', label: 'อนุมัติแล้ว', badge: 'green' },
  sent: { key: 'sent', label: 'ส่งถึงผู้ป่วยแล้ว', badge: 'teal' },
};

export const REPORT_SECTIONS = [
  { key: 'identity', label: 'ข้อมูลผู้รับบริการและชุดตรวจ', locked: true },
  { key: 'vitals', label: 'สัญญาณชีพ / BMI / รอบเอว / สายตา' },
  { key: 'lab', label: 'ผลตรวจทางห้องปฏิบัติการ' },
  { key: 'imaging', label: 'ผลตรวจรังสีและ EKG' },
  { key: 'other', label: 'รายการตรวจอื่นๆ และหัตถการ' },
  { key: 'physical', label: 'ผลการตรวจร่างกาย' },
  { key: 'summary', label: 'สรุปผลและข้อแนะนำ', locked: true },
];

export const defaultReportState = (visitId) => ({
  visitId,
  status: 'draft',
  sectionOrder: REPORT_SECTIONS.map((s) => s.key),
  hidden: {},
  summaryText: '',
  adviceText: '',
  authorizedBy: '',
  authorizedAt: '',
  sentChannel: '',
  sentAt: '',
  history: [],
});

export const getReport = (visitId) => {
  const stored = readStore().reports[visitId];
  return { ...defaultReportState(visitId), ...(stored || {}) };
};

const writeReport = (visitId, patch, auditEntry) => {
  mutate((store) => {
    const prev = { ...defaultReportState(visitId), ...(store.reports[visitId] || {}) };
    store.reports = {
      ...store.reports,
      [visitId]: {
        ...prev,
        ...patch,
        history: auditEntry
          ? [{ at: new Date().toISOString(), by: CHECKUP_STAFF.name, ...auditEntry }, ...(prev.history || [])]
          : prev.history,
      },
    };
    return store;
  });
  return getReport(visitId);
};

export const saveReportDraft = (visitId, patch) => {
  const r = writeReport(visitId, { ...patch, status: patch.status || 'draft' }, { action: 'บันทึกฉบับร่าง' });
  logCheckupAudit({ kind: 'report-save', entity: visitId, detail: 'บันทึกรายงานผลรายบุคคล (ฉบับร่าง)' });
  return r;
};

export const submitReportForAuthorize = (visitId, patch = {}) => {
  const r = writeReport(visitId, { ...patch, status: 'pending' }, { action: 'ส่งให้แพทย์อนุมัติ' });
  logCheckupAudit({ kind: 'report-submit', entity: visitId, detail: 'ส่งรายงานผลให้แพทย์อนุมัติ' });
  return r;
};

export const authorizeReport = (visitId, doctor) => {
  const r = writeReport(visitId, {
    status: 'authorized',
    authorizedBy: doctor,
    authorizedAt: new Date().toISOString(),
  }, { action: `อนุมัติรายงานโดย ${doctor}` });
  logCheckupAudit({ kind: 'report-authorize', entity: visitId, detail: `อนุมัติรายงานผลตรวจโดย ${doctor}` });
  return r;
};

export const unauthorizeReport = (visitId, reason) => {
  const r = writeReport(visitId, {
    status: 'draft',
    authorizedBy: '',
    authorizedAt: '',
    unauthorizeReason: reason,
  }, { action: `ยกเลิกการอนุมัติ — ${reason}` });
  logCheckupAudit({ kind: 'report-unauthorize', entity: visitId, detail: `ยกเลิกการอนุมัติรายงาน — เหตุผล: ${reason}` });
  return r;
};

export const sendReportToPatient = (visitId, channel) => {
  const r = writeReport(visitId, {
    status: 'sent',
    sentChannel: channel,
    sentAt: new Date().toISOString(),
  }, { action: `ส่งถึงผู้ป่วยทาง ${channel}` });
  logCheckupAudit({ kind: 'report-send', entity: visitId, detail: `ส่งรายงานผลถึงผู้ป่วยทาง ${channel}` });
  return r;
};

/* ── รายงาน / dashboards (§1.19.9, .20, .21) ────────────────────── */

/** สรุปผลกิจกรรมรายวัน — 3 ส่วนตาม TOR 1.19.9. */
export const getDailySummary = (date = CHECKUP_TODAY) => {
  const visits = listVisits().filter((v) => v.visitDate === date);
  const screenings = listScreenings();
  const screeningRows = visits
    .map((v) => {
      const s = screenings.find((x) => x.visitId === v.id);
      const done = [];
      if (s) {
        if (!s.metabolic?.skipped && Object.values(s.metabolic?.checked || {}).length) done.push('Metabolic');
        if (!s.cervical?.skipped && Object.keys(s.cervical?.answers || {}).length) done.push('มะเร็งปากมดลูก');
        if (!s.tb?.skipped && Object.keys(s.tb?.answers || {}).length) done.push('วัณโรค');
        if (!s.hiv?.skipped && s.hiv?.result) done.push('HIV');
        if (!s.dental?.skipped && Object.keys(s.dental?.answers || {}).length) done.push('ทันตกรรม');
        if (!s.mental?.skipped && is2QComplete(s.mental?.q2)) done.push('สุขภาพจิต');
        if (!s.ageBand?.skipped && Object.keys(s.ageBand?.done || {}).length) done.push('ตามกลุ่มวัย');
      }
      return {
        id: v.id, hn: v.hn, name: v.name, program: v.programName,
        forms: done.length, formList: done.join(' · ') || '—',
        confidential: screeningHasConfidential(s),
      };
    })
    .filter((r) => r.forms > 0 || true);

  const referrals = visits
    .filter((v) => {
      const rec = getVisitRecord(v.id);
      return rec && collectAbnormalFindings(v, rec).length > 0;
    })
    .map((v) => {
      const rec = getVisitRecord(v.id);
      const findings = collectAbnormalFindings(v, rec);
      return {
        id: v.id, hn: v.hn, name: v.name,
        to: findings.length >= 4 ? 'คลินิกโรคเรื้อรัง (NCD)' : 'ห้องตรวจแพทย์ทั่วไป',
        reason: findings.slice(0, 2).map((f) => f.label).join(' · '),
        count: findings.length,
      };
    });

  const activities = listCommunityActivities().filter((a) => a.date === date);

  return {
    date,
    screeningRows,
    screeningTotal: screeningRows.reduce((s, r) => s + r.forms, 0),
    referrals,
    referralTotal: referrals.length,
    activities,
    activityAttendees: activities.reduce((s, a) => s + (a.attendees || 0), 0),
    printedBy: CHECKUP_STAFF.name,
    printedAt: new Date().toISOString(),
  };
};

/** รายงานติดตามสิ่งส่งตรวจประจำวัน (§1.19.20). */
export const getSpecimenTracking = (date = CHECKUP_TODAY) => listVisits()
  .filter((v) => v.visitDate === date && v.statusKey !== 'cancelled')
  .map((v) => {
    const items = visitItems(v).filter((i) => i.specimen);
    return {
      id: v.id, hn: v.hn, name: v.name, orderNo: v.orderNo,
      specimenCount: items.length,
      tubes: [...new Set(items.map((i) => i.specimen))].join(' · ') || '—',
      specimen: v.specimen,
      specimenLabel: SPECIMEN_STATUSES[v.specimen]?.label || '—',
      stage: CHECKUP_STEPS.find((s) => v.steps?.[s.key] === 'active')?.label
        || (Object.values(v.steps || {}).every((s) => s === 'done') ? 'เสร็จสิ้น' : 'ลงทะเบียน'),
      overdue: v.specimen === 'sent' && v.statusKey === 'awaitResult',
    };
  });

/** Population health insight (§1.19.21). */
export const getPopulationInsight = () => {
  const visits = listVisits().filter((v) => v.statusKey === 'summarised');
  const withRecords = visits
    .map((v) => ({ visit: v, record: getVisitRecord(v.id) }))
    .filter((x) => x.record);

  const normal = withRecords.filter((x) => (x.record.summaryVerdict || generateSummaryDraft(x.visit, x.record).verdict) === 'normal').length;
  const abnormal = withRecords.length - normal;

  const tally = {};
  withRecords.forEach(({ visit, record }) => {
    collectAbnormalFindings(visit, record).forEach((f) => {
      tally[f.label] = (tally[f.label] || 0) + 1;
    });
  });
  const topFindings = Object.entries(tally)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const groups = listTargetGroups();
  const coverage = AGE_BAND_SCREENINGS.map((band) => {
    const members = groups.flatMap((g) => (g.members || []).filter((m) => m.status !== 'cancelled'));
    const inBand = members.filter((m) => {
      if (!m.dob) return false;
      const age = Math.floor((Date.now() - new Date(m.dob).getTime()) / (365.25 * 24 * 3600 * 1000));
      return age >= band.from && age <= band.to;
    });
    const screened = inBand.filter((m) => listVisits().some((v) => v.hn && v.hn === m.hn && v.statusKey === 'summarised'));
    return {
      band: band.label,
      target: inBand.length,
      screened: screened.length,
      pct: inBand.length ? Math.round((screened.length / inBand.length) * 100) : 0,
    };
  });

  return { total: withRecords.length, normal, abnormal, topFindings, coverage };
};

/* ── ประวัติ / เปรียบเทียบ (§1.19.11, .12) ──────────────────────── */

/** Metrics tracked across visits for the comparison table + trend charts. */
export const COMPARE_METRICS = [
  { code: 'weight', label: 'น้ำหนัก', unit: 'กก.', from: 'vitals', better: 'lower' },
  { code: 'BMI', label: 'ดัชนีมวลกาย (BMI)', unit: 'kg/m²', from: 'derived', better: 'lower' },
  { code: 'waist', label: 'รอบเอว', unit: 'ซม.', from: 'vitals', better: 'lower' },
  { code: 'SBP', label: 'ความดันตัวบน (SBP)', unit: 'mmHg', from: 'vitals', vitalKey: 'sbp', better: 'lower' },
  { code: 'DBP', label: 'ความดันตัวล่าง (DBP)', unit: 'mmHg', from: 'vitals', vitalKey: 'dbp', better: 'lower' },
  { code: 'FBS', label: 'น้ำตาลขณะอดอาหาร (FBS)', unit: 'mg/dL', from: 'results', better: 'lower' },
  { code: 'HBA1C', label: 'น้ำตาลสะสม (HbA1c)', unit: '%', from: 'results', better: 'lower' },
  { code: 'CHOL', label: 'โคเลสเตอรอลรวม', unit: 'mg/dL', from: 'results', better: 'lower' },
  { code: 'TG', label: 'ไตรกลีเซอไรด์', unit: 'mg/dL', from: 'results', better: 'lower' },
  { code: 'HDL', label: 'ไขมันดี (HDL)', unit: 'mg/dL', from: 'results', better: 'higher' },
  { code: 'LDL', label: 'ไขมันเลว (LDL)', unit: 'mg/dL', from: 'results', better: 'lower' },
  { code: 'CREA', label: 'ครีเอตินิน', unit: 'mg/dL', from: 'results', better: 'lower' },
  { code: 'EGFR', label: 'อัตรากรองของไต (eGFR)', unit: 'mL/min/1.73m²', from: 'results', better: 'higher' },
  { code: 'SGPT', label: 'เอนไซม์ตับ (SGPT)', unit: 'U/L', from: 'results', better: 'lower' },
  { code: 'CBC', label: 'ฮีโมโกลบิน (Hb)', unit: 'g/dL', from: 'results', better: 'higher' },
];

const metricValue = (metric, visit, record) => {
  if (!record) return null;
  if (metric.from === 'derived' && metric.code === 'BMI') {
    return computeBmi(record.vitals?.weight, record.vitals?.height);
  }
  if (metric.from === 'vitals') {
    const key = metric.vitalKey || metric.code;
    const raw = record.vitals?.[key];
    return raw === '' || raw == null ? null : Number(raw);
  }
  const raw = record.results?.[metric.code];
  if (raw === '' || raw == null) return null;
  const num = Number(raw);
  return Number.isNaN(num) ? null : num;
};

/**
 * Comparison matrix across a patient's checkup visits (§1.19.12).
 * Returns { visits, rows } where each row has values per visit + a trend
 * marker vs the previous visit that actually carries a value.
 */
export const buildComparison = (hn) => {
  const visits = listVisitsByHn(hn)
    .filter((v) => v.statusKey === 'summarised')
    .slice()
    .sort((a, b) => String(a.visitDate).localeCompare(String(b.visitDate)));
  const records = visits.map((v) => getVisitRecord(v.id));

  const rows = COMPARE_METRICS.map((metric) => {
    const values = visits.map((v, i) => metricValue(metric, v, records[i]));
    const present = values.map((val, i) => ({ val, i })).filter((p) => p.val != null);
    const first = present[0];
    const last = present[present.length - 1];
    let trend = null;
    if (first && last && present.length >= 2) {
      const delta = Math.round((last.val - first.val) * 100) / 100;
      const improved = metric.better === 'lower' ? delta < 0 : delta > 0;
      trend = {
        delta,
        direction: delta === 0 ? 'flat' : delta > 0 ? 'up' : 'down',
        improved: delta === 0 ? null : improved,
      };
    }
    return { ...metric, values, trend };
  });

  return { visits, records, rows };
};

/** Per-visit interpretation for the comparison cell colouring. */
export const compareCellStatus = (metric, value, visit) => {
  if (value == null) return 'empty';
  const code = metric.code === 'waist'
    ? (visit?.sex === 'หญิง' ? 'WAIST_F' : 'WAIST_M')
    : metric.code === 'weight' ? null : metric.code;
  if (!code) return 'plain';
  const verdict = interpretValue(code, value, visitRefOverrides(visit));
  return verdict.status;
};

/* ── EMR / Lab read-only links ─────────────────────────────────── */

/** Read-only cross-module links (never editable from the checkup side). */
export const emrLinksFor = (hn) => {
  if (!hn) return [];
  return [
    { label: 'ประวัติการรักษา (EMR)', to: '/opd/screening', icon: 'clinical_notes', note: 'เปิดหน้าคัดกรองและซักประวัติของระบบ OPD' },
    { label: 'ผลตรวจทางห้องปฏิบัติการ', to: '/lab/queue', icon: 'biotech', note: 'เปิดคิวห้องปฏิบัติการ (อ่านอย่างเดียว)' },
    { label: 'ผลตรวจรังสีวินิจฉัย', to: '/xray/queue', icon: 'radiology', note: 'เปิดคิวรังสีวินิจฉัย (อ่านอย่างเดียว)' },
    { label: 'คำสั่งการรักษา (CPOE)', to: '/treat/queue', icon: 'stethoscope', note: 'เปิดหน้าบันทึกการรักษาของแพทย์ (อ่านอย่างเดียว)' },
  ];
};

/** Patients with no cross-module history at all → panel empty state. */
export const hasEmrHistory = (hn) => ['67-00001', '67-00002', '67-00006'].includes(hn);

/* ── textarea suggestion pools (SuggestibleTextarea needs these) ── */

export const CHECKUP_SUMMARY_SUGGESTIONS = [
  'ผลการตรวจสุขภาพอยู่ในเกณฑ์ปกติทุกรายการ',
  'พบภาวะน้ำหนักเกินและอ้วนลงพุง',
  'พบระดับน้ำตาลในเลือดสูงกว่าเกณฑ์ เข้าเกณฑ์กลุ่มเสี่ยงเบาหวาน',
  'พบไขมันในเลือดผิดปกติ (โคเลสเตอรอลและ LDL สูง)',
  'พบความดันโลหิตสูงกว่าเกณฑ์ ควรวัดซ้ำที่บ้าน',
  'พบภาวะซีดเล็กน้อย ควรตรวจหาสาเหตุ',
  'ผลเอกซเรย์ทรวงอกไม่พบรอยโรค',
  'ผลคลื่นไฟฟ้าหัวใจปกติ',
  'พบเอนไซม์ตับสูงกว่าเกณฑ์',
  'พบความหนาแน่นกระดูกต่ำกว่าเกณฑ์',
];

export const CHECKUP_ADVICE_SUGGESTIONS = [
  'ควบคุมอาหาร ลดหวาน มัน เค็ม',
  'ออกกำลังกายอย่างน้อยสัปดาห์ละ 150 นาที',
  'ลดน้ำหนักให้ได้ 5–7% ของน้ำหนักตัวปัจจุบัน',
  'งดสูบบุหรี่และเครื่องดื่มแอลกอฮอล์',
  'นัดตรวจติดตามที่คลินิกโรคเรื้อรัง (NCD) ภายใน 1 เดือน',
  'ตรวจน้ำตาลและไขมันในเลือดซ้ำใน 3–6 เดือน',
  'ส่งพบแพทย์เพื่อประเมินเพิ่มเติม',
  'ส่งพบนักโภชนาการเพื่อวางแผนอาหาร',
  'เสริมแคลเซียมและวิตามินดี ร่วมกับออกกำลังกายแบบลงน้ำหนัก',
  'วัดความดันโลหิตที่บ้านและจดบันทึกมาพบแพทย์ครั้งถัดไป',
];

export const CHECKUP_PHYSICAL_SUGGESTIONS = [
  'ตรวจร่างกายทั่วไปปกติ',
  'ฟังเสียงหัวใจปกติ ไม่พบเสียงฟู่',
  'ฟังปอดปกติ ไม่พบเสียงผิดปกติ',
  'คลำต่อมไทรอยด์โตเล็กน้อย',
  'คลำได้ก้อนที่เต้านมข้างซ้าย',
  'ตรวจช่องปากพบฟันผุหลายซี่',
  'ตรวจเท้าผู้ป่วยเบาหวานพบผิวแห้งแตก',
  'ผิวหนังปกติ ไม่พบผื่นหรือแผล',
];

export const CHECKUP_IMPRESSION_SUGGESTIONS = [
  'ปอดและหัวใจปกติ ไม่พบรอยโรค',
  'พบฝ้าขาวที่ปอดกลีบบนขวา สงสัยวัณโรค',
  'หัวใจโตเล็กน้อย',
  'Sinus rhythm ปกติ',
  'พบ Left ventricular hypertrophy',
  'พบ Atrial fibrillation',
  'ไม่พบเซลล์ผิดปกติ (Negative for intraepithelial lesion)',
  'พบเซลล์ผิดปกติชนิด ASC-US',
];

export const CHECKUP_ACTIVITY_SUGGESTIONS = [
  'คัดกรองความดันโลหิตและ BMI ให้ผู้เข้าร่วมกิจกรรม',
  'ให้ความรู้เรื่องการป้องกันโรคไม่ติดต่อเรื้อรัง',
  'พบกลุ่มเสี่ยงเบาหวานและส่งต่อคลินิก NCD',
  'พบกลุ่มเสี่ยงความดันโลหิตสูงและนัดติดตาม',
  'ตรวจสุขภาพช่องปากและนัดทำฟัน',
  'แจกสื่อความรู้และคู่มือดูแลสุขภาพ',
  'ประสานอาสาสมัครสาธารณสุข (อสส.) ติดตามกลุ่มเสี่ยงต่อเนื่อง',
];

export const CHECKUP_SCREEN_NOTE_SUGGESTIONS = [
  'ผู้รับบริการปฏิเสธการคัดกรอง',
  'ไม่ได้คัดกรองเนื่องจากไม่เข้าเกณฑ์อายุ',
  'ไม่ได้คัดกรองเนื่องจากอยู่ในช่วงมีประจำเดือน',
  'ผู้รับบริการขอเลื่อนไปคัดกรองรอบถัดไป',
  'ส่งต่อคลินิกเฉพาะทางเพื่อคัดกรองเพิ่มเติม',
  'คัดกรองแล้วไม่พบความเสี่ยง',
];

export const CANCEL_REASON_SUGGESTIONS = [
  'ผู้รับบริการแจ้งยกเลิก',
  'ผู้รับบริการไม่ได้งดอาหารก่อนตรวจ',
  'ระบุชุดตรวจผิด ต้องออกใบสั่งใหม่',
  'ข้อมูลซ้ำกับใบสั่งตรวจอื่น',
  'ผู้รับบริการย้ายไปตรวจที่หน่วยบริการอื่น',
  'เครื่องมือตรวจขัดข้อง นัดตรวจใหม่',
];

/* ═══ คำสั่งการรักษาจากผลตรวจสุขภาพ (TOR §1.19.15) ══════════════════════
   ข้อกำหนดคือ "สามารถ **บันทึก** ข้อมูลการสั่งการรักษา (เชื่อมโยง CPOE)"
   ของเดิมมีแค่ลิงก์อ่านอย่างเดียวไป /treat — แพทย์ที่อ่านผลตรวจสุขภาพจึง
   สั่งอะไรจากหน้านี้ไม่ได้เลย ต้องจำผลแล้วไปเปิดอีกหน้าหนึ่ง

   หลักการที่ยึด (แบบเดียวกับ CarriedDentalPanel ของ คทง.6):
   **ไม่ทำระบบสั่งยาซ้อนกับ CPOE** — คำสั่งที่บันทึกที่นี่คือ "คำสั่งที่ออก
   จากผลตรวจสุขภาพ" ซึ่งส่งเข้าไปเป็นรายการรอในระบบบันทึกการรักษา แล้วให้
   แพทย์ยืนยัน/ปรับที่ CPOE ตามเดิม จุดนี้จึงเก็บเจตนา + เหตุผลทางคลินิก
   ไม่ใช่ขนาดยา/วิธีใช้ ซึ่งเป็นงานของ CPOE ที่มี CDSS ครบแล้ว           */

export const CHECKUP_ORDER_KINDS = [
  { value: 'medication', label: 'สั่งยา',                     icon: 'pill',        route: '/treat/queue' },
  { value: 'lab',        label: 'ตรวจทางห้องปฏิบัติการเพิ่ม', icon: 'science',     route: '/lab/worklist' },
  { value: 'imaging',    label: 'ตรวจทางรังสีเพิ่ม',          icon: 'radiology',   route: '/xray/worklist' },
  { value: 'refer',      label: 'ส่งต่อคลินิก/สถานพยาบาล',    icon: 'forward_to_inbox', route: '/treat/refer' },
  { value: 'followup',   label: 'นัดติดตามผล',                icon: 'event',       route: '/appointment' },
  { value: 'advice',     label: 'คำแนะนำ/ปรับพฤติกรรม',       icon: 'health_and_safety', route: null },
];

export const checkupOrderKind = (v) =>
  CHECKUP_ORDER_KINDS.find((k) => k.value === v) || null;

export const CHECKUP_ORDER_STATUS = {
  draft: { label: 'ร่าง', style: 'grey' },
  sent: { label: 'ส่งเข้าระบบการรักษาแล้ว', style: 'green' },
  cancelled: { label: 'ยกเลิกแล้ว', style: 'red' },
};

/** คำสั่งทั้งหมดของใบตรวจสุขภาพหนึ่งใบ (ใหม่สุดอยู่บน) */
export const listCheckupOrders = (visitId) => {
  const store = readStore();
  return [...((store.treatmentOrders || {})[visitId] || [])]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
};

export const saveCheckupOrder = (visitId, draft) => {
  if (!visitId) return null;
  const now = new Date().toISOString();
  let saved = null;
  mutate((store) => {
    const all = store.treatmentOrders || {};
    const rows = all[visitId] || [];
    const id = draft.id || `cto-${visitId}-${rows.length + 1}-${Date.now()}`;
    const existing = rows.find((r) => r.id === id);
    saved = existing
      ? { ...existing, ...draft, id, updatedBy: CHECKUP_STAFF.name, updatedAt: now }
      : {
        status: 'draft',
        ...draft,
        id,
        visitId,
        createdBy: CHECKUP_STAFF.name,
        createdAt: now,
        updatedBy: CHECKUP_STAFF.name,
        updatedAt: now,
      };
    store.treatmentOrders = {
      ...all,
      [visitId]: existing ? rows.map((r) => (r.id === id ? saved : r)) : [...rows, saved],
    };
    return store;
  });
  logCheckupAudit({
    action: draft.id ? 'แก้ไขคำสั่งการรักษาจากผลตรวจสุขภาพ' : 'บันทึกคำสั่งการรักษาจากผลตรวจสุขภาพ',
    subject: visitId,
    detail: `${checkupOrderKind(draft.kind)?.label || draft.kind} — ${draft.detail || ''}`,
  });
  return saved;
};

/** ส่งคำสั่งเข้าระบบบันทึกการรักษา — ยังไม่ผูก backend จริง จึงเป็นการ
    เปลี่ยนสถานะ + ประทับผู้ส่ง/เวลา ให้ตามรอยได้ว่าใครส่งเมื่อไร */
export const sendCheckupOrder = (visitId, orderId) => {
  const now = new Date().toISOString();
  mutate((store) => {
    const all = store.treatmentOrders || {};
    store.treatmentOrders = {
      ...all,
      [visitId]: (all[visitId] || []).map((r) => (
        r.id === orderId
          ? { ...r, status: 'sent', sentBy: CHECKUP_STAFF.name, sentAt: now }
          : r
      )),
    };
    return store;
  });
  logCheckupAudit({ action: 'ส่งคำสั่งการรักษาเข้าระบบบันทึกการรักษา', subject: visitId, detail: orderId });
  return listCheckupOrders(visitId);
};

/** ยกเลิกคำสั่ง — เหตุผลบังคับตามแนวเดียวกับที่อื่นในระบบ */
export const cancelCheckupOrder = (visitId, orderId, reason) => {
  const now = new Date().toISOString();
  mutate((store) => {
    const all = store.treatmentOrders || {};
    store.treatmentOrders = {
      ...all,
      [visitId]: (all[visitId] || []).map((r) => (
        r.id === orderId
          ? { ...r, status: 'cancelled', cancelReason: reason || 'ไม่ระบุเหตุผล', cancelledBy: CHECKUP_STAFF.name, cancelledAt: now }
          : r
      )),
    };
    return store;
  });
  logCheckupAudit({ action: 'ยกเลิกคำสั่งการรักษาจากผลตรวจสุขภาพ', subject: visitId, detail: `${orderId} · ${reason || ''}` });
  return listCheckupOrders(visitId);
};
