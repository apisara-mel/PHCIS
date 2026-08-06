import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Icon from '@/components/icons/Icon';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import TabCapsule from '@/components/tab/TabCapsule';
import DatePicker from '@/components/forms/DatePicker';
import DatePickerRange from '@/components/forms/DatePickerRange';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import ConsentAuditBar from '@/components/forms/ConsentAuditBar';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import Popup from '@/components/popup/Popup';
import UnsavedChangesPopup from '@/components/popup/UnsavedChangesPopup';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import PatientCard from '@/components/card/PatientCard';
import VitalSignTimelineCard from '@/components/card/VitalSignTimelineCard';
import { LineChart } from '@/components/graph/Charts';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  HivStiConfidentialGate,
  MaskedPii,
  ReadOnlyBanner,
  Field,
} from '@/pages/clinic/hiv-sti/hivStiShared';
import {
  HIV_STI_TRACK_LABELS,
  HIV_STI_TRACK_BADGE,
  HIV_STI_FOLLOWUP_STATUS,
  HIV_STI_APPOINTMENT_TYPES,
  HIV_STI_FOLLOWUP_CHANNELS,
  PEP_INCOMPLETE_REASON_SUGGESTIONS,
  HIV_STI_FOLLOWUP_CONTACT_SUGGESTIONS,
  HIV_STI_VL_LOD,
  getHivStiFollowUpRows,
  getHivStiFollowUpByHn,
  filterHivStiLabTrend,
  filterHivStiVitalsTrend,
  filterHivStiXray,
  getHivStiArvHistory,
  getHivStiCurrentRegimen,
  getHivStiRegistryRows,
  getHivStiRegistryCancellation,
  getHivStiVisitHistoryByHn,
  getHivStiFollowUpContacts,
  saveHivStiFollowUpContact,
  updateHivStiFollowUpContact,
  cancelHivStiFollowUpContact,
  savePepOutcome,
  getPepOutcome,
  clearPepOutcome,
  saveNextFollowUp,
  getNextFollowUp,
  clearNextFollowUp,
  computePepDueDate,
  computePepDayNumber,
  resolveArvStatus,
  resolveHivStiFollowUpChannel,
  parseHivStiNumber,
  isHivStiUndetectable,
  isHivStiPending,
  maskHivStiName,
  formatHivStiDate,
  hivStiTodayIso,
  canEditHivSti,
  getHivStiGateAudit,
} from '@/data/hivStiVisits';

/* HivStiFollowUpPage — การติดตามการดูแลผู้รับบริการ HIV/STI (TOR 1.10.6.8,
   /clinic/hiv-sti/follow-up). One page, two states — the same shape
   NcdFollowUpPage (1.10.2.8) established:

     (A) WORKLIST — everyone currently in the follow-up programme, tabbed by
         appointment status (มาตามนัด / ครบกำหนดวันนี้ / ผิดนัด) and filtered
         by ประเภทการติดตาม (ARV / PEP / PrEP / VCT / STI). Rows are masked
         (UIC + ชื่อย่อ) exactly like the queue.
     (B) DETAIL — one client over a chosen ช่วงเวลา: สัญญาณชีพ rail · ผล Lab
         (CD4 / Viral load / VDRL) as a table plus SMALL-MULTIPLE line charts
         (one metric per plot — CD4 is in the hundreds while Viral load runs
         to 58,000, so a shared axis would flatten CD4 onto the baseline) ·
         X-ray · ยา ARV และการกินยาต่อเนื่อง (คู่มือ HCIS §2.16) · PEP/PrEP
         28-day outcome · การนัดต่อเนื่อง + การติดตามผู้ผิดนัด ·
         ประวัติการรักษาย้อนหลัง (คู่มือ §2.15).

   §1.4.2 — the whole body sits behind the SHARED HivStiConfidentialGate
   (no new gate mechanism), identities render masked with per-field reveal
   through MaskedPii, and the page closes with a ConsentAuditBar naming who
   opened the module and when. Printing uses a neutral header ("คลินิกเวชกรรม")
   and never prints HIV results.

   Persistence is sessionStorage only (prototype) — see manifest notes. */

const breadcrumb = ['ระบบบันทึกการรักษา', 'คลินิก HIV/STI', 'ติดตามการดูแล'];
const QUEUE_PATH = '/clinic/hiv-sti';
const REGISTRY_PATH = '/clinic/hiv-sti/registry';
const RECORD_PATH = '/clinic/hiv-sti/record';

const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:hiv-sti-followup';
const WORKLIST_PAGE_SIZE = 10;
const LAB_PAGE_SIZE = 6;
const DRUG_PAGE_SIZE = 6;

/* Chart series colors alias the DS colorful-badge bold steps (CLAUDE.md —
   never a raw literal; NcdFollowUpPage's hard-coded gauge hexes are NOT
   copied here). Each metric owns its own plot, so hues are never adjacent
   series inside one chart. */
const CD4_COLOR = 'var(--surface-colorfulbadge-teal-bold, #24A899)';
const VL_COLOR = 'var(--surface-colorfulbadge-purple-bold, #A855F7)';

/* ── Print chrome (§1.4.2 neutral paperwork) ──────────────────────────
   Idempotent module-load injection — the printed report carries only
   "คลินิกเวชกรรม", and every interactive control is dropped from print. */
const PRINT_STYLE_ID = 'mih-hivsti-followup-print';
if (typeof document !== 'undefined' && !document.getElementById(PRINT_STYLE_ID)) {
  const el = document.createElement('style');
  el.id = PRINT_STYLE_ID;
  el.textContent = `
.mih-hivsti-print-head { display: none; }
@media print {
  .mih-hivsti-print-head { display: block !important; }
  .mih-hivsti-noprint { display: none !important; }
}`;
  document.head.appendChild(el);
}

const RANGE_OPTIONS = [
  { key: '3m', label: '3 เดือนล่าสุด' },
  { key: '6m', label: '6 เดือนล่าสุด' },
  { key: '12m', label: '1 ปีล่าสุด' },
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'custom', label: 'กำหนดเอง' },
];

const monthsAgoIso = (n) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
};

const isoFormat = (d) => {
  if (!d) return '';
  const copy = new Date(d);
  copy.setHours(12, 0, 0, 0);
  return copy.toISOString().slice(0, 10);
};
const isoParse = (s) => (s ? new Date(`${s}T12:00:00`) : null);

