/* PHCIS | Consent — แบบฟอร์มความยินยอม (Figma 291:113045 / flow 277:150901).
   Consent-form TEMPLATE registry: summary cards · tabs · status meta · rows.
   Local mock; UI copy is Thai. */

import {
  buildConsentScopeCatalog,
  positionsForConsentFormRecord,
  scopesForConsentFormRecord,
} from '@/data/consentFormScopes';

/* สัดส่วนสถานะ mock ให้ summary / แท็บดูสมจริง (รวม 152 แบบฟอร์ม · แต่ละแท็บ ≥33) */
const FORM_STATUS_PLAN = [
  { status: 'เผยแพร่', count: 62 },
  { status: 'ร่าง', count: 41 },
  { status: 'รอตรวจสอบ', count: 28 },
  { status: 'ไม่เผยแพร่', count: 21 },
];
const MOCK_FORM_COUNT = FORM_STATUS_PLAN.reduce((sum, p) => sum + p.count, 0);

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const CONSENT_FORM_SUMMARY_META = [
  { key: 'total', icon: 'assignment', color: 'info', label: 'แบบฟอร์มทั้งหมด' },
  { key: 'review', icon: 'fact_check', color: 'info', label: 'รอตรวจสอบ' },
  { key: 'published', icon: 'check_circle', color: 'positive', label: 'เผยแพร่' },
  { key: 'unpublished', icon: 'unpublished', color: 'inprogress', label: 'ไม่เผยแพร่' },
  {
    key: 'draft',
    icon: 'draft',
    label: 'ที่ร่างไว้',
    tileBg: 'var(--surface-neutral-tertiary, #F4F5F5)',
    iconInk: 'var(--text-neutral-default, #4D5358)',
  },
];

const FORM_SUMMARY_STATUS_KEY = {
  review: 'รอตรวจสอบ',
  published: 'เผยแพร่',
  unpublished: 'ไม่เผยแพร่',
  draft: 'ร่าง',
};

const fmtFormCount = (n) => Number(n || 0).toLocaleString('th-TH');
const pctOfForms = (part, whole) => (
  whole > 0
    ? `${((part / whole) * 100).toFixed(1)}% ของทั้งหมด`
    : '0% ของทั้งหมด'
);

/** สรุป summary cards จาก registry rows — ตัวเลขและ % สัมพันธ์กับข้อมูลจริง */
export const buildConsentFormSummary = (records = []) => {
  const total = records.length;
  const countStatus = (status) => records.filter((r) => r.status === status).length;
  const thisMonthIdx = new Date().getMonth();
  const prevMonthIdx = (thisMonthIdx + 11) % 12;
  const thisMonth = THAI_MONTHS_FULL[thisMonthIdx];
  const prevMonth = THAI_MONTHS_FULL[prevMonthIdx];
  const thisMoTotal = records.filter((r) => String(r.createdDate).includes(thisMonth)).length;
  const prevMoTotal = records.filter((r) => String(r.createdDate).includes(prevMonth)).length;
  const momDelta = thisMoTotal - prevMoTotal;
  const totalIndicator = momDelta > 0
    ? { indicator: `เพิ่มขึ้น ${momDelta} จากเดือนที่แล้ว`, indicatorIcon: 'trending_up' }
    : momDelta < 0
      ? { indicator: `ลดลง ${Math.abs(momDelta)} จากเดือนที่แล้ว`, indicatorIcon: 'trending_down' }
      : { indicator: 'เท่าเดิมจากเดือนที่แล้ว', indicatorIcon: null };

  return CONSENT_FORM_SUMMARY_META.map((meta) => {
    if (meta.key === 'total') {
      return { ...meta, value: fmtFormCount(total), ...totalIndicator };
    }
    const status = FORM_SUMMARY_STATUS_KEY[meta.key];
    const value = countStatus(status);
    return {
      ...meta,
      value: fmtFormCount(value),
      indicator: pctOfForms(value, total),
      indicatorIcon: null,
    };
  });
};

/** Snapshot — หน้าแบบฟอร์มควรใช้ buildConsentFormSummary(records) แบบ live */
export let CONSENT_FORM_SUMMARY = [];

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

/* ประเภท Consent — ระบบจัดการความยินยอมรองรับเฉพาะการเปิดเผยข้อมูล (PDPA) */
export const FORM_TYPE_TONE = {
  'PDPA': 'blue',
};

