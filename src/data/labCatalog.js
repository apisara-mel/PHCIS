/* Lab test catalog — the registry the Setup page edits and every other lab
   screen reads from (worklist columns, order-entry checkboxes, result entry).

   Grounded in the Kaebrain reference material in the MIH-Docs-Vault Obsidian
   vault (`~/MIH-Docs-Vault/Kaebrain/`), not invented:

     • `Lab dicussion with team.pdf` — the team's own decisions, which take
       precedence over the vendor manual wherever the two differ.
     • `คู่มือการใช้งาน - Lab.pdf` — MyHOSPITAL Lab module manual (the Setup
       screen's field list: รหัสรายการ / ชนิด ITEM-PANEL / กลุ่ม / รหัสมาตรฐาน /
       ราคา / สิ่งส่งตรวจ+สีจุก / ประเภทการรายงานผล).
     • `Links.md` → TMLT Browser (https://tmlt-browser.this.or.th/browser)
       — the open-source Thai Medical Laboratory Terminology database. The
       team stated plainly: "เราใช้รหัส tmlt", so `tmlt` is the canonical code
       on every item and LOINC rides along as a secondary mapping.

   Codes below are the real TMLT/LOINC pairs for these common analytes; the
   catalog is still mock data (no backend), same tier as pharmacyRegistry.js. */

/* กลุ่ม (test group) — exactly the list in the MyHOSPITAL Setup dropdown
   screenshot (IMG_3946): HEMATOLOGY, MICROSCOPY, BIOCHEMISTRY, BLOOD BANK,
   IMMUNOLOGY, MICROBIOLOGY, PATHOLOGY. `thai` is what the worklist and
   order-entry group headers render — the team asked for Thai labels
   alongside the English ones ("ควรมีชื่อไทยกำกับ").

   These supersede the older TOR-derived LAB_CATEGORIES buckets: the TOR
   (ภาคผนวก ก §1.15.4.10) only mandates "อย่างน้อย" 4 disciplines, and every
   one of them maps onto a group here, so the vendor-aligned list satisfies
   the TOR while matching the system the team actually works in. */
export const LAB_GROUPS = [
  { key: 'hematology',   code: 'HEMATOLOGY',   thai: 'โลหิตวิทยา',      short: 'Hema' },
  { key: 'biochemistry', code: 'BIOCHEMISTRY', thai: 'เคมีคลินิก',      short: 'Chem' },
  { key: 'microscopy',   code: 'MICROSCOPY',   thai: 'จุลทรรศนศาสตร์',  short: 'Micro' },
  { key: 'bloodbank',    code: 'BLOOD BANK',   thai: 'ธนาคารเลือด',     short: 'BB' },
  { key: 'immunology',   code: 'IMMUNOLOGY',   thai: 'น้ำเหลืองวิทยา',   short: 'Sero' },
  { key: 'microbiology', code: 'MICROBIOLOGY', thai: 'จุลชีววิทยา',      short: 'Micro-bio' },
  { key: 'pathology',    code: 'PATHOLOGY',    thai: 'พยาธิวิทยา',      short: 'Path' },
  /* สารเสพติด is NOT one of the seven groups on the MyHOSPITAL Setup
     dropdown, but TOR §1.15.4.10 names it explicitly as one of the four
     discipline tabs the order-request view must offer ("โลหิตวิทยา
     น้ำเหลืองวิทยา จุลชีววิทยา และสารเสพติด"). Dropping it into MICROSCOPY —
     which is where a urine drug screen is physically run — satisfied the
     vendor screen but broke the TOR, so it is carried as its own group. */
  { key: 'toxicology',   code: 'TOXICOLOGY',   thai: 'สารเสพติด',       short: 'Tox' },
];

export const LAB_GROUP_LABEL = Object.fromEntries(
  LAB_GROUPS.map((g) => [g.key, `${g.thai} (${g.code})`]),
);

/* สิ่งส่งตรวจ + หลอด (สีจุก) — the team's central rule: "รายกลุ่มตรวจ และ
   สีหลอดจะ relate กัน เป็นมาตรฐาน เช่น ถ้าเลือก Heme สีหลอดจะ auto เปลี่ยนตาม".
   So the tube is a property of the TEST, never typed by hand — order entry
   and the worklist both derive the cap colour from `tubeKey` alone.

   `color` aliases the design-token cap colours (design.md §4 semantic
   surfaces). Fallbacks match the real token values:
     purple-bold #A855F7 · red-bold #EF4444 · grey-bold #858C92
     green-bold  #54CF97 · yellow-bold #EAB308 · blue-bold #3B82F6          */
