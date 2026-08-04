/* PHCIS | EMR §1.4.5.2 — รองรับรหัสมาตรฐาน ICD-10 และ SNOMED-CT.

   ⚠ ข้อจำกัดที่ต้องรายงานตามจริง: SNOMED-CT เป็นชุดรหัสที่มีลิขสิทธิ์และ
   ต้องขอ license ผ่าน SNOMED International / สมาชิกระดับประเทศ จึงลง
   concept ฉบับเต็มในโค้ดไม่ได้. ไฟล์นี้เป็น mock ~40 concept ที่เลือกให้
   ตรงกับ ICD-10 ที่ระบบมีอยู่แล้ว (DEFAULT_ICD_SUGGESTIONS) เพื่อพิสูจน์
   flow "ค้น → เลือก → แนบ crosswalk" เท่านั้น — production ต้องต่อกับ
   terminology server จริง. */

export const CODE_SYSTEMS = [
  { key: 'icd10',  label: 'ICD-10',     badge: 'blue'   },
  { key: 'snomed', label: 'SNOMED-CT',  badge: 'purple' },
  { key: 'both',   label: 'ทั้งสองระบบ', badge: 'teal'   },
];

export const codeSystemMeta = (key) =>
  CODE_SYSTEMS.find((s) => s.key === key) || CODE_SYSTEMS[0];

/* concept: { code, term, termTh, icd10 } — icd10 คือ crosswalk */
export const SNOMED_CONCEPTS = [
  { code: '195662009', term: 'Acute viral pharyngitis',              termTh: 'คออักเสบจากไวรัสเฉียบพลัน',        icd10: 'J02.9' },
  { code: '54150009',  term: 'Upper respiratory infection',          termTh: 'การติดเชื้อทางเดินหายใจส่วนบน',    icd10: 'J06.9' },
  { code: '13645005',  term: 'Chronic obstructive lung disease',     termTh: 'โรคปอดอุดกั้นเรื้อรัง (COPD)',      icd10: 'J44.9' },
  { code: '195967001', term: 'Asthma',                               termTh: 'โรคหืด',                          icd10: 'J45.9' },
  { code: '233604007', term: 'Pneumonia',                            termTh: 'ปอดอักเสบ',                        icd10: 'J18.9' },
  { code: '38341003',  term: 'Hypertensive disorder',                termTh: 'ความดันโลหิตสูง',                  icd10: 'I10'   },
  { code: '84114007',  term: 'Heart failure',                        termTh: 'ภาวะหัวใจล้มเหลว',                  icd10: 'I50.9' },
  { code: '49436004',  term: 'Atrial fibrillation',                  termTh: 'หัวใจห้องบนเต้นพลิ้ว',              icd10: 'I48.9' },
  { code: '22298006',  term: 'Myocardial infarction',                termTh: 'กล้ามเนื้อหัวใจตายเฉียบพลัน',       icd10: 'I21.9' },
  { code: '230690007', term: 'Cerebrovascular accident',             termTh: 'โรคหลอดเลือดสมอง',                  icd10: 'I64'   },
  { code: '44054006',  term: 'Diabetes mellitus type 2',             termTh: 'เบาหวานชนิดที่ 2',                  icd10: 'E11.9' },
  { code: '46635009',  term: 'Diabetes mellitus type 1',             termTh: 'เบาหวานชนิดที่ 1',                  icd10: 'E10.9' },
  { code: '55822004',  term: 'Hyperlipidemia',                       termTh: 'ไขมันในเลือดสูง',                   icd10: 'E78.5' },
  { code: '414916001', term: 'Obesity',                              termTh: 'โรคอ้วน',                          icd10: 'E66.9' },
  { code: '40930008',  term: 'Hypothyroidism',                       termTh: 'ภาวะไทรอยด์ทำงานต่ำ',               icd10: 'E03.9' },
  { code: '4556007',   term: 'Gastritis',                            termTh: 'กระเพาะอาหารอักเสบ',                icd10: 'K29.7' },
  { code: '235595009', term: 'Gastroesophageal reflux disease',      termTh: 'กรดไหลย้อน',                       icd10: 'K21.9' },
  { code: '25374005',  term: 'Gastroenteritis',                      termTh: 'กระเพาะอาหารและลำไส้อักเสบ',        icd10: 'K52.9' },
  { code: '197927001', term: 'Recurrent urinary tract infection',    termTh: 'ติดเชื้อทางเดินปัสสาวะเป็นซ้ำ',      icd10: 'N39.0' },
  { code: '709044004', term: 'Chronic kidney disease',               termTh: 'โรคไตเรื้อรัง',                     icd10: 'N18.9' },
  { code: '236423003', term: 'Renal impairment',                     termTh: 'การทำงานของไตบกพร่อง',              icd10: 'N28.9' },
  { code: '396275006', term: 'Osteoarthritis',                       termTh: 'ข้อเสื่อม',                        icd10: 'M19.9' },
  { code: '279039007', term: 'Low back pain',                        termTh: 'ปวดหลังส่วนล่าง',                   icd10: 'M54.5' },
  { code: '69896004',  term: 'Rheumatoid arthritis',                 termTh: 'ข้ออักเสบรูมาตอยด์',                icd10: 'M06.9' },
  { code: '25064002',  term: 'Headache',                             termTh: 'ปวดศีรษะ',                         icd10: 'R51'   },
  { code: '37796009',  term: 'Migraine',                             termTh: 'ไมเกรน',                           icd10: 'G43.9' },
  { code: '84757009',  term: 'Epilepsy',                             termTh: 'โรคลมชัก',                         icd10: 'G40.9' },
  { code: '35489007',  term: 'Depressive disorder',                  termTh: 'โรคซึมเศร้า',                       icd10: 'F32.9' },
  { code: '197480006', term: 'Anxiety disorder',                     termTh: 'โรควิตกกังวล',                      icd10: 'F41.9' },
  { code: '56717001',  term: 'Tuberculosis',                         termTh: 'วัณโรค',                           icd10: 'A15.9' },
  { code: '38907003',  term: 'Varicella',                            termTh: 'อีสุกอีใส',                        icd10: 'B01.9' },
  { code: '1734006',   term: 'Dengue fever',                         termTh: 'ไข้เดงกี',                         icd10: 'A90'   },
  { code: '86406008',  term: 'Human immunodeficiency virus infection', termTh: 'การติดเชื้อเอชไอวี',              icd10: 'B24'   },
  { code: '24079001',  term: 'Atopic dermatitis',                    termTh: 'ผื่นภูมิแพ้ผิวหนัง',                icd10: 'L20.9' },
  { code: '418363000', term: 'Itching of skin',                      termTh: 'อาการคันผิวหนัง',                   icd10: 'L29.9' },
  { code: '271737000', term: 'Anemia',                               termTh: 'ภาวะโลหิตจาง',                      icd10: 'D64.9' },
  { code: '267036007', term: 'Dyspnea',                              termTh: 'หายใจลำบาก',                       icd10: 'R06.0' },
  { code: '386661006', term: 'Fever',                                termTh: 'ไข้',                              icd10: 'R50.9' },
  { code: '422587007', term: 'Nausea',                               termTh: 'คลื่นไส้',                         icd10: 'R11.0' },
  { code: '125605004', term: 'Fracture of bone',                     termTh: 'กระดูกหัก',                        icd10: 'T14.2' },
  { code: '283545005', term: 'Laceration of skin',                   termTh: 'บาดแผลฉีกขาดที่ผิวหนัง',            icd10: 'T14.1' },
  { code: '217082002', term: 'Accidental fall',                      termTh: 'หกล้มโดยอุบัติเหตุ',                icd10: 'W19'   },
  { code: '242096002', term: 'Motorcycle traffic accident',          termTh: 'อุบัติเหตุจราจรรถจักรยานยนต์',      icd10: 'V29.9' },
  { code: '55566008',  term: 'Animal bite wound',                    termTh: 'บาดแผลถูกสัตว์กัด',                 icd10: 'W54'   },
];

