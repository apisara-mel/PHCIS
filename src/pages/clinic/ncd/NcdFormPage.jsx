import React, { useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header, { SubHeader } from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Icon from '@/components/icons/Icon';
import PatientCard from '@/components/card/PatientCard';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Popup from '@/components/popup/Popup';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import TreatmentFormShell from '@/templates/TreatmentFormShell';
import {
  NcdStep1History, NcdStep2Assessment, NcdStep3Examination,
  NcdStep4Diagnosis, NcdStep5Attachments, NcdStep6Appointment,
  validateNcdAppointment,
} from '@/pages/clinic/ncd/NcdSteps';
import { findMrPatientByHn, DEFAULT_MR_PATIENT } from '@/data/mrPatients';
import { getPatientByHN, DEFAULT_PATIENT } from '@/data/patientProfiles';
/* IMPORT-ONLY cross-module hand-off: the /appointment system owns these —
   this page never edits appointment-module files, it only appends/updates
   its own row through the public store (playbook §4). */
import { addExtraAppointments, updateExtraAppointment } from '@/pages/appointment/appointmentExtraStore';
import { APPT_STATUS_CONFIRMED, APPT_STATUS_CANCELLED } from '@/pages/appointment/appointmentShared';
import {
  DEFAULT_NCD_VISIT,
  getNcdCompletedSteps,
  getNcdPatientByHn,
  getNcdRegistrationByHn,
  getNcdCancellation,
  getNcdVisitStatus,
  setNcdVisitStatus,
  saveNcdVisitRecord,
  getNcdAppointment,
  saveNcdAppointment,
  cancelNcdAppointment,
  isNcdSlotBooked,
  ncdSlotRange,
  resolveNcdGroup,
  canEditNcd,
  NCD_CURRENT_USER,
  NCD_VISIT_CANCEL_SUGGESTIONS,
  NCD_APPOINTMENT_CANCEL_SUGGESTIONS,
  formatNcdDate,
} from '@/data/ncdVisits';

/* NcdFormPage — บันทึกการตรวจรักษาโรคเฉพาะ NCD (TOR 1.10.2.1/.3/.4/.5/.7)
   at /clinic/ncd/record. Mirrors AncFormPage: one form-state object across
   the 6 steps in NcdSteps.jsx via the shared TreatmentFormShell, seeded from
   queue nav state. The record supports the full TOR quartet:

     • แสดง   — the form itself (+ read-only mode when สิทธิ์ผู้ใช้ไม่พอ)
     • บันทึก — ร่าง (returns the queue row to ที่ร่างไว้) + ยืนยัน
                (validates วินิจฉัย + นัดหมาย, appends to the follow-up
                trend, audit-stamps ผู้บันทึก + เวลา)
     • แก้ไข — reopening a draft/done visit edits the same form state
     • ยกเลิก — reason-required popup; the cancellation + reason + ผู้ยกเลิก
                stay in sessionStorage as the visit's audit trail

   Telemedicine visits show the videocam entry banner: joining/leaving the
   consult is an inline state flip (ANC Step-6 pattern — the shared web call
   room is TelemedConsultPage's overlay, reported in the manifest as a mock
   integration), and leaving never touches the form state. */

const breadcrumb = ['ระบบบันทึกการรักษา', 'งานกลุ่มโรคเฉพาะ NCD'];

const NCD_STEPS = [
  { title: 'ผลการซักประวัติ', subtitle: 'Medical History' },
  { title: 'ประเมิน NCD', subtitle: 'NCD Assessment' },
  { title: 'ตรวจร่างกาย', subtitle: 'Physical Examination' },
  { title: 'วินิจฉัย + สั่งการรักษา', subtitle: 'Diagnosis & Orders' },
  { title: 'เอกสารแนบ', subtitle: 'Attachments' },
  { title: 'นัดหมาย', subtitle: 'Appointment' },
];

const formatAuditTime = (d) => new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(d);

const formatNcdApptLabel = (a) => `${formatNcdDate(a?.date)}${a?.time ? ` · ${a.time} น.` : ''}`;

const Banner = ({ tone = 'warning', icon, children, action }) => {
  const palette = tone === 'danger'
    ? { bg: 'var(--surface-danger-quaternary, #FFF0F0)', fg: 'var(--text-danger-default, #C72121)' }
    : tone === 'info'
      ? { bg: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', fg: 'var(--text-brandPrimary-default, #007549)' }
      : { bg: 'var(--surface-alert-warning, #FFF9F0)', fg: 'var(--text-warning-default, #C2410C)' };
  return (
    <div
      className='flex items-center flex-wrap'
      style={{
        gap: 'var(--dim-space-300)',
        paddingTop: 'var(--dim-space-300)',
        paddingBottom: 'var(--dim-space-300)',
        paddingLeft: 'var(--dim-space-400)',
        paddingRight: 'var(--dim-space-400)',
        borderRadius: 'var(--dim-radius-200)',
        background: palette.bg,
        color: palette.fg,
        fontSize: 'var(--type-size-sm)',
      }}
    >
      <Icon name={icon} size={18} />
      <span className='flex-1 min-w-0'>{children}</span>
      {action}
    </div>
  );
};

const NcdFormPage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();
  const canEdit = canEditNcd();

  /* MR-shape identity for the step bodies (drugAllergies / rights / …). */
  const patient = useMemo(() => {
    const p = (navState && findMrPatientByHn(navState.hn)) || DEFAULT_MR_PATIENT;
    return { ...p, queue: navState?.queue, name: navState?.name || `${p.firstNameTh} ${p.lastNameTh}` };
  }, [navState]);

  /* PatientCard-shape identity (HN ชื่อ-สกุล เพศ อายุ บัตรประชาชน สิทธิ —
     TOR 1.10.2.1's identity set). Display only — records key off `ncdHn`
     (the HN the queue navigated with), same reasoning as AncFormPage. */
  const cardPatient = useMemo(
    () => (navState?.hn && getPatientByHN(navState.hn)) || DEFAULT_PATIENT,
    [navState?.hn],
  );
  const ncdHn = navState?.hn || cardPatient?.hn;

  const queueRow = useMemo(() => getNcdPatientByHn(ncdHn), [ncdHn]);
  const registration = useMemo(() => getNcdRegistrationByHn(ncdHn), [ncdHn]);
  const registryCancellation = useMemo(() => getNcdCancellation(ncdHn), [ncdHn]);
  const diseaseGroups = registration?.diseaseGroups || queueRow?.diseaseGroups || [];

  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState(() => ({
    ...DEFAULT_NCD_VISIT,
    icd10: registration?.icd10 || '',
    controlStatus: registration?.severity || '',
    activeTemplate: (registration?.diseaseGroups || queueRow?.diseaseGroups || [])[0] || '',
  }));

  /* บันทึกร่าง / ยืนยัน / ยกเลิก state — audit copy shown in Step 6 and the
     cancelled banner. Seeded from sessionStorage so reopening a cancelled
     visit still shows who cancelled it and why. */
  const [saveState, setSaveState] = useState(() => {
    const status = getNcdVisitStatus(ncdHn);
    return status?.statusKey === 'cancelled'
      ? { cancelled: status }
      : {};
  });
  const [confirmError, setConfirmError] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  /* One stable record id per open form — ยืนยัน twice (or ยืนยัน → แก้ไข →
     ยืนยัน) UPDATES the same follow-up row instead of appending a duplicate
     visit to the trend (spec edge case DOUBLE CONFIRM). */
  const [recordId] = useState(() => `V-NCD-${ncdHn || 'unknown'}-${Date.now()}`);

  /* ── นัดหมาย (TOR 1.10.2.5) — the saved booking + its edit/cancel state.
     Seeded from sessionStorage so reopening the record shows the booking
     that ยืนยัน created, including a cancelled one with its audit. */
  const [savedAppt, setSavedAppt] = useState(() => getNcdAppointment(ncdHn));
  const [apptEditing, setApptEditing] = useState(false);
  const [apptSnapshot, setApptSnapshot] = useState(null);
  const [apptSaveError, setApptSaveError] = useState('');
  const [apptCancelOpen, setApptCancelOpen] = useState(false);
  const [apptCancelReason, setApptCancelReason] = useState('');
  const [apptCancelError, setApptCancelError] = useState('');
  const [apptDiscardOpen, setApptDiscardOpen] = useState(false);

  /* Telemedicine join state — flipping in/out of the consult keeps `form`
     untouched (spec edge case "declining/leaving returns to the form
     without losing form state"). */
  const [telemedStatus, setTelemedStatus] = useState('none');

  const completedSteps = useMemo(
    () => getNcdCompletedSteps(form, stepIndex),
    [form, stepIndex],
  );

  const handleSaveDraft = () => {
    setNcdVisitStatus(ncdHn, 'draft');
    setSaveState((s) => ({ ...s, draftAt: formatAuditTime(new Date()), by: NCD_CURRENT_USER.name }));
    setConfirmError('');
  };

  const apptDoctor = registration?.doctor || queueRow?.doctor || '';

  /* บันทึกนัดหมาย (TOR 1.10.2.5) — writes BOTH sides of the hand-off:
       • ncdVisits sessionStorage — the module's own record, so Step 6 can
         แสดง / แก้ไข / ยกเลิก it and the queue's "นัดแล้วยังไม่มาติดต่อ"
         tab can pick it up (E4)
       • appointmentExtraStore — the /appointment system's public store, so
         the booking appears on the shared list/calendar with the exact row
         contract AppointmentRequestInboxPage writes (namespaced id so it can
         never collide with an 'A-<n>' inbox row)
     Returns an error string, or '' on success. */
  const persistAppointment = () => {
    if (!canEdit) return '';
    if (form.appointment.skipped || !form.appointment.date) return '';
    /* Re-validate the slot AT SAVE TIME — a slot that was free while typing
       can be taken before ยืนยัน (spec edge case). */
    if (form.appointment.time && isNcdSlotBooked(form.appointment.date, form.appointment.time, ncdHn)) {
      return 'ช่วงเวลานี้เพิ่งถูกจอง — เลือกเวลาอื่น';
    }
    const record = saveNcdAppointment(ncdHn, {
      date: form.appointment.date,
      time: form.appointment.time,
      mode: form.appointment.mode || 'onsite',
      note: form.appointment.note || '',
      doctor: apptDoctor,
      patient: cardPatient?.fullName || patient.name,
      diseaseGroups,
      diagnosis: form.diagnosisNote,
    });
    if (!record) return 'บันทึกนัดหมายไม่สำเร็จ — ลองอีกครั้ง';

    const row = {
      id: record.id,
      staffId: null,
      date: record.date,
      time: record.time,
      slotRange: ncdSlotRange(record.time),
      status: APPT_STATUS_CONFIRMED,
      patient: record.patient,
      patientAvatar: cardPatient?.avatarUrl,
      hn: ncdHn,
      rights: cardPatient?.insurance,
      clinic: 'NCD',
      dept: 'NCD',
      type: 'พบแพทย์',
      doctor: apptDoctor,
      examMode: record.mode === 'telemedicine' ? 'telemedicine' : 'onsite',
      orderingUnit: 'คลินิกโรคเฉพาะ NCD',
      reason: form.diagnosisNote,
      prep: record.note,
      createdBy: NCD_CURRENT_USER.name,
      /* Re-booking after a ยกเลิก clears the old cancel audit on the mirror
         row too — updateExtraAppointment merges, so stale fields would
         otherwise survive onto an active appointment. */
      cancelReason: null,
      cancelledBy: null,
      cancelledAt: null,
    };
    /* Existing row is UPDATED by its stable id — never appended twice. */
    if (!updateExtraAppointment(record.id, row)) addExtraAppointments([row]);
    setSavedAppt(record);
    return '';
  };

  const handleConfirm = () => {
    /* Confirm gate — วินิจฉัย + ICD-10 required (spec edge case), then the
       appointment rules (past date / slot conflict) if one is being made. */
    if (!form.diagnosisNote.trim() || !form.icd10) {
      setConfirmError('ยืนยันไม่ได้ — ต้องระบุวินิจฉัยและรหัส ICD-10 ในขั้นตอนที่ 4 ก่อน');
      return;
    }
    const apptError = validateNcdAppointment(form.appointment, ncdHn);
    if (apptError) {
      setConfirmError(apptError);
      return;
    }
    const persistError = persistAppointment();
    if (persistError) {
      setConfirmError(persistError);
      return;
    }
    setConfirmError('');
    const now = new Date();
    saveNcdVisitRecord(ncdHn, {
      recordId,
      date: now.toISOString().slice(0, 10),
      type: form.appointment.mode === 'telemedicine' || telemedStatus !== 'none' ? 'Telemedicine' : 'ตรวจตามนัด',
      bp: form.vitals.bp || null,
      sbp: Number(String(form.vitals.bp || '').split('/')[0]) || null,
      dbp: Number(String(form.vitals.bp || '').split('/')[1]) || null,
      pulse: Number(form.vitals.hr) || null,
      weight: Number(form.vitals.weight) || null,
      fbs: form.fbs !== '' ? Number(form.fbs) : null,
      hba1c: null,
      ldl: null,
      egfr: null,
      pefr: form.pefr !== '' ? Number(form.pefr) : null,
      spo2: Number(form.vitals.spo2) || null,
      exam: form.physicalExamNote || form.footExam || form.lungSound || '-',
      dental: null,
      xray: form.xrayOrders.length > 0 ? `สั่งตรวจ X-ray ${form.xrayOrders.length} รายการ` : null,
      note: form.diagnosisNote,
      /* TOR 1.10.2.4 — the documents attached during this visit travel with
         the record so the follow-up drill-in can list them (metadata only —
         the mock never retains a File/blob). */
      attachments: form.attachments.map((a) => ({
        id: a.id, name: a.name, type: a.type, sizeLabel: a.sizeLabel, addedAt: a.addedAt,
      })),
    });
    setNcdVisitStatus(ncdHn, 'done');
    setSaveState((s) => ({ ...s, confirmedAt: formatAuditTime(now), by: NCD_CURRENT_USER.name }));
  };

  /* แก้ไขบันทึกที่ยืนยันแล้ว (TOR 1.10.2.7 "แก้ไข") — reopen as a draft; the
     next ยืนยัน updates the SAME follow-up row via `recordId`, so editing a
     confirmed visit never duplicates it in the trend. */
  const handleReopenRecord = () => {
    setNcdVisitStatus(ncdHn, 'draft');
    setSaveState((s) => ({
      ...s,
      confirmedAt: undefined,
      reopenedAt: formatAuditTime(new Date()),
      by: NCD_CURRENT_USER.name,
    }));
    setConfirmError('');
  };

  const confirmCancelVisit = () => {
    if (!cancelReason.trim()) {
      setCancelError('ต้องระบุเหตุผลการยกเลิกก่อนยืนยัน');
      return;
    }
    setNcdVisitStatus(ncdHn, 'cancelled', { reason: cancelReason.trim() });
    setCancelOpen(false);
    setSaveState((s) => ({
      ...s,
      cancelled: { by: NCD_CURRENT_USER.name, at: new Date().toISOString(), reason: cancelReason.trim() },
    }));
  };

  /* ── นัดหมาย: แก้ไข / ยกเลิก / นัดใหม่ (TOR 1.10.2.5) ─────────────── */

  const startEditAppointment = () => {
    setApptSnapshot(form.appointment);
    setApptSaveError('');
    setApptEditing(true);
  };

  const saveAppointmentEdit = () => {
    /* ไม่นัดครั้งถัดไป while editing a saved booking = ยกเลิกนัด — force the
       reason-required path instead of silently dropping the row. */
    if (form.appointment.skipped || !form.appointment.date) {
      setApptSaveError('ต้องระบุวันนัดหมาย — หากต้องการยุติการนัด ให้ใช้ปุ่ม “ยกเลิกนัดหมาย”');
      return;
    }
    const err = validateNcdAppointment(form.appointment, ncdHn) || persistAppointment();
    if (err) {
      setApptSaveError(err);
      return;
    }
    setApptSaveError('');
    setApptSnapshot(null);
    setApptEditing(false);
  };

  const apptDirty = () =>
    !!apptSnapshot && JSON.stringify(apptSnapshot) !== JSON.stringify(form.appointment);

  const requestDiscardAppointmentEdit = () => {
    if (apptDirty()) {
      setApptDiscardOpen(true);
      return;
    }
    setApptEditing(false);
    setApptSaveError('');
  };

  /* ปิด/ยกเลิกการแก้ไข must leave the SAVED booking untouched — restore the
     snapshot and never write to appointmentExtraStore. */
  const confirmDiscardAppointmentEdit = () => {
    if (apptSnapshot) setForm((f) => ({ ...f, appointment: apptSnapshot }));
    setApptSnapshot(null);
    setApptEditing(false);
    setApptSaveError('');
    setApptDiscardOpen(false);
  };

  const confirmCancelAppointment = () => {
    if (!apptCancelReason.trim()) {
      setApptCancelError('ต้องระบุเหตุผลการยกเลิกนัดหมายก่อนยืนยัน');
      return;
    }
    const record = cancelNcdAppointment(ncdHn, apptCancelReason.trim());
    if (record) {
      /* Flip the /appointment mirror to ยกเลิก — the row stays on the shared
         list with its cancel audit; it is never deleted. */
      updateExtraAppointment(record.id, {
        status: APPT_STATUS_CANCELLED,
        cancelReason: record.cancelReason,
        cancelledBy: record.cancelledBy,
        cancelledAt: record.cancelledAt,
      });
      setSavedAppt(record);
    }
    setApptCancelOpen(false);
    setApptEditing(false);
    setApptSnapshot(null);
  };

  const rebookAppointment = () => {
    setForm((f) => ({ ...f, appointment: { ...f.appointment, skipped: false } }));
    setApptSnapshot(form.appointment);
    setApptSaveError('');
    setApptEditing(true);
  };

  const stepProps = {
    form,
    setForm,
    patient,
    diseaseGroups,
    readOnly: !canEdit,
    rightsExpired: !!queueRow?.rightsExpired,
    saveState,
    confirmError,
    onSaveDraft: handleSaveDraft,
    onConfirm: handleConfirm,
    onReopenRecord: handleReopenRecord,
    ncdHn,
    savedAppointment: savedAppt,
    apptEditing,
    apptSaveError,
    registryCancelled: !!registryCancellation,
    onEditAppointment: startEditAppointment,
    onSaveAppointmentEdit: saveAppointmentEdit,
    onDiscardAppointmentEdit: requestDiscardAppointmentEdit,
    onCancelAppointment: () => { setApptCancelReason(''); setApptCancelError(''); setApptCancelOpen(true); },
    onRebookAppointment: rebookAppointment,
  };

  const STEP_RENDERERS = [
    NcdStep1History, NcdStep2Assessment, NcdStep3Examination,
    NcdStep4Diagnosis, NcdStep5Attachments, NcdStep6Appointment,
  ];
  const ActiveStep = STEP_RENDERERS[stepIndex];

  const groupBadges = diseaseGroups.map((key) => {
    const g = resolveNcdGroup(key);
    return g ? <ColorfulBadge key={key} style={g.badge} size='small' hierarchy='secondary'>{g.short}</ColorfulBadge> : null;
  });

  return (
    <ClinicFilterProvider>
    <div className='flex w-full min-h-screen' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
      <Sidebar activeKey='treat' />
      <div className='flex-1 min-w-0 flex flex-col'>
        <Header breadcrumb={breadcrumb} standalone={false} />
        <SubHeader title='บันทึกการตรวจรักษาโรคเฉพาะ (NCD)' hideBottomBorder />

        {/* ยกเลิกการบันทึก — reason required, audit kept */}
        <Popup
          open={cancelOpen}
          onClose={() => setCancelOpen(false)}
          title='ยกเลิกการบันทึกการตรวจรักษา'
          subtitle={`${cardPatient?.fullName || patient.name} · HN: ${ncdHn}`}
          tertiaryAction={{ label: 'ปิด', onClick: () => setCancelOpen(false) }}
          primaryAction={{ label: 'ยืนยันยกเลิกการบันทึก', onClick: confirmCancelVisit, tone: 'danger' }}
        >
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
            <SuggestibleTextarea
              voice
              label='เหตุผลการยกเลิก'
              required
              value={cancelReason}
              onChange={(e) => { setCancelReason(e.target.value); if (cancelError) setCancelError(''); }}
              suggestions={NCD_VISIT_CANCEL_SUGGESTIONS}
              minChars={2}
              placeholder='เช่น ผู้รับบริการขอยุติการตรวจ / บันทึกผิดคน'
            />
            {cancelError && (
              <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100)', color: 'var(--text-danger-default, #C72121)', fontSize: 'var(--type-size-sm)' }}>
                <Icon name='error' size={14} />
                {cancelError}
              </span>
            )}
          </div>
        </Popup>

        {/* ยกเลิกนัดหมาย — same contract as every other ยกเลิก in the module:
            reason required, ผู้ยกเลิก + เวลา stamped, row kept visible. */}
        <Popup
          open={apptCancelOpen}
          onClose={() => setApptCancelOpen(false)}
          title='ยกเลิกนัดหมายติดตาม'
          subtitle={savedAppt ? `${formatNcdApptLabel(savedAppt)} · HN: ${ncdHn}` : ''}
          tertiaryAction={{ label: 'ปิด', onClick: () => setApptCancelOpen(false) }}
          primaryAction={{ label: 'ยืนยันยกเลิกนัดหมาย', onClick: confirmCancelAppointment, tone: 'danger' }}
        >
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
            <SuggestibleTextarea
              voice
              label='เหตุผลการยกเลิกนัดหมาย'
              required
              value={apptCancelReason}
              onChange={(e) => { setApptCancelReason(e.target.value); if (apptCancelError) setApptCancelError(''); }}
              suggestions={NCD_APPOINTMENT_CANCEL_SUGGESTIONS}
              minChars={2}
              placeholder='เช่น ผู้รับบริการขอเลื่อนนัด / บันทึกนัดหมายผิดวัน'
            />
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
              นัดหมายจะถูกทำเครื่องหมาย “ยกเลิก” ทั้งในคลินิก NCD และในระบบนัดหมาย — ไม่ถูกลบออกจากประวัติ
            </span>
            {apptCancelError && (
              <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100)', color: 'var(--text-danger-default, #C72121)', fontSize: 'var(--type-size-sm)' }}>
                <Icon name='error' size={14} />
                {apptCancelError}
              </span>
            )}
          </div>
        </Popup>

        {/* ทิ้งการแก้ไขนัดหมาย — dirty-check discard, same pattern as the
            registry edit popup. */}
        <Popup
          open={apptDiscardOpen}
          onClose={() => setApptDiscardOpen(false)}
          title='ทิ้งการแก้ไขนัดหมาย?'
          subtitle='ข้อมูลนัดหมายที่แก้ไขค้างไว้จะไม่ถูกบันทึก และนัดหมายเดิมจะยังคงอยู่ตามเดิม'
          tertiaryAction={{ label: 'แก้ไขต่อ', onClick: () => setApptDiscardOpen(false) }}
          primaryAction={{ label: 'ทิ้งการแก้ไข', onClick: confirmDiscardAppointmentEdit, tone: 'danger' }}
        />

        <PatientCard
          sticky
          patient={cardPatient}
          title='บันทึกการตรวจรักษาโรคเฉพาะ (NCD)'
          drugAllergies={patient.drugAllergies}
          chronicDiseases={patient.chronicDiseases}
          actions={
            <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
              {groupBadges}
              <BrandSubdueButton variant='outline' leadingIcon='print' onClick={() => window.print()}>
                พิมพ์สรุปการตรวจ
              </BrandSubdueButton>
              {canEdit && !saveState.cancelled && (
                <NeutralSubdueButton leadingIcon='block' onClick={() => { setCancelReason(''); setCancelError(''); setCancelOpen(true); }}>
                  ยกเลิกการบันทึก
                </NeutralSubdueButton>
              )}
            </div>
          }
        />

        {/* Context banners — rights / read-only / registry-cancelled /
            visit-cancelled / telemedicine. Non-blocking by design (manual
            ch.2: rights re-check happens before CPOE, not before triage). */}
        <div className='flex flex-col' style={{
          gap: 'var(--dim-space-200)',
          paddingTop: 'var(--dim-space-300)',
          paddingLeft: 'var(--dim-space-600)',
          paddingRight: 'var(--dim-space-600)',
        }}>
          {queueRow?.rightsExpired && (
            <Banner tone='warning' icon='shield_question'>
              สิทธิการรักษาหมดอายุ / ชำระเอง — แนะนำตรวจสอบสิทธิอีกครั้งก่อนสั่งยาและส่งตรวจ (ขั้นตอนที่ 4)
            </Banner>
          )}
          {!canEdit && (
            <Banner tone='warning' icon='visibility'>
              สิทธิ์ของคุณดูได้อย่างเดียว — แบบฟอร์มถูกปิดการแก้ไข และปุ่มบันทึก/ยืนยัน/ยกเลิกถูกซ่อน
            </Banner>
          )}
          {registryCancellation && (
            <Banner tone='danger' icon='block'>
              ผู้รับบริการถูกยกเลิกทะเบียนโรคเฉพาะแล้ว ({registryCancellation.reason}) —
              เปิดใช้งานได้อีกครั้งที่หน้าทะเบียน
            </Banner>
          )}
          {saveState.cancelled && (
            <Banner tone='danger' icon='block'>
              การบันทึกครั้งนี้ถูกยกเลิก · ผู้ยกเลิก {saveState.cancelled.by || NCD_CURRENT_USER.name}
              {saveState.cancelled.at ? ` · ${formatAuditTime(new Date(saveState.cancelled.at))}` : ''}
              {saveState.cancelled.reason ? ` · เหตุผล: ${saveState.cancelled.reason}` : ''}
            </Banner>
          )}
          {queueRow?.telemedicine && (
            <Banner
              tone='info'
              icon='videocam'
              action={
                telemedStatus === 'started' ? (
                  <NeutralSubdueButton size='sm' leadingIcon='call_end' onClick={() => setTelemedStatus('completed')}>
                    ออกจากการปรึกษา
                  </NeutralSubdueButton>
                ) : telemedStatus === 'completed' ? (
                  <ColorfulBadge style='green' size='small' hierarchy='secondary'>ปรึกษาเสร็จสิ้นแล้ว</ColorfulBadge>
                ) : (
                  <BrandSubdueButton variant='fill' size='sm' leadingIcon='videocam' onClick={() => setTelemedStatus('started')}>
                    เข้าร่วมการปรึกษา
                  </BrandSubdueButton>
                )
              }
            >
              วิสิตนี้เป็นการปรึกษาผ่าน Telemedicine — เข้าร่วม/ออกจากการปรึกษาได้โดยไม่กระทบข้อมูลในแบบฟอร์ม
            </Banner>
          )}
        </div>

        <TreatmentFormShell
          morphTitle='NCD'
          stepIndex={stepIndex}
          onStepChange={setStepIndex}
          completedSteps={completedSteps}
          steps={NCD_STEPS}
          queuePath='/clinic/ncd'
          step0FlushLeft
        >
          <ActiveStep {...stepProps} />
        </TreatmentFormShell>
        <Footer />
      </div>
    </div>
    </ClinicFilterProvider>
  );
};

export default NcdFormPage;
