import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import DutyRosterAction from '@/components/patient/DutyRosterAction';
import { withEmrRowAction } from '@/components/patient/EmrRowAction';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import useSearchHistory from '@/components/search/useSearchHistory';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import FilterDateTag from '@/components/forms/FilterDateTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import Icon from '@/components/icons/Icon';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Textarea from '@/components/forms/Textarea';
import Popup from '@/components/popup/Popup';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  FP_SERVICES,
  FP_STAFF,
  resolveFpService,
  resolveFpClientType,
  getFpQueueRows,
  getFpScheduledNotArrived,
  checkInFpAppointment,
  cancelFpQueueRegistration,
  reactivateFpQueueRegistration,
  getFpQueueCancellation,
  getFpRegistrationByHn,
  hasFamilyPlanningRights,
  setFamilyPlanningRights,
  formatFpDateTime,
} from '@/data/familyPlanningVisits';

/* FamilyPlanningQueuePage — คิวคลินิกวางแผนครอบครัว (TOR 1.10.8.2 คิว +
   1.10.8.1 ข้อมูลทั่วไปผู้รับบริการที่ส่งต่อไปหน้าบันทึก).

   กลไกเหมือน AncQueuePage / MentalHealthQueuePage ทุกประการ:
   tabs ทั้งหมด/รอตรวจ/กำลังตรวจ/ตรวจเสร็จแล้ว/ที่ร่างไว้/นัดแล้วยังไม่มา
   ติดต่อ · PrimarySearch (HN / ชื่อ / บัตรประชาชน ตามไวยากรณ์ค้นหาใน
   คู่มือ §1.4 ข้อ 8) · FilterTag/FilterDropdown/FilterDateTag ·
   column sort · pagination 20/หน้า

   คู่มือ p.2-1: ก่อนบันทึกวางแผนครอบครัวต้อง "ส่งตรวจ" ในระบบห้องบัตรก่อน
   → แท็บ "นัดแล้วยังไม่มาติดต่อ" มีปุ่ม ส่งตรวจ ที่ย้ายรายการเข้าคิวหลัก

   §1.4.2 ข้อมูลลับ — ชื่อในคิวถูก mask ด้วย MaskedWorklistName เสมอ และ
   คอลัมน์ "วิธีคุมกำเนิด/บริการที่ได้รับ" จะถูกปิดเมื่อผู้ใช้ไม่มีสิทธิ
   คลินิกวางแผนครอบครัว (รายการยังเห็นได้ แต่รายละเอียดวิธีคุมกำเนิดไม่เห็น) */

const breadcrumb = ['บันทึกการรักษา', 'งานวางแผนครอบครัว'];
const SUMMARY_TITLE = 'คิวคลินิกวางแผนครอบครัว';
const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:family-planning-queue';
const PAGE_SIZE = 20;
const RECORD_PATH = '/clinic/family-planning/record';
const REGISTRY_PATH = '/clinic/family-planning/registry';
const MASKED = '••••••••';

const buildTabs = (rows, scheduledCount) => [
  { key: 'all',       label: 'ทั้งหมด',              icon: 'group',           count: rows.length },
  { key: 'waiting',   label: 'รอตรวจ',               icon: 'schedule',        count: rows.filter((r) => r.statusKey === 'waiting').length },
  { key: 'progress',  label: 'กำลังตรวจ',            icon: 'assignment',      count: rows.filter((r) => r.statusKey === 'progress').length },
  { key: 'done',      label: 'ตรวจเสร็จแล้ว',        icon: 'check_circle',    count: rows.filter((r) => r.statusKey === 'done').length },
  { key: 'draft',     label: 'ที่ร่างไว้',            icon: 'save',            count: rows.filter((r) => r.statusKey === 'draft').length },
  { key: 'scheduled', label: 'นัดแล้วยังไม่มาติดต่อ', icon: 'event_available', count: scheduledCount },
];

const TAB_STATUS_FILTER = {
  waiting:  (r) => r.statusKey === 'waiting',
  progress: (r) => r.statusKey === 'progress',
  done:     (r) => r.statusKey === 'done',
  draft:    (r) => r.statusKey === 'draft',
};

