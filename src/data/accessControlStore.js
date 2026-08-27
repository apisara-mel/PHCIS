/* PHCIS | Assess-control — Access rights (Figma 4D3nTx53 · 12:41101).
   Mock persistence via localStorage.

   แม่แบบสิทธิ์กำหนดตาม **ตำแหน่ง · บทบาท · แผนก** (26 ส.ค. 2569) — record ที่เคยบันทึกในยุค
   Group Policy (`groupPolicyId`/`subBranchId`) ถูก normalize เป็น
   `activityId`/`subActivityId` อัตโนมัติตอนอ่าน. */

import { findCenterDetail } from '@/data/centerStore';

const STORAGE_KEY = 'mih:assess-access-control';

import {
  PERM_NONE as LEVEL_NONE,
  PERM_VIEW as LEVEL_VIEW,
  PERM_EDIT as LEVEL_EDIT,
  ALL_LEAF_KEYS,
  /* ใช้ในไฟล์นี้จริง (grantMenus) — บล็อก `export … from` ข้างล่างเป็น re-export
     ล้วน ไม่ได้สร้าง binding ให้ไฟล์นี้ ต้อง import เข้ามาเองด้วย */
  ACCESS_SYSTEMS as MENU_SYSTEMS,
  menuLeafKeys as leafKeysOfMenu,
  setLevelForLeaves as setLeaves,
  emptyPermissions,
  normalizePermissions,
  countPermissionLevels,
} from '@/data/accessMenuCatalog';

