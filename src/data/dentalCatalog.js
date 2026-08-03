/* Dental catalog — งานทันตกรรม (TOR §1.10.1) reference data.

   Grounded in the legacy HCIS manual (~/MIH-Docs-Vault/คู่มือระบบงาน/
   คู่มือระบบทันตกรรม.pdf บทที่ 2): the บันทึกการทำหัตถการ grid records
   ICD9 procedure code + ตำแหน่งฟัน + จำนวน + ราคา/หน่วย + เบิกได้/เบิกไม่ได้,
   and the Post Diagnosis tables use ICD10. Follows labCatalog.js's
   precedent for standard-code fields (`tmlt`/`loinc` there → `icd9` /
   `icd10tm` / `snomed` here): the codes are the real published ICD-10-TM /
   ICD-9-CM dental ranges; the SNOMED-CT subset carries the canonical
   concept ids for the common dental findings. Mock-data tier — no backend,
   same as labCatalog.js. */

/* ─── ฟัน (FDI two-digit notation) ─────────────────────────────────────
   Permanent dentition 11–48, primary (น้ำนม) 51–85. Row arrays run
   patient-right → patient-left exactly like a paper odontogram, so the
   chart component can render them in order without re-sorting. */
export const PERMANENT_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const PERMANENT_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
export const PRIMARY_UPPER = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
export const PRIMARY_LOWER = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

export const DENTITION_OPTIONS = [
  { key: 'permanent', label: 'ฟันแท้ (11–48)' },
  { key: 'primary', label: 'ฟันน้ำนม (51–85)' },
];

export const TEETH_BY_DENTITION = {
  permanent: { upper: PERMANENT_UPPER, lower: PERMANENT_LOWER },
  primary: { upper: PRIMARY_UPPER, lower: PRIMARY_LOWER },
};

/* Tooth position within its quadrant (1 = central incisor … 8 = third
   molar) — drives the mini tooth-glyph shape (incisor/canine/premolar/
   molar) in DentalChartPanel. */
export const toothPositionOf = (toothId) => Number(String(toothId).slice(-1));
export const toothTypeOf = (toothId) => {
  const pos = toothPositionOf(toothId);
  if (pos <= 2) return 'incisor';
  if (pos === 3) return 'canine';
  if (pos <= 5) return 'premolar';
  return 'molar';
};

/* ─── ด้านของฟัน (tooth surfaces) ──────────────────────────────────────
   5 ด้านมาตรฐานตามใบบันทึกทันตกรรม: Mesial / Distal / Occlusal(บดเคี้ยว)
   หรือ Incisal(ปลายตัด) / Buccal(แก้ม) หรือ Labial(ริมฝีปาก) /
   Lingual(ลิ้น) หรือ Palatal(เพดาน). */
export const DENTAL_SURFACES = [
  { key: 'M', label: 'Mesial', thai: 'ด้านใกล้กลาง (M)' },
  { key: 'D', label: 'Distal', thai: 'ด้านไกลกลาง (D)' },
  { key: 'O', label: 'Occlusal / Incisal', thai: 'ด้านบดเคี้ยว / ปลายตัด (O/I)' },
  { key: 'B', label: 'Buccal / Labial', thai: 'ด้านแก้ม / ริมฝีปาก (B/La)' },
  { key: 'L', label: 'Lingual / Palatal', thai: 'ด้านลิ้น / เพดาน (Li/P)' },
];
export const SURFACE_KEYS = DENTAL_SURFACES.map((s) => s.key);
export const surfaceLabelOf = (key) => DENTAL_SURFACES.find((s) => s.key === key)?.thai || key;

