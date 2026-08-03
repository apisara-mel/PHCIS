/* PHCIS staff session — mock login email persisted from /login.
   Production replaces this with the auth token / session API. */

import { USERS } from '@/data/usersAccess';

const SESSION_EMAIL_KEY = 'mih:phcis-session-email';

/** Default demo account — matches hub/sidebar (พญ.สมหญิง รักษ์ดี). */
export const DEFAULT_SESSION_EMAIL = 'somying.r@phcis.bma.go.th';

export const normalizeSessionLogin = (raw) => {
  const v = String(raw || '').trim().toLowerCase();
  if (!v) return DEFAULT_SESSION_EMAIL;
  if (v.includes('@')) return v;
  const byEmailPrefix = USERS.find((u) => u.email.toLowerCase().split('@')[0] === v);
  if (byEmailPrefix) return byEmailPrefix.email.toLowerCase();
  const byId = USERS.find((u) => u.id.toLowerCase() === v);
  if (byId) return byId.email.toLowerCase();
  return DEFAULT_SESSION_EMAIL;
};

export const getSessionEmail = () => {
  if (typeof window === 'undefined') return DEFAULT_SESSION_EMAIL;
  return localStorage.getItem(SESSION_EMAIL_KEY) || DEFAULT_SESSION_EMAIL;
};

export const setSessionEmail = (raw) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_EMAIL_KEY, normalizeSessionLogin(raw));
};

export const clearSessionEmail = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_EMAIL_KEY);
};

export const getSessionUser = () => {
  const email = getSessionEmail().toLowerCase();
  return USERS.find((u) => u.email.toLowerCase() === email) || null;
};
