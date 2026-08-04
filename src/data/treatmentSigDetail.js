/* PHCIS | CPOE §1.5.4.3 / §1.5.4.4 / §1.5.4.6 / §1.5.4.7 / §1.5.4.9 /
   §1.5.4.11 / §1.5.4.12 — วิธีใช้ยาแบบละเอียด + เครื่องคำนวณขนาดยา.

   ไม่มี engine ใหม่: ใช้ทะเบียนยาจริงจาก pharmacyRegistry.js
   (DRUG_CLASSIFICATIONS / packSize / convertPackToUnit / getRegistryDrug)
   ไฟล์นี้เก็บเฉพาะ "ตัวเลือกวิธีใช้" + สูตรคำนวณ ที่ TOR ระบุชื่อกลุ่มมาตรง ๆ. */

import { getRegistryDrug, convertPackToUnit } from '@/data/pharmacyRegistry';

/* ── §1.5.4.3 รายครั้ง / ต่อเนื่อง / ฉุกเฉิน-ให้ทันที ─────────── */
export const ORDER_MODES = [
  { key: 'once',       label: 'รายครั้ง (One-time)',        hint: 'จ่ายครั้งเดียวสำหรับการตรวจครั้งนี้', badge: 'neutral' },
  { key: 'continuous', label: 'ต่อเนื่อง (Continuous)',     hint: 'ใช้ต่อเนื่องจนกว่าจะสั่งหยุด',        badge: 'info'    },
  { key: 'stat',       label: 'ฉุกเฉิน — ให้ทันที (STAT)',  hint: 'ห้องยาจัดยาก่อนคิวปกติ ให้ทันทีที่ได้รับ', badge: 'error' },
];

export const orderModeMeta = (key) =>
  ORDER_MODES.find((m) => m.key === key) || ORDER_MODES[0];

/* ── §1.5.4.7 กลุ่มที่ 1: Meal selected ────────────────────── */
export const MEAL_RELATIONS = [
  { key: 'before', label: 'ก่อนอาหาร' },
  { key: 'after',  label: 'หลังอาหาร' },
  { key: 'with',   label: 'พร้อมอาหาร' },
  { key: 'empty',  label: 'ขณะท้องว่าง' },
];

export const MEAL_SLOTS = [
  { key: 'morning', label: 'เช้า',      defaultTime: '08:00' },
  { key: 'noon',    label: 'กลางวัน',   defaultTime: '12:00' },
  { key: 'evening', label: 'เย็น',      defaultTime: '18:00' },
  { key: 'bedtime', label: 'ก่อนนอน',   defaultTime: '21:00' },
];

/* ── §1.5.4.7 กลุ่มที่ 2: Interval ─────────────────────────── */
export const INTERVAL_OPTIONS = [
  { key: 'q4h',    label: 'ทุก 4 ชั่วโมง (q4h)',   hours: 4  },
  { key: 'q6h',    label: 'ทุก 6 ชั่วโมง (q6h)',   hours: 6  },
  { key: 'q8h',    label: 'ทุก 8 ชั่วโมง (q8h)',   hours: 8  },
  { key: 'q12h',   label: 'ทุก 12 ชั่วโมง (q12h)', hours: 12 },
  { key: 'q24h',   label: 'ทุก 24 ชั่วโมง (q24h)', hours: 24 },
  { key: 'custom', label: 'กำหนดเอง',              hours: 0  },
];

/* ── §1.5.4.7 กลุ่มที่ 5: Injection selected ───────────────── */
export const INJECTION_ROUTES = [
  { key: 'ivpush', label: 'ฉีดเข้าหลอดเลือดดำช้า ๆ (IV push)' },
  { key: 'ivdrip', label: 'หยดเข้าหลอดเลือดดำ (IV drip)' },
  { key: 'im',     label: 'ฉีดเข้ากล้ามเนื้อ (IM)' },
  { key: 'sc',     label: 'ฉีดเข้าใต้ผิวหนัง (SC)' },
];

