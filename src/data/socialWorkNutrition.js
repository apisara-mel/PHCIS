/* socialWorkNutrition.js — เมนูที่ 5 "การช่วยเหลือด้านโภชนาการ" ของงาน
   สังคมสงเคราะห์ (มติ คทง.10 ครั้งที่ 5 วันที่ 30 ต.ค. 68 ข้อ ChildNutri /
   PregNutri / AdultNutri / OlderNutri).

   4 กลุ่ม:
     child    — เด็ก 0–19 ปี : โปรแกรมคำนวณเทียบเกณฑ์อ้างอิงการเจริญเติบโต
     pregnant — หญิงตั้งครรภ์ : เทียบกราฟการเพิ่มขึ้นของน้ำหนักตามอายุครรภ์
     adult    — ผู้ใหญ่ : Modified NAF (A 0–5 / B 6–10 / C ≥ 11)
     elderly  — ผู้สูงอายุ : MNA (24–30 ปกติ / 17–23.5 เสี่ยง / < 17 ขาดสารอาหาร)

   ⚠️ เกณฑ์อ้างอิงการเจริญเติบโตเด็ก 0–19 ปี "อิงคณะทำงาน 5" และกราฟน้ำหนัก
   หญิงตั้งครรภ์ "อิงคณะทำงาน 2" ยังไม่ถูกส่งมอบเป็นตารางทางการ — ตารางใน
   ไฟล์นี้เป็น mock ที่ประมาณจากค่ามัธยฐาน WHO Child Growth Standards /
   กรมอนามัย และช่วงการเพิ่มน้ำหนักของ IOM 2009 ไว้ให้ระบบคำนวณเดินได้จริง
   เมื่อได้ตารางทางการให้แทนที่ `CHILD_MEDIAN` + `PREG_GAIN_RANGE` ทั้งชุด
   โดยไม่ต้องแก้หน้าจอ (สัญญาของฟังก์ชัน classify* คงเดิม). */

import { SW_CURRENT_USER, todayIso } from '@/data/socialWorkClinic';

/* ── sessionStorage plumbing (เหมือน socialWorkClinic.js) ───────────── */
const storageAvailable = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const readJson = (key, fallback) => {
  if (!storageAvailable()) return fallback;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(key) || 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  if (!storageAvailable()) return;
  window.sessionStorage.setItem(key, JSON.stringify(value));
};

const K = {
  cases: 'mih:sw:nutrition-cases',
  printLog: 'mih:sw:nutrition-print-log',
};

/* ── กลุ่มการช่วยเหลือ ─────────────────────────────────────────────── */
export const SW_NUTRI_GROUPS = [
  { value: 'child', label: 'เด็ก (0–19 ปี)', icon: 'child_care', tool: 'เกณฑ์อ้างอิงการเจริญเติบโต 0–19 ปี' },
  { value: 'pregnant', label: 'หญิงตั้งครรภ์', icon: 'pregnant_woman', tool: 'กราฟการเพิ่มน้ำหนักตามอายุครรภ์' },
  { value: 'adult', label: 'ผู้ใหญ่', icon: 'person', tool: 'Modified NAF' },
  { value: 'elderly', label: 'ผู้สูงอายุ', icon: 'elderly', tool: 'MNA Assessment' },
];

export const resolveSwNutriGroup = (value) =>
  SW_NUTRI_GROUPS.find((g) => g.value === value)?.label || '—';

/* ── เกณฑ์อ้างอิงการเจริญเติบโตเด็ก (mock — รอตารางทางการจาก คทง.5) ──
   ค่ามัธยฐาน (median) น้ำหนัก กก. / ส่วนสูง ซม. แยกเพศ ตามอายุ (เดือน).
   ระบบ interpolate เชิงเส้นระหว่างจุด แล้วแปลผลด้วย %ของค่ามัธยฐาน
   (แนวทาง Gomez / Waterlow ที่กรมอนามัยใช้ในตารางกระดาษเดิม). */
const CHILD_MEDIAN = {
  male: [
    { m: 0, w: 3.3, h: 49.9 }, { m: 6, w: 7.9, h: 67.6 }, { m: 12, w: 9.6, h: 75.7 },
    { m: 24, w: 12.2, h: 87.1 }, { m: 36, w: 14.3, h: 96.1 }, { m: 48, w: 16.3, h: 103.3 },
    { m: 60, w: 18.3, h: 110.0 }, { m: 84, w: 22.9, h: 121.7 }, { m: 108, w: 28.1, h: 132.2 },
    { m: 132, w: 34.4, h: 143.1 }, { m: 156, w: 45.3, h: 156.0 }, { m: 180, w: 56.8, h: 169.0 },
    { m: 204, w: 63.5, h: 175.0 }, { m: 228, w: 66.0, h: 176.5 },
  ],
  female: [
    { m: 0, w: 3.2, h: 49.1 }, { m: 6, w: 7.3, h: 65.7 }, { m: 12, w: 8.9, h: 74.0 },
    { m: 24, w: 11.5, h: 85.7 }, { m: 36, w: 13.9, h: 95.1 }, { m: 48, w: 16.1, h: 102.7 },
    { m: 60, w: 18.2, h: 109.4 }, { m: 84, w: 22.4, h: 120.8 }, { m: 108, w: 28.2, h: 132.5 },
    { m: 132, w: 36.9, h: 145.0 }, { m: 156, w: 45.8, h: 154.0 }, { m: 180, w: 52.0, h: 158.7 },
    { m: 204, w: 54.4, h: 159.7 }, { m: 228, w: 55.6, h: 160.0 },
  ],
};

const interpolate = (table, months, key) => {
  if (!table.length) return null;
  if (months <= table[0].m) return table[0][key];
  const last = table[table.length - 1];
  if (months >= last.m) return last[key];
  for (let i = 1; i < table.length; i += 1) {
    if (months <= table[i].m) {
      const a = table[i - 1];
      const b = table[i];
      const ratio = (months - a.m) / (b.m - a.m);
      return a[key] + (b[key] - a[key]) * ratio;
    }
  }
  return last[key];
};

