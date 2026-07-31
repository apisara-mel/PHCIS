/* บุคลากรรังสี + Template ผลตรวจ + คำช่วย — the setup-side registry behind
   บันทึกผลการตรวจรังสี (result entry) and ยืนยันผล (verification).

   Grounded in:
     • TOR ภาคผนวก ก §1.12.6 (docs/tor-checklist.html) — template ids cited
       inline; §1.12.6.1 (standard results, bindable per reading doctor),
       §1.12.6.6 (ตัวช่วยข้อความ), §1.12.6.7 (แบบบันทึก Template ตามที่
       สำนักอนามัยกำหนด), §1.12.6.9 (ประเภทผลตรวจ).
     • คู่มือ MyHOSPITAL งานรังสีวิทยา (X-Ray) — setup screens "กำหนด
       ผู้ให้บริการ" / "กำหนดแพทย์อ่านผล X-ray" / "บันทึก Template".
     • คู่มืออบรมระบบงานรังสีวินิจฉัย สำนักอนามัย §2.3 — คำช่วย (items 6–7)
       and ชุดคำช่วย (items 8–9): the look-up phrases the typist inserts
       while keying a dictated report.

   Same tier as labCatalog.js — mock data, no backend. */

/* แพทย์อ่านผล X-ray — the MyHOSPITAL "กำหนดแพทย์อ่านผล X-ray" setup list.
   `modalities` scopes what each doctor reads (a ศบส. has no staff
   radiologist every day — a visiting รังสีแพทย์ reads plain films/US, the
   dentist reads dental films). `license` is the เลขใบประกอบวิชาชีพ printed
   on ใบผลเอกซเรย์ (TOR §1.12.6.5). */
export const XRAY_RADIOLOGISTS = [
  { id: 'rad-somkiat',  name: 'นพ.สมเกียรติ วชิรานุกูล', license: 'ว.24815', modalities: ['xr', 'fl', 'ct', 'mri'] },
  { id: 'rad-pornthip', name: 'พญ.พรทิพย์ ศรีวัฒนา',    license: 'ว.31207', modalities: ['xr', 'us', 'mg', 'bd'] },
  { id: 'rad-anucha',   name: 'นพ.อนุชา ตั้งตรงจิตร',    license: 'ว.28934', modalities: ['xr', 'us'] },
  { id: 'rad-kamolwan', name: 'ทพญ.กมลวรรณ อินทรสุขศรี', license: 'ท.12045', modalities: ['dn'] },
];

export const XRAY_RADIOLOGIST_BY_ID = Object.fromEntries(XRAY_RADIOLOGISTS.map((r) => [r.id, r]));

/* ผู้ให้บริการ (ผู้ถ่าย) — the MyHOSPITAL "กำหนดผู้ให้บริการ" setup list; the
   legacy manual records ผู้ถ่าย/ผู้ล้าง per request (§2.1 item 8.2). One
   นักรังสีการแพทย์ plus เจ้าพนักงานรังสีการแพทย์ is a realistic ศบส. roster. */
export const XRAY_RADIOGRAPHERS = [
  { id: 'tech-somsak',    name: 'นายสมศักดิ์ พูลทรัพย์ (นักรังสีการแพทย์)' },
  { id: 'tech-waraporn',  name: 'นางสาววราภรณ์ ชูใจ (นักรังสีการแพทย์)' },
  { id: 'tech-kittipong', name: 'นายกิตติพงษ์ แสงจันทร์ (เจ้าพนักงานรังสีการแพทย์)' },
  { id: 'tech-saifon',    name: 'นางสายฝน คำมูล (เจ้าพนักงานรังสีการแพทย์)' },
];

export const XRAY_RADIOGRAPHER_BY_ID = Object.fromEntries(XRAY_RADIOGRAPHERS.map((r) => [r.id, r]));

