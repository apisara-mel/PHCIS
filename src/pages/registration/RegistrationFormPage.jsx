import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import FormShell from '@/templates/FormShell';
import {
  Step1Personal, Step2Address, Step3Contact, Step4Rights, Step5Flags,
} from '@/components/forms/RegistrationSteps';
import { findMrPatientByHn, DEFAULT_MR_PATIENT } from '@/data/mrPatients';
import {
  applySmartCardRead,
  buildEmptyRegistrationForm,
  getRegistrationCompletedSteps,
} from '@/data/registrationForm';

/* MIH RegistrationFormPage — Figma 2373:119045..119049 / 204:14241.
   First entry: empty default fields (placeholders only).
   Queue row still supplies HN for the status bar; chip read prefills
   personal data + ID-card mock on the right photo tile. */

const breadcrumb = ['ระบบงานเวชระเบียน', 'ข้อมูลผู้รับบริการ'];

const STEP_RENDERERS = [Step1Personal, Step2Address, Step3Contact, Step4Rights, Step5Flags];

const RegistrationFormPage = () => {
  const { state: navState } = useLocation();
  const patient = useMemo(() => {
    return (navState && findMrPatientByHn(navState.hn)) || DEFAULT_MR_PATIENT;
  }, [navState]);

  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState(buildEmptyRegistrationForm);

  const handleReadSmartCard = () => {
    setForm((prev) => applySmartCardRead(prev, patient));
    setStepIndex(0);
  };

  const ActiveStep = STEP_RENDERERS[stepIndex];
  const completedSteps = useMemo(() => getRegistrationCompletedSteps(form), [form]);

  return (
    <ClinicFilterProvider>
    <div
      className='flex w-full min-h-screen'
      style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}
    >
      <Sidebar activeKey='registration' />
      <div className='flex-1 min-w-0 flex flex-col'>
        <Header breadcrumb={breadcrumb} />
        <FormShell
          patient={patient}
          stepIndex={stepIndex}
          onStepChange={setStepIndex}
          onReadSmartCard={handleReadSmartCard}
          smartCardRead={form.idCardFromChip}
          completedSteps={completedSteps}
        >
          <ActiveStep form={form} setForm={setForm} />
        </FormShell>
        <Footer />
      </div>
    </div>
    </ClinicFilterProvider>
  );
};

export default RegistrationFormPage;
