import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { TabBar, TabPillLarge } from '@/components/tab/TabPill';

/* MIH VitalsSignGraph — Figma "Vital sign graph" (node 2505:107270) inside
   Popup Very Large (2745:104642) via VitalsGraphPopup — extraLarge, fluid up to
   1440×1024. Includes Tab Bar + chart-area (2418:69815).

   The Tab Bar is the design-system component (Figma node 2514:7929) — see
   `@/components/tab/TabPill.jsx` (which also exports `TabBar`).

   Tokens (design.md / index.css — resolve at runtime for future mode switch):
     surface/card/100              → --surface-card-100
     text/content/tertiary         → --text-content-tertiary  (legend labels)
     surface/chart-area            → --surface-chart-area
     text/chart-axis-label         → --text-chart-axis-label
     stroke/chart-grid             → --stroke-chart-grid
     stroke/chart-series-sbp       → --stroke-chart-series-sbp
     stroke/chart-series-dbp       → --stroke-chart-series-dbp
     dim/space/*, dim/radius/*     → --dim-space-*, --dim-radius-*
     shadow/dropdown               → --shadow-dropdown                        */

/* Tabs are text-only per Figma 2853:62776 — no leading icon. */
const VITAL_TABS = [
  { id: 'temp',     label: 'อุณหภูมิ' },
  { id: 'pulse',    label: 'ชีพจร' },
  { id: 'resp',     label: 'อัตราการหายใจ' },
  { id: 'spo2',     label: 'ความอิ่มตัวของออกซิเจนในเลือด' },
  { id: 'pressure', label: 'ความดัน' },
  { id: 'height',   label: 'ส่วนสูง' },
  { id: 'weight',   label: 'น้ำหนัก' },
  { id: 'bmi',      label: 'BMI' },
  { id: 'waist',    label: 'เส้นรอบเอว' },
];

/* Mock dataset — 9 OPD visits spanning 28 พ.ย. 60 → 14 พ.ย. 67 (same x-axis as
   Figma chart-area 2418:69815). Values are clinically-plausible for an adult:
     • subtle BP creep (pre-hypertension) over 7 years
     • temp/pulse/resp/SpO₂ in normal range
     • weight gain 62→65 kg then back down (BMI tracks weight÷height²)
     • waist 78→83 cm then easing back                                       */
const VISIT_DATES = [
  '28 พ.ย. 60', '19 มี.ค. 61', '21 ธ.ค. 61', '19 ธ.ค. 62', '25 มิ.ย. 63',
  '5 ต.ค. 63',  '1 ต.ค. 64',   '9 พ.ย. 67',   '14 พ.ย. 67',
];

const SBP    = [110,  112,  114,  116,  118,  119,  121,  123,  125];
const DBP    = [ 64,   66,   70,   72,   76,   75,   74,   74,   75];
const TEMP   = [36.5, 36.6, 36.4, 36.7, 36.5, 36.8, 36.6, 36.5, 36.7];
const PULSE  = [ 72,   74,   78,   76,   80,   79,   82,   80,   78];
const RESP   = [ 16,   17,   18,   17,   19,   18,   20,   19,   18];
const SPO2   = [ 98,   98,   97,   98,   96,   97,   98,   99,   98];
const HEIGHT = [171.5, 171.5, 171.6, 171.6, 171.7, 171.7, 171.7, 171.7, 171.7];
const WEIGHT = [62.0, 62.5, 63.2, 63.8, 64.5, 65.2, 64.8, 64.0, 63.5];
const BMI    = [21.1, 21.3, 21.5, 21.7, 21.9, 22.1, 22.0, 21.7, 21.5]; // weight÷(height/100)²
const WAIST  = [ 78,   79,   80,   81,   82,   83,   82,   81,   80];

const CHART_W = 1200;
const CHART_H = 508;
const CHART_H_MIN = 280;
const PAD_L = 44;
const PAD_R = 16;
const PAD_T = 56;
const PAD_B = 48;

/** Match viewBox aspect to the chart container so the plot fills flex height
    and x-axis dates (y ≈ viewBoxH − 12) stay pinned to the bottom edge. */