export const LAB_TUBES = {
  edta: {
    key: 'edta', label: 'EDTA', thai: 'หลอดจุกม่วง (EDTA)', capThai: 'ม่วง',
    color: 'var(--surface-colorfulbadge-purple-bold, #A855F7)',
    volumeMl: 3, additive: 'K2-EDTA', note: 'ห้ามปั่น · กลับหลอด 8–10 ครั้ง',
  },
  clot: {
    key: 'clot', label: 'Clot / SST', thai: 'หลอดจุกแดง (Clot/SST)', capThai: 'แดง',
    color: 'var(--surface-colorfulbadge-red-bold, #EF4444)',
    volumeMl: 5, additive: 'Clot activator + gel', note: 'ตั้งทิ้ง 30 นาทีก่อนปั่น',
  },
  fluoride: {
    key: 'fluoride', label: 'Fluoride', thai: 'หลอดจุกเทา (Fluoride)', capThai: 'เทา',
    color: 'var(--surface-colorfulbadge-grey-bold, #858C92)',
    volumeMl: 2, additive: 'NaF / K-oxalate', note: 'ยับยั้ง glycolysis — ใช้กับน้ำตาล',
  },
  lihep: {
    key: 'lihep', label: 'Li-Hep', thai: 'หลอดจุกเขียว (Li-Heparin)', capThai: 'เขียว',
    color: 'var(--surface-colorfulbadge-green-bold, #54CF97)',
    volumeMl: 4, additive: 'Lithium heparin', note: 'ปั่นแยกพลาสมาภายใน 1 ชม.',
  },
  urinecup: {
    key: 'urinecup', label: 'Urine cup', thai: 'ถ้วยเก็บปัสสาวะ', capThai: 'เหลือง',
    color: 'var(--surface-colorfulbadge-yellow-bold, #EAB308)',
    volumeMl: 10, additive: '—', note: 'เก็บปัสสาวะช่วงกลาง (midstream)',
  },
  culture: {
    key: 'culture', label: 'Culture bottle', thai: 'ขวดเพาะเชื้อ', capThai: 'น้ำเงิน',
    color: 'var(--surface-colorfulbadge-blue-bold, #3B82F6)',
    volumeMl: 10, additive: 'Broth medium', note: 'เช็ดจุกด้วยแอลกอฮอล์ก่อนฉีด',
  },
};

export const LAB_TUBE_LIST = Object.values(LAB_TUBES);

/* ประเภทการรายงานผล — the radio group in the MyHOSPITAL Setup form
   (IMG_3947/3948): จำนวน (ค่าปกติเป็นช่วง 2 ค่า) · ข้อความ · กำหนดเอง
   (an editable Negative / Trace / Positive value list). */
export const LAB_RESULT_TYPES = [
  { key: 'numeric', label: 'จำนวน',      hint: 'มีหน่วย + ค่าปกติเป็นช่วง (2 ค่า)' },
  { key: 'text',    label: 'ข้อความ',    hint: 'พิมพ์ผลเป็นข้อความอิสระ' },
  { key: 'enum',    label: 'กำหนดเอง',   hint: 'เลือกจากรายการ เช่น Negative / Trace / Positive' },
];

/* ─────────────────────────────────────────────────────────────────────────
   THE CATALOG

   `type` — 'item' (a single analyte) or 'panel' (a PROFILE that expands to
   several analytes). The team flagged this explicitly as fix #4: the old
   checkbox list mixed the two levels ("Lipid profile และ Electrolytes เป็น
   panel (หลายค่า) แต่ Creatinine เป็น analyte เดี่ยว ควรแยกส่วน") — so a panel
   carries `members` and order entry renders it expandable, never as a peer
   of a single analyte.

   `nameEn` / `nameTh` — fix #5 on naming: the team corrected "Electrolyte"
   → **Electrolytes** and "Urine analysis" → **Urinalysis (UA)**, and asked
   for a Thai name on every row.

   `fastingHours` — drives the order-entry impact summary ("ต้องงดอาหาร 8 ชม.").
   Only set where fasting genuinely changes the result.

   `analytes` — the sub-values a result-entry screen collects, and what a
   panel row expands to. Each carries its own unit + reference range so the
   sex/age-aware resolver can still narrow it per patient.                  */