/* ─── วัสดุทันตกรรม (per-marking material) ────────────────────────────── */
export const DENTAL_MATERIALS = [
  { value: 'amalgam', label: 'Amalgam (อมัลกัม)' },
  { value: 'composite', label: 'Composite resin (คอมโพสิต)' },
  { value: 'gi', label: 'Glass ionomer cement (GI)' },
  { value: 'fluoride', label: 'Fluoride varnish (ฟลูออไรด์วานิช)' },
  { value: 'sealant', label: 'Resin sealant (เคลือบหลุมร่องฟัน)' },
  { value: 'temp', label: 'Temporary filling (อุดชั่วคราว)' },
  { value: 'ssc', label: 'Stainless steel crown (ครอบฟันโลหะ)' },
  { value: 'none', label: 'ไม่ใช้วัสดุ (ตรวจ/บันทึกรอยโรค)' },
];
export const dentalMaterialLabelOf = (value) =>
  DENTAL_MATERIALS.find((m) => m.value === value)?.label || value || '—';

/* ─── การวินิจฉัยทันตกรรม (ICD-10-TM + SNOMED-CT subset) ──────────────
   The K00–K08 oral-disease block the legacy Post Diagnosis / Complication
   tables use, each paired with its SNOMED-CT concept id (spec 1.10.1:
   "SNOMED-CT code column from dentalCatalog mock"). */
export const DENTAL_DIAGNOSES = [
  { code: 'K02.1', name: 'ฟันผุลุกลามถึงเนื้อฟัน (Caries of dentine)', snomed: '80967001' },
  { code: 'K02.5', name: 'ฟันผุที่ด้านบดเคี้ยว (Caries with pulp exposure)', snomed: '109564008' },
  { code: 'K04.0', name: 'เนื้อเยื่อในโพรงฟันอักเสบ (Pulpitis)', snomed: '32620007' },
  { code: 'K04.5', name: 'เนื้อเยื่อรอบปลายรากอักเสบเรื้อรัง (Chronic apical periodontitis)', snomed: '109600000' },
  { code: 'K04.7', name: 'ฝีปลายรากฟัน (Periapical abscess without sinus)', snomed: '109614006' },
  { code: 'K05.0', name: 'เหงือกอักเสบเฉียบพลัน (Acute gingivitis)', snomed: '66383009' },
  { code: 'K05.1', name: 'เหงือกอักเสบเรื้อรัง (Chronic gingivitis)', snomed: '2919008' },
  { code: 'K05.3', name: 'ปริทันต์อักเสบเรื้อรัง (Chronic periodontitis)', snomed: '234972001' },
  { code: 'K01.1', name: 'ฟันคุด (Impacted teeth)', snomed: '39402007' },
  { code: 'K08.3', name: 'รากฟันค้าง (Retained dental root)', snomed: '110343009' },
  { code: 'K03.6', name: 'คราบหินน้ำลายเกาะฟัน (Deposits on teeth)', snomed: '710751000' },
  { code: 'K12.0', name: 'แผลร้อนในช่องปาก (Recurrent oral aphthae)', snomed: '426965005' },
  { code: 'S02.5', name: 'ฟันหัก (Fracture of tooth)', snomed: '36202009' },
  { code: 'K00.6', name: 'ความผิดปกติของการขึ้นของฟัน (Disturbances in tooth eruption)', snomed: '278663005' },
];

export const DENTAL_SNOMED_BY_ICD = Object.fromEntries(
  DENTAL_DIAGNOSES.map((d) => [d.code, d.snomed]),
);

/* Capsule-row shortcut subset — the diagnoses a ศบส. dental clinic keys
   most often (mirrors DEFAULT_ICD_SUGGESTIONS's role for OPD). */
export const DENTAL_ICD_SUGGESTIONS = DENTAL_DIAGNOSES.slice(0, 8);

