import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useStepDirection } from '@/components/step/stepTransition';
import { SubHeader } from '@/components/layout/Header';
import WizardMorphHeader from '@/components/layout/WizardMorphHeader';
import PageHeaderInfoPanel from '@/components/layout/PageHeaderInfoPanel';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import Popup from '@/components/popup/Popup';
import RegistrationEditHistoryPanel, {
  getRegistrationEditHistoryRows,
} from '@/components/forms/RegistrationEditHistoryPanel';
import { MIH_TOPBAR_OFFSET } from '@/hooks/useHeaderAutoHide';
import { MIH_CHROME_MORPH_FOOTER, MIH_CHROME_MORPH_STEP_BAND } from '@/components/layout/wizardChromeMorphStyles';

/* MIH FormShell — Figma nodes 2373:119045..119049 / 292:104252.
   Common chrome wrapping Registration (เวชระเบียน) steps:
     • Sub-header  : page title + actions (ประวัติการแก้ไข · บัตรคิว · …)
     • Morph band  : stepper only (title lives in SubHeader) + per-step body card
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

const SUBHEADER_FALLBACK = 72;
const FORM_SHELL_STICKY_Z = 1100;

const FormActionBar = ({ onHistoryOpen, onReadSmartCard, smartCardRead = false }) => (
  <SubHeader title='ลงทะเบียนผู้รับบริการ' hideBottomBorder>
    <BrandSubdueButton variant='outline' size='md' leadingIcon='history' onClick={onHistoryOpen}>
      ประวัติการแก้ไขข้อมูล
    </BrandSubdueButton>
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

const Footer = ({ stepIndex, lastSavedMin = 2, onPrev, onNext, onSave, isLast }) => {
  const nextStepLabel = isLast
    ? 'บันทึกข้อมูลผู้รับบริการ'
    : `ถัดไป: ${REGISTRATION_STEP_LABELS[stepIndex + 1]}`;
  const isFirst = stepIndex === 0;

  return (
    <div
      className={`flex items-center w-full ${MIH_CHROME_MORPH_FOOTER}`}
      style={{
        gap: 'var(--dim-space-300)',
        padding: 'var(--dim-space-400) var(--dim-space-600)',
        borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
        background: 'var(--surface-card-100)',
        position: 'sticky',
        bottom: 'var(--dim-space-0)',
      }}
    >
      <NeutralSubdueButton
        size='lg'
        leadingIcon={isFirst ? undefined : 'arrow_back'}
        onClick={onPrev}
        className='shrink-0'
      >
        {isFirst ? 'ยกเลิก' : 'ย้อนกลับ'}
      </NeutralSubdueButton>
      {!isFirst && (
        <span className='inline-flex items-center min-w-0' style={{
          gap: 'var(--dim-space-200)',
          color: 'var(--text-content-secondary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: 'var(--dim-radius-full)',
            background: 'var(--surface-brandPrimary-secondary, var(--brand-p200))',
            opacity: 0.74,
            flexShrink: 0,
          }} />
          ร่างแบบฟอร์ม (บันทึกล่าสุด: {lastSavedMin} นาทีที่แล้ว)
        </span>
      )}
      <div className='flex-1' />
      <BrandSubdueButton variant='outline' size='lg' leadingIcon='save' onClick={onSave}>
        บันทึกร่าง
      </BrandSubdueButton>
      <BrandPrimaryButton size='lg' trailingIcon={isLast ? 'check' : 'arrow_forward'} onClick={onNext}>
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
  onSubmit,
  onSaveDraft,
  children,
}) => {
  const history = useHistory();
  const [historyOpen, setHistoryOpen] = useState(false);
  const subHeaderRef = useRef(null);
  const [subHeaderH, setSubHeaderH] = useState(SUBHEADER_FALLBACK);
  const isLast = stepIndex === REGISTRATION_STEP_LABELS.length - 1;
  const stepDirection = useStepDirection(stepIndex);

  useLayoutEffect(() => {
    const el = subHeaderRef.current;
    if (!el) return undefined;
    const measure = () => setSubHeaderH(Math.round(el.getBoundingClientRect().height));
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);

  const historySubtitle = useMemo(() => {
    const count = getRegistrationEditHistoryRows().length;
    return `${count} รายการ · เรียงจากใหม่ไปเก่า`;
  }, [historyOpen]);

  const handlePrev = () => {
    if (stepIndex === 0) history.push('/registration/queue');
    else onStepChange(stepIndex - 1);
  };
  const handleNext = () => {
    if (isLast) onSubmit?.();
    else onStepChange(stepIndex + 1);
  };

  return (
    <main
      className='flex-1 min-w-0 flex flex-col'
      style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}
    >
      <div
        ref={subHeaderRef}
        className='w-full sticky'
        style={{
          top: MIH_TOPBAR_OFFSET,
          zIndex: 1101,
          background: 'var(--surface-navigation-default)',
        }}
      >
        <FormActionBar
          onHistoryOpen={() => setHistoryOpen(true)}
          onReadSmartCard={onReadSmartCard}
          smartCardRead={smartCardRead}
        />
      </div>

      <div
        className={`w-full sticky ${MIH_CHROME_MORPH_STEP_BAND}`}
        style={{
          top: `calc(${MIH_TOPBAR_OFFSET} + ${subHeaderH}px)`,
          zIndex: FORM_SHELL_STICKY_Z,
          background: 'var(--surface-card-100)',
        }}
      >
        <PageHeaderInfoPanel dense>
          <WizardMorphHeader
            hideTitle
            steps={REGISTRATION_STEP_LABELS}
            current={stepIndex}
            completedSteps={completedSteps}
            onStepClick={onStepChange}
          />
        </PageHeaderInfoPanel>
      </div>

      <div
        className='flex-1 flex flex-col'
        style={{
          padding: 'var(--dim-space-600)',
          gap: 'var(--dim-space-400)',
        }}
      >
        <div
          className='flex flex-col w-full'
          style={{
            borderRadius: 'var(--dim-radius-500)',
            background: 'var(--surface-card-100)',
            boxShadow: 'var(--shadow-brand-drop-bottom-200)',
            overflow: 'hidden',
          }}
        >
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
      </div>

      <Footer
        stepIndex={stepIndex}
        onPrev={handlePrev}
        onNext={handleNext}
        onSave={() => onSaveDraft?.()}
        isLast={isLast}
      />

      <Popup
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title='ประวัติการแก้ไขข้อมูล'
        subtitle={historySubtitle}
        size='extraLarge'
        secondaryAction={{ label: 'ปิด', onClick: () => setHistoryOpen(false) }}
      >
        <RegistrationEditHistoryPanel embedded />
      </Popup>
    </main>
  );
};

export default FormShell;
