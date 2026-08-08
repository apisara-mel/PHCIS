import React, { useState } from 'react';
import RadioBox from '@/components/radio/RadioBox';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';

/* MIH RadioButton — Figma "Radio Button" (2860:3497; PHCIS Appointment
   4046:18305 — same component instance, DS alias `Radio Button`). Card-style
   selectable button with optional border + a generous content matrix:

     • Radio dot (showRadio)
     • Circle icon  — 36px brand-tinted circle (showCircleIcon)
     • Inline icon  — 24px symbol next to title (showIcon)
     • Title        — Radio label text  (showTitle)
     • BadgeTitle   — red colorful badge inline with title (showBadgeTitle)
     • Description  — caption text below title (showDescription)
     • Trailing Badge — grey colorful badge at the right (showBadge)
     • Trailing check — `check_circle` when selected (showTrailingCheck)
     • Palette      — 3-swatch color preview row (showPalette)

   State auto-derives from {checked, disabled, hover} — pass `state`
   only to force a specific look (e.g. story grids in Component Library).

   Selected card chrome (border=true, single-select): brand stroke + trailing
   `check_circle` so the chosen option reads clearly without relying on the
   radio dot alone (card rows often set `showRadio={false}`).

   All tokens alias from design.md. Border + container retint via
   `[data-brand]` because they reuse brandprimarybutton-tertiary.       */

/* Default 36px circle holding a stethoscope glyph — matches the
   Figma "Circle_Stethoscope" preset. Override via the `circleIcon`
   prop with any ReactNode of the same dimension. */
const DefaultCircleIcon = ({ name = 'stethoscope', size = 20 }) => (
  <span
    className='inline-flex items-center justify-center shrink-0'
    style={{
      width: 36,
      height: 36,
      borderRadius: 'var(--dim-radius-full, 9999px)',
      background: 'var(--surface-brandPrimary-quaternary)',
      color: 'var(--text-brandPrimary-default)',
    }}
  >
    <Icon name={name} size={size} />
  </span>
);

/* 60px palette swatch row (20 / 20 / 40) showing brand p700 / p300 / p100.
   Renders only when showPalette=true. */
const Palette = () => (
  <span
    className='inline-flex items-center overflow-hidden shrink-0'
    style={{ height: 36, borderRadius: 'var(--dim-radius-100)' }}
  >
    <span style={{ width: 20, height: '100%', background: 'var(--brand-p700)' }} />
    <span style={{ width: 20, height: '100%', background: 'var(--brand-p300)' }} />
    <span style={{ width: 40, height: '100%', background: 'var(--brand-p100)' }} />
  </span>
);

/* Inline 24px symbol slot — defaults to a smile glyph (Figma uses
   `sentiment_satisfied`; the project Icon set maps this to `smile`).
   Color aliases `--icon-neutral-default` per Figma node 2831:6734
   (icon/neutral/default → neutral/700 #4D5358).                       */
const InlineIcon = ({ name = 'smile', size = 24 }) => (
  <span
    className='inline-flex items-center justify-center shrink-0'
    style={{ color: 'var(--icon-neutral-default)' }}
    aria-hidden
  >
    <Icon name={name} size={size} />
  </span>
);

/* Red "BadgeTitle" chip — short text inline with the title row.
   Aliases the canonical ColorfulBadge (Figma 2076:8413, style=red). */
const BadgeTitle = ({ children = 'Text' }) => (
  <ColorfulBadge style='red' size='small'>{children}</ColorfulBadge>
);

/* Trailing grey "Badge" pill on the right edge of the card.
   Aliases the canonical ColorfulBadge (style=grey).                  */
const TrailingBadge = ({ children = 'Text' }) => (
  <ColorfulBadge style='grey' size='small'>{children}</ColorfulBadge>
);

/* Card stroke — Figma 2860:3497 / design.md §6.21.3 (.rb).
   Anti-jump: 2px transparent border + inset ring (1px default/disabled,
   2px hover/selected). Outer drop shadow omitted — reads as white halo on
   white surfaces. */
const RB_LAYOUT_BORDER = '2px solid transparent';
const RB_INSET_DEFAULT = 'inset 0 0 0 var(--dim-stroke-100) var(--border-neutralbutton-tertiary)';
const RB_INSET_HOVER = 'inset 0 0 0 var(--dim-stroke-200) var(--border-brandprimarybutton-tertiary)';
const RB_INSET_SELECTED = 'inset 0 0 0 var(--dim-stroke-200) var(--border-brandprimarybutton-default)';

const resolveCardChrome = ({ state, border }) => {
  if (!border) return { border: 'none', boxShadow: 'none' };
  switch (state) {
    case 'hover':
      return { border: RB_LAYOUT_BORDER, boxShadow: RB_INSET_HOVER };
    case 'selected':
      return { border: RB_LAYOUT_BORDER, boxShadow: RB_INSET_SELECTED };
    case 'disabled-checked':
    case 'disabled-unchecked':
    default:
      return { border: RB_LAYOUT_BORDER, boxShadow: RB_INSET_DEFAULT };
  }
};

