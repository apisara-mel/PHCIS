/* §1.20.1.3 + §1.20.1.8 — ผู้รับบริการที่มีการแพ้ยา (จำนวน + กราฟภาพรวม)
   ทะเบียนแพ้ยารวมของสำนักอนามัย (mock aggregate) — ไม่มี store เดิมที่เก็บ
   ทะเบียนแพ้ยาระดับสำนัก จึงสร้างไฟล์นี้ตาม playbook §4 */

import { makeRng, pick, between, isoOffsetDays, BMA_SERVICE_CENTERS } from '@/data/dashboardCommon';

/** กลุ่มยาที่แพ้ (ตามการจัดกลุ่มที่ใช้ในบัตรแพ้ยาของศูนย์บริการสาธารณสุข) */
export const ALLERGY_GROUPS = [
  { key: 'penicillin',    label: 'กลุ่ม Penicillin'            },
  { key: 'sulfa',         label: 'กลุ่ม Sulfonamides'          },
  { key: 'nsaids',        label: 'กลุ่ม NSAIDs'                },
  { key: 'cephalosporin', label: 'กลุ่ม Cephalosporins'        },
  { key: 'anticonvulsant',label: 'กลุ่มยากันชัก'                },
  { key: 'quinolone',     label: 'กลุ่ม Quinolones'            },
  { key: 'other',         label: 'อื่น ๆ'                       },
];

export const allergyGroupLabel = (key) =>
  ALLERGY_GROUPS.find((g) => g.key === key)?.label || key || '—';

const DRUGS_BY_GROUP = {
  penicillin:     ['Amoxicillin', 'Ampicillin', 'Penicillin V', 'Cloxacillin'],
  sulfa:          ['Co-trimoxazole', 'Sulfamethoxazole', 'Sulfasalazine'],
  nsaids:         ['Ibuprofen', 'Diclofenac', 'Naproxen', 'Aspirin'],
  cephalosporin:  ['Cefixime', 'Ceftriaxone', 'Cephalexin'],
  anticonvulsant: ['Phenytoin', 'Carbamazepine', 'Lamotrigine'],
  quinolone:      ['Ciprofloxacin', 'Norfloxacin', 'Levofloxacin'],
  other:          ['Metformin', 'Allopurinol', 'Omeprazole', 'Tramadol'],
};

/* น้ำหนักการกระจายให้เหมือนสถิติจริง (Penicillin/NSAIDs พบมากที่สุด) */
const GROUP_WEIGHTS = [
  ...Array(30).fill('penicillin'),
  ...Array(22).fill('nsaids'),
  ...Array(16).fill('sulfa'),
  ...Array(11).fill('cephalosporin'),
  ...Array(7).fill('quinolone'),
  ...Array(6).fill('anticonvulsant'),
  ...Array(8).fill('other'),
];

export const ALLERGY_REACTIONS = [
  'ผื่นลมพิษ (Urticaria)',
  'ผื่นแดงคัน (Maculopapular rash)',
  'หน้าบวม/ตาบวม (Angioedema)',
  'หลอดลมตีบ หายใจลำบาก',
  'Stevens-Johnson Syndrome',
  'คลื่นไส้ อาเจียนรุนแรง',
];

export const ALLERGY_SEVERITY = [
  { key: 'mild',     label: 'ไม่รุนแรง'  },
  { key: 'moderate', label: 'ปานกลาง'    },
  { key: 'severe',   label: 'รุนแรง'      },
];

export const allergySeverityLabel = (key) =>
  ALLERGY_SEVERITY.find((s) => s.key === key)?.label || key || '—';

export const ALLERGY_SOURCES = ['ซักประวัติที่ศูนย์', 'ส่งต่อจากโรงพยาบาล', 'ผู้ป่วยแจ้งเอง', 'บันทึกจากเภสัชกร'];

