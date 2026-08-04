/* PHCIS | Consent — แบบฟอร์มความยินยอม (Figma 291:113045 / flow 277:150901).
   Consent-form TEMPLATE registry: summary cards · tabs · status meta · rows.
   Local mock; UI copy is Thai. */

/* แต่ละแท็บต้องมี >32 รายการ เพื่อ demo pagination ที่ PAGE_SIZE 20
   (หน้า 1 = 20 · หน้า 2 = ส่วนที่เหลือ) */
const PER_TAB_COUNT = 36;
const MOCK_FORM_COUNT = PER_TAB_COUNT * 4; // review + published + unpublished + draft

export const CONSENT_FORM_SUMMARY = [
  { key: 'total',       icon: 'assignment',  color: 'info',       value: String(MOCK_FORM_COUNT), label: 'แบบฟอร์มทั้งหมด', indicator: 'เพิ่มขึ้น 3 จากเดือนที่แล้ว' },
  { key: 'review',      icon: 'fact_check',   color: 'info',       value: String(PER_TAB_COUNT),   label: 'รอตรวจสอบ',      indicator: 'Pending review', indicatorIcon: null },
  { key: 'published',   icon: 'check_circle', color: 'positive',   value: String(PER_TAB_COUNT),  label: 'เผยแพร่',        indicator: `${Math.round((PER_TAB_COUNT / MOCK_FORM_COUNT) * 100)}% ของทั้งหมด`,  indicatorIcon: null },
  { key: 'unpublished', icon: 'unpublished',  color: 'inprogress', value: String(PER_TAB_COUNT),   label: 'ไม่เผยแพร่',     indicator: `${Math.round((PER_TAB_COUNT / MOCK_FORM_COUNT) * 100)}% ของทั้งหมด`,  indicatorIcon: null },
  { key: 'draft',       icon: 'draft',        value: String(PER_TAB_COUNT),  label: 'ที่ร่างไว้',  indicator: `${Math.round((PER_TAB_COUNT / MOCK_FORM_COUNT) * 100)}% ของทั้งหมด`, indicatorIcon: null, tileBg: 'var(--surface-neutral-tertiary, #F4F5F5)', iconInk: 'var(--text-neutral-default, #4D5358)' },
];

/* Tab icons per Figma 291:113045: clipboard-list · inbox_text_share ·
   inbox_text_dontshare · Save (floppy). All resolve via the <Icon> adapter. */
export const CONSENT_FORM_TABS = [
  { value: 'review',      label: 'รอตรวจสอบ',       icon: 'fact_check' },
  { value: 'published',   label: 'เผยแพร่',          icon: 'inbox_text_share' },
  { value: 'unpublished', label: 'ไม่เผยแพร่',       icon: 'inbox_text_dontshare' },
  { value: 'draft',       label: 'ที่ร่างไว้',       icon: 'save' },
  { value: 'all',         label: 'แบบฟอร์มทั้งหมด', icon: 'clipboard-list' },
];

export const CONSENT_FORM_STATUS = {
  'รอตรวจสอบ':  { tone: 'blue',  tab: 'review' },
  'เผยแพร่':    { tone: 'green', tab: 'published' },
  'ไม่เผยแพร่': { tone: 'red',   tab: 'unpublished' },
  'ร่าง':       { tone: 'grey',  tab: 'draft' },
};

/* ประเภท Consent → ColorfulBadge tone. */
export const FORM_TYPE_TONE = {
  'การวิจัย':     'purple',
  'บันทึกภาพ/สื่อ': 'blue',
  'การรักษา':     'green',
  'ผ่าตัด':       'purple',
  'วัคซีน':       'teal',
  'PDPA':         'blue',
};

