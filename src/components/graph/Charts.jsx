import React, { useEffect, useRef, useState } from 'react';

/**
 * SVG chart primitives — all colors flow through MIH design tokens
 * (brand-aware vars or static semantic tokens) so widgets adapt to
 * `<html data-brand="...">`.
 *
 * Pass color props as CSS color strings (var(...) refs OK).
 *
 * Chart axis typography (DS cap = 14px):
 *   • Tick labels   → --type-size-xs (12px)
 *   • Axis caption  → --type-size-sm (14px)
 *   Axis labels are rendered as HTML overlays positioned in % over an
 *   aspect-ratio plot box — guarantees true CSS pixels even when the
 *   SVG viewBox would otherwise scale text up past 14px.
 *
 * Interactivity props (opt-in):
 *   - activeIndex / onItemClick — for click drilldown + highlight
 *   - hover state is internal; tooltips render automatically
 */

/* ── Scroll-triggered reveal wrapper ────────────────────────
   Fades + slides children in once they enter the viewport.
   Plays once per mount (observer disconnects after firing). */
export const Reveal = ({ children, delay = 0, threshold = 0.15, className = '' }) => {
  const ref = useRef(null);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setRevealed(true);
        io.disconnect();
      }
    }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'none' : 'translateY(20px)',
        transition: `opacity 700ms cubic-bezier(0.22, 0.61, 0.36, 1) ${delay}ms, transform 700ms cubic-bezier(0.22, 0.61, 0.36, 1) ${delay}ms`,
        willChange: revealed ? 'auto' : 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
};

/* ── Tooltip primitive — matches VitalsSignGraph ChartTooltip (light popover) */
const Tooltip = ({ x, y, children, anchor = 'top' }) => {
  if (x == null || y == null) return null;
  const transform = anchor === 'top'
    ? 'translate(-50%, calc(-100% - 8px))'
    : 'translate(-50%, 8px)';
  return (
    <div
      className='pointer-events-none absolute z-20 flex flex-col leading-snug'
      style={{
        left: x,
        top: y,
        transform,
        background: 'var(--surface-card-100)',
        border: 'var(--dim-stroke-100) solid var(--border-popover-grey)',
        borderRadius: 'var(--dim-radius-200, 8px)',
        boxShadow: 'var(--shadow-dropdown)',
        padding: 'var(--dim-space-200) var(--dim-space-300)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: 'var(--text-content-default)',
        gap: 'var(--dim-space-100)',
        width: 'max-content',
        maxWidth: 'min(18rem, calc(100vw - 2rem))',
      }}
    >
      {children}
    </div>
  );
};

