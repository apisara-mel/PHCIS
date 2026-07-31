import { STAFF_AVATARS } from '@/data/avatarAssets';

/* Mock data for the "ผู้ใช้และสิทธิ์การเข้าถึง" (Users & Access) menu.

   Admin assigns four axes per user:
     1) บทบาท (role)           — primary job function (single)
     2) บทบาทย่อย (sub-role)    — specialty inside the role (single)
     3) แผนก (departments)     — clinical units the user works in (multi)
     4) สิทธิ์ฟีเจอร์ (features) — per-feature access level: none / view / edit

   Feature access is stored as a map { featureKey → 'view' | 'edit' }.
   Missing keys = no access. Some features only support 'edit' (binary
   actions like "ส่ง QR") — declared via supportedLevels on each feature. */

export const ROLES = [
  { key: 'doctor',     label: 'แพทย์',                  color: 'blue',   icon: 'stethoscope' },
  { key: 'nurse',      label: 'พยาบาล',                 color: 'teal',   icon: 'health_metrics' },
  { key: 'pharmacist', label: 'เภสัชกร',                color: 'orange', icon: 'pill' },
  { key: 'registrar',  label: 'เจ้าหน้าที่เวชระเบียน',    color: 'indigo', icon: 'assignment' },
  { key: 'lab-tech',   label: 'นักเทคนิคการแพทย์',       color: 'purple', icon: 'biotech' },
  { key: 'admin',      label: 'ผู้ดูแลระบบ',              color: 'brand',  icon: 'admin_panel_settings' },
];

/* บทบาทย่อย (specialty) — narrows the role to a specific scope. Empty
   array means the role has no further specialization. */
export const SUB_ROLES = {
  doctor: [
    { key: 'gp',           label: 'แพทย์เวชปฏิบัติทั่วไป (OPD)' },
    { key: 'surgeon',      label: 'แพทย์ศัลยกรรม' },
    { key: 'dentist',      label: 'ทันตแพทย์' },
    { key: 'family',       label: 'แพทย์เวชศาสตร์ครอบครัว' },
    { key: 'psychiatrist', label: 'จิตแพทย์' },
    { key: 'obgyn',        label: 'แพทย์สูตินรีเวช' },
  ],
  nurse: [
    { key: 'opd-nurse',     label: 'พยาบาลผู้ป่วยนอก' },
    { key: 'er-nurse',      label: 'พยาบาลห้องฉุกเฉิน' },
    { key: 'anc-nurse',     label: 'พยาบาลฝากครรภ์' },
    { key: 'wellness-nurse',label: 'พยาบาลส่งเสริมสุขภาพ' },
    { key: 'tb-nurse',      label: 'พยาบาลผู้ป่วยวัณโรค' },
  ],
  pharmacist: [
    { key: 'dispenser',     label: 'เภสัชกรจ่ายยา' },
    { key: 'clinical-pharm',label: 'เภสัชกรคลินิก' },
  ],
  registrar: [
    { key: 'reception',     label: 'เจ้าหน้าที่ต้อนรับ' },
    { key: 'records',       label: 'เจ้าหน้าที่บันทึกประวัติ' },
  ],
  'lab-tech': [
    { key: 'lab',           label: 'เจ้าหน้าที่แลป' },
    { key: 'radiologist',   label: 'นักรังสีเทคนิค' },
  ],
  admin: [
    { key: 'sys-admin',     label: 'ผู้ดูแลระบบหลัก' },
    { key: 'dept-head',     label: 'หัวหน้าแผนก' },
  ],
};

