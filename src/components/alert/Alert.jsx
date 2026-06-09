import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Badge from '@/components/badge/Badge';

/* MIH Alert — Figma node 297:59 (Large Alert ✅ · MIH Design System Foundation).
   Earlier draft referenced 325:2623; superseded by the ✅-approved set 297:59.
   See design.md §4.1/4.2/4.3 for the alert token set. Four tones — info,
   success, warning, error — share one layout: leading icon · content stack
   (title + subtext + optional indicator group + optional badge group +
   optional detail card) · optional vertical scrollbar · optional X close.

   All visual values come from semantic tokens:
     --surface-alert-{tone} · --border-alert-{tone} · --text-alert-{tone}
     --surface-pill-{blue,green,red,teal} · --text-pill-{...} (badges)
     --surface-alertdialog-default                       (detail card bg)
     --text-content-{default,secondary}                  (indicator + detail)
     --dim-space-{050,100,200,300,400} · --dim-radius-200
     --type-family-{body,heading-content} · --type-size-{base,sm,xs}
   No hardcoded colours. */

/* Type → token + leading icon + (optional) badge pill + close-hover +
   scrollbar-pill mapping.
   `closeHoverBg`     aliases `background/{tone}/tertiary-hover` (Figma 3064:4984).
   `scrollbarBarBg`   aliases `surface/scrollBar/{tone}-bar`     (alert border tier).
   `scrollbarPillBg`  aliases `surface/scrollBar/{tone}-pill`    (300-shade thumb).
   See design.md "Alert · Scrollbar" table. */
const TONES = {
  info:    { surface: 'var(--surface-alert-info)',    border: 'var(--border-alert-info)',    text: 'var(--text-alert-info)',    icon: 'info',
             badge: { bg: 'var(--surface-pill-blue)',  fg: 'var(--text-pill-blue)'  },
             closeHoverBg:    'var(--background-info-tertiary-hover)',
             scrollbarBarBg:  'var(--surface-scrollbar-info-bar)',
             scrollbarPillBg: 'var(--surface-scrollbar-info-pill)' },
  success: { surface: 'var(--surface-alert-success)', border: 'var(--border-alert-success)', text: 'var(--text-alert-success)', icon: 'check_circle',
             badge: { bg: 'var(--surface-pill-teal)',  fg: 'var(--text-pill-teal)'  },
             closeHoverBg:    'var(--background-positive-tertiary-hover)',
             scrollbarBarBg:  'var(--surface-scrollbar-success-bar)',
             scrollbarPillBg: 'var(--surface-scrollbar-success-pill)' },
  warning: { surface: 'var(--surface-alert-warning)', border: 'var(--border-alert-warning)', text: 'var(--text-alert-warning)', icon: 'warning',
             badge: { bg: 'var(--surface-pill-orange)', fg: 'var(--text-pill-orange)' },
             closeHoverBg:    'var(--background-warning-tertiary-hover)',
             scrollbarBarBg:  'var(--surface-scrollbar-warning-bar)',
             scrollbarPillBg: 'var(--surface-scrollbar-warning-pill)' },
  error:   { surface: 'var(--surface-alert-error)',   border: 'var(--border-alert-error)',   text: 'var(--text-alert-error)',   icon: 'cancel',
             badge: { bg: 'var(--surface-pill-red)',   fg: 'var(--text-pill-red)'   },
             closeHoverBg:    'var(--background-danger-tertiary-hover)',
             scrollbarBarBg:  'var(--surface-scrollbar-error-bar)',
             scrollbarPillBg: 'var(--surface-scrollbar-error-pill)' },
};

const Sym = ({ name, size = 20, color, weight = 400, fill = 0 }) => (
  <span
    className='material-symbols-outlined'
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontSize: size,
      color,
      lineHeight: 1,
      display: 'inline-flex',
      fontVariationSettings: `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' 0, 'opsz' 24`,
    }}
    aria-hidden
  >
    {name}
  </span>
);

/* Indicator dot · 8px filled circle in the alert tone.                    */
const IndicatorDot = ({ tone }) => (
  <span
    aria-hidden
    style={{
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: TONES[tone].text,
      flexShrink: 0,
    }}
  />
);

