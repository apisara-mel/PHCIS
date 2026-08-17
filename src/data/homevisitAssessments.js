/* งานเยี่ยมบ้าน — เครื่องมือประเมินมาตรฐาน (MNA-SF · 9Q · PPS).

   ที่มา: มติคณะทำงาน คทง.4 (พยาบาลต่อเนื่องที่บ้าน) ต่อ TOR §1.18.5
     “เลิกใช้ Free-text ในแบบประเมิน เปลี่ยนเป็น Dropdown และเครื่องมือ
      มาตรฐาน (MNA · 2Q/9Q · ADL · PPS) โดยระบบคำนวณคะแนนให้อัตโนมัติ —
      ของเดิมนิยาม ‘ดีขึ้น/แย่ลง’ ไม่ชัดจนวิเคราะห์ข้อมูลไม่ได้”

   ADL (ดัชนีบาร์เธล) และ 2Q อยู่ใน `homevisitVisits.js` แล้ว ไฟล์นี้เติม
   ส่วนที่ยังขาดให้ครบชุด และคืนค่าเป็นรูปทรงเดียวกันทุกเครื่องมือ:
     { total, max, complete, answered, label, badge, advice }
   เพื่อให้หน้าจอ/ใบสรุป/หน้าติดตาม อ่านผลด้วยโค้ดชุดเดียว. */

/* ─── MNA-SF — Mini Nutritional Assessment (Short Form) ─────────────
   6 ข้อ คะแนนเต็ม 14 · ใช้แทน dropdown “ภาวะโภชนาการ” แบบเดิมที่ให้
   ผู้บันทึกตัดสินเอง. ข้อ F ใช้ BMI ที่ระบบคำนวณจากน้ำหนัก/ส่วนสูงใน
   ขั้นตอนสัญญาณชีพ จึงเลือกอัตโนมัติได้เมื่อมีค่าครบ. */

export const MNA_ITEMS = [
  {
    key: 'a',
    label: 'A. ในช่วง 3 เดือนที่ผ่านมา กินอาหารได้น้อยลงจากปัญหาเบื่ออาหาร เคี้ยว/กลืนลำบาก หรือระบบย่อยอาหารหรือไม่',
    options: [
      { value: 0, label: 'กินได้น้อยลงมาก' },
      { value: 1, label: 'กินได้น้อยลงปานกลาง' },
      { value: 2, label: 'กินได้เท่าเดิม' },
    ],
  },
  {
    key: 'b',
    label: 'B. น้ำหนักลดในช่วง 3 เดือนที่ผ่านมา',
    options: [
      { value: 0, label: 'ลดมากกว่า 3 กก.' },
      { value: 1, label: 'ไม่ทราบ' },
      { value: 2, label: 'ลด 1–3 กก.' },
      { value: 3, label: 'น้ำหนักไม่ลด' },
    ],
  },
  {
    key: 'c',
    label: 'C. การเคลื่อนไหว',
    options: [
      { value: 0, label: 'ติดเตียง/นั่งรถเข็นตลอด' },
      { value: 1, label: 'ลุกจากเตียงได้แต่ไม่ออกนอกบ้าน' },
      { value: 2, label: 'ออกนอกบ้านได้' },
    ],
  },
  {
    key: 'd',
    label: 'D. ในช่วง 3 เดือนที่ผ่านมา มีความเครียดรุนแรงหรือเจ็บป่วยเฉียบพลันหรือไม่',
    options: [
      { value: 0, label: 'มี' },
      { value: 2, label: 'ไม่มี' },
    ],
  },
  {
    key: 'e',
    label: 'E. ปัญหาทางระบบประสาทและจิตใจ',
    options: [
      { value: 0, label: 'สมองเสื่อมรุนแรง หรือซึมเศร้ารุนแรง' },
      { value: 1, label: 'สมองเสื่อมเล็กน้อย' },
      { value: 2, label: 'ไม่มีปัญหา' },
    ],
  },
  {
    key: 'f',
    label: 'F. ดัชนีมวลกาย (BMI) — ระบบเลือกให้อัตโนมัติเมื่อกรอกน้ำหนัก/ส่วนสูงในขั้นตอนสัญญาณชีพ',
    autoFromBmi: true,
    options: [
      { value: 0, label: 'BMI น้อยกว่า 19' },
      { value: 1, label: 'BMI 19 ถึงน้อยกว่า 21' },
      { value: 2, label: 'BMI 21 ถึงน้อยกว่า 23' },
      { value: 3, label: 'BMI ตั้งแต่ 23 ขึ้นไป' },
    ],
  },
];

