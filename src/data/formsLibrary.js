/* Mock data for the "คลังเอกสาร e-document" catalog.
   Groups forms by category so the catalog page can render section-by-
   section, and each form ships a static field preview so the detail
   page can show clinicians what they will see on the mobile-side scan
   before they print or share the QR. */

import { EDOCUMENT_FORM_TEMPLATES } from '@/data/consentFormRecords';

export const FORM_CATEGORIES = [
  {
    key: 'consent',
    label: 'แบบฟอร์มยินยอมทางการแพทย์',
    description: 'หนังสือยินยอมการรักษา ผ่าตัด วัคซีน ผลแล็บ และเอกสารเคลม — อยู่ในคลังเอกสาร e-document (ไม่ใช่ PDPA)',
    icon: 'verified_user',
    color: 'brand',
  },
  {
    key: 'assessment',
    label: 'แบบฟอร์มประเมิน',
    description: 'แบบประเมินสุขภาพจิตและร่างกาย เช่น PHQ-9, GAD-7, Pain Scale',
    icon: 'fact_check',
    color: 'blue',
  },
  {
    key: 'report',
    label: 'แบบฟอร์มรายงาน',
    description: 'รายงานอุบัติการณ์และเหตุการณ์ไม่พึงประสงค์',
    icon: 'report',
    color: 'orange',
  },
  {
    key: 'survey',
    label: 'แบบสอบถามสุขภาพ',
    description: 'แบบสอบถามประวัติสุขภาพ ความพึงพอใจ และการคัดกรองเบื้องต้น',
    icon: 'assignment',
    color: 'teal',
  },
  /* สามหมวดล่างมาจากชุดแบบฟอร์มกระดาษของงานเยี่ยมบ้าน (HHC/LTC) สำนักอนามัย กทม. */
  {
    key: 'homevisit',
    label: 'แบบฟอร์มงานเยี่ยมบ้าน',
    description: 'แบบเยี่ยมบ้าน คัดกรองสุขภาพรายบุคคล ทะเบียนแฟ้มครอบครัว แผนที่บ้าน ผังพันธุกรรม และประวัติการรักษา',
    icon: 'home_health',
    color: 'green',
  },
  {
    key: 'homecare-plan',
    label: 'แผนการดูแลต่อเนื่องที่บ้าน',
    description: 'Care Plan การพยาบาลต่อเนื่องที่บ้าน (HHC) และสรุปแผนการดูแลรายบุคคลระยะยาว (LTC เหมาจ่าย)',
    icon: 'clinical_notes',
    color: 'indigo',
  },
  {
    key: 'homecare-assessment',
    label: 'แบบประเมินผู้ป่วยและผู้สูงอายุที่บ้าน',
    description: 'บาร์เธล ADL, Braden แผลกดทับ, ภาวะสมองเสื่อม, ซึมเศร้า 2Q/ST-5 และ TAI',
    icon: 'monitor_heart',
    color: 'purple',
  },
];

/* Each form: slug (URL key), code (รหัสแสดงบนการ์ดคลัง เช่น F-1001), category
   (matches CATEGORIES.key), name, summary, language, estimatedMinutes,
   version, sections.
   `sections[].fields[]` is a static preview list, NOT a live form
   schema — the mobile QR target renders the same preview. */
const BASE_FORMS = [
  /* — แบบฟอร์มยินยอม (consent) — */
  {
    slug: 'consent-treatment',
    code: 'F-1001',
    category: 'consent',
    name: 'หนังสือยินยอมรับการรักษาทั่วไป',
    summary: 'ใช้กับผู้ป่วยใหม่ทุกคนก่อนเริ่มรับการรักษา',
    language: 'ไทย',
    estimatedMinutes: 2,
    version: 'v3.2 (2566)',
    sections: [
      { title: 'ข้อมูลผู้ป่วย', fields: [
        { label: 'ชื่อ-นามสกุล', type: 'text', required: true },
        { label: 'เลขประจำตัวประชาชน', type: 'text', required: true },
        { label: 'HN (เลขประวัติผู้ป่วย)', type: 'text' },
        { label: 'วันเกิด', type: 'date', required: true },
      ] },
      { title: 'การยินยอม', fields: [
        { label: 'การตรวจประเมินอาการเบื้องต้น', type: 'checkbox', required: true },
        { label: 'การเจาะเลือดเพื่อตรวจวินิจฉัย', type: 'checkbox' },
        { label: 'การฉีดวัคซีน/ยาตามคำสั่งแพทย์', type: 'checkbox' },
        { label: 'การเก็บข้อมูลในระบบเวชระเบียน', type: 'checkbox', required: true },
      ] },
      { title: 'ลงนาม', fields: [
        { label: 'ลายเซ็นผู้ป่วย / ผู้แทน', type: 'signature', required: true },
        { label: 'ความสัมพันธ์กับผู้ป่วย (กรณีเป็นผู้แทน)', type: 'text' },
        { label: 'วันที่', type: 'date', required: true },
      ] },
    ],
  },
  {
    slug: 'consent-surgery',
    code: 'F-1002',
    category: 'consent',
    name: 'หนังสือยินยอมการผ่าตัด',
    summary: 'ใช้เมื่อผู้ป่วยจะเข้ารับการผ่าตัดหรือทำหัตถการรุนแรง',
    language: 'ไทย / English',
    estimatedMinutes: 5,
    version: 'v2.0 (2566)',
    sections: [
      { title: 'ข้อมูลผู้ป่วย + การผ่าตัด', fields: [
        { label: 'ชื่อ-นามสกุล', type: 'text', required: true },
        { label: 'หัตถการที่จะทำ', type: 'text', required: true },
        { label: 'แพทย์ผู้ผ่าตัด', type: 'text', required: true },
        { label: 'วันที่กำหนดผ่าตัด', type: 'date', required: true },
      ] },
      { title: 'การยินยอมและรับทราบความเสี่ยง', fields: [
        { label: 'รับทราบขั้นตอนการผ่าตัด', type: 'checkbox', required: true },
        { label: 'รับทราบความเสี่ยงและภาวะแทรกซ้อนที่อาจเกิดขึ้น', type: 'checkbox', required: true },
        { label: 'ยินยอมการให้ยาระงับความรู้สึก', type: 'checkbox', required: true },
        { label: 'ยินยอมการให้เลือดหากจำเป็น', type: 'checkbox' },
      ] },
      { title: 'ลงนาม', fields: [
        { label: 'ลายเซ็นผู้ป่วย', type: 'signature', required: true },
        { label: 'ลายเซ็นพยาน', type: 'signature', required: true },
        { label: 'วันที่', type: 'date', required: true },
      ] },
    ],
  },
  {
    slug: 'consent-blood',
    code: 'F-1003',
    category: 'consent',
    name: 'หนังสือยินยอมการให้เลือด',
    summary: 'การให้เลือดหรือส่วนประกอบของเลือดในการรักษา',
    language: 'ไทย',
    estimatedMinutes: 3,
    version: 'v1.5 (2566)',
    sections: [
      { title: 'รับทราบและยินยอม', fields: [
        { label: 'รับทราบเหตุผลทางการแพทย์', type: 'checkbox', required: true },
        { label: 'รับทราบความเสี่ยงของการให้เลือด', type: 'checkbox', required: true },
        { label: 'ยินยอมการให้เลือด/ส่วนประกอบของเลือด', type: 'checkbox', required: true },
      ] },
      { title: 'ลงนาม', fields: [
        { label: 'ลายเซ็นผู้ป่วย', type: 'signature', required: true },
        { label: 'วันที่', type: 'date', required: true },
      ] },
    ],
  },

  /* — แบบฟอร์มประเมิน (assessment) — */
  {
    slug: 'assess-phq9',
    code: 'F-1021',
    category: 'assessment',
    name: 'แบบประเมินภาวะซึมเศร้า (PHQ-9)',
    summary: 'คัดกรองภาวะซึมเศร้าในช่วง 2 สัปดาห์ที่ผ่านมา',
    language: 'ไทย',
    estimatedMinutes: 5,
    version: 'v1.0 (Thai)',
    sections: [
      { title: 'ในช่วง 2 สัปดาห์ที่ผ่านมา', fields: [
        { label: 'รู้สึกเบื่อหรือไม่อยากทำอะไร', type: 'radio-4' },
        { label: 'รู้สึกเศร้า เหนื่อยใจ หรือสิ้นหวัง', type: 'radio-4' },
        { label: 'นอนไม่หลับหรือนอนมากเกินไป', type: 'radio-4' },
        { label: 'เหนื่อยล้าหรือไม่มีแรง', type: 'radio-4' },
        { label: 'เบื่ออาหารหรือกินมากเกินไป', type: 'radio-4' },
        { label: 'รู้สึกแย่ต่อตนเอง', type: 'radio-4' },
        { label: 'มีสมาธิยากกับการอ่านหรือดูทีวี', type: 'radio-4' },
        { label: 'พูดช้าลงหรือกระวนกระวายกว่าปกติ', type: 'radio-4' },
        { label: 'มีความคิดอยากทำร้ายตัวเองหรือสิ้นหวัง', type: 'radio-4', critical: true },
      ] },
    ],
  },
  {
    slug: 'assess-gad7',
    code: 'F-1022',
    category: 'assessment',
    name: 'แบบประเมินความวิตกกังวล (GAD-7)',
    summary: 'คัดกรอง Generalized Anxiety Disorder ในช่วง 2 สัปดาห์',
    language: 'ไทย',
    estimatedMinutes: 4,
    version: 'v1.0 (Thai)',
    sections: [
      { title: 'ในช่วง 2 สัปดาห์ที่ผ่านมา', fields: [
        { label: 'รู้สึกกังวลตึงเครียดหรือกระวนกระวาย', type: 'radio-4' },
        { label: 'ไม่สามารถหยุดหรือควบคุมความกังวลได้', type: 'radio-4' },
        { label: 'กังวลเกินไปเกี่ยวกับเรื่องต่าง ๆ', type: 'radio-4' },
        { label: 'มีปัญหาในการผ่อนคลาย', type: 'radio-4' },
        { label: 'กระวนกระวายจนนั่งนิ่งไม่ได้', type: 'radio-4' },
        { label: 'หงุดหงิดง่ายหรือฉุนเฉียว', type: 'radio-4' },
        { label: 'รู้สึกกลัวเหมือนกำลังจะเกิดเหตุร้าย', type: 'radio-4' },
      ] },
    ],
  },
  {
    slug: 'assess-pain-scale',
    code: 'F-1025',
    category: 'assessment',
    name: 'แบบประเมินอาการปวด (Numeric Pain Scale)',
    summary: 'ประเมินระดับความเจ็บปวดจาก 0–10',
    language: 'ไทย',
    estimatedMinutes: 1,
    version: 'v1.0',
    sections: [
      { title: 'ระบุระดับความเจ็บปวดที่ผู้ป่วยรู้สึก', fields: [
        { label: 'ระดับความปวด (0 = ไม่ปวด, 10 = ปวดทรมานที่สุด)', type: 'slider-0-10', required: true },
        { label: 'ตำแหน่งที่ปวด', type: 'text', required: true },
        { label: 'ลักษณะของอาการปวด (จิ๊ด ตื้อ บีบ ฯลฯ)', type: 'text' },
      ] },
    ],
  },

  /* — แบบฟอร์มรายงาน (report) — */
  {
    slug: 'report-incident',
    code: 'F-1051',
    category: 'report',
    name: 'รายงานอุบัติการณ์ในผู้ป่วย',
    summary: 'บันทึกเหตุการณ์ที่อาจส่งผลกระทบต่อความปลอดภัยของผู้ป่วย',
    language: 'ไทย',
    estimatedMinutes: 8,
    version: 'v4.1 (2566)',
    sections: [
      { title: 'ข้อมูลผู้ป่วย', fields: [
        { label: 'ชื่อ-นามสกุล', type: 'text', required: true },
        { label: 'HN', type: 'text', required: true },
      ] },
      { title: 'รายละเอียดเหตุการณ์', fields: [
        { label: 'วันที่/เวลาเกิดเหตุ', type: 'datetime', required: true },
        { label: 'สถานที่เกิดเหตุ', type: 'text', required: true },
        { label: 'ระดับความรุนแรง (A–I)', type: 'select', required: true },
        { label: 'รายละเอียดเหตุการณ์', type: 'textarea', required: true },
        { label: 'มาตรการแก้ไขเบื้องต้น', type: 'textarea' },
      ] },
      { title: 'ผู้บันทึก', fields: [
        { label: 'ชื่อผู้บันทึก', type: 'text', required: true },
        { label: 'ตำแหน่ง / แผนก', type: 'text', required: true },
        { label: 'ลายเซ็น', type: 'signature', required: true },
      ] },
    ],
  },
  {
    slug: 'report-adr',
    code: 'F-1052',
    category: 'report',
    name: 'รายงานเหตุการณ์ไม่พึงประสงค์จากยา (ADR)',
    summary: 'รายงานปฏิกิริยาไม่พึงประสงค์จากยาตามแบบฟอร์ม สสจ.',
    language: 'ไทย',
    estimatedMinutes: 10,
    version: 'v2.3 (2566)',
    sections: [
      { title: 'ผู้ป่วย', fields: [
        { label: 'HN', type: 'text', required: true },
        { label: 'น้ำหนัก / ส่วนสูง', type: 'text' },
        { label: 'โรคประจำตัว', type: 'textarea' },
      ] },
      { title: 'รายละเอียดยาและอาการ', fields: [
        { label: 'ชื่อยาที่สงสัย', type: 'text', required: true },
        { label: 'ขนาด/วิธีใช้', type: 'text', required: true },
        { label: 'อาการที่เกิดขึ้น', type: 'textarea', required: true },
        { label: 'วันที่เริ่มมีอาการ', type: 'date', required: true },
        { label: 'ระดับความรุนแรง (Mild/Moderate/Severe/Life-threat)', type: 'select', required: true },
      ] },
    ],
  },
  {
    slug: 'report-fall',
    code: 'F-1053',
    category: 'report',
    name: 'รายงานการพลัดตกหกล้ม',
    summary: 'บันทึกเหตุการณ์ผู้ป่วยพลัดตกหกล้มในระหว่างให้บริการ',
    language: 'ไทย',
    estimatedMinutes: 5,
    version: 'v1.7',
    sections: [
      { title: 'ผู้ป่วยและเหตุการณ์', fields: [
        { label: 'ชื่อ / HN', type: 'text', required: true },
        { label: 'อายุ', type: 'text', required: true },
        { label: 'สถานที่ / วันที่ / เวลา', type: 'datetime', required: true },
        { label: 'ลักษณะการพลัดตก', type: 'textarea', required: true },
        { label: 'ผลกระทบที่พบ', type: 'textarea' },
      ] },
    ],
  },

  /* — แบบสอบถาม (survey) — */
  {
    slug: 'survey-health-history',
    code: 'F-1031',
    category: 'survey',
    name: 'แบบสอบถามประวัติสุขภาพทั่วไป',
    summary: 'ใช้กับผู้ป่วยใหม่เพื่อเก็บข้อมูลพื้นฐานก่อนเข้าพบแพทย์',
    language: 'ไทย / English',
    estimatedMinutes: 7,
    version: 'v2.0 (2566)',
    sections: [
      { title: 'ประวัติส่วนตัว', fields: [
        { label: 'ชื่อ-นามสกุล', type: 'text', required: true },
        { label: 'อายุ', type: 'text', required: true },
        { label: 'อาชีพ', type: 'text' },
        { label: 'สถานภาพสมรส', type: 'select' },
      ] },
      { title: 'ประวัติการเจ็บป่วย', fields: [
        { label: 'โรคประจำตัวปัจจุบัน', type: 'textarea' },
        { label: 'การผ่าตัดในอดีต', type: 'textarea' },
        { label: 'ประวัติการแพ้ยา/อาหาร', type: 'textarea' },
        { label: 'ประวัติเจ็บป่วยของครอบครัว', type: 'textarea' },
      ] },
      { title: 'พฤติกรรมสุขภาพ', fields: [
        { label: 'การสูบบุหรี่', type: 'select' },
        { label: 'การดื่มแอลกอฮอล์', type: 'select' },
        { label: 'การออกกำลังกาย (ครั้ง/สัปดาห์)', type: 'select' },
      ] },
    ],
  },
  {
    slug: 'survey-satisfaction',
    code: 'F-1032',
    category: 'survey',
    name: 'แบบสอบถามความพึงพอใจการบริการ',
    summary: 'เก็บความคิดเห็นของผู้ป่วยหลังรับบริการ',
    language: 'ไทย',
    estimatedMinutes: 3,
    version: 'v3.0',
    sections: [
      { title: 'ระดับความพึงพอใจ', fields: [
        { label: 'ความสะดวกในการเข้ารับบริการ', type: 'radio-5' },
        { label: 'มารยาทและความเอาใจใส่ของเจ้าหน้าที่', type: 'radio-5' },
        { label: 'ระยะเวลาในการรอ', type: 'radio-5' },
        { label: 'ความสะอาดของสถานที่', type: 'radio-5' },
        { label: 'ความพึงพอใจต่อการรักษาโดยรวม', type: 'radio-5' },
      ] },
      { title: 'ข้อเสนอแนะ', fields: [
        { label: 'สิ่งที่ประทับใจ', type: 'textarea' },
        { label: 'สิ่งที่ควรปรับปรุง', type: 'textarea' },
      ] },
    ],
  },
];

