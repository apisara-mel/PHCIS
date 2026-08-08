import { PATIENT_PROFILES } from '@/data/patientProfiles';
import { buildMockRightsGroups, formatThaiBuddhistDate, parseThaiBuddhistDate } from '@/data/registrationForm';
import { SNOMED_CONCEPTS } from '@/data/treatmentSnomed';

/* Mock store for TOR §1.7 "ระบบงานสิทธิและการเบิกจ่าย + Claim"
   (src/pages/rights/*). Shaped after src/data/financePaymentPrototype.js —
   plain mutable arrays + a listener set so every view re-reads after a
   mutation (same pattern as src/data/pharmacyRegistry.js's
   `subscribeRegistry`). Nothing persists past a reload.

   Why its own store instead of reusing financePaymentPrototype:
   §1.7 is the *เรียกเก็บ / claim* side of the money (what the payer owes
   and how it leaves the building as an e-Claim file), while §1.5/§1.8 is
   the *cashier* side (what the patient hands over at the counter). They
   answer different TOR chapters and different day-jobs, so this module
   owns its own visit/charge/cycle model rather than importing finance's.
   The CSV+BOM download helper is deliberately re-implemented here for the
   same reason (see the file-header note in ClaimExportSection.jsx).

   Read-only borrows:
     • PATIENT_PROFILES        — patient identity (§1.4.2 masking applies)
     • buildMockRightsGroups   — the rights cards Registration Step 4 owns
     • SNOMED_CONCEPTS         — ICD-10 crosswalk catalogue

   Fields Registration Step 4 does NOT model (รหัสสถานพยาบาลหลัก/รอง —
   §1.7.2.4, ยืนยันสิทธิข้าราชการ — §1.7.2.5, Activate — §1.7.2.1) live
   in `HN_RIGHTS` here, keyed by HN. That is a deliberate prototype
   compromise: the real system needs ONE backing record shared with
   Registration, so a value edited at /rights does not appear on
   /registration/register today. */

/* ──────────────────────────────────────────────────────────────
   0. Listener plumbing
   ────────────────────────────────────────────────────────────── */

const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

/** Subscribe to any mutation in this store. Returns an unsubscribe fn. */
export const subscribeRightsClaim = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/* ──────────────────────────────────────────────────────────────
   1. Formatting helpers
   ────────────────────────────────────────────────────────────── */

export const formatBaht = (n) =>
  `฿${Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 0 })}`;

export const thaiDate = (d) => formatThaiBuddhistDate(d instanceof Date ? d : new Date(d));

export const thaiTime = (d) =>
  (d instanceof Date ? d : new Date(d))
    .toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });

/** "8 สิงหาคม 2569 · 14:32 น." — the audit stamp used everywhere. */
export const nowStamp = () => {
  const d = new Date();
  return `${thaiDate(d)} · ${thaiTime(d)} น.`;
};

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
};

const money = (n) => Math.round(n);

/** §1.4.2 ข้อมูลลับ — list views show a masked national ID; only the
    detail screen (and only for a role that may reveal it) sees all 13. */
export const maskNationalId = (id = '') => {
  const digits = String(id).replace(/\D/g, '');
  if (digits.length !== 13) return id || '-';
  return `${digits[0]}-xxxx-xxxx${digits[9]}-${digits.slice(10, 12)}-${digits[12]}`;
};

export const formatNationalIdFull = (id = '') => {
  const digits = String(id).replace(/\D/g, '');
  if (digits.length !== 13) return id || '-';
  return `${digits[0]}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10, 12)}-${digits[12]}`;
};

/* ──────────────────────────────────────────────────────────────
   2. Roles — §1.7.3.5 / §1.7.3.6 "ตามสิทธิของผู้ใช้งาน"
   ────────────────────────────────────────────────────────────── */

/* There is no auth system in this prototype, so "ตามสิทธิของผู้ใช้งาน" is
   modelled as a mock role switcher in the UI. Report this as partial: the
   real requirement binds to the §1.17 user/group-policy system. */
export const CLAIM_ROLES = [
  {
    key: 'claimOfficer',
    label: 'เจ้าหน้าที่เบิกจ่าย',
    userName: 'น.ส.กัลยา เบิกจ่าย',
    position: 'เจ้าหน้าที่เบิกจ่าย',
    canConfirm: true,
    canEdit: true,
    canRevealId: true,
    canManageSettings: true,
  },
  {
    key: 'staff',
    label: 'เจ้าหน้าที่ทั่วไป',
    userName: 'นายภาคิน ธุรการ',
    position: 'เจ้าหน้าที่ธุรการ',
    canConfirm: false,
    canEdit: false,
    canRevealId: false,
    canManageSettings: false,
  },
];

export const resolveRole = (key) => CLAIM_ROLES.find((r) => r.key === key) || CLAIM_ROLES[0];

export const NO_PERMISSION_HINT = 'ต้องเป็นเจ้าหน้าที่เบิกจ่ายจึงจะแก้ไข/ยืนยันได้';

/* The active mock role lives in the store, not in page state: /rights and
   /rights/submit/:visitId are separate routes, and a role that reset on
   navigation would let a read-only user reach an editable detail form. */
/* Which section /rights was on when the user drilled into a visit detail.
   Sections are internal state (finance pattern), so without this the
   "กลับ" button from /rights/submit/:visitId would dump the user back on
   เช็คสิทธิ instead of the ส่งเบิก queue they came from. */
let lastSectionKey = 'check';
export const getRightsSection = () => lastSectionKey;
export const setRightsSection = (key) => { lastSectionKey = key; };

let activeRoleKey = CLAIM_ROLES[0].key;
export const getClaimRoleKey = () => activeRoleKey;
export const getClaimRole = () => resolveRole(activeRoleKey);
export const setClaimRoleKey = (key) => {
  activeRoleKey = resolveRole(key).key;
  notify();
  return activeRoleKey;
};

/* ──────────────────────────────────────────────────────────────
   3. Reference lookups
   ────────────────────────────────────────────────────────────── */

/** §1.7.2.4 — รหัสสถานพยาบาล. 5-digit NHSO facility codes (mock values in
    the real 5-digit shape; verify against the สปสช. master before use). */
export const HOSPITAL_CODES = [
  { code: '11458', name: 'ศูนย์บริการสาธารณสุข 8 บุญรอด รุ่งเรือง', province: 'กรุงเทพมหานคร' },
  { code: '11459', name: 'ศูนย์บริการสาธารณสุข 21 วัดธาตุทอง', province: 'กรุงเทพมหานคร' },
  { code: '11461', name: 'ศูนย์บริการสาธารณสุข 41 คลองเตย', province: 'กรุงเทพมหานคร' },
  { code: '11465', name: 'ศูนย์บริการสาธารณสุข 56 ทับเจริญ', province: 'กรุงเทพมหานคร' },
  { code: '10686', name: 'โรงพยาบาลพระนั่งเกล้า', province: 'นนทบุรี' },
  { code: '10709', name: 'โรงพยาบาลกลาง', province: 'กรุงเทพมหานคร' },
  { code: '10710', name: 'โรงพยาบาลตากสิน', province: 'กรุงเทพมหานคร' },
  { code: '10711', name: 'โรงพยาบาลเจริญกรุงประชารักษ์', province: 'กรุงเทพมหานคร' },
  { code: '10712', name: 'โรงพยาบาลราชพิพัฒน์', province: 'กรุงเทพมหานคร' },
  { code: '10713', name: 'โรงพยาบาลสิรินธร', province: 'กรุงเทพมหานคร' },
  { code: '13775', name: 'โรงพยาบาลผู้สูงอายุบางขุนเทียน', province: 'กรุงเทพมหานคร' },
  { code: '13776', name: 'โรงพยาบาลคลองสามวา', province: 'กรุงเทพมหานคร' },
];

export const hospitalByCode = (code) => HOSPITAL_CODES.find((h) => h.code === code) || null;

/** §1.7.4.7 — หน่วยงานต้นสังกัดที่จะส่งเรื่องไปเรียกเก็บ. */
export const PARENT_ORGS = [
  { code: 'CGD',  name: 'กรมบัญชีกลาง (สวัสดิการข้าราชการ เบิกจ่ายตรง)' },
  { code: 'BMA',  name: 'สำนักอนามัย กรุงเทพมหานคร' },
  { code: 'SSO4', name: 'สำนักงานประกันสังคม กรุงเทพมหานคร พื้นที่ 4' },
  { code: 'NHSO', name: 'สำนักงานหลักประกันสุขภาพแห่งชาติ เขต 13 กรุงเทพมหานคร' },
  { code: 'LGO',  name: 'กองทุนสวัสดิการพนักงานส่วนท้องถิ่น (อปท.)' },
  { code: 'TLI',  name: 'บริษัท ไทยประกันชีวิต จำกัด (มหาชน)' },
  { code: 'AIA',  name: 'บริษัท เอไอเอ จำกัด' },
  { code: 'GSB',  name: 'ธนาคารออมสิน (สวัสดิการพนักงาน)' },
];

export const parentOrgByCode = (code) => PARENT_ORGS.find((o) => o.code === code) || null;

/** §1.7.3.2 — คลินิก / คลินิกย่อย / แพทย์ผู้ตรวจตามคลินิกนั้น. */
export const CLINICS = [
  {
    key: 'internal', label: 'คลินิกอายุรกรรม',
    subClinics: ['คลินิกโรคเรื้อรัง (NCD)', 'คลินิกเบาหวาน', 'คลินิกความดันโลหิตสูง'],
    doctors: ['พญ.สมหญิง รักษ์ดี', 'นพ.สมชาย ใจดี', 'พญ.ปริยากร เจริญสุข'],
  },
  {
    key: 'general', label: 'คลินิกตรวจโรคทั่วไป',
    subClinics: ['ห้องตรวจ 1', 'ห้องตรวจ 2', 'คลินิกนอกเวลา'],
    doctors: ['นพ.ณัฐวุฒิ บุญมี', 'พญ.วิภา สุขศรี', 'นพ.สมชาย ใจดี'],
  },
  {
    key: 'dental', label: 'คลินิกทันตกรรม',
    subClinics: ['ทันตกรรมทั่วไป', 'ทันตกรรมป้องกัน', 'ศัลยกรรมช่องปาก'],
    doctors: ['ทพ.ธนกฤต ยิ้มแย้ม', 'ทพญ.ชนิดา ฟันดี'],
  },
  {
    key: 'anc', label: 'คลินิกฝากครรภ์',
    subClinics: ['ฝากครรภ์ครั้งแรก', 'ฝากครรภ์ต่อเนื่อง'],
    doctors: ['พญ.วิภา สุขศรี', 'พญ.ปริยากร เจริญสุข'],
  },
  {
    key: 'wound', label: 'คลินิกทำแผลและหัตถการ',
    subClinics: ['ทำแผลทั่วไป', 'ผ่าตัดเล็ก'],
    doctors: ['นพ.ณัฐวุฒิ บุญมี', 'นพ.สมชาย ใจดี'],
  },
  {
    key: 'mental', label: 'คลินิกสุขภาพจิต',
    subClinics: ['ให้คำปรึกษา', 'ติดตามอาการ'],
    doctors: ['พญ.ปริยากร เจริญสุข', 'พญ.สมหญิง รักษ์ดี'],
  },
];

