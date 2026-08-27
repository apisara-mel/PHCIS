import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/** App topbar height — matches Header h-16 / `--dim-size-1400`. */
export const APP_TOPBAR_HEIGHT = 64;

/** Shared chrome motion — Header · PatientCard · step band stay in sync. */
export const CHROME_TRANSITION_MS = 280;
export const CHROME_TRANSITION_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

/** px scroll delta before toggling hide/show (debounce flicker). */
export const HEADER_HIDE_DELTA = 12;

/** Near page top — always show the bar. */
export const HEADER_SHOW_NEAR_TOP = 24;

/** Live topbar offset for sticky chrome (0 when hidden, 64 when visible). */
export const MIH_TOPBAR_OFFSET_VAR = '--mih-topbar-offset';

/** Near page bottom — always show the sticky footer. */
export const FOOTER_SHOW_NEAR_BOTTOM = 24;

/** 0→1 hide progress for sticky footers (lerped). */
export const MIH_FOOTER_MOTION_VAR = '--mih-footer-motion';

/** 1 when footer is collapsed, else 0 — for CSS hooks if needed. */
export const MIH_FOOTER_HIDDEN_VAR = '--mih-footer-hidden';

/** 1 when header is collapsed, else 0 — for CSS hooks if needed. */
export const MIH_HEADER_HIDDEN_VAR = '--mih-header-hidden';

/** Use in `top:` / `calc()` for sticky bands under the app header. */
export const MIH_TOPBAR_OFFSET =
  `var(${MIH_TOPBAR_OFFSET_VAR}, var(--dim-size-1400, ${APP_TOPBAR_HEIGHT}px))`;

/** Live measured height of sticky `PatientCard` (full + alert row). */
export const MIH_PATIENT_CARD_STICKY_HEIGHT_VAR = '--mih-patient-card-sticky-height';

/** Sticky stepper / PatientCard — topbar + live PatientCard height. */
export const MIH_STICKY_BELOW_PATIENT =
  `calc(${MIH_TOPBAR_OFFSET} + var(${MIH_PATIENT_CARD_STICKY_HEIGHT_VAR}, var(--dim-size-1400, ${APP_TOPBAR_HEIGHT}px)))`;

const CHROME_LERP = 0.14;
const CHROME_SETTLE_EPS = 0.35;

/** @type {Map<string, { current: number, target: number, raf: number, listeners: Set<(n: number) => void>, unit: 'px' | '' }>} */
const lerpChannels = new Map();

const writeCssLength = (varName, value) => {
  if (typeof document === 'undefined') return;
  const rounded = Math.round(value * 100) / 100;
  document.documentElement.style.setProperty(varName, `${rounded}px`);
};

const writeCssUnitless = (varName, value) => {
  if (typeof document === 'undefined') return;
  const rounded = Math.round(value * 10000) / 10000;
  document.documentElement.style.setProperty(varName, String(rounded));
};

const tickLerp = (varName) => {
  const ch = lerpChannels.get(varName);
  if (!ch) return;

  const diff = ch.target - ch.current;
  if (Math.abs(diff) < CHROME_SETTLE_EPS) {
    ch.current = ch.target;
    ch.raf = 0;
  } else {
    ch.current += diff * CHROME_LERP;
    ch.raf = requestAnimationFrame(() => tickLerp(varName));
  }

  if (ch.unit === '') writeCssUnitless(varName, ch.current);
  else writeCssLength(varName, ch.current);
  ch.listeners.forEach((fn) => fn(ch.current));

  if (!ch.raf && Math.abs(ch.target - ch.current) >= CHROME_SETTLE_EPS) {
    ch.raf = requestAnimationFrame(() => tickLerp(varName));
  }
};

/** Smoothly animate a CSS custom property toward `target`. */
export function setLerpedCssLength(varName, target, onFrame, unit = 'px') {
  let ch = lerpChannels.get(varName);
  if (!ch) {
    ch = { current: target, target, raf: 0, listeners: new Set(), unit };
    lerpChannels.set(varName, ch);
    if (unit === '') writeCssUnitless(varName, target);
    else writeCssLength(varName, target);
  }
  ch.target = target;
  ch.unit = unit;
  if (onFrame) ch.listeners.add(onFrame);
  if (!ch.raf) ch.raf = requestAnimationFrame(() => tickLerp(varName));

  return () => {
    if (onFrame) ch.listeners.delete(onFrame);
  };
}