function useResponsiveViewBoxHeight(containerRef, fillHeight) {
  const [viewBoxH, setViewBoxH] = useState(CHART_H);

  useLayoutEffect(() => {
    if (!fillHeight) {
      setViewBoxH(CHART_H);
      return undefined;
    }

    const node = containerRef.current;
    if (!node) return undefined;

    const measure = () => {
      const { width, height } = node.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      const next = Math.max(CHART_H_MIN, Math.round((height / width) * CHART_W));
      setViewBoxH((prev) => (prev === next ? prev : next));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, [fillHeight, containerRef]);

  return viewBoxH;
}

function buildPoints(values, minY, maxY, chartH = CHART_H) {
  const n = values.length;
  const innerW = CHART_W - PAD_L - PAD_R;
  const innerH = chartH - PAD_T - PAD_B;
  return values.map((v, i) => {
    const x = PAD_L + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
    const t = (v - minY) / (maxY - minY || 1);
    const y = PAD_T + (1 - t) * innerH;
    return { x, y, v };
  });
}

function xAtIndex(i, count) {
  const innerW = CHART_W - PAD_L - PAD_R;
  return PAD_L + (count <= 1 ? 0 : (i / (count - 1)) * innerW);
}

/* X-axis label thinning — at CHART_W=1200 with 9px labels, more than
   ~12 evenly-spaced ticks start to overlap (e.g. a multi-day inpatient
   observation log can run to dozens of entries). Data points/markers
   still render for every index (and stay hoverable); only the text
   label underneath gets skipped for indices outside the thinned set.
   Always keeps the first and last label so the axis range stays legible. */
const MAX_X_LABELS = 12;
function thinnedLabelIndices(count, max = MAX_X_LABELS) {
  const indices = new Set();
  if (count <= max) {
    for (let i = 0; i < count; i += 1) indices.add(i);
    return indices;
  }
  const step = Math.ceil((count - 1) / (max - 1));
  for (let i = 0; i < count; i += step) indices.add(i);
  indices.add(count - 1);
  return indices;
}

/* Convert SVG mouse event → nearest visit index. Maps pointer x through the
   rendered SVG width into viewBox x (works for fluid width and fillHeight). */
function useChartHover(count) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const xVB = ((e.clientX - rect.left) / rect.width) * CHART_W;
    if (xVB < PAD_L - 24 || xVB > CHART_W - PAD_R + 24) {
      setHoverIdx(null);
      return;
    }
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < count; i += 1) {
      const d = Math.abs(xVB - xAtIndex(i, count));
      if (d < bestD) { bestD = d; best = i; }
    }
    setHoverIdx(best);
  };
  const onLeave = () => setHoverIdx(null);
  return { hoverIdx, onMove, onLeave };
}

/* Floating tooltip — semantic tokens (mode-aware via CSS vars):
     surface/card/100         → bg
     border/popover/grey      → border
     shadow/dropdown          → shadow
     text/content/default     → value
     text/content/tertiary    → caption (date, unit) */
const ChartTooltip = ({ idx, count, children }) => {
  if (idx == null) return null;
  const leftPct = (xAtIndex(idx, count) / CHART_W) * 100;
  return (
    <div
      style={{
        position: 'absolute',
        top: 'var(--dim-space-600)',
        left: `${leftPct}%`,
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        background:    'var(--surface-card-100)',
        border:        'var(--dim-stroke-100) solid var(--border-popover-grey)',
        borderRadius:  'var(--dim-radius-200)',
        boxShadow:     'var(--shadow-dropdown)',
        padding:       'var(--dim-space-200) var(--dim-space-300)',
        fontFamily:    'var(--type-family-body)',
        fontSize:      'var(--type-size-xs)',
        whiteSpace:    'nowrap',
        zIndex: 2,
      }}
    >
      {children}
    </div>
  );
};

const TooltipDate = ({ children }) => (
  <div
    style={{
      color:      'var(--text-content-tertiary)',
      fontSize:   10,
      lineHeight: 1.3,
      marginBottom: 'var(--dim-space-100)',
    }}
  >
    {children}
  </div>
);

