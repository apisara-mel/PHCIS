/** Minimal clinical vital-sign alerts for the observation ward.
    Separate from VITAL_RANGES (impossible-input validation) — these
    thresholds flag genuinely abnormal readings that should still be
    recordable. Only the "critical" tier is implemented in this pass. */

const num = (raw) => {
  if (raw === '' || raw == null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

const CRITICAL_CHECKS = [
  {
    key: 'bpSys',
    label: 'ความดันตัวบนต่ำ',
    unit: 'mmHg',
    isCritical: (v) => v <= 90,
  },
  {
    key: 'bpDia',
    label: 'ความดันตัวล่างต่ำ',
    unit: 'mmHg',
    isCritical: (v) => v <= 50,
  },
  {
    key: 'pulse',
    label: 'ชีพจรผิดปกติ',
    unit: 'ครั้ง/นาที',
    isCritical: (v) => v <= 50 || v >= 130,
  },
  {
    key: 'rr',
    label: 'อัตราการหายใจผิดปกติ',
    unit: 'ครั้ง/นาที',
    isCritical: (v) => v <= 8 || v >= 26,
  },
  {
    key: 'spo2',
    label: 'SpO₂ ต่ำ',
    unit: '%',
    isCritical: (v) => v < 92,
  },
  {
    key: 'temp',
    label: 'อุณหภูมิผิดปกติ',
    unit: '°C',
    isCritical: (v) => v <= 35.0 || v >= 38.5,
  },
];

/** @returns {{ key: string, label: string, value: number, unit: string }[]} */
export function assessVitalAlerts(vitals = {}) {
  return CRITICAL_CHECKS.reduce((out, rule) => {
    const value = num(vitals[rule.key]);
    if (value == null || !rule.isCritical(value)) return out;
    return [...out, { key: rule.key, label: rule.label, value, unit: rule.unit }];
  }, []);
}

/** @returns {'normal' | 'critical'} */
export function vitalAlertLevel(triggers = []) {
  return triggers.length > 0 ? 'critical' : 'normal';
}

/** Latest vitals snapshot for one patient record. */
export function getPatientVitalAlertState(patient) {
  const latest = patient?.vitalsTrend?.[patient.vitalsTrend.length - 1];
  if (!latest) return { level: 'normal', triggers: [], latest: null };
  const triggers = assessVitalAlerts(latest);
  return { level: vitalAlertLevel(triggers), triggers, latest };
}

/** Short label for a card badge — first trigger wins. */
export function primaryVitalAlertLabel(triggers = []) {
  const first = triggers[0];
  if (!first) return '';
  return `${first.label} (${first.value} ${first.unit})`;
}
