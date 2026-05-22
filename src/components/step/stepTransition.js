import { useEffect, useRef } from 'react';

/* MIH step transition — shared animation for any stepper-driven page
   (FormShell / Registration, ScreeningPage / OPD, TreatmentFormShell, …).

   The per-step body fades + slides in over 320 ms with the project's
   out-quint easing whenever `stepIndex` changes. Direction picks the
   slide axis: forward (next step) glides from +24 px on the X axis;
   backward (previous step) glides from −24 px. `prefers-reduced-motion`
   disables the animation entirely.

   Usage:
     const direction = useStepDirection(stepIndex);
     <div key={stepIndex} data-direction={direction} className='mih-step-content'>
       <StepBody />
     </div>

   The CSS keyframes are injected once at module load via the project's
   idempotent `<style id>` pattern, so importing this file anywhere
   (FormShell, ScreeningPage, etc.) wires everything up — no per-page
   CSS duplication. */

const STYLE_ID = 'mih-step-transition';

if (typeof document !== 'undefined') {
  const css = `
@keyframes mih-step-enter-forward {
  from { opacity: 0; transform: translate3d(24px, 0, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
}
@keyframes mih-step-enter-backward {
  from { opacity: 0; transform: translate3d(-24px, 0, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
}
.mih-step-content {
  animation-duration: 320ms;
  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  animation-fill-mode: both;
  will-change: opacity, transform;
}
.mih-step-content[data-direction="forward"]  { animation-name: mih-step-enter-forward; }
.mih-step-content[data-direction="backward"] { animation-name: mih-step-enter-backward; }
@media (prefers-reduced-motion: reduce) {
  .mih-step-content { animation: none !important; }
}
`;
  let el = document.getElementById(STYLE_ID);
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  if (el.textContent !== css) el.textContent = css;
}

/* Track previous stepIndex so callers can tag the wrapper with the right
   slide direction. First mount returns 'forward' so the initial paint
   glides in from the right (feels like the page is "loading in"). */
export const useStepDirection = (stepIndex) => {
  const prevRef = useRef(stepIndex);
  const direction = stepIndex >= prevRef.current ? 'forward' : 'backward';
  useEffect(() => { prevRef.current = stepIndex; }, [stepIndex]);
  return direction;
};
