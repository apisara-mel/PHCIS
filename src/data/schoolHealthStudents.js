/* schoolHealthStudents.js — ทะเบียนนักเรียน (TOR §3.2.1–3.2.3, §3.3.1)

   ยึดโครงฟอร์มคู่มือ HCIS §2.3 "บันทึกข้อมูลนักเรียน":
     โรงเรียน → ชั้นเรียน → ห้องเรียน → ภาคเรียน/ปีการศึกษา/วันที่ตรวจ
     + ข้อมูลส่วนตัว + ผู้ปกครอง + สิทธิการรักษา + โรคประจำตัว/ยาที่ใช้ประจำ
   และ §2.3.1 "นำเข้าข้อมูลนักเรียน" (upload ไฟล์ → preview → บันทึก)

   เพิ่มจากมติ คทง.5: ปุ่ม "เลื่อนชั้นอัตโนมัติ" ประจำปีการศึกษา
   พร้อม preview + กันกดซ้ำในปีเดียวกัน (idempotent) */

import {
  SH_KEYS, readJson, writeJson, nextRunNo, auditStamp,
  CURRENT_ACADEMIC_YEAR, gradeLabel, gradeOrder, nextGrade,
  STUDENT_STATUS, todayIso, ageYearsAt,
} from '@/data/schoolHealthCore';
import { getSchoolById, getClassrooms, getClassroomById } from '@/data/schoolHealthSchools';

/* ── ตัวเลือกอ้างอิง ──────────────────────────────────────────────── */

export const PREFIXES = [
  { value: 'ด.ช.', label: 'ด.ช.' },
  { value: 'ด.ญ.', label: 'ด.ญ.' },
  { value: 'นาย', label: 'นาย' },
  { value: 'นางสาว', label: 'นางสาว' },
];

export const SEX_OPTIONS = [
  { value: 'ชาย', label: 'ชาย' },
  { value: 'หญิง', label: 'หญิง' },
];

export const BLOOD_TYPES = ['A', 'B', 'AB', 'O', 'ไม่ทราบ'].map((v) => ({ value: v, label: v }));

export const RELIGIONS = ['พุทธ', 'อิสลาม', 'คริสต์', 'อื่น ๆ'].map((v) => ({ value: v, label: v }));

export const GUARDIAN_RELATIONS = [
  { value: 'father', label: 'บิดา' },
  { value: 'mother', label: 'มารดา' },
  { value: 'grandparent', label: 'ปู่/ย่า/ตา/ยาย' },
  { value: 'relative', label: 'ญาติ' },
  { value: 'other', label: 'ผู้ปกครองอื่น' },
];

export const guardianRelationLabel = (v) =>
  GUARDIAN_RELATIONS.find((r) => r.value === v)?.label || '—';

/** สิทธิพื้นฐานด้านสุขภาพ (TOR §3.3.2) */
export const RIGHT_TYPES = [
  { value: 'uc', label: 'สิทธิหลักประกันสุขภาพแห่งชาติ (บัตรทอง)', style: 'teal' },
  { value: 'ucs-school', label: 'สิทธิ สปสช. กลุ่มนักเรียน', style: 'teal' },
  { value: 'ssos', label: 'สิทธิประกันสังคม (ผู้ปกครอง)', style: 'indigo' },
  { value: 'ofc', label: 'สิทธิข้าราชการ/รัฐวิสาหกิจ (ผู้ปกครอง)', style: 'indigo' },
  { value: 'foreign', label: 'บุคคลที่มีปัญหาสถานะและสิทธิ', style: 'yellow' },
  { value: 'none', label: 'ไม่มีสิทธิ / รอตรวจสอบ', style: 'red' },
];

export const rightLabel = (v) => RIGHT_TYPES.find((r) => r.value === v)?.label || '—';
export const rightStyle = (v) => RIGHT_TYPES.find((r) => r.value === v)?.style || 'grey';

/* ── นักเรียน (base) ──────────────────────────────────────────────── */

