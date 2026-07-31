import React from 'react';
import { BloodPressureChart, TimeSeriesChart } from '@/components/graph/VitalsSignGraph';

/* Reuses the same chart engine as VitalsSignGraph (the OPD screening
   "กราฟสัญญาณชีพ" popup, Figma node 2505:107270) so fonts, spacing, grid,
   legend, and hover tooltip stay identical — only the data and axis scale
   differ, since this patient's vitals can run outside OPD's healthy-baseline
   demo range. */

const stripUnitSuffix = (t) => t.replace(/\s*น\./g, '');

/* Compact card height for this inline trend view — shorter than the
   full-size chart's natural ~508px (that scale suits the OPD screening
   popup, not a card embedded in the page). Plain number, not a design
   token: same category as VitalsSignGraph's own CHART_H/CHART_H_MIN
   constants (SVG viewBox geometry, not a CSS design property). Chart's
   own fillHeight mode enforces a 280px floor, so this just trims the
   excess above that. */
const COMPACT_CHART_HEIGHT = 300;

function niceTicks(min, max, count = 4) {
  const range = max - min || 1;
  const rawStep = range / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const niceStep = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
  const niceMin = Math.floor(min / niceStep) * niceStep;
  const niceMax = Math.ceil(max / niceStep) * niceStep;
  const ticks = [];
  for (let v = niceMax; v >= niceMin - niceStep / 2; v -= niceStep) {
    ticks.push(Math.round(v * 100) / 100);
  }
  return ticks;
}

const SINGLE_SERIES_CONFIG = {
  pulse: {
    field: 'pulse',
    stroke: 'var(--text-colorfulbadge-orange)',
    label: 'ชีพจร (Pulse)',
    name: 'ชีพจร',
    unit: 'ครั้ง/นาที',
    floorMin: 50,
    floorMax: 130,
    padMin: 10,
    padMax: 10,
    thresholds: [
      { value: 100, color: 'var(--text-danger-default)' },
      { value: 60, color: 'var(--text-info-default)' },
    ],
  },
  spo2: {
    field: 'spo2',
    stroke: 'var(--text-colorfulbadge-blue)',
    label: 'ออกซิเจนในเลือด (SpO2)',
    name: 'SpO2',
    unit: '%',
    floorMin: 88,
    floorMax: 100,
    padMin: 2,
    padMax: 0,
    thresholds: [{ value: 95, color: 'var(--text-info-default)' }],
  },
  temp: {
    field: 'temp',
    stroke: 'var(--brand-p500)',
    label: 'อุณหภูมิร่างกาย (Temp)',
    name: 'อุณหภูมิ',
    unit: '°C',
    floorMin: 35.5,
    floorMax: 39.5,
    padMin: 0.5,
    padMax: 0.5,
    thresholds: [{ value: 37.5, color: 'var(--text-danger-default)' }],
  },
  rr: {
    field: 'rr',
    stroke: 'var(--brand-p600)',
    label: 'อัตราการหายใจ (RR)',
    name: 'อัตราการหายใจ',
    unit: 'ครั้ง/นาที',
    floorMin: 10,
    floorMax: 30,
    padMin: 2,
    padMax: 2,
    thresholds: [
      { value: 20, color: 'var(--text-danger-default)' },
      { value: 12, color: 'var(--text-info-default)' },
    ],
  },
};

/* `fillHeight` — used when this chart is the sole content of a container
   with a real pixel height to fill (e.g. the "ดูแบบกราฟ" popup's body),
   instead of the fixed COMPACT_CHART_HEIGHT sized for the inline card
   embedded above the timeline.
   `notes` — optional array parallel to `data`, each entry the list of
   personnel opinions recorded at that timestamp (see ObservationDetailPage's
   Observation Timeline merge) — shown in the hover tooltip alongside the
   vital value so a reviewer doesn't have to cross-reference the timeline
   for what happened around a given reading. */
export default function VitalTrendChart({ data = [], parameter = 'bp', fillHeight = false, notes }) {
  if (!data || data.length === 0) {
    return <div className='text-xs text-gray-400 italic py-3 text-center'>ไม่มีข้อมูลสัญญาณชีพย้อนหลัง</div>;
  }

  const xLabels = data.map((d) => stripUnitSuffix(d.time));
  const wrapperStyle = fillHeight ? { height: '100%' } : { height: COMPACT_CHART_HEIGHT };
  const wrapperClassName = fillHeight ? 'h-full' : undefined;

  if (parameter === 'bp') {
    const sbpValues = data.map((d) => d.bpSys);
    const dbpValues = data.map((d) => d.bpDia);
    const dataMin = Math.min(...dbpValues, 50) - 10;
    const dataMax = Math.max(...sbpValues, 160) + 10;
    const ticks = niceTicks(dataMin, dataMax);
    return (
      <div className={wrapperClassName} style={wrapperStyle}>
        <BloodPressureChart
          fillHeight
          sbpValues={sbpValues}
          dbpValues={dbpValues}
          xLabels={xLabels}
          minY={ticks[ticks.length - 1]}
          maxY={ticks[0]}
          ticks={ticks}
          thresholds={[
            { value: 140, color: 'var(--text-danger-default)' },
            { value: 90, color: 'var(--text-info-default)' },
          ]}
          notesByIndex={notes}
        />
      </div>
    );
  }

  const config = SINGLE_SERIES_CONFIG[parameter];
  const values = data.map((d) => d[config.field]);
  const dataMin = Math.min(...values, config.floorMin) - config.padMin;
  const dataMax = Math.max(...values, config.floorMax) + config.padMax;
  const ticks = niceTicks(dataMin, dataMax);

  return (
    <div className={wrapperClassName} style={wrapperStyle}>
      <TimeSeriesChart
        fillHeight
        values={values}
        minY={ticks[ticks.length - 1]}
        maxY={ticks[0]}
        yTicks={ticks}
        stroke={config.stroke}
        label={config.label}
        name={config.name}
        unit={config.unit}
        xLabels={xLabels}
        thresholds={config.thresholds}
      />
    </div>
  );
}
