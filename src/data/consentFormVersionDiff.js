import { consentScopeKey, CONSENT_POSITION_OPTIONS } from '@/data/consentFormScopes';
import { formatVersionTransition } from '@/data/consentFormVersion';

const PATIENT_FIELD_LABELS = {
  name: 'ชื่อ-นามสกุล',
  hn: 'HN',
  doctor: 'แพทย์ผู้รักษา',
  birth: 'วันเกิด',
  id: 'เลขบัตรประชาชน',
  address: 'ที่อยู่',
};

const SIGNATURE_LABELS = {
  patient: 'ผู้ป่วย',
  doctor: 'แพทย์',
  guardian: 'ผู้ปกครอง',
  witness: 'พยาน',
  nurse: 'พยาบาล',
};

const TTL_LABELS = {
  30: '30 วัน',
  90: '90 วัน',
  180: '180 วัน',
  365: '1 ปี (365 วัน)',
};

const formatTtlDisplay = (ttl) => {
  if (ttl == null || ttl === '' || ttl === '—') return '—';
  const key = String(ttl).trim();
  if (TTL_LABELS[key]) return TTL_LABELS[key];
  if (/^\d+$/.test(key)) return `${key} วัน`;
  return key;
};

/** Keep diff cells render-safe — long voice transcripts must not blow up Step 4. */
const formatDiffCell = (value, maxLen = 240) => {
  if (value == null || value === '') return '—';
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (!text) return '—';
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}…`;
};

const change = (label, before, after) => ({
  label,
  before: formatDiffCell(before),
  after: formatDiffCell(after),
});

const listDiff = (label, beforeList = [], afterList = [], fmt = (v) => v) => {
  const beforeSet = new Set(beforeList);
  const afterSet = new Set(afterList);
  const added = afterList.filter((v) => !beforeSet.has(v));
  const removed = beforeList.filter((v) => !afterSet.has(v));
  if (!added.length && !removed.length) return null;
  return change(
    label,
    removed.length ? removed.map(fmt).join(', ') : '—',
    added.length ? added.map(fmt).join(', ') : '—',
  );
};

const scopeLabel = (s) => (
  s ? `${s.group || '—'} / ${s.subBranch || '—'} / ${s.dept || '—'}` : '—'
);

const scopeFmt = (scopes, key) => {
  const scope = scopes.find((s) => consentScopeKey(s) === key);
  return scope ? scopeLabel(scope) : key;
};

const positionLabel = (value) =>
  CONSENT_POSITION_OPTIONS.find((o) => o.value === value)?.label || value;

const sectionSignature = (sections = []) =>
  sections.map((s) => `${s.title?.trim()}|${s.detail?.trim()}|${s.fieldType || 'boolean'}`).join('\n');

/** Normalise wizard state (live or draft prefill) into a comparable snapshot. */
export const buildWizardSnapshot = ({
  name = '',
  code = '',
  version = '',
  ttl = '',
  type = '',
  accessScopes = [],
  position = [],
  patientFields,
  sections = [],
  signatures,
  note = '',
  requireGuardian = false,
  allowESign = true,
  docTitle = '',
} = {}) => ({
  name: String(name || '').trim(),
  code: String(code || '').trim(),
  version: String(version || '').trim(),
  ttl: String(ttl || '').trim(),
  type: String(type || '').trim(),
  docTitle: String(docTitle || '').trim(),
  note: String(note || '').trim(),
  requireGuardian: Boolean(requireGuardian),
  allowESign: Boolean(allowESign),
  accessScopeKeys: [...accessScopes].filter(Boolean).map(consentScopeKey).sort(),
  accessScopes: [...accessScopes].filter(Boolean),
  position: [...(position || [])].sort(),
  patientFields: [...(patientFields instanceof Set ? patientFields : patientFields || [])].sort(),
  signatures: [...(signatures instanceof Set ? signatures : signatures || [])].sort(),
  sections: sections.filter(Boolean).map((s) => ({
    title: String(s.title || '').trim(),
    detail: String(s.detail || '').trim(),
    fieldType: s.fieldType || 'boolean',
  })),
});

/** Compare baseline vs current wizard snapshots for Step 4 review. */
export const buildConsentFormWizardDiff = (baseline, current) => {
  if (!baseline || !current) return { hasChanges: false, groups: [] };

  const b = buildWizardSnapshot(baseline);
  const c = buildWizardSnapshot(current);
  const groups = [];

  const basics = [];
  if (b.version !== c.version) basics.push(change('เวอร์ชัน', b.version, c.version));
  if (b.name !== c.name) basics.push(change('ชื่อแบบฟอร์ม', b.name, c.name));
  if (b.code !== c.code) basics.push(change('รหัสแบบฟอร์ม', b.code, c.code));
  if (b.ttl !== c.ttl) {
    basics.push(change('อายุการใช้งาน', formatTtlDisplay(b.ttl), formatTtlDisplay(c.ttl)));
  }
  if (b.docTitle !== c.docTitle) basics.push(change('ชื่อเอกสาร', b.docTitle, c.docTitle));
  if (basics.length) groups.push({ id: 'basics', label: 'ข้อมูลพื้นฐาน', changes: basics });

  const access = [];
  const scopeDiff = listDiff(
    'กิจกรรม / กิจกรรมย่อย / แผนก',
    b.accessScopeKeys,
    c.accessScopeKeys,
    (key) => scopeFmt(b.accessScopes.concat(c.accessScopes), key),
  );
  if (scopeDiff) access.push(scopeDiff);
  const posDiff = listDiff('ตำแหน่งที่มีสิทธิเข้าถึงได้', b.position, c.position, positionLabel);
  if (posDiff) access.push(posDiff);
  if (access.length) groups.push({ id: 'access', label: 'ผู้ที่มีสิทธิเข้าถึงได้', changes: access });

  const content = [];
  const patientDiff = listDiff(
    'ข้อมูลผู้ป่วย',
    b.patientFields,
    c.patientFields,
    (k) => PATIENT_FIELD_LABELS[k] || k,
  );
  if (patientDiff) content.push(patientDiff);
  const sigDiff = listDiff(
    'ลายมือชื่อ',
    b.signatures,
    c.signatures,
    (k) => SIGNATURE_LABELS[k] || k,
  );
  if (sigDiff) content.push(sigDiff);
  if (b.note !== c.note) content.push(change('หมายเหตุท้ายเอกสาร', b.note, c.note));
  if (b.requireGuardian !== c.requireGuardian) {
    content.push(change('ต้องกรอกผู้ปกครอง', b.requireGuardian ? 'ใช่' : 'ไม่', c.requireGuardian ? 'ใช่' : 'ไม่'));
  }
  if (b.allowESign !== c.allowESign) {
    content.push(change('อนุญาต e-Signature', b.allowESign ? 'ใช่' : 'ไม่', c.allowESign ? 'ใช่' : 'ไม่'));
  }

  if (sectionSignature(b.sections) !== sectionSignature(c.sections)) {
    const maxLen = Math.max(b.sections.length, c.sections.length);
    const clauseChanges = [];
    for (let i = 0; i < maxLen; i += 1) {
      const before = b.sections[i];
      const after = c.sections[i];
      if (!before && after) {
        clauseChanges.push(change(`ข้อที่ ${i + 1}`, '—', after.title || '(ไม่มีหัวข้อ)'));
      } else if (before && !after) {
        clauseChanges.push(change(`ข้อที่ ${i + 1}`, before.title || '(ไม่มีหัวข้อ)', '—'));
      } else if (before && after && (before.title !== after.title || before.detail !== after.detail)) {
        clauseChanges.push(change(
          `ข้อที่ ${i + 1}`,
          before.title || '(ไม่มีหัวข้อ)',
          after.title || '(ไม่มีหัวข้อ)',
        ));
      }
    }
    if (clauseChanges.length) content.push(...clauseChanges);
    else content.push(change('ข้อความยินยอม', `${b.sections.length} ข้อ`, `${c.sections.length} ข้อ`));
  }
  if (content.length) groups.push({ id: 'content', label: 'เนื้อหาเอกสาร', changes: content });

  return {
    hasChanges: groups.length > 0,
    groups,
    versionTransition: b.version !== c.version
      ? formatVersionTransition(b.version, c.version)
      : null,
  };
};
