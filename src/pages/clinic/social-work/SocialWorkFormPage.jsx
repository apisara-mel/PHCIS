import React, { useMemo, useRef, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
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
import { SwBanner } from '@/pages/clinic/social-work/SocialWorkShared';
import { SW_STEPS, SW_STEP_RENDERERS } from '@/pages/clinic/social-work/SocialWorkSteps';
import { getPatientByHN, DEFAULT_PATIENT } from '@/data/patientProfiles';
import {
  DEFAULT_SW_VISIT,
  SW_CURRENT_USER,
  getSwIntakeByHn,
  getSwRegistrationByHn,
  getSwQueueRows,
  getSwPersonByHn,
  getSwDraft,
  saveSwDraft,
  clearSwDraft,
  saveSwVisitRecord,
  getSwVisitRecords,
  getSwCompletedSteps,
  hasSocialWorkRights,
  setSocialWorkRights,
  formatSwDateTime,
  todayIso,
} from '@/data/socialWorkClinic';

/* SocialWorkFormPage — บันทึกบริการสังคมสงเคราะห์ แบบ สส.2 (TOR 1.10.11.2).

   Thin shell over TreatmentFormShell, same scaffold as AncFormPage /
   MentalHealthFormPage: ONE form-state object across the 8 สส.2 steps
   (SocialWorkSteps.jsx), keyed by the HN in the route (/record/:hn) or in
   the navigation state the queue pushed.

   All four verbs of the leaf live here:
     แสดง   — a finished visit opens read-only (locked steps + view banner)
     บันทึก — step 8 "ยืนยันบันทึกแบบ สส.2" commits the visit
     แก้ไข  — "แก้ไขบันทึก" on the view banner reopens the steps prefilled
     ยกเลิก — "ยกเลิกการบันทึก" (and back-with-unsaved-changes) confirms
              before discarding the draft (playbook §5 unsaved warning)
   ที่ร่างไว้ resumes at the step the draft was left on (getSwDraft).
   การยุติการให้บริการ (ขั้นตอนที่ 6) freezes the record read-only. */

const breadcrumb = ['ระบบบันทึกการรักษา', 'งานสังคมสงเคราะห์', 'บันทึกบริการ (สส.2)'];
const QUEUE_PATH = '/clinic/social-work';

const cloneDefaultVisit = () => JSON.parse(JSON.stringify(DEFAULT_SW_VISIT));

const SocialWorkFormPage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();
  const params = useParams();

  const swHn = params?.hn || navState?.hn || DEFAULT_PATIENT.hn;

  const cardPatient = useMemo(
    () => getPatientByHN(swHn) || DEFAULT_PATIENT,
    [swHn],
  );

  const queueRow = useMemo(
    () => getSwQueueRows().find((r) => r.hn === swHn) || getSwPersonByHn(swHn),
    [swHn],
  );

  const intake = useMemo(() => getSwIntakeByHn(swHn), [swHn]);
  const registration = useMemo(() => getSwRegistrationByHn(swHn), [swHn]);

  /* ── mode: resume draft > view saved visit > new record ─────────── */
  const initial = useMemo(() => {
    const seed = cloneDefaultVisit();
    seed.serviceDate = todayIso();
    seed.worker = queueRow?.worker || '';
    seed.clinic = queueRow?.clinic || 'social';
    seed.intakeChannel = queueRow?.intakeChannel || '';
    seed.targetGroup = queueRow?.targetGroup || '';
    seed.clientType = queueRow?.clientType || 'new';
    seed.primaryProblem = queueRow?.primaryProblem || '';
    seed.informant = registration?.informant || '';
    seed.informantRelation = registration?.informantRelation || '';
    seed.informantPhone = registration?.informantPhone || '';

    const draft = getSwDraft(swHn);
    if (draft) {
      return { mode: 'draft', form: { ...seed, ...draft.form }, stepIndex: draft.stepIndex ?? 0, draftSavedAt: draft.savedAt };
    }
    const visits = getSwVisitRecords(swHn);
    const last = visits[visits.length - 1];
    if (last && (navState?.statusKey === 'done' || queueRow?.statusKey === 'done')) {
      return { mode: 'view', form: { ...seed, ...last }, stepIndex: 0, lastVisit: last };
    }
    if (queueRow?.statusKey === 'draft') {
      return { mode: 'draft', form: seed, stepIndex: queueRow.draftStep ?? 0 };
    }
    return { mode: 'new', form: seed, stepIndex: 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swHn]);

  const [mode, setMode] = useState(initial.mode); /* 'new' | 'draft' | 'view' | 'edit' */
  const [stepIndex, setStepIndex] = useState(initial.stepIndex);
  const [form, setFormState] = useState(initial.form);
  const [saved, setSaved] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [resumeBanner, setResumeBanner] = useState(initial.mode === 'draft');
  const [, setRightsTick] = useState(0);

  const seedJson = useRef(JSON.stringify(initial.form));
  const canWrite = hasSocialWorkRights();
  /* ยุติการให้บริการแล้ว → อ่านอย่างเดียว · สิทธิไม่พอ → เขียนไม่ได้ */
  const locked = mode === 'view' || saved || !!form.terminated || !canWrite;
  /* `saveLocked` ไม่รวม form.terminated โดยเจตนา — หลังกดยืนยันยุติบริการ
     ผู้ใช้ยังต้อง "ยืนยันบันทึกแบบ สส.2" ได้ (validation ในขั้นตอนที่ 8 จะ
     บังคับให้ระบุเหตุผลการยุติก่อนอยู่แล้ว) ถ้าใช้ `locked` กับปุ่มบันทึก
     ปุ่มจะ disabled ถาวรและบันทึกการยุติไม่ได้เลย. terminated จึงล็อกเฉพาะ
     input ของฟอร์ม (ผ่าน `locked`) ไม่ล็อกปุ่มยืนยันบันทึก. */
  const saveLocked = mode === 'view' || saved || !canWrite;
  const dirty = !saved && JSON.stringify(form) !== seedJson.current;

  const setForm = (updater) => {
    setFormState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      /* ขั้นตอนที่ 6 ปลด/ตั้งค่า terminated ได้ แม้ `locked` จะเป็นจริงหลังยุติ —
         การบันทึกร่างจึงยึด mode/สิทธิเป็นหลัก ไม่ใช่ค่า terminated */
      if (mode !== 'view' && !saved && canWrite) saveSwDraft(swHn, next, stepIndex);
      return next;
    });
  };

  const handleStepChange = (idx) => {
    setStepIndex(idx);
    if (mode !== 'view' && !saved && canWrite && dirty) saveSwDraft(swHn, form, idx);
  };

  const confirmSave = () => {
    saveSwVisitRecord(swHn, form);
    clearSwDraft(swHn);
    seedJson.current = JSON.stringify(form);
    setSaved(true);
  };

  const handleBack = () => {
    if (dirty && mode !== 'view' && !saved) {
      setLeaveOpen(true);
      return;
    }
    history.push(QUEUE_PATH);
  };

  const leaveKeepDraft = () => {
    saveSwDraft(swHn, form, stepIndex);
    setLeaveOpen(false);
    history.push(QUEUE_PATH);
  };

  const leaveDiscard = () => {
    clearSwDraft(swHn);
    setLeaveOpen(false);
    history.push(QUEUE_PATH);
  };

  const startEdit = () => {
    setMode('edit');
    setSaved(false);
    setResumeBanner(false);
  };

  const toggleRightsDemo = () => {
    setSocialWorkRights(!hasSocialWorkRights());
    setRightsTick((t) => t + 1);
  };

  const ActiveStep = SW_STEP_RENDERERS[stepIndex];
  const completedSteps = useMemo(() => getSwCompletedSteps(form, stepIndex), [form, stepIndex]);

  const bannerWrap = {
    marginLeft: 'var(--dim-space-600, 24px)',
    marginRight: 'var(--dim-space-600, 24px)',
    marginTop: 'var(--dim-space-400, 16px)',
  };

  return (
    <ClinicFilterProvider>
      <div className='flex w-full min-h-screen' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
        <Sidebar activeKey='treat' />
        <div className='flex-1 min-w-0 flex flex-col'>
          <Header breadcrumb={breadcrumb} standalone={false} />
          <SubHeader title='บันทึกบริการสังคมสงเคราะห์ (แบบ สส.2)' hideBottomBorder />

          {/* Unsaved-changes confirm — ยกเลิก/ออกจากบันทึก */}
          <Popup
            open={leaveOpen}
            onClose={() => setLeaveOpen(false)}
            title='ยังไม่ได้บันทึกแบบ สส.2'
            subtitle={`${cardPatient.fullName} · HN: ${swHn}${queueRow?.queue ? ` · คิว ${queueRow.queue}` : ''}`}
            tertiaryAction={{ label: 'ละทิ้งร่างและออก', onClick: leaveDiscard }}
            primaryAction={{ label: 'บันทึกร่างและออก', onClick: leaveKeepDraft }}
          >
            <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
              มีข้อมูลที่ยังไม่ได้บันทึกในแบบ สส.2 — บันทึกเป็นร่างไว้ทำต่อ
              (แสดงในแท็บ "ที่ร่างไว้" ของหน้าคิว) หรือละทิ้งการเปลี่ยนแปลงทั้งหมด
            </span>
          </Popup>

          <PatientCard
            sticky
            showBack={false}
            patient={cardPatient}
            title='บันทึกบริการสังคมสงเคราะห์ — แบบ สส.2'
            drugAllergies={intake.drugAllergies}
            chronicDiseases={intake.chronicDiseases}
            actions={(
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <ColorfulBadge style='red' size='small' hierarchy='secondary'>ข้อมูลลับ §1.4.2</ColorfulBadge>
                {registration ? (
                  <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{registration.caseNo}</ColorfulBadge>
                ) : (
                  <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ยังไม่มีเลข CASE</ColorfulBadge>
                )}
                <ColorfulBadge style='grey' size='small' hierarchy='secondary'>
                  ผู้บันทึก {SW_CURRENT_USER}
                </ColorfulBadge>
                <NeutralSubdueButton
                  size='sm'
                  leadingIcon={canWrite ? 'lock_open' : 'lock'}
                  onClick={toggleRightsDemo}
                  title='สลับสิทธิงานสังคมสงเคราะห์ (สำหรับทดสอบ)'
                >
                  {canWrite ? 'สิทธิ: เข้าถึงได้' : 'สิทธิ: ถูกจำกัด'}
                </NeutralSubdueButton>
                {!locked && (
                  <NeutralSubdueButton
                    size='sm'
                    leadingIcon='block'
                    onClick={() => { if (dirty) setLeaveOpen(true); else history.push(QUEUE_PATH); }}
                  >
                    ยกเลิกการบันทึก
                  </NeutralSubdueButton>
                )}
              </div>
            )}
          />

          {!canWrite && (
            <div style={bannerWrap}>
              <SwBanner tone='warning' icon='lock'>
                บัญชีนี้ไม่มีสิทธิงานสังคมสงเคราะห์ (§1.4.2) — เปิดดูแบบ สส.2 ได้ในโหมดปกปิด
                แต่บันทึก แก้ไข หรือยกเลิกไม่ได้
              </SwBanner>
            </div>
          )}

          {/* ผู้รับบริการไม่มีสิทธิ/สิทธิหมดอายุ — งานสังคมสงเคราะห์คือทางออก
              ของกรณีนี้ จึงเตือนแต่ไม่บล็อกการบันทึก */}
          {(queueRow?.rightsExpired || queueRow?.noRights) && (
            <div style={bannerWrap}>
              <SwBanner tone='warning' icon='warning'>
                ผู้รับบริการ{queueRow.noRights ? 'ไม่มีสิทธิการรักษา' : `สิทธิการรักษาหมดอายุ (${queueRow.insurance})`} —
                ยังบันทึกการให้บริการสังคมสงเคราะห์ได้ตามปกติ และควรประสานงานสิทธิประโยชน์ให้ผู้รับบริการก่อนกลับ
              </SwBanner>
            </div>
          )}

          {resumeBanner && !saved && (
            <div style={bannerWrap}>
              <SwBanner tone='brand' icon='history' onClose={() => setResumeBanner(false)}>
                กลับมาทำต่อจากร่างที่บันทึกไว้{initial.draftSavedAt ? ` (${formatSwDateTime(initial.draftSavedAt)})` : ''} —
                เริ่มที่ขั้นตอนที่ {initial.stepIndex + 1}: {SW_STEPS[initial.stepIndex].title}
              </SwBanner>
            </div>
          )}

          {mode === 'view' && (
            <div style={bannerWrap}>
              <SwBanner
                tone='neutral'
                icon='visibility'
                action={canWrite ? (
                  <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={startEdit}>
                    แก้ไขบันทึก
                  </BrandSubdueButton>
                ) : undefined}
              >
                แสดงแบบ สส.2 ที่บันทึกแล้ว (อ่านอย่างเดียว)
                {initial.lastVisit ? ` · บันทึกโดย ${initial.lastVisit.savedBy} · ${formatSwDateTime(initial.lastVisit.savedAt)}` : ''}
              </SwBanner>
            </div>
          )}

          {form.terminated && mode !== 'view' && (
            <div style={bannerWrap}>
              <SwBanner tone='neutral' icon='lock'>
                เคสนี้ยุติการให้บริการแล้ว — ระเบียนเป็นอ่านอย่างเดียว
                หากต้องการให้บริการต่อ ให้กด "เปิดเคสใหม่" ในขั้นตอนที่ 6 พร้อมระบุเหตุผล
              </SwBanner>
            </div>
          )}

          {saved && (
            <div style={bannerWrap}>
              <SwBanner tone='brand' icon='check-circle'>
                บันทึกแบบ สส.2 เรียบร้อยแล้ว — กด "จบการบันทึก" ที่แถบด้านล่างเพื่อกลับหน้าคิว
              </SwBanner>
            </div>
          )}

          <TreatmentFormShell
            morphTitle='สังคมสงเคราะห์'
            stepIndex={stepIndex}
            onStepChange={handleStepChange}
            completedSteps={completedSteps}
            steps={SW_STEPS}
            queuePath={QUEUE_PATH}
            step0FlushLeft={false}
            onLeave={handleBack}
            onSaveDraft={() => { if (mode !== 'view' && canWrite) saveSwDraft(swHn, form, stepIndex); }}
          >
            <ActiveStep
              form={form}
              setForm={setForm}
              swHn={swHn}
              intake={intake}
              registration={registration}
              queueRow={queueRow}
              cardPatient={cardPatient}
              locked={locked}
              saveLocked={saveLocked}
              saved={saved}
              onConfirmSave={confirmSave}
            />
          </TreatmentFormShell>

          <div
            className='flex items-center'
            style={{
              marginLeft: 'var(--dim-space-600, 24px)',
              marginRight: 'var(--dim-space-600, 24px)',
              marginTop: 'var(--dim-space-200, 8px)',
              marginBottom: 'var(--dim-space-400, 16px)',
              gap: 'var(--dim-space-200, 8px)',
              fontSize: 'var(--type-size-xs)',
              color: 'var(--text-content-tertiary, #858C92)',
            }}
          >
            <Icon name='info' size={14} />
            <span>
              ทุกขั้นตอนบันทึกผู้บันทึกและวันเวลาโดยอัตโนมัติ (audit trail) —
              ร่างจะถูกเก็บไว้ต่อเนื่องจนกว่าจะยืนยันบันทึกหรือละทิ้ง
            </span>
          </div>

          <Footer />
        </div>
      </div>
    </ClinicFilterProvider>
  );
};

export default SocialWorkFormPage;
