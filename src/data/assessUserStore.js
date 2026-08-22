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

export const DEMO_ASSESS_USERS = [
  {
    id: 'user-demo-somchai',
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
        activityId: 'gp-doctor',
        activity: 'แพทย์',
        subActivityId: 'sb-dent',
        subActivity: 'ทันตแพทย์',
        departmentId: 'dept-dent',
        department: 'ทันตกรรม',
        positionId: 'pos-specialist',
        position: 'ผู้เชี่ยวชาญ (Specialist)',
        isPrimary: true,
      },
    ],
  },
];

export function emptyAssignment() {
  return {
    id: uid(),
    centerId: '',
    center: '',
    activityId: '',
    activity: '',
    subActivityId: '',
    subActivity: '',
    departmentId: '',
    department: '',
    positionId: '',
    position: '',
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
  };
}

function normalizeAssessUser(user) {
  if (!user) return user;
  return { ...user, assignments: (user.assignments || []).map(normalizeAssignment) };
}

export function readAssessUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeAssessUser) : [];
  } catch {
    return [];
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
