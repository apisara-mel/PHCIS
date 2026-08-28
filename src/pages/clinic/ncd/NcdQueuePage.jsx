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
import { getPatientByHN } from '@/data/patientProfiles';
/* IMPORT-ONLY: the /appointment system's public store. Subscribing (never
   polling — React 17, so no useSyncExternalStore) keeps this worklist in
   step when a booking is made or cancelled elsewhere in the SPA. */
import { subscribeExtraAppointments } from '@/pages/appointment/appointmentExtraStore';
import {
  NCD_DISEASE_GROUPS,
  resolveNcdGroup,
  NCD_DOCTOR_OPTIONS,
  getNcdQueueRows,
  getNcdScheduledNotArrived,
  checkInNcdAppointment,
  getNcdCancellation,
} from '@/data/ncdVisits';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import { withDoctorAvatars } from '@/pages/appointment/appointmentDoctorRoster';
import DutyRosterAction from '@/components/patient/DutyRosterAction';
import { withEmrRowAction } from '@/components/patient/EmrRowAction';

/* NcdQueuePage — คิวการรักษากลุ่มโรคเฉพาะ NCD (เบาหวาน/ความดัน/หอบหืด/
   ถุงลมโป่งพอง), TOR 1.10.2.1 + 1.10.2.2. Mirrors AncQueuePage (the §1.10.x
   clinic prototype — playbook §3) verbatim in mechanics: PrimarySearch +
   history, tag-filter row, column-header sort, "แสดง X–Y จาก Z รายการ"
   pagination, and the separate "นัดแล้วยังไม่มาติดต่อ" tab whose ส่งตรวจ
   check-in moves the appointment into รอตรวจ via sessionStorage + tick.
   ANC's G-P / gestational-age / risk columns swap for the NCD disease-group
   badge column (DM · HT · Asthma · COPD) and the Telemedicine videocam
   marker. Registry ยกเลิก state (from NcdRegistryPage) is FLAGGED on the
   row — not hidden — so front-desk staff see cancelled registrations before
   routing the patient (spec edge case). */

const breadcrumb = ['บันทึกการรักษา', 'งานกลุ่มโรคเฉพาะ NCD'];
const SUMMARY_TITLE = 'คิวกลุ่มโรคเฉพาะ NCD';

const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:ncd-queue';
const PAGE_SIZE = 20;

const buildTabs = (rows, scheduledCount) => [
  { key: 'all',       label: 'ทั้งหมด',              icon: 'group',           count: rows.length },
  { key: 'waiting',   label: 'รอตรวจ',               icon: 'schedule',        count: rows.filter((p) => p.statusKey === 'waiting').length },
  { key: 'progress',  label: 'กำลังตรวจ',            icon: 'assignment',      count: rows.filter((p) => p.statusKey === 'progress').length },
  { key: 'done',      label: 'ตรวจเสร็จแล้ว',        icon: 'check_circle',    count: rows.filter((p) => p.statusKey === 'done').length },
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
  waiting:  { style: 'blue',   label: 'รอตรวจ'        },
  progress: { style: 'orange', label: 'ตรวจอยู่'      },
  done:     { style: 'teal',   label: 'ตรวจเสร็จแล้ว' },
  draft:    { style: 'grey',   label: 'ที่ร่างไว้'    },
};

const STATUS_SORT_ORDER = { waiting: 0, progress: 1, done: 2, draft: 3 };
const GROUP_SORT_ORDER = { dm: 0, ht: 1, asthma: 2, copd: 3 };

