import React, { useState } from 'react';
import Icon from '@/components/icons/Icon';
import Badge from '@/components/badge/Badge';

/* MIH VitalSignTimelineCard — Figma "Group card · Vital Sign Timeline"
   (MIH Design System / Card · node 133:1031). Used inside HistoryTimeline
   aside on OPD Screening / Treatment / MR forms; one card per measurement
   round. Five visual states aligned with Figma:

     • default        — white card (surface/card/100), 1px neutral border
                        (border/card/default · #E2E4E6), no shadow.
     • hover          — white card, 2px **light-brand** border
                        (border/brandprimary/tertiary · #C5EDDA) + brand
                        drop shadow (--shadow-card-hover).
     • selected       — white card, 2px **saturated-brand** border
                        (border/brandprimary/default · brand-p700),
                        chevron-right affordance, brand text on time,
                        brand drop shadow.
     • selected-hover — **brand-tinted** card surface
                        (surface/card/brand-100 · brand-p50) with the
                        same saturated-brand 2px border, chevron, brand
                        text, brand drop shadow. Distinguishes a hovered
                        already-selected row from a fresh hover.
     • disabled       — neutral 1px border, content tinted to
                        content/tertiary, cursor not-allowed and opacity
                        reduced.

   Token contract (design.md §6 + Card section / index.css):
     • surface.card.100                → --surface-card-100         (default/hover/selected card face)
     • surface.card.brand100           → --surface-card-brand100    (selected-hover card face, brand-p50)
     • border.card.default             → --border-card-default      (default 1px stroke)
     • border.brandPrimary.tertiary    → --border-brandPrimary-tertiary  (hover 2px stroke)
     • border.brandprimary.default     → --border-brandprimary-default   (selected / selected-hover 2px stroke)
     • text.brandPrimaryButton.*       → selected time/date
     • text.content.secondary / tertiary — default vitals copy
     • shadow.card.hover               → --shadow-card-hover         (brand-tinted drop shadow on hover / selected / selected-hover)

   API:
     • time     — string ("21:19:27" or "เวลา 21:19:27")
     • date     — string ("6 พฤษภาคม 2569")
     • vitals   — Array<{ label, value }>  rendered as a "label · value" grid
     • badge    — optional pill (e.g. "ผิดปกติ") rendered top-right
     • selected — visually marked as selected (2px border + brand text)
     • disabled — non-interactive, dimmed
     • onClick  — fires unless disabled

   Micro-interaction: border-width + padding changes are **not** CSS-
   transitioned — only border-color eases (150ms). Animating stroke width
   or padding causes subpixel jitter ("กระตุก") on hover despite correct
   final box math (Figma 133:1448). */

const Row = ({ label, value, tone }) => (
  <div className='flex items-center gap-3 w-full text-xs' style={{ color: tone }}>
    <span className='flex-1 min-w-0'>{label}</span>
    <span className='shrink-0 w-[97px]'>{value}</span>
  </div>
);

/* "ผิดปกติ" tag is a small warning StatusBadge — render through the
   shared Badge component so its tokens stay in sync with the rest of the
   app (Figma 302:73 / design.md §4.1). */
const VitalAbnormalBadge = ({ children }) => (
  <Badge style='warning' size='small'>{children}</Badge>
);

