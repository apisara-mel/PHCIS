import React, { useState } from 'react';
import Icon from '@/components/icons/Icon';
import TabCapsule from '@/components/tab/TabCapsule';
import { LineChart } from '@/components/graph/Charts';
import PHCIS_CHART from '@/data/phcisChartPalette';
import { formatNcdDate } from '@/data/ncdVisits';

/* NcdTrendSection — "กราฟต่อเนื่องในช่วงเวลา" for TOR 1.10.2.8.

   Replaces the data-less <VitalsSignGraphDialog> that used to sit on
   NcdFollowUpPage: that dialog takes no data props and renders VitalsSignGraph's
   STATIC demo series, so a per-patient clinical page was showing someone
   else's numbers. This section is driven by the very same `visits` array the
   ตาราง and the gauges use, so all three views of the period always agree.

   Module-local composition (not a new design-system component): it only
   arranges the shared `LineChart` from components/graph/Charts.jsx plus
   TabCapsule + Icon. Charts.jsx is a shared file that other modules depend
   on — it is deliberately NOT forked or modified.

   Shape of the data problem, and how it is handled honestly:
     • NCD visits are irregular ISO dates, not months. LineChart spaces points
       evenly and labels them with the real visit date — consistent with every
       other chart in the app, but elapsed time is NOT to scale (flagged in
       the manifest).
     • A metric is often measured on only SOME visits (HbA1c quarterly, LDL
       yearly, PEFR only for asthma/COPD). LineChart cannot draw a gap, so
       each chart plots ONLY the visits that actually carry every one of its
       series — no zero-filling, no carry-forward, nothing invented.
     • Metrics with different scales never share an axis (FBS ~130 would
       flatten HbA1c ~7 to the baseline), so each gets its own chart. SBP/DBP
       do share one — same unit, same scale, always measured together.
     • LineChart's y-axis starts at 0, which visually compresses
       narrow-range metrics (SpO₂ 93–99). Every chart therefore also prints
       its ต่ำสุด–สูงสุด and the first→last change in text, so the magnitude
       of the trend is readable even when the line looks flat. */

/* Reference lines (เกณฑ์ควบคุม) render as a flat extra series — LineChart has
   no dedicated reference API and forking it is out of scope. Neutral border
   token so it never competes with a real data series. */
const REF_COLOR = 'var(--border-neutral-tertiary, #C6CACD)';

const CHART_DEFS = {
  sugar: {
    label: 'น้ำตาล',
    /* which registered disease groups make this tab relevant */
    groups: ['dm'],
    charts: [
      {
        key: 'fbs',
        title: 'น้ำตาลในเลือดขณะอดอาหาร (FBS)',
        unit: 'mg/dL',
        series: [{ key: 'fbs', label: 'FBS', color: PHCIS_CHART.teal }],
        refs: [{ value: 126, label: 'เกณฑ์เบาหวาน 126' }],
      },
      {
        key: 'hba1c',
        title: 'น้ำตาลสะสม (HbA1c)',
        unit: '%',
        series: [{ key: 'hba1c', label: 'HbA1c', color: PHCIS_CHART.pink }],
        refs: [{ value: 7, label: 'เป้าหมาย 7%' }],
      },
    ],
  },
  bp: {
    label: 'ความดันโลหิต',
    groups: ['ht', 'dm'],
    charts: [
      {
        key: 'bp',
        title: 'ความดันโลหิต (SBP / DBP)',
        unit: 'mmHg',
        series: [
          { key: 'sbp', label: 'SBP', color: PHCIS_CHART.indigo },
          { key: 'dbp', label: 'DBP', color: PHCIS_CHART.teal },
        ],
        refs: [
          { value: 140, label: 'เกณฑ์ SBP 140' },
          { value: 90, label: 'เกณฑ์ DBP 90' },
        ],
      },
    ],
  },
  lipidRenal: {
    label: 'ไขมัน / ไต',
    groups: ['dm', 'ht'],
    charts: [
      {
        key: 'ldl',
        title: 'ไขมันเลว (LDL)',
        unit: 'mg/dL',
        series: [{ key: 'ldl', label: 'LDL', color: PHCIS_CHART.yellow }],
        refs: [{ value: 100, label: 'เป้าหมาย 100' }],
      },
      {
        key: 'egfr',
        title: 'อัตรากรองของไต (eGFR)',
        unit: 'mL/min/1.73m²',
        series: [{ key: 'egfr', label: 'eGFR', color: PHCIS_CHART.indigo }],
        refs: [{ value: 60, label: 'เกณฑ์โรคไตเรื้อรัง 60' }],
      },
    ],
  },
  lung: {
    label: 'สมรรถภาพปอด',
    groups: ['asthma', 'copd'],
    charts: [
      {
        key: 'pefr',
        title: 'ค่าเป่าปอดสูงสุด (PEFR)',
        unit: 'L/min',
        series: [{ key: 'pefr', label: 'PEFR', color: PHCIS_CHART.teal }],
      },
      {
        key: 'spo2',
        title: 'ความอิ่มตัวออกซิเจนปลายนิ้ว (SpO₂)',
        unit: '%',
        series: [{ key: 'spo2', label: 'SpO₂', color: PHCIS_CHART.indigo }],
        refs: [{ value: 95, label: 'เกณฑ์ 95%' }],
      },
    ],
  },
  weight: {
    label: 'น้ำหนักตัว',
    groups: null, // always offered — every NCD visit weighs the patient
    charts: [
      {
        key: 'weight',
        title: 'น้ำหนักตัว',
        unit: 'กก.',
        series: [{ key: 'weight', label: 'น้ำหนัก', color: PHCIS_CHART.pink }],
      },
    ],
  },
};

