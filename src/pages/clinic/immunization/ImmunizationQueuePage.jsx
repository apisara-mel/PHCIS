import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
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
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import Textarea from '@/components/forms/Textarea';
import Popup from '@/components/popup/Popup';
import Icon from '@/components/icons/Icon';
import {
  IMM_DOCTORS,
  getImmQueueRows,
  getImmScheduledNotArrived,
  checkInImmAppointment,
  cancelImmQueue,
  restoreImmQueue,
  getImmQueueCancellation,
  getImmNextAppointment,
  getDueVaccineLabels,
  summarizeEpi,
  hasImmunizationRights,
  setImmunizationRights,
  formatImmDate,
  formatImmDateTime,
} from '@/data/immunizationClinic';

/* ImmunizationQueuePage — คิวคลินิกสุขภาพเด็กดี (TOR 1.10.9.1 / 1.10.9.2).
   โครงเดียวกับ MentalHealthQueuePage / AncQueuePage (search + filter row +
   sort + pagination + per-tab status split) แต่คำศัพท์ตามคู่มือ HCIS
   งานสร้างเสริมภูมิคุ้มกันโรค บทที่ 2: แท็บ "รายชื่อลงทะเบียนส่งตรวจแล้ว" /
   "ผู้ป่วยนัดที่ยังไม่มาติดต่อ" / "รายชื่อตรวจเสร็จแล้ว".

   คอลัมน์ตามคู่มือ: วัน-เวลามาตรวจ · HN · ชื่อ-สกุล · อายุ (ป-ด-ว) · ลำดับคิว ·
   วัคซีนที่ถึงกำหนดวันนี้ · สถานะ — บวกข้อมูลทั่วไปผู้รับบริการ (สิทธิ,
   เลขบัตร) ที่ TOR 1.10.9.1 บังคับให้เห็นตั้งแต่ระดับ worklist. */

const breadcrumb = ['ระบบบันทึกการรักษา', 'งานสร้างเสริมภูมิคุ้มกัน'];
const SUMMARY_TITLE = 'คิวคลินิกสุขภาพเด็กดี';
const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:immunization-queue';
const PAGE_SIZE = 20;
const RECORD_PATH = '/clinic/immunization/record';

const buildTabs = (rows, scheduledCount) => [
  { key: 'all',        label: 'ทั้งหมด',                  icon: 'group',           count: rows.length },
  { key: 'registered', label: 'ลงทะเบียนส่งตรวจแล้ว',      icon: 'how_to_reg',      count: rows.filter((p) => p.statusKey === 'waiting' || p.statusKey === 'progress').length },
  { key: 'done',       label: 'ตรวจเสร็จแล้ว',            icon: 'check_circle',    count: rows.filter((p) => p.statusKey === 'done').length },
  { key: 'draft',      label: 'ที่ร่างไว้',                icon: 'save',            count: rows.filter((p) => p.statusKey === 'draft').length },
  { key: 'scheduled',  label: 'นัดแล้วยังไม่มาติดต่อ',     icon: 'event_available', count: scheduledCount },
];

const TAB_STATUS_FILTER = {
  registered: (r) => r.statusKey === 'waiting' || r.statusKey === 'progress',
  done:       (r) => r.statusKey === 'done',
  draft:      (r) => r.statusKey === 'draft',
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
    ...IMM_DOCTORS.map((d) => ({ value: d, label: d })),
  ],
  status: [
    { value: 'all',      label: 'ทุกสถานะ' },
    { value: 'waiting',  label: 'รอตรวจ' },
    { value: 'progress', label: 'กำลังตรวจ' },
    { value: 'done',     label: 'ตรวจเสร็จแล้ว' },
    { value: 'draft',    label: 'ที่ร่างไว้' },
  ],
  epi: [
    { value: 'all',      label: 'ทุกสถานะวัคซีน' },
    { value: 'overdue',  label: 'ค้างเข็ม (เกินกำหนด)' },
    { value: 'due',      label: 'ถึงกำหนดวันนี้' },
    { value: 'complete', label: 'ครบตามเกณฑ์' },
  ],
  ageGroup: [
    { value: 'all',     label: 'ทุกช่วงอายุ' },
    { value: 'infant',  label: 'แรกเกิด – 1 ปี' },
    { value: 'toddler', label: '1 – 3 ปี' },
    { value: 'preschool', label: '3 ปีขึ้นไป' },
  ],
};

