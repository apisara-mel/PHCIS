import { useEffect, useState } from 'react';

/** px scrolled over which `--header-morph` runs 0 → 1 */
export const HEADER_MORPH_RANGE = 160;

/** 0–1 lerp gain per frame @60fps — lower = silkier follow, higher = tighter to scroll. */
export const HEADER_MORPH_LERP = 0.11;

/** Smoothstep — zero 2nd derivative at endpoints (no abrupt acceleration). */
export const smoothstepMorph = (t) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

export const easeHeaderMorph = (raw) => {
  const t = Math.min(1, Math.max(0, raw));
  return 1 - (1 - t) ** 3;
};

/** px scrolled over which popup morph runs 0 → 1 (shorter = snappier compact). */
export const POPUP_MORPH_RANGE = 100;

/** Tighter follow for modal step chrome — was 0.065 (felt sluggish). */
export const POPUP_MORPH_LERP = 0.22;

/** Smoothly animates a 0→1 morph toward scroll-derived target (shared by CSS var + hooks). */
export const createHeaderMorphAnimator = (emit, {
  lerp = HEADER_MORPH_LERP,
  range = HEADER_MORPH_RANGE,
  smoothMotion = true,
  smoothTarget = true,
  settleEpsilon = 0.0005,
} = {}) => {
  let current = 0;
  let target = 0;
  let raf = 0;

  const tick = () => {
    const delta = target - current;
    if (Math.abs(delta) < settleEpsilon) {
      current = target;
    } else {
      current += delta * lerp;
    }
    const motion = smoothMotion ? smoothstepMorph(current) : current;
    emit(current, motion);
    if (Math.abs(target - current) > settleEpsilon) {
      raf = requestAnimationFrame(tick);
    } else {
      raf = 0;
    }
  };

  const setTargetFromScroll = (scrollY) => {
    const raw = scrollY / range;
    target = smoothTarget
      ? easeHeaderMorph(raw)
      : Math.min(1, Math.max(0, raw));
    if (!raf) raf = requestAnimationFrame(tick);
  };

  const destroy = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  return { setTargetFromScroll, destroy };
};

/** Reactive 0→1 morph value for components that need compact chrome while scrolled. */
export const useHeaderMorphValue = () => {
  const [morph, setMorph] = useState(0);
  useEffect(() => {
    const animator = createHeaderMorphAnimator((value) => setMorph(value));
    const onScroll = () => animator.setTargetFromScroll(window.scrollY);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      animator.destroy();
    };
  }, []);
  return morph;
};

/** Nearest ancestor with vertical scroll (popup body, queue shell, …). */
export function findScrollableParent(el) {
  if (!el) return null;
  let node = el.parentElement;
  while (node) {
    const { overflowY } = window.getComputedStyle(node);
    if (/(auto|scroll|overlay)/.test(overflowY)) return node;
    node = node.parentElement;
  }
  return null;
}

/** Scroll-morph for modals — sets scoped CSS vars on `hostRef` from a scrollable ancestor. */
export const POPUP_MORPH_VAR = '--mih-popup-morph';
export const POPUP_MORPH_MOTION_VAR = '--mih-popup-morph-motion';

export const useLocalHeaderMorph = (hostRef, {
  enabled = true,
  morphVar = POPUP_MORPH_VAR,
  motionVar = POPUP_MORPH_MOTION_VAR,
  reactive = false,
  lerp = POPUP_MORPH_LERP,
  range = POPUP_MORPH_RANGE,
  smoothMotion = false,
  smoothTarget = false,
  settleEpsilon = 0.002,
} = {}) => {
  const [morph, setMorph] = useState(0);

  useEffect(() => {
    if (!enabled) {
      if (reactive) setMorph(0);
      return undefined;
    }

    let cleanup = () => {};
    let rafId = 0;

    const setup = () => {
      cleanup();
      const hostEl = hostRef.current;
      const scrollEl = findScrollableParent(hostEl);
      if (!hostEl || !scrollEl) return false;

      hostEl.style.setProperty(morphVar, '0');
      hostEl.style.setProperty(motionVar, '0');

      const animator = createHeaderMorphAnimator((value, motion) => {
        hostEl.style.setProperty(morphVar, value.toFixed(4));
        hostEl.style.setProperty(motionVar, motion.toFixed(4));
        if (reactive) setMorph(value);
      }, { lerp, range, smoothMotion, smoothTarget, settleEpsilon });
      const onScroll = () => animator.setTargetFromScroll(scrollEl.scrollTop);
      onScroll();
      scrollEl.addEventListener('scroll', onScroll, { passive: true });
      cleanup = () => {
        scrollEl.removeEventListener('scroll', onScroll);
        animator.destroy();
        hostEl.style.removeProperty(morphVar);
        hostEl.style.removeProperty(motionVar);
      };
      return true;
    };

    if (!setup()) {
      rafId = requestAnimationFrame(() => { setup(); });
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      cleanup();
      if (reactive) setMorph(0);
    };
  }, [enabled, hostRef, morphVar, motionVar, reactive, lerp, range, smoothMotion, smoothTarget, settleEpsilon]);

  return morph;
};

/** Writes `--header-morph` (0→1) on `:root` from window scroll — one listener app-wide. */
export const useGlobalHeaderMorph = () => {
  useEffect(() => {
    const animator = createHeaderMorphAnimator((value, motion) => {
      document.documentElement.style.setProperty('--header-morph', value.toFixed(4));
      document.documentElement.style.setProperty('--header-morph-motion', motion.toFixed(4));
    });
    const onScroll = () => animator.setTargetFromScroll(window.scrollY);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      animator.destroy();
      document.documentElement.style.removeProperty('--header-morph');
      document.documentElement.style.removeProperty('--header-morph-motion');
    };
  }, []);
};