export const INJECTION_DILUENTS = [
  { key: 'nss',   label: '0.9% NSS' },
  { key: 'd5w',   label: '5% D/W' },
  { key: 'swi',   label: 'Sterile water for injection' },
  { key: 'none',  label: 'ไม่ผสม (ให้โดยตรง)' },
];

export const RATE_UNITS = [
  { key: 'mlhr',    label: 'มิลลิลิตร/ชั่วโมง (mL/hr)' },
  { key: 'dropmin', label: 'หยด/นาที (drop/min)' },
];

/* ── หมายเหตุถึงเภสัชกร (§1.5.4.6) ─────────────────────────── */
export const PHARMACIST_NOTE_SUGGESTIONS = [
  'บดยาก่อนจ่าย — ผู้รับบริการกลืนยาเม็ดไม่ได้',
  'แบ่งครึ่งเม็ด และแนะนำวิธีแบ่งให้ผู้รับบริการด้วย',
  'เตรียมเป็นยาน้ำเชื่อม (suspension) เนื่องจากเป็นผู้ป่วยเด็ก',
  'จัดใส่ซองรายมื้อ (unit dose) เพราะผู้รับบริการสูงอายุอยู่คนเดียว',
  'ผู้รับบริการกลืนยาก — เลือกเม็ดขนาดเล็กที่สุดที่มี',
  'ติดฉลากภาษาไทยตัวใหญ่ ผู้รับบริการสายตาเลือนราง',
];

/* ── เหตุผลการสั่งใช้ยา (§1.5.4.9) แยกตามประเภทยา ────────────── */
export const REASON_SUGGESTIONS_BY_CLASS = {
  'non-nlem': [
    'ผู้รับบริการไม่ตอบสนองต่อยาในบัญชียาหลักที่ใช้มาแล้วอย่างน้อย 4 สัปดาห์',
    'มีประวัติแพ้ยาในบัญชียาหลักกลุ่มเดียวกัน จึงจำเป็นต้องใช้ยานอกบัญชี',
    'มีข้อห้ามใช้ยาในบัญชียาหลักเนื่องจากโรคประจำตัวของผู้รับบริการ',
    'ผู้รับบริการเกิดผลข้างเคียงรุนแรงจากยาในบัญชียาหลักที่เคยได้รับ',
  ],
  narcotic: [
    'ควบคุมอาการปวดระดับปานกลางถึงรุนแรงที่ไม่ตอบสนองต่อยาแก้ปวดทั่วไป',
    'ควบคุมอาการไอแห้งรุนแรงที่รบกวนการนอนหลับ หลังใช้ยาอื่นแล้วไม่ได้ผล',
    'ใช้ระยะสั้นไม่เกิน 5 วัน พร้อมนัดประเมินซ้ำและให้คำแนะนำเรื่องการติดยา',
  ],
  psychotropic: [
    'บรรเทาภาวะวิตกกังวลเฉียบพลันที่รบกวนการทำงานและการนอนหลับ',
    'ใช้เป็นยาคลายกล้ามเนื้อระยะสั้นร่วมกับการทำกายภาพบำบัด',
    'ใช้ระยะสั้น พร้อมอธิบายความเสี่ยงการติดยาและนัดประเมินซ้ำใน 2 สัปดาห์',
  ],
  nlem: [
    'ตามแนวทางการรักษามาตรฐานของโรคที่วินิจฉัย',
  ],
};

export const reasonSuggestionsFor = (classification) =>
  REASON_SUGGESTIONS_BY_CLASS[classification] || REASON_SUGGESTIONS_BY_CLASS.nlem;

/* ยาที่ต้องบังคับกรอกเหตุผลการสั่งใช้ */
export const REASON_REQUIRED_CLASSES = ['non-nlem', 'narcotic', 'psychotropic'];

export const needsPrescribingReason = (drugName) => {
  const drug = getRegistryDrug(drugName);
  return !!drug && REASON_REQUIRED_CLASSES.includes(drug.classification);
};

