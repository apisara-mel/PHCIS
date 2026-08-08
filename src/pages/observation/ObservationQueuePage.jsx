import React, { useState, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Alert from '@/components/alert/Alert';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import { FieldShell } from '@/components/forms/_inputBox';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandButton from '@/components/button/BrandButton';
import Icon from '@/components/icons/Icon';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import hospitalPatientAdmittedAnim from '@/assets/illustrations/Hospital Patient admitted.json';
import PrimarySearch, { DropdownPanel, SuggestionRow } from '@/components/search/PrimarySearch';
import SecondarySearch from '@/components/search/SecondarySearch';
import { FilterDropdown } from '@/components/forms/FilterTag';
import FilterDateTag from '@/components/forms/FilterDateTag';
import { computeQuickRange, computeQuickSingle } from '@/components/popup/DateFilterPopup';
import Table, { EllipsisText } from '@/components/table/Table';
import VitalCard, { PressureCard } from '@/components/card/VitalCard';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import ViewToggle from '@/components/toggle/ViewToggle';
import OverstayBadge from '@/components/observation/OverstayBadge';
import AddVitalsModal, { VITALS_NOTE_SUGGESTIONS } from '@/components/observation/AddVitalsModal';
import BedNumberBadge from '@/components/observation/BedNumberBadge';
import BedInfoTooltip, {
  resolveBedCatalogueDescription,
  resolveBedImage,
  resolveBedTitleEn,
  resolveBedTitleTh,
  resolveBedWardNote,
} from '@/components/observation/BedInfoTooltip';
import Pagination from '@/components/pagination/Pagination';
import { BedSelectionGrid, NestedBedSelectionPanel } from '@/components/popup/BedSelectionPopup';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import { getPatientByHN, PATIENT_PROFILES } from '@/data/patientProfiles';
import { USERS } from '@/data/usersAccess';
import { STAFF_AVATARS } from '@/data/avatarAssets';
import { getCurrentUser } from '@/pages/users/usersShared';
import {
  MOCK_OBSERVATION_PATIENTS,
  OVERSTAY_LIMIT_MINUTES,
  isOverstay,
  getOutOfRangeVitals,
  latestPatientEsi,
  latestPatientPain,
  observationBedStatusFor,
  OBSERVATION_BED_STATUS,
  OBSERVATION_PAIN_LEVELS,
  OBSERVATION_ESI_LEVELS,
  getObservationDurationMinutes,
  formatDurationThai,
  isPhysicalBed,
  isBedAvailable,
  BED_CLEANING_STATUS,
  BLANK_OBSERVATION_VITALS_FORM,
  painLevelLabel,
  painBadgeStyleFor,
  esiBadgeStyleFor,
  getPatientVitalAlertState,
  primaryVitalAlertLabel,
} from '@/data/observationMock';
import {
  resolveVitalSnapshotTone,
  vitalSnapshotValueColor,
} from '@/data/vitalDisplayTone';
import { CHIEF_COMPLAINT_SUGGESTIONS } from '@/pages/opd/ScreeningPage';
import { MOCK_PATIENT_BEDS } from '@/data/mockPatientBeds';

/* Observation's bedType strings ("เตียงไฟฟ้า (High Care)", "เตียงหมุนมือ", …)
   share the same equipment vocabulary as MOCK_PATIENT_BEDS (the "เลือก
   เตียงผู้ป่วย" catalogue's Thai bed names) — match on keyword so the Admit
   modal's bed picker can show the same photo per equipment type instead of
   inventing a separate image set for observation wards. Falls back to the
   generic "เตียงสามัญ" photo when a type has no catalogue match. */
const getBedImageForType = (bedType = '') =>
  resolveBedImage({ bedType });

/* Admit modal's "ผู้สั่ง" — Select with a profile photo per option
   (Select's `image` field), sourced from the same USERS mock the Users &
   Access page manages. "พยาบาลรับผู้ป่วย" locks to the signed-in user
   (filled field + avatar). The admit form stores the plain name string. */
const DOCTOR_STAFF_OPTIONS = USERS
  .filter((u) => u.role === 'doctor')
  .map((u) => ({ value: u.name, label: u.name, image: u.avatarUrl }));
const NURSE_STAFF_OPTIONS = USERS
  .filter((u) => u.role === 'nurse')
  .map((u) => ({ value: u.name, label: u.name, image: u.avatarUrl }));

/* Admit modal — พยาบาลรับผู้ป่วย defaults to the signed-in user. */
const CURRENT_ADMIT_NURSE = (() => {
  const me = getCurrentUser();
  if (me?.name) return { name: me.name, avatarUrl: me.avatarUrl || '' };
  const fallback = NURSE_STAFF_OPTIONS[0];
  return { name: fallback?.value || 'พว. สุภาพร ชัยมงคล', avatarUrl: fallback?.image || '' };
})();

const ADMIT_FIELD_LABEL_STYLE = {
  margin: 0,
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm, 14px)',
  fontWeight: 'var(--type-weight-medium)',
  lineHeight: 1.5,
};

/* Empty board / table — same composition as TreatmentSteps exam empty
   (Lottie + brand title + tertiary subtitle + outline CTA). */
