import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import TabPill, { TabBar } from '@/components/tab/TabPill';
import Topic from '@/components/topic/Topic';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueIconButton from '@/components/button/BrandSubdueIconButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import VoiceTextarea from '@/components/forms/VoiceTextarea';
import { useTextareaSuggestions } from '@/components/forms/textareaSuggestions';
import { composeBoxShadow, resolveBox } from '@/components/forms/_inputBox';
import Tooltip from '@/components/tooltip/Tooltip';
import Popup from '@/components/popup/Popup';
import { EXAM_VIEW_TABS } from '@/data/treatmentVisits';
import {
  BodyFigureAnnotationsSvg,
  BoardDrawingLayer,
  appendPenStrokePoints,
  buildAnnotationLayers,
  buildPenPathD,
  buildShapeDrawing,
  cloneDrawings,
  cloneMarkers,
  createDrawingId,
  findTopAnnotationLayer,
  getCoalescedPointerEvents,
  getDrawToolCursor,
  hitTestDrawing,
  getDrawingBounds,
  resizeDrawing,
  computeResizedBounds,
  findTextDrawingAtPoint,
  isDrawingTool,
  layerZIndex,
  createBoardLayout,
  pointerToBoardPercent,
  pointerToFigurePercent,
  translateDrawing,
} from '@/components/examination/bodyDrawingAnnotations';
import {
  getMarkerSuggestionPool,
  getMarkerRegionLabel,
} from '@/components/examination/markerSuggestions';

/* MIH BodyDrawingCanvas — Figma PHCIS | Medical-examination
   Embedded 191:25071 (diagram card + ExamSupportList row)
   Modal body 75:34452 inside Popup 75:35675 (toolbar + canvas + drawing tools). */

/** Anatomy — Figma PHCIS `image group_man` (77:44466) · Tools 223:29724. */
export const FRONT_IMG = '/illustration/body-anatomy-front.png';
export const BACK_IMG = '/illustration/body-anatomy-back.png';
const BODY_FIGURE_NATURAL_WIDTH = 848;
const BODY_FIGURE_NATURAL_HEIGHT = 1264;
const BODY_DIAGRAM_FIGURE_WIDTH = 294;

/* Figma 75:32973 · Tool Type — 7× Brand Subdue Icon Button (2024:4352) outline · lg.
   Icons aligned to the Figma palette: classic pointer cursor for select,
   pencil for pen, ink-eraser, capital T for text, outline circle/square,
   and a diagonal north-east arrow head for the arrow tool. */
export const DRAW_TOOLS = [
  /* Tooltips follow Figma 285:28636 — short action-verb phrasing
     (no flag/keyboard hint chatter). The longer tutorial copy that
     used to live here was moved out of the tooltip surface. */
  { key: 'cursor', icon: 'arrow_selector_tool', label: 'เลือก',     tooltip: 'เลือก' },
  { key: 'select', icon: 'trip_origin',         label: 'มาร์คจุด',  tooltip: 'มาร์คจุด' },
  { key: 'pen',    icon: 'edit',                label: 'ปากกา',     tooltip: 'วาดเส้น' },
  { key: 'eraser', icon: 'ink_eraser',          label: 'ยางลบ',     tooltip: 'ลบ' },
  { key: 'text',   icon: 'title',               label: 'ข้อความ',   tooltip: 'พิมพ์ข้อความ' },
  { key: 'circle', icon: 'circle',              label: 'วงกลม',    tooltip: 'วาดวงกลม' },
  { key: 'square', icon: 'square',              label: 'สี่เหลี่ยม', tooltip: 'วาดสี่เหลี่ยม' },
  { key: 'arrow',  icon: 'north_east',          label: 'ลูกศร',     tooltip: 'วาดลูกศร' },
];

/** Figma I77:44504;75:32936 "Tool Type" — flex-wrap row of BrandSubdueIconButton + Tooltip. */
const DrawingToolTypeGrid = ({ activeTool, onToolChange }) => (
  <div
    className='flex flex-wrap content-center items-center'
    role='group'
    aria-label='ประเภทเครื่องมือ'
    style={{ gap: 'var(--dim-space-200)', width: SLIDE_TRACK_WIDTH }}
  >
    {DRAW_TOOLS.map((tool) => (
      <Tooltip key={tool.key} content={tool.tooltip} position='top'>
        <BrandSubdueIconButton
          variant='outline'
          size='lg'
          icon={tool.icon}
          aria-label={tool.label}
          active={activeTool === tool.key}
          activeAppearance='focus'
          onClick={() => onToolChange(tool.key)}
        />
      </Tooltip>
    ))}
  </div>
);

/* Figma PHCIS Medical-examination · Drawing Tool 77:44504 */
const DRAWING_TOOL_SIDEBAR_WIDTH = 256;
const DRAWING_TOOL_SIDEBAR_HEIGHT = 554;
const SLIDE_TRACK_WIDTH = 208; /* inner content width (256 − 2×24 padding) */

/* Figma PHCIS · Medical-examination node 270:28605 — 2×6 swatch palette
   (Tailwind-ish 500 stop per hue). Order matches the design left-to-right,
   top-to-bottom: black / gray / red / orange / yellow / lime,
   teal / sky-cyan / periwinkle / pink / peachy-blush / soft-rose. */
export const DRAW_COLORS = [
  '#111314', // neutral/950 — black
  '#858C92', // neutral/500 — gray
  '#EF4444', // red/500
  '#F97316', // orange/500
  '#EAB308', // yellow/500
  '#A5CF4F', // lime/500
  '#24A899', // teal/500
  '#0E90E8', // sky-cyan/500
  '#7068E8', // periwinkle/500
  '#EC4899', // pink/500
  '#E0625E', // peachy-blush/500
  '#F4A4AA', // soft-rose/500
];

const CARD_SHADOW_TOOL = 'var(--shadow-formbuilder, 0 1px 4px rgba(100, 116, 139, 0.10))';
const CARD_SHADOW_SIDEBAR = 'var(--shadow-dropdown, 0 16px 32px rgba(100,116,139,0.15), 0 4px 4px rgba(100,116,139,0.1))';

const BODY_DIAGRAM_ZOOM_MIN = 0.5;
const BODY_DIAGRAM_ZOOM_MAX = 2;
const BODY_DIAGRAM_ZOOM_STEP = 0.1;
const BODY_DIAGRAM_WHEEL_ZOOM_SENSITIVITY = 0.0011;
const BODY_DIAGRAM_ZOOM_DEFAULT = 1;
const BODY_DIAGRAM_ZOOM_ANIM_MS = 320;
const BODY_DIAGRAM_RESET_ANIM_MS = 380;
const BODY_DIAGRAM_DRAG_THRESHOLD = 5;

const isZoomedForPan = (scale) => (
  Math.abs(scale - BODY_DIAGRAM_ZOOM_DEFAULT) > 0.001
);

const clampZoom = (value) => Math.min(
  BODY_DIAGRAM_ZOOM_MAX,
  Math.max(BODY_DIAGRAM_ZOOM_MIN, Number(value.toFixed(3))),
);

const easeOutCubic = (t) => 1 - (1 - t) ** 3;

const computeZoomPan = (prevScale, prevPan, nextScale, localX, localY) => {
  if (nextScale === prevScale) return prevPan;
  const ratio = nextScale / prevScale;
  return {
    x: localX - (localX - prevPan.x) * ratio,
    y: localY - (localY - prevPan.y) * ratio,
  };
};

