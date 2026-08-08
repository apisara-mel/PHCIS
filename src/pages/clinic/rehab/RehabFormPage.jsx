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
import UnsavedChangesPopup from '@/components/popup/UnsavedChangesPopup';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import TreatmentFormShell from '@/templates/TreatmentFormShell';
import {
  RehabStep1History, RehabStep2Examination, RehabStep3Adl,
  RehabStep4Diagnosis, RehabStep5Program, RehabStep6Attachments,
  RehabStep7Appointment, validateRehabAppointment, describeActivities,
} from '@/pages/clinic/rehab/RehabSteps';
import { findMrPatientByHn, DEFAULT_MR_PATIENT } from '@/data/mrPatients';
import { getPatientByHN, DEFAULT_PATIENT } from '@/data/patientProfiles';
/* IMPORT-ONLY cross-module hand-off: the /appointment system owns these —
   this page never edits appointment-module files, it only appends/updates its
   own row through the public store (playbook §4). */
import { addExtraAppointments, updateExtraAppointment } from '@/pages/appointment/appointmentExtraStore';
import { APPT_STATUS_CONFIRMED, APPT_STATUS_CANCELLED } from '@/pages/appointment/appointmentShared';
import {
  DEFAULT_REHAB_VISIT,
  getRehabCompletedSteps,
  getRehabPatientByHn,
  getRehabRegistrationByHn,
  getRehabCancellation,
  getRehabScreening,
  getRehabVisitStatus,
  setRehabVisitStatus,
  saveRehabVisitRecord,
  getRehabAppointment,
  saveRehabAppointment,
  cancelRehabAppointment,
  isRehabSlotBooked,
  rehabSlotRange,
  resolveRehabCause,
  resolveImcPhase,
  imcGoldenPeriod,
  canEditRehab,
  scoreBarthel,
  barthelDependency,
  REHAB_CURRENT_USER,
  REHAB_VISIT_CANCEL_SUGGESTIONS,
  REHAB_APPOINTMENT_CANCEL_SUGGESTIONS,
  formatRehabDate,
} from '@/data/rehabVisits';

/* RehabFormPage — บันทึกกิจกรรมการฟื้นฟูและกายภาพบำบัด
   (TOR 1.10.10.1/.3/.4/.5/.7) at /clinic/rehab/record.

   Mirrors AncFormPage / NcdFormPage: one form-state object across the 7 steps
   in RehabSteps.jsx via the shared TreatmentFormShell, seeded from queue nav
   state. The record supports the full TOR quartet:

     • แสดง   — the form itself (+ read-only mode when สิทธิ์ผู้ใช้ไม่พอ)
     • บันทึก — ร่าง (คิวกลับไป "ที่ร่างไว้") + ยืนยัน (ตรวจ Barthel ครบ +
                วินิจฉัย + ICD-10 + นัดหมาย, ประทับผู้บันทึก + เวลา,
                ต่อท้ายกราฟติดตาม)
     • แก้ไข   — เปิดบันทึกที่ยืนยันแล้วกลับมาแก้ (recordId เดิม → ไม่เกิด
                วิสิตซ้ำในกราฟ)
     • ยกเลิก  — popup บังคับกรอกเหตุผล; การยกเลิก + เหตุผล + ผู้ยกเลิก
                อยู่ใน sessionStorage เป็น audit trail ของวิสิตนั้น

   Telemedicine (TOR 1.10.10.7): วิสิตที่เป็นการปรึกษาทางไกลจะมีแบนเนอร์
   เข้าร่วม/ออกจากการปรึกษาแบบ inline (ANC/NCD pattern) — ฟอร์มยังแก้ไขได้
   ตลอดการปรึกษา และการออกจากสายไม่ล้างข้อมูลที่ร่างไว้. */

const breadcrumb = ['ระบบบันทึกการรักษา', 'งานเวชศาสตร์ฟื้นฟูและกายภาพบำบัด'];

