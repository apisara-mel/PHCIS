/* TOR 1.6.4 / 1.6.1.3–1.6.1.6 — appointment settings (facility & resource holidays,
   schedule patterns, cancel-audit). In-memory prototype store. */

/** Default nested slot pattern (TOR 1.6.1.4 example shape). */
export const DEFAULT_RESOURCE_PATTERN = {
  weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
  start: '09:00',
  end: '12:00',
  majorMinutes: 60,
  minorMinutes: 6,
  capacityPerMajor: 10,
  advanceDays: 30,
};

const SEED_FACILITY = [
  { date: '2026-06-01', name: 'วันมาฆบูชา' },
  { date: '2026-06-03', name: 'วันเฉลิมพระชนมพรรษา' },
];

const SEED_CLOSED = [
  '2026-06-09', '2026-06-10', '2026-06-11',
  '2026-06-23', '2026-06-24', '2026-06-25',
];

let facilityHolidays = SEED_FACILITY.map((h) => ({ ...h }));
/** @type {Record<string, string[]>} staffId → closed ISO dates */
let resourceClosed = { __all__: [...SEED_CLOSED] };
/** @type {Record<string, typeof DEFAULT_RESOURCE_PATTERN>} */
let resourcePatterns = {};
/** @type {Array<{ id: string, at: string, actor: string, appointmentId: string, patient: string, reason: string, date: string, time: string }>} */
let cancelAudit = [];

const listeners = new Set();

const notify = () => {
  listeners.forEach((fn) => {
    try { fn(); } catch { /* ignore */ }
  });
};

export const subscribeApptSettings = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const getFacilityHolidays = () => facilityHolidays.slice();

export const addFacilityHoliday = (date, name) => {
  if (!date) return;
  if (facilityHolidays.some((h) => h.date === date)) return;
  facilityHolidays = [...facilityHolidays, { date, name: name || 'วันหยุดสถานพยาบาล' }]
    .sort((a, b) => a.date.localeCompare(b.date));
  notify();
};

export const removeFacilityHoliday = (date) => {
  facilityHolidays = facilityHolidays.filter((h) => h.date !== date);
  notify();
};

export const getResourceClosedDates = (staffId) => {
  const all = resourceClosed.__all__ || [];
  const own = staffId ? (resourceClosed[staffId] || []) : [];
  return [...new Set([...all, ...own])].sort();
};

export const addResourceClosedDate = (staffId, date) => {
  const key = staffId || '__all__';
  const cur = new Set(resourceClosed[key] || []);
  cur.add(date);
  resourceClosed = { ...resourceClosed, [key]: [...cur].sort() };
  notify();
};

export const removeResourceClosedDate = (staffId, date) => {
  const key = staffId || '__all__';
  resourceClosed = {
    ...resourceClosed,
    [key]: (resourceClosed[key] || []).filter((d) => d !== date),
  };
  notify();
};

export const getResourcePattern = (staffId) => (
  staffId && resourcePatterns[staffId] ? { ...resourcePatterns[staffId] } : null
);

export const getResourcePatternOrDefault = (staffId) => (
  getResourcePattern(staffId) || { ...DEFAULT_RESOURCE_PATTERN }
);

export const setResourcePattern = (staffId, pattern) => {
  if (!staffId) return;
  resourcePatterns = {
    ...resourcePatterns,
    [staffId]: { ...DEFAULT_RESOURCE_PATTERN, ...pattern },
  };
  notify();
};

export const getCancelAuditLog = () => cancelAudit.slice();

export const appendCancelAudit = ({
  actor = 'เจ้าหน้าที่ระบบนัดหมาย',
  appointmentId,
  patient,
  reason,
  date,
  time,
}) => {
  const row = {
    id: `CX-${Date.now()}`,
    at: new Date().toLocaleString('th-TH'),
    actor,
    appointmentId: appointmentId || '—',
    patient: patient || '—',
    reason: reason || 'ไม่ระบุ',
    date: date || '',
    time: time || '',
  };
  cancelAudit = [row, ...cancelAudit];
  notify();
  return row;
};

/** TOR 1.6.1.6 — may cancel a day schedule only when no active appointments remain. */
export const canCancelDaySchedule = (appointments, staffId, dateKey) => {
  const active = (appointments || []).filter((a) => (
    a.staffId === staffId
    && a.date === dateKey
    && a.status !== 'cancelled'
    && a.status !== 'completed'
    && a.status !== 'done'
  ));
  return { ok: active.length === 0, activeCount: active.length };
};

export const isFacilityHolidayDate = (dateKey) => (
  facilityHolidays.some((h) => h.date === dateKey)
);

export const getFacilityHolidayName = (dateKey) => (
  facilityHolidays.find((h) => h.date === dateKey)?.name || null
);

export const isResourceClosedDate = (staffId, dateKey) => {
  if (isFacilityHolidayDate(dateKey)) return true;
  return getResourceClosedDates(staffId).includes(dateKey);
};
