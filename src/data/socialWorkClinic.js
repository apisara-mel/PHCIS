/* socialWorkClinic.js — mock data + helpers for งานสังคมสงเคราะห์ (TOR §1.10.11).

   Vocabulary follows the legacy HCIS manual (คู่มือระบบงานสังคมสงเคราะห์และ
   เวชศาสตร์ฟื้นฟู §2.4–2.9): แบบบันทึกผู้ใช้บริการสังคมสงเคราะห์ "สส.2" with
   its 5 tabs — ข้อมูลทั่วไป · ข้อมูลประวัติครอบครัว · ปัญหาสังคมสงเคราะห์
   (ปัญหาหลัก 1 ข้อ + ปัญหารองไม่เกิน 3 ข้อ) · บริการหรือกิจกรรม ·
   การติดตามผล — plus การยุติการให้บริการ.

   Session-mutable state (queue check-in / cancels, registry saves, สส.2
   records, drafts, rights toggle, print log, appointments) lives in
   sessionStorage — same pattern as `mentalHealthClinic.js` / `ancVisits.js`:
   survives route navigation within the tab, resets per browser session so
   the mock always demos clean. */

/* ── sessionStorage plumbing (mirrors mentalHealthClinic.js) ────────── */
const storageAvailable = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const readJson = (key, fallback) => {
  if (!storageAvailable()) return fallback;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(key) || 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  if (!storageAvailable()) return;
  window.sessionStorage.setItem(key, JSON.stringify(value));
};

const K = {
  checkedIn: 'mih:sw:checked-in',
  queueCancelled: 'mih:sw:queue-cancelled',
  registry: 'mih:sw:registry-overlay',
  registryRun: 'mih:sw:registry-run',
  visits: 'mih:sw:visit-records',
  drafts: 'mih:sw:drafts',
  rights: 'mih:sw:rights',
  printLog: 'mih:sw:print-log',
  appointments: 'mih:sw:appointments',
};

/* ── Date helpers ──────────────────────────────────────────────────── */
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export const formatSwDate = (v) => {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
};

