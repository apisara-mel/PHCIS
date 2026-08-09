import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

/* Soft clear for FilterTag rows — table content-fit remeasure + chip unmount
   otherwise snap. Prefer View Transition; CSS opacity/translate fallback. */

const CLEAR_MS = 160; /* --motion-duration-popover */

export default function useSmoothClearFilters(filtersActive, applyClear) {
  const [showClearChip, setShowClearChip] = useState(false);
  const [resultsOpaque, setResultsOpaque] = useState(true);
  const clearAnimRef = useRef(null);
  const applyClearRef = useRef(applyClear);
  applyClearRef.current = applyClear;

  useEffect(() => {
    if (filtersActive) setShowClearChip(true);
  }, [filtersActive]);

  useEffect(() => () => {
    if (clearAnimRef.current) window.clearTimeout(clearAnimRef.current);
  }, []);

  const runClear = () => {
    applyClearRef.current();
    setShowClearChip(false);
  };

  const clearFilters = () => {
    if (!filtersActive || clearAnimRef.current) return;

    const finishReveal = () => {
      requestAnimationFrame(() => {
        setResultsOpaque(true);
        clearAnimRef.current = null;
      });
    };

    if (typeof document !== 'undefined' && typeof document.startViewTransition === 'function') {
      document.startViewTransition(() => {
        flushSync(() => {
          runClear();
        });
      });
      return;
    }

    setResultsOpaque(false);
    setShowClearChip(false);
    clearAnimRef.current = window.setTimeout(() => {
      runClear();
      finishReveal();
    }, CLEAR_MS);
  };

  return { showClearChip, resultsOpaque, clearFilters };
}
