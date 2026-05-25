import React, { useState } from 'react';
import CheckboxBox from '@/components/checkbox/CheckboxBox';
import ColorfulBadge from '@/components/badge/ColorfulBadge';

/* MIH CheckboxButton — Figma "Checkbox Button" (node 2254:8344, MIH DS Foundation).
   Card states (showBorder=true) per Figma — NOT the same stroke/shadow mix as RadioButton:
     • Default  — 1px neutral border, no shadow
     • Hover    — 1px brand-tertiary border + Brand Drop Shadow Bottom/200
     • Selected — 2px brand-default border + Brand Drop Shadow Top/200
     • Disabled — 1px neutral border, muted label/checkbox

   Slots: showBorder/border, showCircleIcon, showIcon, showBadge2, showDescription, showBadge
   Pass `state` for component-library grids only. */

const BRAND_SHADOW_TOP = 'var(--shadow-brand-top-200)';
const BRAND_SHADOW_BOTTOM = 'var(--shadow-brand-drop-bottom-200)';

const resolveCardChrome = ({ state, border }) => {
  if (!border) return { border: 'none', boxShadow: 'none' };
  switch (state) {
    case 'hover':
      return {
        border: 'var(--dim-stroke-100) solid var(--border-brandprimarybutton-tertiary)',
        boxShadow: BRAND_SHADOW_BOTTOM,
      };
    case 'selected':
      return {
        border: 'var(--dim-stroke-200) solid var(--border-brandprimarybutton-default)',
        boxShadow: BRAND_SHADOW_TOP,
      };
    case 'disabled-checked':
    case 'disabled-unchecked':
      return {
        border: 'var(--dim-stroke-100) solid var(--border-neutralbutton-tertiary)',
        boxShadow: 'none',
      };
    default:
      return {
        border: 'var(--dim-stroke-100) solid var(--border-neutralbutton-tertiary)',
        boxShadow: 'none',
      };
  }
};

const Sym = ({ name, size = 24, color }) => (
  <span
    className='material-symbols-outlined shrink-0'
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontSize: size,
      color,
      lineHeight: 1,
      display: 'inline-flex',
    }}
    aria-hidden
  >
    {name}
  </span>
);

