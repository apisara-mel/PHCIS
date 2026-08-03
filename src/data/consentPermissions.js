/* Consent module ABAC — maps logged-in staff email to action permissions (ด.1.1.14). */

import { getSessionUser } from '@/data/phcisSession';

export const CONSENT_ROLES = ['Admin', 'Editor', 'Viewer'];

const consentRoleFromUser = (user) => {
  if (!user) return 'Viewer';
  if (user.role === 'admin') return 'Admin';
  if (user.role === 'doctor') return 'Editor';
  return 'Viewer';
};

/** Resolve Consent Admin / Editor / Viewer from the current login email. */
export const getConsentRole = () => consentRoleFromUser(getSessionUser());

export const canManageConsent = () => getConsentRole() !== 'Viewer';

export const canRevokeConsent = () => {
  const role = getConsentRole();
  return role === 'Admin' || role === 'Editor';
};

export const canExportConsent = () => getConsentRole() !== 'Viewer';

export const canCreateConsentRequest = () => getConsentRole() !== 'Viewer';
