import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header, { SubHeader } from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Icon from '@/components/icons/Icon';
import PatientCard from '@/components/card/PatientCard';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import TreatmentFormShell from '@/templates/TreatmentFormShell';
import {
  DentalStep1History, DentalStep2Chart, DentalStep3Diagnosis,
  DentalStep4Procedures, DentalStep5Orders, DentalStep6Appointment,
  DentalStep7Certificate, validateDentalRecord, buildDentalSavePayload,
} from '@/pages/clinic/dental/DentalSteps';
import { DentalAccessDeniedCard, Note } from '@/pages/clinic/dental/dentalShared';
import { findMrPatientByHn, DEFAULT_MR_PATIENT } from '@/data/mrPatients';
import { getPatientByHN, DEFAULT_PATIENT } from '@/data/patientProfiles';
import {
  buildDentalVisitForm,
  getDentalCompletedSteps,
  saveDentalVisitRecord,
  findDentalQueueRowByHn,
  cancelDentalVisit,
  reactivateDentalVisit,
  getDentalCancellation,
  recordDentalReopen,
  getDentalReopenAudit,
  formatDentalDateTime,
  dentalWorkTypeLabelOf,
  CURRENT_DENTAL_USER,
  DENTAL_CANCEL_REASON_SUGGESTIONS,
  DENTAL_REOPEN_REASON_SUGGESTIONS,
} from '@/data/dentalVisits';

/* DentalFormPage — บันทึกทันตกรรม (TOR §1.10.1.1 + §1.10.1.2)
   ที่ /clinic/dental/record. Shell บาง ๆ ตาม pattern AncFormPage /
   NcdFormPage: ถือ form-state ก้อนเดียวข้าม 7 ขั้นตอน (seed จาก
   buildDentalVisitForm) แล้วส่งให้ DentalSteps เรนเดอร์ทีละขั้น ผ่าน
   TreatmentFormShell (StepProgress + sticky footer).

   ครบทั้ง 4 กริยาของ TOR:
     • แสดง   — ฟอร์ม 7 ขั้น + PatientCard (ข้อมูลผู้รับบริการ/รูป/แพ้ยา/
                โรคประจำตัว/สิทธิ) + read-only เมื่อ visit ปิดแล้ว/ถูกยกเลิก
     • บันทึก — บันทึกร่าง และ ยืนยันบันทึก (validate วินิจฉัย ≥1 +
                CC + ความถูกต้องของแถวหัตถการ) ผ่าน saveDentalVisitRecord
                ซึ่ง stamp savedBy/savedAt ให้เอง
     • แก้ไข  — visit ที่ตรวจเสร็จแล้วเปิดมาเป็น read-only ต้องกด "แก้ไข"
                พร้อมระบุเหตุผล → recordDentalReopen แล้วแบนเนอร์ audit ค้าง
     • ยกเลิก — Popup เหตุผลบังคับ → cancelDentalVisit (helper ตัวเดียวกับ
                หน้าคิว จึงเห็นสถานะตรงกัน) + ปุ่มเปิดใช้งานคืน

   หมายเหตุ HN: ทุกการบันทึก key ด้วย `dentalHn` = navState.hn เสมอ
   ไม่ใช่ cardPatient.hn — ถ้า HN ไม่มีใน PATIENT_PROFILES การ์ดจะ fallback
   เป็น DEFAULT_PATIENT ซึ่งเป็นคนละคน การ key ด้วย cardPatient.hn จะเขียน
   ทับบันทึกของ HN 67-00001 (บั๊กที่ AncFormPage เตือนไว้). */

const breadcrumb = ['บันทึกการรักษา', 'งานทันตกรรม', 'บันทึกทันตกรรม'];

const DENTAL_STEPS = [
  { title: 'ประวัติและข้อมูลประกอบ', subtitle: 'Medical History' },
  { title: 'การตรวจฟัน', subtitle: 'Dental Chart' },
  { title: 'วินิจฉัย', subtitle: 'Diagnosis' },
  { title: 'หัตถการและวัสดุ', subtitle: 'Procedures' },
  { title: 'คำสั่งทางการแพทย์', subtitle: 'Orders / CPOE' },
  { title: 'นัดหมาย', subtitle: 'Appointment' },
  { title: 'ใบรับรองแพทย์', subtitle: 'Certificate' },
];

/* index ของแต่ละขั้น ให้คอมโพเนนต์กลางของ OPD กระโดดข้ามขั้นได้ถูกตำแหน่ง
   (Step5Orders / Step7Certificate อ่านคีย์เหล่านี้จาก `stepIndexes`) */
