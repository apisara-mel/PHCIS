import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import useSearchHistory from '@/components/search/useSearchHistory';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import FilterDateTag from '@/components/forms/FilterDateTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import SelectableTag from '@/components/forms/SelectableTag';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Popup from '@/components/popup/Popup';
import UnsavedChangesPopup from '@/components/popup/UnsavedChangesPopup';
import PatientCard from '@/components/card/PatientCard';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  ADDICTION_PROGRAMS,
  ADDICTION_SUBSTANCES,
  ADDICTION_USE_METHODS,
  ADDICTION_SEVERITY_LEVELS,
  ASSIST_QUESTIONS,
  ASSIST_SCALE,
  interpretAssistScore,
  resolveProgram,
  resolveSeverity,
  isRightsExpired,
  formatAddictionDate,
  todayIsoDate,
  getAddictionQueueRows,
  ADDICTION_SCHEDULED,
} from '@/data/addictionVisits';
import {
  ADDICTION_REGISTRY_STATUSES,
  ADDICTION_DISCHARGE_REASONS,
  resolveRegistryStatus,
  getRegistryEntries,
  findRegistryEntryByHn,
  upsertRegistryEntry,
  dischargeRegistryEntry,
  cancelRegistryEntry,
  reactivateRegistryEntry,
  getRegistryCancellation,
  getFollowUpOverdue,
  CANCEL_REASON_SUGGESTIONS,
} from '@/data/addictionRegistry';
import { printAddictionRegistry } from '@/pages/clinic/addiction/addictionPrint';
import {
  AddictionAccessGate,
  AccessDemoToggle,
  ProgramBadge,
  NoticeBand,
  AuditStamp,
  TopicHeader,
  Field,
  SectionCard,
  EmptyHint,
  dateFilterToIsoRange,
} from '@/pages/clinic/addiction/addictionShared';

/* AddictionRegistryPage — ทะเบียนผู้ติดสารเสพติด + คัดกรองการใช้สารเสพติด
   (TOR 1.10.5.6, manual §2.2.1 บันทึกแรกรับ + §2.2.3 จำหน่ายเพื่อติดตามผล).

   Playbook §3 registry pattern (PharmacyRegistryPage / MentalHealth
   RegistryPage): ONE page carries the list and the create/edit form —
   the form expands above the table. All four TOR verbs live here:
     แสดง   — tabs + table + read-only reopen of cancelled/closed rows
     บันทึก — ASSIST total → interpretAssistScore → severity, then
              upsertRegistryEntry (data layer stamps ผู้บันทึก + เวลา)
     แก้ไข  — the same form prefilled; audit line gains ผู้แก้ไข
     ยกเลิก — reason popup; the row STAYS visible greyed with the audit
              line + a เปิดใช้งานอีกครั้ง action (never deleted)
   Plus จำหน่ายเพื่อติดตามผล (manual §2.2.3) — the bridge that pushes a
   case into /clinic/addiction/follow-up and starts the 30-day overdue
   clock (getFollowUpOverdue). */

const breadcrumb = ['บันทึกการรักษา', 'งานบำบัดสารเสพติด', 'ทะเบียนผู้ติดสารเสพติด'];
const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:addiction-registry';
const PAGE_SIZE = 10;

const REGISTRY_NOTE_SUGGESTIONS = [
  'สมัครใจเข้ารับการบำบัด ญาติพามาและยินดีร่วมโปรแกรม',
  'ส่งต่อจากจุดคัดกรอง OPD หลังตรวจพบการใช้สารเสพติด',
  'เคยบำบัดที่สถานพยาบาลอื่นแต่ไม่ครบโปรแกรม ขอเริ่มใหม่',
  'อยู่ระหว่างการดูแลของชุมชน (CBTx) ร่วมกับ อสส. ประจำชุมชน',
];

const DISCHARGE_NOTE_SUGGESTIONS = [
  'ครบโปรแกรมการบำบัด ผลปัสสาวะไม่พบสารต่อเนื่อง — นัดติดตาม 4 ครั้งใน 1 ปี',
  'ผิดนัดต่อเนื่องเกิน 3 ครั้ง ประสาน อสส. ติดตามที่ชุมชน',
  'ส่งต่อสถานพยาบาลที่มีศักยภาพสูงกว่าตามความรุนแรงของอาการ',
];

const EMPTY_FORM = {
  id: '',
  hn: '',
  name: '',
  age: '',
  gender: '',
  mainSubstance: '',
  secondarySubstance: '',
  useMethod: '',
  program: '',
  registeredDate: '',
  assistAnswers: {},
  therapist: '',
  note: '',
  status: 'intake',
};

const FILTER_DEFAULTS = {
  program: 'all',
  severity: 'all',
  therapist: 'all',
  dateValue: { quick: 'all' },
};

const DATE_CHIP_LABELS = { all: 'ทุกช่วงเวลา' };

/** patientProfiles ages read "52 ปี - 6 เดือน - 2 วัน" — the registry only
    keeps the year, so pull the leading integer. */
const ageYearsOf = (profile) => {
  const m = /(\d+)/.exec(profile?.age || '');
  return m ? Number(m[1]) : '';
};

