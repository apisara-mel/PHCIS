/* §1.20.2.7 — ภาพรวม Medication Error
   4 ประเภทตาม TOR: Prescribing / Pre-Dispensing / Dispensing / Administration
   ไม่มี store เดิมเก็บ incident log ของ med error จึงสร้างไฟล์นี้ (playbook §4) */

import {
  makeRng, pick, between, isoOffsetDays, isoOffsetMonths,
  BMA_SERVICE_CENTERS, THAI_MONTHS_SHORT,
} from '@/data/dashboardCommon';

/** ประเภท Medication Error — คงลำดับนี้เสมอ (legend ต้องแสดงครบแม้ค่าเป็น 0) */
export const MED_ERROR_TYPES = [
  { key: 'prescribing',    label: 'Prescribing Error (สั่งใช้ยา)'        },
  { key: 'pre-dispensing', label: 'Pre-Dispensing Error (ก่อนจ่ายยา)'    },
  { key: 'dispensing',     label: 'Dispensing Error (จ่ายยา)'            },
  { key: 'administration', label: 'Administration Error (บริหารยา)'      },
];

export const medErrorTypeLabel = (key) =>
  MED_ERROR_TYPES.find((t) => t.key === key)?.label || key || '—';

/** ระดับความรุนแรงตาม NCC MERP (ย่อ) */
export const MED_ERROR_LEVELS = [
  { key: 'a', label: 'A — ยังไม่เกิดความคลาดเคลื่อน' },
  { key: 'b', label: 'B — เกิดแต่ยังไม่ถึงผู้ป่วย'     },
  { key: 'c', label: 'C — ถึงผู้ป่วย ไม่เกิดอันตราย'   },
  { key: 'd', label: 'D — ต้องเฝ้าระวังเพิ่ม'          },
  { key: 'e', label: 'E — เกิดอันตรายชั่วคราว'         },
];

export const medErrorLevelLabel = (key) =>
  MED_ERROR_LEVELS.find((l) => l.key === key)?.label || key || '—';

const DETAILS = {
  prescribing: [
    'สั่งขนาดยาเกินขนาดสูงสุดต่อวัน',
    'สั่งยาซ้ำซ้อนกับรายการเดิม',
    'สั่งยาที่ผู้ป่วยมีประวัติแพ้',
    'ระบุวิธีใช้ไม่ครบถ้วน',
  ],
  'pre-dispensing': [
    'อ่านลายมือ/รายการยาผิดก่อนจัดยา',
    'คีย์จำนวนยาผิดในระบบ',
    'จัดยาผิดความแรง (ตรวจพบก่อนจ่าย)',
    'ฉลากยาไม่ตรงกับใบสั่ง (แก้ก่อนจ่าย)',
  ],
  dispensing: [
    'จ่ายยาผิดชนิด',
    'จ่ายยาผิดจำนวน',
    'จ่ายยาให้ผิดคน',
    'ฉลากยาระบุวิธีใช้ผิด',
  ],
  administration: [
    'ให้ยาผิดเวลา',
    'ให้ยาผิดวิถีทาง',
    'ฉีดยาผิดตำแหน่ง',
    'ลืมให้ยาตามรอบ',
  ],
};

const REPORTERS = [
  'ภก.ชนาธิป วงศ์ไทย', 'ภญ.ปิยะดา สุขเสมอ', 'พว.กานดา แสงจันทร์',
  'พว.ศิริพร ใจดี', 'ภก.ธนดล เจริญพร',
];

const DRUGS = [
  'Amoxicillin 500 mg', 'Metformin 500 mg', 'Enalapril 5 mg', 'Simvastatin 20 mg',
  'Paracetamol 500 mg', 'Omeprazole 20 mg', 'Amlodipine 5 mg', 'Losartan 50 mg',
  'Insulin NPH 100 IU/mL', 'Warfarin 3 mg',
];

/* ให้ Dispensing/Pre-Dispensing พบมากที่สุดตามสถิติจริงของงานเภสัชกรรม */
const TYPE_WEIGHTS = [
  ...Array(9).fill('prescribing'),
  ...Array(13).fill('pre-dispensing'),
  ...Array(11).fill('dispensing'),
  ...Array(4).fill('administration'),
];

const buildIncidents = () => {
  const rng = makeRng(880114);
  const rows = [];
  for (let i = 0; i < 132; i += 1) {
    const type = pick(rng, TYPE_WEIGHTS);
    const level = pick(rng, ['a', 'b', 'b', 'c', 'c', 'c', 'd', 'e']);
    rows.push({
      id: `me-${String(i + 1).padStart(3, '0')}`,
      iso: isoOffsetDays(-between(rng, 0, 364)),
      center: pick(rng, BMA_SERVICE_CENTERS).key,
      type,
      level,
      drug: pick(rng, DRUGS),
      detail: pick(rng, DETAILS[type]),
      reporter: pick(rng, REPORTERS),
      resolved: rng() < 0.82,
    });
  }
  return rows.sort((a, b) => String(b.iso).localeCompare(String(a.iso)));
};

export const MED_ERROR_INCIDENTS = buildIncidents();

/** นับตามประเภท — คงทุกประเภทไว้แม้ค่าเป็น 0 (legend ต้องแสดง 0 · 0%) */
export const medErrorCountsByType = (rows = MED_ERROR_INCIDENTS) => {
  const map = new Map(MED_ERROR_TYPES.map((t) => [t.key, 0]));
  rows.forEach((r) => map.set(r.type, (map.get(r.type) || 0) + 1));
  return map;
};

/** แนวโน้มรายเดือน 12 เดือนย้อนหลัง — { months, values } */
export const medErrorMonthlyTrend = (rows = MED_ERROR_INCIDENTS) => {
  const buckets = [];
  for (let back = 11; back >= 0; back -= 1) {
    const iso = isoOffsetMonths(back, 1);
    buckets.push({ prefix: iso.slice(0, 7), label: THAI_MONTHS_SHORT[Number(iso.slice(5, 7)) - 1] });
  }
  return {
    months: buckets.map((b) => b.label),
    values: buckets.map((b) => rows.filter((r) => r.iso.slice(0, 7) === b.prefix).length),
  };
};
