import React, { useState } from 'react';
import { Sym } from '../Sym';

/* Shared renderer for all 16 mobile button families (see design.md §7.3
   and Figma file MIH-Design-System-Foundation App — Brand Button 231:29).

   Each button file (BrandButton, BrandSubdueButton, DangerButton, …)
   defines its own state-matrix `palette` and delegates rendering here.

   State matrix per Style (mirroring Figma Style = Fill / Outline / Ghost):

       palette = {
         fill:    { default, hover, active, focus, disabled },
         outline: { default, hover, active, focus, disabled },
         ghost:   { default, hover, active, focus, disabled },
       }

       state shape: { bg, color, border, outline?, shadow? }

   Sizes (Figma Size property):
     sm = 40h · icon 16 · gap 6 · type base
     md = 48h · icon 20 · gap 8 · type lg
     lg = 56h · icon 24 · gap 8 · type lg
*/

const FOCUS_OUTLINE = 'var(--mobile-focus-ring-width, 4px) solid var(--mobile-border-brandPrimaryButton-tertiary)';

const FILL_SHADOW = 'var(--mobile-button-shadow-fill, 0 4px 4px -1px rgba(8,167,104,0.08), 0 4px 4px -1px rgba(8,167,104,0.1))';

const SIZE_TOKEN = {
  sm: {
    height: 'var(--mobile-button-height-sm, 40px)',
    icon: 16,
    gap: 'var(--mobile-button-gap-sm, 6px)',
    fontSize: 'var(--mobile-button-type-size, var(--type-size-base, 16px))',
    square: 40,
  },
  md: {
    height: 'var(--mobile-button-height-md, 48px)',
    icon: 20,
    gap: 'var(--mobile-button-gap, 8px)',
    fontSize: 'var(--mobile-button-type-size-lg, var(--type-size-lg, 18px))',
    square: 48,
  },
  lg: {
    height: 'var(--mobile-button-height-lg, 56px)',
    icon: 24,
    gap: 'var(--mobile-button-gap, 8px)',
    fontSize: 'var(--mobile-button-type-size-lg, var(--type-size-lg, 18px))',
    square: 56,
  },
};

/* Normalize Figma Size labels + legacy keys → sm|md|lg */
export const normalizeButtonSize = (size) => {
  const key = String(size || 'lg').toLowerCase();
  if (key === 'small' || key === 'sm') return 'sm';
  if (key === 'medium' || key === 'md') return 'md';
  if (key === 'large' || key === 'lg') return 'lg';
  return 'lg';
};

/* Normalize Figma Style labels + legacy keys → fill|outline|ghost */
export const normalizeButtonStyle = (styleOrVariant) => {
  const key = String(styleOrVariant || 'fill').toLowerCase();
  if (key === 'fill' || key === 'outline' || key === 'ghost') return key;
  return 'fill';
};

