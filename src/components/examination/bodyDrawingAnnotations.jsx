import React from 'react';

export const createDrawingId = () => `draw-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const cloneMarkers = (markers = []) => markers.map((m) => ({ ...m }));

export const cloneDrawings = (drawings = []) => drawings.map((d) => ({
  ...d,
  points: d.points?.map((p) => ({ ...p })),
}));

export const isDrawingTool = (tool) =>
  tool && tool !== 'select' && tool !== 'cursor';

export const getDrawToolCursor = (tool) => {
  switch (tool) {
    case 'pen':
    case 'circle':
    case 'square':
    case 'arrow':
      return 'crosshair';
    case 'eraser':
      return 'cell';
    case 'text':
      return 'text';
    case 'select':
    case 'cursor':
    default:
      return 'default';
  }
};

const percentToPixel = (leftPercent, topPercent, layout) => ({
  x: layout.offsetX + (leftPercent / 100) * layout.width,
  y: layout.offsetY + (topPercent / 100) * layout.height,
});

const pixelToPercent = (x, y, layout) => {
  if (!layout.width || !layout.height) {
    return { leftPercent: 0, topPercent: 0 };
  }
  return {
    leftPercent: ((x - layout.offsetX) / layout.width) * 100,
    topPercent: ((y - layout.offsetY) / layout.height) * 100,
  };
};

export const pointerToFigurePercent = (clientX, clientY, rect, layout) => {
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  return pixelToPercent(x, y, layout);
};

/** Percent within a board container (full BodyImageGroup — not per-figure letterbox). */
export const pointerToBoardPercent = (clientX, clientY, rect) => {
  if (!rect.width || !rect.height) return null;
  return {
    leftPercent: ((clientX - rect.left) / rect.width) * 100,
    topPercent: ((clientY - rect.top) / rect.height) * 100,
  };
};

export const createBoardLayout = (width, height) => ({
  offsetX: 0,
  offsetY: 0,
  width,
  height,
});

/** Smooth SVG path (quadratic midpoints) for pen strokes. */
export const buildPenPathD = (points, layout) => {
  if (!points?.length || !layout?.width || !layout?.height) return '';

  const pts = points.map((p) => percentToPixel(p.leftPercent, p.topPercent, layout));
  if (pts.length === 1) {
    const { x, y } = pts[0];
    return `M ${x} ${y} L ${x + 0.01} ${y}`;
  }
  if (pts.length === 2) {
    return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  }

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i += 1) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q ${pts[i].x} ${pts[i].y} ${mx} ${my}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
};

export const getCoalescedPointerEvents = (event) => (
  typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [event]
);

/** Append board points from one or more pointer events; returns true if points changed. */
export const appendPenStrokePoints = (points, events, rect, minPx = 2) => {
  if (!rect?.width || !rect?.height) return false;
  const layout = createBoardLayout(rect.width, rect.height);
  let changed = false;

  events.forEach((ev) => {
    const point = pointerToBoardPercent(ev.clientX, ev.clientY, rect);
    if (!point) return;
    const last = points[points.length - 1];
    if (last) {
      const a = percentToPixel(last.leftPercent, last.topPercent, layout);
      const b = percentToPixel(point.leftPercent, point.topPercent, layout);
      if (Math.hypot(a.x - b.x, a.y - b.y) < minPx) return;
    }
    points.push(point);
    changed = true;
  });

  return changed;
};

const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

/** Pixel bounds for a text annotation (for hit-testing and eraser). */
export const getTextDrawingBounds = (drawing, layout) => {
  const fontSize = drawing.fontSize ?? 14;
  const p = percentToPixel(drawing.leftPercent, drawing.topPercent, layout);
  const text = String(drawing.text ?? '');
  const width = Math.max(48, text.length * fontSize * 0.55);
  const height = fontSize * 1.35;
  return {
    minX: p.x - 4,
    minY: p.y - 2,
    maxX: p.x + width,
    maxY: p.y + height,
  };
};

/** Topmost text drawing under a board pixel (for click-to-edit). */
export const findTextDrawingAtPoint = (drawings, px, py, layout, padding = 8) => {
  if (!layout?.width || !layout?.height) return null;
  for (let i = drawings.length - 1; i >= 0; i -= 1) {
    const d = drawings[i];
    if (d.type !== 'text') continue;
    const { minX, minY, maxX, maxY } = getTextDrawingBounds(d, layout);
    if (
      px >= minX - padding
      && px <= maxX + padding
      && py >= minY - padding
      && py <= maxY + padding
    ) {
      return d;
    }
  }
  return null;
};

const distPointToSegment = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return dist(px, py, ax, ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return dist(px, py, ax + t * dx, ay + t * dy);
};

/** Pixel bounding box for ANY drawing type. Used by the selection
    overlay to render a Figma-style frame with corner handles + a
    size readout. Stroke width is half-padded on each side so the
    frame visually contains the stroke, not just its centerline. */
export const getDrawingBounds = (drawing, layout) => {
  if (!drawing || !layout?.width || !layout?.height) return null;
  const pad = Math.max(2, (drawing.strokeWidth ?? drawing.lineWidth ?? drawing.brushSize ?? 0) / 2);

  if (drawing.type === 'pen' && drawing.points?.length) {
    const pts = drawing.points.map((p) => percentToPixel(p.leftPercent, p.topPercent, layout));
    let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
    pts.forEach(({ x, y }) => {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }

  if (drawing.type === 'circle' || drawing.type === 'square') {
    const a = percentToPixel(drawing.leftPercent, drawing.topPercent, layout);
    const b = percentToPixel(
      drawing.leftPercent + drawing.widthPercent,
      drawing.topPercent + drawing.heightPercent,
      layout,
    );
    return {
      minX: Math.min(a.x, b.x) - pad,
      minY: Math.min(a.y, b.y) - pad,
      maxX: Math.max(a.x, b.x) + pad,
      maxY: Math.max(a.y, b.y) + pad,
    };
  }

  if (drawing.type === 'arrow') {
    const a = percentToPixel(drawing.x1, drawing.y1, layout);
    const b = percentToPixel(drawing.x2, drawing.y2, layout);
    return {
      minX: Math.min(a.x, b.x) - pad,
      minY: Math.min(a.y, b.y) - pad,
      maxX: Math.max(a.x, b.x) + pad,
      maxY: Math.max(a.y, b.y) + pad,
    };
  }

  if (drawing.type === 'text') {
    return getTextDrawingBounds(drawing, layout);
  }

  return null;
};

export const hitTestDrawing = (drawing, px, py, layout, threshold) => {
  if (!layout.width || !layout.height) return false;

  if (drawing.type === 'pen' && drawing.points?.length) {
    const pts = drawing.points.map((p) => percentToPixel(p.leftPercent, p.topPercent, layout));
    for (let i = 1; i < pts.length; i += 1) {
      if (distPointToSegment(px, py, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y) <= threshold) {
        return true;
      }
    }
    if (pts.length === 1 && dist(px, py, pts[0].x, pts[0].y) <= threshold) return true;
    return false;
  }

  if (drawing.type === 'circle' || drawing.type === 'square') {
    const a = percentToPixel(drawing.leftPercent, drawing.topPercent, layout);
    const b = percentToPixel(
      drawing.leftPercent + drawing.widthPercent,
      drawing.topPercent + drawing.heightPercent,
      layout,
    );
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    if (drawing.type === 'square') {
      return px >= minX - threshold && px <= maxX + threshold
        && py >= minY - threshold && py <= maxY + threshold;
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rx = (maxX - minX) / 2 + threshold;
    const ry = (maxY - minY) / 2 + threshold;
    if (rx <= 0 || ry <= 0) return dist(px, py, cx, cy) <= threshold;
    const nx = (px - cx) / rx;
    const ny = (py - cy) / ry;
    return (nx * nx + ny * ny) <= 1;
  }

  if (drawing.type === 'arrow') {
    const a = percentToPixel(drawing.x1, drawing.y1, layout);
    const b = percentToPixel(drawing.x2, drawing.y2, layout);
    return distPointToSegment(px, py, a.x, a.y, b.x, b.y) <= threshold;
  }

  if (drawing.type === 'text') {
    const { minX, minY, maxX, maxY } = getTextDrawingBounds(drawing, layout);
    return px >= minX - threshold
      && px <= maxX + threshold
      && py >= minY - threshold
      && py <= maxY + threshold;
  }

  return false;
};

const normalizeBox = (a, b) => ({
  leftPercent: Math.min(a.leftPercent, b.leftPercent),
  topPercent: Math.min(a.topPercent, b.topPercent),
  widthPercent: Math.abs(b.leftPercent - a.leftPercent),
  heightPercent: Math.abs(b.topPercent - a.topPercent),
});

/** Base z-index for board annotations — must clear the body figure's
    edit-mode z-bump (30) so markers, drawings, and text never get
    hidden behind the body image when another point is focused. */
export const BOARD_LAYER_BASE_Z = 40;

export const sortByStackOrder = (items = []) => (
  [...items].sort((a, b) => (a.stackOrder ?? 0) - (b.stackOrder ?? 0))
);

export const buildAnnotationLayers = (markers = [], drawings = []) => {
  const layers = [
    ...markers.map((m) => ({ kind: 'marker', id: m.id, stackOrder: m.stackOrder ?? 0, data: m })),
    ...drawings.map((d) => ({ kind: 'drawing', id: d.id, stackOrder: d.stackOrder ?? 0, data: d })),
  ];
  return layers.sort((a, b) => a.stackOrder - b.stackOrder);
};

export const layerZIndex = (stackOrder) => BOARD_LAYER_BASE_Z + (stackOrder ?? 0);

/** Maps one (leftPercent, topPercent) point through the linear
    transform that takes `fromBounds` → `toBounds` (both in board
    pixels). Used by `resizeDrawing` to remap every coordinate the
    drawing owns when the user drags a selection-frame corner. */
const transformPercentPoint = (leftPercent, topPercent, fromBounds, toBounds, layout) => {
  const p = percentToPixel(leftPercent, topPercent, layout);
  const sx = (toBounds.maxX - toBounds.minX) / Math.max(0.0001, fromBounds.maxX - fromBounds.minX);
  const sy = (toBounds.maxY - toBounds.minY) / Math.max(0.0001, fromBounds.maxY - fromBounds.minY);
  return pixelToPercent(
    toBounds.minX + (p.x - fromBounds.minX) * sx,
    toBounds.minY + (p.y - fromBounds.minY) * sy,
    layout,
  );
};

/** Returns a copy of `drawing` whose coordinates have been remapped so
    its bounding box goes from `fromBounds` → `toBounds` (board px).
    Supports every drawing type — pen (per-point), shape (two corners),
    arrow (two endpoints), text (anchor + fontSize scaled by sy). */
export const resizeDrawing = (drawing, fromBounds, toBounds, layout) => {
  if (!drawing || !fromBounds || !toBounds || !layout?.width || !layout?.height) {
    return drawing;
  }
  const sy = (toBounds.maxY - toBounds.minY) / Math.max(0.0001, fromBounds.maxY - fromBounds.minY);

  if (drawing.type === 'pen' && drawing.points?.length) {
    return {
      ...drawing,
      points: drawing.points.map((p) => ({
        ...p,
        ...transformPercentPoint(p.leftPercent, p.topPercent, fromBounds, toBounds, layout),
      })),
    };
  }

  if (drawing.type === 'circle' || drawing.type === 'square') {
    const a = transformPercentPoint(drawing.leftPercent, drawing.topPercent, fromBounds, toBounds, layout);
    const b = transformPercentPoint(
      drawing.leftPercent + drawing.widthPercent,
      drawing.topPercent + drawing.heightPercent,
      fromBounds,
      toBounds,
      layout,
    );
    return {
      ...drawing,
      leftPercent: Math.min(a.leftPercent, b.leftPercent),
      topPercent: Math.min(a.topPercent, b.topPercent),
      widthPercent: Math.abs(b.leftPercent - a.leftPercent),
      heightPercent: Math.abs(b.topPercent - a.topPercent),
    };
  }

  if (drawing.type === 'arrow') {
    const a = transformPercentPoint(drawing.x1, drawing.y1, fromBounds, toBounds, layout);
    const b = transformPercentPoint(drawing.x2, drawing.y2, fromBounds, toBounds, layout);
    return { ...drawing, x1: a.leftPercent, y1: a.topPercent, x2: b.leftPercent, y2: b.topPercent };
  }

  if (drawing.type === 'text') {
    const a = transformPercentPoint(drawing.leftPercent, drawing.topPercent, fromBounds, toBounds, layout);
    return {
      ...drawing,
      leftPercent: a.leftPercent,
      topPercent: a.topPercent,
      fontSize: Math.max(8, Math.round((drawing.fontSize ?? 14) * sy)),
    };
  }

  return drawing;
};

/** Given the corner being dragged (`tl|tr|bl|br`) and the pixel delta,
    return the new bbox in pixels, snapped to a minimum 4px size and
    auto-flipped if the user drags past the opposite corner. */
export const computeResizedBounds = (originBounds, corner, deltaX, deltaY) => {
  let { minX, minY, maxX, maxY } = originBounds;
  /* Corner handles change two sides at once (free-ratio resize). */
  if (corner === 'tl') { minX += deltaX; minY += deltaY; }
  else if (corner === 'tr') { maxX += deltaX; minY += deltaY; }
  else if (corner === 'bl') { minX += deltaX; maxY += deltaY; }
  else if (corner === 'br') { maxX += deltaX; maxY += deltaY; }
  /* Edge handles change only one axis — the perpendicular dimension
     stays fixed so the user can stretch height-only or width-only. */
  else if (corner === 'top') { minY += deltaY; }
  else if (corner === 'bottom') { maxY += deltaY; }
  else if (corner === 'left') { minX += deltaX; }
  else if (corner === 'right') { maxX += deltaX; }
  if (minX > maxX) [minX, maxX] = [maxX, minX];
  if (minY > maxY) [minY, maxY] = [maxY, minY];
  if (maxX - minX < 4) maxX = minX + 4;
  if (maxY - minY < 4) maxY = minY + 4;
  return { minX, minY, maxX, maxY };
};

export const translateDrawing = (drawing, dLeft, dTop) => {
  if (!drawing) return drawing;
  if (drawing.type === 'text') {
    return {
      ...drawing,
      leftPercent: drawing.leftPercent + dLeft,
      topPercent: drawing.topPercent + dTop,
    };
  }
  if (drawing.type === 'pen' && drawing.points?.length) {
    return {
      ...drawing,
      points: drawing.points.map((p) => ({
        ...p,
        leftPercent: p.leftPercent + dLeft,
        topPercent: p.topPercent + dTop,
      })),
    };
  }
  if (drawing.type === 'circle' || drawing.type === 'square') {
    return {
      ...drawing,
      leftPercent: drawing.leftPercent + dLeft,
      topPercent: drawing.topPercent + dTop,
    };
  }
  if (drawing.type === 'arrow') {
    return {
      ...drawing,
      x1: drawing.x1 + dLeft,
      y1: drawing.y1 + dTop,
      x2: drawing.x2 + dLeft,
      y2: drawing.y2 + dTop,
    };
  }
  return drawing;
};

/** Hit-test markers + drawings; returns topmost layer (latest action wins). */
export const findTopAnnotationLayer = (layers, px, py, boardLayout, hitMarkerAtPoint) => {
  if (!boardLayout?.width || !boardLayout?.height) return null;
  for (let i = layers.length - 1; i >= 0; i -= 1) {
    const layer = layers[i];
    if (layer.kind === 'marker') {
      if (hitMarkerAtPoint?.(layer.data, px, py)) return layer;
      continue;
    }
    const threshold = layer.data.type === 'text' ? 8 : 10;
    if (hitTestDrawing(layer.data, px, py, boardLayout, threshold)) return layer;
  }
  return null;
};

export const buildShapeDrawing = (type, start, end, color, strokeWidth) => {
  const base = { id: createDrawingId(), color, strokeWidth };
  if (type === 'arrow') {
    return {
      ...base,
      type: 'arrow',
      x1: start.leftPercent,
      y1: start.topPercent,
      x2: end.leftPercent,
      y2: end.topPercent,
    };
  }
  const box = normalizeBox(start, end);
  return { ...base, type, ...box };
};

/** Arrowhead geometry — returns:
 *   head     : the SVG polygon `points` string (tip + two base corners)
 *   lineEnd  : the (x, y) where the line should stop so it visually
 *              meets the triangle's base instead of poking through it
 *   headLen  : the head length (used by callers for layout / dashes) */
const computeArrowHead = (x1, y1, x2, y2, strokeWidth) => {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = Math.max(12, strokeWidth * 4);
  /* 30° half-angle = 60° apex → equilateral triangle (all three sides
     equal `headLen`). Reads as the canonical "arrow head" shape. */
  const halfApex = Math.PI / 6;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const cosL = Math.cos(angle - halfApex);
  const sinL = Math.sin(angle - halfApex);
  const cosR = Math.cos(angle + halfApex);
  const sinR = Math.sin(angle + halfApex);
  const left  = { x: x2 - headLen * cosL, y: y2 - headLen * sinL };
  const right = { x: x2 - headLen * cosR, y: y2 - headLen * sinR };
  /* Pull the line back to where the triangle's base sits so the two
     shapes meet cleanly — no gap, no stroke poking through the tip. */
  const baseInset = headLen * Math.cos(halfApex);
  const lineEnd = {
    x: x2 - baseInset * cos,
    y: y2 - baseInset * sin,
  };
  return {
    head: `${x2},${y2} ${left.x},${left.y} ${right.x},${right.y}`,
    lineEnd,
    headLen,
  };
};


const renderDrawingElement = (d, layout, toPx) => {
  if (d.type === 'pen' && d.points?.length) {
    return (
      <path
        key={d.id}
        d={buildPenPathD(d.points, layout)}
        fill='none'
        stroke={d.color}
        strokeWidth={d.width}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    );
  }
  if (d.type === 'circle' || d.type === 'square') {
    const a = toPx(d.leftPercent, d.topPercent);
    const b = toPx(d.leftPercent + d.widthPercent, d.topPercent + d.heightPercent);
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const w = Math.abs(b.x - a.x);
    const h = Math.abs(b.y - a.y);
    if (d.type === 'square') {
      return (
        <rect
          key={d.id}
          x={x}
          y={y}
          width={w}
          height={h}
          fill='none'
          stroke={d.color}
          strokeWidth={d.strokeWidth}
        />
      );
    }
    return (
      <ellipse
        key={d.id}
        cx={x + w / 2}
        cy={y + h / 2}
        rx={w / 2}
        ry={h / 2}
        fill='none'
        stroke={d.color}
        strokeWidth={d.strokeWidth}
      />
    );
  }
  if (d.type === 'arrow') {
    const a = toPx(d.x1, d.y1);
    const b = toPx(d.x2, d.y2);
    const arrow = computeArrowHead(a.x, a.y, b.x, b.y, d.strokeWidth);
    return (
      <g key={d.id}>
        <line
          x1={a.x}
          y1={a.y}
          x2={arrow.lineEnd.x}
          y2={arrow.lineEnd.y}
          stroke={d.color}
          strokeWidth={d.strokeWidth}
          strokeLinecap='round'
        />
        <polygon
          points={arrow.head}
          fill={d.color}
          stroke={d.color}
          strokeLinejoin='miter'
          strokeWidth={Math.max(1, d.strokeWidth * 0.4)}
        />
      </g>
    );
  }
  if (d.type === 'text') {
    const p = toPx(d.leftPercent, d.topPercent);
    return (
      <text
        key={d.id}
        x={p.x}
        y={p.y}
        fill={d.color}
        fontSize={d.fontSize ?? 14}
        fontFamily='var(--type-family-body)'
        dominantBaseline='hanging'
      >
        {d.text}
      </text>
    );
  }
  return null;
};

/** One vector/text drawing in its own SVG so z-index can follow action order.
    When `dimmed` is true (eraser hover preview) the drawing renders with a
    soft 0.55 opacity wrapped in a <g> — applied at the SVG layer so thin
    strokes stay visible (unlike a CSS brightness filter on the wrapper). */
export const BoardDrawingLayer = ({ drawing, layout, boxW, boxH, stackOrder, dimmed = false }) => {
  if (!boxW || !boxH || !drawing) return null;
  const toPx = (leftPercent, topPercent) => percentToPixel(leftPercent, topPercent, layout);
  return (
    <svg
      className='pointer-events-none absolute inset-0'
      width={boxW}
      height={boxH}
      style={{ zIndex: layerZIndex(stackOrder) }}
      aria-hidden
    >
      <g
        opacity={dimmed ? 0.55 : 1}
        style={{ transition: 'opacity 120ms ease' }}
      >
        {renderDrawingElement(drawing, layout, toPx)}
      </g>
    </svg>
  );
};

export const BodyFigureAnnotationsSvg = ({ drawings = [], draft = null, layout, boxW, boxH }) => {
  if (!boxW || !boxH) return null;

  const toPx = (leftPercent, topPercent) => percentToPixel(leftPercent, topPercent, layout);
  const sortedDrawings = sortByStackOrder(drawings);

  const renderDraft = () => {
    if (!draft) return null;
    /* Draft preview — solid stroke at 20% opacity so the in-progress
       shape reads as a soft "preview" guide but matches the same line
       style the committed drawing will use. */
    const DRAFT_OPACITY = 0.2;
    if ((draft.type === 'circle' || draft.type === 'square') && draft.end) {
      const box = normalizeBox(draft.start, draft.end);
      const a = toPx(box.leftPercent, box.topPercent);
      const b = toPx(box.leftPercent + box.widthPercent, box.topPercent + box.heightPercent);
      const x = Math.min(a.x, b.x);
      const y = Math.min(a.y, b.y);
      const w = Math.abs(b.x - a.x);
      const h = Math.abs(b.y - a.y);
      if (draft.type === 'square') {
        return (
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            fill='none'
            stroke={draft.color}
            strokeWidth={draft.strokeWidth}
            opacity={DRAFT_OPACITY}
          />
        );
      }
      return (
        <ellipse
          cx={x + w / 2}
          cy={y + h / 2}
          rx={w / 2}
          ry={h / 2}
          fill='none'
          stroke={draft.color}
          strokeWidth={draft.strokeWidth}
          opacity={DRAFT_OPACITY}
        />
      );
    }
    if (draft.type === 'arrow' && draft.end) {
      const a = toPx(draft.start.leftPercent, draft.start.topPercent);
      const b = toPx(draft.end.leftPercent, draft.end.topPercent);
      const arrow = computeArrowHead(a.x, a.y, b.x, b.y, draft.strokeWidth);
      return (
        <>
          <line
            x1={a.x}
            y1={a.y}
            x2={arrow.lineEnd.x}
            y2={arrow.lineEnd.y}
            stroke={draft.color}
            strokeWidth={draft.strokeWidth}
            strokeLinecap='round'
            opacity={DRAFT_OPACITY}
          />
          <polygon
            points={arrow.head}
            fill={draft.color}
            stroke={draft.color}
            strokeLinejoin='miter'
            strokeWidth={Math.max(1, draft.strokeWidth * 0.4)}
            opacity={DRAFT_OPACITY}
          />
        </>
      );
    }
    return null;
  };

  return (
    <svg
      className='pointer-events-none absolute inset-0'
      width={boxW}
      height={boxH}
      aria-hidden
    >
      {sortedDrawings.map((d) => renderDrawingElement(d, layout, toPx))}
      {renderDraft()}
    </svg>
  );
};

export { percentToPixel, pixelToPercent, normalizeBox };