export const LAB_TESTS = [
  {
    id: 'lab-cbc',
    code: 'L000001',
    type: 'panel',
    nameEn: 'CBC',
    nameFull: 'Complete Blood Count',
    nameTh: 'ความสมบูรณ์ของเม็ดเลือด',
    group: 'hematology',
    tubeKey: 'edta',
    tubeCount: 1,
    fastingHours: 0,
    resultType: 'numeric',
    price: 120,
    costPrice: 78,
    tmlt: '210101',
    loinc: '58410-2',
    icd10tm: '0501201',
    opbkk: '30101',
    /* นับเม็ดเลือดครบส่วน (Hb, Hct, WBC, Plt) — the four the team listed.

       `criticalLow` / `criticalHigh` are PANIC values — TOR §1.15.3.2
       "บันทึกค่าวิกฤต…ของผลตรวจ". Crossing one is not merely abnormal: it
       obliges the lab to telephone the ordering doctor, which is what the
       result-entry screen enforces before a result can be released.
       Thresholds are the commonly used adult panic limits; a real
       deployment tunes them per laboratory. */
    analytes: [
      { key: 'hb',  label: 'Hemoglobin (Hb)',  unit: 'g/dL',    normalRange: '12–17',
        rangeBySex: { male: '13–17', female: '12–15' }, criticalLow: 7, criticalHigh: 20 },
      { key: 'hct', label: 'Hematocrit (Hct)', unit: '%',       normalRange: '36–50',
        rangeBySex: { male: '40–50', female: '36–44' }, criticalLow: 20, criticalHigh: 60 },
      { key: 'wbc', label: 'White Blood Cell (WBC)', unit: '10³/µL', normalRange: '4.0–10.0',
        criticalLow: 1.5, criticalHigh: 30 },
      { key: 'plt', label: 'Platelet (Plt)',  unit: '10³/µL',  normalRange: '150–400',
        criticalLow: 20, criticalHigh: 1000 },
    ],
  },
  {
    id: 'lab-fbs',
    code: 'L000050',
    type: 'item',
    nameEn: 'FBS',
    nameFull: 'Fasting Blood Sugar',
    nameTh: 'น้ำตาลหลังอดอาหาร',
    group: 'biochemistry',
    tubeKey: 'fluoride',
    tubeCount: 1,
    /* The team's own worked example: "เลือก 2 รายการ · เจาะ 2 หลอด · ต้องงด
       อาหาร 8 ชม." — 8 hours is the number that summary must print. */
    fastingHours: 8,
    resultType: 'numeric',
    price: 60,
    costPrice: 32,
    tmlt: '220301',
    loinc: '1558-6',
    icd10tm: '0501101',
    opbkk: '30201',
    analytes: [
      { key: 'fbs', label: 'FBS', unit: 'mg/dL', normalRange: '70–99',
        criticalLow: 50, criticalHigh: 400 },
    ],
  },
  {
    id: 'lab-hba1c',
    code: 'L000009',
    type: 'item',
    nameEn: 'HbA1c',
    nameFull: 'Hemoglobin A1c / Hb.total',
    nameTh: 'น้ำตาลสะสมในเลือด',
    group: 'biochemistry',
    tubeKey: 'edta',
    tubeCount: 1,
    fastingHours: 0,
    resultType: 'numeric',
    /* Codes read straight off the MyHOSPITAL Setup screenshot (IMG_3947):
       รหัส TMLT 220123 · LOINC NUM 4548-4 · รหัส ICD10TM 0531601 ·
       ราคาต้นทุน 150.00 / ราคาขาย 150.00. */
    price: 150,
    costPrice: 150,
    tmlt: '220123',
    loinc: '4548-4',
    icd10tm: '0531601',
    opbkk: '30208',
    analytes: [
      { key: 'hba1c', label: 'HbA1c', unit: '%', normalRange: '< 5.7' },
    ],
  },
  {
    id: 'lab-lipid',
    code: 'L000059',
    type: 'panel',
    nameEn: 'Lipid profile',
    nameFull: 'Lipid Profile',
    nameTh: 'ไขมันในเลือด',
    group: 'biochemistry',
    tubeKey: 'clot',
    tubeCount: 1,
    fastingHours: 12,
    resultType: 'numeric',
    price: 250,
    costPrice: 140,
    tmlt: '220401',
    loinc: '57698-3',
    icd10tm: '0501301',
    opbkk: '30301',
    /* The four values the team spelled out: Chol, TG, HDL, LDL. */
    analytes: [
      { key: 'chol', label: 'Cholesterol (Chol)',   unit: 'mg/dL', normalRange: '< 200' },
      { key: 'tg',   label: 'Triglyceride (TG)',    unit: 'mg/dL', normalRange: '< 150' },
      { key: 'hdl',  label: 'HDL-Cholesterol',      unit: 'mg/dL', normalRange: '> 40',
        rangeBySex: { male: '> 40', female: '> 50' } },
      { key: 'ldl',  label: 'LDL-Cholesterol',      unit: 'mg/dL', normalRange: '< 130' },
    ],
  },
  {
    id: 'lab-creatinine',
    code: 'L000062',
    type: 'item',
    nameEn: 'Creatinine',
    nameFull: 'Creatinine (+ eGFR)',
    nameTh: 'ค่าการทำงานของไต',
    group: 'biochemistry',
    tubeKey: 'clot',
    tubeCount: 1,
    fastingHours: 0,
    resultType: 'numeric',
    price: 90,
    costPrice: 48,
    tmlt: '220501',
    loinc: '2160-0',
    icd10tm: '0501401',
    opbkk: '30401',
    /* "คำนวณ eGFR ได้" — eGFR is derived, so it is an analyte of the same
       single item rather than a separate orderable test. */
    analytes: [
      { key: 'cr',   label: 'Creatinine', unit: 'mg/dL', normalRange: '0.6–1.3',
        rangeBySex: { male: '0.7–1.3', female: '0.6–1.1' }, criticalHigh: 5 },
      { key: 'egfr', label: 'eGFR (คำนวณ)', unit: 'mL/min/1.73m²', normalRange: '≥ 90', derived: true },
    ],
  },
  {
    id: 'lab-electrolytes',
    code: 'L000064',
    type: 'panel',
    /* fix #5 — plural. The team corrected "Electrolyte" → "Electrolytes". */
    nameEn: 'Electrolytes',
    nameFull: 'Serum Electrolytes',
    nameTh: 'เกลือแร่ในเลือด',
    group: 'biochemistry',
    /* "Clot หรือ Li-Hep" — Clot is the default, Li-Hep the documented
       alternative, surfaced on the Setup page as the secondary tube. */
    tubeKey: 'clot',
    altTubeKey: 'lihep',
    tubeCount: 1,
    fastingHours: 0,
    resultType: 'numeric',
    price: 220,
    costPrice: 120,
    tmlt: '220601',
    loinc: '24326-1',
    icd10tm: '0501501',
    opbkk: '30501',
    analytes: [
      { key: 'na',  label: 'Sodium (Na⁺)',      unit: 'mmol/L', normalRange: '135–145', criticalLow: 120, criticalHigh: 160 },
      { key: 'k',   label: 'Potassium (K⁺)',    unit: 'mmol/L', normalRange: '3.5–5.1', criticalLow: 2.5, criticalHigh: 6.0 },
      { key: 'cl',  label: 'Chloride (Cl⁻)',    unit: 'mmol/L', normalRange: '98–107' },
      { key: 'co2', label: 'Bicarbonate (CO₂)', unit: 'mmol/L', normalRange: '22–29' },
    ],
  },
  {
    id: 'lab-ua',
    code: 'L000070',
    type: 'panel',
    /* fix #5 — the name in real use is Urinalysis (UA), not "Urine analysis". */
    nameEn: 'Urinalysis (UA)',
    nameFull: 'Urinalysis',
    nameTh: 'การตรวจปัสสาวะ',
    group: 'microscopy',
    tubeKey: 'urinecup',
    tubeCount: 1,
    fastingHours: 0,
    resultType: 'enum',
    price: 80,
    costPrice: 35,
    tmlt: '230101',
    loinc: '24357-6',
    icd10tm: '0502101',
    opbkk: '30601',
    /* น้ำตาล, โปรตีน, เม็ดเลือด, ตะกอน — the four the team listed. */
    analytes: [
      { key: 'glucose', label: 'Glucose (น้ำตาล)',  unit: '', resultType: 'enum', normalRange: 'Negative', options: ['Negative', 'Trace', 'Positive'] },
      { key: 'protein', label: 'Protein (โปรตีน)',  unit: '', resultType: 'enum', normalRange: 'Negative', options: ['Negative', 'Trace', 'Positive'] },
      { key: 'rbc',     label: 'RBC (เม็ดเลือดแดง)', unit: 'cells/HPF', normalRange: '0–2' },
      { key: 'sediment', label: 'Sediment (ตะกอน)', unit: '', resultType: 'text', normalRange: 'ไม่พบสิ่งผิดปกติ' },
    ],
  },
  {
    id: 'lab-antihiv',
    code: 'L000080',
    type: 'item',
    nameEn: 'Anti-HIV',
    nameFull: 'HIV Antibody Screening',
    nameTh: 'แอนติบอดีเอชไอวี',
    group: 'immunology',
    tubeKey: 'clot',
    tubeCount: 1,
    fastingHours: 0,
    resultType: 'enum',
    price: 350,
    costPrice: 180,
    tmlt: '240101',
    loinc: '75622-1',
    icd10tm: '0503101',
    opbkk: '30701',
    /* TOR §1.15.2.4 "ปกปิดผลการตรวจที่เป็นความลับ" — the confidential flag
       lives on the catalog entry so every screen masks it consistently. */
    confidential: true,
    analytes: [
      { key: 'antihiv', label: 'Anti-HIV', unit: '', resultType: 'enum', normalRange: 'Non-reactive', options: ['Non-reactive', 'Reactive'] },
    ],
  },
  {
    id: 'lab-vdrl',
    code: 'L000081',
    type: 'item',
    nameEn: 'VDRL',
    nameFull: 'Venereal Disease Research Laboratory',
    nameTh: 'คัดกรองซิฟิลิส',
    group: 'immunology',
    tubeKey: 'clot',
    tubeCount: 1,
    fastingHours: 0,
    resultType: 'enum',
    price: 150,
    costPrice: 70,
    tmlt: '240201',
    loinc: '5292-8',
    icd10tm: '0503201',
    opbkk: '30702',
    confidential: true,
    analytes: [
      { key: 'vdrl', label: 'VDRL', unit: '', resultType: 'enum', normalRange: 'Non-reactive', options: ['Non-reactive', 'Reactive'] },
    ],
  },
  {
    id: 'lab-abo',
    code: 'L000090',
    type: 'panel',
    nameEn: 'ABO / Rh',
    nameFull: 'Blood group (ABO- Cell and serum grouping) By Tube method',
    nameTh: 'หมู่เลือด ABO / Rh',
    group: 'bloodbank',
    tubeKey: 'edta',
    tubeCount: 1,
    fastingHours: 0,
    resultType: 'enum',
    price: 200,
    costPrice: 95,
    /* TMLT 220001 / 220004 — read directly off the TMLT Browser listing in
       the team deck: "Blood group (ABO- Cell and serum grouping) By Tube
       method" 220001, "Rh. (D) Typing by Tube method" 220004. */
    tmlt: '220001',
    loinc: '882-1',
    icd10tm: '0504101',
    opbkk: '30801',
    analytes: [
      { key: 'abo', label: 'ABO grouping', unit: '', resultType: 'enum', normalRange: '', options: ['A', 'B', 'AB', 'O'] },
      { key: 'rh',  label: 'Rh (D) Typing', tmlt: '220004', unit: '', resultType: 'enum', normalRange: '', options: ['Positive', 'Negative'] },
    ],
  },
  {
    id: 'lab-hemoculture',
    code: 'L000100',
    type: 'item',
    nameEn: 'Hemoculture',
    nameFull: 'Blood Culture',
    nameTh: 'เพาะเชื้อในเลือด',
    group: 'microbiology',
    tubeKey: 'culture',
    tubeCount: 2,
    fastingHours: 0,
    resultType: 'text',
    price: 600,
    costPrice: 320,
    tmlt: '250101',
    loinc: '600-7',
    icd10tm: '0505101',
    opbkk: '30901',
    /* Turnaround is days, not hours — the worklist's aging/SLA column needs
       this so a 3-day-old culture doesn't read as overdue. */
    turnaroundHours: 72,
    analytes: [
      { key: 'growth', label: 'Culture result', unit: '', resultType: 'text', normalRange: 'No growth' },
    ],
  },
  {
    id: 'lab-urine-drug',
    code: 'L000110',
    type: 'item',
    nameEn: 'Urine Drug Screen',
    nameFull: 'Amphetamine screening in urine',
    nameTh: 'ตรวจสารเสพติดในปัสสาวะ',
    /* TOR §1.15.4.10's สารเสพติด tab — see the note on LAB_GROUPS. */
    group: 'toxicology',
    tubeKey: 'urinecup',
    tubeCount: 1,
    fastingHours: 0,
    resultType: 'enum',
    price: 400,
    costPrice: 210,
    tmlt: '230501',
    loinc: '19270-8',
    icd10tm: '0502501',
    opbkk: '30605',
    analytes: [
      { key: 'amphet', label: 'Amphetamine', unit: '', resultType: 'enum', normalRange: 'Negative', options: ['Negative', 'Positive'] },
    ],
  },
];