const STATUS_BADGE = {
  waiting:  { style: 'blue',   label: 'รอตรวจ' },
  progress: { style: 'orange', label: 'กำลังตรวจ' },
  done:     { style: 'teal',   label: 'ตรวจเสร็จแล้ว' },
  draft:    { style: 'grey',   label: 'ที่ร่างไว้' },
};

const STATUS_SORT_ORDER = { waiting: 0, progress: 1, done: 2, draft: 3 };

const FILTER_OPTIONS = {
  service: [
    { value: 'all', label: 'ทุกบริการ' },
    ...FP_SERVICES.map((s) => ({ value: s.key, label: s.label })),
  ],
  clientType: [
    { value: 'all', label: 'ทุกประเภท' },
    { value: 'new', label: 'รายใหม่' },
    { value: 'old', label: 'รายเก่า' },
  ],
  nurse: [
    { value: 'all', label: 'ทุกคน' },
    ...FP_STAFF.map((n) => ({ value: n, label: n })),
  ],
};

const FILTER_DEFAULTS = {
  service: 'all',
  clientType: 'all',
  nurse: 'all',
  dateValue: { quick: 'today' },
};

const DATE_CHIP_LABELS = { today: 'วันนี้', yesterday: 'เมื่อวาน' };

const queueRowToSearchItem = (row) => ({
  id: row.hn,
  label: row.name,
  sublabel: row.nurse,
  value: row.name,
  badges: [
    { label: row.queue || row.appointmentTime, tone: 'teal' },
    { label: row.hn, tone: 'indigo' },
  ],
  avatarSrc: getPatientByHN(row.hn)?.avatarUrl,
});

