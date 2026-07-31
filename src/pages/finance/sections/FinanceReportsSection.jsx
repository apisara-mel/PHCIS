import React, { useMemo, useState } from 'react';
import Table from '@/components/table/Table';
import { FilterDropdown } from '@/components/forms/FilterTag';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import StatusBadge from '@/components/badge/StatusBadge';
import { Icon } from '@/components/icons/Icon';
import { Donut, HBarList, VBars, AreaLineChart } from '@/components/graph/Charts';
import { formatBaht } from '@/data/financePaymentPrototype';
import {
  FISCAL_YEARS,
  REPORT_CENTERS,
  buildFinanceReport,
  toThousand,
  toMillion,
  formatPct,
} from '@/data/financeReportsPrototype';

/* รายงานการเงิน — TOR appendix ก §1.20.3.

     §1.20.3.1 รายรับ            → ยอดรวม + โดนัทแยกช่องทาง (เงินสด/e-Payment/
                                    เครดิต/บริจาค) + แท่งแยกหมวด (ค่ายา/ค่าบริการ/…)
     §1.20.3.2 รายจ่าย           → ยอดรวม + โดนัท/แท่งแยกประเภท (เงินเดือน/
                                    ค่าวัสดุ/ค่าสาธารณูปโภค/อื่น ๆ)
     §1.20.3.3 งบประมาณ         → กราฟแท่งงบได้รับ vs ใช้ไป + ตารางเปรียบเทียบ
     §1.20.3.4 ภาพรวมรายรับ-รายจ่าย → กราฟเส้น 12 เดือนงบประมาณ

   Charts come from the shared src/components/graph/Charts.jsx primitives —
   the same ones /dashboard uses — so this page reads as part of the same
   reporting system rather than a second charting style. Series colours are
   raw hex on purpose: chart data colours are the one thing the DS doesn't
   tokenise, and DashboardCards.jsx already sets that precedent. Every
   layout/typography/surface value below is a token.

   The current fiscal month folds in the live finance queue's paid receipts
   (see buildFinanceReport), which is what makes ทะเบียนรายรับ and this
   report agree on today's takings instead of drifting apart. */

/* formatBaht renders the ฿ first, so a negative lands as "฿-3,972,886".
   Over-budget rows and a negative net read better with the sign in front. */
const formatSignedBaht = (n) => (n < 0 ? `-${formatBaht(Math.abs(n))}` : formatBaht(n));

const SectionBlock = ({ title, torId, note, action, children }) => (
  <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
    <div className='flex items-end justify-between' style={{ gap: 'var(--dim-space-300)' }}>
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-base)', fontWeight: 'var(--type-weight-bold)' }}>
          {title}
        </span>
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
          {note ? `${torId} · ${note}` : torId}
        </span>
      </div>
      {action}
    </div>
    {children}
  </div>
);

const ChartCard = ({ title, caption, children, className = '' }) => (
  <div
    className={`flex flex-col min-w-0 ${className}`}
    style={{
      gap: 'var(--dim-space-300)',
      background: 'var(--surface-card-100, #FFFFFF)',
      border: '1px solid var(--border-neutralButton-tertiary, #E2E4E6)',
      borderRadius: 'var(--dim-radius-300)',
      paddingTop: 'var(--dim-space-400)',
      paddingRight: 'var(--dim-space-400)',
      paddingBottom: 'var(--dim-space-400)',
      paddingLeft: 'var(--dim-space-400)',
    }}
  >
    <div className='flex items-baseline justify-between' style={{ gap: 'var(--dim-space-200)' }}>
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)' }}>{title}</span>
      {caption && (
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>{caption}</span>
      )}
    </div>
    {children}
  </div>
);

/* Summary tile — same visual language as ทะเบียนรายรับ's per-method strip
   (brand-tinted panel, label above value), with an optional accent colour
   for the net/expense figures. */
