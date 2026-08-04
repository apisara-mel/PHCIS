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
import TelemedicineQueueBadge from '@/components/telemed/TelemedicineQueueBadge';
import Textarea from '@/components/forms/Textarea';
import Popup from '@/components/popup/Popup';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  MH_DOCTORS,
  getMhQueueRows,
  getMhScheduledNotArrived,
  checkInMhAppointment,
  cancelMhQueue,
  restoreMhQueue,
  getMhQueueCancellation,
  resolveMhWatchLevel,
  hasMentalHealthRights,
  formatMhDateTime,
} from '@/data/mentalHealthClinic';

/* MentalHealthQueuePage — คิวคลินิกสุขภาพจิต (TOR 1.10.3.1 / 1.10.3.2).
   Mechanics mirror AncQueuePage verbatim (search + filter row + sort +
   pagination + per-tab status split), vocabulary from legacy HCIS
   คู่มือระบบสุขภาพจิต §2.1-2.2: ค้นหาผู้ป่วยด้วย HN / CID / ชื่อ-สกุล,
   ลำดับคิวซักประวัติ split into ลงทะเบียนส่งตรวจแล้ว (waiting/progress)
   · ผู้ป่วยนัดที่ยังไม่มาติดต่อ (scheduled tab + ส่งตรวจ check-in) ·
   ตรวจเสร็จแล้ว (done). ยกเลิกคิว keeps its audit line (ผู้ยกเลิก + เวลา
   + เหตุผล) and stays restorable, per playbook §5. */

const breadcrumb = ['ระบบบันทึกการรักษา', 'งานสุขภาพจิต'];
const SUMMARY_TITLE = 'คิวคลินิกสุขภาพจิต';

const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:mental-health-queue';
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
const WATCH_SORT_ORDER = { suicideRisk: 0, monitor: 1, normal: 2 };

const FILTER_OPTIONS = {
  watch: [
    { value: 'all',         label: 'ทุกระดับ' },
    { value: 'suicideRisk', label: 'เสี่ยงฆ่าตัวตาย' },
    { value: 'monitor',     label: 'เฝ้าระวังซึมเศร้า' },
    { value: 'normal',      label: 'ปกติ' },
  ],
  doctor: [
    { value: 'all', label: 'ทุกคน' },
    ...MH_DOCTORS.map((d) => ({ value: d, label: d })),
  ],
  visitType: [
    { value: 'all',      label: 'ทุกประเภท' },
    { value: 'first',    label: 'ตรวจครั้งแรก' },
    { value: 'followup', label: 'ตรวจติดตาม' },
  ],
  time: [
    { value: 'all',       label: 'ทั้งวัน'                 },
    { value: 'morning',   label: 'ช่วงเช้า (06:00–12:00)' },
    { value: 'afternoon', label: 'ช่วงบ่าย (12:00–18:00)' },
    { value: 'evening',   label: 'ช่วงเย็น (18:00–24:00)' },
  ],
};
const FILTER_DEFAULTS = {
  watch: 'all',
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
    to={{ pathname: '/clinic/mental-health/record', state: { hn: row.hn, queue: row.queue, name: row.name } }}
    className='min-w-0 flex-1 truncate hover:underline'
    style={{ color: 'var(--text-neutral-default)', fontWeight: 'var(--type-weight-medium)', textDecoration: 'none' }}
    onClick={(e) => e.stopPropagation()}
  >
    {row.name}
  </Link>
);

/* ระดับการเฝ้าระวัง — the queue-level suicide-watch signal (ผล 9Q ≥ 7 หรือ
   8Q > 0 ครั้งล่าสุด). Assessment-derived, so it is ข้อมูลลับ (§1.4.2):
   without mental-health-clinic rights the column shows a lock, not the
   level. */
