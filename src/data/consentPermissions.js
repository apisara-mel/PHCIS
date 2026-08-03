/* Consent module ABAC — maps session role to action permissions (ด.1.1.14). */

const ROLE_KEY = 'mih:consent-session-role';

export const CONSENT_ROLES = ['Admin', 'Editor', 'Viewer'];

export const getConsentRole = () => {
  if (typeof window === 'undefined') return 'Admin';
  return localStorage.getItem(ROLE_KEY) || 'Admin';
};

export const setConsentRole = (role) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ROLE_KEY, CONSENT_ROLES.includes(role) ? role : 'Admin');
};

export const canManageConsent = () => getConsentRole() !== 'Viewer';

export const canRevokeConsent = () => getConsentRole() === 'Admin' || getConsentRole() === 'Editor';

export const canExportConsent = () => getConsentRole() !== 'Viewer';

export const canCreateConsentRequest = () => getConsentRole() !== 'Viewer';
