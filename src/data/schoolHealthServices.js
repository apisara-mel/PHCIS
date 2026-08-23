/* schoolHealthServices.js — บันทึกการให้บริการนักเรียน + คิว + Batch entry
   + ส่งต่อ PHCIS + ข้อมูลตั้งต้นของ Dashboard/รายงาน
   (TOR §3.3.1–3.3.8, §3.4.1–3.4.4, §3.6.1–3.6.8)

   6 กิจกรรมบริการ (tab) ตามมติ คทง.5:
     ตรวจสุขภาพ · ทันตกรรม · ประวัติวัคซีน · ให้บริการวัคซีน · ประเมินพัฒนาการ · สุขภาพจิต

   ประวัติบริการ "ตั้งต้น" ถูก generate แบบ deterministic จากรหัสนักเรียน
   (hash คงที่ → ผลเดิมทุกครั้งที่โหลด) เพื่อให้กราฟการเจริญเติบโต ·
   Dashboard · รายงาน สอดคล้องกันทุกหน้าโดยไม่ต้องเขียน mock ทีละแถว
   ส่วนที่ผู้ใช้บันทึก/แก้ไข/ยกเลิกระหว่าง session อยู่ใน overlay */

import {
  SH_KEYS, readJson, writeJson, nextRunNo, auditStamp,
  CURRENT_ACADEMIC_YEAR, CURRENT_TERM, gradeLabel, gradeOrder,
  todayIso, toIso, addDaysIso, ageYearsAt, pct,
} from '@/data/schoolHealthCore';
import {
  getSchoolById, getActiveSchools, getClassrooms, getClassroomById,
} from '@/data/schoolHealthSchools';
import {
  getActiveStudents, getStudentRows, getStudentById, getClassRoster,
} from '@/data/schoolHealthStudents';
import {
  evaluateNutrition, classifyAnemia, isAnemiaScreeningTarget,
  VISION_RESULTS, LICE_RESULTS, DEV_RESULTS, MENTAL_RESULTS,
  optionLabel, nutritionBand, OFF_TARGET_BANDS,
} from '@/data/schoolHealthGrowthRef';
import { getVaccineById, getVaccineLots, resolveLotWarning, isLotExpired } from '@/data/immunizationVaccines';

/* ── ชนิดบริการ (tab) ─────────────────────────────────────────────── */

export const SERVICE_TYPES = [
  { value: 'checkup', label: 'ตรวจสุขภาพ', icon: 'stethoscope', sensitive: false },
  { value: 'dental', label: 'ทันตกรรม', icon: 'dentistry', sensitive: false },
  { value: 'vaccineHistory', label: 'ประวัติวัคซีน', icon: 'vaccines', sensitive: false },
  { value: 'vaccineGive', label: 'ให้บริการวัคซีน', icon: 'syringe', sensitive: false },
  { value: 'development', label: 'ประเมินพัฒนาการ', icon: 'child_care', sensitive: true },
  { value: 'mental', label: 'สุขภาพจิต', icon: 'psychology', sensitive: true },
];

export const serviceTypeLabel = (v) =>
  SERVICE_TYPES.find((t) => t.value === v)?.label || '—';

export const isSensitiveService = (v) =>
  !!SERVICE_TYPES.find((t) => t.value === v)?.sensitive;

/* ── ตารางสร้างเสริมภูมิคุ้มกันตามระดับชั้น (คู่มือ §2.2.4) ─────────── */

export const SCHOOL_VACCINE_SCHEDULE = {
  p1: [
    { vaccineId: 'vac-mmr', doseLabel: 'MMR เข็มกระตุ้น', catchUp: true },
    { vaccineId: 'vac-dt', doseLabel: 'dT (คอตีบ-บาดทะยัก)', catchUp: true },
    { vaccineId: 'vac-opv', doseLabel: 'OPV เข็มกระตุ้น', catchUp: true },
    { vaccineId: 'vac-bcg', doseLabel: 'BCG (เก็บตกรายที่ไม่มีแผลเป็น)', catchUp: true },
    { vaccineId: 'vac-hbv', doseLabel: 'HBV (เก็บตกรายที่ได้ไม่ครบ)', catchUp: true },
  ],
  p5: [
    { vaccineId: 'vac-hpv', doseLabel: 'HPV เข็มที่ 1 (นักเรียนหญิง)', femaleOnly: true },
  ],
  p6: [
    { vaccineId: 'vac-dt', doseLabel: 'dT เข็มกระตุ้น', catchUp: false },
  ],
  m1: [
    { vaccineId: 'vac-mmr', doseLabel: 'MMR (เก็บตกรายที่ได้ไม่ครบ)', catchUp: true },
  ],
};

export const getVaccineScheduleForGrade = (grade) =>
  (SCHOOL_VACCINE_SCHEDULE[grade] || []).map((row) => ({
    ...row,
    vaccine: getVaccineById(row.vaccineId),
  }));

/** ชั้นที่มีโปรแกรมวัคซีน — ใช้ทำ dropdown ของ Batch entry */
export const VACCINE_GRADES = Object.keys(SCHOOL_VACCINE_SCHEDULE);

export const NOT_GIVEN_REASONS = [
  { value: 'absent', label: 'ขาดเรียน/ไม่มาโรงเรียน' },
  { value: 'refused', label: 'ผู้ปกครองไม่ยินยอม' },
  { value: 'sick', label: 'มีไข้/เจ็บป่วยขณะให้บริการ' },
  { value: 'already', label: 'ได้รับครบจากสถานพยาบาลอื่นแล้ว' },
  { value: 'allergy', label: 'มีข้อห้าม/ประวัติแพ้วัคซีน' },
];

export const notGivenReasonLabel = (v) =>
  NOT_GIVEN_REASONS.find((r) => r.value === v)?.label || '—';

/* ── deterministic pseudo-random จากรหัสนักเรียน ───────────────────── */

const hash = (str) => {
  let h = 0;
  for (let i = 0; i < String(str).length; i += 1) {
    h = (h * 31 + String(str).charCodeAt(i)) % 1000003;
  }
  return h;
};

const pick = (arr, seed) => arr[seed % arr.length];

/* ── สร้างประวัติบริการตั้งต้น ─────────────────────────────────────── */

const CHECKUP_YEARS = [
  { academicYear: '2567', offsetYears: 2, month: 6 },
  { academicYear: '2568', offsetYears: 1, month: 6 },
  { academicYear: '2569', offsetYears: 0, month: 6 },
];

const GENERAL_FINDINGS = [
  'ตรวจร่างกาย 14 ระบบไม่พบความผิดปกติ',
  'ผิวหนังแห้งบริเวณแขนทั้งสองข้าง แนะนำทาโลชั่น',
  'ต่อมทอนซิลโตเล็กน้อย ไม่มีอาการเจ็บคอ',
  'พบขี้หูอุดตันหูขวา ทำความสะอาดแล้ว',
];

