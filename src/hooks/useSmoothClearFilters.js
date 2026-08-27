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

  /* ชิป "ล้างตัวกรอง" ต้องขึ้นเฉพาะตอนมีตัวกรองถูกเลือกจริงเท่านั้น — เดิมตั้ง
     เป็น true แล้วไม่เคยกลับ ทำให้ผู้ใช้ที่ปรับดรอปดาวน์กลับเป็นค่าเริ่มต้นเอง
     (เช่น "ทุกแพทย์") ยังเห็นชิปค้างทั้งที่ไม่มีอะไรให้ล้าง
     ระหว่างอนิเมชันล้าง (clearAnimRef) ปล่อยให้ตัว clearFilters คุมเอง */
  useEffect(() => {
    if (filtersActive) setShowClearChip(true);
    else if (!clearAnimRef.current) setShowClearChip(false);
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
