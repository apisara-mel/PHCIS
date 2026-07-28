import React, { useState } from 'react';

/* MIH BrandRadiusSubdueIconButton — Figma "Brand Radius Subdue Icon Button"
   (node 3871:4640). Pill-shaped low-emphasis (subdued) brand button with a
   leading icon + trailing chevron — a compact icon dropdown trigger. Distinct
   from BrandCircleSubdueIconButton (circle, icon-only): this one is a rounded
   pill (radius/600) that goes fully-round only at xLarge.

   Variant matrix (per Figma):
     Size:   xs (32) / sm (36) / md (40) / lg (44) / xl (52, radius full)
     Style:  fill / outline
     State:  default / hover / active / focus / disabled

   Tokens (all alias from design.md brandPrimaryButton scale — no hex literals):
     • Surface — --surface-brandPrimaryButton-tertiary (Fill rest = brand/p100)
                 --surface-brandPrimaryButton-tertiary-hover  (Fill hover)
                 --surface-brandPrimaryButton-quaternary      (Active + Outline hover base)
                 --surface-brandPrimaryButton-quaternary-hover(Outline hover bg)
                 --surface-disabledButton-tertiary            (Disabled bg)
     • Border  — --border-brandPrimaryButton-tertiary         (Outline rest + focus 4px ring)
                 --border-brandPrimaryButton-quaternary       (Active border)
                 --border-brandPrimaryButton-quaternary-hover (Outline hover border)
                 --border-disabledButton-tertiary             (Disabled border)
     • Icon    — --icon-brandPrimaryButton-default / -default-hover
                 --icon-disablediconButton-default            (Disabled glyph)
     • Geometry— --dim-size-{100,250,300,400,600,700,800,900,1100},
                 --dim-space-{150,200,300,400}, --dim-radius-{600,full}

   `selected` is accepted as a legacy alias of `active`. */

const SIZES = {
  xs: { h: 'var(--dim-size-600, 32px)', icon: 'var(--dim-size-250, 14px)', chev: 'var(--dim-size-100, 8px)',  gap: 'var(--dim-space-150, 6px)',  px: 'var(--dim-space-300, 12px)', radius: 'var(--dim-radius-600, 24px)' },
  sm: { h: 'var(--dim-size-700, 36px)', icon: 'var(--dim-size-300, 16px)', chev: 'var(--dim-size-200, 12px)', gap: 'var(--dim-space-150, 6px)',  px: 'var(--dim-space-300, 12px)', radius: 'var(--dim-radius-600, 24px)' },
  md: { h: 'var(--dim-size-800, 40px)', icon: 'var(--dim-size-400, 20px)', chev: 'var(--dim-size-200, 12px)', gap: 'var(--dim-space-200, 8px)',  px: 'var(--dim-space-300, 12px)', radius: 'var(--dim-radius-600, 24px)' },
  lg: { h: 'var(--dim-size-900, 44px)', icon: 'var(--dim-size-400, 20px)', chev: 'var(--dim-size-250, 14px)', gap: 'var(--dim-space-300, 12px)', px: 'var(--dim-space-400, 16px)', radius: 'var(--dim-radius-600, 24px)' },
  xl: { h: 'var(--dim-size-1100, 52px)', icon: 'var(--dim-size-400, 20px)', chev: 'var(--dim-size-250, 14px)', gap: 'var(--dim-space-300, 12px)', px: 'var(--dim-space-400, 16px)', radius: 'var(--dim-radius-full, 9999px)' },
};

const Sym = ({ name, size, color, weight = 400 }) => (
  <span
    className='material-symbols-outlined transition-colors duration-200 ease-out'
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontSize: size,
      color,
      lineHeight: 1,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      fontVariationSettings: `'FILL' 0, 'wght' ${weight}, 'GRAD' 0, 'opsz' 24`,
    }}
    aria-hidden
  >
    {name}
  </span>
);

const resolveStyles = ({ variant, isHover, active, focused, disabled }) => {
  if (disabled) {
    return {
      bg: 'var(--surface-disabledButton-tertiary)',
      border: variant === 'outline'
        ? 'var(--dim-stroke-100) solid var(--border-disabledButton-tertiary)'
        : 'none',
      icon: 'var(--icon-disabledButton-tertiary, var(--icon-disablediconButton-default))',
    };
  }
  if (active) {
    /* Active — quaternary surface + 1px quaternary border (both styles). */
    return {
      bg: 'var(--surface-brandPrimaryButton-quaternary)',
      border: 'var(--dim-stroke-100) solid var(--border-brandPrimaryButton-quaternary)',
      icon: 'var(--icon-brandPrimaryButton-default)',
    };
  }
  if (variant === 'outline') {
    return {
      bg: isHover ? 'var(--surface-brandPrimaryButton-quaternary-hover)' : 'transparent',
      border: focused
        ? 'var(--dim-stroke-400, 4px) solid var(--border-brandPrimaryButton-tertiary)'
        : `var(--dim-stroke-100) solid ${isHover ? 'var(--border-brandPrimaryButton-quaternary-hover)' : 'var(--border-brandPrimaryButton-tertiary)'}`,
      icon: isHover ? 'var(--icon-brandPrimaryButton-default-hover)' : 'var(--icon-brandPrimaryButton-default)',
    };
  }
  /* Fill — Subdue tertiary (brand/p100) rest, tertiary-hover on hover. */
  return {
    bg: isHover ? 'var(--surface-brandPrimaryButton-tertiary-hover)' : 'var(--surface-brandPrimaryButton-tertiary)',
    border: focused
      ? 'var(--dim-stroke-400, 4px) solid var(--border-brandPrimaryButton-tertiary)'
      : 'none',
    icon: isHover ? 'var(--icon-brandPrimaryButton-default-hover)' : 'var(--icon-brandPrimaryButton-default)',
  };
};

const BrandRadiusSubdueIconButton = React.forwardRef(function BrandRadiusSubdueIconButton(
  {
    icon = 'image',
    chevron = true,          /* show the trailing chevron */
    onClick,
    disabled = false,
    active = false,
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
  const isHover = hovered && !disabled;
  const isFocus = focused && !disabled;
  const isActive = active || selected;
  const dim = SIZES[size] || SIZES.md;
  const s = resolveStyles({ variant, isHover, active: isActive, focused: isFocus, disabled });

  return (
    <button
      ref={ref}
      type={type}
      aria-label={ariaLabel}
      aria-pressed={isActive || undefined}
      aria-haspopup={chevron ? 'menu' : undefined}
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
        height: dim.h,
        gap: dim.gap,
        paddingLeft: dim.px,
        paddingRight: dim.px,
        borderRadius: dim.radius,
        border: s.border,
        background: s.bg,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transform: disabled ? 'none' : (pressed ? 'translateY(1px) scale(0.98)' : (hovered ? 'translateY(-1px)' : 'translateY(0)')),
        ...style,
      }}
      {...rest}
    >
      {icon && <Sym name={icon} size={dim.icon} color={s.icon} />}
      {chevron && <Sym name='keyboard_arrow_down' size={dim.chev} color={s.icon} />}
    </button>
  );
});

export default BrandRadiusSubdueIconButton;