/** Snap without animation — route changes / unmount. */
export function snapLerpedCssLength(varName, value, onFrame, unit = 'px') {
  const ch = lerpChannels.get(varName);
  if (ch?.raf) cancelAnimationFrame(ch.raf);
  lerpChannels.set(varName, {
    current: value,
    target: value,
    raf: 0,
    listeners: ch?.listeners ?? new Set(),
    unit,
  });
  if (unit === '') writeCssUnitless(varName, value);
  else writeCssLength(varName, value);
  ch?.listeners.forEach((fn) => fn(value));
  if (onFrame) onFrame(value);
}

export function clearLerpedCssLength(varName) {
  const ch = lerpChannels.get(varName);
  if (ch?.raf) cancelAnimationFrame(ch.raf);
  lerpChannels.delete(varName);
  if (typeof document !== 'undefined') {
    document.documentElement.style.removeProperty(varName);
  }
}

/**
 * Subscribe to a lerped CSS length and re-render ONLY this component on each
 * frame. เดิมค่านี้ถูกเก็บเป็น state ของ provider ทั้งแอป ทุกเฟรมของการ scroll
 * จึง re-render ทุกหน้าจอที่อยู่ใต้ provider (ตารางคิวเป็นพันแถวก็โดนด้วย) —
 * นั่นคือต้นเหตุที่เลื่อนแล้วกระตุก · ตอนนี้ provider ถือแค่ boolean ที่เปลี่ยน
 * นาน ๆ ครั้ง ส่วนแถบที่ต้องขยับตามจริง ๆ (Header) มาสมัครรับเอง
 */
export function useLerpedCssLength(varName, initial, unit = 'px') {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    const ch = lerpChannels.get(varName);
    if (ch) setValue(ch.current);
    return setLerpedCssLength(varName, ch?.target ?? initial, setValue, unit);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [varName, unit]);
  return value;
}

/** Live topbar height (0…64) — re-renders the caller once per frame. */
export function useLerpedTopbarOffset() {
  return useLerpedCssLength(MIH_TOPBAR_OFFSET_VAR, APP_TOPBAR_HEIGHT);
}

/** Mark page-level scroll containers — always drive header auto-hide. */
export const MIH_SCROLL_ROOT_ATTR = 'data-mih-scroll-root';

/** Minimum viewport fraction for a nested scroller to drive header auto-hide. */
const PAGE_SCROLLER_MIN_VH = 0.32;

const isDocumentScrollTarget = (target) =>
  target === document
  || target === document.documentElement
  || target === document.body
  || target === document.scrollingElement;

const readPageScrollY = () => {
  if (typeof window === 'undefined') return 0;
  const root = document.scrollingElement;
  return root?.scrollTop ?? window.scrollY ?? 0;
};

const isPageLevelScroller = (el) => {
  if (!(el instanceof Element)) return false;
  if (el.hasAttribute(MIH_SCROLL_ROOT_ATTR)) return true;
  const { overflowY } = window.getComputedStyle(el);
  if (!/(auto|scroll|overlay)/.test(overflowY)) return false;
  if (el.scrollHeight <= el.clientHeight + 2) return false;
  const rect = el.getBoundingClientRect();
  return rect.height >= window.innerHeight * PAGE_SCROLLER_MIN_VH;
};

const getWindowScrollMetrics = () => {
  const root = document.scrollingElement;
  const y = readPageScrollY();
  const scrollHeight = Math.max(
    root?.scrollHeight ?? 0,
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
  );
  const viewportH = window.innerHeight;
  return {
    y,
    nearTop: y <= HEADER_SHOW_NEAR_TOP,
    nearBottom: y + viewportH >= scrollHeight - FOOTER_SHOW_NEAR_BOTTOM,
  };
};

const getElementScrollMetrics = (el) => {
  const y = el.scrollTop;
  return {
    y,
    nearTop: y <= HEADER_SHOW_NEAR_TOP,
    nearBottom: y + el.clientHeight >= el.scrollHeight - FOOTER_SHOW_NEAR_BOTTOM,
  };
};

const applyChromeScroll = (metrics, lastRef, setHeaderHidden, setFooterHidden) => {
  const { y, nearTop, nearBottom } = metrics;
  const delta = y - lastRef.current;
  lastRef.current = y;

  if (nearTop) setHeaderHidden(false);
  else if (delta > HEADER_HIDE_DELTA) setHeaderHidden(true);
  else if (delta < -HEADER_HIDE_DELTA) setHeaderHidden(false);

  if (nearBottom) setFooterHidden(false);
  else if (delta > HEADER_HIDE_DELTA) setFooterHidden(true);
  else if (delta < -HEADER_HIDE_DELTA) setFooterHidden(false);
};