export const LAB_TEST_BY_ID = Object.fromEntries(LAB_TESTS.map((t) => [t.id, t]));

/* ─────────────────────────────────────────────────────────────────────────
   CATALOG STORE

   The Setup page (LabSetupPage.jsx) edits this catalog, so it needs a way to
   write back and have the other screens notice. Same subscribe/notify
   pattern as pharmacyRegistry.js's store — deliberately minimal, since
   there is no backend: mutations land in the module-level arrays and
   subscribers re-render.

   `LAB_TESTS` is mutated in place rather than reassigned so that modules
   which captured the array reference at import time (the worklist, the
   order picker) keep seeing the same list. */
const listeners = new Set();

export const subscribeCatalog = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const notify = () => listeners.forEach((fn) => fn());

/* Insert or update one test. Returns the stored object. A new test needs an
   `id`; the Setup page derives one from the รหัสรายการ the user types. */
export const upsertLabTest = (test) => {
  const idx = LAB_TESTS.findIndex((t) => t.id === test.id);
  if (idx >= 0) LAB_TESTS[idx] = { ...LAB_TESTS[idx], ...test };
  else LAB_TESTS.push(test);
  LAB_TEST_BY_ID[test.id] = LAB_TESTS[idx >= 0 ? idx : LAB_TESTS.length - 1];
  notify();
  return LAB_TEST_BY_ID[test.id];
};