/* ยาที่ต้องแนบเอกสารประกอบการสั่งใช้ (§1.5.4.15) */
export const needsSupportingForm = (drugName) => {
  const drug = getRegistryDrug(drugName);
  if (!drug) return null;
  if (drug.classification === 'non-nlem') {
    return { formName: 'แบบฟอร์มขออนุมัติใช้ยานอกบัญชียาหลักแห่งชาติ', why: 'ยานอกบัญชียาหลักแห่งชาติ' };
  }
  if (drug.classification === 'narcotic') {
    return { formName: 'แบบฟอร์มการสั่งใช้ยาเสพติดให้โทษ (ย.ส.)', why: 'ยาเสพติดให้โทษ ประเภท 2' };
  }
  if (drug.classification === 'psychotropic') {
    return { formName: 'แบบฟอร์มการสั่งใช้วัตถุออกฤทธิ์ต่อจิตและประสาท', why: 'วัตถุออกฤทธิ์ต่อจิตและประสาท' };
  }
  if (drug.highAlert) {
    return { formName: 'แบบฟอร์มยืนยันการสั่งใช้ยาความเสี่ยงสูง (High Alert Drug)', why: 'ยาความเสี่ยงสูง' };
  }
  return null;
};

/* ── §1.5.4.11 เพดานขนาดยาต่อน้ำหนักตัว ──────────────────────
   ค่าอ้างอิงสำหรับยาที่มีในทะเบียนนี้จริง (mg/kg/day และ mg/kg/dose)
   ตัวเลขเป็นเกณฑ์ผู้ป่วยเด็กทั่วไป — สถานพยาบาลจริงต้องปรับตามแนวทางของตน. */
export const DOSE_CEILINGS = {
  'Paracetamol 500 mg':  { mgPerTablet: 500, maxMgPerKgPerDose: 15, maxMgPerKgPerDay: 60,  maxMgPerDay: 4000 },
  'Ibuprofen 400 mg':    { mgPerTablet: 400, maxMgPerKgPerDose: 10, maxMgPerKgPerDay: 40,  maxMgPerDay: 2400 },
  'Amoxicillin 500 mg':  { mgPerTablet: 500, maxMgPerKgPerDose: 30, maxMgPerKgPerDay: 90,  maxMgPerDay: 3000 },
  'Naproxen 250 mg':     { mgPerTablet: 250, maxMgPerKgPerDose: 7,  maxMgPerKgPerDay: 20,  maxMgPerDay: 1000 },
  'Cetirizine 10 mg':    { mgPerTablet: 10,  maxMgPerKgPerDose: 0.25, maxMgPerKgPerDay: 0.5, maxMgPerDay: 10 },
};

/* ดึงจำนวน mg ต่อเม็ดจากชื่อยาถ้าไม่ได้อยู่ในตารางเพดาน */
export const mgPerUnitFromName = (name) => {
  const m = String(name || '').match(/(\d+(?:\.\d+)?)\s*(mg|มก\.?)/i);
  return m ? Number(m[1]) : null;
};

export const doseCeilingFor = (name) => {
  if (DOSE_CEILINGS[name]) return DOSE_CEILINGS[name];
  const mg = mgPerUnitFromName(name);
  return mg ? { mgPerTablet: mg, maxMgPerKgPerDose: null, maxMgPerKgPerDay: null, maxMgPerDay: null } : null;
};

/* จำนวนครั้งต่อวันจากข้อความความถี่ที่ผู้ใช้เลือก */
export const timesPerDayFrom = (frequencyLabel, sig) => {
  if (sig?.mode === 'interval') {
    const opt = INTERVAL_OPTIONS.find((o) => o.key === sig.intervalKey);
    const hours = opt?.hours || Number(sig.intervalHours) || 0;
    return hours > 0 ? Math.round((24 / hours) * 100) / 100 : 0;
  }
  if (sig?.mode === 'meal' || sig?.mode === 'time') {
    const n = (sig.slots || []).length || (sig.times || []).length;
    if (n > 0) return n;
  }
  const text = String(frequencyLabel || '');
  const m = text.match(/(\d+)/);
  if (m) return Number(m[1]);
  if (/เช้า.*เย็น|วันละสองครั้ง/.test(text)) return 2;
  return 1;
};

