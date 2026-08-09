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

  /* ── ชุดขยาย: กลุ่มวินิจฉัย OPD ที่พบบ่อยที่สุดของศูนย์บริการสาธารณสุข ──
     คัดจากรายการวินิจฉัยที่ ศบส. ใช้จริง (ระบบทางเดินหายใจส่วนบน, NCD,
     กล้ามเนื้อ-กระดูก, ผิวหนัง, ตา-หู, ทางเดินอาหาร, ระบบสืบพันธุ์/ANC,
     สุขภาพจิต, การป้องกันโรค) เพื่อให้ crosswalk ครอบคลุมงานประจำวัน. */

  /* ระบบทางเดินหายใจ */
  { code: '10509002',  term: 'Acute bronchitis',                     termTh: 'หลอดลมอักเสบเฉียบพลัน',            icd10: 'J20.9' },
  { code: '6142004',   term: 'Influenza',                            termTh: 'ไข้หวัดใหญ่',                       icd10: 'J11.1' },
  { code: '82272006',  term: 'Common cold',                          termTh: 'ไข้หวัด',                          icd10: 'J00'   },
  { code: '36971009',  term: 'Sinusitis',                            termTh: 'ไซนัสอักเสบ',                       icd10: 'J32.9' },
  { code: '43878008',  term: 'Streptococcal sore throat',            termTh: 'คออักเสบจากเชื้อสเตรปโตค็อกคัส',    icd10: 'J02.0' },
  { code: '90176007',  term: 'Allergic rhinitis',                    termTh: 'เยื่อจมูกอักเสบจากภูมิแพ้',          icd10: 'J30.4' },
  { code: '17920008',  term: 'Chronic tonsillitis',                  termTh: 'ต่อมทอนซิลอักเสบเรื้อรัง',           icd10: 'J35.0' },
  { code: '49727002',  term: 'Cough',                                termTh: 'อาการไอ',                          icd10: 'R05'   },
  { code: '5505005',   term: 'Acute laryngitis',                     termTh: 'กล่องเสียงอักเสบเฉียบพลัน',          icd10: 'J04.0' },

  /* หัวใจและหลอดเลือด / NCD */
  { code: '59621000',  term: 'Essential hypertension',               termTh: 'ความดันโลหิตสูงชนิดไม่ทราบสาเหตุ',   icd10: 'I10'   },
  { code: '53741008',  term: 'Coronary arteriosclerosis',            termTh: 'หลอดเลือดหัวใจตีบแข็ง',             icd10: 'I25.1' },
  { code: '194828000', term: 'Angina pectoris',                      termTh: 'อาการเจ็บแน่นหน้าอกจากหัวใจขาดเลือด', icd10: 'I20.9' },
  { code: '128053003', term: 'Deep venous thrombosis',               termTh: 'ลิ่มเลือดอุดตันหลอดเลือดดำส่วนลึก',   icd10: 'I80.2' },
  { code: '128060009', term: 'Varicose veins of lower extremity',    termTh: 'เส้นเลือดขอดที่ขา',                 icd10: 'I83.9' },
  { code: '38716007',  term: 'Elevated blood pressure reading',      termTh: 'วัดความดันโลหิตได้สูงกว่าปกติ',       icd10: 'R03.0' },

  /* ต่อมไร้ท่อ / เมแทบอลิก */
  { code: '190447002', term: 'Steroid-induced diabetes',             termTh: 'เบาหวานจากยาสเตียรอยด์',            icd10: 'E13.9' },
  { code: '80394007',  term: 'Hyperglycemia',                        termTh: 'ภาวะน้ำตาลในเลือดสูง',              icd10: 'R73.9' },
  { code: '302866003', term: 'Hypoglycemia',                         termTh: 'ภาวะน้ำตาลในเลือดต่ำ',              icd10: 'E16.2' },
  { code: '34486009',  term: 'Hyperthyroidism',                      termTh: 'ภาวะไทรอยด์เป็นพิษ',                icd10: 'E05.9' },
  { code: '237602007', term: 'Metabolic syndrome',                   termTh: 'กลุ่มอาการเมแทบอลิก',               icd10: 'E88.8' },
  { code: '190905008', term: 'Cystic fibrosis',                      termTh: 'โรคซิสติกไฟโบรซิส',                 icd10: 'E84.9' },
  { code: '267434003', term: 'Gout',                                 termTh: 'โรคเกาต์',                         icd10: 'M10.9' },
  { code: '166717003', term: 'Serum creatinine raised',              termTh: 'ค่าครีอะตินินในเลือดสูง',            icd10: 'R79.8' },

  /* ทางเดินอาหารและตับ */
  { code: '196416002', term: 'Peptic ulcer',                         termTh: 'แผลในกระเพาะอาหาร',                icd10: 'K27.9' },
  { code: '14760008',  term: 'Constipation',                         termTh: 'ท้องผูก',                          icd10: 'K59.0' },
  { code: '62315008',  term: 'Diarrhea',                             termTh: 'อุจจาระร่วง',                       icd10: 'K52.9' },
  { code: '21861000',  term: 'Hemorrhoids',                          termTh: 'ริดสีดวงทวาร',                      icd10: 'K64.9' },
  { code: '197321007', term: 'Cirrhosis of liver',                   termTh: 'ตับแข็ง',                          icd10: 'K74.6' },
  { code: '66071002',  term: 'Viral hepatitis type B',               termTh: 'ไวรัสตับอักเสบบี',                   icd10: 'B18.1' },
  { code: '50711007',  term: 'Viral hepatitis type C',               termTh: 'ไวรัสตับอักเสบซี',                   icd10: 'B18.2' },
  { code: '271681002', term: 'Stomach ache',                         termTh: 'ปวดท้อง',                          icd10: 'R10.4' },
  { code: '235919008', term: 'Fatty liver',                          termTh: 'ไขมันพอกตับ',                       icd10: 'K76.0' },

  /* ไต / ทางเดินปัสสาวะ */
  { code: '68566005',  term: 'Urinary tract infectious disease',      termTh: 'การติดเชื้อทางเดินปัสสาวะ',          icd10: 'N39.0' },
  { code: '95570007',  term: 'Kidney stone',                         termTh: 'นิ่วในไต',                         icd10: 'N20.0' },
  { code: '49578003',  term: 'Benign prostatic hyperplasia',         termTh: 'ต่อมลูกหมากโต',                     icd10: 'N40'   },
  { code: '236434000', term: 'Cystitis',                             termTh: 'กระเพาะปัสสาวะอักเสบ',              icd10: 'N30.9' },

  /* กล้ามเนื้อ กระดูก และข้อ (MSK — กลุ่มใหญ่ของ ศบส.) */
  { code: '161891005', term: 'Backache',                             termTh: 'ปวดหลัง',                          icd10: 'M54.9' },
  { code: '81680005',  term: 'Neck pain',                            termTh: 'ปวดคอ',                            icd10: 'M54.2' },
  { code: '57676002',  term: 'Joint pain',                           termTh: 'ปวดข้อ',                           icd10: 'M25.5' },
  { code: '202855006', term: 'Lateral epicondylitis',                termTh: 'เอ็นข้อศอกอักเสบ (tennis elbow)',    icd10: 'M77.1' },
  { code: '399269003', term: 'Frozen shoulder',                      termTh: 'ข้อไหล่ติด',                        icd10: 'M75.0' },
  { code: '57054005',  term: 'Carpal tunnel syndrome',               termTh: 'กลุ่มอาการอุโมงค์ข้อมือ',            icd10: 'G56.0' },
  { code: '64859006',  term: 'Osteoporosis',                         termTh: 'โรคกระดูกพรุน',                     icd10: 'M81.9' },
  { code: '202393004', term: 'Plantar fasciitis',                    termTh: 'พังผืดใต้ฝ่าเท้าอักเสบ',             icd10: 'M72.2' },
  { code: '43068002',  term: 'Sprain of ankle',                      termTh: 'ข้อเท้าแพลง',                       icd10: 'S93.4' },
  { code: '203082005', term: 'Fibromyalgia',                         termTh: 'กลุ่มอาการปวดกล้ามเนื้อเรื้อรัง',     icd10: 'M79.7' },
  { code: '82423001',  term: 'Chronic pain',                         termTh: 'อาการปวดเรื้อรัง',                  icd10: 'R52.2' },

  /* ผิวหนัง */
  { code: '56454009',  term: 'Contact dermatitis',                   termTh: 'ผิวหนังอักเสบจากการสัมผัส',          icd10: 'L23.9' },
  { code: '9014002',   term: 'Psoriasis',                            termTh: 'โรคสะเก็ดเงิน',                     icd10: 'L40.9' },
  { code: '126485001', term: 'Urticaria',                            termTh: 'ลมพิษ',                            icd10: 'L50.9' },
  { code: '11381005',  term: 'Acne vulgaris',                        termTh: 'สิว',                              icd10: 'L70.0' },
  { code: '47382004',  term: 'Impetigo',                             termTh: 'แผลพุพอง',                         icd10: 'L01.0' },
  { code: '48610006',  term: 'Cellulitis',                           termTh: 'เนื้อเยื่ออ่อนอักเสบ',               icd10: 'L03.9' },
  { code: '414941008', term: 'Tinea pedis',                          termTh: 'กลากที่เท้า (ฮ่องกงฟุต)',           icd10: 'B35.3' },
  { code: '78048006',  term: 'Scabies',                              termTh: 'หิด',                              icd10: 'B86'   },
  { code: '200936003', term: 'Herpes zoster',                        termTh: 'งูสวัด',                           icd10: 'B02.9' },
  { code: '13500009',  term: 'Diabetic foot ulcer',                  termTh: 'แผลที่เท้าจากเบาหวาน',              icd10: 'E11.6' },
  { code: '399912005', term: 'Pressure ulcer',                       termTh: 'แผลกดทับ',                         icd10: 'L89.9' },

  /* ตา หู คอ จมูก */
  { code: '9826008',   term: 'Conjunctivitis',                       termTh: 'เยื่อบุตาอักเสบ',                    icd10: 'H10.9' },
  { code: '193570009', term: 'Cataract',                             termTh: 'ต้อกระจก',                         icd10: 'H26.9' },
  { code: '23986001',  term: 'Glaucoma',                             termTh: 'ต้อหิน',                           icd10: 'H40.9' },
  { code: '4210003',   term: 'Diabetic retinopathy',                 termTh: 'จอประสาทตาเสื่อมจากเบาหวาน',        icd10: 'E11.3' },
  { code: '3110003',   term: 'Otitis media',                         termTh: 'หูชั้นกลางอักเสบ',                   icd10: 'H66.9' },
  { code: '15188001',  term: 'Hearing loss',                         termTh: 'การได้ยินลดลง',                     icd10: 'H91.9' },
  { code: '162290004', term: 'Dry eyes',                             termTh: 'ตาแห้ง',                           icd10: 'H04.1' },
  { code: '399153001', term: 'Impacted cerumen',                     termTh: 'ขี้หูอุดตัน',                       icd10: 'H61.2' },

  /* สูติ-นรีเวช / ANC (งานประจำของ ศบส.) */
  { code: '77386006',  term: 'Pregnancy',                            termTh: 'การตั้งครรภ์',                      icd10: 'Z34.9' },
  { code: '72892002',  term: 'Normal pregnancy',                     termTh: 'การตั้งครรภ์ปกติ',                  icd10: 'Z34.0' },
  { code: '11687002',  term: 'Gestational diabetes mellitus',        termTh: 'เบาหวานขณะตั้งครรภ์',               icd10: 'O24.4' },
  { code: '48194001',  term: 'Pregnancy-induced hypertension',       termTh: 'ความดันโลหิตสูงขณะตั้งครรภ์',        icd10: 'O13'   },
  { code: '39829001',  term: 'Anemia in pregnancy',                  termTh: 'ภาวะโลหิตจางขณะตั้งครรภ์',           icd10: 'O99.0' },
  { code: '82711006',  term: 'Vaginitis',                            termTh: 'ช่องคลอดอักเสบ',                    icd10: 'N76.0' },
  { code: '266599000', term: 'Dysmenorrhea',                         termTh: 'ปวดประจำเดือน',                     icd10: 'N94.6' },
  { code: '198246005', term: 'Menopausal syndrome',                  termTh: 'กลุ่มอาการวัยหมดระดู',              icd10: 'N95.1' },
  { code: '169553002', term: 'Contraceptive management',             termTh: 'การคุมกำเนิด',                      icd10: 'Z30.9' },

  /* สุขภาพจิตและระบบประสาท */
  { code: '48694002',  term: 'Anxiety',                              termTh: 'อาการวิตกกังวล',                    icd10: 'F41.1' },
  { code: '193462001', term: 'Insomnia',                             termTh: 'นอนไม่หลับ',                        icd10: 'G47.0' },
  { code: '52448006',  term: 'Dementia',                             termTh: 'ภาวะสมองเสื่อม',                    icd10: 'F03'   },
  { code: '49049000',  term: 'Parkinson disease',                    termTh: 'โรคพาร์กินสัน',                     icd10: 'G20'   },
  { code: '58214004',  term: 'Schizophrenia',                        termTh: 'โรคจิตเภท',                        icd10: 'F20.9' },
  { code: '66214007',  term: 'Substance abuse',                      termTh: 'การใช้สารเสพติดในทางที่ผิด',         icd10: 'F19.1' },
  { code: '7200002',   term: 'Alcoholism',                           termTh: 'ภาวะติดสุรา',                       icd10: 'F10.2' },
  { code: '56294008',  term: 'Nicotine dependence',                  termTh: 'ภาวะติดนิโคติน',                    icd10: 'F17.2' },
  { code: '404640003', term: 'Dizziness',                            termTh: 'อาการวิงเวียน',                     icd10: 'R42'   },
  { code: '45326000',  term: 'Sciatica',                             termTh: 'อาการปวดร้าวตามเส้นประสาทไซแอติก',   icd10: 'M54.3' },

  /* โรคติดเชื้อและงานระบาดวิทยา */
  { code: '840539006', term: 'COVID-19',                             termTh: 'โรคติดเชื้อไวรัสโคโรนา 2019',        icd10: 'U07.1' },
  { code: '76272004',  term: 'Syphilis',                             termTh: 'ซิฟิลิส',                          icd10: 'A53.9' },
  { code: '15628003',  term: 'Gonorrhea',                            termTh: 'หนองใน',                           icd10: 'A54.9' },
  { code: '38362002',  term: 'Dengue hemorrhagic fever',             termTh: 'ไข้เลือดออกเดงกี',                   icd10: 'A91'   },
  { code: '61462000',  term: 'Malaria',                              termTh: 'มาลาเรีย',                         icd10: 'B54'   },
  { code: '75702008',  term: 'Leptospirosis',                        termTh: 'โรคฉี่หนู',                        icd10: 'A27.9' },
  { code: '27836007',  term: 'Pertussis',                            termTh: 'ไอกรน',                            icd10: 'A37.9' },
  { code: '14189004',  term: 'Measles',                              termTh: 'โรคหัด',                           icd10: 'B05.9' },
  { code: '111407006', term: 'Helminthiasis',                        termTh: 'โรคพยาธิ',                         icd10: 'B83.9' },
  { code: '186431008', term: 'Clostridium difficile infection',      termTh: 'การติดเชื้อคลอสตริเดียม ดิฟฟิไซล์',   icd10: 'A04.7' },

  /* งานส่งเสริมสุขภาพ / ป้องกันโรค (Z-codes ที่ ศบส. ใช้บ่อย) */
  { code: '171121004', term: 'Screening for diabetes mellitus',      termTh: 'การคัดกรองเบาหวาน',                 icd10: 'Z13.1' },
  { code: '171222001', term: 'Screening for hypertension',           termTh: 'การคัดกรองความดันโลหิตสูง',          icd10: 'Z13.6' },
  { code: '268547008', term: 'Cervical smear screening',             termTh: 'การตรวจคัดกรองมะเร็งปากมดลูก',       icd10: 'Z12.4' },
  { code: '268548003', term: 'Breast cancer screening',              termTh: 'การตรวจคัดกรองมะเร็งเต้านม',         icd10: 'Z12.3' },
  { code: '33879002',  term: 'Immunization',                         termTh: 'การได้รับวัคซีน',                   icd10: 'Z23'   },
  { code: '410620009', term: 'Well child visit',                     termTh: 'การตรวจสุขภาพเด็กดี',               icd10: 'Z00.1' },
  { code: '410006001', term: 'General health examination',           termTh: 'การตรวจสุขภาพทั่วไป',               icd10: 'Z00.0' },
  { code: '710824005', term: 'Assessment of health of elderly',      termTh: 'การประเมินสุขภาพผู้สูงอายุ',         icd10: 'Z00.0' },
  { code: '182813001', term: 'Follow-up examination',                termTh: 'การตรวจติดตามผลการรักษา',            icd10: 'Z09.9' },
  { code: '183460006', term: 'Dressing of wound',                    termTh: 'การทำแผล',                         icd10: 'Z48.0' },
  { code: '406153008', term: 'Home visit',                           termTh: 'การเยี่ยมบ้าน',                     icd10: 'Z76.8' },
  { code: '243796009', term: 'Situation-dependent encounter',        termTh: 'การมารับบริการตามนัด',              icd10: 'Z76.9' },

  /* กลุ่มอาการ / อาการแสดงที่พบบ่อยในห้องตรวจ */
  { code: '84229001',  term: 'Fatigue',                              termTh: 'อ่อนเพลีย',                         icd10: 'R53.83' },
  { code: '89362005',  term: 'Weight loss',                          termTh: 'น้ำหนักลด',                        icd10: 'R63.4' },
  { code: '8943002',   term: 'Loss of appetite',                     termTh: 'เบื่ออาหาร',                        icd10: 'R63.0' },
  { code: '271594007', term: 'Syncope',                              termTh: 'เป็นลมหมดสติ',                      icd10: 'R55'   },
  { code: '29857009',  term: 'Chest pain',                           termTh: 'เจ็บหน้าอก',                        icd10: 'R07.4' },
  { code: '267038008', term: 'Edema',                                termTh: 'อาการบวม',                         icd10: 'R60.9' },
  { code: '162397003', term: 'Palpitations',                         termTh: 'ใจสั่น',                           icd10: 'R00.2' },
  { code: '68962001',  term: 'Myalgia',                              termTh: 'ปวดกล้ามเนื้อ',                     icd10: 'M79.1' },
  { code: '13791008',  term: 'Asthenia',                             termTh: 'อ่อนแรง',                          icd10: 'R53.1' },
  { code: '30746006',  term: 'Lymphadenopathy',                      termTh: 'ต่อมน้ำเหลืองโต',                   icd10: 'R59.9' },

  /* การบาดเจ็บและสาเหตุภายนอกเพิ่มเติม */
  { code: '48333001',  term: 'Burn injury',                          termTh: 'บาดแผลไหม้',                        icd10: 'T30.0' },
  { code: '125666000', term: 'Burn of skin',                         termTh: 'ผิวหนังไหม้',                       icd10: 'T30.0' },
  { code: '262574004', term: 'Bruise',                               termTh: 'รอยฟกช้ำ',                         icd10: 'T14.0' },
  { code: '405534003', term: 'Insect bite',                          termTh: 'ถูกแมลงกัดต่อย',                    icd10: 'W57'   },
  { code: '241822008', term: 'Snake bite',                           termTh: 'ถูกงูกัด',                         icd10: 'T63.0' },
  { code: '75478009',  term: 'Poisoning',                            termTh: 'ภาวะได้รับสารพิษ',                  icd10: 'T65.9' },
  { code: '212976001', term: 'Adverse drug reaction',                termTh: 'อาการไม่พึงประสงค์จากยา',            icd10: 'T88.7' },
  { code: '609328004', term: 'Allergic disposition',                 termTh: 'ภาวะภูมิแพ้',                       icd10: 'T78.4' },
];