/* Retire a test rather than deleting it — a code that has already been used
   on real orders must keep resolving, so the Setup page toggles `retired`
   and the order picker filters it out. */
export const setLabTestRetired = (id, retired) => {
  const test = LAB_TEST_BY_ID[id];
  if (!test) return null;
  test.retired = retired;
  notify();
  return test;
};

/* Convenience lookups the screens lean on constantly. */
export const getTube = (test) => (test ? LAB_TUBES[test.tubeKey] ?? null : null);
export const getGroup = (test) => LAB_GROUPS.find((g) => g.key === test?.group) ?? null;

/* Sex/age-aware reference range — TOR §1.15.3.2 "บันทึกค่าวิกฤตและค่าอ้างอิง
   ของผลตรวจแยกตามเพศ อายุ". Resolves at the ANALYTE level now (the old
   version resolved per whole test, which could not express "Hb differs by
   sex but Plt does not"). `patient.age` is free-text Thai ("42 ปี - 3 เดือน
   - 8 วัน") so only the leading year count is parsed. */
export const resolveAnalyteRange = (analyte, patient) => {
  if (!analyte) return null;
  if (analyte.rangeBySex) {
    const sexKey = patient?.sex === 'ชาย' ? 'male' : 'female';
    if (analyte.rangeBySex[sexKey]) return analyte.rangeBySex[sexKey];
  }
  if (analyte.rangeByAge) {
    const years = parseInt(patient?.age, 10);
    const bracket = analyte.rangeByAge.find((b) => Number.isNaN(years) || years <= b.maxAge);
    if (bracket) return bracket.range;
  }
  return analyte.normalRange;
};

