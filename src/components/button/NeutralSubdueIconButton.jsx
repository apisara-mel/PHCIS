import React, { useState } from 'react';

/* MIH NeutralSubdueIconButton — Figma "Neutral Subdue Icon Button" (node 2024:4516).
   2 styles (fill / outline) × 3 sizes × 5 states.

   Tone rule (family-wide):
     • Icon stays at `icon/neutralButton/default`
     • Outline border stays at `border/neutralButton/tertiary`
     • Only the surface retints on hover
     • Focus → 4px `outline` (sits OUTSIDE, no layout shift)
       Fill uses secondary ring (neutral/400); Outline uses tertiary (neutral/200).

   Tokens alias from design.md §4.5 — no hex literals.            */

const SIZES = {
  sm: { box: 36, icon: 16 },
  md: { box: 40, icon: 20 },
  lg: { box: 44, icon: 20 },
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

const FOCUS_OUTLINE_TERTIARY  = 'var(--dim-stroke-400, 4px) solid var(--border-neutralButton-tertiary)';
const FOCUS_OUTLINE_SECONDARY = 'var(--dim-stroke-400, 4px) solid var(--border-neutralButton-secondary)';

const resolveStyles = ({ variant, isHover, active, activeAppearance, focused, disabled }) => {
  if (disabled) {
    return {
      bg: 'var(--surface-disabledButton-tertiary)',
      border: variant === 'outline'
        ? `var(--dim-stroke-100) solid var(--border-disabledButton-tertiary)`
        : 'none',
      outline: 'none',
      icon: 'var(--icon-disabledButton-tertiary)',
    };
  }
  /* Toolbar toggle — active tool uses Figma Focus (outline ring), not Selected fill. */
  if (active && activeAppearance === 'focus') {
    if (variant === 'outline') {
      return {
        bg: isHover ? 'var(--surface-neutralButton-quaternary)' : 'transparent',
        border: 'var(--dim-stroke-100) solid var(--border-neutralButton-tertiary)',
        outline: FOCUS_OUTLINE_TERTIARY,
        icon: 'var(--icon-neutralButton-default)',
      };
    }
    return {
      bg: isHover
        ? 'var(--surface-neutralButton-secondary-hover)'
        : 'var(--surface-neutralButton-secondary)',
      border: 'none',
      outline: FOCUS_OUTLINE_SECONDARY,
      icon: 'var(--icon-neutralButton-default)',
    };
  }
  if (active) {
    return {
      bg: 'var(--surface-neutralButton-quaternary)',
      border: `var(--dim-stroke-100) solid var(--border-neutralButton-quaternary)`,
      outline: 'none',
      icon: 'var(--icon-neutralButton-default)',
    };
  }
  if (variant === 'outline') {
    return {
      bg: isHover ? 'var(--surface-neutralButton-quaternary)' : 'transparent',
      border: 'var(--dim-stroke-100) solid var(--border-neutralButton-tertiary)',
      outline: focused ? FOCUS_OUTLINE_TERTIARY : 'none',
      icon: 'var(--icon-neutralButton-default)',
    };
  }
  /* fill — Subdue (secondary = neutral/200) */
  return {
    bg: isHover ? 'var(--surface-neutralButton-secondary-hover)' : 'var(--surface-neutralButton-secondary)',
    border: 'none',
    outline: focused ? FOCUS_OUTLINE_SECONDARY : 'none',
    icon: 'var(--icon-neutralButton-default)',
  };
};

const NeutralSubdueIconButton = React.forwardRef(function NeutralSubdueIconButton(
  {
    icon,
    onClick,
    disabled = false,
    active = false,
    selected = false, /* legacy alias for active */
    activeAppearance = 'selected', /* 'selected' | 'focus' — focus = outline ring when active */
    focused = false,
    hovered: hoveredProp = false,
    type = 'button',
    variant = 'fill',
    size = 'sm',
    'aria-label': ariaLabel,
    onFocus,
    onBlur,
    children,
    className = '',
    style = {},
    ...rest
  },
  ref,
) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [keyboardFocused, setKeyboardFocused] = useState(false);
  const isHover = (hovered || hoveredProp) && !disabled;
  const isActive = active || selected;
  const dim = SIZES[size] || SIZES.sm;
  const styleType = variant === 'outlined' ? 'outline' : variant;
  const s = resolveStyles({
    variant: styleType,
    isHover,
    active: isActive,
    activeAppearance,
    focused: focused || keyboardFocused,
    disabled,
  });
  return (
    <button
      ref={ref}
      type={type}
      aria-label={ariaLabel}
      aria-pressed={isActive || undefined}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onFocus={(event) => {
        setKeyboardFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setKeyboardFocused(false);
        onBlur?.(event);
      }}
      disabled={disabled}
      aria-disabled={disabled}
      className={`inline-flex items-center justify-center transition-all duration-200 ease-out shrink-0 ${className}`}
      style={{
        width: dim.box, height: dim.box,
        borderRadius: 'var(--dim-radius-200)',
        border: s.border, background: s.bg,
        outline: s.outline,
        outlineOffset: 0,
        color: s.icon,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transform: disabled ? 'none' : (pressed ? 'translateY(1px) scale(0.97)' : (hovered ? 'translateY(-1px)' : 'translateY(0)')),
        ...style,
      }}
      {...rest}
    >
      {icon ? <Sym name={icon} size={dim.icon} color='currentColor' /> : children}
    </button>
  );
});

export default NeutralSubdueIconButton;
