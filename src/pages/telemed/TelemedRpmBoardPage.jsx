import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import FilterDateTag from '@/components/forms/FilterDateTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import ViewToggle from '@/components/toggle/ViewToggle';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Icon from '@/components/icons/Icon';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import AddressMapBlock from '@/components/forms/AddressMapBlock';
import VitalTrendChart from '@/components/observation/VitalTrendChart';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import TelemedRpmSparkline from '@/components/telemed/TelemedRpmSparkline';
import { useTelemedCall } from '@/components/telemed/TelemedCallProvider';
import {
  RPM_SOURCE,
  RPM_ALERT_LEVEL,
  RPM_PARAM_META,
  RPM_DEVICE_TYPES,
  DTX_MEAL_STATE,
  getRpmBoardRows,
  subscribeRpm,
  addRpmReading,
  editRpmReading,
  cancelRpmReading,
  restoreRpmReading,
  setRpmThresholds,
  acknowledgeRpmAlert,
  findDuplicateReading,
  validateReadingValues,
  softWarnings,
  toTrendData,
  getRpmReadings,
} from '@/data/telemedRpm';
import {
  getTelemedVisitByHn,
  sendVisitNotification,
  setTelemedVisitStatus,
  formatThaiDateTime,
} from '@/data/telemedVisits';
import { SUGGEST_REASON } from '@/data/telemedAssessments';
import {
  TELEMED_DEFAULT_ROLE,
  telemedCan,
  telemedDenyReason,
  telemedActor,
  logTelemedEvent,
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

/* TelemedRpmBoardPage — กระดานติดตามค่าจากอุปกรณ์ที่บ้าน (TOR §1.13.1,
   §1.13.2, §1.13.3, §1.13.5, §1.13.6).

   เกณฑ์เฝ้าระวังมาจากคู่มือ Telemed จริง: HbA1c > 8 · BP > 160/90 ติดกัน
   2 ครั้ง · DTX < 80 ติดกัน 2 ครั้ง · DTX > 180 ติดกัน 3 ครั้ง
   (ปรับได้รายผู้รับบริการที่ปุ่ม "ตั้งค่าเกณฑ์"). */

const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:telemed-rpm';
const PAGE_SIZE = 20;

const TABS = [
  { key: 'all',      label: 'ทั้งหมด',        icon: 'list' },
  { key: 'critical', label: 'เกินเกณฑ์',      icon: 'crisis_alert' },
  { key: 'stale',    label: 'ขาดส่งค่า',      icon: 'schedule' },
  { key: 'device',   label: 'อุปกรณ์มีปัญหา', icon: 'device_unknown' },
  { key: 'normal',   label: 'ปกติ',           icon: 'check_circle' },
];

const FILTER_DEFAULTS = { source: 'all', unit: 'all', dateValue: { quick: 'last7' } };

const SOURCE_OPTIONS = [
  { value: 'all', label: 'ทุกที่มา' },
  ...Object.keys(RPM_SOURCE).map((k) => ({ value: k, label: RPM_SOURCE[k].label })),
];

const NEW_READING_FIELDS = ['bpSys', 'bpDia', 'pulse', 'dtx', 'temp', 'o2sat', 'weight'];

const emptyValues = () => NEW_READING_FIELDS.reduce((acc, k) => ({ ...acc, [k]: '' }), {});

const TelemedRpmBoardPage = () => {
  const history = useHistory();
  const { start: startCall } = useTelemedCall();

  const [role, setRole] = useState(TELEMED_DEFAULT_ROLE);
  const [tab, setTab] = useState('all');
  const [view, setView] = useState('list');
  const [searchQ, setSearchQ] = useState('');
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [tick, setTick] = useState(0);

  const [detail, setDetail] = useState(null);       // patientId ที่เปิดรายละเอียด
  const [mapTarget, setMapTarget] = useState(null);
  const [addTarget, setAddTarget] = useState(null);
  const [addValues, setAddValues] = useState(emptyValues());
  const [addMeal, setAddMeal] = useState('fasting');
  const [addNote, setAddNote] = useState('');
  const [addErrors, setAddErrors] = useState({});
  const [dupWarn, setDupWarn] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [editReason, setEditReason] = useState('');
  const [editError, setEditError] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [thresholdTarget, setThresholdTarget] = useState(null);
  const [thresholdDraft, setThresholdDraft] = useState(null);
  const [ackTarget, setAckTarget] = useState(null);
  const [ackNote, setAckNote] = useState('');
  const [ackError, setAckError] = useState('');
  const [toast, setToast] = useState(null);

  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: [] });

  useEffect(() => subscribeRpm(() => setTick((t) => t + 1)), []);

  const canEditRpm = telemedCan(role, 'editRpm');
  const canNotify = telemedCan(role, 'notify');
  const editDeny = telemedDenyReason(role, 'editRpm');
  /* "เปิดสาย" / "ส่งเข้าคิว" เปลี่ยนสถานะ visit จริง → ต้องมีสิทธิ์ record หรือ edit
     (ผู้สังเกตการณ์ / เภสัชกร ที่ดูอย่างเดียวห้ามทำ) */
  const canJoin = telemedCan(role, 'record') || telemedCan(role, 'edit');
  const joinDeny = telemedDenyReason(role, 'record');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => getRpmBoardRows(), [tick]);

  const unitOptions = useMemo(() => ([
    { value: 'all', label: 'ทุกหน่วยบริการ' },
    ...Array.from(new Set(rows.map((r) => r.originUnit))).map((u) => ({ value: u, label: u })),
  ]), [rows]);

  const byTab = useMemo(() => {
    if (tab === 'all') return rows;
    return rows.filter((r) => r.level === tab);
  }, [rows, tab]);

  const filtered = useMemo(() => {
    let out = byTab;
    if (filters.unit !== 'all') out = out.filter((r) => r.originUnit === filters.unit);
    if (filters.source !== 'all') out = out.filter((r) => r.latest?.source === filters.source);
    /* ชิป "ช่วง:" ต้องกรองจริง — เหลือเฉพาะผู้ที่มีค่าส่งเข้าระบบในช่วงที่เลือก */
    const range = resolveDateRange(filters.dateValue);
    if (range) out = out.filter((r) => (r.readings || []).some((x) => inDateRange(x.at, range)));
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      out = out.filter((r) => [r.hn, r.name, r.doctor, r.originUnit, r.program]
        .some((f) => f && String(f).toLowerCase().includes(q)));
    }
    return out;
  }, [byTab, filters, searchQ]);

  const sorted = useMemo(() => {
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    const levelOrder = { critical: 0, stale: 1, device: 2, warning: 3, normal: 4 };
    if (!sortConfig.key) return [...filtered].sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);
    const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
    const norm = (r, k) => {
      if (k === 'level') return levelOrder[r.level];
      if (k === 'lastSync') return r.latest ? new Date(r.latest.at).getTime() : 0;
      return r[k] ?? '';
    };
    return [...filtered].sort((a, b) => {
      const av = norm(a, sortConfig.key);
      const bv = norm(b, sortConfig.key);
      const primary = typeof av === 'number' ? av - bv : collator.compare(String(av), String(bv));
      return sign * primary;
    });
  }, [filtered, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = sorted.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, sorted.length);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const summaryCards = useMemo(() => ([
    { key: 'critical', label: 'เกินเกณฑ์วันนี้',   value: rows.filter((r) => r.level === 'critical').length, color: 'destructive', icon: 'crisis_alert' },
    { key: 'stale',    label: 'ไม่ส่งค่า > 3 วัน', value: rows.filter((r) => r.level === 'stale').length,    color: 'inprogress', icon: 'schedule' },
    { key: 'device',   label: 'อุปกรณ์ออฟไลน์ / แบตต่ำ', value: rows.filter((r) => r.level === 'device').length, color: 'info', icon: 'device_unknown' },
    { key: 'pending',  label: 'รอตรวจสอบ',        value: rows.filter((r) => r.level !== 'normal' && !r.acknowledged).length, color: 'inprogress', icon: 'pending_actions' },
    { key: 'normal',   label: 'ค่าปกติ',          value: rows.filter((r) => r.level === 'normal').length,   color: 'positive', icon: 'check_circle' },
  ]), [rows]);

  const criticalUnacked = useMemo(
    () => rows.filter((r) => r.level === 'critical' && !r.acknowledged),
    [rows],
  );

  const detailRow = useMemo(() => rows.find((r) => r.id === detail) || null, [rows, detail]);

  /* ── actions ───────────────────────────────────────────────────────── */
  const openAdd = (row) => {
    setAddTarget(row);
    setAddValues(emptyValues());
    setAddMeal('fasting');
    setAddNote('');
    setAddErrors({});
    setDupWarn(null);
  };

  const confirmAdd = () => {
    const values = Object.keys(addValues).reduce((acc, k) => {
      if (addValues[k] !== '') acc[k] = addValues[k];
      return acc;
    }, {});
    if (Object.keys(values).length === 0) {
      setAddErrors({ _form: 'กรอกค่าอย่างน้อย 1 รายการ' });
      return;
    }
    const errs = validateReadingValues(values);
    if (Object.keys(errs).length) { setAddErrors(errs); return; }
    const dup = findDuplicateReading(addTarget.id, new Date().toISOString(), Object.keys(values));
    if (dup && !dupWarn) {
      setDupWarn(dup);
      return;
    }
    const result = addRpmReading(addTarget.id, values, {
      source: 'staff',
      actor: telemedActor(role),
      note: addNote,
      meal: values.dtx ? addMeal : undefined,
    });
    if (!result.ok) { setAddErrors(result.errors || {}); return; }
    logTelemedEvent(role, 'บันทึกค่าจากอุปกรณ์ที่บ้าน (จนท.บันทึกแทน)', { detail: `${addTarget.name}` });
    setAddTarget(null);
    setToast({ ok: true, text: 'บันทึกค่าใหม่แล้ว' });
  };

  const openEdit = (reading, patient) => {
    setEditTarget({ reading, patient });
    setEditValues(NEW_READING_FIELDS.reduce((acc, k) => ({ ...acc, [k]: reading[k] ?? '' }), {}));
    setEditReason('');
    setEditError('');
  };

  const confirmEdit = () => {
    const values = Object.keys(editValues).reduce((acc, k) => {
      if (editValues[k] !== '' && editValues[k] != null) acc[k] = editValues[k];
      return acc;
    }, {});
    const result = editRpmReading(editTarget.reading.id, values, editReason, telemedActor(role));
    if (!result.ok) {
      setEditError(result.reason || Object.values(result.errors || {})[0] || 'แก้ไขไม่สำเร็จ');
      return;
    }
    logTelemedEvent(role, 'แก้ไขค่าจากอุปกรณ์ที่บ้าน', { detail: `${editTarget.patient.name} · ${editReason}` });
    setEditTarget(null);
    setToast({ ok: true, text: 'แก้ไขค่าแล้ว — ค่าเดิมถูกเก็บไว้ในประวัติ' });
  };

  const confirmCancelReading = () => {
    const result = cancelRpmReading(cancelTarget.reading.id, cancelReason, telemedActor(role));
    if (!result.ok) { setCancelError(result.reason); return; }
    logTelemedEvent(role, 'ยกเลิกค่าจากอุปกรณ์ที่บ้าน', { detail: `${cancelTarget.patient.name} · ${cancelReason}` });
    setCancelTarget(null);
    setCancelReason('');
    setCancelError('');
    setToast({ ok: true, text: 'ยกเลิกค่าแล้ว — ยังเห็นได้ในประวัติ' });
  };

  const openThreshold = (row) => {
    setThresholdTarget(row);
    setThresholdDraft({
      bpHighSys: String(row.thresholds.bpHighSys.value),
      bpHighDia: String(row.thresholds.bpHighDia.value),
      dtxLow: String(row.thresholds.dtxLow.value),
      dtxHigh: String(row.thresholds.dtxHigh.value),
      hba1cHigh: String(row.thresholds.hba1cHigh.value),
      noReadingDays: String(row.thresholds.noReadingDays.value),
    });
  };

  const confirmThreshold = () => {
    const t = thresholdTarget.thresholds;
    setRpmThresholds(thresholdTarget.id, {
      bpHighSys: { ...t.bpHighSys, value: Number(thresholdDraft.bpHighSys) },
      bpHighDia: { ...t.bpHighDia, value: Number(thresholdDraft.bpHighDia) },
      dtxLow: { ...t.dtxLow, value: Number(thresholdDraft.dtxLow) },
      dtxHigh: { ...t.dtxHigh, value: Number(thresholdDraft.dtxHigh) },
      hba1cHigh: { ...t.hba1cHigh, value: Number(thresholdDraft.hba1cHigh) },
      noReadingDays: { ...t.noReadingDays, value: Number(thresholdDraft.noReadingDays) },
    }, telemedActor(role));
    logTelemedEvent(role, 'ตั้งค่าเกณฑ์แจ้งเตือน RPM', { detail: thresholdTarget.name });
    setThresholdTarget(null);
    setToast({ ok: true, text: 'บันทึกเกณฑ์แจ้งเตือนแล้ว' });
  };

  const confirmAck = () => {
    const result = acknowledgeRpmAlert(ackTarget.id, ackNote, telemedActor(role));
    if (!result.ok) { setAckError(result.reason); return; }
    logTelemedEvent(role, 'บันทึกการติดตามค่าวิกฤต RPM', { detail: `${ackTarget.name} · ${ackNote}` });
    setAckTarget(null);
    setAckNote('');
    setAckError('');
  };

  const handleCall = (row) => {
    if (!canJoin) return;
    const visit = getTelemedVisitByHn(row.hn);
    if (visit) setTelemedVisitStatus(visit.id, 'inprogress', telemedActor(role));
    logTelemedEvent(role, 'เปิดสาย Telemedicine จากกระดาน RPM', { detail: row.name });
    startCall();
  };

  const handleQueue = (row) => {
    if (!canJoin) return;
    const visit = getTelemedVisitByHn(row.hn);
    if (!visit) { setToast({ ok: false, text: `${row.name} ยังไม่มีรายการนัดในหน้าห้องตรวจ — สร้างนัดที่ระบบนัดหมายก่อน` }); return; }
    setTelemedVisitStatus(visit.id, 'waiting', telemedActor(role));
    logTelemedEvent(role, 'ส่งผู้รับบริการเข้าคิวปรึกษาทางไกล', { detail: row.name });
    setToast({ ok: true, text: `ส่ง ${row.name} เข้าคิว "รอเข้าตรวจ" แล้ว` });
  };

  const handleFollowUpMessage = (row) => {
    const visit = getTelemedVisitByHn(row.hn);
    if (!visit) { setToast({ ok: false, text: `${row.name} ยังไม่มีรายการนัด — ส่งข้อความติดตามผ่านระบบนัดหมายแทน` }); return; }
    const result = sendVisitNotification(visit.id, telemedActor(role));
    logTelemedEvent(role, 'ส่งข้อความติดตามผู้รับบริการ RPM', { ok: result.ok, detail: `${row.name} · ${result.reason || 'สำเร็จ'}` });
    setToast(result.ok
      ? { ok: true, text: `ส่งข้อความติดตามถึง ${row.name} แล้ว` }
      : { ok: false, text: result.reason });
  };

  /* ── renderers ─────────────────────────────────────────────────────── */
  const renderLevel = (row) => (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
      <ColorfulBadge style={RPM_ALERT_LEVEL[row.level].tone} size='small' hierarchy='secondary'>
        {RPM_ALERT_LEVEL[row.level].label}
      </ColorfulBadge>
      {row.acknowledged && (
        <span style={{ fontSize: 'var(--type-size-xxs, 10px)', color: 'var(--text-content-tertiary)' }}>
          {`ติดตามแล้วโดย ${row.acknowledged.by}`}
        </span>
      )}
    </div>
  );

  const renderPatient = (row) => (
    <div className='flex flex-col min-w-0'>
      <button
        type='button'
        className='truncate text-left hover:underline'
        style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          color: 'var(--text-neutral-default)', fontWeight: 'var(--type-weight-medium)',
          fontFamily: 'inherit', fontSize: 'var(--type-size-sm)',
        }}
        onClick={(e) => { e.stopPropagation(); setDetail(row.id); }}
      >
        {row.name}
      </button>
      <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
        {`HN ${row.hn} · ${row.sex} ${row.age} ปี · ${row.program}`}
      </span>
    </div>
  );

  const renderLatest = (row) => {
    if (!row.latest) return <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>ยังไม่มีค่า</span>;
    const parts = [];
    if (row.latest.bpSys != null) parts.push(`BP ${row.latest.bpSys}/${row.latest.bpDia}`);
    if (row.latest.dtx != null) parts.push(`DTX ${row.latest.dtx}`);
    if (row.latest.o2sat != null) parts.push(`O₂ ${row.latest.o2sat}%`);
    if (row.latest.temp != null) parts.push(`T ${row.latest.temp}°C`);
    return (
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
        <span
          style={{
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-medium)',
            color: row.level === 'critical' ? 'var(--text-alert-error, #B91C1C)' : 'var(--text-content-default)',
          }}
        >
          {parts.join(' · ') || '—'}
        </span>
        <ColorfulBadge style={RPM_SOURCE[row.latest.source]?.tone || 'grey'} size='small' hierarchy='secondary'>
          {RPM_SOURCE[row.latest.source]?.label}
        </ColorfulBadge>
      </div>
    );
  };

  const renderTrend = (row) => {
    const bpPoints = row.trend.filter((r) => r.bpSys != null).map((r) => ({ at: r.at, value: r.bpSys, label: 'SBP' }));
    const dtxPoints = row.trend.filter((r) => r.dtx != null).map((r) => ({ at: r.at, value: r.dtx, label: 'DTX' }));
    const usesBp = bpPoints.length >= dtxPoints.length;
    const points = usesBp ? bpPoints : dtxPoints;
    return (
      <TelemedRpmSparkline
        points={points}
        isBreach={(p) => (usesBp
          ? p.value > row.thresholds.bpHighSys.value
          : p.value < row.thresholds.dtxLow.value || p.value > row.thresholds.dtxHigh.value)}
        ariaLabel={usesBp ? 'แนวโน้มความดันตัวบน' : 'แนวโน้ม DTX'}
      />
    );
  };

  /* กราฟในป๊อปอัพรายละเอียด — เลือกพารามิเตอร์จากข้อมูลจริงของผู้รับบริการ
     (VitalTrendChart ไม่มี series 'dtx' จึงต้อง fallback เป็น sparkline) */
  const renderDetailTrend = (row) => {
    const last10 = row.readings.slice(0, 10).reverse();
    const hasBp = last10.some((r) => r.bpSys != null);
    if (hasBp) {
      return (
        <div style={{ height: 300 }}>
          <VitalTrendChart parameter='bp' data={toTrendData(last10, 'bp')} fillHeight />
        </div>
      );
    }
    const dtxPoints = last10
      .filter((r) => r.dtx != null)
      .map((r) => ({ at: r.at, value: r.dtx, label: 'DTX' }));
    if (dtxPoints.length === 0) {
      return (
        <EmptyState icon='monitor_heart' title='ไม่มีข้อมูลสัญญาณชีพย้อนหลัง' hint='ยังไม่มีค่าที่ส่งเข้าระบบสำหรับผู้รับบริการรายนี้' />
      );
    }
    const values = dtxPoints.map((p) => p.value);
    return (
      <div
        className='flex flex-col w-full'
        style={{
          gap: 'var(--dim-space-200)',
          borderRadius: 'var(--dim-radius-300, 10px)',
          border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
          paddingTop: 'var(--dim-space-400)',
          paddingBottom: 'var(--dim-space-400)',
          paddingLeft: 'var(--dim-space-400)',
          paddingRight: 'var(--dim-space-400)',
        }}
      >
        <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
          {`แนวโน้มระดับน้ำตาลปลายนิ้ว (DTX) ${dtxPoints.length} ค่าล่าสุด · เกณฑ์ ${row.thresholds.dtxLow.value}–${row.thresholds.dtxHigh.value} mg/dL`}
        </span>
        <TelemedRpmSparkline
          width={880}
          height={160}
          points={dtxPoints}
          isBreach={(p) => p.value < row.thresholds.dtxLow.value || p.value > row.thresholds.dtxHigh.value}
          ariaLabel='แนวโน้มระดับน้ำตาลปลายนิ้ว (DTX)'
        />
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            {`ต่ำสุด ${Math.min(...values)} mg/dL`}
          </span>
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            {`สูงสุด ${Math.max(...values)} mg/dL`}
          </span>
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            {`ล่าสุด ${dtxPoints[dtxPoints.length - 1].value} mg/dL · ${formatThaiDateTime(dtxPoints[dtxPoints.length - 1].at)}`}
          </span>
        </div>
      </div>
    );
  };

  const renderDevices = (row) => (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
      {row.devices.map((d) => (
        <span key={d.serial} style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}>
          <ColorfulBadge style={d.online ? (d.battery <= 20 ? 'orange' : 'teal') : 'grey'} size='small' hierarchy='secondary'>
            {d.online ? `แบต ${d.battery}%` : 'ออฟไลน์'}
          </ColorfulBadge>
          {` ${RPM_DEVICE_TYPES.find((t) => t.key === d.type)?.label || d.type}`}
        </span>
      ))}
      {row.latest && (
        <span style={{ fontSize: 'var(--type-size-xxs, 10px)', color: 'var(--text-content-tertiary)' }}>
          {`sync ล่าสุด ${formatThaiDateTime(row.latest.at)}`}
        </span>
      )}
    </div>
  );

  const renderRowActions = (row) => (
    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100)' }}>
      <BrandSubdueButton
        size='sm'
        leadingIcon='videocam'
        disabled={!canJoin}
        title={canJoin ? undefined : joinDeny}
        onClick={(e) => { e.stopPropagation(); handleCall(row); }}
      >
        เปิดสาย
      </BrandSubdueButton>
      <NeutralSubdueButton
        size='sm'
        variant='outline'
        leadingIcon='queue'
        disabled={!canJoin}
        title={canJoin ? undefined : joinDeny}
        onClick={(e) => { e.stopPropagation(); handleQueue(row); }}
      >
        ส่งเข้าคิว
      </NeutralSubdueButton>
      <NeutralSubdueButton
        size='sm'
        variant='outline'
        leadingIcon='add'
        disabled={!canEditRpm}
        title={canEditRpm ? undefined : editDeny}
        onClick={(e) => { e.stopPropagation(); openAdd(row); }}
      >
        บันทึกค่า
      </NeutralSubdueButton>
      <NeutralSubdueButton size='sm' variant='outline' leadingIcon='visibility' onClick={(e) => { e.stopPropagation(); setDetail(row.id); }}>
        ดูค่า / แก้ไข
      </NeutralSubdueButton>
      <NeutralSubdueButton
        size='sm'
        variant='outline'
        leadingIcon='tune'
        disabled={!canEditRpm}
        title={canEditRpm ? undefined : editDeny}
        onClick={(e) => { e.stopPropagation(); openThreshold(row); }}
      >
        ตั้งค่าเกณฑ์
      </NeutralSubdueButton>
      <NeutralSubdueButton size='sm' variant='outline' leadingIcon='location_on' onClick={(e) => { e.stopPropagation(); setMapTarget(row); }}>
        GIS
      </NeutralSubdueButton>
      <NeutralSubdueButton
        size='sm'
        variant='outline'
        leadingIcon='sms'
        disabled={!canNotify}
        title={canNotify ? undefined : telemedDenyReason(role, 'notify')}
        onClick={(e) => { e.stopPropagation(); handleFollowUpMessage(row); }}
      >
        ส่งข้อความติดตาม
      </NeutralSubdueButton>
    </div>
  );

  const columns = useMemo(() => ([
    { key: 'level',   label: 'สถานะเฝ้าระวัง', render: renderLevel },
    { key: 'name',    label: 'ผู้รับบริการ',   flex: true, minWidth: 220, render: renderPatient },
    { key: 'latest',  label: 'ค่าล่าสุด', sortable: false, render: renderLatest },
    { key: 'trend',   label: 'แนวโน้ม 7 วัน', sortable: false, render: renderTrend },
    { key: 'lastSync', label: 'อุปกรณ์ / sync', render: renderDevices },
    { key: 'originUnit', label: 'หน่วยบริการต้นทาง', flex: true, minWidth: 180 },
    { key: 'doctor',  label: 'แพทย์',          flex: true, minWidth: 150 },
    { key: 'actions', label: 'การจัดการ', sortable: false, render: renderRowActions },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [canEditRpm, canNotify, role]);

  const detailReadings = useMemo(
    () => (detailRow ? getRpmReadings(detailRow.id, { includeCancelled: true }) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detailRow, tick],
  );

  const addSoftWarns = softWarnings(addValues);

  return (
    <QueuePageShell
      activeKey='telemed'
      breadcrumb={TELEMED_BREADCRUMB('กระดานติดตามค่าจากอุปกรณ์ที่บ้าน (RPM)')}
      title='กระดานติดตามค่าจากอุปกรณ์ที่บ้าน (RPM)'
      onBack={() => history.push('/telemed/worklist')}
      backLabel='หน้าห้องตรวจ'
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
          <RoleSwitcher role={role} onChange={setRole} />
          <ViewToggle value={view === 'list' ? 'list' : 'grid'} onChange={(v) => setView(v === 'grid' ? 'grid' : 'list')} />
          <BrandSubdueButton variant='outline' size='md' leadingIcon='print' onClick={() => { logTelemedEvent(role, 'พิมพ์กระดาน RPM'); window.print(); }}>
            พิมพ์
          </BrandSubdueButton>
        </div>
      )}
      summaryCards={summaryCards}
      tabs={TABS}
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
        {/* แบนเนอร์ค่าวิกฤต — ปิดไม่ได้จนกว่าจะมีการดำเนินการ */}
        {criticalUnacked.map((row) => (
          <PageBanner
            key={row.id}
            tone='danger'
            icon='crisis_alert'
            title={`${row.name} — ${row.alerts[0]?.label || 'ค่าเกินเกณฑ์'}`}
            actions={(
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                <BrandPrimaryButton size='sm' leadingIcon='videocam' disabled={!canJoin} title={canJoin ? undefined : joinDeny} onClick={() => handleCall(row)}>เปิดสาย</BrandPrimaryButton>
                <BrandSubdueButton size='sm' variant='outline' leadingIcon='queue' disabled={!canJoin} title={canJoin ? undefined : joinDeny} onClick={() => handleQueue(row)}>ส่งเข้าคิว</BrandSubdueButton>
                <NeutralSubdueButton size='sm' variant='outline' leadingIcon='task_alt' onClick={() => { setAckTarget(row); setAckNote(''); setAckError(''); }}>
                  บันทึกว่าติดตามแล้ว
                </NeutralSubdueButton>
              </div>
            )}
          >
            {row.alerts.map((a) => a.detail).join(' · ')} — ต้องดำเนินการอย่างใดอย่างหนึ่งก่อนจึงจะปิดแจ้งเตือนนี้ได้
          </PageBanner>
        ))}

        {!canEditRpm && (
          <PageBanner tone='warning' icon='lock' title='บทบาทนี้แก้ไขค่าไม่ได้'>
            {editDeny} — ปุ่มบันทึก / แก้ไข / ยกเลิกค่า ถูกปิดใช้งาน แต่ยังเปิดดูและเปิดสายได้
          </PageBanner>
        )}

        <ContentCard>
          <div className='w-full flex items-start justify-center'>
            <PrimarySearch
              value={searchQ}
              onChange={setSearchQ}
              onSubmit={(label, item) => { setSearchQ(label); pushHistory(item ?? label); }}
              history={searchHistory}
              onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
              placeholder='ค้นหา HN / ชื่อ-สกุล / โปรแกรมติดตาม / หน่วยบริการ'
              width={640}
            />
          </div>

          <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
              <FilterTag
                value='ทั้งหมด'
                selected={filters.source === 'all' && filters.unit === 'all'
                  && filters.dateValue.quick === FILTER_DEFAULTS.dateValue.quick && !searchQ}
                onClick={() => { setFilters(FILTER_DEFAULTS); setSearchQ(''); setPage(1); }}
              />
              <FilterDropdown prefix='ที่มาของค่า:' options={SOURCE_OPTIONS} value={filters.source} onChange={(v) => { setFilters((f) => ({ ...f, source: v })); setPage(1); }} />
              <FilterDropdown prefix='หน่วยบริการ:' options={unitOptions} value={filters.unit} onChange={(v) => { setFilters((f) => ({ ...f, unit: v })); setPage(1); }} />
              <FilterDateTag
                prefix='ช่วง:'
                value={filters.dateValue}
                onChange={(v) => { setFilters((f) => ({ ...f, dateValue: v })); setPage(1); }}
                defaultQuick='last7'
                quickLabels={{ last7: '7 วันล่าสุด', last30: '30 วันล่าสุด' }}
              />
            </OverflowFlexRow>
          </div>

          {rows.length === 0 ? (
            <EmptyState icon='monitor_heart' title='ยังไม่มีผู้รับบริการที่ลงทะเบียนอุปกรณ์ RPM' hint='ลงทะเบียนอุปกรณ์วัดที่บ้านให้ผู้รับบริการที่หน่วยบริการต้นทางก่อน' />
          ) : sorted.length === 0 ? (
            <EmptyState
              icon='search_off'
              title='ไม่พบผู้รับบริการที่ตรงกับการค้นหา / ตัวกรอง'
              hint='ลองปรับคำค้นหรือล้างตัวกรอง'
              action={(
                <NeutralSubdueButton size='md' variant='outline' leadingIcon='filter_alt_off' onClick={() => { setFilters(FILTER_DEFAULTS); setSearchQ(''); setPage(1); }}>
                  ล้างตัวกรอง
                </NeutralSubdueButton>
              )}
            />
          ) : view === 'grid' ? (
            <>
              <div className='grid' style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--dim-space-400)' }}>
                {pageRows.map((row) => (
                  <div
                    key={row.id}
                    className='flex flex-col'
                    style={{
                      borderRadius: 'var(--dim-radius-400, 12px)',
                      border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
                      background: 'var(--surface-card-100)',
                      paddingTop: 'var(--dim-space-400)',
                      paddingBottom: 'var(--dim-space-400)',
                      paddingLeft: 'var(--dim-space-400)',
                      paddingRight: 'var(--dim-space-400)',
                      gap: 'var(--dim-space-300)',
                      boxShadow: 'var(--shadow-card)',
                    }}
                  >
                    <div className='flex items-start' style={{ gap: 'var(--dim-space-200)' }}>
                      <div className='flex-1 min-w-0'>{renderPatient(row)}</div>
                      {renderLevel(row)}
                    </div>
                    {renderLatest(row)}
                    {renderTrend(row)}
                    {renderDevices(row)}
                    {row.alerts.length > 0 && (
                      <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
                        {row.alerts.map((a) => (
                          <span key={a.key} style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}>
                            · {a.label} — {a.detail}
                          </span>
                        ))}
                      </div>
                    )}
                    {renderRowActions(row)}
                  </div>
                ))}
              </div>
              <PagerBar rangeStart={rangeStart} rangeEnd={rangeEnd} total={sorted.length}>
                <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
              </PagerBar>
            </>
          ) : (
            <>
              <Table
                columns={columns}
                rows={pageRows}
                rowKey={(r) => r.id}
                sortConfig={sortConfig}
                onSort={(key) => setSortConfig((prev) => (prev.key === key
                  ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
                  : { key, direction: 'asc' }))}
                stickyColCount={2}
                stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                emptyMessage='ไม่พบข้อมูล'
              />
              <PagerBar rangeStart={rangeStart} rangeEnd={rangeEnd} total={sorted.length}>
                <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
              </PagerBar>
            </>
          )}
        </ContentCard>
      </div>

      {/* ── รายละเอียด + ตารางค่า (แก้ไข / ยกเลิก / กู้คืน) ── */}
      <Popup
        open={Boolean(detailRow)}
        onClose={() => setDetail(null)}
        title={detailRow ? `ค่าจากอุปกรณ์ที่บ้าน · ${detailRow.name}` : ''}
        subtitle={detailRow ? `HN ${detailRow.hn} · ${detailRow.program} · ${detailRow.originUnit}` : ''}
        size='large'
        width={960}
        primaryAction={{ label: 'ปิด', onClick: () => setDetail(null) }}
      >
        {detailRow && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
            <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
              {detailRow.alerts.length === 0 ? (
                <ColorfulBadge style='green' size='small' hierarchy='secondary'>ค่าอยู่ในเกณฑ์ทั้งหมด</ColorfulBadge>
              ) : detailRow.alerts.map((a) => (
                <ColorfulBadge key={a.key} style={RPM_ALERT_LEVEL[a.level].tone} size='small' hierarchy='secondary'>
                  {`${a.label} — ${a.detail}`}
                </ColorfulBadge>
              ))}
            </div>

            {/* VitalTrendChart รองรับเฉพาะ bp/pulse/spo2/temp/rr — ผู้รับบริการที่
                ส่งเฉพาะ DTX (RPM-002 / RPM-003) ต้องใช้ sparkline เต็มความกว้าง
                ไม่งั้นกล่องสูง 300px จะขึ้น "ไม่มีข้อมูล" ทั้งที่มีค่าอยู่ */}
            {renderDetailTrend(detailRow)}

            <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
              <span style={{ fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)', color: 'var(--text-content-default)' }}>
                ตารางค่าที่รับเข้าระบบ
              </span>
              <Table
                columns={[
                  { key: 'at', label: 'วัน-เวลา', sortable: false, render: (r) => formatThaiDateTime(r.at) },
                  { key: 'value', label: 'ค่า', flex: true, minWidth: 200, sortable: false, render: (r) => {
                    const parts = [];
                    if (r.bpSys != null) parts.push(`BP ${r.bpSys}/${r.bpDia}`);
                    if (r.dtx != null) parts.push(`DTX ${r.dtx} (${DTX_MEAL_STATE.find((m) => m.value === r.meal)?.label || '—'})`);
                    if (r.o2sat != null) parts.push(`O₂ ${r.o2sat}%`);
                    if (r.temp != null) parts.push(`T ${r.temp}°C`);
                    if (r.pulse != null) parts.push(`PR ${r.pulse}`);
                    if (r.weight != null) parts.push(`น้ำหนัก ${r.weight} กก.`);
                    return parts.join(' · ') || '—';
                  } },
                  { key: 'source', label: 'ที่มา', sortable: false, render: (r) => (
                    <ColorfulBadge style={RPM_SOURCE[r.source]?.tone || 'grey'} size='small' hierarchy='secondary'>
                      {RPM_SOURCE[r.source]?.label}
                    </ColorfulBadge>
                  ) },
                  { key: 'audit', label: 'ผู้บันทึก / แก้ไข', sortable: false, render: (r) => (
                    <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
                      {r.recordedBy && <AuditStamp action='บันทึก' by={r.recordedBy} at={r.at} />}
                      {r.editedBy && <AuditStamp action='แก้ไข' by={r.editedBy} at={r.editedAt} />}
                      {r.cancelled && (
                        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-alert-error, #B91C1C)' }}>
                          {`ยกเลิกโดย ${r.cancelled.by} · ${r.cancelled.reason}`}
                        </span>
                      )}
                    </div>
                  ) },
                  { key: 'act', label: 'การจัดการ', sortable: false, render: (r) => (
                    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100)' }}>
                      {r.cancelled ? (
                        <NeutralSubdueButton
                          size='sm'
                          variant='outline'
                          leadingIcon='restore'
                          disabled={!canEditRpm}
                          title={canEditRpm ? undefined : editDeny}
                          onClick={() => { restoreRpmReading(r.id, telemedActor(role)); logTelemedEvent(role, 'กู้คืนค่า RPM ที่ยกเลิก'); }}
                        >
                          กู้คืน
                        </NeutralSubdueButton>
                      ) : (
                        <>
                          <NeutralSubdueButton
                            size='sm'
                            variant='outline'
                            leadingIcon='edit'
                            disabled={!canEditRpm || r.source === 'device'}
                            title={!canEditRpm ? editDeny : r.source === 'device' ? 'ค่าที่มาจากอุปกรณ์แก้ไม่ได้โดยตรง — บันทึกค่าใหม่แทน' : undefined}
                            onClick={() => openEdit(r, detailRow)}
                          >
                            แก้ไข
                          </NeutralSubdueButton>
                          <NeutralSubdueButton
                            size='sm'
                            variant='outline'
                            leadingIcon='block'
                            disabled={!canEditRpm}
                            title={canEditRpm ? undefined : editDeny}
                            onClick={() => { setCancelTarget({ reading: r, patient: detailRow }); setCancelReason(''); setCancelError(''); }}
                          >
                            ยกเลิก
                          </NeutralSubdueButton>
                        </>
                      )}
                    </div>
                  ) },
                ]}
                rows={detailReadings}
                rowKey={(r) => r.id}
                emptyMessage='ยังไม่มีค่าที่รับเข้าระบบ'
              />
            </div>
          </div>
        )}
      </Popup>

      {/* ── บันทึกค่าแทนผู้ป่วย ── */}
      <Popup
        open={Boolean(addTarget)}
        onClose={() => setAddTarget(null)}
        title='บันทึกค่าแทนผู้รับบริการ'
        subtitle={addTarget ? `${addTarget.name} · HN ${addTarget.hn} · ที่มา "จนท.บันทึกแทน"` : ''}
        width={640}
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setAddTarget(null) }}
        primaryAction={{ label: dupWarn ? 'ยืนยันบันทึกทับ' : 'บันทึกค่า', onClick: confirmAdd }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
          {dupWarn && (
            <PageBanner tone='warning' icon='content_copy' title='พบค่าที่เวลาซ้ำกับรายการเดิม'>
              {`มีค่าบันทึกไว้แล้วเมื่อ ${formatThaiDateTime(dupWarn.at)} — กด "ยืนยันบันทึกทับ" อีกครั้งถ้าต้องการบันทึกซ้ำ`}
            </PageBanner>
          )}
          <div className='grid' style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'var(--dim-space-300)' }}>
            {NEW_READING_FIELDS.map((k) => (
              <div key={k} className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
                  {`${RPM_PARAM_META[k].label} (${RPM_PARAM_META[k].unit})`}
                </span>
                <InputField
                  size='lg'
                  showLabel={false}
                  showHelperText={false}
                  value={addValues[k]}
                  onChange={(v) => { setAddValues((s) => ({ ...s, [k]: typeof v === 'string' ? v : v?.target?.value })); setAddErrors((e) => ({ ...e, [k]: undefined, _form: undefined })); }}
                  placeholder='—'
                />
                {addErrors[k] && (
                  <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-alert-error, #B91C1C)' }}>{addErrors[k]}</span>
                )}
              </div>
            ))}
          </div>
          {addValues.dtx !== '' && (
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
              <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>สถานะก่อน/หลังอาหาร (DTX)</span>
              <Select showLabel={false} searchable={false} size='lg' value={addMeal} onChange={setAddMeal} options={DTX_MEAL_STATE} />
            </div>
          )}
          {addSoftWarns.map((w) => (
            <ColorfulBadge key={w} style='orange' size='small' hierarchy='secondary'>{w}</ColorfulBadge>
          ))}
          {addErrors._form && (
            <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-alert-error, #B91C1C)' }}>{addErrors._form}</span>
          )}
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
            <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>หมายเหตุ</span>
            <SuggestibleTextarea
              voice
              minChars={3}
              suggestions={[
                'อสม. เจาะให้ที่บ้าน ผู้รับบริการงดอาหารมาแล้ว 8 ชั่วโมง',
                'ผู้รับบริการโทรแจ้งค่าทางโทรศัพท์ เจ้าหน้าที่บันทึกแทน',
                'วัดซ้ำหลังพัก 5 นาที เนื่องจากค่าครั้งแรกสูงผิดปกติ',
              ]}
              value={addNote}
              onChange={setAddNote}
              placeholder='บริบทของการวัด (ใครวัด · วัดอย่างไร)'
              height={100}
            />
          </div>
        </div>
      </Popup>

      {/* ── แก้ไขค่า ── */}
      <Popup
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title='แก้ไขค่าที่บันทึกไว้'
        subtitle={editTarget ? `${editTarget.patient.name} · ${formatThaiDateTime(editTarget.reading.at)}` : ''}
        width={640}
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setEditTarget(null) }}
        primaryAction={{ label: 'บันทึกการแก้ไข', onClick: confirmEdit }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
          <div className='grid' style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'var(--dim-space-300)' }}>
            {NEW_READING_FIELDS.map((k) => (
              <div key={k} className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
                  {`${RPM_PARAM_META[k].label} (${RPM_PARAM_META[k].unit})`}
                </span>
                <InputField
                  size='lg'
                  showLabel={false}
                  showHelperText={false}
                  value={String(editValues[k] ?? '')}
                  onChange={(v) => setEditValues((s) => ({ ...s, [k]: typeof v === 'string' ? v : v?.target?.value }))}
                  placeholder='—'
                />
              </div>
            ))}
          </div>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
            <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>เหตุผลการแก้ไข (บังคับ)</span>
            <SuggestibleTextarea
              voice
              minChars={3}
              suggestions={SUGGEST_REASON}
              value={editReason}
              onChange={(v) => { setEditReason(v); if (editError) setEditError(''); }}
              placeholder='ระบุเหตุผล — ค่าเดิมจะถูกเก็บไว้ในประวัติ'
              height={100}
            />
            {editError && (
              <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-alert-error, #B91C1C)' }}>{editError}</span>
            )}
          </div>
        </div>
      </Popup>

      {/* ── ยกเลิกค่า ── */}
      <AlertDialog
        open={Boolean(cancelTarget)}
        type='destructive'
        title='ยกเลิกค่าที่บันทึกไว้'
        description={cancelTarget ? `${cancelTarget.patient.name} · ${formatThaiDateTime(cancelTarget.reading.at)} — ค่าจะยังเห็นได้ในประวัติและกู้คืนได้` : ''}
        cancelLabel='ไม่ยกเลิก'
        confirmLabel='ยืนยันยกเลิกค่า'
        onCancel={() => setCancelTarget(null)}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancelReading}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <SuggestibleTextarea
            voice
            minChars={3}
            suggestions={SUGGEST_REASON}
            value={cancelReason}
            onChange={(v) => { setCancelReason(v); if (cancelError) setCancelError(''); }}
            placeholder='เหตุผลการยกเลิกค่า (บังคับ)'
            height={100}
          />
          {cancelError && (
            <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-alert-error, #B91C1C)' }}>{cancelError}</span>
          )}
        </div>
      </AlertDialog>

      {/* ── ตั้งค่าเกณฑ์ ── */}
      <Popup
        open={Boolean(thresholdTarget)}
        onClose={() => setThresholdTarget(null)}
        title='ตั้งค่าเกณฑ์แจ้งเตือน'
        subtitle={thresholdTarget ? `${thresholdTarget.name} — ค่าเริ่มต้นอ้างอิงเกณฑ์ส่ง Telemedicine ในคู่มือ` : ''}
        width={620}
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setThresholdTarget(null) }}
        primaryAction={{ label: 'บันทึกเกณฑ์', onClick: confirmThreshold }}
      >
        {thresholdDraft && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <PageBanner tone='info' icon='menu_book' title='เกณฑ์ตามคู่มือ Telemed'>
              HbA1c &gt; 8 % · BP &gt; 160/90 ติดกัน 2 ครั้ง · DTX &lt; 80 ติดกัน 2 ครั้ง · DTX &gt; 180 ติดกัน 3 ครั้ง
            </PageBanner>
            <div className='grid' style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--dim-space-300)' }}>
              {[
                ['bpHighSys', 'ความดันตัวบนเกิน (mmHg)'],
                ['bpHighDia', 'ความดันตัวล่างเกิน (mmHg)'],
                ['dtxLow', 'DTX ต่ำกว่า (mg/dL)'],
                ['dtxHigh', 'DTX สูงกว่า (mg/dL)'],
                ['hba1cHigh', 'HbA1c สูงกว่า (%)'],
                ['noReadingDays', 'ไม่ส่งค่าเกิน (วัน)'],
              ].map(([k, label]) => (
                <div key={k} className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
                  <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>{label}</span>
                  <InputField
                    size='lg'
                    showLabel={false}
                    showHelperText={false}
                    value={thresholdDraft[k]}
                    onChange={(v) => setThresholdDraft((d) => ({ ...d, [k]: typeof v === 'string' ? v : v?.target?.value }))}
                  />
                </div>
              ))}
            </div>
            <AuditStamp action='ปรับเกณฑ์ล่าสุด' by={thresholdTarget?.thresholdUpdatedBy} at={thresholdTarget?.thresholdUpdatedAt} />
          </div>
        )}
      </Popup>

      {/* ── GIS ── */}
      <Popup
        open={Boolean(mapTarget)}
        onClose={() => setMapTarget(null)}
        title='ตำแหน่งบ้านที่วัดค่า (GIS)'
        subtitle={mapTarget ? `${mapTarget.name} · ${mapTarget.homeLocation.label}` : ''}
        width={720}
        primaryAction={{ label: 'ปิด', onClick: () => setMapTarget(null) }}
      >
        {mapTarget && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <PageBanner tone='info' icon='info' title='แผนที่สาธิต'>
              พิกัดที่แสดงเป็นการฉายตำแหน่งจำลอง ไม่ใช่พิกัดจริงจากอุปกรณ์ — ใช้ประกอบการเยี่ยมบ้านเท่านั้น
            </PageBanner>
            <AddressMapBlock
              value={mapTarget.homeLocation}
              readOnly
              heading='ตำแหน่งบ้านผู้รับบริการ'
              hint='พิกัดที่บันทึกไว้ตอนลงทะเบียนอุปกรณ์ (ดูอย่างเดียว)'
            />
          </div>
        )}
      </Popup>

      {/* ── บันทึกว่าติดตามแล้ว ── */}
      <AlertDialog
        open={Boolean(ackTarget)}
        type='info'
        title='บันทึกว่าติดตามแล้ว'
        description={ackTarget ? `${ackTarget.name} — ระบุการดำเนินการที่ทำไปแล้ว เพื่อปิดแจ้งเตือนค่าวิกฤต` : ''}
        cancelLabel='ยกเลิก'
        confirmLabel='บันทึกการติดตาม'
        onCancel={() => setAckTarget(null)}
        onClose={() => setAckTarget(null)}
        onConfirm={confirmAck}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <SuggestibleTextarea
            voice
            minChars={3}
            suggestions={[
              'โทรติดตามผู้รับบริการแล้ว อาการปกติ นัดวัดซ้ำพรุ่งนี้เช้า',
              'ประสาน อสม. ลงเยี่ยมบ้านภายในวันนี้',
              'ส่งเข้าคิวปรึกษาทางไกลกับแพทย์ช่วงบ่าย',
              'แนะนำให้มาที่ศูนย์บริการทันที ผู้รับบริการรับทราบแล้ว',
            ]}
            value={ackNote}
            onChange={(v) => { setAckNote(v); if (ackError) setAckError(''); }}
            placeholder='การดำเนินการที่ทำไปแล้ว (บังคับ)'
            height={100}
          />
          {ackError && (
            <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-alert-error, #B91C1C)' }}>{ackError}</span>
          )}
        </div>
      </AlertDialog>

      {/* ── toast แบบเบา ── */}
      <AlertDialog
        open={Boolean(toast)}
        type={toast?.ok ? 'success' : 'warning'}
        title={toast?.ok ? 'ดำเนินการแล้ว' : 'ดำเนินการไม่สำเร็จ'}
        description={toast?.text || ''}
        showCancel={false}
        confirmLabel='ตกลง'
        onConfirm={() => setToast(null)}
        onClose={() => setToast(null)}
      />
    </QueuePageShell>
  );
};

export default TelemedRpmBoardPage;
