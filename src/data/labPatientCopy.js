/* Plain-Thai explanations of each lab value, written for the patient.

   Kept out of labCatalog.js deliberately: that file is the clinical registry
   the lab maintains, and its vocabulary is the bench's. This one is the
   patient's vocabulary, and the two should be editable by different people
   without touching each other.

   Rules the copy follows:
     • Say what the value IS, in a sentence a non-clinician finishes.
     • Never state a threshold — the report already shows the range, and a
       number repeated in prose invites the reader to self-diagnose.
     • Never advise. "ควรลดของหวาน" belongs to the doctor who saw the
       patient, not to a printed sheet.
     • No abbreviations the patient has not just read on the line above. */

export const ANALYTE_COPY = {
  /* CBC */
  hb:  'โปรตีนในเม็ดเลือดแดงที่พาออกซิเจนไปเลี้ยงร่างกาย',
  hct: 'สัดส่วนของเม็ดเลือดแดงเทียบกับเลือดทั้งหมด',
  wbc: 'เม็ดเลือดขาว ทำหน้าที่ต่อสู้กับเชื้อโรค',
  plt: 'เกล็ดเลือด ช่วยให้เลือดหยุดไหลเมื่อมีบาดแผล',

  /* Chemistry */
  fbs:   'ระดับน้ำตาลในเลือดหลังอดอาหาร',
  hba1c: 'ค่าเฉลี่ยน้ำตาลในเลือดย้อนหลังประมาณ 3 เดือน',
  chol:  'ไขมันรวมในเลือด',
  tg:    'ไขมันไตรกลีเซอไรด์ในเลือด',
  hdl:   'ไขมันชนิดที่ช่วยปกป้องหลอดเลือด',
  ldl:   'ไขมันชนิดที่เกาะผนังหลอดเลือด',
  cr:    'ของเสียที่ไตกรองออกจากเลือด ใช้ดูการทำงานของไต',
  egfr:  'อัตราการกรองของไต คำนวณจากค่าครีอะตินิน อายุ และเพศ',
  na:    'เกลือแร่ที่ควบคุมสมดุลน้ำในร่างกาย',
  k:     'เกลือแร่ที่มีผลต่อจังหวะการเต้นของหัวใจ',
  cl:    'เกลือแร่ที่ทำงานคู่กับโซเดียม',
  co2:   'ค่าที่บอกความเป็นกรด-ด่างของเลือด',

  /* Urinalysis */
  glucose:  'น้ำตาลในปัสสาวะ',
  protein:  'โปรตีนในปัสสาวะ',
  rbc:      'เม็ดเลือดแดงที่ปนมาในปัสสาวะ',
  sediment: 'ตะกอนที่พบเมื่อส่องปัสสาวะด้วยกล้อง',

  /* Serology / blood bank / micro / tox */
  antihiv: 'การตรวจหาภูมิคุ้มกันต่อเชื้อเอชไอวี',
  vdrl:    'การตรวจคัดกรองโรคซิฟิลิส',
  abo:     'หมู่เลือดระบบ ABO ของท่าน',
  rh:      'หมู่เลือดระบบ Rh ของท่าน',
  growth:  'การเพาะเชื้อจากเลือดเพื่อหาการติดเชื้อในกระแสเลือด',
  amphet:  'การตรวจหาสารกลุ่มแอมเฟตามีนในปัสสาวะ',
};

/* Thai name for the value itself, where the clinical label is English-only.
   The report leads with this and keeps the English in parentheses, because
   the patient may need to say the English name to another clinic. */
export const ANALYTE_NAME_TH = {
  hb: 'ฮีโมโกลบิน', hct: 'ฮีมาโทคริต', wbc: 'เม็ดเลือดขาว', plt: 'เกล็ดเลือด',
  fbs: 'น้ำตาลในเลือด', hba1c: 'น้ำตาลสะสม',
  chol: 'คอเลสเตอรอลรวม', tg: 'ไตรกลีเซอไรด์', hdl: 'ไขมันดี (HDL)', ldl: 'ไขมันเลว (LDL)',
  cr: 'ครีอะตินิน', egfr: 'อัตราการกรองของไต',
  na: 'โซเดียม', k: 'โพแทสเซียม', cl: 'คลอไรด์', co2: 'ไบคาร์บอเนต',
  glucose: 'น้ำตาล', protein: 'โปรตีน', rbc: 'เม็ดเลือดแดง', sediment: 'ตะกอน',
  antihiv: 'แอนติบอดีเอชไอวี', vdrl: 'ผลคัดกรองซิฟิลิส',
  abo: 'หมู่เลือด ABO', rh: 'หมู่เลือด Rh',
  growth: 'ผลเพาะเชื้อ', amphet: 'แอมเฟตามีน',
};

/* Verdict wording. The report never says "ผิดปกติ" on its own — a value
   outside a reference range is common and usually not alarming, and a bare
   "ผิดปกติ" on a sheet the patient reads at home without a clinician does
   real harm. It says which direction the value sits, and that the doctor
   reads it in context. */
export const VERDICT = {
  normal:   { label: 'อยู่ในเกณฑ์',        tone: 'in' },
  high:     { label: 'สูงกว่าเกณฑ์',       tone: 'out' },
  low:      { label: 'ต่ำกว่าเกณฑ์',       tone: 'out' },
  critical: { label: 'ต้องพบแพทย์',        tone: 'critical' },
  found:    { label: 'ตรวจพบ',            tone: 'out' },
  notfound: { label: 'ไม่พบ',              tone: 'in' },
  reported: { label: 'รายงานผล',           tone: 'neutral' },
};
