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
  FISCAL_MONTHS,
  REPORT_CENTERS,
  buildFinanceReport,
  toMillion,
  formatPct,
} from '@/data/financeReportsPrototype';

/* รายงานการเงิน — TOR appendix ก §1.20.3.

     §1.20.3.1 รายรับ            → โดนัทแยกช่องทาง + แท่งแยกหมวด
     §1.20.3.2 รายจ่าย           → แถบสัดส่วนเดียว + แท่งแยกประเภท
     §1.20.3.3 งบประมาณ         → กราฟแท่งงบได้รับ vs ใช้ไป + ตารางเปรียบเทียบ
     §1.20.3.4 ภาพรวมรายรับ-รายจ่าย → กราฟเส้น 12 เดือนงบประมาณ

   อ่านโดยผู้อำนวยการศูนย์และหัวหน้าการเงิน เดือนละครั้ง แล้วพิมพ์เก็บเป็น
   หลักฐานตอนตรวจรับ — คำถามจริงของเขาไม่ใช่ "รายรับเท่าไหร่" (ตัวเลขนั้นดูจาก
   ทะเบียนรายรับก็ได้) แต่คือ **"ใช้งบเร็วหรือช้ากว่าที่ควร"** หน้านี้จึงเปิดด้วย
   แถบจังหวะปีงบประมาณ ไม่ใช่แถว KPI

   Charts มาจาก src/components/graph/Charts.jsx ชุดเดียวกับ /dashboard สีของ
   ชุดข้อมูลเป็น hex ตรงตามธรรมเนียมของ DashboardCards.jsx (สี data series เป็น
   สิ่งเดียวที่ DS ไม่ได้ tokenise) — ค่าอื่นทั้งหมดอ้าง token

   หน่วยเงิน: ตัวเลขที่คนอ่านเป็นเงินจริงใช้ "บาท" เสมอ (tile / ตาราง / legend)
   ส่วน data label บนกราฟใช้ "ล้านบาท" เพราะ chart primitive พิมพ์ค่าดิบลงกล่อง
   กว้าง 44px — สองหน่วยเท่านั้น และกำกับหน่วยไว้ทุกกราฟ */

/* พิมพ์รายงาน — ปุ่มพิมพ์เดิมเรียก window.print() ทั้งหน้า ได้ sidebar + แท็บ +
   ตัวกรองติดมาด้วย ซึ่งใช้เป็นเอกสารแนบไม่ได้ กฎด้านล่างซ่อนทุกอย่างนอกรายงาน
   โดยไม่ต้องรู้ชื่อคลาสของ app chrome (ซึ่งจะพังทันทีที่ layout เปลี่ยน)
   ฉีดครั้งเดียวตอนโหลดโมดูล ตามแพตเทิร์นเดียวกับ AISearch */
const PRINT_STYLE_ID = 'mih-finance-report-print';
if (typeof document !== 'undefined' && !document.getElementById(PRINT_STYLE_ID)) {
  const style = document.createElement('style');
  style.id = PRINT_STYLE_ID;
  style.textContent = `
@media print {
  body * { visibility: hidden !important; }
  .mih-finance-report, .mih-finance-report * { visibility: visible !important; }
  .mih-finance-report {
    position: absolute !important;
    left: 0; top: 0; width: 100%;
  }
  .mih-finance-report__noprint { display: none !important; }
  .mih-finance-report__printonly { display: block !important; }
  .mih-finance-report__block { break-inside: avoid; }
}
/* หัวเรื่องรายงานมีไว้สำหรับกระดาษเท่านั้น — บนจอมี breadcrumb + แท็บบอกอยู่แล้ว
   (เขียนเป็นคลาสแทน print: variant เพราะ Tailwind 2.1 ในโปรเจกต์นี้ไม่ได้เปิด
   variant นั้นไว้ทุก utility) */
.mih-finance-report__printonly { display: none; }`;
  document.head.appendChild(style);
}

/* formatBaht วาง ฿ ไว้หน้าสุด ค่าติดลบเลยออกมาเป็น "฿-3,972,886" */
const formatSignedBaht = (n) => (n < 0 ? `-${formatBaht(Math.abs(n))}` : formatBaht(n));

