import { evaluateVital } from '@/pages/opd/ScreeningStep1';
import { VITAL_VALUE_COLOR } from '@/components/badge/vitalValueStyles';

/** @typedef {'default'|'warning'|'danger'} VitalDisplayTone */

/** BP — OPD PressureCard high bands + ScreeningStep1 sbp low bands. */
export function resolveBloodPressureDisplayTone(bpSys, bpDia) {
  const sys = Number(bpSys);
  const dia = Number(bpDia);
  if (!Number.isFinite(sys) || !Number.isFinite(dia) || sys <= 0 || dia <= 0) {
    return 'default';
  }

  const sbpEval = evaluateVital('sbp', sys);
  if (sbpEval?.tier === 'danger') return 'danger';
  if (sbpEval?.tier === 'warn') return 'warning';

  if (sys >= 140 || dia >= 90) return 'danger';
  if (sys >= 120 || dia >= 80) return 'warning';

  return 'default';
}

/** Scalar vitals — same two-tier thresholds as OPD ScreeningStep1. */
export function resolveScalarVitalDisplayTone(key, value) {
  const result = evaluateVital(key, value);
  if (!result) return 'default';
  return result.tier === 'danger' ? 'danger' : 'warning';
}

/** Map tone → CSS color token (VitalsSignHorizontalPanel contract). */
export function vitalDisplayValueColor(tone = 'default') {
  return VITAL_VALUE_COLOR[tone] || VITAL_VALUE_COLOR.default;
}

const SNAPSHOT_TONE_RESOLVERS = {
  bp: (vitals) => resolveBloodPressureDisplayTone(vitals.bpSys, vitals.bpDia),
  pulse: (vitals) => resolveScalarVitalDisplayTone('pulse', vitals.pulse),
  spo2: (vitals) => resolveScalarVitalDisplayTone('spo2', vitals.spo2),
  temp: (vitals) => resolveScalarVitalDisplayTone('temp', vitals.temp),
  /* Observation stores RR as `rr`; OPD ScreeningStep1 thresholds use `resp`. */
  rr: (vitals) => resolveScalarVitalDisplayTone('resp', vitals.rr),
};

/** Read-only vital snapshot tiles keep normal values on content/secondary. */
export function resolveVitalSnapshotTone(key, vitals) {
  if (!vitals) return 'default';
  return SNAPSHOT_TONE_RESOLVERS[key]?.(vitals) ?? 'default';
}

export function vitalSnapshotValueColor(tone = 'default') {
  if (tone === 'default') return 'var(--text-content-secondary)';
  return vitalDisplayValueColor(tone);
}
