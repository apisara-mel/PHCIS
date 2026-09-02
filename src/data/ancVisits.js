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


/** ภาวะเสี่ยงที่ประเมิน "ทุกครั้งที่มีการให้บริการตรวจครรภ์" — legacy HCIS
    ANC module (คู่มือระบบงานฝากครรภ์ p.2-13, §2.4 ภาวะเสี่ยงของหญิงมีครรภ์),
    the right-hand panel headed "ใช้ทุกครั้งที่มีการให้บริการตรวจครรภ์"
    (items 8-20). Distinct from `ANC_RISK_FACTORS`, which is the
    once-per-registration history screen (the left-hand panel, items 1-7):
    THIS list is re-answered at every follow-up visit because each item is a
    finding of the visit in front of you, not a fact about the past.
    Per the manual's step 2: "ถ้าพบภาวะเสี่ยงข้อใดข้อหนึ่งต้องส่งต่อหรือ
    รายงานแพทย์". */
export const ANC_PERVISIT_RISK_FACTORS = [
  { key: 'anemia',            label: 'เป็นโรคโลหิตจาง (Hb < 11 gms. หรือ Hct. < 33%)' },
  { key: 'vdrlPositive',      label: 'ตรวจ VDRL ได้ผลบวก' },
  { key: 'abnormalUrine',     label: 'พบไข่ขาวในปัสสาวะ และ/หรือพบน้ำตาลในปัสสาวะ' },
  { key: 'hypertension',      label: 'ความดันโลหิต 140/90 มิลลิเมตรปรอทหรือมากกว่า' },
  { key: 'goitre',            label: 'คอพอก/ไทรอยด์โต' },
  { key: 'heartDisease',      label: 'เป็นโรคหัวใจ หรือสงสัยว่าเป็นโรคหัวใจ' },
  { key: 'fundusMismatch',    label: 'ขนาดของมดลูกไม่สัมพันธ์กับอายุครรภ์' },
  { key: 'multiplePregnancy', label: 'ครรภ์แฝด' },
  { key: 'malpresentation',   label: 'ทารกอยู่ในท่าผิดปกติ (ไม่ใช่ท่าศีรษะ) ตั้งแต่ 34 สัปดาห์ขึ้นไป' },
  { key: 'bleeding',          label: 'เลือดออกขณะตั้งครรภ์' },
  { key: 'postTerm',          label: 'ตั้งครรภ์เกิน 40 สัปดาห์' },
  { key: 'weightGainAbnormal', label: 'น้ำหนักขึ้นน้อยกว่า 1 กก./เดือน หรือมากกว่า 4 กก./เดือน (ตั้งแต่ 24 สัปดาห์ขึ้นไป)' },
  { key: 'reducedMovement',   label: 'เด็กดิ้นน้อยกว่า 10 ครั้ง/วัน ตั้งแต่ 32 สัปดาห์ขึ้นไป' },
];

/** แบบคัดกรองเบาหวานในหญิงมีครรภ์ — the third panel on the same legacy
    screen (p.2-13). Any checked item flags the patient for the GCT/OGTT
    pathway that `ANC_DIABETES_SCREENING` (Step 5, swimlane D) orders. */
export const ANC_GDM_SCREENING_FACTORS = [
  { key: 'firstPregnancyUnder20', label: 'ตั้งครรภ์แรกเมื่ออายุน้อยกว่า 20 ปี' },
  { key: 'weightGainMismatch',    label: 'น้ำหนักตัวที่เพิ่มขึ้นไม่สมดุลกับอายุครรภ์' },
  { key: 'priorGdm',              label: 'เคยเป็นโรคเบาหวานขณะตั้งครรภ์' },
  { key: 'familyDiabetes',        label: 'มีประวัติพี่น้อง/ครอบครัวเป็นเบาหวาน' },
  { key: 'ageOver30',             label: 'อายุ 30 ปีหรือมากกว่า' },
  { key: 'macrosomia',            label: 'เคยคลอดบุตรน้ำหนักแรกเกิดตั้งแต่ 4 กิโลกรัมขึ้นไป' },
  { key: 'priorAnomaly',          label: 'เคยคลอดบุตรที่มีความผิดปกติแต่กำเนิดโดยไม่ทราบสาเหตุ' },
  { key: 'priorStillbirth',       label: 'เคยคลอดบุตรและทารกเสียชีวิตโดยไม่ทราบสาเหตุ' },
];

/** Manual p.2-13 step 2 — "ถ้าพบภาวะเสี่ยงข้อใดข้อหนึ่งต้องส่งต่อหรือรายงาน
    แพทย์". Returns the labels actually flagged so the UI can name them
    rather than just showing a count. */
export const interpretPerVisitRisk = (perVisitRiskFactors) => {
  const flagged = ANC_PERVISIT_RISK_FACTORS
    .filter((rf) => perVisitRiskFactors?.[rf.key])
    .map((rf) => rf.label);
  return { flagged, mustRefer: flagged.length > 0 };
};

/** Per-visit risk items the form can already work out for itself from data
    the clinician has entered elsewhere in this visit (vitals, urine
    dipstick, gestational age, ultrasound, lab results).

    9 of the 13 items on the legacy checklist are pure restatements of a
    number recorded two steps earlier — re-deriving them by hand is where a
    referral gets missed on a busy clinic day. These are returned as
    SUGGESTIONS, never auto-applied: the checklist is the clinician's
    clinical judgement and a silent tick would misattribute it. The UI
    offers them for one-click acceptance and says why each one fired.

    Every threshold is the manual's own wording (p.2-13), including its
    gestational-age qualifiers — item 16 only applies from 34 weeks and
    item 20 from 32 weeks, so neither fires before then. */