const SectionBlock = ({ title, torId, note, children }) => (
  <div className='flex flex-col mih-finance-report__block' style={{ gap: 'var(--dim-space-300)' }}>
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-base)', fontWeight: 'var(--type-weight-bold)' }}>
        {title}
      </span>
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
        {note ? `${torId} · ${note}` : torId}
      </span>
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

const StatTile = ({ label, value, sub, icon, accent, invert }) => (
  <div
    className='flex flex-col flex-1'
    style={{
      minWidth: 200,
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

/* ── แถบจังหวะปีงบประมาณ ────────────────────────────────────
   ปีงบประมาณคือปฏิทิน ต.ค.→ก.ย. ไม่ใช่แถบความคืบหน้าเปล่าๆ รางด้านล่างจึงเป็น
   ปีงบทั้งปี มีขีดเดือนกำกับ, แถบทึบคือ "งบที่ใช้ไป" และเส้นตั้งคือ "เวลาที่ผ่าน
   ไปแล้ว" — ระยะห่างระหว่างสองอันนี้คือคำตอบที่ผู้อำนวยการต้องการ: ใช้งบเร็วหรือ
   ช้ากว่าปฏิทิน ตัวเลข % ที่เคยเป็น tile ใบที่ 4 ย้ายมาอยู่ตรงนี้ทั้งหมด */
const PacingBand = ({ year, budgetTotal }) => {
  const timePct = year.current ? (year.elapsed / 12) * 100 : 100;
  const usedPct = Math.min(100, budgetTotal.pct);
  const drift = budgetTotal.pct - timePct;

  const over = budgetTotal.pct > 100;
  const ahead = drift > 5;
  const tone = over ? 'error' : ahead ? 'warning' : 'success';
  const fill = over
    ? 'var(--surface-dangerButton-default, #B91C1C)'
    : ahead
      ? 'var(--text-statusbadge-warning, #C2410C)'
      : 'var(--surface-brandPrimary-default, #007549)';

  const verdict = over
    ? 'ใช้งบเกินกรอบที่ได้รับแล้ว'
    : !year.current
      ? `สิ้นปีงบประมาณ · ใช้งบไป ${formatPct(budgetTotal.pct)} ของที่ได้รับ`
      : ahead
        ? `ใช้งบเร็วกว่าปฏิทิน ${formatPct(Math.abs(drift))}`
        : drift < -5
          ? `ใช้งบช้ากว่าปฏิทิน ${formatPct(Math.abs(drift))}`
          : 'ใช้งบสอดคล้องกับเวลาที่ผ่านไป';

  return (
    <div
      className='flex flex-col mih-finance-report__block'
      style={{
        gap: 'var(--dim-space-400)',
        background: 'var(--surface-card-100, #FFFFFF)',
        border: '1px solid var(--border-neutralButton-tertiary, #E2E4E6)',
        borderRadius: 'var(--dim-radius-300)',
        paddingTop: 'var(--dim-space-500)',
        paddingRight: 'var(--dim-space-500)',
        paddingBottom: 'var(--dim-space-500)',
        paddingLeft: 'var(--dim-space-500)',
      }}
    >
      <div className='flex items-end justify-between flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            จังหวะการใช้งบ {year.label}
          </span>
          <span className='inline-flex items-baseline' style={{ gap: 'var(--dim-space-200)' }}>
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xl)', fontWeight: 'var(--type-weight-bold)' }}>
              {verdict}
            </span>
            {/* เงียบตอนปกติ ดังตอนไม่ปกติ — ป้าย "ปกติ" ไม่ได้บอกอะไรที่ประโยคข้างหน้า
                ยังไม่ได้บอก มันแค่เพิ่มสีให้หน้าจอ */}
            {(over || ahead) && (
              <StatusBadge style={tone} size='small'>{over ? 'เกินงบ' : 'เฝ้าระวัง'}</StatusBadge>
            )}
          </span>
        </div>
        <div className='flex flex-col items-end' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span className='tabular-nums' style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
            ใช้ไป <strong>{formatBaht(budgetTotal.used)}</strong> จาก {formatBaht(budgetTotal.allocated)}
          </span>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            คงเหลือ {formatSignedBaht(budgetTotal.remaining)}
          </span>
        </div>
      </div>

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
        <div className='relative w-full' style={{ height: 20 }}>
          {/* ราง = ปีงบทั้งปี 12 เดือน */}
          <div
            className='absolute inset-0'
            style={{ background: 'var(--surface-neutral-tertiary, #F4F5F5)', borderRadius: 'var(--dim-radius-full)', overflow: 'hidden' }}
          >
            <div
              style={{
                width: `${usedPct}%`,
                height: '100%',
                background: fill,
                borderRadius: 'var(--dim-radius-full)',
                transition: 'width 700ms cubic-bezier(0.22, 0.61, 0.36, 1)',
              }}
            />
          </div>
          {/* เส้นเวลา — ยืนอยู่ตรงเดือนปัจจุบันของปีงบ */}
          {year.current && (
            <div
              className='absolute'
              style={{
                left: `${timePct}%`,
                top: -6,
                bottom: -6,
                width: 'var(--dim-stroke-200, 2px)',
                background: 'var(--text-content-default, #363B3F)',
                transform: 'translateX(-1px)',
              }}
              aria-hidden
            />
          )}
        </div>

        {/* ขีดเดือน — บอกว่ารางนี้คือปฏิทินปีงบ ไม่ใช่ progress bar */}
        <div className='flex w-full'>
          {FISCAL_MONTHS.map((m, i) => (
            <span
              key={m}
              className='flex-1 text-center'
              style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
                color: year.current && i < year.elapsed ? 'var(--text-content-secondary)' : 'var(--text-content-tertiary)',
                fontWeight: year.current && i === year.elapsed - 1 ? 'var(--type-weight-bold)' : 'var(--type-weight-regular)',
              }}
            >
              {m}
            </span>
          ))}
        </div>

        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
          <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}>
            <span style={{ width: 12, height: 8, borderRadius: 'var(--dim-radius-full)', background: fill }} />
            งบที่ใช้ไป {formatPct(budgetTotal.pct)}
          </span>
          {year.current && (
            <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}>
              <span style={{ width: 'var(--dim-stroke-200, 2px)', height: 12, background: 'var(--text-content-default, #363B3F)' }} />
              เวลาที่ผ่านไป {formatPct(timePct)} ({year.elapsed} จาก 12 เดือน)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/* Legend ที่ใช้ร่วมกันทั้งฝั่งรายรับและรายจ่าย — ตัวเลขเป็นบาทเสมอ */
const ShareLegend = ({ segments, total }) => (
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
);

/* รายรับมาจากหลายช่องทางที่แยกขาดจากกัน → โดนัท
   รายจ่ายคือก้อนเดียวที่ถูกแบ่ง → แถบเดียว
   สองรูปทรงต่างกันทำให้เงินเข้ากับเงินออกแยกออกจากกันได้ตั้งแต่ชายตามอง */
const StackedShareBar = ({ segments, total }) => (
  <div className='flex w-full' style={{ height: 28, borderRadius: 'var(--dim-radius-200)', overflow: 'hidden' }}>
    {segments.map((s) => {
      const pct = total ? (s.value / total) * 100 : 0;
      return (
        <div
          key={s.key}
          title={`${s.label} · ${formatBaht(s.value)}`}
          style={{ width: `${pct}%`, background: s.color, transition: 'width 700ms cubic-bezier(0.22, 0.61, 0.36, 1)' }}
        />
      );
    })}
  </div>
);

const FinanceReportsSection = ({ queue = [], nhso = [] }) => {
  const [fiscalYear, setFiscalYear] = useState(FISCAL_YEARS[0].key);
  const [center, setCenter] = useState('all');

  const report = useMemo(
    () => buildFinanceReport({ fiscalYear, center, queue, nhso }),
    [fiscalYear, center, queue, nhso],
  );

  const {
    year, months, revenueMonthly, expenseMonthly,
    revenueTotal, expenseTotal, netTotal,
    byChannel, byType, byExpense, budgetRows, budgetTotal, today, nhsoApproved,
  } = report;

  const overviewSeries = [
    { label: 'รายรับ',  color: '#14B8A6', values: revenueMonthly.map(toMillion) },
    { label: 'รายจ่าย', color: '#F59E0B', values: expenseMonthly.map(toMillion) },
  ];

  const budgetSeries = [
    { label: 'งบได้รับ', color: '#6366F1', values: budgetRows.map((b) => toMillion(b.allocated)) },
    { label: 'ใช้ไป',    color: '#14B8A6', values: budgetRows.map((b) => toMillion(b.used)) },
  ];
  const budgetLabels = budgetRows.map((b) => b.label.split(' ')[0]);

  const typeRows = byType.map((t) => ({
    label: t.label,
    value: toMillion(t.value),
    second: Number((revenueTotal ? (t.value / revenueTotal) * 100 : 0).toFixed(1)),
  }));

  const expenseRows = byExpense.map((e) => ({
    label: e.label,
    value: toMillion(e.value),
    second: Number((expenseTotal ? (e.value / expenseTotal) * 100 : 0).toFixed(1)),
  }));

  /* เส้นเวลาเดียวกับแถบด้านบน วางทาบทุกหมวดงบ — หมวดไหนแท่งยาวเลยเส้นนี้
     คือหมวดที่ใช้งบเร็วกว่าปฏิทิน ไม่ต้องคิดเลขเอง */
  const timePct = year.current ? (year.elapsed / 12) * 100 : 100;

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
    { key: 'allocated', label: 'งบได้รับ', align: 'right', render: (b) => formatBaht(b.allocated) },
    { key: 'used', label: 'ใช้ไป', align: 'right', render: (b) => <span style={{ fontWeight: 'var(--type-weight-bold)' }}>{formatBaht(b.used)}</span> },
    {
      key: 'remaining', label: 'คงเหลือ', align: 'right',
      render: (b) => (
        <span style={{ fontWeight: 'var(--type-weight-bold)', color: b.overBudget ? 'var(--text-statusbadge-error, #B91C1C)' : 'var(--text-content-default, #363B3F)' }}>
          {formatSignedBaht(b.remaining)}
        </span>
      ),
    },
    {
      key: 'pct', label: 'ใช้ไปเทียบปฏิทิน',
      /* `w-full` is load-bearing: the cell is a flex item that shrink-to-fits,
         so without it this row sizes to the "77.8%" text (~42px) and the
         flex-1 track collapses to zero width — the bar disappears entirely. */
      render: (b) => (
        <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <span className='relative flex-1' style={{ height: 8 }}>
            <span
              className='absolute inset-0'
              style={{ borderRadius: 'var(--dim-radius-full)', background: 'var(--surface-neutral-tertiary, #F4F5F5)', overflow: 'hidden' }}
            >
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
            <span
              className='absolute'
              style={{
                left: `${timePct}%`,
                top: -3,
                bottom: -3,
                width: 'var(--dim-stroke-100, 1px)',
                background: 'var(--text-content-default, #363B3F)',
              }}
              aria-hidden
            />
          </span>
          <span className='tabular-nums shrink-0' style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>{formatPct(b.pct)}</span>
        </div>
      ),
    },
    {
      key: 'status', label: 'สถานะ',
      render: (b) => (
        b.overBudget
          ? <StatusBadge style='error' size='small'>เกินงบประมาณ</StatusBadge>
          : b.pct >= 90
            ? <StatusBadge style='warning' size='small'>ใกล้เต็มงบ</StatusBadge>
            : <StatusBadge style='success' size='small'>อยู่ในงบ</StatusBadge>
      )},
  ];

  const periodNote = year.current
    ? `${months[0]} – ${months[months.length - 1]} (${year.elapsed} เดือน, ปีงบประมาณยังไม่สิ้นสุด)`
    : `${months[0]} – ${months[months.length - 1]} (เต็มปีงบประมาณ)`;

  return (
    <div className='flex flex-col mih-finance-report' style={{ gap: 'var(--dim-space-600)' }}>
      <div className='flex items-center flex-wrap mih-finance-report__noprint' style={{ gap: 'var(--dim-space-200)' }}>
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

      {/* หัวเรื่องของรายงาน — เห็นเฉพาะตอนพิมพ์ เพราะบนจอมี breadcrumb + แท็บบอกอยู่แล้ว */}
      <div className='mih-finance-report__printonly'>
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-base)', fontWeight: 'var(--type-weight-bold)' }}>
          รายงานการเงิน {year.label} · {REPORT_CENTERS.find((c) => c.key === center)?.label} · {periodNote}
        </span>
      </div>

      <PacingBand year={year} budgetTotal={budgetTotal} />

      <div className='flex items-stretch flex-wrap mih-finance-report__block' style={{ gap: 'var(--dim-space-300)' }}>
        <StatTile
          icon='trending_up'
          label='รายรับรวม'
          value={formatBaht(revenueTotal)}
          sub={year.current && today.count > 0
            ? `รวมยอดรับวันนี้ ${formatBaht(today.total)} (${today.count} ใบเสร็จ)`
            : `เฉลี่ย ${formatBaht(Math.round(revenueTotal / months.length))}/เดือน`}
        />
        <StatTile
          icon='trending_down'
          label='รายจ่ายรวม'
          value={formatBaht(expenseTotal)}
          accent='var(--text-statusbadge-warning, #C2410C)'
          sub={`เฉลี่ย ${formatBaht(Math.round(expenseTotal / months.length))}/เดือน`}
        />
        <StatTile
          icon='account_balance'
          label='คงเหลือสุทธิ'
          value={formatSignedBaht(netTotal)}
          invert
          sub={`รายรับ − รายจ่าย · ${formatPct(revenueTotal ? (netTotal / revenueTotal) * 100 : 0)} ของรายรับ`}
        />
      </div>

      {/* §1.20.3.1 */}
      <SectionBlock
        title='รายรับ'
        torId='TOR §1.20.3.1'
        note={nhsoApproved > 0
          ? `ยอดรวม ${formatBaht(revenueTotal)} · รวมยอดอนุมัติจากไฟล์ สปสช. ${formatBaht(nhsoApproved)} (ช่องทางเครดิต)`
          : `ยอดรวม ${formatBaht(revenueTotal)}`}
      >
        <div className='flex items-stretch flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
          <ChartCard title='แยกตามช่องทางรับเงิน' caption='เงินสด / e-Payment / เครดิต / บริจาค' className='flex-1'>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
              <Donut segments={byChannel} size={168} thickness={26} centerLabel={`${byChannel.length} ช่องทาง`} centerSub='รายรับ' />
              <ShareLegend segments={byChannel} total={revenueTotal} />
            </div>
          </ChartCard>
          <ChartCard title='แยกตามหมวดรายรับ' caption='หน่วย: ล้านบาท' className='flex-1'>
            <HBarList rows={typeRows} valueLabel='ล้านบาท' secondLabel='%' />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* §1.20.3.2 */}
      <SectionBlock title='รายจ่าย' torId='TOR §1.20.3.2' note={`ยอดรวม ${formatBaht(expenseTotal)}`}>
        <div className='flex items-stretch flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
          <ChartCard title='สัดส่วนรายจ่าย' caption='เงินเดือน / ค่าวัสดุ / ค่าสาธารณูปโภค / อื่น ๆ' className='flex-1'>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
              <StackedShareBar segments={byExpense} total={expenseTotal} />
              <ShareLegend segments={byExpense} total={expenseTotal} />
            </div>
          </ChartCard>
          <ChartCard title='แยกตามประเภทรายจ่าย' caption='หน่วย: ล้านบาท' className='flex-1'>
            <HBarList rows={expenseRows} valueLabel='ล้านบาท' secondLabel='%' />
          </ChartCard>
        </div>
      </SectionBlock>

      {/* §1.20.3.4 */}
      <SectionBlock title='ภาพรวมรายรับ-รายจ่าย' torId='TOR §1.20.3.4' note='รายเดือนตามปีงบประมาณ'>
        <ChartCard title='รายรับเทียบรายจ่าย' caption='หน่วย: ล้านบาท'>
          <AreaLineChart months={months} series={overviewSeries} height={300} />
        </ChartCard>
      </SectionBlock>

      {/* §1.20.3.3 */}
      <SectionBlock title='งบประมาณ' torId='TOR §1.20.3.3' note='เปรียบเทียบงบที่ได้รับกับงบที่ใช้ไป'>
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
          </span>
        </div>
      </SectionBlock>
    </div>
  );
};

export default FinanceReportsSection;
