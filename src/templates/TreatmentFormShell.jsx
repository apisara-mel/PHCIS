import React from 'react';
import { useHistory } from 'react-router-dom';
import StepProgress from '@/components/step/StepProgress';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';

/* MIH TreatmentFormShell — Figma PHCIS | Medical-examination 317:29773.
   Unified step card: white surface, no outer border, Brand Drop Shadow
   Bottom/200. StepProgress (framed) + body + sticky footer.
   Header + PatientCard live on TreatmentFormPage. */

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
     FormShell's footer so the two shells render identical action bars. */
  return (
    <div className='flex items-center w-full' style={{
      gap: 'var(--dim-space-300)',
      padding: 'var(--dim-space-400) var(--dim-space-600)',
      borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
      background: 'var(--surface-navigation-default)',
      boxShadow: '0 -1px 2px var(--PrimaryShadow-600, rgba(8, 167, 104, 0.08))',
      position: 'sticky',
      bottom: 'var(--dim-space-0)',
    }}>
      <span className='inline-flex items-center' style={{
        gap: 'var(--dim-space-200)',
        color: 'var(--text-content-secondary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: 'var(--dim-radius-full)',
          background: 'var(--text-brandPrimary-default)',
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

const TreatmentFormShell = ({
  stepIndex, onStepChange, completedSteps, children,
  /* Overridable for non-OPD sub-departments (e.g. ANC) that reuse this
     shell with their own step titles + queue route — defaults keep OPD's
     TreatmentFormPage behaviour unchanged. */
  steps = TREATMENT_STEPS,
  queuePath = '/treat/queue',
}) => {
  const history = useHistory();
  const isLast = stepIndex === steps.length - 1;
  const handlePrev = () => {
    if (stepIndex === 0) history.push(queuePath);
    else onStepChange(stepIndex - 1);
  };
  const handleNext = () => {
    if (isLast) history.push(queuePath);
    else onStepChange(stepIndex + 1);
  };

  return (
    <main className='flex-1 min-w-0 flex flex-col' style={{
      background: 'var(--background-screen-brand-100, #F4FBF8)',
    }}>
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
          <div className='flex justify-center min-w-max overflow-x-auto'>
            <StepProgress
              framed
              steps={steps}
              current={stepIndex}
              completedSteps={completedSteps}
              onStepClick={onStepChange}
            />
          </div>
          {/* Step 1 brings its own ServiceDateList rail flush against the
              card's left edge, so it opts out of the 24px body padding.
              Steps 2–7 — Figma PHCIS treatment card body floor: min 640 px. */}
          <div
            className={stepIndex === 0 ? undefined : 'flex flex-1 flex-col min-h-0'}
            style={
              stepIndex === 0
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

      <Footer stepIndex={stepIndex} steps={steps} onPrev={handlePrev} onNext={handleNext} isLast={isLast} />
    </main>
  );
};

export default TreatmentFormShell;