const FIRST_NAMES = [
  'สมชาย', 'อัจฉรา', 'ธนากร', 'พิมลรัตน์', 'อภินันท์', 'วรรณา', 'ชัยรัตน์', 'สุวพร',
  'กชกร', 'ปรีชา', 'สมพิศ', 'ธีรพงษ์', 'มัลลิกา', 'เกรียงไกร', 'พรพิมล', 'อนุชิต',
  'อรัญญา', 'ไพศาล', 'รวิวรรณ', 'ณัฐพล', 'จิราภรณ์', 'สุทธิพงษ์', 'เบญจมาศ', 'ยุพิน',
];
const LAST_NAMES = [
  'มั่นใจดี', 'ใจดี', 'ศักดิ์สิทธิ์', 'จันทร์โอภาส', 'พิทักษ์', 'จิตรเย็น', 'พงศ์เพชร',
  'ภักดีไทย', 'เจริญสุข', 'รักงาน', 'ใจสะอาด', 'มั่งมี', 'จิรกุล', 'พรพิทักษ์', 'สุขสันต์',
  'รัตน์โกสินทร์', 'บุญรอด', 'สงวนทรัพย์', 'ไทยเจริญ', 'วงศ์สถิตย์',
];
const PREFIXES = ['นาย', 'นาง', 'น.ส.'];

const buildAllergyRegistry = () => {
  const rng = makeRng(20250820);
  const rows = [];
  for (let i = 0; i < 168; i += 1) {
    const group = pick(rng, GROUP_WEIGHTS);
    const drug = pick(rng, DRUGS_BY_GROUP[group] || DRUGS_BY_GROUP.other);
    const severity = pick(rng, [
      'mild', 'mild', 'mild', 'moderate', 'moderate', 'severe',
    ]);
    const center = pick(rng, BMA_SERVICE_CENTERS).key;
    const hn = `${between(rng, 62, 69)}-${String(between(rng, 1, 9999)).padStart(5, '0')}`;
    rows.push({
      id: `alg-${String(i + 1).padStart(3, '0')}`,
      hn,
      name: `${pick(rng, PREFIXES)}${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`,
      age: between(rng, 6, 88),
      group,
      drug,
      reaction: pick(rng, ALLERGY_REACTIONS),
      severity,
      center,
      source: pick(rng, ALLERGY_SOURCES),
      recordedAt: isoOffsetDays(-between(rng, 0, 900)),
    });
  }
  return rows.sort((a, b) => String(b.recordedAt).localeCompare(String(a.recordedAt)));
};

/** ทะเบียนผู้รับบริการที่มีประวัติแพ้ยา (ทั้งสำนักอนามัย) */
export const ALLERGY_REGISTRY = buildAllergyRegistry();

/** จำนวนผู้รับบริการที่มีการแพ้ยาทั้งหมด (§1.20.1.3) */
export const totalAllergyPatients = () =>
  new Set(ALLERGY_REGISTRY.map((r) => r.hn)).size;

/** สรุปตามกลุ่มยา — สำหรับ donut §1.20.1.8 */
export const allergyCountsByGroup = () => {
  const map = new Map(ALLERGY_GROUPS.map((g) => [g.key, 0]));
  ALLERGY_REGISTRY.forEach((r) => map.set(r.group, (map.get(r.group) || 0) + 1));
  return map;
};

/** อันดับตัวยาที่แพ้บ่อยที่สุด — สำหรับ HBarList §1.20.1.8 */
export const topAllergens = (limit = 6) => {
  const map = new Map();
  ALLERGY_REGISTRY.forEach((r) => map.set(r.drug, (map.get(r.drug) || 0) + 1));
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
};

export const allergyCountsBySeverity = () => {
  const map = new Map(ALLERGY_SEVERITY.map((s) => [s.key, 0]));
  ALLERGY_REGISTRY.forEach((r) => map.set(r.severity, (map.get(r.severity) || 0) + 1));
  return map;
};