const TooltipCaption = ({ children }) => (
  <div
    style={{
      color: 'var(--text-content-tertiary)',
      fontSize: 10,
      lineHeight: 1.3,
      marginBottom: 'var(--dim-space-050)',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </div>
);

const TooltipRow = ({ color, label, value }) => (
  <div className='flex items-center' style={{ gap: 'var(--dim-space-200)', lineHeight: 1.4, whiteSpace: 'nowrap' }}>
    <span style={{ width: 8, height: 8, borderRadius: 'var(--dim-radius-full)', background: color, flexShrink: 0 }} />
    <span style={{ color: 'var(--text-content-default)', fontWeight: 'var(--type-weight-medium)' }}>{label}</span>
    <span style={{ color: 'var(--text-content-default)', fontWeight: 'var(--type-weight-bold)' }}>{value}</span>
  </div>
);

/* ── Donut ─────────────────────────────────────────────────── */
/* Build an annular-wedge SVG path (clean filled segment, no stroke). */
const annularWedge = (cx, cy, rOut, rIn, startA, endA) => {
  const x1 = cx + rOut * Math.cos(startA), y1 = cy + rOut * Math.sin(startA);
  const x2 = cx + rOut * Math.cos(endA),   y2 = cy + rOut * Math.sin(endA);
  const x3 = cx + rIn  * Math.cos(endA),   y3 = cy + rIn  * Math.sin(endA);
  const x4 = cx + rIn  * Math.cos(startA), y4 = cy + rIn  * Math.sin(startA);
  const largeArc = endA - startA > Math.PI ? 1 : 0;
  return `M ${x1} ${y1}
          A ${rOut} ${rOut} 0 ${largeArc} 1 ${x2} ${y2}
          L ${x3} ${y3}
          A ${rIn} ${rIn} 0 ${largeArc} 0 ${x4} ${y4} Z`;
};

export const Donut = ({
  segments,           // [{ value, color, label? }]
  size = 120,
  thickness = 16,
  centerLabel,
  centerSub,
  centerExtra,        // optional third line (e.g. total count under rate)
  activeIndex = null,
  onSegmentClick,
}) => {
  const [hover, setHover] = useState(null);
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const cx = size / 2, cy = size / 2;
  const rOut = (size - 2) / 2;          /* outer radius (1px breathing room) */
  const rIn  = rOut - thickness;         /* inner radius */
  const focused = hover != null ? hover : activeIndex;
  const focusedSeg = focused != null ? segments[focused] : null;
  const hasTriple = !!(centerLabel && centerSub && centerExtra);
  const hasPair = !!(centerLabel && centerSub) && !centerExtra;
  /* ตัวเลขกลางสเกลตามขนาดรูใน — เด่นชัดบน donut ใหญ่ */
  const centerLabelSize = Math.max(14, Math.round(rIn * 0.34));
  const centerSubSize = Math.max(10, Math.round(rIn * 0.15));
  const centerExtraSize = Math.max(9, Math.round(rIn * 0.13));

  /* Sweep-in animation — runs once when the donut enters the viewport.
   * Animates `progress` 0→1 with ease-out, clipping each wedge's end angle. */
  const wrapRef = useRef(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    let raf;
    const animate = () => {
      const start = performance.now();
      const duration = 900;
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);  // cubic ease-out
        setProgress(eased);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        animate();
        io.disconnect();
      }
    }, { threshold: 0.25 });
    io.observe(el);
    return () => { io.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, []);

  /* Pre-compute wedge paths — clipped by `progress` to give a clock-sweep effect. */
  const sweepEnd = -Math.PI / 2 + progress * Math.PI * 2;
  let acc = 0;
  const wedges = segments.map((seg) => {
    const startA = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += seg.value;
    const fullEndA = (acc / total) * Math.PI * 2 - Math.PI / 2;
    const endA = Math.min(fullEndA, sweepEnd);
    const visible = endA - startA > 0.0001;
    return {
      ...seg,
      d: visible ? annularWedge(cx, cy, rOut, rIn, startA, endA) : null,
    };
  });

  return (
    <div ref={wrapRef} className='relative inline-block'>
      <svg
        width={size} height={size}
        viewBox={`0 0 ${size} ${size}`}
        className='shrink-0'
      >
        {/* Background ring (full circle, neutral colour) */}
        <path
          d={annularWedge(cx, cy, rOut, rIn, -Math.PI / 2, 1.5 * Math.PI - 0.0001)}
          fill='var(--ink-neutral, #F4F5F5)'
        />
        {wedges.map((seg, i) => {
          if (!seg.d) return null;
          const isFocused   = focused === i;
          const isClickable = !!onSegmentClick;
          /* Hover/active = darker fill via brightness filter only.
           * No size/position changes → ring outline never shifts. */
          return (
            <path
              key={i}
              d={seg.d}
              fill={seg.color}
              style={{
                cursor: isClickable ? 'pointer' : 'default',
                filter: isFocused ? 'brightness(0.78)' : 'none',
                transition: 'filter .12s ease',
              }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSegmentClick?.(i)}
            />
          );
        })}
        {/* Default center (label + sub [+ extra]) — shown when nothing is hovered/active */}
        {!focusedSeg && centerLabel && (
          <text
            x='50%'
            y={hasTriple ? '38%' : hasPair ? '46%' : '50%'}
            textAnchor='middle' dominantBaseline='middle'
            style={{
              fontSize: centerLabelSize,
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontWeight: 'var(--type-weight-regular, 400)',
              fill: 'var(--text-content-default)',
            }}
          >
            {centerLabel}
          </text>
        )}
        {!focusedSeg && centerSub && (
          <text
            x='50%'
            y={hasTriple ? '54%' : '64%'}
            textAnchor='middle' dominantBaseline='middle'
            style={{
              fontSize: centerSubSize,
              fontFamily: 'var(--type-family-body)',
              fill: 'var(--text-content-tertiary)',
            }}
          >
            {centerSub}
          </text>
        )}
        {!focusedSeg && centerExtra && (
          <text
            x='50%' y='68%'
            textAnchor='middle' dominantBaseline='middle'
            style={{
              fontSize: centerExtraSize,
              fontFamily: 'var(--type-family-body)',
              fill: 'var(--text-content-tertiary)',
            }}
          >
            {centerExtra}
          </text>
        )}
        {/* Hover/active center — segment label + value + pct, all inside hole */}
        {focusedSeg && (
          <>
            {focusedSeg.label && (
              <text
                x='50%' y='36%'
                textAnchor='middle' dominantBaseline='middle'
                style={{
                  fontSize: centerSubSize,
                  fontFamily: 'var(--type-family-body)',
                  fill: 'var(--text-content-secondary)',
                }}
              >
                {focusedSeg.label.length > 14 ? `${focusedSeg.label.slice(0, 13)}…` : focusedSeg.label}
              </text>
            )}
            <text
              x='50%' y='52%'
              textAnchor='middle' dominantBaseline='middle'
              style={{
                fontSize: centerLabelSize,
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontWeight: 'var(--type-weight-regular, 400)',
                fill: 'var(--text-content-default)',
              }}
            >
              {focusedSeg.value.toLocaleString()}
            </text>
            <text
              x='50%' y='66%'
              textAnchor='middle' dominantBaseline='middle'
              style={{
                fontSize: centerExtraSize,
                fontFamily: 'var(--type-family-body)',
                fill: 'var(--text-content-tertiary)',
              }}
            >
              {(focusedSeg.value / total * 100).toFixed(1)}%
            </text>
          </>
        )}
      </svg>
    </div>
  );
};

