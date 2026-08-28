const STORAGE_KEY = 'mih:opd-screening-drafts';

const canUseSessionStorage = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const rowKey = ({ queue, hn, name } = {}) =>
  [queue || '', hn || '', name || ''].join('|');

const readDraftKeys = () => {
  if (!canUseSessionStorage()) return [];
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
};

const writeDraftKeys = (keys) => {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(keys)]));
};

export const saveOpdScreeningDraft = (patient = {}) => {
  const key = rowKey(patient);
  if (!key.replace(/\|/g, '')) return;
  writeDraftKeys([...readDraftKeys(), key]);
};

export const applyOpdScreeningDrafts = (rows = []) => {
  const draftKeys = new Set(readDraftKeys());
  if (draftKeys.size === 0) return rows;

  return rows.map((row) => {
    const key = rowKey(row);
    return draftKeys.has(key)
      ? { ...row, statusKey: 'draft' }
      : row;
  });
};

/* ── TOR 1.2.2.2 + 1.2.3.4 — round-aware screening records ──────────────
   Each patient (keyed by HN) keeps an append-only list of screening rounds.
   A round records who screened, when, and the per-station enter/leave
   timestamps (สถานี · เวลาเริ่ม · เวลาเสร็จ · ผู้ให้บริการ) that feed the
   Step-5 audit table. Rounds are never edited in place — คัดกรองซ้ำ appends
   round N+1 and earlier rounds become read-only history. */

const ROUNDS_KEY = 'mih:opd-screening-rounds';

/* Queue statuses that mean "the screening round for this visit is complete".
   Single definition shared by QueuePage (which decides แสดง vs คัดกรอง on the
   row action) and ScreeningPage (which decides whether to offer อ่านอย่างเดียว
   vs คัดกรองซ้ำ) so the two cannot drift apart again. */
export const COMPLETED_SCREENING_STATUSES = ['screened', 'done'];

export const isScreeningCompleted = (statusKey) =>
  COMPLETED_SCREENING_STATUSES.includes(statusKey);

const nowStamp = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const readRoundsMap = () => {
  if (!canUseSessionStorage()) return {};
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(ROUNDS_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeRoundsMap = (map) => {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.setItem(ROUNDS_KEY, JSON.stringify(map));
};

/** All rounds for an HN, oldest first. Seeded with round 1 for patients the
    queue marks คัดกรองแล้ว so the re-screen flow has history on first open. */
export const getScreeningRounds = (hn) => {
  if (!hn) return [];
  const map = readRoundsMap();
  return Array.isArray(map[hn]) ? map[hn].map((r) => ({ ...r })) : [];
};

/** Append round N+1 (append-only — TOR: round history is strictly immutable). */
export const appendScreeningRound = (hn, round = {}) => {
  if (!hn) return null;
  const map = readRoundsMap();
  const prev = Array.isArray(map[hn]) ? map[hn] : [];
  const row = {
    round: prev.length + 1,
    at: nowStamp(),
    by: round.by || 'พว.กานดา ศรีวิไล',
    summary: round.summary || '',
    stations: round.stations || [],
    ...round,
  };
  map[hn] = [...prev, row];
  writeRoundsMap(map);
  return row;
};

/** Round count — cheap staleness probe for the re-screen concurrency check:
    a page that opened round history at N can re-poll before appending. */
export const getScreeningRoundCount = (hn) => getScreeningRounds(hn).length;

/** Seed round-1 history for a screened patient (idempotent). */
export const ensureSeedRound = (hn, seed = {}) => {
  if (!hn) return;
  const map = readRoundsMap();
  if (Array.isArray(map[hn]) && map[hn].length > 0) return;
  map[hn] = [{
    round: 1,
    at: seed.at || '08:35',
    by: seed.by || 'พว.กานดา ศรีวิไล',
    summary: seed.summary || 'คัดกรองรอบแรก — สัญญาณชีพปกติ ส่งรอตรวจ',
    stations: seed.stations || [
      { station: 'จุดลงทะเบียน', start: '08:20', end: '08:24', provider: 'จนท.สมพร ทองดี' },
      { station: 'จุดคัดกรอง/วัดสัญญาณชีพ', start: '08:25', end: '08:35', provider: 'พว.กานดา ศรีวิไล' },
    ],
  }];
  writeRoundsMap(map);
};

/* ── Per-station service times of the ACTIVE visit (TOR 1.2.3.4) ─────────
   ScreeningPage stamps enter/leave per step; Step-5 renders the audit
   table from this record. Keyed by HN. */

const STATIONS_KEY = 'mih:opd-station-times';

const readStations = () => {
  if (!canUseSessionStorage()) return {};
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(STATIONS_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const getStationTimes = (hn) => {
  const map = readStations();
  return Array.isArray(map[hn]) ? map[hn].map((s) => ({ ...s })) : [];
};

/** Stamp a station visit — updates the open entry's `end` or appends one. */
/* ป้ายสถานีสำหรับ "รับผู้ป่วยเข้า" — แถวแรกของตารางเวลาต่อสถานี (TOR 1.2.3.4)
   นับตั้งแต่พยาบาลกดยืนยันรับจากคิว ไม่ใช่ตั้งแต่เปิดฟอร์มขั้นแรก */
export const STATION_ACCEPT = 'จุดคัดกรอง — รับผู้ป่วยเข้า';

/** ประทับเวลารับผู้ป่วยเข้าจุดคัดกรอง — เปิดและปิดในจังหวะเดียว เพราะเป็นเหตุการณ์
    ไม่ใช่ช่วงเวลา ถ้ามีแถวรับเข้าของ HN นี้อยู่แล้ว (กดยืนยันซ้ำ) ไม่เพิ่มซ้ำ */
export const stampScreeningAccept = (hn, provider) => {
  if (!hn) return;
  const has = (getStationTimes(hn) || []).some((s) => s.station === STATION_ACCEPT);
  if (has) return;
  stampStationTime(hn, STATION_ACCEPT, provider);
  stampStationTime(hn, STATION_ACCEPT, provider);
};

export const stampStationTime = (hn, station, provider) => {
  if (!hn || !station) return;
  const map = readStations();
  const list = Array.isArray(map[hn]) ? [...map[hn]] : [];
  const openIdx = list.findIndex((s) => s.station === station && !s.end);
  if (openIdx >= 0) {
    list[openIdx] = { ...list[openIdx], end: nowStamp() };
  } else {
    list.push({ station, start: nowStamp(), end: '', provider: provider || 'พว.กานดา ศรีวิไล' });
  }
  map[hn] = list;
  if (canUseSessionStorage()) {
    window.sessionStorage.setItem(STATIONS_KEY, JSON.stringify(map));
  }
};