const s = (o) => ({
  citizenId: '',
  address: '1 ถนนสุขุมวิท แขวงพระโขนงเหนือ เขตวัฒนา กรุงเทพมหานคร 10110',
  bloodType: 'ไม่ทราบ',
  religion: 'พุทธ',
  race: 'ไทย',
  nationality: 'ไทย',
  guardianRelation: 'mother',
  rightType: 'ucs-school',
  rightExpiry: '2027-03-31',
  chronicDiseases: [],
  regularMeds: '',
  allergies: [],
  confidential: false,
  status: 'active',
  academicYear: CURRENT_ACADEMIC_YEAR,
  ...o,
});

const BASE_STUDENTS = [
  /* ── โรงเรียนวัดธาตุทอง · ป.1/1 (กลุ่มเก็บตกวัคซีน ป.1) ── */
  s({ id: 'stu-0001', studentNo: '01', hn: '69-20001', prefix: 'ด.ช.', firstName: 'ปุณณวิช', lastName: 'สายทอง', sex: 'ชาย', birthDate: '2019-04-12', schoolId: 'sch-wtt', grade: 'p1', roomId: 'rm-wtt-p1-1', guardianName: 'นางสาวจุฑามาศ สายทอง', guardianPhone: '081-234-5678', citizenId: '1100701234561' }),
  s({ id: 'stu-0002', studentNo: '02', hn: '69-20002', prefix: 'ด.ญ.', firstName: 'ณิชาภัทร', lastName: 'พงศ์เจริญ', sex: 'หญิง', birthDate: '2019-06-30', schoolId: 'sch-wtt', grade: 'p1', roomId: 'rm-wtt-p1-1', guardianName: 'นายอนุชา พงศ์เจริญ', guardianRelation: 'father', guardianPhone: '089-112-3344', citizenId: '1100701234562', chronicDiseases: ['หืด (Asthma)'], regularMeds: 'Salbutamol MDI พ่นเวลามีอาการ' }),
  s({ id: 'stu-0003', studentNo: '03', hn: '69-20003', prefix: 'ด.ช.', firstName: 'ธีรเดช', lastName: 'มั่นคง', sex: 'ชาย', birthDate: '2019-01-25', schoolId: 'sch-wtt', grade: 'p1', roomId: 'rm-wtt-p1-1', guardianName: 'นางวิภา มั่นคง', guardianPhone: '086-556-7788', citizenId: '1100701234563', allergies: ['Amoxicillin (ผื่นลมพิษ)'] }),
  s({ id: 'stu-0004', studentNo: '04', hn: '69-20004', prefix: 'ด.ญ.', firstName: 'พิมพ์ลภัส', lastName: 'อารีย์', sex: 'หญิง', birthDate: '2019-09-08', schoolId: 'sch-wtt', grade: 'p1', roomId: 'rm-wtt-p1-1', guardianName: 'นางสาวเนตรนภา อารีย์', guardianPhone: '090-887-1212', citizenId: '1100701234564' }),
  s({ id: 'stu-0005', studentNo: '05', hn: '69-20005', prefix: 'ด.ช.', firstName: 'กันตพงศ์', lastName: 'ใจงาม', sex: 'ชาย', birthDate: '2019-11-19', schoolId: 'sch-wtt', grade: 'p1', roomId: 'rm-wtt-p1-1', guardianName: 'นายสมชาย ใจงาม', guardianRelation: 'father', guardianPhone: '083-441-9090', citizenId: '1100701234565', rightType: 'none', rightExpiry: '' }),

  /* ── โรงเรียนวัดธาตุทอง · ป.3/1 (กลุ่มคัดกรองซีดหญิง + โภชนาการ) ── */
  s({ id: 'stu-0011', studentNo: '01', hn: '69-20011', prefix: 'ด.ญ.', firstName: 'ชนัญชิดา', lastName: 'วิไลวรรณ', sex: 'หญิง', birthDate: '2017-03-14', schoolId: 'sch-wtt', grade: 'p3', roomId: 'rm-wtt-p3-1', guardianName: 'นางมาลี วิไลวรรณ', guardianPhone: '084-223-5566', citizenId: '1100701234571' }),
  s({ id: 'stu-0012', studentNo: '02', hn: '69-20012', prefix: 'ด.ญ.', firstName: 'ปาลิตา', lastName: 'ศรีสุวรรณ', sex: 'หญิง', birthDate: '2017-07-02', schoolId: 'sch-wtt', grade: 'p3', roomId: 'rm-wtt-p3-1', guardianName: 'นางสาวรุ่งทิพย์ ศรีสุวรรณ', guardianPhone: '087-330-2211', citizenId: '1100701234572' }),
  s({ id: 'stu-0013', studentNo: '03', hn: '69-20013', prefix: 'ด.ญ.', firstName: 'อริสรา', lastName: 'บุญเลิศ', sex: 'หญิง', birthDate: '2017-10-21', schoolId: 'sch-wtt', grade: 'p3', roomId: 'rm-wtt-p3-1', guardianName: 'นายประเสริฐ บุญเลิศ', guardianRelation: 'father', guardianPhone: '081-909-4433', citizenId: '1100701234573', confidential: true }),
  s({ id: 'stu-0014', studentNo: '04', hn: '69-20014', prefix: 'ด.ช.', firstName: 'ภูริภัทร', lastName: 'แก้วประเสริฐ', sex: 'ชาย', birthDate: '2017-05-09', schoolId: 'sch-wtt', grade: 'p3', roomId: 'rm-wtt-p3-1', guardianName: 'นางอรทัย แก้วประเสริฐ', guardianPhone: '082-556-1188', citizenId: '1100701234574' }),
  s({ id: 'stu-0015', studentNo: '05', hn: '69-20015', prefix: 'ด.ช.', firstName: 'ณัฐวุฒิ', lastName: 'พันธุ์ทอง', sex: 'ชาย', birthDate: '2017-12-01', schoolId: 'sch-wtt', grade: 'p3', roomId: 'rm-wtt-p3-1', guardianName: 'นางสาวสุนิสา พันธุ์ทอง', guardianPhone: '088-771-6655', citizenId: '1100701234575', chronicDiseases: ['ภูมิแพ้อากาศ'] }),

  /* ── โรงเรียนวัดธาตุทอง · ป.6/1 (เตรียมเลื่อนชั้น → จบการศึกษา) ── */
  s({ id: 'stu-0021', studentNo: '01', hn: '69-20021', prefix: 'ด.ช.', firstName: 'ศุภกร', lastName: 'รัตนพงษ์', sex: 'ชาย', birthDate: '2014-02-17', schoolId: 'sch-wtt', grade: 'p6', roomId: 'rm-wtt-p6-1', guardianName: 'นายวีระ รัตนพงษ์', guardianRelation: 'father', guardianPhone: '085-334-7788', citizenId: '1100701234581' }),
  s({ id: 'stu-0022', studentNo: '02', hn: '69-20022', prefix: 'ด.ญ.', firstName: 'กมลชนก', lastName: 'สุขสมบูรณ์', sex: 'หญิง', birthDate: '2014-08-25', schoolId: 'sch-wtt', grade: 'p6', roomId: 'rm-wtt-p6-1', guardianName: 'นางกาญจนา สุขสมบูรณ์', guardianPhone: '086-990-1122', citizenId: '1100701234582' }),
  s({ id: 'stu-0023', studentNo: '03', hn: '69-20023', prefix: 'ด.ช.', firstName: 'อดิเทพ', lastName: 'จันทร์ฉาย', sex: 'ชาย', birthDate: '2014-05-30', schoolId: 'sch-wtt', grade: 'p6', roomId: 'rm-wtt-p6-1', guardianName: 'นางสาวพรพิมล จันทร์ฉาย', guardianPhone: '092-115-3344', citizenId: '1100701234583', rightType: 'ssos', rightExpiry: '2026-09-30' }),

  /* ── โรงเรียนวัดภาษี ── */
  s({ id: 'stu-0031', studentNo: '01', hn: '69-20031', prefix: 'ด.ช.', firstName: 'ปรินทร', lastName: 'เกียรติศักดิ์', sex: 'ชาย', birthDate: '2019-03-03', schoolId: 'sch-wps', grade: 'p1', roomId: 'rm-wps-p1-1', guardianName: 'นางสาวอรสา เกียรติศักดิ์', guardianPhone: '081-556-9900', citizenId: '1100701234591', address: '55/12 ซอยเอกมัย 23 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพมหานคร 10110' }),
  s({ id: 'stu-0032', studentNo: '02', hn: '69-20032', prefix: 'ด.ญ.', firstName: 'ธัญชนก', lastName: 'ภูมิใจ', sex: 'หญิง', birthDate: '2019-07-14', schoolId: 'sch-wps', grade: 'p1', roomId: 'rm-wps-p1-1', guardianName: 'นายกิตติ ภูมิใจ', guardianRelation: 'father', guardianPhone: '089-224-5566', citizenId: '1100701234592', address: '55/40 ซอยเอกมัย 23 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพมหานคร 10110' }),
  s({ id: 'stu-0033', studentNo: '03', hn: '69-20033', prefix: 'ด.ช.', firstName: 'ชยพล', lastName: 'ทวีทรัพย์', sex: 'ชาย', birthDate: '2019-12-05', schoolId: 'sch-wps', grade: 'p1', roomId: 'rm-wps-p1-1', guardianName: 'นางเพ็ญศรี ทวีทรัพย์', guardianRelation: 'grandparent', guardianPhone: '087-118-2233', citizenId: '1100701234593' }),
  s({ id: 'stu-0034', studentNo: '01', hn: '69-20034', prefix: 'ด.ญ.', firstName: 'ศิรประภา', lastName: 'นิลรัตน์', sex: 'หญิง', birthDate: '2017-01-19', schoolId: 'sch-wps', grade: 'p3', roomId: 'rm-wps-p3-1', guardianName: 'นางสาวจิราภรณ์ นิลรัตน์', guardianPhone: '083-667-9911', citizenId: '1100701234594' }),
  s({ id: 'stu-0035', studentNo: '02', hn: '69-20035', prefix: 'ด.ช.', firstName: 'ธนกฤต', lastName: 'อ่อนละมุน', sex: 'ชาย', birthDate: '2017-09-27', schoolId: 'sch-wps', grade: 'p3', roomId: 'rm-wps-p3-1', guardianName: 'นายสุรชัย อ่อนละมุน', guardianRelation: 'father', guardianPhone: '084-880-3311', citizenId: '1100701234595' }),

  /* ── โรงเรียนมัธยมวัดธาตุทอง · ม.2/1 (คัดกรองซีดหญิง ม.2) ── */
  s({ id: 'stu-0041', studentNo: '01', hn: '69-20041', prefix: 'ด.ญ.', firstName: 'ปิยะฉัตร', lastName: 'วงศ์สถิตย์', sex: 'หญิง', birthDate: '2012-04-08', schoolId: 'sch-mwt', grade: 'm2', roomId: 'rm-mwt-m2-1', guardianName: 'นางสุพัตรา วงศ์สถิตย์', guardianPhone: '081-778-2200', citizenId: '1100701234601' }),
  s({ id: 'stu-0042', studentNo: '02', hn: '69-20042', prefix: 'ด.ญ.', firstName: 'ญาณิศา', lastName: 'ตั้งมั่น', sex: 'หญิง', birthDate: '2012-06-21', schoolId: 'sch-mwt', grade: 'm2', roomId: 'rm-mwt-m2-1', guardianName: 'นายเอกชัย ตั้งมั่น', guardianRelation: 'father', guardianPhone: '086-441-7788', citizenId: '1100701234602' }),
  s({ id: 'stu-0043', studentNo: '03', hn: '69-20043', prefix: 'ด.ญ.', firstName: 'ภัทรวดี', lastName: 'ชูศรี', sex: 'หญิง', birthDate: '2012-11-11', schoolId: 'sch-mwt', grade: 'm2', roomId: 'rm-mwt-m2-1', guardianName: 'นางสาวดวงใจ ชูศรี', guardianPhone: '090-330-4455', citizenId: '1100701234603', confidential: true }),
  s({ id: 'stu-0044', studentNo: '04', hn: '69-20044', prefix: 'ด.ญ.', firstName: 'อภิชญา', lastName: 'เรืองแสง', sex: 'หญิง', birthDate: '2012-02-02', schoolId: 'sch-mwt', grade: 'm2', roomId: 'rm-mwt-m2-1', guardianName: 'นางนิภา เรืองแสง', guardianPhone: '082-993-1177', citizenId: '1100701234604' }),
  s({ id: 'stu-0045', studentNo: '05', hn: '69-20045', prefix: 'ด.ช.', firstName: 'กฤตเมธ', lastName: 'สินธุ์ทอง', sex: 'ชาย', birthDate: '2012-08-16', schoolId: 'sch-mwt', grade: 'm2', roomId: 'rm-mwt-m2-1', guardianName: 'นายชูเกียรติ สินธุ์ทอง', guardianRelation: 'father', guardianPhone: '085-220-6677', citizenId: '1100701234605' }),
  s({ id: 'stu-0046', studentNo: '06', hn: '69-20046', prefix: 'ด.ช.', firstName: 'พีรวิชญ์', lastName: 'ก้องเกียรติ', sex: 'ชาย', birthDate: '2012-10-04', schoolId: 'sch-mwt', grade: 'm2', roomId: 'rm-mwt-m2-1', guardianName: 'นางสาวรัชนี ก้องเกียรติ', guardianPhone: '088-556-2200', citizenId: '1100701234606', chronicDiseases: ['เบาหวานชนิดที่ 1'], regularMeds: 'Insulin glargine 12 unit ก่อนนอน' }),

  /* ── โรงเรียนสุเหร่าบ้านดอน · ป.5/1 ── */
  s({ id: 'stu-0051', studentNo: '01', hn: '69-20051', prefix: 'ด.ช.', firstName: 'อารีฟีน', lastName: 'สุไลมาน', sex: 'ชาย', birthDate: '2015-05-12', schoolId: 'sch-sbd', grade: 'p5', roomId: 'rm-sbd-p5-1', guardianName: 'นางฟาตีมะห์ สุไลมาน', guardianPhone: '081-334-9922', citizenId: '1100701234611', religion: 'อิสลาม' }),
  s({ id: 'stu-0052', studentNo: '02', hn: '69-20052', prefix: 'ด.ญ.', firstName: 'นูรฮายาตี', lastName: 'อับดุลเลาะ', sex: 'หญิง', birthDate: '2015-08-30', schoolId: 'sch-sbd', grade: 'p5', roomId: 'rm-sbd-p5-1', guardianName: 'นายฮาซัน อับดุลเลาะ', guardianRelation: 'father', guardianPhone: '086-772-3344', citizenId: '1100701234612', religion: 'อิสลาม' }),
  s({ id: 'stu-0053', studentNo: '03', hn: '69-20053', prefix: 'ด.ช.', firstName: 'อิบรอฮีม', lastName: 'ยูซบ', sex: 'ชาย', birthDate: '2015-01-07', schoolId: 'sch-sbd', grade: 'p5', roomId: 'rm-sbd-p5-1', guardianName: 'นางสาวซารีนา ยูซบ', guardianPhone: '089-441-5566', citizenId: '1100701234613', religion: 'อิสลาม', status: 'transferred', discharge: { reason: 'transferred', note: 'ย้ายตามผู้ปกครองไปจังหวัดสตูล', by: 'พว.ณัฐธิดา บุญมั่น', position: 'พยาบาลวิชาชีพชำนาญการ', at: '2026-07-15T09:20:00' } }),
];

