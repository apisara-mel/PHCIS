import React, { useState } from 'react';
import TabCapsule from '@/components/tab/TabCapsule';
import Icon from '@/components/icons/Icon';
import { LineChart } from '@/components/graph/Charts';
import PHCIS_CHART from '@/data/phcisChartPalette';
import { formatShortThaiDate, computeBmi } from '@/data/checkupStore';

/* CheckupTrendSection — กราฟแนวโน้มผลตรวจสุขภาพข้ามครั้ง (TOR 1.19.11 / 1.19.12).

   Module-local composition, NOT a design-system component: it only arranges the
   shared `LineChart` from components/graph/Charts.jsx plus TabCapsule + Icon.
   The metric-grouping pattern is copied from NcdTrendSection (clinic/ncd) rather
   than imported — that module belongs to another builder in this wave
   (playbook §4 file scope) and Charts.jsx is deliberately untouched.

   Honest handling of the data problems, same as the NCD version:
     • Checkup visits are irregular annual dates. LineChart spaces points evenly
       and labels them with the real visit date — elapsed time is NOT to scale.
     • A metric measured on only SOME visits is plotted only for the visits that
       actually carry it — no zero-filling, no carry-forward.
     • Metrics with different scales never share an axis; SBP/DBP do because
       they share a unit and are always measured together.
     • LineChart's y-axis starts at 0, which flattens narrow-range metrics, so
       every chart also prints ต่ำสุด–สูงสุด and first→last change as text. */

const REF_COLOR = 'var(--border-neutral-tertiary, #E2E4E6)';

