/* PHCIS | Consent — user-saved wizard drafts (localStorage).
   Rows merge into แบบฟอร์มความยินยอม → แท็บ "ที่ร่างไว้". */

import { CONSENT_FORM_RECORDS } from '@/data/consentFormRecords';
import { stripConsentScopes } from '@/data/consentFormScopes';
import {
  DEFAULT_PATIENT_FIELD_KEYS,
  DEFAULT_SIGNATURE_KEYS,
  normalizeFieldKeys,
} from '@/data/consentFormFieldKeys';

const STORAGE_KEY = 'mih:consent-form-drafts';
const DRAFT_ID_BASE = 900_001;

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

export const CONSENT_FORM_DRAFTS_EVENT = 'mih:consent-form-drafts';

const uid = () => {
  const drafts = readConsentFormDrafts();
  const maxId = drafts.reduce(
    (max, d) => (typeof d.id === 'number' && d.id >= DRAFT_ID_BASE ? Math.max(max, d.id) : max),
    DRAFT_ID_BASE - 1,
  );
  return maxId + 1;
};

export function formatConsentFormThaiDate(d = new Date()) {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getDate()} ${THAI_MONTHS_SHORT[date.getMonth()]} ${date.getFullYear() + 543}`;
}

/** Relative Thai copy for footer "บันทึกล่าสุด: …" */
export function formatRelativeSavedThai(d) {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 10) return 'เมื่อสักครู่';
  if (sec < 60) return `${sec} วินาทีที่แล้ว`;
  const mins = Math.floor(sec / 60);
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  return formatConsentFormThaiDate(date);
}

export function readConsentFormDrafts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeConsentFormDrafts(drafts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CONSENT_FORM_DRAFTS_EVENT));
  }
}

export function getConsentFormDraftById(id) {
  if (id == null || id === '') return null;
  return readConsentFormDrafts().find(
    (d) => d.id === Number(id) || String(d.id) === String(id),
  ) || null;
}

export function buildWizardPrefillFromDraft(entry) {
  if (!entry?.wizard) return null;
  const w = entry.wizard;
  return {
    ...w,
    draftId: entry.id,
    savedAt: entry.savedAt,
    patientFields: normalizeFieldKeys(w.patientFields, DEFAULT_PATIENT_FIELD_KEYS),
    signatures: normalizeFieldKeys(w.signatures, DEFAULT_SIGNATURE_KEYS),
  };
}

function buildRegistryRowFromWizard(wizard, { id, createdDate, savedAt }) {
  const scopes = stripConsentScopes(wizard.accessScopes || []);
  const positions = Array.isArray(wizard.position) ? wizard.position : [];
  const primary = scopes[0] || {};
  const trimmedName = String(wizard.name || '').trim();
  const trimmedCode = String(wizard.code || '').trim();
  return {
    id,
    code: trimmedCode || '—',
    name: trimmedName || 'แบบฟอร์มร่าง (ไม่มีชื่อ)',
    type: 'PDPA',
    version: String(wizard.version || '').trim() || 'V 1.0',
    group: primary.group || '—',
    subBranch: primary.subBranch || '—',
    dept: primary.dept || '—',
    scopes,
    positions,
    moreCount: Math.max(0, scopes.length - 1),
    createdDate: createdDate || formatConsentFormThaiDate(savedAt),
    updatedDate: formatConsentFormThaiDate(savedAt),
    creator: 'ผู้ใช้งาน',
    status: 'ร่าง',
    isUserDraft: true,
    draftSavedAt: savedAt,
  };
}

/**
 * Persist wizard state as a draft registry row + payload.
 * @returns {{ id: number, savedAt: Date, row: object }}
 */
export function saveConsentFormWizardDraft(wizard, { draftId } = {}) {
  const drafts = readConsentFormDrafts();
  const now = new Date();
  const existingIdx = draftId != null
    ? drafts.findIndex((d) => d.id === Number(draftId) || String(d.id) === String(draftId))
    : -1;
  const id = existingIdx >= 0 ? drafts[existingIdx].id : uid();
  const createdDate = existingIdx >= 0
    ? drafts[existingIdx].registry?.createdDate
    : formatConsentFormThaiDate(now);

  const wizardPayload = {
    step: wizard.step ?? 0,
    template: wizard.template ?? 'blank',
    cover: wizard.cover ?? 0,
    name: wizard.name ?? '',
    code: wizard.code ?? '',
    type: wizard.type ?? 'data',
    version: wizard.version ?? '',
    ttl: wizard.ttl ?? '',
    accessScopes: wizard.accessScopes ?? [],
    position: wizard.position ?? [],
    docTitle: wizard.docTitle ?? '',
    patientFields: normalizeFieldKeys(wizard.patientFields, DEFAULT_PATIENT_FIELD_KEYS),
    sections: wizard.sections ?? [],
    signatures: normalizeFieldKeys(wizard.signatures, DEFAULT_SIGNATURE_KEYS),
    note: wizard.note ?? '',
    requireGuardian: !!wizard.requireGuardian,
    allowESign: wizard.allowESign !== false,
  };

  const savedAt = now.toISOString();
  const registry = buildRegistryRowFromWizard(wizardPayload, { id, createdDate, savedAt: now });
  const entry = { id, savedAt, registry, wizard: wizardPayload };

  if (existingIdx >= 0) drafts[existingIdx] = entry;
  else drafts.unshift(entry);

  writeConsentFormDrafts(drafts);
  return { id, savedAt: now, row: registry };
}

/** Mock registry rows + user drafts (drafts appear first). */
export function getMergedConsentFormRecords(baseRecords = CONSENT_FORM_RECORDS) {
  const draftRows = readConsentFormDrafts().map((d) => d.registry);
  return [...draftRows, ...(baseRecords || [])];
}
