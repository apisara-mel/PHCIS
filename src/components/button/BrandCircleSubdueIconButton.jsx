import React, { useState } from 'react';

/* MIH BrandCircleSubdueIconButton — Figma "Brand Circle Subdue Icon Button"
   (node 2103:645). The only Circle Icon Button family with a true XSmall
   (32) size. Round (border-radius 50%) icon-only button in two flavours:

     • Fill    — brand-tinted surface (brandPrimaryButton/tertiary).
     • Outline — transparent surface + 1px brand-primary border.

   Variant matrix (per Figma):
     Size:   xs (32) / sm (36) / md (40) / lg (44) / xl (52, radius full)
     Style:  fill / outline
     State:  default / hover / active / focus / disabled

   Tokens (all alias from design.md — no hex literals):
     • Surface  — --surface-brandPrimaryButton-tertiary / -tertiary-hover /
                  -quaternary / -quaternary-hover (Active states)
                  --surface-disabledButton-tertiary (Disabled bg)
     • Border   — --border-brandPrimaryButton-tertiary  (focus 4px ring)
                  --border-brandPrimaryButton-quaternary / -quaternary-hover
                  --border-brandPrimary-default         (outline 1px stroke)
                  --border-disabledButton-tertiary      (disabled border)
     • Icon     — --icon-brandPrimaryButton-default
                  --icon-disablediconButton-default     (disabled glyph)
     • Geometry — --dim-stroke-100/-200/-400, --dim-size-250/600/700/800/900

   `selected` is accepted as a legacy alias of `active`.
   `visualActive` reuses the same chrome as `active` (quaternary + border)
   without setting `aria-pressed` — use for transient success (e.g. copy). */

const SIZES = {
  xs: { side: 'var(--dim-size-600)',  icon: 'var(--dim-size-250, 14px)' },  /* 32 / 14 */
  sm: { side: 'var(--dim-size-700)',  icon: 'var(--dim-size-300, 16px)' },  /* 36 / 16 */
  md: { side: 'var(--dim-size-800)',  icon: 'var(--dim-size-400, 20px)' },  /* 40 / 20 */
  lg: { side: 'var(--dim-size-900)',  icon: 'var(--dim-size-400, 20px)' },  /* 44 / 20 */
  xl: { side: 'var(--dim-size-1100, 52px)', icon: 'var(--dim-size-400, 20px)' },  /* X Large — 52 / 20, radius full (Figma 2103:645) */
};

const Sym = ({ name, size, color, weight = 400, fill = 0 }) => (
  <span
    className='material-symbols-outlined transition-colors duration-200 ease-out'
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

const resolveStyles = ({ variant, isHover, active, focused, disabled }) => {
  if (disabled) {
    return {
      bg:     'var(--surface-disabledButton-tertiary)',
      border: variant === 'outline'
        ? `var(--dim-stroke-100) solid var(--border-disabledButton-tertiary)`
        : 'none',
      icon:   'var(--icon-disabledButton-tertiary, var(--icon-disablediconButton-default))',
    };
  }
  if (active) {
    /* Active wins over hover/focus per Figma — quaternary surface +
       1px quaternary border (mouse-hover-on-active deepens by one tier). */
    return {
      bg:     isHover
        ? 'var(--surface-brandPrimaryButton-quaternary-hover)'
        : 'var(--surface-brandPrimaryButton-quaternary)',
      border: `var(--dim-stroke-100) solid ${
        isHover
          ? 'var(--border-brandPrimaryButton-quaternary-hover)'
          : 'var(--border-brandPrimaryButton-quaternary)'
      }`,
      icon:   'var(--icon-brandPrimaryButton-default)',
    };
  }
  if (variant === 'outline') {
    return {
      bg:     isHover
        ? 'var(--surface-brandPrimaryButton-tertiary)'  /* light tint on hover */
        : 'transparent',
      border: focused
        ? `var(--dim-stroke-400, 4px) solid var(--border-brandPrimaryButton-tertiary)`
        : `var(--dim-stroke-100) solid var(--border-brandPrimary-default)`,
      icon:   'var(--icon-brandPrimaryButton-default)',
    };
  }
  /* Fill — Subdue (tertiary = brand/p100). */
  return {
    bg:     isHover
      ? 'var(--surface-brandPrimaryButton-tertiary-hover)'
      : 'var(--surface-brandPrimaryButton-tertiary)',
    border: focused
      ? `var(--dim-stroke-400, 4px) solid var(--border-brandPrimaryButton-tertiary)`
      : 'none',
    icon:   'var(--icon-brandPrimaryButton-default)',
  };
};

const BrandCircleSubdueIconButton = React.forwardRef(function BrandCircleSubdueIconButton(
  {
    icon,
    onClick,
    disabled = false,
    active = false,
    /** Same chrome as `active` (quaternary + border) without `aria-pressed` — e.g. copy success (Figma PHCIS 321:50250). */
    visualActive = false,
    selected = false,        /* legacy alias for active */
    /* Controlled overrides — when omitted, the component tracks hover/focus
       internally. Used by the design-system state-matrix table. */
    hovered: hoveredProp,
    focused: focusedProp,
    type = 'button',
    variant = 'fill',
    size = 'md',
    'aria-label': ariaLabel,
    className = '',
    style = {},
    ...rest
  },
  ref,
) {
  const [hoveredState, setHoveredState] = useState(false);
  const [focusedState, setFocusedState] = useState(false);
  const [pressed, setPressed] = useState(false);
  const hovered = hoveredProp ?? hoveredState;
  const focused = focusedProp ?? focusedState;
  const isHover  = hovered && !disabled;
  const isFocus  = focused && !disabled;
  const isActiveForAria = active || selected;
  const isActiveForStyle = isActiveForAria || visualActive;
  const dim = SIZES[size] || SIZES.md;
  const s = resolveStyles({ variant, isHover, active: isActiveForStyle, focused: isFocus, disabled });
  const isCheckGlyph = icon === 'check';

  return (
    <button
      ref={ref}
      type={type}
      aria-label={ariaLabel}
      aria-pressed={isActiveForAria || undefined}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHoveredState(true)}
      onMouseLeave={() => { setHoveredState(false); setPressed(false); }}
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onFocus={() => setFocusedState(true)}
      onBlur={() => setFocusedState(false)}
      disabled={disabled}
      aria-disabled={disabled}
      className={`inline-flex items-center justify-center transition-all duration-200 ease-out ${className}`}
      style={{
        width: dim.side,
        height: dim.side,
        borderRadius: '50%',
        border: s.border,
        background: s.bg,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transform: disabled
          ? 'none'
          : (pressed ? 'translateY(1px) scale(0.97)' : (hovered ? 'translateY(-1px)' : 'translateY(0)')),
        ...style,
      }}
      {...rest}
    >
      {icon && (
        <Sym
          name={icon}
          size={dim.icon}
          color={s.icon}
          weight={isCheckGlyph ? 600 : 400}
          fill={isCheckGlyph ? 1 : 0}
        />
      )}
    </button>
  );
});

export default BrandCircleSubdueIconButton;