export const EMPTY_STUDENT = {
  id: '',
  studentNo: '',
  hn: '',
  citizenId: '',
  prefix: '',
  firstName: '',
  lastName: '',
  sex: '',
  birthDate: '',
  schoolId: '',
  grade: '',
  roomId: '',
  academicYear: CURRENT_ACADEMIC_YEAR,
  address: '',
  bloodType: 'ไม่ทราบ',
  religion: 'พุทธ',
  race: 'ไทย',
  nationality: 'ไทย',
  guardianName: '',
  guardianRelation: 'mother',
  guardianPhone: '',
  rightType: 'ucs-school',
  rightExpiry: '',
  chronicDiseases: [],
  regularMeds: '',
  allergies: [],
  confidential: false,
  status: 'active',
};

/* ── นักเรียน CRUD ────────────────────────────────────────────────── */

const studentOverlay = () => readJson(SH_KEYS.students, {});

export const decorateStudent = (st) => {
  const school = getSchoolById(st.schoolId);
  const room = getClassroomById(st.roomId);
  return {
    ...st,
    fullName: `${st.prefix || ''}${st.firstName} ${st.lastName}`.trim(),
    schoolName: school?.name || '—',
    gradeName: gradeLabel(st.grade),
    roomName: room?.name || '—',
    teacher: room?.teacher || '—',
    ageYears: ageYearsAt(st.birthDate),
    rightExpired: !!(st.rightExpiry && st.rightExpiry < todayIso()),
    hasRight: st.rightType && st.rightType !== 'none',
  };
};