export const clinicByKey = (key) => CLINICS.find((c) => c.key === key) || CLINICS[0];

export const ALL_DOCTORS = Array.from(new Set(CLINICS.flatMap((c) => c.doctors)));

/** §1.7.3.3 — ICD-10 catalogue, crosswalked off the SNOMED mock so the two
    code systems in this prototype never disagree. */
export const ICD10_CATALOG = (() => {
  const seen = new Set();
  const out = [];
  SNOMED_CONCEPTS.forEach((c) => {
    if (!c.icd10 || seen.has(c.icd10)) return;
    seen.add(c.icd10);
    out.push({ code: c.icd10, term: c.term, termTh: c.termTh, snomed: c.code });
  });
  return out;
})();

export const icd10ByCode = (code) => ICD10_CATALOG.find((c) => c.code === code) || null;

export const searchIcd10 = (query) => {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  return ICD10_CATALOG.filter((c) =>
    c.code.toLowerCase().includes(q) || c.term.toLowerCase().includes(q) || c.termTh.includes(q),
  ).slice(0, 20);
};

/** §1.7.3.4 — ICD-9-CM procedure catalogue (mock subset relevant to a
    Bangkok health-centre OPD; production needs the licensed master). */
export const ICD9CM_CATALOG = [
  { code: '86.28', term: 'Nonexcisional debridement of wound',    termTh: 'ทำแผลแบบไม่ตัดเนื้อเยื่อ' },
  { code: '86.59', term: 'Suture of skin, other sites',           termTh: 'เย็บแผลผิวหนัง' },
  { code: '86.22', term: 'Excisional debridement of wound',        termTh: 'ตัดเนื้อตายออกจากแผล' },
  { code: '89.52', term: 'Electrocardiogram',                      termTh: 'ตรวจคลื่นไฟฟ้าหัวใจ (EKG)' },
  { code: '88.19', term: 'Other x-ray of abdomen',                 termTh: 'เอกซเรย์ช่องท้อง' },
  { code: '87.44', term: 'Routine chest x-ray',                    termTh: 'เอกซเรย์ปอด' },
  { code: '99.23', term: 'Injection of steroid',                   termTh: 'ฉีดยาสเตียรอยด์' },
  { code: '99.29', term: 'Injection of other substance',           termTh: 'ฉีดยา/สารอื่น' },
  { code: '99.59', term: 'Other vaccination and inoculation',      termTh: 'ให้วัคซีนอื่น ๆ' },
  { code: '96.59', term: 'Other irrigation of wound',             termTh: 'ล้างแผล' },
  { code: '93.57', term: 'Application of other wound dressing',    termTh: 'ปิดแผลด้วยวัสดุปิดแผล' },
  { code: '23.09', term: 'Extraction of tooth',                    termTh: 'ถอนฟัน' },
  { code: '23.19', term: 'Surgical removal of tooth',              termTh: 'ผ่าฟันคุด' },
  { code: '96.54', term: 'Dental scaling and polishing',           termTh: 'ขูดหินปูนและขัดฟัน' },
  { code: '75.34', term: 'Fetal monitoring',                       termTh: 'ติดตามการเต้นของหัวใจทารกในครรภ์' },
  { code: '89.03', term: 'Comprehensive interview and evaluation',  termTh: 'ซักประวัติและประเมินอย่างละเอียด' },
  { code: '94.49', term: 'Other counselling',                      termTh: 'ให้คำปรึกษา' },
  { code: '90.59', term: 'Other microscopic examination of blood',  termTh: 'ตรวจเลือดด้วยกล้องจุลทรรศน์' },
];

export const icd9ByCode = (code) => ICD9CM_CATALOG.find((c) => c.code === code) || null;

export const searchIcd9 = (query) => {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  return ICD9CM_CATALOG.filter((c) =>
    c.code.toLowerCase().includes(q) || c.term.toLowerCase().includes(q) || c.termTh.includes(q),
  ).slice(0, 20);
};

/** §1.7.3.4 — สถานะของหัตถการ (ใคร/ทำไปแล้วหรือไม่). */
export const PROCEDURE_STATUS_OPTIONS = [
  { value: 'primary',   label: 'หัตถการหลัก' },
  { value: 'secondary', label: 'หัตถการรอง' },
  { value: 'completed', label: 'ทำแล้ว' },
  { value: 'planned',   label: 'วางแผนไว้' },
  { value: 'cancelled', label: 'ยกเลิก' },
];

export const procedureStatusLabel = (v) =>
  PROCEDURE_STATUS_OPTIONS.find((o) => o.value === v)?.label || v;

/** §1.7.4.6 — ประเภทผู้รับบริการ (ปกติ / อุบัติเหตุ / ฉุกเฉิน). */
export const VISIT_KINDS = [
  { key: 'normal', label: 'ปกติ',            short: 'ปกติ',  badge: 'grey'   },
  { key: 'ae',     label: 'อุบัติเหตุ (AE)',  short: 'AE',    badge: 'orange' },
  { key: 'ems',    label: 'ฉุกเฉิน (EMS)',   short: 'EMS',   badge: 'red'    },
];

export const visitKindMeta = (key) => VISIT_KINDS.find((k) => k.key === key) || VISIT_KINDS[0];

/** หมวดค่าใช้จ่าย — this module's own catalogue (finance keeps its own). */
export const CHARGE_CATEGORIES = {
  service:    { key: 'service',    label: 'ค่าบริการตรวจรักษา',        icon: 'stethoscope' },
  lab:        { key: 'lab',        label: 'ค่าตรวจทางห้องปฏิบัติการ',  icon: 'biotech' },
  radiology:  { key: 'radiology',  label: 'ค่าตรวจทางรังสีวินิจฉัย',   icon: 'radiology' },
  medication: { key: 'medication', label: 'ค่ายา',                     icon: 'pill' },
  supplies:   { key: 'supplies',   label: 'ค่าเวชภัณฑ์/วัสดุ',         icon: 'medical_services' },
  procedure:  { key: 'procedure',  label: 'ค่าหัตถการ',                icon: 'healing' },
  other:      { key: 'other',      label: 'ค่าบริการอื่นๆ',            icon: 'receipt_long' },
};

export const CHARGE_CATEGORY_LIST = Object.values(CHARGE_CATEGORIES);

/** §1.7.5.4 — ประเภทการออกใบเสร็จ. */
export const RECEIPT_TYPES = [
  { value: 'claimInvoice', label: 'ใบแจ้งหนี้เรียกเก็บหน่วยงาน' },
  { value: 'cashReceipt',  label: 'ใบเสร็จรับเงิน (เงินสด)' },
  { value: 'mixed',        label: 'ใบเสร็จผสม (เรียกเก็บ + เงินสด)' },
  { value: 'noReceipt',    label: 'ไม่ออกใบเสร็จ (สิทธิเหมาจ่าย)' },
];

/** §1.7.5.4 — ชนิดการคิดค่าบริการ. */
export const BILLING_MODES = [
  { value: 'full',     label: 'คิดค่าบริการเต็มจำนวน' },
  { value: 'discount', label: 'คิดตามส่วนลดเปอร์เซ็นต์' },
  { value: 'flat',     label: 'เหมาจ่ายต่อครั้ง' },
];

export const receiptTypeLabel = (v) => RECEIPT_TYPES.find((o) => o.value === v)?.label || v;
export const billingModeLabel = (v) => BILLING_MODES.find((o) => o.value === v)?.label || v;

/* ──────────────────────────────────────────────────────────────
   4. §1.7.5 — ตั้งค่าสิทธิการรักษา (master, mutable)
   ────────────────────────────────────────────────────────────── */

const SEED_STAMP = `${thaiDate(daysAgo(9))} · 10:14 น.`;
const SEED_BY = 'น.ส.กัลยา เบิกจ่าย';

