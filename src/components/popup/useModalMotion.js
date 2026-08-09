import { useEffect, useRef, useState } from 'react';

/** Keep in sync with `--motion-duration-modal` in index.css / design.md §1d. */
export const MODAL_MOTION_MS = 220;

/** Shared enter/exit mount cycle for modal surfaces (Popup · AlertDialog). */
export function useModalMotion(open, durationMs = MODAL_MOTION_MS) {
  const closeTimerRef = useRef(null);
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setMounted(true);

      /* Browsers stop running requestAnimationFrame in a background tab. The
         two-frame enter below would then never flip `visible`, leaving the
         overlay mounted at opacity 0 — invisible but still `pointer-events:
         auto` across the whole viewport, so every click is swallowed and the
         page reads as frozen. Seen on OPD Screening, whose confirm popup
         opens on mount (and whose tab goes to the background as soon as the
         nurse opens the observation system in a new tab).

         Hidden tab → skip the animation entirely; there is nothing to
         animate that anyone can see. */
      if (typeof document !== 'undefined' && document.hidden) {
        setVisible(true);
        return undefined;
      }

      setVisible(false);
      let outerRaf = 0;
      let innerRaf = 0;
      outerRaf = window.requestAnimationFrame(() => {
        innerRaf = window.requestAnimationFrame(() => setVisible(true));
      });
      /* Belt and braces for the visible-tab path: timers keep firing when
         rAF does not (tab hidden mid-transition, throttled frames), so the
         overlay can never get stuck invisible-but-blocking. */
      const settleTimer = window.setTimeout(() => setVisible(true), durationMs);
      return () => {
        window.cancelAnimationFrame(outerRaf);
        window.cancelAnimationFrame(innerRaf);
        window.clearTimeout(settleTimer);
      };
    }

    setVisible(false);
    closeTimerRef.current = window.setTimeout(() => {
      setMounted(false);
      closeTimerRef.current = null;
    }, durationMs);

    return () => {
      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [open, durationMs]);

  return { mounted, visible, motionState: visible ? 'visible' : 'hidden' };
}

export default useModalMotion;
