import React, { useEffect, useRef, useState } from 'react';

/* Draggable floating PiP shell — Figma PHCIS | Telemedicine
   Picture-in-Picture (58:13727). Drag anywhere within the boundary
   (viewport for `mode="fixed"`, parent box for `mode="absolute"`). */

const DEFAULT_SIZE = { width: 320, height: null };

/**
 * @param {'fixed' | 'absolute'} [mode='fixed']
 * @param {{ right?: number|string, bottom?: number|string, left?: number|string, top?: number|string }} [defaultEdge]
 * @param {React.RefObject<HTMLElement>} [boundaryRef] — clamp box; fixed defaults to viewport
 * @param {number|string} [width=320]
 * @param {number|string} [height]
 * @param {number|string} [zIndex]
 * @param {React.CSSProperties} [style]
 * @param {React.ReactNode} children
 */
const DraggablePip = ({
  mode = 'fixed',
  defaultEdge = { right: 20, bottom: 20 },
  boundaryRef = null,
  width = DEFAULT_SIZE.width,
  height = DEFAULT_SIZE.height,
  zIndex = 'var(--sm-z-overlay, 1300)',
  className = '',
  style,
  children,
  'aria-label': ariaLabel = 'หน้าต่างวิดีโอ PiP',
}) => {
  const panelRef = useRef(null);
  const dragRef = useRef(null);
  const [position, setPosition] = useState(null); // { x, y } in boundary coords
  const [dragging, setDragging] = useState(false);

  /* Reset parked position when size changes so we don't sit off-screen. */
  useEffect(() => {
    setPosition(null);
  }, [width, height, mode]);

  const getBoundaryRect = () => {
    if (boundaryRef?.current) return boundaryRef.current.getBoundingClientRect();
    if (mode === 'absolute' && panelRef.current?.offsetParent) {
      return panelRef.current.offsetParent.getBoundingClientRect();
    }
    return {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight,
      right: window.innerWidth,
      bottom: window.innerHeight,
    };
  };

  const beginDrag = (event) => {
    if (event.button != null && event.button !== 0) return;
    const interactive = event.target?.closest?.(
      'button, a, input, textarea, select, label, [data-no-drag], [role="button"], [role="radio"], [role="dialog"]',
    );
    if (interactive) return;

    const boundary = getBoundaryRect();
    const panel = panelRef.current?.getBoundingClientRect();
    if (!panel) return;

    dragRef.current = {
      offsetX: event.clientX - panel.left,
      offsetY: event.clientY - panel.top,
      pointerId: event.pointerId,
    };
    setPosition({
      x: panel.left - boundary.left,
      y: panel.top - boundary.top,
    });
    setDragging(true);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch (e) { /* ignore */ }
    event.preventDefault();
  };

  const moveDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const boundary = getBoundaryRect();
    const panel = panelRef.current?.getBoundingClientRect();
    if (!panel) return;

    const maxX = Math.max(0, boundary.width - panel.width);
    const maxY = Math.max(0, boundary.height - panel.height);
    setPosition({
      x: Math.min(maxX, Math.max(0, event.clientX - boundary.left - drag.offsetX)),
      y: Math.min(maxY, Math.max(0, event.clientY - boundary.top - drag.offsetY)),
    });
  };

  const endDrag = (event) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    try {
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch (e) { /* ignore */ }
  };

  const placed = position != null;

  return (
    <div
      ref={panelRef}
      className={className}
      role='dialog'
      aria-label={ariaLabel}
      onPointerDown={beginDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{
        position: mode,
        zIndex,
        width,
        ...(height != null ? { height } : null),
        boxSizing: 'border-box',
        cursor: dragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        userSelect: 'none',
        ...(placed
          ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' }
          : defaultEdge),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default DraggablePip;
