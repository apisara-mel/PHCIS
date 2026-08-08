import React, { useMemo, useRef, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header, { SubHeader } from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PatientCard from '@/components/card/PatientCard';
import TreatmentFormShell from '@/templates/TreatmentFormShell';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Popup from '@/components/popup/Popup';
import Icon from '@/components/icons/Icon';
import { getPatientByHN, DEFAULT_PATIENT } from '@/data/patientProfiles';
import {
  EMPTY_RECORD, getVisit, getVisitRecord, saveVisitRecord, formatThaiDate,
  formatThaiDateTime, getCheckupDraft, saveCheckupDraft, clearCheckupDraft,
  generateSummaryDraft, listVisitsByHn, getPackage,
} from '@/data/checkupStore';
import {
  CHECKUP_RECORD_STEPS, CHECKUP_RECORD_RENDERERS, getCheckupRecordCompletedSteps,
} from '@/pages/checkup/CheckupRecordSteps';
import { PageBody, PageCard, EmptyState, NoticeBar } from '@/pages/checkup/CheckupUi';

/* CheckupRecordPage — บันทึกผลตรวจสุขภาพ (HCIS §2.13.3).
   Wizard chrome comes from TreatmentFormShell → RecordWizardMorphBand, the
   canonical sticky scroll-morph header + StepProgress pattern.

   TOR 1.19.14 / .15 / .16 / .17 / .18 / .19 — see CheckupRecordSteps.jsx.

   All four verbs:
     แสดง   — a saved visit opens read-only with a view banner
     บันทึก — step 4 "ยืนยันบันทึกผลตรวจสุขภาพ"
     แก้ไข  — "แก้ไขบันทึก" reopens, and the store stamps ผู้แก้ + เวลา
     ยกเลิก — leaving with unsaved changes prompts บันทึกร่าง / ละทิ้ง */

const breadcrumb = ['ระบบงานตรวจสุขภาพ', 'บันทึกผลตรวจสุขภาพ'];
const QUEUE_PATH = '/checkup';
const DRAFT_KIND = 'record';

const cloneEmpty = () => JSON.parse(JSON.stringify(EMPTY_RECORD));

const CheckupRecordPage = () => {
  const history = useHistory();
  const { visitId } = useParams();

  const visit = useMemo(() => getVisit(visitId), [visitId]);

  const initial = useMemo(() => {
    const draft = getCheckupDraft(DRAFT_KIND, visitId);
    if (draft) {
      return { mode: 'draft', form: { ...cloneEmpty(), ...draft.form }, stepIndex: draft.stepIndex ?? 0, draftSavedAt: draft.savedAt };
    }
    const saved = getVisitRecord(visitId);
    if (saved) {
      return { mode: 'view', form: { ...cloneEmpty(), ...saved }, stepIndex: 0, savedRecord: saved };
    }
    return { mode: 'new', form: cloneEmpty(), stepIndex: 0 };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [visitId]);

  const [mode, setMode] = useState(initial.mode);
  const [stepIndex, setStepIndex] = useState(initial.stepIndex);
  const [form, setFormState] = useState(initial.form);
  const [saved, setSaved] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [resumeBanner, setResumeBanner] = useState(initial.mode === 'draft');
  const seedJson = useRef(JSON.stringify(initial.form));

  const locked = mode === 'view' || saved;
  const dirty = !saved && JSON.stringify(form) !== seedJson.current;

  const patient = useMemo(
    () => (visit?.hn && getPatientByHN(visit.hn)) || DEFAULT_PATIENT,
    [visit],
  );

  const otherRounds = useMemo(
    () => (visit ? listVisitsByHn(visit.hn).filter((v) => v.programName === visit.programName && v.id !== visit.id) : []),
    [visit],
  );
  const openPrevRound = otherRounds.find((v) => v.statusKey !== 'summarised' && v.statusKey !== 'cancelled');

  const setForm = (updater) => {
    setFormState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (!locked) saveCheckupDraft(DRAFT_KIND, visitId, next, stepIndex);
      return next;
    });
  };

  const handleStepChange = (idx) => {
    setStepIndex(idx);
    if (!locked && dirty) saveCheckupDraft(DRAFT_KIND, visitId, form, idx);
  };

  const confirmSave = () => {
    const auto = generateSummaryDraft(visit, form);
    saveVisitRecord(visitId, {
      ...form,
      adviceAuto: form.adviceAuto || auto.adviceAuto,
      autoVerdict: auto.verdict,
      savedBy: visit?.doctor,
    });
    clearCheckupDraft(DRAFT_KIND, visitId);
    seedJson.current = JSON.stringify(form);
    setSaved(true);
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

  const startEdit = () => {
    setMode('edit');
    setSaved(false);
    setResumeBanner(false);
  };

  if (!visit) {
    return (
      <div className='flex w-full min-h-screen' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
        <Sidebar activeKey='checkup' />
        <div className='flex-1 min-w-0 flex flex-col'>
          <Header breadcrumb={breadcrumb} standalone={false} />
          <SubHeader title='บันทึกผลตรวจสุขภาพ' onBack={() => history.push(QUEUE_PATH)} backLabel='กลับไปคิว' hideBottomBorder />
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

  const ActiveStep = CHECKUP_RECORD_RENDERERS[stepIndex];
  const completedSteps = getCheckupRecordCompletedSteps(form, stepIndex);

  return (
    <div className='flex w-full min-h-screen' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
      <Sidebar activeKey='checkup' />
      <div className='flex-1 min-w-0 flex flex-col'>
        <Header breadcrumb={breadcrumb} standalone={false} />
        <SubHeader
          title={`บันทึกผลตรวจสุขภาพ — ${visit.orderNo}`}
          onBack={handleLeave}
          backLabel='กลับไปคิว'
          hideBottomBorder
        >
          <NeutralSubdueButton size='md' leadingIcon='checklist' onClick={() => history.push(`/checkup/screening/${visit.id}`)}>
            แบบคัดกรอง
          </NeutralSubdueButton>
          <NeutralSubdueButton size='md' leadingIcon='history' onClick={() => history.push(`/checkup/history/${visit.hn}`)}>
            ผลตรวจย้อนหลัง
          </NeutralSubdueButton>
          <BrandSubdueButton variant='outline' size='md' leadingIcon='description' onClick={() => history.push(`/checkup/report/${visit.id}`)}>
            รายงานผลรายบุคคล
          </BrandSubdueButton>
        </SubHeader>

        <Popup
          open={leaveOpen}
          onClose={() => setLeaveOpen(false)}
          title='ยังไม่ได้บันทึกผลตรวจ'
          subtitle={`${visit.name} · HN ${visit.hn} · ${visit.orderNo}`}
          tertiaryAction={{ label: 'ละทิ้งร่างและออก', onClick: leaveDiscard }}
          primaryAction={{ label: 'บันทึกร่างและออก', onClick: leaveKeepDraft }}
        >
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
            มีข้อมูลที่ยังไม่ได้บันทึกในแบบบันทึกผลตรวจสุขภาพ — บันทึกเป็นร่างไว้ทำต่อ
            (จะปรากฏในแท็บ "ที่ร่างไว้" ของหน้าคิว) หรือละทิ้งการเปลี่ยนแปลงทั้งหมด
          </span>
        </Popup>

        <PatientCard
          sticky
          showBack={false}
          patient={patient}
          title={`บันทึกผลตรวจสุขภาพ · ${visit.programName}`}
          tags={(
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
              <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{visit.orderNo}</ColorfulBadge>
              <ColorfulBadge style={(visit.round || 1) > 1 ? 'indigo' : 'grey'} size='small' hierarchy='secondary'>
                {`ครั้งที่ ${visit.round || 1} ของโปรแกรม`}
              </ColorfulBadge>
              <ColorfulBadge style='grey' size='small' hierarchy='secondary'>{`ชุดตรวจ: ${getPackage(visit.packageId)?.code || visit.packageId}`}</ColorfulBadge>
            </div>
          )}
          actions={(
            <div className='flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
              {!locked ? (
                <NeutralSubdueButton size='sm' leadingIcon='block' onClick={handleLeave}>
                  ยกเลิกการบันทึก
                </NeutralSubdueButton>
              ) : null}
            </div>
          )}
        />

        {visit.rightsValid === false ? (
          <PageBody gap='var(--dim-space-300)'>
            <NoticeBar tone='warning' icon='warning'>
              {`สิทธิการรักษาของผู้รับบริการหมดอายุ (${visit.rights}) — ยังบันทึกผลตรวจได้ แต่โปรดแจ้งผู้รับบริการติดต่องานสิทธิประโยชน์ก่อนกลับ`}
            </NoticeBar>
          </PageBody>
        ) : null}

        {openPrevRound ? (
          <PageBody gap='var(--dim-space-300)'>
            <NoticeBar
              tone='warning'
              icon='warning'
              trailing={(
                <BrandSubdueButton variant='outline' size='sm' leadingIcon='open_in_new' onClick={() => history.push(`/checkup/record/${openPrevRound.id}`)}>
                  เปิดครั้งก่อน
                </BrandSubdueButton>
              )}
            >
              {`ครั้งที่ ${openPrevRound.round || 1} ของโปรแกรมนี้ (${formatThaiDate(openPrevRound.visitDate)}) ยังไม่สรุปผล — ตรวจสอบก่อนบันทึกครั้งนี้`}
            </NoticeBar>
          </PageBody>
        ) : null}

        {resumeBanner && !saved ? (
          <PageBody gap='var(--dim-space-300)'>
            <NoticeBar
              tone='brand'
              icon='history'
              trailing={(
                <button
                  type='button'
                  aria-label='ปิดการแจ้งเตือน'
                  onClick={() => setResumeBanner(false)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}
                >
                  <Icon name='close' size={16} />
                </button>
              )}
            >
              {`กลับมาทำต่อจากร่างที่บันทึกไว้${initial.draftSavedAt ? ` (${formatThaiDateTime(initial.draftSavedAt)})` : ''} — เริ่มที่ขั้นตอนที่ ${initial.stepIndex + 1}: ${CHECKUP_RECORD_STEPS[initial.stepIndex].title}`}
            </NoticeBar>
          </PageBody>
        ) : null}

        {mode === 'view' ? (
          <PageBody gap='var(--dim-space-300)'>
            <NoticeBar
              tone='neutral'
              icon='visibility'
              trailing={(
                <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={startEdit}>
                  แก้ไขบันทึก
                </BrandSubdueButton>
              )}
            >
              {`แสดงผลตรวจที่บันทึกแล้ว (อ่านอย่างเดียว)${initial.savedRecord ? ` · บันทึกโดย ${initial.savedRecord.savedBy} · ${formatThaiDateTime(initial.savedRecord.savedAt)}` : ''}${initial.savedRecord?.editedAt ? ` · แก้ไขล่าสุด ${formatThaiDateTime(initial.savedRecord.editedAt)} โดย ${initial.savedRecord.editedBy}` : ''}`}
            </NoticeBar>
          </PageBody>
        ) : null}

        {saved ? (
          <PageBody gap='var(--dim-space-300)'>
            <NoticeBar
              tone='success'
              icon='check_circle'
              trailing={(
                <BrandSubdueButton variant='fill' size='sm' leadingIcon='description' onClick={() => history.push(`/checkup/report/${visit.id}`)}>
                  ไปออกรายงานผลรายบุคคล
                </BrandSubdueButton>
              )}
            >
              บันทึกผลตรวจสุขภาพเรียบร้อยแล้ว — ขั้นตอนถัดไปคือให้แพทย์ตรวจสอบและอนุมัติรายงานผลรายบุคคล
            </NoticeBar>
          </PageBody>
        ) : null}

        <TreatmentFormShell
          morphTitle='บันทึกผลตรวจสุขภาพ'
          stepIndex={stepIndex}
          onStepChange={handleStepChange}
          completedSteps={completedSteps}
          steps={CHECKUP_RECORD_STEPS}
          queuePath={QUEUE_PATH}
          step0FlushLeft={false}
          onLeave={handleLeave}
          fromDepartment='งานตรวจสุขภาพ'
          onFinish={() => {
            if (!saved && !locked) confirmSave();
            return true;
          }}
        >
          <ActiveStep
            form={form}
            setForm={setForm}
            visit={visit}
            locked={locked}
            saved={saved}
            onConfirmSave={confirmSave}
          />
        </TreatmentFormShell>

        <Footer />
      </div>
    </div>
  );
};

export default CheckupRecordPage;
