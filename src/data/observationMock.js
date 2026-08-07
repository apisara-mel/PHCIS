/* Mock data for Observation System (1.14 ระบบสังเกตอาการ / ER-Observation / Day Bed)
   Based on Obsidian BMA Health TOR Requirements:
   - Timed vital-sign trend (กราฟ/ตารางแนวโน้มสัญญาณชีพตามช่วงเวลา + Pain/ESI)
   - Stat/urgent orders & nursing interventions
   - Observation bed Floor Map / Queue Management
   - Discharge summary & disposition (Discharge Home, Refer, Admit IPD, OPD) */

import { PATIENT_PROFILES } from '@/data/patientProfiles';

/* ── Clinical edge-case thresholds ─────────────────────────────────────
   One home for every rule in docs/observation-use-cases.md §"กรณีขอบเขต
   และข้อยกเว้นทางคลินิก", so the queue card, the vitals form and the
   discharge flow all read the SAME number instead of each hard-coding
   its own idea of "too long" / "too high" / "impossible". */

/* #2 Overstay — OPD-Observation / Day Bed standard stay is 6 hours;
   past that the attending doctor has to re-evaluate for Admit / Refer. */
export const OVERSTAY_LIMIT_MINUTES = 360;

/** Latest ESI from vitalsTrend (1 = most urgent). Returns 5 when absent. */
export const latestPatientEsi = (patient) => {
  const latest = patient?.vitalsTrend?.[patient.vitalsTrend.length - 1];
  const raw = latest?.esi;
  if (raw == null || raw === '') return 5;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 5;
};

/** Latest Pain Score key from vitalsTrend (none | mild | mod | severe | agony). */
export const latestPatientPain = (patient) => {
  const pain = patient?.vitalsTrend?.[patient.vitalsTrend.length - 1]?.pain;
  return pain ?? null;
};

/* Ward-board status labels + StatusBadge styles — one mapping everywhere
   (filter tags, grid cards, table) so "กำลังเฝ้าระวัง" always reads info,
   "รอทำความสะอาด" always warning, etc. */
export const OBSERVATION_BED_STATUS = {
  observing: { label: 'กำลังเฝ้าระวัง', badgeStyle: 'info' },
  empty: { label: 'เตียงว่าง', badgeStyle: 'neutral' },
  cleaning: { label: 'รอทำความสะอาด', badgeStyle: 'warning' },
  referred: { label: 'ส่งต่อแล้ว', badgeStyle: 'success' },
};

export const observationBedStatusFor = (patient) => {
  if (!patient) return null;
  if (patient.status === 'observing') return { ...OBSERVATION_BED_STATUS.observing, status: 'observing' };
  if (patient.status === 'empty') return { ...OBSERVATION_BED_STATUS.empty, status: 'empty' };
  if (patient.status === 'cleaning') return { ...OBSERVATION_BED_STATUS.cleaning, status: 'cleaning' };
  if (patient.status === 'ready_discharge' || patient.status === 'discharged') {
    return { ...OBSERVATION_BED_STATUS.referred, status: patient.status };
  }
  return null;
};

/* ── Timestamps ────────────────────────────────────────────────────────
   Observation records carry two kinds of time string:
     • full  — "YYYY-MM-DD HH:MM น."  (admitTime / dischargeTime)
     • clock — "HH:MM น."             (vitals, notes, orders)
   A clock string alone cannot be ordered across midnight, and a stay
   longer than "now" cannot be derived from a stored number — hence the
   helpers below (edge cases #12 · #13). */

const pad2 = (n) => String(n).padStart(2, '0');

export const formatObservationClock = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())} น.`;
export const formatObservationDateTime = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${formatObservationClock(d)}`;

/** "YYYY-MM-DD HH:MM น." → Date (null when absent/unparseable). */
export const parseObservationDateTime = (value) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/.exec(String(value || '').trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "HH:MM น." → minutes since midnight (null when unparseable). */
export const parseClockMinutes = (value) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(value || '').trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};

/** Shift a clock string by ±minutes, wrapping around midnight. */
export const shiftClock = (value, deltaMinutes) => {
  const mins = parseClockMinutes(value);
  if (mins == null) return value;
  const next = ((mins + Math.round(deltaMinutes)) % 1440 + 1440) % 1440;
  return `${pad2(Math.floor(next / 60))}:${pad2(next % 60)} น.`;
};

/** Rebuild absolute timestamps for a chronologically-authored list of
 *  clock strings, rolling forward a day each time the clock goes
 *  backwards — the only way "23:50 น." then "00:15 น." can sort right. */
export const buildAbsoluteTimeline = (startDateTime, clockStrings = []) => {
  const start = startDateTime instanceof Date ? startDateTime : parseObservationDateTime(startDateTime);
  let cursor = start ? new Date(start) : null;
  return clockStrings.map((clock) => {
    const mins = parseClockMinutes(clock);
    if (!cursor || mins == null) return cursor ? new Date(cursor) : null;
    const candidate = new Date(cursor);
    candidate.setHours(0, 0, 0, 0);
    candidate.setMinutes(mins);
    if (candidate < cursor) candidate.setDate(candidate.getDate() + 1);
    cursor = candidate;
    return new Date(candidate);
  });
};

/** How long the patient has been (or was) on the bed, in minutes.
 *  DERIVED — a stored number stops ticking the moment it is written, so
 *  a freshly admitted patient would never reach the overstay threshold. */
export const getObservationDurationMinutes = (patient, now = Date.now()) => {
  const start = parseObservationDateTime(patient?.admitTime);
  if (!start) return 0;
  const end = parseObservationDateTime(patient?.dischargeTime) || new Date(now);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
};

/** "6 ชม. 35 นาที" */
export const formatDurationThai = (minutes) =>
  `${Math.floor((minutes || 0) / 60)} ชม. ${(minutes || 0) % 60} นาที`;

export const isOverstay = (patient, now = Date.now()) =>
  patient?.status === 'observing' && getObservationDurationMinutes(patient, now) > OVERSTAY_LIMIT_MINUTES;

/** One chronological feed merging vitalsTrend + nursingNotes + statOrders,
 *  newest first. Lives here rather than in a page because BOTH the live
 *  record and the read-only history screen render it — and the two fixes
 *  it encodes must not drift apart between them:
 *
 *    • ordering across midnight (edge case #12) — clock strings carry no
 *      date, so absolute timestamps are rebuilt from admitTime;
 *    • same-minute collisions (edge case #11) — keying rows on the clock
 *      string alone made a second reading in the same minute overwrite
 *      the first, silently losing it from the record.
 */
