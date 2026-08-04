/* คลังการประเมินทางไกล (TOR §1.13.1 "เข้าถึงข้อมูลการประเมินที่ระบบ
   Telemedicine รวบรวม" + §1.13.2 "ผู้มีสิทธิ์เพิ่ม/แก้ไขข้อมูลการประเมิน").

   โครงฟอร์มอิงคู่มือ Telemed บทที่ 3 "บันทึกซักประวัติ" 5 ขั้นตอน:
     1. ข้อมูลส่งตรวจ
     2. ซักประวัติ + สัญญาณชีพ (ส่วนสูง น้ำหนัก อุณหภูมิ BP บน-ล่าง
        O2Sat RR PR PR% DTX + ก่อน/หลังอาหาร)
     3. ประเมิน / วินิจฉัย + บันทึกข้ออาการ
     4. คำสั่งการรักษา · คำแนะนำ · แผนการรักษา · นัดครั้งถัดไป
     5. หลักฐานการให้บริการ + PDPA + ลายเซ็นผู้บันทึก

   ทุกการเพิ่ม/แก้ไข/ยกเลิกถูกเก็บลง `history` เพื่อให้แท็บ
   "ประวัติการแก้ไขข้อมูล" ตอบได้ว่า ใคร-เมื่อไร-แก้อะไร. */

import { todayAt } from '@/data/telemedVisits';

export const ASSESSMENT_STEPS = [
  { title: 'ข้อมูลส่งตรวจ',        subtitle: 'Referral info' },
  { title: 'ซักประวัติ + สัญญาณชีพ', subtitle: 'History & Vitals' },
  { title: 'ประเมิน / วินิจฉัย',    subtitle: 'Assessment' },
  { title: 'แผนการรักษา',          subtitle: 'Plan & Orders' },
  { title: 'หลักฐาน + ลงนาม',       subtitle: 'Evidence & Sign' },
];

export const ASSESSMENT_TABS = [
  { key: 'current', label: 'ข้อมูลปัจจุบัน', icon: 'assignment' },
  { key: 'device',  label: 'ค่าจากอุปกรณ์',  icon: 'monitor_heart' },
  { key: 'history', label: 'ประวัติการแก้ไขข้อมูล', icon: 'history' },
];

/* ── คำแนะนำสำหรับ SuggestibleTextarea (voice + suggestions + minChars) ── */
export const SUGGEST_SYMPTOM = [
  'ปวดศีรษะตุบ ๆ บริเวณขมับทั้งสองข้าง เป็นมา 2 สัปดาห์',
  'เวียนศีรษะเวลาลุกยืน ไม่มีอาการหน้ามืดเป็นลม',
  'ใจสั่น เหงื่อออก มือสั่น หลังตื่นนอนตอนเช้า',
  'เหนื่อยง่ายเวลาเดินขึ้นบันได 1 ชั้น',
  'บวมที่ข้อเท้าทั้งสองข้างตอนเย็น',
  'ชาปลายมือปลายเท้าทั้งสองข้าง',
  'แผลที่เท้าไม่หายเกิน 2 สัปดาห์',
];

export const SUGGEST_DIAGNOSIS = [
  'Type 2 diabetes mellitus with poor glycemic control (E11.9)',
  'Essential hypertension, uncontrolled (I10)',
  'Hypoglycemia in diabetes on oral hypoglycemic agent (E16.2)',
  'Dyslipidemia (E78.5)',
  'Chronic kidney disease stage 3 (N18.3)',
  'Diabetic peripheral neuropathy (E11.42)',
];

export const SUGGEST_ADVICE = [
  'แนะนำลดอาหารรสเค็ม งดน้ำปลา/ซีอิ๊วเพิ่มบนโต๊ะอาหาร',
  'แนะนำวัดความดันที่บ้านเช้า-เย็น บันทึกส่งเข้าแอปทุกวัน',
  'แนะนำเจาะน้ำตาลก่อนอาหารเช้าทุกวัน และก่อนนอนถ้ามีอาการใจสั่น',
  'แนะนำพกลูกอม/น้ำหวานติดตัว หากมีอาการน้ำตาลต่ำให้รับประทานทันที',
  'แนะนำเดินเร็วอย่างน้อย 30 นาที สัปดาห์ละ 5 วัน',
  'แนะนำมาพบเจ้าหน้าที่ที่ศูนย์บริการทันทีหากความดันเกิน 180/110',
];