const FILTER_OPTIONS = {
  group: [
    { value: 'all', label: 'ทุกกลุ่มโรค' },
    ...NCD_DISEASE_GROUPS.map((g) => ({ value: g.key, label: `${g.label} (${g.short})` })),
  ],
  doctor: [
    { value: 'all', label: 'ทุกคน' },
    ...NCD_DOCTOR_OPTIONS.map((d) => ({ value: d, label: d })),
  ],
  visitType: [
    { value: 'all',      label: 'ทุกประเภท' },
    { value: 'first',    label: 'ขึ้นทะเบียนครั้งแรก' },
    { value: 'followup', label: 'ตรวจติดตาม' },
  ],
  time: [
    { value: 'all',       label: 'ทั้งวัน'                 },
    { value: 'morning',   label: 'ช่วงเช้า (06:00–12:00)'  },
    { value: 'afternoon', label: 'ช่วงบ่าย (12:00–18:00)'  },
    { value: 'evening',   label: 'ช่วงเย็น (18:00–24:00)'  },
  ],
};
const FILTER_DEFAULTS = {
  group: 'all',
  doctor: 'all',
  visitType: 'all',
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
    linkTo={{ pathname: '/clinic/ncd/record', state: { hn: row.hn, queue: row.queue, name: row.name } }}
  />
);

const renderGroups = (row) => (
  <span className='inline-flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100)' }}>
    {(row.diseaseGroups || []).map((key) => {
      const g = resolveNcdGroup(key);
      return g ? (
        <ColorfulBadge key={key} style={g.badge} size='small' hierarchy='secondary'>{g.short}</ColorfulBadge>
      ) : null;
    })}
  </span>
);

const renderTelemedicine = (row) => (
  row.telemedicine ? <ColorfulIconBadge style='blue' size='medium' fill='default' icon='videocam' /> : null
);

/* Search suggestion carries the TOR 1.10.2.1 identity set (เพศ อายุ
   บัตรประชาชน สิทธิ) in its sublabel so the clinician can confirm the
   right person before opening the record — PatientCard then shows the
   full set on NcdFormPage. */
const queueRowToSearchItem = (row) => {
  const profile = getPatientByHN(row.hn);
  const identity = profile
    ? [profile.sex, profile.age, profile.nationalId, profile.insurance].filter(Boolean).join(' · ')
    : row.doctor;
  return {
    id: row.hn,
    label: row.name,
    sublabel: identity,
    value: row.name,
    badges: [
      { label: row.queue || 'นัดหมาย', tone: 'teal' },
      { label: row.hn, tone: 'indigo' },
    ],
    avatarSrc: profile?.avatarUrl,
  };
};

