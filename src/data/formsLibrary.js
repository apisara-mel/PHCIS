/* Mock data for the "คลังแบบฟอร์ม" (Forms Library) menu.
   Groups forms by category so the catalog page can render section-by-
   section, and each form ships a static field preview so the detail
   page can show clinicians what they will see on the mobile-side scan
   before they print or share the QR. */

export const FORM_CATEGORIES = [
  {
    key: 'consent',
    label: 'แบบฟอร์มยินยอม',
    description: 'หนังสือยินยอมรับการรักษาและหัตถการทางการแพทย์',
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
];

/* Each form: slug (URL key), code (รหัสแสดงบนการ์ดคลัง เช่น F-1001), category
   (matches CATEGORIES.key), name, summary, language, estimatedMinutes,
   version, sections.
   `sections[].fields[]` is a static preview list, NOT a live form
   schema — the mobile QR target renders the same preview. */
export const FORMS = [
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
};

/** Cover art on catalog cards — `public/illustration/form-cover0N.svg` (227×113). */
export const FORM_COVER_FOR_CATALOG = {
  consent: '/illustration/form-cover01.svg',
  assessment: '/illustration/form-cover04.svg',
  report: '/illustration/form-cover05.svg',
  survey: '/illustration/form-cover03.svg',
};

/** ColorfulBadge `style` per category on PHCIS Forms library cards. */
export const FORM_CATALOG_CATEGORY_BADGE = {
  consent: 'blue',
  assessment: 'teal',
  report: 'orange',
  survey: 'purple',
};

/** Short numeric label for magenta version pill (from `version` string). */
export function catalogVersionPill(version) {
  if (!version || typeof version !== 'string') return '';
  const m = version.match(/v?\s*([\d.]+)/i);
  return m ? m[1] : version.slice(0, 10);
}