/** อายุ (เดือน) จาก วดป.เกิด — ใช้กับข้อมูลที่เชื่อมจากเวชระเบียน */
export const ageInMonths = (birthIso, atIso) => {
  if (!birthIso) return null;
  const b = new Date(birthIso);
  const a = atIso ? new Date(atIso) : new Date();
  if (Number.isNaN(b.getTime()) || Number.isNaN(a.getTime())) return null;
  let months = (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());
  if (a.getDate() < b.getDate()) months -= 1;
  return Math.max(0, months);
};

export const formatAgeYm = (months) => {
  if (months == null) return '—';
  const y = Math.floor(months / 12);
  const m = months % 12;
  return `${y} ปี ${m} เดือน`;
};

/* แถบผลแปลของเด็ก — ใช้ทั้งบนจอและในรายงานฉบับที่ 12 */
export const CHILD_WFA_BANDS = [
  { key: 'severe', label: 'น้ำหนักน้อยกว่าเกณฑ์มาก', tone: 'danger', max: 0.60 },
  { key: 'under', label: 'น้ำหนักน้อยกว่าเกณฑ์', tone: 'danger', max: 0.75 },
  { key: 'risk', label: 'ค่อนข้างน้อยกว่าเกณฑ์', tone: 'warning', max: 0.90 },
  { key: 'normal', label: 'น้ำหนักตามเกณฑ์', tone: 'positive', max: 1.20 },
  { key: 'over', label: 'น้ำหนักมากกว่าเกณฑ์', tone: 'warning', max: Infinity },
];

export const CHILD_HFA_BANDS = [
  { key: 'severe', label: 'เตี้ยมาก', tone: 'danger', max: 0.85 },
  { key: 'short', label: 'เตี้ย', tone: 'danger', max: 0.90 },
  { key: 'risk', label: 'ค่อนข้างเตี้ย', tone: 'warning', max: 0.95 },
  { key: 'normal', label: 'ส่วนสูงตามเกณฑ์', tone: 'positive', max: 1.10 },
  { key: 'tall', label: 'ค่อนข้างสูง', tone: 'positive', max: Infinity },
];

const bandFor = (bands, ratio) => bands.find((b) => ratio < b.max) || bands[bands.length - 1];

/**
 * แปลผลภาวะโภชนาการเด็ก — ห้ามให้ผู้ใช้พิมพ์ทับ (มติ คทง.10 ครั้งที่ 5)
 * @returns {null | { wfaRatio, wfa, hfaRatio, hfa, summary, tone, needsHelp }}
 */
export const classifyChildNutrition = ({ sex, ageMonths, weightKg, heightCm }) => {
  const w = Number(weightKg);
  const h = Number(heightCm);
  if (!Number.isFinite(w) || w <= 0) return null;
  if (!Number.isFinite(h) || h <= 0) return null;
  if (ageMonths == null || !Number.isFinite(Number(ageMonths))) return null;
  const table = CHILD_MEDIAN[sex === 'หญิง' || sex === 'female' ? 'female' : 'male'];
  const months = Math.min(228, Math.max(0, Number(ageMonths)));
  const medW = interpolate(table, months, 'w');
  const medH = interpolate(table, months, 'h');
  const wfaRatio = w / medW;
  const hfaRatio = h / medH;
  const wfa = bandFor(CHILD_WFA_BANDS, wfaRatio);
  const hfa = bandFor(CHILD_HFA_BANDS, hfaRatio);
  const worst = [wfa, hfa].some((b) => b.tone === 'danger')
    ? 'danger'
    : ([wfa, hfa].some((b) => b.tone === 'warning') ? 'warning' : 'positive');
  return {
    wfaRatio,
    wfa,
    hfaRatio,
    hfa,
    medianWeight: medW,
    medianHeight: medH,
    tone: worst,
    needsHelp: worst !== 'positive',
    summary: `${wfa.label} (น้ำหนัก ${(wfaRatio * 100).toFixed(0)}% ของเกณฑ์) · ${hfa.label} (ส่วนสูง ${(hfaRatio * 100).toFixed(0)}% ของเกณฑ์)`,
  };
};

/* ── หญิงตั้งครรภ์ — ช่วงการเพิ่มน้ำหนักที่เหมาะสมตาม BMI ก่อนตั้งครรภ์ ──
   (mock อ้างอิงช่วง IOM 2009 กก./สัปดาห์ ในไตรมาส 2–3 + น้ำหนักเพิ่มรวม
   ไตรมาสแรกประมาณ 1.5 กก. — รอกราฟทางการจาก คทง.2) */
const PREG_GAIN_RANGE = [
  { key: 'under', label: 'BMI ก่อนตั้งครรภ์ < 18.5 (ผอม)', maxBmi: 18.5, first: 2.0, perWeek: [0.44, 0.58], total: [12.5, 18] },
  { key: 'normal', label: 'BMI 18.5–24.9 (ปกติ)', maxBmi: 25, first: 1.6, perWeek: [0.35, 0.50], total: [11.5, 16] },
  { key: 'over', label: 'BMI 25–29.9 (น้ำหนักเกิน)', maxBmi: 30, first: 1.0, perWeek: [0.23, 0.33], total: [7, 11.5] },
  { key: 'obese', label: 'BMI ≥ 30 (อ้วน)', maxBmi: Infinity, first: 0.5, perWeek: [0.17, 0.27], total: [5, 9] },
];

export const pregBmiBand = (bmi) => PREG_GAIN_RANGE.find((r) => bmi < r.maxBmi) || PREG_GAIN_RANGE[3];

/**
 * แปลผลภาวะโภชนาการหญิงตั้งครรภ์จากน้ำหนักที่เพิ่มเทียบอายุครรภ์
 * @returns {null | { bmi, band, gain, expectedMin, expectedMax, result, tone, needsHelp, summary }}
 */