export const RIGHTS_MASTER = [
  {
    id: 'rm-uc',
    code: 'UC',
    name: 'บัตรทอง (หลักประกันสุขภาพแห่งชาติ)',
    payer: 'NHSO',
    badge: 'blue',
    receiptType: 'claimInvoice',
    billingMode: 'full',
    discountPct: 0,
    capPerVisit: 0,
    capPerYear: 0,
    coveragePct: 100,
    exclusions: ['other'],
    fees: [{ id: 'fee-uc-1', label: 'ค่าธรรมเนียมบริการนอกเวลา', amount: 50 }],
    items: [
      { id: 'ri-uc-1', code: 'SRV-OPD', label: 'ค่าตรวจรักษา OPD', category: 'service', price: 300, covered: 300 },
      { id: 'ri-uc-2', code: 'LAB-CBC', label: 'ตรวจ CBC', category: 'lab', price: 180, covered: 180 },
      { id: 'ri-uc-3', code: 'DRG-STD', label: 'ยาในบัญชียาหลักแห่งชาติ', category: 'medication', price: 0, covered: 0 },
    ],
    active: true,
    updatedBy: SEED_BY,
    updatedAt: SEED_STAMP,
  },
  {
    id: 'rm-sso',
    code: 'SSO',
    name: 'ประกันสังคม',
    payer: 'SSO4',
    badge: 'green',
    receiptType: 'claimInvoice',
    billingMode: 'full',
    discountPct: 0,
    capPerVisit: 0,
    capPerYear: 0,
    coveragePct: 100,
    exclusions: ['other', 'supplies'],
    fees: [],
    items: [
      { id: 'ri-sso-1', code: 'SRV-OPD', label: 'ค่าตรวจรักษา OPD', category: 'service', price: 300, covered: 300 },
      { id: 'ri-sso-2', code: 'DEN-SCAL', label: 'ขูดหินปูน (เพดาน 900/ปี)', category: 'procedure', price: 600, covered: 600 },
    ],
    active: true,
    updatedBy: SEED_BY,
    updatedAt: SEED_STAMP,
  },
  {
    id: 'rm-civil',
    code: 'CSMBS',
    name: 'สวัสดิการข้าราชการ (เบิกจ่ายตรง)',
    payer: 'CGD',
    badge: 'purple',
    receiptType: 'claimInvoice',
    billingMode: 'full',
    discountPct: 0,
    capPerVisit: 0,
    capPerYear: 0,
    coveragePct: 100,
    exclusions: ['other'],
    fees: [],
    items: [
      { id: 'ri-civil-1', code: 'SRV-OPD', label: 'ค่าตรวจรักษา OPD', category: 'service', price: 350, covered: 350 },
      { id: 'ri-civil-2', code: 'XR-CHEST', label: 'เอกซเรย์ปอด', category: 'radiology', price: 350, covered: 350 },
    ],
    active: true,
    requiresCivilConfirm: true,
    updatedBy: SEED_BY,
    updatedAt: SEED_STAMP,
  },
  {
    id: 'rm-bma',
    code: 'BMA',
    name: 'สิทธิข้าราชการ กทม.',
    payer: 'BMA',
    badge: 'teal',
    receiptType: 'claimInvoice',
    billingMode: 'discount',
    discountPct: 50,
    capPerVisit: 2000,
    capPerYear: 20000,
    coveragePct: 50,
    exclusions: ['other', 'supplies'],
    fees: [{ id: 'fee-bma-1', label: 'ค่าธรรมเนียมเวชระเบียน', amount: 20 }],
    items: [
      { id: 'ri-bma-1', code: 'SRV-OPD', label: 'ค่าตรวจรักษา OPD', category: 'service', price: 300, covered: 150 },
    ],
    active: true,
    requiresCivilConfirm: true,
    updatedBy: SEED_BY,
    updatedAt: SEED_STAMP,
  },
  {
    id: 'rm-lgo',
    code: 'LGO',
    name: 'สิทธิพนักงานส่วนท้องถิ่น (อปท.)',
    payer: 'LGO',
    badge: 'indigo',
    receiptType: 'claimInvoice',
    billingMode: 'full',
    discountPct: 0,
    capPerVisit: 0,
    capPerYear: 0,
    coveragePct: 100,
    exclusions: ['other'],
    fees: [],
    items: [],
    active: true,
    requiresCivilConfirm: true,
    updatedBy: SEED_BY,
    updatedAt: SEED_STAMP,
  },
  {
    id: 'rm-private',
    code: 'PVT',
    name: 'ประกันสุขภาพเอกชน (AIA / ไทยประกันชีวิต)',
    payer: 'TLI',
    badge: 'orange',
    receiptType: 'mixed',
    billingMode: 'flat',
    discountPct: 0,
    capPerVisit: 1500,
    capPerYear: 30000,
    coveragePct: 80,
    exclusions: ['other'],
    fees: [{ id: 'fee-pvt-1', label: 'ค่าธรรมเนียมออกเอกสารเคลม', amount: 100 }],
    items: [],
    active: true,
    updatedBy: SEED_BY,
    updatedAt: SEED_STAMP,
  },
  {
    id: 'rm-cash',
    code: 'CASH',
    name: 'ชำระเงินเอง',
    payer: null,
    badge: 'grey',
    receiptType: 'cashReceipt',
    billingMode: 'full',
    discountPct: 0,
    capPerVisit: 0,
    capPerYear: 0,
    coveragePct: 0,
    exclusions: [],
    fees: [],
    items: [],
    active: true,
    updatedBy: SEED_BY,
    updatedAt: SEED_STAMP,
  },
  {
    id: 'rm-legacy-vet',
    code: 'VET',
    name: 'สิทธิทหารผ่านศึก (ยกเลิกใช้งาน)',
    payer: 'BMA',
    badge: 'grey',
    receiptType: 'claimInvoice',
    billingMode: 'full',
    discountPct: 0,
    capPerVisit: 0,
    capPerYear: 0,
    coveragePct: 100,
    exclusions: [],
    fees: [],
    items: [],
    active: false,
    updatedBy: SEED_BY,
    updatedAt: `${thaiDate(daysAgo(120))} · 09:02 น.`,
  },
];

export const rightsById = (id) => RIGHTS_MASTER.find((r) => r.id === id) || null;
export const rightsByCode = (code) => RIGHTS_MASTER.find((r) => r.code === code) || null;

let rightsSeq = RIGHTS_MASTER.length;

/** §1.7.5.1 / §1.7.5.2 / §1.7.5.3 / §1.7.5.4 — create + update in one call. */
export const upsertRightsMaster = (form, by) => {
  const stamp = nowStamp();
  if (!form.id) {
    rightsSeq += 1;
    const row = {
      id: `rm-new-${rightsSeq}`,
      badge: 'teal',
      exclusions: [],
      fees: [],
      items: [],
      active: true,
      ...form,
      updatedBy: by,
      updatedAt: stamp,
    };
    RIGHTS_MASTER.push(row);
    appendAudit({ action: 'เพิ่มสิทธิการรักษา', target: `${row.code} · ${row.name}`, by });
    notify();
    return row;
  }
  const idx = RIGHTS_MASTER.findIndex((r) => r.id === form.id);
  if (idx === -1) return null;
  RIGHTS_MASTER[idx] = { ...RIGHTS_MASTER[idx], ...form, updatedBy: by, updatedAt: stamp };
  appendAudit({ action: 'แก้ไขสิทธิการรักษา', target: `${RIGHTS_MASTER[idx].code} · ${RIGHTS_MASTER[idx].name}`, by });
  notify();
  return RIGHTS_MASTER[idx];
};

export const setRightsMasterActive = (id, active, by) => {
  const row = rightsById(id);
  if (!row) return null;
  row.active = active;
  row.updatedBy = by;
  row.updatedAt = nowStamp();
  appendAudit({ action: active ? 'เปิดใช้งานสิทธิ' : 'ปิดใช้งานสิทธิ', target: `${row.code} · ${row.name}`, by });
  notify();
  return row;
};

/** Edge case — a rights row still referenced by a visit must not be deleted;
    the UI offers "ปิดสถานะใช้งาน" instead. */
export const rightsUsageCount = (id) => RIGHTS_VISITS.filter((v) => v.billingRightsId === id).length;

export const deleteRightsMaster = (id, by) => {
  const idx = RIGHTS_MASTER.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  if (rightsUsageCount(id) > 0) return false;
  const [removed] = RIGHTS_MASTER.splice(idx, 1);
  appendAudit({ action: 'ลบสิทธิการรักษา', target: `${removed.code} · ${removed.name}`, by });
  notify();
  return true;
};

/** §1.7.5.5 — ประเภทการลดหย่อนค่ารักษาพยาบาล. */
export const DEDUCTION_TYPES = [
  { id: 'dt-elder',    name: 'ผู้สูงอายุ 60 ปีขึ้นไป',       condition: 'อายุ ≥ 60 ปี และมีทะเบียนบ้าน กทม.', mode: 'percent', value: 50,   active: true,  updatedBy: SEED_BY, updatedAt: SEED_STAMP },
  { id: 'dt-disabled', name: 'ผู้พิการ (ท.74)',              condition: 'มีบัตรประจำตัวผู้พิการ',              mode: 'percent', value: 100,  active: true,  updatedBy: SEED_BY, updatedAt: SEED_STAMP },
  { id: 'dt-poor',     name: 'ผู้ยากไร้ตามระเบียบสำนักอนามัย', condition: 'ผ่านการประเมินโดยนักสังคมสงเคราะห์',   mode: 'percent', value: 100,  active: true,  updatedBy: SEED_BY, updatedAt: SEED_STAMP },
  { id: 'dt-staff',    name: 'บุคลากรของหน่วยงาน',           condition: 'พนักงาน กทม. และครอบครัวสายตรง',       mode: 'percent', value: 20,   active: true,  updatedBy: SEED_BY, updatedAt: SEED_STAMP },
  { id: 'dt-monk',     name: 'พระภิกษุ / สามเณร',            condition: 'แสดงหนังสือสุทธิ',                     mode: 'amount',  value: 300,  active: true,  updatedBy: SEED_BY, updatedAt: SEED_STAMP },
  { id: 'dt-flood',    name: 'ผู้ประสบภัยตามประกาศ',          condition: 'ตามประกาศเขตภัยพิบัติ (หมดอายุแล้ว)',   mode: 'amount',  value: 500,  active: false, updatedBy: SEED_BY, updatedAt: `${thaiDate(daysAgo(200))} · 08:40 น.` },
];

export const DEDUCTION_MODES = [
  { value: 'percent', label: 'เปอร์เซ็นต์ (%)' },
  { value: 'amount',  label: 'จำนวนเงิน (บาท)' },
];

let deductionSeq = DEDUCTION_TYPES.length;

export const upsertDeductionType = (form, by) => {
  const stamp = nowStamp();
  if (!form.id) {
    deductionSeq += 1;
    const row = { id: `dt-new-${deductionSeq}`, active: true, ...form, updatedBy: by, updatedAt: stamp };
    DEDUCTION_TYPES.push(row);
    appendAudit({ action: 'เพิ่มประเภทการลดหย่อน', target: row.name, by });
    notify();
    return row;
  }
  const idx = DEDUCTION_TYPES.findIndex((d) => d.id === form.id);
  if (idx === -1) return null;
  DEDUCTION_TYPES[idx] = { ...DEDUCTION_TYPES[idx], ...form, updatedBy: by, updatedAt: stamp };
  appendAudit({ action: 'แก้ไขประเภทการลดหย่อน', target: DEDUCTION_TYPES[idx].name, by });
  notify();
  return DEDUCTION_TYPES[idx];
};

export const deleteDeductionType = (id, by) => {
  const idx = DEDUCTION_TYPES.findIndex((d) => d.id === id);
  if (idx === -1) return false;
  const [removed] = DEDUCTION_TYPES.splice(idx, 1);
  appendAudit({ action: 'ลบประเภทการลดหย่อน', target: removed.name, by });
  notify();
  return true;
};

/* ──────────────────────────────────────────────────────────────
   5. §1.7.4.8 — รอบส่งเบิก (claim cycles)
   ────────────────────────────────────────────────────────────── */

export const CYCLE_STATUSES = {
  open:      { key: 'open',      label: 'เปิดรับรายการ', color: 'info' },
  submitted: { key: 'submitted', label: 'ส่งเบิกแล้ว',   color: 'warning' },
  paid:      { key: 'paid',      label: 'รับเงินแล้ว',   color: 'success' },
};

export const CLAIM_CYCLES = [
  { id: 'cy-2569-08', name: 'งวดที่ 8/2569', start: daysAgo(7),  end: daysAgo(0),  status: 'open',      submittedAt: null, submittedBy: null },
  { id: 'cy-2569-07', name: 'งวดที่ 7/2569', start: daysAgo(37), end: daysAgo(8),  status: 'submitted', submittedAt: `${thaiDate(daysAgo(6))} · 16:20 น.`, submittedBy: SEED_BY },
  { id: 'cy-2569-06', name: 'งวดที่ 6/2569', start: daysAgo(68), end: daysAgo(38), status: 'paid',      submittedAt: `${thaiDate(daysAgo(35))} · 15:05 น.`, submittedBy: SEED_BY },
];

