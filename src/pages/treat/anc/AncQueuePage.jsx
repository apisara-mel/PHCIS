import React, { useEffect, useMemo, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import useSearchHistory from '@/components/search/useSearchHistory';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import { FilterDropdown } from '@/components/forms/FilterTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
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
  calculateEDC,
  formatAncDate,
  formatGestationalAge,
  resolveAncRiskLevel,
  cancelAncRegistration,
  reactivateAncRegistration,
  getAncCancellation,
  getAncQueueRows,
  getAncScheduledNotArrived,
  checkInAncAppointment,
} from '@/data/ancVisits';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import { withDoctorAvatars } from '@/pages/appointment/appointmentDoctorRoster';
import DutyRosterAction from '@/components/patient/DutyRosterAction';
import { withEmrRowAction } from '@/components/patient/EmrRowAction';

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

const breadcrumb = ['บันทึกการรักษา', 'คลินิกฝากครรภ์'];
const SUMMARY_TITLE = 'คิวฝากครรภ์ (ANC)';

const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:anc-queue';
const PAGE_SIZE = 20;

/* Tab counts recomputed per-render from `rows`/`scheduledCount` (both
   session-state-dependent — checking in a scheduled appointment moves it
   from the "scheduled" tab into "waiting", same as legacy HCIS p.2-3). */
/* แท็บเรียงตามลำดับการทำงานจริง แล้วปิดท้ายด้วย "รายชื่อผู้ป่วยทั้งหมด" ก่อน
   แท็บ "นัดล่วงหน้า" (มติผู้ใช้ 2 ก.ย. 69) — QueuePageShell เป็นคนต่อท้ายแท็บ
   นัดล่วงหน้าให้เอง แท็บสุดท้ายของอาเรย์นี้จึงอยู่ก่อนหน้ามันเสมอ

   ชื่อแท็บกับเนื้อในตารางต้องตรงกัน (มติผู้ใช้ 2 ก.ย. 69):
     • "คิววันนี้" = คิวของวันนี้ทั้งหมดทุกสถานะ (เดิมชื่อ "รอตรวจ" ซึ่งกรอง
       เฉพาะคนที่ยังไม่ถูกเรียก — ชื่อใหม่กินความกว้างกว่านั้น)
     • "รายชื่อผู้ป่วยทั้งหมด" = ทะเบียนผู้ฝากครรภ์ ไม่ใช่คิว จึงรวมคนที่นัดไว้
       วันนี้แต่ยังไม่มาด้วย และตัดคอลัมน์ที่เป็นเรื่องของคิวออก */
const buildTabs = (rows, scheduledCount, registryCount) => [
  { key: 'today',     label: 'คิววันนี้',             icon: 'schedule',      count: rows.length },
  { key: 'progress',  label: 'กำลังตรวจ',            icon: 'assignment',    count: rows.filter((p) => p.statusKey === 'progress').length },
  { key: 'done',      label: 'ตรวจเสร็จแล้ว',        icon: 'check_circle',  count: rows.filter((p) => p.statusKey === 'done').length },
  { key: 'draft',     label: 'ที่ร่างไว้',            icon: 'save',          count: rows.filter((p) => p.statusKey === 'draft').length },
  { key: 'scheduled', label: 'นัดแล้วยังไม่มาติดต่อ', icon: 'event_available', count: scheduledCount },
  { key: 'all',       label: 'รายชื่อผู้ป่วยทั้งหมด', icon: 'group',         count: registryCount },
];

const TAB_STATUS_FILTER = {
  progress: (r) => r.statusKey === 'progress',
  done:     (r) => r.statusKey === 'done',
  draft:    (r) => r.statusKey === 'draft',
};

