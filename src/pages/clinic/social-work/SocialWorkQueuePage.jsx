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
import Textarea from '@/components/forms/Textarea';
import Popup from '@/components/popup/Popup';
import Icon from '@/components/icons/Icon';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  SW_WORKERS,
  SW_CLINICS,
  SW_TARGET_GROUPS,
  SW_INTAKE_CHANNELS,
  resolveSwClinic,
  resolveSwTargetGroup,
  resolveSwProblemLabel,
  isSwProblemSensitive,
  getSwQueueRows,
  getSwScheduledNotArrived,
  checkInSwAppointment,
  cancelSwQueue,
  restoreSwQueue,
  getSwQueueCancellation,
  hasSocialWorkRights,
  setSocialWorkRights,
  hasSwOverdueFollowUp,
  getSwNextAppointment,
  formatSwDate,
  formatSwDateTime,
} from '@/data/socialWorkClinic';

/* SocialWorkQueuePage — คิวงานสังคมสงเคราะห์ (TOR 1.10.11.2 ส่วนคิว /
   วัน-เวลา / ผู้ให้บริการ / คลินิก / Flag) และเป็นประตูเข้าสู่ทุกหน้าจอ
   ของโมดูล §1.10.11.

   Mechanics mirror AncQueuePage / MentalHealthQueuePage verbatim (search +
   filter row + sort + pagination + per-tab status split). Vocabulary from
   the legacy manual §2.7 (ค้นหาผู้ใช้บริการสังคมสงเคราะห์ สส.2).

   ยกเลิกคิว keeps its audit line (ผู้ยกเลิก + เวลา + เหตุผล) and stays
   restorable (playbook §5). ปัญหาหลักที่เป็นรหัสลับ (ความรุนแรง /
   ทารุณกรรม / คดีความ / HIV) ถูกปกปิดตาม §1.4.2 เมื่อผู้ใช้ไม่มีสิทธิ. */

const breadcrumb = ['ระบบบันทึกการรักษา', 'งานสังคมสงเคราะห์'];
const SUMMARY_TITLE = 'คิวงานสังคมสงเคราะห์';
const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:social-work-queue';
const PAGE_SIZE = 20;
const RECORD_PATH = '/clinic/social-work/record';

const buildTabs = (rows, scheduledCount) => [
  { key: 'all', label: 'ทั้งหมด', icon: 'group', count: rows.length },
  { key: 'waiting', label: 'รอให้บริการ', icon: 'schedule', count: rows.filter((r) => r.statusKey === 'waiting').length },
  { key: 'progress', label: 'กำลังให้บริการ', icon: 'assignment', count: rows.filter((r) => r.statusKey === 'progress').length },
  { key: 'done', label: 'ให้บริการเสร็จสิ้น', icon: 'check_circle', count: rows.filter((r) => r.statusKey === 'done').length },
  { key: 'draft', label: 'ที่ร่างไว้', icon: 'save', count: rows.filter((r) => r.statusKey === 'draft').length },
  { key: 'scheduled', label: 'นัดวันนี้ยังไม่มา', icon: 'event_available', count: scheduledCount },
];

const TAB_STATUS_FILTER = {
  waiting: (r) => r.statusKey === 'waiting',
  progress: (r) => r.statusKey === 'progress',
  done: (r) => r.statusKey === 'done',
  draft: (r) => r.statusKey === 'draft',
};

const STATUS_BADGE = {
  waiting: { style: 'blue', label: 'รอให้บริการ' },
  progress: { style: 'orange', label: 'กำลังให้บริการ' },
  done: { style: 'teal', label: 'เสร็จสิ้น' },
  draft: { style: 'grey', label: 'ที่ร่างไว้' },
};

const STATUS_SORT_ORDER = { waiting: 0, progress: 1, done: 2, draft: 3 };

const FILTER_OPTIONS = {
  targetGroup: [
    { value: 'all', label: 'ทุกกลุ่ม' },
    ...SW_TARGET_GROUPS,
  ],
  intakeChannel: [
    { value: 'all', label: 'ทุกช่องทาง' },
    ...SW_INTAKE_CHANNELS,
  ],
  worker: [
    { value: 'all', label: 'ทุกคน' },
    ...SW_WORKERS.map((w) => ({ value: w, label: w })),
  ],
  clinic: [
    { value: 'all', label: 'ทุกคลินิก' },
    ...SW_CLINICS,
  ],
};

