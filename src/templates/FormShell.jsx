import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import StepProgress from '@/components/step/StepProgress';
import { useStepDirection } from '@/components/step/stepTransition';
import { SubHeader } from '@/components/layout/Header';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import TabUnderline from '@/components/tab/TabUnderline';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import RadioButton from '@/components/radio/RadioButton';
import RegistrationEditHistoryPanel from '@/components/forms/RegistrationEditHistoryPanel';

/* MIH FormShell — Figma nodes 2373:119045..119049.
   Common chrome wrapping all 5 Registration (เวชระเบียน) steps:
     • Sub-header  : back button + title + 4 right-aligned action buttons
     • Tab strip   : ข้อมูลปัจจุบัน · ประวัติการแก้ไขข้อมูล (visual only)
     • Status bar  : "สถานะรับบริการ" + ผู้ป่วยใหม่ pill + HN + Active/Inactive toggle
     • Step card   : StepProgress (framed) + per-step form in one surface
     • Children    : the per-step form body inside the step card
     • Footer      : auto-save indicator + ยกเลิก / บันทึกร่าง / ถัดไป (or บันทึก) */

export const REGISTRATION_STEP_LABELS = [
  'แบบฟอร์มยินยอม',
  'ข้อมูลส่วนตัว',
  'ที่อยู่',
  'ข้อมูลการติดต่อ',
  'สิทธิการรักษา',
  'หมายเหตุและ Flag',
];

/* Pin sub-tabs under the app Header (h-16) — same contract as QueuePageShell. */
const FORM_SHELL_TAB_STICKY_TOP = 64;
const FORM_SHELL_TAB_STICKY_Z = 1100;

const Sym = ({ name, size = 16, color }) => (
  <span
    className='material-symbols-outlined'
    style={{ fontFamily: 'Material Symbols Outlined', fontSize: size, color, lineHeight: 1, display: 'inline-flex' }}
    aria-hidden
  >
    {name}
  </span>
);