export const cycleById = (id) => CLAIM_CYCLES.find((c) => c.id === id) || null;

export const cycleRangeLabel = (cycle) =>
  cycle ? `${thaiDate(cycle.start)} – ${thaiDate(cycle.end)}` : '-';

/* ──────────────────────────────────────────────────────────────
   6. Visits — one entity feeding both §1.7.3 (ส่งเบิก) and §1.7.4 (Claim)
   ────────────────────────────────────────────────────────────── */

const CHARGE_LIBRARY = {
  opd:      { category: 'service',    label: 'ค่าตรวจรักษา OPD',                unitPrice: 300 },
  opdAfter: { category: 'service',    label: 'ค่าตรวจรักษานอกเวลา',              unitPrice: 450 },
  cbc:      { category: 'lab',        label: 'CBC (ความสมบูรณ์ของเม็ดเลือด)',    unitPrice: 180 },
  fbs:      { category: 'lab',        label: 'FBS / HbA1c',                      unitPrice: 280 },
  lipid:    { category: 'lab',        label: 'Lipid profile',                    unitPrice: 320 },
  urine:    { category: 'lab',        label: 'Urine analysis',                   unitPrice: 120 },
  cxr:      { category: 'radiology',  label: 'เอกซเรย์ปอด (Chest X-ray)',        unitPrice: 350 },
  kneeXr:   { category: 'radiology',  label: 'เอกซเรย์เข่า 2 ท่า',               unitPrice: 420 },
  metformin:{ category: 'medication', label: 'Metformin 500mg (60 เม็ด)',        unitPrice: 110 },
  enalapril:{ category: 'medication', label: 'Enalapril 5mg (30 เม็ด)',          unitPrice: 75 },
  para:     { category: 'medication', label: 'Paracetamol 500mg (30 เม็ด)',      unitPrice: 90 },
  amox:     { category: 'medication', label: 'Amoxicillin 500mg (21 เม็ด)',      unitPrice: 120 },
  vitamin:  { category: 'medication', label: 'วิตามินรวม (นอกบัญชียาหลัก)',      unitPrice: 260 },
  dressing: { category: 'supplies',   label: 'ชุดทำแผลปลอดเชื้อ',                unitPrice: 180 },
  splint:   { category: 'supplies',   label: 'อุปกรณ์พยุงข้อเข่า',                unitPrice: 850 },
  wound:    { category: 'procedure',  label: 'ทำแผลและเย็บแผล',                  unitPrice: 500 },
  scaling:  { category: 'procedure',  label: 'ขูดหินปูนและขัดฟัน',               unitPrice: 600 },
  extract:  { category: 'procedure',  label: 'ถอนฟันกรามล่าง',                   unitPrice: 700 },
  ekg:      { category: 'procedure',  label: 'ตรวจคลื่นไฟฟ้าหัวใจ (EKG)',        unitPrice: 400 },
  counsel:  { category: 'procedure',  label: 'ให้คำปรึกษาสุขภาพจิต 45 นาที',      unitPrice: 500 },
  cert:     { category: 'other',      label: 'ค่าใบรับรองแพทย์',                  unitPrice: 100 },
  copy:     { category: 'other',      label: 'ค่าสำเนาเวชระเบียน',                unitPrice: 50 },
};

/* One spec row per Close-Visit. `charges` is [libraryKey, qty]. */
const VISIT_SPECS = [
  {
    rights: 'rm-uc', clinic: 'internal', sub: 0, doctor: 0, daysAgo: 0, kind: 'normal', cycle: 'cy-2569-08',
    icd10: [['E11.9', 'principle'], ['I10', 'comorbidity']],
    icd9: [['89.52', 'completed']],
    charges: [['opd', 1], ['fbs', 1], ['metformin', 1], ['enalapril', 1], ['cert', 1]],
    org: 'NHSO',
  },
  {
    rights: 'rm-sso', clinic: 'general', sub: 0, doctor: 1, daysAgo: 0, kind: 'normal', cycle: 'cy-2569-08',
    icd10: [['J06.9', 'principle']],
    icd9: [['89.03', 'completed']],
    charges: [['opd', 1], ['cbc', 1], ['para', 1], ['vitamin', 1]],
    org: 'SSO4',
  },
  {
    rights: 'rm-civil', clinic: 'wound', sub: 0, doctor: 0, daysAgo: 0, kind: 'ae', cycle: 'cy-2569-08',
    icd10: [['T14.1', 'principle'], ['W19', 'externalCause']],
    icd9: [['86.59', 'completed'], ['86.28', 'secondary']],
    charges: [['opd', 1], ['wound', 1], ['dressing', 2], ['amox', 1]],
    org: 'CGD', confirmTreatment: true, confirmCode: true,
  },
  {
    rights: 'rm-bma', clinic: 'internal', sub: 1, doctor: 2, daysAgo: 1, kind: 'normal', cycle: 'cy-2569-08',
    icd10: [['E78.5', 'principle'], ['E66.9', 'comorbidity']],
    icd9: [['90.59', 'completed']],
    charges: [['opd', 1], ['lipid', 1], ['metformin', 1], ['copy', 1]],
    org: 'BMA', confirmTreatment: true,
  },
  {
    rights: 'rm-cash', clinic: 'general', sub: 1, doctor: 0, daysAgo: 1, kind: 'normal', cycle: 'cy-2569-08',
    icd10: [['R51', 'principle']],
    icd9: [],
    charges: [['opd', 1], ['para', 1], ['cert', 1]],
    org: null,
  },
  {
    rights: 'rm-uc', clinic: 'dental', sub: 2, doctor: 0, daysAgo: 2, kind: 'normal', cycle: 'cy-2569-08',
    icd10: [['K29.7', 'other']],
    icd9: [['23.19', 'primary'], ['96.54', 'secondary']],
    charges: [['opd', 1], ['extract', 1], ['amox', 1], ['dressing', 1]],
    org: 'NHSO', confirmTreatment: true, confirmCode: true,
  },
  {
    rights: 'rm-sso', clinic: 'dental', sub: 1, doctor: 1, daysAgo: 3, kind: 'normal', cycle: 'cy-2569-08',
    icd10: [['K29.7', 'principle']],
    icd9: [['96.54', 'completed']],
    charges: [['opd', 1], ['scaling', 1]],
    org: 'SSO4', confirmTreatment: true, confirmCode: true,
  },
  {
    rights: 'rm-private', clinic: 'general', sub: 2, doctor: 2, daysAgo: 4, kind: 'ems', cycle: 'cy-2569-07',
    icd10: [['I21.9', 'principle'], ['I10', 'comorbidity']],
    icd9: [['89.52', 'primary']],
    charges: [['opdAfter', 1], ['ekg', 1], ['cbc', 1], ['cxr', 1]],
    org: 'TLI', confirmTreatment: true, confirmCode: true,
  },
  {
    rights: 'rm-lgo', clinic: 'internal', sub: 2, doctor: 1, daysAgo: 6, kind: 'normal', cycle: 'cy-2569-07',
    icd10: [['I10', 'principle']],
    icd9: [['89.52', 'completed']],
    charges: [['opd', 1], ['urine', 1], ['enalapril', 1]],
    org: 'LGO', confirmTreatment: true, confirmCode: true,
  },
  {
    rights: 'rm-uc', clinic: 'anc', sub: 0, doctor: 0, daysAgo: 8, kind: 'normal', cycle: 'cy-2569-07',
    icd10: [['R50.9', 'other']],
    icd9: [['75.34', 'completed']],
    charges: [['opd', 1], ['cbc', 1], ['urine', 1]],
    org: 'NHSO', confirmTreatment: true, confirmCode: true,
  },
  {
    rights: 'rm-bma', clinic: 'wound', sub: 1, doctor: 1, daysAgo: 10, kind: 'ae', cycle: 'cy-2569-07',
    icd10: [['T14.2', 'principle'], ['V29.9', 'externalCause']],
    icd9: [['86.22', 'primary'], ['87.44', 'secondary']],
    charges: [['opdAfter', 1], ['wound', 1], ['kneeXr', 1], ['splint', 1], ['amox', 1]],
    org: 'BMA', rework: 'ICD-10 สาเหตุภายนอกไม่สอดคล้องกับบันทึกเวชระเบียน กรุณาตรวจสอบ',
  },
  {
    /* สิทธิหมดอายุ — บัตรทองหมดอายุก่อนวันรับบริการ ทุกบรรทัดจึงตกเป็นเงินสด
       และ section เรียกเก็บต้องขึ้นคำเตือน (ดู edge case ในสเปก). */
    rights: 'rm-uc', clinic: 'mental', sub: 0, doctor: 0, daysAgo: 12, kind: 'normal', cycle: 'cy-2569-07',
    icd10: [['F32.9', 'principle']],
    icd9: [['94.49', 'completed']],
    charges: [['opd', 1], ['counsel', 1]],
    org: null, expiredRights: true,
  },
  {
    rights: 'rm-civil', clinic: 'internal', sub: 0, doctor: 2, daysAgo: 15, kind: 'normal', cycle: 'cy-2569-06',
    icd10: [['J44.9', 'principle'], ['J45.9', 'comorbidity']],
    icd9: [['87.44', 'completed']],
    charges: [['opd', 1], ['cxr', 1], ['cbc', 1], ['para', 1]],
    org: 'CGD', confirmTreatment: true, confirmCode: true,
  },
  {
    rights: 'rm-sso', clinic: 'general', sub: 0, doctor: 0, daysAgo: 18, kind: 'normal', cycle: 'cy-2569-06',
    icd10: [['K21.9', 'principle']],
    icd9: [],
    charges: [['opd', 1], ['para', 1], ['vitamin', 1], ['copy', 1]],
    org: 'SSO4', confirmTreatment: true, confirmCode: true,
  },
];

const buildCharges = (spec) =>
  spec.charges.map(([key, qty], idx) => {
    const lib = CHARGE_LIBRARY[key];
    return {
      id: `chg-${idx}-${key}`,
      category: lib.category,
      label: lib.label,
      qty,
      unitPrice: lib.unitPrice,
      amount: money(lib.unitPrice * qty),
    };
  });

const buildIcd10 = (spec, doctorName) =>
  spec.icd10.map(([code, diagType], idx) => {
    const meta = icd10ByCode(code);
    return {
      id: `dx-${idx}-${code}`,
      code,
      term: meta?.term || code,
      termTh: meta?.termTh || '',
      diagType,
      doctor: doctorName,
    };
  });

