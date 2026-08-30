/* แบบคัดกรองสุขภาพรายบุคคล (Personal Health Screening) — ฟอร์มกระดาษที่ทีม
   เยี่ยมบ้านของ ศบส. ใช้จริง (ต้นฉบับ ศบส. 28 กรุงธนบุรี)

   ตัวเลือกทุกชุดในไฟล์นี้ยกมาจากช่องในฟอร์มตัวต่อตัว — ห้ามเติมตัวเลือกที่
   ฟอร์มไม่มีหรือย่อคำเอง เพราะข้อมูลชุดนี้ถูกคีย์เข้า Health BKK / ใช้อ้าง
   ตอนตรวจสอบย้อนหลัง ถ้าคำไม่ตรงกับกระดาษจะเทียบกันไม่ได้

   ครอบคลุมเฉพาะ "ส่วนที่ 1 — คัดกรองสุขภาพรายบุคคล" ส่วน "แบบสำรวจบ้าน
   (Home Survey)" ยังไม่ได้ทำ (มติผู้ใช้ 29 ส.ค. 69) */

/* ── ข้อมูลประชากรที่ทะเบียนยังไม่เก็บ ────────────────────────────── */

export const NATIONALITY_OPTIONS = ['ไทย', 'อื่นๆ'];
export const ETHNICITY_OPTIONS = ['ไทย', 'อื่นๆ'];
export const RELIGION_OPTIONS = ['พุทธ', 'อิสลาม', 'คริสต์', 'อื่นๆ'];

/** สถานะบุคคล — เทียบที่อยู่จริงกับทะเบียนบ้าน (ฟอร์มข้อ "สถานะบุคคล") */
export const PERSON_STATUS_OPTIONS = [
  'อาศัยอยู่ตรงกับทะเบียนบ้าน',
  'อาศัยอยู่ไม่ตรงกับทะเบียนบ้าน',
  'ไม่อยู่ในทะเบียนราษฎร์',
];

export const COMMUNITY_ROLE_OPTIONS = [
  'ประชาชนทั่วไป',
  'ประธานชุมชน',
  'กรรมการชุมชน',
  'อาสาสมัครสาธารณสุข',
  'อื่นๆ',
];

/** การใช้สิทธิการรักษา — ไม่ใช่ "มีสิทธิอะไร" (อันนั้นเวชระเบียนเก็บแล้ว) */
export const RIGHTS_USAGE_OPTIONS = [
  'รับบริการที่สถานพยาบาลตามสิทธิ',
  'รับบริการที่สถานพยาบาลอื่นๆ (ชำระเงินเอง/ประกันสุขภาพ)',
  'ไม่เคยเข้ารับบริการ',
  'อื่นๆ',
];

/** การปฏิบัติตัวเมื่อเจ็บป่วยเล็กน้อย — เลือกได้หลายข้อตามฟอร์ม */
export const MINOR_ILLNESS_OPTIONS = [
  'รักษาที่ศูนย์บริการสาธารณสุข',
  'โรงพยาบาลรัฐ',
  'โรงพยาบาลเอกชน',
  'คลินิกเอกชน',
  'ซื้อยาจากร้านขายยา',
  'ดูแลสุขภาพตนเอง',
  'รักษาแพทย์ทางเลือก',
];

/* ── ความเสี่ยงด้านสุขภาพ 15 ข้อ ─────────────────────────────────
   ติ๊กได้หลายข้อ · สามข้อแรก (บุหรี่ · เหล้า · ออกกำลังกาย) ซ้ำกับขั้น
   "พฤติกรรมสุขภาพ" ของคัดกรองที่ศูนย์ ซึ่งถามละเอียดกว่า — flow เยี่ยมบ้าน
   จึงใช้ชุดนี้แทนทั้งขั้น ไม่ถามซ้ำสองที่ */
