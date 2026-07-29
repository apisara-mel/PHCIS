import React, { useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import StatusBadge from '@/components/badge/StatusBadge';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import BrandButton from '@/components/button/BrandButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Alert from '@/components/alert/Alert';
import TabPill, { TabBar } from '@/components/tab/TabPill';
import { getPatientByHN } from '@/data/patientProfiles';
import { MOCK_OBSERVATION_PATIENTS, calculateEwsScore, EWS_RISK_TIERS } from '@/data/observationMock';
import VitalTrendChart from '@/components/observation/VitalTrendChart';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import StepProgress from '@/components/step/StepProgress';
import Footer from '@/components/layout/Footer';
import SuccessToast from '@/components/toast/SuccessToast';
import VitalCard, { PressureCard } from '@/components/card/VitalCard';
import PatientCard from '@/components/card/PatientCard';

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

const STAT_ORDER_SUGGESTIONS = [
  'Berodual 1 respule Nebulizer Stat',
  'Oxygen Cannula 3 LPM keep SpO2 > 95%',
  'IV NSS 1,000 ml IV drip 80 ml/hr',
  'Paracetamol 500 mg 1 tab Oral Stat for fever',
  'Adrenaline 1:1000 0.3 mg IM Stat',
  '12-lead EKG Stat',
];

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
const NOTE_TYPES_BY_ROLE = {
  nurse: ['บันทึกความคืบหน้าในการรักษา (Progress Note)', 'บันทึกการพยาบาล (Nurse Note)'],
  doctor: ['บันทึกความคืบหน้าในการรักษา (Progress Note)', 'บันทึกของแพทย์ (Doctor Note)'],
};

/* Section order for the page-level step indicator — same StepProgress
   component used by the treatment/CPOE wizard (Figma node 2709:6562),
   so the observation record's 4 sections read the same way as any other
   numbered-step flow in the app. */
const OBSERVATION_STEP_KEYS = ['vitals', 'orders', 'notes', 'discharge'];


export default function ObservationDetailPage() {
  const { id } = useParams();
  const history = useHistory();

  // Find patient record by ID (or default to obs-001)
  const initialPatient = MOCK_OBSERVATION_PATIENTS.find((p) => p.id === id) || MOCK_OBSERVATION_PATIENTS[0];
  const [patient, setPatient] = useState(initialPatient);
  const [activeTab, setActiveTab] = useState('vitals'); // 'vitals' | 'orders' | 'notes' | 'discharge'
  const [selectedTrendParam, setSelectedTrendParam] = useState('bp'); // 'bp' | 'pulse' | 'spo2' | 'temp' | 'rr'

  // Forms states
  const [newVital, setNewVital] = useState({
    bpSys: '', bpDia: '', pulse: '', temp: '', spo2: '', rr: '', note: ''
  });
  /* VitalCard/PressureCard (shared with OPD screening's VitalsForm) hold
     their own uncontrolled input state after mount, so bumping this key
     after a successful save remounts them fresh instead of leaving the
     just-submitted numbers on screen. */
  const [vitalFormResetKey, setVitalFormResetKey] = useState(0);
  const [vitalsPage, setVitalsPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [notesPage, setNotesPage] = useState(1);
  const [hoveredDisposition, setHoveredDisposition] = useState(null);
  const [draftSavedToast, setDraftSavedToast] = useState(false);
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
  const isVitalFormValid = REQUIRED_VITAL_FIELDS.every((f) => vitalFieldValidity[f] === true);

  const [newOrderText, setNewOrderText] = useState('');
  const [newNursingNote, setNewNursingNote] = useState('');
  /* Mock "logged in as" role — see NOTE_TYPES_BY_ROLE comment. */
  const [currentUserRole, setCurrentUserRole] = useState('nurse');
  const noteTypeOptions = NOTE_TYPES_BY_ROLE[currentUserRole];
  const [noteType, setNoteType] = useState(noteTypeOptions[0]);

  const [dischargeForm, setDischargeForm] = useState({
    disposition: patient.dischargeSummary?.disposition || 'home',
    doctorSummary: patient.dischargeSummary?.doctorSummary || '',
    dischargeAdvice: patient.dischargeSummary?.dischargeAdvice || '',
    referHospital: patient.dischargeSummary?.referHospital || '',
    isDischarged: patient.dischargeSummary?.isDischarged || false,
  });

  // Calculate EWS for latest vitals
  const latestVitals = patient.vitalsTrend?.[patient.vitalsTrend.length - 1];
  const currentEws = latestVitals ? calculateEwsScore(latestVitals) : { score: 0, tier: EWS_RISK_TIERS.NORMAL };

  /* Observation Timeline — merges vitalsTrend + nursingNotes into one
     chronological feed so every timestamp shows its vital signs AND
     whatever personnel opinion was recorded at/around that time,
     instead of living in two disconnected sections (a vitals table on
     this step, a separate notes timeline on step 3). Vitals entries
     bring their own embedded `note` (recorded at measurement time);
     any nursingNotes entry sharing the same timestamp is folded into
     the same row, everything else becomes a note-only row. Time
     strings are zero-padded "HH:MM น." so plain string sort is
     chronological. */
  const observationTimeline = (() => {
    const byTime = new Map();
    patient.vitalsTrend.forEach((v) => {
      byTime.set(v.time, {
        time: v.time,
        vitals: v,
        opinions: v.note ? [{ text: v.note, author: patient.nurseName, noteType: null }] : [],
      });
    });
    patient.nursingNotes.forEach((n) => {
      const opinion = { text: n.note, author: n.nurse, noteType: n.noteType || null };
      const existing = byTime.get(n.time);
      if (existing) existing.opinions.push(opinion);
      else byTime.set(n.time, { time: n.time, vitals: null, opinions: [opinion] });
    });
    return Array.from(byTime.values()).sort((a, b) => a.time.localeCompare(b.time));
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

  // STAT Order List pagination — same pattern/page size as the vitals table above
  const ordersTotalPages = Math.max(1, Math.ceil(patient.statOrders.length / VITALS_PAGE_SIZE));
  const ordersPageClamped = Math.min(ordersPage, ordersTotalPages);
  const ordersRangeStart = patient.statOrders.length === 0 ? 0 : (ordersPageClamped - 1) * VITALS_PAGE_SIZE + 1;
  const ordersRangeEnd = Math.min(ordersPageClamped * VITALS_PAGE_SIZE, patient.statOrders.length);
  const pagedStatOrders = patient.statOrders.slice(
    (ordersPageClamped - 1) * VITALS_PAGE_SIZE,
    ordersPageClamped * VITALS_PAGE_SIZE,
  );

  // Nursing Activity Log pagination — same pattern/page size as the tables above
  const notesTotalPages = Math.max(1, Math.ceil(patient.nursingNotes.length / VITALS_PAGE_SIZE));
  const notesPageClamped = Math.min(notesPage, notesTotalPages);
  const notesRangeStart = patient.nursingNotes.length === 0 ? 0 : (notesPageClamped - 1) * VITALS_PAGE_SIZE + 1;
  const notesRangeEnd = Math.min(notesPageClamped * VITALS_PAGE_SIZE, patient.nursingNotes.length);
  const pagedNursingNotes = patient.nursingNotes.slice(
    (notesPageClamped - 1) * VITALS_PAGE_SIZE,
    notesPageClamped * VITALS_PAGE_SIZE,
  );

  const handleAddVital = (e) => {
    e.preventDefault();
    /* Guard against implicit form submission (pressing Enter inside a
       VitalCard's number input submits the form even when the visible
       button is disabled) — without this, an unmeasured field could
       still slip through as a "normal" default reading. */
    if (!isVitalFormValid) return;
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
    };

    setPatient((prev) => ({
      ...prev,
      vitalsTrend: [...prev.vitalsTrend, newLog],
    }));

    setNewVital({ bpSys: '', bpDia: '', pulse: '', temp: '', spo2: '', rr: '', note: '' });
    setVitalFormResetKey((k) => k + 1);
    setVitalFieldValidity({});
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

    setNewOrderText('');
  };

  const handleUpdateOrderStatus = (orderId, newStatus) => {
    const nowStr = `${new Date().getHours().toString().padStart(2,'0')}:${new Date().getMinutes().toString().padStart(2,'0')} น.`;
    setPatient((prev) => ({
      ...prev,
      statOrders: prev.statOrders.map((ord) => {
        if (ord.id === orderId) {
          return {
            ...ord,
            status: newStatus,
            executedBy: newStatus === 'completed' || newStatus === 'in_progress' ? prev.nurseName : ord.executedBy,
            executedTime: newStatus === 'completed' || newStatus === 'in_progress' ? nowStr : ord.executedTime,
          };
        }
        return ord;
      }),
    }));
  };

  /* STAT Order List columns — same shared <Table> pattern as the Timed
     Vital Signs sheet, instead of a bespoke div-per-row list. Defined
     inside the component (not module scope) because the actions column
     closes over handleUpdateOrderStatus. */
  const STAT_ORDER_STATUS_STYLE = {
    completed:   { bg: 'var(--surface-colorfulbadge-green)',  color: 'var(--text-colorfulbadge-green)',  icon: 'check_circle' },
    in_progress: { bg: 'var(--surface-colorfulbadge-orange)', color: 'var(--text-colorfulbadge-orange)', icon: 'hourglass_top' },
    pending:     { bg: 'var(--surface-colorfulbadge-red)',    color: 'var(--text-colorfulbadge-red)',    icon: 'error' },
  };
  const statOrderColumns = [
    {
      key: 'orderTime',
      label: 'เวลาสั่งการ',
      width: 100,
      sortable: false,
      render: (ord) => (
        <span style={{ color: 'var(--text-brandPrimary-default)', fontWeight: 'var(--type-weight-bold)' }}>
          {ord.orderTime}
        </span>
      ),
    },
    {
      key: 'order',
      label: 'คำสั่งการรักษา',
      flex: true,
      minWidth: 240,
      sortable: false,
      render: (ord) => (
        <span style={{ fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default)' }}>{ord.orderText}</span>
      ),
    },
    {
      key: 'executedBy',
      label: 'ผู้ดำเนินการ',
      width: 160,
      sortable: false,
      render: (ord) => (
        <div>
          <div style={{ fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary)' }}>{ord.executedBy}</div>
          {ord.executedTime && ord.executedTime !== '-' && (
            <div style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>{ord.executedTime}</div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'สถานะ',
      width: 150,
      align: 'center',
      sortable: false,
      render: (ord) => {
        const cfg = STAT_ORDER_STATUS_STYLE[ord.status];
        const label = ord.status === 'completed' ? 'เสร็จสิ้น' : ord.status === 'in_progress' ? 'กำลังดำเนินการ' : 'รอดำเนินการ';
        return (
          <div className='flex items-center justify-center' style={{ gap: 'var(--dim-space-150)' }}>
            <span
              className={ord.status === 'pending' ? 'animate-pulse' : undefined}
              style={{
                width: 28,
                height: 28,
                borderRadius: 'var(--dim-radius-400)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: cfg.bg,
                color: cfg.color,
                flexShrink: 0,
              }}
            >
              <span className='material-symbols-outlined text-base'>{cfg.icon}</span>
            </span>
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}>{label}</span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: 'เครื่องมือ',
      width: 160,
      align: 'right',
      sortable: false,
      render: (ord) => {
        if (ord.status === 'pending') {
          return (
            <BrandSubdueButton leadingIcon='play_arrow' size='sm' onClick={() => handleUpdateOrderStatus(ord.id, 'in_progress')}>
              เริ่มดำเนินการ
            </BrandSubdueButton>
          );
        }
        if (ord.status === 'in_progress') {
          return (
            <BrandPrimaryButton leadingIcon='check' size='sm' onClick={() => handleUpdateOrderStatus(ord.id, 'completed')}>
              เสร็จสิ้น
            </BrandPrimaryButton>
          );
        }
        return (
          <span
            style={{
              display: 'inline-block',
              padding: 'var(--dim-space-150) var(--dim-space-300)',
              borderRadius: 'var(--dim-radius-200)',
              border: 'var(--dim-stroke-100) solid var(--border-card-default)',
              background: 'var(--surface-card-100)',
              color: 'var(--text-content-secondary)',
              fontSize: 'var(--type-size-xs)',
              fontWeight: 'var(--type-weight-bold)',
            }}
          >
            ดำเนินการแล้ว
          </span>
        );
      },
    },
  ];

  const handleRoleChange = (role) => {
    setCurrentUserRole(role);
    setNoteType(NOTE_TYPES_BY_ROLE[role][0]);
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

    setNewNursingNote('');
  };

  /* referHospital uses the custom Select (button-based dropdown, no native
     <select>), so its `required` prop only renders the asterisk — same
     class of gap as VitalCard. Guard explicitly instead of relying on
     native form validation. */
  const REFER_HOSPITAL_PLACEHOLDER = '-- เลือกโรงพยาบาลส่งต่อ --';
  const isReferHospitalMissing =
    dischargeForm.disposition === 'refer' &&
    (!dischargeForm.referHospital || dischargeForm.referHospital === REFER_HOSPITAL_PLACEHOLDER);

  const saveDischarge = () => {
    if (isReferHospitalMissing) return;
    setPatient((prev) => ({
      ...prev,
      status: dischargeForm.isDischarged ? 'discharged' : 'ready_discharge',
      dischargeSummary: {
        ...dischargeForm,
        dischargeVitals: latestVitals ? { ...latestVitals } : null,
      },
    }));
    alert('บันทึกผลการสรุปจำหน่ายสังเกตอาการเรียบร้อยแล้ว!');
  };

  const handleSaveDischarge = (e) => {
    e.preventDefault();
    saveDischarge();
  };

  const observationSteps = [
    { title: 'สัญญาณชีพตามเวลา' },
    { title: 'คำสั่งการรักษาด่วน/STAT' },
    { title: 'บันทึกความเห็น' },
    { title: 'สรุปผลสังเกตอาการ' },
  ];

  /* Bottom CTA bar — same shared <Footer type='with BTN' sticky> pattern
     as the OPD screening wizard, so every step (free-navigation dashboard
     though these tabs are) ends in a consistent forward action. Final
     step's primary button IS the discharge action instead of "ถัดไป". */
  const currentStepIdx = OBSERVATION_STEP_KEYS.indexOf(activeTab);
  const isFirstStep = currentStepIdx === 0;
  const isLastStep = currentStepIdx === OBSERVATION_STEP_KEYS.length - 1;
  const goPrevStep = () => setActiveTab(OBSERVATION_STEP_KEYS[Math.max(0, currentStepIdx - 1)]);
  const goNextStep = () =>
    setActiveTab(OBSERVATION_STEP_KEYS[Math.min(OBSERVATION_STEP_KEYS.length - 1, currentStepIdx + 1)]);
  const footerPrimaryLabel = isLastStep ? 'จำหน่าย' : `ถัดไป: ${observationSteps[currentStepIdx + 1]?.title || ''}`;
  const handleFooterPrimaryClick = () => {
    if (isLastStep) saveDischarge();
    else goNextStep();
  };
  /* "บันทึกร่าง" — same decorative slot as the OPD screening footer.
     Every field on this page already lives in React state as the user
     types (no separate draft store to write to), so this just confirms
     the in-progress entry is safe instead of performing a real save. */
  const handleSaveDraft = () => setDraftSavedToast(true);

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
      breadcrumb={['หน้าหลัก PHCIS', 'ห้องสังเกตอาการ', `แฟ้มสังเกตอาการ: ${patient.patientName}`]}
    >
      {/* Patient identity banner — same <PatientCard> aliased from OPD
          screening, in the same top-of-page position; it owns its own
          back/title/actions row so QueuePageShell's SubHeader is skipped
          above (no title/onBack/actions passed) to avoid a duplicate bar. */}
      <PatientCard
        sticky
        patient={patientCardProfile}
        onBack={() => history.push('/observation')}
        title='แฟ้มบันทึกสังเกตอาการ (Observation Record)'
        actions={
          <NeutralSubdueButton variant='outline' size='md' leadingIcon='print' onClick={() => window.print()}>
            พิมพ์ใบสังเกตอาการ (Timed Sheet)
          </NeutralSubdueButton>
        }
      />

      {/* Section step indicator — same StepProgress used by the CPOE
          treatment wizard, sticky in the same slot QueuePageShell's
          TabUnderline would otherwise occupy. */}
      <div
        className='w-full sticky flex justify-center overflow-x-auto'
        style={{
          top: '64px',
          zIndex: 1100,
          background: 'var(--surface-card-100)',
          paddingTop: 'var(--dim-space-300)',
          paddingBottom: 'var(--dim-space-300)',
          paddingLeft: 'var(--dim-space-600)',
          paddingRight: 'var(--dim-space-600)',
          borderBottom: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
        }}
      >
        <StepProgress
          steps={observationSteps}
          current={OBSERVATION_STEP_KEYS.indexOf(activeTab)}
          completedSteps={OBSERVATION_STEP_KEYS.map(() => false)}
          onStepClick={(idx) => setActiveTab(OBSERVATION_STEP_KEYS[idx])}
        />
      </div>

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
        {/* Observation Context Bar — bed/status/VN/nurse/admit-time aren't
            part of PatientCard's own field set (that banner above already
            covers name/HN/sex/age/insurance/doctor). Chief complaint and
            diagnosis are intentionally left out here — not needed in the
            Observation system yet. */}
        <div
          className='bg-white rounded-2xl p-4 border-none flex flex-wrap items-center gap-4 text-xs'
          style={{ boxShadow: 'var(--shadow-card-strong, 0 4px 20px rgba(0,0,0,0.05))' }}
        >
          <span className='px-2.5 py-1 bg-brand-700 text-white rounded-md text-xs font-bold'>{patient.bedNo}</span>
          <StatusBadge
            style={
              patient.status === 'discharged'
                ? 'neutral'
                : patient.status === 'ready_discharge'
                ? 'success'
                : currentEws.score >= 3
                ? 'error'
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
          <span className='text-gray-600 font-mono'>VN: <strong className='text-gray-900'>{patient.vn}</strong></span>
          <div className='h-4 w-px bg-gray-200' />
          <span className='text-gray-600'>พยาบาลเจ้าของไข้: <strong className='text-gray-900'>{patient.nurseName}</strong></span>
          <div className='h-4 w-px bg-gray-200' />
          <span className='text-gray-600'>เวลาเข้าเตียง: <strong className='text-brand-900'>{patient.admitTime}</strong></span>
        </div>

      {/* Tab 1: Timed Vital Signs & EWS Trend */}
      {activeTab === 'vitals' && (
        <div className='space-y-6'>
          {/* EWS Score & Clinical Escalation Protocol Card */}
          <div className='bg-white rounded-2xl p-5 border-none' style={{ boxShadow: 'var(--shadow-card-strong, 0 4px 20px rgba(0,0,0,0.05))' }}>
            <div className='flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-gray-100 mb-4'>
              <div className='flex items-center gap-3'>
                <div
                  className='w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-white shadow-sm shrink-0 font-mono leading-none gap-0.5'
                  style={{ backgroundColor: currentEws.tier.color }}
                >
                  <span className='text-[10px] font-semibold opacity-90'>EWS</span>
                  <span className='text-lg font-bold'>{currentEws.score}</span>
                </div>
                <div>
                  <h3 className='font-bold text-brand-600 text-sm flex items-center gap-2'>
                    คะแนนเตือนภัยล่วงหน้า (National Early Warning Score - EWS)
                  </h3>
                  <p className='text-xs font-semibold' style={{ color: currentEws.tier.color }}>
                    ระดับความเสี่ยง: {currentEws.tier.label}
                  </p>
                </div>
              </div>

              {/* Clinical Protocol Directive Alert */}
              <div className='w-full lg:flex-1'>
                <Alert
                  type={currentEws.score >= 5 ? 'error' : currentEws.score >= 2 ? 'warning' : 'info'}
                  title='แนวทางปฏิบัติทางคลินิกตาม EWS Score:'
                  subtext={
                    currentEws.score >= 5
                      ? 'ระดับวิกฤต (High Risk): พยาบาลเข้าประเมินทันที, รายงานแพทย์ผู้ดูแลด่วน, เตรียมเครื่อง Defibrillator / O2 High Flow, และพิจารณาส่งต่อห้องฉุกเฉิน (ER) หรือ ICU ด่วน!'
                      : currentEws.score >= 2
                      ? 'ระดับเฝ้าระวัง (Medium Risk): แจ้งพยาบาลหัวหน้าเวรและปรึกษาแพทย์, เพิ่มความถี่ในการวัดสัญญาณชีพเป็นทุก 30–60 นาที'
                      : 'ระดับปกติ (Low Risk): ผู้ป่วยสัญญาณชีพคงที่ เฝ้าสังเกตอาการตามปกติ วัด V/S ตามรอบ q 4 ชม.'
                  }
                  showCloseButton={false}
                />
              </div>
            </div>

            {/* Vital Signs Trend Chart — shares the VitalsSignGraph chart engine
                used by the OPD screening "กราฟสัญญาณชีพ" popup. */}
            <div className='space-y-3'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <h4 className='font-bold text-gray-800 text-xs flex items-center gap-1.5'>
                  <span className='material-symbols-outlined text-brand-600 text-base'>show_chart</span>
                  กราฟแนวโน้มสัญญาณชีพตามช่วงเวลา (Vital Signs Trend Visualizer)
                </h4>
                <TabBar align='end'>
                  {[
                    { key: 'bp', label: 'ความดัน (BP)' },
                    { key: 'pulse', label: 'ชีพจร (Pulse)' },
                    { key: 'spo2', label: 'SpO2' },
                    { key: 'temp', label: 'อุณหภูมิ (Temp)' },
                    { key: 'rr', label: 'หายใจ (RR)' },
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
              </div>

              <VitalTrendChart data={patient.vitalsTrend} parameter={selectedTrendParam} />
            </div>
          </div>

          {/* Add Vital Form Card */}
          <div className='bg-white rounded-2xl p-5 border-none' style={{ boxShadow: 'var(--shadow-card-strong, 0 4px 20px rgba(0,0,0,0.05))' }}>
            <h3 className='font-bold text-brand-600 text-sm mb-4 flex items-center gap-2'>
              <span className='material-symbols-outlined text-brand-600'>add_chart</span>
              ลงบันทึกสัญญาณชีพประจำช่วงเวลา (Add Timed Vitals)
            </h3>

            <form onSubmit={handleAddVital} className='space-y-4 text-xs'>
              {/* Same VitalCard / PressureCard used by OPD screening's
                  VitalsForm — reused here instead of plain InputFields so
                  the quick-entry row shares steppers, hints, and threshold
                  badges with the rest of the app. `key` forces a remount
                  (clearing the fields) after each successful save, since
                  these cards hold their own uncontrolled input state. */}
              <div key={vitalFormResetKey} className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
                <PressureCard
                  sys={newVital.bpSys}
                  dia={newVital.bpDia}
                  onChange={({ sys, dia }) => setNewVital({ ...newVital, bpSys: sys, bpDia: dia })}
                  onValidityChange={(v) => setVitalFieldValid('pressure', v)}
                />
                <VitalCard
                  label='ชีพจร (Pulse)'
                  unit='ครั้ง/นาที'
                  required
                  value={newVital.pulse}
                  onChange={(val) => setNewVital({ ...newVital, pulse: val })}
                  onValidityChange={(v) => setVitalFieldValid('pulse', v)}
                  hint='ปกติ 60–100 ครั้ง/นาที'
                />
                <VitalCard
                  label='อุณหภูมิ (Temp)'
                  unit='°C'
                  required
                  step={0.1}
                  value={newVital.temp}
                  onChange={(val) => setNewVital({ ...newVital, temp: val })}
                  onValidityChange={(v) => setVitalFieldValid('temp', v)}
                  hint='ปกติ 36.1–37.2 °C'
                />
                <VitalCard
                  label='ออกซิเจนปลายนิ้ว (SpO2)'
                  unit='%'
                  required
                  value={newVital.spo2}
                  onChange={(val) => setNewVital({ ...newVital, spo2: val })}
                  onValidityChange={(v) => setVitalFieldValid('spo2', v)}
                  hint='ปกติ ≥ 95%'
                />
                <VitalCard
                  label='อัตราการหายใจ (RR)'
                  unit='ครั้ง/นาที'
                  required
                  value={newVital.rr}
                  onChange={(val) => setNewVital({ ...newVital, rr: val })}
                  onValidityChange={(v) => setVitalFieldValid('rr', v)}
                  hint='ปกติ 12–20 ครั้ง/นาที'
                />
              </div>

              <div className='flex items-end gap-3'>
                <div className='flex-1'>
                  <InputField
                    placeholder='หมายเหตุ / อาการขณะวัด (เช่น หลังพ่นยา 15 นาที, หายใจเหนื่อยลดลง)'
                    value={newVital.note}
                    onChange={(val) => setNewVital({ ...newVital, note: val })}
                    size='sm'
                  />
                </div>
                <BrandPrimaryButton type='submit' leadingIcon='add' size='sm' disabled={!isVitalFormValid}>
                  บันทึก
                </BrandPrimaryButton>
              </div>
              {!isVitalFormValid && (
                <p style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)' }}>
                  กรุณากรอกค่าให้ครบทุกช่อง (ความดัน, ชีพจร, อุณหภูมิ, SpO2, อัตราการหายใจ) ก่อนบันทึก
                </p>
              )}
            </form>
          </div>

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
              className='flex items-center justify-between'
              style={{
                padding: 'var(--dim-space-400)',
                background: 'var(--surface-card-100)',
                borderBottom: 'var(--dim-stroke-100) solid var(--border-table-default)',
              }}
            >
              <h3
                className='flex items-center'
                style={{
                  gap: 'var(--dim-space-150, 6px)',
                  color: 'var(--text-table-title)',
                  fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
                  fontWeight: 'var(--type-weight-bold)',
                  fontSize: 'var(--type-size-sm)',
                }}
              >
                <span className='material-symbols-outlined' style={{ color: 'var(--icon-brandPrimary-default)' }}>timeline</span>
                ไทม์ไลน์การสังเกตอาการ (Observation Timeline)
              </h3>
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
            </div>

            <div style={{ padding: 'var(--dim-space-400)' }}>
              {pagedTimeline.length === 0 ? (
                <p style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-sm)', textAlign: 'center', padding: 'var(--dim-space-600) 0' }}>
                  ยังไม่มีการบันทึกสัญญาณชีพหรือความเห็น
                </p>
              ) : (
                <div className='flex flex-col'>
                  {pagedTimeline.map((entry, idx) => {
                    const isLast = idx === pagedTimeline.length - 1;
                    const ewsRes = entry.vitals ? calculateEwsScore(entry.vitals) : null;
                    return (
                      <div key={entry.time} className='flex' style={{ gap: 'var(--dim-space-300)' }}>
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
                                fontWeight: 'var(--type-weight-bold)',
                                color: 'var(--text-brandPrimary-default)',
                                background: 'var(--surface-brandPrimary-quaternary)',
                                padding: 'var(--dim-space-050, 2px) var(--dim-space-200)',
                                borderRadius: 'var(--dim-radius-150, 6px)',
                                fontSize: 'var(--type-size-xs)',
                              }}
                            >
                              {entry.time}
                            </span>
                            {ewsRes && (
                              <StatusBadge style={ewsRes.tier.style} size='small' showDot>
                                EWS: {ewsRes.score}
                              </StatusBadge>
                            )}
                          </div>

                          {entry.vitals && (
                            <div
                              className='grid grid-cols-2 sm:grid-cols-5'
                              style={{ gap: 'var(--dim-space-200)', marginBottom: 'var(--dim-space-200)' }}
                            >
                              {[
                                ['ความดัน', `${entry.vitals.bpSys}/${entry.vitals.bpDia}`],
                                ['ชีพจร', `${entry.vitals.pulse} bpm`],
                                ['อุณหภูมิ', `${entry.vitals.temp}°C`],
                                ['SpO2', `${entry.vitals.spo2}%`],
                                ['RR', `${entry.vitals.rr} ครั้ง/นาที`],
                              ].map(([label, value]) => (
                                <div
                                  key={label}
                                  className='bg-surface-card p-1.5 rounded-lg shadow-2xs border border-ink-line'
                                >
                                  <div className='text-[10px] text-ink-quaternary font-medium'>{label}</div>
                                  <div className='font-bold text-brand-600 text-[11px]'>{value}</div>
                                </div>
                              ))}
                            </div>
                          )}

                          {entry.opinions.map((op, opIdx) => (
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
                          ))}
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

      {/* Tab 2: STAT / Urgent Orders */}
      {activeTab === 'orders' && (
        <div className='space-y-6'>
          {/* Add Stat Order Form */}
          <div className='bg-white rounded-2xl p-5 border-none' style={{ boxShadow: 'var(--shadow-card-strong, 0 4px 20px rgba(0,0,0,0.05))' }}>
            <h3 className='font-bold text-brand-600 text-sm mb-3 flex items-center gap-2'>
              <span className='material-symbols-outlined text-brand-600'>order_approve</span>
              เพิ่มคำสั่งการรักษาด่วน (Add STAT / Urgent Order)
            </h3>
            <form onSubmit={handleAddOrder} className='space-y-3 text-xs'>
              <SuggestibleTextarea
                voice
                placeholder='ระบุคำสั่งการรักษา STAT เช่น Berodual 1 respule Nebulizer Stat, Oxygen Cannula 3 LPM, IV NSS 1,000 ml'
                value={newOrderText}
                onChange={(e) => setNewOrderText(e.target.value)}
                suggestions={STAT_ORDER_SUGGESTIONS}
                minChars={3}
                popoverAriaLabel='คำแนะนำคำสั่งการรักษาด่วน'
                required
              />
              <div className='flex justify-end'>
                <BrandPrimaryButton type='submit' leadingIcon='bolt' size='sm' disabled={!newOrderText.trim()}>
                  สั่งการ STAT
                </BrandPrimaryButton>
              </div>
            </form>
          </div>

          {/* Orders List — same shared <Table> pattern as the Timed Vital
              Signs sheet, instead of a bespoke div-per-row list. */}
          <div
            style={{
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-500)',
              boxShadow: 'var(--shadow-card-strong)',
              overflow: 'hidden',
            }}
          >
            <div
              className='flex items-center justify-between'
              style={{
                padding: 'var(--dim-space-400)',
                background: 'var(--surface-card-100)',
                borderBottom: 'var(--dim-stroke-100) solid var(--border-table-default)',
              }}
            >
              <h3
                className='flex items-center'
                style={{
                  gap: 'var(--dim-space-150, 6px)',
                  color: 'var(--text-table-title)',
                  fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
                  fontWeight: 'var(--type-weight-bold)',
                  fontSize: 'var(--type-size-sm)',
                }}
              >
                <span className='material-symbols-outlined' style={{ color: 'var(--icon-brandPrimary-default)' }}>format_list_bulleted</span>
                รายการคำสั่งการรักษา & การพยาบาลด่วน (STAT Order List)
              </h3>
              <span
                style={{
                  color: 'var(--text-content-secondary)',
                  fontFamily: 'var(--type-family-body)',
                  fontWeight: 'var(--type-weight-medium)',
                  fontSize: 'var(--type-size-xs)',
                }}
              >
                ทั้งหมด {patient.statOrders.length} รายการ
              </span>
            </div>

            <div style={{ padding: 'var(--dim-space-400)' }}>
              <Table
                columns={statOrderColumns}
                rows={pagedStatOrders}
                rowKey={(ord) => ord.id}
                emptyMessage='ยังไม่มีคำสั่งการรักษาด่วน'
              />

              {patient.statOrders.length > VITALS_PAGE_SIZE && (
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
                    แสดง {ordersRangeStart}–{ordersRangeEnd} จาก {patient.statOrders.length} รายการ
                  </span>
                  <div className='flex-1' />
                  <Pagination currentPage={ordersPageClamped} pageCount={ordersTotalPages} onPageChange={setOrdersPage} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Nursing Focus Notes — two-column layout, mirroring VitalsForm's
          left-panel/right-content split: the add-note form is a fixed-width
          left panel, the activity log timeline fills the remaining width. */}
      {activeTab === 'notes' && (
        <div className='flex flex-col lg:flex-row lg:items-stretch' style={{ gap: 'var(--dim-space-600)' }}>
          {/* Add Nursing Note — left panel (full width until it collapses
              back into the timeline above the lg breakpoint) */}
          <div
            className='w-full lg:w-[360px] lg:shrink-0 bg-white rounded-2xl p-5 border-none'
            style={{ boxShadow: 'var(--shadow-card-strong, 0 4px 20px rgba(0,0,0,0.05))' }}
          >
            <h3 className='font-bold text-brand-600 text-sm mb-3 flex items-center gap-2'>
              <span className='material-symbols-outlined text-brand-600'>edit_note</span>
              บันทึกความเห็น
            </h3>
            <form onSubmit={handleAddNursingNote} className='space-y-3 text-xs'>
              {/* Mock role gate (TOR 1.14.3) — no real staff login exists in
                  this app, so "เข้าสู่ระบบในฐานะ" stands in for it and
                  restricts which note type below can be selected. */}
              <Select
                label='เข้าสู่ระบบในฐานะ'
                value={currentUserRole === 'nurse' ? 'พยาบาล' : 'แพทย์'}
                onChange={(val) => handleRoleChange(val === 'พยาบาล' ? 'nurse' : 'doctor')}
                options={['พยาบาล', 'แพทย์']}
                size='sm'
              />
              <Select
                label='ประเภทบันทึก'
                value={noteType}
                onChange={setNoteType}
                options={noteTypeOptions}
                size='sm'
              />
              <SuggestibleTextarea
                voice
                placeholder='ระบุบันทึกทางการพยาบาล อาการเปลี่ยนแปลง การตอบสนองต่อการรักษา หรือการประเมินความเสี่ยง'
                value={newNursingNote}
                onChange={(e) => setNewNursingNote(e.target.value)}
                suggestions={NURSING_NOTE_SUGGESTIONS}
                minChars={3}
                popoverAriaLabel='คำแนะนำบันทึกพยาบาล'
                required
              />
              <div className='flex justify-end'>
                <BrandPrimaryButton type='submit' leadingIcon='save' size='sm' disabled={!newNursingNote.trim()}>
                  บันทึกโน้ตพยาบาล
                </BrandPrimaryButton>
              </div>
            </form>
          </div>

          {/* Nursing Notes Timeline — right content */}
          <div className='flex-1 min-w-0 bg-white rounded-2xl p-6 border-none' style={{ boxShadow: 'var(--shadow-card-strong, 0 4px 20px rgba(0,0,0,0.05))' }}>
            <h3 className='font-bold text-brand-600 text-sm mb-6 flex items-center gap-2 border-b border-gray-100 pb-3'>
              <span className='material-symbols-outlined text-brand-600'>history</span>
              ประวัติการบันทึกทางการพยาบาล (Nursing Activity Log)
            </h3>

            {/* Activity log timeline — dot + connecting line drawn inside a
                flex marker column (stretches to the row height via the
                container's default align-items:stretch) instead of the
                previous absolute-position + pseudo-element line, which
                mispositioned the dot over the time chip. */}
            <div className='flex flex-col'>
              {pagedNursingNotes.map((note, idx) => {
                const isLast = idx === pagedNursingNotes.length - 1;
                return (
                  <div key={idx} className='flex' style={{ gap: 'var(--dim-space-300)' }}>
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
                          style={{
                            width: 2,
                            background: 'var(--border-steps-default)',
                            marginTop: 'var(--dim-space-100)',
                          }}
                        />
                      )}
                    </div>

                    <div className='flex-1 min-w-0' style={{ paddingBottom: isLast ? 0 : 'var(--dim-space-500)' }}>
                      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)', marginBottom: 'var(--dim-space-150, 6px)' }}>
                        <span
                          className='font-mono'
                          style={{
                            fontWeight: 'var(--type-weight-bold)',
                            color: 'var(--text-brandPrimary-default)',
                            background: 'var(--surface-brandPrimary-quaternary)',
                            padding: 'var(--dim-space-050, 2px) var(--dim-space-200)',
                            borderRadius: 'var(--dim-radius-150, 6px)',
                            fontSize: 'var(--type-size-xs)',
                          }}
                        >
                          {note.time}
                        </span>
                        <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)' }}>
                          บันทึกโดย: {note.nurse}
                        </span>
                        {note.noteType && (
                          <span style={{ color: 'var(--text-brandPrimary-default)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)' }}>
                            · {note.noteType}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          color: 'var(--text-content-default)',
                          background: 'var(--surface-neutral-quaternary)',
                          padding: 'var(--dim-space-300)',
                          borderRadius: 'var(--dim-radius-300)',
                          border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                          fontSize: 'var(--type-size-xs)',
                          fontWeight: 'var(--type-weight-medium)',
                          lineHeight: 1.6,
                        }}
                      >
                        {note.note}
                      </div>
                    </div>
                  </div>
                );
              })}
              {patient.nursingNotes.length === 0 && (
                <p style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)', fontStyle: 'italic', textAlign: 'center' }}>
                  ยังไม่มีบันทึกทางการพยาบาล
                </p>
              )}
            </div>

            {patient.nursingNotes.length > VITALS_PAGE_SIZE && (
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
                  แสดง {notesRangeStart}–{notesRangeEnd} จาก {patient.nursingNotes.length} รายการ
                </span>
                <div className='flex-1' />
                <Pagination currentPage={notesPageClamped} pageCount={notesTotalPages} onPageChange={setNotesPage} />
              </div>
            )}
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

          <form onSubmit={handleSaveDischarge} className='space-y-6 text-xs text-gray-700'>
            {/* Disposition Selector */}
            <div>
              <label className='block font-bold text-gray-800 mb-2'>1. สรุปประเภทการจำหน่าย (Discharge Disposition)</label>
              <div className='grid grid-cols-1 md:grid-cols-4 gap-3'>
                {[
                  { key: 'home', label: 'อนุญาตกลับบ้าน (Discharge Home)', icon: 'home', color: 'teal' },
                  { key: 'refer', label: 'ส่งต่อโรงพยาบาลใหญ่ (E-Referral)', icon: 'local_hospital', color: 'rose' },
                  { key: 'admit_ipd', label: 'ส่งเข้าตึกผู้ป่วยใน (Admit IPD)', icon: 'bed', color: 'amber' },
                  { key: 'opd', label: 'ส่งกลับตรวจ OPD ปกติ', icon: 'directions_walk', color: 'blue' },
                ].map((disp) => {
                  const isSelected = dischargeForm.disposition === disp.key;
                  /* Hover contract mirrors SelectableOptionCard (Figma "Card /
                     Selectable Option" 227:193) — elevated shadow + 2px lift
                     on hover, suppressed once selected. */
                  const isHovered = !isSelected && hoveredDisposition === disp.key;
                  return (
                    <label
                      key={disp.key}
                      className='flex flex-col items-center justify-center text-center cursor-pointer'
                      onMouseEnter={() => setHoveredDisposition(disp.key)}
                      onMouseLeave={() => setHoveredDisposition((h) => (h === disp.key ? null : h))}
                      style={{
                        gap: 'var(--dim-space-200)',
                        padding: 'var(--dim-space-400)',
                        borderRadius: 'var(--dim-radius-400)',
                        border: isSelected
                          ? 'var(--dim-stroke-200) solid var(--border-brandPrimary-default)'
                          : 'var(--dim-stroke-100) solid var(--border-card-default)',
                        background: isSelected ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100)',
                        color: isSelected ? 'var(--text-brandPrimary-default)' : 'var(--text-content-secondary)',
                        fontWeight: isSelected ? 'var(--type-weight-bold)' : 'var(--type-weight-regular)',
                        boxShadow: isHovered ? 'var(--shadow-drop, var(--shadow-card))' : 'none',
                        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                        transition: 'transform 200ms cubic-bezier(0.32, 0.72, 0, 1), box-shadow 200ms cubic-bezier(0.32, 0.72, 0, 1)',
                      }}
                    >
                      <input
                        type='radio'
                        name='disposition'
                        value={disp.key}
                        checked={isSelected}
                        onChange={(e) => setDischargeForm({ ...dischargeForm, disposition: e.target.value })}
                        className='sr-only'
                      />
                      <span className='material-symbols-outlined text-2xl' style={{ color: 'var(--icon-brandPrimary-default)' }}>
                        {disp.icon}
                      </span>
                      <span style={{ fontSize: 'var(--type-size-xs)', lineHeight: 1.4 }}>{disp.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Refer Hospital Selector if refer */}
            {dischargeForm.disposition === 'refer' && (
              <div className='p-4 bg-brand-50/70 rounded-xl border border-brand-200/80 space-y-3 animate-fade-in'>
                <Select
                  label='โรงพยาบาลรับส่งต่อ (Destination Referral Hospital):'
                  value={dischargeForm.referHospital}
                  onChange={(val) => setDischargeForm({ ...dischargeForm, referHospital: val })}
                  options={[
                    REFER_HOSPITAL_PLACEHOLDER,
                    'โรงพยาบาลตากสิน',
                    'โรงพยาบาลเจริญกรุงประชารักษ์',
                    'โรงพยาบาลกลาง',
                    'โรงพยาบาลศิริราช'
                  ]}
                  size='sm'
                  required
                />
                {isReferHospitalMissing && (
                  <p style={{ color: 'var(--text-danger-default)', fontSize: 'var(--type-size-xs)' }}>
                    กรุณาเลือกโรงพยาบาลปลายทางก่อนบันทึก
                  </p>
                )}
              </div>
            )}

            {/* Doctor Discharge Note — same suggestion-popover pattern as
                OPD screening (appears after 3 characters). */}
            <SuggestibleTextarea
              voice
              label='2. สรุปความเห็นแพทย์ (Doctor Discharge Note)'
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

            {/* Checkbox Complete */}
            <div className='p-4 bg-brand-50/60 rounded-xl border border-brand-100 flex items-center gap-3'>
              <input
                type='checkbox'
                id='isDischargedCheck'
                checked={dischargeForm.isDischarged}
                onChange={(e) => setDischargeForm({ ...dischargeForm, isDischarged: e.target.checked })}
                className='w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer'
              />
              <label htmlFor='isDischargedCheck' className='font-bold text-brand-900 cursor-pointer text-xs'>
                ยืนยันการจำหน่ายผู้ป่วยออกจากเตียงสังเกตอาการ (Discharge & Release Bed)
              </label>
            </div>
          </form>
        </div>
      )}
      </div>

      {/* Bottom CTA bar — same shared <Footer type='with BTN' sticky> used by
          the OPD screening wizard, so every step ends in a consistent
          forward action instead of relying solely on the StepProgress
          circles above. Final step's primary button performs the
          discharge save (see saveDischarge) instead of advancing. */}
      <Footer
        type='with BTN'
        sticky
        showLegal={false}
        showAutoSave={false}
        showButton2
        button2Label='บันทึกร่าง'
        button2Icon='save'
        onButton2Click={handleSaveDraft}
        showButton3={!isFirstStep}
        button3Label='ย้อนกลับ'
        button3Icon='arrow_back'
        onButton3Click={goPrevStep}
        showButton1
        button1Label={footerPrimaryLabel}
        button1TrailingIcon={isLastStep ? 'check_circle' : 'arrow_forward'}
        button1Disabled={isLastStep && isReferHospitalMissing}
        onButton1Click={handleFooterPrimaryClick}
      />

      <SuccessToast
        open={draftSavedToast}
        message='บันทึกร่างเรียบร้อยแล้ว'
        onClose={() => setDraftSavedToast(false)}
      />
    </QueuePageShell>
  );
}
