import React, { useState } from 'react';
import Icon from '@/components/icons/Icon';
import { useAliasedButtonSize } from '@/components/button/ButtonSizeAliasContext';

/* MIH BrandDashedAddButton — Figma MIH Design System Foundation node 3360:2711.
   Full-width dashed "add row" control for HistoryListForm (allergies / diseases).
   Default: surface/brandPrimary/quaternary + 2px dashed border/brandPrimaryButton/tertiary.
   Hover: surface/brandPrimary/quaternary-hover + border/brandPrimaryButton/tertiary-hover.
   Disabled (`disabledAppearance="tokens"`): disabledButton.tertiary surface/border/text.
   Disabled (`disabledAppearance="brandFade"`): PHCIS Registration 207:16014 — same brand
   colors as default with opacity 0.5 (Figma frame 207:16027).
   Height: dimension/size/1200 (56px). */

const BASE_STYLE = {
  boxSizing: 'border-box',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--dim-space-200, 8px)',
  minWidth: '80px',
  height: 'var(--dim-size-1200, 56px)',
  paddingLeft: 'var(--dim-space-400, 16px)',
  paddingRight: 'var(--dim-space-400, 16px)',
  paddingTop: 'var(--dim-space-200, 8px)',
  paddingBottom: 'var(--dim-space-200, 8px)',
  borderRadius: 'var(--dim-radius-200, 8px)',
  borderStyle: 'dashed',
  borderWidth: 'var(--dim-stroke-200, 2px)',
  borderImage: 'none',
  fontFamily: 'var(--type-family-button, var(--type-family-heading-content))',
  fontSize: 'var(--type-size-button-md, 16px)',
  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
  lineHeight: 1.5,
  outline: 'none',
  transition:
    'background-color 120ms ease, border-color 120ms ease, color 120ms ease',
};

const BORDERLESS_STYLE = {
  borderStyle: 'solid',
  borderWidth: 'var(--dim-stroke-100, 1px)',
  borderImage: 'none',
  borderColor: 'transparent',
};

const BrandDashedAddButton = ({
  children,
  onClick,
  disabled = false,
  /* Inline add controls (e.g. เพิ่มสิทธิ) — 1px solid transparent border, no dashed outline. */
  borderless = false,
  /* `tokens` — design-system disabledButton.tertiary (HistoryListForm, VitalsForm).
     `brandFade` — PHCIS Registration 207:16014/16027: brand default colors @ 50% opacity. */
  disabledAppearance = 'tokens',
  icon = 'plus',
  iconSize = 20,
  /* Controlled hover override — when omitted the component tracks its own
     hover state. Used by the design-system state-matrix table. */
  hovered: hoveredProp,
  className = '',
  style = {},
  type = 'button',
  ...rest
}) => {
  const [hover, setHover] = useState(false);
  const resolvedSize = useAliasedButtonSize('lg');
  const compact = resolvedSize === 'sm';
  const interactive = !disabled;
  const hovered = interactive && (hoveredProp ?? hover);
  const brandFadeDisabled = disabled && disabledAppearance === 'brandFade';

  const bg = disabled && !brandFadeDisabled
    ? 'var(--surface-disabledButton-tertiary)'
    : hovered
      ? 'var(--surface-brandPrimary-quaternary-hover)'
      : 'var(--surface-brandPrimary-quaternary)';
  const borderColor = borderless
    ? 'transparent'
    : disabled && !brandFadeDisabled
      ? 'var(--border-disabledButton-tertiary)'
      : hovered
        ? 'var(--border-brandPrimaryButton-tertiary-hover)'
        : 'var(--border-brandPrimaryButton-tertiary)';
  const fg = disabled && !brandFadeDisabled
    ? 'var(--text-disabledButton-tertiary)'
    : 'var(--text-brandPrimaryButton-default)';

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => interactive && setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={className}
      style={{
        ...BASE_STYLE,
        ...(compact
          ? {
              height: 'var(--dim-size-700, 36px)',
              gap: 'var(--dim-space-150, 6px)',
              paddingLeft: 'var(--dim-space-300, 12px)',
              paddingRight: 'var(--dim-space-300, 12px)',
              paddingTop: 'var(--dim-space-150, 6px)',
              paddingBottom: 'var(--dim-space-150, 6px)',
            }
          : null),
        ...(borderless ? BORDERLESS_STYLE : null),
        width: '100%',
        ...style,
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: fg,
        background: bg,
        borderColor,
        opacity: brandFadeDisabled ? 0.5 : 1,
        /* Lock to title weight — after ...style so callers cannot thicken label */
        fontFamily: 'var(--type-family-button, var(--type-family-heading-content))',
        fontSize: compact ? 'var(--type-size-button-sm, 14px)' : 'var(--type-size-button-md, 16px)',
        fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
      }}
      {...rest}
    >
      <Icon name={icon} size={compact ? 'var(--dim-size-300, 16px)' : iconSize} />
      {children}
    </button>
  );
};

export default BrandDashedAddButton;
