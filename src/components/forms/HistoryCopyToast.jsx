import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import SmallAlert from '@/components/alert/SmallAlert';

/* Top-center copy feedback — PHCIS | OPD Figma 322:49597. Renders in a
   portal; enter/exit slide + fade. Success pill elevation = Figma Brand
   Drop Shadow Bottom/200 via `filter: var(--filter-brand-drop-bottom-200)`
   on the animated wrapper + `omitBoxShadow` on SmallAlert (no double shadow). */

const ENTER_MS = 280;
const DWELL_MS = 3000;
const EXIT_MS = 280;

/** Full cycle (enter + visible dwell + exit) — keep row-level copy icon in sync. */
export const HISTORY_COPY_TOAST_CYCLE_MS = ENTER_MS + DWELL_MS + EXIT_MS;

const easing = 'cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * @param {object} props
 * @param {{ id: number, variant: 'success'|'error' } | null} props.session — non-null shows toast; `id` bumps restart timers
 * @param {() => void} props.onDismiss — called after exit animation (clear session in parent)
 */
export default function HistoryCopyToast({ session, onDismiss }) {
  const [entered, setEntered] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (!session) {
      setEntered(false);
      return undefined;
    }

    setEntered(false);
    const enterMs = reduceMotion ? 0 : ENTER_MS;
    const exitMs = reduceMotion ? 0 : EXIT_MS;

    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setEntered(true));
    });

    const startExit = window.setTimeout(() => {
      setEntered(false);
    }, enterMs + DWELL_MS);

    const finish = window.setTimeout(() => {
      onDismiss?.();
    }, enterMs + DWELL_MS + exitMs);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(startExit);
      window.clearTimeout(finish);
    };
  }, [session, reduceMotion, onDismiss]);

  if (!session || typeof document === 'undefined') return null;

  const dur = reduceMotion ? 0 : ENTER_MS;

  const inner = (
    <div
      className='copy-toast-portal__inner'
      style={{
        transitionProperty: reduceMotion
          ? 'opacity'
          : session.variant === 'success'
            ? 'opacity, transform, filter'
            : 'opacity, transform',
        transitionDuration: `${dur}ms`,
        transitionTimingFunction: easing,
        opacity: entered ? 1 : 0,
        transform: reduceMotion
          ? 'none'
          : entered
            ? 'translateY(0) scale(1)'
            : 'translateY(-14px) scale(0.98)',
        willChange: reduceMotion
          ? 'opacity'
          : session.variant === 'success'
            ? 'opacity, transform, filter'
            : 'opacity, transform',
        ...(session.variant === 'success'
          ? { filter: 'var(--filter-brand-drop-bottom-200)' }
          : {}),
      }}
    >
      <SmallAlert
        variant={session.variant}
        leadingGraphic='phcis'
        omitBoxShadow={session.variant === 'success'}
      />
    </div>
  );

  return createPortal(
    <div
      className='copy-toast-portal'
      style={{
        position: 'fixed',
        left: 'var(--dim-space-0)',
        right: 'var(--dim-space-0)',
        top: 'var(--dim-space-400)',
        zIndex: 10050,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        paddingLeft: 'var(--dim-space-200)',
        paddingRight: 'var(--dim-space-200)',
        paddingBottom: 'var(--dim-space-300)',
      }}
    >
      {inner}
    </div>,
    document.body,
  );
}
