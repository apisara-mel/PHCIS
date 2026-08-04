import { MOCK_PATIENTS } from '@/data/consentRecords';
import { resolveConsentPatient } from '@/data/consentPatientDisplay';
import { getPatientByHN } from '@/data/patientProfiles';
import { findMrPatientByHn } from '@/data/mrPatients';

/* Shared patient-search rows for consent PrimarySearch — same shape as
   Registration / PHCIS OPD (Figma 3345:2981): teal visit pill + indigo HN
   + full name + masked เลขบัตร / โทร. */

export const formatNationalIdMasked = (nationalId) => {
  const digits = String(nationalId ?? '').replace(/\D/g, '');
  if (digits.length !== 13) return String(nationalId ?? '');
  return `x-xxxx-xx-xx${digits[7]}-${digits.slice(-3)}`;
};

export const formatPhoneMasked = (phone) => {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.length < 4) return String(phone ?? '');
  return `xxx-xxx-${digits.slice(-4)}`;
};

const digitsOnly = (s) => String(s || '').replace(/\D/g, '');

/** Resolve display fields for a consent-directory HN. */
export const resolveConsentSearchPatient = (hn, fallbackName = '') => {
  const p = resolveConsentPatient(hn, fallbackName);
  const profile = p.isMinor ? null : getPatientByHN(p.hn);
  const mr = p.isMinor ? null : findMrPatientByHn(p.hn);
  const label = p.isMinor
    ? p.name
    : (profile?.fullName
      || (mr ? `${mr.prefixTh || ''}${mr.firstNameTh} ${mr.lastNameTh}`.trim() : p.name));
  const nationalId = digitsOnly(profile?.nationalId || mr?.nationalId);
  const phone = profile?.phone || mr?.phone || '';
  return {
    hn: p.hn,
    name: p.name,
    label,
    nationalId,
    phone,
    avatarUrl: p.avatarUrl,
  };
};

/** PrimarySearch suggestion / history row (queue pill + HN + name + PII). */
export const toConsentPatientSearchItem = (patient, { queue } = {}) => {
  const visit = queue || patient.queue;
  return {
    id: patient.hn,
    label: patient.label || patient.name,
    value: patient.label || patient.name,
    sublabel: [
      patient.nationalId ? `เลขบัตร ${formatNationalIdMasked(patient.nationalId)}` : '',
      patient.phone ? `โทร ${formatPhoneMasked(patient.phone)}` : '',
    ].filter(Boolean).join(' · ') || undefined,
    badges: [
      ...(visit ? [{ label: visit, tone: 'teal' }] : []),
      { label: patient.hn, tone: 'indigo' },
    ],
    avatarSrc: patient.avatarUrl,
  };
};

/** Full consent patient directory for search pickers. */
export const CONSENT_PATIENT_SEARCH_POOL = MOCK_PATIENTS.map((row, i) => {
  const resolved = resolveConsentSearchPatient(row.hn, row.name);
  return {
    ...resolved,
    queue: `A${String(i + 1).padStart(3, '0')}`,
  };
});

export const filterConsentPatientSearch = (query, pool = CONSENT_PATIENT_SEARCH_POOL) => {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  return pool
    .filter((p) => [
      p.hn, p.name, p.label, p.nationalId, p.phone, p.queue,
    ].some((f) => f && String(f).toLowerCase().includes(q)))
    .slice(0, 8);
};

export const consentPatientSearchSuggestions = (query, pool = CONSENT_PATIENT_SEARCH_POOL) =>
  filterConsentPatientSearch(query, pool).map((p) => toConsentPatientSearchItem(p));

export const consentPatientSearchHistorySeed = (count = 4) =>
  CONSENT_PATIENT_SEARCH_POOL.slice(0, count).map((p) => toConsentPatientSearchItem(p));