const DENTAL_STEP_INDEXES = {
  history: 0,
  examination: 1,
  diagnosis: 2,
  orders: 4,
  appointment: 5,
  documents: 6,
};

const DentalFormPage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();

  /* ── ตัวตนผู้รับบริการ (สองรูปแบบ เหมือน AncFormPage/NcdFormPage) ── */
  const patient = useMemo(() => {
    const p = (navState && findMrPatientByHn(navState.hn)) || DEFAULT_MR_PATIENT;
    return { ...p, queue: navState?.queue, name: navState?.name || `${p.firstNameTh} ${p.lastNameTh}` };
  }, [navState]);

  const cardPatient = useMemo(
    () => (navState?.hn && getPatientByHN(navState.hn)) || DEFAULT_PATIENT,
    [navState?.hn],
  );
  /* คีย์บันทึก — HN ที่คิวส่งมาเสมอ (ดูหมายเหตุหัวไฟล์) */
  const dentalHn = navState?.hn || null;
  const openedFromQueue = !!navState?.hn;

  const queueRow = useMemo(() => (dentalHn ? findDentalQueueRowByHn(dentalHn) : null), [dentalHn]);

  const [stepIndex, setStepIndex] = useState(0);

  const seed = useMemo(() => buildDentalVisitForm(dentalHn), [dentalHn]);
  const [form, setForm] = useState(seed.form);
  const seedSnapshotRef = useRef(JSON.stringify(seed.form));

  /* visit ที่ตรวจเสร็จแล้วเปิดมาเป็น read-only จนกว่าจะกด "แก้ไข" */
  const [reopened, setReopened] = useState(() => !!getDentalReopenAudit(dentalHn));
  const [reopenAudit, setReopenAudit] = useState(() => getDentalReopenAudit(dentalHn));
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenError, setReopenError] = useState('');

  /* ยกเลิก / เปิดใช้งาน — sessionStorage ก้อนเดียวกับหน้าคิว */
  const [cancellation, setCancellation] = useState(() => getDentalCancellation(dentalHn));
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const [saveState, setSaveState] = useState({});
  const [confirmError, setConfirmError] = useState('');
  const [flagged, setFlagged] = useState(false);

  /* กันทิ้งร่าง — บล็อกการออกจากหน้าเมื่อฟอร์มเปลี่ยนไปจาก seed แล้วยัง
     ไม่ได้บันทึก (ครอบคลุมทั้งปุ่ม "ยกเลิก" ที่ขั้นแรกของ TreatmentFormShell
     และการกดย้อนกลับที่หัวการ์ด) */
  const [pendingNav, setPendingNav] = useState(null);
  const allowNavRef = useRef(false);

  const readOnly = !!cancellation || (seed.isCompleted && !reopened);
  const dirty = !readOnly
    && JSON.stringify(form) !== seedSnapshotRef.current
    && !saveState.confirmedAt;

  useEffect(() => {
    if (!dirty) return undefined;
    /* history v4/v5: prompt ที่คืนค่า `false` จะบล็อก transition เงียบ ๆ
       (ไม่เรียก window.confirm) — เราจึงเปิด AlertDialog ของ DS แทน */
    const unblock = history.block((location, action) => {
      if (allowNavRef.current) return undefined;
      setPendingNav({ location, action });
      return false;
    });
    return unblock;
  }, [dirty, history]);

  const leavePending = () => {
    const target = pendingNav?.location;
    allowNavRef.current = true;
    setPendingNav(null);
    if (target) history.push(target.pathname || '/clinic/dental', target.state);
    else history.push('/clinic/dental');
  };

  const completedSteps = useMemo(
    () => getDentalCompletedSteps(form, stepIndex),
    [form, stepIndex],
  );

  /* ── บันทึกร่าง / ยืนยัน ─────────────────────────────────────────── */
  const handleSaveDraft = () => {
    if (readOnly || !dentalHn) return;
    const at = formatDentalDateTime();
    setSaveState((s) => ({ ...s, draftAt: at, by: CURRENT_DENTAL_USER }));
    setConfirmError('');
    seedSnapshotRef.current = JSON.stringify(form);
  };

  const handleConfirm = () => {
    if (readOnly || !dentalHn) return;
    const problem = validateDentalRecord(form);
    if (problem) {
      setConfirmError(problem.message);
      setStepIndex(problem.stepIndex);
      return;
    }
    setConfirmError('');
    const record = saveDentalVisitRecord(dentalHn, buildDentalSavePayload(form));
    seedSnapshotRef.current = JSON.stringify(form);
    setSaveState((s) => ({
      ...s,
      confirmedAt: record?.savedAt || formatDentalDateTime(),
      by: record?.savedBy || CURRENT_DENTAL_USER,
    }));
  };

  /* ── ยกเลิก / เปิดใช้งาน ─────────────────────────────────────────── */
  const confirmCancel = () => {
    if (!cancelReason.trim()) {
      setCancelError('ต้องระบุเหตุผลการยกเลิกก่อนยืนยัน');
      return;
    }
    cancelDentalVisit(dentalHn, cancelReason.trim());
    setCancellation(getDentalCancellation(dentalHn));
    setCancelOpen(false);
  };
  const handleReactivate = () => {
    reactivateDentalVisit(dentalHn);
    setCancellation(null);
  };

  /* ── แก้ไข visit ที่ปิดแล้ว ──────────────────────────────────────── */
  const confirmReopen = () => {
    if (!reopenReason.trim()) {
      setReopenError('ต้องระบุเหตุผลการแก้ไขก่อนยืนยัน');
      return;
    }
    recordDentalReopen(dentalHn, reopenReason.trim());
    setReopenAudit(getDentalReopenAudit(dentalHn));
    setReopened(true);
    setReopenOpen(false);
  };

  /* ── สิทธิ์ไม่พอ: การ์ดล็อกแทนฟอร์มทั้งหมด ──────────────────────── */
  const restricted = !!queueRow?.restricted;

  const stepProps = {
    form,
    setForm,
    patient,
    cardPatient,
    hn: dentalHn,
    readOnly,
    insurance: cardPatient?.insurance,
    onStepChange: setStepIndex,
    stepIndexes: DENTAL_STEP_INDEXES,
  };

  const renderStep = () => {
    switch (stepIndex) {
      case 0: return <DentalStep1History {...stepProps} />;
      case 1: return <DentalStep2Chart {...stepProps} />;
      case 2: return (
        <DentalStep3Diagnosis
          {...stepProps}
          confirmError={confirmError}
          onGoToProcedures={() => setStepIndex(3)}
        />
      );
      case 3: return <DentalStep4Procedures {...stepProps} />;
      case 4: return <DentalStep5Orders {...stepProps} />;
      case 5: return <DentalStep6Appointment {...stepProps} />;
      default: return (
        <DentalStep7Certificate
          {...stepProps}
          saveState={saveState}
          confirmError={confirmError}
            onSaveDraft={handleSaveDraft}
          onConfirm={handleConfirm}
        />
      );
    }
  };

  return (
    <ClinicFilterProvider>
      <div className='flex w-full min-h-screen' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
        <Sidebar activeKey='treat' />
        <div className='flex-1 min-w-0 flex flex-col'>
          <Header breadcrumb={breadcrumb} standalone={false} />
          <SubHeader title='บันทึกทันตกรรม (Dental Record)' hideBottomBorder />

          {/* ยกเลิกการบันทึก — เหตุผลบังคับ + audit ผู้ยกเลิก/เวลา */}
          <Popup
            open={cancelOpen}
            onClose={() => setCancelOpen(false)}
            title='ยกเลิกการบันทึกทันตกรรม'
            subtitle={`${cardPatient?.fullName || patient.name} · HN: ${dentalHn || '—'}`}
            tertiaryAction={{ label: 'ปิด', onClick: () => setCancelOpen(false) }}
            primaryAction={{ label: 'ยืนยันยกเลิกการบันทึก', onClick: confirmCancel, tone: 'danger' }}
          >
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
              <SuggestibleTextarea
                voice
                label='เหตุผลการยกเลิก'
                required
                value={cancelReason}
                onChange={(e) => { setCancelReason(e?.target?.value ?? ''); if (cancelError) setCancelError(''); }}
                suggestions={DENTAL_CANCEL_REASON_SUGGESTIONS}
                minChars={2}
                height={120}
                minHeight={96}
                placeholder='เช่น ผู้รับบริการขอยุติการรักษากลางคัน / บันทึกผิดคน'
              />
              {cancelError && (
                <span
                  className='inline-flex items-center'
                  style={{
                    gap: 'var(--dim-space-100)',
                    color: 'var(--text-danger-default, #C72121)',
                    fontSize: 'var(--type-size-sm)',
                  }}
                >
                  <Icon name='error' size={14} />
                  {cancelError}
                </span>
              )}
            </div>
          </Popup>

          {/* แก้ไขบันทึกที่ปิดแล้ว — เหตุผลบังคับ */}
          <Popup
            open={reopenOpen}
            onClose={() => setReopenOpen(false)}
            title='แก้ไขบันทึกที่ตรวจเสร็จแล้ว'
            subtitle='ระบุเหตุผลการแก้ไข — ระบบจะเก็บผู้แก้ไขและเวลาไว้ในประวัติการเข้าถึง'
            tertiaryAction={{ label: 'ปิด', onClick: () => setReopenOpen(false) }}
            primaryAction={{ label: 'เปิดแก้ไขบันทึก', onClick: confirmReopen }}
          >
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
              <SuggestibleTextarea
                voice
                label='เหตุผลการแก้ไข'
                required
                value={reopenReason}
                onChange={(e) => { setReopenReason(e?.target?.value ?? ''); if (reopenError) setReopenError(''); }}
                suggestions={DENTAL_REOPEN_REASON_SUGGESTIONS}
                minChars={2}
                height={120}
                minHeight={96}
                placeholder='เช่น แก้ไขตำแหน่งฟันที่บันทึกผิดซี่'
              />
              {reopenError && (
                <span
                  className='inline-flex items-center'
                  style={{
                    gap: 'var(--dim-space-100)',
                    color: 'var(--text-danger-default, #C72121)',
                    fontSize: 'var(--type-size-sm)',
                  }}
                >
                  <Icon name='error' size={14} />
                  {reopenError}
                </span>
              )}
            </div>
          </Popup>

          {/* กันทิ้งร่างที่ยังไม่บันทึก */}
          <AlertDialog
            open={!!pendingNav}
            type='warning'
            title='ออกจากหน้าโดยยังไม่บันทึก?'
            description='ข้อมูลที่กรอกไว้ในแบบฟอร์มบันทึกทันตกรรมจะหายไปทั้งหมด — กด "บันทึกร่าง" ก่อนออกเพื่อเก็บไว้ทำต่อ'
            cancelLabel='ออกโดยไม่บันทึก'
            confirmLabel='อยู่หน้าเดิม'
            onCancel={leavePending}
            onConfirm={() => setPendingNav(null)}
            onClose={() => setPendingNav(null)}
          />

          <PatientCard
            sticky
            showBack={false}
            patient={cardPatient}
            title='บันทึกทันตกรรม (Dental Record)'
            drugAllergies={patient.drugAllergies}
            chronicDiseases={patient.chronicDiseases}
            tags={queueRow ? (
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{`คิว ${queueRow.queue}`}</ColorfulBadge>
                <ColorfulBadge style='indigo' size='small' hierarchy='secondary'>
                  {dentalWorkTypeLabelOf(queueRow.workType)}
                </ColorfulBadge>
                <ColorfulBadge style='grey' size='small' hierarchy='secondary'>{queueRow.clinic}</ColorfulBadge>
                <ColorfulBadge style='grey' size='small' hierarchy='secondary'>{queueRow.doctor}</ColorfulBadge>
                <ColorfulBadge style='grey' size='small' hierarchy='secondary'>{`เวลามาตรวจ ${queueRow.visitTime}`}</ColorfulBadge>
              </div>
            ) : null}
            actions={restricted ? null : (
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                <NeutralSubdueButton
                  leadingIcon={flagged ? 'flag' : 'outlined_flag'}
                  onClick={() => setFlagged((v) => !v)}
                >
                  {flagged ? 'ยกเลิก Flag ผู้รับบริการ' : 'Flag ผู้รับบริการ'}
                </NeutralSubdueButton>
                <BrandSubdueButton variant='outline' leadingIcon='print' onClick={() => window.print()}>
                  พิมพ์ใบรับรอง / สรุปการรักษา
                </BrandSubdueButton>
                {seed.isCompleted && !reopened && !cancellation && (
                  <BrandSubdueButton
                    variant='fill'
                    leadingIcon='edit'
                    onClick={() => { setReopenReason(''); setReopenError(''); setReopenOpen(true); }}
                  >
                    แก้ไขบันทึก
                  </BrandSubdueButton>
                )}
                {cancellation ? (
                  <BrandSubdueButton variant='fill' leadingIcon='restart_alt' onClick={handleReactivate}>
                    เปิดใช้งานอีกครั้ง
                  </BrandSubdueButton>
                ) : (
                  <NeutralSubdueButton
                    leadingIcon='block'
                    disabled={!openedFromQueue}
                    onClick={() => { setCancelReason(''); setCancelError(''); setCancelOpen(true); }}
                  >
                    ยกเลิกการบันทึก
                  </NeutralSubdueButton>
                )}
              </div>
            )}
          />

          {/* แบนเนอร์บริบท */}
          <div
            className='flex flex-col'
            style={{
              gap: 'var(--dim-space-200)',
              paddingTop: 'var(--dim-space-300)',
              paddingLeft: 'var(--dim-space-600)',
              paddingRight: 'var(--dim-space-600)',
            }}
          >
            {!openedFromQueue && (
              <Note
                tone='warning'
                icon='person_search'
                action={(
                  <BrandSubdueButton variant='outline' size='sm' leadingIcon='arrow_back' onClick={() => history.push('/clinic/dental')}>
                    ไปหน้าคิวทันตกรรม
                  </BrandSubdueButton>
                )}
              >
                เปิดหน้านี้โดยตรงโดยไม่ได้เลือกผู้รับบริการ — กำลังแสดงข้อมูลตัวอย่างและยังบันทึกไม่ได้
                กรุณาเปิดจากคิวทันตกรรมเพื่อเลือกผู้รับบริการ
              </Note>
            )}
            {queueRow?.confidential && !restricted && (
              <Note tone='warning' icon='lock'>
                ข้อมูลลับตามข้อ §1.4.2 — การเข้าดูและแก้ไขบันทึกนี้ถูกบันทึกลงประวัติการเข้าถึง
                (ผู้เข้าดู {CURRENT_DENTAL_USER} · {formatDentalDateTime()})
              </Note>
            )}
            {cancellation && (
              <Note
                tone='danger'
                icon='block'
                action={(
                  <BrandSubdueButton variant='fill' size='sm' leadingIcon='restart_alt' onClick={handleReactivate}>
                    เปิดใช้งาน
                  </BrandSubdueButton>
                )}
              >
                {`การบันทึกครั้งนี้ถูกยกเลิกแล้ว · ผู้ยกเลิก ${cancellation.cancelledBy} · ${cancellation.cancelledAt} · เหตุผล: ${cancellation.reason}`}
              </Note>
            )}
            {seed.isCompleted && !reopened && !cancellation && (
              <Note tone='info' icon='lock'>
                {`บันทึกนี้ตรวจเสร็จแล้ว (บันทึกโดย ${seed.saved?.savedBy || CURRENT_DENTAL_USER} · ${seed.saved?.savedAt || '—'}) — เปิดแบบอ่านอย่างเดียว กด "แก้ไขบันทึก" เพื่อแก้ไขพร้อมระบุเหตุผล`}
              </Note>
            )}
            {reopenAudit && (
              <Note tone='warning' icon='edit'>
                {`บันทึกนี้ถูกเปิดแก้ไข · ผู้แก้ไข ${reopenAudit.by} · ${reopenAudit.at} · เหตุผล: ${reopenAudit.reason}`}
              </Note>
            )}
            {dirty && (
              <Note tone='info' icon='save'>
                มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก — กด “บันทึกร่าง” ที่แถบด้านล่างหรือที่ขั้นตอนที่ 7 ก่อนออกจากหน้า
              </Note>
            )}
            {saveState.confirmedAt && (
              <Note tone='info' icon='check-circle'>
                {`ยืนยันบันทึกการรักษาแล้ว · ${saveState.by} · ${saveState.confirmedAt}`}
              </Note>
            )}
          </div>

          {restricted ? (
            <div
              className='flex flex-col w-full'
              style={{
                paddingTop: 'var(--dim-space-600)',
                paddingBottom: 'var(--dim-space-600)',
                paddingLeft: 'var(--dim-space-600)',
                paddingRight: 'var(--dim-space-600)',
              }}
            >
              <DentalAccessDeniedCard
                hn={dentalHn}
                name={cardPatient?.fullName || patient.name}
                onBack={() => history.push('/clinic/dental')}
                onRequestAccess={() => history.push('/admin/roles')}
              />
            </div>
          ) : (
            <TreatmentFormShell
              morphTitle='ทันตกรรม'
              stepIndex={stepIndex}
              onStepChange={setStepIndex}
              completedSteps={completedSteps}
              steps={DENTAL_STEPS}
              queuePath='/clinic/dental'
              step0FlushLeft={false}
            onSaveDraft={handleSaveDraft}
          >
              {renderStep()}
            </TreatmentFormShell>
          )}
          <Footer />
        </div>
      </div>
    </ClinicFilterProvider>
  );
};

export default DentalFormPage;
