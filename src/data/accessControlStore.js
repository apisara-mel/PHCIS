/* PHCIS | Assess-control — Access rights (Figma 4D3nTx53 · 12:41101).
   Mock persistence via localStorage.

   แม่แบบสิทธิ์ผูกกับ **กิจกรรม (Activity)** — record ที่เคยบันทึกในยุค
   Group Policy (`groupPolicyId`/`subBranchId`) ถูก normalize เป็น
   `activityId`/`subActivityId` อัตโนมัติตอนอ่าน. */

const STORAGE_KEY = 'mih:assess-access-control';

const uid = () => `ac-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const PERM_NONE = 'none';
export const PERM_VIEW = 'view';
export const PERM_EDIT = 'edit';

export const PHCIS_MODULES = [
  { key: 'phcis.dashboard', label: 'แดชบอร์ด' },
  { key: 'phcis.mr', label: 'งานเวชระเบียน' },
  { key: 'phcis.opd', label: 'ระบบงานผู้รับบริการนอก' },
  { key: 'phcis.treatment', label: 'ระบบบันทึกการรักษา' },
  { key: 'phcis.radiology', label: 'แผนกรังสีวินิจฉัย' },
  { key: 'phcis.pharmacy', label: 'ระบบงานเภสัชกรรม' },
  { key: 'phcis.finance', label: 'งานการเงิน' },
  { key: 'phcis.appointment', label: 'ระบบนัดหมาย' },
];

export const CONSENT_MODULES = [
  { key: 'consent.dashboard', label: 'แดชบอร์ด' },
  { key: 'consent.manage', label: 'จัดการความยินยอม' },
  { key: 'consent.forms', label: 'แบบฟอร์มความยินยอม' },
  { key: 'consent.create', label: 'สร้างแบบฟอร์มจัดการความยินยอมใหม่' },
  { key: 'consent.access', label: 'จัดการสิทธิ์การเข้าถึง' },
  { key: 'consent.reports', label: 'สถิติและรายงาน' },
];

export const EDOCUMENT_MODULES = [
  { key: 'edocument.dashboard', label: 'แดชบอร์ด' },
  { key: 'edocument.catalog', label: 'คลังเอกสาร e-document ทั้งหมด' },
  { key: 'edocument.create', label: 'สร้างเอกสาร e-document ใหม่' },
];

export const ALL_MODULE_KEYS = [
  ...PHCIS_MODULES.map((m) => m.key),
  ...CONSENT_MODULES.map((m) => m.key),
  ...EDOCUMENT_MODULES.map((m) => m.key),
];

/* ตัวเลือกศูนย์บริการ = ศูนย์บริการสาธารณสุขทั้ง 69 ศูนย์ของสำนักอนามัย
   ══════════════════════════════════════════════════════════════════════
   ดึงจาก CLINIC_OPTIONS (HeaderClinicContext) ซึ่งเป็นแหล่งความจริงเดียว
   ของรายชื่อศูนย์ทั้งระบบ — เดิมที่นี่ hardcode ไว้แค่ 2 ตัวเลือก
   (ศูนย์ 4 + "ทุกศูนย์") ทำให้ผูกสิทธิกับศูนย์อื่นไม่ได้เลย.

   ตัด "ทุกศูนย์" ออกด้วย เพราะซ้ำซ้อนกับการเลือกหลายศูนย์อยู่แล้ว และทำให้
   ตีความกำกวมว่าหมายถึง 69 ศูนย์ ณ ตอนนี้ หรือศูนย์ที่จะเพิ่มในอนาคตด้วย. */
export { CLINIC_OPTIONS as CENTER_OPTIONS } from '@/components/layout/HeaderClinicContext';

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
    activity: 'แพทย์',
    activityId: 'gp-doctor',
    subActivity: 'ทันตแพทย์',
    subActivityId: 'sb-dent',
    department: 'ทันตกรรม',
    departmentId: 'dept-dent',
    description: 'เข้าถึงเพียงระบบบันทึกการรักษา',
    active: true,
    permissions: Object.fromEntries(
      ALL_MODULE_KEYS.map((k) => [k, k === 'phcis.treatment' ? PERM_EDIT : PERM_NONE]),
    ),
  },
  {
    id: 'ac-demo-nurse-opd',
    templateName: 'สิทธิพยาบาลผู้ป่วยนอก',
    version: 1,
    versionHistory: [],
    updatedAt: '2026-07-20T02:10:00.000Z',
    center: 'ศูนย์ 4 ดินแดง',
    centerId: 'hc-4',
    activity: 'พยาบาล',
    activityId: 'gp-nurse',
    subActivity: 'พยาบาลผู้ป่วยนอก (OPD)',
    subActivityId: 'sb-opd',
    department: 'ผู้ป่วยนอก (OPD)',
    departmentId: 'dept-opd',
    description: 'คัดกรอง บันทึกสัญญาณชีพ และดูผลตรวจ',
    active: true,
    permissions: Object.fromEntries(ALL_MODULE_KEYS.map((k) => {
      if (k === 'phcis.opd' || k === 'phcis.mr') return [k, PERM_EDIT];
      if (k === 'phcis.treatment' || k === 'phcis.dashboard' || k === 'phcis.appointment') return [k, PERM_VIEW];
      return [k, PERM_NONE];
    })),
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
    activityId: 'gp-pharmacist',
    subActivity: 'เภสัชกรจ่ายยา',
    subActivityId: 'sb-dispense',
    department: 'เภสัชกรรม',
    departmentId: 'dept-pharm',
    description: 'จ่ายยาตามคำสั่งแพทย์ และดูประวัติการรักษา',
    active: true,
    permissions: Object.fromEntries(ALL_MODULE_KEYS.map((k) => {
      if (k === 'phcis.pharmacy') return [k, PERM_EDIT];
      if (k === 'phcis.treatment' || k === 'phcis.mr' || k === 'phcis.dashboard') return [k, PERM_VIEW];
      return [k, PERM_NONE];
    })),
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
    activityId: 'gp-registrar',
    subActivity: 'จุดคัดกรอง/ลงทะเบียน',
    subActivityId: 'sb-reg-front',
    department: 'เวชระเบียน',
    departmentId: 'dept-reg',
    description: 'ลงทะเบียนผู้รับบริการและออกคิว',
    active: true,
    permissions: Object.fromEntries(ALL_MODULE_KEYS.map((k) => {
      if (k === 'phcis.mr' || k === 'phcis.appointment') return [k, PERM_EDIT];
      if (k === 'phcis.dashboard' || k === 'phcis.opd') return [k, PERM_VIEW];
      return [k, PERM_NONE];
    })),
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
    activityId: 'act-social-worker',
    subActivity: 'นักสังคมสงเคราะห์ศูนย์',
    subActivityId: 'sub-sw-center',
    department: 'สังคมสงเคราะห์',
    departmentId: 'dept-social',
    description: 'เยี่ยมบ้าน ประเมินสภาพสังคม และบันทึกการช่วยเหลือ',
    active: true,
    permissions: Object.fromEntries(ALL_MODULE_KEYS.map((k) => {
      if (k === 'phcis.mr' || k === 'phcis.treatment' || k === 'phcis.dashboard') return [k, PERM_VIEW];
      if (k === 'consent.manage') return [k, PERM_EDIT];
      return [k, PERM_NONE];
    })),
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
    /* ตัวอย่างแม่แบบที่ยังไม่ผูกกิจกรรม — ตั้งชื่อไว้ก่อนได้ */
    activity: '',
    activityId: '',
    subActivity: '',
    subActivityId: '',
    department: '',
    departmentId: '',
    description: 'เข้าถึงได้ทุกโมดูลในศูนย์ที่รับผิดชอบ',
    active: true,
    permissions: Object.fromEntries(ALL_MODULE_KEYS.map((k) => [k, PERM_EDIT])),
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
    activityId: 'gp-medtech',
    subActivity: 'ห้องปฏิบัติการทั่วไป',
    subActivityId: 'sb-lab',
    department: 'ห้องปฏิบัติการ',
    departmentId: 'dept-lab',
    description: 'รับสิ่งส่งตรวจและรายงานผลแล็บ',
    active: false,
    permissions: Object.fromEntries(ALL_MODULE_KEYS.map((k) => {
      if (k === 'phcis.treatment') return [k, PERM_EDIT];
      if (k === 'phcis.mr' || k === 'phcis.dashboard') return [k, PERM_VIEW];
      return [k, PERM_NONE];
    })),
  },
];

export function defaultPermissions() {
  return Object.fromEntries(ALL_MODULE_KEYS.map((k) => [k, PERM_NONE]));
}

/* record ยุค Group Policy → รูปกิจกรรม (field ใหม่มาก่อน ถ้ามีทั้งคู่) */
function normalizeAccessControl(record) {
  if (!record) return record;
  const {
    groupPolicy, groupPolicyId, subBranch, subBranchId, ...rest
  } = record;
  return {
    ...rest,
    activity: rest.activity ?? groupPolicy ?? '',
    activityId: rest.activityId ?? groupPolicyId ?? '',
    subActivity: rest.subActivity ?? subBranch ?? '',
    subActivityId: rest.subActivityId ?? subBranchId ?? '',
  };
}

/** ทะเบียนว่าง (เบราว์เซอร์ใหม่) ให้คืนชุดตั้งต้น — ไม่งั้นหน้าสิทธิการเข้าถึง
    ขึ้น empty state ทุกครั้งจนดูไม่ออกว่าหน้าตาใช้งานจริงเป็นยังไง.
    เขียนทับได้ทันทีที่ผู้ใช้กด "สร้างแม่แบบสิทธิ". */
export function readAccessControls() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return DEMO_ACCESS_CONTROLS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length
      ? parsed.map(normalizeAccessControl)
      : DEMO_ACCESS_CONTROLS;
  } catch {
    return DEMO_ACCESS_CONTROLS;
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

export function countPermissionBuckets(permissions) {
  const perms = permissions || {};
  let view = 0;
  let edit = 0;
  let none = 0;
  ALL_MODULE_KEYS.forEach((k) => {
    const p = perms[k] || PERM_NONE;
    if (p === PERM_EDIT) edit += 1;
    else if (p === PERM_VIEW) view += 1;
    else none += 1;
  });
  return { view, edit, none };
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

export function loadDemoAccessControls() {
  writeAccessControls(DEMO_ACCESS_CONTROLS);
  return DEMO_ACCESS_CONTROLS;
}