const TooltipRow = ({ color, name, value, unit }) => (
  <div className='flex items-center' style={{ gap: 'var(--dim-space-200)', lineHeight: 1.4 }}>
    <span style={{ width: 8, height: 8, borderRadius: 'var(--dim-radius-full)', background: color, flexShrink: 0 }} />
    <span style={{ color: 'var(--text-content-default)', fontWeight: 'var(--type-weight-medium)' }}>{name}</span>
    <span style={{ color: 'var(--text-content-default)', fontWeight: 'var(--type-weight-bold)' }}>{value}</span>
    {unit && <span style={{ color: 'var(--text-content-tertiary)' }}>{unit}</span>}
  </div>
);

const LegendSwatch = ({ color }) => (
  <span
    style={{
      width: 20,
      height: 8,
      borderRadius: 'var(--dim-radius-full)',
      background: color,
      flexShrink: 0,
    }}
  />
);

const chartSurfaceStyle = (fillHeight) => ({
  height: fillHeight ? '100%' : CHART_H,
  minHeight: fillHeight ? CHART_H_MIN : undefined,
  maxWidth: '100%',
  display: fillHeight ? 'flex' : undefined,
  flexDirection: fillHeight ? 'column' : undefined,
  background: 'var(--surface-chart-area)',
  border: 'var(--dim-stroke-100) solid var(--stroke-chart-grid)',
  borderRadius: 'var(--dim-radius-chart-area)',
});

const chartSvgStyle = (fillHeight) => ({
  cursor: 'crosshair',
  display: 'block',
  ...(fillHeight ? { flex: '1 1 0', minHeight: 0, width: '100%' } : {}),
});

