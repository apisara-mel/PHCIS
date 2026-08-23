/* schoolHealthSchools.js — ทะเบียนโรงเรียน + โครงสร้างชั้นเรียน/ห้องเรียน
   + กิจกรรมบริการสุขภาพ 5 ด้าน + แผนออกให้บริการ (TOR §3.1.1 / §3.1.2)

   โครงข้อมูลยึดคู่มือ HCIS "ระบบงานสุขภาพนักเรียน" บทที่ 2:
     §2.1 บันทึกข้อมูลพื้นฐานโรงเรียน — รหัสโรงเรียน / ปีการศึกษา / วันที่สำรวจ
          / สังกัด / จำนวนนักเรียนแยกชั้น-เพศ / จำนวนครู
     §2.2 บันทึกข้อมูลกิจกรรมสุขภาพ — ด้านส่งเสริมสุขภาพ · อสร. · ยสร. ·
          ด้านป้องกันควบคุมโรค · ด้านการรักษาพยาบาล
     §2.3-1.3 popup ห้องเรียน + ครูประจำชั้นรายห้อง

   ทุกการแก้ไขระหว่าง session เขียนทับ base ผ่าน overlay ใน sessionStorage
   (ไม่มีการลบจริง — ยกเลิกคือ soft cancel พร้อมเหตุผล + ผู้ทำรายการ) */

import {
  SH_KEYS, readJson, writeJson, nextRunNo, auditStamp,
  CURRENT_ACADEMIC_YEAR, gradeLabel, gradeOrder, GRADE_LEVELS,
  todayIso, addDaysIso, daysBetween, SH_CENTER,
} from '@/data/schoolHealthCore';

/* ── ตัวเลือกอ้างอิง ──────────────────────────────────────────────── */

export const SCHOOL_AFFILIATIONS = [
  { value: 'bma', label: 'สำนักการศึกษา กทม.', style: 'teal' },
  { value: 'obec', label: 'สพฐ. (กระทรวงศึกษาธิการ)', style: 'indigo' },
  { value: 'private', label: 'เอกชน (สช.)', style: 'yellow' },
  { value: 'local', label: 'องค์กรปกครองส่วนท้องถิ่น', style: 'pink' },
];

export const resolveAffiliation = (v) =>
  SCHOOL_AFFILIATIONS.find((a) => a.value === v) || null;

export const affiliationLabel = (v) => resolveAffiliation(v)?.label || '—';

export const SCHOOL_STATUS = {
  active: { key: 'active', label: 'ใช้งาน', style: 'green' },
  cancelled: { key: 'cancelled', label: 'ยกเลิกทะเบียนแล้ว', style: 'red' },
};

/** §2.2 กิจกรรมบริการสุขภาพ 5 ด้าน (vocabulary "กิจกรรม / กิจกรรมย่อย") */
export const SCHOOL_ACTIVITY_TYPES = [
  {
    value: 'promotion',
    label: 'ด้านส่งเสริมสุขภาพ',
    icon: 'volunteer_activism',
    subs: ['การให้สุขศึกษาแก่นักเรียน', 'การส่งเสริมโภชนาการ', 'การส่งเสริมทันตสุขภาพ', 'การออกกำลังกาย'],
  },
  {
    value: 'osr',
    label: 'โครงการอาสาสมัครสาธารณสุขในโรงเรียน (อสร.)',
    icon: 'diversity_3',
    subs: ['อบรม อสร. ใหม่', 'ประชุมติดตามผล อสร.', 'ปฏิบัติกิจกรรมของกลุ่ม อสร.'],
  },
  {
    value: 'ysr',
    label: 'โครงการผู้นำเยาวชนสาธารณสุขในโรงเรียน (ยสร.)',
    icon: 'groups',
    subs: ['อบรม ยสร. ใหม่', 'ประชุมติดตามผล ยสร.', 'ปฏิบัติกิจกรรมของกลุ่ม ยสร.'],
  },
  {
    value: 'prevention',
    label: 'ด้านการป้องกันและควบคุมโรค',
    icon: 'coronavirus',
    subs: ['การสอบสวนโรคในโรงเรียน', 'สำรวจค่าดัชนีลูกน้ำยุงลาย', 'ให้บริการวัคซีนตามระดับชั้น', 'คัดกรองโรคติดต่อ'],
  },
  {
    value: 'treatment',
    label: 'ด้านการรักษาพยาบาล',
    icon: 'medical_services',
    subs: ['ตรวจรักษาเบื้องต้นในโรงเรียน', 'จ่ายยาตามกลุ่มโรคหรืออาการ', 'ส่งต่อเข้ารับบริการที่ศูนย์ฯ'],
  },
];

