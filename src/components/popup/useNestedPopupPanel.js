import { useCallback, useMemo, useState } from 'react';
import { useStepDirection } from '@/components/step/stepTransition';

/* useNestedPopupPanel — drill-down ภายใน Popup เดียว (ไม่เปิด Popup ซ้อน Popup)
   Pattern อ้างอิง ConsentHistoryPopup: panelStep + onBack + slide microinteraction.

   Usage:
     const panels = useNestedPopupPanel('list');
     // panels.step, panels.direction, panels.goTo('export'), panels.goBack(), panels.reset() */

export function useNestedPopupPanel(initialStep = 0) {
  const [step, setStep] = useState(initialStep);
  const direction = useStepDirection(step);

  const goTo = useCallback((next) => setStep(next), []);
  const goBack = useCallback((fallback = initialStep) => {
    setStep((prev) => (prev === initialStep ? prev : fallback));
  }, [initialStep]);
  const reset = useCallback(() => setStep(initialStep), [initialStep]);

  return useMemo(() => ({
    step,
    direction,
    goTo,
    goBack,
    reset,
    isRoot: step === initialStep,
  }), [step, direction, goTo, goBack, reset, initialStep]);
}

export default useNestedPopupPanel;
