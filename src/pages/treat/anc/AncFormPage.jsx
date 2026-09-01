import React, { useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header, { SubHeader } from '@/components/layout/Header';
import CreateConsentRequestHeaderAction from '@/components/consent/CreateConsentRequestHeaderAction';
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

const breadcrumb = ['บันทึกการรักษา', 'คลินิกฝากครรภ์'];

/* Same 7-step scaffold as OPD's TREATMENT_STEPS (TreatmentFormShell.jsx),
   with step 7 relabeled — ANC issues an "ใบฝากครรภ์" (ANC card), not a
   medical certificate. */
const ANC_STEPS = [
  { title: 'ประวัติการรักษา', subtitle: 'Medical History' },
  /* ไม่ใช่ "คัดกรอง" — จุดคัดกรองมีที่เดียวที่ `/opd/screening` step นี้เก็บเฉพาะ
     แบบประเมินของงานฝากครรภ์ (ST-5 · 2Q · ความเสี่ยงตั้งครรภ์ · GDM ·
     สัญญาณอันตราย · การสูบบุหรี่) ส่วนผลคัดกรองแสดงอ่านอย่างเดียวที่ step 1 */
  { title: 'แบบประเมิน', subtitle: 'Assessment' },
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

  /* The HN every ANC record (registration + visit history) is keyed by.
     It MUST be the HN the queue navigated with, not `cardPatient.hn`:
     `getPatientByHN` falls back to DEFAULT_PATIENT for any HN missing from
     patientProfiles (67-00027 and 67-00029 are), which would silently file
     several different mothers' pregnancies under HN 67-00001 and show each
     of them the others' carried-forward history. `cardPatient` stays the
     source for DISPLAY only. */
  const ancHn = navState?.hn || cardPatient?.hn;

  /* One seed per mount — reading the registration saved by earlier visits. */
  const seed = useMemo(() => buildAncVisitForm(ancHn, ancPatient), [ancHn, ancPatient]);

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
        <Header breadcrumb={breadcrumb} standalone={false} />
        <SubHeader
          title={`บันทึกฝากครรภ์ — ตรวจครรภ์ครั้งที่ ${seed.visitNo}`}
          hideBottomBorder
          /* ปุ่ม "คำขอเข้าถึงข้อมูล" ย้ายลงไปอยู่แถวปุ่มบนการ์ดผู้ป่วย
             (มติผู้ใช้ 1 ก.ย. 69) จึงต้องปิดตัวที่ SubHeader วางให้ */
          hideConsentAction
        />
        <PatientCard
          sticky
          showBack={false}
          patient={cardPatient}
          title={`บันทึกฝากครรภ์ — ตรวจครรภ์ครั้งที่ ${seed.visitNo}`}
          drugAllergies={patient.drugAllergies}
          chronicDiseases={patient.chronicDiseases}
          actions={
            <>
              {/* "คำขอเข้าถึงข้อมูล" มาก่อนปุ่มพิมพ์บัตร (มติผู้ใช้ 1 ก.ย. 69) */}
              <CreateConsentRequestHeaderAction />
              <BrandSubdueButton variant='fill' leadingIcon='credit_card'>พิมพ์บัตรฝากครรภ์</BrandSubdueButton>
            </>
          }
        />
        <AncPregnancyProgress form={form} cardPatient={cardPatient} ancHn={ancHn} visitNo={seed.visitNo} />
        <TreatmentFormShell
          morphTitle='ANC'
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
            ancHn={ancHn}
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