export const SUGGEST_PLAN = [
  'ปรับขนาดยาความดัน แล้วนัดติดตามผ่าน Telemedicine ใน 2 สัปดาห์',
  'ส่งเจาะเลือด HbA1c + BUN/Cr ที่หน่วยบริการต้นทางก่อนพบแพทย์ครั้งถัดไป',
  'ส่งกลับ รพ.สต. เพื่อติดตามความดันที่บ้านโดย อสม. สัปดาห์ละ 2 ครั้ง',
  'ส่งปรึกษาอายุรแพทย์โรคไต เนื่องจาก eGFR ลดลงต่อเนื่อง',
  'นัดพบที่ศูนย์บริการเพื่อตรวจร่างกายจริง เนื่องจากประเมินทางไกลไม่เพียงพอ',
];

export const SUGGEST_REASON = [
  'บันทึกค่าผิดช่อง ต้องแก้ให้ตรงกับใบบันทึกของ อสม.',
  'ผู้รับบริการแจ้งข้อมูลเพิ่มเติมหลังจบสาย',
  'ค่าที่รับจากอุปกรณ์ผิดปกติจากการวัดผิดวิธี',
  'แก้ไขตามคำสั่งแพทย์ผู้ตรวจ',
  'บันทึกซ้ำกับรายการเดิม จึงขอยกเลิกรายการนี้',
];

export const REFERRAL_STATUS_OPTIONS = [
  { value: 'new',      label: 'ส่งตรวจใหม่' },
  { value: 'followup', label: 'ติดตามอาการ' },
  { value: 'refer',    label: 'ส่งปรึกษาต่อ' },
];

export const NEXT_ACTION_OPTIONS = [
  { value: 'home',     label: 'ให้คำแนะนำแล้วติดตามที่บ้านต่อ' },
  { value: 'phc',      label: 'ส่งกลับ รพ.สต. ติดตามโดย อสม.' },
  { value: 'center',   label: 'นัดมาตรวจที่ศูนย์บริการ' },
  { value: 'consult',  label: 'ส่งปรึกษาอายุรแพทย์' },
  { value: 'refer',    label: 'ส่งต่อโรงพยาบาล' },
];

/* ── seed assessments ────────────────────────────────────────────────── */
const emptyVitals = () => ({
  height: '', weight: '', temp: '', bpSys: '', bpDia: '',
  o2sat: '', rr: '', pulse: '', pulsePct: '', dtx: '', dtxMeal: 'fasting',
  vitalSource: 'device',
});

