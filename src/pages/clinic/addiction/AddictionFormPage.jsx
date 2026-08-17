import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header, { SubHeader } from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PatientCard from '@/components/card/PatientCard';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Popup from '@/components/popup/Popup';
import UnsavedChangesPopup from '@/components/popup/UnsavedChangesPopup';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import TreatmentFormShell from '@/templates/TreatmentFormShell';
import {
  AddictionStep1History,
  AddictionStep2Assessment,
  AddictionStep3Examination,
  AddictionStep4Activity,
  AddictionStep5Orders,
  AddictionStep6Documents,
  AddictionStep7Appointment,
} from '@/pages/clinic/addiction/AddictionSteps';
import { findMrPatientByHn, DEFAULT_MR_PATIENT } from '@/data/mrPatients';
import { getPatientByHN, DEFAULT_PATIENT } from '@/data/patientProfiles';
import {
  buildAddictionVisitForm,
  getAddictionCompletedSteps,
  getAssessmentValidationError,
  hasProgramAssessmentData,
  saveAddictionDraft,
  clearAddictionDraft,
  markAddictionVisitCompleted,
  getAddictionVisitCompletion,
  logAddictionVisitEdit,
  getAddictionVisitEditLog,
  isRightsExpired,
  resolveProgram,
} from '@/data/addictionVisits';
import { AddictionAccessGate, NoticeBand } from '@/pages/clinic/addiction/addictionShared';

/* AddictionFormPage — บันทึกบำบัดผู้ติดสารเสพติด (TOR 1.10.5.1/.3/.4/.5/.7).
   Mirrors AncFormPage: one form-state object across the 7 steps of the
   shared TreatmentFormShell; sticky PatientCard header with allergies +
   program badge (1.10.5.1); draft auto-save resumes at the last step;
   completed visits reopen read-only with an audited แก้ไข action. */

const breadcrumb = ['ระบบบันทึกการรักษา', 'งานบำบัดสารเสพติด'];

const ADDICTION_STEPS = [
  { title: 'ซักประวัติ/แรกรับ', subtitle: 'Intake History' },
  /* ไม่ใช่ "คัดกรอง" — จุดคัดกรองมีที่เดียวที่ `/opd/screening` step นี้เก็บเฉพาะ
     แบบประเมินของงานยาเสพติด (ASSIST · AUDIT · นิโคติน · ความพร้อมเลิกบุหรี่)
     ส่วนผลคัดกรองแสดงอ่านอย่างเดียวที่ step 1 */
  { title: 'แบบประเมิน', subtitle: 'Assessment' },
  { title: 'ตรวจร่างกาย', subtitle: 'Physical Examination' },
  { title: 'กิจกรรมบำบัด', subtitle: 'Therapy Activity' },
  { title: 'สั่งการรักษา', subtitle: 'Treatment Order' },
  { title: 'เอกสารระหว่างการรักษา', subtitle: 'Documents' },
  { title: 'นัดหมาย', subtitle: 'Appointment' },
];

