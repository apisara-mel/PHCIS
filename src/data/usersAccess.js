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

/* ══════════════════════════════════════════════════════════════════════
   TOR §1.17.1.3 — User Attribute ครบชุด
   ══════════════════════════════════════════════════════════════════════
   ข้อกำหนดระบุ attribute ที่ระบบต้องเก็บ/รับจาก Directory Service ไว้ 8 ตัว:
   Department · Department-Code · รหัสวิชาชีพ · Given Name · Last Name ·
   Email · Title · Active. ส่วนล่างนี้เติม attribute ทั้ง 8 (พร้อมข้อมูล
   ประกอบที่งานจริงต้องใช้ — เบอร์ติดต่อ, ศูนย์ที่สังกัด, ศูนย์ที่สลับไปได้,
   แหล่งบัญชี Local/IdP, ช่องทางเข้าสู่ระบบ) ลงบน USERS เดิม "ในที่" เพื่อไม่
   ให้ importer เดิม (UsersAccessPage / UserEditPage) เห็นข้อมูลคนละชุด. */

/** คำนำหน้า (TOR: Title) — ใช้ทั้งในฟอร์มและ mapping ฝั่ง IdP. */
export const TITLES = [
  { key: 'md',        label: 'นพ.',   full: 'นายแพทย์' },
  { key: 'md-f',      label: 'พญ.',   full: 'แพทย์หญิง' },
  { key: 'rn',        label: 'พว.',   full: 'พยาบาลวิชาชีพ' },
  { key: 'pharm-m',   label: 'ภก.',   full: 'เภสัชกรชาย' },
  { key: 'pharm-f',   label: 'ภญ.',   full: 'เภสัชกรหญิง' },
  { key: 'dds',       label: 'ทพ.',   full: 'ทันตแพทย์' },
  { key: 'mr',        label: 'นาย',   full: 'นาย' },
  { key: 'mrs',       label: 'นาง',   full: 'นาง' },
  { key: 'ms',        label: 'นางสาว', full: 'นางสาว' },
];

export const getTitle = (key) => TITLES.find((t) => t.key === key);

/** ประเภทใบอนุญาต/รหัสวิชาชีพ — บังคับเฉพาะบทบาทวิชาชีพ. */
export const LICENSE_TYPES = [
  { key: 'md',     label: 'ใบอนุญาตประกอบวิชาชีพเวชกรรม (ว.)',        prefix: 'ว.',  roles: ['doctor'] },
  { key: 'rn',     label: 'ใบอนุญาตประกอบวิชาชีพการพยาบาล (พย.)',     prefix: 'พย.', roles: ['nurse'] },
  { key: 'pharm',  label: 'ใบอนุญาตประกอบวิชาชีพเภสัชกรรม (ภ.)',      prefix: 'ภ.',  roles: ['pharmacist'] },
  { key: 'mt',     label: 'ใบอนุญาตประกอบวิชาชีพเทคนิคการแพทย์ (ท.น.)', prefix: 'ท.น.', roles: ['lab-tech'] },
  { key: 'dds',    label: 'ใบอนุญาตประกอบวิชาชีพทันตกรรม (ท.)',        prefix: 'ท.',  roles: ['doctor'] },
  { key: 'none',   label: 'ไม่ต้องใช้ใบอนุญาต',                        prefix: '',    roles: ['registrar', 'admin'] },
];

/** บทบาทที่ TOR ถือว่าเป็น "วิชาชีพ" — รหัสวิชาชีพเป็นฟิลด์บังคับ. */
export const PROFESSIONAL_ROLES = ['doctor', 'nurse', 'pharmacist', 'lab-tech'];

/** Department-Code ตามผังรหัสหน่วยงานของสำนักอนามัย (mock ที่สอดคล้องกัน). */
export const DEPARTMENT_CODES = {
  opd:          'DEP-OPD-01',
  registration: 'DEP-REG-02',
  pharmacy:     'DEP-PHA-03',
  lab:          'DEP-LAB-04',
  radiology:    'DEP-RAD-05',
  family:       'DEP-FAM-06',
  std:          'DEP-STD-07',
  drug:         'DEP-DRG-08',
  anc:          'DEP-ANC-09',
  wellness:     'DEP-WEL-10',
  vaccine:      'DEP-VAC-11',
  dental:       'DEP-DEN-12',
  tb:           'DEP-TB-13',
  mental:       'DEP-MEN-14',
};

