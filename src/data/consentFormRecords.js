/* PHCIS | Consent — แบบฟอร์มความยินยอม (Figma 291:113045 / flow 277:150901).
   Consent-form TEMPLATE registry: summary cards · tabs · status meta · rows.
   Local mock; UI copy is Thai. */

export const CONSENT_FORM_SUMMARY = [
  { key: 'total',       icon: 'assignment',  color: 'info',       value: '255', label: 'แบบฟอร์มทั้งหมด', indicator: 'เพิ่มขึ้น 3 จากเดือนที่แล้ว' },
  { key: 'published',   icon: 'check_circle', color: 'positive',   value: '42',  label: 'เผยแพร่',        indicator: '58% ของทั้งหมด',  indicatorIcon: null },
  { key: 'unpublished', icon: 'unpublished',  color: 'inprogress', value: '6',   label: 'ไม่เผยแพร่',     indicator: '25% ของทั้งหมด',  indicatorIcon: null },
  { key: 'draft',       icon: 'draft',        value: '10',  label: 'ที่ร่างไว้',  indicator: '3.9% ของทั้งหมด', indicatorIcon: null, tileBg: 'var(--surface-neutral-tertiary, #F4F5F5)', iconInk: 'var(--text-neutral-default, #4D5358)' },
  { key: 'review',      icon: 'fact_check',   color: 'info',       value: '1',   label: 'รอตรวจสอบ',      indicator: 'Pending review', indicatorIcon: null },
];

/* Tab icons per Figma 291:113045: clipboard-list · inbox_text_share ·
   inbox_text_dontshare · Save (floppy). All resolve via the <Icon> adapter. */
export const CONSENT_FORM_TABS = [
  { value: 'all',         label: 'ทั้งหมด',     icon: 'clipboard-list' },
  { value: 'published',   label: 'เผยแพร่',     icon: 'inbox_text_share' },
  { value: 'unpublished', label: 'ไม่เผยแพร่',  icon: 'inbox_text_dontshare' },
  { value: 'draft',       label: 'ที่ร่างไว้',  icon: 'save' },
];

export const CONSENT_FORM_STATUS = {
  'เผยแพร่':    { tone: 'green', tab: 'published' },
  'ไม่เผยแพร่': { tone: 'red',   tab: 'unpublished' },
  'ร่าง':       { tone: 'grey',  tab: 'draft' },
  'รอตรวจสอบ':  { tone: 'blue',  tab: 'draft' },
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
const STAT = ['เผยแพร่', 'เผยแพร่', 'เผยแพร่', 'เผยแพร่', 'ไม่เผยแพร่', 'ร่าง', 'รอตรวจสอบ'];

/** 28 rows — pagination demo at PAGE_SIZE 20 (page 1: 20 · page 2: 8). */
const MOCK_FORM_COUNT = 28;

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
    updatedDate: '20 พฤศจิกายน 2530',
    creator: 'ลดา ดีงาม',
    status: STAT[i % STAT.length],
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