const BloodPressureChart = ({
  fillHeight = false,
  sbpValues = SBP,
  dbpValues = DBP,
  xLabels = VISIT_DATES,
  minY = 60,
  maxY = 140,
  ticks = [140, 120, 100, 80, 60],
  thresholds = [],
}) => {
  const containerRef = useRef(null);
  const viewBoxH = useResponsiveViewBoxHeight(containerRef, fillHeight);
  const innerH = viewBoxH - PAD_T - PAD_B;

  const sbpPts = buildPoints(sbpValues, minY, maxY, viewBoxH);
  const dbpPts = buildPoints(dbpValues, minY, maxY, viewBoxH);
  const sbpLine = sbpPts.map((p) => `${p.x},${p.y}`).join(' ');
  const dbpLine = dbpPts.map((p) => `${p.x},${p.y}`).join(' ');
  const visibleLabelIndices = thinnedLabelIndices(xLabels.length);

  const gridY = ticks.map((tick) => {
    const t = (tick - minY) / (maxY - minY);
    return PAD_T + (1 - t) * innerH;
  });
  const thresholdY = thresholds.map((th) => ({
    ...th,
    y: PAD_T + (1 - (th.value - minY) / (maxY - minY || 1)) * innerH,
  }));

  const { hoverIdx, onMove, onLeave } = useChartHover(xLabels.length);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden${fillHeight ? ' flex-1 min-h-0' : ''}`}
      style={chartSurfaceStyle(fillHeight)}
    >
      {/* Legend */}
      <div
        className='absolute left-0 right-0 flex justify-center items-center'
        style={{ top: 'var(--dim-space-400)', gap: 'var(--dim-space-600)' }}
      >
        <div className='flex items-center' style={{ gap: 'var(--dim-space-100)' }}>
          <LegendSwatch color='var(--stroke-chart-series-sbp)' />
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 10, lineHeight: 1, color: 'var(--text-content-tertiary)' }}>
            SBP1
          </span>
        </div>
        <div className='flex items-center' style={{ gap: 'var(--dim-space-100)' }}>
          <LegendSwatch color='var(--stroke-chart-series-dbp)' />
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 10, lineHeight: 1, color: 'var(--text-content-tertiary)' }}>
            DBP1
          </span>
        </div>
      </div>

      <svg
        width='100%'
        height={fillHeight ? '100%' : CHART_H}
        viewBox={`0 0 ${CHART_W} ${viewBoxH}`}
        preserveAspectRatio='xMidYMid meet'
        role='img'
        aria-label='กราฟความดันโลหิต'
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={chartSvgStyle(fillHeight)}
      >
        {/* Transparent hit-area so mousemove fires across the entire plot */}
        <rect x={0} y={0} width={CHART_W} height={viewBoxH} fill='transparent' />
        {/* Y-axis labels + horizontal grid */}
        {ticks.map((tick, i) => {
          const y = gridY[i];
          return (
            <g key={tick}>
              <line x1={PAD_L} y1={y} x2={CHART_W - PAD_R} y2={y} stroke='var(--stroke-chart-grid)' strokeWidth={1} />
              <text x={4} y={y + 3} fill='var(--text-chart-axis-label)' style={{ fontFamily: 'var(--type-family-body)', fontSize: 9 }}>
                {tick}
              </text>
            </g>
          );
        })}

        {/* Clinical reference thresholds (e.g. hypertension band) */}
        {thresholdY.map((th) => (
          <line
            key={th.value}
            x1={PAD_L}
            y1={th.y}
            x2={CHART_W - PAD_R}
            y2={th.y}
            stroke={th.color}
            strokeWidth={1}
            strokeDasharray='4 3'
          />
        ))}

        {/* Hover crosshair */}
        {hoverIdx != null && (
          <line
            x1={xAtIndex(hoverIdx, xLabels.length)}
            x2={xAtIndex(hoverIdx, xLabels.length)}
            y1={PAD_T}
            y2={viewBoxH - PAD_B}
            stroke='var(--text-content-tertiary)'
            strokeWidth={1}
            strokeDasharray='4 4'
            opacity={0.5}
            pointerEvents='none'
          />
        )}

        <polyline fill='none' stroke='var(--stroke-chart-series-sbp)' strokeWidth={2} strokeLinejoin='round' strokeLinecap='round' points={sbpLine} pointerEvents='none' />
        <polyline fill='none' stroke='var(--stroke-chart-series-dbp)' strokeWidth={2} strokeLinejoin='round' strokeLinecap='round' points={dbpLine} pointerEvents='none' />

        {sbpPts.map((p, i) => {
          const active = hoverIdx === i;
          return (
            <g key={`sbp-${i}`} pointerEvents='none'>
              {active && <circle cx={p.x} cy={p.y} r={10} fill='var(--stroke-chart-series-sbp)' opacity={0.18} />}
              <circle cx={p.x} cy={p.y} r={active ? 5.5 : 4} fill='var(--surface-tabpill-default)' stroke='var(--stroke-chart-series-sbp)' strokeWidth={active ? 2.5 : 2} />
              <text x={p.x} y={p.y - 10} textAnchor='middle' fill='var(--stroke-chart-series-sbp)' style={{ fontFamily: 'var(--type-family-body)', fontSize: 10, fontWeight: 600 }}>
                {sbpValues[i]}
              </text>
            </g>
          );
        })}
        {dbpPts.map((p, i) => {
          const active = hoverIdx === i;
          return (
            <g key={`dbp-${i}`} pointerEvents='none'>
              {active && <circle cx={p.x} cy={p.y} r={10} fill='var(--stroke-chart-series-dbp)' opacity={0.18} />}
              <circle cx={p.x} cy={p.y} r={active ? 5.5 : 4} fill='var(--surface-tabpill-default)' stroke='var(--stroke-chart-series-dbp)' strokeWidth={active ? 2.5 : 2} />
              <text x={p.x} y={p.y - 10} textAnchor='middle' fill='var(--stroke-chart-series-dbp)' style={{ fontFamily: 'var(--type-family-body)', fontSize: 10, fontWeight: 600 }}>
                {dbpValues[i]}
              </text>
            </g>
          );
        })}

        {/* X-axis date labels — thinned when there are many points; every
            data point marker above stays hoverable regardless. */}
        {xLabels.map((label, i) => (
          visibleLabelIndices.has(i) && (
            <text
              key={`${label}-${i}`}
              x={xAtIndex(i, xLabels.length)}
              y={viewBoxH - 12}
              textAnchor='middle'
              fill={hoverIdx === i ? 'var(--text-content-default)' : 'var(--text-chart-axis-label)'}
              style={{ fontFamily: 'var(--type-family-body)', fontSize: 9, fontWeight: hoverIdx === i ? 600 : 400 }}
              pointerEvents='none'
            >
              {label}
            </text>
          )
        ))}
      </svg>

      <ChartTooltip idx={hoverIdx} count={xLabels.length}>
        {hoverIdx != null && (
          <>
            <TooltipDate>{xLabels[hoverIdx]}</TooltipDate>
            <TooltipRow color='var(--stroke-chart-series-sbp)' name='SBP' value={sbpValues[hoverIdx]} unit='mmHg' />
            <TooltipRow color='var(--stroke-chart-series-dbp)' name='DBP' value={dbpValues[hoverIdx]} unit='mmHg' />
          </>
        )}
      </ChartTooltip>
    </div>
  );
};

const TimeSeriesChart = ({
  values, minY, maxY, stroke, label, name, unit = '', yTicks, xLabels, fillHeight = false, thresholds = [],
}) => {
  const containerRef = useRef(null);
  const viewBoxH = useResponsiveViewBoxHeight(containerRef, fillHeight);
  const pts = buildPoints(values, minY, maxY, viewBoxH);
  const line = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const innerH = viewBoxH - PAD_T - PAD_B;
  const visibleLabelIndices = thinnedLabelIndices(xLabels.length);
  const gridY = yTicks.map((tick) => {
    const t = (tick - minY) / (maxY - minY || 1);
    return PAD_T + (1 - t) * innerH;
  });
  const thresholdY = thresholds.map((th) => ({
    ...th,
    y: PAD_T + (1 - (th.value - minY) / (maxY - minY || 1)) * innerH,
  }));

  const { hoverIdx, onMove, onLeave } = useChartHover(xLabels.length);
  const seriesName = name || (label || '').replace(/\s*\(.*\)\s*$/, '');

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden${fillHeight ? ' flex-1 min-h-0' : ''}`}
      style={chartSurfaceStyle(fillHeight)}
    >
      <div
        className='absolute left-0 right-0 flex justify-center items-center'
        style={{ top: 'var(--dim-space-400)', gap: 'var(--dim-space-600)' }}
      >
        <div className='flex items-center' style={{ gap: 'var(--dim-space-100)' }}>
          <LegendSwatch color={stroke} />
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 10, lineHeight: 1, color: 'var(--text-content-tertiary)' }}>
            {label}
          </span>
        </div>
      </div>

      <svg
        width='100%'
        height={fillHeight ? '100%' : CHART_H}
        viewBox={`0 0 ${CHART_W} ${viewBoxH}`}
        preserveAspectRatio='xMidYMid meet'
        role='img'
        aria-label={label}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={chartSvgStyle(fillHeight)}
      >
        <rect x={0} y={0} width={CHART_W} height={viewBoxH} fill='transparent' />
        {yTicks.map((tick, i) => {
          const y = gridY[i];
          return (
            <g key={tick}>
              <line x1={PAD_L} y1={y} x2={CHART_W - PAD_R} y2={y} stroke='var(--stroke-chart-grid)' strokeWidth={1} />
              <text x={4} y={y + 3} fill='var(--text-chart-axis-label)' style={{ fontFamily: 'var(--type-family-body)', fontSize: 9 }}>
                {tick}
              </text>
            </g>
          );
        })}

        {thresholdY.map((th) => (
          <line
            key={th.value}
            x1={PAD_L}
            y1={th.y}
            x2={CHART_W - PAD_R}
            y2={th.y}
            stroke={th.color}
            strokeWidth={1}
            strokeDasharray='4 3'
          />
        ))}

        {hoverIdx != null && (
          <line
            x1={xAtIndex(hoverIdx, xLabels.length)}
            x2={xAtIndex(hoverIdx, xLabels.length)}
            y1={PAD_T}
            y2={viewBoxH - PAD_B}
            stroke='var(--text-content-tertiary)'
            strokeWidth={1}
            strokeDasharray='4 4'
            opacity={0.5}
            pointerEvents='none'
          />
        )}

        <polyline fill='none' stroke={stroke} strokeWidth={2} strokeLinejoin='round' strokeLinecap='round' points={line} pointerEvents='none' />

        {pts.map((p, i) => {
          const active = hoverIdx === i;
          return (
            <g key={i} pointerEvents='none'>
              {active && <circle cx={p.x} cy={p.y} r={10} fill={stroke} opacity={0.18} />}
              <circle cx={p.x} cy={p.y} r={active ? 5.5 : 4} fill='var(--surface-tabpill-default)' stroke={stroke} strokeWidth={active ? 2.5 : 2} />
              <text x={p.x} y={p.y - 10} textAnchor='middle' fill={stroke} style={{ fontFamily: 'var(--type-family-body)', fontSize: 10, fontWeight: 600 }}>
                {values[i]}
              </text>
            </g>
          );
        })}

        {/* X-axis labels — thinned when there are many points; every data
            point marker above stays hoverable regardless. */}
        {xLabels.map((labelText, i) => (
          visibleLabelIndices.has(i) && (
            <text
              key={`${labelText}-${i}`}
              x={xAtIndex(i, xLabels.length)}
              y={viewBoxH - 12}
              textAnchor='middle'
              fill={hoverIdx === i ? 'var(--text-content-default)' : 'var(--text-chart-axis-label)'}
              style={{ fontFamily: 'var(--type-family-body)', fontSize: 9, fontWeight: hoverIdx === i ? 600 : 400 }}
              pointerEvents='none'
            >
              {labelText}
            </text>
          )
        ))}
      </svg>

      <ChartTooltip idx={hoverIdx} count={xLabels.length}>
        {hoverIdx != null && (
          <>
            <TooltipDate>{xLabels[hoverIdx]}</TooltipDate>
            <TooltipRow color={stroke} name={seriesName} value={values[hoverIdx]} unit={unit} />
          </>
        )}
      </ChartTooltip>
    </div>
  );
};

