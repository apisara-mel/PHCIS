/* Medication name → blister-pack image catalog.
   Single source of truth for AddMedicationPopup, Step-5 table
   (MedImageTile), FrequentOrdersCard chips, Re-Medicine rows,
   and pharmacy registry / dispense tiles.

   Each catalog drug maps to its own `med-{slug}.png` under
   public/images/medications/ — name on the tablet must match the drug. */

export const MED_IMG_DIR = '/images/medications';
export const FALLBACK_MED_IMG = `${MED_IMG_DIR}/med-ibuprofen.png`;

export const medImg = (slug) => `${MED_IMG_DIR}/med-${slug}.png`;

/* Slug inferred from the leading token of a drug name (case-insensitive).
   Longest / most-specific needles first where needed. */
const SLUG_FROM_NAME = [
  ['hydrochlorothiazide', 'hydrochlorothiazide'],
  ['spironolactone', 'spironolactone'],
  ['methocarbamol', 'methocarbamol'],
  ['ciprofloxacin', 'ciprofloxacin'],
  ['orphenadrine', 'orphenadrine'],
  ['esomeprazole', 'esomeprazole'],
  ['atorvastatin', 'atorvastatin'],
  ['simvastatin', 'simvastatin'],
  ['amoxicillin', 'amoxicillin'],
  ['paracetamol', 'paracetamol'],
  ['omeprazole', 'omeprazole'],
  ['metoprolol', 'metoprolol'],
  ['indapamide', 'indapamide'],
  ['bisoprolol', 'bisoprolol'],
  ['furosemide', 'furosemide'],
  ['loratadine', 'loratadine'],
  ['loperamide', 'loperamide'],
  ['cetirizine', 'cetirizine'],
  ['amlodipine', 'amlodipine'],
  ['metformin', 'metformin'],
  ['enalapril', 'enalapril'],
  ['aciclovir', 'aciclovir'],
  ['acyclovir', 'aciclovir'],
  ['ibuprofen', 'ibuprofen'],
  ['naproxen', 'naproxen'],
  ['losartan', 'losartan'],
  ['atenolol', 'atenolol'],
  ['diazepam', 'diazepam'],
  ['folic acid', 'folic-acid'],
  ['folicacid', 'folic-acid'],
  ['vitamin b', 'vitamin-b'],
  ['vitaminb', 'vitamin-b'],
  ['aspirin', 'aspirin'],
  ['codeine', 'codeine'],
  ['vilerm', 'aciclovir'],
];

const normKey = (name) => (
  (name || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\w\u0E00-\u0E7F()]/g, '')
);

