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
import Icon from '@/components/icons/Icon';
import Textarea from '@/components/forms/Textarea';
import Popup from '@/components/popup/Popup';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  DENTAL_DOCTORS,
  DENTAL_WORK_TYPES,
  dentalWorkTypeLabelOf,
  cancelDentalVisit,
  reactivateDentalVisit,
  getDentalCancellation,
  getDentalQueueRows,
  getDentalScheduledNotArrived,
  checkInDentalAppointment,
  getDentalCheckRequests,
  cancelDentalCheckRequest,
} from '@/data/dentalVisits';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import DutyRosterAction from '@/components/patient/DutyRosterAction';
import { withEmrRowAction } from '@/components/patient/EmrRowAction';

/* DentalQueuePage — คิวทันตกรรม (TOR 1.10.1.1), /clinic/dental.
   Mirrors the ANC queue page (AncQueuePage.jsx) near-verbatim — same
   QueuePageShell + PrimarySearch + filter row + sortable Table +
   "แสดง X–Y จาก Z รายการ" pager — with the legacy HCIS dental manual's
   worklist mapped onto it (คู่มือระบบทันตกรรม บทที่ 2.1): the legacy
   3 tab-sheets (ลงทะเบียนส่งตรวจแล้ว / นัดแล้วยังไม่มาติดต่อ /
   ตรวจเสร็จแล้ว) become the 6-tab shell, columns are the legacy grid
   (คิว · วัน-เวลา มาตรวจ · HN · ชื่อ-สกุล · อาการ · แพทย์ผู้ตรวจ ·
   คลินิก/ห้องตรวจ · สถานะ), and search follows legacy §1.3-8 (HN /
   ชื่อ-สกุล / เลขบัตรประชาชน). ยกเลิก visit requires a reason popup and
   เปิดใช้งาน undoes it — the ยกเลิก/แก้ไข halves of 1.10.1.1's
   แสดง/บันทึก/ยกเลิก/แก้ไข quartet (แสดง = this table, บันทึก/แก้ไข =
   the DentalFormPage each row opens). */

const breadcrumb = ['บันทึกการรักษา', 'งานทันตกรรม'];
const SUMMARY_TITLE = 'คิวทันตกรรม (Dental Clinic)';

const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:dental-queue';
const PAGE_SIZE = 20;