export const DEPARTMENTS = [
  { key: 'opd',          label: 'ผู้ป่วยนอก (OPD)' },
  { key: 'registration', label: 'งานเวชระเบียน' },
  { key: 'pharmacy',     label: 'งานเภสัชกรรม' },
  { key: 'lab',          label: 'ห้องปฏิบัติการ' },
  { key: 'radiology',    label: 'แผนกรังสีวินิจฉัย' },
  { key: 'family',       label: 'แผนกส่งเสริมสุขภาพ (วางแผนครอบครัว)' },
  { key: 'std',          label: 'แผนกโรคติดต่อทางเพศสัมพันธ์/เอดส์' },
  { key: 'drug',         label: 'แผนกบำบัดสารเสพติด' },
  { key: 'anc',          label: 'แผนกฝากครรภ์' },
  { key: 'wellness',     label: 'แผนกส่งเสริมสุขภาพเฉพาะกลุ่ม' },
  { key: 'vaccine',      label: 'แผนกสร้างเสริมภูมิคุ้มกัน' },
  { key: 'dental',       label: 'แผนกทันตกรรม' },
  { key: 'tb',           label: 'แผนกวัณโรค' },
  { key: 'mental',       label: 'แผนกสุขภาพจิต' },
];

/* Per-feature access spec. `supportedLevels` controls which access
   levels make sense for a feature — most are ['view','edit'], but some
   are action-only ('edit' only — e.g. share QR) or read-only ('view'
   only — e.g. audit log). The 3-state segmented control in the edit
   page renders disabled chips for unsupported levels. */
export const FEATURE_GROUPS = [
  {
    key: 'dashboard',
    label: 'แดชบอร์ด',
    icon: 'bar_chart_4_bars',
    features: [
      { key: 'dashboard.overview', label: 'แดชบอร์ดภาพรวม',    supportedLevels: ['view', 'edit'] },
      { key: 'dashboard.reports',  label: 'รายงานและสถิติ',     supportedLevels: ['view', 'edit'] },
    ],
  },
  {
    key: 'opd',
    label: 'ระบบผู้ป่วยนอก (OPD)',
    icon: 'face',
    features: [
      { key: 'opd.queue',     label: 'คิวผู้ป่วย',              supportedLevels: ['view', 'edit'] },
      { key: 'opd.screening', label: 'การคัดกรองและซักประวัติ', supportedLevels: ['view', 'edit'] },
      { key: 'opd.vitals',    label: 'สัญญาณชีพ (Vital Signs)',  supportedLevels: ['view', 'edit'] },
    ],
  },
  {
    key: 'registration',
    label: 'งานเวชระเบียน',
    icon: 'assignment',
    features: [
      { key: 'reg.queue',    label: 'คิวลงทะเบียน',          supportedLevels: ['view', 'edit'] },
      { key: 'reg.register', label: 'ลงทะเบียนผู้ป่วย',       supportedLevels: ['view', 'edit'] },
      { key: 'reg.profile',  label: 'ข้อมูลส่วนตัวผู้ป่วย',    supportedLevels: ['view', 'edit'] },
    ],
  },
  {
    key: 'treatment',
    label: 'ระบบบันทึกการรักษา',
    icon: 'stethoscope',
    features: [
      { key: 'treat.queue',     label: 'คิวรักษา',              supportedLevels: ['view', 'edit'] },
      { key: 'treat.record',    label: 'บันทึกการรักษา',         supportedLevels: ['view', 'edit'] },
      { key: 'treat.prescribe', label: 'สั่งยา/หัตถการ',         supportedLevels: ['view', 'edit'] },
      { key: 'treat.diagnosis', label: 'การวินิจฉัยและ ICD-10',  supportedLevels: ['view', 'edit'] },
    ],
  },
  {
    key: 'pharmacy',
    label: 'งานเภสัชกรรม',
    icon: 'pill',
    features: [
      { key: 'pharm.dispense',    label: 'จ่ายยา',                  supportedLevels: ['view', 'edit'] },
      { key: 'pharm.stock',       label: 'สต็อกยา / คงคลัง',         supportedLevels: ['view', 'edit'] },
      { key: 'pharm.registry',    label: 'ทะเบียนยา',                supportedLevels: ['view', 'edit'] },
      { key: 'pharm.verify',      label: 'ตรวจสอบคำสั่งใช้ยา',       supportedLevels: ['view', 'edit'] },
      { key: 'pharm.requisition', label: 'เบิกจ่าย/รับเข้าคลังยา',   supportedLevels: ['view', 'edit'] },
    ],
  },
  {
    key: 'lab',
    label: 'ห้องปฏิบัติการ / รังสี',
    icon: 'biotech',
    features: [
      { key: 'lab.order',      label: 'สั่งตรวจห้องแลป',         supportedLevels: ['view', 'edit'] },
      { key: 'lab.result',     label: 'บันทึก/อ่านผลตรวจ',       supportedLevels: ['view', 'edit'] },
      { key: 'radiology.read', label: 'อ่านภาพรังสี',            supportedLevels: ['view', 'edit'] },
    ],
  },
  {
    key: 'forms',
    label: 'คลังแบบฟอร์ม',
    icon: 'assignment_add',
    features: [
      { key: 'forms.view',   label: 'ดูคลังแบบฟอร์ม',          supportedLevels: ['view'] },
      { key: 'forms.fill',   label: 'กรอกแบบฟอร์มแทนผู้ป่วย',  supportedLevels: ['edit'] },
      { key: 'forms.share',  label: 'สร้าง QR / แชร์ลิงก์',     supportedLevels: ['edit'] },
      { key: 'forms.author', label: 'สร้าง/แก้ไขแบบฟอร์ม',      supportedLevels: ['edit'] },
    ],
  },
  {
    key: 'finance',
    label: 'งานการเงิน',
    icon: 'baht',
    features: [
      { key: 'finance.invoice', label: 'ออกใบเสร็จ',            supportedLevels: ['view', 'edit'] },
      { key: 'finance.payment', label: 'รับชำระเงิน',           supportedLevels: ['view', 'edit'] },
    ],
  },
  {
    key: 'system',
    label: 'การตั้งค่าระบบ',
    icon: 'settings',
    features: [
      { key: 'users.manage',    label: 'จัดการผู้ใช้และสิทธิ์', supportedLevels: ['view', 'edit'] },
      { key: 'system.settings', label: 'ตั้งค่าระบบ',          supportedLevels: ['view', 'edit'] },
      { key: 'audit.log',       label: 'ประวัติการใช้งานระบบ',  supportedLevels: ['view'] },
    ],
  },
];

