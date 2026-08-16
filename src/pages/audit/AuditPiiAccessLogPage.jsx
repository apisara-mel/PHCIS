import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import FilterTag from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import FilterDateTag from '@/components/forms/FilterDateTag';
import PrimarySearch from '@/components/search/PrimarySearch';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import { ExportFormatPopup } from '@/pages/consent/consentExportPopup';
import { VBars } from '@/components/graph/Charts';
import {
  PII_ACCESS_LOG_BARS, getPiiAccessLog,
} from '@/data/piiAccessLog';
import { matchesDateFilter } from '@/data/financePaymentPrototype';
import AUDIT_NAV from '@/pages/audit/auditNav';
import { AUDIT_HISTORY_TABS } from '@/pages/audit/AuditHistoryTabs';

/* ระบบประวัติการใช้งาน · Log การเข้าถึงข้อมูลส่วนบุคคล (ย้ายจาก Consent dashboard). */

const PAGE_SIZE = 20;
const breadcrumb = ['ประวัติการใช้งาน', 'ประวัติการใช้งาน'];
const MOCK_PII_SEARCH_HISTORY = [
  { label: 'พญ.สมหญิง รักษ์ดี', value: 'พญ.สมหญิง รักษ์ดี' },
  { label: 'ประวัติการรักษา', value: 'ประวัติการรักษา' },
  { label: '10.12.4.1', value: '10.12.4.1' },
];
const PERIOD_LABELS = ['รายวัน', 'รายสัปดาห์', 'รายเดือน', 'รายปี'];
const PERIOD_DATE_QUICKS = {
  'รายวัน': 'today',
  'รายสัปดาห์': 'thisweek',
  'รายเดือน': 'thismonth',
  'รายปี': 'thisyear',
};
const PERIOD_FACTOR = { 'รายวัน': 1 / 30, 'รายสัปดาห์': 7 / 30, 'รายเดือน': 1, 'รายปี': 12 };
const PERIOD_BAR_LABELS = {
  'รายวัน': ['1', '2', '3', '4', '5', '6', '7'].map((d) => `${d} มิ.ย.`),
  'รายสัปดาห์': ['สัปดาห์ 1', 'สัปดาห์ 2', 'สัปดาห์ 3', 'สัปดาห์ 4'],
  'รายเดือน': ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
  'รายปี': ['2565', '2566', '2567', '2568', '2569'],
};
/* Palette remains shared by the action trend series after removing the donut. */
const PIE_PALETTE = ['#14B8A6', '#6366F1', '#F59E0B', '#EC4899'];
const BADGE_TONE = { VIEW: 'blue', EXPORT: 'purple', UPDATE: 'orange', DELETE: 'red' };

const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600)',
};
const TITLE = {
  color: 'var(--text-brandPrimary-default)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-base)',
  lineHeight: 1.4,
};
const BODY = {
  color: 'var(--text-content-secondary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.6,
};
const CELL = { ...BODY, color: 'var(--text-content-default)' };