/* ─────────────────────────────────────────────────────────────────────────
   REPORT TEMPLATES — TOR §1.12.6.1 "สร้างผลการตรวจที่เป็นมาตรฐานไว้ล่วงหน้า
   ได้ไม่จำกัด โดยสามารถกำหนดให้สัมพันธ์กับแพทย์อ่านผลแต่ละท่านได้" +
   §1.12.6.7 (Template ตามที่สำนักอนามัยกำหนด).

   `radiologistId: null` = shared template every reader sees; a non-null id
   binds it to that doctor only (each รังสีแพทย์ dictates house style
   differently — that is WHY the TOR allows per-doctor binding).
   `examIds` scopes which exams offer the template in result entry.
   `resultType` pre-fills the §1.12.6.9 classification
   (normal | abnormal | abnormalUrgent | inconclusive — keys defined in
   xrayOrders.js XRAY_RESULT_TYPES).

   The TB templates get extra care: ศบส. run คลินิกวัณโรค, so the CXR read
   for TB is the single most demoed report in this module. */
export const XRAY_TEMPLATES = [
  {
    id: 'tpl-chest-normal',
    name: 'Chest PA — Normal study',
    modality: 'xr',
    examIds: ['xr-cxr-pa', 'xr-cxr-palat', 'xr-cxr-ap'],
    radiologistId: null,
    technique: 'PA upright chest radiograph.',
    findings: 'The lungs are clear without active infiltration or nodule. '
      + 'The cardiothoracic ratio is within normal limits. Both costophrenic angles are sharp. '
      + 'The mediastinum is not widened. The bony thorax and soft tissues are unremarkable.',
    impression: 'Normal chest radiograph. — ไม่พบความผิดปกติของภาพรังสีทรวงอก',
    resultType: 'normal',
  },
  {
    id: 'tpl-chest-cardiomegaly',
    name: 'Chest PA — Cardiomegaly',
    modality: 'xr',
    examIds: ['xr-cxr-pa', 'xr-cxr-palat', 'xr-cxr-ap'],
    radiologistId: null,
    technique: 'PA upright chest radiograph.',
    findings: 'Cardiomegaly with cardiothoracic ratio about 0.58. '
      + 'No pulmonary congestion or pleural effusion at present. The lungs are otherwise clear. '
      + 'The visualized bony thorax is unremarkable.',
    impression: 'Cardiomegaly without radiographic evidence of pulmonary congestion. '
      + 'แนะนำตรวจติดตามร่วมกับการประเมินทางคลินิก (clinical correlation).',
    resultType: 'abnormal',
  },
  {
    id: 'tpl-tb-active',
    name: 'Chest PA — Suspected active pulmonary TB',
    modality: 'xr',
    examIds: ['xr-cxr-pa', 'xr-cxr-palat'],
    radiologistId: null,
    technique: 'PA upright chest radiograph.',
    findings: 'Patchy and reticulonodular infiltration at the right upper lobe with a '
      + 'thick-walled cavitary lesion, about 2.5 cm in diameter. Fibrotic streaks at both apices. '
      + 'No pleural effusion. The heart is not enlarged.',
    impression: 'Suggestive of active pulmonary tuberculosis, right upper lobe with cavitation. '
      + 'แนะนำส่งเสมหะตรวจ AFB smear/culture และขึ้นทะเบียนคลินิกวัณโรค — แจ้งแพทย์ผู้ส่งตรวจโดยด่วน',
    resultType: 'abnormalUrgent',
  },
  {
    id: 'tpl-tb-old',
    name: 'Chest PA — Old (inactive) pulmonary TB',
    modality: 'xr',
    examIds: ['xr-cxr-pa', 'xr-cxr-palat'],
    radiologistId: null,
    technique: 'PA upright chest radiograph. Comparison with prior study is made when available.',
    findings: 'Fibroreticular opacities with calcified nodules at the left upper lobe, '
      + 'unchanged from the prior study. Ipsilateral apical pleural thickening and mild volume loss. '
      + 'No new infiltration or cavitation. The heart size is normal.',
    impression: 'Old (inactive) pulmonary tuberculosis, left upper lobe — no significant interval change. '
      + 'ไม่พบรอยโรคที่บ่งชี้ว่ากำเริบ (no radiographic evidence of reactivation).',
    resultType: 'abnormal',
  },
  {
    id: 'tpl-pneumonia',
    name: 'Chest PA — Pneumonia',
    modality: 'xr',
    examIds: ['xr-cxr-pa', 'xr-cxr-palat', 'xr-cxr-ap'],
    radiologistId: null,
    technique: 'PA upright chest radiograph.',
    findings: 'Patchy alveolar infiltration with air bronchogram at the right lower lobe. '
      + 'No pleural effusion or pneumothorax. The heart size is within normal limits.',
    impression: 'Right lower lobe pneumonia. แนะนำถ่ายภาพรังสีทรวงอกซ้ำหลังรักษาครบ 2 สัปดาห์ '
      + 'เพื่อยืนยันว่ารอยโรคหายไป (follow-up until resolution).',
    resultType: 'abnormal',
  },
  {
    id: 'tpl-kub-normal',
    name: 'Plain KUB — Normal study',
    modality: 'xr',
    examIds: ['xr-kub', 'xr-acute-abd'],
    radiologistId: null,
    technique: 'Supine AP radiograph of the abdomen (KUB).',
    findings: 'Non-specific bowel gas pattern. No radiopaque stone along both KUB regions. '
      + 'No abnormal calcification or mass effect. The psoas shadows are preserved. '
      + 'The visualized bony structures are unremarkable.',
    impression: 'Unremarkable plain KUB study. — ไม่พบนิ่วทึบรังสีในระบบทางเดินปัสสาวะ',
    resultType: 'normal',
  },
  {
    id: 'tpl-renal-stone',
    name: 'Plain KUB — Renal stone',
    modality: 'xr',
    examIds: ['xr-kub', 'xr-acute-abd'],
    radiologistId: null,
    technique: 'Supine AP radiograph of the abdomen (KUB).',
    findings: 'A radiopaque stone, about 8 mm, is seen at the right renal area at the level of L2. '
      + 'No radiopaque stone along the course of both ureters or in the bladder region. '
      + 'Normal bowel gas pattern.',
    impression: 'Right renal stone (ประมาณ 8 มม.). แนะนำอัลตราซาวด์ KUB เพิ่มเติมเพื่อประเมิน hydronephrosis '
      + 'และส่งพบแพทย์เพื่อวางแผนการรักษา',
    resultType: 'abnormal',
  },
  {
    id: 'tpl-ls-spondylosis',
    name: 'LS-spine — Degenerative change (spondylosis)',
    modality: 'xr',
    examIds: ['xr-lsspine', 'xr-lsspine-obl'],
    radiologistId: null,
    technique: 'AP and lateral radiographs of the lumbosacral spine.',
    findings: 'Straightening of the lumbar curvature. Marginal osteophytes at L3–L5 vertebral bodies '
      + 'with disc space narrowing at L4–L5. No compression fracture, spondylolisthesis or lytic lesion. '
      + 'Both sacroiliac joints are unremarkable.',
    impression: 'Lumbar spondylosis with L4–L5 disc space narrowing — กระดูกสันหลังส่วนเอวเสื่อมตามวัย '
      + 'ไม่พบกระดูกหักหรือเคลื่อน',
    resultType: 'abnormal',
  },
  {
    id: 'tpl-us-abd-normal',
    name: 'US upper abdomen — Normal study',
    modality: 'us',
    examIds: ['us-upper-abd', 'us-whole-abd'],
    radiologistId: null,
    technique: 'Real-time ultrasound of the upper abdomen.',
    findings: 'The liver is normal in size and parenchymal echogenicity without focal lesion. '
      + 'The gallbladder is well distended without stone or wall thickening. No intra- or extrahepatic duct dilatation. '
      + 'The pancreas and spleen are unremarkable. Both kidneys are normal in size and echogenicity '
      + 'without stone or hydronephrosis. No ascites.',
    impression: 'Unremarkable ultrasound of the upper abdomen. — ไม่พบความผิดปกติในช่องท้องส่วนบน',
    resultType: 'normal',
  },
  {
    id: 'tpl-fatty-liver',
    name: 'US upper abdomen — Fatty liver',
    modality: 'us',
    examIds: ['us-upper-abd', 'us-whole-abd'],
    radiologistId: null,
    technique: 'Real-time ultrasound of the upper abdomen.',
    findings: 'Diffusely increased parenchymal echogenicity of the liver with posterior beam attenuation, '
      + 'compatible with moderate fatty infiltration. No discrete focal lesion. '
      + 'The gallbladder, pancreas, spleen and both kidneys are unremarkable. No ascites.',
    impression: 'Moderate fatty liver (ภาวะไขมันพอกตับปานกลาง). แนะนำควบคุมอาหาร ออกกำลังกาย '
      + 'และตรวจติดตามการทำงานของตับ',
    resultType: 'abnormal',
  },
  {
    id: 'tpl-gallstones',
    name: 'US upper abdomen — Gallstones',
    modality: 'us',
    examIds: ['us-upper-abd', 'us-whole-abd'],
    radiologistId: null,
    technique: 'Real-time ultrasound of the upper abdomen.',
    findings: 'Multiple echogenic foci with posterior acoustic shadowing in the gallbladder, the largest about 1.2 cm, '
      + 'movable with positional change. The gallbladder wall is not thickened (< 3 mm). No pericholecystic fluid. '
      + 'No intra- or extrahepatic duct dilatation. The liver, pancreas, spleen and both kidneys are unremarkable.',
    impression: 'Multiple gallstones without sonographic evidence of acute cholecystitis. '
      + 'แนะนำส่งต่อศัลยแพทย์เพื่อพิจารณาการรักษา',
    resultType: 'abnormal',
  },
  {
    id: 'tpl-mammo-birads1',
    name: 'Mammogram — BI-RADS 1 (Negative)',
    modality: 'mg',
    examIds: ['mg-bilateral', 'us-breast'],
    /* Mammography reads are bound to พญ.พรทิพย์ — the only reader credentialed
       for the mobile mammography unit (TOR §1.12.6.1 per-doctor binding). */
    radiologistId: 'rad-pornthip',
    technique: 'Digital mammogram of both breasts, CC and MLO views.',
    findings: 'Both breasts show scattered fibroglandular density (ACR type B). '
      + 'No dominant mass, suspicious microcalcification, architectural distortion or skin thickening. '
      + 'Both axillary regions are unremarkable.',
    impression: 'BI-RADS category 1 — Negative. แนะนำตรวจแมมโมแกรมประจำปีตามเกณฑ์คัดกรอง',
    resultType: 'normal',
  },
  {
    id: 'tpl-mammo-birads2',
    name: 'Mammogram — BI-RADS 2 (Benign finding)',
    modality: 'mg',
    examIds: ['mg-bilateral', 'us-breast'],
    radiologistId: 'rad-pornthip',
    technique: 'Digital mammogram of both breasts, CC and MLO views.',
    findings: 'Scattered fibroglandular density of both breasts. A well-circumscribed equal-density nodule '
      + 'with coarse popcorn-like calcification at the upper outer quadrant of the left breast, about 1 cm, '
      + 'compatible with an involuting fibroadenoma. No suspicious mass or microcalcification elsewhere.',
    impression: 'BI-RADS category 2 — Benign finding (calcified fibroadenoma, left breast). '
      + 'แนะนำตรวจแมมโมแกรมประจำปีตามปกติ ไม่ต้องตรวจเพิ่มเติม',
    resultType: 'abnormal',
  },
  {
    id: 'tpl-fracture',
    name: 'Extremity — Fracture',
    modality: 'xr',
    examIds: ['xr-wrist', 'xr-hand', 'xr-elbow', 'xr-shoulder', 'xr-ankle', 'xr-foot', 'xr-hip'],
    radiologistId: null,
    technique: 'AP and lateral radiographs of the injured part.',
    findings: 'A transverse fracture line at the distal radius with dorsal angulation of the distal fragment. '
      + 'No intra-articular extension. The ulnar styloid is intact. Soft tissue swelling is noted. '
      + '(ปรับตำแหน่ง/ลักษณะกระดูกหักตามภาพจริงก่อนบันทึก)',
    impression: 'Fracture of the distal radius (Colles type). ใส่เฝือกชั่วคราวและส่งต่อแพทย์ออร์โธปิดิกส์โดยเร็ว '
      + '— แจ้งผลด่วนถึงแพทย์ผู้ส่งตรวจ',
    resultType: 'abnormalUrgent',
  },
  {
    id: 'tpl-opg-normal',
    name: 'Dental OPG — Normal study',
    modality: 'dn',
    examIds: ['dn-opg'],
    /* Dental films are read by the dentist, not the visiting radiologist. */
    radiologistId: 'rad-kamolwan',
    technique: 'Orthopantomogram (panoramic radiograph).',
    findings: 'Full complement of erupted permanent dentition without impaction. '
      + 'No periapical radiolucency, cyst or jaw lesion. Alveolar bone level is within normal limits. '
      + 'Both temporomandibular joints and maxillary sinuses are grossly unremarkable.',
    impression: 'Unremarkable panoramic radiograph. — ไม่พบพยาธิสภาพของฟันและขากรรไกร',
    resultType: 'normal',
  },
];

