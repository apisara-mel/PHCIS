import React, { useEffect, useMemo, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import FilterDateTag from '@/components/forms/FilterDateTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import ColorfulIconBadge from '@/components/badge/ColorfulIconBadge';
import Textarea from '@/components/forms/Textarea';
import Popup from '@/components/popup/Popup';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  ANC_PATIENTS,
  calculateGestationalAge,
  formatGestationalAge,
  resolveAncRiskLevel,
  cancelAncRegistration,
  reactivateAncRegistration,
  getAncCancellation,
  getAncQueueRows,
  getAncScheduledNotArrived,
  checkInAncAppointment,
} from '@/data/ancVisits';

/* AncQueuePage — คิวฝากครรภ์ (ANC queue), TOR 1.10.7.1/1.10.7.2/1.10.7.6.
   Search box + filter row + column-header sort + pagination all mirror
   the OPD screening worklist (`src/pages/opd/QueuePage.jsx`) verbatim —
   same components, same mechanics, same "แสดง X–Y จาก Z รายการ" pager —
   with filter categories swapped for ANC-relevant ones (risk level /
   ANC doctor / visit type instead of department / walk-in / OPD type).
   Columns swap OPD's vitals/telemedicine for gravida-para / gestational
   age / risk level, plus a ยกเลิก/เปิดใช้งาน registration action (TOR
   1.10.7.6 — the registry's ยกเลิก requirement; แสดง/แก้ไข are covered
   by the table itself + the editable AncFormPage the row links to). */

const breadcrumb = ['ระบบบันทึกการรักษา', 'แผนกฝากครรภ์'];
const SUMMARY_TITLE = 'คิวฝากครรภ์ (ANC)';

const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:anc-queue';
const PAGE_SIZE = 20;

/* Tab counts recomputed per-render from `rows`/`scheduledCount` (both
   session-state-dependent — checking in a scheduled appointment moves it
   from the "scheduled" tab into "waiting", same as legacy HCIS p.2-3). */
