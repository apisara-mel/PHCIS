import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import StatusBadge from '@/components/badge/StatusBadge';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerButton from '@/components/button/DangerButton';
import BrandCircleIconButton from '@/components/button/BrandCircleIconButton';
import Icon from '@/components/icons/Icon';
import PrimarySearch from '@/components/search/PrimarySearch';
import { FilterDropdown } from '@/components/forms/FilterTag';
import FilterDateTag from '@/components/forms/FilterDateTag';
import { computeQuickRange, computeQuickSingle } from '@/components/popup/DateFilterPopup';
import Table, { EllipsisText } from '@/components/table/Table';
import VitalCard, { PressureCard } from '@/components/card/VitalCard';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import ViewToggle from '@/components/toggle/ViewToggle';
import AddVitalsModal, { VITALS_NOTE_SUGGESTIONS } from '@/components/observation/AddVitalsModal';
import Pagination from '@/components/pagination/Pagination';
import BedSelectionPopup from '@/components/popup/BedSelectionPopup';
import Popup from '@/components/popup/Popup';
import InventoryCard from '@/components/card/InventoryCard';
import { getPatientByHN, PATIENT_PROFILES } from '@/data/patientProfiles';
import { USERS } from '@/data/usersAccess';
import { STAFF_AVATARS } from '@/data/avatarAssets';
import {
  MOCK_OBSERVATION_PATIENTS,
  EWS_RISK_TIERS,
  EWS_RED_ALERT_SCORE,
  OVERSTAY_LIMIT_MINUTES,
  isOverstay,
  getOutOfRangeVitals,
  scorePatientVitals,
  getObservationDurationMinutes,
  formatDurationThai,
  formatObservationDateTime,
  isPhysicalBed,
  isBedAvailable,
  BED_CLEANING_STATUS,
  splitEpisodeFromBed,
} from '@/data/observationMock';
import { CHIEF_COMPLAINT_SUGGESTIONS } from '@/pages/opd/ScreeningPage';
import { MOCK_PATIENT_BEDS } from '@/data/mockPatientBeds';

/* Observation's bedType strings ("เตียงไฟฟ้า (High Care)", "เตียงหมุนมือ", …)
   share the same equipment vocabulary as MOCK_PATIENT_BEDS (the "เลือก
   เตียงผู้ป่วย" catalogue's Thai bed names) — match on keyword so the Admit
   modal's bed picker can show the same photo per equipment type instead of
   inventing a separate image set for observation wards. Falls back to the
   generic "เตียงสามัญ" photo when a type has no catalogue match. */
const getBedImageForType = (bedType = '') => {
  const match = MOCK_PATIENT_BEDS.find((b) => bedType.includes(b.title.split(' (')[0]));
  return match?.imageSrc || MOCK_PATIENT_BEDS.find((b) => b.id === 'bed04')?.imageSrc;
};

/* Beds created via "เพิ่มเตียงใหม่เข้าระบบ" carry their own free-text
   bedType (the ward's custom description, not a catalogue title), so the
   keyword match above can't resolve their photo — they instead record
   which catalogue entry they were photographed from via `bedPhotoId`.
   Every other (pre-existing) bed record falls through to the keyword
   match exactly as before. */
const resolveBedImage = (patient) =>
  MOCK_PATIENT_BEDS.find((b) => b.id === patient?.bedPhotoId)?.imageSrc || getBedImageForType(patient?.bedType);

/* Admit modal's "ผู้สั่ง" / "พยาบาลรับผู้ป่วย" — dropdowns with a profile
   photo per option (Select's `image` field), sourced from the same USERS
   mock the Users & Access page manages, instead of free-text fields. The
   admit form stores the plain name string (no separate staff-id field
   exists on observation patients), so `value` is the name itself. */
const DOCTOR_STAFF_OPTIONS = USERS
  .filter((u) => u.role === 'doctor')
  .map((u) => ({ value: u.name, label: u.name, image: u.avatarUrl }));
const NURSE_STAFF_OPTIONS = USERS
  .filter((u) => u.role === 'nurse')
  .map((u) => ({ value: u.name, label: u.name, image: u.avatarUrl }));

/* The ผู้สั่ง / พยาบาลรับผู้ป่วย FILTER dropdowns (queue tabs) list names
   baked into the historical mock patient records (e.g. "นพ. วรวิทย์
   เกียรติเจริญ") rather than the admit form's USERS roster above, so
   there's no shared id/name to join on for a real avatarUrl. Hash the
   name to a stable index into the same staff portrait pool instead —
   same name always resolves to the same photo, just not a "real" one. */
const avatarForName = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return STAFF_AVATARS[hash % STAFF_AVATARS.length];
};

/* Quick-pick reasons for the Code Red transfer popup's note field —
   same SuggestibleTextarea contract as every other clinician-typed field
   on this page (never a bare textarea). */
const ER_TRANSFER_REASON_SUGGESTIONS = [
  'ความดันตก (BP < 90) ร่วมกับชีพจรเบาเร็ว สงสัยภาวะ Shock',
  'SpO2 ลดต่ำกว่า 90% ทั้งที่ให้ออกซิเจนแล้ว',
  'ระดับความรู้สึกตัวลดลง ปลุกตื่นยาก (GCS ลดลง)',
  'เจ็บแน่นหน้าอกรุนแรงขึ้น สงสัยภาวะกล้ามเนื้อหัวใจขาดเลือด',
  'หายใจหอบเหนื่อยมากขึ้น ใช้กล้ามเนื้อช่วยหายใจ',
];

/* Overstay / EWS Red Alert chip — one shared pill so the grid card, the
   table row and the Full Capacity banner can't drift apart in tone.
   `tone` maps to the colourful-badge token trio (design.md §4). */
const AlertChip = ({ tone = 'red', icon, children }) => (
  <span
    className='inline-flex items-center whitespace-nowrap'
    style={{
      gap: 'var(--dim-space-100, 4px)',
      paddingTop: 'var(--dim-space-050, 2px)',
      paddingBottom: 'var(--dim-space-050, 2px)',
      paddingLeft: 'var(--dim-space-200, 8px)',
      paddingRight: 'var(--dim-space-200, 8px)',
      borderRadius: 'var(--dim-radius-150, 6px)',
      background: tone === 'red' ? 'var(--surface-colorfulbadge-red, #FEE2E2)' : 'var(--surface-colorfulbadge-orange, #FFEDD5)',
      color: tone === 'red' ? 'var(--text-colorfulbadge-red, #B91C1C)' : 'var(--text-colorfulbadge-orange, #C2410C)',
      border: `var(--dim-stroke-100, 1px) solid ${tone === 'red' ? 'var(--surface-colorfulbadge-red-bold, #EF4444)' : 'var(--surface-colorfulbadge-orange-bold, #F97316)'}`,
      fontSize: 'var(--type-size-xs)',
      fontWeight: 'var(--type-weight-bold)',
    }}
  >
    {icon && <span className='material-symbols-outlined' style={{ fontSize: 14 }}>{icon}</span>}
    {children}
  </span>
);

/* A bed row only carries patient data while it is occupied — both an
   empty bed and one waiting to be cleaned render as "no patient". */
const hasPatient = (patient) => patient.status !== 'empty' && patient.status !== BED_CLEANING_STATUS;

/* List-view columns — styled to match the OPD screening worklist table
   (shared <Table>, design tokens, StatusBadge) instead of a bespoke
   Tailwind-gray <table>. The "actions" column is bound to page-level
   handlers (history, admit-form state) so it's appended via useMemo in
   the component body — see QueuePage.jsx's makeRenderActions pattern. */