const FILTER_DEFAULTS = {
  doctor: 'all',
  status: 'all',
  epi: 'all',
  ageGroup: 'all',
  dateValue: { quick: 'today' },
};

const DATE_CHIP_LABELS = { today: 'วันนี้', yesterday: 'เมื่อวาน' };

const ageGroupOf = (row) => {
  const years = Number(String(row.age).split(' ')[0]) || 0;
  if (years < 1) return 'infant';
  if (years < 3) return 'toddler';
  return 'preschool';
};

const renderQueue = (row) => (
  <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{row.queue}</ColorfulBadge>
);

const renderName = (row) => (
  <MaskedWorklistName
    name={row.name}
    recordKey={row.hn || row.queue}
    linkTo={{ pathname: RECORD_PATH, state: { hn: row.hn, queue: row.queue, name: row.name, statusKey: row.statusKey } }}
  />
);

const renderTelemedicine = (row) => (
  row.telemedicine
    ? <TelemedicineQueueBadge appointmentAt={row.telemedAppointmentAt} visitId={row.hn} />
    : null
);

const renderDueVaccines = (row) => {
  const labels = getDueVaccineLabels(row.hn);
  if (labels.length === 0) {
    return <ColorfulBadge style='green' size='small' hierarchy='secondary'>ไม่มีเข็มถึงกำหนด</ColorfulBadge>;
  }
  return (
    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100, 4px)' }}>
      {labels.map((l) => (
        <ColorfulBadge key={l} style='orange' size='small' hierarchy='secondary'>{l}</ColorfulBadge>
      ))}
    </div>
  );
};

const renderEpiStatus = (row) => {
  const s = summarizeEpi(row.hn);
  return <ColorfulBadge style={s.style} size='small' hierarchy='secondary'>{s.label}</ColorfulBadge>;
};

const renderInsurance = (row) => (
  row.rightsExpired
    ? <ColorfulBadge style='orange' size='small' hierarchy='secondary'>{row.insurance}</ColorfulBadge>
    : row.insurance
);

const queueRowToSearchItem = (row) => ({
  id: row.hn,
  label: row.name,
  sublabel: `${row.ageShort} · ${row.doctor}`,
  value: row.name,
  badges: [
    { label: row.queue, tone: 'teal' },
    { label: row.hn, tone: 'indigo' },
  ],
});