const buildTabs = (rows, scheduledCount, referredCount) => [
  { key: 'all',       label: 'ทั้งหมด',              icon: 'group',           count: rows.length },
  { key: 'waiting',   label: 'รอตรวจ',               icon: 'schedule',        count: rows.filter((p) => p.statusKey === 'waiting').length },
  { key: 'progress',  label: 'กำลังตรวจ',            icon: 'assignment',      count: rows.filter((p) => p.statusKey === 'progress').length },
  { key: 'done',      label: 'ตรวจเสร็จแล้ว',        icon: 'check_circle',    count: rows.filter((p) => p.statusKey === 'done').length },
  { key: 'draft',     label: 'ที่ร่างไว้',            icon: 'save',            count: rows.filter((p) => p.statusKey === 'draft').length },
  { key: 'scheduled', label: 'นัดแล้วยังไม่มาติดต่อ', icon: 'event_available', count: scheduledCount },
  /* มติ คทง.6 — คำขอตรวจฟันที่คลินิกส่งเสริม (ANC · เบาหวาน · เยี่ยมบ้าน ฯลฯ)
     ส่งมาโดยไม่เปิด Visit ทันตกรรม ทันตแพทย์เป็นคนดึงเข้าตรวจเองที่แท็บนี้ */
  { key: 'referred',  label: 'ส่งตรวจจากคลินิกส่งเสริม', icon: 'forward_to_inbox', count: referredCount },
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

/* Filter categories per the approved spec: แพทย์ / ประเภทงานทันตกรรม /
   ช่วงเวลา (date + time chips stay visual placeholders exactly like the
   ANC/OPD queue pages — rows carry no visit-date field yet). */
const FILTER_OPTIONS = {
  doctor: [
    { value: 'all', label: 'ทุกคน' },
    ...DENTAL_DOCTORS.map((d) => ({ value: d, label: d })),
  ],
  workType: [
    { value: 'all', label: 'ทุกประเภท' },
    ...DENTAL_WORK_TYPES,
  ],
  time: [
    { value: 'all',       label: 'ทั้งวัน'                 },
    { value: 'morning',   label: 'ช่วงเช้า (06:00–12:00)' },
    { value: 'afternoon', label: 'ช่วงบ่าย (12:00–18:00)' },
  ],
};
const FILTER_DEFAULTS = {
  doctor: 'all',
  workType: 'all',
  dateValue: { quick: 'today' },
  time: 'all',
};
const DATE_CHIP_LABELS = { today: 'วันนี้', yesterday: 'เมื่อวาน' };

/* Legacy §1.3-8 search field set: HN / ชื่อ-สกุล / เลขบัตรประชาชน (+ คิว
   และแพทย์ตามแบบแผน ANC). เลขบัตรมาจาก PATIENT_PROFILES ของ HN นั้น. */
const searchHaystack = (row) => [
  row.queue, row.hn, row.name, row.doctor, row.cc,
  getPatientByHN(row.hn)?.nationalId,
];

const rowMatchesQuery = (row, q) =>
  searchHaystack(row).some((f) => f && String(f).toLowerCase().includes(q));

const renderQueue = (row) => (
  <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{row.queue}</ColorfulBadge>
);

const renderName = (row) => (
  <span className='inline-flex items-center min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
    <MaskedWorklistName
      name={row.name}
      recordKey={row.hn || row.queue}
      linkTo={{ pathname: '/clinic/dental/record', state: { hn: row.hn, queue: row.queue, name: row.name } }}
      className='min-w-0 truncate'
    />
    {/* ข้อมูลลับ flag (§1.4.2) — the record page shows the confidential
        banner / locked no-rights card; the queue only flags the row. */}
    {row.confidential && (
      <span
        title='ข้อมูลลับ (§1.4.2)'
        aria-label='ข้อมูลลับ'
        style={{ color: 'var(--text-warning-default, #C2410C)', display: 'inline-flex' }}
      >
        <Icon name='lock' size={14} />
      </span>
    )}
  </span>
);

const renderWorkType = (row) => (
  <ColorfulBadge style='indigo' size='small' hierarchy='secondary'>
    {dentalWorkTypeLabelOf(row.workType)}
  </ColorfulBadge>
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

const DentalQueuePage = () => {
  const history = useHistory();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  /* Bumped after cancel / reactivate / check-in — those are sessionStorage
     writes, not React state, so nothing else re-derives the table. */
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
    filters.doctor === FILTER_DEFAULTS.doctor &&
    filters.workType === FILTER_DEFAULTS.workType &&
    filters.dateValue.quick === FILTER_DEFAULTS.dateValue.quick &&
    filters.time === FILTER_DEFAULTS.time;

  const filtersActive = !isAllDefault || searchQ.trim() !== '';
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(filtersActive, () => {
    setFilters(FILTER_DEFAULTS);
    setSearchQ('');
    setPage(1);
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => getDentalQueueRows(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scheduledNotArrived = useMemo(() => getDentalScheduledNotArrived(), [tick]);
  const referredRows = useMemo(() => getDentalCheckRequests(), [tick]);
  const tabs = useMemo(
    () => buildTabs(rows, scheduledNotArrived.length, referredRows.length),
    [rows, scheduledNotArrived, referredRows],
  );

  /* "ส่งตรวจ" (legacy p.2-2) — checking in moves the scheduled row into
     รอตรวจ in-session; jump the user to that tab so they see it land. */
  const handleCheckIn = (hn) => {
    checkInDentalAppointment(hn);
    setTick((t) => t + 1);
    setActiveTab('waiting');
  };

  const summaryCards = useMemo(() => ([
    { key: 'total',     label: 'คิวทันตกรรมวันนี้', value: rows.length, color: 'info', icon: 'dentistry' },
    { key: 'waiting',   label: 'รอตรวจ',            value: rows.filter((p) => p.statusKey === 'waiting').length, color: 'warning', icon: 'schedule' },
    { key: 'done',      label: 'ตรวจเสร็จแล้ว',     value: rows.filter((p) => p.statusKey === 'done').length, color: 'positive', icon: 'check_circle' },
    { key: 'scheduled', label: 'นัดแล้วยังไม่มา',    value: scheduledNotArrived.length, color: 'info', icon: 'event_available' },
    { key: 'referred',  label: 'ส่งตรวจจากคลินิกอื่น', value: referredRows.length, color: 'warning', icon: 'forward_to_inbox' },
  ]), [rows, scheduledNotArrived, referredRows]);

  const filtered = useMemo(() => {
    if (activeTab === 'scheduled' || activeTab === 'referred') return [];
    let result = rows;
    const tabPred = TAB_STATUS_FILTER[activeTab];
    if (tabPred) result = result.filter(tabPred);
    if (filters.doctor !== 'all') result = result.filter((r) => r.doctor === filters.doctor);
    if (filters.workType !== 'all') result = result.filter((r) => r.workType === filters.workType);
    /* date / time chips are visual placeholders — same as ANC/OPD queues. */
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      result = result.filter((row) => rowMatchesQuery(row, q));
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
        case 'status':   return STATUS_SORT_ORDER[row.statusKey] ?? 99;
        case 'wait':     return row.waitMinutes ?? 0;
        case 'workType': return dentalWorkTypeLabelOf(row.workType);
        default:         return row[key] ?? '';
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
    pathname: '/clinic/dental/record',
    state: { hn: row.hn, queue: row.queue, name: row.name },
  });

  const resolveSearchRow = (query, item) => {
    if (item?.id) {
      const byId = rows.find((row) => row.hn === item.id);
      if (byId) return byId;
    }
    const q = (query ?? item?.value ?? item?.label ?? '').toString().trim().toLowerCase();
    if (!q) return null;
    return rows.find((row) => rowMatchesQuery(row, q)) ?? null;
  };

  const searchSuggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    const matches = [];
    const seen = new Set();
    for (const row of rows) {
      if (matches.length >= 8) break;
      if (seen.has(row.hn)) continue;
      if (rowMatchesQuery(row, q)) {
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
        : rows.find((row) => rowMatchesQuery(row, q));
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
      setCancelError('ต้องระบุเหตุผลการยกเลิกก่อนยืนยัน');
      return;
    }
    cancelDentalVisit(cancelTarget.hn, cancelReason.trim());
    setCancelTarget(null);
    setTick((t) => t + 1);
  };
  const reactivate = (row) => {
    reactivateDentalVisit(row.hn);
    setTick((t) => t + 1);
  };

  const renderStatus = (row) => {
    const cancellation = getDentalCancellation(row.hn);
    if (cancellation) {
      return (
        <span className='inline-flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
          <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกการส่งตรวจ</ColorfulBadge>
          <span style={{ color: 'var(--text-content-quaternary, #ADB2B7)', fontSize: 'var(--type-size-xs)' }}>
            {cancellation.cancelledBy} · {cancellation.cancelledAt}
          </span>
        </span>
      );
    }
    const badge = STATUS_BADGE[row.statusKey] || STATUS_BADGE.waiting;
    return <ColorfulBadge style={badge.style} size='small' hierarchy='secondary'>{badge.label}</ColorfulBadge>;
  };

  const renderActions = (row) => {
    const cancellation = getDentalCancellation(row.hn);
    return cancellation ? (
      <BrandSubdueButton
        variant='outline'
        size='sm'
        leadingIcon='restart_alt'
        onClick={(e) => { e.stopPropagation(); reactivate(row); }}
      >
        เปิดใช้งาน
      </BrandSubdueButton>
    ) : (
      <NeutralSubdueButton
        size='sm'
        leadingIcon='block'
        onClick={(e) => { e.stopPropagation(); openCancelPopup(row); }}
      >
        ยกเลิก
      </NeutralSubdueButton>
    );
  };

  /* Cancelled rows grey out (row stays visible + เปิดใช้งาน undo). */
  const renderTime = (row) => (
    <span style={getDentalCancellation(row.hn) ? { color: 'var(--text-content-quaternary, #ADB2B7)' } : undefined}>
      {row.visitTime}
    </span>
  );

  const columns = useMemo(() => ([
    { key: 'queue',     label: 'คิว',  render: renderQueue },
    { key: 'visitTime', label: 'เวลามาตรวจ', render: renderTime },
    { key: 'hn',        label: 'HN' },
    { key: 'name',      label: 'ชื่อ-นามสกุล',      flex: true, minWidth: 168, render: renderName },
    { key: 'cc',        label: 'อาการ (Chief Complaint)', flex: true, minWidth: 200,
      render: (r) => <span className='block truncate' title={r.cc}>{r.cc}</span> },
    { key: 'workType',  label: 'ประเภทงาน', render: renderWorkType },
    { key: 'doctor',    label: 'ทันตแพทย์ผู้ตรวจ',  flex: true, minWidth: 150 },
    { key: 'clinic',    label: 'คลินิก/ห้องตรวจ' },
    { key: 'wait',      label: 'รอนาน',  render: (r) => (r.waitMinutes ? `${r.waitMinutes} นาที` : '—') },
    { key: 'status',    label: 'สถานะ', render: renderStatus },
    { key: 'actions',   label: 'การจัดการ', sortable: false, render: withEmrRowAction(renderActions) },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [tick]);

  /* นัดแล้วยังไม่มาติดต่อ (legacy tab-sheet 2, p.2-2) — appointment-time
     row shape + the ส่งตรวจ check-in action. */
  const scheduledColumns = useMemo(() => ([
    { key: 'appointmentTime', label: 'เวลานัด' },
    { key: 'hn',              label: 'HN' },
    { key: 'name',            label: 'ชื่อ-นามสกุล',      flex: true, minWidth: 168 },
    { key: 'cc',              label: 'นัดมาเพื่อ',        flex: true, minWidth: 200,
      render: (r) => <span className='block truncate' title={r.cc}>{r.cc}</span> },
    { key: 'workType',        label: 'ประเภทงาน', render: renderWorkType },
    { key: 'doctor',          label: 'ทันตแพทย์ผู้ตรวจ',  flex: true, minWidth: 150 },
    { key: 'clinic',          label: 'คลินิก/ห้องตรวจ' },
    {
      key: 'checkin', label: 'การจัดการ', sortable: false,
      render: (row) => (
        <BrandSubdueButton variant='fill' size='sm' leadingIcon='login' onClick={(e) => { e.stopPropagation(); handleCheckIn(row.hn); }}>
          ส่งตรวจ
        </BrandSubdueButton>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), []);

  /* ส่งตรวจจากคลินิกส่งเสริม (มติ คทง.6) — คำขอ ไม่ใช่ Visit: ทันตแพทย์กด
     "รับเข้าตรวจ" แล้วจึงเปิดหน้าบันทึกทันตกรรมของ HN นั้น คำขอถูกเคลียร์
     พร้อมกันเพื่อไม่ให้ค้างเป็นธงซ้ำ */
  const openReferral = (row) => {
    cancelDentalCheckRequest(row.hn);
    setTick((t) => t + 1);
    history.push({ pathname: '/clinic/dental/record', state: { hn: row.hn, name: row.patientName } });
  };

  const referredColumns = useMemo(() => ([
    { key: 'fromLabel',   label: 'ส่งมาจาก',        flex: true, minWidth: 180 },
    { key: 'hn',          label: 'HN' },
    { key: 'patientName', label: 'ชื่อ-นามสกุล',    flex: true, minWidth: 168 },
    { key: 'reason',      label: 'เหตุผลที่ส่งตรวจ', flex: true, minWidth: 280,
      render: (r) => <span className='block truncate' title={r.reason}>{r.reason}</span> },
    { key: 'requestedBy', label: 'ผู้ส่งตรวจ',      flex: true, minWidth: 160 },
    { key: 'requestedAt', label: 'วัน-เวลาที่ส่ง',   flex: true, minWidth: 170 },
    {
      key: 'accept', label: 'การจัดการ', sortable: false,
      render: (row) => (
        <BrandSubdueButton variant='fill' size='sm' leadingIcon='login' onClick={(e) => { e.stopPropagation(); openReferral(row); }}>
          รับเข้าตรวจ
        </BrandSubdueButton>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), []);

  /* Empty copy differentiates "queue truly empty today" from
     "search/filter found nothing" (spec edge cases). */
  const emptyMessage = searchQ.trim() || !isAllDefault
    ? 'ไม่พบรายการที่ตรงกับคำค้น / ตัวกรอง'
    : 'วันนี้ยังไม่มีคิวทันตกรรม';

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      /* ทุก worklist ของบันทึกการรักษามีปุ่มนี้ (มติผู้ใช้ 28 ส.ค. 69) */
      leadingActions={<DutyRosterAction />}
      summaryTitle={SUMMARY_TITLE}
      summaryCards={summaryCards}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      /* แท็บ "นัดล่วงหน้า" — shell เป็นคนเติมแท็บและวาดเนื้อหา */
      upcoming={{ depts: ['ทันตกรรม'] }}
    >
      {/* ยกเลิกการส่งตรวจ — เหตุผลบังคับ + audit ผู้ยกเลิก/เวลา (playbook §5) */}
      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title='ยกเลิกการส่งตรวจทันตกรรม'
        subtitle={cancelTarget ? `${cancelTarget.name} · HN: ${cancelTarget.hn}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันยกเลิกการส่งตรวจ', onClick: confirmCancel, tone: 'danger' }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <Textarea
            label='เหตุผลการยกเลิก'
            required
            value={cancelReason}
            onChange={(v) => { setCancelReason(v); if (cancelError) setCancelError(''); }}
            placeholder='เช่น ผู้รับบริการขอเลื่อนนัด / ส่งตรวจผิดคลินิก'
          />
          {cancelError && (
            <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100)', color: 'var(--text-danger-default, #B91C1C)', fontSize: 'var(--type-size-sm)' }}>
              <Icon name='error' size={14} />
              {cancelError}
            </span>
          )}
        </div>
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
              placeholder='ค้นหา HN / ชื่อ-สกุล / เลขบัตรประชาชน / คิว / ทันตแพทย์'
              width={640}
              avatars={searchAvatars}
            />
          </div>

          <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
              <FilterDropdown prefix='ทันตแพทย์:' options={FILTER_OPTIONS.doctor} value={filters.doctor} onChange={setFilter('doctor')} />
              <FilterDropdown prefix='ประเภทงาน:' options={FILTER_OPTIONS.workType} value={filters.workType} onChange={setFilter('workType')} />
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

          {activeTab === 'referred' ? (
            <Table
              columns={referredColumns}
              rows={referredRows}
              rowKey={(row) => row.hn}
              emptyMessage='ยังไม่มีคำขอส่งตรวจทันตกรรมจากคลินิกส่งเสริม'
            />
          ) : activeTab === 'scheduled' ? (
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
                emptyMessage={emptyMessage}
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

export default DentalQueuePage;