/* ── §1.5.4.11 MKDay / MKDose ────────────────────────────────
   คืน null เมื่อไม่มีน้ำหนัก — ผู้เรียกต้องแสดง "ต้องมีน้ำหนักจึงคำนวณได้"
   ไม่ใช่เดาค่าหรือปล่อย NaN. */
export const calcDoseByWeight = ({ name, dosePerTake, timesPerDay, weightKg }) => {
  const ceiling = doseCeilingFor(name);
  const mgPerUnit = ceiling?.mgPerTablet ?? mgPerUnitFromName(name);
  const units = Number(dosePerTake);
  const perDay = Number(timesPerDay);

  if (!mgPerUnit || !Number.isFinite(units) || units <= 0) {
    return { ok: false, reason: 'noStrength', message: 'ไม่พบขนาดยา (mg) ในชื่อยา จึงคำนวณขนาดตามน้ำหนักไม่ได้' };
  }
  const weight = Number(weightKg);
  if (!Number.isFinite(weight) || weight <= 0) {
    return { ok: false, reason: 'noWeight', message: 'ต้องมีน้ำหนักตัวจึงคำนวณ mg/kg ได้ — กลับไปบันทึกน้ำหนักที่ขั้นคัดกรอง' };
  }

  const mgPerDose = mgPerUnit * units;
  const mgPerDay = mgPerDose * (Number.isFinite(perDay) && perDay > 0 ? perDay : 1);
  const mkDose = Math.round((mgPerDose / weight) * 100) / 100;
  const mkDay = Math.round((mgPerDay / weight) * 100) / 100;

  const overDose = ceiling?.maxMgPerKgPerDose != null && mkDose > ceiling.maxMgPerKgPerDose;
  const overDay = ceiling?.maxMgPerKgPerDay != null && mkDay > ceiling.maxMgPerKgPerDay;
  const overAbsolute = ceiling?.maxMgPerDay != null && mgPerDay > ceiling.maxMgPerDay;

  return {
    ok: true,
    mgPerUnit, mgPerDose, mgPerDay, mkDose, mkDay, weight,
    ceiling,
    overDose, overDay, overAbsolute,
    exceeded: overDose || overDay || overAbsolute,
    messages: [
      overDose && ceiling ? `mg/kg/dose = ${mkDose} เกินเพดาน ${ceiling.maxMgPerKgPerDose}` : null,
      overDay && ceiling ? `mg/kg/day = ${mkDay} เกินเพดาน ${ceiling.maxMgPerKgPerDay}` : null,
      overAbsolute && ceiling ? `ขนาดรวมต่อวัน ${mgPerDay} mg เกินเพดานผู้ใหญ่ ${ceiling.maxMgPerDay} mg` : null,
    ].filter(Boolean),
  };
};

/* ── §1.5.4.12 จำนวนที่ควรจ่าย ───────────────────────────────
   ขนาดต่อครั้ง × ความถี่/วัน × จำนวนวัน แล้วปัดขึ้นตามขนาดบรรจุถ้ามี */
export const suggestQuantity = ({ name, dosePerTake, timesPerDay, days }) => {
  const units = Number(dosePerTake);
  const perDay = Number(timesPerDay);
  const nDays = Number(days);
  if (![units, perDay, nDays].every((n) => Number.isFinite(n) && n > 0)) {
    return { ok: false, message: 'ต้องระบุขนาดต่อครั้ง ความถี่ต่อวัน และจำนวนวัน จึงคำนวณจำนวนที่ควรจ่ายได้' };
  }
  const raw = units * perDay * nDays;
  const qty = Math.ceil(raw);
  const drug = getRegistryDrug(name);
  const pack = drug ? convertPackToUnit(drug, 1) : null;
  return {
    ok: true,
    raw,
    qty,
    unit: drug?.unit === 'capsule' ? 'แคปซูล' : 'เม็ด',
    packSize: pack?.qty ?? null,
    packNote: pack?.qty
      ? `ขนาดบรรจุ 1 กล่อง = ${pack.qty} หน่วย — จ่าย ${qty} หน่วยคิดเป็น ${(qty / pack.qty).toFixed(2)} กล่อง`
      : null,
    formula: `${units} × ${perDay} ครั้ง/วัน × ${nDays} วัน = ${raw} → ปัดขึ้นเป็น ${qty}`,
  };
};