/* ─── หัตถการทันตกรรม (ICD-9-CM + ICD-10-TM procedure codes + ราคา) ────
   Grid columns per legacy p.2-7/2-8: รหัส ICD9 + ชื่อหัตถการ + ตำแหน่งฟัน +
   จำนวน + ราคา/หน่วย + เบิกได้/เบิกไม่ได้. `icd10tm` rides along the same
   way `loinc` rides along `tmlt` in labCatalog.js.
     • toothSpecific — row must reference ≥1 marked tooth from the chart
     • coverage      — สิทธิที่เบิกได้ (keys match PATIENT_PROFILES
                       insurance strings via DENTAL_RIGHT_KEYS below)
     • suggestFor    — ICD10 codes whose diagnosis suggests this
                       procedure (drives the แนะนำหัตถการ capsules) */
export const DENTAL_PROCEDURES = [
  {
    id: 'filling-amalgam', icd9: '23.2', icd10tm: '387-30-11',
    name: 'อุดฟันด้วยอมัลกัม (ต่อด้าน)', unit: 'ด้าน', price: 400,
    toothSpecific: true, coverage: ['uc', 'sso', 'csmbs', 'lgo'],
    suggestFor: ['K02.1', 'K02.5'],
  },
  {
    id: 'filling-composite', icd9: '23.2', icd10tm: '387-30-12',
    name: 'อุดฟันด้วยคอมโพสิต (ต่อด้าน)', unit: 'ด้าน', price: 500,
    toothSpecific: true, coverage: ['uc', 'sso', 'csmbs', 'lgo'],
    suggestFor: ['K02.1', 'K02.5', 'S02.5'],
  },
  {
    id: 'extract-permanent', icd9: '23.09', icd10tm: '387-42-00',
    name: 'ถอนฟันแท้', unit: 'ซี่', price: 500,
    toothSpecific: true, coverage: ['uc', 'sso', 'csmbs', 'lgo'],
    suggestFor: ['K04.7', 'K08.3', 'K04.5'],
  },
  {
    id: 'extract-primary', icd9: '23.01', icd10tm: '387-41-00',
    name: 'ถอนฟันน้ำนม', unit: 'ซี่', price: 300,
    toothSpecific: true, coverage: ['uc', 'sso', 'csmbs', 'lgo'],
    suggestFor: ['K00.6'],
  },
  {
    id: 'surgical-removal', icd9: '23.19', icd10tm: '387-43-20',
    name: 'ผ่าฟันคุด (Surgical removal)', unit: 'ซี่', price: 1500,
    toothSpecific: true, coverage: ['uc', 'csmbs'],
    suggestFor: ['K01.1'],
  },
  {
    id: 'scaling', icd9: '96.54', icd10tm: '387-76-00',
    name: 'ขูดหินน้ำลายทั้งปาก (Full-mouth scaling)', unit: 'ครั้ง', price: 600,
    toothSpecific: false, coverage: ['uc', 'sso', 'csmbs', 'lgo'],
    suggestFor: ['K03.6', 'K05.0', 'K05.1', 'K05.3'],
  },
  {
    id: 'sealant', icd9: '23.9', icd10tm: '387-77-30',
    name: 'เคลือบหลุมร่องฟัน (Sealant)', unit: 'ซี่', price: 250,
    toothSpecific: true, coverage: ['uc'],
    suggestFor: ['K02.1'],
  },
  {
    id: 'fluoride', icd9: '23.9', icd10tm: '387-77-20',
    name: 'เคลือบฟลูออไรด์ทั้งปาก', unit: 'ครั้ง', price: 200,
    toothSpecific: false, coverage: ['uc'],
    suggestFor: ['K02.1', 'K00.6'],
  },
  {
    id: 'pulp-treatment', icd9: '23.70', icd10tm: '387-52-00',
    name: 'รักษาคลองรากฟันฟันหน้า (RCT anterior)', unit: 'ซี่', price: 2500,
    toothSpecific: true, coverage: ['csmbs'],
    suggestFor: ['K04.0', 'K04.5', 'K04.7'],
  },
  {
    id: 'xray-periapical', icd9: '87.12', icd10tm: '387-91-10',
    name: 'ถ่ายภาพรังสีรอบปลายราก (Periapical film)', unit: 'ฟิล์ม', price: 150,
    toothSpecific: true, coverage: ['uc', 'sso', 'csmbs', 'lgo'],
    suggestFor: ['K04.0', 'K04.5', 'K04.7', 'K01.1', 'K08.3'],
  },
  {
    id: 'temp-filling', icd9: '23.2', icd10tm: '387-30-90',
    name: 'อุดฟันชั่วคราว (Temporary filling)', unit: 'ซี่', price: 200,
    toothSpecific: true, coverage: ['uc', 'sso', 'csmbs', 'lgo'],
    suggestFor: ['K02.5', 'K04.0'],
  },
];

