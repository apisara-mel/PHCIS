/* ANC (แผนกฝากครรภ์ / Antenatal Care) mock data + domain logic.

   Source: TOR §1.10.7 "งานฝากครรภ์" (docs/tor-checklist.html) + the
   Obsidian FigJam process map "Specialty-Clinic / Antenatal care" +
   คู่มือการฝากครรภ์สำหรับบุคลากรสาธารณสุข (กรมอนามัย 2565). Covers all
   5 swimlanes: A (first visit, <12wk) · B (risk-tiered PCU/hospital
   routing) · C (12-19wk Down-syndrome screen + 2nd ultrasound) · D
   (20-27wk GCT/OGTT diabetes screen) · E (28wk+ Lab #2 + vaccines).
   `getAncVisitTier` picks the swimlane from the CURRENT visit's
   gestational age, so one form + one data model covers the whole
   pregnancy instead of a separate flow per visit type. */

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const toDate = (v) => (v instanceof Date ? v : new Date(v));
const startOfLocalDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addLocalDays = (d, n) => {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
};

/** Thai Buddhist display string — same convention as `formatCertRestDate`
    in `treatmentVisits.js`. */
export const formatAncDate = (v) => {
  if (!v) return '';
  const d = toDate(v);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
};

/** Gestational age from LMP (last menstrual period) as of a given date
    (defaults to today). Returns null until a valid LMP is entered. */
export const calculateGestationalAge = (lmp, asOf = new Date()) => {
  if (!lmp) return null;
  const lmpDate = toDate(lmp);
  if (Number.isNaN(lmpDate.getTime())) return null;
  const totalDays = Math.floor(
    (startOfLocalDay(toDate(asOf)) - startOfLocalDay(lmpDate)) / 86400000,
  );
  if (totalDays < 0) return null;
  return { weeks: Math.floor(totalDays / 7), days: totalDays % 7, totalDays };
};

export const formatGestationalAge = (ga) => (ga ? `${ga.weeks} สัปดาห์ ${ga.days} วัน` : '—');

/** Expected date of confinement — Naegele's rule (LMP + 280 days). */
export const calculateEDC = (lmp) => {
  if (!lmp) return null;
  const lmpDate = toDate(lmp);
  if (Number.isNaN(lmpDate.getTime())) return null;
  return addLocalDays(lmpDate, 280);
};

/** ประวัติการเจ็บป่วยของครอบครัว — legacy HCIS ANC module (คู่มือระบบงาน
    ฝากครรภ์ p.2-25, "2.6 การฉีดวัคซีน/การเจ็บป่วย"). Distinct from
    `ANC_RISK_FACTORS` (the patient's OWN risk factors) — this checklist is
    about family members' health history. */
export const ANC_FAMILY_ILLNESS_HISTORY = [
  { key: 'twins',                label: 'ครรภ์แฝด' },
  { key: 'hypertension',         label: 'ความดันโลหิตสูง' },
  { key: 'diabetes',             label: 'เบาหวาน' },
  { key: 'lungDisease',          label: 'โรคปอด' },
  { key: 'bloodDisease',         label: 'โรคเลือด' },
  { key: 'congenitalDisability', label: 'ความพิการแต่กำเนิด' },
  { key: 'surgery',              label: 'การผ่าตัด' },
  { key: 'asthma',               label: 'หอบหืด' },
];

/* ─── Step 2 — คัดกรองและซักประวัติ ───────────────────────────────── */

/** แบบประเมินความเครียด ST-5 (กรมสุขภาพจิต) — pp.40-41 of the official
    manual. Runs alongside the 2Q depression screen (both flowcharts on
    pp.42-43 show them together, either order) — 5 items scored 0-3
    (แทบไม่มี · เป็นบางครั้ง · บ่อยครั้ง · เป็นประจำ), total 0-15. */
export const ANC_STRESS_QUESTIONS = [
  { key: 'sleep',        label: 'มีปัญหาการนอน นอนไม่หลับ หรือนอนมาก' },
  { key: 'concentration', label: 'มีสมาธิน้อยลง' },
  { key: 'irritable',    label: 'หงุดหงิด กระวนกระวาย วุ่นวายใจ' },
  { key: 'bored',        label: 'รู้สึกเบื่อ เซ็ง' },
  { key: 'avoidPeople',  label: 'ไม่อยากพบปะผู้คน' },
];

export const ANC_STRESS_SCALE = [
  { value: 0, label: 'แทบไม่มี' },
  { value: 1, label: 'เป็นบางครั้ง' },
  { value: 2, label: 'บ่อยครั้ง' },
  { value: 3, label: 'เป็นประจำ' },
];

/** p.41 interpretation table: <4 ไม่มีความเครียด · 5-7 สงสัยว่ามีความเครียด
    · ≥8 มีความเครียดสูง (ควรได้รับคำปรึกษา/คัดกรองโรคซึมเศร้าต่อด้วย 2Q). */
export const interpretAncStressScore = (total) => {
  if (total >= 8) return { level: 'high', label: 'มีความเครียดสูง — ควรได้รับคำปรึกษา' };
  if (total >= 5) return { level: 'suspect', label: 'สงสัยว่ามีความเครียด' };
  return { level: 'none', label: 'ไม่มีความเครียด' };
};

/** 2Q depression screen (Thai MOH standard first-tier question pair) —
    verified against pp.40-41 of the official manual (คำถามตรงกับที่ใช้
    อยู่แล้ว); a "yes" on either question flags escalation to the full
    9Q/8Q (out of scope here — flagged as a follow-up note only). */
export const ANC_MENTAL_HEALTH_QUESTIONS = [
  { key: 'q1', label: 'ในช่วง 2 สัปดาห์ที่ผ่านมา ท่านรู้สึกหดหู่ เศร้า หรือท้อแท้สิ้นหวังหรือไม่' },
  { key: 'q2', label: 'ในช่วง 2 สัปดาห์ที่ผ่านมา ท่านรู้สึกเบื่อ ทำอะไรก็ไม่เพลิดเพลินหรือไม่' },
];

/** การประเมินและคัดกรองการสูบบุหรี่ (p.46) — screen every visit
    (สูบ/ไม่สูบ), brief-advice checkbox once screened positive. Full
    Varenicline/4A treatment algorithm is a doctor-level protocol, out of
    scope for a checklist chip. */
export const ANC_SMOKING_STATUS = [
  { value: 'nonSmoker', label: 'ไม่สูบบุหรี่' },
  { value: 'smoker',    label: 'สูบบุหรี่' },
];

/** Pregnancy-risk screening checklist — Obsidian reference note "E.
    หลักฐานอ้างอิง" (risk factors that route a case to hospital-level
    ANC instead of PCU). */
