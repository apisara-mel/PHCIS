import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import useSearchHistory from '@/components/search/useSearchHistory';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import TabCapsule from '@/components/tab/TabCapsule';
import Popup from '@/components/popup/Popup';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import SelectableTag from '@/components/forms/SelectableTag';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Icon from '@/components/icons/Icon';
import DotCalendarLog from '@/pages/clinic/tb/DotCalendarLog';
import {
  TopicHeader, Field, Banner, ErrorNote, ReadOnlyBanner, EmptyPanel, RowAuditNote,
} from '@/pages/clinic/tb/tbShared';
import { getPatientByHN } from '@/data/patientProfiles';
import { TB_PATIENT_TYPES, TB_PATIENT_TYPE_BADGE, resolveTbPatientType } from '@/data/tbQueue';
import {
  TB_REGIMENS,
  TB_OUTCOMES,
  TB_DISEASE_SITES,
  TB_EP_SITES,
  TB_SMEAR_RESULTS,
  TB_CULTURE_RESULTS,
  TB_DOCTORS,
  resolveTbRegimen,
  resolveTbOutcome,
  resolveTbSmearResult,
  resolveTbCultureResult,
  formatTbDate,
  getTbRegistryRows,
  getTbRegistryByRegNo,
  isTbRegistryReadOnly,
  logTbRegistryView,
  registerTbPatient,
  updateTbRegistration,
  setTbCxr,
  cancelTbRegistration,
  closeTbRegistration,
  reopenTbRegistration,
  addTbRow,
  updateTbRow,
  cancelTbRow,
  setTbNextAppointment,
} from '@/data/tbRegistry';
import { getDotConfig, getDotLog, computeDotAdherence, resolveDotObserverType, DOT_FREQUENCIES } from '@/data/tbDotLog';
import {
  canEditTb,
  setTbClinicReadOnly,
  maskTbName,
  TB_CURRENT_USER,
  TB_CANCEL_REASON_SUGGESTIONS,
  TB_FOLLOWUP_TYPES,
  TB_FOLLOWUP_SUGGESTIONS,
  TB_CONTACT_RELATIONS,
  TB_DIAGNOSIS_SUGGESTIONS,
} from '@/data/tbVisits';

/* TbRegistryPage — ทะเบียนผู้รับบริการวัณโรค (TOR §1.10.4.6 + .1) ที่
   /clinic/tb/registry. รายการ + รายละเอียดครบวงจรแบบ NcdRegistryPage /
   HivStiRegistryPage แต่ popup รายละเอียดจำลอง "7 แท็บ" ของระบบเดิม
   (คู่มือระบบวัณโรค.pdf บทที่ 2): การวินิจฉัย/ตรวจรักษา · การรักษา ·
   ผลตรวจ LAB · การนัดหมาย · การเยี่ยมบ้าน/ติดตาม · ผู้สัมผัสโรค ·
   ประวัติการทำงาน.

   คำกริยา TOR ครบสี่ในทุกระดับ:
     • แสดง   — popup รายละเอียด (+ logTbRegistryView ลง audit ทุกครั้ง
                เพราะวัณโรคเป็นข้อมูลลับ §1.4.2)
     • บันทึก — ขึ้นทะเบียนใหม่ (registerTbPatient) + เพิ่มแถวย่อยทุกชุด
     • แก้ไข — หัวทะเบียน (updateTbRegistration / setTbCxr) + แถวย่อย
                (updateTbRow) พร้อม dirty-check ก่อนปิด popup
     • ยกเลิก — ทะเบียน (cancelTbRegistration) + แถวย่อย (cancelTbRow)
                บังคับเหตุผลทั้งคู่ · แถวที่ยกเลิกยังอยู่ในตารางแบบขีดฆ่า
   บวก ปิดทะเบียนด้วยผลการรักษา (closeTbRegistration) และเปิดอีกครั้ง
   (reopenTbRegistration) ซึ่งเป็นสิทธิเฉพาะ.

   store เป็น module state → ทุก mutation ต้อง bump `tick`. */

const breadcrumb = ['ระบบบันทึกการรักษา', 'คลินิกวัณโรค', 'ทะเบียนวัณโรค'];
const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:tb-registry';
const PAGE_SIZE = 10;

const FILTER_DEFAULTS = { fiscalYear: 'all', patientType: 'all', status: 'all', doctor: 'all' };

const STATUS_OPTIONS = [
  { value: 'all', label: 'ทุกสถานะ' },
  { value: 'active', label: 'กำลังรักษา' },
  { value: 'closed', label: 'ปิดทะเบียนแล้ว' },
  { value: 'cancelled', label: 'ยกเลิกทะเบียน' },
];

const SPUTUM_MONTHS = [
  'ก่อนเริ่มรักษา', 'เดือนที่ 1', 'เดือนที่ 2', 'เดือนที่ 3', 'เดือนที่ 4',
  'เดือนที่ 5', 'เดือนที่ 6', 'เดือนที่ 8', 'สิ้นสุดการรักษา',
];

const DST_ANSWERS = [
  { value: 'S', label: 'S — ไว (Susceptible)' },
  { value: 'R', label: 'R — ดื้อ (Resistant)' },
  { value: '', label: 'ไม่ได้ทดสอบ' },
];

const SCREENING_RESULTS = ['ปกติ', 'สงสัย — ส่ง CXR', 'พบเชื้อ', 'ยังไม่ได้คัดกรอง'];

const REGISTRY_TABS = [
  'การวินิจฉัย / ตรวจรักษา',
  'การรักษา',
  'ผลตรวจ LAB',
  'การนัดหมาย',
  'การติดตาม / เยี่ยมบ้าน',
  'ผู้สัมผัสโรค',
  'ประวัติการทำงาน',
];

/* ── แบบฟอร์มแถวย่อยของแต่ละชุดข้อมูล (แสดง/บันทึก/แก้ไข ใช้ตัวเดียวกัน) ── */
const ROW_FORMS = {
  sputum: {
    title: 'ผลตรวจเสมหะ (AFB smear)',
    fields: [
      { key: 'month', label: 'เดือนที่ตรวจ', type: 'select', required: true, options: SPUTUM_MONTHS.map((m) => ({ value: m, label: m })) },
      { key: 'specimenNo', label: 'สิ่งส่งตรวจครั้งที่', type: 'select', required: true, options: [1, 2, 3].map((n) => ({ value: n, label: `ครั้งที่ ${n}` })) },
      { key: 'date', label: 'วันที่เก็บสิ่งส่งตรวจ', type: 'date', required: true },
      { key: 'result', label: 'ผลตรวจ', type: 'select', required: true, options: TB_SMEAR_RESULTS },
      { key: 'labNo', label: 'Lab No.', type: 'text' },
      { key: 'note', label: 'สรุปผล / หมายเหตุ', type: 'text' },
    ],
  },
  regimen: {
    title: 'การจ่ายยาตามสูตร',
    fields: [
      { key: 'dispensedDate', label: 'วันที่จ่ายยา', type: 'date', required: true },
      { key: 'regimen', label: 'สูตรยา', type: 'select', required: true, options: TB_REGIMENS },
      { key: 'weightKg', label: 'น้ำหนัก (กก.)', type: 'number', required: true },
      { key: 'days', label: 'จำนวนวันที่จ่าย', type: 'number' },
      { key: 'phase', label: 'ระยะการรักษา', type: 'select', options: [
        { value: 'intensive', label: 'ระยะเข้มข้น (Intensive)' },
        { value: 'continuation', label: 'ระยะต่อเนื่อง (Continuation)' },
      ] },
      { key: 'complication', label: 'ภาวะแทรกซ้อนจากการใช้ยา', type: 'text', placeholder: 'เช่น คัน / ตามัว / ตัวเหลือง / ตาเหลือง / ปวดข้อ' },
      { key: 'note', label: 'วิธีใช้ยา / หมายเหตุ', type: 'text' },
    ],
  },
  culture: {
    title: 'ผลเพาะเชื้อ (Culture)',
    fields: [
      { key: 'specimen', label: 'สิ่งส่งตรวจ', type: 'text', required: true, placeholder: 'เช่น Sputum / Lymph node biopsy' },
      { key: 'sentDate', label: 'วันที่ส่งตรวจ', type: 'date', required: true },
      { key: 'result', label: 'ผล Culture', type: 'select', required: true, options: TB_CULTURE_RESULTS },
      { key: 'organism', label: 'เชื้อที่พบ', type: 'text' },
      { key: 'reportDate', label: 'วันที่รายงานผล', type: 'date' },
    ],
  },
  dst: {
    title: 'ผลทดสอบความไวต่อยา (DST)',
    fields: [
      { key: 'sentDate', label: 'วันที่ส่งตรวจ', type: 'date', required: true },
      { key: 'isoniazid', label: 'Isoniazid (H)', type: 'select', options: DST_ANSWERS },
      { key: 'rifampicin', label: 'Rifampicin (R)', type: 'select', options: DST_ANSWERS },
      { key: 'ethambutol', label: 'Ethambutol (E)', type: 'select', options: DST_ANSWERS },
      { key: 'streptomycin', label: 'Streptomycin (S)', type: 'select', options: DST_ANSWERS },
      { key: 'reportDate', label: 'วันที่รายงานผล', type: 'date' },
    ],
  },
  followUp: {
    title: 'การติดตาม / เยี่ยมบ้าน',
    fields: [
      { key: 'date', label: 'วันที่ติดตาม', type: 'date', required: true },
      { key: 'type', label: 'ประเภทการติดตาม', type: 'select', required: true, options: TB_FOLLOWUP_TYPES },
      { key: 'by', label: 'ผู้ติดตาม', type: 'text', required: true },
      { key: 'note', label: 'บันทึกการติดตาม', type: 'suggest', suggestions: TB_FOLLOWUP_SUGGESTIONS, required: true },
    ],
  },
  contact: {
    title: 'ผู้สัมผัสโรค',
    fields: [
      { key: 'name', label: 'ชื่อ-สกุลผู้สัมผัส', type: 'text', required: true },
      { key: 'relation', label: 'ความสัมพันธ์', type: 'select', required: true, options: TB_CONTACT_RELATIONS.map((r) => ({ value: r, label: r })) },
      { key: 'age', label: 'อายุ (ปี)', type: 'number' },
      { key: 'screeningResult', label: 'ผลการคัดกรอง', type: 'select', options: SCREENING_RESULTS.map((r) => ({ value: r, label: r })) },
      { key: 'screeningDate', label: 'วันที่คัดกรอง', type: 'date' },
    ],
  },
};

