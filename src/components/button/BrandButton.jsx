import React, { useState } from 'react';

/* MIH BrandButton — Figma "Brand Button" (node 231:29).
   3 variants (fill / outline / ghost) × 3 sizes (sm 36 / md 40 / lg 44)
   × 5 states (default / hover / active / focus / disabled).

   Property panel (per Figma):
     • Variant            → `variant` ('fill' | 'outline' | 'ghost')
     • Size               → `size`    ('sm' | 'md' | 'lg')
     • State              → derived from {disabled, active, focused, hover}
     • Show Label         → `showLabel`        (boolean — default true)
     • Show Leading Icon  → `showLeadingIcon`  (auto-derives from `leadingIcon`)
     • Show Trailing Icon → `showTrailingIcon` (auto-derives from `trailingIcon`)

   • Active   — surface/brandPrimaryButton/quaternary + 1px border/brandPrimary/quaternary
   • Focus    — 4px tertiary border ring (brand/p200)
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

/* Focus ring per Figma 3060:3557 — drawn as a CSS `outline` (4px brand
   tertiary) that sits OUTSIDE the button's box. This replaces the older
   approach of swapping the border thickness from 1px → 4px on focus,
   which inflated the button and caused layout shift. Outline paints
   around the border and never participates in box sizing.              */
const FOCUS_OUTLINE = 'var(--dim-stroke-400, 4px) solid var(--border-brandPrimaryButton-tertiary)';

const resolveStyles = ({ variant, isHover, active, focused, disabled }) => {
  if (disabled) {
    if (variant === 'outline') {
      return {
        bg: 'var(--surface-disabledButton-tertiary)',
        border: `var(--dim-stroke-100) solid var(--border-disabledButton-tertiary)`,
        outline: 'none',
        text: 'var(--icon-disabledButton-tertiary)',
        icon: 'var(--icon-disabledButton-tertiary)',
        shadow: 'none',
      };
    }
    if (variant === 'ghost') {
      return {
        bg: 'var(--surface-disabledButton-tertiary)',
        border: 'none',
        outline: 'none',
        text: 'var(--icon-disabledButton-tertiary)',
        icon: 'var(--icon-disabledButton-tertiary)',
        shadow: 'none',
      };
    }
    return {
      bg: 'var(--surface-disabledButton-tertiary)',
      border: 'none',
      outline: 'none',
      text: 'var(--icon-disabledButton-tertiary)',
      icon: 'var(--icon-disabledButton-tertiary)',
      shadow: 'none',
    };
  }
  if (active) {
    return {
      bg: 'var(--surface-brandPrimaryButton-quaternary)',
      border: `var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)`,
      outline: 'none',
      text: 'var(--text-brandprimarybutton-default)',
      icon: 'var(--icon-brandprimarybutton-default)',
      shadow: 'none',
    };
  }
  if (variant === 'outline') {
    return {
      bg: isHover ? 'unset' : 'var(--surface-brandPrimaryButton-quinary)',
      // Border stays at `border/brandPrimaryButton/default` across default
      // + hover (Figma 377:12090). Hover background is unset (no quinary-hover
      // fill); stroke tone stays constant.
      border: 'var(--dim-stroke-100) solid var(--border-brandPrimaryButton-default)',
      outline: focused ? FOCUS_OUTLINE : 'none',
      // Text + icon stay at `text/brandPrimaryButton/default` +
      // `icon/brandPrimaryButton/default` across default + hover per Figma
      // 377:12095 (text) / 377:12091 (icon).
      text: 'var(--text-brandprimarybutton-default)',
      icon: 'var(--icon-brandprimarybutton-default)',
      shadow: 'none',
    };
  }
  if (variant === 'ghost') {
    return {
      // Default → no surface (transparent) per Figma 377:12099.
      // Hover   → `surface/brandPrimaryButton/quinary-hover` per Figma 377:12102.
      bg: isHover
        ? 'var(--surface-brandPrimaryButton-quinary-hover)'
        : 'transparent',
      border: 'none',
      outline: focused ? FOCUS_OUTLINE : 'none',
      // Text + icon stay at `text/brandPrimaryButton/default` +
      // `icon/brandPrimaryButton/default` across default + hover per Figma
      // 377:12104 (text) / matching icon node. Only bg retints on hover.
      text: 'var(--text-brandprimarybutton-default)',
      icon: 'var(--icon-brandprimarybutton-default)',
      shadow: 'none',
    };
  }
  /* fill */
  return {
    bg: isHover ? 'var(--surface-brandPrimaryButton-hover)' : 'var(--surface-brandPrimaryButton-default)',
    border: 'none',
    outline: focused ? FOCUS_OUTLINE : 'none',
    text: 'var(--text-brandprimarybutton-on-brand)',
    icon: 'var(--icon-brandPrimaryButton-on-brand)',
    shadow: focused ? 'none' : 'var(--shadow-brandPrimaryButton-default)',
  };
};

const BrandButton = React.forwardRef(function BrandButton(
  {
    children,
    onClick,
    disabled = false,
    active = false,
    focused = false,
    /* `hovered` — force the hover visual state. Mostly for component-library
       demo grids that need to render every state side-by-side. Runtime
       callers should leave this undefined and let internal hover state
       drive the rendering.                                              */
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
        width: 'fit-content',
        height: dim.height, minWidth: 80, maxWidth: 384,
        gap: dim.gap, paddingLeft: dim.paddingX, paddingRight: dim.paddingX,
        paddingTop: dim.paddingY, paddingBottom: dim.paddingY,
        borderRadius: 'var(--dim-radius-200)',
        border: s.border, background: s.bg, color: s.text,
        /* Focus ring sits OUTSIDE the button via CSS outline (Figma 3060:3557).
           `outlineOffset: 0` keeps the 4px tertiary ring flush against the
           button edge — without this, the gap between button and outline
           paints in the page background and reads as a white halo.       */
        outline: s.outline,
        outlineOffset: 0,
        boxShadow: s.shadow,
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

export default BrandButton;
