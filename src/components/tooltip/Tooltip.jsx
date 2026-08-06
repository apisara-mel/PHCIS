import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/* MIH Tooltip — Figma "Tooltip" (node 365:35).

   Two exports:
     • default `Tooltip`   — interactive wrapper that anchors a TooltipBubble
                              to its child on hover / focus.
     • named   `TooltipBubble` — pure visual (bubble + caret) used by the
                              state-matrix table in the components library.

   Property panel (matches Figma 1:1):
     • Position    'top' | 'bottom' | 'left' | 'right'
     • Variant     'brand' (default · dark brand surface) |
                   'light' (white card · matches VitalsSignGraph hover)

   Visual (brand):
     • Bubble: brand-p700 surface, 8px padding, 8px radius, body4 text in
       neutral/50 (#F9FBFB), drop shadow.
     • Caret:  CSS-triangle pointing toward the anchor, flush against the
       bubble's edge so the two read as one shape.

   Visual (light) — same tokens as ChartTooltip in VitalsSignGraph.jsx:
     • surface/card/100 · border/popover/grey · shadow/dropdown ·
       text/content/default
     • Multi-line: `whiteSpace: normal` + `overflowWrap: break-word` when
       content exceeds `maxWidth` (default 320px). Left-aligned text.
       Brand variant stays single-line (`nowrap`) for short icon hints.

   Interactive behavior (Tooltip):
     • Opens on mouseenter / focusin of the wrapped child.
     • Closes on mouseleave / focusout / Escape.
     • Anchors via getBoundingClientRect into a portal, re-positioned on
       scroll & resize. `delay` (default 200ms) debounces the open so quick
       cursor passes don't flash the bubble.
     • Smooth enter/exit motion — fade + 4% scale + 4px slide from the
       anchor edge. Honors `prefers-reduced-motion: reduce`.

   Tokens alias from design.md; surface retints with [data-brand].        */

const VARIANT_TOKENS = {
  brand: {
    surface: 'var(--surface-tooltip-default, var(--brand-p700, #007549))',
    text:    'var(--text-tooltip-default, #F9FBFB)',
    border:  'none',
    shadow:  'drop-shadow(0 0 1px rgba(15,23,42,0.18)) drop-shadow(0 4px 12px rgba(15,23,42,0.08))',
    shadowMode: 'filter',
  },
  light: {
    surface: 'var(--surface-card-100)',
    text:    'var(--text-content-default)',
    border:  'var(--dim-stroke-100) solid var(--border-popover-grey)',
    shadow:  'var(--shadow-dropdown)',
    shadowMode: 'boxShadow',
  },
};

const CARET_SIZE = 6;       /* px — half-width of the triangle base */
const CARET_DEPTH = 6;      /* px — depth toward the anchor */
const ANCHOR_GAP = 8;       /* px — distance between anchor and bubble caret tip */

/* Motion — short, snappy easing curve (Material "decelerated").
   Two-axis transition (opacity + transform) keeps the bubble from feeling
   like it teleports; ~160ms is fast enough not to delay perceived
   responsiveness on the existing `delay` debounce. */
const ANIM_MS = 160;
const ANIM_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const SLIDE_PX = 4;
const SCALE_FROM = 0.96;

/* Per-position motion config — slide originates from the side closest to
   the anchor, scale grows from that same edge, so the bubble reads as
   "popping out of" the anchor instead of floating in from nowhere. */
const MOTION_BY_POSITION = {
  top:    { origin: 'bottom center', hidden: `translate3d(0, ${SLIDE_PX}px, 0) scale(${SCALE_FROM})` },
  bottom: { origin: 'top center',    hidden: `translate3d(0, ${-SLIDE_PX}px, 0) scale(${SCALE_FROM})` },
  left:   { origin: 'center right',  hidden: `translate3d(${SLIDE_PX}px, 0, 0) scale(${SCALE_FROM})` },
  right:  { origin: 'center left',   hidden: `translate3d(${-SLIDE_PX}px, 0, 0) scale(${SCALE_FROM})` },
};

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
};

