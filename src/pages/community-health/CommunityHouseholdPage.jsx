import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import TabUnderline from '@/components/tab/TabUnderline';
import Select from '@/components/forms/Select';
import BrandButton from '@/components/button/BrandButton';
import SummaryCardsBar from '@/components/layout/SummaryCardsBar';
import CommunityLayout from './CommunityLayout';
import { CommunityCard } from './communityShared';
import {
  HOUSEHOLDS,
  HOUSEHOLD_STATUS_META,
  HOUSEHOLD_STATUS_TABS,
  COMMUNITY_OPTIONS,
  DISTRICT_OPTIONS,
} from './communityHouseholdData';

/* ทะเบียนบ้านและสมาชิก — ported from claude/Community community-household.html.
   Registry list of houses (source: `.tbl` rows บ้านเลขที่/ชุมชน/หัวหน้าครัวเรือน/
   สมาชิก/สถานะ) + the source's `.dcards` summary strip, rebuilt on PHCIS's own
   Table / PrimarySearch / TabUnderline / SummaryCardsBar per CLAUDE.md. */

const PAGE_SIZE = 10;

const SUMMARY_CARDS = [
  { key: 'population', color: 'info', icon: 'groups', value: '48,250', label: 'ประชากรทั้งหมด', indicator: 'เพิ่ม 2.1% จากปีที่แล้ว' },
  { key: 'households', color: 'info', icon: 'home', value: '1,240', label: 'ครัวเรือนทั้งหมด', indicator: 'เพิ่ม 1.6% จากปีที่แล้ว' },
  { key: 'communities', color: 'info', icon: 'holiday_village', value: '34', label: 'ชุมชนทั้งหมด', indicator: 'เพิ่ม 5 จากปีที่แล้ว' },
  { key: 'surveyed', color: 'positive', icon: 'fact_check', value: '68%', label: 'สำรวจแล้ว', indicator: 'เพิ่ม 2.1% จากเดือนก่อน' },
];

const TEXT_CELL = {
  color: 'var(--text-neutral-default, #4D5358)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm, 14px)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.5,
};

const HouseholdStatusBadge = ({ status }) => {
  const meta = HOUSEHOLD_STATUS_META[status];
  if (!meta) return <span style={TEXT_CELL}>—</span>;
  return (
    <ColorfulBadge style={meta.badge} size='small' hierarchy='secondary' width='hug'>
      {meta.label}
    </ColorfulBadge>
  );
};

const COLUMNS = [
  { key: 'houseNo', header: 'บ้านเลขที่', sortable: true, render: (row) => <span style={{ ...TEXT_CELL, fontWeight: 'var(--type-weight-medium, 500)' }}>{row.houseNo}</span> },
  { key: 'community', header: 'ชุมชน', flex: true, minWidth: 180, sortable: true, render: (row) => <span style={TEXT_CELL}>{row.community}</span> },
  { key: 'district', header: 'เขต', sortable: true, render: (row) => <span style={TEXT_CELL}>{row.district}</span> },
  { key: 'head', header: 'หัวหน้าครัวเรือน', flex: true, minWidth: 160, sortable: true, render: (row) => <span style={TEXT_CELL}>{row.head}</span> },
  { key: 'memberCount', header: 'สมาชิก (คน)', sortable: true, render: (row) => <span style={TEXT_CELL}>{row.memberCount}</span> },
  { key: 'status', header: 'สถานะ', sortable: true, render: (row) => <HouseholdStatusBadge status={row.status} /> },
];

const FilterSelect = ({ label, value, onChange, options }) => (
  <Select
    showFieldName={false}
    showLabel={false}
    placeholder={label}
    value={value}
    onChange={onChange}
    options={['', ...options].map((opt) => ({ value: opt, label: opt || `${label} (ทั้งหมด)` }))}
    style={{ minWidth: 200 }}
  />
);

const CommunityHouseholdPage = () => {
  const history = useHistory();
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [communityFilter, setCommunityFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory('mih:primarysearch-history:community-household');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return HOUSEHOLDS.filter((row) => {
      if (activeTab !== 'all' && row.status !== activeTab) return false;
      if (communityFilter && row.community !== communityFilter) return false;
      if (districtFilter && row.district !== districtFilter) return false;
      if (q) {
        const hit = row.houseNo.toLowerCase().includes(q) || row.head.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [activeTab, communityFilter, districtFilter, search]);

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

  return (
    <CommunityLayout activeKey='community' breadcrumb={['ข้อมูลชุมชน', 'ทะเบียนบ้านและสมาชิก']}>
      <SummaryCardsBar cards={SUMMARY_CARDS} variant='panel' detached />

      <CommunityCard>
        <div className='flex items-center justify-between flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <TabUnderline tabs={HOUSEHOLD_STATUS_TABS} value={activeTab} onChange={onSwitchTab} />
          <BrandButton
            variant='fill'
            size='lg'
            leadingIcon='add'
            onClick={() => history.push('/community-health/household/new')}
          >
            เพิ่มข้อมูลครัวเรือน
          </BrandButton>
        </div>

        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <PrimarySearch
            value={search}
            onChange={onSearchChange}
            onSubmit={onSearchSubmit}
            placeholder='ค้นหาบ้านเลขที่ หรือชื่อหัวหน้าครัวเรือน'
            width={420}
            history={searchHistory}
            onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
          />
          <FilterSelect label='เขต' value={districtFilter} onChange={(v) => { setDistrictFilter(v); setPage(1); }} options={DISTRICT_OPTIONS} />
          <FilterSelect label='ชุมชน' value={communityFilter} onChange={(v) => { setCommunityFilter(v); setPage(1); }} options={COMMUNITY_OPTIONS} />
        </div>

        <Table
          columns={COLUMNS}
          rows={pageRows}
          maxHeight={604}
          sortConfig={sortConfig}
          onSort={onSort}
          onRowClick={(row) => history.push(`/community-health/household/${row.id}`)}
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

export default CommunityHouseholdPage;
