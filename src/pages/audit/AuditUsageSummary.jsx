import React, { useMemo, useState } from 'react';
import FilterTag from '@/components/forms/FilterTag';
import FilterDateTag from '@/components/forms/FilterDateTag';
import { VBars } from '@/components/graph/Charts';

const PERIODS = ['รายวัน', 'รายสัปดาห์', 'รายเดือน', 'รายปี'];
const FACTOR = { รายวัน: 0.4, รายสัปดาห์: 0.7, รายเดือน: 1, รายปี: 1.4 };
const LABELS = {
  รายวัน: ['1 มิ.ย.', '2 มิ.ย.', '3 มิ.ย.', '4 มิ.ย.', '5 มิ.ย.', '6 มิ.ย.', '7 มิ.ย.'],
  รายสัปดาห์: ['สัปดาห์ 1', 'สัปดาห์ 2', 'สัปดาห์ 3', 'สัปดาห์ 4'],
  รายเดือน: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.'],
  รายปี: ['2565', '2566', '2567', '2568', '2569'],
};
const SERIES = [
  { name: 'เปิดดูข้อมูล', color: '#14B8A6', base: [280, 360, 330, 310, 240, 290] },
  { name: 'บันทึกข้อมูล', color: '#6366F1', base: [170, 220, 190, 210, 180, 230] },
  { name: 'แก้ไขข้อมูล', color: '#F59E0B', base: [70, 96, 84, 78, 60, 88] },
];

export default function AuditUsageSummary() {
  const [period, setPeriod] = useState('รายเดือน');
  const [dateFilter, setDateFilter] = useState({ quick: 'thismonth' });
  const labels = LABELS[period];
  const series = useMemo(() => SERIES.map((item) => ({
    name: item.name,
    color: item.color,
    values: labels.map((_, i) => Math.max(1, Math.round(item.base[i % item.base.length] * FACTOR[period]))),
  })), [labels, period]);

  const periodQuick = { รายวัน: 'today', รายสัปดาห์: 'thisweek', รายเดือน: 'thismonth', รายปี: 'thisyear' };
  const inferPeriod = (selection) => {
    const quick = selection?.quick;
    if (['today', 'yesterday', 'tomorrow'].includes(quick)) return 'รายวัน';
    if (['7days', 'thisweek'].includes(quick)) return 'รายสัปดาห์';
    if (['30days', 'thismonth', 'lastmonth'].includes(quick)) return 'รายเดือน';
    if (['thisyear', 'lastyear'].includes(quick)) return 'รายปี';
    if (quick === 'custom' && selection.tab === 'range' && selection.range?.start && selection.range?.end) {
      const days = Math.round(Math.abs(new Date(selection.range.end).getTime() - new Date(selection.range.start).getTime()) / 86400000) + 1;
      return days <= 1 ? 'รายวัน' : days <= 7 ? 'รายสัปดาห์' : days <= 31 ? 'รายเดือน' : 'รายปี';
    }
    return null;
  };

  return (
    <section className='w-full flex flex-col' style={{ gap: 'var(--dim-space-400)', padding: 'var(--dim-space-600)', background: 'var(--surface-card-100)', borderRadius: 'var(--dim-radius-500)', border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)', boxShadow: 'var(--shadow-card)' }}>
      <div className='flex items-center justify-between flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
        <span style={{ color: 'var(--text-content-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)' }}>จำนวนการใช้งานตามช่วงเวลา — {period}</span>
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
          {PERIODS.map((item) => <FilterTag key={item} value={item} selected={period === item} onClick={() => { setPeriod(item); setDateFilter({ quick: periodQuick[item] }); }} />)}
          <FilterDateTag prefix='ช่วงวันที่:' value={dateFilter} onChange={(next) => { setDateFilter(next); const inferred = inferPeriod(next); if (inferred) setPeriod(inferred); }} />
        </div>
      </div>
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-400)' }} aria-label='คำอธิบายสีของกราฟ'>
        {series.map((item) => <span key={item.name} className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)', color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}><span aria-hidden style={{ width: 'var(--dim-size-200)', height: 'var(--dim-size-200)', borderRadius: 'var(--dim-radius-full)', background: item.color }} />{item.name}</span>)}
      </div>
      <VBars months={labels} series={series} height={170} showLegend={false} />
    </section>
  );
}
