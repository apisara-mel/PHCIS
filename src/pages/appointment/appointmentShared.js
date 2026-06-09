/* Shared mock data + calendar helpers — Figma Appointment file 0k2gyvvXwZ6JR3WQcokvEU */

import { formatThaiBuddhistDate } from '@/data/registrationForm';
import { buildDoctorRoster, DOCTOR_ROSTER_SIZE } from './appointmentDoctorRoster';
import {
  INITIAL_APPOINTMENTS as MOCK_APPOINTMENTS,
  SOMCHAI_AVATAR,
} from './appointmentMockData';

export { APPOINTMENT_PATIENTS, APPOINTMENT_SEARCH_AVATARS } from './appointmentMockData';

export { DOCTOR_ROSTER_SIZE as STAFF_ROSTER_TOTAL };

export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];
export const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];
export const CAL_DAY_HEADERS = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];
export const CAL_DAY_HEADERS_SUN = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
/* Figma 6:11075 — full weekday names in calendar header row */
export const CAL_DAY_HEADERS_LONG = [
  'อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์',
];
export const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const NATIONAL_HOLIDAYS = [
  { date: '2026-06-01', name: 'วันมาฆบูชา' },
  { date: '2026-06-03', name: 'วันเฉลิมพระชนมพรรษา' },
];

/* Figma 6:11075 — duty-off days (centered “วันหยุด”, no slots) */
export const STAFF_CLOSED_DATES = [
  '2026-06-09', '2026-06-10', '2026-06-11',
  '2026-06-23', '2026-06-24', '2026-06-25',
];

export const MONTH_PREVIEW_SLOT_LIMIT = 5;

export const APPT_MIN_LEAD_MS = 60 * 60 * 1000;

/** Figma 19:8245 — pill at top of viewport shortly after popup closes (not 3 min;
   prototype annotation "3 minutes" is not the success-feedback timing). */
export const APPT_CREATE_SUCCESS_TOAST_DELAY_MS = 320;
export const SLOT_MINUTES = 15;
export const SLOT_START_H = 8;
export const SLOT_END_H = 20;
export const PAGE_SIZE = 20;
/** Figma 58:19171 — embedded doctor list view pagination (10 rows). */
export const EMBEDDED_LIST_PAGE_SIZE = 10;

/** Appointment scheduling roster — doctors only (25 unique). */
export const STAFF = buildDoctorRoster();

/** Figma 6:11075 — booked slot patient avatar (HN 67-00001 demo patient). */
export const DEFAULT_PATIENT_AVATAR = SOMCHAI_AVATAR;

export const INITIAL_APPOINTMENTS = MOCK_APPOINTMENTS;