export const ANC_RISK_FACTORS = [
  { key: 'ageExtreme',     label: 'อายุ < 18 ปี หรือ > 35 ปี' },
  { key: 'heightShort',    label: 'ส่วนสูง < 145 ซม.' },
  { key: 'bmiAbnormal',    label: 'BMI < 18.5 หรือ > 30' },
  { key: 'priorCesarean',  label: 'เคยผ่าตัดคลอดมาก่อน' },
  { key: 'priorLoss',      label: 'เคยแท้ง / ทารกเสียชีวิตในครรภ์' },
  { key: 'multiplePreg',   label: 'ครรภ์แฝด' },
  { key: 'chronicDisease', label: 'มีโรคประจำตัว (เบาหวาน / ความดัน / หัวใจ / ไทรอยด์)' },
  { key: 'rhNegative',     label: 'หมู่เลือด Rh negative' },
  { key: 'familyGenetic',  label: 'ครอบครัวมีประวัติโรคทางพันธุกรรม / ธาลัสซีเมีย' },
];

/** สัญญาณอันตรายที่ต้องส่งพบแพทย์ทันที — the exact referral triggers from
    the official manual pp.11-12 ("ส่งต่อไปฝากครรภ์หรือรับการวินิจฉัยและ
    รักษาที่โรงพยาบาล เมื่อประเมินพบว่า..."): severe abdominal pain/
    contractions, bleeding, ruptured membranes, reduced fetal movement,
    facial/hand/foot oedema, severe headache/blurred vision, palpitations.
    Any checked item surfaces an immediate-referral warning in Step 2. */
export const ANC_DANGER_SIGNS = [
  { key: 'severeAbdPain',  label: 'ปวดท้องรุนแรง / ท้องแข็งถี่' },
  { key: 'vaginalBleeding', label: 'เลือดออกทางช่องคลอด' },
  { key: 'ruptureMembrane', label: 'น้ำเดิน (มีน้ำใสไหลออกทางช่องคลอด)' },
  { key: 'reducedFetalMovement', label: 'ลูกดิ้นน้อยลงหรือไม่ดิ้น' },
  { key: 'facialHandFootSwelling', label: 'บวมที่หน้า มือ หรือเท้า' },
  { key: 'severeHeadacheBlurredVision', label: 'ปวดศีรษะรุนแรง ตาพร่ามัว' },
  { key: 'palpitationFatigue', label: 'ใจสั่น เหนื่อยง่าย' },
];

/** วัคซีนป้องกันโรคคอตีบ-บาดทะยัก (dT) ในหญิงตั้งครรภ์ — decision flowchart
    pp.47-48 of the official manual ("รูปที่ 1 กำหนดการให้วัคซีนป้องกันโรค
    คอตีบ-บาดทะยัก (dT) ในหญิงตั้งครรภ์"). `doseCountBefore` = doses
    received before THIS pregnancy (0-3+); `lastDoseYearsAgo` = years since
    the last dose (null if never vaccinated / unknown) — only meaningful
    once `doseCountBefore >= 3`. Age-20 catch-up booster (a minor branch on
    the same flowchart) is intentionally not modelled — this form doesn't
    carry the patient's exact age as an integer. */
export const getTetanusVaccinePlan = (doseCountBefore, lastDoseYearsAgo) => {
  const doses = Number(doseCountBefore) || 0;
  if (doses <= 0) {
    return {
      doseCount: 3,
      label: 'ไม่มีประวัติ/ไม่ทราบ/ไม่แน่ใจ — ให้ dT 3 เข็ม (เข็มแรกทันที, เข็ม 2 ห่างเข็มแรก 1 เดือน, เข็ม 3 ห่างเข็ม 2 อีก 6 เดือน) จากนั้นนัดกระตุ้น 1 เข็มทุก 10 ปี',
    };
  }
  if (doses === 1) {
    return {
      doseCount: 2,
      label: 'เคยได้รับมาแล้ว 1 เข็ม — ให้ dT อีก 2 เข็ม (เข็มแรกห่างเข็มเดิม 1 เดือน, เข็ม 2 ห่างอีก 6 เดือน) จากนั้นนัดกระตุ้น 1 เข็มทุก 10 ปี',
    };
  }
  if (doses === 2) {
    return {
      doseCount: 1,
      label: 'เคยได้รับมาแล้ว 2 เข็ม — ให้ dT อีก 1 เข็ม (ห่างจากเข็มสุดท้าย 6 เดือน) จากนั้นนัดกระตุ้น 1 เข็มทุก 10 ปี',
    };
  }
  // doses >= 3 (ครบ 3 เข็มแล้ว)
  if (lastDoseYearsAgo == null || lastDoseYearsAgo > 10) {
    return {
      doseCount: 1,
      label: 'เคยได้รับครบ 3 เข็มแล้ว เข็มสุดท้ายเกิน 10 ปี (หรือไม่ทราบ) — ให้ dT กระตุ้น 1 เข็ม จากนั้นนัดกระตุ้นทุก 10 ปี',
    };
  }
  return {
    doseCount: 0,
    label: 'เคยได้รับครบ 3 เข็มแล้ว เข็มสุดท้ายไม่เกิน 10 ปี — ไม่ต้องฉีดในครรภ์นี้',
  };
};

/** Maternal Oral Screening (MOS) tool, George et al. 2016 — p.53 of the
    official manual. 2 questions; any "risk" answer → score ≥1 → refer to
    dentist. Replaces a plain "checked/not checked" toggle with the actual
    screening instrument the manual specifies. */
export const ANC_ORAL_HEALTH_QUESTIONS = [
  { key: 'symptoms', label: 'มีเหงือกบวม เลือดออกที่เหงือก ปวดฟัน มีปัญหาการกินอาหาร หรือปัญหาอื่นในช่องปากหรือไม่', riskAnswer: true },
  { key: 'notVisited', label: 'ไม่ได้ไปพบทันตแพทย์ในช่วง 1 ปีที่ผ่านมา', riskAnswer: true },
];

export const interpretOralHealthScreen = (answers) => {
  const score = ANC_ORAL_HEALTH_QUESTIONS.filter((q) => answers?.[q.key] === q.riskAnswer).length;
  return { score, highRisk: score >= 1 };
};

/* ─── Step 3 — ตรวจร่างกาย ────────────────────────────────────────── */

export const ANC_DEFAULT_VITALS = { bp: '110/70', hr: 82, temp: 36.7, rr: 18, spo2: 99, weight: 58, height: 160 };

/* ─── Step 4 — วินิจฉัย (risk level) ──────────────────────────────── */

