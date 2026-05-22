import { getPatientByHN } from '@/data/patientProfiles';

/* Rich recent-search rows for <PrimarySearch> — Figma PHCIS-OPD 290:48930 /
   3345:2981 (teal queue pill + indigo HN pill + name + sublabel). */

export function buildPatientSearchHistoryItem({
  id,
  leadingBadge,
  hn,
  name,
  sublabel,
}) {
  return {
    id,
    label: name,
    sublabel,
    value: name,
    badges: [
      { label: leadingBadge, tone: 'teal' },
      { label: hn, tone: 'indigo' },
    ],
    avatarSrc: getPatientByHN(hn)?.avatarUrl,
  };
}

export function buildOpdSearchHistorySeed(rows, count = 4) {
  return rows.slice(0, count).map((row) => buildPatientSearchHistoryItem({
    id: row.id,
    leadingBadge: row.queue,
    hn: row.hn,
    name: row.name,
    sublabel: row.doctor,
  }));
}

export function buildRegistrationSearchHistorySeed(rows, count = 4) {
  return rows.slice(0, count).map((row) => buildPatientSearchHistoryItem({
    id: row.id,
    leadingBadge: row.queue,
    hn: row.hn,
    name: row.name,
    sublabel: row.nationalId ? `เลขบัตร ${row.nationalId}` : (row.phone || ''),
  }));
}

export const buildTreatmentSearchHistorySeed = buildOpdSearchHistorySeed;
