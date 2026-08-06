import {
  formatConsentFormVersion,
  getDefaultConsentFormVersion,
  getNextConsentFormVersionForCode,
  parseConsentFormVersion,
} from '@/data/consentFormRecords';

export {
  formatConsentFormVersion,
  getDefaultConsentFormVersion,
  getNextConsentFormVersionForCode,
  parseConsentFormVersion,
};

/** Published-template bump — major increment (ด.1.1.5): `V 2.1` → `V 3.0`. */
export const bumpConsentFormVersionMajor = (version) => {
  const parsed = parseConsentFormVersion(version);
  if (!parsed) return 'V 2.0';
  return formatConsentFormVersion(parsed.major + 1, 0);
};

/** Same major line — minor increment: `V 1.0` → `V 1.1`. */
export const bumpConsentFormVersionMinor = (version) => {
  const parsed = parseConsentFormVersion(version);
  if (!parsed) return 'V 1.1';
  return formatConsentFormVersion(parsed.major, parsed.minor + 1);
};

/** Back-compat alias used by version-history UI and bump dialogs. */
export const bumpVersion = bumpConsentFormVersionMajor;

/**
 * Single entry for “what is the next version string?”
 * - major: new published version from an existing template (TOR ด.1.1.5)
 * - minor: increment patch on the same major line
 * - code-next: next free version for a form code in the registry (create flow)
 */
export const resolveNextConsentFormVersion = ({
  mode = 'major',
  fromVersion,
  code,
  records,
} = {}) => {
  if (mode === 'code-next') return getNextConsentFormVersionForCode(code, records);
  if (mode === 'minor') return bumpConsentFormVersionMinor(fromVersion);
  return bumpConsentFormVersionMajor(fromVersion);
};

export const formatVersionTransition = (fromVersion, toVersion) =>
  `${fromVersion || '—'} → ${toVersion || '—'}`;
