import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import SmallAlert from '@/components/alert/SmallAlert';
import { MIH_TOPBAR_OFFSET } from '@/hooks/useHeaderAutoHide';

/* Top-center PHCIS toast — Figma Appointment 19:8245 / PHCIS OPD 323:58923.
   Sits below the sticky app topbar (`--dim-size-1400`). Small Alert
   success|error · leadingGraphic="phcis" · Brand Drop Shadow Bottom/200 on
   the animated wrapper (`--filter-brand-drop-bottom-200`).

   Optional `session.action` — trailing CTA; hover pauses auto-dismiss until
   pointer leaves, then closes once total visible dwell ≥ DWELL_MS. */

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
 * @param {{
 *   id: number,
 *   variant: 'success'|'error',
 *   message?: string,
 *   action?: { label: string, onClick?: () => void },
 * } | null} props.session
 * @param {() => void} props.onDismiss
 */
export default function PhcisTopToast({ session, onDismiss }) {
  const [entered, setEntered] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const hoveringRef = useRef(false);
  const shownAtRef = useRef(0);
  const dwellTimerRef = useRef(null);
  const finishTimerRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (dwellTimerRef.current != null) {
      window.clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
    if (finishTimerRef.current != null) {
      window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
  }, []);

  const beginExit = useCallback(() => {
    const exitMs = reduceMotion ? 0 : EXIT_MS;
    clearTimers();
    setEntered(false);
    finishTimerRef.current = window.setTimeout(() => {
      onDismiss?.();
    }, exitMs);
  }, [clearTimers, onDismiss, reduceMotion]);

  const scheduleDwellExit = useCallback(() => {
    if (dwellTimerRef.current != null) window.clearTimeout(dwellTimerRef.current);
    const elapsed = shownAtRef.current ? Date.now() - shownAtRef.current : 0;
    const remaining = Math.max(0, DWELL_MS - elapsed);
    dwellTimerRef.current = window.setTimeout(() => {
      if (!hoveringRef.current) beginExit();
    }, remaining);
  }, [beginExit]);

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
      clearTimers();
      hoveringRef.current = false;
      shownAtRef.current = 0;
      return undefined;
    }

    hoveringRef.current = false;
    shownAtRef.current = 0;
    clearTimers();
    setEntered(false);

    const hasAction = Boolean(session.action?.label);
    let raf1 = 0;
    let raf2 = 0;

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setEntered(true);
        shownAtRef.current = Date.now();

        if (hasAction) {
          scheduleDwellExit();
          return;
        }

        dwellTimerRef.current = window.setTimeout(() => {
          beginExit();
        }, DWELL_MS);
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimers();
    };
  }, [session, reduceMotion, clearTimers, beginExit, scheduleDwellExit]);

  const handlePointerEnter = () => {
    if (!session?.action?.label) return;
    hoveringRef.current = true;
    if (dwellTimerRef.current != null) {
      window.clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
  };

  const handlePointerLeave = () => {
    if (!session?.action?.label) return;
    hoveringRef.current = false;
    const elapsed = shownAtRef.current ? Date.now() - shownAtRef.current : 0;
    if (elapsed >= DWELL_MS) {
      beginExit();
    } else {
      scheduleDwellExit();
    }
  };

  if (!session || typeof document === 'undefined') return null;

  const dur = reduceMotion ? 0 : ENTER_MS;
  const variant = session.variant === 'error' ? 'error' : 'success';
  const label = session.message ?? DEFAULT_MESSAGES[variant];
  const hasAction = Boolean(session.action?.label);

  const inner = (
    <div
      className='phcis-top-toast__inner'
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      aria-atomic='true'
      onMouseEnter={hasAction ? handlePointerEnter : undefined}
      onMouseLeave={hasAction ? handlePointerLeave : undefined}
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
        pointerEvents: hasAction ? 'auto' : 'none',
        ...(variant === 'success'
          ? { filter: 'var(--filter-brand-drop-bottom-200)' }
          : {}),
      }}
    >
      <SmallAlert
        variant={variant}
        leadingGraphic='phcis'
        leadingIconSize={16}
        iconGap='var(--dim-space-300, 12px)'
        omitBoxShadow={variant === 'success'}
        action={session.action?.label ? session.action : null}
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
        top: `calc(${MIH_TOPBAR_OFFSET} + var(--dim-space-400))`,
        transition: 'top 200ms ease',
        zIndex: 'var(--sm-z-tooltip, 1500)',
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: hasAction ? 'auto' : 'none',
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