export const departmentCodeOf = (deptKey) => DEPARTMENT_CODES[deptKey] || '';

/** รหัสหน่วยงานที่คาดหวังจากชุดแผนกที่เลือก (ตัวแรกเป็นค่า auto-fill). */
export const expectedDepartmentCodes = (deptKeys = []) =>
  deptKeys.map(departmentCodeOf).filter(Boolean);

/** แหล่งที่มาของบัญชี — Local (สร้างในระบบ) หรือ IdP (sync จาก Directory Service). */
export const ACCOUNT_SOURCES = [
  { key: 'local', label: 'สร้างในระบบ (Local)',          icon: 'person' },
  { key: 'idp',   label: 'Directory Service (IdP)',      icon: 'hub' },
];

/** ช่องทางเข้าสู่ระบบรายบุคคล (TOR 1.17.5.1). */
export const LOGIN_CHANNELS = [
  { key: 'password', label: 'ชื่อผู้ใช้ + รหัสผ่าน', icon: 'password',   desc: 'เข้าสู่ระบบด้วยบัญชีผู้ใช้และรหัสผ่านของ PHCIS' },
  { key: 'qr',       label: 'สแกน QR ประจำตัว',      icon: 'qr_code_2',  desc: 'สแกน QR จากหน้าเข้าสู่ระบบ — QR หมดอายุใน 1 นาทีและออกใหม่อัตโนมัติ' },
  { key: 'otp-sms',  label: 'OTP ทาง SMS',           icon: 'sms',        desc: 'ส่งรหัส 6 หลักไปยังเบอร์ที่ลงทะเบียนไว้ (หมดอายุ 5 นาที)' },
  { key: 'otp-mail', label: 'OTP ทางอีเมล',          icon: 'mail',       desc: 'ส่งรหัส 6 หลักไปยังอีเมลของผู้ใช้ (หมดอายุ 5 นาที)' },
];

/** ป้ายกำกับ attribute ตาม TOR — ใช้ร่วมกับตาราง mapping ของ Directory Service. */
export const USER_ATTRIBUTES = [
  { key: 'title',          label: 'คำนำหน้า (Title)',            torLabel: 'Title',           required: true },
  { key: 'givenName',      label: 'ชื่อ (Given Name)',            torLabel: 'Given Name',      required: true },
  { key: 'lastName',       label: 'นามสกุล (Last Name)',          torLabel: 'Last Name',       required: true },
  { key: 'email',          label: 'อีเมล (Email)',                torLabel: 'Email',           required: true },
  { key: 'department',     label: 'แผนก (Department)',            torLabel: 'Department',      required: true },
  { key: 'departmentCode', label: 'รหัสแผนก (Department-Code)',   torLabel: 'Department-Code', required: true },
  { key: 'licenseNo',      label: 'รหัสวิชาชีพ',                  torLabel: 'รหัสวิชาชีพ',      required: true },
  { key: 'active',         label: 'สถานะใช้งาน (Active)',         torLabel: 'Active',          required: true },
];

/* ── Healthcare Service (TOR 1.17.3) ─────────────────────────────────────
   หน่วยบริการภายในศูนย์ — ทั้งคลินิก (ต้นทางคำสั่งยา) และห้องยา/ห้องเจาะเลือด/
   ห้องชำระเงิน (ปลายทาง). `serviceType` ใช้จัดกลุ่มในหน้า routing. */
export const SERVICE_TYPES = ['OPD', 'ห้องยา', 'ห้องเจาะเลือด', 'ห้องชำระเงิน'];

