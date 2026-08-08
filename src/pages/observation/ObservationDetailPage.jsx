import React, { useEffect, useRef, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import StatusBadge from '@/components/badge/StatusBadge';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import SelectableTag from '@/components/forms/SelectableTag';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Popup from '@/components/popup/Popup';
import { useNestedPopupPanel } from '@/components/popup/useNestedPopupPanel';
import {
  InternalReferFields,
  listInternalReferDepartments,
  listInternalReferServicePoints,
  resolveInternalReferLabels,
} from '@/components/popup/InternalReferPopup';
import Alert from '@/components/alert/Alert';
import TabPill, { TabBar } from '@/components/tab/TabPill';
import VitalTrendChart from '@/components/observation/VitalTrendChart';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  MOCK_OBSERVATION_PATIENTS,
  getOutOfRangeVitals,
  getPendingStatOrders,
  buildObservationTimeline,
  observationDayOffset,
  formatObservationDateTime,
  BLANK_OBSERVATION_VITALS_FORM,
  vitalsTimelineCells,
} from '@/data/observationMock';
import {
  resolveVitalSnapshotTone,
  vitalSnapshotValueColor,
} from '@/data/vitalDisplayTone';
import Pagination from '@/components/pagination/Pagination';
import RecordWizardMorphBand, { MORPH_STICKY_BELOW_PATIENT } from '@/components/layout/RecordWizardMorphBand';
import { MIH_CHROME_MORPH_FOOTER } from '@/components/layout/wizardChromeMorphStyles';
import SuccessToast from '@/components/toast/SuccessToast';
import ConsentFormCancelEditPopup from '@/components/popup/ConsentFormCancelEditPopup';
import PatientCard from '@/components/card/PatientCard';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import AddVitalsModal, { VITALS_NOTE_SUGGESTIONS } from '@/components/observation/AddVitalsModal';
import ObservationExternalReferForm, {
  buildObservationExternalReferDraft,
  externalReferHospitalLabel,
  flattenExternalReferForSave,
  isObservationExternalReferIncomplete,
} from '@/components/observation/ObservationExternalReferForm';
import { blankReferral, saveReferral } from '@/data/treatmentRefer';
import { DEFAULT_CLINIC_VALUE, useClinicFilter } from '@/components/layout/HeaderClinicContext';

/* Matches the OPD queue table's own page size (QueuePage.jsx PAGE_SIZE). */
const VITALS_PAGE_SIZE = 20;

/* Suggestion popovers — same SuggestibleTextarea pattern as OPD screening's
   CHIEF_COMPLAINT_SUGGESTIONS (minChars 3). No existing list fits a
   discharge summary/instructions context, so these are new. */
const DOCTOR_DISCHARGE_NOTE_SUGGESTIONS = [
  'ผู้ป่วยอาการดีขึ้น สัญญาณชีพคงที่ ไม่มีภาวะแทรกซ้อน อนุญาตให้กลับบ้าน',
  'ผู้ป่วยตอบสนองต่อการรักษาดี หายใจสะดวกขึ้น ฟังปอดปกติ อนุญาตให้กลับบ้านพร้อมยาประจำตัว',
  'ผู้ป่วยไข้ลดลง สัญญาณชีพปกติ ไม่มีอาการซึม อนุญาตให้กลับบ้าน นัดติดตามอาการ',
  'ผู้ป่วยความดันโลหิตคงที่ ไม่มีอาการเวียนศีรษะหรือหน้ามืด อนุญาตให้กลับบ้าน',
  'สงสัยภาวะฉุกเฉิน อาการไม่ดีขึ้นหลังการรักษาเบื้องต้น พิจารณาส่งต่อโรงพยาบาลเพื่อตรวจเพิ่มเติม',
  'ผู้ป่วยเด็กไข้ลดลง เล่นได้ปกติ ทานอาหารได้ อนุญาตให้กลับบ้านพร้อมยาลดไข้',
];

const DISCHARGE_INSTRUCTIONS_SUGGESTIONS = [
  'รับประทานยาตามแพทย์สั่งให้ครบ หากมีอาการแพ้ยาให้หยุดยาและรีบมาพบแพทย์ทันที',
  'พักผ่อนให้เพียงพอ งดกิจกรรมหนักอย่างน้อย 3-5 วัน หากอาการไม่ดีขึ้นให้กลับมาพบแพทย์',
  'สังเกตอาการไข้สูง หายใจเหนื่อยหอบ หรือเจ็บหน้าอกเพิ่มขึ้น หากมีให้รีบมาโรงพยาบาลทันที',
  'ดื่มน้ำให้เพียงพอ หลีกเลี่ยงอาหารรสจัด และมาตามนัดติดตามอาการตามกำหนด',
  'หลีกเลี่ยงฝุ่น PM2.5 และควันบุหรี่ พ่นยาตามแพทย์สั่งสม่ำเสมอ หากเหนื่อยหอบเพิ่มให้รีบมาพบแพทย์',
  'เฝ้าระวังอาการเวียนศีรษะ หน้ามืด หรือใจสั่น หากเป็นซ้ำให้วัดความดันและมาพบแพทย์',
];

/* DAMA (Discharge Against Medical Advice) — the reasons a patient most
   often gives for walking out of observation before the doctor allows
   it. Same SuggestibleTextarea contract as every other clinician-typed
   field on this page. */
const DAMA_REASON_SUGGESTIONS = [
  'ผู้ป่วยต้องการกลับไปดูแลครอบครัวที่บ้าน ไม่สามารถรอสังเกตอาการต่อได้',
  'ผู้ป่วยปฏิเสธการนอนสังเกตอาการต่อ ยืนยันว่าอาการดีขึ้นแล้ว',
  'ผู้ป่วยกังวลเรื่องค่าใช้จ่าย จึงขอกลับบ้านก่อนครบกำหนดสังเกตอาการ',
  'ญาติผู้ป่วยขอรับกลับไปรักษาต่อที่โรงพยาบาลใกล้บ้าน',
  'ผู้ป่วยติดภารกิจจำเป็น ขอกลับก่อนและรับทราบความเสี่ยงแล้ว',
];

const STAT_ORDER_SUGGESTIONS = [
  'Berodual 1 respule Nebulizer Stat',
  'Oxygen Cannula 3 LPM keep SpO2 > 95%',
  'IV NSS 1,000 ml IV drip 80 ml/hr',
  'Paracetamol 500 mg 1 tab Oral Stat for fever',
  'Adrenaline 1:1000 0.3 mg IM Stat',
  '12-lead EKG Stat',
];

/* Timeline header's quick "สั่ง Lab ด่วน" popup — shares the same
   patient.statOrders array + handleAddOrder as STAT_ORDER_SUGGESTIONS
   above (this observation record has no separate lab-order data model),
   just its own suggestion list so quick-picks read as lab tests. */
const LAB_ORDER_SUGGESTIONS = [
  'CBC Stat',
  'Electrolyte (Na, K, Cl, CO2) Stat',
  'Blood Sugar (DTX) Stat',
  'Chest X-ray (CXR) Stat',
  'Urine Analysis (UA) Stat',
  'Hemoculture x2 Stat',
];

/* "สั่งยา STAT Dose" / "สั่ง Lab ด่วน" popups' quick-pick tags — clicking
   one fills newOrderText directly (no separate selection state to track). */
const STAT_DOSE_QUICK_TAGS = ['Berodual Nebulizer', 'Paracetamol IV', 'Amlodipine Oral'];
const LAB_ORDER_QUICK_TAGS = ['Stat CBC', 'Electrolyte', 'Amylase', 'EKG 12 leads'];

const NURSING_NOTE_SUGGESTIONS = [
  'ผู้ป่วยรู้สึกตัวดี ไม่มีอาการแน่นหน้าอกเพิ่ม สัญญาณชีพคงที่',
  'พ่นยาขยายหลอดลมตามแผนการรักษา ฟังเสียงปอด Wheezing ลดลง',
  'ให้ออกซิเจน Cannula ตามคำสั่งแพทย์ ผู้ป่วยหายใจสะดวกขึ้น',
  'ผู้ป่วยลุกนั่งได้ ทานอาหารอ่อนได้ ไม่มีอาการเวียนศีรษะ',
  'เฝ้าระวังอาการใกล้ชิด วัดสัญญาณชีพทุก 30 นาที ตามคำสั่งแพทย์',
  'ผู้ป่วยนอนหลับพักผ่อนได้ดี ไม่มีอาการปวดเพิ่มเติม',
];

/* TOR 1.14.3 — บันทึกความเห็นของบุคลากรกลุ่มต่าง ๆ. No staff login/session
   exists anywhere in this app, so which note types are selectable is
   gated by a local mock "เข้าสู่ระบบในฐานะ" role toggle instead of a real
   authenticated role — Progress Note is shared, Nurse/Doctor Note are
   role-exclusive. */
