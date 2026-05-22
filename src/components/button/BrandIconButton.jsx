import React, { useState } from 'react';

/* MIH BrandIconButton — Figma "Brand Icon Button" (node 377:11596).
   Square icon-only button.

   Property panel (per Figma):
     • Style → `variant` ('fill' | 'outline' | 'ghost' | 'quaternary')
     • State → derived from {disabled, active, focused, hover}
     • Size  → `size`    ('sm' | 'md' | 'lg')

   `selected` is accepted as a legacy alias of `active`.

   Tone rule (same as BrandButton family):
     • Outline / Ghost icon  → always `icon/brandPrimaryButton/default`
     • Outline border        → always `border/brandPrimaryButton/default`
     • Only the surface retints on hover
     • Focus ring → 4px tertiary `outline` (sits OUTSIDE the box, no shift)

   • Quaternary — brand-p50 surface + brand-p100 border (Figma PHCIS |
                  Medical-examination 339:36817 row-action edit button).
                  Same visual treatment as the `active` state, but
                  expressed as a variant so callers can opt-in without
                  hijacking the active-mode semantic.
   • Active     — quaternary surface + 1px quaternary border (all variants)
   • Disabled   — disabledButton tertiary surface + on-disabled icon

   Tokens alias from design.md §4.5 — no hex literals.                  */

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

const FOCUS_OUTLINE = 'var(--dim-stroke-400, 4px) solid var(--border-brandPrimaryButton-tertiary)';

const resolveStyles = ({ variant, isHover, active, focused, disabled }) => {
  if (disabled) {
    return {
      bg: 'var(--surface-disabledButton-tertiary)',
      border: variant === 'outline'
        ? `var(--dim-stroke-100) solid var(--border-disabledButton-tertiary)`
        : 'none',
      outline: 'none',
      icon: 'var(--icon-disabledButton-tertiary)',
      shadow: 'none',
    };
  }
  if (active) {
    return {
      bg: 'var(--surface-brandPrimaryButton-quaternary)',
      border: `var(--dim-stroke-100) solid var(--border-brandPrimaryButton-quaternary)`,
      outline: 'none',
      icon: 'var(--icon-brandPrimaryButton-default)',
      shadow: 'none',
    };
  }
  if (variant === 'outline') {
    return {
      bg: isHover ? 'var(--surface-brandPrimaryButton-quinary-hover)' : 'transparent',
      border: 'var(--dim-stroke-100) solid var(--border-brandPrimaryButton-default)',
      outline: focused ? FOCUS_OUTLINE : 'none',
      icon: 'var(--icon-brandPrimaryButton-default)',
      shadow: 'none',
    };
  }
  if (variant === 'quaternary') {
    /* Figma PHCIS | Medical-examination 339:36817 row-action edit
       button — brand-p50 surface + brand-p100 border, brand-p700 icon.
       Same look as the `active` state. Hover deepens the surface one
       step (quinary-hover) to keep the same visual rhythm as the
       outline/ghost variants. */
    return {
      bg: isHover
        ? 'var(--surface-brandPrimaryButton-quinary-hover)'
        : 'var(--surface-brandPrimaryButton-quaternary)',
      border: 'var(--dim-stroke-100) solid var(--border-brandPrimaryButton-quaternary)',
      outline: focused ? FOCUS_OUTLINE : 'none',
      icon: 'var(--icon-brandPrimaryButton-default)',
      shadow: 'none',
    };
  }
  if (variant === 'ghost') {
    return {
      bg: isHover ? 'var(--surface-brandPrimaryButton-quinary-hover)' : 'transparent',
      border: 'none',
      outline: focused ? FOCUS_OUTLINE : 'none',
      icon: 'var(--icon-brandPrimaryButton-default)',
      shadow: 'none',
    };
  }
  /* fill */
  return {
    bg: isHover ? 'var(--surface-brandPrimaryButton-default-hover)' : 'var(--surface-brandPrimaryButton-default)',
    border: 'none',
    outline: focused ? FOCUS_OUTLINE : 'none',
    icon: 'var(--icon-brandPrimaryButton-on-brand)',
    shadow: focused ? 'none' : 'var(--shadow-brandPrimaryButton-default)',
  };
};

const BrandIconButton = React.forwardRef(function BrandIconButton(
  {
    icon,
    onClick,
    disabled = false,
    active = false,
    selected = false, /* legacy alias for active */
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
  const dim = SIZES[size] || SIZES.md;
  const s = resolveStyles({ variant, isHover, active: isActive, focused, disabled });
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
        width: dim.box, height: dim.box,
        borderRadius: 'var(--dim-radius-200)',
        border: s.border, background: s.bg,
        outline: s.outline,
        outlineOffset: 0,
        boxShadow: s.shadow,
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

export default BrandIconButton;
