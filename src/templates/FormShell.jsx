import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import StepProgress from '@/components/step/StepProgress';
import { useStepDirection } from '@/components/step/stepTransition';
import { SubHeader } from '@/components/layout/Header';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import TabUnderline from '@/components/tab/TabUnderline';
import RegistrationEditHistoryPanel from '@/components/forms/RegistrationEditHistoryPanel';

/* MIH FormShell — Figma nodes 2373:119045..119049 / 292:104252.
   Common chrome wrapping Registration (เวชระเบียน) steps:
     • Sub-header  : back + title + actions
     • Tab strip   : ข้อมูลปัจจุบัน · ประวัติการแก้ไขข้อมูล
     • Step card   : StepProgress + per-step body
     • Footer      : auto-save + ยกเลิก / บันทึกร่าง / ถัดไป
   สถานะผู้รับบริการ lives in Step ข้อมูลส่วนตัว (Step1Personal). */

export const REGISTRATION_STEP_LABELS = [
  'แบบฟอร์มยินยอม',
  'ข้อมูลส่วนตัว',
  'ที่อยู่',
  'ข้อมูลการติดต่อ',
  'สิทธิการรักษา',
  'หมายเหตุและ Flag',
];

const FORM_SHELL_TAB_STICKY_TOP = 64;
const FORM_SHELL_TAB_STICKY_Z = 1100;

const FormActionBar = ({ onBack, onReadSmartCard, smartCardRead = false }) => (
  <SubHeader title='ข้อมูลผู้รับบริการ' onBack={onBack} hideBottomBorder>
    <BrandSubdueButton variant='outline' size='md' leadingIcon='print'>ปริ้นบัตรคิว</BrandSubdueButton>
    <BrandSubdueButton variant='outline' size='md' leadingIcon='calendar_add_on'>เพิ่มการนัดหมาย</BrandSubdueButton>
    <BrandSubdueButton variant='fill' size='md' leadingIcon='print'>พิมพ์บัตรผู้รับบริการ</BrandSubdueButton>
    <BrandPrimaryButton
      size='md'
      leadingIcon='credit_card'
      onClick={onReadSmartCard}
      active={smartCardRead}
      aria-label={smartCardRead ? 'อ่านบัตรสมาร์ทการ์ดอีกครั้ง' : 'อ่านบัตรสมาร์ทการ์ด'}
    >
      {smartCardRead ? 'อ่านบัตรสมาร์ทการ์ดอีกครั้ง' : 'อ่านบัตรสมาร์ทการ์ด'}
    </BrandPrimaryButton>
  </SubHeader>
);

const FORM_SUB_TABS = [
  { key: 'current', label: 'ข้อมูลปัจจุบัน',         icon: 'face'    },
  { key: 'history', label: 'ประวัติการแก้ไขข้อมูล', icon: 'history' },
];

const Footer = ({ stepIndex, lastSavedMin = 2, onPrev, onNext, onSave, isLast }) => {
  const nextStepLabel = isLast
    ? 'บันทึกข้อมูลผู้รับบริการ'
    : `ถัดไป: ${REGISTRATION_STEP_LABELS[stepIndex + 1]}`;

  return (
    <div
      className='flex items-center w-full'
      style={{
        gap: 'var(--dim-space-300)',
        padding: 'var(--dim-space-400) var(--dim-space-600)',
        borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
        background: 'var(--surface-card-100)',
        position: 'sticky',
        bottom: 'var(--dim-space-0)',
      }}
    >
      <span className='inline-flex items-center' style={{
        gap: 'var(--dim-space-200)',
        color: 'var(--text-content-secondary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: 'var(--dim-radius-full)',
          background: 'var(--surface-brandPrimary-secondary, var(--brand-p200))',
          opacity: 0.74,
        }} />
        ร่างแบบฟอร์ม (บันทึกล่าสุด: {lastSavedMin} นาทีที่แล้ว)
      </span>
      <div className='flex-1' />
      <NeutralSubdueButton size='lg' onClick={onPrev}>
        {stepIndex === 0 ? 'ยกเลิก' : 'ย้อนกลับ'}
      </NeutralSubdueButton>
      <BrandSubdueButton variant='outline' size='lg' leadingIcon='save' onClick={onSave}>
        บันทึกร่าง
      </BrandSubdueButton>
      <BrandPrimaryButton size='lg' trailingIcon='arrow_forward' onClick={onNext}>
        {nextStepLabel}
      </BrandPrimaryButton>
    </div>
  );
};

const FormShell = ({
  stepIndex,
  onStepChange,
  onReadSmartCard,
  smartCardRead = false,
  completedSteps,
  children,
}) => {
  const history = useHistory();
  const [subTab, setSubTab] = useState('current');
  const isLast = stepIndex === REGISTRATION_STEP_LABELS.length - 1;
  const stepDirection = useStepDirection(stepIndex);

  const handlePrev = () => {
    if (stepIndex === 0) history.push('/registration/queue');
    else onStepChange(stepIndex - 1);
  };
  const handleNext = () => {
    if (isLast) history.push('/registration/queue');
    else onStepChange(stepIndex + 1);
  };

  return (
    <main
      className='flex-1 min-w-0 flex flex-col'
      style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}
    >
      <FormActionBar
        onBack={() => history.push('/registration/queue')}
        onReadSmartCard={onReadSmartCard}
        smartCardRead={smartCardRead}
      />

      <div
        className='w-full sticky'
        style={{
          top: FORM_SHELL_TAB_STICKY_TOP,
          zIndex: FORM_SHELL_TAB_STICKY_Z,
          paddingTop: 'var(--dim-space-200)',
          paddingLeft: 'var(--dim-space-600)',
          paddingRight: 'var(--dim-space-600)',
          borderBottom: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
          background: 'var(--surface-card-100)',
        }}
      >
        <TabUnderline
          tabs={FORM_SUB_TABS}
          value={subTab}
          onChange={setSubTab}
          style={{ color: 'rgba(255, 255, 255, 1)' }}
        />
      </div>

      <div
        className='flex-1 flex flex-col'
        style={{
          padding: 'var(--dim-space-600)',
          gap: 'var(--dim-space-400)',
        }}
      >
        {subTab === 'history' ? (
          <RegistrationEditHistoryPanel />
        ) : (
          <div
            className='flex flex-col w-full'
            style={{
              borderRadius: 'var(--dim-radius-500)',
              background: 'var(--surface-card-100)',
              boxShadow: 'var(--shadow-brand-drop-bottom-200)',
              overflow: 'hidden',
            }}
          >
            <div className='flex justify-center min-w-max overflow-x-auto w-full'>
              <StepProgress
                framed
                steps={REGISTRATION_STEP_LABELS}
                current={stepIndex}
                completedSteps={completedSteps}
                onStepClick={onStepChange}
              />
            </div>
            <div
              key={stepIndex}
              data-direction={stepDirection}
              className='mih-step-content flex flex-col'
              style={{
                padding: 'var(--dim-space-600)',
                gap: 'var(--dim-space-300)',
              }}
            >
              {children}
            </div>
          </div>
        )}
      </div>

      {subTab !== 'history' && (
        <Footer stepIndex={stepIndex} onPrev={handlePrev} onNext={handleNext} isLast={isLast} />
      )}
    </main>
  );
};

export default FormShell;
