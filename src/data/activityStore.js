/* PHCIS | Assess-control — ทะเบียนกิจกรรม (Activity-based Access Control).
   Mock persistence via localStorage; shapes match the list + popup flows.

   แทนที่ระบบ "Group Policy" เดิม: สิทธิ์การเข้าถึงเมนู/โมดูลผูกกับ
   **กิจกรรม (Activity)** ที่บุคลากรปฏิบัติ ไม่ใช่กลุ่มนโยบายแบบตายตัว
   - กิจกรรมหลัก  เช่น "นักสังคมสงเคราะห์"
   - กิจกรรมย่อย เช่น "นักสังคมสงเคราะห์ศูนย์", "นักสังคมสงเคราะห์นักจิตวิทยา"

   ข้อมูล Group Policy ที่ผู้ใช้เคยบันทึกไว้ใน browser จะถูก migrate
   อัตโนมัติตอนอ่าน (`readActivities`) — id เดิม (gp-… / sb-…) คงไว้เพื่อให้
   record สิทธิ์/บุคลากรที่อ้างถึงยังจับคู่ได้ ส่วน id ใหม่ใช้ act-… / sub-… */

const STORAGE_KEY = 'mih:activities';
const LEGACY_STORAGE_KEY = 'mih:group-policies';

const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/* กิจกรรมหลัก = สายงาน/บทบาทกิจกรรมของบุคลากรในศูนย์บริการสาธารณสุข
   แต่ละกิจกรรมแตกเป็นกิจกรรมย่อยตามความเชี่ยวชาญ — ชุดนี้อิงโครงบุคลากร
   ของสำนักอนามัย เพื่อให้ dropdown ตอนผูกสิทธิ/เพิ่มบุคลากรมีตัวเลือกครบ
   พอใช้งานได้จริง. */