export const deriveAncRiskSuggestions = (form) => {
  if (!form) return [];
  const out = [];
  const add = (key, reason) => {
    const item = ANC_PERVISIT_RISK_FACTORS.find((rf) => rf.key === key);
    if (item) out.push({ key, label: item.label, reason });
  };

  const ga = calculateGestationalAge(form.lmp);
  const weeks = ga?.weeks;
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  // ข้อ 11 — ความดันโลหิต 140/90 ขึ้นไป
  const bpMatch = /^\s*(\d{2,3})\s*\/\s*(\d{2,3})\s*$/.exec(String(form.vitals?.bp ?? ''));
  if (bpMatch) {
    const [sys, dia] = [Number(bpMatch[1]), Number(bpMatch[2])];
    if (sys >= 140 || dia >= 90) add('hypertension', `ความดันโลหิต ${sys}/${dia} mmHg`);
  }

  // ข้อ 10 — พบไข่ขาว และ/หรือน้ำตาลในปัสสาวะ
  const POSITIVE = ['1+', '2+', '3+', '4+'];
  const urineHits = [
    POSITIVE.includes(form.urineSugar) ? `น้ำตาล ${form.urineSugar}` : '',
    POSITIVE.includes(form.urineAlbumin) ? `ไข่ขาว ${form.urineAlbumin}` : '',
  ].filter(Boolean);
  if (urineHits.length) add('abnormalUrine', `ผลตรวจปัสสาวะ ${urineHits.join(' · ')}`);

  // ข้อ 14 — ขนาดมดลูกไม่สัมพันธ์กับอายุครรภ์ (LMP vs การตรวจครรภ์)
  const gaExam = num(form.gaByExam);
  if (weeks != null && gaExam != null && Math.abs(weeks - gaExam) >= 3) {
    add('fundusMismatch', `อายุครรภ์จาก LMP ${weeks} สัปดาห์ vs การตรวจครรภ์ ${gaExam} สัปดาห์`);
  }

  // ข้อ 8 — โลหิตจาง (Hb < 11 หรือ Hct < 33) จากผล Lab ครั้งที่ 1 หรือ 2
  const hb = num(form.labResults?.hb2) ?? num(form.labResults?.hb);
  const hct = num(form.labResults?.hct2) ?? num(form.labResults?.hct);
  if ((hb != null && hb < 11) || (hct != null && hct < 33)) {
    add('anemia', `ผล Lab ${hb != null ? `Hb ${hb} g%` : ''}${hb != null && hct != null ? ' · ' : ''}${hct != null ? `Hct ${hct}%` : ''}`);
  }

  // ข้อ 9 — VDRL ผลบวก
  if (form.labResults?.vdrlResult === 'Reactive' || form.labResults?.vdrlResult2 === 'Reactive') {
    add('vdrlPositive', 'ผล VDRL = Reactive');
  }

  // ข้อ 15 — ครรภ์แฝด (จำนวนทารกจาก Ultrasound)
  const fetusCount = num(form.ultrasoundResults?.numberOfFetus);
  if (fetusCount != null && fetusCount > 1) add('multiplePregnancy', `Ultrasound พบทารก ${fetusCount} คน`);

  // ข้อ 16 — ท่าผิดปกติ ตั้งแต่ 34 สัปดาห์ขึ้นไป
  if (weeks != null && weeks >= 34 && (form.presentation === 'breech' || form.presentation === 'transverse')) {
    const label = ANC_PRESENTATION_OPTIONS.find((o) => o.value === form.presentation)?.label;
    add('malpresentation', `${label} ที่อายุครรภ์ ${weeks} สัปดาห์`);
  }

  // ข้อ 18 — ตั้งครรภ์เกิน 40 สัปดาห์
  if (weeks != null && weeks > 40) add('postTerm', `อายุครรภ์ ${weeks} สัปดาห์`);

  // ข้อ 20 — เด็กดิ้นน้อย ตั้งแต่ 32 สัปดาห์ขึ้นไป
  if (weeks != null && weeks >= 32 && (form.fetalMovement === 'reduced' || form.fetalMovement === 'absent')) {
    const label = ANC_FETAL_MOVEMENT_OPTIONS.find((o) => o.value === form.fetalMovement)?.label;
    add('reducedMovement', `บันทึกการดิ้นของทารก: ${label}`);
  }

  return out;
};

/* ─── Step 3 — per-visit exam findings (legacy p.2-10/2-11) ────────────
   The legacy "บันทึกการตรวจครรภ์" screen records urine sugar + albumin as
   separate dipstick grades (not one ปกติ/ผิดปกติ flag), and carries THREE
   independent gestational-age estimates side by side — จากการคำนวณ LMP,
   จากการตรวจครรภ์, จากการอัลตราซาวด์ — because they routinely disagree and
   the discrepancy is itself the clinical signal (item 14 of the per-visit
   risk list, "ขนาดของมดลูกไม่สัมพันธ์กับอายุครรภ์"). */
const DIPSTICK_OPTIONS = ['Negative', 'Trace', '1+', '2+', '3+', '4+'];
export const ANC_URINE_SUGAR_OPTIONS = DIPSTICK_OPTIONS;
export const ANC_URINE_ALBUMIN_OPTIONS = DIPSTICK_OPTIONS;

export const ANC_FUNDUS_LEVEL_OPTIONS = [
  { value: 'notPalpable',    label: 'ยังคลำไม่ได้' },
  { value: 'symphysis',      label: 'เหนือหัวหน่าว' },
  { value: 'belowUmbilicus', label: 'ต่ำกว่าระดับสะดือ' },
  { value: 'umbilicus',      label: 'ระดับสะดือ' },
  { value: 'aboveUmbilicus', label: 'สูงกว่าระดับสะดือ' },
  { value: 'xiphoid',        label: 'ระดับลิ้นปี่' },
];

export const ANC_PRESENTATION_OPTIONS = [
  { value: 'vertex',     label: 'ท่าศีรษะ (Vertex)' },
  { value: 'breech',     label: 'ท่าก้น (Breech)' },
  { value: 'transverse', label: 'ท่าขวาง (Transverse)' },
  { value: 'unclear',    label: 'ยังไม่แน่ชัด' },
];

/** การลง — whether the presenting part is still floating or engaged. */
export const ANC_DESCENT_OPTIONS = [
  { value: 'floating', label: 'ลอย (Floating)' },
  { value: 'engaged',  label: 'ตรึง (Engaged)' },
];

/** เด็กดิ้น — the legacy screen's ปกติ / ดิ้นน้อย / ไม่ดิ้น radio. Feeds
    per-visit risk item 20 (เด็กดิ้นน้อยกว่า 10 ครั้ง/วัน). */
