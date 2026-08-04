/* TOR 1.6.4 / 1.6.1.2–1.6.1.6 / 1.6.2.7 — appointment settings store.

   Owns: resource schedule patterns, facility + resource holidays, per-date queue
   capacity overrides (1.6.1.2), the day Available / Non-available verdict (1.6.2.8),
   the cancel-audit trail (1.6.2.7) and a general settings audit log.

   Persistence: sessionStorage (same pattern as src/data/opdRoomConfig.js) so a
   page reload during a demo no longer wipes the configuration — the previous
   in-memory-only behaviour made saved settings look like they had never been
   written. React 17 — consumers subscribe with useEffect + setTick. */

const STORAGE_KEY = 'mih:appointment-settings';

const canUseSessionStorage = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const pad2 = (n) => String(n).padStart(2, '0');

const stampNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

const dayKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const parseKey = (key) => {
  const [y, m, d] = String(key || '').split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

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
  { date: '2026-08-12', name: 'วันแม่แห่งชาติ' },
  { date: '2026-10-13', name: 'วันคล้ายวันสวรรคต ร.9' },
];

const SEED_CLOSED = [
  '2026-06-09', '2026-06-10', '2026-06-11',
  '2026-06-23', '2026-06-24', '2026-06-25',
];

const emptyState = () => ({
  facilityHolidays: SEED_FACILITY.map((h) => ({ ...h })),
  resourceClosed: { __all__: [...SEED_CLOSED] },
  resourcePatterns: {},
  /** dateKey → { quota, reason, actor, at } (TOR 1.6.1.2 per-day override). */
  capacityOverrides: {},
  cancelAudit: [],
  /** Settings-level audit (โควตา / วันหยุด / ยกเลิกตารางทั้งวัน / บันทึกไม่มาตามนัด). */
  settingsAudit: [],
});

let state = null;
const listeners = new Set();

const notify = () => {
  listeners.forEach((fn) => {
    try { fn(); } catch { /* listener errors must not break the store */ }
  });
};

const persist = () => {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* quota / private mode — keep the in-memory copy */ }
};

const load = () => {
  if (state) return state;
  if (canUseSessionStorage()) {
    try {
      const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (parsed && typeof parsed === 'object' && parsed.facilityHolidays) {
        state = { ...emptyState(), ...parsed };
        return state;
      }
    } catch { /* fall through to seed */ }
  }
  state = emptyState();
  persist();
  return state;
};

const commit = (patch) => {
  state = { ...load(), ...patch };
  persist();
  notify();
};

export const subscribeApptSettings = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/* ──────────────────────────── วันหยุดสถานพยาบาล (1.6.4.1) ─────────────────── */

export const getFacilityHolidays = () => load().facilityHolidays.slice();

export const addFacilityHoliday = (date, name, { actor = 'จนท.สมพร ทองดี' } = {}) => {
  if (!date) return;
  const cur = load().facilityHolidays;
  if (cur.some((h) => h.date === date)) return;
  commit({
    facilityHolidays: [...cur, { date, name: name || 'วันหยุดสถานพยาบาล' }]
      .sort((a, b) => a.date.localeCompare(b.date)),
  });
  appendSettingsAudit({
    action: 'เพิ่มวันหยุดสถานพยาบาล',
    target: date,
    before: '—',
    after: name || 'วันหยุดสถานพยาบาล',
    actor,
  });
};

export const removeFacilityHoliday = (date, { actor = 'จนท.สมพร ทองดี' } = {}) => {
  const cur = load().facilityHolidays;
  const hit = cur.find((h) => h.date === date);
  commit({ facilityHolidays: cur.filter((h) => h.date !== date) });
  appendSettingsAudit({
    action: 'ลบวันหยุดสถานพยาบาล',
    target: date,
    before: hit?.name || '—',
    after: 'เปิดให้บริการตามปกติ',
    actor,
  });
};

/* ───────────────────────────── วันหยุด Resource (1.6.4.2) ─────────────────── */

export const getResourceClosedDates = (staffId) => {
  const { resourceClosed } = load();
  const all = resourceClosed.__all__ || [];
  const own = staffId ? (resourceClosed[staffId] || []) : [];
  return [...new Set([...all, ...own])].sort();
};