/** แสดง — base + overlay, decorate ชื่อโรงเรียน/ชั้น/ห้อง/อายุ/สิทธิ */
export const getStudentRows = () => {
  const overlay = studentOverlay();
  const merged = BASE_STUDENTS.map((st) => ({ ...st, ...(overlay[st.id] || {}) }));
  const extras = Object.values(overlay).filter((st) => st?.id && !BASE_STUDENTS.some((b) => b.id === st.id));
  return [...merged, ...extras]
    .map(decorateStudent)
    .sort((a, b) => (a.schoolName.localeCompare(b.schoolName, 'th'))
      || (gradeOrder(a.grade) - gradeOrder(b.grade))
      || String(a.studentNo).localeCompare(String(b.studentNo), 'th', { numeric: true }));
};

export const getStudentById = (id) => getStudentRows().find((st) => st.id === id) || null;

export const getStudentByHn = (hn) => getStudentRows().find((st) => st.hn === hn) || null;

export const getActiveStudents = () => getStudentRows().filter((st) => st.status === 'active');

/** รายชื่อทั้งห้อง (Batch entry / ตารางติ๊กทั้งห้องตามคู่มือ §2.3-5) */
export const getClassRoster = (schoolId, grade, roomId) =>
  getActiveStudents().filter((st) =>
    (!schoolId || schoolId === 'all' || st.schoolId === schoolId)
    && (!grade || grade === 'all' || st.grade === grade)
    && (!roomId || roomId === 'all' || st.roomId === roomId));

