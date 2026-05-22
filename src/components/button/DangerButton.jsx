import React, { useState } from 'react';

/* MIH DangerButton — Figma "Danger Button" (node 2024:3590).
   3 styles (fill / outline / ghost) × 3 sizes (sm/md/lg) × 5 states
   (default · hover · active · focus · disabled).

   Property panel (per Figma):
     • Style              → `variant` ('fill' | 'outline' | 'ghost')
     • Size               → `size`    ('sm' | 'md' | 'lg')
     • State              → derived from {disabled, active, focused, hover}
     • Show Label         → `showLabel`        (boolean — default true)
     • Show Leading Icon  → `showLeadingIcon`  (auto-derives from `leadingIcon`)
     • Show Trailing Icon → `showTrailingIcon` (auto-derives from `trailingIcon`)

   Tone rule (same family-wide pattern as BrandButton):
     • Outline / Ghost · text  → always `text/dangerButton/default`
     • Outline / Ghost · icon  → always `icon/dangerButton/default`
     • Outline border          → always `border/dangerButton/default`
   Only the surface retints on hover; everything else stays constant.

   • Active   — quaternary surface (red/50) + 1px quaternary border (red/100)
   • Focus    — 4px tertiary `outline` (NOT border) sits OUTSIDE the box,
                outline-offset 0 → no layout shift, no white halo
   • Disabled — disabledButton tertiary surface

   Tokens alias from design.md §4.5 — no hex literals.            */

const SIZES = {
  sm: { height: 36, paddingX: 'var(--dim-space-300)', paddingY: 'var(--dim-space-150)', gap: 'var(--dim-space-150)', icon: 16, fontSize: 'var(--type-size-sm)' },
  md: { height: 40, paddingX: 'var(--dim-space-400)', paddingY: 'var(--dim-space-200)', gap: 'var(--dim-space-200)', icon: 20, fontSize: 'var(--type-size-base)' },
  lg: { height: 44, paddingX: 'var(--dim-space-400)', paddingY: 'var(--dim-space-200)', gap: 'var(--dim-space-200)', icon: 20, fontSize: 'var(--type-size-base)' },
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
      text: 'var(--icon-disabledButton-tertiary)',
      icon: 'var(--icon-disabledButton-tertiary)',
    };
  }
  if (active) {
    return {
      bg: 'var(--surface-dangerButton-quaternary)',
      border: `var(--dim-stroke-100) solid var(--border-dangerButton-quaternary)`,
      outline: 'none',
      text: 'var(--text-dangerButton-default)',
      icon: 'var(--icon-dangerButton-default)',
    };
  }
  if (variant === 'outline') {
    return {
      bg: isHover ? 'var(--surface-dangerButton-quaternary)' : 'transparent',
      // Border tone stays at `border/dangerButton/default` across default + hover.
      border: 'var(--dim-stroke-100) solid var(--border-dangerButton-default)',
      outline: focused ? FOCUS_OUTLINE : 'none',
      text: 'var(--text-dangerButton-default)',
      icon: 'var(--icon-dangerButton-default)',
    };
  }
  if (variant === 'ghost') {
    return {
      // Default → transparent. Hover → quaternary surface (red/50).
      bg: isHover ? 'var(--surface-dangerButton-quaternary-hover)' : 'transparent',
      border: 'none',
      outline: focused ? FOCUS_OUTLINE : 'none',
      text: 'var(--text-dangerButton-default)',
      icon: 'var(--icon-dangerButton-default)',
    };
  }
  /* fill */
  return {
    bg: isHover ? 'var(--surface-dangerButton-default-hover)' : 'var(--surface-dangerButton-default)',
    border: 'none',
    outline: focused ? FOCUS_OUTLINE : 'none',
    text: 'var(--text-dangerButton-on-danger)',
    icon: 'var(--icon-dangerButton-on-danger)',
  };
};

const DangerButton = React.forwardRef(function DangerButton(
  {
    children,
    onClick,
    disabled = false,
    active = false,
    focused = false,
    /* `hovered` — force the hover visual for component-library demo grids.
       Runtime callers leave undefined and let internal hover state drive. */
    hovered: hoveredProp = false,
    type = 'button',
    variant = 'fill',
    size = 'md',
    leadingIcon,
    trailingIcon,
    showLabel = true,
    showLeadingIcon,
    showTrailingIcon,
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
  const renderLeadingIcon  = showLeadingIcon  !== undefined ? showLeadingIcon  : !!leadingIcon;
  const renderTrailingIcon = showTrailingIcon !== undefined ? showTrailingIcon : !!trailingIcon;
  return (
    <button
      ref={ref}
      type={type}
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
        height: dim.height, minWidth: 80, maxWidth: 384,
        gap: dim.gap, paddingLeft: dim.paddingX, paddingRight: dim.paddingX,
        paddingTop: dim.paddingY, paddingBottom: dim.paddingY,
        borderRadius: 'var(--dim-radius-200)',
        border: s.border, background: s.bg, color: s.text,
        // Focus ring sits OUTSIDE via CSS outline — no layout shift, no halo.
        outline: s.outline,
        outlineOffset: 0,
        fontFamily: 'var(--type-family-ui, var(--type-family-body))',
        fontSize: dim.fontSize, fontWeight: 'var(--type-weight-medium)', lineHeight: 1.5,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transform: disabled ? 'none' : (pressed ? 'translateY(1px) scale(0.97)' : (hovered ? 'translateY(-1px)' : 'translateY(0)')),
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {renderLeadingIcon && leadingIcon && <Sym name={leadingIcon} size={dim.icon} color={s.icon} />}
      {showLabel && children != null && <span>{children}</span>}
      {renderTrailingIcon && trailingIcon && <Sym name={trailingIcon} size={dim.icon} color={s.icon} />}
    </button>
  );
});

export default DangerButton;
