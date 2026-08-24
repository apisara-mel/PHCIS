import React, { useState } from 'react';
import { useAliasedButtonSize } from '@/components/button/ButtonSizeAliasContext';

/* MIH BrandCircleIconButton — Figma "Brand Circle Icon Button" (node 2103:548).
   Round (50%) variant of BrandIconButton: 3 styles (fill/outline/ghost) ×
   5 sizes (xs 32 / sm 36 / md 40 / lg 44 / xl 52) × 5 states
   (default/hover/active/focus/disabled) including a
   unique `selected` state — when selected, fill becomes brand-p100 with
   brand-p700 icon, regardless of variant.
   Tokens alias from design.md §4.5 — no hex literals.            */

const SIZES = {
  xs: { side: 'var(--dim-size-600, 32px)', icon: 'var(--dim-size-250, 14px)' },  /* XSmall — Figma 2103:548 (32 / icon 14) */
  sm: { side: 36, icon: 16 },
  md: { side: 40, icon: 20 },
  lg: { side: 44, icon: 20 },
  xl: { side: 'var(--dim-size-1100, 52px)', icon: 20 },  /* X Large — Figma 3853:1018 (52 / icon 20, radius full) */
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
  /* Disabled tokens — design.md §5.1 Brand Button (Fill / Outline / Ghost).
     Fill is the solid dark circle (surface.disabledButton.default #4D5358)
     with on-disabled white icon. */
  if (disabled) {
    if (variant === 'outline') {
      return {
        bg: 'var(--surface-disabledButton-quinary, #FFFFFF)',
        border: 'var(--dim-stroke-100) solid var(--border-disabledButton-default, #636B72)',
        icon: 'var(--icon-disabledButton-default, #4D5358)',
      };
    }
    if (variant === 'ghost') {
      return {
        bg: 'var(--surface-disabledButton-tertiary, #F4F5F5)',
        border: 'none',
        icon: 'var(--icon-disabledButton-default, #4D5358)',
      };
    }
    return {
      bg: 'var(--surface-disabledButton-default, #4D5358)',
      border: 'none',
      icon: 'var(--icon-disabledButton-on-disabled, #FFFFFF)',
    };
  }
  if (selected) {
    return {
      bg: isHover ? 'var(--surface-brandPrimaryButton-tertiary-hover)' : 'var(--surface-brandPrimaryButton-tertiary)',
      border: focused
        ? 'var(--dim-stroke-400, 4px) solid var(--border-brandPrimaryButton-tertiary, var(--brand-p100))'
        : 'none',
      icon: isHover ? 'var(--icon-brandPrimaryButton-default-hover, var(--brand-p800))' : 'var(--icon-brandprimarybutton-default, var(--brand-p700))',
    };
  }
  if (variant === 'outline') {
    return {
      bg: isHover ? 'var(--surface-brandPrimaryButton-quinary-hover)' : 'var(--surface-brandPrimaryButton-quinary)',
      border: focused
        ? 'var(--dim-stroke-400, 4px) solid var(--border-brandPrimaryButton-tertiary, var(--brand-p100))'
        : `var(--dim-stroke-100) solid ${isHover ? 'var(--border-brandPrimaryButton-default-hover, var(--brand-p800))' : 'var(--border-brandPrimaryButton-default, var(--brand-p700))'}`,
      icon: isHover ? 'var(--icon-brandPrimaryButton-default-hover, var(--brand-p800))' : 'var(--icon-brandprimarybutton-default, var(--brand-p700))',
    };
  }
  if (variant === 'ghost') {
    return {
      bg: isHover ? 'var(--surface-brandPrimaryButton-quaternary-hover)' : 'var(--surface-brandPrimaryButton-quaternary)',
      border: focused
        ? 'var(--dim-stroke-400, 4px) solid var(--border-brandPrimaryButton-tertiary, var(--brand-p100))'
        : 'none',
      icon: isHover ? 'var(--icon-brandPrimaryButton-default-hover, var(--brand-p800))' : 'var(--icon-brandprimarybutton-default, var(--brand-p700))',
    };
  }
  return {
    bg: isHover ? 'var(--surface-brandPrimaryButton-hover)' : 'var(--surface-brandPrimaryButton-default)',
    border: focused
      ? 'var(--dim-stroke-400, 4px) solid var(--border-brandPrimaryButton-tertiary, var(--brand-p100))'
      : 'none',
    icon: 'var(--icon-brandPrimaryButton-on-brand, #FFFFFF)',
  };
};

const BrandCircleIconButton = React.forwardRef(function BrandCircleIconButton(
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
  const resolvedSize = useAliasedButtonSize(size);
  const dim = SIZES[resolvedSize] || SIZES.md;
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
        opacity: 1,
        transform: disabled ? 'none' : (pressed ? 'translateY(1px) scale(0.97)' : (hovered ? 'translateY(-1px)' : 'translateY(0)')),
        ...style,
      }}
      {...rest}
    >
      {icon && <Sym name={icon} size={dim.icon} color={s.icon} />}
    </button>
  );
});

export default BrandCircleIconButton;