/** แม่แบบที่ย้ายจากระบบจัดการความยินยอม (ไม่ใช่ PDPA) */
const EDOCUMENT_MIGRATED_FORMS = EDOCUMENT_FORM_TEMPLATES.slice(0, 48).map((t, i) => ({
  slug: `edoc-${i + 1}`,
  code: `F-${2100 + i}`,
  category: 'consent',
  name: t.name,
  summary: `คลังเอกสาร e-document — ${t.type}`,
  language: 'ไทย',
  estimatedMinutes: 3,
  version: 'v1.0',
  sections: [
    { title: 'การยินยอม', fields: [
      { label: 'ยินยอมตามข้อความในแบบฟอร์ม', type: 'checkbox', required: true },
    ] },
    { title: 'ลงนาม', fields: [
      { label: 'ลายเซ็นผู้ป่วย', type: 'signature', required: true },
      { label: 'วันที่', type: 'date', required: true },
    ] },
  ],
}));

/* ── แบบฟอร์มงานเยี่ยมบ้าน / การดูแลต่อเนื่องที่บ้าน (HHC · LTC) ──────────
   ถอดจากแบบฟอร์มกระดาษจริง 14 ฉบับที่ทีมรวบรวมไว้ใน Google Drive
   (โฟลเดอร์ "แบบฟอร์มงานเยี่ยมบ้าน" — ต้นฉบับของกองการพยาบาลสาธารณสุข
   สำนักอนามัย กทม. / สปสช. เขต 13). แต่ละฉบับแตกเป็น sections + fields
   ตามหัวข้อในกระดาษ เพื่อให้หน้ารายละเอียดและหน้ากรอกใช้ได้ทันที
   ─ ฟอร์มที่ต้อง "วาด" (แผนที่บ้าน, ผังพันธุกรรม) ใช้ field type
     `signature` เพราะเป็นชนิดเดียวที่ให้ผืนผ้าใบวาด/อัปโหลดภาพได้ */

/** [คะแนน, คำอธิบาย] → ตัวเลือกที่มีคะแนนนำหน้า (ADL, Braden, ST-5 ฯลฯ) */
const scored = (pairs) =>
  pairs.map(([value, label]) => ({ value: String(value), label: `${value} — ${label}` }));

/** รายการข้อความล้วน → ตัวเลือก select (value = label) */
const choices = (labels) => labels.map((label) => ({ value: label, label }));