const IndicatorRow = ({ tone, items }) => (
  <div
    className='flex flex-wrap items-center'
    style={{ gap: 'var(--dim-space-300)', width: '100%' }}
  >
    {items.map((label, i) => (
      <span
        key={`${label}-${i}`}
        className='inline-flex items-center'
        style={{
          gap: 'var(--dim-space-100)',
          color: 'var(--text-content-default)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
          lineHeight: 1.5,
          whiteSpace: 'nowrap',
        }}
      >
        <IndicatorDot tone={tone} />
        {label}
      </span>
    ))}
  </div>
);

/* Each Alert tone maps directly to a Badge `style` (info/success/warning/error),
   so the badge row is just a wrap-flex of <Badge size='small'> per item. */
const BadgeRow = ({ tone, badges }) => (
  <div
    className='flex flex-wrap items-center'
    style={{ gap: 'var(--dim-space-100)', width: '100%' }}
  >
    {badges.map((label, i) => (
      <Badge key={`${label}-${i}`} style={tone} size='small'>{label}</Badge>
    ))}
  </div>
);

const DetailCard = ({ tone, children }) => (
  <div
    className='w-full'
    style={{
      maxWidth: 448,
      minWidth: 0,
      padding: 'var(--dim-space-300)',
      background: 'var(--surface-alertdialog-default)',
      border: `var(--dim-stroke-100) solid ${TONES[tone].border}`,
      borderRadius: 'var(--dim-radius-200)',
      color: 'var(--text-content-secondary)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-sm)',
      lineHeight: 1.5,
    }}
  >
    {children}
  </div>
);

/* 4px vertical pill scrollbar — Figma 2496:5204.
   Bar bg uses `surface/scrollBar/{tone}-bar` (100-shade); the thumb pill
   uses `surface/scrollBar/{tone}-pill` (300-shade — lighter than the alert
   text token that we previously stretched into duty).

   Thumb height + top are computed live from the scroll container's
   `clientHeight / scrollHeight` and `scrollTop / scrollHeight` ratios so
   the thumb mirrors the actual scroll position. When content fits without
   scrolling (`thumbPct === 100`) the thumb fills the bar — visually
   indicating "no overflow". */
const ScrollBar = ({ tone, thumbPct = 100, topPct = 0 }) => (
  <div
    aria-hidden
    className='self-stretch shrink-0 relative'
    style={{
      width: 4,
      borderRadius: 'var(--dim-radius-500, 16px)',
      background: TONES[tone].scrollbarBarBg,
      minHeight: 60,
    }}
  >
    <span
      style={{
        position: 'absolute',
        top: `${topPct}%`,
        left: 'var(--dim-space-0)',
        width: '100%',
        height: `${thumbPct}%`,
        borderRadius: 'var(--dim-radius-full, 9999px)',
        background: TONES[tone].scrollbarPillBg,
        transition: 'height 80ms linear, top 0s linear',
      }}
    />
  </div>
);

/* Close (X) button — Figma 3064:4984.
   2 states (Default · Hover) × 4 types (info / success / warning / error).
   Default: transparent bg, icon = `--text-alert-{tone}`.
   Hover  : bg = `--background-{tone}/tertiary-hover`, icon colour unchanged. */
const CloseButton = ({ tone, onClose }) => {
  const [hover, setHover] = useState(false);
  const t = TONES[tone];
  return (
    <button
      type='button'
      aria-label='Close alert'
      onClick={onClose}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className='shrink-0 inline-flex items-center justify-center'
      style={{
        width: 24,
        height: 24,
        borderRadius: 'var(--dim-radius-200)',
        background: hover ? t.closeHoverBg : 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: t.text,
        transition: 'background-color 150ms ease',
      }}
    >
      <Sym name='close' size={16} color='currentColor' weight={500} />
    </button>
  );
};

/* ── Alert ──────────────────────────────────────────────── */

