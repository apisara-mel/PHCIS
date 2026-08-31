import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import TabUnderline from '@/components/tab/TabUnderline';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import StaffProfileAvatar from '@/components/appointment/StaffProfileAvatar';
import Header from '@/components/layout/Header';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import { staffProfileSearchSrc } from '../appointment/appointmentStaffProfile';
import { staffBadgeTone } from '../appointment/appointmentStaffRoster';
import ScheduleSidebar from './ScheduleSidebar';
import ScheduleFooter from './ScheduleFooter';
import FacilityHolidayPopup from './FacilityHolidayPopup';
import {
  STATUS_TABS,
  SCHEDULE_STATUS_META,
  buildScheduleStaff,
} from './scheduleStaff';

/* MIH · ระบบจัดการตารางเวร — Page A: staff roster (Figma 16:52625).
   Top-level system, sibling of PHCIS · no PhcisChrome (lightweight shell). */

const PAGE_SIZE = 10;

const TEXT_CELL = {
  color: 'var(--text-neutral-default, #4D5358)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm, 14px)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.5,
};

const StaffBadge = ({ label }) => {
  if (!label || label === '—') return <span style={TEXT_CELL}>—</span>;
  return (
    <ColorfulBadge style={staffBadgeTone(label)} size='small' hierarchy='secondary' width='hug'>
      {label}
    </ColorfulBadge>
  );
};

const StatusBadge = ({ scheduleStatus }) => {
  const meta = SCHEDULE_STATUS_META[scheduleStatus];
  if (!meta) return <span style={TEXT_CELL}>—</span>;
  return (
    <ColorfulBadge style={meta.tone} size='small' hierarchy='secondary' width='hug'>
      {meta.label}
    </ColorfulBadge>
  );
};

const COLUMNS = [
  {
    key: 'name',
    header: 'ชื่อ-นามสกุล',
    flex: true,
    minWidth: 220,
    sortable: true,
    render: (row) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dim-space-150, 6px)', minWidth: 0 }}>
        <StaffProfileAvatar staff={row} size={36} />
        <span style={{ ...TEXT_CELL, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.name}
        </span>
      </div>
    ),
  },
  {
    key: 'groupPolicyLabel',
    header: 'กิจกรรม',
    sortable: true,
    render: (row) => <StaffBadge label={row.groupPolicyLabel || row.groupPolicy} />,
  },
  {
    key: 'subDivision',
    header: 'สายย่อย',
    sortable: true,
    render: (row) => <StaffBadge label={row.subDivision} />,
  },
  {
    key: 'dept',
    header: 'แผนก',
    sortable: true,
    render: (row) => <StaffBadge label={row.dept} />,
  },
  {
    key: 'scheduleStatus',
    header: 'สถานะ',
    sortable: true,
    render: (row) => <StatusBadge scheduleStatus={row.scheduleStatus} />,
  },
];