/** Color-matched legend: ● label  value · pct% (consent / report pie pattern). */
export const DonutLegend = ({ segments }) => {
  const total = segments.reduce((sum, s) => sum + Number(s.value || 0), 0);
  return (
    <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-150, 6px)' }}>
      {segments.map((s) => {
        const pct = total ? `${((Number(s.value) / total) * 100).toFixed(0)}%` : '0%';
        const textStyle = {
          color: s.color,
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
          lineHeight: 1.4,
          whiteSpace: 'nowrap',
        };
        return (
          <div
            key={s.label}
            className='inline-flex items-center min-w-0'
            style={{ gap: 'var(--dim-space-150, 6px)' }}
          >
            <span
              aria-hidden
              style={{
                width: 'var(--dim-size-200, 12px)',
                height: 'var(--dim-size-200, 12px)',
                borderRadius: 'var(--dim-radius-full, 9999px)',
                background: s.color,
                flexShrink: 0,
              }}
            />
            <span style={textStyle}>{s.label}</span>
            <span style={textStyle}>
              {Number(s.value).toLocaleString()} · {pct}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/** Donut + side legend — use for every report pie chart. */
export const DonutWithLegend = ({
  segments,
  size = 180,
  thickness,
  centerLabel,
  centerSub,
  centerExtra,
  activeIndex,
  onSegmentClick,
}) => (
  <div
    className='flex items-center justify-center w-full min-w-0 flex-wrap'
    style={{ gap: 'var(--dim-space-400, 16px)' }}
  >
    <Donut
      segments={segments}
      size={size}
      thickness={thickness}
      centerLabel={centerLabel}
      centerSub={centerSub}
      centerExtra={centerExtra}
      activeIndex={activeIndex}
      onSegmentClick={onSegmentClick}
    />
    <DonutLegend segments={segments} />
  </div>
);

const SEGMENT_TOOLTIP_STYLE = {
  position: 'absolute',
  left: '50%',
  bottom: '100%',
  transform: 'translate(-50%, calc(-1 * var(--dim-space-200, 8px)))',
  pointerEvents: 'none',
  zIndex: 2,
  background: 'var(--surface-card-100)',
  border: 'var(--dim-stroke-100) solid var(--border-popover-grey)',
  borderRadius: 'var(--dim-radius-200, 8px)',
  boxShadow: 'var(--shadow-dropdown)',
  padding: 'var(--dim-space-200, 8px)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  color: 'var(--text-content-default)',
  whiteSpace: 'nowrap',
};
/* Optional `segments` on a row: [{ value, color, label }] — stacked
   proportions inside one track (e.g. ยินยอม / ไม่ยินยอม). Track width
   still scales to the row's `value` vs the list max.
   Each segment is hoverable and shows its value in a tooltip. */
export const HBarList = ({
  rows,
  valueLabel = 'คน',
  secondLabel = 'ครั้ง',
  activeIndex = null,
  onRowClick,
  /* จำกัดความสูงให้เห็นประมาณ N แถว แล้ว scroll แนวตั้ง (เช่น 6.5) */
  maxVisibleRows,
}) => {
  const max = Math.max(...rows.map((r) => r.value)) || 1;
  const [hoverSeg, setHoverSeg] = useState(null); /* { row, seg } | null */
  /* Row ≈ pad + label line + gap + bar + inter-row gap — keep scroll math honest. */
  const rowUnit = 'calc(var(--dim-size-1100, 52px) + var(--dim-space-300, 12px))';
  const scrollStyle = maxVisibleRows != null && maxVisibleRows > 0
    ? {
        maxHeight: `calc(${maxVisibleRows} * (${rowUnit}))`,
        overflowY: 'auto',
        paddingRight: 'var(--dim-space-100, 4px)',
        overscrollBehavior: 'contain',
      }
    : undefined;
  return (
    <div
      className='flex flex-col w-full min-w-0'
      style={{ gap: 'var(--dim-space-100, 4px)', ...scrollStyle }}
    >
      {rows.map((r, i) => {
        const isActive = activeIndex === i;
        const clickable = !!onRowClick;
        const segments = Array.isArray(r.segments)
          ? r.segments.filter((s) => s && Number(s.value) > 0)
          : null;
        const segmentTotal = segments
          ? segments.reduce((sum, s) => sum + Number(s.value || 0), 0) || 1
          : 0;
        return (
          <div
            key={i}
            onClick={() => clickable && onRowClick(i)}
            className={`relative flex items-start w-full min-w-0 transition ${
              clickable ? 'cursor-pointer' : ''
            }`}
            style={{
              gap: 'var(--dim-space-300, 12px)',
              padding: 'var(--dim-space-200, 8px) var(--dim-space-100, 4px)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              background: isActive ? 'var(--surface-brandPrimary-quaternary, #F4FBF8)' : 'transparent',
              boxSizing: 'border-box',
              overflow: 'visible',
            }}
            onMouseEnter={(e) => {
              if (!clickable || isActive) return;
              e.currentTarget.style.background = 'var(--surface-brandPrimary-quaternary, #F4FBF8)';
            }}
            onMouseLeave={(e) => {
              if (isActive) return;
              e.currentTarget.style.background = 'transparent';
            }}
            title={clickable ? 'ดูรายละเอียด' : undefined}
          >
            <span
              className='inline-flex items-center justify-center shrink-0'
              style={{
                width: 'var(--dim-size-500, 24px)',
                height: 'var(--dim-size-500, 24px)',
                marginTop: 'var(--dim-space-050, 2px)',
                borderRadius: 'var(--dim-radius-full, 9999px)',
                background: isActive ? 'var(--brand-p700)' : 'var(--brand-p100)',
                color: isActive ? '#fff' : 'var(--brand-p700)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
                fontWeight: 'var(--type-weight-bold)',
                lineHeight: 1,
              }}
            >
              {i + 1}
            </span>
            <div
              className='flex-1 min-w-0'
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--dim-space-200, 8px)',
                overflow: 'visible',
              }}
            >
              <div className='flex items-center w-full min-w-0' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <div
                  className='min-w-0 flex-1 truncate'
                  style={{
                    color: isActive ? 'var(--text-brandPrimary-default)' : 'var(--text-content-default)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm)',
                    fontWeight: isActive ? 'var(--type-weight-medium)' : 'var(--type-weight-regular)',
                    lineHeight: 1.4,
                  }}
                  title={r.label}
                >
                  {r.label}
                </div>
                <span
                  className='shrink-0 whitespace-nowrap tabular-nums'
                  style={{
                    color: 'var(--text-content-secondary)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-xs)',
                    lineHeight: 1.4,
                  }}
                >
                  <strong style={{ color: 'var(--text-content-default)', fontWeight: 'var(--type-weight-medium)' }}>
                    {r.value.toLocaleString()}
                  </strong>
                  {' '}{valueLabel}
                </span>
                {r.second != null && (
                  <span
                    className='shrink-0 whitespace-nowrap tabular-nums'
                    style={{
                      width: 'var(--dim-size-1600, 64px)',
                      textAlign: 'right',
                      color: 'var(--text-content-tertiary)',
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-xs)',
                    }}
                  >
                    {r.second.toLocaleString()} {secondLabel}
                  </span>
                )}
              </div>
              <div
                className='flex items-center w-full'
                style={{
                  width: `${(r.value / max) * 100}%`,
                  minWidth: r.value > 0 ? 'var(--dim-space-400, 16px)' : 0,
                  maxWidth: '100%',
                  height: 'var(--dim-space-200, 8px)',
                  background: segments && segments.length > 0 ? 'transparent' : 'var(--brand-p100)',
                  borderRadius: 'var(--dim-radius-full, 9999px)',
                  overflow: 'visible',
                }}
              >
                {segments && segments.length > 0 ? (
                  segments.map((s, si) => {
                    const isHovered = hoverSeg?.row === i && hoverSeg?.seg === si;
                    const valueText = Number(s.value).toLocaleString();
                    const tipText = s.label ? `${s.label} · ${valueText}` : valueText;
                    const radius = si === 0 && si === segments.length - 1
                      ? 'var(--dim-radius-full)'
                      : si === 0
                        ? 'var(--dim-radius-full) 0 0 var(--dim-radius-full)'
                        : si === segments.length - 1
                          ? '0 var(--dim-radius-full) var(--dim-radius-full) 0'
                          : 0;
                    return (
                      <div
                        key={si}
                        className='relative h-full'
                        style={{
                          width: `${(Number(s.value) / segmentTotal) * 100}%`,
                          minWidth: Number(s.value) > 0 ? 2 : 0,
                          opacity: hoverSeg?.row === i && !isHovered ? 0.45 : 1,
                          transition: 'opacity .12s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.stopPropagation();
                          setHoverSeg({ row: i, seg: si });
                        }}
                        onMouseLeave={() => setHoverSeg(null)}
                      >
                        <div
                          className='relative w-full h-full'
                          style={{ cursor: 'pointer' }}
                          aria-label={tipText}
                        >
                          <div
                            className='absolute left-0 right-0'
                            style={{
                              top: '50%',
                              transform: 'translateY(-50%)',
                              height: 'var(--dim-space-200, 8px)',
                              background: s.color || (isActive ? 'var(--brand-p700)' : 'var(--brand-p400)'),
                              borderRadius: radius,
                            }}
                          />
                        </div>
                        {isHovered && (
                          <div style={SEGMENT_TOOLTIP_STYLE}>
                            {tipText}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div
                    className='rounded-full transition-all'
                    style={{
                      width: '100%',
                      height: 'var(--dim-space-200, 8px)',
                      background: isActive ? 'var(--brand-p700)' : 'var(--brand-p400)',
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ── Vertical bars (grouped or stacked, N series across months) ─ */
/* `barMaxWidth` only applies to the grouped (non-stacked) layout. The 10px
   default is tuned for 12 monthly columns; callers plotting a handful of
   categories should widen it, otherwise the per-bar value labels sit ~10px
   apart and overlap each other. */
export const VBars = ({ months, series, height = 200, onMonthClick, activeMonth = null, stacked = false, barMaxWidth = 10, showLegend = true }) => {
  const monthTotals = months.map((_, idx) => series.reduce((sum, s) => sum + s.values[idx], 0));
  const max = stacked
    ? Math.max(...monthTotals) || 1
    : Math.max(...series.flatMap((s) => s.values)) || 1;
  const [hover, setHover] = useState(null);
  const focused = hover != null ? hover : activeMonth;
  const wrapRef = useRef(null);
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setAnimated(true);
        io.disconnect();
      }
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const barTransition = 'height 700ms cubic-bezier(0.22, 0.61, 0.36, 1)';
  return (
    <div ref={wrapRef} className='w-full relative'>
      <div className='flex items-end justify-between gap-1' style={{ height }}>
        {months.map((m, idx) => {
          const isActive = focused === idx;
          const total = monthTotals[idx];
          return (
            <div
              key={idx}
              onMouseEnter={() => setHover(idx)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onMonthClick?.(idx)}
              className={`flex-1 flex flex-col items-center gap-1 rounded-sm transition ${onMonthClick ? 'cursor-pointer' : ''} ${isActive ? 'bg-brand-50' : ''}`}
            >
              <div className='w-full flex items-end justify-center gap-0.5' style={{ height: height - 24 }}>
                {stacked ? (
                  <div className='relative flex-1 max-w-[24px] flex flex-col-reverse justify-start' style={{ height: '100%' }}>
                    <span
                      className='absolute left-1/2 -translate-x-1/2 text-[10px] tabular-nums font-bold'
                      style={{
                        bottom: animated ? `${(total / max) * 100}%` : '0%',
                        marginBottom: 'var(--dim-space-050)',
                        color: 'var(--text-content-secondary)',
                        transition: 'bottom 700ms cubic-bezier(0.22, 0.61, 0.36, 1)',
                        transitionDelay: `${idx * 40}ms`,
                      }}
                    >
                      {total}
                    </span>
                    {series.map((s, si) => {
                      const v = s.values[idx];
                      const h = animated ? (v / max) * 100 : 0;
                      const isTop = si === series.length - 1;
                      return (
                        <div
                          key={si}
                          className='w-full'
                          style={{
                            height: `${h}%`,
                            background: s.color,
                            opacity: focused != null && !isActive ? 0.55 : 1,
                            borderTopLeftRadius: isTop ? 2 : 0,
                            borderTopRightRadius: isTop ? 2 : 0,
                            transition: `${barTransition}, opacity .15s`,
                            transitionDelay: `${idx * 40}ms`,
                          }}
                        />
                      );
                    })}
                  </div>
                ) : (
                  series.map((s, si) => {
                    const v = s.values[idx];
                    const h = animated ? (v / max) * 100 : 0;
                    /* The bar's `height: <pct>%` needs a resolved height on its
                       wrapper — without one the percentage resolves against
                       `auto` and every grouped bar collapses to 0 (the stacked
                       branch above already sets height:100%). `items-end` keeps
                       the bar on the baseline once it has a real height. */
                    return (
                      <div
                        key={si}
                        className='relative flex-1 flex justify-center items-end'
                        style={{ height: '100%', maxWidth: barMaxWidth }}
                      >
                        <div
                          className='w-full rounded-t-sm relative'
                          style={{
                            height: `${h}%`,
                            background: s.color,
                            opacity: focused != null && !isActive ? 0.55 : 1,
                            transition: `${barTransition}, opacity .15s`,
                            transitionDelay: `${idx * 40}ms`,
                          }}
                        >
                          <span
                            className='absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] tabular-nums'
                            style={{ color: 'var(--text-content-secondary)' }}
                          >
                            {v}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <span className={`text-[10px] ${isActive ? 'text-brand-500 font-bold' : 'text-ink-tertiary'}`}>{m}</span>
            </div>
          );
        })}
      </div>
      {hover != null && (
        <Tooltip x={`${((hover + 0.5) / months.length) * 100}%`} y={0}>
          <TooltipCaption>{months[hover]}</TooltipCaption>
          {series.map((s, i) => (
            <TooltipRow key={i} color={s.color} label={s.label} value={s.values[hover]} />
          ))}
        </Tooltip>
      )}
      {showLegend ? <div className='flex items-center justify-center gap-4 mt-2'>
        {series.map((s, i) => (
          <span
            key={i}
            className='inline-flex items-center gap-1.5 text-xs'
            style={{ color: s.color }}
          >
            <span className='w-3 h-3 rounded-sm' style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div> : null}
    </div>
  );
};

/* ── Line chart (mini, 12-month trend) ─────────────────────── */
export const LineChart = ({ months, series, height = 180, onMonthClick, activeMonth = null }) => {
  const W = 600, H = height;
  /* SVG viewBox math requires px numbers — CSS vars cannot be added/subtracted here. */
  const padding = { top: 16, right: 12, bottom: 24, left: 32 };
  const flat = series.flatMap((s) => s.values);
  const max = Math.max(...flat) * 1.1 || 1;
  const xStep = (W - padding.left - padding.right) / (months.length - 1);
  const yScale = (v) => padding.top + (1 - v / max) * (H - padding.top - padding.bottom);
  const xPos = (i) => padding.left + i * xStep;
  const [hover, setHover] = useState(null);
  const focused = hover != null ? hover : activeMonth;
  const wrapRef = useRef(null);
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setAnimated(true);
        io.disconnect();
      }
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const lineDuration = 1200;

  return (
    <div ref={wrapRef} className='w-full relative'>
      {/* Plot box — locks viewBox proportions so HTML axis labels align with
          SVG user-space coords, and CSS font-size never scales above DS cap. */}
      <div className='relative w-full' style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} className='absolute inset-0 w-full h-full' preserveAspectRatio='none'>
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <line key={i}
            x1={padding.left} x2={W - padding.right}
            y1={padding.top + p * (H - padding.top - padding.bottom)}
            y2={padding.top + p * (H - padding.top - padding.bottom)}
            stroke='var(--ink-line, #E2E4E6)' strokeWidth={0.5} />
        ))}
        {/* Hover guide */}
        {focused != null && (
          <line x1={xPos(focused)} x2={xPos(focused)}
            y1={padding.top} y2={H - padding.bottom}
            stroke='var(--brand-p400)' strokeWidth={1} strokeDasharray='3 3' />
        )}
        {series.map((s, si) => {
          const path = s.values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i)} ${yScale(v)}`).join(' ');
          return (
            <g key={si}>
              <path
                d={path}
                fill='none'
                stroke={s.color}
                strokeWidth={2}
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={animated ? 0 : 1}
                style={{ transition: `stroke-dashoffset ${lineDuration}ms cubic-bezier(0.22, 0.61, 0.36, 1)` }}
              />
              {s.values.map((v, i) => {
                const dotDelay = (i / Math.max(1, months.length - 1)) * lineDuration;
                return (
                  <circle key={i} cx={xPos(i)} cy={yScale(v)}
                    r={focused === i ? 4 : 2.5} fill={s.color}
                    opacity={animated ? 1 : 0}
                    style={{
                      transition: `r .12s, opacity 200ms ease-out ${dotDelay}ms`,
                    }} />
                );
              })}
            </g>
          );
        })}
        {/* Hover overlay (one rect per month) */}
        {months.map((_, i) => (
          <rect key={i}
            x={xPos(i) - xStep / 2} y={padding.top}
            width={xStep} height={H - padding.top - padding.bottom}
            fill='transparent'
            style={{ cursor: onMonthClick ? 'pointer' : 'default' }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onMonthClick?.(i)} />
        ))}
        </svg>

        {/* Y-axis tick labels — HTML overlay keeps text at exact CSS px */}
        {[0, 0.5, 1].map((p, i) => {
          const y = padding.top + (1 - p) * (H - padding.top - padding.bottom);
          return (
            <span
              key={`y-${i}`}
              className='absolute pointer-events-none whitespace-nowrap tabular-nums'
              style={{
                top:        `${(y / H) * 100}%`,
                right:      `${((W - (padding.left - 4)) / W) * 100}%`,
                transform:  'translateY(-50%)',
                fontFamily: 'var(--type-family-body)',
                fontSize:   'var(--type-size-xs)',
                color:      'var(--text-content-tertiary)',
                lineHeight: 1,
              }}
            >
              {Math.round(max * p).toLocaleString()}
            </span>
          );
        })}

        {/* X-axis month labels — HTML overlay */}
        {months.map((m, i) => (
          <span
            key={`x-${i}`}
            className='absolute pointer-events-none whitespace-nowrap'
            style={{
              top:        `${((H - 10) / H) * 100}%`,
              left:       `${(xPos(i) / W) * 100}%`,
              transform:  'translate(-50%, -50%)',
              fontFamily: 'var(--type-family-body)',
              fontSize:   'var(--type-size-xs)',
              color:      focused === i ? 'var(--brand-p700)' : 'var(--text-content-tertiary)',
              fontWeight: focused === i ? 700 : 400,
              lineHeight: 1,
            }}
          >
            {m}
          </span>
        ))}
      </div>

      {hover != null && (
        <Tooltip x={`${((hover + 0.5) / months.length) * 100}%`} y={padding.top}>
          <TooltipCaption>{months[hover]}</TooltipCaption>
          {series.map((s, i) => (
            <TooltipRow key={i} color={s.color} label={s.label} value={s.values[hover].toLocaleString()} />
          ))}
        </Tooltip>
      )}
      <div className='flex items-center justify-center gap-4'>
        {series.map((s, i) => (
          <span
            key={i}
            className='inline-flex items-center gap-1.5 text-xs'
            style={{ color: s.color }}
          >
            <span className='w-3 h-3 rounded-sm' style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
};

/* ── Half-circle gauge (KPI %) ─────────────────────────────── */
export const Gauge = ({ value, max = 100, color, label, size = 160 }) => {
  const R = (size - 24) / 2;
  const C = Math.PI * R; // half circumference
  const pct = Math.max(0, Math.min(1, value / max));
  const filled = pct * C;
  const wrapRef = useRef(null);
  const [animated, setAnimated] = useState(false);
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    let raf;
    const runCountUp = () => {
      const start = performance.now();
      const duration = 1000;
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplayValue(value * eased);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setAnimated(true);
        runCountUp();
        io.disconnect();
      }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => { io.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [value]);

  const isInt = Number.isInteger(value);
  return (
    <div ref={wrapRef} className='flex flex-col items-center'>
      <svg width={size} height={size / 2 + 16} viewBox={`0 0 ${size} ${size / 2 + 16}`}>
        <path
          d={`M 12,${size / 2} A ${R},${R} 0 0 1 ${size - 12},${size / 2}`}
          fill='none'
          stroke='var(--ink-neutral, #F4F5F5)'
          strokeWidth={14}
          strokeLinecap='round'
        />
        <path
          d={`M 12,${size / 2} A ${R},${R} 0 0 1 ${size - 12},${size / 2}`}
          fill='none'
          stroke={color}
          strokeWidth={14}
          strokeLinecap='round'
          strokeDasharray={C}
          strokeDashoffset={animated ? C - filled : C}
          style={{ transition: 'stroke-dashoffset 1000ms cubic-bezier(0.22, 0.61, 0.36, 1)' }}
        />
        <text
          x='50%' y={size / 2 - 4}
          textAnchor='middle'
          dominantBaseline='middle'
          className='font-bold'
          style={{ fontSize: 22, fill: 'var(--text-content-default)' }}
        >
          {isInt ? Math.round(displayValue) : displayValue.toFixed(2)}%
        </text>
      </svg>
      {label && <p className='text-xs text-ink-tertiary text-center -mt-1'>{label}</p>}
    </div>
  );
};

/* ── Population pyramid ───────────────────────────────────── */
export const Pyramid = ({ groups, maleColor, femaleColor, height = 200 }) => {
  const max = Math.max(...groups.flatMap((g) => [g.male, g.female])) || 1;
  const wrapRef = useRef(null);
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setAnimated(true);
        io.disconnect();
      }
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const barTransition = 'width 800ms cubic-bezier(0.22, 0.61, 0.36, 1)';
  return (
    <div ref={wrapRef} className='flex flex-col gap-1' style={{ minHeight: height }}>
      {groups.map((g, i) => {
        const delay = `${i * 50}ms`;
        const malePct = animated ? (g.male / max) * 100 : 0;
        const femalePct = animated ? (g.female / max) * 100 : 0;
        return (
          <div key={i} className='flex items-center gap-2 text-[10px]'>
            <div className='flex-1 flex justify-end'>
              <div
                className='h-3 rounded-sm'
                style={{
                  width: `${malePct}%`,
                  background: maleColor,
                  transition: barTransition,
                  transitionDelay: delay,
                }}
                title={`ชาย ${g.label}: ${g.male}`}
              />
            </div>
            <span className='w-10 text-center text-ink-tertiary tabular-nums'>{g.label}</span>
            <div className='flex-1 flex justify-start'>
              <div
                className='h-3 rounded-sm'
                style={{
                  width: `${femalePct}%`,
                  background: femaleColor,
                  transition: barTransition,
                  transitionDelay: delay,
                }}
                title={`หญิง ${g.label}: ${g.female}`}
              />
            </div>
          </div>
        );
      })}
      <div className='flex items-center justify-center gap-4 mt-2'>
        <span className='inline-flex items-center gap-1.5 text-xs text-ink-secondary'>
          <span className='w-3 h-3 rounded-sm' style={{ background: maleColor }} /> ชาย
        </span>
        <span className='inline-flex items-center gap-1.5 text-xs text-ink-secondary'>
          <span className='w-3 h-3 rounded-sm' style={{ background: femaleColor }} /> หญิง
        </span>
      </div>
    </div>
  );
};

/* ── Population pyramid with % labels (Figma 4:8608) ────────
   groups: [{ label, malePct, femalePct }]  values are %
   showPctScale: render bottom % axis (-max..0..+max)        */
export const PyramidPct = ({
  groups,
  maleColor   = 'var(--text-pill-blue)',
  femaleColor = 'var(--text-pill-red)',
  rowHeight = 18,
}) => {
  const max = Math.ceil(Math.max(...groups.flatMap((g) => [g.malePct, g.femalePct])));
  const ticks = [-max, -max * 2/3, -max/3, 0, max/3, max * 2/3, max];
  const wrapRef = useRef(null);
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setAnimated(true);
        io.disconnect();
      }
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const barTransition = 'width 800ms cubic-bezier(0.22, 0.61, 0.36, 1)';
  return (
    <div ref={wrapRef} className='flex flex-col gap-1.5'>
      {groups.map((g, i) => {
        const delay = `${i * 50}ms`;
        const malePct = animated ? (g.malePct / max) * 100 : 0;
        const femalePct = animated ? (g.femalePct / max) * 100 : 0;
        return (
          <div key={i} className='flex items-center gap-1 text-[10px]'>
            <div className='flex-1 flex items-center justify-end relative' style={{ height: rowHeight }}>
              <div
                className='rounded-l-sm flex items-center justify-end pr-1.5 text-white text-[10px] font-medium tabular-nums overflow-hidden'
                style={{
                  width: `${malePct}%`,
                  height: rowHeight,
                  background: maleColor,
                  transition: barTransition,
                  transitionDelay: delay,
                }}
                title={`ชาย ${g.label}: ${g.malePct}%`}
              >
                {g.malePct >= 1 && g.malePct.toFixed(2)}
              </div>
            </div>
            <span className='w-12 text-center text-ink-tertiary tabular-nums shrink-0'>{g.label}</span>
            <div className='flex-1 flex items-center justify-start relative' style={{ height: rowHeight }}>
              <div
                className='rounded-r-sm flex items-center pl-1.5 text-white text-[10px] font-medium tabular-nums overflow-hidden'
                style={{
                  width: `${femalePct}%`,
                  height: rowHeight,
                  background: femaleColor,
                  transition: barTransition,
                  transitionDelay: delay,
                }}
                title={`หญิง ${g.label}: ${g.femalePct}%`}
              >
                {g.femalePct >= 1 && g.femalePct.toFixed(2)}
              </div>
            </div>
          </div>
        );
      })}
      {/* axis */}
      <div className='flex items-center gap-1 mt-1'>
        <div className='flex-1 flex justify-between text-[9px] text-ink-tertiary tabular-nums'>
          {ticks.slice(0, 4).map((t, i) => (
            <span key={i}>{Math.abs(Math.round(t))}%</span>
          ))}
        </div>
        <span className='w-12 shrink-0' />
        <div className='flex-1 flex justify-between text-[9px] text-ink-tertiary tabular-nums'>
          {ticks.slice(3).map((t, i) => (
            <span key={i}>{Math.round(t)}%</span>
          ))}
        </div>
      </div>
      <p className='text-[10px] text-ink-tertiary text-center mt-1'>ร้อยละ</p>
      <div className='flex items-center justify-center gap-4 mt-1'>
        <span className='inline-flex items-center gap-1.5 text-xs text-ink-secondary'>
          <span className='w-3 h-3 rounded-sm' style={{ background: maleColor }} /> ชาย
        </span>
        <span className='inline-flex items-center gap-1.5 text-xs text-ink-secondary'>
          <span className='w-3 h-3 rounded-sm' style={{ background: femaleColor }} /> หญิง
        </span>
      </div>
    </div>
  );
};

/* ── Area line chart (filled, Figma 4:8609) ──────────────── */
export const AreaLineChart = ({ months, series, height = 280, valueLabels = true, onMonthClick, activeMonth = null }) => {
  const W = 800, H = height;
  /* SVG viewBox math requires px numbers — CSS vars cannot be added/subtracted here. */
  const padding = { top: 24, right: 16, bottom: 40, left: 56 };
  const flat = series.flatMap((s) => s.values);
  const max = Math.max(...flat) * 1.1 || 1;
  const xStep = (W - padding.left - padding.right) / (months.length - 1);
  const yScale = (v) => padding.top + (1 - v / max) * (H - padding.top - padding.bottom);
  const xPos = (i) => padding.left + i * xStep;
  const baseY = padding.top + (H - padding.top - padding.bottom);
  const [hover, setHover] = useState(null);
  const focused = hover != null ? hover : activeMonth;
  const showLabels = valueLabels && focused == null;
  const wrapRef = useRef(null);
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setAnimated(true);
        io.disconnect();
      }
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const lineDuration = 1400;

  return (
    <div ref={wrapRef} className='w-full relative'>
      {/* Plot box — aspect-ratio anchors viewBox proportions so HTML
          overlays line up exactly with SVG user-space coords, and SVG
          text font-sizes never scale beyond DS cap (max 14px). */}
      <div className='relative w-full' style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} className='absolute inset-0 w-full h-full' preserveAspectRatio='none'>
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <line key={i}
            x1={padding.left} x2={W - padding.right}
            y1={padding.top + p * (H - padding.top - padding.bottom)}
            y2={padding.top + p * (H - padding.top - padding.bottom)}
            stroke='var(--ink-line, #E2E4E6)' strokeWidth={0.5} />
        ))}
        {/* Hover guide */}
        {focused != null && (
          <line x1={xPos(focused)} x2={xPos(focused)} y1={padding.top} y2={baseY}
            stroke='var(--brand-p600)' strokeWidth={1} strokeDasharray='4 4' />
        )}
        {series.map((s, si) => {
          const linePath = s.values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i)} ${yScale(v)}`).join(' ');
          const areaPath = `${linePath} L ${xPos(s.values.length - 1)} ${baseY} L ${xPos(0)} ${baseY} Z`;
          return (
            <g key={si}>
              <path
                d={areaPath}
                fill={s.areaColor || s.color}
                fillOpacity={animated ? 0.18 : 0}
                stroke='none'
                style={{ transition: `fill-opacity 600ms ease-out ${lineDuration * 0.4}ms` }}
              />
              <path
                d={linePath}
                fill='none'
                stroke={s.color}
                strokeWidth={2}
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={animated ? 0 : 1}
                style={{ transition: `stroke-dashoffset ${lineDuration}ms cubic-bezier(0.22, 0.61, 0.36, 1)` }}
              />
              {s.values.map((v, i) => {
                const dotDelay = (i / Math.max(1, months.length - 1)) * lineDuration;
                return (
                  <g key={i} opacity={animated ? 1 : 0} style={{ transition: `opacity 200ms ease-out ${dotDelay}ms` }}>
                    <circle cx={xPos(i)} cy={yScale(v)}
                      r={focused === i ? 5 : 3}
                      fill='white' stroke={s.color}
                      strokeWidth={focused === i ? 3 : 2}
                      style={{ transition: 'r .12s, stroke-width .12s' }} />
                    {showLabels && (
                      <g>
                        <rect x={xPos(i) - 22} y={yScale(v) - 18}
                          width={44} height={14} rx={2}
                          fill='white' stroke={s.color} strokeWidth={0.5} />
                        <text x={xPos(i)} y={yScale(v) - 11}
                          textAnchor='middle' dominantBaseline='middle'
                          style={{ fontSize: 9, fill: s.color, fontWeight: 600 }}>
                          {v.toLocaleString()}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
        {/* Hover overlay */}
        {months.map((_, i) => (
          <rect key={i}
            x={xPos(i) - xStep / 2} y={padding.top}
            width={xStep} height={baseY - padding.top}
            fill='transparent'
            style={{ cursor: onMonthClick ? 'pointer' : 'default' }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onMonthClick?.(i)} />
        ))}
        </svg>

        {/* Y-axis tick labels — HTML overlay (CSS px, never scales above 14px) */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const y = padding.top + (1 - p) * (H - padding.top - padding.bottom);
          return (
            <span
              key={`y-${i}`}
              className='absolute pointer-events-none whitespace-nowrap tabular-nums'
              style={{
                top:        `${(y / H) * 100}%`,
                right:      `${((W - (padding.left - 8)) / W) * 100}%`,
                transform:  'translateY(-50%)',
                fontFamily: 'var(--type-family-body)',
                fontSize:   'var(--type-size-xs)',
                color:      'var(--text-content-tertiary)',
                lineHeight: 1,
              }}
            >
              {Math.round(max * p).toLocaleString()}
            </span>
          );
        })}

        {/* X-axis month labels — HTML overlay */}
        {months.map((m, i) => (
          <span
            key={`x-${i}`}
            className='absolute pointer-events-none whitespace-nowrap'
            style={{
              top:        `${((H - 18) / H) * 100}%`,
              left:       `${(xPos(i) / W) * 100}%`,
              transform:  'translate(-50%, -50%)',
              fontFamily: 'var(--type-family-body)',
              fontSize:   'var(--type-size-xs)',
              color:      focused === i ? 'var(--brand-p700)' : 'var(--text-content-tertiary)',
              fontWeight: focused === i ? 700 : 400,
              lineHeight: 1,
            }}
          >
            {m}
          </span>
        ))}
      </div>

      {/* X-axis caption — outside plot box so it never overlaps month labels */}
      <div
        className='text-center'
        style={{
          fontFamily: 'var(--type-family-body)',
          fontSize:   'var(--type-size-sm)',
          color:      'var(--text-content-tertiary)',
          lineHeight: 1.2,
          marginTop:  'var(--dim-space-100)',
        }}
      >
        เดือน
      </div>

      {hover != null && (
        <Tooltip
          x={`calc(${(xPos(hover) / W) * 100}% )`}
          y={`${(padding.top / H) * 100}%`}
        >
          <TooltipCaption>{months[hover]}</TooltipCaption>
          {series.map((s, i) => (
            <TooltipRow key={i} color={s.color} label={s.label} value={s.values[hover].toLocaleString()} />
          ))}
        </Tooltip>
      )}
      <div className='flex items-center justify-center gap-6 mt-2'>
        {series.map((s, i) => (
          <span
            key={i}
            className='inline-flex items-center gap-1.5 text-xs'
            style={{ color: s.color }}
          >
            <span className='w-2.5 h-2.5 rounded-full' style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
};

/* ── Pie chart (Figma 4:8610) ────────────────────────────── */
export const Pie = ({ slices, size = 240, activeIndex = null, onSliceClick }) => {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const cx = size / 2, cy = size / 2, r = size / 2 - 2;
  const [hover, setHover] = useState(null);
  const focused = hover != null ? hover : activeIndex;
  const wrapRef = useRef(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    let raf;
    const animate = () => {
      const start = performance.now();
      const duration = 1000;
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setProgress(eased);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        animate();
        io.disconnect();
      }
    }, { threshold: 0.25 });
    io.observe(el);
    return () => { io.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, []);

  const sweepEnd = -Math.PI / 2 + progress * Math.PI * 2;
  let acc = 0;
  const paths = slices.map((s) => {
    const startA = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += s.value;
    const fullEndA = (acc / total) * Math.PI * 2 - Math.PI / 2;
    const endA = Math.min(fullEndA, sweepEnd);
    const visible = endA - startA > 0.0001;
    const x1 = cx + r * Math.cos(startA);
    const y1 = cy + r * Math.sin(startA);
    const x2 = cx + r * Math.cos(endA);
    const y2 = cy + r * Math.sin(endA);
    const largeArc = endA - startA > Math.PI ? 1 : 0;
    const midA = (fullEndA + startA) / 2;
    const lx = cx + r * 0.6 * Math.cos(midA);
    const ly = cy + r * 0.6 * Math.sin(midA);
    return {
      d: visible ? `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z` : null,
      complete: fullEndA <= sweepEnd + 0.0001,
      label: ((s.value / total) * 100).toFixed(1),
      lx, ly,
      ...s,
    };
  });

  return (
    <div ref={wrapRef} className='relative inline-block'>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size} height={size}
      >
        {paths.map((p, i) => {
          if (!p.d) return null;
          const isActive  = focused === i;
          const isDimmed  = focused != null && !isActive;
          const clickable = !!onSliceClick;
          return (
            <g key={i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSliceClick?.(i)}
              style={{ cursor: clickable ? 'pointer' : 'default' }}
            >
              <path d={p.d}
                fill={p.color} stroke='white' strokeWidth={1}
                opacity={isDimmed ? 0.5 : 1}
                style={{
                  transition: 'opacity .15s, filter .15s',
                  filter: isActive ? 'brightness(0.9)' : 'none',
                }} />
              {p.complete && Number(p.label) >= 5 && (
                <text x={p.lx} y={p.ly} textAnchor='middle' dominantBaseline='middle'
                  style={{ fontSize: 12, fill: 'white', fontWeight: 600, pointerEvents: 'none' }}>
                  {p.label}%
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <Tooltip x={cx} y={4}>
          <span className='whitespace-nowrap' style={{ color: 'var(--text-content-default)' }}>
            <span style={{ fontWeight: 'var(--type-weight-medium)' }}>{slices[hover].label}</span>
            {' · '}
            <span style={{ fontWeight: 'var(--type-weight-bold)' }}>{slices[hover].value.toFixed(1)}%</span>
          </span>
        </Tooltip>
      )}
    </div>
  );
};
