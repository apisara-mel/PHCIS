import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import TabUnderline from '@/components/tab/TabUnderline';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandCircleIconButton from '@/components/button/BrandCircleIconButton';
import CommunityLayout from './CommunityLayout';
import { CommunityCard } from './communityShared';
import { CHC_LIST, CHC_STATUS_META, CHC_STATUS_TABS } from './communityChcData';

/* ข้อมูลศูนย์สุขภาพชุมชน — ported from claude/Community community-chc.html.
   The prototype's registry table (130 mock rows, chip filters) is rebuilt
   with PHCIS's own PrimarySearch + TabUnderline + Table + Pagination, per
   CommunityDashboardPage's precedent of reusing PHCIS building blocks
   instead of the static prototype's own CSS. Sample data lives in
   communityChcData.js (6 rows — matches the dashboard's "ศูนย์สุขภาพชุมชน: 6"
   summary card). */

const PAGE_SIZE = 10;

const TEXT_CELL = {
  color: 'var(--text-neutral-default, #4D5358)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm, 14px)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.5,
};

const StatusBadge = ({ status }) => {
  const meta = CHC_STATUS_META[status];
  if (!meta) return <span style={TEXT_CELL}>—</span>;
  return (
    <ColorfulBadge style={meta.tone} size='small' hierarchy='secondary' width='hug'>
      {meta.label}
    </ColorfulBadge>
  );
};

const CommunityChcPage = () => {
  const history = useHistory();
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory('mih:primarysearch-history:community-chc');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const columns = useMemo(() => ([
    {
      key: 'code',
      header: 'รหัสศูนย์',
      minWidth: 96,
      sortable: true,
      render: (row) => <span style={TEXT_CELL}>{row.code}</span>,
    },
    {
      key: 'name',
      header: 'ชื่อศูนย์สุขภาพชุมชน',
      flex: true,
      minWidth: 240,
      sortable: true,
      render: (row) => (
        <span style={{ ...TEXT_CELL, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.name}
        </span>
      ),
    },
    {
      key: 'district',
      header: 'เขต / แขวง',
      minWidth: 180,
      sortable: true,
      render: (row) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-0)' }}>
          <span style={TEXT_CELL}>{row.district}</span>
          <span style={{ ...TEXT_CELL, color: 'var(--text-content-tertiary, #8A9099)', fontSize: 'var(--type-size-xs, 12px)' }}>
            {row.subdistrict}
          </span>
        </div>
      ),
    },
    {
      key: 'coverageCount',
      header: 'ชุมชนที่รับผิดชอบ',
      minWidth: 140,
      sortable: true,
      render: (row) => <span style={TEXT_CELL}>{row.communities.length} ชุมชน</span>,
    },
    {
      key: 'volunteerCount',
      header: 'จำนวน อสส.',
      minWidth: 110,
      sortable: true,
      render: (row) => <span style={TEXT_CELL}>{row.volunteerCount}</span>,
    },
    {
      key: 'status',
      header: 'สถานะ',
      minWidth: 130,
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'จัดการ',
      minWidth: 72,
      render: (row) => (
        <BrandCircleIconButton
          icon='chevron_right'
          variant='ghost'
          size='sm'
          aria-label={`ดูรายละเอียด ${row.name}`}
          onClick={(e) => { e.stopPropagation(); history.push(`/community-health/chc/${row.id}`); }}
        />
      ),
    },
  ]), [history]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return CHC_LIST.filter((r) => {
      if (activeTab !== 'all' && r.status !== activeTab) return false;
      if (q) {
        const hit = [r.name, r.code, r.district, r.subdistrict].some((v) => v.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }, [activeTab, search]);

  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return filteredRows;
    const list = filteredRows.slice();
    list.sort((a, b) => {
      const av = sortConfig.key === 'coverageCount' ? a.communities.length : a[sortConfig.key];
      const bv = sortConfig.key === 'coverageCount' ? b.communities.length : b[sortConfig.key];
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

  return (
    <CommunityLayout activeKey='community' breadcrumb={['ข้อมูลชุมชน', 'ข้อมูลศูนย์สุขภาพชุมชน']}>
      <CommunityCard>
        <div className='flex items-center justify-between' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <TabUnderline tabs={CHC_STATUS_TABS} value={activeTab} onChange={onSwitchTab} />
          <BrandPrimaryButton
            variant='fill'
            size='lg'
            leadingIcon='add'
            className='shrink-0'
            onClick={() => history.push('/community-health/chc/new')}
          >
            เพิ่มศูนย์สุขภาพชุมชน
          </BrandPrimaryButton>
        </div>

        <PrimarySearch
          value={search}
          onChange={onSearchChange}
          onSubmit={onSearchSubmit}
          placeholder='ค้นหาชื่อศูนย์สุขภาพชุมชน หรือรหัสศูนย์'
          width={480}
          history={searchHistory}
          onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
        />

        <Table
          columns={columns}
          rows={pageRows}
          maxHeight={604}
          sortConfig={sortConfig}
          onSort={onSort}
          onRowClick={(row) => history.push(`/community-health/chc/${row.id}`)}
        />

        <div className='flex items-center justify-between' style={{ gap: 'var(--dim-space-400, 16px)' }}>
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

export default CommunityChcPage;