/* Timeline header's two quick-add popups (split from one combined button
   per user request) skip the role gate above — each offers its own tag
   set as chips, no "เข้าสู่ระบบในฐานะ" step. */
const OPINION_NOTE_TYPES = [
  'บันทึกความคืบหน้าในการรักษา (Progress Note)',
  'บันทึกการพยาบาล (Nurse Note)',
  'บันทึกของแพทย์ (Doctor Note)',
];
const PROCEDURE_NOTE_TYPES = [
  'บันทึกหัตถการ',
  'บันทึกกิจกรรมการพยาบาล',
  'การพ่นยา',
  'ให้ออกซิเจน',
  'เช็ดตัวลดไข้',
  'ทำแผล',
  'ดูดเสมหะ',
  'ให้สารน้ำทางหลอดเลือดดำ',
  'อื่นๆ',
];

/* Section order for the page-level step indicator — same StepProgress
   component used by the treatment/CPOE wizard (Figma node 2709:6562).
   Collapsed from 4 steps to 2: the merged Observation Timeline (vitals +
   notes + orders, all addable via the timeline header's quick-add
   popups) and the Discharge Summary. STAT/Lab order status management
   and the standalone Nursing Activity Log table were dropped along with
   the old steps 2/3 — orders/notes now only surface read-only inside
   the timeline feed. */
const OBSERVATION_STEP_KEYS = ['vitals', 'discharge'];


