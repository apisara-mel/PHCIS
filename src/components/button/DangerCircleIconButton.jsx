import React, { useState } from 'react';

/* MIH DangerCircleIconButton — Figma "Danger Circle Icon Button" (node 3853:1177).
   Danger (red) sibling of BrandCircleIconButton: round (50%) icon-only button
   in 3 styles (fill/outline/ghost) × 5 sizes (xs 32 / sm 36 / md 40 / lg 44 /
   xl 52) × 5 states (default/hover/selected/focus/disabled). X Large is fully
   round (radius/full) with a 20px icon. Selected flips to danger tertiary
   surface + danger icon regardless of variant.
   Tokens alias from design.md §4.5 dangerButton scale — no hex literals.   */

const SIZES = {
  xs: { side: 'var(--dim-size-600, 32px)', icon: 'var(--dim-size-250, 14px)' },  /* XSmall — Figma 3853:1177 (32 / icon 14) */
  sm: { side: 36, icon: 16 },
  md: { side: 40, icon: 20 },
  lg: { side: 44, icon: 20 },
  xl: { side: 'var(--dim-size-1100, 52px)', icon: 20 },  /* X Large — Figma 3853:1177 (52 / icon 20, radius full) */
};

const Sym = ({ name, size, color }) => (
  <span
    className='material-symbols-outlined transition-colors duration-200 ease-out'
    style={{ fontFamily: 'Material Symbols Outlined', fontSize: size, color, lineHeight: 1, display: 'inline-flex' }}
    aria-hidden
  >
    {name}
  </span>
);

const resolveStyles = ({ variant, isHover, selected, focused, disabled }) => {
  if (disabled) {
    return {
      bg: 'var(--surface-disabledButton-default, #E2E4E6)',
      border: variant === 'outline' ? 'var(--dim-stroke-100) solid var(--border-disabledButton-default, #C9CDD0)' : 'none',
      icon: 'var(--icon-disablediconButton-default, #4D5358)',
    };
  }
  if (selected) {
    return {
      bg: isHover ? 'var(--surface-dangerButton-tertiary-hover)' : 'var(--surface-dangerButton-tertiary)',
      border: focused
        ? 'var(--dim-stroke-400, 4px) solid var(--border-dangerButton-tertiary, #FECACA)'
        : 'none',
      icon: isHover ? 'var(--icon-dangerButton-default-hover, #991B1B)' : 'var(--icon-dangerButton-default, #B91C1C)',
    };
  }
  if (variant === 'outline') {
    return {
      bg: isHover ? 'var(--surface-dangerButton-quinary-hover)' : 'var(--surface-dangerButton-quinary)',
      border: focused
        ? 'var(--dim-stroke-400, 4px) solid var(--border-dangerButton-tertiary, #FECACA)'
        : `var(--dim-stroke-100) solid ${isHover ? 'var(--border-dangerButton-default-hover, #B91C1C)' : 'var(--border-dangerButton-default, #DC2626)'}`,
      icon: isHover ? 'var(--icon-dangerButton-default-hover, #991B1B)' : 'var(--icon-dangerButton-default, #B91C1C)',
    };
  }
  if (variant === 'ghost') {
    return {
      bg: isHover ? 'var(--surface-dangerButton-quaternary-hover)' : 'var(--surface-dangerButton-quaternary)',
      border: focused
        ? 'var(--dim-stroke-400, 4px) solid var(--border-dangerButton-tertiary, #FECACA)'
        : 'none',
      icon: isHover ? 'var(--icon-dangerButton-default-hover, #991B1B)' : 'var(--icon-dangerButton-default, #B91C1C)',
    };
  }
  return {
    bg: isHover ? 'var(--surface-dangerButton-default-hover)' : 'var(--surface-dangerButton-default)',
    border: focused
      ? 'var(--dim-stroke-400, 4px) solid var(--border-dangerButton-tertiary, #FECACA)'
      : 'none',
    icon: 'var(--icon-dangerButton-on-danger, #FFFFFF)',
  };
};

const DangerCircleIconButton = React.forwardRef(function DangerCircleIconButton(
  {
    icon,
    onClick,
    disabled = false,
    selected = false,
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
  const dim = SIZES[size] || SIZES.md;
  const s = resolveStyles({ variant, isHover, selected, focused: isFocus, disabled });
  return (
    <button
      ref={ref}
      type={type}
      aria-label={ariaLabel}
      aria-pressed={selected}
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
        width: dim.side, height: dim.side,
        borderRadius: '50%',
        border: s.border, background: s.bg,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled && variant === 'fill' && !selected ? 0.6 : 1,
        transform: disabled ? 'none' : (pressed ? 'translateY(1px) scale(0.97)' : (hovered ? 'translateY(-1px)' : 'translateY(0)')),
        ...style,
      }}
      {...rest}
    >
      {icon && <Sym name={icon} size={dim.icon} color={s.icon} />}
    </button>
  );
});

export default DangerCircleIconButton;
