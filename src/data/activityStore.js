/* PHCIS | Assess-control — ทะเบียนกิจกรรม (Activity-based Access Control).
   Mock persistence via localStorage; shapes match the list + popup flows.

   แทนที่ระบบ "Group Policy" เดิม: สิทธิ์การเข้าถึงเมนู/โมดูลผูกกับ
   **กิจกรรม (Activity)** ที่บุคลากรปฏิบัติ ไม่ใช่กลุ่มนโยบายแบบตายตัว
   - กิจกรรมหลัก  เช่น "นักสังคมสงเคราะห์"
   - กิจกรรมย่อย เช่น "นักสังคมสงเคราะห์ศูนย์", "นักสังคมสงเคราะห์นักจิตวิทยา"

   ข้อมูล Group Policy ที่ผู้ใช้เคยบันทึกไว้ใน browser จะถูก migrate
   อัตโนมัติตอนอ่าน (`readActivities`) — id เดิม (gp-… / sb-…) คงไว้เพื่อให้
   record สิทธิ์/บุคลากรที่อ้างถึงยังจับคู่ได้ ส่วน id ใหม่ใช้ act-… / sub-… */

/* v2 (22 ส.ค. 2569) — ชุด mock ใหม่อิงโครง ศบส. จริง; bump key เพื่อให้
   เบราว์เซอร์ที่เคยเก็บชุดเก่า (specialty โรงพยาบาล) เห็นชุดใหม่ทันที */
const STORAGE_KEY = 'mih:activities-v2';
const LEGACY_STORAGE_KEYS = ['mih:activities', 'mih:group-policies'];

const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/* กิจกรรมหลัก = สายงาน/บทบาทกิจกรรมของบุคลากรใน **ศูนย์บริการสาธารณสุข
   สำนักอนามัย กรุงเทพมหานคร** — กิจกรรมย่อย = งานบริการที่ ศบส. มีจริง
   อิงคู่มือระบบงานทั้ง 21 เล่ม (คลินิกตรวจรักษา · ทันตกรรม · เภสัชกรรมและ
   บริหารเวชภัณฑ์ · ชันสูตรโรค · รังสีวินิจฉัย · เวชระเบียน · ห้องเงิน ·
   สังคมสงเคราะห์และเวชศาสตร์ฟื้นฟู · สุขภาพจิต · วัณโรค · โรคติดต่อทาง
   เพศสัมพันธ์/เอดส์ · บำบัดสารเสพติด · ฝากครรภ์ · วางแผนครอบครัว ·
   สร้างเสริมภูมิคุ้มกันโรค · อนามัยโรงเรียน · สาธารณสุขชุมชน · สัตวแพทย์ ·
   ส่งเสริมสุขภาพเฉพาะกลุ่ม · สืบค้น/ส่งต่อ · Telemedicine)
   — ไม่มี specialty ระดับโรงพยาบาล (ศัลยกรรม/ออร์โธ/จักษุ ฯลฯ) เพราะ
   ศบส. เป็นหน่วยบริการปฐมภูมิ. */
