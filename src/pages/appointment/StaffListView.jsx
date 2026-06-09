import React, { useMemo, useState } from 'react';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StaffProfileAvatar from '@/components/appointment/StaffProfileAvatar';
import { staffProfileSearchSrc } from './appointmentStaffProfile';
import { staffBadgeTone } from './appointmentStaffRoster';
import { DOCTOR_ROSTER_SIZE } from './appointmentDoctorRoster';
import { PAGE_SIZE } from './appointmentShared';

/* Figma Appointment 1:18433 — staff table card (search · filters · table · pagination). */

const TABLE_MAX_HEIGHT = 604;

const TEXT_CELL_STYLE = {
  color: 'var(--text-neutral-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};

const StaffBadge = ({ label }) => {
  if (!label || label === '—') return <span style={TEXT_CELL_STYLE}>—</span>;
  return (
    <ColorfulBadge style={staffBadgeTone(label)} size='small' hierarchy='secondary' width='hug'>
      {label}
    </ColorfulBadge>
  );
};

const renderStaffName = (row) => (
  <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
    <StaffProfileAvatar staff={row} size={36} />
    <span className='truncate' style={TEXT_CELL_STYLE}>{row.name}</span>
  </div>
);

const renderGroupPolicy = (row) => (
  <StaffBadge label={row.groupPolicyLabel || row.groupPolicy} />
);

const renderSubDivision = (row) => <StaffBadge label={row.subDivision} />;

const renderDept = (row) => <StaffBadge label={row.dept} />;

const renderWorkDays = (row) => (
  <span style={TEXT_CELL_STYLE}>{row.workDays} วัน/สัปดาห์</span>
);

const renderAvgExam = (row) => (
  <span style={TEXT_CELL_STYLE}>{row.avgExamMin} นาที</span>
);

/* Column widths — Figma 1:18433 HeaderCell nodes 16:40511–16:40517 */
const buildColumns = () => [
  {
    key: 'name',
    header: 'ชื่อ-นามสกุล',
    flex: true,
    minWidth: 200,
    sortable: true,
    render: renderStaffName,
  },
  {
    key: 'groupPolicyLabel',
    header: 'Group Policy',
    width: 160,
    sortable: true,
    render: renderGroupPolicy,
  },
  {
    key: 'subDivision',
    header: 'สาขาย่อย',
    width: 192,
    sortable: true,
    render: renderSubDivision,
  },
  {
    key: 'dept',
    header: 'แผนก',
    width: 224,
    sortable: true,
    render: renderDept,
  },
  {
    key: 'workDays',
    header: 'วันทำงาน',
    width: 160,
    sortable: true,
    render: renderWorkDays,
  },
  {
    key: 'avgExamMin',
    header: 'เวลาตรวจโดยเฉลี่ย',
    width: 160,
    sortable: true,
    render: renderAvgExam,
  },
];

const columns = buildColumns();

const StaffListView = ({ staff, onSelect }) => {
  const [search, setSearch] = useState('');
  const [filterPolicy, setFilterPolicy] = useState('');
  const [filterSub, setFilterSub] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory('mih:primarysearch-history:appointment-staff');

  const policyOptions = useMemo(() => {
    const keys = [...new Set(staff.map((s) => s.groupPolicy))];
    const labelFor = (k) => staff.find((s) => s.groupPolicy === k)?.groupPolicyLabel || k;
    return [
      { value: '', label: 'ทั้งหมด' },
      ...keys.map((k) => ({ value: k, label: labelFor(k) })),
    ];
  }, [staff]);

  const subOptions = useMemo(() => {
    const subs = [...new Set(staff.map((s) => s.subDivision).filter(Boolean))];
    return [{ value: '', label: 'ทั้งหมด' }, ...subs.map((s) => ({ value: s, label: s }))];
  }, [staff]);

  const deptOptions = useMemo(() => {
    const depts = [...new Set(staff.map((s) => s.dept).filter(Boolean))];
    return [{ value: '', label: 'ทั้งหมด' }, ...depts.map((d) => ({ value: d, label: d }))];
  }, [staff]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter(
      (s) =>
        (!filterPolicy || s.groupPolicy === filterPolicy) &&
        (!filterSub || s.subDivision === filterSub) &&
        (!filterDept || s.dept === filterDept) &&
        (!q || s.name.toLowerCase().includes(q) || (s.nameEn || '').toLowerCase().includes(q)),
    );
  }, [staff, search, filterPolicy, filterSub, filterDept]);

  const handleSort = (key) => {
    setSortConfig((prev) => (
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    ));
  };

  const sorted = useMemo(() => {
    const { key, direction } = sortConfig;
    const sign = direction === 'desc' ? -1 : 1;
    const copy = filtered.slice();
    if (!key) {
      copy.sort((a, b) => a.id - b.id);
      return copy;
    }
    copy.sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      const primary = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av ?? '').localeCompare(String(bv ?? ''), 'th');
      if (primary !== 0) return sign * primary;
      return a.id - b.id;
    });
    return copy;
  }, [filtered, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const isAllFilters = !filterPolicy && !filterSub && !filterDept;
  const rangeStart = sorted.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, sorted.length);
  const totalDisplay = (search.trim() || !isAllFilters) ? sorted.length : DOCTOR_ROSTER_SIZE;

  const searchAvatars = useMemo(
    () =>
      staff
        .map((s) => staffProfileSearchSrc(s))
        .filter(Boolean)
        .slice(0, 3)
        .map((src) => ({ src })),
    [staff],
  );

  const handleSubmit = (value) => {
    const q = (value || '').trim();
    if (q) pushHistory({ label: q, value: q });
    setSearch(q);
    setPage(1);
  };

  return (
    <div className='flex flex-col flex-1 min-w-0'>
      <section
        className='w-full flex flex-col'
        style={{
          background: 'var(--surface-card-100)',
          borderRadius: 'var(--dim-radius-500)',
          border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
          boxShadow: 'var(--shadow-card-strong)',
          padding: 'var(--dim-space-600)',
          gap: 'var(--dim-space-600)',
        }}
      >
        <div className='w-full flex items-start justify-center'>
          <PrimarySearch
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            onSubmit={handleSubmit}
            placeholder='ค้นหา ชื่อ-สกุล บุคลากร'
            width={640}
            history={searchHistory}
            onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
            avatars={searchAvatars}
          />
        </div>

        {/* Tag + Table — Figma gap 12px between filter row, table, pagination */}
        <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
          <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
              <FilterTag
                value='ทั้งหมด'
                selected={isAllFilters}
                onClick={() => { setFilterPolicy(''); setFilterSub(''); setFilterDept(''); setPage(1); }}
              />
              <FilterDropdown
                prefix='Group Policy:'
                options={policyOptions}
                value={filterPolicy}
                onChange={(v) => { setFilterPolicy(v); setPage(1); }}
              />
              <FilterDropdown
                prefix='สาขาย่อย:'
                options={subOptions}
                value={filterSub}
                onChange={(v) => { setFilterSub(v); setPage(1); }}
              />
              <FilterDropdown
                prefix='แผนก:'
                options={deptOptions}
                value={filterDept}
                onChange={(v) => { setFilterDept(v); setPage(1); }}
              />
            </OverflowFlexRow>
            <div className='flex-1' />
            <NeutralSubdueButton leadingIcon='ios_share' size='sm' collapseLabelBelow='lg'>
              นำส่งออกรายงาน
            </NeutralSubdueButton>
          </div>

          <Table
            columns={columns}
            rows={pageRows}
            rowKey={(row) => row.id}
            sortConfig={sortConfig}
            onSort={handleSort}
            onRowClick={(row) => onSelect(row.id)}
            emptyMessage='ไม่พบบุคลากร'
            style={{
              maxHeight: TABLE_MAX_HEIGHT,
              overflow: 'auto',
            }}
          />

          <div
            className='flex items-center w-full'
            style={{
              gap: 'var(--dim-space-600)',
              paddingTop: 'var(--dim-space-400)',
            }}
          >
            <span
              style={{
                flex: 1,
                color: 'var(--text-content-secondary)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
                lineHeight: 1.5,
              }}
            >
              แสดง {rangeStart}-{rangeEnd} จาก {totalDisplay} รายการ
            </span>
            <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
          </div>
        </div>
      </section>
    </div>
  );
};

export default StaffListView;
