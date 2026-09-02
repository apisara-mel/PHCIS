/* Catalogs สำหรับจุดคัดกรอง (OPD Screening) — แยกออกมาจาก ScreeningPage
   เพราะตอนนี้ "คัดกรองและซักประวัติ" มีที่เดียว (`/opd/screening`) แล้วทุก
   คลินิกพิเศษอ่านผลไปแสดงต่อแบบอ่านอย่างเดียว — ฝั่งอ่านต้องแปลงค่าที่พยาบาล
   บันทึก (pain = key, triage = ตัวเลข level) กลับเป็น label/โทนสีให้ตรงกัน
   ถ้าปล่อยให้แต่ละที่ประกาศเอง เดี๋ยวก็เพี้ยนกันเหมือนที่เคยเป็นมา

   ScreeningPage import ไปใช้เป็นตัวเลือกในฟอร์ม · ฝั่งอ่านใช้ผ่าน
   `screeningHandoff.js` — ห้ามก๊อปตารางนี้ไปไว้ที่อื่น */

/* Figma PHCIS-OPD "ระดับความเจ็บปวด" — ชื่อ glyph ต้องเป็น Material Symbols
   จริง (`sentiment_calm`, `sentiment_stressed`, …) */
export const PAIN_LEVELS = [
  { key: 'none', label: 'ไม่ปวด', icon: 'sentiment_satisfied', tone: 'green' },
  { key: 'mild', label: 'เล็กน้อย', icon: 'sentiment_calm', tone: 'blue' },
  { key: 'mod', label: 'ปานกลาง', icon: 'sentiment_neutral', tone: 'yellow' },
  { key: 'severe', label: 'มาก', icon: 'sentiment_dissatisfied', tone: 'orange' },
  { key: 'agony', label: 'ทรมาน', icon: 'sentiment_stressed', tone: 'red' },
];

/* โทนสีของไอคอนหน้าคน — ย้ายมาจาก `ScreeningPage` เพื่อให้ทุกหน้าที่วาดปุ่ม
   ระดับความปวด (จุดคัดกรอง · เยี่ยมบ้าน) ใช้ชุดเดียวกัน */