const TAB_ORDER = ['sugar', 'bp', 'lipidRenal', 'lung', 'weight'];

const EmptyChartNote = ({ children }) => (
  <div
    className='flex flex-col items-center text-center w-full'
    style={{
      gap: 'var(--dim-space-200)',
      paddingTop: 'var(--dim-space-600)',
      paddingBottom: 'var(--dim-space-600)',
      paddingLeft: 'var(--dim-space-400)',
      paddingRight: 'var(--dim-space-400)',
      borderRadius: 'var(--dim-radius-300)',
      border: 'var(--dim-stroke-100) dashed var(--border-neutral-tertiary, #C6CACD)',
      color: 'var(--text-content-tertiary)',
      fontSize: 'var(--type-size-sm)',
    }}
  >
    <Icon name='monitoring' size={24} />
    <span>{children}</span>
  </div>
);

const round1 = (n) => Math.round(n * 10) / 10;

/* One metric chart: builds its own x-axis from the visits that actually
   carry every series it draws, so nothing is zero-filled or carried
   forward. Returns the empty / single-point states instead of an axis. */
const MetricChart = ({ def, visits, selectedVisitIdx, onSelectVisit }) => {
  const points = visits
    .map((v, idx) => ({ v, idx }))
    .filter((p) => def.series.every((s) => p.v[s.key] != null));

  if (points.length === 0) {
    return (
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
        <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default)' }}>
          {def.title}
        </span>
        <EmptyChartNote>
          ไม่มีผล{def.title}ในช่วงเวลาที่เลือก — สั่งตรวจได้จากขั้นตอนคำสั่งการรักษา
        </EmptyChartNote>
      </div>
    );
  }

  if (points.length === 1) {
    const only = points[0];
    return (
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
        <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default)' }}>
          {def.title}
        </span>
        <EmptyChartNote>
          มีข้อมูลเพียง 1 ครั้ง ({formatNcdDate(only.v.date)}
          {def.series.map((s) => ` · ${s.label} ${only.v[s.key]} ${def.unit}`).join('')})
          — ยังไม่พอสำหรับแสดงแนวโน้ม
        </EmptyChartNote>
      </div>
    );
  }

  const months = points.map((p) => formatNcdDate(p.v.date));
  const dataSeries = def.series.map((s) => ({
    label: s.label,
    color: s.color,
    values: points.map((p) => p.v[s.key]),
  }));
  const refSeries = (def.refs || []).map((r) => ({
    label: r.label,
    color: REF_COLOR,
    values: points.map(() => r.value),
  }));

  /* Text summary — makes the magnitude readable even when LineChart's
     zero-based axis flattens a narrow-range metric. */
  const summary = def.series.map((s) => {
    const values = points.map((p) => p.v[s.key]);
    const first = values[0];
    const last = values[values.length - 1];
    const delta = round1(last - first);
    return {
      label: s.label,
      min: round1(Math.min(...values)),
      max: round1(Math.max(...values)),
      first: round1(first),
      last: round1(last),
      delta,
    };
  });

  const activeIdx = points.findIndex((p) => p.idx === selectedVisitIdx);

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
      <div className='flex items-baseline w-full flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default)' }}>
          {def.title}
        </span>
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
          หน่วย {def.unit} · {points.length} ครั้ง
        </span>
      </div>

      <LineChart
        months={months}
        series={[...dataSeries, ...refSeries]}
        height={200}
        activeMonth={activeIdx >= 0 ? activeIdx : null}
        onMonthClick={(i) => onSelectVisit?.(points[i].idx, points[i].v)}
      />

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
        {summary.map((s) => (
          <span key={s.label} style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}>
            {s.label}: ต่ำสุด {s.min} · สูงสุด {s.max} · ครั้งแรก {s.first} → ล่าสุด {s.last} {def.unit}
            {' · '}
            <span
              style={{
                color: s.delta === 0
                  ? 'var(--text-content-tertiary)'
                  : s.delta < 0
                    ? 'var(--text-brandPrimary-default, #007549)'
                    : 'var(--text-danger-default, #C72121)',
                fontWeight: 'var(--type-weight-medium)',
              }}
            >
              {s.delta > 0 ? `เพิ่มขึ้น ${s.delta}` : s.delta < 0 ? `ลดลง ${Math.abs(s.delta)}` : 'ไม่เปลี่ยนแปลง'}
            </span>
          </span>
        ))}
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
          แกนนอนเรียงตามครั้งที่รับบริการ (ระยะห่างเท่ากันทุกจุด ไม่ได้ตามระยะเวลาจริง) · คลิกจุดเพื่อดูรายละเอียดของครั้งนั้น
        </span>
      </div>
    </div>
  );
};

