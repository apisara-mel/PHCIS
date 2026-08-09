import React, { useMemo, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import FilterTag from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import FilterDateTag from '@/components/forms/FilterDateTag';
import PrimarySearch from '@/components/search/PrimarySearch';
import { Donut, VBars } from '@/components/graph/Charts';
import {
  PII_ACCESS_LOG_STATS, PII_ACCESS_LOG_BARS, getPiiAccessLog,
} from '@/data/piiAccessLog';
import { matchesDateFilter } from '@/data/financePaymentPrototype';
import AUDIT_NAV from '@/pages/audit/auditNav';

/* ระบบประวัติการใช้งาน · Log การเข้าถึงข้อมูลส่วนบุคคล (ย้ายจาก Consent dashboard). */

const PAGE_SIZE = 20;
const breadcrumb = ['ประวัติการใช้งาน', 'Log ข้อมูลส่วนบุคคล'];
const PERIOD_LABELS = ['รายวัน', 'รายสัปดาห์', 'รายเดือน', 'รายปี'];
const PERIOD_FACTOR = { 'รายวัน': 1 / 30, 'รายสัปดาห์': 7 / 30, 'รายเดือน': 1, 'รายปี': 12 };
const PERIOD_BAR_LABELS = {
  'รายวัน': ['1', '2', '3', '4', '5', '6', '7'].map((d) => `${d} มิ.ย.`),
  'รายสัปดาห์': ['สัปดาห์ 1', 'สัปดาห์ 2', 'สัปดาห์ 3', 'สัปดาห์ 4'],
  'รายเดือน': ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
  'รายปี': ['2565', '2566', '2567', '2568', '2569'],
};
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

const parseNum = (v) => Number(String(v).replace(/[^0-9.]/g, '')) || 0;
const statCard = (s) => ({
  key: s.label,
  icon: s.icon,
  value: s.value,
  label: s.label,
  color: s.tone === 'danger' ? 'danger' : s.tone === 'purple' ? 'info' : s.tone,
});

export default function AuditPiiAccessLogPage() {
  const [period, setPeriod] = useState('รายเดือน');
  const [dateFilter, setDateFilter] = useState(null);
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const factor = PERIOD_FACTOR[period] || 1;
  const barLabels = PERIOD_BAR_LABELS[period] || PERIOD_BAR_LABELS['รายเดือน'];
  const barSeries = PII_ACCESS_LOG_BARS.map((b, si) => ({
    name: b.name,
    color: PIE_PALETTE[si % PIE_PALETTE.length],
    values: barLabels.map((_, i) => Math.max(1, Math.round(b.base[i % b.base.length] * factor))),
  }));

  const donutSegments = PII_ACCESS_LOG_STATS.slice(1).map((s, i) => ({
    label: s.label,
    color: PIE_PALETTE[i % PIE_PALETTE.length],
    value: Math.round(parseNum(s.value) * factor),
  }));
  const donutTotal = donutSegments.reduce((a, s) => a + s.value, 0);

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
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const columns = [
    { key: 'datetime', header: 'วันเวลา', render: (r) => <span style={CELL}>{r.datetime}</span> },
    { key: 'user', header: 'ผู้ใช้', render: (r) => <span style={CELL}>{r.user}</span> },
    { key: 'action', header: 'ประเภท action', render: (r) => <ColorfulBadge style={BADGE_TONE[r.action] || 'blue'} size='small' hierarchy='secondary' width='hug'>{r.action}</ColorfulBadge> },
    { key: 'target', header: 'ข้อมูลที่เข้าถึง', render: (r) => <span style={CELL}>{r.target}</span> },
    { key: 'ip', header: 'IP Address', render: (r) => <span style={{ ...BODY, color: 'var(--text-content-tertiary)' }}>{r.ip}</span> },
    { key: 'sessionId', header: 'Session ID', render: (r) => <span style={{ ...BODY, color: 'var(--text-content-tertiary)' }}>{r.sessionId}</span> },
  ];

  return (
    <QueuePageShell
      activeKey='audit-pii'
      sidebarItems={AUDIT_NAV}
      sidebarFallbackKey='audit-pii'
      brandTitle='ระบบประวัติการใช้งาน'
      breadcrumb={breadcrumb}
      title='Log การเข้าถึงข้อมูลส่วนบุคคล'
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
        <p style={{ ...BODY, margin: 0 }}>
          Audit Log ทุกการเข้าถึงข้อมูลส่วนบุคคล — IP Address · Session ID · ประเภท action
        </p>
        <section className='w-full flex flex-col' style={{ ...CARD, gap: 'var(--dim-space-400)' }}>
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
            {PERIOD_LABELS.map((p) => (
              <FilterTag key={p} value={p} selected={period === p} onClick={() => setPeriod(p)} />
            ))}
            <div className='flex-1' />
            <FilterDateTag prefix='วัน:' value={dateFilter} onChange={(v) => { setDateFilter(v); setPage(1); }} />
          </div>

          <div className='flex items-stretch flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
            <div className='flex items-center justify-center shrink-0' style={{ minWidth: 180, padding: 'var(--dim-space-400)', borderRadius: 'var(--dim-radius-400)', border: 'var(--dim-stroke-100) solid var(--border-card-default)' }}>
              <Donut segments={donutSegments} size={140} thickness={22} centerLabel={donutTotal.toLocaleString('th-TH')} centerSub='log' />
            </div>
            <div className='flex items-stretch flex-wrap flex-1' style={{ gap: 'var(--dim-space-400)', minWidth: 'min(100%, 360px)' }}>
              {PII_ACCESS_LOG_STATS.map((s) => (
                <SummaryCard
                  key={s.label}
                  card={{
                    ...statCard(s),
                    value: String(Math.round(parseNum(s.value) * factor)).replace(/\B(?=(\d{3})+(?!\d))/g, ','),
                  }}
                  variant='panel'
                />
              ))}
            </div>
          </div>

          <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)', padding: 'var(--dim-space-400)', borderRadius: 'var(--dim-radius-400)', border: 'var(--dim-stroke-100) solid var(--border-card-default)' }}>
            <span style={{ ...TITLE, color: 'var(--text-content-default)', fontSize: 'var(--type-size-sm)' }}>
              จำนวนการเข้าถึงตาม action — {period}
            </span>
            <VBars months={barLabels} series={barSeries} height={170} />
          </div>
        </section>

        <section className='w-full flex flex-col' style={{ ...CARD, gap: 'var(--dim-space-400)' }}>
          <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <PrimarySearch
              value={search}
              onChange={(v) => { setSearch(v); setPage(1); }}
              placeholder='ค้นหาผู้ใช้ / IP / ข้อมูลที่เข้าถึง...'
              width={360}
            />
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
              {['VIEW', 'EXPORT', 'DELETE'].map((a) => (
                <FilterTag key={a} value={a} selected={actionFilter === a} onClick={() => { setActionFilter(a); setPage(1); }} />
              ))}
              <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
            </div>
          </div>
          <SmoothFilterResults opaque={resultsOpaque}>
          <Table columns={columns} rows={pageRows} rowKey={(r) => r.id} emptyMessage='ไม่พบ log ตามตัวกรอง' />
          <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-600)' }}>
            <span style={{ flex: 1, ...BODY }}>
              แสดง {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, filtered.length)} จาก {filtered.length} รายการ
            </span>
            <Pagination currentPage={safePage} pageCount={totalPages} onPageChange={setPage} />
          </div>
          </SmoothFilterResults>
        </section>
      </div>
    </QueuePageShell>
  );
}