export const XRAY_TEMPLATE_BY_ID = Object.fromEntries(XRAY_TEMPLATES.map((t) => [t.id, t]));

/* ─────────────────────────────────────────────────────────────────────────
   คำช่วย — legacy §2.3 items 6–7: while keying a report the typist opens the
   Look-up and inserts these stock phrases; TOR §1.12.6.6 carries the same
   requirement forward ("สร้างตัวช่วยข้อความได้"). `group` drives the tab the
   phrase picker shows them under. */
export const XRAY_PHRASES = [
  { id: 'ph-clear-lungs',     group: 'chest',   text: 'The lungs are clear.' },
  { id: 'ph-normal-heart',    group: 'chest',   text: 'The cardiothoracic ratio is within normal limits.' },
  { id: 'ph-sharp-cp',        group: 'chest',   text: 'Both costophrenic angles are sharp.' },
  { id: 'ph-no-infiltration', group: 'chest',   text: 'No active pulmonary infiltration.' },
  { id: 'ph-no-fracture',     group: 'bone',    text: 'No definite fracture or dislocation is seen.' },
  { id: 'ph-alignment',       group: 'bone',    text: 'Normal alignment with intact bony cortex.' },
  { id: 'ph-soft-tissue',     group: 'bone',    text: 'The soft tissues are unremarkable.' },
  { id: 'ph-liver-normal',    group: 'us',      text: 'The liver is normal in size and parenchymal echogenicity without focal lesion.' },
  { id: 'ph-gb-normal',       group: 'us',      text: 'The gallbladder is well distended without stone or wall thickening.' },
  { id: 'ph-kidneys-normal',  group: 'us',      text: 'Both kidneys are normal in size and echogenicity without stone or hydronephrosis.' },
  { id: 'ph-compare-prior',   group: 'general', text: 'Compared with the prior study, no significant interval change.' },
  { id: 'ph-follow-up',       group: 'general', text: 'แนะนำถ่ายภาพรังสีติดตาม (follow-up) ใน 2 สัปดาห์' },
  { id: 'ph-refer',           group: 'general', text: 'แนะนำส่งต่อแพทย์เฉพาะทางเพื่อการวินิจฉัยเพิ่มเติม' },
  { id: 'ph-clinical-corr',   group: 'general', text: 'Clinical correlation is recommended.' },
];

