/* PHCIS | Assess-control — Group Policy registry (Figma 3:18430).
   Mock persistence via localStorage; shapes match the list + popup flows. */

const STORAGE_KEY = 'mih:group-policies';

const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/* Group Policy = สายวิชาชีพ/กลุ่มงานของบุคลากรในศูนย์บริการสาธารณสุข
   แต่ละกลุ่มแตกเป็นสาขาย่อยตามความเชี่ยวชาญ — ชุดนี้อิงโครงบุคลากรของ
   สำนักอนามัย เพื่อให้ dropdown ตอนผูกสิทธิ/เพิ่มบุคลากรมีตัวเลือกครบพอ
   ใช้งานได้จริง (เดิมมีแค่ 2 กลุ่ม 4 สาขาย่อย). */
export const DEMO_GROUP_POLICIES = [
  {
    id: 'gp-doctor',
    name: 'แพทย์',
    subBranches: [
      { id: 'sb-gp',     name: 'แพทย์เวชปฏิบัติทั่วไป', active: true, order: 1 },
      { id: 'sb-family', name: 'แพทย์เวชศาสตร์ครอบครัว', active: true, order: 2 },
      { id: 'sb-internal', name: 'อายุรแพทย์', active: true, order: 3 },
      { id: 'sb-surgery', name: 'ศัลยแพทย์', active: true, order: 4 },
      { id: 'sb-pediatrics', name: 'กุมารแพทย์', active: true, order: 5 },
      { id: 'sb-obgyn',  name: 'สูติ-นรีแพทย์', active: true, order: 6 },
      { id: 'sb-eye', name: 'จักษุแพทย์', active: true, order: 7 },
      { id: 'sb-ent', name: 'โสต ศอ นาสิกแพทย์', active: true, order: 8 },
      { id: 'sb-ortho', name: 'ออร์โธปิดิกส์', active: true, order: 9 },
      { id: 'sb-psy',    name: 'จิตแพทย์', active: true, order: 10 },
      { id: 'sb-er-doctor', name: 'แพทย์ฉุกเฉิน', active: true, order: 11 },
      { id: 'sb-anes', name: 'วิสัญญีแพทย์', active: true, order: 12 },
      { id: 'sb-derma', name: 'แพทย์ผิวหนัง', active: true, order: 13 },
      { id: 'sb-neuro-surg', name: 'ประสาทศัลยแพทย์', active: true, order: 14 },
      { id: 'sb-rehab-doctor', name: 'แพทย์เวชศาสตร์ฟื้นฟู', active: true, order: 15 },
      { id: 'sb-radiologist', name: 'รังสีแพทย์', active: true, order: 16 },
      { id: 'sb-dent',   name: 'ทันตแพทย์', active: true, order: 17 },
      { id: 'sb-thai',   name: 'แพทย์แผนไทย', active: true, order: 18 },
    ],
  },
  {
    id: 'gp-nurse',
    name: 'พยาบาล',
    subBranches: [
      { id: 'sb-opd',       name: 'พยาบาลผู้ป่วยนอก (OPD)', active: true, order: 1 },
      { id: 'sb-er',        name: 'พยาบาลห้องฉุกเฉิน', active: true, order: 2 },
      { id: 'sb-anc',       name: 'พยาบาลฝากครรภ์', active: true, order: 3 },
      { id: 'sb-vaccine',   name: 'พยาบาลสร้างเสริมภูมิคุ้มกัน', active: true, order: 4 },
      { id: 'sb-nurse-com', name: 'พยาบาลเยี่ยมบ้าน/ชุมชน', active: true, order: 5 },
      { id: 'sb-ipd',       name: 'พยาบาลสังเกตอาการ', active: false, order: 6 },
    ],
  },
  {
    id: 'gp-pharmacist',
    name: 'เภสัชกร',
    subBranches: [
      { id: 'sb-dispense', name: 'เภสัชกรจ่ายยา', active: true, order: 1 },
      { id: 'sb-stock',    name: 'เภสัชกรคลังยาและเวชภัณฑ์', active: true, order: 2 },
      { id: 'sb-counsel',  name: 'เภสัชกรให้คำปรึกษาด้านยา', active: true, order: 3 },
    ],
  },
  {
    id: 'gp-medtech',
    name: 'นักเทคนิคการแพทย์',
    subBranches: [
      { id: 'sb-lab',         name: 'ห้องปฏิบัติการทั่วไป', active: true, order: 1 },
      { id: 'sb-lab-sendout', name: 'งานส่งตรวจภายนอก (Send-out)', active: true, order: 2 },
    ],
  },
  {
    id: 'gp-radiology',
    name: 'นักรังสีการแพทย์',
    subBranches: [
      { id: 'sb-xray', name: 'รังสีวินิจฉัยทั่วไป', active: true, order: 1 },
      { id: 'sb-pacs', name: 'ผู้ดูแลระบบ PACS', active: true, order: 2 },
    ],
  },
  {
    id: 'gp-dental-health',
    name: 'เจ้าพนักงานทันตสาธารณสุข',
    subBranches: [
      { id: 'sb-dent-assist', name: 'ผู้ช่วยทันตแพทย์', active: true, order: 1 },
      { id: 'sb-dent-school', name: 'ทันตสาธารณสุขในโรงเรียน', active: true, order: 2 },
    ],
  },
  {
    id: 'gp-registrar',
    name: 'เจ้าหน้าที่เวชระเบียน',
    subBranches: [
      { id: 'sb-reg-front', name: 'จุดคัดกรอง/ลงทะเบียน', active: true, order: 1 },
      { id: 'sb-reg-file',  name: 'แฟ้มเวชระเบียนและการส่งต่อ', active: true, order: 2 },
    ],
  },
  {
    id: 'gp-finance',
    name: 'เจ้าหน้าที่การเงิน',
    subBranches: [
      { id: 'sb-cashier', name: 'การเงินและเก็บเงิน', active: true, order: 1 },
      { id: 'sb-claim',   name: 'งานเคลมและสิทธิการรักษา', active: true, order: 2 },
    ],
  },
  {
    id: 'gp-public-health',
    name: 'นักวิชาการสาธารณสุข',
    subBranches: [
      { id: 'sb-community', name: 'งานสาธารณสุขชุมชน', active: true, order: 1 },
      { id: 'sb-school',    name: 'งานสุขภาพนักเรียน', active: true, order: 2 },
      { id: 'sb-epidemic',  name: 'งานควบคุมโรคติดต่อ', active: true, order: 3 },
    ],
  },
  {
    id: 'gp-admin',
    name: 'ผู้ดูแลระบบ',
    subBranches: [
      { id: 'sb-sysadmin',   name: 'ผู้ดูแลระบบศูนย์', active: true, order: 1 },
      { id: 'sb-superadmin', name: 'ผู้ดูแลระบบส่วนกลาง', active: true, order: 2 },
    ],
  },
];

