import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header, { SubHeader } from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PatientCard from '@/components/card/PatientCard';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import TreatmentFormShell from '@/templates/TreatmentFormShell';
import UnsavedChangesPopup from '@/components/popup/UnsavedChangesPopup';
import { HivStiConfidentialGate, ReadOnlyBanner } from '@/pages/clinic/hiv-sti/hivStiShared';
import {
  HivStiStep1History, HivStiStep2Risk, HivStiStep3Vct, HivStiStep4Diagnosis,
  HivStiStep5Orders, HivStiStep6Education, HivStiStep7Appointment,
} from '@/pages/clinic/hiv-sti/HivStiSteps';
import { findMrPatientByHn, DEFAULT_MR_PATIENT } from '@/data/mrPatients';
import { getPatientByHN, DEFAULT_PATIENT } from '@/data/patientProfiles';
import {
  DEFAULT_HIV_STI_VISIT,
  getHivStiCompletedSteps,
  getHivStiPatientByHn,
  getHivStiDraft,
  saveHivStiDraft,
  clearHivStiDraft,
  saveHivStiVisitRecord,
  getHivStiVisitNumber,
  hivStiNowStamp,
  formatHivStiDate,
  HIV_STI_CURRENT_STAFF,
  HIV_STI_APPOINTMENT_TYPES,
  HIV_TEST_RESULT_OPTIONS,
  canEditHivSti,
} from '@/data/hivStiVisits';

/* HivStiFormPage — แบบฟอร์มบันทึกงาน HIV/STI (TOR 1.10.6.7 + .3/.4/.5/.1).
   Mirrors AncFormPage: thin shell that owns ONE form-state object across
   the 7 steps in HivStiSteps.jsx, mounted in TreatmentFormShell. The step
   list maps the legacy บันทึกการดูแลรักษาเอดส์ฯ 8-tab screen (คู่มือ HCIS
   บทที่ 2) onto the shared 7-step scaffold.

   Extra contracts this shell owns (over ANC):
     • Confidential gate — the whole record is §1.4.2 data; deep links
       into /clinic/hiv-sti/record hit the gate before rendering.
     • Dirty guard — every exit path (ยกเลิก, จบการบันทึก without confirm,
       PatientCard back, sidebar nav) funnels through history.block →
       UnsavedChangesPopup. บันทึกร่าง files the visit under the queue's
       "ที่ร่างไว้" tab (saveHivStiDraft).
     • Read-only — a closed encounter (queue's ตรวจเสร็จแล้ว row) or a
       role without clinic rights renders the same steps inert + banner. */

const breadcrumb = ['ระบบบันทึกการรักษา', 'คลินิก HIV/STI', 'บันทึกการรักษา'];

const HIV_STI_STEPS = [
  { title: 'ซักประวัติ', subtitle: 'History & Vital Signs' },
  /* ไม่ใช่ "คัดกรอง" — จุดคัดกรองมีที่เดียวที่ `/opd/screening` step นี้เก็บเฉพาะ
     แบบประเมินพฤติกรรมเสี่ยงและผลตรวจของงาน HIV/STI
     ส่วนผลคัดกรองแสดงอ่านอย่างเดียวที่ step 1 */
  { title: 'แบบประเมินพฤติกรรมเสี่ยง', subtitle: 'Risk Assessment' },
  { title: 'VCT & HIV Test', subtitle: 'Counseling & Testing' },
  { title: 'วินิจฉัย', subtitle: 'STI Diagnosis' },
  { title: 'สั่งการรักษา', subtitle: 'CPOE · PEP/PrEP' },
  { title: 'สุขศึกษาและเอกสาร', subtitle: 'Education & Documents' },
  { title: 'นัดหมาย', subtitle: 'Appointment' },
];

const STEP_RENDERERS = [
  HivStiStep1History, HivStiStep2Risk, HivStiStep3Vct, HivStiStep4Diagnosis,
  HivStiStep5Orders, HivStiStep6Education, HivStiStep7Appointment,
];

const QUEUE_PATH = '/clinic/hiv-sti';