export const HEALTH_RISK_OPTIONS = [
  { key: 'game',        label: 'ติดเกมส์/โทรศัพท์มือถือ',    icon: 'smartphone' },
  { key: 'substance',   label: 'ใช้สารเสพติด',              icon: 'medication_liquid' },
  { key: 'smoking',     label: 'สูบบุหรี่',                  icon: 'smoking_rooms' },
  { key: 'alcohol',     label: 'ติดเหล้า',                   icon: 'liquor' },
  { key: 'sexual',      label: 'เสี่ยงทางเพศ',               icon: 'favorite' },
  { key: 'stress',      label: 'เครียด',                     icon: 'sentiment_stressed' },
  { key: 'falls',       label: 'หกล้มบ่อย',                  icon: 'personal_injury' },
  { key: 'exercise',    label: 'ออกกำลังกายน้อยกว่า 3 วัน/สัปดาห์', icon: 'directions_run' },
  { key: 'forgetful',   label: 'หลงลืม',                     icon: 'psychology_alt' },
  { key: 'bedbound',    label: 'ติดเตียง',                   icon: 'bed' },
  { key: 'diet',        label: 'รับประทานอาหารรสหวาน มัน เค็ม', icon: 'restaurant' },
  { key: 'overweight',  label: 'น้ำหนักเกิน',                icon: 'monitor_weight' },
  { key: 'appetite',    label: 'เบื่ออาหาร',                 icon: 'no_meals' },
  { key: 'noCheckup',   label: 'ไม่เคยตรวจสุขภาพ',           icon: 'event_busy' },
  { key: 'disability',  label: 'มีความพิการ',                icon: 'accessible' },
];

/* จัดกลุ่มความเสี่ยง 15 ข้อตามหมวดที่ควรอยู่ (มติผู้ใช้ 30 ส.ค. 69) — ฟอร์ม
   กระดาษเรียงเป็นแถวยาวแถวเดียว พอขึ้นจอแล้วอ่านไม่ออกว่าข้อไหนเป็นเรื่อง
   เดียวกัน · ทุก key ต้องอยู่ในกลุ่มใดกลุ่มหนึ่งเสมอ (มี test ทางอ้อมคือ
   `HEALTH_RISK_GROUPS` ต้องครอบคลุม `HEALTH_RISK_OPTIONS` ครบ) */
export const HEALTH_RISK_GROUPS = [
  {
    key: 'substance',
    label: 'สารเสพติด',
    icon: 'smoking_rooms',
    /* ไม่ใส่ `smoking` / `alcohol` ซ้ำ — แถว "การสูบบุหรี่" กับ "การดื่มแอลกอฮอล์"
       ของขั้นพฤติกรรมสุขภาพที่อยู่เหนือมันในการ์ดเดียวกันถามละเอียดกว่า
       (มติผู้ใช้ 30 ส.ค. 69) */
    keys: ['substance'],
  },
  {
    /* ติดเกม/โทรศัพท์เป็น "พฤติกรรมเสพติด" คนละเรื่องกับสารเสพติด จึงแยกหัวข้อ
       (มติผู้ใช้ 30 ส.ค. 69) */
    key: 'behaviouralAddiction',
    label: 'พฤติกรรมเสพติด',
    icon: 'smartphone',
    keys: ['game'],
  },
  {
    key: 'lifestyle',
    label: 'การกินและการเคลื่อนไหว',
    icon: 'restaurant',
    keys: ['diet', 'overweight', 'appetite', 'exercise'],
  },
  {
    key: 'mental',
    label: 'สุขภาพจิตและความเสี่ยงส่วนบุคคล (เลือกได้หลายข้อ)',
    icon: 'sentiment_stressed',
    keys: ['stress', 'forgetful', 'sexual'],
  },
  {
    key: 'dependency',
    label: 'ภาวะพึ่งพิงและการเข้าถึงบริการ (เลือกได้หลายข้อ)',
    icon: 'accessible',
    keys: ['falls', 'bedbound', 'disability', 'noCheckup'],
  },
];

/* ── ประวัติ/การแพ้ ที่ฟอร์มมีสามสถานะ ไม่ใช่ มี/ไม่มี ───────────── */

export const PRESENCE_OPTIONS = ['ไม่มี', 'มี'];
export const ALLERGY_STATUS_OPTIONS = ['ปฏิเสธการแพ้', 'ไม่ทราบ', 'มีประวัติการแพ้'];

