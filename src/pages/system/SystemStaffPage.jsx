import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import {
  USERS, ROLES, DEPARTMENTS, getRole, getSubRole, getDepartment,
} from '@/data/usersAccess';
import SYSTEM_NAV from '@/pages/system/systemNav';

/* ระบบจัดการระบบ · รายชื่อบุคลากร (Figma 0EDfjwf1 · 0:3 "ผู้ใช้งานและบทบาทหน้าที่").
   Staff registry — summary · search · filters · table. Reuses the shared
   QueuePageShell + Table + SummaryCard + FilterTag exactly like the Consent
   registry pages, and the USERS / ROLES / DEPARTMENTS mock from usersAccess. */

const PAGE_SIZE = 10;
const breadcrumb = ['จัดการระบบ', 'รายชื่อบุคลากร'];

/* Account status → badge tone + Thai label (Figma: dot + text). */
const STATUS = {
  active:   { tone: 'green', label: 'ใช้งานอยู่' },
  pending:  { tone: 'yellow', label: 'รออนุมัติ' },
  disabled: { tone: 'grey',  label: 'ปิดใช้งาน' },
  inactive: { tone: 'grey',  label: 'ปิดใช้งาน' },
};
/* ROLES carry a `color`; ColorfulBadge has no 'brand' tone → fall back to green. */
const roleTone = (color) => (color === 'brand' ? 'green' : color || 'grey');
/* Working hours aren't in the mock — derive a sensible default per role. */
const WORK_HOURS = {
  pharmacist: 'จ–ส 08:00–20:00',
  nurse: 'เวร เช้า/บ่าย',
  admin: 'จ–ศ 08:00–17:00',
};
const workHours = (roleKey) => WORK_HOURS[roleKey] || 'จ–ศ 08:00–16:00';

const CARD_STYLE = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600)',
};
const TEXT_CELL = { color: 'var(--text-content-default)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', lineHeight: 1.5 };
const MUTED = { ...TEXT_CELL, color: 'var(--text-content-tertiary)' };

/* บุคลากร cell — avatar + name + email. */
const StaffCell = ({ user }) => (
  <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
    <span
      className='inline-flex items-center justify-center shrink-0 overflow-hidden'
      style={{ width: 36, height: 36, borderRadius: 'var(--dim-radius-full)', background: 'var(--surface-brandPrimary-quaternary)' }}
    >
      {user.avatarUrl
        ? <img src={user.avatarUrl} alt='' aria-hidden style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ color: 'var(--text-brandPrimary-default)', fontSize: 'var(--type-size-sm)' }}>{(user.name || '?').replace(/^(นพ\.|พญ\.|ภก\.|ภญ\.|น\.ส\.|นาย|นาง)/, '').trim().charAt(0)}</span>}
    </span>
    <div className='flex flex-col min-w-0'>
      <span className='truncate' style={TEXT_CELL} title={user.name}>{user.name}</span>
      <span className='truncate' style={{ ...MUTED, fontSize: 'var(--type-size-xs)' }} title={user.email}>{user.email}</span>
    </div>
  </div>
);

