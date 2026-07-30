import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import FormShell from '@/templates/FormShell';
import {
  StepConsent, Step1Personal, Step2Address, Step3Contact, Step4Rights, Step5Flags,
} from '@/components/forms/RegistrationSteps';
import { findMrPatientByHn, DEFAULT_MR_PATIENT } from '@/data/mrPatients';
import {
  applySmartCardRead,
  buildEmptyRegistrationForm,
  getRegistrationCompletedSteps,
  loadRegistrationDraft,
  saveRegistrationDraft,
} from '@/data/registrationForm';

/* MIH RegistrationFormPage — Figma 292:104252 / 2373:119045..119049.
   Step 1 = แบบฟอร์มยินยอม; Step 2 = ข้อมูลส่วนตัว (รวม สถานะผู้รับบริการ).
   Queue row supplies HN for status badges; chip read prefills personal data.
   Draft persists in sessionStorage so consent fill navigation keeps progress. */

const breadcrumb = ['ระบบงานเวชระเบียน', 'ข้อมูลผู้รับบริการ'];

const STEP_RENDERERS = [
  StepConsent,
  Step1Personal,
  Step2Address,
  Step3Contact,
  Step4Rights,
  Step5Flags,
];

const RegistrationFormPage = () => {
  const { state: navState } = useLocation();
  const patient = useMemo(() => {
    return (navState && findMrPatientByHn(navState.hn)) || DEFAULT_MR_PATIENT;
  }, [navState]);

  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState(() => loadRegistrationDraft() || buildEmptyRegistrationForm());

  useEffect(() => {
    saveRegistrationDraft(form);
  }, [form]);

  useEffect(() => {
    const id = navState?.consentCompletedId;
    if (!id) return;
    setForm((s) => {
      const prev = Array.isArray(s.consentCompletedIds) ? s.consentCompletedIds : [];
      if (prev.includes(id)) return s;
      return { ...s, consentCompletedIds: [...prev, id] };
    });
  }, [navState?.consentCompletedId]);

  const handleReadSmartCard = () => {
    setForm((prev) => applySmartCardRead(prev, patient));
    setStepIndex(1);
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
          stepIndex={stepIndex}
          onStepChange={setStepIndex}
          onReadSmartCard={handleReadSmartCard}
          smartCardRead={form.idCardFromChip}
          completedSteps={completedSteps}
        >
          <ActiveStep form={form} setForm={setForm} patient={patient} />
        </FormShell>
        <Footer />
      </div>
    </div>
    </ClinicFilterProvider>
  );
};

export default RegistrationFormPage;
