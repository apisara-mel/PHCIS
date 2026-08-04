import { findMrPatientByHn } from '@/data/mrPatients';
import { getPatientByHN } from '@/data/patientProfiles';
import { PATIENT_AVATAR_POOL } from '@/data/avatarAssets';
import { resolveConsentFormForWorklistType } from '@/data/consentFormRecords';

/** Short name from MR registration roster (first + last, no prefix). */
export const mrPatientShortName = (mr) => {
  if (!mr) return '';
  return [mr.firstNameTh, mr.lastNameTh].filter(Boolean).join(' ');
};

/** Mock worklist may suffix HN with `-2`, `-3`, … when cycling the same patient. */
const baseConsentHn = (hn) => {
  const raw = String(hn || '').trim();
  const m = raw.match(/^(\d{2}-\d{5})(?:-\d+)?$/);
  return m ? m[1] : raw;
};

const pickPoolAvatar = (seed) => {
  const digits = parseInt(String(seed || '').replace(/\D/g, ''), 10);
  const idx = Number.isFinite(digits) ? Math.abs(digits) % PATIENT_AVATAR_POOL.length : 0;
  return PATIENT_AVATAR_POOL[idx];
};

/** Portrait + display name shared with registration queue and OPD screening.
    Always resolves a photo URL so consent worklist rows never show initials-only. */
export const resolveConsentPatient = (hn, fallbackName = '') => {
  const hnTrim = String(hn || '').trim();
  const lookupHn = baseConsentHn(hnTrim);
  const fallback = String(fallbackName || '').trim();
  const isMinorLabel = /^(ด\.ช\.|ด\.ญ\.|เด็กชาย|เด็กหญิง)/u.test(fallback);
  const mr = lookupHn ? findMrPatientByHn(lookupHn) : null;
  const profile = lookupHn ? getPatientByHN(lookupHn) : null;
  const name = isMinorLabel
    ? fallback
    : (mrPatientShortName(mr) || profile?.shortName || fallback);
  let avatarUrl = profile?.avatarUrl;
  if (isMinorLabel) {
    avatarUrl = /ด\.ญ\.|เด็กหญิง/u.test(fallback)
      ? '/avatars/patient-female-a.png'
      : '/avatars/mock-male-asian-b.png';
  }
  if (!avatarUrl) {
    avatarUrl = pickPoolAvatar(lookupHn || hnTrim || name);
  }
  return { hn: hnTrim, name, avatarUrl };
};

/** Attach resolved name + avatar + form label for consent worklist rendering. */
export const enrichConsentRow = (row) => {
  const patient = resolveConsentPatient(row?.hn, row?.name);
  const form = row?.formName
    ? { formCode: row.formCode, formName: row.formName }
    : resolveConsentFormForWorklistType(row?.type);
  return {
    ...row,
    name: patient.name,
    avatarUrl: patient.avatarUrl,
    formCode: form.formCode,
    formName: form.formName,
  };
};