export default function SystemStaffPage() {
  const navigate = useHistory();
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory('mih:primarysearch-history:system-staff');

  const summary = useMemo(() => {
    const active = USERS.filter((u) => u.status === 'active').length;
    const pending = USERS.filter((u) => u.status === 'pending').length;
    const disabled = USERS.filter((u) => u.status === 'disabled' || u.status === 'inactive').length;
    return [
      { key: 'total',    icon: 'group',         color: 'info',       value: String(USERS.length), label: 'ผู้ใช้งานทั้งหมด' },
      { key: 'active',   icon: 'check_circle',   color: 'positive',   value: String(active),  label: 'ใช้งานอยู่', indicator: '+5 วันนี้' },
      { key: 'pending',  icon: 'hourglass_empty', color: 'inprogress', value: String(pending), label: 'รออนุมัติสิทธิ์', indicator: 'ต้องดำเนินการ', indicatorIcon: null },
      { key: 'disabled', icon: 'block', value: String(disabled), label: 'ปิดใช้งาน', indicatorIcon: null, tileBg: 'var(--surface-neutral-tertiary, #F4F5F5)', iconInk: 'var(--text-neutral-default, #4D5358)' },
    ];
  }, []);

  const roleOptions = useMemo(() => [{ value: '', label: 'บทบาท: ทั้งหมด' }, ...ROLES.map((r) => ({ value: r.key, label: r.label }))], []);
  const deptOptions = useMemo(() => [{ value: '', label: 'แผนก: ทั้งหมด' }, ...DEPARTMENTS.map((d) => ({ value: d.key, label: d.label }))], []);
  const statusOptions = [
    { value: '', label: 'สถานะ: ทั้งหมด' },
    { value: 'active', label: 'ใช้งานอยู่' },
    { value: 'pending', label: 'รออนุมัติ' },
    { value: 'disabled', label: 'ปิดใช้งาน' },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return USERS.filter((u) => (
      (!filterRole || u.role === filterRole)
      && (!filterDept || (u.departments || []).includes(filterDept))
      && (!filterStatus || u.status === filterStatus || (filterStatus === 'disabled' && u.status === 'inactive'))
      && (!q || u.name.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
    ));
  }, [search, filterRole, filterDept, filterStatus]);

  const handleSort = (key) => setSortConfig((p) => (p.key === key ? { key, direction: p.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }));
  const sorted = useMemo(() => {
    const { key, direction } = sortConfig;
    const sign = direction === 'desc' ? -1 : 1;
    const copy = filtered.slice();
    if (!key) return copy;
    copy.sort((a, b) => sign * String(a[key] ?? '').localeCompare(String(b[key] ?? ''), 'th'));
    return copy;
  }, [filtered, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = sorted.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, sorted.length);
  const resetFilters = () => { setFilterRole(''); setFilterDept(''); setFilterStatus(''); setPage(1); };
  const isAll = !filterRole && !filterDept && !filterStatus;
  const filtersActive = !isAll || search.trim() !== '';
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => {
      resetFilters();
      setSearch('');
    },
  );
  const handleSubmit = (v) => { const q = (v || '').trim(); if (q) pushHistory({ label: q, value: q }); setSearch(q); setPage(1); };

  const columns = useMemo(() => [
    { key: 'name', header: 'บุคลากร', sortable: true, render: (u) => <StaffCell user={u} /> },
    {
      key: 'role', header: 'บทบาท', sortable: true,
      render: (u) => { const r = getRole(u.role); return <ColorfulBadge style={roleTone(r && r.color)} size='small' hierarchy='secondary' width='hug'>{r ? r.label : u.role}</ColorfulBadge>; },
    },
    { key: 'subRole', header: 'สาขาย่อย', render: (u) => { const s = getSubRole(u.role, u.subRole); return <span style={s ? TEXT_CELL : MUTED}>{s ? s.label : '-'}</span>; } },
    { key: 'dept', header: 'แผนก', render: (u) => { const d = getDepartment((u.departments || [])[0]); return <span style={d ? TEXT_CELL : MUTED}>{d ? d.label : '-'}</span>; } },
    { key: 'hours', header: 'เวลาทำงาน', render: (u) => <span style={MUTED}>{workHours(u.role)}</span> },
    {
      key: 'status', header: 'สถานะ', sortable: true,
      render: (u) => { const s = STATUS[u.status] || STATUS.disabled; return <ColorfulBadge style={s.tone} size='small' hierarchy='secondary' width='hug' showDot>{s.label}</ColorfulBadge>; },
    },
    { key: 'action', header: '', render: (u) => <NeutralSubdueButton leadingIcon='edit' size='sm' onClick={() => navigate.push(`/system/staff/${u.id}`)}>แก้ไข</NeutralSubdueButton> },
  ], []);

  return (
    <QueuePageShell
      activeKey='system-staff'
      sidebarItems={SYSTEM_NAV}
      sidebarFallbackKey='system-staff'
      brandTitle='ระบบ PHCIS'
      breadcrumb={breadcrumb}
      title='ผู้ใช้งานและบทบาทหน้าที่'
      actions={(
        <BrandButton variant='fill' size='md' leadingIcon='add' onClick={() => navigate.push('/admin/staff/new')}>เพิ่มบุคลากร</BrandButton>
      )}
      headerInfo={(
        <section className='flex items-stretch flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
          {summary.map((c) => <SummaryCard key={c.key} card={c} variant='panel' />)}
        </section>
      )}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
        {/* search + filters */}
        <section className='w-full flex flex-col items-center' style={{ ...CARD_STYLE, gap: 'var(--dim-space-600)' }}>
          <div className='w-full flex items-start justify-center'>
            <PrimarySearch
              value={search}
              onChange={(v) => { setSearch(v); setPage(1); }}
              onSubmit={handleSubmit}
              placeholder='ค้นหาชื่อ, อีเมล, รหัสพนักงาน...'
              width={640}
              history={searchHistory}
              onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
            />
          </div>
          <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-200)' }}>
            <FilterDropdown prefix='แผนก:' options={deptOptions} value={filterDept} onChange={(v) => { setFilterDept(v); setPage(1); }} />
            <FilterDropdown prefix='บทบาท:' options={roleOptions} value={filterRole} onChange={(v) => { setFilterRole(v); setPage(1); }} />
            <FilterDropdown prefix='สถานะ:' options={statusOptions} value={filterStatus} onChange={(v) => { setFilterStatus(v); setPage(1); }} />
            <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
          </div>
        </section>

        {/* table */}
        <section className='w-full flex flex-col' style={{ ...CARD_STYLE, gap: 'var(--dim-space-400)' }}>
          <SmoothFilterResults opaque={resultsOpaque}>
          <Table
            columns={columns}
            rows={pageRows}
            rowKey={(row) => row.id}
            sortConfig={sortConfig}
            onSort={handleSort}
            stickyColCount={1}
            emptyMessage='ไม่พบบุคลากร'
            emptySubtext='ลองปรับตัวกรองหรือคำค้นหา'
            style={{ maxHeight: 604, overflow: 'auto' }}
          />
          <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-600)', paddingTop: 'var(--dim-space-400)' }}>
            <span style={{ flex: 1, color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
              แสดง {rangeStart}-{rangeEnd} จาก {sorted.length} รายการ
            </span>
            <Pagination currentPage={safePage} pageCount={totalPages} onPageChange={setPage} />
          </div>
          </SmoothFilterResults>
        </section>
      </div>
    </QueuePageShell>
  );
}
