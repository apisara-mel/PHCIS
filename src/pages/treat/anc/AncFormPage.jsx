import React, { useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PatientCard from '@/components/card/PatientCard';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import TreatmentFormShell from '@/templates/TreatmentFormShell';
import {
  AncStep1History, AncStep2Screening, AncStep3Examination, AncStep4Diagnosis,
  AncStep5Orders, AncStep6Appointment, AncStep7Card,
} from '@/pages/treat/anc/AncSteps';
import AncPregnancyProgress from '@/pages/treat/anc/AncPregnancyProgress';
import { findMrPatientByHn, DEFAULT_MR_PATIENT } from '@/data/mrPatients';
import { getPatientByHN, DEFAULT_PATIENT } from '@/data/patientProfiles';
import { buildAncVisitForm, getAncCompletedSteps, getAncPatientByHn } from '@/data/ancVisits';

/* AncFormPage — บันทึกการรักษา แผนกฝากครรภ์ (ANC), first-visit MVP.
   Mirrors TreatmentFormPage.jsx: owns one form-state object across all
   7 steps of the shared TreatmentFormShell, seeded from the ANC mock
   registry (`ancVisits.js`) when the patient already has one, or from
   an empty first-visit default otherwise. */

const breadcrumb = ['ระบบบันทึกการรักษา', 'แผนกฝากครรภ์'];

/* Same 7-step scaffold as OPD's TREATMENT_STEPS (TreatmentFormShell.jsx),
   with step 7 relabeled — ANC issues an "ใบฝากครรภ์" (ANC card), not a
   medical certificate. */
const ANC_STEPS = [
  { title: 'ประวัติการรักษา', subtitle: 'Medical History' },
  { title: 'คัดกรองและซักประวัติ', subtitle: 'Screening' },
  { title: 'ตรวจร่างกาย', subtitle: 'Physical Examination' },
  { title: 'วินิจฉัย', subtitle: 'Diagnosis' },
  { title: 'สั่งการรักษา', subtitle: 'Treatment Order' },
  { title: 'นัดหมาย', subtitle: 'Appointment' },
  { title: 'ใบฝากครรภ์', subtitle: 'ANC Card' },
];

const STEP_RENDERERS = [
  AncStep1History, AncStep2Screening, AncStep3Examination, AncStep4Diagnosis,
  AncStep5Orders, AncStep6Appointment, AncStep7Card,
];

const AncFormPage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();

  const patient = useMemo(() => {
    const p = (navState && findMrPatientByHn(navState.hn)) || DEFAULT_MR_PATIENT;
    return { ...p, queue: navState?.queue, name: navState?.name || `${p.firstNameTh} ${p.lastNameTh}` };
  }, [navState]);

  const cardPatient = useMemo(
    () => (navState?.hn && getPatientByHN(navState.hn)) || DEFAULT_PATIENT,
    [navState?.hn],
  );

  const ancPatient = useMemo(() => (navState?.hn && getAncPatientByHn(navState.hn)) || null, [navState?.hn]);

  /* One seed per mount. `cardPatient.hn` is the canonical HN (see
     AncStep1History) — the registration + visit history are keyed by it, so
     the follow-up carry-forward has to read from the same key Step 7
     writes to, not the MR roster's HN. */
  const seed = useMemo(
    () => buildAncVisitForm(cardPatient?.hn, ancPatient),
    [cardPatient?.hn, ancPatient],
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState(() => seed.form);

  const ActiveStep = STEP_RENDERERS[stepIndex];

  const completedSteps = useMemo(
    () => getAncCompletedSteps(form, stepIndex),
    [form, stepIndex],
  );

  return (
    <ClinicFilterProvider>
    <div className='flex w-full min-h-screen' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
      <Sidebar activeKey='treat' />
      <div className='flex-1 min-w-0 flex flex-col'>
        <Header breadcrumb={breadcrumb} />
        <PatientCard
          sticky
          patient={cardPatient}
          title={`บันทึกฝากครรภ์ — ตรวจครรภ์ครั้งที่ ${seed.visitNo}`}
          onBack={() => history.push('/treat/anc/queue')}
          drugAllergies={patient.drugAllergies}
          chronicDiseases={patient.chronicDiseases}
          actions={
            <BrandSubdueButton variant='fill' leadingIcon='credit_card'>พิมพ์บัตรฝากครรภ์</BrandSubdueButton>
          }
        />
        <AncPregnancyProgress form={form} cardPatient={cardPatient} />
        <TreatmentFormShell
          stepIndex={stepIndex}
          onStepChange={setStepIndex}
          completedSteps={completedSteps}
          steps={ANC_STEPS}
          queuePath='/treat/anc/queue'
          step0FlushLeft={false}
        >
          <ActiveStep
            form={form}
            setForm={setForm}
            patient={patient}
            cardPatient={cardPatient}
            visitNo={seed.visitNo}
            isFollowUp={seed.isFollowUp}
            carriedFields={seed.carriedFields}
          />
        </TreatmentFormShell>
        <Footer />
      </div>
    </div>
    </ClinicFilterProvider>
  );
};

export default AncFormPage;