export const XRAY_PHRASE_BY_ID = Object.fromEntries(XRAY_PHRASES.map((p) => [p.id, p]));

/* ชุดคำช่วย — legacy §2.3 items 8–9: a named bundle inserted in one click
   (the typist's macro for a whole normal paragraph). */
export const XRAY_PHRASE_SETS = [
  { id: 'phs-normal-chest', name: 'ชุดปกติ — ทรวงอก',        phraseIds: ['ph-clear-lungs', 'ph-normal-heart', 'ph-sharp-cp', 'ph-no-infiltration'] },
  { id: 'phs-normal-bone',  name: 'ชุดปกติ — กระดูกและข้อ',   phraseIds: ['ph-no-fracture', 'ph-alignment', 'ph-soft-tissue'] },
  { id: 'phs-normal-usabd', name: 'ชุดปกติ — US ช่องท้อง',    phraseIds: ['ph-liver-normal', 'ph-gb-normal', 'ph-kidneys-normal'] },
  { id: 'phs-follow-up',    name: 'ชุดคำแนะนำติดตามผล',       phraseIds: ['ph-compare-prior', 'ph-follow-up', 'ph-refer', 'ph-clinical-corr'] },
];

/* ─────────────────────────────────────────────────────────────────────────
   TEMPLATE / PHRASE STORE — TOR §1.12.6.1 allows creating templates
   "ไม่จำกัด", so the บันทึก Template screen writes back here. Same
   subscribe/notify pattern as the catalog store; arrays are mutated in
   place so importers keep their reference. */
