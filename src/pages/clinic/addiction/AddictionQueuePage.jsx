import React, { useEffect, useMemo, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import useSearchHistory from '@/components/search/useSearchHistory';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import FilterDateTag from '@/components/forms/FilterDateTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import ColorfulIconBadge from '@/components/badge/ColorfulIconBadge';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Popup from '@/components/popup/Popup';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  ADDICTION_PROGRAMS,
  resolveProgram,
  getAddictionQueueRows,
  getAddictionScheduledNotArrived,
  checkInAddictionAppointment,
  cancelAddictionQueue,
  reactivateAddictionQueue,
  getAddictionQueueCancellation,
} from '@/data/addictionVisits';
import { CANCEL_REASON_SUGGESTIONS } from '@/data/addictionRegistry';
import { AddictionAccessGate, AccessDemoToggle, ProgramBadge } from '@/pages/clinic/addiction/addictionShared';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import DutyRosterAction from '@/components/patient/DutyRosterAction';
import { withEmrRowAction } from '@/components/patient/EmrRowAction';

/* AddictionQueuePage — คิวการรักษางานบำบัดสารเสพติด (TOR 1.10.5.1/1.10.5.2).
   Mirror of AncQueuePage: same QueuePageShell chrome, search + tag-filter
   row, column-header sort, sticky pager, cancel/reactivate with reason
   popup, and the "นัดแล้วยังไม่มาติดต่อ" tab whose ส่งตรวจ action moves the
   appointment into today's waiting queue (legacy HCIS worklist p.2-3).
   Patient identity shows per row; the row links to the record page whose
   sticky PatientCard completes ข้อมูลทั่วไปผู้รับบริการ (1.10.5.1). */

const breadcrumb = ['บันทึกการรักษา', 'งานบำบัดสารเสพติด'];
const SUMMARY_TITLE = 'คิวการรักษา — งานบำบัดสารเสพติด';

const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:addiction-queue';
const PAGE_SIZE = 20;

const buildTabs = (rows, scheduledCount) => [
  { key: 'all',       label: 'ทั้งหมด',              icon: 'group',           count: rows.length },
  { key: 'waiting',   label: 'รอตรวจ',               icon: 'schedule',        count: rows.filter((p) => p.statusKey === 'waiting').length },
  { key: 'progress',  label: 'กำลังบำบัด',            icon: 'assignment',      count: rows.filter((p) => p.statusKey === 'progress').length },
  { key: 'done',      label: 'บำบัดเสร็จแล้ว',        icon: 'check_circle',    count: rows.filter((p) => p.statusKey === 'done').length },
  { key: 'draft',     label: 'ที่ร่างไว้',            icon: 'save',            count: rows.filter((p) => p.statusKey === 'draft').length },
  { key: 'scheduled', label: 'นัดแล้วยังไม่มาติดต่อ', icon: 'event_available', count: scheduledCount },
];

const TAB_STATUS_FILTER = {
  waiting:  (r) => r.statusKey === 'waiting',
  progress: (r) => r.statusKey === 'progress',
  done:     (r) => r.statusKey === 'done',
  draft:    (r) => r.statusKey === 'draft',
};

const STATUS_BADGE = {
  waiting:  { style: 'blue',   label: 'รอตรวจ'         },
  progress: { style: 'orange', label: 'กำลังบำบัด'      },
  done:     { style: 'teal',   label: 'บำบัดเสร็จแล้ว' },
  draft:    { style: 'grey',   label: 'ที่ร่างไว้'      },
};

const STATUS_SORT_ORDER = { waiting: 0, progress: 1, done: 2, draft: 3 };
const PROGRAM_SORT_ORDER = { matrix: 0, methadone: 1, smoking: 2, alcohol: 3 };

const FILTER_OPTIONS = {
  program: [
    { value: 'all', label: 'ทุกโปรแกรม' },
    ...ADDICTION_PROGRAMS.map((p) => ({ value: p.value, label: p.label })),
  ],
  therapist: [{ value: 'all', label: 'ทุกคน' }],
  arrivalType: [
    { value: 'all',         label: 'ทุกประเภท' },
    { value: 'appointment', label: 'นัดหมาย' },
    { value: 'walkin',      label: 'Walk-in' },
  ],
  time: [
    { value: 'all',       label: 'ทั้งวัน'                 },
    { value: 'morning',   label: 'ช่วงเช้า (06:00–12:00)' },
    { value: 'afternoon', label: 'ช่วงบ่าย (12:00–18:00)' },
  ],
};
const FILTER_DEFAULTS = {
  program: 'all',
  therapist: 'all',
  arrivalType: 'all',
  dateValue: { quick: 'today' },
  time: 'all',
};
const DATE_CHIP_LABELS = { today: 'วันนี้', yesterday: 'เมื่อวาน' };

