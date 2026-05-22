/* BMI helpers — same clinical rules as VitalCard / BMICard (PHCIS-ALL 2745:104612).
   Summary vitals tiles derive BMI from weight (kg) + height (cm) per round. */

export const parseBmiScalar = (v) => {
  if (v == null || v === '') return undefined;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(String(v).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};

export const bmiFromAnthro = (weightKg, heightCm) => {
  const w = parseBmiScalar(weightKg);
  const h = parseBmiScalar(heightCm);
  if (w == null || h == null || w <= 0 || h <= 0) return undefined;
  const bmi = w / ((h / 100) ** 2);
  return Math.round(bmi * 10) / 10;
};

export const bmiToGradientPercent = (bmi) => {
  if (bmi < 18.5) return Math.max(0, (bmi / 18.5) * 25);
  if (bmi < 23) return 25 + ((bmi - 18.5) / (23 - 18.5)) * 30;
  if (bmi < 25) return 55 + ((bmi - 23) / (25 - 23)) * 20;
  if (bmi < 30) return 75 + ((bmi - 25) / (30 - 25)) * 20;
  return Math.min(100, 95 + ((bmi - 30) / 15) * 5);
};

export const formatBmiDisplay = (bmi) => {
  if (!Number.isFinite(bmi)) return '—';
  return Number.isInteger(bmi) ? String(bmi) : bmi.toFixed(1).replace(/\.0$/, '');
};

/** @param {Record<string, { value?: string | number }>} block */
export const enrichVitalBlock = (block) => {
  if (!block) return block;
  const bmiNum = bmiFromAnthro(block.weight?.value, block.height?.value);
  if (bmiNum === undefined) {
    return {
      ...block,
      bmi: {
        value: block.bmi?.value ?? '—',
        gradientPercent: 0,
      },
    };
  }
  return {
    ...block,
    bmi: {
      value: formatBmiDisplay(bmiNum),
      gradientPercent: bmiToGradientPercent(bmiNum),
    },
  };
};

/** @param {Array<{ id: string, label: string, vitals: object }>} rounds */
export const enrichMeasurementRounds = (rounds) =>
  (rounds || []).map((round) => ({
    ...round,
    vitals: enrichVitalBlock(round.vitals),
  }));
