/* เกณฑ์สัญญาณชีพสองระดับ (เฝ้าระวัง / อันตราย) ทั้งด้านสูงและด้านต่ำ —
   TOR 1.2.2.3. ย้ายออกมาจาก `pages/opd/ScreeningStep1.jsx` เพื่อให้
   คอมโพเนนต์ของ design system (VitalCard) เรียกใช้ได้โดยไม่เกิด import cycle
   (ScreeningStep1 → VitalsForm → VitalCard). ScreeningStep1 ยัง re-export
   ชื่อเดิมไว้ ผู้เรียกเก่าจึงไม่ต้องแก้.

   ไฟล์นี้ห้าม import อะไรเพิ่ม — ความไม่มี dependency คือเหตุผลที่มันอยู่ตรงนี้ */

export const VITAL_THRESHOLDS = {
  temp: { label: 'อุณหภูมิ', unit: '°C', highDanger: 39, highWarn: 37.5, lowWarn: 35.5, lowDanger: 35 },
  pulse: { label: 'ชีพจร', unit: 'ครั้ง/นาที', highDanger: 130, highWarn: 100, lowWarn: 55, lowDanger: 45 },
  resp: { label: 'การหายใจ', unit: 'ครั้ง/นาที', highDanger: 28, highWarn: 22, lowWarn: 10, lowDanger: 8 },
  sbp: { label: 'ความดัน (SBP)', unit: 'mmHg', highDanger: 180, highWarn: 140, lowWarn: 95, lowDanger: 85 },
  spo2: { label: 'SpO2', unit: '%', lowWarn: 95, lowDanger: 90 },
  /* เส้นรอบเอว — เกณฑ์ผู้ชาย (≤ 90 ซม.) ตามข้อความใต้ช่องกรอกใน VitalsForm
     ฟอร์มยังไม่มีเพศเป็น input จึงใช้เกณฑ์เดียว ไม่มีด้านต่ำ */
  waist: { label: 'เส้นรอบเอว', unit: 'ซม.', highDanger: 100, highWarn: 90 },
};

/** ประเมินค่าหนึ่งค่า → null | { tier: 'warn'|'danger', dir: 'high'|'low' } */
export const evaluateVital = (key, value) => {
  const t = VITAL_THRESHOLDS[key];
  if (!t || value === null || value === undefined || value === '') return null;
  const v = Number(value);
  if (Number.isNaN(v)) return null;
  if (t.highDanger !== undefined && v >= t.highDanger) return { tier: 'danger', dir: 'high' };
  if (t.lowDanger !== undefined && v <= t.lowDanger) return { tier: 'danger', dir: 'low' };
  if (t.highWarn !== undefined && v >= t.highWarn) return { tier: 'warn', dir: 'high' };
  if (t.lowWarn !== undefined && v <= t.lowWarn) return { tier: 'warn', dir: 'low' };
  return null;
};

/* ป้ายสถานะสี่ระดับ + ปกติ — โทนตรงกับ <Badge> ของ design system และกับ
   ป้าย "สูงเล็กน้อย / สูงมาก" ที่ PressureCard ใช้อยู่เดิม */
export const VITAL_BADGE_NORMAL = { tone: 'teal', label: 'ปกติ' };

export const VITAL_BADGE_BY_TIER = {
  'danger:high': { tone: 'red', label: 'สูงมาก' },
  'warn:high': { tone: 'orange', label: 'สูงเล็กน้อย' },
  'warn:low': { tone: 'orange', label: 'ต่ำเล็กน้อย' },
  'danger:low': { tone: 'red', label: 'ต่ำมาก' },
};

/** แปลงผลประเมินเป็นป้ายสถานะ — คืน `ปกติ` เมื่ออยู่ในเกณฑ์ */
export const badgeForEvaluation = (result) =>
  (result ? VITAL_BADGE_BY_TIER[`${result.tier}:${result.dir}`] : VITAL_BADGE_NORMAL);

/**
 * ป้ายสถานะของค่าที่กรอก — ใช้โดย VitalCard เมื่อส่ง `vitalKey` มาให้
 * คืน undefined เมื่อยังไม่มีการวัดจริง (ว่าง / 0 / ไม่ใช่ตัวเลข) เพื่อไม่ให้
 * ช่องที่ยังไม่ได้วัดถูกรับรองว่า "ปกติ"
 */
export const resolveVitalBadge = (key, value) => {
  if (!VITAL_THRESHOLDS[key]) return undefined;
  const v = Number(value);
  if (value === '' || value === null || value === undefined || !Number.isFinite(v) || v <= 0) {
    return undefined;
  }
  return badgeForEvaluation(evaluateVital(key, v));
};