export const findStudentDuplicate = (entry) =>
  getStudentRows().find((st) =>
    st.id !== entry.id
    && String(entry.citizenId || '').trim() !== ''
    && String(st.citizenId || '').trim() === String(entry.citizenId).trim())
  || null;

export const saveStudent = (entry) => {
  const overlay = studentOverlay();
  const isNew = !entry.id;
  const id = entry.id || `stu-new-${nextRunNo(SH_KEYS.studentRun)}`;
  const previous = overlay[id] || BASE_STUDENTS.find((st) => st.id === id) || {};
  const saved = {
    ...EMPTY_STUDENT,
    ...previous,
    ...entry,
    id,
    hn: entry.hn || previous.hn || `69-2${nextRunNo(SH_KEYS.studentRun)}`,
    status: entry.status || 'active',
    audit: auditStamp(),
    editHistory: [...(previous.editHistory || []), { action: isNew ? 'create' : 'edit', ...auditStamp() }],
  };
  overlay[id] = saved;
  writeJson(SH_KEYS.students, overlay);
  return { saved: decorateStudent(saved), isNew };
};

/** จำหน่าย/ยกเลิกทะเบียนนักเรียน — soft, ต้องมีเหตุผล */
export const dischargeStudent = (id, { reason, note }) => {
  const overlay = studentOverlay();
  const previous = overlay[id] || BASE_STUDENTS.find((st) => st.id === id);
  if (!previous) return null;
  const status = reason === 'graduated'
    ? 'graduated'
    : reason === 'transferred' || reason === 'moved'
      ? 'transferred'
      : 'cancelled';
  const saved = {
    ...previous,
    status,
    discharge: { reason, note, ...auditStamp() },
    editHistory: [...(previous.editHistory || []), { action: 'discharge', reason, note, ...auditStamp() }],
  };
  overlay[id] = saved;
  writeJson(SH_KEYS.students, overlay);
  return decorateStudent(saved);
};