export const activityTypeLabel = (v) =>
  SCHOOL_ACTIVITY_TYPES.find((t) => t.value === v)?.label || '—';

/* ── ห้องเรียน (base) ─────────────────────────────────────────────── */

const room = (id, schoolId, grade, name, teacher, capacity, male, female) => ({
  id, schoolId, grade, name, teacher, capacity, male, female,
});

const BASE_CLASSROOMS = [
  /* โรงเรียนวัดธาตุทอง — ป.1–ป.6 ชั้นละ 2 ห้อง */
  room('rm-wtt-p1-1', 'sch-wtt', 'p1', 'ป.1/1', 'ครูสุกัญญา พูลสวัสดิ์', 35, 16, 14),
  room('rm-wtt-p1-2', 'sch-wtt', 'p1', 'ป.1/2', 'ครูวราภรณ์ ทองแท้', 35, 15, 15),
  room('rm-wtt-p2-1', 'sch-wtt', 'p2', 'ป.2/1', 'ครูอรพิน ชูเกียรติ', 35, 17, 15),
  room('rm-wtt-p3-1', 'sch-wtt', 'p3', 'ป.3/1', 'ครูมณีรัตน์ สินสมบูรณ์', 35, 16, 17),
  room('rm-wtt-p3-2', 'sch-wtt', 'p3', 'ป.3/2', 'ครูพิมพ์ใจ เกษมสุข', 35, 15, 16),
  room('rm-wtt-p4-1', 'sch-wtt', 'p4', 'ป.4/1', 'ครูจิรายุ พงษ์พันธ์', 35, 18, 14),
  room('rm-wtt-p5-1', 'sch-wtt', 'p5', 'ป.5/1', 'ครูเบญจวรรณ อินทร์แก้ว', 35, 16, 16),
  room('rm-wtt-p6-1', 'sch-wtt', 'p6', 'ป.6/1', 'ครูสมพงษ์ ยิ้มแย้ม', 35, 17, 15),
  /* โรงเรียนวัดภาษี — อ.1–ป.6 */
  room('rm-wps-k2-1', 'sch-wps', 'k2', 'อ.2/1', 'ครูนงลักษณ์ ดวงแก้ว', 30, 13, 12),
  room('rm-wps-k3-1', 'sch-wps', 'k3', 'อ.3/1', 'ครูสมหญิง พรหมมา', 30, 12, 13),
  room('rm-wps-p1-1', 'sch-wps', 'p1', 'ป.1/1', 'ครูรัตนา ผ่องใส', 32, 15, 14),
  room('rm-wps-p2-1', 'sch-wps', 'p2', 'ป.2/1', 'ครูวิชัย ปานทอง', 32, 16, 13),
  room('rm-wps-p3-1', 'sch-wps', 'p3', 'ป.3/1', 'ครูกิตติศักดิ์ แซ่ลิ้ม', 32, 14, 16),
  room('rm-wps-p4-1', 'sch-wps', 'p4', 'ป.4/1', 'ครูดวงพร สมบัติ', 32, 15, 15),
  room('rm-wps-p5-1', 'sch-wps', 'p5', 'ป.5/1', 'ครูชูชาติ แก้วใส', 32, 14, 15),
  room('rm-wps-p6-1', 'sch-wps', 'p6', 'ป.6/1', 'ครูอนงค์ ทวีสุข', 32, 16, 14),
  /* โรงเรียนมัธยมวัดธาตุทอง — ม.1–ม.6 */
  room('rm-mwt-m1-1', 'sch-mwt', 'm1', 'ม.1/1', 'ครูชัยวัฒน์ ธำรงค์', 40, 20, 20),
  room('rm-mwt-m2-1', 'sch-mwt', 'm2', 'ม.2/1', 'ครูปวีณา สุวรรณโชติ', 40, 19, 21),
  room('rm-mwt-m2-2', 'sch-mwt', 'm2', 'ม.2/2', 'ครูธนากร บุญเรือง', 40, 21, 19),
  room('rm-mwt-m3-1', 'sch-mwt', 'm3', 'ม.3/1', 'ครูอัมพร เลิศวิไล', 40, 20, 19),
  room('rm-mwt-m4-1', 'sch-mwt', 'm4', 'ม.4/1', 'ครูสุพรรณี วัฒนกุล', 40, 18, 22),
  room('rm-mwt-m5-1', 'sch-mwt', 'm5', 'ม.5/1', 'ครูเกรียงไกร มณีรัตน์', 40, 17, 21),
  room('rm-mwt-m6-1', 'sch-mwt', 'm6', 'ม.6/1', 'ครูวรรณา สุขเจริญ', 40, 16, 20),
  /* โรงเรียนสุเหร่าบ้านดอน — ป.1–ป.6 */
  room('rm-sbd-p2-1', 'sch-sbd', 'p2', 'ป.2/1', 'ครูฟาริดา มะหะหมัด', 30, 14, 13),
  room('rm-sbd-p3-1', 'sch-sbd', 'p3', 'ป.3/1', 'ครูซูไบดะห์ หะยีสาและ', 30, 13, 14),
  room('rm-sbd-p5-1', 'sch-sbd', 'p5', 'ป.5/1', 'ครูอิสมาแอล ยูซบ', 30, 15, 13),
  room('rm-sbd-p6-1', 'sch-sbd', 'p6', 'ป.6/1', 'ครูรอกีเยาะ สาแม', 30, 14, 14),
];

