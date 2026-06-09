import React, { useEffect, useState } from 'react';
import { Icon } from '@/components/icons/Icon';

/* MIH · SuccessToast — small inline alert pinned just above the page
   footer (Figma 139:20246 "Small Alert · State=Success").
   · Background var(--surface-smallalert-success, #24A899)
   · White TickOnCircle icon + white label
   · Pill shape (radius-full), gap-100 between icon and text
   · Padding 8/16/24 (vertical / left / right per Figma)
   · Drop shadow brand-bottom-200
   Behavior: appears with a fade + slide-up animation, auto-dismisses
   after `duration` ms. Parent renders unconditionally when `open` is
   true; the toast manages its own enter/exit animation lifecycle. */

const TOAST_ANIM_MS = 200;

const SuccessToast = ({
  open,
  message = 'สร้างตารางเวรสำเร็จ',
  onClose,
  duration = 2400,
  /* Top inset — distance from the viewport top edge per Figma 139:20246
     annotation ("appears at the top of the screen"). Pass a larger value
     when the page has a fixed header that would overlap. */
  topOffset = 'var(--dim-space-600, 24px)',
}) => {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  /* Mount + animation lifecycle (same pattern as DutyPickerSheet).
     · open=true  → mount, then on next frame flip visible=true so the
                    browser registers the initial off-screen layout and
                    animates to the rest position.
     · open=false → animate out, then unmount after the transition. */
  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), TOAST_ANIM_MS);
    return () => clearTimeout(t);
  }, [open]);

  /* Auto-dismiss after `duration` ms — parent's onClose callback flips
     `open` back to false, which triggers the exit animation above. */
  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => { if (onClose) onClose(); }, duration);
    return () => clearTimeout(t);
  }, [open, duration, onClose]);

  if (!mounted) return null;

  return (
    <div
      role='status'
      aria-live='polite'
      style={{
        position: 'fixed',
        left: '50%',
        top: topOffset,
        /* Slide-in from above the viewport edge (translate -12px when
           hidden) so the toast drops down into place on enter and
           lifts back up on exit. */
        transform: visible
          ? 'translate(-50%, 0)'
          : 'translate(-50%, -12px)',
        opacity: visible ? 1 : 0,
        transition: `opacity ${TOAST_ANIM_MS}ms ease-out, transform ${TOAST_ANIM_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
        zIndex: 60,
        pointerEvents: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--dim-space-100, 4px)',
        paddingLeft: 'var(--dim-space-400, 16px)',
        paddingRight: 'var(--dim-space-600, 24px)',
        paddingTop: 'var(--dim-space-200, 8px)',
        paddingBottom: 'var(--dim-space-200, 8px)',
        borderRadius: 'var(--dim-radius-full, 9999px)',
        background: 'var(--surface-smallalert-success, var(--brand-p500, #24A899))',
        color: 'var(--text-positive-on-positive, #FFFFFF)',
        boxShadow: 'var(--shadow-brand-drop-bottom-200, 0 1px 4px rgba(8,167,104,0.10), 0 1px 8px rgba(8,167,104,0.08))',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-base, 16px)',
        fontWeight: 'var(--type-weight-regular, 400)',
        lineHeight: 1.5,
        whiteSpace: 'nowrap',
      }}
    >
      <Icon name='check-circle' size={20} style={{ color: 'currentColor' }} />
      <span>{message}</span>
    </div>
  );
};

export default SuccessToast;