/* Mock user roster. `features` maps featureKey → 'view' | 'edit'.
   Missing keys = no access. */
export const USERS = [
  {
    id: 'u-001',
    name: 'พญ.สมหญิง รักษ์ดี',
    email: 'somying.r@phcis.bma.go.th',
    avatarUrl: STAFF_AVATARS[0],
    status: 'active',
    role: 'doctor',
    subRole: 'gp',
    departments: ['opd'],
    lastActive: '2026-05-14 09:42',
    features: {
      'dashboard.overview': 'view',
      'opd.queue': 'edit',
      'opd.screening': 'edit',
      'opd.vitals': 'edit',
      'treat.queue': 'edit',
      'treat.record': 'edit',
      'treat.prescribe': 'edit',
      'treat.diagnosis': 'edit',
      'forms.view': 'view',
      'forms.fill': 'edit',
      'lab.order': 'edit',
      'lab.result': 'view',
    },
  },
  {
    id: 'u-002',
    name: 'นพ.ธนพล วิชัยกุล',
    email: 'thanapol.w@phcis.bma.go.th',
    avatarUrl: STAFF_AVATARS[1],
    status: 'active',
    role: 'doctor',
    subRole: 'surgeon',
    departments: ['opd', 'dental'],
    lastActive: '2026-05-14 08:11',
    features: {
      'dashboard.overview': 'view',
      'opd.queue': 'view',
      'opd.screening': 'view',
      'treat.queue': 'edit',
      'treat.record': 'edit',
      'treat.prescribe': 'edit',
      'forms.view': 'view',
      'forms.fill': 'edit',
    },
  },
  {
    id: 'u-003',
    name: 'พญ.อรุณี สิทธิ์รัตน์',
    email: 'arunee.s@phcis.bma.go.th',
    avatarUrl: STAFF_AVATARS[2],
    status: 'active',
    role: 'doctor',
    subRole: 'psychiatrist',
    departments: ['mental'],
    lastActive: '2026-05-13 16:30',
    features: {
      'opd.queue': 'view',
      'opd.screening': 'edit',
      'treat.queue': 'edit',
      'treat.record': 'edit',
      'forms.view': 'view',
      'forms.fill': 'edit',
    },
  },
  {
    id: 'u-004',
    name: 'พว.ปรียา ใจดี',
    email: 'preeya.j@phcis.bma.go.th',
    avatarUrl: STAFF_AVATARS[3],
    status: 'active',
    role: 'nurse',
    subRole: 'opd-nurse',
    departments: ['opd', 'wellness'],
    lastActive: '2026-05-14 09:50',
    features: {
      'opd.queue': 'edit',
      'opd.screening': 'edit',
      'opd.vitals': 'edit',
      'forms.view': 'view',
      'forms.fill': 'edit',
      'forms.share': 'edit',
    },
  },
  {
    id: 'u-005',
    name: 'พว.สุดารัตน์ พงศ์',
    email: 'sudarat.p@phcis.bma.go.th',
    avatarUrl: STAFF_AVATARS[4],
    status: 'active',
    role: 'nurse',
    subRole: 'anc-nurse',
    departments: ['anc'],
    lastActive: '2026-05-14 07:20',
    features: {
      'opd.queue': 'view',
      'opd.screening': 'edit',
      'opd.vitals': 'edit',
      'forms.view': 'view',
      'forms.fill': 'edit',
    },
  },
  {
    id: 'u-006',
    name: 'พว.วิภา ตันติ',
    email: 'wipa.t@phcis.bma.go.th',
    avatarUrl: STAFF_AVATARS[5],
    status: 'inactive',
    role: 'nurse',
    subRole: 'tb-nurse',
    departments: ['tb'],
    lastActive: '2026-04-22 11:00',
    features: {
      'opd.queue': 'view',
      'opd.screening': 'edit',
      'forms.view': 'view',
    },
  },
  {
    id: 'u-007',
    name: 'ภญ.กรรณิการ์ ภู่ตระกูล',
    email: 'kannika.p@phcis.bma.go.th',
    avatarUrl: STAFF_AVATARS[6],
    status: 'active',
    role: 'pharmacist',
    subRole: 'clinical-pharm',
    departments: ['pharmacy'],
    lastActive: '2026-05-14 08:55',
    features: {
      'dashboard.overview': 'view',
      'pharm.dispense': 'edit',
      'pharm.stock': 'edit',
      'pharm.registry': 'edit',
      'pharm.verify': 'edit',
      'treat.prescribe': 'view',
      'forms.view': 'view',
    },
  },
  {
    id: 'u-008',
    name: 'ภก.สิทธิชัย พรหมจันทร์',
    email: 'sittichai.p@phcis.bma.go.th',
    avatarUrl: STAFF_AVATARS[7],
    status: 'active',
    role: 'pharmacist',
    subRole: 'dispenser',
    departments: ['pharmacy'],
    lastActive: '2026-05-14 09:05',
    features: {
      'pharm.dispense': 'edit',
      'pharm.stock': 'view',
      'pharm.registry': 'view',
      'pharm.requisition': 'edit',
    },
  },
  {
    id: 'u-009',
    name: 'นางสาวมาลี เจริญสุข',
    email: 'malee.j@phcis.bma.go.th',
    avatarUrl: STAFF_AVATARS[8],
    status: 'active',
    role: 'registrar',
    subRole: 'reception',
    departments: ['registration', 'opd'],
    lastActive: '2026-05-14 09:38',
    features: {
      'opd.queue': 'view',
      'reg.queue': 'edit',
      'reg.register': 'edit',
      'reg.profile': 'edit',
      'forms.view': 'view',
      'forms.fill': 'edit',
      'finance.invoice': 'view',
    },
  },
  {
    id: 'u-010',
    name: 'นายอภินันท์ ใจกล้า',
    email: 'apinan.j@phcis.bma.go.th',
    avatarUrl: STAFF_AVATARS[9],
    status: 'active',
    role: 'registrar',
    subRole: 'records',
    departments: ['registration'],
    lastActive: '2026-05-13 18:00',
    features: {
      'reg.queue': 'view',
      'reg.register': 'view',
      'reg.profile': 'edit',
      'audit.log': 'view',
    },
  },
  {
    id: 'u-011',
    name: 'นางสาวสุภาวดี อินทร์',
    email: 'supawadee.i@phcis.bma.go.th',
    avatarUrl: STAFF_AVATARS[10],
    status: 'active',
    role: 'lab-tech',
    subRole: 'lab',
    departments: ['lab'],
    lastActive: '2026-05-14 09:12',
    features: {
      'lab.order': 'view',
      'lab.result': 'edit',
    },
  },
  {
    id: 'u-012',
    name: 'นายวรพล รัศมีพร',
    email: 'worapol.r@phcis.bma.go.th',
    avatarUrl: STAFF_AVATARS[11],
    status: 'active',
    role: 'admin',
    subRole: 'sys-admin',
    departments: ['registration', 'opd', 'pharmacy', 'lab'],
    lastActive: '2026-05-14 09:55',
    features: {
      'dashboard.overview': 'edit',
      'dashboard.reports': 'edit',
      'users.manage': 'edit',
      'system.settings': 'edit',
      'audit.log': 'view',
    },
  },
];