const SEED = [
  {
    id: 'TMA-003', visitId: 'TMV-003', hn: '67-00007',
    status: 'draft', stepIndex: 1,
    referral: {
      originUnit: 'ศบส.41 คลองเตย (ชุมชนล็อค 1-2-3)',
      department: 'คลินิกผู้สูงอายุ',
      doctor: 'พญ.สมหญิง รักษาดี',
      chiefComplaint: 'ความดันสูงต่อเนื่อง อสม. วัดได้ 168/96 ติดกัน 2 ครั้ง',
      status: 'followup',
      authenCode: 'AUT-6801-2388',
      note: 'ผู้รับบริการอยู่บ้านคนเดียว ลูกสาวช่วยถือโทรศัพท์ระหว่างสาย',
    },
    vitals: { ...emptyVitals(), height: '152', weight: '61.5', temp: '36.7', bpSys: '172', bpDia: '98', o2sat: '97', rr: '18', pulse: '88', pulsePct: '98', dtx: '112', dtxMeal: 'fasting', vitalSource: 'device' },
    assessment: {
      symptoms: 'ปวดท้ายทอยตอนเช้า เวียนศีรษะเวลาลุกยืน ไม่มีเจ็บหน้าอก',
      diagnosis: 'Essential hypertension, uncontrolled (I10)',
      severity: 'moderate',
    },
    plan: { advice: '', treatmentPlan: '', nextAction: 'phc', nextAppointment: '' },
    evidence: { files: [], startedAt: todayAt(9, 4), endedAt: '', signature: '' },
    consentKey: 'TMC-003',
    gis: { lat: 13.7180, lng: 100.5820, label: 'ชุมชนล็อค 1-2-3 คลองเตย กรุงเทพมหานคร 10110' },
    createdBy: 'พว.กนกวรรณ ศรีทอง', createdAt: todayAt(9, 6),
    history: [
      { id: 'H-3001', at: todayAt(9, 6), by: 'พว.กนกวรรณ ศรีทอง', action: 'สร้างบันทึกการประเมิน', detail: 'ดึงค่าสัญญาณชีพจากอุปกรณ์ที่บ้าน (Omron HEM-7121)', reason: '' },
    ],
  },
  {
    id: 'TMA-005', visitId: 'TMV-005', hn: '67-00005',
    status: 'final', stepIndex: 4,
    referral: {
      originUnit: 'ศบส.15 ลาดพร้าว',
      department: 'อายุรกรรมทั่วไป',
      doctor: 'พญ.วราภรณ์ สุขใจ',
      chiefComplaint: 'ติดตามผลตรวจไทรอยด์ + ปรับขนาดยา',
      status: 'followup',
      authenCode: '',
      note: '',
    },
    vitals: { ...emptyVitals(), height: '160', weight: '54.0', temp: '36.5', bpSys: '118', bpDia: '74', o2sat: '99', rr: '16', pulse: '78', pulsePct: '99', dtx: '96', dtxMeal: 'fasting', vitalSource: 'self' },
    assessment: {
      symptoms: 'ไม่มีอาการใจสั่น น้ำหนักคงที่ นอนหลับดีขึ้น',
      diagnosis: 'Hypothyroidism, on replacement therapy (E03.9)',
      severity: 'mild',
    },
    plan: {
      advice: 'แนะนำรับประทานยาก่อนอาหารเช้า 30 นาที และห้ามรับประทานพร้อมนม/แคลเซียม',
      treatmentPlan: 'คงขนาด Levothyroxine 50 mcg แล้วเจาะ TSH/Free T4 ซ้ำก่อนพบแพทย์ครั้งถัดไป',
      nextAction: 'center',
      nextAppointment: '2569-09-02',
    },
    evidence: {
      files: [{ id: 'EVA-5001', name: 'screenshot-consult-0830.png', kind: 'image', size: '412 KB', at: todayAt(8, 56), by: 'พญ.วราภรณ์ สุขใจ' }],
      startedAt: todayAt(8, 34), endedAt: todayAt(8, 58),
      signature: 'พญ.วราภรณ์ สุขใจ',
    },
    consentKey: 'TMC-005',
    gis: { lat: 13.8020, lng: 100.5980, label: 'ซอยลาดพร้าว 71 สะพานสอง วังทองหลาง กรุงเทพมหานคร 10310' },
    createdBy: 'พญ.วราภรณ์ สุขใจ', createdAt: todayAt(8, 36),
    history: [
      { id: 'H-5003', at: todayAt(8, 58), by: 'พญ.วราภรณ์ สุขใจ', action: 'จบการบันทึก', detail: 'สถานะเปลี่ยนเป็น "บันทึกสมบูรณ์"', reason: '' },
      { id: 'H-5002', at: todayAt(8, 52), by: 'พญ.วราภรณ์ สุขใจ', action: 'แก้ไขแผนการรักษา', detail: 'คงขนาดยาเดิม (เดิม: เพิ่มเป็น 75 mcg)', reason: 'ผล TSH อยู่ในเกณฑ์แล้ว' },
      { id: 'H-5001', at: todayAt(8, 36), by: 'พญ.วราภรณ์ สุขใจ', action: 'สร้างบันทึกการประเมิน', detail: 'ค่าสัญญาณชีพจากผู้รับบริการกรอกเอง', reason: '' },
    ],
  },
];