const HOME_VISIT_FORMS = [
  /* — งานเยี่ยมบ้าน (homevisit) — */
  {
    slug: 'hv-home-visit',
    code: 'F-3001',
    category: 'homevisit',
    name: 'แบบเยี่ยมบ้าน (Home Visit)',
    summary: 'แบบบันทึกการเยี่ยมบ้านมาตรฐาน — สัญญาณชีพ ประเมินภาวะสุขภาพตามช่วงวัย คัดกรองสุขภาพจิต และคนพิการ',
    language: 'ไทย',
    estimatedMinutes: 12,
    version: 'v1.0 (ปรับปรุง 28 ก.พ. 2567)',
    sections: [
      { title: 'ข้อมูลการเยี่ยม', fields: [
        { label: 'รหัสหน่วยบริการ', type: 'text' },
        { label: 'ชื่อหน่วยบริการ', type: 'text' },
        { label: 'วันที่เยี่ยม', type: 'date', required: true },
        { label: 'ครั้งที่เยี่ยม', type: 'text' },
        { label: 'ชื่อ-สกุล ผู้เยี่ยม', type: 'text', required: true },
        { label: 'วิชาชีพ', type: 'select', options: choices([
          'พยาบาลวิชาชีพ', 'แพทย์', 'ทันตแพทย์', 'เภสัชกร', 'นักกายภาพบำบัด',
          'นักสังคมสงเคราะห์', 'นักจิตวิทยา', 'อาสาสมัครสาธารณสุข', 'อื่นๆ',
        ]) },
        { label: 'ใบอนุญาตประกอบวิชาชีพเลขที่', type: 'text' },
      ] },
      { title: 'ข้อมูลผู้รับบริการ', fields: [
        { label: 'ชื่อ-สกุล ผู้รับบริการ', type: 'text', required: true },
        { label: 'เลขบัตรประจำตัวประชาชน / เลขที่บัตรต่างด้าว (Passport)', type: 'text', required: true },
        { label: 'อายุ (ปี)', type: 'text' },
        { label: 'เบอร์โทรศัพท์', type: 'text' },
      ] },
      { title: 'การประเมินภาวะสุขภาพ — สัญญาณชีพ', fields: [
        { label: 'อุณหภูมิ (องศาเซลเซียส)', type: 'text' },
        { label: 'ชีพจร (ครั้ง/นาที)', type: 'text' },
        { label: 'อัตราการหายใจ (ครั้ง/นาที)', type: 'text' },
        { label: 'ความดันโลหิต (มม.ปรอท)', type: 'text' },
        { label: 'ออกซิเจนปลายนิ้ว O2 sat (%)', type: 'text' },
        { label: 'ความปวด (0-10)', type: 'slider-0-10' },
        { label: 'น้ำหนัก (กก.)', type: 'text' },
        { label: 'ส่วนสูง (ซม.)', type: 'text' },
        { label: 'ดัชนีมวลกาย BMI (กก./ม.²)', type: 'text' },
        { label: 'รอบเอว (ซม.)', type: 'text' },
        { label: 'รอบสะโพก (ซม.)', type: 'text' },
      ] },
      { title: 'เด็กแรกเกิด - 5 ปี', fields: [
        { label: 'เส้นรอบศีรษะ (ซม.)', type: 'text' },
        { label: 'น้ำหนักตามเกณฑ์อายุ', type: 'select', options: choices(['ปกติ', 'ไม่ปกติ']) },
        { label: 'ส่วนสูงตามเกณฑ์อายุ', type: 'select', options: choices(['ปกติ', 'ไม่ปกติ']) },
        { label: 'สีผิว', type: 'select', options: choices(['ปกติ', 'เหลือง', 'ซีด', 'เขียว']) },
        { label: 'ฟันผุ', type: 'select', options: choices(['ไม่ผุ', 'ผุ']) },
        { label: 'ได้รับวัคซีน', type: 'select', options: choices(['ครบ', 'ไม่ครบ']) },
        { label: 'อาหารตามวัย', type: 'select', options: choices(['เหมาะสม', 'ไม่เหมาะสม']) },
        { label: 'ได้รับนมแม่อย่างเดียว 6 เดือน', type: 'select', options: choices(['ใช่', 'ไม่ใช่']) },
        { label: 'ประเมินพัฒนาการ', type: 'select', options: choices(['สมวัย', 'ไม่สมวัย']) },
        { label: 'ปล่อยเด็กอยู่กับสื่อหน้าจอลำพัง', type: 'select', options: choices(['ไม่ใช่', 'ใช่']) },
        { label: 'ซนมากผิดปกติ อยู่ไม่นิ่ง', type: 'select', options: choices(['ไม่ใช่', 'ใช่']) },
      ] },
      { title: 'วัยเรียนและวัยรุ่น อายุ 6-24 ปี', fields: [
        { label: 'การมองเห็น', type: 'select', options: choices(['ชัด', 'ไม่ชัด']) },
        { label: 'ดื่มสุรา (ครั้ง/เดือน)', type: 'text' },
        { label: 'สูบบุหรี่ (มวน/วัน)', type: 'text' },
        { label: 'ใช้สารเสพติด', type: 'select', options: choices(['ไม่ใช่', 'ใช่']) },
        { label: 'มีเพศสัมพันธ์โดยไม่ป้องกัน', type: 'select', options: choices(['ไม่ใช่', 'ใช่']) },
        { label: 'ออกกำลังกายน้อยกว่า 3 วันต่อสัปดาห์', type: 'select', options: choices(['ไม่ใช่', 'ใช่']) },
      ] },
      { title: 'คัดกรองสุขภาพจิต', fields: [
        { label: 'รู้สึกหดหู่ เศร้า ท้อแท้ สิ้นหวัง ใน 2 สัปดาห์ที่ผ่านมา', type: 'select', options: choices(['ไม่มี', 'มี']) },
        { label: 'รู้สึกเบื่อ ทำอะไรก็ไม่เพลิดเพลิน ใน 2 สัปดาห์ที่ผ่านมา', type: 'select', options: choices(['ไม่มี', 'มี']) },
        { label: 'รู้สึกเบื่อหน่าย หงุดหงิดง่าย เกือบทุกวันใน 2 สัปดาห์ที่ผ่านมา', type: 'select', options: choices(['ไม่มี', 'มี']) },
        { label: 'ใน 1 เดือนที่ผ่านมา รู้สึกทุกข์ใจจนไม่อยากมีชีวิตอยู่', type: 'select', required: true, critical: true, options: choices(['ไม่มี', 'มี']) },
      ] },
      { title: 'คนพิการ', fields: [
        { label: 'การขึ้นทะเบียนคนพิการ', type: 'select', options: choices(['ขึ้นทะเบียนแล้ว', 'ไม่ได้ขึ้นทะเบียน']) },
        { label: 'การช่วยเหลือตนเองในชีวิตประจำวัน', type: 'select', options: choices(['ได้', 'ไม่ได้']) },
        { label: 'มีผู้ดูแล (กรณีช่วยเหลือตนเองไม่ได้)', type: 'select', options: choices(['มี', 'ไม่มี']) },
        { label: 'สภาพแวดล้อมมีราวจับ / ทางลาด', type: 'select', options: choices(['มี', 'ไม่มี']) },
      ] },
      { title: 'สรุปการเยี่ยม', fields: [
        { label: 'ความเสี่ยง / ปัญหาที่พบ', type: 'textarea' },
        { label: 'ลายเซ็นผู้เยี่ยม', type: 'signature', required: true },
      ] },
    ],
  },
  {
    slug: 'hv-personal-health-screening',
    code: 'F-3002',
    category: 'homevisit',
    name: 'แบบคัดกรองสุขภาพรายบุคคล (Personal Health Screening)',
    summary: 'คัดกรองสุขภาพรายบุคคลในงานเยี่ยมบ้าน — ข้อมูลประชากร สิทธิการรักษา ประวัติสุขภาพ ความเสี่ยง และสรุปกลุ่มสุขภาพ',
    language: 'ไทย',
    estimatedMinutes: 15,
    version: 'v1.0 (ปรับปรุง 28 ก.พ. 2567)',
    sections: [
      { title: 'ข้อมูลการสำรวจ', fields: [
        { label: 'รหัสหน่วยบริการ', type: 'text' },
        { label: 'ชื่อหน่วยบริการ', type: 'text' },
        { label: 'วันที่สำรวจ', type: 'date', required: true },
      ] },
      { title: 'ข้อมูลทั่วไป', fields: [
        { label: 'เลขบัตรประจำตัวประชาชน / เลขที่บัตรต่างด้าว (Passport)', type: 'text', required: true },
        { label: 'คำนำหน้า', type: 'select', options: choices(['นาย', 'นาง', 'นางสาว', 'เด็กชาย', 'เด็กหญิง', 'อื่นๆ']) },
        { label: 'ชื่อ-สกุล', type: 'text', required: true },
        { label: 'วันเดือนปีเกิด', type: 'date' },
        { label: 'อายุ (ปี)', type: 'text' },
        { label: 'เบอร์โทรศัพท์', type: 'text' },
        { label: 'Line ID', type: 'text' },
        { label: 'ศาสนา', type: 'select', options: choices(['พุทธ', 'อิสลาม', 'คริสต์', 'อื่นๆ']) },
        { label: 'สัญชาติ', type: 'select', options: choices(['ไทย', 'อื่นๆ']) },
        { label: 'เชื้อชาติ', type: 'select', options: choices(['ไทย', 'อื่นๆ']) },
        { label: 'สถานภาพสมรส', type: 'select', options: choices(['โสด', 'คู่', 'หม้าย', 'หย่า', 'แยกกันอยู่', 'สมณะเพศ']) },
        { label: 'การศึกษาสูงสุด', type: 'select', options: choices([
          'ไม่ได้รับการศึกษา', 'ก่อนประถมศึกษา', 'ประถมศึกษา', 'มัธยมศึกษาตอนต้น',
          'มัธยมศึกษาตอนปลาย / ปวช.', 'อนุปริญญา / ปวส.', 'ปริญญาตรี', 'ปริญญาโท',
          'ปริญญาเอก', 'กำลังศึกษา', 'ไม่ทราบ',
        ]) },
        { label: 'อาชีพ', type: 'select', options: choices([
          'ว่างงาน', 'รับจ้าง / ลูกจ้าง', 'ค้าขาย', 'เกษตรกร', 'ธุรกิจส่วนตัว',
          'รับราชการ / ข้าราชการบำนาญ', 'รัฐวิสาหกิจ', 'อื่นๆ',
        ]) },
      ] },
      { title: 'สถานะบุคคลและสิทธิการรักษา', fields: [
        { label: 'สถานะบุคคล', type: 'select', options: choices([
          'อาศัยอยู่ตรงกับทะเบียนบ้าน', 'อาศัยอยู่ไม่ตรงกับทะเบียนบ้าน', 'ไม่อยู่ในทะเบียนราษฎร์',
        ]) },
        { label: 'สถานะในชุมชน', type: 'select', options: choices([
          'ประชาชนทั่วไป', 'ประธานชุมชน', 'กรรมการชุมชน', 'อาสาสมัครสาธารณสุข',
          'ผู้ดูแลผู้ป่วยที่ผ่านการอบรม', 'ผู้ดูแลผู้ป่วยที่ไม่ผ่านการอบรม', 'อาสาสมัครอื่นๆ',
        ]) },
        { label: 'สิทธิการรักษา', type: 'select', options: choices([
          'ประกันสุขภาพถ้วนหน้า (สิทธิบัตรทอง)', 'ประกันสังคม', 'ข้าราชการ', 'รัฐวิสาหกิจ', 'อื่นๆ',
        ]) },
        { label: 'การใช้สิทธิการรักษา', type: 'select', options: choices([
          'รับบริการที่สถานพยาบาลตามสิทธิ',
          'รับบริการที่สถานพยาบาลอื่น (ชำระเงินเอง / ประกันสุขภาพ)',
          'ไม่เคยเข้ารับบริการ',
        ]) },
        { label: 'การปฏิบัติตัวเมื่อเจ็บป่วยเล็กน้อย (เรียงลำดับ 1-3 ที่ปฏิบัติบ่อยที่สุด)', type: 'textarea',
          placeholder: 'เช่น 1 ซื้อยาจากร้านขายยา 2 รักษาที่ศูนย์บริการสาธารณสุข 3 ดูแลสุขภาพตนเอง' },
      ] },
      { title: 'ประวัติสุขภาพ', fields: [
        { label: 'โรคประจำตัว', type: 'select', options: choices(['ไม่มี', 'มี']) },
        { label: 'ระบุโรคประจำตัว และรหัส ICD-10', type: 'text' },
        { label: 'การควบคุมโรค', type: 'select', options: choices(['สามารถควบคุมโรคได้', 'ควบคุมโรคไม่ได้']) },
        { label: 'ประวัติแพ้ยา', type: 'select', options: choices(['ปฏิเสธการแพ้ยา / ไม่ทราบ', 'มีประวัติการแพ้ยา']) },
        { label: 'ระบุยาที่แพ้และอาการ', type: 'text', critical: true },
        { label: 'ประวัติแพ้อาหาร', type: 'select', options: choices(['ปฏิเสธการแพ้อาหาร / ไม่ทราบ', 'มีประวัติการแพ้อาหาร']) },
        { label: 'ระบุอาหารที่แพ้และอาการ', type: 'text' },
        { label: 'ประวัติครอบครัวสายตรง', type: 'select', options: choices([
          'ไม่มีโรคประจำตัว', 'เบาหวาน', 'ความดันโลหิตสูง', 'โรคหัวใจ', 'มะเร็ง',
          'ธาลัสซีเมีย / พาหะ', 'ตาบอดสี', 'อื่นๆ',
        ]) },
      ] },
      { title: 'ประเมินสุขภาพ', fields: [
        { label: 'น้ำหนัก (กก.)', type: 'text' },
        { label: 'ส่วนสูง (ซม.)', type: 'text' },
        { label: 'เส้นรอบเอว (ซม.)', type: 'text' },
        { label: 'ความดันโลหิต (มม.ปรอท)', type: 'text' },
        { label: 'ดัชนีมวลกาย BMI', type: 'text' },
        { label: 'น้ำหนักตามเกณฑ์ส่วนสูง (สำหรับเด็ก)', type: 'text' },
        { label: 'ส่วนสูงตามเกณฑ์อายุ (สำหรับเด็ก)', type: 'text' },
      ] },
      { title: 'ความเสี่ยงด้านสุขภาพ (เลือกได้มากกว่า 1 ข้อ)', fields: [
        { label: 'หญิงตั้งครรภ์', type: 'checkbox' },
        { label: 'เด็กได้รับวัคซีนไม่ครบ', type: 'checkbox' },
        { label: 'สูบบุหรี่', type: 'checkbox' },
        { label: 'ติดเหล้า', type: 'checkbox' },
        { label: 'ใช้สารเสพติด', type: 'checkbox' },
        { label: 'รับประทานอาหารรสหวาน มัน เค็ม', type: 'checkbox' },
        { label: 'ออกกำลังกายน้อยกว่า 3 วัน/สัปดาห์', type: 'checkbox' },
        { label: 'เครียด', type: 'checkbox' },
        { label: 'ไม่เคยตรวจสุขภาพ', type: 'checkbox' },
        { label: 'อ้วน', type: 'checkbox' },
        { label: 'ผอม', type: 'checkbox' },
        { label: 'มีความพิการ', type: 'checkbox' },
        { label: 'ติดเตียง', type: 'checkbox' },
        { label: 'ความเสี่ยงอื่นๆ (ระบุ)', type: 'text' },
      ] },
      { title: 'สรุปภาวะสุขภาพ', fields: [
        { label: 'สรุปภาวะสุขภาพ', type: 'select', required: true, options: choices([
          'กลุ่มสุขภาพปกติ', 'กลุ่มที่มีความเสี่ยงด้านสุขภาพ',
          'กลุ่มป่วยที่ควบคุมโรคได้', 'กลุ่มป่วยที่ควบคุมโรคไม่ได้',
        ]) },
        { label: 'ลายเซ็นผู้สำรวจ', type: 'signature' },
        { label: 'วันที่บันทึก', type: 'date' },
      ] },
    ],
  },
  {
    slug: 'hv-visit-registry',
    code: 'F-3003',
    category: 'homevisit',
    name: 'ทะเบียนประวัติผู้รับบริการเยี่ยมบ้าน (แฟ้มครอบครัว)',
    summary: 'หน้าปกแฟ้มครอบครัว NCM/CG — ประเภทการดูแล (Home Care / IMC / LTC / Palliative) ทีมสหสาขาวิชาชีพ และความถี่การเยี่ยม',
    language: 'ไทย',
    estimatedMinutes: 5,
    version: 'v1.0',
    sections: [
      { title: 'ข้อมูลแฟ้มครอบครัว', fields: [
        { label: 'ศูนย์บริการสาธารณสุข', type: 'text', required: true },
        { label: 'แฟ้มครอบครัวที่', type: 'text' },
        { label: 'รหัสครอบครัว', type: 'text' },
        { label: 'ชุมชน', type: 'text' },
        { label: 'ที่อยู่', type: 'textarea' },
        { label: 'เบอร์โทรศัพท์', type: 'text' },
      ] },
      { title: 'ผู้รับบริการ', fields: [
        { label: 'ชื่อ-นามสกุล', type: 'text', required: true },
        { label: 'อายุ (ปี)', type: 'text' },
        { label: 'โรค / การวินิจฉัย', type: 'text' },
        { label: 'ประเภทการดูแล', type: 'select', required: true, options: choices([
          'Home Care 1', 'Home Care 2', 'IMC', 'LTC 1', 'LTC 2', 'LTC 3', 'LTC 4',
          'Palliative Care', 'Special Group',
        ]) },
        { label: 'วันที่แรกรับ', type: 'date' },
        { label: 'ความถี่ในการเยี่ยม', type: 'select', options: choices([
          'เดือนละ 2-4 ครั้ง', 'เดือนละ 1 ครั้ง', 'ทุก 2 เดือน', 'ทุก 3 เดือน', 'อื่นๆ',
        ]) },
      ] },
      { title: 'ทีมสหสาขาวิชาชีพ (เลือกได้มากกว่า 1 ข้อ)', fields: [
        { label: 'แพทย์', type: 'checkbox' },
        { label: 'ทันตแพทย์', type: 'checkbox' },
        { label: 'เภสัชกร', type: 'checkbox' },
        { label: 'นักกายภาพบำบัด', type: 'checkbox' },
        { label: 'นักสังคมสงเคราะห์', type: 'checkbox' },
        { label: 'นักจิตวิทยา', type: 'checkbox' },
        { label: 'สหวิชาชีพอื่นๆ (ระบุ)', type: 'text' },
      ] },
    ],
  },
  {
    slug: 'hv-home-map',
    code: 'F-3004',
    category: 'homevisit',
    name: 'แผนที่บ้าน',
    summary: 'ผังเส้นทางเข้าถึงบ้านผู้รับบริการ พร้อมจุดสังเกตและพิกัด สำหรับทีมเยี่ยมบ้านครั้งถัดไป',
    language: 'ไทย',
    estimatedMinutes: 4,
    version: 'v1.0',
    sections: [
      { title: 'ข้อมูลผู้รับบริการ', fields: [
        { label: 'ชื่อ-นามสกุล', type: 'text', required: true },
        { label: 'ที่อยู่', type: 'textarea', required: true },
        { label: 'พิกัด GPS (ละติจูด, ลองจิจูด)', type: 'text' },
      ] },
      { title: 'ผังเส้นทาง', fields: [
        { label: 'ภาพวาดแผนที่บ้าน', type: 'signature', required: true },
        { label: 'จุดสังเกต / เส้นทางเข้าถึงบ้าน', type: 'textarea' },
        { label: 'ข้อควรระวังในการเดินทาง', type: 'textarea' },
      ] },
    ],
  },
  {
    slug: 'hv-family-genogram',
    code: 'F-3005',
    category: 'homevisit',
    name: 'แผนผังพันธุกรรมครอบครัว (Family Genogram)',
    summary: 'ผังเครือญาติ 3 รุ่น สำหรับดูโรคที่ถ่ายทอดทางพันธุกรรมและโครงสร้างผู้ดูแลในครอบครัว',
    language: 'ไทย',
    estimatedMinutes: 8,
    version: 'v1.0',
    sections: [
      { title: 'ข้อมูลผู้รับบริการ', fields: [
        { label: 'ชื่อ-นามสกุล', type: 'text', required: true },
        { label: 'วันที่บันทึก', type: 'date' },
      ] },
      { title: 'ผังพันธุกรรม', fields: [
        { label: 'ภาพวาดผังพันธุกรรมครอบครัว', type: 'signature', required: true },
        { label: 'โรคที่ถ่ายทอดทางพันธุกรรมในครอบครัว', type: 'textarea' },
        { label: 'ผู้ดูแลหลักในครอบครัว', type: 'text' },
        { label: 'ผู้บันทึก', type: 'text' },
      ] },
    ],
  },
  {
    slug: 'hv-treatment-history',
    code: 'F-3006',
    category: 'homevisit',
    name: 'ประวัติการรักษา',
    summary: 'ประวัติความเจ็บป่วยในอดีตและปัจจุบัน พร้อมการรักษาและยาที่ใช้ประจำ สำหรับแฟ้มเยี่ยมบ้าน',
    language: 'ไทย',
    estimatedMinutes: 8,
    version: 'v1.0',
    sections: [
      { title: 'ข้อมูลผู้รับบริการ', fields: [
        { label: 'ชื่อ-นามสกุล', type: 'text', required: true },
        { label: 'อายุ (ปี)', type: 'text' },
      ] },
      { title: 'ประวัติในอดีต', fields: [
        { label: 'ประวัติความเจ็บป่วยในอดีต', type: 'textarea' },
        { label: 'ประวัติการรักษาในอดีต', type: 'textarea' },
      ] },
      { title: 'ประวัติปัจจุบัน', fields: [
        { label: 'ประวัติการเจ็บป่วยปัจจุบัน', type: 'textarea', required: true },
        { label: 'ประวัติการรักษาปัจจุบัน', type: 'textarea' },
        { label: 'ยาที่ใช้ประจำ', type: 'textarea' },
        { label: 'ผู้บันทึก', type: 'text' },
        { label: 'วันที่บันทึก', type: 'date' },
      ] },
    ],
  },

  /* — แผนการดูแลต่อเนื่องที่บ้าน (homecare-plan) — */
  {
    slug: 'hc-care-plan',
    code: 'F-3007',
    category: 'homecare-plan',
    name: 'แผนการพยาบาลผู้ป่วยต่อเนื่องที่บ้าน (Care Plan)',
    summary: 'ข้อวินิจฉัยทางการพยาบาล จุดมุ่งหมาย เกณฑ์ประเมิน กิจกรรมการพยาบาล และผลลัพธ์ รายครั้งที่เยี่ยม',
    language: 'ไทย',
    estimatedMinutes: 10,
    version: 'v1.0',
    sections: [
      { title: 'ข้อมูลผู้ป่วยและการเยี่ยม', fields: [
        { label: 'ชื่อผู้ป่วย', type: 'text', required: true },
        { label: 'เลขที่ HHC', type: 'text' },
        { label: 'วัน/เดือน/ปี ที่เยี่ยม', type: 'date', required: true },
        { label: 'ครั้งที่เยี่ยม', type: 'text' },
      ] },
      { title: 'ข้อวินิจฉัยทางการพยาบาล (Nursing Phenomena)', fields: [
        { label: 'ข้อวินิจฉัยทางการพยาบาล', type: 'textarea', required: true },
        { label: 'ข้อมูลสนับสนุน', type: 'textarea' },
      ] },
      { title: 'จุดมุ่งหมายและเกณฑ์การประเมินผล', fields: [
        { label: 'จุดมุ่งหมาย', type: 'textarea', required: true },
        { label: 'เกณฑ์การประเมินผล', type: 'textarea' },
      ] },
      { title: 'กิจกรรมการพยาบาล (Nursing Intervention)', fields: [
        { label: 'กิจกรรมการพยาบาล', type: 'textarea', required: true },
      ] },
      { title: 'ประเมินผลการพยาบาล (Evaluation: Nursing Outcome)', fields: [
        { label: 'ผลการพยาบาล', type: 'textarea' },
        { label: 'ชื่อผู้เยี่ยม', type: 'text' },
        { label: 'ลายเซ็นผู้เยี่ยม', type: 'signature' },
      ] },
    ],
  },
  {
    slug: 'hc-hhc-nursing-plan',
    code: 'F-3008',
    category: 'homecare-plan',
    name: 'แผนการพยาบาลผู้ป่วยเพื่อการดูแลสุขภาพที่บ้าน (HHC)',
    summary: 'แบบ HW-02 กองการพยาบาลสาธารณสุข สำนักอนามัย กทม. — วางแผน ให้การพยาบาล 4 ด้าน ส่งต่อ ประเมินผล และนัดเยี่ยมครั้งต่อไป',
    language: 'ไทย',
    estimatedMinutes: 20,
    version: 'v1.0 (HW-02)',
    sections: [
      { title: 'ข้อมูลผู้ป่วย', fields: [
        { label: 'ชื่อ-สกุล', type: 'text', required: true },
        { label: 'เพศ', type: 'select', options: choices(['ชาย', 'หญิง']) },
        { label: 'อายุ (ปี)', type: 'text' },
        { label: 'เลขที่ HHC', type: 'text' },
        { label: 'วันที่', type: 'date', required: true },
        { label: 'ครั้งที่', type: 'text' },
      ] },
      { title: 'การวินิจฉัยโรค', fields: [
        { label: 'โรคที่เจ็บป่วยครั้งนี้', type: 'select', options: choices([
          'Stroke', 'Brain Injury', 'Spinal Cord Injury', 'Hip Fracture', 'Dementia',
          'COPD', 'CHF', 'Cancer', 'CKD / ESRD', 'Cirrhosis', 'Palliative (Z51.5)', 'อื่นๆ',
        ]) },
        { label: 'ระบุตำแหน่ง / รายละเอียดเพิ่มเติม', type: 'text' },
        { label: 'โรคประจำตัว: เบาหวาน (DM)', type: 'checkbox' },
        { label: 'โรคประจำตัว: ความดันโลหิตสูง (HT)', type: 'checkbox' },
        { label: 'โรคประจำตัว: ไขมันในเลือดสูง (DLP)', type: 'checkbox' },
        { label: 'โรคประจำตัวอื่นๆ (ระบุ)', type: 'text' },
      ] },
      { title: 'การวางแผนการพยาบาล', fields: [
        { label: 'ข้อวินิจฉัยทางการพยาบาล', type: 'textarea', required: true },
        { label: 'เป้าหมายระยะสั้น (ระบุระยะเวลา)', type: 'textarea' },
        { label: 'เกณฑ์การประเมินผลระยะสั้น', type: 'textarea' },
        { label: 'เป้าหมายระยะยาว (ระบุระยะเวลา)', type: 'textarea' },
        { label: 'เกณฑ์การประเมินผลระยะยาว', type: 'textarea' },
        { label: 'ข้อควรระวังในการให้บริการ', type: 'textarea' },
      ] },
      { title: 'กิจกรรมการพยาบาลด้านร่างกาย (เลือกได้มากกว่า 1 ข้อ)', fields: [
        { label: 'ดูแลความสะอาดร่างกาย / ผิวหนัง / ช่องปาก', type: 'checkbox' },
        { label: 'ดูแลความสะอาดของเสื้อผ้า', type: 'checkbox' },
        { label: 'ทำแผล', type: 'checkbox' },
        { label: 'ระบุลักษณะ ตำแหน่ง และขนาดของแผล', type: 'text' },
        { label: 'ดูแลให้ออกซิเจน', type: 'checkbox' },
        { label: 'จัดท่านอน - ท่านั่ง พลิกตะแคงตัว', type: 'checkbox' },
        { label: 'กระตุ้นการเคลื่อนไหว', type: 'checkbox' },
      ] },
      { title: 'การพยาบาลด้านจิตวิญญาณ (เลือกได้มากกว่า 1 ข้อ)', fields: [
        { label: 'ให้กำลังใจ ให้เกียรติ เคารพในความเป็นบุคคล', type: 'checkbox' },
        { label: 'สนับสนุนกิจกรรมที่ช่วยให้ได้รับความรักและการให้อภัยจากบุคคลที่รัก', type: 'checkbox' },
        { label: 'สนับสนุนให้บรรลุความหวังครั้งสุดท้าย', type: 'checkbox' },
        { label: 'ทำ Family counselling และ/หรือ Family meeting', type: 'checkbox' },
        { label: 'ทำพินัยกรรมชีวิต (Living will)', type: 'checkbox' },
        { label: 'สนับสนุนสื่อ / อุปกรณ์ทางศาสนา (หนังสือ คัมภีร์ วัตถุมงคล)', type: 'checkbox' },
        { label: 'สนับสนุนการฝึกทักษะทางจิตวิญญาณ (สมาธิบำบัด ละหมาด สวดอ้อนวอน)', type: 'checkbox' },
      ] },
      { title: 'การส่งต่อ', fields: [
        { label: 'ส่งต่อสหวิชาชีพ / หน่วยบริการ', type: 'select', options: choices([
          'ไม่ส่งต่อ', 'นักจิตวิทยา', 'นักกายภาพบำบัด', 'นักสังคมสงเคราะห์',
          'สถานบริการการแพทย์แผนไทยและการแพทย์ทางเลือก',
          'สถานพยาบาลที่มีศักยภาพเหมาะสมตามสิทธิ', 'อื่นๆ',
        ]) },
        { label: 'ระบุหน่วยบริการที่ส่งต่อ', type: 'text' },
      ] },
      { title: 'การประเมินผลและสรุปผลการพยาบาล', fields: [
        { label: 'ผลที่เกิดขึ้นหลังให้กิจกรรมการพยาบาล', type: 'textarea' },
        { label: 'การปรับแผนการพยาบาล', type: 'textarea' },
        { label: 'ภาวะแทรกซ้อน', type: 'select', options: choices(['ไม่มี', 'มี']) },
        { label: 'ภาวะแทรกซ้อน: แผลกดทับ', type: 'checkbox' },
        { label: 'ภาวะแทรกซ้อน: ข้อติด กล้ามเนื้อลีบ', type: 'checkbox' },
        { label: 'ภาวะแทรกซ้อน: สำลักอาหาร', type: 'checkbox' },
        { label: 'ภาวะแทรกซ้อน: ผลข้างเคียงจากยา', type: 'checkbox' },
        { label: 'ภาวะแทรกซ้อน: ติดเชื้อในกระเพาะปัสสาวะ', type: 'checkbox' },
        { label: 'ภาวะแทรกซ้อน: ท้องผูก', type: 'checkbox' },
        { label: 'ภาวะแทรกซ้อน: ผื่นจากการใส่ผ้าอ้อม', type: 'checkbox' },
        { label: 'สรุปอาการหลังให้การพยาบาล', type: 'select', options: choices(['คงเดิม', 'ทุเลา', 'หาย', 'แย่ลง']) },
        { label: 'การเปลี่ยนกลุ่มการดูแล / จำหน่าย', type: 'select', options: choices([
          'คงกลุ่มเดิม', 'เปลี่ยนเป็น HHC', 'เปลี่ยนเป็น LTC', 'Palliative care', 'Home visit',
          'สิ้นสุดการรักษา', 'ย้ายออกนอกพื้นที่', 'เสียชีวิต', 'ไม่สะดวกให้เยี่ยม',
        ]) },
      ] },
      { title: 'การนัดเยี่ยมครั้งต่อไป', fields: [
        { label: 'วัน เดือน ปี ที่นัด', type: 'date' },
        { label: 'วัน เดือน ปี ที่เยี่ยมจริง', type: 'date' },
        { label: 'เรื่องที่ต้องติดตาม', type: 'textarea' },
        { label: 'ความพึงพอใจของผู้ป่วย / ผู้ดูแล', type: 'radio-5' },
        { label: 'ชื่อ-สกุล ผู้ประเมินและให้การพยาบาล', type: 'text', required: true },
        { label: 'ตำแหน่ง', type: 'text' },
        { label: 'ลายเซ็นผู้ประเมิน', type: 'signature' },
      ] },
    ],
  },
  {
    slug: 'hc-ltc-care-plan',
    code: 'F-3009',
    category: 'homecare-plan',
    name: 'สรุปแผนการดูแลรายบุคคลและค่าบริการดูแลระยะยาว (เหมาจ่าย)',
    summary: 'Care Plan ผู้สูงอายุ/ผู้มีภาวะพึ่งพิงตามชุดสิทธิประโยชน์ LTC — ประเมิน 4 มิติ วางแผนดูแล และสรุปค่าบริการต่อคนต่อปี',
    language: 'ไทย',
    estimatedMinutes: 25,
    version: 'v1.0',
    sections: [
      { title: 'ข้อมูลผู้รับบริการ', fields: [
        { label: 'ชื่อ-สกุล', type: 'text', required: true },
        { label: 'เลขประจำตัวประชาชน', type: 'text', required: true },
        { label: 'วันเดือนปีเกิด', type: 'date' },
        { label: 'เบอร์ติดต่อ', type: 'text' },
        { label: 'ที่อยู่', type: 'textarea' },
        { label: 'เลขที่ HHC', type: 'text' },
        { label: 'การวินิจฉัยโรค', type: 'textarea' },
        { label: 'มีภาวะพึ่งพิงกลุ่มที่', type: 'select', required: true, options: choices(['กลุ่ม 1', 'กลุ่ม 2', 'กลุ่ม 3', 'กลุ่ม 4']) },
        { label: 'สิทธิการรักษา', type: 'select', options: choices([
          'หลักประกันสุขภาพแห่งชาติ', 'ผู้พิการ', 'ข้าราชการ', 'รัฐวิสาหกิจ', 'ประกันสังคม', 'อื่นๆ',
        ]) },
      ] },
      { title: 'ผลการประเมินภาวะสุขภาพ — ด้านร่างกาย (Physical)', fields: [
        { label: 'สัญญาณชีพ (V/S)', type: 'select', options: choices(['ปกติ', 'ผิดปกติ']) },
        { label: 'ระบุความผิดปกติของสัญญาณชีพ', type: 'text' },
        { label: 'ความสะอาดของร่างกาย - ผิวหนัง', type: 'select', options: choices(['สะอาด', 'ไม่สะอาด']) },
        { label: 'ความสะอาดและสุขภาพของช่องปากและฟัน', type: 'select', options: choices(['สะอาด', 'ไม่สะอาด', 'มีฟันผุ', 'เหงือกอักเสบ']) },
        { label: 'ความสามารถในการรับประทานอาหาร', type: 'select', options: choices(['กินได้เอง', 'ต้องมีคนป้อน', 'ให้อาหารทางสาย NG tube']) },
        { label: 'ภาวะโภชนาการ / BMI', type: 'select', options: choices(['ปกติ', 'ผอม', 'ท้วม', 'อ้วน']) },
        { label: 'ภาวะซีด', type: 'select', options: choices(['ไม่ซีด', 'ซีด']) },
        { label: 'การถ่ายปัสสาวะ', type: 'select', options: choices([
          'ปกติ', 'กลั้นไม่ได้เป็นบางครั้ง', 'คาสายสวนปัสสาวะ (Foley catheter)', 'Cystostomy',
        ]) },
        { label: 'การถ่ายอุจจาระ', type: 'select', options: choices(['ปกติ', 'ท้องผูก', 'Colostomy']) },
        { label: 'ภาวะแทรกซ้อนที่พบ: แผลกดทับ', type: 'checkbox' },
        { label: 'ภาวะแทรกซ้อนที่พบ: ข้อยึดติด', type: 'checkbox' },
        { label: 'ภาวะแทรกซ้อนที่พบ: ผลข้างเคียงจากยา', type: 'checkbox' },
        { label: 'ภาวะแทรกซ้อนที่พบ: ปากแห้ง ตาแห้ง', type: 'checkbox' },
        { label: 'ภาวะแทรกซ้อนที่พบ: การติดเชื้อของอวัยวะต่างๆ', type: 'checkbox' },
        { label: 'ปัจจัยเสี่ยง: ปัญหาด้านการมองเห็น / การได้ยิน / การทรงตัว / การรับรส', type: 'checkbox' },
        { label: 'ปัจจัยเสี่ยง: แสงสว่างไม่เพียงพอ / การถ่ายเทอากาศไม่ดี', type: 'checkbox' },
        { label: 'ปัจจัยเสี่ยง: ที่พักอาศัยไม่แข็งแรง / สิ่งแวดล้อมไม่ปลอดภัย', type: 'checkbox' },
        { label: 'คะแนน ADL (บาร์เธล เต็ม 20)', type: 'text' },
        { label: 'ผลประเมิน TAI', type: 'text' },
        { label: 'คะแนน PPS (%)', type: 'text' },
        { label: 'Pain score (0-10)', type: 'slider-0-10' },
      ] },
      { title: 'ผลการประเมินภาวะสุขภาพ — ด้านจิตใจ (Psychological)', fields: [
        { label: 'ความเครียด ST-5 (คะแนน)', type: 'text' },
        { label: 'ภาวะซึมเศร้า 2Q / 9Q (คะแนน)', type: 'text' },
        { label: 'ความเสี่ยงฆ่าตัวตาย 8Q (คะแนน)', type: 'text', critical: true },
        { label: 'เครื่องมือประเมินภาวะสมองเสื่อม', type: 'select', options: choices(['MMSE-T2002', 'MoCA', 'AMT', 'Mini-Cog']) },
        { label: 'คะแนนภาวะสมองเสื่อม', type: 'text' },
      ] },
      { title: 'ผลการประเมินภาวะสุขภาพ — ด้านสังคม (Social)', fields: [
        { label: 'การมีญาติ / ผู้ดูแลในครอบครัว', type: 'select', options: choices(['มี', 'ไม่มี']) },
        { label: 'มีอาสาสมัคร / เครือข่ายช่วยดูแล', type: 'checkbox' },
        { label: 'ได้รับเบี้ยยังชีพ / เบี้ยผู้พิการ', type: 'checkbox' },
        { label: 'มีแหล่งช่วยเหลือกรณีฉุกเฉิน', type: 'checkbox' },
        { label: 'มีการส่งเสริมรายได้ / ฝึกอาชีพ', type: 'checkbox' },
        { label: 'มีแหล่งสนับสนุนอุปกรณ์ทางการแพทย์', type: 'checkbox' },
        { label: 'การเข้าถึงระบบส่งต่อ', type: 'select', options: choices(['เข้าถึงระบบส่งต่อได้', 'ไม่สามารถเข้าถึงระบบส่งต่อได้']) },
        { label: 'การเข้าร่วมกิจกรรมในชุมชน', type: 'select', options: choices(['เข้าร่วม', 'ไม่เข้าร่วม']) },
      ] },
      { title: 'ผลการประเมินภาวะสุขภาพ — ด้านจิตวิญญาณ (Spiritual)', fields: [
        { label: 'ศาสนา', type: 'select', options: choices(['พุทธ', 'คริสต์', 'อิสลาม', 'อื่นๆ']) },
        { label: 'การปฏิบัติกิจกรรมทางศาสนา', type: 'select', options: choices([
          'ทำสมาธิ', 'สวดภาวนา / อธิษฐาน', 'ละหมาด', 'สวดอ้อนวอน',
          'อ่านหนังสือธรรมะ', 'อ่านพระคัมภีร์', 'อื่นๆ',
        ]) },
        { label: 'ความต้องการด้านจิตวิญญาณ', type: 'textarea',
          placeholder: 'เช่น การอยู่อย่างสงบ การให้ญาติมีส่วนร่วมในการดูแล การได้รับอภัย' },
      ] },
      { title: 'แผนการดูแล (Care Plan)', fields: [
        { label: 'ข้อวินิจฉัยทางการพยาบาล / ประเด็นปัญหา ความต้องการ', type: 'textarea', required: true },
        { label: 'เป้าหมายการดูแลระยะสั้น', type: 'textarea' },
        { label: 'เป้าหมายการดูแลระยะยาว', type: 'textarea' },
        { label: 'กิจกรรมการดูแลด้านร่างกาย', type: 'textarea' },
        { label: 'กิจกรรมการดูแลด้านจิตใจ', type: 'textarea' },
        { label: 'กิจกรรมการดูแลด้านสังคม', type: 'textarea' },
        { label: 'กิจกรรมการดูแลด้านจิตวิญญาณ', type: 'textarea' },
        { label: 'การส่งต่อ (หน่วยบริการ / สหวิชาชีพ)', type: 'text' },
        { label: 'ติดตามประเมินภาวะสุขภาพ', type: 'select', options: choices(['ทุก 3 เดือน', 'ทุก 6 เดือน']) },
      ] },
      { title: 'สรุปค่าบริการและผู้จัดทำแผน', fields: [
        { label: 'ค่าบริการดูแลระยะยาว (เหมาจ่าย) ต่อคนต่อปี', type: 'text' },
        { label: 'ชื่อผู้จัดการระบบการดูแล (Care Manager)', type: 'text', required: true },
        { label: 'ลายเซ็นผู้จัดทำแผน', type: 'signature' },
        { label: 'วันที่จัดทำแผน', type: 'date' },
      ] },
    ],
  },

  /* — แบบประเมินผู้ป่วยและผู้สูงอายุที่บ้าน (homecare-assessment) — */
  {
    slug: 'as-barthel-adl',
    code: 'F-3010',
    category: 'homecare-assessment',
    name: 'แบบประเมินความสามารถในการดำเนินชีวิตประจำวัน ดัชนีบาร์เธลเอดีแอล (Barthel ADL Index)',
    summary: 'ประเมินกิจวัตรประจำวัน 10 ข้อ เต็ม 20 คะแนน — จำแนกผู้สูงอายุเป็นกลุ่มติดสังคม ติดบ้าน ติดเตียง (กรมอนามัย)',
    language: 'ไทย',
    estimatedMinutes: 10,
    version: 'v1.0',
    sections: [
      { title: 'ข้อมูลผู้รับการประเมิน', fields: [
        { label: 'ชื่อ-สกุล', type: 'text', required: true },
        { label: 'ครั้งที่ประเมิน', type: 'select', options: choices(['ครั้งที่ 1', 'ครั้งที่ 2', 'ครั้งที่ 3', 'ครั้งที่ 4', 'ครั้งที่ 5', 'ครั้งที่ 6']) },
        { label: 'วันที่ประเมิน', type: 'date', required: true },
      ] },
      { title: 'ระดับการปฏิบัติกิจวัตรประจำวัน', fields: [
        { label: '1. การรับประทานอาหารเมื่อเตรียมสำรับไว้ให้ (Feeding)', type: 'select', required: true, options: scored([
          [0, 'ไม่สามารถตักอาหารเข้าปากได้ ต้องมีคนป้อนให้'],
          [1, 'ตักอาหารเองได้แต่ต้องมีคนช่วยเตรียม เช่น ตักเป็นคำเล็กๆ ไว้ล่วงหน้า'],
          [2, 'ตักอาหารและช่วยตัวเองได้ปกติ'],
        ]) },
        { label: '2. การล้างหน้า หวีผม แปรงฟัน โกนหนวด ใน 24-48 ชั่วโมงที่ผ่านมา (Grooming)', type: 'select', required: true, options: scored([
          [0, 'ต้องการความช่วยเหลือ'],
          [1, 'ทำเองได้ (รวมทั้งที่ทำได้เองถ้าเตรียมอุปกรณ์ไว้ให้)'],
        ]) },
        { label: '3. การลุกนั่งจากที่นอนหรือเตียงไปยังเก้าอี้ (Transfer)', type: 'select', required: true, options: scored([
          [0, 'ไม่สามารถนั่งได้ หรือต้องใช้คนสองคนช่วยกันยกขึ้น'],
          [1, 'ต้องการความช่วยเหลืออย่างมากจึงจะนั่งได้ (คนที่แข็งแรงหรือมีทักษะ 1 คน)'],
          [2, 'ต้องการความช่วยเหลือบ้าง เช่น บอกให้ทำตาม พยุงเล็กน้อย หรือดูแลเพื่อความปลอดภัย'],
          [3, 'ทำได้เอง'],
        ]) },
        { label: '4. การใช้ห้องน้ำ (Toilet use)', type: 'select', required: true, options: scored([
          [0, 'ช่วยตัวเองไม่ได้'],
          [1, 'ทำเองได้บ้าง อย่างน้อยทำความสะอาดตัวเองได้หลังเสร็จธุระ แต่ต้องการความช่วยเหลือบางอย่าง'],
          [2, 'ช่วยตัวเองได้ดี ขึ้นนั่งและลงจากโถส้วมเองได้ ทำความสะอาดเองได้'],
        ]) },
        { label: '5. การเคลื่อนที่ภายในห้องหรือบ้าน (Mobility)', type: 'select', required: true, options: scored([
          [0, 'เคลื่อนที่ไปไหนไม่ได้'],
          [1, 'ต้องใช้รถเข็นช่วยตัวเองให้เคลื่อนที่ได้เอง และเข้าออกมุมห้องหรือประตูได้'],
          [2, 'เดินหรือเคลื่อนที่โดยมีคนช่วยพยุง บอกให้ทำตาม หรือต้องดูแลเพื่อความปลอดภัย'],
          [3, 'เดินหรือเคลื่อนที่ได้เอง'],
        ]) },
        { label: '6. การสวมใส่เสื้อผ้า (Dressing)', type: 'select', required: true, options: scored([
          [0, 'ต้องมีคนสวมใส่ให้ ช่วยตัวเองแทบไม่ได้หรือได้น้อย'],
          [1, 'ช่วยตัวเองได้ประมาณร้อยละ 50 ที่เหลือต้องมีคนช่วย'],
          [2, 'ช่วยตัวเองได้ดี รวมทั้งติดกระดุม รูดซิป หรือใช้เสื้อผ้าที่ดัดแปลงให้เหมาะสม'],
        ]) },
        { label: '7. การขึ้นลงบันได 1 ชั้น (Stairs)', type: 'select', required: true, options: scored([
          [0, 'ไม่สามารถทำได้'],
          [1, 'ต้องการคนช่วย'],
          [2, 'ขึ้นลงเองได้ (ถ้าใช้เครื่องช่วยเดิน เช่น Walker ต้องเอาขึ้นลงได้ด้วย)'],
        ]) },
        { label: '8. การอาบน้ำ (Bathing)', type: 'select', required: true, options: scored([
          [0, 'ต้องมีคนช่วยหรือทำให้'],
          [1, 'อาบน้ำเองได้'],
        ]) },
        { label: '9. การกลั้นอุจจาระใน 1 สัปดาห์ที่ผ่านมา (Bowels)', type: 'select', required: true, options: scored([
          [0, 'กลั้นไม่ได้ หรือต้องการการสวนอุจจาระอยู่เสมอ'],
          [1, 'กลั้นไม่ได้บางครั้ง (น้อยกว่า 1 ครั้งต่อสัปดาห์)'],
          [2, 'กลั้นได้เป็นปกติ'],
        ]) },
        { label: '10. การกลั้นปัสสาวะใน 1 สัปดาห์ที่ผ่านมา (Bladder)', type: 'select', required: true, options: scored([
          [0, 'กลั้นไม่ได้ หรือใส่สายสวนปัสสาวะแต่ดูแลเองไม่ได้'],
          [1, 'กลั้นไม่ได้บางครั้ง (น้อยกว่า 1 ครั้งต่อสัปดาห์)'],
          [2, 'กลั้นได้เป็นปกติ'],
        ]) },
      ] },
      { title: 'สรุปผลการประเมิน', fields: [
        { label: 'คะแนนรวม (เต็ม 20 คะแนน)', type: 'text', required: true },
        { label: 'การจำแนกกลุ่มผู้สูงอายุ', type: 'select', required: true, options: choices([
          'ผลรวม 12 คะแนนขึ้นไป — กลุ่มติดสังคม',
          'ผลรวม 5-11 คะแนน — กลุ่มติดบ้าน',
          'ผลรวม 0-4 คะแนน — กลุ่มติดเตียง',
        ]) },
        { label: 'ชื่อผู้ประเมิน', type: 'text' },
        { label: 'ลายเซ็นผู้ประเมิน', type: 'signature' },
      ] },
    ],
  },
  {
    slug: 'as-braden-scale',
    code: 'F-3011',
    category: 'homecare-assessment',
    name: 'แบบประเมินความเสี่ยงการเกิดแผลกดทับ (Braden Scale)',
    summary: 'ประเมิน 6 ปัจจัยเสี่ยงแผลกดทับ รวม 6-23 คะแนน — ยิ่งคะแนนน้อยยิ่งเสี่ยงสูง ใช้ทุกครั้งที่เยี่ยมผู้ป่วยติดเตียง',
    language: 'ไทย',
    estimatedMinutes: 8,
    version: 'v1.0',
    sections: [
      { title: 'ข้อมูลผู้ป่วย', fields: [
        { label: 'ชื่อผู้ป่วย', type: 'text', required: true },
        { label: 'วันที่ประเมิน', type: 'date', required: true },
        { label: 'ครั้งที่ประเมิน', type: 'text' },
      ] },
      { title: 'ปัจจัยที่ประเมิน', fields: [
        { label: 'Sensory Perception — ระดับความรู้สึกตัว (การรับรู้)', type: 'select', required: true, options: scored([
          [4, 'ปกติ รู้สึกตัวดี ทำตามคำบอก บอกถึงความเจ็บปวดและความต้องการเปลี่ยนท่าได้'],
          [3, 'หลับเป็นส่วนใหญ่ เปลี่ยนท่าเมื่อมีคนบอก'],
          [2, 'ตอบสนองต่อความเจ็บปวด แต่บอกความไม่สุขสบายไม่ได้ แสดงอาการกระสับกระส่ายหรือร้องคราง'],
          [1, 'ไม่ตอบสนองต่อความเจ็บปวดแม้แต่น้อย'],
        ]) },
        { label: 'Moisture — ความเปียกชื้นของผิวหนัง', type: 'select', required: true, options: scored([
          [4, 'ปกติ ไม่เปียกชื้น กลั้นอุจจาระหรือปัสสาวะได้ เปลี่ยนผ้าตามปกติ'],
          [3, 'เปียกชื้นขึ้นบ้างจากเหงื่อ ปัสสาวะหรืออุจจาระ ต้องเปลี่ยนผ้าเพิ่มวันละ 1-2 ครั้ง'],
          [2, 'เปียกชื้นบ่อย ต้องเปลี่ยนผ้าเพิ่มจากปกติวันละ 3-5 ครั้ง'],
          [1, 'เปียกชื้นตลอดเวลา ต้องเปลี่ยนผ้าทุกครั้งที่พลิกตัว'],
        ]) },
        { label: 'Activity — การทำกิจกรรม', type: 'select', required: true, options: scored([
          [4, 'เดินได้เองปกติ'],
          [3, 'เดินได้ระยะใกล้ๆ ต้องช่วยพยุง'],
          [2, 'ส่วนใหญ่อยู่กับเตียงหรือรถนั่ง ต้องใช้รถเข็น/รถนอน ทรงตัวยืนเองไม่ได้'],
          [1, 'อยู่ในเตียงตลอด 24 ชั่วโมง'],
        ]) },
        { label: 'Mobility — การเคลื่อนไหว', type: 'select', required: true, options: scored([
          [4, 'เคลื่อนไหวและเปลี่ยนท่าเองได้ดีเป็นปกติ'],
          [3, 'เคลื่อนไหวได้ แต่เปลี่ยนท่าเองได้น้อย'],
          [2, 'เคลื่อนไหวและเปลี่ยนท่าเองได้น้อย ต้องมีคนช่วย'],
          [1, 'ไม่สามารถเคลื่อนไหวและเปลี่ยนท่าเองได้'],
        ]) },
        { label: 'Nutrition — ภาวะโภชนาการ', type: 'select', required: true, options: scored([
          [4, 'รับประทานอาหารได้ตามปกติทุกมื้อในปริมาณที่ควรได้รับต่อวัน'],
          [3, 'รับประทานได้มากกว่าครึ่งของปริมาณที่ควรได้รับ หรือได้รับทาง NG feeding / TPN ตามกำหนด'],
          [2, 'รับประทานได้ไม่เกินครึ่งของปริมาณที่ควรได้รับ หรือได้รับทาง NG feeding / TPN น้อยกว่ากำหนด'],
          [1, 'รับประทานอาหารหรือดื่มน้ำไม่ได้ หรือได้น้อยกว่า 1 ใน 3 ของปริมาณที่ควรได้รับ หรือ NPO / ได้รับ IV fluid นานกว่า 5 วัน'],
        ]) },
        { label: 'Friction and Shear — การเสียดสีและการดึงรั้ง', type: 'select', required: true, options: scored([
          [3, 'ยกหรือเลื่อนตัวได้เอง ไม่ต้องการความช่วยเหลือ'],
          [2, 'พยุงตัวได้บ้าง แต่ต้องการความช่วยเหลือในการยกหรือเลื่อนตัว ท่าศีรษะสูงจะเลื่อนไหลเล็กน้อย'],
          [1, 'ต้องการความช่วยเหลือในการยกหรือเลื่อนตัวมาก มักเกร็ง ข้อติด ท่าศีรษะสูงจะเลื่อนไหล'],
        ]) },
      ] },
      { title: 'สรุปผลการประเมิน', fields: [
        { label: 'คะแนนรวม (6-23 คะแนน)', type: 'text', required: true },
        { label: 'การแปลผลความเสี่ยง', type: 'select', required: true, critical: true, options: choices([
          '19-23 คะแนน — ไม่มีความเสี่ยง',
          '15-18 คะแนน — เสี่ยงเล็กน้อย',
          '13-14 คะแนน — เสี่ยงปานกลาง',
          '10-12 คะแนน — เสี่ยงสูง',
          '9 คะแนนหรือน้อยกว่า — เสี่ยงสูงมาก',
        ]) },
        { label: 'ชื่อผู้บันทึก', type: 'text' },
        { label: 'ลายเซ็นผู้บันทึก', type: 'signature' },
      ] },
    ],
  },
  {
    slug: 'as-dementia-screen',
    code: 'F-3012',
    category: 'homecare-assessment',
    name: 'แบบประเมินภาวะสมองเสื่อม',
    summary: 'คัดกรองความจำเบื้องต้น 2 ข้อ (คำนวณ 20-3 และจำของ 3 สิ่ง) เต็ม 2 คะแนน — ผิด 2 ข้อ ส่งต่อพยาบาลประเมินต่อ',
    language: 'ไทย',
    estimatedMinutes: 5,
    version: 'v1.0',
    sections: [
      { title: 'ข้อมูลผู้รับการประเมิน', fields: [
        { label: 'ชื่อ-สกุล', type: 'text', required: true },
        { label: 'วันที่ประเมิน', type: 'date', required: true },
        { label: 'ครั้งที่ประเมิน', type: 'select', options: choices(['ครั้งที่ 1', 'ครั้งที่ 2', 'ครั้งที่ 3', 'ครั้งที่ 4', 'ครั้งที่ 5', 'ครั้งที่ 6']) },
      ] },
      { title: 'คำถาม (ให้ผู้สูงอายุดูภาพ รถยนต์ เสือ เก้าอี้ และทวนชื่อ 1 ครั้งก่อนเริ่ม)', fields: [
        { label: '1. ให้ผู้สูงอายุคำนวณ 20-3 ไปเรื่อยๆ 3 ครั้ง (ตอบภายใน 1 นาที)', type: 'select', required: true, options: scored([
          [0, 'ตอบผิด'],
          [1, 'ตอบถูก'],
        ]) },
        { label: '2. ถามถึงของ 3 อย่างที่ให้จำไว้ (รถยนต์ เสือ เก้าอี้)', type: 'select', required: true, options: scored([
          [0, 'ตอบผิด'],
          [1, 'ตอบถูก'],
        ]) },
      ] },
      { title: 'สรุปผลการประเมิน', fields: [
        { label: 'รวมคะแนน (เต็ม 2 คะแนน)', type: 'text', required: true },
        { label: 'การแปลผล', type: 'select', required: true, critical: true, options: choices([
          'ปกติ — ตอบถูกหมด (2 คะแนน)',
          'ไม่ปกติ — ตอบผิด อาจมีปัญหาความจำ ให้ส่งต่อพยาบาลเพื่อประเมินต่อไป',
        ]) },
        { label: 'ชื่อผู้ประเมิน', type: 'text' },
      ] },
    ],
  },
  {
    slug: 'as-2q-st5',
    code: 'F-3013',
    category: 'homecare-assessment',
    name: 'แบบประเมินภาวะซึมเศร้า 2Q และความเครียด ST-5',
    summary: 'คัดกรองซึมเศร้า 2 คำถาม (2Q) และประเมินความเครียด 5 ข้อ (ST-5) — ตอบ "มี" ข้อใดข้อหนึ่งให้ประเมินต่อด้วย 9Q',
    language: 'ไทย',
    estimatedMinutes: 6,
    version: 'v1.0 (สปสช. เขต 13 กรุงเทพมหานคร)',
    sections: [
      { title: 'ข้อมูลผู้รับการประเมิน', fields: [
        { label: 'ชื่อ-สกุล', type: 'text', required: true },
        { label: 'วันที่ประเมิน', type: 'date', required: true },
        { label: 'ชื่อผู้ประเมิน', type: 'text' },
      ] },
      { title: 'แบบคัดกรองโรคซึมเศร้าด้วย 2 คำถาม (2Q)', fields: [
        { label: '1. ใน 2 สัปดาห์ที่ผ่านมารวมวันนี้ ท่านรู้สึกหดหู่ เศร้า หรือท้อแท้สิ้นหวังหรือไม่', type: 'select', required: true, options: choices(['ไม่มี', 'มี']) },
        { label: '2. ใน 2 สัปดาห์ที่ผ่านมารวมวันนี้ ท่านรู้สึกเบื่อ ทำอะไรก็ไม่เพลิดเพลินหรือไม่', type: 'select', required: true, options: choices(['ไม่มี', 'มี']) },
        { label: 'การแปลผล 2Q', type: 'select', required: true, critical: true, options: choices([
          'ปกติ — ตอบ "ไม่มี" ทั้ง 2 ข้อ ให้แจ้งผลและแนะนำความรู้เรื่องโรคซึมเศร้า',
          'มีความเสี่ยง — ตอบ "มี" ข้อใดข้อหนึ่งหรือทั้ง 2 ข้อ ให้ประเมินต่อด้วยแบบประเมิน 9 คำถาม (9Q)',
        ]) },
      ] },
      { title: 'แบบประเมินความเครียด (ST-5) — อาการ/ความรู้สึกใน 2-4 สัปดาห์ที่ผ่านมา', fields: [
        { label: '1. มีปัญหาการนอน นอนไม่หลับหรือนอนมาก', type: 'select', required: true, options: scored([
          [0, 'เป็นน้อยมากหรือแทบไม่มี'], [1, 'เป็นบางครั้ง'], [2, 'เป็นบ่อยครั้ง'], [3, 'เป็นประจำ'],
        ]) },
        { label: '2. มีสมาธิน้อยลง', type: 'select', required: true, options: scored([
          [0, 'เป็นน้อยมากหรือแทบไม่มี'], [1, 'เป็นบางครั้ง'], [2, 'เป็นบ่อยครั้ง'], [3, 'เป็นประจำ'],
        ]) },
        { label: '3. หงุดหงิด / กระวนกระวาย / ว้าวุ่นใจ', type: 'select', required: true, options: scored([
          [0, 'เป็นน้อยมากหรือแทบไม่มี'], [1, 'เป็นบางครั้ง'], [2, 'เป็นบ่อยครั้ง'], [3, 'เป็นประจำ'],
        ]) },
        { label: '4. รู้สึกเบื่อ เซ็ง', type: 'select', required: true, options: scored([
          [0, 'เป็นน้อยมากหรือแทบไม่มี'], [1, 'เป็นบางครั้ง'], [2, 'เป็นบ่อยครั้ง'], [3, 'เป็นประจำ'],
        ]) },
        { label: '5. ไม่อยากพบปะผู้คน', type: 'select', required: true, options: scored([
          [0, 'เป็นน้อยมากหรือแทบไม่มี'], [1, 'เป็นบางครั้ง'], [2, 'เป็นบ่อยครั้ง'], [3, 'เป็นประจำ'],
        ]) },
      ] },
      { title: 'สรุปผล ST-5', fields: [
        { label: 'คะแนนรวม ST-5 (เต็ม 15 คะแนน)', type: 'text', required: true },
        { label: 'การแปลผลความเครียด', type: 'select', required: true, options: choices([
          '0-4 คะแนน — ความเครียดน้อย',
          '5-7 คะแนน — ความเครียดปานกลาง',
          '8-9 คะแนน — ความเครียดมาก',
          '10-15 คะแนน — ความเครียดมากที่สุด',
        ]) },
      ] },
    ],
  },
  {
    slug: 'as-tai',
    code: 'F-3014',
    category: 'homecare-assessment',
    name: 'แบบประเมินสภาวะความเสื่อมถอยของผู้สูงอายุ (TAI)',
    summary: 'Typology of Aged with Illustration — จำแนกผู้สูงอายุเป็นกลุ่ม B (Border) / C (Confused) / I (Immobile) ตามการกิน ขับถ่าย และการเคลื่อนไหว',
    language: 'ไทย',
    estimatedMinutes: 7,
    version: 'v1.0',
    sections: [
      { title: 'ข้อมูลผู้รับการประเมิน', fields: [
        { label: 'ชื่อ-สกุล', type: 'text', required: true },
        { label: 'วันที่ประเมิน', type: 'date', required: true },
        { label: 'เดือนที่ประเมิน (รอบปีงบประมาณ)', type: 'select', options: choices([
          'ต.ค.', 'พ.ย.', 'ธ.ค.', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.',
        ]) },
      ] },
      { title: 'ความสามารถของผู้สูงอายุ', fields: [
        { label: 'การกินอาหาร', type: 'select', required: true, options: choices([
          'ทำได้ — กินเองได้ตามปกติ', 'ทำไม่ได้ — ต้องมีคนป้อน', 'ทำไม่ได้ — มีปัญหาการกลืน',
        ]) },
        { label: 'การขับถ่าย / การใช้ห้องน้ำ', type: 'select', required: true, options: choices([
          'ทำได้ — ใช้ห้องน้ำเองได้', 'ทำไม่ได้ — ต้องการการดูแลด้านการขับถ่าย',
        ]) },
        { label: 'การเคลื่อนไหว', type: 'select', required: true, options: choices([
          'เดินได้เองตามปกติ', 'ขึ้นบันไดไม่ได้ แต่ยังเดินได้',
          'ต้องใช้ไม้เท้า / Walker', 'ติดเตียง เดินไม่ได้',
        ]) },
        { label: 'ภาวะสมองเสื่อม', type: 'select', required: true, options: choices(['ไม่มี', 'มี']) },
      ] },
      { title: 'สรุปประเภท TAI', fields: [
        { label: 'ประเภท TAI', type: 'select', required: true, options: choices([
          'B5 — สมบูรณ์แข็งแรง ทำได้ทุกอย่าง',
          'B4 — มีปัญหาข้อเข่าเสื่อม ขึ้นบันไดไม่ได้ แต่ยังเดินได้',
          'B3 — ต้องเดินโดยใช้ไม้เท้า / Walker และมีปัญหาการขับถ่าย',
          'C3 — มีภาวะสมองเสื่อม แต่ไม่มีปัญหาการขับถ่ายและการกิน',
          'C2 — มีภาวะสมองเสื่อม สูญเสียการขับถ่ายและการกิน',
          'I3 — ติดเตียง เดินไม่ได้ แต่กินได้ตามปกติ ต้องการการดูแลด้านการขับถ่าย',
          'I2 — ติดเตียง เดินไม่ได้ ต้องมีคนป้อน แต่กลืนได้',
          'I1 — ติดเตียง เดินไม่ได้ และมีปัญหาการกลืน',
        ]) },
        { label: 'กลุ่มความสามารถ', type: 'select', required: true, options: choices([
          'B (Border) — กลุ่มปกติถึงกลุ่มเสี่ยง',
          'C (Confused) — กลุ่มสับสน มีภาวะสมองเสื่อม',
          'I (Immobile) — กลุ่มช่วยเหลือตัวเองไม่ได้',
        ]) },
        { label: 'ชื่อผู้ประเมิน', type: 'text' },
      ] },
    ],
  },
];