const RadioButton = React.forwardRef(function RadioButton(
  {
    /* Behavioral props */
    checked = false,
    disabled = false,
    onChange,
    value,
    name,
    /* State override — used by component library grids; runtime usage
       should rely on auto-derivation from checked + disabled + hover. */
    state: stateProp,
    /* Layout */
    border = true,
    /* Content slots */
    title = 'Radio label',
    description = 'Optional description',
    badge,
    badgeTitle,
    circleIcon,
    icon,
    palette,
    /* Show flags — mirror Figma property panel */
    showRadio = true,
    showCircleIcon = true,
    showIcon = true,
    showTitle = true,
    showBadge = true,
    showDescription = true,
    showBadgeTitle = true,
    showPalette = false,
    /* Trailing check_circle on selected — default on for card radios. */
    showTrailingCheck = true,
    /* Pass-through */
    className = '',
    style = {},
    ...rest
  },
  ref,
) {
  const [hover, setHover] = useState(false);
  const state = stateProp ?? (
    disabled
      ? (checked ? 'disabled-checked' : 'disabled-unchecked')
      : checked
        ? 'selected'
        : hover
          ? 'hover'
          : 'default'
  );

  const isDisabled = state === 'disabled-checked' || state === 'disabled-unchecked';
  const radioChecked = state === 'selected' || state === 'disabled-checked';
  const radioHover = state === 'hover';
  const titleColor = isDisabled
    ? 'var(--text-content-quaternary)'
    : radioChecked
      ? 'var(--text-brandPrimary-default, #007549)'
      : 'var(--text-content-default)';
  const descColor = isDisabled
    ? 'var(--text-content-quaternary)'
    : 'var(--text-content-tertiary)';
  const showSelectedCheck = showTrailingCheck && radioChecked;

  const handleClick = () => {
    if (isDisabled) return;
    onChange && onChange(value !== undefined ? value : !checked);
  };

  const handleKeyDown = (e) => {
    if (isDisabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleClick();
    }
  };

  const { border: borderCss, boxShadow } = resolveCardChrome({ state, border });

  return (
    <div
      ref={ref}
      role='radio'
      aria-checked={radioChecked}
      aria-disabled={isDisabled || undefined}
      tabIndex={isDisabled ? -1 : 0}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`inline-flex items-center ${className}`}
      style={{
        minWidth: 40,
        minHeight: border ? 56 : 40,
        gap: 'var(--dim-space-200)',
        paddingLeft: 'var(--dim-space-400)',
        paddingRight: 'var(--dim-space-400)',
        paddingTop: 'var(--dim-space-200)',
        paddingBottom: 'var(--dim-space-200)',
        background: 'var(--surface-neutralbutton-quinary)',
        border: borderCss,
        boxShadow,
        borderRadius: 'var(--dim-radius-200)',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        userSelect: 'none',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
        boxSizing: 'border-box',
        ...style,
      }}
      {...rest}
    >
      {/* Hidden native input keeps the card form-submittable */}
      {name && (
        <input
          type='radio'
          name={name}
          value={value}
          checked={radioChecked}
          disabled={isDisabled}
          onChange={handleClick}
          className='sr-only'
          tabIndex={-1}
        />
      )}

      {showRadio && (
        <RadioBox checked={radioChecked} hover={radioHover} disabled={isDisabled} />
      )}

      {showCircleIcon && (circleIcon ?? <DefaultCircleIcon />)}

      {showIcon && (icon ?? <InlineIcon />)}

      {showPalette && (palette ?? <Palette />)}

      <span className='flex flex-col items-start justify-center min-w-0'>
        {showTitle && title != null && (
          <span
            style={{
              color: titleColor,
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              fontWeight: 'var(--type-weight-regular)',
              lineHeight: 1.5,
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </span>
        )}
        {showBadgeTitle && (badgeTitle != null ? badgeTitle : <BadgeTitle />)}
        {showDescription && description != null && (
          <span
            style={{
              color: descColor,
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              fontWeight: 'var(--type-weight-regular)',
              lineHeight: 1.5,
              whiteSpace: 'nowrap',
            }}
          >
            {description}
          </span>
        )}
      </span>

      {showBadge && (badge != null ? badge : <TrailingBadge />)}

      {showSelectedCheck && (
        <Icon
          name='check_circle'
          size={18}
          className='shrink-0'
          style={{
            marginLeft: 'auto',
            color: isDisabled
              ? 'var(--text-content-quaternary)'
              : 'var(--text-brandPrimary-default, #007549)',
          }}
          aria-hidden
        />
      )}
    </div>
  );
});

export default RadioButton;
