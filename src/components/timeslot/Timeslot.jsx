import React, { useState } from 'react';

/* MIH Timeslot — Figma "Timeslot" (node 2302:11293).

   Pill-shaped chip rendering a time range. 4 states:
     • default  — white bg, neutral border, dark label
     • hover    — brand-p50 surface, neutral border, brand-p700 label
     • selected — WHITE bg, 2 px brand-p600 border, brand-p600 label
                  (Figma 2302:11293 ditched the old filled-fill variant
                  for an outline treatment that reads cleaner against
                  the brand-p50 hover state next to it). Dark mode swaps
                  text+border to brand-p400 via the matching token below.
     • disabled — faded label with optional "(เต็ม)" suffix; no interaction

   Props:
     • value        time range label (e.g. "08:30-09:00") — default 'Timeslot'
     • selected     boolean
     • disabled     boolean
     • disabledLabel suffix shown when disabled (default '(เต็ม)')
     • state        force visual: 'default' | 'hover' | 'selected' | 'disabled'
     • onClick      click handler (ignored when disabled)
     • size         'md' (default, 40h) | 'sm' (36h)

   Tokens alias from design.md; brand surfaces retint via [data-brand].   */

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

const SIZES = {
  md: { h: 40, fontSize: 'var(--type-size-sm)' },
  sm: { h: 36, fontSize: 'var(--type-size-sm)' },
};

const resolveTone = ({ state }) => {
  switch (state) {
    case 'selected':
      /* Outline variant per Figma 2302:11302 — brand-p600 text + 2 px
         brand-p600 border on a white surface, lifted with the shared
         "Brand Drop Shadow Bottom/200" effect so the pill peers above
         its siblings while still reading as an outline. Dark mode
         swaps the brand text/border to brand-p400 via the matching
         token below. */
      return {
        bg:     'var(--surface-timeslot-selected, #FFFFFF)',
        border: 'var(--border-timeslot-selected, var(--brand-p600))',
        text:   'var(--text-timeslot-selected, var(--brand-p600))',
        borderWidth: 'var(--dim-stroke-200, 2px)',
        shadow: 'var(--shadow-brand-drop-bottom-200)',
      };
    case 'hover':
      return {
        bg:     'var(--surface-timeslot-hover, var(--brand-p50))',
        border: 'var(--border-timeslot-default, var(--border-brandPrimary-quaternary, #E2F3EB))',
        text:   'var(--text-timeslot-hover, var(--brand-p700))',
      };
    case 'disabled':
      return {
        bg:     'var(--surface-timeslot-disabled, #FAFCFA)',
        border: 'transparent',
        text:   'var(--text-timeslot-disabled, var(--brand-p100, #E2F3EB))',
      };
    default:
      return {
        bg:     'var(--surface-timeslot-default, #FFFFFF)',
        border: 'var(--border-timeslot-default, var(--border-brandPrimary-quaternary, #E2F3EB))',
        text:   'var(--text-timeslot-default, #4D5358)',
      };
  }
};

const Timeslot = React.forwardRef(function Timeslot(
  {
    value = 'Timeslot',
    selected = false,
    disabled = false,
    disabledLabel = '(เต็ม)',
    state,
    onClick,
    size = 'md',
    type = 'button',
    'aria-label': ariaLabel,
    className = '',
    style = {},
    ...rest
  },
  ref,
) {
  const [internalHover, setInternalHover] = useState(false);
  const effectiveState = state || (
    disabled && selected ? 'selected'
    : disabled ? 'disabled'
    : selected ? 'selected'
    : internalHover ? 'hover'
    : 'default'
  );
  const isDisabled = disabled;
  const tone = resolveTone({ state: effectiveState });
  const dim = SIZES[size] || SIZES.md;

  const label = isDisabled && disabledLabel ? `${value} ${disabledLabel}` : value;

  return (
    <button
      ref={ref}
      type={type}
      role='button'
      aria-pressed={effectiveState === 'selected' || undefined}
      aria-disabled={isDisabled || undefined}
      aria-label={ariaLabel}
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
      onMouseEnter={() => !state && !disabled && setInternalHover(true)}
      onMouseLeave={() => !state && setInternalHover(false)}
      className={`inline-flex items-center justify-center whitespace-nowrap ${className}`}
      style={{
        height: dim.h,
        minWidth: 120,
        paddingLeft:  'var(--dim-space-400)',
        paddingRight: 'var(--dim-space-400)',
        borderRadius: 'var(--dim-radius-200)',
        background: tone.bg,
        /* Selected state uses a 2 px outline (Figma 2302:11293); other
           states keep the 1 px hairline. The selected tone explicitly
           returns a `borderWidth` override. */
        border: `${tone.borderWidth ?? 'var(--dim-stroke-100, 1px)'} solid ${tone.border}`,
        color: tone.text,
        /* Brand Drop Shadow Bottom/200 — only painted on the Selected
           state (Figma 2302:11302). Other states leave the shadow
           token unset so the chip stays flat. */
        boxShadow: tone.shadow ?? 'none',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--type-family-body)',
        fontSize: dim.fontSize,
        fontWeight: 'var(--type-weight-medium)',
        lineHeight: 1.5,
        outline: 'none',
        boxSizing: 'border-box',
        transition: [
          `background-color 160ms ${EASE}`,
          `border-color 160ms ${EASE}`,
          `color 160ms ${EASE}`,
          /* `box-shadow` joins the transition list so the brand lift
             on Selected fades in/out instead of snapping when the
             doctor toggles a slot. */
          `box-shadow 200ms ${EASE}`,
        ].join(', '),
        ...style,
      }}
      {...rest}
    >
      {label}
    </button>
  );
});

export default Timeslot;