const Alert = ({
  /* Figma "Type" property — 'info' | 'success' | 'warning' | 'destructive'.
     The codebase historically used 'error' for the destructive tone; both
     spellings are accepted so legacy callers keep working.                */
  type = 'info',
  title,
  subtext,
  indicators,              // string[] | undefined
  badges,                  // string[] | undefined
  detail,                  // ReactNode | string | undefined
  /* Figma "Show *" property panel toggles — each defaults to `true` so the
     section appears whenever content is provided. Pass `false` to force the
     slot off even when content is set (useful for component-library demos).
       Show icon          → showIcon
       Show Subtext       → showSubtext
       Show Detail        → showDetail
       Show Badge         → showBadge
       Show Scroll bar    → showScrollBar
       Show indicator     → showIndicator
       Show x button      → showCloseButton                                */
  showIcon = true,
  showSubtext = true,
  showDetail = true,
  showBadge = true,
  showScrollBar = false,
  showIndicator = true,
  showCloseButton,         // boolean | undefined — auto-derives from `onClose` when undefined
  onClose,                 // () => void
  maxContentHeight = 280,  // px · content scrolls when it exceeds this height.
                           // Pass `null` (or 0) to disable bounded scrolling.
  className = '',
  style,
}) => {
  const resolvedType = type === 'destructive' ? 'error' : type;
  const tone = TONES[resolvedType] || TONES.info;
  /* Auto-show the X when the caller wires up onClose; explicit
     `showCloseButton` overrides (lets demos render the X without a handler). */
  const renderCloseButton = showCloseButton !== undefined ? showCloseButton : !!onClose;

  /* Live-synced scroll state for the external decorative ScrollBar.
     `thumbPct === 100` means content fits without scrolling. */
  const scrollRef = useRef(null);
  const [scroll, setScroll] = useState({ thumbPct: 100, topPct: 0 });

  const recompute = () => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight <= clientHeight + 1) {
      setScroll({ thumbPct: 100, topPct: 0 });
      return;
    }
    setScroll({
      thumbPct: (clientHeight / scrollHeight) * 100,
      topPct:   (scrollTop   / scrollHeight) * 100,
    });
  };

  useLayoutEffect(() => {
    recompute();
  }, [maxContentHeight, indicators, badges, detail, subtext, title]);

  /* ResizeObserver keeps the synced thumb correct when the alert reflows
     (e.g. badge wrap on viewport change). Falls back silently in unsupported
     environments. */
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return undefined;
    const el = scrollRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxContentHeight]);

  const scrollAreaClass = showScrollBar
    ? 'flex flex-col flex-1 min-w-0 scrollbar-hide-native'
    : 'flex flex-col flex-1 min-w-0';

  return (
    <div
      role='alert'
      className={`flex w-full ${className}`}
      style={{
        gap: 'var(--dim-space-300)',
        padding: 'var(--dim-space-400)',
        maxWidth: 768,
        minWidth: 224,
        background: tone.surface,
        border: `var(--dim-stroke-100) solid ${tone.border}`,
        borderRadius: 'var(--dim-radius-200)',
        alignItems: 'flex-start',
        ...style,
      }}
    >
      {showIcon && (
        <div
          className='shrink-0'
          style={{ width: 20, paddingTop: 'var(--dim-space-050, 2px)' }}
        >
          <Sym name={tone.icon} size={20} color={tone.text} weight={500} fill={1} />
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={recompute}
        className={scrollAreaClass}
        style={{
          gap: 'var(--dim-space-200)',
          maxHeight: maxContentHeight ? `${maxContentHeight}px` : undefined,
          overflowY: maxContentHeight ? 'auto' : 'visible',
        }}
      >
        <div
          className='flex flex-col w-full'
          style={{ gap: 'var(--dim-space-100)', color: tone.text }}
        >
          {title && (
            <p
              style={{
                margin: 'var(--dim-space-0)',
                fontFamily: 'var(--type-family-heading-content)',
                fontWeight: 'var(--type-weight-bold)',
                fontSize: 'var(--type-size-base)',
                lineHeight: 1.5,
                color: tone.text,
              }}
            >
              {title}
            </p>
          )}
          {showSubtext && subtext && (
            <p
              style={{
                margin: 'var(--dim-space-0)',
                fontFamily: 'var(--type-family-body)',
                fontWeight: 'var(--type-weight-regular)',
                fontSize: 'var(--type-size-sm)',
                lineHeight: 1.5,
                color: tone.text,
              }}
            >
              {subtext}
            </p>
          )}

          {showIndicator && indicators && indicators.length > 0 && (
            <IndicatorRow tone={resolvedType} items={indicators} />
          )}
          {showBadge && badges && badges.length > 0 && (
            <BadgeRow tone={resolvedType} badges={badges} />
          )}
        </div>

        {showDetail && detail && <DetailCard tone={resolvedType}>{detail}</DetailCard>}
      </div>

      {showScrollBar && (
        <ScrollBar
          tone={resolvedType}
          thumbPct={scroll.thumbPct}
          topPct={scroll.topPct}
        />
      )}
      {renderCloseButton && <CloseButton tone={resolvedType} onClose={onClose} />}
    </div>
  );
};

export default Alert;
