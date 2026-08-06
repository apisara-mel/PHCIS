import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import FilterDateTag from '@/components/forms/FilterDateTag';
import { computeQuickRange, computeQuickSingle } from '@/components/popup/DateFilterPopup';
import Dropdown from '@/components/forms/Dropdown';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import Popover from '@/components/popup/Popover';
import Tooltip from '@/components/tooltip/Tooltip';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import QueuePatientAvatar from '@/components/patient/QueuePatientAvatar';
import BrandIconButton from '@/components/button/BrandIconButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import SuccessToast from '@/components/toast/SuccessToast';
import Alert from '@/components/alert/Alert';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';

import { QueueTicketPrintRoot } from './QueueTicket';
import {
  QueueReasonPopup,
  QueueEditPopup,
  QueueHistoryPopup,
  QueueTicketPopup,
  RevealConfirmPopup,
} from './QueueCenterPopups';
import {
  useQueueCenter,
  QueueCenterSubNav,
  StationChipBar,
  StatusChip,
  QueueTypeChip,
  QueueCodeCell,
  MaskedIdentifier,
  WaitCell,
  EmptyState,
  ReadOnlyBanner,
  RoleSwitcher,
  PaginationFooter,
  PAGE_BODY_STYLE,
  CARD_STYLE,
} from './queueCenterShared';
import {
  QUEUE_STATIONS,
  PHARMACY_PREP_STATUSES,
  ENTRY_CHANNELS,
  getQueueTypes,
  getStation,
  getQueuesByStation,
  getQueueById,
  nextQueues,
  currentByStation,
  remainingCount,
  stationSummary,
  waitMinutes,
  waitThresholdFor,
  isOverdue,
  isQueueClosed,
  formatClock,
  getQueueActor,
  getQueueSettings,
  callQueue,
  recallQueue,
  skipQueue,
  restoreSkipped,
  confirmArrival,
  pauseQueue,
  resumeQueue,
  transferQueue,
  reorderQueue,
  prioritizeQueue,
  editQueue,
  cancelQueue,
  completeQueue,
  reprintTicket,
  printQueueTicket,
  logPiiReveal,
} from '@/data/queueCenterStore';

/* ════════════════════════════════════════════════════════════════════════
   QueueCenterConsolePage — จัดการคิวและเรียกคิว (TOR §1.3)

   ครอบคลุม: 1.3.1.1–1.3.1.5 (จัดลำดับ / พัก / โอน / แก้ไข / ยกเลิก),
   1.3.3.1–1.3.3.3 (เรียก / เรียกซ้ำ / ข้าม), 1.3.5.1–1.3.5.2 (เสร็จสิ้น),
   1.3.4.3 (เรียกซ้ำฝั่งเจ้าหน้าที่), 1.3.4.5 (ยืนยันการมา),
   1.3.6.2 (สถานะเตรียมยาบนคิว), 1.3.7.2 (เตือนเวลารอเกินเกณฑ์)

   ปุ่มเรียกคิวใช้ pattern เดียวกับ FinancePaymentPage (PR#33) และ
   RegistrationQueuePage: `BrandIconButton icon='volume_up'` เข้ารหัสสถานะ
   ด้วย variant (fill / quaternary / ghost-disabled) + `key` บังคับ remount
   ตอน variant เปลี่ยน เพราะ node ที่ถือค่า var() อยู่แล้วจะไม่ recompute
   เมื่อ declaration เปลี่ยนไปอ้าง var() ตัวใหม่

   ไม่มี DnD library ในโปรเจกต์ (และห้ามเพิ่ม dependency) — การจัดลำดับจึงใช้
   "เลื่อนขึ้น/ลง" + "เรียกคิวนี้ก่อน" + ช่องลำดับใน Popup แก้ไขแทนการลากวาง
   ════════════════════════════════════════════════════════════════════════ */

const breadcrumb = ['ระบบบริหารจัดการคิว', 'จัดการคิวและเรียกคิว'];
const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:queue-center';
const PAGE_SIZE = 15;

const TAB_FILTERS = {
  waiting: (q) => q.status === 'waiting' || q.status === 'calling',
  serving: (q) => q.status === 'serving',
  paused: (q) => q.status === 'paused',
  passed: (q) => q.status === 'passed',
  done: (q) => q.status === 'done',
  cancelled: (q) => q.status === 'cancelled',
};

const TIME_BUCKETS = {
  morning: [6, 12],
  afternoon: [12, 18],
  evening: [18, 24],
};

const FILTER_DEFAULTS = {
  queueType: 'all',
  time: 'all',
  source: 'all',
  dateValue: { quick: 'today' },
};

const DATE_CHIP_LABELS = { today: 'วันนี้', yesterday: 'เมื่อวาน' };

/* ── ตัวกรองวัน (chip "วัน:") ───────────────────────────────────────────
   แปลงค่า FilterDateTag → ช่วงวัน {start,end} แบบ inclusive โดยใช้
   computeQuickSingle / computeQuickRange ตัวเดียวกับที่ popup ใช้ ป้ายบน chip
   กับผลการกรองจึงไม่มีวันตีความ "สัปดาห์นี้" ไม่ตรงกัน (pattern เดียวกับ
   XrayQueuePage.resolveDateRange) — คืน null = ไม่กรองวัน                */
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const resolveDateRange = (value) => {
  if (!value) return null;
  if (value.quick === 'custom') {
    if (value.tab === 'single' && value.single) {
      const day = startOfDay(value.single);
      return { start: day, end: day };
    }
    if (value.tab === 'range' && value.range?.start && value.range?.end) {
      return { start: startOfDay(value.range.start), end: startOfDay(value.range.end) };
    }
    return null;
  }
  const single = computeQuickSingle(value.quick);
  if (single) return { start: startOfDay(single), end: startOfDay(single) };
  const range = computeQuickRange(value.quick);
  return range ? { start: startOfDay(range.start), end: startOfDay(range.end) } : null;
};