export const reactivateStudent = (id) => {
  const overlay = studentOverlay();
  const previous = overlay[id] || BASE_STUDENTS.find((st) => st.id === id);
  if (!previous) return null;
  const saved = {
    ...previous,
    status: 'active',
    discharge: null,
    editHistory: [...(previous.editHistory || []), { action: 'reactivate', ...auditStamp() }],
  };
  overlay[id] = saved;
  writeJson(SH_KEYS.students, overlay);
  return decorateStudent(saved);
};

export const studentStatusMeta = (key) => STUDENT_STATUS[key] || STUDENT_STATUS.active;

/* ── นำเข้ารายชื่อจาก Excel (คู่มือ §2.3.1) ───────────────────────── */

export const IMPORT_TEMPLATE_HEADER =
  'เลขที่,คำนำหน้า,ชื่อ,นามสกุล,เพศ,วันเกิด(YYYY-MM-DD),เลขบัตรประชาชน,ชื่อผู้ปกครอง,เบอร์ติดต่อ';

export const IMPORT_SAMPLE_ROWS = [
  '06,ด.ช.,ปวริศ,ทองอยู่,ชาย,2019-02-14,1100701299001,นางสาวสุดา ทองอยู่,081-000-1111',
  '07,ด.ญ.,ณัฐนรี,แสงทอง,หญิง,2019-05-06,1100701299002,นายเอกพงษ์ แสงทอง,082-000-2222',
];