/* Action bar = design-system SubHeader with back button + 4 actions. */
const FormActionBar = ({ onBack, onReadSmartCard, smartCardRead = false }) => (
  /* Action cluster — Figma 2373:119045 page header.
     All 4 buttons are brand-tinted (no neutral). The first two are
     outline (Brand Subdue), the third is filled (Brand Subdue fill),
     and the last is the primary CTA (Brand Primary). Icons + Thai
     copy come straight from the Figma export. */
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

/* Sub-tab strip per Figma 2373:119045 (node 96:4411).
   Selected icon = `face` (the patient avatar glyph). */
const FORM_SUB_TABS = [
  { key: 'current', label: 'ข้อมูลปัจจุบัน',         icon: 'face'    },
  { key: 'history', label: 'ประวัติการแก้ไขข้อมูล', icon: 'history' },
];

/* Each option carries its own semantic tone (green for "ยังคง Active",
   info-blue for "ไม่ Active แล้ว"): the icon tile keeps its tone regardless
   of selection state — only the card chrome flips when selected. This
   mirrors the Figma where the green smiley and the blue calm-face read
   as "what this status means" colors, not "selected vs unselected"
   colors. */
const STATUS_TONES = {
  active: {
    tileBg:   'var(--surface-brandPrimary-quaternary)',
    tileIcon: 'var(--icon-brandPrimary-default)',
  },
  inactive: {
    tileBg:   'var(--surface-info-quaternary, #F0F6FF)',
    tileIcon: 'var(--icon-info-default, #1d4ed8)',
  },
};
/* 36-px tone-tinted circle injected into RadioButton's `circleIcon` slot. */
const StatusCircleIcon = ({ icon, tone = 'active' }) => {
  const t = STATUS_TONES[tone] || STATUS_TONES.active;
  return (
    <span
      aria-hidden
      className='inline-flex items-center justify-center shrink-0'
      style={{
        width: 36,
        height: 36,
        borderRadius: 'var(--dim-radius-full)',
        background: t.tileBg,
        color: t.tileIcon,
      }}
    >
      <Sym name={icon} size={20} color='currentColor' />
    </span>
  );
};

/* StatusCardOption — aliases the design-system RadioButton (Figma PHCIS-ALL
   2373:119045 / 103:16484/16485). The tone-tinted icon tile replaces the
   default `Circle_Stethoscope` via the `circleIcon` slot; inner radio dot,
   inline icon, and trailing badges are all hidden so the card reads as a
   pill (matches Step 6's appointment radios). */
const StatusCardOption = ({ icon, label, tone = 'active', value, checked, onChange, name }) => (
  <RadioButton
    name={name}
    value={value}
    checked={checked}
    onChange={onChange}
    title={label}
    circleIcon={<StatusCircleIcon icon={icon} tone={tone} />}
    showRadio={false}
    showIcon={false}
    showBadgeTitle={false}
    showBadge={false}
    showDescription={false}
  />
);

const StatusBar = ({ patient }) => {
  const [activeStatus, setActiveStatus] = useState('active');
  return (
  <div
    className='w-full flex flex-col'
    style={{
      gap: 'var(--dim-space-400)',
      padding: 'var(--dim-space-600)',
      borderRadius: 'var(--dim-radius-400)',
      background: 'var(--surface-card-100)',
      boxShadow: 'var(--shadow-brand-drop-bottom-200)',
    }}
  >
    <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <span style={{
        color: 'var(--text-content-default)',
        fontFamily: 'var(--type-family-heading-content)',
        fontSize: 'var(--type-size-base)',
        fontWeight: 'var(--type-weight-bold)',
      }}>
        สถานะผู้รับบริการ
      </span>
      <div className='flex-1' />
      {/* Patient-status pill — Figma 120:12717 (teal · bold). */}
      <ColorfulBadge badgeStyle='teal' hierarchy='primary' size='default' width='hug'>
        ผู้ป่วยใหม่
      </ColorfulBadge>
      {/* HN pill — Figma 120:12718 (teal · secondary). */}
      <ColorfulBadge badgeStyle='teal' hierarchy='secondary' size='default' width='hug'>
        HN: {patient?.hn || '67-004321'}
      </ColorfulBadge>
    </div>
    <div
      role='radiogroup'
      aria-label='สถานะผู้รับบริการ'
      className='flex items-center'
      style={{ gap: 'var(--dim-space-300)' }}
    >
      <StatusCardOption
        name='patient-active-status'
        icon='sentiment_satisfied'
        label='ยังคง Active'
        tone='active'
        value='active'
        checked={activeStatus === 'active'}
        onChange={setActiveStatus}
      />
      <StatusCardOption
        name='patient-active-status'
        icon='sentiment_calm'
        label='ไม่ Active แล้ว'
        tone='inactive'
        value='inactive'
        checked={activeStatus === 'inactive'}
        onChange={setActiveStatus}
      />
    </div>
  </div>
  );
};

const Footer = ({ stepIndex, lastSavedMin = 2, onPrev, onNext, onSave, isLast }) => {
  /* Primary CTA label — Figma PHCIS pattern: "ถัดไป: [next step]" so the
     clinician sees where they're heading without re-reading the stepper.
     Last step swaps the forward label for the explicit commit action. */
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
        {/* Auto-save dot — Figma 1:2633 (positive secondary green @ 74%). */}
        <span style={{
          width: 8, height: 8, borderRadius: 'var(--dim-radius-full)',
          background: 'var(--surface-brandPrimary-secondary, var(--brand-p200))',
          opacity: 0.74,
        }} />
        ร่างแบบฟอร์ม (บันทึกล่าสุด: {lastSavedMin} นาทีที่แล้ว)
      </span>
      <div className='flex-1' />
      {/* All three buttons render at h44 (size='lg') per Figma 330:42666 —
          smaller md (36 px) sizes break the action-row rhythm against
          the 44 px primary CTA. */}
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

const FormShell = ({ patient, stepIndex, onStepChange, onReadSmartCard, smartCardRead = false, completedSteps, children }) => {
  const history = useHistory();
  const [subTab, setSubTab] = useState('current');
  const isLast = stepIndex === REGISTRATION_STEP_LABELS.length - 1;

  /* Slide direction for the step-content enter animation. See
     `stepTransition.js` for the shared keyframes + CSS. */
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
      {/* Action bar — design-system SubHeader (matches Header's border + shadow) */}
      <FormActionBar
        onBack={() => history.push('/registration/queue')}
        onReadSmartCard={onReadSmartCard}
        smartCardRead={smartCardRead}
      />

      {/* Sub-tab strip — sticky under app Header when the form body scrolls. */}
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

      {/* Body — status bar + stepper + step content */}
      <div
        className='flex-1 flex flex-col'
        style={{
          padding: 'var(--dim-space-600)',
          gap: 'var(--dim-space-400)',
        }}
      >
        <StatusBar patient={patient} />

        {subTab === 'history' ? (
          /* History tab — read-only audit log of every field change.
             Stepper + Footer are intentionally hidden so the surface
             reads as a viewer, not an editable form. */
          <RegistrationEditHistoryPanel />
        ) : (
          /* Current tab — unified step card: stepper flush above body
             (Figma 2373:119045; mirrors TreatmentFormShell / ScreeningPage:
             one white surface, brand drop shadow, framed StepProgress
             hairline into the body). */
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
              /* `key={stepIndex}` re-mounts the wrapper on every step change
                 so the keyframe animation defined at module load runs again.
                 `data-direction` picks the slide axis (forward = from the
                 right, backward = from the left) for natural-feeling motion
                 when the user clicks ahead vs back. */
              key={stepIndex}
              data-direction={stepDirection}
              className='mih-step-content flex flex-col'
              style={{
                padding: 'var(--dim-space-600)',
                gap: 'var(--dim-space-500)',
              }}
            >
              {children}
            </div>
          </div>
        )}
      </div>

      {/* Footer only on the editing tab; the history view is read-only. */}
      {subTab !== 'history' && (
        <Footer stepIndex={stepIndex} onPrev={handlePrev} onNext={handleNext} isLast={isLast} />
      )}
    </main>
  );
};

export default FormShell;