const REHAB_STEPS = [
  { title: 'ประวัติและซักประวัติ', subtitle: 'History & Screening' },
  { title: 'ตรวจร่างกาย',          subtitle: 'Physical Examination' },
  { title: 'ประเมิน ADLs',         subtitle: 'Barthel ADL Index' },
  { title: 'วินิจฉัยและเป้าหมาย',   subtitle: 'Diagnosis & Goal' },
  { title: 'โปรแกรม + หัตถการ',    subtitle: 'Program & Procedure' },
  { title: 'เอกสารแนบ',            subtitle: 'Attachments' },
  { title: 'นัดหมายต่อเนื่อง',      subtitle: 'Appointment' },
];

const formatAuditTime = (d) => new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(d);

const formatApptLabel = (a) => `${formatRehabDate(a?.date)}${a?.time ? ` · ${a.time} น.` : ''}`;

/* แปลงค่า input เป็นตัวเลข — ช่องว่าง/ค่าที่ไม่ใช่ตัวเลขคืน null แต่ 0 จริง
   ต้องรอดเป็น 0 (ห้ามใช้ `|| null` เพราะจะกลืน 0 เป็น null). */
const toFiniteNumber = (v) => {
  if (v == null || String(v).trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/* องศา ROM ของแถว — เลือกข้างที่กรอกค่าไว้ (ขวาก่อน แล้วค่อยซ้าย);
   แถว seed มาเป็น `{ right: '', left: '' }` จึงห้ามใช้ `??` ที่มองว่า '' มีค่า. */
const romDegree = (row) => {
  if (!row) return null;
  const right = toFiniteNumber(row.right);
  return right != null ? right : toFiniteNumber(row.left);
};

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

const RehabFormPage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();
  const canEdit = canEditRehab();

  /* MR-shape identity for the step bodies (drugAllergies / rights / …). */
  const patient = useMemo(() => {
    const p = (navState && findMrPatientByHn(navState.hn)) || DEFAULT_MR_PATIENT;
    return { ...p, queue: navState?.queue, name: navState?.name || `${p.firstNameTh} ${p.lastNameTh}` };
  }, [navState]);

  /* PatientCard-shape identity (HN ชื่อ-สกุล เพศ อายุ บัตรประชาชน สิทธิ —
     TOR 1.10.10.1). Display only — every record keys off `rehabHn` (the HN the
     queue navigated with), never cardPatient.hn (DEFAULT_PATIENT fallback
     would silently attach one patient's data to another). */
  const cardPatient = useMemo(
    () => (navState?.hn && getPatientByHN(navState.hn)) || DEFAULT_PATIENT,
    [navState?.hn],
  );
  const rehabHn = navState?.hn || cardPatient?.hn;

  const queueRow = useMemo(() => getRehabPatientByHn(rehabHn), [rehabHn]);
  const registration = useMemo(() => getRehabRegistrationByHn(rehabHn), [rehabHn]);
  const registryCancellation = useMemo(() => getRehabCancellation(rehabHn), [rehabHn]);
  const screening = useMemo(() => getRehabScreening(rehabHn), [rehabHn]);
  const cause = resolveRehabCause(registration?.cause || queueRow?.cause);
  const golden = registration?.serviceType === 'imc' ? imcGoldenPeriod(registration?.onsetDate) : null;

  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState(() => ({
    ...DEFAULT_REHAB_VISIT,
    icd10: registration?.icd10 || '',
    courseNo: registration?.courseNo || '',
    assessDate: new Date().toISOString().slice(0, 10),
    dischargeStatus: registration?.dischargeStatus || 'ongoing',
  }));

  const [saveState, setSaveState] = useState(() => {
    const status = getRehabVisitStatus(rehabHn);
    return status?.statusKey === 'cancelled' ? { cancelled: status } : {};
  });
  const [confirmError, setConfirmError] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [leaveOpen, setLeaveOpen] = useState(false);

  /* One stable record id per open form — ยืนยันซ้ำ (หรือ ยืนยัน → แก้ไข →
     ยืนยัน) UPDATES the same follow-up row instead of appending a duplicate. */
  const [recordId] = useState(() => `V-REHAB-${rehabHn || 'unknown'}-${Date.now()}`);

  /* ── นัดหมาย (TOR 1.10.10.5) — saved booking + edit/cancel state ── */
  const [savedAppt, setSavedAppt] = useState(() => getRehabAppointment(rehabHn));
  const [apptEditing, setApptEditing] = useState(false);
  const [apptSnapshot, setApptSnapshot] = useState(null);
  const [apptSaveError, setApptSaveError] = useState('');
  const [apptCancelOpen, setApptCancelOpen] = useState(false);
  const [apptCancelReason, setApptCancelReason] = useState('');
  const [apptCancelError, setApptCancelError] = useState('');
  const [apptDiscardOpen, setApptDiscardOpen] = useState(false);

  /* Telemedicine join state — flipping in/out keeps `form` untouched. */
  const [telemedStatus, setTelemedStatus] = useState('none');

  const completedSteps = useMemo(
    () => getRehabCompletedSteps(form, stepIndex),
    [form, stepIndex],
  );

  /* ฟอร์มถูกแตะแล้วหรือยัง — ใช้กับ UnsavedChangesPopup ตอนกด "ยกเลิก" ที่
     ขั้นตอนแรก (TreatmentFormShell onLeave). เปรียบเทียบกับค่าเริ่มต้นที่
     seed มาจากทะเบียน ไม่ใช่ DEFAULT_REHAB_VISIT ดิบ ๆ. */
  const pristine = useMemo(() => ({
    ...DEFAULT_REHAB_VISIT,
    icd10: registration?.icd10 || '',
    courseNo: registration?.courseNo || '',
    assessDate: form.assessDate,
    dischargeStatus: registration?.dischargeStatus || 'ongoing',
  }), [registration, form.assessDate]);
  const isDirty = JSON.stringify(form) !== JSON.stringify(pristine);

  const visitNo = queueRow?.visitNo ?? null;
  const courseTotal = registration?.courseTotal ?? null;
  const remainingSessions = courseTotal != null && visitNo != null
    ? Math.max(0, courseTotal - visitNo)
    : null;

  const barthel = scoreBarthel(form.barthel);
  const dependency = barthelDependency(barthel.complete ? barthel.total : null);

  const apptTherapist = form.appointment.therapist
    || registration?.owner
    || queueRow?.therapist
    || '';

  const handleSaveDraft = () => {
    setRehabVisitStatus(rehabHn, 'draft');
    setSaveState((s) => ({ ...s, draftAt: formatAuditTime(new Date()), by: REHAB_CURRENT_USER.name }));
    setConfirmError('');
  };

  /* บันทึกนัดหมาย — เขียนทั้งสองฝั่งของการส่งต่อ:
       • rehabVisits sessionStorage — ให้ Step 7 แสดง/แก้ไข/ยกเลิกได้ และ
         แท็บ "นัดแล้วยังไม่มาติดต่อ" ของคิวหยิบไปแสดง
       • appointmentExtraStore — public store ของระบบ /appointment เพื่อให้
         นัดจากคลินิกไปโผล่บนปฏิทินรวม (id ขึ้นต้น A-REHAB จึงชนกับ inbox
         'A-<n>' ไม่ได้)
     คืน error string หรือ '' เมื่อสำเร็จ. */
  const persistAppointment = () => {
    if (!canEdit) return '';
    if (form.appointment.skipped || !form.appointment.date) return '';
    /* Re-validate the slot AT SAVE TIME — a slot free while typing can be
       taken before ยืนยัน. */
    if (form.appointment.time && isRehabSlotBooked(form.appointment.date, form.appointment.time, rehabHn)) {
      return 'ช่วงเวลานี้เพิ่งถูกจอง — เลือกเวลาอื่น';
    }
    const record = saveRehabAppointment(rehabHn, {
      date: form.appointment.date,
      time: form.appointment.time,
      mode: form.appointment.mode || 'onsite',
      note: form.appointment.note || '',
      therapist: apptTherapist,
      patient: cardPatient?.fullName || patient.name,
      cause: registration?.cause || queueRow?.cause || '',
      serviceType: registration?.serviceType || queueRow?.serviceType || 'general',
      courseNo: form.courseNo || registration?.courseNo || '',
      visitNo: visitNo != null ? visitNo + 1 : null,
    });
    if (!record) return 'บันทึกนัดหมายไม่สำเร็จ — ลองอีกครั้ง';

    const row = {
      id: record.id,
      staffId: null,
      date: record.date,
      time: record.time,
      slotRange: rehabSlotRange(record.time),
      status: APPT_STATUS_CONFIRMED,
      patient: record.patient,
      patientAvatar: cardPatient?.avatarUrl,
      hn: rehabHn,
      rights: cardPatient?.insurance,
      clinic: 'เวชศาสตร์ฟื้นฟู',
      dept: 'กายภาพบำบัด',
      type: 'ฟื้นฟูสมรรถภาพ',
      doctor: apptTherapist,
      examMode: record.mode === 'telemedicine' ? 'telemedicine' : 'onsite',
      orderingUnit: 'คลินิกเวชศาสตร์ฟื้นฟูและกายภาพบำบัด',
      reason: form.diagnosisNote,
      prep: record.note,
      createdBy: REHAB_CURRENT_USER.name,
      /* Re-booking after a ยกเลิก clears the old cancel audit on the mirror
         row too — updateExtraAppointment merges, so stale fields would
         otherwise survive onto an active appointment. */
      cancelReason: null,
      cancelledBy: null,
      cancelledAt: null,
    };
    if (!updateExtraAppointment(record.id, row)) addExtraAppointments([row]);
    setSavedAppt(record);
    return '';
  };

  const handleConfirm = () => {
    /* Confirm gate — วินิจฉัย + ICD-10 (ขั้นตอนที่ 4) และ Barthel ต้องครบ
       (ขั้นตอนที่ 3) ก่อน แล้วจึงตรวจกฎนัดหมาย. */
    if (!form.diagnosisNote.trim() || !form.icd10) {
      setConfirmError('ยืนยันไม่ได้ — ต้องระบุคำวินิจฉัยและรหัส ICD-10 ในขั้นตอนที่ 4 ก่อน');
      return;
    }
    if (!barthel.complete) {
      setConfirmError(`ยืนยันไม่ได้ — แบบประเมิน ADLs (Barthel) ยังให้คะแนนไม่ครบ (${barthel.answered}/10 หัวข้อ) ในขั้นตอนที่ 3`);
      return;
    }
    const apptError = validateRehabAppointment(form.appointment, rehabHn, remainingSessions);
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
    const romKneeRow = form.romRows.find((r) => r.joint === 'Knee' && r.motion === 'Flexion');
    /* กราฟติดตามคือ "องศาการยกไหล่" — นับเฉพาะ motion ที่เป็นการยกแขน
       (Flexion ก่อน, Abduction สำรอง) ไม่ใช่ Shoulder แถวไหนก็ได้. */
    const romShoulderRow = form.romRows.find((r) => r.joint === 'Shoulder' && r.motion === 'Flexion')
      || form.romRows.find((r) => r.joint === 'Shoulder' && r.motion === 'Abduction');
    const gradeNumbers = form.muscleRows
      .map((r) => Number(r.grade))
      .filter((n) => Number.isFinite(n));

    saveRehabVisitRecord(rehabHn, {
      recordId,
      date: now.toISOString().slice(0, 10),
      visitNo: visitNo ?? null,
      /* วิสิตนี้เป็น Telemedicine ก็ต่อเมื่อทำ telemed จริงในวิสิตนี้ —
         form.appointment.mode เป็นของ "นัดครั้งหน้า" ห้ามเอามาติดป้ายวิสิตนี้. */
      type: telemedStatus !== 'none' ? 'Telemedicine' : 'ฟื้นฟูตามนัด',
      bp: form.vitals.bp || null,
      pulse: toFiniteNumber(form.vitals.hr),
      barthel: barthel.complete ? barthel.total : null,
      romKnee: romDegree(romKneeRow),
      romShoulder: romDegree(romShoulderRow),
      muscleGrade: gradeNumbers.length ? Math.min(...gradeNumbers) : null,
      exam: form.examNote || '—',
      /* Lab / X-ray ในหน้าติดตามเป็น mock ระดับโมดูล — บันทึกจาก CPOE ของ
         วิสิตนี้เท่านั้น ไม่ดึงข้ามโมดูล lab/xray (playbook §4). */
      lab: form.labs.length > 0 ? `สั่งตรวจ Lab ${form.labs.length} รายการ` : null,
      xray: form.xrayOrders.length > 0 ? `สั่งตรวจ X-ray ${form.xrayOrders.length} รายการ` : null,
      note: [form.courseSummary, form.programNote].filter(Boolean).join(' · ') || form.diagnosisNote,
      therapist: registration?.owner || queueRow?.therapist || REHAB_CURRENT_USER.name,
      program: describeActivities(form.programActivities),
      procedures: form.procedureRows
        .filter((r) => !r.cancelled)
        .map((r) => ({ id: r.id, name: r.name, performer: r.performer, time: r.time, note: r.note })),
      goals: form.goals.map((g) => ({ id: g.id, text: g.text, achieved: g.achieved })),
      dischargeStatus: form.dischargeStatus,
      courseNo: form.courseNo || registration?.courseNo || '',
      attachments: form.attachments.map((a) => ({
        id: a.id, name: a.name, type: a.type, sizeLabel: a.sizeLabel, addedAt: a.addedAt,
      })),
      recordedBy: REHAB_CURRENT_USER.name,
      recordedAt: now.toISOString(),
    });
    setRehabVisitStatus(rehabHn, 'done');
    setSaveState((s) => ({ ...s, confirmedAt: formatAuditTime(now), by: REHAB_CURRENT_USER.name }));
  };

  /* แก้ไขบันทึกที่ยืนยันแล้ว — reopen as a draft; the next ยืนยัน updates the
     SAME follow-up row via `recordId`. */
  const handleReopenRecord = () => {
    setRehabVisitStatus(rehabHn, 'draft');
    setSaveState((s) => ({
      ...s,
      confirmedAt: undefined,
      reopenedAt: formatAuditTime(new Date()),
      by: REHAB_CURRENT_USER.name,
    }));
    setConfirmError('');
  };

  const confirmCancelVisit = () => {
    if (!cancelReason.trim()) {
      setCancelError('ต้องระบุเหตุผลการยกเลิกก่อนยืนยัน');
      return;
    }
    setRehabVisitStatus(rehabHn, 'cancelled', { reason: cancelReason.trim() });
    setCancelOpen(false);
    setSaveState((s) => ({
      ...s,
      cancelled: { by: REHAB_CURRENT_USER.name, at: new Date().toISOString(), reason: cancelReason.trim() },
    }));
  };

  /* ── นัดหมาย: แก้ไข / ยกเลิก / นัดใหม่ ─────────────────────────── */

  const startEditAppointment = () => {
    setApptSnapshot(form.appointment);
    setApptSaveError('');
    setApptEditing(true);
  };

  const saveAppointmentEdit = () => {
    if (form.appointment.skipped || !form.appointment.date) {
      setApptSaveError('ต้องระบุวันนัดหมาย — หากต้องการยุติการนัด ให้ใช้ปุ่ม “ยกเลิกนัดหมาย”');
      return;
    }
    const err = validateRehabAppointment(form.appointment, rehabHn, remainingSessions) || persistAppointment();
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

  /* ปิด/ยกเลิกการแก้ไข ต้องไม่แตะนัดที่บันทึกไว้ — คืน snapshot และไม่เขียน
     ลง appointmentExtraStore. */
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
    const record = cancelRehabAppointment(rehabHn, apptCancelReason.trim());
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

  /* ยกเลิกที่ขั้นตอนแรกของ shell — เตือนก่อนทิ้งข้อมูลที่ยังไม่บันทึก. */
  const handleLeave = () => {
    if (isDirty && !saveState.confirmedAt) {
      setLeaveOpen(true);
      return;
    }
    history.push('/clinic/rehab');
  };

  const stepProps = {
    form,
    setForm,
    patient,
    readOnly: !canEdit,
    rightsExpired: !!queueRow?.rightsExpired,
    rehabHn,
    registration,
    screening,
    visitNo,
    therapistDefault: registration?.owner || queueRow?.therapist || '',
    saveState,
    confirmError,
    onSaveDraft: handleSaveDraft,
    onConfirm: handleConfirm,
    onReopenRecord: handleReopenRecord,
    savedAppointment: savedAppt,
    apptEditing,
    apptSaveError,
    registryCancelled: !!registryCancellation,
    onEditAppointment: startEditAppointment,
    onSaveAppointmentEdit: saveAppointmentEdit,
    onDiscardAppointmentEdit: requestDiscardAppointmentEdit,
    onCancelAppointment: () => { setApptCancelReason(''); setApptCancelError(''); setApptCancelOpen(true); },
    onRebookAppointment: rebookAppointment,
    onPrintAppointmentSlip: () => window.print(),
    onPrintCourseSummary: () => window.print(),
  };

  const STEP_RENDERERS = [
    RehabStep1History, RehabStep2Examination, RehabStep3Adl,
    RehabStep4Diagnosis, RehabStep5Program, RehabStep6Attachments,
    RehabStep7Appointment,
  ];
  const ActiveStep = STEP_RENDERERS[stepIndex];

  return (
    <ClinicFilterProvider>
      <div className='flex w-full min-h-screen' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
        <Sidebar activeKey='treat' />
        <div className='flex-1 min-w-0 flex flex-col'>
          <Header breadcrumb={breadcrumb} standalone={false} />
          <SubHeader title='บันทึกกิจกรรมการฟื้นฟูและกายภาพบำบัด' hideBottomBorder />

          {/* ยกเลิกการบันทึก — reason required, audit kept */}
          <Popup
            open={cancelOpen}
            onClose={() => setCancelOpen(false)}
            title='ยกเลิกการบันทึกการฟื้นฟู'
            subtitle={`${cardPatient?.fullName || patient.name} · HN: ${rehabHn}`}
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
                suggestions={REHAB_VISIT_CANCEL_SUGGESTIONS}
                minChars={2}
                placeholder='เช่น ผู้รับบริการขอยุติการฟื้นฟูกลางคัน / บันทึกผิดคน'
              />
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                บันทึกจะถูกทำเครื่องหมาย “ยกเลิก” พร้อมชื่อผู้ยกเลิกและเวลา — ไม่ถูกลบออกจากประวัติ
              </span>
              {cancelError && (
                <span
                  className='inline-flex items-center'
                  style={{ gap: 'var(--dim-space-100)', color: 'var(--text-danger-default, #C72121)', fontSize: 'var(--type-size-sm)' }}
                >
                  <Icon name='error' size={14} />
                  {cancelError}
                </span>
              )}
            </div>
          </Popup>

          {/* ยกเลิกนัดหมาย — same contract: reason required, row kept visible */}
          <Popup
            open={apptCancelOpen}
            onClose={() => setApptCancelOpen(false)}
            title='ยกเลิกนัดหมายฟื้นฟู'
            subtitle={savedAppt ? `${formatApptLabel(savedAppt)} · HN: ${rehabHn}` : ''}
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
                suggestions={REHAB_APPOINTMENT_CANCEL_SUGGESTIONS}
                minChars={2}
                placeholder='เช่น ผู้รับบริการขอเลื่อนนัด / ครบจำนวนครั้งใน Course แล้ว'
              />
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                นัดหมายจะถูกทำเครื่องหมาย “ยกเลิก” ทั้งในคลินิกฟื้นฟูและในระบบนัดหมาย — ไม่ถูกลบออกจากประวัติ
              </span>
              {apptCancelError && (
                <span
                  className='inline-flex items-center'
                  style={{ gap: 'var(--dim-space-100)', color: 'var(--text-danger-default, #C72121)', fontSize: 'var(--type-size-sm)' }}
                >
                  <Icon name='error' size={14} />
                  {apptCancelError}
                </span>
              )}
            </div>
          </Popup>

          {/* ทิ้งการแก้ไขนัดหมาย — dirty-check discard */}
          <Popup
            open={apptDiscardOpen}
            onClose={() => setApptDiscardOpen(false)}
            title='ทิ้งการแก้ไขนัดหมาย?'
            subtitle='ข้อมูลนัดหมายที่แก้ไขค้างไว้จะไม่ถูกบันทึก และนัดหมายเดิมจะยังคงอยู่ตามเดิม'
            tertiaryAction={{ label: 'แก้ไขต่อ', onClick: () => setApptDiscardOpen(false) }}
            primaryAction={{ label: 'ทิ้งการแก้ไข', onClick: confirmDiscardAppointmentEdit, tone: 'danger' }}
          />

          {/* ออกจากหน้าโดยยังไม่บันทึก */}
          <UnsavedChangesPopup
            open={leaveOpen}
            onClose={() => setLeaveOpen(false)}
            onSave={() => { handleSaveDraft(); setLeaveOpen(false); history.push('/clinic/rehab'); }}
            onDiscard={() => { setLeaveOpen(false); history.push('/clinic/rehab'); }}
          />

          <PatientCard
            sticky
            patient={cardPatient}
            title='บันทึกกิจกรรมการฟื้นฟูและกายภาพบำบัด'
            drugAllergies={patient.drugAllergies}
            chronicDiseases={patient.chronicDiseases}
            actions={(
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                {cause && (
                  <ColorfulBadge style={cause.badge} size='small' hierarchy='secondary'>{cause.short}</ColorfulBadge>
                )}
                {registration?.serviceType === 'imc' && (
                  <ColorfulBadge style='blue' size='small' hierarchy='secondary'>
                    {`IMC · ${resolveImcPhase(registration.imcPhase)?.label?.split(' — ')[0] || 'ระยะฟื้นฟู'}`}
                  </ColorfulBadge>
                )}
                {visitNo != null && (
                  <ColorfulBadge style='teal' size='small' hierarchy='secondary'>
                    {`ครั้งที่ ${visitNo}${courseTotal ? ` / ${courseTotal}` : ''}`}
                  </ColorfulBadge>
                )}
                {barthel.complete && (
                  <ColorfulBadge style={dependency.badge} size='small' hierarchy='secondary'>
                    {`Barthel ${barthel.total}`}
                  </ColorfulBadge>
                )}
                <BrandSubdueButton variant='outline' leadingIcon='print' onClick={() => window.print()}>
                  พิมพ์สรุปการฟื้นฟู
                </BrandSubdueButton>
                <NeutralSubdueButton leadingIcon='monitoring' onClick={() => history.push({ pathname: '/clinic/rehab/followup', state: { hn: rehabHn } })}>
                  ดูการติดตาม
                </NeutralSubdueButton>
                {canEdit && !saveState.cancelled && (
                  <NeutralSubdueButton leadingIcon='block' onClick={() => { setCancelReason(''); setCancelError(''); setCancelOpen(true); }}>
                    ยกเลิกการบันทึก
                  </NeutralSubdueButton>
                )}
              </div>
            )}
          />

          {/* Context banners — สิทธิ / read-only / ทะเบียนถูกยกเลิก /
              วิสิตถูกยกเลิก / IMC golden period / telemedicine */}
          <div
            className='flex flex-col'
            style={{
              gap: 'var(--dim-space-200)',
              paddingTop: 'var(--dim-space-300)',
              paddingLeft: 'var(--dim-space-600)',
              paddingRight: 'var(--dim-space-600)',
            }}
          >
            {queueRow?.rightsExpired && (
              <Banner tone='warning' icon='shield_question'>
                สิทธิการรักษาหมดอายุ / ชำระเอง — ตรวจสอบสิทธิอีกครั้งก่อนสั่งยาและส่งตรวจ (ขั้นตอนที่ 5)
              </Banner>
            )}
            {!canEdit && (
              <Banner tone='warning' icon='visibility'>
                สิทธิ์ของคุณดูได้อย่างเดียว — แบบฟอร์มถูกปิดการแก้ไข และปุ่มบันทึก/ยืนยัน/ยกเลิกถูกซ่อน
              </Banner>
            )}
            {!registration && (
              <Banner tone='warning' icon='contract'>
                ผู้รับบริการรายนี้ยังไม่อยู่ในทะเบียนฟื้นฟู — บันทึกได้ แต่ควรขึ้นทะเบียนที่หน้าทะเบียนฟื้นฟู/IMC
                เพื่อให้ Course และการติดตามเชื่อมกันครบ
              </Banner>
            )}
            {registryCancellation && (
              <Banner tone='danger' icon='block'>
                ผู้รับบริการถูกยกเลิกทะเบียนฟื้นฟูแล้ว ({registryCancellation.reason}) —
                เปิดใช้งานได้อีกครั้งที่หน้าทะเบียน
              </Banner>
            )}
            {golden && (
              <Banner tone={golden.expired ? 'danger' : golden.daysLeft <= 30 ? 'warning' : 'info'} icon='timer'>
                {golden.expired
                  ? `พ้นกรอบเวลา Intermediate Care 6 เดือนแล้ว (ครบเมื่อ ${formatRehabDate(golden.deadlineIso)}) — สิทธิ IMC อาจเบิกไม่ได้ ตรวจสอบก่อนสั่งการรักษา`
                  : `อยู่ในกรอบ Intermediate Care — เหลือ ${golden.daysLeft} วัน (ครบ ${formatRehabDate(golden.deadlineIso)})`}
              </Banner>
            )}
            {saveState.cancelled && (
              <Banner tone='danger' icon='block'>
                การบันทึกครั้งนี้ถูกยกเลิก · ผู้ยกเลิก {saveState.cancelled.by || REHAB_CURRENT_USER.name}
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
                วิสิตนี้เป็นการฟื้นฟูผ่าน Telemedicine — บันทึกแบบประเมินและหัตถการได้ตามปกติระหว่างการปรึกษา
                และการวางสายไม่ลบข้อมูลที่ร่างไว้
              </Banner>
            )}
          </div>

          <TreatmentFormShell
            morphTitle='เวชศาสตร์ฟื้นฟู'
            stepIndex={stepIndex}
            onStepChange={setStepIndex}
            completedSteps={completedSteps}
            steps={REHAB_STEPS}
            queuePath='/clinic/rehab'
            step0FlushLeft={false}
            onLeave={handleLeave}
            fromDepartment='คลินิกเวชศาสตร์ฟื้นฟูและกายภาพบำบัด'
          >
            <ActiveStep {...stepProps} />
          </TreatmentFormShell>
          <Footer />
        </div>
      </div>
    </ClinicFilterProvider>
  );
};

export default RehabFormPage;