/* Lookup helpers — keep callers concise + tolerant to bad keys. */
export const getRole = (key) => ROLES.find((r) => r.key === key);
export const getSubRoles = (roleKey) => SUB_ROLES[roleKey] || [];
export const getSubRole = (roleKey, subKey) =>
  getSubRoles(roleKey).find((s) => s.key === subKey);
export const getDepartment = (key) => DEPARTMENTS.find((d) => d.key === key);
export const getUserById = (id) => USERS.find((u) => u.id === id);
export const getFeature = (key) => {
  for (const g of FEATURE_GROUPS) {
    const f = g.features.find((f) => f.key === key);
    if (f) return { ...f, group: g.key };
  }
  return null;
};

/* Per-role colour palette — maps to existing ColorfulBadge token surfaces
   so the badge brand-swaps consistently with the rest of the app. */
export const ROLE_PALETTE = {
  brand:  { surface: 'var(--surface-brandPrimary-quaternary)', text: 'var(--text-brandPrimary-default)' },
  blue:   { surface: 'var(--surface-colorfulbadge-blue)',      text: 'var(--text-colorfulbadge-blue)'   },
  teal:   { surface: 'var(--surface-colorfulbadge-teal)',      text: 'var(--text-colorfulbadge-teal)'   },
  orange: { surface: 'var(--surface-colorfulbadge-orange)',    text: 'var(--text-colorfulbadge-orange)' },
  indigo: { surface: 'var(--surface-colorfulbadge-indigo)',    text: 'var(--text-colorfulbadge-indigo)' },
  purple: { surface: 'var(--surface-colorfulbadge-purple)',    text: 'var(--text-colorfulbadge-purple)' },
};

/* Quick aggregations for the user-row summary chip. */
export const countAccess = (features = {}) => {
  let view = 0;
  let edit = 0;
  for (const v of Object.values(features)) {
    if (v === 'edit') edit += 1;
    else if (v === 'view') view += 1;
  }
  return { view, edit, total: view + edit };
};