export const addResourceClosedDate = (staffId, date, { actor = 'จนท.สมพร ทองดี' } = {}) => {
  const key = staffId || '__all__';
  const { resourceClosed } = load();
  const cur = new Set(resourceClosed[key] || []);
  if (cur.has(date)) return;
  cur.add(date);
  commit({ resourceClosed: { ...resourceClosed, [key]: [...cur].sort() } });
  appendSettingsAudit({
    action: 'เพิ่มวันหยุด Resource',
    target: `${key} · ${date}`,
    before: 'เปิดให้บริการ',
    after: 'ปิดให้บริการ',
    actor,
  });
};

export const removeResourceClosedDate = (staffId, date, { actor = 'จนท.สมพร ทองดี' } = {}) => {
  const key = staffId || '__all__';
  const { resourceClosed } = load();
  commit({
    resourceClosed: {
      ...resourceClosed,
      [key]: (resourceClosed[key] || []).filter((d) => d !== date),
    },
  });
  appendSettingsAudit({
    action: 'ลบวันหยุด Resource',
    target: `${key} · ${date}`,
    before: 'ปิดให้บริการ',
    after: 'เปิดให้บริการ',
    actor,
  });
};

/* ──────────────────────── รูปแบบตาราง Resource (1.6.1.3) ──────────────────── */

export const getResourcePattern = (staffId) => {
  const { resourcePatterns } = load();
  return staffId && resourcePatterns[staffId] ? { ...resourcePatterns[staffId] } : null;
};

export const getResourcePatternOrDefault = (staffId) => (
  getResourcePattern(staffId) || { ...DEFAULT_RESOURCE_PATTERN }
);

export const setResourcePattern = (staffId, pattern, { actor = 'จนท.สมพร ทองดี', silent = true } = {}) => {
  if (!staffId) return;
  const { resourcePatterns } = load();
  const before = resourcePatterns[staffId];
  commit({
    resourcePatterns: {
      ...resourcePatterns,
      [staffId]: { ...DEFAULT_RESOURCE_PATTERN, ...pattern },
    },
  });
  if (!silent) {
    appendSettingsAudit({
      action: 'บันทึกรูปแบบตาราง Resource',
      target: String(staffId),
      before: before ? `${before.start}–${before.end} · ${before.capacityPerMajor} คิว/ชั่วโมง` : 'ค่าเริ่มต้นระบบ',
      after: `${pattern.start}–${pattern.end} · ${pattern.capacityPerMajor} คิว/ชั่วโมง`,
      actor,
    });
  }
};

/* ──────────────── โควตาคิวรายวัน / Available–Non-available (1.6.1.2 · 1.6.2.8) ── */

export const AVAILABILITY = {
  AVAILABLE: 'available',
  FULL: 'full',
  CLOSED_WEEKDAY: 'closed_weekday',
  FACILITY_HOLIDAY: 'facility_holiday',
  RESOURCE_CLOSED: 'resource_closed',
  OUT_OF_RANGE: 'out_of_range',
  PAST: 'past',
};

export const AVAILABILITY_PRESENTATION = {
  [AVAILABILITY.AVAILABLE]: { label: 'Available', style: 'success', reason: 'เปิดรับนัด' },
  [AVAILABILITY.FULL]: { label: 'Non-available', style: 'error', reason: 'เต็มโควตาคิวของวันนี้' },
  [AVAILABILITY.CLOSED_WEEKDAY]: { label: 'Non-available', style: 'neutral', reason: 'ไม่ใช่วันเปิดบริการตามรูปแบบตาราง' },
  [AVAILABILITY.FACILITY_HOLIDAY]: { label: 'Non-available', style: 'warning', reason: 'วันหยุดสถานพยาบาล' },
  [AVAILABILITY.RESOURCE_CLOSED]: { label: 'Non-available', style: 'warning', reason: 'วันหยุดของ Resource' },
  [AVAILABILITY.OUT_OF_RANGE]: { label: 'Non-available', style: 'neutral', reason: 'เกินช่วงเปิดรับนัดล่วงหน้า' },
  [AVAILABILITY.PAST]: { label: 'Non-available', style: 'neutral', reason: 'วันที่ผ่านมาแล้ว' },
};