const CheckboxButton = React.forwardRef(function CheckboxButton(
  {
    checked,
    defaultChecked = false,
    onChange,
    disabled = false,
    state: stateProp,

    showBorder = true,
    border: borderProp,

    label = 'Checkbox label',
    showDescription = false,
    description = 'Optional description',

    showCircleIcon = false,
    circleIcon,
    circleIconName = 'stethoscope',

    showIcon = false,
    icon,
    iconName = 'sentiment_satisfied',

    showBadge2 = false,
    badge2,

    showBadge = false,
    badge,

    className = '',
    style = {},
    ...rest
  },
  ref,
) {
  const [internal, setInternal] = useState(defaultChecked);
  const isControlled = checked !== undefined;
  const isChecked = isControlled ? checked : internal;
  const [hover, setHover] = useState(false);

  const hasBorder = borderProp !== undefined ? borderProp : showBorder;

  const state = stateProp ?? (
    disabled
      ? (isChecked ? 'disabled-checked' : 'disabled-unchecked')
      : isChecked
        ? 'selected'
        : hover
          ? 'hover'
          : 'default'
  );

  const isDisabled = state === 'disabled-checked' || state === 'disabled-unchecked';
  const boxChecked = state === 'selected' || state === 'disabled-checked';
  const isPointerHover = !isDisabled && hover;

  const handleToggle = () => {
    if (isDisabled) return;
    const next = !isChecked;
    if (!isControlled) setInternal(next);
    onChange && onChange(next);
  };

  const handleKeyDown = (e) => {
    if (isDisabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleToggle();
    }
  };

  const { border: borderCss, boxShadow } = resolveCardChrome({ state, border: hasBorder });

  /* Hover lift — the card nudges up 1px on hover so the brand drop shadow
     reads as elevation, not just a tint. `selected` keeps the lift so the
     active card stays elevated; default/disabled stay flush. */
  const cardLift = (state === 'hover' || state === 'selected') ? -1 : 0;

  const labelColor = isDisabled
    ? (state === 'disabled-checked'
      ? 'var(--text-content-secondary)'
      : 'var(--text-content-quaternary)')
    : 'var(--text-content-default)';

  const renderTrailingBadge = () => {
    if (!showBadge) return null;
    if (badge !== undefined) return badge;
    return <ColorfulBadge style='grey' size='small'>Text</ColorfulBadge>;
  };
  const renderInlineBadge = () => {
    if (!showBadge2) return null;
    if (badge2 !== undefined) return badge2;
    return <ColorfulBadge style='red' size='small'>Text</ColorfulBadge>;
  };

  return (
    <label
      ref={ref}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onKeyDown={handleKeyDown}
      className={`inline-flex items-center overflow-hidden ${className}`}
      style={{
        gap: 'var(--dim-space-200)',
        minHeight: hasBorder ? 56 : 40,
        minWidth: 80,
        paddingLeft: 'var(--dim-space-400)',
        paddingRight: 'var(--dim-space-400)',
        paddingTop: 'var(--dim-space-200)',
        paddingBottom: 'var(--dim-space-200)',
        borderRadius: 'var(--dim-radius-200)',
        border: borderCss,
        boxShadow,
        background: 'var(--surface-neutralbutton-quinary)',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        boxSizing: 'border-box',
        outline: 'none',
        /* Smoother card-state transition — easing curve settles instead
           of snapping, and `transform` carries a 1-px hover lift so the
           brand drop shadow reads as actual elevation. */
        transform: `translateY(${cardLift}px)`,
        transition: 'border-color 180ms cubic-bezier(0.16, 1, 0.3, 1),'
                  + ' box-shadow 180ms cubic-bezier(0.16, 1, 0.3, 1),'
                  + ' background-color 180ms cubic-bezier(0.16, 1, 0.3, 1),'
                  + ' transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        userSelect: 'none',
        ...style,
      }}
      {...rest}
    >
      <input
        type='checkbox'
        checked={boxChecked}
        disabled={isDisabled}
        onChange={handleToggle}
        className='sr-only'
      />

      <span
        className='inline-flex flex-col items-start shrink-0'
        style={{ paddingTop: 'var(--dim-space-100)' }}
      >
        <CheckboxBox
          checked={boxChecked}
          hover={isPointerHover || state === 'hover'}
          disabled={isDisabled}
        />
      </span>

      {showCircleIcon && (
        circleIcon !== undefined ? (
          <span className='shrink-0'>{circleIcon}</span>
        ) : (
          <span
            className='inline-flex items-center justify-center shrink-0'
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--dim-radius-full, 9999px)',
              background: 'var(--surface-brandprimary-quaternary)',
              color: 'var(--icon-brandprimarybutton-default)',
            }}
          >
            <Sym name={circleIconName} size={20} color='currentColor' />
          </span>
        )
      )}

      {showIcon && (
        icon !== undefined ? (
          <span className='shrink-0'>{icon}</span>
        ) : (
          <Sym name={iconName} size={24} color={labelColor} />
        )
      )}

      <span
        className='flex flex-col items-start min-w-0 flex-1 overflow-hidden'
        style={{ fontFamily: 'var(--type-family-body)', lineHeight: 1.5 }}
      >
        <span className='flex items-center gap-2 min-w-0'>
          {label != null && (
            <span
              className='truncate'
              style={{
                color: labelColor,
                fontSize: 'var(--type-size-sm)',
                fontWeight: 'var(--type-weight-regular)',
              }}
            >
              {label}
            </span>
          )}
          {renderInlineBadge()}
        </span>
        {showDescription && (
          <span
            className='truncate'
            style={{
              color: 'var(--text-content-tertiary)',
              fontSize: 'var(--type-size-xs)',
              fontWeight: 'var(--type-weight-regular)',
            }}
          >
            {description}
          </span>
        )}
      </span>

      {renderTrailingBadge()}
    </label>
  );
});

export default CheckboxButton;