export const PAIN_TONE_TOKENS = {
  green:  { bg: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', fg: 'var(--text-brandPrimary-default, #007549)' },
  blue:   { bg: 'var(--surface-alert-info, #F0F6FF)',              fg: 'var(--text-info-default, #1D4ED8)' },
  yellow: { bg: 'var(--surface-colorfulbadge-yellow, #FEF9C3)',    fg: 'var(--text-colorfulbadge-yellow, #A16207)' },
  orange: { bg: 'var(--surface-alert-warning, #FFF9F0)',           fg: 'var(--text-warning-default, #C2410C)' },
  red:    { bg: 'var(--surface-danger-quaternary, #FFF0F0)',       fg: 'var(--text-danger-default, #B91C1C)' },
};

/* ระดับความปวด 10 ระดับ (มติผู้ใช้ 2 ก.ย. 69) — ทั้งจุดคัดกรองและงานเยี่ยมบ้าน
   ใช้ชุดนี้ชุดเดียว ปุ่มเป็นการ์ดที่มีไอคอนหน้าคนนำหน้าตัวเลข

   ทุกระดับมีไอคอนของตัวเองและไล่สีทีละขั้น (มติผู้ใช้ 2 ก.ย. 69) — เดิมใช้
   ไอคอน/สีซ้ำกันทีละคู่ จนดูไม่ออกว่าต่างระดับกัน · ไล่จากเขียว → เทา-เขียว →
   เหลือง → ส้ม → แดง โดยแต่ละคู่สีมีขั้น "อ่อน" (พื้นจาง) และ "เข้ม" (พื้นเข้ม
   ตัวอักษรขาว) เพื่อให้ได้ 10 ขั้นจากชุดสีของ design system ที่มีอยู่จริง
   (`PAIN_LEVELS` 5 ระดับยังอยู่สำหรับข้อมูลเก่าที่บันทึกเป็น key เช่น 'mild') */
const PAIN_STEPS = [
  { icon: 'sentiment_very_satisfied',        band: 'ปวดน้อยที่สุด', tone: 'green',  bold: false },
  { icon: 'sentiment_satisfied',             band: 'ปวดน้อยมาก',    tone: 'green',  bold: true  },
  { icon: 'sentiment_calm',                  band: 'ปวดน้อย',       tone: 'teal',   bold: false },
  { icon: 'sentiment_content',               band: 'ปวดพอทน',       tone: 'teal',   bold: true  },
  { icon: 'sentiment_neutral',               band: 'ปวดปานกลาง',    tone: 'yellow', bold: false },
  { icon: 'sentiment_worried',               band: 'ปวดค่อนข้างมาก', tone: 'yellow', bold: true  },
  { icon: 'sentiment_frustrated',            band: 'ปวดมาก',        tone: 'orange', bold: false },
  { icon: 'sentiment_dissatisfied',          band: 'ปวดมากขึ้น',    tone: 'orange', bold: true  },
  { icon: 'sentiment_sad',                   band: 'ปวดรุนแรง',     tone: 'red',    bold: false },
  { icon: 'sentiment_extremely_dissatisfied', band: 'ปวดทรมาน',     tone: 'red',    bold: true  },
];

export const PAIN_SCALE_10 = PAIN_STEPS.map((step, i) => ({
  score: i + 1,
  key: `p${i + 1}`,
  label: String(i + 1),
  bandLabel: step.band,
  icon: step.icon,
  tone: step.tone,
  bold: step.bold,
}));

/** สีของวงกลมไอคอนในแต่ละระดับ — พื้นหลังเป็นโทนอ่อนเสมอ (มติผู้ใช้ 2 ก.ย. 69)
    ไล่ระดับด้วย "สีไอคอน" แทน: ขั้นแรกของแต่ละคู่สีใช้สีกลาง (`*-bold` ระดับ 500)
    ขั้นที่สองใช้สีเข้ม (`text-*` ระดับ 700) จึงอ่านออกว่าไล่จากอ่อนไปเข้มทีละขั้น
    โดยไม่มีวงกลมทึบสีจัดปนอยู่กลางแถว */
export const painToneStyle = (level) => {
  const tone = PAIN_TONE_TOKENS[level?.tone] || PAIN_TONE_TOKENS.green;
  return {
    bg: tone.bg,
    fg: level?.bold ? tone.fg : `var(--surface-colorfulbadge-${level?.tone || 'green'}-bold)`,
  };
};

/** ค่าที่หน้าจอเก็บเป็นตัวเลข 1–10 */
export const painLevelByScore = (score) =>
  PAIN_SCALE_10.find((p) => p.score === Number(score)) || null;

/* Figma PHCIS-OPD "ความเร่งด่วน" (5 ระดับ) — surface/text tokens ประกาศไว้
   ที่ --surface-triage-levelN / --text-triage-levelN */
export const TRIAGE_LEVELS = [
  { lv: 1, en: 'Resuscitation', th: 'วิกฤต', bg: 'var(--surface-triage-level1)', fg: 'var(--text-triage-level1)', tone: 'red' },
  { lv: 2, en: 'Emergency', th: 'ฉุกเฉิน', bg: 'var(--surface-triage-level2)', fg: 'var(--text-triage-level2)', tone: 'orange' },
  { lv: 3, en: 'Urgent', th: 'เร่งด่วน', bg: 'var(--surface-triage-level3)', fg: 'var(--text-triage-level3)', tone: 'yellow' },
  { lv: 4, en: 'Semi-urgent', th: 'ไม่เร่งด่วน', bg: 'var(--surface-triage-level4)', fg: 'var(--text-triage-level4)', tone: 'teal' },
  { lv: 5, en: 'Non-urgent', th: 'ทั่วไป', bg: 'var(--surface-triage-level5)', fg: 'var(--text-triage-level5)', tone: 'green' },
];

/** ค่าที่ ScreeningPage เก็บคือ `key` — คืน entry เต็มให้ฝั่งอ่าน */
export const painLevelByKey = (key) =>
  PAIN_LEVELS.find((p) => p.key === key)
  || PAIN_SCALE_10.find((p) => p.key === key)
  || null;

/** ค่าที่ ScreeningPage เก็บคือเลข level (1–5) */
export const triageLevelByLevel = (lv) =>
  TRIAGE_LEVELS.find((t) => t.lv === Number(lv)) || null;