export const FORMS = [...BASE_FORMS, ...HOME_VISIT_FORMS, ...EDOCUMENT_MIGRATED_FORMS];

export const getCategory = (key) =>
  FORM_CATEGORIES.find((c) => c.key === key);

export const getFormBySlug = (slug) =>
  FORMS.find((f) => f.slug === slug);

export const getFormsByCategory = (categoryKey) =>
  FORMS.filter((f) => f.category === categoryKey);

/* Per-tone palette for category cards + form chips. Maps to existing
   ColorfulBadge tokens so brand-swap stays consistent across the app. */
export const CATEGORY_PALETTE = {
  brand:  { surface: 'var(--surface-brandPrimary-quaternary)', text: 'var(--text-brandPrimary-default)' },
  blue:   { surface: 'var(--surface-colorfulbadge-blue)',      text: 'var(--text-colorfulbadge-blue)'   },
  orange: { surface: 'var(--surface-colorfulbadge-orange)',    text: 'var(--text-colorfulbadge-orange)' },
  teal:   { surface: 'var(--surface-colorfulbadge-teal)',      text: 'var(--text-colorfulbadge-teal)'   },
  green:  { surface: 'var(--surface-colorfulbadge-green)',     text: 'var(--text-colorfulbadge-green)'  },
  indigo: { surface: 'var(--surface-colorfulbadge-indigo)',    text: 'var(--text-colorfulbadge-indigo)' },
  purple: { surface: 'var(--surface-colorfulbadge-purple)',    text: 'var(--text-colorfulbadge-purple)' },
};

/** ColorfulBadge `style` per category on PHCIS Forms library cards. */
export const FORM_CATALOG_CATEGORY_BADGE = {
  consent: 'blue',
  assessment: 'teal',
  report: 'orange',
  survey: 'purple',
  homevisit: 'green',
  'homecare-plan': 'indigo',
  'homecare-assessment': 'magenta',
};

/** Short numeric label for magenta version pill (from `version` string). */
export function catalogVersionPill(version) {
  if (!version || typeof version !== 'string') return '';
  const m = version.match(/v?\s*([\d.]+)/i);
  return m ? m[1] : version.slice(0, 10);
}