const NcdQueuePage = () => {
  const history = useHistory();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  /* Bumped after check-in — sessionStorage writes are synchronous but not
     React state, so nothing else re-derives the rows (AncQueuePage contract,
     spec edge case "sessionStorage-derived state must bump a tick"). */
  const [tick, setTick] = useState(0);

  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: [] });

  const setFilter = (key) => (val) => setFilters((f) => ({ ...f, [key]: val }));
  const isAllDefault =
    filters.group === FILTER_DEFAULTS.group &&
    filters.doctor === FILTER_DEFAULTS.doctor &&
    filters.visitType === FILTER_DEFAULTS.visitType &&
    filters.dateValue.quick === FILTER_DEFAULTS.dateValue.quick &&
    filters.time === FILTER_DEFAULTS.time;

  const filtersActive = !isAllDefault || searchQ.trim() !== '';
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(filtersActive, () => {
    setFilters(FILTER_DEFAULTS);
    setSearchQ('');
    setPage(1);
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => getNcdQueueRows(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scheduledNotArrived = useMemo(() => getNcdScheduledNotArrived(), [tick]);
  const tabs = useMemo(() => buildTabs(rows, scheduledNotArrived.length), [rows, scheduledNotArrived]);

  /* E4 — a follow-up booked from the record lands in "นัดแล้วยังไม่มาติดต่อ"
     as soon as the /appointment store notifies, closing the
     จอง → มาถึง → ส่งตรวจ loop without leaving the module. */
  useEffect(() => subscribeExtraAppointments(() => setTick((t) => t + 1)), []);

  const handleCheckIn = (hn) => {
    checkInNcdAppointment(hn);
    setTick((t) => t + 1);
    setActiveTab('waiting');
  };

  const groupCount = (key) => rows.filter((p) => (p.diseaseGroups || []).includes(key)).length;
  const summaryCards = useMemo(() => ([
    { key: 'total',  label: 'คิว NCD วันนี้',           value: rows.length,                 color: 'info',        icon: 'directions_walk' },
    { key: 'dm',     label: 'เบาหวาน (DM)',             value: groupCount('dm'),            color: 'brand',       icon: 'water_drop' },
    { key: 'ht',     label: 'ความดันโลหิตสูง (HT)',      value: groupCount('ht'),            color: 'inprogress',  icon: 'monitor_heart' },
    { key: 'resp',   label: 'หอบหืด / ถุงลมโป่งพอง',    value: groupCount('asthma') + groupCount('copd'), color: 'positive', icon: 'pulmonology' },
    { key: 'rights', label: 'สิทธิต้องตรวจสอบ',         value: rows.filter((p) => p.rightsExpired).length, color: 'destructive', icon: 'shield_question' },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [rows]);

  const filtered = useMemo(() => {
    if (activeTab === 'scheduled') return [];
    let result = rows;
    const tabPred = TAB_STATUS_FILTER[activeTab];
    if (tabPred) result = result.filter(tabPred);
    if (filters.group !== 'all') result = result.filter((r) => (r.diseaseGroups || []).includes(filters.group));
    if (filters.doctor !== 'all') result = result.filter((r) => r.doctor === filters.doctor);
    if (filters.visitType !== 'all') result = result.filter((r) => r.visitType === filters.visitType);
    /* date / time are visual placeholders — rows have no visit-date field
       yet (same note as OPD/ANC queue pages). */
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      result = result.filter((row) =>
        [row.queue, row.hn, row.name, row.doctor].some((f) => f && f.toLowerCase().includes(q)),
      );
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filters, searchQ, tick]);

  const sortedRows = useMemo(() => {
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    const arrivalCompare = (a, b) => String(a.queue).localeCompare(String(b.queue));
    if (!sortConfig.key) return [...filtered].sort(arrivalCompare);

    const NUMERIC_KEYS = ['status', 'group', 'wait'];
    const normalize = (row, key) => {
      switch (key) {
        case 'status': return STATUS_SORT_ORDER[row.statusKey] ?? 99;
        case 'group':  return GROUP_SORT_ORDER[(row.diseaseGroups || [])[0]] ?? 99;
        case 'wait':   return row.waitMinutes ?? 0;
        default:       return row[key] ?? '';
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

  /* Snap page back into range when filtering shrinks the result (ANC
     pagination contract — spec edge case). */
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleTabChange = (key) => {
    setActiveTab(key);
    setPage(1);
  };

  const handleRowClick = (row) => history.push({
    pathname: '/clinic/ncd/record',
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
      [row.queue, row.hn, row.name, row.doctor].some((f) => f && f.toLowerCase().includes(q)),
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
      if ([row.queue, row.hn, row.name, row.doctor].some((f) => f && f.toLowerCase().includes(q))) {
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
        : rows.find((row) => [row.queue, row.hn, row.name, row.doctor].some((f) => f && f.toLowerCase().includes(q)));
      if (!match || seenHn.has(match.hn)) continue;
      const src = getPatientByHN(match.hn)?.avatarUrl;
      if (!src) continue;
      seenHn.add(match.hn);
      result.push({ src });
    }
    return result;
  }, [searchHistory, rows]);

  /* Cancelled-registry rows stay visible with a red flag NEXT TO the visit
     status (not replacing it) — staff can still see where the patient is in
     today's flow while the registration state screams for attention. */
  const renderStatus = (row) => {
    const cancellation = getNcdCancellation(row.hn);
    const badge = STATUS_BADGE[row.statusKey] || STATUS_BADGE.waiting;
    return (
      <span className='inline-flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100)' }}>
        <ColorfulBadge style={badge.style} size='small' hierarchy='secondary'>{badge.label}</ColorfulBadge>
        {cancellation && (
          <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกทะเบียนแล้ว</ColorfulBadge>
        )}
      </span>
    );
  };

  const renderActions = (row) => (
    <NeutralSubdueButton
      size='sm'
      leadingIcon='monitoring'
      onClick={(e) => {
        e.stopPropagation();
        history.push({ pathname: '/clinic/ncd/followup', state: { hn: row.hn } });
      }}
    >
      การติดตาม
    </NeutralSubdueButton>
  );

  const columns = useMemo(() => ([
    { key: 'queue',   label: 'คิว',  render: renderQueue },
    { key: 'hn',      label: 'HN' },
    { key: 'name',    label: 'ชื่อ-นามสกุล',   flex: true, minWidth: 160, render: renderName },
    { key: 'group',   label: 'กลุ่มโรค', render: renderGroups },
    { key: 'telemed', label: 'Telemedicine', align: 'center', sortable: false, render: renderTelemedicine },
    { key: 'room',    label: 'ห้อง' },
    { key: 'doctor',  label: 'แพทย์ผู้ดูแล',   flex: true, minWidth: 140 },
    { key: 'wait',    label: 'รอนาน',  render: (r) => (r.waitMinutes ? `${r.waitMinutes} นาที` : '—') },
    { key: 'status',  label: 'สถานะ', render: renderStatus },
    { key: 'actions', label: 'การดำเนินการ', sortable: false, render: withEmrRowAction(renderActions) },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [tick]);

  /* "นัดแล้วยังไม่มาติดต่อ" — different row shape (เวลานัด instead of
     queue/wait/status) + a ส่งตรวจ check-in action. */
  const scheduledColumns = useMemo(() => ([
    { key: 'appointmentTime', label: 'เวลานัด' },
    { key: 'hn',              label: 'HN' },
    { key: 'name',            label: 'ชื่อ-นามสกุล',  flex: true, minWidth: 160 },
    { key: 'group',           label: 'กลุ่มโรค', render: renderGroups },
    { key: 'clinic',          label: 'คลินิก' },
    { key: 'doctor',          label: 'แพทย์ผู้ดูแล',  flex: true, minWidth: 140 },
    {
      key: 'source', label: 'ที่มาของนัด', sortable: false,
      render: (row) => (row.fromRecord
        ? <ColorfulBadge style='teal' size='small' hierarchy='secondary'>นัดจากบันทึกการตรวจ</ColorfulBadge>
        : <ColorfulBadge style='grey' size='small' hierarchy='secondary'>นัดล่วงหน้า</ColorfulBadge>)},
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
      title='งานกลุ่มโรคเฉพาะ NCD'
      actions={
        /* Cross-nav to the module's sibling pages — the registry and the
           per-patient follow-up live on their own routes (unlike ANC, whose
           registry actions are in-row), so the worklist must surface them
           (Trunk Test: "what are my options here?"). */
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <NeutralSubdueButton leadingIcon='contract' onClick={() => history.push('/clinic/ncd/registry')}>
            ทะเบียนผู้รับบริการ
          </NeutralSubdueButton>
          <NeutralSubdueButton leadingIcon='monitoring' onClick={() => history.push('/clinic/ncd/followup')}>
            การติดตามการดูแล
          </NeutralSubdueButton>
        </div>
      }
      summaryTitle={SUMMARY_TITLE}
      summaryCards={summaryCards}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
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
          <div className='w-full flex items-start justify-center'>
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
              placeholder='ค้นหาคิว / HN / ชื่อ-สกุลผู้รับบริการ / ชื่อแพทย์'
              width={640}
              avatars={searchAvatars}
            />
          </div>

          <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
              <FilterDropdown prefix='กลุ่มโรค:' options={FILTER_OPTIONS.group} value={filters.group} onChange={setFilter('group')} />
              <FilterDropdown prefix='แพทย์:' options={withDoctorAvatars(FILTER_OPTIONS.doctor)} value={filters.doctor} onChange={setFilter('doctor')} />
              <FilterDropdown prefix='ประเภท:' options={FILTER_OPTIONS.visitType} value={filters.visitType} onChange={setFilter('visitType')} />
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
                emptyMessage='ไม่พบรายการ'
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
    </QueuePageShell>
  );
};

export default NcdQueuePage;