const renderWatchLevel = (row) => {
  if (!hasMentalHealthRights()) {
    return <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ข้อมูลลับ</ColorfulBadge>;
  }
  const watch = resolveMhWatchLevel(row);
  return (
    <ColorfulBadge style={watch.style} size='small' hierarchy='secondary'>{watch.label}</ColorfulBadge>
  );
};

const renderTelemedicine = (row) => (
  row.telemedicine
    ? <TelemedicineQueueBadge appointmentAt={row.telemedAppointmentAt} visitId={row.hn} />
    : null
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

const MentalHealthQueuePage = () => {
  const history = useHistory();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  /* Bumped after check-in / cancel / restore — sessionStorage writes are
     not React state, so nothing else re-derives the table. */
  const [tick, setTick] = useState(0);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: [] });

  const setFilter = (key) => (val) => setFilters((f) => ({ ...f, [key]: val }));
  const isAllDefault =
    filters.watch === FILTER_DEFAULTS.watch &&
    filters.doctor === FILTER_DEFAULTS.doctor &&
    filters.visitType === FILTER_DEFAULTS.visitType &&
    filters.dateValue.quick === FILTER_DEFAULTS.dateValue.quick &&
    filters.time === FILTER_DEFAULTS.time;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => getMhQueueRows(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scheduledNotArrived = useMemo(() => getMhScheduledNotArrived(), [tick]);
  const tabs = useMemo(() => buildTabs(rows, scheduledNotArrived.length), [rows, scheduledNotArrived]);

  const handleCheckIn = (hn) => {
    checkInMhAppointment(hn);
    setTick((t) => t + 1);
    setActiveTab('waiting');
  };

  const summaryCards = useMemo(() => ([
    { key: 'total',    label: 'คิวทั้งหมดวันนี้',   value: rows.length, color: 'info', icon: 'directions_walk' },
    { key: 'first',    label: 'ตรวจครั้งแรก',       value: rows.filter((p) => p.visitType === 'first').length, color: 'info', icon: 'assignment_add' },
    { key: 'followup', label: 'ตรวจติดตาม',         value: rows.filter((p) => p.visitType === 'followup').length, color: 'positive', icon: 'history' },
    { key: 'watch',    label: 'เสี่ยงฆ่าตัวตาย (เฝ้าระวัง)', value: rows.filter((p) => resolveMhWatchLevel(p).key === 'suicideRisk').length, color: 'negative', icon: 'e911_emergency' },
  ]), [rows]);

  const filtered = useMemo(() => {
    if (activeTab === 'scheduled') return [];
    let result = rows;
    const tabPred = TAB_STATUS_FILTER[activeTab];
    if (tabPred) result = result.filter(tabPred);
    if (filters.watch !== 'all') result = result.filter((r) => resolveMhWatchLevel(r).key === filters.watch);
    if (filters.doctor !== 'all') result = result.filter((r) => r.doctor === filters.doctor);
    if (filters.visitType !== 'all') result = result.filter((r) => r.visitType === filters.visitType);
    /* date / time chips are visual placeholders — rows carry no visit-date
       field yet, same note as OPD/ANC queue pages. */
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      result = result.filter((row) =>
        [row.queue, row.hn, row.cid, row.name, row.mhNumber, row.doctor].some((f) => f && f.toLowerCase().includes(q)),
      );
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filters, searchQ, tick]);

  const sortedRows = useMemo(() => {
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    const arrivalCompare = (a, b) => String(a.queue).localeCompare(String(b.queue));
    if (!sortConfig.key) return [...filtered].sort(arrivalCompare);

    const NUMERIC_KEYS = ['status', 'watch', 'wait'];
    const normalize = (row, key) => {
      switch (key) {
        case 'status': return STATUS_SORT_ORDER[row.statusKey] ?? 99;
        case 'watch':  return WATCH_SORT_ORDER[resolveMhWatchLevel(row).key] ?? 99;
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

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleTabChange = (key) => {
    setActiveTab(key);
    setPage(1);
  };

  const handleRowClick = (row) => history.push({
    pathname: '/clinic/mental-health/record',
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
      [row.queue, row.hn, row.cid, row.name, row.mhNumber, row.doctor].some((f) => f && f.toLowerCase().includes(q)),
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
      if ([row.queue, row.hn, row.cid, row.name, row.mhNumber, row.doctor].some((f) => f && f.toLowerCase().includes(q))) {
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
        : rows.find((row) => [row.queue, row.hn, row.cid, row.name, row.doctor].some((f) => f && f.toLowerCase().includes(q)));
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
    setCancelError('');
    setCancelTarget(row);
  };
  const confirmCancel = () => {
    if (!cancelReason.trim()) {
      setCancelError('กรุณาระบุเหตุผลการยกเลิกคิว');
      return;
    }
    cancelMhQueue(cancelTarget.hn, cancelReason.trim());
    setCancelTarget(null);
    setTick((t) => t + 1);
  };
  const restore = (row) => {
    restoreMhQueue(row.hn);
    setTick((t) => t + 1);
  };

  const renderStatus = (row) => {
    const cancellation = getMhQueueCancellation(row.hn);
    if (cancellation) {
      return (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }} title={`เหตุผล: ${cancellation.reason}`}>
          <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกคิวแล้ว</ColorfulBadge>
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
            โดย {cancellation.by} · {formatMhDateTime(cancellation.at)}
          </span>
        </div>
      );
    }
    const badge = STATUS_BADGE[row.statusKey] || STATUS_BADGE.waiting;
    return <ColorfulBadge style={badge.style} size='small' hierarchy='secondary'>{badge.label}</ColorfulBadge>;
  };

  const renderActions = (row) => {
    const cancellation = getMhQueueCancellation(row.hn);
    return cancellation ? (
      <BrandSubdueButton
        variant='outline'
        size='sm'
        leadingIcon='restart_alt'
        onClick={(e) => { e.stopPropagation(); restore(row); }}
      >
        คืนคิว
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

  /* สิทธิ column — expired rights keep their row (save still allowed per
     ANC/OPD behaviour) but flag the payer state. */
  const renderInsurance = (row) => (
    row.rightsExpired ? (
      <ColorfulBadge style='orange' size='small' hierarchy='secondary'>{row.insurance}</ColorfulBadge>
    ) : row.insurance
  );

  const columns = useMemo(() => ([
    { key: 'queue',    label: 'คิว',              width: 72,  render: renderQueue },
    { key: 'hn',       label: 'HN',               width: 96 },
    { key: 'name',     label: 'ชื่อ-นามสกุล',      flex: true, minWidth: 160, render: renderName },
    { key: 'sex',      label: 'เพศ',              width: 64 },
    { key: 'age',      label: 'อายุ',             width: 72 },
    { key: 'cid',      label: 'เลขบัตรประชาชน',    width: 140 },
    { key: 'insurance', label: 'สิทธิ',            width: 150, render: renderInsurance },
    { key: 'mhNumber', label: 'เลขที่สุขภาพจิต',   width: 120, render: (r) => r.mhNumber || '—' },
    { key: 'chiefComplaint', label: 'อาการสำคัญ',  flex: true, minWidth: 200 },
    { key: 'watch',    label: 'ระดับการเฝ้าระวัง', width: 150, render: renderWatchLevel },
    { key: 'doctor',   label: 'แพทย์',            flex: true, minWidth: 150 },
    { key: 'telemed',  label: 'Telemedicine',     width: 128, align: 'center', sortable: false, render: renderTelemedicine },
    { key: 'wait',     label: 'รอนาน',            width: 90,  render: (r) => (r.waitMinutes ? `${r.waitMinutes} นาที` : '—') },
    { key: 'status',   label: 'สถานะ',            width: 170, render: renderStatus },
    { key: 'actions',  label: 'การดำเนินการ',      width: 140, sortable: false, render: renderActions },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [tick]);

  /* ผู้ป่วยนัดที่ยังไม่มาติดต่อ (manual §2.2 tab 2) — a different row shape
     (เวลานัด instead of queue/wait/status), so its own columns + ส่งตรวจ. */
  const scheduledColumns = useMemo(() => ([
    { key: 'appointmentTime', label: 'เวลานัด',      width: 90 },
    { key: 'hn',              label: 'HN',           width: 96 },
    { key: 'name',            label: 'ชื่อ-นามสกุล',  flex: true, minWidth: 160 },
    { key: 'cid',             label: 'เลขบัตรประชาชน', width: 140 },
    { key: 'insurance',       label: 'สิทธิ',         width: 150 },
    { key: 'mhNumber',        label: 'เลขที่สุขภาพจิต', width: 120, render: (r) => r.mhNumber || '—' },
    { key: 'chiefComplaint',  label: 'นัดหมายเรื่อง', flex: true, minWidth: 200 },
    { key: 'doctor',          label: 'แพทย์',        flex: true, minWidth: 150 },
    {
      key: 'checkin', label: 'การดำเนินการ', width: 130, sortable: false,
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
      title='คลินิกสุขภาพจิต'
      actions={(
        <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <BrandSubdueButton
            variant='outline'
            leadingIcon='contact_page'
            onClick={() => history.push('/clinic/mental-health/registry')}
          >
            ทะเบียนสุขภาพจิต
          </BrandSubdueButton>
          <BrandSubdueButton
            variant='outline'
            leadingIcon='monitoring'
            onClick={() => history.push('/clinic/mental-health/follow-up')}
          >
            ติดตามผลการดูแล
          </BrandSubdueButton>
        </div>
      )}
      summaryTitle={SUMMARY_TITLE}
      summaryCards={summaryCards}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title='ยกเลิกคิวตรวจสุขภาพจิต'
        subtitle={cancelTarget ? `${cancelTarget.name} · HN: ${cancelTarget.hn} · คิว ${cancelTarget.queue}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันยกเลิกคิว', onClick: confirmCancel, tone: 'danger' }}
      >
        <Textarea
          label='เหตุผลการยกเลิก'
          required
          value={cancelReason}
          onChange={(v) => { setCancelReason(v); if (v.trim()) setCancelError(''); }}
          error={cancelError || undefined}
          placeholder='เช่น ผู้รับบริการขอเลื่อนนัด / มาผิดคลินิก / กลับก่อนพบแพทย์'
        />
      </Popup>

      <div className='flex flex-col flex-1 min-w-0' style={{ paddingTop: 'var(--dim-space-600, 24px)', paddingBottom: 'var(--dim-space-600, 24px)', paddingLeft: 'var(--dim-space-600, 24px)', paddingRight: 'var(--dim-space-600, 24px)', gap: 'var(--dim-space-600, 24px)' }}>
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
              placeholder='ค้นหา HN / เลขบัตรประชาชน / ชื่อ-สกุลผู้รับบริการ / เลขที่สุขภาพจิต'
              width={640}
              avatars={searchAvatars}
            />
          </div>

          <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
              <FilterTag value='ทั้งหมด' selected={isAllDefault} onClick={() => setFilters(FILTER_DEFAULTS)} />
              <FilterDropdown prefix='เฝ้าระวัง:' options={FILTER_OPTIONS.watch} value={filters.watch} onChange={setFilter('watch')} />
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
                emptyMessage='ไม่พบรายการที่ตรงกับการค้นหา / ตัวกรอง'
              />

              <div
                className='flex items-center w-full'
                style={{
                  gap: 'var(--dim-space-200, 8px)',
                  position: 'sticky',
                  bottom: 'var(--dim-space-0, 0px)',
                  zIndex: 50,
                  background: 'var(--surface-card-100, #FFFFFF)',
                  paddingTop: 'var(--dim-space-200, 8px)',
                  borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
                }}
              >
                <span style={{ color: 'var(--text-content-secondary, #636B72)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
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

export default MentalHealthQueuePage;