const FILTER_DEFAULTS = {
  targetGroup: 'all',
  intakeChannel: 'all',
  worker: 'all',
  clinic: 'all',
  dateValue: { quick: 'today' },
};

const DATE_CHIP_LABELS = { today: 'วันนี้', yesterday: 'เมื่อวาน' };

const searchFields = (row) => [
  row.queue, row.hn, row.cid, row.name, row.caseNo, row.worker,
];

const queueRowToSearchItem = (row) => ({
  id: row.hn,
  label: row.name,
  sublabel: row.worker,
  value: row.name,
  badges: [
    { label: row.queue, tone: 'teal' },
    { label: row.hn, tone: 'indigo' },
  ],
  avatarSrc: getPatientByHN(row.hn)?.avatarUrl,
});

const SocialWorkQueuePage = () => {
  const history = useHistory();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  /* Bumped after check-in / cancel / restore — sessionStorage writes are not
     React state, so nothing else re-derives the table. */
  const [tick, setTick] = useState(0);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  /* Re-render hook for the §1.4.2 rights demo toggle (sessionStorage). */
  const [, setRightsTick] = useState(0);

  const canWrite = hasSocialWorkRights();

  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: [] });

  const setFilter = (key) => (val) => { setFilters((f) => ({ ...f, [key]: val })); setPage(1); };

  const isAllDefault =
    filters.targetGroup === FILTER_DEFAULTS.targetGroup
    && filters.intakeChannel === FILTER_DEFAULTS.intakeChannel
    && filters.worker === FILTER_DEFAULTS.worker
    && filters.clinic === FILTER_DEFAULTS.clinic
    && filters.dateValue.quick === FILTER_DEFAULTS.dateValue.quick;

  const filtersActive = !isAllDefault || searchQ.trim() !== '';
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(filtersActive, () => {
    setFilters(FILTER_DEFAULTS);
    setSearchQ('');
    setPage(1);
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => getSwQueueRows(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scheduledNotArrived = useMemo(() => getSwScheduledNotArrived(), [tick]);
  const tabs = useMemo(() => buildTabs(rows, scheduledNotArrived.length), [rows, scheduledNotArrived]);

  const handleCheckIn = (hn) => {
    checkInSwAppointment(hn);
    setTick((t) => t + 1);
    setActiveTab('waiting');
  };

  const summaryCards = useMemo(() => ([
    { key: 'waiting', label: 'รอให้บริการ', value: rows.filter((r) => r.statusKey === 'waiting').length, color: 'info', icon: 'schedule' },
    { key: 'progress', label: 'กำลังให้บริการ', value: rows.filter((r) => r.statusKey === 'progress').length, color: 'warning', icon: 'assignment' },
    { key: 'done', label: 'ให้บริการเสร็จสิ้น', value: rows.filter((r) => r.statusKey === 'done').length, color: 'positive', icon: 'check_circle' },
    { key: 'scheduled', label: 'นัดวันนี้ยังไม่มา', value: scheduledNotArrived.length, color: 'negative', icon: 'event_busy' },
  ]), [rows, scheduledNotArrived]);

  const filtered = useMemo(() => {
    if (activeTab === 'scheduled') return [];
    let result = rows;
    const tabPred = TAB_STATUS_FILTER[activeTab];
    if (tabPred) result = result.filter(tabPred);
    if (filters.targetGroup !== 'all') result = result.filter((r) => r.targetGroup === filters.targetGroup);
    if (filters.intakeChannel !== 'all') result = result.filter((r) => r.intakeChannel === filters.intakeChannel);
    if (filters.worker !== 'all') result = result.filter((r) => r.worker === filters.worker);
    if (filters.clinic !== 'all') result = result.filter((r) => r.clinic === filters.clinic);
    /* date chip เป็น placeholder เชิงภาพ — แถวคิวเป็นของ "วันนี้" ทั้งหมด
       (พฤติกรรมเดียวกับหน้าคิว OPD / ANC / สุขภาพจิต) */
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      result = result.filter((row) => searchFields(row).some((f) => f && String(f).toLowerCase().includes(q)));
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
        case 'wait': return row.waitMinutes ?? 0;
        case 'targetGroup': return resolveSwTargetGroup(row.targetGroup);
        case 'clinic': return resolveSwClinic(row.clinic);
        case 'primaryProblem': return row.primaryProblem || '';
        default: return row[key] ?? '';
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
    pathname: `${RECORD_PATH}/${row.hn}`,
    state: { hn: row.hn, queue: row.queue, name: row.name, statusKey: row.statusKey },
  });

  const resolveSearchRow = (query, item) => {
    if (item?.id) {
      const byId = rows.find((row) => row.hn === item.id);
      if (byId) return byId;
    }
    const q = (query ?? item?.value ?? item?.label ?? '').toString().trim().toLowerCase();
    if (!q) return null;
    return rows.find((row) => searchFields(row).some((f) => f && String(f).toLowerCase().includes(q))) ?? null;
  };

  const searchSuggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    const matches = [];
    const seen = new Set();
    for (const row of rows) {
      if (matches.length >= 8) break;
      if (seen.has(row.hn)) continue;
      if (searchFields(row).some((f) => f && String(f).toLowerCase().includes(q))) {
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
        : rows.find((row) => searchFields(row).some((f) => f && String(f).toLowerCase().includes(q)));
      if (!match || seenHn.has(match.hn)) continue;
      const src = getPatientByHN(match.hn)?.avatarUrl;
      if (!src) continue;
      seenHn.add(match.hn);
      result.push({ src });
    }
    return result;
  }, [searchHistory, rows]);

  const toggleRightsDemo = () => {
    setSocialWorkRights(!hasSocialWorkRights());
    setRightsTick((t) => t + 1);
  };

  const openCancelPopup = (row) => {
    if (!canWrite) return;
    setCancelReason('');
    setCancelError('');
    setCancelTarget(row);
  };
  const confirmCancel = () => {
    if (!cancelReason.trim()) {
      setCancelError('กรุณาระบุเหตุผลการยกเลิกคิว');
      return;
    }
    cancelSwQueue(cancelTarget.hn, cancelReason.trim());
    setCancelTarget(null);
    setTick((t) => t + 1);
  };
  const restore = (row) => {
    if (!canWrite) return;
    restoreSwQueue(row.hn);
    setTick((t) => t + 1);
  };

  /* ── renderers ─────────────────────────────────────────────────── */
  const renderQueue = (row) => (
    <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{row.queue}</ColorfulBadge>
  );

  const renderName = (row) => (
    <MaskedWorklistName
      name={row.name}
      recordKey={row.hn || row.queue}
      linkTo={{ pathname: `${RECORD_PATH}/${row.hn}`, state: { hn: row.hn, queue: row.queue, name: row.name, statusKey: row.statusKey } }}
    />
  );

  /* ปัญหาหลัก — รหัสลับถูกปกปิดเมื่อสิทธิไม่พอ (§1.4.2) */
  const renderProblem = (row) => {
    if (!row.primaryProblem) return '—';
    const sensitive = isSwProblemSensitive(row.primaryProblem);
    return (
      <span
        className='inline-flex items-center'
        style={{ gap: 'var(--dim-space-100, 4px)' }}
        title={sensitive && !canWrite ? 'ข้อมูลลับ §1.4.2 — สิทธิไม่เพียงพอ' : undefined}
      >
        {sensitive && <Icon name='lock' size={14} />}
        <span>{resolveSwProblemLabel(row.primaryProblem)}</span>
      </span>
    );
  };

  /* Flag column — ข้อมูลลับ / แพ้ยา / ติดตามค้าง (TOR 1.10.11.2 "Flag") */
  const renderFlags = (row) => {
    const flags = [];
    if (row.confidential || isSwProblemSensitive(row.primaryProblem)) {
      flags.push({ key: 'secret', style: 'red', label: 'ข้อมูลลับ' });
    }
    if (row.drugAllergy) flags.push({ key: 'allergy', style: 'orange', label: 'แพ้ยา' });
    if (row.followUpOverdue || hasSwOverdueFollowUp(row.hn)) {
      flags.push({ key: 'followup', style: 'yellow', label: 'ติดตามค้าง' });
    }
    if (row.noRights) flags.push({ key: 'norights', style: 'grey', label: 'ไม่มีสิทธิรักษา' });
    if (row.rightsExpired) flags.push({ key: 'expired', style: 'orange', label: 'สิทธิหมดอายุ' });
    if (flags.length === 0) return <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>—</span>;
    return (
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100, 4px)' }}>
        {flags.map((f) => (
          <ColorfulBadge key={f.key} style={f.style} size='small' hierarchy='secondary'>{f.label}</ColorfulBadge>
        ))}
      </div>
    );
  };

  const renderStatus = (row) => {
    const cancellation = getSwQueueCancellation(row.hn);
    if (cancellation) {
      return (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }} title={`เหตุผล: ${cancellation.reason}`}>
          <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกคิวแล้ว</ColorfulBadge>
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
            โดย {cancellation.by} · {formatSwDateTime(cancellation.at)}
          </span>
        </div>
      );
    }
    const badge = STATUS_BADGE[row.statusKey] || STATUS_BADGE.waiting;
    const next = getSwNextAppointment(row.hn);
    return (
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
        <ColorfulBadge style={badge.style} size='small' hierarchy='secondary'>{badge.label}</ColorfulBadge>
        {next && (
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
            นัดถัดไป {formatSwDate(next.date)}{next.time ? ` ${next.time} น.` : ''}
          </span>
        )}
      </div>
    );
  };

  const renderActions = (row) => {
    const cancellation = getSwQueueCancellation(row.hn);
    if (!canWrite) {
      return <ColorfulBadge style='grey' size='small' hierarchy='secondary'>สิทธิไม่เพียงพอ</ColorfulBadge>;
    }
    return cancellation ? (
      <BrandSubdueButton
        variant='outline'
        size='sm'
        leadingIcon='restart_alt'
        onClick={(e) => { e.stopPropagation(); restore(row); }}
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

  const renderInsurance = (row) => (
    (row.rightsExpired || row.noRights)
      ? <ColorfulBadge style='orange' size='small' hierarchy='secondary'>{row.insurance}</ColorfulBadge>
      : row.insurance
  );

  const columns = useMemo(() => ([
    { key: 'queue', label: 'คิว', render: renderQueue },
    { key: 'arrivalTime', label: 'เวลารับบริการ', render: (r) => (r.arrivalTime ? `${r.arrivalTime} น.` : '—') },
    { key: 'hn', label: 'HN' },
    { key: 'name', label: 'ชื่อ-นามสกุล', flex: true, minWidth: 170, render: renderName },
    { key: 'sex', label: 'เพศ' },
    { key: 'age', label: 'อายุ' },
    { key: 'cid', label: 'เลขบัตรประชาชน' },
    { key: 'insurance', label: 'สิทธิ', render: renderInsurance },
    { key: 'caseNo', label: 'เลขที่สังคมสงเคราะห์', render: (r) => r.caseNo || <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>ยังไม่ออกเลข</span> },
    { key: 'targetGroup', label: 'กลุ่มเป้าหมาย', render: (r) => resolveSwTargetGroup(r.targetGroup) },
    { key: 'primaryProblem', label: 'ปัญหาหลัก', flex: true, minWidth: 220, render: renderProblem },
    { key: 'worker', label: 'ผู้ให้บริการ', flex: true, minWidth: 180 },
    { key: 'clinic', label: 'คลินิก', render: (r) => resolveSwClinic(r.clinic) },
    { key: 'flags', label: 'Flag', sortable: false, render: renderFlags },
    { key: 'wait', label: 'รอนาน', render: (r) => (r.waitMinutes ? `${r.waitMinutes} นาที` : '—') },
    { key: 'status', label: 'สถานะ', render: renderStatus },
    { key: 'actions', label: 'การดำเนินการ', sortable: false, render: renderActions },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [tick, canWrite]);

  const scheduledColumns = useMemo(() => ([
    { key: 'appointmentTime', label: 'เวลานัด', render: (r) => `${r.appointmentTime} น.` },
    { key: 'hn', label: 'HN' },
    {
      key: 'name', label: 'ชื่อ-นามสกุล', flex: true, minWidth: 170,
      render: (r) => <MaskedWorklistName name={r.name} recordKey={r.hn} className='truncate' />,
    },
    { key: 'cid', label: 'เลขบัตรประชาชน' },
    { key: 'insurance', label: 'สิทธิ' },
    { key: 'caseNo', label: 'เลขที่สังคมสงเคราะห์', render: (r) => r.caseNo || '—' },
    { key: 'purpose', label: 'นัดหมายเรื่อง', flex: true, minWidth: 220 },
    { key: 'worker', label: 'ผู้ให้บริการ', flex: true, minWidth: 180 },
    { key: 'clinic', label: 'คลินิก', render: (r) => resolveSwClinic(r.clinic) },
    {
      key: 'checkin', label: 'การดำเนินการ', sortable: false,
      render: (row) => (
        <BrandSubdueButton
          variant='fill' size='sm' leadingIcon='login'
          disabled={!canWrite}
          onClick={(e) => { e.stopPropagation(); handleCheckIn(row.hn); }}
        >
          รับเข้าคิว
        </BrandSubdueButton>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [canWrite]);

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='งานสังคมสงเคราะห์'
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          {/* Demo toggle สำหรับสถานะ "สิทธิไม่พอ" (mock-only — RBAC จริงมากับ §1.4.2/§1.20) */}
          <NeutralSubdueButton
            size='sm'
            leadingIcon={canWrite ? 'lock_open' : 'lock'}
            onClick={toggleRightsDemo}
            title='สลับสิทธิงานสังคมสงเคราะห์ (สำหรับทดสอบ)'
          >
            {canWrite ? 'สิทธิ: เข้าถึงได้' : 'สิทธิ: ถูกจำกัด'}
          </NeutralSubdueButton>
          <BrandSubdueButton variant='outline' leadingIcon='contact_page' onClick={() => history.push('/clinic/social-work/registry')}>
            ทะเบียนผู้รับบริการ
          </BrandSubdueButton>
          <BrandSubdueButton variant='outline' leadingIcon='inventory_2' onClick={() => history.push('/clinic/social-work/supplies')}>
            รับ-จ่ายวัสดุ
          </BrandSubdueButton>
          <BrandSubdueButton variant='outline' leadingIcon='assignment_ind' onClick={() => history.push('/clinic/social-work/requesters')}>
            ทะเบียนผู้ขอวัสดุ
          </BrandSubdueButton>
          <BrandSubdueButton variant='outline' leadingIcon='monitoring' onClick={() => history.push('/clinic/social-work/follow-up')}>
            ติดตามการบริการ
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
        title='ยกเลิกคิวงานสังคมสงเคราะห์'
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
          placeholder='เช่น ผู้รับบริการขอเลื่อนนัด / มาผิดคลินิก / กลับก่อนพบนักสังคมสงเคราะห์'
        />
      </Popup>

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
        {!canWrite && (
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
              บัญชีนี้ไม่มีสิทธิงานสังคมสงเคราะห์ (§1.4.2) — ดูคิวได้แต่ปัญหาที่เป็นข้อมูลลับถูกปกปิด
              และไม่สามารถรับเข้าคิว ยกเลิกคิว หรือบันทึกข้อมูลได้
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
                if (match) handleRowClick(match);
              }}
              suggestions={searchSuggestions}
              history={searchHistory}
              onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
              placeholder='ค้นหา HN / เลขบัตรประชาชน / ชื่อ-สกุล / เลขที่สังคมสงเคราะห์ (เลข CASE)'
              width={640}
              avatars={searchAvatars}
            />
          </div>

          <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
              <FilterDropdown prefix='กลุ่มเป้าหมาย:' options={FILTER_OPTIONS.targetGroup} value={filters.targetGroup} onChange={setFilter('targetGroup')} />
              <FilterDropdown prefix='การรับเรื่อง:' options={FILTER_OPTIONS.intakeChannel} value={filters.intakeChannel} onChange={setFilter('intakeChannel')} />
              <FilterDropdown prefix='ผู้ให้บริการ:' options={FILTER_OPTIONS.worker} value={filters.worker} onChange={setFilter('worker')} />
              <FilterDropdown prefix='คลินิก:' options={FILTER_OPTIONS.clinic} value={filters.clinic} onChange={setFilter('clinic')} />
              <FilterDateTag
                prefix='วัน:'
                value={filters.dateValue}
                onChange={setFilter('dateValue')}
                defaultQuick={FILTER_DEFAULTS.dateValue.quick}
                quickLabels={DATE_CHIP_LABELS}
              />
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
            <SmoothFilterResults opaque={resultsOpaque}>
              <>
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
                emptyMessage={
                  searchQ.trim()
                    ? `ไม่พบผู้รับบริการที่ตรงกับ "${searchQ.trim()}" — ลองล้างตัวกรองหรือค้นด้วย HN`
                    : 'ยังไม่มีผู้รับบริการในคิววันนี้'
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

export default SocialWorkQueuePage;
