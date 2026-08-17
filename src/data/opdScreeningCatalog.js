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
  PAIN_LEVELS.find((p) => p.key === key) || null;

/** ค่าที่ ScreeningPage เก็บคือเลข level (1–5) */
export const triageLevelByLevel = (lv) =>
  TRIAGE_LEVELS.find((t) => t.lv === Number(lv)) || null;