const ADVICE_TEXTS = [
  'แนะนำดื่มนมจืดวันละ 2 แก้ว ลดขนมกรุบกรอบและน้ำหวาน',
  'แนะนำออกกำลังกายอย่างน้อยวันละ 60 นาที',
  'แนะนำล้างมือก่อนรับประทานอาหารและหลังเข้าห้องน้ำ',
  'แนะนำนอนหลับให้เพียงพอ 9–11 ชั่วโมงต่อคืน',
];

/** ค่าน้ำหนัก/ส่วนสูงตามอายุ + profile ของเด็ก (normal / thin / over / obese) */
const buildMeasurement = (student, ageYears, profile) => {
  const male = student.sex !== 'หญิง';
  const baseHeight = (male ? 78 : 77) + ageYears * 5.4;
  const heightCm = Math.round(baseHeight + ((hash(student.id) % 9) - 4) * 0.9);
  const targetBmi = profile === 'obese'
    ? 23 + ageYears * 0.42
    : profile === 'over'
      ? 20.5 + ageYears * 0.36
      : profile === 'thin'
        ? 12.6 + ageYears * 0.18
        : 15.4 + ageYears * 0.24;
  const m = heightCm / 100;
  const weightKg = Math.round(targetBmi * m * m * 10) / 10;
  return { heightCm, weightKg };
};

const studentProfile = (student) => {
  const h = hash(student.id) % 10;
  if (h === 0) return 'obese';
  if (h === 3) return 'over';
  if (h === 6) return 'thin';
  return 'normal';
};

const buildCheckupRecords = (student) => {
  const profile = studentProfile(student);
  const h = hash(student.id);
  const anemiaTarget = isAnemiaScreeningTarget(student);
  return CHECKUP_YEARS.map((y, idx) => {
    const year = 2026 - y.offsetYears;
    /* ~1 ใน 7 ของนักเรียนยังไม่ได้ตรวจรอบปีปัจจุบัน — เป็นกลุ่ม "เก็บตก"
       ที่ Dashboard §3.4.3 ต้องหยิบขึ้นมาแสดง */
    if (y.offsetYears === 0 && h % 7 === 3) return null;
    const date = toIso(new Date(year, y.month - 1, 8 + (h % 14)));
    const ageYears = ageYearsAt(student.birthDate, date);
    if (ageYears == null || ageYears < 3) return null;
    const { heightCm, weightKg } = buildMeasurement(student, ageYears, profile);
    const nutrition = evaluateNutrition({
      sex: student.sex, birthDate: student.birthDate, measuredAt: date, weightKg, heightCm,
    });
    const vision = h % 7 === 0 && idx === CHECKUP_YEARS.length - 1 ? 'refractive' : 'normal';
    const lice = h % 11 === 0 ? 'nits' : 'none';
    const hct = anemiaTarget ? (h % 3 === 0 ? 31 + (h % 3) : 38 + (h % 4)) : null;
    return {
      id: `svc-chk-${student.id}-${y.academicYear}`,
      studentId: student.id,
      type: 'checkup',
      date,
      academicYear: y.academicYear,
      term: '1',
      weightKg,
      heightCm,
      bmi: nutrition?.bmi ?? null,
      nutritionKey: nutrition?.outOfRange ? 'out-of-range' : (nutrition?.key ?? null),
      vision,
      visionNote: vision === 'refractive' ? 'อ่านแผ่นวัดสายตาระยะ 6 เมตรได้ไม่ครบแถว 20/40 ทั้งสองข้าง' : '',
      lice,
      hct,
      anemiaKey: hct ? classifyAnemia(hct, ageYears)?.key : null,
      anemiaAdvised: !!hct,
      generalFindings: pick(GENERAL_FINDINGS, h + idx),
      advice: pick(ADVICE_TEXTS, h + idx * 3),
      obesityScreened: nutrition?.needsObesityScreening || false,
      obesityPlan: nutrition?.needsObesityScreening
        ? 'ให้คำแนะนำโภชนาการรายบุคคล + นัดติดตามน้ำหนักทุก 3 เดือน · แจ้งครูประจำชั้นและผู้ปกครอง'
        : '',
      recordedBy: 'พว.ณัฐธิดา บุญมั่น',
      position: 'พยาบาลวิชาชีพชำนาญการ',
      recordedAt: `${date}T09:${String(10 + (h % 40)).padStart(2, '0')}:00`,
      status: 'saved',
    };
  }).filter(Boolean);
};

const buildDentalRecord = (student) => {
  const h = hash(`${student.id}-dental`);
  if (h % 4 === 3) return null; /* บางคนยังไม่ได้ตรวจฟัน — demo empty/เก็บตก */
  const date = toIso(new Date(2026, 6, 3 + (h % 20)));
  const decayed = h % 5;
  const filled = h % 3;
  return {
    id: `svc-dnt-${student.id}`,
    studentId: student.id,
    type: 'dental',
    date,
    academicYear: '2569',
    term: '1',
    decayedPrimary: student.grade && gradeOrder(student.grade) <= 7 ? decayed : 0,
    decayedPermanent: gradeOrder(student.grade) > 7 ? decayed : Math.max(0, decayed - 1),
    filled,
    missing: h % 7 === 0 ? 1 : 0,
    gingivitis: h % 6 === 0,
    calculus: h % 5 === 0,
    needTreatment: decayed > 0,
    treatmentDone: decayed > 0 && h % 2 === 0 ? 'เคลือบฟลูออไรด์ + อุดฟันชั่วคราว 1 ซี่' : '',
    advice: 'แปรงฟันหลังอาหารกลางวันทุกวัน · ลดขนมหวานระหว่างมื้อ',
    dentist: h % 2 === 0 ? 'ทพญ.อริสา วงศ์ไพศาล' : 'ทพ.สมศักดิ์ เจริญพร',
    recordedBy: h % 2 === 0 ? 'ทพญ.อริสา วงศ์ไพศาล' : 'ทพ.สมศักดิ์ เจริญพร',
    position: 'ทันตแพทย์ชำนาญการ',
    recordedAt: `${date}T10:20:00`,
    status: 'saved',
  };
};

/** ประวัติวัคซีนก่อนวัยเรียน + ที่ได้รับในโรงเรียน */
const PRESCHOOL_DOSES = [
  { vaccineId: 'vac-bcg', seq: 1, ageMonths: 0 },
  { vaccineId: 'vac-hbv', seq: 1, ageMonths: 0 },
  { vaccineId: 'vac-dtphb', seq: 1, ageMonths: 2 },
  { vaccineId: 'vac-dtphb', seq: 2, ageMonths: 4 },
  { vaccineId: 'vac-dtphb', seq: 3, ageMonths: 6 },
  { vaccineId: 'vac-opv', seq: 3, ageMonths: 6 },
  { vaccineId: 'vac-mmr', seq: 1, ageMonths: 9 },
  { vaccineId: 'vac-je', seq: 1, ageMonths: 12 },
  { vaccineId: 'vac-dtp', seq: 4, ageMonths: 18 },
];