const AddictionFormPage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();

  const mrPatient = useMemo(() => {
    const p = (navState && findMrPatientByHn(navState.hn)) || DEFAULT_MR_PATIENT;
    return { ...p, queue: navState?.queue, name: navState?.name || `${p.firstNameTh} ${p.lastNameTh}` };
  }, [navState]);

  const cardPatient = useMemo(
    () => (navState?.hn && getPatientByHN(navState.hn)) || DEFAULT_PATIENT,
    [navState?.hn],
  );

  /* HN the queue navigated with keys every record — display falls back to
     DEFAULT_PATIENT for HNs missing from patientProfiles, but data must
     never be filed under the fallback HN (same reasoning as AncFormPage). */
  const hn = navState?.hn || cardPatient?.hn;

  const seed = useMemo(() => buildAddictionVisitForm(hn), [hn]);

  const [stepIndex, setStepIndexRaw] = useState(seed.stepIndex);
  const [form, setFormRaw] = useState(() => seed.form);
  const [dirty, setDirty] = useState(false);
  const [blockedMsg, setBlockedMsg] = useState('');
  const [programSwitchTarget, setProgramSwitchTarget] = useState(null);
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  /* Completed visit → read-only until an audited แก้ไข session starts. */
  const completion = useMemo(() => getAddictionVisitCompletion(hn), [hn]);
  const [editSession, setEditSession] = useState(null);
  const readOnly = !!completion && !editSession;
  const [tick, setTick] = useState(0);

  const setForm = (updater) => {
    setDirty(true);
    setFormRaw(updater);
  };

  /* Draft auto-save (TreatmentFormShell's "บันทึกร่าง" is not wired to a
     callback, so the page persists on every change instead) — resuming
     reopens at the last step via buildAddictionVisitForm. Completed
     visits skip drafting so read-only stays clean. */
  const formRef = useRef(form);
  formRef.current = form;
  useEffect(() => {
    if (!dirty || readOnly) return;
    saveAddictionDraft(hn, formRef.current, stepIndex);
  }, [form, stepIndex, dirty, readOnly, hn]);

  /* Step advance out of คัดกรอง/แบบประเมิน is gated on the required scores
     (edge case: unanswered แบบประเมิน blocks the next step). */
  const setStepIndex = (next) => {
    if (next > 1 && stepIndex === 1) {
      const err = getAssessmentValidationError(formRef.current);
      if (err) {
        setBlockedMsg(err);
        return;
      }
    }
    setBlockedMsg('');
    setStepIndexRaw(next);
  };

  /* Program switch after assessments exist — warn that program-specific
     answers are kept but hidden (edge case from the spec). */
  const handleProgramChange = (nextProgram) => {
    if (nextProgram === form.program) return;
    if (hasProgramAssessmentData(formRef.current)) {
      setProgramSwitchTarget(nextProgram);
      return;
    }
    setForm((f) => ({ ...f, program: nextProgram }));
  };
  const confirmProgramSwitch = () => {
    setForm((f) => ({ ...f, program: programSwitchTarget }));
    setProgramSwitchTarget(null);
  };

  const handleBack = () => {
    if (dirty && !readOnly) {
      setUnsavedOpen(true);
      return;
    }
    history.push('/clinic/addiction');
  };

  const startEditSession = () => {
    const entry = logAddictionVisitEdit(hn);
    setEditSession(entry);
  };

  const finishVisit = () => {
    markAddictionVisitCompleted(hn);
    clearAddictionDraft(hn);
    history.push('/clinic/addiction');
  };

  const completedSteps = useMemo(
    () => getAddictionCompletedSteps(form, stepIndex),
    [form, stepIndex],
  );

  const program = resolveProgram(form.program);
  const rightsExpired = isRightsExpired(hn);
  const editLog = useMemo(() => getAddictionVisitEditLog(hn), [hn, editSession, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const STEP_RENDERERS = [
    AddictionStep1History,
    AddictionStep2Assessment,
    AddictionStep3Examination,
    AddictionStep4Activity,
    AddictionStep5Orders,
    AddictionStep6Documents,
    AddictionStep7Appointment,
  ];
  const ActiveStep = STEP_RENDERERS[stepIndex];

  return (
    <ClinicFilterProvider>
    <div className='flex w-full min-h-screen' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
      <Sidebar activeKey='treat' />
      <div className='flex-1 min-w-0 flex flex-col'>
        <Header breadcrumb={breadcrumb} standalone={false} />
        <SubHeader
          title={`บันทึกบำบัดสารเสพติด — ครั้งที่ ${seed.sessionNo}`}
          hideBottomBorder
        />

        <UnsavedChangesPopup
          open={unsavedOpen}
          onClose={() => setUnsavedOpen(false)}
          onSave={() => {
            saveAddictionDraft(hn, formRef.current, stepIndex);
            setUnsavedOpen(false);
            history.push('/clinic/addiction');
          }}
          onDiscard={() => {
            clearAddictionDraft(hn);
            setUnsavedOpen(false);
            history.push('/clinic/addiction');
          }}
        />

        <Popup
          open={!!programSwitchTarget}
          onClose={() => setProgramSwitchTarget(null)}
          title='เปลี่ยนโปรแกรมบำบัด'
          subtitle={programSwitchTarget ? `เปลี่ยนเป็น ${resolveProgram(programSwitchTarget)?.label}` : ''}
          tertiaryAction={{ label: 'ยกเลิก', onClick: () => setProgramSwitchTarget(null) }}
          primaryAction={{ label: 'ยืนยันเปลี่ยนโปรแกรม', onClick: confirmProgramSwitch }}
        >
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
            มีคำตอบแบบประเมินเฉพาะโปรแกรม (แบบประเมิน 1-3 / AUDIT / สยส.) บันทึกไว้แล้ว —
            ระบบจะเก็บคำตอบเดิมไว้แต่ซ่อนจากหน้าจอจนกว่าจะสลับกลับมาโปรแกรมเดิม
          </span>
        </Popup>

        <AddictionAccessGate>
        <PatientCard
          sticky
          showBack={false}
          patient={cardPatient}
          title={`บันทึกบำบัดสารเสพติด — ครั้งที่ ${seed.sessionNo}`}
          drugAllergies={mrPatient.drugAllergies}
          chronicDiseases={mrPatient.chronicDiseases}
          tags={
            <div className='flex items-center gap-2 flex-wrap'>
              {program && (
                <ColorfulBadge style={program.badge} size='small' hierarchy='secondary'>
                  โปรแกรม: {program.label}
                </ColorfulBadge>
              )}
              {rightsExpired && (
                <ColorfulBadge style='red' size='small' hierarchy='secondary'>สิทธิการรักษาหมดอายุ</ColorfulBadge>
              )}
              {completion && (
                <ColorfulBadge style='teal' size='small' hierarchy='secondary'>
                  บันทึกเสร็จสิ้นเมื่อ {completion.at}
                </ColorfulBadge>
              )}
            </div>
          }
          actions={
            readOnly ? (
              <BrandSubdueButton variant='fill' leadingIcon='edit' onClick={startEditSession}>
                แก้ไขบันทึก (บันทึกผู้แก้ไข)
              </BrandSubdueButton>
            ) : (
              <BrandSubdueButton variant='fill' leadingIcon='task_alt' onClick={finishVisit}>
                จบการบันทึกการบำบัด
              </BrandSubdueButton>
            )
          }
        />

        {seed.fromDraft && (
          <div style={{ paddingTop: 'var(--dim-space-300)', paddingLeft: 'var(--dim-space-600)', paddingRight: 'var(--dim-space-600)' }}>
            <NoticeBand tone='info' icon='history'>
              เปิดจากแบบร่างที่บันทึกไว้เมื่อ {seed.draftSavedAt} — ทำต่อจากขั้นตอนล่าสุดได้ทันที
            </NoticeBand>
          </div>
        )}
        {readOnly && (
          <div style={{ paddingTop: 'var(--dim-space-300)', paddingLeft: 'var(--dim-space-600)', paddingRight: 'var(--dim-space-600)' }}>
            <NoticeBand tone='info' icon='lock'>
              การบันทึกครั้งนี้เสร็จสิ้นแล้ว — เปิดแบบอ่านอย่างเดียว กด "แก้ไขบันทึก" เพื่อแก้ไข
              (ระบบจะบันทึกผู้แก้ไขและเวลาเป็น audit trail)
            </NoticeBand>
          </div>
        )}
        {editSession && (
          <div style={{ paddingTop: 'var(--dim-space-300)', paddingLeft: 'var(--dim-space-600)', paddingRight: 'var(--dim-space-600)' }}>
            <NoticeBand tone='warning' icon='edit'>
              กำลังแก้ไขบันทึกหลังเสร็จสิ้น — ผู้แก้ไข {editSession.by} · {editSession.at}
              {editLog.length > 1 ? ` (แก้ไขแล้ว ${editLog.length} ครั้ง)` : ''}
            </NoticeBand>
          </div>
        )}

        <TreatmentFormShell
          morphTitle='บำบัดยาเสพติด'
          stepIndex={stepIndex}
          onStepChange={setStepIndex}
          completedSteps={completedSteps}
          steps={ADDICTION_STEPS}
          queuePath='/clinic/addiction'
          step0FlushLeft={false}
          onLeave={handleBack}
            onSaveDraft={() => {
            if (!readOnly) saveAddictionDraft(hn, formRef.current, stepIndex);
          }}
        >
          <ActiveStep
            form={form}
            setForm={setForm}
            hn={hn}
            sessionNo={seed.sessionNo}
            readOnly={readOnly}
            blockedMsg={stepIndex === 1 ? blockedMsg : ''}
            onProgramChange={handleProgramChange}
            onDataChanged={() => setTick((t) => t + 1)}
          />
        </TreatmentFormShell>
        </AddictionAccessGate>
        <Footer />
      </div>
    </div>
    </ClinicFilterProvider>
  );
};

export default AddictionFormPage;