export const classifyPregnancyNutrition = ({ heightCm, prePregnancyKg, currentKg, gestWeeks, hct, hb }) => {
  const h = Number(heightCm) / 100;
  const pre = Number(prePregnancyKg);
  const now = Number(currentKg);
  const wk = Number(gestWeeks);
  if (!(h > 0) || !(pre > 0) || !(now > 0) || !Number.isFinite(wk) || wk <= 0) return null;
  const bmi = pre / (h * h);
  const band = pregBmiBand(bmi);
  const gain = now - pre;
  const weeksAfterFirst = Math.max(0, Math.min(41, wk) - 13);
  const expectedMin = band.first * Math.min(1, wk / 13) + band.perWeek[0] * weeksAfterFirst;
  const expectedMax = band.first * Math.min(1, wk / 13) + band.perWeek[1] * weeksAfterFirst;
  const anemic = (Number(hct) > 0 && Number(hct) < 33) || (Number(hb) > 0 && Number(hb) < 11);
  let result;
  let tone;
  if (gain < expectedMin) { result = 'น้ำหนักเพิ่มน้อยกว่าเกณฑ์อายุครรภ์'; tone = 'danger'; }
  else if (gain > expectedMax) { result = 'น้ำหนักเพิ่มมากกว่าเกณฑ์อายุครรภ์'; tone = 'warning'; }
  else { result = 'น้ำหนักเพิ่มขึ้นตามเกณฑ์อายุครรภ์'; tone = 'positive'; }
  return {
    bmi,
    band,
    gain,
    expectedMin,
    expectedMax,
    anemic,
    result,
    tone: anemic && tone === 'positive' ? 'warning' : tone,
    needsHelp: tone !== 'positive' || anemic,
    summary: `${result} — เพิ่ม ${gain.toFixed(1)} กก. (เกณฑ์ ${expectedMin.toFixed(1)}–${expectedMax.toFixed(1)} กก. ที่ ${wk} สัปดาห์)${anemic ? ' · พบภาวะโลหิตจาง' : ''}`,
  };
};

/* ── ผู้ใหญ่ — Modified NAF (Nutrition Alert Form) ────────────────────
   แบบย่อ 7 ข้อ รวม 0–20 คะแนน แปลผลตามมติ:
   A 0–5 ไม่พบความเสี่ยง · B 6–10 เสี่ยง · C ≥ 11 ทุพโภชนาการ */
export const SW_NAF_ITEMS = [
  {
    key: 'weightLoss', label: 'น้ำหนักลดโดยไม่ตั้งใจใน 1–6 เดือนที่ผ่านมา',
    options: [
      { value: 0, label: 'ไม่ลด / ลดน้อยกว่า 5%' },
      { value: 2, label: 'ลด 5–10%' },
      { value: 4, label: 'ลดมากกว่า 10%' },
    ],
  },
  {
    key: 'intake', label: 'ปริมาณอาหารที่รับประทานได้เทียบกับปกติ',
    options: [
      { value: 0, label: 'ได้ตามปกติ' },
      { value: 2, label: 'ได้ประมาณครึ่งหนึ่ง' },
      { value: 3, label: 'ได้น้อยกว่าครึ่ง / รับประทานไม่ได้' },
    ],
  },
  {
    key: 'giSymptom', label: 'อาการทางระบบทางเดินอาหาร (เบื่ออาหาร คลื่นไส้ ท้องเสีย)',
    options: [
      { value: 0, label: 'ไม่มี' },
      { value: 1, label: 'มีเป็นบางครั้ง' },
      { value: 2, label: 'มีต่อเนื่องมากกว่า 2 สัปดาห์' },
    ],
  },
  {
    key: 'bmi', label: 'ดัชนีมวลกาย (BMI) ปัจจุบัน',
    options: [
      { value: 0, label: 'BMI ≥ 18.5' },
      { value: 2, label: 'BMI 17.0–18.4' },
      { value: 3, label: 'BMI < 17.0' },
    ],
  },
  {
    key: 'disease', label: 'ภาวะโรคร่วมที่มีผลต่อภาวะโภชนาการ',
    options: [
      { value: 0, label: 'ไม่มี' },
      { value: 2, label: 'มีโรคเรื้อรัง 1 โรค' },
      { value: 3, label: 'มีโรคเรื้อรังหลายโรค / มะเร็ง / ไตวาย' },
    ],
  },
  {
    key: 'function', label: 'ความสามารถในการช่วยเหลือตนเอง',
    options: [
      { value: 0, label: 'ช่วยเหลือตนเองได้' },
      { value: 2, label: 'ต้องมีผู้ช่วยบางส่วน' },
      { value: 3, label: 'ติดเตียง / ช่วยเหลือตนเองไม่ได้' },
    ],
  },
  {
    key: 'economy', label: 'ปัญหาเศรษฐานะที่มีผลต่อการเข้าถึงอาหาร',
    options: [
      { value: 0, label: 'ไม่มีปัญหา' },
      { value: 2, label: 'มีปัญหาบางส่วน' },
    ],
  },
];

export const SW_NAF_MAX = SW_NAF_ITEMS.reduce(
  (sum, i) => sum + Math.max(...i.options.map((o) => o.value)), 0,
);

export const isNafComplete = (answers) =>
  SW_NAF_ITEMS.every((i) => answers && answers[i.key] != null);

export const scoreNaf = (answers) =>
  SW_NAF_ITEMS.reduce((sum, i) => sum + (Number(answers?.[i.key]) || 0), 0);

export const NAF_BANDS = [
  { key: 'A', label: 'Modified NAF = A (0–5 คะแนน) ไม่พบความเสี่ยงต่อการเกิดภาวะทุพโภชนาการ', tone: 'positive', max: 5 },
  { key: 'B', label: 'Modified NAF = B (6–10 คะแนน) พบความเสี่ยงต่อการเกิดภาวะทุพโภชนาการ', tone: 'warning', max: 10 },
  { key: 'C', label: 'Modified NAF = C (≥ 11 คะแนน) พบภาวะทุพโภชนาการ', tone: 'danger', max: Infinity },
];

