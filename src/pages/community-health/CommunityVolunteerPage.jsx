import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import TabUnderline from '@/components/tab/TabUnderline';
import Select from '@/components/forms/Select';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandCircleIconButton from '@/components/button/BrandCircleIconButton';
import CommunityLayout from './CommunityLayout';
import { CommunityCard } from './communityShared';
import {
  VOLUNTEERS,
  VOLUNTEER_STATUS_META,
  VOLUNTEER_STATUS_TABS,
  VOLUNTEER_DISTRICTS,
} from './communityVolunteerData';

/* อาสาสมัครชุมชน — ported from claude/Community community-volunteer.html.
   List/registry page: search + เขต filter + สถานะ tabs + sortable Table +
   Pagination, mirroring the CRUD-list pattern in
   src/pages/schedule/SchedulePage.jsx (PrimarySearch/Table/Pagination/
   TabUnderline) rather than the prototype's own chip filter bar + custom
   CSS grid table, per CLAUDE.md token/component reuse rules. */

const PAGE_SIZE = 10;

const TEXT_CELL = {
  color: 'var(--text-neutral-default, #4D5358)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm, 14px)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.5,
};

const StatusBadge = ({ status }) => {
  const meta = VOLUNTEER_STATUS_META[status];
  if (!meta) return <span style={TEXT_CELL}>—</span>;
  return (
    <ColorfulBadge style={meta.tone} size='small' hierarchy='secondary' width='hug'>
      {meta.label}
    </ColorfulBadge>
  );
};

const VolunteerAvatar = () => (
  <span
    className='inline-flex items-center justify-center shrink-0'
    style={{
      width: 'var(--dim-size-700, 28px)',
      height: 'var(--dim-size-700, 28px)',
      borderRadius: 'var(--dim-radius-full)',
      background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
      color: 'var(--text-brandPrimary-default, #007549)',
    }}
  >
    <Icon name='person' size={16} />
  </span>
);

const COLUMNS = [
  {
    key: 'code',
    header: 'รหัส อสส.',
    minWidth: 96,
    sortable: true,
    render: (row) => <span style={TEXT_CELL}>{row.code}</span>,
  },
  {
    key: 'name',
    header: 'ชื่อ-นามสกุล',
    flex: true,
    minWidth: 200,
    sortable: true,
    render: (row) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dim-space-150, 6px)', minWidth: 0 }}>
        <VolunteerAvatar />
        <span style={{ ...TEXT_CELL, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.name}
        </span>
      </div>
    ),
  },
  {
    key: 'center',
    header: 'ศูนย์สุขภาพชุมชน',
    minWidth: 200,
    sortable: true,
    render: (row) => <span style={TEXT_CELL}>{row.center}</span>,
  },
  {
    key: 'community',
    header: 'ชุมชนที่รับผิดชอบ',
    minWidth: 160,
    sortable: true,
    render: (row) => <span style={TEXT_CELL}>{row.community}</span>,
  },
  {
    key: 'houses',
    header: 'จำนวนบ้านที่รับผิดชอบ',
    minWidth: 100,
    sortable: true,
    render: (row) => <span style={TEXT_CELL}>{row.houses}</span>,
  },
  {
    key: 'status',
    header: 'สถานะ',
    minWidth: 110,
    sortable: true,
    render: (row) => <StatusBadge status={row.status} />,
  },
];

const buildColumns = (history) => [
  ...COLUMNS,
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
        onClick={(e) => { e.stopPropagation(); history.push(`/community-health/volunteer/${row.id}`); }}
      />
    ),
  },
];

const CommunityVolunteerPage = () => {
  const history = useHistory();
  const [activeTab, setActiveTab] = useState('all');
  const [district, setDistrict] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory('mih:primarysearch-history:community-volunteer');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const districtOptions = useMemo(
    () => [{ value: '', label: 'เขต: ทั้งหมด' }, ...VOLUNTEER_DISTRICTS.map((d) => ({ value: d, label: `เขต: ${d}` }))],
    [],
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return VOLUNTEERS.filter((r) => {
      if (activeTab !== 'all' && r.status !== activeTab) return false;
      if (district && r.district !== district) return false;
      if (q) {
        const inName = r.name.toLowerCase().includes(q);
        const inCode = r.code.toLowerCase().includes(q);
        if (!inName && !inCode) return false;
      }
      return true;
    });
  }, [activeTab, district, search]);

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

  const columns = useMemo(() => buildColumns(history), [history]);

  return (
    <CommunityLayout activeKey='community' breadcrumb={['ข้อมูลชุมชน', 'อาสาสมัครชุมชน']}>
      <CommunityCard>
        <div className='flex items-center justify-between' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <TabUnderline tabs={VOLUNTEER_STATUS_TABS} value={activeTab} onChange={onSwitchTab} />
          <BrandPrimaryButton
            variant='fill'
            size='lg'
            leadingIcon='add'
            className='shrink-0'
            onClick={() => history.push('/community-health/volunteer/new')}
          >
            เพิ่มอาสาสมัครชุมชน
          </BrandPrimaryButton>
        </div>

        <div
          className='flex items-center flex-wrap'
          style={{ gap: 'var(--dim-space-400, 16px)' }}
        >
          <PrimarySearch
            value={search}
            onChange={onSearchChange}
            onSubmit={onSearchSubmit}
            placeholder='ค้นหาชื่อ อสส. หรือรหัส อสส.'
            width={360}
            history={searchHistory}
            onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
          />
          <div style={{ width: 200 }}>
            <Select
              value={district}
              onChange={setDistrict}
              options={districtOptions}
              placeholder='เขต: ทั้งหมด'
              showFieldName={false}
              size='lg'
            />
          </div>
        </div>

        <Table
          columns={columns}
          rows={pageRows}
          maxHeight={604}
          sortConfig={sortConfig}
          onSort={onSort}
          onRowClick={(row) => history.push(`/community-health/volunteer/${row.id}`)}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--dim-space-400, 16px)',
          }}
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

export default CommunityVolunteerPage;
