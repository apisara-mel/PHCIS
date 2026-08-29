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
  FpStep1History, FpStep2Screening, FpStep3Plan, FpStep4WomenExam,
  FpStep5Postpartum, FpStep6Orders, FpStep7Documents,
} from '@/pages/clinic/family-planning/FamilyPlanningSteps';
import { findMrPatientByHn, DEFAULT_MR_PATIENT } from '@/data/mrPatients';
import { getPatientByHN, DEFAULT_PATIENT } from '@/data/patientProfiles';
import {
  DEFAULT_FP_VISIT,
  getFpCompletedSteps,
  getFpRegistrationByHn,
  getFpQueueRowByHn,
  getFpDraft,
  saveFpDraft,
  clearFpDraft,
  saveFpVisitRecord,
  getFpVisitRecords,
  hasFamilyPlanningRights,
  setFamilyPlanningRights,
  formatFpDateTime,
  todayIso,
} from '@/data/familyPlanningVisits';

/* FamilyPlanningFormPage — บันทึกวางแผนครอบครัว (TOR 1.10.8.1/.3/.4/.5/.7).

   Shell บาง ๆ เหนือ TreatmentFormShell — โครงเดียวกับ AncFormPage /
   MentalHealthFormPage: form-state ก้อนเดียวข้าม 7 ขั้นตอน คีย์ด้วย HN ที่
   หน้าคิวส่งมา ({hn, queue, name, statusKey})

   ครบทั้ง 4 กริยาของ TOR:
     แสดง   — visit ที่บันทึกแล้วเปิดแบบอ่านอย่างเดียว + แบนเนอร์ view
     บันทึก — ขั้นตอนที่ 7 "ยืนยันบันทึกการให้บริการวางแผนครอบครัว"
     แก้ไข  — ปุ่ม "แก้ไขบันทึก" บนแบนเนอร์ view เปิดฟอร์มกลับมาแก้ได้
     ยกเลิก — "ยกเลิกการบันทึก" / ย้อนกลับทั้งที่มีข้อมูลค้าง → ยืนยันก่อนทิ้ง

   แท็บ "ที่ร่างไว้" กลับมาทำต่อที่ขั้นตอนเดิม (getFpDraft) */

const breadcrumb = ['บันทึกการรักษา', 'งานวางแผนครอบครัว', 'บันทึกวางแผนครอบครัว'];
const QUEUE_PATH = '/clinic/family-planning';
const REGISTRY_PATH = '/clinic/family-planning/registry';

const FP_STEPS = [
  { title: 'ประวัติการรักษา',        subtitle: 'Medical History' },
  /* ไม่ใช่ "คัดกรอง/ซักประวัติ" — จุดคัดกรองมีที่เดียวที่ `/opd/screening`
     step นี้เก็บเฉพาะแบบประเมินคุณสมบัติการคุมกำเนิด 11 ข้อ (WHO MEC)
     ส่วนผลคัดกรองแสดงอ่านอย่างเดียวที่ step 1 */
  { title: 'แบบประเมิน',              subtitle: 'Assessment (11 items)' },
  { title: 'วางแผนครอบครัว',         subtitle: 'Family Planning' },
  { title: 'ตรวจสตรี',               subtitle: 'Breast & PV Exam' },
  { title: 'ดูแลหลังคลอด',           subtitle: 'Postpartum Care' },
  { title: 'คำสั่งทางการแพทย์',      subtitle: 'Orders & Refer' },
  { title: 'เอกสารและนัดหมาย',       subtitle: 'Documents & Appointment' },
];

const STEP_RENDERERS = [
  FpStep1History, FpStep2Screening, FpStep3Plan, FpStep4WomenExam,
  FpStep5Postpartum, FpStep6Orders, FpStep7Documents,
];

const cloneDefaultVisit = () => ({
  ...JSON.parse(JSON.stringify(DEFAULT_FP_VISIT)),
  serviceDate: todayIso(),
});

