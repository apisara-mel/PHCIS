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
      setVisible(false);
      let outerRaf = 0;
      let innerRaf = 0;
      outerRaf = window.requestAnimationFrame(() => {
        innerRaf = window.requestAnimationFrame(() => setVisible(true));
      });
      return () => {
        window.cancelAnimationFrame(outerRaf);
        window.cancelAnimationFrame(innerRaf);
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