const StatTile = ({ label, value, sub, icon, accent, invert }) => (
  <div
    className='flex flex-col flex-1'
    style={{
      minWidth: 190,
      background: invert ? 'var(--surface-brandPrimary-default, #007549)' : 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
      borderRadius: 'var(--dim-radius-300)',
      paddingTop: 'var(--dim-space-300)',
      paddingRight: 'var(--dim-space-300)',
      paddingBottom: 'var(--dim-space-300)',
      paddingLeft: 'var(--dim-space-300)',
      gap: 'var(--dim-space-050, 2px)',
    }}
  >
    <span
      className='inline-flex items-center'
      style={{
        gap: 'var(--dim-space-150)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: invert ? 'var(--text-content-on-content, #FFFFFF)' : 'var(--text-content-tertiary)',
      }}
    >
      <Icon name={icon} size={16} />
      {label}
    </span>
    <span
      style={{
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xl)',
        fontWeight: 'var(--type-weight-bold)',
        color: invert ? 'var(--text-content-on-content, #FFFFFF)' : (accent || 'var(--text-content-default)'),
      }}
    >
      {value}
    </span>
    {sub && (
      <span
        style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
          color: invert ? 'var(--text-content-on-content, #FFFFFF)' : 'var(--text-content-secondary)',
        }}
      >
        {sub}
      </span>
    )}
  </div>
);

/* Donut + legend pair — used for both the รายรับ channel split and the
   รายจ่าย type split, so the two read as the same kind of answer. */