const VitalsSignGraph = ({
  initialTab = 'pressure',
  activeTab: activeTabProp,
  onActiveTabChange,
  fillHeight = false,
}) => {
  const [internalTab, setInternalTab] = useState(initialTab);
  const activeId = activeTabProp ?? internalTab;
  const setActiveId = onActiveTabChange ?? setInternalTab;

  const chart = useMemo(() => {
    switch (activeId) {
      case 'pressure':
        return <BloodPressureChart fillHeight={fillHeight} />;
      case 'temp':
        return (
          <TimeSeriesChart
            values={TEMP}
            minY={35.5}
            maxY={38}
            stroke='var(--brand-p500)'
            label='อุณหภูมิ (°C)'
            name='อุณหภูมิ'
            unit='°C'
            yTicks={[38, 37.5, 37, 36.5, 36, 35.5]}
            xLabels={VISIT_DATES}
            fillHeight={fillHeight}
          />
        );
      case 'pulse':
        return (
          <TimeSeriesChart
            values={PULSE}
            minY={60}
            maxY={100}
            stroke='var(--text-colorfulbadge-orange)'
            label='ชีพจร (ครั้ง/นาที)'
            name='ชีพจร'
            unit='ครั้ง/นาที'
            yTicks={[100, 90, 80, 70, 60]}
            xLabels={VISIT_DATES}
            fillHeight={fillHeight}
          />
        );
      case 'resp':
        return (
          <TimeSeriesChart
            values={RESP}
            minY={12}
            maxY={24}
            stroke='var(--brand-p600)'
            label='อัตราการหายใจ (ครั้ง/นาที)'
            name='อัตราการหายใจ'
            unit='ครั้ง/นาที'
            yTicks={[24, 20, 16, 12]}
            xLabels={VISIT_DATES}
            fillHeight={fillHeight}
          />
        );
      case 'spo2':
        return (
          <TimeSeriesChart
            values={SPO2}
            minY={90}
            maxY={100}
            stroke='var(--text-colorfulbadge-blue)'
            label='SpO₂ (%)'
            name='SpO₂'
            unit='%'
            yTicks={[100, 98, 96, 94, 92, 90]}
            xLabels={VISIT_DATES}
            fillHeight={fillHeight}
          />
        );
      case 'height':
        return (
          <TimeSeriesChart
            values={HEIGHT}
            minY={168}
            maxY={174}
            stroke='var(--stroke-chart-series-sbp)'
            label='ส่วนสูง (ซม.)'
            name='ส่วนสูง'
            unit='ซม.'
            yTicks={[174, 172, 170, 168]}
            xLabels={VISIT_DATES}
            fillHeight={fillHeight}
          />
        );
      case 'weight':
        return (
          <TimeSeriesChart
            values={WEIGHT}
            minY={58}
            maxY={68}
            stroke='var(--brand-p600)'
            label='น้ำหนัก (กก.)'
            name='น้ำหนัก'
            unit='กก.'
            yTicks={[68, 66, 64, 62, 60, 58]}
            xLabels={VISIT_DATES}
            fillHeight={fillHeight}
          />
        );
      case 'bmi':
        return (
          <TimeSeriesChart
            values={BMI}
            minY={18}
            maxY={25}
            stroke='var(--text-colorfulbadge-teal)'
            label='BMI (กก./ม.²)'
            name='BMI'
            unit='กก./ม.²'
            yTicks={[25, 23, 21, 19]}
            xLabels={VISIT_DATES}
            fillHeight={fillHeight}
          />
        );
      case 'waist':
        return (
          <TimeSeriesChart
            values={WAIST}
            minY={70}
            maxY={90}
            stroke='var(--stroke-chart-series-dbp)'
            label='เส้นรอบเอว (ซม.)'
            name='เส้นรอบเอว'
            unit='ซม.'
            yTicks={[90, 85, 80, 75, 70]}
            xLabels={VISIT_DATES}
            fillHeight={fillHeight}
          />
        );
      default:
        return null;
    }
  }, [activeId, fillHeight]);

  return (
    <div
      className={`flex flex-col w-full${fillHeight ? ' h-full min-h-0 flex-1' : ''}`}
      style={{
        background: 'var(--surface-card-100)',
        maxWidth: '100%',
      }}
    >
      <div
        className={`flex flex-col w-full items-center${fillHeight ? ' flex-1 min-h-0' : ''}`}
        style={{
          gap: 'var(--dim-space-400)',
          minHeight: fillHeight ? 0 : 580,
          borderRadius: 'var(--dim-radius-400)',
          paddingLeft: 'var(--dim-space-600)',
          paddingRight: 'var(--dim-space-600)',
        }}
      >
        {/* Tab Bar — design system component (Figma 2853:62776 / 2514:7929)
           Per Figma: each Pill hugs its label (no stretch); the group is
           centered inside the bar.                                              */}
        <TabBar
          aria-label='เลือกประเภทสัญญาณชีพ'
          align='center'
          className={fillHeight ? 'shrink-0' : undefined}
          style={{ maxWidth: '100%' }}
        >
          {VITAL_TABS.map((tab) => (
            <TabPillLarge
              key={tab.id}
              showIcon={false}
              selected={tab.id === activeId}
              id={`vitals-tab-${tab.id}`}
              onClick={() => setActiveId(tab.id)}
            >
              {tab.label}
            </TabPillLarge>
          ))}
        </TabBar>

        <div
          className={`w-full flex justify-center overflow-x-auto${fillHeight ? ' flex-1 min-h-0' : ''}`}
          style={{ maxWidth: '100%' }}
        >
          <div
            className={fillHeight ? 'flex h-full min-h-0 w-full max-w-full flex-col' : undefined}
            style={fillHeight ? undefined : { width: CHART_W, maxWidth: '100%' }}
          >
            {chart}
          </div>
        </div>
      </div>
    </div>
  );
};

export { BloodPressureChart, TimeSeriesChart };
export default VitalsSignGraph;
