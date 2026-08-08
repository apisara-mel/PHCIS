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
  ImmStep1General,
  ImmStep2BirthNutrition,
  ImmStep3Growth,
  ImmStep4Development,
  ImmStep5Vaccine,
  ImmStep6GeneralExam,
  ImmStep7Orders,
  ImmStep8Summary,
} from '@/pages/clinic/immunization/ImmunizationSteps';
import {
  DEFAULT_IMM_VISIT,
  getImmChild,
  getImmPatientCard,
  getImmIntake,
  getImmRegistrationByHn,
  getImmQueueRows,
  getImmDraft,
  saveImmDraft,
  clearImmDraft,
  saveImmVisitRecord,
  getImmVisitRecords,
  getImmCompletedSteps,
  summarizeEpi,
  hasImmunizationRights,
  setImmunizationRights,
  formatImmDateTime,
} from '@/data/immunizationClinic';

/* ImmunizationFormPage — ใบบันทึกสุขภาพเด็กดี (TOR 1.10.9.1/.3/.4/.5/.7
   + IIS 1.11.2.1). Shell บาง ๆ บน TreatmentFormShell แบบเดียวกับ
   AncFormPage / MentalHealthFormPage: state ก้อนเดียวข้าม 8 ขั้นตอนที่อยู่ใน
   ImmunizationSteps.jsx โดย key ด้วย HN ที่หน้าคิวส่งมาทาง location.state.

   ครบ 4 กริยาของ 1.10.9.7:
     แสดง   — visit ที่บันทึกแล้วเปิดแบบอ่านอย่างเดียว (ล็อคทุกขั้นตอน)
     บันทึก — ขั้นตอนที่ 8 "ยืนยันบันทึกการตรวจสุขภาพเด็กดี"
     แก้ไข  — ปุ่ม "แก้ไขบันทึก" บนแถบ view เปิด edit-session พร้อม audit
     ยกเลิก — "ยกเลิกการบันทึก" / ออกทั้งที่มีข้อมูลค้าง → ยืนยันก่อนทิ้ง */

const breadcrumb = ['ระบบบันทึกการรักษา', 'งานสร้างเสริมภูมิคุ้มกัน', 'บันทึกสุขภาพเด็กดี'];
const QUEUE_PATH = '/clinic/immunization';

const IMM_STEPS = [
  { title: 'ข้อมูลทั่วไป', subtitle: 'General Information' },
  { title: 'ฝากครรภ์-คลอด / โภชนาการ', subtitle: 'Birth History & Nutrition' },
  { title: 'การเจริญเติบโต', subtitle: 'Growth' },
  { title: 'พัฒนาการเด็ก', subtitle: 'Development (DSPM)' },
  { title: 'ให้วัคซีน', subtitle: 'Immunization' },
  { title: 'ตรวจสุขภาพทั่วไป', subtitle: 'Physical Examination' },
  { title: 'สั่งการรักษา / Telemedicine', subtitle: 'Orders & Telemedicine' },
  { title: 'เอกสาร นัดหมาย และสรุป', subtitle: 'Documents, Appointment & Summary' },
];

const STEP_RENDERERS = [
  ImmStep1General,
  ImmStep2BirthNutrition,
  ImmStep3Growth,
  ImmStep4Development,
  ImmStep5Vaccine,
  ImmStep6GeneralExam,
  ImmStep7Orders,
  ImmStep8Summary,
];

const cloneDefaultVisit = () => JSON.parse(JSON.stringify(DEFAULT_IMM_VISIT));