const TH_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const shortThaiDate = (iso) => {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${TH_MONTHS_SHORT[d.getMonth()]}`;
};

const TRACK_FILTER_OPTIONS = [
  { value: 'all', label: 'ทุกประเภท' },
  ...Object.keys(HIV_STI_TRACK_LABELS).map((k) => ({ value: k, label: HIV_STI_TRACK_LABELS[k] })),
];

const appointmentTypeLabel = (value) =>
  HIV_STI_APPOINTMENT_TYPES.find((t) => t.value === value)?.label || '—';

/* ── Layout primitives ─────────────────────────────────────────────── */

const SectionHeader = ({ icon, children, action }) => (
  <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
    <span style={{ color: 'var(--text-brandPrimary-default, #007549)' }}><Icon name={icon} size={20} /></span>
    <h2
      className='flex-1 min-w-0'
      style={{
        fontSize: 'var(--type-size-base, 16px)',
        fontWeight: 'var(--type-weight-bold)',
        color: 'var(--text-brandPrimary-default, #007549)',
      }}
    >
      {children}
    </h2>
    {action}
  </div>
);

const SectionCard = ({ children }) => (
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
      gap: 'var(--dim-space-400, 16px)',
    }}
  >
    {children}
  </section>
);

const EmptyRangeCard = ({ icon = 'monitoring', children }) => (
  <div
    className='flex flex-col items-center text-center w-full'
    style={{
      gap: 'var(--dim-space-200, 8px)',
      paddingTop: 'var(--dim-space-800, 32px)',
      paddingBottom: 'var(--dim-space-800, 32px)',
      paddingLeft: 'var(--dim-space-600, 24px)',
      paddingRight: 'var(--dim-space-600, 24px)',
      borderRadius: 'var(--dim-radius-400, 12px)',
      border: 'var(--dim-stroke-100, 1px) dashed var(--border-neutral-tertiary, #C6CACD)',
      color: 'var(--text-content-tertiary, #858C92)',
    }}
  >
    <Icon name={icon} size={32} />
    <span style={{ fontSize: 'var(--type-size-sm, 14px)' }}>{children}</span>
  </div>
);

const NOTICE_TONES = {
  info: {
    background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
    color: 'var(--text-brandPrimary-default, #007549)',
  },
  warning: {
    background: 'var(--surface-alert-warning, #FFF9F0)',
    color: 'var(--text-warning-default, #C2410C)',
  },
  danger: {
    background: 'var(--surface-danger-quaternary, #FFF0F0)',
    color: 'var(--text-danger-default, #B91C1C)',
  },
};

const NoticeBand = ({ tone = 'warning', icon = 'warning', children }) => {
  const palette = NOTICE_TONES[tone] || NOTICE_TONES.warning;
  return (
    <div
      className='flex items-start w-full'
      style={{
        gap: 'var(--dim-space-200, 8px)',
        paddingTop: 'var(--dim-space-300, 12px)',
        paddingBottom: 'var(--dim-space-300, 12px)',
        paddingLeft: 'var(--dim-space-400, 16px)',
        paddingRight: 'var(--dim-space-400, 16px)',
        borderRadius: 'var(--dim-radius-200, 8px)',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-medium)',
        ...palette,
      }}
    >
      <Icon name={icon} size={18} />
      <span>{children}</span>
    </div>
  );
};

const InfoPanel = ({ children }) => (
  <div
    className='flex flex-col w-full'
    style={{
      gap: 'var(--dim-space-200, 8px)',
      paddingTop: 'var(--dim-space-400, 16px)',
      paddingBottom: 'var(--dim-space-400, 16px)',
      paddingLeft: 'var(--dim-space-400, 16px)',
      paddingRight: 'var(--dim-space-400, 16px)',
      borderRadius: 'var(--dim-radius-200, 8px)',
      background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
    }}
  >
    {children}
  </div>
);

const StampLine = ({ children }) => (
  <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
    {children}
  </span>
);

/* ── Guarded editor state (บันทึก / แก้ไข / ยกเลิก + dirty guard) ────
   Every save popup on this page shares one contract: opening seeds the
   form from what is already SAVED (so "ยกเลิก" restores the saved value,
   never blanks), and closing while dirty routes through
   UnsavedChangesPopup — the same contract HivStiRegistryPage uses. */
const useGuardedEditor = (emptyValue) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(emptyValue);
  const [seed, setSeed] = useState(emptyValue);
  const [error, setError] = useState('');
  const [unsavedOpen, setUnsavedOpen] = useState(false);

  const openWith = (next) => {
    setValue(next);
    setSeed(next);
    setError('');
    setUnsavedOpen(false);
    setOpen(true);
  };
  const dirty = JSON.stringify(value) !== JSON.stringify(seed);
  const requestClose = () => {
    if (dirty) setUnsavedOpen(true);
    else setOpen(false);
  };
  const discard = () => {
    setValue(seed);
    setError('');
    setUnsavedOpen(false);
    setOpen(false);
  };
  const stay = () => setUnsavedOpen(false);
  const close = () => {
    setUnsavedOpen(false);
    setOpen(false);
  };
  const revert = () => {
    setValue(seed);
    setError('');
  };
  return {
    open, value, setValue, dirty, error, setError,
    unsavedOpen, openWith, requestClose, discard, stay, close, revert,
  };
};

const EMPTY_PEP = { completed: '', reason: '' };
const EMPTY_NEXT = { type: '', date: '' };
const EMPTY_CONTACT = { id: null, channel: '', note: '' };

const rowToSearchItem = (row) => ({
  id: row.hn,
  /* §1.4.2 — suggestions and search history keep the MASKED identity only. */
  label: `${row.uic} · ${maskHivStiName(row.name)}`,
  sublabel: HIV_STI_TRACK_LABELS[row.track] || row.track,
  value: row.uic,
  badges: [
    { label: row.hn, tone: 'indigo' },
    { label: HIV_STI_FOLLOWUP_STATUS[row.status]?.label || '—', tone: 'teal' },
  ],
});

const HivStiFollowUpPage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();

  const readOnlyRole = !canEditHivSti();

  /* sessionStorage writes are not React state — tick re-derives everything. */
  const [tick, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);

  const [hn, setHn] = useState(navState?.hn || '');
  const [searchQ, setSearchQ] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [trackFilter, setTrackFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [rangeKey, setRangeKey] = useState('12m');
  const [customRange, setCustomRange] = useState(['', '']);
  const [labPage, setLabPage] = useState(1);
  const [drugPage, setDrugPage] = useState(1);
  const [selectedVitalIdx, setSelectedVitalIdx] = useState(null);
  const [detailVisit, setDetailVisit] = useState(null);

  const pepEditor = useGuardedEditor(EMPTY_PEP);
  const nextEditor = useGuardedEditor(EMPTY_NEXT);
  const contactEditor = useGuardedEditor(EMPTY_CONTACT);

  const [pepConfirm, setPepConfirm] = useState(null);      // pending value awaiting confirm
  const [pepCancelOpen, setPepCancelOpen] = useState(false);
  const [nextCancelOpen, setNextCancelOpen] = useState(false);
  const [contactCancelTarget, setContactCancelTarget] = useState(null);
  const [contactCancelReason, setContactCancelReason] = useState('');

  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: [] });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allRows = useMemo(() => getHivStiFollowUpRows(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const registryRows = useMemo(() => getHivStiRegistryRows(), [tick]);

  const current = useMemo(
    () => (hn ? allRows.find((r) => r.hn === hn) || getHivStiFollowUpByHn(hn) : null),
    [hn, allRows],
  );
  const registration = hn ? registryRows.find((r) => r.hn === hn) || null : null;
  const cancellation = hn ? getHivStiRegistryCancellation(hn) : null;
  const profile = hn ? getPatientByHN(hn) : null;
  const gateAudit = getHivStiGateAudit();

  /* ── ช่วงเวลา ───────────────────────────────────────────────────── */
  const [fromIso, toIso] = useMemo(() => {
    switch (rangeKey) {
      case '3m': return [monthsAgoIso(3), hivStiTodayIso()];
      case '6m': return [monthsAgoIso(6), hivStiTodayIso()];
      case '12m': return [monthsAgoIso(12), hivStiTodayIso()];
      case 'custom': return [customRange[0] || null, customRange[1] || null];
      default: return [null, null];
    }
  }, [rangeKey, customRange]);

  const labRows = useMemo(
    () => (hn ? filterHivStiLabTrend(hn, fromIso, toIso) : []),
    [hn, fromIso, toIso],
  );
  const vitalRows = useMemo(
    () => (hn ? filterHivStiVitalsTrend(hn, fromIso, toIso) : []),
    [hn, fromIso, toIso],
  );
  const xrayRows = useMemo(
    () => (hn ? filterHivStiXray(hn, fromIso, toIso) : []),
    [hn, fromIso, toIso],
  );
  const drugRows = useMemo(
    () => (hn ? getHivStiArvHistory(hn, fromIso, toIso) : []),
    [hn, fromIso, toIso],
  );
  const currentRegimen = useMemo(() => (hn ? getHivStiCurrentRegimen(hn) : null), [hn]);
  const visitHistory = useMemo(() => (hn ? getHivStiVisitHistoryByHn(hn) : []), [hn]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const contacts = useMemo(() => (hn ? getHivStiFollowUpContacts(hn) : []), [hn, tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pepOutcome = useMemo(() => (hn ? getPepOutcome(hn) : null), [hn, tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const savedNext = useMemo(() => (hn ? getNextFollowUp(hn) : null), [hn, tick]);

  useEffect(() => {
    setLabPage(1);
    setDrugPage(1);
    setSelectedVitalIdx(null);
  }, [hn, fromIso, toIso]);

  /* ── Lab derivations (รอผล never counts as a value) ──────────────── */

  const cd4Points = useMemo(
    () => labRows
      .map((r) => ({ dateIso: r.dateIso, value: parseHivStiNumber(r.cd4) }))
      .filter((p) => p.value != null),
    [labRows],
  );
  const vlPoints = useMemo(
    () => labRows
      .map((r) => ({ dateIso: r.dateIso, value: parseHivStiNumber(r.viralLoad), raw: r.viralLoad }))
      .filter((p) => p.value != null),
    [labRows],
  );
  const latestOf = (points) => (points.length ? points[points.length - 1] : null);
  const latestCd4 = latestOf(cd4Points);
  const latestVl = latestOf(vlPoints);
  const pendingLabCount = labRows.filter(
    (r) => isHivStiPending(r.vdrl) || isHivStiPending(r.viralLoad) || isHivStiPending(r.cd4),
  ).length;

  /* ── PEP derivations ────────────────────────────────────────────── */

  const pepInfo = current?.pep || null;
  const pepDue = pepInfo ? computePepDueDate(pepInfo.startDate) : null;
  const pepDay = pepInfo ? computePepDayNumber(pepInfo.startDate) : null;
  const pepDueIso = pepDue ? isoFormat(pepDue) : '';

  /* ── Worklist derivations ───────────────────────────────────────── */

  const tabs = useMemo(() => ([
    { key: 'all', label: 'ทั้งหมด', icon: 'group', count: allRows.length },
    { key: 'onSchedule', label: HIV_STI_FOLLOWUP_STATUS.onSchedule.label, icon: 'event_available', count: allRows.filter((r) => r.status === 'onSchedule').length },
    { key: 'due', label: HIV_STI_FOLLOWUP_STATUS.due.label, icon: 'schedule', count: allRows.filter((r) => r.status === 'due').length },
    { key: 'missed', label: HIV_STI_FOLLOWUP_STATUS.missed.label, icon: 'event_busy', count: allRows.filter((r) => r.status === 'missed').length },
  ]), [allRows]);

  const rowSearchFields = (row) => [row.hn, row.name, row.uic, HIV_STI_TRACK_LABELS[row.track], row.track];

  const filteredRows = useMemo(() => {
    let result = allRows;
    if (activeTab !== 'all') result = result.filter((r) => r.status === activeTab);
    if (trackFilter !== 'all') result = result.filter((r) => r.track === trackFilter);
    const q = searchQ.trim().toLowerCase();
    if (q) result = result.filter((r) => rowSearchFields(r).some((f) => f && String(f).toLowerCase().includes(q)));
    /* ผิดนัดขึ้นบนสุดโดยปริยาย แล้วเรียงตามจำนวนวันที่เกินกำหนดมาก→น้อย */
    const weight = { missed: 0, due: 1, onSchedule: 2 };
    return [...result].sort((a, b) => {
      const w = (weight[a.status] ?? 9) - (weight[b.status] ?? 9);
      if (w !== 0) return w;
      if (a.overdueDays !== b.overdueDays) return b.overdueDays - a.overdueDays;
      return String(a.nextDate).localeCompare(String(b.nextDate));
    });
  }, [allRows, activeTab, trackFilter, searchQ]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / WORKLIST_PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const pageRows = filteredRows.slice((page - 1) * WORKLIST_PAGE_SIZE, page * WORKLIST_PAGE_SIZE);
  const rangeStart = filteredRows.length === 0 ? 0 : (page - 1) * WORKLIST_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * WORKLIST_PAGE_SIZE, filteredRows.length);

  const searchSuggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    return allRows
      .filter((r) => rowSearchFields(r).some((f) => f && String(f).toLowerCase().includes(q)))
      .slice(0, 8)
      .map(rowToSearchItem);
  }, [searchQ, allRows]);

  const resolveSearchRow = (query, item) => {
    if (item?.id) {
      const byId = allRows.find((r) => r.hn === item.id);
      if (byId) return byId;
    }
    const q = (query ?? item?.value ?? item?.label ?? '').toString().trim().toLowerCase();
    if (!q) return null;
    return allRows.find((r) => rowSearchFields(r).some((f) => f && String(f).toLowerCase().includes(q))) || null;
  };

  const openDetail = (row) => {
    setHn(row.hn);
    setSearchQ('');
    pushHistory(rowToSearchItem(row));
  };

  const backToWorklist = () => {
    setHn('');
    setSearchQ('');
    setPage(1);
  };

  const clearAllFilters = () => {
    setTrackFilter('all');
    setSearchQ('');
    setActiveTab('all');
    setPage(1);
  };

  /* ── PEP outcome (บันทึก / แก้ไข / ยกเลิก) ───────────────────────── */

  const openPepEditor = () => pepEditor.openWith(
    pepOutcome
      ? { completed: pepOutcome.completed === true ? 'yes' : pepOutcome.completed === false ? 'no' : '', reason: pepOutcome.reason || '' }
      : { ...EMPTY_PEP },
  );

  const submitPep = () => {
    const v = pepEditor.value;
    if (!v.completed) {
      pepEditor.setError('ต้องเลือกผลการกินยา PEP ก่อนบันทึก');
      return;
    }
    if (v.completed === 'no' && (v.reason || '').trim().length < 3) {
      pepEditor.setError('เลือก "กินยาไม่ครบ 28 วัน" ต้องระบุเหตุผลอย่างน้อย 3 ตัวอักษร');
      return;
    }
    pepEditor.setError('');
    pepEditor.close();
    setPepConfirm(v);
  };

  const commitPep = () => {
    savePepOutcome(hn, {
      completed: pepConfirm.completed === 'yes',
      reason: pepConfirm.completed === 'no' ? pepConfirm.reason : '',
    });
    setPepConfirm(null);
    bump();
  };

  /* ── นัดต่อเนื่อง (บันทึก / แก้ไข / ยกเลิก) ───────────────────────── */

  const openNextEditor = () => nextEditor.openWith(
    savedNext
      ? { type: savedNext.type || '', date: savedNext.date || '' }
      : { type: current?.nextType || '', date: current?.nextDate || '' },
  );

  const nextIsPast = !!nextEditor.value.date && nextEditor.value.date < hivStiTodayIso();
  const nextOutsidePepWindow = !!pepInfo && !!pepDueIso
    && !!nextEditor.value.date && nextEditor.value.date > pepDueIso;

  const submitNext = () => {
    const v = nextEditor.value;
    if (!v.type) {
      nextEditor.setError('ต้องเลือกประเภทการนัดหมายก่อนบันทึก');
      return;
    }
    if (!v.date) {
      nextEditor.setError('ต้องเลือกวันนัดครั้งถัดไปก่อนบันทึก');
      return;
    }
    if (v.date < hivStiTodayIso()) {
      nextEditor.setError('ไม่สามารถนัดย้อนหลังได้ — โปรดเลือกวันที่ตั้งแต่วันนี้เป็นต้นไป');
      return;
    }
    saveNextFollowUp(hn, { date: v.date, type: v.type });
    nextEditor.close();
    bump();
  };

  const commitCancelNext = () => {
    clearNextFollowUp(hn);
    setNextCancelOpen(false);
    bump();
  };

  /* ── บันทึกการติดตามผู้ผิดนัด (บันทึก / แก้ไข / ยกเลิก) ──────────── */

  const openContactEditor = (entry) => contactEditor.openWith(
    entry
      ? { id: entry.id, channel: entry.channel || '', note: entry.note || '' }
      : { ...EMPTY_CONTACT },
  );

  const submitContact = () => {
    const v = contactEditor.value;
    if (!v.channel) {
      contactEditor.setError('ต้องเลือกช่องทางการติดตามก่อนบันทึก');
      return;
    }
    if ((v.note || '').trim().length < 3) {
      contactEditor.setError('ต้องบันทึกผลการติดตามอย่างน้อย 3 ตัวอักษร');
      return;
    }
    if (v.id) updateHivStiFollowUpContact(hn, v.id, { channel: v.channel, note: v.note });
    else saveHivStiFollowUpContact(hn, { channel: v.channel, note: v.note });
    contactEditor.close();
    bump();
  };

  const commitCancelContact = () => {
    cancelHivStiFollowUpContact(hn, contactCancelTarget.id, contactCancelReason);
    setContactCancelTarget(null);
    setContactCancelReason('');
    bump();
  };

  /* ── Summary cards ──────────────────────────────────────────────── */

  const summaryCards = useMemo(() => {
    if (!hn) {
      return [
        { key: 'active', label: 'กำลังติดตาม', value: allRows.length, color: 'info', icon: 'monitoring' },
        { key: 'due', label: 'ครบกำหนดวันนี้', value: allRows.filter((r) => r.status === 'due').length, color: 'inprogress', icon: 'schedule' },
        { key: 'missed', label: 'ผิดนัด', value: allRows.filter((r) => r.status === 'missed').length, color: 'destructive', icon: 'event_busy' },
        { key: 'pep', label: 'PEP ที่ยังไม่สรุปผล', value: allRows.filter((r) => r.pepPending).length, color: 'positive', icon: 'pill' },
      ];
    }
    return [
      { key: 'labs', label: 'ครั้งที่ตรวจในช่วง', value: labRows.length, color: 'info', icon: 'biotech' },
      { key: 'cd4', label: 'CD4 ล่าสุด (cells/mm³)', value: latestCd4 ? latestCd4.value : '—', color: 'brand', icon: 'water_drop' },
      {
        key: 'vl',
        label: 'Viral load ล่าสุด (copies/mL)',
        value: latestVl ? (isHivStiUndetectable(latestVl.raw) ? 'Undetectable' : latestVl.value.toLocaleString('en-US')) : '—',
        color: 'positive',
        icon: 'genetics',
      },
      { key: 'status', label: 'สถานะนัดปัจจุบัน', value: HIV_STI_FOLLOWUP_STATUS[current?.status]?.label || '—', color: 'inprogress', icon: 'event_available' },
    ];
  }, [hn, allRows, labRows, latestCd4, latestVl, current]);

  /* ── Worklist columns ───────────────────────────────────────────── */

  const worklistColumns = useMemo(() => ([
    { key: 'hn', label: 'HN', width: 96 },
    {
      key: 'client',
      label: 'ผู้รับบริการ (UIC)',
      flex: true,
      minWidth: 210,
      render: (row) => (
        <div className='flex flex-col min-w-0'>
          <span
            className='truncate'
            style={{ fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default, #363B3F)' }}
          >
            {row.uic}
          </span>
          <MaskedPii
            hn={row.hn}
            masked={maskHivStiName(row.name)}
            full={row.name}
            fieldLabel='ชื่อ-นามสกุล ของผู้รับบริการ'
          />
        </div>
      ),
    },
    {
      key: 'track',
      label: 'ประเภทการติดตาม',
      width: 170,
      render: (row) => (
        <ColorfulBadge style={HIV_STI_TRACK_BADGE[row.track] || 'grey'} size='small' hierarchy='secondary'>
          {HIV_STI_TRACK_LABELS[row.track] || row.track}
        </ColorfulBadge>
      ),
    },
    {
      key: 'nextDate',
      label: 'นัดครั้งถัดไป',
      width: 190,
      render: (row) => (
        <div className='flex flex-col'>
          <span>{formatHivStiDate(row.nextDate)}</span>
          <StampLine>{appointmentTypeLabel(row.nextType)}</StampLine>
        </div>
      ),
    },
    {
      key: 'overdueDays',
      label: 'เกินกำหนด',
      width: 110,
      render: (row) => (row.overdueDays > 0
        ? <ColorfulBadge style='red' size='small' hierarchy='secondary'>{`${row.overdueDays} วัน`}</ColorfulBadge>
        : '—'),
    },
    {
      key: 'status',
      label: 'สถานะ',
      width: 150,
      render: (row) => {
        const badge = HIV_STI_FOLLOWUP_STATUS[row.status] || HIV_STI_FOLLOWUP_STATUS.onSchedule;
        return (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <ColorfulBadge style={badge.style} size='small' hierarchy='secondary'>{badge.label}</ColorfulBadge>
            {row.cancelledRegistry && (
              <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ยกเลิกทะเบียนแล้ว</ColorfulBadge>
            )}
          </div>
        );
      },
    },
    {
      key: 'pep',
      label: 'ผล PEP 28 วัน',
      width: 160,
      sortable: false,
      render: (row) => {
        if (!row.pep) return '—';
        if (!row.pepOutcome) return <ColorfulBadge style='yellow' size='small' hierarchy='secondary'>ยังไม่สรุปผล</ColorfulBadge>;
        return (
          <ColorfulBadge style={row.pepOutcome.completed ? 'green' : 'red'} size='small' hierarchy='secondary'>
            {row.pepOutcome.completed ? 'กินยาครบ 28 วัน' : 'กินยาไม่ครบ'}
          </ColorfulBadge>
        );
      },
    },
    {
      key: 'actions',
      label: 'การดำเนินการ',
      width: 170,
      sortable: false,
      render: (row) => (
        <BrandSubdueButton
          variant='outline'
          size='sm'
          leadingIcon='monitoring'
          onClick={(e) => { e.stopPropagation(); openDetail(row); }}
        >
          เปิดการติดตาม
        </BrandSubdueButton>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [tick]);

  /* ── Lab / drug / visit tables ──────────────────────────────────── */

  const labTotalPages = Math.max(1, Math.ceil(labRows.length / LAB_PAGE_SIZE));
  useEffect(() => {
    if (labPage > labTotalPages) setLabPage(labTotalPages);
  }, [labPage, labTotalPages]);
  const labPageRows = labRows
    .slice((labPage - 1) * LAB_PAGE_SIZE, labPage * LAB_PAGE_SIZE)
    .map((r, i) => ({ ...r, _rowKey: `${r.dateIso}-${(labPage - 1) * LAB_PAGE_SIZE + i}` }));

  const drugTotalPages = Math.max(1, Math.ceil(drugRows.length / DRUG_PAGE_SIZE));
  useEffect(() => {
    if (drugPage > drugTotalPages) setDrugPage(drugTotalPages);
  }, [drugPage, drugTotalPages]);
  const drugPageRows = drugRows
    .slice((drugPage - 1) * DRUG_PAGE_SIZE, drugPage * DRUG_PAGE_SIZE)
    .map((r, i) => ({ ...r, _rowKey: `${r.prescriptionNo}-${(drugPage - 1) * DRUG_PAGE_SIZE + i}` }));

  const renderLabValue = (raw, { undetectable = false } = {}) => {
    if (isHivStiPending(raw)) {
      return <ColorfulBadge style='grey' size='small' hierarchy='secondary'>รอผล</ColorfulBadge>;
    }
    if (raw == null || raw === '' || raw === '—') return '—';
    if (undetectable && isHivStiUndetectable(raw)) {
      return (
        <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span>{raw}</span>
          <ColorfulBadge style='green' size='small' hierarchy='secondary'>{`Undetectable (<${HIV_STI_VL_LOD})`}</ColorfulBadge>
        </span>
      );
    }
    return raw;
  };

  const labColumns = useMemo(() => ([
    { key: 'date', label: 'วันที่รายงานผล', width: 150, render: (r) => formatHivStiDate(r.dateIso) },
    { key: 'cd4', label: 'CD4 (cells/mm³)', width: 150, render: (r) => renderLabValue(r.cd4) },
    { key: 'viralLoad', label: 'Viral load (copies/mL)', width: 250, render: (r) => renderLabValue(r.viralLoad, { undetectable: true }) },
    { key: 'vdrl', label: 'VDRL / RPR', width: 160, render: (r) => renderLabValue(r.vdrl) },
    { key: 'note', label: 'หมายเหตุ', flex: true, minWidth: 200, render: (r) => r.note || '—' },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), []);

  const drugColumns = useMemo(() => ([
    { key: 'date', label: 'วันที่ - เวลา', width: 180, render: (r) => `${formatHivStiDate(r.dateIso)} · ${r.time} น.` },
    {
      key: 'drug',
      label: 'รายการยา',
      flex: true,
      minWidth: 230,
      render: (r) => (
        <div className='flex flex-col'>
          <span>{r.drug}</span>
          <StampLine>{r.category}</StampLine>
        </div>
      ),
    },
    { key: 'quantity', label: 'จำนวน', width: 110 },
    { key: 'prescriptionNo', label: 'เลขที่ใบสั่งยา', width: 160 },
    { key: 'usage', label: 'วิธีใช้', flex: true, minWidth: 220 },
  ]), []);

  const xrayColumns = useMemo(() => ([
    { key: 'date', label: 'วันที่ตรวจ', width: 150, render: (r) => formatHivStiDate(r.dateIso) },
    { key: 'exam', label: 'รายการตรวจ', flex: true, minWidth: 200 },
    { key: 'result', label: 'ผลการตรวจ', flex: true, minWidth: 260 },
  ]), []);

  const visitColumns = useMemo(() => ([
    { key: 'date', label: 'วันที่รับบริการ', width: 150, render: (v) => v.date || formatHivStiDate(v.dateIso) },
    { key: 'clinic', label: 'คลินิก', width: 140, render: () => 'คลินิกเวชกรรม' },
    { key: 'chiefComplaint', label: 'อาการสำคัญ', flex: true, minWidth: 180, render: (v) => v.chiefComplaint || '—' },
    { key: 'summary', label: 'สรุปการรักษา', flex: true, minWidth: 240, render: (v) => v.summary || '—' },
    { key: 'doctor', label: 'แพทย์ผู้ตรวจ', flex: true, minWidth: 150, render: (v) => v.doctor || '—' },
    {
      key: 'detail',
      label: '',
      width: 130,
      sortable: false,
      render: (v) => (
        <NeutralSubdueButton size='sm' leadingIcon='visibility' onClick={(e) => { e.stopPropagation(); setDetailVisit(v); }}>
          รายละเอียด
        </NeutralSubdueButton>
      ),
    },
  ]), []);

  const timelineVitals = (v) => [
    v.bp ? { label: 'ความดันโลหิต', value: `${v.bp} mmHg` } : null,
    v.pulse ? { label: 'ชีพจร', value: `${v.pulse} /นาที` } : null,
    v.temp ? { label: 'อุณหภูมิ', value: `${v.temp} °C` } : null,
    v.weight ? { label: 'น้ำหนัก', value: `${v.weight} กก.` } : null,
  ].filter(Boolean);

  /* ── Chart plot (one metric per plot — never a shared axis) ──────── */

  const renderPlot = ({ label, unit, color, points, undetectableHint }) => (
    <div
      className='flex flex-col w-full'
      style={{
        gap: 'var(--dim-space-200, 8px)',
        paddingTop: 'var(--dim-space-400, 16px)',
        paddingBottom: 'var(--dim-space-400, 16px)',
        paddingLeft: 'var(--dim-space-400, 16px)',
        paddingRight: 'var(--dim-space-400, 16px)',
        borderRadius: 'var(--dim-radius-300, 10px)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #EEF0F1)',
        background: 'var(--surface-chart-area, #FEFEFE)',
      }}
    >
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <span
          aria-hidden='true'
          style={{
            width: 'var(--dim-space-200, 8px)',
            height: 'var(--dim-space-200, 8px)',
            borderRadius: 'var(--dim-radius-full, 9999px)',
            background: color,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default, #363B3F)' }}>
          {label}
        </span>
        <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-chart-axis-label, #A3ACB4)' }}>
          {unit}
        </span>
      </div>
      {points.length >= 2 ? (
        <LineChart
          months={points.map((p) => shortThaiDate(p.dateIso))}
          series={[{ label, color, values: points.map((p) => p.value) }]}
          height={160}
        />
      ) : (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)', paddingTop: 'var(--dim-space-400, 16px)', paddingBottom: 'var(--dim-space-400, 16px)' }}>
          <span
            aria-hidden='true'
            style={{
              width: 'var(--dim-space-300, 12px)',
              height: 'var(--dim-space-300, 12px)',
              borderRadius: 'var(--dim-radius-full, 9999px)',
              background: color,
              flexShrink: 0,
            }}
          />
          <div className='flex flex-col'>
            <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-default, #363B3F)' }}>
              {`${points[0].value.toLocaleString('en-US')} · ${formatHivStiDate(points[0].dateIso)}`}
            </span>
            <StampLine>มีผลตรวจครั้งเดียวในช่วงนี้ — ต้องมีอย่างน้อย 2 ครั้งจึงแสดงเป็นเส้นแนวโน้ม</StampLine>
          </div>
        </div>
      )}
      {undetectableHint && (
        <StampLine>{`ค่าที่ต่ำกว่า ${HIV_STI_VL_LOD} copies/mL รายงานเป็น Undetectable — พล็อตไว้ใกล้ศูนย์เพื่อดูแนวโน้ม ไม่ได้แปลว่าไม่มีไวรัสเป็นศูนย์`}</StampLine>
      )}
    </div>
  );

  /* ── Header actions ─────────────────────────────────────────────── */

  const headerActions = hn ? (
    <div className='flex items-center flex-wrap mih-hivsti-noprint' style={{ gap: 'var(--dim-space-200, 8px)' }}>
      <NeutralSubdueButton leadingIcon='swap_horiz' onClick={backToWorklist}>
        เปลี่ยนผู้รับบริการ
      </NeutralSubdueButton>
      <NeutralSubdueButton leadingIcon='assignment' onClick={() => history.push({ pathname: RECORD_PATH, state: { hn } })}>
        เปิดบันทึกการรักษา
      </NeutralSubdueButton>
      <BrandSubdueButton variant='outline' leadingIcon='print' onClick={() => window.print()}>
        พิมพ์รายงานการติดตาม
      </BrandSubdueButton>
    </div>
  ) : (
    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
      <NeutralSubdueButton leadingIcon='badge' onClick={() => history.push(REGISTRY_PATH)}>
        ทะเบียนผู้รับบริการ
      </NeutralSubdueButton>
    </div>
  );

  const worklistEmpty = allRows.length === 0;
  const filterEmpty = !worklistEmpty && filteredRows.length === 0;
  const unknownClient = !!hn && !current;

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title={hn
        ? `ติดตามการดูแล — ${current?.uic || registration?.uic || `HN ${hn}`}`
        : 'การติดตามการดูแลผู้รับบริการ HIV/STI'}
      onBack={hn ? backToWorklist : () => history.push(QUEUE_PATH)}
      backLabel={hn ? 'กลับรายการติดตาม' : 'กลับหน้าคิว'}
      actions={headerActions}
      summaryCards={summaryCards}
      tabs={hn ? undefined : tabs}
      activeTab={activeTab}
      onTabChange={(key) => { setActiveTab(key); setPage(1); }}
    >
      <HivStiConfidentialGate>
        {/* ── Neutral print header (§1.4.2 — no clinic name, no results) ── */}
        <div
          className='mih-hivsti-print-head'
          style={{
            paddingTop: 'var(--dim-space-400, 16px)',
            paddingLeft: 'var(--dim-space-600, 24px)',
            paddingRight: 'var(--dim-space-600, 24px)',
          }}
        >
          <span style={{ fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default, #363B3F)' }}>
            รายงานการติดตามการดูแล · คลินิกเวชกรรม
          </span>
        </div>

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
          {readOnlyRole && (
            <ReadOnlyBanner>
              บัญชีของคุณไม่มีสิทธิบันทึกข้อมูลคลินิก HIV/STI — ดูข้อมูลการติดตามและพิมพ์รายงานได้ แต่บันทึกผลไม่ได้
            </ReadOnlyBanner>
          )}

          {!hn ? (
            /* ══ State A — worklist ═══════════════════════════════════ */
            <SectionCard>
              <SectionHeader icon='monitoring'>ผู้รับบริการในระบบติดตามการดูแล</SectionHeader>

              <div className='w-full flex items-start justify-center mih-hivsti-noprint'>
                <PrimarySearch
                  value={searchQ}
                  onChange={(v) => { setSearchQ(v); setPage(1); }}
                  onSubmit={(label, item) => {
                    const match = resolveSearchRow(label, item);
                    if (match) openDetail(match);
                    else setSearchQ(label);
                  }}
                  suggestions={searchSuggestions}
                  history={searchHistory}
                  onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
                  placeholder='ค้นหา HN / UIC / ชื่อ-สกุล / ประเภทการติดตาม'
                  width={640}
                />
              </div>

              <div className='flex items-center flex-wrap mih-hivsti-noprint' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <FilterTag
                  value='ทั้งหมด'
                  selected={trackFilter === 'all' && activeTab === 'all' && !searchQ.trim()}
                  onClick={clearAllFilters}
                />
                <FilterDropdown
                  prefix='ประเภทการติดตาม:'
                  options={TRACK_FILTER_OPTIONS}
                  value={trackFilter}
                  onChange={(v) => { setTrackFilter(v); setPage(1); }}
                />
              </div>

              {worklistEmpty ? (
                <div
                  className='flex flex-col items-center text-center w-full'
                  style={{
                    paddingTop: 'var(--dim-space-800, 32px)',
                    paddingBottom: 'var(--dim-space-800, 32px)',
                    gap: 'var(--dim-space-300, 12px)',
                  }}
                >
                  <Icon name='monitoring' size={40} style={{ color: 'var(--text-content-quaternary, #ADB2B7)' }} />
                  <span style={{ fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default, #363B3F)' }}>
                    ยังไม่มีผู้รับบริการในระบบติดตามการดูแล
                  </span>
                  <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
                    ผู้รับบริการจะเข้าสู่ระบบติดตามอัตโนมัติเมื่อมีการสั่งยา ARV/PEP/PrEP หรือมีนัดติดตามผลจากบันทึกการรักษา
                  </span>
                  <div className='flex items-center flex-wrap mih-hivsti-noprint' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    <BrandSubdueButton variant='fill' size='sm' leadingIcon='badge' onClick={() => history.push(REGISTRY_PATH)}>
                      ไปหน้าทะเบียนผู้รับบริการ
                    </BrandSubdueButton>
                    <NeutralSubdueButton size='sm' leadingIcon='group' onClick={() => history.push(QUEUE_PATH)}>
                      ไปหน้าคิวการรักษา
                    </NeutralSubdueButton>
                  </div>
                </div>
              ) : filterEmpty ? (
                <div
                  className='flex flex-col items-center text-center w-full'
                  style={{
                    paddingTop: 'var(--dim-space-800, 32px)',
                    paddingBottom: 'var(--dim-space-800, 32px)',
                    gap: 'var(--dim-space-300, 12px)',
                  }}
                >
                  <Icon name='search_off' size={40} style={{ color: 'var(--text-content-quaternary, #ADB2B7)' }} />
                  <span style={{ fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default, #363B3F)' }}>
                    ไม่พบผู้รับบริการ
                  </span>
                  <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
                    ไม่พบรายการที่ตรงกับคำค้นหรือตัวกรองปัจจุบัน
                  </span>
                  <NeutralSubdueButton variant='outline' size='sm' onClick={clearAllFilters}>
                    ล้างตัวกรอง
                  </NeutralSubdueButton>
                </div>
              ) : (
                <>
                  <Table
                    columns={worklistColumns}
                    rows={pageRows}
                    rowKey={(row) => row.hn}
                    onRowClick={openDetail}
                    emptyMessage='ไม่พบรายการ'
                  />
                  <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    <span style={{ color: 'var(--text-content-secondary, #636B72)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)' }}>
                      {`แสดง ${rangeStart}–${rangeEnd} จาก ${filteredRows.length} รายการ`}
                    </span>
                    <div className='flex-1' />
                    <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
                  </div>
                </>
              )}
            </SectionCard>
          ) : unknownClient ? (
            /* ══ Edge — HN ไม่อยู่ในระบบติดตาม (ห้าม fallback เงียบ ๆ) ══ */
            <SectionCard>
              <SectionHeader icon='person_search'>ไม่พบข้อมูลการติดตาม</SectionHeader>
              <NoticeBand tone='warning' icon='warning'>
                {`ยังไม่มีข้อมูลติดตามของผู้รับบริการรายนี้ (HN ${hn}) — ตรวจสอบว่าขึ้นทะเบียนคลินิก HIV/STI แล้วหรือยัง`}
              </NoticeBand>
              <div className='flex items-center flex-wrap mih-hivsti-noprint' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <BrandSubdueButton variant='outline' size='sm' leadingIcon='badge' onClick={() => history.push(REGISTRY_PATH)}>
                  ไปหน้าทะเบียนผู้รับบริการ
                </BrandSubdueButton>
                <NeutralSubdueButton size='sm' leadingIcon='swap_horiz' onClick={backToWorklist}>
                  เลือกผู้รับบริการรายอื่น
                </NeutralSubdueButton>
              </div>
            </SectionCard>
          ) : (
            /* ══ State B — detail ═════════════════════════════════════ */
            <>
              {profile && (
                <PatientCard
                  patient={profile}
                  title={`การติดตามการดูแล — ${HIV_STI_TRACK_LABELS[current.track] || current.track}`}
                  onBack={backToWorklist}
                  tags={(
                    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                      <ColorfulBadge style={HIV_STI_TRACK_BADGE[current.track] || 'grey'} size='small' hierarchy='secondary'>
                        {HIV_STI_TRACK_LABELS[current.track] || current.track}
                      </ColorfulBadge>
                      <ColorfulBadge
                        style={(HIV_STI_FOLLOWUP_STATUS[current.status] || HIV_STI_FOLLOWUP_STATUS.onSchedule).style}
                        size='small'
                        hierarchy='secondary'
                      >
                        {(HIV_STI_FOLLOWUP_STATUS[current.status] || HIV_STI_FOLLOWUP_STATUS.onSchedule).label}
                      </ColorfulBadge>
                      {cancellation && (
                        <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ยกเลิกทะเบียนแล้ว</ColorfulBadge>
                      )}
                    </div>
                  )}
                />
              )}

              {!profile && (
                <NoticeBand tone='warning' icon='warning'>
                  ไม่พบข้อมูลทั่วไปของผู้รับบริการในเวชระเบียนกลาง — แสดงเฉพาะข้อมูลระดับคลินิกเท่านั้น
                </NoticeBand>
              )}

              {cancellation && (
                <NoticeBand tone='warning' icon='block'>
                  {`ทะเบียนคลินิกของผู้รับบริการรายนี้ถูกยกเลิกแล้ว (${cancellation.reason} · ${cancellation.by} · ${cancellation.at}) — ข้อมูลด้านล่างเป็นข้อมูลย้อนหลัง และบันทึกนัดครั้งถัดไปไม่ได้`}
                </NoticeBand>
              )}

              {/* ── ช่วงเวลา ─────────────────────────────────────────── */}
              <SectionCard>
                <SectionHeader icon='calendar'>ช่วงเวลาที่ติดตาม</SectionHeader>
                <div className='flex items-center flex-wrap mih-hivsti-noprint' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  {RANGE_OPTIONS.map((opt) => (
                    <TabCapsule
                      key={opt.key}
                      variant='filter'
                      label={opt.label}
                      selected={rangeKey === opt.key}
                      onClick={() => setRangeKey(opt.key)}
                    />
                  ))}
                </div>
                {rangeKey === 'custom' && (
                  <div className='mih-hivsti-noprint' style={{ maxWidth: 480 }}>
                    <DatePickerRange
                      showLabel={false}
                      value={customRange}
                      onChange={setCustomRange}
                      format={isoFormat}
                      parse={isoParse}
                    />
                  </div>
                )}
                <StampLine>
                  {fromIso || toIso
                    ? `แสดงข้อมูล ${fromIso ? formatHivStiDate(fromIso) : 'ตั้งแต่ครั้งแรก'} – ${toIso ? formatHivStiDate(toIso) : 'ปัจจุบัน'} · พบผลตรวจ ${labRows.length} ครั้ง`
                    : `แสดงข้อมูลทั้งหมด · พบผลตรวจ ${labRows.length} ครั้ง`}
                </StampLine>
              </SectionCard>

              {/* ── 1. ผลตรวจร่างกาย / สัญญาณชีพ ─────────────────────── */}
              <SectionCard>
                <SectionHeader icon='monitor_heart'>ผลตรวจร่างกายและสัญญาณชีพ</SectionHeader>
                {vitalRows.length === 0 ? (
                  <EmptyRangeCard icon='monitor_heart'>
                    ยังไม่มีการตรวจร่างกายในช่วงเวลาที่เลือก — ปรับช่วงเวลา หรือบันทึกการตรวจรักษาครั้งใหม่จากหน้าคิว
                  </EmptyRangeCard>
                ) : vitalRows.length === 1 ? (
                  <>
                    <InfoPanel>
                      <span style={{ fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default, #363B3F)', fontSize: 'var(--type-size-sm, 14px)' }}>
                        {`ค่าล่าสุด ${formatHivStiDate(vitalRows[0].dateIso)} · ${timelineVitals(vitalRows[0]).map((v) => `${v.label} ${v.value}`).join(' · ')}`}
                      </span>
                      <StampLine>มีข้อมูลเพียง 1 ครั้งในช่วงเวลา — ยังไม่พอสำหรับดูแนวโน้ม</StampLine>
                    </InfoPanel>
                  </>
                ) : (
                  <div className='flex w-full overflow-x-auto' style={{ gap: 'var(--dim-space-300, 12px)', paddingBottom: 'var(--dim-space-200, 8px)' }}>
                    {vitalRows.map((v, idx) => (
                      <div key={`${v.dateIso}-${idx}`} className='shrink-0' style={{ width: 220 }}>
                        <VitalSignTimelineCard
                          time={formatHivStiDate(v.dateIso)}
                          date='ตรวจร่างกาย'
                          vitals={timelineVitals(v)}
                          selected={selectedVitalIdx === idx}
                          onClick={() => setSelectedVitalIdx(idx)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              {/* ── 2. ผล Lab ───────────────────────────────────────── */}
              <SectionCard>
                <SectionHeader icon='biotech'>ผลการตรวจทางห้องปฏิบัติการ (CD4 · Viral load · VDRL/RPR)</SectionHeader>
                {labRows.length === 0 ? (
                  <EmptyRangeCard icon='biotech'>
                    ยังไม่มีผลตรวจทางห้องปฏิบัติการในช่วงเวลาที่เลือก
                  </EmptyRangeCard>
                ) : (
                  <>
                    <Table
                      columns={labColumns}
                      rows={labPageRows}
                      rowKey={(r) => r._rowKey}
                      emptyMessage='ยังไม่มีผลตรวจในช่วงเวลาที่เลือก'
                    />
                    <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                      <span style={{ color: 'var(--text-content-secondary, #636B72)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)' }}>
                        {`แสดง ${(labPage - 1) * LAB_PAGE_SIZE + 1}–${Math.min(labPage * LAB_PAGE_SIZE, labRows.length)} จาก ${labRows.length} รายการ`}
                      </span>
                      <div className='flex-1' />
                      <Pagination currentPage={labPage} pageCount={labTotalPages} onPageChange={setLabPage} />
                    </div>

                    {pendingLabCount > 0 && (
                      <NoticeBand tone='info' icon='hourglass_empty'>
                        {`มีผลตรวจที่ยังรอผล ${pendingLabCount} รายการ — ไม่ถูกนับเป็นจุดในกราฟและไม่ถือเป็นผลล่าสุด`}
                      </NoticeBand>
                    )}

                    {/* Small multiples — CD4 กับ Viral load ต่างสเกลกันหลาย
                        order of magnitude จึงต้องแยกพล็อต ห้ามรวมแกน */}
                    {cd4Points.length === 0 && vlPoints.length === 0 ? (
                      <StampLine>ผู้รับบริการรายนี้ไม่มีผล CD4 / Viral load ในช่วงเวลาที่เลือก (เคส PrEP / STI) — แสดงเฉพาะตารางผลตรวจ</StampLine>
                    ) : (
                      <div className='grid grid-cols-1 xl:grid-cols-2 gap-4 w-full'>
                        {cd4Points.length > 0 && renderPlot({
                          label: 'CD4',
                          unit: 'cells/mm³',
                          color: CD4_COLOR,
                          points: cd4Points,
                        })}
                        {vlPoints.length > 0 && renderPlot({
                          label: 'Viral load',
                          unit: 'copies/mL',
                          color: VL_COLOR,
                          points: vlPoints,
                          undetectableHint: vlPoints.some((p) => isHivStiUndetectable(p.raw)),
                        })}
                      </div>
                    )}
                  </>
                )}
              </SectionCard>

              {/* ── 3. X-ray ────────────────────────────────────────── */}
              <SectionCard>
                <SectionHeader icon='radiology'>ผลการตรวจทางรังสีวินิจฉัย (X-ray)</SectionHeader>
                {xrayRows.length === 0 ? (
                  <EmptyRangeCard icon='radiology'>— ไม่เคยตรวจ X-ray ในช่วงเวลา</EmptyRangeCard>
                ) : (
                  <Table
                    columns={xrayColumns}
                    rows={xrayRows}
                    rowKey={(r) => `${r.dateIso}-${r.exam}`}
                    emptyMessage='— ไม่เคยตรวจ X-ray ในช่วงเวลา'
                  />
                )}
              </SectionCard>

              {/* ── 4. ยา ARV และการกินยาต่อเนื่อง ────────────────────── */}
              <SectionCard>
                <SectionHeader icon='medication'>ยาต้านไวรัสและการกินยาต่อเนื่อง</SectionHeader>
                <InfoPanel>
                  <span style={{ fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default, #363B3F)', fontSize: 'var(--type-size-sm, 14px)' }}>
                    {`สถานะรับยา ARV: ${resolveArvStatus(registration?.arvStatus)?.label || 'ยังไม่ระบุในทะเบียน'}`}
                  </span>
                  <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
                    {currentRegimen
                      ? `สูตรยาปัจจุบัน: ${currentRegimen.drug} · จ่ายล่าสุด ${formatHivStiDate(currentRegimen.dateIso)} · ${currentRegimen.usage}`
                      : 'ยังไม่มีประวัติการจ่ายยาต้านไวรัสของผู้รับบริการรายนี้'}
                  </span>
                </InfoPanel>
                {(registration?.arvStatus === 'none' || registration?.arvStatus === 'na') && drugRows.length === 0 ? (
                  <EmptyRangeCard icon='medication'>
                    {`ยังไม่เริ่มยา ARV (${resolveArvStatus(registration?.arvStatus)?.label || '—'}) — ยังไม่มีตารางการรับยาให้ติดตาม`}
                  </EmptyRangeCard>
                ) : drugRows.length === 0 ? (
                  <EmptyRangeCard icon='medication'>ไม่มีประวัติการได้รับยาในช่วงเวลาที่เลือก</EmptyRangeCard>
                ) : (
                  <>
                    <Table
                      columns={drugColumns}
                      rows={drugPageRows}
                      rowKey={(r) => r._rowKey}
                      emptyMessage='ไม่มีประวัติการได้รับยาในช่วงเวลาที่เลือก'
                    />
                    <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                      <span style={{ color: 'var(--text-content-secondary, #636B72)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)' }}>
                        {`แสดง ${(drugPage - 1) * DRUG_PAGE_SIZE + 1}–${Math.min(drugPage * DRUG_PAGE_SIZE, drugRows.length)} จาก ${drugRows.length} รายการ`}
                      </span>
                      <div className='flex-1' />
                      <Pagination currentPage={drugPage} pageCount={drugTotalPages} onPageChange={setDrugPage} />
                    </div>
                  </>
                )}
              </SectionCard>

              {/* ── 5. PEP / PrEP follow-up ─────────────────────────── */}
              <SectionCard>
                <SectionHeader icon='pill'>การติดตาม PEP / PrEP</SectionHeader>
                {!pepInfo ? (
                  <EmptyRangeCard icon='pill'>
                    {current.track === 'PrEP'
                      ? 'ผู้รับบริการอยู่ในระบบ PrEP — ติดตามผ่านนัดทุก 3 เดือนในหัวข้อการนัดต่อเนื่องด้านล่าง'
                      : 'ผู้รับบริการรายนี้ไม่ได้รับยา PEP — ไม่มีการติดตามครบ 28 วัน'}
                  </EmptyRangeCard>
                ) : (
                  <>
                    <InfoPanel>
                      <span style={{ fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default, #363B3F)', fontSize: 'var(--type-size-sm, 14px)' }}>
                        {`สูตรยา ${pepInfo.regimen} · เริ่มยา ${formatHivStiDate(pepInfo.startDate)}`}
                      </span>
                      <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
                        {`ขณะนี้เป็นวันที่ ${pepDay} ของการรับยา · ครบกำหนด 28 วันในวันที่ ${formatHivStiDate(pepDue)}`}
                      </span>
                    </InfoPanel>

                    {pepOutcome ? (
                      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                          <ColorfulBadge style={pepOutcome.completed ? 'green' : 'red'} size='small' hierarchy='secondary'>
                            {pepOutcome.completed ? 'กินยาครบ 28 วัน' : 'กินยาไม่ครบ 28 วัน'}
                          </ColorfulBadge>
                          {!pepOutcome.completed && pepOutcome.reason && (
                            <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-default, #363B3F)' }}>
                              {`เหตุผล: ${pepOutcome.reason}`}
                            </span>
                          )}
                        </div>
                        <StampLine>
                          {`บันทึกโดย ${pepOutcome.by} · ${pepOutcome.at}${pepOutcome.editedAt ? ` · แก้ไขล่าสุด ${pepOutcome.editedAt} โดย ${pepOutcome.editedBy}` : ''}`}
                        </StampLine>
                        {!readOnlyRole && (
                          <div className='flex items-center flex-wrap mih-hivsti-noprint' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                            <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={openPepEditor}>
                              แก้ไขผลการติดตาม
                            </BrandSubdueButton>
                            <NeutralSubdueButton size='sm' leadingIcon='block' onClick={() => setPepCancelOpen(true)}>
                              ยกเลิกผลที่บันทึกไว้
                            </NeutralSubdueButton>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                        <NoticeBand tone='warning' icon='warning'>
                          ยังไม่ได้สรุปผลการกินยา PEP ครบ 28 วันของผู้รับบริการรายนี้
                        </NoticeBand>
                        {!readOnlyRole && (
                          <div className='flex items-center flex-wrap mih-hivsti-noprint' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                            <BrandSubdueButton variant='fill' size='sm' leadingIcon='fact_check' onClick={openPepEditor}>
                              บันทึกผลการติดตาม PEP
                            </BrandSubdueButton>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </SectionCard>

              {/* ── 6. การนัดต่อเนื่อง + การติดตามผู้ผิดนัด ──────────── */}
              <SectionCard>
                <SectionHeader icon='event_available'>การนัดต่อเนื่องและการติดตาม</SectionHeader>
                <InfoPanel>
                  <span style={{ fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default, #363B3F)', fontSize: 'var(--type-size-sm, 14px)' }}>
                    {`นัดครั้งถัดไป ${formatHivStiDate(current.nextDate)} · ${appointmentTypeLabel(current.nextType)}`}
                  </span>
                  <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    <ColorfulBadge
                      style={(HIV_STI_FOLLOWUP_STATUS[current.status] || HIV_STI_FOLLOWUP_STATUS.onSchedule).style}
                      size='small'
                      hierarchy='secondary'
                    >
                      {(HIV_STI_FOLLOWUP_STATUS[current.status] || HIV_STI_FOLLOWUP_STATUS.onSchedule).label}
                    </ColorfulBadge>
                    {current.overdueDays > 0 && (
                      <ColorfulBadge style='red' size='small' hierarchy='secondary'>{`เกินกำหนด ${current.overdueDays} วัน`}</ColorfulBadge>
                    )}
                  </div>
                  {savedNext && (
                    <StampLine>
                      {`บันทึกนัดโดย ${savedNext.by} · ${savedNext.at}${savedNext.editedAt ? ` · แก้ไขล่าสุด ${savedNext.editedAt} โดย ${savedNext.editedBy}` : ''}`}
                    </StampLine>
                  )}
                </InfoPanel>

                {!readOnlyRole && (
                  cancellation ? (
                    <NoticeBand tone='warning' icon='block'>
                      ทะเบียนถูกยกเลิกแล้ว — บันทึกนัดครั้งถัดไปไม่ได้ ต้องเปิดใช้งานทะเบียนอีกครั้งจากหน้าทะเบียนผู้รับบริการ
                    </NoticeBand>
                  ) : (
                    <div className='flex items-center flex-wrap mih-hivsti-noprint' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                      <BrandSubdueButton
                        variant={savedNext ? 'outline' : 'fill'}
                        size='sm'
                        leadingIcon={savedNext ? 'edit_calendar' : 'event_available'}
                        onClick={openNextEditor}
                      >
                        {savedNext ? 'แก้ไขนัดครั้งถัดไป' : 'บันทึกนัดครั้งถัดไป'}
                      </BrandSubdueButton>
                      {savedNext && (
                        <NeutralSubdueButton size='sm' leadingIcon='event_busy' onClick={() => setNextCancelOpen(true)}>
                          ยกเลิกนัดที่บันทึกไว้
                        </NeutralSubdueButton>
                      )}
                    </div>
                  )
                )}

                {current.status === 'missed' && (
                  <NoticeBand tone='danger' icon='error'>
                    {`ผู้รับบริการผิดนัดมาแล้ว ${current.overdueDays} วัน — ต้องบันทึกการติดตาม (โทร / เยี่ยม / ช่องทางที่ยินยอมไว้)`}
                  </NoticeBand>
                )}

                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <SectionHeader icon='call'>บันทึกการติดตามผู้ผิดนัด</SectionHeader>
                  {!readOnlyRole && (
                    <div className='flex items-center flex-wrap mih-hivsti-noprint' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                      <BrandSubdueButton variant='outline' size='sm' leadingIcon='add' onClick={() => openContactEditor(null)}>
                        เพิ่มบันทึกการติดตาม
                      </BrandSubdueButton>
                    </div>
                  )}
                  {contacts.length === 0 ? (
                    <EmptyRangeCard icon='call'>ยังไม่มีบันทึกการติดตามของผู้รับบริการรายนี้</EmptyRangeCard>
                  ) : (
                    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                      {contacts.map((c) => (
                        <div
                          key={c.id}
                          className='flex items-start w-full flex-wrap'
                          style={{
                            gap: 'var(--dim-space-300, 12px)',
                            paddingTop: 'var(--dim-space-300, 12px)',
                            paddingBottom: 'var(--dim-space-300, 12px)',
                            paddingLeft: 'var(--dim-space-400, 16px)',
                            paddingRight: 'var(--dim-space-400, 16px)',
                            borderRadius: 'var(--dim-radius-300, 10px)',
                            border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default, #E7EAEC)',
                            background: 'var(--surface-card-100, #FFFFFF)',
                            opacity: c.cancelled ? 0.7 : 1,
                          }}
                        >
                          <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                              <ColorfulBadge style='blue' size='small' hierarchy='secondary'>
                                {resolveHivStiFollowUpChannel(c.channel)}
                              </ColorfulBadge>
                              {c.cancelled && (
                                <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ยกเลิกบันทึกแล้ว</ColorfulBadge>
                              )}
                            </div>
                            <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-default, #363B3F)' }}>
                              {c.note}
                            </span>
                            <StampLine>
                              {`บันทึกโดย ${c.by} · ${c.at}${c.editedAt ? ` · แก้ไขล่าสุด ${c.editedAt} โดย ${c.editedBy}` : ''}`}
                            </StampLine>
                            {c.cancelled && (
                              <StampLine>
                                {`ยกเลิกโดย ${c.cancelled.by} · ${c.cancelled.at} · เหตุผล ${c.cancelled.reason}`}
                              </StampLine>
                            )}
                          </div>
                          {!readOnlyRole && !c.cancelled && (
                            <div className='flex items-center flex-wrap mih-hivsti-noprint' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                              <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={() => openContactEditor(c)}>
                                แก้ไข
                              </BrandSubdueButton>
                              <NeutralSubdueButton size='sm' leadingIcon='block' onClick={() => { setContactCancelTarget(c); setContactCancelReason(''); }}>
                                ยกเลิก
                              </NeutralSubdueButton>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* ── 7. ประวัติการรักษาย้อนหลัง (คู่มือ §2.15) ───────────── */}
              <SectionCard>
                <SectionHeader icon='history'>ประวัติการรับบริการย้อนหลัง</SectionHeader>
                {visitHistory.length === 0 ? (
                  <EmptyRangeCard icon='history'>ยังไม่มีประวัติการรับบริการของผู้รับบริการรายนี้</EmptyRangeCard>
                ) : (
                  <Table
                    columns={visitColumns}
                    rows={visitHistory.map((v, i) => ({ ...v, _rowKey: `${v.date || v.dateIso || 'v'}-${i}` }))}
                    rowKey={(v) => v._rowKey}
                    onRowClick={(v) => setDetailVisit(v)}
                    emptyMessage='ยังไม่มีประวัติการรับบริการ'
                  />
                )}
                <StampLine>
                  ใบรายงานและใบนัดที่พิมพ์จากหน้านี้ใช้ข้อความกลาง "คลินิกเวชกรรม" และไม่พิมพ์ผลการตรวจ HIV ตามข้อกำหนดข้อมูลลับ §1.4.2
                </StampLine>
              </SectionCard>

              {/* ── Audit trail ผู้เข้าถึงโมดูล ─────────────────────────── */}
              <SectionCard>
                <SectionHeader icon='shield_person'>การเข้าถึงข้อมูลลับ (§1.4.2)</SectionHeader>
                <ConsentAuditBar
                  recordedBy={gateAudit?.by || 'ไม่ทราบผู้เข้าถึง'}
                  recordedAt={gateAudit?.at}
                  showFlag={false}
                />
              </SectionCard>
            </>
          )}
        </div>

        {/* ══ Popups ══════════════════════════════════════════════════ */}

        {/* บันทึก / แก้ไขผลการติดตาม PEP */}
        <Popup
          open={pepEditor.open}
          onClose={pepEditor.requestClose}
          title={pepOutcome ? 'แก้ไขผลการติดตาม PEP' : 'บันทึกผลการติดตาม PEP ครบ 28 วัน'}
          subtitle={pepInfo ? `${pepInfo.regimen} · เริ่มยา ${formatHivStiDate(pepInfo.startDate)} · ครบกำหนด ${formatHivStiDate(pepDue)}` : ''}
          size='large'
          tertiaryAction={{ label: 'ยกเลิก', onClick: pepEditor.requestClose }}
          secondaryAction={pepEditor.dirty ? { label: 'คืนค่าที่บันทึกไว้', onClick: pepEditor.revert } : undefined}
          primaryAction={{ label: 'บันทึกผล', onClick: submitPep }}
        >
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <Field label='ผลการกินยา PEP' required>
              <Select
                showLabel={false}
                searchable={false}
                size='lg'
                value={pepEditor.value.completed}
                onChange={(v) => { pepEditor.setValue((f) => ({ ...f, completed: v })); pepEditor.setError(''); }}
                options={[
                  { value: 'yes', label: 'กินยาครบ 28 วัน' },
                  { value: 'no', label: 'กินยาไม่ครบ 28 วัน' },
                ]}
                placeholder='เลือกผลการกินยา'
              />
            </Field>
            {pepEditor.value.completed === 'no' && (
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150, 6px)' }}>
                <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-default, #363B3F)' }}>
                  เหตุผลที่กินยาไม่ครบ 28 วัน
                  <span style={{ color: 'var(--text-input-require)' }}> *</span>
                </span>
                <SuggestibleTextarea
                  voice
                  value={pepEditor.value.reason}
                  onChange={(e) => { pepEditor.setValue((f) => ({ ...f, reason: e.target.value })); pepEditor.setError(''); }}
                  suggestions={PEP_INCOMPLETE_REASON_SUGGESTIONS}
                  minChars={3}
                  placeholder='ระบุเหตุผลที่ผู้รับบริการกินยาไม่ครบ 28 วัน'
                />
              </div>
            )}
            {pepEditor.error && <NoticeBand tone='danger' icon='error'>{pepEditor.error}</NoticeBand>}
          </div>
        </Popup>

        <UnsavedChangesPopup
          open={pepEditor.unsavedOpen}
          onClose={pepEditor.stay}
          onSave={() => { pepEditor.stay(); submitPep(); }}
          onDiscard={pepEditor.discard}
          title='ต้องการบันทึกผลการติดตาม PEP ที่กรอกไว้หรือไม่ ?'
          description='ผลที่ยังไม่บันทึกจะหายไป — เลือกบันทึกเพื่อยืนยันผล หรือทิ้งเพื่อกลับไปใช้ค่าที่บันทึกไว้ล่าสุด'
        />

        {/* ยืนยันก่อนบันทึกผล PEP */}
        <Popup
          open={!!pepConfirm}
          onClose={() => { const v = pepConfirm; setPepConfirm(null); if (v) pepEditor.openWith(v); }}
          title='ยืนยันผลการติดตาม PEP'
          subtitle={pepConfirm ? (pepConfirm.completed === 'yes' ? 'กินยาครบ 28 วัน' : 'กินยาไม่ครบ 28 วัน') : ''}
          tertiaryAction={{ label: 'กลับไปแก้ไข', onClick: () => { const v = pepConfirm; setPepConfirm(null); if (v) pepEditor.openWith(v); } }}
          primaryAction={{ label: 'ยืนยันบันทึก', onClick: commitPep }}
        >
          <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
            {pepConfirm?.completed === 'no' && pepConfirm?.reason
              ? `ระบบจะบันทึกว่ากินยาไม่ครบ 28 วัน พร้อมเหตุผล "${pepConfirm.reason}" และประทับชื่อผู้บันทึกกับเวลาไว้ในระบบ`
              : 'ระบบจะบันทึกผลการติดตามพร้อมประทับชื่อผู้บันทึกและเวลาไว้ในระบบ แก้ไขภายหลังได้'}
          </span>
        </Popup>

        {/* ยืนยันยกเลิกผล PEP */}
        <Popup
          open={pepCancelOpen}
          onClose={() => setPepCancelOpen(false)}
          title='ยกเลิกผลการติดตาม PEP'
          tertiaryAction={{ label: 'ไม่ยกเลิก', onClick: () => setPepCancelOpen(false) }}
          primaryAction={{ label: 'ยืนยันยกเลิกผล', onClick: () => { clearPepOutcome(hn); setPepCancelOpen(false); bump(); }, tone: 'danger' }}
        >
          <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
            ผลการติดตามที่บันทึกไว้จะถูกลบ และผู้รับบริการจะกลับไปอยู่ในสถานะ "ยังไม่สรุปผล PEP" — บันทึกใหม่ได้ภายหลัง
          </span>
        </Popup>

        {/* บันทึก / แก้ไขนัดครั้งถัดไป */}
        <Popup
          open={nextEditor.open}
          onClose={nextEditor.requestClose}
          title={savedNext ? 'แก้ไขนัดติดตามครั้งถัดไป' : 'บันทึกนัดติดตามครั้งถัดไป'}
          subtitle={current ? `${current.uic} · ${HIV_STI_TRACK_LABELS[current.track] || current.track}` : ''}
          size='large'
          tertiaryAction={{ label: 'ยกเลิก', onClick: nextEditor.requestClose }}
          secondaryAction={nextEditor.dirty ? { label: 'คืนค่าที่บันทึกไว้', onClick: nextEditor.revert } : undefined}
          primaryAction={{ label: 'บันทึกนัดหมาย', onClick: submitNext }}
        >
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <Field label='ประเภทการนัดหมาย' required>
                <Select
                  showLabel={false}
                  searchable={false}
                  size='lg'
                  value={nextEditor.value.type}
                  onChange={(v) => { nextEditor.setValue((f) => ({ ...f, type: v })); nextEditor.setError(''); }}
                  options={HIV_STI_APPOINTMENT_TYPES}
                  placeholder='เลือกประเภทการนัดหมาย'
                />
              </Field>
              <Field label='วันนัดครั้งถัดไป' required hint='เลือกวันที่ตั้งแต่วันนี้เป็นต้นไป'>
                <DatePicker
                  value={nextEditor.value.date ? isoParse(nextEditor.value.date) : null}
                  onChange={(d) => { nextEditor.setValue((f) => ({ ...f, date: isoFormat(d) })); nextEditor.setError(''); }}
                  placeholder='เลือกวันที่'
                  showLabel={false}
                />
              </Field>
            </div>
            {nextIsPast && (
              <NoticeBand tone='danger' icon='error'>
                วันที่ที่เลือกเป็นวันในอดีต — ไม่สามารถบันทึกนัดย้อนหลังได้
              </NoticeBand>
            )}
            {nextOutsidePepWindow && (
              <NoticeBand tone='warning' icon='warning'>
                {`วันนัดอยู่นอกกรอบ 28 วันของ PEP (ครบกำหนด ${formatHivStiDate(pepDue)}) — ตรวจสอบว่าเป็นนัดติดตามหลังจบคอร์สยาจริงหรือไม่`}
              </NoticeBand>
            )}
            {nextEditor.error && <NoticeBand tone='danger' icon='error'>{nextEditor.error}</NoticeBand>}
          </div>
        </Popup>

        <UnsavedChangesPopup
          open={nextEditor.unsavedOpen}
          onClose={nextEditor.stay}
          onSave={() => { nextEditor.stay(); submitNext(); }}
          onDiscard={nextEditor.discard}
          title='ต้องการบันทึกนัดครั้งถัดไปที่กรอกไว้หรือไม่ ?'
          description='นัดที่ยังไม่บันทึกจะหายไป — เลือกบันทึกเพื่อยืนยันนัด หรือทิ้งเพื่อกลับไปใช้ค่าที่บันทึกไว้ล่าสุด'
        />

        <Popup
          open={nextCancelOpen}
          onClose={() => setNextCancelOpen(false)}
          title='ยกเลิกนัดติดตามที่บันทึกไว้'
          tertiaryAction={{ label: 'ไม่ยกเลิก', onClick: () => setNextCancelOpen(false) }}
          primaryAction={{ label: 'ยืนยันยกเลิกนัด', onClick: commitCancelNext, tone: 'danger' }}
        >
          <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
            ระบบจะลบนัดที่บันทึกไว้ในหน้านี้ และกลับไปแสดงนัดเดิมของผู้รับบริการ — บันทึกนัดใหม่ได้ทันที
          </span>
        </Popup>

        {/* บันทึก / แก้ไขการติดตามผู้ผิดนัด */}
        <Popup
          open={contactEditor.open}
          onClose={contactEditor.requestClose}
          title={contactEditor.value.id ? 'แก้ไขบันทึกการติดตาม' : 'บันทึกการติดตามผู้รับบริการ'}
          subtitle={current ? `${current.uic} · ${HIV_STI_TRACK_LABELS[current.track] || current.track}` : ''}
          size='large'
          tertiaryAction={{ label: 'ยกเลิก', onClick: contactEditor.requestClose }}
          secondaryAction={contactEditor.dirty ? { label: 'คืนค่าที่บันทึกไว้', onClick: contactEditor.revert } : undefined}
          primaryAction={{ label: 'บันทึกการติดตาม', onClick: submitContact }}
        >
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <Field label='ช่องทางการติดตาม' required>
              <Select
                showLabel={false}
                searchable={false}
                size='lg'
                value={contactEditor.value.channel}
                onChange={(v) => { contactEditor.setValue((f) => ({ ...f, channel: v })); contactEditor.setError(''); }}
                options={HIV_STI_FOLLOWUP_CHANNELS}
                placeholder='เลือกช่องทางที่ใช้ติดตาม'
              />
            </Field>
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150, 6px)' }}>
              <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-default, #363B3F)' }}>
                ผลการติดตาม
                <span style={{ color: 'var(--text-input-require)' }}> *</span>
              </span>
              <SuggestibleTextarea
                voice
                value={contactEditor.value.note}
                onChange={(e) => { contactEditor.setValue((f) => ({ ...f, note: e.target.value })); contactEditor.setError(''); }}
                suggestions={HIV_STI_FOLLOWUP_CONTACT_SUGGESTIONS}
                minChars={3}
                placeholder='บันทึกผลการติดตาม เช่น ติดต่อได้/ไม่ได้ และการนัดหมายใหม่'
              />
            </div>
            {contactEditor.error && <NoticeBand tone='danger' icon='error'>{contactEditor.error}</NoticeBand>}
            <StampLine>
              ห้ามระบุผลการตรวจ HIV หรือชื่อคลินิกในช่องทางที่บุคคลอื่นเข้าถึงได้ (§1.4.2)
            </StampLine>
          </div>
        </Popup>

        <UnsavedChangesPopup
          open={contactEditor.unsavedOpen}
          onClose={contactEditor.stay}
          onSave={() => { contactEditor.stay(); submitContact(); }}
          onDiscard={contactEditor.discard}
          title='ต้องการบันทึกการติดตามที่กรอกไว้หรือไม่ ?'
          description='บันทึกที่ยังไม่ถูกจัดเก็บจะหายไป — เลือกบันทึกเพื่อจัดเก็บ หรือทิ้งเพื่อกลับไปใช้ค่าที่บันทึกไว้ล่าสุด'
        />

        <Popup
          open={!!contactCancelTarget}
          onClose={() => setContactCancelTarget(null)}
          title='ยกเลิกบันทึกการติดตาม'
          subtitle={contactCancelTarget ? resolveHivStiFollowUpChannel(contactCancelTarget.channel) : ''}
          tertiaryAction={{ label: 'ไม่ยกเลิก', onClick: () => setContactCancelTarget(null) }}
          primaryAction={{ label: 'ยืนยันยกเลิก', onClick: commitCancelContact, tone: 'danger' }}
        >
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
              บันทึกจะยังคงอยู่ในระบบแต่ถูกทำเครื่องหมายว่ายกเลิก พร้อมชื่อผู้ยกเลิกและเวลา (เก็บ audit trail)
            </span>
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150, 6px)' }}>
              <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-default, #363B3F)' }}>
                เหตุผลการยกเลิก
              </span>
              <SuggestibleTextarea
                voice
                value={contactCancelReason}
                onChange={(e) => setContactCancelReason(e.target.value)}
                suggestions={[
                  'บันทึกซ้ำกับรายการก่อนหน้า',
                  'บันทึกผิดผู้รับบริการ',
                  'ข้อมูลไม่ถูกต้อง — บันทึกใหม่แทน',
                ]}
                minChars={3}
                placeholder='ระบุเหตุผลที่ยกเลิกบันทึกนี้'
              />
            </div>
          </div>
        </Popup>

        {/* รายละเอียดการรับบริการรายครั้ง (คู่มือ §2.15) */}
        <Popup
          open={!!detailVisit}
          onClose={() => setDetailVisit(null)}
          size='large'
          title='รายละเอียดการรับบริการ'
          subtitle={detailVisit ? `${current?.uic || ''} · ${detailVisit.date || formatHivStiDate(detailVisit.dateIso)}` : ''}
          tertiaryAction={{ label: 'ปิด', onClick: () => setDetailVisit(null) }}
          secondaryAction={{ label: 'พิมพ์ (ข้อความกลาง)', onClick: () => window.print() }}
        >
          {detailVisit && (
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-default, #363B3F)' }}>
              <span><strong>คลินิก:</strong> คลินิกเวชกรรม (ข้อความกลาง §1.4.2)</span>
              <span><strong>อาการสำคัญ:</strong> {detailVisit.chiefComplaint || '—'}</span>
              <span><strong>สรุปการรักษา:</strong> {detailVisit.summary || '—'}</span>
              <span><strong>แพทย์ผู้ตรวจ:</strong> {detailVisit.doctor || '—'}</span>
              {detailVisit.recordedBy && (
                <StampLine>{`บันทึกโดย ${detailVisit.recordedBy} · ${detailVisit.recordedAt}`}</StampLine>
              )}
              <NoticeBand tone='info' icon='shield_person'>
                ผลการตรวจ HIV ของการรับบริการครั้งนี้ถูกซ่อนจากเอกสารที่พิมพ์ — เปิดดูได้จากบันทึกการรักษาภายในโมดูลเท่านั้น
              </NoticeBand>
            </div>
          )}
        </Popup>
      </HivStiConfidentialGate>
    </QueuePageShell>
  );
};

export default HivStiFollowUpPage;
