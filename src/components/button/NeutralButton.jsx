import React, { useState } from 'react';

/* MIH NeutralButton — Figma "Neutral Button" (node 2024:3591).
   3 styles (fill / outline / ghost) × 3 sizes × 5 states.

   Property panel:
     • Style              → `variant` ('fill' | 'outline' | 'ghost')
     • Size               → `size`    ('sm' | 'md' | 'lg' | 'xl')
     • State              → derived from {disabled, active, focused, hover}
     • Show Label/Leading/Trailing icon → `show*` toggles

   Tone rule (family-wide):
     • Outline / Ghost text + icon → `text/icon-neutralButton/default`
     • Outline border              → `border/neutralButton/default`
     • Only the surface retints on hover
     • Focus → 4px `outline` (NOT border) sits OUTSIDE the box, no layout shift

   • Fill default     → neutralButton/default (neutral/700) + on-neutral text
   • Fill hover       → default-hover
   • Outline default  → transparent + default border (neutral/600)
   • Outline hover    → quaternary surface (neutral/50)
   • Ghost default    → transparent
   • Ghost hover      → quaternary surface
   • Active           → quaternary surface + 1px quaternary border
   • Disabled         → disabledButton tertiary

   Tokens alias from design.md §4.5 — no hex literals.            */

const SIZES = {
  sm: { height: 36, paddingX: 'var(--dim-space-300)', paddingY: 'var(--dim-space-150)', gap: 'var(--dim-space-150)', icon: 16, fontSize: 'var(--type-size-button-sm, 14px)' },
  md: { height: 40, paddingX: 'var(--dim-space-400)', paddingY: 'var(--dim-space-200)', gap: 'var(--dim-space-200)', icon: 20, fontSize: 'var(--type-size-button-md, 16px)' },
  lg: { height: 44, paddingX: 'var(--dim-space-400)', paddingY: 'var(--dim-space-200)', gap: 'var(--dim-space-200)', icon: 20, fontSize: 'var(--type-size-button-lg, 16px)' },
  xl: { height: 52, paddingX: 'var(--dim-space-400)', paddingY: 'var(--dim-space-200)', gap: 'var(--dim-space-200)', icon: 20, fontSize: 'var(--type-size-button-xl, 18px)' },
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

/* Fill variant focuses on a slightly darker neutral/400 ring; the rest of
   the variants alias the tertiary ring per Figma spec. */
const FOCUS_OUTLINE_TERTIARY = 'var(--dim-stroke-400, 4px) solid var(--border-neutralButton-tertiary)';
const FOCUS_OUTLINE_SECONDARY = 'var(--dim-stroke-400, 4px) solid var(--border-neutralButton-secondary)';

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
      bg: 'var(--surface-neutralButton-quaternary)',
      border: `var(--dim-stroke-100) solid var(--border-neutralButton-quaternary)`,
      outline: 'none',
      text: 'var(--text-neutralButton-default)',
      icon: 'var(--icon-neutralButton-default)',
    };
  }
  if (variant === 'outline') {
    return {
      bg: isHover ? 'var(--surface-neutralButton-quaternary)' : 'transparent',
      border: 'var(--dim-stroke-100) solid var(--border-neutralButton-default)',
      outline: focused ? FOCUS_OUTLINE_TERTIARY : 'none',
      text: 'var(--text-neutralButton-default)',
      icon: 'var(--icon-neutralButton-default)',
    };
  }
  if (variant === 'ghost') {
    return {
      bg: isHover ? 'var(--surface-neutralButton-quaternary)' : 'transparent',
      border: 'none',
      outline: focused ? FOCUS_OUTLINE_TERTIARY : 'none',
      text: 'var(--text-neutralButton-default)',
      icon: 'var(--icon-neutralButton-default)',
    };
  }
  /* fill — neutral/700 dark */
  return {
    bg: isHover ? 'var(--surface-neutralButton-default-hover)' : 'var(--surface-neutralButton-default)',
    border: 'none',
    outline: focused ? FOCUS_OUTLINE_SECONDARY : 'none',
    text: 'var(--text-neutralButton-on-neutral)',
    icon: 'var(--icon-neutralButton-on-neutral)',
  };
};

const NeutralButton = React.forwardRef(function NeutralButton(
  {
    children,
    onClick,
    disabled = false,
    active = false,
    focused = false,
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
        outline: s.outline,
        outlineOffset: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transform: disabled ? 'none' : (pressed ? 'translateY(1px) scale(0.97)' : (hovered ? 'translateY(-1px)' : 'translateY(0)')),
        whiteSpace: 'nowrap',
        ...style,
        fontFamily: 'var(--type-family-button, var(--type-family-heading-content))',
        fontSize: dim.fontSize, fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))', lineHeight: 1.5,
      }}
      {...rest}
    >
      {renderLeadingIcon && leadingIcon && <Sym name={leadingIcon} size={dim.icon} color={s.icon} />}
      {showLabel && children != null && <span>{children}</span>}
      {renderTrailingIcon && trailingIcon && <Sym name={trailingIcon} size={dim.icon} color={s.icon} />}
    </button>
  );
});

export default NeutralButton;