const buildIcd9 = (spec, doctorName) =>
  spec.icd9.map(([code, status], idx) => {
    const meta = icd9ByCode(code);
    return {
      id: `px-${idx}-${code}`,
      code,
      term: meta?.term || code,
      termTh: meta?.termTh || '',
      status,
      performer: doctorName,
    };
  });

export const RIGHTS_VISITS = VISIT_SPECS.map((spec, idx) => {
  const profile = PATIENT_PROFILES[idx % PATIENT_PROFILES.length];
  const clinic = clinicByKey(spec.clinic);
  const doctorName = clinic.doctors[spec.doctor % clinic.doctors.length];
  const visitDay = daysAgo(spec.daysAgo);
  const hour = 8 + (idx % 8);
  const minute = (idx * 11) % 60;
  /* An expired/unknown rights row falls back to ชำระเงินเอง for billing —
     see the "สิทธิหมดอายุ" edge case (every line becomes เงินสด). */
  const rightsId = spec.expiredRights ? 'rm-cash' : spec.rights;
  const resolvedRights = rightsById(rightsId) ? rightsId : 'rm-cash';
  const confirmStamp = `${thaiDate(daysAgo(Math.max(0, spec.daysAgo - 1)))} · 09:${String((idx * 7) % 60).padStart(2, '0')} น.`;

  return {
    id: `rv-${String(idx + 1).padStart(3, '0')}`,
    /* §1.7.4.5 — เลขที่การมารับบริการ (visit number) used as the billing
       reference. Mock sequence; not derived from a real OPD visit because
       this module must not read/patch src/pages/opd. */
    visitNo: `OPD69-${String(120450 + idx * 7)}`,
    hn: profile.hn,
    patient: profile,
    visitDate: thaiDate(visitDay),
    visitDateObj: visitDay,
    visitTime: `${hour}:${String(minute).padStart(2, '0')}`,
    clinicKey: spec.clinic,
    subClinic: clinic.subClinics[spec.sub % clinic.subClinics.length],
    doctor: doctorName,
    icd10: buildIcd10(spec, doctorName),
    icd9: buildIcd9(spec, doctorName),
    charges: buildCharges(spec),

    /* §1.7.4.3 / §1.7.4.5 — the rights actually used to bill this visit
       (editable, independent of what Registration recorded). */
    billingRightsId: resolvedRights,
    originalRightsId: spec.rights,
    rightsExpired: !!spec.expiredRights,

    /* §1.7.4.6 / §1.7.4.7 */
    visitKind: spec.kind,
    parentOrgCode: spec.org,

    cycleId: spec.cycle,

    /* §1.7.3.5 — ยืนยันข้อมูลการรักษา */
    treatmentConfirm: spec.confirmTreatment
      ? { confirmed: true, by: SEED_BY, at: confirmStamp, note: '' }
      : { confirmed: false, by: null, at: null, note: '' },
    /* §1.7.3.6 — ยืนยันรหัสโรค */
    codeConfirm: spec.confirmCode
      ? { confirmed: true, by: 'นพ.ตรวจสอบ รหัสโรค', at: confirmStamp, note: '' }
      : { confirmed: false, by: null, at: null, note: '' },
    reworkReason: spec.rework || null,

    /* ส่วนลด/ลดหย่อนที่ออกไปแล้ว (feeds §1.7.4.2's % ส่วนลด card) */
    deductionTypeId: idx === 3 ? 'dt-elder' : idx === 9 ? 'dt-poor' : null,

    /* เงินสดที่เก็บได้แล้วจากส่วนที่ผู้ป่วยจ่ายเอง — the rest is ค้างชำระ. */
    cashCollectedRatio: idx % 4 === 3 ? 0 : 1,

    savedBy: SEED_BY,
    savedAt: `${thaiDate(visitDay)} · ${hour}:${String(minute).padStart(2, '0')} น.`,
    audit: [],
  };
});

/** Derived queue status — §1.7.3 (รอตรวจสอบ / ยืนยันแล้ว / ต้องแก้ไข). */
export const SUBMIT_STATUSES = [
  { key: 'pending',   label: 'รอตรวจสอบ',  color: 'info',    icon: 'hourglass_top' },
  { key: 'confirmed', label: 'ยืนยันแล้ว',  color: 'success', icon: 'check_circle' },
  { key: 'needsEdit', label: 'ต้องแก้ไข',   color: 'error',   icon: 'error' },
];

export const submitStatusOf = (visit) => {
  if (visit.reworkReason) return 'needsEdit';
  if (visit.treatmentConfirm.confirmed && visit.codeConfirm.confirmed) return 'confirmed';
  return 'pending';
};

export const submitStatusMeta = (key) =>
  SUBMIT_STATUSES.find((s) => s.key === key) || SUBMIT_STATUSES[0];

export const visitById = (id) => RIGHTS_VISITS.find((v) => v.id === id) || null;

export const clinicLabelOf = (visit) => clinicByKey(visit.clinicKey).label;

export const principalDx = (visit) =>
  visit.icd10.find((d) => d.diagType === 'principle') || visit.icd10[0] || null;

/* ──────────────────────────────────────────────────────────────
   7. §1.7.4.1 / §1.7.4.4 — mixed เรียกเก็บ + เงินสด split & totals
   ────────────────────────────────────────────────────────────── */

/** Payer of one charge line. */
export const PAYER_KINDS = {
  claim: { key: 'claim', label: 'เรียกเก็บ', badge: 'blue' },
  cash:  { key: 'cash',  label: 'เงินสด',   badge: 'orange' },
};

/* §1.7.4.4 "คำนวณจำนวนเงินที่ต้องเรียกเก็บ" — the rule this prototype
   implements, in order:
     1. ชำระเงินเอง / สิทธิหมดอายุ  → every line is เงินสด, nothing to claim.
     2. หมวดที่อยู่ใน `exclusions` ของสิทธิ → line is เงินสด.
     3. อื่น ๆ → claimable at the rights' `coveragePct`; the remainder of
        that line is the patient's เงินสด share.
     4. เพดานต่อครั้ง (`capPerVisit`) trims the claimable total; whatever it
        trims moves back onto the patient as เงินสด.
     5. ประเภทการลดหย่อน (§1.7.5.5) then reduces the patient's เงินสด share.
   Every screen that shows money calls this, so the summary cards, the row
   totals and the cycle roll-up can never disagree. */
export const computeVisitClaim = (visit) => {
  const rights = rightsById(visit.billingRightsId) || rightsById('rm-cash');
  const selfPay = !rights || rights.code === 'CASH' || visit.rightsExpired;
  const coverage = selfPay ? 0 : Math.max(0, Math.min(100, rights.coveragePct)) / 100;
  const exclusions = new Set(selfPay ? [] : rights.exclusions || []);

  const lines = visit.charges.map((line) => {
    const excluded = selfPay || exclusions.has(line.category);
    const rawClaim = excluded ? 0 : money(line.amount * coverage);
    return {
      ...line,
      payer: rawClaim > 0 ? 'claim' : 'cash',
      claimAmount: rawClaim,
      cashAmount: line.amount - rawClaim,
      excluded: excluded && !selfPay,
    };
  });

  const totalCharge = lines.reduce((s, l) => s + l.amount, 0);
  let claimTotal = lines.reduce((s, l) => s + l.claimAmount, 0);
  let capTrimmed = 0;
  const cap = selfPay ? 0 : rights.capPerVisit || 0;
  if (cap > 0 && claimTotal > cap) {
    capTrimmed = claimTotal - cap;
    claimTotal = cap;
  }

  const fees = selfPay ? [] : (rights.fees || []);
  const feeTotal = fees.reduce((s, f) => s + f.amount, 0);

  const grossCash = totalCharge - claimTotal;
  const deduction = DEDUCTION_TYPES.find((d) => d.id === visit.deductionTypeId && d.active) || null;
  const discountAmount = !deduction
    ? 0
    : deduction.mode === 'percent'
      ? money(grossCash * (deduction.value / 100))
      : Math.min(grossCash, deduction.value);

  const cashTotal = Math.max(0, grossCash + feeTotal - discountAmount);
  const cashCollected = money(cashTotal * (visit.cashCollectedRatio ?? 1));
  const cashOutstanding = Math.max(0, cashTotal - cashCollected);

  const cycle = cycleById(visit.cycleId);
  const billed = cycle ? cycle.status !== 'open' : false;

  return {
    rights,
    selfPay,
    lines,
    totalCharge,
    claimTotal,
    capTrimmed,
    feeTotal,
    fees,
    deduction,
    discountAmount,
    cashTotal,
    cashCollected,
    cashOutstanding,
    billed,
    billedAmount: billed ? claimTotal : 0,
    remainingAmount: billed ? 0 : claimTotal,
  };
};

/** §1.7.4.2 / §1.7.4.9 — financial roll-up over any set of visits. */
export const computeClaimTotals = (visits = RIGHTS_VISITS) => {
  const acc = visits.reduce((a, v) => {
    const t = computeVisitClaim(v);
    a.visitCount += 1;
    a.totalCharge += t.totalCharge;
    a.claimTotal += t.claimTotal;
    a.billedTotal += t.billedAmount;
    a.remainingTotal += t.remainingAmount;
    a.cashTotal += t.cashTotal;
    a.outstandingTotal += t.cashOutstanding;
    a.discountTotal += t.discountAmount;
    a.feeTotal += t.feeTotal;
    if (t.discountAmount > 0) a.discountedVisits += 1;
    return a;
  }, {
    visitCount: 0,
    totalCharge: 0,
    claimTotal: 0,
    billedTotal: 0,
    remainingTotal: 0,
    cashTotal: 0,
    outstandingTotal: 0,
    discountTotal: 0,
    feeTotal: 0,
    discountedVisits: 0,
  });

  /* "เปอร์เซ็นต์ส่วนลดที่ได้ออกส่วนลดไปแล้ว" — ส่วนลดรวม เทียบ ค่าใช้จ่ายรวม. */
  acc.discountPct = acc.totalCharge > 0
    ? Math.round((acc.discountTotal / acc.totalCharge) * 1000) / 10
    : 0;
  return acc;
};

/* ──────────────────────────────────────────────────────────────
   8. Mutations on a visit (§1.7.3.2–.6, §1.7.4.3, .5, .6, .7)
   ────────────────────────────────────────────────────────────── */