const FamilyPlanningFormPage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();

  const cardPatient = useMemo(
    () => (navState?.hn && getPatientByHN(navState.hn)) || DEFAULT_PATIENT,
    [navState?.hn],
  );

  /* ทุก record ผูกกับ HN ที่หน้าคิวส่งมา — ไม่ใช่ cardPatient.hn
     (getPatientByHN fallback เป็น DEFAULT_PATIENT สำหรับ HN ที่ไม่มีใน
     patientProfiles ซึ่งจะทำให้บันทึกของคนละคนไปกองรวมกันที่ 67-00001)
     — guard เดียวกับ AncFormPage / MentalHealthFormPage */
  const fpHn = navState?.hn || cardPatient?.hn;

  const mrPatient = useMemo(() => {
    const p = (navState?.hn && findMrPatientByHn(navState.hn)) || DEFAULT_MR_PATIENT;
    return { ...p, queue: navState?.queue, name: navState?.name || `${p.firstNameTh} ${p.lastNameTh}` };
  }, [navState]);

  const queueRow = useMemo(() => getFpQueueRowByHn(fpHn), [fpHn]);
  const [registrationTick, setRegistrationTick] = useState(0);
  const registration = useMemo(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    () => getFpRegistrationByHn(fpHn),
    [fpHn, registrationTick],
  );

  /* ── mode: resume draft > view saved visit > new record ─────────── */
  const initial = useMemo(() => {
    const draft = getFpDraft(fpHn);
    if (draft) {
      return {
        mode: 'draft',
        form: { ...cloneDefaultVisit(), ...draft.form },
        stepIndex: draft.stepIndex ?? 0,
        draftSavedAt: draft.savedAt,
      };
    }
    const visits = getFpVisitRecords(fpHn);
    const last = visits[visits.length - 1];
    const row = getFpQueueRowByHn(fpHn);
    if (last && (navState?.statusKey === 'done' || row?.statusKey === 'done')) {
      return { mode: 'view', form: { ...cloneDefaultVisit(), ...last }, stepIndex: 0, lastVisit: last };
    }
    if (row?.statusKey === 'draft') {
      return { mode: 'draft', form: cloneDefaultVisit(), stepIndex: row.draftStep ?? 0 };
    }
    return { mode: 'new', form: cloneDefaultVisit(), stepIndex: 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fpHn]);

  const [mode, setMode] = useState(initial.mode); /* 'new' | 'draft' | 'view' | 'edit' */
  const [stepIndex, setStepIndex] = useState(initial.stepIndex);
  const [form, setFormState] = useState(initial.form);
  const [saved, setSaved] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [resumeBanner, setResumeBanner] = useState(initial.mode === 'draft');
  const [, setRightsTick] = useState(0);

  const seedJson = useRef(JSON.stringify(initial.form));
  const locked = mode === 'view' || saved;
  const dirty = !saved && JSON.stringify(form) !== seedJson.current;

  const canRead = hasFamilyPlanningRights();
  const toggleRightsDemo = () => {
    setFamilyPlanningRights(!hasFamilyPlanningRights());
    setRightsTick((t) => t + 1);
  };

  /* Auto-persist ร่างทุกครั้งที่แก้ (แท็บ "ที่ร่างไว้" กลับมาทำต่อได้) —
     ไม่บันทึกร่างขณะเปิดดู record ที่ commit แล้ว */
  const setForm = (updater) => {
    setFormState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (!locked) saveFpDraft(fpHn, next, stepIndex);
      return next;
    });
  };

  const handleStepChange = (idx) => {
    setStepIndex(idx);
    if (!locked && dirty) saveFpDraft(fpHn, form, idx);
  };

  const confirmSave = () => {
    saveFpVisitRecord(fpHn, form);
    clearFpDraft(fpHn);
    seedJson.current = JSON.stringify(form);
    setSaved(true);
  };

  const handleBack = () => {
    if (dirty && !locked) { setLeaveOpen(true); return; }
    history.push(QUEUE_PATH);
  };

  const leaveKeepDraft = () => {
    saveFpDraft(fpHn, form, stepIndex);
    setLeaveOpen(false);
    history.push(QUEUE_PATH);
  };

  const leaveDiscard = () => {
    clearFpDraft(fpHn);
    setLeaveOpen(false);
    history.push(QUEUE_PATH);
  };

  const startEdit = () => {
    setMode('edit');
    setSaved(false);
    setResumeBanner(false);
  };

  const goRegistry = () => history.push({
    pathname: REGISTRY_PATH,
    state: { hn: fpHn, name: mrPatient.name, createFor: fpHn },
  });

  const ActiveStep = STEP_RENDERERS[stepIndex];
  const completedSteps = useMemo(() => getFpCompletedSteps(form, stepIndex), [form, stepIndex]);

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

  const pageTitle = 'บันทึกวางแผนครอบครัว — คลินิกวางแผนครอบครัว';

  return (
    <ClinicFilterProvider>
      <div className='flex w-full min-h-screen' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
        <Sidebar activeKey='treat' />
        <div className='flex-1 min-w-0 flex flex-col'>
          <Header breadcrumb={breadcrumb} standalone={false} />
          <SubHeader title={pageTitle} hideBottomBorder />

          {/* ยืนยันก่อนทิ้งข้อมูลที่ยังไม่บันทึก (กริยา "ยกเลิก") */}
          <Popup
            open={leaveOpen}
            onClose={() => setLeaveOpen(false)}
            title='ยังไม่ได้บันทึกการให้บริการ'
            subtitle={`${mrPatient.name} · HN: ${fpHn}${navState?.queue ? ` · คิว ${navState.queue}` : ''}`}
            tertiaryAction={{ label: 'ละทิ้งร่างและออก', onClick: leaveDiscard }}
            primaryAction={{ label: 'บันทึกร่างและออก', onClick: leaveKeepDraft }}
          >
            <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
              มีข้อมูลที่ยังไม่ได้บันทึกในแบบบันทึกวางแผนครอบครัว — บันทึกเป็นร่างไว้ทำต่อ
              (แสดงในแท็บ "ที่ร่างไว้" ของหน้าคิว) หรือละทิ้งการเปลี่ยนแปลงทั้งหมด
            </span>
          </Popup>

          <PatientCard
            sticky
            showBack={false}
            patient={cardPatient}
            title={pageTitle}
            drugAllergies={mrPatient.drugAllergies}
            chronicDiseases={mrPatient.chronicDiseases}
            actions={(
              <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <ColorfulBadge style='red' size='small' hierarchy='secondary'>ข้อมูลลับ §1.4.2</ColorfulBadge>
                {registration && registration.status !== 'cancelled' ? (
                  <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{registration.fpNumber}</ColorfulBadge>
                ) : (
                  <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ยังไม่มีเลขที่วางแผนครอบครัว</ColorfulBadge>
                )}
                <NeutralSubdueButton
                  size='sm'
                  leadingIcon={canRead ? 'lock_open' : 'lock'}
                  onClick={toggleRightsDemo}
                  title='สลับสิทธิการเข้าถึงข้อมูลลับ (สำหรับทดสอบ)'
                >
                  {canRead ? 'สิทธิ: เข้าถึงได้' : 'สิทธิ: ถูกจำกัด'}
                </NeutralSubdueButton>
                <BrandSubdueButton
                  variant='outline'
                  size='sm'
                  leadingIcon='credit_card'
                  onClick={() => setStepIndex(6)}
                >
                  พิมพ์บัตรติดตาม
                </BrandSubdueButton>
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

          {/* ยังไม่มีทะเบียน — คู่มือ p.2-1 "ไม่พบข้อมูล กรุณาลงทะเบียน" */}
          {(!registration || registration.status === 'cancelled') && (
            <div
              className='flex items-center'
              style={{
                ...bannerBase,
                background: 'var(--surface-warning-quaternary, #FFF9F0)',
                color: 'var(--text-warning-default, #C2410C)',
              }}
            >
              <Icon name='person_search' size={18} />
              <span>
                ไม่พบข้อมูลทะเบียนวางแผนครอบครัวของ HN {fpHn} — ต้องลงทะเบียนเพื่อออก
                "เลขที่วางแผนครอบครัว" ก่อนจึงจะพิมพ์บัตรติดตามและปิดการบันทึกได้สมบูรณ์
              </span>
              <div className='flex-1' />
              <BrandSubdueButton variant='fill' size='sm' leadingIcon='person_add' onClick={goRegistry}>
                ลงทะเบียน
              </BrandSubdueButton>
            </div>
          )}

          {/* สิทธิหมดอายุ / ไม่มีสิทธิ */}
          {queueRow?.rightsExpired && (
            <div
              className='flex items-center'
              style={{
                ...bannerBase,
                background: 'var(--surface-danger-quaternary, #FFF0F0)',
                color: 'var(--text-danger-default, #B91C1C)',
              }}
            >
              <Icon name='warning' size={18} />
              <span>
                สิทธิการรักษาหมดอายุ ({queueRow.insurance}) — ยังบันทึกการให้บริการได้
                แต่ค่าบริการจะถูกส่งเป็น "ชำระเงินเอง" ไปยังห้องเงิน
              </span>
            </div>
          )}

          {/* กลับมาทำต่อจากร่าง */}
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
                กลับมาทำต่อจากร่างที่บันทึกไว้{initial.draftSavedAt ? ` (${formatFpDateTime(initial.draftSavedAt)})` : ''} —
                เริ่มที่ขั้นตอนที่ {initial.stepIndex + 1}: {FP_STEPS[initial.stepIndex].title}
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

          {/* แก้ไขบันทึกที่บันทึกแล้ว */}
          {mode === 'view' && (
            <div
              className='flex justify-end'
              style={{
                marginBottom: 'var(--dim-space-300)',
              }}
            >
              <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={startEdit}>
                แก้ไขบันทึก
              </BrandSubdueButton>
            </div>
          )}

          {/* บันทึกสำเร็จ */}
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
              <span>บันทึกการให้บริการวางแผนครอบครัวเรียบร้อยแล้ว — กด "จบการบันทึก" ที่แถบด้านล่างเพื่อกลับหน้าคิว</span>
            </div>
          )}

          <TreatmentFormShell
            morphTitle='วางแผนครอบครัว'
            stepIndex={stepIndex}
            onStepChange={handleStepChange}
            completedSteps={completedSteps}
            steps={FP_STEPS}
            queuePath={QUEUE_PATH}
            step0FlushLeft={false}
            onLeave={handleBack}
            fromDepartment='คลินิกวางแผนครอบครัว'
            onSaveDraft={() => { if (!locked) saveFpDraft(fpHn, form, stepIndex); }}
          >
            <ActiveStep
              form={form}
              setForm={setForm}
              fpHn={fpHn}
              queueRow={queueRow}
              registration={registration}
              cardPatient={cardPatient}
              locked={locked}
              saved={saved}
              onConfirmSave={confirmSave}
              onGoRegistry={goRegistry}
              onRegistrationChanged={() => setRegistrationTick((t) => t + 1)}
            />
          </TreatmentFormShell>
          <Footer />
        </div>
      </div>
    </ClinicFilterProvider>
  );
};

export default FamilyPlanningFormPage;