/* นโยบายเดิมที่เคยบันทึกไว้ใน browser อาจยังมีชื่อ “แพทย์เฉพาะทาง”
   จึง normalize ตอนอ่าน เพื่อให้ตัวเลือกในหน้าแก้ไขเป็นชุดสาขาแพทย์ที่ละเอียด
   แม้ผู้ใช้จะเปิดระบบจากข้อมูล localStorage รุ่นก่อนก็ตาม */
function normalizeGroupPolicies(policies) {
  const doctorSeed = DEMO_GROUP_POLICIES.find((policy) => policy.id === 'gp-doctor');
  return policies.map((policy) => {
    if (policy.id !== 'gp-doctor' || !doctorSeed) return policy;
    const current = (policy.subBranches || []).filter((branch) => branch.name !== 'แพทย์เฉพาะทาง');
    const names = new Set(current.map((branch) => branch.name));
    const additions = doctorSeed.subBranches
      .filter((branch) => !names.has(branch.name))
      .map((branch) => ({ ...branch, order: current.length + 1 }));
    return { ...policy, subBranches: [...current, ...additions].map((branch, index) => ({ ...branch, order: index + 1 })) };
  });
}

/** ทะเบียนว่าง (เบราว์เซอร์ใหม่ / ยังไม่เคยตั้งค่า) ให้คืนชุดตั้งต้นแทน
    ไม่งั้น dropdown "Group Policy" ตอนผูกสิทธิและเพิ่มบุคลากรจะว่างเปล่า
    จนใช้งานไม่ได้เลย. เขียนทับได้ทันทีที่ผู้ใช้แก้ในหน้า Group Policy. */
export function readGroupPolicies() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return DEMO_GROUP_POLICIES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? normalizeGroupPolicies(parsed) : DEMO_GROUP_POLICIES;
  } catch {
    return DEMO_GROUP_POLICIES;
  }
}

export function writeGroupPolicies(policies) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(policies));
}

export function computeGroupPolicyStats(policies) {
  const subBranches = policies.flatMap((p) => p.subBranches || []);
  return {
    total: policies.length,
    active: subBranches.filter((s) => s.active).length,
    inactive: subBranches.filter((s) => !s.active).length,
  };
}

export function createGroupPolicy(name) {
  return {
    id: uid('gp'),
    name: name.trim(),
    subBranches: [],
  };
}

export function createSubBranch(name, order) {
  return {
    id: uid('sb'),
    name: name.trim(),
    active: true,
    order,
  };
}

export function sortSubBranches(subBranches) {
  return [...(subBranches || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
}

export function reorderSubBranches(subBranches, fromIdx, toIdx) {
  const copy = sortSubBranches(subBranches);
  const [moved] = copy.splice(fromIdx, 1);
  copy.splice(toIdx, 0, moved);
  return copy.map((sb, i) => ({ ...sb, order: i + 1 }));
}

export function isDuplicateGroupPolicyName(policies, name, excludeId = null) {
  const norm = name.trim().toLowerCase();
  if (!norm) return false;
  return policies.some((p) => (
    p.id !== excludeId && p.name.trim().toLowerCase() === norm
  ));
}

export function loadDemoPolicies() {
  writeGroupPolicies(DEMO_GROUP_POLICIES);
  return DEMO_GROUP_POLICIES;
}

export function clearGroupPolicies() {
  localStorage.removeItem(STORAGE_KEY);
}
