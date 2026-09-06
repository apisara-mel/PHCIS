import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import Select from '@/components/forms/Select';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import SummaryCardsBar from '@/components/layout/SummaryCardsBar';
import CommunityLayout from './CommunityLayout';
import { CommunityCard } from './communityShared';
import {
  COMMUNITY_ROWS,
  REGISTRY_TOTALS,
  DISTRICT_OPTIONS,
  SUBDISTRICT_OPTIONS,
  CENTER_OPTIONS,
  STATUS_LABEL,
} from './communityRegisterData';

/* ข้อมูลทะเบียนชุมชน — ported from claude/Community community-register.html.
   Static ROWS[] + summary bar + search box + filter chips + sortable table
   + pager, rebuilt with PHCIS's own Table / PrimarySearch / Pagination and
   design.md tokens (per CLAUDE.md), same list-page shape as SchedulePage. */

const PAGE_SIZE = 10;

const TEXT_CELL = {
  color: 'var(--text-neutral-default, #4D5358)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm, 14px)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.5,
};

const SUMMARY_CARDS = [
  { key: 'communities', color: 'info', icon: 'holiday_village', value: String(REGISTRY_TOTALS.communities), label: 'จำนวนชุมชน' },
  { key: 'houses', color: 'positive', icon: 'home', value: REGISTRY_TOTALS.houses.toLocaleString('th-TH'), label: 'จำนวนบ้าน' },
  { key: 'members', color: 'inprogress', icon: 'groups', value: REGISTRY_TOTALS.members.toLocaleString('th-TH'), label: 'จำนวนสมาชิก' },
];

const StatusCell = ({ status }) => (
  <ColorfulBadge style={status === 'active' ? 'green' : 'grey'} size='small' hierarchy='secondary' width='hug' showDot>
    {STATUS_LABEL[status] || status}
  </ColorfulBadge>
);

const asOption = (v) => ({ value: v, label: v });