const AddictionRegistryPage = () => {
  const history = useHistory();
  const [tick, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [page, setPage] = useState(1);

  /* null = list only · 'new' = create · row id = edit that row */
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [baseline, setBaseline] = useState('');
  const [errors, setErrors] = useState({});
  const [savedBanner, setSavedBanner] = useState(null);
  const [unsavedOpen, setUnsavedOpen] = useState(false);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const [dischargeTarget, setDischargeTarget] = useState(null);
  const [dischargeReason, setDischargeReason] = useState('');
  const [dischargeDate, setDischargeDate] = useState(todayIsoDate());
  const [dischargeNote, setDischargeNote] = useState('');
  const [dischargeError, setDischargeError] = useState('');

  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: [] });

  /* Rows carry their cancellation + overdue state so the table, the tabs
     and the summary cards all read one shape. */
  const rows = useMemo(() => getRegistryEntries().map((r) => ({
    ...r,
    cancellation: getRegistryCancellation(r.id),
    overdue: getFollowUpOverdue(r.hn),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [tick]);

  const therapistOptions = useMemo(() => {
    const names = new Set(rows.map((r) => r.therapist).filter(Boolean));
    getAddictionQueueRows().forEach((r) => r.therapist && names.add(r.therapist));
    return Array.from(names).map((t) => ({ value: t, label: t }));
  }, [rows]);

  /* Names for HN lookup: the module's own roster wins over patientProfiles
     (the clinic roster carries the addiction-clinic display name). */
  const roster = useMemo(() => {
    const map = new Map();
    [...getAddictionQueueRows(), ...ADDICTION_SCHEDULED].forEach((r) => {
      if (!map.has(r.hn)) map.set(r.hn, r.name);
    });
    rows.forEach((r) => { if (!map.has(r.hn)) map.set(r.hn, r.name); });
    return map;
  }, [rows]);

  const tabs = useMemo(() => ([
    { key: 'all', label: 'ทั้งหมด', icon: 'group', count: rows.length },
    ...ADDICTION_REGISTRY_STATUSES.map((s) => ({
      key: s.value,
      label: s.label,
      icon: s.value === 'intake' ? 'how_to_reg'
        : s.value === 'treating' ? 'medical_services'
          : s.value === 'dischargedFollow' ? 'follow_the_signs' : 'task_alt',
      count: rows.filter((r) => !r.cancellation && r.status === s.value).length,
    })),
    { key: 'cancelled', label: 'ยกเลิกแล้ว', icon: 'block', count: rows.filter((r) => r.cancellation).length },
  ]), [rows]);

  const dateRange = useMemo(() => dateFilterToIsoRange(filters.dateValue), [filters.dateValue]);

  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return rows.filter((r) => {
      if (activeTab === 'cancelled') {
        if (!r.cancellation) return false;
      } else if (activeTab !== 'all') {
        if (r.cancellation || r.status !== activeTab) return false;
      }
      if (filters.program !== 'all' && r.program !== filters.program) return false;
      if (filters.severity !== 'all' && r.severity !== filters.severity) return false;
      if (filters.therapist !== 'all' && r.therapist !== filters.therapist) return false;
      if (dateRange) {
        if (!r.registeredDate) return false;
        if (r.registeredDate < dateRange.from || r.registeredDate > dateRange.to) return false;
      }
      if (!q) return true;
      return [r.hn, r.name, r.mainSubstance, r.therapist].some((f) => f && f.toLowerCase().includes(q));
    });
  }, [rows, activeTab, filters, dateRange, searchQ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [activeTab, filters, searchQ]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const summaryCards = useMemo(() => ([
    { key: 'total', label: 'ทะเบียนทั้งหมด', value: rows.filter((r) => !r.cancellation).length, color: 'info', icon: 'contact_page' },
    { key: 'intake', label: 'แรกรับ', value: rows.filter((r) => !r.cancellation && r.status === 'intake').length, color: 'brand', icon: 'how_to_reg' },
    { key: 'treating', label: 'กำลังบำบัด', value: rows.filter((r) => !r.cancellation && r.status === 'treating').length, color: 'inprogress', icon: 'medical_services' },
    { key: 'discharged', label: 'จำหน่ายเพื่อติดตาม', value: rows.filter((r) => !r.cancellation && r.status === 'dischargedFollow').length, color: 'positive', icon: 'follow_the_signs' },
    { key: 'overdue', label: 'ผิดนัดติดตาม', value: rows.filter((r) => !r.cancellation && r.overdue).length, color: 'destructive', icon: 'running_with_errors' },
  ]), [rows]);

  /* ── ASSIST scoring ─────────────────────────────────────────────── */
  const assistTotal = useMemo(
    () => ASSIST_QUESTIONS.reduce((sum, q) => sum + (form.assistAnswers?.[q.key] ?? 0), 0),
    [form.assistAnswers],
  );
  const assistAnswered = useMemo(
    () => ASSIST_QUESTIONS.filter((q) => form.assistAnswers?.[q.key] !== undefined).length,
    [form.assistAnswers],
  );
  const assistComplete = assistAnswered === ASSIST_QUESTIONS.length;
  const assistInterp = useMemo(() => interpretAssistScore(assistTotal), [assistTotal]);

  /* ── open / close form ──────────────────────────────────────────── */
  const rowToForm = (row) => ({
    id: row.id,
    hn: row.hn,
    name: row.name,
    age: row.age ?? '',
    gender: row.gender || '',
    mainSubstance: row.mainSubstance || '',
    secondarySubstance: row.secondarySubstance || '',
    useMethod: row.useMethod || '',
    program: row.program || '',
    registeredDate: row.registeredDate || '',
    /* Stored rows keep only the total; rebuild an answer set that sums to
       it so the block reads as "ตอบครบแล้ว" and stays editable. */
    assistAnswers: rebuildAssistAnswers(row.screeningScore ?? 0),
    therapist: row.therapist || '',
    note: row.note || '',
    status: row.status || 'intake',
  });

  const openCreate = () => {
    const next = { ...EMPTY_FORM, registeredDate: todayIsoDate() };
    setForm(next);
    setBaseline(JSON.stringify(next));
    setErrors({});
    setSavedBanner(null);
    setEditing('new');
  };

  const openEdit = (row) => {
    const next = rowToForm(row);
    setForm(next);
    setBaseline(JSON.stringify(next));
    setErrors({});
    setSavedBanner(null);
    setEditing(row.id);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeFormNow = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setBaseline('');
    setErrors({});
  };

  const dirty = editing !== null && JSON.stringify(form) !== baseline;

  const requestCloseForm = () => {
    if (dirty) setUnsavedOpen(true);
    else closeFormNow();
  };

  const setField = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const editingRow = useMemo(
    () => (editing && editing !== 'new' ? rows.find((r) => r.id === editing) || null : null),
    [editing, rows],
  );
  const readOnly = !!(editingRow && (editingRow.cancellation || editingRow.status === 'followupComplete'));

  const profile = useMemo(() => (form.hn ? getPatientByHN(form.hn) : null), [form.hn]);
  const duplicate = useMemo(() => {
    if (!form.hn) return null;
    const existing = findRegistryEntryByHn(form.hn);
    if (!existing) return null;
    if (editing !== 'new' && existing.id === form.id) return null;
    return existing;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.hn, form.id, editing, tick]);

  const applyHn = (hn) => {
    const clean = hn.trim();
    const p = getPatientByHN(clean);
    setForm((f) => ({
      ...f,
      hn: clean,
      name: roster.get(clean) || p?.shortName || f.name,
      age: p ? ageYearsOf(p) : f.age,
      gender: p?.sex || f.gender,
    }));
    setErrors((e) => ({ ...e, hn: undefined }));
  };

  /* ── บันทึก ─────────────────────────────────────────────────────── */
  const save = () => {
    const next = {};
    if (!form.hn.trim()) next.hn = 'กรุณาระบุ HN ผู้รับบริการ';
    else if (!getPatientByHN(form.hn.trim())) next.hn = `ไม่พบ HN ${form.hn.trim()} ในทะเบียนผู้ป่วย — ตรวจสอบอีกครั้ง`;
    if (!form.mainSubstance) next.mainSubstance = 'กรุณาเลือกสารเสพติดหลักที่ใช้';
    if (!form.program) next.program = 'กรุณาเลือกโปรแกรมบำบัด';
    if (!form.therapist) next.therapist = 'กรุณาเลือกผู้บำบัด';
    if (!assistComplete) {
      const missing = ASSIST_QUESTIONS
        .map((q, i) => (form.assistAnswers?.[q.key] === undefined ? i + 1 : null))
        .filter(Boolean);
      next.assist = `ยังตอบแบบคัดกรอง ASSIST ไม่ครบ — เหลือข้อ ${missing.join(', ')} จาก ${ASSIST_QUESTIONS.length} ข้อ`;
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    const saved = upsertRegistryEntry({
      id: form.id || undefined,
      hn: form.hn.trim(),
      name: form.name.trim(),
      age: form.age === '' ? undefined : Number(form.age),
      gender: form.gender,
      mainSubstance: form.mainSubstance,
      secondarySubstance: form.secondarySubstance,
      useMethod: form.useMethod,
      program: form.program,
      registeredDate: form.registeredDate || todayIsoDate(),
      screeningScore: assistTotal,
      severity: assistInterp.level,
      therapist: form.therapist,
      note: form.note.trim(),
      status: form.status || 'intake',
    });
    setTick((t) => t + 1);
    closeFormNow();
    setSavedBanner({ name: saved.name, hn: saved.hn, isNew: editing === 'new' });
  };

  /* ── ยกเลิก / เปิดใช้งานอีกครั้ง ──────────────────────────────── */
  const openCancel = (row) => {
    setCancelReason('');
    setCancelError('');
    setCancelTarget(row);
  };
  const confirmCancel = () => {
    if (!cancelReason.trim()) {
      setCancelError('กรุณาระบุเหตุผลการยกเลิกทะเบียน');
      return;
    }
    cancelRegistryEntry(cancelTarget.id, cancelReason.trim());
    setCancelTarget(null);
    setTick((t) => t + 1);
  };
  const reactivate = (row) => {
    reactivateRegistryEntry(row.id);
    setTick((t) => t + 1);
  };

  /* ── จำหน่ายเพื่อติดตามผล (manual §2.2.3) ──────────────────────── */
  const openDischarge = (row) => {
    setDischargeReason('');
    setDischargeDate(todayIsoDate());
    setDischargeNote('');
    setDischargeError('');
    setDischargeTarget(row);
  };
  const confirmDischarge = () => {
    if (!dischargeReason) {
      setDischargeError('กรุณาเลือกเหตุผลการจำหน่าย');
      return;
    }
    dischargeRegistryEntry(dischargeTarget.id, dischargeReason, dischargeNote.trim());
    /* dischargeRegistryEntry stamps today — honour the date the user picked. */
    if (dischargeDate && dischargeDate !== todayIsoDate()) {
      upsertRegistryEntry({ id: dischargeTarget.id, dischargedDate: dischargeDate });
    }
    setDischargeTarget(null);
    setTick((t) => t + 1);
    setSavedBanner({ name: dischargeTarget.name, hn: dischargeTarget.hn, discharged: true });
  };

  /* ── search ─────────────────────────────────────────────────────── */
  const rowToSearchItem = (r) => ({
    id: r.id,
    label: r.name,
    sublabel: `${resolveProgram(r.program)?.label || '—'} · ${r.therapist}`,
    value: r.name,
    badges: [{ label: r.hn, tone: 'indigo' }],
    avatarSrc: getPatientByHN(r.hn)?.avatarUrl,
  });

  const searchSuggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    return rows
      .filter((r) => [r.hn, r.name, r.mainSubstance, r.therapist].some((f) => f && f.toLowerCase().includes(q)))
      .slice(0, 8)
      .map(rowToSearchItem);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQ, rows]);

  /* ── table ──────────────────────────────────────────────────────── */
  const greyed = { color: 'var(--text-content-tertiary, #858C92)' };

  const columns = useMemo(() => ([
    {
      key: 'hn', label: 'HN',
      render: (r) => <span style={r.cancellation ? greyed : undefined}>{r.hn}</span>,
    },
    {
      key: 'name', label: 'ชื่อ-สกุล', flex: true, minWidth: 160,
      render: (r) => (
        <span style={r.cancellation ? greyed : { fontWeight: 'var(--type-weight-medium)' }}>{r.name}</span>
      ),
    },
    {
      key: 'age', label: 'อายุ/เพศ', sortable: false,
      render: (r) => <span style={r.cancellation ? greyed : undefined}>{`${r.age ?? '—'} ปี / ${r.gender || '—'}`}</span>,
    },
    {
      key: 'mainSubstance', label: 'สารเสพติดที่ใช้', flex: true, minWidth: 200,
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={r.cancellation ? greyed : undefined}>{r.mainSubstance || '—'}</span>
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {r.secondarySubstance ? `สารรอง: ${r.secondarySubstance} · ` : ''}วิธีใช้: {r.useMethod || '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'program', label: 'โปรแกรม', sortable: false,
      render: (r) => <ProgramBadge program={r.program} />,
    },
    {
      key: 'screeningScore', label: 'ASSIST / ความรุนแรง',
      render: (r) => {
        const sev = resolveSeverity(r.severity);
        return (
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <span style={r.cancellation ? greyed : undefined}>{r.screeningScore ?? '—'} คะแนน</span>
            {sev && <ColorfulBadge style={sev.badge} size='small' hierarchy='secondary'>{sev.label}</ColorfulBadge>}
          </div>
        );
      },
    },
    {
      key: 'registeredDate', label: 'วันลงทะเบียน',
      render: (r) => <span style={r.cancellation ? greyed : undefined}>{formatAddictionDate(r.registeredDate)}</span>,
    },
    {
      key: 'therapist', label: 'ผู้บำบัด', flex: true, minWidth: 150,
      render: (r) => <span style={r.cancellation ? greyed : undefined}>{r.therapist}</span>,
    },
    {
      key: 'status', label: 'สถานะ', sortable: false,
      render: (r) => {
        if (r.cancellation) {
          return (
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกทะเบียน</ColorfulBadge>
              <span style={{ fontSize: 'var(--type-size-xs)', ...greyed }}>
                ยกเลิกโดย {r.cancellation.by} · {r.cancellation.at}
                <br />เหตุผล: {r.cancellation.reason}
              </span>
            </div>
          );
        }
        const st = resolveRegistryStatus(r.status);
        return (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <ColorfulBadge style={st?.badge || 'grey'} size='small' hierarchy='secondary'>{st?.label || r.status}</ColorfulBadge>
            {r.dischargedDate && (
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                จำหน่าย {formatAddictionDate(r.dischargedDate)} · {r.dischargeReason || '—'}
              </span>
            )}
            {r.overdue && (
              <ColorfulBadge style='red' size='small' hierarchy='secondary'>
                ผิดนัดติดตาม {r.overdue.daysOverdue} วัน
              </ColorfulBadge>
            )}
          </div>
        );
      },
    },
    {
      key: 'recordedBy', label: 'ผู้บันทึก', sortable: false,
      render: (r) => (
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary, #636B72)' }}>
          {r.recordedBy}<br />{r.recordedAt}
          {r.editedBy && <><br />แก้ไข: {r.editedBy} · {r.editedAt}</>}
        </span>
      ),
    },
    {
      key: 'actions', label: 'การดำเนินการ', sortable: false,
      render: (r) => (
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {r.cancellation ? (
            <BrandSubdueButton
              variant='outline' size='sm' leadingIcon='restart_alt'
              onClick={(e) => { e.stopPropagation(); reactivate(r); }}
            >
              เปิดใช้งานอีกครั้ง
            </BrandSubdueButton>
          ) : (
            <>
              <BrandSubdueButton
                variant='outline' size='sm' leadingIcon='edit'
                onClick={(e) => { e.stopPropagation(); openEdit(r); }}
              >
                แก้ไข
              </BrandSubdueButton>
              {(r.status === 'intake' || r.status === 'treating') && (
                <BrandSubdueButton
                  variant='outline' size='sm' leadingIcon='logout'
                  onClick={(e) => { e.stopPropagation(); openDischarge(r); }}
                >
                  จำหน่ายเพื่อติดตามผล
                </BrandSubdueButton>
              )}
              <NeutralSubdueButton
                size='sm' leadingIcon='monitoring'
                onClick={(e) => {
                  e.stopPropagation();
                  history.push(`/clinic/addiction/follow-up?hn=${encodeURIComponent(r.hn)}`);
                }}
              >
                ดูการติดตาม
              </NeutralSubdueButton>
              <NeutralSubdueButton
                size='sm' leadingIcon='block'
                onClick={(e) => { e.stopPropagation(); openCancel(r); }}
              >
                ยกเลิก
              </NeutralSubdueButton>
            </>
          )}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [tick, rows]);

  const filtersActive = searchQ.trim() !== ''
    || filters.program !== 'all'
    || filters.severity !== 'all'
    || filters.therapist !== 'all'
    || (filters.dateValue?.quick || 'all') !== 'all'
    || activeTab !== 'all';

  const { showClearChip, resultsOpaque, clearFilters: smoothClearFilters } = useSmoothClearFilters(filtersActive, clearFilters);

  const clearFilters = () => {
    setSearchQ('');
    setFilters(FILTER_DEFAULTS);
    setActiveTab('all');
  };

  const filterSummary = [
    activeTab === 'all' ? null : (tabs.find((t) => t.key === activeTab)?.label),
    filters.program === 'all' ? null : resolveProgram(filters.program)?.label,
    filters.severity === 'all' ? null : `ความรุนแรง ${resolveSeverity(filters.severity)?.label}`,
    filters.therapist === 'all' ? null : `ผู้บำบัด ${filters.therapist}`,
    dateRange ? `ลงทะเบียน ${formatAddictionDate(dateRange.from)} – ${formatAddictionDate(dateRange.to)}` : null,
    searchQ.trim() ? `ค้นหา "${searchQ.trim()}"` : null,
  ].filter(Boolean).join(' · ');

  const doPrint = () => printAddictionRegistry(
    filtered.map((r) => ({
      ...r,
      programLabel: resolveProgram(r.program)?.label,
      severityLabel: resolveSeverity(r.severity)?.label,
      statusLabel: r.cancellation ? 'ยกเลิกทะเบียน' : resolveRegistryStatus(r.status)?.label,
    })),
    filterSummary || 'ทั้งหมด',
  );

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='ทะเบียนผู้ติดสารเสพติด'
      onBack={() => history.push('/clinic/addiction')}
      backLabel='กลับหน้าคิว'
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <AccessDemoToggle onRevoked={() => setTick((t) => t + 1)} />
          <NeutralSubdueButton variant='outline' size='sm' leadingIcon='print' onClick={doPrint}>
            พิมพ์ทะเบียน
          </NeutralSubdueButton>
          <NeutralSubdueButton variant='outline' size='sm' leadingIcon='diversity_3' onClick={() => history.push('/clinic/addiction/community')}>
            CBTx &amp; HR ชุมชน
          </NeutralSubdueButton>
          <BrandSubdueButton variant='fill' leadingIcon='person_add' onClick={openCreate}>
            ลงทะเบียนผู้ติดสารเสพติด
          </BrandSubdueButton>
        </div>
      )}
      summaryCards={summaryCards}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {/* ── ยกเลิกทะเบียน ─────────────────────────────────────────── */}
      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title='ยกเลิกทะเบียนผู้ติดสารเสพติด'
        subtitle={cancelTarget ? `${cancelTarget.name} · HN: ${cancelTarget.hn}` : ''}
        tertiaryAction={{ label: 'กลับไปแก้ต่อ', onClick: () => setCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันยกเลิกทะเบียน', onClick: confirmCancel, tone: 'danger' }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <SuggestibleTextarea
            label='เหตุผลการยกเลิก'
            required
            voice
            value={cancelReason}
            onChange={(e) => { setCancelReason(e.target.value); if (e.target.value.trim()) setCancelError(''); }}
            suggestions={CANCEL_REASON_SUGGESTIONS}
            minChars={2}
            placeholder='เช่น บันทึกซ้ำ / ผู้ป่วยย้ายไปบำบัดที่อื่น'
          />
          <span style={{
            color: cancelError ? 'var(--text-input-errorHelper, #DC2626)' : 'var(--text-content-tertiary, #858C92)',
            fontSize: 'var(--type-size-xs)',
          }}>
            {cancelError || 'ต้องระบุเหตุผล — ระบบบันทึกผู้ยกเลิกและเวลาให้อัตโนมัติ และแถวจะยังแสดงอยู่ในทะเบียน'}
          </span>
        </div>
      </Popup>

      {/* ── จำหน่ายเพื่อติดตามผล (manual §2.2.3) ──────────────────── */}
      <Popup
        open={!!dischargeTarget}
        onClose={() => setDischargeTarget(null)}
        title='จำหน่ายเพื่อติดตามผลการบำบัดรักษา'
        subtitle={dischargeTarget ? `${dischargeTarget.name} · HN: ${dischargeTarget.hn}` : ''}
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setDischargeTarget(null) }}
        primaryAction={{ label: 'ยืนยันจำหน่าย', onClick: confirmDischarge }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <NoticeBand tone='info' icon='info'>
            เมื่อจำหน่ายแล้ว ระบบจะย้ายเคสไปแท็บ “จำหน่ายเพื่อติดตามผล” และเริ่มนับกำหนดติดตามทุก 30 วัน
            (เกินกำหนดจะขึ้นเตือน “ผิดนัดติดตาม” ที่หน้าติดตามการดูแล)
          </NoticeBand>
          <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <Field label='เหตุผลการจำหน่าย' required error={dischargeError || undefined}>
              <Select
                showLabel={false} searchable={false} size='lg'
                value={dischargeReason}
                onChange={(v) => { setDischargeReason(v); setDischargeError(''); }}
                options={ADDICTION_DISCHARGE_REASONS.map((r) => ({ value: r, label: r }))}
                placeholder='เลือกเหตุผล'
                error={dischargeError ? ' ' : undefined}
              />
            </Field>
            <Field label='วันที่จำหน่าย' required>
              <DatePicker
                showLabel={false}
                value={dischargeDate ? new Date(dischargeDate) : null}
                onChange={(d) => setDischargeDate(d ? d.toISOString().slice(0, 10) : '')}
                placeholder='เลือกวันที่'
              />
            </Field>
          </div>
          <SuggestibleTextarea
            label='บันทึกการจำหน่าย'
            voice
            value={dischargeNote}
            onChange={(e) => setDischargeNote(e.target.value)}
            suggestions={DISCHARGE_NOTE_SUGGESTIONS}
            minChars={2}
            placeholder='สรุปผลการบำบัดและแผนการติดตาม'
          />
        </div>
      </Popup>

      <UnsavedChangesPopup
        open={unsavedOpen}
        onClose={() => setUnsavedOpen(false)}
        onSave={() => { setUnsavedOpen(false); save(); }}
        onDiscard={() => { setUnsavedOpen(false); closeFormNow(); }}
        title='ออกจากแบบฟอร์มทะเบียนโดยยังไม่บันทึก?'
        description='ข้อมูลที่กรอกไว้จะหายไปหากออกโดยไม่บันทึก — เลือก “บันทึกร่างและออก” เพื่อบันทึกทะเบียนก่อนออก'
      />

      <AddictionAccessGate>
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
          {savedBanner && (
            <NoticeBand tone='info' icon='check-circle'>
              {savedBanner.discharged
                ? `จำหน่าย ${savedBanner.name} (HN ${savedBanner.hn}) เพื่อติดตามผลเรียบร้อย — ติดตามต่อได้ที่หน้า “ติดตามการดูแล”`
                : savedBanner.isNew
                  ? `ลงทะเบียน ${savedBanner.name} (HN ${savedBanner.hn}) เข้าทะเบียนผู้ติดสารเสพติดแล้ว`
                  : `บันทึกการแก้ไขทะเบียนของ ${savedBanner.name} (HN ${savedBanner.hn}) แล้ว`}
            </NoticeBand>
          )}

          {/* ── ฟอร์มลงทะเบียน / แก้ไข ───────────────────────────── */}
          {editing !== null && (
            <section
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
              <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <h1 className='text-base font-bold' style={{ color: 'var(--text-content-default, #363B3F)' }}>
                  {editing === 'new' ? 'ลงทะเบียนผู้ติดสารเสพติด (แรกรับ)' : `แก้ไขทะเบียน — ${form.name || form.hn}`}
                </h1>
                {readOnly && <ColorfulBadge style='grey' size='small' hierarchy='secondary'>อ่านอย่างเดียว</ColorfulBadge>}
                <div className='flex-1' />
                <NeutralSubdueButton size='sm' leadingIcon='close' onClick={requestCloseForm}>ปิดแบบฟอร์ม</NeutralSubdueButton>
              </div>

              {readOnly && (
                <NoticeBand tone='warning' icon='lock'>
                  {editingRow?.cancellation
                    ? `ทะเบียนนี้ถูกยกเลิกโดย ${editingRow.cancellation.by} เมื่อ ${editingRow.cancellation.at} (เหตุผล: ${editingRow.cancellation.reason}) — กด “เปิดใช้งานอีกครั้ง” ที่ตารางก่อนจึงจะแก้ไขได้`
                    : 'ทะเบียนนี้อยู่ในสถานะ “ติดตามครบ” — ต้องเปลี่ยนสถานะกลับเป็นกำลังบำบัดก่อนจึงจะแก้ไขรายละเอียดได้'}
                </NoticeBand>
              )}

              {duplicate && (
                <NoticeBand tone='warning' icon='content_copy'>
                  HN {form.hn} มีทะเบียนอยู่แล้ว ({duplicate.name} · ลงทะเบียน {formatAddictionDate(duplicate.registeredDate)}) —
                  ควรแก้ไขรายการเดิมแทนการสร้างซ้ำ{' '}
                  <button
                    type='button'
                    onClick={() => openEdit(rows.find((r) => r.id === duplicate.id) || duplicate)}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                      color: 'var(--text-brandPrimary-default, #007549)',
                      fontWeight: 'var(--type-weight-bold)', textDecoration: 'underline',
                    }}
                  >
                    เปิดแก้ไขรายการเดิม
                  </button>
                </NoticeBand>
              )}

              {form.hn && isRightsExpired(form.hn) && (
                <NoticeBand tone='warning' icon='warning'>
                  สิทธิการรักษาของ HN {form.hn} หมดอายุ — ตรวจสอบสิทธิก่อนให้บริการ
                  (ยังบันทึกทะเบียนได้ งานบำบัดสารเสพติดเป็นบริการที่ห้ามปฏิเสธ)
                </NoticeBand>
              )}

              {/* §1 ข้อมูลผู้รับบริการ */}
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <TopicHeader icon='person'>ข้อมูลผู้รับบริการ</TopicHeader>
                <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                  <Field label='HN' required error={errors.hn} hint='พิมพ์ HN แล้วระบบจะดึงชื่อ อายุ เพศ จากทะเบียนผู้ป่วยให้'>
                    <InputField
                      showLabel={false}
                      showHelperText={false}
                      value={form.hn}
                      onChange={applyHn}
                      disabled={readOnly || editing !== 'new'}
                      placeholder='เช่น 67-00009'
                      error={errors.hn ? ' ' : undefined}
                    />
                  </Field>
                  <Field label='ชื่อ-นามสกุล' required>
                    <InputField showLabel={false} showHelperText={false} value={form.name} onChange={setField('name')} disabled={readOnly} placeholder='ชื่อ-นามสกุลผู้รับบริการ' />
                  </Field>
                  <Field label='อายุ (ปี)'>
                    <InputField showLabel={false} showHelperText={false} value={String(form.age ?? '')} onChange={setField('age')} disabled={readOnly} placeholder='ปี' />
                  </Field>
                  <Field label='เพศ'>
                    <Select
                      showLabel={false} showHelperText={false} searchable={false} size='lg'
                      value={form.gender} onChange={setField('gender')} disabled={readOnly}
                      options={[{ value: 'ชาย', label: 'ชาย' }, { value: 'หญิง', label: 'หญิง' }]}
                      placeholder='เลือกเพศ'
                    />
                  </Field>
                  <Field label='วันที่ลงทะเบียน'>
                    <DatePicker
                      showLabel={false}
                      value={form.registeredDate ? new Date(form.registeredDate) : null}
                      onChange={(d) => setField('registeredDate')(d ? d.toISOString().slice(0, 10) : '')}
                      disabled={readOnly}
                      placeholder='เลือกวันที่'
                    />
                  </Field>
                </div>
                {profile ? (
                  <PatientCard patient={profile} compact title='ข้อมูลทั่วไปผู้รับบริการ' />
                ) : (
                  <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>
                    ยังไม่ได้ระบุ HN ที่ถูกต้อง — ข้อมูลทั่วไปผู้รับบริการจะแสดงเมื่อพบทะเบียนผู้ป่วย
                  </span>
                )}
              </div>

              {/* §2 สารเสพติดที่ใช้ */}
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <TopicHeader icon='science'>สารเสพติดที่ใช้</TopicHeader>
                <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                  <Field label='สารเสพติดหลัก' required error={errors.mainSubstance}>
                    <Select
                      showLabel={false} showHelperText={false} size='lg'
                      value={form.mainSubstance} onChange={setField('mainSubstance')} disabled={readOnly}
                      options={ADDICTION_SUBSTANCES.map((s) => ({ value: s, label: s }))}
                      placeholder='เลือกสารเสพติดหลัก'
                      error={errors.mainSubstance ? ' ' : undefined}
                    />
                  </Field>
                  <Field label='สารเสพติดรอง'>
                    <Select
                      showLabel={false} showHelperText={false} size='lg'
                      value={form.secondarySubstance} onChange={setField('secondarySubstance')} disabled={readOnly}
                      options={[{ value: '', label: 'ไม่มี' }, ...ADDICTION_SUBSTANCES.map((s) => ({ value: s, label: s }))]}
                      placeholder='เลือกสารเสพติดรอง (ถ้ามี)'
                    />
                  </Field>
                  <Field label='วิธีใช้'>
                    <Select
                      showLabel={false} showHelperText={false} searchable={false} size='lg'
                      value={form.useMethod} onChange={setField('useMethod')} disabled={readOnly}
                      options={ADDICTION_USE_METHODS.map((s) => ({ value: s, label: s }))}
                      placeholder='เลือกวิธีใช้'
                    />
                  </Field>
                </div>
              </div>

              {/* §3 คัดกรองการใช้สารเสพติด (ASSIST) */}
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <TopicHeader icon='quiz'>คัดกรองการใช้สารเสพติด (ASSIST)</TopicHeader>
                <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                  ตอบครบทุกข้อ ระบบคำนวณคะแนนรวมและแปลผลระดับความรุนแรงให้อัตโนมัติ (ตอบแล้ว {assistAnswered}/{ASSIST_QUESTIONS.length} ข้อ)
                </span>
                {ASSIST_QUESTIONS.map((q, idx) => (
                  <div key={q.key} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
                      {idx + 1}. {q.label}
                    </span>
                    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                      {ASSIST_SCALE.map((opt) => (
                        <SelectableTag
                          key={opt.value}
                          label={`${opt.label} (${opt.value})`}
                          size='md'
                          selected={form.assistAnswers?.[q.key] === opt.value}
                          onClick={readOnly ? undefined : () => {
                            setForm((f) => ({ ...f, assistAnswers: { ...f.assistAnswers, [q.key]: opt.value } }));
                            setErrors((e) => ({ ...e, assist: undefined }));
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                  <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default, #363B3F)' }}>
                    คะแนนรวม {assistTotal} คะแนน
                  </span>
                  <ColorfulBadge style={assistInterp.badge} size='small' hierarchy='secondary' width='hug' maxWidth={460}>
                    {assistInterp.label}
                  </ColorfulBadge>
                  <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                    → ระดับความรุนแรงที่บันทึก: {resolveSeverity(assistInterp.level)?.label}
                  </span>
                </div>
                {errors.assist && (
                  <span style={{ color: 'var(--text-input-errorHelper, #DC2626)', fontSize: 'var(--type-size-xs)' }}>{errors.assist}</span>
                )}
              </div>

              {/* §4 โปรแกรมบำบัด + ผู้บำบัด */}
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <TopicHeader icon='medical_services'>โปรแกรมบำบัดและผู้รับผิดชอบ</TopicHeader>
                <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                  <Field label='โปรแกรมบำบัด' required error={errors.program}>
                    <Select
                      showLabel={false} showHelperText={false} searchable={false} size='lg'
                      value={form.program} onChange={setField('program')} disabled={readOnly}
                      options={ADDICTION_PROGRAMS.map((p) => ({ value: p.value, label: p.label }))}
                      placeholder='เลือกโปรแกรมบำบัด'
                      error={errors.program ? ' ' : undefined}
                    />
                  </Field>
                  <Field label='ผู้บำบัด' required error={errors.therapist}>
                    <Select
                      showLabel={false} showHelperText={false} size='lg'
                      value={form.therapist} onChange={setField('therapist')} disabled={readOnly}
                      options={therapistOptions}
                      placeholder='เลือกผู้บำบัด'
                      error={errors.therapist ? ' ' : undefined}
                    />
                  </Field>
                  <Field label='สถานะทะเบียน'>
                    <Select
                      showLabel={false} showHelperText={false} searchable={false} size='lg'
                      value={form.status} onChange={setField('status')} disabled={readOnly}
                      options={ADDICTION_REGISTRY_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
                      placeholder='เลือกสถานะ'
                    />
                  </Field>
                </div>
                <SuggestibleTextarea
                  label='บันทึกเพิ่มเติม'
                  voice
                  value={form.note}
                  onChange={(e) => setField('note')(e.target.value)}
                  suggestions={REGISTRY_NOTE_SUGGESTIONS}
                  minChars={2}
                  disabled={readOnly}
                  placeholder='บริบทการเข้าสู่การบำบัด ครอบครัว/ชุมชนที่สนับสนุน แผนเบื้องต้น'
                />
              </div>

              {editingRow && (
                <AuditStamp
                  by={editingRow.recordedBy}
                  at={editingRow.recordedAt}
                  editedBy={editingRow.editedBy}
                  editedAt={editingRow.editedAt}
                />
              )}

              <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <div className='flex-1' />
                <NeutralSubdueButton size='lg' onClick={requestCloseForm}>ยกเลิก</NeutralSubdueButton>
                <BrandSubdueButton variant='fill' size='lg' leadingIcon='save' onClick={save} disabled={readOnly}>
                  {editing === 'new' ? 'บันทึกทะเบียน' : 'บันทึกการแก้ไข'}
                </BrandSubdueButton>
              </div>
            </section>
          )}

          {/* ── รายการทะเบียน ────────────────────────────────────── */}
          <SectionCard>
            <div className='w-full flex items-start justify-between flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <div className='flex-1 flex items-start justify-center' style={{ minWidth: 280 }}>
                <PrimarySearch
                  value={searchQ}
                  onChange={setSearchQ}
                  onSubmit={(label, item) => {
                    setSearchQ(label);
                    const match = item?.id ? rows.find((r) => r.id === item.id) : null;
                    pushHistory(match ? rowToSearchItem(match) : (item ?? label));
                  }}
                  suggestions={searchSuggestions}
                  history={searchHistory}
                  onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
                  placeholder='ค้นหา HN / ชื่อ-สกุล / สารเสพติด / ผู้บำบัด'
                  width={620}
                />
              </div>
            </div>

            <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
                <FilterDropdown
                  prefix='โปรแกรม:'
                  options={[{ value: 'all', label: 'ทุกโปรแกรม' }, ...ADDICTION_PROGRAMS.map((p) => ({ value: p.value, label: p.label }))]}
                  value={filters.program}
                  onChange={(v) => setFilters((f) => ({ ...f, program: v }))}
                />
                <FilterDropdown
                  prefix='ความรุนแรง:'
                  options={[{ value: 'all', label: 'ทุกระดับ' }, ...ADDICTION_SEVERITY_LEVELS.map((s) => ({ value: s.value, label: s.label }))]}
                  value={filters.severity}
                  onChange={(v) => setFilters((f) => ({ ...f, severity: v }))}
                />
                <FilterDropdown
                  prefix='ผู้บำบัด:'
                  options={[{ value: 'all', label: 'ทุกคน' }, ...therapistOptions]}
                  value={filters.therapist}
                  onChange={(v) => setFilters((f) => ({ ...f, therapist: v }))}
                />
                <FilterDateTag
                  prefix='ลงทะเบียน:'
                  value={filters.dateValue}
                  onChange={(v) => setFilters((f) => ({ ...f, dateValue: v }))}
                  defaultQuick='all'
                  quickLabels={DATE_CHIP_LABELS}
                />
              <ClearFiltersTag active={showClearChip} onClear={smoothClearFilters} />
              </OverflowFlexRow>
            </div>

            <SmoothFilterResults opaque={resultsOpaque}>
          <SearchResultCount found={filtered.length} total={rows.length} />

            {rows.length === 0 ? (
              <EmptyHint
                icon='contact_page'
                action={(
                  <BrandSubdueButton variant='fill' leadingIcon='person_add' onClick={openCreate}>
                    ลงทะเบียนรายแรก
                  </BrandSubdueButton>
                )}
              >
                ยังไม่มีผู้ลงทะเบียนในทะเบียนผู้ติดสารเสพติด — เริ่มจากการลงทะเบียนแรกรับของผู้รับบริการรายแรก
              </EmptyHint>
            ) : filtered.length === 0 ? (
              <EmptyHint
                icon='filter_alt_off'
              >
                ไม่พบข้อมูลที่ตรงกับเงื่อนไข ({filterSummary || 'ตัวกรองปัจจุบัน'}) — ปรับหรือล้างตัวกรองแล้วลองอีกครั้ง
              </EmptyHint>
            ) : (
              <>
                <Table
                  columns={columns}
                  rows={pageRows}
                  rowKey={(r) => r.id}
                  onRowClick={(r) => openEdit(r)}
                  stickyColCount={2}
                  emptyMessage='ไม่พบข้อมูลที่ตรงกับเงื่อนไข'
                />
                <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <span style={{ color: 'var(--text-content-secondary, #636B72)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
                    {`แสดง ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} จาก ${filtered.length} รายการ`}
                  </span>
                  <div className='flex-1' />
                  <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
                </div>
              </>
            )}
            </SmoothFilterResults>
          </SectionCard>
        </div>
      </AddictionAccessGate>
    </QueuePageShell>
  );
};

/* Rebuild a per-question ASSIST answer set from a stored total so an
   existing registration reopens as "ตอบครบ" (the registry keeps only the
   sum). Spreads the total across the questions inside the 0–4 scale. */
function rebuildAssistAnswers(total) {
  const max = ASSIST_SCALE[ASSIST_SCALE.length - 1].value;
  let left = Math.max(0, Math.min(total, ASSIST_QUESTIONS.length * max));
  const answers = {};
  ASSIST_QUESTIONS.forEach((q, i) => {
    const remainingSlots = ASSIST_QUESTIONS.length - i;
    const take = Math.max(0, Math.min(max, Math.ceil(left / remainingSlots)));
    answers[q.key] = take;
    left -= take;
  });
  return answers;
}

export default AddictionRegistryPage;
