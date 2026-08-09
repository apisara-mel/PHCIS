import React, { useEffect, useMemo, useState } from 'react';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import Select from '@/components/forms/Select';
import { Field, FieldGrid } from '@/components/forms/Fields';
import Popup from '@/components/popup/Popup';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StaffProfileAvatar from '@/components/appointment/StaffProfileAvatar';
import { staffProfileSearchSrc } from './appointmentStaffProfile';
import { staffBadgeTone } from './appointmentStaffRoster';
import { DOCTOR_ROSTER_SIZE } from './appointmentDoctorRoster';
import {
  PAGE_SIZE,
  findEarliestFreeSlot,
  formatApptListDate,
  isoKey,
} from './appointmentShared';

/* Figma Appointment 1:18433 — staff table card (search · filters · table · pagination).
   + TOR 1.6.2.1 earliest free-slot search popup. */

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
    render: renderStaffName},
  {
    key: 'groupPolicyLabel',
    header: 'Group Policy',
    sortable: true,
    render: renderGroupPolicy},
  {
    key: 'subDivision',
    header: 'สาขาย่อย',
    sortable: true,
    render: renderSubDivision},
  {
    key: 'dept',
    header: 'แผนก',
    sortable: true,
    render: renderDept},
  {
    key: 'workDays',
    header: 'วันทำงาน',
    sortable: true,
    render: renderWorkDays},
  {
    key: 'avgExamMin',
    header: 'เวลาตรวจโดยเฉลี่ย',
    sortable: true,
    render: renderAvgExam},
];

const columns = buildColumns();

const alignEarliestFilters = (staffList, policy, sub, dept) => {
  let nextPolicy = policy;
  let nextSub = sub;
  let nextDept = dept;

  const byPolicy = (list) => (
    nextPolicy ? list.filter((s) => s.groupPolicy === nextPolicy) : list
  );
  let pool = byPolicy(staffList);

  if (nextSub && !pool.some((s) => s.subDivision === nextSub)) {
    nextSub = '';
    nextDept = '';
  }
  if (nextSub) pool = pool.filter((s) => s.subDivision === nextSub);

  if (nextDept && !pool.some((s) => s.dept === nextDept)) {
    nextDept = '';
  }

  /* When a specialty is chosen, lock department to the matching roster value. */
  if (nextSub) {
    const depts = [...new Set(pool.map((s) => s.dept).filter(Boolean))];
    if (depts.length === 1) nextDept = depts[0];
  }

  return { policy: nextPolicy, sub: nextSub, dept: nextDept };
};