const CommunityRegisterPage = () => {
  const history = useHistory();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory('mih:primarysearch-history:community-register');
  const [district, setDistrict] = useState('');
  const [subdistrict, setSubdistrict] = useState('');
  const [center, setCenter] = useState('');
  const [status, setStatus] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return COMMUNITY_ROWS.filter((r) => {
      if (district && r.district !== district) return false;
      if (subdistrict && r.subdistrict !== subdistrict) return false;
      if (center && r.center !== center) return false;
      if (status && r.status !== status) return false;
      if (q) {
        const hit = r.nameTh.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || r.nameEn.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [search, district, subdistrict, center, status]);

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

  const clearAllFilters = () => { setDistrict(''); setSubdistrict(''); setCenter(''); setStatus(''); setPage(1); };
  const hasFilters = Boolean(district || subdistrict || center || status || search);

  const COLUMNS = [
    { key: 'code', header: 'รหัสชุมชน', minWidth: 96, sortable: true, render: (row) => <span style={TEXT_CELL}>{row.code}</span> },
    { key: 'nameTh', header: 'ชื่อชุมชน', flex: true, minWidth: 200, sortable: true, render: (row) => <span style={{ ...TEXT_CELL, fontWeight: 'var(--type-weight-medium, 500)' }}>{row.nameTh}</span> },
    { key: 'district', header: 'เขต', minWidth: 110, sortable: true, render: (row) => <span style={TEXT_CELL}>{row.district}</span> },
    { key: 'subdistrict', header: 'แขวง', minWidth: 130, sortable: true, render: (row) => <span style={TEXT_CELL}>{row.subdistrict}</span> },
    { key: 'center', header: 'ศูนย์บริการสาธารณสุข', minWidth: 150, sortable: true, render: (row) => <span style={TEXT_CELL}>{row.center}</span> },
    { key: 'houses', header: 'จำนวนบ้าน', minWidth: 100, sortable: true, render: (row) => <span style={TEXT_CELL}>{row.houses.toLocaleString('th-TH')}</span> },
    { key: 'members', header: 'จำนวนสมาชิก', minWidth: 110, sortable: true, render: (row) => <span style={TEXT_CELL}>{row.members.toLocaleString('th-TH')}</span> },
    { key: 'status', header: 'สถานะ', minWidth: 100, sortable: true, render: (row) => <StatusCell status={row.status} /> },
    { key: 'updatedAt', header: 'วันที่ปรับปรุงล่าสุด', minWidth: 140, sortable: true, render: (row) => <span style={TEXT_CELL}>{row.updatedAt}</span> },
    {
      key: 'actions',
      header: 'จัดการ',
      sortable: false,
      minWidth: 64,
      render: (row) => (
        <NeutralSubdueIconButton
          icon='visibility'
          size='sm'
          variant='outline'
          onClick={(e) => { e.stopPropagation(); history.push(`/community-health/register/${row.id}`); }}
        />
      ),
    },
  ];

  return (
    <CommunityLayout activeKey='community' breadcrumb={['ข้อมูลชุมชน', 'ข้อมูลทะเบียนชุมชน']}>
      <SummaryCardsBar cards={SUMMARY_CARDS} variant='panel' detached />

      <CommunityCard>
        <div className='flex items-center justify-between flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <div className='flex-1 min-w-0'>
            <PrimarySearch
              value={search}
              onChange={onSearchChange}
              onSubmit={onSearchSubmit}
              placeholder='ค้นหาชื่อชุมชน หรือรหัสชุมชน'
              width={420}
              history={searchHistory}
              onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
            />
          </div>
          <BrandButton size='md' leadingIcon='add' onClick={() => history.push('/community-health/register/new')}>
            เพิ่มทะเบียนชุมชน
          </BrandButton>
        </div>

        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <Select
            showFieldName={false} showLabel={false} searchable={false} size='md'
            placeholder='เขต: ทั้งหมด' value={district} onChange={setDistrict}
            options={DISTRICT_OPTIONS.map(asOption)}
            style={{ minWidth: 160 }}
          />
          <Select
            showFieldName={false} showLabel={false} searchable={false} size='md'
            placeholder='แขวง: ทั้งหมด' value={subdistrict} onChange={setSubdistrict}
            options={SUBDISTRICT_OPTIONS.map(asOption)}
            style={{ minWidth: 160 }}
          />
          <Select
            showFieldName={false} showLabel={false} searchable={false} size='md'
            placeholder='ศูนย์บริการ: ทั้งหมด' value={center} onChange={setCenter}
            options={CENTER_OPTIONS.map(asOption)}
            style={{ minWidth: 190 }}
          />
          <Select
            showFieldName={false} showLabel={false} searchable={false} size='md'
            placeholder='สถานะ: ทั้งหมด' value={status} onChange={setStatus}
            options={[{ value: 'active', label: 'ใช้งาน' }, { value: 'inactive', label: 'ไม่ใช้งาน' }]}
            style={{ minWidth: 150 }}
          />
          {hasFilters && (
            <button
              type='button'
              onClick={clearAllFilters}
              className='inline-flex items-center'
              style={{
                gap: 'var(--dim-space-100, 4px)',
                background: 'none',
                border: 0,
                padding: 0,
                cursor: 'pointer',
                color: 'var(--text-brandPrimary-default, #007549)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm, 14px)',
                fontWeight: 'var(--type-weight-medium, 500)',
              }}
            >
              <Icon name='filter_alt_off' size={16} />
              ล้างตัวกรอง
            </button>
          )}
        </div>

        <Table
          columns={COLUMNS}
          rows={pageRows}
          maxHeight={604}
          sortConfig={sortConfig}
          onSort={onSort}
          onRowClick={(row) => history.push(`/community-health/register/${row.id}`)}
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

export default CommunityRegisterPage;