export const buildObservationTimeline = (patient) => {
  const vitalsTrend = patient?.vitalsTrend || [];
  const nursingNotes = patient?.nursingNotes || [];
  const statOrders = patient?.statOrders || [];
  const admitAt = parseObservationDateTime(patient?.admitTime);
  const vitalsAt = buildAbsoluteTimeline(admitAt, vitalsTrend.map((v) => v.time));
  const notesAt = buildAbsoluteTimeline(admitAt, nursingNotes.map((n) => n.time));
  const ordersAt = buildAbsoluteTimeline(admitAt, statOrders.map((o) => o.orderTime));

  const byKey = new Map();
  const seenClock = new Map();
  vitalsTrend.forEach((v, i) => {
    const repeat = seenClock.get(v.time) || 0;
    seenClock.set(v.time, repeat + 1);
    const key = repeat === 0 ? v.time : `${v.time}#${repeat}`;
    byKey.set(key, {
      key,
      time: v.time,
      at: vitalsAt[i],
      /* A same-minute repeat is a distinct measurement, not a correction
         — surfaced so the reader isn't left wondering why one clock time
         appears twice in the feed. */
      repeatIndex: repeat,
      vitals: v,
      opinions: v.note ? [{ kind: 'note', text: v.note, author: patient?.nurseName, noteType: null }] : [],
    });
  });
  nursingNotes.forEach((n, i) => {
    const opinion = { kind: 'note', text: n.note, author: n.nurse, noteType: n.noteType || null };
    const existing = byKey.get(n.time);
    if (existing) existing.opinions.push(opinion);
    else byKey.set(n.time, { key: n.time, time: n.time, at: notesAt[i], repeatIndex: 0, vitals: null, opinions: [opinion] });
  });
  statOrders.forEach((ord, i) => {
    /* No dedicated "ordered by" field exists on statOrders (only
       executedBy, filled once someone acts on it) — default to the
       attending nurse, same fallback vitals' own embedded note uses. */
    const opinion = { kind: 'order', text: ord.orderText, status: ord.status, author: patient?.nurseName };
    const existing = byKey.get(ord.orderTime);
    if (existing) existing.opinions.push(opinion);
    else byKey.set(ord.orderTime, { key: ord.orderTime, time: ord.orderTime, at: ordersAt[i], repeatIndex: 0, vitals: null, opinions: [opinion] });
  });

  return Array.from(byKey.values()).sort((a, b) => {
    if (a.at && b.at && a.at.getTime() !== b.at.getTime()) return b.at - a.at;
    const byClock = b.time.localeCompare(a.time);
    if (byClock !== 0) return byClock;
    /* Same minute — the later of the two measurements is the newer one,
       so it belongs above in a newest-first feed. */
    return (b.repeatIndex || 0) - (a.repeatIndex || 0);
  });
};

/** Which calendar day of the stay an entry falls on (0 = admission day)
 *  — drives the "วันที่ 2 ของการสังเกตอาการ" marker on overnight stays. */
export const observationDayOffset = (patient, entry) => {
  const admit = parseObservationDateTime(patient?.admitTime);
  if (!admit || !entry?.at) return 0;
  const admitDay = new Date(admit);
  admitDay.setHours(0, 0, 0, 0);
  const entryDay = new Date(entry.at);
  entryDay.setHours(0, 0, 0, 0);
  return Math.round((entryDay.getTime() - admitDay.getTime()) / 86400000);
};

/* ── Bed lifecycle ─────────────────────────────────────────────────────
   A bed row and a patient episode are the same object in this mock, so
   discharging has to FORK them (edge case #9): the episode becomes an
   immutable history row, and the physical bed slot goes back to the ward
   as `cleaning` — never straight to `empty`, because linen still has to
   be changed before the next patient can use it. */
export const BED_CLEANING_STATUS = 'cleaning';

/** Rows that are a real bed in the ward's inventory (history episodes
 *  never occupied a slot of their own). */
export const isPhysicalBed = (patient) =>
  !!patient && !patient.id.startsWith('obs-ref-') && !patient.id.startsWith('obs-hist-');

/** Beds that can accept a patient right now. */
export const isBedAvailable = (patient) => patient?.status === 'empty';

const BLANK_PATIENT_FIELDS = {
  patientName: '', avatar: '', hn: '', vn: '', age: null, gender: '',
  admitTime: '', dischargeTime: '', chiefComplaint: '', diagnosis: '',
  doctorName: '', nurseName: '', rights: '',
  vitalsTrend: [], statOrders: [], nursingNotes: [], dischargeSummary: null,
};

/** Fork a finished episode off its bed.
 *  Returns `{ episode, bed }` — the immutable history row, and the same
 *  bed slot emptied of patient data and put into cleaning. */
export const splitEpisodeFromBed = (bed, { episodeId, dischargeTime, patch = {} } = {}) => ({
  episode: {
    ...bed,
    ...patch,
    id: episodeId || `obs-hist-${bed.id}-${bed.hn || 'x'}`,
    dischargeTime: dischargeTime || bed.dischargeTime || '',
  },
  bed: {
    id: bed.id,
    bedNo: bed.bedNo,
    bedType: bed.bedType,
    bedDescription: bed.bedDescription,
    bedPhotoId: bed.bedPhotoId,
    isExtraBed: bed.isExtraBed,
    severity: 'normal',
    status: BED_CLEANING_STATUS,
    ...BLANK_PATIENT_FIELDS,
  },
});

/* #5 Out-of-bound vitals — these bounds mark a physiologically
   IMPOSSIBLE reading (the mistyped "368 °C" / "1200/800 mmHg" the TOR
   calls out), not a clinically abnormal one. Genuinely alarming values
   (BP 220, Temp 41) stay inside the range on purpose: they must still be
   recordable — clinical urgency is surfaced via Pain/ESI on each entry,
   not via a separate early-warning score. */
export const VITAL_RANGES = {
  bpSys: { label: 'ความดันตัวบน (BP Systolic)', unit: 'mmHg', min: 40, max: 300 },
  bpDia: { label: 'ความดันตัวล่าง (BP Diastolic)', unit: 'mmHg', min: 20, max: 200 },
  pulse: { label: 'ชีพจร (Pulse)', unit: 'ครั้ง/นาที', min: 20, max: 250 },
  temp: { label: 'อุณหภูมิ (Temp)', unit: '°C', min: 30, max: 43 },
  spo2: { label: 'ออกซิเจนปลายนิ้ว (SpO2)', unit: '%', min: 50, max: 100 },
  rr: { label: 'อัตราการหายใจ (RR)', unit: 'ครั้ง/นาที', min: 4, max: 60 },
};

/* Blank fields return nothing — "not filled in yet" is the required-field
   check's problem (VitalCard.onValidityChange), not a range violation. */
export const getOutOfRangeVitals = (form = {}) =>
  Object.entries(VITAL_RANGES).reduce((out, [key, range]) => {
    const raw = form[key];
    if (raw === '' || raw === null || raw === undefined) return out;
    const value = Number(raw);
    if (!Number.isFinite(value) || (value >= range.min && value <= range.max)) return out;
    return [...out, { key, value, ...range }];
  }, []);

/* Pain / ESI — same 5-level scales as OPD screening (TOR §1.2.2.1) for
   re-assessment at each timed vitals entry in observation (§1.14.2). */
export const OBSERVATION_PAIN_LEVELS = [
  { key: 'none',   label: 'ไม่ปวด',   icon: 'sentiment_satisfied', tone: 'green'  },
  { key: 'mild',   label: 'เล็กน้อย', icon: 'sentiment_calm',      tone: 'blue'   },
  { key: 'mod',    label: 'ปานกลาง',  icon: 'sentiment_neutral',   tone: 'yellow' },
  { key: 'severe', label: 'มาก',      icon: 'sentiment_dissatisfied', tone: 'orange' },
  { key: 'agony',  label: 'ทรมาน',    icon: 'sentiment_stressed',  tone: 'red'    },
];

