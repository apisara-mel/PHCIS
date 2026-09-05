import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import TabUnderline from '@/components/tab/TabUnderline';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueIconButton from '@/components/button/BrandSubdueIconButton';
import CommunityLayout from './CommunityLayout';
import { CommunityCard } from './communityShared';
import {
  ASSESS_SUMMARY,
  ASSESS_ROWS,
  ASSESS_STATUS_TABS,
  RESULT_TONE,
  STATUS_TONE,
} from './communityAssessData';

/* การประเมิน (ประเมินสภาพแวดล้อมและสุขาภิบาล) — ported from claude/Community
   community-assess.html. The source page's `.ssc-row` summary cards +
   `.filterbar` chips + `.tbl` become PHCIS's own summary tiles + TabUnderline
   + Table, per CLAUDE.md "Design tokens are the only source of truth"; the
   3-slice donut on CommunityDashboardPage ("จำนวนการประเมินตามผล") is this
   page's registry underneath. */

const PAGE_SIZE = 10;

const TEXT_CELL = {
  color: 'var(--text-neutral-default, #4D5358)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm, 14px)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.5,
};

const SUMMARY_TILES = [
  { key: 'total', icon: 'fact_check', tone: 'info', label: 'ประเมินทั้งหมด', value: ASSESS_SUMMARY.total },
  { key: 'pass', icon: 'task_alt', tone: 'positive', label: 'ผ่านเกณฑ์', value: ASSESS_SUMMARY.pass },
  { key: 'improve', icon: 'report', tone: 'destructive', label: 'ต้องปรับปรุง', value: ASSESS_SUMMARY.improve },
  { key: 'pending', icon: 'pending_actions', tone: 'inprogress', label: 'ยังไม่ได้ประเมิน', value: ASSESS_SUMMARY.pending },
];

const TILE_TONE = {
  info: { bg: 'var(--surface-pill-blue, #DBEAFE)', ink: 'var(--text-pill-blue, #1D4ED8)' },
  positive: { bg: 'var(--surface-pill-green, #DFF2E9)', ink: 'var(--text-pill-green, #007549)' },
  destructive: { bg: 'var(--surface-pill-red, #FEE2E2)', ink: 'var(--text-pill-red, #B91C1C)' },
  inprogress: { bg: 'var(--surface-pill-yellow, #FEF9C3)', ink: 'var(--text-pill-yellow, #A16207)' },
};

const SummaryTile = ({ icon, tone, label, value }) => {
  const t = TILE_TONE[tone] || TILE_TONE.info;
  return (
    <div
      className='flex items-center'
      style={{
        gap: 'var(--dim-space-300, 12px)',
        flex: '1 1 200px',
        minWidth: 200,
        padding: 'var(--dim-space-400, 16px)',
        borderRadius: 'var(--dim-radius-400, 12px)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
        background: 'var(--surface-card-100, #FFFFFF)',
      }}
    >
      <span
        className='inline-flex items-center justify-center shrink-0'
        style={{
          width: 'var(--dim-size-900, 44px)',
          height: 'var(--dim-size-900, 44px)',
          borderRadius: 'var(--dim-radius-full, 9999px)',
          background: t.bg,
          color: t.ink,
        }}
      >
        <Icon name={icon} size={22} />
      </span>
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
        <span
          style={{
            fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
            fontSize: 'var(--type-size-2xl, 24px)',
            fontWeight: 'var(--type-weight-title, var(--type-weight-medium, 500))',
            lineHeight: 1.25,
            color: 'var(--text-topic-tertiary-title, #363B3F)',
          }}
        >
          {value}
        </span>
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary, #858C92)' }}>
          {label}
        </span>
      </div>
    </div>
  );
};

const ResultBadge = ({ result }) => {
  if (!result) return <span style={TEXT_CELL}>—</span>;
  return (
    <ColorfulBadge style={RESULT_TONE[result] || 'grey'} size='small' hierarchy='secondary' width='hug'>
      {result}
    </ColorfulBadge>
  );
};

const StatusBadge = ({ status }) => {
  if (!status) return <span style={TEXT_CELL}>—</span>;
  return (
    <ColorfulBadge style={STATUS_TONE[status] || 'grey'} size='small' hierarchy='secondary' showDot width='hug'>
      {status}
    </ColorfulBadge>
  );
};