/* ── โรงเรียน (base) ──────────────────────────────────────────────── */

const BASE_SCHOOLS = [
  {
    id: 'sch-wtt',
    code: '10120101',
    name: 'โรงเรียนวัดธาตุทอง',
    affiliation: 'bma',
    levels: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
    address: '1305 ถนนสุขุมวิท แขวงพระโขนงเหนือ เขตวัฒนา กรุงเทพมหานคร 10110',
    district: 'เขตวัฒนา',
    phone: '0 2391 4482',
    centerId: 'phc-21',
    nurse: 'พว.ณัฐธิดา บุญมั่น',
    healthTeacher: 'ครูสุกัญญา พูลสวัสดิ์',
    teacherCount: 28,
    directorName: 'นายวิเชียร ธรรมรักษ์',
    academicYear: CURRENT_ACADEMIC_YEAR,
    surveyDate: '2026-05-18',
    note: 'มีห้องพยาบาลประจำโรงเรียน · ตรวจสุขภาพประจำปีรอบ พ.ค.–มิ.ย.',
    status: 'active',
  },
  {
    id: 'sch-wps',
    code: '10120102',
    name: 'โรงเรียนวัดภาษี',
    affiliation: 'bma',
    levels: ['k1', 'k2', 'k3', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
    address: '55 ซอยเอกมัย 23 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพมหานคร 10110',
    district: 'เขตวัฒนา',
    phone: '0 2392 5514',
    centerId: 'phc-21',
    nurse: 'พว.พรทิพย์ แสงเดือน',
    healthTeacher: 'ครูรัตนา ผ่องใส',
    teacherCount: 21,
    directorName: 'นางสาวปราณี ศรีวิไล',
    academicYear: CURRENT_ACADEMIC_YEAR,
    surveyDate: '2026-05-21',
    note: 'มีชั้นอนุบาลร่วมด้วย — ต้องแยกรอบตรวจอนุบาล/ประถม',
    status: 'active',
  },
  {
    id: 'sch-mwt',
    code: '10120201',
    name: 'โรงเรียนมัธยมวัดธาตุทอง',
    affiliation: 'obec',
    levels: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'],
    address: '1305/2 ถนนสุขุมวิท แขวงพระโขนงเหนือ เขตวัฒนา กรุงเทพมหานคร 10110',
    district: 'เขตวัฒนา',
    phone: '0 2391 7719',
    centerId: 'phc-21',
    nurse: 'พว.กนกวรรณ ศรีสุข',
    healthTeacher: 'ครูปวีณา สุวรรณโชติ',
    teacherCount: 46,
    directorName: 'นายอดิศักดิ์ เรืองรอง',
    academicYear: CURRENT_ACADEMIC_YEAR,
    surveyDate: '2026-05-25',
    note: 'คัดกรองภาวะซีดนักเรียนหญิง ม.2 ตามมติ คทง.5',
    status: 'active',
  },
  {
    id: 'sch-sbd',
    code: '10120103',
    name: 'โรงเรียนสุเหร่าบ้านดอน',
    affiliation: 'bma',
    levels: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
    address: '9 ซอยปรีดี พนมยงค์ 14 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพมหานคร 10110',
    district: 'เขตวัฒนา',
    phone: '0 2711 3062',
    centerId: 'phc-21',
    nurse: 'พว.ณัฐธิดา บุญมั่น',
    healthTeacher: 'ครูฟาริดา มะหะหมัด',
    teacherCount: 17,
    directorName: 'นายมูฮัมหมัด สุไลมาน',
    academicYear: CURRENT_ACADEMIC_YEAR,
    surveyDate: '2026-06-02',
    note: '',
    status: 'active',
  },
  {
    /* ตั้งใจให้ยังไม่มีห้องเรียน/นักเรียน — demo empty state ของทะเบียน */
    id: 'sch-stn',
    code: '10120404',
    name: 'โรงเรียนอนุบาลแสงทองวิทยา',
    affiliation: 'private',
    levels: ['k1', 'k2', 'k3'],
    address: '188 ซอยสุขุมวิท 49 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพมหานคร 10110',
    district: 'เขตวัฒนา',
    phone: '0 2662 8140',
    centerId: 'phc-21',
    nurse: 'พว.พรทิพย์ แสงเดือน',
    healthTeacher: '',
    teacherCount: 9,
    directorName: 'นางสาวเมธาวี ชัยพฤกษ์',
    academicYear: CURRENT_ACADEMIC_YEAR,
    surveyDate: '2026-06-10',
    note: 'เพิ่งขึ้นทะเบียน — ยังไม่ได้บันทึกโครงสร้างห้องเรียนและรายชื่อนักเรียน',
    status: 'active',
  },
];

export const EMPTY_SCHOOL = {
  id: '',
  code: '',
  name: '',
  affiliation: '',
  levels: [],
  address: '',
  district: 'เขตวัฒนา',
  phone: '',
  centerId: SH_CENTER.id,
  nurse: '',
  healthTeacher: '',
  teacherCount: '',
  directorName: '',
  academicYear: CURRENT_ACADEMIC_YEAR,
  surveyDate: todayIso(),
  note: '',
  status: 'active',
};

export const EMPTY_CLASSROOM = {
  id: '', schoolId: '', grade: '', name: '', teacher: '', capacity: '', male: '', female: '',
};

/* ── โรงเรียน CRUD ────────────────────────────────────────────────── */

const schoolOverlay = () => readJson(SH_KEYS.schools, {});

/** แสดง — base + overlay (แก้ไข/ยกเลิก/เพิ่มใหม่) */
export const getSchoolRows = () => {
  const overlay = schoolOverlay();
  const merged = BASE_SCHOOLS.map((s) => ({ ...s, ...(overlay[s.id] || {}) }));
  const extras = Object.values(overlay).filter((s) => s?.id && !BASE_SCHOOLS.some((b) => b.id === s.id));
  return [...merged, ...extras].sort((a, b) => a.name.localeCompare(b.name, 'th'));
};

export const getSchoolById = (id) => getSchoolRows().find((s) => s.id === id) || null;

export const getActiveSchools = () => getSchoolRows().filter((s) => s.status !== 'cancelled');

export const schoolOptions = (includeAll = true) => [
  ...(includeAll ? [{ value: 'all', label: 'ทุกโรงเรียน' }] : []),
  ...getActiveSchools().map((s) => ({ value: s.id, label: s.name })),
];

export const findSchoolDuplicate = (entry) =>
  getSchoolRows().find((s) =>
    s.id !== entry.id
    && (String(s.code).trim() === String(entry.code).trim()
      || s.name.trim() === String(entry.name).trim()))
  || null;

/** บันทึก — สร้างใหม่ออกรหัสภายใน sch-xxxx ให้อัตโนมัติ */
export const saveSchool = (entry) => {
  const overlay = schoolOverlay();
  const isNew = !entry.id;
  const id = entry.id || `sch-new-${nextRunNo(SH_KEYS.schoolRun)}`;
  const previous = overlay[id] || BASE_SCHOOLS.find((s) => s.id === id) || {};
  const saved = {
    ...EMPTY_SCHOOL,
    ...previous,
    ...entry,
    id,
    teacherCount: entry.teacherCount === '' ? '' : Number(entry.teacherCount) || 0,
    status: entry.status || 'active',
    audit: auditStamp(),
    editHistory: [
      ...(previous.editHistory || []),
      { action: isNew ? 'create' : 'edit', ...auditStamp() },
    ],
  };
  overlay[id] = saved;
  writeJson(SH_KEYS.schools, overlay);
  return { saved, isNew };
};

/** ยกเลิก — soft cancel พร้อมเหตุผล (ไม่ลบข้อมูลบริการที่ผูกอยู่) */
export const cancelSchool = (id, reason) => {
  const overlay = schoolOverlay();
  const previous = overlay[id] || BASE_SCHOOLS.find((s) => s.id === id);
  if (!previous) return null;
  const saved = {
    ...previous,
    status: 'cancelled',
    cancellation: { reason, ...auditStamp() },
    editHistory: [...(previous.editHistory || []), { action: 'cancel', reason, ...auditStamp() }],
  };
  overlay[id] = saved;
  writeJson(SH_KEYS.schools, overlay);
  return saved;
};

export const reactivateSchool = (id) => {
  const overlay = schoolOverlay();
  const previous = overlay[id] || BASE_SCHOOLS.find((s) => s.id === id);
  if (!previous) return null;
  const saved = {
    ...previous,
    status: 'active',
    cancellation: null,
    editHistory: [...(previous.editHistory || []), { action: 'reactivate', ...auditStamp() }],
  };
  overlay[id] = saved;
  writeJson(SH_KEYS.schools, overlay);
  return saved;
};

/* ── ห้องเรียน CRUD (popup คู่มือ §2.3-1.3) ───────────────────────── */

const classroomOverlay = () => readJson(SH_KEYS.classrooms, { edits: {}, removed: [], extras: [] });

export const getClassrooms = (schoolId) => {
  const { edits, removed, extras } = classroomOverlay();
  const base = BASE_CLASSROOMS
    .filter((c) => !removed.includes(c.id))
    .map((c) => ({ ...c, ...(edits[c.id] || {}) }));
  const added = (extras || []).filter((c) => !removed.includes(c.id));
  const all = [...base, ...added];
  const scoped = schoolId ? all.filter((c) => c.schoolId === schoolId) : all;
  return scoped.sort((a, b) => (gradeOrder(a.grade) - gradeOrder(b.grade))
    || a.name.localeCompare(b.name, 'th'));
};

export const getClassroomById = (id) => getClassrooms().find((c) => c.id === id) || null;

export const saveClassroom = (entry) => {
  const overlay = classroomOverlay();
  const isNew = !entry.id;
  const id = entry.id || `rm-new-${nextRunNo(SH_KEYS.schoolRun)}`;
  const record = {
    ...EMPTY_CLASSROOM,
    ...entry,
    id,
    capacity: Number(entry.capacity) || 0,
    male: Number(entry.male) || 0,
    female: Number(entry.female) || 0,
    audit: auditStamp(),
  };
  if (isNew || !BASE_CLASSROOMS.some((c) => c.id === id)) {
    overlay.extras = [...(overlay.extras || []).filter((c) => c.id !== id), record];
  } else {
    overlay.edits = { ...(overlay.edits || {}), [id]: record };
  }
  overlay.removed = (overlay.removed || []).filter((r) => r !== id);
  writeJson(SH_KEYS.classrooms, overlay);
  return { saved: record, isNew };
};

/** ยกเลิกห้องเรียน — ซ่อนจากรายการ แต่ record บริการเดิมยังอ้างอิงได้ */
export const removeClassroom = (id) => {
  const overlay = classroomOverlay();
  overlay.removed = [...new Set([...(overlay.removed || []), id])];
  writeJson(SH_KEYS.classrooms, overlay);
};

export const restoreClassroom = (id) => {
  const overlay = classroomOverlay();
  overlay.removed = (overlay.removed || []).filter((r) => r !== id);
  writeJson(SH_KEYS.classrooms, overlay);
};

export const classroomOptions = (schoolId, grade) =>
  getClassrooms(schoolId)
    .filter((c) => !grade || grade === 'all' || c.grade === grade)
    .map((c) => ({ value: c.id, label: c.name }));

/** ระดับชั้นที่โรงเรียนเปิดสอนจริง → ตัวเลือก cascade */
export const gradeOptionsForSchool = (schoolId, includeAll = true) => {
  const school = getSchoolById(schoolId);
  const levels = school?.levels?.length
    ? school.levels
    : GRADE_LEVELS.map((g) => g.value);
  return [
    ...(includeAll ? [{ value: 'all', label: 'ทุกชั้น' }] : []),
    ...GRADE_LEVELS.filter((g) => levels.includes(g.value)).map((g) => ({ value: g.value, label: g.label })),
  ];
};

/** ตารางจำนวนนักเรียนแยกชั้น/เพศ ตามฟอร์มคู่มือ §2.1 */
export const getEnrollmentByGrade = (schoolId) => {
  const rooms = getClassrooms(schoolId);
  const map = new Map();
  rooms.forEach((r) => {
    const cur = map.get(r.grade) || { grade: r.grade, gradeName: gradeLabel(r.grade), rooms: 0, male: 0, female: 0, capacity: 0 };
    cur.rooms += 1;
    cur.male += Number(r.male) || 0;
    cur.female += Number(r.female) || 0;
    cur.capacity += Number(r.capacity) || 0;
    map.set(r.grade, cur);
  });
  return [...map.values()]
    .map((r) => ({ ...r, total: r.male + r.female, vacancy: Math.max(0, r.capacity - (r.male + r.female)) }))
    .sort((a, b) => gradeOrder(a.grade) - gradeOrder(b.grade));
};

/** §3.1.2 "จำนวนเด็กที่รับเพิ่มได้" — คิดจากความจุห้องเรียนที่กรอกในทะเบียน */
export const getSchoolCapacity = (schoolId) => {
  const rows = getEnrollmentByGrade(schoolId);
  const capacity = rows.reduce((s, r) => s + r.capacity, 0);
  const enrolled = rows.reduce((s, r) => s + r.total, 0);
  return { capacity, enrolled, vacancy: Math.max(0, capacity - enrolled) };
};

/* ── กิจกรรมบริการสุขภาพ (§2.2) ───────────────────────────────────── */

const BASE_ACTIVITIES = [
  {
    id: 'act-001', schoolId: 'sch-wtt', type: 'promotion', sub: 'การให้สุขศึกษาแก่นักเรียน',
    academicYear: '2569', term: '1', month: '6', date: '2026-06-11',
    participants: 212, detail: 'ให้สุขศึกษาเรื่องโภชนาการและการแปรงฟันที่ถูกวิธี ชั้น ป.1–ป.3',
    outcome: 'นักเรียนเข้าร่วมครบทุกห้อง · แจกแปรงสีฟัน 212 ชุด',
    recordedBy: 'พว.ณัฐธิดา บุญมั่น', position: 'พยาบาลวิชาชีพชำนาญการ', status: 'saved',
  },
  {
    id: 'act-002', schoolId: 'sch-wtt', type: 'osr', sub: 'อบรม อสร. ใหม่',
    academicYear: '2569', term: '1', month: '6', date: '2026-06-18',
    participants: 24, detail: 'อบรมนักเรียนแกนนำ อสร. รุ่นที่ 12 หลักสูตร 1 วัน',
    outcome: 'ผ่านการประเมิน 24 คน · มอบเกียรติบัตร',
    recordedBy: 'พว.ณัฐธิดา บุญมั่น', position: 'พยาบาลวิชาชีพชำนาญการ', status: 'saved',
  },
  {
    id: 'act-003', schoolId: 'sch-mwt', type: 'ysr', sub: 'ปฏิบัติกิจกรรมของกลุ่ม ยสร.',
    academicYear: '2569', term: '1', month: '7', date: '2026-07-09',
    participants: 30, detail: 'กลุ่ม ยสร. รณรงค์ป้องกันโรคไข้เลือดออกในโรงเรียน',
    outcome: 'สำรวจลูกน้ำยุงลาย 46 จุด พบ 3 จุด กำจัดครบ · CI = 6.5',
    recordedBy: 'พว.กนกวรรณ ศรีสุข', position: 'พยาบาลวิชาชีพ', status: 'saved',
  },
  {
    id: 'act-004', schoolId: 'sch-wps', type: 'prevention', sub: 'ให้บริการวัคซีนตามระดับชั้น',
    academicYear: '2569', term: '1', month: '7', date: '2026-07-16',
    participants: 29, detail: 'ให้วัคซีน MMR เข็มกระตุ้น + dT ชั้น ป.1 และ ป.6',
    outcome: 'ได้รับครบ 26 คน · ขาดเรียน 2 คน · ผู้ปกครองไม่ยินยอม 1 คน',
    recordedBy: 'พว.พรทิพย์ แสงเดือน', position: 'พยาบาลวิชาชีพชำนาญการ', status: 'saved',
  },
  {
    id: 'act-005', schoolId: 'sch-sbd', type: 'treatment', sub: 'ตรวจรักษาเบื้องต้นในโรงเรียน',
    academicYear: '2569', term: '1', month: '8', date: '2026-08-06',
    participants: 18, detail: 'ตรวจรักษาเบื้องต้นในห้องพยาบาล — แผลถลอก 8, ปวดท้อง 4, ผื่นคัน 6',
    outcome: 'จ่ายยาตามกลุ่มอาการ 18 ราย · ส่งต่อศูนย์ฯ 1 ราย',
    recordedBy: 'พว.ณัฐธิดา บุญมั่น', position: 'พยาบาลวิชาชีพชำนาญการ', status: 'saved',
  },
];

export const EMPTY_ACTIVITY = {
  id: '', schoolId: '', type: '', sub: '', academicYear: CURRENT_ACADEMIC_YEAR, term: '1',
  month: String(new Date().getMonth() + 1), date: todayIso(), participants: '',
  detail: '', outcome: '', status: 'saved',
};

const activityOverlay = () => readJson(SH_KEYS.activities, {});

export const getSchoolActivities = (schoolId) => {
  const overlay = activityOverlay();
  const merged = BASE_ACTIVITIES.map((a) => ({ ...a, ...(overlay[a.id] || {}) }));
  const extras = Object.values(overlay).filter((a) => a?.id && !BASE_ACTIVITIES.some((b) => b.id === a.id));
  const all = [...merged, ...extras];
  const scoped = schoolId && schoolId !== 'all' ? all.filter((a) => a.schoolId === schoolId) : all;
  return scoped.sort((a, b) => String(b.date).localeCompare(String(a.date)));
};

export const saveSchoolActivity = (entry) => {
  const overlay = activityOverlay();
  const isNew = !entry.id;
  const id = entry.id || `act-new-${nextRunNo(SH_KEYS.activityRun)}`;
  const previous = overlay[id] || BASE_ACTIVITIES.find((a) => a.id === id) || {};
  const saved = {
    ...EMPTY_ACTIVITY,
    ...previous,
    ...entry,
    id,
    participants: entry.participants === '' ? '' : Number(entry.participants) || 0,
    status: 'saved',
    recordedBy: auditStamp().by,
    position: auditStamp().position,
    audit: auditStamp(),
    editHistory: [...(previous.editHistory || []), { action: isNew ? 'create' : 'edit', ...auditStamp() }],
  };
  overlay[id] = saved;
  writeJson(SH_KEYS.activities, overlay);
  return { saved, isNew };
};

export const cancelSchoolActivity = (id, reason) => {
  const overlay = activityOverlay();
  const previous = overlay[id] || BASE_ACTIVITIES.find((a) => a.id === id);
  if (!previous) return null;
  const saved = {
    ...previous,
    status: 'cancelled',
    cancellation: { reason, ...auditStamp() },
    editHistory: [...(previous.editHistory || []), { action: 'cancel', reason, ...auditStamp() }],
  };
  overlay[id] = saved;
  writeJson(SH_KEYS.activities, overlay);
  return saved;
};

export const reactivateSchoolActivity = (id) => {
  const overlay = activityOverlay();
  const previous = overlay[id] || BASE_ACTIVITIES.find((a) => a.id === id);
  if (!previous) return null;
  const saved = {
    ...previous,
    status: 'saved',
    cancellation: null,
    editHistory: [...(previous.editHistory || []), { action: 'reactivate', ...auditStamp() }],
  };
  overlay[id] = saved;
  writeJson(SH_KEYS.activities, overlay);
  return saved;
};

/* ── แผนออกให้บริการโรงเรียน (แจ้งเตือนล่วงหน้า 1 สัปดาห์ · §3.4.3) ─── */

const BASE_VISIT_PLANS = [
  { id: 'plan-01', schoolId: 'sch-wtt', grade: 'p1', service: 'ให้บริการวัคซีน (MMR/dT) ชั้น ป.1', dateOffset: 4, staff: 'พว.ณัฐธิดา บุญมั่น' },
  { id: 'plan-02', schoolId: 'sch-mwt', grade: 'm2', service: 'คัดกรองภาวะซีดนักเรียนหญิง ม.2', dateOffset: 6, staff: 'พว.กนกวรรณ ศรีสุข' },
  { id: 'plan-03', schoolId: 'sch-wps', grade: 'p3', service: 'ตรวจสุขภาพประจำปี ชั้น ป.3', dateOffset: 9, staff: 'พว.พรทิพย์ แสงเดือน' },
  { id: 'plan-04', schoolId: 'sch-sbd', grade: 'p5', service: 'ตรวจทันตกรรมทั้งห้อง ชั้น ป.5', dateOffset: 15, staff: 'ทพญ.อริสา วงศ์ไพศาล' },
  { id: 'plan-05', schoolId: 'sch-wtt', grade: 'p6', service: 'ให้บริการวัคซีน dT ชั้น ป.6', dateOffset: 2, staff: 'พว.ณัฐธิดา บุญมั่น' },
];

/** แผนที่ครบกำหนดภายใน N วัน (ค่าเริ่มต้น 7 วัน = แจ้งเตือนล่วงหน้า 1 สัปดาห์) */
export const getUpcomingVisits = (withinDays = 7) => {
  const today = todayIso();
  return BASE_VISIT_PLANS
    .map((p) => {
      const date = addDaysIso(today, p.dateOffset);
      return {
        ...p,
        date,
        daysLeft: daysBetween(today, date),
        schoolName: getSchoolById(p.schoolId)?.name || '—',
        gradeName: gradeLabel(p.grade),
      };
    })
    .filter((p) => p.daysLeft != null && p.daysLeft >= 0 && p.daysLeft <= withinDays)
    .sort((a, b) => a.daysLeft - b.daysLeft);
};

export const getAllVisitPlans = () => {
  const today = todayIso();
  return BASE_VISIT_PLANS
    .map((p) => {
      const date = addDaysIso(today, p.dateOffset);
      return {
        ...p,
        date,
        daysLeft: daysBetween(today, date),
        schoolName: getSchoolById(p.schoolId)?.name || '—',
        gradeName: gradeLabel(p.grade),
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);
};