export const HEALTHCARE_SERVICES = [
  /* คลินิก (ต้นทาง) */
  { id: 'hs-opd',      name: 'คลินิกผู้ป่วยนอกทั่วไป',        serviceType: 'OPD', kind: 'clinic',   department: 'opd',      room: 'ห้องตรวจ 1-4', hours: '08:00-16:00', active: true },
  { id: 'hs-anc',      name: 'คลินิกฝากครรภ์',                serviceType: 'OPD', kind: 'clinic',   department: 'anc',      room: 'ห้องตรวจ 5',   hours: '08:00-12:00', active: true },
  { id: 'hs-wellcare', name: 'คลินิกส่งเสริมสุขภาพ',          serviceType: 'OPD', kind: 'clinic',   department: 'wellness', room: 'ห้องตรวจ 6',   hours: '08:00-16:00', active: true },
  { id: 'hs-ncd',      name: 'คลินิกโรคเรื้อรัง (NCD)',       serviceType: 'OPD', kind: 'clinic',   department: 'opd',      room: 'ห้องตรวจ 7',   hours: '08:00-12:00', active: true },
  { id: 'hs-tb',       name: 'คลินิกวัณโรค',                  serviceType: 'OPD', kind: 'clinic',   department: 'tb',       room: 'อาคาร 2 ชั้น 1', hours: '08:00-12:00', active: true },
  { id: 'hs-std',      name: 'คลินิกโรคติดต่อทางเพศสัมพันธ์', serviceType: 'OPD', kind: 'clinic',   department: 'std',      room: 'อาคาร 2 ชั้น 2', hours: '13:00-16:00', active: true },
  { id: 'hs-mental',   name: 'คลินิกสุขภาพจิต',               serviceType: 'OPD', kind: 'clinic',   department: 'mental',   room: 'อาคาร 3 ชั้น 2', hours: '08:00-16:00', active: true },
  { id: 'hs-drug',     name: 'คลินิกบำบัดสารเสพติด',          serviceType: 'OPD', kind: 'clinic',   department: 'drug',     room: 'อาคาร 3 ชั้น 3', hours: '08:00-16:00', active: true },
  { id: 'hs-dental',   name: 'คลินิกทันตกรรม',                serviceType: 'OPD', kind: 'clinic',   department: 'dental',   room: 'ห้องทันตกรรม',  hours: '08:00-16:00', active: true },
  { id: 'hs-vaccine',  name: 'คลินิกสร้างเสริมภูมิคุ้มกัน',    serviceType: 'OPD', kind: 'clinic',   department: 'vaccine',  room: 'ห้องฉีดวัคซีน', hours: '08:00-12:00', active: true },
  { id: 'hs-family',   name: 'คลินิกวางแผนครอบครัว',          serviceType: 'OPD', kind: 'clinic',   department: 'family',   room: 'ห้องตรวจ 8',   hours: '13:00-16:00', active: true },
  { id: 'hs-er',       name: 'ห้องอุบัติเหตุ-ฉุกเฉิน',        serviceType: 'OPD', kind: 'clinic',   department: 'opd',      room: 'ห้อง ER',      hours: '24 ชั่วโมง',  active: true },
  /* ห้องยา (ปลายทาง) */
  { id: 'hs-pharm-1',  name: 'ห้องยาผู้ป่วยนอก (ห้องยา 1)',   serviceType: 'ห้องยา', kind: 'pharmacy', department: 'pharmacy', room: 'ชั้น 1',  hours: '08:00-16:00', active: true },
  { id: 'hs-pharm-2',  name: 'ห้องยานอกเวลา (ห้องยา 2)',      serviceType: 'ห้องยา', kind: 'pharmacy', department: 'pharmacy', room: 'ชั้น 1',  hours: '16:00-20:00', active: true },
  { id: 'hs-pharm-nar', name: 'ห้องยาควบคุมพิเศษ/เสพติด',     serviceType: 'ห้องยา', kind: 'pharmacy', department: 'pharmacy', room: 'ชั้น 2 (ห้องมั่นคง)', hours: '08:00-16:00', active: true },
  { id: 'hs-pharm-cold', name: 'ห้องยาเย็น (Cold chain)',     serviceType: 'ห้องยา', kind: 'pharmacy', department: 'pharmacy', room: 'ชั้น 2',  hours: '08:00-16:00', active: true },
  { id: 'hs-pharm-dent', name: 'ห้องยาทันตกรรม',              serviceType: 'ห้องยา', kind: 'pharmacy', department: 'pharmacy', room: 'ห้องทันตกรรม', hours: '08:00-16:00', active: false },
  /* หน่วยบริการอื่นที่อ้างถึงในเส้นทางบริการ */
  { id: 'hs-phlebo',   name: 'ห้องเจาะเลือด',                 serviceType: 'ห้องเจาะเลือด', kind: 'support', department: 'lab',        room: 'ชั้น 1', hours: '07:00-12:00', active: true },
  { id: 'hs-cashier',  name: 'ห้องชำระเงิน',                  serviceType: 'ห้องชำระเงิน',  kind: 'support', department: 'registration', room: 'ชั้น 1', hours: '08:00-16:00', active: true },
];