export const findDentalProcedure = (id) => DENTAL_PROCEDURES.find((p) => p.id === id) || null;

/* หัตถการที่ไม่ผูกกับซี่ฟัน — Step 2's "การให้บริการอื่น ๆ" picker. */
export const DENTAL_OTHER_SERVICES = DENTAL_PROCEDURES.filter((p) => !p.toothSpecific);

/* Insurance string (PATIENT_PROFILES / mrPatients display values) → right
   key used by `coverage`. Anything unmatched (ชำระเงินเอง ฯลฯ) maps to
   `self` — เบิกไม่ได้ but the record still saves (edge case: ชำระเงินเอง
   path per spec). */
export const resolveDentalRightKey = (insuranceText = '') => {
  const t = String(insuranceText);
  if (t.includes('หลักประกันสุขภาพ') || t.includes('บัตรทอง') || t.includes('30 บาท')) return 'uc';
  if (t.includes('ประกันสังคม')) return 'sso';
  if (t.includes('ข้าราชการ') || t.includes('กรมบัญชีกลาง')) return 'csmbs';
  if (t.includes('อปท')) return 'lgo';
  return 'self';
};

export const isProcedureReimbursable = (procedure, rightKey) =>
  !!procedure && rightKey !== 'self' && procedure.coverage.includes(rightKey);

/* แนะนำหัตถการจากการวินิจฉัยที่เลือกไว้ (Step 3 capsules). */
export const suggestProceduresForDiagnoses = (diagnoses = []) => {
  const codes = new Set(diagnoses.map((d) => d.code));
  return DENTAL_PROCEDURES.filter((p) => p.suggestFor.some((c) => codes.has(c)));
};

/* ─── วัสดุสิ้นเปลือง (บันทึกการใช้วัสดุ — legacy 2-8 lower grid) ────── */
export const DENTAL_CONSUMABLES = [
  { id: 'anesthetic', name: 'ยาชา Mepivacaine 2% (1.8 ml)', unit: 'หลอด', lot: 'MP-680214' },
  { id: 'needle', name: 'เข็มฉีดยาทันตกรรม 27G Long', unit: 'อัน', lot: 'ND-680101' },
  { id: 'composite-a2', name: 'Composite resin เบอร์สี A2', unit: 'หลอด', lot: 'CR-680305' },
  { id: 'gi-capsule', name: 'Glass ionomer แคปซูล', unit: 'แคปซูล', lot: 'GI-671120' },
  { id: 'gauze', name: 'ผ้าก๊อซปลอดเชื้อ 2×2 นิ้ว', unit: 'ชิ้น', lot: 'GZ-680418' },
  { id: 'suture', name: 'ไหมเย็บแผล Silk 3-0', unit: 'ชุด', lot: 'SK-671230' },
  { id: 'fluoride-varnish', name: 'ฟลูออไรด์วานิช 5%', unit: 'โดส', lot: 'FV-680309' },
  { id: 'prophy-paste', name: 'Prophylaxis paste', unit: 'กระปุก', lot: 'PP-680122' },
];

export const findDentalConsumable = (id) => DENTAL_CONSUMABLES.find((c) => c.id === id) || null;
