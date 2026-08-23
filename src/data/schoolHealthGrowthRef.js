/* schoolHealthGrowthRef.js — เกณฑ์อ้างอิงการเจริญเติบโตและภาวะโภชนาการ
   ของนักเรียนอายุ 5–19 ปี (TOR §3.4.1 / §3.4.2, มติ คทง.5 "BMI for Age").

   ⚠️ ค่าที่อยู่ในไฟล์นี้เป็น mock lookup สำหรับต้นแบบ อ้างอิงรูปแบบตาราง
   BMI-for-Age (WHO 2007 / กรมอนามัย 5–19 ปี) แต่ **ยังไม่ผ่านการตรวจสอบกับ
   สำนักอนามัย** — ก่อนขึ้น production ต้องแทนที่ด้วยตาราง LMS ฉบับจริง
   (ดู note ใน manifest ของโมดูล school-health)

   โครงตาราง: ต่อเพศ ต่ออายุเต็มปี 5–19 เก็บ "ค่า BMI ที่เป็นขอบล่างของแต่ละแถบ"
     thin      → ต่ำกว่านี้ = ผอม            (≈ −2SD)
     riskThin  → ต่ำกว่านี้ = ค่อนข้างผอม    (≈ −1.5SD)
     plump     → ตั้งแต่นี้ = ท้วม            (≈ +1SD)
     over      → ตั้งแต่นี้ = เริ่มอ้วน       (≈ +1.5SD)
     obese     → ตั้งแต่นี้ = อ้วน            (≈ +2SD)
   ค่าระหว่างปีใช้ linear interpolation เพื่อไม่ให้เด็ก 8 ปี 6 เดือน ถูกตัดสิน
   ด้วยเกณฑ์ของเด็ก 8 ปีถ้วน */

import { ageYearsAt } from '@/data/schoolHealthCore';

/* [age, thin, riskThin, plump, over, obese] */
const BMI_MALE = [
  [5, 12.7, 13.2, 16.6, 17.3, 18.3],
  [6, 12.7, 13.2, 16.8, 17.7, 18.5],
  [7, 12.9, 13.4, 17.4, 18.3, 19.3],
  [8, 13.1, 13.7, 18.1, 19.1, 20.3],
  [9, 13.4, 14.0, 18.9, 20.1, 21.4],
  [10, 13.7, 14.4, 19.8, 21.1, 22.6],
  [11, 14.1, 14.8, 20.7, 22.1, 23.7],
  [12, 14.5, 15.3, 21.6, 23.1, 24.8],
  [13, 14.9, 15.8, 22.5, 24.1, 25.9],
  [14, 15.5, 16.4, 23.3, 25.0, 26.9],
  [15, 16.0, 17.0, 24.0, 25.8, 27.8],
  [16, 16.5, 17.5, 24.7, 26.5, 28.6],
  [17, 16.9, 17.9, 25.3, 27.1, 29.3],
  [18, 17.3, 18.3, 25.7, 27.6, 29.9],
  [19, 17.6, 18.6, 26.1, 28.0, 30.3],
];

const BMI_FEMALE = [
  [5, 12.4, 12.9, 16.9, 17.7, 18.9],
  [6, 12.4, 12.9, 17.1, 18.0, 19.2],
  [7, 12.5, 13.1, 17.6, 18.6, 20.0],
  [8, 12.7, 13.3, 18.3, 19.4, 21.0],
  [9, 13.0, 13.7, 19.1, 20.4, 22.1],
  [10, 13.4, 14.1, 20.0, 21.4, 23.3],
  [11, 13.9, 14.6, 20.9, 22.4, 24.5],
  [12, 14.4, 15.2, 21.9, 23.4, 25.6],
  [13, 14.9, 15.8, 22.7, 24.3, 26.6],
  [14, 15.4, 16.3, 23.5, 25.1, 27.4],
  [15, 15.9, 16.8, 24.1, 25.7, 28.1],
  [16, 16.2, 17.2, 24.5, 26.2, 28.6],
  [17, 16.4, 17.4, 24.8, 26.4, 28.9],
  [18, 16.5, 17.6, 25.0, 26.6, 29.1],
  [19, 16.6, 17.7, 25.1, 26.7, 29.3],
];

export const BMI_FOR_AGE_REF = { male: BMI_MALE, female: BMI_FEMALE };

export const BMI_AGE_MIN = 5;
export const BMI_AGE_MAX = 19;

/** แถบแปลผลโภชนาการ — ใช้ทั้ง badge, chart legend และรายงาน §3.6.2 */
export const NUTRITION_BANDS = [
  { key: 'thin', label: 'ผอม', style: 'red', short: 'ผอม' },
  { key: 'riskThin', label: 'ค่อนข้างผอม', style: 'yellow', short: 'ค่อนข้างผอม' },
  { key: 'normal', label: 'สมส่วน', style: 'green', short: 'สมส่วน' },
  { key: 'plump', label: 'ท้วม', style: 'yellow', short: 'ท้วม' },
  { key: 'over', label: 'เริ่มอ้วน', style: 'orange', short: 'เริ่มอ้วน' },
  { key: 'obese', label: 'อ้วน', style: 'red', short: 'อ้วน' },
];