const ObservationBedsEmptyState = ({ onAdmit }) => (
  <div
    className='flex flex-col items-center justify-center w-full text-center'
    style={{
      gap: 'var(--dim-space-300, 12px)',
      padding: 'var(--dim-space-800, 40px) var(--dim-space-600, 24px)',
      borderRadius: 'var(--dim-radius-400, 16px)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <LottieIllustration animationData={hospitalPatientAdmittedAnim} size={160} />
    <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-150, 6px)' }}>
      <span
        style={{
          color: 'var(--text-brandPrimary-default, #007549)',
          fontFamily: 'var(--type-family-heading-content)',
          fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
          fontSize: 'var(--type-size-sm, 14px)',
          lineHeight: 1.5,
          textAlign: 'center',
        }}
      >
        ไม่พบรายการผู้รับบริการที่ส่งต่อ
      </span>
      <span
        style={{
          color: 'var(--text-content-quaternary, #ADB2B7)',
          fontFamily: 'var(--type-family-body)',
          fontWeight: 'var(--type-weight-medium)',
          fontSize: 'var(--type-size-sm, 14px)',
          lineHeight: 1.5,
          textAlign: 'center',
        }}
      >
        ไม่พบรายการผู้รับบริการที่ส่งต่อจากห้องสังเกตการ
      </span>
    </div>
    <BrandButton variant='outline' leadingIcon='add' onClick={onAdmit}>
      รับผู้ป่วยเข้าเตียงสังเกตอาการ
    </BrandButton>
  </div>
);

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
    /* Fixed widths on the sticky trio (bed / HN / name) — a flex sticky
       column drifts vs stickyLeft and overlaps neighbors when scrolling. */
    width: 104,
    render: (patient) => (
      <span style={{ color: 'var(--text-brandPrimary-default, var(--brand-p700))', fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))' }}>
        {patient.bedNo}
      </span>
    ),
  },
  {
    key: 'hn',
    label: 'HN',
    width: 120,
    render: (patient) => (!hasPatient(patient)
      ? <span style={{ color: 'var(--text-content-tertiary)' }}>-</span>
      : <EllipsisText text={patient.hn} fill={false} compact />),
  },
  {
    key: 'name',
    label: 'ชื่อ-นามสกุล',
    width: 220,
    render: (patient) => {
      if (!hasPatient(patient)) {
        return (
          <span style={{ color: 'var(--text-content-tertiary)', fontStyle: 'italic' }}>
            {patient.status === BED_CLEANING_STATUS ? 'รอทำความสะอาด' : 'เตียงว่าง'}
          </span>
        );
      }
      return (
        <div className='flex items-center min-w-0 w-full' style={{ gap: 'var(--dim-space-200)' }}>
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
          <span
            className='min-w-0'
            style={{
              fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
              fontSize: 'var(--type-size-xs, 12px)',
              color: 'var(--text-content-default)',
            }}
          >
            <EllipsisText text={patient.patientName} fill={false} compact />
          </span>
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
    key: 'bedType',
    label: 'รูปแบบเตียง',
    width: 180,
    render: (patient) => (
      <EllipsisText text={resolveBedTitleTh(patient) || patient.bedType || '-'} fill={false} />
    ),
  },
  {
    key: 'admitTime',
    label: 'เวลาเข้าเตียง',
    /* Wide enough for "YYYY-MM-DD HH:MM น." on one line (e.g. 2026-08-07 09:30 น.). */
    width: 200,
    render: (patient) => {
      if (!hasPatient(patient)) return '-';
      const overstay = isOverstay(patient);
      return (
        <div>
          <div style={{ whiteSpace: 'nowrap' }}>{patient.admitTime}</div>
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
              <OverstayBadge />
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
    minWidth: 320,
    sortable: false,
    render: (patient) => {
      if (!hasPatient(patient)) return '-';
      return (
        <div className='min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-0, 0px)' }}>
          <EllipsisText text={patient.chiefComplaint} compact fill={false} />
          <div
            className='truncate'
            style={{
              fontSize: 'var(--type-size-xs)',
              color: 'var(--text-content-tertiary)',
              lineHeight: 1.5,
            }}
          >
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
        <div style={{ fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))' }}>
          <div style={{ color: vitalSnapshotValueColor(resolveVitalSnapshotTone('bp', latest)) }}>
            {latest.bpSys}/{latest.bpDia} mmHg
          </div>
          <div style={{ fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-regular)' }}>
            <span style={{ color: vitalSnapshotValueColor(resolveVitalSnapshotTone('pulse', latest)) }}>
              P: {latest.pulse}
            </span>
            <span style={{ color: 'var(--text-content-tertiary)' }}> | </span>
            <span style={{ color: vitalSnapshotValueColor(resolveVitalSnapshotTone('spo2', latest)) }}>
              SpO2: {latest.spo2}%
            </span>
          </div>
        </div>
      );
    },
  },
  {
    key: 'status',
    label: 'สถานะ',
    /* Fit longest badge labels ("กำลังเฝ้าระวัง" / "รอทำความสะอาด") + optional dot. */
    width: 168,
    align: 'center',
    render: (patient) => {
      const bedStatus = observationBedStatusFor(patient);
      if (!bedStatus) return '-';
      return (
        <StatusBadge style={bedStatus.badgeStyle} size='small' showDot={patient.status === 'observing'}>
          {bedStatus.label}
        </StatusBadge>
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
                onClick={(e) => { e.stopPropagation(); requestFinishCleaning(patient); }}
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
                  setAdmitForm((prev) => ({
                    ...prev,
                    bedId: patient.id,
                    nurseName: CURRENT_ADMIT_NURSE.name,
                    nurseAvatar: CURRENT_ADMIT_NURSE.avatarUrl,
                  }));
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
              {isFinishedObserving ? 'ประวัติการสังเกตอาการ' : 'แฟ้มสังเกตอาการ'}
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
     ผู้สั่ง/พยาบาลรับผู้ป่วย/Pain/ESI/สถานะ; "รายการที่ส่งต่อแล้ว" rolls up every past episode and gets
     the full set — วันที่, เตียง, สถานะ, ผู้สั่ง, พยาบาลผู้รับผู้ป่วย.
     'all' means "no filter applied" for that field, except `date`, which
     is a FilterDateTag value ({quick, tab?, single?, range?}, same shape
     as ConsentReportPage's "วัน:" filter) defaulting to "เดือนนี้". Reset
     on tab switch (see onTabChange) so a selection made on one tab can't
     silently zero out the other's results. */
  const DEFAULT_ALL_TAB_FILTERS = {
    date: { quick: 'thismonth' },
    bed: 'all',
    bedType: 'all',
    status: 'all',
    doctor: 'all',
    nurse: 'all',
    pain: 'all',
    esi: 'all',
  };
  const [allTabFilters, setAllTabFilters] = useState(DEFAULT_ALL_TAB_FILTERS);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  /* 'priority' = clinical triage order (see boardPriority), 'bed' = the
     physical walking order a nurse uses when doing a round. */
  const [boardSort, setBoardSort] = useState('bed');

  /* Heartbeat. This board lives on a ward monitor for a whole shift, and
     every duration on it is derived from admitTime at render time — so
     without a periodic re-render the clock freezes at page load and the
     6-hour overstay alert never fires on a screen nobody touches. The
     tick value is deliberately never read; re-rendering IS the point. */
  const [, setClockTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setClockTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const observationGridRef = useRef(null);
  const [emptyCardMinHeight, setEmptyCardMinHeight] = useState(null);
  const [emptyCardMinHeightIds, setEmptyCardMinHeightIds] = useState(() => new Set());
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
  const [vitalsForm, setVitalsForm] = useState({ ...BLANK_OBSERVATION_VITALS_FORM });
  /* VitalCard/PressureCard's `required` prop only renders the asterisk —
     unlike InputField it never reaches a native <input>, so nothing
     blocks an all-empty submit on its own. Track each field's validity
     explicitly (same pattern as ObservationDetailPage's Add Timed Vitals
     form) and gate the submit button + handler on it. */
  const [vitalsFieldValidity, setVitalsFieldValidity] = useState({});
  const setVitalsFieldValid = (field, valid) =>
    setVitalsFieldValidity((prev) => (prev[field] === valid ? prev : { ...prev, [field]: valid }));
  const isVitalsFormValid = ['pressure', 'pulse', 'temp', 'spo2', 'rr'].every((f) => vitalsFieldValidity[f] === true)
    && !!vitalsForm.pain
    && vitalsForm.esi != null && vitalsForm.esi !== '';

  const [showAdmitModal, setShowAdmitModal] = useState(false);
  /* Admit modal's bed picker — reuses the same BedSelectionPopup (photo
     tiles) as OPD screening's "เลือกเตียงผู้ป่วย" instead of a plain
     dropdown. Only offers empty beds (plus whichever bed is currently
     targeted, so re-opening the picker mid-edit still shows the pick). */
  const [showBedPickerModal, setShowBedPickerModal] = useState(false);

  /* "เพิ่มเตียงใหม่เข้าระบบ" — adds a brand-new empty bed to the ward
     (distinct from admitting a patient into an existing one). bedTypeId
     picks a photo from MOCK_PATIENT_BEDS; description is always blank
     for staff to fill in. เลขเตียง is never user-editable — it's always
     "the next number after the last bed". */
  const [showAddBedModal, setShowAddBedModal] = useState(false);
  /* Nothing pre-selected on open — "เพิ่มเตียง" stays disabled until the
     ward staff actually picks a bed type (see the popup's primaryAction). */
  const NEW_BED_FORM_DEFAULT = { bedTypeId: null, description: '' };
  const [newBedForm, setNewBedForm] = useState(NEW_BED_FORM_DEFAULT);

  const [admitForm, setAdmitForm] = useState({
    /* Resolved to a genuinely free bed whenever the modal is opened
       without one (see the header action) — a hard-coded id goes stale
       the moment that bed is occupied. */
    bedId: '',
    patientName: '',
    hn: '',
    vn: `VN${new Date().toISOString().slice(2,10).replace(/-/g,'')}-0${Math.floor(Math.random()*90+10)}`,
    age: '',
    gender: 'ชาย',
    chiefComplaint: '',
    diagnosis: '',
    doctorName: 'นพ. วรวิทย์ เกียรติเจริญ',
    nurseName: CURRENT_ADMIT_NURSE.name,
    nurseAvatar: CURRENT_ADMIT_NURSE.avatarUrl,
    avatar: '',
  });

  /* "ผู้ป่วย" search — pulls an already-registered patient's info (name,
     HN, sex, age, avatar) from the shared PATIENT_PROFILES mock instead of
     retyping it — SecondarySearch inside the admit popup (compact chrome);
     the ward board search above keeps PrimarySearch. Query matches full
     name or HN, case-insensitive. */
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
  /* patients also carries ~32 historical "รายการที่ส่งต่อแล้ว" mock records
     (id prefix obs-ref- / obs-hist-) that were never a distinct physical
     bed slot, so patients.length would over-count the ward's real
     10-bed inventory. */
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
  const highAcuityCount = patients.filter((p) => {
    if (p.status !== 'observing') return false;
    return latestPatientEsi(p) <= 2;
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
    /* Available vs cleaning are separate cards — combining them under
       "เตียงว่าง" hid dirty beds and made the door glyph misleading. */
    {
      key: 'empty',
      label: 'เตียงพร้อมรับผู้ป่วยใหม่',
      value: `${emptyCount} เตียง`,
      indicator: isFullCapacity ? 'เตียงเต็ม (Full Capacity)' : 'ว่าง พร้อมรับผู้ป่วย',
      color: isFullCapacity ? 'destructive' : 'positive',
      icon: isFullCapacity ? 'do_not_disturb_on' : 'event_available',
      indicatorIcon: isFullCapacity ? 'warning' : 'person_add',
    },
    {
      key: 'cleaning',
      label: 'เตียงรอทำความสะอาด',
      value: `${cleaningCount} เตียง`,
      indicator: cleaningCount > 0 ? 'รอทำความสะอาด' : 'ไม่มีเตียงรอทำความสะอาด',
      color: cleaningCount > 0 ? 'inprogress' : 'positive',
      icon: 'cleaning_services',
      indicatorIcon: cleaningCount > 0 ? 'hourglass_top' : 'check_circle',
    },
    { key: 'referred', label: 'รายการที่ส่งต่อแล้ว', value: `${referredCount} ราย`, indicator: 'จำหน่าย/ส่งต่อสำเร็จ', color: 'positive', icon: 'check_circle' },
    { key: 'overstay', label: `ครองเตียงเกิน ${OVERSTAY_LIMIT_MINUTES / 60} ชม.`, value: `${overstayCount} ราย`, indicator: 'รอแพทย์ประเมินซ้ำ', color: 'inprogress', icon: 'hourglass_top' },
    { key: 'highAcuity', label: 'ESI 1–2', value: `${highAcuityCount} ราย`, indicator: 'ความเร่งด่วนสูง', color: 'destructive', icon: 'warning' },
  ];

  /* Count uses TabUnderline's built-in brandtag pill (Figma tab count
     badge) — pass `count` rather than embedding "(N)" in the label. */
  const tabs = [
    { key: 'observing', label: 'กำลังสังเกตอาการ', count: occupiedCount },
    { key: 'all', label: 'รายการที่ส่งต่อแล้ว' },
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

  /* รูปแบบเตียง filter options — label from catalogue Thai title, leading
     product photo (ActionList imageVariant thumb) matching BedSelectionPopup. */
  const bedTypeFilterOptionsFrom = (list) => [
    { value: 'all', label: 'ทั้งหมด' },
    ...uniqueSorted(list.map((p) => resolveBedTitleTh(p) || p.bedType)).map((title) => {
      const sample = list.find((p) => (resolveBedTitleTh(p) || p.bedType) === title);
      return {
        value: title,
        label: title,
        image: resolveBedImage(sample) || getBedImageForType(title),
        imageVariant: 'thumb',
      };
    }),
  ];

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
          imageVariant: 'thumb',
        })),
      ],
      bedType: bedTypeFilterOptionsFrom(referred),
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

  /* "กำลังสังเกตอาการ" tab — รูปแบบเตียง / Pain / ESI / สถานะ / ผู้สั่ง / พยาบาลรับผู้ป่วย. */
  const observingFilterOptions = (() => {
    const board = patients.filter((p) => (
      p.status === 'observing' || p.status === 'empty' || p.status === BED_CLEANING_STATUS
    ));
    const observing = board.filter((p) => p.status === 'observing');
    return {
      bedType: bedTypeFilterOptionsFrom(board),
      pain: [
        { value: 'all', label: 'ทั้งหมด' },
        ...OBSERVATION_PAIN_LEVELS.map((p) => ({
          value: p.key,
          label: p.label,
          /* ColorfulBadge tone aliases OBSERVATION_PAIN_LEVELS.tone
             (green / blue / yellow / orange / red). */
          colorfulBadgeStyle: p.tone,
        })),
      ],
      esi: [
        { value: 'all', label: 'ทั้งหมด' },
        ...OBSERVATION_ESI_LEVELS.map((e) => ({
          value: String(e.lv),
          label: `ESI ${e.lv} — ${e.th}`,
          /* Triage colour → ColorfulBadge (same family as Select severity). */
          colorfulBadgeStyle: ({ 1: 'red', 2: 'orange', 3: 'yellow', 4: 'blue', 5: 'grey' })[e.lv] || 'grey',
        })),
      ],
      status: [
        { value: 'all', label: 'ทั้งหมด' },
        { value: OBSERVATION_BED_STATUS.observing.label, label: OBSERVATION_BED_STATUS.observing.label },
        { value: OBSERVATION_BED_STATUS.empty.label, label: OBSERVATION_BED_STATUS.empty.label },
        { value: OBSERVATION_BED_STATUS.cleaning.label, label: OBSERVATION_BED_STATUS.cleaning.label },
      ],
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
      if (allTabFilters.bedType !== 'all') {
        const title = resolveBedTitleTh(p) || p.bedType;
        if (title !== allTabFilters.bedType) return false;
      }
      if (allTabFilters.doctor !== 'all' && p.doctorName !== allTabFilters.doctor) return false;
      if (allTabFilters.nurse !== 'all' && p.nurseName !== allTabFilters.nurse) return false;
      if (allTabFilters.pain !== 'all') {
        if (p.status !== 'observing' || latestPatientPain(p) !== allTabFilters.pain) return false;
      }
      if (allTabFilters.esi !== 'all') {
        if (p.status !== 'observing' || String(latestPatientEsi(p)) !== allTabFilters.esi) return false;
      }
      if (allTabFilters.status !== 'all') {
        const bedStatus = observationBedStatusFor(p);
        if (!bedStatus || bedStatus.label !== allTabFilters.status) return false;
      }
    }

    if (activeTab === 'all') {
      if (!(p.status === 'ready_discharge' || p.status === 'discharged')) return false;
      if (!matchesDateFilter(p.admitTime, allTabFilters.date)) return false;
      if (allTabFilters.bed !== 'all' && p.bedNo !== allTabFilters.bed) return false;
      if (allTabFilters.bedType !== 'all') {
        const title = resolveBedTitleTh(p) || p.bedType;
        if (title !== allTabFilters.bedType) return false;
      }
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
  /* Board order is clinical triage, not bed numbering. Overstayed patients
     surface first; within the observing group, lower ESI ranks higher.
       0  overstayed the 6-hour standard
       1  under observation (lower ESI first within the group)
       2  waiting to be cleaned
       3  free
       4  already referred (the "ส่งต่อแล้ว" tab's own filters take over) */
  const boardPriority = (patient) => {
    if (patient.status === 'observing') {
      if (isOverstay(patient)) return 0;
      return 1 + (latestPatientEsi(patient) - 1) / 10;
    }
    if (patient.status === BED_CLEANING_STATUS) return 2;
    if (patient.status === 'empty') return 3;
    return 4;
  };

  const sortedPatients = (() => {
    if (!sortConfig.key) {
      /* Explicit column sorting (table view) always wins; otherwise the
         board follows whichever order the ward asked for. */
      /* Scoped to the ward board — "รายการที่ส่งต่อแล้ว" is a history
         list with its own filters, and silently re-ordering it from a
         control that isn't visible on that tab would be a surprise. */
      if (activeTab !== 'observing') return filteredPatients;
      if (boardSort === 'bed') {
        const bedCollator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
        return [...filteredPatients].sort((a, b) => bedCollator.compare(a.bedNo || '', b.bedNo || ''));
      }
      return [...filteredPatients].sort((a, b) => boardPriority(a) - boardPriority(b));
    }
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
    const normalize = (p, key) => {
      switch (key) {
        case 'hn': return p.hn || '';
        case 'name': return p.patientName || '';
        case 'genderAge': return p.age ?? -1;
        case 'bedType': return resolveBedTitleTh(p) || p.bedType || '';
        case 'esi': return latestPatientEsi(p);
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
     timeline. Mostly matters for "รายการที่ส่งต่อแล้ว" (32 mock rows);
     "กำลังสังเกตอาการ" never exceeds the physical bed count so it just
     always renders as a single page. */
  useEffect(() => { setQueuePage(1); }, [activeTab, searchQuery, JSON.stringify(allTabFilters), sortConfig.key, sortConfig.direction, boardSort, viewMode]);
  const queueTotalPages = Math.max(1, Math.ceil(filteredPatients.length / QUEUE_PAGE_SIZE));
  const queuePageClamped = Math.min(queuePage, queueTotalPages);
  const pagedPatients = sortedPatients.slice(
    (queuePageClamped - 1) * QUEUE_PAGE_SIZE,
    queuePageClamped * QUEUE_PAGE_SIZE,
  );
  const queueRangeStart = filteredPatients.length === 0 ? 0 : (queuePageClamped - 1) * QUEUE_PAGE_SIZE + 1;
  const queueRangeEnd = Math.min(queuePageClamped * QUEUE_PAGE_SIZE, filteredPatients.length);

  /* Empty / cleaning tiles must match occupied-card height even when they
     land in their own grid row (priority sort groups them at the bottom).
     Measure the tallest occupied card on the current page and mirror that
     min-height — occupied cards themselves stay content-sized.
     Deps use a stable id-list string (not `pagedPatients` array identity)
     so table-mode re-renders don't re-fire this effect forever. */
  const pagedPatientIdsKey = pagedPatients.map((p) => p.id).join('|');
  useEffect(() => {
    const clearEmptyCardMin = () => {
      setEmptyCardMinHeight((prev) => (prev == null ? prev : null));
      setEmptyCardMinHeightIds((prev) => (prev.size === 0 ? prev : new Set()));
    };

    if (viewMode !== 'grid') {
      clearEmptyCardMin();
      return undefined;
    }
    const grid = observationGridRef.current;
    if (!grid) return undefined;

    const measure = () => {
      const occupiedCards = [...grid.querySelectorAll('[data-observation-card-kind="occupied"]')];
      const emptyCards = [...grid.querySelectorAll('[data-observation-card-kind="empty"]')];

      let maxHeight = 0;
      occupiedCards.forEach((node) => {
        maxHeight = Math.max(maxHeight, node.getBoundingClientRect().height);
      });

      if (maxHeight <= 0) {
        clearEmptyCardMin();
        return;
      }

      const occupiedRowTops = new Set(
        occupiedCards.map((node) => Math.round(node.getBoundingClientRect().top)),
      );

      const idsNeedingMin = new Set();
      emptyCards.forEach((node) => {
        const top = Math.round(node.getBoundingClientRect().top);
        const id = node.getAttribute('data-observation-card-id');
        if (!occupiedRowTops.has(top) && id) idsNeedingMin.add(id);
      });

      const nextHeight = Math.ceil(maxHeight);
      setEmptyCardMinHeight((prev) => (prev === nextHeight ? prev : nextHeight));
      setEmptyCardMinHeightIds((prev) => {
        if (prev.size === idsNeedingMin.size && [...prev].every((id) => idsNeedingMin.has(id))) {
          return prev;
        }
        return idsNeedingMin;
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [viewMode, pagedPatientIdsKey]);

  const handleOpenVitalsModal = (patient) => {
    setSelectedPatientForVitals(patient);
    /* Blank fields — this logs a NEW timed vital-signs entry, so it must
       not silently carry over the patient's last reading (that would let
       a nurse save a stale duplicate without actually re-measuring). */
    setVitalsForm({ ...BLANK_OBSERVATION_VITALS_FORM });
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
      pain: vitalsForm.pain,
      esi: Number(vitalsForm.esi),
    };

    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === selectedPatientForVitals.id) {
          return {
            ...p,
            vitalsTrend: [...p.vitalsTrend, newVitalLog],
          };
        }
        return p;
      })
    );
    setShowVitalsModal(false);
  };

  /* Housekeeping has changed the linen — the bed rejoins the pool of
     beds that can actually take a patient. Confirm first so a mis-tap
     doesn't silently open a dirty bed. */
  const [finishCleaningBed, setFinishCleaningBed] = useState(null);
  const requestFinishCleaning = (patient) => {
    setFinishCleaningBed(patient);
  };
  const confirmFinishCleaning = () => {
    const bedId = finishCleaningBed?.id;
    setFinishCleaningBed(null);
    if (!bedId) return;
    setPatients((prev) => prev.map((p) => (p.id === bedId ? { ...p, status: 'empty' } : p)));
  };

  const handleAdmitSubmit = (e) => {
    e.preventDefault();
    /* Never write a patient onto a bed that already holds one — the
       admit form targets a bed by id, and an occupied target would
       silently overwrite the record of whoever is lying in it. */
    if (!isBedAvailable(patients.find((p) => p.id === admitForm.bedId))) return;
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
  const isSelectedBedFree = isBedAvailable(selectedBed);
  const firstAvailableBedId = patients.find(isBedAvailable)?.id || '';
  const openAdmitModal = () => {
    setPatientSearchQuery('');
    setAdmitForm((prev) => ({
      ...prev,
      bedId: isBedAvailable(patients.find((p) => p.id === prev.bedId))
        ? prev.bedId
        : (firstAvailableBedId || prev.bedId),
      nurseName: CURRENT_ADMIT_NURSE.name,
      nurseAvatar: CURRENT_ADMIT_NURSE.avatarUrl,
    }));
    setShowAdmitModal(true);
  };
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
        /* Catalogue title for display; free-text note in bedDescription.
           Photo resolves via bedPhotoId. */
        bedType: MOCK_PATIENT_BEDS.find((b) => b.id === newBedForm.bedTypeId)?.titleTh
          || MOCK_PATIENT_BEDS.find((b) => b.id === newBedForm.bedTypeId)?.title
          || 'เตียง',
        bedDescription: newBedForm.description.trim(),
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
      breadcrumb={[
        { label: 'หน้าหลัก PHCIS', to: '/dashboard' },
        'ระบบสังเกตอาการ (Observation)',
      ]}
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
          <BrandPrimaryButton leadingIcon='add' onClick={openAdmitModal}>
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
          <div className='w-full flex flex-wrap items-center' style={{ gap: 'var(--dim-space-400)' }}>
            <Alert
              type='error'
              title='เตียงเต็มทุกเตียง (Full Capacity)'
              subtext={`เตียงสังเกตอาการถูกครองครบทั้ง ${totalBeds} เตียง — หากมีผู้ป่วยฉุกเฉินต้องการเตียงเพิ่ม ให้ลงทะเบียนเตียงเสริม (${nextBedNo})`}
              showCloseButton={false}
              className='flex-1 min-w-0'
              /* Alert caps itself at 768px; this banner is a full-width
                 ward-level notice, so let it use the row it is given. */
              style={{ maxWidth: '100%' }}
            />
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
            boxShadow: 'var(--shadow-card)',
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
            observing tab shows Pain / ESI / สถานะ / ผู้สั่ง / พยาบาลรับผู้ป่วย, since
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
                  options={allTabFilterOptions.bed}
                  value={allTabFilters.bed}
                  onChange={(val) => setAllTabFilters((prev) => ({ ...prev, bed: val }))}
                />
                <FilterDropdown
                  prefix='รูปแบบเตียง'
                  options={allTabFilterOptions.bedType}
                  value={allTabFilters.bedType}
                  onChange={(val) => setAllTabFilters((prev) => ({ ...prev, bedType: val }))}
                />
                <FilterDropdown
                  prefix='สถานะ'
                  options={allTabFilterOptions.status}
                  value={allTabFilters.status}
                  onChange={(val) => setAllTabFilters((prev) => ({ ...prev, status: val }))}
                />
                <FilterDropdown
                  prefix='ผู้สั่ง'
                  options={allTabFilterOptions.doctor}
                  value={allTabFilters.doctor}
                  onChange={(val) => setAllTabFilters((prev) => ({ ...prev, doctor: val }))}
                />
                <FilterDropdown
                  prefix='พยาบาลผู้รับผู้ป่วย'
                  options={allTabFilterOptions.nurse}
                  value={allTabFilters.nurse}
                  onChange={(val) => setAllTabFilters((prev) => ({ ...prev, nurse: val }))}
                />
              </>
            )}
            {activeTab === 'observing' && (
              <>
                <FilterDropdown
                  prefix='รูปแบบเตียง'
                  options={observingFilterOptions.bedType}
                  value={allTabFilters.bedType}
                  onChange={(val) => setAllTabFilters((prev) => ({ ...prev, bedType: val }))}
                />
                <FilterDropdown
                  prefix='Pain'
                  options={observingFilterOptions.pain}
                  value={allTabFilters.pain}
                  onChange={(val) => setAllTabFilters((prev) => ({ ...prev, pain: val }))}
                />
                <FilterDropdown
                  prefix='ระดับ ESI'
                  options={observingFilterOptions.esi}
                  value={allTabFilters.esi}
                  onChange={(val) => setAllTabFilters((prev) => ({ ...prev, esi: val }))}
                />
                <FilterDropdown
                  prefix='สถานะ'
                  options={observingFilterOptions.status}
                  value={allTabFilters.status}
                  onChange={(val) => setAllTabFilters((prev) => ({ ...prev, status: val }))}
                />
                <FilterDropdown
                  prefix='ผู้สั่ง'
                  options={observingFilterOptions.doctor}
                  value={allTabFilters.doctor}
                  onChange={(val) => setAllTabFilters((prev) => ({ ...prev, doctor: val }))}
                />
                <FilterDropdown
                  prefix='พยาบาลรับผู้ป่วย'
                  options={observingFilterOptions.nurse}
                  value={allTabFilters.nurse}
                  onChange={(val) => setAllTabFilters((prev) => ({ ...prev, nurse: val }))}
                />
              </>
            )}
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            {activeTab === 'observing' && (
              <FilterDropdown
                prefix='เรียงตาม'
                options={[
                  { value: 'priority', label: 'ความเร่งด่วน' },
                  { value: 'bed', label: 'เลขเตียง' },
                ]}
                value={boardSort}
                onChange={setBoardSort}
              />
            )}

            <ViewToggle
              value={viewMode === 'table' ? 'list' : 'grid'}
              onChange={(v) => setViewMode(v === 'list' ? 'table' : 'grid')}
            />
          </div>
        </div>

      {/* Main Content Area */}
      {viewMode === 'grid' ? (
        filteredPatients.length === 0 ? (
          <ObservationBedsEmptyState onAdmit={openAdmitModal} />
        ) : (
        <div
          ref={observationGridRef}
          className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch'
          style={{ gap: 'var(--dim-space-400, 16px)' }}
        >
          {pagedPatients.map((patient) => {
            const isCleaning = patient.status === BED_CLEANING_STATUS;
            const isEmpty = patient.status === 'empty' || isCleaning;
            const bedTitleTh = isEmpty ? resolveBedTitleTh(patient) : '';
            const bedTitleEn = isEmpty ? resolveBedTitleEn(patient) : '';
            const bedCatalogueDesc = isEmpty
              ? (resolveBedCatalogueDescription(patient) || '-')
              : '';
            const bedWardNote = isEmpty ? resolveBedWardNote(patient) : '';
            const latestVitals = patient.vitalsTrend?.[patient.vitalsTrend.length - 1];
            const painKey = latestVitals?.pain ?? null;
            const esiValue = latestVitals?.esi != null && latestVitals?.esi !== ''
              ? Number(latestVitals.esi)
              : null;
            /* เวลาเริ่มต้น / เวลาสิ้นสุด (TOR 1.14.1) — both come off the
               record's own full timestamps now, so a stay that crosses
               midnight still reads correctly (edge case #12). */
            const startTimeLabel = patient.admitTime ? patient.admitTime.split(' ').slice(1).join(' ') : '-';
            const isFinishedObserving = patient.status === 'ready_discharge' || patient.status === 'discharged';
            const endTimeLabel = patient.dischargeTime
              ? patient.dischargeTime.split(' ').slice(1).join(' ')
              : isFinishedObserving ? (latestVitals?.time || '-') : '-';
            /* Edge case #2 — only applies to a patient still under active
               observation; a referred record's total stay is history. */
            const overstay = isOverstay(patient);
            const vitalAlert = getPatientVitalAlertState(patient);
            const vitalAlertLabel = primaryVitalAlertLabel(vitalAlert.triggers);
            const isCriticalVitalAlert =
              patient.status === 'observing' && vitalAlert.level === 'critical';
            const bedStatus = observationBedStatusFor(patient);

            if (isEmpty) {
              return (
                <div
                  key={patient.id}
                  data-observation-card-kind='empty'
                  data-observation-card-id={patient.id}
                  /* A bed tile is an action, not a decoration — give it a
                     real role, keyboard operation and a name so it can be
                     reached without a mouse (WCAG 2.1.1 / 4.1.2). The
                     button inside stays out of the tab order so the tile
                     is a single stop, not two. */
                  role={isCleaning ? undefined : 'button'}
                  tabIndex={isCleaning ? undefined : 0}
                  aria-label={isCleaning ? undefined : `รับผู้ป่วยเข้า ${patient.bedNo} (${patient.bedType})`}
                  onKeyDown={(e) => {
                    if (isCleaning) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setAdmitForm((prev) => ({
                        ...prev,
                        bedId: patient.id,
                        nurseName: CURRENT_ADMIT_NURSE.name,
                        nurseAvatar: CURRENT_ADMIT_NURSE.avatarUrl,
                      }));
                      setShowAdmitModal(true);
                    }
                  }}
                  className={`mih-observation-focusable mih-summary-card h-full rounded-2xl flex flex-col text-center transition-all group${isCleaning ? '' : ' cursor-pointer'}`}
                  style={{
                    padding: 'var(--dim-space-600, 24px)',
                    ...(emptyCardMinHeight != null && emptyCardMinHeightIds.has(patient.id)
                      ? { minHeight: emptyCardMinHeight }
                      : {}),
                    background: isCleaning
                      ? 'var(--surface-card-100, #FFFFFF)'
                      : 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                    border: isCleaning
                      ? 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)'
                      : `var(--dim-stroke-200) dashed var(--border-brandPrimary-quaternary, #E2F3EB)`,
                  }}
                  onMouseEnter={(e) => {
                    if (isCleaning) return;
                    e.currentTarget.style.background = 'var(--surface-brandPrimary-tertiary, #E2F3EB)';
                    e.currentTarget.style.borderColor = 'var(--border-brandPrimary-tertiary, #C5EDDA)';
                  }}
                  onMouseLeave={(e) => {
                    if (isCleaning) return;
                    e.currentTarget.style.background = 'var(--surface-brandPrimary-quaternary, #F4FBF8)';
                    e.currentTarget.style.borderColor = 'var(--border-brandPrimary-quaternary, #E2F3EB)';
                  }}
                  onClick={() => {
                    /* A dirty bed can't take a patient — housekeeping has
                       to sign it off first (edge case #9). */
                    if (isCleaning) return;
                    setAdmitForm((prev) => ({
                      ...prev,
                      bedId: patient.id,
                      nurseName: CURRENT_ADMIT_NURSE.name,
                      nurseAvatar: CURRENT_ADMIT_NURSE.avatarUrl,
                    }));
                    setShowAdmitModal(true);
                  }}
                >
                  <div
                    className='flex flex-1 flex-col items-center justify-center w-full min-h-0'
                    style={{ gap: 'var(--dim-space-300, 12px)' }}
                  >
                  <BedInfoTooltip patient={patient} position='bottom'>
                    <BedNumberBadge
                      bedNo={patient.bedNo}
                      size='md'
                      tone={isCleaning ? 'orange' : 'grey'}
                      variant='plain'
                    />
                  </BedInfoTooltip>
                  {/* Same photo ratio as InventoryCard in "เพิ่มเตียง" (227×180). */}
                  <div
                    className='rounded-2xl overflow-hidden flex items-center justify-center shrink-0 w-full'
                    style={{
                      maxWidth: 227,
                      aspectRatio: '227 / 180',
                      height: 'auto',
                      background: 'var(--surface-card-100)',
                      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
                      boxShadow: 'var(--shadow-2xs, none)',
                      boxSizing: 'border-box',
                    }}
                  >
                    <img
                      src={resolveBedImage(patient)}
                      alt={bedTitleTh}
                      className='w-full h-full object-cover'
                    />
                  </div>
                  {patient.isExtraBed && (
                    <ColorfulBadge width='hug' style='orange' icon='airline_seat_flat'>เตียงเสริม (Extra Bed)</ColorfulBadge>
                  )}
                  <div
                    className='flex flex-col items-center w-full shrink-0'
                    style={{ gap: 'var(--dim-space-100, 4px)' }}
                  >
                    <p
                      style={{
                        color: 'var(--text-content-default)',
                        fontSize: 'var(--type-size-sm, 14px)',
                        fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                        margin: 0,
                        textAlign: 'center',
                        lineHeight: 1.5,
                      }}
                    >
                      {bedTitleTh}{!isCleaning && ' (ว่าง)'}
                    </p>
                    {bedTitleEn ? (
                      <p
                        style={{
                          color: 'var(--text-content-tertiary)',
                          fontSize: 'var(--type-size-xs, 12px)',
                          fontWeight: 'var(--type-weight-regular)',
                          margin: 0,
                          textAlign: 'center',
                          lineHeight: 1.5,
                          maxWidth: '100%',
                        }}
                      >
                        {bedTitleEn}
                      </p>
                    ) : null}
                    {/* Catalogue blurb (รูปแคตตาล็อก) — always shown. */}
                    <p
                      style={{
                        color: 'var(--text-content-secondary)',
                        fontSize: 'var(--type-size-xs, 12px)',
                        fontWeight: 'var(--type-weight-regular)',
                        margin: 0,
                        textAlign: 'center',
                        lineHeight: 1.5,
                        maxWidth: '100%',
                      }}
                    >
                      คำอธิบาย: {bedCatalogueDesc}
                    </p>
                    {/* Ward note from "เพิ่มเตียง" popup — always shown; "-" when empty. */}
                    <p
                      style={{
                        color: 'var(--text-content-tertiary)',
                        fontSize: 'var(--type-size-xs, 12px)',
                        fontWeight: 'var(--type-weight-regular)',
                        margin: 0,
                        textAlign: 'center',
                        lineHeight: 1.5,
                        maxWidth: '100%',
                      }}
                    >
                      จุดสังเกต: {bedWardNote || '-'}
                    </p>
                    {isCleaning && (
                      <ColorfulBadge width='hug' style='orange' icon='cleaning_services'>
                        รอทำความสะอาด
                      </ColorfulBadge>
                    )}
                  </div>
                  {isCleaning ? (
                    <BrandPrimaryButton
                      leadingIcon='cleaning_services'
                      size='sm'
                      variant='outline'
                      onClick={(e) => { e.stopPropagation(); requestFinishCleaning(patient); }}
                    >
                      ทำความสะอาดเสร็จ - เปิดใช้เตียง
                    </BrandPrimaryButton>
                  ) : (
                    <BrandPrimaryButton
                      leadingIcon='person_add'
                      size='sm'
                      variant='outline'
                      tabIndex={-1}
                    >
                      รับผู้ป่วยเข้าเตียง
                    </BrandPrimaryButton>
                  )}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={patient.id}
                data-observation-card-kind='occupied'
                className={`h-full rounded-2xl transition-all flex flex-col relative overflow-hidden mih-summary-card${isCriticalVitalAlert ? ' mih-observation-card--alert-red' : ''}`}
                style={{
                  background: 'var(--surface-card-100)',
                  ...(isCriticalVitalAlert
                    ? {}
                    : {
                        border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
                      }),
                  padding: 'var(--dim-space-600, 24px)',
                  gap: 'var(--dim-space-400, 16px)',
                }}
              >
                {/* Card Header — badges on top; bed number + patient profile share one row. */}
                <div className='flex flex-1 flex-col min-h-0' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                  <div
                    className='flex items-center flex-wrap'
                    style={{ gap: 'var(--dim-space-150, 6px)' }}
                  >
                    <div className='flex flex-wrap items-center min-w-0' style={{ gap: 'var(--dim-space-150, 6px)' }}>
                      {isCriticalVitalAlert && (
                        <ColorfulBadge width='hug' style='red' icon='monitor_heart'>
                          Vital Alert: {vitalAlertLabel}
                        </ColorfulBadge>
                      )}
                      {patient.isExtraBed && (
                        <ColorfulBadge width='hug' style='orange' icon='airline_seat_flat'>เตียงเสริม (Extra Bed)</ColorfulBadge>
                      )}
                    </div>
                    <div
                      className='flex flex-wrap items-center justify-end ml-auto'
                      style={{ gap: 'var(--dim-space-150, 6px)' }}
                    >
                      {overstay && <OverstayBadge />}
                      <StatusBadge style={painKey ? painBadgeStyleFor(painKey) : 'neutral'} size='small'>
                        Pain: {painKey ? painLevelLabel(painKey) : '—'}
                      </StatusBadge>
                      <StatusBadge
                        style={esiValue != null ? esiBadgeStyleFor(esiValue) : 'neutral'}
                        size='small'
                        showDot={esiValue != null}
                      >
                        ESI {esiValue ?? '—'}
                      </StatusBadge>
                      <StatusBadge
                        style={bedStatus?.badgeStyle ?? 'neutral'}
                        size='small'
                        showDot={patient.status === 'observing'}
                      >
                        {bedStatus?.label ?? '—'}
                      </StatusBadge>
                    </div>
                  </div>

                  {/* Bed number + patient identity — equal height row. */}
                  <div
                    className='flex items-stretch w-full min-w-0'
                    style={{ gap: 'var(--dim-space-300, 12px)' }}
                  >
                    <BedInfoTooltip patient={patient} position='bottom' className='shrink-0 self-stretch h-full'>
                      <BedNumberBadge
                        bedNo={patient.bedNo}
                        size='md'
                        className='shrink-0 self-stretch'
                        style={{ height: '100%', minHeight: 0 }}
                      />
                    </BedInfoTooltip>
                    <div
                      className='flex flex-1 min-w-0 items-center'
                      style={{
                        backgroundImage:
                          'linear-gradient(94.93deg, var(--patient-card-grad-start) 0.67%, var(--patient-card-grad-end) 100.76%)',
                        border: 'none',
                        borderRadius: 'var(--dim-radius-400)',
                        paddingTop: 'var(--dim-space-400, 16px)',
                        paddingBottom: 'var(--dim-space-400, 16px)',
                        paddingLeft: 'var(--dim-space-600, 24px)',
                        paddingRight: 'var(--dim-space-600, 24px)',
                      }}
                    >
                      <div className='flex items-center min-w-0 w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                        <img
                          src={patient.avatar || getPatientByHN(patient.hn)?.avatarUrl || '/avatars/somchai-mock.png'}
                          alt={patient.patientName}
                          className='rounded-full object-cover shrink-0 shadow-2xs'
                          style={{
                            width: 'var(--dim-size-800, 40px)',
                            height: 'var(--dim-size-800, 40px)',
                            border: 'var(--dim-stroke-400, 4px) solid var(--border-image-default, #FFFFFF)',
                            boxSizing: 'border-box',
                          }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/avatars/somchai-mock.png';
                          }}
                        />
                        <div
                          className='flex-1 min-w-0'
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'var(--dim-size-1800, 96px) minmax(0, 1fr)',
                            columnGap: 'var(--dim-space-200, 8px)',
                            rowGap: 'var(--dim-space-050, 2px)',
                            alignItems: 'baseline',
                            fontFamily: 'var(--type-family-body)',
                            fontSize: 'var(--type-size-xs, 12px)',
                            lineHeight: 1.5,
                            textAlign: 'left',
                          }}
                        >
                          <span
                            className='whitespace-nowrap'
                            style={{
                              color: 'color-mix(in srgb, var(--text-brandPrimary-on-brand, #FFFFFF) 90%, transparent)',
                              fontWeight: 'var(--type-weight-medium, 500)',
                            }}
                          >
                            ชื่อ
                          </span>
                          <button
                            type='button'
                            className='truncate text-left cursor-pointer min-w-0 w-full hover:opacity-90'
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              margin: 0,
                              fontFamily: 'var(--type-family-body)',
                              color: 'var(--text-brandPrimary-on-brand, #FFFFFF)',
                              fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                              fontSize: 'var(--type-size-xs, 12px)',
                              lineHeight: 1.5,
                              textAlign: 'left',
                            }}
                            onClick={() => history.push(isFinishedObserving ? `/observation/history/${patient.id}` : `/observation/record/${patient.id}`)}
                          >
                            {patient.patientName}
                            <span
                              style={{
                                color: 'color-mix(in srgb, var(--text-brandPrimary-on-brand, #FFFFFF) 85%, transparent)',
                                fontWeight: 'var(--type-weight-medium, 500)',
                                fontSize: 'var(--type-size-xs, 12px)',
                              }}
                            >
                              {' '}
                              · {patient.gender}, {patient.age} ปี
                            </span>
                          </button>
                          <span
                            className='whitespace-nowrap'
                            style={{
                              color: 'color-mix(in srgb, var(--text-brandPrimary-on-brand, #FFFFFF) 90%, transparent)',
                              fontWeight: 'var(--type-weight-medium, 500)',
                            }}
                          >
                            HN
                          </span>
                          <span
                            className='truncate min-w-0'
                            style={{
                              color: 'var(--text-brandPrimary-on-brand, #FFFFFF)',
                              fontSize: 'var(--type-size-xs, 12px)',
                              textAlign: 'left',
                            }}
                          >
                            <strong className='font-mono' style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-brandPrimary-on-brand, #FFFFFF)' }}>{patient.hn}</strong>
                            {patient.vn ? (
                              <>
                                {' '}
                                <span style={{ color: 'color-mix(in srgb, var(--text-brandPrimary-on-brand, #FFFFFF) 70%, transparent)' }}>·</span>
                                {' '}
                                <span className='font-mono' style={{ color: 'color-mix(in srgb, var(--text-brandPrimary-on-brand, #FFFFFF) 85%, transparent)' }}>{patient.vn}</span>
                              </>
                            ) : null}
                          </span>
                          {patient.rights && (
                            <>
                              <span
                                className='whitespace-nowrap'
                                style={{
                                  color: 'color-mix(in srgb, var(--text-brandPrimary-on-brand, #FFFFFF) 90%, transparent)',
                                  fontWeight: 'var(--type-weight-medium, 500)',
                                }}
                              >
                                สิทธิการรักษา
                              </span>
                              <span
                                className='truncate min-w-0'
                                title={patient.rights}
                                style={{
                                  color: 'var(--text-brandPrimary-on-brand, #FFFFFF)',
                                  fontWeight: 'var(--type-weight-medium, 500)',
                                  fontSize: 'var(--type-size-xs, 12px)',
                                  textAlign: 'left',
                                }}
                              >
                                {patient.rights}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Vitals Trend Snapshot — full width aligned with the
                      patient profile block above; no outer mint frame. */}
                  {hasPatient(patient) && (
                    <div className='w-full'>
                      <div className='flex items-center text-xs mb-2'>
                        <span className='font-bold text-brand-800 flex items-center gap-1'>
                          <span className='material-symbols-outlined text-sm text-brand-600'>monitor_heart</span>
                          สัญญาณชีพล่าสุด ({latestVitals?.time || '—'})
                        </span>
                      </div>
                      <div
                        className='flex w-full items-stretch overflow-hidden'
                        style={{
                          background: 'var(--surface-card-100)',
                          border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default)',
                          borderRadius: 'var(--dim-radius-300, 10px)',
                        }}
                      >
                        {[
                          {
                            key: 'bp',
                            label: 'ความดัน',
                            value: latestVitals ? `${latestVitals.bpSys}/${latestVitals.bpDia}` : '—',
                          },
                          {
                            key: 'pulse',
                            label: 'ชีพจร',
                            value: latestVitals ? (
                              <>
                                {latestVitals.pulse}
                                {' '}
                                <span style={{ fontWeight: 'var(--type-weight-regular)', color: 'var(--text-content-tertiary)' }}>bpm</span>
                              </>
                            ) : '—',
                          },
                          {
                            key: 'spo2',
                            label: 'SpO2',
                            value: latestVitals ? `${latestVitals.spo2}%` : '—',
                          },
                          {
                            key: 'temp',
                            label: 'อุณหภูมิ',
                            value: latestVitals ? `${latestVitals.temp}°C` : '—',
                          },
                        ].map(({ key, label, value }, index) => {
                          const valueTone = resolveVitalSnapshotTone(key, latestVitals);
                          return (
                          <React.Fragment key={key}>
                            {index > 0 && (
                              <span
                                aria-hidden
                                className='shrink-0 self-stretch'
                                style={{
                                  width: 'var(--dim-stroke-100, 1px)',
                                  background: 'var(--border-card-default)',
                                }}
                              />
                            )}
                            <div
                              className='flex flex-1 items-center justify-between min-w-0'
                              style={{
                                gap: 'var(--dim-space-150, 6px)',
                                padding: 'var(--dim-space-200, 8px) var(--dim-space-300, 12px)',
                              }}
                            >
                              <span
                                className='shrink-0'
                                style={{
                                  color: 'var(--text-content-tertiary)',
                                  fontFamily: 'var(--type-family-body)',
                                  fontSize: 'var(--type-size-xs, 12px)',
                                  fontWeight: 'var(--type-weight-medium, 500)',
                                  lineHeight: 1.5,
                                }}
                              >
                                {label}
                              </span>
                              <span
                                className='truncate text-right'
                                style={{
                                  color: vitalSnapshotValueColor(valueTone),
                                  fontFamily: 'var(--type-family-body)',
                                  fontSize: 'var(--type-size-xs, 12px)',
                                  fontWeight: 'var(--type-weight-medium, 500)',
                                  lineHeight: 1.5,
                                }}
                              >
                                {value}
                              </span>
                            </div>
                          </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* อาการสำคัญ / การวินิจฉัย — deliberately outside the
                      green identity box above (Figma feedback: reads as its
                      own section, not part of the patient ID block). */}
                  <div className='text-xs text-ink-secondary'>
                    <div className='text-ink-tertiary font-medium mb-0.5'>อาการสำคัญแรกรับ (Chief Complaint):</div>
                    <div className='font-semibold text-ink line-clamp-2'>{patient.chiefComplaint}</div>
                  </div>

                  {/* Start / End Time (TOR 1.14.1) + Duration + Doctor — two
                      columns: times left, care team right. */}
                  <div
                    className='grid grid-cols-2 px-1 text-ink-tertiary min-w-0'
                    style={{
                      gap: 'var(--dim-space-100, 4px) var(--dim-space-400, 16px)',
                      fontSize: 'var(--type-size-xs, 12px)',
                      lineHeight: 1.5,
                    }}
                  >
                    <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
                      <div className='flex items-center gap-1 min-w-0'>
                        <span className='material-symbols-outlined text-xs text-ink-quaternary shrink-0'>play_circle</span>
                        <span className='truncate'>
                          เวลาเริ่มต้น (admitTime) <strong className='text-ink-secondary'>{startTimeLabel}</strong>
                        </span>
                      </div>
                      <div className='flex items-center gap-1 min-w-0'>
                        <span className='material-symbols-outlined text-xs text-ink-quaternary shrink-0'>stop_circle</span>
                        <span className='truncate'>
                          เวลาสิ้นสุด (executedTime) <strong className='text-ink-secondary'>{endTimeLabel}</strong>
                        </span>
                      </div>
                      <div className='flex items-center gap-1 min-w-0'>
                        <span className='material-symbols-outlined text-xs text-ink-quaternary shrink-0'>schedule</span>
                        <span className='truncate'>
                          สังเกตอาการแล้ว <strong className='text-ink-secondary'>{formatDurationThai(getObservationDurationMinutes(patient))}</strong>
                        </span>
                      </div>
                    </div>
                    <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
                      <div className='flex items-center gap-1 min-w-0' title={patient.doctorName}>
                        <span className='material-symbols-outlined text-xs text-ink-quaternary shrink-0'>stethoscope</span>
                        <span className='truncate'>
                          ผู้สั่ง: <strong className='text-ink-secondary'>{patient.doctorName}</strong>
                        </span>
                      </div>
                      <div className='flex items-center gap-1 min-w-0' title={patient.nurseName}>
                        <span className='material-symbols-outlined text-xs text-ink-quaternary shrink-0'>badge</span>
                        <span className='truncate'>
                          พยาบาลรับผู้ป่วย: <strong className='text-ink-secondary'>{patient.nurseName || '-'}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions — centered at card bottom when row heights differ. */}
                <div
                  className='flex justify-center w-full mt-auto'
                  style={{ paddingTop: 'var(--dim-space-300, 12px)' }}
                >
                  <div
                    style={{
                      display: 'inline-grid',
                      gap: 'var(--dim-space-200)',
                      gridTemplateColumns: isFinishedObserving ? 'auto' : 'repeat(2, 1fr)',
                      width: 'fit-content',
                      maxWidth: '100%',
                    }}
                  >
                  {!isFinishedObserving && (
                    <BrandPrimaryButton
                      variant='outline'
                      leadingIcon='add_chart'
                      size='sm'
                      onClick={() => handleOpenVitalsModal(patient)}
                    >
                      วัด Vital Signs ใหม่
                    </BrandPrimaryButton>
                  )}
                  <BrandPrimaryButton
                    variant='fill'
                    leadingIcon='clinical_notes'
                    size='sm'
                    onClick={() => history.push(isFinishedObserving ? `/observation/history/${patient.id}` : `/observation/record/${patient.id}`)}
                  >
                    {isFinishedObserving ? 'ประวัติการสังเกตอาการ' : 'แฟ้มสังเกตอาการ'}
                  </BrandPrimaryButton>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )
      ) : (
        /* Table View — shared <Table> component (see OBSERVATION_QUEUE_BASE_COLUMNS
           above) instead of a bespoke Tailwind-gray <table>, matching the OPD
           screening worklist. Empty board uses the same Lottie empty state
           as grid so filter/search misses look identical in both views. */
        filteredPatients.length === 0 ? (
          <ObservationBedsEmptyState onAdmit={openAdmitModal} />
        ) : (
          <Table
            columns={columns}
            rows={pagedPatients}
            rowKey={(patient) => patient.id}
            stickyColCount={3}
            emptyMessage='ไม่พบข้อมูลเตียงสังเกตอาการ'
            sortConfig={sortConfig}
            onSort={handleSort}
          />
        )
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

      {/* Confirm: housekeeping finished cleaning — reopen bed for admit. */}
      <AlertDialog
        open={!!finishCleaningBed}
        onClose={() => setFinishCleaningBed(null)}
        onCancel={() => setFinishCleaningBed(null)}
        onConfirm={confirmFinishCleaning}
        type='warning'
        title='ยืนยันเปิดใช้เตียง'
        description={
          finishCleaningBed ? (
            <>
              {`ยืนยันว่าทำความสะอาด ${finishCleaningBed.bedNo} (${resolveBedTitleTh(finishCleaningBed)}) เสร็จแล้ว`}
              <br />
              และพร้อมรับผู้ป่วยใหม่?
            </>
          ) : ''
        }
        cancelLabel='ยกเลิก'
        confirmLabel='เปิดใช้เตียง'
      />

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

      {/* Modal: Admit Patient to Bed — design-system Popup (same shell as
          AddVitalsModal / "เพิ่มเตียงใหม่เข้าระบบ"). */}
      <Popup
        open={showAdmitModal}
        onClose={() => setShowAdmitModal(false)}
        title='ลงทะเบียนรับผู้ป่วยเข้าเตียงสังเกตอาการ'
        size='large'
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setShowAdmitModal(false) }}
        primaryAction={{
          label: 'ยืนยันครองเตียงสังเกตอาการ',
          onClick: (e) => handleAdmitSubmit(e),
          disabled: !admitForm.hn || !isSelectedBedFree,
        }}
      >
        <div className='flex flex-col text-xs text-ink-secondary' style={{ gap: 'var(--dim-space-600, 24px)' }}>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <p style={ADMIT_FIELD_LABEL_STYLE}>
              ผู้ป่วย
            </p>
            <div className='relative w-full'>
              <SecondarySearch
                fullWidth
                value={patientSearchQuery}
                onChange={(val) => setPatientSearchQuery(val ?? '')}
                onSubmit={(value) => {
                  const hit = patientSearchSuggestions.find(
                    (s) => s.value === value || s.label === value,
                  ) ?? patientSearchSuggestions[0];
                  if (hit) handleSelectPatientFromSearch(hit.value);
                  else if (value) handleSelectPatientFromSearch(value);
                }}
                placeholder='ค้นหา HN / ชื่อ-สกุล'
                className='w-full'
                style={{ width: '100%', maxWidth: 'none' }}
              />
              {patientSearchQuery.trim() && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + var(--dim-space-100, 4px))',
                    left: 0,
                    right: 0,
                    zIndex: 1200,
                  }}
                >
                  <DropdownPanel>
                    {patientSearchSuggestions.length > 0 ? (
                      patientSearchSuggestions.map((item) => (
                        <SuggestionRow
                          key={item.id}
                          item={item}
                          query={patientSearchQuery.trim()}
                          onPick={(picked) => handleSelectPatientFromSearch(picked.value ?? picked.label)}
                        />
                      ))
                    ) : (
                      <div
                        style={{
                          padding: 'var(--dim-space-300, 12px)',
                          color: 'var(--text-content-tertiary)',
                          fontFamily: 'var(--type-family-body)',
                          fontSize: 'var(--type-size-sm, 14px)',
                          lineHeight: 1.5,
                        }}
                      >
                        ไม่พบผู้ป่วยที่ค้นหา
                      </div>
                    )}
                  </DropdownPanel>
                </div>
              )}
            </div>
            {admitForm.hn && (
              <div style={{ marginTop: 'var(--dim-space-200, 8px)' }}>
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
              fields — "ผู้ป่วย" search above fills them straight into
              admitForm (see handleSelectPatientFromSearch) and the
              PatientSummaryCard confirms what was picked. Only the bed
              itself still needs a choice here — opens the same photo-
              tile BedSelectionPopup as OPD screening instead of a
              plain text dropdown. */}
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <p style={ADMIT_FIELD_LABEL_STYLE}>
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
            {!isSelectedBedFree && (
              <p style={{ marginTop: 'var(--dim-space-150)', color: 'var(--text-danger-default)', fontSize: 'var(--type-size-xs)' }}>
                {selectedBed?.status === BED_CLEANING_STATUS
                  ? 'เตียงนี้รอทำความสะอาด — ต้องกด “ทำความสะอาดเสร็จ” ก่อนจึงจะรับผู้ป่วยเข้าเตียงได้'
                  : 'เตียงนี้มีผู้ป่วยครองอยู่แล้ว — กรุณาเลือกเตียงว่าง'}
              </p>
            )}
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

          <div className='grid grid-cols-2' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <Select
              label='ผู้สั่ง'
              value={admitForm.doctorName}
              onChange={(val) => setAdmitForm({ ...admitForm, doctorName: val })}
              options={DOCTOR_STAFF_OPTIONS}
              required
            />
            {/* พยาบาลรับผู้ป่วย — locked to the signed-in user (filled field + avatar). */}
            <FieldShell label='พยาบาลรับผู้ป่วย' required>
              <div
                className='inline-flex items-center w-full'
                aria-readonly='true'
                style={{
                  height: 'var(--dim-size-800, 48px)',
                  gap: 'var(--dim-space-200, 8px)',
                  paddingLeft: 'var(--dim-space-400, 16px)',
                  paddingRight: 'var(--dim-space-400, 16px)',
                  paddingTop: 'var(--dim-space-200, 8px)',
                  paddingBottom: 'var(--dim-space-200, 8px)',
                  borderRadius: 'var(--dim-radius-200, 8px)',
                  border: 'var(--dim-stroke-100, 1px) solid var(--border-input-filled)',
                  background: 'var(--surface-input-default)',
                  boxSizing: 'border-box',
                }}
              >
                {admitForm.nurseAvatar ? (
                  <img
                    src={admitForm.nurseAvatar}
                    alt=''
                    style={{
                      width: 'var(--dim-size-500, 24px)',
                      height: 'var(--dim-size-500, 24px)',
                      borderRadius: 'var(--dim-radius-full, 9999px)',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <Icon
                    name='person'
                    size={24}
                    style={{ color: 'var(--icon-input-filled)', flexShrink: 0 }}
                  />
                )}
                <span
                  style={{
                    color: 'var(--text-input-filled)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm, 14px)',
                    fontWeight: 'var(--type-weight-regular)',
                    lineHeight: 1.5,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {admitForm.nurseName}
                </span>
              </div>
            </FieldShell>
          </div>
        </div>
        <NestedBedSelectionPanel
          open={showBedPickerModal}
          beds={observationBedOptions}
          initialSelectedId={admitForm.bedId}
          onClose={() => setShowBedPickerModal(false)}
          onConfirm={(bedId) => setAdmitForm((prev) => ({ ...prev, bedId }))}
        />
      </Popup>

      {/* Bed picker nested inside admit Popup above — Popup stack handles z-index. */}

      {/* "เพิ่มเตียงใหม่เข้าระบบ" — adds a brand-new empty bed slot (not an
          admission). เลขเตียง is always auto-assigned (never user-editable);
          the photo tiles reuse the same MOCK_PATIENT_BEDS catalogue as the
          admit modal's bed picker. */}
      <Popup
        open={showAddBedModal}
        onClose={() => setShowAddBedModal(false)}
        title={isNextBedExtra ? 'ลงทะเบียนเตียงเสริม (Extra Bed / Stretcher)' : 'เพิ่มเตียงสังเกตอาการใหม่'}
        subtitle='เลือกรูปแบบเตียงและระบุคำอธิบาย ระบบจะกำหนดเลขเตียงให้อัตโนมัติ'
        size='extraLarge'
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setShowAddBedModal(false) }}
        primaryAction={{
          label: isNextBedExtra ? 'ลงทะเบียนเตียงเสริม' : 'เพิ่มเตียง',
          onClick: handleAddBed,
          disabled: !newBedForm.bedTypeId || !newBedForm.description.trim(),
        }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-600, 24px)' }}>
          <div
            className='flex items-baseline'
            style={{
              gap: 'var(--dim-space-150, 6px)',
              fontSize: 'var(--type-size-sm)',
            }}
          >
            <span style={{ color: 'var(--text-content-tertiary)', fontWeight: 'var(--type-weight-regular)' }}>
              เลขเตียง:
            </span>
            <span style={{ color: 'var(--text-brandPrimary-default)', fontSize: 'var(--type-size-base)', fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))' }}>
              {String(nextBedNumber).padStart(2, '0')}{isNextBedExtra ? '-Extra' : ''}
            </span>
            <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-regular)' }}>
              (กำหนดอัตโนมัติ)
            </span>
          </div>

          <div>
            <div style={{ marginBottom: 'var(--dim-space-200)', color: 'var(--text-content-default)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)' }}>
              รูปแบบเตียง
            </div>
            <BedSelectionGrid
              beds={MOCK_PATIENT_BEDS}
              selectedId={newBedForm.bedTypeId}
              showBadge={false}
              showStatusBadge={false}
              onSelect={(bedId) => {
                setNewBedForm((prev) => ({ ...prev, bedTypeId: bedId }));
              }}
            />
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
            label='จุดสังเกต'
            value={newBedForm.description}
            onChange={(e) => setNewBedForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder='ระบุลักษณะ หรือสถานที่วางเตียง เพื่อใช้เป็นจุดสังเกต'
            required
          />
        </div>
      </Popup>
    </QueuePageShell>
  );
}
