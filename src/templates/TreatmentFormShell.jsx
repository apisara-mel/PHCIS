import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import RecordWizardMorphBand, { MORPH_STICKY_BELOW_PATIENT } from '@/components/layout/RecordWizardMorphBand';
import { MIH_CHROME_MORPH_FOOTER } from '@/components/layout/wizardChromeMorphStyles';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import InternalReferPopup from '@/components/popup/InternalReferPopup';

/* MIH TreatmentFormShell — Figma PHCIS | Medical-examination 317:29773.
   RecordWizardMorphBand (scroll-morph stepper) + unified step card body +
   sticky footer. Header + PatientCard live on the parent form page. */

export const TREATMENT_STEPS = [
  { title: 'ประวัติการรักษา', subtitle: 'Medical History' },
  { title: 'คัดกรองและซักประวัติ', subtitle: 'Screening' },
  { title: 'ตรวจร่างกาย', subtitle: 'Physical Examination' },
  { title: 'วินิจฉัย', subtitle: 'Diagnosis' },
  { title: 'สั่งการรักษา', subtitle: 'Treatment Order' },
  { title: 'นัดหมาย', subtitle: 'Appointment' },
  { title: 'ใบรับรองแพทย์', subtitle: 'Medical Certificate' },
];

export const TREATMENT_STEP_LABELS = TREATMENT_STEPS.map((s) => s.title);

const Footer = ({ stepIndex, steps, lastSavedMin = 2, onPrev, onNext, onSave, isLast }) => {
  /* Primary CTA label — Figma PHCIS pattern: "ถัดไป: [next step]" so the
     clinician sees where they're heading without re-reading the stepper.
     Last step swaps the forward label for the explicit commit action. */
  const nextStepLabel = isLast
    ? 'จบการบันทึก'
    : `ถัดไป: ${steps[stepIndex + 1].title}`;
  const isFirst = stepIndex === 0;

  /* Footer chrome — Figma PHCIS | Medical-examination 330:42666.
     Aliases the brand-tinted footer treatment used across PHCIS pages:
       • borderTop  → --border-brandPrimary-quaternary (#E2F3EB)
                      (not --border-card-default — that's the card grey)
       • shadow     → Brand Drop Shadow Bottom/100 — 1 px brand-green
                      glow above the bar so it floats off the form card
       • bg surface → --surface-navigation-default (same white as the
                      main app chrome — separates the action row from
                      the form's card-100 surface).
     The "บันทึกร่าง" button uses Brand Subdue outline (#C5EDDA border,
     #007549 text) per Figma — not NeutralSubdue. Same pattern as
     FormShell's footer so the two shells render identical action bars.
     mih-step-form: auto-save chip from step 2+; last primary uses check. */
  return (
    <div className={`flex items-center w-full ${MIH_CHROME_MORPH_FOOTER}`} style={{
      gap: 'var(--dim-space-300)',
      padding: 'var(--dim-space-400) var(--dim-space-600)',
      borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
      background: 'var(--surface-navigation-default)',
      boxShadow: '0 -1px 2px var(--PrimaryShadow-600, rgba(8, 167, 104, 0.08))',
      position: 'sticky',
      bottom: 'var(--dim-space-0)',
    }}>
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
            width: 6, height: 6, borderRadius: 'var(--dim-radius-full)',
            background: 'var(--text-brandPrimary-default)',
            flexShrink: 0,
          }} />
          ร่างแบบฟอร์ม (บันทึกล่าสุด: {lastSavedMin} นาทีที่แล้ว)
        </span>
      )}
      <div className='flex-1' />
      {/* All three buttons render at h44 (size='lg') per Figma 330:42666 —
          smaller md (36 px) sizes break the action-row rhythm against
          the 44 px primary CTA. */}
      <BrandSubdueButton variant='outline' size='lg' leadingIcon='save' onClick={onSave}>
        บันทึกร่าง
      </BrandSubdueButton>
      <BrandPrimaryButton size='lg' trailingIcon={isLast ? 'check' : 'arrow_forward'} onClick={onNext}>
        {nextStepLabel}
      </BrandPrimaryButton>
    </div>
  );
};