const ALL_FORM_TEMPLATES = [
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

/** แม่แบบทางการแพทย์ — ย้ายไปคลังเอกสาร e-document (ไม่ใช่ Consent PDPA) */
export const EDOCUMENT_FORM_TEMPLATES = ALL_FORM_TEMPLATES.filter((f) => f.type !== 'PDPA');

/** เฉพาะความยินยอมเปิดเผยข้อมูล — ใช้ในระบบจัดการความยินยอม */
const FORMS = ALL_FORM_TEMPLATES.filter((f) => f.type === 'PDPA');

const VERSIONS = ['V 1.2', 'V 1.0', 'V 2.1', 'V 1.1', 'V 1.3', 'V 2.0'];
const CREATORS = ['ลดา ดีงาม', 'สมชาย มั่นใจดี', 'พิมพ์ชนก ทองดี', 'กมลวรรณ พูนสุข'];

/* สถานะเรียงตามแท็บ — สัดส่วนจาก FORM_STATUS_PLAN */
const TAB_STATUSES = FORM_STATUS_PLAN.flatMap(({ status, count }) =>
  Array.from({ length: count }, () => status),
);

const SCOPE_CATALOG = buildConsentScopeCatalog();

export const CONSENT_FORM_RECORDS = Array.from({ length: MOCK_FORM_COUNT }, (_, i) => {
  const f = FORMS[i % FORMS.length];
  const scopes = scopesForConsentFormRecord(i, SCOPE_CATALOG);
  const positions = positionsForConsentFormRecord(i);
  const primary = scopes[0];
  const day = (i % 28) + 1;
  const thisMonthIdx = new Date().getMonth();
  const prevMonthIdx = (thisMonthIdx + 11) % 12;
  /* ~45% เดือนนี้ · ~20% เดือนที่แล้ว · ที่เหลือกระจาย — ให้ MoM บนการ์ดรวมดูสมจริง */
  const monthIdx = i % 20 < 9
    ? thisMonthIdx
    : i % 20 < 13
      ? prevMonthIdx
      : i % 12;
  const month = THAI_MONTHS_FULL[monthIdx];
  const year = 2569;
  return {
    id: i + 1,
    code: `PH-${String(i + 1).padStart(3, '0')}`,
    name: f.name,
    type: f.type,
    version: VERSIONS[i % VERSIONS.length],
    group: primary.group,
    subBranch: primary.subBranch,
    dept: primary.dept,
    scopes,
    positions,
    moreCount: Math.max(0, scopes.length - 1),
    createdDate: `${day} ${month} ${year}`,
    updatedDate: `${((i * 3) % 28) + 1} ${THAI_MONTHS_FULL[(i + 3) % 12]} ${year}`,
    creator: CREATORS[i % CREATORS.length],
    status: TAB_STATUSES[i],
  };
});

CONSENT_FORM_SUMMARY = buildConsentFormSummary(CONSENT_FORM_RECORDS);

export const CONSENT_FORM_SCOPE_CATALOG = SCOPE_CATALOG;

/* ── พูลแบบฟอร์มของ worklist จัดการความยินยอม ─────────────────────────
   เดิม worklist ผูกทุกแถวไว้กับ PH-009 ใบเดียว (WORKLIST_TYPE_FORM_CODE
   ที่ hardcode ทั้งสอง type ไปโค้ดเดียวกัน) ทำให้ทุกคำขอในระบบชื่อฟอร์ม
   เดียวกันหมด · พูลนี้ดึงจากทะเบียนจริง 1 รายการต่อ 1 ชื่อฟอร์ม เพื่อให้
   รหัส/ชื่อ/เวอร์ชันในหน้าจัดการความยินยอมอ้างอิงแบบฟอร์มที่มีอยู่จริง
   (กดข้ามไปหน้าแบบฟอร์มความยินยอมแล้วต้องเจอใบเดียวกัน)

   `worklistType` = วัตถุประสงค์การขอความยินยอม ใช้เป็นแกน "ประเภท" ของ
   worklist + รายงาน — ทะเบียนเก็บ type = 'PDPA' หมดทุกใบเพราะโมดูลนี้ดูแล
   เฉพาะความยินยอมเปิดเผยข้อมูล แกนนั้นจึงแยกประเภทอะไรไม่ได้ */
const WORKLIST_PURPOSE_BY_FORM_NAME = {
  'ใบยินยอมเปิดเผยข้อมูลสุขภาพ (PDPA)':                  'PDPA',
  'ใบยินยอมเปิดเผยข้อมูลเพื่อการเบิกจ่าย':                 'เบิกจ่าย',
  'ใบยินยอมใช้ข้อมูลเพื่อการวิจัยคุณภาพ':                  'วิจัย/พัฒนาคุณภาพ',
  'ใบยินยอมส่งต่อข้อมูลไปยังสถานพยาบาลอื่น':               'ส่งต่อสถานพยาบาล',
  'ใบยินยอมเปิดเผยข้อมูลสิทธิการรักษา':                    'เบิกจ่าย',
  'ใบยินยอมใช้ข้อมูลสถิติเพื่อพัฒนาบริการ':                 'วิจัย/พัฒนาคุณภาพ',
  'ใบยินยอมใช้ข้อมูลเพื่อส่งเบิก สปสช.':                    'เบิกจ่าย',
  'ใบยินยอมเปิดเผยผลแล็บแก่ญาติผู้ดูแล':                    'เปิดเผยแก่บุคคลที่สาม',
  'ใบยินยอมใช้ข้อมูลเพื่อรายงานกระทรวงสาธารณสุข':          'รายงานหน่วยงานรัฐ',
  'ใบยินยอมเปิดเผยข้อมูลแก่บริษัทประกัน':                   'เปิดเผยแก่บุคคลที่สาม',
  'ใบยินยอมใช้ข้อมูลครรภ์เพื่อติดตามคุณภาพ':                'วิจัย/พัฒนาคุณภาพ',
  'ใบยินยอมเปิดเผยประวัติแพ้ยาแก่สถานพยาบาลอื่น':          'ส่งต่อสถานพยาบาล',
  'ใบยินยอมใช้ข้อมูลเพื่อประเมินความเสี่ยงโรคเรื้อรัง':        'วิจัย/พัฒนาคุณภาพ',
  'ใบยินยอมเปิดเผยผลแล็บแก่แพทย์ผู้ส่งตรวจ':                'ส่งต่อสถานพยาบาล',
  'ใบยินยอมใช้ข้อมูลเพื่อเชื่อมต่อ Health ID':               'รายงานหน่วยงานรัฐ',
};

/** เผยแพร่แล้ว · 1 รายการต่อ 1 ชื่อฟอร์ม (ชื่อซ้ำในทะเบียนคือคนละ code) */
export const CONSENT_WORKLIST_FORM_POOL = (() => {
  const seen = new Set();
  return CONSENT_FORM_RECORDS
    .filter((f) => f.status === 'เผยแพร่' && !seen.has(f.name) && seen.add(f.name))
    .map((f) => ({
      code: f.code,
      name: f.name,
      version: f.version,
      /* ยังไม่ได้ map ชื่อไหน → ตกไปที่ PDPA (ประเภทกลางของโมดูลนี้) */
      worklistType: WORKLIST_PURPOSE_BY_FORM_NAME[f.name] || 'PDPA',
    }));
})();

/** ประเภท (วัตถุประสงค์) ที่ worklist + รายงานใช้จริง — ไล่จากพูล ไม่ hardcode */
export const CONSENT_WORKLIST_TYPES = [
  ...new Set(CONSENT_WORKLIST_FORM_POOL.map((f) => f.worklistType)),
];

/** Unique PDPA form names — autocomplete on create/edit wizard (≥3 chars). */
export const CONSENT_FORM_NAME_SUGGESTIONS = [...new Set([
  ...FORMS.map((f) => f.name),
  ...CONSENT_FORM_RECORDS.map((r) => r.name),
])].sort((a, b) => a.localeCompare(b, 'th'));

/** Filtered name suggestions for the create-form name field. */
export const getConsentFormNameSuggestions = ({
  query = '',
  records = CONSENT_FORM_RECORDS,
  minChars = 3,
  catalog = CONSENT_FORM_NAME_SUGGESTIONS,
} = {}) => {
  const q = String(query || '').trim();
  if (q.length < minChars) return [];
  const lq = q.toLowerCase();
  const pool = [...new Set([
    ...catalog,
    ...records.map((r) => r.name).filter(Boolean),
  ])];
  return pool
    .filter((name) => String(name).toLowerCase().includes(lq))
    .slice(0, 10);
};

/** Worklist type (จัดการความยินยอม) → canonical template code in this registry.
    ไล่จากพูลด้านบน — ใบแรกของแต่ละวัตถุประสงค์เป็นตัวแทน (เดิม hardcode ทั้ง
    สอง type ไป PH-009 ใบเดียว จึงเป็นที่มาของ "ทุกแถวชื่อฟอร์มเดียวกัน") */
const WORKLIST_TYPE_FORM_CODE = CONSENT_WORKLIST_FORM_POOL.reduce((map, f) => {
  if (!map[f.worklistType]) map[f.worklistType] = f.code;
  return map;
}, {});

const PH_CODE_RE = /^PH-(\d+)$/i;

/** Parse `PH-012` → 12; returns null when not a PH-### code. */
export const parseConsentFormCodeNum = (code) => {
  const m = PH_CODE_RE.exec(String(code || '').trim());
  return m ? Number(m[1]) : null;
};

/** Format numeric suffix as canonical registry code (`PH-001`). */
export const formatConsentFormCode = (n) => `PH-${String(Math.max(0, Number(n) || 0)).padStart(3, '0')}`;

/** Next unused code continuing from the highest `PH-###` in the registry. */
export const getNextConsentFormCode = (records = CONSENT_FORM_RECORDS) => {
  const nums = records
    .map((r) => parseConsentFormCodeNum(r.code))
    .filter((n) => n != null);
  const max = nums.length ? Math.max(...nums) : 0;
  return formatConsentFormCode(max + 1);
};

/** Inline suggestions for the create-form code field — next sequential code only. */
export const getConsentFormCodeSuggestions = ({
  query = '',
  records = CONSENT_FORM_RECORDS,
} = {}) => {
  const q = String(query || '').trim().toLowerCase();
  const nextCode = getNextConsentFormCode(records);
  if (!q || nextCode.toLowerCase().includes(q)) {
    return [{ code: nextCode, kind: 'next' }];
  }
  return [];
};

const VERSION_RE = /V\s*(\d+)\.(\d+)/i;

/** Parse `V 1.2` → { major, minor }; null when invalid. */
export const parseConsentFormVersion = (version) => {
  const m = VERSION_RE.exec(String(version || '').trim());
  return m ? { major: Number(m[1]), minor: Number(m[2]) } : null;
};

export const formatConsentFormVersion = (major, minor) => `V ${major}.${minor}`;

/** Default first version for a brand-new form code. */
export const getDefaultConsentFormVersion = () => 'V 1.0';

/** Next version continuing from registry rows that share the same form code. */
export const getNextConsentFormVersionForCode = (code, records = CONSENT_FORM_RECORDS) => {
  const trimmed = String(code || '').trim();
  const matches = trimmed
    ? records.filter((r) => String(r.code || '').trim() === trimmed)
    : [];
  if (!matches.length) return getDefaultConsentFormVersion();

  let maxMajor = 1;
  let maxMinor = 0;
  matches.forEach((r) => {
    const parsed = parseConsentFormVersion(r.version);
    if (!parsed) return;
    if (
      parsed.major > maxMajor
      || (parsed.major === maxMajor && parsed.minor > maxMinor)
    ) {
      maxMajor = parsed.major;
      maxMinor = parsed.minor;
    }
  });
  return formatConsentFormVersion(maxMajor, maxMinor + 1);
};

/** Inline suggestions for the create-form version field. */
export const getConsentFormVersionSuggestions = ({
  query = '',
  code = '',
  records = CONSENT_FORM_RECORDS,
} = {}) => {
  const q = String(query || '').trim().toLowerCase();
  const suggested = getNextConsentFormVersionForCode(code, records);
  if (!q || suggested.toLowerCase().includes(q)) {
    return [{ version: suggested }];
  }
  return [];
};

const formByCode = (code) => CONSENT_FORM_RECORDS.find((f) => f.code === code) || null;

/** Lookup registry row by form code (view popup / access worklist). */
export const getConsentFormByCode = (code) => formByCode(code);

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
