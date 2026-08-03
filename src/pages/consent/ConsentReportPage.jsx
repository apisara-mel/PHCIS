import React, { useState, useEffect, useMemo } from 'react';
import { Redirect } from 'react-router-dom';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Popup from '@/components/popup/Popup';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import InputField from '@/components/forms/InputField';
import Icon from '@/components/icons/Icon';
import { Donut, VBars } from '@/components/graph/Charts';
import FilterTag from '@/components/forms/FilterTag';
import FilterDateTag from '@/components/forms/FilterDateTag';
import DateFilterPopup from '@/components/popup/DateFilterPopup';
import SuccessToast from '@/components/toast/SuccessToast';
import ConsentHistoryPopup from '@/components/popup/ConsentHistoryPopup';
import { CONSENT_REPORTS } from '@/data/consentReports';
import { DEFAULT_SERVICE_CENTER_CHANNEL } from '@/data/consentChannels';
import { ExportFormatPopup, DateInputBox, buildReportTableColumns } from '@/pages/consent/consentExportPopup';

/* PHCIS | Consent — สถิติและรายงาน (Figma node 358:113804).
   A stack of report cards, each with a title + subtitle, filter chips, a row
   of stat cards (icon tile + value + label), and view / export actions.
   All values alias design.md tokens; UI copy is Thai; data is local mock. */

/* Map a stat's tone → SummaryCard panel-card props. info / positive use the
   statussummarycard token pair; danger overrides the tile + ink explicitly
   (no statussummarycard-danger pair exists). */
const statCard = (stat) => {
  const base = { key: stat.label, icon: stat.icon, value: stat.value, label: stat.label };
  if (stat.tone === 'danger') {
    return { ...base, tileBg: 'var(--surface-danger-tertiary, #FEE2E2)', iconInk: 'var(--text-danger-default, #B91C1C)' };
  }
  return { ...base, color: stat.tone }; // 'info' | 'positive'
};

/* Pie/donut + bar categorical palette — PHCIS dashboard chart colours
   (teal · pink · indigo · orange). Consent (2 series) reads teal + pink,
   matching Figma 395:127874. */
const PIE_PALETTE = ['#14B8A6', '#EC4899', '#6366F1', '#F59E0B'];

/* Bar series colour by stat tone (ยินยอม green / ไม่ยินยอม red). */
const TONE_COLOR = {
  positive: 'var(--text-colorfulbadge-green, #007549)',
  danger:   'var(--text-colorfulbadge-red, #B91C1C)',
  info:     'var(--text-colorfulbadge-blue, #1D4ED8)',
};

/* Bar-series tone → colour (adds the dashboard teal/orange/indigo accents). */
const BAR_TONE = {
  positive: TONE_COLOR.positive,
  danger:   TONE_COLOR.danger,
  info:     TONE_COLOR.info,
  teal:     '#14B8A6',
  orange:   '#F59E0B',
  indigo:   '#6366F1',
};
const parseStatNum = (v) => Number(String(v).replace(/[^0-9.]/g, '')) || 0;
const isPercent = (v) => String(v).includes('%');

/* Stat values in the data are MONTHLY totals (scope = เดือนนี้ = ×1). The page
   "วัน:" scope scales every count so the period is consistent — เดือนนี้ < ปีนี้.
   Percentages (ratios) are left unchanged. */
const SCALE_BY_QUICK = {
  today: 1 / 30, yesterday: 1 / 30, tomorrow: 1 / 30, todayLastYear: 1 / 30,
  '7days': 7 / 30, thisweek: 7 / 30,
  '30days': 1, thismonth: 1, lastmonth: 1, monthStart: 1, monthEnd: 1, lastMonthStart: 1, lastMonthEnd: 1,
  thisyear: 12, lastyear: 12,
  'last-6m': 6,
};
const scaleForQuick = (q) => SCALE_BY_QUICK[q] ?? 1;
const scaleStatValue = (v, f) => (isPercent(v) ? v : Math.round(parseStatNum(v) * f).toLocaleString());

