import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/* MIH Popover — fixed + portaled to document.body.
   Flips above the anchor when there is not enough room below
   (e.g. DatePicker near the bottom of a Popup). */

const VIEWPORT_PAD = 8;
const ANCHOR_GAP = 8; // aligns with var(--dim-space-100)

const Popover = ({
  open,
  onClose,
  anchorRef,
  className = '',
  style = {},
  children,
}) => {
  const popRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePosition = () => {
    const el = anchorRef?.current;
    const pop = popRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    const popH = pop?.offsetHeight || 0;
    const popW = pop?.offsetWidth || r.width;
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    let top = r.bottom + ANCHOR_GAP;
    const spaceBelow = vh - VIEWPORT_PAD - (r.bottom + ANCHOR_GAP);
    const spaceAbove = r.top - ANCHOR_GAP - VIEWPORT_PAD;

    if (popH > 0 && spaceBelow < popH && spaceAbove > spaceBelow) {
      top = Math.max(VIEWPORT_PAD, r.top - ANCHOR_GAP - popH);
    } else if (popH > 0 && top + popH > vh - VIEWPORT_PAD) {
      top = Math.max(VIEWPORT_PAD, vh - VIEWPORT_PAD - popH);
    }

    let left = r.left;
    if (left + popW > vw - VIEWPORT_PAD) {
      left = Math.max(VIEWPORT_PAD, vw - VIEWPORT_PAD - popW);
    }
    if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;

    setPos({ top, left });
  };

  useEffect(() => {
    if (!open) return undefined;

    const onDocDown = (e) => {
      const inPopover = popRef.current && popRef.current.contains(e.target);
      const inAnchor = anchorRef?.current && anchorRef.current.contains(e.target);
      if (!inPopover && !inAnchor) onClose && onClose();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') onClose && onClose();
    };

    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, anchorRef]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePosition();
    /* Second pass after calendar paints so flip uses real height. */
    const raf = requestAnimationFrame(() => updatePosition());

    const onScrollOrResize = () => updatePosition();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open, anchorRef, children]);

  if (!open) return null;

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      ref={popRef}
      className={`mih-popover-in ${className}`.trim()}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        ...style,
      }}
    >
      {children}
    </div>,
    document.body,
  );
};

export default Popover;