export const ANC_FETAL_MOVEMENT_OPTIONS = [
  { value: 'normal',  label: 'ดิ้นดี ปกติ' },
  { value: 'reduced', label: 'ดิ้นน้อยลง' },
  { value: 'absent',  label: 'ไม่ดิ้น' },
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
/* `short` = ป้ายของช่องเมื่อแสดงเป็นดรอปดาวน์ · `options` = ตัวเลือกที่พูดเป็น
   ประโยคเต็มแทน "ใช่/ไม่ใช่" (มติผู้ใช้ 2 ก.ย. 69) — คำตอบจึงอ่านออกเองโดยไม่ต้อง
   ย้อนไปอ่านคำถาม `label` ยังเป็นข้อความคำถามฉบับเต็มสำหรับที่อื่นที่ใช้อยู่ */
export const ANC_ORAL_HEALTH_QUESTIONS = [
  {
    key: 'symptoms',
    label: 'มีเหงือกบวม เลือดออกที่เหงือก ปวดฟัน มีปัญหาการกินอาหาร หรือปัญหาอื่นในช่องปากหรือไม่',
    short: 'อาการผิดปกติในช่องปาก',
    riskAnswer: true,
    options: [
      { value: true, label: 'มีเหงือกบวม เลือดออกที่เหงือก ปวดฟัน มีปัญหาการกินอาหาร หรือปัญหาอื่นในช่องปาก' },
      { value: false, label: 'ไม่มีปัญหา' },
    ],
  },
  {
    key: 'notVisited',
    label: 'ไม่ได้ไปพบทันตแพทย์ในช่วง 1 ปีที่ผ่านมา',
    short: 'ประวัติการพบทันตแพทย์ (1 ปีที่ผ่านมา)',
    riskAnswer: true,
    options: [
      { value: true, label: 'ไม่ได้ไปพบทันตแพทย์ในช่วง 1 ปีที่ผ่านมา' },
      { value: false, label: 'ไปพบทันตแพทย์ในช่วง 1 ปีที่ผ่านมา' },
    ],
  },
];

export const interpretOralHealthScreen = (answers) => {
  const score = ANC_ORAL_HEALTH_QUESTIONS.filter((q) => answers?.[q.key] === q.riskAnswer).length;
  return { score, highRisk: score >= 1 };
};

/* ─── Step 3 — ตรวจร่างกาย ────────────────────────────────────────── */

export const ANC_DEFAULT_VITALS = { bp: '110/70', hr: 82, temp: 36.7, rr: 18, spo2: 99, weight: 58, height: 160 };

/* ═══════════════════════════════════════════════════════════════════
   มติ คทง.2 — "น้ำหนักและ BMI คำนวณ/แปลผลอัตโนมัติ"
   เดิมมีแค่ checkbox ความเสี่ยง (BMI < 18.5 หรือ > 30 · น้ำหนักขึ้นผิดเกณฑ์)
   ให้พยาบาลติ๊กเอง — ต่อไปคำนวณจากน้ำหนัก/ส่วนสูงที่กรอกจริง เกณฑ์การเพิ่ม
   น้ำหนักอ้างอิง IOM 2009 (ครรภ์เดี่ยว) ที่กรมอนามัยใช้ในสมุดสุขภาพแม่และเด็ก
   ═══════════════════════════════════════════════════════════════════ */

export const calcBmi = (weightKg, heightCm) => {
  const w = Number(weightKg);
  const h = Number(heightCm);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  const m = h / 100;
  return Math.round((w / (m * m)) * 10) / 10;
};

/** แปลผล BMI ก่อนตั้งครรภ์ + ช่วงน้ำหนักที่ควรเพิ่มตลอดการตั้งครรภ์ (IOM 2009) */
export const interpretPrePregnancyBmi = (bmi) => {
  if (bmi == null) return null;
  if (bmi < 18.5) {
    return {
      group: 'underweight', label: 'น้ำหนักน้อยกว่าเกณฑ์ (BMI < 18.5)', badge: 'yellow',
      totalGain: [12.5, 18], weeklyGain: [0.44, 0.58], risk: true,
      advice: 'ควรเพิ่มน้ำหนักตลอดครรภ์ 12.5–18 กก. — ให้คำแนะนำโภชนาการเพิ่มพลังงาน',
    };
  }
  if (bmi < 23) {
    return {
      group: 'normal', label: 'น้ำหนักปกติ (BMI 18.5–22.9)', badge: 'green',
      totalGain: [11.5, 16], weeklyGain: [0.35, 0.50], risk: false,
      advice: 'ควรเพิ่มน้ำหนักตลอดครรภ์ 11.5–16 กก.',
    };
  }
  if (bmi < 25) {
    return {
      group: 'overweight', label: 'น้ำหนักเกิน (BMI 23–24.9)', badge: 'yellow',
      totalGain: [7, 11.5], weeklyGain: [0.23, 0.33], risk: false,
      advice: 'ควรเพิ่มน้ำหนักตลอดครรภ์ 7–11.5 กก. — เฝ้าระวังเบาหวานขณะตั้งครรภ์',
    };
  }
  if (bmi < 30) {
    return {
      group: 'obese1', label: 'อ้วนระดับ 1 (BMI 25–29.9)', badge: 'orange',
      totalGain: [7, 11.5], weeklyGain: [0.23, 0.33], risk: true,
      advice: 'ควรเพิ่มน้ำหนักตลอดครรภ์ 7–11.5 กก. — คัดกรองเบาหวานและความดันถี่ขึ้น',
    };
  }
  return {
    group: 'obese2', label: 'อ้วนระดับ 2 ขึ้นไป (BMI ≥ 30)', badge: 'red',
    totalGain: [5, 9], weeklyGain: [0.17, 0.27], risk: true,
    advice: 'ควรเพิ่มน้ำหนักตลอดครรภ์ 5–9 กก. — ส่งพบแพทย์ประเมินความเสี่ยงครรภ์',
  };
};

/** เทียบน้ำหนักที่เพิ่มจริงกับเกณฑ์ ณ อายุครรภ์นั้น
    (ไตรมาสแรกใช้เกณฑ์รวม 0.5–2 กก. · หลัง 13 สัปดาห์บวกอัตราต่อสัปดาห์) */
export const evaluateWeightGain = ({ prePregnancyWeight, currentWeight, heightCm, gaWeeks }) => {
  const pre = Number(prePregnancyWeight);
  const cur = Number(currentWeight);
  const wk = Number(gaWeeks);
  if (!Number.isFinite(pre) || !Number.isFinite(cur) || pre <= 0 || cur <= 0) return null;
  const bmi = calcBmi(pre, heightCm);
  const band = interpretPrePregnancyBmi(bmi);
  const gained = Math.round((cur - pre) * 10) / 10;
  if (!band || !Number.isFinite(wk) || wk <= 0) return { gained, bmi, band, level: null };
  const [lo, hi] = wk < 14
    ? [0.5, 2]
    : [
      Math.round((0.5 + band.weeklyGain[0] * (wk - 13)) * 10) / 10,
      Math.round((2 + band.weeklyGain[1] * (wk - 13)) * 10) / 10,
    ];
  if (gained < lo) {
    return {
      gained, bmi, band, expected: [lo, hi], level: 'low', badge: 'orange',
      label: 'น้ำหนักเพิ่มน้อย',
      message: `น้ำหนักเพิ่ม ${gained} กก. ต่ำกว่าเกณฑ์ที่อายุครรภ์ ${wk} สัปดาห์ (ควรอยู่ ${lo}–${hi} กก.) — ประเมินภาวะโภชนาการและการเจริญเติบโตของทารก`,
    };
  }
  if (gained > hi) {
    return {
      gained, bmi, band, expected: [lo, hi], level: 'high', badge: 'orange',
      label: 'น้ำหนักเพิ่มมาก',
      message: `น้ำหนักเพิ่ม ${gained} กก. สูงกว่าเกณฑ์ที่อายุครรภ์ ${wk} สัปดาห์ (ควรอยู่ ${lo}–${hi} กก.) — เฝ้าระวังเบาหวานขณะตั้งครรภ์และครรภ์เป็นพิษ`,
    };
  }
  return {
    gained, bmi, band, expected: [lo, hi], level: 'ok', badge: 'green',
    label: 'น้ำหนักเพิ่มดี',
    message: `น้ำหนักเพิ่ม ${gained} กก. อยู่ในเกณฑ์ที่ควรเป็น (${lo}–${hi} กก.) ที่อายุครรภ์ ${wk} สัปดาห์`,
  };
};

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
  /* ตรวจหัวนมบันทึกแยกซ้าย/ขวาแล้ว (มติ คทง.2) — ค่ารวมช่องเดียวของแบบเดิม
     ยังอ่านไว้เพื่อให้วิสิตที่บันทึกก่อนหน้าสรุปได้เหมือนเดิม */
  const nippleSide = (v) => ANC_NIPPLE_SIDE_OPTIONS.find((o) => o.value === v)?.label;
  if (form.nippleLeft || form.nippleRight) {
    names.push(`ตรวจหัวนม: ซ้าย ${nippleSide(form.nippleLeft) || '-'} · ขวา ${nippleSide(form.nippleRight) || '-'}`);
  } else if (form.nippleAssessment) {
    const opt = ANC_NIPPLE_ASSESSMENT_OPTIONS.find((o) => o.value === form.nippleAssessment);
    if (opt) names.push(`ตรวจหัวนม: ${opt.label}`);
  }
  if (form.dentalCariesCount !== '' && form.dentalCariesCount != null) {
    names.push(`ตรวจฟัน: ฟันผุ ${form.dentalCariesCount} ซี่`);
  }
  if (form.dentalGum) {
    const gum = ANC_GUM_OPTIONS.find((o) => o.value === form.dentalGum);
    if (gum) names.push(`เหงือก: ${gum.label}`);
  }
  collect(ANC_DISPENSE_ITEMS.map((i) => ({ key: i.key, th: `จ่ายยา ${i.label}` })), form.dispenseItems);
  collect(ANC_VACCINE_DOSES.map((i) => ({ key: i.key, th: `ฉีด${i.label}` })), form.vaccineDoses);
  if (form.ultrasoundDone) {
    names.push(`Ultrasound${form.ultrasoundGaWeeks ? ` ที่อายุครรภ์ ${form.ultrasoundGaWeeks} สัปดาห์` : ''}`);
  }
  (form.medications || []).forEach((m) => { if (m?.name) names.push(`สั่งยา ${m.name}`); });
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
  saved: false,          // กด "บันทึกนัดหมาย" แล้ว — การ์ดสรุปแทนฟอร์ม แก้ไขได้
  time: '',              // เวลานัด — คู่กับ `date`, ห้ามนัดย้อนหลัง
  mode: 'onsite',        // 'onsite' | 'telemedicine' (TOR 1.10.7.7 — Telemedicine)
  cancelled: false,      // TOR 1.10.7.5 "ยกเลิก" — เหตุผลบังคับ ผ่านป๊อปอัป
  cancelReason: '',
  /* Real session-state workflow (not just a label) — mirrors mobile's
     `telemedDone` field on MobileTelemedPage. 'none' when mode is onsite;
     flips to 'started' when the clinician begins the consult, 'completed'
     once they end it. */
  telemedStatus: 'none', // 'none' | 'started' | 'completed'
};

