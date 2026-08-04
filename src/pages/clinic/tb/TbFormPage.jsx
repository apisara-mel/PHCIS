import React, { useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PatientCard from '@/components/card/PatientCard';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Popup from '@/components/popup/Popup';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import TreatmentFormShell from '@/templates/TreatmentFormShell';
import { Banner, ErrorNote } from '@/pages/clinic/tb/tbShared';
import {
  TbStep1History, TbStep2Examination, TbStep3Diagnosis,
  TbStep4Orders, TbStep5Attachments, TbStep6Appointment,
  validateTbAppointment,
} from '@/pages/clinic/tb/TbSteps';
import { findMrPatientByHn, DEFAULT_MR_PATIENT } from '@/data/mrPatients';
import { getPatientByHN, DEFAULT_PATIENT } from '@/data/patientProfiles';
import { getTbQueueRowByHn } from '@/data/tbQueue';
import {
  DEFAULT_TB_VISIT,
  getTbCompletedSteps,
  getTbVisitStatus,
  setTbVisitStatus,
  canEditTb,
  TB_CURRENT_USER,
  TB_CANCEL_REASON_SUGGESTIONS,
} from '@/data/tbVisits';
import {
  getActiveTbRegistrationByHn,
  getTbRegistryRows,
  registerTbPatient,
  setTbCurrentRegimen,
  resolveTbRegimen,
} from '@/data/tbRegistry';
import { getDotConfig, setDotConfig, getDotLog, setDotDay } from '@/data/tbDotLog';

/* TbFormPage — บันทึกการตรวจรักษาคลินิกวัณโรค (TOR §1.10.4.1/.3/.4/.5/.6/.7)
   ที่ /clinic/tb/record. Shell บาง ๆ แบบ NcdFormPage/AncFormPage: PatientCard
   sticky + แถบบริบท (สิทธิหมดอายุ / read-only / ทะเบียนถูกยกเลิก / visit ถูก
   ยกเลิก / Telemedicine) + TreatmentFormShell 6 ขั้นตอนที่ getTbCompletedSteps()
   ล็อกไว้แล้ว.

   คำกริยา TOR ครบทั้งสี่:
     • แสดง   — ตัวฟอร์มเอง (+ inert เมื่อ canEditTb() === false)
     • บันทึก — บันทึกร่าง / ยืนยัน (validate วินิจฉัย · แพ้ยา override · นัดหมาย)
                + ขึ้นทะเบียนวัณโรคจากขั้นที่ 3 + บันทึก DOT รายวันจากขั้นที่ 4
     • แก้ไข — เปิดบันทึกเดิมกลับมาแก้บน form ก้อนเดียวกัน; DOT ย้อนหลังบังคับเหตุผล
     • ยกเลิก — popup บังคับเหตุผล เก็บผู้ยกเลิก+เวลาไว้ใน sessionStorage

   ทุก mutation ของ tbRegistry / tbDotLog เขียนลง module state จึงต้อง bump
   `tick` หลังทุกครั้ง ไม่งั้นหน้าจอไม่อัปเดต (playbook — สัญญาเดียวกับ
   AncQueuePage / NcdRegistryPage). */

const breadcrumb = ['ระบบบันทึกการรักษา', 'คลินิกวัณโรค', 'บันทึกการตรวจรักษา'];

const TB_STEPS = [
  { title: 'ผลการซักประวัติ', subtitle: 'History & Symptoms' },
  { title: 'ตรวจร่างกาย', subtitle: 'Physical Examination' },
  { title: 'วินิจฉัย + ขึ้นทะเบียน', subtitle: 'Diagnosis & Registration' },
  { title: 'สั่งการรักษา + DOT', subtitle: 'Orders & DOT' },
  { title: 'เอกสารแนบ', subtitle: 'Attachments' },
  { title: 'นัดหมาย + สรุป', subtitle: 'Appointment & Summary' },
];

const formatAuditTime = (d) => new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(d);

const TbFormPage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();
  const canEdit = canEditTb();

  /* Store ของ tbRegistry / tbDotLog เป็น module state — ทุก mutation ต้อง bump. */
  const [tick, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);

  /* MR-shape identity สำหรับ step bodies (drugAllergies / rights / …). */
  const patient = useMemo(() => {
    const p = (navState && findMrPatientByHn(navState.hn)) || DEFAULT_MR_PATIENT;
    return { ...p, queue: navState?.queue, name: navState?.name || `${p.firstNameTh} ${p.lastNameTh}` };
  }, [navState]);

  /* PatientCard-shape identity — deep-link ตรง ๆ ไม่มี state ก็ไม่ crash. */
  const cardPatient = useMemo(
    () => (navState?.hn && getPatientByHN(navState.hn)) || DEFAULT_PATIENT,
    [navState?.hn],
  );
  const tbHn = navState?.hn || cardPatient?.hn;

  const queueRow = useMemo(() => getTbQueueRowByHn(tbHn), [tbHn]);
  const registration = useMemo(
    () => getActiveTbRegistrationByHn(tbHn),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tbHn, tick],
  );
  /* ทะเบียนที่ "ถูกยกเลิก" ไม่ใช่ active จึงต้องค้นแยกเพื่อขึ้น banner
     (getActiveTbRegistrationByHn กรอง cancelled ออกไปแล้วโดยตั้งใจ). */
  const cancelledRegistration = useMemo(
    () => getTbRegistryRows().find((r) => r.hn === tbHn && r.cancelled) || null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tbHn, tick],
  );

  /* แพ้ยา / โรคประจำตัว — คิววัณโรคเก็บเป็น string ส่วน MR profile เก็บเป็น
     { name, severity }. PatientCard และแผง CPOE (MedicationCdssPanel /
     ConsultComposerPanel) อ่าน `a.name` ทั้งคู่ จึง normalise เป็น object
     ก้อนเดียวตั้งแต่ต้นทาง แล้วค่อยดึงชื่อออกมาเทียบกับสูตรยา. */
  const drugAllergies = useMemo(
    () => (queueRow?.drugAllergies?.length
      ? queueRow.drugAllergies.map((a) => ({ name: a, severity: 'critical' }))
      : (patient.drugAllergies || [])),
    [queueRow, patient],
  );
  const chronicDiseases = useMemo(
    () => (queueRow?.chronicDiseases?.length
      ? queueRow.chronicDiseases.map((c) => ({ name: c, severity: 'medium' }))
      : (patient.chronicDiseases || [])),
    [queueRow, patient],
  );
  const allergyNames = useMemo(
    () => drugAllergies.map((a) => (typeof a === 'string' ? a : a?.name || '')),
    [drugAllergies],
  );
  const stepPatient = useMemo(
    () => ({ ...patient, drugAllergies, chronicDiseases }),
    [patient, drugAllergies, chronicDiseases],
  );

  const dotConfig = useMemo(
    () => (registration ? getDotConfig(registration.id) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [registration, tick],
  );
  /* สำเนาตื้นโดยตั้งใจ: getDotLog คืน object เดิมที่ถูก mutate in place
     ทุกครั้ง ถ้าไม่ copy identity จะไม่เปลี่ยน แล้ว useMemo ของ
     DotCalendarLog / computeDotAdherence จะไม่คำนวณใหม่หลังบันทึก DOT
     (อาการ "บันทึกแล้วหน้าจอไม่เปลี่ยน"). */
  const dotLog = useMemo(
    () => (registration ? { ...getDotLog(registration.id) } : {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [registration, tick],
  );

  const [stepIndex, setStepIndex] = useState(0);
  /* DEFAULT_TB_VISIT ถูก spread ตรง ๆ — ชื่อ field ทุกตัวต้องตรงกับที่
     getTbCompletedSteps() อ่าน ไม่งั้น stepper ไม่ติ๊กและไม่มี error.
     ฟิลด์ท้ายก้อนเป็น contract เสริมของ <Step5Orders> (CPOE panels อ่านแบบ
     optional chaining อยู่แล้ว แต่ seed ไว้ให้ครบเพื่อความชัดเจน). */
  const [form, setForm] = useState(() => ({
    ...DEFAULT_TB_VISIT,
    symptoms: {},
    medications: [],
    labs: [],
    xrayOrders: [],
    procedureOrders: [],
    consultOrders: [],
    attachments: [],
    appointment: { ...DEFAULT_TB_VISIT.appointment },
    regimen: registration?.regimen || '',
    regimenWeightKg: registration?.weightKg ? String(registration.weightKg) : '',
    diseaseSite: registration?.diseaseSite || '',
    epSite: registration?.epSite || '',
    doctor: queueRow?.doctor || '',
    adviceNote: '',
    /* Step5Orders / CPOE panel extras */
    visitId: `tb-visit-${tbHn}`,
    vitals: {},
    diagnoses: [],
    medRecDispositions: {},
    medRecPending: 0,
    labRequest: {},
    nursingActivities: {},
    nursingOther: '',
    cdssDismissed: {},
    radiologistDecisions: {},
    xrayAcknowledged: {},
    sameDayPrescriptions: [],
  }));

  const [saveState, setSaveState] = useState(() => {
    const status = getTbVisitStatus(tbHn);
    return status?.statusKey === 'cancelled'
      ? { cancelled: { by: status.by, at: formatAuditTime(new Date(status.at)), reason: status.reason } }
      : {};
  });
  const [confirmError, setConfirmError] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [duplicateExisting, setDuplicateExisting] = useState(null);
  const [telemedStatus, setTelemedStatus] = useState('none');

  const completedSteps = useMemo(() => getTbCompletedSteps(form), [form]);

  /* ── ขั้นที่ 3 — ขึ้นทะเบียน ─────────────────────────────────────── */

  const handleRegister = (payload) => {
    if (!payload.diseaseSite) {
      setRegisterError('ต้องเลือกชนิดวัณโรค (ปอด / นอกปอด) ก่อนขึ้นทะเบียน');
      return;
    }
    if (payload.diseaseSite === 'extrapulmonary' && !payload.epSite) {
      setRegisterError('เลือกชนิด "นอกปอด" แล้วต้องระบุตำแหน่งวัณโรคนอกปอดด้วย');
      return;
    }
    const result = registerTbPatient({ ...payload, by: TB_CURRENT_USER.name });
    if (!result.ok) {
      setRegisterError(result.error);
      setDuplicateExisting(result.existing || null);
      return;
    }
    setRegisterError('');
    setDuplicateExisting(null);
    bump();
  };

  /* ── ขั้นที่ 4 — DOT ─────────────────────────────────────────────── */

  const handleSaveDotConfig = (cfg) => {
    if (!registration) return;
    setDotConfig(registration.id, cfg, TB_CURRENT_USER.name);
    bump();
  };

  const handleSaveDotDay = (key, draft) => {
    if (!registration) return { ok: false, error: 'ยังไม่ได้ขึ้นทะเบียน — บันทึก DOT ไม่ได้' };
    const result = setDotDay(registration.id, key, draft, TB_CURRENT_USER.name);
    if (result.ok) bump();
    return result;
  };

  /* ── บันทึกร่าง / ยืนยัน / ยกเลิก ─────────────────────────────────── */

  /* เงื่อนไขที่บล็อกการยืนยัน (แสดงเป็น banner บนขั้นที่ 6 ด้วย). */
  const regimenObj = resolveTbRegimen(form.regimen);
  const conflictDrugs = regimenObj
    ? regimenObj.drugs.filter((d) => allergyNames.some((a) => a.toLowerCase().includes(String(d).toLowerCase())))
    : [];
  const blockingIssue = conflictDrugs.length > 0 && !form.allergyOverrideNote.trim()
    ? `สูตรยาที่เลือกมี ${conflictDrugs.join(', ')} ตรงกับประวัติแพ้ยา — ต้องระบุเหตุผลการยืนยันใช้ยาในขั้นตอนที่ 4 ก่อน`
    : '';

  const handleSaveDraft = () => {
    setTbVisitStatus(tbHn, 'draft');
    setSaveState((s) => ({ ...s, draftAt: formatAuditTime(new Date()), by: TB_CURRENT_USER.name }));
    setConfirmError('');
  };

  const handleConfirm = () => {
    if (!form.diagnosisStatus || !form.diseaseSite) {
      setConfirmError('ยืนยันไม่ได้ — ต้องระบุชนิดวัณโรคและผลการวินิจฉัยในขั้นตอนที่ 3 ก่อน');
      return;
    }
    if (blockingIssue) { setConfirmError(blockingIssue); return; }
    if (!form.doctor || !form.finalStatus) {
      setConfirmError('ยืนยันไม่ได้ — ต้องเลือกแพทย์ผู้ตรวจและสถานะสรุปการรักษา');
      return;
    }
    const apptError = validateTbAppointment(form.appointment);
    if (apptError) { setConfirmError(apptError); return; }
    if (form.appointment?.skipped && !String(form.appointment.note || '').trim()) {
      setConfirmError('เลือก "ไม่นัดครั้งถัดไป" แล้วต้องระบุเหตุผลด้วย');
      return;
    }
    setConfirmError('');
    /* สูตรยา + น้ำหนักปัจจุบันถูก sync กลับทะเบียน (setTbCurrentRegimen ยัง
       ตั้ง treatmentStartDate ให้อัตโนมัติถ้ายังไม่เคยเริ่มยา). */
    if (registration && form.regimen) {
      setTbCurrentRegimen(registration.id, form.regimen, form.regimenWeightKg, TB_CURRENT_USER.name);
      bump();
    }
    setTbVisitStatus(tbHn, 'done');
    setSaveState((s) => ({ ...s, confirmedAt: formatAuditTime(new Date()), by: TB_CURRENT_USER.name }));
  };

  const confirmCancelVisit = () => {
    if (!cancelReason.trim()) {
      setCancelError('ต้องระบุเหตุผลการยกเลิกก่อนยืนยัน');
      return;
    }
    setTbVisitStatus(tbHn, 'cancelled', { reason: cancelReason.trim() });
    setCancelOpen(false);
    setSaveState((s) => ({
      ...s,
      cancelled: { by: TB_CURRENT_USER.name, at: formatAuditTime(new Date()), reason: cancelReason.trim() },
    }));
  };

  /* กดกลับหน้าคิวขณะยังไม่บันทึกร่าง → เตือนก่อน (spec cancel-edit edge). */
  const hasUnsaved = completedSteps.length > 0 && !saveState.draftAt && !saveState.confirmedAt && !saveState.cancelled;
  const requestLeave = () => {
    if (hasUnsaved) setLeaveOpen(true);
    else history.push('/clinic/tb');
  };

  const readOnly = !canEdit || !!saveState.cancelled;

  const STEP_RENDERERS = [
    TbStep1History, TbStep2Examination, TbStep3Diagnosis,
    TbStep4Orders, TbStep5Attachments, TbStep6Appointment,
  ];
  const ActiveStep = STEP_RENDERERS[stepIndex];

  const stepProps = {
    form,
    setForm,
    patient: stepPatient,
    cardPatient,
    hn: tbHn,
    readOnly,
    registration,
    dotConfig,
    dotLog,
    onRegister: handleRegister,
    registerError,
    onClearRegisterError: () => { setRegisterError(''); setDuplicateExisting(null); },
    duplicateExisting,
    onSaveDotConfig: handleSaveDotConfig,
    onSaveDotDay: handleSaveDotDay,
    onGoToRegistration: () => setStepIndex(2),
    saveState,
    confirmError,
    blockingIssue,
    onSaveDraft: handleSaveDraft,
    onConfirm: handleConfirm,
  };

  return (
    <ClinicFilterProvider>
      <div className='flex w-full min-h-screen' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
        <Sidebar activeKey='treat' />
        <div className='flex-1 min-w-0 flex flex-col'>
          <Header breadcrumb={breadcrumb} />

          {/* ยกเลิกการบันทึก — บังคับเหตุผล, เก็บ audit */}
          <Popup
            open={cancelOpen}
            onClose={() => setCancelOpen(false)}
            title='ยกเลิกการบันทึกการตรวจรักษา'
            subtitle={`${cardPatient?.fullName || patient.name} · HN: ${tbHn}`}
            tertiaryAction={{ label: 'ปิด', onClick: () => setCancelOpen(false) }}
            primaryAction={{ label: 'ยืนยันยกเลิกการบันทึก', onClick: confirmCancelVisit, tone: 'danger' }}
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
                placeholder='เช่น ผู้รับบริการขอยุติการตรวจ / บันทึกผิดคน'
              />
              {cancelError && <ErrorNote>{cancelError}</ErrorNote>}
            </div>
          </Popup>

          {/* ออกจากฟอร์มทั้งที่ยังไม่บันทึกร่าง */}
          <Popup
            open={leaveOpen}
            onClose={() => setLeaveOpen(false)}
            title='ออกจากแบบบันทึกโดยยังไม่บันทึกร่าง?'
            subtitle='ข้อมูลที่กรอกไว้ในแบบฟอร์มนี้จะหายไป'
            tertiaryAction={{ label: 'กรอกต่อ', onClick: () => setLeaveOpen(false) }}
            secondaryAction={{ label: 'บันทึกร่างแล้วออก', onClick: () => { handleSaveDraft(); setLeaveOpen(false); history.push('/clinic/tb'); } }}
            primaryAction={{ label: 'ออกโดยไม่บันทึก', onClick: () => { setLeaveOpen(false); history.push('/clinic/tb'); }, tone: 'danger' }}
          />

          <PatientCard
            sticky
            patient={cardPatient}
            title='บันทึกการตรวจรักษาคลินิกวัณโรค'
            onBack={requestLeave}
            drugAllergies={drugAllergies}
            chronicDiseases={chronicDiseases}
            actions={(
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                {registration && (
                  <ColorfulBadge style='teal' size='small' hierarchy='secondary'>
                    ทะเบียน {registration.regNo} · เดือนที่ {registration.treatmentMonth ?? 0}
                  </ColorfulBadge>
                )}
                <ColorfulBadge style='red' size='small' hierarchy='secondary'>ข้อมูลลับ §1.4.2</ColorfulBadge>
                <BrandSubdueButton variant='outline' leadingIcon='print' onClick={() => window.print()}>
                  พิมพ์สรุปการตรวจ
                </BrandSubdueButton>
                {canEdit && !saveState.cancelled && (
                  <NeutralSubdueButton leadingIcon='block' onClick={() => { setCancelReason(''); setCancelError(''); setCancelOpen(true); }}>
                    ยกเลิกการบันทึก
                  </NeutralSubdueButton>
                )}
              </div>
            )}
          />

          {/* แถบบริบท — สิทธิ / read-only / ทะเบียน / visit / Telemedicine */}
          <div
            className='flex flex-col'
            style={{
              gap: 'var(--dim-space-200, 8px)',
              paddingTop: 'var(--dim-space-300, 12px)',
              paddingLeft: 'var(--dim-space-600, 24px)',
              paddingRight: 'var(--dim-space-600, 24px)',
            }}
          >
            {queueRow?.rightsExpired && (
              <Banner tone='warning' icon='shield_question'>
                สิทธิการรักษาหมดอายุ / ชำระเอง — ตรวจสอบสิทธิอีกครั้งก่อนสั่งยาและส่งตรวจ (ขั้นตอนที่ 4)
              </Banner>
            )}
            {!canEdit && (
              <Banner tone='warning' icon='visibility'>
                สิทธิ์ของคุณดูได้อย่างเดียว — แบบฟอร์มถูกปิดการแก้ไข และปุ่มบันทึก/ยืนยัน/ยกเลิก/ขึ้นทะเบียน/บันทึก DOT ถูกซ่อน
              </Banner>
            )}
            {cancelledRegistration && (
              <Banner tone='danger' icon='block'>
                ทะเบียนวัณโรค {cancelledRegistration.regNo} ถูกยกเลิกแล้ว
                ({cancelledRegistration.cancelled.reason} · โดย {cancelledRegistration.cancelled.by}
                {' · '}{cancelledRegistration.cancelled.at}) — จัดการได้ที่หน้าทะเบียนวัณโรค
              </Banner>
            )}
            {saveState.cancelled && (
              <Banner tone='danger' icon='block'>
                การบันทึกครั้งนี้ถูกยกเลิก · ผู้ยกเลิก {saveState.cancelled.by} · {saveState.cancelled.at}
                {saveState.cancelled.reason ? ` · เหตุผล: ${saveState.cancelled.reason}` : ''}
              </Banner>
            )}
            {(queueRow?.telemedicine || form.votEnabled) && (
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
                การตรวจ/กำกับการกินยาครั้งนี้ทำผ่าน Telemedicine (VOT) — เข้าร่วม/ออกจากการปรึกษาได้โดยไม่กระทบข้อมูลในแบบฟอร์ม
              </Banner>
            )}
            {queueRow?.suspectNote && !registration && (
              <Banner tone='info' icon='info'>
                {queueRow.suspectNote}
              </Banner>
            )}
          </div>

          <TreatmentFormShell
            stepIndex={stepIndex}
            onStepChange={setStepIndex}
            completedSteps={completedSteps}
            steps={TB_STEPS}
            queuePath='/clinic/tb'
            step0FlushLeft={false}
          >
            <ActiveStep {...stepProps} />
          </TreatmentFormShell>
          <Footer />
        </div>
      </div>
    </ClinicFilterProvider>
  );
};

export default TbFormPage;
