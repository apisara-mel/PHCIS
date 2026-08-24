/* Wizard draft content for consent-form templates — prefill when editing or
   creating a new version (ด.1.1.5). Registry rows in consentFormRecords.js
   carry list metadata only; full Step 1–2 state lives here per form id. */

import { resolveNextConsentFormVersion } from '@/data/consentFormVersion';
import { stripConsentScopes } from '@/data/consentFormScopes';

const TYPE_TO_TEMPLATE = {
  PDPA: 'data',
  'เบิกจ่าย': 'data',
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

const buildSections = (record) => {
  const templateKey = TYPE_TO_TEMPLATE[record.type] || 'data';
  const lead = LEAD_BY_TYPE[templateKey] || DEFAULT_LEAD;
  return [...lead, ...COMMON_CLAUSES].map((c, i) => ({
    id: `cs-${record.id}-${i}`,
    title: c.title,
    detail: c.detail,
    detailFormat: c.detailFormat || { bold: false, italic: false, underline: false },
    fieldType: c.fieldType || 'boolean',
  }));
};

/** Full Step 1–2 wizard state derived from a registry row. */
export const buildWizardDraftFromRecord = (record) => {
  if (!record) return null;
  const templateKey = TYPE_TO_TEMPLATE[record.type] || 'data';
  const scopes = stripConsentScopes(
    record.scopes || [{ group: record.group, subBranch: record.subBranch, dept: record.dept }],
  );

  return {
    template: templateKey,
    cover: 0,
    name: record.name,
    code: record.code,
    type: templateKey,
    typeLabel: record.type,
    version: record.version,
    ttl: TTL_BY_TYPE[templateKey] || '30',
    accessScopes: scopes,
    position: ['practitioner', 'dept-head'],
    docTitle: record.name,
    patientFields: ['name', 'hn', 'doctor', 'birth'],
    sections: buildSections(record),
    signatures: ['patient', 'doctor'],
    note: 'เอกสารนี้มีอายุตามที่ระบุในอายุการใช้งาน นับจากวันที่ลงนาม',
    requireGuardian: false,
    allowESign: false,
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
    version: newVersion
      ? resolveNextConsentFormVersion({ mode: 'major', fromVersion: record.version })
      : record.version,
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