export const isSpreadsheetFile = (name = '') =>
  /\.(csv|txt|xls|xlsx)$/i.test(String(name).trim());

const validCitizenId = (v) => /^\d{13}$/.test(String(v || '').trim());

/** parse + validate — คืนทั้งแถวที่ผ่านและแถวที่ error พร้อมเหตุผล */
export const parseStudentSpreadsheet = (text, existing = []) => {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const body = lines.filter((l) => !l.startsWith('เลขที่') && !/^no\b/i.test(l));
  const seen = new Set();
  const rows = body.map((line, idx) => {
    const cols = line.split(/[,\t]/).map((c) => c.trim());
    const [studentNo, prefix, firstName, lastName, sex, birthDate, citizenId, guardianName, guardianPhone] = cols;
    const errors = [];
    if (!firstName || !lastName) errors.push('ไม่มีชื่อหรือนามสกุล');
    if (!['ชาย', 'หญิง'].includes(sex)) errors.push('เพศต้องเป็น "ชาย" หรือ "หญิง"');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate || '')) errors.push('วันเกิดต้องเป็นรูปแบบ YYYY-MM-DD');
    else if (birthDate > todayIso()) errors.push('วันเกิดเป็นวันในอนาคต');
    if (!validCitizenId(citizenId)) errors.push('เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก');
    else if (seen.has(citizenId)) errors.push('เลขบัตรประชาชนซ้ำกันในไฟล์');
    else if (existing.some((st) => String(st.citizenId || '').trim() === citizenId)) errors.push('เลขบัตรประชาชนซ้ำกับนักเรียนในระบบ');
    if (citizenId) seen.add(citizenId);
    return {
      _line: idx + 1,
      studentNo: studentNo || String(idx + 1).padStart(2, '0'),
      prefix: prefix || (sex === 'หญิง' ? 'ด.ญ.' : 'ด.ช.'),
      firstName: firstName || '',
      lastName: lastName || '',
      sex: sex || '',
      birthDate: birthDate || '',
      citizenId: citizenId || '',
      guardianName: guardianName || '',
      guardianPhone: guardianPhone || '',
      _errors: errors,
      _ok: errors.length === 0,
    };
  });
  return {
    rows,
    valid: rows.filter((r) => r._ok),
    invalid: rows.filter((r) => !r._ok),
  };
};

/** บันทึกเฉพาะแถวที่ผ่าน — แถว error ถูกข้ามและรายงานกลับ */
export const importStudents = (rows, meta) => {
  const accepted = rows.filter((r) => r._ok);
  const saved = accepted.map((r) => saveStudent({
    ...EMPTY_STUDENT,
    studentNo: r.studentNo,
    prefix: r.prefix,
    firstName: r.firstName,
    lastName: r.lastName,
    sex: r.sex,
    birthDate: r.birthDate,
    citizenId: r.citizenId,
    guardianName: r.guardianName,
    guardianPhone: r.guardianPhone,
    schoolId: meta.schoolId,
    grade: meta.grade,
    roomId: meta.roomId,
    academicYear: meta.academicYear,
    address: meta.address || '',
  }).saved);
  return { saved, skipped: rows.length - accepted.length };
};

/* ── เลื่อนชั้นอัตโนมัติประจำปีการศึกษา (มติ คทง.5) ────────────────── */

const promotionLog = () => readJson(SH_KEYS.promotion, []);