export const FAMILY_HISTORY_SUGGESTIONS = [
  'เบาหวาน (บิดา)',
  'เบาหวาน (มารดา)',
  'ความดันโลหิตสูง (บิดา/มารดา)',
  'โรคหัวใจ (บิดา)',
  'โรคหลอดเลือดสมอง (มารดา)',
  'มะเร็ง (ระบุอวัยวะและความสัมพันธ์)',
  'โรคไตเรื้อรัง (พี่น้องสายตรง)',
  'ไทรอยด์ (มารดา)',
  'หอบหืด / ภูมิแพ้ (พี่น้องสายตรง)',
  'ไขมันในเลือดสูง (บิดา/มารดา)',
];

/* ── ประเมินสุขภาพ: ช่องที่ VitalsForm ยังไม่มี ─────────────────────
   น้ำหนัก · ส่วนสูง · BMI · เส้นรอบเอว · ความดัน · ชีพจร · การหายใจ ·
   อุณหภูมิ อยู่ที่ขั้น "สัญญาณชีพ" แล้ว เหลือ DTX ที่ฟอร์มถามคู่กับสถานะ
   การอดอาหาร ซึ่งเป็นตัวตัดสินว่าอ่านค่าน้ำตาลยังไงได้ */
export const DTX_FASTING_OPTIONS = ['อดอาหาร 8 ชั่วโมงขึ้นไป', 'ไม่อดอาหาร'];

export const buildEmptyHomeScreening = () => ({
  surveyDate: '',
  nationality: '',
  nationalityOther: '',
  ethnicity: '',
  ethnicityOther: '',
  religion: '',
  religionOther: '',
  personStatus: '',
  communityRole: '',
  communityRoleOther: '',
  rightsUsage: '',
  rightsUsageOther: '',
  minorIllness: [],
  familyHistory: '',
  familyHistoryDetail: '',
  drugAllergyStatus: '',
  foodAllergyStatus: '',
  risks: [],
  dtx: '',
  dtxFasting: '',
});

/** ป้ายที่ขั้น "ตรวจสอบข้อมูล" ใช้แสดง — ลำดับเดียวกับบนหน้าจอ */
export const homeScreeningSummaryRows = (data) => {
  const d = data || {};
  const withOther = (value, other) => (value === 'อื่นๆ' && other ? `อื่นๆ — ${other}` : value);
  const risks = (d.risks || [])
    .map((k) => HEALTH_RISK_OPTIONS.find((o) => o.key === k)?.label)
    .filter(Boolean);
  return [
    { label: 'วันที่สำรวจ', value: d.surveyDate },
    { label: 'สัญชาติ', value: withOther(d.nationality, d.nationalityOther) },
    { label: 'เชื้อชาติ', value: withOther(d.ethnicity, d.ethnicityOther) },
    { label: 'ศาสนา', value: withOther(d.religion, d.religionOther) },
    { label: 'สถานะบุคคล', value: d.personStatus },
    { label: 'สถานะในชุมชน', value: withOther(d.communityRole, d.communityRoleOther) },
    { label: 'การใช้สิทธิการรักษา', value: withOther(d.rightsUsage, d.rightsUsageOther) },
    { label: 'เมื่อเจ็บป่วยเล็กน้อย', value: (d.minorIllness || []).join(' · ') },
    {
      label: 'ประวัติโรคในครอบครัวสายตรง',
      value: d.familyHistory === 'มี'
        ? `มี — ${d.familyHistoryDetail || 'ไม่ได้ระบุโรค'}`
        : d.familyHistory,
    },
    { label: 'ประวัติแพ้ยา', value: d.drugAllergyStatus },
    { label: 'ประวัติแพ้อาหาร', value: d.foodAllergyStatus },
    { label: 'ความเสี่ยงด้านสุขภาพ', value: risks.join(' · ') },
    {
      label: 'DTX (น้ำตาลปลายนิ้ว)',
      value: d.dtx ? `${d.dtx} mg% ${d.dtxFasting ? `(${d.dtxFasting})` : ''}`.trim() : '',
    },
  ].filter((r) => String(r.value || '').trim() !== '');
};