/** Pan + zoom viewport — wheel zoom to cursor, drag pan (hand tool / middle-click / Space / zoomed drag). */
export function useBodyDiagramViewport({
  initialScale = BODY_DIAGRAM_ZOOM_DEFAULT,
  contentHeight = 448,
  dragPanWhenZoomed = true,
} = {}) {
  const [scale, setScale] = useState(clampZoom(initialScale));
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panMode, setPanMode] = useState(false);
  const [spacePan, setSpacePan] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const viewportRef = useRef(null);
  const contentRef = useRef(null);
  const panRef = useRef(pan);
  const scaleRef = useRef(scale);
  const dragRef = useRef(null);
  const animFrameRef = useRef(null);
  const wheelPendingRef = useRef(null);
  const wheelRafRef = useRef(null);
  const clickSuppressedRef = useRef(false);

  panRef.current = pan;
  scaleRef.current = scale;

  const cancelViewAnimation = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  const setViewImmediate = useCallback((nextScale, nextPan) => {
    cancelViewAnimation();
    const s = clampZoom(nextScale);
    const panUnchanged = panRef.current.x === nextPan.x && panRef.current.y === nextPan.y;
    const scaleUnchanged = scaleRef.current === s;
    if (scaleUnchanged && panUnchanged) return;
    setScale((prev) => (prev === s ? prev : s));
    setPan((prev) => (
      prev.x === nextPan.x && prev.y === nextPan.y ? prev : nextPan
    ));
    scaleRef.current = s;
    panRef.current = nextPan;
  }, [cancelViewAnimation]);

  const animateToView = useCallback((targetScale, targetPan, duration = BODY_DIAGRAM_ZOOM_ANIM_MS) => {
    cancelViewAnimation();
    const fromScale = scaleRef.current;
    const fromPan = panRef.current;
    const toScale = clampZoom(targetScale);
    const toPan = targetPan;

    if (
      duration <= 0
      || (fromScale === toScale && fromPan.x === toPan.x && fromPan.y === toPan.y)
    ) {
      setViewImmediate(toScale, toPan);
      return;
    }

    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeOutCubic(t);
      const s = fromScale + (toScale - fromScale) * eased;
      const px = fromPan.x + (toPan.x - fromPan.x) * eased;
      const py = fromPan.y + (toPan.y - fromPan.y) * eased;
      setScale(s);
      setPan({ x: px, y: py });
      scaleRef.current = s;
      panRef.current = { x: px, y: py };
      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        animFrameRef.current = null;
        setViewImmediate(toScale, toPan);
      }
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, [cancelViewAnimation, setViewImmediate]);

  const getCenteredPan = useCallback((targetScale = scaleRef.current) => {
    const vp = viewportRef.current;
    const content = contentRef.current;
    if (!vp || !content) return { x: 0, y: 0 };
    const cw = content.offsetWidth;
    const ch = content.offsetHeight || contentHeight;
    return {
      x: (vp.clientWidth - cw * targetScale) / 2,
      y: (vp.clientHeight - ch * targetScale) / 2,
    };
  }, [contentHeight]);

  const centerContent = useCallback(({ animate = false } = {}) => {
    const targetPan = getCenteredPan(scaleRef.current);
    if (animate) {
      animateToView(scaleRef.current, targetPan, BODY_DIAGRAM_ZOOM_ANIM_MS);
    } else {
      setViewImmediate(scaleRef.current, targetPan);
    }
  }, [animateToView, getCenteredPan, setViewImmediate]);

  useLayoutEffect(() => {
    centerContent({ animate: false });
  }, [centerContent, contentHeight]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return undefined;
    const ro = new ResizeObserver(() => centerContent({ animate: false }));
    ro.observe(vp);
    return () => ro.disconnect();
  }, [centerContent]);

  useEffect(() => () => {
    cancelViewAnimation();
    if (wheelRafRef.current) cancelAnimationFrame(wheelRafRef.current);
  }, [cancelViewAnimation]);

  const zoomAtClient = useCallback((clientX, clientY, nextScale, { animate = false, duration } = {}) => {
    const vp = viewportRef.current;
    if (!vp) {
      setViewImmediate(nextScale, panRef.current);
      return;
    }
    const rect = vp.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const prevScale = scaleRef.current;
    const prevPan = panRef.current;
    const clamped = clampZoom(nextScale);
    const nextPan = computeZoomPan(prevScale, prevPan, clamped, localX, localY);
    if (animate) {
      animateToView(clamped, nextPan, duration ?? BODY_DIAGRAM_ZOOM_ANIM_MS);
    } else {
      setViewImmediate(clamped, nextPan);
    }
  }, [animateToView, setViewImmediate]);

  const zoomByStep = useCallback((delta) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    zoomAtClient(cx, cy, scaleRef.current + delta, { animate: true });
  }, [zoomAtClient]);

  const zoomIn = useCallback(() => {
    zoomByStep(BODY_DIAGRAM_ZOOM_STEP);
  }, [zoomByStep]);

  const zoomOut = useCallback(() => {
    zoomByStep(-BODY_DIAGRAM_ZOOM_STEP);
  }, [zoomByStep]);

  const resetView = useCallback(() => {
    animateToView(
      BODY_DIAGRAM_ZOOM_DEFAULT,
      getCenteredPan(BODY_DIAGRAM_ZOOM_DEFAULT),
      BODY_DIAGRAM_RESET_ANIM_MS,
    );
  }, [animateToView, getCenteredPan]);

  const togglePanMode = useCallback(() => {
    setPanMode((active) => !active);
  }, []);

  const canPan = panMode || spacePan;
  const canDragPanWhenZoomed = dragPanWhenZoomed && isZoomedForPan(scale);
  const canPanByDrag = canPan || canDragPanWhenZoomed;

  const shouldStartPan = useCallback((e) => {
    if (e.button === 1) return true;
    if (e.button !== 0) return false;
    if (canPan) return true;
    return dragPanWhenZoomed && isZoomedForPan(scaleRef.current);
  }, [canPan, dragPanWhenZoomed]);

  const flushWheelZoom = useCallback(() => {
    wheelRafRef.current = null;
    const pending = wheelPendingRef.current;
    wheelPendingRef.current = null;
    if (!pending || pending.deltaY === 0) return;

    const vp = viewportRef.current;
    if (!vp) return;

    const rect = vp.getBoundingClientRect();
    const localX = pending.clientX - rect.left;
    const localY = pending.clientY - rect.top;
    const prevScale = scaleRef.current;
    const prevPan = panRef.current;
    const factor = Math.exp(-pending.deltaY * BODY_DIAGRAM_WHEEL_ZOOM_SENSITIVITY);
    const nextScale = clampZoom(prevScale * factor);
    if (nextScale === prevScale) return;

    const nextPan = computeZoomPan(prevScale, prevPan, nextScale, localX, localY);
    setViewImmediate(nextScale, nextPan);
  }, [setViewImmediate]);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!wheelPendingRef.current) {
      wheelPendingRef.current = { deltaY: 0, clientX: e.clientX, clientY: e.clientY };
    }
    wheelPendingRef.current.deltaY += e.deltaY;
    wheelPendingRef.current.clientX = e.clientX;
    wheelPendingRef.current.clientY = e.clientY;
    if (!wheelRafRef.current) {
      wheelRafRef.current = requestAnimationFrame(flushWheelZoom);
    }
  }, [flushWheelZoom]);

  const onPointerDown = useCallback((e) => {
    if (!shouldStartPan(e)) return;
    cancelViewAnimation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const isExplicitPan = e.button === 1 || canPan;
    setIsDragging(isExplicitPan);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      panX: panRef.current.x,
      panY: panRef.current.y,
      hasMoved: false,
      isExplicitPan,
    };
  }, [cancelViewAnimation, canPan, shouldStartPan]);

  const onPointerMove = useCallback((e) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (!drag.isExplicitPan && !drag.hasMoved) {
      if (Math.abs(dx) <= BODY_DIAGRAM_DRAG_THRESHOLD && Math.abs(dy) <= BODY_DIAGRAM_DRAG_THRESHOLD) {
        return;
      }
      drag.hasMoved = true;
      setIsDragging(true);
    }

    const nextPan = {
      x: drag.panX + dx,
      y: drag.panY + dy,
    };
    panRef.current = nextPan;
    setPan(nextPan);
  }, []);

  const endDrag = useCallback((e) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (drag.hasMoved) {
      clickSuppressedRef.current = true;
    }
    dragRef.current = null;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_err) {
      /* pointer already released */
    }
  }, []);

  const onClickCapture = useCallback((e) => {
    if (!clickSuppressedRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    clickSuppressedRef.current = false;
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code !== 'Space' || e.repeat) return;
      const vp = viewportRef.current;
      if (!vp) return;
      const { activeElement } = document;
      if (activeElement && activeElement !== document.body && !vp.contains(activeElement)) {
        return;
      }
      e.preventDefault();
      setSpacePan(true);
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space') setSpacePan(false);
    };
    const onBlur = () => setSpacePan(false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  const cursor = isDragging ? 'grabbing' : (canPanByDrag ? 'grab' : 'default');

  return {
    scale,
    percent: Math.round(scale * 100),
    pan,
    panMode,
    spacePan,
    isDragging,
    togglePanMode,
    zoomIn,
    zoomOut,
    resetView,
    centerContent,
    canZoomIn: scale < BODY_DIAGRAM_ZOOM_MAX,
    canZoomOut: scale > BODY_DIAGRAM_ZOOM_MIN,
    viewportRef,
    contentRef,
    viewportProps: {
      tabIndex: 0,
      onClickCapture,
      onMouseEnter: () => {
        viewportRef.current?.focus({ preventScroll: true });
      },
      /* Wheel zoom intentionally NOT wired — the canvas only zooms
         via the +/- magnifier buttons on the zoom toolbar (per
         clinician feedback: accidental scroll-zoom misaligns the
         marker calibration). The page can still scroll normally
         when the cursor is over the canvas. */
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onDoubleClick: resetView,
    },
    viewportStyle: {
      cursor,
      touchAction: 'none',
    },
    contentStyle: {
      transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
      transformOrigin: '0 0',
      backfaceVisibility: 'hidden',
      willChange: isDragging ? 'transform' : 'auto',
    },
  };
}

/** @deprecated Use useBodyDiagramViewport */
export function useBodyDiagramZoom(initialScale = BODY_DIAGRAM_ZOOM_DEFAULT, contentHeight) {
  const vp = useBodyDiagramViewport({ initialScale, contentHeight });
  return {
    scale: vp.scale,
    percent: vp.percent,
    zoomIn: vp.zoomIn,
    zoomOut: vp.zoomOut,
    resetZoom: vp.resetView,
    canZoomIn: vp.canZoomIn,
    canZoomOut: vp.canZoomOut,
    onPan: vp.togglePanMode,
    panActive: vp.panMode,
    ...vp,
  };
}

/** Interactive pan/zoom surface for body diagrams. */
export const BodyDiagramInteractiveViewport = ({
  viewportRef,
  contentRef,
  viewportProps = {},
  viewportStyle = {},
  contentStyle = {},
  height = 448,
  className = '',
  children,
}) => {
  const growsWithParent = className.includes('flex-1');
  return (
  <div
    ref={viewportRef}
    className={`w-full min-w-0 overflow-hidden ${className}`}
    style={{
      height: growsWithParent ? '100%' : height,
      maxHeight: growsWithParent ? '100%' : height,
      minHeight: growsWithParent ? 0 : undefined,
      flex: growsWithParent ? '1 1 0' : undefined,
      ...viewportStyle,
    }}
    {...viewportProps}
  >
    {/* `max-content` would shrink the content to the figures' natural
        width (~652 px); we want the drawing capture + marker hit-area
        to span the full canvas, so the content fills the viewport
        instead. `min-width: max-content` still lets the content grow
        beyond the viewport when zoomed in. */}
    <div
      ref={contentRef}
      style={{ width: '100%', minWidth: 'max-content', ...contentStyle }}
    >
      {children}
    </div>
  </div>
  );
};

/** @deprecated Use BodyDiagramInteractiveViewport */
export const BodyDiagramZoomViewport = ({
  scale = 1,
  height = 448,
  className = '',
  children,
}) => (
  <BodyDiagramInteractiveViewport
    height={height}
    className={className}
    contentStyle={{
      transform: `scale(${scale})`,
      transformOrigin: 'top center',
    }}
  >
    {children}
  </BodyDiagramInteractiveViewport>
);

/** Figma 223:29264–29266 — mask icons from PHCIS Medical-examination (Hand / Zoom out / Zoom in). */
export const BodyDiagramRailIcon = ({ name, size = 16, className = '' }) => (
  <span
    aria-hidden
    className={className}
    style={{
      width: size,
      height: size,
      display: 'inline-block',
      flexShrink: 0,
      backgroundColor: 'currentColor',
      WebkitMaskImage: `url(/icons/body-diagram/${name}.svg)`,
      WebkitMaskSize: 'contain',
      WebkitMaskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center',
      maskImage: `url(/icons/body-diagram/${name}.svg)`,
      maskSize: 'contain',
      maskRepeat: 'no-repeat',
      maskPosition: 'center',
    }}
  />
);

/** Figma drawing toolbar — zoom in / zoom out + percentage readout. */
export const BodyDiagramZoomToolbar = ({
  percent = 100,
  onZoomIn,
  onZoomOut,
  canZoomIn = true,
  canZoomOut = true,
  showPan = false,
  onPan,
  panActive = false,
  compact = false,
  className = '',
}) => (
  <div
    className={`flex shrink-0 items-center ${className}`}
    style={{
      padding: compact
        ? 'var(--dim-space-200) var(--dim-space-300)'
        : 'var(--dim-space-300) var(--dim-space-400)',
      borderRadius: 'var(--dim-radius-500)',
      border: 'var(--dim-stroke-100) solid var(--border-card-default, #E2E4E6)',
      background: 'var(--surface-card-100, #fff)',
      boxShadow: CARD_SHADOW_TOOL,
    }}
    role='toolbar'
    aria-label='ซูมร่างกาย'
  >
    <div
      className='flex flex-wrap items-center'
      style={{ gap: compact ? 'var(--dim-space-200)' : 'var(--dim-space-400)', padding: 'var(--dim-space-100)' }}
    >
      {showPan && (
        <>
          <Tooltip content='เลื่อน (Pan)' position='top'>
            <NeutralSubdueIconButton
              variant='outline'
              size={compact ? 'sm' : 'md'}
              aria-label='เลื่อน'
              active={panActive}
              activeAppearance='focus'
              onClick={onPan}
            >
              <BodyDiagramRailIcon name='hand' size={compact ? 16 : 20} />
            </NeutralSubdueIconButton>
          </Tooltip>
          <span
            aria-hidden
            style={{ width: 1, alignSelf: 'stretch', background: 'var(--border-neutral-tertiary)' }}
          />
        </>
      )}
      <span
        style={{
          color: 'var(--text-content-default)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          lineHeight: 1.5,
          whiteSpace: 'nowrap',
          minWidth: 40,
          textAlign: 'center',
        }}
        aria-live='polite'
        aria-atomic='true'
      >
        {percent}%
      </span>
      <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
        <Tooltip content='ซูมออก' position='top'>
          <NeutralSubdueIconButton
            variant='outline'
            size={compact ? 'sm' : 'md'}
            aria-label='ซูมออก'
            disabled={!canZoomOut}
            onClick={onZoomOut}
          >
            <BodyDiagramRailIcon name='zoom-out' size={compact ? 16 : 20} />
          </NeutralSubdueIconButton>
        </Tooltip>
        <Tooltip content='ซูมเข้า' position='top'>
          <NeutralSubdueIconButton
            variant='outline'
            size={compact ? 'sm' : 'md'}
            aria-label='ซูมเข้า'
            disabled={!canZoomIn}
            onClick={onZoomIn}
          >
            <BodyDiagramRailIcon name='zoom-in' size={compact ? 16 : 20} />
          </NeutralSubdueIconButton>
        </Tooltip>
      </div>
    </div>
  </div>
);

/** Figma 150:36347 · Zoom Group 223:29263 — vertical icon rail on the diagram edge. */
export const BodyDiagramZoomRail = ({
  onZoomIn,
  onZoomOut,
  canZoomIn = true,
  canZoomOut = true,
  onPan,
  panActive = false,
  onEdit,
  onExpand,
  className = '',
}) => (
  <div
    role='toolbar'
    aria-label='ซูมร่างกาย'
    className={`flex shrink-0 flex-col items-start justify-center ${className}`}
    style={{ gap: 'var(--dim-space-200, 8px)' }}
  >
    {onEdit && (
      <Tooltip content='บันทึกบนรูปภาพ' position='right'>
        <NeutralSubdueIconButton
          variant='outline'
          size='sm'
          aria-label='บันทึกบนรูปภาพ'
          onClick={onEdit}
        >
          <span
            aria-hidden
            className='material-symbols-outlined'
            style={{
              fontFamily: 'Material Symbols Outlined',
              fontSize: 18,
              lineHeight: 1,
              fontVariationSettings: "'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20",
            }}
          >
            edit
          </span>
        </NeutralSubdueIconButton>
      </Tooltip>
    )}
    <Tooltip content='เลื่อน (Pan)' position='right'>
      <NeutralSubdueIconButton
        variant='outline'
        size='sm'
        aria-label='เลื่อน'
        active={panActive}
        activeAppearance='focus'
        onClick={onPan}
      >
        <BodyDiagramRailIcon name='hand' />
      </NeutralSubdueIconButton>
    </Tooltip>
    <Tooltip content='ซูมออก' position='right'>
      <NeutralSubdueIconButton
        variant='outline'
        size='sm'
        aria-label='ซูมออก'
        disabled={!canZoomOut}
        onClick={onZoomOut}
      >
        <BodyDiagramRailIcon name='zoom-out' />
      </NeutralSubdueIconButton>
    </Tooltip>
    <Tooltip content='ซูมเข้า' position='right'>
      <NeutralSubdueIconButton
        variant='outline'
        size='sm'
        aria-label='ซูมเข้า'
        disabled={!canZoomIn}
        onClick={onZoomIn}
      >
        <BodyDiagramRailIcon name='zoom-in' />
      </NeutralSubdueIconButton>
    </Tooltip>
    {onExpand && (
      <Tooltip content='ขยาย' position='right'>
        <NeutralSubdueIconButton
          variant='outline'
          size='sm'
          aria-label='ขยายรูปภาพ'
          onClick={onExpand}
        >
          <span
            aria-hidden
            className='material-symbols-outlined'
            style={{
              fontFamily: 'Material Symbols Outlined',
              fontSize: 18,
              lineHeight: 1,
              fontVariationSettings: "'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20",
            }}
          >
            open_in_full
          </span>
        </NeutralSubdueIconButton>
      </Tooltip>
    )}
  </div>
);

/** Figma 220:27484 — Voice Textarea on body-mark focus (447×160). */
const MARK_NOTE_INPUT_WIDTH = 447;

/** Board stacking — drawn content (markers, drawings, text, shape
    drafts, selection chrome, eraser cursor) must ALWAYS sit above the
    body image AND above the figure's edit-mode z-bump (30). The
    stacking ladder:

      figure (5)            body image at rest
       └── edit bump (30)   figure z when a marker is being edited
      annotations (40+)     drawings + markers — base = stackOrder
      selectedBump (1040+)  the currently-selected drawing/marker
                            renders above every sibling layer (so the
                            selection frame still surrounds it)
      capture (50)          pointer-capture overlay during drawing
      focusedTool (2000)    shape draft · eraser cursor · selection
                            frame · mark-ghost — guaranteed above
                            every annotation, including the
                            selected-bumped one (1040+)
      mark-note (1450)      portal'd note editor — separate stacking
                            context via createPortal, so it's not
                            comparable to these board values.

    Note: `figure` can never exceed 30, `annotations` start at 40, so
    every drawn element is strictly above every body image. */
const BODY_BOARD_Z = {
  figure: 5,
  annotations: 40,
  selectedBump: 1000,
  capture: 50,
  focusedTool: 2000,
};

/** Inline text field on the body board — focus chrome matches Textarea / InputBox. */
const BodyTextDrawingInput = ({
  value,
  onChange,
  onCommit,
  onCancel,
  editingId,
  textColor,
  positionStyle,
  /* Live preview of the font-size slider — input + placeholder scale
     so the user sees exactly how large the text will commit. */
  fontSize = 14,
}) => {
  const inputRef = useRef(null);
  const skipBlurCommitRef = useRef(false);
  const [focused, setFocused] = useState(true);
  const [mouseHover, setMouseHover] = useState(false);
  const effectiveFocused = focused || mouseHover;
  const hasValue = Boolean(String(value ?? '').trim());
  const s = resolveBox({ focused: effectiveFocused, hasValue });
  const boxShadow = composeBoxShadow(s, effectiveFocused);

  useEffect(() => {
    const onPointerDown = (event) => {
      skipBlurCommitRef.current = !!event.target.closest('[data-drawing-tool-sidebar]');
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, []);

  /* Replace the HTML `autoFocus` attribute (which calls
     `element.focus()` and triggers a browser scroll-into-view that
     can visually shift the body figure underneath) with a manual
     focus + `preventScroll: true`. Result: text input gains focus
     for typing without any scroll/layout jitter on the canvas. */
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    if (editingId) el.select?.();
  }, [editingId]);

  const handleBlur = (e) => {
    setFocused(false);
    if (skipBlurCommitRef.current) {
      skipBlurCommitRef.current = false;
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    onCommit(e);
  };

  return (
    <input
      ref={inputRef}
      type='text'
      data-text-drawing-input
      data-body-focused-tool='text'
      value={value}
      placeholder='ข้อความ'
      onChange={onChange}
      onFocus={(e) => {
        setFocused(true);
        if (editingId) e.target.select();
      }}
      onBlur={handleBlur}
      onMouseEnter={() => setMouseHover(true)}
      onMouseLeave={() => setMouseHover(false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onCommit(e);
        if (e.key === 'Escape') onCancel();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className='mih-input-placeholder'
      style={{
        position: 'absolute',
        boxSizing: 'border-box',
        border: 'none',
        outline: 'none',
        background: s.bg,
        boxShadow,
        borderRadius: 'var(--dim-radius-200)',
        padding: 'var(--dim-space-200) var(--dim-space-300)',
        /* Min width grows with font-size so the placeholder doesn't
           clip when the user picks a larger text size. Roughly 8× the
           font-size keeps "ข้อความ" comfortably visible. */
        minWidth: Math.max(120, fontSize * 8),
        maxWidth: 400,
        fontFamily: 'var(--type-family-body)',
        fontSize,
        lineHeight: 1.4,
        color: textColor,
        caretColor: 'var(--brand-p600)',
        WebkitAppearance: 'none',
        appearance: 'none',
        transition: 'box-shadow 160ms cubic-bezier(0.4, 0, 0.2, 1), background 160ms cubic-bezier(0.4, 0, 0.2, 1), font-size 120ms ease, min-width 120ms ease',
        zIndex: BODY_BOARD_Z.focusedTool,
        ...positionStyle,
      }}
    />
  );
};

/** Above Popup footer/chrome (`--sm-z-modal` 1400). */
const MARK_NOTE_EDITOR_Z_INDEX = 'var(--sm-z-modal-popover, 1450)';
const MARK_NOTE_INPUT_HEIGHT = 160;
const MARK_NOTE_INPUT_MIN_HEIGHT = 96;
/** Figma 220:27806 — grows with note text, capped at 480px. */
const MARK_NOTE_POPOVER_MAX_WIDTH = 480;

/** Figma Drop Shadow Bottom/200 — mark dot elevation. */
const MARK_DOT_SHADOW = [
  '0 1px 8px rgba(100, 116, 139, 0.15)',
  '0 1px 4px rgba(100, 116, 139, 0.1)',
].join(', ');

/** Default mark color — matches initial `activeColor` in DrawingToolSidebar. */
export const MARK_DOT_DEFAULT_COLOR = '#EF4444';

/** Figma 217:27084 — mark dot layout tokens (Default · Hover · Focus · Active). */
const MARK_DOT_STYLES = {
  default: {
    size: 24,
    borderWidth: 'var(--dim-stroke-200, 2px)',
  },
  hover: {
    size: 32,
    borderWidth: 'var(--dim-stroke-400, 4px)',
  },
  focus: {
    size: 24,
    borderWidth: 'var(--dim-stroke-200, 2px)',
  },
  active: {
    size: 24,
    borderWidth: 'var(--dim-stroke-200, 2px)',
  },
};

const parseHexColor = (hex) => {
  const raw = String(hex ?? '').trim().replace('#', '');
  if (!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(raw)) return null;
  const expanded = raw.length === 3
    ? raw.split('').map((ch) => ch + ch).join('')
    : raw;
  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
  };
};

/** Figma 217:27084 — fill intensity on the swatch (border stays opaque). */
const MARK_DOT_FILL_OPACITY = {
  default: 0.6,
  hover: 0.8,
  focus: 0.8,
  active: 0.6,
};

export const resolveMarkDotBackground = (color, state = 'default') => {
  const base = parseHexColor(color) ? color : MARK_DOT_DEFAULT_COLOR;
  const rgb = parseHexColor(base);
  if (!rgb) return base;
  const alpha = MARK_DOT_FILL_OPACITY[state] ?? MARK_DOT_FILL_OPACITY.default;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

export const resolveMarkerColor = (marker) => marker?.color ?? MARK_DOT_DEFAULT_COLOR;

/** Once placed, every marker stays visible on the body — typing in or
    focusing on another marker must not cause previously-created points
    to vanish. The marker can only be removed via the delete action. */
export const isMarkerVisibleOnBody = (marker) => Boolean(marker);

const clampPercent = (value) => Math.min(100, Math.max(0, value));

/** Pixel layout of an object-cover image inside a container (matches Figma `object-cover`). */
const getObjectCoverLayout = (boxW, boxH, naturalW, naturalH) => {
  if (!boxW || !boxH || !naturalW || !naturalH) {
    return { offsetX: 0, offsetY: 0, width: boxW, height: boxH };
  }
  const scale = Math.max(boxW / naturalW, boxH / naturalH);
  const width = naturalW * scale;
  const height = naturalH * scale;
  return {
    offsetX: (boxW - width) / 2,
    offsetY: (boxH - height) / 2,
    width,
    height,
  };
};

/** Map pointer position → 0–100% within the rendered image (not letterbox padding). */
const pointerToImagePercent = (clientX, clientY, containerRect, layout) => {
  const x = clientX - containerRect.left - layout.offsetX;
  const y = clientY - containerRect.top - layout.offsetY;
  return {
    leftPercent: clampPercent((x / layout.width) * 100),
    topPercent: clampPercent((y / layout.height) * 100),
  };
};

/** Map image-relative % → container % for absolute positioning. */
const imagePercentToContainerPosition = (leftPercent, topPercent, boxW, boxH, layout) => {
  const x = layout.offsetX + (leftPercent / 100) * layout.width;
  const y = layout.offsetY + (topPercent / 100) * layout.height;
  return {
    left: `${(x / boxW) * 100}%`,
    top: `${(y / boxH) * 100}%`,
  };
};

const MARKER_HIT_RADIUS_PX = 16;
const DRAG_THRESHOLD_PX = 4;

/** Board-local pixel position for a figure-relative marker. */
const markerBoardPosition = (marker, figureMetrics, groupW, groupH) => {
  const metrics = figureMetrics?.[marker.side];
  if (!metrics?.layout?.width || !groupW || !groupH) return null;
  const { layout, offsetX, offsetY } = metrics;
  const x = offsetX + layout.offsetX + (marker.leftPercent / 100) * layout.width;
  const y = offsetY + layout.offsetY + (marker.topPercent / 100) * layout.height;
  return {
    left: `${(x / groupW) * 100}%`,
    top: `${(y / groupH) * 100}%`,
  };
};

/** Marker anchor as board 0–100% (full BodyImageGroup canvas). */
const markerToBoardPercent = (marker, figureMetrics, groupW, groupH) => {
  const metrics = figureMetrics?.[marker.side];
  if (!metrics?.layout?.width || !groupW || !groupH) return null;
  const { layout, offsetX, offsetY } = metrics;
  const x = offsetX + layout.offsetX + (marker.leftPercent / 100) * layout.width;
  const y = offsetY + layout.offsetY + (marker.topPercent / 100) * layout.height;
  return {
    leftPercent: (x / groupW) * 100,
    topPercent: (y / groupH) * 100,
  };
};

const resolveMarkerSideAtBoardPixel = (boardX, boardY, figureMetrics, fallbackSide) => {
  const imageContains = (side) => {
    const m = figureMetrics[side];
    if (!m?.layout?.width) return false;
    const ix = boardX - m.offsetX - m.layout.offsetX;
    const iy = boardY - m.offsetY - m.layout.offsetY;
    return ix >= 0 && ix <= m.layout.width && iy >= 0 && iy <= m.layout.height;
  };
  if (imageContains('front')) return 'front';
  if (imageContains('back')) return 'back';

  const columnContains = (side) => {
    const m = figureMetrics[side];
    if (!m) return false;
    return (
      boardX >= m.offsetX
      && boardX <= m.offsetX + m.boxW
      && boardY >= m.offsetY
      && boardY <= m.offsetY + m.boxH
    );
  };
  if (fallbackSide && columnContains(fallbackSide)) return fallbackSide;
  const other = fallbackSide === 'front' ? 'back' : 'front';
  if (columnContains(other)) return other;

  const sides = ['front', 'back'].filter((s) => figureMetrics[s]);
  let best = fallbackSide ?? sides[0];
  let bestDist = Infinity;
  sides.forEach((side) => {
    const m = figureMetrics[side];
    const cx = m.offsetX + m.boxW / 2;
    const cy = m.offsetY + m.boxH / 2;
    const d = Math.hypot(boardX - cx, boardY - cy);
    if (d < bestDist) {
      bestDist = d;
      best = side;
    }
  });
  return best;
};

/** Board % → marker patch (unclamped — draggable across entire canvas). */
const boardPercentToMarkerPatch = (
  boardLeft,
  boardTop,
  figureMetrics,
  groupW,
  groupH,
  fallbackSide,
) => {
  if (!groupW || !groupH) return null;
  const boardX = (boardLeft / 100) * groupW;
  const boardY = (boardTop / 100) * groupH;
  const side = resolveMarkerSideAtBoardPixel(boardX, boardY, figureMetrics, fallbackSide);
  const metrics = figureMetrics[side];
  if (!metrics?.layout?.width) return null;
  const { layout, offsetX, offsetY } = metrics;
  const localX = boardX - offsetX;
  const localY = boardY - offsetY;
  return {
    side,
    leftPercent: ((localX - layout.offsetX) / layout.width) * 100,
    topPercent: ((localY - layout.offsetY) / layout.height) * 100,
  };
};

const boardPointHitsMarker = (marker, px, py, figureMetrics) => {
  const metrics = figureMetrics?.[marker.side];
  if (!metrics?.layout?.width) return false;
  const { layout, offsetX, offsetY } = metrics;
  const localX = px - offsetX;
  const localY = py - offsetY;
  const mx = layout.offsetX + (marker.leftPercent / 100) * layout.width;
  const my = layout.offsetY + (marker.topPercent / 100) * layout.height;
  return Math.hypot(mx - localX, my - localY) <= MARKER_HIT_RADIUS_PX;
};

/** Nearest marker within hit radius of a figure click (image-relative %). */
const findMarkerAtFigurePoint = (point, markers, layout) => {
  if (!point || !layout?.width || !layout?.height || !markers?.length) return null;
  const x = layout.offsetX + (point.leftPercent / 100) * layout.width;
  const y = layout.offsetY + (point.topPercent / 100) * layout.height;
  let found = null;
  let bestDist = MARKER_HIT_RADIUS_PX;
  markers.forEach((marker) => {
    const mx = layout.offsetX + (marker.leftPercent / 100) * layout.width;
    const my = layout.offsetY + (marker.topPercent / 100) * layout.height;
    const dist = Math.hypot(mx - x, my - y);
    if (dist <= bestDist) {
      bestDist = dist;
      found = marker;
    }
  });
  return found;
};

export const BodyMark = ({
  state = 'default',
  color = MARK_DOT_DEFAULT_COLOR,
  /* When set, overrides the per-state default size — used when a
     marker has been resized via the selection-frame handles. */
  size,
  className = '',
  style = {},
  ...rest
}) => {
  const token = MARK_DOT_STYLES[state] ?? MARK_DOT_STYLES.default;
  const dim = size ?? token.size;
  return (
    <span
      className={className}
      style={{
        display: 'block',
        width: dim,
        height: dim,
        borderRadius: 'var(--dim-radius-600, 24px)',
        border: `${token.borderWidth} solid var(--border-image-default, #fff)`,
        boxShadow: MARK_DOT_SHADOW,
        background: resolveMarkDotBackground(color, state),
        flexShrink: 0,
        boxSizing: 'border-box',
        transition:
          'width 120ms ease, height 120ms ease, background 120ms ease, border-width 120ms ease',
        ...style,
      }}
      {...rest}
    />
  );
};

/** Figma 220:27806 Active — read-only note popover below the mark. */
export const BodyMarkNotePopover = ({ note, className = '', style = {} }) => {
  const text = String(note ?? '').trim();
  if (!text) return null;
  return (
    <div
      className={className}
      role='tooltip'
      style={{
        width: 'fit-content',
        maxWidth: MARK_NOTE_POPOVER_MAX_WIDTH,
        padding: 'var(--dim-space-400, 16px)',
        boxSizing: 'border-box',
        background: 'var(--surface-modal-default, #fff)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-popover-grey, #E2E4E6)',
        borderRadius: 'var(--dim-radius-200, 8px)',
        boxShadow: 'var(--shadow-dropdown, 0 16px 32px rgba(100,116,139,0.15), 0 4px 4px rgba(100,116,139,0.1))',
        color: 'var(--text-modal-subtext, #ADB2B7)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-regular, 400)',
        lineHeight: 1.5,
        wordBreak: 'break-word',
        ...style,
      }}
    >
      {text}
    </div>
  );
};

/** Map runtime flags → BodyMark state (Figma 217:27084). */
const resolveMarkState = ({ interactive, isSelected, isHovered, hasNote }) => {
  if (interactive && isSelected) return 'focus';
  if (hasNote && isHovered && !isSelected) return 'active';
  if (isHovered) return 'hover';
  return 'default';
};

const markAnchorWrapperStyle = (anchor, zIndex = 2) => ({
  position: 'absolute',
  left: anchor.left,
  top: anchor.top,
  transform: 'translateX(-50%)',
  zIndex,
});

/** Figma 220:27806 — dot on anchor + read-only note popover below. */
export const BodyMarkActiveStack = ({
  note,
  color = MARK_DOT_DEFAULT_COLOR,
  className = '',
  style = {},
  ...rest
}) => {
  const dotSize = MARK_DOT_STYLES.active.size;
  return (
    <div
      className={`flex flex-col items-center ${className}`}
      style={{
        gap: 'var(--dim-space-200, 8px)',
        marginTop: -(dotSize / 2),
        ...style,
      }}
      {...rest}
    >
      <BodyMark state='active' color={color} aria-hidden />
      <BodyMarkNotePopover note={note} />
    </div>
  );
};

/** Figma 220:27484 / 217:27083–231:28146 — Voice Textarea + Save (disabled when empty). */
export const BodyMarkNoteField = React.forwardRef(function BodyMarkNoteField(
  {
    value = '',
    onChange,
    onSaveClick,
    placeholder = 'พิมพ์หรือกดปุ่มไมโครโฟนเพื่อพูด…',
    height = MARK_NOTE_INPUT_HEIGHT,
    minHeight = MARK_NOTE_INPUT_MIN_HEIGHT,
    className = '',
    style = {},
    /* Forwarded to the inner VoiceTextarea so the autocomplete
       suggestions popover can anchor to the field's bounding box. */
    boxRef,
    onFocus,
    ...rest
  },
  ref,
) {
  return (
    <VoiceTextarea
      ref={ref}
      boxRef={boxRef}
      showLabel={false}
      showHelperText={false}
      showSaveButton
      onSaveClick={onSaveClick}
      state='focus'
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      height={height}
      minHeight={minHeight}
      className={className}
      style={{ width: MARK_NOTE_INPUT_WIDTH, maxWidth: '100%', ...style }}
      {...rest}
    />
  );
});

const normalizeMarkNote = (note) => String(note ?? '').trim();

/**
 * Save button rules for `MarkNoteEditor`:
 * - New mark (no saved baseline): disabled until note is non-empty.
 * - Re-open saved mark (`baselineNote` non-empty): disabled until note differs from baseline (trimmed).
 */
export const getMarkNoteSaveDisabled = ({ note, baselineNote }) => {
  const currentNote = normalizeMarkNote(note);
  const hasSavedBaseline = baselineNote !== undefined && baselineNote !== null;
  const baseline = hasSavedBaseline ? normalizeMarkNote(baselineNote) : '';
  const isReEditingSavedNote = hasSavedBaseline && Boolean(baseline);
  return isReEditingSavedNote ? currentNote === baseline : !currentNote;
};

export const isMarkNoteReEditingSaved = (baselineNote) => {
  const hasSavedBaseline = baselineNote !== undefined && baselineNote !== null;
  return hasSavedBaseline && Boolean(normalizeMarkNote(baselineNote));
};

/* Region-aware suggestions are now rendered by `useTextareaSuggestions`
   (portal'd popover anchored under the textarea, matching OPD "อาการ").
   The pool comes from `getMarkerSuggestionPool(marker)` — see
   MarkNoteEditor below. The earlier inline dropdown was removed. */

/** Figma 217:27083 Focus-Empty · 231:28146 Focus-Type — dot + inline note editor. */
export const MarkNoteEditor = ({
  anchorPosition,
  anchorRef,
  marker,
  baselineNote,
  onNoteChange,
  onSave,
  onCancel,
  onDelete,
  inputRef,
}) => {
  const dotSize = MARK_DOT_STYLES.focus.size;
  const isReEditingSavedNote = isMarkNoteReEditingSaved(baselineNote);
  const saveDisabled = getMarkNoteSaveDisabled({ note: marker.note, baselineNote });
  const usePortal = Boolean(anchorRef);
  const [portalStyle, setPortalStyle] = useState(null);

  /* Suggestion popover — region-aware list (e.g. lumbar back → L1–L5
     vertebrae) sourced from getMarkerSuggestionPool. The popover is
     rendered via portal to document.body and anchored to the textarea
     box, exactly like the OPD "อาการ" field, so it appears UNDER the
     text input instead of inflating the editor card. */
  const noteContainerRef = useRef(null);
  const noteBoxRef = useRef(null);
  const regionSuggestions = useMemo(() => getMarkerSuggestionPool(marker), [marker]);
  const regionLabel = useMemo(() => getMarkerRegionLabel(marker), [marker]);
  /* Hook expects `onChange(eventLike)`; MarkNoteEditor's onNoteChange
     receives the raw string. Unwrap on the way in. */
  const handleNoteHookChange = useCallback((eventLike) => {
    const next = eventLike?.target?.value ?? '';
    onNoteChange?.(next);
  }, [onNoteChange]);
  const {
    enabled: suggestEnabled,
    handleValueChange: handleNoteValueChange,
    handleFocus: handleNoteFocus,
    portal: suggestionPortal,
  } = useTextareaSuggestions({
    value: marker.note ?? '',
    onChange: handleNoteHookChange,
    suggestions: regionSuggestions,
    minChars: 3,
    popoverWidth: MARK_NOTE_INPUT_WIDTH,
    popoverAriaLabel: regionLabel ? `คำแนะนำ ${regionLabel}` : 'คำแนะนำ',
    /* Anchor to the inner <textarea> (inputRef) rather than the outer
       box (noteBoxRef) so the popover sits just below the TYPING area
       — below the typed text — instead of below the voice/save bar at
       the very bottom of the field. Matches the OPD "อาการ" feel. */
    anchorRef: inputRef ?? noteBoxRef,
    containerRef: noteContainerRef,
  });

  const updatePortalPosition = useCallback(() => {
    const el = anchorRef?.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPortalStyle({
      position: 'fixed',
      left: rect.left,
      top: rect.top,
      transform: 'translateX(-50%)',
      marginTop: -(dotSize / 2),
      width: MARK_NOTE_INPUT_WIDTH,
      gap: 'var(--dim-space-200, 8px)',
      zIndex: MARK_NOTE_EDITOR_Z_INDEX,
      pointerEvents: 'auto',
    });
  }, [anchorRef, dotSize]);

  useLayoutEffect(() => {
    if (!usePortal) return undefined;
    let attempts = 0;
    const measure = () => {
      updatePortalPosition();
      if (!anchorRef?.current && attempts < 8) {
        attempts += 1;
        requestAnimationFrame(measure);
      }
    };
    measure();
    window.addEventListener('resize', updatePortalPosition);
    window.addEventListener('scroll', updatePortalPosition, true);
    return () => {
      window.removeEventListener('resize', updatePortalPosition);
      window.removeEventListener('scroll', updatePortalPosition, true);
    };
  }, [usePortal, updatePortalPosition, anchorRef, anchorPosition?.left, anchorPosition?.top, marker?.id]);

  const shellStyle = usePortal && portalStyle
    ? portalStyle
    : {
      position: 'absolute',
      left: anchorPosition.left,
      top: anchorPosition.top,
      transform: 'translateX(-50%)',
      marginTop: -(dotSize / 2),
      width: MARK_NOTE_INPUT_WIDTH,
      gap: 'var(--dim-space-200, 8px)',
      zIndex: BODY_BOARD_Z.focusedTool,
      pointerEvents: 'auto',
    };

  const editor = (
    <div
      role='group'
      aria-label='บันทึกผลการตรวจเฉพาะที่'
      data-mark-note-editor
      data-body-focused-tool='mark'
      className='flex flex-col items-center'
      style={shellStyle}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <BodyMark
        key={resolveMarkerColor(marker)}
        state='focus'
        color={resolveMarkerColor(marker)}
        size={marker.size}
        aria-hidden
      />
      <div ref={noteContainerRef} className='w-full'>
        <BodyMarkNoteField
          ref={inputRef}
          boxRef={noteBoxRef}
          value={marker.note ?? ''}
          /* VoiceTextarea emits (value, event); the suggestions hook
             expects that pair via handleValueChange. */
          onChange={suggestEnabled
            ? (next, e) => handleNoteValueChange(next, e)
            : onNoteChange}
          onFocus={suggestEnabled ? handleNoteFocus : undefined}
          onSaveClick={onSave}
          saveDisabled={saveDisabled}
          saveRequiresValue={!isReEditingSavedNote}
          showCancelButton={Boolean(onCancel)}
          onCancelClick={onCancel}
          showDeleteButton={Boolean(onDelete)}
          onDeleteClick={onDelete}
          /* Delete is meaningful only once there's content to delete. Per
             Figma 267:31507: trash button stays disabled while the
             textarea is empty (covers both new-marker placement and a
             re-edit that has been cleared). */
          deleteDisabled={!normalizeMarkNote(marker.note)}
          deleteAriaLabel='ลบจุดมาร์ค'
        />
      </div>
      {suggestionPortal}
    </div>
  );

  if (usePortal && portalStyle && typeof document !== 'undefined') {
    return createPortal(editor, document.body);
  }

  return editor;
};

/** Read-only note popover shown when clicking a marker that already has
    a saved note. Mirrors Figma node 220:27806 — dot + soft-shadowed
    rounded card with the note text below it. Editing is reached by
    clicking the body of the card (escalates to MarkNoteEditor). */
/* Viewer popover shrinks to fit the note text and caps at 240 px wide;
   long notes wrap inside the card. */
const MARK_NOTE_VIEWER_MAX_WIDTH = 240;

/** Outline icon button used inside the viewer popover footer for Edit +
    Delete actions (Figma 220:27806). Delegates to NeutralSubdueIconButton
    so it picks up the design-system hover / active / focus visuals. */
const MarkNoteViewerIconButton = ({ icon, ariaLabel, onClick }) => (
  <NeutralSubdueIconButton
    variant='outline'
    size='sm'
    icon={icon}
    aria-label={ariaLabel}
    onClick={(e) => { e.stopPropagation(); onClick?.(e); }}
  />
);

export const MarkNoteViewer = ({
  anchorPosition,
  anchorRef,
  marker,
  onEdit,
  onMouseEnter,
  onMouseLeave,
  /* When false → resting Figma 220:27806 popover (text only). When
     true → hover Figma 261:28152 popover with an inline edit button.
     Delete intentionally lives outside this surface — Delete key on
     the selection frame · trash button while editing. */
  showActions = false,
  /* Drives the focus dot's hover-expand / drag-shrink micro animation,
     mirroring the body-layer dot's motion so the popover feels alive
     under the cursor. */
  hovered = false,
  pressed = false,
  /* When false the popover renders as pure visual chrome —
     pointer-events disabled so clicks fall straight through to the
     selection-capture overlay (needed by the cursor tool, which
     wants to drag the underlying dot). */
  interactive = true,
}) => {
  const dotSize = MARK_DOT_STYLES.focus.size;
  const usePortal = Boolean(anchorRef);
  const [portalStyle, setPortalStyle] = useState(null);

  const updatePortalPosition = useCallback(() => {
    const el = anchorRef?.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPortalStyle({
      position: 'fixed',
      left: rect.left,
      top: rect.top,
      transform: 'translateX(-50%)',
      marginTop: -(dotSize / 2),
      width: 'max-content',
      maxWidth: MARK_NOTE_VIEWER_MAX_WIDTH,
      gap: 'var(--dim-space-200, 8px)',
      zIndex: MARK_NOTE_EDITOR_Z_INDEX,
      pointerEvents: 'auto',
    });
  }, [anchorRef, dotSize]);

  useLayoutEffect(() => {
    if (!usePortal) return undefined;
    let attempts = 0;
    const measure = () => {
      updatePortalPosition();
      if (!anchorRef?.current && attempts < 8) {
        attempts += 1;
        requestAnimationFrame(measure);
      }
    };
    measure();
    window.addEventListener('resize', updatePortalPosition);
    window.addEventListener('scroll', updatePortalPosition, true);
    return () => {
      window.removeEventListener('resize', updatePortalPosition);
      window.removeEventListener('scroll', updatePortalPosition, true);
    };
  }, [usePortal, updatePortalPosition, anchorRef, anchorPosition?.left, anchorPosition?.top, marker?.id]);

  const shellStyle = usePortal && portalStyle
    ? portalStyle
    : {
      position: 'absolute',
      left: anchorPosition.left,
      top: anchorPosition.top,
      transform: 'translateX(-50%)',
      marginTop: -(dotSize / 2),
      width: 'max-content',
      maxWidth: MARK_NOTE_VIEWER_MAX_WIDTH,
      gap: 'var(--dim-space-200, 8px)',
      zIndex: BODY_BOARD_Z.focusedTool,
      pointerEvents: 'auto',
    };

  const viewer = (
    <div
      role='group'
      aria-label='ผลการตรวจเฉพาะที่'
      data-mark-note-editor
      data-body-focused-tool='mark'
      className='flex flex-col items-center'
      style={{
        ...shellStyle,
        /* Wrapper drops pointer events in cursor mode so the marker
           dot underneath stays draggable. The CARD below opts back in
           via `pointer-events: auto` and owns hover/click detection,
           which still works because pointer-events propagates to
           descendants individually. */
        pointerEvents: interactive ? 'auto' : 'none',
        cursor: interactive && onEdit ? 'pointer' : 'default',
      }}
      onClick={interactive ? (e) => e.stopPropagation() : undefined}
      onMouseDown={interactive ? (e) => e.stopPropagation() : undefined}
      onPointerDown={interactive ? (e) => e.stopPropagation() : undefined}
    >
      {/* The focus-state dot above the card visually replaces the
          regular body-layer dot at the same position. Pointer-events
          off so clicks fall through to the marker hit-test. */}
      <span
        style={{
          pointerEvents: 'none',
          display: 'inline-flex',
          transform: `scale(${pressed ? 0.88 : (hovered ? 1.18 : 1)})`,
          transformOrigin: 'center',
          transition: 'transform 180ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <BodyMark
          key={resolveMarkerColor(marker)}
          state='focus'
          color={resolveMarkerColor(marker)}
          size={marker.size}
          aria-hidden
        />
      </span>
      {/* Figma 303:28557 (resting, opacity 60%) → 261:28152 (hover,
          full opacity + inline edit button). Layout is flex row so
          the buttons slot beside the text, not below. The card fades
          to full opacity on hover to draw attention while still
          letting the body figure underneath show through at rest. */}
      <div
        /* Card owns its own pointer-events so hover + click still work
           even when the wrapper has `pointer-events: none` (cursor
           mode). onMouseEnter / onMouseLeave drive showActions →
           reveals the inline edit button per Figma 261:28152. */
        onClick={(e) => {
          e.stopPropagation();
          if (onEdit) onEdit();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{
          /* `position: relative` anchors the absolutely-positioned
             action cluster (below) without taking it out of the
             card's box. Box height = text height + padding only,
             matching Figma 303:28557 where the card hugs its text. */
          position: 'relative',
          width: '100%',
          padding: 'var(--dim-space-400, 16px)',
          /* Reserve trailing space on hover so the edit button never
             overlaps long text. 44 = 36 button + 8 gap. */
          paddingRight: showActions
            ? 'calc(var(--dim-space-400, 16px) + 44px)'
            : 'var(--dim-space-400, 16px)',
          transition: 'padding-right 200ms cubic-bezier(0.32, 0.72, 0, 1), opacity 160ms cubic-bezier(0.32, 0.72, 0, 1)',
          borderRadius: 'var(--dim-radius-200, 8px)',
          background: 'var(--surface-card-100, #FFFFFF)',
          border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
          boxShadow: 'var(--shadow-card-strong, 0 4px 16px rgba(15, 23, 42, 0.08))',
          color: 'var(--text-content-tertiary, #858C92)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          fontWeight: 'var(--type-weight-regular)',
          lineHeight: 1.5,
          /* Resting opacity 60% per Figma 303:28557; lifts to 100% on
             hover (showActions = hovered) so the active card reads
             clearly when the user is interacting with it. */
          opacity: showActions ? 1 : 0.6,
          pointerEvents: 'auto',
          cursor: onEdit ? 'pointer' : 'default',
          willChange: 'transform, opacity',
        }}
      >
        <span
          style={{
            display: 'block',
            /* Auto-flow text height: preserve user newlines, wrap on
               whitespace, and force-break long unbroken sequences
               (URLs, Thai phrases without spaces, etc.) so the card
               never gets pinned at one line. */
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
          }}
        >
          {marker.note}
        </span>
        {onEdit && (
          /* Action cluster — Figma 261:28152 shows ONLY the edit
             button next to the text on hover; delete lives elsewhere
             (Delete key on the selection frame · in-textarea trash
             button while editing). Absolutely positioned at the top-
             right so it doesn't contribute to card height — the box
             stays text-driven for short notes. */
          <div
            aria-hidden={!showActions}
            style={{
              position: 'absolute',
              top: 'var(--dim-space-300, 12px)',
              right: 'var(--dim-space-300, 12px)',
              display: 'flex',
              alignItems: 'center',
              opacity: showActions ? 1 : 0,
              transform: showActions ? 'translateX(0)' : 'translateX(4px)',
              pointerEvents: showActions ? 'auto' : 'none',
              transition: showActions
                ? 'opacity 160ms ease, transform 200ms cubic-bezier(0.32, 0.72, 0, 1)'
                : 'opacity 80ms ease, transform 80ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
          >
            <MarkNoteViewerIconButton
              icon='edit'
              ariaLabel='แก้ไขจุดมาร์ค'
              onClick={onEdit}
            />
          </div>
        )}
      </div>
    </div>
  );

  if (usePortal && portalStyle && typeof document !== 'undefined') {
    return createPortal(viewer, document.body);
  }
  return viewer;
};


const MARK_STATE_PREVIEW_CELL = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 'var(--dim-space-200, 8px)',
};

const MARK_STATE_PREVIEW_LABEL = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.5,
  whiteSpace: 'nowrap',
};

const MARK_NOTE_EDITOR_PREVIEW_HEIGHT =
  MARK_NOTE_INPUT_HEIGHT + MARK_DOT_STYLES.focus.size / 2 + 8;

const MarkNoteEditorPreviewFrame = ({ label, children }) => (
  <div style={{ ...MARK_STATE_PREVIEW_CELL, alignItems: 'stretch' }}>
    <span style={{ ...MARK_STATE_PREVIEW_LABEL, alignSelf: 'center' }}>{label}</span>
    <div
      className='relative shrink-0'
      style={{
        width: MARK_NOTE_INPUT_WIDTH,
        height: MARK_NOTE_EDITOR_PREVIEW_HEIGHT,
        background: 'var(--background-screen-default, #fff)',
      }}
    >
      {children}
    </div>
  </div>
);

const MARK_PREVIEW_SAVED_NOTE = 'หลัง';

const MARK_PREVIEW_CAPTION = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
  margin: 'var(--dim-space-0)',
};

/** Components library — interactive re-open: Save enables only after editing saved text. */
export const BodyMarkReeditLogicPreview = () => {
  const [note, setNote] = useState(MARK_PREVIEW_SAVED_NOTE);
  const saveDisabled = getMarkNoteSaveDisabled({
    note,
    baselineNote: MARK_PREVIEW_SAVED_NOTE,
  });

  return (
    <div className='flex w-full flex-col' style={{ gap: 'var(--dim-space-400)' }}>
      <p style={MARK_PREVIEW_CAPTION}>
        จำลองคลิกซ้ำจุดที่บันทึกแล้ว — ปุ่ม บันทึก{' '}
        {saveDisabled ? 'ปิด' : 'เปิด'} (แก้ข้อความให้ต่างจากตอนเปิดเพื่อเปิดปุ่ม)
      </p>
      <MarkNoteEditorPreviewFrame label='Focus — Re-open (interactive)'>
        <MarkNoteEditor
          anchorPosition={{ left: '50%', top: 'var(--dim-space-0)' }}
          marker={{ id: 'preview-reedit-interactive', note }}
          baselineNote={MARK_PREVIEW_SAVED_NOTE}
          onNoteChange={setNote}
          onSave={() => {}}
        />
      </MarkNoteEditorPreviewFrame>
    </div>
  );
};

/** Components library — Figma 217:27084 variant row (6 states). */
export const BodyMarkStatesPreview = () => (
  <div
    className='flex flex-wrap items-start justify-center w-full'
    style={{ gap: 'var(--dim-space-600, 24px)' }}
  >
    <div style={MARK_STATE_PREVIEW_CELL}>
      <span style={MARK_STATE_PREVIEW_LABEL}>Default</span>
      <BodyMark state='default' />
    </div>
    <div style={MARK_STATE_PREVIEW_CELL}>
      <span style={MARK_STATE_PREVIEW_LABEL}>Hover</span>
      <BodyMark state='hover' />
    </div>
    <MarkNoteEditorPreviewFrame label='Focus — Empty'>
      <MarkNoteEditor
        anchorPosition={{ left: '50%', top: 'var(--dim-space-0)' }}
        marker={{ id: 'preview-empty', note: '' }}
        onNoteChange={() => {}}
        onSave={() => {}}
      />
    </MarkNoteEditorPreviewFrame>
    <MarkNoteEditorPreviewFrame label='Focus — Type'>
      <MarkNoteEditor
        anchorPosition={{ left: '50%', top: 'var(--dim-space-0)' }}
        marker={{ id: 'preview-type', note: MARK_PREVIEW_SAVED_NOTE }}
        onNoteChange={() => {}}
        onSave={() => {}}
      />
    </MarkNoteEditorPreviewFrame>
    <MarkNoteEditorPreviewFrame label='Focus — Re-open'>
      <MarkNoteEditor
        anchorPosition={{ left: '50%', top: 'var(--dim-space-0)' }}
        marker={{ id: 'preview-reopen', note: MARK_PREVIEW_SAVED_NOTE }}
        baselineNote={MARK_PREVIEW_SAVED_NOTE}
        onNoteChange={() => {}}
        onSave={() => {}}
      />
    </MarkNoteEditorPreviewFrame>
    <div style={MARK_STATE_PREVIEW_CELL}>
      <span style={MARK_STATE_PREVIEW_LABEL}>Active</span>
      <BodyMarkActiveStack
        note='บันทึกผลการตรวจเฉพาะที่ตำแหน่งนี้'
        style={{ padding: '0 var(--dim-space-100, 4px)' }}
      />
    </div>
  </div>
);

export const BodyFigure = React.forwardRef(function BodyFigure({
  src,
  alt,
  markers = [],
  side,
  figureWidth = BODY_DIAGRAM_FIGURE_WIDTH,
  interactive = false,
  canPlaceMarkers = false,
  markerInteractionEnabled = true,
  showMarkerNotes = false,
  boardLayerMode = false,
  onImageLayoutChange,
  selectedMarkerId = null,
  onMarkerSelect,
  onMarkerDismiss,
  onPlaceMarker,
  onMarkerNoteChange,
  onMarkerSave,
  onMarkerCancel,
  onMarkerDelete,
  markerEditBaseline,
  noteInputRef,
}, figureRef) {
  const imgRef = useRef(null);
  const markEditorAnchorRef = useRef(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLayout, setImageLayout] = useState(() => ({
    offsetX: 0,
    offsetY: 0,
    width: 0,
    height: 0,
  }));
  const [hoveredMarkerId, setHoveredMarkerId] = useState(null);
  const sideMarkers = markers.filter((m) => m.side === side);
  const selectedMarker = sideMarkers.find((m) => m.id === selectedMarkerId) ?? null;

  const measureImageLayout = useCallback(() => {
    const el = figureRef.current;
    const img = imgRef.current;
    if (!el) return;
    const boxW = el.clientWidth;
    const boxH = el.clientHeight;
    if (!boxW || !boxH) return;
    const naturalW = img?.naturalWidth || BODY_FIGURE_NATURAL_WIDTH;
    const naturalH = img?.naturalHeight || BODY_FIGURE_NATURAL_HEIGHT;
    const nextLayout = getObjectCoverLayout(boxW, boxH, naturalW, naturalH);
    setImageLayout(nextLayout);
    onImageLayoutChange?.(side, nextLayout);
  }, [side, onImageLayoutChange]);

  useLayoutEffect(() => {
    measureImageLayout();
    const el = figureRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(measureImageLayout);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureImageLayout, figureRef]);

  const markerAnchorPosition = useCallback((leftPercent, topPercent) => {
    const el = figureRef.current;
    if (!el) {
      return { left: `${leftPercent}%`, top: `${topPercent}%` };
    }
    const boxW = el.clientWidth;
    const boxH = el.clientHeight;
    return imagePercentToContainerPosition(leftPercent, topPercent, boxW, boxH, imageLayout);
  }, [imageLayout]);

  const getFigurePercent = useCallback((event) => {
    const el = figureRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height || !imageLayout.width || !imageLayout.height) return null;
    return pointerToFigurePercent(event.clientX, event.clientY, rect, imageLayout);
  }, [imageLayout]);

  const handleFigureClick = (event) => {
    if (!interactive || !markerInteractionEnabled) return;
    const point = getFigurePercent(event);
    if (!point) return;

    const existing = findMarkerAtFigurePoint(point, sideMarkers, imageLayout);
    if (existing) {
      onMarkerSelect?.(existing.id);
      return;
    }

    if (selectedMarkerId) {
      onMarkerDismiss?.();
      return;
    }

    if (!canPlaceMarkers || !onPlaceMarker) return;
    onPlaceMarker(side, point.leftPercent, point.topPercent);
  };

  const isEditingOnFigure = interactive && Boolean(selectedMarker);

  return (
    <div
      ref={figureRef}
      data-body-figure
      className={`relative h-full ${isEditingOnFigure ? 'z-[30]' : 'z-[5]'}`}
      style={{
        flex: '1 1 0',
        minWidth: 0,
        maxWidth: figureWidth,
        width: figureWidth,
        overflow: 'visible',
        cursor: interactive && canPlaceMarkers ? 'crosshair' : 'default',
      }}
      onClick={handleFigureClick}
      role={interactive ? 'img' : undefined}
      aria-label={
        interactive
          ? (canPlaceMarkers ? `${alt} — คลิกเพื่อมาร์คจุด` : alt)
          : undefined
      }
    >
      {!imageFailed ? (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className='w-full h-full object-cover object-center pointer-events-none select-none'
          draggable={false}
          onLoad={measureImageLayout}
          onError={() => {
            setImageFailed(true);
            measureImageLayout();
          }}
        />
      ) : (
        <div
          className='flex h-full w-full items-center justify-center pointer-events-none select-none'
          aria-hidden
        >
          <svg
            viewBox={`0 0 ${BODY_FIGURE_NATURAL_WIDTH} ${BODY_FIGURE_NATURAL_HEIGHT}`}
            className='h-full w-full'
            preserveAspectRatio='xMidYMid meet'
          >
            <path
              fill='#EEF0F2'
              stroke='#C5C9CE'
              strokeWidth='1.5'
              d='M147 24c22 0 40 16 40 38 0 14-6 26-16 33 12 4 22 16 24 30l8 52c2 14 10 26 22 32v18c-8 6-14 16-16 28l-6 42c-2 14-8 26-18 34v72h-28v-72c-10-8-16-20-18-34l-6-42c-2-12-8-22-16-28v-18c12-6 20-18 22-32l8-52c2-14 12-26 24-30-10-7-16-19-16-33 0-22 18-38 40-38Z'
            />
          </svg>
        </div>
      )}
      {sideMarkers.map((marker) => {
        const isSelected = marker.id === selectedMarkerId;
        const isHovered = marker.id === hoveredMarkerId;
        const hasNote = Boolean(marker.note?.trim());

        /* Board overlay renders dots; figure only hosts the note editor when selected. */
        if (boardLayerMode) return null;

        /* Focus stack (mark + VoiceTextarea) is rendered by MarkNoteEditor. */
        if (interactive && isSelected) return null;

        if (!isMarkerVisibleOnBody(marker)) return null;

        const markState = resolveMarkState({ interactive, isSelected, isHovered, hasNote });
        const markerColor = resolveMarkerColor(marker);
        const anchor = markerAnchorPosition(marker.leftPercent, marker.topPercent);
        const zIndex = isSelected ? 3 : (markState === 'active' ? 5 : 2);
        const hoverHandlers = markerInteractionEnabled ? {
          onMouseEnter: () => setHoveredMarkerId(marker.id),
          onMouseLeave: () => setHoveredMarkerId(null),
        } : {};
        const positionStyle = {
          position: 'absolute',
          left: anchor.left,
          top: anchor.top,
          transform: 'translate(-50%, -50%)',
          zIndex,
        };
        const hitTargetStyle = {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 32,
          minHeight: 32,
          pointerEvents: markerInteractionEnabled ? 'auto' : 'none',
        };

        if (markState === 'active' || (showMarkerNotes && hasNote)) {
          const activeLabel = marker.note?.trim() || 'จุดมาร์คบนร่างกาย';
          const activeWrapperStyle = {
            ...markAnchorWrapperStyle(anchor, zIndex),
            padding: 'var(--dim-space-0)',
            border: 'none',
            background: 'transparent',
            cursor: markerInteractionEnabled ? 'pointer' : 'default',
            pointerEvents: markerInteractionEnabled ? 'auto' : 'none',
          };
          if (interactive) {
            return (
              <button
                key={marker.id}
                type='button'
                data-body-mark-button
                aria-label={activeLabel}
                style={activeWrapperStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkerSelect?.(marker.id);
                }}
                {...hoverHandlers}
              >
                <BodyMarkActiveStack note={marker.note} color={markerColor} />
              </button>
            );
          }
          return (
            <span
              key={marker.id}
              role='group'
              aria-label={activeLabel}
              style={activeWrapperStyle}
              {...hoverHandlers}
            >
              <BodyMarkActiveStack note={marker.note} color={markerColor} />
            </span>
          );
        }

        if (interactive) {
          return (
            <button
              key={marker.id}
              type='button'
              data-body-mark-button
              aria-label={marker.note?.trim() || 'จุดมาร์คบนร่างกาย'}
              aria-pressed={isSelected}
              style={{
                ...positionStyle,
                ...hitTargetStyle,
                padding: 'var(--dim-space-0)',
                border: 'none',
                background: 'transparent',
                cursor: markerInteractionEnabled ? 'pointer' : 'default',
              }}
              onClick={(e) => {
                e.stopPropagation();
                onMarkerSelect?.(marker.id);
              }}
              {...hoverHandlers}
            >
              <BodyMark state={markState} color={markerColor} size={marker.size} />
            </button>
          );
        }

        return (
          <span
            key={marker.id}
            aria-hidden={!hasNote}
            aria-label={hasNote ? marker.note : undefined}
            style={{ ...positionStyle, ...hitTargetStyle }}
            {...hoverHandlers}
          >
            <BodyMark state={markState} color={markerColor} size={marker.size} />
          </span>
        );
      })}
      {interactive && selectedMarker && (() => {
        const editorAnchor = markerAnchorPosition(
          selectedMarker.leftPercent,
          selectedMarker.topPercent,
        );
        /* Click on a marker always opens the textarea editor (per
           latest UX: hover → MarkNoteViewer popover, click → editor).
           MarkNoteViewer is rendered separately on hover from
           BodyImageGroup, so it's not duplicated here. */
        return (
          <>
            <span
              ref={markEditorAnchorRef}
              aria-hidden
              className='pointer-events-none absolute'
              style={{
                left: editorAnchor.left,
                top: editorAnchor.top,
                transform: 'translate(-50%, -50%)',
                width: 1,
                height: 1,
              }}
            />
            <MarkNoteEditor
              anchorRef={markEditorAnchorRef}
              anchorPosition={editorAnchor}
              marker={selectedMarker}
              baselineNote={markerEditBaseline}
              inputRef={noteInputRef}
              onNoteChange={(note) => onMarkerNoteChange?.(selectedMarker.id, note)}
              onSave={onMarkerSave}
              onCancel={onMarkerCancel}
              onDelete={onMarkerDelete ? () => onMarkerDelete(selectedMarker.id) : undefined}
            />
          </>
        );
      })()}
    </div>
  );
});

const resolveViews = (viewKey) => ({
  showFront: viewKey === 'both' || viewKey === 'front' || viewKey === 'sides',
  showBack: viewKey === 'both' || viewKey === 'back' || viewKey === 'sides',
});

export const BodyViewSelector = ({
  viewKey,
  onViewChange,
  visibleViewKeys,
  leadingSlot = null,
  trailingSlot = null,
  tabBarStyle,
  className = '',
}) => {
  const visibleViewKeySet = Array.isArray(visibleViewKeys)
    ? new Set(visibleViewKeys)
    : null;
  const visibleTabs = visibleViewKeySet
    ? EXAM_VIEW_TABS.filter((tab) => visibleViewKeySet.has(tab.key))
    : EXAM_VIEW_TABS;

  return (
    <div
      className={`flex w-full shrink-0 items-center ${className}`}
      style={{ gap: 'var(--dim-space-300)', height: 40 }}
    >
      {leadingSlot}
      <div className='flex min-w-0 flex-1 items-center justify-center'>
        <div
          className='flex items-center justify-center shrink-0'
          style={{ gap: 'var(--dim-space-300)', maxWidth: 664 }}
        >
          <span
            style={{
              color: 'var(--text-content-tertiary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              whiteSpace: 'nowrap',
            }}
          >
            มุมมอง
          </span>
          <TabBar className='shrink-0' ariaLabel='มุมมองร่างกาย' style={tabBarStyle}>
            {visibleTabs.map((tab) => (
              <TabPill
                key={tab.key}
                selected={viewKey === tab.key}
                onClick={() => onViewChange?.(tab.key)}
              >
                {tab.label}
              </TabPill>
            ))}
          </TabBar>
        </div>
      </div>
      {trailingSlot}
    </div>
  );
};

export const BodyImageGroup = ({
  viewKey,
  markers = [],
  drawings = [],
  height = 448,
  figureGap = 0,
  figureWidth = BODY_DIAGRAM_FIGURE_WIDTH,
  className = '',
  interactive = false,
  canPlaceMarkers = false,
  showMarkerNotes = false,
  activeTool = 'select',
  activeColor = MARK_DOT_DEFAULT_COLOR,
  brushSize = 5,
  lineWidth = 5,
  fontSize = 14,
  onAddDrawing,
  onUpdateDrawing,
  onUpdateMarker,
  onRemoveDrawings,
  onRemoveMarker,
  onTextEditStart,
  onTextEditEnd,
  onDragCommit,
  selectedMarkerId = null,
  selectedDrawingId = null,
  onMarkerSelect,
  onMarkerEdit,
  onDrawingSelect,
  onMarkerDismiss,
  onPlaceMarker,
  onMarkerNoteChange,
  onMarkerSave,
  onMarkerCancel,
  onMarkerDelete,
  markerEditBaseline,
  noteInputRef,
  panActive = false,
}) => {
  const { showFront, showBack } = resolveViews(viewKey);
  const groupRef = useRef(null);
  const frontFigureRef = useRef(null);
  const backFigureRef = useRef(null);
  const figureLayoutsRef = useRef({ front: null, back: null });
  const [figureMetrics, setFigureMetrics] = useState({});
  const selectDragRef = useRef(null);
  const [groupSize, setGroupSize] = useState({ w: 0, h: 0 });
  const [draft, setDraft] = useState(null);
  /* While the user is dragging an existing marker / drawing / text, the
     element renders at reduced opacity so it reads clearly as a
     "preview / in-flight" element vs a committed one. Cleared on
     pointer-up. */
  const [draggingId, setDraggingId] = useState(null);
  /* Marker the pointer is currently hovering (select tool only). When
     set, a read-only MarkNoteViewer popover renders above that marker
     so the user can preview the note without clicking. */
  const [hoveredMarkerId, setHoveredMarkerId] = useState(null);
  /* Hide-debounce — clearing hover is delayed by 150 ms so the user
     can move the pointer from the marker into the popover (to click
     Edit / Delete) without the popover disappearing en route. */
  const hideHoverTimerRef = useRef(null);
  const cancelClearHover = useCallback(() => {
    if (hideHoverTimerRef.current) {
      clearTimeout(hideHoverTimerRef.current);
      hideHoverTimerRef.current = null;
    }
  }, []);
  const scheduleClearHover = useCallback(() => {
    cancelClearHover();
    /* 25 ms — the minimum delay we can keep before the dot→popover
       traversal starts dropping intermittently. Anything less and the
       popover blinks during normal mouse travel. */
    hideHoverTimerRef.current = setTimeout(() => {
      setHoveredMarkerId(null);
      hideHoverTimerRef.current = null;
    }, 25);
  }, [cancelClearHover]);
  /* Eraser-cursor preview — when the user picks the eraser tool, the
     native cursor is hidden and a Material Symbols `ink_eraser` icon
     follows the pointer so it's obvious they're in delete mode. */
  const [eraserPointerPos, setEraserPointerPos] = useState(null);
  /* Mark-point ghost preview — while the select tool is active and the
     pointer is over empty canvas (not on an existing marker), render a
     soft circle at the cursor so the user sees where a click will drop
     a new mark. Cleared when over a marker, dragging, or off-canvas. */
  const [markGhostPos, setMarkGhostPos] = useState(null);
  const [textPlacement, setTextPlacement] = useState(null);
  const textPlacementRef = useRef(null);
  const drawingPointerIdRef = useRef(null);
  /* Active selection-frame resize drag — see handleResizeStart /
     handleResizeMove / handleResizeEnd below. Captures the origin
     drawing + bbox so every pointer-move can re-derive the resized
     shape from the same baseline (avoiding cumulative drift). */
  const resizeRef = useRef(null);
  const eraserHitIdsRef = useRef(new Set());
  /* Reflects `eraserHitIdsRef` into render state so drawings under the
     eraser pointer (hover preview) AND accumulated during a delete
     drag stroke render with a darker stroke as feedback. Updated via
     `setEraserPreview` everywhere the ref is mutated, so the two stay
     in sync without per-pointer-move re-syncing. */
  const [eraserPreviewIds, setEraserPreviewIds] = useState(() => new Set());
  const setEraserPreview = useCallback((next) => {
    eraserHitIdsRef.current = next;
    setEraserPreviewIds(next);
  }, []);
  /* Leaving the eraser tool clears any lingering preview / cursor. */
  useEffect(() => {
    if (activeTool === 'eraser') return;
    if (eraserHitIdsRef.current.size > 0) setEraserPreview(new Set());
    setEraserPointerPos(null);
  }, [activeTool, setEraserPreview]);
  /* Mark-point ghost only makes sense while the select tool is active.
     Wipe it whenever the active tool changes. */
  useEffect(() => {
    if (activeTool !== 'select') setMarkGhostPos(null);
  }, [activeTool]);
  const penDraftRef = useRef(null);
  const penPathRef = useRef(null);
  const penStrokeDraggingRef = useRef(false);

  const drawingActive = interactive && isDrawingTool(activeTool) && !panActive;
  /* Both markpoint and cursor share the selection capture overlay —
     hover, drag and click-to-edit all work the same. The new-marker
     placement is gated separately by `canPlaceMarkers` so the cursor
     tool inspects without dropping new points. */
  const isSelectionTool = activeTool === 'select' || activeTool === 'cursor';
  const selectionActive = interactive && isSelectionTool && !textPlacement && !panActive;
  const boardLayout = createBoardLayout(groupSize.w, groupSize.h);
  /* Hit-testing must also respect the per-view filter so clicks on
     the current view don't pick up drawings stored under a different
     viewKey. */
  const drawingsForCurrentView = drawings.filter(
    (d) => !d.viewKey || d.viewKey === viewKey,
  );
  const annotationLayers = buildAnnotationLayers(markers, drawingsForCurrentView);

  textPlacementRef.current = textPlacement;

  const syncFigureMetrics = useCallback(() => {
    const groupEl = groupRef.current;
    if (!groupEl || !groupSize.w) return;
    const groupRect = groupEl.getBoundingClientRect();
    const next = {};
    const attach = (side, el) => {
      if (!el) return;
      const layout = figureLayoutsRef.current[side];
      if (!layout?.width) return;
      const rect = el.getBoundingClientRect();
      next[side] = {
        layout,
        offsetX: rect.left - groupRect.left,
        offsetY: rect.top - groupRect.top,
        boxW: rect.width,
        boxH: rect.height,
      };
    };
    if (showFront) attach('front', frontFigureRef.current);
    if (showBack) attach('back', backFigureRef.current);
    setFigureMetrics((prev) => {
      const sides = ['front', 'back'];
      const same = sides.every((side) => {
        const a = prev[side];
        const b = next[side];
        if (!a && !b) return true;
        if (!a || !b) return false;
        return (
          a.offsetX === b.offsetX
          && a.offsetY === b.offsetY
          && a.boxW === b.boxW
          && a.boxH === b.boxH
          && a.layout?.width === b.layout?.width
          && a.layout?.height === b.layout?.height
          && a.layout?.offsetX === b.layout?.offsetX
          && a.layout?.offsetY === b.layout?.offsetY
        );
      });
      return same ? prev : next;
    });
  }, [groupSize.w, showFront, showBack]);

  const handleImageLayoutChange = useCallback((side, layout) => {
    figureLayoutsRef.current[side] = layout;
    syncFigureMetrics();
  }, [syncFigureMetrics]);

  useLayoutEffect(() => {
    syncFigureMetrics();
  }, [syncFigureMetrics, markers, drawings, viewKey]);

  /* Sync placement ref when sidebar color changes (commit reads the ref). */
  useLayoutEffect(() => {
    if (!textPlacementRef.current) return;
    if (textPlacementRef.current.color === activeColor) return;
    const next = { ...textPlacementRef.current, color: activeColor };
    textPlacementRef.current = next;
    setTextPlacement(next);
  }, [activeColor]);

  const measureGroup = useCallback(() => {
    const el = groupRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    setGroupSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
  }, []);

  useLayoutEffect(() => {
    measureGroup();
    const el = groupRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(measureGroup);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureGroup, showFront, showBack, height]);

  const getBoardPoint = useCallback((event) => {
    const el = groupRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return pointerToBoardPercent(event.clientX, event.clientY, rect);
  }, []);

  const getBoardRect = useCallback(() => groupRef.current?.getBoundingClientRect() ?? null, []);

  const boardPointToFigurePoint = useCallback((point, fallbackSide) => {
    if (!point || !groupSize.w || !groupSize.h) return null;
    const boardX = (point.leftPercent / 100) * groupSize.w;
    const boardY = (point.topPercent / 100) * groupSize.h;
    const side = resolveMarkerSideAtBoardPixel(boardX, boardY, figureMetrics, fallbackSide);
    const metrics = figureMetrics?.[side];
    if (!metrics?.layout?.width || !metrics.layout.height) return null;
    const leftPx = boardX - metrics.offsetX - metrics.layout.offsetX;
    const topPx = boardY - metrics.offsetY - metrics.layout.offsetY;
    return {
      side,
      leftPercent: (leftPx / metrics.layout.width) * 100,
      topPercent: (topPx / metrics.layout.height) * 100,
      sourceFigureWidth: metrics.layout.width,
      sourceFigureHeight: metrics.layout.height,
    };
  }, [figureMetrics, groupSize.h, groupSize.w]);

  const buildFigureSpace = useCallback((drawing) => {
    if (!drawing || drawing.figureSpace) return drawing?.figureSpace;
    const sameSide = (points) => {
      if (!points.length) return null;
      const side = points[0]?.side;
      return side && points.every((point) => point?.side === side) ? side : null;
    };
    if (drawing.type === 'text') {
      const point = boardPointToFigurePoint(drawing);
      return point ? { type: 'text', ...point } : null;
    }
    if (drawing.type === 'pen' && drawing.points?.length) {
      const points = drawing.points
        .map((point) => boardPointToFigurePoint(point))
        .filter(Boolean);
      const side = sameSide(points);
      return side ? { type: 'pen', side, points } : null;
    }
    if (drawing.type === 'circle' || drawing.type === 'square') {
      const start = boardPointToFigurePoint(drawing);
      const end = boardPointToFigurePoint({
        leftPercent: drawing.leftPercent + drawing.widthPercent,
        topPercent: drawing.topPercent + drawing.heightPercent,
      }, start?.side);
      if (!start || !end || start.side !== end.side) return null;
      return { type: drawing.type, side: start.side, start, end };
    }
    if (drawing.type === 'arrow') {
      const start = boardPointToFigurePoint({ leftPercent: drawing.x1, topPercent: drawing.y1 });
      const end = boardPointToFigurePoint({ leftPercent: drawing.x2, topPercent: drawing.y2 }, start?.side);
      if (!start || !end || start.side !== end.side) return null;
      return { type: 'arrow', side: start.side, start, end };
    }
    return null;
  }, [boardPointToFigurePoint]);

  const withFigureSpace = useCallback((drawing) => {
    const figureSpace = buildFigureSpace(drawing);
    return figureSpace ? { ...drawing, figureSpace } : drawing;
  }, [buildFigureSpace]);

  const syncPenDraftPath = useCallback(() => {
    const pathEl = penPathRef.current;
    const penDraft = penDraftRef.current;
    const rect = getBoardRect();
    if (!pathEl || !penDraft?.points?.length || !rect) return;
    const layout = createBoardLayout(rect.width, rect.height);
    pathEl.setAttribute('d', buildPenPathD(penDraft.points, layout));
  }, [getBoardRect]);

  const clearPenDraftPath = useCallback(() => {
    penDraftRef.current = null;
    penStrokeDraggingRef.current = false;
    const pathEl = penPathRef.current;
    if (pathEl) pathEl.setAttribute('d', '');
  }, []);

  const isPrimaryButtonPressed = (event) => (event.buttons & 1) === 1;

  const hitMarkerAtPoint = useCallback((marker, px, py) => (
    boardPointHitsMarker(marker, px, py, figureMetrics)
  ), [figureMetrics]);

  const handleSelectPointerDown = (event) => {
    if (!selectionActive || event.button !== 0) return;
    const rect = groupRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.preventDefault();
    event.stopPropagation();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    const hit = findTopAnnotationLayer(
      annotationLayers,
      px,
      py,
      boardLayout,
      hitMarkerAtPoint,
    );

    if (hit?.kind === 'marker') {
      const marker = markers.find((m) => m.id === hit.id);
      if (!marker) return;
      onMarkerSelect?.(hit.id);
      onDrawingSelect?.(null);
      selectDragRef.current = {
        kind: 'marker',
        id: hit.id,
        side: marker.side,
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        moved: false,
        originBoard:
          markerToBoardPercent(marker, figureMetrics, groupSize.w, groupSize.h)
          ?? pointerToBoardPercent(event.clientX, event.clientY, rect),
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (hit?.kind === 'drawing') {
      const drawing = drawings.find((d) => d.id === hit.id);
      if (!drawing) return;
      onDrawingSelect?.(hit.id);
      onMarkerDismiss?.();
      selectDragRef.current = {
        kind: 'drawing',
        id: hit.id,
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        moved: false,
        origin: drawing,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (selectedMarkerId) {
      const editing = markers.find((m) => m.id === selectedMarkerId);
      if (editing?.saved !== true) {
        onMarkerDismiss?.();
        onDrawingSelect?.(null);
        return;
      }
      onMarkerDismiss?.();
    }

    if (canPlaceMarkers) {
      const figures = [
        showFront && { side: 'front', ref: frontFigureRef },
        showBack && { side: 'back', ref: backFigureRef },
      ].filter(Boolean);
      const candidates = figures
        .map(({ side, ref }) => {
          const el = ref.current;
          const figLayout = figureLayoutsRef.current[side];
          if (!el || !figLayout?.width) return null;
          const figRect = el.getBoundingClientRect();
          const point = pointerToFigurePercent(event.clientX, event.clientY, figRect, figLayout);
          if (!point) return null;
          const inside =
            point.leftPercent >= 0 && point.leftPercent <= 100
            && point.topPercent >= 0 && point.topPercent <= 100;
          /* Horizontal centre of the figure rect — used to pick the
             closest figure for clicks that land in the empty canvas
             space (left of front, right of back, between figures). */
          const centerX = figRect.left + figRect.width / 2;
          const distanceX = Math.abs(event.clientX - centerX);
          return { side, point, inside, distanceX };
        })
        .filter(Boolean);
      if (candidates.length > 0) {
        const inside = candidates.find((c) => c.inside);
        const target = inside
          ?? candidates.reduce((a, b) => (a.distanceX <= b.distanceX ? a : b));
        onPlaceMarker?.(target.side, target.point.leftPercent, target.point.topPercent);
        return;
      }
    }

    if (!selectedMarkerId) {
      onDrawingSelect?.(null);
    }
  };

  const handleSelectPointerMove = (event) => {
    const drag = selectDragRef.current;
    /* No active drag — track which marker (if any) is under the
       pointer so BodyImageGroup can render the hover popover. */
    if (!drag) {
      if (!selectionActive) return;
      const rect = groupRef.current?.getBoundingClientRect();
      if (!rect) return;
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const hit = findTopAnnotationLayer(
        annotationLayers,
        px,
        py,
        boardLayout,
        hitMarkerAtPoint,
      );
      if (hit?.kind === 'marker') {
        cancelClearHover();
        setHoveredMarkerId((prev) => (prev === hit.id ? prev : hit.id));
        /* Over an existing marker — the popover/marker dot is the
           interactive target, no ghost preview needed. */
        setMarkGhostPos((prev) => (prev === null ? prev : null));
      } else {
        scheduleClearHover();
        /* Empty canvas + select tool can place markers → show a soft
           ghost dot at the cursor so the user previews where the new
           mark will drop. */
        if (canPlaceMarkers) {
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          setMarkGhostPos((prev) => (prev && prev.x === x && prev.y === y ? prev : { x, y }));
        }
      }
      return;
    }
    if (drag.pointerId !== event.pointerId) return;
    const dist = Math.hypot(event.clientX - drag.startClientX, event.clientY - drag.startClientY);
    if (dist < DRAG_THRESHOLD_PX) return;
    if (!drag.moved) {
      drag.moved = true;
      /* First crossing of the drag threshold — mark the element as
         "in-flight" so the render layer can drop its opacity, and
         hide any hover popover / ghost preview so they don't track
         the dragged dot. */
      setDraggingId(drag.id);
      setHoveredMarkerId(null);
      setMarkGhostPos(null);
    }

    const rect = groupRef.current?.getBoundingClientRect();
    if (!rect || !groupSize.w) return;
    const startBoard = pointerToBoardPercent(drag.startClientX, drag.startClientY, rect);
    const curBoard = pointerToBoardPercent(event.clientX, event.clientY, rect);
    if (!startBoard || !curBoard) return;
    const dLeft = curBoard.leftPercent - startBoard.leftPercent;
    const dTop = curBoard.topPercent - startBoard.topPercent;

    if (drag.kind === 'drawing' && drag.origin) {
      onUpdateDrawing?.(drag.id, translateDrawing(drag.origin, dLeft, dTop), false);
      return;
    }

    if (drag.kind === 'marker' && drag.originBoard) {
      const patch = boardPercentToMarkerPatch(
        drag.originBoard.leftPercent + dLeft,
        drag.originBoard.topPercent + dTop,
        figureMetrics,
        groupSize.w,
        groupSize.h,
        drag.side,
      );
      if (patch) onUpdateMarker?.(drag.id, patch, false);
    }
  };

  const handleSelectPointerUp = (event) => {
    const drag = selectDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    selectDragRef.current = null;
    setDraggingId(null);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch (_err) {
      /* already released */
    }
    if (drag.moved) {
      onDragCommit?.();
    }
  };

  const handleDrawingPointerDown = (event) => {
    if (!drawingActive || event.button !== 0) return;
    const point = getBoardPoint(event);
    if (!point) return;
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingPointerIdRef.current = event.pointerId;

    if (activeTool === 'text') {
      if (textPlacementRef.current) {
        commitTextPlacement();
        return;
      }
      const rect = groupRef.current.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const hitLayer = findTopAnnotationLayer(
        annotationLayers,
        px,
        py,
        boardLayout,
        hitMarkerAtPoint,
      );
      if (hitLayer?.kind === 'drawing' && hitLayer.data.type === 'text') {
        const hitText = hitLayer.data;
        const textColor = hitText.color ?? activeColor;
        onTextEditStart?.({ id: hitText.id, color: textColor });
        const nextPlacement = {
          editingId: hitText.id,
          leftPercent: hitText.leftPercent,
          topPercent: hitText.topPercent,
          value: hitText.text ?? '',
          color: textColor,
        };
        textPlacementRef.current = nextPlacement;
        setTextPlacement(nextPlacement);
        return;
      }
      const nextPlacement = {
        leftPercent: point.leftPercent,
        topPercent: point.topPercent,
        value: '',
        color: activeColor,
      };
      textPlacementRef.current = nextPlacement;
      setTextPlacement(nextPlacement);
      return;
    }

    if (activeTool === 'pen') {
      penStrokeDraggingRef.current = false;
      penDraftRef.current = {
        color: activeColor,
        width: brushSize,
        points: [],
      };
      const pathEl = penPathRef.current;
      if (pathEl) {
        pathEl.setAttribute('stroke', activeColor);
        pathEl.setAttribute('stroke-width', String(brushSize));
        pathEl.setAttribute('d', '');
      }
      return;
    }

    if (activeTool === 'eraser') {
      const rect = groupRef.current.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const next = new Set();
      drawings.forEach((d) => {
        if (hitTestDrawing(d, px, py, boardLayout, brushSize * 1.5)) {
          next.add(d.id);
        }
      });
      setEraserPreview(next);
      return;
    }

    if (activeTool === 'circle' || activeTool === 'square' || activeTool === 'arrow') {
      setDraft({
        type: activeTool,
        color: activeColor,
        strokeWidth: lineWidth,
        start: point,
        end: point,
      });
    }
  };

  const handleDrawingPointerMove = (event) => {
    /* Eraser-cursor tracking + hover preview — runs on every move
       regardless of drag state, so the cursor icon follows the pointer
       and any drawing under it (including arrows) renders dimmed as
       a "you're about to delete this" hint. While the button is held,
       all drawings the eraser sweeps over accumulate into the preview
       set and get committed for deletion on pointer-up. */
    if (activeTool === 'eraser') {
      const rect = groupRef.current?.getBoundingClientRect();
      if (rect) {
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        setEraserPointerPos((prev) => (prev && prev.x === x && prev.y === y ? prev : { x, y }));
        if (!isPrimaryButtonPressed(event)) {
          /* Hover preview — show only the topmost drawing under the
             cursor (replace, not accumulate). */
          let hoveredId = null;
          for (let i = drawings.length - 1; i >= 0; i -= 1) {
            if (hitTestDrawing(drawings[i], x, y, boardLayout, brushSize * 1.5)) {
              hoveredId = drawings[i].id;
              break;
            }
          }
          const next = hoveredId ? new Set([hoveredId]) : new Set();
          /* Skip the state update when the set hasn't actually
             changed, to avoid render thrash on every pointermove. */
          if (
            next.size !== eraserHitIdsRef.current.size
            || (hoveredId && !eraserHitIdsRef.current.has(hoveredId))
          ) {
            setEraserPreview(next);
          }
        }
      }
    }

    if (!drawingActive || drawingPointerIdRef.current !== event.pointerId) return;
    const point = getBoardPoint(event);
    if (!point) return;
    event.stopPropagation();

    if (activeTool === 'pen' && penDraftRef.current) {
      if (!isPrimaryButtonPressed(event)) return;
      const rect = getBoardRect();
      if (rect) {
        const minPx = Math.max(1.5, brushSize * 0.35);
        const changed = appendPenStrokePoints(
          penDraftRef.current.points,
          getCoalescedPointerEvents(event),
          rect,
          minPx,
        );
        if (changed) {
          penStrokeDraggingRef.current = true;
          syncPenDraftPath();
        }
      }
      return;
    }

    if (draft?.type === 'circle' || draft?.type === 'square' || draft?.type === 'arrow') {
      setDraft((prev) => (prev ? { ...prev, end: point } : prev));
    }

    if (activeTool === 'eraser' && isPrimaryButtonPressed(event)) {
      const rect = groupRef.current.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      let changed = false;
      const next = new Set(eraserHitIdsRef.current);
      drawings.forEach((d) => {
        if (!next.has(d.id) && hitTestDrawing(d, px, py, boardLayout, brushSize * 1.5)) {
          next.add(d.id);
          changed = true;
        }
      });
      if (changed) setEraserPreview(next);
    }
  };

  const handleDrawingPointerUp = (event) => {
    if (drawingPointerIdRef.current !== event.pointerId) return;
    drawingPointerIdRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch (_err) {
      /* already released */
    }

    if (activeTool === 'eraser' && eraserHitIdsRef.current.size > 0) {
      onRemoveDrawings?.([...eraserHitIdsRef.current]);
      setEraserPreview(new Set());
    }

    const penDraft = penDraftRef.current;
    if (
      activeTool === 'pen'
      && penStrokeDraggingRef.current
      && penDraft?.points?.length > 1
    ) {
      onAddDrawing?.(withFigureSpace({
        id: createDrawingId(),
        type: 'pen',
        color: penDraft.color,
        width: penDraft.width,
        points: penDraft.points,
      }));
    }
    clearPenDraftPath();

    if (
      (draft?.type === 'circle' || draft?.type === 'square' || draft?.type === 'arrow')
      && draft.start
      && draft.end
    ) {
      const shape = buildShapeDrawing(
        draft.type,
        draft.start,
        draft.end,
        draft.color,
        draft.strokeWidth,
      );
      if (
        (draft.type === 'arrow' && (shape.x1 !== shape.x2 || shape.y1 !== shape.y2))
        || (draft.type !== 'arrow' && (shape.widthPercent > 0.5 || shape.heightPercent > 0.5))
      ) {
        onAddDrawing?.(withFigureSpace(shape));
      }
    }

    setDraft(null);
  };

  const commitTextPlacement = useCallback(() => {
    const placement = textPlacementRef.current;
    if (!placement) return;
    textPlacementRef.current = null;
    setTextPlacement(null);
    if (placement.editingId) onTextEditEnd?.();
    const value = String(placement.value ?? '').trim();
    const textColor = activeColor;

    if (placement.editingId) {
      if (!value) {
        onRemoveDrawings?.([placement.editingId]);
      } else {
        onUpdateDrawing?.(placement.editingId, {
          text: value,
          leftPercent: placement.leftPercent,
          topPercent: placement.topPercent,
          color: textColor,
        });
      }
      return;
    }

    if (!value) return;
    onAddDrawing?.(withFigureSpace({
      id: createDrawingId(),
      type: 'text',
      leftPercent: placement.leftPercent,
      topPercent: placement.topPercent,
      text: value,
      color: textColor,
      fontSize,
    }));
  }, [activeColor, fontSize, onAddDrawing, onRemoveDrawings, onUpdateDrawing, onTextEditEnd, withFigureSpace]);

  const prevActiveToolRef = useRef(activeTool);
  const commitTextPlacementRef = useRef(commitTextPlacement);
  commitTextPlacementRef.current = commitTextPlacement;

  useEffect(() => {
    const prev = prevActiveToolRef.current;
    prevActiveToolRef.current = activeTool;
    if (prev === 'text' && activeTool !== 'text' && textPlacementRef.current) {
      commitTextPlacementRef.current();
    }
  }, [activeTool]);

  useEffect(() => {
    if (!textPlacement) return undefined;
    const onPointerDown = (event) => {
      if (event.target.closest('[data-text-drawing-input]')) return;
      if (event.target.closest('[data-drawing-tool-sidebar]')) return;
      /* Board clicks are handled by the capture layer (mousedown before blur). */
      if (event.target.closest('[data-body-drawing-capture]')) return;
      commitTextPlacement();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [textPlacement, commitTextPlacement]);

  useEffect(() => {
    if (!interactive) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      if (textPlacement) return;
      if (event.target.closest('input, textarea, [contenteditable="true"]')) return;
      if (selectedDrawingId) {
        onRemoveDrawings?.([selectedDrawingId]);
        onDrawingSelect?.(null);
        onDragCommit?.();
        return;
      }
      if (selectedMarkerId) {
        onRemoveMarker?.(selectedMarkerId);
        onMarkerDismiss?.();
        onDragCommit?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    interactive,
    textPlacement,
    selectedDrawingId,
    selectedMarkerId,
    onRemoveDrawings,
    onRemoveMarker,
    onDrawingSelect,
    onMarkerDismiss,
    onDragCommit,
  ]);

  const focusedBoardTool = textPlacement
    ? 'text'
    : (selectedMarkerId && isSelectionTool
      ? 'mark'
      : (drawingActive ? 'draw' : null));
  const drawingCaptureZ = focusedBoardTool === 'draw'
    ? BODY_BOARD_Z.focusedTool
    : BODY_BOARD_Z.capture;

  /* Drawings are scoped to the view they were created on (board
     coordinates only make sense on that view). A drawing without a
     `viewKey` is treated as legacy / global and shown on every view
     for backward compatibility. */
  const drawingsForView = drawings.filter(
    (d) => !d.viewKey || d.viewKey === viewKey,
  );
  const visibleDrawings = textPlacement?.editingId
    ? drawingsForView.filter((d) => d.id !== textPlacement.editingId)
    : drawingsForView;
  const figurePointToBoardPoint = useCallback((point) => {
    const metrics = figureMetrics?.[point?.side];
    if (!point || !metrics?.layout?.width || !groupSize.w || !groupSize.h) return null;
    const x = metrics.offsetX + metrics.layout.offsetX + (point.leftPercent / 100) * metrics.layout.width;
    const y = metrics.offsetY + metrics.layout.offsetY + (point.topPercent / 100) * metrics.layout.height;
    return {
      leftPercent: (x / groupSize.w) * 100,
      topPercent: (y / groupSize.h) * 100,
    };
  }, [figureMetrics, groupSize.h, groupSize.w]);

  const scaleDrawingByFigure = useCallback((drawing, side) => {
    const sourceWidth = drawing.figureSpace?.sourceFigureWidth
      ?? drawing.figureSpace?.start?.sourceFigureWidth
      ?? drawing.figureSpace?.points?.[0]?.sourceFigureWidth;
    const sourceHeight = drawing.figureSpace?.sourceFigureHeight
      ?? drawing.figureSpace?.start?.sourceFigureHeight
      ?? drawing.figureSpace?.points?.[0]?.sourceFigureHeight;
    const metrics = figureMetrics?.[side];
    if (!sourceWidth || !sourceHeight || !metrics?.layout?.width || !metrics.layout.height) return drawing;
    const scale = Math.min(metrics.layout.width / sourceWidth, metrics.layout.height / sourceHeight);
    return {
      ...drawing,
      width: drawing.width == null ? drawing.width : drawing.width * scale,
      strokeWidth: drawing.strokeWidth == null ? drawing.strokeWidth : drawing.strokeWidth * scale,
      fontSize: drawing.fontSize == null ? drawing.fontSize : drawing.fontSize * scale,
    };
  }, [figureMetrics]);

  const resolveDrawingForCurrentFigure = useCallback((drawing) => {
    const figureSpace = drawing.figureSpace;
    if (!figureSpace) return drawing;
    if (figureSpace.type === 'text') {
      const point = figurePointToBoardPoint(figureSpace);
      return point ? scaleDrawingByFigure({ ...drawing, ...point }, figureSpace.side) : drawing;
    }
    if (figureSpace.type === 'pen') {
      const points = figureSpace.points.map((point) => figurePointToBoardPoint(point)).filter(Boolean);
      return points.length === figureSpace.points.length
        ? scaleDrawingByFigure({ ...drawing, points }, figureSpace.side)
        : drawing;
    }
    if (figureSpace.type === 'circle' || figureSpace.type === 'square') {
      const start = figurePointToBoardPoint(figureSpace.start);
      const end = figurePointToBoardPoint(figureSpace.end);
      if (!start || !end) return drawing;
      return scaleDrawingByFigure({
        ...drawing,
        leftPercent: start.leftPercent,
        topPercent: start.topPercent,
        widthPercent: end.leftPercent - start.leftPercent,
        heightPercent: end.topPercent - start.topPercent,
      }, figureSpace.side);
    }
    if (figureSpace.type === 'arrow') {
      const start = figurePointToBoardPoint(figureSpace.start);
      const end = figurePointToBoardPoint(figureSpace.end);
      return start && end
        ? scaleDrawingByFigure({
          ...drawing,
          x1: start.leftPercent,
          y1: start.topPercent,
          x2: end.leftPercent,
          y2: end.topPercent,
        }, figureSpace.side)
        : drawing;
    }
    return drawing;
  }, [figurePointToBoardPoint, scaleDrawingByFigure]);

  const renderedVisibleDrawings = useMemo(
    () => visibleDrawings.map(resolveDrawingForCurrentFigure),
    [resolveDrawingForCurrentFigure, visibleDrawings],
  );
  const visibleLayers = buildAnnotationLayers(markers, visibleDrawings);

  /* Identifies whether the inline MarkNoteEditor / saved-marker popover
     is going to render its OWN dot for the currently-selected marker.
     In cursor mode neither does — so the overlay layer + popover layer
     must keep painting the dot themselves, otherwise selecting a
     marker visually erases it. */
  const editorOwnsMarkerId = activeTool === 'cursor' ? null : selectedMarkerId;

  /* In cursor mode the selection visual is the blue frame + drag /
     resize / delete handles — we don't want the inline MarkNoteEditor
     to open on top of the dot (its wrapper stops pointer events,
     which would block dragging the marker). Hide it from BodyFigure
     by masking `selectedMarkerId`; the canvas-level `selectedMarkerId`
     state stays intact so the frame and capture-overlay drag still
     read the correct marker. */
  const figureSelectedMarkerId = activeTool === 'cursor' ? null : selectedMarkerId;

  const figureProps = {
    markers,
    figureWidth,
    interactive,
    canPlaceMarkers,
    markerInteractionEnabled: false,
    showMarkerNotes,
    boardLayerMode: interactive,
    onImageLayoutChange: handleImageLayoutChange,
    selectedMarkerId: figureSelectedMarkerId,
    onMarkerSelect,
    onMarkerDismiss,
    onPlaceMarker,
    onMarkerNoteChange,
    onMarkerSave,
    onMarkerCancel,
    onMarkerDelete,
    markerEditBaseline,
    noteInputRef,
  };

  return (
    <div
      ref={groupRef}
      className={`relative flex w-full shrink-0 items-center justify-center ${className}`}
      style={{
        gap: figureGap,
        height,
        minHeight: height,
      }}
    >
      {showFront && (
        <BodyFigure
          ref={frontFigureRef}
          src={FRONT_IMG}
          alt='มุมมองด้านหน้า'
          side='front'
          {...figureProps}
        />
      )}
      {showBack && (
        <BodyFigure
          ref={backFigureRef}
          src={BACK_IMG}
          alt='มุมมองด้านหลัง'
          side='back'
          {...figureProps}
        />
      )}
      {!interactive && groupSize.w > 0 && groupSize.h > 0 && renderedVisibleDrawings.length > 0 && (
        <div className='pointer-events-none absolute inset-0' aria-hidden>
          {renderedVisibleDrawings.map((drawing) => (
            <div
              key={drawing.id}
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: layerZIndex(drawing.stackOrder),
              }}
            >
              <BoardDrawingLayer
                drawing={drawing}
                layout={boardLayout}
                boxW={groupSize.w}
                boxH={groupSize.h}
                stackOrder={drawing.stackOrder}
              />
            </div>
          ))}
        </div>
      )}
      {interactive && groupSize.w > 0 && groupSize.h > 0 && (
        <>
          {/* In cursor mode the inline editor / popover is suppressed,
              so nothing else paints a dot for the selected marker —
              the overlay layer + saved-marker popover MUST keep the
              dot visible. In edit-mode tools (markpoint, etc.) the
              editor owns the selected dot, so its overlay/popover
              entry is skipped to avoid stacked dots. */}
          <div className='pointer-events-none absolute inset-0' aria-hidden>
            {visibleLayers.map((layer) => {
              if (layer.kind === 'marker') {
                if (!isMarkerVisibleOnBody(layer.data)) return null;
                if (layer.data.id === editorOwnsMarkerId) return null;
                /* Saved markers (with a note) usually defer to the
                   popover for their dot — EXCEPT while being dragged.
                   The popover suppresses itself during drag (it can't
                   track the moving anchor without lag), so the
                   overlay must paint the dot during that window. */
                const isLayerDragging = layer.data.id === draggingId;
                if (layer.data.note?.trim() && !isLayerDragging) return null;
                const pos = markerBoardPosition(
                  layer.data,
                  figureMetrics,
                  groupSize.w,
                  groupSize.h,
                );
                if (!pos) return null;
                const markerColor = resolveMarkerColor(layer.data);
                const isSelected = selectedMarkerId === layer.data.id;
                const isDrawingSel = selectedDrawingId === layer.data.id;
                const isDragging = draggingId === layer.data.id;
                const isHovered = hoveredMarkerId === layer.data.id;
                /* Hover → expand 1.18×; drag/press → shrink 0.88× for
                   tactile feedback. Spring-ish cubic-bezier mirrors the
                   ease used elsewhere in the canvas (Figma motion). */
                const dotScale = isDragging ? 0.88 : (isHovered ? 1.18 : 1);
                return (
                  <button
                    key={layer.id}
                    type='button'
                    data-body-mark-button
                    aria-label={layer.data.note?.trim() || 'จุดมาร์คบนร่างกาย'}
                    aria-pressed={isSelected}
                    className='pointer-events-none'
                    style={{
                      position: 'absolute',
                      left: pos.left,
                      top: pos.top,
                      transform: `translate(-50%, -50%) scale(${dotScale})`,
                      transformOrigin: 'center',
                      zIndex: layerZIndex(layer.stackOrder),
                      padding: 'var(--dim-space-0)',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'grab',
                      boxShadow: (isSelected || isDrawingSel)
                        ? '0 0 0 2px var(--brand-p600)'
                        : undefined,
                      borderRadius: '50%',
                      opacity: isDragging ? 0.55 : 1,
                      transition: 'opacity 120ms ease, transform 180ms cubic-bezier(0.32, 0.72, 0, 1)',
                    }}
                  >
                    <BodyMark color={markerColor} size={layer.data.size} />
                  </button>
                );
              }
              const isDrawingSelected = selectedDrawingId === layer.data.id;
              const isDrawingDragging = draggingId === layer.data.id;
              /* Eraser preview — drawings the eraser cursor is over (or
                 sweeping during a delete drag) render at 0.55 opacity
                 inside the SVG (via BoardDrawingLayer's `dimmed` prop).
                 Doing it on the SVG layer instead of a CSS filter on
                 the wrapper avoids the disappearing-stroke artefact
                 that `brightness(0.6)` caused for dark colours. */
              const isEraserTarget = eraserPreviewIds.has(layer.data.id);
              const effectiveStackOrder = isDrawingSelected
                ? layer.stackOrder + BODY_BOARD_Z.selectedBump
                : layer.stackOrder;
              /* Wrapper z-index MUST be set explicitly: when dragging
                 we drop opacity to 0.55, which creates a new CSS
                 stacking context and traps the inner SVG's z-index
                 inside. Without a z-index here the wrapper falls back
                 to `auto` (≈ 0) and the body figure (z-[5] / z-[30] in
                 edit mode) paints over the drawing while the user is
                 moving it. */
              return (
                <div
                  key={layer.id}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: layerZIndex(effectiveStackOrder),
                    opacity: isDrawingDragging ? 0.55 : 1,
                    transition: 'opacity 120ms ease',
                  }}
                >
                  <BoardDrawingLayer
                    drawing={layer.data}
                    layout={boardLayout}
                    boxW={groupSize.w}
                    boxH={groupSize.h}
                    stackOrder={effectiveStackOrder}
                    dimmed={isEraserTarget}
                  />
                </div>
              );
            })}
          </div>
          {/* Selection frame for a focused drawing — Figma-style 1px
              blue outline + 4 corner handles. Only mounts when the
              CURSOR (pointer) tool is active: that's the explicit
              "I am selecting an object" mode. Clicks made while the
              markpoint or any drawing tool is active still set the
              `selectedDrawingId` for internal flows, but the frame
              UI itself stays hidden — picking up the cursor tool
              reveals it. */}
          {activeTool === 'cursor' && selectedDrawingId && (() => {
            const sel = visibleDrawings.find((d) => d.id === selectedDrawingId);
            if (!sel) return null;
            const bounds = getDrawingBounds(sel, boardLayout);
            if (!bounds) return null;
            const w = Math.max(0, bounds.maxX - bounds.minX);
            const h = Math.max(0, bounds.maxY - bounds.minY);
            const handleResizeStart = (corner, event) => {
              event.preventDefault();
              event.stopPropagation();
              const drawing = drawings.find((d) => d.id === selectedDrawingId);
              if (!drawing) return;
              const originBounds = getDrawingBounds(drawing, boardLayout);
              if (!originBounds) return;
              resizeRef.current = {
                pointerId: event.pointerId,
                corner,
                startClientX: event.clientX,
                startClientY: event.clientY,
                originDrawing: drawing,
                originBounds,
                moved: false,
              };
              try { event.currentTarget.setPointerCapture(event.pointerId); } catch (_e) { /* noop */ }
            };
            const handleResizeMove = (event) => {
              const r = resizeRef.current;
              if (!r || r.pointerId !== event.pointerId) return;
              const dx = event.clientX - r.startClientX;
              const dy = event.clientY - r.startClientY;
              if (!r.moved && Math.abs(dx) + Math.abs(dy) < 1) return;
              r.moved = true;
              const newBounds = computeResizedBounds(r.originBounds, r.corner, dx, dy);
              const resized = resizeDrawing(r.originDrawing, r.originBounds, newBounds, boardLayout);
              if (!resized) return;
              const { id: _omit, ...patch } = resized;
              onUpdateDrawing?.(r.originDrawing.id, patch, false);
            };
            const handleResizeEnd = (event) => {
              const r = resizeRef.current;
              if (!r || r.pointerId !== event.pointerId) return;
              resizeRef.current = null;
              try { event.currentTarget.releasePointerCapture(event.pointerId); } catch (_e) { /* noop */ }
              if (r.moved) onDragCommit?.();
            };
            return (
              <DrawingSelectionFrame
                left={bounds.minX}
                top={bounds.minY}
                width={w}
                height={h}
                onResizeStart={handleResizeStart}
                onResizeMove={handleResizeMove}
                onResizeEnd={handleResizeEnd}
              />
            );
          })()}
          {/* Selection frame for a focused marker — only while the
              cursor tool is active. Selecting a marker with the
              markpoint tool opens the note editor instead, which is
              that tool's own "selected" UI. */}
          {activeTool === 'cursor' && selectedMarkerId && (() => {
            const marker = markers.find((m) => m.id === selectedMarkerId);
            if (!marker) return null;
            /* markerBoardPosition returns CSS percent strings (e.g.
               '50%') — useless for arithmetic. Compute the dot's
               BOARD-PIXEL center directly from the figure metrics so
               the frame can be positioned via numeric left/top. */
            const metrics = figureMetrics?.[marker.side];
            if (!metrics?.layout?.width) return null;
            const { layout, offsetX, offsetY } = metrics;
            const cx = offsetX + layout.offsetX + (marker.leftPercent / 100) * layout.width;
            const cy = offsetY + layout.offsetY + (marker.topPercent / 100) * layout.height;
            const pos = { left: cx, top: cy };
            const dotR = (marker.size ?? MARK_DOT_STYLES.focus.size ?? 24) / 2;
            const pad = 8;
            const side = dotR * 2 + pad * 2;
            const MIN_MARKER_R = 6;
            const handleMarkerResizeStart = (corner, event) => {
              event.preventDefault();
              event.stopPropagation();
              const groupRect = groupRef.current?.getBoundingClientRect();
              if (!groupRect) return;
              resizeRef.current = {
                kind: 'marker',
                pointerId: event.pointerId,
                corner,
                markerId: marker.id,
                originSize: marker.size ?? MARK_DOT_STYLES.focus.size ?? 24,
                centerX: pos.left,
                centerY: pos.top,
                groupRect,
                moved: false,
              };
              try { event.currentTarget.setPointerCapture(event.pointerId); } catch (_e) { /* noop */ }
            };
            const handleMarkerResizeMove = (event) => {
              const r = resizeRef.current;
              if (!r || r.kind !== 'marker' || r.pointerId !== event.pointerId) return;
              const px = event.clientX - r.groupRect.left;
              const py = event.clientY - r.groupRect.top;
              const adx = Math.abs(px - r.centerX);
              const ady = Math.abs(py - r.centerY);
              let newR;
              if (r.corner === 'top' || r.corner === 'bottom') newR = ady - pad;
              else if (r.corner === 'left' || r.corner === 'right') newR = adx - pad;
              else newR = Math.max(adx, ady) - pad;
              newR = Math.max(MIN_MARKER_R, newR);
              const newSize = Math.round(newR * 2);
              if (Math.abs(newSize - (marker.size ?? r.originSize)) < 0.5) return;
              r.moved = true;
              onUpdateMarker?.(r.markerId, { size: newSize }, false);
            };
            const handleMarkerResizeEnd = (event) => {
              const r = resizeRef.current;
              if (!r || r.kind !== 'marker' || r.pointerId !== event.pointerId) return;
              resizeRef.current = null;
              try { event.currentTarget.releasePointerCapture(event.pointerId); } catch (_e) { /* noop */ }
              if (r.moved) onDragCommit?.();
            };
            return (
              <DrawingSelectionFrame
                left={pos.left - dotR - pad}
                top={pos.top - dotR - pad}
                width={side}
                height={side}
                onResizeStart={handleMarkerResizeStart}
                onResizeMove={handleMarkerResizeMove}
                onResizeEnd={handleMarkerResizeEnd}
              />
            );
          })()}
          {/* Shape draft (circle / square / arrow) — rendered in a dedicated
              high-z SVG above the annotation layer so the in-flight outline
              is visible above any markers underneath, and React only
              re-renders this tiny SVG instead of the full visibleLayers list
              on each pointermove. */}
          {draft && (
            <div
              className='pointer-events-none absolute inset-0'
              style={{ zIndex: BODY_BOARD_Z.focusedTool }}
              aria-hidden
            >
              <BodyFigureAnnotationsSvg
                drawings={[]}
                draft={draft}
                layout={boardLayout}
                boxW={groupSize.w}
                boxH={groupSize.h}
              />
            </div>
          )}
          <svg
            className='pointer-events-none absolute inset-0'
            width={groupSize.w}
            height={groupSize.h}
            style={{ zIndex: BODY_BOARD_Z.focusedTool }}
            aria-hidden
          >
            <path
              ref={penPathRef}
              fill='none'
              strokeLinecap='round'
              strokeLinejoin='round'
              d=''
            />
          </svg>
          {/* Persistent popovers — every SAVED marker (with note) shows
              a Figma 220:27806 read-only card by default. On hover the
              card expands to the Figma 261:28149 form with Edit +
              Delete buttons. Markers being edited (selected) or dragged
              are skipped — the editor / drag preview owns that
              position. Wrapper is pointer-events-none so clicks fall
              through to the marker hit-test below; the viewer cards
              themselves opt back in via pointer-events-auto. */}
          <div
            className='pointer-events-none absolute inset-0'
            style={{ zIndex: BODY_BOARD_Z.focusedTool }}
          >
            {markers.map((marker) => {
              if (marker.id === editorOwnsMarkerId) return null;
              if (marker.id === draggingId) return null;
              if (!marker.note?.trim()) return null;
              const pos = markerBoardPosition(marker, figureMetrics, groupSize.w, groupSize.h);
              if (!pos) return null;
              return (
                <MarkNoteViewer
                  key={marker.id}
                  marker={marker}
                  anchorPosition={pos}
                  /* In cursor mode the popover is pure visual label —
                     pointer events disabled so the dot below stays
                     draggable + selectable. Other tools keep the
                     popover interactive (hover for edit/delete). */
                  interactive={activeTool !== 'cursor'}
                  showActions={hoveredMarkerId === marker.id}
                  hovered={hoveredMarkerId === marker.id}
                  pressed={draggingId === marker.id}
                  onMouseEnter={() => {
                    cancelClearHover();
                    setHoveredMarkerId((prev) => (prev === marker.id ? prev : marker.id));
                  }}
                  onMouseLeave={scheduleClearHover}
                  onEdit={() => {
                    cancelClearHover();
                    setHoveredMarkerId(null);
                    /* `onMarkerEdit` escalates the tool out of cursor
                       mode so MarkNoteEditor mounts; falls back to
                       plain select if the parent didn't wire it. */
                    (onMarkerEdit ?? onMarkerSelect)?.(marker.id);
                  }}
                />
              );
            })}
          </div>
          {/* Eraser cursor — rendered above the actual pointer position
              so the user clearly sees they are about to delete. The
              native cursor on the capture overlay is hidden when the
              eraser tool is active. */}
          {/* Mark-point ghost — soft circle at the cursor while the
              select tool is active and the pointer is over empty
              canvas. Tells the user "click here to drop a mark". */}
          {activeTool === 'select' && canPlaceMarkers && markGhostPos && (
            <div
              aria-hidden
              className='pointer-events-none absolute'
              style={{
                left: markGhostPos.x,
                top: markGhostPos.y,
                transform: 'translate(-50%, -50%)',
                zIndex: BODY_BOARD_Z.focusedTool,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: activeColor,
                opacity: 0.35,
                boxShadow: `0 0 0 4px ${activeColor}1F`,
                transition: 'left 60ms linear, top 60ms linear, opacity 120ms ease',
              }}
            />
          )}
          {activeTool === 'eraser' && eraserPointerPos && (
            <div
              aria-hidden
              className='pointer-events-none absolute'
              style={{
                left: eraserPointerPos.x,
                top: eraserPointerPos.y,
                /* Anchor icon roughly above the pointer hotspot. */
                transform: 'translate(-50%, -110%)',
                zIndex: BODY_BOARD_Z.focusedTool + 1,
                width: 28,
                height: 28,
                borderRadius: 'var(--dim-radius-400, 12px)',
                background: 'var(--surface-card-100, #fff)',
                border: 'var(--dim-stroke-100) solid var(--border-neutral-tertiary, #E2E4E6)',
                boxShadow: CARD_SHADOW_TOOL,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-content-default, #1F2937)',
              }}
            >
              <span
                className='material-symbols-outlined'
                style={{
                  fontFamily: 'Material Symbols Outlined',
                  fontSize: 18,
                  lineHeight: 1,
                  fontVariationSettings: "'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20",
                }}
              >
                ink_eraser
              </span>
            </div>
          )}
          {selectionActive && (
            <div
              className='absolute inset-0 h-full w-full'
              data-body-selection-capture
              style={{
                zIndex: BODY_BOARD_Z.capture,
                cursor: 'default',
                touchAction: 'none',
              }}
              onPointerDown={handleSelectPointerDown}
              onPointerMove={handleSelectPointerMove}
              onPointerUp={handleSelectPointerUp}
              onPointerCancel={handleSelectPointerUp}
              onPointerLeave={() => {
                scheduleClearHover();
                setMarkGhostPos(null);
              }}
              aria-hidden
            />
          )}
          {textPlacement && (
            <BodyTextDrawingInput
              value={textPlacement.value}
              onChange={(e) => setTextPlacement((prev) => {
                const next = prev ? { ...prev, value: e.target.value } : prev;
                textPlacementRef.current = next;
                return next;
              })}
              onCommit={commitTextPlacement}
              onCancel={() => {
                if (textPlacementRef.current?.editingId) onTextEditEnd?.();
                textPlacementRef.current = null;
                setTextPlacement(null);
              }}
              editingId={textPlacement.editingId}
              textColor={activeColor}
              fontSize={fontSize}
              positionStyle={{
                left: `${textPlacement.leftPercent}%`,
                top: `${textPlacement.topPercent}%`,
                transform: 'translate(-4px, -4px)',
              }}
            />
          )}
          {drawingActive && (
            <div
              className='absolute h-full w-full'
              data-body-drawing-capture
              data-body-focused-tool={focusedBoardTool === 'draw' ? 'draw' : undefined}
              style={{
                zIndex: drawingCaptureZ,
                /* Hide native cursor for the eraser tool — a custom
                   `ink_eraser` icon follows the pointer instead so the
                   user always sees what they're about to delete. */
                cursor: activeTool === 'eraser' ? 'none' : getDrawToolCursor(activeTool),
                touchAction: 'none',
              }}
              onPointerDown={handleDrawingPointerDown}
              onPointerMove={handleDrawingPointerMove}
              onPointerUp={handleDrawingPointerUp}
              onPointerCancel={handleDrawingPointerUp}
              onPointerLeave={() => {
                setEraserPointerPos(null);
                if (eraserHitIdsRef.current.size > 0) setEraserPreview(new Set());
              }}
              aria-hidden
            />
          )}
        </>
      )}
    </div>
  );
};


const SlideSlider = ({ label, value, onChange, min = 1, max = 20, labelGap = 'var(--dim-space-200)' }) => {
  const pct = ((value - min) / (max - min)) * 100;
  const thumbLeft = `calc(${pct}% - 10px)`;

  return (
    <div className='flex w-full flex-col' style={{ gap: labelGap }}>
      <span
        style={{
          color: 'var(--text-content-default)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          lineHeight: 1.5,
        }}
      >
        {label}
      </span>
      <div className='relative shrink-0' style={{ width: SLIDE_TRACK_WIDTH, height: 24 }}>
        <div
          aria-hidden
          className='absolute overflow-hidden'
          style={{
            left: 'var(--dim-space-0)',
            right: 'var(--dim-space-0)',
            top: '33.33%',
            height: 8,
            borderRadius: 'var(--dim-radius-100)',
            background: '#F3F4F6',
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: 'var(--brand-p600, #08A768)',
              borderRadius: 'var(--dim-radius-100)',
            }}
          />
        </div>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: thumbLeft,
            top: 'var(--dim-space-050)',
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: 'var(--shadow-formbuilder, 0 1px 4px rgba(100, 116, 139, 0.10))',
            pointerEvents: 'none',
          }}
        />
        <input
          type='range'
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          className='absolute inset-0 w-full cursor-pointer opacity-0'
        />
      </div>
    </div>
  );
};

export const DrawingToolbar = ({
  percent,
  onZoomIn,
  onZoomOut,
  canZoomIn,
  canZoomOut,
  showPan = true,
  onPan,
  panActive,
}) => (
  <BodyDiagramZoomToolbar
    percent={percent}
    onZoomIn={onZoomIn}
    onZoomOut={onZoomOut}
    canZoomIn={canZoomIn}
    canZoomOut={canZoomOut}
    showPan={showPan}
    onPan={onPan}
    panActive={panActive}
  />
);

/** Figma 223:29729 — floating vertical zoom / pan / undo card on the canvas. */
export const DrawingCanvasFloatingToolbar = ({
  percent = 100,
  onZoomIn,
  onZoomOut,
  canZoomIn = true,
  canZoomOut = true,
  onPan,
  panActive = false,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}) => (
  <div
    role='toolbar'
    aria-label='ซูมและเลื่อน'
    className='flex shrink-0 flex-col'
    style={{
      padding: 'var(--dim-space-200)',
      gap: 'var(--dim-space-300)',
      borderRadius: 'var(--dim-radius-500)',
      border: 'var(--dim-stroke-100) solid var(--border-card-default, #E2E4E6)',
      background: 'var(--surface-card-100, #fff)',
      boxShadow: CARD_SHADOW_TOOL,
    }}
  >
    <div
      className='flex flex-col items-center justify-center'
      style={{ gap: 'var(--dim-space-400)' }}
    >
      <Tooltip content='เลื่อน (Pan)' position='right'>
        <NeutralSubdueIconButton
          variant='outline'
          size='sm'
          aria-label='เลื่อน'
          active={panActive}
          activeAppearance='focus'
          onClick={onPan}
        >
          <BodyDiagramRailIcon name='hand' />
        </NeutralSubdueIconButton>
      </Tooltip>
      <span
        style={{
          color: 'var(--text-content-default)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
          fontWeight: 500,
          lineHeight: 1.5,
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
        aria-live='polite'
        aria-atomic='true'
      >
        {percent}%
      </span>
      <div
        className='flex flex-col items-start justify-center'
        style={{ gap: 'var(--dim-space-200)' }}
      >
        <Tooltip content='ซูมออก' position='right'>
          <NeutralSubdueIconButton
            variant='outline'
            size='sm'
            aria-label='ซูมออก'
            disabled={!canZoomOut}
            onClick={onZoomOut}
          >
            <BodyDiagramRailIcon name='zoom-out' />
          </NeutralSubdueIconButton>
        </Tooltip>
        <Tooltip content='ซูมเข้า' position='right'>
          <NeutralSubdueIconButton
            variant='outline'
            size='sm'
            aria-label='ซูมเข้า'
            disabled={!canZoomIn}
            onClick={onZoomIn}
          >
            <BodyDiagramRailIcon name='zoom-in' />
          </NeutralSubdueIconButton>
        </Tooltip>
      </div>
    </div>
    <div
      aria-hidden
      className='w-full shrink-0'
      style={{
        height: 1,
        background: 'var(--border-neutral-quaternary, #F4F5F5)',
      }}
    />
    <div
      className='flex flex-col items-start justify-center'
      style={{ gap: 'var(--dim-space-200)' }}
    >
      <Tooltip content='เลิกทำ (Undo)' position='right'>
        <NeutralSubdueIconButton
          variant='outline'
          size='sm'
          icon='undo'
          aria-label='เลิกทำ'
          disabled={!canUndo}
          onClick={onUndo}
        />
      </Tooltip>
      <Tooltip content='ทำซ้ำ (Redo)' position='right'>
        <NeutralSubdueIconButton
          variant='outline'
          size='sm'
          icon='redo'
          aria-label='ทำซ้ำ'
          disabled={!canRedo}
          onClick={onRedo}
        />
      </Tooltip>
    </div>
  </div>
);

/** Figma 223:29744 — centered view label + tab bar above the canvas. */
export const DrawingCanvasViewBar = ({ viewKey, onViewChange }) => (
  <div
    className='pointer-events-auto flex min-w-0 flex-1 items-center justify-center'
    style={{ gap: 'var(--dim-space-200)' }}
  >
    <span
      style={{
        color: 'var(--text-content-tertiary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        lineHeight: 1.5,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      มุมมอง
    </span>
    <TabBar
      className='w-fit max-w-full shrink-0'
      ariaLabel='มุมมองร่างกาย'
      style={{ background: 'var(--surface-tabpill-background, #E2F3EB)' }}
    >
      {EXAM_VIEW_TABS.map((tab) => (
        <TabPill
          key={tab.key}
          selected={viewKey === tab.key}
          onClick={() => onViewChange?.(tab.key)}
        >
          {tab.label}
        </TabPill>
      ))}
    </TabBar>
  </div>
);

/** Figma 223:29727 — overlay toolbar row (zoom card + view tabs). */
export const DrawingCanvasOverlayBar = ({ viewKey, onViewChange, zoom }) => (
  <div
    className='pointer-events-none absolute left-0 top-0 z-10 flex w-full items-start'
  >
    <div className='pointer-events-auto shrink-0'>
      <DrawingCanvasFloatingToolbar {...zoom} />
    </div>
    <DrawingCanvasViewBar viewKey={viewKey} onViewChange={onViewChange} />
  </div>
);

export const DrawingCanvasHeader = DrawingCanvasOverlayBar;

/** Figma-style selection frame — rendered when a drawing is selected
    via the pointer / markpoint tool. Visuals: 1px brand-blue outline,
    4 corner handles (white square + blue border), and a rounded pill
    at the bottom showing the drawing's bounding-box dimensions. The
    whole layer is pointer-events: none so clicks fall through to the
    underlying selection-capture overlay. */
const DRAWING_SELECTION_COLOR = '#3B82F6';
const DRAWING_SELECTION_HANDLE_SIZE = 10;
/* Corner table — each entry says where to place the handle in the
   frame (CSS edges) and what cursor it should advertise. The cursor
   names match the native OS resize affordances. */
const DRAWING_SELECTION_CORNERS = [
  { corner: 'tl', edges: { left: true, top: true }, cursor: 'nwse-resize' },
  { corner: 'tr', edges: { right: true, top: true }, cursor: 'nesw-resize' },
  { corner: 'bl', edges: { left: true, bottom: true }, cursor: 'nesw-resize' },
  { corner: 'br', edges: { right: true, bottom: true }, cursor: 'nwse-resize' },
];
/* Edge hit zones — single-axis resize. The `side` key matches the
   identifier `computeResizedBounds` expects ('top' | 'right' |
   'bottom' | 'left'). */
const DRAWING_SELECTION_EDGES = [
  { side: 'top',    cursor: 'ns-resize' },
  { side: 'right',  cursor: 'ew-resize' },
  { side: 'bottom', cursor: 'ns-resize' },
  { side: 'left',   cursor: 'ew-resize' },
];

const DrawingSelectionFrame = ({ left, top, width, height, onResizeStart, onResizeMove, onResizeEnd }) => {
  /* Markers reuse this frame as a selection visual but they aren't
     resizable — when no onResizeStart is supplied the handles render
     as decoration only (no pointer events, no resize cursor). */
  const resizable = Boolean(onResizeStart);
  const half = DRAWING_SELECTION_HANDLE_SIZE / 2;
  const handleBase = {
    position: 'absolute',
    width: DRAWING_SELECTION_HANDLE_SIZE,
    height: DRAWING_SELECTION_HANDLE_SIZE,
    background: '#FFFFFF',
    border: `1.5px solid ${DRAWING_SELECTION_COLOR}`,
    borderRadius: 'var(--dim-radius-100, 4px)',
    boxSizing: 'border-box',
    pointerEvents: resizable ? 'auto' : 'none',
    touchAction: 'none',
  };
  return (
    <div
      className='pointer-events-none absolute'
      aria-hidden
      style={{
        left,
        top,
        width,
        height,
        zIndex: BODY_BOARD_Z.focusedTool + 1,
        border: `1px solid ${DRAWING_SELECTION_COLOR}`,
        boxSizing: 'border-box',
      }}
    >
      {DRAWING_SELECTION_CORNERS.map(({ corner, edges, cursor }) => (
        <span
          key={corner}
          role='button'
          aria-label={`ปรับขนาด ${corner}`}
          onPointerDown={(e) => onResizeStart?.(corner, e)}
          onPointerMove={(e) => onResizeMove?.(e)}
          onPointerUp={(e) => onResizeEnd?.(e)}
          onPointerCancel={(e) => onResizeEnd?.(e)}
          style={{
            ...handleBase,
            cursor: resizable ? cursor : 'default',
            left: edges.left ? -half : undefined,
            right: edges.right ? -half : undefined,
            top: edges.top ? -half : undefined,
            bottom: edges.bottom ? -half : undefined,
          }}
        />
      ))}
      {/* Edge hit zones — invisible thin strips along each side of the
          frame so the user can resize a single axis. The strip stops
          short of each corner (left/right insets = half) so it never
          steals events from the corner handles. */}
      {resizable && DRAWING_SELECTION_EDGES.map(({ side, cursor }) => {
        const isVertical = side === 'left' || side === 'right';
        return (
          <span
            key={side}
            role='button'
            aria-label={`ปรับขนาด ${side}`}
            onPointerDown={(e) => onResizeStart?.(side, e)}
            onPointerMove={(e) => onResizeMove?.(e)}
            onPointerUp={(e) => onResizeEnd?.(e)}
            onPointerCancel={(e) => onResizeEnd?.(e)}
            style={{
              position: 'absolute',
              pointerEvents: 'auto',
              touchAction: 'none',
              cursor,
              /* Horizontal edges (top/bottom): full width minus corner
                 insets, fixed 8px tall band centered on the edge.
                 Vertical edges (left/right): vice-versa. */
              left: isVertical ? (side === 'left' ? -4 : undefined) : half,
              right: isVertical ? (side === 'right' ? -4 : undefined) : half,
              top: isVertical ? half : (side === 'top' ? -4 : undefined),
              bottom: isVertical ? half : (side === 'bottom' ? -4 : undefined),
              width: isVertical ? 8 : undefined,
              height: isVertical ? undefined : 8,
            }}
          />
        );
      })}
    </div>
  );
};

const ColorSwatchButton = ({ color, selected, onSelect }) => {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const scale = pressed ? 0.92 : hovered ? 1.18 : 1;
  return (
    <button
      type='button'
      aria-label={`สี ${color}`}
      aria-pressed={selected}
      onClick={() => onSelect(color)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => {
        setHovered(false);
        setPressed(false);
      }}
      className='shrink-0'
      style={{
        width: 24,
        height: 24,
        borderRadius: 'var(--dim-radius-600, 24px)',
        background: color,
        border: selected ? '2px solid #171A1F' : '2px solid transparent',
        cursor: 'pointer',
        padding: 'var(--dim-space-0)',
        transform: `scale(${scale})`,
        transition:
          'transform 180ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease, border-color 160ms ease',
        boxShadow: hovered
          ? '0 4px 10px rgba(15, 23, 42, 0.18)'
          : '0 1px 2px rgba(15, 23, 42, 0.08)',
        willChange: 'transform',
      }}
    />
  );
};

/* Per-drawing-type slider configuration — when the pointer tool has a
   drawing selected, the sidebar overrides its tool-based slider with
   a slider that edits THAT drawing's size in-place. The size field
   name differs per type: pen uses `width`, shapes/arrow use
   `strokeWidth`, text uses `fontSize`. */
const SELECTED_DRAWING_SLIDER = {
  pen:    { label: 'ขนาดแปรง',       field: 'width',       min: 1,  max: 20, fallback: 5  },
  square: { label: 'ความกว้างเส้น',  field: 'strokeWidth', min: 1,  max: 20, fallback: 5  },
  circle: { label: 'ความกว้างเส้น',  field: 'strokeWidth', min: 1,  max: 20, fallback: 5  },
  arrow:  { label: 'ความกว้างเส้น',  field: 'strokeWidth', min: 1,  max: 20, fallback: 5  },
  text:   { label: 'ขนาดตัวหนังสือ', field: 'fontSize',    min: 10, max: 40, fallback: 14 },
};

export const DrawingToolSidebar = ({
  activeTool,
  onToolChange,
  activeColor,
  onColorChange,
  brushSize,
  onBrushSizeChange,
  lineWidth,
  onLineWidthChange,
  fontSize = 14,
  onFontSizeChange,
  selectedDrawing = null,
  onSelectedDrawingSizeChange,
  onClear,
  fillHeight = false,
}) => (
  <aside
    data-drawing-tool-sidebar
    className='flex shrink-0 flex-col self-start'
    style={{
      width: DRAWING_TOOL_SIDEBAR_WIDTH,
      height: fillHeight ? 'auto' : DRAWING_TOOL_SIDEBAR_HEIGHT,
      maxHeight: fillHeight ? '100%' : undefined,
      boxSizing: 'border-box',
      gap: 'var(--dim-space-600)',
      padding: 'var(--dim-space-600)',
      borderRadius: 'var(--dim-radius-500)',
      border: 'var(--dim-stroke-100) solid var(--border-card-default, #E2E4E6)',
      background: 'var(--surface-card-100, #fff)',
      boxShadow: CARD_SHADOW_SIDEBAR,
    }}
  >
    <Topic
      hierarchy='primary'
      title='เครื่องมือวาด'
      leadingIcon='palette'
      showSubText={false}
      showBadge={false}
      showChevron={false}
      showSuccess={false}
      style={{ padding: 'var(--dim-space-0)' }}
    />

    <div className='flex w-full flex-col' style={{ gap: 'var(--dim-space-200)' }}>
      <span
        style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          lineHeight: 1.5,
          color: 'var(--text-content-default)',
        }}
      >
        ประเภทเครื่องมือ
      </span>
      <DrawingToolTypeGrid activeTool={activeTool} onToolChange={onToolChange} />
    </div>

    <div className='flex w-full flex-col' style={{ gap: 'var(--dim-space-300)' }}>
      <span
        style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          lineHeight: 1.5,
          color: 'var(--text-content-default)',
        }}
      >
        สี
      </span>
      <div
        className='flex flex-wrap content-center items-center'
        style={{ gap: 'var(--dim-space-300)' }}
      >
        {DRAW_COLORS.map((color) => (
          <ColorSwatchButton
            key={color}
            color={color}
            selected={activeColor === color}
            onSelect={onColorChange}
          />
        ))}
      </div>
    </div>

    {/* Slider switches by context:
        1. If a drawing is selected (via the pointer tool), show the
           slider for THAT drawing's size field — pen→width, shapes/
           arrow→strokeWidth, text→fontSize. Changes write directly
           to the drawing's data via onSelectedDrawingSizeChange.
        2. Otherwise fall back to the active-tool slider (Figma
           222:27195 / 266:28925 / 266:28679):
           pen/eraser → ขนาดแปรง · text → ขนาดตัวหนังสือ
           circle/square/arrow → ความกว้างเส้น · select → no slider */}
    {(() => {
      const selCfg = selectedDrawing && SELECTED_DRAWING_SLIDER[selectedDrawing.type];
      if (selCfg) {
        const current = Number(selectedDrawing[selCfg.field] ?? selCfg.fallback);
        return (
          <SlideSlider
            label={selCfg.label}
            value={current}
            min={selCfg.min}
            max={selCfg.max}
            onChange={(next) => onSelectedDrawingSizeChange?.(next)}
          />
        );
      }
      if (activeTool === 'pen' || activeTool === 'eraser') {
        return <SlideSlider label='ขนาดแปรง' value={brushSize} onChange={onBrushSizeChange} />;
      }
      if (activeTool === 'text') {
        return (
          <SlideSlider
            label='ขนาดตัวหนังสือ'
            value={fontSize}
            onChange={onFontSizeChange}
            min={10}
            max={40}
          />
        );
      }
      if (activeTool === 'circle' || activeTool === 'square' || activeTool === 'arrow') {
        return (
          <SlideSlider
            label='ความกว้างเส้น'
            value={lineWidth}
            onChange={onLineWidthChange}
          />
        );
      }
      return null;
    })()}

    <NeutralSubdueButton
      variant='outline'
      size='lg'
      leadingIcon='delete'
      className='w-full'
      onClick={onClear}
    >
      ล้างกระดาน
    </NeutralSubdueButton>
  </aside>
);

const BODY_DIAGRAM_CARD_HEIGHT = 448;
const BODY_DIAGRAM_EXPANDED_HEIGHT = 672;
const BODY_DIAGRAM_EXPANDED_MIN_HEIGHT = 360;
const BODY_DIAGRAM_EXPANDED_VIEW_OFFSET = 48;

const BodyDiagramExpandedPopup = ({
  open,
  onClose,
  title,
  viewKey,
  onViewChange,
  markers,
  drawings,
  visibleViewKeys,
  showMarkerNotes,
}) => {
  const diagramAreaRef = useRef(null);
  const [diagramHeight, setDiagramHeight] = useState(BODY_DIAGRAM_EXPANDED_HEIGHT);
  const expandedFigureWidth = Math.max(
    160,
    BODY_DIAGRAM_FIGURE_WIDTH * (diagramHeight / BODY_DIAGRAM_EXPANDED_HEIGHT),
  );
  const viewport = useBodyDiagramViewport({ contentHeight: diagramHeight });
  const centerContentRef = useRef(viewport.centerContent);
  centerContentRef.current = viewport.centerContent;

  useLayoutEffect(() => {
    if (!open) return undefined;
    const el = diagramAreaRef.current;
    if (!el) return undefined;
    const measure = () => {
      const next = Math.max(
        BODY_DIAGRAM_EXPANDED_MIN_HEIGHT,
        Math.floor(el.clientHeight - BODY_DIAGRAM_EXPANDED_VIEW_OFFSET),
      );
      setDiagramHeight((prev) => (prev === next ? prev : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const id = requestAnimationFrame(() => centerContentRef.current({ animate: false }));
    return () => cancelAnimationFrame(id);
  }, [diagramHeight, open, viewKey]);

  return (
    <Popup
      open={open}
      onClose={onClose}
      title={title}
      subtitle='คลิกที่จุดต่างๆ บนร่างกายเพื่อบันทึกผลการตรวจเฉพาะที่'
      size='extraLarge'
      bodyScrollable={false}
      bodyOuterStyle={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
      bodyStyle={{
        padding: 'var(--dim-space-0)',
        paddingTop: 'var(--dim-space-0)',
        marginTop: 'var(--dim-space-0)',
        gap: 'var(--dim-space-0)',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
      }}
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
      primaryAction={{ label: 'ปิด', onClick: onClose }}
    >
      <div
        className='flex flex-1 min-h-0 min-w-0 flex-col'
        style={{
          paddingLeft: 'var(--dim-space-600)',
          paddingRight: 'var(--dim-space-600)',
        }}
      >
        <div
          ref={diagramAreaRef}
          className='relative flex flex-1 min-h-0 min-w-0 flex-col items-center'
          style={{
            boxSizing: 'border-box',
            paddingTop: BODY_DIAGRAM_EXPANDED_VIEW_OFFSET,
          }}
        >
          <div
            className='absolute left-0 top-0 flex w-full shrink-0 items-center'
            style={{ height: 40 }}
          >
            <BodyViewSelector
              viewKey={viewKey}
              onViewChange={onViewChange}
              visibleViewKeys={visibleViewKeys}
              tabBarStyle={{ background: 'var(--surface-tabpill-background, #E2F3EB)' }}
            />
          </div>
          <BodyDiagramInteractiveViewport
            viewportRef={viewport.viewportRef}
            contentRef={viewport.contentRef}
            viewportProps={viewport.viewportProps}
            viewportStyle={viewport.viewportStyle}
            contentStyle={viewport.contentStyle}
            height={diagramHeight}
            className='w-full min-h-0'
          >
            <BodyImageGroup
              viewKey={viewKey}
              markers={markers}
              drawings={drawings}
              showMarkerNotes={showMarkerNotes}
              height={diagramHeight}
              figureGap='var(--dim-space-1600, 64px)'
              figureWidth={expandedFigureWidth}
            />
          </BodyDiagramInteractiveViewport>
          <BodyDiagramZoomRail
            className='absolute right-0 bottom-[var(--dim-space-600)]'
            onZoomIn={viewport.zoomIn}
            onZoomOut={viewport.zoomOut}
            canZoomIn={viewport.canZoomIn}
            canZoomOut={viewport.canZoomOut}
            onPan={viewport.togglePanMode}
            panActive={viewport.panMode}
          />
        </div>
      </div>
    </Popup>
  );
};

/* Embedded diagram card — Figma 150:36340 */
export const BodyDiagramCard = ({
  viewKey,
  onViewChange,
  markers = [],
  drawings = [],
  visibleViewKeys,
  showMarkerNotes = false,
  expandedTitle = 'บันทึกร่างกาย',
  onSaveClick,
  embedded = false,
  /* Figma 150:36340 — bordered diagram shell inside BodyDiagramPanel
     (vertical padding only; no horizontal gutter). */
  framed = false,
  className = '',
}) => {
  const [expandedOpen, setExpandedOpen] = useState(false);
  const viewport = useBodyDiagramViewport({ contentHeight: BODY_DIAGRAM_CARD_HEIGHT });
  const centerContentRef = useRef(viewport.centerContent);
  centerContentRef.current = viewport.centerContent;

  useEffect(() => {
    const id = requestAnimationFrame(() => centerContentRef.current({ animate: true }));
    return () => cancelAnimationFrame(id);
  }, [viewKey]);

  return (
    <div
      className={`flex min-w-0 flex-1 flex-col items-center justify-center ${className}`}
      style={{
        gap: 'var(--dim-space-400)',
        ...(framed
          ? {
              padding: 'var(--dim-space-600) var(--dim-space-600) var(--dim-space-600) 0',
              borderRadius: 'var(--dim-radius-400)',
              border: 'var(--dim-stroke-100) solid var(--border-neutral-tertiary)',
              background: 'var(--background-screen-default, #fff)',
            }
          : embedded
            ? {
                padding: 0,
                borderRadius: 0,
                border: 'none',
                background: 'transparent',
              }
            : {
                padding: 'var(--dim-space-600)',
                borderRadius: 'var(--dim-radius-400)',
                border: 'var(--dim-stroke-100) solid var(--border-neutral-tertiary)',
                background: 'var(--background-screen-default, #fff)',
              }),
      }}
    >
      <BodyViewSelector
        viewKey={viewKey}
        onViewChange={onViewChange}
        visibleViewKeys={visibleViewKeys}
        tabBarStyle={{ background: 'var(--surface-tabpill-background, #E2F3EB)' }}
      />
      <div
        className='flex w-full shrink-0 items-end justify-center relative'
        style={{ height: BODY_DIAGRAM_CARD_HEIGHT }}
      >
        <div className='flex flex-1 min-w-0 h-full min-h-0 items-center justify-center'>
          <BodyDiagramInteractiveViewport
            viewportRef={viewport.viewportRef}
            contentRef={viewport.contentRef}
            viewportProps={viewport.viewportProps}
            viewportStyle={viewport.viewportStyle}
            contentStyle={viewport.contentStyle}
            height={BODY_DIAGRAM_CARD_HEIGHT}
            className='w-full h-full'
          >
            <BodyImageGroup
              viewKey={viewKey}
              markers={markers}
              drawings={drawings}
              showMarkerNotes={showMarkerNotes}
              height={BODY_DIAGRAM_CARD_HEIGHT}
              figureGap={0}
            />
          </BodyDiagramInteractiveViewport>
        </div>
        <BodyDiagramZoomRail
          onEdit={onSaveClick}
          onZoomIn={viewport.zoomIn}
          onZoomOut={viewport.zoomOut}
          canZoomIn={viewport.canZoomIn}
          canZoomOut={viewport.canZoomOut}
          onPan={viewport.togglePanMode}
          panActive={viewport.panMode}
          onExpand={() => setExpandedOpen(true)}
        />
      </div>
      <BodyDiagramExpandedPopup
        open={expandedOpen}
        onClose={() => setExpandedOpen(false)}
        title={expandedTitle}
        viewKey={viewKey}
        onViewChange={onViewChange}
        markers={markers}
        drawings={drawings}
        visibleViewKeys={visibleViewKeys}
        showMarkerNotes={showMarkerNotes}
      />
    </div>
  );
};

const createMarkerId = () => `marker-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const BODY_DRAWING_CANVAS_HEIGHT = 672;
const BODY_DRAWING_CANVAS_MIN_HEIGHT = 400;
/** Matches overlay row reserve (Figma Tools pt 48 / space-1200). */
const BODY_DRAWING_CANVAS_OVERLAY_TOP = 48;

/* Modal drawing canvas — Figma 75:34452 */
const BodyDrawingCanvas = ({
  viewKey,
  onViewChange,
  markers: markersProp = [],
  onMarkersChange,
  /* Drawings (pen / text / circle / square / arrow) — optional per-tab
     persistence. When the parent passes `drawings` + `onDrawingsChange`
     the canvas mirrors them out so switching exam-system tabs in
     BodyDiagramPanel keeps each system's strokes intact. If the props
     are omitted, drawings stay local (legacy popup-session behaviour). */
  drawings: drawingsProp,
  onDrawingsChange,
  onDirtyChange,
  fillHeight = false,
}) => {
  const canvasAreaRef = useRef(null);
  const [canvasHeight, setCanvasHeight] = useState(BODY_DRAWING_CANVAS_HEIGHT);

  useLayoutEffect(() => {
    if (!fillHeight) {
      setCanvasHeight(BODY_DRAWING_CANVAS_HEIGHT);
      return undefined;
    }
    const el = canvasAreaRef.current;
    if (!el) return undefined;
    const measure = () => {
      const next = Math.max(
        BODY_DRAWING_CANVAS_MIN_HEIGHT,
        Math.floor(el.clientHeight - BODY_DRAWING_CANVAS_OVERLAY_TOP),
      );
      setCanvasHeight((prev) => (prev === next ? prev : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fillHeight]);

  const viewport = useBodyDiagramViewport({ contentHeight: canvasHeight });
  /* Default to the cursor / pointer tool — opens in hover-only mode so
     the user can inspect existing marks without accidentally dropping
     a new one. Switching to "มาร์คจุด" arms placement. */
  const [activeTool, setActiveTool] = useState('cursor');
  const [activeColor, setActiveColor] = useState(MARK_DOT_DEFAULT_COLOR);
  const [brushSize, setBrushSize] = useState(5);
  const [lineWidth, setLineWidth] = useState(5);
  /* Text-tool slider — Figma 266:28925 shows ขนาดตัวหนังสือ in place
     of brush / line width when the text tool is active. Default 14
     mirrors the previous hardcoded value used in commitTextPlacement. */
  const [fontSize, setFontSize] = useState(14);
  const [markers, setMarkers] = useState(markersProp);
  const [drawings, setDrawings] = useState(drawingsProp ?? []);
  const [selectedMarkerId, setSelectedMarkerId] = useState(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState(null);
  const [markerEditBaseline, setMarkerEditBaseline] = useState('');
  const [historyIndex, setHistoryIndex] = useState(0);
  const noteInputRef = useRef(null);
  const markersRef = useRef(markers);
  const drawingsRef = useRef(drawings);
  const selectedMarkerIdRef = useRef(selectedMarkerId);
  const selectedDrawingIdRef = useRef(selectedDrawingId);
  const editingTextIdRef = useRef(null);
  const stackOrderRef = useRef(0);
  const historyRef = useRef([{ markers: cloneMarkers(markersProp), drawings: [] }]);
  const allocateStackOrder = useCallback(() => {
    stackOrderRef.current += 1;
    return stackOrderRef.current;
  }, []);
  markersRef.current = markers;
  drawingsRef.current = drawings;
  selectedMarkerIdRef.current = selectedMarkerId;
  selectedDrawingIdRef.current = selectedDrawingId;

  /* Baseline markers snapshot — captured ONCE on mount. Do NOT update
     on subsequent markersProp changes: the popup mirrors our markers
     back as markersProp, so refreshing baseline on every prop change
     would track the live state and dirty would never fire. The popup
     remounts this component on open, which is when the baseline
     should reset. */
  const baselineMarkersRef = useRef(cloneMarkers(markersProp));
  useEffect(() => {
    setMarkers(markersProp);
  }, [markersProp]);

  /* Sync drawings from the parent when the prop changes (e.g. tab
     switch in BodyDiagramPanel) — same pattern as markersProp above.
     Skipped when `drawingsProp` is undefined (legacy popup-session
     mode where drawings stay purely local). */
  useEffect(() => {
    if (drawingsProp === undefined) return;
    setDrawings(drawingsProp);
    drawingsRef.current = drawingsProp;
  }, [drawingsProp]);

  /* Dirty = current markers differ from the baseline OR any drawing
     has been added. Comparing the live state (not historyIndex) lets
     us flag every user action — placing a mark, typing a note,
     drawing, erasing, etc. — even before the per-marker Save / next
     commitHistory tick runs. Stays clean automatically if the user
     undoes back to the original state. */
  useEffect(() => {
    const baseline = baselineMarkersRef.current ?? [];
    const sameMarkers = markers === baseline || (
      markers.length === baseline.length
      && markers.every((m, i) => {
        const o = baseline[i];
        return o
          && o.id === m.id
          && o.note === m.note
          && o.color === m.color
          && o.saved === m.saved
          && o.leftPercent === m.leftPercent
          && o.topPercent === m.topPercent
          && o.side === m.side;
      })
    );
    onDirtyChange?.(!sameMarkers || drawings.length > 0);
  }, [markers, drawings, onDirtyChange]);

  const applySnapshot = useCallback((snap) => {
    setMarkers(snap.markers);
    setDrawings(snap.drawings);
    onMarkersChange?.(snap.markers);
    onDrawingsChange?.(snap.drawings);
  }, [onMarkersChange, onDrawingsChange]);

  const commitHistory = useCallback(() => {
    const snap = {
      markers: cloneMarkers(markersRef.current),
      drawings: cloneDrawings(drawingsRef.current),
    };
    setHistoryIndex((idx) => {
      const trimmed = historyRef.current.slice(0, idx + 1);
      trimmed.push(snap);
      historyRef.current = trimmed;
      return trimmed.length - 1;
    });
  }, []);

  const handleUndo = useCallback(() => {
    setHistoryIndex((idx) => {
      if (idx <= 0) return idx;
      const nextIdx = idx - 1;
      applySnapshot(historyRef.current[nextIdx]);
      return nextIdx;
    });
  }, [applySnapshot]);

  const handleRedo = useCallback(() => {
    setHistoryIndex((idx) => {
      if (idx >= historyRef.current.length - 1) return idx;
      const nextIdx = idx + 1;
      applySnapshot(historyRef.current[nextIdx]);
      return nextIdx;
    });
  }, [applySnapshot]);

  const handleToolChange = useCallback((tool) => {
    if (viewport.panMode) viewport.togglePanMode();
    /* Clicking the already-active tool toggles it OFF — falls back to
       the cursor (mouse pointer) tool, the safe inspect-only mode.
       Cursor itself isn't toggleable: clicking it while active is a
       no-op (otherwise we'd have no active tool at all). */
    const next = (tool === activeTool && tool !== 'cursor') ? 'cursor' : tool;
    setActiveTool(next);
    /* Both selection tools (markpoint + cursor) need a live selection
       to drive marker hover / edit popovers — only clear when moving
       to a drawing tool. */
    if (next !== 'select' && next !== 'cursor') {
      setSelectedMarkerId(null);
      setSelectedDrawingId(null);
    }
  }, [viewport, activeTool]);

  /* Hand tool ↔ draw tools are mutually exclusive: entering pan mode
     clears any selected marker/drawing so the sidebar shows no tool
     focused, and pressing a draw tool exits pan mode. */
  const handlePanToggle = useCallback(() => {
    setSelectedMarkerId(null);
    setSelectedDrawingId(null);
    viewport.togglePanMode();
  }, [viewport]);

  const handleAddDrawing = useCallback((item) => {
    /* Tag the drawing with the active view tab (both / front / back
       / sides / left / right). The render layer filters drawings by
       this field so strokes made on one view don't bleed onto a
       different view — board coordinates only make sense on the
       view they were created on. */
    const withOrder = {
      ...item,
      stackOrder: item.stackOrder ?? allocateStackOrder(),
      viewKey: item.viewKey ?? viewKey,
    };
    setDrawings((prev) => {
      const next = [...prev, withOrder];
      drawingsRef.current = next;
      onDrawingsChange?.(next);
      queueMicrotask(() => commitHistory());
      return next;
    });
  }, [allocateStackOrder, commitHistory, onDrawingsChange, viewKey]);

  const handleRemoveDrawings = useCallback((ids) => {
    setDrawings((prev) => {
      const next = prev.filter((d) => !ids.includes(d.id));
      drawingsRef.current = next;
      onDrawingsChange?.(next);
      queueMicrotask(() => commitHistory());
      return next;
    });
  }, [commitHistory, onDrawingsChange]);

  const handleUpdateDrawing = useCallback((id, patch, shouldCommit = true) => {
    setDrawings((prev) => {
      const next = prev.map((d) => (d.id === id ? { ...d, ...patch } : d));
      drawingsRef.current = next;
      onDrawingsChange?.(next);
      if (shouldCommit) queueMicrotask(() => commitHistory());
      return next;
    });
  }, [commitHistory, onDrawingsChange]);

  const handleUpdateMarker = useCallback((id, patch, shouldCommit = true) => {
    setMarkers((prev) => {
      const next = prev.map((m) => (m.id === id ? { ...m, ...patch } : m));
      markersRef.current = next;
      onMarkersChange?.(next);
      if (shouldCommit) queueMicrotask(() => commitHistory());
      return next;
    });
  }, [commitHistory, onMarkersChange]);

  const handleRemoveMarker = useCallback((id) => {
    setMarkers((prev) => {
      const next = prev.filter((m) => m.id !== id);
      markersRef.current = next;
      onMarkersChange?.(next);
      queueMicrotask(() => commitHistory());
      return next;
    });
    /* If the removed marker was the active selection, the
       selection state would otherwise stale-point to a non-existent
       id — and handleSelectPointerDown's `if (selectedMarkerId)`
       branch would then swallow the next canvas click as a dismiss
       instead of placing a new marker. Clear it explicitly here. */
    if (selectedMarkerIdRef.current === id) {
      selectedMarkerIdRef.current = null;
      setSelectedMarkerId(null);
    }
  }, [commitHistory, onMarkersChange]);

  const handleDrawingSelect = useCallback((id) => {
    setSelectedDrawingId(id);
    selectedDrawingIdRef.current = id;
    if (id) {
      setSelectedMarkerId(null);
      selectedMarkerIdRef.current = null;
      const drawing = drawingsRef.current.find((d) => d.id === id);
      if (drawing?.color) setActiveColor(drawing.color);
    }
  }, []);

  /* Sidebar slider override — when the pointer tool has a drawing
     selected, the slider drives the drawing's size field instead of
     the per-tool defaults. Field maps: pen→width, shapes/arrow→
     strokeWidth, text→fontSize. Also keeps the matching tool-default
     state in sync so picking that tool next inherits the value. */
  const selectedDrawing = useMemo(
    () => (selectedDrawingId ? drawings.find((d) => d.id === selectedDrawingId) : null) ?? null,
    [drawings, selectedDrawingId],
  );

  const handleSelectedDrawingSizeChange = useCallback((nextSize) => {
    const id = selectedDrawingIdRef.current;
    if (!id) return;
    const drawing = drawingsRef.current.find((d) => d.id === id);
    if (!drawing) return;
    if (drawing.type === 'pen') {
      handleUpdateDrawing(id, { width: nextSize });
      setBrushSize(nextSize);
    } else if (drawing.type === 'text') {
      handleUpdateDrawing(id, { fontSize: nextSize });
      setFontSize(nextSize);
    } else if (drawing.type === 'circle' || drawing.type === 'square' || drawing.type === 'arrow') {
      handleUpdateDrawing(id, { strokeWidth: nextSize });
      setLineWidth(nextSize);
    }
  }, [handleUpdateDrawing]);

  const handleDragCommit = useCallback(() => {
    commitHistory();
  }, [commitHistory]);

  const centerContentRef = useRef(viewport.centerContent);
  centerContentRef.current = viewport.centerContent;

  useEffect(() => {
    const id = requestAnimationFrame(() => centerContentRef.current({ animate: true }));
    return () => cancelAnimationFrame(id);
  }, [viewKey]);

  useEffect(() => {
    if (!fillHeight) return undefined;
    const id = requestAnimationFrame(() => centerContentRef.current({ animate: false }));
    return () => cancelAnimationFrame(id);
  }, [fillHeight, canvasHeight]);

  const updateMarkers = useCallback((next) => {
    setMarkers(next);
    onMarkersChange?.(next);
  }, [onMarkersChange]);

  /* Mirror baseline + saved-state into refs so handleMarkerDismiss (a
     stable useCallback) can read them synchronously when deciding
     whether an outside click is allowed to close the editor. */
  const markerEditBaselineRef = useRef('');
  const editOpenedSavedRef = useRef(false);
  useEffect(() => {
    if (!selectedMarkerId) {
      setMarkerEditBaseline('');
      markerEditBaselineRef.current = '';
      editOpenedSavedRef.current = false;
      return;
    }
    const marker = markersRef.current.find((m) => m.id === selectedMarkerId);
    const baseline = marker?.note ?? '';
    setMarkerEditBaseline(baseline);
    markerEditBaselineRef.current = baseline;
    editOpenedSavedRef.current = marker?.saved === true;
  }, [selectedMarkerId]);

  useEffect(() => {
    if (!selectedMarkerId) return undefined;
    const t = window.setTimeout(() => {
      const el = noteInputRef.current;
      el?.focus?.();
      el?.select?.();
    }, 0);
    return () => window.clearTimeout(t);
  }, [selectedMarkerId]);

  /* Dismiss only deselects — every placed marker persists until the
     user explicitly deletes it. While the note textarea (MarkNoteEditor)
     is open — i.e. a fresh marker with no note yet, or a saved marker
     escalated to forceEditMode — outside-click / body-click dismiss is
     refused. The Save button is the only way to close the editor in
     that state. The read-only MarkNoteViewer still dismisses normally. */
  /* Selected marker always shows the textarea editor. Default rule:
     the Save button is the only path that closes the editor —
     outside-click / body-click dismiss is refused while a marker is
     selected. Exception: when the user opened the editor on an
     already-saved marker (via the popover's Edit button) and hasn't
     changed the note yet, clicking outside is treated as a
     no-op cancel and dismisses without modifying the saved note. */
  const handleMarkerDismiss = useCallback(() => {
    const currentId = selectedMarkerIdRef.current;
    if (currentId) {
      const marker = markersRef.current.find((m) => m.id === currentId);
      const currentNote = (marker?.note ?? '').trim();
      const baseline = markerEditBaselineRef.current.trim();
      const wasSaved = editOpenedSavedRef.current;
      const unchanged = wasSaved && currentNote === baseline;
      if (!unchanged) return;
    }
    setSelectedMarkerId(null);
    selectedMarkerIdRef.current = null;
  }, []);

  const handleMarkerSave = useCallback(() => {
    const currentId = selectedMarkerIdRef.current;
    if (!currentId) return;
    setMarkers((prev) => {
      const next = prev.map((m) => (
        m.id === currentId ? { ...m, saved: true } : m
      ));
      onMarkersChange?.(next);
      return next;
    });
    setSelectedMarkerId(null);
    commitHistory();
  }, [onMarkersChange, commitHistory]);

  useEffect(() => {
    if (!selectedMarkerId) return undefined;
    const handlePointerDown = (event) => {
      if (event.target.closest('[data-mark-note-editor]')) return;
      if (event.target.closest('.mih-search-popover')) return;
      if (event.target.closest('[data-body-mark-button]')) return;
      if (event.target.closest('[data-body-figure]')) return;
      if (event.target.closest('[data-body-selection-capture]')) return;
      if (event.target.closest('[data-drawing-tool-sidebar]')) return;
      handleMarkerDismiss();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [selectedMarkerId, handleMarkerDismiss]);

  const handlePlaceMarker = useCallback((side, leftPercent, topPercent) => {
    if (activeTool !== 'select') return;
    const id = createMarkerId();
    updateMarkers([
      ...markersRef.current,
      {
        id,
        side,
        viewKey,
        leftPercent,
        topPercent,
        note: '',
        color: activeColor,
        saved: false,
        stackOrder: allocateStackOrder(),
      },
    ]);
    selectedMarkerIdRef.current = id;
    setSelectedMarkerId(id);
  }, [activeTool, activeColor, allocateStackOrder, updateMarkers, viewKey]);

  const handleTextEditStart = useCallback(({ id, color }) => {
    editingTextIdRef.current = id;
    setSelectedMarkerId(null);
    selectedMarkerIdRef.current = null;
    if (color) setActiveColor(color);
  }, []);

  const handleTextEditEnd = useCallback(() => {
    editingTextIdRef.current = null;
  }, []);

  const handleColorChange = useCallback((nextColor) => {
    setActiveColor(nextColor);
    /* In-flight text placement: the color picker doubles as the text
       color for the input being typed — don't recolor saved markers /
       drawings in that mode. */
    const textId = editingTextIdRef.current;
    if (textId) return;
    /* Recolor whichever selection currently has focus. The pointer-tool
       lets the user click any drawing (rect / circle / arrow / pen /
       text) — picking a new swatch then repaints that drawing in
       place. Falls through to marker recolor when a marker is focused. */
    const drawingId = selectedDrawingIdRef.current;
    if (drawingId) {
      setDrawings((prev) => {
        const next = prev.map((d) => (
          d.id === drawingId ? { ...d, color: nextColor } : d
        ));
        drawingsRef.current = next;
        onDrawingsChange?.(next);
        queueMicrotask(() => commitHistory());
        return next;
      });
      return;
    }
    const focusedId = selectedMarkerIdRef.current;
    if (!focusedId) return;
    setMarkers((prev) => {
      const next = prev.map((m) => (
        m.id === focusedId ? { ...m, color: nextColor } : m
      ));
      markersRef.current = next;
      onMarkersChange?.(next);
      return next;
    });
  }, [onMarkersChange, commitHistory, onDrawingsChange]);

  const handleMarkerSelect = useCallback((id) => {
    selectedMarkerIdRef.current = id;
    setSelectedMarkerId(id);
    setSelectedDrawingId(null);
    selectedDrawingIdRef.current = null;
    const marker = markersRef.current.find((m) => m.id === id);
    if (marker?.color) setActiveColor(marker.color);
  }, []);

  /* Explicit "open editor for this marker" — fired by the popover's
     edit button. In cursor mode the editor is suppressed (so the
     selection frame can drag the dot), so requesting an edit here
     escalates the tool back to 'select' (markpoint) which removes
     the cursor-mode mask and lets MarkNoteEditor mount. */
  const handleMarkerEdit = useCallback((id) => {
    if (activeTool === 'cursor') setActiveTool('select');
    selectedMarkerIdRef.current = id;
    setSelectedMarkerId(id);
    setSelectedDrawingId(null);
    selectedDrawingIdRef.current = null;
    const marker = markersRef.current.find((m) => m.id === id);
    if (marker?.color) setActiveColor(marker.color);
  }, [activeTool]);

  const handleMarkerNoteChange = useCallback((id, note) => {
    setMarkers((prev) => {
      const next = prev.map((m) => (m.id === id ? { ...m, note } : m));
      markersRef.current = next;
      onMarkersChange?.(next);
      return next;
    });
  }, [onMarkersChange]);

  const handleClear = useCallback(() => {
    updateMarkers([]);
    setDrawings([]);
    drawingsRef.current = [];
    onDrawingsChange?.([]);
    setSelectedMarkerId(null);
    commitHistory();
  }, [updateMarkers, commitHistory, onDrawingsChange]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyRef.current.length - 1;

  const zoomToolbar = {
    percent: viewport.percent,
    onZoomIn: viewport.zoomIn,
    onZoomOut: viewport.zoomOut,
    canZoomIn: viewport.canZoomIn,
    canZoomOut: viewport.canZoomOut,
    onPan: handlePanToggle,
    panActive: viewport.panMode,
    onUndo: handleUndo,
    onRedo: handleRedo,
    canUndo,
    canRedo,
  };

  const panActive = viewport.panMode || viewport.spacePan;
  const sidebarActiveTool = viewport.panMode ? null : activeTool;

  const markingProps = {
    interactive: true,
    canPlaceMarkers: activeTool === 'select' && !panActive,
    panActive,
    activeTool,
    activeColor,
    brushSize,
    lineWidth,
    fontSize,
    drawings,
    onAddDrawing: handleAddDrawing,
    onUpdateDrawing: handleUpdateDrawing,
    onUpdateMarker: handleUpdateMarker,
    onRemoveDrawings: handleRemoveDrawings,
    onRemoveMarker: handleRemoveMarker,
    onTextEditStart: handleTextEditStart,
    onTextEditEnd: handleTextEditEnd,
    onDragCommit: handleDragCommit,
    selectedMarkerId,
    selectedDrawingId,
    onMarkerSelect: handleMarkerSelect,
    onMarkerEdit: handleMarkerEdit,
    onDrawingSelect: handleDrawingSelect,
    onMarkerDismiss: handleMarkerDismiss,
    onPlaceMarker: handlePlaceMarker,
    onMarkerNoteChange: handleMarkerNoteChange,
    onMarkerSave: handleMarkerSave,
    /* Cancel button — discards every change made in this editor
       session and closes. Figma 267:31507 contract:
         • new marker (never saved) → remove it entirely (the placement
           was effectively rolled back)
         • existing saved marker → restore the note to its baseline so
           nothing in the data model is mutated by the cancelled edit */
    onMarkerCancel: () => {
      const currentId = selectedMarkerIdRef.current;
      if (currentId) {
        const marker = markersRef.current.find((m) => m.id === currentId);
        if (marker) {
          if (marker.saved === true) {
            const baseline = markerEditBaselineRef.current;
            if ((marker.note ?? '') !== baseline) {
              const next = markersRef.current.map((m) => (
                m.id === currentId ? { ...m, note: baseline } : m
              ));
              markersRef.current = next;
              setMarkers(next);
              onMarkersChange?.(next);
            }
          } else {
            handleRemoveMarker(currentId);
          }
        }
      }
      setSelectedMarkerId(null);
      selectedMarkerIdRef.current = null;
    },
    /* Delete button — remove the marker entirely from the canvas. */
    onMarkerDelete: (id) => {
      handleRemoveMarker(id);
      setSelectedMarkerId(null);
      selectedMarkerIdRef.current = null;
    },
    markerEditBaseline,
    noteInputRef,
  };

  return (
    <div
      className={`flex w-full min-w-0 bg-[var(--surface-card-100,#fff)] ${fillHeight ? 'h-full min-h-0 flex-1' : 'items-start'}`}
      style={{ gap: 'var(--dim-space-600)' }}
    >
      <div
        ref={canvasAreaRef}
        className='relative flex min-h-0 min-w-0 flex-1 flex-col'
        style={{
          gap: 'var(--dim-space-600)',
          paddingTop: 'var(--dim-space-1200, 48px)',
        }}
      >
        <DrawingCanvasOverlayBar viewKey={viewKey} onViewChange={onViewChange} zoom={zoomToolbar} />
        <BodyDiagramInteractiveViewport
          viewportRef={viewport.viewportRef}
          contentRef={viewport.contentRef}
          viewportProps={viewport.viewportProps}
          viewportStyle={viewport.viewportStyle}
          contentStyle={viewport.contentStyle}
          height={canvasHeight}
          className={`w-full min-h-0 ${fillHeight ? 'flex-1' : ''}`}
        >
          <BodyImageGroup
            viewKey={viewKey}
            markers={markers}
            height={canvasHeight}
            figureGap='var(--dim-space-1600, 64px)'
            /* No max-width — the figures stay centered at their natural
               294 px width via flex justify-center, but the surrounding
               drawing capture + marker hit-area extends the full canvas
               (between the left and right tool sidebars) so the user
               can pen / text / mark anywhere on the board. */
            className='mx-auto w-full bg-[var(--surface-card-100,#fff)]'
            {...markingProps}
          />
        </BodyDiagramInteractiveViewport>
      </div>

      <DrawingToolSidebar
        fillHeight={fillHeight}
        activeTool={sidebarActiveTool}
        onToolChange={handleToolChange}
        activeColor={activeColor}
        onColorChange={handleColorChange}
        brushSize={brushSize}
        onBrushSizeChange={setBrushSize}
        lineWidth={lineWidth}
        onLineWidthChange={setLineWidth}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        selectedDrawing={selectedDrawing}
        onSelectedDrawingSizeChange={handleSelectedDrawingSizeChange}
        onClear={handleClear}
      />
    </div>
  );
};

export default BodyDrawingCanvas;