export const MEDICATION_NAME_OPTIONS = [
  { value: 'Paracetamol 500 mg',         image: medImg('paracetamol')         },
  { value: 'Ibuprofen 400 mg',            image: medImg('ibuprofen')           },
  { value: 'Methocarbamol 750 mg',        image: medImg('methocarbamol')       },
  { value: 'Orphenadrine 35 mg',          image: medImg('orphenadrine')        },
  { value: 'Omeprazole 20 mg',            image: medImg('omeprazole')          },
  { value: 'Esomeprazole 40 mg',          image: medImg('esomeprazole')        },
  { value: 'Amoxicillin 500 mg',          image: medImg('amoxicillin')         },
  { value: 'Ciprofloxacin 500 mg',        image: medImg('ciprofloxacin')       },
  { value: 'Cetirizine 10 mg',            image: medImg('cetirizine')          },
  { value: 'Loratadine 10 mg',            image: medImg('loratadine')          },
  { value: 'Loperamide 2 mg',             image: medImg('loperamide')          },
  { value: 'Naproxen 250 mg',             image: medImg('naproxen')            },
  { value: 'Metformin 500 mg',            image: medImg('metformin')           },
  { value: 'Amlodipine 5 mg',             image: medImg('amlodipine')          },
  { value: 'Enalapril 5 mg',              image: medImg('enalapril')           },
  { value: 'VILERM (Aciclovir 400 mg)',   image: medImg('aciclovir')           },
  { value: 'Losartan 50 mg',              image: medImg('losartan')            },
  { value: 'Hydrochlorothiazide 25 mg',   image: medImg('hydrochlorothiazide') },
  { value: 'Metoprolol 50 mg',            image: medImg('metoprolol')          },
  { value: 'Atorvastatin 20 mg',          image: medImg('atorvastatin')        },
  { value: 'Atorvastatin 10 mg',          image: medImg('atorvastatin')        },
  { value: 'Aspirin 81 mg',               image: medImg('aspirin')             },
  { value: 'Furosemide 40 mg',            image: medImg('furosemide')          },
  { value: 'Bisoprolol 5 mg',             image: medImg('bisoprolol')          },
  { value: 'Spironolactone 25 mg',        image: medImg('spironolactone')      },
  { value: 'Simvastatin 20 mg',           image: medImg('simvastatin')         },
  { value: 'Atenolol 50 mg',              image: medImg('atenolol')            },
  { value: 'Indapamide 1.5 mg',           image: medImg('indapamide')          },
  { value: 'Vitamin B Complex',           image: medImg('vitamin-b')           },
  { value: 'Folic Acid 5 mg',             image: medImg('folic-acid')          },
  /* มติ คทง.7 — ยาที่ต้องคัดกรองยีน HLA-B ก่อนสั่ง ต้องมีในทะเบียนยา
     มิฉะนั้นกติกา "บล็อกเมื่อผลยีนเป็นบวก" ไม่มียาให้ทดสอบเลย
     (ยังไม่มีภาพเฉพาะ — resolveMedicationImage จะ fallback ให้เอง) */
  { value: 'Allopurinol 100 mg',          image: FALLBACK_MED_IMG              },
  { value: 'Carbamazepine 200 mg',        image: FALLBACK_MED_IMG              },
  /* Controlled / psychotropic seeds for pharmacyRegistry classifications. */
  { value: 'Codeine Phosphate 30 mg',     image: medImg('codeine')             },
  { value: 'Diazepam 5 mg',               image: medImg('diazepam')            },
  /* Aliases for mock rows that omit the space before "mg". */
  { value: 'Paracetamol 500mg',           image: medImg('paracetamol')         },
  { value: 'Ibuprofen 400mg',             image: medImg('ibuprofen')           },
  { value: 'Methocarbamol 750mg',         image: medImg('methocarbamol')       },
  { value: 'Amoxicillin 500mg',           image: medImg('amoxicillin')         },
  { value: 'Omeprazole 20mg',             image: medImg('omeprazole')          },

  /* ── เวชภัณฑ์คุมกำเนิด (คลินิกวางแผนครอบครัว §1.10.8.7) ──────────────
     ก่อนหน้านี้แค็ตตาล็อกกลางไม่มียาคุมกำเนิดเลยสักตัว พอ CPOE ของคลินิก
     วางแผนครอบครัวเปลี่ยนมาใช้ AddMedicationPopup จึงสั่ง "ยาหลักของ
     คลินิกตัวเอง" พร้อมขนาด/วิธีใช้ไม่ได้ — สั่งได้แต่ยาแก้ปวด/ยาปฏิชีวนะ
     image เว้นว่างไว้เพราะยังไม่มีรูปแผงจริงใน public/images/medications
     (เว้นว่าง = ขึ้น glyph ยา ไม่ใช่รูปยาตัวอื่นที่ผิด) */
  { value: 'Levonorgestrel 0.15 mg + Ethinylestradiol 0.03 mg (ยาเม็ดคุมกำเนิดฮอร์โมนรวม COC)', image: '' },
  { value: 'Norethisterone 0.35 mg (ยาเม็ดคุมกำเนิดฮอร์โมนเดี่ยว POP)',                          image: '' },
  { value: 'Medroxyprogesterone acetate 150 mg/mL (ยาฉีดคุมกำเนิด DMPA)',                        image: '' },
  { value: 'Etonogestrel 68 mg (ยาฝังคุมกำเนิด Implant)',                                        image: '' },
  { value: 'Levonorgestrel 1.5 mg (ยาคุมกำเนิดฉุกเฉิน)',                                          image: '' },
  { value: 'Ferrous fumarate 200 mg (ยาเม็ดเสริมธาตุเหล็ก)',                                      image: '' },
].map((opt) => ({ ...opt, label: opt.value }));

const IMAGE_BY_KEY = new Map(
  MEDICATION_NAME_OPTIONS.map((o) => [normKey(o.value), o.image]),
);

const slugFromName = (name) => {
  const lower = (name || '').toLowerCase();
  for (const [needle, slug] of SLUG_FROM_NAME) {
    if (lower.includes(needle)) return slug;
  }
  return null;
};

/** Resolve a displayable medication image URL for table tiles / popups.
   Prefer name→slug match over a stale explicitSrc that points at the
   generic fallback, so registry seeds stay correct after catalog updates. */
/* ── ค่าตั้งต้นจากทะเบียนยา (มติผู้ใช้ 31 ส.ค. 69) ─────────────────────────
   เมื่อสั่งยาโดยไม่ได้พิมพ์เอง (กดชิป "ยาที่สั่งบ่อย" หรือเลือกจากป๊อปอัปแล้ว
   ไม่แก้ช่อง) คอลัมน์ "คำเตือน" กับ "การใช้" ต้องมีค่าจากทะเบียนยาให้เอง
   ไม่ปล่อยว่าง — เป็นข้อมูลของตัวยา ไม่ใช่ของ visit จึงอยู่ในแคตตาล็อกนี้

   คีย์ = ชื่อยาแบบเดียวกับ `MEDICATION_NAME_OPTIONS` · เทียบแบบไม่สนช่องว่าง
   และตัวพิมพ์ ผ่าน `medicationRegistryDefaults` ด้านล่าง เพราะชิปบางตัวเขียน
   "Amlodipine 5 mg" ส่วนแถว mock เดิมเขียน "Amlodipine 5mg" */