const TreatmentFormShell = ({
  stepIndex, onStepChange, completedSteps, children,
  /* Overridable for non-OPD sub-departments (e.g. ANC) that reuse this
     shell with their own step titles + queue route — defaults keep OPD's
     TreatmentFormPage behaviour unchanged. */
  steps = TREATMENT_STEPS,
  queuePath = '/treat/queue',
  morphTitle,
  morphStickyTop = MORPH_STICKY_BELOW_PATIENT,
  /* OPD's Step 1 brings its own ServiceDateList rail flush against the
     card's left edge, so it opts out of the 24px body padding — that's an
     OPD-specific layout quirk, not a general "step 1" rule. Sub-departments
     without that rail (e.g. ANC) pass `step0FlushLeft={false}` to keep the
     same 24px padding Step 1 gets in every other step. */
  step0FlushLeft = true,
  /** Optional leave handler for step 0 (ยกเลิก) — e.g. unsaved-changes guard. */
  onLeave,
  /** Optional บันทึกร่าง handler — wired to the sticky footer save button. */
  onSaveDraft,
  /** Shown as "จากแผนก" in the last-step internal-refer popup. */
  fromDepartment,
  /** Called after internal-refer confirm, before navigating to queuePath.
      Return false to skip the default history.push(queuePath). */
  onFinish,
}) => {
  const history = useHistory();
  const [referOpen, setReferOpen] = useState(false);
  const isLast = stepIndex === steps.length - 1;
  const stepTitle = typeof steps[stepIndex] === 'string'
    ? steps[stepIndex]
    : steps[stepIndex]?.title;
  const headerTitle = morphTitle ?? stepTitle ?? 'บันทึกการรักษา';
  const referFromDepartment = fromDepartment || headerTitle || 'ระบบบันทึกการรักษา';
  const handlePrev = () => {
    if (stepIndex === 0) {
      if (onLeave) onLeave();
      else history.push(queuePath);
    } else onStepChange(stepIndex - 1);
  };
  const handleNext = () => {
    if (isLast) setReferOpen(true);
    else onStepChange(stepIndex + 1);
  };
  const handleReferConfirm = (payload) => {
    setReferOpen(false);
    const cont = onFinish?.(payload);
    if (cont === false) return;
    history.push(queuePath);
  };

  return (
    <main className='flex-1 min-w-0 flex flex-col' style={{
      background: 'var(--background-screen-brand-100, #F4FBF8)',
    }}>
      <RecordWizardMorphBand
        title={headerTitle}
        steps={steps}
        current={stepIndex}
        completedSteps={completedSteps}
        onStepClick={onStepChange}
        stickyTop={morphStickyTop}
      />
      <div className='flex-1 flex flex-col min-h-0' style={{
        padding: 'var(--dim-space-600)',
        gap: 'var(--dim-space-400)',
      }}>
        <div
          className='flex flex-col w-full flex-1 min-h-0'
          style={{
            borderRadius: 'var(--dim-radius-500)',
            background: 'var(--surface-card-100)',
            boxShadow: 'var(--shadow-brand-drop-bottom-200)',
            overflow: 'hidden',
          }}
        >
          {/* Step 1 brings its own ServiceDateList rail flush against the
              card's left edge, so it opts out of the 24px body padding.
              Steps 2–7 — Figma PHCIS treatment card body floor: min 640 px. */}
          <div
            className={stepIndex === 0 && step0FlushLeft ? undefined : 'flex flex-1 flex-col min-h-0'}
            style={
              stepIndex === 0 && step0FlushLeft
                ? undefined
                : {
                    padding: 'var(--dim-space-600)',
                    minHeight: 640,
                  }
            }
          >
            {children}
          </div>
        </div>
      </div>

      <Footer
        stepIndex={stepIndex}
        steps={steps}
        onPrev={handlePrev}
        onNext={handleNext}
        onSave={onSaveDraft}
        isLast={isLast}
      />

      <InternalReferPopup
        open={referOpen}
        onClose={() => setReferOpen(false)}
        onConfirm={handleReferConfirm}
        fromDepartment={referFromDepartment}
        subtitle='เลือกแผนกและจุดบริการปลายทางก่อนจบการบันทึก'
      />
    </main>
  );
};

export default TreatmentFormShell;