const touchVisit = (visit, action, detail, by) => {
  visit.savedBy = by;
  visit.savedAt = nowStamp();
  visit.audit = [...(visit.audit || []), { id: `va-${visit.audit?.length || 0}-${Date.now()}`, action, detail, by, at: visit.savedAt }];
  appendAudit({ action, target: `${visit.visitNo} · ${visit.patient.shortName}`, detail, by });
};

/** §1.7.3.2 / §1.7.3.3 / §1.7.3.4 — save the whole submit form at once so
    "ยกเลิก" can simply drop the draft without touching the store. */
export const saveVisitSubmitForm = (visitId, draft, by) => {
  const visit = visitById(visitId);
  if (!visit) return null;
  visit.clinicKey = draft.clinicKey;
  visit.subClinic = draft.subClinic;
  visit.doctor = draft.doctor;
  visit.icd10 = draft.icd10.map((d) => ({ ...d }));
  visit.icd9 = draft.icd9.map((p) => ({ ...p }));
  touchVisit(visit, 'บันทึกข้อมูลส่งเบิก', `ICD10 ${draft.icd10.length} รายการ · ICD9CM ${draft.icd9.length} รายการ`, by);
  notify();
  return visit;
};

/** §1.7.3.5 */
export const confirmVisitTreatment = (visitId, by, note = '') => {
  const visit = visitById(visitId);
  if (!visit) return null;
  visit.treatmentConfirm = { confirmed: true, by, at: nowStamp(), note };
  visit.reworkReason = null;
  touchVisit(visit, 'ยืนยันข้อมูลการรักษา', note, by);
  notify();
  return visit;
};

/** §1.7.3.6 */
export const confirmVisitCodes = (visitId, by, note = '') => {
  const visit = visitById(visitId);
  if (!visit) return null;
  visit.codeConfirm = { confirmed: true, by, at: nowStamp(), note };
  visit.reworkReason = null;
  touchVisit(visit, 'ยืนยันรหัสโรค', note, by);
  notify();
  return visit;
};

/** "ขอแก้ไข" — unlocks a confirmed visit and pushes it back to ต้องแก้ไข. */
export const requestVisitRework = (visitId, reason, by, scope = 'both') => {
  const visit = visitById(visitId);
  if (!visit) return null;
  if (scope === 'both' || scope === 'treatment') {
    visit.treatmentConfirm = { confirmed: false, by: null, at: null, note: '' };
  }
  if (scope === 'both' || scope === 'code') {
    visit.codeConfirm = { confirmed: false, by: null, at: null, note: '' };
  }
  visit.reworkReason = reason;
  touchVisit(visit, 'ขอแก้ไขข้อมูลที่ยืนยันแล้ว', reason, by);
  notify();
  return visit;
};

/** §1.7.4.3 / §1.7.4.5 / §1.7.4.6 / §1.7.4.7 — the billing popup's save. */
export const saveVisitBilling = (visitId, patch, by) => {
  const visit = visitById(visitId);
  if (!visit) return null;
  const fromRights = rightsById(visit.billingRightsId);
  if (patch.billingRightsId) visit.billingRightsId = patch.billingRightsId;
  if (patch.visitKind) visit.visitKind = patch.visitKind;
  if ('parentOrgCode' in patch) visit.parentOrgCode = patch.parentOrgCode;
  if ('deductionTypeId' in patch) visit.deductionTypeId = patch.deductionTypeId;
  if ('cycleId' in patch && patch.cycleId) visit.cycleId = patch.cycleId;
  const toRights = rightsById(visit.billingRightsId);
  const detail = [
    fromRights?.id !== toRights?.id ? `สิทธิเรียกเก็บ ${fromRights?.name || '-'} → ${toRights?.name || '-'}` : null,
    patch.visitKind ? `ประเภท ${visitKindMeta(patch.visitKind).label}` : null,
    'parentOrgCode' in patch ? `หน่วยงานต้นสังกัด ${parentOrgByCode(patch.parentOrgCode)?.name || 'ไม่ระบุ'}` : null,
  ].filter(Boolean).join(' · ');
  touchVisit(visit, 'แก้ไขข้อมูลการเรียกเก็บ', detail, by);
  notify();
  return visit;
};

/* ──────────────────────────────────────────────────────────────
   9. §1.7.1 / §1.7.2 — per-HN rights record (สปสช. check + activation)
   ────────────────────────────────────────────────────────────── */

const NHSO_STATUSES = {
  active:   { key: 'active',   label: 'สิทธิปกติ',    color: 'success', badge: 'green' },
  expired:  { key: 'expired',  label: 'สิทธิหมดอายุ', color: 'warning', badge: 'orange' },
  notFound: { key: 'notFound', label: 'ไม่พบสิทธิ',   color: 'error',   badge: 'red' },
};

export const nhsoStatusMeta = (key) => NHSO_STATUSES[key] || NHSO_STATUSES.notFound;

const rightsLabelFromInsurance = (insurance = '') => {
  if (insurance.includes('บัตรทอง') || insurance.includes('หลักประกัน')) return rightsByCode('UC');
  if (insurance.includes('ประกันสังคม')) return rightsByCode('SSO');
  if (insurance.includes('ข้าราชการ กทม')) return rightsByCode('BMA');
  if (insurance.includes('ข้าราชการ')) return rightsByCode('CSMBS');
  if (insurance.includes('ท้องถิ่น') || insurance.includes('อปท')) return rightsByCode('LGO');
  if (insurance.includes('AIA') || insurance.includes('ประกันชีวิต')) return rightsByCode('PVT');
  return rightsByCode('CASH');
};

/** Mutable per-HN record for the three fields Registration Step 4 doesn't
    model. Lazily seeded from PATIENT_PROFILES + buildMockRightsGroups. */
export const HN_RIGHTS = {};

const hashOf = (s) => String(s).split('').reduce((a, c) => a + c.charCodeAt(0), 0);

export const getHnRights = (hn) => {
  if (HN_RIGHTS[hn]) return HN_RIGHTS[hn];
  const profile = PATIENT_PROFILES.find((p) => p.hn === hn);
  const seedRights = rightsLabelFromInsurance(profile?.insurance || '');
  const h = hashOf(hn);
  /* Registration owns the rights *cards*; we mirror the group titles it
     produces so the two screens read as the same record (read-only). */
  const regGroups = buildMockRightsGroups();
  const secondary = h % 3 === 0 ? rightsByCode('PVT') : null;

  const cards = [
    {
      id: 'hr-primary',
      groupTitle: regGroups[0]?.title || 'สิทธิที่ 1',
      primary: true,
      rightsId: seedRights?.id || 'rm-cash',
      mainHospitalCode: HOSPITAL_CODES[h % 4].code,
      subHospitalCode: HOSPITAL_CODES[4 + (h % 4)].code,
      startDate: thaiDate(daysAgo(400 + (h % 90))),
      endDate: h % 7 === 0 ? thaiDate(daysAgo(20)) : thaiDate(new Date(Date.now() + 200 * 86400000)),
      activated: h % 5 !== 0,
      activatedBy: h % 5 !== 0 ? SEED_BY : null,
      activatedAt: h % 5 !== 0 ? `${thaiDate(daysAgo(60))} · 11:05 น.` : null,
      civilConfirmed: false,
      civilApprovalNo: null,
      civilConfirmedBy: null,
      civilConfirmedAt: null,
      updatedBy: null,
      updatedAt: null,
    },
    ...(secondary ? [{
      id: 'hr-secondary',
      groupTitle: regGroups[1]?.title || 'สิทธิที่ 2',
      primary: false,
      rightsId: secondary.id,
      mainHospitalCode: HOSPITAL_CODES[(h + 2) % HOSPITAL_CODES.length].code,
      subHospitalCode: null,
      startDate: thaiDate(daysAgo(120)),
      endDate: thaiDate(new Date(Date.now() + 400 * 86400000)),
      activated: false,
      activatedBy: null,
      activatedAt: null,
      civilConfirmed: false,
      civilApprovalNo: null,
      civilConfirmedBy: null,
      civilConfirmedAt: null,
      updatedBy: null,
      updatedAt: null,
    }] : []),
  ];

  HN_RIGHTS[hn] = {
    hn,
    cards,
    lastCheck: null,   // { status, main, sub, mainHospitalCode, subHospitalCode, startDate, endDate, checkedBy, checkedAt, offline }
    audit: [],
  };
  return HN_RIGHTS[hn];
};

export const searchPatients = (query) => {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  return PATIENT_PROFILES.filter((p) => [p.hn, p.shortName, p.fullName, p.nationalId, p.englishName]
    .some((f) => f && f.toString().toLowerCase().includes(q))).slice(0, 12);
};

export const patientByHn = (hn) => PATIENT_PROFILES.find((p) => p.hn === hn) || null;

/** 13-digit validation used before firing the mock สปสช. lookup. */
export const isCompleteNationalId = (value) => /^\d{13}$/.test(String(value || '').replace(/\D/g, ''));

/** §1.7.1.1 — mock สปสช. online eligibility check. Resolves after ~1.2s so
    the UI has a real "กำลังตรวจสอบ" state; `mode` forces the outcome from
    the dev switch so QA can reach the error/expired branches on demand. */
export const runNhsoCheck = (hn, mode = 'auto') => new Promise((resolve, reject) => {
  window.setTimeout(() => {
    if (mode === 'offline') {
      reject(new Error('เชื่อมต่อระบบตรวจสอบสิทธิ สปสช. ไม่ได้ (timeout)'));
      return;
    }
    const record = getHnRights(hn);
    const primary = record.cards.find((c) => c.primary) || record.cards[0];
    const rights = rightsById(primary?.rightsId);
    const h = hashOf(hn);
    let status = mode === 'expired' ? 'expired' : mode === 'notFound' ? 'notFound' : null;
    if (!status) {
      if (!rights || rights.code === 'CASH') status = 'notFound';
      else if (h % 7 === 0) status = 'expired';
      else status = 'active';
    }
    const secondary = record.cards.find((c) => !c.primary);
    resolve({
      status,
      main: status === 'notFound' ? null : rights?.name || null,
      sub: secondary ? rightsById(secondary.rightsId)?.name || null : null,
      mainHospitalCode: status === 'notFound' ? null : primary?.mainHospitalCode || null,
      subHospitalCode: status === 'notFound' ? null : primary?.subHospitalCode || null,
      startDate: status === 'notFound' ? null : primary?.startDate || null,
      endDate: status === 'notFound' ? null : primary?.endDate || null,
    });
  }, 1200);
});