const isoFromDate = (d) => (d ? d.toISOString().slice(0, 10) : '');
const todayIso = () => new Date().toISOString().slice(0, 10);

const registryStatus = (r) => {
  if (r.cancelled) return { key: 'cancelled', label: 'ยกเลิกทะเบียน', badge: 'red' };
  if (r.closure) return { key: 'closed', label: `ปิดทะเบียน — ${resolveTbOutcome(r.closure.outcome)?.label || r.closure.outcome}`, badge: resolveTbOutcome(r.closure.outcome)?.badge || 'grey' };
  return { key: 'active', label: 'กำลังรักษา', badge: 'green' };
};

const KeyValue = ({ label, value }) => (
  <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)', minWidth: 150 }}>
    <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>{label}</span>
    <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-default, #363B3F)' }}>{value || '—'}</span>
  </div>
);

const cancelledCellStyle = (row) => (row.status === 'cancelled'
  ? { textDecoration: 'line-through', color: 'var(--text-content-quaternary, #ADB2B7)' }
  : undefined);

/* ── แบบฟอร์มแถวย่อย (บันทึก / แก้ไข) ─────────────────────────────── */

const RowFormPopup = ({ open, collection, mode, draft, setDraft, error, onClose, onSubmit }) => {
  const config = collection ? ROW_FORMS[collection] : null;
  if (!config) return null;
  const setField = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));
  return (
    <Popup
      open={open}
      onClose={onClose}
      size='large'
      title={`${mode === 'edit' ? 'แก้ไข' : 'บันทึก'}${config.title}`}
      subtitle={mode === 'edit' ? 'แก้ไขรายการเดิม — ระบบจะบันทึกผู้แก้ไขและเวลาไว้ในประวัติการทำงาน' : 'เพิ่มรายการใหม่ในทะเบียน'}
      tertiaryAction={{ label: 'ยกเลิก', onClick: onClose }}
      primaryAction={{ label: mode === 'edit' ? 'บันทึกการแก้ไข' : 'บันทึกรายการ', onClick: onSubmit }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
        <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          {config.fields.filter((f) => f.type !== 'suggest').map((f) => (
            <Field key={f.key} label={f.label} required={f.required}>
              {f.type === 'select' ? (
                <Select
                  showLabel={false}
                  showHelperText={false}
                  searchable={false}
                  size='lg'
                  value={draft[f.key] ?? ''}
                  onChange={setField(f.key)}
                  options={f.options}
                  placeholder={`เลือก${f.label}`}
                />
              ) : f.type === 'date' ? (
                <DatePicker
                  value={draft[f.key] ? new Date(draft[f.key]) : null}
                  onChange={(d) => setField(f.key)(isoFromDate(d))}
                  placeholder='เลือกวันที่'
                  showLabel={false}
                  showHelperText={false}
                />
              ) : (
                <InputField
                  value={draft[f.key] ?? ''}
                  onChange={setField(f.key)}
                  type={f.type === 'number' ? 'number' : 'text'}
                  placeholder={f.placeholder || f.label}
                  showLabel={false}
                  showHelperText={false}
                />
              )}
            </Field>
          ))}
        </div>
        {config.fields.filter((f) => f.type === 'suggest').map((f) => (
          <SuggestibleTextarea
            key={f.key}
            label={f.label}
            required={f.required}
            voice
            value={draft[f.key] ?? ''}
            onChange={(e) => setField(f.key)(e.target.value)}
            suggestions={f.suggestions}
            minChars={3}
            placeholder={f.placeholder || f.label}
          />
        ))}
        {error && <ErrorNote>{error}</ErrorNote>}
      </div>
    </Popup>
  );
};

