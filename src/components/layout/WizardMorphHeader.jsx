import React from 'react';
import StepMorphHeader from '@/components/layout/StepMorphHeader';
import StepProgress from '@/components/step/StepProgress';

/** Spread onto `<QueuePageShell>` for sticky scroll-morph wizard chrome.
    Pattern docs: .claude/skills/wizard-morph-header/SKILL.md */
export const WIZARD_MORPH_SHELL_PROPS = {
  stickyHeaderInfo: true,
  headerInfoDense: true,
};

/** Sticky wizard header — page title + StepProgress that morphs on scroll.
    Title centred below when expanded · title left + stepper right when collapsed.

    Usage:
      <QueuePageShell
        {...WIZARD_MORPH_SHELL_PROPS}
        headerInfo={(
          <WizardMorphHeader
            title='สร้างแบบฟอร์มใหม่'
            steps={STEPS}
            current={step}
            onStepClick={handleStepClick}
          />
        )}
      > */
const WizardMorphHeader = React.memo(function WizardMorphHeader({
  title,
  afterTitle = null,
  steps,
  current,
  onStepClick,
  completedSteps,
  labelNoWrap = true,
  hideLabels = false,
  className = '',
  stepProgressClassName = 'justify-center',
  /** Page title already rendered in SubHeader — stepper band only. */
  hideTitle = false,
  /** Stepper stays on its own row (no flex-wrap flip) — see StepMorphHeader. */
  stepperOwnRow = false,
}) {
  return (
    <StepMorphHeader
      dense
      title={title}
      afterTitle={afterTitle}
      hideTitle={hideTitle}
      stepperOwnRow={stepperOwnRow}
      className={className}
    >
      <StepProgress
        steps={steps}
        current={current}
        onStepClick={onStepClick}
        completedSteps={completedSteps}
        className={stepProgressClassName}
        labelNoWrap={labelNoWrap}
        hideLabels={hideLabels}
      />
    </StepMorphHeader>
  );
});

export default WizardMorphHeader;