const ASSESSMENTS = SEED.map((a) => ({
  ...a,
  referral: { ...a.referral },
  vitals: { ...a.vitals },
  assessment: { ...a.assessment },
  plan: { ...a.plan },
  evidence: { ...a.evidence, files: a.evidence.files.map((f) => ({ ...f })) },
  history: a.history.map((h) => ({ ...h })),
}));

const listeners = new Set();
const emit = () => listeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
export const subscribeAssessments = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

const clone = (a) => ({
  ...a,
  referral: { ...a.referral },
  vitals: { ...a.vitals },
  assessment: { ...a.assessment },
  plan: { ...a.plan },
  evidence: { ...a.evidence, files: a.evidence.files.map((f) => ({ ...f })) },
  history: a.history.map((h) => ({ ...h })),
});

export const getAssessments = () => ASSESSMENTS.map(clone);

export const getAssessmentByVisit = (visitId) => {
  const found = ASSESSMENTS.find((a) => a.visitId === visitId);
  return found ? clone(found) : null;
};

/** โครงเปล่าสำหรับ visit ที่ยังไม่มีบันทึก — หน้า assessment เรียกตอน create */
export const makeBlankAssessment = (visit) => ({
  id: `TMA-${visit?.id?.replace('TMV-', '') || Date.now()}`,
  visitId: visit?.id || '',
  hn: visit?.hn || '',
  status: 'new',
  stepIndex: 0,
  referral: {
    originUnit: visit?.originUnit || '',
    department: visit?.department || '',
    doctor: visit?.doctor || '',
    chiefComplaint: visit?.chiefComplaint || '',
    status: visit?.type === 'walkin' ? 'new' : 'followup',
    authenCode: visit?.authenCode || '',
    note: '',
  },
  vitals: emptyVitals(),
  assessment: { symptoms: '', diagnosis: '', severity: 'mild' },
  plan: { advice: '', treatmentPlan: '', nextAction: 'home', nextAppointment: '' },
  evidence: { files: [], startedAt: visit?.startedAt || '', endedAt: visit?.endedAt || '', signature: '' },
  consentKey: visit?.consentKey || '',
  gis: null,
  createdBy: '',
  createdAt: '',
  history: [],
});

const pushHistory = (a, actor, action, detail, reason) => {
  a.history.unshift({
    id: `H-${Date.now()}-${Math.round(Math.random() * 999)}`,
    at: new Date().toISOString(),
    by: actor,
    action,
    detail: detail || '',
    reason: reason || '',
  });
};

/** บันทึก (สร้างใหม่ถ้ายังไม่มี) — TOR "บันทึก" */
export const saveAssessment = (draft, actor, { final = false } = {}) => {
  const idx = ASSESSMENTS.findIndex((a) => a.visitId === draft.visitId);
  const next = clone(draft);
  next.status = final ? 'final' : 'draft';
  next.updatedBy = actor;
  next.updatedAt = new Date().toISOString();
  if (idx < 0) {
    next.createdBy = actor;
    next.createdAt = new Date().toISOString();
    next.history = [];
    pushHistory(next, actor, 'สร้างบันทึกการประเมิน', final ? 'บันทึกสมบูรณ์' : 'บันทึกร่าง');
    ASSESSMENTS.push(next);
  } else {
    const prev = ASSESSMENTS[idx];
    next.createdBy = prev.createdBy || actor;
    next.createdAt = prev.createdAt || new Date().toISOString();
    next.history = prev.history.map((h) => ({ ...h }));
    pushHistory(next, actor, final ? 'จบการบันทึก' : 'บันทึกร่าง', final ? 'สถานะเปลี่ยนเป็น "บันทึกสมบูรณ์"' : '');
    ASSESSMENTS[idx] = next;
  }
  emit();
  return { ok: true, assessment: clone(next) };
};