/* ═══════════════════════════════════════════════════════════════════
   มติ คทง.2 ครั้งที่ 4 (24 ก.ย. 68) — ส่วนขยายของ TOR 1.10.7.6/.7/.8
   ที่ประชุมกำหนดรูปแบบการเก็บข้อมูลไว้ชัดเจนกว่า TOR: ประวัติเจ็บป่วยเป็น
   checkbox แทน free text · แบบคัดกรองความเสี่ยง 27 ข้อ (สมุดสีชมพู) แสดง
   เฉพาะการฝากครรภ์ครั้งแรก · GDM ประมวลผลจากแบบ 27 ข้อแล้วแจ้งเตือนเอง ·
   ประวัติสามีเพิ่มหมู่เลือด/Rh/สถานะสูบบุหรี่ · ทันตกรรมและการจ่ายยา/วัคซีน
   เป็นกล่องของตัวเอง · คำแนะนำเป็น checkbox ที่ระบบเลือกตามอายุครรภ์
   ═══════════════════════════════════════════════════════════════════ */

/** ประวัติการเจ็บป่วยในอดีตของหญิงตั้งครรภ์ — มติ คทง.2: เปลี่ยนจาก free
    text เป็น checkbox ตามรายการที่ที่ประชุมระบุ (เบาหวาน · ความดันโลหิตสูง ·
    หัวใจ · ไทรอยด์ · ภาวะซีด) แล้วเหลือช่อง "อื่นๆ" ไว้พิมพ์รายละเอียด
    ที่ไม่เข้ารายการ. ชื่อหมวดใช้ "ประวัติการเจ็บป่วยในอดีต" ตามมติเดียวกัน
    (เดิม "ประวัติการรักษา" ซ้ำกับชื่อขั้นตอน). */
export const ANC_ILLNESS_CHECKLIST = [
  { key: 'diabetes',     label: 'เบาหวาน' },
  { key: 'hypertension', label: 'โรคความดันโลหิตสูง' },
  { key: 'heartDisease', label: 'โรคหัวใจ' },
  { key: 'thyroid',      label: 'โรคไทรอยด์' },
  { key: 'anemia',       label: 'ภาวะซีด' },
];

/** ตารางประวัติการตั้งครรภ์และการคลอดในอดีต — คอลัมน์ตามมติ คทง.2:
    ครรภ์ที่ · ปีที่คลอด · วิธีคลอด · อายุครรภ์เมื่อคลอด · ภาวะแทรกซ้อน ·
    ผลการคลอด · น้ำหนักแรกเกิด. */
export const ANC_DELIVERY_TYPE_OPTIONS = [
  'คลอดปกติ (Normal labor)',
  'ผ่าตัดคลอด (Cesarean section)',
  'ใช้เครื่องดูดสุญญากาศ (Vacuum)',
  'ใช้คีม (Forceps)',
  'แท้ง (Abortion)',
];

export const ANC_DELIVERY_OUTCOME_OPTIONS = [
  { value: 'liveBirth',  label: 'เกิดมีชีพ' },
  { value: 'stillbirth', label: 'เกิดไม่มีชีพ' },
];

/** สถานะการสูบบุหรี่ของสามี/คู่ — เก็บเพื่อประเมินความเสี่ยงจากบุหรี่มือสอง
    (มติ คทง.2), แยกจาก `smokingStatus` ซึ่งเป็นของหญิงตั้งครรภ์เอง. */
export const ANC_SPOUSE_SMOKING_OPTIONS = [
  { value: 'nonSmoker', label: 'ไม่สูบบุหรี่' },
  { value: 'smoker',    label: 'สูบบุหรี่' },
  { value: 'quit',      label: 'เคยสูบ เลิกแล้ว' },
];

/* ─── แบบคัดกรองความเสี่ยง 27 ข้อ (สมุดบันทึกสุขภาพแม่และเด็ก) ────────
   มติ คทง.2: "Checkbox List จำนวน 27 ข้อตามสมุดสีชมพู · แสดงเฉพาะการ
   ฝากครรภ์ครั้งแรกเท่านั้น · บางข้อ (ความดันโลหิตสูง ภาวะซีด) ดึงจากการ
   ตรวจร่างกายและผลแล็บมาแสดงผลอัตโนมัติ".

   จัดเป็น 4 หมวดตามลำดับการซักประวัติจริง และคง `key` ของรายการที่เคยอยู่
   ในแบบเดิม (heightShort · bmiAbnormal · priorCesarean · rhNegative ·
   familyGenetic · multiplePregnancy) ไว้ เพื่อให้ทะเบียนที่บันทึกไว้แล้ว
   อ่านกลับได้เหมือนเดิม. `derived` บอกว่าข้อนั้นระบบคำนวณให้เป็นข้อเสนอได้
   จากข้อมูลที่บันทึกไว้แล้ว (ดู `deriveFirstVisitRiskSuggestions`) — ยังคง
   ต้องให้ผู้ตรวจกดรับเอง ไม่ติ๊กให้อัตโนมัติ. */
