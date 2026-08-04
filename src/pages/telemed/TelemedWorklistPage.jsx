import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import FilterDateTag from '@/components/forms/FilterDateTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Checkbox from '@/components/checkbox/Checkbox';
import Icon from '@/components/icons/Icon';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import TelemedicineQueueBadge from '@/components/telemed/TelemedicineQueueBadge';
import { useTelemedCall } from '@/components/telemed/TelemedCallProvider';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  TELEMED_WORKLIST_TABS,
  TELEMED_VISIT_STATUS,
  TELEMED_ORIGIN_UNITS,
  TELEMED_DOCTORS,
  TELEMED_DEPARTMENTS,
  TELEMED_MAX_NOTIFICATIONS,
  AUTHEN_STATUS,
  getTelemedVisits,
  subscribeTelemedVisits,
  sendVisitsToExam,
  sendVisitNotification,
  cancelTelemedVisit,
  restoreTelemedVisit,
  updateTelemedVisit,
  setTelemedVisitStatus,
  formatClock,
  formatThaiDateTime,
} from '@/data/telemedVisits';
import { getRpmPatientByHn, getRpmReadings, evaluateRpmPatient, RPM_SOURCE } from '@/data/telemedRpm';
import { getConsentByVisit, consentTone } from '@/data/telemedConsent';
import { SUGGEST_REASON } from '@/data/telemedAssessments';
import {
  TELEMED_DEFAULT_ROLE,
  telemedCan,
  telemedDenyReason,
  telemedActor,
  logTelemedEvent,
  maskPii,
} from '@/utils/telemedAccess';
import {
  TELEMED_BREADCRUMB,
  PageBanner,
  RoleSwitcher,
  ContentCard,
  EmptyState,
  PagerBar,
  AuditStamp,
  resolveDateRange,
  inDateRange,
} from '@/pages/telemed/telemedShared';

/* TelemedWorklistPage — ระบบหน้าห้องตรวจทางไกล (TOR §1.13.3 / .7 / .8 /
   .10 / .11 + §4.3.5).

   โครงตามคู่มือ Telemed บทที่ 3 §4 "ระบบหน้าห้องตรวจ": แท็บ ตรวจวันนี้ /
   นัดหมายวันนี้ / walk-in / รอเข้าตรวจ / กำลังตรวจ / ตรวจแล้ว / ยกเลิก
   ติ๊กเลือกหลายรายการ → "ส่งตรวจ" (สถานะเปลี่ยนเป็น "รอเข้าตรวจ")

   หมายเหตุ route (integrator): Routes.jsx มี <Route exact path='/telemed/:visitId'>
   อยู่แล้ว ซึ่งจะกลืน path นี้ — ต้องลงทะเบียน /telemed/worklist **ก่อน**
   บรรทัดนั้น. เมนู sidebar ของโมดูลต้องชี้มาที่ /telemed/worklist ไม่ใช่
   /telemed (ซึ่งเป็น TelemedRouteTrigger ที่เปิดสายทันที). */

const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:telemed-worklist';
const PAGE_SIZE = 20;

/* หมายเหตุ: ไม่มีชิป "เฉพาะ Telemed" อีกต่อไป — หน้านี้อ่านจาก
   getTelemedVisits() ซึ่งเป็นรายการ Telemedicine ทั้งหมดอยู่แล้ว ชิปจึงเป็น
   ตัวกรองที่กดได้แต่ผลลัพธ์ไม่เปลี่ยน (ผิดหลัก Nielsen #1) */
const FILTER_DEFAULTS = {
  origin: 'all',
  doctor: 'all',
  authen: 'all',
  dateValue: { quick: 'today' },
};

const DATE_CHIP_LABELS = { today: 'วันนี้', yesterday: 'เมื่อวาน' };

const rowToSearchItem = (row) => ({
  id: row.hn,
  label: row.name,
  sublabel: `${row.doctor} · ${row.originUnit}`,
  value: row.name,
  badges: [
    { label: row.queue, tone: 'teal' },
    { label: row.hn, tone: 'indigo' },
  ],
  avatarSrc: getPatientByHN(row.hn)?.avatarUrl,
});

