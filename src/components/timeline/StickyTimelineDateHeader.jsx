import React, { useEffect, useRef, useState } from 'react';
import '@/components/timeline/stickyTimelineStyles';

/* MIH StickyTimelineDateHeader — หัวข้อวันที่/เดือนใน grouped timeline
   ติดด้านบนขณะ scroll · เปลี่ยนเมื่อ section ถัดไปดันแทนที่ (native sticky) */

const getScrollParent = (node) => {
  let el = node?.parentElement;
  while (el) {
    if (el.classList?.contains('mih-grouped-timeline-scroll')) return el;
    const { overflowY } = window.getComputedStyle(el);
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
      return el;
    }
    el = el.parentElement;
  }
  return null;
};

export default function StickyTimelineDateHeader({
  label,
  count = null,
  countLabel = 'รายการ',
  stickyTop = 0,
  background = 'var(--surface-card-100)',
  titleStyle,
  mutedStyle,
}) {
  const wrapRef = useRef(null);
  const sentinelRef = useRef(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const wrap = wrapRef.current;
    if (!sentinel || !wrap) return undefined;

    const root = getScrollParent(wrap);
    const topOffset = Number(stickyTop) || 0;
    const io = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      {
        root,
        threshold: 0,
        rootMargin: `${-topOffset - 1}px 0px 0px 0px`,
      },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [label, stickyTop]);

  return (
    <div ref={wrapRef} className='mih-timeline-sticky-date-wrap w-full min-w-0'>
      <div ref={sentinelRef} className='mih-timeline-sticky-date-sentinel' aria-hidden />
      <div
        className='mih-timeline-sticky-date w-full min-w-0'
        data-stuck={stuck || undefined}
        style={{ top: stickyTop, background }}
      >
        <span style={titleStyle}>{label}</span>
        {count != null && (
          <span style={mutedStyle}>{count} {countLabel}</span>
        )}
      </div>
    </div>
  );
}