export const getPromotionHistory = () => promotionLog();

export const getLastPromotion = (academicYear) =>
  promotionLog().find((p) => p.academicYear === academicYear) || null;

/** ห้องปลายทางของชั้นถัดไป — ห้องเลขเดียวกันถ้ามี ไม่งั้นห้องแรกของชั้นนั้น */
const resolveTargetRoom = (schoolId, targetGrade, currentRoomName) => {
  const rooms = getClassrooms(schoolId).filter((r) => r.grade === targetGrade);
  if (rooms.length === 0) return null;
  const suffix = String(currentRoomName || '').split('/')[1];
  return rooms.find((r) => String(r.name).endsWith(`/${suffix}`)) || rooms[0];
};

/**
 * พรีวิวผลการเลื่อนชั้น — ไม่เขียนข้อมูล
 * @returns {{promoted:Array, graduated:Array, blocked:Array, alreadyRun:Object|null}}
 */
export const previewPromotion = ({ academicYear, schoolId = 'all', excludeIds = [] }) => {
  const alreadyRun = getLastPromotion(academicYear);
  const scope = getActiveStudents().filter((st) =>
    (schoolId === 'all' || st.schoolId === schoolId) && !excludeIds.includes(st.id));
  const promoted = [];
  const graduated = [];
  const blocked = [];
  scope.forEach((st) => {
    const school = getSchoolById(st.schoolId);
    const target = nextGrade(st.grade);
    const offered = school?.levels || [];
    if (!target || !offered.includes(target)) {
      graduated.push({
        ...st,
        toGrade: null,
        toGradeName: 'จำหน่าย — จบการศึกษา',
        toRoomId: null,
        toRoomName: '—',
      });
      return;
    }
    const room = resolveTargetRoom(st.schoolId, target, st.roomName);
    if (!room) {
      blocked.push({
        ...st,
        toGrade: target,
        toGradeName: gradeLabel(target),
        reason: `ยังไม่มีห้องเรียนของชั้น ${gradeLabel(target)} ในทะเบียนโรงเรียน`,
      });
      return;
    }
    promoted.push({
      ...st,
      toGrade: target,
      toGradeName: gradeLabel(target),
      toRoomId: room.id,
      toRoomName: room.name,
    });
  });
  return { promoted, graduated, blocked, alreadyRun };
};

/** ยืนยันเลื่อนชั้น — idempotent ต่อปีการศึกษา (กดซ้ำไม่ทำงาน) */
export const runPromotion = ({ academicYear, schoolId = 'all', excludeIds = [], force = false }) => {
  const log = promotionLog();
  const already = log.find((p) => p.academicYear === academicYear);
  if (already && !force) return { ran: false, already };

  const preview = previewPromotion({ academicYear, schoolId, excludeIds });
  const overlay = studentOverlay();
  preview.promoted.forEach((st) => {
    const previous = overlay[st.id] || BASE_STUDENTS.find((b) => b.id === st.id) || {};
    overlay[st.id] = {
      ...previous,
      grade: st.toGrade,
      roomId: st.toRoomId,
      academicYear,
      editHistory: [...(previous.editHistory || []), { action: 'promote', from: st.grade, to: st.toGrade, academicYear, ...auditStamp() }],
    };
  });
  preview.graduated.forEach((st) => {
    const previous = overlay[st.id] || BASE_STUDENTS.find((b) => b.id === st.id) || {};
    overlay[st.id] = {
      ...previous,
      status: 'graduated',
      discharge: { reason: 'graduated', note: `จบการศึกษาชั้น ${gradeLabel(st.grade)} ปีการศึกษา ${academicYear}`, ...auditStamp() },
      editHistory: [...(previous.editHistory || []), { action: 'graduate', academicYear, ...auditStamp() }],
    };
  });
  writeJson(SH_KEYS.students, overlay);

  const entry = {
    academicYear,
    schoolId,
    promotedCount: preview.promoted.length,
    graduatedCount: preview.graduated.length,
    blockedCount: preview.blocked.length,
    excludedCount: excludeIds.length,
    ...auditStamp(),
  };
  writeJson(SH_KEYS.promotion, [entry, ...log.filter((p) => p.academicYear !== academicYear)]);
  return { ran: true, entry, preview };
};