const SchedulePage = () => {
  const history = useHistory();
  /* เปิดหน้ามาที่ "รอจัดตารางเวร" ซึ่งเป็นแท็บแรกและเป็นกองงานที่ต้องทำ
     (มติผู้ใช้ 31 ส.ค. 69) — ของเดิมเปิดมาที่ "ทั้งหมด" ซึ่งเป็นมุมมองภาพรวม */
  const [activeTab, setActiveTab] = useState('pending');
  const [page, setPage] = useState(1);
  /* Search state — text query (free-form) + persisted history (LRU stored in
     localStorage under a page-scoped key, so recent terms surface across
     reloads but don't bleed into other staff lists). */
  const [search, setSearch] = useState('');
  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory('mih:primarysearch-history:schedule-staff');
  /* Sort state per Figma 16:51201 — each column header carries a sort icon.
     First click → asc, second → desc, then cycle. */
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [holidayOpen, setHolidayOpen] = useState(false);

  const allRows = useMemo(() => buildScheduleStaff(), []);

  /* Quick-search avatar stack on the right of the PrimarySearch field —
     three staff portraits per Figma 16:51201. Memoized off allRows so the
     stack stays stable across re-renders. */
  const searchAvatars = useMemo(
    () => allRows
      .map(s => staffProfileSearchSrc(s))
      .filter(Boolean)
      .slice(0, 3)
      .map(src => ({ src })),
    [allRows],
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter(r => {
      if (activeTab !== 'all' && r.scheduleStatus !== activeTab) return false;
      if (q) {
        const inThai = r.name?.toLowerCase().includes(q);
        const inEn = (r.nameEn || '').toLowerCase().includes(q);
        if (!inThai && !inEn) return false;
      }
      return true;
    });
  }, [allRows, activeTab, search]);

  /* Sorted view — locale-aware Thai sort. Stable when key is null. */
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
    setSortConfig(prev => prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' });
    setPage(1);
  };

  /* Search change — fires on every keystroke (PrimarySearch is a controlled
     input). Reset to page 1 so results aren't hidden on later pages. */
  const onSearchChange = (val) => { setSearch(val); setPage(1); };

  /* Search submit — fires on Enter / submit. Pushes non-empty trimmed query
     into the LRU history so the user can re-select it later. */
  const onSearchSubmit = (val) => {
    const q = (val || '').trim();
    if (q) pushHistory({ label: q, value: q });
    setSearch(q);
    setPage(1);
  };

  return (
    <ClinicFilterProvider>
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        /* Page background per Figma 16:52625 — brand-tinted screen (#F4FBF8),
           not neutral gray. Aliases --brand-p50. */
        background: 'var(--background-screen-brand-100, var(--brand-p50, #F4FBF8))',
        fontFamily: 'var(--type-family-body)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        boxSizing: 'border-box',
      }}
    >
      {/* Slim sidebar — Figma Schedule-Management 15:3758. */}
      <ScheduleSidebar activeKey='schedule' />

      {/* Right column: header + subheader + content */}
      <div
        style={{
          flex: '1 1 auto',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
        }}
      >
        {/* Top header bar — shared PHCIS Header with scroll auto-hide. */}
        <Header
          brandTitle='ระบบจัดตารางเวร'
          breadcrumb={['จัดการตารางเวร']}
          standalone={false}
        />

        {/* Subheader — Figma 16:52474 · page title + tab bar on white panel.
            Tabs live HERE (not inside the table card) per Figma. */}
        <div
          style={{
            background: 'var(--surface-card-100, #FFFFFF)',
            borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
            boxShadow: 'var(--shadow-brand-drop-bottom-100, 0 1px 2px rgba(8,167,104,0.08))',
            padding: 'var(--dim-space-400, 16px) var(--dim-space-600, 24px) 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--dim-space-400, 16px)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--dim-space-400, 16px)',
            }}
          >
            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
                fontSize: 'var(--type-size-base, 16px)',
                fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                lineHeight: 1.5,
                color: 'var(--text-topic-tertiary-title, #363B3F)',
              }}
            >
              จัดการตารางเวร
            </h1>
            <BrandSubdueButton
              variant='outline'
              size='lg'
              leadingIcon='event_busy'
              onClick={() => setHolidayOpen(true)}
            >
              ตั้งค่าวันหยุดสถานพยาบาล
            </BrandSubdueButton>
          </div>

          {/* Shared TabUnderline (Figma 16:52474) — sliding ink-bar +
              hover/press transforms + scaleX-from-centre underline anim.
              Same component as queue pages (TreatmentQueue, etc.) so
              motion + tokens stay consistent across systems. */}
          <TabUnderline
            tabs={STATUS_TABS}
            value={activeTab}
            onChange={onSwitchTab}
          />
        </div>

        {/* Page content area */}
        <main
          style={{
            flex: '1 1 auto',
            minWidth: 0,
            padding: 'var(--dim-space-600, 24px)',
          }}
        >
        {/* Card per Figma 16:51201 — surface-card-100 · radius-500 (16px) ·
            brand drop shadow · NO border · padding-600 · gap-600 flex col. */}
        <section
          style={{
            background: 'var(--surface-card-100, #FFFFFF)',
            borderRadius: 'var(--dim-radius-500, 16px)',
            boxShadow: 'var(--shadow-brand-drop-bottom-200, 0 1px 4px rgba(8,167,104,0.10), 0 1px 2px rgba(8,167,104,0.08))',
            padding: 'var(--dim-space-600, 24px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--dim-space-600, 24px)',
            alignItems: 'stretch',
          }}
        >
          {/* PrimarySearch — Figma 16:51201 search field. Brand-green
              focus ring + quick-access avatar stack on the right. History
              persists in localStorage under page-scoped key. */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <PrimarySearch
              value={search}
              onChange={onSearchChange}
              onSubmit={onSearchSubmit}
              placeholder='ค้นหา ชื่อ-สกุล บุคลากร'
              width={640}
              history={searchHistory}
              onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
              avatars={searchAvatars}
            />
          </div>

          {/* Table — sortable headers per Figma 16:51201. Row click → editor. */}
          <Table
            columns={COLUMNS}
            rows={pageRows}
            maxHeight={604}
            sortConfig={sortConfig}
            onSort={onSort}
            onRowClick={(row) => history.push(`/schedule/${row.id}`)}
          />

          {/* Pagination footer — gap provides separation, no border needed. */}
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
                color: 'var(--text-content-secondary, #565D6D)',
              }}
            >
              แสดง {pageStart}–{pageEnd} จาก {filteredRows.length} รายการ
            </span>
            <Pagination
              currentPage={page}
              pageCount={totalPages}
              onPageChange={setPage}
            />
          </div>
        </section>
        </main>

        {/* Footer — Figma 16:54432 "no BTN" variant. List page has no
            save/cancel actions, so only the legal row is shown. */}
        <ScheduleFooter />
      </div>

      <FacilityHolidayPopup
        open={holidayOpen}
        onClose={() => setHolidayOpen(false)}
      />
    </div>
    </ClinicFilterProvider>
  );
};

export default SchedulePage;