export const getHealthcareService = (id) => HEALTHCARE_SERVICES.find((s) => s.id === id);
export const clinicServices = () => HEALTHCARE_SERVICES.filter((s) => s.kind === 'clinic');
export const pharmacyServices = () => HEALTHCARE_SERVICES.filter((s) => s.kind === 'pharmacy');

/* ── เติม attribute ลง USERS เดิม (mutate in place) ─────────────────────── */

const splitThaiName = (full) => {
  const raw = String(full || '').trim();
  const title = TITLES
    .slice()
    .sort((a, b) => b.label.length - a.label.length)
    .find((t) => raw.startsWith(t.label));
  const rest = title ? raw.slice(title.label.length).trim() : raw;
  const [given, ...tail] = rest.split(/\s+/);
  return {
    titleKey: title?.key || 'mr',
    givenName: given || '',
    lastName: tail.join(' '),
  };
};

/* ข้อมูลเสริมรายคน — เบอร์ติดต่อ, ศูนย์สังกัด, ศูนย์ที่สลับไปได้, แหล่งบัญชี,
   ใบอนุญาต, ช่องทางเข้าสู่ระบบ. ค่า `hc-N` ตรงกับ CLINIC_OPTIONS ของ
   HeaderClinicContext (69 ศูนย์) — ห้ามตั้ง state ศูนย์ชุดใหม่. */
const ATTRIBUTE_SEED = {
  'u-001': { phone: '08-1234-5678', homeCenter: 'hc-4',  centers: ['hc-4', 'hc-25'], source: 'idp',   licenseType: 'md',    licenseNo: 'ว.28451', channels: ['password', 'qr', 'otp-sms'] },
  'u-002': { phone: '08-9876-5432', homeCenter: 'hc-4',  centers: ['hc-4'],          source: 'idp',   licenseType: 'md',    licenseNo: 'ว.31207', channels: ['password', 'otp-mail'] },
  'u-003': { phone: '08-2233-4455', homeCenter: 'hc-25', centers: ['hc-25', 'hc-4'], source: 'idp',   licenseType: 'md',    licenseNo: 'ว.29118', channels: ['password', 'qr'] },
  'u-004': { phone: '08-5566-7788', homeCenter: 'hc-4',  centers: ['hc-4'],          source: 'local', licenseType: 'rn',    licenseNo: 'พย.45120', channels: ['password', 'qr', 'otp-sms'] },
  'u-005': { phone: '08-4433-2211', homeCenter: 'hc-4',  centers: ['hc-4', 'hc-15'], source: 'local', licenseType: 'rn',    licenseNo: 'พย.46781', channels: ['password', 'otp-sms'] },
  'u-006': { phone: '08-7788-9900', homeCenter: 'hc-15', centers: ['hc-15'],         source: 'local', licenseType: 'rn',    licenseNo: 'พย.44902', channels: ['password'] },
  'u-007': { phone: '08-1122-3344', homeCenter: 'hc-4',  centers: ['hc-4'],          source: 'idp',   licenseType: 'pharm', licenseNo: 'ภ.18442', channels: ['password', 'qr'] },
  'u-008': { phone: '08-6677-8899', homeCenter: 'hc-4',  centers: ['hc-4', 'hc-25'], source: 'local', licenseType: 'pharm', licenseNo: 'ภ.19075', channels: ['password'] },
  'u-009': { phone: '08-3344-5566', homeCenter: 'hc-4',  centers: ['hc-4'],          source: 'local', licenseType: 'none',  licenseNo: '',        channels: ['password', 'qr'] },
  'u-010': { phone: '08-9900-1122', homeCenter: 'hc-4',  centers: ['hc-4'],          source: 'local', licenseType: 'none',  licenseNo: '',        channels: ['password'] },
  'u-011': { phone: '08-5544-3322', homeCenter: 'hc-4',  centers: ['hc-4'],          source: 'idp',   licenseType: 'mt',    licenseNo: 'ท.น.9921', channels: ['password', 'otp-mail'] },
  'u-012': { phone: '08-1000-2000', homeCenter: 'hc-4',  centers: ['hc-4', 'hc-25', 'hc-15', 'hc-3'], source: 'local', licenseType: 'none', licenseNo: '', channels: ['password', 'qr', 'otp-sms', 'otp-mail'] },
};

