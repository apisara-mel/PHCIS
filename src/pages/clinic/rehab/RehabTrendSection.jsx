import React, { useState } from 'react';
import Icon from '@/components/icons/Icon';
import TabCapsule from '@/components/tab/TabCapsule';
import { LineChart } from '@/components/graph/Charts';
import PHCIS_CHART from '@/data/phcisChartPalette';
import { formatRehabDate } from '@/data/rehabVisits';

/* RehabTrendSection — "กราฟแนวโน้มในช่วงเวลา" สำหรับ TOR 1.10.10.8.

   เป็น composition ระดับโมดูล (ไม่ใช่ DS component ใหม่): จัดวาง `LineChart`
   ที่ใช้ร่วมกันจาก components/graph/Charts.jsx + TabCapsule + Icon เท่านั้น.
   Charts.jsx เป็นไฟล์ที่โมดูลอื่นพึ่งพา — จงใจไม่ fork และไม่แก้.

   ทำไมไม่ import NcdTrendSection: มันอยู่ในโฟลเดอร์ของโมดูล ncd และผูกกับ
   ตัวชี้วัด NCD (FBS/HbA1c/LDL/eGFR) — ข้ามโฟลเดอร์โมดูลผิดกติกาขอบเขตไฟล์
   (playbook §4) และตัวชี้วัดก็คนละชุดกับงานฟื้นฟู.

   ความซื่อสัตย์ของข้อมูล (เหมือน NcdTrendSection):
     • วันที่มารับบริการไม่สม่ำเสมอ LineChart วางจุดห่างเท่ากันและกำกับด้วย
       วันที่จริง — ระยะเวลาบนแกนนอน "ไม่ได้ตามสเกลเวลาจริง" (แจ้งไว้ใต้กราฟ)
     • ตัวชี้วัดหลายตัววัดเฉพาะบางครั้ง (ROM วัดเฉพาะครั้งที่มาที่คลินิก) —
       กราฟแต่ละอันพล็อตเฉพาะครั้งที่มีค่าครบทุก series ของตัวเอง
       ไม่เติมศูนย์ ไม่ carry-forward
     • ตัวชี้วัดคนละสเกลไม่ใช้แกนร่วมกัน (Barthel 0–100 กับองศา ROM)
     • LineChart เริ่มแกน y ที่ 0 ซึ่งทำให้ช่วงแคบดูแบน — ทุกกราฟจึงพิมพ์
       ต่ำสุด–สูงสุด และการเปลี่ยนแปลงครั้งแรก→ล่าสุดเป็นข้อความกำกับ */

const REF_COLOR = 'var(--border-neutral-tertiary, #C6CACD)';

const CHART_DEFS = {
  adl: {
    label: 'ความสามารถในการทำกิจวัตร (Barthel)',
    charts: [
      {
        key: 'barthel',
        title: 'คะแนน Barthel ADL Index',
        unit: 'คะแนน',
        higherIsBetter: true,
        series: [{ key: 'barthel', label: 'Barthel', color: PHCIS_CHART.teal }],
        refs: [{ value: 60, label: 'เกณฑ์พึ่งพาปานกลาง 60' }],
      },
    ],
  },
  rom: {
    label: 'พิสัยการเคลื่อนไหว (ROM)',
    charts: [
      {
        key: 'romKnee',
        title: 'องศาการงอเข่า (Knee flexion)',
        unit: 'องศา',
        higherIsBetter: true,
        series: [{ key: 'romKnee', label: 'Knee flexion', color: PHCIS_CHART.indigo }],
        refs: [{ value: 120, label: 'เป้าหมายทั่วไป 120°' }],
      },
      {
        key: 'romShoulder',
        title: 'องศาการยกไหล่ (Shoulder)',
        unit: 'องศา',
        higherIsBetter: true,
        series: [{ key: 'romShoulder', label: 'Shoulder', color: PHCIS_CHART.pink }],
        refs: [{ value: 150, label: 'เป้าหมายทั่วไป 150°' }],
      },
    ],
  },
  muscle: {
    label: 'กำลังกล้ามเนื้อ',
    charts: [
      {
        key: 'muscleGrade',
        title: 'เกรดกำลังกล้ามเนื้อที่อ่อนที่สุด (MMT)',
        unit: 'เกรด (0–5)',
        higherIsBetter: true,
        series: [{ key: 'muscleGrade', label: 'MMT', color: PHCIS_CHART.yellow }],
        refs: [{ value: 5, label: 'ปกติ 5' }],
      },
    ],
  },
  vitals: {
    label: 'ชีพจร',
    charts: [
      {
        key: 'pulse',
        title: 'ชีพจรก่อนทำกายภาพ',
        unit: 'ครั้ง/นาที',
        higherIsBetter: false,
        series: [{ key: 'pulse', label: 'ชีพจร', color: PHCIS_CHART.teal }],
        refs: [{ value: 100, label: 'เกณฑ์เฝ้าระวัง 100' }],
      },
    ],
  },
};

const TAB_ORDER = ['adl', 'rom', 'muscle', 'vitals'];

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

/* กราฟหนึ่งตัวชี้วัด: สร้างแกนนอนจากเฉพาะครั้งที่มีค่าครบทุก series ของตัวเอง
   คืน state ว่าง / จุดเดียว แทนการวาดแกนหลอก. */
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
          ไม่มีข้อมูล{def.title}ในช่วงเวลาที่เลือก — บันทึกค่าได้จากขั้นตอนตรวจร่างกาย/ประเมิน ADLs
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
          มีข้อมูลเพียง 1 ครั้ง ({formatRehabDate(only.v.date)}
          {def.series.map((s) => ` · ${s.label} ${only.v[s.key]} ${def.unit}`).join('')})
          — ยังไม่พอสำหรับแสดงแนวโน้ม
        </EmptyChartNote>
      </div>
    );
  }

  const months = points.map((p) => formatRehabDate(p.v.date));
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

  /* สรุปเป็นข้อความ — ทำให้ขนาดของการเปลี่ยนแปลงอ่านได้แม้เส้นจะดูแบน
     เพราะแกน y เริ่มที่ 0. ทิศทางที่ "ดี" ต่างกันตามตัวชี้วัด (Barthel/ROM
     มากขึ้น = ดีขึ้น; ชีพจรมากขึ้น = ต้องเฝ้าระวัง) จึงใช้ higherIsBetter. */
  const summary = def.series.map((s) => {
    const values = points.map((p) => p.v[s.key]);
    const first = values[0];
    const last = values[values.length - 1];
    const delta = round1(last - first);
    const improved = def.higherIsBetter ? delta > 0 : delta < 0;
    return {
      label: s.label,
      min: round1(Math.min(...values)),
      max: round1(Math.max(...values)),
      first: round1(first),
      last: round1(last),
      delta,
      improved,
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
                  : s.improved
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

const RehabTrendSection = ({
  visits = [],
  selectedVisitIdx = null,
  onSelectVisit,
}) => {
  const [tabKey, setTabKey] = useState('adl');
  const activeKey = CHART_DEFS[tabKey] ? tabKey : 'adl';
  const activeDef = CHART_DEFS[activeKey];

  if (visits.length === 0) {
    return <EmptyChartNote>ยังไม่มีข้อมูลในช่วงเวลาที่เลือก — ปรับช่วงเวลาเพื่อดูแนวโน้ม</EmptyChartNote>;
  }

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        {TAB_ORDER.map((key) => (
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

export default RehabTrendSection;
