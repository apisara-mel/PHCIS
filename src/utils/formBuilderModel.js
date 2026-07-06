/* PHCIS | Assess-control — Form Builder domain model (Figma 26:1747).
   Palette kinds, block factories, normalisation, and DnD payload keys. */

export const DND_KIND = 'application/x-mih-form-kind';
export const DND_BLOCK_ID = 'application/x-mih-block-id';
export const DRAFT_STORAGE_KEY = 'mih-doc-template-draft';

export const DEFAULT_FORM_NAME =
  'ใบยินยอมรับการรักษาทั่วไป (General Consent for Treatment)';

export const PREVIEW_CONSENT_BODY =
  'ข้าพเจ้าได้รับคำอธิบายถึงแผนการรักษา ประโยชน์ และความเสี่ยงจากแพทย์ผู้ดูแลครบถ้วนแล้ว และยินยอมเข้ารับการรักษาตามที่แพทย์หรือเจ้าหน้าที่แนะนำ';

export const FORM_BUILDER_PALETTE = [
  {
    group: 'ข้อความ / อินพุด',
    items: [
      { kind: 'text', icon: 'title', label: 'ช่องข้อความ', sublabel: 'Text Input' },
      { kind: 'textarea', icon: 'notes', label: 'ข้อความยาว', sublabel: 'Textarea' },
      { kind: 'number', icon: 'tag', label: 'ตัวเลข', sublabel: 'Number' },
      { kind: 'datetime', icon: 'calendar_today', label: 'วันที่ / เวลา', sublabel: 'Date & Time' },
    ],
  },
  {
    group: 'ตัวเลือก',
    items: [
      { kind: 'radio', icon: 'radio_button_checked', label: 'เลือกหนึ่งตัวเลือก', sublabel: 'Radio' },
      { kind: 'checkbox', icon: 'check_box', label: 'เลือกหลายตัวเลือก', sublabel: 'Checkbox' },
      { kind: 'dropdown', icon: 'arrow_drop_down_circle', label: 'Dropdown', sublabel: 'Select' },
      { kind: 'rating', icon: 'star', label: 'คะแนน / Rating', sublabel: 'Scale 1-5 / 1-10' },
    ],
  },
  {
    group: 'ไฟล์ / สื่อ',
    items: [
      { kind: 'file', icon: 'upload_file', label: 'อัปโหลดไฟล์', sublabel: 'File upload' },
      { kind: 'signature', icon: 'draw', label: 'ลายเซ็น', sublabel: 'Signature' },
    ],
  },
  {
    group: 'โครงสร้าง',
    items: [
      { kind: 'divider', icon: 'horizontal_rule', label: 'เส้นคั่น', sublabel: 'Divider' },
      { kind: 'section', icon: 'view_agenda', label: 'กลุ่มคำถาม', sublabel: 'Section / Group' },
    ],
  },
];

const uid = (prefix = 'id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const makeField = ({ label, placeholder = '', required = false, inputType = 'text' } = {}) => ({
  id: uid('field'),
  label: label || 'ฟิลด์',
  placeholder,
  required,
  inputType,
});

const makeOption = (label) => ({ id: uid('opt'), label });

const KIND_TEMPLATES = {
  text: () => ({
    kind: 'text',
    badge: 'ข้อความ',
    type: 'fields',
    title: 'คำถาม',
    required: false,
    fields: [makeField({ label: 'คำตอบ', placeholder: 'กรอกข้อความ', inputType: 'text' })],
  }),
  textarea: () => ({
    kind: 'textarea',
    badge: 'ข้อความ',
    type: 'fields',
    title: 'คำถาม',
    required: false,
    fields: [makeField({ label: 'คำตอบ', placeholder: 'กรอกข้อความ', inputType: 'textarea' })],
  }),
  number: () => ({
    kind: 'number',
    badge: 'ข้อความ',
    type: 'fields',
    title: 'ตัวเลข',
    required: false,
    fields: [makeField({ label: 'จำนวน', placeholder: '0', inputType: 'number' })],
  }),
  datetime: () => ({
    kind: 'datetime',
    badge: 'ข้อความ',
    type: 'fields',
    title: 'วันที่ / เวลา',
    required: false,
    fields: [makeField({ label: 'วันที่', placeholder: 'DD/MM/YYYY', inputType: 'date' })],
  }),
  radio: () => ({
    kind: 'radio',
    badge: 'เลือกหนึ่งตัวเลือก',
    type: 'radio',
    title: 'คำถาม',
    required: false,
    options: [makeOption('ตัวเลือก 1'), makeOption('ตัวเลือก 2')],
  }),
  checkbox: () => ({
    kind: 'checkbox',
    badge: 'เลือกหลายตัวเลือก',
    type: 'checkbox',
    title: 'คำถาม',
    required: false,
    options: [makeOption('ตัวเลือก 1')],
    showAddOption: true,
  }),
  dropdown: () => ({
    kind: 'dropdown',
    badge: 'Dropdown',
    type: 'dropdown',
    title: 'คำถาม',
    required: false,
    options: [makeOption('ตัวเลือก 1'), makeOption('ตัวเลือก 2')],
  }),
  rating: () => ({
    kind: 'rating',
    badge: 'คะแนน / Rating',
    type: 'rating',
    title: 'ให้คะแนน',
    required: false,
    max: 5,
  }),
  file: () => ({
    kind: 'file',
    badge: 'ไฟล์',
    type: 'file',
    title: 'อัปโหลดไฟล์',
    required: false,
  }),
  signature: () => ({
    kind: 'signature',
    badge: 'ลายเซ็น',
    type: 'signature',
    title: 'ลายเซ็น',
    required: true,
  }),
  divider: () => ({
    kind: 'divider',
    badge: 'โครงสร้าง',
    type: 'divider',
    title: '',
    required: false,
  }),
  section: () => ({
    kind: 'section',
    badge: 'ข้อความ',
    type: 'fields',
    title: 'กลุ่มคำถาม',
    required: false,
    fields: [
      makeField({ label: 'ชื่อ', placeholder: 'กรอกชื่อ', inputType: 'text' }),
      makeField({ label: 'นามสกุล', placeholder: 'กรอกนามสกุล', inputType: 'text' }),
    ],
  }),
};