export const nutritionBand = (key) =>
  NUTRITION_BANDS.find((b) => b.key === key) || null;

/** แถบที่ถือว่า "น้ำหนักไม่ตรงเกณฑ์" ตาม TOR §3.6.2 */
export const OFF_TARGET_BANDS = ['thin', 'riskThin', 'plump', 'over', 'obese'];

/** แถบที่ต้องเปิด Pop-up คัดกรองภาวะอ้วน (มติ คทง.5) */
export const OBESITY_TRIGGER_BANDS = ['over', 'obese'];

const interpolate = (rows, age) => {
  const clamped = Math.min(Math.max(age, rows[0][0]), rows[rows.length - 1][0]);
  const upperIdx = rows.findIndex((r) => r[0] >= clamped);
  if (upperIdx <= 0) return rows[0];
  const lo = rows[upperIdx - 1];
  const hi = rows[upperIdx];
  const span = hi[0] - lo[0];
  if (span === 0) return hi;
  const t = (clamped - lo[0]) / span;
  return lo.map((v, i) => (i === 0 ? clamped : Math.round((v + (hi[i] - v) * t) * 10) / 10));
};

/** น้ำหนัก (กก.) + ส่วนสูง (ซม.) → BMI ทศนิยม 1 ตำแหน่ง (null ถ้ากรอกไม่ครบ) */
export const calcBmi = (weightKg, heightCm) => {
  const w = Number(weightKg);
  const h = Number(heightCm);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  const m = h / 100;
  return Math.round((w / (m * m)) * 10) / 10;
};

/** แปลผล BMI for Age — คืน null เมื่ออายุอยู่นอกช่วง 5–19 ปี (ไม่เดาผล) */
export const classifyBmiForAge = ({ sex, ageYears, bmi }) => {
  if (bmi == null || !Number.isFinite(bmi)) return null;
  if (ageYears == null || ageYears < BMI_AGE_MIN || ageYears > BMI_AGE_MAX) {
    return {
      key: 'out-of-range',
      label: 'เกณฑ์ไม่ครอบคลุมช่วงอายุนี้',
      style: 'grey',
      outOfRange: true,
      bmi,
      note: `เกณฑ์ BMI for Age ใช้ได้เฉพาะอายุ ${BMI_AGE_MIN}–${BMI_AGE_MAX} ปี — บันทึกค่าได้แต่ระบบจะไม่แปลผล`,
    };
  }
  const rows = sex === 'หญิง' ? BMI_FEMALE : BMI_MALE;
  const [, thin, riskThin, plump, over, obese] = interpolate(rows, ageYears);
  let key = 'normal';
  if (bmi < thin) key = 'thin';
  else if (bmi < riskThin) key = 'riskThin';
  else if (bmi >= obese) key = 'obese';
  else if (bmi >= over) key = 'over';
  else if (bmi >= plump) key = 'plump';
  const band = nutritionBand(key);
  return {
    key,
    label: band.label,
    style: band.style,
    outOfRange: false,
    bmi,
    cutoffs: { thin, riskThin, plump, over, obese },
    needsObesityScreening: OBESITY_TRIGGER_BANDS.includes(key),
    offTarget: OFF_TARGET_BANDS.includes(key),
  };
};

/** ทางลัดจากข้อมูลนักเรียน + ผลชั่ง/วัด */
export const evaluateNutrition = ({ sex, birthDate, measuredAt, weightKg, heightCm }) => {
  const bmi = calcBmi(weightKg, heightCm);
  const ageYears = ageYearsAt(birthDate, measuredAt);
  const result = classifyBmiForAge({ sex, ageYears, bmi });
  return result ? { ...result, ageYears } : null;
};

/* ── กราฟการเจริญเติบโต (P3 / P50 / P97) — ป้อน GrowthPercentileChart ── */

const heightRef = (rows) => rows.map(([x, p3, p50, p97]) => ({ x, p3, p50, p97 }));

export const HEIGHT_FOR_AGE_REF = {
  male: heightRef([
    [5, 100, 109, 118], [6, 106, 115, 125], [7, 111, 122, 132], [8, 116, 128, 139],
    [9, 121, 133, 145], [10, 126, 138, 151], [11, 130, 143, 157], [12, 135, 149, 164],
    [13, 141, 156, 171], [14, 147, 163, 177], [15, 153, 169, 181], [16, 157, 172, 184],
    [17, 159, 174, 186], [18, 160, 175, 187], [19, 161, 176, 188],
  ]),
  female: heightRef([
    [5, 99, 108, 117], [6, 105, 115, 124], [7, 110, 121, 131], [8, 115, 127, 138],
    [9, 120, 133, 145], [10, 125, 139, 151], [11, 131, 145, 158], [12, 137, 151, 164],
    [13, 143, 156, 168], [14, 146, 159, 171], [15, 148, 161, 172], [16, 149, 162, 173],
    [17, 150, 163, 173], [18, 150, 163, 174], [19, 150, 163, 174],
  ]),
};

