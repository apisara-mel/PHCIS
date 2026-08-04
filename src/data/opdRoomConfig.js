/* TOR 1.2.7.1–1.2.7.2 — daily exam-room + quota configuration store.
   sessionStorage-backed, keyed by service date (YYYY-MM-DD). The walk-in
   request slot picker (/opd/requests) READS this store; the room-config page
   (/opd/room-config) WRITES it. Both tolerate the other's absence — when no
   config is saved for a date, defaults below apply. */

const STORAGE_KEY = 'mih:opd-room-config';

const canUseSessionStorage = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

export const ROOM_PERIODS = ['เช้า', 'บ่าย'];

export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const offsetKey = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return todayKey(d);
};

/* Default room grid — 4 exam rooms × เช้า/บ่าย. Doctor names must exist in
   appointmentDoctorRoster (read-only import happens at the page level; the
   store only keeps the chosen names as strings). */
export const DEFAULT_ROOMS = [
  { room: 'ห้องตรวจที่ 1', period: 'เช้า', doctor: 'นพ. วันชัย อยู่เย็น' },
  { room: 'ห้องตรวจที่ 1', period: 'บ่าย', doctor: 'นพ. อนุชา แก้วใส' },
  { room: 'ห้องตรวจที่ 2', period: 'เช้า', doctor: 'นพ. กิตติพงศ์ แสงทอง' },
  { room: 'ห้องตรวจที่ 2', period: 'บ่าย', doctor: 'พญ. อรุณี ชัยมงคล' },
  { room: 'ห้องตรวจที่ 3', period: 'เช้า', doctor: 'นพ. จักรพงษ์ โสยรวา' },
  { room: 'ห้องตรวจที่ 3', period: 'บ่าย', doctor: 'พญ. วิภา รักษ์ดี' },
  { room: 'ห้องตรวจที่ 4', period: 'เช้า', doctor: 'พญ. นลินี รุ่งเรือง' },
  { room: 'ห้องตรวจที่ 4', period: 'บ่าย', doctor: 'นพ. บดินทร์ สุขสันต์' },
];

/* Default per-service-unit quotas + current booked counts (mock booked
   figures are stable so validation "quota >= booked" is exercisable). */
export const DEFAULT_QUOTAS = [
  { unit: 'อายุรกรรม', quota: 40, booked: 28 },
  { unit: 'ศัลยกรรม', quota: 24, booked: 17 },
  { unit: 'กุมารเวช', quota: 30, booked: 12 },
  { unit: 'จิตเวช', quota: 16, booked: 15 },
  { unit: 'ตรวจรักษา', quota: 60, booked: 44 },
];

/* Seed history — two previous days already configured, so the
   "คัดลอกจากประวัติ" popup has real entries on first run. */
const SEED_HISTORY = {
  [offsetKey(-1)]: {
    rooms: DEFAULT_ROOMS.map((r) => ({ ...r })),
    quotas: DEFAULT_QUOTAS.map((q) => ({ ...q, booked: Math.max(0, q.booked - 4) })),
    savedBy: 'จนท.สมพร ทองดี',
    savedAt: `${offsetKey(-1)} 07:45`,
    note: 'ตั้งค่าประจำวัน',
  },
  [offsetKey(-2)]: {
    rooms: DEFAULT_ROOMS.map((r, i) => (
      i === 4 ? { ...r, doctor: 'พญ. อรุณี ชัยมงคล' } : { ...r }
    )),
    quotas: DEFAULT_QUOTAS.map((q) => ({ ...q, booked: Math.max(0, q.booked - 9) })),
    savedBy: 'จนท.วีระ พงษ์พานิช',
    savedAt: `${offsetKey(-2)} 07:50`,
    note: 'สลับแพทย์ห้อง 3 (ลาประชุม)',
  },
};

const readAll = () => {
  if (!canUseSessionStorage()) return { ...SEED_HISTORY };
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (parsed && typeof parsed === 'object') return parsed;
  } catch { /* fall through to seed */ }
  const seeded = { ...SEED_HISTORY };
  if (canUseSessionStorage()) {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  }
  return seeded;
};

const writeAll = (all) => {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(all));
};

/** Config for a date, or null when the date has never been saved. */
export const getRoomConfig = (dateKey) => {
  const all = readAll();
  const cfg = all[dateKey];
  return cfg ? JSON.parse(JSON.stringify(cfg)) : null;
};

/** Config for a date with defaults applied — what readers should consume. */
export const getRoomConfigOrDefault = (dateKey) => (
  getRoomConfig(dateKey) || {
    rooms: DEFAULT_ROOMS.map((r) => ({ ...r })),
    quotas: DEFAULT_QUOTAS.map((q) => ({ ...q })),
    savedBy: null,
    savedAt: null,
    isDefault: true,
  }
);

/** All saved dates (newest first) — feeds the copy-from-history popup. */
export const listRoomConfigDates = () => Object.keys(readAll()).sort().reverse();

export const saveRoomConfig = (dateKey, { rooms, quotas, note, savedBy }) => {
  const all = readAll();
  const now = new Date();
  const stamp = `${todayKey(now)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  all[dateKey] = {
    rooms: (rooms || []).map((r) => ({ ...r })),
    quotas: (quotas || []).map((q) => ({ ...q })),
    savedBy: savedBy || 'จนท.สมพร ทองดี',
    savedAt: stamp,
    note: note || '',
  };
  writeAll(all);
  return all[dateKey];
};

/** Quota row for a service unit on a date (default-tolerant). */
export const getQuotaForUnit = (dateKey, unit) => {
  const cfg = getRoomConfigOrDefault(dateKey);
  return cfg.quotas.find((q) => q.unit === unit) || null;
};

/** Room configured for a (doctor, period) pair on a date — null when the
    doctor has no room that period. The walk-in slot picker uses this so the
    doctor→room binding staff recorded on /opd/room-config is what drives the
    per-room-per-period queue numbering (TOR 1.2.1.6), instead of an
    array-index guess. */
export const getRoomForDoctorPeriod = (dateKey, doctor, period) => {
  if (!doctor) return null;
  const cfg = getRoomConfigOrDefault(dateKey);
  const hit = cfg.rooms.find((r) => r.doctor === doctor && r.period === period);
  return hit ? hit.room : null;
};

/** Increment the persisted `booked` count of one quota row.
    The walk-in board calls this when it issues a slot so /opd/room-config and
    /opd/requests report the SAME occupancy for a department — the store stays
    the single source of truth instead of each page adding its own client-side
    tally. Creates the date's config from defaults when it was never saved. */
export const incrementQuotaBooked = (dateKey, unit, delta = 1) => {
  const all = readAll();
  const base = all[dateKey] || getRoomConfigOrDefault(dateKey);
  const quotas = (base.quotas || []).map((q) => (
    q.unit === unit ? { ...q, booked: Math.max(0, Number(q.booked || 0) + delta) } : { ...q }
  ));
  const now = new Date();
  const stamp = `${todayKey(now)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  all[dateKey] = {
    ...base,
    rooms: (base.rooms || []).map((r) => ({ ...r })),
    quotas,
    /* A date that only ever got an implicit walk-in update still needs a
       readable audit line — the copy-from-history popup prints savedBy/savedAt
       verbatim and would otherwise show "null". */
    savedBy: base.savedBy || 'ระบบ (คำขอ Walk-in)',
    savedAt: stamp,
    note: base.note || 'อัปเดตยอดรับจากการให้ Slot คำขอ Walk-in',
  };
  delete all[dateKey].isDefault;
  writeAll(all);
  return quotas.find((q) => q.unit === unit) || null;
};