const FamilyPlanningQueuePage = () => {
  const history = useHistory();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  /* Bumped after check-in / cancel / reactivate — those are sessionStorage
     writes, not React state, so nothing else would re-derive the table. */
  const [tick, setTick] = useState(0);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [, setRightsTick] = useState(0);

  const canRead = hasFamilyPlanningRights();
  const toggleRightsDemo = () => {
    setFamilyPlanningRights(!hasFamilyPlanningRights());
    setRightsTick((t) => t + 1);
  };

  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: [] });

  const setFilter = (key) => (val) => { setFilters((f) => ({ ...f, [key]: val })); setPage(1); };

  const isAllDefault =
    filters.service === FILTER_DEFAULTS.service &&
    filters.clientType === FILTER_DEFAULTS.clientType &&
    filters.nurse === FILTER_DEFAULTS.nurse &&
    filters.dateValue.quick === FILTER_DEFAULTS.dateValue.quick;

  const filtersActive = !isAllDefault || searchQ.trim() !== '';
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(filtersActive, () => {
    setFilters(FILTER_DEFAULTS);
    setSearchQ('');
    setPage(1);
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => getFpQueueRows(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scheduledNotArrived = useMemo(() => getFpScheduledNotArrived(), [tick]);
  const tabs = useMemo(() => buildTabs(rows, scheduledNotArrived.length), [rows, scheduledNotArrived]);

  const handleCheckIn = (hn) => {
    checkInFpAppointment(hn);
    setTick((t) => t + 1);
    setActiveTab('waiting');
  };

  const summaryCards = useMemo(() => ([
    { key: 'total',    label: 'คิวทั้งหมดวันนี้', value: rows.length, color: 'info', icon: 'group' },
    { key: 'new',      label: 'รายใหม่',          value: rows.filter((r) => r.clientType === 'new').length, color: 'info', icon: 'person_add' },
    { key: 'waiting',  label: 'รอตรวจ',           value: rows.filter((r) => r.statusKey === 'waiting').length, color: 'warning', icon: 'schedule' },
    { key: 'done',     label: 'ตรวจเสร็จแล้ว',    value: rows.filter((r) => r.statusKey === 'done').length, color: 'positive', icon: 'check_circle' },
  ]), [rows]);

  const filtered = useMemo(() => {
    if (activeTab === 'scheduled') return [];
    let result = rows;
    const tabPred = TAB_STATUS_FILTER[activeTab];
    if (tabPred) result = result.filter(tabPred);
    if (filters.service !== 'all') result = result.filter((r) => r.service === filters.service);
    if (filters.clientType !== 'all') {
      result = result.filter((r) => (filters.clientType === 'new'
        ? r.clientType === 'new'
        : r.clientType && r.clientType !== 'new'));
    }
    if (filters.nurse !== 'all') result = result.filter((r) => r.nurse === filters.nurse);
    /* วันที่เป็น chip เชิงภาพ — mock roster เป็นคิวของวันนี้ทั้งหมด
       (เหมือน AncQueuePage / OPD QueuePage) */
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      result = result.filter((row) =>
        [row.queue, row.hn, row.name, row.cid, row.fpNumber, row.nurse]
          .some((f) => f && String(f).toLowerCase().includes(q)));
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
        case 'service': return resolveFpService(row.service)?.label ?? '';
        case 'clientType': return resolveFpClientType(row.clientType);
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

  const openRecord = (row) => history.push({
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
      [row.queue, row.hn, row.name, row.cid, row.fpNumber].some((f) => f && String(f).toLowerCase().includes(q))) ?? null;
  };

  const searchSuggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    const matches = [];
    const seen = new Set();
    for (const row of rows) {
      if (matches.length >= 8) break;
      if (seen.has(row.hn)) continue;
      if ([row.queue, row.hn, row.name, row.cid, row.fpNumber].some((f) => f && String(f).toLowerCase().includes(q))) {
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
        : rows.find((row) => [row.queue, row.hn, row.name].some((f) => f && String(f).toLowerCase().includes(q)));
      if (!match || seenHn.has(match.hn)) continue;
      const src = getPatientByHN(match.hn)?.avatarUrl;
      if (!src) continue;
      seenHn.add(match.hn);
      result.push({ src });
    }
    return result;
  }, [searchHistory, rows]);

  /* ── ยกเลิก / เปิดใช้งานทะเบียน (TOR 1.10.8.2 ยกเลิก) ───────────── */
  const openCancelPopup = (row) => {
    setCancelReason('');
    setCancelError('');
    setCancelTarget(row);
  };
  const confirmCancel = () => {
    if (!cancelReason.trim()) {
      setCancelError('กรุณาระบุเหตุผลการยกเลิกทะเบียน');
      return;
    }
    cancelFpQueueRegistration(cancelTarget.hn, cancelReason.trim());
    setCancelTarget(null);
    setTick((t) => t + 1);
  };
  const reactivate = (row) => {
    reactivateFpQueueRegistration(row.hn);
    setTick((t) => t + 1);
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

  const renderFpNumber = (row) => {
    const registration = getFpRegistrationByHn(row.hn);
    if (!canRead) {
      return <span title='ข้อมูลลับ §1.4.2 — สิทธิไม่เพียงพอ'>{MASKED}</span>;
    }
    if (!registration || registration.status === 'cancelled') {
      return <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ยังไม่มีทะเบียน</ColorfulBadge>;
    }
    return <span style={{ fontWeight: 'var(--type-weight-medium)' }}>{registration.fpNumber}</span>;
  };

  const renderService = (row) => {
    if (!canRead) {
      return <span title='ข้อมูลลับ §1.4.2 — สิทธิไม่เพียงพอ'>{MASKED}</span>;
    }
    const service = resolveFpService(row.service);
    if (!service) return '—';
    return (
      <ColorfulBadge style={service.tone} size='small' hierarchy='secondary'>{service.label}</ColorfulBadge>
    );
  };

  const renderRights = (row) => (
    row.rightsExpired ? (
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
        <ColorfulBadge style='red' size='small' hierarchy='secondary'>สิทธิหมดอายุ</ColorfulBadge>
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>{row.insurance}</span>
      </div>
    ) : (
      <span style={{ fontSize: 'var(--type-size-sm)' }}>{row.insurance}</span>
    )
  );

  const renderStatus = (row) => {
    const cancellation = getFpQueueCancellation(row.hn);
    if (cancellation) {
      return (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกทะเบียนแล้ว</ColorfulBadge>
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
            โดย {cancellation.by} · {formatFpDateTime(cancellation.at)}
            <br />เหตุผล: {cancellation.reason || 'ไม่ระบุ'}
          </span>
        </div>
      );
    }
    const badge = STATUS_BADGE[row.statusKey] || STATUS_BADGE.waiting;
    return <ColorfulBadge style={badge.style} size='small' hierarchy='secondary'>{badge.label}</ColorfulBadge>;
  };

  const renderActions = (row) => {
    if (!canRead) {
      return <ColorfulBadge style='grey' size='small' hierarchy='secondary'>สิทธิไม่เพียงพอ</ColorfulBadge>;
    }
    const cancellation = getFpQueueCancellation(row.hn);
    return cancellation ? (
      <BrandSubdueButton
        variant='outline' size='sm' leadingIcon='restart_alt'
        onClick={(e) => { e.stopPropagation(); reactivate(row); }}
      >
        เปิดใช้งานทะเบียน
      </BrandSubdueButton>
    ) : (
      <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <BrandSubdueButton
          variant='outline' size='sm' leadingIcon='edit'
          onClick={(e) => { e.stopPropagation(); openRecord(row); }}
        >
          {row.statusKey === 'done' ? 'แสดง/แก้ไข' : 'บันทึก'}
        </BrandSubdueButton>
        <NeutralSubdueButton
          size='sm' leadingIcon='block'
          onClick={(e) => { e.stopPropagation(); openCancelPopup(row); }}
        >
          ยกเลิกทะเบียน
        </NeutralSubdueButton>
      </div>
    );
  };

  const columns = useMemo(() => ([
    { key: 'queue',      label: 'คิว',        render: renderQueue },
    { key: 'hn',         label: 'HN' },
    { key: 'name',       label: 'ชื่อ-สกุล',   flex: true, minWidth: 170, render: renderName },
    { key: 'age',        label: 'อายุ' },
    { key: 'insurance',  label: 'สิทธิการรักษา', flex: true, minWidth: 180, render: renderRights },
    { key: 'fpNumber',   label: 'เลขที่วางแผนครอบครัว', render: renderFpNumber },
    { key: 'service',    label: 'บริการที่ได้รับ', render: renderService },
    { key: 'clientType', label: 'ประเภทผู้รับบริการ', render: (r) => resolveFpClientType(r.clientType) },
    /* ชื่อผู้ให้บริการโชว์เฉพาะแท็บ "ทั้งหมด" (มติผู้ใช้ 2 ก.ย. 69 · ทำไว้ที่คิว
       ฝากครรภ์ก่อน) — แท็บที่เป็นคิวนั้นผู้ใช้เห็นเฉพาะคิวของตัวเอง ชื่อผู้ตรวจจึง
       ซ้ำกันทุกแถว ส่วนแท็บทั้งหมดเป็นรายชื่อข้ามผู้ให้บริการ จึงต้องบอกว่าใครดูแล */
    ...(activeTab === 'all' ? [{ key: 'nurse',      label: 'ผู้ตรวจ',     flex: true, minWidth: 150 }] : []),
    { key: 'wait',       label: 'รอนาน',      render: (r) => (r.waitMinutes ? `${r.waitMinutes} นาที` : '—') },
    { key: 'appointmentNote', label: 'การนัดหมาย', flex: true, minWidth: 160 },
    { key: 'status',     label: 'สถานะ',      render: renderStatus },
    { key: 'actions',    label: 'การดำเนินการ', sortable: false, render: withEmrRowAction(renderActions) },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [tick, canRead, activeTab]);

  /* แท็บ "นัดแล้วยังไม่มาติดต่อ" — คนละ row shape (เวลานัดแทนคิว/สถานะ)
     จึงมี column set ของตัวเอง + ปุ่ม ส่งตรวจ (คู่มือ p.2-1) */
  const scheduledColumns = useMemo(() => ([
    { key: 'appointmentTime', label: 'เวลานัด' },
    { key: 'hn',              label: 'HN' },
    { key: 'name',            label: 'ชื่อ-สกุล', flex: true, minWidth: 170, render: renderName },
    { key: 'age',             label: 'อายุ' },
    { key: 'insurance',       label: 'สิทธิการรักษา', flex: true, minWidth: 180, render: renderRights },
    { key: 'fpNumber',        label: 'เลขที่วางแผนครอบครัว', render: renderFpNumber },
    { key: 'service',         label: 'บริการที่นัด', render: renderService },
    { key: 'clinic',          label: 'ห้องตรวจ' },
    { key: 'appointmentNote', label: 'หมายเหตุนัด', flex: true, minWidth: 160 },
    {
      key: 'checkin', label: 'การดำเนินการ', sortable: false,
      render: (row) => (
        <BrandSubdueButton
          variant='fill' size='sm' leadingIcon='login'
          disabled={!canRead}
          onClick={(e) => { e.stopPropagation(); handleCheckIn(row.hn); }}
        >
          ส่งตรวจ
        </BrandSubdueButton>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [tick, canRead]);

  const emptyMessageByTab = {
    all:      'ยังไม่มีผู้รับบริการวางแผนครอบครัวในคิววันนี้',
    waiting:  'ไม่มีผู้รับบริการที่รอตรวจ',
    progress: 'ยังไม่มีรายการที่กำลังตรวจ',
    done:     'ยังไม่มีรายการที่ตรวจเสร็จวันนี้',
    draft:    'ไม่มีบันทึกที่ร่างไว้',
  };

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      /* ทุก worklist ของบันทึกการรักษามีปุ่มนี้ (มติผู้ใช้ 28 ส.ค. 69) */
      leadingActions={<DutyRosterAction />}
      title='คลินิกวางแผนครอบครัว'
      summaryTitle={SUMMARY_TITLE}
      summaryCards={summaryCards}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      /* แท็บ "นัดล่วงหน้า" — shell เป็นคนเติมแท็บและวาดเนื้อหา */
      upcoming={{ depts: ['สูติ-นรีเวช'] }}
      actions={(
        <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <ColorfulBadge style='red' size='small' hierarchy='secondary'>ข้อมูลลับ §1.4.2</ColorfulBadge>
          {/* Demo toggle สำหรับสถานะ "สิทธิไม่พอ" (mock — RBAC จริงมากับ §1.20) */}
          <NeutralSubdueButton
            size='sm'
            leadingIcon={canRead ? 'lock_open' : 'lock'}
            onClick={toggleRightsDemo}
            title='สลับสิทธิการเข้าถึงข้อมูลลับ (สำหรับทดสอบ)'
          >
            {canRead ? 'สิทธิ: เข้าถึงได้' : 'สิทธิ: ถูกจำกัด'}
          </NeutralSubdueButton>
          <BrandSubdueButton variant='outline' leadingIcon='contact_page' onClick={() => history.push(REGISTRY_PATH)}>
            ทะเบียนผู้รับบริการ
          </BrandSubdueButton>
        </div>
      )}
    >
      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title='ยกเลิกทะเบียนวางแผนครอบครัว'
        subtitle={cancelTarget ? `${cancelTarget.name} · HN: ${cancelTarget.hn}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันยกเลิกทะเบียน', onClick: confirmCancel, tone: 'danger' }}
      >
        <Textarea
          label='เหตุผลการยกเลิก'
          required
          value={cancelReason}
          onChange={(v) => { setCancelReason(v); if (v.trim()) setCancelError(''); }}
          error={cancelError || undefined}
          placeholder='เช่น ย้ายไปรับบริการที่สถานบริการอื่น / ตั้งครรภ์แล้ว / ลงทะเบียนซ้ำ'
        />
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
          ระบบจะบันทึกผู้ยกเลิกและวัน-เวลาไว้ในประวัติ (audit trail) และเปิดใช้งานทะเบียนใหม่ได้ภายหลัง
        </span>
      </Popup>

      <div className='flex flex-col flex-1 min-w-0' style={{
        paddingTop: 'var(--dim-space-600, 24px)',
        paddingBottom: 'var(--dim-space-600, 24px)',
        paddingLeft: 'var(--dim-space-600, 24px)',
        paddingRight: 'var(--dim-space-600, 24px)',
        gap: 'var(--dim-space-600, 24px)',
      }}>
        {!canRead && (
          <div
            className='flex items-center w-full'
            style={{
              gap: 'var(--dim-space-200, 8px)',
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
            <span>
              บัญชีนี้ไม่มีสิทธิเข้าถึงข้อมูลลับของงานวางแผนครอบครัว (§1.4.2) —
              เลขที่วางแผนครอบครัวและวิธีคุมกำเนิดถูกปกปิด และไม่สามารถส่งตรวจ /
              ยกเลิก / เปิดใช้งานทะเบียนได้
            </span>
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
              onChange={(v) => { setSearchQ(v); setPage(1); }}
              onSubmit={(label, item) => {
                setSearchQ(label);
                const match = resolveSearchRow(label, item);
                pushHistory(match ? queueRowToSearchItem(match) : (item ?? label));
                if (match) openRecord(match);
              }}
              suggestions={searchSuggestions}
              history={searchHistory}
              onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
              placeholder='ค้นหา HN / ชื่อ-สกุล / เลขบัตรประชาชน / เลขที่วางแผนครอบครัว'
              width={640}
              avatars={searchAvatars}
            />
          </div>

          <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <OverflowFlexRow itemGap='var(--dim-space-200, 8px)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
              <FilterDropdown prefix='บริการ:' options={FILTER_OPTIONS.service} value={filters.service} onChange={setFilter('service')} />
              <FilterDropdown prefix='ประเภท:' options={FILTER_OPTIONS.clientType} value={filters.clientType} onChange={setFilter('clientType')} />
              <FilterDateTag
                prefix='วัน:'
                value={filters.dateValue}
                onChange={setFilter('dateValue')}
                defaultQuick={FILTER_DEFAULTS.dateValue.quick}
                quickLabels={DATE_CHIP_LABELS}
              />
              <FilterDropdown prefix='ผู้ตรวจ:' options={FILTER_OPTIONS.nurse} value={filters.nurse} onChange={setFilter('nurse')} />
              <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
            </OverflowFlexRow>
          </div>

          {activeTab === 'scheduled' ? (
            <Table
              columns={scheduledColumns}
              rows={scheduledNotArrived}
              rowKey={(row) => row.hn}
              stickyColCount={3}
              stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
              emptyMessage='ไม่มีนัดหมายที่ยังไม่มาติดต่อวันนี้'
              emptySubtext='รายการที่กด "ส่งตรวจ" แล้วจะย้ายไปอยู่ในแท็บ "รอตรวจ"'
            />
          ) : (
            <SmoothFilterResults opaque={resultsOpaque}>
              <>
              <SearchResultCount found={sortedRows.length} total={rows.length} />
              <Table
                columns={columns}
                rows={pageRows}
                rowKey={(row) => row.hn}
                sortConfig={sortConfig}
                onSort={handleSort}
                onRowClick={canRead ? openRecord : undefined}
                stickyColCount={3}
                stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                emptyMessage={
                  searchQ.trim() || !isAllDefault
                    ? 'ไม่พบรายการที่ตรงกับการค้นหา / ตัวกรอง'
                    : (emptyMessageByTab[activeTab] || 'ไม่พบรายการ')
                }
                emptySubtext={
                  searchQ.trim() || !isAllDefault
                    ? 'ลองล้างตัวกรอง หรือค้นหาด้วย HN / เลขบัตรประชาชนแทน'
                    : undefined
                }
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
            </SmoothFilterResults>
          )}
        </div>
      </div>
    </QueuePageShell>
  );
};

export default FamilyPlanningQueuePage;
