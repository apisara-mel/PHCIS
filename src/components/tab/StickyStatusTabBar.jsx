import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import TabPill, { TabBar } from '@/components/tab/TabPill';
import { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';

/* Status TabPill row — in flow above search at rest (24px top inset);
   sticks flush under SubNav when scrolled; large → small while stuck. */

export const MIH_STATUS_TABBAR_STICKY_TOP_VAR = '--mih-status-tabbar-sticky-top';
/** Live border-box bottom of this bar — table thead sticks flush here. */
export const MIH_STATUS_TABBAR_STICKY_BOTTOM_VAR = '--mih-status-tabbar-sticky-bottom';

/** @deprecated kept for callers that still read height; prefer sticky-bottom. */
export const MIH_STATUS_TABBAR_STICKY_HEIGHT_VAR = '--mih-status-tabbar-sticky-height';

/** Table thead sticky top = live bottom edge of this bar (no calc / no gap). */
export const QUEUE_STICKY_UNDER_STATUS_TABS =
  `var(${MIH_STATUS_TABBAR_STICKY_BOTTOM_VAR}, ${QUEUE_STICKY_UNDER_TABS})`;

const readFallbackTopPx = (fallback = 185) => {
  if (typeof document === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--mih-queue-sticky-under-tabs')
    .trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
};

/** Live bottom edge of SubNav sticky strip (flush stick target). */
const measureSubNavBottomPx = () => {
  if (typeof document === 'undefined') return readFallbackTopPx();
  const nav = document.querySelector('[data-mih-sticky-subnav]');
  if (nav) return Math.round(nav.getBoundingClientRect().bottom);
  return readFallbackTopPx();
};

const StickyStatusTabBar = ({
  tabs = [],
  value,
  onChange,
  'aria-label': ariaLabel = 'กรองตามสถานะ',
}) => {
  const barRef = useRef(null);
  const [stuck, setStuck] = useState(false);
  const [stickyTopPx, setStickyTopPx] = useState(() => readFallbackTopPx());

  const publishGeometry = () => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const el = barRef.current;
    if (!el) {
      root.style.setProperty(MIH_STATUS_TABBAR_STICKY_HEIGHT_VAR, '0px');
      root.style.setProperty(
        MIH_STATUS_TABBAR_STICKY_BOTTOM_VAR,
        root.style.getPropertyValue(MIH_STATUS_TABBAR_STICKY_TOP_VAR) || `${readFallbackTopPx()}px`,
      );
      return;
    }
    const rect = el.getBoundingClientRect();
    root.style.setProperty(
      MIH_STATUS_TABBAR_STICKY_HEIGHT_VAR,
      `${Math.round(rect.height)}px`,
    );
    /* Use painted bottom — accounts for negative rest marginTop so thead
       never leaves a see-through gap under this strip. */
    root.style.setProperty(
      MIH_STATUS_TABBAR_STICKY_BOTTOM_VAR,
      `${Math.round(rect.bottom)}px`,
    );
  };

  useEffect(() => {
    const sync = () => {
      const topPx = measureSubNavBottomPx();
      setStickyTopPx(topPx);
      document.documentElement.style.setProperty(
        MIH_STATUS_TABBAR_STICKY_TOP_VAR,
        `${topPx}px`,
      );

      /* ไม่ใช้ sentinel แยกอีกต่อไป — sentinel เป็น flex child อีกตัวของ
         การ์ด worklist ที่มี `gap` 24px จึงดัน TabPill ลงมาเกินระยะที่ตั้งไว้
         (พัก 24px กลายเป็น ~48px). แถบนี้เป็น position:sticky อยู่แล้ว
         เมื่อชนขอบบน rect.top จะเท่ากับ top ที่ตั้งไว้พอดี จึงอ่านสถานะ
         "ติดขอบ" จากตัวมันเองได้ตรง ๆ โดยไม่ต้องมี element เพิ่ม. */
      const el = barRef.current;
      if (!el) return;
      setStuck(el.getBoundingClientRect().top <= topPx + 0.5);
      publishGeometry();
    };

    sync();
    /* capture:true — บางหน้าเลื่อนที่ container ภายใน (MihPageScrollRoot)
       ไม่ใช่ window; ถ้าฟังแค่ window ค่า top จะค้างอยู่ที่ตอน mount แล้ว
       แถบจะหยุดต่ำกว่า SubNav จนเห็นแถวตารางลอดขึ้นมาด้านบน. */
    document.addEventListener('scroll', sync, { passive: true, capture: true });
    window.addEventListener('resize', sync);
    return () => {
      document.removeEventListener('scroll', sync, { capture: true });
      window.removeEventListener('resize', sync);
      document.documentElement.style.removeProperty(MIH_STATUS_TABBAR_STICKY_TOP_VAR);
      document.documentElement.style.removeProperty(MIH_STATUS_TABBAR_STICKY_BOTTOM_VAR);
      document.documentElement.style.removeProperty(MIH_STATUS_TABBAR_STICKY_HEIGHT_VAR);
    };
  }, []);

  /* Re-measure after stuck morph (padding / pill size) settles into layout. */
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const el = barRef.current;
    publishGeometry();
    const raf = requestAnimationFrame(() => {
      publishGeometry();
      requestAnimationFrame(publishGeometry);
    });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(publishGeometry) : null;
    if (el) ro?.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [stuck, tabs, value]);

  /* ชิปขนาดเล็กทั้งสองสถานะ (Figma TabPill "Default" — สูง 32px · ตัวอักษร 14)
     — ของเดิมตอนยังไม่ติดขอบใช้ "large" (สูง 48px · 16px) ซึ่งกินพื้นที่
     เหนือช่องค้นหามากเกินไปในหน้าคิวทั้งของเภสัชกรรมและเยี่ยมบ้าน. */
  const size = 'small';

  return (
    <div
      ref={barRef}
        className='w-full flex justify-center'
        style={{
          position: 'sticky',
          /* Pixel top from live SubNav bottom — flush, no gap under underline. */
          top: stickyTopPx,
          zIndex: 1090,
          background: 'var(--surface-card-100, #FFFFFF)',
          isolation: 'isolate',
          boxShadow: stuck ? 'var(--shadow-header)' : 'none',
          /* Full-bleed to worklist card edges (card pad = space-600). */
          marginLeft: 'calc(-1 * var(--dim-space-600))',
          marginRight: 'calc(-1 * var(--dim-space-600))',
          /* ระยะเหนือชิป = 24px พอดี ทั้งสองสถานะ:
             พัก  — ใช้ padding บนของการ์ด worklist (24px) เป็นระยะ จึงไม่ดึง
                    ขึ้นด้วย margin ลบ และไม่ใส่ padding บนซ้ำ (ของเดิม
                    -24 + 24 + track pad ทำให้เหลื่อมเป็น ~45px)
             ติดขอบ — ชิดใต้ SubNav ตามเดิม เพื่อไม่ให้หัวตารางมีช่องโหว่ */
          marginTop: 'var(--dim-space-0)',
          width: 'calc(100% + 2 * var(--dim-space-600))',
          paddingLeft: 'var(--dim-space-600)',
          paddingRight: 'var(--dim-space-600)',
          paddingTop: 'var(--dim-space-0)',
          paddingBottom: stuck ? 'var(--dim-space-200)' : 'var(--dim-space-0)',
          transition: [
            'box-shadow 200ms cubic-bezier(0.32, 0.72, 0, 1)',
            'padding 200ms cubic-bezier(0.32, 0.72, 0, 1)',
          ].join(', '),
        }}
      >
        <TabBar
          aria-label={ariaLabel}
          align='center'
          className='self-center shrink-0 max-w-full'
        >
          {tabs.map((t) => (
            <TabPill
              key={t.key}
              size={size}
              selected={value === t.key}
              leadingIcon={t.icon}
              count={typeof t.count === 'number' ? t.count : undefined}
              onClick={() => onChange?.(t.key)}
            >
              {t.label}
            </TabPill>
          ))}
        </TabBar>
    </div>
  );
};

export default StickyStatusTabBar;