const addMonths = (isoDate, months) => {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return toIso(d);
};

const buildVaccineHistory = (student) => {
  const h = hash(`${student.id}-vac`);
  /* บางคนได้ไม่ครบ — เป็นกลุ่มเป้าหมาย "เก็บตก ป.1" */
  const missingIdx = h % 9 === 0 ? h % PRESCHOOL_DOSES.length : -1;
  return PRESCHOOL_DOSES
    .filter((_, i) => i !== missingIdx)
    .map((d, i) => ({
      id: `svc-vh-${student.id}-${i}`,
      studentId: student.id,
      type: 'vaccineHistory',
      vaccineId: d.vaccineId,
      seq: d.seq,
      date: addMonths(student.birthDate, d.ageMonths),
      lotNo: '',
      source: 'สมุดบันทึกสุขภาพแม่และเด็ก (สมุดสีชมพู)',
      recordedBy: 'พว.ณัฐธิดา บุญมั่น',
      position: 'พยาบาลวิชาชีพชำนาญการ',
      recordedAt: `${addMonths(student.birthDate, d.ageMonths)}T09:00:00`,
      status: 'saved',
    }));
};

const buildDevelopmentRecord = (student) => {
  if (gradeOrder(student.grade) > 6) return null; /* ประเมินพัฒนาการเน้น อ.–ป.3 */
  const h = hash(`${student.id}-dev`);
  const result = h % 8 === 0 ? 'delay' : h % 5 === 0 ? 'watch' : 'normal';
  const date = toIso(new Date(2026, 5, 12 + (h % 10)));
  return {
    id: `svc-dev-${student.id}`,
    studentId: student.id,
    type: 'development',
    date,
    academicYear: '2569',
    term: '1',
    tool: 'แบบคัดกรองพัฒนาการเด็กวัยเรียน (ด้านการเรียนรู้ · สังคม · กล้ามเนื้อ)',
    result,
    domains: {
      learning: result === 'delay' ? 'ควรได้รับการประเมินซ้ำ' : 'สมวัย',
      social: 'สมวัย',
      motor: result === 'watch' ? 'กล้ามเนื้อมัดเล็กช้ากว่าเกณฑ์เล็กน้อย' : 'สมวัย',
    },
    note: result === 'normal'
      ? 'พัฒนาการสมวัยทุกด้าน แนะนำส่งเสริมการอ่านที่บ้าน'
      : 'แจ้งครูประจำชั้นและผู้ปกครอง · นัดประเมินซ้ำใน 3 เดือน',
    recordedBy: 'พว.พรทิพย์ แสงเดือน',
    position: 'พยาบาลวิชาชีพชำนาญการ',
    recordedAt: `${date}T13:30:00`,
    status: 'saved',
  };
};

const buildMentalRecord = (student) => {
  if (gradeOrder(student.grade) < 9) return null; /* ป.6 ขึ้นไป */
  const h = hash(`${student.id}-mh`);
  const result = h % 9 === 0 ? 'problem' : h % 4 === 0 ? 'risk' : 'normal';
  const date = toIso(new Date(2026, 6, 20 + (h % 8)));
  return {
    id: `svc-mh-${student.id}`,
    studentId: student.id,
    type: 'mental',
    date,
    academicYear: '2569',
    term: '1',
    tool: 'SDQ ฉบับนักเรียนประเมินตนเอง + 2Q',
    score: result === 'problem' ? 21 + (h % 4) : result === 'risk' ? 16 + (h % 3) : 8 + (h % 5),
    result,
    note: result === 'normal'
      ? 'ไม่พบความเสี่ยงด้านสุขภาพจิต แนะนำช่องทางปรึกษาสายด่วน 1323'
      : 'ให้คำปรึกษาเบื้องต้น · ประสานครูแนะแนว · พิจารณาส่งต่อคลินิกสุขภาพจิต ศบส.',
    recordedBy: 'พว.กนกวรรณ ศรีสุข',
    position: 'พยาบาลวิชาชีพ',
    recordedAt: `${date}T14:10:00`,
    status: 'saved',
  };
};

/* เข็มที่ให้บริการในโรงเรียนรอบปีการศึกษา 2569 — บันทึกผ่าน Batch รายห้อง
   (ใช้เป็นตัวตั้งต้นของรายงาน §3.6.4 และของแท็บ "ให้บริการวัคซีน") */
const BASE_GIVEN_DOSES = [
  { studentId: 'stu-0001', vaccineId: 'vac-dt', lotNo: 'DT-6910', date: '2026-07-16', batch: true },
  { studentId: 'stu-0002', vaccineId: 'vac-dt', lotNo: 'DT-6910', date: '2026-07-16', batch: true },
  { studentId: 'stu-0004', vaccineId: 'vac-dt', lotNo: 'DT-6910', date: '2026-07-16', batch: true },
  { studentId: 'stu-0021', vaccineId: 'vac-dt', lotNo: 'DT-6910', date: '2026-07-16', batch: true },
  { studentId: 'stu-0022', vaccineId: 'vac-dt', lotNo: 'DT-6910', date: '2026-07-16', batch: true },
  { studentId: 'stu-0031', vaccineId: 'vac-dt', lotNo: 'DT-6910', date: '2026-07-16', batch: true },
  { studentId: 'stu-0032', vaccineId: 'vac-mmr', lotNo: 'MMR-6908', date: '2026-07-16', batch: true },
  { studentId: 'stu-0051', vaccineId: 'vac-hpv', lotNo: 'HPV-6911', date: '2026-08-06', batch: false },
  { studentId: 'stu-0052', vaccineId: 'vac-hpv', lotNo: 'HPV-6911', date: '2026-08-06', batch: false },
];

const buildGivenDoses = () => BASE_GIVEN_DOSES.map((d, i) => ({
  id: `svc-vg-${d.studentId}-${i}`,
  studentId: d.studentId,
  type: 'vaccineGive',
  vaccineId: d.vaccineId,
  lotNo: d.lotNo,
  seq: 1,
  date: d.date,
  site: 'lt-deltoid',
  batch: d.batch,
  academicYear: '2569',
  term: '1',
  note: 'สังเกตอาการ 30 นาทีหลังฉีด ไม่พบอาการไม่พึงประสงค์',
  recordedBy: 'พว.ณัฐธิดา บุญมั่น',
  position: 'พยาบาลวิชาชีพชำนาญการ',
  recordedAt: `${d.date}T10:05:00`,
  status: 'saved',
}));

let BASE_SERVICES = null;