/** โควตาเริ่มต้นจาก pattern = จำนวน major slot × ความจุต่อ major. */
export const getPatternQuota = (pattern) => {
  const p = { ...DEFAULT_RESOURCE_PATTERN, ...(pattern || {}) };
  const [sh, sm] = String(p.start).split(':').map(Number);
  const [eh, em] = String(p.end).split(':').map(Number);
  if (![sh, sm, eh, em].every(Number.isFinite)) return 0;
  const majors = Math.floor(((eh * 60 + em) - (sh * 60 + sm)) / (p.majorMinutes || 60));
  return Math.max(0, majors) * (p.capacityPerMajor || 0);
};

export const getCapacityOverrides = () => ({ ...load().capacityOverrides });

export const getCapacityOverride = (dateKey) => {
  const row = load().capacityOverrides[dateKey];
  return row ? { ...row } : null;
};

/** โควตาที่มีผลจริงของวันนั้น (override ทับ pattern). */
export const getEffectiveDailyQuota = (dateKey, staffId) => {
  const override = getCapacityOverride(dateKey);
  if (override) return override.quota;
  return getPatternQuota(getResourcePatternOrDefault(staffId));
};

/**
 * ตั้งค่าโควตาคิวรายวัน — บล็อกเมื่อโควตาใหม่น้อยกว่าจำนวนที่จองไปแล้ว.
 * @returns {{ ok: boolean, error?: string, booked?: number }}
 */
export const setCapacityOverride = (dateKey, quota, {
  bookedCount = 0,
  reason = '',
  actor = 'จนท.สมพร ทองดี',
} = {}) => {
  const next = Number(quota);
  if (!dateKey) return { ok: false, error: 'กรุณาเลือกวันที่' };
  if (!Number.isFinite(next) || next < 0) {
    return { ok: false, error: 'จำนวนคิวต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป' };
  }
  if (next < bookedCount) {
    return {
      ok: false,
      booked: bookedCount,
      error: `โควตาใหม่ (${next}) น้อยกว่าจำนวนที่จองไปแล้ว (${bookedCount}) — ต้องยกเลิก/เลื่อนนัดออกก่อน`,
    };
  }
  const before = getCapacityOverride(dateKey);
  commit({
    capacityOverrides: {
      ...load().capacityOverrides,
      [dateKey]: { quota: next, reason, actor, at: stampNow() },
    },
  });
  appendSettingsAudit({
    action: 'ปรับโควตาคิวรายวัน',
    target: dateKey,
    before: before ? `${before.quota} คิว` : 'ตามรูปแบบตาราง',
    after: next === 0 ? 'ปิดรับนัด (0 คิว)' : `${next} คิว`,
    reason,
    actor,
  });
  return { ok: true };
};

export const removeCapacityOverride = (dateKey, { actor = 'จนท.สมพร ทองดี' } = {}) => {
  const all = { ...load().capacityOverrides };
  const before = all[dateKey];
  delete all[dateKey];
  commit({ capacityOverrides: all });
  appendSettingsAudit({
    action: 'ยกเลิกการปรับโควตารายวัน',
    target: dateKey,
    before: before ? `${before.quota} คิว` : '—',
    after: 'กลับไปใช้รูปแบบตาราง',
    actor,
  });
};

/**
 * TOR 1.6.2.8 — สถานะ Available / Non-available ของวันหนึ่ง.
 * @returns {{ status, label, style, reason, quota, booked, remaining }}
 */
export const evaluateDayAvailability = ({
  dateKey,
  staffId = null,
  bookedCount = 0,
  today = new Date(),
} = {}) => {
  const pattern = getResourcePatternOrDefault(staffId);
  const quota = getEffectiveDailyQuota(dateKey, staffId);
  const remaining = Math.max(0, quota - bookedCount);
  const base = { quota, booked: bookedCount, remaining };

  const decide = (status) => ({
    status,
    ...AVAILABILITY_PRESENTATION[status],
    ...base,
  });

  const day = parseKey(dateKey);
  if (!day) return decide(AVAILABILITY.OUT_OF_RANGE);

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (day.getTime() < todayStart.getTime()) return decide(AVAILABILITY.PAST);

  if (isFacilityHolidayDate(dateKey)) return decide(AVAILABILITY.FACILITY_HOLIDAY);
  if (getResourceClosedDates(staffId).includes(dateKey)) return decide(AVAILABILITY.RESOURCE_CLOSED);

  const advance = pattern.advanceDays || DEFAULT_RESOURCE_PATTERN.advanceDays;
  const diffDays = Math.round((day.getTime() - todayStart.getTime()) / 86400000);
  if (diffDays > advance) return decide(AVAILABILITY.OUT_OF_RANGE);

  if ((pattern.weekdays || []).length
    && !pattern.weekdays.includes(WEEKDAY_KEYS[day.getDay()])) {
    return decide(AVAILABILITY.CLOSED_WEEKDAY);
  }

  if (quota > 0 && bookedCount >= quota) return decide(AVAILABILITY.FULL);
  if (quota === 0) return decide(AVAILABILITY.FULL);
  return decide(AVAILABILITY.AVAILABLE);
};