/** ฟิลด์ที่ sync มาจาก IdP → แสดงเป็น read-only บนหน้าแก้ไขผู้ใช้. */
export const IDP_MANAGED_FIELDS = ['titleKey', 'givenName', 'lastName', 'email', 'departments', 'departmentCode', 'licenseNo', 'status'];

USERS.forEach((u) => {
  const parsed = splitThaiName(u.name);
  const seed = ATTRIBUTE_SEED[u.id] || {};
  Object.assign(u, {
    titleKey: u.titleKey ?? parsed.titleKey,
    givenName: u.givenName ?? parsed.givenName,
    lastName: u.lastName ?? parsed.lastName,
    phone: u.phone ?? seed.phone ?? '',
    departmentCode: u.departmentCode ?? departmentCodeOf(u.departments?.[0]),
    licenseType: u.licenseType ?? seed.licenseType ?? 'none',
    licenseNo: u.licenseNo ?? seed.licenseNo ?? '',
    homeCenter: u.homeCenter ?? seed.homeCenter ?? 'hc-4',
    centers: u.centers ?? seed.centers ?? ['hc-4'],
    source: u.source ?? seed.source ?? 'local',
    loginChannels: u.loginChannels ?? seed.channels ?? ['password'],
    updatedBy: u.updatedBy ?? 'นายวรพล รัศมีพร',
    updatedAt: u.updatedAt ?? '14 พ.ค. 2569 09:55',
  });
});

/** ประกอบชื่อเต็มจาก Title + Given + Last (TOR 1.17.1.3). */
export const composeUserName = ({ titleKey, givenName, lastName }) =>
  [getTitle(titleKey)?.label, givenName, lastName].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

/* ── Mutable roster store (แสดง / บันทึก / ยกเลิก / แก้ไข ครบ 4) ────────── */

const userListeners = new Set();
const notifyUsers = () => userListeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });

export const subscribeUsers = (fn) => {
  userListeners.add(fn);
  return () => userListeners.delete(fn);
};

export const getUsers = () => USERS.slice();

export const isEmailTaken = (email, exceptId = null) => {
  const norm = String(email || '').trim().toLowerCase();
  if (!norm) return false;
  return USERS.some((u) => u.id !== exceptId && String(u.email).toLowerCase() === norm);
};

export const isLicenseTaken = (licenseNo, exceptId = null) => {
  const norm = String(licenseNo || '').trim();
  if (!norm) return false;
  return USERS.some((u) => u.id !== exceptId && String(u.licenseNo || '').trim() === norm);
};

export const countActiveAdmins = () =>
  USERS.filter((u) => u.role === 'admin' && u.status === 'active').length;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * ตรวจ attribute ตาม TOR 1.17.1.3 + edge case ที่สเปกกำหนด.
 * @returns {{ [field: string]: string }} map ของ field → ข้อความ error
 */