const renderQueue = (row) => (
  <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{row.queue}</ColorfulBadge>
);

const renderName = (row) => (
  <MaskedWorklistName
    name={row.name}
    recordKey={row.hn || row.queue}
    linkTo={{ pathname: '/clinic/addiction/record', state: { hn: row.hn, queue: row.queue, name: row.name } }}
  />
);

const renderTelemedicine = (row) => (
  row.telemedicine ? <ColorfulIconBadge style='blue' size='medium' fill='default' icon='videocam' /> : null
);

const queueRowToSearchItem = (row) => ({
  id: row.hn,
  label: row.name,
  sublabel: resolveProgram(row.program)?.label || row.therapist,
  value: row.name,
  badges: [
    { label: row.queue, tone: 'teal' },
    { label: row.hn, tone: 'indigo' },
  ],
  avatarSrc: getPatientByHN(row.hn)?.avatarUrl,
});

const AddictionQueuePage = () => {
  const history = useHistory();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  /* Bumped after cancel / reactivate / check-in / access-toggle — those are
     sessionStorage writes, not React state, so nothing else re-renders. */
  const [tick, setTick] = useState(0);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: [] });

  const setFilter = (key) => (val) => setFilters((f) => ({ ...f, [key]: val }));
  const isAllDefault =
    filters.program === FILTER_DEFAULTS.program &&
    filters.therapist === FILTER_DEFAULTS.therapist &&
    filters.arrivalType === FILTER_DEFAULTS.arrivalType &&
    filters.dateValue.quick === FILTER_DEFAULTS.dateValue.quick &&
    filters.time === FILTER_DEFAULTS.time;

  const filtersActive = !isAllDefault || searchQ.trim() !== '';
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(filtersActive, () => {
    setFilters(FILTER_DEFAULTS);
    setSearchQ('');
    setPage(1);
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => getAddictionQueueRows(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scheduledNotArrived = useMemo(() => getAddictionScheduledNotArrived(), [tick]);
  const tabs = useMemo(() => buildTabs(rows, scheduledNotArrived.length), [rows, scheduledNotArrived]);

  const therapistOptions = useMemo(() => ([
    { value: 'all', label: 'ทุกคน' },
    ...Array.from(new Set(rows.map((r) => r.therapist))).map((t) => ({ value: t, label: t })),
  ]), [rows]);

  const handleCheckIn = (hn) => {
    checkInAddictionAppointment(hn);
    setTick((t) => t + 1);
    setActiveTab('waiting');
  };

  const summaryCards = useMemo(() => ([
    { key: 'total',    label: 'คิวทั้งหมดวันนี้',  value: rows.length, color: 'info', icon: 'directions_walk' },
    { key: 'waiting',  label: 'รอตรวจ',            value: rows.filter((p) => p.statusKey === 'waiting').length, color: 'info', icon: 'schedule' },
    { key: 'progress', label: 'กำลังบำบัด',        value: rows.filter((p) => p.statusKey === 'progress').length, color: 'warning', icon: 'assignment' },
    { key: 'done',     label: 'บำบัดเสร็จแล้ว',    value: rows.filter((p) => p.statusKey === 'done').length, color: 'positive', icon: 'check_circle' },
  ]), [rows]);

  const filtered = useMemo(() => {
    if (activeTab === 'scheduled') return [];
    let result = rows;
    const tabPred = TAB_STATUS_FILTER[activeTab];
    if (tabPred) result = result.filter(tabPred);
    if (filters.program !== 'all') result = result.filter((r) => r.program === filters.program);
    if (filters.therapist !== 'all') result = result.filter((r) => r.therapist === filters.therapist);
    if (filters.arrivalType !== 'all') result = result.filter((r) => r.arrivalType === filters.arrivalType);
    /* date / time chips are visual placeholders — queue rows carry no
       visit-date field yet (same as OPD/ANC queue pages). */
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      result = result.filter((row) =>
        [row.queue, row.hn, row.name, row.therapist, resolveProgram(row.program)?.label]
          .some((f) => f && f.toLowerCase().includes(q)),
      );
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filters, searchQ, tick]);

  const sortedRows = useMemo(() => {
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    const arrivalCompare = (a, b) => String(a.queue).localeCompare(String(b.queue));
    if (!sortConfig.key) return [...filtered].sort(arrivalCompare);

    const NUMERIC_KEYS = ['status', 'program', 'sessionNo', 'wait'];
    const normalize = (row, key) => {
      switch (key) {
        case 'status':    return STATUS_SORT_ORDER[row.statusKey] ?? 99;
        case 'program':   return PROGRAM_SORT_ORDER[row.program] ?? 99;
        case 'sessionNo': return row.sessionNo ?? 0;
        case 'wait':      return row.waitMinutes ?? 0;
        default:          return row[key] ?? '';
      }
    };
    const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
    return [...filtered].sort((a, b) => {
      const av = normalize(a, sortConfig.key);
      const bv = normalize(b, sortConfig.key);
      const primary = NUMERIC_KEYS.includes(sortConfig.key)
        ? Number(av) - Number(bv)
        : collator.compare(String(av), String(bv));
      if (primary !== 0) return sign * primary;
      return arrivalCompare(a, b);
    });
  }, [filtered, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => (prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' }));
  };

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const pageRows = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = sortedRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, sortedRows.length);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleTabChange = (key) => {
    setActiveTab(key);
    setPage(1);
  };

  const handleRowClick = (row) => history.push({
    pathname: '/clinic/addiction/record',
    state: { hn: row.hn, queue: row.queue, name: row.name },
  });

  const resolveSearchRow = (query, item) => {
    if (item?.id) {
      const byId = rows.find((row) => row.hn === item.id);
      if (byId) return byId;
    }
    const q = (query ?? item?.value ?? item?.label ?? '').toString().trim().toLowerCase();
    if (!q) return null;
    return rows.find((row) =>
      [row.queue, row.hn, row.name, row.therapist].some((f) => f && f.toLowerCase().includes(q)),
    ) ?? null;
  };

  const searchSuggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    const matches = [];
    const seen = new Set();
    for (const row of rows) {
      if (matches.length >= 8) break;
      if (seen.has(row.hn)) continue;
      if ([row.queue, row.hn, row.name, row.therapist].some((f) => f && f.toLowerCase().includes(q))) {
        seen.add(row.hn);
        matches.push(queueRowToSearchItem(row));
      }
    }
    return matches;
  }, [searchQ, rows]);

  const searchAvatars = useMemo(() => {
    const result = [];
    const seenHn = new Set();
    for (const entry of searchHistory) {
      if (result.length >= 3) break;
      const q = (typeof entry === 'string' ? entry : (entry?.value ?? entry?.label ?? '')).toString().trim().toLowerCase();
      const match = entry?.id
        ? rows.find((row) => row.hn === entry.id)
        : rows.find((row) => [row.queue, row.hn, row.name, row.therapist].some((f) => f && f.toLowerCase().includes(q)));
      if (!match || seenHn.has(match.hn)) continue;
      const src = getPatientByHN(match.hn)?.avatarUrl;
      if (!src) continue;
      seenHn.add(match.hn);
      result.push({ src });
    }
    return result;
  }, [searchHistory, rows]);

  const openCancelPopup = (row) => {
    setCancelReason('');
    setCancelTarget(row);
  };
  const confirmCancel = () => {
    if (!cancelReason.trim()) return;
    cancelAddictionQueue(cancelTarget.hn, cancelReason.trim());
    setCancelTarget(null);
    setTick((t) => t + 1);
  };
  const reactivate = (row) => {
    reactivateAddictionQueue(row.hn);
    setTick((t) => t + 1);
  };

  const renderStatus = (row) => {
    const cancellation = getAddictionQueueCancellation(row.hn);
    if (cancellation) {
      return <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกคิวแล้ว</ColorfulBadge>;
    }
    const badge = STATUS_BADGE[row.statusKey] || STATUS_BADGE.waiting;
    return <ColorfulBadge style={badge.style} size='small' hierarchy='secondary'>{badge.label}</ColorfulBadge>;
  };

  const renderActions = (row) => {
    const cancellation = getAddictionQueueCancellation(row.hn);
    return cancellation ? (
      <BrandSubdueButton
        variant='outline'
        size='sm'
        leadingIcon='restart_alt'
        onClick={(e) => { e.stopPropagation(); reactivate(row); }}
      >
        เปิดใช้งานคิว
      </BrandSubdueButton>
    ) : (
      <NeutralSubdueButton
        size='sm'
        leadingIcon='block'
        onClick={(e) => { e.stopPropagation(); openCancelPopup(row); }}
      >
        ยกเลิกคิว
      </NeutralSubdueButton>
    );
  };

  const columns = useMemo(() => ([
    { key: 'queue',     label: 'คิว',  render: renderQueue },
    { key: 'hn',        label: 'HN'  },
    { key: 'name',      label: 'ชื่อ-นามสกุล',   flex: true, minWidth: 160, render: renderName },
    { key: 'program',   label: 'โปรแกรมบำบัด', render: (r) => <ProgramBadge program={r.program} /> },
    { key: 'sessionNo', label: 'ครั้งที่บำบัด', render: (r) => `ครั้งที่ ${r.sessionNo}` },
    { key: 'telemed',   label: 'Telemedicine', align: 'center', sortable: false, render: renderTelemedicine },
    { key: 'room',      label: 'ห้อง' },
    { key: 'therapist', label: 'ผู้บำบัด',       flex: true, minWidth: 150 },
    { key: 'wait',      label: 'รอนาน',  render: (r) => (r.waitMinutes ? `${r.waitMinutes} นาที` : '—') },
    { key: 'status',    label: 'สถานะ', render: renderStatus },
    { key: 'actions',   label: 'การดำเนินการ', sortable: false, render: withEmrRowAction(renderActions) },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [tick]);

  /* "นัดแล้วยังไม่มาติดต่อ" — appointment-shaped rows + ส่งตรวจ check-in. */
  const scheduledColumns = useMemo(() => ([
    { key: 'appointmentTime', label: 'เวลานัด' },
    { key: 'hn',              label: 'HN' },
    { key: 'name',            label: 'ชื่อ-นามสกุล',  flex: true, minWidth: 160 },
    { key: 'program',         label: 'โปรแกรมบำบัด', render: (r) => <ProgramBadge program={r.program} /> },
    { key: 'sessionNo',       label: 'ครั้งที่บำบัด', render: (r) => `ครั้งที่ ${r.sessionNo}` },
    { key: 'clinic',          label: 'คลินิก' },
    { key: 'therapist',       label: 'ผู้บำบัด',      flex: true, minWidth: 150 },
    {
      key: 'checkin', label: 'การดำเนินการ', sortable: false,
      render: (row) => (
        <BrandSubdueButton variant='fill' size='sm' leadingIcon='login' onClick={(e) => { e.stopPropagation(); handleCheckIn(row.hn); }}>
          ส่งตรวจ
        </BrandSubdueButton>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), []);

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      /* ทุก worklist ของบันทึกการรักษามีปุ่มนี้ (มติผู้ใช้ 28 ส.ค. 69) */
      leadingActions={<DutyRosterAction />}
      title='คลินิกบำบัดสารเสพติด'
      /* Sidebar only carries /clinic/addiction — these three actions are the
         ONLY way into the registry / follow-up / community screens. */
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <BrandSubdueButton
            variant='outline'
            leadingIcon='contact_page'
            onClick={() => history.push('/clinic/addiction/registry')}
          >
            ทะเบียนผู้ติดสารเสพติด
          </BrandSubdueButton>
          <BrandSubdueButton
            variant='outline'
            leadingIcon='monitoring'
            onClick={() => history.push('/clinic/addiction/follow-up')}
          >
            ติดตามการดูแล
          </BrandSubdueButton>
          <BrandSubdueButton
            variant='outline'
            leadingIcon='diversity_3'
            onClick={() => history.push('/clinic/addiction/community')}
          >
            CBTx &amp; HR ชุมชน
          </BrandSubdueButton>
        </div>
      )}
      summaryTitle={SUMMARY_TITLE}
      summaryCards={summaryCards}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      /* แท็บ "นัดล่วงหน้า" — shell เป็นคนเติมแท็บและวาดเนื้อหา */
      upcoming={{ depts: ['สุขภาพจิต'] }}
    >
      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title='ยกเลิกคิวการบำบัด'
        subtitle={cancelTarget ? `${cancelTarget.name} · HN: ${cancelTarget.hn}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันยกเลิกคิว', onClick: confirmCancel, tone: 'danger' }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
          <SuggestibleTextarea
            label='เหตุผลการยกเลิก'
            required
            voice
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            suggestions={CANCEL_REASON_SUGGESTIONS}
            minChars={2}
            placeholder='เช่น ผู้ป่วยแจ้งเลื่อนนัด / บันทึกคิวซ้ำ'
          />
          {!cancelReason.trim() && (
            <span style={{ color: 'var(--text-content-tertiary, #858C92)', fontSize: 'var(--type-size-xs)' }}>
              ต้องระบุเหตุผล — ระบบบันทึกผู้ยกเลิกและเวลาโดยอัตโนมัติ
            </span>
          )}
        </div>
      </Popup>

      <AddictionAccessGate>
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-600)' }}>
        <div
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
          <div className='w-full flex items-start justify-between' style={{ gap: 'var(--dim-space-300)' }}>
            <div className='flex-1 flex items-start justify-center'>
              <PrimarySearch
                value={searchQ}
                onChange={setSearchQ}
                onSubmit={(label, item) => {
                  setSearchQ(label);
                  const match = resolveSearchRow(label, item);
                  pushHistory(match ? queueRowToSearchItem(match) : (item ?? label));
                  if (match) handleRowClick(match);
                }}
                suggestions={searchSuggestions}
                history={searchHistory}
                onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
                placeholder='ค้นหาคิว / HN / ชื่อ-สกุลผู้รับบริการ / ผู้บำบัด'
                width={640}
                avatars={searchAvatars}
              />
            </div>
            <AccessDemoToggle onRevoked={() => setTick((t) => t + 1)} />
          </div>

          <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
              <FilterDropdown prefix='โปรแกรม:' options={FILTER_OPTIONS.program} value={filters.program} onChange={setFilter('program')} />
              <FilterDropdown prefix='ผู้บำบัด:' options={therapistOptions} value={filters.therapist} onChange={setFilter('therapist')} />
              <FilterDropdown prefix='การมา:' options={FILTER_OPTIONS.arrivalType} value={filters.arrivalType} onChange={setFilter('arrivalType')} />
              <FilterDateTag
                prefix='วัน:'
                value={filters.dateValue}
                onChange={setFilter('dateValue')}
                defaultQuick={FILTER_DEFAULTS.dateValue.quick}
                quickLabels={DATE_CHIP_LABELS}
              />
              <FilterDropdown prefix='เวลา:' options={FILTER_OPTIONS.time} value={filters.time} onChange={setFilter('time')} />
            <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
            </OverflowFlexRow>
          </div>

          {activeTab === 'scheduled' ? (
            <Table
              columns={scheduledColumns}
              rows={scheduledNotArrived}
              rowKey={(row) => row.hn}
              emptyMessage='ไม่มีนัดหมายที่ยังไม่มาติดต่อวันนี้'
            />
          ) : (
            <>
            <SmoothFilterResults opaque={resultsOpaque}>
              <SearchResultCount found={sortedRows.length} total={rows.length} />
              <Table
                columns={columns}
                rows={pageRows}
                rowKey={(row) => row.hn}
                sortConfig={sortConfig}
                onSort={handleSort}
                onRowClick={handleRowClick}
                stickyColCount={3}
                stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                emptyMessage={searchQ.trim() ? 'ไม่พบรายการที่ตรงกับคำค้นหา' : 'ยังไม่มีคิวผู้รับบริการวันนี้'}
              />

              <div
                className='flex items-center w-full'
                style={{
                  gap: 'var(--dim-space-200)',
                  position: 'sticky',
                  bottom: 'var(--dim-space-0)',
                  zIndex: 50,
                  background: 'var(--surface-card-100)',
                  paddingTop: 'var(--dim-space-200)',
                  borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                }}
              >
                <span style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
                  {`แสดง ${rangeStart}–${rangeEnd} จาก ${sortedRows.length} รายการ`}
                </span>
                <div className='flex-1' />
                <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
              </div>
            </SmoothFilterResults>
            </>
          )}
        </div>
      </div>
      </AddictionAccessGate>
    </QueuePageShell>
  );
};

export default AddictionQueuePage;