const STATUS_BADGE = {
  waiting:   { style: 'blue',   label: 'รอตรวจ'        },
  progress:  { style: 'orange', label: 'ตรวจอยู่'      },
  done:      { style: 'teal',   label: 'ตรวจเสร็จแล้ว' },
  draft:     { style: 'grey',   label: 'ที่ร่างไว้'    },
  /* เฉพาะแท็บทะเบียน — คนที่มีนัดวันนี้แต่ยังไม่มาติดต่อ ไม่ได้อยู่ในคิว */
  scheduled: { style: 'purple', label: 'นัดแล้วยังไม่มา' },
};

const RISK_BADGE_STYLE = { low: 'green', intermediate: 'yellow', high: 'red' };
const STATUS_SORT_ORDER = { waiting: 0, progress: 1, done: 2, draft: 3, scheduled: 4 };
const RISK_SORT_ORDER = { low: 0, intermediate: 1, high: 2 };

/* Tag-group filter — same shell as OPD's FILTER_OPTIONS/FILTER_DEFAULTS,
   categories adapted to ANC (single department, so risk level takes the
   department slot). ชิป "วัน" และ "เวลา" ถูกตัดออก (มติผู้ใช้ 2 ก.ย. 69) —
   ทั้งคู่เป็นชิปหลอกที่กรองอะไรไม่ได้จริง เพราะแถวคิวยังไม่มีฟิลด์วัน-เวลา
   ของวิสิต และแท็บ "คิววันนี้" บอกขอบเขตวันอยู่แล้ว */
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
};
const FILTER_DEFAULTS = {
  risk: 'all',
  doctor: 'all',
  visitType: 'all',
};

const renderQueue = (row) => (
  <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{row.queue}</ColorfulBadge>
);