const DonutWithLegend = ({ segments, total, centerSub }) => (
  <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
    <Donut
      segments={segments}
      size={168}
      thickness={26}
      centerLabel={`${toMillion(total)} ล้าน`}
      centerSub={centerSub}
    />
    <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
      {segments.map((s) => {
        const pct = total ? (s.value / total) * 100 : 0;
        return (
          <div key={s.key} className='flex items-center justify-between' style={{ gap: 'var(--dim-space-200)' }}>
            <span
              className='inline-flex items-center min-w-0'
              style={{ gap: 'var(--dim-space-200)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}
            >
              <span className='shrink-0' style={{ width: 10, height: 10, borderRadius: 'var(--dim-radius-full)', background: s.color }} />
              <span className='truncate'>{s.label}</span>
            </span>
            <span className='shrink-0 tabular-nums' style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
              <strong>{formatBaht(s.value)}</strong>
              <span style={{ color: 'var(--text-content-tertiary)' }}> · {formatPct(pct)}</span>
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

const FinanceReportsSection = ({ queue = [] }) => {
  const [fiscalYear, setFiscalYear] = useState(FISCAL_YEARS[0].key);
  const [center, setCenter] = useState('all');

  const report = useMemo(
    () => buildFinanceReport({ fiscalYear, center, queue }),
    [fiscalYear, center, queue],
  );

  const {
    year, months, revenueMonthly, expenseMonthly,
    revenueTotal, expenseTotal, netTotal,
    byChannel, byType, byExpense, budgetRows, budgetTotal, today,
  } = report;

  /* §1.20.3.4 — one line per side, in พันบาท so the chart's own data
     labels stay legible (they are drawn inside a 44px SVG box). */
  const overviewSeries = [
    { label: 'รายรับ',  color: '#14B8A6', values: revenueMonthly.map(toThousand) },
    { label: 'รายจ่าย', color: '#F59E0B', values: expenseMonthly.map(toThousand) },
  ];

  /* §1.20.3.3 — grouped bars, in ล้านบาท. VBars takes any label array for
     its x-axis, so the "months" here are the five budget หมวด. */
  const budgetSeries = [
    { label: 'งบได้รับ', color: '#6366F1', values: budgetRows.map((b) => toMillion(b.allocated)) },
    { label: 'ใช้ไป',    color: '#14B8A6', values: budgetRows.map((b) => toMillion(b.used)) },
  ];
  const budgetLabels = budgetRows.map((b) => b.label.split(' ')[0]);

  const typeRows = byType.map((t) => ({
    label: t.label,
    value: Math.round(toThousand(t.value)),
    second: Number((revenueTotal ? (t.value / revenueTotal) * 100 : 0).toFixed(1)),
  }));

  const expenseRows = byExpense.map((e) => ({
    label: e.label,
    value: Math.round(toThousand(e.value)),
    second: Number((expenseTotal ? (e.value / expenseTotal) * 100 : 0).toFixed(1)),
  }));

  const budgetColumns = [
    {
      key: 'label', label: 'หมวดงบประมาณ', flex: true, minWidth: 200,
      render: (b) => (
        <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <span className='shrink-0' style={{ width: 10, height: 10, borderRadius: 'var(--dim-radius-full)', background: b.color }} />
          {b.label}
        </span>
      ),
    },
    { key: 'allocated', label: 'งบได้รับ', width: 150, align: 'right', render: (b) => formatBaht(b.allocated) },
    { key: 'used', label: 'ใช้ไป', width: 150, align: 'right', render: (b) => <span style={{ fontWeight: 'var(--type-weight-bold)' }}>{formatBaht(b.used)}</span> },
    {
      key: 'remaining', label: 'คงเหลือ', width: 150, align: 'right',
      render: (b) => (
        <span style={{ fontWeight: 'var(--type-weight-bold)', color: b.overBudget ? 'var(--text-statusbadge-error, #B91C1C)' : 'var(--text-content-default, #363B3F)' }}>
          {formatSignedBaht(b.remaining)}
        </span>
      ),
    },
    {
      key: 'pct', label: 'ใช้ไป (%)', width: 190,
      render: (b) => (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <span className='flex-1' style={{ height: 6, borderRadius: 'var(--dim-radius-full)', background: 'var(--surface-neutral-tertiary, #F4F5F5)', overflow: 'hidden' }}>
            <span
              className='block'
              style={{
                width: `${Math.min(100, b.pct)}%`,
                height: '100%',
                borderRadius: 'var(--dim-radius-full)',
                background: b.overBudget ? 'var(--surface-dangerButton-default, #B91C1C)' : b.color,
              }}
            />
          </span>
          <span className='tabular-nums shrink-0' style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>{formatPct(b.pct)}</span>
        </div>
      ),
    },
    {
      key: 'status', label: 'สถานะ', width: 130,
      render: (b) => (
        b.overBudget
          ? <StatusBadge style='error' size='small'>เกินงบประมาณ</StatusBadge>
          : b.pct >= 90
            ? <StatusBadge style='warning' size='small'>ใกล้เต็มงบ</StatusBadge>
            : <StatusBadge style='success' size='small'>อยู่ในงบ</StatusBadge>
      ),
    },
  ];

  const periodNote = year.current
    ? `${months[0]} – ${months[months.length - 1]} (${year.elapsed} เดือน, ปีงบประมาณยังไม่สิ้นสุด)`
    : `${months[0]} – ${months[months.length - 1]} (เต็มปีงบประมาณ)`;

  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-600)' }}>
      {/* Filters — ปีงบประมาณ + ศูนย์บริการ, matching the filter-chip row
          used by ทะเบียนรายรับ / ยอดค้างชำระ. */}
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        <FilterDropdown
          prefix='ปีงบประมาณ:'
          options={FISCAL_YEARS.map((y) => ({ value: y.key, label: y.label }))}
          value={fiscalYear}
          onChange={setFiscalYear}
        />
        <FilterDropdown
          prefix='ศูนย์บริการ:'
          options={REPORT_CENTERS.map((c) => ({ value: c.key, label: c.label }))}
          value={center}
          onChange={setCenter}
        />
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
          {periodNote}
        </span>
        <div className='flex-1' />
        <NeutralSubdueButton leadingIcon='print' onClick={() => window.print()}>พิมพ์รายงาน</NeutralSubdueButton>
      </div>

      <div className='flex items-stretch flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
        <StatTile
          icon='trending_up'
          label='รายรับรวม'
          value={formatBaht(revenueTotal)}
          sub={year.current && today.count > 0 ? `รวมยอดรับวันนี้ ${formatBaht(today.total)} (${today.count} ใบเสร็จ)` : `เฉลี่ย ${formatBaht(Math.round(revenueTotal / months.length))}/เดือน`}
        />
        <StatTile
          icon='trending_down'
          label='รายจ่ายรวม'
          value={formatBaht(expenseTotal)}
          accent='var(--text-statusbadge-warning, #B25E09)'
          sub={`เฉลี่ย ${formatBaht(Math.round(expenseTotal / months.length))}/เดือน`}
        />
        <StatTile
          icon='account_balance'
          label='คงเหลือสุทธิ'
          value={formatSignedBaht(netTotal)}
          invert
          sub={`รายรับ − รายจ่าย · ${formatPct(revenueTotal ? (netTotal / revenueTotal) * 100 : 0)} ของรายรับ`}
        />
        <StatTile
          icon='savings'
          label='ใช้งบประมาณไปแล้ว'
          value={formatPct(budgetTotal.pct)}
          sub={`${formatBaht(budgetTotal.used)} จาก ${formatBaht(budgetTotal.allocated)}`}
        />
      </div>

      {/* §1.20.3.4 */}
      <SectionBlock title='ภาพรวมรายรับ-รายจ่าย' torId='TOR §1.20.3.4' note='รายเดือนตามปีงบประมาณ'>
        <ChartCard title='รายรับเทียบรายจ่าย' caption='หน่วย: พันบาท'>
          <AreaLineChart months={months} series={overviewSeries} height={300} />
        </ChartCard>
      </SectionBlock>

      {/* §1.20.3.1 */}
      <SectionBlock
        title='รายรับ'
        torId='TOR §1.20.3.1'
        note={`ยอดรวม ${formatBaht(revenueTotal)}`}
      >
        <div className='flex items-stretch flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
          <ChartCard title='แยกตามช่องทางรับเงิน' caption='เงินสด / e-Payment / เครดิต / บริจาค' className='flex-1' >
            <DonutWithLegend segments={byChannel} total={revenueTotal} centerSub='รายรับรวม' />
          </ChartCard>
          <ChartCard title='แยกตามหมวดรายรับ' caption='หน่วย: พันบาท' className='flex-1'>
            <HBarList rows={typeRows} valueLabel='พันบาท' secondLabel='%' />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* §1.20.3.2 */}
      <SectionBlock
        title='รายจ่าย'
        torId='TOR §1.20.3.2'
        note={`ยอดรวม ${formatBaht(expenseTotal)}`}
      >
        <div className='flex items-stretch flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
          <ChartCard title='แยกตามประเภทรายจ่าย' caption='เงินเดือน / ค่าวัสดุ / ค่าสาธารณูปโภค / อื่น ๆ' className='flex-1'>
            <DonutWithLegend segments={byExpense} total={expenseTotal} centerSub='รายจ่ายรวม' />
          </ChartCard>
          <ChartCard title='สัดส่วนรายจ่าย' caption='หน่วย: พันบาท' className='flex-1'>
            <HBarList rows={expenseRows} valueLabel='พันบาท' secondLabel='%' />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* §1.20.3.3 */}
      <SectionBlock
        title='งบประมาณ'
        torId='TOR §1.20.3.3'
        note='เปรียบเทียบงบที่ได้รับกับงบที่ใช้ไป'
      >
        <ChartCard title='งบได้รับ เทียบ ใช้ไป แยกตามหมวด' caption='หน่วย: ล้านบาท'>
          <VBars months={budgetLabels} series={budgetSeries} height={240} barMaxWidth={56} />
        </ChartCard>
        <Table
          columns={budgetColumns}
          rows={budgetRows}
          rowKey={(b) => b.key}
          emptyMessage='ไม่มีข้อมูลงบประมาณของปีงบประมาณนี้'
        />
        <div
          className='flex items-center justify-between flex-wrap'
          style={{
            gap: 'var(--dim-space-300)',
            background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
            borderRadius: 'var(--dim-radius-300)',
            paddingTop: 'var(--dim-space-300)',
            paddingRight: 'var(--dim-space-400)',
            paddingBottom: 'var(--dim-space-300)',
            paddingLeft: 'var(--dim-space-400)',
          }}
        >
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)' }}>
            รวมทุกหมวด
          </span>
          <span className='tabular-nums' style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
            งบได้รับ <strong>{formatBaht(budgetTotal.allocated)}</strong>
            <span style={{ color: 'var(--text-content-tertiary)' }}> · </span>
            ใช้ไป <strong>{formatBaht(budgetTotal.used)}</strong>
            <span style={{ color: 'var(--text-content-tertiary)' }}> · </span>
            คงเหลือ <strong>{formatSignedBaht(budgetTotal.remaining)}</strong>
            <span style={{ color: 'var(--text-content-tertiary)' }}> · ใช้ไป {formatPct(budgetTotal.pct)}</span>
          </span>
        </div>
      </SectionBlock>
    </div>
  );
};

export default FinanceReportsSection;
