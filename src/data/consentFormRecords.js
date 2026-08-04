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
  { name: 'ใบยินยอมเข้าร่วมโครงการวิจัย (Research Consent / ICF)', type: 'การวิจัย',     group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'ผู้ป่วยนอก' },
  { name: 'ใบยินยอมถ่ายภาพ / บันทึกวิดีโอเพื่อการศึกษา',           type: 'บันทึกภาพ/สื่อ', group: 'พยาบาล', subBranch: 'ห้องฉุกเฉิน', dept: 'พยาบาลวิชาชีพ' },
  { name: 'ใบยินยอมรับการรักษาทั่วไป (General Consent for Treatment)', type: 'การรักษา',  group: 'แพทย์',  subBranch: 'ทันตแพทย์', dept: 'ทันตกรรม' },
  { name: 'ใบยินยอมผ่าตัด / หัตถการ (Surgical / Procedure Consent)', type: 'ผ่าตัด',     group: 'แพทย์',  subBranch: 'แพทย์แผนไทย', dept: 'แพทย์แผนไทย' },
  { name: 'ความยินยอมในการดมยาสลบและระงับความรู้สึก',              type: 'การรักษา',     group: 'แพทย์',  subBranch: 'แพทย์เฉพาะทาง', dept: 'อายุรแพทย์' },
  { name: 'ใบยินยอมรับเลือดและส่วนประกอบของเลือด (Blood Transfusion)', type: 'การวิจัย', group: 'แพทย์',  subBranch: 'แพทย์เฉพาะทาง', dept: 'อายุรแพทย์' },
  { name: 'ใบยินยอมการฉีดวัคซีน',                                  type: 'วัคซีน',      group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'ส่งเสริมสุขภาพ' },
  { name: 'ใบยินยอมการตรวจคัดกรองสุขภาพ',                          type: 'การรักษา',     group: 'พยาบาล', subBranch: 'พยาบาลเวชปฏิบัติ', dept: 'ผู้ป่วยนอก' },
  { name: 'ใบยินยอมเปิดเผยข้อมูลสุขภาพ (PDPA)',                    type: 'PDPA',        group: 'เภสัชกร', subBranch: 'เภสัชกรคลินิก', dept: 'เภสัชกรรม' },
  { name: 'ใบยินยอมทันตกรรม',                                     type: 'การรักษา',     group: 'แพทย์',  subBranch: 'ทันตแพทย์', dept: 'ทันตกรรม' },
  { name: 'ใบยินยอมสุขภาพจิต / จิตเวช',                            type: 'การรักษา',     group: 'แพทย์',  subBranch: 'แพทย์เฉพาะทาง', dept: 'สุขภาพจิต' },
  { name: 'ใบยินยอมอนามัยโรงเรียน',                               type: 'การรักษา',     group: 'พยาบาล', subBranch: 'พยาบาลวิชาชีพ', dept: 'ส่งเสริมสุขภาพ' },
  { name: 'ใบยินยอมการดูแลที่บ้าน',                               type: 'การรักษา',     group: 'พยาบาล', subBranch: 'พยาบาลเวชปฏิบัติ', dept: 'ผู้ป่วยนอก' },
  { name: 'ใบยินยอมโทรเวชกรรม (Telemedicine)',                    type: 'บันทึกภาพ/สื่อ', group: 'แพทย์',  subBranch: 'แพทย์ทั่วไป', dept: 'ผู้ป่วยนอก' },
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
  const nameSuffix = i >= FORMS.length ? ` (${Math.floor(i / FORMS.length) + 1})` : '';
  return {
    id: i + 1,
    code: `PH-${String(i + 1).padStart(3, '0')}`,
    name: `${f.name}${nameSuffix}`,
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
