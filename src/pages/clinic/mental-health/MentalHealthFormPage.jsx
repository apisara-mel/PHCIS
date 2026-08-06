import React, { useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header, { SubHeader } from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PatientCard from '@/components/card/PatientCard';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Popup from '@/components/popup/Popup';
import Icon from '@/components/icons/Icon';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import TreatmentFormShell from '@/templates/TreatmentFormShell';
import {
  MhStep1History, MhStep2Assessment, MhStep3Physical, MhStep4Diagnosis,
  MhStep5Orders, MhStep6Appointment, MhStep7Summary,
} from '@/pages/clinic/mental-health/MentalHealthSteps';
import { findMrPatientByHn, DEFAULT_MR_PATIENT } from '@/data/mrPatients';
import { getPatientByHN, DEFAULT_PATIENT } from '@/data/patientProfiles';
import {
  DEFAULT_MH_VISIT,
  getMhIntakeByHn,
  getMhRegistrationByHn,
  getMhQueueRows,
  getMhDraft,
  saveMhDraft,
  clearMhDraft,
  saveMhVisitRecord,
  getMhVisitRecords,
  getMhCompletedSteps,
  hasMentalHealthRights,
  setMentalHealthRights,
  formatMhDateTime,
} from '@/data/mentalHealthClinic';

/* MentalHealthFormPage — บันทึกสุขภาพจิต (TOR 1.10.3.1/.3/.4/.5/.7).
   Thin shell over TreatmentFormShell, same scaffold as AncFormPage: one
   form-state object across the 7 MH steps (MentalHealthSteps.jsx), keyed
   by the HN the queue navigated with ({hn, queue, name, statusKey}).

   All 4 verbs of 1.10.3.7 live here:
     แสดง   — a done visit opens read-only (locked steps + view banner)
     บันทึก — step 7 "ยืนยันบันทึกการตรวจสุขภาพจิต" commits the visit
     แก้ไข  — "แก้ไขบันทึก" on the view banner reopens the steps prefilled
     ยกเลิก — "ยกเลิกการบันทึก" (and back-with-unsaved-changes) confirms
              before discarding the draft (playbook §5 unsaved warning)
   ที่ร่างไว้ resumes at the step the draft was left on (getMhDraft). */

const breadcrumb = ['ระบบบันทึกการรักษา', 'งานสุขภาพจิต', 'บันทึกสุขภาพจิต'];
const QUEUE_PATH = '/clinic/mental-health';

const MH_STEPS = [
  { title: 'ประวัติการรักษา', subtitle: 'Medical History' },
  { title: 'คัดกรองและแบบประเมิน', subtitle: 'Screening & Assessment' },
  { title: 'ตรวจร่างกาย', subtitle: 'Physical Examination' },
  { title: 'วินิจฉัย', subtitle: 'Diagnosis' },
  { title: 'สั่งการรักษา', subtitle: 'Treatment Order' },
  { title: 'นัดหมาย', subtitle: 'Appointment' },
  { title: 'สรุปและพิมพ์เอกสาร', subtitle: 'Summary & Print' },
];

const STEP_RENDERERS = [
  MhStep1History, MhStep2Assessment, MhStep3Physical, MhStep4Diagnosis,
  MhStep5Orders, MhStep6Appointment, MhStep7Summary,
];

const cloneDefaultVisit = () => JSON.parse(JSON.stringify(DEFAULT_MH_VISIT));

const MentalHealthFormPage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();

  const cardPatient = useMemo(
    () => (navState?.hn && getPatientByHN(navState.hn)) || DEFAULT_PATIENT,
    [navState?.hn],
  );

  /* Records are keyed by the HN the queue navigated with — NOT
     cardPatient.hn (getPatientByHN falls back to DEFAULT_PATIENT for HNs
     missing from patientProfiles, which would cross-file visits under
     HN 67-00001). Same guard as AncFormPage. */
  const mhHn = navState?.hn || cardPatient?.hn;

  const mrPatient = useMemo(() => {
    const p = (navState?.hn && findMrPatientByHn(navState.hn)) || DEFAULT_MR_PATIENT;
    return { ...p, queue: navState?.queue, name: navState?.name || `${p.firstNameTh} ${p.lastNameTh}` };
  }, [navState]);

  const queueRow = useMemo(
    () => getMhQueueRows().find((r) => r.hn === mhHn) || null,
    [mhHn],
  );

  const intake = useMemo(() => getMhIntakeByHn(mhHn), [mhHn]);
  const registration = useMemo(() => getMhRegistrationByHn(mhHn), [mhHn]);

  /* ── mode: resume draft > view saved visit > new record ─────────── */
  const initial = useMemo(() => {
    const draft = getMhDraft(mhHn);
    if (draft) {
      return { mode: 'draft', form: { ...cloneDefaultVisit(), ...draft.form }, stepIndex: draft.stepIndex ?? 0, draftSavedAt: draft.savedAt };
    }
    const visits = getMhVisitRecords(mhHn);
    const last = visits[visits.length - 1];
    if (last && (navState?.statusKey === 'done' || queueRow?.statusKey === 'done')) {
      return { mode: 'view', form: { ...cloneDefaultVisit(), ...last }, stepIndex: 0, lastVisit: last };
    }
    /* Seeded draft rows (mock ที่ร่างไว้ tab) carry the step they were
       left on even before any sessionStorage draft exists. */
    if (queueRow?.statusKey === 'draft') {
      return { mode: 'draft', form: cloneDefaultVisit(), stepIndex: queueRow.draftStep ?? 0 };
    }
    return { mode: 'new', form: cloneDefaultVisit(), stepIndex: 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mhHn]);

  const [mode, setMode] = useState(initial.mode); /* 'new' | 'draft' | 'view' | 'edit' */
  const [stepIndex, setStepIndex] = useState(initial.stepIndex);
  const [form, setFormState] = useState(initial.form);
  const [saved, setSaved] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [resumeBanner, setResumeBanner] = useState(initial.mode === 'draft');
  /* Re-render hook for the §1.4.2 rights demo toggle (sessionStorage). */
  const [, setRightsTick] = useState(0);

  const seedJson = useRef(JSON.stringify(initial.form));
  const locked = mode === 'view' || saved;
  const dirty = !saved && JSON.stringify(form) !== seedJson.current;

  /* Auto-persist the draft on every change (ที่ร่างไว้ tab resumes it at
     this step) — never while viewing a committed record. */
  const setForm = (updater) => {
    setFormState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (!locked) saveMhDraft(mhHn, next, stepIndex);
      return next;
    });
  };

  const handleStepChange = (idx) => {
    setStepIndex(idx);
    if (!locked && dirty) saveMhDraft(mhHn, form, idx);
  };

  const confirmSave = () => {
    saveMhVisitRecord(mhHn, form);
    clearMhDraft(mhHn);
    seedJson.current = JSON.stringify(form);
    setSaved(true);
  };

  const handleBack = () => {
    if (dirty && !locked) {
      setLeaveOpen(true);
      return;
    }
    history.push(QUEUE_PATH);
  };

  const leaveKeepDraft = () => {
    saveMhDraft(mhHn, form, stepIndex);
    setLeaveOpen(false);
    history.push(QUEUE_PATH);
  };

  const leaveDiscard = () => {
    clearMhDraft(mhHn);
    setLeaveOpen(false);
    history.push(QUEUE_PATH);
  };

  const startEdit = () => {
    setMode('edit');
    setSaved(false);
    setResumeBanner(false);
  };

  const toggleRightsDemo = () => {
    setMentalHealthRights(!hasMentalHealthRights());
    setRightsTick((t) => t + 1);
  };

  const ActiveStep = STEP_RENDERERS[stepIndex];
  const completedSteps = useMemo(
    () => getMhCompletedSteps(form, stepIndex),
    [form, stepIndex],
  );

  const canRead = hasMentalHealthRights();

  const bannerBase = {
    gap: 'var(--dim-space-300, 12px)',
    marginLeft: 'var(--dim-space-600, 24px)',
    marginRight: 'var(--dim-space-600, 24px)',
    marginTop: 'var(--dim-space-400, 16px)',
    paddingTop: 'var(--dim-space-300, 12px)',
    paddingBottom: 'var(--dim-space-300, 12px)',
    paddingLeft: 'var(--dim-space-400, 16px)',
    paddingRight: 'var(--dim-space-400, 16px)',
    borderRadius: 'var(--dim-radius-200, 8px)',
    fontSize: 'var(--type-size-sm)',
  };

  return (
    <ClinicFilterProvider>
    <div className='flex w-full min-h-screen' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
      <Sidebar activeKey='treat' />
      <div className='flex-1 min-w-0 flex flex-col'>
        <Header breadcrumb={breadcrumb} standalone={false} />
        <SubHeader title='บันทึกสุขภาพจิต — คลินิกสุขภาพจิต' hideBottomBorder />

        {/* Unsaved-changes confirm — ยกเลิก/ออกจากบันทึก (1.10.3.7 ยกเลิก) */}
        <Popup
          open={leaveOpen}
          onClose={() => setLeaveOpen(false)}
          title='ยังไม่ได้บันทึกการตรวจ'
          subtitle={`${mrPatient.name} · HN: ${mhHn}${navState?.queue ? ` · คิว ${navState.queue}` : ''}`}
          tertiaryAction={{ label: 'ละทิ้งร่างและออก', onClick: leaveDiscard }}
          primaryAction={{ label: 'บันทึกร่างและออก', onClick: leaveKeepDraft }}
        >
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
            มีข้อมูลที่ยังไม่ได้บันทึกในแบบบันทึกสุขภาพจิต — บันทึกเป็นร่างไว้ทำต่อ
            (แสดงในแท็บ "ที่ร่างไว้" ของหน้าคิว) หรือละทิ้งการเปลี่ยนแปลงทั้งหมด
          </span>
        </Popup>

        <PatientCard
          sticky
          patient={cardPatient}
          title='บันทึกสุขภาพจิต — คลินิกสุขภาพจิต'
          drugAllergies={intake.drugAllergies}
          chronicDiseases={intake.chronicDiseases}
          actions={(
            <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              {/* ข้อมูลลับ §1.4.2 — mental-health records are confidential. */}
              <ColorfulBadge style='red' size='small' hierarchy='secondary'>ข้อมูลลับ §1.4.2</ColorfulBadge>
              {registration ? (
                <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{registration.mhNumber}</ColorfulBadge>
              ) : (
                <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ยังไม่มีทะเบียนสุขภาพจิต</ColorfulBadge>
              )}
              {/* Demo toggle for the สิทธิไม่พอ masked state (mock-only). */}
              <NeutralSubdueButton
                size='sm'
                leadingIcon={canRead ? 'lock_open' : 'lock'}
                onClick={toggleRightsDemo}
                title='สลับสิทธิการเข้าถึงข้อมูลลับ (สำหรับทดสอบ)'
              >
                {canRead ? 'สิทธิ: เข้าถึงได้' : 'สิทธิ: ถูกจำกัด'}
              </NeutralSubdueButton>
              {!locked && (
                <NeutralSubdueButton size='sm' leadingIcon='block' onClick={() => { if (dirty) setLeaveOpen(true); else history.push(QUEUE_PATH); }}>
                  ยกเลิกการบันทึก
                </NeutralSubdueButton>
              )}
            </div>
          )}
        />

        {/* ผู้ป่วยสิทธิหมดอายุ — save allowed, but warn (ANC/OPD behaviour). */}
        {queueRow?.rightsExpired && (
          <div
            className='flex items-center'
            style={{
              ...bannerBase,
              background: 'var(--surface-warning-quaternary, #FFF9F0)',
              color: 'var(--text-warning-default, #C2410C)',
            }}
          >
            <Icon name='warning' size={18} />
            <span>
              สิทธิการรักษาของผู้รับบริการหมดอายุ ({queueRow.insurance}) — ยังบันทึกการตรวจได้
              แต่โปรดแจ้งผู้รับบริการติดต่องานสิทธิประโยชน์ก่อนกลับ
            </span>
          </div>
        )}

        {/* Resume-draft banner (ที่ร่างไว้ → กลับมาทำต่อที่ step เดิม) */}
        {resumeBanner && !saved && (
          <div
            className='flex items-center'
            style={{
              ...bannerBase,
              background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
              color: 'var(--text-brandPrimary-default, #007549)',
            }}
          >
            <Icon name='history' size={18} />
            <span>
              กลับมาทำต่อจากร่างที่บันทึกไว้{initial.draftSavedAt ? ` (${formatMhDateTime(initial.draftSavedAt)})` : ''} —
              เริ่มที่ขั้นตอนที่ {initial.stepIndex + 1}: {MH_STEPS[initial.stepIndex].title}
            </span>
            <div className='flex-1' />
            <button
              type='button'
              onClick={() => setResumeBanner(false)}
              aria-label='ปิดการแจ้งเตือน'
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-brandPrimary-default, #007549)' }}
            >
              <Icon name='close' size={16} />
            </button>
          </div>
        )}

        {/* View-mode banner — saved visit opens read-only + แก้ไขบันทึก */}
        {mode === 'view' && (
          <div
            className='flex items-center'
            style={{
              ...bannerBase,
              background: 'var(--surface-card-quaternary, #F9FBFB)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #EEF0F1)',
              color: 'var(--text-content-secondary, #636B72)',
            }}
          >
            <Icon name='visibility' size={18} />
            <span>
              แสดงบันทึกการตรวจที่บันทึกแล้ว (อ่านอย่างเดียว)
              {initial.lastVisit ? ` · บันทึกโดย ${initial.lastVisit.savedBy} · ${formatMhDateTime(initial.lastVisit.savedAt)}` : ''}
            </span>
            <div className='flex-1' />
            <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={startEdit}>
              แก้ไขบันทึก
            </BrandSubdueButton>
          </div>
        )}

        {/* Post-save confirmation */}
        {saved && (
          <div
            className='flex items-center'
            style={{
              ...bannerBase,
              background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
              color: 'var(--text-brandPrimary-default, #007549)',
            }}
          >
            <Icon name='check-circle' size={18} />
            <span>บันทึกการตรวจสุขภาพจิตเรียบร้อยแล้ว — กด "จบการบันทึก" ที่แถบด้านล่างเพื่อกลับหน้าคิว</span>
          </div>
        )}

        <TreatmentFormShell
          morphTitle='สุขภาพจิต'
          stepIndex={stepIndex}
          onStepChange={handleStepChange}
          completedSteps={completedSteps}
          steps={MH_STEPS}
          queuePath={QUEUE_PATH}
          step0FlushLeft={false}
          onLeave={handleBack}
        >
          <ActiveStep
            form={form}
            setForm={setForm}
            mhHn={mhHn}
            intake={intake}
            registration={registration}
            cardPatient={cardPatient}
            locked={locked}
            saved={saved}
            onConfirmSave={confirmSave}
          />
        </TreatmentFormShell>
        <Footer />
      </div>
    </div>
    </ClinicFilterProvider>
  );
};

export default MentalHealthFormPage;