export const DEMO_ACTIVITIES = [
  {
    id: 'gp-doctor',
    name: 'แพทย์',
    subActivities: [
      { id: 'sb-gp',          name: 'ตรวจรักษาโรคทั่วไป', active: true, order: 1 },
      { id: 'sb-family',      name: 'เวชศาสตร์ครอบครัวและเยี่ยมบ้าน', active: true, order: 2 },
      { id: 'sb-ncd',         name: 'คลินิกโรคเรื้อรัง (เบาหวาน/ความดัน)', active: true, order: 3 },
      { id: 'sb-anc-doctor',  name: 'คลินิกฝากครรภ์', active: true, order: 4 },
      { id: 'sb-wellbaby',    name: 'คลินิกสุขภาพเด็กดี', active: true, order: 5 },
      { id: 'sb-elderly-doc', name: 'คลินิกผู้สูงอายุครบวงจร', active: true, order: 6 },
      { id: 'sb-mental',      name: 'คลินิกสุขภาพจิต', active: true, order: 7 },
      { id: 'sb-tb',          name: 'คลินิกวัณโรค', active: true, order: 8 },
      { id: 'sb-sti',         name: 'คลินิกรักปลอดภัย', active: true, order: 9 },
      { id: 'sb-drug-clinic', name: 'คลินิกบำบัดสารเสพติด', active: true, order: 10 },
      { id: 'sb-telemed',     name: 'แพทย์ทางไกล (Telemedicine)', active: true, order: 11 },
    ],
  },
  {
    id: 'act-dentist',
    name: 'ทันตแพทย์',
    subActivities: [
      { id: 'sub-dent-opd',       name: 'ตรวจรักษาทางทันตกรรม', active: true, order: 1 },
      { id: 'sub-dent-prevent',   name: 'ทันตกรรมป้องกันในโรงเรียน', active: true, order: 2 },
      { id: 'sub-dent-community', name: 'ทันตสาธารณสุขชุมชน', active: true, order: 3 },
    ],
  },
  {
    id: 'gp-pharmacist',
    name: 'เภสัชกร',
    subActivities: [
      { id: 'sb-dispense', name: 'จ่ายยาผู้ป่วยนอก', active: true, order: 1 },
      { id: 'sb-stock',    name: 'บริหารคลังยาและเวชภัณฑ์', active: true, order: 2 },
      { id: 'sb-counsel',  name: 'ให้คำปรึกษาด้านยา', active: true, order: 3 },
    ],
  },
  {
    id: 'gp-nurse',
    name: 'พยาบาลวิชาชีพ',
    subActivities: [
      { id: 'sb-opd',           name: 'คัดกรองและซักประวัติ (OPD)', active: true, order: 1 },
      { id: 'sb-er',            name: 'ปฐมพยาบาลและฉุกเฉิน', active: true, order: 2 },
      { id: 'sb-anc',           name: 'คลินิกฝากครรภ์', active: true, order: 3 },
      { id: 'sb-fp',            name: 'วางแผนครอบครัว', active: true, order: 4 },
      { id: 'sb-vaccine',       name: 'สร้างเสริมภูมิคุ้มกันโรค (วัคซีน)', active: true, order: 5 },
      { id: 'sb-nurse-com',     name: 'พยาบาลอนามัยชุมชน (เยี่ยมบ้าน)', active: true, order: 6 },
      { id: 'sb-homeward',      name: 'การพยาบาลต่อเนื่องที่บ้าน (Home Ward)', active: true, order: 7 },
      { id: 'sb-elderly-nurse', name: 'คลินิกผู้สูงอายุครบวงจร', active: true, order: 8 },
      { id: 'sb-ipd',           name: 'สังเกตอาการ', active: false, order: 9 },
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
    id: 'gp-public-health',
    name: 'นักวิชาการสาธารณสุข',
    subActivities: [
      { id: 'sb-community',    name: 'งานสาธารณสุขชุมชน', active: true, order: 1 },
      { id: 'sb-school',       name: 'งานอนามัยโรงเรียน', active: true, order: 2 },
      { id: 'sb-epidemic',     name: 'งานควบคุมโรคติดต่อและระบาดวิทยา', active: true, order: 3 },
      { id: 'sb-health-promo', name: 'งานสร้างเสริมสุขภาพและป้องกันโรค', active: true, order: 4 },
      { id: 'sb-envocc',       name: 'งานอาชีวอนามัยและอนามัยสิ่งแวดล้อม', active: true, order: 5 },
    ],
  },
  {
    /* มติ คทง.4 — อสส. ล็อกอินบันทึกผลปฏิบัติงานเองได้เพื่อเบิกค่าป่วยการ
       แต่เห็นเฉพาะเคสที่ได้รับมอบหมาย (แม่แบบสิทธิ์ scope = assigned) */
    id: 'act-volunteer',
    name: 'อาสาสมัครสาธารณสุข (อสส.)',
    subActivities: [
      { id: 'sub-vol-visit', name: 'เยี่ยมบ้านตามที่ได้รับมอบหมาย', active: true, order: 1 },
      { id: 'sub-vol-survey', name: 'สำรวจข้อมูลสุขภาพครัวเรือน', active: true, order: 2 },
      { id: 'sub-vol-screen', name: 'คัดกรองสุขภาพเบื้องต้นในชุมชน', active: true, order: 3 },
    ],
  },
  {
    id: 'gp-medtech',
    name: 'นักเทคนิคการแพทย์',
    subActivities: [
      { id: 'sb-lab',         name: 'ห้องปฏิบัติการชันสูตรโรค', active: true, order: 1 },
      { id: 'sb-lab-collect', name: 'เจาะเก็บสิ่งส่งตรวจ', active: true, order: 2 },
      { id: 'sb-lab-sendout', name: 'งานส่งตรวจภายนอก (Send-out)', active: true, order: 3 },
    ],
  },
  {
    id: 'gp-radiology',
    name: 'นักรังสีการแพทย์',
    subActivities: [
      { id: 'sb-xray', name: 'รังสีวินิจฉัยทั่วไป (เอกซเรย์)', active: true, order: 1 },
      { id: 'sb-pacs', name: 'ผู้ดูแลระบบ PACS', active: true, order: 2 },
    ],
  },
  {
    id: 'act-physio',
    name: 'นักกายภาพบำบัด',
    subActivities: [
      { id: 'sub-pt-opd',  name: 'กายภาพบำบัดผู้ป่วยนอก', active: true, order: 1 },
      { id: 'sub-pt-home', name: 'ฟื้นฟูสมรรถภาพที่บ้านและชุมชน', active: true, order: 2 },
    ],
  },
  {
    id: 'gp-dental-health',
    name: 'เจ้าพนักงานทันตสาธารณสุข',
    subActivities: [
      { id: 'sb-dent-assist', name: 'ผู้ช่วยงานทันตกรรม', active: true, order: 1 },
      { id: 'sb-dent-school', name: 'ทันตสุขศึกษาในโรงเรียน', active: true, order: 2 },
    ],
  },
  {
    id: 'gp-registrar',
    name: 'เจ้าหน้าที่เวชระเบียน',
    subActivities: [
      { id: 'sb-reg-front', name: 'จุดคัดกรอง/ลงทะเบียนและตรวจสอบสิทธิ', active: true, order: 1 },
      { id: 'sb-reg-file',  name: 'แฟ้มเวชระเบียนและการส่งต่อ', active: true, order: 2 },
      { id: 'sb-reg-queue', name: 'ประชาสัมพันธ์และจัดการคิว', active: true, order: 3 },
    ],
  },
  {
    id: 'gp-finance',
    name: 'เจ้าหน้าที่การเงิน',
    subActivities: [
      { id: 'sb-cashier', name: 'การเงินและเก็บเงิน (ห้องเงิน)', active: true, order: 1 },
      { id: 'sb-claim',   name: 'งานเคลมและสิทธิการรักษา', active: true, order: 2 },
    ],
  },
  {
    id: 'act-vet',
    name: 'สัตวแพทย์',
    subActivities: [
      { id: 'sub-vet-clinic', name: 'คลินิกสัตวแพทย์ (วัคซีน/ทำหมัน)', active: true, order: 1 },
      { id: 'sub-vet-rabies', name: 'งานควบคุมโรคพิษสุนัขบ้า', active: true, order: 2 },
    ],
  },
  {
    id: 'gp-admin',
    name: 'ผู้ดูแลระบบ',
    subActivities: [
      { id: 'sb-sysadmin',   name: 'ผู้ดูแลระบบศูนย์', active: true, order: 1 },
      { id: 'sb-superadmin', name: 'ผู้ดูแลระบบส่วนกลาง (สำนักอนามัย)', active: true, order: 2 },
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
    /* key เก่า (ชุด mock ยุค Group Policy / v1) ไม่ migrate — ชุดใหม่อิง
       โครง ศบส. จริงแทน; การแก้ไขหลังจากนี้เก็บใน key v2 ตามปกติ */
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

/* กิจกรรมย่อยเรียงตามตัวอักษรไทยเสมอ — ไม่มีการจัดลำดับเอง (ตัดฟีเจอร์
   "แก้ไขลำดับ" ออก 22 ส.ค. 2569 ตาม feedback ผู้ใช้) field `order` เดิม
   ยังอยู่ใน record เก่าได้ แค่ไม่ถูกใช้เรียงแล้ว */
export function sortSubActivities(subActivities) {
  return [...(subActivities || [])].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'th'));
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
  LEGACY_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
}