const ImmunizationFormPage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();

  const immHn = navState?.hn || getImmChild('69-10001')?.hn;
  const child = useMemo(() => getImmChild(immHn), [immHn]);
  const cardPatient = useMemo(() => getImmPatientCard(immHn), [immHn]);
  const intake = useMemo(() => getImmIntake(immHn), [immHn]);
  const registration = useMemo(() => getImmRegistrationByHn(immHn), [immHn]);
  const queueRow = useMemo(() => getImmQueueRows().find((r) => r.hn === immHn) || null, [immHn]);
  const epi = useMemo(() => summarizeEpi(immHn), [immHn]);

  const initial = useMemo(() => {
    const draft = getImmDraft(immHn);
    if (draft) {
      return { mode: 'draft', form: { ...cloneDefaultVisit(), ...draft.form }, stepIndex: draft.stepIndex ?? 0, draftSavedAt: draft.savedAt };
    }
    const visits = getImmVisitRecords(immHn);
    const last = visits[visits.length - 1];
    if (last && (navState?.statusKey === 'done' || queueRow?.statusKey === 'done')) {
      return { mode: 'view', form: { ...cloneDefaultVisit(), ...last }, stepIndex: 0, lastVisit: last };
    }
    if (queueRow?.statusKey === 'draft') {
      return { mode: 'draft', form: cloneDefaultVisit(), stepIndex: queueRow.draftStep ?? 0 };
    }
    return { mode: 'new', form: cloneDefaultVisit(), stepIndex: 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immHn]);

  const [mode, setMode] = useState(initial.mode); /* 'new' | 'draft' | 'view' | 'edit' */
  const [stepIndex, setStepIndex] = useState(initial.stepIndex);
  const [form, setFormState] = useState(initial.form);
  const [saved, setSaved] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [resumeBanner, setResumeBanner] = useState(initial.mode === 'draft');
  const [, setRightsTick] = useState(0);

  const seedJson = useRef(JSON.stringify(initial.form));
  const canWrite = hasImmunizationRights();
  const locked = mode === 'view' || saved || !canWrite;
  const dirty = !saved && JSON.stringify(form) !== seedJson.current;

  const setForm = (updater) => {
    setFormState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (!locked) saveImmDraft(immHn, next, stepIndex);
      return next;
    });
  };

  const handleStepChange = (idx) => {
    setStepIndex(idx);
    if (!locked && dirty) saveImmDraft(immHn, form, idx);
  };

  const confirmSave = () => {
    /* เก็บ record ที่ได้กลับเข้า state — พก visitId/doseId/appointmentId ไว้
       ให้การกด "แก้ไขบันทึก" รอบถัดไป update ของเดิมแทนสร้างซ้ำ */
    const record = saveImmVisitRecord(immHn, form);
    clearImmDraft(immHn);
    setFormState(record);
    seedJson.current = JSON.stringify(record);
    setSaved(true);
  };

  const handleBack = () => {
    if (dirty && !locked) { setLeaveOpen(true); return; }
    history.push(QUEUE_PATH);
  };

  const leaveKeepDraft = () => {
    saveImmDraft(immHn, form, stepIndex);
    setLeaveOpen(false);
    history.push(QUEUE_PATH);
  };

  const leaveDiscard = () => {
    clearImmDraft(immHn);
    setLeaveOpen(false);
    history.push(QUEUE_PATH);
  };

  const startEdit = () => {
    setMode('edit');
    setSaved(false);
    setResumeBanner(false);
  };

  const ActiveStep = STEP_RENDERERS[stepIndex];
  const completedSteps = useMemo(() => getImmCompletedSteps(form, stepIndex), [form, stepIndex]);

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
          <SubHeader title='บันทึกสุขภาพเด็กดี — งานสร้างเสริมภูมิคุ้มกัน' hideBottomBorder />

          <Popup
            open={leaveOpen}
            onClose={() => setLeaveOpen(false)}
            title='ยังไม่ได้บันทึกการตรวจ'
            subtitle={`${child?.fullName || ''} · HN: ${immHn}${navState?.queue ? ` · คิว ${navState.queue}` : ''}`}
            tertiaryAction={{ label: 'ละทิ้งร่างและออก', onClick: leaveDiscard }}
            primaryAction={{ label: 'บันทึกร่างและออก', onClick: leaveKeepDraft }}
          >
            <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
              มีข้อมูลที่ยังไม่ได้บันทึกในใบบันทึกสุขภาพเด็กดี — บันทึกเป็นร่างไว้ทำต่อ
              (แสดงในแท็บ &quot;ที่ร่างไว้&quot; ของหน้าคิว) หรือละทิ้งการเปลี่ยนแปลงทั้งหมด
            </span>
          </Popup>

          <PatientCard
            sticky
            patient={cardPatient}
            title='บันทึกสุขภาพเด็กดี — คลินิกสุขภาพเด็กดี'
            drugAllergies={intake.drugAllergies}
            chronicDiseases={intake.chronicDiseases}
            actions={(
              <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <ColorfulBadge style={epi.style} size='small' hierarchy='secondary'>{`วัคซีน EPI: ${epi.label}`}</ColorfulBadge>
                {registration ? (
                  <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{registration.epiNumber}</ColorfulBadge>
                ) : (
                  <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ยังไม่มีทะเบียนสร้างเสริมภูมิคุ้มกัน</ColorfulBadge>
                )}
                <BrandSubdueButton
                  variant='outline'
                  size='sm'
                  leadingIcon='menu_book'
                  onClick={() => history.push({ pathname: '/clinic/immunization/vaccine-book', state: { hn: immHn } })}
                >
                  สมุดวัคซีน
                </BrandSubdueButton>
                <NeutralSubdueButton
                  size='sm'
                  leadingIcon={canWrite ? 'lock_open' : 'lock'}
                  onClick={() => { setImmunizationRights(!hasImmunizationRights()); setRightsTick((t) => t + 1); }}
                  title='สลับสิทธิปฏิบัติงานคลินิกเด็กดี (สำหรับทดสอบ)'
                >
                  {canWrite ? 'สิทธิ: แก้ไขได้' : 'สิทธิ: อ่านอย่างเดียว'}
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
            <div
              className='flex items-center'
              style={{ ...bannerBase, background: 'var(--surface-warning-quaternary, #FFF9F0)', color: 'var(--text-warning-default, #C2410C)' }}
            >
              <Icon name='lock' size={18} />
              <span>บัญชีของคุณไม่มีสิทธิปฏิบัติงานคลินิกสุขภาพเด็กดี — เปิดดูใบบันทึกได้อย่างเดียว</span>
            </div>
          )}

          {child?.rightsExpired && (
            <div
              className='flex items-center'
              style={{ ...bannerBase, background: 'var(--surface-warning-quaternary, #FFF9F0)', color: 'var(--text-warning-default, #C2410C)' }}
            >
              <Icon name='warning' size={18} />
              <span>
                สิทธิการรักษาของเด็กหมดอายุ ({child.insurance}) — ยังบันทึกการตรวจและให้วัคซีนได้
                แต่ช่องส่งเบิกจะไม่ถูกส่งจนกว่าจะต่อสิทธิ โปรดแจ้งผู้ปกครองติดต่องานสิทธิประโยชน์
              </span>
            </div>
          )}

          {resumeBanner && !saved && (
            <div
              className='flex items-center'
              style={{ ...bannerBase, background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', color: 'var(--text-brandPrimary-default, #007549)' }}
            >
              <Icon name='history' size={18} />
              <span>
                กลับมาทำต่อจากร่างที่บันทึกไว้{initial.draftSavedAt ? ` (${formatImmDateTime(initial.draftSavedAt)})` : ''} —
                เริ่มที่ขั้นตอนที่ {initial.stepIndex + 1}: {IMM_STEPS[initial.stepIndex].title}
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
                {initial.lastVisit ? ` · บันทึกโดย ${initial.lastVisit.savedBy} · ${formatImmDateTime(initial.lastVisit.savedAt)}` : ''}
              </span>
              <div className='flex-1' />
              {canWrite && (
                <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={startEdit}>
                  แก้ไขบันทึก
                </BrandSubdueButton>
              )}
            </div>
          )}

          {mode === 'edit' && !saved && (
            <div
              className='flex items-center'
              style={{ ...bannerBase, background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', color: 'var(--text-brandPrimary-default, #007549)' }}
            >
              <Icon name='edit' size={18} />
              <span>กำลังแก้ไขบันทึกที่บันทึกไว้แล้ว — การแก้ไขจะถูกบันทึกเป็นเวอร์ชันใหม่พร้อมผู้แก้ไขและเวลา</span>
            </div>
          )}

          {saved && (
            <div
              className='flex items-center'
              style={{ ...bannerBase, background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', color: 'var(--text-brandPrimary-default, #007549)' }}
            >
              <Icon name='check-circle' size={18} />
              <span>
                บันทึกการตรวจเรียบร้อยแล้ว — เข็มวัคซีนถูกเขียนลงสมุดวัคซีนของเด็กแล้ว
                กด &quot;จบการบันทึก&quot; ที่แถบด้านล่างเพื่อกลับหน้าคิว
              </span>
            </div>
          )}

          <TreatmentFormShell
            morphTitle='สุขภาพเด็กดี'
            stepIndex={stepIndex}
            onStepChange={handleStepChange}
            completedSteps={completedSteps}
            steps={IMM_STEPS}
            queuePath={QUEUE_PATH}
            step0FlushLeft={false}
            onLeave={handleBack}
            fromDepartment='คลินิกสุขภาพเด็กดี'
          >
            <ActiveStep
              form={form}
              setForm={setForm}
              immHn={immHn}
              child={child}
              intake={intake}
              registration={registration}
              queueRow={queueRow}
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

export default ImmunizationFormPage;