export const recordNhsoCheck = (hn, result, by) => {
  const record = getHnRights(hn);
  record.lastCheck = { ...result, checkedBy: by, checkedAt: nowStamp(), offline: false };
  record.audit = [...record.audit, { id: `ha-${record.audit.length}`, action: 'ตรวจสอบสิทธิออนไลน์ (สปสช.)', detail: nhsoStatusMeta(result.status).label, by, at: record.lastCheck.checkedAt }];
  appendAudit({ action: 'ตรวจสอบสิทธิออนไลน์ (สปสช.)', target: `HN ${hn}`, detail: nhsoStatusMeta(result.status).label, by });
  notify();
  return record;
};

/** §1.7.2.1 — Activate / ยกเลิกการเปิดใช้งานสิทธิ. */
export const setRightsCardActivated = (hn, cardId, activated, by, reason = '') => {
  const record = getHnRights(hn);
  const card = record.cards.find((c) => c.id === cardId);
  if (!card) return null;
  card.activated = activated;
  card.activatedBy = activated ? by : null;
  card.activatedAt = activated ? nowStamp() : null;
  card.updatedBy = by;
  card.updatedAt = nowStamp();
  const action = activated ? 'เปิดใช้งานสิทธิ (Activate)' : 'ยกเลิกการเปิดใช้งานสิทธิ';
  record.audit = [...record.audit, { id: `ha-${record.audit.length}`, action, detail: reason, by, at: card.updatedAt }];
  appendAudit({ action, target: `HN ${hn} · ${card.groupTitle}`, detail: reason, by });
  notify();
  return card;
};

/** §1.7.2.4 — ระบุ/แก้รหัสสถานพยาบาลหลัก + รอง. */
export const setRightsCardHospitals = (hn, cardId, { mainHospitalCode, subHospitalCode }, by) => {
  const record = getHnRights(hn);
  const card = record.cards.find((c) => c.id === cardId);
  if (!card) return null;
  card.mainHospitalCode = mainHospitalCode || null;
  card.subHospitalCode = subHospitalCode || null;
  card.updatedBy = by;
  card.updatedAt = nowStamp();
  const detail = `หลัก ${mainHospitalCode || '-'} · รอง ${subHospitalCode || '-'}`;
  record.audit = [...record.audit, { id: `ha-${record.audit.length}`, action: 'ระบุรหัสสถานพยาบาล', detail, by, at: card.updatedAt }];
  appendAudit({ action: 'ระบุรหัสสถานพยาบาล', target: `HN ${hn} · ${card.groupTitle}`, detail, by });
  notify();
  return card;
};

let civilApprovalSeq = 4180;

/** §1.7.2.5 — ยืนยันสิทธิข้าราชการ (เบิกจ่ายตรง) / ยกเลิกการยืนยัน. */
export const setCivilConfirmation = (hn, cardId, confirmed, by, reason = '') => {
  const record = getHnRights(hn);
  const card = record.cards.find((c) => c.id === cardId);
  if (!card) return null;
  if (confirmed) {
    civilApprovalSeq += 1;
    card.civilConfirmed = true;
    card.civilApprovalNo = `CGD69-${civilApprovalSeq}`;
    card.civilConfirmedBy = by;
    card.civilConfirmedAt = nowStamp();
  } else {
    card.civilConfirmed = false;
    card.civilApprovalNo = null;
    card.civilConfirmedBy = null;
    card.civilConfirmedAt = null;
  }
  card.updatedBy = by;
  card.updatedAt = nowStamp();
  const action = confirmed ? 'ยืนยันสิทธิเบิกจ่ายตรง (ข้าราชการ)' : 'ยกเลิกการยืนยันสิทธิเบิกจ่ายตรง';
  const detail = confirmed ? `เลขอนุมัติ ${card.civilApprovalNo}` : reason;
  record.audit = [...record.audit, { id: `ha-${record.audit.length}`, action, detail, by, at: card.updatedAt }];
  appendAudit({ action, target: `HN ${hn} · ${card.groupTitle}`, detail, by });
  notify();
  return card;
};

/* ──────────────────────────────────────────────────────────────
   10. §1.7.4.10–.12 — export datasets
   ────────────────────────────────────────────────────────────── */

/* ⚠ แฟ้มและคอลัมน์ด้านล่างเป็น mock ตามโครงสร้างสาธารณะที่เผยแพร่ทั่วไป
   ยังไม่ได้ verify กับผู้เรียกเก็บจริง — ก่อน production ต้องเทียบกับ
   คู่มือโครงสร้างข้อมูลของ สปสช. / กรมบัญชีกลาง / ผู้เรียกเก็บแต่ละราย. */
export const EXPORT_FORMATS = [
  {
    key: 'eclaim16',
    label: '16 แฟ้ม e-Claim (สปสช.)',
    icon: 'folder_zip',
    hint: 'ชุดข้อมูลผู้ป่วยนอก/ใน สำหรับส่งเบิก สปสช.',
    files: [
      { name: 'PAT', title: 'ข้อมูลผู้รับบริการ',          scope: 'visit' },
      { name: 'OPD', title: 'ข้อมูลการรับบริการผู้ป่วยนอก', scope: 'visit' },
      { name: 'ORF', title: 'การส่งต่อผู้ป่วยนอก',          scope: 'referral' },
      { name: 'ODX', title: 'การวินิจฉัยผู้ป่วยนอก',        scope: 'icd10' },
      { name: 'OOP', title: 'หัตถการผู้ป่วยนอก',            scope: 'icd9' },
      { name: 'IPD', title: 'ข้อมูลการรับบริการผู้ป่วยใน',   scope: 'ipd' },
      { name: 'IRF', title: 'การส่งต่อผู้ป่วยใน',           scope: 'ipd' },
      { name: 'IDX', title: 'การวินิจฉัยผู้ป่วยใน',         scope: 'ipd' },
      { name: 'IOP', title: 'หัตถการผู้ป่วยใน',             scope: 'ipd' },
      { name: 'CHT', title: 'สรุปค่ารักษาพยาบาล',           scope: 'visit' },
      { name: 'CHA', title: 'รายละเอียดค่ารักษาพยาบาล',      scope: 'charge' },
      { name: 'AER', title: 'อุบัติเหตุ/ฉุกเฉิน',            scope: 'aeEms' },
      { name: 'DRU', title: 'รายการยา',                     scope: 'medication' },
      { name: 'LVD', title: 'การให้บริการทันตกรรม/หัตถการเสริม', scope: 'icd9' },
      { name: 'INS', title: 'สิทธิการรักษา',                 scope: 'visit' },
      { name: 'ADP', title: 'อุปกรณ์และอวัยวะเทียม',          scope: 'supplies' },
    ],
  },
  {
    key: 'std13',
    label: '13 แฟ้มมาตรฐาน',
    icon: 'dataset',
    hint: 'โครงสร้างแฟ้มมาตรฐานกระทรวงสาธารณสุข',
    files: [
      { name: 'PERSON',      title: 'ข้อมูลบุคคล',            scope: 'visit' },
      { name: 'CARD',        title: 'สิทธิการรักษา',           scope: 'visit' },
      { name: 'SERVICE',     title: 'การมารับบริการ',          scope: 'visit' },
      { name: 'DIAG',        title: 'การวินิจฉัยโรค',          scope: 'icd10' },
      { name: 'PROCED',      title: 'หัตถการ',                 scope: 'icd9' },
      { name: 'DRUG',        title: 'ยาที่จ่าย',               scope: 'medication' },
      { name: 'CHARGE',      title: 'ค่ารักษาพยาบาล',          scope: 'charge' },
      { name: 'ADMISSION',   title: 'การรับไว้รักษา',          scope: 'ipd' },
      { name: 'APPOINTMENT', title: 'การนัดหมาย',              scope: 'ipd' },
      { name: 'CHRONIC',     title: 'โรคเรื้อรัง',             scope: 'chronic' },
      { name: 'SURVEIL',     title: 'การเฝ้าระวังโรค',         scope: 'ipd' },
      { name: 'DEATH',       title: 'การเสียชีวิต',            scope: 'ipd' },
      { name: 'WOMAN',       title: 'อนามัยแม่และเด็ก',        scope: 'anc' },
    ],
  },
  {
    key: 'civilDirect',
    label: 'เบิกจ่ายตรงข้าราชการ (กรมบัญชีกลาง)',
    icon: 'account_balance',
    hint: 'ผู้รับบริการนอก สิทธิสวัสดิการข้าราชการ',
    files: [
      { name: 'CSMBS_HDR', title: 'หัวใบเบิกจ่ายตรง',      scope: 'civil' },
      { name: 'CSMBS_DTL', title: 'รายละเอียดค่ารักษา',      scope: 'civilCharge' },
      { name: 'CSMBS_DRU', title: 'รายการยาเบิกจ่ายตรง',     scope: 'civilMed' },
      { name: 'CSMBS_DX',  title: 'การวินิจฉัยโรค',          scope: 'civilDx' },
    ],
  },
  {
    key: 'payerCustom',
    label: 'รูปแบบอื่นตามผู้เรียกเก็บ',
    icon: 'tune',
    hint: 'ไฟล์แบนราบ 1 แฟ้ม ตามที่ผู้เรียกเก็บกำหนด',
    files: [
      { name: 'BILL_FLAT', title: 'รายการเรียกเก็บแบบแบนราบ', scope: 'charge' },
    ],
  },
];

export const EXPORT_FILE_TYPES = [
  { value: 'csv', label: 'CSV (คั่นด้วยจุลภาค)', ext: 'csv', hint: 'เปิดด้วย Excel ได้ทันที (มี BOM)' },
  { value: 'txt', label: 'TXT (คั่นด้วย |)',      ext: 'txt', hint: 'ตามโครงสร้างผู้เรียกเก็บที่ใช้ pipe-delimited' },
];

export const exportFormatByKey = (key) => EXPORT_FORMATS.find((f) => f.key === key) || null;

/** How many records a given file scope yields for a set of visits. */
export const countExportRecords = (file, visits) => {
  switch (file.scope) {
    case 'visit':      return visits.length;
    case 'icd10':      return visits.reduce((s, v) => s + v.icd10.length, 0);
    case 'icd9':       return visits.reduce((s, v) => s + v.icd9.length, 0);
    case 'charge':     return visits.reduce((s, v) => s + v.charges.length, 0);
    case 'medication': return visits.reduce((s, v) => s + v.charges.filter((c) => c.category === 'medication').length, 0);
    case 'supplies':   return visits.reduce((s, v) => s + v.charges.filter((c) => c.category === 'supplies').length, 0);
    case 'aeEms':      return visits.filter((v) => v.visitKind !== 'normal').length;
    case 'chronic':    return visits.filter((v) => v.icd10.some((d) => d.diagType === 'comorbidity')).length;
    case 'anc':        return visits.filter((v) => v.clinicKey === 'anc').length;
    case 'referral':   return 0;
    case 'ipd':        return 0; // ศูนย์บริการสาธารณสุขไม่มีผู้ป่วยใน — แฟ้มว่างตามจริง
    case 'civil':      return visits.filter((v) => rightsById(v.billingRightsId)?.requiresCivilConfirm).length;
    case 'civilCharge':return visits.filter((v) => rightsById(v.billingRightsId)?.requiresCivilConfirm).reduce((s, v) => s + v.charges.length, 0);
    case 'civilMed':   return visits.filter((v) => rightsById(v.billingRightsId)?.requiresCivilConfirm).reduce((s, v) => s + v.charges.filter((c) => c.category === 'medication').length, 0);
    case 'civilDx':    return visits.filter((v) => rightsById(v.billingRightsId)?.requiresCivilConfirm).reduce((s, v) => s + v.icd10.length, 0);
    default:           return 0;
  }
};