export const interpretNaf = (total) => NAF_BANDS.find((b) => total <= b.max) || NAF_BANDS[2];

/* ── ผู้สูงอายุ — MNA Assessment (เต็ม 30 คะแนน) ─────────────────────── */
export const SW_MNA_ITEMS = [
  {
    key: 'intakeDecline', label: 'รับประทานอาหารลดลงใน 3 เดือนที่ผ่านมา',
    options: [{ value: 0, label: 'ลดลงมาก' }, { value: 1, label: 'ลดลงปานกลาง' }, { value: 2, label: 'ไม่ลดลง' }],
  },
  {
    key: 'weightLoss', label: 'น้ำหนักลดใน 3 เดือนที่ผ่านมา',
    options: [{ value: 0, label: 'ลดมากกว่า 3 กก.' }, { value: 1, label: 'ไม่ทราบ' }, { value: 2, label: 'ลด 1–3 กก.' }, { value: 3, label: 'ไม่ลด' }],
  },
  {
    key: 'mobility', label: 'ความสามารถในการเคลื่อนไหว',
    options: [{ value: 0, label: 'ติดเตียง/ติดเก้าอี้' }, { value: 1, label: 'ลุกจากเตียงได้แต่ไม่ออกนอกบ้าน' }, { value: 2, label: 'ออกนอกบ้านได้' }],
  },
  {
    key: 'stress', label: 'มีความเครียดรุนแรงหรือเจ็บป่วยเฉียบพลันใน 3 เดือน',
    options: [{ value: 0, label: 'มี' }, { value: 2, label: 'ไม่มี' }],
  },
  {
    key: 'neuro', label: 'ปัญหาทางระบบประสาท/จิตใจ',
    options: [{ value: 0, label: 'สมองเสื่อมรุนแรง/ซึมเศร้า' }, { value: 1, label: 'สมองเสื่อมเล็กน้อย' }, { value: 2, label: 'ไม่มีปัญหา' }],
  },
  {
    key: 'bmi', label: 'ดัชนีมวลกาย (BMI)',
    options: [{ value: 0, label: 'BMI < 19' }, { value: 1, label: 'BMI 19–20.9' }, { value: 2, label: 'BMI 21–22.9' }, { value: 3, label: 'BMI ≥ 23' }],
  },
  {
    key: 'independent', label: 'อาศัยอยู่ในบ้านของตนเอง (ไม่ใช่สถานสงเคราะห์/โรงพยาบาล)',
    options: [{ value: 0, label: 'ไม่ใช่' }, { value: 1, label: 'ใช่' }],
  },
  {
    key: 'drugs', label: 'ใช้ยามากกว่า 3 ชนิดต่อวัน',
    options: [{ value: 0, label: 'ใช่' }, { value: 1, label: 'ไม่ใช่' }],
  },
  {
    key: 'pressureSore', label: 'มีแผลกดทับหรือแผลที่ผิวหนัง',
    options: [{ value: 0, label: 'มี' }, { value: 1, label: 'ไม่มี' }],
  },
  {
    key: 'meals', label: 'จำนวนมื้ออาหารหลักต่อวัน',
    options: [{ value: 0, label: '1 มื้อ' }, { value: 1, label: '2 มื้อ' }, { value: 2, label: '3 มื้อ' }],
  },
  {
    key: 'protein', label: 'การได้รับโปรตีน (นม ไข่ ถั่ว เนื้อสัตว์)',
    options: [{ value: 0, label: 'ได้ 0–1 กลุ่ม' }, { value: 0.5, label: 'ได้ 2 กลุ่ม' }, { value: 1, label: 'ได้ครบ 3 กลุ่ม' }],
  },
  {
    key: 'fruit', label: 'รับประทานผักหรือผลไม้ ≥ 2 ส่วนต่อวัน',
    options: [{ value: 0, label: 'ไม่ใช่' }, { value: 1, label: 'ใช่' }],
  },
  {
    key: 'fluid', label: 'ปริมาณน้ำดื่มต่อวัน',
    options: [{ value: 0, label: 'น้อยกว่า 3 แก้ว' }, { value: 0.5, label: '3–5 แก้ว' }, { value: 1, label: 'มากกว่า 5 แก้ว' }],
  },
  {
    key: 'feedMode', label: 'ลักษณะการรับประทานอาหาร',
    options: [{ value: 0, label: 'ต้องมีคนป้อน' }, { value: 1, label: 'รับประทานเองได้แต่ลำบาก' }, { value: 2, label: 'รับประทานเองได้ปกติ' }],
  },
  {
    key: 'selfView', label: 'มองว่าตนเองมีปัญหาด้านโภชนาการ',
    options: [{ value: 0, label: 'ขาดสารอาหาร' }, { value: 1, label: 'ไม่แน่ใจ' }, { value: 2, label: 'ไม่มีปัญหา' }],
  },
  {
    key: 'peerView', label: 'เปรียบเทียบสุขภาพตนเองกับผู้สูงอายุวัยเดียวกัน',
    options: [{ value: 0, label: 'ไม่ดีเท่า' }, { value: 0.5, label: 'ไม่ทราบ' }, { value: 1, label: 'ดีเท่ากัน' }, { value: 2, label: 'ดีกว่า' }],
  },
  {
    key: 'midArm', label: 'เส้นรอบวงกลางแขน (MAC, ซม.)',
    options: [{ value: 0, label: 'น้อยกว่า 21' }, { value: 0.5, label: '21–21.9' }, { value: 1, label: 'ตั้งแต่ 22 ขึ้นไป' }],
  },
  {
    key: 'calf', label: 'เส้นรอบวงน่อง (CC, ซม.)',
    options: [{ value: 0, label: 'น้อยกว่า 31' }, { value: 1, label: 'ตั้งแต่ 31 ขึ้นไป' }],
  },
];