export const validateUserForm = (form, { exceptId = null, currentUserId = null } = {}) => {
  const errors = {};
  if (!String(form.givenName || '').trim()) errors.givenName = 'กรุณากรอกชื่อ';
  if (!String(form.lastName || '').trim()) errors.lastName = 'กรุณากรอกนามสกุล';

  const email = String(form.email || '').trim();
  if (!email) errors.email = 'กรุณากรอกอีเมล';
  else if (!EMAIL_RE.test(email)) errors.email = 'รูปแบบอีเมลไม่ถูกต้อง (ตัวอย่าง name@phcis.bma.go.th)';
  else if (isEmailTaken(email, exceptId)) errors.email = 'อีเมลนี้ถูกใช้กับบัญชีอื่นแล้ว';

  if (!(form.departments || []).length) errors.departments = 'เลือกอย่างน้อย 1 แผนก';
  else {
    const allowed = expectedDepartmentCodes(form.departments);
    const code = String(form.departmentCode || '').trim();
    if (!code) errors.departmentCode = 'กรุณากรอกรหัสแผนก (Department-Code)';
    else if (!allowed.includes(code)) {
      errors.departmentCode = `รหัสแผนกไม่ตรงกับแผนกที่เลือก — ที่ถูกต้องคือ ${allowed.join(' / ')}`;
    }
  }

  if (PROFESSIONAL_ROLES.includes(form.role)) {
    const lic = String(form.licenseNo || '').trim();
    const type = LICENSE_TYPES.find((t) => t.key === form.licenseType);
    if (!lic) errors.licenseNo = 'บทบาทวิชาชีพต้องระบุรหัสวิชาชีพ';
    else if (type && type.prefix && !lic.startsWith(type.prefix)) {
      errors.licenseNo = `รูปแบบไม่ถูกต้อง — ต้องขึ้นต้นด้วย "${type.prefix}"`;
    } else if (isLicenseTaken(lic, exceptId)) {
      errors.licenseNo = 'รหัสวิชาชีพนี้ถูกใช้กับบัญชีอื่นแล้ว';
    }
  }

  if (!(form.centers || []).length) errors.centers = 'เลือกอย่างน้อย 1 ศูนย์บริการ';
  if (!(form.loginChannels || []).length) errors.loginChannels = 'ต้องเปิดช่องทางเข้าสู่ระบบอย่างน้อย 1 ช่องทาง';

  if (form.status !== 'active' && exceptId) {
    if (exceptId === currentUserId) errors.status = 'ปิดการใช้งานบัญชีของตัวเองไม่ได้';
    else {
      const target = getUserById(exceptId);
      if (target?.role === 'admin' && target.status === 'active' && countActiveAdmins() <= 1) {
        errors.status = 'ปิดไม่ได้ — เป็นผู้ดูแลระบบที่ยังใช้งานอยู่คนสุดท้าย';
      }
    }
  }
  return errors;
};

const nowStamp = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear() + 543} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** บันทึกการแก้ไขผู้ใช้ (TOR "บันทึก/แก้ไข"). */
export const updateUser = (id, patch, actor = 'ผู้ดูแลระบบ') => {
  const target = getUserById(id);
  if (!target) return null;
  Object.assign(target, patch, { updatedBy: actor, updatedAt: nowStamp() });
  target.name = composeUserName(target) || target.name;
  notifyUsers();
  return target;
};

/** สร้างผู้ใช้ใหม่ (ผ่านการยืนยัน OTP แล้ว — TOR 1.17.4.1). */
export const createUser = (payload, actor = 'ผู้ดูแลระบบ') => {
  const nextNum = USERS.reduce((max, u) => Math.max(max, Number(String(u.id).replace('u-', '')) || 0), 0) + 1;
  const row = {
    ...payload,
    id: `u-${String(nextNum).padStart(3, '0')}`,
    name: composeUserName(payload),
    avatarUrl: payload.avatarUrl || STAFF_AVATARS[nextNum % STAFF_AVATARS.length],
    lastActive: '—',
    updatedBy: actor,
    updatedAt: nowStamp(),
  };
  USERS.push(row);
  notifyUsers();
  return row;
};

/** เปิด/ปิดบัญชี (TOR Active attribute). */
export const setUserActive = (id, active, actor = 'ผู้ดูแลระบบ') =>
  updateUser(id, { status: active ? 'active' : 'inactive' }, actor);