const HivStiFormPage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();

  /* The HN every HIV/STI record is keyed by — MUST be the HN the queue
     navigated with (getPatientByHN silently falls back to DEFAULT_PATIENT
     for unknown HNs; filing records under that fallback would mix
     clients' histories — same reasoning as AncFormPage). */
  const hn = navState?.hn || DEFAULT_PATIENT.hn;

  const mrPatient = useMemo(() => {
    const p = (navState?.hn && findMrPatientByHn(navState.hn)) || DEFAULT_MR_PATIENT;
    return { ...p, queue: navState?.queue };
  }, [navState]);

  const cardPatient = useMemo(
    () => (navState?.hn && getPatientByHN(navState.hn)) || DEFAULT_PATIENT,
    [navState?.hn],
  );

  const clinicPatient = useMemo(() => getHivStiPatientByHn(hn), [hn]);
  const visitNo = useMemo(() => getHivStiVisitNumber(hn), [hn]);

  /* Seed: continue a draft when the queue row was "ที่ร่างไว้", otherwise a
     fresh visit form. One seed per mount. */
  const seed = useMemo(() => {
    const draft = getHivStiDraft(hn);
    if (draft?.form) return { form: { ...DEFAULT_HIV_STI_VISIT, ...draft.form }, fromDraft: true, draftSavedAt: draft.savedAt };
    return { form: { ...DEFAULT_HIV_STI_VISIT }, fromDraft: false };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hn]);

  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState(() => seed.form);

  const readOnly = !!navState?.readOnly || !canEditHivSti();

  /* ── Dirty guard (UnsavedChangesPopup on any exit) ──────────────── */
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  const pendingLocationRef = useRef(null);
  const allowLeaveRef = useRef(false);
  const formRef = useRef(form);
  const seedRef = useRef(seed.form);
  formRef.current = form;

  const isDirty = () =>
    !readOnly
    && !formRef.current.recordConfirmed
    && JSON.stringify(formRef.current) !== JSON.stringify(seedRef.current);

  useEffect(() => {
    const unblock = history.block((location) => {
      if (allowLeaveRef.current || !isDirty()) return undefined;
      pendingLocationRef.current = location;
      setUnsavedOpen(true);
      return false;
    });
    return unblock;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  const leaveTo = (location) => {
    allowLeaveRef.current = true;
    if (location) history.push(location.pathname + (location.search || ''), location.state);
    else history.push(QUEUE_PATH);
  };

  const handleSaveDraftAndLeave = () => {
    saveHivStiDraft(hn, formRef.current);
    setUnsavedOpen(false);
    leaveTo(pendingLocationRef.current);
  };

  const handleDiscardAndLeave = () => {
    setUnsavedOpen(false);
    leaveTo(pendingLocationRef.current);
  };

  /* ── ปิดงาน: ยืนยันบันทึกการรักษา (TOR 1.10.6.7 / .5) ─────────────
     TreatmentFormShell's "จบการบันทึก" only pushes back to the queue —
     it does not persist. Persisting has to happen here, in module scope
     (playbook §4 forbids editing the shared template), otherwise the
     visit never reaches the timeline, the draft stays parked in the
     queue's "ที่ร่างไว้" tab forever, and the dirty guard fires on exit. */
  const buildVisitSummary = (f) => {
    const parts = [];
    if (f.hivTestResult) {
      const label = HIV_TEST_RESULT_OPTIONS.find((o) => o.value === f.hivTestResult)?.label;
      if (label) parts.push(`ผลตรวจ HIV: ${label}`);
    }
    if ((f.diagnoses || []).length) parts.push((f.diagnoses || []).map((d) => d.name || d.code).join(', '));
    if (f.pepPrescribed) parts.push('สั่งยา PEP');
    if (f.prepPrescribed) parts.push('สั่งยา PrEP');
    if ((f.medications || []).length) parts.push(`สั่งยา ${(f.medications || []).length} รายการ`);
    if (f.telemedStatus === 'completed') parts.push('ปรึกษาทางไกลเสร็จสิ้น');
    return parts.length ? parts.join(' · ') : 'บันทึกการรักษาคลินิก HIV/STI';
  };

  const handleConfirmRecord = () => {
    const f = formRef.current;
    const stamp = hivStiNowStamp();
    const apptType = HIV_STI_APPOINTMENT_TYPES.find((t) => t.value === f.appointment?.type)?.label || '';
    saveHivStiVisitRecord(hn, {
      visitNo,
      date: formatHivStiDate(new Date()),
      chiefComplaint: f.chiefComplaint || '—',
      summary: buildVisitSummary(f),
      doctor: f.examiningDoctor || '—',
      appointment: f.appointment?.confirmed
        ? `${apptType} · ${formatHivStiDate(f.appointment.date)}`
        : '',
    });
    clearHivStiDraft(hn);
    const confirmed = {
      ...f,
      recordConfirmed: true,
      recordConfirmedAt: stamp,
      recordConfirmedBy: HIV_STI_CURRENT_STAFF.name,
    };
    formRef.current = confirmed;
    setForm(confirmed);
    allowLeaveRef.current = true;
    history.push(QUEUE_PATH);
  };

  const ActiveStep = STEP_RENDERERS[stepIndex];
  const completedSteps = useMemo(() => getHivStiCompletedSteps(form), [form]);

  return (
    <ClinicFilterProvider>
      <div className='flex w-full min-h-screen' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
        <Sidebar activeKey='treat' />
        <div className='flex-1 min-w-0 flex flex-col'>
          <Header breadcrumb={breadcrumb} standalone={false} />
          <SubHeader
            title={`บันทึกงาน HIV/STI — ครั้งที่ ${visitNo}${clinicPatient?.uic ? ` · ${clinicPatient.uic}` : ''}`}
            hideBottomBorder
          />
          <HivStiConfidentialGate>
            <UnsavedChangesPopup
              open={unsavedOpen}
              onClose={() => setUnsavedOpen(false)}
              onSave={handleSaveDraftAndLeave}
              onDiscard={handleDiscardAndLeave}
            />

            <PatientCard
              sticky
              showBack={false}
              patient={cardPatient}
              title={`บันทึกงาน HIV/STI — ครั้งที่ ${visitNo}${clinicPatient?.uic ? ` · ${clinicPatient.uic}` : ''}`}
              drugAllergies={mrPatient.drugAllergies}
              chronicDiseases={mrPatient.chronicDiseases}
              actions={
                <BrandSubdueButton variant='fill' leadingIcon='print'>
                  พิมพ์ใบนัด (ข้อความกลาง)
                </BrandSubdueButton>
              }
            />

            {(readOnly || seed.fromDraft) && (
              <div
                className='w-full'
                style={{
                  paddingTop: 'var(--dim-space-300, 12px)',
                  paddingLeft: 'var(--dim-space-600, 24px)',
                  paddingRight: 'var(--dim-space-600, 24px)',
                }}
              >
                {readOnly ? (
                  <ReadOnlyBanner>
                    {navState?.readOnly
                      ? 'บันทึกนี้ตรวจเสร็จแล้ว — เปิดดูได้อย่างเดียว การแก้ไขต้องเปิดบันทึกครั้งใหม่จากคิว'
                      : 'บัญชีของคุณไม่มีสิทธิบันทึกข้อมูลคลินิก HIV/STI — เปิดดูได้อย่างเดียว'}
                  </ReadOnlyBanner>
                ) : (
                  <div
                    className='flex items-center w-full'
                    style={{
                      gap: 'var(--dim-space-200, 8px)',
                      paddingTop: 'var(--dim-space-300, 12px)',
                      paddingBottom: 'var(--dim-space-300, 12px)',
                      paddingLeft: 'var(--dim-space-400, 16px)',
                      paddingRight: 'var(--dim-space-400, 16px)',
                      borderRadius: 'var(--dim-radius-200, 8px)',
                      background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                      color: 'var(--text-brandPrimary-default, #007549)',
                      fontSize: 'var(--type-size-sm, 14px)',
                    }}
                  >
                    ทำต่อจากร่างที่บันทึกไว้ ({seed.draftSavedAt}) — ตรวจสอบข้อมูลก่อนยืนยันการบันทึก
                  </div>
                )}
              </div>
            )}

            <TreatmentFormShell
              morphTitle='HIV/STI'
              stepIndex={stepIndex}
              onStepChange={setStepIndex}
              completedSteps={completedSteps}
              steps={HIV_STI_STEPS}
              queuePath={QUEUE_PATH}
              step0FlushLeft={false}
            onSaveDraft={() => { if (!readOnly) saveHivStiDraft(hn, formRef.current); }}
          >
              {/* Read-only renders the same steps inert — banner above
                  explains why nothing is clickable. */}
              <div style={readOnly ? { pointerEvents: 'none', opacity: 0.72 } : undefined}>
                <ActiveStep
                  form={form}
                  setForm={setForm}
                  hn={hn}
                  cardPatient={cardPatient}
                  clinicPatient={clinicPatient}
                  visitNo={visitNo}
                  readOnly={readOnly}
                  onConfirmRecord={handleConfirmRecord}
                />
              </div>
            </TreatmentFormShell>
            <Footer />
          </HivStiConfidentialGate>
        </div>
      </div>
    </ClinicFilterProvider>
  );
};

export default HivStiFormPage;
