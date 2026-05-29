import React, { useState } from 'react';
import { Sym } from '../Sym';

/* Shared renderer for all 16 mobile button families (see design.md §7.3
   and Figma file MIH-Design-System-Foundation-Copy section 319:2012).

   Each button file (BrandButton, BrandSubdueButton, DangerButton, …)
   defines its own state-matrix `palette` and delegates rendering here.
   This keeps shape/height/typography rules in ONE place — when mobile
   token values change, no copy-paste sync is needed across 16 files.

   State matrix per variant (mirroring web BrandButton pattern at
   src/components/button/BrandButton.jsx):

       palette = {
         fill:    { default, hover, active, focus, disabled },
         outline: { default, hover, active, focus, disabled },
         ghost:   { default, hover, active, focus, disabled },
       }

       state shape: { bg, color, border, outline?, shadow? }

   `outline` (CSS outline, not border) draws the 4px focus ring per
   Figma — same approach as the web BrandButton. It paints OUTSIDE the
   box so the button doesn't grow on focus.

   Sizes (md = 44h, lg = 56h) and radius (pill) come from --mobile-button-*
   tokens. */

const FOCUS_OUTLINE = 'var(--mobile-focus-ring-width, 4px) solid var(--mobile-border-brandPrimaryButton-tertiary)';

/* ─── State-matrix builder ───────────────────────────────────────────────

   `buildPalette(tone, options)` returns a full
   { fill, outline, ghost } × { default, hover, active, focus, disabled }
   matrix aliased to mobile semantic tokens for the given tone:

       tone = 'brandPrimaryButton' | 'brandSecondaryButton'
            | 'dangerButton' | 'neutralButton'

   Options:
     • fillTier — 'solid' (default tier = saturated bg, white text) or
                  'subdue' (default tier = quaternary soft bg, brand text).
                  Maps to the BrandButton vs BrandSubdueButton split in
                  Figma 319:2012.
     • variants — restrict which variants are present (subdue families
                  don't ship a ghost variant per Figma).
     • textOnBrandKey — name of the on-color text token for the tone.
                  Defaults to 'on-brand' (brandPrimary); other tones use
                  'on-default' / 'on-neutral' per the token table.        */
const TEXT_ON_KEY = {
  brandPrimaryButton:   'on-brand',
  brandSecondaryButton: 'on-default',
  dangerButton:         'on-default',
  neutralButton:        'on-neutral',
};

export const buildPalette = (tone, options = {}) => {
  const {
    fillTier = 'solid',
    variants = ['fill', 'outline', 'ghost'],
    textOnBrandKey = TEXT_ON_KEY[tone] || 'on-brand',
  } = options;

  const surface = (t) => `var(--mobile-surface-${tone}-${t})`;
  const text    = (t) => `var(--mobile-text-${tone}-${t})`;
  const border  = (t) => `var(--mobile-border-${tone}-${t})`;
  const icon    = (t) => `var(--mobile-icon-${tone}-${t})`;
  const dis = {
    bg:     'var(--mobile-surface-disabledButton-tertiary)',
    color:  'var(--mobile-text-disabledButton-tertiary)',
    border: '1.5px solid var(--mobile-border-disabledButton-tertiary)',
  };

  const onColor      = text(textOnBrandKey);
  const onIconColor  = icon(textOnBrandKey);

  /* fill — solid tone bg + on-brand text */
  const fillSolid = {
    default:  { bg: surface('default'),        color: onColor, border: '1.5px solid transparent' },
    hover:    { bg: surface('default-hover'),  color: onColor, border: '1.5px solid transparent' },
    active:   { bg: surface('secondary'),      color: text('default'), border: '1.5px solid transparent' },
    focus:    { bg: surface('default'),        color: onColor, border: '1.5px solid transparent', outline: FOCUS_OUTLINE },
    disabled: dis,
  };

  /* fill — subdue tier: quaternary bg + tone-default text */
  const fillSubdue = {
    default:  { bg: surface('quaternary'),         color: text('default'), border: '1.5px solid transparent' },
    hover:    { bg: surface('quaternary-hover'),   color: text('default'), border: '1.5px solid transparent' },
    active:   { bg: surface('tertiary'),           color: text('default'), border: '1.5px solid transparent' },
    focus:    { bg: surface('quaternary'),         color: text('default'), border: '1.5px solid transparent', outline: FOCUS_OUTLINE },
    disabled: dis,
  };

  const outline = {
    default:  { bg: 'transparent',                color: text('default'), border: `1.5px solid ${border('default')}` },
    hover:    { bg: surface('quinary-hover'),     color: text('default'), border: `1.5px solid ${border('default-hover')}` },
    active:   { bg: surface('quaternary'),        color: text('default'), border: `1.5px solid ${border('default-hover')}` },
    focus:    { bg: 'transparent',                color: text('default'), border: `1.5px solid ${border('default')}`, outline: FOCUS_OUTLINE },
    disabled: dis,
  };

  const ghost = {
    default:  { bg: 'transparent',                color: text('default'), border: '1.5px solid transparent' },
    hover:    { bg: surface('quinary-hover'),     color: text('default'), border: '1.5px solid transparent' },
    active:   { bg: surface('tertiary'),          color: text('default'), border: '1.5px solid transparent' },
    focus:    { bg: 'transparent',                color: text('default'), border: '1.5px solid transparent', outline: FOCUS_OUTLINE },
    disabled: { ...dis, border: '1.5px solid transparent' },
  };

  const palette = {};
  if (variants.includes('fill'))    palette.fill    = fillTier === 'subdue' ? fillSubdue : fillSolid;
  if (variants.includes('outline')) palette.outline = outline;
  if (variants.includes('ghost'))   palette.ghost   = ghost;
  /* keep `iconColor` alongside so icon-only buttons can look up the right
     icon token without rebuilding the tree. */
  palette.__icons = {
    default: icon('default'),
    onBrand: onIconColor,
    disabled: 'var(--mobile-icon-disabledButton-tertiary)',
  };
  return palette;
};

