import { useCallback, useEffect, useRef, useState } from 'react';

/** เลือก section ที่ active ตาม scroll ภายใน scrollport (ใต้ sticky chrome). */
export function useTimelineScrollSpy(scrollRef, groups, getGroupKey = (g) => g.label) {
  const [activeKey, setActiveKey] = useState(null);
  const sectionRefs = useRef(new Map());

  const registerSection = useCallback((key, el) => {
    if (el) sectionRefs.current.set(String(key), el);
    else sectionRefs.current.delete(String(key));
  }, []);

  useEffect(() => {
    const root = scrollRef?.current;
    const keys = (groups || []).map((g) => String(getGroupKey(g)));
    if (!root || keys.length === 0) {
      setActiveKey(null);
      return undefined;
    }

    const pickActive = () => {
      const chromeEl = root.querySelector('.mih-timeline-sticky-chrome');
      const anchorTop = chromeEl
        ? chromeEl.getBoundingClientRect().bottom
        : root.getBoundingClientRect().top + 72;

      let current = keys[0];
      keys.forEach((key) => {
        const el = sectionRefs.current.get(key);
        if (!el) return;
        const { top } = el.getBoundingClientRect();
        if (top <= anchorTop + 2) current = key;
      });
      setActiveKey(current);
    };

    pickActive();
    root.addEventListener('scroll', pickActive, { passive: true });
    window.addEventListener('resize', pickActive);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(pickActive) : null;
    ro?.observe(root);
    const chrome = root.querySelector('.mih-timeline-sticky-chrome');
    if (chrome) ro?.observe(chrome);

    return () => {
      root.removeEventListener('scroll', pickActive);
      window.removeEventListener('resize', pickActive);
      ro?.disconnect();
    };
  }, [scrollRef, groups, getGroupKey]);

  const activeGroup = (groups || []).find((g) => String(getGroupKey(g)) === activeKey)
    ?? groups?.[0]
    ?? null;

  return { activeGroup, activeKey, registerSection };
}

export default useTimelineScrollSpy;