const NcdTrendSection = ({
  visits = [],
  diseaseGroups = [],
  selectedVisitIdx = null,
  onSelectVisit,
}) => {
  /* Metric tabs follow the registered disease groups the same way the gauges
     do; a patient with no registration falls back to the generic full set
     rather than rendering nothing (spec edge case NOT-IN-REGISTRY). */
  const availableKeys = TAB_ORDER.filter((key) => {
    const def = CHART_DEFS[key];
    if (!def.groups) return true;
    if (diseaseGroups.length === 0) return true;
    return def.groups.some((g) => diseaseGroups.includes(g));
  });

  const [tabKey, setTabKey] = useState(availableKeys[0] || 'weight');
  const activeKey = availableKeys.includes(tabKey) ? tabKey : availableKeys[0];
  const activeDef = CHART_DEFS[activeKey];

  if (visits.length === 0) {
    return <EmptyChartNote>ยังไม่มีข้อมูลในช่วงเวลาที่เลือก — ปรับช่วงเวลาเพื่อดูแนวโน้ม</EmptyChartNote>;
  }

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        {availableKeys.map((key) => (
          <TabCapsule
            key={key}
            variant='filter'
            label={CHART_DEFS[key].label}
            selected={activeKey === key}
            onClick={() => setTabKey(key)}
          />
        ))}
      </div>

      <div className='grid grid-cols-1 xl:grid-cols-2 w-full' style={{ gap: 'var(--dim-space-600)' }}>
        {activeDef.charts.map((def) => (
          <MetricChart
            key={def.key}
            def={def}
            visits={visits}
            selectedVisitIdx={selectedVisitIdx}
            onSelectVisit={onSelectVisit}
          />
        ))}
      </div>
    </div>
  );
};

export default NcdTrendSection;
