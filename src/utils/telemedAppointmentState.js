/* Telemedicine queue badge states — Figma PHCIS | Telemed 78:16524 annotation.
   Drives the TreatmentQueuePage Telemedicine column (70:7129). */

export const TELEMED_COUNTDOWN_MINUTES = 15;
export const TELEMED_EXPIRED_MINUTES = 30;

/**
 * @param {string|number|Date} appointmentAt — ISO string or epoch ms
 * @param {number} [now=Date.now()]
 * @returns {{ state: 'early'|'countdown'|'due'|'overdue'|'expired', minutesUntil: number, minutesPast: number }}
 */
export function getTelemedAppointmentState(appointmentAt, now = Date.now()) {
  const at = appointmentAt instanceof Date
    ? appointmentAt.getTime()
    : typeof appointmentAt === 'string'
      ? Date.parse(appointmentAt)
      : appointmentAt;

  if (!at || Number.isNaN(at)) {
    return { state: 'early', minutesUntil: null, minutesPast: 0 };
  }

  const diffMs = at - now;
  const minutesUntil = Math.max(0, Math.ceil(diffMs / 60000));
  const minutesPast = diffMs < 0 ? (-diffMs / 60000) : 0;

  if (diffMs > TELEMED_COUNTDOWN_MINUTES * 60_000) {
    return { state: 'early', minutesUntil, minutesPast: 0 };
  }
  if (diffMs > 0) {
    return { state: 'countdown', minutesUntil, minutesPast: 0 };
  }
  if (diffMs > -60_000) {
    return { state: 'due', minutesUntil: 0, minutesPast: 0 };
  }
  if (minutesPast <= TELEMED_EXPIRED_MINUTES) {
    return { state: 'overdue', minutesUntil: 0, minutesPast };
  }
  return { state: 'expired', minutesUntil: 0, minutesPast };
}

/** Figma 78:16478 — "เลยเวลา 3.00 นาที" (two decimal places). */
export function formatTelemedOverdueMinutes(minutesPast) {
  const n = Number(minutesPast);
  if (!Number.isFinite(n) || n <= 0) return '0.00';
  return n.toFixed(2);
}

export function formatTelemedBadgeLabel(state, { minutesUntil, minutesPast } = {}) {
  switch (state) {
    case 'countdown':
      return `อีก ${minutesUntil} นาที`;
    case 'due':
      return 'ถึงเวลาแล้ว เข้าห้อง';
    case 'overdue':
      return `เลยเวลา ${formatTelemedOverdueMinutes(minutesPast)} นาที`;
    default:
      return '';
  }
}