const listeners = new Set();

export const subscribeTemplates = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const notify = () => listeners.forEach((fn) => fn());

export const upsertTemplate = (template) => {
  const idx = XRAY_TEMPLATES.findIndex((t) => t.id === template.id);
  if (idx >= 0) XRAY_TEMPLATES[idx] = { ...XRAY_TEMPLATES[idx], ...template };
  else XRAY_TEMPLATES.push(template);
  XRAY_TEMPLATE_BY_ID[template.id] = XRAY_TEMPLATES[idx >= 0 ? idx : XRAY_TEMPLATES.length - 1];
  notify();
  return XRAY_TEMPLATE_BY_ID[template.id];
};

/* Templates CAN be hard-deleted (unlike catalog exams) — a template is a
   typing aid, not a billing/medical record, so nothing references it after
   the report text has been copied into the order. */
export const removeTemplate = (id) => {
  const idx = XRAY_TEMPLATES.findIndex((t) => t.id === id);
  if (idx < 0) return false;
  XRAY_TEMPLATES.splice(idx, 1);
  delete XRAY_TEMPLATE_BY_ID[id];
  notify();
  return true;
};

export const upsertPhrase = (phrase) => {
  const idx = XRAY_PHRASES.findIndex((p) => p.id === phrase.id);
  if (idx >= 0) XRAY_PHRASES[idx] = { ...XRAY_PHRASES[idx], ...phrase };
  else XRAY_PHRASES.push(phrase);
  XRAY_PHRASE_BY_ID[phrase.id] = XRAY_PHRASES[idx >= 0 ? idx : XRAY_PHRASES.length - 1];
  notify();
  return XRAY_PHRASE_BY_ID[phrase.id];
};

/* Templates offered for one exam + reader — TOR §1.12.6.1: shared templates
   (radiologistId null) plus the reading doctor's own. Pass a falsy
   radiologistId to get only the shared set. */
export const templatesFor = (examId, radiologistId = null) =>
  XRAY_TEMPLATES.filter((t) =>
    t.examIds.includes(examId)
    && (t.radiologistId == null || t.radiologistId === radiologistId));