export const OBSERVATION_PAIN_TONE = {
  green:  { bg: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', fg: 'var(--text-brandPrimary-default, #007549)' },
  blue:   { bg: 'var(--surface-alert-info, #F0F6FF)', fg: 'var(--text-info-default, #1D4ED8)' },
  yellow: { bg: 'var(--surface-colorfulbadge-yellow, #FEF9C3)', fg: 'var(--text-colorfulbadge-yellow, #A16207)' },
  orange: { bg: 'var(--surface-alert-warning, #FFF9F0)', fg: 'var(--text-warning-default, #C2410C)' },
  red:    { bg: 'var(--surface-danger-quaternary, #FFF0F0)', fg: 'var(--text-danger-default, #B91C1C)' },
};

export const OBSERVATION_ESI_LEVELS = [
  { lv: 1, en: 'Resuscitation', th: 'วิกฤต',       bg: 'var(--surface-triage-level1)', fg: 'var(--text-triage-level1)' },
  { lv: 2, en: 'Emergency',     th: 'ฉุกเฉิน',     bg: 'var(--surface-triage-level2)', fg: 'var(--text-triage-level2)' },
  { lv: 3, en: 'Urgent',        th: 'เร่งด่วน',    bg: 'var(--surface-triage-level3)', fg: 'var(--text-triage-level3)' },
  { lv: 4, en: 'Semi-urgent',   th: 'ไม่เร่งด่วน', bg: 'var(--surface-triage-level4)', fg: 'var(--text-triage-level4)' },
  { lv: 5, en: 'Non-urgent',    th: 'ทั่วไป',      bg: 'var(--surface-triage-level5)', fg: 'var(--text-triage-level5)' },
];

export const painLevelLabel = (key) => OBSERVATION_PAIN_LEVELS.find((p) => p.key === key)?.label || '—';

export const esiLevelSummary = (lv) => {
  const row = OBSERVATION_ESI_LEVELS.find((e) => e.lv === Number(lv));
  return row ? `ESI ${row.lv} — ${row.th}` : `ESI ${lv}`;
};

export {
  assessVitalAlerts,
  getPatientVitalAlertState,
  primaryVitalAlertLabel,
  vitalAlertLevel,
} from './observationVitalAlerts';

export const painBadgeStyleFor = (key) => {
  const tone = OBSERVATION_PAIN_LEVELS.find((p) => p.key === key)?.tone;
  const map = { green: 'success', blue: 'info', yellow: 'yellow', orange: 'warning', red: 'error' };
  return map[tone] || 'neutral';
};

export const esiBadgeStyleFor = (lv) => {
  const n = Number(lv);
  if (n <= 2) return 'error';
  if (n === 3) return 'warning';
  if (n === 4) return 'info';
  return 'neutral';
};

/** Cells for vitals timeline grids — includes pain / ESI when recorded. */
export const vitalsTimelineCells = (vitals) => {
  if (!vitals) return [];
  const cells = [
    ['ความดัน (BP)', `${vitals.bpSys}/${vitals.bpDia}`],
    ['ชีพจร (Pulse)', `${vitals.pulse} bpm`],
    ['อุณหภูมิ (Temp)', `${vitals.temp}°C`],
    ['ออกซิเจนปลายนิ้ว (SpO2)', `${vitals.spo2}%`],
    ['อัตราการหายใจ (RR)', `${vitals.rr} ครั้ง/นาที`],
  ];
  if (vitals.pain) cells.push(['Pain Score', painLevelLabel(vitals.pain)]);
  if (vitals.esi != null && vitals.esi !== '') cells.push(['ESI', esiLevelSummary(vitals.esi)]);
  return cells;
};

export const BLANK_OBSERVATION_VITALS_FORM = {
  bpSys: '', bpDia: '', pulse: '', temp: '', spo2: '', rr: '', note: '', pain: null, esi: null,
};

/* #6 Discharge with unexecuted STAT orders — "pending" means nobody has
   acted on the order yet ("in_progress" is already being carried out). */
export const getPendingStatOrders = (patient) =>
  (patient?.statOrders || []).filter((o) => o.status === 'pending');

export const MOCK_OBSERVATION_PATIENTS = [
  {
    id: 'obs-001',
    bedNo: 'เตียง 01',
    bedType: 'เตียงไฟฟ้า (High Care)',
    bedDescription: '',
    status: 'observing', // observing | ready_discharge | discharged
    severity: 'warning', // normal | warning | critical
    patientName: 'นาย สมชาย ใจดี',
    avatar: '/avatars/patient-mock-01.png',
    hn: '67004128',
    vn: 'VN670728-091',
    age: 58,
    gender: 'ชาย',
    admitTime: '2026-07-28 08:30 น.',
    /* 6h 35m — deliberately past OVERSTAY_LIMIT_MINUTES so the queue's
       Overstay Warning (edge case #2) has a live example to render. */
    stayMinutes: 395,
    chiefComplaint: 'แน่นหน้าอก หายใจไม่สะดวก หลังออกกำลังกาย 1 ชม. ก่อนมา',
    diagnosis: 'Acute Bronchospasm / Observe IHD',
    doctorName: 'นพ. วรวิทย์ เกียรติเจริญ',
    nurseName: 'พว. สุภาพร ชัยมงคล',
    rights: 'สิทธิบัตรทอง (NHSO)',
    vitalsTrend: [
      { time: '08:30 น.', bpSys: 145, bpDia: 92, pulse: 104, temp: 37.2, spo2: 94, rr: 24, note: 'แรกรับเตียง สังเกตอาการ ใส่ O2 Cannula 3L/min' },
      { time: '09:00 น.', bpSys: 138, bpDia: 88, pulse: 96,  temp: 37.1, spo2: 96, rr: 22, note: 'หลังพ่นยา Berodual Neb 1 dose อาการดีขึ้น' },
      { time: '10:00 น.', bpSys: 132, bpDia: 84, pulse: 88,  temp: 36.9, spo2: 98, rr: 20, note: 'ผู้ป่วยรู้สึกตัวดี ไม่มีแน่นหน้าอกเพิ่ม' },
      { time: '11:30 น.', bpSys: 128, bpDia: 82, pulse: 82,  temp: 36.8, spo2: 98, rr: 18, note: 'สัญญาณชีพคงที่ พร้อมประเมินจำหน่าย' },
      { time: '13:00 น.', bpSys: 130, bpDia: 84, pulse: 84,  temp: 36.9, spo2: 98, rr: 18, note: 'รอผล EKG Serial ครั้งที่ 2 ก่อนตัดสินใจจำหน่าย' },
      { time: '15:00 น.', bpSys: 126, bpDia: 80, pulse: 80,  temp: 36.8, spo2: 99, rr: 18, note: 'ครองเตียงเกิน 6 ชม. รอแพทย์ประเมินซ้ำเพื่อตัดสินใจ Admit หรือจำหน่าย', pain: 'mild', esi: 4 },
    ],
    statOrders: [
      { id: 'ord-1', orderTime: '08:35 น.', orderText: 'Oxygen cannula 3 LPM keep SpO2 > 95%', status: 'completed', executedBy: 'พว. สุภาพร', executedTime: '08:37 น.' },
      { id: 'ord-2', orderTime: '08:40 น.', orderText: 'Berodual 1 respule + NSS 3 ml Nebulizer Stat', status: 'completed', executedBy: 'พว. สุภาพร', executedTime: '08:45 น.' },
      { id: 'ord-3', orderTime: '09:15 น.', orderText: 'EKG 12 leads Stat & EKG Serial at 2 hrs', status: 'completed', executedBy: 'นพ. วรวิทย์', executedTime: '09:30 น.' },
      { id: 'ord-4', orderTime: '10:30 น.', orderText: 'NSS 1,000 ml IV drip 80 ml/hr', status: 'in_progress', executedBy: 'พว. สุภาพร', executedTime: '10:35 น.' },
    ],
    nursingNotes: [
      { time: '08:35 น.', nurse: 'พว. สุภาพร', note: 'รับผู้ป่วยเข้านอนเตียงสังเกตอาการ 01 มีอาการหายใจเหนื่อย ให้ออกซิเจน cannula 3 LPM' },
      { time: '09:00 น.', nurse: 'พว. สุภาพร', note: 'พ่นยาขยายหลอดลม Berodual ครบ 1 dose ฟังเสียงปอด Wheezing ลดลง' },
      { time: '11:30 น.', nurse: 'พว. สุภาพร', note: 'ผู้ป่วยลุกนั่งได้ ทานอาหารอ่อนได้ ไม่มีเหนื่อยหอบ V/S Stable' },
    ],
    dischargeSummary: {
      disposition: 'home', // home | refer | admit_ipd | opd
      doctorSummary: 'ผู้ป่วยอาการ bronchospasm ดีขึ้นหลังพ่นยา EKG ปกติ สัญญาณชีพคงที่ อนุญาตให้กลับบ้านพร้อมยาพ่นประจำตัว',
      dischargeVitals: { bpSys: 126, bpDia: 80, pulse: 80, temp: 36.7, spo2: 99, rr: 18 },
      dischargeAdvice: 'พ่นยาตามแพทย์สั่ง เลี่ยงฝุ่น PM2.5 หากเหนื่อยหอบเพิ่มให้รีบมาพบแพทย์ทันที',
      referHospital: '',
      isDischarged: false,
    },
  },
  {
    id: 'obs-002',
    bedNo: 'เตียง 02',
    bedType: 'เตียงกึ่งพิเศษ',
    bedDescription: '',
    status: 'observing',
    severity: 'critical',
    patientName: 'นาง สมศรี มีสุข',
    avatar: '/avatars/patient-mock-02.png',
    hn: '67005932',
    vn: 'VN670728-104',
    age: 72,
    gender: 'หญิง',
    admitTime: '2026-07-28 09:45 น.',
    stayMinutes: 140, // 2h 20m
    chiefComplaint: 'เวียนศีรษะ บ้านหมุน คลื่นไส้อาเจียน 3 ครั้ง ความดันสูง 180/105',
    diagnosis: 'Hypertensive Urgency / Acute Vertigo',
    doctorName: 'พญ. ปรียาภรณ์ สุขสวัสดิ์',
    nurseName: 'พว. นิภา วงศ์สว่าง',
    rights: 'สิทธิข้าราชการ (Direct Billing)',
    vitalsTrend: [
      { time: '09:45 น.', bpSys: 182, bpDia: 106, pulse: 112, temp: 37.0, spo2: 96, rr: 22, note: 'ความดันสูงมาก เวียนศีรษะมาก ให้นอนราบ' },
      { time: '10:15 น.', bpSys: 168, bpDia: 98,  pulse: 102, temp: 36.9, spo2: 97, rr: 20, note: 'หลังให้ยา Amlodipine 10mg + Plasil 10mg IV' },
      { time: '11:15 น.', bpSys: 154, bpDia: 92,  pulse: 94,  temp: 36.8, spo2: 97, rr: 19, note: 'ความดันค่อยๆ ลดลง อาการเวียนศีรษะเบาลง' },
    ],
    statOrders: [
      { id: 'ord-21', orderTime: '09:50 น.', orderText: 'Amlodipine (10mg) 1 tab oral Stat', status: 'completed', executedBy: 'พว. นิภา', executedTime: '09:52 น.' },
      { id: 'ord-22', orderTime: '09:50 น.', orderText: 'Plasil (Metoclopramide 10mg) IV Stat', status: 'completed', executedBy: 'พว. นิภา', executedTime: '09:55 น.' },
      { id: 'ord-23', orderTime: '10:45 น.', orderText: 'Re-check BP q 30 min, High Risk Fall Precaution', status: 'in_progress', executedBy: 'พว. นิภา', executedTime: '10:45 น.' },
    ],
    nursingNotes: [
      { time: '09:45 น.', nurse: 'พว. นิภา', note: 'รับนอนเตียง 02 ยกไม้นวดข้างเตียง 2 ข้าง ป้องกันการพลัดตกหกล้ม' },
      { time: '10:15 น.', nurse: 'พว. นิภา', note: 'ให้ยาตามคำสั่งแพทย์ คลื่นไส้ลดลง นอนพักผ่อนบนเตียง' },
    ],
    dischargeSummary: {
      disposition: 'opd',
      doctorSummary: 'ติดตามความดันโลหิต ให้สังเกตอาการต่ออีก 1 ชม. ก่อนส่งกลับคลินิกความดัน',
      dischargeVitals: { bpSys: 154, bpDia: 92, pulse: 94, temp: 36.8, spo2: 97, rr: 19 },
      dischargeAdvice: 'หลีกเลี่ยงการลุกเดินกะทันหัน ทานยาลดความดันสม่ำเสมอ',
      referHospital: '',
      isDischarged: false,
    },
  },
  {
    id: 'obs-003',
    bedNo: 'เตียง 03',
    bedType: 'เตียงพับได้ / Recliner',
    bedDescription: '',
    status: 'ready_discharge',
    severity: 'normal',
    patientName: 'เด็กชาย กิตติพงษ์ เด่นดวง',
    avatar: '/avatars/patient-mock-03.png',
    hn: '67008120',
    vn: 'VN670728-052',
    age: 9,
    gender: 'ชาย',
    admitTime: '2026-07-28 07:15 น.',
    stayMinutes: 290, // 4h 50m
    chiefComplaint: 'ไข้สูง 38.8 C ปวดศีรษะ อ่อนเพลีย ซดน้ำเกลือแร่ไม่ได้',
    diagnosis: 'Acute Viral Infection / Dehydration',
    doctorName: 'พญ. นภัสสร สายชล',
    nurseName: 'พว. กัลยา จิตต์มั่น',
    rights: 'สิทธิบัตรทอง (NHSO)',
    vitalsTrend: [
      { time: '07:15 น.', bpSys: 108, bpDia: 68, pulse: 118, temp: 38.8, spo2: 98, rr: 22, note: 'แรกรับ ไข้สูง เช็ดตัวลดไข้ ให้ Paracetamol syrup' },
      { time: '08:15 น.', bpSys: 110, bpDia: 70, pulse: 104, temp: 37.8, spo2: 99, rr: 20, note: 'เช็ดตัวลดไข้ ดื่ม ORS ได้ดีขึ้น' },
      { time: '10:15 น.', bpSys: 112, bpDia: 72, pulse: 92,  temp: 36.8, spo2: 99, rr: 18, note: 'ไข้ลด ร่าเริง กินอาหารว่างได้' },
      { time: '11:45 น.', bpSys: 112, bpDia: 70, pulse: 88,  temp: 36.6, spo2: 99, rr: 18, note: 'อาการทั่วไปปกติ พร้อมกลับบ้าน' },
    ],
    statOrders: [
      { id: 'ord-31', orderTime: '07:20 น.', orderText: 'Paracetamol syrup (250mg/5ml) 7.5 ml oral Stat', status: 'completed', executedBy: 'พว. กัลยา', executedTime: '07:22 น.' },
      { id: 'ord-32', orderTime: '07:25 น.', orderText: 'Tepid sponge Stat for high fever', status: 'completed', executedBy: 'พว. กัลยา', executedTime: '07:30 น.' },
      { id: 'ord-33', orderTime: '08:30 น.', orderText: 'ORS sachet 1 pack dissolve in 250ml water, sip frequently', status: 'completed', executedBy: 'พว. กัลยา', executedTime: '08:35 น.' },
    ],
    nursingNotes: [
      { time: '07:20 น.', nurse: 'พว. กัลยา', note: 'รับเด็กนอนเตียงสังเกตอาการ ไข้ 38.8 C ป้อนยาและเช็ดตัวลดไข้' },
      { time: '10:15 น.', nurse: 'พว. กัลยา', note: 'เด็กไข้ลดลง เล่นของเล่นได้ ไม่งอแง ทานน้ำเกลือแร่หมด 1 แก้ว' },
    ],
    dischargeSummary: {
      disposition: 'home',
      doctorSummary: 'ผู้ป่วยเด็กอาการไข้ viral infection ดีขึ้น ไข้ลดลง ทานอาหารและน้ำได้ดี สัญญาณชีพปกติ อนุญาตจำหน่ายกลับบ้าน',
      dischargeVitals: { bpSys: 112, bpDia: 70, pulse: 88, temp: 36.6, spo2: 99, rr: 18 },
      dischargeAdvice: 'ทานยาปราบไข้ Paracetamol ทุก 4-6 ชม. เมื่อมีไข้ เช็ดตัวลดไข้ต่อเนื่อง หากซึม อ้วก ทานไม่ได้ ให้พามาโรงพยาบาล',
      referHospital: '',
      isDischarged: true,
    },
  },
  {
    id: 'obs-004',
    bedNo: 'เตียง 04',
    bedType: 'เตียงสามัญ',
    bedDescription: '',
    status: 'observing',
    severity: 'critical',
    patientName: 'นาย ประเสริฐ ยิ้มแย้ม',
    avatar: '/avatars/patient-mock-04.png',
    hn: '67001099',
    vn: 'VN670728-112',
    age: 64,
    gender: 'ชาย',
    admitTime: '2026-07-28 11:00 น.',
    stayMinutes: 65, // 1h 5m
    chiefComplaint: 'ปวดท้องรุนแรงบริเวณลิ้นปี่ ท้องอืด เหงื่อแตก อาเจียนเป็นเศษอาหาร',
    diagnosis: 'Acute Abdomen / Suspect Peptic Ulcer Perforation',
    doctorName: 'นพ. วรวิทย์ เกียรติเจริญ',
    nurseName: 'พว. สุภาพร ชัยมงคล',
    rights: 'สิทธิประกันสังคม (SSO)',
    vitalsTrend: [
      { time: '11:00 น.', bpSys: 96, bpDia: 60, pulse: 118, temp: 37.6, spo2: 95, rr: 24, note: 'ความดันตก ชีพจรเร็ว ปวดท้องมาก เฝ้าระวัง Shock' },
      { time: '11:30 น.', bpSys: 102, bpDia: 64, pulse: 110, temp: 37.5, spo2: 96, rr: 22, note: 'หลังให้ Acetar 1,000 ml IV load 200 ml/hr' },
      /* Clinical deterioration example — ESI 2 with worsening vitals for demo. */
      { time: '12:00 น.', bpSys: 88, bpDia: 52, pulse: 132, temp: 37.8, spo2: 91, rr: 27, note: 'ความดันตกซ้ำ ชีพจรเร็วขึ้น ปวดท้องรุนแรงขึ้น เฝ้าระวังภาวะ Septic Shock', pain: 'severe', esi: 2 },
    ],
    statOrders: [
      { id: 'ord-41', orderTime: '11:05 น.', orderText: 'NPO (Halt oral intake & water)', status: 'completed', executedBy: 'พว. สุภาพร', executedTime: '11:05 น.' },
      { id: 'ord-42', orderTime: '11:05 น.', orderText: 'IV Acetar 1,000 ml IV load 200 ml/hr', status: 'in_progress', executedBy: 'พว. สุภาพร', executedTime: '11:10 น.' },
      { id: 'ord-43', orderTime: '11:10 น.', orderText: 'Stat CBC, Electrolyte, LFT, Amylase, Lipase, Up-Right Abdomen X-Ray', status: 'in_progress', executedBy: 'พว. สุภาพร', executedTime: '11:15 น.' },
      { id: 'ord-44', orderTime: '11:20 น.', orderText: 'Prepare E-Referral to Central Hospital (โรงพยาบาลตากสิน)', status: 'pending', executedBy: '-', executedTime: '-' },
    ],
    nursingNotes: [
      { time: '11:05 น.', nurse: 'พว. สุภาพร', note: 'ผู้ป่วยปวดท้องระดับ 8/10 หน้านวด กดเจ็บทั่วท้อง (Board-like rigidity) ติดตาม V/S ชิดใกล้' },
    ],
    dischargeSummary: {
      disposition: 'refer',
      doctorSummary: 'สงสัยภาวะสงสัยกระเพาะอาหารทะลุ เตรียมส่งต่อโรงพยาบาลตากสินเพื่อตรวจ CT Abdomen และผ่าตัดด่วน',
      dischargeVitals: { bpSys: 102, bpDia: 64, pulse: 110, temp: 37.5, spo2: 96, rr: 22 },
      dischargeAdvice: 'งดน้ำและอาหารทุกชนิด เดินทางด้วยรถกู้ชีพ EMS พร้อมพยาบาลดูแลระหว่างส่งต่อ',
      referHospital: 'โรงพยาบาลตากสิน (กทม.)',
      isDischarged: false,
    },
  },
  {
    id: 'obs-005',
    bedNo: 'เตียง 05',
    bedType: 'เตียงหมุนมือ',
    bedDescription: '',
    status: 'empty',
    severity: 'normal',
    patientName: '',
    hn: '',
    vn: '',
    age: null,
    gender: '',
    admitTime: '',
    stayMinutes: 0,
    chiefComplaint: '',
    diagnosis: '',
    doctorName: '',
    nurseName: '',
    rights: '',
    vitalsTrend: [],
    statOrders: [],
    nursingNotes: [],
    dischargeSummary: null,
  },
  {
    id: 'obs-006',
    bedNo: 'เตียง 06',
    bedType: 'เตียงหมุนมือ',
    bedDescription: '',
    status: 'empty',
    severity: 'normal',
    patientName: '',
    hn: '',
    vn: '',
    age: null,
    gender: '',
    admitTime: '',
    stayMinutes: 0,
    chiefComplaint: '',
    diagnosis: '',
    doctorName: '',
    nurseName: '',
    rights: '',
    vitalsTrend: [],
    statOrders: [],
    nursingNotes: [],
    dischargeSummary: null,
  },
  {
    id: 'obs-007',
    bedNo: 'เตียง 07',
    bedType: 'เตียงไฟฟ้า (High Care)',
    bedDescription: '',
    status: 'empty',
    severity: 'normal',
    patientName: '',
    hn: '',
    vn: '',
    age: null,
    gender: '',
    admitTime: '',
    stayMinutes: 0,
    chiefComplaint: '',
    diagnosis: '',
    doctorName: '',
    nurseName: '',
    rights: '',
    vitalsTrend: [],
    statOrders: [],
    nursingNotes: [],
    dischargeSummary: null,
  },
  {
    id: 'obs-008',
    bedNo: 'เตียง 08',
    bedType: 'เตียงกึ่งพิเศษ',
    bedDescription: '',
    status: 'empty',
    severity: 'normal',
    patientName: '',
    hn: '',
    vn: '',
    age: null,
    gender: '',
    admitTime: '',
    stayMinutes: 0,
    chiefComplaint: '',
    diagnosis: '',
    doctorName: '',
    nurseName: '',
    rights: '',
    vitalsTrend: [],
    statOrders: [],
    nursingNotes: [],
    dischargeSummary: null,
  },
  {
    id: 'obs-009',
    bedNo: 'เตียง 09',
    bedType: 'เตียงพับได้ / Recliner',
    bedDescription: '',
    status: 'empty',
    severity: 'normal',
    patientName: '',
    hn: '',
    vn: '',
    age: null,
    gender: '',
    admitTime: '',
    stayMinutes: 0,
    chiefComplaint: '',
    diagnosis: '',
    doctorName: '',
    nurseName: '',
    rights: '',
    vitalsTrend: [],
    statOrders: [],
    nursingNotes: [],
    dischargeSummary: null,
  },
  {
    id: 'obs-010',
    bedNo: 'เตียง 10',
    bedType: 'เตียงสามัญ',
    bedDescription: '',
    status: 'empty',
    severity: 'normal',
    patientName: '',
    hn: '',
    vn: '',
    age: null,
    gender: '',
    admitTime: '',
    stayMinutes: 0,
    chiefComplaint: '',
    diagnosis: '',
    doctorName: '',
    nurseName: '',
    rights: '',
    vitalsTrend: [],
    statOrders: [],
    nursingNotes: [],
    dischargeSummary: null,
  },
];

/* Beds 05–09 start occupied so the ward sits at exactly ONE free bed.
   Edge case #4 (Full Capacity → ลงทะเบียนเตียงเสริม) is otherwise
   unreachable without hand-admitting seven patients just to watch the
   empty count reach zero — now a single admission gets you there. เตียง
   10 deliberately stays empty so the empty-bed card keeps a live example.
   Deterministic (index-based, no Math.random), same as the referred
   history generator below. */
const WARD_FILLER_CASES = [
  {
    admitHour: 9, admitMinute: 15, stayMinutes: 175,
    chiefComplaint: 'หายใจหอบเหนื่อย ไอมีเสมหะเขียว 2 วัน',
    diagnosis: 'Acute Bronchitis / Observe Pneumonia',
    doctorName: 'พญ. ปรียาภรณ์ สุขสวัสดิ์', nurseName: 'พว. นิภา วงศ์สว่าง',
    rights: 'สิทธิบัตรทอง (NHSO)',
    vitals: [
      { bpSys: 136, bpDia: 86, pulse: 98, temp: 37.8, spo2: 95, rr: 22, note: 'แรกรับ ให้ O2 Cannula 3 LPM และพ่นยาขยายหลอดลม' },
      { bpSys: 130, bpDia: 82, pulse: 90, temp: 37.2, spo2: 97, rr: 20, note: 'หลังพ่นยา เสียง Wheezing ลดลง หายใจสะดวกขึ้น' },
    ],
    order: 'Berodual 1 respule + NSS 3 ml Nebulizer Stat',
    nursingNote: 'รับผู้ป่วยนอนเตียงสังเกตอาการ จัดท่านั่งศีรษะสูง 45 องศา ติดตาม SpO2 ต่อเนื่อง',
  },
  {
    admitHour: 10, admitMinute: 0, stayMinutes: 120,
    chiefComplaint: 'อาเจียน ถ่ายเหลว 6 ครั้ง อ่อนเพลียมาก',
    diagnosis: 'Acute Gastroenteritis / Mild Dehydration',
    doctorName: 'พญ. นภัสสร สายชล', nurseName: 'พว. กัลยา จิตต์มั่น',
    rights: 'สิทธิประกันสังคม (SSO)',
    vitals: [
      { bpSys: 104, bpDia: 66, pulse: 104, temp: 37.4, spo2: 98, rr: 20, note: 'แรกรับ ผิวแห้ง ตาลึก ให้สารน้ำทางหลอดเลือดดำ' },
      { bpSys: 112, bpDia: 72, pulse: 92, temp: 37.0, spo2: 98, rr: 18, note: 'หลังให้ NSS 500 ml อาการอ่อนเพลียดีขึ้น ปัสสาวะออกดี' },
    ],
    order: 'NSS 1,000 ml IV drip 120 ml/hr + Ondansetron 4 mg IV Stat',
    nursingNote: 'บันทึกจำนวนครั้งการถ่าย/อาเจียน และปริมาณปัสสาวะทุก 1 ชม.',
  },
  {
    admitHour: 10, admitMinute: 30, stayMinutes: 95,
    chiefComplaint: 'ผื่นลมพิษขึ้นทั้งตัว คันมาก หลังทานอาหารทะเล 30 นาที',
    diagnosis: 'Acute Urticaria / Observe Anaphylaxis',
    doctorName: 'นพ. วรวิทย์ เกียรติเจริญ', nurseName: 'พว. สุภาพร ชัยมงคล',
    rights: 'ชำระเงินเอง (Self Pay)',
    vitals: [
      { bpSys: 118, bpDia: 74, pulse: 96, temp: 36.9, spo2: 98, rr: 20, note: 'แรกรับ ผื่นนูนแดงทั่วลำตัว ไม่มีเสียงหายใจผิดปกติ' },
      { bpSys: 120, bpDia: 76, pulse: 84, temp: 36.8, spo2: 99, rr: 18, note: 'หลังให้ยาแก้แพ้ ผื่นจางลง ไม่มีอาการบวมริมฝีปาก/ลิ้น' },
    ],
    order: 'CPM 10 mg IV Stat, เฝ้าระวังภาวะ Anaphylaxis 2 ชม.',
    nursingNote: 'เฝ้าระวังอาการแน่นหน้าอก หายใจลำบาก หรือบวมบริเวณใบหน้าอย่างใกล้ชิด',
  },
  {
    admitHour: 8, admitMinute: 0, stayMinutes: 245,
    chiefComplaint: 'ลื่นล้มในห้องน้ำ ศีรษะกระแทกพื้น ไม่หมดสติ',
    diagnosis: 'Head Injury, Observe for Intracranial Hemorrhage',
    doctorName: 'นพ. วรวิทย์ เกียรติเจริญ', nurseName: 'พว. นิภา วงศ์สว่าง',
    rights: 'สิทธิข้าราชการ (Direct Billing)',
    vitals: [
      { bpSys: 142, bpDia: 88, pulse: 78, temp: 36.7, spo2: 98, rr: 18, note: 'แรกรับ E4V5M6 (GCS 15) รูม่านตาเท่ากัน ตอบสนองต่อแสงดี' },
      { bpSys: 134, bpDia: 84, pulse: 74, temp: 36.6, spo2: 99, rr: 18, note: 'ประเมิน Neuro sign ครบ 4 ชม. ไม่มีอาเจียนพุ่งหรือซึมลง' },
    ],
    order: 'Neuro sign observation q 1 hr x 4, CT Brain Non-contrast',
    nursingNote: 'ประเมินระดับความรู้สึกตัวและขนาดรูม่านตาทุก 1 ชม. ตามแผนการรักษา',
  },
  {
    admitHour: 9, admitMinute: 30, stayMinutes: 160,
    chiefComplaint: 'ใจสั่น เหนื่อยง่าย ชีพจรเต้นเร็วผิดปกติ',
    diagnosis: 'Palpitation / Observe Arrhythmia',
    doctorName: 'พญ. ปรียาภรณ์ สุขสวัสดิ์', nurseName: 'พว. กัลยา จิตต์มั่น',
    rights: 'สิทธิบัตรทอง (NHSO)',
    vitals: [
      { bpSys: 128, bpDia: 80, pulse: 122, temp: 36.8, spo2: 97, rr: 20, note: 'แรกรับ ชีพจรเร็วสม่ำเสมอ ติด EKG Monitor ต่อเนื่อง' },
      { bpSys: 124, bpDia: 78, pulse: 96, temp: 36.7, spo2: 98, rr: 18, note: 'หลังพักผู้ป่วย 1 ชม. ชีพจรลดลง ไม่มีอาการเจ็บหน้าอก' },
    ],
    order: 'EKG 12 leads Stat + Continuous Cardiac Monitoring',
    nursingNote: 'ให้ผู้ป่วยนอนพัก งดคาเฟอีน ติดตามคลื่นไฟฟ้าหัวใจต่อเนื่อง',
  },
];

WARD_FILLER_CASES.forEach((c, i) => {
  const bed = MOCK_OBSERVATION_PATIENTS.find((p) => p.id === `obs-${String(i + 5).padStart(3, '0')}`);
  if (!bed) return;
  /* Offset by 4 so these don't reuse the same profiles the four
     hand-authored beds above already show. */
  const profile = PATIENT_PROFILES[(i + 4) % PATIENT_PROFILES.length];
  const hhmm = (h, m) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} น.`;
  const firstTime = hhmm(c.admitHour, c.admitMinute);
  const secondTime = hhmm(c.admitHour + 1, c.admitMinute);
  Object.assign(bed, {
    status: 'observing',
    severity: 'normal',
    patientName: profile.fullName,
    avatar: profile.avatarUrl,
    hn: profile.hn,
    vn: `VN670728-${200 + i}`,
    age: parseInt(profile.age, 10) || 45,
    gender: profile.sex,
    admitTime: `2026-07-28 ${firstTime}`,
    stayMinutes: c.stayMinutes,
    chiefComplaint: c.chiefComplaint,
    diagnosis: c.diagnosis,
    doctorName: c.doctorName,
    nurseName: c.nurseName,
    rights: c.rights,
    vitalsTrend: [
      { time: firstTime, ...c.vitals[0] },
      { time: secondTime, ...c.vitals[1] },
    ],
    statOrders: [
      { id: `ord-f${i}1`, orderTime: firstTime, orderText: c.order, status: 'completed', executedBy: c.nurseName.replace(/\s\S+$/, ''), executedTime: secondTime },
    ],
    nursingNotes: [
      { time: firstTime, nurse: c.nurseName.replace(/\s\S+$/, ''), note: c.nursingNote },
    ],
    dischargeSummary: {
      disposition: 'home',
      doctorSummary: '',
      dischargeVitals: null,
      dischargeAdvice: '',
      referHospital: '',
      isDischarged: false,
    },
  });
});

/* "รายการที่ส่งต่อแล้ว" (already referred/discharged) history — generated
   rather than hand-authored so the queue's referred tab has enough rows
   to exercise its filter tags (วันที่/เตียง/สถานะ/ผู้สั่ง/พยาบาลรับผู้ป่วย)
   and pagination. Target: 32 rows on the referred tab (31 generated +
   the forked obs-003 episode below). Most land in the current month so
   the default "เดือนนี้" filter still shows ~32; a few prior-month rows
   keep the date filter demonstrable. Deterministic (index-based). */
const REFERRED_BED_TYPES = ['เตียงไฟฟ้า (High Care)', 'เตียงกึ่งพิเศษ', 'เตียงพับได้ / Recliner', 'เตียงสามัญ', 'เตียงหมุนมือ'];
const REFERRED_CASE_TEMPLATES = [
  { chiefComplaint: 'แน่นหน้าอก หายใจไม่สะดวก', diagnosis: 'Acute Bronchospasm', doctorName: 'นพ. วรวิทย์ เกียรติเจริญ', nurseName: 'พว. สุภาพร ชัยมงคล' },
  { chiefComplaint: 'เวียนศีรษะ ความดันสูง', diagnosis: 'Hypertensive Urgency', doctorName: 'พญ. ปรียาภรณ์ สุขสวัสดิ์', nurseName: 'พว. นิภา วงศ์สว่าง' },
  { chiefComplaint: 'ไข้สูง ปวดศีรษะ อ่อนเพลีย', diagnosis: 'Acute Viral Infection', doctorName: 'พญ. นภัสสร สายชล', nurseName: 'พว. กัลยา จิตต์มั่น' },
  { chiefComplaint: 'ปวดท้องรุนแรงบริเวณลิ้นปี่', diagnosis: 'Acute Gastritis', doctorName: 'นพ. วรวิทย์ เกียรติเจริญ', nurseName: 'พว. สุภาพร ชัยมงคล' },
  { chiefComplaint: 'หายใจหอบเหนื่อย ไอมีเสมหะ', diagnosis: 'Acute Bronchitis', doctorName: 'พญ. ปรียาภรณ์ สุขสวัสดิ์', nurseName: 'พว. นิภา วงศ์สว่าง' },
  { chiefComplaint: 'อาเจียน ถ่ายเหลว ซึมลง', diagnosis: 'Acute Gastroenteritis / Dehydration', doctorName: 'พญ. นภัสสร สายชล', nurseName: 'พว. กัลยา จิตต์มั่น' },
  { chiefComplaint: 'ลื่นล้ม ปวดบวมข้อเท้า', diagnosis: 'Ankle Sprain, Observe for Fracture', doctorName: 'นพ. วรวิทย์ เกียรติเจริญ', nurseName: 'พว. นิภา วงศ์สว่าง' },
  { chiefComplaint: 'ใจสั่น เหนื่อยง่าย', diagnosis: 'Palpitation, Observe IHD', doctorName: 'พญ. ปรียาภรณ์ สุขสวัสดิ์', nurseName: 'พว. กัลยา จิตต์มั่น' },
];
const REFERRED_RIGHTS = ['สิทธิบัตรทอง (NHSO)', 'สิทธิข้าราชการ (Direct Billing)', 'สิทธิประกันสังคม (SSO)', 'ชำระเงินเอง (Self Pay)'];
const REFERRED_DISPOSITIONS = ['home', 'opd', 'refer'];
const REFERRED_REFER_HOSPITALS = ['โรงพยาบาลตากสิน (กทม.)', 'โรงพยาบาลเจริญกรุงประชารักษ์', 'โรงพยาบาลกลาง'];

const buildReferredMockPatients = (count) => Array.from({ length: count }, (_, i) => {
  const profile = PATIENT_PROFILES[i % PATIENT_PROFILES.length];
  const dx = REFERRED_CASE_TEMPLATES[i % REFERRED_CASE_TEMPLATES.length];
  /* Pin to the current calendar month so the referred tab's default
     "เดือนนี้" date filter shows the full mock set (32 with hist fork). */
  const now = new Date();
  const day = 1 + (i % Math.min(27, now.getDate() || 27));
  const admitDate = new Date(now.getFullYear(), now.getMonth(), day);
  const yyyy = admitDate.getFullYear();
  const mm = String(admitDate.getMonth() + 1).padStart(2, '0');
  const dd = String(admitDate.getDate()).padStart(2, '0');
  const hour = 7 + (i % 12);
  const ageYears = parseInt(profile.age, 10) || 30;
  const disposition = REFERRED_DISPOSITIONS[i % REFERRED_DISPOSITIONS.length];
  const status = i % 4 === 0 ? 'discharged' : 'ready_discharge';
  const dischargeVitals = { bpSys: 120 + (i % 5), bpDia: 78 + (i % 4), pulse: 76 + (i % 8), temp: 36.6, spo2: 98, rr: 18 };

  return {
    id: `obs-ref-${String(i + 1).padStart(3, '0')}`,
    bedNo: `เตียง ${String((i % 10) + 1).padStart(2, '0')}`,
    bedType: REFERRED_BED_TYPES[i % REFERRED_BED_TYPES.length],
    status,
    severity: 'normal',
    patientName: profile.fullName,
    avatar: profile.avatarUrl,
    hn: profile.hn,
    vn: `VN${String(yyyy).slice(2)}${mm}${dd}-${String(100 + i)}`,
    age: ageYears,
    gender: profile.sex,
    admitTime: `${yyyy}-${mm}-${dd} ${String(hour).padStart(2, '0')}:00 น.`,
    stayMinutes: 120 + (i % 6) * 30,
    chiefComplaint: dx.chiefComplaint,
    diagnosis: dx.diagnosis,
    doctorName: dx.doctorName,
    nurseName: dx.nurseName,
    rights: REFERRED_RIGHTS[i % REFERRED_RIGHTS.length],
    vitalsTrend: [
      { time: `${String(hour).padStart(2, '0')}:00 น.`, ...dischargeVitals, note: 'อาการคงที่ ประเมินพร้อมจำหน่าย' },
    ],
    statOrders: [],
    nursingNotes: [],
    dischargeSummary: {
      disposition,
      doctorSummary: 'ผู้ป่วยอาการคงที่ สัญญาณชีพปกติ อนุญาตจำหน่ายตามแผนการรักษา',
      dischargeVitals,
      dischargeAdvice: 'ปฏิบัติตามคำแนะนำแพทย์ หากมีอาการผิดปกติให้รีบมาพบแพทย์',
      referHospital: disposition === 'refer' ? REFERRED_REFER_HOSPITALS[i % REFERRED_REFER_HOSPITALS.length] : '',
      isDischarged: status === 'discharged',
    },
  };
});

MOCK_OBSERVATION_PATIENTS.push(...buildReferredMockPatients(31));

/* Back-fill pain / ESI on the latest vitals row when not explicitly set —
   so every occupied card has both fields to render (TOR §1.14.2 re-assessment). */
const PAIN_ESI_DEFAULTS = {
  critical: { pain: 'severe', esi: 2 },
  warning: { pain: 'mod', esi: 3 },
  normal: { pain: 'mild', esi: 4 },
};
MOCK_OBSERVATION_PATIENTS.forEach((patient) => {
  if (!patient.vitalsTrend?.length || patient.status === 'empty') return;
  const last = patient.vitalsTrend[patient.vitalsTrend.length - 1];
  if (last.pain != null && last.esi != null) return;
  const defaults = PAIN_ESI_DEFAULTS[patient.severity] || PAIN_ESI_DEFAULTS.normal;
  if (last.pain == null) last.pain = defaults.pain;
  if (last.esi == null) last.esi = defaults.esi;
});

/* ── Timestamp rebasing ────────────────────────────────────────────────
   Duration is DERIVED from admitTime → (dischargeTime | now), so the
   literals above carry `stayMinutes` only as the demo's intended length
   of stay. This pass turns that intent into real timestamps:

     • active beds are re-based so the ward looks mid-shift RIGHT NOW —
       and because duration is derived, every stay keeps ticking, which
       is what makes the Overstay Warning reachable for a patient
       admitted through the UI (edge case #13);
     • finished episodes get a fixed dischargeTime, freezing their
       duration at what it was when the patient left.

   Re-basing moves admitTime, so each record's clock strings (vitals,
   notes, orders) shift by the same delta — otherwise a bed admitted
   "4 hours ago" would still show readings from 08:30. */
const rebaseMockTimestamps = () => {
  const now = new Date();
  MOCK_OBSERVATION_PATIENTS.forEach((p) => {
    const stay = p.stayMinutes || 0;

    if (p.status === 'observing') {
      const previousAdmit = parseObservationDateTime(p.admitTime);
      const admit = new Date(now.getTime() - stay * 60000);
      const delta = previousAdmit ? Math.round((admit.getTime() - previousAdmit.getTime()) / 60000) : 0;
      p.admitTime = formatObservationDateTime(admit);
      p.dischargeTime = '';
      if (delta) {
        p.vitalsTrend = p.vitalsTrend.map((v) => ({ ...v, time: shiftClock(v.time, delta) }));
        p.nursingNotes = p.nursingNotes.map((n) => ({ ...n, time: shiftClock(n.time, delta) }));
        p.statOrders = p.statOrders.map((o) => ({
          ...o,
          orderTime: shiftClock(o.orderTime, delta),
          executedTime: o.executedTime === '-' ? o.executedTime : shiftClock(o.executedTime, delta),
        }));
      }
      return;
    }

    const admit = parseObservationDateTime(p.admitTime);
    if (admit && !p.dischargeTime) {
      p.dischargeTime = formatObservationDateTime(new Date(admit.getTime() + stay * 60000));
    }
  });
};
rebaseMockTimestamps();

/* เตียง 03's patient was already finished (ready_discharge) yet still sat
   in the bed slot, so the ward showed 10 beds of which one was neither
   occupied nor available — the exact symptom edge case #9 describes.
   Fork it the same way a real discharge now does: the episode moves to
   history, the bed comes back as `cleaning` and needs a staff action
   before it can take the next patient. */
const forkFinishedBed = (bedId) => {
  const index = MOCK_OBSERVATION_PATIENTS.findIndex((p) => p.id === bedId);
  if (index === -1) return;
  const { episode, bed } = splitEpisodeFromBed(MOCK_OBSERVATION_PATIENTS[index], {
    episodeId: `obs-hist-${bedId}`,
    dischargeTime: MOCK_OBSERVATION_PATIENTS[index].dischargeTime,
    patch: { status: 'discharged' },
  });
  MOCK_OBSERVATION_PATIENTS[index] = bed;
  MOCK_OBSERVATION_PATIENTS.push(episode);
};
forkFinishedBed('obs-003');

/* Keep the forked history episode inside "เดือนนี้" so the referred tab
   total stays at 32 under the default date filter. */
(() => {
  const hist = MOCK_OBSERVATION_PATIENTS.find((p) => p.id === 'obs-hist-obs-003');
  if (!hist) return;
  const now = new Date();
  const admit = new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - 1), 7, 15);
  const discharge = new Date(admit.getTime() + (hist.stayMinutes || 290) * 60000);
  hist.admitTime = formatObservationDateTime(admit);
  hist.dischargeTime = formatObservationDateTime(discharge);
})();