const renderName = (row) => (
  <MaskedWorklistName
    name={row.name}
    recordKey={row.hn || row.queue}
    linkTo={{ pathname: '/treat/anc/record', state: { hn: row.hn, queue: row.queue, name: row.name } }}
  />
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
  const [activeTab, setActiveTab] = useState('today');
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
    filters.visitType === FILTER_DEFAULTS.visitType;
  const filtersActive = !isAllDefault || searchQ.trim() !== '';
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => {
      setFilters(FILTER_DEFAULTS);
      setSearchQ('');
      setPage(1);
    },
  );

  /* `rows` = mock roster + any scheduled appointments checked in this
     session (getAncQueueRows merges them); `scheduledNotArrived` backs the
     separate "นัดแล้วยังไม่มาติดต่อ" tab. Both re-derive on `tick` since
     check-in / cancel / reactivate are sessionStorage writes, not React
     state. */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => getAncQueueRows(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scheduledNotArrived = useMemo(() => getAncScheduledNotArrived(), [tick]);
  /* แท็บ "รายชื่อผู้ป่วยทั้งหมด" เป็นทะเบียน ไม่ใช่คิว — จึงรวมคนที่นัดไว้วันนี้
     แต่ยังไม่มาติดต่อเข้ามาด้วย (คนกลุ่มนี้ยังไม่มีคิว/ห้อง/เวลารอ) */
  const registryRows = useMemo(() => ([
    ...rows,
    ...scheduledNotArrived.map((r) => ({ ...r, statusKey: 'scheduled', room: r.clinic })),
  ]), [rows, scheduledNotArrived]);
  const tabs = useMemo(
    () => buildTabs(rows, scheduledNotArrived.length, registryRows.length),
    [rows, scheduledNotArrived, registryRows],
  );

  const handleCheckIn = (hn) => {
    checkInAncAppointment(hn);
    setTick((t) => t + 1);
    setActiveTab('today');
  };

  const summaryCards = useMemo(() => ([
    { key: 'total',    label: 'คิวทั้งหมดวันนี้', value: rows.length, color: 'info',     icon: 'directions_walk' },
    { key: 'first',    label: 'ฝากครรภ์ครั้งแรก', value: rows.filter((p) => p.visitType === 'first').length, color: 'info', icon: 'assignment_add' },
    { key: 'followup', label: 'ตรวจติดตาม',       value: rows.filter((p) => p.visitType === 'followup').length, color: 'positive', icon: 'history' },
    { key: 'highrisk', label: 'ความเสี่ยงสูง/ปานกลาง', value: rows.filter((p) => p.riskLevel !== 'low').length, color: 'warning', icon: 'fast_forward' },
  ]), [rows]);

  const filtered = useMemo(() => {
    if (activeTab === 'scheduled') return [];
    /* แท็บทะเบียนอ่านจากรายชื่อทั้งหมด แท็บที่เหลืออ่านจากคิวของวันนี้ */
    let result = activeTab === 'all' ? registryRows : rows;
    const tabPred = TAB_STATUS_FILTER[activeTab];
    if (tabPred) result = result.filter(tabPred);
    if (filters.risk !== 'all') result = result.filter((r) => r.riskLevel === filters.risk);
    if (filters.doctor !== 'all') result = result.filter((r) => r.doctor === filters.doctor);
    if (filters.visitType !== 'all') result = result.filter((r) => r.visitType === filters.visitType);
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      result = result.filter((row) =>
        [row.queue, row.hn, row.name, row.doctor].some((f) => f && f.toLowerCase().includes(q)),
      );
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filters, searchQ, tick, registryRows]);

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

  /* ปุ่มในคอลัมน์การดำเนินการไม่มี leading icon (มติผู้ใช้ 2 ก.ย. 69) — ทั้งสอง
     สถานะของปุ่มเดียวกัน จึงถอดออกทั้งคู่ให้คอลัมน์ไม่กระโดดตอนสลับสถานะ */
  const renderActions = (row) => {
    const cancellation = getAncCancellation(row.hn);
    return cancellation ? (
      <BrandSubdueButton
        variant='outline'
        size='sm'
        onClick={(e) => { e.stopPropagation(); reactivate(row); }}
      >
        เปิดใช้งานอีกครั้ง
      </BrandSubdueButton>
    ) : (
      <NeutralSubdueButton
        size='sm'
        onClick={(e) => { e.stopPropagation(); openCancelPopup(row); }}
      >
        ยกเลิกทะเบียน
      </NeutralSubdueButton>
    );
  };

  /* คอลัมน์เปลี่ยนตามบริบทของแท็บ (มติผู้ใช้ 2 ก.ย. 69) — ตารางต้องตอบเรื่อง
     ที่ชื่อแท็บถามอยู่ ไม่ใช่ชุดเดียวใช้ทุกแท็บ:
       • คิววันนี้        — คิว · ห้อง · รอนาน · สถานะ (คละสถานะจึงต้องมีคอลัมน์สถานะ)
       • กำลังตรวจ        — ตัด "สถานะ" ทิ้ง (ทุกแถวสถานะเดียวกัน) คงห้อง/รอนานไว้
       • ตรวจเสร็จแล้ว     — ตัด "รอนาน" และ "สถานะ" ทิ้ง เวลารอไม่มีความหมายแล้ว
       • ที่ร่างไว้        — ตัดคิว/ห้อง/รอนาน/สถานะ ร่างยังไม่ได้เข้าคิวจริง
       • รายชื่อผู้ป่วยทั้งหมด — เป็นทะเบียน: ตัดคิว/ห้อง/รอนาน/Telemedicine ออก
                            แล้วใส่กำหนดคลอดแทน คงสถานะไว้เพราะคละกันทั้งทะเบียน

     คอลัมน์ "แพทย์/พยาบาล ANC" มีเฉพาะแท็บทะเบียน (มติผู้ใช้ 2 ก.ย. 69) — แท็บที่
     เป็นคิวนั้นผู้ใช้เห็นเฉพาะคิวของตัวเองอยู่แล้ว ชื่อผู้ตรวจจึงซ้ำกันทุกแถว */
  const columns = useMemo(() => {
    const col = {
      queue:   { key: 'queue',   label: 'คิว',  render: renderQueue },
      hn:      { key: 'hn',      label: 'HN' },
      name:    { key: 'name',    label: 'ชื่อ-นามสกุล', flex: true, minWidth: 160, render: renderName },
      gp:      { key: 'gp',      label: 'G-P', render: (r) => `${r.gravida}-${r.para}` },
      ga:      { key: 'ga',      label: 'อายุครรภ์', render: renderGestationalAge },
      edc:     { key: 'edc',     label: 'กำหนดคลอด', render: (r) => formatAncDate(calculateEDC(r.lmp)) || '—' },
      risk:    { key: 'risk',    label: 'ความเสี่ยง', render: renderRisk },
      telemed: { key: 'telemed', label: 'Telemedicine', align: 'center', sortable: false, render: renderTelemedicine },
      room:    { key: 'room',    label: 'ห้อง' },
      doctor:  { key: 'doctor',  label: 'แพทย์/พยาบาล ANC', flex: true, minWidth: 140 },
      wait:    { key: 'wait',    label: 'รอนาน', render: (r) => (r.waitMinutes ? `${r.waitMinutes} นาที` : '—') },
      status:  { key: 'status',  label: 'สถานะ', render: renderStatus },
      actions: { key: 'actions', label: 'การดำเนินการ', sortable: false, render: withEmrRowAction(renderActions) },
    };
    const BY_TAB = {
      today:    ['queue', 'hn', 'name', 'gp', 'ga', 'risk', 'telemed', 'room', 'wait', 'status', 'actions'],
      progress: ['queue', 'hn', 'name', 'gp', 'ga', 'risk', 'telemed', 'room', 'wait', 'actions'],
      done:     ['queue', 'hn', 'name', 'gp', 'ga', 'edc', 'risk', 'room', 'actions'],
      draft:    ['hn', 'name', 'gp', 'ga', 'risk', 'actions'],
      all:      ['hn', 'name', 'gp', 'ga', 'edc', 'risk', 'doctor', 'status', 'actions'],
    };
    return (BY_TAB[activeTab] || BY_TAB.today).map((key) => col[key]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, activeTab]);

  /* "นัดแล้วยังไม่มาติดต่อ" tab (legacy HCIS p.2-3) — a different row shape
     (appointment time instead of queue/wait/status), so it gets its own
     column set + a "ส่งตรวจ" check-in action instead of reusing `columns`. */
  const scheduledColumns = useMemo(() => ([
    { key: 'appointmentTime', label: 'เวลานัด' },
    { key: 'hn',              label: 'HN' },
    { key: 'name',            label: 'ชื่อ-นามสกุล',   flex: true, minWidth: 160 },
    { key: 'gp',              label: 'G-P', render: (r) => `${r.gravida}-${r.para}` },
    { key: 'ga',              label: 'อายุครรภ์', render: renderGestationalAge },
    { key: 'risk',            label: 'ความเสี่ยง', render: renderRisk },
    { key: 'clinic',          label: 'คลินิก' },
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
      summaryTitle={SUMMARY_TITLE}
      summaryCards={summaryCards}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      /* แท็บ "นัดล่วงหน้า" — shell เป็นคนเติมแท็บและวาดเนื้อหา */
      upcoming={{ depts: ['สูติ-นรีเวช'] }}
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
              <FilterDropdown prefix='ความเสี่ยง:' options={FILTER_OPTIONS.risk} value={filters.risk} onChange={setFilter('risk')} />
              <FilterDropdown prefix='แพทย์:' options={withDoctorAvatars(FILTER_OPTIONS.doctor)} value={filters.doctor} onChange={setFilter('doctor')} />
              <FilterDropdown prefix='ประเภท:' options={FILTER_OPTIONS.visitType} value={filters.visitType} onChange={setFilter('visitType')} />
              <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
            </OverflowFlexRow>
          </div>

          <SmoothFilterResults opaque={resultsOpaque}>
          <SearchResultCount found={sortedRows.length} total={activeTab === 'all' ? registryRows.length : rows.length} />

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
          </SmoothFilterResults>
        </div>
      </div>
    </QueuePageShell>
  );
};

export default AncQueuePage;
