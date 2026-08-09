import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import useSearchHistory from '@/components/search/useSearchHistory';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import { FilterDropdown } from '@/components/forms/FilterTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import FilterDateTag from '@/components/forms/FilterDateTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import TabCapsule from '@/components/tab/TabCapsule';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Popup from '@/components/popup/Popup';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  HOMEVISIT_GROUPS,
  HOMEVISIT_SOURCES,
  HOMEVISIT_PROFESSIONS,
  HOMEVISIT_TIME_SLOTS,
  HOMEVISIT_DISTRICTS,
  HOMEVISIT_CANCEL_REASONS,
  GROUP_FOLLOWUP_DAYS,
  addDaysIso,
  formatHomeVisitDate,
  getHomeVisitQueueRows,
  getHomeVisitAppointmentCancellation,
  cancelHomeVisitAppointment,
  reactivateHomeVisitAppointment,
  startHomeVisit,
  getVisitFollowUpOverdue,
  resolveGroup,
  resolveSource,
  resolveProfession,
  resolveVisitStatus,
} from '@/data/homevisitVisits';
import { printHomeVisitQueue } from '@/pages/homevisit/homevisitPrint';
import HomeVisitRouteMapPanel from '@/pages/homevisit/HomeVisitRouteMapPanel';
import {
  HomeVisitAccessGate,
  AccessDemoToggle,
  GroupBadge,
  SourceBadge,
  FlagBadges,
  EmptyHint,
  NoticeBand,
  GREYED,
  dateFilterToIsoRange,
} from '@/pages/homevisit/homevisitShared';

/* HomeVisitQueuePage — คิวนัดหมายเยี่ยมบ้าน (TOR 1.18.1 + 1.18.2).

   โครงเดียวกับ AncQueuePage/AddictionQueuePage: QueuePageShell + summary
   cards + แท็บสถานะ + ค้นหา + ตัวกรอง + ตารางคิว + pagination 20 แถว.
   เพิ่มจากคลินิกอื่น 2 อย่างที่เป็นของเยี่ยมบ้านโดยเฉพาะ:
     • สลับมุมมอง "รายการ / แผนที่" — มุมมองแผนที่คือแผนเส้นทางออกเยี่ยม
       ของวัน (1.18.2 ระดับคิว) บน mock map ของ AddressMapBlock
     • แท็บ "เลยกำหนดติดตาม" — รอบติดตามตามกลุ่มผู้รับบริการของระบบเดิม
       (คู่มือฯ §2.2.6: ระยะสุดท้าย 30 วัน · เรื้อรัง/พิการช่วยเหลือไม่ได้
       6 เดือน · กลุ่มอื่นปีละครั้ง)
   ชื่อผู้รับบริการของเคส "ข้อมูลลับ" ถูกปิดบังด้วย MaskedWorklistName (§1.4.2). */

const breadcrumb = ['ระบบเยี่ยมบ้าน', 'คิวนัดหมายเยี่ยมบ้าน'];
const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:homevisit-queue';
const PAGE_SIZE = 20;

const FILTER_DEFAULTS = {
  group: 'all',
  profession: 'all',
  source: 'all',
  district: 'all',
  slot: 'all',
  dateValue: { quick: 'today' },
};

const DATE_CHIP_LABELS = { today: 'วันนี้', yesterday: 'เมื่อวาน', tomorrow: 'พรุ่งนี้' };

const TAB_PREDICATE = {
  toDepart: (r) => !r.cancellation && (r.statusKey === 'toDepart' || r.statusKey === 'scheduled'),
  visiting: (r) => !r.cancellation && r.statusKey === 'visiting',
  done:     (r) => !r.cancellation && r.statusKey === 'done',
  draft:    (r) => !r.cancellation && r.statusKey === 'draft',
  overdue:  (r) => !r.cancellation && !!r.overdue,
  cancelled: (r) => !!r.cancellation,
};

/** นัดติดตามครั้งถัดไปตามรอบของกลุ่มผู้รับบริการ. */
const nextDueDate = (row) => {
  const base = row.lastVisitDate || row.registeredDate || row.visitDate;
  if (!base) return null;
  return addDaysIso(base, GROUP_FOLLOWUP_DAYS[row.group] ?? 365);
};