const CommunityAssessPage = () => {
  const history = useHistory();
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory('mih:primarysearch-history:community-assess');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const allRows = useMemo(() => ASSESS_ROWS, []);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((r) => {
      if (activeTab !== 'all' && r.result !== activeTab) return false;
      if (q) {
        const hit = r.code.toLowerCase().includes(q) || r.community.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [allRows, activeTab, search]);

  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return filteredRows;
    const list = filteredRows.slice();
    list.sort((a, b) => {
      const av = a[sortConfig.key] ?? '';
      const bv = b[sortConfig.key] ?? '';
      const cmp = typeof av === 'string' && typeof bv === 'string'
        ? av.localeCompare(bv, 'th')
        : (av < bv ? -1 : av > bv ? 1 : 0);
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredRows, sortConfig]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [sortedRows, page]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const pageStart = sortedRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, sortedRows.length);

  const onSwitchTab = (key) => { setActiveTab(key); setPage(1); };
  const onSort = (key) => {
    setSortConfig((prev) => (prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' }));
    setPage(1);
  };
  const onSearchChange = (val) => { setSearch(val); setPage(1); };
  const onSearchSubmit = (val) => {
    const q = (val || '').trim();
    if (q) pushHistory({ label: q, value: q });
    setSearch(q);
    setPage(1);
  };

  const columns = [
    { key: 'no', header: 'ลำดับ', minWidth: 64, render: (row, i) => <span style={TEXT_CELL}>{(page - 1) * PAGE_SIZE + i + 1}</span> },
    { key: 'code', header: 'เลขที่ประเมิน', sortable: true, render: (row) => <span style={TEXT_CELL}>{row.code}</span> },
    { key: 'community', header: 'ชื่อชุมชน', flex: true, minWidth: 180, sortable: true, render: (row) => <span style={TEXT_CELL}>{row.community}</span> },
    { key: 'date', header: 'วันที่ประเมิน', sortable: true, render: (row) => <span style={TEXT_CELL}>{row.date}</span> },
    { key: 'assessor', header: 'ผู้ประเมิน', sortable: true, render: (row) => <span style={TEXT_CELL}>{row.assessor}</span> },
    { key: 'result', header: 'ผลการประเมิน', sortable: true, render: (row) => <ResultBadge result={row.result} /> },
    { key: 'status', header: 'สถานะ', sortable: true, render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: 'จัดการ',
      sortable: false,
      render: (row) => (
        <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150, 6px)' }}>
          <BrandSubdueIconButton
            variant='outline'
            size='sm'
            icon='visibility'
            aria-label={`ดูรายละเอียด ${row.code}`}
            onClick={(e) => { e.stopPropagation(); history.push('/community-health/assess/new'); }}
          />
          <BrandSubdueIconButton
            variant='outline'
            size='sm'
            icon='edit'
            aria-label={`แก้ไข ${row.code}`}
            onClick={(e) => { e.stopPropagation(); history.push('/community-health/assess/new'); }}
          />
        </span>
      ),
    },
  ];

  return (
    <CommunityLayout activeKey='assess' breadcrumb={['การประเมิน']}>
      <div
        className='flex flex-wrap'
        style={{ gap: 'var(--dim-space-400, 16px)' }}
      >
        {SUMMARY_TILES.map((tile) => <SummaryTile key={tile.key} {...tile} />)}
      </div>

      <CommunityCard>
        <div className='flex items-center justify-between flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <div style={{ flex: '1 1 320px', maxWidth: 480 }}>
            <PrimarySearch
              value={search}
              onChange={onSearchChange}
              onSubmit={onSearchSubmit}
              placeholder='ค้นหาเลขที่ประเมิน หรือ ชื่อชุมชน'
              history={searchHistory}
              onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
            />
          </div>
          <BrandButton
            variant='fill'
            size='lg'
            leadingIcon='add'
            onClick={() => history.push('/community-health/assess/new')}
          >
            เพิ่มการประเมิน
          </BrandButton>
        </div>

        <TabUnderline tabs={ASSESS_STATUS_TABS} value={activeTab} onChange={onSwitchTab} />

        <Table
          columns={columns}
          rows={pageRows}
          maxHeight={604}
          sortConfig={sortConfig}
          onSort={onSort}
          onRowClick={(row) => history.push('/community-health/assess/new')}
        />

        <div
          className='flex items-center justify-between'
          style={{ gap: 'var(--dim-space-400, 16px)' }}
        >
          <span
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              color: 'var(--text-content-secondary, #636B72)',
            }}
          >
            แสดง {pageStart}–{pageEnd} จาก {filteredRows.length} รายการ
          </span>
          <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
        </div>
      </CommunityCard>
    </CommunityLayout>
  );
};

export default CommunityAssessPage;