const TbRegistryPage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();

  const [tick, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);
  const [rightsTick, setRightsTick] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const canEdit = useMemo(() => canEditTb(), [rightsTick]);

  const [searchQ, setSearchQ] = useState('');
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [page, setPage] = useState(1);

  const [viewId, setViewId] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  /* ขึ้นทะเบียนใหม่ */
  const [registerOpen, setRegisterOpen] = useState(false);
  const [regDraft, setRegDraft] = useState({});
  const [regBaseline, setRegBaseline] = useState({});
  const [regError, setRegError] = useState('');
  const [regDuplicate, setRegDuplicate] = useState(null);

  /* แก้ไขหัวทะเบียน */
  const [headerOpen, setHeaderOpen] = useState(false);
  const [headerDraft, setHeaderDraft] = useState({});
  const [headerBaseline, setHeaderBaseline] = useState({});
  const [headerError, setHeaderError] = useState('');

  /* แถวย่อย */
  const [rowPopup, setRowPopup] = useState(null); // { collection, mode, rowId }
  const [rowDraft, setRowDraft] = useState({});
  const [rowBaseline, setRowBaseline] = useState({});
  const [rowError, setRowError] = useState('');

  /* ยกเลิก (ทะเบียน / แถว) */
  const [cancelTarget, setCancelTarget] = useState(null); // { kind:'registry'|'row', collection?, rowId?, label }
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  /* ปิด / เปิดทะเบียนอีกครั้ง */
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeDraft, setCloseDraft] = useState({ outcome: '', date: todayIso(), note: '' });
  const [closeError, setCloseError] = useState('');
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenError, setReopenError] = useState('');

  /* นัดหมาย */
  const [apptOpen, setApptOpen] = useState(false);
  const [apptDraft, setApptDraft] = useState({ date: '', type: '' });
  const [apptError, setApptError] = useState('');

  /* dirty-check ร่วมของทุก popup ที่แก้ไขได้ */
  const [discardTarget, setDiscardTarget] = useState(null);

  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: [] });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => getTbRegistryRows().slice(), [tick]);
  const viewTarget = useMemo(
    () => rows.find((r) => r.id === viewId) || null,
    [rows, viewId],
  );
  const viewReadOnly = viewTarget ? isTbRegistryReadOnly(viewTarget) : false;
  const canMutate = canEdit && viewTarget && !viewReadOnly;

  const displayName = (r) => (canEdit ? r.name : maskTbName(r.name));

  /* Deep-link: มาจากปุ่ม "เปิดทะเบียน" หรือจากหน้าคัดกรองพร้อม prefill. */
  useEffect(() => {
    if (!navState) return;
    if (navState.regNo) {
      const record = getTbRegistryByRegNo(navState.regNo);
      if (record) openView(record);
    } else if (navState.prefill) {
      setRegDraft({
        hn: navState.prefill.hn || '',
        patientType: '',
        registeredDate: todayIso(),
        diseaseSite: '',
        epSite: '',
        regimen: '',
        doctor: '',
      });
      setRegBaseline({});
      setRegError('');
      setRegDuplicate(null);
      setRegisterOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navState]);

  /* ── แสดง (audit ทุกครั้งที่เปิดดู — ข้อมูลลับ §1.4.2) ─────────────── */
  const openView = (record) => {
    logTbRegistryView(record, TB_CURRENT_USER.name);
    setViewId(record.id);
    setActiveTab(0);
    bump();
  };

  /* ── กรอง / ค้นหา ──────────────────────────────────────────────── */

  const fiscalYearOptions = useMemo(() => ([
    { value: 'all', label: 'ทุกปีงบประมาณ' },
    ...Array.from(new Set(rows.map((r) => r.fiscalYear))).sort().reverse().map((y) => ({ value: y, label: `ปีงบ ${y}` })),
  ]), [rows]);

  const doctorOptions = useMemo(() => ([
    { value: 'all', label: 'ทุกคน' },
    ...TB_DOCTORS.map((d) => ({ value: d, label: d })),
  ]), []);

  const patientTypeOptions = useMemo(() => ([
    { value: 'all', label: 'ทุกประเภท' },
    ...TB_PATIENT_TYPES.map((t) => ({ value: t.value, label: t.label })),
  ]), []);

  const setFilter = (key) => (val) => { setFilters((f) => ({ ...f, [key]: val })); setPage(1); };
  const isAllDefault = filters.fiscalYear === 'all' && filters.patientType === 'all'
    && filters.status === 'all' && filters.doctor === 'all' && !searchQ.trim();
  const resetFilters = () => { setFilters(FILTER_DEFAULTS); setSearchQ(''); setPage(1); };

  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return rows.filter((r) => {
      if (filters.fiscalYear !== 'all' && r.fiscalYear !== filters.fiscalYear) return false;
      if (filters.patientType !== 'all' && r.patientType !== filters.patientType) return false;
      if (filters.doctor !== 'all' && r.doctor !== filters.doctor) return false;
      if (filters.status !== 'all' && registryStatus(r).key !== filters.status) return false;
      if (!q) return true;
      return [r.regNo, r.hn, r.name, r.doctor].some((f) => f && f.toLowerCase().includes(q));
    });
  }, [rows, filters, searchQ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filtered.length);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const summaryCards = useMemo(() => ([
    { key: 'active', label: 'กำลังรักษา', value: rows.filter((r) => registryStatus(r).key === 'active').length, color: 'info', icon: 'contract' },
    { key: 'mdr', label: 'ดื้อยาหลายขนาน (MDR)', value: rows.filter((r) => r.patientType === 'mdr' && !r.closure && !r.cancelled).length, color: 'destructive', icon: 'coronavirus' },
    { key: 'ep', label: 'วัณโรคนอกปอด (EP)', value: rows.filter((r) => r.diseaseSite === 'extrapulmonary' && !r.closure && !r.cancelled).length, color: 'inprogress', icon: 'humerus' },
    { key: 'closed', label: 'ปิดทะเบียนแล้ว', value: rows.filter((r) => !!r.closure).length, color: 'positive', icon: 'task_alt' },
    { key: 'cancelled', label: 'ยกเลิกทะเบียน', value: rows.filter((r) => !!r.cancelled).length, color: 'destructive', icon: 'block' },
  ]), [rows]);

  const searchSuggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    return rows
      .filter((r) => [r.regNo, r.hn, r.name, r.doctor].some((f) => f && f.toLowerCase().includes(q)))
      .slice(0, 8)
      .map((r) => ({
        id: r.id,
        label: displayName(r),
        sublabel: `${r.regNo} · ${r.doctor}`,
        value: displayName(r),
        badges: [{ label: r.regNo, tone: 'teal' }, { label: r.hn, tone: 'indigo' }],
        avatarSrc: getPatientByHN(r.hn)?.avatarUrl,
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQ, rows, canEdit]);

  /* ── บันทึก: ขึ้นทะเบียนใหม่ ────────────────────────────────────── */

  const openRegister = () => {
    const seed = {
      hn: '', patientType: '', registeredDate: todayIso(),
      diseaseSite: '', epSite: '', regimen: '', doctor: '',
    };
    setRegDraft(seed);
    setRegBaseline(seed);
    setRegError('');
    setRegDuplicate(null);
    setRegisterOpen(true);
  };

  const requestCloseRegister = () => {
    if (JSON.stringify(regDraft) !== JSON.stringify(regBaseline)) setDiscardTarget('register');
    else setRegisterOpen(false);
  };

  const submitRegister = () => {
    if (regDraft.diseaseSite === 'extrapulmonary' && !regDraft.epSite) {
      setRegError('เลือกชนิด "นอกปอด" แล้วต้องระบุตำแหน่งวัณโรคนอกปอดด้วย');
      return;
    }
    const result = registerTbPatient({ ...regDraft, by: TB_CURRENT_USER.name });
    if (!result.ok) {
      setRegError(result.error);
      setRegDuplicate(result.existing || null);
      return;
    }
    setRegisterOpen(false);
    setRegError('');
    setRegDuplicate(null);
    bump();
    openView(result.record);
  };

  /* ── แก้ไขหัวทะเบียน ───────────────────────────────────────────── */

  const openHeaderEdit = () => {
    if (!viewTarget) return;
    const seed = {
      patientType: viewTarget.patientType || '',
      diseaseSite: viewTarget.diseaseSite || '',
      epSite: viewTarget.epSite || '',
      registeredDate: viewTarget.registeredDate || '',
      treatmentStartDate: viewTarget.treatmentStartDate || '',
      doctor: viewTarget.doctor || '',
      priorTreatment: viewTarget.priorTreatment || '',
      cxrDate: viewTarget.cxr?.date || '',
      cxrResult: viewTarget.cxr?.result || '',
      cxrAbnormal: !!viewTarget.cxr?.abnormal,
    };
    setHeaderDraft(seed);
    setHeaderBaseline(seed);
    setHeaderError('');
    setHeaderOpen(true);
  };

  const requestCloseHeader = () => {
    if (JSON.stringify(headerDraft) !== JSON.stringify(headerBaseline)) setDiscardTarget('header');
    else setHeaderOpen(false);
  };

  const submitHeader = () => {
    if (!headerDraft.patientType || !headerDraft.diseaseSite || !headerDraft.registeredDate) {
      setHeaderError('ต้องระบุประเภทผู้ป่วย ชนิดวัณโรค และวันที่ขึ้นทะเบียนให้ครบ');
      return;
    }
    if (headerDraft.diseaseSite === 'extrapulmonary' && !headerDraft.epSite) {
      setHeaderError('ชนิด "นอกปอด" ต้องระบุตำแหน่งวัณโรคนอกปอด');
      return;
    }
    updateTbRegistration(viewTarget.id, {
      patientType: headerDraft.patientType,
      diseaseSite: headerDraft.diseaseSite,
      epSite: headerDraft.diseaseSite === 'extrapulmonary' ? headerDraft.epSite : '',
      registeredDate: headerDraft.registeredDate,
      treatmentStartDate: headerDraft.treatmentStartDate,
      doctor: headerDraft.doctor,
      priorTreatment: headerDraft.priorTreatment,
    }, TB_CURRENT_USER.name);
    if (headerDraft.cxrDate || headerDraft.cxrResult) {
      setTbCxr(viewTarget.id, {
        date: headerDraft.cxrDate,
        result: headerDraft.cxrResult,
        abnormal: headerDraft.cxrAbnormal,
      }, TB_CURRENT_USER.name);
    }
    setHeaderOpen(false);
    bump();
  };

  /* ── แถวย่อย: บันทึก / แก้ไข ───────────────────────────────────── */

  const openRowForm = (collection, row = null) => {
    const seed = {};
    ROW_FORMS[collection].fields.forEach((f) => { seed[f.key] = row?.[f.key] ?? ''; });
    setRowDraft(seed);
    setRowBaseline(seed);
    setRowError('');
    setRowPopup({ collection, mode: row ? 'edit' : 'create', rowId: row?.id || null });
  };

  const requestCloseRow = () => {
    if (JSON.stringify(rowDraft) !== JSON.stringify(rowBaseline)) setDiscardTarget('row');
    else setRowPopup(null);
  };

  const submitRow = () => {
    const config = ROW_FORMS[rowPopup.collection];
    const missing = config.fields
      .filter((f) => f.required)
      .filter((f) => rowDraft[f.key] === '' || rowDraft[f.key] == null);
    if (missing.length > 0) {
      setRowError(`ต้องระบุ ${missing.map((f) => f.label).join(' · ')} ให้ครบก่อนบันทึก`);
      return;
    }
    const ok = rowPopup.mode === 'edit'
      ? updateTbRow(viewTarget.id, rowPopup.collection, rowPopup.rowId, rowDraft, TB_CURRENT_USER.name)
      : !!addTbRow(viewTarget.id, rowPopup.collection, rowDraft, TB_CURRENT_USER.name);
    if (!ok) {
      setRowError('บันทึกไม่สำเร็จ — ทะเบียนนี้ถูกปิดหรือยกเลิกแล้ว');
      return;
    }
    setRowPopup(null);
    bump();
  };

  /* ── ยกเลิก (ทะเบียน / แถว) ────────────────────────────────────── */

  const openCancel = (target) => {
    setCancelReason('');
    setCancelError('');
    setCancelTarget(target);
  };

  const confirmCancel = () => {
    if (!cancelReason.trim()) {
      setCancelError('ต้องระบุเหตุผลการยกเลิกก่อนยืนยัน');
      return;
    }
    const ok = cancelTarget.kind === 'registry'
      ? cancelTbRegistration(viewTarget.id, cancelReason.trim(), TB_CURRENT_USER.name)
      : cancelTbRow(viewTarget.id, cancelTarget.collection, cancelTarget.rowId, cancelReason.trim(), TB_CURRENT_USER.name);
    if (!ok) {
      setCancelError('ยกเลิกไม่สำเร็จ — ทะเบียนนี้ถูกปิดหรือยกเลิกไปแล้ว');
      return;
    }
    setCancelTarget(null);
    bump();
  };

  /* ── ปิดทะเบียน / เปิดอีกครั้ง ─────────────────────────────────── */

  const confirmClose = () => {
    if (!closeDraft.outcome || !closeDraft.date) {
      setCloseError('ต้องเลือกผลการรักษาและวันที่ปิดทะเบียนให้ครบ');
      return;
    }
    closeTbRegistration(viewTarget.id, { ...closeDraft, by: TB_CURRENT_USER.name });
    setCloseOpen(false);
    bump();
  };

  const confirmReopen = () => {
    if (!reopenReason.trim()) {
      setReopenError('ต้องระบุเหตุผลการเปิดทะเบียนอีกครั้ง');
      return;
    }
    reopenTbRegistration(viewTarget.id, reopenReason.trim(), TB_CURRENT_USER.name);
    setReopenOpen(false);
    bump();
  };

  /* ── นัดหมาย ──────────────────────────────────────────────────── */

  const openAppt = () => {
    setApptDraft({ date: viewTarget?.nextAppointment?.date || '', type: viewTarget?.nextAppointment?.type || '' });
    setApptError('');
    setApptOpen(true);
  };

  const confirmAppt = () => {
    if (!apptDraft.date || !apptDraft.type.trim()) {
      setApptError('ต้องระบุวันที่นัดและรายละเอียดการนัดให้ครบ');
      return;
    }
    if (apptDraft.date < todayIso()) {
      setApptError('ไม่สามารถบันทึกนัดหมายย้อนหลังได้');
      return;
    }
    setTbNextAppointment(viewTarget.id, { date: apptDraft.date, type: apptDraft.type.trim() }, TB_CURRENT_USER.name);
    setApptOpen(false);
    bump();
  };

  /* ── ส่งออก Smart TB (CSV — legacy §2.4 parity) ────────────────── */

  const exportSmartTb = () => {
    const header = ['เลขทะเบียน', 'ปีงบ', 'HN', 'ประเภทผู้ป่วย', 'ชนิดวัณโรค', 'วันขึ้นทะเบียน', 'วันเริ่มยา', 'สูตรยา', 'แพทย์', 'สถานะ'];
    const lines = filtered.map((r) => ([
      r.regNo, r.fiscalYear, r.hn,
      resolveTbPatientType(r.patientType)?.label || '',
      TB_DISEASE_SITES.find((s) => s.value === r.diseaseSite)?.label || '',
      r.registeredDate, r.treatmentStartDate || '',
      resolveTbRegimen(r.regimen)?.label || '',
      r.doctor, registryStatus(r).label,
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')));
    const csv = `﻿${[header.join(','), ...lines].join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-tb-registry-${todayIso()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── ตารางรายการ ───────────────────────────────────────────────── */

  const columns = useMemo(() => ([
    { key: 'regNo', label: 'เลขที่ขึ้นทะเบียน' },
    { key: 'hn', label: 'HN' },
    { key: 'name', label: 'ชื่อ-นามสกุล', flex: true, minWidth: 170, render: (r) => displayName(r) },
    {
      key: 'patientType', label: 'ประเภทผู้ป่วย',
      render: (r) => {
        const t = resolveTbPatientType(r.patientType);
        return t ? (
          <ColorfulBadge style={TB_PATIENT_TYPE_BADGE[r.patientType] || 'grey'} size='small' hierarchy='secondary'>
            {t.label}
          </ColorfulBadge>
        ) : '—';
      },
    },
    {
      key: 'diseaseSite', label: 'ชนิดวัณโรค',
      render: (r) => (r.diseaseSite === 'extrapulmonary' ? `นอกปอด · ${r.epSite || '—'}` : 'ปอด'),
    },
    { key: 'registeredDate', label: 'วันขึ้นทะเบียน', render: (r) => formatTbDate(r.registeredDate) },
    { key: 'treatmentMonth', label: 'เดือนที่รักษา', render: (r) => (r.treatmentMonth != null ? `เดือนที่ ${r.treatmentMonth}` : '—') },
    { key: 'regimen', label: 'สูตรยา', flex: true, minWidth: 160, render: (r) => resolveTbRegimen(r.regimen)?.label || '—' },
    { key: 'doctor', label: 'แพทย์ผู้ดูแล', flex: true, minWidth: 150 },
    {
      key: 'status', label: 'สถานะ',
      render: (r) => {
        const s = registryStatus(r);
        return <ColorfulBadge style={s.badge} size='small' hierarchy='secondary' width='hug' maxWidth={180}>{s.label}</ColorfulBadge>;
      },
    },
    {
      key: 'actions', label: 'การดำเนินการ', sortable: false,
      render: (r) => (
        <BrandSubdueButton
          variant='outline'
          size='sm'
          leadingIcon='visibility'
          onClick={(e) => { e.stopPropagation(); openView(r); }}
        >
          ดูรายละเอียด
        </BrandSubdueButton>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [canEdit, rows]);

  /* ── แท็บรายละเอียด ───────────────────────────────────────────── */

  const dotConfig = viewTarget ? getDotConfig(viewTarget.id) : null;
  const dotLog = viewTarget ? getDotLog(viewTarget.id) : {};
  const adherence = useMemo(
    () => (viewTarget ? computeDotAdherence(viewTarget.id) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [viewTarget, tick],
  );

  const rowActions = (collection, row) => {
    if (!canMutate || row.status === 'cancelled') return null;
    return (
      <div className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
        <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={() => openRowForm(collection, row)}>
          แก้ไข
        </BrandSubdueButton>
        <NeutralSubdueButton
          size='sm'
          leadingIcon='block'
          onClick={() => openCancel({ kind: 'row', collection, rowId: row.id, label: ROW_FORMS[collection].title })}
        >
          ยกเลิก
        </NeutralSubdueButton>
      </div>
    );
  };

  const auditColumn = (collection) => ({
    key: 'audit', label: 'ผู้บันทึก / สถานะ', flex: true, minWidth: 260, sortable: false,
    render: (row) => (
      <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
        {row.status === 'cancelled' && (
          <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกแล้ว</ColorfulBadge>
        )}
        <RowAuditNote row={row} />
      </div>
    ),
  });

  const addRowButton = (collection, label) => (canMutate ? (
    <BrandSubdueButton variant='outline' size='sm' leadingIcon='add' onClick={() => openRowForm(collection)}>
      {label}
    </BrandSubdueButton>
  ) : null);

  const renderTab = () => {
    if (!viewTarget) return null;
    switch (activeTab) {
      /* (1) การวินิจฉัย / ตรวจรักษา */
      case 0:
        return (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600, 24px)' }}>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <TopicHeader
                icon='clipboard'
                trailing={canMutate ? (
                  <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={openHeaderEdit}>
                    แก้ไขหัวทะเบียน
                  </BrandSubdueButton>
                ) : null}
              >
                ข้อมูลการวินิจฉัย
              </TopicHeader>
              <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-600, 24px)' }}>
                <KeyValue label='ชนิดวัณโรค' value={TB_DISEASE_SITES.find((s) => s.value === viewTarget.diseaseSite)?.label} />
                <KeyValue label='ตำแหน่งนอกปอด' value={viewTarget.epSite} />
                <KeyValue label='ประวัติการรักษาเดิม' value={viewTarget.priorTreatment} />
              </div>
            </div>

            <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <TopicHeader icon='radiology'>การตรวจภาพรังสีทรวงอก (CXR)</TopicHeader>
              {viewTarget.cxr ? (
                <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-600, 24px)' }}>
                  <KeyValue label='วันที่ตรวจ' value={formatTbDate(viewTarget.cxr.date)} />
                  <KeyValue label='ผลอ่าน' value={viewTarget.cxr.result} />
                  <KeyValue label='สรุป' value={viewTarget.cxr.abnormal ? 'ผิดปกติ' : 'ปกติ'} />
                </div>
              ) : (
                <EmptyPanel icon='radiology' title='ยังไม่มีผลการตรวจ CXR' subtitle='บันทึกได้จากปุ่ม "แก้ไขหัวทะเบียน"' />
              )}
            </div>

            <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <TopicHeader icon='biotech' trailing={addRowButton('sputum', 'เพิ่มผลเสมหะ')}>
                ผลตรวจเสมหะ (AFB smear) รายเดือน
              </TopicHeader>
              {viewTarget.sputumRows.length === 0 ? (
                <EmptyPanel icon='biotech' title='ยังไม่มีผลตรวจเสมหะในทะเบียนนี้' />
              ) : (
                <Table
                  columns={[
                    { key: 'month', label: 'เดือนที่', render: (r) => <span style={cancelledCellStyle(r)}>{r.month}</span> },
                    { key: 'specimenNo', label: 'ครั้งที่', render: (r) => <span style={cancelledCellStyle(r)}>{r.specimenNo}</span> },
                    { key: 'date', label: 'วันที่เก็บ', render: (r) => <span style={cancelledCellStyle(r)}>{formatTbDate(r.date)}</span> },
                    {
                      key: 'result', label: 'ผลตรวจ', render: (r) => {
                        const res = resolveTbSmearResult(r.result);
                        return res ? <ColorfulBadge style={res.badge} size='small' hierarchy='secondary'>{res.label}</ColorfulBadge> : '—';
                      },
                    },
                    { key: 'labNo', label: 'Lab No.', render: (r) => r.labNo || '—' },
                    auditColumn('sputum'),
                    { key: 'actions', label: 'การดำเนินการ', sortable: false, render: (r) => rowActions('sputum', r) },
                  ]}
                  rows={viewTarget.sputumRows}
                  rowKey={(r) => r.id}
                  emptyMessage='ไม่พบผลตรวจเสมหะ'
                />
              )}
            </div>
          </div>
        );

      /* (2) การรักษา */
      case 1:
        return (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600, 24px)' }}>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <TopicHeader icon='how_to_reg'>ผู้กำกับการกินยา (DOT)</TopicHeader>
              {dotConfig ? (
                <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-600, 24px)' }}>
                  <KeyValue label='ความถี่' value={DOT_FREQUENCIES.find((f) => f.value === dotConfig.frequency)?.label} />
                  <KeyValue label='ประเภทผู้กำกับ' value={resolveDotObserverType(dotConfig.observerType)?.label} />
                  <KeyValue label='ผู้กำกับการกินยา' value={dotConfig.observerName} />
                  <KeyValue
                    label='ความสม่ำเสมอสะสม'
                    value={adherence ? `${adherence.percent}% (${adherence.taken}/${adherence.total} วัน · ขาด ${adherence.missed})` : 'ยังไม่มีข้อมูล'}
                  />
                </div>
              ) : (
                <Banner tone='warning' icon='warning'>
                  ทะเบียนนี้ยังไม่ได้กำหนดผู้กำกับการกินยา — ตั้งค่าได้จากขั้นตอนที่ 4 ของแบบบันทึกการตรวจ
                </Banner>
              )}
            </div>

            <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <TopicHeader icon='medication' trailing={addRowButton('regimen', 'บันทึกการจ่ายยา')}>
                ตารางสูตรยาและการจ่ายยา
              </TopicHeader>
              {viewTarget.regimenRows.length === 0 ? (
                <EmptyPanel icon='medication' title='ยังไม่มีการจ่ายยาในทะเบียนนี้' />
              ) : (
                <Table
                  columns={[
                    { key: 'dispensedDate', label: 'วันที่จ่าย', render: (r) => <span style={cancelledCellStyle(r)}>{formatTbDate(r.dispensedDate)}</span> },
                    { key: 'regimen', label: 'สูตรยา', flex: true, minWidth: 180, render: (r) => <span style={cancelledCellStyle(r)}>{resolveTbRegimen(r.regimen)?.label || r.regimen}</span> },
                    { key: 'weightKg', label: 'น้ำหนัก (กก.)' },
                    { key: 'days', label: 'จำนวนวัน', render: (r) => r.days || '—' },
                    { key: 'phase', label: 'ระยะ', render: (r) => (r.phase === 'intensive' ? 'ระยะเข้มข้น' : r.phase === 'continuation' ? 'ระยะต่อเนื่อง' : '—') },
                    { key: 'complication', label: 'ภาวะแทรกซ้อน', flex: true, minWidth: 200, render: (r) => r.complication || '—' },
                    auditColumn('regimen'),
                    { key: 'actions', label: 'การดำเนินการ', sortable: false, render: (r) => rowActions('regimen', r) },
                  ]}
                  rows={viewTarget.regimenRows}
                  rowKey={(r) => r.id}
                  emptyMessage='ไม่พบรายการจ่ายยา'
                />
              )}
            </div>

            <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <TopicHeader icon='event_available'>ปฏิทินการกำกับการกินยา (อ่านอย่างเดียว)</TopicHeader>
              {viewTarget.treatmentStartDate ? (
                <DotCalendarLog log={dotLog} startDate={viewTarget.treatmentStartDate} readOnly />
              ) : (
                <EmptyPanel icon='event_available' title='ยังไม่เริ่มการรักษา' subtitle='ปฏิทิน DOT จะแสดงเมื่อมีวันที่เริ่มยาแล้ว' />
              )}
            </div>
          </div>
        );

      /* (3) ผลตรวจ LAB */
      case 2:
        return (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600, 24px)' }}>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <TopicHeader icon='biotech' trailing={addRowButton('culture', 'เพิ่มผลเพาะเชื้อ')}>
                ผลเพาะเชื้อ (Culture)
              </TopicHeader>
              {viewTarget.cultureRows.length === 0 ? (
                <EmptyPanel icon='biotech' title='ยังไม่มีผลเพาะเชื้อ' />
              ) : (
                <Table
                  columns={[
                    { key: 'specimen', label: 'สิ่งส่งตรวจ', flex: true, minWidth: 160, render: (r) => <span style={cancelledCellStyle(r)}>{r.specimen}</span> },
                    { key: 'sentDate', label: 'วันที่ส่ง', render: (r) => formatTbDate(r.sentDate) },
                    {
                      key: 'result', label: 'ผล', render: (r) => {
                        const res = resolveTbCultureResult(r.result);
                        return res ? <ColorfulBadge style={res.badge} size='small' hierarchy='secondary'>{res.label}</ColorfulBadge> : '—';
                      },
                    },
                    { key: 'organism', label: 'เชื้อที่พบ', flex: true, minWidth: 180, render: (r) => r.organism || '—' },
                    { key: 'reportDate', label: 'วันที่รายงาน', render: (r) => (r.reportDate ? formatTbDate(r.reportDate) : 'รอผล') },
                    { key: 'actions', label: 'การดำเนินการ', sortable: false, render: (r) => rowActions('culture', r) },
                  ]}
                  rows={viewTarget.cultureRows}
                  rowKey={(r) => r.id}
                  emptyMessage='ไม่พบผลเพาะเชื้อ'
                />
              )}
            </div>

            <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <TopicHeader icon='labs' trailing={addRowButton('dst', 'เพิ่มผล DST')}>
                ผลทดสอบความไวต่อยา (DST)
              </TopicHeader>
              {viewTarget.dstRows.length === 0 ? (
                <EmptyPanel icon='labs' title='ยังไม่มีผลทดสอบความไวต่อยา' />
              ) : (
                <Table
                  columns={[
                    { key: 'sentDate', label: 'วันที่ส่ง', render: (r) => formatTbDate(r.sentDate) },
                    { key: 'isoniazid', label: 'Isoniazid (H)', render: (r) => r.isoniazid || '—' },
                    { key: 'rifampicin', label: 'Rifampicin (R)', render: (r) => r.rifampicin || '—' },
                    { key: 'ethambutol', label: 'Ethambutol (E)', render: (r) => r.ethambutol || '—' },
                    { key: 'streptomycin', label: 'Streptomycin (S)', render: (r) => r.streptomycin || '—' },
                    { key: 'reportDate', label: 'วันที่รายงาน', render: (r) => (r.reportDate ? formatTbDate(r.reportDate) : 'รอผล') },
                    { key: 'actions', label: 'การดำเนินการ', sortable: false, render: (r) => rowActions('dst', r) },
                  ]}
                  rows={viewTarget.dstRows}
                  rowKey={(r) => r.id}
                  emptyMessage='ไม่พบผล DST'
                />
              )}
            </div>
          </div>
        );

      /* (4) การนัดหมาย */
      case 3:
        return (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <TopicHeader
              icon='calendar'
              trailing={canMutate ? (
                <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit_calendar' onClick={openAppt}>
                  {viewTarget.nextAppointment ? 'แก้ไขนัดหมาย' : 'บันทึกนัดหมาย'}
                </BrandSubdueButton>
              ) : null}
            >
              นัดหมายครั้งถัดไป
            </TopicHeader>
            {viewTarget.nextAppointment ? (
              <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-600, 24px)' }}>
                <KeyValue label='วันที่นัด' value={formatTbDate(viewTarget.nextAppointment.date)} />
                <KeyValue label='รายละเอียดการนัด' value={viewTarget.nextAppointment.type} />
              </div>
            ) : (
              <EmptyPanel icon='event_busy' title='ยังไม่มีนัดหมายครั้งถัดไป' subtitle='บันทึกได้จากปุ่มด้านบน หรือจากขั้นตอนนัดหมายในแบบบันทึกการตรวจ' />
            )}
          </div>
        );

      /* (5) การติดตาม / เยี่ยมบ้าน */
      case 4:
        return (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <TopicHeader icon='home_health' trailing={addRowButton('followUp', 'เพิ่มการติดตาม')}>
              การติดตามและเยี่ยมบ้าน
            </TopicHeader>
            {viewTarget.followUps.length === 0 ? (
              <EmptyPanel icon='home_health' title='ยังไม่มีบันทึกการติดตาม' />
            ) : (
              <Table
                columns={[
                  { key: 'date', label: 'วันที่', render: (r) => <span style={cancelledCellStyle(r)}>{formatTbDate(r.date)}</span> },
                  { key: 'type', label: 'ประเภท', render: (r) => <span style={cancelledCellStyle(r)}>{r.type}</span> },
                  { key: 'note', label: 'บันทึก', flex: true, minWidth: 260, render: (r) => <span style={cancelledCellStyle(r)}>{r.note}</span> },
                  { key: 'by', label: 'ผู้ติดตาม', flex: true, minWidth: 150 },
                  auditColumn('followUp'),
                  { key: 'actions', label: 'การดำเนินการ', sortable: false, render: (r) => rowActions('followUp', r) },
                ]}
                rows={viewTarget.followUps}
                rowKey={(r) => r.id}
                emptyMessage='ไม่พบบันทึกการติดตาม'
              />
            )}
          </div>
        );

      /* (6) ผู้สัมผัสโรค */
      case 5:
        return (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <TopicHeader icon='groups' trailing={addRowButton('contact', 'เพิ่มผู้สัมผัสโรค')}>
              ผู้สัมผัสโรคร่วมบ้าน / ใกล้ชิด
            </TopicHeader>
            {viewTarget.contacts.length === 0 ? (
              <EmptyPanel icon='groups' title='ยังไม่มีข้อมูลผู้สัมผัสโรค' subtitle='บันทึกผู้สัมผัสเพื่อส่งเข้าระบบคัดกรองกลุ่มเสี่ยง' />
            ) : (
              <Table
                columns={[
                  { key: 'name', label: 'ชื่อ-สกุล', flex: true, minWidth: 170, render: (r) => <span style={cancelledCellStyle(r)}>{canEdit ? r.name : maskTbName(r.name)}</span> },
                  { key: 'relation', label: 'ความสัมพันธ์' },
                  { key: 'age', label: 'อายุ', render: (r) => (r.age ? `${r.age} ปี` : '—') },
                  { key: 'screeningResult', label: 'ผลการคัดกรอง', render: (r) => (r.screeningResult || 'ยังไม่ได้คัดกรอง') },
                  { key: 'screeningDate', label: 'วันที่คัดกรอง', render: (r) => (r.screeningDate ? formatTbDate(r.screeningDate) : '—') },
                  auditColumn('contact'),
                  {
                    key: 'actions', label: 'การดำเนินการ', sortable: false,
                    render: (r) => (
                      <div className='inline-flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                        <NeutralSubdueButton
                          size='sm'
                          leadingIcon='person_search'
                          onClick={() => history.push({
                            pathname: '/clinic/tb/screening',
                            state: { prefill: { name: r.name, age: r.age, relatedRegNo: viewTarget.regNo, riskGroups: ['household'] } },
                          })}
                        >
                          ส่งไปคัดกรอง
                        </NeutralSubdueButton>
                        {rowActions('contact', r)}
                      </div>
                    ),
                  },
                ]}
                rows={viewTarget.contacts}
                rowKey={(r) => r.id}
                emptyMessage='ไม่พบผู้สัมผัสโรค'
              />
            )}
          </div>
        );

      /* (7) ประวัติการทำงาน */
      default:
        return (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <TopicHeader icon='history'>ประวัติการทำงานทั้งหมด (Audit Trail)</TopicHeader>
            <Table
              columns={[
                { key: 'at', label: 'วันเวลา' },
                { key: 'by', label: 'ผู้ดำเนินการ', flex: true, minWidth: 170 },
                { key: 'action', label: 'การกระทำ' },
                { key: 'detail', label: 'รายละเอียด', flex: true, minWidth: 300 },
              ]}
              rows={viewTarget.auditTrail}
              rowKey={(r) => r.id}
              emptyMessage='ยังไม่มีประวัติการทำงาน'
            />
          </div>
        );
    }
  };

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='ทะเบียนผู้รับบริการวัณโรค'
      onBack={() => history.push('/clinic/tb')}
      backLabel='กลับหน้าคิว'
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <NeutralSubdueButton
            size='sm'
            leadingIcon={canEdit ? 'lock_open' : 'lock'}
            onClick={() => { setTbClinicReadOnly(canEdit); setRightsTick((t) => t + 1); }}
            title='สลับสิทธิการแก้ไขคลินิกวัณโรค (สำหรับทดสอบ/ตรวจรับ)'
          >
            {canEdit ? 'สิทธิ: แก้ไขได้' : 'สิทธิ: ดูอย่างเดียว'}
          </NeutralSubdueButton>
          <BrandSubdueButton variant='outline' size='md' leadingIcon='print' onClick={() => window.print()}>
            พิมพ์ทะเบียน
          </BrandSubdueButton>
          <BrandSubdueButton variant='outline' size='md' leadingIcon='download' onClick={exportSmartTb}>
            ส่งออก Smart TB (CSV)
          </BrandSubdueButton>
          {canEdit && (
            <BrandSubdueButton variant='fill' size='md' leadingIcon='person_add' onClick={openRegister}>
              ขึ้นทะเบียนใหม่
            </BrandSubdueButton>
          )}
        </div>
      )}
      summaryCards={summaryCards}
    >
      {/* ── แสดง: รายละเอียดทะเบียน 7 แท็บ ─────────────────────────── */}
      <Popup
        open={!!viewTarget}
        onClose={() => setViewId(null)}
        size='large'
        title={viewTarget ? `ทะเบียนวัณโรค ${viewTarget.regNo}` : ''}
        subtitle={viewTarget ? `${displayName(viewTarget)} · HN: ${viewTarget.hn} · ปีงบ ${viewTarget.fiscalYear}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setViewId(null) }}
        secondaryAction={{ label: 'พิมพ์ทะเบียน', onClick: () => window.print() }}
        primaryAction={canMutate ? { label: 'แก้ไขหัวทะเบียน', onClick: openHeaderEdit } : undefined}
      >
        {viewTarget && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            {/* หัวทะเบียนตามระบบเดิม */}
            <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-600, 24px)' }}>
              <KeyValue label='เลขที่ขึ้นทะเบียน' value={viewTarget.regNo} />
              <KeyValue label='ประเภทผู้ป่วย' value={resolveTbPatientType(viewTarget.patientType)?.label} />
              <KeyValue label='วันที่ขึ้นทะเบียน' value={formatTbDate(viewTarget.registeredDate)} />
              <KeyValue label='วันที่วินิจฉัย (CXR)' value={viewTarget.cxr?.date ? formatTbDate(viewTarget.cxr.date) : '—'} />
              <KeyValue label='วันที่รับรักษา' value={viewTarget.treatmentStartDate ? formatTbDate(viewTarget.treatmentStartDate) : 'ยังไม่เริ่มยา'} />
              <KeyValue label='แพทย์ผู้ดูแล' value={viewTarget.doctor} />
              <KeyValue label='สูตรยาปัจจุบัน' value={resolveTbRegimen(viewTarget.regimen)?.label} />
            </div>

            {viewTarget.cancelled && (
              <ReadOnlyBanner>
                ทะเบียนนี้ถูกยกเลิกแล้ว — โดย {viewTarget.cancelled.by} · {viewTarget.cancelled.at} ·
                เหตุผล: {viewTarget.cancelled.reason} (แก้ไขหรือเพิ่มรายการไม่ได้)
              </ReadOnlyBanner>
            )}
            {viewTarget.closure && (
              <ReadOnlyBanner>
                ปิดทะเบียนแล้วด้วยผล "{resolveTbOutcome(viewTarget.closure.outcome)?.label}" เมื่อ
                {' '}{formatTbDate(viewTarget.closure.date)} โดย {viewTarget.closure.by} — แก้ไขหรือเพิ่มรายการไม่ได้
                {viewTarget.closure.note ? ` · หมายเหตุ: ${viewTarget.closure.note}` : ''}
              </ReadOnlyBanner>
            )}
            {!canEdit && (
              <ReadOnlyBanner>สิทธิ์ของคุณดูได้อย่างเดียว — ชื่อผู้รับบริการถูกปิดบังและปุ่มแก้ไขทั้งหมดถูกซ่อน (§1.4.2)</ReadOnlyBanner>
            )}

            {/* ปุ่มระดับทะเบียน */}
            {canEdit && (
              <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                {!viewReadOnly && (
                  <>
                    <BrandSubdueButton
                      variant='outline'
                      size='sm'
                      leadingIcon='task_alt'
                      onClick={() => { setCloseDraft({ outcome: '', date: todayIso(), note: '' }); setCloseError(''); setCloseOpen(true); }}
                    >
                      ปิดทะเบียนด้วยผลการรักษา
                    </BrandSubdueButton>
                    <NeutralSubdueButton
                      size='sm'
                      leadingIcon='block'
                      onClick={() => openCancel({ kind: 'registry', label: `ทะเบียน ${viewTarget.regNo}` })}
                    >
                      ยกเลิกทะเบียน
                    </NeutralSubdueButton>
                  </>
                )}
                {viewTarget.closure && (
                  <BrandSubdueButton
                    variant='outline'
                    size='sm'
                    leadingIcon='restart_alt'
                    onClick={() => { setReopenReason(''); setReopenError(''); setReopenOpen(true); }}
                  >
                    เปิดทะเบียนอีกครั้ง
                  </BrandSubdueButton>
                )}
                <NeutralSubdueButton
                  size='sm'
                  leadingIcon='monitoring'
                  onClick={() => history.push({ pathname: '/clinic/tb/follow-up', state: { regNo: viewTarget.regNo, hn: viewTarget.hn } })}
                >
                  ติดตามการดูแล
                </NeutralSubdueButton>
              </div>
            )}

            {/* 7 แท็บของระบบเดิม */}
            <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              {REGISTRY_TABS.map((label, i) => (
                <TabCapsule
                  key={label}
                  variant='filter'
                  label={label}
                  selected={i === activeTab}
                  onClick={() => setActiveTab(i)}
                />
              ))}
            </div>
            <div style={{ height: 1, background: 'var(--border-neutral-tertiary, #E2E4E6)' }} />

            {renderTab()}
          </div>
        )}
      </Popup>

      {/* ── บันทึก: ขึ้นทะเบียนใหม่ ────────────────────────────────── */}
      <Popup
        open={registerOpen}
        onClose={requestCloseRegister}
        size='large'
        title='ขึ้นทะเบียนผู้ป่วยวัณโรค'
        subtitle='TOR §1.10.4.6 — บันทึกทะเบียนใหม่ (เลขที่ขึ้นทะเบียนออกอัตโนมัติตามปีงบประมาณ)'
        tertiaryAction={{ label: 'ยกเลิก', onClick: requestCloseRegister }}
        primaryAction={{ label: 'บันทึกทะเบียน', onClick: submitRegister }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <Field label='HN ผู้รับบริการ' required>
              <InputField
                value={regDraft.hn || ''}
                onChange={(v) => { setRegDraft((d) => ({ ...d, hn: v })); setRegError(''); }}
                placeholder='เช่น 67-00024'
                showLabel={false}
                showHelperText={false}
              />
            </Field>
            <Field label='ประเภทผู้ป่วย' required>
              <Select
                showLabel={false} showHelperText={false} searchable={false} size='lg'
                value={regDraft.patientType || ''}
                onChange={(v) => { setRegDraft((d) => ({ ...d, patientType: v })); setRegError(''); }}
                options={TB_PATIENT_TYPES.map((t) => ({ value: t.value, label: t.label, subtext: t.description }))}
                placeholder='เลือกประเภทผู้ป่วย'
              />
            </Field>
            <Field label='วันที่ขึ้นทะเบียน' required>
              <DatePicker
                value={regDraft.registeredDate ? new Date(regDraft.registeredDate) : null}
                onChange={(d) => { setRegDraft((prev) => ({ ...prev, registeredDate: isoFromDate(d) })); setRegError(''); }}
                placeholder='เลือกวันที่'
                showLabel={false}
                showHelperText={false}
              />
            </Field>
          </div>
          <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <Field label='ชนิดวัณโรค' required>
              <Select
                showLabel={false} showHelperText={false} searchable={false} size='lg'
                value={regDraft.diseaseSite || ''}
                onChange={(v) => { setRegDraft((d) => ({ ...d, diseaseSite: v })); setRegError(''); }}
                options={TB_DISEASE_SITES}
                placeholder='เลือกชนิดวัณโรค'
              />
            </Field>
            {regDraft.diseaseSite === 'extrapulmonary' && (
              <Field label='ตำแหน่งวัณโรคนอกปอด' required>
                <Select
                  showLabel={false} showHelperText={false} searchable={false} size='lg'
                  value={regDraft.epSite || ''}
                  onChange={(v) => { setRegDraft((d) => ({ ...d, epSite: v })); setRegError(''); }}
                  options={TB_EP_SITES.map((s) => ({ value: s, label: s }))}
                  placeholder='เลือกตำแหน่ง'
                />
              </Field>
            )}
            <Field label='สูตรยาเริ่มต้น'>
              <Select
                showLabel={false} showHelperText={false} searchable={false} size='lg'
                value={regDraft.regimen || ''}
                onChange={(v) => setRegDraft((d) => ({ ...d, regimen: v }))}
                options={TB_REGIMENS}
                placeholder='เลือกสูตรยา (ระบุภายหลังได้)'
              />
            </Field>
            <Field label='แพทย์ผู้ดูแล'>
              <Select
                showLabel={false} showHelperText={false} searchable={false} size='lg'
                value={regDraft.doctor || ''}
                onChange={(v) => setRegDraft((d) => ({ ...d, doctor: v }))}
                options={TB_DOCTORS.map((d) => ({ value: d, label: d }))}
                placeholder='เลือกแพทย์'
              />
            </Field>
          </div>

          {regError === 'duplicate' && regDuplicate ? (
            <Banner
              tone='danger'
              icon='error'
              action={(
                <BrandSubdueButton
                  variant='outline'
                  size='sm'
                  leadingIcon='open_in_new'
                  onClick={() => { setRegisterOpen(false); openView(regDuplicate); }}
                >
                  เปิดทะเบียนเดิม
                </BrandSubdueButton>
              )}
            >
              ผู้รับบริการมีทะเบียน {regDuplicate.regNo} ที่ยังไม่ปิด — ใช้ทะเบียนเดิมแทนการขึ้นทะเบียนซ้ำ
            </Banner>
          ) : regError ? (
            <ErrorNote>{regError}</ErrorNote>
          ) : null}
        </div>
      </Popup>

      {/* ── แก้ไขหัวทะเบียน ───────────────────────────────────────── */}
      <Popup
        open={headerOpen}
        onClose={requestCloseHeader}
        size='large'
        title='แก้ไขหัวทะเบียนวัณโรค'
        subtitle={viewTarget ? `${viewTarget.regNo} · ${displayName(viewTarget)}` : ''}
        tertiaryAction={{ label: 'ยกเลิก', onClick: requestCloseHeader }}
        primaryAction={{ label: 'บันทึกการแก้ไข', onClick: submitHeader }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <Field label='ประเภทผู้ป่วย' required>
              <Select
                showLabel={false} showHelperText={false} searchable={false} size='lg'
                value={headerDraft.patientType || ''}
                onChange={(v) => { setHeaderDraft((d) => ({ ...d, patientType: v })); setHeaderError(''); }}
                options={TB_PATIENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                placeholder='เลือกประเภทผู้ป่วย'
              />
            </Field>
            <Field label='ชนิดวัณโรค' required>
              <Select
                showLabel={false} showHelperText={false} searchable={false} size='lg'
                value={headerDraft.diseaseSite || ''}
                onChange={(v) => { setHeaderDraft((d) => ({ ...d, diseaseSite: v })); setHeaderError(''); }}
                options={TB_DISEASE_SITES}
                placeholder='เลือกชนิดวัณโรค'
              />
            </Field>
            {headerDraft.diseaseSite === 'extrapulmonary' && (
              <Field label='ตำแหน่งนอกปอด' required>
                <Select
                  showLabel={false} showHelperText={false} searchable={false} size='lg'
                  value={headerDraft.epSite || ''}
                  onChange={(v) => { setHeaderDraft((d) => ({ ...d, epSite: v })); setHeaderError(''); }}
                  options={TB_EP_SITES.map((s) => ({ value: s, label: s }))}
                  placeholder='เลือกตำแหน่ง'
                />
              </Field>
            )}
          </div>
          <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <Field label='วันที่ขึ้นทะเบียน' required>
              <DatePicker
                value={headerDraft.registeredDate ? new Date(headerDraft.registeredDate) : null}
                onChange={(d) => { setHeaderDraft((prev) => ({ ...prev, registeredDate: isoFromDate(d) })); setHeaderError(''); }}
                placeholder='เลือกวันที่' showLabel={false} showHelperText={false}
              />
            </Field>
            <Field label='วันที่เริ่มการรักษา'>
              <DatePicker
                value={headerDraft.treatmentStartDate ? new Date(headerDraft.treatmentStartDate) : null}
                onChange={(d) => setHeaderDraft((prev) => ({ ...prev, treatmentStartDate: isoFromDate(d) }))}
                placeholder='เลือกวันที่' showLabel={false} showHelperText={false}
              />
            </Field>
            <Field label='แพทย์ผู้ดูแล'>
              <Select
                showLabel={false} showHelperText={false} searchable={false} size='lg'
                value={headerDraft.doctor || ''}
                onChange={(v) => setHeaderDraft((d) => ({ ...d, doctor: v }))}
                options={TB_DOCTORS.map((d) => ({ value: d, label: d }))}
                placeholder='เลือกแพทย์'
              />
            </Field>
          </div>

          <TopicHeader icon='radiology'>ผลการตรวจภาพรังสีทรวงอก (CXR)</TopicHeader>
          <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <Field label='วันที่ตรวจ CXR'>
              <DatePicker
                value={headerDraft.cxrDate ? new Date(headerDraft.cxrDate) : null}
                onChange={(d) => setHeaderDraft((prev) => ({ ...prev, cxrDate: isoFromDate(d) }))}
                placeholder='เลือกวันที่' showLabel={false} showHelperText={false}
              />
            </Field>
            <Field label='ผลอ่านภาพรังสี'>
              <InputField
                value={headerDraft.cxrResult || ''}
                onChange={(v) => setHeaderDraft((d) => ({ ...d, cxrResult: v }))}
                placeholder='เช่น Infiltration RUL'
                showLabel={false} showHelperText={false}
              />
            </Field>
          </div>
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <SelectableTag
              label='ผล CXR ผิดปกติ'
              size='lg'
              selected={!!headerDraft.cxrAbnormal}
              onClick={() => setHeaderDraft((d) => ({ ...d, cxrAbnormal: !d.cxrAbnormal }))}
            />
          </div>

          <SuggestibleTextarea
            label='ประวัติการรักษาวัณโรคเดิม'
            voice
            value={headerDraft.priorTreatment || ''}
            onChange={(e) => setHeaderDraft((d) => ({ ...d, priorTreatment: e.target.value }))}
            suggestions={TB_DIAGNOSIS_SUGGESTIONS}
            minChars={3}
            placeholder='เช่น เคยรักษาหาย (Cured) ทะเบียน 18/2565 — กลับเป็นซ้ำ'
          />

          {headerError && <ErrorNote>{headerError}</ErrorNote>}
        </div>
      </Popup>

      {/* ── แถวย่อย: บันทึก / แก้ไข ───────────────────────────────── */}
      <RowFormPopup
        open={!!rowPopup}
        collection={rowPopup?.collection}
        mode={rowPopup?.mode}
        draft={rowDraft}
        setDraft={setRowDraft}
        error={rowError}
        onClose={requestCloseRow}
        onSubmit={submitRow}
      />

      {/* ── ยกเลิก (บังคับเหตุผล) ─────────────────────────────────── */}
      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title={cancelTarget?.kind === 'registry' ? 'ยกเลิกทะเบียนวัณโรค' : 'ยกเลิกรายการในทะเบียน'}
        subtitle={cancelTarget?.label || ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันการยกเลิก', onClick: confirmCancel, tone: 'danger' }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <SuggestibleTextarea
            label='เหตุผลการยกเลิก'
            required
            voice
            value={cancelReason}
            onChange={(e) => { setCancelReason(e.target.value); if (cancelError) setCancelError(''); }}
            suggestions={TB_CANCEL_REASON_SUGGESTIONS}
            minChars={2}
            placeholder='เช่น สิ่งส่งตรวจปนเปื้อน เก็บใหม่ / บันทึกซ้ำ / ย้ายไปรักษาที่อื่น'
          />
          <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
            รายการที่ยกเลิกจะยังคงแสดงในตารางแบบขีดฆ่า พร้อมผู้ยกเลิก เวลา และเหตุผล
          </span>
          {cancelError && <ErrorNote>{cancelError}</ErrorNote>}
        </div>
      </Popup>

      {/* ── ปิดทะเบียน ────────────────────────────────────────────── */}
      <Popup
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        title='ปิดทะเบียนด้วยผลการรักษา'
        subtitle={viewTarget ? `${viewTarget.regNo} · ${displayName(viewTarget)}` : ''}
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setCloseOpen(false) }}
        primaryAction={{ label: 'ยืนยันปิดทะเบียน', onClick: confirmClose }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <Field label='ผลการรักษา' required>
              <Select
                showLabel={false} showHelperText={false} searchable={false} size='lg'
                value={closeDraft.outcome}
                onChange={(v) => { setCloseDraft((d) => ({ ...d, outcome: v })); setCloseError(''); }}
                options={TB_OUTCOMES}
                placeholder='เลือกผลการรักษา'
              />
            </Field>
            <Field label='วันที่ปิดทะเบียน' required>
              <DatePicker
                value={closeDraft.date ? new Date(closeDraft.date) : null}
                onChange={(d) => { setCloseDraft((prev) => ({ ...prev, date: isoFromDate(d) })); setCloseError(''); }}
                placeholder='เลือกวันที่' showLabel={false} showHelperText={false}
              />
            </Field>
          </div>
          <Field label='หมายเหตุการปิดทะเบียน' flex={false}>
            <InputField
              value={closeDraft.note}
              onChange={(v) => setCloseDraft((d) => ({ ...d, note: v }))}
              placeholder='เช่น เสมหะ Negative เดือนที่ 5 และ 6 — รักษาหาย'
              showLabel={false} showHelperText={false}
            />
          </Field>
          <Banner tone='warning' icon='warning'>
            เมื่อปิดทะเบียนแล้ว ทะเบียนจะกลายเป็นอ่านอย่างเดียว — เพิ่ม/แก้ไข/ยกเลิกรายการย่อยไม่ได้
          </Banner>
          {closeError && <ErrorNote>{closeError}</ErrorNote>}
        </div>
      </Popup>

      {/* ── เปิดทะเบียนอีกครั้ง ───────────────────────────────────── */}
      <Popup
        open={reopenOpen}
        onClose={() => setReopenOpen(false)}
        title='เปิดทะเบียนอีกครั้ง'
        subtitle={viewTarget ? `${viewTarget.regNo} · ${displayName(viewTarget)}` : ''}
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setReopenOpen(false) }}
        primaryAction={{ label: 'ยืนยันเปิดทะเบียนอีกครั้ง', onClick: confirmReopen, tone: 'danger' }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <SuggestibleTextarea
            label='เหตุผลการเปิดทะเบียนอีกครั้ง'
            required
            voice
            value={reopenReason}
            onChange={(e) => { setReopenReason(e.target.value); if (reopenError) setReopenError(''); }}
            suggestions={[
              'ปิดทะเบียนผิดราย — ต้องเปิดกลับเพื่อบันทึกต่อ',
              'ผลการรักษาเปลี่ยนหลังได้รับผล Culture เพิ่มเติม',
              'ผู้ป่วยกลับมารักษาต่อเนื่องภายในรอบเดิม',
            ]}
            minChars={2}
            placeholder='ระบุเหตุผล — ระบบจะบันทึกไว้ในประวัติการทำงาน'
          />
          {reopenError && <ErrorNote>{reopenError}</ErrorNote>}
        </div>
      </Popup>

      {/* ── นัดหมาย ───────────────────────────────────────────────── */}
      <Popup
        open={apptOpen}
        onClose={() => setApptOpen(false)}
        title='บันทึกนัดหมายครั้งถัดไป'
        subtitle={viewTarget ? `${viewTarget.regNo} · ${displayName(viewTarget)}` : ''}
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setApptOpen(false) }}
        primaryAction={{ label: 'บันทึกนัดหมาย', onClick: confirmAppt }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <Field label='วันที่นัด' required>
              <DatePicker
                value={apptDraft.date ? new Date(apptDraft.date) : null}
                onChange={(d) => { setApptDraft((prev) => ({ ...prev, date: isoFromDate(d) })); setApptError(''); }}
                placeholder='เลือกวันที่' showLabel={false} showHelperText={false}
              />
            </Field>
            <Field label='รายละเอียดการนัด' required>
              <InputField
                value={apptDraft.type}
                onChange={(v) => { setApptDraft((d) => ({ ...d, type: v })); setApptError(''); }}
                placeholder='เช่น นัดรับยา + ส่งเสมหะเดือนที่ 3'
                showLabel={false} showHelperText={false}
              />
            </Field>
          </div>
          {apptError && <ErrorNote>{apptError}</ErrorNote>}
        </div>
      </Popup>

      {/* ── dirty-check ร่วม ──────────────────────────────────────── */}
      <Popup
        open={!!discardTarget}
        onClose={() => setDiscardTarget(null)}
        title='ทิ้งการแก้ไข?'
        subtitle='ข้อมูลที่แก้ไขไว้ยังไม่ได้บันทึก หากปิดหน้าต่างนี้ข้อมูลจะหายไป'
        tertiaryAction={{ label: 'แก้ไขต่อ', onClick: () => setDiscardTarget(null) }}
        primaryAction={{
          label: 'ทิ้งการแก้ไข',
          tone: 'danger',
          onClick: () => {
            if (discardTarget === 'register') setRegisterOpen(false);
            if (discardTarget === 'header') setHeaderOpen(false);
            if (discardTarget === 'row') setRowPopup(null);
            setDiscardTarget(null);
          },
        }}
      />

      {/* ── รายการทะเบียน ─────────────────────────────────────────── */}
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
        <div
          className='w-full flex flex-col'
          style={{
            background: 'var(--surface-card-100, #FFFFFF)',
            borderRadius: 'var(--dim-radius-500, 16px)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #C5EDDA)',
            boxShadow: 'var(--shadow-card-strong)',
            paddingTop: 'var(--dim-space-600, 24px)',
            paddingBottom: 'var(--dim-space-600, 24px)',
            paddingLeft: 'var(--dim-space-600, 24px)',
            paddingRight: 'var(--dim-space-600, 24px)',
            gap: 'var(--dim-space-600, 24px)',
          }}
        >
          {!canEdit && (
            <ReadOnlyBanner>
              สิทธิ์ของคุณดูได้อย่างเดียว — ชื่อผู้รับบริการถูกปิดบังตามข้อกำหนดข้อมูลลับ §1.4.2
              และไม่สามารถขึ้นทะเบียน แก้ไข หรือยกเลิกได้
            </ReadOnlyBanner>
          )}

          <div className='w-full flex items-start justify-center'>
            <PrimarySearch
              value={searchQ}
              onChange={(v) => { setSearchQ(v); setPage(1); }}
              onSubmit={(label, item) => {
                setSearchQ(label);
                setPage(1);
                const match = rows.find((r) => r.id === item?.id)
                  || rows.find((r) => [r.regNo, r.hn, r.name].some((f) => f && f.toLowerCase().includes(String(label).toLowerCase())));
                pushHistory(item ?? label);
                if (match) openView(match);
              }}
              suggestions={searchSuggestions}
              history={searchHistory}
              onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
              placeholder='ค้นหาเลขทะเบียน / HN / ชื่อ-สกุล / แพทย์'
              width={640}
            />
          </div>

          <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <OverflowFlexRow itemGap='var(--dim-space-200, 8px)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
              <FilterTag value='ทั้งหมด' selected={isAllDefault} onClick={resetFilters} />
              <FilterDropdown prefix='ปีงบประมาณ:' options={fiscalYearOptions} value={filters.fiscalYear} onChange={setFilter('fiscalYear')} />
              <FilterDropdown prefix='ประเภทผู้ป่วย:' options={patientTypeOptions} value={filters.patientType} onChange={setFilter('patientType')} />
              <FilterDropdown prefix='สถานะทะเบียน:' options={STATUS_OPTIONS} value={filters.status} onChange={setFilter('status')} />
              <FilterDropdown prefix='แพทย์:' options={doctorOptions} value={filters.doctor} onChange={setFilter('doctor')} />
            </OverflowFlexRow>
          </div>

          <SearchResultCount found={filtered.length} total={rows.length} />

          {rows.length === 0 ? (
            <EmptyPanel
              icon='contract'
              title='ยังไม่มีทะเบียนผู้ป่วยวัณโรค'
              subtitle='ขึ้นทะเบียนรายแรกได้จากปุ่ม "ขึ้นทะเบียนใหม่" ด้านบน'
              action={canEdit ? (
                <BrandSubdueButton variant='fill' size='sm' leadingIcon='person_add' onClick={openRegister}>
                  ขึ้นทะเบียนใหม่
                </BrandSubdueButton>
              ) : null}
            />
          ) : filtered.length === 0 ? (
            <EmptyPanel
              icon='search_off'
              title='ไม่พบรายการที่ตรงกับการค้นหา / ตัวกรอง'
              subtitle='ลองปรับคำค้นหรือล้างตัวกรองเพื่อดูทะเบียนทั้งหมด'
              action={(
                <NeutralSubdueButton size='sm' leadingIcon='filter_alt_off' onClick={resetFilters}>
                  ล้างตัวกรอง
                </NeutralSubdueButton>
              )}
            />
          ) : (
            <>
              <Table
                columns={columns}
                rows={pageRows}
                rowKey={(r) => r.id}
                onRowClick={openView}
                stickyColCount={2}
                stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                emptyMessage='ไม่พบรายการที่ตรงกับการค้นหา / ตัวกรอง'
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
                  borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #C5EDDA)',
                }}
              >
                <span style={{ color: 'var(--text-content-secondary, #636B72)', fontSize: 'var(--type-size-sm, 14px)' }}>
                  {`แสดง ${rangeStart}–${rangeEnd} จาก ${filtered.length} รายการ`}
                </span>
                <div className='flex-1' />
                <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
              </div>
            </>
          )}

          <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
            <Icon name='lock' size={14} />
            การเปิดดูรายละเอียดทะเบียนทุกครั้งถูกบันทึกไว้ในประวัติการทำงาน (ข้อมูลลับ §1.4.2)
          </span>
        </div>
      </div>
    </QueuePageShell>
  );
};

export default TbRegistryPage;
