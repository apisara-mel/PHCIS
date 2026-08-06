/* PHCIS | Assess-control — Access rights (Figma 4D3nTx53 · 12:41101).
   Mock persistence via localStorage. */

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

export const CENTER_OPTIONS = [
  { value: 'center-4', label: 'ศูนย์ 4 ดินแดง' },
  { value: 'center-all', label: 'ทุกศูนย์' },
];

export const DEMO_ACCESS_CONTROLS = [
  {
    id: 'ac-demo-dentist',
    center: 'ศูนย์ 4 ดินแดง',
    centerId: 'center-4',
    groupPolicy: 'แพทย์',
    groupPolicyId: 'gp-doctor',
    subBranch: 'ทันตแพทย์',
    subBranchId: 'sb-dent',
    department: 'ทันตกรรม',
    departmentId: 'dept-dent',
    position: 'ผู้เชี่ยวชาญ (Specialist)',
    positionId: 'pos-specialist',
    description: 'เข้าถึงเพียงระบบบันทึกการรักษา',
    active: true,
    permissions: Object.fromEntries(
      ALL_MODULE_KEYS.map((k) => [k, k === 'phcis.treatment' ? PERM_EDIT : PERM_NONE]),
    ),
  },
];

export function defaultPermissions() {
  return Object.fromEntries(ALL_MODULE_KEYS.map((k) => [k, PERM_NONE]));
}

export function readAccessControls() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
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

export function createAccessControl(draft) {
  return {
    id: uid(),
    active: true,
    permissions: defaultPermissions(),
    ...draft,
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