export const SW_MNA_MAX = SW_MNA_ITEMS.reduce(
  (sum, i) => sum + Math.max(...i.options.map((o) => o.value)), 0,
);

export const isMnaComplete = (answers) =>
  SW_MNA_ITEMS.every((i) => answers && answers[i.key] != null);

export const scoreMna = (answers) =>
  SW_MNA_ITEMS.reduce((sum, i) => sum + (Number(answers?.[i.key]) || 0), 0);

export const MNA_BANDS = [
  { key: 'malnourished', label: 'MNA < 17 คะแนน — ขาดสารอาหาร', tone: 'danger', max: 16.99 },
  { key: 'atRisk', label: 'MNA 17–23.5 คะแนน — มีความเสี่ยงต่อการขาดสารอาหาร', tone: 'warning', max: 23.5 },
  { key: 'normal', label: 'MNA 24–30 คะแนน — ภาวะโภชนาการปกติ', tone: 'positive', max: Infinity },
];

export const interpretMna = (total) => MNA_BANDS.find((b) => total <= b.max) || MNA_BANDS[2];

/* ── กลุ่มเป้าหมายที่ช่วยเหลือ (เฉพาะครั้งแรก) ───────────────────────── */
export const SW_NUTRI_TARGETS = {
  child: [
    { value: 'c-1-1', label: 'ขาดสารอาหาร — มีน้ำหนักค่อนข้างน้อยเมื่อเทียบเกณฑ์น้ำหนักตามเกณฑ์อายุ' },
    { value: 'c-1-2', label: 'ขาดสารอาหาร — มีน้ำหนักน้อยกว่าเกณฑ์น้ำหนักตามเกณฑ์อายุ' },
    { value: 'c-1-3', label: 'ขาดสารอาหาร — ค่อนข้างเตี้ยเมื่อเทียบเกณฑ์ส่วนสูงตามเกณฑ์อายุ' },
    { value: 'c-1-4', label: 'ขาดสารอาหาร — เตี้ยเมื่อเทียบเกณฑ์ส่วนสูงตามเกณฑ์อายุ' },
    { value: 'c-2-1', label: 'เสี่ยงขาดสารอาหาร — แรกเกิดน้ำหนักน้อยกว่า 2,500 กรัม' },
    { value: 'c-2-2', label: 'เสี่ยงขาดสารอาหาร — มีโรคเสี่ยงต่อภาวะขาดสารอาหาร' },
    { value: 'c-2-3', label: 'เสี่ยงขาดสารอาหาร — มารดาติดเชื้อ HIV หรือใช้สารเสพติด ไม่สามารถให้นมได้' },
    { value: 'c-2-4', label: 'เสี่ยงขาดสารอาหาร — ผู้ปกครองมีปัญหาเศรษฐานะ' },
  ],
  pregnant: [
    { value: 'p-1-1', label: 'ขาดสารอาหาร — น้ำหนักเพิ่มน้อยเมื่อเทียบกับอายุครรภ์' },
    { value: 'p-2-1', label: 'เสี่ยงขาดสารอาหาร — มีภาวะโลหิตจาง (Hct < 33% หรือ Hb < 11 g/dl)' },
    { value: 'p-2-2', label: 'เสี่ยงขาดสารอาหาร — มีปัญหาเศรษฐานะ' },
  ],
  adult: [
    { value: 'a-1-1', label: 'ขาดสารอาหาร — Modified NAF = C (≥ 11 คะแนน)' },
    { value: 'a-2-1', label: 'เสี่ยงขาดสารอาหาร — Modified NAF = B (6–10 คะแนน)' },
    { value: 'a-2-2', label: 'เสี่ยงขาดสารอาหาร — มีปัญหาเศรษฐานะ' },
  ],
  elderly: [
    { value: 'e-1-1', label: 'ขาดสารอาหาร — MNA < 17 คะแนน' },
    { value: 'e-2-1', label: 'เสี่ยงขาดสารอาหาร — MNA 17–23.5 คะแนน' },
    { value: 'e-2-2', label: 'เสี่ยงขาดสารอาหาร — มีปัญหาเศรษฐานะ' },
  ],
};

/* ── วัสดุที่ให้การช่วยเหลือ + ขนาด + หน่วย (dropdown ทั้ง 3 ชั้น) ────
   `supplyCode` = รหัสวัสดุในคลังงานสังคมสงเคราะห์ (socialWorkSupplies.js)
   ใช้เชื่อมบัญชี "จ่ายออก" ของหน้ารับ-จ่ายวัสดุ — รายการที่ยังไม่มีรหัสใน
   คลัง (อาหารเด็กเกษตร / ขนมผิงเกษตร) ให้เป็น null แล้วบันทึกเฉพาะในเคส
   โภชนาการจนกว่าคลังจะเพิ่มรหัสให้ */
export const SW_NUTRI_MATERIALS = {
  child: [
    { value: 'infant-formula', label: 'นมผงสำหรับทารก (0 – 1 ปี)', sizes: ['500 กรัม', '550 กรัม', '600 กรัม'], units: ['กล่อง', 'ถุง'], supplyCode: 'M-01' },
    { value: 'toddler-formula', label: 'นมผงสำหรับทารกและเด็กเล็ก (6 เดือน – 3 ปี)', sizes: ['500 กรัม', '550 กรัม', '600 กรัม'], units: ['กล่อง', 'ถุง'], supplyCode: 'M-02' },
    { value: 'kaset-baby-food', label: 'อาหารเด็กเกษตร (6 เดือน – 3 ปี)', sizes: ['500 กรัม'], units: ['กล่อง', 'ถุง'], supplyCode: null },
    { value: 'kaset-snack', label: 'ขนมผิงเกษตร (1 – 5 ปี)', sizes: ['400 กรัม'], units: ['กล่อง', 'ถุง'], supplyCode: null },
  ],
  pregnant: [
    { value: 'maternal-formula', label: 'นมผงสำหรับหญิงตั้งครรภ์', sizes: ['350 กรัม', '550 กรัม'], units: ['กระป๋อง', 'กล่อง'], supplyCode: 'M-02' },
  ],
  adult: [
    { value: 'medical-food', label: 'อาหารทางการแพทย์', sizes: ['400 กรัม', '800 กรัม'], units: ['กระป๋อง'], supplyCode: 'M-03' },
  ],
  elderly: [
    { value: 'medical-food', label: 'อาหารทางการแพทย์', sizes: ['400 กรัม', '800 กรัม'], units: ['กระป๋อง'], supplyCode: 'M-03' },
  ],
};