const VitalSignTimelineCard = ({
  time,
  date,
  vitals = [],
  badge,
  selected = false,
  disabled = false,
  onClick,
  className = '',
  style,
  ...rest
}) => {
  const [hovered, setHovered] = useState(false);
  /* Five-state resolution per Figma 133:1031 variant matrix:
       isHover         — un-selected card under the cursor
       isSelected      — selected card NOT under the cursor
       isSelectedHover — selected card AND under the cursor
     Border-width is always 2px for any non-default active state so we
     never interpolate stroke width (Figma 133:1448 — animating 1→2px
     causes "กระตุก"). */
  const isHover         = hovered  && !disabled && !selected;
  const isSelected      = selected && !disabled && !hovered;
  const isSelectedHover = selected && !disabled &&  hovered;
  const isActive        = isSelected || isSelectedHover;        /* any "selected" branch */
  const isAnyEngaged    = isHover    || isActive;               /* any non-default branch */

  /* Card surface — only selected-hover swaps to the brand-tinted fill;
     default / hover / selected all stay on the white card face. */
  const background = isSelectedHover
    ? 'var(--surface-card-brand100, var(--surface-brandPrimary-quaternary, #F4FBF8))'
    : 'var(--surface-card-100, #FFFFFF)';

  /* Split border so we can transition **border-color only**. Never animate
     border-width or padding together — the browser interpolates fractional
     stroke widths (1→2px) and causes visible "กระตุก" on hover even when the
     final box model is mathematically balanced (Figma 133:1448). Width +
     padding snap instantly; colour eases smoothly. */
  const borderWidth = (() => {
    if (disabled) return 'var(--dim-stroke-100)';
    if (isAnyEngaged) return 'var(--dim-stroke-200)';
    return 'var(--dim-stroke-100)';
  })();

  const borderColor = (() => {
    if (disabled) return 'var(--border-card-default)';
    if (isActive) return 'var(--border-brandprimary-default, var(--border-brandPrimary-default, #007549))';
    if (isHover)  return 'var(--border-brandPrimary-tertiary, #C5EDDA)';
    return 'var(--border-card-default, #E2E4E6)';
  })();

  /* Brand drop shadow on every engaged state — Figma 133:1448 / 133:913 /
     133:1468. --shadow-card-hover composes two PrimaryShadow layers that
     both resolve to `rgb(var(--brand-p600-rgb) / α)`, so the tint swaps
     with the active brand on `<html data-brand="…">`. Disabled never
     elevates. */
  const elevation = (() => {
    if (disabled) return 'none';
    if (isAnyEngaged) return 'var(--shadow-card-hover)';
    return 'none';
  })();

  /* Padding offset: 2px border (any engaged state) uses base padding;
     1px border (default/disabled) adds +1px each side so inner layout
     stays pixel-stable across states. */
  const padCompensate = !disabled && isAnyEngaged ? 0 : 1;

  /* Three-tone text contract — drives time, date, and vitals colour. */
  const tones = (() => {
    if (disabled) {
      return {
        time: 'var(--text-content-tertiary, #858C92)',
        date: 'var(--text-content-tertiary, #858C92)',
        vital: 'var(--text-content-tertiary, #858C92)',
      };
    }
    if (isActive) {
      return {
        time: 'var(--text-brandprimarybutton-default)',
        date: 'var(--text-brandprimarybutton-secondary)',
        vital: 'var(--text-content-secondary, #636B72)',
      };
    }
    return {
      time: 'var(--text-content-secondary, #636B72)',
      date: 'var(--text-content-tertiary, #858C92)',
      vital: 'var(--text-content-tertiary, #858C92)',
    };
  })();

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      aria-pressed={onClick ? !!selected : undefined}
      aria-disabled={disabled || undefined}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => {
        if (disabled || !onClick) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e);
        }
      }}
      className={`w-full flex items-start gap-2 ${className}`}
      style={{
        boxSizing: 'border-box',
        background,
        borderWidth,
        borderStyle: 'solid',
        borderColor,
        boxShadow: elevation,
        /* Animate border-color + box-shadow + background only — NEVER
           border-width. Animating stroke width causes subpixel jitter
           (Figma 133:1448). Background eases for the selected-hover swap. */
        transitionProperty: 'border-color, box-shadow, background-color',
        transitionDuration: '150ms',
        transitionTimingFunction: 'ease-out',
        borderRadius: 'var(--dim-radius-400, 12px)',
        paddingTop:    `calc(var(--dim-space-300) + ${padCompensate}px)`,
        paddingBottom: `calc(var(--dim-space-300) + ${padCompensate}px)`,
        paddingLeft:   `calc(var(--dim-space-300) + ${padCompensate}px)`,
        paddingRight:  `calc(var(--dim-space-300) + ${padCompensate}px)`,
        cursor: disabled ? 'not-allowed' : (onClick ? 'pointer' : 'default'),
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
      {...rest}
    >
      <div className='flex-1 flex flex-col gap-2 min-w-0'>
        {/* Header row — time + date stack on the left, optional badge +
            chevron on the right. */}
        <div className='flex items-start gap-2 w-full'>
          <div className='flex-1 flex flex-col leading-snug min-w-0'>
            <p
              className='text-sm font-bold transition-colors duration-150 ease-out'
              style={{ color: tones.time }}
            >
              {time}
            </p>
            <p
              className='text-xs transition-colors duration-150 ease-out'
              style={{ color: tones.date }}
            >
              {date}
            </p>
          </div>
          {badge && <VitalAbnormalBadge>{badge}</VitalAbnormalBadge>}
          {isActive && (
            <Icon
              name='chevron-right'
              size={16}
              className='shrink-0'
              style={{ color: 'var(--text-content-tertiary, #858C92)' }}
            />
          )}
        </div>

        {/* Vitals grid — each row is "label · value". */}
        <div className='flex flex-col gap-1 w-full'>
          {vitals.map((v, i) => (
            <Row key={i} label={v.label} value={v.value} tone={tones.vital} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default VitalSignTimelineCard;