export const MNA_MAX_SCORE = MNA_ITEMS.reduce(
  (sum, item) => sum + Math.max(...item.options.map((o) => o.value)),
  0,
);

/** ข้อ F เลือกอัตโนมัติจาก BMI ที่คำนวณไว้แล้ว (คืน null เมื่อยังไม่มี BMI). */
export const mnaBmiScore = (bmi) => {
  const v = Number(bmi);
  if (!Number.isFinite(v) || v <= 0) return null;
  if (v < 19) return 0;
  if (v < 21) return 1;
  if (v < 23) return 2;
  return 3;
};

export const scoreMna = (answers = {}) => MNA_ITEMS.reduce(
  (sum, item) => sum + (Number.isFinite(answers[item.key]) ? answers[item.key] : 0),
  0,
);

export const countMnaAnswered = (answers = {}) =>
  MNA_ITEMS.filter((item) => Number.isFinite(answers[item.key])).length;

export const isMnaComplete = (answers = {}) => countMnaAnswered(answers) === MNA_ITEMS.length;

export const interpretMna = (total) => {
  if (total >= 12) {
    return {
      key: 'normal',
      label: 'ภาวะโภชนาการปกติ (12–14 คะแนน)',
      badge: 'green',
      nutrition: 'good',
      advice: 'ให้คำแนะนำโภชนาการตามปกติ และประเมินซ้ำในการเยี่ยมรอบถัดไป',
    };
  }
  if (total >= 8) {
    return {
      key: 'risk',
      label: 'เสี่ยงต่อภาวะทุพโภชนาการ (8–11 คะแนน)',
      badge: 'orange',
      nutrition: 'risk',
      advice: 'ปรึกษานักโภชนาการ ติดตามน้ำหนักทุกครั้งที่เยี่ยม และประเมิน MNA ซ้ำภายใน 3 เดือน',
    };
  }
  return {
    key: 'malnourished',
    label: 'มีภาวะทุพโภชนาการ (0–7 คะแนน)',
    badge: 'red',
    nutrition: 'poor',
    advice: 'ส่งต่อนักโภชนาการ/แพทย์ พิจารณาอาหารทางการแพทย์ และติดตามน้ำหนักทุก 2 สัปดาห์',
  };
};

/* ─── 9Q — แบบประเมินโรคซึมเศร้า (ต่อจาก 2Q ผลบวก) ─────────────────
   ความถี่ 4 ระดับ (0–3) 9 ข้อ คะแนนเต็ม 27. ข้อ 9 เป็นข้อฆ่าตัวตาย —
   ตอบมากกว่า 0 ต้องส่งต่อทันทีไม่ว่าคะแนนรวมจะเท่าใด. */

export const SCREEN_9Q_FREQUENCY = [
  { value: 0, label: 'ไม่มีเลย' },
  { value: 1, label: 'เป็นบางวัน (1–7 วัน)' },
  { value: 2, label: 'เป็นบ่อย (8–12 วัน)' },
  { value: 3, label: 'เป็นเกือบทุกวัน' },
];