export const DEMO_ACTIVITIES = [
  {
    id: 'gp-doctor',
    name: 'แพทย์',
    subActivities: [
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
    subActivities: [
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
    subActivities: [
      { id: 'sb-dispense', name: 'เภสัชกรจ่ายยา', active: true, order: 1 },
      { id: 'sb-stock',    name: 'เภสัชกรคลังยาและเวชภัณฑ์', active: true, order: 2 },
      { id: 'sb-counsel',  name: 'เภสัชกรให้คำปรึกษาด้านยา', active: true, order: 3 },
    ],
  },
  {
    id: 'act-social-worker',
    name: 'นักสังคมสงเคราะห์',
    subActivities: [
      { id: 'sub-sw-center', name: 'นักสังคมสงเคราะห์ศูนย์', active: true, order: 1 },
      { id: 'sub-sw-psychologist', name: 'นักสังคมสงเคราะห์นักจิตวิทยา', active: true, order: 2 },
      { id: 'sub-sw-mental', name: 'นักสังคมสงเคราะห์จิต', active: true, order: 3 },
    ],
  },
  {
    id: 'gp-medtech',
    name: 'นักเทคนิคการแพทย์',
    subActivities: [
      { id: 'sb-lab',         name: 'ห้องปฏิบัติการทั่วไป', active: true, order: 1 },
      { id: 'sb-lab-sendout', name: 'งานส่งตรวจภายนอก (Send-out)', active: true, order: 2 },
    ],
  },
  {
    id: 'gp-radiology',
    name: 'นักรังสีการแพทย์',
    subActivities: [
      { id: 'sb-xray', name: 'รังสีวินิจฉัยทั่วไป', active: true, order: 1 },
      { id: 'sb-pacs', name: 'ผู้ดูแลระบบ PACS', active: true, order: 2 },
    ],
  },
  {
    id: 'gp-dental-health',
    name: 'เจ้าพนักงานทันตสาธารณสุข',
    subActivities: [
      { id: 'sb-dent-assist', name: 'ผู้ช่วยทันตแพทย์', active: true, order: 1 },
      { id: 'sb-dent-school', name: 'ทันตสาธารณสุขในโรงเรียน', active: true, order: 2 },
    ],
  },
  {
    id: 'gp-registrar',
    name: 'เจ้าหน้าที่เวชระเบียน',
    subActivities: [
      { id: 'sb-reg-front', name: 'จุดคัดกรอง/ลงทะเบียน', active: true, order: 1 },
      { id: 'sb-reg-file',  name: 'แฟ้มเวชระเบียนและการส่งต่อ', active: true, order: 2 },
    ],
  },
  {
    id: 'gp-finance',
    name: 'เจ้าหน้าที่การเงิน',
    subActivities: [
      { id: 'sb-cashier', name: 'การเงินและเก็บเงิน', active: true, order: 1 },
      { id: 'sb-claim',   name: 'งานเคลมและสิทธิการรักษา', active: true, order: 2 },
    ],
  },
  {
    id: 'gp-public-health',
    name: 'นักวิชาการสาธารณสุข',
    subActivities: [
      { id: 'sb-community', name: 'งานสาธารณสุขชุมชน', active: true, order: 1 },
      { id: 'sb-school',    name: 'งานสุขภาพนักเรียน', active: true, order: 2 },
      { id: 'sb-epidemic',  name: 'งานควบคุมโรคติดต่อ', active: true, order: 3 },
    ],
  },
  {
    id: 'gp-admin',
    name: 'ผู้ดูแลระบบ',
    subActivities: [
      { id: 'sb-sysadmin',   name: 'ผู้ดูแลระบบศูนย์', active: true, order: 1 },
      { id: 'sb-superadmin', name: 'ผู้ดูแลระบบส่วนกลาง', active: true, order: 2 },
    ],
  },
];

/* แปลง record หนึ่งรายการให้เป็นรูปกิจกรรม — รองรับทั้งของใหม่
   (subActivities) และของเก่าจากยุค Group Policy (subBranches). */
function toActivityShape(record) {
  if (!record) return record;
  const subs = record.subActivities || record.subBranches || [];
  const { subBranches, ...rest } = record;
  return { ...rest, subActivities: subs };
}

/* ชุดข้อมูลที่ migrate มาจาก Group Policy อาจยังไม่มีกิจกรรมตัวอย่างใหม่
   "นักสังคมสงเคราะห์" — เติมให้เสมอ เพื่อให้โครงกิจกรรมหลัก→ย่อย
   มีตัวอย่างครบตามสเปกแม้เปิดจาก localStorage รุ่นก่อน. */
function ensureSocialWorker(activities) {
  const seed = DEMO_ACTIVITIES.find((a) => a.id === 'act-social-worker');
  const has = activities.some((a) => a.id === seed.id || a.name.trim() === seed.name);
  return has ? activities : [...activities, seed];
}

/** ทะเบียนว่าง (เบราว์เซอร์ใหม่ / ยังไม่เคยตั้งค่า) ให้คืนชุดตั้งต้นแทน
    ไม่งั้น dropdown "กิจกรรม" ตอนผูกสิทธิและเพิ่มบุคลากรจะว่างเปล่า
    จนใช้งานไม่ได้เลย. เขียนทับได้ทันทีที่ผู้ใช้แก้ในหน้ากิจกรรม. */
export function readActivities() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw != null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return ensureSocialWorker(parsed.map(toActivityShape));
      return DEMO_ACTIVITIES;
    }
    /* migrate ข้อมูล Group Policy เดิม (ครั้งเดียว แล้วเก็บใน key ใหม่) */
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy != null) {
      const parsed = JSON.parse(legacy);
      if (Array.isArray(parsed) && parsed.length) {
        const migrated = ensureSocialWorker(parsed.map(toActivityShape));
        writeActivities(migrated);
        return migrated;
      }
    }
    return DEMO_ACTIVITIES;
  } catch {
    return DEMO_ACTIVITIES;
  }
}

export function writeActivities(activities) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
}

export function computeActivityStats(activities) {
  const subActivities = activities.flatMap((a) => a.subActivities || []);
  return {
    total: activities.length,
    active: subActivities.filter((s) => s.active).length,
    inactive: subActivities.filter((s) => !s.active).length,
  };
}

export function createActivity(name) {
  return {
    id: uid('act'),
    name: name.trim(),
    subActivities: [],
  };
}

export function createSubActivity(name, order) {
  return {
    id: uid('sub'),
    name: name.trim(),
    active: true,
    order,
  };
}

export function sortSubActivities(subActivities) {
  return [...(subActivities || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
}

export function reorderSubActivities(subActivities, fromIdx, toIdx) {
  const copy = sortSubActivities(subActivities);
  const [moved] = copy.splice(fromIdx, 1);
  copy.splice(toIdx, 0, moved);
  return copy.map((sub, i) => ({ ...sub, order: i + 1 }));
}

export function isDuplicateActivityName(activities, name, excludeId = null) {
  const norm = name.trim().toLowerCase();
  if (!norm) return false;
  return activities.some((a) => (
    a.id !== excludeId && a.name.trim().toLowerCase() === norm
  ));
}

export function loadDemoActivities() {
  writeActivities(DEMO_ACTIVITIES);
  return DEMO_ACTIVITIES;
}

export function clearActivities() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}