/* Audit action / role → tone (access-times popup). */
const BADGE_TONE = {
  VIEW: 'blue', EXPORT: 'purple', UPDATE: 'orange', DELETE: 'red',
  Admin: 'purple', Editor: 'blue', Viewer: 'grey',
};
const CELL_TEXT = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
};

/* Time-range buckets for the report table (Figma filter chips). The index is
   the unit rank: รายวัน=0 · รายสัปดาห์=1 · รายเดือน=2 · รายปี=3. */
const REPORT_PERIODS = ['รายวัน', 'รายสัปดาห์', 'รายเดือน', 'รายปี'];

/* Span rank (0..3) of a DateFilterPopup quick-key — how wide the selected
   "วัน:" range is. Used to disable period units larger than the range
   (Figma 397:125953 — e.g. "วัน: วันนี้" ⇒ only รายวัน is meaningful). */
const QUICK_SPAN = {
  today: 0, yesterday: 0, tomorrow: 0, monthStart: 0, monthEnd: 0,
  lastMonthStart: 0, lastMonthEnd: 0, todayLastYear: 0,
  '7days': 1, thisweek: 1,
  '30days': 2, thismonth: 2, lastmonth: 2,
  thisyear: 3, lastyear: 3,
};
const spanRank = (dv) => {
  if (!dv) return 3;
  if (dv.quick === 'custom') {
    const r = dv.range;
    if (r && r.start && r.end) {
      const days = Math.round((new Date(r.end) - new Date(r.start)) / 86400000) + 1;
      if (days <= 1) return 0;
      if (days <= 7) return 1;
      if (days <= 31) return 2;
      return 3;
    }
    return dv.tab === 'single' ? 0 : 3;
  }
  return QUICK_SPAN[dv.quick] ?? 3;
};

/* Thai date label + range→unit-rank for the report popup's range form. */
const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const fmtThaiDate = (d) => (d ? `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}` : '');
const rangeRank = (r) => {
  if (!r || !r.start || !r.end) return 3;
  const a = new Date(r.start).setHours(0, 0, 0, 0);
  const b = new Date(r.end).setHours(0, 0, 0, 0);
  const days = Math.round((b - a) / 86400000) + 1;
  if (days <= 1) return 0;
  if (days <= 7) return 1;
  if (days <= 31) return 2;
  return 3;
};

/* The data is grouped into one table PER bucket of the selected period — Figma
   395:127874 shows รายเดือน → มกราคม / กุมภาพันธ์ / มีนาคม sections, รายวัน → per-day, etc. */
const periodBuckets = (period) => {
  switch (period) {
    case 'รายวัน':     return ['1 มิถุนายน 2569', '2 มิถุนายน 2569', '3 มิถุนายน 2569'];
    case 'รายสัปดาห์': return ['สัปดาห์ที่ 1 (1–7 มิ.ย.)', 'สัปดาห์ที่ 2 (8–14 มิ.ย.)', 'สัปดาห์ที่ 3 (15–21 มิ.ย.)'];
    case 'รายปี':      return ['ปี 2567', 'ปี 2568', 'ปี 2569'];
    case 'รายเดือน':
    default:           return ['มกราคม', 'กุมภาพันธ์', 'มีนาคม'];
  }
};

/* X-axis labels for the comparison bar chart — full span per period
   (Figma 395:127874 shows a 12-month bar overview for รายเดือน). */
const periodBarLabels = (period) => {
  switch (period) {
    case 'รายวัน':     return ['1', '2', '3', '4', '5', '6', '7'].map((d) => `${d} มิ.ย.`);
    case 'รายสัปดาห์': return ['สัปดาห์ 1', 'สัปดาห์ 2', 'สัปดาห์ 3', 'สัปดาห์ 4'];
    case 'รายปี':      return ['2565', '2566', '2567', '2568', '2569'];
    case 'รายเดือน':
    default:           return ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  }
};