const ImmunizationQueuePage = () => {
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

  const canWrite = hasImmunizationRights();

  const setFilter = (key) => (val) => setFilters((f) => ({ ...f, [key]: val }));
  const isAllDefault =
    filters.doctor === FILTER_DEFAULTS.doctor
    && filters.status === FILTER_DEFAULTS.status
    && filters.epi === FILTER_DEFAULTS.epi
    && filters.ageGroup === FILTER_DEFAULTS.ageGroup
    && filters.dateValue.quick === FILTER_DEFAULTS.dateValue.quick;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => getImmQueueRows(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scheduledNotArrived = useMemo(() => getImmScheduledNotArrived(), [tick]);
  const tabs = useMemo(() => buildTabs(rows, scheduledNotArrived.length), [rows, scheduledNotArrived]);

  const handleCheckIn = (hn) => {
    checkInImmAppointment(hn);
    setTick((t) => t + 1);
    setActiveTab('registered');
  };

  const summaryCards = useMemo(() => ([
    { key: 'waiting',  label: 'รอตรวจ',        value: rows.filter((p) => p.statusKey === 'waiting').length,  color: 'info',     icon: 'schedule' },
    { key: 'progress', label: 'กำลังตรวจ',     value: rows.filter((p) => p.statusKey === 'progress').length, color: 'warning',  icon: 'vaccines' },
    { key: 'done',     label: 'ตรวจเสร็จแล้ว', value: rows.filter((p) => p.statusKey === 'done').length,     color: 'positive', icon: 'check_circle' },
    { key: 'overdue',  label: 'วัคซีนค้างเข็ม', value: rows.filter((p) => summarizeEpi(p.hn).overdue > 0).length, color: 'negative', icon: 'warning' },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [rows, tick]);

  const filtered = useMemo(() => {
    if (activeTab === 'scheduled') return [];
    let result = rows;
    const tabPred = TAB_STATUS_FILTER[activeTab];
    if (tabPred) result = result.filter(tabPred);
    if (filters.doctor !== 'all') result = result.filter((r) => r.doctor === filters.doctor);
    if (filters.status !== 'all') result = result.filter((r) => r.statusKey === filters.status);
    if (filters.ageGroup !== 'all') result = result.filter((r) => ageGroupOf(r) === filters.ageGroup);
    if (filters.epi !== 'all') {
      result = result.filter((r) => {
        const s = summarizeEpi(r.hn);
        if (filters.epi === 'overdue') return s.overdue > 0;
        if (filters.epi === 'due') return s.due > 0;
        return s.complete;
      });
    }
    /* date chip เป็น placeholder เชิงภาพ — mock ทุกแถวเป็นคิววันนี้ */
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      result = result.filter((row) =>
        [row.queue, row.hn, row.cid, row.name, row.doctor, row.reason].some((f) => f && String(f).toLowerCase().includes(q)),
      );
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filters, searchQ, tick, rows]);

  const sortedRows = useMemo(() => {
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    const arrivalCompare = (a, b) => String(a.queue).localeCompare(String(b.queue));
    if (!sortConfig.key) return [...filtered].sort(arrivalCompare);

    const NUMERIC_KEYS = ['status', 'wait'];
    const normalize = (row, key) => {
      switch (key) {
        case 'status': return STATUS_SORT_ORDER[row.statusKey] ?? 99;
        case 'wait':   return row.waitMinutes ?? 0;
        case 'age':    return row.birthDate ? -new Date(row.birthDate).getTime() : 0;
        default:       return row[key] ?? '';
      }
    };
    const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
    return [...filtered].sort((a, b) => {
      const av = normalize(a, sortConfig.key);
      const bv = normalize(b, sortConfig.key);
      const primary = NUMERIC_KEYS.includes(sortConfig.key) || sortConfig.key === 'age'
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
    pathname: RECORD_PATH,
    state: { hn: row.hn, queue: row.queue, name: row.name, statusKey: row.statusKey },
  });

  const resolveSearchRow = (query, item) => {
    if (item?.id) {
      const byId = rows.find((row) => row.hn === item.id);
      if (byId) return byId;
    }
    const q = (query ?? item?.value ?? item?.label ?? '').toString().trim().toLowerCase();
    if (!q) return null;
    return rows.find((row) =>
      [row.queue, row.hn, row.cid, row.name, row.doctor].some((f) => f && String(f).toLowerCase().includes(q)),
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
      if ([row.queue, row.hn, row.cid, row.name, row.doctor].some((f) => f && String(f).toLowerCase().includes(q))) {
        seen.add(row.hn);
        matches.push(queueRowToSearchItem(row));
      }
    }
    return matches;
  }, [searchQ, rows]);

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
    cancelImmQueue(cancelTarget.hn, cancelReason.trim());
    setCancelTarget(null);
    setTick((t) => t + 1);
  };

  const restore = (row) => {
    restoreImmQueue(row.hn);
    setTick((t) => t + 1);
  };

  const renderStatus = (row) => {
    const cancellation = getImmQueueCancellation(row.hn);
    if (cancellation) {
      return (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }} title={`เหตุผล: ${cancellation.reason}`}>
          <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกคิวแล้ว</ColorfulBadge>
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
            โดย {cancellation.by} · {formatImmDateTime(cancellation.at)}
          </span>
        </div>
      );
    }
    const badge = STATUS_BADGE[row.statusKey] || STATUS_BADGE.waiting;
    const next = getImmNextAppointment(row.hn);
    return (
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
        <ColorfulBadge style={badge.style} size='small' hierarchy='secondary'>{badge.label}</ColorfulBadge>
        {next && (
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
            นัดถัดไป {formatImmDate(next.date)}{next.time ? ` ${next.time} น.` : ''}
          </span>
        )}
      </div>
    );
  };

  const renderActions = (row) => {
    const cancellation = getImmQueueCancellation(row.hn);
    return (
      <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <BrandSubdueButton
          variant='outline'
          size='sm'
          leadingIcon='menu_book'
          onClick={(e) => {
            e.stopPropagation();
            history.push({ pathname: '/clinic/immunization/vaccine-book', state: { hn: row.hn } });
          }}
        >
          สมุดวัคซีน
        </BrandSubdueButton>
        {cancellation ? (
          <BrandSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='restart_alt'
            disabled={!canWrite}
            onClick={(e) => { e.stopPropagation(); if (canWrite) restore(row); }}
          >
            คืนคิว
          </BrandSubdueButton>
        ) : (
          <NeutralSubdueButton
            size='sm'
            leadingIcon='block'
            disabled={!canWrite}
            onClick={(e) => { e.stopPropagation(); if (canWrite) openCancelPopup(row); }}
          >
            ยกเลิกคิว
          </NeutralSubdueButton>
        )}
      </div>
    );
  };

  const columns = useMemo(() => ([
    { key: 'arrivedAt', label: 'วัน-เวลามาตรวจ', render: (r) => formatImmDateTime(r.arrivedAt) },
    { key: 'queue',     label: 'ลำดับคิว', render: renderQueue },
    { key: 'hn',        label: 'HN' },
    { key: 'name',      label: 'ชื่อ-นามสกุล', flex: true, minWidth: 180, render: renderName },
    { key: 'sex',       label: 'เพศ' },
    { key: 'age',       label: 'อายุ (ป-ด-ว)' },
    { key: 'cid',       label: 'เลขบัตรประชาชน' },
    { key: 'insurance', label: 'สิทธิ', flex: true, minWidth: 180, render: renderInsurance },
    { key: 'reason',    label: 'เหตุผลที่มารับบริการ', flex: true, minWidth: 220 },
    { key: 'due',       label: 'วัคซีนที่ถึงกำหนดวันนี้', sortable: false, flex: true, minWidth: 200, render: renderDueVaccines },
    { key: 'epi',       label: 'สถานะ EPI', sortable: false, render: renderEpiStatus },
    { key: 'doctor',    label: 'แพทย์', flex: true, minWidth: 160 },
    { key: 'telemed',   label: 'Telemedicine', align: 'center', sortable: false, render: renderTelemedicine },
    { key: 'wait',      label: 'รอนาน', render: (r) => (r.waitMinutes ? `${r.waitMinutes} นาที` : '—') },
    { key: 'status',    label: 'สถานะ', render: renderStatus },
    { key: 'actions',   label: 'การดำเนินการ', sortable: false, render: renderActions },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [tick, canWrite]);

  const scheduledColumns = useMemo(() => ([
    { key: 'appointmentTime', label: 'เวลานัด' },
    { key: 'hn',              label: 'HN' },
    {
      key: 'name', label: 'ชื่อ-นามสกุล', flex: true, minWidth: 180,
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <MaskedWorklistName name={r.name} recordKey={r.hn} className='truncate' />
          {r.fromVisitRecord && (
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
              นัดจากใบบันทึกการตรวจ{r.bookedBy ? ` · โดย ${r.bookedBy}` : ''}
            </span>
          )}
        </div>
      ),
    },
    { key: 'age',        label: 'อายุ (ป-ด-ว)' },
    { key: 'cid',        label: 'เลขบัตรประชาชน' },
    { key: 'insurance',  label: 'สิทธิ', flex: true, minWidth: 180 },
    { key: 'reason',     label: 'นัดหมายเรื่อง', flex: true, minWidth: 220 },
    { key: 'due',        label: 'วัคซีนที่ถึงกำหนด', sortable: false, flex: true, minWidth: 200, render: renderDueVaccines },
    { key: 'doctor',     label: 'แพทย์', flex: true, minWidth: 160 },
    {
      key: 'checkin', label: 'การดำเนินการ', sortable: false,
      render: (row) => (
        <BrandSubdueButton
          variant='fill'
          size='sm'
          leadingIcon='login'
          disabled={!canWrite}
          onClick={(e) => { e.stopPropagation(); if (canWrite) handleCheckIn(row.hn); }}
        >
          ส่งตรวจ
        </BrandSubdueButton>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [canWrite]);

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='คลินิกสุขภาพเด็กดี — งานสร้างเสริมภูมิคุ้มกัน'
      actions={(
        <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <BrandSubdueButton variant='outline' leadingIcon='contact_page' onClick={() => history.push('/clinic/immunization/registry')}>
            ทะเบียนผู้รับบริการ
          </BrandSubdueButton>
          <BrandSubdueButton variant='outline' leadingIcon='monitoring' onClick={() => history.push('/clinic/immunization/follow-up')}>
            ติดตามการสร้างเสริมภูมิคุ้มกัน
          </BrandSubdueButton>
          <BrandSubdueButton variant='outline' leadingIcon='vaccines' onClick={() => history.push('/clinic/immunization/vaccines')}>
            ทะเบียนรายการวัคซีน
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
        title='ยกเลิกคิวคลินิกสุขภาพเด็กดี'
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
          placeholder='เช่น เด็กมีไข้สูงเลื่อนรับวัคซีน / ผู้ปกครองขอเลื่อนนัด / มาผิดคลินิก'
        />
      </Popup>

      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600, 24px)',
          paddingBottom: 'var(--dim-space-600, 24px)',
          paddingLeft: 'var(--dim-space-600, 24px)',
          paddingRight: 'var(--dim-space-600, 24px)',
          gap: 'var(--dim-space-400, 16px)',
        }}
      >
        {!canWrite && (
          <div
            className='flex items-center w-full'
            style={{
              gap: 'var(--dim-space-300, 12px)',
              paddingTop: 'var(--dim-space-300, 12px)',
              paddingBottom: 'var(--dim-space-300, 12px)',
              paddingLeft: 'var(--dim-space-400, 16px)',
              paddingRight: 'var(--dim-space-400, 16px)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              background: 'var(--surface-warning-quaternary, #FFF9F0)',
              color: 'var(--text-warning-default, #C2410C)',
              fontSize: 'var(--type-size-sm)',
            }}
          >
            <Icon name='lock' size={18} />
            <span>บัญชีของคุณไม่มีสิทธิปฏิบัติงานคลินิกสุขภาพเด็กดี — ดูข้อมูลได้อย่างเดียว (อ่านอย่างเดียว)</span>
          </div>
        )}

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
              placeholder='ค้นหา HN / เลขบัตรประชาชน / ชื่อ-สกุลเด็ก / ลำดับคิว'
              width={640}
            />
          </div>

          <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
              <FilterTag value='ทั้งหมด' selected={isAllDefault} onClick={() => setFilters(FILTER_DEFAULTS)} />
              <FilterDropdown prefix='แพทย์:' options={FILTER_OPTIONS.doctor} value={filters.doctor} onChange={setFilter('doctor')} />
              <FilterDropdown prefix='สถานะ:' options={FILTER_OPTIONS.status} value={filters.status} onChange={setFilter('status')} />
              <FilterDropdown prefix='วัคซีน:' options={FILTER_OPTIONS.epi} value={filters.epi} onChange={setFilter('epi')} />
              <FilterDropdown prefix='ช่วงอายุ:' options={FILTER_OPTIONS.ageGroup} value={filters.ageGroup} onChange={setFilter('ageGroup')} />
              <FilterDateTag
                prefix='วัน:'
                value={filters.dateValue}
                onChange={setFilter('dateValue')}
                defaultQuick={FILTER_DEFAULTS.dateValue.quick}
                quickLabels={DATE_CHIP_LABELS}
              />
              <NeutralSubdueButton
                size='sm'
                leadingIcon={canWrite ? 'lock_open' : 'lock'}
                onClick={() => { setImmunizationRights(!hasImmunizationRights()); setTick((t) => t + 1); }}
                title='สลับสิทธิปฏิบัติงานคลินิกเด็กดี (สำหรับทดสอบ)'
              >
                {canWrite ? 'สิทธิ: แก้ไขได้' : 'สิทธิ: อ่านอย่างเดียว'}
              </NeutralSubdueButton>
            </OverflowFlexRow>
          </div>

          {activeTab === 'scheduled' ? (
            <Table
              columns={scheduledColumns}
              rows={scheduledNotArrived}
              rowKey={(row) => row.hn}
              onRowClick={handleRowClick}
              stickyColCount={3}
              stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
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
                stickyColCount={4}
                stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                emptyMessage={searchQ.trim() || !isAllDefault
                  ? 'ไม่พบรายการที่ตรงกับการค้นหา / ตัวกรอง'
                  : 'ยังไม่มีคิวคลินิกสุขภาพเด็กดีในวันนี้'}
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

export default ImmunizationQueuePage;