export default function ObservationDetailPage() {
  const clinicCtx = useClinicFilter();
  const centerId = clinicCtx?.clinic || DEFAULT_CLINIC_VALUE;
  const { id } = useParams();
  const history = useHistory();

  // Find patient record by ID (or default to obs-001)
  const initialPatient = MOCK_OBSERVATION_PATIENTS.find((p) => p.id === id) || MOCK_OBSERVATION_PATIENTS[0];
  const [patient, setPatient] = useState(initialPatient);
  const [activeTab, setActiveTab] = useState('vitals'); // 'vitals' | 'discharge'
  const [selectedTrendParam, setSelectedTrendParam] = useState('bp'); // 'bp' | 'pulse' | 'spo2' | 'temp' | 'rr'

  // Forms states
  const [newVital, setNewVital] = useState({ ...BLANK_OBSERVATION_VITALS_FORM });
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showTrendGraphModal, setShowTrendGraphModal] = useState(false);
  /* null when closed, otherwise which quick-add popup is open (each with
     its own tag set — see PROCEDURE_NOTE_TYPES / OPINION_NOTE_TYPES). */
  const [addNoteVariant, setAddNoteVariant] = useState(null);
  /* null when closed, otherwise which quick-order popup is open — both
     "สั่งยา STAT Dose" and "สั่ง Lab ด่วน" write to the same
     patient.statOrders array via handleAddOrder, just with their own
     suggestion list (see STAT_ORDER_SUGGESTIONS / LAB_ORDER_SUGGESTIONS). */
  const [orderModalKind, setOrderModalKind] = useState(null);
  /* "ส่งต่อ" popup — asks from/to department before the discharge record
     actually saves (see commitDischarge). 'internal' | 'external' | 'dama'.
     'dama' is Discharge Against Medical Advice (edge case #3): the
     patient is leaving of their own accord, so there IS no destination
     to pick — instead the popup demands a signed waiver + a reason. */
  const [showReferModal, setShowReferModal] = useState(false);
  /* Nested drill-down inside ส่งต่อผู้ป่วย Popup — chooser (tags) → detail. */
  const referPanels = useNestedPopupPanel('chooser');
  const [referScope, setReferScope] = useState('internal');
  const [referDepartment, setReferDepartment] = useState('');
  const [referServicePoint, setReferServicePoint] = useState('');
  /* Optional free-text note on internal refer — not required to confirm. */
  const [referNote, setReferNote] = useState('');
  const [damaReason, setDamaReason] = useState('');
  /* Only the file NAME is kept — this is a mock with no upload backend,
     and storing the File object would imply a persistence that isn't
     there. Enough to prove the waiver was attached before discharge. */
  const [damaConsentFileName, setDamaConsentFileName] = useState('');
  const [externalReferDraft, setExternalReferDraft] = useState(() =>
    buildObservationExternalReferDraft(initialPatient, { centerId }),
  );
  /* Edge case #6 — second-stage confirmation shown when the clinician
     tries to finish while STAT orders are still 'pending'. */
  const [showPendingStatModal, setShowPendingStatModal] = useState(false);
  const [vitalsPage, setVitalsPage] = useState(1);
  const [draftSavedToast, setDraftSavedToast] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  /* True once the session wrote a new vitals / note / STAT order into the
     in-memory record. Used with discharge-form dirty check so Cancel can
     exit without a confirm popup when nothing was actually changed. */
  const [recordMutated, setRecordMutated] = useState(false);
  const initialDischargeRef = useRef({
    doctorSummary: initialPatient.dischargeSummary?.doctorSummary || '',
    dischargeAdvice: initialPatient.dischargeSummary?.dischargeAdvice || '',
    referHospital: initialPatient.dischargeSummary?.referHospital || '',
  });
  /* Message text, or '' when no toast is showing. */
  const [saveToast, setSaveToast] = useState('');
  /* VitalCard/PressureCard's `required` prop only renders the asterisk —
     unlike InputField it never reaches the native <input>, so nothing
     stops an all-empty submit. Track each field's validity explicitly
     (same pattern as VitalsForm.jsx's vitalValidity) and gate the submit
     button + handler on it, so a forgotten field can't silently get
     recorded as a "normal" default reading. */
  const [vitalFieldValidity, setVitalFieldValidity] = useState({});
  const setVitalFieldValid = (field, valid) =>
    setVitalFieldValidity((prev) => (prev[field] === valid ? prev : { ...prev, [field]: valid }));
  const REQUIRED_VITAL_FIELDS = ['pressure', 'pulse', 'temp', 'spo2', 'rr'];
  const isVitalFormValid = REQUIRED_VITAL_FIELDS.every((f) => vitalFieldValidity[f] === true)
    && !!newVital.pain
    && newVital.esi != null && newVital.esi !== '';

  const [newOrderText, setNewOrderText] = useState('');
  const [newNursingNote, setNewNursingNote] = useState('');
  /* Always overwritten by handleOpenAddNoteModal before either quick-add
     popup opens — this initial value is never actually shown. */
  const [noteType, setNoteType] = useState(OPINION_NOTE_TYPES[0]);

  const [dischargeForm, setDischargeForm] = useState({
    doctorSummary: patient.dischargeSummary?.doctorSummary || '',
    dischargeAdvice: patient.dischargeSummary?.dischargeAdvice || '',
    referHospital: patient.dischargeSummary?.referHospital || '',
  });

  const latestVitals = patient.vitalsTrend?.[patient.vitalsTrend.length - 1];
  const latestEsi = latestVitals?.esi != null && latestVitals?.esi !== ''
    ? Number(latestVitals.esi)
    : null;

  /* Observation Timeline — merges vitalsTrend + nursingNotes + statOrders
     into one chronological feed so every timestamp shows its vital signs,
     whatever personnel opinion was recorded at/around that time, AND any
     STAT medication/Lab order placed then — instead of living in three
     disconnected sections (a vitals table on this step, a notes timeline
     on step 3, an order list on step 2). Vitals entries bring their own
     embedded `note` (recorded at measurement time); any nursingNotes or
     statOrders entry sharing the same timestamp is folded into the same
     row, everything else becomes its own row.

     Two things the naive version got wrong:
       • **Ordering (edge case #12).** "HH:MM น." carries no date, so a
         stay that crosses midnight sorted 00:15 น. *below* 23:50 น.
         Each source list is authored chronologically, so absolute
         timestamps are rebuilt by rolling forward a day whenever the
         clock goes backwards, anchored on admitTime — and the feed is
         sorted on those, newest first.
       • **Collisions (edge case #11).** Rows were keyed on the time
         string alone, so a second reading taken in the same minute
         silently REPLACED the first and the earlier vitals vanished
         from the record. A repeated timestamp now gets its own row
         (`14:32 น.#1`) instead of overwriting.  */
  const observationTimeline = buildObservationTimeline(patient);

  /* Day-1 / Day-2 marker for stays that run past midnight — without it
     two rows reading "23:50 น." and "00:15 น." look out of order even
     though they are sorted correctly. */
  const dayOffsetOf = (entry) => observationDayOffset(patient, entry);

  /* Per-vitals-reading opinions, in the same order as patient.vitalsTrend
     (chronological, matching the trend chart's x-axis) — looked up by the
     timeline's own row key so same-minute repeats keep their own notes
     instead of all resolving to the first row. */
  const timelineByKey = new Map(observationTimeline.map((e) => [e.key, e.opinions]));
  const trendNotesByIndex = (() => {
    const seen = new Map();
    return patient.vitalsTrend.map((v) => {
      const repeat = seen.get(v.time) || 0;
      seen.set(v.time, repeat + 1);
      return timelineByKey.get(repeat === 0 ? v.time : `${v.time}#${repeat}`) ?? [];
    });
  })();

  // Observation Timeline pagination — same PAGE_SIZE/Pagination pattern as QueuePage.jsx
  const vitalsTotalPages = Math.max(1, Math.ceil(observationTimeline.length / VITALS_PAGE_SIZE));
  const vitalsPageClamped = Math.min(vitalsPage, vitalsTotalPages);
  const vitalsRangeStart = observationTimeline.length === 0 ? 0 : (vitalsPageClamped - 1) * VITALS_PAGE_SIZE + 1;
  const vitalsRangeEnd = Math.min(vitalsPageClamped * VITALS_PAGE_SIZE, observationTimeline.length);
  const pagedTimeline = observationTimeline.slice(
    (vitalsPageClamped - 1) * VITALS_PAGE_SIZE,
    vitalsPageClamped * VITALS_PAGE_SIZE,
  );

  const handleOpenVitalsModal = () => {
    /* Blank fields — mirrors ObservationQueuePage's handleOpenVitalsModal
       so a value left over from a previous, uncommitted attempt can't
       leak into the popup as a stale, unmeasured reading. */
    setNewVital({ ...BLANK_OBSERVATION_VITALS_FORM });
    setVitalFieldValidity({});
    setShowVitalsModal(true);
  };

  const handleAddVital = (e) => {
    e.preventDefault();
    /* Guard against implicit form submission (pressing Enter inside a
       VitalCard's number input submits the form even when the visible
       button is disabled) — without this, an unmeasured field could
       still slip through as a "normal" default reading. */
    if (!isVitalFormValid) return;
    /* Out-of-bound range check (edge case #5) — AddVitalsModal already
       disables its save button on this; repeated here because Enter
       inside a VitalCard input reaches the handler regardless. */
    if (getOutOfRangeVitals(newVital).length > 0) return;
    const nowStr = `${new Date().getHours().toString().padStart(2,'0')}:${new Date().getMinutes().toString().padStart(2,'0')} น.`;
    const newLog = {
      time: nowStr,
      bpSys: Number(newVital.bpSys) || 120,
      bpDia: Number(newVital.bpDia) || 80,
      pulse: Number(newVital.pulse) || 80,
      temp: Number(newVital.temp) || 36.6,
      spo2: Number(newVital.spo2) || 98,
      rr: Number(newVital.rr) || 18,
      note: newVital.note || 'บันทึกประจำช่วงเวลา',
      pain: newVital.pain,
      esi: Number(newVital.esi),
    };

    setPatient((prev) => ({
      ...prev,
      vitalsTrend: [...prev.vitalsTrend, newLog],
    }));
    setRecordMutated(true);

    setNewVital({ ...BLANK_OBSERVATION_VITALS_FORM });
    setVitalFieldValidity({});
  };

  /* Modal variant of handleAddVital — the timeline header's "วัด Vital
     Signs ใหม่" button opens AddVitalsModal (shared with
     ObservationQueuePage) instead of scrolling to the inline Add Timed
     Vitals card below; closes the popup once the save actually goes
     through (handleAddVital already no-ops on an invalid form). */
  const handleSaveVitalsModal = (e) => {
    handleAddVital(e);
    if (isVitalFormValid) setShowVitalsModal(false);
  };

  const handleAddOrder = (e) => {
    e.preventDefault();
    if (!newOrderText.trim()) return;

    const nowStr = `${new Date().getHours().toString().padStart(2,'0')}:${new Date().getMinutes().toString().padStart(2,'0')} น.`;
    const newOrd = {
      id: `ord-${Date.now()}`,
      orderTime: nowStr,
      orderText: newOrderText,
      status: 'pending',
      executedBy: '-',
      executedTime: '-',
    };

    setPatient((prev) => ({
      ...prev,
      statOrders: [...prev.statOrders, newOrd],
    }));
    setRecordMutated(true);

    setNewOrderText('');
  };

  const handleOpenOrderModal = (kind) => {
    /* Blank the shared newOrderText state — mirrors handleOpenVitalsModal
       so a half-typed order left in step 2's inline panel can't leak into
       this popup. */
    setNewOrderText('');
    setOrderModalKind(kind);
  };

  const handleSaveOrderModal = (e) => {
    handleAddOrder(e);
    if (newOrderText.trim()) setOrderModalKind(null);
  };

  /* Status pill styling for a STAT/Lab order — used by the Observation
     Timeline's order-entry rows (orders no longer have their own step;
     see observationTimeline merge above). */
  const STAT_ORDER_STATUS_STYLE = {
    completed:   { bg: 'var(--surface-colorfulbadge-green)',  color: 'var(--text-colorfulbadge-green)',  icon: 'check_circle' },
    in_progress: { bg: 'var(--surface-colorfulbadge-orange)', color: 'var(--text-colorfulbadge-orange)', icon: 'hourglass_top' },
    pending:     { bg: 'var(--surface-colorfulbadge-red)',    color: 'var(--text-colorfulbadge-red)',    icon: 'error' },
    /* Written by the discharge guard (edge case #6) when the clinician
       chooses to void the outstanding STAT orders instead of executing
       them — a voided order must stay visible in the timeline, never be
       deleted from the record. */
    cancelled:   { bg: 'var(--surface-neutral-quaternary)',   color: 'var(--text-content-tertiary)',     icon: 'cancel' },
  };

  const handleAddNursingNote = (e) => {
    e.preventDefault();
    if (!newNursingNote.trim()) return;

    const nowStr = `${new Date().getHours().toString().padStart(2,'0')}:${new Date().getMinutes().toString().padStart(2,'0')} น.`;
    const newNote = {
      time: nowStr,
      nurse: patient.nurseName,
      note: newNursingNote,
      noteType,
    };

    setPatient((prev) => ({
      ...prev,
      nursingNotes: [...prev.nursingNotes, newNote],
    }));
    setRecordMutated(true);

    setNewNursingNote('');
  };

  const handleOpenAddNoteModal = (variant) => {
    /* Blank the shared newNursingNote state — mirrors handleOpenVitalsModal
       so a half-typed note left in step 3's inline panel can't leak into
       this popup. Defaults the tag to this variant's first option,
       regardless of step 3's role-gated noteType — these popups skip the
       role gate entirely. */
    setNewNursingNote('');
    setNoteType((variant === 'procedure' ? PROCEDURE_NOTE_TYPES : OPINION_NOTE_TYPES)[0]);
    setAddNoteVariant(variant);
  };

  const handleSaveNoteModal = (e) => {
    handleAddNursingNote(e);
    if (newNursingNote.trim()) setAddNoteVariant(null);
  };

  /* referHospital/referDepartment use the custom Select (button-based
     dropdown, no native <select>), so `required` only renders the
     asterisk — same gap as VitalCard. Guard explicitly instead of
     relying on native form validation. */
  const isDama = referScope === 'dama';
  const isReferTargetMissing =
    isDama
      /* DAMA has no destination — what must be captured instead is the
         signed waiver and the patient's stated reason (edge case #3). */
      ? (!damaConsentFileName || !damaReason.trim())
      : referScope === 'internal'
      ? !String(referDepartment || '').trim() || !String(referServicePoint || '').trim()
      : isObservationExternalReferIncomplete(externalReferDraft);

  /* Read live catalogs each render — assess departments + queue stations
     mutate in place / localStorage, so a stale memo would hide CRUD. */
  const referDepartmentOptions = listInternalReferDepartments(centerId);
  const referServicePointOptions = listInternalReferServicePoints();

  /* SuggestibleTextarea's `required` prop is cosmetic only (asterisk) —
     same gap as VitalCard/Select — so the ส่งต่อ button gates on this
     explicitly instead of relying on native form validation. A DAMA
     discharge is exempt: the patient is leaving against advice, so the
     reason field IS the clinical record and gets copied into
     doctorSummary below rather than demanded a second time. */
  const isDoctorSummaryMissing = !isDama && !dischargeForm.doctorSummary.trim();

  /* Edge case #6 — STAT orders nobody has acted on yet. 'in_progress' is
     already being carried out, so only 'pending' blocks. */
  const pendingStatOrders = getPendingStatOrders(patient);

  /* `cancelPendingOrders` comes from the pending-STAT confirmation
     (edge case #6): true voids the outstanding orders as part of the
     discharge, false lets them stand on the record as unexecuted. */
  const commitDischarge = ({ cancelPendingOrders = false } = {}) => {
    if (isDoctorSummaryMissing || isReferTargetMissing) return;
    const referHospitalLabel = referScope === 'external'
      ? externalReferHospitalLabel(externalReferDraft)
      : '';
    if (referScope === 'external') {
      const flat = flattenExternalReferForSave(externalReferDraft);
      saveReferral({
        ...blankReferral({
          hn: patient.hn,
          name: patient.patientName,
          rights: patient.rights,
        }),
        ...flat,
        hn: flat.hn || patient.hn,
        name: flat.name || patient.patientName,
        rights: flat.rights || patient.rights,
        direction: 'out',
        status: 'sent',
      });
    }
    const now = new Date();
    const nowStr = formatObservationDateTime(now).split(' ').slice(1).join(' ');
    setPatient((prev) => ({
      ...prev,
      status: 'discharged',
      /* Freezes the derived stay length at the moment the patient left
         — without it the duration would keep counting forever. */
      dischargeTime: formatObservationDateTime(now),
      statOrders: cancelPendingOrders
        ? prev.statOrders.map((o) => (o.status === 'pending' ? { ...o, status: 'cancelled', executedTime: nowStr } : o))
        : prev.statOrders,
      nursingNotes: isDama
        ? [
            ...prev.nursingNotes,
            {
              time: nowStr,
              nurse: prev.nurseName,
              note: `DAMA — ผู้ป่วยปฏิเสธการรักษาและขอกลับบ้านก่อนแพทย์อนุญาต · เหตุผล: ${damaReason.trim()} · แนบใบยินยอมปฏิเสธการรักษา: ${damaConsentFileName}`,
            },
          ]
        : prev.nursingNotes,
      dischargeSummary: {
        ...dischargeForm,
        /* DAMA is a disposition in its own right — not a referral, not a
           routine discharge home — so downstream reports can count it. */
        disposition: isDama ? 'dama' : 'refer',
        referScope,
        referDepartment: referScope === 'internal'
          ? resolveInternalReferLabels({
              departmentId: referDepartment,
              servicePointId: referServicePoint,
              centerId,
            }).departmentLabel
          : '',
        referServicePoint: referScope === 'internal'
          ? resolveInternalReferLabels({
              departmentId: referDepartment,
              servicePointId: referServicePoint,
              centerId,
            }).servicePointLabel
          : '',
        referNote: referScope === 'internal' ? referNote.trim() : '',
        referHospital: referHospitalLabel,
        externalReferForm: referScope === 'external' ? { ...externalReferDraft } : null,
        doctorSummary: isDama
          ? (dischargeForm.doctorSummary.trim() || `ผู้ป่วยปฏิเสธการรักษาและขอกลับบ้าน (DAMA) — ${damaReason.trim()}`)
          : dischargeForm.doctorSummary,
        damaReason: isDama ? damaReason.trim() : '',
        damaConsentFileName: isDama ? damaConsentFileName : '',
        dischargeVitals: latestVitals ? { ...latestVitals } : null,
      },
    }));
    setShowPendingStatModal(false);
    setShowReferModal(false);
    /* The design system's own toast, not window.alert — a native dialog
       blocks the page until dismissed, which is the wrong interruption
       for a save that already succeeded. */
    setSaveToast(isDama ? 'บันทึกการจำหน่ายแบบปฏิเสธการรักษา (DAMA) แล้ว' : 'บันทึกการส่งต่อผู้ป่วยแล้ว');
  };

  const handleConfirmRefer = (e) => {
    e.preventDefault();
    if (isDoctorSummaryMissing || isReferTargetMissing) return;
    /* Edge case #6 — never discharge straight past unexecuted STAT
       orders; make the clinician decide what happens to them first. */
    if (pendingStatOrders.length > 0) {
      setShowPendingStatModal(true);
      return;
    }
    commitDischarge();
  };

  const observationSteps = [
    { title: 'ไทม์ไลน์การสังเกตอาการ', subtitle: 'Observation Timeline' },
    { title: 'สรุปผลการสังเกตอาการ', subtitle: 'Discharge Summary' },
  ];

  /* Sticky bottom action bar — same layout as CreateConsentFormPage: ยกเลิก
     exits to the observation queue, ย้อนกลับ moves to the previous tab.
     Final step's primary button opens the discharge/refer flow. */
  const currentStepIdx = OBSERVATION_STEP_KEYS.indexOf(activeTab);
  const isFirstStep = currentStepIdx === 0;
  const isLastStep = currentStepIdx === OBSERVATION_STEP_KEYS.length - 1;
  const goPrevStep = () => setActiveTab(OBSERVATION_STEP_KEYS[Math.max(0, currentStepIdx - 1)]);
  const goNextStep = () =>
    setActiveTab(OBSERVATION_STEP_KEYS[Math.min(OBSERVATION_STEP_KEYS.length - 1, currentStepIdx + 1)]);
  const nextStepTitleTh = observationSteps[currentStepIdx + 1]?.title || '';
  const footerPrimaryLabel = isLastStep ? 'ส่งต่อ' : `ถัดไป: ${nextStepTitleTh}`;
  const openReferModal = () => {
    /* Reset to a blank pick every open — mirrors handleOpenVitalsModal so
       a previous referral's target doesn't silently carry over. */
    setReferScope('internal');
    setReferDepartment('');
    setReferServicePoint('');
    setReferNote('');
    setDamaReason('');
    setDamaConsentFileName('');
    setExternalReferDraft(buildObservationExternalReferDraft(patient, { centerId }));
    referPanels.reset();
    setShowReferModal(true);
  };
  const handleFooterPrimaryClick = () => {
    if (isLastStep) openReferModal();
    else goNextStep();
  };
  useEffect(() => {
    if (!showReferModal) referPanels.reset();
  }, [showReferModal]); // eslint-disable-line react-hooks/exhaustive-deps

  const isReferDetail = referPanels.step === 'detail';
  const openReferDetail = (scope) => {
    setReferScope(scope);
    referPanels.goTo('detail');
  };
  const referDetailTitle = isDama
    ? 'จำหน่ายผู้ป่วยแบบปฏิเสธการรักษา (DAMA)'
    : referScope === 'external'
      ? 'ส่งต่อภายนอก'
      : 'ส่งต่อภายใน';
  const referPopupTitle = isReferDetail ? referDetailTitle : 'ส่งต่อผู้ป่วย';
  const referPopupSize = isReferDetail && referScope === 'external' ? 'extraLarge' : 'large';
  /* "บันทึกร่าง" — same decorative slot as the OPD screening footer.
     Every field on this page already lives in React state as the user
     types (no separate draft store to write to), so this just confirms
     the in-progress entry is safe instead of performing a real save. */
  const handleSaveDraft = () => setDraftSavedToast(true);
  const isDischargeDirty =
    dischargeForm.doctorSummary !== initialDischargeRef.current.doctorSummary
    || dischargeForm.dischargeAdvice !== initialDischargeRef.current.dischargeAdvice
    || dischargeForm.referHospital !== initialDischargeRef.current.referHospital;
  const hasUnsavedWork = recordMutated || isDischargeDirty;
  const handleRequestExit = () => {
    if (!hasUnsavedWork) {
      history.push('/observation');
      return;
    }
    setConfirmCancel(true);
  };
  const handleFooterBackOrCancel = () => {
    if (isFirstStep) handleRequestExit();
    else goPrevStep();
  };
  const handleConfirmExit = () => {
    setConfirmCancel(false);
    history.push('/observation');
  };

  /* Patient identity banner — aliases the same <PatientCard> used by OPD
     screening (Figma 150:33649/343:5629) instead of a hand-rolled header,
     mapped from the observation record's own fields onto PatientCard's
     shape. Fields PatientCard doesn't track (nationalId/bloodType/address)
     fall back to the shared patientProfiles.js lookup when the HN matches. */
  const linkedProfile = getPatientByHN(patient.hn);
  const patientCardProfile = {
    fullName: patient.patientName,
    englishName: linkedProfile?.englishName || '',
    hn: patient.hn,
    sex: patient.gender,
    age: `${patient.age} ปี`,
    nationalId: linkedProfile?.nationalId || '-',
    bloodType: linkedProfile?.bloodType || '-',
    patientType: 'ผู้ป่วยสังเกตอาการ',
    doctor: patient.doctorName,
    insurance: patient.rights,
    address: linkedProfile?.address || '-',
    avatarUrl: patient.avatar || linkedProfile?.avatarUrl || '/avatars/somchai-mock.png',
    vip: false,
  };

  return (
    <QueuePageShell
      activeKey='observation'
      breadcrumb={[
        { label: 'หน้าหลัก PHCIS', to: '/dashboard' },
        { label: 'ห้องสังเกตอาการ', to: '/observation' },
        `แฟ้มสังเกตอาการ: ${patient.patientName}`,
      ]}
    >
      {/* Patient identity banner — same <PatientCard> aliased from OPD
          screening. Page exit ("ยกเลิก") lives in the sticky footer below,
          same pattern as CreateConsentFormPage — not in this header row. */}
      <PatientCard
        sticky
        showBack={false}
        patient={patientCardProfile}
        title='แฟ้มบันทึกสังเกตอาการ (Observation Record)'
        actions={
          <NeutralSubdueButton variant='outline' size='md' leadingIcon='print' onClick={() => window.print()}>
            พิมพ์ใบสังเกตอาการ (Timed Sheet)
          </NeutralSubdueButton>
        }
        tags={
          <>
            <span className='px-2.5 py-1 bg-brand-700 text-white rounded-full text-xs font-bold'>
              {patient.bedNo}
            </span>
            <StatusBadge
              style={
                patient.status === 'discharged'
                  ? 'neutral'
                  : patient.status === 'ready_discharge'
                  ? 'success'
                  : latestEsi != null && latestEsi <= 2
                  ? 'error'
                  : latestEsi === 3
                  ? 'yellow'
                  : 'info'
              }
              size='small'
              showDot
            >
              {patient.status === 'discharged'
                ? 'จำหน่ายแล้ว'
                : patient.status === 'ready_discharge'
                ? 'พร้อมจำหน่าย'
                : 'กำลังสังเกตอาการ'}
            </StatusBadge>
            <span className='inline-flex items-center rounded-full bg-badge-blueBg text-badge-blueText font-medium px-2.5 py-1 text-xs'>
              VN: {patient.vn}
            </span>
            <span className='inline-flex items-center rounded-full bg-badge-tealBg text-badge-tealText font-medium px-2.5 py-1 text-xs'>
              พยาบาลรับผู้ป่วย: {patient.nurseName}
            </span>
            <span className='inline-flex items-center rounded-full bg-badge-purpleBg text-badge-purpleText font-medium px-2.5 py-1 text-xs'>
              เวลาเข้าเตียง: {patient.admitTime}
            </span>
          </>
        }
      />

      <RecordWizardMorphBand
        title='สังเกตอาการ'
        hideTitle
        steps={observationSteps}
        current={OBSERVATION_STEP_KEYS.indexOf(activeTab)}
        completedSteps={OBSERVATION_STEP_KEYS.map(() => false)}
        onStepClick={(idx) => setActiveTab(OBSERVATION_STEP_KEYS[idx])}
        stickyTop={MORPH_STICKY_BELOW_PATIENT}
      />

      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600, 24px)',
          paddingLeft: 'var(--dim-space-600, 24px)',
          paddingRight: 'var(--dim-space-600, 24px)',
          paddingBottom: 96,
          gap: 'var(--dim-space-600, 24px)',
        }}
      >
      {/* Tab 1: Timed Vital Signs Trend */}
      {activeTab === 'vitals' && (
        <div className='space-y-6'>
          {/* Observation Timeline — merged vitalsTrend + nursingNotes feed
              (see observationTimeline above), so every timestamp on this
              landing view already shows both the vital signs AND whatever
              personnel opinion was recorded then, instead of splitting
              them across a table here and a separate log on step 3. */}
          <div
            style={{
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-500)',
              boxShadow: 'var(--shadow-card-strong)',
              overflow: 'hidden',
            }}
          >
            <div
              className='flex flex-wrap items-center justify-between'
              style={{
                padding: 'var(--dim-space-400)',
                background: 'var(--surface-card-100)',
                borderBottom: 'var(--dim-stroke-100) solid var(--border-table-default)',
                gap: 'var(--dim-space-300)',
              }}
            >
              <h3
                className='flex items-center'
                style={{
                  gap: 'var(--dim-space-150, 6px)',
                  color: 'var(--text-table-title)',
                  fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
                  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                  fontSize: 'var(--type-size-sm)',
                }}
              >
                <span className='material-symbols-outlined' style={{ color: 'var(--icon-brandPrimary-default)' }}>timeline</span>
                ไทม์ไลน์การสังเกตอาการ (Observation Timeline)
              </h3>
              <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200)' }}>
                <BrandSubdueButton
                  variant='outline'
                  size='sm'
                  leadingIcon='medical_services'
                  onClick={() => handleOpenAddNoteModal('procedure')}
                >
                  บันทึกหัตถการและกิจกรรมการพยาบาล
                </BrandSubdueButton>
                <BrandSubdueButton
                  variant='outline'
                  size='sm'
                  leadingIcon='edit_note'
                  onClick={() => handleOpenAddNoteModal('opinion')}
                >
                  ความคิดเห็น
                </BrandSubdueButton>
                <BrandSubdueButton
                  variant='outline'
                  size='sm'
                  leadingIcon='bolt'
                  onClick={() => handleOpenOrderModal('stat')}
                >
                  สั่งยา STAT Dose
                </BrandSubdueButton>
                <BrandSubdueButton
                  variant='outline'
                  size='sm'
                  leadingIcon='biotech'
                  onClick={() => handleOpenOrderModal('lab')}
                >
                  สั่ง Lab ด่วน
                </BrandSubdueButton>
                <BrandPrimaryButton
                  size='sm'
                  leadingIcon='add_chart'
                  onClick={handleOpenVitalsModal}
                >
                  วัด Vital Sign ใหม่
                </BrandPrimaryButton>
              </div>
            </div>

            <div style={{ padding: 'var(--dim-space-400)' }}>
              <div className='flex items-center justify-between' style={{ marginBottom: 'var(--dim-space-300)' }}>
                <span
                  style={{
                    color: 'var(--text-content-secondary)',
                    fontFamily: 'var(--type-family-body)',
                    fontWeight: 'var(--type-weight-medium)',
                    fontSize: 'var(--type-size-xs)',
                  }}
                >
                  บันทึกแล้ว {observationTimeline.length} ช่วงเวลา
                </span>
                <BrandSubdueButton
                  variant='outline'
                  size='sm'
                  leadingIcon='show_chart'
                  onClick={() => setShowTrendGraphModal(true)}
                >
                  ดูแบบกราฟ
                </BrandSubdueButton>
              </div>
              {pagedTimeline.length === 0 ? (
                <p style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-sm)', textAlign: 'center', padding: 'var(--dim-space-600) 0' }}>
                  ยังไม่มีการบันทึกสัญญาณชีพหรือความเห็น
                </p>
              ) : (
                <div className='flex flex-col'>
                  {pagedTimeline.map((entry, idx) => {
                    const isLast = idx === pagedTimeline.length - 1;
                    return (
                      <div key={entry.key} className='flex' style={{ gap: 'var(--dim-space-300)' }}>
                        <div className='flex flex-col items-center shrink-0' style={{ width: 'var(--dim-size-300, 16px)' }}>
                          <span
                            className='shrink-0 rounded-full'
                            style={{
                              width: 12,
                              height: 12,
                              background: 'var(--brand-p600)',
                              border: 'var(--dim-stroke-200, 2px) solid var(--surface-card-100)',
                              boxShadow: '0 0 0 2px var(--border-brandPrimary-quaternary)',
                            }}
                          />
                          {!isLast && (
                            <span
                              className='flex-1'
                              style={{ width: 2, background: 'var(--border-steps-default)', marginTop: 'var(--dim-space-100)' }}
                            />
                          )}
                        </div>
                        <div className='flex-1 min-w-0' style={{ paddingBottom: 'var(--dim-space-500, 20px)' }}>
                          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)', marginBottom: 'var(--dim-space-200)' }}>
                            <span
                              className='font-mono'
                              style={{
                                fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                                color: 'var(--text-brandPrimary-default)',
                                background: 'var(--surface-brandPrimary-quaternary)',
                                padding: 'var(--dim-space-050, 2px) var(--dim-space-200)',
                                borderRadius: 'var(--dim-radius-150, 6px)',
                                fontSize: 'var(--type-size-xs)',
                              }}
                            >
                              {entry.time}
                            </span>
                            {dayOffsetOf(entry) > 0 && (
                              <StatusBadge style='neutral' size='small'>
                                วันที่ {dayOffsetOf(entry) + 1} ของการสังเกตอาการ
                              </StatusBadge>
                            )}
                            {entry.repeatIndex > 0 && (
                              <StatusBadge style='neutral' size='small'>
                                วัดซ้ำครั้งที่ {entry.repeatIndex + 1} ในนาทีเดียวกัน
                              </StatusBadge>
                            )}
                          </div>

                          {entry.vitals && (
                            <div
                              className='grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7'
                              style={{ gap: 'var(--dim-space-200)', marginBottom: 'var(--dim-space-200)' }}
                            >
                              {vitalsTimelineCells(entry.vitals).map(({ key, label, value }) => {
                                const tone = resolveVitalSnapshotTone(key, entry.vitals);
                                const valueColor = tone === 'default'
                                  ? 'var(--text-brandPrimary-default)'
                                  : vitalSnapshotValueColor(tone);
                                return (
                                  <div
                                    key={key || label}
                                    className='bg-surface-card p-1.5 rounded-lg shadow-2xs border border-ink-line'
                                  >
                                    <div className='text-[10px] text-ink-quaternary font-medium'>{label}</div>
                                    <div
                                      className='font-bold text-[11px]'
                                      style={{ color: valueColor }}
                                    >
                                      {value}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {entry.opinions.map((op, opIdx) => {
                            if (op.kind === 'order') {
                              const cfg = STAT_ORDER_STATUS_STYLE[op.status];
                              const statusLabel = op.status === 'completed'
                                ? 'เสร็จสิ้น'
                                : op.status === 'in_progress'
                                ? 'กำลังดำเนินการ'
                                : op.status === 'cancelled'
                                ? 'ยกเลิกก่อนจำหน่าย'
                                : 'รอดำเนินการ';
                              return (
                                <div
                                  key={opIdx}
                                  style={{
                                    background: 'var(--surface-brandPrimary-quaternary)',
                                    border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                                    borderRadius: 'var(--dim-radius-300)',
                                    padding: 'var(--dim-space-300)',
                                    marginTop: opIdx > 0 ? 'var(--dim-space-200)' : 0,
                                  }}
                                >
                                  <div className='flex items-center justify-between' style={{ marginBottom: 'var(--dim-space-100)' }}>
                                    <div className='flex items-center' style={{ gap: 'var(--dim-space-100)', color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)' }}>
                                      <span className='material-symbols-outlined' style={{ fontSize: 14, color: 'var(--icon-brandPrimary-default)' }}>bolt</span>
                                      สั่งการโดย: {op.author}
                                    </div>
                                    <span
                                      className='inline-flex items-center'
                                      style={{
                                        gap: 'var(--dim-space-050, 2px)',
                                        padding: '2px var(--dim-space-200)',
                                        borderRadius: 'var(--dim-radius-full)',
                                        background: cfg.bg,
                                        color: cfg.color,
                                        fontSize: 10,
                                        fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                                      }}
                                    >
                                      <span className='material-symbols-outlined' style={{ fontSize: 12 }}>{cfg.icon}</span>
                                      {statusLabel}
                                    </span>
                                  </div>
                                  <div style={{ color: 'var(--text-content-default)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)', lineHeight: 1.6 }}>
                                    {op.text}
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <div
                                key={opIdx}
                                style={{
                                  background: 'var(--surface-neutral-quaternary)',
                                  border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                                  borderRadius: 'var(--dim-radius-300)',
                                  padding: 'var(--dim-space-300)',
                                  marginTop: opIdx > 0 ? 'var(--dim-space-200)' : 0,
                                }}
                              >
                                <div style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)' }}>
                                  บันทึกโดย: {op.author}{op.noteType ? ` · ${op.noteType}` : ''}
                                </div>
                                <div style={{ color: 'var(--text-content-default)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)', lineHeight: 1.6 }}>
                                  {op.text}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination — only once the timeline actually spans more than
                  one page, same PAGE_SIZE/Pagination pattern as QueuePage.jsx. */}
              {observationTimeline.length > VITALS_PAGE_SIZE && (
                <div
                  className='flex items-center'
                  style={{
                    gap: 'var(--dim-space-200)',
                    paddingTop: 'var(--dim-space-300)',
                    marginTop: 'var(--dim-space-300)',
                    borderTop: 'var(--dim-stroke-100) solid var(--border-table-default)',
                  }}
                >
                  <span style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
                    แสดง {vitalsRangeStart}–{vitalsRangeEnd} จาก {observationTimeline.length} รายการ
                  </span>
                  <div className='flex-1' />
                  <Pagination currentPage={vitalsPageClamped} pageCount={vitalsTotalPages} onPageChange={setVitalsPage} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Discharge Summary & Disposition */}
      {activeTab === 'discharge' && (
        <div className='bg-white rounded-2xl p-6 border-none' style={{ boxShadow: 'var(--shadow-card-strong, 0 4px 20px rgba(0,0,0,0.05))' }}>
          <h3 className='font-bold text-brand-600 text-sm mb-6 flex items-center gap-2 border-b border-gray-100 pb-3'>
            <span className='material-symbols-outlined text-brand-600'>output</span>
            แบบฟอร์มสรุปการจำหน่ายผู้ป่วย (Discharge Summary & Disposition)
          </h3>

          {/* No onSubmit save here — actual save happens via the "ส่งต่อ"
              popup's own confirm action (handleConfirmRefer), which also
              collects from/to department. This form just prevents an
              implicit Enter-key submit from doing anything. */}
          <form onSubmit={(e) => e.preventDefault()} className='space-y-6 text-xs text-gray-700'>
            {/* Doctor Discharge Note — same suggestion-popover pattern as
                OPD screening (appears after 3 characters). */}
            <SuggestibleTextarea
              voice
              label='สรุปความเห็นแพทย์ (Doctor Discharge Note)'
              rows={3}
              value={dischargeForm.doctorSummary}
              onChange={(e) => setDischargeForm({ ...dischargeForm, doctorSummary: e.target.value })}
              placeholder='ระบุสรุปการรักษา ผลการติดตาม และเหตุผลในการจำหน่าย...'
              suggestions={DOCTOR_DISCHARGE_NOTE_SUGGESTIONS}
              minChars={3}
              popoverAriaLabel='คำแนะนำสรุปความเห็นแพทย์'
              required
            />

            {/* Discharge Advice */}
            <SuggestibleTextarea
              voice
              label='คำแนะนำและข้อควรระวังเมื่อจำหน่าย (Discharge Instructions)'
              rows={3}
              placeholder='ระบุคำแนะนำการรับประทานยา การดูแลตนเองที่บ้าน หรือสัญญาณอันตรายที่ต้องกลับมาพบแพทย์'
              value={dischargeForm.dischargeAdvice}
              onChange={(e) => setDischargeForm({ ...dischargeForm, dischargeAdvice: e.target.value })}
              suggestions={DISCHARGE_INSTRUCTIONS_SUGGESTIONS}
              minChars={3}
              popoverAriaLabel='คำแนะนำการจำหน่าย'
            />

          </form>
        </div>
      )}
      </div>

      {/* Sticky wizard action bar — single left button switches ยกเลิก /
          ย้อนกลับ by step (same pattern as CreateConsentFormPage). */}
      <div
        className={`sticky bottom-0 z-10 flex items-center w-full ${MIH_CHROME_MORPH_FOOTER}`}
        style={{
          background: 'var(--surface-card-100)',
          borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
          boxShadow: '0 -2px 8px rgba(8,167,104,0.06)',
          padding: 'var(--dim-space-400) var(--dim-space-600)',
          gap: 'var(--dim-space-600)',
        }}
      >
        <NeutralSubdueButton
          size='lg'
          leadingIcon={isFirstStep ? undefined : 'arrow_back'}
          onClick={handleFooterBackOrCancel}
          className='shrink-0'
        >
          {isFirstStep ? 'ยกเลิก' : 'ย้อนกลับ'}
        </NeutralSubdueButton>
        <div className='flex-1' />
        <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-300)' }}>
          <BrandSubdueButton variant='outline' size='lg' leadingIcon='save' onClick={handleSaveDraft}>
            บันทึกร่าง
          </BrandSubdueButton>
          <BrandPrimaryButton
            variant='fill'
            size='lg'
            trailingIcon='arrow_forward'
            disabled={isLastStep && isDoctorSummaryMissing}
            onClick={handleFooterPrimaryClick}
          >
            {footerPrimaryLabel}
          </BrandPrimaryButton>
        </div>
      </div>

      <ConsentFormCancelEditPopup
        open={confirmCancel}
        title='ยกเลิกการบันทึกสังเกตอาการ?'
        description='ข้อมูลที่ยังไม่ได้บันทึกจะหายไป ต้องการออกจากหน้านี้หรือไม่'
        confirmLabel='ออกจากหน้านี้'
        cancelLabel='ทำต่อ'
        onConfirm={handleConfirmExit}
        onClose={() => setConfirmCancel(false)}
      />

      <SuccessToast
        open={draftSavedToast}
        message='บันทึกร่างเรียบร้อยแล้ว'
        onClose={() => setDraftSavedToast(false)}
      />

      <SuccessToast
        open={!!saveToast}
        message={saveToast}
        onClose={() => setSaveToast('')}
      />

      <AddVitalsModal
        open={showVitalsModal}
        patient={patient}
        form={newVital}
        setForm={setNewVital}
        setFieldValid={setVitalFieldValid}
        isFormValid={isVitalFormValid}
        onSubmit={handleSaveVitalsModal}
        onClose={() => setShowVitalsModal(false)}
        noteSuggestions={VITALS_NOTE_SUGGESTIONS}
      />

      {/* Modal: Vital Signs Trend Visualizer — the timeline header's "ดูแบบ
          กราฟ" button opens the same VitalTrendChart engine as the timeline.
          above (VitalTrendChart + parameter TabBar), just full-size in a
          popup instead of squeezed above the timeline. Built on the same
          design-system Popup (size='extraLarge') as AddVitalsModal, so it
          matches OPD screening's own "กราฟสัญญาณชีพ" popup in size. */}
      <Popup
        open={showTrendGraphModal}
        onClose={() => setShowTrendGraphModal(false)}
        title='กราฟแนวโน้มสัญญาณชีพตามช่วงเวลา (Vital Signs Trend Visualizer)'
        leading={<span className='material-symbols-outlined text-2xl' style={{ color: 'var(--brand-p700)' }}>show_chart</span>}
        size='extraLarge'
        bodyScrollable={false}
        bodyStyle={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--dim-space-300)',
          paddingTop: 'var(--dim-space-200)',
          paddingLeft: 'clamp(var(--dim-space-300), 4vw, var(--dim-space-600))',
          paddingRight: 'clamp(var(--dim-space-300), 4vw, var(--dim-space-600))',
          paddingBottom: 'var(--dim-space-600)',
        }}
      >
        <TabBar align='center' className='shrink-0'>
          {[
            { key: 'bp', label: 'ความดัน (BP)' },
            { key: 'pulse', label: 'ชีพจร (Pulse)' },
            { key: 'spo2', label: 'ออกซิเจนปลายนิ้ว (SpO2)' },
            { key: 'temp', label: 'อุณหภูมิ (Temp)' },
            { key: 'rr', label: 'อัตราการหายใจ (RR)' },
          ].map((param) => (
            <TabPill
              key={param.key}
              size='small'
              selected={selectedTrendParam === param.key}
              onClick={() => setSelectedTrendParam(param.key)}
              role='tab'
            >
              {param.label}
            </TabPill>
          ))}
        </TabBar>

        <div className='flex-1 min-h-0'>
          <VitalTrendChart data={patient.vitalsTrend} parameter={selectedTrendParam} notes={trendNotesByIndex} fillHeight />
        </div>
      </Popup>

      {/* Modal: Add Procedure / Opinion — split from one combined popup into
          two entry points ("บันทึกหัตถการและกิจกรรมการพยาบาล" / "ความคิดเห็น"
          buttons above), each defaulting to its own tag set. Unlike step 3's
          role-gated "บันทึกความเห็น" panel, both skip the "เข้าสู่ระบบในฐานะ"
          role gate (shares noteType/newNursingNote state +
          handleAddNursingNote so every entry point logs to the same
          nursingNotes array). */}
      <Popup
        open={addNoteVariant !== null}
        onClose={() => setAddNoteVariant(null)}
        title={addNoteVariant === 'procedure' ? 'บันทึกหัตถการและกิจกรรมการพยาบาล' : 'ความคิดเห็น'}
        leading={<span className='material-symbols-outlined text-2xl' style={{ color: 'var(--brand-p700)' }}>{addNoteVariant === 'procedure' ? 'medical_services' : 'edit_note'}</span>}
        size='large'
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setAddNoteVariant(null) }}
        primaryAction={{ label: 'บันทึกความเห็น', onClick: handleSaveNoteModal, disabled: !newNursingNote.trim() }}
      >
        <PatientSummaryCard
          avatarUrl={patient.avatar || getPatientByHN(patient.hn)?.avatarUrl}
          avatarAlt={patient.patientName}
          cells={[
            { label: 'ชื่อ-นามสกุล ผู้ป่วย', value: patient.patientName },
            { label: 'HN (Hospital Number)', value: patient.hn },
            { label: 'เตียง', value: patient.bedNo },
          ]}
        />

        <div>
          <p
            className='font-medium mb-2'
            style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-xs)' }}
          >
            ประเภทบันทึก
          </p>
          <div className='flex flex-wrap' role='radiogroup' aria-label='ประเภทบันทึก' style={{ gap: 'var(--dim-space-200)' }}>
            {(addNoteVariant === 'procedure' ? PROCEDURE_NOTE_TYPES : OPINION_NOTE_TYPES).map((t) => (
              <SelectableTag
                key={t}
                size='md'
                selected={noteType === t}
                onClick={() => setNoteType(t)}
                ariaLabel={t}
              >
                {t}
              </SelectableTag>
            ))}
          </div>
        </div>
        <SuggestibleTextarea
          voice
          label='ความคิดเห็น'
          placeholder='ระบุบันทึกทางการพยาบาล อาการเปลี่ยนแปลง การตอบสนองต่อการรักษา หรือการประเมินความเสี่ยง'
          value={newNursingNote}
          onChange={(e) => setNewNursingNote(e.target.value)}
          suggestions={NURSING_NOTE_SUGGESTIONS}
          minChars={3}
          popoverAriaLabel='คำแนะนำบันทึกพยาบาล'
          required
        />
      </Popup>

      {/* Modal: Order STAT Dose / Lab — timeline header's "สั่งยา STAT
          Dose" / "สั่ง Lab ด่วน" buttons. Both write to the same
          patient.statOrders array via handleAddOrder/handleSaveOrderModal
          (this record has no separate lab-order data model), just with
          their own suggestion list so a quick order can be logged without
          leaving step 1. */}
      <Popup
        open={orderModalKind !== null}
        onClose={() => setOrderModalKind(null)}
        title={orderModalKind === 'lab' ? 'สั่ง Lab ด่วน' : 'สั่งยา STAT Dose'}
        leading={<span className='material-symbols-outlined text-2xl' style={{ color: 'var(--brand-p700)' }}>{orderModalKind === 'lab' ? 'biotech' : 'bolt'}</span>}
        size='large'
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setOrderModalKind(null) }}
        primaryAction={{ label: 'สั่งการ STAT', onClick: handleSaveOrderModal, disabled: !newOrderText.trim() }}
      >
        <PatientSummaryCard
          avatarUrl={patient.avatar || getPatientByHN(patient.hn)?.avatarUrl}
          avatarAlt={patient.patientName}
          cells={[
            { label: 'ชื่อ-นามสกุล ผู้ป่วย', value: patient.patientName },
            { label: 'HN (Hospital Number)', value: patient.hn },
            { label: 'เตียง', value: patient.bedNo },
          ]}
        />

        {orderModalKind !== null && (
          <div>
            <p
              className='font-medium mb-2'
              style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-xs)' }}
            >
              {orderModalKind === 'lab' ? 'Lab ที่ใช้บ่อย' : 'ยาที่ใช้บ่อย'}
            </p>
            <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
              {(orderModalKind === 'lab' ? LAB_ORDER_QUICK_TAGS : STAT_DOSE_QUICK_TAGS).map((t) => (
                <SelectableTag
                  key={t}
                  size='md'
                  selected={newOrderText === t}
                  onClick={() => setNewOrderText(t)}
                  ariaLabel={t}
                >
                  {t}
                </SelectableTag>
              ))}
            </div>
          </div>
        )}
        <SuggestibleTextarea
          voice
          label={orderModalKind === 'lab' ? 'รายการ Lab ด่วน' : 'คำสั่งการรักษา STAT'}
          placeholder={
            orderModalKind === 'lab'
              ? 'ระบุรายการ Lab ด่วน เช่น CBC, Electrolyte, DTX'
              : 'ระบุคำสั่งการรักษา STAT เช่น Berodual 1 respule Nebulizer Stat, Oxygen Cannula 3 LPM, IV NSS 1,000 ml'
          }
          value={newOrderText}
          onChange={(e) => setNewOrderText(e.target.value)}
          suggestions={orderModalKind === 'lab' ? LAB_ORDER_SUGGESTIONS : STAT_ORDER_SUGGESTIONS}
          minChars={3}
          popoverAriaLabel={orderModalKind === 'lab' ? 'คำแนะนำรายการ Lab ด่วน' : 'คำแนะนำคำสั่งการรักษาด่วน'}
          required
        />
      </Popup>

      {/* Modal: ส่งต่อผู้ป่วย — step 2's final CTA opens this instead of
          saving directly, so from/to department is captured before the
          discharge record actually writes (see commitDischarge). Replaces
          the old inline 4-card disposition selector + conditional refer-
          hospital picker (removed — duplicated what this popup now owns). */}
      <Popup
        open={showReferModal}
        onClose={() => setShowReferModal(false)}
        title={referPopupTitle}
        onBack={isReferDetail ? () => referPanels.goBack() : undefined}
        size={referPopupSize}
        bodyStyle={isReferDetail && referScope === 'external' ? {
          maxHeight: 'min(72vh, 760px)',
          overflowY: 'auto',
        } : undefined}
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setShowReferModal(false) }}
        primaryAction={isReferDetail ? {
          label: isDama ? 'ยืนยันจำหน่าย (DAMA)' : 'ยืนยันส่งต่อ',
          onClick: handleConfirmRefer,
          /* Also gates on the doctor summary — it was already required by
             the save handler, so leaving the button enabled just made the
             click silently do nothing. */
          disabled: isReferTargetMissing || isDoctorSummaryMissing,
        } : undefined}
      >
        {!isReferDetail ? (
          <div
            key='refer-chooser'
            data-direction={referPanels.direction}
            className='mih-step-content flex flex-col w-full min-w-0'
            style={{ gap: 'var(--dim-space-400)' }}
          >
            <PatientSummaryCard
              avatarUrl={patient.avatar || getPatientByHN(patient.hn)?.avatarUrl}
              avatarAlt={patient.patientName}
              cells={[
                { label: 'ชื่อ-นามสกุล ผู้ป่วย', value: patient.patientName },
                { label: 'HN (Hospital Number)', value: patient.hn },
                { label: 'เตียง', value: patient.bedNo },
              ]}
            />

            <div
              className='flex items-center flex-wrap'
              style={{
                gap: 'var(--dim-space-200, 8px)',
                fontSize: 'var(--type-size-xs)',
              }}
            >
              <span
                style={{
                  fontWeight: 'var(--type-weight-medium)',
                  color: 'var(--text-content-secondary)',
                }}
              >
                จากแผนก:
              </span>
              <span
                style={{
                  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                  color: 'var(--text-brandPrimary-default)',
                }}
              >
                ห้องสังเกตอาการ (Observation Unit)
              </span>
            </div>

            <div>
              <p
                className='font-medium mb-2'
                style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-xs)' }}
              >
                ส่งต่อไปยัง
              </p>
              <div
                className='flex flex-wrap'
                role='group'
                aria-label='ส่งต่อไปยัง'
                style={{ gap: 'var(--dim-space-300)' }}
              >
                <SelectableTag
                  size='lg'
                  selected={false}
                  onClick={() => openReferDetail('internal')}
                  ariaLabel='ส่งต่อภายใน'
                >
                  ส่งต่อภายใน
                </SelectableTag>
                <SelectableTag
                  size='lg'
                  selected={false}
                  onClick={() => openReferDetail('external')}
                  ariaLabel='ส่งต่อภายนอก'
                >
                  ส่งต่อภายนอก
                </SelectableTag>
                {/* Edge case #3 — DAMA sits alongside the two referral
                    targets because it's the same decision point ("where does
                    this patient go from here"), just an answer where the
                    patient, not the ward, picked the destination. */}
                <SelectableTag
                  size='lg'
                  selected={false}
                  onClick={() => openReferDetail('dama')}
                  ariaLabel='ปฏิเสธการรักษา'
                >
                  ปฏิเสธการรักษา (DAMA)
                </SelectableTag>
              </div>
            </div>
          </div>
        ) : (
          <div
            key={`refer-detail-${referScope}`}
            data-direction={referPanels.direction}
            className='mih-step-content flex flex-col w-full min-w-0'
            style={{ gap: 'var(--dim-space-400)' }}
          >
            {isDama ? (
              <>
                <Alert
                  type='warning'
                  title='ผู้ป่วยขอกลับบ้านก่อนแพทย์อนุญาต'
                  subtext='ต้องแนบใบยินยอมปฏิเสธการรักษา (DAMA Waiver Consent Form) ที่ผู้ป่วยหรือญาติลงนามแล้ว และบันทึกเหตุผลไว้ในแฟ้มสังเกตอาการก่อนจึงจะจำหน่ายได้'
                  showCloseButton={false}
                  style={{ maxWidth: '100%' }}
                />

                <div>
                  <p className='font-medium mb-2' style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-xs)' }}>
                    ใบยินยอมปฏิเสธการรักษา (DAMA Waiver Consent Form)
                    <span style={{ color: 'var(--text-input-require)' }}> *</span>
                  </p>
                  <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-300)' }}>
                    {/* Native file input is visually hidden behind the design-
                        system button — the browser's default "Choose file"
                        chrome has no token equivalent. */}
                    <label>
                      <input
                        type='file'
                        accept='image/*,application/pdf'
                        className='sr-only'
                        onChange={(e) => setDamaConsentFileName(e.target.files?.[0]?.name || '')}
                      />
                      <span
                        className='inline-flex items-center cursor-pointer'
                        style={{
                          gap: 'var(--dim-space-200)',
                          paddingTop: 'var(--dim-space-200)',
                          paddingBottom: 'var(--dim-space-200)',
                          paddingLeft: 'var(--dim-space-400)',
                          paddingRight: 'var(--dim-space-400)',
                          borderRadius: 'var(--dim-radius-200, 8px)',
                          border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-default)',
                          color: 'var(--text-brandPrimary-default)',
                          fontSize: 'var(--type-size-sm)',
                          fontWeight: 'var(--type-weight-medium)',
                        }}
                      >
                        <span className='material-symbols-outlined' style={{ fontSize: 20 }}>upload_file</span>
                        แนบไฟล์ใบยินยอม
                      </span>
                    </label>
                    <span
                      className='inline-flex items-center min-w-0'
                      style={{
                        gap: 'var(--dim-space-100)',
                        color: damaConsentFileName ? 'var(--text-content-default)' : 'var(--text-content-tertiary)',
                        fontSize: 'var(--type-size-xs)',
                      }}
                    >
                      {damaConsentFileName ? (
                        <>
                          <span className='material-symbols-outlined' style={{ fontSize: 16, color: 'var(--text-colorfulbadge-green)' }}>check_circle</span>
                          <span className='truncate'>{damaConsentFileName}</span>
                        </>
                      ) : (
                        'ยังไม่ได้แนบไฟล์ (รองรับรูปภาพหรือ PDF)'
                      )}
                    </span>
                  </div>
                </div>

                <SuggestibleTextarea
                  voice
                  label='เหตุผลการปฏิเสธการรักษา (DAMA Reason)'
                  rows={3}
                  value={damaReason}
                  onChange={(e) => setDamaReason(e.target.value)}
                  placeholder='เช่น ผู้ป่วยต้องการกลับไปดูแลครอบครัว, กังวลค่าใช้จ่าย, ยืนยันว่าอาการดีขึ้นแล้ว'
                  suggestions={DAMA_REASON_SUGGESTIONS}
                  minChars={3}
                  popoverAriaLabel='คำแนะนำเหตุผลการปฏิเสธการรักษา'
                  required
                />
              </>
            ) : referScope === 'internal' ? (
              <InternalReferFields
                department={referDepartment}
                servicePoint={referServicePoint}
                note={referNote}
                onDepartmentChange={setReferDepartment}
                onServicePointChange={setReferServicePoint}
                onNoteChange={setReferNote}
                departmentOptions={referDepartmentOptions}
                servicePointOptions={referServicePointOptions}
              />
            ) : (
              <ObservationExternalReferForm
                draft={externalReferDraft}
                onChange={setExternalReferDraft}
              />
            )}
          </div>
        )}
      </Popup>

      {/* Discharge guard: unexecuted STAT orders (edge case #6) — fires
          between "ยืนยันส่งต่อ" and the actual write, so the clinician has
          to decide what happens to each outstanding order instead of
          leaving it silently orphaned on a closed record. */}
      <Popup
        open={showPendingStatModal}
        onClose={() => setShowPendingStatModal(false)}
        title='ยังมีคำสั่งการรักษา STAT ค้างอยู่'
        leading={<span className='material-symbols-outlined text-2xl' style={{ color: 'var(--text-colorfulbadge-red, #B91C1C)' }}>error</span>}
        size='large'
        tertiaryAction={{ label: 'กลับไปแก้ไข', onClick: () => setShowPendingStatModal(false) }}
        secondaryAction={{ label: 'ยกเลิกคำสั่งที่ค้าง แล้วจำหน่าย', onClick: () => commitDischarge({ cancelPendingOrders: true }) }}
        primaryAction={{ label: 'ยืนยันจำหน่ายต่อ', onClick: () => commitDischarge({ cancelPendingOrders: false }) }}
      >
        <Alert
          type='error'
          title={`ยังมีคำสั่งการรักษา STAT ค้างอยู่ ${pendingStatOrders.length} รายการ ที่ยังไม่ได้ดำเนินการ`}
          subtext='คุณต้องการยกเลิกคำสั่งเหล่านี้ หรือยืนยันจำหน่ายต่อโดยคงคำสั่งไว้ในแฟ้ม?'
          /* The orders themselves are the alert's indicator list — Alert
             already owns that slot, so they no longer need a hand-built
             <ul> underneath. */
          indicators={pendingStatOrders.map((o) => `${o.orderText} · สั่งเมื่อ ${o.orderTime}`)}
          showCloseButton={false}
          style={{ maxWidth: '100%' }}
        />
      </Popup>
    </QueuePageShell>
  );
}