export const WEIGHT_FOR_AGE_REF = {
  male: heightRef([
    [5, 14, 18, 25], [6, 16, 20, 29], [7, 17, 23, 34], [8, 19, 25, 39],
    [9, 21, 28, 45], [10, 23, 32, 51], [11, 26, 36, 57], [12, 29, 40, 63],
    [13, 33, 45, 69], [14, 37, 50, 74], [15, 41, 55, 79], [16, 45, 59, 83],
    [17, 48, 62, 86], [18, 50, 65, 88], [19, 52, 66, 90],
  ]),
  female: heightRef([
    [5, 14, 18, 25], [6, 15, 20, 29], [7, 17, 22, 33], [8, 19, 25, 38],
    [9, 21, 28, 44], [10, 23, 32, 50], [11, 26, 36, 56], [12, 30, 41, 62],
    [13, 34, 45, 67], [14, 37, 49, 71], [15, 40, 52, 74], [16, 42, 54, 77],
    [17, 43, 55, 78], [18, 44, 56, 79], [19, 44, 56, 80],
  ]),
};

export const GROWTH_CHART_DEFS = [
  {
    key: 'weight',
    title: 'น้ำหนักตามเกณฑ์อายุ (5–19 ปี)',
    unit: 'กก.',
    axisLabel: 'อายุ (ปี)',
    ref: WEIGHT_FOR_AGE_REF,
    field: 'weightKg',
  },
  {
    key: 'height',
    title: 'ส่วนสูงตามเกณฑ์อายุ (5–19 ปี)',
    unit: 'ซม.',
    axisLabel: 'อายุ (ปี)',
    ref: HEIGHT_FOR_AGE_REF,
    field: 'heightCm',
  },
];

/** ประมาณ percentile จากแถบ P3/P50/P97 — ใช้แสดงบน badge ของกราฟเท่านั้น */
export const estimatePercentile = (refRows, x, y) => {
  if (!refRows?.length || y == null) return null;
  const row = interpolate(
    refRows.map((r) => [r.x, r.p3, r.p50, r.p97]),
    x,
  );
  const [, p3, p50, p97] = row;
  if (y <= p3) return 3;
  if (y >= p97) return 97;
  if (y < p50) return Math.round(3 + ((y - p3) / (p50 - p3)) * 47);
  return Math.round(50 + ((y - p50) / (p97 - p50)) * 47);
};

/* ── คัดกรองภาวะซีด (มติ คทง.5: ป.3 และ ม.2 เฉพาะนักเรียนหญิง) ────── */

export const ANEMIA_TARGET_GRADES = ['p3', 'm2'];

export const isAnemiaScreeningTarget = (student) =>
  !!student
  && student.sex === 'หญิง'
  && ANEMIA_TARGET_GRADES.includes(student.grade);

/** Hct (%) → แปลผลซีด (เกณฑ์ mock ตามช่วงอายุนักเรียน) */
export const classifyAnemia = (hct, ageYears) => {
  const v = Number(hct);
  if (!Number.isFinite(v) || v <= 0) return null;
  const cutoff = ageYears != null && ageYears >= 12 ? 36 : 34;
  if (v < cutoff - 4) return { key: 'severe', label: 'ซีดมาก', style: 'red', abnormal: true, cutoff };
  if (v < cutoff) return { key: 'anemic', label: 'ซีด', style: 'orange', abnormal: true, cutoff };
  return { key: 'normal', label: 'ปกติ', style: 'green', abnormal: false, cutoff };
};

/* ── ผลตรวจอื่น ๆ ที่ใช้ร่วมกันทั้งฟอร์ม + รายงาน ───────────────────── */

export const VISION_RESULTS = [
  { value: 'normal', label: 'ปกติ', style: 'green' },
  { value: 'refractive', label: 'สายตาผิดปกติ (สั้น/ยาว/เอียง)', style: 'orange' },
  { value: 'squint', label: 'ตาเข/ตาเหล่', style: 'orange' },
  { value: 'other', label: 'ผิดปกติอื่น ๆ', style: 'yellow' },
];

export const LICE_RESULTS = [
  { value: 'none', label: 'ไม่พบเหา', style: 'green' },
  { value: 'nits', label: 'พบไข่เหา', style: 'yellow' },
  { value: 'lice', label: 'พบตัวเหา', style: 'orange' },
];

export const DEV_RESULTS = [
  { value: 'normal', label: 'สมวัย', style: 'green' },
  { value: 'watch', label: 'ควรเฝ้าระวัง', style: 'yellow' },
  { value: 'delay', label: 'สงสัยล่าช้า', style: 'orange' },
];

export const MENTAL_RESULTS = [
  { value: 'normal', label: 'ปกติ', style: 'green' },
  { value: 'risk', label: 'มีความเสี่ยง', style: 'yellow' },
  { value: 'problem', label: 'มีปัญหา ควรส่งต่อ', style: 'red' },
];

export const resolveOption = (list, value) =>
  list.find((o) => o.value === value) || null;

export const optionLabel = (list, value) =>
  resolveOption(list, value)?.label || '—';