const Bubble = ({ children, maxWidth, tokens, withShadow = false, wrap = false }) => (
  <div
    style={{
      background: tokens.surface,
      color: tokens.text,
      border: tokens.border,
      padding: 'var(--dim-space-200, 8px)',
      borderRadius: 'var(--dim-radius-200, 8px)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-sm)',
      fontWeight: 'var(--type-weight-regular)',
      lineHeight: 1.5,
      textAlign: wrap ? 'left' : 'center',
      maxWidth,
      minWidth: wrap ? 0 : undefined,
      whiteSpace: wrap ? 'normal' : 'nowrap',
      overflowWrap: wrap ? 'break-word' : undefined,
      wordBreak: wrap ? 'break-word' : undefined,
      ...(withShadow && tokens.shadowMode === 'boxShadow' ? { boxShadow: tokens.shadow } : {}),
    }}
  >
    {children}
  </div>
);

const Caret = ({ direction, surface }) => {
  const transparent = `${CARET_SIZE}px solid transparent`;
  const filled      = `${CARET_DEPTH}px solid ${surface}`;
  let style;
  switch (direction) {
    case 'down':
      style = { borderLeft: transparent, borderRight: transparent, borderTop:    filled };
      break;
    case 'up':
      style = { borderLeft: transparent, borderRight: transparent, borderBottom: filled };
      break;
    case 'right':
      style = { borderTop:  transparent, borderBottom: transparent, borderLeft:  filled };
      break;
    case 'left':
    default:
      style = { borderTop:  transparent, borderBottom: transparent, borderRight: filled };
      break;
  }
  return (
    <span aria-hidden style={{ display: 'block', width: 0, height: 0, ...style }} />
  );
};

const DIRECTION_FROM_POSITION = {
  top:    'down',
  bottom: 'up',
  left:   'right',
  right:  'left',
};

/* ── TooltipBubble — pure visual (used by state-matrix grids) ── */
export const TooltipBubble = React.forwardRef(function TooltipBubble(
  {
    position = 'top',
    variant = 'brand',
    children = 'Tooltip text content',
    maxWidth = 160,
    wrap,
    className = '',
    style = {},
    ...rest
  },
  ref,
) {
  const tokens = VARIANT_TOKENS[variant] || VARIANT_TOKENS.brand;
  const direction = DIRECTION_FROM_POSITION[position] || 'down';
  const isVertical = position === 'top' || position === 'bottom';
  const caretFirst = position === 'bottom' || position === 'right';
  /* Light = chart/popover card (VitalsSignGraph) — no caret, shadow on bubble. */
  const showCaret = variant !== 'light';
  const textWrap = wrap ?? variant === 'light';
  const shadowStyle = showCaret && tokens.shadowMode === 'boxShadow'
    ? { boxShadow: tokens.shadow }
    : tokens.shadowMode === 'filter'
      ? { filter: tokens.shadow }
      : {};

  return (
    <div
      ref={ref}
      role='tooltip'
      className={className}
      style={{
        display: 'inline-flex',
        flexDirection: isVertical ? 'column' : 'row',
        alignItems: 'center',
        pointerEvents: 'none',
        ...shadowStyle,
        ...style,
      }}
      {...rest}
    >
      {showCaret && caretFirst && <Caret direction={direction} surface={tokens.surface} />}
      <Bubble maxWidth={maxWidth} tokens={tokens} withShadow={!showCaret} wrap={textWrap}>{children}</Bubble>
      {showCaret && !caretFirst && <Caret direction={direction} surface={tokens.surface} />}
    </div>
  );
});

/* ── Tooltip — interactive wrapper ──
   Renders the child anchor inline. On hover / focus, portals a
   TooltipBubble next to the anchor at the requested position.            */