const OBSERVATION_QUEUE_BASE_COLUMNS = [
  {
    key: 'bedNo',
    label: 'เลขเตียง',
    width: 96,
    render: (patient) => (
      <span style={{ color: 'var(--text-brandPrimary-default, var(--brand-p700))', fontWeight: 'var(--type-weight-bold)' }}>
        {patient.bedNo}
      </span>
    ),
  },
  {
    key: 'name',
    label: 'ชื่อ-นามสกุล / HN',
    flex: true,
    minWidth: 200,
    render: (patient) => {
      if (!hasPatient(patient)) {
        return (
          <span style={{ color: 'var(--text-content-tertiary)', fontStyle: 'italic' }}>
            {patient.status === BED_CLEANING_STATUS ? 'รอทำความสะอาด' : 'เตียงว่าง'} ({patient.bedType})
          </span>
        );
      }
      return (
        <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
          <img
            src={patient.avatar || getPatientByHN(patient.hn)?.avatarUrl || '/avatars/somchai-mock.png'}
            alt={patient.patientName}
            className='w-8 h-8 rounded-full object-cover shrink-0'
            style={{ border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)' }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/avatars/somchai-mock.png';
            }}
          />
          <div className='min-w-0'>
            <div className='truncate' style={{ fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default)' }}>
              {patient.patientName}
            </div>
            <div style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
              HN: {patient.hn}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    key: 'genderAge',
    label: 'เพศ / อายุ',
    width: 112,
    render: (patient) => (!hasPatient(patient) ? '-' : `${patient.gender}, ${patient.age} ปี`),
  },
  {
    key: 'admitTime',
    label: 'เวลาเข้าเตียง',
    width: 140,
    render: (patient) => {
      if (!hasPatient(patient)) return '-';
      const overstay = isOverstay(patient);
      return (
        <div>
          <div>{patient.admitTime}</div>
          <div
            style={{
              fontSize: 'var(--type-size-xs)',
              color: overstay ? 'var(--text-colorfulbadge-orange, #C2410C)' : 'var(--text-content-tertiary)',
              fontWeight: overstay ? 'var(--type-weight-bold)' : 'var(--type-weight-regular)',
            }}
          >
            ({formatDurationThai(getObservationDurationMinutes(patient))})
          </div>
          {overstay && (
            <div style={{ marginTop: 'var(--dim-space-100, 4px)' }}>
              <AlertChip tone='orange' icon='hourglass_top'>เกิน {OVERSTAY_LIMIT_MINUTES / 60} ชม.</AlertChip>
            </div>
          )}
        </div>
      );
    },
  },
  {
    key: 'complaint',
    label: 'อาการสำคัญแรกรับ (Chief Complaint)',
    flex: true,
    minWidth: 220,
    sortable: false,
    render: (patient) => {
      if (!hasPatient(patient)) return '-';
      return (
        <div className='min-w-0'>
          <EllipsisText text={patient.chiefComplaint} />
          <div className='truncate' style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            {patient.diagnosis}
          </div>
        </div>
      );
    },
  },
  {
    key: 'vitals',
    label: 'สัญญาณชีพล่าสุด',
    width: 176,
    align: 'center',
    sortable: false,
    render: (patient) => {
      const latest = patient.vitalsTrend?.[patient.vitalsTrend.length - 1];
      if (!latest) return '-';
      return (
        <div style={{ fontWeight: 'var(--type-weight-bold)' }}>
          <div>{latest.bpSys}/{latest.bpDia} mmHg</div>
          <div style={{ fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-regular)', color: 'var(--text-content-tertiary)' }}>
            P: {latest.pulse} | SpO2: {latest.spo2}%
          </div>
        </div>
      );
    },
  },
  {
    key: 'ews',
    label: 'EWS Score',
    width: 128,
    align: 'center',
    render: (patient) => {
      const latest = patient.vitalsTrend?.[patient.vitalsTrend.length - 1];
      if (!latest) return '-';
      const ews = scorePatientVitals(patient, latest);
      return (
        <StatusBadge style={ews.tier.style} size='small' showDot>
          {ews.score} ({ews.scale.short})
        </StatusBadge>
      );
    },
  },
  {
    key: 'status',
    label: 'สถานะ',
    width: 128,
    align: 'center',
    render: (patient) => {
      if (!hasPatient(patient)) {
        return patient.status === BED_CLEANING_STATUS
          ? <StatusBadge style='warning' size='small'>รอทำความสะอาด</StatusBadge>
          : '-';
      }
      /* Only two status words surface anywhere in the UI now — matches
         the two-tab structure (กำลังสังเกตอาการ / รายการที่ส่งต่อแล้ว)
         instead of exposing ready_discharge vs. discharged as distinct
         wording. */
      const isReferred = patient.status === 'ready_discharge' || patient.status === 'discharged';
      const style = isReferred ? 'success' : 'info';
      const label = isReferred ? 'ส่งต่อแล้ว' : 'กำลังสังเกตอาการ';
      const latest = patient.vitalsTrend?.[patient.vitalsTrend.length - 1];
      const redAlert =
        patient.status === 'observing' && latest && scorePatientVitals(patient, latest).score >= EWS_RED_ALERT_SCORE;
      return (
        <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <StatusBadge style={style} size='small'>{label}</StatusBadge>
          {redAlert && <AlertChip tone='red' icon='emergency_home'>Code Red</AlertChip>}
        </div>
      );
    },
  },
];

export default function ObservationQueuePage() {
  const history = useHistory();
  const [patients, setPatients] = useState(MOCK_OBSERVATION_PATIENTS);
  const columns = React.useMemo(
    () => [
      ...OBSERVATION_QUEUE_BASE_COLUMNS,
      {
        key: 'actions',
        label: 'เครื่องมือ',
        /* Wide enough for the longest label ("ประวัติการสังเกตอาการ") to
           render on one line without the button clipping its own text. */
        width: 210,
        align: 'right',
        sortable: false,
        render: (patient) => {
          if (patient.status === BED_CLEANING_STATUS) {
            return (
              <BrandSubdueButton
                variant='outline'
                leadingIcon='cleaning_services'
                size='sm'
                onClick={(e) => { e.stopPropagation(); handleFinishCleaning(patient.id); }}
              >
                ทำความสะอาดเสร็จ
              </BrandSubdueButton>
            );
          }
          if (patient.status === 'empty') {
            return (
              <BrandSubdueButton
                leadingIcon='add'
                size='sm'
                onClick={(e) => {
                  e.stopPropagation();
                  setAdmitForm((prev) => ({ ...prev, bedId: patient.id }));
                  setPatientSearchQuery('');
                  setShowAdmitModal(true);
                }}
              >
                ครองเตียง
              </BrandSubdueButton>
            );
          }
          const isFinishedObserving = patient.status === 'ready_discharge' || patient.status === 'discharged';
          return (
            <BrandSubdueButton
              variant='outline'
              leadingIcon='clinical_notes'
              size='sm'
              onClick={(e) => {
                e.stopPropagation();
                history.push(isFinishedObserving ? `/observation/history/${patient.id}` : `/observation/record/${patient.id}`);
              }}
            >
              {isFinishedObserving ? 'ประวัติการสังเกตอาการ' : 'สังเกตอาการ'}
            </BrandSubdueButton>
          );
        },
      },
    ],
    [history],
  );
  const [activeTab, setActiveTab] = useState('observing');
  const [searchQuery, setSearchQuery] = useState('');
  /* Shared filter-tag state for both tabs. "กำลังสังเกตอาการ" only exposes
     ผู้สั่ง/พยาบาลรับผู้ป่วย (its beds are all "now", so date/bed/status add
     little); "รายการที่ส่งต่อแล้ว" rolls up every past episode and gets
     the full set — วันที่, เตียง, สถานะ, ผู้สั่ง, พยาบาลผู้รับผู้ป่วย.
     'all' means "no filter applied" for that field, except `date`, which
     is a FilterDateTag value ({quick, tab?, single?, range?}, same shape
     as ConsentReportPage's "วัน:" filter) defaulting to "เดือนนี้". Reset
     on tab switch (see onTabChange) so a selection made on one tab can't
     silently zero out the other's results. */
  const DEFAULT_ALL_TAB_FILTERS = {
    date: { quick: 'thismonth' }, bed: 'all', status: 'all', doctor: 'all', nurse: 'all',
  };
  const [allTabFilters, setAllTabFilters] = useState(DEFAULT_ALL_TAB_FILTERS);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const QUEUE_PAGE_SIZE = 20;
  const [queuePage, setQueuePage] = useState(1);
  /* Table-view header sorting — same sortConfig/handleSort/collator
     pattern as the OPD screening worklist (opd/QueuePage.jsx). */
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  // Modal states for Quick Vitals Log & Admit Patient
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [selectedPatientForVitals, setSelectedPatientForVitals] = useState(null);
  const [vitalsForm, setVitalsForm] = useState({ bpSys: '', bpDia: '', pulse: '', temp: '', spo2: '', rr: '', note: '' });
  /* VitalCard/PressureCard's `required` prop only renders the asterisk —
     unlike InputField it never reaches a native <input>, so nothing
     blocks an all-empty submit on its own. Track each field's validity
     explicitly (same pattern as ObservationDetailPage's Add Timed Vitals
     form) and gate the submit button + handler on it. */
  const [vitalsFieldValidity, setVitalsFieldValidity] = useState({});
  const setVitalsFieldValid = (field, valid) =>
    setVitalsFieldValidity((prev) => (prev[field] === valid ? prev : { ...prev, [field]: valid }));
  const isVitalsFormValid = ['pressure', 'pulse', 'temp', 'spo2', 'rr'].every((f) => vitalsFieldValidity[f] === true);

  const [showAdmitModal, setShowAdmitModal] = useState(false);
  /* Admit modal's bed picker — reuses the same BedSelectionPopup (photo
     tiles) as OPD screening's "เลือกเตียงผู้ป่วย" instead of a plain
     dropdown. Only offers empty beds (plus whichever bed is currently
     targeted, so re-opening the picker mid-edit still shows the pick). */
  const [showBedPickerModal, setShowBedPickerModal] = useState(false);

  /* "เพิ่มเตียงใหม่เข้าระบบ" — adds a brand-new empty bed to the ward
     (distinct from admitting a patient into an existing one). bedTypeId
     picks a photo + default description from the same MOCK_PATIENT_BEDS
     catalogue the admit modal's bed picker uses; เลขเตียง is never
     user-editable — it's always "the next number after the last bed". */
  const [showAddBedModal, setShowAddBedModal] = useState(false);
  /* Nothing pre-selected on open — "เพิ่มเตียง" stays disabled until the
     ward staff actually picks a bed type (see the popup's primaryAction). */
  const NEW_BED_FORM_DEFAULT = { bedTypeId: null, description: '' };
  const [newBedForm, setNewBedForm] = useState(NEW_BED_FORM_DEFAULT);

  /* "ย้ายด่วนเข้าห้องฉุกเฉิน (Code Red)" — the EWS Red Alert shortcut
     (edge case #1). Holds the patient being escalated (null = closed). */
  const [erTransferPatient, setErTransferPatient] = useState(null);
  const [erTransferReason, setErTransferReason] = useState('');

  const [admitForm, setAdmitForm] = useState({
    bedId: 'obs-005',
    patientName: '',
    hn: '',
    vn: `VN${new Date().toISOString().slice(2,10).replace(/-/g,'')}-0${Math.floor(Math.random()*90+10)}`,
    age: '',
    gender: 'ชาย',
    chiefComplaint: '',
    diagnosis: '',
    doctorName: 'นพ. วรวิทย์ เกียรติเจริญ',
    nurseName: 'พว. สุภาพร ชัยมงคล',
    avatar: '',
  });

  /* "ค้นหาผู้ป่วยเดิม" — pulls an already-registered patient's info (name,
     HN, sex, age, avatar) from the shared PATIENT_PROFILES mock instead of
     retyping it, same PrimarySearch component/pattern as OPD screening's
     patient lookup. Query matches full name or HN, case-insensitive. */
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const patientSearchSuggestions = (() => {
    const q = patientSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return PATIENT_PROFILES
      .filter((p) => p.fullName.toLowerCase().includes(q) || p.hn.toLowerCase().includes(q))
      .slice(0, 8)
      .map((p) => ({
        id: p.hn,
        label: p.fullName,
        sublabel: `HN: ${p.hn} • ${p.sex}, ${p.age}`,
        value: p.hn,
        avatarSrc: p.avatarUrl,
      }));
  })();
  const handleSelectPatientFromSearch = (hn) => {
    const p = getPatientByHN(hn);
    if (!p) return;
    /* age is a verbose "42 ปี - 3 เดือน - 8 วัน" string in the shared
       profile — the admit form only tracks whole years. */
    const ageYears = parseInt(p.age, 10);
    setAdmitForm((prev) => ({
      ...prev,
      patientName: p.fullName,
      hn: p.hn,
      gender: p.sex,
      age: Number.isNaN(ageYears) ? prev.age : String(ageYears),
      avatar: p.avatarUrl || '',
    }));
    setPatientSearchQuery('');
  };

  // Calculate summary counts
  /* patients also carries 40 historical "รายการที่ส่งต่อแล้ว" mock records
     (id prefix obs-ref-) that were never a distinct physical bed slot, so
     patients.length would over-count the ward's real 10-bed inventory. */
  const totalBeds = patients.filter(isPhysicalBed).length;
  const occupiedCount = patients.filter((p) => p.status === 'observing').length;
  const emptyCount = patients.filter(isBedAvailable).length;
  /* Beds that are free of a patient but not yet usable — they must not
     count as available, or Full Capacity would never fire while dirty
     beds sit in the ward (edge case #9). */
  const cleaningCount = patients.filter((p) => p.status === BED_CLEANING_STATUS).length;
  /* "พร้อมจำหน่าย" no longer owns a separate tab — those patients (plus
     anyone already fully discharged) now live under the "รายการที่ส่งต่อ
     แล้ว" tab, so the summary strip mirrors the same two-tab split
     instead of the old 4-status breakdown. */
  const referredCount = patients.filter((p) => p.status === 'ready_discharge' || p.status === 'discharged').length;
  const criticalCount = patients.filter((p) => {
    if (p.status === 'empty') return false;
    const latest = p.vitalsTrend?.[p.vitalsTrend.length - 1];
    if (!latest) return false;
    return scorePatientVitals(p, latest).score >= 3;
  }).length;
  /* Edge case #4 — "เตียงหลักถูกครองเต็มทั้งหมด (0 เตียงว่าง)". Only the
     ward's physical beds count (obs-ref-* history rows were never a bed
     slot), and the ward must actually HAVE beds for "full" to mean
     anything. */
  const isFullCapacity = totalBeds > 0 && emptyCount === 0;
  /* Edge case #2 — how many current patients have outstayed the 6-hour
     Day-Bed standard and need the attending doctor to re-evaluate. */
  /* Wrapped, not passed by reference — Array.filter would hand the index
     in as isOverstay's `now` argument and every stay would measure zero. */
  const overstayCount = patients.filter((p) => isOverstay(p)).length;

  const summaryCards = [
    { key: 'total', label: 'เตียงทั้งหมด', value: `${totalBeds} เตียง`, indicator: 'พร้อมใช้งาน 24 ชม.', color: 'info', icon: 'hotel' },
    { key: 'observing', label: 'กำลังสังเกตอาการ', value: `${occupiedCount} ราย`, indicator: 'ครองเตียงสังเกตอาการ', color: 'info', icon: 'child_care' },
    /* Flips to a destructive "เตียงเต็ม" reading at 0 rather than quietly
       showing "0 เตียง · พร้อมรับผู้ป่วยใหม่", which would read as fine. */
    {
      key: 'empty',
      label: 'เตียงว่าง',
      value: `${emptyCount} เตียง`,
      indicator: isFullCapacity
        ? 'เตียงเต็ม (Full Capacity)'
        : cleaningCount > 0
        ? `พร้อมรับผู้ป่วยใหม่ · รอทำความสะอาด ${cleaningCount} เตียง`
        : 'พร้อมรับผู้ป่วยใหม่',
      color: isFullCapacity ? 'destructive' : 'positive',
      icon: isFullCapacity ? 'do_not_disturb_on' : 'meeting_room',
    },
    { key: 'referred', label: 'รายการที่ส่งต่อแล้ว', value: `${referredCount} ราย`, indicator: 'จำหน่าย/ส่งต่อสำเร็จ', color: 'positive', icon: 'check_circle' },
    { key: 'overstay', label: `ครองเตียงเกิน ${OVERSTAY_LIMIT_MINUTES / 60} ชม.`, value: `${overstayCount} ราย`, indicator: 'รอแพทย์ประเมินซ้ำ', color: 'inprogress', icon: 'hourglass_top' },
    { key: 'critical', label: 'เฝ้าระวังพิเศษ (EWS ≥3)', value: `${criticalCount} ราย`, indicator: 'ประเมินด่วนที่สุด', color: 'destructive', icon: 'warning' },
  ];

  const tabs = [
    { key: 'observing', label: `กำลังสังเกตอาการ (${occupiedCount})` },
    { key: 'all', label: `รายการที่ส่งต่อแล้ว (${referredCount})` },
  ];

  /* สถานะ labels shared between the status filter (all-tab) and anywhere
     else a patient.status needs to read as Thai. Only two words surface
     anywhere in the UI — กำลังสังเกตอาการ / ส่งต่อแล้ว — matching the
     two-tab structure; ready_discharge and discharged both read as
     "ส่งต่อแล้ว" since both mean "done with active observation". */
  const STATUS_LABELS = {
    observing: 'กำลังสังเกตอาการ',
    ready_discharge: 'ส่งต่อแล้ว',
    discharged: 'ส่งต่อแล้ว',
    empty: 'เตียงว่าง',
    [BED_CLEANING_STATUS]: 'รอทำความสะอาด',
  };

  const uniqueSorted = (arr) => Array.from(new Set(arr.filter(Boolean))).sort();

  /* Resolves a FilterDateTag value ({quick, tab?, single?, range?}) to a
     concrete {start, end} Date span, reusing DateFilterPopup's own quick
     resolvers so "เดือนนี้" etc. stay in lockstep with the popup. */
  const resolveDateFilterRange = (value) => {
    if (!value?.quick) return null;
    if (value.quick === 'custom') {
      if (value.tab === 'single' && value.single) return { start: value.single, end: value.single };
      if (value.tab === 'range' && value.range?.start && value.range?.end) return value.range;
      return null;
    }
    const single = computeQuickSingle(value.quick);
    if (single) return { start: single, end: single };
    return computeQuickRange(value.quick);
  };

  const matchesDateFilter = (admitTime, value) => {
    const range = resolveDateFilterRange(value);
    if (!range) return true;
    const datePart = admitTime?.split(' ')[0];
    if (!datePart) return false;
    const d = new Date(datePart);
    if (Number.isNaN(d.getTime())) return false;
    return d >= range.start && d <= range.end;
  };

  /* Filter-tag option lists for the "รายการที่ส่งต่อแล้ว" tab — built only
     from patients that tab can ever show (ready_discharge / discharged),
     so the dropdowns never offer a choice that would return zero rows. */
  const allTabFilterOptions = (() => {
    const referred = patients.filter((p) => p.status === 'ready_discharge' || p.status === 'discharged');
    return {
      bed: [
        { value: 'all', label: 'ทั้งหมด' },
        ...uniqueSorted(referred.map((p) => p.bedNo)).map((b) => ({
          value: b,
          label: b,
          /* Same bedType → photo lookup as the admit modal's bed picker;
             a bedNo can have hosted different bedTypes across episodes,
             so just take whichever the most recent matching record has. */
          image: getBedImageForType(referred.find((p) => p.bedNo === b)?.bedType),
        })),
      ],
      status: [
        { value: 'all', label: 'ทั้งหมด' },
        /* Dedupe by resolved label, not raw status — ready_discharge and
           discharged both read as "ส่งต่อแล้ว" now, so they collapse to
           one option instead of showing the same word twice. */
        ...uniqueSorted(referred.map((p) => STATUS_LABELS[p.status] || p.status)).map((label) => ({ value: label, label })),
      ],
      doctor: [
        { value: 'all', label: 'ทั้งหมด' },
        ...uniqueSorted(referred.map((p) => p.doctorName)).map((d) => ({ value: d, label: d, image: avatarForName(d) })),
      ],
      nurse: [
        { value: 'all', label: 'ทั้งหมด' },
        ...uniqueSorted(referred.map((p) => p.nurseName)).map((n) => ({ value: n, label: n, image: avatarForName(n) })),
      ],
    };
  })();

  /* "กำลังสังเกตอาการ" only needs ผู้สั่ง / พยาบาลรับผู้ป่วย — every row on
     that tab is a currently-occupied (or empty) bed, so date/bed/status
     would be redundant with what's already visible on each card. */
  const observingFilterOptions = (() => {
    const observing = patients.filter((p) => p.status === 'observing');
    return {
      doctor: [
        { value: 'all', label: 'ทั้งหมด' },
        ...uniqueSorted(observing.map((p) => p.doctorName)).map((d) => ({ value: d, label: d, image: avatarForName(d) })),
      ],
      nurse: [
        { value: 'all', label: 'ทั้งหมด' },
        ...uniqueSorted(observing.map((p) => p.nurseName)).map((n) => ({ value: n, label: n, image: avatarForName(n) })),
      ],
    };
  })();

  // Filter patients based on tab & search
  const filteredPatients = patients.filter((p) => {
    if (activeTab === 'observing') {
      if (!(p.status === 'observing' || p.status === 'empty' || p.status === BED_CLEANING_STATUS)) return false;
      if (allTabFilters.doctor !== 'all' && p.doctorName !== allTabFilters.doctor) return false;
      if (allTabFilters.nurse !== 'all' && p.nurseName !== allTabFilters.nurse) return false;
    }

    if (activeTab === 'all') {
      if (!(p.status === 'ready_discharge' || p.status === 'discharged')) return false;
      if (!matchesDateFilter(p.admitTime, allTabFilters.date)) return false;
      if (allTabFilters.bed !== 'all' && p.bedNo !== allTabFilters.bed) return false;
      if (allTabFilters.status !== 'all' && (STATUS_LABELS[p.status] || p.status) !== allTabFilters.status) return false;
      if (allTabFilters.doctor !== 'all' && p.doctorName !== allTabFilters.doctor) return false;
      if (allTabFilters.nurse !== 'all' && p.nurseName !== allTabFilters.nurse) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.patientName?.toLowerCase().includes(q);
      const matchHn = p.hn?.toLowerCase().includes(q);
      const matchBed = p.bedNo?.toLowerCase().includes(q);
      const matchDoctor = p.doctorName?.toLowerCase().includes(q);
      return matchName || matchHn || matchBed || matchDoctor;
    }
    return true;
  });

  /* Table-view header sorting (applies to both tabs' table view) — normalize
     each sortable column key to a comparable value, same shape as OPD
     QueuePage.jsx's own normalize/sortedRows. */
  const sortedPatients = (() => {
    if (!sortConfig.key) return filteredPatients;
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
    const normalize = (p, key) => {
      switch (key) {
        case 'name': return p.patientName || '';
        case 'genderAge': return p.age ?? -1;
        case 'ews': {
          const latest = p.vitalsTrend?.[p.vitalsTrend.length - 1];
          return latest ? scorePatientVitals(p, latest).score : -1;
        }
        case 'status': return STATUS_LABELS[p.status] || p.status || '';
        default: return p[key] ?? '';
      }
    };
    return [...filteredPatients].sort((a, b) => {
      const av = normalize(a, sortConfig.key);
      const bv = normalize(b, sortConfig.key);
      if (typeof av === 'number' && typeof bv === 'number') return sign * (av - bv);
      return sign * collator.compare(String(av), String(bv));
    });
  })();

  /* Pagination — 20 rows/page, same pattern as ObservationDetailPage's
     timeline. Mostly matters for "รายการที่ส่งต่อแล้ว" (40 mock rows);
     "กำลังสังเกตอาการ" never exceeds the physical bed count so it just
     always renders as a single page. */
  useEffect(() => { setQueuePage(1); }, [activeTab, searchQuery, JSON.stringify(allTabFilters), sortConfig.key, sortConfig.direction]);
  const queueTotalPages = Math.max(1, Math.ceil(filteredPatients.length / QUEUE_PAGE_SIZE));
  const queuePageClamped = Math.min(queuePage, queueTotalPages);
  const pagedPatients = sortedPatients.slice(
    (queuePageClamped - 1) * QUEUE_PAGE_SIZE,
    queuePageClamped * QUEUE_PAGE_SIZE,
  );
  const queueRangeStart = filteredPatients.length === 0 ? 0 : (queuePageClamped - 1) * QUEUE_PAGE_SIZE + 1;
  const queueRangeEnd = Math.min(queuePageClamped * QUEUE_PAGE_SIZE, filteredPatients.length);

  const handleOpenVitalsModal = (patient) => {
    setSelectedPatientForVitals(patient);
    /* Blank fields — this logs a NEW timed vital-signs entry, so it must
       not silently carry over the patient's last reading (that would let
       a nurse save a stale duplicate without actually re-measuring). */
    setVitalsForm({ bpSys: '', bpDia: '', pulse: '', temp: '', spo2: '', rr: '', note: '' });
    setShowVitalsModal(true);
  };

  const handleSaveVitals = (e) => {
    e.preventDefault();
    if (!selectedPatientForVitals) return;
    /* Guard against implicit submission (Enter inside a VitalCard number
       input submits the form even when the visible button is disabled). */
    if (!isVitalsFormValid) return;
    /* Out-of-bound range check (edge case #5). AddVitalsModal already
       disables its own save button on this, but Enter inside a VitalCard
       number input can still reach this handler — a physiologically
       impossible reading must never make it into vitalsTrend. */
    if (getOutOfRangeVitals(vitalsForm).length > 0) return;

    const nowStr = `${new Date().getHours().toString().padStart(2,'0')}:${new Date().getMinutes().toString().padStart(2,'0')} น.`;
    const newVitalLog = {
      time: nowStr,
      bpSys: Number(vitalsForm.bpSys),
      bpDia: Number(vitalsForm.bpDia),
      pulse: Number(vitalsForm.pulse),
      temp: Number(vitalsForm.temp),
      spo2: Number(vitalsForm.spo2),
      rr: Number(vitalsForm.rr),
      note: vitalsForm.note || 'บันทึกสัญญาณชีพประจำช่วงเวลา',
    };

    /* Deterioration Event (edge case #1) — when a freshly logged reading
       is what pushes EWS over the red-alert line, the system writes the
       event into the trend itself rather than relying on the nurse to
       ALSO remember to record a note about the deterioration. Only fires
       on the crossing, so a patient who stays critical across several
       readings doesn't accumulate one event per measurement. */
    const prevLatest = selectedPatientForVitals.vitalsTrend?.[selectedPatientForVitals.vitalsTrend.length - 1];
    const prevScore = prevLatest ? scorePatientVitals(selectedPatientForVitals, prevLatest).score : 0;
    const newScore = scorePatientVitals(selectedPatientForVitals, newVitalLog).score;
    const isDeterioration = newScore >= EWS_RED_ALERT_SCORE && prevScore < EWS_RED_ALERT_SCORE;
    if (isDeterioration) newVitalLog.deteriorationEvent = true;

    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === selectedPatientForVitals.id) {
          return {
            ...p,
            vitalsTrend: [...p.vitalsTrend, newVitalLog],
            nursingNotes: isDeterioration
              ? [
                  ...p.nursingNotes,
                  {
                    time: nowStr,
                    nurse: p.nurseName,
                    note: `Deterioration Event: คะแนน EWS พุ่งขึ้นเป็น ${newScore} (จากเดิม ${prevScore}) — ระบบบันทึกอัตโนมัติ ให้รายงานแพทย์ผู้ดูแลด่วนและพิจารณาย้ายเข้าห้องฉุกเฉิน`,
                  },
                ]
              : p.nursingNotes,
          };
        }
        return p;
      })
    );
    setShowVitalsModal(false);
  };

  /* "ย้ายด่วนเข้าห้องฉุกเฉิน (Code Red)" — edge case #1's shortcut off the
     red-alert bed card. Follows the same record shape ObservationDetail
     Page's commitDischarge writes (status 'discharged' + a dischargeSummary
     naming the destination), so an escalated patient lands in the
     "รายการที่ส่งต่อแล้ว" tab exactly like any other referral instead of
     inventing a fourth status the filters don't know about. */
  const handleConfirmErTransfer = () => {
    if (!erTransferPatient) return;
    const now = new Date();
    const nowClock = formatObservationDateTime(now).split(' ').slice(1).join(' ');
    const latest = erTransferPatient.vitalsTrend?.[erTransferPatient.vitalsTrend.length - 1];
    const score = latest ? scorePatientVitals(erTransferPatient, latest).score : 0;
    const reason = erTransferReason.trim();

    setPatients((prev) => {
      const index = prev.findIndex((p) => p.id === erTransferPatient.id);
      if (index === -1) return prev;
      const current = prev[index];
      /* Fork the episode off the bed (edge case #9) — the escalation
         becomes a history row, and the physical bed comes straight back
         to the ward as `cleaning` instead of staying occupied forever by
         a patient who is no longer there. */
      const { episode, bed } = splitEpisodeFromBed(
        {
          ...current,
          nursingNotes: [
            ...current.nursingNotes,
            {
              time: nowClock,
              nurse: current.nurseName,
              note: `Code Red — ย้ายด่วนเข้าห้องฉุกเฉิน (ER) ขณะ EWS ${score}${reason ? ` · ${reason}` : ''}`,
            },
          ],
          dischargeSummary: {
            ...(current.dischargeSummary || {}),
            disposition: 'refer',
            referScope: 'internal',
            referDepartment: 'ห้องฉุกเฉิน (ER)',
            referHospital: '',
            doctorSummary: `ย้ายด่วนเข้าห้องฉุกเฉิน (Code Red) ขณะคะแนน EWS ${score}${reason ? ` · ${reason}` : ''}`,
            dischargeVitals: latest ? { ...latest } : null,
            isDischarged: true,
          },
        },
        {
          episodeId: `obs-hist-${current.id}-${now.getTime()}`,
          dischargeTime: formatObservationDateTime(now),
          patch: { status: 'discharged' },
        },
      );
      const next = [...prev];
      next[index] = bed;
      next.push(episode);
      return next;
    });
    setErTransferPatient(null);
    setErTransferReason('');
  };

  /* Housekeeping has changed the linen — the bed rejoins the pool of
     beds that can actually take a patient. */
  const handleFinishCleaning = (bedId) =>
    setPatients((prev) => prev.map((p) => (p.id === bedId ? { ...p, status: 'empty' } : p)));

  const handleAdmitSubmit = (e) => {
    e.preventDefault();
    const nowStr = `${new Date().getFullYear()}-${(new Date().getMonth()+1).toString().padStart(2,'0')}-${new Date().getDate().toString().padStart(2,'0')} ${new Date().getHours().toString().padStart(2,'0')}:${new Date().getMinutes().toString().padStart(2,'0')} น.`;

    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === admitForm.bedId) {
          return {
            ...p,
            status: 'observing',
            patientName: admitForm.patientName,
            hn: admitForm.hn,
            vn: admitForm.vn,
            age: Number(admitForm.age) || 45,
            gender: admitForm.gender,
            avatar: admitForm.avatar || '',
            admitTime: nowStr,
            dischargeTime: '',
            chiefComplaint: admitForm.chiefComplaint,
            diagnosis: admitForm.diagnosis || 'Observe Symptoms',
            doctorName: admitForm.doctorName,
            nurseName: admitForm.nurseName,
            rights: 'สิทธิบัตรทอง (NHSO)',
            vitalsTrend: [
              { time: `${new Date().getHours().toString().padStart(2,'0')}:${new Date().getMinutes().toString().padStart(2,'0')} น.`, bpSys: 130, bpDia: 85, pulse: 88, temp: 36.8, spo2: 98, rr: 18, note: 'แรกรับเข้าเตียงสังเกตอาการ' }
            ],
            statOrders: [],
            nursingNotes: [
              { time: `${new Date().getHours().toString().padStart(2,'0')}:${new Date().getMinutes().toString().padStart(2,'0')} น.`, nurse: admitForm.nurseName, note: 'แรกรับผู้ป่วยเข้านอนเตียงสังเกตอาการ' }
            ],
            dischargeSummary: {
              disposition: 'home',
              doctorSummary: '',
              dischargeVitals: null,
              dischargeAdvice: '',
              referHospital: '',
              isDischarged: false,
            }
          };
        }
        return p;
      })
    );
    setShowAdmitModal(false);
  };

  const selectedBed = patients.find((p) => p.id === admitForm.bedId);
  /* Only empty beds are offered (plus whichever bed is currently targeted,
     so switching bed mid-pick still shows it) — occupied beds have no
     equivalent of BedSelectionPopup's own "disabled" state, so they're
     filtered out entirely instead of shown-but-unclickable. */
  const observationBedOptions = patients
    .filter((p) => isBedAvailable(p) || p.id === admitForm.bedId)
    .map((p) => ({
      id: p.id,
      code: p.bedNo,
      title: p.bedType,
      description: isBedAvailable(p) ? 'ว่าง พร้อมรับผู้ป่วย' : 'เตียงที่เลือกอยู่ในปัจจุบัน',
      imageSrc: resolveBedImage(p),
    }));

  /* "เลขเตียง" for a new bed is always "the next number after the last
     bed" — physical ward beds only (obs-ref-* history rows never held a
     real bed slot, so they don't count toward the sequence). */
  const wardBedCount = patients.filter(isPhysicalBed).length;
  const nextBedNumber = wardBedCount + 1;
  /* A bed registered while the ward is at Full Capacity is an EXTRA bed
     (stretcher / recliner rolled in for an emergency), not a permanent
     ward bed — it keeps the running number but carries the "-Extra"
     suffix the TOR asks for ("เตียง 07-Extra"), so the roster still reads
     at a glance which beds are the ward's real inventory. */
  const isNextBedExtra = isFullCapacity;
  const nextBedNo = `เตียง ${String(nextBedNumber).padStart(2, '0')}${isNextBedExtra ? '-Extra' : ''}`;
  const nextBedId = `obs-${String(nextBedNumber).padStart(3, '0')}`;

  const handleAddBed = () => {
    setPatients((prev) => [
      ...prev,
      {
        id: nextBedId,
        bedNo: nextBedNo,
        /* Free-text description (not a catalogue title) — resolveBedImage
           uses bedPhotoId below to still find the right photo. */
        bedType: newBedForm.description.trim(),
        bedPhotoId: newBedForm.bedTypeId,
        isExtraBed: isNextBedExtra,
        status: 'empty',
        severity: 'normal',
        patientName: '',
        hn: '',
        vn: '',
        age: null,
        gender: '',
        admitTime: '',
        dischargeTime: '',
        chiefComplaint: '',
        diagnosis: '',
        doctorName: '',
        nurseName: '',
        rights: '',
        vitalsTrend: [],
        statOrders: [],
        nursingNotes: [],
        dischargeSummary: null,
      },
    ]);
    setNewBedForm(NEW_BED_FORM_DEFAULT);
    setShowAddBedModal(false);
  };

  return (
    <QueuePageShell
      activeKey='observation'
      breadcrumb={['หน้าหลัก PHCIS', 'ระบบสังเกตอาการ (Observation)']}
      title='ห้องเฝ้าสังเกตอาการ (Observation Unit)'
      summaryCards={summaryCards}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(key) => {
        setActiveTab(key);
        setAllTabFilters(DEFAULT_ALL_TAB_FILTERS);
      }}
      actions={
        <div className='flex items-center gap-2'>
          {/* At Full Capacity the same action re-labels itself as the
              TOR's "ลงทะเบียนเตียงเสริม" (edge case #4) — it's the same
              add-a-bed flow, but the ward staff is now doing it because
              every bed is taken, and the bed it creates is suffixed
              "-Extra" accordingly. */}
          <BrandSubdueButton
            variant='outline'
            leadingIcon='add'
            onClick={() => {
              setNewBedForm(NEW_BED_FORM_DEFAULT);
              setShowAddBedModal(true);
            }}
          >
            {isFullCapacity ? 'ลงทะเบียนเตียงเสริม (Extra Bed)' : 'เพิ่มเตียงใหม่เข้าระบบ'}
          </BrandSubdueButton>
          <BrandPrimaryButton leadingIcon='add' onClick={() => { setPatientSearchQuery(''); setShowAdmitModal(true); }}>
            รับผู้ป่วยเข้าเตียงสังเกตอาการ
          </BrandPrimaryButton>
        </div>
      }
    >
      {/* Page Content Container with 24px Padding (Top, Left, Right, Bottom) */}
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600, 24px)',
          paddingLeft: 'var(--dim-space-600, 24px)',
          paddingRight: 'var(--dim-space-600, 24px)',
          paddingBottom: 'var(--dim-space-600, 24px)',
          gap: 'var(--dim-space-600, 24px)',
        }}
      >
        {/* Full Capacity banner (edge case #4) — sits ABOVE the worklist
            card because it's a ward-level condition, not a property of
            any one row: every bed is taken, so the only way to place the
            next emergency patient is to register an extra bed. */}
        {isFullCapacity && (
          <div
            role='alert'
            className='w-full flex flex-wrap items-center'
            style={{
              gap: 'var(--dim-space-300)',
              background: 'var(--surface-colorfulbadge-red, #FEE2E2)',
              border: 'var(--dim-stroke-100) solid var(--surface-colorfulbadge-red-bold, #EF4444)',
              borderRadius: 'var(--dim-radius-400)',
              paddingTop: 'var(--dim-space-400)',
              paddingRight: 'var(--dim-space-500)',
              paddingBottom: 'var(--dim-space-400)',
              paddingLeft: 'var(--dim-space-500)',
            }}
          >
            <span className='material-symbols-outlined' style={{ fontSize: 24, color: 'var(--text-colorfulbadge-red, #B91C1C)' }}>
              do_not_disturb_on
            </span>
            <div className='flex-1 min-w-0'>
              <div style={{ color: 'var(--text-colorfulbadge-red, #B91C1C)', fontSize: 'var(--type-size-base)', fontWeight: 'var(--type-weight-bold)' }}>
                เตียงเต็มทุกเตียง (Full Capacity)
              </div>
              <div style={{ color: 'var(--text-colorfulbadge-red, #B91C1C)', fontSize: 'var(--type-size-sm)' }}>
                เตียงสังเกตอาการถูกครองครบทั้ง {totalBeds} เตียง — หากมีผู้ป่วยฉุกเฉินต้องการเตียงเพิ่ม ให้ลงทะเบียนเตียงเสริม ({nextBedNo})
              </div>
            </div>
            <BrandPrimaryButton
              leadingIcon='add'
              onClick={() => {
                setNewBedForm(NEW_BED_FORM_DEFAULT);
                setShowAddBedModal(true);
              }}
            >
              ลงทะเบียนเตียงเสริม (Extra Bed / Stretcher)
            </BrandPrimaryButton>
          </div>
        )}

        {/* Main White Body Card Surface (Matching Screening / OPD Queue Work List Page) */}
        <div
          className='w-full flex flex-col space-y-6'
          style={{
            background: 'var(--surface-card-100, #FFFFFF)',
            borderRadius: 'var(--dim-radius-500, 24px)',
            border: 'none',
            boxShadow: 'var(--shadow-card-strong, 0 4px 20px rgba(0,0,0,0.05))',
            padding: 'var(--dim-space-600, 24px)',
          }}
        >
        {/* Centered Primary Search (Figma 115:35757 / 2056:4246 — 640px centered search box) */}
        <div className='w-full flex items-start justify-center pt-2'>
          <PrimarySearch
            value={searchQuery}
            onChange={(val) => setSearchQuery(val)}
            placeholder='ค้นหาคิว / HN / ชื่อ-สกุลผู้ป่วย / เลขเตียง / แพทย์ผู้ดูแล...'
            width={640}
            emptyMessage='ไม่พบข้อมูลเตียงสังเกตอาการที่ค้นหา'
          />
        </div>

        {/* Filter row + view toggle — "รายการที่ส่งต่อแล้ว" rolls up every
            referred/discharged episode, so it gets its own filter set
            (วันที่ / เตียง / สถานะ / ผู้สั่ง / พยาบาลผู้รับผู้ป่วย); the
            observing tab only shows ผู้สั่ง / พยาบาลผู้รับผู้ป่วย, since
            every row there is a currently-occupied (or empty) bed. Both
            share this row with the grid/list ViewToggle. */}
        <div className='w-full flex flex-wrap items-center justify-between gap-2 pt-2'>
          <div className='flex flex-wrap items-center gap-2'>
            {activeTab === 'all' && (
              <>
                <FilterDateTag
                  prefix='วันที่'
                  value={allTabFilters.date}
                  onChange={(val) => setAllTabFilters((prev) => ({ ...prev, date: val }))}
                  defaultQuick='thismonth'
                />
                <FilterDropdown
                  prefix='เตียง'
                  leadingIcon='bed'
                  options={allTabFilterOptions.bed}
                  value={allTabFilters.bed}
                  onChange={(val) => setAllTabFilters((prev) => ({ ...prev, bed: val }))}
                />
                <FilterDropdown
                  prefix='สถานะ'
                  leadingIcon='monitor_heart'
                  options={allTabFilterOptions.status}
                  value={allTabFilters.status}
                  onChange={(val) => setAllTabFilters((prev) => ({ ...prev, status: val }))}
                />
                <FilterDropdown
                  prefix='ผู้สั่ง'
                  leadingIcon='stethoscope'
                  options={allTabFilterOptions.doctor}
                  value={allTabFilters.doctor}
                  onChange={(val) => setAllTabFilters((prev) => ({ ...prev, doctor: val }))}
                />
                <FilterDropdown
                  prefix='พยาบาลผู้รับผู้ป่วย'
                  leadingIcon='badge'
                  options={allTabFilterOptions.nurse}
                  value={allTabFilters.nurse}
                  onChange={(val) => setAllTabFilters((prev) => ({ ...prev, nurse: val }))}
                />
              </>
            )}
            {activeTab === 'observing' && (
              <>
                <FilterDropdown
                  prefix='ผู้สั่ง'
                  leadingIcon='stethoscope'
                  options={observingFilterOptions.doctor}
                  value={allTabFilters.doctor}
                  onChange={(val) => setAllTabFilters((prev) => ({ ...prev, doctor: val }))}
                />
                <FilterDropdown
                  prefix='พยาบาลรับผู้ป่วย'
                  leadingIcon='badge'
                  options={observingFilterOptions.nurse}
                  value={allTabFilters.nurse}
                  onChange={(val) => setAllTabFilters((prev) => ({ ...prev, nurse: val }))}
                />
              </>
            )}
          </div>

          {/* Same grid/list ViewToggle used by ConsentFormsPage (Figma
              "Tab Bar / Pill" 291:113045 · 334:134446) instead of a
              bespoke icon-button pair. */}
          <ViewToggle
            value={viewMode === 'table' ? 'list' : 'grid'}
            onChange={(v) => setViewMode(v === 'list' ? 'table' : 'grid')}
          />
        </div>

      {/* Main Content Area */}
      {viewMode === 'grid' ? (
        filteredPatients.length === 0 ? (
          /* Table view already gets this via <Table emptyMessage>; the
             grid view rendered nothing at all for a no-match search. */
          <div
            className='flex flex-col items-center justify-center text-center'
            style={{ padding: 'var(--dim-space-900, 48px) 0', gap: 'var(--dim-space-200)' }}
          >
            <span className='material-symbols-outlined' style={{ fontSize: 40, color: 'var(--text-content-quaternary)' }}>
              search_off
            </span>
            <p style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-sm)' }}>
              ไม่พบข้อมูลเตียงสังเกตอาการที่ตรงกับเงื่อนไข
            </p>
          </div>
        ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
          {pagedPatients.map((patient) => {
            const isCleaning = patient.status === BED_CLEANING_STATUS;
            const isEmpty = patient.status === 'empty' || isCleaning;
            const latestVitals = patient.vitalsTrend?.[patient.vitalsTrend.length - 1];
            const ewsResult = latestVitals ? scorePatientVitals(patient, latestVitals) : null;
            /* เวลาเริ่มต้น / เวลาสิ้นสุด (TOR 1.14.1) — both come off the
               record's own full timestamps now, so a stay that crosses
               midnight still reads correctly (edge case #12). */
            const startTimeLabel = patient.admitTime ? patient.admitTime.split(' ').slice(1).join(' ') : '-';
            const isFinishedObserving = patient.status === 'ready_discharge' || patient.status === 'discharged';
            const endTimeLabel = patient.dischargeTime
              ? patient.dischargeTime.split(' ').slice(1).join(' ')
              : isFinishedObserving ? (latestVitals?.time || '-') : '-';
            /* Edge case #1 / #2 — both only apply to a patient still under
               active observation; a referred record's last-recorded EWS or
               total stay is history, not something to alarm about. */
            const isRedAlert = patient.status === 'observing' && (ewsResult?.score ?? 0) >= EWS_RED_ALERT_SCORE;
            const overstay = isOverstay(patient);

            if (isEmpty) {
              return (
                <div
                  key={patient.id}
                  className={`rounded-2xl p-6 flex flex-col items-center justify-center min-h-[564px] text-center transition-all group hover:shadow-[var(--shadow-card)]${isCleaning ? '' : ' cursor-pointer'}`}
                  style={{
                    background: isCleaning ? 'var(--surface-colorfulbadge-orange, #FFEDD5)' : 'var(--surface-neutral-quaternary)',
                    border: `var(--dim-stroke-200) dashed ${isCleaning ? 'var(--surface-colorfulbadge-orange-bold, #F97316)' : 'var(--border-card-default)'}`,
                  }}
                  onMouseEnter={(e) => {
                    if (isCleaning) return;
                    e.currentTarget.style.background = 'var(--surface-brandPrimary-quaternary)';
                    e.currentTarget.style.borderColor = 'var(--border-brandPrimary-default)';
                  }}
                  onMouseLeave={(e) => {
                    if (isCleaning) return;
                    e.currentTarget.style.background = 'var(--surface-neutral-quaternary)';
                    e.currentTarget.style.borderColor = 'var(--border-card-default)';
                  }}
                  onClick={() => {
                    /* A dirty bed can't take a patient — housekeeping has
                       to sign it off first (edge case #9). */
                    if (isCleaning) return;
                    setAdmitForm((prev) => ({ ...prev, bedId: patient.id }));
                    setShowAdmitModal(true);
                  }}
                >
                  <div
                    className='w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center mb-3 transition-all'
                    style={{
                      background: 'var(--surface-card-100)',
                      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
                      boxShadow: 'var(--shadow-2xs, none)',
                    }}
                  >
                    <img
                      src={resolveBedImage(patient)}
                      alt={patient.bedType}
                      className='w-full h-full object-cover'
                    />
                  </div>
                  <h3 style={{ fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default)', fontSize: 'var(--type-size-base)', marginBottom: 'var(--dim-space-050, 2px)' }}>
                    {patient.bedNo}
                  </h3>
                  {patient.isExtraBed && (
                    <div style={{ marginBottom: 'var(--dim-space-150, 6px)' }}>
                      <AlertChip tone='orange' icon='airline_seat_flat'>เตียงเสริม (Extra Bed)</AlertChip>
                    </div>
                  )}
                  <p
                    style={{
                      color: isCleaning ? 'var(--text-colorfulbadge-orange, #C2410C)' : 'var(--text-content-tertiary)',
                      fontSize: 'var(--type-size-xs)',
                      marginBottom: 'var(--dim-space-400)',
                    }}
                  >
                    {patient.bedType} ({isCleaning ? 'รอทำความสะอาด' : 'ว่าง'})
                  </p>
                  {isCleaning ? (
                    <BrandPrimaryButton
                      leadingIcon='cleaning_services'
                      size='lg'
                      variant='outline'
                      onClick={(e) => { e.stopPropagation(); handleFinishCleaning(patient.id); }}
                    >
                      ทำความสะอาดเสร็จ — เปิดใช้เตียง
                    </BrandPrimaryButton>
                  ) : (
                    <BrandPrimaryButton
                      leadingIcon='person_add'
                      size='lg'
                      variant='outline'
                      tabIndex={-1}
                    >
                      รับผู้ป่วยเข้าเตียง
                    </BrandPrimaryButton>
                  )}
                </div>
              );
            }

            return (
              <div
                key={patient.id}
                className={`rounded-2xl p-5 transition-all flex flex-col justify-between relative overflow-hidden mih-summary-card${isRedAlert ? ' mih-observation-card--alert-red' : ''}`}
                style={{
                  background: 'var(--surface-card-100)',
                  /* Left undefined (not 'none') under red alert so the
                     blinking border the CSS class owns isn't overridden
                     by this inline rule — inline always wins. */
                  border: isRedAlert ? undefined : 'none',
                  boxShadow: 'var(--shadow-card-strong)',
                }}
              >
                {/* Status bar accent */}
                <div
                  className='absolute top-0 left-0 right-0 h-1.5'
                  style={{
                    background:
                      ewsResult?.tier.level === 'high'
                        ? 'var(--surface-colorfulbadge-red-bold)'
                        : ewsResult?.tier.level === 'medium'
                        ? 'var(--surface-colorfulbadge-orange-bold)'
                        : 'var(--surface-colorfulbadge-green-bold)',
                  }}
                />

                {/* Card Header */}
                <div>
                  <div className='flex items-center justify-between mb-3 pt-1'>
                    <div className='flex items-center gap-2'>
                      <span
                        style={{
                          padding: 'var(--dim-space-150, 6px) var(--dim-space-250, 10px)',
                          background: 'var(--surface-brandPrimary-quaternary)',
                          color: 'var(--text-brandPrimary-default)',
                          borderRadius: 'var(--dim-radius-150, 6px)',
                          border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                          fontWeight: 'var(--type-weight-bold)',
                          fontSize: 'var(--type-size-xs)',
                        }}
                      >
                        {patient.bedNo}
                      </span>
                      <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)' }}>
                        {patient.rights}
                      </span>
                    </div>

                    <StatusBadge
                      style={
                        patient.status === 'ready_discharge' || patient.status === 'discharged'
                          ? 'success'
                          : ewsResult?.tier.level === 'high'
                          ? 'error'
                          : ewsResult?.tier.level === 'medium'
                          ? 'yellow'
                          : 'info'
                      }
                      size='small'
                      showDot
                    >
                      {patient.status === 'ready_discharge' || patient.status === 'discharged'
                        ? 'ส่งต่อแล้ว'
                        : `กำลังเฝ้าระวัง (${ewsResult?.score ?? 0})`}
                    </StatusBadge>
                  </div>

                  {/* Clinical alert strip (edge cases #1 · #2 · #4) — the
                      card's own status badge only reports EWS as a number,
                      which doesn't tell the nurse WHAT to do about it. */}
                  {(isRedAlert || overstay || patient.isExtraBed) && (
                    <div className='flex flex-wrap mb-3' style={{ gap: 'var(--dim-space-150, 6px)' }}>
                      {isRedAlert && (
                        <AlertChip tone='red' icon='emergency_home'>
                          EWS Red Alert (EWS {ewsResult?.score}) — อาการทรุดลง
                        </AlertChip>
                      )}
                      {overstay && (
                        <AlertChip tone='orange' icon='hourglass_top'>
                          Overstay Warning (เกิน {OVERSTAY_LIMIT_MINUTES / 60} ชม.)
                        </AlertChip>
                      )}
                      {patient.isExtraBed && (
                        <AlertChip tone='orange' icon='airline_seat_flat'>เตียงเสริม (Extra Bed)</AlertChip>
                      )}
                    </div>
                  )}
                  {overstay && (
                    <div
                      className='mb-3'
                      style={{
                        background: 'var(--surface-colorfulbadge-orange, #FFEDD5)',
                        borderRadius: 'var(--dim-radius-300)',
                        paddingTop: 'var(--dim-space-200)',
                        paddingRight: 'var(--dim-space-300)',
                        paddingBottom: 'var(--dim-space-200)',
                        paddingLeft: 'var(--dim-space-300)',
                        color: 'var(--text-colorfulbadge-orange, #C2410C)',
                        fontSize: 'var(--type-size-xs)',
                      }}
                    >
                      แจ้งแพทย์ผู้ดูแลประเมินซ้ำ (Re-evaluate) เพื่อตัดสินใจ Admit IPD หรือส่งต่อ
                    </div>
                  )}

                  {/* Patient Primary Details — same light-brand background
                      as PatientSummaryCard (Figma 145:6155) so the patient
                      identity block reads consistently across the popups
                      and this worklist card. */}
                  <div
                    className='mb-4'
                    style={{
                      background: 'var(--surface-brandprimary-quaternary, #F4FBF8)',
                      border: 'var(--dim-stroke-100, 1px) solid var(--border-brandprimary-quaternary, #E2F3EB)',
                      borderRadius: 'var(--dim-radius-400)',
                      padding: 'var(--dim-space-400, 16px)',
                    }}
                  >
                    <div className='flex items-center gap-2.5'>
                      <img
                        src={patient.avatar || getPatientByHN(patient.hn)?.avatarUrl || '/avatars/somchai-mock.png'}
                        alt={patient.patientName}
                        className='w-10 h-10 rounded-full object-cover border border-ink-line shrink-0 shadow-2xs'
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/avatars/somchai-mock.png';
                        }}
                      />
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-baseline justify-between gap-1'>
                          <h3
                            className='font-bold text-ink text-base leading-tight hover:text-brand-600 cursor-pointer truncate'
                            onClick={() => history.push(isFinishedObserving ? `/observation/history/${patient.id}` : `/observation/record/${patient.id}`)}
                          >
                            {patient.patientName}
                          </h3>
                          <span className='text-xs font-semibold text-ink-tertiary shrink-0'>
                            {patient.gender}, {patient.age} ปี
                          </span>
                        </div>
                        <div className='flex items-center gap-2 text-xs text-ink-secondary mt-0.5'>
                          <span>HN: <strong className='text-ink font-mono'>{patient.hn}</strong></span>
                          <span>•</span>
                          <span className='font-mono text-ink-tertiary text-[11px]'>{patient.vn}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* อาการสำคัญ / การวินิจฉัย — deliberately outside the
                      green identity box above (Figma feedback: reads as its
                      own section, not part of the patient ID block). */}
                  <div className='text-xs text-ink-secondary mb-4'>
                    <div className='text-ink-tertiary font-medium mb-0.5'>อาการสำคัญแรกรับ (Chief Complaint):</div>
                    <div className='font-semibold text-ink line-clamp-2'>{patient.chiefComplaint}</div>
                  </div>

                  {/* Vitals Trend Snapshot */}
                  {latestVitals && (
                    <div className='bg-brand-50/50 rounded-xl p-3 mb-4'>
                      <div className='flex items-center justify-between text-xs mb-2'>
                        <span className='font-bold text-brand-800 flex items-center gap-1'>
                          <span className='material-symbols-outlined text-sm text-brand-600'>monitor_heart</span>
                          สัญญาณชีพล่าสุด ({latestVitals.time})
                        </span>
                        <StatusBadge style={ewsResult.tier.style} size='small' showDot>
                          {ewsResult.scale.short}: {ewsResult.score}
                        </StatusBadge>
                      </div>
                      <div className='grid grid-cols-4 gap-2 text-left text-xs'>
                        <div className='bg-surface-card p-1.5 rounded-lg shadow-2xs border border-ink-line'>
                          <div className='text-[10px] text-ink-quaternary font-medium'>ความดัน</div>
                          <div className='font-medium text-ink-secondary text-[11px]'>{latestVitals.bpSys}/{latestVitals.bpDia}</div>
                        </div>
                        <div className='bg-surface-card p-1.5 rounded-lg shadow-2xs border border-ink-line'>
                          <div className='text-[10px] text-ink-quaternary font-medium'>ชีพจร</div>
                          <div className='font-medium text-ink-secondary text-[11px]'>{latestVitals.pulse} <span className='text-[9px] font-normal text-ink-quaternary'>bpm</span></div>
                        </div>
                        <div className='bg-surface-card p-1.5 rounded-lg shadow-2xs border border-ink-line'>
                          <div className='text-[10px] text-ink-quaternary font-medium'>SpO2</div>
                          <div className='font-medium text-ink-secondary text-[11px]'>{latestVitals.spo2}%</div>
                        </div>
                        <div className='bg-surface-card p-1.5 rounded-lg shadow-2xs border border-ink-line'>
                          <div className='text-[10px] text-ink-quaternary font-medium'>อุณหภูมิ</div>
                          <div className='font-medium text-ink-secondary text-[11px]'>{latestVitals.temp}°C</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Start / End Time (TOR 1.14.1) + Duration + Doctor —
                      single stacked column instead of a 2-column grid so
                      every line reads top-to-bottom on narrow cards. */}
                  <div className='flex flex-col text-ink-tertiary mb-4 px-1' style={{ gap: 'var(--dim-space-100, 4px)', fontSize: 'var(--type-size-sm, 14px)' }}>
                    <div className='flex items-center gap-1'>
                      <span className='material-symbols-outlined text-sm text-ink-quaternary'>play_circle</span>
                      เวลาเริ่มต้น (admitTime) <strong className='text-ink-secondary'>{startTimeLabel}</strong>
                    </div>
                    <div className='flex items-center gap-1'>
                      <span className='material-symbols-outlined text-sm text-ink-quaternary'>stop_circle</span>
                      เวลาสิ้นสุด (executedTime) <strong className='text-ink-secondary'>{endTimeLabel}</strong>
                    </div>
                    <div className='flex items-center gap-1'>
                      <span className='material-symbols-outlined text-sm text-ink-quaternary'>schedule</span>
                      สังเกตอาการแล้ว <strong className='text-ink-secondary'>{formatDurationThai(getObservationDurationMinutes(patient))}</strong>
                    </div>
                    <div className='flex items-center gap-1 truncate' title={patient.doctorName}>
                      <span className='material-symbols-outlined text-sm text-ink-quaternary'>stethoscope</span>
                      ผู้สั่ง: <strong className='text-ink-secondary'>{patient.doctorName}</strong>
                    </div>
                    <div className='flex items-center gap-1 truncate' title={patient.nurseName}>
                      <span className='material-symbols-outlined text-sm text-ink-quaternary'>badge</span>
                      พยาบาลรับผู้ป่วย: <strong className='text-ink-secondary'>{patient.nurseName || '-'}</strong>
                    </div>
                  </div>
                </div>

                {/* Card Actions — a referred/discharged patient is done
                    with active observation, so "วัด Vital Signs ใหม่"
                    (which only makes sense mid-observation) drops out and
                    the remaining button reads as a history lookup instead
                    of an active-observation shortcut. */}
                {isRedAlert && (
                  /* Code Red shortcut (edge case #1) — full-width and
                     above the routine actions so escalating is never the
                     button a rushing nurse has to hunt for. */
                  <div className='pt-3'>
                    <DangerButton
                      variant='fill'
                      size='lg'
                      leadingIcon='emergency_home'
                      className='w-full'
                      onClick={() => {
                        setErTransferReason('');
                        setErTransferPatient(patient);
                      }}
                    >
                      ย้ายด่วนเข้าห้องฉุกเฉิน (Code Red)
                    </DangerButton>
                  </div>
                )}
                <div className={`pt-3 grid gap-2 ${isFinishedObserving ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {!isFinishedObserving && (
                    <BrandSubdueButton
                      variant='outline'
                      leadingIcon='add_chart'
                      size='lg'
                      className='w-full'
                      onClick={() => handleOpenVitalsModal(patient)}
                    >
                      วัด Vital Signs ใหม่
                    </BrandSubdueButton>
                  )}
                  <BrandSubdueButton
                    variant='fill'
                    leadingIcon='clinical_notes'
                    size='lg'
                    className='w-full'
                    onClick={() => history.push(isFinishedObserving ? `/observation/history/${patient.id}` : `/observation/record/${patient.id}`)}
                  >
                    {isFinishedObserving ? 'ประวัติการสังเกตอาการ' : 'สังเกตอาการ'}
                  </BrandSubdueButton>
                </div>
              </div>
            );
          })}
        </div>
        )
      ) : (
        /* Table View — shared <Table> component (see OBSERVATION_QUEUE_BASE_COLUMNS
           above) instead of a bespoke Tailwind-gray <table>, matching the OPD
           screening worklist. */
        <Table
          columns={columns}
          rows={pagedPatients}
          rowKey={(patient) => patient.id}
          stickyColCount={2}
          emptyMessage='ไม่พบข้อมูลเตียงสังเกตอาการ'
          sortConfig={sortConfig}
          onSort={handleSort}
        />
      )}

      {/* รายการที่ส่งต่อแล้ว always shows its pager (even a single page) —
         historical records only grow over time, so pagination is a
         permanent fixture of that tab. Other tabs only show it once they
         actually spill past one page. Same range-text + right-aligned
         Pagination row as the OPD screening worklist (QueuePage.jsx). */}
      {(activeTab === 'all' || queueTotalPages > 1) && filteredPatients.length > 0 && (
        <div
          className='flex items-center w-full'
          style={{
            gap: 'var(--dim-space-200)',
            paddingTop: 'var(--dim-space-200)',
            borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
          }}
        >
          <span style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
            แสดง {queueRangeStart}–{queueRangeEnd} จาก {filteredPatients.length} รายการ
          </span>
          <div className='flex-1' />
          <Pagination currentPage={queuePageClamped} pageCount={queueTotalPages} onPageChange={setQueuePage} />
        </div>
      )}
      </div>
      </div>

      {/* Modal: Log Timed Vital Signs — shared with ObservationDetailPage's
          timeline "วัด Vital Signs ใหม่" button (see AddVitalsModal). */}
      <AddVitalsModal
        open={showVitalsModal}
        patient={selectedPatientForVitals}
        form={vitalsForm}
        setForm={setVitalsForm}
        setFieldValid={setVitalsFieldValid}
        isFormValid={isVitalsFormValid}
        onSubmit={handleSaveVitals}
        onClose={() => setShowVitalsModal(false)}
        noteSuggestions={VITALS_NOTE_SUGGESTIONS}
      />

      {/* Modal: Admit Patient to Bed */}
      {showAdmitModal && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowAdmitModal(false); }}
          className='fixed inset-0 z-[1400] flex items-center justify-center p-4 animate-fade-in'
          style={{ backgroundColor: 'var(--surface-overlay-default, rgba(0, 0, 0, 0.5))', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        >
          <div className='bg-surface-card rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-ink-line'>
            <div
              className='px-6 py-4 flex items-center justify-between'
              style={{ background: 'var(--surface-modal-default)' }}
            >
              <div className='flex items-center gap-2'>
                <span className='material-symbols-outlined text-2xl' style={{ color: 'var(--brand-p700)' }}>hotel</span>
                <h3 className='font-bold text-base' style={{ color: 'var(--text-modal-text)' }}>ลงทะเบียนรับผู้ป่วยเข้าเตียงสังเกตอาการ</h3>
              </div>
              <BrandCircleIconButton
                icon='close'
                variant='ghost'
                size='sm'
                onClick={() => setShowAdmitModal(false)}
                title='ปิดหน้าต่าง'
                aria-label='ปิดหน้าต่าง'
              />
            </div>

            <form onSubmit={handleAdmitSubmit} className='p-6 space-y-4 text-xs text-ink-secondary'>
              <div>
                <p className='font-medium mb-2' style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-xs)' }}>
                  ค้นหาผู้ป่วยเดิม (ถ้ามี)
                </p>
                <PrimarySearch
                  value={patientSearchQuery}
                  onChange={setPatientSearchQuery}
                  onSubmit={(value) => handleSelectPatientFromSearch(value)}
                  suggestions={patientSearchSuggestions}
                />
                {admitForm.hn && (
                  <div className='mt-2'>
                    <PatientSummaryCard
                      avatarUrl={admitForm.avatar}
                      avatarAlt={admitForm.patientName}
                      cells={[
                        { label: 'ชื่อ-นามสกุล ผู้ป่วย', value: admitForm.patientName },
                        { label: 'HN (Hospital Number)', value: admitForm.hn },
                        { label: 'เตียง', value: patients.find((p) => p.id === admitForm.bedId)?.bedNo || '-' },
                      ]}
                    />
                  </div>
                )}
              </div>

              {/* VN/ชื่อ-นามสกุล/HN/อายุ/เพศ are no longer separate editable
                  fields — "ค้นหาผู้ป่วยเดิม" above fills them straight into
                  admitForm (see handleSelectPatientFromSearch) and the
                  PatientSummaryCard confirms what was picked. Only the bed
                  itself still needs a choice here — opens the same photo-
                  tile BedSelectionPopup as OPD screening instead of a
                  plain text dropdown. */}
              <div>
                <p className='font-medium mb-2' style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-xs)' }}>
                  เลือกเตียงสังเกตอาการ
                </p>
                <button
                  type='button'
                  onClick={() => setShowBedPickerModal(true)}
                  className='w-full flex items-center justify-between rounded-lg border border-ink-line bg-surface-card px-3 py-2 hover:border-brand-300 transition-colors'
                >
                  <div className='flex items-center gap-2.5'>
                    <img
                      src={resolveBedImage(selectedBed)}
                      alt=''
                      className='w-10 h-10 rounded-md object-cover border border-ink-line shrink-0'
                    />
                    <div className='text-left'>
                      <div className='font-semibold text-ink'>{selectedBed?.bedNo || '-'}</div>
                      <div className='text-ink-tertiary text-[11px]'>{selectedBed?.bedType || ''}</div>
                    </div>
                  </div>
                  <span className='material-symbols-outlined text-ink-tertiary'>expand_more</span>
                </button>
              </div>

              {/* Same suggestion popover as OPD screening's "อาการ (Chief
                  Complaint)" field — reuses its suggestion list, appears
                  after 3 characters. */}
              <SuggestibleTextarea
                voice
                label='อาการสำคัญแรกรับ (Chief Complaint)'
                rows={2}
                placeholder='เช่น แน่นหน้าอก เวียนศีรษะ ปวดท้องรุนแรง มีไข้สูง'
                value={admitForm.chiefComplaint}
                onChange={(e) => setAdmitForm({ ...admitForm, chiefComplaint: e.target.value })}
                suggestions={CHIEF_COMPLAINT_SUGGESTIONS}
                minChars={3}
                popoverAriaLabel='คำแนะนำอาการสำคัญ'
                required
              />

              <div className='grid grid-cols-2 gap-4'>
                <Select
                  label='ผู้สั่ง'
                  value={admitForm.doctorName}
                  onChange={(val) => setAdmitForm({ ...admitForm, doctorName: val })}
                  options={DOCTOR_STAFF_OPTIONS}
                  size='sm'
                  required
                />
                <Select
                  label='พยาบาลรับผู้ป่วย'
                  value={admitForm.nurseName}
                  onChange={(val) => setAdmitForm({ ...admitForm, nurseName: val })}
                  options={NURSE_STAFF_OPTIONS}
                  size='sm'
                  required
                />
              </div>

              <div className='pt-3 flex items-center justify-end gap-3 border-t border-ink-line'>
                <NeutralSubdueButton type='button' onClick={() => setShowAdmitModal(false)}>
                  ยกเลิก
                </NeutralSubdueButton>
                <BrandPrimaryButton type='submit' leadingIcon='check' disabled={!admitForm.hn}>
                  ยืนยันครองเตียงสังเกตอาการ
                </BrandPrimaryButton>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Bed picker — same photo-tile BedSelectionPopup as OPD screening's
          "เลือกเตียงผู้ป่วย", fed the Observation ward's own empty beds. */}
      <BedSelectionPopup
        open={showBedPickerModal}
        onClose={() => setShowBedPickerModal(false)}
        onConfirm={(bedId) => setAdmitForm((prev) => ({ ...prev, bedId }))}
        initialSelectedId={admitForm.bedId}
        beds={observationBedOptions}
      />

      {/* "เพิ่มเตียงใหม่เข้าระบบ" — adds a brand-new empty bed slot (not an
          admission). เลขเตียง is always auto-assigned (never user-editable);
          the photo tiles reuse the same MOCK_PATIENT_BEDS catalogue as the
          admit modal's bed picker. */}
      <Popup
        open={showAddBedModal}
        onClose={() => setShowAddBedModal(false)}
        title={isNextBedExtra ? 'ลงทะเบียนเตียงเสริม (Extra Bed / Stretcher)' : 'เพิ่มเตียงสังเกตอาการใหม่'}
        subtitle='เลือกรูปแบบเตียงและระบุคำอธิบาย ระบบจะกำหนดเลขเตียงให้อัตโนมัติ'
        size='large'
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setShowAddBedModal(false) }}
        primaryAction={{
          label: isNextBedExtra ? 'ลงทะเบียนเตียงเสริม' : 'เพิ่มเตียง',
          onClick: handleAddBed,
          disabled: !newBedForm.bedTypeId || !newBedForm.description.trim(),
        }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
          <div
            className='flex items-center justify-between'
            style={{
              padding: 'var(--dim-space-300)',
              background: 'var(--surface-brandPrimary-quaternary)',
              border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
              borderRadius: 'var(--dim-radius-300)',
            }}
          >
            <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)' }}>
              เลขเตียง (กำหนดอัตโนมัติ)
            </span>
            <span style={{ color: 'var(--text-brandPrimary-default)', fontSize: 'var(--type-size-base)', fontWeight: 'var(--type-weight-bold)' }}>
              {nextBedNo}
            </span>
          </div>

          <div>
            <div style={{ marginBottom: 'var(--dim-space-200)', color: 'var(--text-content-default)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)' }}>
              รูปแบบเตียง
            </div>
            <div
              className='grid w-full min-w-0'
              style={{
                gap: 'var(--dim-space-300, 12px)',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              }}
            >
              {MOCK_PATIENT_BEDS.map((bed) => (
                <InventoryCard
                  key={bed.id}
                  image={bed.imageSrc}
                  imageAlt={bed.title}
                  title={bed.title}
                  subtext={bed.description}
                  showBadge={false}
                  showStatusBadge={false}
                  selected={newBedForm.bedTypeId === bed.id}
                  onClick={() => setNewBedForm((prev) => ({
                    ...prev,
                    bedTypeId: bed.id,
                    /* Only swap the description when the field is still
                       blank or holds a PREVIOUS template's default — a
                       description the ward staff already edited by hand
                       is left alone. */
                    description: (!prev.description.trim() || MOCK_PATIENT_BEDS.some((b) => b.description === prev.description))
                      ? bed.description
                      : prev.description,
                  }))}
                  style={{ width: '100%' }}
                />
              ))}
            </div>
          </div>

          {isNextBedExtra && (
            <div
              style={{
                background: 'var(--surface-colorfulbadge-orange, #FFEDD5)',
                borderRadius: 'var(--dim-radius-300)',
                paddingTop: 'var(--dim-space-300)',
                paddingRight: 'var(--dim-space-300)',
                paddingBottom: 'var(--dim-space-300)',
                paddingLeft: 'var(--dim-space-300)',
                color: 'var(--text-colorfulbadge-orange, #C2410C)',
                fontSize: 'var(--type-size-xs)',
              }}
            >
              ขณะนี้เตียงหลักถูกครองเต็มทุกเตียง — เตียงที่เพิ่มนี้จะถูกบันทึกเป็น
              <strong> เตียงเสริม (Extra Bed / Stretcher)</strong> และใช้เลขเตียง {nextBedNo}
            </div>
          )}

          <SuggestibleTextarea
            voice
            label='คำอธิบาย (Description)'
            value={newBedForm.description}
            onChange={(e) => setNewBedForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder='ระบุคำอธิบายเตียง เช่น อุปกรณ์ประจำเตียง หรือข้อควรทราบ'
            required
          />
        </div>
      </Popup>

      {/* "ย้ายด่วนเข้าห้องฉุกเฉิน (Code Red)" — edge case #1. Confirming
          moves the patient out of active observation and records the
          escalation (plus whatever deterioration the nurse describes)
          into the observation record, so the ER receives WHY the patient
          was upgraded, not just that they were. */}
      <Popup
        open={!!erTransferPatient}
        onClose={() => setErTransferPatient(null)}
        title='ย้ายด่วนเข้าห้องฉุกเฉิน (Code Red)'
        leading={<span className='material-symbols-outlined text-2xl' style={{ color: 'var(--text-colorfulbadge-red, #B91C1C)' }}>emergency_home</span>}
        size='large'
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setErTransferPatient(null) }}
        primaryAction={{ label: 'ยืนยันย้ายเข้าห้องฉุกเฉิน', onClick: handleConfirmErTransfer }}
      >
        {erTransferPatient && (
          <>
            <PatientSummaryCard
              avatarUrl={erTransferPatient.avatar || getPatientByHN(erTransferPatient.hn)?.avatarUrl}
              avatarAlt={erTransferPatient.patientName}
              cells={[
                { label: 'ชื่อ-นามสกุล ผู้ป่วย', value: erTransferPatient.patientName },
                { label: 'HN (Hospital Number)', value: erTransferPatient.hn },
                { label: 'เตียง', value: erTransferPatient.bedNo },
              ]}
            />

            <div
              role='alert'
              style={{
                background: 'var(--surface-colorfulbadge-red, #FEE2E2)',
                border: 'var(--dim-stroke-100) solid var(--surface-colorfulbadge-red-bold, #EF4444)',
                borderRadius: 'var(--dim-radius-300, 10px)',
                paddingTop: 'var(--dim-space-300)',
                paddingRight: 'var(--dim-space-300)',
                paddingBottom: 'var(--dim-space-300)',
                paddingLeft: 'var(--dim-space-300)',
                color: 'var(--text-colorfulbadge-red, #B91C1C)',
                fontSize: 'var(--type-size-sm)',
              }}
            >
              คะแนน EWS ล่าสุดคือ{' '}
              <strong>
                {(() => {
                  const lv = erTransferPatient.vitalsTrend?.[erTransferPatient.vitalsTrend.length - 1];
                  return lv ? scorePatientVitals(erTransferPatient, lv).score : 0;
                })()}
              </strong>{' '}
              (เกณฑ์ Red Alert คือ ≥ {EWS_RED_ALERT_SCORE}) — ผู้ป่วยจะถูกย้ายออกจากเตียงสังเกตอาการและบันทึกเป็นการส่งต่อภายในไปยัง ห้องฉุกเฉิน (ER) ทันที
            </div>

            <SuggestibleTextarea
              voice
              label='อาการที่ทรุดลง / เหตุผลการย้ายด่วน'
              rows={3}
              value={erTransferReason}
              onChange={(e) => setErTransferReason(e.target.value)}
              placeholder='เช่น ความดันตกร่วมกับชีพจรเบาเร็ว, SpO2 ลดต่ำกว่า 90%, ระดับความรู้สึกตัวลดลง'
              suggestions={ER_TRANSFER_REASON_SUGGESTIONS}
              minChars={3}
              popoverAriaLabel='คำแนะนำเหตุผลการย้ายเข้าห้องฉุกเฉิน'
            />
          </>
        )}
      </Popup>
    </QueuePageShell>
  );
}
