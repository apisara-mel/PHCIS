/* Wizard draft content for consent-form templates — prefill when editing or
   creating a new version (ด.1.1.5). Registry rows in consentFormRecords.js
   carry list metadata only; full Step 1–2 state lives here per form id. */

import { bumpVersion } from '@/pages/consent/consentVersionHistory';

const GROUP_LABEL_TO_VALUE = {
  แพทย์: 'doctor',
  พยาบาล: 'nurse',
  เภสัชกร: 'pharmacist',
};

const SUB_BRANCH_LABEL_TO_VALUE = {
  'แพทย์ทั่วไป': 'gp',
  'แพทย์เฉพาะทาง': 'specialist',
  ทันตแพทย์: 'dentist',
  'แพทย์แผนไทย': 'thai-med',
  'พยาบาลวิชาชีพ': 'rn',
  'ห้องฉุกเฉิน': 'er-nurse',
  'พยาบาลเวชปฏิบัติ': 'np',
  'เภสัชกรคลินิก': 'clin-pharm',
};

const DEPT_LABEL_TO_VALUE = {
  'ผู้ป่วยนอก': 'opd',
  'พยาบาลวิชาชีพ': 'nursing',
  ทันตกรรม: 'dental',
  'แพทย์แผนไทย': 'thai-med',
  อายุรแพทย์: 'opd',
  เภสัชกรรม: 'pharmacy',
  'ส่งเสริมสุขภาพ': 'promotion',
  'สุขภาพจิต': 'mental',
};

const TYPE_TO_TEMPLATE = {
  'การวิจัย': 'research',
  'บันทึกภาพ/สื่อ': 'media',
  'การรักษา': 'treatment',
  'ผ่าตัด': 'surgical',
  วัคซีน: 'vaccine',
  PDPA: 'data',
};

const COMMON_CLAUSES = [
  {
    title: 'การคุ้มครองข้อมูลส่วนบุคคล',
    detail: 'ข้าพเจ้ายินยอมให้สถานพยาบาลเก็บรวบรวมและใช้ข้อมูลสุขภาพเพื่อการรักษาพยาบาล ภายใต้พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA)',
    fieldType: 'boolean',
  },
  {
    title: 'สิทธิในการเพิกถอนความยินยอม',
    detail: 'ข้าพเจ้าทราบว่าสามารถเพิกถอนความยินยอมนี้ได้ทุกเมื่อ โดยไม่กระทบต่อสิทธิในการรับบริการอื่น ๆ',
    fieldType: 'boolean',
  },
];

const LEAD_BY_TYPE = {
  research: [{
    title: 'การเข้าร่วมโครงการวิจัยโดยสมัครใจ',
    detail: 'ข้าพเจ้าได้รับข้อมูลเกี่ยวกับวัตถุประสงค์ ขั้นตอน ประโยชน์ และความเสี่ยงของโครงการวิจัย และยินยอมเข้าร่วมโดยสมัครใจ',
  }],
  media: [{
    title: 'การบันทึกและเผยแพร่ภาพ/สื่อ',
    detail: 'ข้าพเจ้ายินยอมให้บันทึกภาพ/วิดีโอเพื่อการศึกษาและเผยแพร่ตามขอบเขตที่ระบุไว้',
  }],
  treatment: [{
    title: 'การยินยอมรับการรักษา',
    detail: 'ข้าพเจ้าได้รับคำอธิบายถึงแผนการรักษา ประโยชน์ และความเสี่ยงจากแพทย์ผู้ดูแลครบถ้วนแล้ว และยินยอมเข้ารับการรักษา',
  }],
  surgical: [{
    title: 'การยินยอมเข้ารับการผ่าตัด',
    detail: 'ข้าพเจ้าได้รับคำอธิบายถึงวิธีการผ่าตัด ความเสี่ยง ภาวะแทรกซ้อน และทางเลือกอื่นในการรักษา และยินยอมเข้ารับการผ่าตัด',
  }],
  vaccine: [{
    title: 'การรับวัคซีน',
    detail: 'ข้าพเจ้าได้รับข้อมูลเกี่ยวกับวัคซีน ประโยชน์ และอาการไม่พึงประสงค์ที่อาจเกิดขึ้น และยินยอมรับการฉีดวัคซีน',
  }],
  data: [{
    title: 'การเปิดเผยข้อมูลสุขภาพ',
    detail: 'ข้าพเจ้ายินยอมให้เปิดเผยข้อมูลสุขภาพแก่บุคคล/หน่วยงานที่ระบุ เพื่อวัตถุประสงค์ที่กำหนดไว้',
  }],
};