/* Figma State → forced interaction props */
export const normalizeButtonState = (state) => {
  if (!state) return {};
  const key = String(state).toLowerCase();
  if (key === 'disable' || key === 'disabled') return { disabled: true };
  if (key === 'hover') return { hovered: true };
  if (key === 'active') return { active: true };
  if (key === 'focus' || key === 'focused') return { focused: true };
  return {}; /* Default */
};

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
    /* Figma Brand Button Fill · State=Disable 377:12087 —
       surface/disabledbutton/tertiary · text/disabledbutton/tertiary · no border · no shadow */
    bg:     'var(--mobile-surface-disabledButton-tertiary, #F4F5F5)',
    color:  'var(--mobile-text-disabledButton-tertiary, #ADB2B7)',
    border: '1.5px solid transparent',
    shadow: 'none',
  };
  const disOutline = {
    ...dis,
    border: '1.5px solid var(--mobile-border-disabledButton-tertiary, #E2E4E6)',
  };

  const onColor     = text(textOnBrandKey);
  const onIconColor = icon(textOnBrandKey);

  const fillSolid = {
    default:  { bg: surface('default'),       color: onColor, border: '1.5px solid transparent', shadow: FILL_SHADOW },
    hover:    { bg: surface('default-hover'), color: onColor, border: '1.5px solid transparent', shadow: FILL_SHADOW },
    active:   { bg: surface('quaternary'),    color: text('default'), border: '1.5px solid transparent', shadow: 'none' },
    focus:    { bg: surface('default'),       color: onColor, border: '1.5px solid transparent', outline: FOCUS_OUTLINE, shadow: FILL_SHADOW },
    disabled: dis,
  };

  const fillSubdue = {
    default:  { bg: surface('tertiary'),         color: text('default'), border: '1.5px solid transparent' },
    hover:    { bg: surface('tertiary-hover'),   color: text('default'), border: '1.5px solid transparent' },
    active:   { bg: surface('quaternary'),       color: text('default'), border: '1.5px solid transparent' },
    focus:    { bg: surface('tertiary'),         color: text('default'), border: '1.5px solid transparent', outline: FOCUS_OUTLINE },
    disabled: dis,
  };

  const outlineStroke = fillTier === 'subdue'
    ? 'var(--dim-stroke-100, 1px)'
    : '1.5px';
  /* Outline border tier:
     · Solid families → default (strong)
     · Brand/Danger Subdue → tertiary (soft) — Figma Archive 367:41054 / design.md §5.10
     · Neutral Subdue → secondary — design.md §5.10 */
  const outlineBorderTier = fillTier === 'subdue'
    ? (tone === 'neutralButton' ? 'secondary' : 'tertiary')
    : 'default';
  const outlineBorderHoverTier = `${outlineBorderTier}-hover`;
  const outlineBorderDefault = border(outlineBorderTier);
  const outlineBorderHover = border(outlineBorderHoverTier);

  const outline = {
    default:  { bg: 'transparent',            color: text('default'), border: `${outlineStroke} solid ${outlineBorderDefault}` },
    hover:    { bg: surface('quinary-hover'), color: text('default'), border: `${outlineStroke} solid ${outlineBorderHover}` },
    active:   { bg: surface('quaternary'),    color: text('default'), border: `${outlineStroke} solid ${outlineBorderHover}` },
    focus:    { bg: 'transparent',            color: text('default'), border: `${outlineStroke} solid ${outlineBorderDefault}`, outline: FOCUS_OUTLINE },
    disabled: disOutline,
  };

  const ghost = {
    default:  { bg: 'transparent',            color: text('default'), border: '1.5px solid transparent' },
    hover:    { bg: surface('quinary-hover'), color: text('default'), border: '1.5px solid transparent' },
    active:   { bg: surface('tertiary'),      color: text('default'), border: '1.5px solid transparent' },
    focus:    { bg: 'transparent',            color: text('default'), border: '1.5px solid transparent', outline: FOCUS_OUTLINE },
    disabled: dis,
  };

  const palette = {};
  if (variants.includes('fill'))    palette.fill    = fillTier === 'subdue' ? fillSubdue : fillSolid;
  if (variants.includes('outline')) palette.outline = outline;
  if (variants.includes('ghost'))   palette.ghost   = ghost;
  palette.__icons = {
    default: icon('default'),
    onBrand: onIconColor,
    disabled: 'var(--mobile-icon-disabledButton-tertiary, #ADB2B7)',
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
  palette,
  variant = 'fill',
  size = 'lg',
  leadingIcon,
  trailingIcon,
  showLeadingIcon,
  showTailingIcon,   /* Figma property name (typo kept) */
  showTrailingIcon,  /* alias */
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
  iconFill,
  iconOnly = false,
  shape = 'pill',
  ...rest
}) => {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  const sizeKey = normalizeButtonSize(size);
  const styleKey = normalizeButtonStyle(variant);
  const tokens = SIZE_TOKEN[sizeKey] || SIZE_TOKEN.lg;

  const isHover  = (hovered || hoveredProp) && !disabled;
  const isFocus  = (focused || focusedProp) && !disabled;
  const isActive = (activeProp || pressed) && !disabled;

  const variantStates = palette[styleKey] || palette.fill;
  const s = resolveState(variantStates, {
    isHover, active: isActive, focused: isFocus, disabled,
  }) || {};

  const radius = shape === 'circle'
    ? '50%'
    : 'var(--mobile-button-radius, 9999px)';

  const finalIconSize = iconSize || tokens.icon;
  const squareSide = tokens.square;

  const leadOn = showLeadingIcon !== false && Boolean(leadingIcon);
  const trailOn = showTailingIcon !== false
    && showTrailingIcon !== false
    && Boolean(trailingIcon);

  const iconColor = disabled
    ? (palette.__icons?.disabled || s.color)
    : (style?.color || s.color);

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
      data-size={sizeKey}
      data-style={styleKey}
      data-state={disabled ? 'disabled' : isActive ? 'active' : isFocus ? 'focus' : isHover ? 'hover' : 'default'}
      style={{
        width: iconOnly ? squareSide : (fullWidth ? '100%' : 'auto'),
        height: iconOnly ? squareSide : undefined,
        minHeight: iconOnly ? undefined : tokens.height,
        minWidth: iconOnly ? undefined : 80,
        maxWidth: 384,
        padding: iconOnly ? 0 : `0 var(--mobile-button-padding-x, 24px)`,
        background: s.bg || 'transparent',
        color: s.color || 'inherit',
        border: s.border || '1.5px solid transparent',
        outline: s.outline || 'none',
        outlineOffset: 0,
        boxShadow: s.shadow || 'none',
        borderRadius: radius,
        fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
        fontSize: tokens.fontSize,
        fontWeight: 'var(--mobile-button-type-weight, var(--type-weight-regular, 400))',
        lineHeight: 1.5,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: tokens.gap,
        flexShrink: 0,
        transition: 'background 150ms ease, color 150ms ease, border-color 150ms ease, outline-color 150ms ease, box-shadow 150ms ease',
        ...(style || {}),
      }}
      {...rest}
    >
      {leadOn && <Sym name={leadingIcon} size={finalIconSize} color={iconColor} fill={iconFill} />}
      {!iconOnly && children}
      {trailOn && <Sym name={trailingIcon} size={finalIconSize} color={iconColor} fill={iconFill} />}
    </button>
  );
};

