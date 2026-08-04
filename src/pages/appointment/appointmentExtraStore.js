/* Appointments created OUTSIDE the /appointment page — from the รับนัดหมาย inbox
   (/appointment/requests) and the นัดต่อเนื่อง/นัดกลุ่ม builder (/appointment/recurring).

   `AppointmentPage` owns `INITIAL_APPOINTMENTS` in React state, so a sibling route
   cannot push into it. This store is the shared hand-off: every page reads
   `INITIAL_APPOINTMENTS.concat(getExtraAppointments())`, and the two builder routes
   append here. sessionStorage-backed · React 17 subscribe+tick. */

const STORAGE_KEY = 'mih:appointment-extra-rows';

const canUseSessionStorage = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

let rows = null;
const listeners = new Set();

const notify = () => {
  listeners.forEach((fn) => {
    try { fn(); } catch { /* listener errors must not break the store */ }
  });
};

const persist = () => {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch { /* quota / private mode */ }
};

const load = () => {
  if (rows) return rows;
  if (canUseSessionStorage()) {
    try {
      const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (Array.isArray(parsed)) {
        rows = parsed;
        return rows;
      }
    } catch { /* fall through */ }
  }
  rows = [];
  persist();
  return rows;
};

export const subscribeExtraAppointments = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const getExtraAppointments = () => load().map((r) => ({ ...r }));

/** Merge helper used by every page that renders the appointment list/calendar. */
export const withExtraAppointments = (base) => [...(base || []), ...getExtraAppointments()];

export const addExtraAppointments = (newRows) => {
  const list = Array.isArray(newRows) ? newRows : [newRows];
  if (!list.length) return [];
  const stamped = list.map((r) => ({ ...r }));
  rows = [...load(), ...stamped];
  persist();
  notify();
  return stamped;
};

export const updateExtraAppointment = (id, patch) => {
  const list = load();
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const next = { ...list[idx], ...patch };
  rows = list.map((r, i) => (i === idx ? next : r));
  persist();
  notify();
  return { ...next };
};

export const removeExtraAppointmentsBySeries = (seriesId) => {
  if (!seriesId) return 0;
  const list = load();
  const kept = list.filter((r) => r.seriesId !== seriesId);
  const removed = list.length - kept.length;
  rows = kept;
  persist();
  notify();
  return removed;
};

export const resetExtraAppointments = () => {
  rows = [];
  persist();
  notify();
};