const baseServices = () => {
  if (BASE_SERVICES) return BASE_SERVICES;
  const rows = [];
  getStudentRows().forEach((student) => {
    if (!student.birthDate) return;
    rows.push(...buildCheckupRecords(student));
    const dental = buildDentalRecord(student);
    if (dental) rows.push(dental);
    rows.push(...buildVaccineHistory(student));
    const dev = buildDevelopmentRecord(student);
    if (dev) rows.push(dev);
    const mh = buildMentalRecord(student);
    if (mh) rows.push(mh);
  });
  rows.push(...buildGivenDoses());
  BASE_SERVICES = rows;
  return rows;
};

/* ── Service record CRUD ──────────────────────────────────────────── */

const serviceOverlay = () => readJson(SH_KEYS.services, {});

export const getAllServices = () => {
  const overlay = serviceOverlay();
  const base = baseServices().map((r) => ({ ...r, ...(overlay[r.id] || {}) }));
  const extras = Object.values(overlay).filter((r) => r?.id && !baseServices().some((b) => b.id === r.id));
  return [...base, ...extras];
};

export const getStudentServices = (studentId, type) =>
  getAllServices()
    .filter((r) => r.studentId === studentId && (!type || r.type === type))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

export const getLatestService = (studentId, type) => getStudentServices(studentId, type)[0] || null;

/** บันทึก/แก้ไข record บริการ — ทุกครั้งแนบผู้บันทึก+ตำแหน่ง+เวลา */
export const saveServiceRecord = (entry) => {
  const overlay = serviceOverlay();
  const isNew = !entry.id;
  const id = entry.id || `svc-new-${nextRunNo(SH_KEYS.serviceRun)}`;
  const previous = overlay[id] || baseServices().find((r) => r.id === id) || {};
  const stamp = auditStamp();
  const saved = {
    ...previous,
    ...entry,
    id,
    status: entry.status || 'saved',
    recordedBy: stamp.by,
    position: stamp.position,
    recordedAt: stamp.at,
    editHistory: [...(previous.editHistory || []), { action: isNew ? 'create' : 'edit', ...stamp }],
  };
  overlay[id] = saved;
  writeJson(SH_KEYS.services, overlay);
  return { saved, isNew };
};

export const cancelServiceRecord = (id, reason) => {
  const overlay = serviceOverlay();
  const previous = overlay[id] || baseServices().find((r) => r.id === id);
  if (!previous) return null;
  const stamp = auditStamp();
  const saved = {
    ...previous,
    status: 'cancelled',
    cancellation: { reason, ...stamp },
    editHistory: [...(previous.editHistory || []), { action: 'cancel', reason, ...stamp }],
  };
  overlay[id] = saved;
  writeJson(SH_KEYS.services, overlay);
  return saved;
};

export const reactivateServiceRecord = (id) => {
  const overlay = serviceOverlay();
  const previous = overlay[id] || baseServices().find((r) => r.id === id);
  if (!previous) return null;
  const stamp = auditStamp();
  const saved = {
    ...previous,
    status: 'saved',
    cancellation: null,
    editHistory: [...(previous.editHistory || []), { action: 'reactivate', ...stamp }],
  };
  overlay[id] = saved;
  writeJson(SH_KEYS.services, overlay);
  return saved;
};

/* ── ร่าง (tab "ที่ร่างไว้") ───────────────────────────────────────── */

export const getDrafts = () => readJson(SH_KEYS.drafts, {});

export const getDraft = (studentId, type) => getDrafts()[`${studentId}:${type}`] || null;

export const saveDraft = (studentId, type, form) => {
  const drafts = getDrafts();
  drafts[`${studentId}:${type}`] = { studentId, type, form, ...auditStamp() };
  writeJson(SH_KEYS.drafts, drafts);
};

export const removeDraft = (studentId, type) => {
  const drafts = getDrafts();
  delete drafts[`${studentId}:${type}`];
  writeJson(SH_KEYS.drafts, drafts);
};

export const getDraftStudentIds = () =>
  [...new Set(Object.values(getDrafts()).map((d) => d.studentId))];

/* ── คิวให้บริการวันนี้ (§3.3.1 / §3.3.4) ─────────────────────────── */

const QUEUE_SEED = [
  { studentId: 'stu-0011', queue: 'SC-001', arriveAt: '08:35', serviceType: 'checkup', statusKey: 'done', room: 'ห้องพยาบาลโรงเรียน' },
  { studentId: 'stu-0012', queue: 'SC-002', arriveAt: '08:41', serviceType: 'checkup', statusKey: 'done', room: 'ห้องพยาบาลโรงเรียน' },
  { studentId: 'stu-0013', queue: 'SC-003', arriveAt: '08:47', serviceType: 'checkup', statusKey: 'progress', room: 'ห้องพยาบาลโรงเรียน' },
  { studentId: 'stu-0014', queue: 'SC-004', arriveAt: '08:52', serviceType: 'checkup', statusKey: 'waiting', room: 'ห้องพยาบาลโรงเรียน' },
  { studentId: 'stu-0015', queue: 'SC-005', arriveAt: '08:58', serviceType: 'dental', statusKey: 'waiting', room: 'หน่วยทันตกรรมเคลื่อนที่' },
  { studentId: 'stu-0001', queue: 'SC-006', arriveAt: '09:05', serviceType: 'vaccineGive', statusKey: 'waiting', room: 'ห้องประชุมโรงเรียน' },
  { studentId: 'stu-0002', queue: 'SC-007', arriveAt: '09:08', serviceType: 'vaccineGive', statusKey: 'waiting', room: 'ห้องประชุมโรงเรียน' },
  { studentId: 'stu-0041', queue: 'SC-008', arriveAt: '10:20', serviceType: 'checkup', statusKey: 'progress', room: 'ห้องพยาบาลโรงเรียน' },
  { studentId: 'stu-0042', queue: 'SC-009', arriveAt: '10:26', serviceType: 'checkup', statusKey: 'waiting', room: 'ห้องพยาบาลโรงเรียน' },
  { studentId: 'stu-0043', queue: 'SC-010', arriveAt: '10:31', serviceType: 'mental', statusKey: 'done', room: 'ห้องแนะแนว' },
  { studentId: 'stu-0051', queue: 'SC-011', arriveAt: '11:02', serviceType: 'dental', statusKey: 'done', room: 'หน่วยทันตกรรมเคลื่อนที่' },
  { studentId: 'stu-0034', queue: 'SC-012', arriveAt: '11:15', serviceType: 'checkup', statusKey: 'waiting', room: 'ห้องพยาบาลโรงเรียน' },
];

