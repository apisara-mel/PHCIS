import { findMrPatientByHn } from '@/data/mrPatients';
import { getPatientByHN } from '@/data/patientProfiles';
import { resolveConsentFormForWorklistType } from '@/data/consentFormRecords';

/** Short name from MR registration roster (first + last, no prefix). */
export const mrPatientShortName = (mr) => {
  if (!mr) return '';
  return [mr.firstNameTh, mr.lastNameTh].filter(Boolean).join(' ');
};

/** Portrait + display name shared with registration queue and OPD screening. */
export const resolveConsentPatient = (hn, fallbackName = '') => {
  const hnTrim = String(hn || '').trim();
  const fallback = String(fallbackName || '').trim();
  const isMinorLabel = /^(ด\.ช\.|ด\.ญ\.|เด็กชาย|เด็กหญิง)/u.test(fallback);
  const mr = hnTrim ? findMrPatientByHn(hnTrim) : null;
  const profile = hnTrim ? getPatientByHN(hnTrim) : null;
  const name = isMinorLabel
    ? fallback
    : (mrPatientShortName(mr) || profile?.shortName || fallback);
  let avatarUrl = profile?.avatarUrl;
  if (isMinorLabel) {
    avatarUrl = /ด\.ญ\.|เด็กหญิง/u.test(fallback)
      ? '/avatars/patient-female-a.png'
      : '/avatars/mock-male-asian-b.png';
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