export const formatSwDateTime = (v) => {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${formatSwDate(d)} ${hh}:${mm} น.`;
};

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const daysUntil = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
};

export const formatBaht = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `${v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;
};

/* ── Current user (mock) + สิทธิงานสังคมสงเคราะห์ (§1.4.2) ──────────── */
export const SW_CURRENT_USER = 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ';

/* A social-work case file carries ข้อมูลลับ: ปัญหาความรุนแรง / ทารุณกรรม /
   คดีความ / HIV. Users without the social-work right still see the worklist
   but the problem detail + narrative are masked and every write action is
   disabled. sessionStorage-backed so the masked state is demoable. */
export const hasSocialWorkRights = () => readJson(K.rights, 'granted') === 'granted';
export const setSocialWorkRights = (granted) => writeJson(K.rights, granted ? 'granted' : 'denied');

export const SW_MASKED = '••••••••';
export const maskSwConfidential = (text) => (hasSocialWorkRights() ? text : SW_MASKED);

/* ── เจ้าหน้าที่ผู้ให้บริการ ────────────────────────────────────────── */
export const SW_WORKERS = [
  'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ',
  'นักสังคมสงเคราะห์ พีระพัฒน์ เกื้อกูล',
  'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์',
  'นักจิตวิทยา วริษา ตั้งตรง',
];

export const SW_CLINICS = [
  { value: 'social', label: 'คลินิกสังคมสงเคราะห์' },
  { value: 'rehab', label: 'คลินิกเวชศาสตร์ฟื้นฟู' },
  { value: 'community', label: 'ออกหน่วยชุมชน / เยี่ยมบ้าน' },
];

export const resolveSwClinic = (value) =>
  SW_CLINICS.find((c) => c.value === value)?.label || '—';

/* ── การรับเรื่อง (manual §2.7 tab "ข้อมูลทั่วไป") ─────────────────── */
export const SW_INTAKE_CHANNELS = [
  { value: 'walkin', label: 'ผู้รับบริการมาเอง' },
  { value: 'homevisit', label: 'พบจากการเยี่ยมบ้าน' },
  { value: 'internal', label: 'ส่งต่อภายในศูนย์บริการสาธารณสุข' },
  { value: 'external', label: 'ส่งต่อจากหน่วยงานภายนอก' },
];
export const resolveSwIntakeChannel = (value) =>
  SW_INTAKE_CHANNELS.find((c) => c.value === value)?.label || '—';

export const SW_CLIENT_TYPES = [
  { value: 'new', label: 'ผู้ใช้บริการรายใหม่' },
  { value: 'old', label: 'ผู้ใช้บริการรายเก่า' },
];
export const resolveSwClientType = (value) =>
  SW_CLIENT_TYPES.find((c) => c.value === value)?.label || '—';

export const SW_TARGET_GROUPS = [
  { value: 'elderly', label: 'ผู้สูงอายุ' },
  { value: 'disabled', label: 'คนพิการ' },
  { value: 'bedridden', label: 'ผู้ป่วยติดเตียง / ผู้ป่วยเรื้อรัง' },
  { value: 'child', label: 'เด็กและเยาวชน' },
  { value: 'teenmom', label: 'มารดาวัยรุ่น / หญิงตั้งครรภ์' },
  { value: 'homeless', label: 'ผู้ไร้ที่พึ่ง / เร่ร่อน' },
  { value: 'violence', label: 'ผู้ประสบปัญหาความรุนแรง' },
  { value: 'psych', label: 'ผู้ป่วยจิตเวช / ผู้ติดสารเสพติด' },
];
export const resolveSwTargetGroup = (value) =>
  SW_TARGET_GROUPS.find((g) => g.value === value)?.label || '—';

export const SW_INFORMANT_RELATIONS = [
  { value: 'self', label: 'ตนเอง' },
  { value: 'spouse', label: 'คู่สมรส' },
  { value: 'child', label: 'บุตร / ธิดา' },
  { value: 'parent', label: 'บิดา / มารดา' },
  { value: 'relative', label: 'ญาติ' },
  { value: 'neighbor', label: 'เพื่อนบ้าน' },
  { value: 'volunteer', label: 'อาสาสมัครสาธารณสุข (อสส.)' },
  { value: 'officer', label: 'เจ้าหน้าที่หน่วยงาน' },
];
export const resolveSwInformantRelation = (value) =>
  SW_INFORMANT_RELATIONS.find((r) => r.value === value)?.label || '—';

/* ── ปัญหาสังคมสงเคราะห์ (coded list — ปัญหาหลัก 1 / ปัญหารอง ≤3) ─────
   `sensitive: true` marks the codes that §1.4.2 masks for users without the
   social-work right (ความรุนแรง · ทารุณกรรม · คดีความ · HIV). */
export const SW_MAX_SECONDARY_PROBLEMS = 3;

export const SW_PROBLEMS = [
  { code: 'P01', label: 'ปัญหาเศรษฐกิจ — รายได้ไม่พอกับรายจ่าย' },
  { code: 'P02', label: 'ปัญหาค่ารักษาพยาบาล / ไม่สามารถจ่ายค่ารักษาได้' },
  { code: 'P03', label: 'ปัญหาที่อยู่อาศัยไม่มั่นคง / สภาพแวดล้อมไม่เหมาะสม' },
  { code: 'P04', label: 'ปัญหาการศึกษาของบุตร / ขาดทุนการศึกษา' },
  { code: 'P05', label: 'ปัญหาการประกอบอาชีพ / ว่างงาน' },
  { code: 'P06', label: 'ปัญหาสัมพันธภาพในครอบครัว' },
  { code: 'P07', label: 'ปัญหาผู้สูงอายุถูกทอดทิ้ง / ขาดผู้ดูแล' },
  { code: 'P08', label: 'ปัญหาคนพิการเข้าไม่ถึงสิทธิและสวัสดิการ' },
  { code: 'P09', label: 'ปัญหาผู้ป่วยติดเตียงขาดวัสดุและกายอุปกรณ์' },
  { code: 'P10', label: 'ปัญหาไม่มีสถานะทางทะเบียน / ไม่มีสิทธิการรักษา' },
  { code: 'P11', label: 'ปัญหาการเข้าถึงบริการสุขภาพ / ขาดผู้พาไปรักษา' },
  { code: 'P12', label: 'ปัญหาสุขภาพจิต / ผู้ป่วยจิตเวชในครอบครัว' },
  { code: 'P13', label: 'ปัญหาสารเสพติดและสุรา' },
  { code: 'P14', label: 'ปัญหาความรุนแรงในครอบครัว', sensitive: true },
  { code: 'P15', label: 'ปัญหาถูกทารุณกรรม / ถูกล่วงละเมิด', sensitive: true },
  { code: 'P16', label: 'ปัญหากฎหมายและคดีความ', sensitive: true },
  { code: 'P17', label: 'ปัญหาการติดเชื้อเอชไอวี / เอดส์', sensitive: true },
];

export const SW_PROBLEM_OPTIONS = SW_PROBLEMS.map((p) => ({
  value: p.code,
  label: `${p.code} — ${p.label}`,
}));

export const findSwProblem = (code) => SW_PROBLEMS.find((p) => p.code === code) || null;

export const isSwProblemSensitive = (code) => !!findSwProblem(code)?.sensitive;

/* ป้ายปัญหาที่แสดงในตาราง — masked เมื่อเป็นรหัสลับและผู้ใช้ไม่มีสิทธิ */
export const resolveSwProblemLabel = (code) => {
  const p = findSwProblem(code);
  if (!p) return '—';
  if (p.sensitive && !hasSocialWorkRights()) return `${p.code} — ${SW_MASKED}`;
  return `${p.code} — ${p.label}`;
};

/* ── การช่วยเหลือ — เงินสนับสนุน 5 ประเภท (แบบ สส.2) ───────────────── */
export const SW_FUND_TYPES = [
  { value: 'career', label: 'เงินทุนประกอบอาชีพ', ceiling: 5000 },
  { value: 'education', label: 'เงินทุนการศึกษา', ceiling: 4000 },
  { value: 'transport', label: 'ค่าพาหนะเดินทาง', ceiling: 1500 },
  { value: 'living', label: 'ค่าครองชีพชั่วคราว', ceiling: 3000 },
  { value: 'treatment', label: 'ค่ารักษาพยาบาล', ceiling: 10000 },
];
export const resolveSwFundType = (value) =>
  SW_FUND_TYPES.find((f) => f.value === value)?.label || '—';

/* ── บริการอื่นตามแบบ สส.2 (8 หมวด) ────────────────────────────────── */
export const SW_SERVICE_CATEGORIES = [
  {
    key: 'service', label: 'การบริการ', icon: 'support_agent',
    items: [
      'ให้บริการปรึกษารายบุคคล',
      'ประสานสิทธิการรักษาพยาบาล',
      'ช่วยเหลือด้านเอกสาร/ทะเบียนราษฎร',
      'จัดหาผู้ดูแลชั่วคราว',
    ],
  },
  {
    key: 'prevention', label: 'การป้องกันปัญหา', icon: 'health_and_safety',
    items: [
      'ให้ความรู้การป้องกันความรุนแรงในครอบครัว',
      'เฝ้าระวังกลุ่มเสี่ยงในชุมชน',
      'ให้คำแนะนำการจัดการหนี้สินครัวเรือน',
    ],
  },
  {
    key: 'empower', label: 'ส่งเสริมและพัฒนาศักยภาพ', icon: 'trending_up',
    items: [
      'ส่งฝึกอาชีพระยะสั้น',
      'ส่งเสริมการรวมกลุ่มในชุมชน',
      'สนับสนุนการกลับเข้าสู่ระบบการศึกษา',
    ],
  },
  {
    key: 'rehab', label: 'ฟื้นฟูสมรรถภาพ', icon: 'accessible',
    items: [
      'ส่งต่อกายภาพบำบัด',
      'ฝึกการทำกิจวัตรประจำวัน (ADL)',
      'ปรับสภาพแวดล้อมที่อยู่อาศัยให้เหมาะกับคนพิการ',
    ],
  },
  {
    key: 'resource', label: 'บริหารจัดการทรัพยากรทางสังคม', icon: 'diversity_3',
    items: [
      'ประสานมูลนิธิ/องค์กรการกุศล',
      'ประสานกองทุนหลักประกันสุขภาพระดับพื้นที่',
      'ระดมทรัพยากรจากภาคเอกชนในพื้นที่',
    ],
  },
  {
    key: 'welfare', label: 'สนับสนุนสวัสดิการสังคม', icon: 'volunteer_activism',
    items: [
      'ยื่นขอเบี้ยยังชีพผู้สูงอายุ',
      'ยื่นขอเบี้ยความพิการ',
      'ยื่นขอสงเคราะห์ครอบครัวผู้มีรายได้น้อย',
      'ขึ้นทะเบียนคนพิการ (บัตรประจำตัวคนพิการ)',
    ],
  },
  {
    key: 'rights', label: 'พิทักษ์สิทธิ์', icon: 'gavel',
    items: [
      'ประสานพนักงานเจ้าหน้าที่ตาม พ.ร.บ.คุ้มครองผู้ถูกกระทำด้วยความรุนแรงฯ',
      'ประสานศูนย์ช่วยเหลือสังคม 1300',
      'ให้คำแนะนำสิทธิตามกฎหมาย',
    ],
  },
  {
    key: 'coordinate', label: 'ประสานและส่งต่อ', icon: 'sync_alt',
    items: [
      'ส่งต่อ รพ.แม่ข่ายตามสิทธิ',
      'ส่งต่อบ้านพักเด็กและครอบครัว',
      'ส่งต่อศูนย์คุ้มครองคนไร้ที่พึ่ง',
      'ส่งต่อสำนักงานเขต / ฝ่ายพัฒนาชุมชน',
    ],
  },
];

/* ── ข้อความแนะนำสำหรับ SuggestibleTextarea (ทุกช่องที่บุคลากรพิมพ์) ── */
export const SW_ADVICE_SUGGESTIONS = [
  'ให้คำปรึกษาเรื่องการจัดการรายรับ-รายจ่ายในครัวเรือน',
  'ให้คำแนะนำการยื่นขอเบี้ยความพิการที่สำนักงานเขต',
  'ให้กำลังใจผู้ดูแลและแนะนำการผลัดเปลี่ยนผู้ดูแล',
  'แนะนำสิทธิการรักษาพยาบาลและการย้ายสิทธิให้ตรงพื้นที่',
  'ให้คำปรึกษาการวางแผนการดูแลผู้ป่วยติดเตียงที่บ้าน',
];

export const SW_DIAGNOSIS_SUGGESTIONS = [
  'ครอบครัวมีรายได้ต่ำกว่าเส้นความยากจน ไม่มีเงินสำรองสำหรับค่าเดินทางมารักษา',
  'ผู้สูงอายุอยู่ลำพัง ขาดผู้ดูแลหลัก เสี่ยงต่อภาวะแทรกซ้อนจากแผลกดทับ',
  'ผู้ป่วยติดเตียงต้องใช้ผ้าอ้อมและอาหารทางการแพทย์ต่อเนื่อง แต่ครอบครัวรับภาระไม่ไหว',
  'มารดาวัยรุ่นขาดความรู้ในการเลี้ยงดูบุตรและขาดแคลนนมผง',
  'ผู้รับบริการไม่มีสถานะทางทะเบียน ทำให้เข้าไม่ถึงสิทธิการรักษา',
];

export const SW_ASSESSMENT_SUGGESTIONS = [
  'ประเมินว่าครอบครัวมีศักยภาพในการดูแลระดับปานกลาง ต้องการการสนับสนุนวัสดุต่อเนื่อง',
  'ประเมินความเสี่ยงต่อการถูกทอดทิ้งอยู่ในระดับสูง ควรติดตามเยี่ยมบ้านทุกเดือน',
  'ผู้รับบริการมีแรงจูงใจในการประกอบอาชีพ เหมาะกับการสนับสนุนเงินทุนประกอบอาชีพ',
  'สภาพแวดล้อมที่อยู่อาศัยไม่เหมาะกับคนพิการ ควรปรับปรุงห้องน้ำและทางลาด',
];

export const SW_SOCIAL_HISTORY_SUGGESTIONS = [
  'เคยรับการช่วยเหลือด้านค่าพาหนะจากศูนย์บริการสาธารณสุขเมื่อปีที่ผ่านมา',
  'ไม่เคยรับบริการสังคมสงเคราะห์มาก่อน',
  'อยู่ระหว่างขึ้นทะเบียนคนพิการกับสำนักงานเขต',
  'ได้รับเบี้ยยังชีพผู้สูงอายุเดือนละ 700 บาท',
];

export const SW_FOLLOWUP_SUGGESTIONS = [
  'เยี่ยมบ้านพบผู้รับบริการอาการดีขึ้น ใช้กายอุปกรณ์ได้เหมาะสม',
  'โทรศัพท์ติดตาม ครอบครัวแจ้งว่าได้รับวัสดุครบตามที่ขอ',
  'ติดตามไม่ได้ — ย้ายที่อยู่ ไม่สามารถติดต่อทางโทรศัพท์ได้',
  'ผู้รับบริการเริ่มประกอบอาชีพค้าขายเล็ก ๆ หน้าบ้านแล้ว',
];

export const SW_TERMINATION_SUGGESTIONS = [
  'ปัญหาได้รับการแก้ไขแล้ว ครอบครัวสามารถดูแลตนเองได้',
  'ผู้รับบริการย้ายภูมิลำเนาไปต่างจังหวัด ส่งต่อหน่วยงานในพื้นที่แล้ว',
  'ผู้รับบริการเสียชีวิต',
  'ผู้รับบริการปฏิเสธการรับบริการต่อ',
];

export const SW_NURSE_NOTE_SUGGESTIONS = [
  'ผู้รับบริการมาพร้อมผู้ดูแล ประเมินสัญญาณชีพอยู่ในเกณฑ์ปกติ',
  'ผู้รับบริการนั่งรถเข็นมา มีแผลกดทับบริเวณก้นกบระยะที่ 2',
  'ญาติแจ้งว่าผู้ป่วยรับประทานอาหารได้น้อย น้ำหนักลดลง',
  'ผู้รับบริการมีสีหน้าวิตกกังวล ต้องการความช่วยเหลือด้านค่าใช้จ่าย',
];

export const SW_REFER_SUGGESTIONS = [
  'ส่งต่อเพื่อประเมินและฟื้นฟูสมรรถภาพที่คลินิกเวชศาสตร์ฟื้นฟู',
  'ส่งต่อบ้านพักเด็กและครอบครัวกรุงเทพมหานครเพื่อคุ้มครองสวัสดิภาพ',
  'ส่งต่อศูนย์คุ้มครองคนไร้ที่พึ่งเพื่อจัดหาที่พักชั่วคราว',
  'ส่งต่อ รพ.แม่ข่ายตามสิทธิเพื่อรับการรักษาต่อเนื่อง',
];

export const SW_MEDICAL_ORDER_SUGGESTIONS = [
  'ทำแผลกดทับวันละ 1 ครั้ง และประเมินซ้ำทุกสัปดาห์',
  'ส่งพบแพทย์เวชศาสตร์ฟื้นฟูเพื่อประเมินการใช้กายอุปกรณ์',
  'ส่งนักกายภาพบำบัดเยี่ยมบ้านเดือนละ 1 ครั้ง',
  'สั่งอาหารทางการแพทย์สูตรครบถ้วน วันละ 3 มื้อ',
];

/* ── ปลายทางส่งต่อ ─────────────────────────────────────────────────── */
export const SW_REFERRAL_DESTINATIONS = [
  { value: 'rehab', label: 'คลินิกเวชศาสตร์ฟื้นฟู (ภายในศูนย์)' },
  { value: 'mental', label: 'คลินิกสุขภาพจิต (ภายในศูนย์)' },
  { value: 'homecare', label: 'ทีมเยี่ยมบ้าน (ภายในศูนย์)' },
  { value: 'shelter', label: 'บ้านพักเด็กและครอบครัวกรุงเทพมหานคร' },
  { value: 'homeless', label: 'ศูนย์คุ้มครองคนไร้ที่พึ่งกรุงเทพมหานคร' },
  { value: 'district', label: 'สำนักงานเขต — ฝ่ายพัฒนาชุมชนและสวัสดิการสังคม' },
  { value: 'hospital', label: 'โรงพยาบาลแม่ข่ายตามสิทธิ' },
  { value: 'hotline', label: 'ศูนย์ช่วยเหลือสังคม สายด่วน 1300' },
];
export const resolveSwReferralDestination = (value) =>
  SW_REFERRAL_DESTINATIONS.find((d) => d.value === value)?.label || '—';

export const SW_REFER_SCOPES = [
  { value: 'internal', label: 'ส่งต่อภายในศูนย์บริการสาธารณสุข' },
  { value: 'external', label: 'ส่งต่อหน่วยงานภายนอก' },
];

/* ── คิวงานสังคมสงเคราะห์ (TOR 1.10.11.2) ──────────────────────────── */
export const SW_QUEUE_PATIENTS = [
  {
    queue: 'SW01', hn: '67-00012', name: 'วิชัย รุ่งเรือง', sex: 'ชาย', age: '60 ปี',
    cid: '3100600287451', insurance: 'สิทธิบัตรทอง',
    caseNo: 'สค.0001/2569', arrivalTime: '08:35',
    targetGroup: 'bedridden', intakeChannel: 'internal', clientType: 'old',
    primaryProblem: 'P09',
    worker: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', clinic: 'social',
    statusKey: 'progress', waitMinutes: 32,
    confidential: false, drugAllergy: true, followUpOverdue: false,
  },
  {
    queue: 'SW02', hn: '67-00007', name: 'มาลี อ่อนน้อม', sex: 'หญิง', age: '45 ปี',
    cid: '3101700592318', insurance: 'สิทธิประกันสังคม',
    caseNo: 'สค.0002/2569', arrivalTime: '08:52',
    targetGroup: 'elderly', intakeChannel: 'walkin', clientType: 'old',
    primaryProblem: 'P02',
    worker: 'นักสังคมสงเคราะห์ พีระพัฒน์ เกื้อกูล', clinic: 'social',
    statusKey: 'waiting', waitMinutes: 21,
    confidential: false, drugAllergy: false, followUpOverdue: false,
  },
  {
    queue: 'SW03', hn: '67-00003', name: 'ปริญญา รัตนา', sex: 'หญิง', age: '54 ปี',
    cid: '5670012380043', insurance: 'สิทธิข้าราชการ',
    caseNo: 'สค.0003/2569', arrivalTime: '09:05',
    targetGroup: 'bedridden', intakeChannel: 'homevisit', clientType: 'old',
    primaryProblem: 'P07',
    worker: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์', clinic: 'community',
    statusKey: 'waiting', waitMinutes: 14,
    confidential: false, drugAllergy: false, followUpOverdue: true,
  },
  {
    queue: 'SW04', hn: '67-00019', name: 'นันทิดา พรเลิศ', sex: 'หญิง', age: '28 ปี',
    cid: '1101400963275', insurance: 'สิทธิหมดอายุ (ยังไม่ลงทะเบียน)', rightsExpired: true,
    caseNo: '', arrivalTime: '09:20',
    targetGroup: 'teenmom', intakeChannel: 'walkin', clientType: 'new',
    primaryProblem: 'P01',
    worker: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', clinic: 'social',
    statusKey: 'waiting', waitMinutes: 9,
    confidential: false, drugAllergy: false, followUpOverdue: false,
  },
  {
    queue: 'SW05', hn: '67-00009', name: 'กิตติ ศรีสมบูรณ์', sex: 'ชาย', age: '52 ปี',
    cid: '—  (ไม่มีเลขบัตรประชาชน)', insurance: 'ไม่มีสิทธิการรักษา', noRights: true,
    caseNo: '', arrivalTime: '09:41',
    targetGroup: 'homeless', intakeChannel: 'external', clientType: 'new',
    primaryProblem: 'P10',
    worker: 'นักสังคมสงเคราะห์ พีระพัฒน์ เกื้อกูล', clinic: 'social',
    statusKey: 'waiting', waitMinutes: 5,
    confidential: false, drugAllergy: false, followUpOverdue: false,
  },
  {
    queue: 'SW06', hn: '67-00021', name: 'วรรณภา ทองดี', sex: 'หญิง', age: '50 ปี',
    cid: '3102200478196', insurance: 'สิทธิบัตรทอง',
    caseNo: 'สค.0004/2569', arrivalTime: '10:02',
    targetGroup: 'violence', intakeChannel: 'internal', clientType: 'old',
    primaryProblem: 'P14',
    worker: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์', clinic: 'social',
    statusKey: 'progress', waitMinutes: 18,
    confidential: true, drugAllergy: false, followUpOverdue: false,
  },
  {
    queue: 'SW07', hn: '67-00014', name: 'ชัยวัฒน์ ก้องเกียรติ', sex: 'ชาย', age: '47 ปี',
    cid: '3100900341827', insurance: 'สิทธิบัตรทอง',
    caseNo: 'สค.0005/2569', arrivalTime: '10:18',
    targetGroup: 'disabled', intakeChannel: 'walkin', clientType: 'old',
    primaryProblem: 'P05',
    worker: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', clinic: 'social',
    statusKey: 'draft', draftStep: 4, waitMinutes: 0,
    confidential: false, drugAllergy: true, followUpOverdue: false,
  },
  {
    queue: 'SW08', hn: '67-00017', name: 'ภัคจิรา วงศ์อนันต์', sex: 'หญิง', age: '41 ปี',
    cid: '3101100728934', insurance: 'สิทธิประกันสังคม',
    caseNo: 'สค.0006/2569', arrivalTime: '10:35',
    targetGroup: 'child', intakeChannel: 'external', clientType: 'old',
    primaryProblem: 'P04',
    worker: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์', clinic: 'social',
    statusKey: 'done', waitMinutes: 0,
    confidential: false, drugAllergy: false, followUpOverdue: true,
  },
  {
    queue: 'SW09', hn: '67-00005', name: 'สุดา ปลอดโปร่ง', sex: 'หญิง', age: '67 ปี',
    cid: '3550900192864', insurance: 'สิทธิบัตรทอง',
    caseNo: 'สค.0007/2569', arrivalTime: '11:04',
    targetGroup: 'elderly', intakeChannel: 'homevisit', clientType: 'old',
    primaryProblem: 'P07',
    worker: 'นักสังคมสงเคราะห์ พีระพัฒน์ เกื้อกูล', clinic: 'community',
    statusKey: 'done', waitMinutes: 0,
    confidential: false, drugAllergy: false, followUpOverdue: false,
  },
];

/* ผู้ที่นัดวันนี้แต่ยังไม่มาติดต่อ */
export const SW_SCHEDULED_TODAY = [
  {
    hn: '67-00022', name: 'อนุชา สมบูรณ์ทรัพย์', sex: 'ชาย', age: '44 ปี',
    cid: '3100300581927', insurance: 'สิทธิบัตรทอง',
    caseNo: 'สค.0008/2569', appointmentTime: '13:30',
    targetGroup: 'disabled', intakeChannel: 'walkin', clientType: 'old',
    primaryProblem: 'P08', purpose: 'นัดรับกายอุปกรณ์ (รถเข็นนั่ง)',
    worker: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', clinic: 'social',
  },
  {
    hn: '67-00025', name: 'ภาสกร ชาญฉลาด', sex: 'ชาย', age: '41 ปี',
    cid: '3100700493812', insurance: 'ชำระเอง',
    caseNo: 'สค.0009/2569', appointmentTime: '14:30',
    targetGroup: 'bedridden', intakeChannel: 'homevisit', clientType: 'old',
    primaryProblem: 'P09', purpose: 'นัดติดตามผลหลังได้รับเงินสงเคราะห์',
    worker: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์', clinic: 'community',
  },
];

export const checkInSwAppointment = (hn) => {
  const checked = readJson(K.checkedIn, []);
  if (!checked.includes(hn)) writeJson(K.checkedIn, [...checked, hn]);
};

export const getSwScheduledNotArrived = () => {
  const checked = readJson(K.checkedIn, []);
  return SW_SCHEDULED_TODAY.filter((r) => !checked.includes(r.hn));
};

export const getSwQueueRows = () => {
  const checked = readJson(K.checkedIn, []);
  const arrivals = SW_SCHEDULED_TODAY.filter((r) => checked.includes(r.hn)).map((r, i) => ({
    queue: `SW${String(SW_QUEUE_PATIENTS.length + i + 1).padStart(2, '0')}`,
    hn: r.hn, name: r.name, sex: r.sex, age: r.age, cid: r.cid, insurance: r.insurance,
    caseNo: r.caseNo, arrivalTime: r.appointmentTime,
    targetGroup: r.targetGroup, intakeChannel: r.intakeChannel, clientType: r.clientType,
    primaryProblem: r.primaryProblem,
    worker: r.worker, clinic: r.clinic,
    statusKey: 'waiting', waitMinutes: 0,
    confidential: false, drugAllergy: false, followUpOverdue: false,
  }));
  return [...SW_QUEUE_PATIENTS, ...arrivals];
};

export const getSwPersonByHn = (hn) =>
  getSwQueueRows().find((r) => r.hn === hn)
  || SW_SCHEDULED_TODAY.find((r) => r.hn === hn)
  || null;

/* ยกเลิกคิว — audit line (ผู้ยกเลิก + เวลา + เหตุผล) per playbook §5 */
export const cancelSwQueue = (hn, reason) => {
  const cancelled = readJson(K.queueCancelled, {});
  cancelled[hn] = { reason: reason || '', by: SW_CURRENT_USER, at: new Date().toISOString() };
  writeJson(K.queueCancelled, cancelled);
};
export const restoreSwQueue = (hn) => {
  const cancelled = readJson(K.queueCancelled, {});
  delete cancelled[hn];
  writeJson(K.queueCancelled, cancelled);
};
export const getSwQueueCancellation = (hn) => readJson(K.queueCancelled, {})[hn] || null;

/* ── ทะเบียนผู้รับบริการสังคมสงเคราะห์ (TOR 1.10.11.1) ──────────────
   เลขที่สังคมสงเคราะห์ (เลข CASE) รูปแบบ สค.<run 4 หลัก>/<ปี พ.ศ.> —
   ออกอัตโนมัติเมื่อบันทึกสำเร็จเท่านั้น (ก่อนบันทึกช่องนี้ว่างและอ่านอย่างเดียว)
   และไม่เปลี่ยนอีกเมื่อแก้ไขภายหลัง. */
const SW_CASE_YEAR = 2569;
const SW_CASE_SEED_COUNT = 9;

const nextSwCaseNo = () => {
  const run = readJson(K.registryRun, SW_CASE_SEED_COUNT) + 1;
  writeJson(K.registryRun, run);
  return `สค.${String(run).padStart(4, '0')}/${SW_CASE_YEAR}`;
};

const REGISTRY_SEED = [
  {
    id: 'sw-reg-1', caseNo: 'สค.0001/2569', hn: '67-00012', name: 'วิชัย รุ่งเรือง',
    receivedDate: '2026-01-09', clientType: 'old', intakeChannel: 'internal',
    targetGroup: 'bedridden', firstProblem: 'P09',
    informant: 'นางสมทรง รุ่งเรือง', informantRelation: 'spouse', informantPhone: '081-234-5678',
    currentAddress: '52/7 ซอยจรัญสนิทวงศ์ 35 บางขุนศรี บางกอกน้อย กรุงเทพมหานคร 10700',
    houseRegAddress: '52/7 ซอยจรัญสนิทวงศ์ 35 บางขุนศรี บางกอกน้อย กรุงเทพมหานคร 10700',
    owner: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ',
    status: 'active', recordedBy: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', recordedAt: '2026-01-09T09:12:00',
  },
  {
    id: 'sw-reg-2', caseNo: 'สค.0002/2569', hn: '67-00007', name: 'มาลี อ่อนน้อม',
    receivedDate: '2026-01-27', clientType: 'old', intakeChannel: 'walkin',
    targetGroup: 'elderly', firstProblem: 'P02',
    informant: 'นางมาลี อ่อนน้อม', informantRelation: 'self', informantPhone: '089-441-2210',
    currentAddress: '19 ซอยเพชรบุรี 15 ถนนเพชรบุรี ราชเทวี กรุงเทพมหานคร 10400',
    houseRegAddress: '88 หมู่ 3 ต.บ้านใหม่ อ.เมือง จ.สุพรรณบุรี 72000',
    owner: 'นักสังคมสงเคราะห์ พีระพัฒน์ เกื้อกูล',
    status: 'active', recordedBy: 'นักสังคมสงเคราะห์ พีระพัฒน์ เกื้อกูล', recordedAt: '2026-01-27T10:44:00',
  },
  {
    id: 'sw-reg-3', caseNo: 'สค.0003/2569', hn: '67-00003', name: 'ปริญญา รัตนา',
    receivedDate: '2026-02-11', clientType: 'old', intakeChannel: 'homevisit',
    targetGroup: 'bedridden', firstProblem: 'P07',
    informant: 'นางสาวกนกวรรณ รัตนา', informantRelation: 'child', informantPhone: '062-889-7745',
    currentAddress: '256 หมู่ 7 ต.บางใหญ่ อ.บางใหญ่ จ.นนทบุรี 11140',
    houseRegAddress: '256 หมู่ 7 ต.บางใหญ่ อ.บางใหญ่ จ.นนทบุรี 11140',
    owner: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์',
    status: 'active', recordedBy: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์', recordedAt: '2026-02-11T14:20:00',
  },
  {
    id: 'sw-reg-4', caseNo: 'สค.0004/2569', hn: '67-00021', name: 'วรรณภา ทองดี',
    receivedDate: '2026-03-05', clientType: 'old', intakeChannel: 'internal',
    targetGroup: 'violence', firstProblem: 'P14',
    informant: 'พว.กานดา แสงจันทร์', informantRelation: 'officer', informantPhone: '02-245-8800',
    currentAddress: '77 ชุมชนคลองเตยล็อค 4 คลองเตย กรุงเทพมหานคร 10110',
    houseRegAddress: '77 ชุมชนคลองเตยล็อค 4 คลองเตย กรุงเทพมหานคร 10110',
    owner: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์',
    status: 'active', recordedBy: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์', recordedAt: '2026-03-05T11:02:00',
  },
  {
    id: 'sw-reg-5', caseNo: 'สค.0005/2569', hn: '67-00014', name: 'ชัยวัฒน์ ก้องเกียรติ',
    receivedDate: '2026-03-30', clientType: 'old', intakeChannel: 'walkin',
    targetGroup: 'disabled', firstProblem: 'P05',
    informant: 'นายชัยวัฒน์ ก้องเกียรติ', informantRelation: 'self', informantPhone: '084-556-1123',
    currentAddress: '410/12 ซอยลาดพร้าว 80 วังทองหลาง กรุงเทพมหานคร 10310',
    houseRegAddress: '410/12 ซอยลาดพร้าว 80 วังทองหลาง กรุงเทพมหานคร 10310',
    owner: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ',
    status: 'active', recordedBy: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', recordedAt: '2026-03-30T09:55:00',
  },
  {
    id: 'sw-reg-6', caseNo: 'สค.0006/2569', hn: '67-00017', name: 'ภัคจิรา วงศ์อนันต์',
    receivedDate: '2026-04-18', clientType: 'old', intakeChannel: 'external',
    targetGroup: 'child', firstProblem: 'P04',
    informant: 'ครูสุนีย์ ใจงาม (โรงเรียนวัดสระเกศ)', informantRelation: 'officer', informantPhone: '02-282-1147',
    currentAddress: '9/4 ซอยบำรุงเมือง 5 ป้อมปราบศัตรูพ่าย กรุงเทพมหานคร 10100',
    houseRegAddress: '9/4 ซอยบำรุงเมือง 5 ป้อมปราบศัตรูพ่าย กรุงเทพมหานคร 10100',
    owner: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์',
    status: 'active', recordedBy: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์', recordedAt: '2026-04-18T13:31:00',
  },
  {
    id: 'sw-reg-7', caseNo: 'สค.0007/2569', hn: '67-00005', name: 'สุดา ปลอดโปร่ง',
    receivedDate: '2026-05-06', clientType: 'old', intakeChannel: 'homevisit',
    targetGroup: 'elderly', firstProblem: 'P07',
    informant: 'นางสุดา ปลอดโปร่ง', informantRelation: 'self', informantPhone: '02-415-6690',
    currentAddress: '47/3 ซ.พระราม 2 ซอย 25 บางขุนเทียน กรุงเทพมหานคร 10150',
    houseRegAddress: '47/3 ซ.พระราม 2 ซอย 25 บางขุนเทียน กรุงเทพมหานคร 10150',
    owner: 'นักสังคมสงเคราะห์ พีระพัฒน์ เกื้อกูล',
    status: 'active', recordedBy: 'นักสังคมสงเคราะห์ พีระพัฒน์ เกื้อกูล', recordedAt: '2026-05-06T10:08:00',
  },
  {
    id: 'sw-reg-8', caseNo: 'สค.0008/2569', hn: '67-00022', name: 'อนุชา สมบูรณ์ทรัพย์',
    receivedDate: '2026-06-02', clientType: 'old', intakeChannel: 'walkin',
    targetGroup: 'disabled', firstProblem: 'P08',
    informant: 'นายอนุชา สมบูรณ์ทรัพย์', informantRelation: 'self', informantPhone: '086-772-3390',
    currentAddress: '145 ซอยพระราม 3 ซอย 51 ช่องนนทรี ยานนาวา กรุงเทพมหานคร 10120',
    houseRegAddress: '145 ซอยพระราม 3 ซอย 51 ช่องนนทรี ยานนาวา กรุงเทพมหานคร 10120',
    owner: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ',
    status: 'active', recordedBy: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', recordedAt: '2026-06-02T09:26:00',
  },
  {
    id: 'sw-reg-9', caseNo: 'สค.0009/2569', hn: '67-00025', name: 'ภาสกร ชาญฉลาด',
    receivedDate: '2026-06-24', clientType: 'old', intakeChannel: 'homevisit',
    targetGroup: 'bedridden', firstProblem: 'P09',
    informant: 'นางพิมล ชาญฉลาด', informantRelation: 'parent', informantPhone: '081-006-4471',
    currentAddress: '33/9 ซอยรามคำแหง 53 หัวหมาก บางกะปิ กรุงเทพมหานคร 10240',
    houseRegAddress: '33/9 ซอยรามคำแหง 53 หัวหมาก บางกะปิ กรุงเทพมหานคร 10240',
    owner: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์',
    status: 'cancelled',
    cancellation: { reason: 'ลงทะเบียนซ้ำกับเลข สค.0005/2569 — ยุบรวมเป็นเคสเดียว', by: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ', at: '2026-07-02T15:40:00' },
    recordedBy: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์', recordedAt: '2026-06-24T15:12:00',
  },
];

export const getSwRegistryRows = () => {
  const overlay = readJson(K.registry, {});
  const seedIds = REGISTRY_SEED.map((r) => r.id);
  const merged = REGISTRY_SEED.map((r) => (overlay[r.id] ? { ...r, ...overlay[r.id] } : r));
  const added = Object.values(overlay).filter((r) => !seedIds.includes(r.id));
  return [...merged, ...added];
};

export const getSwRegistrationByHn = (hn) =>
  getSwRegistryRows().find((r) => r.hn === hn && r.status !== 'cancelled')
  || getSwRegistryRows().find((r) => r.hn === hn)
  || null;

export const saveSwRegistration = (entry) => {
  const overlay = readJson(K.registry, {});
  const isNew = !entry.id;
  const previous = entry.id ? getSwRegistryRows().find((r) => r.id === entry.id) : null;
  const editLog = [...(previous?.editLog || [])];
  if (!isNew) {
    editLog.push({ by: SW_CURRENT_USER, at: new Date().toISOString() });
  }
  const saved = {
    ...(previous || {}),
    ...entry,
    id: entry.id || `sw-reg-new-${Date.now()}`,
    /* เลข CASE ออกครั้งเดียวตอนบันทึกสำเร็จ และ immutable หลังจากนั้น */
    caseNo: previous?.caseNo || entry.caseNo || nextSwCaseNo(),
    receivedDate: entry.receivedDate || todayIso(),
    status: entry.status || previous?.status || 'active',
    recordedBy: previous?.recordedBy || SW_CURRENT_USER,
    recordedAt: previous?.recordedAt || new Date().toISOString(),
    editLog,
  };
  overlay[saved.id] = saved;
  writeJson(K.registry, overlay);
  return { saved, isNew };
};

export const cancelSwRegistration = (id, reason) => {
  const overlay = readJson(K.registry, {});
  const current = getSwRegistryRows().find((r) => r.id === id);
  if (!current) return;
  overlay[id] = {
    ...current,
    status: 'cancelled',
    cancellation: { reason: reason || '', by: SW_CURRENT_USER, at: new Date().toISOString() },
  };
  writeJson(K.registry, overlay);
};

export const reactivateSwRegistration = (id) => {
  const overlay = readJson(K.registry, {});
  const current = getSwRegistryRows().find((r) => r.id === id);
  if (!current) return;
  overlay[id] = { ...current, status: 'active', cancellation: null };
  writeJson(K.registry, overlay);
};

/* ── ผลการซักประวัติจากจุดคัดกรอง (read-only ในขั้นตอนที่ 2) ────────── */
export const SW_INTAKE_BY_HN = {
  '67-00012': {
    vitals: { bp: '138/84', hr: 78, temp: 36.6, rr: 18, spo2: 97, weight: 54, height: 168 },
    nurseNote: 'ผู้ป่วยติดเตียงหลังโรคหลอดเลือดสมอง ญาตินำมาโดยรถเข็น มีแผลกดทับก้นกบระยะที่ 2',
    drugAllergies: ['Aspirin — ผื่นลมพิษ'],
    chronicDiseases: ['โรคหลอดเลือดสมอง', 'ความดันโลหิตสูง', 'เบาหวานชนิดที่ 2'],
  },
  '67-00007': {
    vitals: { bp: '126/78', hr: 82, temp: 36.5, rr: 18, spo2: 99, weight: 61, height: 156 },
    nurseNote: 'มาปรึกษาเรื่องค่ารักษาพยาบาลของสามีที่นอนโรงพยาบาล ไม่มีเงินสำรอง',
    drugAllergies: ['ไม่มีประวัติแพ้ยา'],
    chronicDiseases: ['ไขมันในเลือดสูง'],
  },
  '67-00003': {
    vitals: { bp: '132/80', hr: 74, temp: 36.4, rr: 16, spo2: 98, weight: 58, height: 154 },
    nurseNote: 'ผู้ดูแลมารดาติดเตียง ขอความช่วยเหลือผ้าอ้อมผู้ใหญ่และอาหารทางการแพทย์',
    drugAllergies: ['ไม่มีประวัติแพ้ยา'],
    chronicDiseases: ['ไม่มีโรคประจำตัว'],
  },
  '67-00019': {
    vitals: { bp: '110/68', hr: 88, temp: 36.7, rr: 18, spo2: 99, weight: 47, height: 158 },
    nurseNote: 'มารดาวัยรุ่นหลังคลอด 2 เดือน น้ำนมไม่พอ ขอรับนมผงสำหรับทารก',
    drugAllergies: ['ไม่มีประวัติแพ้ยา'],
    chronicDiseases: ['ไม่มีโรคประจำตัว'],
  },
  '67-00021': {
    vitals: { bp: '144/92', hr: 96, temp: 36.8, rr: 20, spo2: 98, weight: 52, height: 157 },
    nurseNote: 'ส่งต่อจากห้องตรวจ มีรอยฟกช้ำบริเวณแขนทั้งสองข้าง ผู้รับบริการไม่ประสงค์ให้ญาติทราบ',
    drugAllergies: ['ไม่มีประวัติแพ้ยา'],
    chronicDiseases: ['ความดันโลหิตสูง'],
  },
  '67-00014': {
    vitals: { bp: '128/82', hr: 80, temp: 36.6, rr: 18, spo2: 98, weight: 66, height: 170 },
    nurseNote: 'ตัดขาขวาใต้เข่าจากอุบัติเหตุ ต้องการขาเทียมและเงินทุนประกอบอาชีพ',
    drugAllergies: ['Penicillin — ผื่นคัน'],
    chronicDiseases: ['เบาหวานชนิดที่ 2'],
  },
};

export const DEFAULT_SW_INTAKE = {
  vitals: { bp: '120/80', hr: 78, temp: 36.6, rr: 18, spo2: 99, weight: 60, height: 165 },
  nurseNote: 'ซักประวัติเบื้องต้นที่จุดคัดกรอง แล้วส่งต่องานสังคมสงเคราะห์',
  drugAllergies: ['ไม่มีประวัติแพ้ยา'],
  chronicDiseases: ['ไม่มีโรคประจำตัว'],
};

export const getSwIntakeByHn = (hn) => SW_INTAKE_BY_HN[hn] || DEFAULT_SW_INTAKE;

/* ── ข้อมูลประกอบการวินิจฉัย (ประวัติการรักษา / ส่งปรึกษา / Lab / X-ray) */
export const SW_SUPPORTING_BY_HN = {
  '67-00012': {
    treatments: [
      { date: '2026-06-18', clinic: 'คลินิกโรคเรื้อรัง', summary: 'ติดตามเบาหวาน/ความดัน ปรับยา Metformin', doctor: 'พญ.วิภา สุขศรี' },
      { date: '2026-07-09', clinic: 'คลินิกเวชศาสตร์ฟื้นฟู', summary: 'ประเมินการใช้รถเข็นและฝึกญาติพลิกตะแคงตัว', doctor: 'นพ.ธนกร ฟื้นฟูดี' },
    ],
    consults: [
      { date: '2026-07-09', to: 'คลินิกเวชศาสตร์ฟื้นฟู', reason: 'ประเมินกายอุปกรณ์ที่เหมาะสม', status: 'ตอบกลับแล้ว' },
    ],
    labs: [
      { date: '2026-07-02', test: 'FBS', value: '148', unit: 'mg/dL', ref: '70–100', flag: 'high' },
      { date: '2026-07-02', test: 'HbA1c', value: '8.2', unit: '%', ref: '< 7.0', flag: 'high' },
      { date: '2026-07-02', test: 'Albumin', value: '3.1', unit: 'g/dL', ref: '3.5–5.0', flag: 'low' },
    ],
    imaging: [
      { date: '2026-06-18', test: 'CT Brain (non-contrast)', result: 'Old infarction at left MCA territory', flag: 'abnormal' },
    ],
  },
  '67-00014': {
    treatments: [
      { date: '2026-05-21', clinic: 'คลินิกตรวจรักษาทั่วไป', summary: 'ดูแลแผลตอขาหลังผ่าตัด แผลหายดี', doctor: 'นพ.ณัฐวุฒิ บุญมี' },
    ],
    consults: [
      { date: '2026-05-21', to: 'โรงพยาบาลแม่ข่าย — แผนกกายอุปกรณ์', reason: 'ขอรับขาเทียมใต้เข่า', status: 'รอตอบกลับ' },
    ],
    labs: [
      { date: '2026-05-21', test: 'FBS', value: '112', unit: 'mg/dL', ref: '70–100', flag: 'high' },
      { date: '2026-05-21', test: 'CBC — Hb', value: '13.4', unit: 'g/dL', ref: '13–17', flag: 'normal' },
    ],
    imaging: [
      { date: '2026-05-21', test: 'X-ray Rt. tibia-fibula', result: 'Post below-knee amputation, well healed stump', flag: 'normal' },
    ],
  },
};

export const DEFAULT_SW_SUPPORTING = { treatments: [], consults: [], labs: [], imaging: [] };
export const getSwSupportingByHn = (hn) => SW_SUPPORTING_BY_HN[hn] || DEFAULT_SW_SUPPORTING;

/* ── เอกสารแนบ (e-Document) ────────────────────────────────────────── */
export const SW_UPLOAD_ACCEPT = '.pdf,.png,.jpg,.jpeg';
const SW_UPLOAD_MAX_MB = 10;

export const SW_DOCUMENT_TYPES = [
  { value: 'idcard', label: 'สำเนาบัตรประจำตัวประชาชน' },
  { value: 'house', label: 'สำเนาทะเบียนบ้าน' },
  { value: 'income', label: 'หนังสือรับรองรายได้ / สถานะครัวเรือน' },
  { value: 'disability', label: 'สำเนาบัตรประจำตัวคนพิการ' },
  { value: 'medcert', label: 'ใบรับรองแพทย์' },
  { value: 'photo', label: 'ภาพถ่ายสภาพที่อยู่อาศัย' },
  { value: 'other', label: 'เอกสารอื่น ๆ' },
];

export const validateSwUpload = (fileName, sizeBytes) => {
  const ok = /\.(pdf|png|jpe?g)$/i.test(fileName || '');
  if (!ok) return `ชนิดไฟล์ไม่รองรับ — แนบได้เฉพาะ ${SW_UPLOAD_ACCEPT}`;
  if (sizeBytes != null && sizeBytes > SW_UPLOAD_MAX_MB * 1024 * 1024) {
    return `ไฟล์ใหญ่เกิน ${SW_UPLOAD_MAX_MB} MB`;
  }
  return null;
};

/* ── นัดหมาย ───────────────────────────────────────────────────────── */
export const SW_APPOINTMENT_TYPES = [
  { value: 'followup', label: 'นัดติดตามผลการช่วยเหลือ' },
  { value: 'homevisit', label: 'นัดเยี่ยมบ้าน' },
  { value: 'material', label: 'นัดรับวัสดุ / กายอุปกรณ์' },
  { value: 'fund', label: 'นัดรับเงินสนับสนุน' },
  { value: 'family', label: 'นัดประชุมครอบครัว (Family meeting)' },
];
export const resolveSwAppointmentType = (value) =>
  SW_APPOINTMENT_TYPES.find((t) => t.value === value)?.label || 'นัดหมายติดตาม';

export const SW_APPOINTMENT_TIMES = [
  '09:00', '09:30', '10:00', '10:30', '11:00',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
];

export const saveSwAppointment = (hn, appointment) => {
  if (!hn) return null;
  const all = readJson(K.appointments, {});
  if (!appointment || !appointment.date || appointment.cancelled) {
    delete all[hn];
    writeJson(K.appointments, all);
    return null;
  }
  const p = getSwPersonByHn(hn) || {};
  const entry = {
    hn,
    name: p.name || '—',
    date: appointment.date,
    time: appointment.time || '',
    type: appointment.type || 'followup',
    note: appointment.note || '',
    bookedBy: SW_CURRENT_USER,
    bookedAt: new Date().toISOString(),
  };
  all[hn] = entry;
  writeJson(K.appointments, all);
  return entry;
};

export const getSwNextAppointment = (hn) => readJson(K.appointments, {})[hn] || null;

/* ── บันทึกบริการสังคมสงเคราะห์ สส.2 (TOR 1.10.11.2) ────────────────── */
export const EMPTY_SW_FAMILY_MEMBER = {
  name: '', age: '', relation: '', occupation: '', education: '', income: '',
};

export const SW_FAMILY_RELATIONS = [
  'บิดา', 'มารดา', 'คู่สมรส', 'บุตร', 'พี่/น้อง', 'ปู่/ย่า/ตา/ยาย', 'ญาติอื่น ๆ', 'ผู้ดูแลที่ไม่ใช่ญาติ',
];

export const SW_EDUCATION_LEVELS = [
  'ไม่ได้เรียน', 'ประถมศึกษา', 'มัธยมศึกษาตอนต้น', 'มัธยมศึกษาตอนปลาย/ปวช.',
  'อนุปริญญา/ปวส.', 'ปริญญาตรี', 'สูงกว่าปริญญาตรี',
];

export const sumFamilyIncome = (members) =>
  (members || []).reduce((sum, m) => sum + (Number(String(m.income).replace(/,/g, '')) || 0), 0);

export const DEFAULT_SW_VISIT = {
  /* step 1 — ข้อมูลทั่วไป */
  intakeChannel: '',
  clientType: '',
  targetGroup: '',
  informant: '',
  informantRelation: '',
  informantPhone: '',
  serviceDate: '',
  serviceTime: '',
  worker: '',
  clinic: 'social',
  /* step 2 — vital / nurse note */
  nurseNote: '',
  socialWorkerNote: '',
  /* step 3 — ประวัติ */
  socialHistory: '',
  familyMembers: [],
  familyIncomeNote: '',
  /* step 4 — ปัญหา + วินิจฉัยทางสังคม */
  primaryProblem: '',
  secondaryProblems: [],
  socialDiagnosis: '',
  socialAssessment: '',
  /* step 5 — บริการและการช่วยเหลือ */
  advices: [],
  funds: [],
  equipmentRequests: [],
  consumableRequests: [],
  services: {},
  /* step 6 — ติดตาม + ยุติบริการ */
  followUps: [],
  terminated: false,
  terminationReason: '',
  terminationDate: '',
  terminatedBy: '',
  /* step 8 — คำสั่ง / เอกสาร / ส่งต่อ / นัดหมาย */
  medicalOrders: '',
  documents: [],
  referralEnabled: false,
  referralScope: 'internal',
  referralDestination: '',
  referralReason: '',
  appointment: { date: '', time: '', type: '', note: '', cancelled: false },
};

/* Records + drafts (sessionStorage overlay, keyed by HN). */
export const getSwVisitRecords = (hn) => readJson(K.visits, {})[hn] || [];

export const saveSwVisitRecord = (hn, form) => {
  const all = readJson(K.visits, {});
  const list = all[hn] || [];
  const entry = {
    ...form,
    savedBy: SW_CURRENT_USER,
    savedAt: new Date().toISOString(),
    visitDate: form.serviceDate || todayIso(),
  };
  all[hn] = [...list, entry];
  writeJson(K.visits, all);
  saveSwAppointment(hn, form.appointment);
  return entry;
};

export const getSwDraft = (hn) => readJson(K.drafts, {})[hn] || null;

export const saveSwDraft = (hn, form, stepIndex) => {
  const all = readJson(K.drafts, {});
  all[hn] = { form, stepIndex, savedAt: new Date().toISOString() };
  writeJson(K.drafts, all);
};

export const clearSwDraft = (hn) => {
  const all = readJson(K.drafts, {});
  delete all[hn];
  writeJson(K.drafts, all);
};

/* ขั้นตอนที่ถือว่า "ทำแล้ว" — ใช้ทำ tick บน stepper */
export const getSwCompletedSteps = (form, stepIndex) => {
  const done = [];
  if (form.intakeChannel && form.clientType && form.targetGroup) done.push(0);
  if (form.nurseNote || form.socialWorkerNote) done.push(1);
  if (form.socialHistory || (form.familyMembers || []).length > 0) done.push(2);
  if (form.primaryProblem && form.socialDiagnosis) done.push(3);
  if ((form.advices || []).length > 0 || (form.funds || []).length > 0
    || (form.equipmentRequests || []).length > 0 || (form.consumableRequests || []).length > 0
    || Object.values(form.services || {}).some((v) => v && v.length > 0)) done.push(4);
  if ((form.followUps || []).length > 0 || form.terminated) done.push(5);
  if (form.medicalOrders || (form.documents || []).length > 0
    || form.referralEnabled || form.appointment?.date) done.push(7);
  /* step 7 (ข้อมูลประกอบ) เป็นอ่านอย่างเดียว — ถือว่าผ่านเมื่อเปิดดูแล้ว */
  if (stepIndex > 6) done.push(6);
  return Array.from(new Set(done));
};

/* ── การพิมพ์เอกสาร (audit log ผู้พิมพ์ + เวลา) ─────────────────────── */
export const logSwPrint = (hn, docType) => {
  const log = readJson(K.printLog, {});
  const list = log[hn] || [];
  log[hn] = [...list, { docType, by: SW_CURRENT_USER, at: new Date().toISOString() }];
  writeJson(K.printLog, log);
};

export const getSwPrintLog = (hn) => readJson(K.printLog, {})[hn] || [];

/* ── ประวัติการติดตาม + เงินสนับสนุน (สำหรับหน้า 1.10.11.5) ─────────── */
const SW_FOLLOWUP_SEED = {
  '67-00012': [
    { date: '2026-04-12', reached: true, result: 'เยี่ยมบ้าน พบผู้ป่วยใช้เตียงลมได้เหมาะสม แผลกดทับดีขึ้น', by: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ' },
    { date: '2026-05-20', reached: true, result: 'ผู้ดูแลแจ้งได้รับผ้าอ้อมครบตามรอบ ไม่มีปัญหาการเบิก', by: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ' },
    { date: '2026-06-25', reached: false, result: 'โทรศัพท์ติดตามไม่ได้ — เบอร์ไม่สามารถติดต่อได้ 3 ครั้ง', by: 'นักสังคมสงเคราะห์ พีระพัฒน์ เกื้อกูล' },
    { date: '2026-07-22', reached: true, result: 'เยี่ยมบ้านซ้ำ ผู้ป่วยลุกนั่งได้นานขึ้น ญาติขอต่ออาหารทางการแพทย์', by: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ' },
  ],
  '67-00003': [
    { date: '2026-03-14', reached: true, result: 'เยี่ยมบ้าน มารดาผู้รับบริการยังติดเตียง ต้องการผ้าอ้อมต่อเนื่อง', by: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์' },
    { date: '2026-05-09', reached: true, result: 'ประสานเบี้ยยังชีพผู้สูงอายุสำเร็จ เริ่มรับเดือนถัดไป', by: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์' },
    { date: '2026-06-30', reached: false, result: 'ติดตามไม่ได้ — ครอบครัวไปต่างจังหวัดชั่วคราว', by: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์' },
  ],
  '67-00017': [
    { date: '2026-05-15', reached: true, result: 'บุตรได้รับทุนการศึกษาแล้ว กลับเข้าเรียนตามปกติ', by: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์' },
    { date: '2026-06-28', reached: false, result: 'ติดตามไม่ได้ — ไม่พบผู้รับบริการที่บ้าน 2 ครั้ง', by: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์' },
  ],
  '67-00014': [
    { date: '2026-05-02', reached: true, result: 'ได้รับเงินทุนประกอบอาชีพแล้ว เริ่มขายกาแฟหน้าปากซอย', by: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ' },
    { date: '2026-06-20', reached: true, result: 'กิจการดำเนินได้ รายได้เฉลี่ยวันละ 400 บาท', by: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ' },
  ],
};

export const getSwFollowUpHistory = (hn, from, to) => {
  const seeded = SW_FOLLOWUP_SEED[hn] || [];
  const recorded = getSwVisitRecords(hn).flatMap((v) => (v.followUps || []).map((f) => ({
    ...f, by: f.by || v.savedBy,
  })));
  const all = [...seeded, ...recorded];
  return all.filter((f) => (!from || f.date >= from) && (!to || f.date <= to));
};

/* ปัจจุบันมี "ติดตามค้าง" เมื่อครั้งล่าสุดติดตามไม่ได้ */
export const hasSwOverdueFollowUp = (hn) => {
  const rows = getSwFollowUpHistory(hn);
  if (rows.length === 0) return false;
  const latest = [...rows].sort((a, b) => b.date.localeCompare(a.date))[0];
  return latest.reached === false;
};

const SW_FUND_SEED = {
  '67-00012': [
    { date: '2026-01-20', type: 'treatment', amount: 3000, note: 'ค่าเวชภัณฑ์ทำแผลกดทับ', by: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ' },
    { date: '2026-04-12', type: 'transport', amount: 1200, note: 'ค่าพาหนะมารับบริการ 6 ครั้ง', by: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ' },
  ],
  '67-00014': [
    { date: '2026-04-08', type: 'career', amount: 5000, note: 'เงินทุนประกอบอาชีพ — รถเข็นขายกาแฟ', by: 'นักสังคมสงเคราะห์ ชนิดา ปรีชาญาณ' },
  ],
  '67-00017': [
    { date: '2026-04-25', type: 'education', amount: 4000, note: 'ทุนการศึกษาบุตร ภาคเรียนที่ 1', by: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์' },
  ],
  '67-00003': [
    { date: '2026-02-20', type: 'living', amount: 2000, note: 'ค่าครองชีพชั่วคราว 1 เดือน', by: 'นักสังคมสงเคราะห์ อารยา ธรรมรักษ์' },
  ],
};

export const getSwFundHistory = (hn, from, to) => {
  const seeded = SW_FUND_SEED[hn] || [];
  const recorded = getSwVisitRecords(hn).flatMap((v) => (v.funds || []).map((f) => ({
    ...f, date: f.date || v.visitDate, by: f.by || v.savedBy,
  })));
  return [...seeded, ...recorded]
    .filter((f) => (!from || f.date >= from) && (!to || f.date <= to));
};