export const ANC_FIRST_VISIT_RISK_GROUPS = [
  {
    key: 'obstetric',
    label: 'ประวัติการตั้งครรภ์และการคลอดในอดีต',
    items: [
      { key: 'priorAbortion3',      label: 'เคยแท้งบุตรตั้งแต่ 3 ครั้งขึ้นไป' },
      { key: 'priorLbw',            label: 'เคยคลอดบุตรน้ำหนักน้อยกว่า 2,500 กรัม' },
      { key: 'macrosomia',          label: 'เคยคลอดบุตรน้ำหนักตั้งแต่ 4,000 กรัมขึ้นไป' },
      { key: 'priorPreterm',        label: 'เคยคลอดก่อนกำหนด (น้อยกว่า 37 สัปดาห์)' },
      { key: 'priorStillbirth',     label: 'เคยมีทารกเสียชีวิตในครรภ์หรือแรกคลอด' },
      { key: 'priorCesarean',       label: 'เคยผ่าตัดคลอด' },
      { key: 'priorUterineSurgery', label: 'เคยผ่าตัดมดลูก ปากมดลูก หรือผ่าตัดทางนรีเวชอื่น' },
      { key: 'priorPreeclampsia',   label: 'เคยมีความดันโลหิตสูง / ครรภ์เป็นพิษขณะตั้งครรภ์' },
      { key: 'priorGdm',            label: 'เคยเป็นเบาหวานขณะตั้งครรภ์' },
      { key: 'priorAnomaly',        label: 'เคยคลอดบุตรที่มีความพิการแต่กำเนิด' },
    ],
  },
  {
    key: 'personal',
    label: 'ประวัติสุขภาพและปัจจัยส่วนบุคคล',
    items: [
      { key: 'ageUnder17',   label: 'อายุน้อยกว่า 17 ปี', derived: true },
      { key: 'ageOver35',    label: 'อายุ 35 ปีขึ้นไป', derived: true },
      { key: 'heightShort',  label: 'ส่วนสูงน้อยกว่า 145 ซม.', derived: true },
      { key: 'bmiAbnormal',  label: 'BMI ก่อนตั้งครรภ์ น้อยกว่า 18.5 หรือ ตั้งแต่ 30 ขึ้นไป', derived: true },
      { key: 'diabetes',     label: 'เป็นเบาหวาน' },
      { key: 'hypertension', label: 'เป็นโรคความดันโลหิตสูง', derived: true },
      { key: 'heartDisease', label: 'เป็นโรคหัวใจ' },
      { key: 'thyroid',      label: 'เป็นโรคไทรอยด์' },
      { key: 'anemia',       label: 'มีภาวะซีด / โลหิตจาง', derived: true },
    ],
  },
  {
    key: 'family',
    label: 'ประวัติครอบครัวและพฤติกรรม',
    items: [
      { key: 'familyDiabetes',  label: 'ครอบครัวมีประวัติเบาหวาน' },
      { key: 'familyGenetic',   label: 'ครอบครัวมีประวัติโรคทางพันธุกรรม / ธาลัสซีเมีย' },
      { key: 'smokingExposure', label: 'สูบบุหรี่ หรือได้รับควันบุหรี่มือสอง' },
      { key: 'substanceUse',    label: 'ดื่มแอลกอฮอล์ หรือใช้สารเสพติด' },
    ],
  },
  {
    key: 'current',
    label: 'การตั้งครรภ์ปัจจุบัน',
    items: [
      { key: 'multiplePregnancy',    label: 'ครรภ์แฝด' },
      { key: 'rhNegative',           label: 'หมู่เลือด Rh negative', derived: true },
      { key: 'bleedingThisPregnancy', label: 'มีเลือดออกทางช่องคลอดในครรภ์นี้' },
      { key: 'pelvicMassOrArt',      label: 'มีก้อนในอุ้งเชิงกราน หรือตั้งครรภ์จากเทคโนโลยีช่วยการเจริญพันธุ์' },
    ],
  },
];

/** แบบ 27 ข้อในรูปรายการแบน — ชื่อเดิม `ANC_RISK_FACTORS` คงไว้เพื่อให้
    โค้ด/ทะเบียนที่อ้างชื่อนี้อยู่แล้วยังทำงานได้. */
export const ANC_RISK_FACTORS = ANC_FIRST_VISIT_RISK_GROUPS.flatMap((g) => g.items);

const findFirstVisitRiskItem = (key) => ANC_RISK_FACTORS.find((i) => i.key === key);

/** ข้อที่ระบบคำนวณได้เองจากสัญญาณชีพ/ผลแล็บ/อายุ — คืนเป็น "ข้อเสนอ" พร้อม
    เหตุผล ให้ผู้ตรวจกดรับ ไม่ติ๊กให้เอง (มติ คทง.2 ระบุให้ "ดึงข้อมูลมาแสดงผล"
    ไม่ได้ระบุให้ตัดสินใจแทน — และการติ๊กเงียบ ๆ จะกลายเป็นการอ้างว่าผู้ตรวจ
    ประเมินแล้วทั้งที่ยังไม่ได้ดู). */
export const deriveFirstVisitRiskSuggestions = (form, { age } = {}) => {
  if (!form) return [];
  const out = [];
  const add = (key, reason) => {
    const item = findFirstVisitRiskItem(key);
    if (item) out.push({ key, label: item.label, reason });
  };
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const years = num(age);
  if (years != null && years < 17) add('ageUnder17', `อายุ ${years} ปี`);
  if (years != null && years >= 35) add('ageOver35', `อายุ ${years} ปี`);

  const height = num(form.vitals?.height);
  if (height != null && height > 0 && height < 145) add('heightShort', `ส่วนสูง ${height} ซม.`);

  const bmi = calcBmi(form.prePregnancyWeight, form.vitals?.height);
  if (bmi != null && (bmi < 18.5 || bmi >= 30)) add('bmiAbnormal', `BMI ก่อนตั้งครรภ์ ${bmi}`);

  const bpMatch = /^\s*(\d{2,3})\s*\/\s*(\d{2,3})\s*$/.exec(String(form.vitals?.bp ?? ''));
  if (bpMatch) {
    const [sys, dia] = [Number(bpMatch[1]), Number(bpMatch[2])];
    if (sys >= 140 || dia >= 90) add('hypertension', `ความดันโลหิต ${sys}/${dia} mmHg`);
  }

  const hb = num(form.labResults?.hb2) ?? num(form.labResults?.hb);
  const hct = num(form.labResults?.hct2) ?? num(form.labResults?.hct);
  if ((hb != null && hb < 11) || (hct != null && hct < 33)) {
    add('anemia', `ผล Lab ${hb != null ? `Hb ${hb} g%` : ''}${hb != null && hct != null ? ' · ' : ''}${hct != null ? `Hct ${hct}%` : ''}`);
  }

  if (form.labResults?.rh === 'Negative') add('rhNegative', 'ผลตรวจหมู่เลือด Rh = Negative');

  return out;
};

/** คัดกรองเบาหวานขณะตั้งครรภ์ — มติ คทง.2: "ให้ระบบใช้ข้อมูลจากแบบคัดกรอง
    ความเสี่ยง 27 ข้อ (เช่น อายุ > 35 ปี, BMI สูง, ประวัติครอบครัว) เพื่อ
    ประมวลผลและขึ้นข้อความแจ้งเตือนโดยอัตโนมัติ". ข้อความที่แสดงเป็นถ้อยคำ
    ของที่ประชุมเอง. รวมแบบคัดกรองเบาหวานเดิม (legacy p.2-13) เข้าด้วย
    เพราะทั้งสองชุดถามเรื่องเดียวกันคนละสำนวน. */
export const ANC_GDM_ADVICE_MESSAGE = 'มีความเสี่ยงสูง ควรได้รับการตรวจ 50 gram GCT';

export const evaluateGdmRisk = (form, { age } = {}) => {
  if (!form) return { highRisk: false, reasons: [], message: '' };
  const reasons = [];
  const push = (label) => { if (!reasons.includes(label)) reasons.push(label); };

  const years = Number(age);
  if (Number.isFinite(years) && years >= 35) push(`อายุ ${years} ปี (ตั้งแต่ 35 ปีขึ้นไป)`);

  const bmi = calcBmi(form.prePregnancyWeight, form.vitals?.height);
  if (bmi != null && bmi >= 25) push(`BMI ก่อนตั้งครรภ์ ${bmi} (ตั้งแต่ 25 ขึ้นไป)`);

  const risk = form.riskFactors || {};
  if (risk.familyDiabetes) push('ครอบครัวมีประวัติเบาหวาน');
  if (risk.priorGdm) push('เคยเป็นเบาหวานขณะตั้งครรภ์');
  if (risk.macrosomia) push('เคยคลอดบุตรน้ำหนักตั้งแต่ 4,000 กรัมขึ้นไป');
  if (risk.diabetes) push('มีประวัติเป็นเบาหวาน');

  ANC_GDM_SCREENING_FACTORS.forEach((f) => {
    if (form.gdmScreeningFactors?.[f.key]) push(f.label);
  });

  return {
    highRisk: reasons.length > 0,
    reasons,
    message: reasons.length > 0 ? ANC_GDM_ADVICE_MESSAGE : '',
  };
};