export const nutriMaterialOptions = (group) =>
  (SW_NUTRI_MATERIALS[group] || []).map((m) => ({ value: m.value, label: m.label }));

export const findNutriMaterial = (group, value) =>
  (SW_NUTRI_MATERIALS[group] || []).find((m) => m.value === value) || null;

export const resolveNutriMaterialLabel = (group, value) =>
  findNutriMaterial(group, value)?.label || '—';

/* ── เหตุผลการยุติการช่วยเหลือ (เฉพาะรายกลุ่ม) ────────────────────── */
export const SW_NUTRI_END_REASONS = {
  child: [
    'ภาวะโภชนาการเป็นปกติ (น้ำหนักตามเกณฑ์)',
    'ภาวะโภชนาการเป็นปกติ (ส่วนสูงตามเกณฑ์)',
    'ครบระยะเวลาการช่วยเหลือ 6 เดือน สำหรับกลุ่มเสี่ยงขาดสารอาหาร',
    'ติดตามไม่ได้',
    'ย้ายไปรับบริการที่อื่น',
    'มีปัญหาในการรับประทาน เช่น ท้องอืด ท้องผูก ท้องเสีย',
    'เสียชีวิต',
  ],
  pregnant: [
    'ภาวะโภชนาการเป็นปกติ (น้ำหนักเพิ่มขึ้นตามอายุครรภ์)',
    'ติดตามไม่ได้',
    'ย้ายไปรับบริการที่อื่น',
    'มีปัญหาในการรับประทานนมผงสำหรับหญิงตั้งครรภ์',
    'สิ้นสุดการตั้งครรภ์',
    'เสียชีวิต',
  ],
  adult: [
    'ภาวะโภชนาการเป็นปกติ (Modified NAF = A 0–5 คะแนน)',
    'ครบระยะเวลาการช่วยเหลือ 6 เดือน สำหรับกลุ่มเสี่ยงขาดสารอาหาร',
    'ติดตามไม่ได้',
    'ย้ายไปรับบริการที่อื่น',
    'มีปัญหาในการรับประทานอาหารทางการแพทย์',
    'เสียชีวิต',
  ],
  elderly: [
    'ภาวะโภชนาการเป็นปกติ (MNA 24–30 คะแนน)',
    'ครบระยะเวลาการช่วยเหลือ 6 เดือน สำหรับกลุ่มเสี่ยงขาดสารอาหาร',
    'ติดตามไม่ได้',
    'ย้ายไปรับบริการที่อื่น',
    'มีปัญหาในการรับประทานอาหารทางการแพทย์',
    'เสียชีวิต',
  ],
};

