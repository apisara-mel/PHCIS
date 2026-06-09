import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import SmallAlert from '@/components/alert/SmallAlert';

/* Top-center PHCIS toast — Figma Appointment 19:8245 / PHCIS OPD 323:58923.
   Sits below the sticky app topbar (`--dim-size-1400`). Small Alert
   success|error · leadingGraphic="phcis" · Brand Drop Shadow Bottom/200 on
   the animated wrapper (`--filter-brand-drop-bottom-200`). */

const ENTER_MS = 280;
const DWELL_MS = 3000;
const EXIT_MS = 280;

/** Full cycle (enter + visible dwell + exit). */
export const PHCIS_TOP_TOAST_CYCLE_MS = ENTER_MS + DWELL_MS + EXIT_MS;

const easing = 'cubic-bezier(0.22, 1, 0.36, 1)';

const DEFAULT_MESSAGES = {
  success: 'คัดลอกสำเร็จ',
  error: 'คัดลอกไม่สำเร็จ',
};

/**
 * @param {object} props
 * @param {{ id: number, variant: 'success'|'error', message?: string } | null} props.session
 * @param {() => void} props.onDismiss
 */
export default function PhcisTopToast({ session, onDismiss }) {
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
  const variant = session.variant === 'error' ? 'error' : 'success';
  const label = session.message ?? DEFAULT_MESSAGES[variant];

  const inner = (
    <div
      className='phcis-top-toast__inner'
      style={{
        transitionProperty: reduceMotion
          ? 'opacity'
          : variant === 'success'
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
          : variant === 'success'
            ? 'opacity, transform, filter'
            : 'opacity, transform',
        ...(variant === 'success'
          ? { filter: 'var(--filter-brand-drop-bottom-200)' }
          : {}),
      }}
    >
      <SmallAlert
        variant={variant}
        leadingGraphic='phcis'
        omitBoxShadow={variant === 'success'}
      >
        {label}
      </SmallAlert>
    </div>
  );

  return createPortal(
    <div
      className='phcis-top-toast-portal'
      style={{
        position: 'fixed',
        left: 'var(--dim-space-0)',
        right: 'var(--dim-space-0)',
        top: 'calc(var(--dim-size-1400, 64px) + var(--dim-space-400))',
        zIndex: 'var(--sm-z-tooltip, 1500)',
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