/* Card wrapper for a chart inside the report popup. */
const CHART_CARD = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--dim-space-300)',
  padding: 'var(--dim-space-400)',
  borderRadius: 'var(--dim-radius-400)',
  background: 'var(--surface-card-100)',
  border: 'var(--dim-stroke-100) solid var(--border-card-default)',
};
const CHART_TITLE = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.4,
};

/* "ดูรายงาน" popup (Figma 358:113494 / 395:127874) — the list of users /
   ผู้รับบริการ for the report topic. The FilterTag row picks the time unit; the
   body re-groups into one table per bucket (day / week / month / year).
   "นำส่งออกรายงาน" reuses the shared export-format popup. */
const POPUP_PAGE_SIZE = 10;

const ReportTablePopup = ({ open, report, onClose, onExport, onRowClick }) => {
  const [period, setPeriod] = useState('รายเดือน');
  const [dateOpen, setDateOpen] = useState(false);
  /* ด.1.1.16 — search + pagination ในตาราง "ดูรายงาน" */
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  // Date range form (Figma 401:124365). Defaults to the current year → all units.
  const [dateRange, setDateRange] = useState(() => {
    const y = new Date().getFullYear();
    return { start: new Date(y, 0, 1), end: new Date(y, 11, 31) };
  });
  useEffect(() => { if (open) { setQuery(''); setPage(1); } }, [open, report]);
  const sr = rangeRank(dateRange);
  // If the chosen date range is narrower than the active period unit, fall
  // back to the widest unit that still fits the range.
  useEffect(() => {
    if (REPORT_PERIODS.indexOf(period) > sr) setPeriod(REPORT_PERIODS[sr]);
  }, [sr]); // eslint-disable-line react-hooks/exhaustive-deps
  const allRows = report && report.table ? report.table.rows.map((r, i) => ({ ...r, _id: i })) : [];
  /* กรองด้วยคำค้น (ทุกคอลัมน์ข้อความ) + ช่วงวันที่ (_iso ประกบวันที่ไทย) */
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const startIso = dateRange.start ? new Date(dateRange.start).toISOString().slice(0, 10) : null;
    const endIso = dateRange.end ? new Date(dateRange.end).toISOString().slice(0, 10) : null;
    return allRows.filter((r) => {
      if (q) {
        const hay = Object.entries(r)
          .filter(([k, v]) => k !== '_id' && (typeof v === 'string'))
          .map(([, v]) => v.toLowerCase()).join(' ');
        if (!hay.includes(q)) return false;
      }
      if (r._iso && startIso && endIso && (r._iso < startIso || r._iso > endIso)) return false;
      return true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, query, dateRange, open]);
  const pageCount = Math.max(1, Math.ceil(rows.length / POPUP_PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = rows.slice((safePage - 1) * POPUP_PAGE_SIZE, safePage * POPUP_PAGE_SIZE);
  const columns = report && report.table ? buildReportTableColumns(report.table.columns) : [];

  // Pie of the report's numeric stats (skip percentage values) — dashboard palette.
  const pieSegments = report
    ? report.stats.filter((s) => !isPercent(s.value)).map((s, i) => ({
        value: parseStatNum(s.value), color: PIE_PALETTE[i % PIE_PALETTE.length], label: s.label,
      }))
    : [];
  const pieTotal = pieSegments.reduce((a, s) => a + s.value, 0);
  const showPie = pieSegments.length >= 2;
  // Comparison bar chart across the selected period's buckets — topic-specific
  // series per report (consent vs export vs access-log all differ).
  const barLabels = periodBarLabels(period);
  const barConfig = (report && report.bars) || [
    { name: 'ยินยอม', tone: 'positive', base: [620, 1156, 845, 990, 730] },
    { name: 'ไม่ยินยอม', tone: 'danger', base: [180, 64, 132, 96, 210] },
  ];
  const barSeries = barConfig.map((b, si) => ({
    name: b.name,
    color: PIE_PALETTE[si % PIE_PALETTE.length],
    values: barLabels.map((_, i) => b.base[i % b.base.length]),
  }));

  const chartsBlock = (
    <div className='flex items-stretch flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
      {showPie && (
        <div style={{ ...CHART_CARD, minWidth: 240 }}>
          <span style={CHART_TITLE}>สัดส่วนภาพรวม</span>
          <div className='flex items-center justify-center'>
            <Donut segments={pieSegments} size={160} thickness={24} centerLabel={pieTotal.toLocaleString()} centerSub='รวม' />
          </div>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
            {pieSegments.map((s) => (
              <div key={s.label} className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                <span aria-hidden style={{ width: 10, height: 10, borderRadius: 'var(--dim-radius-full)', background: s.color, flexShrink: 0 }} />
                <span className='truncate' style={{ flex: 1, color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>{s.label}</span>
                <span style={{ color: s.color, fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-xs)' }}>{s.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ ...CHART_CARD, flex: '1 1 0', minWidth: 320 }}>
        <span style={CHART_TITLE}>เปรียบเทียบ{period}</span>
        <VBars months={barLabels} series={barSeries} height={200} />
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
          {barSeries.map((s) => (
            <div key={s.name} className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
              <span aria-hidden style={{ width: 10, height: 10, borderRadius: 'var(--dim-radius-100)', background: s.color }} />
              <span style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>{s.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='extraLarge'
      title={report ? report.title : 'รายงาน'}
      subtitle={report ? report.subtitle : undefined}
      primaryAction={{ label: 'ปิด', onClick: onClose }}
    >
      {report && report.table && (
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
          {/* filter row (Figma 395:127874) — search + range form + time-unit
             chips + export button on the right (ด.1.1.16). */}
          <div className='flex items-center justify-between flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
              <div style={{ flex: '0 1 240px', minWidth: 200 }}>
                <InputField
                  showLabel={false}
                  showHelperText={false}
                  leadingIcon='search'
                  value={query}
                  onChange={(v) => { setQuery(v); setPage(1); }}
                  placeholder='ค้นหาในรายงาน...'
                  size='md'
                />
              </div>
              <div className='flex items-center' style={{ gap: 'var(--dim-space-200)', flex: '0 1 340px' }}>
                <DateInputBox placeholder='วันเริ่มต้น' value={fmtThaiDate(dateRange.start)} onClick={() => setDateOpen(true)} />
                <span style={{ color: 'var(--text-content-tertiary)' }}>-</span>
                <DateInputBox placeholder='วันสิ้นสุด' value={fmtThaiDate(dateRange.end)} onClick={() => setDateOpen(true)} />
              </div>
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
                {REPORT_PERIODS.map((p, i) => (
                  <FilterTag key={p} value={p} selected={period === p} disabled={i > sr} onClick={() => setPeriod(p)} />
                ))}
              </div>
            </div>
            <NeutralSubdueButton leadingIcon='ios_share' size='sm' onClick={() => report && onExport(report)}>
              นำส่งออกรายงาน
            </NeutralSubdueButton>
          </div>

          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)', maxHeight: '58vh', overflowY: 'auto' }}>
            {chartsBlock}
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
              <span style={{ color: 'var(--text-brandPrimary-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)', lineHeight: 1.4 }}>
                รายการ ({period}) {report.key === 'personal-consent' ? '— คลิกแถวเพื่อดูประวัติความยินยอมรายบุคคล' : report.key === 'access-rights' ? '— คลิกแถวเพื่อดูวันเวลาการเข้าถึงรายครั้ง' : ''}
              </span>
              <Table
                columns={columns}
                rows={pageRows}
                rowKey={(r) => r._id}
                onRowClick={onRowClick ? (row) => onRowClick(report, row) : undefined}
                emptyMessage='ไม่พบข้อมูลในช่วง/คำค้นนี้'
                emptySubtext='ลองล้างคำค้นหรือขยายช่วงวันที่'
              />
              <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-600)' }}>
                <span style={{ flex: 1, color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', lineHeight: 1.5 }}>
                  แสดง {rows.length === 0 ? 0 : (safePage - 1) * POPUP_PAGE_SIZE + 1}-{Math.min(safePage * POPUP_PAGE_SIZE, rows.length)} จาก {rows.length} รายการ
                </span>
                <Pagination currentPage={safePage} pageCount={pageCount} onPageChange={setPage} />
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Shared PHCIS date picker drives the range form (range tab). */}
      <DateFilterPopup
        open={dateOpen}
        initialTab='range'
        onClose={() => setDateOpen(false)}
        onApply={({ tab, range, single }) => {
          if (tab === 'range' && range) setDateRange({ start: range.start, end: range.end });
          else if (single) setDateRange({ start: single, end: single });
        }}
      />
    </Popup>
  );
};

/* ตัวคูณต่อ period ของการ์ด 16.1 (ฐานข้อมูล = รายเดือน) */
const PERIOD_FACTOR = { 'รายวัน': 1 / 30, 'รายสัปดาห์': 7 / 30, 'รายเดือน': 1, 'รายปี': 12 };

const ReportCard = ({ report, onExport, onView, scale = 1 }) => {
  /* ด.1.1.16.1 — ชิป รายวัน/สัปดาห์/เดือน/ปี กรอง stats + bars จริง
     (สลับชุด label แกน x ตาม period) เฉพาะรายงานที่ selectable. */
  const [cardPeriod, setCardPeriod] = useState('รายเดือน');
  const isPeriodCard = !!report.selectable;
  const effScale = scale * (isPeriodCard ? (PERIOD_FACTOR[cardPeriod] || 1) : 1);
  /* Donut of the numeric stats (skip percentage/single-value reports) — dashboard palette.
     Values scale with the page "วัน:" scope + period chip. */
  const segments = report.stats
    .filter((s) => !isPercent(s.value))
    .map((s, i) => ({ value: Math.round(parseStatNum(s.value) * effScale), color: PIE_PALETTE[i % PIE_PALETTE.length], label: s.label }));
  const showPie = segments.length >= 2;
  const total = segments.reduce((a, s) => a + s.value, 0);
  const cardBarLabels = periodBarLabels(cardPeriod);
  const cardBarSeries = (report.bars || []).map((b, si) => ({
    name: b.name,
    color: PIE_PALETTE[si % PIE_PALETTE.length],
    values: cardBarLabels.map((_, i) => Math.max(1, Math.round(b.base[i % b.base.length] * (PERIOD_FACTOR[cardPeriod] || 1)))),
  }));
  return (
    <section
      className='w-full flex flex-col'
      style={{
        background: 'var(--surface-card-100)',
        borderRadius: 'var(--dim-radius-500)',
        border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
        boxShadow: 'var(--shadow-card)',
        padding: 'var(--dim-space-600)',
        gap: 'var(--dim-space-400)',
      }}
    >
      {/* header: title + subtitle · actions */}
      <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
          <h2 style={{ color: 'var(--text-brandPrimary-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)', fontWeight: 'var(--type-weight-regular, 400)', lineHeight: 1.4 }}>
            {report.title}
          </h2>
          <span style={{ color: 'var(--text-content-quaternary, #ADB2B7)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>
            {report.subtitle}
          </span>
        </div>
        <div className='flex-1' />
        <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-200)' }}>
          <NeutralSubdueButton leadingIcon='visibility' size='sm' collapseLabelBelow='lg' onClick={() => onView(report)}>ดูรายงาน</NeutralSubdueButton>
          <NeutralSubdueButton leadingIcon='ios_share' size='sm' collapseLabelBelow='lg' onClick={() => onExport(report)}>นำส่งออกรายงาน</NeutralSubdueButton>
        </div>
      </div>

      {/* dimension chips — การ์ด 16.1: ชิปกดได้จริง (กรอง stats+bars) ·
          การ์ดอื่น: display only ตามเดิม */}
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
        {isPeriodCard
          ? report.chips.map((c) => (
            <FilterTag key={c} value={c} selected={cardPeriod === c} onClick={() => setCardPeriod(c)} />
          ))
          : report.chips.map((c) => (
            <ColorfulBadge key={c} style='grey' size='small' hierarchy='secondary' width='hug'>{c}</ColorfulBadge>
          ))}
      </div>

      {/* pie chart (left) + stat cards (right) — Figma 358:113494. */}
      <div className='flex items-stretch flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
        {showPie && (
          <div
            className='flex items-center justify-center shrink-0'
            style={{
              minWidth: 180,
              padding: 'var(--dim-space-400)',
              borderRadius: 'var(--dim-radius-400)',
              background: 'var(--surface-card-100)',
              border: 'var(--dim-stroke-100) solid var(--border-card-default)',
            }}
          >
            <Donut segments={segments} size={140} thickness={22} centerLabel={total.toLocaleString()} centerSub='รวม' />
          </div>
        )}
        <div className='flex items-stretch flex-wrap flex-1' style={{ gap: 'var(--dim-space-400)', minWidth: 'min(100%, 360px)' }}>
          {report.stats.map((s) => (
            <SummaryCard key={s.label} card={statCard({ ...s, value: scaleStatValue(s.value, effScale) })} variant='panel' />
          ))}
        </div>
      </div>

      {/* ด.1.1.16.1 — bars เปรียบเทียบตาม period ที่เลือก (แกน x สลับชุด label) */}
      {isPeriodCard && cardBarSeries.length > 0 && (
        <div
          className='flex flex-col'
          style={{
            gap: 'var(--dim-space-300)',
            padding: 'var(--dim-space-400)',
            borderRadius: 'var(--dim-radius-400)',
            background: 'var(--surface-card-100)',
            border: 'var(--dim-stroke-100) solid var(--border-card-default)',
          }}
        >
          <span style={{ color: 'var(--text-content-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-sm)', lineHeight: 1.4 }}>
            จำนวน/สัดส่วนการให้ความยินยอม — {cardPeriod}
          </span>
          <VBars months={cardBarLabels} series={cardBarSeries} height={170} />
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
            {cardBarSeries.map((s) => (
              <div key={s.name} className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
                <span aria-hidden style={{ width: 10, height: 10, borderRadius: 'var(--dim-radius-100)', background: s.color }} />
                <span style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export function ConsentReportSections() {
  const [exportReport, setExportReport] = useState(null);
  const [viewReport, setViewReport] = useState(null);
  const [exported, setExported] = useState(false);
  const [pageDate, setPageDate] = useState({ quick: 'thismonth' }); // "วัน: เดือนนี้"
  /* ด.1.1.16.2 — คลิกแถวรายบุคคล → ConsentHistoryPopup ของ HN นั้น */
  const [historyFor, setHistoryFor] = useState(null);
  /* ด.1.1.16.4 — คลิกแถวผู้มีสิทธิ → วันเวลาการเข้าถึงรายครั้ง */
  const [accessTimesFor, setAccessTimesFor] = useState(null);

  const handleReportRowClick = (report, row) => {
    if (report.key === 'personal-consent' && row.hn) {
      /* สร้าง record เทียบเท่า consentRecords จากแถวรายงาน (mock) */
      setHistoryFor({
        name: row.name,
        hn: row.hn,
        type: row.type,
        version: 'V 1.0',
        status: row.status === 'ยินยอม' ? 'ยินยอมแล้ว' : 'ปฏิเสธ',
        history: [
          {
            date: '5 มิ.ย. 2569',
            formCode: 'PH-001',
            formName: `ใบยินยอมประเภท${row.type}`,
            type: row.type,
            version: 'V 1.0',
            status: row.status === 'ยินยอม' ? 'ยินยอมแล้ว' : 'ปฏิเสธ',
            channel: DEFAULT_SERVICE_CENTER_CHANNEL,
          },
        ],
      });
    } else if (report.key === 'access-rights' && row.accessTimes) {
      setAccessTimesFor(row);
    }
  };
  return (
    <>
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        {/* toolbar (Figma 399:125271) — date-range filter + export-all */}
        <section
          className='w-full flex items-center justify-between flex-wrap'
          style={{
            gap: 'var(--dim-space-300)',
            background: 'var(--surface-card-100)',
            borderRadius: 'var(--dim-radius-500)',
            border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            boxShadow: 'var(--shadow-card)',
            padding: 'var(--dim-space-300) var(--dim-space-400)',
          }}
        >
          <FilterDateTag prefix='วัน:' value={pageDate} onChange={setPageDate} defaultQuick='thismonth' />
          <NeutralSubdueButton leadingIcon='ios_share' size='md' onClick={() => setExportReport({ key: 'all', title: 'รายงานทั้งหมด' })}>
            นำส่งออกรายงานทั้งหมด
          </NeutralSubdueButton>
        </section>

        {CONSENT_REPORTS.map((r) => (
          <ReportCard key={r.key} report={r} scale={scaleForQuick(pageDate.quick)} onExport={setExportReport} onView={setViewReport} />
        ))}
      </div>

      {/* Table popup first, export popup last so the format chooser layers on
          top of the table popup when opened from inside it. */}
      <ReportTablePopup
        open={!!viewReport}
        report={viewReport}
        onClose={() => setViewReport(null)}
        onExport={setExportReport}
        onRowClick={handleReportRowClick}
      />
      <ExportFormatPopup
        open={!!exportReport}
        report={exportReport}
        onClose={() => setExportReport(null)}
        onExported={() => setExported(true)}
      />

      {/* ด.1.1.16.2 — ประวัติความยินยอมรายบุคคล (ยินยอม/ไม่ยินยอมเรื่องใดบ้าง) */}
      <ConsentHistoryPopup
        open={!!historyFor}
        record={historyFor}
        onClose={() => setHistoryFor(null)}
      />

      {/* ด.1.1.16.4 — วันเวลาการเข้าถึงรายครั้งของผู้มีสิทธิ */}
      <Popup
        open={!!accessTimesFor}
        onClose={() => setAccessTimesFor(null)}
        size='large'
        title='วันเวลาการเข้าถึงรายครั้ง'
        subtitle={accessTimesFor ? `${accessTimesFor.user} · ${accessTimesFor.role} · ${accessTimesFor.dept}` : undefined}
        primaryAction={{ label: 'ปิด', onClick: () => setAccessTimesFor(null) }}
      >
        {accessTimesFor && (
          <Table
            columns={[
              { key: 'datetime', header: 'วันเวลาที่เข้าถึง', width: 200, render: (r) => <span style={CELL_TEXT}>{r.datetime}</span> },
              { key: 'action', header: 'ประเภท action', width: 140, render: (r) => <ColorfulBadge style={BADGE_TONE[r.action] || 'blue'} size='small' hierarchy='secondary' width='hug'>{r.action}</ColorfulBadge> },
              { key: 'target', header: 'ข้อมูลที่เข้าถึง', width: 240, render: (r) => <span style={CELL_TEXT}>{r.target}</span> },
            ]}
            rows={accessTimesFor.accessTimes.map((t, i) => ({ ...t, _id: i }))}
            rowKey={(r) => r._id}
          />
        )}
      </Popup>
      {/* Success alert after export (Figma 358:131626 "Small Alert"). */}
      {/* เก็บ log เมื่อ export — annotation 414:123633 (print ไม่เก็บ log) */}
      <SuccessToast open={exported} message='นำส่งออกรายงานแล้ว — ระบบบันทึก log การส่งออกข้อมูล' onClose={() => setExported(false)} />
    </>
  );
}

/** @deprecated ใช้ /consent/dashboard — redirect สำหรับ bookmark เก่า */
export default function ConsentReportPage() {
  return <Redirect to='/consent/dashboard' />;
}