const EarliestSlotPopup = ({
  open,
  staff,
  appointments,
  policyOptions,
  initialPolicy = '',
  initialSub = '',
  initialDept = '',
  onClose,
  onBook,
}) => {
  const [policy, setPolicy] = useState(initialPolicy);
  const [sub, setSub] = useState(initialSub);
  const [dept, setDept] = useState(initialDept);
  const [result, setResult] = useState(null);
  const [searched, setSearched] = useState(false);
  const [matchCount, setMatchCount] = useState(0);

  const cascadedSubOptions = useMemo(() => {
    const pool = policy ? staff.filter((s) => s.groupPolicy === policy) : staff;
    const subs = [...new Set(pool.map((s) => s.subDivision).filter(Boolean))];
    return [{ value: '', label: 'ทั้งหมด' }, ...subs.map((s) => ({ value: s, label: s }))];
  }, [staff, policy]);

  const cascadedDeptOptions = useMemo(() => {
    let pool = policy ? staff.filter((s) => s.groupPolicy === policy) : staff;
    if (sub) pool = pool.filter((s) => s.subDivision === sub);
    const depts = [...new Set(pool.map((s) => s.dept).filter(Boolean))];
    return [{ value: '', label: 'ทั้งหมด' }, ...depts.map((d) => ({ value: d, label: d }))];
  }, [staff, policy, sub]);

  const runSearch = (nextPolicy = policy, nextSub = sub, nextDept = dept) => {
    const aligned = alignEarliestFilters(staff, nextPolicy, nextSub, nextDept);
    if (aligned.policy !== nextPolicy) setPolicy(aligned.policy);
    if (aligned.sub !== nextSub) setSub(aligned.sub);
    if (aligned.dept !== nextDept) setDept(aligned.dept);

    const pool = staff.filter((s) => (
      (!aligned.policy || s.groupPolicy === aligned.policy)
      && (!aligned.sub || s.subDivision === aligned.sub)
      && (!aligned.dept || s.dept === aligned.dept)
    ));
    setMatchCount(pool.length);

    const hit = findEarliestFreeSlot({
      staffList: staff,
      appointments,
      groupPolicy: aligned.policy,
      subDivision: aligned.sub,
      dept: aligned.dept,
      fromDate: isoKey(new Date()),
      days: 21,
    });
    setResult(hit);
    setSearched(true);
  };

  useEffect(() => {
    if (!open) return;
    const aligned = alignEarliestFilters(staff, initialPolicy, initialSub, initialDept);
    setPolicy(aligned.policy);
    setSub(aligned.sub);
    setDept(aligned.dept);
    /* Auto-search on open so the demo always shows a mock hit when possible. */
    const pool = staff.filter((s) => (
      (!aligned.policy || s.groupPolicy === aligned.policy)
      && (!aligned.sub || s.subDivision === aligned.sub)
      && (!aligned.dept || s.dept === aligned.dept)
    ));
    setMatchCount(pool.length);
    const hit = findEarliestFreeSlot({
      staffList: staff,
      appointments,
      groupPolicy: aligned.policy,
      subDivision: aligned.sub,
      dept: aligned.dept,
      fromDate: isoKey(new Date()),
      days: 21,
    });
    setResult(hit);
    setSearched(true);
  }, [open, initialPolicy, initialSub, initialDept, staff, appointments]);

  const handlePolicyChange = (next) => {
    const aligned = alignEarliestFilters(staff, next, '', '');
    setPolicy(aligned.policy);
    setSub(aligned.sub);
    setDept(aligned.dept);
    setResult(null);
    setSearched(false);
  };

  const handleSubChange = (next) => {
    const aligned = alignEarliestFilters(staff, policy, next, '');
    setSub(aligned.sub);
    setDept(aligned.dept);
    setResult(null);
    setSearched(false);
  };

  const handleDeptChange = (next) => {
    setDept(next);
    setResult(null);
    setSearched(false);
  };

  return (
    <Popup
      open={open}
      onClose={onClose}
      title='Slot ที่ว่างเร็วที่สุด'
      subtitle='เลือก Group Policy / สาขา / แผนก แล้วค้นหาวัน–เวลาที่ว่างเร็วสุด'
      size='large'
      tertiaryAction={{ label: 'ปิด', onClick: onClose }}
      primaryAction={result
        ? {
          label: 'สร้างนัดหมายที่ Slot นี้',
          onClick: () => onBook?.(result),
        }
        : {
          label: 'ค้นหา Slot ว่าง',
          onClick: () => runSearch(),
        }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>
        <FieldGrid cols={1} rowGap='var(--dim-space-400)'>
          <Field label='Group Policy'>
            <Select
              size='large'
              value={policy}
              onChange={handlePolicyChange}
              options={policyOptions}
              showLabel={false}
              showHelperText={false}
            />
          </Field>
          <Field label='สาขาย่อย'>
            <Select
              size='large'
              value={sub}
              onChange={handleSubChange}
              options={cascadedSubOptions}
              showLabel={false}
              showHelperText={false}
            />
          </Field>
          <Field label='แผนก'>
            <Select
              size='large'
              value={dept}
              onChange={handleDeptChange}
              options={cascadedDeptOptions}
              showLabel={false}
              showHelperText={false}
            />
          </Field>
        </FieldGrid>

        {searched && !result ? (
          <p
            style={{
              margin: 0,
              color: 'var(--text-content-secondary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              lineHeight: 1.5,
            }}
          >
            {matchCount === 0
              ? 'ไม่มีบุคลากรตามเงื่อนไขที่เลือก — ลองเปลี่ยนสาขาหรือแผนก'
              : 'ไม่พบ Slot ว่างในช่วง 21 วันตามเงื่อนไขที่เลือก'}
          </p>
        ) : null}

        {result ? (
          <div
            className='flex flex-col w-full'
            style={{
              gap: 'var(--dim-space-200)',
              padding: 'var(--dim-space-400)',
              borderRadius: 'var(--dim-radius-400)',
              background: 'var(--surface-brandPrimary-quaternary)',
              border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            }}
          >
            <span
              style={{
                color: 'var(--text-brandPrimary-default)',
                fontFamily: 'var(--type-family-heading-content)',
                fontSize: 'var(--type-size-sm)',
                fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
              }}
            >
              พบ Slot ว่างเร็วสุด
            </span>
            <span
              style={{
                color: 'var(--text-neutral-default)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
                lineHeight: 1.5,
              }}
            >
              {formatApptListDate(result.date)} · {result.time}
              {result.queueNo != null ? ` · คิว ${result.queueNo}` : ''}
              {' · '}
              {result.staff?.name}
              {result.staff?.subDivision ? ` · ${result.staff.subDivision}` : ''}
              {result.staff?.dept ? ` · ${result.staff.dept}` : ''}
            </span>
          </div>
        ) : null}
      </div>
    </Popup>
  );
};

const StaffListView = ({ staff, appointments = [], onSelect, onBookEarliest }) => {
  const [search, setSearch] = useState('');
  const [filterPolicy, setFilterPolicy] = useState('');
  const [filterSub, setFilterSub] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [earliestOpen, setEarliestOpen] = useState(false);
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
    const pool = filterPolicy
      ? staff.filter((s) => s.groupPolicy === filterPolicy)
      : staff;
    const subs = [...new Set(pool.map((s) => s.subDivision).filter(Boolean))];
    return [{ value: '', label: 'ทั้งหมด' }, ...subs.map((s) => ({ value: s, label: s }))];
  }, [staff, filterPolicy]);

  const deptOptions = useMemo(() => {
    let pool = filterPolicy
      ? staff.filter((s) => s.groupPolicy === filterPolicy)
      : staff;
    if (filterSub) pool = pool.filter((s) => s.subDivision === filterSub);
    const depts = [...new Set(pool.map((s) => s.dept).filter(Boolean))];
    return [{ value: '', label: 'ทั้งหมด' }, ...depts.map((d) => ({ value: d, label: d }))];
  }, [staff, filterPolicy, filterSub]);

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
  const isFiltered = !!(filterPolicy || filterSub || filterDept);
  const filtersActive = !!(search.trim() || isFiltered);
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => {
      setSearch('');
      setFilterPolicy('');
      setFilterSub('');
      setFilterDept('');
      setPage(1);
    },
  );
  const rangeStart = sorted.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, sorted.length);
  const totalDisplay = (search.trim() || isFiltered) ? sorted.length : DOCTOR_ROSTER_SIZE;

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

        <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
          <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
              <FilterDropdown
                prefix='Group Policy:'
                options={policyOptions}
                value={filterPolicy}
                onChange={(v) => {
                  setFilterPolicy(v);
                  setFilterSub('');
                  setFilterDept('');
                  setPage(1);
                }}
              />
              <FilterDropdown
                prefix='สาขาย่อย:'
                options={subOptions}
                value={filterSub}
                onChange={(v) => {
                  setFilterSub(v);
                  const depts = [...new Set(
                    staff
                      .filter((s) => (!filterPolicy || s.groupPolicy === filterPolicy) && (!v || s.subDivision === v))
                      .map((s) => s.dept)
                      .filter(Boolean),
                  )];
                  setFilterDept(depts.length === 1 ? depts[0] : '');
                  setPage(1);
                }}
              />
              <FilterDropdown
                prefix='แผนก:'
                options={deptOptions}
                value={filterDept}
                onChange={(v) => { setFilterDept(v); setPage(1); }}
              />
              <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
            </OverflowFlexRow>
            <div className='flex-1' />
            <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-200)' }}>
              <BrandSubdueButton
                variant='outline'
                size='sm'
                leadingIcon='event_available'
                collapseLabelBelow='lg'
                onClick={() => setEarliestOpen(true)}
              >
                Slot ที่ว่างเร็วที่สุด
              </BrandSubdueButton>
              <NeutralSubdueButton leadingIcon='ios_share' size='sm' collapseLabelBelow='lg'>
                นำส่งออกรายงาน
              </NeutralSubdueButton>
            </div>
          </div>

          <SmoothFilterResults opaque={resultsOpaque}>
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
          </SmoothFilterResults>
        </div>
      </section>

      <EarliestSlotPopup
        open={earliestOpen}
        staff={staff}
        appointments={appointments}
        policyOptions={policyOptions}
        initialPolicy={filterPolicy}
        initialSub={filterSub}
        initialDept={filterDept}
        onClose={() => setEarliestOpen(false)}
        onBook={(hit) => {
          setEarliestOpen(false);
          onBookEarliest?.(hit);
        }}
      />
    </div>
  );
};

export default StaffListView;
