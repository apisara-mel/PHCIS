import { findMrPatientByHn } from '@/data/mrPatients';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  CHILD_AVATAR_BOY,
  CHILD_AVATAR_GIRL,
  PATIENT_AVATAR_POOL,
} from '@/data/avatarAssets';
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

/** ด.ช. / ด.ญ. / เด็กชาย / เด็กหญิง — ใช้รูปเด็กตามเพศ ไม่ดึงรูปผู้ใหญ่จาก profile */
export const isConsentMinorName = (name = '') =>
  /(ด\.ช\.|ด\.ญ\.|เด็กชาย|เด็กหญิง)/u.test(String(name || ''));

export const isConsentMinorGirlName = (name = '') =>
  /(ด\.ญ\.|เด็กหญิง)/u.test(String(name || ''));

export const childAvatarForName = (name = '') =>
  (isConsentMinorGirlName(name) ? CHILD_AVATAR_GIRL : CHILD_AVATAR_BOY);

/** Portrait + display name shared with registration queue and OPD screening.
    Always resolves a photo URL so consent worklist rows never show initials-only. */
export const resolveConsentPatient = (hn, fallbackName = '') => {
  const hnTrim = String(hn || '').trim();
  const lookupHn = baseConsentHn(hnTrim);
  const fallback = String(fallbackName || '').trim();
  const mr = lookupHn ? findMrPatientByHn(lookupHn) : null;
  const profile = lookupHn ? getPatientByHN(lookupHn) : null;

  const rosterName = mrPatientShortName(mr) || profile?.shortName || '';
  const candidateName = fallback || rosterName;
  const minor = isConsentMinorName(fallback) || isConsentMinorName(candidateName);

  /* ชื่อเด็กจาก worklist มาก่อน — อย่าแทนด้วยชื่อผู้ใหญ่ที่ชน HN ใน roster */
  const name = minor && isConsentMinorName(fallback)
    ? fallback
    : (minor ? candidateName : (rosterName || fallback));

  let avatarUrl;
  if (minor) {
    avatarUrl = childAvatarForName(name || fallback);
  } else {
    avatarUrl = profile?.avatarUrl || pickPoolAvatar(lookupHn || hnTrim || name);
  }

  return { hn: hnTrim, name, avatarUrl, isMinor: minor };
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

/** PatientCard shape — screening roster first, consent avatar fallback.
    Display name + avatar follow resolveConsentPatient (same as worklist table). */
export const resolveConsentPatientCard = (hn, fallbackName = '') => {
  const resolved = resolveConsentPatient(hn, fallbackName);
  const displayName = resolved.name || fallbackName || '—';
  const profile = getPatientByHN(baseConsentHn(hn));
  if (profile && !resolved.isMinor) {
    return {
      ...profile,
      hn: resolved.hn || profile.hn,
      avatarUrl: resolved.avatarUrl,
      shortName: displayName,
      fullName: displayName,
    };
  }
  return {
    hn: resolved.hn || hn,
    shortName: displayName,
    fullName: displayName,
    englishName: '',
    avatarUrl: resolved.avatarUrl,
    sex: resolved.isMinor
      ? (isConsentMinorGirlName(displayName) ? 'หญิง' : 'ชาย')
      : (profile?.sex || '—'),
    age: resolved.isMinor ? '—' : (profile?.age || '—'),
    nationalId: profile && !resolved.isMinor ? (profile.nationalId || '—') : '—',
    bloodType: profile && !resolved.isMinor ? (profile.bloodType || '—') : '—',
    patientType: profile && !resolved.isMinor ? (profile.patientType || '—') : '—',
    doctor: profile && !resolved.isMinor ? (profile.doctor || '—') : '—',
    insurance: profile && !resolved.isMinor ? (profile.insurance || '—') : '—',
    address: profile && !resolved.isMinor ? (profile.address || '—') : '—',
    vip: false,
  };
};