const issuedWithin = (q, range) => {
  if (!range) return true;
  if (!q?.issuedAt) return false;
  const day = startOfDay(new Date(q.issuedAt));
  return day >= range.start && day <= range.end;
};

/** แถวที่ยกเลิกแสดงจาง + ขีดฆ่า (พฤติกรรมคู่มือระบบงานส่งตรวจ §2.2) */
const cancelledWrap = (row, node) => (
  row.status === 'cancelled'
    ? (
      <span
        className='inline-flex min-w-0'
        style={{ opacity: 0.6, textDecoration: 'line-through', textDecorationColor: 'var(--text-danger-default)' }}
      >
        {node}
      </span>
    )
    : node
);

const QueueCenterConsolePage = () => {
  useQueueCenter();
  const history = useHistory();
  const actor = getQueueActor();
  const canOperate = actor.canOperate;

  const [stationId, setStationId] = useState(QUEUE_STATIONS[1]?.id || QUEUE_STATIONS[0].id);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const [reasonPopup, setReasonPopup] = useState(null);   /* { mode, queue } */
  const [editTarget, setEditTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [ticketTarget, setTicketTarget] = useState(null);
  const [revealTarget, setRevealTarget] = useState(null);
  const [revealed, setRevealed] = useState({});           /* `${id}:${field}` → true */
  const [toast, setToast] = useState('');
  const [banner, setBanner] = useState(null);             /* { type, title, subtext } */
  const [printError, setPrintError] = useState('');

  const [rowMenu, setRowMenu] = useState(null);
  const rowMenuAnchorRef = useRef(null);

  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: [] });

  const station = getStation(stationId);
  /* อ่านสดทุก render — `useQueueCenter()` บังคับ re-render ทุกครั้งที่ store
     notify() อยู่แล้ว การ memo ด้วย dep ภายนอกจะทำให้ตารางค้าง */
  const rows = getQueuesByStation(stationId);
  const summary = stationSummary(stationId);
  const current = currentByStation[stationId];
  const upcoming = nextQueues(stationId).slice(0, 3);
  const isPharmacy = station?.serviceType === 'pharmacy';

  /* แจ้งเตือนเมื่อมีคิวเกินเกณฑ์ (1.3.7.2) — ระดับและช่องทางมาจากหน้าตั้งค่า
     ไม่ hardcode: waitAlert.level → tone ของ Alert, waitAlert.channels
     ตัดสินว่าจะขึ้น banner ('screen') และ/หรือ toast ('toast') หรือไม่
     ('display' เป็นของโมดูลจอแสดงคิว ไม่มีผลกับหน้านี้) */
  const waitAlert = getQueueSettings().waitAlert;
  const alertTone = waitAlert.level === 'critical'
    ? 'destructive'
    : (waitAlert.level === 'info' ? 'info' : 'warning');
  const highlightOverdue = waitAlert.channels.includes('screen');
  const overdueCount = summary.overdue;
  const prevOverdue = useRef(overdueCount);
  useEffect(() => {
    if (overdueCount > prevOverdue.current) {
      const title = `มีคิวรอเกินเกณฑ์ ${overdueCount} รายการที่ ${station?.label || ''}`;
      if (waitAlert.channels.includes('screen')) {
        setBanner({
          type: alertTone,
          title,
          subtext: 'ปรับลำดับ เรียกคิวเพิ่ม หรือโอนไปจุดบริการอื่นเพื่อลดเวลารอ',
        });
      }
      if (waitAlert.channels.includes('toast')) setToast(title);
    }
    prevOverdue.current = overdueCount;
  }, [overdueCount, station, alertTone, waitAlert.channels]);

  const notify = (message) => setToast(message);

  const run = (result, successMessage) => {
    if (!result) return;
    if (result.ok) {
      if (successMessage) notify(successMessage);
      setBanner(null);
    } else {
      setBanner({ type: 'destructive', title: 'ทำรายการไม่สำเร็จ', subtext: result.message });
    }
  };

  /* ────────────────────────────────────────────────────────── filters */

  const setFilter = (key) => (val) => { setFilters((f) => ({ ...f, [key]: val })); setPage(1); };
  const isAllDefault =
    filters.queueType === FILTER_DEFAULTS.queueType
    && filters.time === FILTER_DEFAULTS.time
    && filters.source === FILTER_DEFAULTS.source
    && filters.dateValue?.quick === FILTER_DEFAULTS.dateValue.quick;

  const queueTypes = getQueueTypes();

  const FILTER_OPTIONS = useMemo(() => ({
    queueType: [{ value: 'all', label: 'ทุกประเภท' }, ...queueTypes.map((t) => ({ value: t.key, label: t.label }))],
    time: [
      { value: 'all', label: 'ทั้งวัน' },
      { value: 'morning', label: 'ช่วงเช้า (06:00–12:00)' },
      { value: 'afternoon', label: 'ช่วงบ่าย (12:00–18:00)' },
      { value: 'evening', label: 'ช่วงเย็น (18:00–24:00)' },
    ],
    source: [{ value: 'all', label: 'ทุกแหล่งที่มา' }, ...ENTRY_CHANNELS.map((c) => ({ value: c.key, label: c.label }))],
  }), [queueTypes]);

  const filtered = useMemo(() => {
    let result = rows;
    const pred = TAB_FILTERS[activeTab];
    if (pred) result = result.filter(pred);
    if (filters.queueType !== 'all') result = result.filter((q) => q.queueType === filters.queueType);
    if (filters.source !== 'all') result = result.filter((q) => q.entryChannel === filters.source);
    const dateRange = resolveDateRange(filters.dateValue);
    if (dateRange) result = result.filter((q) => issuedWithin(q, dateRange));
    if (filters.time !== 'all') {
      const [from, to] = TIME_BUCKETS[filters.time] || [0, 24];
      result = result.filter((q) => {
        const h = new Date(q.issuedAt).getHours();
        return h >= from && h < to;
      });
    }
    const q = searchQ.trim().toLowerCase();
    if (q) {
      result = result.filter((row) => [
        row.code,
        row.patient?.hn,
        row.patient?.nationalId,
        row.patient?.name,
        row.patient?.fullName,
        row.doctor,
      ].some((f) => f && String(f).toLowerCase().includes(q)));
    }
    return result;
  }, [rows, activeTab, filters, searchQ]);

  const sorted = useMemo(() => {
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    const base = (a, b) => (a.order - b.order) || (new Date(a.issuedAt) - new Date(b.issuedAt));
    if (!sortConfig.key) return [...filtered].sort(base);
    const value = (row, key) => {
      switch (key) {
        case 'order': return row.order;
        case 'code': return row.code;
        case 'patient': return row.patient?.name || '';
        case 'issuedAt': return new Date(row.issuedAt).getTime();
        case 'wait': return waitMinutes(row);
        case 'status': return row.status;
        case 'queueType': return row.queueType;
        case 'pharmacy': return row.pharmacyStatus || '';
        default: return '';
      }
    };
    const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
    return [...filtered].sort((a, b) => {
      const av = value(a, sortConfig.key);
      const bv = value(b, sortConfig.key);
      const primary = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : collator.compare(String(av), String(bv));
      return primary !== 0 ? sign * primary : base(a, b);
    });
  }, [filtered, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = sorted.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, sorted.length);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  /* ───────────────────────────────────────────────────── privacy reveal */

  const isRevealed = (queue, field) => !!revealed[`${queue.id}:${field}`];
  const requestReveal = (payload) => setRevealTarget(payload);
  const confirmReveal = () => {
    if (!revealTarget) return;
    setRevealed((r) => ({ ...r, [`${revealTarget.queueId}:${revealTarget.field}`]: true }));
    logPiiReveal(revealTarget.queueId, revealTarget.field);
    setRevealTarget(null);
  };

  /* ─────────────────────────────────────────────────────────── actions */

  const doCall = (row) => {
    const res = row.callCount > 0 ? recallQueue(row.id) : callQueue(row.id);
    if (res.throttled) {
      setBanner({ type: 'warning', title: 'เรียกซ้ำถี่เกินไป', subtext: res.message });
      return;
    }
    run(res, row.callCount > 0 ? `เรียกซ้ำคิว ${row.code} แล้ว` : `เรียกคิว ${row.code} แล้ว`);
  };

  const doPauseResume = (row) => {
    if (row.status === 'paused') { run(resumeQueue(row.id), `คืนคิว ${row.code} เข้าแถวแล้ว`); return; }
    setReasonPopup({ mode: 'pause', queue: row });
  };

  const openRowMenu = (row, anchorEl) => {
    rowMenuAnchorRef.current = anchorEl;
    setRowMenu({ row });
  };
  const closeRowMenu = () => setRowMenu(null);

  const menuItems = (row) => {
    const closed = isQueueClosed(row);
    return [
      {
        key: 'prioritize',
        label: 'เรียกคิวนี้ก่อน (แทรกคิว)',
        icon: 'low_priority',
        disabled: !canOperate || closed,
        onClick: () => setReasonPopup({ mode: 'prioritize', queue: row }),
      },
      {
        key: 'up',
        label: 'เลื่อนลำดับขึ้น',
        icon: 'arrow_upward',
        disabled: !canOperate || closed || row.status !== 'waiting',
        onClick: () => run(reorderQueue(row.id, 'up'), `เลื่อนคิว ${row.code} ขึ้นแล้ว`),
      },
      {
        key: 'down',
        label: 'เลื่อนลำดับลง',
        icon: 'arrow_downward',
        disabled: !canOperate || closed || row.status !== 'waiting',
        onClick: () => run(reorderQueue(row.id, 'down'), `เลื่อนคิว ${row.code} ลงแล้ว`),
      },
      {
        key: 'restore',
        label: 'คืนคิวที่ข้ามเข้าแถว',
        icon: 'restart_alt',
        disabled: !canOperate || row.status !== 'passed',
        onClick: () => run(restoreSkipped(row.id, { mode: 'append', reason: 'ผู้รับบริการกลับมาแสดงตน' }), `คืนคิว ${row.code} เข้าท้ายรอบแล้ว`),
      },
      {
        key: 'edit',
        label: closed ? 'ดูข้อมูลคิว (อ่านอย่างเดียว)' : 'แก้ไขข้อมูลคิว',
        icon: 'edit',
        disabled: false,
        onClick: () => setEditTarget(row),
      },
      {
        key: 'reprint',
        label: 'พิมพ์บัตรคิวซ้ำ',
        icon: 'print',
        /* คิวที่ยกเลิก/เสร็จสิ้นแล้วพิมพ์ซ้ำไม่ได้ (store ก็ปฏิเสธเช่นกัน) */
        disabled: !canOperate || closed,
        onClick: () => setReasonPopup({ mode: 'reprint', queue: row }),
      },
      {
        key: 'history',
        label: 'ประวัติคิว',
        icon: 'history',
        disabled: false,
        onClick: () => setHistoryTarget(row),
      },
      {
        key: 'cancel',
        label: 'ยกเลิกคิว',
        icon: 'cancel',
        danger: true,
        disabled: !canOperate || closed,
        onClick: () => setReasonPopup({ mode: 'cancel', queue: row }),
      },
    ];
  };

  const handleReasonConfirm = ({ reason, toStationId }) => {
    const { mode, queue } = reasonPopup;
    switch (mode) {
      case 'transfer': {
        const res = transferQueue(queue.id, toStationId, reason);
        if (res.ok) notify(`โอนคิวไป ${getStation(toStationId)?.label} แล้ว — รหัสใหม่ ${res.queue.code}`);
        return res;
      }
      case 'cancel': {
        const res = cancelQueue(queue.id, reason);
        if (res.ok) notify(`ยกเลิกคิว ${queue.code} แล้ว (ยังแสดงในตารางแบบขีดฆ่า)`);
        return res;
      }
      case 'prioritize': {
        const res = prioritizeQueue(queue.id, reason);
        if (res.ok) notify(`ย้ายคิว ${queue.code} ไปต้นแถวแล้ว`);
        return res;
      }
      case 'skip': {
        const res = skipQueue(queue.id, reason);
        if (res.ok) notify(`ข้ามคิว ${queue.code} แล้ว — เรียกกลับได้จากแท็บ "ข้ามคิว"`);
        return res;
      }
      case 'pause': {
        const res = pauseQueue(queue.id, reason);
        if (res.ok) notify(`พักคิว ${queue.code} แล้ว`);
        return res;
      }
      case 'reprint': {
        const res = reprintTicket(queue.id, reason);
        if (res.ok) {
          setTicketTarget(getQueueById(queue.id));
          notify(`บันทึกการพิมพ์ซ้ำคิว ${queue.code} แล้ว`);
        }
        return res;
      }
      default:
        return { ok: false, message: 'ไม่รู้จักคำสั่งนี้' };
    }
  };

  const handlePrint = () => {
    const res = printQueueTicket('ticket');
    if (!res.ok) { setPrintError(res.message); return; }
    setPrintError('');
    notify('ส่งบัตรคิวเข้าเครื่องพิมพ์แล้ว');
  };

  /* จำนวนคิวข้างหน้าของบัตรที่กำลังเปิด — สูตรเดียวกับ QueueTicketPopup
     เพื่อให้บัตรบนจอกับบัตรที่พิมพ์ออกมาบอกตัวเลขเดียวกัน */
  const ticketWaitingAhead = ticketTarget
    ? Math.max(0, nextQueues(ticketTarget.stationId).findIndex((q) => q.id === ticketTarget.id))
    : 0;

  /* ─────────────────────────────────────────────────────────── columns */

  const renderPatient = (row) => (
    <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
      <QueuePatientAvatar
        name={row.patient?.name}
        hn={row.patient?.hn}
        avatarUrl={row.patient?.avatarUrl}
        size={32}
        newUser={!row.patient?.hn}
      />
      <div className='flex-1 min-w-0 flex flex-col'>
        {cancelledWrap(row, (
          <MaskedWorklistName
            name={row.patient?.name}
            recordKey={row.id || row.patient?.hn}
            emptyLabel='ผู้รับบริการไม่ระบุตัวตน'
            className='truncate'
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
              fontWeight: 'var(--type-weight-medium, 500)',
              color: 'var(--text-content-primary)',
            }}
          />
        ))}
        <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100)' }}>
          {/* §1.4.2 — บทบาท "อ่านอย่างเดียว" ห้ามเปิดดูข้อมูลส่วนบุคคล
              (ไม่ส่ง disabled = ปุ่มตายังกดได้ tooltip "ไม่มีสิทธิ" กลายเป็น dead code) */}
          <MaskedIdentifier
            queueId={row.id}
            field='HN'
            value={row.patient?.hn}
            revealed={isRevealed(row, 'HN')}
            onRequestReveal={requestReveal}
            disabled={!canOperate}
          />
          {row.patient?.rightsExpired ? (
            <Tooltip content='สิทธิการรักษาหมดอายุ/ตรวจสอบไม่ได้ — โปรดตรวจสอบที่เวชระเบียน' position='top'>
              <span className='inline-flex'>
                <ColorfulBadge style='red' size='small' hierarchy='secondary' icon='gpp_maybe' showIcon>
                  ตรวจสอบสิทธิ
                </ColorfulBadge>
              </span>
            </Tooltip>
          ) : null}
        </span>
      </div>
    </div>
  );

  const renderActions = (row) => {
    const closed = isQueueClosed(row);
    const paused = row.status === 'paused';
    const called = row.callCount > 0;
    const canCall = canOperate && !closed && !paused;
    const callVariant = !canCall ? 'ghost' : called ? 'quaternary' : 'fill';
    const callState = !canCall ? 'off' : called ? 'called' : 'ready';

    return (
      <div className='flex items-center justify-end' style={{ gap: 'var(--dim-space-150)' }}>
        <Tooltip
          content={!canOperate
            ? 'ต้องมีสิทธิเจ้าหน้าที่จุดบริการ'
            : closed ? 'คิวนี้ปิดแล้ว' : paused ? 'คิวถูกพักอยู่ — กดคืนคิวก่อน' : called ? `เรียกแล้ว ${row.callCount} ครั้ง · ล่าสุด ${formatClock(row.lastCallAt)} น. — กดเพื่อเรียกซ้ำ` : 'เรียกคิว'}
          position='top'
        >
          <span className='inline-flex'>
            {/* Remount เมื่อ variant เปลี่ยน — node ที่ถือค่า var() เดิมจะไม่
                recompute เมื่อ declaration ชี้ var() ตัวใหม่ (bug ที่พบใน
                FinancePaymentPage PR#33) ทำให้สีปุ่มค้าง */}
            <BrandIconButton
              key={`call-${row.id}-${callState}`}
              icon='volume_up'
              size='sm'
              variant={callVariant}
              disabled={!canCall}
              aria-label={called ? 'เรียกคิวซ้ำ' : 'เรียกคิว'}
              onClick={canCall ? (e) => { e.stopPropagation(); doCall(row); } : undefined}
            />
          </span>
        </Tooltip>

        <Tooltip
          content={!canOperate ? 'ต้องมีสิทธิเจ้าหน้าที่จุดบริการ' : paused ? 'คืนคิวเข้าแถว' : 'พักคิว'}
          position='top'
        >
          <span className='inline-flex'>
            <BrandIconButton
              key={`pause-${row.id}-${paused ? 'on' : 'off'}`}
              icon={paused ? 'play_arrow' : 'pause'}
              size='sm'
              variant='quaternary'
              disabled={!canOperate || closed}
              aria-label={paused ? 'คืนคิวเข้าแถว' : 'พักคิว'}
              onClick={!canOperate || closed ? undefined : (e) => { e.stopPropagation(); doPauseResume(row); }}
            />
          </span>
        </Tooltip>

        <Tooltip content={!canOperate ? 'ต้องมีสิทธิเจ้าหน้าที่จุดบริการ' : 'โอนจุดบริการ'} position='top'>
          <span className='inline-flex'>
            <BrandIconButton
              icon='swap_horiz'
              size='sm'
              variant='quaternary'
              disabled={!canOperate || closed}
              aria-label='โอนจุดบริการ'
              onClick={!canOperate || closed ? undefined : (e) => { e.stopPropagation(); setReasonPopup({ mode: 'transfer', queue: row }); }}
            />
          </span>
        </Tooltip>

        <Tooltip content='ตัวเลือกเพิ่มเติม' position='top'>
          <span className='inline-flex'>
            <BrandIconButton
              icon='more_vert'
              size='sm'
              variant='quaternary'
              aria-label='ตัวเลือกเพิ่มเติม'
              onClick={(e) => { e.stopPropagation(); openRowMenu(row, e.currentTarget); }}
            />
          </span>
        </Tooltip>
      </div>
    );
  };

  const columns = useMemo(() => ([
    { key: 'order', label: 'ลำดับ', width: 72, render: (row) => cancelledWrap(row, <span>{row.order}</span>) },
    { key: 'code', label: 'รหัสคิว', width: 108, render: (row) => <QueueCodeCell queue={row} /> },
    { key: 'patient', label: 'ผู้รับบริการ', flex: true, minWidth: 220, render: renderPatient },
    { key: 'queueType', label: 'ประเภทคิว / ความเร่งด่วน', width: 200, render: (row) => <QueueTypeChip queueType={row.queueType} urgency={row.urgency} /> },
    { key: 'issuedAt', label: 'เวลาออกคิว', width: 116, render: (row) => cancelledWrap(row, <span>{`${formatClock(row.issuedAt)} น.`}</span>) },
    {
      key: 'wait',
      label: 'รอมาแล้ว',
      width: 132,
      /* ไฮไลต์ในตารางเปิด/ปิดตามช่องทาง 'screen' ของการเตือนเวลารอ */
      render: (row) => (
        <WaitCell
          minutes={waitMinutes(row)}
          overdue={isOverdue(row) && highlightOverdue}
          threshold={waitThresholdFor(row)}
        />
      ),
    },
    ...(isPharmacy ? [{
      key: 'pharmacy',
      label: 'สถานะเตรียมยา',
      width: 148,
      render: (row) => {
        const meta = PHARMACY_PREP_STATUSES.find((s) => s.key === row.pharmacyStatus);
        return meta
          ? <ColorfulBadge style={meta.color} size='small' hierarchy='secondary'>{meta.label}</ColorfulBadge>
          : <span style={{ color: 'var(--text-content-tertiary)' }}>—</span>;
      },
    }] : []),
    {
      key: 'status',
      label: 'สถานะ',
      width: 168,
      render: (row) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
          <StatusChip status={row.status} />
          {row.status === 'cancelled' && row.cancelReason ? (
            <Tooltip content={`${row.cancelReason} · โดย ${row.cancelledBy || '—'}`} position='top'>
              <span
                className='truncate'
                style={{
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xxs, 10px)',
                  color: 'var(--text-danger-default)',
                  maxWidth: 'var(--dim-size-2100, 160px)',
                }}
              >
                {row.cancelReason}
              </span>
            </Tooltip>
          ) : null}
        </div>
      ),
    },
    { key: 'actions', label: 'การดำเนินการ', width: 200, sortable: false, render: renderActions },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [isPharmacy, canOperate, revealed, stationId, highlightOverdue]);

  /* ────────────────────────────────────────────────────────────── shell */

  const summaryCards = [
    { key: 'waiting', label: 'รอเรียก', value: summary.waiting + summary.calling, indicator: `คงเหลือ ${remainingCount(stationId)} คิว`, color: 'info', icon: 'hourglass_top' },
    { key: 'serving', label: 'กำลังให้บริการ', value: summary.serving, indicator: station?.label || '', color: 'positive', icon: 'support_agent' },
    { key: 'paused', label: 'พักคิว / ข้ามคิว', value: summary.paused + summary.passed, indicator: 'เรียกกลับได้', color: 'inprogress', icon: 'pause_circle' },
    { key: 'done', label: 'เสร็จสิ้นวันนี้', value: summary.done, indicator: `ยกเลิก ${summary.cancelled}`, color: 'brand', icon: 'task_alt' },
    { key: 'overdue', label: 'รอเกินเกณฑ์', value: summary.overdue, indicator: `เกณฑ์ ${waitThresholdFor({ queueType: 'general' })} นาที`, color: 'destructive', icon: 'running_with_errors' },
  ];

  const tabs = useMemo(() => ([
    { key: 'all', label: 'ทั้งหมด', icon: 'list' },
    { key: 'waiting', label: 'รอเรียก', icon: 'hourglass_top' },
    { key: 'serving', label: 'กำลังให้บริการ', icon: 'support_agent' },
    { key: 'paused', label: 'พักคิว', icon: 'pause_circle' },
    { key: 'passed', label: 'ข้ามคิว', icon: 'skip_next' },
    { key: 'done', label: 'เสร็จสิ้น', icon: 'task_alt' },
    { key: 'cancelled', label: 'ยกเลิก', icon: 'cancel' },
  ]), []);

  const actions = (
    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
      <RoleSwitcher />
      <Dropdown
        value={stationId}
        onChange={(v) => { setStationId(v); setPage(1); }}
        options={QUEUE_STATIONS.map((s) => ({
          value: s.id,
          label: `${s.prefix} · ${s.label}${s.active ? '' : ' (ปิดรับคิว)'}`,
        }))}
        className='w-72'
      />
      <BrandPrimaryButton leadingIcon='add' onClick={() => history.push('/queue-center/issue')}>
        ออกคิว
      </BrandPrimaryButton>
      <NeutralSubdueButton
        variant='outline'
        size='md'
        leadingIcon='settings'
        onClick={() => history.push('/queue-center/settings')}
      >
        ตั้งค่าระบบคิว
      </NeutralSubdueButton>
    </div>
  );

  /* หมายเหตุ layout: QueuePageShell ทำให้ทั้ง `belowSummary` และแถบแท็บ sticky
     ที่ตำแหน่งเดียวกัน (top = stickyTopOffset) แถบแท็บจึงทับ belowSummary ตอน
     เลื่อนหน้า — หน้าเหล่านี้มีแท็บอยู่แล้ว จึงวางเมนูย่อย + ชิปจุดบริการไว้
     ต้นเนื้อหาหน้า (เลื่อนหายไปตามปกติ) แทนการใช้ slot นั้น */
  const moduleNav = (
    <div className='w-full flex flex-col'>
      <QueueCenterSubNav />
      <StationChipBar
        stations={QUEUE_STATIONS}
        activeId={stationId}
        onSelect={(id) => { setStationId(id); setPage(1); }}
        summaryOf={stationSummary}
      />
    </div>
  );

  /* ─────────────────────────────────────────────── now-serving panel */

  const nowServingPanel = (
    <section className='w-full flex flex-col' style={CARD_STYLE}>
      <div className='w-full flex items-start flex-wrap' style={{ gap: 'var(--dim-space-600)' }}>
        <div
          className='flex flex-col items-center justify-center shrink-0'
          style={{
            minWidth: 'var(--dim-size-2450, 280px)',
            background: 'var(--surface-brandPrimary-quaternary)',
            borderRadius: 'var(--dim-radius-450, 14px)',
            paddingTop: 'var(--dim-space-500)',
            paddingRight: 'var(--dim-space-500)',
            paddingBottom: 'var(--dim-space-500)',
            paddingLeft: 'var(--dim-space-500)',
            gap: 'var(--dim-space-150)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs, 12px)',
              color: 'var(--text-content-secondary)',
            }}
          >
            กำลังเรียก / ให้บริการ
          </span>
          <span
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-5xl, 48px)',
              fontWeight: 'var(--type-weight-bold, 700)',
              lineHeight: 1.05,
              color: 'var(--text-brandPrimary-default)',
            }}
          >
            {current ? current.code : '—'}
          </span>
          <span
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
              color: 'var(--text-content-primary)',
              textAlign: 'center',
            }}
          >
            {current ? (current.patient?.name || 'ผู้รับบริการไม่ระบุตัวตน') : 'ยังไม่มีคิวที่กำลังเรียก'}
          </span>
          {current ? (
            <span
              style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs, 12px)',
                color: 'var(--text-content-tertiary)',
              }}
            >
              {`เรียกแล้ว ${current.callCount} ครั้ง · ล่าสุด ${formatClock(current.lastCallAt)} น.`}
            </span>
          ) : null}
        </div>

        <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
            <BrandSubdueButton
              variant='fill'
              size='md'
              leadingIcon='volume_up'
              disabled={!canOperate || !current}
              onClick={() => current && doCall(current)}
            >
              เรียกซ้ำ
            </BrandSubdueButton>
            <NeutralSubdueButton
              variant='outline'
              size='md'
              leadingIcon='how_to_reg'
              disabled={!canOperate || !current}
              onClick={() => current && run(confirmArrival(current.id), `ยืนยันผู้รับบริการคิว ${current.code} มาแล้ว`)}
            >
              ยืนยันมาแล้ว
            </NeutralSubdueButton>
            <NeutralSubdueButton
              variant='outline'
              size='md'
              leadingIcon='skip_next'
              disabled={!canOperate || !current}
              onClick={() => current && setReasonPopup({ mode: 'skip', queue: current })}
            >
              ข้ามคิว
            </NeutralSubdueButton>
            <NeutralSubdueButton
              variant='outline'
              size='md'
              leadingIcon='pause'
              disabled={!canOperate || !current}
              onClick={() => current && setReasonPopup({ mode: 'pause', queue: current })}
            >
              พักคิว
            </NeutralSubdueButton>
            <NeutralSubdueButton
              variant='outline'
              size='md'
              leadingIcon='swap_horiz'
              disabled={!canOperate || !current}
              onClick={() => current && setReasonPopup({ mode: 'transfer', queue: current })}
            >
              โอนจุดบริการ
            </NeutralSubdueButton>
            <BrandSubdueButton
              variant='outline'
              size='md'
              leadingIcon='task_alt'
              disabled={!canOperate || !current}
              onClick={() => current && run(completeQueue(current.id), `ปิดคิว ${current.code} เรียบร้อย`)}
            >
              เสร็จสิ้น
            </BrandSubdueButton>
            {current && !isQueueClosed(current) ? (
              <DangerSubdueButton
                variant='outline'
                size='md'
                leadingIcon='cancel'
                disabled={!canOperate}
                onClick={() => setReasonPopup({ mode: 'cancel', queue: current })}
              >
                ยกเลิกคิว
              </DangerSubdueButton>
            ) : null}
          </div>

          <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
            <span
              style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs, 12px)',
                fontWeight: 'var(--type-weight-bold, 700)',
                color: 'var(--text-content-secondary)',
              }}
            >
              คิวถัดไป
            </span>
            {upcoming.length === 0 ? (
              <span
                style={{
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm, 14px)',
                  color: 'var(--text-content-tertiary)',
                }}
              >
                ไม่มีคิวรอเรียกที่จุดบริการนี้
              </span>
            ) : (
              <div className='flex items-stretch flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                {upcoming.map((q, i) => (
                  <div
                    key={q.id}
                    className='flex items-center'
                    style={{
                      gap: 'var(--dim-space-300)',
                      minWidth: 'var(--dim-size-2450, 280px)',
                      border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary)',
                      borderRadius: 'var(--dim-radius-300, 10px)',
                      paddingTop: 'var(--dim-space-200)',
                      paddingRight: 'var(--dim-space-300)',
                      paddingBottom: 'var(--dim-space-200)',
                      paddingLeft: 'var(--dim-space-300)',
                      background: i === 0 ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100)',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--type-family-body)',
                        fontSize: 'var(--type-size-xl, 20px)',
                        fontWeight: 'var(--type-weight-bold, 700)',
                        color: 'var(--text-brandPrimary-default)',
                      }}
                    >
                      {q.code}
                    </span>
                    <div className='flex-1 min-w-0 flex flex-col'>
                      <span
                        className='truncate'
                        style={{
                          fontFamily: 'var(--type-family-body)',
                          fontSize: 'var(--type-size-sm, 14px)',
                          color: 'var(--text-content-primary)',
                        }}
                      >
                        {q.patient?.name || 'ผู้รับบริการไม่ระบุตัวตน'}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--type-family-body)',
                          fontSize: 'var(--type-size-xxs, 10px)',
                          color: 'var(--text-content-tertiary)',
                        }}
                      >
                        {`รอมาแล้ว ${waitMinutes(q)} นาที`}
                      </span>
                    </div>
                    <BrandIconButton
                      key={`next-call-${q.id}-${q.callCount > 0 ? 'called' : 'ready'}`}
                      icon='volume_up'
                      size='sm'
                      variant={!canOperate ? 'ghost' : q.callCount > 0 ? 'quaternary' : 'fill'}
                      disabled={!canOperate}
                      aria-label={`เรียกคิว ${q.code}`}
                      onClick={canOperate ? () => doCall(q) : undefined}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );

  const noStations = QUEUE_STATIONS.length === 0;

  return (
    <>
      <QueuePageShell
        activeKey='queue-center'
        sidebarFallbackKey='opd'
        breadcrumb={breadcrumb}
        title='ระบบบริหารจัดการคิว'
        actions={actions}
        summaryTitle={station ? `${station.label} · ${station.zone} ${station.floor}` : 'จัดการคิว'}
        summaryCards={summaryCards}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(k) => { setActiveTab(k); setPage(1); }}
      >
        <div className='flex flex-col flex-1 min-w-0' style={PAGE_BODY_STYLE}>
          {moduleNav}

          {!canOperate ? (
            <ReadOnlyBanner message='บทบาทของคุณดูข้อมูลคิวได้อย่างเดียว — ปุ่มเรียกคิว พักคิว โอนคิว ยกเลิก และแก้ไขถูกปิดไว้ ต้องมีสิทธิเจ้าหน้าที่จุดบริการ' />
          ) : null}

          {banner ? (
            <Alert
              type={banner.type}
              title={banner.title}
              subtext={banner.subtext}
              onClose={() => setBanner(null)}
            />
          ) : null}

          {station && !station.active ? (
            <Alert
              type='warning'
              title={`${station.label} ปิดรับคิวชั่วคราว`}
              subtext={`ยังมีคิวค้าง ${remainingCount(stationId)} รายการ — โอนไปจุดบริการอื่นได้จากปุ่มโอนจุดบริการในแต่ละแถว`}
            />
          ) : null}

          {noStations ? (
            <section className='w-full flex flex-col' style={CARD_STYLE}>
              <EmptyState
                icon='settings'
                title='ยังไม่ได้ตั้งค่าจุดบริการ'
                description='กำหนดผังจุดบริการ รหัสคิว และจอแสดงคิวก่อน จึงจะเริ่มออกคิวและเรียกคิวได้'
                action={(
                  <BrandPrimaryButton onClick={() => history.push('/queue-center/settings')}>
                    ไปที่ตั้งค่าระบบคิว
                  </BrandPrimaryButton>
                )}
              />
            </section>
          ) : (
            <>
              {nowServingPanel}

              <section className='w-full flex flex-col' style={CARD_STYLE}>
                <div className='w-full flex items-start justify-center'>
                  <PrimarySearch
                    value={searchQ}
                    onChange={(v) => { setSearchQ(v); setPage(1); }}
                    onSubmit={(label) => { setSearchQ(label); pushHistory(label); setPage(1); }}
                    history={searchHistory}
                    onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
                    placeholder='ค้นหา HN / เลขบัตรประชาชน / ชื่อ-สกุล / รหัสคิว'
                    width={640}
                  />
                </div>

                <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
                  <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
                    <FilterTag value='ทั้งหมด' selected={isAllDefault} onClick={() => { setFilters(FILTER_DEFAULTS); setPage(1); }} />
                    <FilterDropdown prefix='ประเภทคิว:' options={FILTER_OPTIONS.queueType} value={filters.queueType} onChange={setFilter('queueType')} />
                    <FilterDateTag
                      prefix='วัน:'
                      value={filters.dateValue}
                      onChange={setFilter('dateValue')}
                      defaultQuick={FILTER_DEFAULTS.dateValue.quick}
                      quickLabels={DATE_CHIP_LABELS}
                    />
                    <FilterDropdown prefix='ช่วงเวลา:' options={FILTER_OPTIONS.time} value={filters.time} onChange={setFilter('time')} />
                    <FilterDropdown prefix='แหล่งที่มา:' options={FILTER_OPTIONS.source} value={filters.source} onChange={setFilter('source')} />
                  </OverflowFlexRow>
                </div>

                {sorted.length === 0 ? (
                  <EmptyState
                    icon={searchQ.trim() || !isAllDefault ? 'search_off' : 'confirmation_number'}
                    title={searchQ.trim() || !isAllDefault
                      ? 'ไม่พบผู้รับบริการที่ตรงกับคำค้น'
                      : `ยังไม่มีคิวที่ ${station?.label || 'จุดบริการนี้'}`}
                    description={searchQ.trim() || !isAllDefault
                      ? 'ลองตรวจสอบ HN / เลขบัตรประชาชน / ชื่อ-สกุล อีกครั้ง หรือล้างตัวกรองเพื่อดูคิวทั้งหมด'
                      : 'ออกบัตรคิวให้ผู้รับบริการที่เคาน์เตอร์ หรือรอคิวจากตู้ Kiosk และระบบต้นทาง'}
                    action={searchQ.trim() || !isAllDefault ? (
                      <NeutralSubdueButton
                        variant='outline'
                        size='md'
                        leadingIcon='filter_alt_off'
                        onClick={() => { setSearchQ(''); setFilters(FILTER_DEFAULTS); setPage(1); }}
                      >
                        ล้างตัวกรอง
                      </NeutralSubdueButton>
                    ) : (
                      <BrandPrimaryButton leadingIcon='add' onClick={() => history.push('/queue-center/issue')}>
                        ออกคิว
                      </BrandPrimaryButton>
                    )}
                  />
                ) : (
                  <>
                    <Table
                      columns={columns}
                      rows={pageRows}
                      rowKey={(row) => row.id}
                      sortConfig={sortConfig}
                      onSort={(key) => setSortConfig((prev) => (prev.key === key
                        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
                        : { key, direction: 'asc' }))}
                      stickyColCount={2}
                      stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                      emptyMessage='ไม่พบรายการ'
                    />
                    <PaginationFooter rangeStart={rangeStart} rangeEnd={rangeEnd} total={sorted.length}>
                      <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
                    </PaginationFooter>
                  </>
                )}
              </section>
            </>
          )}
        </div>
      </QueuePageShell>

      {/* Row overflow menu */}
      <Popover open={!!rowMenu} onClose={closeRowMenu} anchorRef={rowMenuAnchorRef} style={{ zIndex: 1600 }}>
        {rowMenu ? (
          <div
            className='flex flex-col'
            style={{
              minWidth: 'var(--dim-size-2450, 280px)',
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-300, 10px)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
              boxShadow: 'var(--shadow-drop-bottom-400)',
              paddingTop: 'var(--dim-space-100)',
              paddingBottom: 'var(--dim-space-100)',
            }}
          >
            {menuItems(rowMenu.row).map((item) => (
              <button
                key={item.key}
                type='button'
                disabled={item.disabled}
                onClick={() => { closeRowMenu(); item.onClick(); }}
                className='w-full flex items-center text-left'
                style={{
                  gap: 'var(--dim-space-300)',
                  paddingTop: 'var(--dim-space-200)',
                  paddingRight: 'var(--dim-space-400)',
                  paddingBottom: 'var(--dim-space-200)',
                  paddingLeft: 'var(--dim-space-400)',
                  background: 'transparent',
                  color: item.disabled
                    ? 'var(--text-content-tertiary)'
                    : item.danger ? 'var(--text-danger-default)' : 'var(--text-content-primary)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm, 14px)',
                  opacity: item.disabled ? 0.55 : 1,
                  cursor: item.disabled ? 'not-allowed' : 'pointer',
                }}
                title={item.disabled ? 'ทำรายการนี้ไม่ได้ในสถานะ/สิทธิปัจจุบัน' : undefined}
              >
                <Icon name={item.icon} size={18} />
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
      </Popover>

      <QueueReasonPopup
        open={!!reasonPopup}
        mode={reasonPopup?.mode}
        queue={reasonPopup?.queue}
        stationLabel={station?.label}
        onClose={() => setReasonPopup(null)}
        onConfirm={handleReasonConfirm}
      />

      <QueueEditPopup
        open={!!editTarget}
        queue={editTarget ? getQueueById(editTarget.id) : null}
        canEdit={canOperate}
        onClose={() => setEditTarget(null)}
        onSave={(patch, reason) => {
          const res = editQueue(editTarget.id, patch, reason);
          if (res.ok) notify(`บันทึกการแก้ไขคิว ${editTarget.code} แล้ว`);
          return res;
        }}
      />

      <QueueHistoryPopup
        open={!!historyTarget}
        queue={historyTarget}
        onClose={() => setHistoryTarget(null)}
      />

      <QueueTicketPopup
        open={!!ticketTarget}
        queue={ticketTarget}
        printError={printError}
        onClose={() => { setTicketTarget(null); setPrintError(''); }}
        onPrint={handlePrint}
      />

      <RevealConfirmPopup
        open={!!revealTarget}
        target={revealTarget}
        onClose={() => setRevealTarget(null)}
        onConfirm={confirmReveal}
      />

      <SuccessToast open={!!toast} message={toast} onClose={() => setToast('')} topOffset='var(--dim-space-800, 32px)' />

      {/* เอกสารสำหรับพิมพ์ — portal ไป <body> โดยตรง (ดูหมายเหตุใน QueueTicket) */}
      {/* waitingAhead ต้องคำนวณจริงเหมือน QueueTicketPopup — ถ้า hardcode 0
          บัตรที่พิมพ์ซ้ำจะขึ้น "คิวที่รออยู่ข้างหน้า 0 คิว" ทั้งที่บนจอไม่ใช่ */}
      <QueueTicketPrintRoot queue={ticketTarget} waitingAhead={ticketWaitingAhead} />
    </>
  );
};

export default QueueCenterConsolePage;