/** นัดแล้วยังไม่มาติดต่อ — ตามแผนออกให้บริการ */
const SCHEDULED_SEED = [
  { studentId: 'stu-0003', appointmentTime: '13:00', serviceType: 'vaccineGive', note: 'เก็บตกวัคซีน ป.1' },
  { studentId: 'stu-0004', appointmentTime: '13:15', serviceType: 'vaccineGive', note: 'เก็บตกวัคซีน ป.1' },
  { studentId: 'stu-0044', appointmentTime: '13:30', serviceType: 'checkup', note: 'คัดกรองภาวะซีด ม.2 หญิง' },
];

const queueOverlay = () => readJson(SH_KEYS.queue, { checkedIn: [], cancelled: {}, status: {} });

export const QUEUE_STATUS = {
  waiting: { key: 'waiting', label: 'รอตรวจ', style: 'blue' },
  progress: { key: 'progress', label: 'กำลังตรวจ', style: 'orange' },
  done: { key: 'done', label: 'ตรวจเสร็จแล้ว', style: 'teal' },
  draft: { key: 'draft', label: 'ที่ร่างไว้', style: 'grey' },
};

const decorateQueueRow = (row) => {
  const student = getStudentById(row.studentId);
  if (!student) return null;
  const overlay = queueOverlay();
  const draftIds = getDraftStudentIds();
  const statusKey = overlay.status?.[row.studentId] || row.statusKey;
  return {
    ...row,
    ...student,
    id: `q-${row.studentId}`,
    statusKey: draftIds.includes(row.studentId) && statusKey !== 'done' ? 'draft' : statusKey,
    serviceLabel: serviceTypeLabel(row.serviceType),
    cancellation: overlay.cancelled?.[row.studentId] || null,
  };
};

export const getQueueRows = () => {
  const overlay = queueOverlay();
  const extra = (overlay.checkedIn || []).map((s, i) => ({
    studentId: s.studentId,
    queue: `SC-1${String(i + 1).padStart(2, '0')}`,
    arriveAt: s.at,
    serviceType: s.serviceType,
    statusKey: 'waiting',
    room: 'ห้องพยาบาลโรงเรียน',
  }));
  return [...QUEUE_SEED, ...extra].map(decorateQueueRow).filter(Boolean);
};

export const getScheduledNotArrived = () => {
  const overlay = queueOverlay();
  const checkedIds = (overlay.checkedIn || []).map((s) => s.studentId);
  return SCHEDULED_SEED
    .filter((s) => !checkedIds.includes(s.studentId))
    .map((s) => {
      const student = getStudentById(s.studentId);
      if (!student) return null;
      return { ...s, ...student, id: `sch-${s.studentId}`, serviceLabel: serviceTypeLabel(s.serviceType) };
    })
    .filter(Boolean);
};