const periodForDateSelection = (selection) => {
  const quick = selection?.quick;
  if (['today', 'yesterday', 'tomorrow', 'monthStart', 'monthEnd', 'lastMonthStart', 'lastMonthEnd'].includes(quick)) return 'รายวัน';
  if (['7days', 'thisweek'].includes(quick)) return 'รายสัปดาห์';
  if (['30days', 'thismonth', 'lastmonth'].includes(quick)) return 'รายเดือน';
  if (['thisyear', 'lastyear', 'todayLastYear'].includes(quick)) return 'รายปี';
  if (quick === 'custom') {
    const start = selection.tab === 'single' ? selection.single : selection.range?.start;
    const end = selection.tab === 'single' ? selection.single : selection.range?.end;
    if (start && end) {
      const days = Math.round(Math.abs(new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
      if (days <= 1) return 'รายวัน';
      if (days <= 7) return 'รายสัปดาห์';
      if (days <= 31) return 'รายเดือน';
      return 'รายปี';
    }
  }
  return null;
};

export default function AuditPiiAccessLogPage() {
  const history = useHistory();
  const [period, setPeriod] = useState('รายเดือน');
  const [dateFilter, setDateFilter] = useState(null);
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [exportOpen, setExportOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const factor = PERIOD_FACTOR[period] || 1;
  const barLabels = PERIOD_BAR_LABELS[period] || PERIOD_BAR_LABELS['รายเดือน'];
  const barSeries = PII_ACCESS_LOG_BARS.map((b, si) => ({
    name: b.name,
    color: PIE_PALETTE[si % PIE_PALETTE.length],
    values: barLabels.map((_, i) => Math.max(1, Math.round(b.base[i % b.base.length] * factor))),
  }));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return getPiiAccessLog().filter((r) => {
      if (actionFilter && r.action !== actionFilter) return false;
      if (dateFilter && r._iso && !matchesDateFilter(r._iso, dateFilter)) return false;
      if (!q) return true;
      return [r.user, r.ip, r.action, r.target, r.datetime, r.sessionId].some((v) => String(v).toLowerCase().includes(q));
    });
  }, [search, actionFilter, dateFilter]);

  const filtersActive = !!search.trim() || !!actionFilter || !!dateFilter;
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => {
      setSearch('');
      setActionFilter('');
      setDateFilter(null);
      setPage(1);
    },
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const sorted = useMemo(() => {
    const copy = filtered.slice();
    if (!sortConfig.key) return copy;
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    return copy.sort((a, b) => sign * String(a[sortConfig.key] ?? '').localeCompare(String(b[sortConfig.key] ?? ''), 'th'));
  }, [filtered, sortConfig]);
  const pageRows = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const columns = [
    { key: 'datetime', header: 'วันเวลา', sortable: true, render: (r) => <span style={CELL}>{r.datetime}</span> },
    { key: 'user', header: 'ผู้ใช้', sortable: true, render: (r) => <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}><img src={r.avatarUrl} alt='' aria-hidden className='shrink-0 object-cover' style={{ width: 'var(--dim-size-500)', height: 'var(--dim-size-500)', borderRadius: 'var(--dim-radius-full)' }} /><span style={CELL}>{r.user}</span></div> },
    { key: 'action', header: 'ประเภท action', render: (r) => <ColorfulBadge style={BADGE_TONE[r.action] || 'blue'} size='small' hierarchy='secondary' width='hug'>{r.action}</ColorfulBadge> },
    { key: 'target', header: 'ข้อมูลที่เข้าถึง', sortable: true, render: (r) => <span style={CELL}>{r.target}</span> },
    { key: 'ip', header: 'IP Address', sortable: true, render: (r) => <span style={{ ...BODY, color: 'var(--text-content-tertiary)' }}>{r.ip}</span> },
    { key: 'sessionId', header: 'Session ID', sortable: true, render: (r) => <span style={{ ...BODY, color: 'var(--text-content-tertiary)' }}>{r.sessionId}</span> },
  ];

  const exportReport = {
    key: 'pii-access-history',
    title: 'ประวัติการเข้าถึงข้อมูลส่วนบุคคล',
    table: {
      columns: [
        { key: 'datetime', header: 'วันเวลา' },
        { key: 'user', header: 'ผู้ใช้' },
        { key: 'action', header: 'ประเภท action' },
        { key: 'target', header: 'ข้อมูลที่เข้าถึง' },
        { key: 'ip', header: 'IP Address' },
        { key: 'sessionId', header: 'Session ID' },
      ],
      rows: filtered,
    },
  };

  const handlePeriodChange = (nextPeriod) => {
    setPeriod(nextPeriod);
    setDateFilter({ quick: PERIOD_DATE_QUICKS[nextPeriod] });
    setPage(1);
  };

  const handleDateChange = (nextDate) => {
    setDateFilter(nextDate);
    const nextPeriod = periodForDateSelection(nextDate);
    if (nextPeriod) setPeriod(nextPeriod);
    setPage(1);
  };

  return (
    <QueuePageShell
      activeKey='audit-log'
      sidebarItems={AUDIT_NAV}
      sidebarFallbackKey='audit-log'
      brandTitle='ระบบประวัติการใช้งาน'
      breadcrumb={breadcrumb}
      title='ประวัติการใช้งาน'
      tabs={AUDIT_HISTORY_TABS}
      activeTab='pii'
      onTabChange={(key) => history.push(AUDIT_HISTORY_TABS.find((tab) => tab.key === key)?.path || '/audit/log')}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
        <section className='w-full flex flex-col' style={{ ...CARD, gap: 'var(--dim-space-400)' }}>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)', padding: 'var(--dim-space-400)', border: 'none', background: 'transparent' }}>
            <div className='flex items-center justify-between flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
              <span style={{ ...TITLE, color: 'var(--text-content-default)', fontSize: 'var(--type-size-sm)' }}>
                จำนวนการเข้าถึงตาม action — {period}
              </span>
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
                {PERIOD_LABELS.map((p) => <FilterTag key={p} value={p} selected={period === p} onClick={() => handlePeriodChange(p)} />)}
                <FilterDateTag prefix='วัน:' value={dateFilter} onChange={handleDateChange} />
              </div>
            </div>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-400)' }} aria-label='คำอธิบายสีของกราฟ'>
              {barSeries.map((series) => <span key={series.name} className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)', ...BODY }}><span aria-hidden style={{ width: 'var(--dim-size-200)', height: 'var(--dim-size-200)', borderRadius: 'var(--dim-radius-full)', background: series.color }} />{series.name}</span>)}
            </div>
            <VBars months={barLabels} series={barSeries} height={170} showLegend={false} />
          </div>
        </section>

        <section className='w-full flex flex-col' style={{ ...CARD, gap: 'var(--dim-space-400)' }}>
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <div className='w-full flex justify-center'>
              <PrimarySearch
                value={search}
                onChange={(v) => { setSearch(v); setPage(1); }}
                placeholder='ค้นหาผู้ใช้ / IP / ข้อมูลที่เข้าถึง...'
                width={640}
                history={MOCK_PII_SEARCH_HISTORY}
              />
            </div>
            <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-150)' }}>
              {['VIEW', 'EXPORT', 'DELETE'].map((a) => (
                <FilterTag key={a} value={a} selected={actionFilter === a} onClick={() => { setActionFilter(a); setPage(1); }} />
              ))}
              <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
              <div className='flex-1' />
              <NeutralSubdueButton leadingIcon='ios_share' size='sm' onClick={() => setExportOpen(true)}>
                นำส่งออกรายงาน
              </NeutralSubdueButton>
            </div>
          </div>
          <SmoothFilterResults opaque={resultsOpaque}>
          <Table columns={columns} rows={pageRows} rowKey={(r) => r.id} sortConfig={sortConfig} onSort={(key) => setSortConfig((p) => (p.key === key ? { key, direction: p.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }))} emptyMessage='ไม่พบ log ตามตัวกรอง' />
          <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-600)' }}>
            <span style={{ flex: 1, ...BODY }}>
              แสดง {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, filtered.length)} จาก {filtered.length} รายการ
            </span>
            <Pagination currentPage={safePage} pageCount={totalPages} onPageChange={setPage} />
          </div>
          </SmoothFilterResults>
        </section>
      </div>
      <ExportFormatPopup
        open={exportOpen}
        report={exportReport}
        onClose={() => setExportOpen(false)}
        documentFooter='ออกเอกสารโดยระบบประวัติการใช้งาน (PHCIS)'
      />
    </QueuePageShell>
  );
}