export { FOCUS_OUTLINE };
export default MobileButtonBase;

/* Factory — same Figma property surface as Brand Button (231:29) for every
   text-button family: Style / State / Size / Show Leading / Show Tailing. */
export const createFigmaTextButton = (palette, {
  figmaNode,
  name,
  defaultStyle = 'Fill',
  allowedStyles,
} = {}) => {
  const Button = ({
    variant,
    buttonStyle,
    size = 'Large',
    state,
    showLeadingIcon = true,
    showTailingIcon = true,
    showTrailingIcon,
    leadingIcon,
    trailingIcon,
    tailingIcon, /* Figma prop name (typo) — alias of trailingIcon */
    disabled,
    hovered,
    active,
    focused,
    ...rest
  }) => {
    let resolvedVariant = normalizeButtonStyle(variant || buttonStyle || defaultStyle);
    if (allowedStyles && !allowedStyles.includes(resolvedVariant)) {
      resolvedVariant = allowedStyles[0] || 'fill';
    }
    const resolvedSize = normalizeButtonSize(size);
    const forced = normalizeButtonState(state);

    return (
      <MobileButtonBase
        palette={palette}
        variant={resolvedVariant}
        size={resolvedSize}
        leadingIcon={leadingIcon}
        trailingIcon={trailingIcon || tailingIcon}
        showLeadingIcon={showLeadingIcon}
        showTailingIcon={showTailingIcon}
        showTrailingIcon={showTrailingIcon}
        disabled={disabled ?? forced.disabled}
        hovered={hovered ?? forced.hovered}
        active={active ?? forced.active}
        focused={focused ?? forced.focused}
        {...rest}
      />
    );
  };
  Button.displayName = name || 'FigmaTextButton';
  Button.figmaNode = figmaNode;
  return Button;
};
