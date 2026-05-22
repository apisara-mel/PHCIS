import React, { useState } from 'react';

/* MIH DangerIconButton — Figma "Danger Icon Button" (node 2024:3701).
   3 styles (fill / outline / ghost) × 3 sizes × 5 states.

   Tone rule (family-wide):
     • Outline / Ghost icon → `icon/dangerButton/default`
     • Outline border       → `border/dangerButton/default`
     • Only the surface retints on hover
     • Focus → 4px tertiary `outline` (sits OUTSIDE, no layout shift)

   Tokens alias from design.md §4.5 — no hex literals.            */

const SIZES = {
  sm: { side: 36, icon: 16 },
  md: { side: 40, icon: 20 },
  lg: { side: 44, icon: 20 },
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

const FOCUS_OUTLINE = 'var(--dim-stroke-400, 4px) solid var(--border-dangerButton-tertiary)';

const resolveStyles = ({ variant, isHover, active, focused, disabled }) => {
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
  if (active) {
    return {
      bg: 'var(--surface-dangerButton-quaternary)',
      border: `var(--dim-stroke-100) solid var(--border-dangerButton-quaternary)`,
      outline: 'none',
      icon: 'var(--icon-dangerButton-default)',
    };
  }
  if (variant === 'outline') {
    return {
      bg: isHover ? 'var(--surface-dangerButton-quaternary)' : 'transparent',
      border: 'var(--dim-stroke-100) solid var(--border-dangerButton-default)',
      outline: focused ? FOCUS_OUTLINE : 'none',
      icon: 'var(--icon-dangerButton-default)',
    };
  }
  if (variant === 'ghost') {
    return {
      bg: isHover ? 'var(--surface-dangerButton-quaternary-hover)' : 'transparent',
      border: 'none',
      outline: focused ? FOCUS_OUTLINE : 'none',
      icon: 'var(--icon-dangerButton-default)',
    };
  }
  /* fill */
  return {
    bg: isHover ? 'var(--surface-dangerButton-default-hover)' : 'var(--surface-dangerButton-default)',
    border: 'none',
    outline: focused ? FOCUS_OUTLINE : 'none',
    icon: 'var(--icon-dangerButton-on-danger)',
  };
};

const DangerIconButton = React.forwardRef(function DangerIconButton(
  {
    icon,
    onClick,
    disabled = false,
    active = false,
    focused = false,
    hovered: hoveredProp = false,
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
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const isHover = (hovered || hoveredProp) && !disabled;
  const dim = SIZES[size] || SIZES.md;
  const s = resolveStyles({ variant, isHover, active, focused, disabled });
  return (
    <button
      ref={ref}
      type={type}
      aria-label={ariaLabel}
      aria-pressed={active || undefined}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      disabled={disabled}
      aria-disabled={disabled}
      className={`inline-flex items-center justify-center transition-all duration-200 ease-out ${className}`}
      style={{
        width: dim.side, height: dim.side,
        borderRadius: 'var(--dim-radius-200)',
        border: s.border, background: s.bg,
        outline: s.outline,
        outlineOffset: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transform: disabled ? 'none' : (pressed ? 'translateY(1px) scale(0.97)' : (hovered ? 'translateY(-1px)' : 'translateY(0)')),
        ...style,
      }}
      {...rest}
    >
      {icon && <Sym name={icon} size={dim.icon} color={s.icon} />}
    </button>
  );
});

export default DangerIconButton;