const TelemedWorklistPage = () => {
  const history = useHistory();
  const { start: startCall } = useTelemedCall();

  const [role, setRole] = useState(TELEMED_DEFAULT_ROLE);
  const [tab, setTab] = useState('today');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [selected, setSelected] = useState([]);
  const [tick, setTick] = useState(0);

  /* popups */
  const [sendResult, setSendResult] = useState(null);
  const [notifyResult, setNotifyResult] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [editError, setEditError] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [restoreTarget, setRestoreTarget] = useState(null);

  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: [] });

  useEffect(() => subscribeTelemedVisits(() => setTick((t) => t + 1)), []);
  /* นับถอยหลังเวลานัดบน badge — เดินทุก 30 วินาที */
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const canSend = telemedCan(role, 'edit');
  const canNotify = telemedCan(role, 'notify');
  const canCancel = telemedCan(role, 'cancel');
  const canAdd = telemedCan(role, 'add');
  /* เข้าสาย/เปิดสาย เปลี่ยนสถานะ visit จริง → ต้องมีสิทธิ์ record หรือ edit */
  const canJoin = telemedCan(role, 'record') || telemedCan(role, 'edit');
  const joinDeny = telemedDenyReason(role, 'record');

  const visits = useMemo(() => getTelemedVisits().map((v) => {
    const rpmPatient = getRpmPatientByHn(v.hn);
    let rpm = null;
    if (rpmPatient) {
      const readings = getRpmReadings(rpmPatient.id);
      rpm = { ...evaluateRpmPatient(rpmPatient, readings), patient: rpmPatient };
    }
    return { ...v, rpm, consent: getConsentByVisit(v.id) };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [tick]);

  const byTab = useMemo(() => {
    switch (tab) {
      case 'today':       return visits.filter((v) => v.status !== 'cancelled');
      case 'appointment': return visits.filter((v) => v.type === 'appointment' && v.status !== 'cancelled');
      case 'walkin':      return visits.filter((v) => v.type === 'walkin' && v.status !== 'cancelled');
      case 'waiting':     return visits.filter((v) => v.status === 'waiting');
      case 'inprogress':  return visits.filter((v) => v.status === 'inprogress');
      case 'done':        return visits.filter((v) => v.status === 'done');
      case 'cancelled':   return visits.filter((v) => v.status === 'cancelled');
      default:            return visits;
    }
  }, [visits, tab]);

  const filterOptions = useMemo(() => ({
    origin: [{ value: 'all', label: 'ทุกหน่วยบริการ' }, ...TELEMED_ORIGIN_UNITS.map((u) => ({ value: u, label: u }))],
    doctor: [{ value: 'all', label: 'ทุกคน' }, ...TELEMED_DOCTORS.map((d) => ({ value: d, label: d }))],
    authen: [
      { value: 'all', label: 'ทุกสถานะ Authen' },
      ...Object.keys(AUTHEN_STATUS).map((k) => ({ value: k, label: AUTHEN_STATUS[k].label })),
    ],
  }), []);

  const setFilter = (key) => (val) => { setFilters((f) => ({ ...f, [key]: val })); setPage(1); };

  const isAllDefault =
    filters.origin === FILTER_DEFAULTS.origin &&
    filters.doctor === FILTER_DEFAULTS.doctor &&
    filters.authen === FILTER_DEFAULTS.authen &&
    filters.dateValue.quick === FILTER_DEFAULTS.dateValue.quick;

  const filtered = useMemo(() => {
    let rows = byTab;
    if (filters.origin !== 'all') rows = rows.filter((r) => r.originUnit === filters.origin);
    if (filters.doctor !== 'all') rows = rows.filter((r) => r.doctor === filters.doctor);
    if (filters.authen !== 'all') rows = rows.filter((r) => r.authen === filters.authen);
    /* ชิป "วัน:" ต้องกรองจริง — เทียบกับเวลานัด (ถ้าไม่มีนัด = walk-in ใช้เวลา check-in) */
    const range = resolveDateRange(filters.dateValue);
    if (range) rows = rows.filter((r) => inDateRange(r.appointmentAt || r.checkinAt, range));
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      rows = rows.filter((r) => [r.queue, r.hn, r.name, r.doctor, r.originUnit, r.authenCode]
        .some((f) => f && String(f).toLowerCase().includes(q)));
    }
    return rows;
  }, [byTab, filters, searchQ]);

  const sortedRows = useMemo(() => {
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    const byQueue = (a, b) => String(a.queue).localeCompare(String(b.queue));
    if (!sortConfig.key) return [...filtered].sort(byQueue);
    const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
    const normalize = (row, key) => {
      switch (key) {
        case 'appointment': return row.appointmentAt ? new Date(row.appointmentAt).getTime() : 0;
        case 'checkin':     return row.checkinAt ? new Date(row.checkinAt).getTime() : 0;
        case 'rpm':         return row.rpm?.level === 'critical' ? 2 : row.rpm ? 1 : 0;
        case 'status':      return Object.keys(TELEMED_VISIT_STATUS).indexOf(row.status);
        default:            return row[key] ?? '';
      }
    };
    const NUMERIC = ['appointment', 'checkin', 'rpm', 'status'];
    return [...filtered].sort((a, b) => {
      const av = normalize(a, sortConfig.key);
      const bv = normalize(b, sortConfig.key);
      const primary = NUMERIC.includes(sortConfig.key)
        ? Number(av) - Number(bv)
        : collator.compare(String(av), String(bv));
      return primary !== 0 ? sign * primary : byQueue(a, b);
    });
  }, [filtered, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const pageRows = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = sortedRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, sortedRows.length);

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  useEffect(() => { setSelected([]); }, [tab]);

  const summaryCards = useMemo(() => ([
    { key: 'appointment', label: 'นัดหมายวันนี้', value: visits.filter((v) => v.type === 'appointment' && v.status !== 'cancelled').length, color: 'info',     icon: 'event_available' },
    { key: 'waiting',     label: 'รอเข้าตรวจ',    value: visits.filter((v) => v.status === 'waiting').length,     color: 'inprogress', icon: 'pending_actions' },
    { key: 'inprogress',  label: 'กำลังตรวจ',     value: visits.filter((v) => v.status === 'inprogress').length,  color: 'info',     icon: 'videocam' },
    { key: 'done',        label: 'ตรวจแล้ว',      value: visits.filter((v) => v.status === 'done').length,        color: 'positive', icon: 'check_circle' },
    { key: 'rpm',         label: 'ค่า RPM เกินเกณฑ์', value: visits.filter((v) => v.rpm?.level === 'critical').length, color: 'destructive', icon: 'monitor_heart' },
  ]), [visits]);

  const criticalRows = useMemo(() => visits.filter((v) => v.rpm?.level === 'critical' && v.status !== 'cancelled'), [visits]);

  /* ── actions ───────────────────────────────────────────────────────── */
  const toggleSelect = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.includes(r.id));
  const toggleSelectAll = () => {
    if (allPageSelected) setSelected((s) => s.filter((id) => !pageRows.some((r) => r.id === id)));
    else setSelected((s) => Array.from(new Set([...s, ...pageRows.map((r) => r.id)])));
  };

  const handleSendToExam = () => {
    if (!selected.length || !canSend) return;
    const result = sendVisitsToExam(selected, telemedActor(role));
    logTelemedEvent(role, 'ส่งตรวจจากหน้าห้องตรวจทางไกล', {
      ok: result.sent.length > 0,
      detail: `สำเร็จ ${result.sent.length} · ข้าม ${result.skipped.length}`,
    });
    setSendResult(result);
    setSelected([]);
  };

  const handleNotify = (row) => {
    if (!canNotify) return;
    const result = sendVisitNotification(row.id, telemedActor(role));
    logTelemedEvent(role, 'ส่งข้อความแจ้งเตือนก่อนคิว', { ok: result.ok, detail: `${row.name} · ${result.reason || `ครั้งที่ ${result.seq}`}` });
    setNotifyResult({ row, ...result });
  };

  const handleJoin = (row) => {
    /* เข้าสาย = เปลี่ยนสถานะรายการ + เปิดห้องตรวจ → ต้องมีสิทธิ์บันทึก/แก้ไข
       (observer / pharmacist ที่ดูอย่างเดียวห้ามเปลี่ยนสถานะ visit) */
    if (!canJoin) return;
    setTelemedVisitStatus(row.id, 'inprogress', telemedActor(role));
    logTelemedEvent(role, 'เข้าร่วมสาย', { detail: `${row.name} (HN ${row.hn})` });
    startCall();
  };

  const openEdit = (row) => {
    setEditTarget(row);
    setEditDraft({
      doctor: row.doctor,
      department: row.department,
      chiefComplaint: row.chiefComplaint,
      authenCode: row.authenCode || '',
      phone: row.phone || '',
    });
    setEditError('');
  };

  const confirmEdit = () => {
    if (!editDraft.chiefComplaint.trim()) { setEditError('ต้องระบุอาการเบื้องต้น'); return; }
    updateTelemedVisit(editTarget.id, editDraft, telemedActor(role));
    logTelemedEvent(role, 'แก้ไขรายการในหน้าห้องตรวจ', { detail: `${editTarget.name} (HN ${editTarget.hn})` });
    setEditTarget(null);
    setEditDraft(null);
  };

  const confirmCancel = () => {
    const result = cancelTelemedVisit(cancelTarget.id, cancelReason, telemedActor(role));
    if (!result.ok) { setCancelError(result.reason); return; }
    logTelemedEvent(role, 'ยกเลิกรายการนัดปรึกษาทางไกล', { detail: `${cancelTarget.name} · ${cancelReason}` });
    setCancelTarget(null);
    setCancelReason('');
    setCancelError('');
  };

  const confirmRestore = () => {
    restoreTelemedVisit(restoreTarget.id, telemedActor(role));
    logTelemedEvent(role, 'กู้คืนรายการที่ยกเลิก', { detail: restoreTarget.name });
    setRestoreTarget(null);
  };

  const handlePrint = useCallback(() => {
    logTelemedEvent(role, 'พิมพ์ใบรายชื่อคิวปรึกษาทางไกล', { detail: `${sortedRows.length} รายการ` });
    window.print();
  }, [role, sortedRows.length]);

  const searchSuggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    const out = [];
    for (const row of visits) {
      if (out.length >= 8) break;
      if ([row.queue, row.hn, row.name, row.doctor].some((f) => f && String(f).toLowerCase().includes(q))) {
        out.push(rowToSearchItem(row));
      }
    }
    return out;
  }, [searchQ, visits]);

  /* ── renderers ─────────────────────────────────────────────────────── */
  const renderSelect = (row) => {
    const disabled = !canSend || row.status === 'cancelled';
    return (
      <Checkbox
        checked={selected.includes(row.id)}
        disabled={disabled}
        onChange={() => toggleSelect(row.id)}
        aria-label={`เลือก ${row.name}`}
      />
    );
  };

  const renderType = (row) => (
    <ColorfulBadge style={row.type === 'walkin' ? 'purple' : 'blue'} size='small' hierarchy='secondary'>
      {row.type === 'walkin' ? 'Walk-in' : 'นัดหมาย'}
    </ColorfulBadge>
  );

  const renderTelemedBadge = (row) => {
    if (!row.appointmentAt) {
      return <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ไม่มีเวลานัด</ColorfulBadge>;
    }
    return <TelemedicineQueueBadge appointmentAt={row.appointmentAt} />;
  };

  const renderName = (row) => (
    <div className='min-w-0 flex flex-col'>
      <button
        type='button'
        className='min-w-0 truncate text-left hover:underline'
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: 'var(--text-neutral-default)',
          fontWeight: 'var(--type-weight-medium)',
          fontFamily: 'inherit',
          fontSize: 'var(--type-size-sm)',
        }}
        onClick={(e) => { e.stopPropagation(); history.push(`/telemed/assessment/${row.id}`); }}
      >
        {row.name}
      </button>
      <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
        {`HN ${row.hn} · ${row.sex} ${row.age} ปี`}
      </span>
    </div>
  );

  const renderRights = (row) => (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
      <span
        className='truncate'
        style={{
          maxWidth: 'var(--dim-size-2190, 190px)',
          fontSize: 'var(--type-size-xs)',
          color: row.rightsExpired ? 'var(--text-alert-error, #B91C1C)' : 'var(--text-content-secondary)',
        }}
      >
        {maskPii(row.rights, role)}
      </span>
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100)' }}>
        {row.rightsExpired && (
          <ColorfulBadge style='red' size='small' hierarchy='secondary'>สิทธิหมดอายุ</ColorfulBadge>
        )}
        <ColorfulBadge style={AUTHEN_STATUS[row.authen].tone} size='small' hierarchy='secondary'>
          {AUTHEN_STATUS[row.authen].label}
        </ColorfulBadge>
      </div>
    </div>
  );

  const renderRpm = (row) => {
    if (!row.rpm) {
      return <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>ไม่ได้ลงทะเบียน RPM</span>;
    }
    const latest = row.rpm.latest;
    const critical = row.rpm.level === 'critical';
    return (
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
        <span
          style={{
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-medium)',
            color: critical ? 'var(--text-alert-error, #B91C1C)' : 'var(--text-content-default)',
          }}
        >
          {latest?.bpSys != null ? `BP ${latest.bpSys}/${latest.bpDia}` : latest?.dtx != null ? `DTX ${latest.dtx}` : '—'}
          {latest?.o2sat != null ? ` · O₂ ${latest.o2sat}%` : ''}
        </span>
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100)' }}>
          {latest && (
            <ColorfulBadge style={RPM_SOURCE[latest.source]?.tone || 'grey'} size='small' hierarchy='secondary'>
              {RPM_SOURCE[latest.source]?.label}
            </ColorfulBadge>
          )}
          {critical && (
            <ColorfulBadge style='red' size='small' hierarchy='secondary'>เกินเกณฑ์</ColorfulBadge>
          )}
        </div>
      </div>
    );
  };

  const renderConsent = (row) => {
    if (!row.consent) {
      return <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ยังไม่มีเอกสาร</ColorfulBadge>;
    }
    return (
      <ColorfulBadge style={consentTone(row.consent.status)} size='small' hierarchy='secondary'>
        {row.consent.status}
      </ColorfulBadge>
    );
  };

  const renderNotify = (row) => {
    const count = row.notifications.length;
    const maxed = count >= TELEMED_MAX_NOTIFICATIONS;
    const noPhone = !row.phone;
    const last = count ? row.notifications[count - 1] : null;
    const disabled = !canNotify || maxed || noPhone || row.status === 'cancelled';
    const title = !canNotify
      ? telemedDenyReason(role, 'notify')
      : noPhone
        ? 'ไม่มีเบอร์โทรศัพท์ในทะเบียน — แก้ไขข้อมูลติดต่อก่อน'
        : maxed
          ? `ส่งครบ ${TELEMED_MAX_NOTIFICATIONS} ครั้งแล้ว (ล่าสุด ${formatClock(last.at)})`
          : undefined;
    return (
      <div className='flex flex-col items-start' style={{ gap: 'var(--dim-space-050, 2px)' }}>
        <NeutralSubdueButton
          size='sm'
          variant='outline'
          leadingIcon='sms'
          disabled={disabled}
          title={title}
          onClick={(e) => { e.stopPropagation(); handleNotify(row); }}
        >
          {`แจ้งเตือน (${Math.min(count + 1, TELEMED_MAX_NOTIFICATIONS)})`}
        </NeutralSubdueButton>
        {last && (
          <span style={{ fontSize: 'var(--type-size-xxs, 10px)', color: 'var(--text-content-tertiary)' }}>
            {`ส่งล่าสุด ${formatClock(last.at)} · ${last.channel}`}
          </span>
        )}
        {noPhone && (
          <span style={{ fontSize: 'var(--type-size-xxs, 10px)', color: 'var(--text-alert-error, #B91C1C)' }}>
            ไม่มีเบอร์โทร — กด "แก้ไข" เพื่อเพิ่ม
          </span>
        )}
      </div>
    );
  };

  const renderStatus = (row) => (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
      <ColorfulBadge style={TELEMED_VISIT_STATUS[row.status].tone} size='small' hierarchy='secondary'>
        {TELEMED_VISIT_STATUS[row.status].label}
      </ColorfulBadge>
      {row.cancel && (
        <span style={{ fontSize: 'var(--type-size-xxs, 10px)', color: 'var(--text-content-tertiary)' }}>
          {`${row.cancel.by} · ${row.cancel.reason}`}
        </span>
      )}
      {row.sentToExamBy && row.status === 'waiting' && (
        <AuditStamp action='ส่งตรวจ' by={row.sentToExamBy} at={row.sentToExamAt} />
      )}
    </div>
  );

  const renderActions = (row) => (
    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100)' }}>
      {row.status === 'cancelled' ? (
        <BrandSubdueButton
          size='sm'
          variant='outline'
          leadingIcon='restore'
          disabled={!canCancel}
          title={canCancel ? undefined : telemedDenyReason(role, 'cancel')}
          onClick={(e) => { e.stopPropagation(); setRestoreTarget(row); }}
        >
          กู้คืน
        </BrandSubdueButton>
      ) : (
        <>
          <BrandSubdueButton
            size='sm'
            leadingIcon='videocam'
            disabled={!canJoin}
            title={canJoin ? undefined : joinDeny}
            onClick={(e) => { e.stopPropagation(); handleJoin(row); }}
          >
            เข้าสาย
          </BrandSubdueButton>
          <NeutralSubdueButton
            size='sm'
            variant='outline'
            leadingIcon='assignment'
            onClick={(e) => { e.stopPropagation(); history.push(`/telemed/assessment/${row.id}`); }}
          >
            บันทึกประเมิน
          </NeutralSubdueButton>
          <NeutralSubdueButton
            size='sm'
            variant='outline'
            leadingIcon='edit'
            disabled={!canSend}
            title={canSend ? undefined : telemedDenyReason(role, 'edit')}
            onClick={(e) => { e.stopPropagation(); openEdit(row); }}
          >
            แก้ไข
          </NeutralSubdueButton>
          <NeutralSubdueButton
            size='sm'
            variant='outline'
            leadingIcon='block'
            disabled={!canCancel}
            title={canCancel ? undefined : telemedDenyReason(role, 'cancel')}
            onClick={(e) => { e.stopPropagation(); setCancelTarget(row); setCancelReason(''); setCancelError(''); }}
          >
            ยกเลิก
          </NeutralSubdueButton>
        </>
      )}
    </div>
  );

  const columns = useMemo(() => ([
    {
      key: 'select',
      label: (
        <Checkbox
          checked={allPageSelected}
          disabled={!canSend || pageRows.length === 0}
          onChange={toggleSelectAll}
          aria-label='เลือกทั้งหน้า'
        />
      ),
      width: 48,
      sortable: false,
      align: 'center',
      render: renderSelect,
    },
    { key: 'queue',       label: 'คิว',            width: 72,  render: (r) => <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{r.queue}</ColorfulBadge> },
    { key: 'type',        label: 'ประเภท',         width: 96,  render: renderType },
    { key: 'appointment', label: 'เวลานัด / Telemed', width: 168, render: renderTelemedBadge },
    { key: 'checkin',     label: 'เวลาลงชื่อ',      width: 104, render: (r) => formatClock(r.checkinAt) },
    { key: 'name',        label: 'ชื่อ-สกุล / HN',  flex: true, minWidth: 190, render: renderName },
    { key: 'rights',      label: 'สิทธิ / Authen',  width: 208, sortable: false, render: renderRights },
    { key: 'rpm',         label: 'ค่า RPM ล่าสุด',  width: 190, render: renderRpm },
    { key: 'consent',     label: 'ยินยอม PDPA',     width: 140, sortable: false, render: renderConsent },
    { key: 'originUnit',  label: 'หน่วยบริการต้นทาง', flex: true, minWidth: 180 },
    { key: 'doctor',      label: 'แพทย์',           flex: true, minWidth: 150 },
    { key: 'notify',      label: 'แจ้งเตือน',       width: 168, sortable: false, render: renderNotify },
    { key: 'status',      label: 'สถานะ',           width: 150, render: renderStatus },
    { key: 'actions',     label: 'การจัดการ',       width: 400, sortable: false, render: renderActions },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [allPageSelected, canSend, canCancel, canNotify, pageRows, selected, role]);

  const hasAnyRow = byTab.length > 0;
  const sendDenyTitle = !canSend
    ? telemedDenyReason(role, 'edit')
    : selected.length === 0
      ? 'เลือกอย่างน้อย 1 รายการก่อนกดส่งตรวจ'
      : undefined;

  return (
    <QueuePageShell
      activeKey='telemed'
      breadcrumb={TELEMED_BREADCRUMB('หน้าห้องตรวจทางไกล')}
      title='หน้าห้องตรวจทางไกล (Telemedicine)'
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
          <RoleSwitcher role={role} onChange={setRole} />
          <BrandSubdueButton variant='outline' size='md' leadingIcon='monitor_heart' onClick={() => history.push('/telemed/rpm')}>
            กระดาน RPM
          </BrandSubdueButton>
          <BrandSubdueButton variant='outline' size='md' leadingIcon='verified_user' onClick={() => history.push('/telemed/consent')}>
            ทะเบียนความยินยอม
          </BrandSubdueButton>
          <BrandSubdueButton variant='outline' size='md' leadingIcon='bar_chart' onClick={() => history.push('/telemed/reports')}>
            รายงาน / บันทึกการใช้งาน
          </BrandSubdueButton>
          <BrandSubdueButton variant='outline' size='md' leadingIcon='print' onClick={handlePrint}>
            พิมพ์ใบรายชื่อคิว
          </BrandSubdueButton>
        </div>
      )}
      summaryCards={summaryCards}
      tabs={TELEMED_WORKLIST_TABS}
      activeTab={tab}
      onTabChange={(t) => { setTab(t); setPage(1); }}
    >
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600)',
          paddingBottom: 'var(--dim-space-600)',
          paddingLeft: 'var(--dim-space-600)',
          paddingRight: 'var(--dim-space-600)',
          gap: 'var(--dim-space-400)',
        }}
      >
        {criticalRows.length > 0 && (
          <PageBanner
            tone='danger'
            icon='crisis_alert'
            title={`ค่าจากอุปกรณ์ที่บ้านเกินเกณฑ์ ${criticalRows.length} ราย`}
            actions={(
              <BrandSubdueButton size='sm' leadingIcon='monitor_heart' onClick={() => history.push('/telemed/rpm')}>
                เปิดกระดาน RPM
              </BrandSubdueButton>
            )}
          >
            {criticalRows.map((r) => `${r.name} (${r.rpm.alerts[0]?.label || 'เกินเกณฑ์'})`).join(' · ')}
          </PageBanner>
        )}

        {!canAdd && (
          <PageBanner tone='warning' icon='visibility' title='บทบาทนี้ดูได้อย่างเดียว'>
            {telemedDenyReason(role, 'add')} — ปุ่มส่งตรวจ / แก้ไข / ยกเลิก ถูกปิดใช้งาน แต่ยังเปิดดูข้อมูลได้
          </PageBanner>
        )}

        <ContentCard>
          <div className='w-full flex items-start justify-center'>
            <PrimarySearch
              value={searchQ}
              onChange={setSearchQ}
              onSubmit={(label, item) => {
                setSearchQ(label);
                pushHistory(item ?? label);
              }}
              suggestions={searchSuggestions}
              history={searchHistory}
              onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
              placeholder='ค้นหาคิว / HN / ชื่อ-สกุล / แพทย์ / หน่วยบริการต้นทาง / Authen Code'
              width={680}
            />
          </div>

          <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
              <FilterTag
                value='ทั้งหมด'
                selected={isAllDefault}
                onClick={() => { setFilters(FILTER_DEFAULTS); setSearchQ(''); setPage(1); }}
              />
              <FilterDropdown prefix='หน่วยบริการต้นทาง:' options={filterOptions.origin} value={filters.origin} onChange={setFilter('origin')} />
              <FilterDropdown prefix='แพทย์:' options={filterOptions.doctor} value={filters.doctor} onChange={setFilter('doctor')} />
              <FilterDropdown prefix='Authen:' options={filterOptions.authen} value={filters.authen} onChange={setFilter('authen')} />
              <FilterDateTag
                prefix='วัน:'
                value={filters.dateValue}
                onChange={setFilter('dateValue')}
                defaultQuick={FILTER_DEFAULTS.dateValue.quick}
                quickLabels={DATE_CHIP_LABELS}
              />
            </OverflowFlexRow>
          </div>

          {/* แถบส่งตรวจ (คู่มือบท 3 §4) */}
          <div
            className='flex items-center flex-wrap w-full'
            style={{
              gap: 'var(--dim-space-300)',
              borderRadius: 'var(--dim-radius-300, 10px)',
              background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
              border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
              paddingTop: 'var(--dim-space-300)',
              paddingBottom: 'var(--dim-space-300)',
              paddingLeft: 'var(--dim-space-400)',
              paddingRight: 'var(--dim-space-400)',
            }}
          >
            <span
              className='inline-flex items-center'
              style={{ gap: 'var(--dim-space-150)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}
            >
              <Icon name='checklist' size={16} />
              {`เลือกแล้ว ${selected.length} รายการ`}
            </span>
            <div className='flex-1' />
            <BrandPrimaryButton
              size='md'
              leadingIcon='send'
              disabled={!canSend || selected.length === 0}
              title={sendDenyTitle}
              onClick={handleSendToExam}
            >
              ส่งตรวจ
            </BrandPrimaryButton>
            {selected.length > 0 && (
              <NeutralSubdueButton size='md' variant='outline' onClick={() => setSelected([])}>
                ล้างการเลือก
              </NeutralSubdueButton>
            )}
          </div>

          {!hasAnyRow ? (
            <EmptyState
              icon='videocam_off'
              title={tab === 'cancelled' ? 'ยังไม่มีรายการที่ถูกยกเลิก' : 'วันนี้ยังไม่มีนัด Telemed ในแท็บนี้'}
              hint='รายการจะปรากฏเมื่อหน่วยบริการต้นทางส่งเคสเข้าปรึกษาทางไกล หรือเมื่อผู้รับบริการจองนัดวิดีโอคอลผ่านแอป'
            />
          ) : sortedRows.length === 0 ? (
            <EmptyState
              icon='search_off'
              title='ไม่พบรายการที่ตรงกับการค้นหา / ตัวกรอง'
              hint='ลองปรับคำค้นหรือล้างตัวกรองเพื่อดูรายการทั้งหมดในแท็บนี้'
              action={(
                <NeutralSubdueButton
                  size='md'
                  variant='outline'
                  leadingIcon='filter_alt_off'
                  onClick={() => { setFilters(FILTER_DEFAULTS); setSearchQ(''); setPage(1); }}
                >
                  ล้างตัวกรอง
                </NeutralSubdueButton>
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
                emptyMessage='ไม่พบรายการที่ตรงกับการค้นหา / ตัวกรอง'
              />
              <PagerBar rangeStart={rangeStart} rangeEnd={rangeEnd} total={sortedRows.length}>
                <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
              </PagerBar>
            </>
          )}
        </ContentCard>
      </div>

      {/* ── ผลการส่งตรวจ ── */}
      <Popup
        open={Boolean(sendResult)}
        onClose={() => setSendResult(null)}
        title='ผลการส่งตรวจ'
        subtitle={sendResult ? `สำเร็จ ${sendResult.sent.length} รายการ · ข้าม ${sendResult.skipped.length} รายการ` : ''}
        width={560}
        primaryAction={{ label: 'ปิด', onClick: () => setSendResult(null) }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
          {sendResult?.sent.length > 0 && (
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
              <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-alert-success, #196C65)', fontWeight: 'var(--type-weight-medium)' }}>
                ส่งตรวจสำเร็จ — สถานะเปลี่ยนเป็น "รอเข้าตรวจ"
              </span>
              {sendResult.sent.map((s) => (
                <span key={s.id} style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>· {s.name}</span>
              ))}
            </div>
          )}
          {sendResult?.skipped.length > 0 && (
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
              <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-alert-warning, #C2410C)', fontWeight: 'var(--type-weight-medium)' }}>
                ข้ามรายการต่อไปนี้
              </span>
              {sendResult.skipped.map((s) => (
                <span key={s.id} style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
                  {`· ${s.name || s.id} — ${s.reason}`}
                </span>
              ))}
            </div>
          )}
        </div>
      </Popup>

      {/* ── ผลการส่งแจ้งเตือน ── */}
      <AlertDialog
        open={Boolean(notifyResult)}
        type={notifyResult?.ok ? 'success' : 'warning'}
        title={notifyResult?.ok ? 'ส่งข้อความแจ้งเตือนแล้ว' : 'ส่งข้อความแจ้งเตือนไม่ได้'}
        description={notifyResult
          ? (notifyResult.ok
            ? `แจ้งเตือนครั้งที่ ${notifyResult.seq} ถูกส่งไปยัง ${notifyResult.row.name} (${notifyResult.row.phone})`
            : `${notifyResult.row.name} — ${notifyResult.reason}`)
          : ''}
        showCancel={false}
        confirmLabel='ตกลง'
        onConfirm={() => setNotifyResult(null)}
        onClose={() => setNotifyResult(null)}
      />

      {/* ── แก้ไขรายการ ── */}
      <Popup
        open={Boolean(editTarget)}
        onClose={() => { setEditTarget(null); setEditDraft(null); }}
        title='แก้ไขรายการนัดปรึกษาทางไกล'
        subtitle={editTarget ? `${editTarget.name} · HN ${editTarget.hn}` : ''}
        width={620}
        secondaryAction={{ label: 'ยกเลิก', onClick: () => { setEditTarget(null); setEditDraft(null); } }}
        primaryAction={{ label: 'บันทึกการแก้ไข', onClick: confirmEdit }}
      >
        {editDraft && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <div className='flex' style={{ gap: 'var(--dim-space-300)' }}>
              <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>แพทย์ผู้ให้บริการ</span>
                <Select
                  showLabel={false}
                  searchable={false}
                  size='lg'
                  value={editDraft.doctor}
                  onChange={(v) => setEditDraft((d) => ({ ...d, doctor: v }))}
                  options={TELEMED_DOCTORS.map((d) => ({ value: d, label: d }))}
                />
              </div>
              <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>แผนก</span>
                <Select
                  showLabel={false}
                  searchable={false}
                  size='lg'
                  value={editDraft.department}
                  onChange={(v) => setEditDraft((d) => ({ ...d, department: v }))}
                  options={TELEMED_DEPARTMENTS.map((d) => ({ value: d, label: d }))}
                />
              </div>
            </div>
            <div className='flex' style={{ gap: 'var(--dim-space-300)' }}>
              <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>Authen Code สปสช.</span>
                <InputField
                  size='lg'
                  showLabel={false}
                  showHelperText={false}
                  value={editDraft.authenCode}
                  onChange={(v) => setEditDraft((d) => ({ ...d, authenCode: typeof v === 'string' ? v : v?.target?.value }))}
                  placeholder='เช่น AUT-6801-2394'
                />
              </div>
              <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>เบอร์โทรศัพท์ติดต่อ</span>
                <InputField
                  size='lg'
                  showLabel={false}
                  showHelperText={false}
                  value={editDraft.phone}
                  onChange={(v) => setEditDraft((d) => ({ ...d, phone: typeof v === 'string' ? v : v?.target?.value }))}
                  placeholder='เช่น 081-234-5678'
                />
              </div>
            </div>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
              <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>อาการเบื้องต้น</span>
              <SuggestibleTextarea
                voice
                minChars={3}
                suggestions={[
                  'ติดตามระดับน้ำตาลและความดันหลังปรับยา',
                  'ปวดศีรษะเรื้อรัง ขอปรึกษาก่อนมาตรวจที่ศูนย์',
                  'ผู้ป่วยติดบ้าน ลูกหลานขอปรึกษาแทนเรื่องแผลกดทับ',
                  'ค่าน้ำตาลปลายนิ้วต่ำติดกัน 2 ครั้ง มีอาการใจสั่น',
                ]}
                value={editDraft.chiefComplaint}
                onChange={(v) => { setEditDraft((d) => ({ ...d, chiefComplaint: v })); if (editError) setEditError(''); }}
                placeholder='อาการ / เหตุผลที่ส่งปรึกษาทางไกล'
                height={120}
              />
              {editError && (
                <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100)', color: 'var(--text-alert-error, #B91C1C)', fontSize: 'var(--type-size-sm)' }}>
                  <Icon name='error' size={14} />
                  {editError}
                </span>
              )}
            </div>
            <AuditStamp action='แก้ไขล่าสุด' by={editTarget?.updatedBy} at={editTarget?.updatedAt} />
          </div>
        )}
      </Popup>

      {/* ── ยกเลิกรายการ ── */}
      <AlertDialog
        open={Boolean(cancelTarget)}
        type='destructive'
        title='ยกเลิกรายการนัดปรึกษาทางไกล'
        description={cancelTarget
          ? `${cancelTarget.name} (HN ${cancelTarget.hn}) — รายการจะย้ายไปแท็บ "ยกเลิก" และกู้คืนได้ ไม่ถูกลบออกจากระบบ`
          : ''}
        cancelLabel='ไม่ยกเลิก'
        confirmLabel='ยืนยันยกเลิกรายการ'
        onCancel={() => setCancelTarget(null)}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <SuggestibleTextarea
            voice
            minChars={3}
            suggestions={SUGGEST_REASON}
            value={cancelReason}
            onChange={(v) => { setCancelReason(v); if (cancelError) setCancelError(''); }}
            placeholder='เหตุผลการยกเลิก (บังคับ)'
            height={100}
          />
          {cancelError && (
            <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100)', color: 'var(--text-alert-error, #B91C1C)', fontSize: 'var(--type-size-sm)' }}>
              <Icon name='error' size={14} />
              {cancelError}
            </span>
          )}
        </div>
      </AlertDialog>

      {/* ── กู้คืนรายการ ── */}
      <AlertDialog
        open={Boolean(restoreTarget)}
        type='info'
        title='กู้คืนรายการที่ยกเลิก'
        description={restoreTarget
          ? `${restoreTarget.name} — รายการจะกลับไปสถานะเดิมก่อนถูกยกเลิก (${restoreTarget.cancel?.reason || '—'})`
          : ''}
        cancelLabel='ไม่กู้คืน'
        confirmLabel='กู้คืนรายการ'
        onCancel={() => setRestoreTarget(null)}
        onClose={() => setRestoreTarget(null)}
        onConfirm={confirmRestore}
      />
    </QueuePageShell>
  );
};

export default TelemedWorklistPage;