export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function isoKey(d) {
  if (typeof d === 'string') return d;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addMinutes(time, mins) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${pad2(Math.floor(total / 60) % 24)}:${pad2(total % 60)}`;
}

export function buildTimeSlots() {
  const slots = [];
  for (let h = SLOT_START_H; h < SLOT_END_H; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      slots.push(`${pad2(h)}:${pad2(m)}`);
    }
  }
  return slots;
}

export const TIME_SLOTS = buildTimeSlots();

export function buildMonthGrid(year, month, weekStartsOn = 'sunday') {
  const firstDay = new Date(year, month, 1);
  const offset = weekStartsOn === 'monday'
    ? (firstDay.getDay() + 6) % 7
    : firstDay.getDay();
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - offset);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({
      day: d.getDate(),
      inMonth: d.getMonth() === month,
      key: isoKey(d),
      weekdayKey: WEEKDAY_KEYS[d.getDay()],
    });
  }
  return cells;
}

/** Figma 6:11075 — six week rows × seven day cards */
export function buildMonthWeekRows(year, month, weekStartsOn = 'sunday') {
  const cells = buildMonthGrid(year, month, weekStartsOn);
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

export function startOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

export function startOfWeekSunday(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export const MONTH_PREVIEW_TIMES = TIME_SLOTS.filter(
  (t) => t >= '08:00' && t <= '09:15',
).slice(0, MONTH_PREVIEW_SLOT_LIMIT);

export function isStaffClosedDay(dateKey) {
  return STAFF_CLOSED_DATES.includes(dateKey);
}

export function getNationalHoliday(dateKey) {
  return NATIONAL_HOLIDAYS.find((h) => h.date === dateKey) || null;
}

export function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** True when the calendar day is strictly before today (local). */
export function isPastDate(dateKey) {
  if (!dateKey) return false;
  return startOfLocalDay(parseDateKey(dateKey)).getTime()
    < startOfLocalDay(new Date()).getTime();
}

export const APPT_STATUS_CONFIRMED = 'confirmed';
export const APPT_STATUS_COMPLETED = 'completed';
export const APPT_STATUS_NO_SHOW = 'no_show';

/** List column + filters — Figma 58:19193 family. */
export const APPT_STATUS_PRESENTATIONS = {
  [APPT_STATUS_CONFIRMED]: { label: 'ยืนยันแล้ว', style: 'info' },
  [APPT_STATUS_COMPLETED]: { label: 'เสร็จสิ้น', style: 'success' },
  [APPT_STATUS_NO_SHOW]: { label: 'ไม่มาตามนัด', style: 'warning' },
};

/** True when the appointment start time is before now (includes prior calendar days). */
export function isAppointmentSlotPast(appt) {
  if (!appt?.date) return false;
  if (isPastDate(appt.date)) return true;
  const time = appt.time || slotRangeToTime(appt.slotRange);
  if (!time) return false;
  const day = parseDateKey(appt.date);
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  day.setHours(h, m, 0, 0);
  return day.getTime() < Date.now();
}

/** Resolve status at render time — past slots default to เสร็จสิ้น unless marked no-show. */
export function getAppointmentDisplayStatus(appt) {
  if (!appt) return APPT_STATUS_CONFIRMED;
  const stored = appt.status;
  if (stored === APPT_STATUS_NO_SHOW) return APPT_STATUS_NO_SHOW;
  if (stored === 'cancelled') return 'cancelled';
  if (stored === APPT_STATUS_COMPLETED || stored === 'done') return APPT_STATUS_COMPLETED;
  if (isPastDate(appt.date) || isAppointmentSlotPast(appt)) return APPT_STATUS_COMPLETED;
  return APPT_STATUS_CONFIRMED;
}

export function getAppointmentStatusPresentation(appt) {
  const status = getAppointmentDisplayStatus(appt);
  return APPT_STATUS_PRESENTATIONS[status] ?? APPT_STATUS_PRESENTATIONS[APPT_STATUS_CONFIRMED];
}

/** True when the exam has finished (attended or inferred from elapsed slot). */
export function isAppointmentCompleted(appt) {
  return getAppointmentDisplayStatus(appt) === APPT_STATUS_COMPLETED;
}

/** Figma 73:15735 — read-only detail when past slot, finished, or no-show. */
export function isAppointmentReadOnly(appt) {
  if (!appt) return false;
  const status = getAppointmentDisplayStatus(appt);
  return status === APPT_STATUS_COMPLETED || status === APPT_STATUS_NO_SHOW;
}

export function isSlotDisabled(dateKey, time) {
  if (isPastDate(dateKey)) return true;
  const day = parseDateKey(dateKey);
  const [h, m] = time.split(':').map(Number);
  day.setHours(h, m, 0, 0);
  return day.getTime() < Date.now() + APPT_MIN_LEAD_MS;
}

/** Slot interval for a staff member (minutes) — defaults to 15. */
export function getStaffSlotMinutes(staff) {
  const raw = staff?.slotMinutes ?? staff?.avgExamMin;
  if ([10, 15, 20, 30].includes(raw)) return raw;
  return SLOT_MINUTES;
}

const DEFAULT_WORK_HOURS = { start: '08:00', end: '16:00' };

/** Working window for a calendar day (null when off duty). */
export function getStaffWorkHours(staff, dateKey) {
  if (!staff || !dateKey) return DEFAULT_WORK_HOURS;
  if (isStaffClosedDay(dateKey)) return null;
  const day = parseDateKey(dateKey);
  const weekdayKey = WEEKDAY_KEYS[day.getDay()];
  const daySched = staff.schedule?.[weekdayKey];
  if (daySched && daySched.on === false) return null;
  return {
    start: daySched?.start ?? staff.workHours?.start ?? DEFAULT_WORK_HOURS.start,
    end: daySched?.end ?? staff.workHours?.end ?? DEFAULT_WORK_HOURS.end,
  };
}

/** Build Timeslot range labels for one duty day, e.g. 08:00-08:15 (15 min). */
export function buildSlotRangesForWindow({ start, end, slotMinutes }) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (![sh, sm, eh, em].every(Number.isFinite)) return [];
  const startTotal = sh * 60 + sm;
  const endTotal = eh * 60 + em;
  const slots = [];
  for (let t = startTotal; t + slotMinutes <= endTotal; t += slotMinutes) {
    const end = t + slotMinutes;
    slots.push({
      value: `${pad2(Math.floor(t / 60))}:${pad2(t % 60)}-${pad2(Math.floor(end / 60))}:${pad2(end % 60)}`,
    });
  }
  return slots;
}

/** All bookable ranges for staff on `dateKey`, aligned to their slot duration. */
export function getStaffScheduleSlots(staff, dateKey) {
  const hours = getStaffWorkHours(staff, dateKey);
  if (!hours) return [];
  return buildSlotRangesForWindow({
    ...hours,
    slotMinutes: getStaffSlotMinutes(staff),
  });
}

/** Map a stored start time (HH:MM) or range to a Timeslot label for `slotMinutes`. */
export function timeToSlotRange(time, slotMinutes = SLOT_MINUTES) {
  if (!time) return '';
  const raw = String(time);
  if (raw.includes('-')) return raw;
  const [h, m] = raw.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return '';
  const startM = h * 60 + m;
  const slotStartM = Math.floor(startM / slotMinutes) * slotMinutes;
  const endM = slotStartM + slotMinutes;
  return `${pad2(Math.floor(slotStartM / 60))}:${pad2(slotStartM % 60)}-${pad2(Math.floor(endM / 60))}:${pad2(endM % 60)}`;
}

/** Start time persisted on appointments from a Timeslot range label. */
export function slotRangeToTime(range) {
  if (!range) return '';
  return String(range).split('-')[0]?.trim() ?? '';
}

/** Thai Buddhist label for appointment history list rows. */
export function formatApptListDate(dateKey) {
  if (!dateKey) return '—';
  return formatThaiBuddhistDate(parseDateKey(dateKey));
}

/** Appointments for one HN, newest date/time first. */
export function findAppointmentsByHn(appointments, hn) {
  if (!hn || !Array.isArray(appointments)) return [];
  const needle = String(hn).trim();
  return [...appointments]
    .filter((a) => String(a.hn || '').trim() === needle)
    .sort((a, b) => {
      const da = parseDateKey(a.date).getTime();
      const db = parseDateKey(b.date).getTime();
      if (db !== da) return db - da;
      return (b.time || '').localeCompare(a.time || '');
    });
}

/** Read-only exam-mode label (matches AppointmentFormPopup options). */
export function formatApptExamModeLabel(examMode) {
  if (examMode === 'tele' || examMode === 'telemedicine') {
    return 'ปรึกษาแพทย์ออนไลน์ (Telemedicine)';
  }
  return 'ตรวจที่โรงพยาบาล (Onsite)';
}

/** Read-only pre-order summary. */
export function formatApptPreOrderLabel(appt) {
  if (appt?.preOrder === 'has' || appt?.advance === 'has') return 'มีคำสั่งล่วงหน้า';
  return 'ไม่มีคำสั่งล่วงหน้า';
}