/** ตรวจเต้านมและหัวนม — มติ คทง.2 ให้บันทึกแยกซ้าย/ขวา และผลเป็น dropdown
    (ปกติ · สั้น · บอด). แทนช่องเดียวของแบบเดิมที่บันทึกรวมทั้งสองข้าง. */
export const ANC_NIPPLE_SIDE_OPTIONS = [
  { value: 'normal',   label: 'ปกติ' },
  { value: 'short',    label: 'สั้น' },
  { value: 'inverted', label: 'บอด' },
];

/** บันทึกทันตกรรม (มติ คทง.2) — ผลตรวจฟัน: ฟันผุระบุจำนวนซี่ · ผลตรวจเหงือก
    เป็นตัวเลือกเดียวจาก 3 ค่า. วางเป็นกล่องก่อนส่วน "การดูแลและให้คำแนะนำ". */
export const ANC_GUM_OPTIONS = [
  { value: 'normal',    label: 'ปกติ' },
  { value: 'inflamed',  label: 'อักเสบ' },
  { value: 'calculus',  label: 'มีหินน้ำลาย' },
];

/** การจ่ายยา (มติ คทง.2) — checkbox list ท้ายขั้นสั่งการรักษา. เป็นทางลัด
    ของยาที่งานฝากครรภ์จ่ายซ้ำทุกราย ส่วนใบสั่งยาจริงยังไปทางเดียวกับ OPD
    (AddMedicationPopup → form.medications) เพื่อให้ห้องยาได้รายการเดียวกัน. */
export const ANC_DISPENSE_ITEMS = [
  { key: 'triferdine', label: 'Triferdine (ไอโอดีน-เหล็ก-โฟลิก)' },
  { key: 'folicAcid',  label: 'Folic acid' },
  { key: 'calcium',    label: 'Calcium Carbonate' },
  { key: 'obimin',     label: 'Obimin' },
];

/** วัคซีนที่ให้ระหว่างตั้งครรภ์ (มติ คทง.2) — ระบุเข็มที่ 1/2 ของ dT แยกกัน
    และทุกเข็มต้องมีช่องวันที่ฉีด. */
export const ANC_VACCINE_DOSES = [
  { key: 'flu', label: 'วัคซีนไข้หวัดใหญ่' },
  { key: 'dt1', label: 'บาดทะยัก-คอตีบ (dT) เข็มที่ 1' },
  { key: 'dt2', label: 'บาดทะยัก-คอตีบ (dT) เข็มที่ 2' },
];

/** คัดกรองกลุ่มอาการดาวน์ — มติ คทง.2: "ระบบต้องรองรับการบันทึกผลทั้งวิธี
    Quadruple test และ NIPT". */
export const ANC_DOWN_SCREENING_METHODS = [
  { value: 'quadruple', label: 'Quadruple test' },
  { value: 'nipt',      label: 'NIPT' },
];

/** หัวข้อการให้คำแนะนำ (มติ คทง.2) — checkbox list ที่ระบบ "แสดงหัวข้อที่ควร
    ให้คำแนะนำตามช่วงอายุครรภ์ของการมาตรวจครั้งนั้น ๆ โดยอัตโนมัติ". `from`/`to`
    เป็นช่วงอายุครรภ์เป็นสัปดาห์ (to ไม่รวม); ข้อที่ไม่มีช่วงคือแนะนำทุกครั้ง. */
export const ANC_ADVICE_TOPICS = [
  { key: 'ironFolic',     label: 'การกินยาเสริมธาตุเหล็ก โฟลิก และไอโอดีนทุกวัน' },
  { key: 'dangerSigns',   label: 'อาการผิดปกติที่ต้องมาพบแพทย์ก่อนนัด' },
  { key: 'oralCare',      label: 'การดูแลสุขภาพช่องปาก แปรงฟันวันละ 2 ครั้ง' },
  { key: 'noSmoking',     label: 'งดบุหรี่ แอลกอฮอล์ และสารเสพติด' },
  { key: 'nausea',        label: 'การดูแลอาการแพ้ท้องและการกินอาหารไตรมาสแรก', from: 0, to: 12 },
  { key: 'avoidTeratogen', label: 'หลีกเลี่ยงยา สารเคมี และการเอกซเรย์โดยไม่จำเป็น', from: 0, to: 14 },
  { key: 'downScreening', label: 'การคัดกรองกลุ่มอาการดาวน์และการตรวจอัลตราซาวด์', from: 12, to: 20 },
  { key: 'bodyChange',    label: 'การเปลี่ยนแปลงของร่างกายและการออกกำลังกายที่เหมาะสม', from: 12, to: 28 },
  { key: 'kickCount',     label: 'การนับลูกดิ้นทุกวัน', from: 18 },
  { key: 'parentSchool',  label: 'โรงเรียนพ่อแม่ การเตรียมตัวคลอดและการเลี้ยงลูกด้วยนมแม่', from: 20 },
  { key: 'nutritionLate', label: 'โภชนาการและการควบคุมน้ำหนักในไตรมาสที่ 3', from: 28 },
  { key: 'laborSigns',    label: 'อาการเจ็บครรภ์จริง-เตือน และการเตรียมของไปคลอด', from: 32 },
  { key: 'deliveryPlan',  label: 'แผนการคลอดและสถานที่คลอด', from: 32 },
  { key: 'postpartum',    label: 'การดูแลหลังคลอดและการคุมกำเนิด', from: 36 },
];

export const getAncAdviceTopicsForGa = (gestWeeks) => {
  const w = Number(gestWeeks);
  if (!Number.isFinite(w)) return ANC_ADVICE_TOPICS.filter((t) => t.from == null);
  return ANC_ADVICE_TOPICS.filter((t) => {
    const fromOk = t.from == null || w >= t.from;
    const toOk = t.to == null || w < t.to;
    return fromOk && toOk;
  });
};

/** ตารางสรุปภาวะเสี่ยงที่ตรวจพบจากผลแล็บ — มติ คทง.2: ครั้งที่ 2 เป็นต้นไป
    (มาฟังผล) "ระบบจะดึงผลการตรวจจากห้องปฏิบัติการมาประมวลผล และแสดงเป็น
    ตารางสรุปภาวะเสี่ยงที่ตรวจพบ". คืนเฉพาะรายการที่มีผลแล้ว พร้อมธงว่า
    ผิดปกติหรือไม่ เพื่อให้ตารางเรียงผลปกติ/ผิดปกติในตารางเดียวกันได้. */