const FORMS = [
  { name: 'ใบยินยอมเข้าร่วมโครงการวิจัย (Research Consent / ICF)', type: 'การวิจัย', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'ผู้ป่วยนอก' },
  { name: 'ใบยินยอมถ่ายภาพ / บันทึกวิดีโอเพื่อการศึกษา', type: 'บันทึกภาพ/สื่อ', group: 'พยาบาล', subBranch: 'ห้องฉุกเฉิน', dept: 'พยาบาลวิชาชีพ' },
  { name: 'ใบยินยอมรับการรักษาทั่วไป (General Consent for Treatment)', type: 'การรักษา', group: 'แพทย์', subBranch: 'ทันตแพทย์', dept: 'ทันตกรรม' },
  { name: 'ใบยินยอมผ่าตัด / หัตถการ (Surgical / Procedure Consent)', type: 'ผ่าตัด', group: 'แพทย์', subBranch: 'แพทย์แผนไทย', dept: 'แพทย์แผนไทย' },
  { name: 'ความยินยอมในการดมยาสลบและระงับความรู้สึก', type: 'การรักษา', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'อายุรแพทย์' },
  { name: 'ใบยินยอมรับเลือดและส่วนประกอบของเลือด (Blood Transfusion)', type: 'การวิจัย', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'อายุรแพทย์' },
  { name: 'ใบยินยอมการฉีดวัคซีน', type: 'วัคซีน', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'ส่งเสริมสุขภาพ' },
  { name: 'ใบยินยอมการตรวจคัดกรองสุขภาพ', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลเวชปฏิบัติ', dept: 'ผู้ป่วยนอก' },
  { name: 'ใบยินยอมเปิดเผยข้อมูลสุขภาพ (PDPA)', type: 'PDPA', group: 'เภสัชกร', subBranch: 'เภสัชกรคลินิก', dept: 'เภสัชกรรม' },
  { name: 'ใบยินยอมทันตกรรม', type: 'การรักษา', group: 'แพทย์', subBranch: 'ทันตแพทย์', dept: 'ทันตกรรม' },
  { name: 'ใบยินยอมสุขภาพจิต / จิตเวช', type: 'การรักษา', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'สุขภาพจิต' },
  { name: 'ใบยินยอมอนามัยโรงเรียน', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'ส่งเสริมสุขภาพ' },
  { name: 'ใบยินยอมการดูแลที่บ้าน', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลเวชปฏิบัติ', dept: 'ผู้ป่วยนอก' },
  { name: 'ใบยินยอมโทรเวชกรรม (Telemedicine)', type: 'บันทึกภาพ/สื่อ', group: 'แพทย์', subBranch: 'แพทย์ทั่วไป', dept: 'ผู้ป่วยนอก' },
  /* ชื่อเพิ่ม — ไม่ซ้ำ ไม่ต่อท้าย (n) */
  { name: 'ใบยินยอมผ่าตัดตา / จักษุวิทยา', type: 'ผ่าตัด', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'จักษุวิทยา' },
  { name: 'ใบยินยอมส่องกล้องทางเดินอาหาร (EGD / Colonoscopy)', type: 'ผ่าตัด', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'อายุรกรรม' },
  { name: 'ใบยินยอมตรวจหัวใจด้วยคลื่นเสียง (Echocardiogram)', type: 'การรักษา', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'อายุรกรรม' },
  { name: 'ใบยินยอมตรวจเอกซเรย์คอมพิวเตอร์ (CT Scan)', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'รังสีวิทยา' },
  { name: 'ใบยินยอมตรวจคลื่นแม่เหล็กไฟฟ้า (MRI)', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'รังสีวิทยา' },
  { name: 'ใบยินยอมฟื้นฟูสมรรถภาพหัวใจ', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลเวชปฏิบัติ', dept: 'อายุรกรรม' },
  { name: 'ใบยินยอมกายภาพบำบัด', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'กายภาพบำบัด' },
  { name: 'ใบยินยอมโภชนาการคลินิก', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลเวชปฏิบัติ', dept: 'โภชนาการ' },
  { name: 'ใบยินยอมใช้ยาเคมีบำบัด (Chemotherapy)', type: 'การรักษา', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'อายุรกรรม' },
  { name: 'ใบยินยอมฉายรังสีรักษา (Radiotherapy)', type: 'การรักษา', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'รังสีรักษา' },
  { name: 'ใบยินยอมผ่าตัดกระดูกและข้อ', type: 'ผ่าตัด', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'ออร์โธปิดิกส์' },
  { name: 'ใบยินยอมผ่าตัดหู คอ จมูก', type: 'ผ่าตัด', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'โสต ศอ นาสิก' },
  { name: 'ใบยินยอมสูติ-นรีเวชกรรม', type: 'การรักษา', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'สูตินรีเวช' },
  { name: 'ใบยินยอมคลอดปกติ / ผ่าตัดคลอด', type: 'ผ่าตัด', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'สูตินรีเวช' },
  { name: 'ใบยินยอมกุมารเวชกรรม', type: 'การรักษา', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'กุมารเวช' },
  { name: 'ใบยินยอมฉีดวัคซีนไข้หวัดใหญ่', type: 'วัคซีน', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'ส่งเสริมสุขภาพ' },
  { name: 'ใบยินยอมฉีดวัคซีนโควิด-19', type: 'วัคซีน', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'ส่งเสริมสุขภาพ' },
  { name: 'ใบยินยอมฉีดวัคซีน HPV', type: 'วัคซีน', group: 'พยาบาล', subBranch: 'พยาบาลเวชปฏิบัติ', dept: 'ส่งเสริมสุขภาพ' },
  { name: 'ใบยินยอมตรวจคัดกรองมะเร็งปากมดลูก', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'สูตินรีเวช' },
  { name: 'ใบยินยอมตรวจคัดกรองเบาหวาน ความดัน', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลเวชปฏิบัติ', dept: 'ผู้ป่วยนอก' },
  { name: 'ใบยินยอมเปิดเผยข้อมูลเพื่อการเบิกจ่าย', type: 'PDPA', group: 'เภสัชกร', subBranch: 'เภสัชกรคลินิก', dept: 'เภสัชกรรม' },
  { name: 'ใบยินยอมใช้ข้อมูลเพื่อการวิจัยคุณภาพ', type: 'PDPA', group: 'แพทย์', subBranch: 'แพทย์ทั่วไป', dept: 'ผู้ป่วยนอก' },
  { name: 'ใบยินยอมส่งต่อข้อมูลไปยังสถานพยาบาลอื่น', type: 'PDPA', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'ผู้ป่วยนอก' },
  { name: 'ใบยินยอมถ่ายภาพรังสีทรวงอก (Chest X-ray)', type: 'บันทึกภาพ/สื่อ', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'รังสีวิทยา' },
  { name: 'ใบยินยอมบันทึกเสียงเพื่อการปรึกษา', type: 'บันทึกภาพ/สื่อ', group: 'แพทย์', subBranch: 'แพทย์ทั่วไป', dept: 'สุขภาพจิต' },
  { name: 'ใบยินยอมใช้ภาพเพื่อเผยแพร่ประชาสัมพันธ์', type: 'บันทึกภาพ/สื่อ', group: 'พยาบาล', subBranch: 'ห้องฉุกเฉิน', dept: 'พยาบาลวิชาชีพ' },
  { name: 'ใบยินยอมผ่าตัดถุงน้ำดีแบบส่องกล้อง', type: 'ผ่าตัด', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'ศัลยกรรม' },
  { name: 'ใบยินยอมตัดชิ้นเนื้อ (Biopsy)', type: 'ผ่าตัด', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'พยาธิวิทยา' },
  { name: 'ใบยินยอมล้างไต (Hemodialysis)', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลเวชปฏิบัติ', dept: 'ไตเทียม' },
  { name: 'ใบยินยอมใส่สายสวนทางหลอดเลือด', type: 'การรักษา', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'อายุรกรรม' },
  { name: 'ใบยินยอมฉุกเฉินเมื่อสติสัมปชัญญะไม่สมบูรณ์', type: 'การรักษา', group: 'แพทย์', subBranch: 'แพทย์ทั่วไป', dept: 'ห้องฉุกเฉิน' },
  { name: 'ใบยินยอมผู้ปกครองแทนผู้เยาว์', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'กุมารเวช' },
  { name: 'ใบยินยอมเข้าร่วมโครงการวิจัยวัคซีน', type: 'การวิจัย', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'ส่งเสริมสุขภาพ' },
  { name: 'ใบยินยอมเก็บตัวอย่างชีวภาพเพื่อการวิจัย', type: 'การวิจัย', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'ห้องปฏิบัติการ' },
  { name: 'ใบยินยอมใช้ยาปฏิชีวนะทางหลอดเลือด', type: 'การรักษา', group: 'เภสัชกร', subBranch: 'เภสัชกรคลินิก', dept: 'เภสัชกรรม' },
  { name: 'ใบยินยอมปรึกษาเภสัชกรคลินิก', type: 'การรักษา', group: 'เภสัชกร', subBranch: 'เภสัชกรคลินิก', dept: 'เภสัชกรรม' },
  { name: 'ใบยินยอมตรวจสมรรถภาพปอด (Spirometry)', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'อายุรกรรม' },
  { name: 'ใบยินยอมตรวจคลื่นไฟฟ้าหัวใจ (ECG)', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'อายุรกรรม' },
  { name: 'ใบยินยอมผ่าตัดสมองและระบบประสาท', type: 'ผ่าตัด', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'ประสาทศัลยกรรม' },
  { name: 'ใบยินยอมฟื้นฟูสมรรถภาพปอด', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลเวชปฏิบัติ', dept: 'กายภาพบำบัด' },
  { name: 'ใบยินยอมตรวจอัลตราซาวด์ช่องท้อง', type: 'การรักษา', group: 'แพทย์', subBranch: 'แพทย์ทั่วไป', dept: 'รังสีวิทยา' },
  { name: 'ใบยินยอมฉีดยาชาเฉพาะที่', type: 'การรักษา', group: 'แพทย์', subBranch: 'ทันตแพทย์', dept: 'ทันตกรรม' },
  { name: 'ใบยินยอมถอนฟัน / ผ่าฟันคุด', type: 'ผ่าตัด', group: 'แพทย์', subBranch: 'ทันตแพทย์', dept: 'ทันตกรรม' },
  { name: 'ใบยินยอมจัดฟัน', type: 'การรักษา', group: 'แพทย์', subBranch: 'ทันตแพทย์', dept: 'ทันตกรรม' },
  { name: 'ใบยินยอมตรวจคัดกรองวัณโรค', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'ส่งเสริมสุขภาพ' },
  { name: 'ใบยินยอมบำบัดยาเสพติด', type: 'การรักษา', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'สุขภาพจิต' },
  { name: 'ใบยินยอมให้คำปรึกษาทางจิตวิทยา', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลเวชปฏิบัติ', dept: 'สุขภาพจิต' },
  { name: 'ใบยินยอมใช้แอพสุขภาพ / ติดตามอาการทางไกล', type: 'บันทึกภาพ/สื่อ', group: 'แพทย์', subBranch: 'แพทย์ทั่วไป', dept: 'ผู้ป่วยนอก' },
  { name: 'ใบยินยอมเปิดเผยข้อมูลสิทธิการรักษา', type: 'PDPA', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'ผู้ป่วยนอก' },
  { name: 'ใบยินยอมใช้ข้อมูลสถิติเพื่อพัฒนาบริการ', type: 'PDPA', group: 'แพทย์', subBranch: 'แพทย์ทั่วไป', dept: 'ผู้ป่วยนอก' },
  { name: 'ใบยินยอมผ่าตัดไส้ติ่ง', type: 'ผ่าตัด', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'ศัลยกรรม' },
  { name: 'ใบยินยอมใส่เครื่องกระตุ้นหัวใจ', type: 'ผ่าตัด', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'อายุรกรรม' },
  { name: 'ใบยินยอมตรวจเลือดก่อนผ่าตัด', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'ห้องปฏิบัติการ' },
  { name: 'ใบยินยอมรับเลือดฉุกเฉิน', type: 'การรักษา', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'ห้องฉุกเฉิน' },
  { name: 'ใบยินยอมเข้าร่วมโครงการวิจัยด้านโภชนาการ', type: 'การวิจัย', group: 'พยาบาล', subBranch: 'พยาบาลเวชปฏิบัติ', dept: 'โภชนาการ' },
  { name: 'ใบยินยอมฉีดวัคซีนไข้เลือดออก', type: 'วัคซีน', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'ส่งเสริมสุขภาพ' },
  { name: 'ใบยินยอมฉีดวัคซีนไข้พิษสุนัขบ้า', type: 'วัคซีน', group: 'พยาบาล', subBranch: 'ห้องฉุกเฉิน', dept: 'ห้องฉุกเฉิน' },
  { name: 'ใบยินยอมตรวจคัดกรองตาในชุมชน', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'ส่งเสริมสุขภาพ' },
  { name: 'ใบยินยอมเยี่ยมบ้านผู้ป่วยเรื้อรัง', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลเวชปฏิบัติ', dept: 'ผู้ป่วยนอก' },
  { name: 'ใบยินยอมใช้หุ่นยนต์ช่วยผ่าตัด', type: 'ผ่าตัด', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'ศัลยกรรม' },
  { name: 'ใบยินยอมผ่าตัดเปลี่ยนข้อเข่า', type: 'ผ่าตัด', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'ออร์โธปิดิกส์' },
  { name: 'ใบยินยอมตรวจคัดกรองมะเร็งลำไส้', type: 'การรักษา', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'อายุรกรรม' },
  { name: 'ใบยินยอมถ่ายภาพเพื่อการสอนแพทย์ประจำบ้าน', type: 'บันทึกภาพ/สื่อ', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'อายุรกรรม' },
  { name: 'ใบยินยอมใช้ข้อมูลเพื่อส่งเบิก สปสช.', type: 'PDPA', group: 'เภสัชกร', subBranch: 'เภสัชกรคลินิก', dept: 'เภสัชกรรม' },
  { name: 'ใบยินยอมฉีดวัคซีนเด็กตามแผนสร้างเสริมภูมิคุ้มกัน', type: 'วัคซีน', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'กุมารเวช' },
  { name: 'ใบยินยอมตรวจคัดกรองพัฒนาการเด็ก', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลเวชปฏิบัติ', dept: 'กุมารเวช' },
  { name: 'ใบยินยอมผ่าตัดไทรอยด์', type: 'ผ่าตัด', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'ศัลยกรรม' },
  { name: 'ใบยินยอมส่องกล้องโพรงจมูก', type: 'ผ่าตัด', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'โสต ศอ นาสิก' },
  { name: 'ใบยินยอมตรวจการนอนหลับ (Sleep Study)', type: 'การรักษา', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'อายุรกรรม' },
  { name: 'ใบยินยอมบำบัดด้วยออกซิเจนแรงดันสูง', type: 'การรักษา', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'อายุรกรรม' },
  { name: 'ใบยินยอมใช้ยาแก้ปวดควบคุมด้วยผู้ป่วย (PCA)', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'ผู้ป่วยใน' },
  { name: 'ใบยินยอมดูแลแบบประคับประคอง (Palliative Care)', type: 'การรักษา', group: 'แพทย์', subBranch: 'แพทย์ทั่วไป', dept: 'ผู้ป่วยใน' },
  { name: 'ใบยินยอมเข้าร่วมโครงการวิจัยโรคเรื้อรัง', type: 'การวิจัย', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'อายุรกรรม' },
  { name: 'ใบยินยอมเก็บตัวอย่างเลือดเพื่อธนาคารเลือด', type: 'การวิจัย', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'ห้องปฏิบัติการ' },
  { name: 'ใบยินยอมฉีดวัคซีนไข้หวัดใหญ่ฤดูกาล', type: 'วัคซีน', group: 'พยาบาล', subBranch: 'พยาบาลเวชปฏิบัติ', dept: 'ส่งเสริมสุขภาพ' },
  { name: 'ใบยินยอมใช้ภาพอัลตราซาวด์เพื่อการสอน', type: 'บันทึกภาพ/สื่อ', group: 'แพทย์', subBranch: 'แพทย์ทั่วไป', dept: 'รังสีวิทยา' },
  { name: 'ใบยินยอมเปิดเผยผลแล็บแก่ญาติผู้ดูแล', type: 'PDPA', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'ผู้ป่วยใน' },
  { name: 'ใบยินยอมผ่าตัดไส้เลื่อน', type: 'ผ่าตัด', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'ศัลยกรรม' },
  { name: 'ใบยินยอมใส่ท่อช่วยหายใจ', type: 'การรักษา', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'ห้องฉุกเฉิน' },
  { name: 'ใบยินยอมฟื้นฟูสมรรถภาพหลังผ่าตัด', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลเวชปฏิบัติ', dept: 'กายภาพบำบัด' },
  { name: 'ใบยินยอมตรวจคัดกรองโรคหัวใจในชุมชน', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'ส่งเสริมสุขภาพ' },
  { name: 'ใบยินยอมปรึกษาแพทย์แผนไทย', type: 'การรักษา', group: 'แพทย์', subBranch: 'แพทย์แผนไทย', dept: 'แพทย์แผนไทย' },
  { name: 'ใบยินยอมนวดแผนไทยเพื่อการรักษา', type: 'การรักษา', group: 'แพทย์', subBranch: 'แพทย์แผนไทย', dept: 'แพทย์แผนไทย' },
  { name: 'ใบยินยอมใช้สมุนไพรในสถานพยาบาล', type: 'การรักษา', group: 'แพทย์', subBranch: 'แพทย์แผนไทย', dept: 'แพทย์แผนไทย' },
  { name: 'ใบยินยอมเข้าร่วมโครงการวิจัยการแพทย์แผนไทย', type: 'การวิจัย', group: 'แพทย์', subBranch: 'แพทย์แผนไทย', dept: 'แพทย์แผนไทย' },
  { name: 'ใบยินยอมฉีดวัคซีนบาดทะยัก', type: 'วัคซีน', group: 'พยาบาล', subBranch: 'ห้องฉุกเฉิน', dept: 'ห้องฉุกเฉิน' },
  { name: 'ใบยินยอมบันทึกวิดีโอหัตถการเพื่อประกันคุณภาพ', type: 'บันทึกภาพ/สื่อ', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'ศัลยกรรม' },
  { name: 'ใบยินยอมใช้ข้อมูลเพื่อรายงานกระทรวงสาธารณสุข', type: 'PDPA', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'ผู้ป่วยนอก' },
  { name: 'ใบยินยอมผ่าตัดเต้านม', type: 'ผ่าตัด', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'ศัลยกรรม' },
  { name: 'ใบยินยอมตรวจแมมโมแกรม', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'รังสีวิทยา' },
  { name: 'ใบยินยอมใช้ยาต้านไวรัสเรื้อรัง', type: 'การรักษา', group: 'เภสัชกร', subBranch: 'เภสัชกรคลินิก', dept: 'เภสัชกรรม' },
  { name: 'ใบยินยอมปรึกษาด้านยาต้านการแข็งตัวของเลือด', type: 'การรักษา', group: 'เภสัชกร', subBranch: 'เภสัชกรคลินิก', dept: 'เภสัชกรรม' },
  { name: 'ใบยินยอมตรวจคัดกรองการได้ยิน', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'โสต ศอ นาสิก' },
  { name: 'ใบยินยอมผ่าตัดต้อกระจก', type: 'ผ่าตัด', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'จักษุวิทยา' },
  { name: 'ใบยินยอมฉีดยาเข้าวุ้นตา', type: 'การรักษา', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'จักษุวิทยา' },
  { name: 'ใบยินยอมเข้าร่วมโครงการวิจัยโรคตา', type: 'การวิจัย', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'จักษุวิทยา' },
  { name: 'ใบยินยอมถ่ายภาพจอประสาทตา', type: 'บันทึกภาพ/สื่อ', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'จักษุวิทยา' },
  { name: 'ใบยินยอมฉีดวัคซีนปอดอักเสบในผู้สูงอายุ', type: 'วัคซีน', group: 'พยาบาล', subBranch: 'พยาบาลเวชปฏิบัติ', dept: 'ส่งเสริมสุขภาพ' },
  { name: 'ใบยินยอมเปิดเผยข้อมูลแก่บริษัทประกัน', type: 'PDPA', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'ผู้ป่วยนอก' },
  { name: 'ใบยินยอมผ่าตัดไตแบบส่องกล้อง', type: 'ผ่าตัด', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'ศัลยกรรม' },
  { name: 'ใบยินยอมตรวจสมรรถภาพไต', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'ไตเทียม' },
  { name: 'ใบยินยอมใช้เครื่องช่วยหายใจระยะยาว', type: 'การรักษา', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'ผู้ป่วยใน' },
  { name: 'ใบยินยอมดูแลผู้ป่วยติดเตียงที่บ้าน', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลเวชปฏิบัติ', dept: 'ผู้ป่วยนอก' },
  { name: 'ใบยินยอมเข้าร่วมโครงการวิจัยโรคไตเรื้อรัง', type: 'การวิจัย', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'อายุรกรรม' },
  { name: 'ใบยินยอมบันทึกภาพอัลตราซาวด์ครรภ์', type: 'บันทึกภาพ/สื่อ', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'สูตินรีเวช' },
  { name: 'ใบยินยอมฉีดวัคซีนบาดทะยักในหญิงตั้งครรภ์', type: 'วัคซีน', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'สูตินรีเวช' },
  { name: 'ใบยินยอมใช้ข้อมูลครรภ์เพื่อติดตามคุณภาพ', type: 'PDPA', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'สูตินรีเวช' },
  { name: 'ใบยินยอมผ่าตัดมดลูก', type: 'ผ่าตัด', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'สูตินรีเวช' },
  { name: 'ใบยินยอมตรวจคัดกรองโรคทางพันธุกรรม', type: 'การวิจัย', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'กุมารเวช' },
  { name: 'ใบยินยอมใช้ยาเสพติดทางการแพทย์ภายใต้การควบคุม', type: 'การรักษา', group: 'เภสัชกร', subBranch: 'เภสัชกรคลินิก', dept: 'เภสัชกรรม' },
  { name: 'ใบยินยอมตรวจคัดกรองมะเร็งต่อมลูกหมาก', type: 'การรักษา', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'ศัลยกรรม' },
  { name: 'ใบยินยอมผ่าตัดต่อมลูกหมาก', type: 'ผ่าตัด', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'ศัลยกรรม' },
  { name: 'ใบยินยอมใช้แอพเตือนทานยา', type: 'บันทึกภาพ/สื่อ', group: 'เภสัชกร', subBranch: 'เภสัชกรคลินิก', dept: 'เภสัชกรรม' },
  { name: 'ใบยินยอมฉีดวัคซีนงูสวัด', type: 'วัคซีน', group: 'พยาบาล', subBranch: 'พยาบาลเวชปฏิบัติ', dept: 'ส่งเสริมสุขภาพ' },
  { name: 'ใบยินยอมเปิดเผยประวัติแพ้ยาแก่สถานพยาบาลอื่น', type: 'PDPA', group: 'เภสัชกร', subBranch: 'เภสัชกรคลินิก', dept: 'เภสัชกรรม' },
  { name: 'ใบยินยอมตรวจคัดกรองโรคข้อเข่าเสื่อม', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'ออร์โธปิดิกส์' },
  { name: 'ใบยินยอมผ่าตัดเส้นเอ็นข้อเข่า', type: 'ผ่าตัด', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'ออร์โธปิดิกส์' },
  { name: 'ใบยินยอมเข้าร่วมโครงการวิจัยโรคข้อ', type: 'การวิจัย', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'ออร์โธปิดิกส์' },
  { name: 'ใบยินยอมบันทึกวิดีโอกายภาพบำบัดเพื่อติดตามผล', type: 'บันทึกภาพ/สื่อ', group: 'พยาบาล', subBranch: 'พยาบาลเวชปฏิบัติ', dept: 'กายภาพบำบัด' },
  { name: 'ใบยินยอมฉีดวัคซีนไข้เหลืองก่อนเดินทาง', type: 'วัคซีน', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'ส่งเสริมสุขภาพ' },
  { name: 'ใบยินยอมใช้ข้อมูลเพื่อประเมินความเสี่ยงโรคเรื้อรัง', type: 'PDPA', group: 'แพทย์', subBranch: 'แพทย์ทั่วไป', dept: 'ผู้ป่วยนอก' },
  { name: 'ใบยินยอมผ่าตัดถุงน้ำรังไข่', type: 'ผ่าตัด', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'สูตินรีเวช' },
  { name: 'ใบยินยอมตรวจคัดกรองโรคเบาหวานขึ้นจอตา', type: 'การรักษา', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'จักษุวิทยา' },
  { name: 'ใบยินยอมใช้ยาอินซูลินชนิดฉีด', type: 'การรักษา', group: 'เภสัชกร', subBranch: 'เภสัชกรคลินิก', dept: 'เภสัชกรรม' },
  { name: 'ใบยินยอมเข้าร่วมโครงการวิจัยเบาหวาน', type: 'การวิจัย', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'อายุรกรรม' },
  { name: 'ใบยินยอมถ่ายภาพแผลเพื่อติดตามการรักษา', type: 'บันทึกภาพ/สื่อ', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'ผู้ป่วยใน' },
  { name: 'ใบยินยอมฉีดวัคซีนไวรัสตับอักเสบบี', type: 'วัคซีน', group: 'พยาบาล', subBranch: 'พยาบาลเวชปฏิบัติ', dept: 'ส่งเสริมสุขภาพ' },
  { name: 'ใบยินยอมเปิดเผยผลแล็บแก่แพทย์ผู้ส่งตรวจ', type: 'PDPA', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'ห้องปฏิบัติการ' },
  { name: 'ใบยินยอมผ่าตัดไส้ตรง', type: 'ผ่าตัด', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'ศัลยกรรม' },
  { name: 'ใบยินยอมตรวจคัดกรองโรคตับ', type: 'การรักษา', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'อายุรกรรม' },
  { name: 'ใบยินยอมใช้ยากดภูมิคุ้มกัน', type: 'การรักษา', group: 'เภสัชกร', subBranch: 'เภสัชกรคลินิก', dept: 'เภสัชกรรม' },
  { name: 'ใบยินยอมเข้าร่วมโครงการวิจัยโรคตับ', type: 'การวิจัย', group: 'แพทย์', subBranch: 'แพทย์เฉพาะทาง', dept: 'อายุรกรรม' },
  { name: 'ใบยินยอมบันทึกเสียงการให้คำปรึกษาทางไกล', type: 'บันทึกภาพ/สื่อ', group: 'แพทย์', subBranch: 'แพทย์ทั่วไป', dept: 'ผู้ป่วยนอก' },
  { name: 'ใบยินยอมฉีดวัคซีนไข้สมองอักเสบ', type: 'วัคซีน', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'ส่งเสริมสุขภาพ' },
  { name: 'ใบยินยอมใช้ข้อมูลเพื่อเชื่อมต่อ Health ID', type: 'PDPA', group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'ผู้ป่วยนอก' },
];

const VERSIONS = ['V 1.2', 'V 1.0', 'V 2.1', 'V 1.1', 'V 1.3', 'V 2.0'];
const CREATORS = ['ลดา ดีงาม', 'สมชาย มั่นใจดี', 'พิมพ์ชนก ทองดี', 'กมลวรรณ พูนสุข'];

/* สถานะเรียงตามแท็บ — 36 รอตรวจสอบ · 36 เผยแพร่ · 36 ไม่เผยแพร่ · 36 ร่าง */
const TAB_STATUSES = [
  ...Array.from({ length: PER_TAB_COUNT }, () => 'รอตรวจสอบ'),
  ...Array.from({ length: PER_TAB_COUNT }, () => 'เผยแพร่'),
  ...Array.from({ length: PER_TAB_COUNT }, () => 'ไม่เผยแพร่'),
  ...Array.from({ length: PER_TAB_COUNT }, () => 'ร่าง'),
];

/* Extra Group Policy / สาขาย่อย / แผนก scopes a form can ALSO apply to.
   The cell shows the primary scope inline + "+N เพิ่มเติม"; clicking the hint
   opens a popover (Figma 291:254663) listing every scope as a badge triplet. */
const EXTRA_SCOPE_POOL = [
  { group: 'แพทย์',   subBranch: 'แพทย์เฉพาะทาง',   dept: 'อายุรกรรม' },
  { group: 'พยาบาล',  subBranch: 'พยาบาลเวชปฏิบัติ', dept: 'ผู้ป่วยใน' },
  { group: 'เภสัชกร', subBranch: 'เภสัชกรคลินิก',    dept: 'เภสัชกรรม' },
  { group: 'แพทย์',   subBranch: 'ทันตแพทย์',        dept: 'ทันตกรรม' },
  { group: 'พยาบาล',  subBranch: 'พยาบาลวิชาชีพ',     dept: 'ส่งเสริมสุขภาพ' },
];

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

export const CONSENT_FORM_RECORDS = Array.from({ length: MOCK_FORM_COUNT }, (_, i) => {
  const f = FORMS[i % FORMS.length];
  const primary = { group: f.group, subBranch: f.subBranch, dept: f.dept };
  const extraCount = i % 3;
  const extras = Array.from({ length: extraCount }, (_, k) =>
    EXTRA_SCOPE_POOL[(i + k) % EXTRA_SCOPE_POOL.length]);
  const scopes = [primary, ...extras];
  const day = (i % 28) + 1;
  const month = THAI_MONTHS_FULL[i % 12];
  const year = 2569;
  return {
    id: i + 1,
    code: `PH-${String(i + 1).padStart(3, '0')}`,
    name: f.name,
    type: f.type,
    version: VERSIONS[i % VERSIONS.length],
    group: f.group,
    subBranch: f.subBranch,
    dept: f.dept,
    scopes,
    moreCount: extras.length,
    createdDate: `${day} ${month} ${year}`,
    updatedDate: `${((i * 3) % 28) + 1} ${THAI_MONTHS_FULL[(i + 3) % 12]} ${year}`,
    creator: CREATORS[i % CREATORS.length],
    status: TAB_STATUSES[i],
  };
});

/** Worklist type (จัดการความยินยอม) → canonical template code in this registry. */
const WORKLIST_TYPE_FORM_CODE = {
  'ผ่าตัด': 'PH-004',
  'การรักษา': 'PH-003',
  'การวิจัย': 'PH-001',
  'เลือด': 'PH-006',
  'PDPA': 'PH-009',
  'เบิกจ่าย': 'PH-003',
};

const formByCode = (code) => CONSENT_FORM_RECORDS.find((f) => f.code === code) || null;

/** Lookup registry row by id (edit / new-version tab). */
export const getConsentFormById = (id) => {
  if (id == null || id === '') return null;
  const n = Number(id);
  return CONSENT_FORM_RECORDS.find((f) => f.id === n || String(f.id) === String(id)) || null;
};

/** Resolve { formCode, formName } from worklist consent type — names match แบบฟอร์มความยินยอม. */
export const resolveConsentFormForWorklistType = (type) => {
  const coded = WORKLIST_TYPE_FORM_CODE[type];
  const hit = coded ? formByCode(coded) : null;
  if (hit) return { formCode: hit.code, formName: hit.name };
  const byType = CONSENT_FORM_RECORDS.find((f) => f.type === type);
  if (byType) return { formCode: byType.code, formName: byType.name };
  return { formCode: '-', formName: '-' };
};

/** From a selected template row (create / reconsent popup). */
export const resolveConsentFormFromTemplate = (template) => {
  if (template?.code && template?.name) return { formCode: template.code, formName: template.name };
  return resolveConsentFormForWorklistType(template?.type);
};

export default CONSENT_FORM_RECORDS;