const HomeVisitQueuePage = () => {
  const history = useHistory();

  const [tick, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState('today');
  const [view, setView] = useState('list'); /* 'list' | 'map' */
  const [selectedStopId, setSelectedStopId] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: [] });

  /* แถวคิวพร้อมสถานะยกเลิก + สถานะเลยกำหนดติดตาม เพื่อให้ตาราง/แท็บ/สรุป
     อ่านจากรูปทรงเดียวกัน (session writes ไม่ใช่ React state จึงพึ่ง tick). */
  const rows = useMemo(() => getHomeVisitQueueRows().map((r) => ({
    ...r,
    cancellation: getHomeVisitAppointmentCancellation(r.id),
    overdue: getVisitFollowUpOverdue(r),
    nextDue: nextDueDate(r),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [tick]);

  const tabs = useMemo(() => ([
    { key: 'today',     label: 'นัดวันนี้',         icon: 'event_available',      count: rows.filter((r) => !r.cancellation).length },
    { key: 'toDepart',  label: 'รอออกเยี่ยม',       icon: 'directions_car',       count: rows.filter(TAB_PREDICATE.toDepart).length },
    { key: 'visiting',  label: 'กำลังเยี่ยม',       icon: 'home_health',          count: rows.filter(TAB_PREDICATE.visiting).length },
    { key: 'done',      label: 'เยี่ยมเสร็จแล้ว',   icon: 'check_circle',         count: rows.filter(TAB_PREDICATE.done).length },
    { key: 'draft',     label: 'ที่ร่างไว้',        icon: 'save',                 count: rows.filter(TAB_PREDICATE.draft).length },
    { key: 'overdue',   label: 'เลยกำหนดติดตาม',    icon: 'running_with_errors',  count: rows.filter(TAB_PREDICATE.overdue).length },
    { key: 'cancelled', label: 'ยกเลิกนัดแล้ว',     icon: 'block',                count: rows.filter(TAB_PREDICATE.cancelled).length },
  ]), [rows]);

  const dateRange = useMemo(() => dateFilterToIsoRange(filters.dateValue), [filters.dateValue]);

  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return rows.filter((r) => {
      const pred = TAB_PREDICATE[activeTab];
      if (pred) {
        if (!pred(r)) return false;
      } else if (r.cancellation) {
        /* แท็บ "นัดวันนี้" ไม่รวมนัดที่ถูกยกเลิก — ดูได้ที่แท็บยกเลิกนัดแล้ว */
        return false;
      }
      if (filters.group !== 'all' && r.group !== filters.group) return false;
      if (filters.profession !== 'all' && r.profession !== filters.profession) return false;
      if (filters.source !== 'all' && r.source !== filters.source) return false;
      if (filters.district !== 'all' && r.district !== filters.district) return false;
      if (filters.slot !== 'all' && r.timeSlot !== filters.slot) return false;
      if (dateRange && activeTab !== 'overdue') {
        if (!r.visitDate) return false;
        if (r.visitDate < dateRange.from || r.visitDate > dateRange.to) return false;
      }
      if (!q) return true;
      return [r.hn, r.name, r.responsible, r.community, r.district, r.address]
        .some((f) => f && String(f).toLowerCase().includes(q));
    });
  }, [rows, activeTab, filters, dateRange, searchQ]);

  const sortedRows = useMemo(() => {
    const byTime = (a, b) => String(a.appointmentTime || '').localeCompare(String(b.appointmentTime || ''));
    if (!sortConfig.key) return [...filtered].sort(byTime);
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    const normalize = (row, key) => {
      switch (key) {
        case 'group': return resolveGroup(row.group)?.short ?? '';
        case 'source': return resolveSource(row.source)?.short ?? '';
        case 'status': return resolveVisitStatus(row.statusKey)?.label ?? '';
        case 'nextDue': return row.nextDue ?? '';
        case 'place': return `${row.district || ''} ${row.community || ''}`;
        default: return row[key] ?? '';
      }
    };
    const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
    return [...filtered].sort((a, b) => {
      const primary = collator.compare(
        String(normalize(a, sortConfig.key)),
        String(normalize(b, sortConfig.key)),
      );
      return primary !== 0 ? sign * primary : byTime(a, b);
    });
  }, [filtered, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const pageRows = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = sortedRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, sortedRows.length);

  useEffect(() => { setPage(1); }, [activeTab, filters, searchQ]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const summaryCards = useMemo(() => ([
    { key: 'today',    label: 'นัดเยี่ยมวันนี้',   value: rows.filter((r) => !r.cancellation).length, color: 'info',        icon: 'event_available' },
    { key: 'toDepart', label: 'รอออกเยี่ยม',       value: rows.filter(TAB_PREDICATE.toDepart).length,  color: 'brand',       icon: 'directions_car'  },
    { key: 'visiting', label: 'กำลังเยี่ยม',       value: rows.filter(TAB_PREDICATE.visiting).length,  color: 'inprogress',  icon: 'home_health'     },
    { key: 'done',     label: 'เยี่ยมเสร็จแล้ว',   value: rows.filter(TAB_PREDICATE.done).length,      color: 'positive',    icon: 'check_circle'    },
    { key: 'overdue',  label: 'เลยกำหนดติดตาม',    value: rows.filter(TAB_PREDICATE.overdue).length,   color: 'destructive', icon: 'running_with_errors' },
  ]), [rows]);

  /* ── การดำเนินการ ────────────────────────────────────────────────── */
  const openRecord = (row) => history.push({
    pathname: '/homevisit/visit',
    state: { visitId: row.id, hn: row.hn, name: row.name },
  });

  const dispatch = (row) => {
    startHomeVisit(row.id);
    setTick((t) => t + 1);
    setActiveTab('visiting');
  };

  const openCancel = (row) => {
    setCancelReason('');
    setCancelError('');
    setCancelTarget(row);
  };

  const confirmCancel = () => {
    if (!cancelReason.trim()) {
      setCancelError('กรุณาระบุเหตุผลการยกเลิกนัดเยี่ยม');
      return;
    }
    cancelHomeVisitAppointment(cancelTarget.id, cancelReason.trim());
    setCancelTarget(null);
    setTick((t) => t + 1);
  };

  const reactivate = (row) => {
    reactivateHomeVisitAppointment(row.id);
    setTick((t) => t + 1);
  };

  /* ── ค้นหา ───────────────────────────────────────────────────────── */
  const rowToSearchItem = (r) => ({
    id: r.id,
    label: r.confidential ? `ผู้รับบริการ HN ${r.hn} (ข้อมูลลับ)` : r.name,
    sublabel: `${r.community || '—'} · ${r.responsible || '—'}`,
    value: r.confidential ? r.hn : r.name,
    badges: [
      { label: r.hn, tone: 'indigo' },
      { label: resolveGroup(r.group)?.short || '—', tone: 'teal' },
    ],
    avatarSrc: r.confidential ? undefined : getPatientByHN(r.hn)?.avatarUrl,
  });

  const searchSuggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    return rows
      .filter((r) => [r.hn, r.name, r.responsible, r.community].some((f) => f && String(f).toLowerCase().includes(q)))
      .slice(0, 8)
      .map(rowToSearchItem);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQ, rows]);

  const resolveSearchRow = (query, item) => {
    if (item?.id) {
      const byId = rows.find((r) => r.id === item.id);
      if (byId) return byId;
    }
    const q = (query ?? item?.value ?? item?.label ?? '').toString().trim().toLowerCase();
    if (!q) return null;
    return rows.find((r) => [r.hn, r.name].some((f) => f && String(f).toLowerCase().includes(q))) ?? null;
  };

  /* ── ตัวกรอง / สถานะว่าง ─────────────────────────────────────────── */
  const filtersActive = searchQ.trim() !== ''
    || filters.group !== 'all'
    || filters.profession !== 'all'
    || filters.source !== 'all'
    || filters.district !== 'all'
    || filters.slot !== 'all'
    || (filters.dateValue?.quick || 'today') !== 'today'
    || activeTab !== 'today';
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => {
      setSearchQ('');
      setFilters(FILTER_DEFAULTS);
      setActiveTab('today');
    },
  );

  const filterSummary = [
    activeTab === 'today' ? null : tabs.find((t) => t.key === activeTab)?.label,
    filters.group === 'all' ? null : resolveGroup(filters.group)?.label,
    filters.profession === 'all' ? null : `วิชาชีพ ${resolveProfession(filters.profession)?.label}`,
    filters.source === 'all' ? null : `แหล่งรับเข้า ${resolveSource(filters.source)?.short}`,
    filters.district === 'all' ? null : filters.district,
    filters.slot === 'all' ? null : HOMEVISIT_TIME_SLOTS.find((s) => s.value === filters.slot)?.label,
    dateRange ? `วันนัด ${formatHomeVisitDate(dateRange.from)} – ${formatHomeVisitDate(dateRange.to)}` : null,
    searchQ.trim() ? `ค้นหา "${searchQ.trim()}"` : null,
  ].filter(Boolean).join(' · ');

  const doPrint = () => printHomeVisitQueue(
    sortedRows.map((r) => ({
      ...r,
      groupLabel: resolveGroup(r.group)?.short,
      sourceLabel: resolveSource(r.source)?.short,
      statusLabel: r.cancellation ? 'ยกเลิกนัด' : resolveVisitStatus(r.statusKey)?.label,
    })),
    filterSummary || 'นัดเยี่ยมวันนี้ทั้งหมด',
  );

  /* ── คอลัมน์ ─────────────────────────────────────────────────────── */
  const renderName = (row) => {
    if (row.confidential) {
      return (
        <MaskedWorklistName
          name={row.name}
          recordKey={row.id}
          linkTo={{ pathname: '/homevisit/visit', state: { visitId: row.id, hn: row.hn, name: row.name } }}
        />
      );
    }
    return (
      <span style={row.cancellation ? GREYED : { fontWeight: 'var(--type-weight-medium)' }}>{row.name}</span>
    );
  };

  const columns = useMemo(() => ([
    {
      key: 'appointmentTime', label: 'คิว/เวลานัด',
      render: (r) => (
        <ColorfulBadge style={r.cancellation ? 'grey' : 'teal'} size='small' hierarchy='secondary'>
          {r.appointmentTime || '—'}
        </ColorfulBadge>
      ),
    },
    { key: 'hn', label: 'HN', render: (r) => <span style={r.cancellation ? GREYED : undefined}>{r.hn}</span> },
    {
      key: 'name', label: 'ผู้รับบริการ', flex: true, minWidth: 190,
      render: (r) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          {renderName(r)}
          <FlagBadges group={r.group} flags={r.flags} />
        </div>
      ),
    },
    { key: 'group', label: 'กลุ่มผู้รับบริการ', render: (r) => <GroupBadge group={r.group} /> },
    { key: 'source', label: 'แหล่งรับเข้า', render: (r) => <SourceBadge source={r.source} /> },
    {
      key: 'place', label: 'ที่อยู่/เขต', flex: true, minWidth: 220,
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={r.cancellation ? GREYED : undefined}>{r.community || '—'} · {r.district || '—'}</span>
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {r.home?.pinSaved ? 'ปักหมุดตำแหน่งบ้านแล้ว' : 'ยังไม่ได้ปักหมุดตำแหน่งบ้าน'}
          </span>
        </div>
      ),
    },
    {
      key: 'responsible', label: 'ผู้รับผิดชอบ', flex: true, minWidth: 160,
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={r.cancellation ? GREYED : undefined}>{r.responsible}</span>
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {resolveProfession(r.profession)?.label || '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'status', label: 'สถานะ', sortable: false,
      render: (r) => {
        if (r.cancellation) {
          return (
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกนัดแล้ว</ColorfulBadge>
              <span style={{ fontSize: 'var(--type-size-xs)', ...GREYED }}>
                ยกเลิกโดย {r.cancellation.by} · {r.cancellation.at}
                <br />เหตุผล: {r.cancellation.reason}
              </span>
            </div>
          );
        }
        const st = resolveVisitStatus(r.statusKey);
        return (
          <ColorfulBadge style={st?.badge || 'grey'} size='small' hierarchy='secondary'>
            {st?.label || r.statusKey}
          </ColorfulBadge>
        );
      },
    },
    {
      key: 'nextDue', label: 'นัดครั้งถัดไป', flex: true, minWidth: 170,
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={r.cancellation ? GREYED : undefined}>
            {r.nextDue ? formatHomeVisitDate(r.nextDue) : 'ยังไม่กำหนด'}
          </span>
          {r.overdue ? (
            <ColorfulBadge style='red' size='small' hierarchy='secondary' width='hug' maxWidth={220}>
              เลยกำหนด {r.overdue.daysOverdue} วัน
            </ColorfulBadge>
          ) : (
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
              รอบติดตามทุก {GROUP_FOLLOWUP_DAYS[r.group] ?? 365} วัน
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions', label: 'การดำเนินการ', sortable: false,
      render: (r) => (
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {r.cancellation ? (
            <BrandSubdueButton
              variant='outline' size='sm' leadingIcon='restart_alt'
              onClick={(e) => { e.stopPropagation(); reactivate(r); }}
            >
              เปิดใช้งานอีกครั้ง
            </BrandSubdueButton>
          ) : (
            <>
              {(r.statusKey === 'scheduled' || r.statusKey === 'toDepart') && (
                <BrandSubdueButton
                  variant='fill' size='sm' leadingIcon='directions_car'
                  onClick={(e) => { e.stopPropagation(); dispatch(r); }}
                >
                  ออกเยี่ยม
                </BrandSubdueButton>
              )}
              <BrandSubdueButton
                variant='outline' size='sm' leadingIcon='assignment'
                onClick={(e) => { e.stopPropagation(); openRecord(r); }}
              >
                บันทึกการเยี่ยม
              </BrandSubdueButton>
              <NeutralSubdueButton
                size='sm' leadingIcon='block'
                onClick={(e) => { e.stopPropagation(); openCancel(r); }}
              >
                ยกเลิกนัด
              </NeutralSubdueButton>
            </>
          )}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [tick, rows]);

  const handleSort = (key) => {
    setSortConfig((prev) => (prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' }));
  };

  const mapStops = useMemo(
    () => sortedRows.filter((r) => !r.cancellation),
    [sortedRows],
  );

  return (
    <QueuePageShell
      activeKey='homevisit'
      breadcrumb={breadcrumb}
      title='คิวนัดหมายเยี่ยมบ้าน'
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <AccessDemoToggle onRevoked={() => setTick((t) => t + 1)} />
          <NeutralSubdueButton variant='outline' size='sm' leadingIcon='print' onClick={doPrint}>
            พิมพ์แผนออกเยี่ยม
          </NeutralSubdueButton>
          <NeutralSubdueButton variant='outline' size='sm' leadingIcon='monitoring' onClick={() => history.push('/homevisit/follow-up')}>
            ติดตามการเยี่ยมบ้าน
          </NeutralSubdueButton>
          <BrandSubdueButton variant='fill' leadingIcon='contact_page' onClick={() => history.push('/homevisit/registry')}>
            ทะเบียนผู้รับบริการเยี่ยมบ้าน
          </BrandSubdueButton>
        </div>
      )}
      summaryCards={summaryCards}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title='ยกเลิกนัดหมายเยี่ยมบ้าน'
        subtitle={cancelTarget ? `${cancelTarget.confidential ? 'ผู้รับบริการ (ข้อมูลลับ)' : cancelTarget.name} · HN: ${cancelTarget?.hn}` : ''}
        tertiaryAction={{ label: 'กลับไปแก้ต่อ', onClick: () => setCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันยกเลิกนัด', onClick: confirmCancel, tone: 'danger' }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <SuggestibleTextarea
            label='เหตุผลการยกเลิกนัด'
            required
            voice
            value={cancelReason}
            onChange={(e) => { setCancelReason(e.target.value); if (e.target.value.trim()) setCancelError(''); }}
            suggestions={HOMEVISIT_CANCEL_REASONS}
            minChars={2}
            placeholder='เช่น ครอบครัวขอเลื่อน / ผู้รับบริการเข้ารับการรักษาในโรงพยาบาล'
          />
          <span style={{
            color: cancelError ? 'var(--text-input-errorHelper, #DC2626)' : 'var(--text-content-tertiary, #858C92)',
            fontSize: 'var(--type-size-xs)',
          }}>
            {cancelError || 'ต้องระบุเหตุผล — ระบบบันทึกผู้ยกเลิกและเวลาให้อัตโนมัติ และนัดจะยังแสดงอยู่ในแท็บ “ยกเลิกนัดแล้ว”'}
          </span>
        </div>
      </Popup>

      <HomeVisitAccessGate subject='คิวนัดหมายเยี่ยมบ้าน'>
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{
            paddingTop: 'var(--dim-space-600, 24px)',
            paddingBottom: 'var(--dim-space-600, 24px)',
            paddingLeft: 'var(--dim-space-600, 24px)',
            paddingRight: 'var(--dim-space-600, 24px)',
            gap: 'var(--dim-space-600, 24px)',
          }}
        >
          <div
            className='w-full flex flex-col'
            style={{
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-500)',
              border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
              boxShadow: 'var(--shadow-card-strong)',
              paddingTop: 'var(--dim-space-600, 24px)',
              paddingBottom: 'var(--dim-space-600, 24px)',
              paddingLeft: 'var(--dim-space-600, 24px)',
              paddingRight: 'var(--dim-space-600, 24px)',
              gap: 'var(--dim-space-600, 24px)',
            }}
          >
            <div className='w-full flex items-start justify-center'>
              <PrimarySearch
                value={searchQ}
                onChange={setSearchQ}
                onSubmit={(label, item) => {
                  setSearchQ(label);
                  const match = resolveSearchRow(label, item);
                  pushHistory(match ? rowToSearchItem(match) : (item ?? label));
                  if (match) openRecord(match);
                }}
                suggestions={searchSuggestions}
                history={searchHistory}
                onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
                placeholder='ค้นหา HN / ชื่อผู้รับบริการ / ผู้รับผิดชอบ / ชุมชน'
                width={640}
              />
            </div>

            <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
              <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
                <FilterDropdown
                  prefix='กลุ่ม:'
                  options={[{ value: 'all', label: 'ทุกกลุ่ม' }, ...HOMEVISIT_GROUPS.map((g) => ({ value: g.value, label: g.short }))]}
                  value={filters.group}
                  onChange={(v) => setFilters((f) => ({ ...f, group: v }))}
                />
                <FilterDropdown
                  prefix='ทีม/วิชาชีพ:'
                  options={[{ value: 'all', label: 'ทุกวิชาชีพ' }, ...HOMEVISIT_PROFESSIONS.map((p) => ({ value: p.value, label: p.label }))]}
                  value={filters.profession}
                  onChange={(v) => setFilters((f) => ({ ...f, profession: v }))}
                />
                <FilterDropdown
                  prefix='แหล่งรับเข้า:'
                  options={[{ value: 'all', label: 'ทุกแหล่ง' }, ...HOMEVISIT_SOURCES.map((s) => ({ value: s.value, label: s.short }))]}
                  value={filters.source}
                  onChange={(v) => setFilters((f) => ({ ...f, source: v }))}
                />
                <FilterDropdown
                  prefix='เขต:'
                  options={[{ value: 'all', label: 'ทุกเขต' }, ...HOMEVISIT_DISTRICTS.map((d) => ({ value: d, label: d }))]}
                  value={filters.district}
                  onChange={(v) => setFilters((f) => ({ ...f, district: v }))}
                />
                <FilterDateTag
                  prefix='วันนัด:'
                  value={filters.dateValue}
                  onChange={(v) => setFilters((f) => ({ ...f, dateValue: v }))}
                  defaultQuick='today'
                  quickLabels={DATE_CHIP_LABELS}
                />
                <FilterDropdown
                  prefix='ช่วงเวลา:'
                  options={[{ value: 'all', label: 'ทั้งวัน' }, ...HOMEVISIT_TIME_SLOTS]}
                  value={filters.slot}
                  onChange={(v) => setFilters((f) => ({ ...f, slot: v }))}
                />
                <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
              </OverflowFlexRow>
            </div>

            <SmoothFilterResults opaque={resultsOpaque}>
            <SearchResultCount found={sortedRows.length} total={rows.length} />

            <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <TabCapsule
                variant='filter'
                label='มุมมองรายการ'
                selected={view === 'list'}
                onClick={() => setView('list')}
              />
              <TabCapsule
                variant='filter'
                label='มุมมองแผนที่ (แผนเส้นทาง)'
                selected={view === 'map'}
                onClick={() => setView('map')}
              />
              <div className='flex-1' />
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                {activeTab === 'overdue'
                  ? 'แท็บนี้ไม่กรองตามวันนัด — แสดงทุกรายที่เลยรอบติดตามของกลุ่ม'
                  : `เงื่อนไขปัจจุบัน: ${filterSummary || 'นัดเยี่ยมวันนี้ทั้งหมด'}`}
              </span>
            </div>

            {activeTab === 'overdue' && rows.filter(TAB_PREDICATE.overdue).length > 0 && (
              <NoticeBand tone='warning' icon='running_with_errors'>
                รายชื่อในแท็บนี้เลยรอบ “เยี่ยม/ติดตามประเมินผล” ตามกลุ่มผู้รับบริการแล้ว
                (ระยะสุดท้าย 30 วัน · เรื้อรัง/พิการช่วยเหลือไม่ได้ 6 เดือน · กลุ่มอื่นปีละครั้ง)
                — ควรนัดเยี่ยมใหม่หรือบันทึกเหตุผลที่ยังติดตามไม่ได้
              </NoticeBand>
            )}

            {view === 'map' ? (
              <HomeVisitRouteMapPanel
                stops={mapStops}
                selectedId={selectedStopId || mapStops[0]?.id}
                onSelect={setSelectedStopId}
                onOpenRecord={openRecord}
                onClearFilters={filtersActive ? clearFilters : undefined}
              />
            ) : rows.length === 0 ? (
              <EmptyHint icon='event_busy'>
                ยังไม่มีนัดหมายเยี่ยมบ้านในระบบ — เพิ่มผู้รับบริการที่หน้าทะเบียนก่อน แล้วจึงนัดหมายออกเยี่ยม
              </EmptyHint>
            ) : sortedRows.length === 0 ? (
              <EmptyHint
                icon='filter_alt_off'
                action={(
                  <NeutralSubdueButton variant='outline' leadingIcon='restart_alt' onClick={clearFilters}>
                    ล้างตัวกรอง
                  </NeutralSubdueButton>
                )}
              >
                ไม่พบนัดเยี่ยมที่ตรงกับเงื่อนไข ({filterSummary || 'ตัวกรองปัจจุบัน'}) — ปรับหรือล้างตัวกรองแล้วลองอีกครั้ง
              </EmptyHint>
            ) : (
              <>
                <Table
                  columns={columns}
                  rows={pageRows}
                  rowKey={(r) => r.id}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  onRowClick={(r) => (r.cancellation ? undefined : openRecord(r))}
                  stickyColCount={3}
                  stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                  emptyMessage='ไม่พบนัดเยี่ยมที่ตรงกับเงื่อนไข'
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
                  <span style={{
                    color: 'var(--text-content-secondary)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm)',
                  }}>
                    {`แสดง ${rangeStart}–${rangeEnd} จาก ${sortedRows.length} รายการ`}
                  </span>
                  <div className='flex-1' />
                  <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
                </div>
              </>
            )}
            </SmoothFilterResults>
          </div>
        </div>
      </HomeVisitAccessGate>
    </QueuePageShell>
  );
};

export default HomeVisitQueuePage;