const uid = () => `ac-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/* ระดับสิทธิ์ + โครงเมนู 3 ระดับอยู่ที่ accessMenuCatalog — ที่นี่ re-export
   ให้หน้าที่เรียกใช้อยู่แล้วไม่ต้องแก้ import (26 ส.ค. 2569) */
export {
  PERM_NONE,
  PERM_VIEW,
  PERM_WRITE,
  PERM_EDIT,
  PERM_MIXED,
  PERM_LEVELS,
  PERM_META,
  permLabel,
  ACCESS_SYSTEMS,
  menuLeafKeys,
  systemLeafKeys,
  rollupLevel,
  setLevelForLeaves,
} from '@/data/accessMenuCatalog';

/* คีย์โมดูลยุคเดิม (สิทธิ์แบน ๆ 17 รายการ) — เหลือไว้ใช้ seed ข้อมูลตัวอย่าง
   เท่านั้น ตอนอ่านจะถูกแปลงเป็นสิทธิ์ระดับเมนู/เมนูย่อยให้อัตโนมัติ */
/* ให้สิทธิ์ตามคีย์เมนูจริง — ชุดตัวอย่างเดิมเขียนด้วยคีย์โมดูลยุคเก่าที่ map ได้
   ไม่ครบ กด "ดูสิทธิ์" แล้วเห็นแค่เมนูเดียว ไม่ตรงกับบริบทของแม่แบบ
   (26 ส.ค. 2569 มติผู้ใช้) */
function grantMenus(spec) {
  let perms = emptyPermissions();
  Object.entries(spec).forEach(([menuKey, level]) => {
    const menu = MENU_SYSTEMS.flatMap((sys) => sys.menus).find((m) => m.key === menuKey);
    if (!menu) return;
    perms = setLeaves(perms, leafKeysOfMenu(menu), level);
  });
  return perms;
}

const LEGACY_MODULE_KEYS = [
  'phcis.dashboard', 'phcis.mr', 'phcis.opd', 'phcis.treatment',
  'phcis.radiology', 'phcis.pharmacy', 'phcis.finance', 'phcis.appointment',
  'consent.dashboard', 'consent.manage', 'consent.forms', 'consent.create',
  'consent.access', 'consent.reports',
  'edocument.dashboard', 'edocument.catalog', 'edocument.create',
];

/* ตัวเลือกศูนย์บริการ = ศูนย์บริการสาธารณสุขทั้ง 69 ศูนย์ของสำนักอนามัย
   ══════════════════════════════════════════════════════════════════════
   ดึงจาก CLINIC_OPTIONS (HeaderClinicContext) ซึ่งเป็นแหล่งความจริงเดียว
   ของรายชื่อศูนย์ทั้งระบบ — เดิมที่นี่ hardcode ไว้แค่ 2 ตัวเลือก
   (ศูนย์ 4 + "ทุกศูนย์") ทำให้ผูกสิทธิกับศูนย์อื่นไม่ได้เลย.

   ตัด "ทุกศูนย์" ออกด้วย เพราะซ้ำซ้อนกับการเลือกหลายศูนย์อยู่แล้ว และทำให้
   ตีความกำกวมว่าหมายถึง 69 ศูนย์ ณ ตอนนี้ หรือศูนย์ที่จะเพิ่มในอนาคตด้วย. */
export { CLINIC_OPTIONS as CENTER_OPTIONS } from '@/components/layout/HeaderClinicContext';

/* ══════════════════════════════════════════════════════════════════════
   สถานะการอนุมัติสิทธิ์ (มติ คทง.13 §1.3 — "บริหารจัดการสิทธิ์
   เพิ่ม/ลด/แก้ไข/**อนุมัติ**") — แม่แบบสิทธิ์ที่ยังไม่อนุมัติจะยังไม่มีผล
   ══════════════════════════════════════════════════════════════════════ */
export const APPROVAL_DRAFT = 'draft';
export const APPROVAL_PENDING = 'pending';
export const APPROVAL_APPROVED = 'approved';
export const APPROVAL_REJECTED = 'rejected';

export const APPROVAL_META = {
  [APPROVAL_DRAFT]: { label: 'ร่าง', badge: 'grey' },
  [APPROVAL_PENDING]: { label: 'รออนุมัติ', badge: 'yellow' },
  [APPROVAL_APPROVED]: { label: 'อนุมัติแล้ว', badge: 'green' },
  [APPROVAL_REJECTED]: { label: 'ไม่อนุมัติ', badge: 'red' },
};

export const approvalLabel = (status) => (APPROVAL_META[status] || APPROVAL_META[APPROVAL_DRAFT]).label;

/* ══════════════════════════════════════════════════════════════════════
   ขอบเขตข้อมูลที่มองเห็น (Data Scope) — มติร่วม คทง.2/3/4:
   "ศบส. เห็นเฉพาะข้อมูลของตนเอง · กองแผนงานเห็นภาพรวมทุกศูนย์ ·
   ผู้บริหารเห็นสรุปทั้งหมด" + คทง.4: อสส. เห็นเฉพาะเคสที่ได้รับมอบหมาย
   ══════════════════════════════════════════════════════════════════════ */
export const SCOPE_ASSIGNED = 'assigned';
export const SCOPE_CENTER = 'center';
export const SCOPE_ZONE = 'zone';
export const SCOPE_ALL = 'all';

export const DATA_SCOPE_OPTIONS = [
  { value: SCOPE_ASSIGNED, label: 'เฉพาะเคสที่ได้รับมอบหมาย', hint: 'อสส./ผู้ช่วยงานชุมชน — เห็นเฉพาะรายที่ถูกจ่ายงานให้' },
  { value: SCOPE_CENTER, label: 'เฉพาะศูนย์ของตนเอง', hint: 'ค่าเริ่มต้นของเจ้าหน้าที่ ศบส.' },
  { value: SCOPE_ZONE, label: 'ทุกศูนย์ในกลุ่มเขต', hint: 'หัวหน้ากลุ่มเขต/ผู้นิเทศ' },
  { value: SCOPE_ALL, label: 'ทุกศูนย์ (ภาพรวมสำนักอนามัย)', hint: 'กองแผนงาน/ผู้บริหาร — ดูสรุปได้ทั้งหมด' },
];

export const dataScopeLabel = (scope) => DATA_SCOPE_OPTIONS.find((o) => o.value === scope)?.label
  || DATA_SCOPE_OPTIONS.find((o) => o.value === SCOPE_CENTER).label;

/* มติ คทง.10 ครั้งที่ 4–5 + คทง.11 ครั้งที่ 2 — ระดับกอง/ผู้บริหารดูได้แค่
   ภาพรวม "ไม่แสดงข้อมูลระบุตัวตน" (HN/ชื่อ/เลขบัตร) และ drill-down ใช้
   รหัสนิรนามเท่านั้น จึงเป็นสวิตช์แยกจากขอบเขตข้อมูล */
export const PII_VISIBLE = 'visible';
export const PII_MASKED = 'masked';

export const PII_OPTIONS = [
  { value: PII_VISIBLE, label: 'เห็นข้อมูลระบุตัวตน (HN / ชื่อ / เลขบัตร)' },
  { value: PII_MASKED, label: 'ปิดบังข้อมูลระบุตัวตน — ดูสรุป/รหัสนิรนามเท่านั้น' },
];

export const piiLabel = (v) => (v === PII_MASKED ? 'ปิดบังข้อมูลระบุตัวตน' : 'เห็นข้อมูลระบุตัวตน');

/** ค่าเริ่มต้นของแม่แบบใหม่ (ปลอดภัยไว้ก่อน: ศูนย์ตนเอง + ยังไม่อนุมัติ) */
export const ACCESS_GOVERNANCE_DEFAULTS = {
  approvalStatus: APPROVAL_DRAFT,
  approvalNote: '',
  approvedBy: '',
  approvedAt: '',
  submittedAt: '',
  effectiveFrom: '',
  effectiveTo: '',
  /* ช่วงเวลาเข้าใช้งานรายวัน (Figma "PHCIS | History and Access" — access-time
     window เช่น 08.00-16.00 น.) — ต่างจาก effectiveFrom/To ที่เป็น "ช่วงวัน"
     เว้นว่างทั้งคู่ = เข้าได้ตลอด 24 ชม. */
  dailyFrom: '',
  dailyTo: '',
  dataScope: SCOPE_CENTER,
  piiVisibility: PII_VISIBLE,
};

/* ══════════════════════════════════════════════════════════════════════
   ช่วงเวลาเข้าใช้งานรายวัน
   ══════════════════════════════════════════════════════════════════════ */

const hhmmToMinutes = (t) => {
  /* ค่าว่างต้องคืน null ไม่ใช่ 0 — Number('') = 0 ทำให้ "ไม่กำหนดเวลา"
     กลายเป็นหน้าต่าง 00:00-00:00 คือเข้าได้แค่เที่ยงคืนพอดี */
  if (!t) return null;
  const [h, m] = String(t).split(':');
  const hh = Number(h);
  const mm = Number(m);
  return Number.isNaN(hh) ? null : hh * 60 + (Number.isNaN(mm) ? 0 : mm);
};

/** '08:00' → '08.00' (รูปแบบราชการไทย 24 ชม.) */
export const formatAccessTime = (t) => {
  /* ต้องเช็คค่าว่างก่อน — Number('') = 0 ไม่ใช่ NaN ทำให้ช่องว่างกลายเป็น "00.00" */
  if (!t) return '';
  const [h, m] = String(t).split(':');
  const hh = Number(h);
  if (Number.isNaN(hh)) return '';
  return `${String(hh).padStart(2, '0')}.${(m || '00').padStart(2, '0')}`;
};

/** ข้อความช่วงเวลารายวัน — 'ตลอด 24 ชม.' ถ้าไม่ได้กำหนด
    followCenterHours = เดินตามเวลาเปิด-ปิดของศูนย์ที่ผูกไว้ (26 ส.ค. 2569 มติผู้ใช้) */
export function formatDailyWindow(record) {
  if (record?.followCenterHours) return 'ตามเวลาเปิด-ปิดศูนย์';
  const from = formatAccessTime(record?.dailyFrom);
  const to = formatAccessTime(record?.dailyTo);
  if (!from && !to) return 'ตลอด 24 ชม.';
  return `${from || '00.00'} - ${to || '24.00'} น.`;
}

/** เวลาเปิด-ปิดวันธรรมดาของศูนย์ที่แม่แบบผูกไว้ — ไม่ได้ผูกศูนย์/หาไม่เจอ
    ถือว่าไม่จำกัดเวลา (จะได้ไม่ล็อกคนออกจากระบบเพราะข้อมูลศูนย์ยังไม่ครบ) */
function centerHoursOf(record) {
  const detail = record?.centerId ? findCenterDetail(record.centerId) : null;
  const weekday = detail?.hours?.weekday || detail?.hours || {};
  return { from: weekday.inStart || '', to: weekday.inEnd || '' };
}

/** ตอนนี้อยู่ในช่วงเวลาเข้าใช้งานรายวันไหม — ไม่กำหนด = ได้ตลอด
    รองรับช่วงข้ามเที่ยงคืน (เช่น 20:00-06:00 สำหรับเวรดึก) */
export function isWithinDailyWindow(record, now = new Date()) {
  const win = record?.followCenterHours
    ? centerHoursOf(record)
    : { from: record?.dailyFrom, to: record?.dailyTo };
  const from = hhmmToMinutes(win.from);
  const to = hhmmToMinutes(win.to);
  if (from == null && to == null) return true;
  const cur = now.getHours() * 60 + now.getMinutes();
  const start = from == null ? 0 : from;
  const end = to == null ? 24 * 60 : to;
  return start <= end ? (cur >= start && cur <= end) : (cur >= start || cur <= end);
}

/** เข้าใช้ได้ ณ ตอนนี้จริงไหม = มีผลบังคับใช้ + อยู่ในช่วงเวลารายวัน */
export function isAccessOpenNow(record, now = new Date()) {
  return isAccessEffective(record, now.toISOString().slice(0, 10))
    && isWithinDailyWindow(record, now);
}

/** แม่แบบมีผลบังคับใช้จริงหรือยัง — ต้องอนุมัติแล้ว + เปิดใช้งาน + อยู่ในช่วงเวลา
    (คทง.13 §2.3 — กำหนดช่วงเวลาการเข้าถึงข้อมูล Start/End ได้) */
export function isAccessEffective(record, today = new Date().toISOString().slice(0, 10)) {
  if (!record || record.active === false) return false;
  if ((record.approvalStatus || APPROVAL_DRAFT) !== APPROVAL_APPROVED) return false;
  if (record.effectiveFrom && today < record.effectiveFrom) return false;
  if (record.effectiveTo && today > record.effectiveTo) return false;
  return true;
}

export function submitForApproval(record, note = '') {
  return {
    ...record,
    approvalStatus: APPROVAL_PENDING,
    approvalNote: note,
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function decideApproval(record, approved, approver, note = '') {
  return {
    ...record,
    approvalStatus: approved ? APPROVAL_APPROVED : APPROVAL_REJECTED,
    approvedBy: approver,
    approvedAt: new Date().toISOString(),
    approvalNote: note || record.approvalNote || '',
    updatedAt: new Date().toISOString(),
  };
}

export const DEMO_ACCESS_CONTROLS = [
  {
    id: 'ac-demo-dentist',
    templateName: 'สิทธิทันตแพทย์ — บันทึกการรักษา',
    version: 2,
    versionHistory: [
      { version: 1, savedAt: '2026-07-02T09:15:00.000Z', note: 'ฉบับตั้งต้น', permissions: {} },
    ],
    updatedAt: '2026-08-01T04:30:00.000Z',
    center: 'ศูนย์ 4 ดินแดง',
    centerId: 'hc-4',
    activity: 'ทันตแพทย์',
    position: 'ผู้เชี่ยวชาญ (Specialist)',
    positionId: 'pos-specialist',
    activityId: 'act-dentist',
    subActivity: 'ตรวจรักษาทางทันตกรรม',
    subActivityId: 'sub-dent-opd',
    department: 'ทันตกรรม',
    departmentId: 'dept-dent',
    description: 'เข้าถึงเพียงระบบบันทึกการรักษา',
    active: true,
    approvalStatus: APPROVAL_APPROVED,
    approvedBy: 'ผู้อำนวยการศูนย์ 4',
    approvedAt: '2026-08-01T04:35:00.000Z',
    effectiveFrom: '2026-08-01',
    effectiveTo: '',
    dailyFrom: '07:30',
    dailyTo: '17:30',
    dataScope: SCOPE_CENTER,
    piiVisibility: PII_VISIBLE,
    permissions: grantMenus({
      'phcis.treat': LEVEL_EDIT,
      'phcis.dental': LEVEL_EDIT,
      'phcis.registration': LEVEL_VIEW,
      'phcis.opd': LEVEL_VIEW,
      'phcis.radiology': LEVEL_VIEW,
      'phcis.dashboard': LEVEL_VIEW,
      'consent.consent-manage': LEVEL_VIEW,
    }),
  },
  {
    id: 'ac-demo-nurse-opd',
    templateName: 'สิทธิพยาบาลผู้ป่วยนอก',
    version: 1,
    versionHistory: [],
    updatedAt: '2026-07-20T02:10:00.000Z',
    center: 'ศูนย์ 4 ดินแดง',
    centerId: 'hc-4',
    activity: 'พยาบาลวิชาชีพ',
    position: 'ปฏิบัติการ',
    positionId: 'pos-practitioner',
    activityId: 'gp-nurse',
    subActivity: 'คัดกรองและซักประวัติ (OPD)',
    subActivityId: 'sb-opd',
    department: 'ผู้ป่วยนอก (OPD)',
    departmentId: 'dept-opd',
    description: 'คัดกรอง บันทึกสัญญาณชีพ และดูผลตรวจ',
    active: true,
    approvalStatus: APPROVAL_APPROVED,
    approvedBy: 'ผู้อำนวยการศูนย์ 4',
    approvedAt: '2026-07-20T02:15:00.000Z',
    effectiveFrom: '2026-07-20',
    effectiveTo: '',
    /* พยาบาล OPD เข้าระบบได้เฉพาะเวลาราชการ (Figma History & Access) */
    dailyFrom: '08:00',
    dailyTo: '16:00',
    dataScope: SCOPE_CENTER,
    piiVisibility: PII_VISIBLE,
    permissions: grantMenus({
      'phcis.opd': LEVEL_EDIT,
      'phcis.registration': LEVEL_EDIT,
      'phcis.observation': LEVEL_EDIT,
      'phcis.vaccine': LEVEL_EDIT,
      'phcis.treat': LEVEL_VIEW,
      'phcis.queue-center': LEVEL_VIEW,
      'phcis.dashboard': LEVEL_VIEW,
    }),
  },
  {
    id: 'ac-demo-pharmacist',
    templateName: 'สิทธิเภสัชกรจ่ายยา',
    version: 3,
    versionHistory: [
      { version: 1, savedAt: '2026-06-11T03:00:00.000Z', note: 'ฉบับตั้งต้น', permissions: {} },
      { version: 2, savedAt: '2026-07-09T07:25:00.000Z', note: 'เปิดสิทธิดูคลังยา', permissions: {} },
    ],
    updatedAt: '2026-08-04T06:40:00.000Z',
    center: 'ศูนย์ 15 ห้วยขวาง (เจ้าคุณพระประยูรวงศ์)',
    centerId: 'hc-15',
    activity: 'เภสัชกร',
    position: 'ปฏิบัติการ',
    positionId: 'pos-practitioner',
    activityId: 'gp-pharmacist',
    subActivity: 'จ่ายยาผู้ป่วยนอก',
    subActivityId: 'sb-dispense',
    department: 'เภสัชกรรม',
    departmentId: 'dept-pharm',
    description: 'จ่ายยาตามคำสั่งแพทย์ และดูประวัติการรักษา',
    active: true,
    approvalStatus: APPROVAL_APPROVED,
    approvedBy: 'ผู้อำนวยการศูนย์ 15',
    approvedAt: '2026-08-04T06:45:00.000Z',
    effectiveFrom: '2026-08-04',
    effectiveTo: '',
    dataScope: SCOPE_CENTER,
    piiVisibility: PII_VISIBLE,
    permissions: grantMenus({
      'phcis.pharmacy': LEVEL_EDIT,
      'phcis.treat': LEVEL_VIEW,
      'phcis.registration': LEVEL_VIEW,
      'phcis.dashboard': LEVEL_VIEW,
    }),
  },
  {
    id: 'ac-demo-registrar',
    templateName: 'สิทธิเจ้าหน้าที่เวชระเบียน',
    version: 1,
    versionHistory: [],
    updatedAt: '2026-07-28T01:05:00.000Z',
    center: 'ศูนย์ 4 ดินแดง',
    centerId: 'hc-4',
    activity: 'เจ้าหน้าที่เวชระเบียน',
    position: '',
    positionId: '',
    activityId: 'gp-registrar',
    subActivity: 'จุดคัดกรอง/ลงทะเบียนและตรวจสอบสิทธิ',
    subActivityId: 'sb-reg-front',
    department: 'เวชระเบียน',
    departmentId: 'dept-reg',
    description: 'ลงทะเบียนผู้รับบริการและออกคิว',
    active: true,
    approvalStatus: APPROVAL_APPROVED,
    approvedBy: 'ผู้อำนวยการศูนย์ 4',
    approvedAt: '2026-07-28T01:10:00.000Z',
    effectiveFrom: '2026-07-28',
    effectiveTo: '',
    dataScope: SCOPE_CENTER,
    piiVisibility: PII_VISIBLE,
    permissions: grantMenus({
      'phcis.registration': LEVEL_EDIT,
      'phcis.opd': LEVEL_EDIT,
      'phcis.rights': LEVEL_EDIT,
      'phcis.queue-center': LEVEL_EDIT,
      'phcis.finance': LEVEL_VIEW,
      'phcis.dashboard': LEVEL_VIEW,
    }),
  },
  {
    id: 'ac-demo-social-worker',
    templateName: 'สิทธินักสังคมสงเคราะห์ศูนย์',
    version: 1,
    versionHistory: [],
    updatedAt: '2026-08-18T03:20:00.000Z',
    center: 'ศูนย์ 4 ดินแดง',
    centerId: 'hc-4',
    activity: 'นักสังคมสงเคราะห์',
    position: 'ปฏิบัติการ',
    positionId: 'pos-practitioner',
    activityId: 'act-social-worker',
    subActivity: 'นักสังคมสงเคราะห์ศูนย์',
    subActivityId: 'sub-sw-center',
    department: 'สังคมสงเคราะห์',
    departmentId: 'dept-social',
    description: 'เยี่ยมบ้าน ประเมินสภาพสังคม และบันทึกการช่วยเหลือ',
    active: true,
    /* ตัวอย่างแม่แบบที่ส่งขออนุมัติแล้วแต่ยังไม่มีผลบังคับใช้ (คทง.13 §1.3) */
    approvalStatus: APPROVAL_PENDING,
    submittedAt: '2026-08-18T03:25:00.000Z',
    approvalNote: 'ขอเปิดสิทธิ์ให้ทีมสังคมสงเคราะห์ปีงบ 69',
    effectiveFrom: '2026-09-01',
    effectiveTo: '2027-09-30',
    dataScope: SCOPE_CENTER,
    piiVisibility: PII_VISIBLE,
    permissions: grantMenus({
      'phcis.social': LEVEL_EDIT,
      'phcis.homevisit': LEVEL_EDIT,
      'consent.consent-manage': LEVEL_EDIT,
      'consent.consent-forms': LEVEL_VIEW,
      'phcis.registration': LEVEL_VIEW,
      'phcis.treat': LEVEL_VIEW,
    }),
  },
  {
    id: 'ac-demo-admin',
    templateName: 'สิทธิผู้ดูแลระบบศูนย์',
    version: 2,
    versionHistory: [
      { version: 1, savedAt: '2026-05-30T04:00:00.000Z', note: 'ฉบับตั้งต้น', permissions: {} },
    ],
    updatedAt: '2026-08-06T09:15:00.000Z',
    center: 'ศูนย์ 4 ดินแดง',
    centerId: 'hc-4',
    /* ตัวอย่างแม่แบบที่ยังไม่ผูกบทบาท — ตั้งชื่อไว้ก่อนได้ */
    position: '',
    positionId: '',
    activity: '',
    activityId: '',
    subActivity: '',
    subActivityId: '',
    department: '',
    departmentId: '',
    description: 'เข้าถึงได้ทุกโมดูลในศูนย์ที่รับผิดชอบ',
    active: true,
    approvalStatus: APPROVAL_APPROVED,
    approvedBy: 'ผู้อำนวยการสำนักอนามัย',
    approvedAt: '2026-08-06T09:20:00.000Z',
    effectiveFrom: '2026-08-06',
    effectiveTo: '',
    dataScope: SCOPE_ZONE,
    piiVisibility: PII_VISIBLE,
    permissions: grantMenus({
      'system.system-overview': LEVEL_EDIT,
      'system.system-centers': LEVEL_EDIT,
      'system.system-structures': LEVEL_EDIT,
      'system.assess-positions': LEVEL_EDIT,
      'system.assess-activity': LEVEL_EDIT,
      'system.assess-access-control': LEVEL_EDIT,
      'system.system-staff': LEVEL_EDIT,
      'system.system-holidays': LEVEL_EDIT,
      'audit.audit-overview': LEVEL_VIEW,
      'audit.audit-log': LEVEL_VIEW,
      'phcis.dashboard': LEVEL_VIEW,
    }),
  },
  {
    id: 'ac-demo-lab',
    templateName: 'สิทธินักเทคนิคการแพทย์',
    version: 1,
    versionHistory: [],
    updatedAt: '2026-07-15T05:30:00.000Z',
    center: 'ศูนย์ 35 หัวหมาก',
    centerId: 'hc-35',
    activity: 'นักเทคนิคการแพทย์',
    position: 'ปฏิบัติการ',
    positionId: 'pos-practitioner',
    activityId: 'gp-medtech',
    subActivity: 'ห้องปฏิบัติการชันสูตรโรค',
    subActivityId: 'sb-lab',
    department: 'ห้องปฏิบัติการ',
    departmentId: 'dept-lab',
    description: 'รับสิ่งส่งตรวจและรายงานผลแล็บ',
    active: false,
    /* ตัวอย่างแม่แบบร่าง — ยังไม่ส่งขออนุมัติ จึงยังไม่มีผล */
    approvalStatus: APPROVAL_DRAFT,
    effectiveFrom: '',
    effectiveTo: '',
    dataScope: SCOPE_CENTER,
    piiVisibility: PII_VISIBLE,
    permissions: grantMenus({
      'phcis.lab': LEVEL_EDIT,
      'phcis.radiology': LEVEL_VIEW,
      'phcis.treat': LEVEL_VIEW,
      'phcis.registration': LEVEL_VIEW,
      'phcis.dashboard': LEVEL_VIEW,
    }),
  },
  {
    /* มติ คทง.4 — อสส. ล็อกอินบันทึกงานเองได้ แต่เห็นเฉพาะเคสที่ถูกจ่ายงานให้ */
    id: 'ac-demo-volunteer',
    templateName: 'สิทธิอาสาสมัครสาธารณสุข (อสส.)',
    version: 1,
    versionHistory: [],
    updatedAt: '2026-08-22T02:00:00.000Z',
    center: 'ศูนย์ 4 ดินแดง',
    centerId: 'hc-4',
    activity: 'อาสาสมัครสาธารณสุข (อสส.)',
    position: '',
    positionId: '',
    activityId: 'act-volunteer',
    subActivity: 'เยี่ยมบ้านตามที่ได้รับมอบหมาย',
    subActivityId: 'sub-vol-visit',
    department: 'ส่งเสริมสุขภาพชุมชน',
    departmentId: 'dept-community',
    description: 'บันทึกผลปฏิบัติงานเยี่ยมบ้านเฉพาะรายที่ได้รับมอบหมาย',
    active: true,
    approvalStatus: APPROVAL_APPROVED,
    approvedBy: 'ผู้อำนวยการศูนย์ 4',
    approvedAt: '2026-08-22T02:05:00.000Z',
    effectiveFrom: '2026-08-22',
    effectiveTo: '',
    dataScope: SCOPE_ASSIGNED,
    piiVisibility: PII_VISIBLE,
    permissions: grantMenus({
      'phcis.homevisit': LEVEL_VIEW,
      'phcis.registration': LEVEL_VIEW,
      'consent.consent-manage': LEVEL_VIEW,
      'phcis.dashboard': LEVEL_VIEW,
    }),
  },
  {
    /* มติ คทง.10 ครั้งที่ 4–5 + คทง.11 ครั้งที่ 2 — ระดับกอง/ผู้บริหารเห็น
       ภาพรวมทุกศูนย์ แต่ต้องปิดบังข้อมูลระบุตัวตน (PII) */
    id: 'ac-demo-planning-div',
    templateName: 'สิทธิกองแผนงาน — ภาพรวมทุกศูนย์ (ไม่แสดง PII)',
    version: 1,
    versionHistory: [],
    updatedAt: '2026-08-22T02:10:00.000Z',
    center: 'ศูนย์ 4 ดินแดง',
    centerId: 'hc-4',
    activity: 'ผู้ดูแลระบบ',
    position: '',
    positionId: '',
    activityId: 'gp-admin',
    subActivity: 'ผู้ดูแลระบบส่วนกลาง (สำนักอนามัย)',
    subActivityId: 'sb-superadmin',
    department: '',
    departmentId: '',
    description: 'ดูรายงาน/แดชบอร์ดรวมทุกศูนย์ ไม่เห็น HN/ชื่อ/เลขบัตร',
    active: true,
    approvalStatus: APPROVAL_APPROVED,
    approvedBy: 'ผู้อำนวยการสำนักอนามัย',
    approvedAt: '2026-08-22T02:15:00.000Z',
    effectiveFrom: '2026-08-22',
    effectiveTo: '',
    dataScope: SCOPE_ALL,
    piiVisibility: PII_MASKED,
    permissions: grantMenus({
      'phcis.dashboard': LEVEL_VIEW,
      'audit.audit-overview': LEVEL_VIEW,
    }),
  },
];

/** สิทธิ์เริ่มต้น = ไม่มีสิทธิ์ทุกเมนู/เมนูย่อยของทุกระบบ */
export function defaultPermissions() {
  return emptyPermissions();
}

/* record ยุค Group Policy → รูปกิจกรรม (field ใหม่มาก่อน ถ้ามีทั้งคู่) */
function normalizeAccessControl(record) {
  if (!record) return record;
  const {
    groupPolicy, groupPolicyId, subBranch, subBranchId, ...rest
  } = record;
  return {
    ...ACCESS_GOVERNANCE_DEFAULTS,
    ...rest,
    activity: rest.activity ?? groupPolicy ?? '',
    activityId: rest.activityId ?? groupPolicyId ?? '',
    subActivity: rest.subActivity ?? subBranch ?? '',
    subActivityId: rest.subActivityId ?? subBranchId ?? '',
    /* ตำแหน่งเพิ่งเข้ามาเป็นตัวกำหนดสิทธิ์ (26 ส.ค. 2569) — record เดิมไม่มี
       field นี้ อ่านเป็นค่าว่าง = ไม่จำกัดตำแหน่ง */
    position: rest.position ?? '',
    positionId: rest.positionId ?? '',
    /* สิทธิ์ยุคโมดูลแบน ๆ ถูกกระจายลงเมนู/เมนูย่อยให้อัตโนมัติ (26 ส.ค. 2569) */
    permissions: normalizePermissions(rest.permissions),
  };
}

/** ทะเบียนว่าง (เบราว์เซอร์ใหม่) ให้คืนชุดตั้งต้น — ไม่งั้นหน้าสิทธิการเข้าถึง
    ขึ้น empty state ทุกครั้งจนดูไม่ออกว่าหน้าตาใช้งานจริงเป็นยังไง.
    เขียนทับได้ทันทีที่ผู้ใช้กด "สร้างแม่แบบสิทธิ". */
export function readAccessControls() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return DEMO_ACCESS_CONTROLS.map(normalizeAccessControl);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length
      ? parsed.map(normalizeAccessControl)
      : DEMO_ACCESS_CONTROLS.map(normalizeAccessControl);
  } catch {
    return DEMO_ACCESS_CONTROLS.map(normalizeAccessControl);
  }
}

export function writeAccessControls(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function computeAccessControlStats(records) {
  const list = records || [];
  return {
    total: list.length,
    active: list.filter((r) => r.active).length,
    inactive: list.filter((r) => !r.active).length,
  };
}

/** นับ "ใบ" (เมนู/เมนูย่อย) ตามระดับสิทธิ์ — view/write/edit แยกกัน */
export function countPermissionBuckets(permissions) {
  return countPermissionLevels(permissions);
}

/* ══════════════════════════════════════════════════════════════════════
   แม่แบบสิทธิ (template) + เวอร์ชัน
   ══════════════════════════════════════════════════════════════════════
   สิทธิการเข้าถึงหนึ่งชุด = **แม่แบบ** ที่ตั้งชื่อไว้ก่อน แล้วค่อยผูกกับ
   กิจกรรม/กิจกรรมย่อยทีหลัง (ผูกหรือไม่ผูกก็บันทึกได้ — `activityId` ว่างได้)
   และ **ไม่ผูกกับตำแหน่ง** — ตำแหน่งไปกำหนดตอนเพิ่มบุคลากรแทน.

   ทุกครั้งที่บันทึกทับของเดิม เลขเวอร์ชันจะเดินหน้าขึ้น 1 และ snapshot
   ของเวอร์ชันก่อนถูกเก็บใน `versionHistory` — ระบบ **ใช้เวอร์ชันล่าสุด
   เสมอ** ส่วนเวอร์ชันเก่าเก็บไว้ให้ย้อนดู/ย้อนคืนเท่านั้น. */

export const formatVersion = (n) => `v${Number(n) || 1}`;

export function createAccessControl(draft) {
  return {
    id: uid(),
    templateName: '',
    version: 1,
    versionHistory: [],
    updatedAt: new Date().toISOString(),
    active: true,
    permissions: defaultPermissions(),
    ...ACCESS_GOVERNANCE_DEFAULTS,
    ...draft,
  };
}

/** เวอร์ชันล่าสุดของแม่แบบ (record ที่เก็บอยู่คือเวอร์ชันล่าสุดเสมอ). */
export const latestVersion = (record) => Number(record?.version) || 1;

/** snapshot เวอร์ชันปัจจุบันลง history แล้วเดินเลขเวอร์ชันขึ้นหนึ่งขั้น. */
export function bumpAccessControlVersion(record, note = '') {
  const current = latestVersion(record);
  const snapshot = {
    version: current,
    savedAt: record.updatedAt || new Date().toISOString(),
    note: record.versionNote || '',
    permissions: { ...(record.permissions || {}) },
  };
  return {
    ...record,
    version: current + 1,
    versionNote: note,
    updatedAt: new Date().toISOString(),
    versionHistory: [...(record.versionHistory || []), snapshot],
  };
}

/** ทำสำเนาแม่แบบ — id ใหม่, ชื่อต่อท้าย (สำเนา), เริ่มนับเวอร์ชันใหม่ที่ 1. */
export function duplicateAccessControl(record) {
  return {
    ...record,
    id: uid(),
    templateName: `${record.templateName || 'แม่แบบสิทธิ'} (สำเนา)`,
    version: 1,
    versionNote: '',
    versionHistory: [],
    updatedAt: new Date().toISOString(),
    permissions: { ...(record.permissions || {}) },
  };
}

export function findAccessControl(id) {
  return readAccessControls().find((r) => r.id === id) || null;
}

export function upsertAccessControl(record) {
  const list = readAccessControls();
  const idx = list.findIndex((r) => r.id === record.id);
  const next = idx >= 0
    ? list.map((r, i) => (i === idx ? record : r))
    : [...list, record];
  writeAccessControls(next);
  return record;
}

/* ══════════════════════════════════════════════════════════════════════
   ABAC — จับคู่ "แม่แบบสิทธิ์" กับ "บุคลากร" ด้วย attribute
   ══════════════════════════════════════════════════════════════════════
   แม่แบบไม่ได้ผูกกับตัวบุคคลโดยตรง แต่ผูกกับคุณลักษณะของการปฏิบัติงาน
   (ศูนย์บริการ · กิจกรรม · กิจกรรมย่อย · แผนก) ตามข้อกำหนด TOR §1.17 /
   §1.4 ที่ให้ใช้ ABAC ซ้อนบน role — บุคลากรคนหนึ่งจึงได้สิทธิ์จาก
   assignment ของตัวเองโดยอัตโนมัติ ไม่ต้องมากดผูกทีละคน

   กติกาการจับคู่: attribute ไหนที่ "แม่แบบเว้นว่าง" = ไม่จำกัด ·
   attribute ไหนที่แม่แบบระบุไว้ assignment ต้องตรงเป๊ะ (assignment ที่
   ไม่ได้ระบุค่าไว้ถือว่าไม่ตรง — ปลอดภัยไว้ก่อน) */

/* ══════════════════════════════════════════════════════════════════════
   การผูกแม่แบบกับคน — เลือกแม่แบบตอนเพิ่มบุคลากร (26 ส.ค. 2569 มติผู้ใช้)
   ══════════════════════════════════════════════════════════════════════
   เดิมแม่แบบถือ ศูนย์/สาขา/แผนก/ตำแหน่ง/บทบาท ไว้เอง แล้วจับคู่กับ assignment
   ของบุคลากรแบบ ABAC — ผลคือคนคนหนึ่งได้สิทธิ์อะไรบ้างต้องไล่เดาจากคุณสมบัติ
   และแม่แบบที่ระบุคุณสมบัติกว้าง ๆ ก็เผลอคลุมคนที่ไม่ตั้งใจ

   ตอนนี้แม่แบบเป็น "ชุดสิทธิ์ที่ตั้งชื่อไว้" ล้วน ๆ ส่วนการผูกกับคนไปทำที่ฟอร์ม
   เพิ่มบุคลากร (assignment.accessTemplateId) — ใครได้สิทธิ์อะไรจึงอ่านจากตัว
   assignment ได้ตรง ๆ ไม่ต้องเดา */
export function matchesAssignment(record, assignment) {
  if (!record || !assignment) return false;
  if (assignment.active === false) return false;
  return assignment.accessTemplateId === record.id;
}

/** assignment ทั้งหมดของบุคลากรที่เข้าเงื่อนไขแม่แบบนี้ */
export function matchingAssignments(record, user) {
  return (user?.assignments || []).filter((a) => matchesAssignment(record, a));
}

/** บุคลากรที่ถือสิทธิ์ตามแม่แบบนี้ — คืน [{ user, assignments }] */
export function usersHoldingTemplate(record, users) {
  return (users || [])
    .filter((u) => u.active !== false)
    .map((user) => ({ user, assignments: matchingAssignments(record, user) }))
    .filter((row) => row.assignments.length > 0);
}

/* ลำดับความ "กว้าง" ของสิทธิ์ — ใช้รวมสิทธิ์จากหลายแม่แบบแบบ union
   (ได้สิทธิ์กว้างสุดที่แม่แบบใดแม่แบบหนึ่งให้ไว้)

   ใช้ LEVEL_* (ตัวที่ import เข้ามาจริง) ไม่ใช่ PERM_* — บล็อก `export { PERM_NONE,
   … } from '@/data/accessMenuCatalog'` ข้างบนเป็น re-export ล้วน ไม่ได้สร้าง
   binding ในไฟล์นี้ อ้าง PERM_NONE ตรง ๆ จึงเป็น ReferenceError ตอนรัน
   (dev server จอขาวทั้งแอป — prod bundle รอดเพราะ rollup รวมไฟล์ให้) */
const PERM_RANK = { [LEVEL_NONE]: 0, [LEVEL_VIEW]: 1, [LEVEL_EDIT]: 2 };
const SCOPE_RANK = {
  [SCOPE_ASSIGNED]: 0, [SCOPE_CENTER]: 1, [SCOPE_ZONE]: 2, [SCOPE_ALL]: 3,
};

/** สิทธิ์ที่บุคลากรคนนี้ได้รับจริง — รวมจากทุกแม่แบบที่อนุมัติแล้วและยังมีผล
    คืน { templates, modules, dataScope, piiVisibility, openNow } */
export function resolveUserAccess(user, records, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const matched = (records || [])
    .filter((r) => isAccessEffective(r, today))
    .map((record) => ({ record, assignments: matchingAssignments(record, user) }))
    .filter((row) => row.assignments.length > 0);

  const modules = {};
  ALL_LEAF_KEYS.forEach((k) => { modules[k] = { level: LEVEL_NONE, sources: [] }; });

  let dataScope = SCOPE_ASSIGNED;
  let piiVisibility = PII_MASKED;

  matched.forEach(({ record }) => {
    ALL_LEAF_KEYS.forEach((k) => {
      const lvl = record.permissions?.[k] || LEVEL_NONE;
      if (lvl === LEVEL_NONE) return;
      const cur = modules[k];
      if (PERM_RANK[lvl] > PERM_RANK[cur.level]) cur.level = lvl;
      if (!cur.sources.includes(record.templateName)) cur.sources.push(record.templateName);
    });
    if (SCOPE_RANK[record.dataScope] > SCOPE_RANK[dataScope]) dataScope = record.dataScope;
    if (record.piiVisibility !== PII_MASKED) piiVisibility = PII_VISIBLE;
  });

  return {
    templates: matched,
    modules,
    dataScope: matched.length ? dataScope : SCOPE_ASSIGNED,
    piiVisibility: matched.length ? piiVisibility : PII_MASKED,
    /* ตอนนี้เข้าใช้ได้ไหม — ขอแค่แม่แบบใดแม่แบบหนึ่งเปิดอยู่ */
    openNow: matched.some(({ record }) => isWithinDailyWindow(record, now)),
  };
}

export function loadDemoAccessControls() {
  writeAccessControls(DEMO_ACCESS_CONTROLS);
  return DEMO_ACCESS_CONTROLS;
}