/* ── ร่าง "วิธีใช้ยาแบบละเอียด" ว่าง ─────────────────────────── */
export const blankSigDetail = () => ({
  orderMode: 'once',
  /* mode: meal | interval | time | taper | injection */
  mode: 'meal',
  mealRelation: 'after',
  slots: ['morning'],
  intervalKey: 'q8h',
  intervalHours: '',
  times: ['08:00'],
  taperRows: [],
  injection: {
    route: '', diluent: '', volumeMl: '', rate: '', rateUnit: 'mlhr', durationMin: '',
  },
  durationDays: '',
  doseAmount: '',
  /* §1.5.4.12 — จำนวนที่แพทย์ "เลือกใช้" จากเครื่องคำนวณ (opt-in).
     null = ยังไม่เลือก → เมื่อบันทึกจะไม่ทับ "จำนวน" ที่กรอกในตารางคำสั่งยา */
  appliedQty: null,
  smallDoseStat: false,
  pharmacistNote: '',
  prescribingReason: '',
  supportingFormAttached: false,
});

export const blankTaperRow = () => ({
  id: `taper-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
  startDate: '', endDate: '', dosePerTake: '', timesPerDay: '', note: '',
});

/* ── สรุปวิธีใช้เป็นข้อความเดียวสำหรับตาราง / ฉลากยา ─────────── */
export const summariseSig = (sig, { dosePerTake, unit } = {}) => {
  if (!sig) return '';
  const mode = orderModeMeta(sig.orderMode).label;
  const dose = dosePerTake ? `ครั้งละ ${dosePerTake} ${unit || 'เม็ด'}` : '';
  let how = '';
  if (sig.mode === 'meal') {
    const rel = MEAL_RELATIONS.find((r) => r.key === sig.mealRelation)?.label || '';
    const slots = (sig.slots || []).map((k) => MEAL_SLOTS.find((s) => s.key === k)?.label).filter(Boolean).join(' · ');
    how = [rel, slots].filter(Boolean).join(' ');
  } else if (sig.mode === 'interval') {
    how = INTERVAL_OPTIONS.find((o) => o.key === sig.intervalKey)?.label
      || (sig.intervalHours ? `ทุก ${sig.intervalHours} ชั่วโมง` : '');
  } else if (sig.mode === 'time') {
    how = `เวลา ${(sig.times || []).join(' · ')}`;
  } else if (sig.mode === 'taper') {
    how = `ลดขนาดยาเป็นช่วง ${(sig.taperRows || []).length} ช่วง`;
  } else if (sig.mode === 'injection') {
    const route = INJECTION_ROUTES.find((r) => r.key === sig.injection?.route)?.label || 'ฉีด';
    const dil = INJECTION_DILUENTS.find((d) => d.key === sig.injection?.diluent)?.label;
    how = [route, dil ? `ผสมใน ${dil} ${sig.injection?.volumeMl || '—'} mL` : null,
      sig.injection?.rate ? `อัตรา ${sig.injection.rate} ${RATE_UNITS.find((u) => u.key === sig.injection.rateUnit)?.label || ''}` : null,
      sig.injection?.durationMin ? `ให้นาน ${sig.injection.durationMin} นาที` : null].filter(Boolean).join(' · ');
  }
  const days = sig.durationDays ? `นาน ${sig.durationDays} วัน` : '';
  return [mode, dose, how, days].filter(Boolean).join(' · ');
};

export default blankSigDetail;