/* ── mock เคสตั้งต้น (ศูนย์บริการสาธารณสุข 21 วัดธาตุทอง) ───────────── */
const SEED = [
  {
    id: 'nut-1', group: 'child', hn: '67-00031', sn: 'SN/2569/21/0041',
    name: 'ด.ช.ปุณณวิช แจ่มใส', cid: '1102700845513', birthDate: '2024-03-18', sex: 'ชาย',
    caseNo: 'สค.0010/2569', birthWeightG: 2380,
    target: 'c-2-1',
    status: 'active',
    visits: [
      { id: 'nv-1', date: '2026-05-14', weightKg: 8.1, heightCm: 76.0, material: 'toddler-formula', size: '500 กรัม', qty: 4, unit: 'กล่อง', note: 'ผู้ปกครองรับนมผงครั้งแรก แนะนำวิธีชง', by: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', at: '2026-05-14T10:12:00' },
      { id: 'nv-2', date: '2026-06-18', weightKg: 8.6, heightCm: 78.2, material: 'toddler-formula', size: '500 กรัม', qty: 4, unit: 'กล่อง', note: 'น้ำหนักขึ้น 0.5 กก. ผู้ปกครองรายงานเด็กดื่มได้ดี', by: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', at: '2026-06-18T09:40:00' },
      { id: 'nv-3', date: '2026-07-23', weightKg: 9.2, heightCm: 80.1, material: 'toddler-formula', size: '550 กรัม', qty: 4, unit: 'กล่อง', note: 'แนะนำอาหารตามวัยเพิ่มเติม', by: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', at: '2026-07-23T11:05:00' },
    ],
    recordedBy: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', recordedAt: '2026-05-14T10:12:00',
  },
  {
    id: 'nut-2', group: 'pregnant', hn: '67-00019', sn: 'SN/2569/21/0019',
    name: 'นันทิดา พรเลิศ', cid: '1101400963275', birthDate: '1998-02-04', sex: 'หญิง',
    caseNo: '', heightCm: 158, prePregnancyKg: 46, gestWeeks: 28, hct: 31, hb: 10.4,
    target: 'p-2-1',
    status: 'active',
    visits: [
      { id: 'nv-4', date: '2026-06-05', weightKg: 50.5, gestWeeks: 20, hct: 31, hb: 10.4, material: 'maternal-formula', size: '350 กรัม', qty: 3, unit: 'กระป๋อง', note: 'พบภาวะโลหิตจาง ประสานคลินิกฝากครรภ์ให้ยาเสริมธาตุเหล็ก', by: 'นักสังคมสงเคราะห์ พีระพัฒน์ เกื้อกูล', at: '2026-06-05T13:22:00' },
      { id: 'nv-5', date: '2026-07-10', weightKg: 52.0, gestWeeks: 25, hct: 32, hb: 10.8, material: 'maternal-formula', size: '350 กรัม', qty: 3, unit: 'กระป๋อง', note: 'น้ำหนักเพิ่มช้ากว่าเกณฑ์เล็กน้อย', by: 'นักสังคมสงเคราะห์ พีระพัฒน์ เกื้อกูล', at: '2026-07-10T14:02:00' },
    ],
    recordedBy: 'นักสังคมสงเคราะห์ พีระพัฒน์ เกื้อกูล', recordedAt: '2026-06-05T13:22:00',
  },
  {
    id: 'nut-3', group: 'adult', hn: '67-00012', sn: 'SN/2569/21/0001',
    name: 'วิชัย รุ่งเรือง', cid: '3100600287451', birthDate: '1966-08-22', sex: 'ชาย',
    caseNo: 'สค.0001/2569', heightCm: 168,
    target: 'a-1-1',
    naf: { weightLoss: 4, intake: 2, giSymptom: 1, bmi: 2, disease: 3, function: 3, economy: 2 },
    status: 'active',
    visits: [
      { id: 'nv-6', date: '2026-05-20', weightKg: 54, heightCm: 168, material: 'medical-food', size: '400 กรัม', qty: 6, unit: 'กระป๋อง', note: 'ผู้ป่วยติดเตียง ญาติรับอาหารทางการแพทย์แทน', by: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', at: '2026-05-20T09:15:00' },
      { id: 'nv-7', date: '2026-06-25', weightKg: 54.5, heightCm: 168, material: 'medical-food', size: '400 กรัม', qty: 6, unit: 'กระป๋อง', note: 'ประเมินซ้ำ NAF = C ยังต้องช่วยเหลือต่อ', by: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', at: '2026-06-25T10:30:00' },
      { id: 'nv-8', date: '2026-07-22', weightKg: 55.8, heightCm: 168, material: 'medical-food', size: '800 กรัม', qty: 3, unit: 'กระป๋อง', note: 'น้ำหนักเริ่มขึ้น แผลกดทับดีขึ้น', by: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', at: '2026-07-22T11:44:00' },
    ],
    recordedBy: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', recordedAt: '2026-05-20T09:15:00',
  },
  {
    id: 'nut-4', group: 'elderly', hn: '67-00005', sn: 'SN/2569/21/0007',
    name: 'สุดา ปลอดโปร่ง', cid: '3550900192864', birthDate: '1959-01-30', sex: 'หญิง',
    caseNo: 'สค.0007/2569', heightCm: 152,
    target: 'e-2-1',
    mna: {
      intakeDecline: 1, weightLoss: 2, mobility: 1, stress: 2, neuro: 2, bmi: 1,
      independent: 1, drugs: 0, pressureSore: 1, meals: 1, protein: 0.5, fruit: 0,
      fluid: 0.5, feedMode: 2, selfView: 1, peerView: 1, midArm: 0.5, calf: 1,
    },
    status: 'ended',
    endedReason: 'ภาวะโภชนาการเป็นปกติ (MNA 24–30 คะแนน)',
    endedBy: 'นักสังคมสงเคราะห์ พีระพัฒน์ เกื้อกูล',
    endedAt: '2026-07-30T15:20:00',
    visits: [
      { id: 'nv-9', date: '2026-04-08', weightKg: 44, heightCm: 152, material: 'medical-food', size: '400 กรัม', qty: 4, unit: 'กระป๋อง', note: 'เริ่มช่วยเหลือ MNA 19 คะแนน', by: 'นักสังคมสงเคราะห์ พีระพัฒน์ เกื้อกูล', at: '2026-04-08T09:50:00' },
      { id: 'nv-10', date: '2026-06-11', weightKg: 46.2, heightCm: 152, material: 'medical-food', size: '400 กรัม', qty: 4, unit: 'กระป๋อง', note: 'น้ำหนักเพิ่ม รับประทานได้ดีขึ้น', by: 'นักสังคมสงเคราะห์ พีระพัฒน์ เกื้อกูล', at: '2026-06-11T10:20:00' },
    ],
    recordedBy: 'นักสังคมสงเคราะห์ พีระพัฒน์ เกื้อกูล', recordedAt: '2026-04-08T09:50:00',
  },
  {
    id: 'nut-5', group: 'child', hn: '67-00033', sn: 'SN/2569/21/0045',
    name: 'ด.ญ.พิมพ์ชนก ตั้งใจดี', cid: '1103700912284', birthDate: '2021-11-05', sex: 'หญิง',
    caseNo: '', birthWeightG: 3100,
    target: 'c-2-4',
    status: 'cancelled',
    cancellation: { reason: 'บันทึกซ้ำกับเคส SN/2569/21/0046 — ยุบรวมเป็นรายการเดียว', by: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์', at: '2026-07-06T16:10:00' },
    visits: [
      { id: 'nv-11', date: '2026-06-30', weightKg: 13.4, heightCm: 96.0, material: 'kaset-snack', size: '400 กรัม', qty: 2, unit: 'ถุง', note: 'ครอบครัวมีปัญหาเศรษฐานะ', by: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์', at: '2026-06-30T14:35:00' },
    ],
    recordedBy: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์', recordedAt: '2026-06-30T14:35:00',
  },
];

/* ── CRUD (แสดง / บันทึก / แก้ไข / ยกเลิก + กู้คืน + ยุติ/เปิดใหม่) ──── */
export const getSwNutritionCases = () => {
  const overlay = readJson(K.cases, {});
  const seedIds = SEED.map((r) => r.id);
  const merged = SEED.map((r) => (overlay[r.id] ? { ...r, ...overlay[r.id] } : r));
  const added = Object.values(overlay).filter((r) => !seedIds.includes(r.id));
  return [...merged, ...added];
};

export const getSwNutritionCase = (id) => getSwNutritionCases().find((c) => c.id === id) || null;

export const saveSwNutritionCase = (entry) => {
  const overlay = readJson(K.cases, {});
  const previous = entry.id ? getSwNutritionCase(entry.id) : null;
  const editLog = [...(previous?.editLog || [])];
  if (previous) editLog.push({ by: SW_CURRENT_USER, at: new Date().toISOString() });
  const saved = {
    ...(previous || {}),
    ...entry,
    id: entry.id || `nut-new-${Date.now()}`,
    visits: entry.visits || previous?.visits || [],
    status: entry.status || previous?.status || 'active',
    recordedBy: previous?.recordedBy || SW_CURRENT_USER,
    recordedAt: previous?.recordedAt || new Date().toISOString(),
    editLog,
  };
  overlay[saved.id] = saved;
  writeJson(K.cases, overlay);
  return { saved, isNew: !previous };
};

export const addSwNutritionVisit = (caseId, visit) => {
  const current = getSwNutritionCase(caseId);
  if (!current) return null;
  const entry = {
    ...visit,
    id: visit.id || `nv-new-${Date.now()}`,
    date: visit.date || todayIso(),
    by: SW_CURRENT_USER,
    at: new Date().toISOString(),
  };
  return saveSwNutritionCase({ ...current, visits: [...(current.visits || []), entry] });
};

export const updateSwNutritionVisit = (caseId, visitId, patch) => {
  const current = getSwNutritionCase(caseId);
  if (!current) return null;
  const visits = (current.visits || []).map((v) => (v.id === visitId
    ? { ...v, ...patch, editedBy: SW_CURRENT_USER, editedAt: new Date().toISOString() }
    : v));
  return saveSwNutritionCase({ ...current, visits });
};

export const cancelSwNutritionVisit = (caseId, visitId, reason) => {
  const current = getSwNutritionCase(caseId);
  if (!current) return null;
  const visits = (current.visits || []).map((v) => (v.id === visitId
    ? { ...v, cancelled: { reason: reason || '', by: SW_CURRENT_USER, at: new Date().toISOString() } }
    : v));
  return saveSwNutritionCase({ ...current, visits });
};

export const restoreSwNutritionVisit = (caseId, visitId) => {
  const current = getSwNutritionCase(caseId);
  if (!current) return null;
  const visits = (current.visits || []).map((v) => (v.id === visitId ? { ...v, cancelled: null } : v));
  return saveSwNutritionCase({ ...current, visits });
};

export const cancelSwNutritionCase = (id, reason) => {
  const current = getSwNutritionCase(id);
  if (!current) return null;
  return saveSwNutritionCase({
    ...current,
    status: 'cancelled',
    cancellation: { reason: reason || '', by: SW_CURRENT_USER, at: new Date().toISOString() },
  });
};

export const reactivateSwNutritionCase = (id) => {
  const current = getSwNutritionCase(id);
  if (!current) return null;
  return saveSwNutritionCase({ ...current, status: 'active', cancellation: null });
};

/** ยุติการช่วยเหลือ → เคสถูก freeze เป็นอ่านอย่างเดียว (มติ คทง.10 ครั้งที่ 5) */
export const endSwNutritionCase = (id, reason) => {
  const current = getSwNutritionCase(id);
  if (!current) return null;
  return saveSwNutritionCase({
    ...current,
    status: 'ended',
    endedReason: reason,
    endedBy: SW_CURRENT_USER,
    endedAt: new Date().toISOString(),
  });
};

export const reopenSwNutritionCase = (id, reason) => {
  const current = getSwNutritionCase(id);
  if (!current) return null;
  return saveSwNutritionCase({
    ...current,
    status: 'active',
    reopen: { reason: reason || '', by: SW_CURRENT_USER, at: new Date().toISOString() },
    endedReason: '',
  });
};

export const logSwNutritionPrint = (caseId, docType) => {
  const log = readJson(K.printLog, {});
  log[caseId] = [...(log[caseId] || []), { docType, by: SW_CURRENT_USER, at: new Date().toISOString() }];
  writeJson(K.printLog, log);
};

export const getSwNutritionPrintLog = (caseId) => readJson(K.printLog, {})[caseId] || [];

/** ผลแปลอัตโนมัติของเคส — เลือกเครื่องมือตามกลุ่ม (ห้ามพิมพ์ทับ) */
export const assessSwNutritionCase = (entry, visit) => {
  if (!entry) return null;
  const latest = visit || [...(entry.visits || [])].filter((v) => !v.cancelled).pop();
  if (!latest) return null;
  if (entry.group === 'child') {
    return classifyChildNutrition({
      sex: entry.sex,
      ageMonths: ageInMonths(entry.birthDate, latest.date),
      weightKg: latest.weightKg,
      heightCm: latest.heightCm,
    });
  }
  if (entry.group === 'pregnant') {
    return classifyPregnancyNutrition({
      heightCm: entry.heightCm,
      prePregnancyKg: entry.prePregnancyKg,
      currentKg: latest.weightKg,
      gestWeeks: latest.gestWeeks || entry.gestWeeks,
      hct: latest.hct ?? entry.hct,
      hb: latest.hb ?? entry.hb,
    });
  }
  if (entry.group === 'adult') {
    if (!isNafComplete(entry.naf)) return null;
    const total = scoreNaf(entry.naf);
    const band = interpretNaf(total);
    return { total, band, tone: band.tone, needsHelp: band.key !== 'A', summary: band.label };
  }
  if (entry.group === 'elderly') {
    if (!isMnaComplete(entry.mna)) return null;
    const total = scoreMna(entry.mna);
    const band = interpretMna(total);
    return { total, band, tone: band.tone, needsHelp: band.key !== 'normal', summary: `${band.label} (${total} คะแนน)` };
  }
  return null;
};

export default SW_NUTRI_GROUPS;