export const MEDICATION_REGISTRY_DEFAULTS = {
  'Paracetamol 500 mg':       { purpose: 'แก้ปวด ลดไข้',            warning: 'ไม่เกิน 8 เม็ด/วัน หลีกเลี่ยงในผู้ป่วยโรคตับ' },
  'Ibuprofen 400 mg':         { purpose: 'แก้ปวด ต้านอักเสบ',       warning: 'หลีกเลี่ยงในผู้ป่วยโรคไต / กระเพาะอักเสบ · รับประทานหลังอาหารทันที' },
  'Naproxen 250 mg':          { purpose: 'แก้ปวด ต้านอักเสบ',       warning: 'กลุ่ม NSAIDs — ระวังในผู้ป่วยโรคไต/กระเพาะ และผู้สูงอายุ' },
  'Methocarbamol 750 mg':     { purpose: 'คลายกล้ามเนื้อ',          warning: 'อาจง่วงซึม — งดขับขี่ยานพาหนะ' },
  'Orphenadrine 35 mg':       { purpose: 'คลายกล้ามเนื้อ',          warning: 'อาจง่วงซึม ปากแห้ง — ระวังในผู้ป่วยต้อหิน' },
  'Omeprazole 20 mg':         { purpose: 'ลดกรด ป้องกันกระเพาะ',    warning: 'รับประทานก่อนอาหาร 30 นาที · ใช้ต่อเนื่องนานเสี่ยงขาด B12/แมกนีเซียม' },
  'Esomeprazole 40 mg':       { purpose: 'ลดกรด ป้องกันกระเพาะ',    warning: 'รับประทานก่อนอาหาร 30 นาที' },
  'Amoxicillin 500 mg':       { purpose: 'ยาปฏิชีวนะ',              warning: 'ห้ามใช้ในผู้แพ้ Penicillin · กินให้ครบคอร์ส' },
  'Ciprofloxacin 500 mg':     { purpose: 'ยาปฏิชีวนะ',              warning: 'เลี่ยงนม/แคลเซียมพร้อมยา · ระวังเอ็นอักเสบในผู้สูงอายุ' },
  'Cetirizine 10 mg':         { purpose: 'แก้แพ้ ลดน้ำมูก',         warning: 'อาจทำให้ง่วงซึม — งดขับขี่ยานพาหนะ' },
  'Loratadine 10 mg':         { purpose: 'แก้แพ้ ลดน้ำมูก',         warning: 'ง่วงน้อยกว่ากลุ่มเดิม แต่ยังควรระวังการขับขี่' },
  'Loperamide 2 mg':          { purpose: 'แก้ท้องเสีย',             warning: 'ห้ามใช้เมื่อมีไข้สูงหรือถ่ายเป็นมูกเลือด' },
  'Metformin 500 mg':         { purpose: 'ควบคุมระดับน้ำตาล',       warning: 'รับประทานหลังอาหาร · พิจารณาหยุดก่อนตรวจที่ใช้สารทึบรังสี' },
  'Amlodipine 5 mg':          { purpose: 'ลดความดันโลหิต',          warning: 'อาจบวมข้อเท้า เวียนศีรษะเมื่อลุกเร็ว' },
  'Enalapril 5 mg':           { purpose: 'ลดความดันโลหิต',          warning: 'อาจไอแห้ง · ติดตามค่าไตและโพแทสเซียม' },
  'Losartan 50 mg':           { purpose: 'ลดความดันโลหิต',          warning: 'ติดตามค่าไตและโพแทสเซียม · ห้ามใช้ในหญิงตั้งครรภ์' },
  'Hydrochlorothiazide 25 mg': { purpose: 'ลดความดันโลหิต (ขับปัสสาวะ)', warning: 'ติดตามโพแทสเซียมและโซเดียม · ระวังภาวะขาดน้ำ' },
  'Metoprolol 50 mg':         { purpose: 'ลดความดันโลหิต ชะลอหัวใจเต้นเร็ว', warning: 'ห้ามหยุดยากะทันหัน · ระวังในผู้ป่วยหอบหืด' },
  'Bisoprolol 5 mg':          { purpose: 'ลดความดันโลหิต ชะลอหัวใจเต้นเร็ว', warning: 'ห้ามหยุดยากะทันหัน · ระวังในผู้ป่วยหอบหืด' },
  'Atenolol 50 mg':           { purpose: 'ลดความดันโลหิต',          warning: 'ห้ามหยุดยากะทันหัน · ปรับขนาดตามค่าไต' },
  'Furosemide 40 mg':         { purpose: 'ขับปัสสาวะ ลดบวม',        warning: 'รับประทานตอนเช้า · ติดตามโพแทสเซียมและค่าไต' },
  'Spironolactone 25 mg':     { purpose: 'ขับปัสสาวะชนิดเก็บโพแทสเซียม', warning: 'ติดตามโพแทสเซียม — ระวังใช้ร่วมกับ ACEI/ARB' },
  'Indapamide 1.5 mg':        { purpose: 'ลดความดันโลหิต (ขับปัสสาวะ)', warning: 'ติดตามโซเดียมและโพแทสเซียม' },
  'Atorvastatin 20 mg':       { purpose: 'ลดไขมันในเลือด',          warning: 'แจ้งแพทย์หากปวดกล้ามเนื้อผิดปกติ · ติดตามเอนไซม์ตับ' },
  'Atorvastatin 10 mg':       { purpose: 'ลดไขมันในเลือด',          warning: 'แจ้งแพทย์หากปวดกล้ามเนื้อผิดปกติ' },
  'Simvastatin 20 mg':        { purpose: 'ลดไขมันในเลือด',          warning: 'รับประทานก่อนนอน · เลี่ยงน้ำเกรปฟรุต' },
  'Aspirin 81 mg':            { purpose: 'ต้านเกล็ดเลือด',          warning: 'ระวังเลือดออก · รับประทานหลังอาหาร' },
  'VILERM (Aciclovir 400 mg)': { purpose: 'ต้านไวรัสเริม/งูสวัด',   warning: 'ดื่มน้ำมาก ๆ · ปรับขนาดตามค่าไต' },
  'Allopurinol 100 mg':       { purpose: 'ลดกรดยูริก',              warning: 'ต้องคัดกรอง HLA-B*58:01 ก่อนเริ่มยา · หยุดยาทันทีเมื่อมีผื่น' },
  'Carbamazepine 200 mg':     { purpose: 'กันชัก',                  warning: 'ต้องคัดกรอง HLA-B*15:02 ก่อนเริ่มยา · หยุดยาทันทีเมื่อมีผื่น' },
  'Codeine Phosphate 30 mg':  { purpose: 'แก้ปวด ระงับไอ',          warning: 'ยาควบคุม — ง่วงซึม กดการหายใจ · งดขับขี่ยานพาหนะ' },
  'Diazepam 5 mg':            { purpose: 'คลายกังวล คลายกล้ามเนื้อ', warning: 'ยาควบคุม — ง่วงซึม เสพติดได้ · งดแอลกอฮอล์และการขับขี่' },
  'Vitamin B Complex':        { purpose: 'เสริมวิตามิน',            warning: '' },
  'Folic Acid 5 mg':          { purpose: 'เสริมโฟเลต',              warning: '' },
};

