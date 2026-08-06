import React from 'react';
import PageHeaderInfoPanel from '@/components/layout/PageHeaderInfoPanel';
import WizardMorphHeader from '@/components/layout/WizardMorphHeader';
import {
  MIH_STICKY_BELOW_PATIENT,
  MIH_TOPBAR_OFFSET,
} from '@/hooks/useHeaderAutoHide';
import { MIH_CHROME_MORPH_STEP_BAND } from '@/components/layout/wizardChromeMorphStyles';

/** Sticky `top` when morph band sits below the app header only. */
export const MORPH_STICKY_BELOW_TOPBAR = MIH_TOPBAR_OFFSET;

/** Header + compact PatientCard sentinel (~64 px). */
export const MORPH_STICKY_BELOW_PATIENT = MIH_STICKY_BELOW_PATIENT;

/** Header + TabUnderline strip (~48 px). */
export const MORPH_STICKY_BELOW_TABS =
  `calc(${MIH_TOPBAR_OFFSET} + var(--dim-space-1200, 48px))`;

/** Scroll-morph stepper band for record forms (FormShell, TreatmentFormShell,
    OPD screening, pharmacy dispense, …) — same dense WizardMorphHeader as
    QueuePageShell wizards, sticky under caller-supplied chrome. */
const RecordWizardMorphBand = React.memo(function RecordWizardMorphBand({
  title,
  afterTitle = null,
  steps,
  current,
  onStepClick,
  completedSteps,
  /** Page title already in SubHeader — stepper band only. */
  hideTitle = false,
  sticky = true,
  stickyTop = MORPH_STICKY_BELOW_TOPBAR,
  stickyZIndex = 1090,
  className = '',
}) {
  const panel = (
    <PageHeaderInfoPanel dense>
      <WizardMorphHeader
        title={title}
        afterTitle={afterTitle}
        hideTitle={hideTitle}
        steps={steps}
        current={current}
        onStepClick={onStepClick}
        completedSteps={completedSteps}
      />
    </PageHeaderInfoPanel>
  );

  if (!sticky) return panel;

  return (
    <div
      className={`w-full shrink-0 ${MIH_CHROME_MORPH_STEP_BAND} ${className}`.trim()}
      style={{
        position: 'sticky',
        top: stickyTop,
        zIndex: stickyZIndex,
      }}
    >
      {panel}
    </div>
  );
});

export default RecordWizardMorphBand;