/** Seed blocks matching the Figma 26:1747 demo form. */
export const createInitialBlocks = () => [
  {
    id: uid('block'),
    kind: 'section',
    badge: 'ข้อความ',
    type: 'fields',
    title: 'ข้อมูลผู้ป่วย',
    required: true,
    fields: [
      makeField({ label: 'ชื่อตามบัตรประชาชน', placeholder: 'เช่น นายสมชาย ใจดี', required: true }),
      makeField({ label: 'เลขบัตรประชาชน', placeholder: 'x-xxx-xxxxx-xx', required: true }),
      makeField({ label: 'เลข HN', placeholder: 'xxxxxx', required: true }),
    ],
  },
  {
    id: uid('block'),
    kind: 'radio',
    badge: 'เลือกหนึ่งตัวเลือก',
    type: 'radio',
    title: 'ประเภทการรักษา',
    required: true,
    options: [
      makeOption('ผู้ป่วยนอก (OPD)'),
      makeOption('ผู้ป่วยใน (IPD)'),
      makeOption('ฉุกเฉิน (Emergency)'),
    ],
  },
  {
    id: uid('block'),
    kind: 'checkbox',
    badge: 'เลือกหลายตัวเลือก',
    type: 'checkbox',
    title: 'โรคประจำตัว / ประวัติแพ้ยา',
    required: true,
    options: [
      makeOption('โรคเบาหวาน'),
      makeOption('โรคความดันโลหิตสูง'),
      makeOption('โรคหัวใจ'),
      makeOption('แพ้ยา'),
    ],
  },
  {
    id: uid('block'),
    kind: 'checkbox',
    badge: 'เลือกหลายตัวเลือก',
    type: 'checkbox',
    title: 'ยินยอม',
    required: true,
    options: [makeOption('ข้าพเจ้าอ่านและเข้าใจข้อมูลข้างต้นครบถ้วน และให้ความยินยอมรับการรักษา')],
    showAddOption: true,
  },
  {
    id: uid('block'),
    kind: 'signature',
    badge: 'ลายเซ็น',
    type: 'signature',
    title: 'ลายเซ็นผู้ป่วย / ผู้ปกครอง',
    required: true,
  },
];

export const createBlockFromKind = (kind) => {
  const factory = KIND_TEMPLATES[kind];
  if (!factory) return null;
  return { id: uid('block'), ...factory() };
};

export const cloneBlock = (block) => {
  const next = {
    ...block,
    id: uid('block'),
    fields: block.fields?.map((f) => ({ ...f, id: uid('field') })),
    options: block.options?.map((o) => (typeof o === 'string' ? makeOption(o) : { ...o, id: uid('opt') })),
  };
  return next;
};

export const parseDropPayload = (dataTransfer) => {
  const kind = dataTransfer.getData(DND_KIND);
  if (kind) return { source: 'palette', kind };
  const blockId = dataTransfer.getData(DND_BLOCK_ID);
  if (blockId) return { source: 'reorder', blockId };
  return null;
};

export const formatLastSaved = (date) => {
  if (!date) return 'ยังไม่ได้บันทึก';
  const diff = Date.now() - date.getTime();
  if (diff < 15000) return 'เพิ่งบันทึก';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ไม่กี่วินาทีที่แล้ว';
  if (mins === 1) return '1 นาทีที่แล้ว';
  return `${mins} นาทีที่แล้ว`;
};