const CHART_DEFS = {
  body: {
    label: 'น้ำหนัก / BMI / รอบเอว',
    charts: [
      {
        key: 'weight',
        title: 'น้ำหนักตัว',
        unit: 'กก.',
        series: [{ key: 'weight', label: 'น้ำหนัก', color: PHCIS_CHART.pink }],
      },
      {
        key: 'bmi',
        title: 'ดัชนีมวลกาย (BMI)',
        unit: 'kg/m²',
        series: [{ key: 'bmi', label: 'BMI', color: PHCIS_CHART.teal }],
        refs: [{ value: 23, label: 'เกณฑ์น้ำหนักเกิน 23' }],
      },
      {
        key: 'waist',
        title: 'รอบเอว',
        unit: 'ซม.',
        series: [{ key: 'waist', label: 'รอบเอว', color: PHCIS_CHART.indigo }],
        refs: [{ value: 90, label: 'เกณฑ์ชาย 90' }],
      },
    ],
  },
  bp: {
    label: 'ความดันโลหิต',
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
  sugar: {
    label: 'น้ำตาลในเลือด',
    charts: [
      {
        key: 'fbs',
        title: 'น้ำตาลขณะอดอาหาร (FBS)',
        unit: 'mg/dL',
        series: [{ key: 'FBS', label: 'FBS', color: PHCIS_CHART.teal }],
        refs: [{ value: 126, label: 'เกณฑ์เบาหวาน 126' }],
      },
      {
        key: 'hba1c',
        title: 'น้ำตาลสะสม (HbA1c)',
        unit: '%',
        series: [{ key: 'HBA1C', label: 'HbA1c', color: PHCIS_CHART.pink }],
        refs: [{ value: 5.7, label: 'เกณฑ์เสี่ยง 5.7%' }],
      },
    ],
  },
  lipid: {
    label: 'ไขมันในเลือด',
    charts: [
      {
        key: 'chol',
        title: 'โคเลสเตอรอลรวม',
        unit: 'mg/dL',
        series: [{ key: 'CHOL', label: 'Cholesterol', color: PHCIS_CHART.yellow }],
        refs: [{ value: 200, label: 'เกณฑ์ 200' }],
      },
      {
        key: 'ldlhdl',
        title: 'ไขมันเลว / ไขมันดี (LDL / HDL)',
        unit: 'mg/dL',
        series: [
          { key: 'LDL', label: 'LDL', color: PHCIS_CHART.pink },
          { key: 'HDL', label: 'HDL', color: PHCIS_CHART.teal },
        ],
        refs: [{ value: 130, label: 'เกณฑ์ LDL 130' }],
      },
      {
        key: 'tg',
        title: 'ไตรกลีเซอไรด์',
        unit: 'mg/dL',
        series: [{ key: 'TG', label: 'Triglyceride', color: PHCIS_CHART.indigo }],
        refs: [{ value: 150, label: 'เกณฑ์ 150' }],
      },
    ],
  },
  renalLiver: {
    label: 'ไต / ตับ',
    charts: [
      {
        key: 'egfr',
        title: 'อัตรากรองของไต (eGFR)',
        unit: 'mL/min/1.73m²',
        series: [{ key: 'EGFR', label: 'eGFR', color: PHCIS_CHART.indigo }],
        refs: [{ value: 60, label: 'เกณฑ์โรคไตเรื้อรัง 60' }],
      },
      {
        key: 'sgpt',
        title: 'เอนไซม์ตับ (SGPT)',
        unit: 'U/L',
        series: [{ key: 'SGPT', label: 'SGPT', color: PHCIS_CHART.yellow }],
        refs: [{ value: 40, label: 'เกณฑ์ 40' }],
      },
    ],
  },
};

const TAB_ORDER = ['body', 'bp', 'sugar', 'lipid', 'renalLiver'];

/* Vital-signs keys read from record.vitals; everything else from record.results. */
const VITAL_KEYS = { weight: 'weight', waist: 'waist', sbp: 'sbp', dbp: 'dbp' };

const pointValue = (record, key) => {
  if (!record) return null;
  if (key === 'bmi') return computeBmi(record.vitals?.weight, record.vitals?.height);
  if (VITAL_KEYS[key]) {
    const raw = record.vitals?.[VITAL_KEYS[key]];
    if (raw === '' || raw == null) return null;
    const n = Number(raw);
    return Number.isNaN(n) ? null : n;
  }
  const raw = record.results?.[key];
  if (raw === '' || raw == null) return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
};

const round1 = (n) => Math.round(n * 10) / 10;

const EmptyChartNote = ({ children }) => (
  <div
    className='flex flex-col items-center text-center w-full'
    style={{
      gap: 'var(--dim-space-200)',
      paddingTop: 'var(--dim-space-600)',
      paddingBottom: 'var(--dim-space-600)',
      paddingLeft: 'var(--dim-space-400)',
      paddingRight: 'var(--dim-space-400)',
      borderRadius: 'var(--dim-radius-300, 10px)',
      border: 'var(--dim-stroke-100) dashed var(--border-neutral-tertiary, #E2E4E6)',
      color: 'var(--text-content-tertiary, #858C92)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-sm, 14px)',
    }}
  >
    <Icon name='monitoring' size={24} />
    <span>{children}</span>
  </div>
);

const MetricChart = ({ def, visits, records, selectedIdx, onSelect }) => {
  const points = visits
    .map((v, idx) => ({ v, idx }))
    .filter((p) => def.series.every((s) => pointValue(records[p.idx], s.key) != null));

  const title = (
    <div className='flex items-baseline w-full flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))', color: 'var(--text-content-default, #363B3F)' }}>
        {def.title}
      </span>
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
        {`หน่วย ${def.unit} · ${points.length} ครั้ง`}
      </span>
    </div>
  );

  if (points.length === 0) {
    return (
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
        {title}
        <EmptyChartNote>{`ไม่มีผล${def.title}ในประวัติการตรวจของผู้รับบริการรายนี้`}</EmptyChartNote>
      </div>
    );
  }

  if (points.length === 1) {
    const only = points[0];
    return (
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
        {title}
        <EmptyChartNote>
          {`มีข้อมูลเพียง 1 ครั้ง (${formatShortThaiDate(only.v.visitDate)}${def.series.map((s) => ` · ${s.label} ${pointValue(records[only.idx], s.key)} ${def.unit}`).join('')}) — ยังไม่พอสำหรับแสดงแนวโน้ม`}
        </EmptyChartNote>
      </div>
    );
  }

  const months = points.map((p) => formatShortThaiDate(p.v.visitDate));
  const dataSeries = def.series.map((s) => ({
    label: s.label,
    color: s.color,
    values: points.map((p) => pointValue(records[p.idx], s.key)),
  }));
  const refSeries = (def.refs || []).map((r) => ({
    label: r.label,
    color: REF_COLOR,
    values: points.map(() => r.value),
  }));

  const summary = def.series.map((s) => {
    const values = points.map((p) => pointValue(records[p.idx], s.key));
    const first = values[0];
    const last = values[values.length - 1];
    return {
      label: s.label,
      min: round1(Math.min(...values)),
      max: round1(Math.max(...values)),
      first: round1(first),
      last: round1(last),
      delta: round1(last - first),
    };
  });

  const activeIdx = points.findIndex((p) => p.idx === selectedIdx);

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
      {title}
      <LineChart
        months={months}
        series={[...dataSeries, ...refSeries]}
        height={200}
        activeMonth={activeIdx >= 0 ? activeIdx : null}
        onMonthClick={(i) => onSelect?.(points[i].idx)}
      />
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
        {summary.map((s) => (
          <span key={s.label} style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)' }}>
            {`${s.label}: ต่ำสุด ${s.min} · สูงสุด ${s.max} · ครั้งแรก ${s.first} → ล่าสุด ${s.last} ${def.unit} · `}
            <span
              style={{
                color: s.delta === 0
                  ? 'var(--text-content-tertiary, #858C92)'
                  : 'var(--text-content-default, #363B3F)',
                fontWeight: 'var(--type-weight-medium, 500)',
              }}
            >
              {s.delta > 0 ? `เพิ่มขึ้น ${s.delta}` : s.delta < 0 ? `ลดลง ${Math.abs(s.delta)}` : 'ไม่เปลี่ยนแปลง'}
            </span>
          </span>
        ))}
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
          แกนนอนเรียงตามครั้งที่รับบริการ (ระยะห่างเท่ากันทุกจุด ไม่ได้ตามระยะเวลาจริง) · คลิกจุดเพื่อเลือกครั้งนั้น
        </span>
      </div>
    </div>
  );
};

const CheckupTrendSection = ({ visits = [], records = [], selectedIdx = null, onSelect }) => {
  const [tabKey, setTabKey] = useState(TAB_ORDER[0]);
  const activeDef = CHART_DEFS[tabKey] || CHART_DEFS.body;

  if (visits.length === 0) {
    return <EmptyChartNote>ยังไม่มีประวัติการตรวจสุขภาพที่สรุปผลแล้ว — กราฟแนวโน้มจะแสดงเมื่อมีผลตรวจอย่างน้อย 2 ครั้ง</EmptyChartNote>;
  }

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        {TAB_ORDER.map((key) => (
          <TabCapsule
            key={key}
            variant='filter'
            label={CHART_DEFS[key].label}
            selected={tabKey === key}
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
            records={records}
            selectedIdx={selectedIdx}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
};

export default CheckupTrendSection;
