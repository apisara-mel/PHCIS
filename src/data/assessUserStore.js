/* PHCIS | Assess-control — Personnel registry (Figma 4D3nTx53 · 10:44391).
   Mock persistence via localStorage.

   assignment ของบุคลากรผูกกับ **กิจกรรม/กิจกรรมย่อย** — record ยุค
   Group Policy (`groupPolicyId`/`subBranchId`) ถูก normalize อัตโนมัติ
   ตอนอ่าน. */

import { CENTER_OPTIONS } from '@/data/accessControlStore';

const STORAGE_KEY = 'mih:assess-users';

const uid = () => `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const TITLE_OPTIONS = [
  { value: '', label: 'คำนำหน้า' },
  { value: 'นาย', label: 'นาย' },
  { value: 'นาง', label: 'นาง' },
  { value: 'น.ส.', label: 'น.ส.' },
  { value: 'นพ.', label: 'นพ.' },
  { value: 'พญ.', label: 'พญ.' },
  { value: 'ภก.', label: 'ภก.' },
  { value: 'ภญ.', label: 'ภญ.' },
];

export const GENDER_OPTIONS = [
  { value: '', label: 'เลือกเพศกำเนิด' },
  { value: 'male', label: 'ชาย' },
  { value: 'female', label: 'หญิง' },
  { value: 'other', label: 'อื่นๆ' },
];

/* ทะเบียนบุคลากรของจริงมีหลักร้อยคนต่อสำนักงาน — ชุดตัวอย่างที่เขียนมือ 6 คน
   ทำให้ป๊อปอัป "รหัสพนักงานที่มีอยู่แล้ว" กับตัวเลขในทะเบียนดูไม่ออกว่าใช้งาน
   จริงเป็นยังไง จึงต่อท้ายด้วยชุดที่สร้างจากสูตร (deterministic ไม่สุ่ม เพื่อให้
   ทุกคนเห็นข้อมูลชุดเดียวกัน) — 26 ส.ค. 2569 มติผู้ใช้ */
const GEN_TITLES = ['นาย', 'นาง', 'นางสาว'];
const GEN_FIRST = [
  'สมชาย', 'สุดารัตน์', 'อนุชา', 'กนกวรรณ', 'พิชิต', 'วราภรณ์', 'ธนกร', 'ปิยะดา',
  'ศิริพร', 'ณัฐพงษ์', 'จิราพร', 'อรรถพล', 'เบญจมาศ', 'สุรชัย', 'พรทิพย์', 'วิชัย',
  'ชลดา', 'ภาณุพงศ์', 'รัตนา', 'ธีระ',
];
const GEN_LAST = [
  'ใจดี', 'พงษ์เจริญ', 'แก้วประเสริฐ', 'ศรีสุวรรณ', 'รุ่งเรืองกิจ', 'อินทรสุข',
  'บุญมี', 'ทองสุข', 'สมบูรณ์', 'วัฒนกุล', 'ชูเกียรติ', 'เพชรรัตน์', 'มณีวงศ์',
];

const GEN_ROLES = [
  { activityId: 'gp-nurse',       activity: 'พยาบาลวิชาชีพ',      positionId: 'pos-staff',      position: 'ผู้ปฏิบัติงาน',        departmentId: 'dept-opd',    department: 'ผู้ป่วยนอก (OPD)' },
  { activityId: 'gp-registrar',   activity: 'เจ้าหน้าที่เวชระเบียน', positionId: 'pos-officer',    position: 'เจ้าหน้าที่',          departmentId: 'dept-mr',     department: 'เวชระเบียน' },
  { activityId: 'gp-pharmacist',  activity: 'เภสัชกร',            positionId: 'pos-staff',      position: 'ผู้ปฏิบัติงาน',        departmentId: 'dept-pharm',  department: 'เภสัชกรรม' },
  { activityId: 'gp-medtech',     activity: 'นักเทคนิคการแพทย์',   positionId: 'pos-staff',      position: 'ผู้ปฏิบัติงาน',        departmentId: 'dept-lab',    department: 'ชันสูตรโรค' },
  { activityId: 'act-dentist',    activity: 'ทันตแพทย์',           positionId: 'pos-specialist', position: 'ผู้เชี่ยวชาญ (Specialist)', departmentId: 'dept-dent', department: 'ทันตกรรม' },
  { activityId: 'act-social-worker', activity: 'นักสังคมสงเคราะห์', positionId: 'pos-staff',     position: 'ผู้ปฏิบัติงาน',        departmentId: 'dept-social', department: 'สังคมสงเคราะห์' },
];

const GEN_TEMPLATE_BY_ACTIVITY = {
  'gp-nurse': ['ac-demo-nurse-opd', 'สิทธิพยาบาลผู้ป่วยนอก'],
  'gp-registrar': ['ac-demo-registrar', 'สิทธิเจ้าหน้าที่เวชระเบียน'],
  'gp-pharmacist': ['ac-demo-pharmacist', 'สิทธิเภสัชกรจ่ายยา'],
  'gp-medtech': ['ac-demo-lab', 'สิทธินักเทคนิคการแพทย์'],
  'act-dentist': ['ac-demo-dentist', 'สิทธิทันตแพทย์ — บันทึกการรักษา'],
  'act-social-worker': ['ac-demo-social-worker', 'สิทธินักสังคมสงเคราะห์ศูนย์'],
};

/** บุคลากรลำดับที่ n (เริ่มที่ 7 ต่อจากชุดที่เขียนมือ) */
function generatedAssessUser(n) {
  const title = GEN_TITLES[n % GEN_TITLES.length];
  const firstName = GEN_FIRST[n % GEN_FIRST.length];
  const lastName = GEN_LAST[(n * 3) % GEN_LAST.length];
  const role = GEN_ROLES[n % GEN_ROLES.length];
  const center = CENTER_OPTIONS[n % Math.min(CENTER_OPTIONS.length, 20)];
  const [accessTemplateId, accessTemplate] = GEN_TEMPLATE_BY_ACTIVITY[role.activityId] || ['', ''];
  const code = `EMP-${String(100 + n).padStart(5, '0')}`;
  return {
    id: `user-gen-${n}`,
    employeeCode: code,
    title,
    firstName,
    lastName,
    prefixEn: title === 'นาย' ? 'Mr.' : 'Ms.',
    nameEn: '',
    surnameEn: '',
    nationalId: `1-${String(1000 + n).slice(0, 4)}-${String(10000 + n * 7).slice(0, 5)}-${String(10 + (n % 90))}-${n % 10}`,
    licenseNo: '',
    birthDate: '',
    age: '',
    phone: `08${n % 10}-${String(100 + (n % 900))}-${String(1000 + (n * 13) % 9000)}`,
    email: `staff${n}@bma.go.th`,
    personalEmail: '',
    photo: '',
    /* ~7% ปิดใช้งาน ให้ตัวเลขในการ์ดสรุปไม่เท่ากันทั้งหมด */
    active: n % 14 !== 0,
    assignments: [{
      id: `asgn-gen-${n}`,
      centerId: center?.value || '',
      center: center?.label || '',
      branchId: '',
      branch: '',
      ...role,
      subActivityId: '',
      subActivity: '',
      accessTemplateId,
      accessTemplate,
      isPrimary: true,
      startAt: '',
      endAt: '',
      active: true,
    }],
  };
}

const GENERATED_ASSESS_USERS = Array.from({ length: 194 }, (_, i) => generatedAssessUser(i + 7));

export const DEMO_ASSESS_USERS = [
  {
    id: 'user-demo-somchai',
    employeeCode: 'EMP-00101',
    title: 'นาย',
    firstName: 'สมชาย',
    lastName: 'ไสยสวัสดิ์',
    prefixEn: 'Mr.',
    nameEn: 'Somchai',
    surnameEn: 'Jaisawaddee',
    gender: 'male',
    nationalId: '1-2345-67890-12-3',
    licenseNo: 'ว.12345',
    birthDate: '15/03/2525',
    age: '43-0-9',
    phone: '081-234-5678',
    email: 'somchai@bma.go.th',
    active: true,
    assignments: [
      {
        id: 'asgn-1',
        centerId: 'hc-4',
        center: 'ศูนย์ 4 ดินแดง',
        activityId: 'act-dentist',
        accessTemplateId: 'ac-demo-dentist',
        accessTemplate: 'สิทธิทันตแพทย์ — บันทึกการรักษา',
        activity: 'ทันตแพทย์',
        subActivityId: 'sub-dent-opd',
        subActivity: 'ตรวจรักษาทางทันตกรรม',
        departmentId: 'dept-dent',
        department: 'ทันตกรรม',
        positionId: 'pos-specialist',
        position: 'ผู้เชี่ยวชาญ (Specialist)',
        isPrimary: true,
      },
    ],
  },
  {
    id: 'user-demo-sudarat',
    employeeCode: 'EMP-00102',
    title: 'นางสาว',
    firstName: 'สุดารัตน์',
    lastName: 'พงษ์เจริญ',
    prefixEn: 'Ms.',
    nameEn: 'Sudarat',
    surnameEn: 'Pongcharoen',
    gender: 'female',
    nationalId: '1-1010-20304-05-6',
    licenseNo: 'พย.24817',
    birthDate: '02/06/2533',
    age: '35-2-23',
    phone: '081-445-2210',
    email: 'sudarat@bma.go.th',
    active: true,
    assignments: [
      {
        id: 'asgn-2',
        centerId: 'hc-4',
        center: 'ศูนย์ 4 ดินแดง',
        activityId: 'gp-nurse',
        accessTemplateId: 'ac-demo-nurse-opd',
        accessTemplate: 'สิทธิพยาบาลผู้ป่วยนอก',
        activity: 'พยาบาลวิชาชีพ',
        subActivityId: 'sb-opd',
        subActivity: 'คัดกรองและซักประวัติ (OPD)',
        departmentId: 'dept-opd',
        department: 'ผู้ป่วยนอก (OPD)',
        positionId: 'pos-practitioner',
        position: 'ผู้ปฏิบัติงาน',
        isPrimary: true,
      },
    ],
  },
  {
    id: 'user-demo-anucha',
    employeeCode: 'EMP-00103',
    title: 'นาย',
    firstName: 'อนุชา',
    lastName: 'แก้วประเสริฐ',
    prefixEn: 'Mr.',
    nameEn: 'Anucha',
    surnameEn: 'Kaewprasert',
    gender: 'male',
    nationalId: '3-2020-30405-06-7',
    licenseNo: 'ภ.31204',
    birthDate: '19/11/2531',
    age: '37-9-06',
    phone: '089-332-7788',
    email: 'anucha@bma.go.th',
    active: true,
    assignments: [
      {
        id: 'asgn-3',
        centerId: 'hc-15',
        center: 'ศูนย์ 15 ห้วยขวาง (เจ้าคุณพระประยูรวงศ์)',
        activityId: 'gp-pharmacist',
        accessTemplateId: 'ac-demo-pharmacist',
        accessTemplate: 'สิทธิเภสัชกรจ่ายยา',
        activity: 'เภสัชกร',
        subActivityId: 'sb-dispense',
        subActivity: 'จ่ายยาผู้ป่วยนอก',
        departmentId: 'dept-pharm',
        department: 'เภสัชกรรม',
        positionId: 'pos-practitioner',
        position: 'ผู้ปฏิบัติงาน',
        isPrimary: true,
      },
    ],
  },
  {
    id: 'user-demo-kanokwan',
    employeeCode: 'EMP-00104',
    title: 'นาง',
    firstName: 'กนกวรรณ',
    lastName: 'ศรีสุวรรณ',
    prefixEn: 'Mrs.',
    nameEn: 'Kanokwan',
    surnameEn: 'Srisuwan',
    gender: 'female',
    nationalId: '1-3030-40506-07-8',
    licenseNo: '',
    birthDate: '25/01/2527',
    age: '42-7-00',
    phone: '086-119-4520',
    email: 'kanokwan@bma.go.th',
    active: true,
    assignments: [
      {
        id: 'asgn-4',
        centerId: 'hc-4',
        center: 'ศูนย์ 4 ดินแดง',
        activityId: 'gp-registrar',
        accessTemplateId: 'ac-demo-registrar',
        accessTemplate: 'สิทธิเจ้าหน้าที่เวชระเบียน',
        activity: 'เจ้าหน้าที่เวชระเบียน',
        subActivityId: 'sb-reg-front',
        subActivity: 'จุดคัดกรอง/ลงทะเบียนและตรวจสอบสิทธิ',
        departmentId: 'dept-reg',
        department: 'เวชระเบียน',
        positionId: 'pos-officer',
        position: 'เจ้าหน้าที่',
        isPrimary: true,
      },
    ],
  },
  {
    id: 'user-demo-phichit',
    employeeCode: 'EMP-00105',
    title: 'นาย',
    firstName: 'พิชิต',
    lastName: 'รุ่งเรืองกิจ',
    prefixEn: 'Mr.',
    nameEn: 'Phichit',
    surnameEn: 'Rungruangkij',
    gender: 'male',
    nationalId: '5-4040-50607-08-9',
    licenseNo: 'ทน.10233',
    birthDate: '08/09/2529',
    age: '39-11-17',
    phone: '092-770-1188',
    email: 'phichit@bma.go.th',
    active: true,
    assignments: [
      {
        id: 'asgn-5',
        centerId: 'hc-35',
        center: 'ศูนย์ 35 หัวหมาก',
        /* ตัวอย่างคนที่ประจำสาขาย่อย — ตารางบุคลากรจะขึ้น "ศูนย์บริการย่อย …" */
        branch: 'สาขาชุมชนหัวหมาก',
        activityId: 'gp-medtech',
        accessTemplateId: 'ac-demo-lab',
        accessTemplate: 'สิทธินักเทคนิคการแพทย์',
        activity: 'นักเทคนิคการแพทย์',
        subActivityId: 'sb-lab',
        subActivity: 'ตรวจวิเคราะห์ทางห้องปฏิบัติการ',
        departmentId: 'dept-lab',
        department: 'ชันสูตรโรค',
        positionId: 'pos-practitioner',
        position: 'ผู้ปฏิบัติงาน',
        isPrimary: true,
      },
    ],
  },
  {
    id: 'user-demo-waraporn',
    employeeCode: 'EMP-00106',
    title: 'นางสาว',
    firstName: 'วราภรณ์',
    lastName: 'อินทรสุข',
    prefixEn: 'Ms.',
    nameEn: 'Waraporn',
    surnameEn: 'Intarasuk',
    gender: 'female',
    nationalId: '1-5050-60708-09-0',
    licenseNo: 'สค.4471',
    birthDate: '30/03/2535',
    age: '33-5-26',
    phone: '094-880-5512',
    email: 'waraporn@bma.go.th',
    active: true,
    assignments: [
      {
        id: 'asgn-6',
        centerId: 'hc-4',
        center: 'ศูนย์ 4 ดินแดง',
        activityId: 'act-social-worker',
        accessTemplateId: 'ac-demo-social-worker',
        accessTemplate: 'สิทธินักสังคมสงเคราะห์ศูนย์',
        activity: 'นักสังคมสงเคราะห์',
        subActivityId: 'sub-sw-center',
        subActivity: 'ให้คำปรึกษาในศูนย์บริการ',
        departmentId: 'dept-social',
        department: 'สังคมสงเคราะห์',
        positionId: 'pos-practitioner',
        position: 'ผู้ปฏิบัติงาน',
        isPrimary: true,
      },
    ],
  },
  ...GENERATED_ASSESS_USERS,
];

export function emptyAssignment() {
  return {
    id: uid(),
    centerId: '',
    center: '',
    /* สาขาย่อยของศูนย์ (ศบส.สาขา) — ว่าง = ประจำที่ศูนย์แม่ */
    branchId: '',
    branch: '',
    activityId: '',
    activity: '',
    subActivityId: '',
    subActivity: '',
    departmentId: '',
    department: '',
    positionId: '',
    position: '',
    /* แม่แบบสิทธิ์การเข้าถึงระบบที่เลือกให้ assignment นี้ (26 ส.ค. 2569 มติผู้ใช้)
       — เดิมจับคู่อัตโนมัติจากคุณสมบัติ ตอนนี้เลือกตรง ๆ ตอนเพิ่มบุคลากร */
    accessTemplateId: '',
    accessTemplate: '',
    isPrimary: false,
    /* ช่วงเวลาปฏิบัติงานที่ศูนย์นี้ — สิ้นสุดเว้นว่าง = ยังไม่กำหนด (ปฏิบัติงานต่อเนื่อง) */
    startAt: '',
    endAt: '',
    /* บุคลากรคนเดียวกัน Active ที่ศูนย์หนึ่งแต่ Inactive อีกศูนย์ได้
       (ย้าย/พ้นหน้าที่เฉพาะสาขา) — สถานะจึงอยู่ระดับ assignment ไม่ใช่ระดับคน */
    active: true,
  };
}

/** จำนวนศูนย์ที่บุคลากรคนนี้ยัง Active อยู่. */
export function activeCenterCount(user) {
  const ids = new Set(
    (user?.assignments || []).filter((a) => a.active !== false && a.centerId).map((a) => a.centerId),
  );
  return ids.size;
}

/* assignment ยุค Group Policy → รูปกิจกรรม (field ใหม่มาก่อน ถ้ามีทั้งคู่) */
function normalizeAssignment(row) {
  if (!row) return row;
  const {
    groupPolicy, groupPolicyId, subBranch, subBranchId, ...rest
  } = row;
  return {
    ...rest,
    activity: rest.activity ?? groupPolicy ?? '',
    activityId: rest.activityId ?? groupPolicyId ?? '',
    subActivity: rest.subActivity ?? subBranch ?? '',
    subActivityId: rest.subActivityId ?? subBranchId ?? '',
    branchId: rest.branchId ?? '',
    branch: rest.branch ?? '',
    accessTemplateId: rest.accessTemplateId ?? '',
    accessTemplate: rest.accessTemplate ?? '',
  };
}

function normalizeAssessUser(user) {
  if (!user) return user;
  return { ...user, assignments: (user.assignments || []).map(normalizeAssignment) };
}

export function readAssessUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    /* เบราว์เซอร์ใหม่ให้ชุดตัวอย่าง — ไม่งั้นทะเบียนบุคลากรว่างเปล่า และหน้า
       "สิทธิการเข้าถึง" ก็หา "ผู้ถือสิทธิ์" ไม่เจอเลยทั้งที่แม่แบบอนุมัติแล้ว
       (แบบเดียวกับ readCenters ที่คืน DEMO_CENTERS) */
    if (raw == null) return DEMO_ASSESS_USERS.map(normalizeAssessUser);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEMO_ASSESS_USERS.map(normalizeAssessUser);
    return parsed.map(normalizeAssessUser);
  } catch {
    return DEMO_ASSESS_USERS.map(normalizeAssessUser);
  }
}

export function writeAssessUsers(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function computeAssessUserStats(records) {
  const list = records || [];
  return {
    total: list.length,
    active: list.filter((r) => r.active).length,
    inactive: list.filter((r) => !r.active).length,
  };
}

export function fullName(user) {
  if (!user) return '';
  return [user.title, user.firstName, user.lastName].filter(Boolean).join(' ').trim();
}

export function fullNameEn(user) {
  if (!user) return '';
  return [user.nameEn, user.surnameEn].filter(Boolean).join(' ').trim();
}

export function primaryAssignment(user) {
  return (user?.assignments || []).find((a) => a.isPrimary) || user?.assignments?.[0] || null;
}

export function uniqueCenterCount(user) {
  const ids = new Set((user?.assignments || []).map((a) => a.centerId).filter(Boolean));
  return ids.size;
}

export function createAssessUser(draft) {
  return {
    id: uid(),
    active: true,
    assignments: [],
    ...draft,
  };
}

export function findAssessUser(id) {
  return readAssessUsers().find((r) => r.id === id) || null;
}

export function upsertAssessUser(record) {
  const list = readAssessUsers();
  const idx = list.findIndex((r) => r.id === record.id);
  if (idx >= 0) list[idx] = record;
  else list.push(record);
  writeAssessUsers(list);
  return record;
}

export function deleteAssessUser(id) {
  writeAssessUsers(readAssessUsers().filter((r) => r.id !== id));
}

export function loadDemoAssessUsers() {
  writeAssessUsers(DEMO_ASSESS_USERS);
  return DEMO_ASSESS_USERS;
}

export function assignmentKey(row) {
  return [row.centerId, row.activityId, row.subActivityId, row.departmentId, row.positionId].join('|');
}

export function findDuplicateAssignments(assignments) {
  const seen = new Map();
  const dupes = [];
  (assignments || []).forEach((row, idx) => {
    const key = assignmentKey(row);
    if (!row.centerId || !row.activityId || !row.subActivityId || !row.departmentId || !row.positionId) return;
    if (seen.has(key)) dupes.push(idx);
    else seen.set(key, idx);
  });
  return dupes;
}

export function centerLabel(centerId) {
  return CENTER_OPTIONS.find((c) => c.value === centerId)?.label || '';
}

/** ป้ายศูนย์ที่ใช้แสดงในตาราง — คนที่ประจำสาขาย่อยขึ้นชื่อสาขา ไม่ใช่ชื่อศูนย์แม่
    เพื่อให้เห็นจากตารางได้ทันทีว่าอยู่ที่จุดบริการย่อย (26 ส.ค. 69 มติผู้ใช้) */
export function assignmentCenterLabel(assignment) {
  if (!assignment) return '';
  const branch = (assignment.branch || '').trim();
  if (branch) return `ศูนย์บริการย่อย ${branch}`;
  return assignment.center || centerLabel(assignment.centerId) || '';
}
