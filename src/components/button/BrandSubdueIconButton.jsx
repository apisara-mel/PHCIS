import React, { useState } from 'react';

/* MIH BrandSubdueIconButton — Figma "Brand Subdue Icon Button" (node 2024:4352).
   2 styles (fill / outline) × 3 sizes × 5 states.

   Tone rule (family-wide):
     • Icon stays at `icon/brandPrimaryButton/default`
     • Outline border stays at `border/brandPrimaryButton/tertiary`
     • Only the surface retints on hover
     • Focus → 4px tertiary `outline` (sits OUTSIDE the box, no layout shift)

   • Fill default → tertiary surface (brand/p100); Fill hover → tertiary-hover
   • Outline default → transparent; Outline hover → quinary-hover surface
   • Active   → quaternary surface + 1px quaternary border
   • Disabled → disabledButton tertiary

   Tokens alias from design.md §4.5 — no hex literals.                       */

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

const FOCUS_OUTLINE = 'var(--dim-stroke-400, 4px) solid var(--border-brandPrimaryButton-tertiary)';

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
        bg: isHover ? 'var(--surface-brandPrimaryButton-quinary-hover)' : 'transparent',
        border: 'var(--dim-stroke-100) solid var(--border-brandPrimaryButton-tertiary)',
        outline: FOCUS_OUTLINE,
        icon: 'var(--icon-brandPrimaryButton-default)',
      };
    }
    return {
      bg: isHover
        ? 'var(--surface-brandPrimaryButton-tertiary-hover)'
        : 'var(--surface-brandPrimaryButton-tertiary)',
      border: 'none',
      outline: FOCUS_OUTLINE,
      icon: 'var(--icon-brandPrimaryButton-default)',
    };
  }
  if (active) {
    return {
      bg: 'var(--surface-brandPrimaryButton-quaternary)',
      border: `var(--dim-stroke-100) solid var(--border-brandPrimaryButton-quaternary)`,
      outline: 'none',
      icon: 'var(--icon-brandPrimaryButton-default)',
    };
  }
  if (variant === 'outline') {
    return {
      bg: isHover ? 'var(--surface-brandPrimaryButton-quinary-hover)' : 'transparent',
      border: 'var(--dim-stroke-100) solid var(--border-brandPrimaryButton-tertiary)',
      outline: focused ? FOCUS_OUTLINE : 'none',
      icon: 'var(--icon-brandPrimaryButton-default)',
    };
  }
  /* fill — brand subdue (tertiary = brand/p100) */
  return {
    bg: isHover
      ? 'var(--surface-brandPrimaryButton-tertiary-hover)'
      : 'var(--surface-brandPrimaryButton-tertiary)',
    border: 'none',
    outline: focused ? FOCUS_OUTLINE : 'none',
    icon: 'var(--icon-brandPrimaryButton-default)',
  };
};

const BrandSubdueIconButton = React.forwardRef(function BrandSubdueIconButton(
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
  const isActive = active || selected;
  const styleType = variant === 'outlined' ? 'outline' : variant;
  const dim = SIZES[size] || SIZES.md;
  const s = resolveStyles({
    variant: styleType,
    isHover,
    active: isActive,
    activeAppearance,
    focused,
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

export default BrandSubdueIconButton;
