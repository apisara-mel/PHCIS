import React, { useState } from 'react';

/* MIH BrandSubdueButton — Figma "Brand Subdue Button" (node 2024:3589).
   2 styles (fill / outline) × 4 sizes (sm/md/lg/xl) × 5 states
   (default · hover · active · focus · disabled).

   Property panel (per Figma):
     • Style              → `variant` ('fill' | 'outline')
     • Size               → `size`    ('sm' | 'md' | 'lg' | 'xl')
     • State              → derived from {disabled, active, focused, hover}
     • Show Label         → `showLabel`        (boolean — default true)
     • Show Leading Icon  → `showLeadingIcon`  (auto-derives from `leadingIcon`)
     • Show Trailing Icon → `showTrailingIcon` (auto-derives from `trailingIcon`)

   Tone constants across states (per the BrandPrimaryButton rule):
     • Text  → always `text/brandPrimaryButton/default`
     • Icon  → always `icon/brandPrimaryButton/default`
     • Outline border → always `border/brandPrimaryButton/tertiary` (brand/p200)
   Only the surface retints on hover; everything else stays put.

   • Fill default → `surface/brandPrimaryButton/tertiary` (brand/p100)
   • Fill hover   → `surface/brandPrimaryButton/tertiary-hover` (brand/p200)
   • Outline default → transparent
   • Outline hover   → `surface/brandPrimaryButton/quaternary` (brand/p50)

   Focus  → 4px tertiary `outline` (NOT a border) sits OUTSIDE the box —
            no layout shift, no white halo (outline-offset 0).
   Active → quaternary surface + 1px quaternary border.

   Tokens alias from design.md §4.5/§7a — no hex literals.            */

const SIZES = {
  sm: { height: 'var(--dim-size-700)', icon: 16, fontSize: 'var(--type-size-button-sm, 14px)' },
  md: { height: 'var(--dim-size-800)', icon: 20, fontSize: 'var(--type-size-button-md, 16px)' },
  lg: { height: 'var(--dim-size-900)', icon: 20, fontSize: 'var(--type-size-button-lg, 16px)' },
  xl: { height: 'var(--dim-size-1100, 52px)', icon: 20, fontSize: 'var(--type-size-button-xl, 18px)' },
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
      text: 'var(--icon-disabledButton-tertiary)',
      icon: 'var(--icon-disabledButton-tertiary)',
    };
  }
  if (active) {
    return {
      bg: 'var(--surface-brandPrimaryButton-quaternary)',
      border: `var(--dim-stroke-100) solid var(--border-brandPrimaryButton-quaternary)`,
      outline: 'none',
      text: 'var(--text-brandprimarybutton-default)',
      icon: 'var(--icon-brandprimarybutton-default)',
    };
  }
  if (variant === 'outline') {
    return {
      // Default → transparent. Hover → quaternary surface (brand/p50).
      bg: isHover ? 'var(--surface-brandPrimaryButton-quaternary)' : 'transparent',
      // Border tone stays at tertiary (brand/p200) across default + hover.
      border: 'var(--dim-stroke-100) solid var(--border-brandPrimaryButton-tertiary)',
      outline: focused ? FOCUS_OUTLINE : 'none',
      text: 'var(--text-brandprimarybutton-default)',
      icon: 'var(--icon-brandprimarybutton-default)',
    };
  }
  /* fill — Brand Subdue (tertiary surface = brand/p100) */
  return {
    bg: isHover
      ? 'var(--surface-brandprimarybutton-tertiary-hover)'
      : 'var(--surface-brandprimarybutton-tertiary)',
    border: 'none',
    outline: focused ? FOCUS_OUTLINE : 'none',
    text: 'var(--text-brandprimarybutton-default)',
    icon: 'var(--icon-brandprimarybutton-default)',
  };
};

const BrandSubdueButton = React.forwardRef(function BrandSubdueButton(
  {
    leadingIcon,
    leadingIconElement,
    trailingIcon,
    children,
    showLabel = true,
    showLeadingIcon,
    showTrailingIcon,
    onClick,
    disabled = false,
    active = false,
    focused = false,
    /* `hovered` — force the hover visual for component-library demo grids.
       Runtime callers leave undefined and let internal hover state drive. */
    hovered: hoveredProp = false,
    size = 'lg',
    variant = 'fill',
    type = 'button',
    className = '',
    style = {},
    ...rest
  },
  ref,
) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const isHover = (hovered || hoveredProp) && !disabled;
  const dim = SIZES[size] || SIZES.lg;
  const s = resolveStyles({ variant, isHover, active, focused, disabled });
  const renderLeadingIcon  = showLeadingIcon  !== undefined
    ? showLeadingIcon
    : !!(leadingIconElement || leadingIcon);
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
        height: dim.height,
        minWidth: 80,
        maxWidth: 384,
        gap:           'var(--dim-space-200)',
        paddingLeft:   'var(--dim-space-400)',
        paddingRight:  'var(--dim-space-400)',
        paddingTop:    'var(--dim-space-200)',
        paddingBottom: 'var(--dim-space-200)',
        borderRadius:  'var(--dim-radius-200)',
        background: s.bg,
        border: s.border,
        // Focus ring sits OUTSIDE via CSS outline — no layout shift.
        outline: s.outline,
        outlineOffset: 0,
        color: s.text,
        cursor: disabled ? 'not-allowed' : 'pointer',
        /* No hover translateY — lifts get clipped by PatientCard / toolbar rows with
           overflow:hidden + fixed maxHeight (พิมพ์ใบสั่งยา · พิมพ์ OPD Card). */
        transform: disabled ? 'none' : (pressed ? 'translateY(1px) scale(0.97)' : 'none'),
        whiteSpace: 'nowrap',
        ...style,
        /* Lock to title weight/family — after ...style so callers cannot thicken label */
        fontFamily: 'var(--type-family-button, var(--type-family-heading-content))',
        fontSize: dim.fontSize,
        fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
        lineHeight: 1.5,
      }}
      {...rest}
    >
      {renderLeadingIcon && (
        leadingIconElement
          ?? (leadingIcon && <Sym name={leadingIcon} size={dim.icon} color={s.icon} />)
      )}
      {showLabel && children != null && <span>{children}</span>}
      {renderTrailingIcon && trailingIcon && <Sym name={trailingIcon} size={dim.icon} color={s.icon} />}
    </button>
  );
});

export default BrandSubdueButton;