/** แก้ไขเฉพาะส่วน (พร้อมเหตุผล) — TOR "แก้ไข" */
export const amendAssessment = (visitId, section, patch, reason, actor) => {
  const a = ASSESSMENTS.find((x) => x.visitId === visitId);
  if (!a) return { ok: false, reason: 'ไม่พบบันทึกการประเมิน' };
  if (!reason || !reason.trim()) return { ok: false, reason: 'ต้องระบุเหตุผลการแก้ไข' };
  const changed = Object.keys(patch).filter((k) => a[section]?.[k] !== patch[k]);
  a[section] = { ...a[section], ...patch };
  a.updatedBy = actor;
  a.updatedAt = new Date().toISOString();
  pushHistory(a, actor, 'แก้ไขข้อมูลการประเมิน', `${section}: ${changed.join(', ') || 'ไม่มีการเปลี่ยนแปลง'}`, reason.trim());
  emit();
  return { ok: true };
};

/** ยกเลิกบันทึก — soft cancel + เหตุผล (ยังเห็นในประวัติ) */
export const cancelAssessment = (visitId, reason, actor) => {
  const a = ASSESSMENTS.find((x) => x.visitId === visitId);
  if (!a) return { ok: false, reason: 'ไม่พบบันทึกการประเมิน' };
  if (!reason || !reason.trim()) return { ok: false, reason: 'ต้องระบุเหตุผลการยกเลิก' };
  a.status = 'cancelled';
  a.cancel = { reason: reason.trim(), by: actor, at: new Date().toISOString() };
  pushHistory(a, actor, 'ยกเลิกบันทึกการประเมิน', '', reason.trim());
  emit();
  return { ok: true };
};

export const restoreAssessment = (visitId, actor) => {
  const a = ASSESSMENTS.find((x) => x.visitId === visitId);
  if (!a || a.status !== 'cancelled') return { ok: false, reason: 'บันทึกนี้ไม่ได้อยู่ในสถานะยกเลิก' };
  a.status = 'draft';
  a.cancel = null;
  pushHistory(a, actor, 'กู้คืนบันทึกการประเมิน', 'สถานะกลับเป็น "ร่าง"');
  emit();
  return { ok: true };
};

/** คำขอแก้ไขย้อนหลังสำหรับ visit ที่ปิดแล้ว */
export const requestRetroEdit = (visitId, reason, actor) => {
  const a = ASSESSMENTS.find((x) => x.visitId === visitId);
  if (!a) return { ok: false, reason: 'ไม่พบบันทึกการประเมิน' };
  if (!reason || !reason.trim()) return { ok: false, reason: 'ต้องระบุเหตุผลการขอแก้ไขย้อนหลัง' };
  a.retroEdit = { reason: reason.trim(), by: actor, at: new Date().toISOString(), status: 'approved' };
  pushHistory(a, actor, 'ขอแก้ไขย้อนหลัง', 'ระบบเปิดให้แก้ไขชั่วคราว', reason.trim());
  emit();
  return { ok: true };
};

/* ── validation ต่อขั้นตอน (StepProgress mark + สรุป error ด้านบน) ────── */
export const VITALS_RANGES = {
  height: [80, 220, 'ซม.'],
  weight: [20, 250, 'กก.'],
  temp:   [32, 43, '°C'],
  bpSys:  [50, 260, 'mmHg'],
  bpDia:  [30, 160, 'mmHg'],
  o2sat:  [50, 100, '%'],
  rr:     [6, 60, 'ครั้ง/นาที'],
  pulse:  [30, 220, 'ครั้ง/นาที'],
  pulsePct: [0, 100, '%'],
  dtx:    [20, 600, 'mg/dL'],
};

export const VITAL_LABELS = {
  height: 'ส่วนสูง', weight: 'น้ำหนัก', temp: 'อุณหภูมิ',
  bpSys: 'ความดันตัวบน', bpDia: 'ความดันตัวล่าง', o2sat: 'O₂Sat',
  rr: 'อัตราการหายใจ (RR)', pulse: 'ชีพจร (PR)', pulsePct: 'PR%', dtx: 'DTX',
};

