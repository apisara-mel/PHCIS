import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useStepDirection } from '@/components/step/stepTransition';
import { SubHeader } from '@/components/layout/Header';
import WizardMorphHeader from '@/components/layout/WizardMorphHeader';
import PageHeaderInfoPanel from '@/components/layout/PageHeaderInfoPanel';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import AppointmentMenuButton from '@/components/layout/AppointmentMenuButton';
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
   สถานะผู้รับบริการ = การ์ดขาวแยกใบ ส่งเข้า slot `beforeCard` (ไม่ได้อยู่ใน
   Step1Personal แล้ว — มติผู้ใช้ 27 ส.ค. 69 "ไม่รวม section เดียวกับข้อมูลส่วนตัว") */

export const REGISTRATION_STEP_LABELS = [
  'แบบฟอร์มยินยอม',
  'ข้อมูลส่วนตัว',
  'ที่อยู่',
  'ข้อมูลการติดต่อ',
  'สิทธิการรักษา',
  'หมายเหตุและ Flag',
  /* ขั้นสุดท้าย — ทวนข้อมูลทั้งหมดก่อนบันทึกจริง (มติผู้ใช้ 27 ส.ค. 69)
     ⚠️ ต้องยาวเท่ากับ `REGISTRATION_STEP_NAMES`, `STEP_MISSING_BUILDERS` และ
     `getRegistrationCompletedSteps` ใน data/registrationForm.js เพราะทั้งสี่
     อ้าง stepIndex ตัวเดียวกัน */
  'ตรวจสอบข้อมูล',
];

const SUBHEADER_FALLBACK = 72;
const FORM_SHELL_STICKY_Z = 1100;

const FormActionBar = ({ onHistoryOpen, onReadSmartCard, smartCardRead = false, patientHn }) => (
  <SubHeader title='ลงทะเบียนผู้รับบริการ' hideBottomBorder>
    <BrandSubdueButton variant='outline' size='md' leadingIcon='history' onClick={onHistoryOpen}>
      ประวัติการแก้ไขข้อมูล
    </BrandSubdueButton>
    {/* เดิมเป็นปุ่มเดี่ยว "เพิ่มการนัดหมาย" — เปลี่ยนเป็นเมนู "การนัดหมาย"
        (ดู/สร้าง/ประวัติ ของผู้รับบริการรายนี้) มติผู้ใช้ 27 ส.ค. 69 · ใช้
        component ตัวเดียวกับหน้าคิวลงทะเบียนและห้องตรวจ */}
    <AppointmentMenuButton patientHn={patientHn} />
    {/* ปุ่มพิมพ์สองใบอยู่ติดกัน — บัตรคิวก่อนบัตรผู้รับบริการ (มติผู้ใช้ 27 ส.ค. 69) */}
    <BrandSubdueButton variant='outline' size='md' leadingIcon='print'>ปริ้นบัตรคิว</BrandSubdueButton>
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

const Footer = ({ stepIndex, lastSavedMin = 2, onPrev, onCancel, onNext, onSave, isLast }) => {
  /* ขั้นสุดท้ายคือ "ตรวจสอบข้อมูล" — กดแล้วบันทึกและส่งต่อไปขั้นถัดไปของงาน
     (มติผู้ใช้ 27 ส.ค. 69) · ข้อความต้องตรงกับ `SAVE_BUTTON_TEXT` ใน
     RegistrationFormPage ซึ่งดักเจตนา "กดบันทึก" จาก textContent ของปุ่ม */
  const nextStepLabel = isLast
    ? 'บันทึกและส่งต่อ'
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
      {/* ตั้งแต่ step 2 เป็นต้นไป ปุ่มซ้ายกลายเป็น "ย้อนกลับ" — ผู้ใช้จึงไม่เหลือ
          ทางออกจากฟอร์ม ใส่ "ยกเลิก" ต่อท้ายไว้ (มติผู้ใช้ 27 ส.ค. 69)
          ทำเหมือนกันทุกระบบที่ใช้ฟอร์มแบบ step */}
      {!isFirst && (
        <NeutralSubdueButton
          size='lg'
          variant='outline'
          onClick={onCancel}
          className='shrink-0'
        >
          ยกเลิก
        </NeutralSubdueButton>
      )}
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
  onSubmit,
  onSaveDraft,
  /** การ์ดที่วางเหนือการ์ดเนื้อหาของ step — เป็นการ์ดของตัวเอง ไม่ถูกครอบ
      ด้วยการ์ดขาวของ step (ใช้กับ <PatientStatusCard>) */
  beforeCard,
  /** HN ของผู้รับบริการที่กำลังลงทะเบียน — ผูกเมนู "การนัดหมาย" กับคนไข้รายนี้ */
  patientHn,
  /** false = ไม่ต้องมีการ์ดขาวใหญ่ครอบเนื้อหา — ใช้กับ step ที่เนื้อหาเป็นการ์ด
      ย่อยอยู่แล้ว (ที่อยู่ / ติดต่อ / สิทธิ / Flag / ตรวจสอบข้อมูล) การ์ดครอบ
      การ์ดอ่านเป็นกรอบซ้อนกันเปล่า ๆ (มติผู้ใช้ 27 ส.ค. 69)
      step ประกาศเองผ่าน `<StepComponent>.rendersOwnCards = true` */
  bodyCard = true,
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

  /* ออกจากฟอร์ม — เส้นทางเดียวกับปุ่ม "ยกเลิก" ตอนอยู่ step แรก */
  const handleCancel = () => history.push('/registration/queue');
  const handlePrev = () => {
    if (stepIndex === 0) handleCancel();
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
          patientHn={patientHn}
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
        {beforeCard}

        {bodyCard ? (
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
        ) : (
          /* ไม่มีการ์ดครอบ — เนื้อหาวางตรงบนพื้นหน้า การ์ดย่อยข้างในแบ่งกลุ่มเอง */
          <div
            key={stepIndex}
            data-direction={stepDirection}
            className='mih-step-content flex flex-col w-full'
            style={{ gap: 'var(--dim-space-300)' }}
          >
            {children}
          </div>
        )}
      </div>

      <Footer
        stepIndex={stepIndex}
        onPrev={handlePrev}
        onCancel={handleCancel}
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