/** นับนัดที่ยัง Active ของวันนั้น — ใช้เป็น bookedCount. */
export const countActiveAppointmentsOnDate = (appointments, dateKey, staffId = null) =>
  (appointments || []).filter((a) => (
    a.date === dateKey
    && (staffId == null || String(a.staffId) === String(staffId))
    && a.status !== 'cancelled'
    && a.status !== 'no_show'
  )).length;

/* ───────────────────────── ประวัติการยกเลิกนัด (1.6.2.7) ──────────────────── */

export const getCancelAuditLog = () => load().cancelAudit.slice();

export const appendCancelAudit = ({
  actor = 'เจ้าหน้าที่ระบบนัดหมาย',
  appointmentId,
  patient,
  hn,
  reason,
  note = '',
  date,
  time,
  kind = 'ยกเลิกนัด',
}) => {
  const row = {
    id: `CX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    at: stampNow(),
    actor,
    kind,
    appointmentId: appointmentId || '—',
    patient: patient || '—',
    hn: hn || '—',
    reason: reason || 'ไม่ระบุ',
    note,
    date: date || '',
    time: time || '',
  };
  commit({ cancelAudit: [row, ...load().cancelAudit] });
  return row;
};

/* ───────────────────── Audit ของการตั้งค่า (ผู้ทำ + ก่อน→หลัง) ────────────── */

export const getSettingsAuditLog = () => load().settingsAudit.slice();

export const appendSettingsAudit = ({
  action,
  target = '—',
  before = '—',
  after = '—',
  reason = '',
  actor = 'จนท.สมพร ทองดี',
}) => {
  const row = {
    id: `SA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    at: stampNow(),
    actor,
    action,
    target,
    before,
    after,
    reason,
  };
  commit({ settingsAudit: [row, ...load().settingsAudit] });
  return row;
};

/* ─────────────────── ยกเลิกตารางทั้งวัน (1.6.1.6) + วันหยุด impact ─────────── */

/** TOR 1.6.1.6 — may cancel a day schedule only when no active appointments remain. */
export const canCancelDaySchedule = (appointments, staffId, dateKey) => {
  const active = (appointments || []).filter((a) => (
    String(a.staffId) === String(staffId)
    && a.date === dateKey
    && a.status !== 'cancelled'
    && a.status !== 'completed'
    && a.status !== 'done'
    && a.status !== 'no_show'
  ));
  return { ok: active.length === 0, activeCount: active.length, active };
};

/** นัดที่จะได้รับผลกระทบเมื่อประกาศวันหยุดทับวันที่มีนัดอยู่แล้ว. */
export const getAppointmentsImpactedByHoliday = (appointments, dateKey, staffId = null) =>
  (appointments || []).filter((a) => (
    a.date === dateKey
    && (staffId == null || String(a.staffId) === String(staffId))
    && a.status !== 'cancelled'
    && a.status !== 'no_show'
  ));

export const isFacilityHolidayDate = (dateKey) => (
  load().facilityHolidays.some((h) => h.date === dateKey)
);

export const getFacilityHolidayName = (dateKey) => (
  load().facilityHolidays.find((h) => h.date === dateKey)?.name || null
);

export const isResourceClosedDate = (staffId, dateKey) => {
  if (isFacilityHolidayDate(dateKey)) return true;
  return getResourceClosedDates(staffId).includes(dateKey);
};

/** Demo helper — wipe every saved setting back to the seeded state. */
export const resetApptSettings = () => {
  state = emptyState();
  persist();
  notify();
};

export { dayKey as apptSettingsDayKey };