/* ─────────────────────────────────────────────────────────────────────────
   ORDER-ENTRY IMPACT SUMMARY

   Team observation #2: "ไม่บอกผลกระทบของสิ่งที่เลือก — ควรมีสรุปปลายฟอร์ม เช่น
   'เลือก 2 รายการ · เจาะ 2 หลอด (EDTA, Fluoride) · ต้องงดอาหาร 8 ชม.'
   นี่คือจุดที่ช่วยได้มากที่สุด เพราะกันเจาะซ้ำและกันผู้ป่วยมาผิดเงื่อนไข".

   Tubes are deduplicated by tube type — two Chemistry tests that both draw
   a Clot tube share one draw, which is exactly the "กันเจาะซ้ำ" the team
   wants. Fasting takes the MAXIMUM across selected tests (ordering FBS at
   8h together with Lipid at 12h means the patient must fast 12h). */
export const summariseSelection = (testIds = []) => {
  const tests = testIds.map((id) => LAB_TEST_BY_ID[id]).filter(Boolean);

  const tubeMap = new Map();
  tests.forEach((t) => {
    const tube = LAB_TUBES[t.tubeKey];
    if (!tube) return;
    const prev = tubeMap.get(tube.key);
    /* A test needing 2 bottles (hemoculture) wins over one needing 1. */
    tubeMap.set(tube.key, { tube, count: Math.max(prev?.count ?? 0, t.tubeCount ?? 1) });
  });

  const tubes = [...tubeMap.values()];
  const tubeCount = tubes.reduce((sum, t) => sum + t.count, 0);
  const fastingHours = tests.reduce((max, t) => Math.max(max, t.fastingHours ?? 0), 0);

  return {
    tests,
    testCount: tests.length,
    tubes,
    tubeCount,
    fastingHours,
    totalPrice: tests.reduce((sum, t) => sum + (t.price ?? 0), 0),
    /* Total blood/urine volume — "จำนวนหลอด + ปริมาตร" worklist column. */
    volumeMl: tubes.reduce((sum, t) => sum + (t.tube.volumeMl ?? 0) * t.count, 0),
  };
};

