import React, { useMemo, useRef, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header, { SubHeader } from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PatientCard from '@/components/card/PatientCard';
import WizardMorphHeader, { WIZARD_MORPH_SHELL_PROPS } from '@/components/layout/WizardMorphHeader';
import PageHeaderInfoPanel from '@/components/layout/PageHeaderInfoPanel';
import TabCapsule from '@/components/tab/TabCapsule';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Popup from '@/components/popup/Popup';
import Icon from '@/components/icons/Icon';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import { MIH_CHROME_MORPH_FOOTER, MIH_CHROME_MORPH_STEP_BAND } from '@/components/layout/wizardChromeMorphStyles';
import { getPatientByHN, DEFAULT_PATIENT } from '@/data/patientProfiles';
import {
  EMPTY_SCREENING, getVisit, getScreening, saveScreening, cancelScreening,
  restoreScreening, screeningHasConfidential, formatThaiDateTime,
  getCheckupDraft, saveCheckupDraft, clearCheckupDraft,
  CANCEL_REASON_SUGGESTIONS,
} from '@/data/checkupStore';
import {
  CHECKUP_SCREENING_STEPS, CHECKUP_SCREENING_RENDERERS,
  getScreeningCompletedSteps, validateScreeningStep, summariseScreening,
} from '@/pages/checkup/CheckupScreeningSteps';
import CheckupGroupScreeningPanel from '@/pages/checkup/CheckupGroupScreeningPanel';
import {
  PageBody, PageCard, EmptyState, NoticeBar, CheckupAuditBar,
} from '@/pages/checkup/CheckupUi';

/* CheckupScreeningPage — แบบคัดกรอง 7 แบบ (TOR 1.19.7 + 1.19.13).

   Wizard chrome uses the canonical WizardMorphHeader + StepProgress inside a
   sticky PageHeaderInfoPanel (the `wizard-morph-header` pattern) so the stepper
   collapses on scroll exactly like every other PHCIS wizard. It is composed
   directly rather than through TreatmentFormShell because this page carries a
   second mode ("บันทึกแบบกลุ่ม") beside the per-person wizard.

   Verbs: แสดง (saved → read-only) · บันทึก · แก้ไข · ยกเลิก (reason + restore). */

const breadcrumb = ['ระบบงานตรวจสุขภาพ', 'แบบคัดกรอง'];
const QUEUE_PATH = '/checkup';
const DRAFT_KIND = 'screening';

const cloneEmpty = () => JSON.parse(JSON.stringify(EMPTY_SCREENING));

const CheckupScreeningPage = () => {
  const history = useHistory();
  const { visitId } = useParams();

  const visit = useMemo(() => getVisit(visitId), [visitId]);

  const initial = useMemo(() => {
    const draft = getCheckupDraft(DRAFT_KIND, visitId);
    if (draft) {
      return { mode: 'draft', form: { ...cloneEmpty(), ...draft.form }, stepIndex: draft.stepIndex ?? 0, draftSavedAt: draft.savedAt };
    }
    const saved = getScreening(visitId);
    if (saved) return { mode: 'view', form: { ...cloneEmpty(), ...saved }, stepIndex: 0, savedRecord: saved };
    return { mode: 'new', form: cloneEmpty(), stepIndex: 0 };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [visitId]);

  const [mode, setMode] = useState(initial.mode);
  const [stepIndex, setStepIndex] = useState(initial.stepIndex);
  const [form, setFormState] = useState(initial.form);
  const [saved, setSaved] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [resumeBanner, setResumeBanner] = useState(initial.mode === 'draft');
  const [panelMode, setPanelMode] = useState('person'); /* 'person' | 'group' */
  const [stepError, setStepError] = useState('');
  const [groupToast, setGroupToast] = useState('');
  const [tick, setTick] = useState(0);
  const seedJson = useRef(JSON.stringify(initial.form));

  const record = useMemo(() => getScreening(visitId), [visitId, tick]);
  const cancelled = !!record?.cancelled;
  const locked = mode === 'view' || saved || cancelled;
  const dirty = !saved && JSON.stringify(form) !== seedJson.current;

  const patient = useMemo(
    () => (visit?.hn && getPatientByHN(visit.hn)) || DEFAULT_PATIENT,
    [visit],
  );

  const setForm = (updater) => {
    setFormState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (!locked) saveCheckupDraft(DRAFT_KIND, visitId, next, stepIndex);
      return next;
    });
  };

  const sectionKey = CHECKUP_SCREENING_STEPS[stepIndex]?.key;
  const setSection = (patch) => setForm((f) => ({
    ...f,
    [sectionKey]: { ...(f[sectionKey] || {}), ...patch },
  }));

  const goStep = (idx) => {
    const err = validateScreeningStep(form, stepIndex);
    if (err && idx > stepIndex) { setStepError(err); return; }
    setStepError('');
    setStepIndex(idx);
    if (!locked && dirty) saveCheckupDraft(DRAFT_KIND, visitId, form, idx);
  };

  const confirmSave = () => {
    for (let i = 0; i < CHECKUP_SCREENING_STEPS.length; i += 1) {
      const err = validateScreeningStep(form, i);
      if (err) {
        setStepIndex(i);
        setStepError(err);
        return;
      }
    }
    saveScreening(visitId, form);
    clearCheckupDraft(DRAFT_KIND, visitId);
    seedJson.current = JSON.stringify(form);
    setSaved(true);
    setStepError('');
    setTick((t) => t + 1);
  };

  const handleLeave = () => {
    if (dirty && !locked) { setLeaveOpen(true); return; }
    history.push(QUEUE_PATH);
  };

  const leaveKeepDraft = () => {
    saveCheckupDraft(DRAFT_KIND, visitId, form, stepIndex);
    setLeaveOpen(false);
    history.push(QUEUE_PATH);
  };

  const leaveDiscard = () => {
    clearCheckupDraft(DRAFT_KIND, visitId);
    setLeaveOpen(false);
    history.push(QUEUE_PATH);
  };

  const confirmCancel = () => {
    if (!cancelReason.trim()) { setCancelError('ต้องระบุเหตุผลการยกเลิกแบบคัดกรอง'); return; }
    cancelScreening(visitId, cancelReason.trim());
    setCancelOpen(false);
    setTick((t) => t + 1);
  };

  if (!visit) {
    return (
      <div className='flex w-full min-h-screen' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
        <Sidebar activeKey='checkup' />
        <div className='flex-1 min-w-0 flex flex-col'>
          <Header breadcrumb={breadcrumb} standalone={false} />
          <SubHeader title='แบบคัดกรอง' onBack={() => history.push(QUEUE_PATH)} backLabel='กลับไปคิว' hideBottomBorder />
          <PageBody>
            <PageCard>
              <EmptyState
                icon='error'
                title='ไม่พบข้อมูลการตรวจที่ระบุ'
                subtitle={`ไม่พบ visit "${visitId}" — โปรดเลือกผู้รับบริการจากคิวตรวจสุขภาพอีกครั้ง`}
                actionLabel='กลับไปคิวตรวจสุขภาพ'
                onAction={() => history.push(QUEUE_PATH)}
              />
            </PageCard>
          </PageBody>
          <Footer />
        </div>
      </div>
    );
  }

  const ActiveStep = CHECKUP_SCREENING_RENDERERS[stepIndex];
  const completedSteps = getScreeningCompletedSteps(form, stepIndex);
  const isLast = stepIndex === CHECKUP_SCREENING_STEPS.length - 1;
  const summary = summariseScreening(form);

  return (
    <div className='flex w-full min-h-screen' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
      <Sidebar activeKey='checkup' />
      <div className='flex-1 min-w-0 flex flex-col'>
        <Header breadcrumb={breadcrumb} standalone={false} />
        <SubHeader
          title={`แบบคัดกรอง — ${visit.name} · HN ${visit.hn}`}
          hideBottomBorder
        >
          <NeutralSubdueButton size='md' leadingIcon='monitor_heart' onClick={() => history.push(`/checkup/record/${visit.id}`)}>
            บันทึกผลตรวจ
          </NeutralSubdueButton>
          {!locked ? (
            <NeutralSubdueButton size='md' leadingIcon='block' onClick={() => { setCancelReason(''); setCancelError(''); setCancelOpen(true); }}>
              ยกเลิกแบบคัดกรอง
            </NeutralSubdueButton>
          ) : null}
        </SubHeader>

        <Popup
          open={leaveOpen}
          onClose={() => setLeaveOpen(false)}
          title='ยังไม่ได้บันทึกแบบคัดกรอง'
          subtitle={`${visit.name} · HN ${visit.hn}`}
          tertiaryAction={{ label: 'ละทิ้งร่างและออก', onClick: leaveDiscard }}
          primaryAction={{ label: 'บันทึกร่างและออก', onClick: leaveKeepDraft }}
        >
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
            มีข้อมูลที่ยังไม่ได้บันทึกในแบบคัดกรอง — บันทึกเป็นร่างไว้ทำต่อ (แสดงในแท็บ "ที่ร่างไว้" ของหน้าคิว)
            หรือละทิ้งการเปลี่ยนแปลงทั้งหมด
          </span>
        </Popup>

        <Popup
          open={cancelOpen}
          onClose={() => setCancelOpen(false)}
          title='ยกเลิกแบบคัดกรอง'
          subtitle={`${visit.name} · HN ${visit.hn}`}
          tertiaryAction={{ label: 'ปิด', onClick: () => setCancelOpen(false) }}
          primaryAction={{ label: 'ยืนยันยกเลิก', onClick: confirmCancel, tone: 'danger' }}
        >
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
            <NoticeBar tone='warning' icon='warning'>
              ระบบไม่ลบข้อมูล แต่จะทำเครื่องหมายว่ายกเลิกพร้อมเหตุผล ผู้ยกเลิก และเวลา — กู้คืนได้
            </NoticeBar>
            <SuggestibleTextarea
              voice
              label='เหตุผลการยกเลิก'
              required
              value={cancelReason}
              onChange={(e) => { setCancelReason(e?.target ? e.target.value : e); setCancelError(''); }}
              placeholder='เช่น บันทึกผิดคน ต้องบันทึกใหม่'
              suggestions={['บันทึกผิดคน ต้องบันทึกใหม่', 'ผู้รับบริการขอยกเลิกการคัดกรอง', ...CANCEL_REASON_SUGGESTIONS]}
              minChars={2}
            />
            {cancelError ? (
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-danger-secondary, #DC2626)' }}>
                {cancelError}
              </span>
            ) : null}
          </div>
        </Popup>

        <PatientCard
          sticky
          showBack={false}
          patient={patient}
          title={`แบบคัดกรอง · ${visit.programName}`}
          tags={(
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
              <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{visit.orderNo}</ColorfulBadge>
              <ColorfulBadge style='grey' size='small' hierarchy='secondary'>{`ครั้งที่ ${visit.round || 1}`}</ColorfulBadge>
              {screeningHasConfidential(form) ? (
                <ColorfulBadge style='red' size='small' hierarchy='secondary' icon='lock'>มีข้อมูลลับ §1.4.2</ColorfulBadge>
              ) : null}
              {summary.length > 0 ? (
                <ColorfulBadge style='indigo' size='small' hierarchy='secondary'>{`คัดกรองแล้ว ${summary.length}/7 แบบ`}</ColorfulBadge>
              ) : null}
            </div>
          )}
        />

        <main className='flex-1 min-w-0 flex flex-col' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
          <div
            className={`w-full sticky ${MIH_CHROME_MORPH_STEP_BAND}`}
            style={{
              top: 'var(--dim-space-0)',
              zIndex: 1100,
              background: 'var(--surface-card-100)',
            }}
          >
            <PageHeaderInfoPanel dense={WIZARD_MORPH_SHELL_PROPS.headerInfoDense}>
              <WizardMorphHeader
                title='แบบคัดกรอง 7 แบบ'
                steps={CHECKUP_SCREENING_STEPS}
                current={stepIndex}
                completedSteps={completedSteps}
                onStepClick={goStep}
              />
            </PageHeaderInfoPanel>
          </div>

          <PageBody gap='var(--dim-space-400)'>
            {cancelled ? (
              <NoticeBar
                tone='danger'
                icon='block'
                trailing={(
                  <BrandSubdueButton variant='outline' size='sm' leadingIcon='restart_alt' onClick={() => { restoreScreening(visitId); setTick((t) => t + 1); setMode('edit'); }}>
                    กู้คืนแบบคัดกรอง
                  </BrandSubdueButton>
                )}
              >
                {`แบบคัดกรองนี้ถูกยกเลิกแล้ว — เหตุผล: ${record?.cancelReason || '—'} (อ่านอย่างเดียว)`}
              </NoticeBar>
            ) : null}

            {resumeBanner && !saved ? (
              <NoticeBar
                tone='brand'
                icon='history'
                trailing={(
                  <button type='button' aria-label='ปิดการแจ้งเตือน' onClick={() => setResumeBanner(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                    <Icon name='close' size={16} />
                  </button>
                )}
              >
                {`กลับมาทำต่อจากร่างที่บันทึกไว้${initial.draftSavedAt ? ` (${formatThaiDateTime(initial.draftSavedAt)})` : ''} — เริ่มที่แบบคัดกรอง "${CHECKUP_SCREENING_STEPS[initial.stepIndex].title}"`}
              </NoticeBar>
            ) : null}

            {mode === 'view' && !cancelled ? (
              <NoticeBar
                tone='neutral'
                icon='visibility'
                trailing={(
                  <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={() => { setMode('edit'); setSaved(false); setResumeBanner(false); }}>
                    แก้ไขแบบคัดกรอง
                  </BrandSubdueButton>
                )}
              >
                {`แสดงแบบคัดกรองที่บันทึกแล้ว (อ่านอย่างเดียว)${initial.savedRecord ? ` · บันทึกโดย ${initial.savedRecord.savedBy} · ${formatThaiDateTime(initial.savedRecord.savedAt)}` : ''}`}
              </NoticeBar>
            ) : null}

            {saved ? (
              <NoticeBar tone='success' icon='check_circle'>
                บันทึกแบบคัดกรองเรียบร้อยแล้ว — ผลจะปรากฏในรายงานสรุปกิจกรรมรายวัน (ส่วนการบันทึกคัดกรอง)
              </NoticeBar>
            ) : null}

            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
              <TabCapsule variant='filter' label='บันทึกรายบุคคล' selected={panelMode === 'person'} onClick={() => setPanelMode('person')} />
              <TabCapsule variant='filter' label='บันทึกแบบกลุ่ม' selected={panelMode === 'group'} onClick={() => setPanelMode('group')} />
              <div className='flex-1' />
              {summary.length > 0 ? (
                <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
                  {`สรุปที่บันทึกไว้: ${summary.join(' · ')}`}
                </span>
              ) : null}
            </div>

            <PageCard>
              {panelMode === 'person' ? (
                <>
                  {stepError ? <NoticeBar tone='danger' icon='error'>{stepError}</NoticeBar> : null}
                  <ActiveStep
                    form={form}
                    setSection={setSection}
                    setForm={setForm}
                    visit={visit}
                    locked={locked}
                  />
                  {record && !cancelled ? <CheckupAuditBar record={record} /> : null}
                </>
              ) : (
                <CheckupGroupScreeningPanel
                  form={form}
                  currentVisit={visit}
                  onApplied={(n) => { setGroupToast(`ใช้ผลคัดกรองชุดนี้กับสมาชิก ${n} รายแล้ว`); setTick((t) => t + 1); }}
                />
              )}
            </PageCard>

            {groupToast ? (
              <NoticeBar
                tone='success'
                icon='check_circle'
                trailing={(
                  <button type='button' aria-label='ปิดการแจ้งเตือน' onClick={() => setGroupToast('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                    <Icon name='close' size={16} />
                  </button>
                )}
              >
                {groupToast}
              </NoticeBar>
            ) : null}
          </PageBody>

          {panelMode === 'person' ? (
            <div
              className={`flex items-center w-full ${MIH_CHROME_MORPH_FOOTER}`}
              style={{
                gap: 'var(--dim-space-300)',
                paddingTop: 'var(--dim-space-400)',
                paddingBottom: 'var(--dim-space-400)',
                paddingLeft: 'var(--dim-space-600)',
                paddingRight: 'var(--dim-space-600)',
                borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                background: 'var(--surface-navigation-default)',
                boxShadow: 'var(--shadow-brand-drop-top-100)',
                position: 'sticky',
                bottom: 'var(--dim-space-0)',
                zIndex: 60,
              }}
            >
              <NeutralSubdueButton
                size='lg'
                leadingIcon={stepIndex === 0 ? undefined : 'arrow_back'}
                onClick={() => (stepIndex === 0 ? handleLeave() : goStep(stepIndex - 1))}
              >
                {stepIndex === 0 ? 'ยกเลิก' : 'ย้อนกลับ'}
              </NeutralSubdueButton>
              {stepIndex > 0 && (
                <span
                  className='inline-flex items-center min-w-0'
                  style={{
                    gap: 'var(--dim-space-200)',
                    color: 'var(--text-content-secondary)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm)',
                  }}
                >
                  <span style={{
                    width: 6, height: 6, borderRadius: 'var(--dim-radius-full)',
                    background: 'var(--text-brandPrimary-default)',
                    flexShrink: 0,
                  }} />
                  {`แบบคัดกรองที่ ${stepIndex + 1} จาก ${CHECKUP_SCREENING_STEPS.length} · ${CHECKUP_SCREENING_STEPS[stepIndex].title}`}
                </span>
              )}
              <div className='flex-1' />
              <BrandSubdueButton
                variant='outline'
                size='lg'
                leadingIcon='save'
                disabled={locked}
                onClick={() => { saveCheckupDraft(DRAFT_KIND, visitId, form, stepIndex); setGroupToast('บันทึกร่างแบบคัดกรองแล้ว'); }}
              >
                บันทึกร่าง
              </BrandSubdueButton>
              {isLast ? (
                <BrandPrimaryButton size='lg' trailingIcon='check' onClick={confirmSave} disabled={locked}>
                  ยืนยันบันทึกแบบคัดกรอง
                </BrandPrimaryButton>
              ) : (
                <BrandPrimaryButton size='lg' trailingIcon='arrow_forward' onClick={() => goStep(stepIndex + 1)}>
                  {`ถัดไป: ${CHECKUP_SCREENING_STEPS[stepIndex + 1].title}`}
                </BrandPrimaryButton>
              )}
            </div>
          ) : null}
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default CheckupScreeningPage;