export const validateVitals = (vitals) => {
  const errors = {};
  Object.keys(VITALS_RANGES).forEach((k) => {
    const raw = vitals[k];
    if (raw === '' || raw == null) return;
    const [min, max, unit] = VITALS_RANGES[k];
    const n = Number(raw);
    if (Number.isNaN(n)) { errors[k] = `${VITAL_LABELS[k]} ต้องเป็นตัวเลข`; return; }
    if (n < min || n > max) errors[k] = `${VITAL_LABELS[k]} ต้องอยู่ระหว่าง ${min}–${max} ${unit}`;
  });
  if (vitals.bpSys && vitals.bpDia && Number(vitals.bpDia) >= Number(vitals.bpSys)) {
    errors.bpDia = 'ความดันตัวล่างต้องน้อยกว่าตัวบน';
  }
  return errors;
};

export const vitalSoftWarnings = (vitals) => {
  const out = [];
  if (vitals.bpSys && Number(vitals.bpSys) >= 160) out.push('ความดันตัวบน ≥ 160 — เข้าเกณฑ์เฝ้าระวังตามคู่มือ');
  if (vitals.dtx && Number(vitals.dtx) < 80) out.push('DTX < 80 mg/dL — เสี่ยงน้ำตาลต่ำ');
  if (vitals.dtx && Number(vitals.dtx) > 180) out.push('DTX > 180 mg/dL — น้ำตาลสูงกว่าเกณฑ์');
  if (vitals.o2sat && Number(vitals.o2sat) < 94) out.push('O₂Sat < 94 % — ประเมินอาการเหนื่อยหอบ');
  return out;
};

/** ตรวจความครบถ้วนรายขั้น → [{ step, field, message }] */
export const validateAssessment = (draft) => {
  const issues = [];
  if (!draft.referral.originUnit) issues.push({ step: 0, field: 'originUnit', message: 'ต้องระบุหน่วยบริการต้นทาง' });
  if (!draft.referral.department) issues.push({ step: 0, field: 'department', message: 'ต้องระบุแผนกที่ส่งตรวจ' });
  if (!draft.referral.chiefComplaint?.trim()) issues.push({ step: 0, field: 'chiefComplaint', message: 'ต้องระบุอาการเบื้องต้น' });

  const vErrors = validateVitals(draft.vitals);
  Object.keys(vErrors).forEach((k) => issues.push({ step: 1, field: k, message: vErrors[k] }));
  if (!draft.vitals.bpSys || !draft.vitals.bpDia) issues.push({ step: 1, field: 'bpSys', message: 'ต้องบันทึกความดันโลหิต (บน/ล่าง)' });

  if (!draft.assessment.symptoms?.trim()) issues.push({ step: 2, field: 'symptoms', message: 'ต้องบันทึกข้ออาการ' });
  if (!draft.assessment.diagnosis?.trim()) issues.push({ step: 2, field: 'diagnosis', message: 'ต้องสรุปผลวินิจฉัย' });

  if (!draft.plan.advice?.trim()) issues.push({ step: 3, field: 'advice', message: 'ต้องบันทึกการให้คำแนะนำ' });
  if (!draft.plan.treatmentPlan?.trim()) issues.push({ step: 3, field: 'treatmentPlan', message: 'ต้องบันทึกแผนการรักษา' });

  if (!draft.evidence.files?.length) issues.push({ step: 4, field: 'files', message: 'ยังไม่มีภาพหลักฐานการให้บริการ — เบิกจ่ายไม่ได้ (คู่มือ 5.3.5)' });
  if (!draft.evidence.startedAt || !draft.evidence.endedAt) issues.push({ step: 4, field: 'startedAt', message: 'ต้องระบุวันที่/เวลาเริ่ม-สิ้นสุดการให้บริการ' });
  if (!draft.evidence.signature) issues.push({ step: 4, field: 'signature', message: 'ต้องลงลายเซ็นผู้บันทึก' });

  return issues;
};

export const stepsWithIssues = (issues) => {
  const set = new Set(issues.map((i) => i.step));
  return Array.from(set);
};