export const summarizeLabRiskFindings = (labResults = {}) => {
  const rows = [];
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const push = (label, value, risk, note) => {
    if (value === undefined || value === null || value === '') return;
    rows.push({ label, value: String(value), risk: !!risk, note: note || '' });
  };

  const hb = num(labResults.hb2) ?? num(labResults.hb);
  const hct = num(labResults.hct2) ?? num(labResults.hct);
  push('ความเข้มข้นเลือด (Hb)', hb != null ? `${hb} g%` : '', hb != null && hb < 11, 'เกณฑ์ภาวะซีด Hb < 11 g%');
  push('ความเข้มข้นเลือด (Hct)', hct != null ? `${hct} %` : '', hct != null && hct < 33, 'เกณฑ์ภาวะซีด Hct < 33%');
  push('หมู่เลือด (ABO)', labResults.bloodGroup, false);
  push('Rh', labResults.rh, labResults.rh === 'Negative', 'Rh negative ต้องเฝ้าระวังภาวะ Rh isoimmunization');
  push('VDRL/TPHA', labResults.vdrlResult2 || labResults.vdrlResult,
    (labResults.vdrlResult2 || labResults.vdrlResult) === 'Reactive', 'ผลบวกต้องรักษาซิฟิลิสและตรวจคู่');
  push('Anti-HIV', labResults.antiHivResult2 || labResults.antiHivResult,
    (labResults.antiHivResult2 || labResults.antiHivResult) === 'Positive', 'ผลบวกส่งเข้าระบบป้องกันการถ่ายทอดเชื้อจากแม่สู่ลูก');
  push('HBsAg', labResults.hbsAgResult, labResults.hbsAgResult === 'Positive', 'ผลบวกวางแผนให้ HBIG แก่ทารกแรกเกิด');
  push('ผลตรวจปัสสาวะ', labResults.urineResult, labResults.urineResult === 'ผิดปกติ', 'ผิดปกติให้ประเมินการติดเชื้อทางเดินปัสสาวะ');
  return rows;
};

/** จุดข้อมูลกราฟการเพิ่มขึ้นของน้ำหนัก (มติ คทง.2) — น้ำหนักก่อนตั้งครรภ์
    เป็นจุดที่อายุครรภ์ 0 แล้วต่อด้วยน้ำหนักของทุกครั้งที่มาตรวจ (ประวัติ +
    ครั้งนี้) เทียบกับแถบเกณฑ์ IOM 2009 ของกลุ่ม BMI นั้น. */
export const buildAncWeightSeries = (history = [], form = {}) => {
  const pre = Number(form.prePregnancyWeight);
  const points = [];
  if (Number.isFinite(pre) && pre > 0) points.push({ gaWeeks: 0, weight: pre, label: 'ก่อนตั้งครรภ์' });

  history.forEach((h) => {
    const w = Number(h.weight);
    const ga = Number(h.gestWeeks);
    if (!Number.isFinite(w) || w <= 0) return;
    points.push({ gaWeeks: Number.isFinite(ga) ? ga : null, weight: w, label: h.date });
  });

  const currentGa = calculateGestationalAge(form.lmp)?.weeks;
  const currentWeight = Number(form.vitals?.weight);
  if (Number.isFinite(currentWeight) && currentWeight > 0) {
    points.push({ gaWeeks: Number.isFinite(currentGa) ? currentGa : null, weight: currentWeight, label: 'ครั้งนี้' });
  }

  const band = interpretPrePregnancyBmi(calcBmi(pre, form.vitals?.height));
  /* แถบเกณฑ์: ไตรมาสแรกใช้ 0.5–2 กก. แล้วบวกอัตราต่อสัปดาห์ของกลุ่ม BMI นั้น
     — สูตรเดียวกับ `evaluateWeightGain` เพื่อให้กราฟกับข้อความสรุปตรงกัน. */
  const expectedAt = (weeks) => {
    if (!band || !Number.isFinite(pre) || pre <= 0 || !Number.isFinite(weeks)) return null;
    const w = Math.max(0, weeks);
    if (w <= 13) {
      const ratio = w / 13;
      return { min: pre + 0.5 * ratio, max: pre + 2 * ratio };
    }
    const extra = w - 13;
    return {
      min: pre + 0.5 + band.weeklyGain[0] * extra,
      max: pre + 2 + band.weeklyGain[1] * extra,
    };
  };

  return { points, band, expectedAt };
};

/* ─── Whole-visit default form state ─────────────────────────────── */

