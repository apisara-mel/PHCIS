import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
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
import TelemedicineQueueBadge from '@/components/telemed/TelemedicineQueueBadge';
import Icon from '@/components/icons/Icon';
import QueuePatientAvatar, { resolveQueuePatientAvatarProps } from '@/components/patient/QueuePatientAvatar';
import {
  HivStiConfidentialGate,
  ReadOnlyBanner,
  clientTypeBadge,
} from '@/pages/clinic/hiv-sti/hivStiShared';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import { maskWorklistName } from '@/utils/piiMasking';
import {
  HIV_STI_DOCTORS,
  getHivStiQueueRows,
  getHivStiScheduledNotArrived,
  checkInHivStiAppointment,
  canEditHivSti,
} from '@/data/hivStiVisits';
import { withDoctorAvatars } from '@/pages/appointment/appointmentDoctorRoster';

/* HivStiQueuePage — คิวการรักษาคลินิก HIV/STI (TOR 1.10.6.2 + .1).
   Mirrors AncQueuePage's queue mechanics (tabs / search / filters /
   column sort / pagination / check-in from appointments — legacy HCIS
   manual §2.1's three-strip worklist) with two §1.4.2 differences:

     1. The whole body sits behind HivStiConfidentialGate — first entry
        per session re-authenticates before any client data renders.
     2. Every row is masked: the client is identified by UIC code +
        ชื่อย่อ; the full name reveals per-cell through PrivacyRevealPopup
        (audited). Search still matches on the real fields (staff who
        already passed the gate may look up by HN / ชื่อ / เลขบัตร) but
        suggestions render the masked identity only. */

const breadcrumb = ['ระบบบันทึกการรักษา', 'คลินิก HIV/STI'];
const SUMMARY_TITLE = 'คิวการรักษา — งาน HIV และโรคติดต่อทางเพศสัมพันธ์';

const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:hiv-sti-queue';
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
  progress: { style: 'orange', label: 'กำลังตรวจ'     },
  done:     { style: 'teal',   label: 'ตรวจเสร็จแล้ว' },
  draft:    { style: 'grey',   label: 'ที่ร่างไว้'    },
};

const STATUS_SORT_ORDER = { waiting: 0, progress: 1, done: 2, draft: 3 };

const FILTER_OPTIONS = {
  doctor: [
    { value: 'all', label: 'ทุกคน' },
    ...HIV_STI_DOCTORS.map((d) => ({ value: d, label: d })),
  ],
  clientType: [
    { value: 'all', label: 'ทุกประเภท' },
    { value: 'new', label: 'รายใหม่' },
    { value: 'old', label: 'รายเก่า' },
  ],
  time: [
    { value: 'all',       label: 'ทั้งวัน'                 },
    { value: 'morning',   label: 'ช่วงเช้า (06:00–12:00)' },
    { value: 'afternoon', label: 'ช่วงบ่าย (12:00–18:00)' },
    { value: 'evening',   label: 'ช่วงเย็น (18:00–24:00)' },
  ],
};
const FILTER_DEFAULTS = {
  doctor: 'all',
  clientType: 'all',
  dateValue: { quick: 'today' },
  time: 'all',
};
const DATE_CHIP_LABELS = { today: 'วันนี้', yesterday: 'เมื่อวาน' };

const renderQueue = (row) => (
  <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{row.queue}</ColorfulBadge>
);

/* §1.4.2 — the row identity is UIC + ชื่อย่อ; the avatar renders initials
   only (noProfilePhoto) so a portrait can't leak identity to onlookers.
   The full name reveals per-cell through MaskedWorklistName + PrivacyRevealPopup. */