export const SCREEN_9Q_QUESTIONS = [
  { key: 'q1', label: 'เบื่อ ไม่สนใจอยากทำอะไร' },
  { key: 'q2', label: 'ไม่สบายใจ ซึมเศร้า ท้อแท้' },
  { key: 'q3', label: 'หลับยาก หลับ ๆ ตื่น ๆ หรือหลับมากไป' },
  { key: 'q4', label: 'เหนื่อยง่าย หรือไม่ค่อยมีแรง' },
  { key: 'q5', label: 'เบื่ออาหาร หรือกินมากเกินไป' },
  { key: 'q6', label: 'รู้สึกไม่ดีกับตัวเอง คิดว่าตัวเองล้มเหลว หรือทำให้ตนเอง/ครอบครัวผิดหวัง' },
  { key: 'q7', label: 'สมาธิไม่ดีเวลาทำอะไร เช่น ดูโทรทัศน์ ฟังวิทยุ หรือทำงานที่ต้องใช้ความตั้งใจ' },
  { key: 'q8', label: 'พูดช้า ทำอะไรช้าลงจนคนอื่นสังเกตเห็น หรือกระสับกระส่ายจนอยู่นิ่งไม่ได้' },
  { key: 'q9', label: 'คิดทำร้ายตนเอง หรือคิดว่าตายไปเสียดีกว่า', critical: true },
];

export const SCREEN_9Q_MAX_SCORE = SCREEN_9Q_QUESTIONS.length * 3;

export const score9q = (answers = {}) => SCREEN_9Q_QUESTIONS.reduce(
  (sum, q) => sum + (Number.isFinite(answers[q.key]) ? answers[q.key] : 0),
  0,
);

export const count9qAnswered = (answers = {}) =>
  SCREEN_9Q_QUESTIONS.filter((q) => Number.isFinite(answers[q.key])).length;

export const is9qComplete = (answers = {}) =>
  count9qAnswered(answers) === SCREEN_9Q_QUESTIONS.length;

/** ตอบข้อ 9 (ความคิดฆ่าตัวตาย) มากกว่า 0 — ต้องส่งต่อทันที. */
export const has9qSuicidalRisk = (answers = {}) => Number(answers.q9 || 0) > 0;

export const interpret9q = (total) => {
  if (total >= 19) {
    return { key: 'severe', label: 'ซึมเศร้าระดับรุนแรง (≥ 19 คะแนน)', badge: 'red', advice: 'ส่งต่อคลินิกสุขภาพจิต/จิตแพทย์โดยเร็วที่สุด และแจ้งผู้ดูแลเฝ้าระวังต่อเนื่อง' };
  }
  if (total >= 13) {
    return { key: 'moderate', label: 'ซึมเศร้าระดับปานกลาง (13–18 คะแนน)', badge: 'orange', advice: 'ส่งต่อคลินิกสุขภาพจิตของศูนย์บริการฯ และนัดติดตามภายใน 2 สัปดาห์' };
  }
  if (total >= 7) {
    return { key: 'mild', label: 'ซึมเศร้าระดับน้อย (7–12 คะแนน)', badge: 'yellow', advice: 'ให้การปรึกษาเบื้องต้น ติดตามซ้ำในการเยี่ยมรอบถัดไป' };
  }
  return { key: 'none', label: 'ไม่มีอาการซึมเศร้า (< 7 คะแนน)', badge: 'green', advice: 'ไม่ต้องส่งต่อ ประเมินซ้ำเมื่อมีอาการเปลี่ยนแปลง' };
};

/* ─── PPS — Palliative Performance Scale (ฉบับภาษาไทย) ───────────────
   11 ระดับ 0–100% ประเมินความสามารถโดยรวมของผู้ป่วยประคับประคอง;
   ใช้กำหนดความถี่การเยี่ยมและการวางแผนดูแลระยะท้าย. */