export const DEFAULT_ANC_VISIT = {
  // Step 1 — ประวัติการรักษา (TOR 1.10.7.6)
  illnessHistory: '',
  /* มติ คทง.2 — ประวัติเจ็บป่วยในอดีตเป็น checkbox (ANC_ILLNESS_CHECKLIST)
     ส่วน `illnessHistory` เหลือไว้เป็นช่อง "อื่นๆ (ระบุ)" ของหมวดเดียวกัน */
  illnessChecklist: {},
  gravida: '',
  para: '',
  abortion: '',
  livingChildren: '',
  lmp: '',
  obstetricHistory: [],   // { id, pregnancyNo, year, deliveryType, outcome, complication }
  breastExamNote: '',
  spouseHealthNote: '',
  /* มติ คทง.2 — ประวัติสามี/คู่: ข้อมูลพื้นฐาน + โรคประจำตัว + หมู่เลือด/Rh
     + สถานะการสูบบุหรี่ (ประเมินความเสี่ยงจากบุหรี่มือสอง) */
  spouseInfo: {
    name: '', birthDate: '', citizenId: '', occupation: '', phone: '',
    illness: '', bloodGroup: '', rh: '', smokingStatus: '',
  },
  currentPregnancyNote: '',
  /* ประวัติการคุมกำเนิดก่อนตั้งครรภ์นี้ — กล่อง "การตั้งครรภ์ปัจจุบัน"
     ตามสมุดสีชมพูหน้า 9 (มติ คทง.2) */
  contraceptionHistory: '',
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
  /* 9Q — เปิดจากปุ่มในขั้นแบบประเมินเมื่อ 2Q ผลบวก แล้วดึงคะแนนกลับมาแสดง
     (มติ คทง.2: "อาจทำเป็นปุ่มที่ลิงก์ไปยังหน้าแบบประเมิน แล้วดึงผลคะแนน
     กลับมาแสดงในหน้าหลักของงานฝากครรภ์") — แบบประเมินใช้ชุดเดียวกับคลัง
     `homevisitAssessments.js` ไม่สร้างแบบใหม่ */
  mentalHealth9Q: { answers: {}, total: null, completedAt: '' },
  riskFactors: {},
  perVisitRiskFactors: {},  // ประเมินทุกครั้งที่ตรวจครรภ์ (legacy p.2-13, items 8-20)
  gdmScreeningFactors: {},  // แบบคัดกรองเบาหวานในหญิงมีครรภ์ (legacy p.2-13)
  dangerSigns: {},
  smokingStatus: '',       // 'nonSmoker' | 'smoker'
  smokingAdviceGiven: false,
  riskScreeningNote: '',

  // Step 3 — ตรวจร่างกาย (TOR 1.10.7.7)
  vitals: { ...ANC_DEFAULT_VITALS },
  /* มติ คทง.2 — ฐานคำนวณ BMI ก่อนตั้งครรภ์และเกณฑ์การเพิ่มน้ำหนัก (IOM 2009) */
  prePregnancyWeight: '',
  fundusHeight: '',
  fetalHeartRate: '',
  // Per-visit exam findings — legacy "บันทึกการตรวจครรภ์" (p.2-10/2-11)
  urineSugar: '',
  urineAlbumin: '',
  gaByExam: '',            // อายุครรภ์จากการตรวจครรภ์ (สัปดาห์)
  gaByUltrasoundWeeks: '', // อายุครรภ์จากการอัลตราซาวด์ (สัปดาห์)
  fundusLevel: '',
  presentation: '',
  descent: '',
  fetalPosition: '',       // ท่าเด็ก — free text, e.g. LOA / ROA
  fetalMovement: '',
  oralHealthAnswers: {},   // Maternal Oral Screening (MOS) tool, p.53 — 2Q, score ≥1 = refer dentist
  /* มติ คทง.2 — บันทึกทันตกรรม: ฟันผุระบุจำนวนซี่ · เหงือก ปกติ/อักเสบ/มีหินน้ำลาย */
  dentalCariesCount: '',
  dentalGum: '',
  /* มติ คทง.2 — ตรวจเต้านม/หัวนมแยกซ้าย-ขวา (ปกติ · สั้น · บอด) */
  nippleLeft: '',
  nippleRight: '',
  /* ภาพประกอบการตรวจร่างกายของครั้งนี้ (มติผู้ใช้ 2 ก.ย. 69) — เก็บต่อครั้ง
     ไม่ carry ไปครั้งถัดไป เพราะเป็นสิ่งที่เห็นวันนี้ */
  examPhotos: [],
  /* วาด/มาร์คจุดบนรูปร่างกาย — ชุดเดียวกับที่ CPOE OPD ใช้ (BodyDiagramPanel)
     แยกเก็บตามระบบที่ตรวจ (`bodyMarkers[systemKey]`) เพื่อไม่ให้จุดของคนละระบบ
     ทับกัน (มติผู้ใช้ 2 ก.ย. 69) */
  examSystem: 'abdomen',
  examView: 'both',
  bodyMarkers: {},
  bodyDrawings: {},

  // Step 4 — วินิจฉัย (TOR 1.10.7.7)
  riskLevel: '',
  gdmConfirmed: false,   // เบาหวานขณะตั้งครรภ์ (GDM) ยืนยันจากผล OGTT — pp.5-8
  diagnosisNote: '',
  externalExamResults: '',  // ผลการตรวจครรภ์จากภายนอก
  externalExamAttachments: [], // uploaded evidence File[] for the above (TOR 1.10.7.7)
  adviceNote: '',            // คำแนะนำ (รายละเอียดเพิ่มเติมนอกเหนือหัวข้อที่ติ๊ก)
  /* มติ คทง.2 — คำแนะนำเป็น checkbox list ที่ระบบเลือกหัวข้อตามอายุครรภ์ให้ */
  adviceTopics: {},

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
  /* มติ คทง.2 — Ultrasound บันทึกว่า "ได้รับการตรวจอย่างน้อย 1 ครั้ง" พร้อม
     อายุครรภ์ ณ วันที่ตรวจ (ศูนย์ฯ ทำก่อน 12 สัปดาห์ได้ยาก) + วิธีคัดกรอง
     กลุ่มอาการดาวน์ (Quadruple test / NIPT) */
  ultrasoundDone: false,
  ultrasoundGaWeeks: '',
  ultrasoundDate: '',
  downScreeningMethod: '',
  /* มติ คทง.2 — จ่ายยาและวัคซีนเป็น checkbox ท้ายขั้นสั่งการรักษา; ใบสั่งยา
     จริงยังไปทาง `medications` ชุดเดียวกับ OPD เพื่อให้ห้องยาได้รายการเดียวกัน */
  dispenseItems: {},
  dispenseOtherNote: '',
  vaccineDoses: {},
  vaccineDoseDates: {},
  medications: [],
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

/* ─── ทะเบียนฝากครรภ์ vs บันทึกการตรวจครรภ์ ────────────────────────────
   The legacy HCIS ANC module keeps these as two separate screens — §2.2
   "ประวัติการตั้งครรภ์" (opened once when the pregnancy is registered) and
   §2.3 "บันทึกการตรวจครรภ์" (one row per visit, with the prior visits
   listed in a grid above the form). This app collapses both into one
   7-step form, so the same split has to live in the DATA instead: the
   fields below are pregnancy-level facts that must be CARRIED FORWARD
   into every follow-up visit rather than re-typed, while everything else
   in `DEFAULT_ANC_VISIT` is per-visit and starts blank each time.

   Kept deliberately narrow: a field belongs here only if re-entering it at
   visit 5 would be re-stating a fact already established at visit 1
   (obstetric history, husband's labs, dT history, blood group). Findings
   that legitimately change between visits — vitals, fundal height, urine
   dipstick, danger signs, this visit's orders — are NOT carried, because
   pre-filling them would silently attribute last visit's findings to
   today. */
export const ANC_REGISTRATION_FIELDS = [
  'illnessHistory',
  'illnessChecklist',
  'spouseInfo',
  'contraceptionHistory',
  'gravida', 'para', 'abortion', 'livingChildren', 'lmp',
  'obstetricHistory',
  'breastExamNote', 'spouseHealthNote',
  'tetanusDoseCount', 'tetanusLastDoseYear', 'tetanusExempt',
  'familyIllnessHistory', 'familyIllnessOtherNote',
  'husbandLabResults',
  'motherChildHealthBookGiven',
  'riskFactors',          // once-per-registration panel (legacy p.2-13 items 1-7)
  'gdmScreeningFactors',  // history-based GDM screen — facts, not findings
  'labResults',           // cumulative: blood group/Rh established once, Hb/Hct keyed per panel
];

const REGISTRATION_KEY = 'mih:anc-registration';

/** Saves (or updates — TOR 1.10.7.6 "แก้ไข") the pregnancy-level record so
    the next visit opens pre-filled instead of blank. Merges rather than
    replaces, so a visit that didn't touch a section can't blank it. */
export const saveAncRegistration = (hn, form) => {
  if (!hn || !form) return;
  const store = readJson(REGISTRATION_KEY, {});
  const prev = store[hn] || {};
  const next = { ...prev };
  ANC_REGISTRATION_FIELDS.forEach((key) => {
    const value = form[key];
    if (value === undefined) return;
    /* Merge the keyed objects (lab results accumulate across visits — the
       Lab #2 panel at 28wk must not erase the blood group from Lab #1). */
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      next[key] = { ...(prev[key] || {}), ...value };
    } else {
      next[key] = value;
    }
  });
  store[hn] = next;
  writeJson(REGISTRATION_KEY, store);
};

export const getAncRegistration = (hn) => (hn ? readJson(REGISTRATION_KEY, {})[hn] || null : null);

/** ครั้งที่ — the legacy exam screen numbers every visit (p.2-10). Visit N
    is "one more than the visits already on record". */
export const getAncVisitNumber = (hn) => getAncVisitHistoryByHn(hn).length + 1;

/** Seeds the form for a visit: empty defaults → the mock roster's known
    facts → whatever a previous visit actually saved (which wins, since it
    is the most recently confirmed clinician input).

    `carriedFields` is returned alongside so the UI can tell the clinician
    WHICH sections were pre-filled from earlier visits rather than silently
    presenting stale data as if freshly entered. */
export const buildAncVisitForm = (hn, ancPatient) => {
  const form = { ...DEFAULT_ANC_VISIT };

  if (ancPatient) {
    form.gravida = String(ancPatient.gravida ?? '');
    form.para = String(ancPatient.para ?? '');
    form.lmp = ancPatient.lmp || '';
    /* Risk level is a per-visit judgement (Step 4) — only a patient the
       roster already flags as a follow-up carries one in. */
    form.riskLevel = ancPatient.visitType === 'followup' ? (ancPatient.riskLevel || '') : '';
  }

  const registration = getAncRegistration(hn);
  const carriedFields = [];
  if (registration) {
    ANC_REGISTRATION_FIELDS.forEach((key) => {
      const value = registration[key];
      if (value === undefined || value === '' || value === null) return;
      if (Array.isArray(value) && value.length === 0) return;
      if (!Array.isArray(value) && typeof value === 'object' && Object.keys(value).length === 0) return;
      form[key] = value;
      carriedFields.push(key);
    });
  }

  return { form, carriedFields, visitNo: getAncVisitNumber(hn), isFollowUp: getAncVisitNumber(hn) > 1 };
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