/**
 * Scroll-direction auto-hide for PHCIS top header + legal/copyright footer row.
 *   · ปัดขึ้น / scroll down (scrollY increases) → hide
 *   · ปัดลง / scroll up   (scrollY decreases)   → show
 * Header always shows near page top; legal footer always shows near page bottom.
 * Sticky action bars (bottom sticker) are never auto-hidden.
 * Publishes `--mih-topbar-offset` + `--mih-footer-motion` on `:root` with lerp.
 */
export function useHeaderAutoHideState() {
  const [headerHidden, setHeaderHidden] = useState(false);
  const [footerHidden, setFooterHidden] = useState(false);
  const lastWindowScrollY = useRef(0);
  const lastElementScrollY = useRef(new WeakMap());
  const { pathname } = useLocation();

  const targetOffset = headerHidden ? 0 : APP_TOPBAR_HEIGHT;
  const targetFooterMotion = footerHidden ? 1 : 0;

  /* New route → reset chrome visible so navigation always lands with bars. */
  useEffect(() => {
    lastWindowScrollY.current = readPageScrollY();
    lastElementScrollY.current = new WeakMap();
    setHeaderHidden(false);
    setFooterHidden(false);
    snapLerpedCssLength(MIH_TOPBAR_OFFSET_VAR, APP_TOPBAR_HEIGHT);
    snapLerpedCssLength(MIH_FOOTER_MOTION_VAR, 0, undefined, '');
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    lastWindowScrollY.current = readPageScrollY();
    let windowScrollRaf = 0;

    const syncWindowScroll = () => {
      if (windowScrollRaf) return;
      windowScrollRaf = requestAnimationFrame(() => {
        windowScrollRaf = 0;
        applyChromeScroll(
          getWindowScrollMetrics(),
          lastWindowScrollY,
          setHeaderHidden,
          setFooterHidden,
        );
      });
    };

    const onCaptureScroll = (event) => {
      const target = event.target;

      if (isDocumentScrollTarget(target)) {
        syncWindowScroll();
        return;
      }

      if (!isPageLevelScroller(target)) return;

      const el = /** @type {Element} */ (target);
      const metrics = getElementScrollMetrics(el);
      let last = lastElementScrollY.current.get(el);
      if (last === undefined) {
        last = metrics.y;
        lastElementScrollY.current.set(el, last);
      }
      const state = { current: last };
      applyChromeScroll(metrics, state, setHeaderHidden, setFooterHidden);
      lastElementScrollY.current.set(el, state.current);
    };

    syncWindowScroll();
    window.addEventListener('scroll', syncWindowScroll, { passive: true });
    document.addEventListener('scroll', onCaptureScroll, { passive: true, capture: true });

    return () => {
      if (windowScrollRaf) cancelAnimationFrame(windowScrollRaf);
      window.removeEventListener('scroll', syncWindowScroll);
      document.removeEventListener('scroll', onCaptureScroll, { capture: true });
    };
  }, []);

  /* ค่าที่ lerp ถูกเขียนลง CSS var ตรง ๆ ไม่ผ่าน state — แถบต่าง ๆ อ่านจาก
     `var(--mih-topbar-offset)` ใน `top:`/`calc()` จึงขยับพร้อมกันทุกเฟรมโดย
     ไม่ต้อง re-render อะไรเลย (ดู `useLerpedTopbarOffset` สำหรับคนที่ต้องใช้เลข) */
  useEffect(() => {
    return setLerpedCssLength(MIH_TOPBAR_OFFSET_VAR, targetOffset);
  }, [targetOffset]);

  useEffect(() => {
    return setLerpedCssLength(MIH_FOOTER_MOTION_VAR, targetFooterMotion, undefined, '');
  }, [targetFooterMotion]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    document.documentElement.style.setProperty(
      MIH_HEADER_HIDDEN_VAR,
      headerHidden ? '1' : '0',
    );
    document.documentElement.style.setProperty(
      MIH_FOOTER_HIDDEN_VAR,
      footerHidden ? '1' : '0',
    );
    if (footerHidden) {
      document.documentElement.dataset.mihFooterHidden = '1';
    } else {
      delete document.documentElement.dataset.mihFooterHidden;
    }
    return () => {
      document.documentElement.style.removeProperty(MIH_HEADER_HIDDEN_VAR);
      document.documentElement.style.removeProperty(MIH_FOOTER_HIDDEN_VAR);
      delete document.documentElement.dataset.mihFooterHidden;
    };
  }, [headerHidden, footerHidden]);

  useEffect(() => () => {
    clearLerpedCssLength(MIH_TOPBAR_OFFSET_VAR);
    clearLerpedCssLength(MIH_FOOTER_MOTION_VAR);
  }, []);

  return { headerHidden, footerHidden };
}