/* ─────────────────────────────────────────────────────────────────────────
   DUPLICATE-ORDER WARNING

   Team observation #3: "ยังไม่มีเตือนสั่งซ้ำ — TOR ข้อ 1.15 บังคับเรื่องนี้
   ถ้าเคยตรวจ FBS มา 2 วันก่อน ต้องขึ้นเตือนตรงตัวเลือกนั้นเลย" — note "ตรง
   ตัวเลือกนั้นเลย": the warning belongs inline on the checkbox, not in a
   summary banner, so the form renders it per-option.

   `windowDays` is how recently the same test counts as a repeat. Short for
   stable analytes that rarely move day to day; longer for HbA1c, which
   reflects ~3 months of glycaemia and is genuinely wasteful to repeat. */
const REPEAT_WINDOW_DAYS = {
  'lab-hba1c': 90,
  'lab-lipid': 30,
  'lab-abo': 3650,   /* blood group never changes — always warn */
  default: 7,
};

export const repeatWindowDays = (testId) => REPEAT_WINDOW_DAYS[testId] ?? REPEAT_WINDOW_DAYS.default;

/* `history` — [{ testId, daysAgo, resultSummary }]. Returns the warning for
   a test, or null when the last run is outside the repeat window. */
export const duplicateWarning = (testId, history = []) => {
  const test = LAB_TEST_BY_ID[testId];
  if (!test) return null;
  const window = repeatWindowDays(testId);
  const recent = history
    .filter((h) => h.testId === testId && h.daysAgo <= window)
    .sort((a, b) => a.daysAgo - b.daysAgo)[0];
  if (!recent) return null;
  return {
    daysAgo: recent.daysAgo,
    windowDays: window,
    resultSummary: recent.resultSummary ?? null,
    message: recent.daysAgo === 0
      ? `เคยตรวจ ${test.nameEn} วันนี้แล้ว`
      : `เคยตรวจ ${test.nameEn} เมื่อ ${recent.daysAgo} วันก่อน`,
  };
};