export const PPS_LEVELS = [
  { value: 100, label: 'PPS 100% — เดินได้ปกติ ทำกิจกรรมและทำงานได้ตามปกติ ไม่มีอาการของโรค' },
  { value: 90,  label: 'PPS 90% — เดินได้ปกติ ทำกิจกรรมได้ตามปกติ มีอาการของโรคเล็กน้อย' },
  { value: 80,  label: 'PPS 80% — เดินได้ปกติ ต้องออกแรงมากขึ้นในการทำกิจกรรม มีอาการของโรคบ้าง' },
  { value: 70,  label: 'PPS 70% — ความสามารถลดลง ทำงานไม่ได้ตามเดิม ดูแลตนเองได้' },
  { value: 60,  label: 'PPS 60% — ความสามารถลดลงมาก ต้องการความช่วยเหลือเป็นครั้งคราว' },
  { value: 50,  label: 'PPS 50% — นั่ง/นอนเป็นส่วนใหญ่ ต้องการความช่วยเหลือมาก' },
  { value: 40,  label: 'PPS 40% — นอนเป็นส่วนใหญ่ ต้องการการดูแลเกือบทั้งหมด' },
  { value: 30,  label: 'PPS 30% — นอนติดเตียง ต้องการการดูแลทั้งหมด กินได้ลดลง' },
  { value: 20,  label: 'PPS 20% — นอนติดเตียง กินได้เพียงจิบน้ำ รู้สึกตัวสับสนเป็นช่วง ๆ' },
  { value: 10,  label: 'PPS 10% — นอนติดเตียง ไม่กิน ไม่รู้สึกตัวหรือซึมลึก' },
  { value: 0,   label: 'PPS 0% — เสียชีวิต' },
];

export const interpretPps = (value) => {
  /* ยังไม่ได้เลือก ('' / null / undefined) ต้องคืน null — ไม่ใช่แปลผลเป็น
     PPS 0% (เสียชีวิต) เพราะ Number('') === 0. */
  if (value === '' || value === null || value === undefined) return null;
  const v = Number(value);
  if (!Number.isFinite(v)) return null;
  if (v >= 70) {
    return { key: 'stable', label: 'ระยะคงที่ (PPS 70–100%)', badge: 'green', followUpDays: 90, advice: 'เยี่ยมตามรอบปกติของกลุ่มผู้รับบริการ' };
  }
  if (v >= 40) {
    return { key: 'transitional', label: 'ระยะเปลี่ยนผ่าน (PPS 40–60%)', badge: 'orange', followUpDays: 30, advice: 'เพิ่มความถี่การเยี่ยมเป็นทุก 30 วัน วางแผนอุปกรณ์ช่วยเหลือและผู้ดูแล' };
  }
  if (v > 0) {
    return { key: 'endOfLife', label: 'ระยะท้ายของชีวิต (PPS 10–30%)', badge: 'red', followUpDays: 7, advice: 'เยี่ยมทุกสัปดาห์ ทบทวนแผนการดูแลระยะท้ายและการจัดการอาการร่วมกับครอบครัว' };
  }
  return { key: 'deceased', label: 'เสียชีวิต (PPS 0%)', badge: 'grey', followUpDays: null, advice: 'ปิดเคสในทะเบียนและบันทึกการเยี่ยมครอบครัวหลังการเสียชีวิต' };
};

/* ─── สรุปเครื่องมือทั้งชุดในการเยี่ยม 1 ครั้ง ─────────────────────── */

/** ใช้ทั้งในใบสรุป หน้าติดตาม และการส่งข้อมูล สปสช. — คืนเฉพาะเครื่องมือ
    ที่บันทึกไว้จริง เพื่อไม่ให้ค่าที่ยังไม่ได้ประเมินถูกนับเป็น 0. */
export const summarizeStandardTools = (form = {}) => {
  const out = [];
  if (isMnaComplete(form.mna)) {
    const total = scoreMna(form.mna);
    out.push({ key: 'mna', name: 'MNA-SF', total, max: MNA_MAX_SCORE, ...interpretMna(total) });
  }
  if (is9qComplete(form.screen9q)) {
    const total = score9q(form.screen9q);
    out.push({
      key: '9q',
      name: '9Q',
      total,
      max: SCREEN_9Q_MAX_SCORE,
      suicidalRisk: has9qSuicidalRisk(form.screen9q),
      ...interpret9q(total),
    });
  }
  if (Number.isFinite(Number(form.pps)) && form.pps !== '') {
    const interp = interpretPps(form.pps);
    out.push({ key: 'pps', name: 'PPS', total: Number(form.pps), max: 100, ...interp });
  }
  return out;
};