export const checkInStudent = (studentId, serviceType = 'checkup') => {
  const overlay = queueOverlay();
  const now = new Date();
  overlay.checkedIn = [
    ...(overlay.checkedIn || []).filter((s) => s.studentId !== studentId),
    { studentId, serviceType, at: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` },
  ];
  writeJson(SH_KEYS.queue, overlay);
};

export const setQueueStatus = (studentId, statusKey) => {
  const overlay = queueOverlay();
  overlay.status = { ...(overlay.status || {}), [studentId]: statusKey };
  writeJson(SH_KEYS.queue, overlay);
};

export const cancelQueue = (studentId, reason) => {
  const overlay = queueOverlay();
  overlay.cancelled = { ...(overlay.cancelled || {}), [studentId]: { reason, ...auditStamp() } };
  writeJson(SH_KEYS.queue, overlay);
};

export const restoreQueue = (studentId) => {
  const overlay = queueOverlay();
  const next = { ...(overlay.cancelled || {}) };
  delete next[studentId];
  overlay.cancelled = next;
  writeJson(SH_KEYS.queue, overlay);
};

/* ── Batch entry วัคซีน / ทันตกรรม / ตรวจสุขภาพ รายห้อง (§3.3.7) ──── */

export const BATCH_MODES = [
  { value: 'vaccine', label: 'ให้บริการวัคซีน', icon: 'vaccines' },
  { value: 'dental', label: 'ตรวจทันตกรรมทั้งห้อง', icon: 'dentistry' },
  { value: 'checkup', label: 'ชั่งน้ำหนัก/วัดส่วนสูงทั้งห้อง', icon: 'monitor_weight' },
];

export const getBatchLog = () => readJson(SH_KEYS.batches, []);

/**
 * บันทึกทั้งชุด — สร้าง service record รายคน แนบผู้บันทึกเดียวกันทุกแถว
 * และตัดสต็อกตาม Lot ที่ใช้จริง (mock: บันทึกจำนวนที่ใช้ลง batch log)
 */
export const saveBatchVaccine = ({ mode, schoolId, grade, roomId, vaccineId, lotNo, date, rows, note }) => {
  const stamp = auditStamp();
  const overlay = serviceOverlay();
  const given = rows.filter((r) => r.given);
  given.forEach((r) => {
    const id = `svc-batch-${r.studentId}-${vaccineId || mode}-${nextRunNo(SH_KEYS.serviceRun)}`;
    /* Batch ชั่งน้ำหนัก/วัดส่วนสูง — แปลผล BMI for Age ให้เหมือนบันทึกรายคน
       เพื่อให้ Dashboard และรายงาน §3.6.2 นับแถวนี้ได้ทันที */
    const student = getStudentById(r.studentId);
    const nutrition = mode === 'checkup' && student
      ? evaluateNutrition({
        sex: student.sex, birthDate: student.birthDate, measuredAt: date,
        weightKg: r.weightKg, heightCm: r.heightCm,
      })
      : null;
    overlay[id] = {
      id,
      studentId: r.studentId,
      type: mode === 'vaccine' ? 'vaccineGive' : mode,
      date,
      academicYear: CURRENT_ACADEMIC_YEAR,
      term: CURRENT_TERM,
      vaccineId: mode === 'vaccine' ? vaccineId : undefined,
      lotNo: mode === 'vaccine' ? lotNo : undefined,
      batch: true,
      weightKg: r.weightKg,
      heightCm: r.heightCm,
      bmi: nutrition?.bmi ?? undefined,
      nutritionKey: nutrition ? (nutrition.outOfRange ? 'out-of-range' : nutrition.key) : undefined,
      decayedPermanent: r.decayed,
      needTreatment: mode === 'dental' ? Number(r.decayed) > 0 : undefined,
      note: note || '',
      recordedBy: stamp.by,
      position: stamp.position,
      recordedAt: stamp.at,
      status: 'saved',
      editHistory: [{ action: 'create-batch', ...stamp }],
    };
  });
  writeJson(SH_KEYS.services, overlay);

  const entry = {
    id: `batch-${nextRunNo(SH_KEYS.serviceRun)}`,
    mode,
    schoolId,
    schoolName: getSchoolById(schoolId)?.name || '—',
    grade,
    gradeName: gradeLabel(grade),
    roomId,
    roomName: getClassroomById(roomId)?.name || '—',
    vaccineId,
    vaccineName: vaccineId ? (getVaccineById(vaccineId)?.nameTh || vaccineId) : '',
    lotNo,
    date,
    givenCount: given.length,
    notGivenCount: rows.length - given.length,
    reasons: rows.filter((r) => !r.given && r.reason).map((r) => ({ studentId: r.studentId, reason: r.reason })),
    ...stamp,
  };
  writeJson(SH_KEYS.batches, [entry, ...getBatchLog()]);
  return entry;
};

/** โดสที่ถูกใช้ไปแล้วจาก lot นี้ใน session — ใช้ตรวจสต็อกก่อนบันทึก */
export const lotUsedInSession = (lotNo) =>
  getBatchLog()
    .filter((b) => b.lotNo === lotNo)
    .reduce((sum, b) => sum + (b.givenCount || 0), 0);

export const lotRemaining = (vaccineId, lotNo) => {
  const lot = getVaccineLots(vaccineId).find((l) => l.lotNo === lotNo);
  if (!lot) return null;
  return Math.max(0, lot.remaining - lotUsedInSession(lotNo));
};

/** ตรวจ Lot ก่อนบันทึก — คืนข้อความ error (blocking) หรือ null */
export const validateLot = (vaccineId, lotNo, needed) => {
  if (!lotNo) return 'กรุณาเลือก Lot No. ของวัคซีนก่อนบันทึก';
  const lot = getVaccineLots(vaccineId).find((l) => l.lotNo === lotNo);
  if (!lot) return 'ไม่พบ Lot No. นี้ในคลังวัคซีนของศูนย์ฯ';
  if (isLotExpired(lot.expiry)) return `Lot ${lot.lotNo} หมดอายุแล้ว — ห้ามใช้และห้ามบันทึก`;
  const remaining = lotRemaining(vaccineId, lotNo);
  if (needed > remaining) {
    return `Lot ${lot.lotNo} คงเหลือ ${remaining} โดส ไม่พอกับที่ติ๊กไว้ ${needed} คน — เลือก Lot อื่นหรือลดจำนวน`;
  }
  return null;
};

export const describeLot = (vaccineId, lotNo) => {
  const lot = getVaccineLots(vaccineId).find((l) => l.lotNo === lotNo);
  if (!lot) return null;
  return { ...lot, remaining: lotRemaining(vaccineId, lotNo), warning: resolveLotWarning(lot) };
};

/* ── ส่งต่อเข้ารับบริการที่ศูนย์ฯ ผ่าน PHCIS (§3.4.4) ──────────────── */

export const getReferrals = (studentId) => {
  const all = readJson(SH_KEYS.referrals, []);
  return studentId ? all.filter((r) => r.studentId === studentId) : all;
};

export const hasOpenReferral = (studentId) =>
  getReferrals(studentId).some((r) => r.status === 'referred');

export const referStudent = (studentId, payload) => {
  const all = readJson(SH_KEYS.referrals, []);
  const entry = {
    id: `ref-${nextRunNo(SH_KEYS.serviceRun)}`,
    studentId,
    ...payload,
    status: 'referred',
    ...auditStamp(),
  };
  writeJson(SH_KEYS.referrals, [entry, ...all]);
  return entry;
};

export const cancelReferral = (id, reason) => {
  const all = readJson(SH_KEYS.referrals, []);
  const next = all.map((r) => (r.id === id
    ? { ...r, status: 'cancelled', cancellation: { reason, ...auditStamp() } }
    : r));
  writeJson(SH_KEYS.referrals, next);
  return next.find((r) => r.id === id) || null;
};

/* ── แผง AI ระบุปัญหาสุขภาพ (§3.3.3 — rule-based mock) ────────────── */

export const buildAiHealthProblems = (student) => {
  if (!student) return [];
  const problems = [];
  const checkup = getLatestService(student.id, 'checkup');
  const dental = getLatestService(student.id, 'dental');
  const dev = getLatestService(student.id, 'development');
  const mh = getLatestService(student.id, 'mental');

  if (checkup && checkup.status !== 'cancelled') {
    const band = nutritionBand(checkup.nutritionKey);
    if (band && ['over', 'obese'].includes(checkup.nutritionKey)) {
      problems.push({
        key: 'obesity',
        tone: 'danger',
        icon: 'monitor_weight',
        title: `ภาวะโภชนาการเกินเกณฑ์ — ${band.label}`,
        detail: `BMI ${checkup.bmi} จากการตรวจวันที่ ${checkup.date} · ควรเข้าโปรแกรมคัดกรองภาวะอ้วนและติดตามทุก 3 เดือน`,
        action: 'เปิดแท็บตรวจสุขภาพเพื่อบันทึกแผนคัดกรองภาวะอ้วน',
      });
    }
    if (band && ['thin', 'riskThin'].includes(checkup.nutritionKey)) {
      problems.push({
        key: 'underweight',
        tone: 'warning',
        icon: 'trending_down',
        title: `ภาวะโภชนาการต่ำกว่าเกณฑ์ — ${band.label}`,
        detail: `BMI ${checkup.bmi} · ควรประเมินการรับประทานอาหารและติดตามน้ำหนักทุกเดือน`,
        action: 'พิจารณาส่งต่อคลินิกโภชนาการที่ศูนย์ฯ',
      });
    }
    if (checkup.vision && checkup.vision !== 'normal') {
      problems.push({
        key: 'vision',
        tone: 'warning',
        icon: 'visibility',
        title: `พบความผิดปกติด้านสายตา — ${optionLabel(VISION_RESULTS, checkup.vision)}`,
        detail: checkup.visionNote || 'ผลตรวจสายตาไม่ผ่านเกณฑ์',
        action: 'ส่งต่อจักษุแพทย์ผ่าน PHCIS',
      });
    }
    if (checkup.lice && checkup.lice !== 'none') {
      problems.push({
        key: 'lice',
        tone: 'warning',
        icon: 'pest_control',
        title: `พบเหา — ${optionLabel(LICE_RESULTS, checkup.lice)}`,
        detail: 'ควรให้ยากำจัดเหาและแจ้งผู้ปกครอง พร้อมตรวจซ้ำทั้งห้องใน 7 วัน',
        action: 'บันทึกการให้ยาในแท็บตรวจสุขภาพ',
      });
    }
    if (checkup.anemiaKey && checkup.anemiaKey !== 'normal') {
      problems.push({
        key: 'anemia',
        tone: 'danger',
        icon: 'water_drop',
        title: 'ผลคัดกรองภาวะซีดผิดปกติ',
        detail: `Hct ${checkup.hct}% · ต่ำกว่าเกณฑ์ ควรได้รับยาเสริมธาตุเหล็กและตรวจซ้ำใน 1 เดือน`,
        action: 'ส่งต่อเข้ารับบริการที่ศูนย์ฯ',
      });
    }
  }
  if (dental && dental.status !== 'cancelled' && dental.needTreatment && !dental.treatmentDone) {
    problems.push({
      key: 'dental',
      tone: 'warning',
      icon: 'dentistry',
      title: 'มีฟันผุที่ยังไม่ได้รับการรักษา',
      detail: `ฟันผุ ${Number(dental.decayedPrimary || 0) + Number(dental.decayedPermanent || 0)} ซี่ จากการตรวจวันที่ ${dental.date}`,
      action: 'นัดหน่วยทันตกรรมเคลื่อนที่ หรือส่งต่อคลินิกทันตกรรม',
    });
  }
  if (dev && dev.status !== 'cancelled' && dev.result !== 'normal') {
    problems.push({
      key: 'development',
      tone: 'warning',
      icon: 'child_care',
      title: `พัฒนาการ — ${optionLabel(DEV_RESULTS, dev.result)}`,
      detail: dev.note,
      action: 'นัดประเมินซ้ำและแจ้งครูประจำชั้น',
    });
  }
  if (mh && mh.status !== 'cancelled' && mh.result !== 'normal') {
    problems.push({
      key: 'mental',
      tone: 'danger',
      icon: 'psychology',
      title: `สุขภาพจิต — ${optionLabel(MENTAL_RESULTS, mh.result)}`,
      detail: `คะแนน ${mh.score} จากแบบประเมิน ${mh.tool}`,
      action: 'ส่งต่อคลินิกสุขภาพจิต ศบส.',
    });
  }
  const missing = getMissingVaccines(student);
  if (missing.length > 0) {
    problems.push({
      key: 'vaccine',
      tone: 'warning',
      icon: 'vaccines',
      title: `วัคซีนตามระดับชั้นยังไม่ครบ (${missing.length} รายการ)`,
      detail: missing.map((m) => m.doseLabel).join(' · '),
      action: 'ส่งเข้าหน้าเก็บตกวัคซีนรายห้อง',
    });
  }
  if (student.rightType === 'none' || student.rightExpired) {
    problems.push({
      key: 'rights',
      tone: 'info',
      icon: 'badge',
      title: student.rightType === 'none' ? 'ยังไม่มีสิทธิการรักษา' : 'สิทธิการรักษาหมดอายุ',
      detail: 'ตรวจสอบสิทธิพื้นฐานด้านสุขภาพก่อนส่งต่อเข้ารับบริการที่ศูนย์ฯ (บันทึกบริการอนามัยโรงเรียนได้ตามปกติ)',
      action: 'ประสานงานทะเบียนเพื่อขึ้นทะเบียนสิทธิ',
    });
  }
  return problems;
};

/* ── ความครบถ้วนวัคซีนตามระดับชั้น ────────────────────────────────── */

export const getMissingVaccines = (student) => {
  if (!student) return [];
  const plan = getVaccineScheduleForGrade(student.grade);
  if (plan.length === 0) return [];
  const received = getStudentServices(student.id)
    .filter((r) => (r.type === 'vaccineHistory' || r.type === 'vaccineGive') && r.status !== 'cancelled')
    .map((r) => r.vaccineId);
  return plan.filter((p) => {
    if (p.femaleOnly && student.sex !== 'หญิง') return false;
    return !received.includes(p.vaccineId);
  });
};

/** เมทริกซ์ความครบถ้วนวัคซีน — ป้อน EpiScheduleMatrix ไม่ได้ จึงทำตารางเอง */
export const getVaccineMatrix = (student) => {
  if (!student) return [];
  const history = getStudentServices(student.id)
    .filter((r) => (r.type === 'vaccineHistory' || r.type === 'vaccineGive') && r.status !== 'cancelled');
  const byVaccine = new Map();
  history.forEach((r) => {
    const list = byVaccine.get(r.vaccineId) || [];
    list.push(r);
    byVaccine.set(r.vaccineId, list);
  });
  const planIds = getVaccineScheduleForGrade(student.grade).map((p) => p.vaccineId);
  const ids = [...new Set([...byVaccine.keys(), ...planIds])];
  return ids.map((id) => {
    const vaccine = getVaccineById(id);
    const doses = (byVaccine.get(id) || []).sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const planned = planIds.includes(id);
    return {
      id,
      vaccineId: id,
      abbr: vaccine?.abbr || id,
      code: vaccine?.code || '—',
      nameTh: vaccine?.nameTh || '—',
      doses,
      lastDate: doses.length ? doses[doses.length - 1].date : null,
      planned,
      complete: doses.length > 0,
    };
  }).sort((a, b) => a.abbr.localeCompare(b.abbr));
};

/* ── Dashboard (§3.4.3) ───────────────────────────────────────────── */

/** ผลตรวจ "รอบปีการศึกษาปัจจุบัน" — ใช้ตัดสินว่าได้รับบริการตามรอบแล้วหรือยัง
 *  (ต่างจาก getLatestService ที่คืนผลล่าสุดไม่ว่าปีไหน) */
const latestCheckupMap = (academicYear = CURRENT_ACADEMIC_YEAR) => {
  const map = new Map();
  getAllServices()
    .filter((r) => r.type === 'checkup'
      && r.status !== 'cancelled'
      && (!academicYear || String(r.academicYear) === String(academicYear)))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .forEach((r) => map.set(r.studentId, r));
  return map;
};

/** ผ่านเกณฑ์ = โภชนาการสมส่วน + สายตาปกติ + ไม่พบเหา + ไม่ซีด + วัคซีนครบ */
export const evaluatePass = (student, checkup) => {
  if (!checkup) return { pass: false, reasons: ['ยังไม่ได้รับการตรวจสุขภาพในรอบนี้'] };
  const reasons = [];
  if (checkup.nutritionKey && OFF_TARGET_BANDS.includes(checkup.nutritionKey)) {
    reasons.push(`โภชนาการ ${nutritionBand(checkup.nutritionKey)?.label || '—'}`);
  }
  if (checkup.vision && checkup.vision !== 'normal') reasons.push('สายตาผิดปกติ');
  if (checkup.lice && checkup.lice !== 'none') reasons.push('พบเหา');
  if (checkup.anemiaKey && checkup.anemiaKey !== 'normal') reasons.push('ภาวะซีด');
  if (getMissingVaccines(student).length > 0) reasons.push('วัคซีนตามระดับชั้นไม่ครบ');
  return { pass: reasons.length === 0, reasons };
};

export const getDashboardData = ({
  schoolId = 'all', grade = 'all', roomId = 'all', academicYear = CURRENT_ACADEMIC_YEAR,
} = {}) => {
  const checkups = latestCheckupMap(academicYear);
  const students = getActiveStudents().filter((st) =>
    (schoolId === 'all' || st.schoolId === schoolId)
    && (grade === 'all' || st.grade === grade)
    && (roomId === 'all' || st.roomId === roomId));

  const rows = students.map((st) => {
    const checkup = checkups.get(st.id) || null;
    const { pass, reasons } = evaluatePass(st, checkup);
    return { student: st, checkup, pass, reasons, missingVaccines: getMissingVaccines(st) };
  });

  const total = rows.length;
  const passed = rows.filter((r) => r.pass).length;
  const failed = rows.filter((r) => !r.pass && r.checkup).length;
  const notServed = rows.filter((r) => !r.checkup).length;

  /* drill-down รายโรงเรียน */
  const bySchool = getActiveSchools()
    .filter((s) => schoolId === 'all' || s.id === schoolId)
    .map((school) => {
      const scoped = rows.filter((r) => r.student.schoolId === school.id);
      const withCheckup = scoped.filter((r) => r.checkup);
      const offTarget = withCheckup.filter((r) => OFF_TARGET_BANDS.includes(r.checkup.nutritionKey)).length;
      const visionAbn = withCheckup.filter((r) => r.checkup.vision !== 'normal').length;
      const anemic = withCheckup.filter((r) => r.checkup.anemiaKey && r.checkup.anemiaKey !== 'normal').length;
      const liceFound = withCheckup.filter((r) => r.checkup.lice !== 'none').length;
      const devDelay = scoped.filter((r) => {
        const dev = getLatestService(r.student.id, 'development');
        return dev && dev.status !== 'cancelled' && dev.result !== 'normal';
      }).length;
      const vaccineComplete = scoped.filter((r) => r.missingVaccines.length === 0).length;
      return {
        id: school.id,
        schoolName: school.name,
        total: scoped.length,
        served: withCheckup.length,
        coverage: pct(withCheckup.length, scoped.length),
        vaccineCoverage: pct(vaccineComplete, scoped.length),
        offTarget,
        visionAbn,
        anemic,
        liceFound,
        devDelay,
        passed: scoped.filter((r) => r.pass).length,
        failed: scoped.filter((r) => !r.pass && r.checkup).length,
      };
    })
    .filter((r) => r.total > 0);

  /* worklist "เก็บตก" — ยังไม่ได้รับบริการตามรอบ หรือวัคซีนไม่ครบ */
  const followUp = rows
    .filter((r) => !r.checkup || r.missingVaccines.length > 0)
    .map((r) => ({
      id: r.student.id,
      ...r.student,
      pending: [
        !r.checkup ? 'ยังไม่ได้ตรวจสุขภาพรอบนี้' : null,
        r.missingVaccines.length > 0 ? `วัคซีนค้าง ${r.missingVaccines.length} รายการ` : null,
      ].filter(Boolean).join(' · '),
      missingVaccines: r.missingVaccines,
    }));

  return { rows, total, passed, failed, notServed, bySchool, followUp };
};

/* ── ตัวเลขตั้งต้นของรายงาน §3.6 ──────────────────────────────────── */

export const getReportDataset = ({ schoolId = 'all', grade = 'all', dateFrom, dateTo } = {}) => {
  const inRange = (iso) => {
    if (!iso) return false;
    if (dateFrom && iso < dateFrom) return false;
    if (dateTo && iso > dateTo) return false;
    return true;
  };
  const students = getStudentRows();
  const byId = new Map(students.map((st) => [st.id, st]));
  const scoped = (r) => {
    const st = byId.get(r.studentId);
    if (!st) return false;
    if (schoolId !== 'all' && st.schoolId !== schoolId) return false;
    if (grade !== 'all' && st.grade !== grade) return false;
    return true;
  };
  const services = getAllServices().filter((r) => r.status !== 'cancelled' && scoped(r));

  const checkups = services.filter((r) => r.type === 'checkup' && inRange(r.date));
  const dental = services.filter((r) => r.type === 'dental' && inRange(r.date));
  const vaccines = services.filter((r) => (r.type === 'vaccineGive' || r.type === 'vaccineHistory') && inRange(r.date));
  const development = services.filter((r) => r.type === 'development' && inRange(r.date));
  const mental = services.filter((r) => r.type === 'mental' && inRange(r.date));

  const withStudent = (rows) => rows.map((r) => {
    const st = byId.get(r.studentId) || {};
    return {
      ...r,
      _iso: r.date,
      studentName: st.fullName || '—',
      hn: st.hn || '—',
      schoolName: st.schoolName || '—',
      gradeName: st.gradeName || '—',
      roomName: st.roomName || '—',
      sex: st.sex || '—',
    };
  });

  return {
    checkups: withStudent(checkups),
    dental: withStudent(dental),
    vaccines: withStudent(vaccines).map((r) => ({
      ...r,
      vaccineName: getVaccineById(r.vaccineId)?.nameTh || '—',
      vaccineAbbr: getVaccineById(r.vaccineId)?.abbr || '—',
    })),
    development: withStudent(development),
    mental: withStudent(mental),
    students,
  };
};

/** สรุปภาวะโภชนาการต่อแถบ (§3.6.2) */
export const summarizeNutrition = (checkups) => {
  const map = new Map();
  checkups.forEach((r) => {
    if (!r.nutritionKey || r.nutritionKey === 'out-of-range') return;
    map.set(r.nutritionKey, (map.get(r.nutritionKey) || 0) + 1);
  });
  return map;
};

export const summarizeBy = (rows, keyFn) => {
  const map = new Map();
  rows.forEach((r) => {
    const k = keyFn(r);
    if (k == null || k === '') return;
    map.set(k, (map.get(k) || 0) + 1);
  });
  return map;
};

/* ── การพิมพ์บัตรสรุปสุขภาพรายคน ──────────────────────────────────── */

export const logPrint = (studentId, docType) => {
  const log = readJson(SH_KEYS.printLog, []);
  const entry = { studentId, docType, ...auditStamp() };
  writeJson(SH_KEYS.printLog, [entry, ...log]);
  return entry;
};

export const getPrintLog = (studentId) =>
  readJson(SH_KEYS.printLog, []).filter((r) => !studentId || r.studentId === studentId);

/* ── ตัวช่วยที่หน้าเพจใช้ร่วมกัน ──────────────────────────────────── */

export const roomOptionsFor = (schoolId, grade) => [
  { value: 'all', label: 'ทุกห้อง' },
  ...getClassrooms(schoolId)
    .filter((r) => grade === 'all' || !grade || r.grade === grade)
    .map((r) => ({ value: r.id, label: r.name })),
];

export const rosterWithLastService = (schoolId, grade, roomId, type) =>
  getClassRoster(schoolId, grade, roomId).map((st) => ({
    ...st,
    lastService: getLatestService(st.id, type),
    missingVaccines: getMissingVaccines(st),
  }));

export const nextRoundDate = () => addDaysIso(todayIso(), 7);
