import React, { useState } from 'react';
import { Sym } from '@/components/forms/_inputBox';

/* MIH SelectableOptionCard — Figma "Card / Selectable Option" (node 227:193).
   A radio-like choice tile: circular tinted icon, title, supporting copy,
   centered. Used for picking an OTP delivery channel (SMS / Email) in the
   sign-in flow, and any "choose one of N" surface.

   States (per Figma): default · hover · selected.
     • default  → 1px brandPrimary/quaternary border + brand drop shadow
     • hover    → elevated shadow
     • selected → 2px brandPrimary/default (green) border

   Tokens alias design.md §3/§4 — no literals. Renders as a <button> with
   role/aria-pressed so it's keyboard-operable and announces its state.      */

const SelectableOptionCard = React.forwardRef(function SelectableOptionCard(
  {
    icon,                 /* Material Symbols name OR a ReactNode */
    illustration,         /* img src — Figma colored illustration (65px); replaces the tinted icon tile */
    title,
    description,
    selected = false,
    onSelect,
    disabled = false,
    className = '',
    style = {},
    ...rest
  },
  ref,
) {
  const [hover, setHover] = useState(false);

  const border = selected
    ? 'var(--dim-stroke-200) solid var(--border-brandPrimary-default)'
    : 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)';
  const shadow = disabled
    ? 'none'
    : hover || selected
      ? 'var(--shadow-drop, var(--shadow-card))'
      : 'var(--shadow-card)';

  return (
    <button
      ref={ref}
      type='button'
      role='radio'
      aria-checked={selected}
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => !disabled && onSelect && onSelect()}
      onMouseEnter={() => !disabled && setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`flex flex-col items-center text-center transition-all duration-200 ease-out ${className}`}
      style={{
        gap: 'var(--dim-space-400)',
        padding: 'var(--dim-space-600)',
        width: '100%',
        borderRadius: 'var(--dim-radius-500)',
        border,
        background: 'var(--surface-card-100)',
        boxShadow: shadow,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transform: !disabled && hover && !selected ? 'translateY(-2px)' : 'translateY(0)',
        ...style,
      }}
      {...rest}
    >
      {illustration ? (
        /* Figma colored illustration (PHCIS-Signin 42:8722 "Select card") —
           ships its own circular tinted background, so render bare. */
        <img
          src={illustration}
          alt=''
          aria-hidden
          className='shrink-0'
          style={{
            width: 'var(--dim-size-1400, 64px)',
            height: 'var(--dim-size-1400, 64px)',
            objectFit: 'contain',
          }}
        />
      ) : (
        /* Circular tinted icon tile */
        <span
          className='inline-flex items-center justify-center shrink-0'
          style={{
            width: 'var(--dim-size-1400)',
            height: 'var(--dim-size-1400)',
            borderRadius: 'var(--dim-radius-600)',
            background: 'var(--surface-brandPrimary-quaternary)',
          }}
        >
          {typeof icon === 'string'
            ? <Sym name={icon} size={'var(--dim-size-600)'} color='var(--brand-p600)' />
            : icon}
        </span>
      )}

      <span className='flex flex-col items-center' style={{ gap: 'var(--dim-space-200)' }}>
        {title != null && (
          <span
            style={{
              color: 'var(--text-brandPrimary-default)',
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-base)',
              fontWeight: 'var(--type-weight-regular)',
              lineHeight: 1.5,
            }}
          >
            {title}
          </span>
        )}
        {description != null && (
          <span
            style={{
              color: 'var(--brand-p600)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              fontWeight: 'var(--type-weight-regular)',
              lineHeight: 1.5,
              whiteSpace: 'pre-line',
            }}
          >
            {description}
          </span>
        )}
      </span>
    </button>
  );
});

export default SelectableOptionCard;
