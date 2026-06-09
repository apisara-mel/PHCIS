import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const Popover = ({
  open,
  onClose,
  anchorRef,
  className = '',
  style = {},
  children,
}) => {
  const popRef = useRef(null);
  const [pos, setPos] = useState({ top: 'var(--dim-space-0)', left: 'var(--dim-space-0)', width: null });

  const updatePosition = () => {
    const el = anchorRef?.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 8; // aligns with var(--dim-space-100) default (8px in this DS)
    setPos({
      top: r.bottom + gap,
      left: r.left,
      width: r.width,
    });
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

    const onScrollOrResize = () => updatePosition();
    window.addEventListener('resize', onScrollOrResize);
    // Capture scroll on any ancestor
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open, anchorRef]);

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