const resolveState = (variantStates, { isHover, active, focused, disabled }) => {
  if (!variantStates) return null;
  if (disabled) return variantStates.disabled || variantStates.default;
  if (active)   return variantStates.active   || variantStates.default;
  if (focused)  return variantStates.focus    || variantStates.default;
  if (isHover)  return variantStates.hover    || variantStates.default;
  return variantStates.default;
};

export const MobileButtonBase = ({
  palette,                 /* state-matrix palette (see header) */
  variant = 'fill',
  size = 'lg',
  leadingIcon,
  trailingIcon,
  children,
  disabled = false,
  active: activeProp = false,
  focused: focusedProp = false,
  hovered: hoveredProp = false,
  fullWidth = true,
  onClick,
  type = 'button',
  style,
  iconSize,
  iconOnly = false,        /* square / circle icon-only buttons */
  shape = 'pill',          /* 'pill' (default) | 'circle' (icon-only round) */
  ...rest
}) => {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  const isHover  = (hovered || hoveredProp) && !disabled;
  const isFocus  = (focused || focusedProp) && !disabled;
  const isActive = (activeProp || pressed) && !disabled;

  const variantStates = palette[variant] || palette.fill;
  const s = resolveState(variantStates, {
    isHover, active: isActive, focused: isFocus, disabled,
  }) || {};

  const height = size === 'md'
    ? 'var(--mobile-button-height-md, 44px)'
    : 'var(--mobile-button-height-lg, 56px)';
  const radius = shape === 'circle'
    ? '50%'
    : 'var(--mobile-button-radius, 9999px)';

  const finalIconSize = iconSize || (size === 'md' ? 20 : 22);
  const squareSide = size === 'md' ? 44 : 56;

  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      disabled={disabled}
      aria-pressed={isActive || undefined}
      aria-disabled={disabled}
      style={{
        width: iconOnly ? squareSide : (fullWidth ? '100%' : 'auto'),
        height: iconOnly ? squareSide : undefined,
        minHeight: iconOnly ? undefined : height,
        padding: iconOnly ? 0 : '0 var(--mobile-button-padding-x, 20px)',
        background: s.bg || 'transparent',
        color: s.color || 'inherit',
        border: s.border || '1.5px solid transparent',
        outline: s.outline || 'none',
        outlineOffset: 0,
        boxShadow: s.shadow || 'none',
        borderRadius: radius,
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--mobile-button-type-size, 16px)',
        fontWeight: 'var(--mobile-button-type-weight, 700)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--mobile-button-gap, 8px)',
        flexShrink: 0,
        transition: 'background 150ms ease, color 150ms ease, border-color 150ms ease, outline-color 150ms ease',
        ...(style || {}),
      }}
      {...rest}
    >
      {leadingIcon && <Sym name={leadingIcon} size={finalIconSize} />}
      {!iconOnly && children}
      {trailingIcon && <Sym name={trailingIcon} size={finalIconSize} />}
    </button>
  );
};

export { FOCUS_OUTLINE };
export default MobileButtonBase;