export const ANC_RISK_LEVELS = [
  {
    value: 'low', label: 'ความเสี่ยงต่ำ', en: 'Low risk',
    tone: { bg: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', fg: 'var(--text-brandPrimary-default, #007549)' },
  },
  {
    value: 'intermediate', label: 'ความเสี่ยงปานกลาง', en: 'Intermediate risk',
    tone: { bg: 'var(--surface-progress-quaternary, #FBFAF4)', fg: 'var(--text-progress-default, #F0C03D)' },
  },
  {
    value: 'high', label: 'ความเสี่ยงสูง', en: 'High risk',
    tone: { bg: 'var(--surface-danger-quaternary, #FFF0F0)', fg: 'var(--text-danger-default, #C72121)' },
  },
];

export const resolveAncRiskLevel = (value) => ANC_RISK_LEVELS.find((r) => r.value === value) || null;

/* ─── Step 5 — สั่งการรักษา (Lab #1) ──────────────────────────────── */

/** Result-value fields for the labs ordered above — TOR 1.10.7.7 names
    "การตรวจปัสสาวะ" as an explicit column of the exam-history record, and
    1.10.7.8 requires trending "Lab" over time; both need actual result
    VALUES, not just which labs were ordered (legacy HCIS ANC exam screen,
    p.2-4/2-10, shows Rh/Hb/HCT/HBs/VDRL/HIV as editable result fields
    alongside the order). Kept to the labs both the manual and TOR name
    explicitly rather than mirroring every field in the legacy screen. */
/* Categorical result values (blood group, reactive/non-reactive, etc.) get
   a fixed `options` list so the field renders as a dropdown (Select)
   instead of free text — there's only ever a handful of valid lab
   results, and a dropdown stops "Positive" / "positive" / "+" typos from
   fragmenting the trend data. Continuous numeric values (Hb, HCT, MCV)
   have no `options` and stay as number inputs. */
const BLOOD_GROUP_OPTIONS = ['A', 'B', 'AB', 'O'];
const RH_OPTIONS = ['Positive', 'Negative'];
const REACTIVE_OPTIONS = ['Non-reactive', 'Reactive'];
const POS_NEG_OPTIONS = ['Negative', 'Positive'];
const URINE_OPTIONS = ['ปกติ', 'ผิดปกติ'];
/** MCV cutoff for thalassemia screening is 80 fL (official manual,
    pp.25-27) — a normal/low dropdown is more clinically meaningful here
    than requiring the exact lab number. */
const MCV_OPTIONS = [
  { value: 'normal', label: 'ปกติ (≥80 fL)' },
  { value: 'low',    label: 'ต่ำกว่าเกณฑ์ (<80 fL)' },
];

export const ANC_LAB1_RESULT_FIELDS = [
  { key: 'bloodGroup',    label: 'หมู่เลือด (ABO)', placeholder: 'เลือกหมู่เลือด', options: BLOOD_GROUP_OPTIONS },
  { key: 'rh',            label: 'Rh',              placeholder: 'เลือกผล Rh', options: RH_OPTIONS },
  { key: 'hb',            label: 'Hb (g%)',         placeholder: 'เช่น 11.5' },
  { key: 'hct',           label: 'HCT (%)',         placeholder: 'เช่น 34' },
  { key: 'urineResult',   label: 'ผลตรวจปัสสาวะ',    placeholder: 'เลือกผลตรวจ', options: URINE_OPTIONS },
  { key: 'vdrlResult',    label: 'ผล VDRL/TPHA',    placeholder: 'เลือกผล VDRL', options: REACTIVE_OPTIONS },
  { key: 'antiHivResult', label: 'ผล Anti-HIV',     placeholder: 'เลือกผล Anti-HIV', options: POS_NEG_OPTIONS },
  { key: 'hbsAgResult',   label: 'ผล HBsAg',        placeholder: 'เลือกผล HBsAg', options: POS_NEG_OPTIONS },
];

export const ANC_LAB2_RESULT_FIELDS = [
  { key: 'hb2',            label: 'Hb (g%) ครั้งที่ 2', placeholder: 'เช่น 11.8' },
  { key: 'hct2',           label: 'HCT (%) ครั้งที่ 2', placeholder: 'เช่น 35' },
  { key: 'vdrlResult2',    label: 'ผล VDRL ครั้งที่ 2', placeholder: 'เลือกผล VDRL', options: REACTIVE_OPTIONS },
  { key: 'antiHivResult2', label: 'ผล Anti-HIV ครั้งที่ 2', placeholder: 'เลือกผล Anti-HIV', options: POS_NEG_OPTIONS },
];

/** ตรวจทางห้องปฏิบัติการของสามี/คู่ — explicitly named in the national
    "นโยบายการฝากครรภ์คุณภาพสำหรับประเทศไทย พ.ศ. 2565" (p.72, official
    manual): CBC, MCV, DCIP, VDRL, Anti-HIV for the partner, alongside the
    couple's thalassemia/genetic-risk screening. */
export const ANC_HUSBAND_LAB_FIELDS = [
  { key: 'bloodGroup', label: 'หมู่เลือด (ABO) ของสามี/คู่', placeholder: 'เลือกหมู่เลือด', options: BLOOD_GROUP_OPTIONS },
  { key: 'mcv',        label: 'MCV ของสามี/คู่',            placeholder: 'เลือกผล MCV', options: MCV_OPTIONS },
  { key: 'dcip',       label: 'ผล DCIP ของสามี/คู่',         placeholder: 'เลือกผล DCIP', options: RH_OPTIONS },
  { key: 'vdrl',       label: 'ผล VDRL ของสามี/คู่',         placeholder: 'เลือกผล VDRL', options: REACTIVE_OPTIONS },
  { key: 'antiHiv',    label: 'ผล Anti-HIV ของสามี/คู่',     placeholder: 'เลือกผล Anti-HIV', options: POS_NEG_OPTIONS },
];

/** Compact one-line summary of whichever lab result fields have a value —
    feeds the "ผล Lab" column of the follow-up trend table (TOR 1.10.7.8). */
export const summarizeLabResults = (labResults) => {
  if (!labResults) return '-';
  const allFields = [...ANC_LAB1_RESULT_FIELDS, ...ANC_LAB2_RESULT_FIELDS];
  const parts = allFields
    .filter((f) => labResults[f.key])
    .map((f) => `${f.label}: ${labResults[f.key]}`);
  return parts.length ? parts.join(', ') : '-';
};

export const ANC_LAB1_ORDERS = [
  { key: 'cbc',          th: 'ตรวจความสมบูรณ์ของเม็ดเลือด', en: 'CBC for Hct/Hb, MCV, DCIP' },
  { key: 'bloodGroup',   th: 'หมู่เลือด + Rh',               en: 'Blood group (ABO) + Rh' },
  { key: 'vdrl',         th: 'ซิฟิลิส (TPHA/VDRL)',          en: 'TPHA or VDRL/RPR' },
  { key: 'antiHiv',      th: 'เอชไอวี',                       en: 'Anti-HIV' },
  { key: 'hbsAg',        th: 'ไวรัสตับอักเสบบี',              en: 'HBsAg' },
  { key: 'urine',        th: 'ตรวจปัสสาวะ',                   en: 'Multiple urine dipstick' },
  { key: 'downSyndrome', th: 'คัดกรองกลุ่มอาการดาวน์ (Prenatal counselling)', en: 'Down syndrome counselling' },
  { key: 'thalassemia',  th: 'คัดกรองธาลัสซีเมีย',            en: 'Thalassemia screening' },
];

/* ─── Step 5 — สั่งการรักษา (later-visit swimlanes B–E) ───────────────
   Verified against the official คู่มือการฝากครรภ์สำหรับบุคลากรสาธารณสุข
   (กรมอนามัย, มี.ค. 2565) pp.4-8 — "แผนภูมิแนวทางฝากครรภ์คุณภาพ" (p.4) and
   "ตารางกิจกรรมบริการ...ตามช่วงอายุครรภ์" (pp.5-8), read directly from the
   PDF in the Obsidian vault (not just the FigJam sticky-note summary this
   was originally built from). Tiers: <12 Lab #1 (p.6, first trimester) ·
   12-19 Down-syndrome screen (14-18wk) + 2nd ultrasound (20wk) (p.5,7) ·
   20-27 GCT diabetes screen (24-28wk) (p.5) · 28+ Lab #2 + vaccines
   (27-32wk) + OGTT confirm + 3rd ultrasound/NST + supplements (pp.5-8). */
export const ANC_SECOND_TRIMESTER_SCREENING = [
  { key: 'downSyndrome2', th: 'คัดกรองกลุ่มอาการดาวน์ (14-18 สัปดาห์)', en: 'Down syndrome screening' },
  { key: 'ultrasound2',   th: 'ตรวจ Ultrasound ครั้งที่ 2 (20 สัปดาห์)', en: '2nd ultrasound — confirm GA + fetal anomaly' },
];

/** Structured Ultrasound finding fields — pp.50-52 of the official manual
    ("ตัวอย่างแบบบันทึกผลการตรวจครรภ์ด้วยคลื่นเสียงความถี่สูง"). Reused for
    both the 20wk (2nd) and 34wk (3rd) ultrasound — a visit only has one
    ultrasound tier active at a time (`getAncVisitTier`), so one shared
    `ultrasoundResults` object is enough rather than duplicating per tier. */
export const ANC_ULTRASOUND_RESULT_FIELDS = [
  { key: 'numberOfFetus',    label: 'จำนวนทารก',              placeholder: 'เช่น 1' },
  { key: 'presentation',     label: 'ท่าทารก',                 placeholder: 'Vertex / Breech / Transverse' },
  { key: 'gaByUltrasound',   label: 'อายุครรภ์จาก Ultrasound', placeholder: 'เช่น 20 สัปดาห์' },
  { key: 'fetalHeartMotion', label: 'การเต้นหัวใจทารก',        placeholder: 'Positive / Negative' },
  { key: 'placentalSite',    label: 'ตำแหน่งรก',               placeholder: 'เช่น Anterior, Upper' },
  { key: 'amnioticFluid',    label: 'ปริมาณน้ำคร่ำ',           placeholder: 'Normal / Increased / Decreased' },
  { key: 'anomalies',        label: 'ความผิดปกติที่ตรวจพบ',    placeholder: 'ไม่พบ / ระบุ' },
];

export const ANC_DIABETES_SCREENING = [
  { key: 'gct',  th: 'คัดกรองเบาหวาน (GCT, 24-28 สัปดาห์)', en: 'Glucose challenge test' },
  { key: 'ogtt', th: 'ยืนยันเบาหวาน (OGTT, 30 สัปดาห์)',    en: 'Oral glucose tolerance test' },
];

export const ANC_LAB2_ORDERS = [
  { key: 'cbc2',     th: 'ตรวจ Hb/Hct/MCV (ครั้งที่ 2)', en: 'CBC (Hb/Hct/MCV) — 2nd' },
  { key: 'vdrl2',    th: 'ซิฟิลิส (ครั้งที่ 2)',           en: 'VDRL/RPR — 2nd' },
  { key: 'antiHiv2', th: 'เอชไอวี (ครั้งที่ 2)',           en: 'Anti-HIV — 2nd' },
];

export const ANC_VACCINES = [
  { key: 'dtTdap', th: 'วัคซีน dT / Tdap (27-36 สัปดาห์)', en: 'dT/Tdap vaccine' },
  { key: 'flu',    th: 'วัคซีนไข้หวัดใหญ่ (≥ 4 เดือน)',    en: 'Influenza vaccine' },
  { key: 'covid',  th: 'วัคซีน Covid-19 (> 12 สัปดาห์)',   en: 'Covid-19 vaccine' },
];

/** เสริมธาตุเหล็ก กรดโฟลิก ไอโอดีน แคลเซียม — p.7: "กินทุกวัน ตลอดการ
    ตั้งครรภ์" from 30 wks onward. */
export const ANC_SUPPLEMENTS = [
  { key: 'iron',     th: 'ธาตุเหล็ก', en: 'Iron' },
  { key: 'folicAcid', th: 'กรดโฟลิก', en: 'Folic acid' },
  { key: 'iodine',   th: 'ไอโอดีน',   en: 'Iodine' },
  { key: 'calcium',  th: 'แคลเซียม',  en: 'Calcium' },
];

/** Third-trimester fetal wellbeing (p.7): 3rd ultrasound at 34wk (growth /
    placenta), NST + amniotic-fluid check at 40wk, delivery-readiness
    assessment. */
export const ANC_TERM_ASSESSMENT = [
  { key: 'ultrasound3', th: 'ตรวจ Ultrasound ครั้งที่ 3 (34 สัปดาห์)', en: '3rd ultrasound — growth + placenta' },
  { key: 'nst',         th: 'NST + ตรวจน้ำคร่ำ (40 สัปดาห์)',          en: 'NST + amniotic fluid check' },
  { key: 'deliveryPlan', th: 'ประเมินการคลอด',                        en: 'Delivery readiness assessment' },
];

/** ตรวจประเมินด้านและหัวนม (breast/nipple assessment) — pp.64-66, done by
    the 3rd trimester so inverted/flat nipples can be corrected (Hoffmann's
    maneuver, breast shell, etc.) before delivery. */
export const ANC_NIPPLE_ASSESSMENT_OPTIONS = [
  { value: 'normal',   label: 'ปกติ' },
  { value: 'flat',     label: 'หัวนมแบน' },
  { value: 'inverted', label: 'หัวนมบอด' },
];

/** แผนการคลอด (คลอดธรรมชาติ / ผ่าตัดคลอด) — pp.59-60, decided together
    with the attending doctor closer to term. */
export const ANC_DELIVERY_MODE_OPTIONS = [
  { value: 'vaginal',   label: 'คลอดทางช่องคลอด (Vaginal delivery)' },
  { value: 'cesarean',  label: 'ผ่าตัดคลอด (Cesarean section)' },
  { value: 'undecided', label: 'ยังไม่ตัดสินใจ / ประเมินเมื่อใกล้คลอด' },
];

/** ลักษณะเต้านม — Step 1 intake breast exam finding. */
export const ANC_BREAST_EXAM_OPTIONS = [
  { value: 'normal',   label: 'ปกติทั้งสองข้าง' },
  { value: 'flat',     label: 'หัวนมแบน' },
  { value: 'inverted', label: 'หัวนมบอด' },
  { value: 'mass',     label: 'มีก้อนที่เต้านม' },
  { value: 'other',    label: 'อื่นๆ' },
];

/** สุขภาพของสามี — Step 1 intake note on the husband/partner's health. */
export const ANC_SPOUSE_HEALTH_OPTIONS = [
  { value: 'healthy',        label: 'แข็งแรงดี ไม่มีโรคประจำตัว' },
  { value: 'chronicDisease', label: 'มีโรคประจำตัว' },
  { value: 'smoker',         label: 'สูบบุหรี่' },
  { value: 'alcohol',        label: 'ดื่มแอลกอฮอล์' },
  { value: 'unknown',        label: 'ไม่ทราบข้อมูล' },
];

/** Which later-visit swimlane applies to the CURRENT visit, driven by
    gestational age at the time of this visit (not the patient's overall
    history) — so re-opening the same form at a later gestational age
    naturally surfaces the next swimlane's content. Ranges follow the
    official manual's trimester table (pp.5-8): <12 Lab #1 (first
    trimester) · 12–19 Down-syndrome + 2nd ultrasound (second trimester,
    early) · 20–27 GCT (second trimester, late) · 28+ Lab #2, vaccines,
    OGTT, supplements, 3rd ultrasound + NST (third trimester). */
export const getAncVisitTier = (gestWeeks) => {
  const w = Number.isFinite(gestWeeks) ? gestWeeks : 0;
  if (w < 12) return 'first';
  if (w < 20) return 'secondTrimesterScreening';
  if (w < 28) return 'diabetesScreening';
  return 'lab2AndVaccines';
};

/** Human-readable list of what actually got done this visit — feeds the
    follow-up trend's `note` (TOR 1.10.7.8) so the history reads as a real
    clinical log instead of a generic diagnosis note. */
export const summarizeAncProcedures = (form) => {
  const names = [];
  const collect = (catalog, values) =>
    catalog.forEach((item) => { if (values?.[item.key]) names.push(item.th); });

  collect(ANC_LAB1_ORDERS, form.lab1Orders);
  collect(ANC_SECOND_TRIMESTER_SCREENING, form.secondTrimesterScreening);
  collect(ANC_DIABETES_SCREENING, form.diabetesScreening);
  collect(ANC_LAB2_ORDERS, form.lab2Orders);
  collect(ANC_VACCINES, form.vaccines);
  collect(ANC_SUPPLEMENTS, form.supplements);
  collect(ANC_TERM_ASSESSMENT, form.termAssessment);
  if (form.dentalCleaningDone) names.push('ขัดทำความสะอาดฟันแล้ว');
  if (form.dentalBrushingPractice) names.push('ฝึกแปรงฟันแบบลงมือปฏิบัติ');
  if (form.appointment?.kickCountEducation) names.push('สอนการนับลูกดิ้น');
  if (form.motherChildHealthBookGiven) names.push('แจกสมุดบันทึกสุขภาพแม่และเด็ก');
  if (Object.values(form.ultrasoundResults || {}).some(Boolean)) names.push('บันทึกผล Ultrasound');
  if (form.nippleAssessment) {
    const opt = ANC_NIPPLE_ASSESSMENT_OPTIONS.find((o) => o.value === form.nippleAssessment);
    if (opt) names.push(`ตรวจหัวนม: ${opt.label}`);
  }
  if (form.plannedDeliveryMode) {
    const opt = ANC_DELIVERY_MODE_OPTIONS.find((o) => o.value === form.plannedDeliveryMode);
    if (opt) names.push(`แผนการคลอด: ${opt.label}`);
  }

  return names.join(', ');
};

/* ─── Step 6 — นัดหมาย (visit tiering + PCU/hospital routing) ────────
   Mirrors the Obsidian reference note "E. หลักฐานอ้างอิง — ใครตรวจครรภ์ /
   พบแพทย์เมื่อไหร่": doctor sees every case at ≤12 / 20 / 32 wks; low-risk
   stays at PCU between those visits, intermediate/high routes to the
   referral hospital ("รพ.แม่ข่าย") right away. */
export const getNextAncAppointmentPlan = (gestWeeks, riskLevel) => {
  const w = Number.isFinite(gestWeeks) ? gestWeeks : 0;

  if (riskLevel === 'intermediate' || riskLevel === 'high') {
    return {
      facility: 'hospital',
      facilityLabel: 'โรงพยาบาล (รพ.แม่ข่าย)',
      suggestedWeek: Math.min(w + 4, 32),
      label: 'ส่งพบแพทย์ที่ รพ.แม่ข่าย เพื่อประเมินภาวะเสี่ยงพร้อมผล LAB และประวัติ',
    };
  }
  if (w < 12) {
    return {
      facility: 'hospital',
      facilityLabel: 'โรงพยาบาล (รพ.แม่ข่าย)',
      suggestedWeek: 20,
      label: 'นัด Ultrasound ครั้งที่ 2 + คัดกรองกลุ่มอาการดาวน์ (14-18 สัปดาห์)',
    };
  }
  if (w < 20) {
    return {
      facility: 'pcu',
      facilityLabel: 'หน่วยปฐมภูมิ / รพ.สต.',
      suggestedWeek: 20,
      label: 'ตรวจครรภ์ตามนัด ที่หน่วยปฐมภูมิ / รพ.สต.',
    };
  }
  if (w < 32) {
    return {
      facility: 'pcu',
      facilityLabel: 'หน่วยปฐมภูมิ / รพ.สต.',
      suggestedWeek: 32,
      label: 'ตรวจครรภ์ตามนัด ที่หน่วยปฐมภูมิ / รพ.สต. จนครบ 32 สัปดาห์',
    };
  }
  return {
    facility: 'hospital',
    facilityLabel: 'โรงพยาบาล (รพ.แม่ข่าย)',
    suggestedWeek: null,
    label: 'ส่งพบแพทย์ที่ รพ.แม่ข่าย ทุกรายตั้งแต่ 32 สัปดาห์ จนครบกำหนดคลอด',
  };
};

export const DEFAULT_ANC_APPOINTMENT = {
  facility: undefined,   // 'pcu' | 'hospital' — prefilled from getNextAncAppointmentPlan
  date: '',
  parentSchool: false,   // "โรงเรียนพ่อแม่" education activity
  kickCountEducation: false, // สอนการนับลูกดิ้น — p.15 (~18-20wk onward, part of โรงเรียนพ่อแม่ trimester 2/3 content)
  mode: 'onsite',        // 'onsite' | 'telemedicine' (TOR 1.10.7.7 — Telemedicine)
  /* Real session-state workflow (not just a label) — mirrors mobile's
     `telemedDone` field on MobileTelemedPage. 'none' when mode is onsite;
     flips to 'started' when the clinician begins the consult, 'completed'
     once they end it. */
  telemedStatus: 'none', // 'none' | 'started' | 'completed'
};

/* ─── Whole-visit default form state ─────────────────────────────── */

export const DEFAULT_ANC_VISIT = {
  // Step 1 — ประวัติการรักษา (TOR 1.10.7.6)
  illnessHistory: '',
  gravida: '',
  para: '',
  abortion: '',
  livingChildren: '',
  lmp: '',
  obstetricHistory: [],   // { id, pregnancyNo, year, deliveryType, outcome, complication }
  breastExamNote: '',
  spouseHealthNote: '',
  currentPregnancyNote: '',
  documents: [],           // uploaded File[] (TOR 1.10.7.4)
  // Tetanus (dT) vaccination HISTORY (legacy HCIS p.2-25) — how many doses
  // before THIS pregnancy + year of the last one, driving the ≤10yr
  // exemption rule. Distinct from Step 5's `vaccines` (administering a
  // dose THIS visit).
  tetanusDoseCount: '',
  tetanusLastDoseYear: '',
  tetanusExempt: false,    // ไม่ต้องฉีดในครรภ์นี้ — เคยได้รับ dT/dT3 มาไม่เกิน 10 ปี
  familyIllnessHistory: {}, // ประวัติการเจ็บป่วยของครอบครัว
  familyIllnessOtherNote: '',
  husbandLabResults: {},    // ตรวจทางห้องปฏิบัติการของสามี/คู่ — นโยบายฝากครรภ์คุณภาพ 2565 (p.72)
  motherChildHealthBookGiven: false, // แจกสมุดบันทึกสุขภาพแม่และเด็ก (legacy p.2-25, p.72)

  // Step 2 — คัดกรองและซักประวัติ (TOR 1.10.7.3/.7)
  stressAnswers: {},       // ST-5 (0-3 per item)
  mentalHealthAnswers: {},
  riskFactors: {},
  dangerSigns: {},
  smokingStatus: '',       // 'nonSmoker' | 'smoker'
  smokingAdviceGiven: false,
  riskScreeningNote: '',

  // Step 3 — ตรวจร่างกาย (TOR 1.10.7.7)
  vitals: { ...ANC_DEFAULT_VITALS },
  fundusHeight: '',
  fetalHeartRate: '',
  oralHealthAnswers: {},   // Maternal Oral Screening (MOS) tool, p.53 — 2Q, score ≥1 = refer dentist

  // Step 4 — วินิจฉัย (TOR 1.10.7.7)
  riskLevel: '',
  gdmConfirmed: false,   // เบาหวานขณะตั้งครรภ์ (GDM) ยืนยันจากผล OGTT — pp.5-8
  diagnosisNote: '',
  externalExamResults: '',  // ผลการตรวจครรภ์จากภายนอก
  externalExamAttachments: [], // uploaded evidence File[] for the above (TOR 1.10.7.7)
  adviceNote: '',            // คำแนะนำ

  // Step 5 — สั่งการรักษา (TOR 1.10.7.5/.7)
  lab1Orders: {},
  labResults: {},          // result VALUES for lab1Orders + lab2Orders (TOR 1.10.7.7/.8)
  secondTrimesterScreening: {}, // swimlane C — Down syndrome + 2nd ultrasound
  diabetesScreening: {},        // swimlane D — GCT/OGTT
  lab2Orders: {},                // swimlane E — 2nd Lab panel
  vaccines: {},                  // swimlane E — dT/Tdap/flu/Covid
  supplements: {},                // swimlane E — iron/folic acid/iodine/calcium
  termAssessment: {},             // swimlane E — 3rd ultrasound/NST/delivery plan
  ultrasoundResults: {},           // structured Ultrasound findings (pp.50-52) — shared by ultrasound2/ultrasound3
  nippleAssessment: '',            // ตรวจประเมินด้านและหัวนม (pp.64-66) — 'normal' | 'flat' | 'inverted'
  plannedDeliveryMode: '',         // แผนการคลอด (pp.59-60) — 'vaginal' | 'cesarean' | 'undecided'
  dentalReferral: false,
  dentalCleaningDone: false,     // ขัดทำความสะอาดฟันแล้ว
  dentalBrushingPractice: false, // ฝึกแปรงฟันแบบลงมือปฏิบัติ

  // Step 6 — นัดหมาย (TOR 1.10.7.5/.7 Telemedicine)
  appointment: { ...DEFAULT_ANC_APPOINTMENT },

  // Step 7 — ใบฝากครรภ์ (TOR 1.10.7.5/.6)
  cardConfirmed: false,
  cardConfirmedAt: '',
};

const hasText = (v) => typeof v === 'string' && v.trim() !== '';

/** Same contract as `getTreatmentCompletedSteps` (treatmentVisits.js) —
    array of 7 booleans driving the StepProgress check marks + footer gate. */
export const getAncCompletedSteps = (form, stepIndex = 0) => [
  !!(hasText(form?.gravida) && hasText(form?.lmp)),                 // Step 1 — gravida + LMP entered
  stepIndex > 1 || Object.values(form?.riskFactors || {}).some(Boolean) || Object.keys(form?.mentalHealthAnswers || {}).length > 0, // Step 2 — screening touched
  stepIndex > 2,                                                    // Step 3 — exam (no hard requirement)
  !!form?.riskLevel,                                                // Step 4 — risk level chosen
  stepIndex > 4,                                                    // Step 5 — orders optional
  !!form?.appointment?.date,                                        // Step 6 — next appointment booked
  !!form?.cardConfirmed,                                            // Step 7 — ANC card confirmed
];

/* ─── Mock ANC registry ───────────────────────────────────────────
   Reuses existing HNs from `patientProfiles.js` / `mrPatients.js` so
   PatientCard / MR lookups keep resolving. LMP dates are picked so the
   6 patients span the visit tiers (<12 / 20 / 32 wks) and all 3 risk
   levels, giving the queue table + summary cards something to show. */
export const ANC_PATIENTS = [
  {
    hn: '67-00002', name: 'ดวงใจ พินิจ', doctor: 'นพ.สมชาย ใจดี',
    gravida: 1, para: 0, lmp: '2026-06-03', riskLevel: 'low',
    queue: 'B-001', room: 'ANC1', statusKey: 'waiting', waitMinutes: 12, visitType: 'first',
  },
  {
    hn: '67-00008', name: 'ธนพร สุนทรา', doctor: 'นพ.ธนากร อินทรา',
    gravida: 2, para: 1, lmp: '2026-04-22', riskLevel: 'intermediate',
    queue: 'B-002', room: 'ANC1', statusKey: 'progress', waitMinutes: 4, visitType: 'followup',
    telemedicine: true,
  },
  {
    hn: '67-00013', name: 'พิมพ์ใจ จันทรา', doctor: 'พญ.ปริยากร เจริญสุข',
    gravida: 1, para: 0, lmp: '2026-05-20', riskLevel: 'low',
    queue: 'B-003', room: 'ANC2', statusKey: 'waiting', waitMinutes: 20, visitType: 'first',
  },
  {
    hn: '67-00019', name: 'นันทิดา พรเลิศ', doctor: 'นพ.อภิชาติ พรหมสาร',
    gravida: 3, para: 2, lmp: '2026-03-11', riskLevel: 'high',
    queue: 'B-004', room: 'ANC2', statusKey: 'done', waitMinutes: 0, visitType: 'followup',
  },
  {
    hn: '67-00027', name: 'จิราพร มณีโชติ', doctor: 'พญ.สมหญิง รักษ์ดี',
    gravida: 1, para: 0, lmp: '2026-01-28', riskLevel: 'low',
    queue: 'B-005', room: 'ANC1', statusKey: 'done', waitMinutes: 0, visitType: 'followup',
  },
  {
    hn: '67-00029', name: 'อาทิตยา บุญเรือง', doctor: 'นพ.ณัฐวุฒิ บุญมี',
    gravida: 2, para: 0, lmp: '2025-12-17', riskLevel: 'intermediate',
    queue: 'B-006', room: 'ANC2', statusKey: 'draft', waitMinutes: 0, visitType: 'followup',
  },
];

export const getAncPatientByHn = (hn) =>
  ANC_PATIENTS.find((p) => p.hn === hn)
  || ANC_SCHEDULED_TODAY.find((p) => p.hn === hn)
  || null;

/** Today's follow-up appointments that haven't checked in yet — legacy
    HCIS ANC queue screen (p.2-2/2-3) splits this into its own tab
    ("ผู้ป่วยนัดที่ยังไม่มาติดต่อ") separate from walk-ins already sent for
    exam, with a checkbox + "ส่งตรวจ" button that moves the row into the
    main queue once the patient arrives. Reuses existing roster HNs (not
    already in ANC_PATIENTS) so PatientCard / MR lookups keep resolving. */
export const ANC_SCHEDULED_TODAY = [
  {
    hn: '67-00011', name: 'อรอุมา ดวงสว่าง', doctor: 'พญ.พรพิมล สุขสำราญ',
    appointmentTime: '09:30', clinic: 'ANC1', lmp: '2026-03-02', riskLevel: 'intermediate',
    gravida: 2, para: 1, visitType: 'followup',
  },
  {
    hn: '67-00017', name: 'ภัคจิรา วงศ์อนันต์', doctor: 'พญ.วิภา สุขศรี',
    appointmentTime: '10:15', clinic: 'ANC2', lmp: '2026-01-15', riskLevel: 'low',
    gravida: 1, para: 0, visitType: 'followup',
  },
];

/** Read-only prior-visit trend (TOR 1.10.7.8 — "การติดตามการฝากครรภ์":
    ผลการตรวจร่างกาย ตรวจครรภ์ Lab ในช่วงเวลา). Only patients with
    `visitType: 'followup'` carry entries — first-time visitors have
    nothing to show yet. */
export const ANC_VISIT_HISTORY = {
  '67-00008': [
    { date: '20 มี.ค. 2569', gestWeeks: 8,  fundusHeight: '-', fetalHeartRate: '-', bp: '108/68', weight: 54, urineResult: 'ปกติ', riskLevel: 'low', labSummary: 'หมู่เลือด (ABO): A, Rh: Positive, Hb (g%): 12.1', note: 'ฝากครรภ์ครั้งแรก — ตรวจ Lab ครั้งที่ 1' },
  ],
  '67-00019': [
    { date: '18 ก.พ. 2569', gestWeeks: 12, fundusHeight: '12 ซม.', fetalHeartRate: '148 bpm', bp: '124/80', weight: 58, urineResult: 'ปกติ', riskLevel: 'intermediate', labSummary: 'หมู่เลือด (ABO): O, Rh: Positive, Hb (g%): 11.2', note: 'พบความดันโลหิตค่อนข้างสูง — นัดติดตามถี่ขึ้น' },
    { date: '11 มี.ค. 2569', gestWeeks: 15, fundusHeight: '15 ซม.', fetalHeartRate: '150 bpm', bp: '128/84', weight: 59, urineResult: 'ผิดปกติ (พบโปรตีน)', riskLevel: 'high', labSummary: '-', note: 'ส่งพบแพทย์ รพ.แม่ข่าย ประเมินความเสี่ยง' },
  ],
  '67-00027': [
    { date: '28 ม.ค. 2569', gestWeeks: 6,  fundusHeight: '-', fetalHeartRate: '-', bp: '110/70', weight: 50, urineResult: '-', riskLevel: 'low', labSummary: '-', note: 'ฝากครรภ์ครั้งแรก' },
    { date: '25 ก.พ. 2569', gestWeeks: 10, fundusHeight: '-', fetalHeartRate: '-', bp: '112/72', weight: 51, urineResult: 'ปกติ', riskLevel: 'low', labSummary: 'หมู่เลือด (ABO): B, Rh: Positive, Hb (g%): 11.8', note: 'นัดตรวจ Lab ครั้งที่ 1' },
  ],
  '67-00029': [
    { date: '17 ธ.ค. 2568', gestWeeks: 4,  fundusHeight: '-', fetalHeartRate: '-', bp: '118/78', weight: 56, urineResult: 'ปกติ', riskLevel: 'intermediate', labSummary: '-', note: 'ฝากครรภ์ครั้งแรก — มีประวัติเบาหวานขณะตั้งครรภ์ครั้งก่อน' },
  ],
};

/* Session-scoped persistence — same pattern as `opdScreeningDrafts.js`:
   sessionStorage survives route navigation within the tab but resets per
   session, which is enough to make "การติดตามการฝากครรภ์" (TOR 1.10.7.8)
   and "ยกเลิกทะเบียนฝากครรภ์" (TOR 1.10.7.6) real instead of static mocks,
   without standing up a backend. */
const canUseSessionStorage = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const VISIT_HISTORY_KEY = 'mih:anc-visit-history';
const CANCELLED_KEY = 'mih:anc-cancelled-registrations';

const readJson = (key, fallback) => {
  if (!canUseSessionStorage()) return fallback;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(key) || 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.setItem(key, JSON.stringify(value));
};

/** Appends a completed visit onto the patient's follow-up trend (TOR
    1.10.7.8) — called when Step 7's "ยืนยันและพิมพ์ใบฝากครรภ์" confirms. */
export const saveAncVisitRecord = (hn, record) => {
  if (!hn) return;
  const store = readJson(VISIT_HISTORY_KEY, {});
  store[hn] = [...(store[hn] || []), record];
  writeJson(VISIT_HISTORY_KEY, store);
};

/** Merges the mock trend with any visits saved this session, most-recent last. */
export const getAncVisitHistoryByHn = (hn) => {
  const stored = readJson(VISIT_HISTORY_KEY, {});
  return [...(ANC_VISIT_HISTORY[hn] || []), ...(stored[hn] || [])];
};

/** Cancels an ANC registration (TOR 1.10.7.6 — "ยกเลิก") — reversible via
    `reactivateAncRegistration`, reason is required so the audit trail
    reads clearly on the queue table. */
export const cancelAncRegistration = (hn, reason) => {
  if (!hn) return;
  const store = readJson(CANCELLED_KEY, {});
  store[hn] = { reason: reason || 'ไม่ระบุเหตุผล', cancelledAt: formatAncDate(new Date()) };
  writeJson(CANCELLED_KEY, store);
};

export const reactivateAncRegistration = (hn) => {
  if (!hn) return;
  const store = readJson(CANCELLED_KEY, {});
  delete store[hn];
  writeJson(CANCELLED_KEY, store);
};

export const getAncCancellation = (hn) => readJson(CANCELLED_KEY, {})[hn] || null;

const CHECKED_IN_KEY = 'mih:anc-checked-in-today';

/** "ส่งตรวจ" (legacy p.2-3) — moves a scheduled-but-not-arrived patient
    into the main queue for today. */
export const checkInAncAppointment = (hn) => {
  if (!hn) return;
  const store = readJson(CHECKED_IN_KEY, {});
  store[hn] = true;
  writeJson(CHECKED_IN_KEY, store);
};

export const getAncScheduledNotArrived = () => {
  const checkedIn = readJson(CHECKED_IN_KEY, {});
  return ANC_SCHEDULED_TODAY.filter((p) => !checkedIn[p.hn]);
};

/** Main queue rows = the mock roster + whichever scheduled appointments
    have been checked in today, synthesized into the same row shape
    (queue code, room, waiting status) the queue table expects. */
export const getAncQueueRows = () => {
  const checkedIn = readJson(CHECKED_IN_KEY, {});
  const checkedInRows = ANC_SCHEDULED_TODAY
    .filter((p) => checkedIn[p.hn])
    .map((p, idx) => ({
      ...p,
      queue: `W-${String(idx + 1).padStart(3, '0')}`,
      room: p.clinic,
      statusKey: 'waiting',
      waitMinutes: 0,
      visitType: 'followup',
    }));
  return [...ANC_PATIENTS, ...checkedInRows];
};

/* ─── SuggestibleTextarea word-lists ──────────────────────────────────
   Autocomplete suggestions for every free-text note in the ANC flow
   (voice input + typing suggestions, matching the pattern already used by
   OPD's TreatmentSteps.jsx / DIAGNOSIS_SUGGESTIONS). Phrases are grounded
   in the same official manual + legacy HCIS content the rest of this file
   cites — not generic filler. */
export const ANC_ILLNESS_HISTORY_SUGGESTIONS = [
  'ไม่มีโรคประจำตัว',
  'เป็นเบาหวานก่อนตั้งครรภ์ (Pre-existing DM)',
  'ความดันโลหิตสูงเรื้อรัง (Chronic hypertension)',
  'โรคไทรอยด์ (Thyroid disease)',
  'โรคหัวใจ (Heart disease)',
  'โรคไต (Kidney disease)',
  'โรคหอบหืด (Asthma)',
  'ภูมิแพ้ยา (Drug allergy)',
  'เคยผ่าตัด (Previous surgery)',
  'เคยแท้งบุตร (Previous miscarriage)',
];

export const ANC_CURRENT_PREGNANCY_SUGGESTIONS = [
  'อาการแพ้ท้อง (Nausea/vomiting)',
  'ทารกดิ้นดี รู้สึกได้สม่ำเสมอ',
  'ลูกดิ้นน้อยลง',
  'ปวดหลังส่วนล่าง',
  'ตะคริวขา',
  'บวมที่เท้า/ขา',
  'มีตกขาวผิดปกติ',
  'นอนไม่หลับ',
  'ไม่พบอาการผิดปกติ',
];

export const ANC_RISK_SCREENING_SUGGESTIONS = [
  'ไม่พบปัจจัยเสี่ยงเพิ่มเติมจากการซักประวัติ',
  'มีประวัติครอบครัวเป็นเบาหวาน',
  'มีประวัติครอบครัวความดันโลหิตสูง',
  'กังวลเรื่องการตั้งครรภ์และการคลอด',
  'ต้องการคำปรึกษาด้านจิตใจเพิ่มเติม',
  'ให้คำแนะนำและติดตามอาการต่อเนื่อง',
];

export const ANC_DIAGNOSIS_SUGGESTIONS = [
  'ครรภ์แรก ไม่พบภาวะเสี่ยง (G1, low risk)',
  'ครรภ์ที่ 2 ไม่พบภาวะเสี่ยง',
  'ภาวะเสี่ยงปานกลาง ต้องติดตามใกล้ชิด',
  'ภาวะเสี่ยงสูง ส่งต่อ รพ.แม่ข่าย',
  'ความดันโลหิตสูงขณะตั้งครรภ์ (Gestational hypertension)',
  'เบาหวานขณะตั้งครรภ์ (Gestational diabetes)',
  'โลหิตจางจากการขาดธาตุเหล็ก (Iron deficiency anemia)',
  'ทารกโตช้าในครรภ์ (IUGR)',
  'ครรภ์เป็นพิษ (Preeclampsia)',
];

export const ANC_EXTERNAL_EXAM_SUGGESTIONS = [
  'ผล Ultrasound จากสถานพยาบาลอื่น ปกติ',
  'ผล Lab จากสถานพยาบาลอื่น ปกติ',
  'นำผลตรวจจากคลินิกเอกชนมาแสดง',
  'ไม่มีผลการตรวจจากภายนอก',
];

export const ANC_ADVICE_SUGGESTIONS = [
  'รับประทานยาเสริมธาตุเหล็กและกรดโฟลิกสม่ำเสมอ',
  'สังเกตการดิ้นของทารกทุกวัน',
  'มาพบแพทย์ก่อนนัดหากมีเลือดออกทางช่องคลอด',
  'มาพบแพทย์ก่อนนัดหากปวดท้องรุนแรงหรือท้องแข็งถี่',
  'มาพบแพทย์ก่อนนัดหากลูกดิ้นน้อยลง',
  'พักผ่อนให้เพียงพอ หลีกเลี่ยงงานหนัก',
  'งดสูบบุหรี่และเครื่องดื่มแอลกอฮอล์',
  'มาตามนัดฝากครรภ์ครั้งถัดไป',
  'แปรงฟันวันละ 2 ครั้ง ดูแลสุขภาพช่องปาก',
];