const Tooltip = ({
  content,
  position = 'top',
  variant = 'brand',
  delay = 200,
  disabled = false,
  maxWidth = variant === 'light' ? 320 : 240,
  wrap,
  children,
  className = '',
}) => {
  const anchorRef = useRef(null);
  const openTimerRef = useRef(null);
  const [open, setOpen] = useState(false);
  /* Mount/visible split so we can play an exit animation. `mounted` keeps
     the portal node in the DOM while `visible` drives opacity/transform
     transitions. Both must reach false before the bubble unmounts. */
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 'var(--dim-space-0)', left: 'var(--dim-space-0)' });
  const [measuredBubble, setMeasuredBubble] = useState({ w: 0, h: 0 });
  const bubbleRef = useRef(null);
  const reducedMotion = usePrefersReducedMotion();

  const requestOpen = () => {
    if (disabled || !content) return;
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    openTimerRef.current = window.setTimeout(() => setOpen(true), delay);
  };
  const requestClose = () => {
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    setOpen(false);
  };

  /* Position calculation — anchor rect + measured bubble rect → portal
     coordinates. We measure the bubble after the first paint and adjust if
     the size differs from the previous measurement (handles content swaps). */
  const measureAndPosition = () => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const bubble = bubbleRef.current;
    const bw = bubble ? bubble.offsetWidth  : measuredBubble.w || 0;
    const bh = bubble ? bubble.offsetHeight : measuredBubble.h || 0;
    if (bubble && (bw !== measuredBubble.w || bh !== measuredBubble.h)) {
      setMeasuredBubble({ w: bw, h: bh });
    }

    let top = 0;
    let left = 0;
    switch (position) {
      case 'bottom':
        top  = r.bottom + ANCHOR_GAP;
        left = r.left + r.width / 2 - bw / 2;
        break;
      case 'left':
        top  = r.top + r.height / 2 - bh / 2;
        left = r.left - bw - ANCHOR_GAP;
        break;
      case 'right':
        top  = r.top + r.height / 2 - bh / 2;
        left = r.right + ANCHOR_GAP;
        break;
      case 'top':
      default:
        top  = r.top - bh - ANCHOR_GAP;
        left = r.left + r.width / 2 - bw / 2;
        break;
    }
    setCoords({ top, left });
  };

  useLayoutEffect(() => {
    if (!mounted) return undefined;
    measureAndPosition();
    const onChange = () => measureAndPosition();
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    return () => {
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, position, content, variant]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') requestClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  /* Enter/exit choreography.
     • open → true   : mount portal at hidden state, then flip `visible`
                       on the next animation frame so the browser interpolates
                       opacity/transform. Two RAFs ensure the initial styles
                       are committed before the transition target is applied.
     • open → false  : flip `visible` immediately (start exit transition), then
                       unmount after ANIM_MS so the bubble animates out cleanly.
     Reduced-motion users skip the animation but keep the mount/unmount cycle. */
  useEffect(() => {
    let rafA, rafB, timeoutId;
    if (open) {
      setMounted(true);
      if (reducedMotion) {
        setVisible(true);
      } else {
        rafA = requestAnimationFrame(() => {
          rafB = requestAnimationFrame(() => setVisible(true));
        });
      }
    } else {
      setVisible(false);
      timeoutId = window.setTimeout(() => setMounted(false), reducedMotion ? 0 : ANIM_MS);
    }
    return () => {
      if (rafA) cancelAnimationFrame(rafA);
      if (rafB) cancelAnimationFrame(rafB);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [open, reducedMotion]);

  useEffect(() => () => {
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
  }, []);

  /* Wrap the child in a span that captures hover/focus events. Adds a
     ref to the child as the positional anchor. */
  return (
    <>
      <span
        ref={anchorRef}
        className={className}
        style={{ display: 'inline-block', lineHeight: 0 }}
        onMouseEnter={requestOpen}
        onMouseLeave={requestClose}
        onFocus={requestOpen}
        onBlur={requestClose}
      >
        {children}
      </span>
      {mounted && typeof document !== 'undefined' && createPortal(
        <div
          ref={bubbleRef}
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            zIndex: 'var(--sm-z-tooltip, 1300)',
            pointerEvents: 'none',
            opacity: visible ? 1 : 0,
            transform: visible
              ? 'translate3d(0, 0, 0) scale(1)'
              : (MOTION_BY_POSITION[position] || MOTION_BY_POSITION.top).hidden,
            transformOrigin: (MOTION_BY_POSITION[position] || MOTION_BY_POSITION.top).origin,
            transition: reducedMotion
              ? 'none'
              : `opacity ${ANIM_MS}ms ${ANIM_EASE}, transform ${ANIM_MS}ms ${ANIM_EASE}`,
            willChange: 'opacity, transform',
          }}
        >
          <TooltipBubble position={position} variant={variant} maxWidth={maxWidth} wrap={wrap}>
            {content}
          </TooltipBubble>
        </div>,
        document.body,
      )}
    </>
  );
};

export default Tooltip;