export const SNOMED_BY_CODE = Object.fromEntries(SNOMED_CONCEPTS.map((c) => [c.code, c]));

export const searchSnomed = (query) => {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  return SNOMED_CONCEPTS.filter((c) =>
    c.code.includes(q) || c.term.toLowerCase().includes(q) || c.termTh.includes(q));
};

/* crosswalk: SNOMED → ICD-10 และย้อนกลับ */
export const icd10ForSnomed = (code) => SNOMED_BY_CODE[code]?.icd10 || '';
export const snomedForIcd10 = (icd) =>
  SNOMED_CONCEPTS.filter((c) => c.icd10 === icd);

/* รหัสภายนอกที่ TOR เรียก External Cause ต้องมีบันทึกสาเหตุ/การบาดเจ็บ */
export const EXTERNAL_CAUSE_SUGGESTIONS = [
  'อุบัติเหตุจราจร — ผู้ขับขี่รถจักรยานยนต์ล้มเองบนถนนลื่น ไม่สวมหมวกนิรภัย',
  'หกล้มในห้องน้ำที่บ้าน พื้นเปียก ไม่มีราวจับ',
  'ถูกสุนัขจรจัดกัดบริเวณน่องขวาระหว่างเดินกลับบ้าน',
  'บาดเจ็บจากการทำงาน — มีดบาดนิ้วชี้ขณะเตรียมอาหารในร้าน',
];

export const UNCODED_LABEL = 'ยังไม่ระบุรหัส';

export default SNOMED_CONCEPTS;