const renderClient = (row) => (
  <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-200, 8px)' }}>
    <QueuePatientAvatar
      {...resolveQueuePatientAvatarProps({ hn: row.hn, displayName: row.name, noProfilePhoto: true })}
      size={32}
    />
    <div className='flex flex-col min-w-0'>
      <span
        className='truncate'
        style={{ fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default, #363B3F)' }}
      >
        {row.uic}
      </span>
      <MaskedWorklistName
        name={row.name}
        recordKey={row.hn || row.uic}
        fieldLabel='ชื่อ-นามสกุล ของผู้รับบริการ'
        className='truncate'
        style={{ fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default, #363B3F)' }}
      />
    </div>
  </div>
);

const renderClientType = (row) => {
  const badge = clientTypeBadge(row.clientType);
  return <ColorfulBadge style={badge.style} size='small' hierarchy='secondary'>{badge.label}</ColorfulBadge>;
};

/* Telemedicine (TOR 1.10.6.7) — a real affordance, not decoration: the
   badge counts down to the appointment and opens the consult overlay via
   the global TelemedCallProvider, same as MentalHealthQueuePage. */
const renderTelemedicine = (row) => (
  row.telemedicine
    ? <TelemedicineQueueBadge appointmentAt={row.telemedAppointmentAt} visitId={row.hn} />
    : null
);

const queueRowToSearchItem = (row) => ({
  id: row.hn,
  /* Masked identity only — search history + suggestion rows must not
     display the full name (§1.4.2). */
  label: `${row.uic} · ${maskWorklistName(row.name)}`,
  sublabel: row.doctor,
  value: row.uic,
  badges: [
    { label: row.queue, tone: 'teal' },
    { label: row.hn, tone: 'indigo' },
  ],
});

const HivStiQueuePage = () => {
  const history = useHistory();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  /* sessionStorage writes (check-in) are not React state — tick forces
     re-derive, same contract as AncQueuePage. */
  const [tick, setTick] = useState(0);
  const readOnlyRole = !canEditHivSti();

  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: [] });

  const setFilter = (key) => (val) => setFilters((f) => ({ ...f, [key]: val }));
  const isAllDefault =
    filters.doctor === FILTER_DEFAULTS.doctor &&
    filters.clientType === FILTER_DEFAULTS.clientType &&
    filters.dateValue.quick === FILTER_DEFAULTS.dateValue.quick &&
    filters.time === FILTER_DEFAULTS.time;

  const filtersActive = !isAllDefault || searchQ.trim() !== '';
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(filtersActive, () => {
    setFilters(FILTER_DEFAULTS);
    setSearchQ('');
    setPage(1);
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => getHivStiQueueRows(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scheduledNotArrived = useMemo(() => getHivStiScheduledNotArrived(), [tick]);
  const tabs = useMemo(() => buildTabs(rows, scheduledNotArrived.length), [rows, scheduledNotArrived]);

  const handleCheckIn = (hn) => {
    checkInHivStiAppointment(hn);
    setTick((t) => t + 1);
    setActiveTab('waiting');
  };

  const summaryCards = useMemo(() => ([
    { key: 'total',   label: 'คิวทั้งหมดวันนี้',   value: rows.length, color: 'info', icon: 'directions_walk' },
    { key: 'waiting', label: 'รอตรวจ',             value: rows.filter((p) => p.statusKey === 'waiting').length, color: 'inprogress', icon: 'schedule' },
    { key: 'new',     label: 'ผู้รับบริการรายใหม่', value: rows.filter((p) => p.clientType === 'new').length, color: 'info', icon: 'assignment_add' },
    { key: 'done',    label: 'ตรวจเสร็จแล้ว',      value: rows.filter((p) => p.statusKey === 'done').length, color: 'positive', icon: 'check_circle' },
  ]), [rows]);

  /* Search matches the REAL fields (HN / ชื่อ / เลขบัตร / UIC / คิว) —
     display stays masked; matching is how staff find the right row. */
  const rowSearchFields = (row) => [row.queue, row.hn, row.name, row.uic, row.nationalId, row.doctor];

  const filtered = useMemo(() => {
    if (activeTab === 'scheduled') return [];
    let result = rows;
    const tabPred = TAB_STATUS_FILTER[activeTab];
    if (tabPred) result = result.filter(tabPred);
    if (filters.doctor !== 'all') result = result.filter((r) => r.doctor === filters.doctor);
    if (filters.clientType !== 'all') result = result.filter((r) => r.clientType === filters.clientType);
    /* date / time chips are visual placeholders — rows carry no visit-date
       field yet (same note as OPD/ANC queue pages). */
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      result = result.filter((row) => rowSearchFields(row).some((f) => f && String(f).toLowerCase().includes(q)));
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filters, searchQ, tick]);

  const sortedRows = useMemo(() => {
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    const arrivalCompare = (a, b) => String(a.queue).localeCompare(String(b.queue));
    if (!sortConfig.key) return [...filtered].sort(arrivalCompare);

    const NUMERIC_KEYS = ['status', 'wait'];
    const normalize = (row, key) => {
      switch (key) {
        case 'status': return STATUS_SORT_ORDER[row.statusKey] ?? 99;
        case 'wait':   return row.waitMinutes ?? 0;
        case 'client': return row.uic ?? '';
        case 'clientType': return row.clientType ?? '';
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

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleTabChange = (key) => {
    setActiveTab(key);
    setPage(1);
  };

  /* ตรวจเสร็จแล้ว opens read-only (legacy §2.1 — a closed encounter is not
     editable from the queue); everything else opens the live form. */
  const openRecord = (row) => history.push({
    pathname: '/clinic/hiv-sti/record',
    state: { hn: row.hn, queue: row.queue, readOnly: row.statusKey === 'done' },
  });

  const resolveSearchRow = (query, item) => {
    if (item?.id) {
      const byId = rows.find((row) => row.hn === item.id);
      if (byId) return byId;
    }
    const q = (query ?? item?.value ?? item?.label ?? '').toString().trim().toLowerCase();
    if (!q) return null;
    return rows.find((row) => rowSearchFields(row).some((f) => f && String(f).toLowerCase().includes(q))) ?? null;
  };

  const searchSuggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    const matches = [];
    const seen = new Set();
    for (const row of rows) {
      if (matches.length >= 8) break;
      if (seen.has(row.hn)) continue;
      if (rowSearchFields(row).some((f) => f && String(f).toLowerCase().includes(q))) {
        seen.add(row.hn);
        matches.push(queueRowToSearchItem(row));
      }
    }
    return matches;
  }, [searchQ, rows]);

  const clearAllFilters = () => {
    setFilters(FILTER_DEFAULTS);
    setSearchQ('');
    setPage(1);
  };

  const renderStatus = (row) => {
    const badge = STATUS_BADGE[row.statusKey] || STATUS_BADGE.waiting;
    return <ColorfulBadge style={badge.style} size='small' hierarchy='secondary'>{badge.label}</ColorfulBadge>;
  };

  /* เปิดหน้าติดตามการดูแลของรายนี้โดยตรง (navState.hn → detail state) */
  const openFollowUp = (row) => history.push({
    pathname: '/clinic/hiv-sti/follow-up',
    state: { hn: row.hn },
  });

  const renderActions = (row) => (
    <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
      {row.statusKey === 'done' ? (
        <NeutralSubdueButton
          size='sm'
          leadingIcon='visibility'
          onClick={(e) => { e.stopPropagation(); openRecord(row); }}
        >
          ดูบันทึก
        </NeutralSubdueButton>
      ) : (
        <BrandSubdueButton
          variant='outline'
          size='sm'
          leadingIcon={row.statusKey === 'draft' ? 'edit_note' : 'assignment'}
          onClick={(e) => { e.stopPropagation(); openRecord(row); }}
        >
          {row.statusKey === 'draft' ? 'ทำต่อจากร่าง' : 'เปิดบันทึก'}
        </BrandSubdueButton>
      )}
      <NeutralSubdueButton
        size='sm'
        leadingIcon='monitoring'
        onClick={(e) => { e.stopPropagation(); openFollowUp(row); }}
      >
        ติดตาม
      </NeutralSubdueButton>
    </div>
  );

  const columns = useMemo(() => ([
    { key: 'queue',      label: 'คิว',  render: renderQueue },
    { key: 'hn',         label: 'HN'  },
    { key: 'client',     label: 'ผู้รับบริการ (UIC)', flex: true, minWidth: 200, render: renderClient },
    { key: 'clientType', label: 'ประเภท',  render: renderClientType },
    { key: 'visitReason', label: 'เหตุผลการมารับบริการ', flex: true, minWidth: 180 },
    { key: 'telemed',    label: 'Telemedicine', align: 'center', sortable: false, render: renderTelemedicine },
    { key: 'room',       label: 'ห้อง' },
    { key: 'doctor',     label: 'แพทย์ผู้ตรวจ',    flex: true, minWidth: 140 },
    { key: 'wait',       label: 'รอนาน',  render: (r) => (r.waitMinutes ? `${r.waitMinutes} นาที` : '—') },
    { key: 'status',     label: 'สถานะ', render: renderStatus },
    { key: 'actions',    label: 'การดำเนินการ', sortable: false, render: renderActions },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [tick]);

  const scheduledColumns = useMemo(() => ([
    { key: 'appointmentTime', label: 'เวลานัด' },
    { key: 'hn',              label: 'HN' },
    { key: 'client',          label: 'ผู้รับบริการ (UIC)', flex: true, minWidth: 200, render: renderClient },
    { key: 'clientType',      label: 'ประเภท', render: renderClientType },
    { key: 'visitReason',     label: 'เหตุผลการนัด',    flex: true, minWidth: 180 },
    { key: 'clinic',          label: 'คลินิก' },
    { key: 'doctor',          label: 'แพทย์ผู้ตรวจ',    flex: true, minWidth: 140 },
    {
      key: 'checkin', label: 'การดำเนินการ', sortable: false,
      render: (row) => (readOnlyRole ? null : (
        <BrandSubdueButton variant='fill' size='sm' leadingIcon='login' onClick={(e) => { e.stopPropagation(); handleCheckIn(row.hn); }}>
          ส่งตรวจ
        </BrandSubdueButton>
      )),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [readOnlyRole]);

  /* Empty states — queue truly empty (no rows at all today) vs. search /
     filter came up empty. Different message + different CTA each. */
  const queueEmptyToday = rows.length === 0;
  const emptySearchState = !queueEmptyToday && sortedRows.length === 0;

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
      <HivStiConfidentialGate>
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
              background: 'var(--surface-card-100, #FFFFFF)',
              borderRadius: 'var(--dim-radius-500, 16px)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
              boxShadow: 'var(--shadow-card-strong)',
              paddingTop: 'var(--dim-space-600, 24px)',
              paddingBottom: 'var(--dim-space-600, 24px)',
              paddingLeft: 'var(--dim-space-600, 24px)',
              paddingRight: 'var(--dim-space-600, 24px)',
              gap: 'var(--dim-space-600, 24px)',
            }}
          >
            {readOnlyRole && (
              <ReadOnlyBanner>
                บัญชีของคุณไม่มีสิทธิบันทึกข้อมูลคลินิก HIV/STI — เปิดดูได้อย่างเดียว
                ติดต่อผู้ดูแลระบบเพื่อขอสิทธิเพิ่มเติม
              </ReadOnlyBanner>
            )}

            <div className='w-full flex items-start justify-center'>
              <PrimarySearch
                value={searchQ}
                onChange={setSearchQ}
                onSubmit={(label, item) => {
                  setSearchQ(label);
                  const match = resolveSearchRow(label, item);
                  pushHistory(match ? queueRowToSearchItem(match) : (item ?? label));
                  if (match) openRecord(match);
                }}
                suggestions={searchSuggestions}
                history={searchHistory}
                onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
                placeholder='ค้นหาคิว / HN / ชื่อ-สกุล / เลขบัตรประชาชน / UIC'
                width={640}
              />
            </div>

            <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
                <FilterDropdown prefix='แพทย์:' options={withDoctorAvatars(FILTER_OPTIONS.doctor)} value={filters.doctor} onChange={setFilter('doctor')} />
                <FilterDropdown prefix='ประเภท:' options={FILTER_OPTIONS.clientType} value={filters.clientType} onChange={setFilter('clientType')} />
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
              {/* Cross-page entries — ทะเบียนผู้รับบริการ (1.10.6.6) และ
                  ติดตามการดูแล (1.10.6.8) อยู่ในโมดูลเดียวกัน */}
              <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <NeutralSubdueButton
                  size='sm'
                  leadingIcon='badge'
                  onClick={() => history.push('/clinic/hiv-sti/registry')}
                >
                  ทะเบียนผู้รับบริการ
                </NeutralSubdueButton>
                <BrandSubdueButton
                  variant='outline'
                  size='sm'
                  leadingIcon='monitoring'
                  onClick={() => history.push('/clinic/hiv-sti/follow-up')}
                >
                  ติดตามการดูแล
                </BrandSubdueButton>
              </div>
            </div>

            {activeTab === 'scheduled' ? (
              <Table
                columns={scheduledColumns}
                rows={scheduledNotArrived}
                rowKey={(row) => row.hn}
                emptyMessage='ไม่มีนัดหมายที่ยังไม่มาติดต่อวันนี้'
              />
            ) : (
              <SmoothFilterResults opaque={resultsOpaque}>
                <>
                  <SearchResultCount found={sortedRows.length} total={rows.length} />
                  {queueEmptyToday ? (
              <div
                className='flex flex-col items-center text-center w-full'
                style={{
                  paddingTop: 'var(--dim-space-700, 32px)',
                  paddingBottom: 'var(--dim-space-700, 32px)',
                  gap: 'var(--dim-space-300, 12px)',
                }}
              >
                <Icon name='event_busy' size={40} style={{ color: 'var(--text-content-quaternary, #ADB2B7)' }} />
                <span style={{ fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default, #363B3F)' }}>
                  ยังไม่มีคิวการรักษาวันนี้
                </span>
                <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
                  เริ่มจากลงทะเบียนผู้รับบริการใหม่ หรือรอ check-in จากนัดหมาย
                </span>
                {!readOnlyRole && (
                  <BrandSubdueButton
                    variant='fill'
                    size='sm'
                    leadingIcon='person_add'
                    onClick={() => history.push('/clinic/hiv-sti/registry')}
                  >
                    ลงทะเบียนผู้รับบริการใหม่
                  </BrandSubdueButton>
                )}
              </div>
            ) : emptySearchState ? (
              <div
                className='flex flex-col items-center text-center w-full'
                style={{
                  paddingTop: 'var(--dim-space-700, 32px)',
                  paddingBottom: 'var(--dim-space-700, 32px)',
                  gap: 'var(--dim-space-300, 12px)',
                }}
              >
                <Icon name='search_off' size={40} style={{ color: 'var(--text-content-quaternary, #ADB2B7)' }} />
                <span style={{ fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default, #363B3F)' }}>
                  ไม่พบผู้รับบริการ
                </span>
                <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
                  ไม่พบรายการที่ตรงกับคำค้นหรือตัวกรองปัจจุบัน
                </span>
              </div>
            ) : (
              <>
                <Table
                  columns={columns}
                  rows={pageRows}
                  rowKey={(row) => row.hn}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  onRowClick={openRecord}
                  stickyColCount={3}
                  stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                  emptyMessage='ไม่พบรายการ'
                />

                <div
                  className='flex items-center w-full'
                  style={{
                    gap: 'var(--dim-space-200, 8px)',
                    position: 'sticky',
                    bottom: 'var(--dim-space-0)',
                    zIndex: 50,
                    background: 'var(--surface-card-100, #FFFFFF)',
                    paddingTop: 'var(--dim-space-200, 8px)',
                    borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
                  }}
                >
                  <span style={{ color: 'var(--text-content-secondary, #636B72)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)' }}>
                    {`แสดง ${rangeStart}–${rangeEnd} จาก ${sortedRows.length} รายการ`}
                  </span>
                  <div className='flex-1' />
                  <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
                </div>
              </>
            )}
                </>
              </SmoothFilterResults>
            )}
          </div>
        </div>
      </HivStiConfidentialGate>
    </QueuePageShell>
  );
};

export default HivStiQueuePage;