const DEFAULT_LEAD = [{
  title: 'วัตถุประสงค์ของการให้ความยินยอม',
  detail: 'ข้าพเจ้าได้รับคำอธิบายถึงวัตถุประสงค์ ขั้นตอน ประโยชน์ และความเสี่ยงที่อาจเกิดขึ้นจากการรักษา/หัตถการนี้จากแพทย์ผู้ดูแลอย่างครบถ้วนแล้ว',
}, {
  title: 'ความเสี่ยงและภาวะแทรกซ้อนที่อาจเกิดขึ้น',
  detail: 'ข้าพเจ้าเข้าใจว่าการรักษาทุกชนิดมีความเสี่ยง และอาจเกิดภาวะแทรกซ้อนที่ไม่สามารถคาดการณ์ได้',
}];

const TTL_BY_TYPE = {
  research: '365',
  data: '365',
  vaccine: '90',
};

const mapLabels = (labels, table) =>
  [...new Set((labels || []).map((l) => table[l]).filter(Boolean))];

const buildSections = (record) => {
  const templateKey = TYPE_TO_TEMPLATE[record.type] || 'treatment';
  const lead = LEAD_BY_TYPE[templateKey] || DEFAULT_LEAD;
  return [...lead, ...COMMON_CLAUSES].map((c, i) => ({
    id: `cs-${record.id}-${i}`,
    title: c.title,
    detail: c.detail,
    fieldType: c.fieldType || 'boolean',
  }));
};

/** Full Step 1–2 wizard state derived from a registry row. */
export const buildWizardDraftFromRecord = (record) => {
  if (!record) return null;
  const templateKey = TYPE_TO_TEMPLATE[record.type] || 'treatment';
  const scopes = record.scopes || [{ group: record.group, subBranch: record.subBranch, dept: record.dept }];
  const groupPolicy = mapLabels(scopes.map((s) => s.group), GROUP_LABEL_TO_VALUE);
  const subBranch = mapLabels(scopes.map((s) => s.subBranch), SUB_BRANCH_LABEL_TO_VALUE);
  const dept = mapLabels(scopes.map((s) => s.dept), DEPT_LABEL_TO_VALUE);

  return {
    template: templateKey,
    cover: 0,
    name: record.name,
    code: record.code,
    type: templateKey,
    typeLabel: record.type,
    version: record.version,
    ttl: TTL_BY_TYPE[templateKey] || '30',
    groupPolicy: groupPolicy.length ? groupPolicy : ['nurse'],
    subBranch: subBranch.length ? subBranch : ['rn'],
    dept: dept.length ? dept : ['opd'],
    position: ['practitioner', 'dept-head'],
    docTitle: record.name,
    patientFields: ['name', 'hn', 'doctor', 'birth'],
    sections: buildSections(record),
    signatures: record.type === 'การวิจัย' ? ['patient', 'doctor', 'witness'] : ['patient', 'doctor'],
    note: 'เอกสารนี้มีอายุตามที่ระบุในอายุการใช้งาน นับจากวันที่ลงนาม',
    requireGuardian: record.type === 'การรักษา' && record.name.includes('โรงเรียน'),
    allowESign: true,
  };
};

/** Route-state prefill for CreateConsentFormPage (edit / new version). */
export const buildWizardPrefillFromRecord = (record, { newVersion = false } = {}) => {
  const draft = buildWizardDraftFromRecord(record);
  if (!draft) return null;
  return {
    ...draft,
    supersedeType: newVersion ? record.type : undefined,
    fromVersion: newVersion ? record.version : undefined,
    version: newVersion ? bumpVersion(record.version) : record.version,
    sourceFormId: record.id,
    isNewVersion: newVersion,
  };
};

/** Open create/edit wizard in a new browser tab (query carries form id). */
export const openConsentFormWizardTab = (record, { newVersion = false } = {}) => {
  if (typeof window === 'undefined' || !record?.id) return;
  const q = new URLSearchParams({ editId: String(record.id) });
  if (newVersion) q.set('newVersion', '1');
  window.open(
    `${window.location.origin}/consent/forms/new?${q.toString()}`,
    '_blank',
    'noopener,noreferrer',
  );
};