const buildTabs = (rows, scheduledCount) => [
  { key: 'all',       label: 'ทั้งหมด',              icon: 'group',         count: rows.length },
  { key: 'waiting',   label: 'รอตรวจ',               icon: 'schedule',      count: rows.filter((p) => p.statusKey === 'waiting').length },
  { key: 'progress',  label: 'กำลังตรวจ',            icon: 'assignment',    count: rows.filter((p) => p.statusKey === 'progress').length },
  { key: 'done',      label: 'ตรวจเสร็จแล้ว',        icon: 'check_circle',  count: rows.filter((p) => p.statusKey === 'done').length },
  { key: 'draft',     label: 'ที่ร่างไว้',            icon: 'save',          count: rows.filter((p) => p.statusKey === 'draft').length },
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

const RISK_BADGE_STYLE = { low: 'green', intermediate: 'yellow', high: 'red' };
const STATUS_SORT_ORDER = { waiting: 0, progress: 1, done: 2, draft: 3 };
const RISK_SORT_ORDER = { low: 0, intermediate: 1, high: 2 };

/* Tag-group filter — same shell as OPD's FILTER_OPTIONS/FILTER_DEFAULTS,
   categories adapted to ANC (single department, so risk level takes the
   department slot). Date/time are visual-placeholder chips only — the
   underlying rows have no visit-date field yet, same as OPD's own
   comment ("date / time are visual placeholders"). */
const FILTER_OPTIONS = {
  risk: [
    { value: 'all',          label: 'ทุกระดับ' },
    { value: 'low',          label: 'ความเสี่ยงต่ำ' },
    { value: 'intermediate', label: 'ความเสี่ยงปานกลาง' },
    { value: 'high',         label: 'ความเสี่ยงสูง' },
  ],
  doctor: [
    { value: 'all', label: 'ทุกคน' },
    ...Array.from(new Set(ANC_PATIENTS.map((p) => p.doctor))).map((d) => ({ value: d, label: d })),
  ],
  visitType: [
    { value: 'all',      label: 'ทุกประเภท' },
    { value: 'first',    label: 'ฝากครรภ์ครั้งแรก' },
    { value: 'followup', label: 'ตรวจติดตาม' },
  ],
  time: [
    { value: 'all',       label: 'ทั้งวัน'                  },
    { value: 'morning',   label: 'ช่วงเช้า (06:00–12:00)'  },
    { value: 'afternoon', label: 'ช่วงบ่าย (12:00–18:00)'  },
    { value: 'evening',   label: 'ช่วงเย็น (18:00–24:00)'  },
  ],
};
const FILTER_DEFAULTS = {
  risk: 'all',
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
  <Link
    to={{ pathname: '/treat/anc/record', state: { hn: row.hn, queue: row.queue, name: row.name } }}
    className='min-w-0 flex-1 truncate hover:underline'
    style={{ color: 'var(--text-neutral-default)', fontWeight: 'var(--type-weight-medium)', textDecoration: 'none' }}
    onClick={(e) => e.stopPropagation()}
  >
    {row.name}
  </Link>
);

const renderGestationalAge = (row) => {
  const ga = calculateGestationalAge(row.lmp);
  return ga ? formatGestationalAge(ga) : '—';
};

const renderRisk = (row) => {
  const risk = resolveAncRiskLevel(row.riskLevel);
  if (!risk) return '—';
  return (
    <ColorfulBadge style={RISK_BADGE_STYLE[row.riskLevel] || 'grey'} size='small' hierarchy='secondary'>
      {risk.label}
    </ColorfulBadge>
  );
};

const renderTelemedicine = (row) => (
  row.telemedicine ? <ColorfulIconBadge style='blue' size='medium' fill='default' icon='videocam' /> : null
);

const queueRowToSearchItem = (row) => ({
  id: row.hn,
  label: row.name,
  sublabel: row.doctor,
  value: row.name,
  badges: [
    { label: row.queue, tone: 'teal' },
    { label: row.hn, tone: 'indigo' },
  ],
  avatarSrc: getPatientByHN(row.hn)?.avatarUrl,
});

const AncQueuePage = () => {
  const history = useHistory();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  /* Bumped after cancel/reactivate to force a re-render — sessionStorage
     reads (`getAncCancellation`) are synchronous but not React state, so
     nothing else would tell the table to re-derive the status column. */
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
    filters.risk === FILTER_DEFAULTS.risk &&
    filters.doctor === FILTER_DEFAULTS.doctor &&
    filters.visitType === FILTER_DEFAULTS.visitType &&
    filters.dateValue.quick === FILTER_DEFAULTS.dateValue.quick &&
    filters.time === FILTER_DEFAULTS.time;

  /* `rows` = mock roster + any scheduled appointments checked in this
     session (getAncQueueRows merges them); `scheduledNotArrived` backs the
     separate "นัดแล้วยังไม่มาติดต่อ" tab. Both re-derive on `tick` since
     check-in / cancel / reactivate are sessionStorage writes, not React
     state. */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => getAncQueueRows(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scheduledNotArrived = useMemo(() => getAncScheduledNotArrived(), [tick]);
  const tabs = useMemo(() => buildTabs(rows, scheduledNotArrived.length), [rows, scheduledNotArrived]);

  const handleCheckIn = (hn) => {
    checkInAncAppointment(hn);
    setTick((t) => t + 1);
    setActiveTab('waiting');
  };

  const summaryCards = useMemo(() => ([
    { key: 'total',    label: 'คิวทั้งหมดวันนี้', value: rows.length, color: 'info',     icon: 'directions_walk' },
    { key: 'first',    label: 'ฝากครรภ์ครั้งแรก', value: rows.filter((p) => p.visitType === 'first').length, color: 'info', icon: 'assignment_add' },
    { key: 'followup', label: 'ตรวจติดตาม',       value: rows.filter((p) => p.visitType === 'followup').length, color: 'positive', icon: 'history' },
    { key: 'highrisk', label: 'ความเสี่ยงสูง/ปานกลาง', value: rows.filter((p) => p.riskLevel !== 'low').length, color: 'warning', icon: 'fast_forward' },
  ]), [rows]);

  const filtered = useMemo(() => {
    if (activeTab === 'scheduled') return [];
    let result = rows;
    const tabPred = TAB_STATUS_FILTER[activeTab];
    if (tabPred) result = result.filter(tabPred);
    if (filters.risk !== 'all') result = result.filter((r) => r.riskLevel === filters.risk);
    if (filters.doctor !== 'all') result = result.filter((r) => r.doctor === filters.doctor);
    if (filters.visitType !== 'all') result = result.filter((r) => r.visitType === filters.visitType);
    /* date / time are visual placeholders — rows have no visit-date field yet
       (same as OPD's QueuePage.jsx). */
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

    const NUMERIC_KEYS = ['status', 'risk', 'ga', 'gp', 'wait'];
    const normalize = (row, key) => {
      switch (key) {
        case 'status': return STATUS_SORT_ORDER[row.statusKey] ?? 99;
        case 'risk':   return RISK_SORT_ORDER[row.riskLevel] ?? 99;
        case 'ga':     return calculateGestationalAge(row.lmp)?.totalDays ?? -1;
        case 'gp':     return (row.gravida ?? 0) * 100 + (row.para ?? 0);
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

  /* Snap page back into range when filtering / sorting shrinks the result —
     mirrors the OPD QueuePage pagination contract. */
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleTabChange = (key) => {
    setActiveTab(key);
    setPage(1);
  };

  const handleRowClick = (row) => history.push({
    pathname: '/treat/anc/record',
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

  const openCancelPopup = (row) => {
    setCancelReason('');
    setCancelTarget(row);
  };
  const confirmCancel = () => {
    cancelAncRegistration(cancelTarget.hn, cancelReason);
    setCancelTarget(null);
    setTick((t) => t + 1);
  };
  const reactivate = (row) => {
    reactivateAncRegistration(row.hn);
    setTick((t) => t + 1);
  };

  const renderStatus = (row) => {
    const cancellation = getAncCancellation(row.hn);
    if (cancellation) {
      return <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกทะเบียนแล้ว</ColorfulBadge>;
    }
    const badge = STATUS_BADGE[row.statusKey] || STATUS_BADGE.waiting;
    return <ColorfulBadge style={badge.style} size='small' hierarchy='secondary'>{badge.label}</ColorfulBadge>;
  };

  const renderActions = (row) => {
    const cancellation = getAncCancellation(row.hn);
    return cancellation ? (
      <BrandSubdueButton
        variant='outline'
        size='sm'
        leadingIcon='restart_alt'
        onClick={(e) => { e.stopPropagation(); reactivate(row); }}
      >
        เปิดใช้งานอีกครั้ง
      </BrandSubdueButton>
    ) : (
      <NeutralSubdueButton
        size='sm'
        leadingIcon='block'
        onClick={(e) => { e.stopPropagation(); openCancelPopup(row); }}
      >
        ยกเลิกทะเบียน
      </NeutralSubdueButton>
    );
  };

  const columns = useMemo(() => ([
    { key: 'queue',    label: 'คิว',            width: 80,  render: renderQueue },
    { key: 'hn',       label: 'HN',             width: 96  },
    { key: 'name',     label: 'ชื่อ-นามสกุล',    flex: true, minWidth: 160, render: renderName },
    { key: 'gp',       label: 'G-P',            width: 72,  render: (r) => `${r.gravida}-${r.para}` },
    { key: 'ga',       label: 'อายุครรภ์',       width: 128, render: renderGestationalAge },
    { key: 'risk',     label: 'ความเสี่ยง',      width: 128, render: renderRisk },
    { key: 'telemed',  label: 'Telemedicine',   width: 128, align: 'center', sortable: false, render: renderTelemedicine },
    { key: 'room',     label: 'ห้อง',           width: 96 },
    { key: 'doctor',   label: 'แพทย์/พยาบาล ANC', flex: true, minWidth: 140 },
    { key: 'wait',     label: 'รอนาน',          width: 96,  render: (r) => (r.waitMinutes ? `${r.waitMinutes} นาที` : '—') },
    { key: 'status',   label: 'สถานะ',          width: 140, render: renderStatus },
    { key: 'actions',  label: 'การดำเนินการ',    width: 160, sortable: false, render: renderActions },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [tick]);

  /* "นัดแล้วยังไม่มาติดต่อ" tab (legacy HCIS p.2-3) — a different row shape
     (appointment time instead of queue/wait/status), so it gets its own
     column set + a "ส่งตรวจ" check-in action instead of reusing `columns`. */
  const scheduledColumns = useMemo(() => ([
    { key: 'appointmentTime', label: 'เวลานัด',       width: 96 },
    { key: 'hn',              label: 'HN',            width: 96 },
    { key: 'name',            label: 'ชื่อ-นามสกุล',   flex: true, minWidth: 160 },
    { key: 'gp',              label: 'G-P',           width: 72, render: (r) => `${r.gravida}-${r.para}` },
    { key: 'ga',              label: 'อายุครรภ์',      width: 128, render: renderGestationalAge },
    { key: 'risk',            label: 'ความเสี่ยง',     width: 128, render: renderRisk },
    { key: 'clinic',          label: 'คลินิก',         width: 96 },
    { key: 'doctor',          label: 'แพทย์/พยาบาล ANC', flex: true, minWidth: 140 },
    {
      key: 'checkin', label: 'การดำเนินการ', width: 140, sortable: false,
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
      summaryTitle={SUMMARY_TITLE}
      summaryCards={summaryCards}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title='ยกเลิกทะเบียนฝากครรภ์'
        subtitle={cancelTarget ? `${cancelTarget.name} · HN: ${cancelTarget.hn}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันยกเลิกทะเบียน', onClick: confirmCancel, tone: 'danger' }}
      >
        <Textarea
          label='เหตุผลการยกเลิก'
          required
          value={cancelReason}
          onChange={setCancelReason}
          placeholder='เช่น ย้ายไปฝากครรภ์ที่สถานพยาบาลอื่น / ยุติการตั้งครรภ์'
        />
      </Popup>

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
              <FilterTag value='ทั้งหมด' selected={isAllDefault} onClick={() => setFilters(FILTER_DEFAULTS)} />
              <FilterDropdown prefix='ความเสี่ยง:' options={FILTER_OPTIONS.risk} value={filters.risk} onChange={setFilter('risk')} />
              <FilterDropdown prefix='แพทย์:' options={FILTER_OPTIONS.doctor} value={filters.doctor} onChange={setFilter('doctor')} />
              <FilterDropdown prefix='ประเภท:' options={FILTER_OPTIONS.visitType} value={filters.visitType} onChange={setFilter('visitType')} />
              <FilterDateTag
                prefix='วัน:'
                value={filters.dateValue}
                onChange={setFilter('dateValue')}
                defaultQuick={FILTER_DEFAULTS.dateValue.quick}
                quickLabels={DATE_CHIP_LABELS}
              />
              <FilterDropdown prefix='เวลา:' options={FILTER_OPTIONS.time} value={filters.time} onChange={setFilter('time')} />
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
            </>
          )}
        </div>
      </div>
    </QueuePageShell>
  );
};

export default AncQueuePage;