export const SNOMED_BY_CODE = Object.fromEntries(SNOMED_CONCEPTS.map((c) => [c.code, c]));

/* ── ที่มาของตาราง cross-map (§1.4.5.2) ─────────────────────────
   เปิดเป็น export เพื่อให้หน้าจอแสดง footnote ได้แบบมีโครงสร้าง แทนการ
   hard-code ข้อความ. `status` ต้องเป็น 'sample' จนกว่าจะต่อ terminology
   server จริง — **ห้ามติดป้ายว่าเป็น SNOMED CT release ฉบับเต็ม**. */
export const SNOMED_PROVENANCE = {
  status: 'sample',                 /* sample | licensed-release */
  statusLabel: 'ตารางตัวอย่าง ไม่ใช่ SNOMED CT release ฉบับเต็ม',
  get conceptCount() { return SNOMED_CONCEPTS.length; },
  scope: 'คัดเฉพาะกลุ่มวินิจฉัยที่พบบ่อยในผู้ป่วยนอกของศูนย์บริการสาธารณสุข กทม.',
  licensing: 'SNOMED CT มีลิขสิทธิ์ ต้องขอ license ผ่าน SNOMED International / สมาชิกระดับประเทศ จึงลง concept ฉบับเต็ม (~350,000 concept) ในโค้ดไม่ได้',
  /* ข้อความนี้ถูกอ่านโดยผู้ใช้ทางคลินิก จึงต้องตรงกับตารางจริง: หนึ่ง ICD-10
     มีได้หลาย SNOMED concept (I10, K52.9, N39.0, Z00.0, T30.0) และหน้าวินิจฉัย
     ก็แสดงออกมาทั้งคู่ — ห้ามอ้างว่า "หนึ่งต่อหนึ่ง" */
  mappingBasis: 'จับคู่เท่าที่ตรงกันชัดเจน — หนึ่ง ICD-10 อาจมีได้หลาย SNOMED concept (เช่น I10 → 38341003 / 59621000) คู่ที่ไม่ชัดเจนถูกตัดออก ไม่เดารหัสให้',
  behaviour: 'ถ้าไม่มีคู่ในตาราง ระบบจะบอกตรง ๆ ว่า "ไม่มีคู่ในตารางตัวอย่าง" ไม่แนะนำรหัสที่ใกล้เคียงแทน',
  lastReviewedAt: '8 ส.ค. 2569',
  closingGap: 'ต้องต่อกับ terminology server (เช่น Snowstorm/FHIR ValueSet) และนำเข้า SNOMED CT Thai Extension ฉบับที่มี license',
};

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