const registryKey = (name) => String(name || '').toLowerCase().replace(/\s+/g, '');

const REGISTRY_BY_KEY = Object.fromEntries(
  Object.entries(MEDICATION_REGISTRY_DEFAULTS).map(([name, meta]) => [registryKey(name), meta]),
);

/** ค่าตั้งต้นของยาหนึ่งตัวจากทะเบียน — ไม่รู้จักชื่อนี้คืนค่าว่างทั้งคู่ ไม่เดา */
export const medicationRegistryDefaults = (name) =>
  REGISTRY_BY_KEY[registryKey(name)] || { purpose: '', warning: '' };

export const resolveMedicationImage = (name, explicitSrc) => {
  if (!name) {
    if (explicitSrc && String(explicitSrc).trim()) return explicitSrc;
    return '';
  }
  /* รายการที่อยู่ในแค็ตตาล็อกแต่ตั้งใจไม่มีรูป (image: '') ต้องคืนค่าว่าง
     ไม่ใช่ตกไปที่ FALLBACK ซึ่งเป็น "รูปแผง Ibuprofen" — โชว์แผงยาผิดตัว
     บนใบสั่งยาอันตรายกว่าไม่โชว์รูปเลย (MedImageTile จะ render เป็น
     glyph ยาแทนเมื่อ src ว่าง) */
  const key = normKey(name);
  if (IMAGE_BY_KEY.has(key)) return IMAGE_BY_KEY.get(key) || '';
  const slug = slugFromName(name);
  if (slug) return medImg(slug);
  if (explicitSrc && String(explicitSrc).trim() && explicitSrc !== FALLBACK_MED_IMG) {
    return explicitSrc;
  }
  return FALLBACK_MED_IMG;
};