/** Rows for one export file — [header[], ...body[]]. */
export const buildExportRows = (file, visits) => {
  const civilOnly = file.scope.startsWith('civil');
  const scoped = civilOnly
    ? visits.filter((v) => rightsById(v.billingRightsId)?.requiresCivilConfirm)
    : visits;

  const visitHeader = ['HOSPCODE', 'VN', 'HN', 'NAME', 'CID', 'DATE_SERV', 'CLINIC', 'DOCTOR', 'INSTYPE', 'MAIN_HOSP', 'SUB_HOSP', 'VISIT_KIND', 'CHARGE_TOTAL', 'CLAIM_TOTAL', 'CASH_TOTAL'];
  const visitRow = (v) => {
    const t = computeVisitClaim(v);
    const card = (getHnRights(v.hn).cards || [])[0] || {};
    return [
      HOSPITAL_CODES[0].code,
      v.visitNo,
      v.hn,
      v.patient.fullName,
      /* Export files carry the real CID by contract with the payer, so this
         is the one place the full number leaves the system (§1.4.2 masking
         is a *display* rule, not a payload rule). */
      v.patient.nationalId,
      v.visitDate,
      clinicLabelOf(v),
      v.doctor,
      t.rights?.code || 'CASH',
      card.mainHospitalCode || '',
      card.subHospitalCode || '',
      visitKindMeta(v.visitKind).short,
      t.totalCharge,
      t.claimTotal,
      t.cashTotal,
    ];
  };

  switch (file.scope) {
    case 'visit':
    case 'civil':
      return [visitHeader, ...scoped.map(visitRow)];
    case 'icd10':
    case 'civilDx':
      return [
        ['HOSPCODE', 'VN', 'HN', 'DATE_SERV', 'DIAGTYPE', 'DIAGCODE', 'DIAGNAME', 'DR_DIAG'],
        ...scoped.flatMap((v) => v.icd10.map((d) => [
          HOSPITAL_CODES[0].code, v.visitNo, v.hn, v.visitDate, diagTypeCode(d.diagType), d.code, d.term, d.doctor,
        ])),
      ];
    case 'icd9':
      return [
        ['HOSPCODE', 'VN', 'HN', 'DATE_SERV', 'PROCEDCODE', 'PROCEDNAME', 'STATUS', 'PERFORMER'],
        ...scoped.flatMap((v) => v.icd9.map((p) => [
          HOSPITAL_CODES[0].code, v.visitNo, v.hn, v.visitDate, p.code, p.term, procedureStatusLabel(p.status), p.performer,
        ])),
      ];
    case 'charge':
    case 'civilCharge':
      return [
        ['HOSPCODE', 'VN', 'HN', 'DATE_SERV', 'CHRGITEM', 'CHRGNAME', 'QTY', 'UNITPRICE', 'AMOUNT', 'PAYER', 'CLAIM_AMT', 'CASH_AMT'],
        ...scoped.flatMap((v) => computeVisitClaim(v).lines.map((l) => [
          HOSPITAL_CODES[0].code, v.visitNo, v.hn, v.visitDate, l.category,
          l.label, l.qty, l.unitPrice, l.amount, PAYER_KINDS[l.payer].label, l.claimAmount, l.cashAmount,
        ])),
      ];
    case 'medication':
    case 'civilMed':
      return [
        ['HOSPCODE', 'VN', 'HN', 'DATE_SERV', 'DRUGNAME', 'QTY', 'AMOUNT'],
        ...scoped.flatMap((v) => v.charges.filter((c) => c.category === 'medication').map((c) => [
          HOSPITAL_CODES[0].code, v.visitNo, v.hn, v.visitDate, c.label, c.qty, c.amount,
        ])),
      ];
    case 'supplies':
      return [
        ['HOSPCODE', 'VN', 'HN', 'DATE_SERV', 'ITEMNAME', 'QTY', 'AMOUNT'],
        ...scoped.flatMap((v) => v.charges.filter((c) => c.category === 'supplies').map((c) => [
          HOSPITAL_CODES[0].code, v.visitNo, v.hn, v.visitDate, c.label, c.qty, c.amount,
        ])),
      ];
    case 'aeEms':
      return [
        ['HOSPCODE', 'VN', 'HN', 'DATE_SERV', 'AETYPE', 'CAUSE'],
        ...scoped.filter((v) => v.visitKind !== 'normal').map((v) => [
          HOSPITAL_CODES[0].code, v.visitNo, v.hn, v.visitDate, visitKindMeta(v.visitKind).short,
          v.icd10.find((d) => d.diagType === 'externalCause')?.term || '',
        ]),
      ];
    case 'chronic':
      return [
        ['HOSPCODE', 'HN', 'CHRONICCODE', 'CHRONICNAME', 'DATE_DIAG'],
        ...scoped.flatMap((v) => v.icd10.filter((d) => d.diagType === 'comorbidity').map((d) => [
          HOSPITAL_CODES[0].code, v.hn, d.code, d.term, v.visitDate,
        ])),
      ];
    case 'anc':
      return [
        ['HOSPCODE', 'HN', 'DATE_SERV', 'CLINIC', 'DOCTOR'],
        ...scoped.filter((v) => v.clinicKey === 'anc').map((v) => [
          HOSPITAL_CODES[0].code, v.hn, v.visitDate, clinicLabelOf(v), v.doctor,
        ]),
      ];
    default:
      /* IPD / referral files exist in the spec but a ศูนย์บริการสาธารณสุข
         has no inpatient ward — emit the header only, which is what the
         payer expects for an empty file. */
      return [['HOSPCODE', 'VN', 'HN', 'NOTE']];
  }
};

const DIAG_TYPE_CODES = {
  principle: '1', comorbidity: '2', complication: '3', other: '4',
  externalCause: '5', additionalCode: '6', morphologyCode: '7',
};
export const diagTypeCode = (v) => DIAG_TYPE_CODES[v] || '4';

const csvEscape = (value) => {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Serialise rows to CSV or pipe-delimited TXT. */
export const serialiseExport = (rows, fileType) => {
  if (fileType === 'txt') {
    return rows.map((r) => r.map((c) => String(c ?? '').replace(/\|/g, '/')).join('|')).join('\r\n');
  }
  return rows.map((r) => r.map(csvEscape).join(',')).join('\r\n');
};

/** Approximate byte size so the preview can show a size without building
    the whole payload for every file on every render. */
export const approxSize = (rows) => {
  if (!rows.length) return 0;
  const sample = rows.slice(0, Math.min(rows.length, 5));
  const avg = sample.reduce((s, r) => s + r.join(',').length + 2, 0) / sample.length;
  return Math.round(avg * rows.length);
};

export const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} KB`;
  return `${Math.round(bytes / 104857.6) / 10} MB`;
};

/** BOM so Thai text opens correctly in Excel (same reason as
    finance/sections/EclaimSection.jsx — implemented here on purpose so
    /rights never imports from /finance). */
export const downloadTextFile = (filename, text) => {
  const blob = new Blob([`﻿${text}`], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const EXPORT_HISTORY = [
  { id: 'ex-3', formatKey: 'eclaim16',    fileType: 'csv', from: thaiDate(daysAgo(37)), to: thaiDate(daysAgo(8)),  files: 16, records: 412, by: SEED_BY, at: `${thaiDate(daysAgo(6))} · 16:24 น.` },
  { id: 'ex-2', formatKey: 'civilDirect', fileType: 'txt', from: thaiDate(daysAgo(37)), to: thaiDate(daysAgo(8)),  files: 4,  records: 58,  by: SEED_BY, at: `${thaiDate(daysAgo(6))} · 16:31 น.` },
  { id: 'ex-1', formatKey: 'std13',       fileType: 'csv', from: thaiDate(daysAgo(68)), to: thaiDate(daysAgo(38)), files: 13, records: 388, by: 'นายภาคิน ธุรการ', at: `${thaiDate(daysAgo(35))} · 10:02 น.` },
];

let exportSeq = EXPORT_HISTORY.length;

export const appendExportHistory = (entry, by) => {
  exportSeq += 1;
  const row = { id: `ex-new-${exportSeq}`, ...entry, by, at: nowStamp() };
  EXPORT_HISTORY.unshift(row);
  appendAudit({ action: 'ดึงข้อมูลส่งเบิก (Export)', target: exportFormatByKey(entry.formatKey)?.label || entry.formatKey, detail: `${entry.from} – ${entry.to} · ${entry.records} record`, by });
  notify();
  return row;
};

/* ──────────────────────────────────────────────────────────────
   11. Module-wide audit trail
   ────────────────────────────────────────────────────────────── */

export const CLAIM_AUDIT = [];
let auditSeq = 0;

export function appendAudit({ action, target, detail = '', by }) {
  auditSeq += 1;
  CLAIM_AUDIT.unshift({ id: `au-${auditSeq}`, action, target, detail, by, at: nowStamp() });
  return CLAIM_AUDIT[0];
}

/* ──────────────────────────────────────────────────────────────
   12. Date-range filtering
   ────────────────────────────────────────────────────────────── */

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/** Inclusive Thai-Buddhist-string range test used by the export + queue. */
export const withinThaiRange = (thaiDateStr, fromStr, toStr) => {
  const date = parseThaiBuddhistDate(thaiDateStr);
  if (!date) return true;
  const from = parseThaiBuddhistDate(fromStr);
  const to = parseThaiBuddhistDate(toStr);
  if (from && date.getTime() < startOfDay(from).getTime()) return false;
  if (to && date.getTime() > startOfDay(to).getTime()) return false;
  return true;
};

export const rangeIsInverted = (fromStr, toStr) => {
  const from = parseThaiBuddhistDate(fromStr);
  const to = parseThaiBuddhistDate(toStr);
  if (!from || !to) return false;
  return from.getTime() > to.getTime();
};

export { parseThaiBuddhistDate, formatThaiBuddhistDate };
