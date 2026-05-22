import React, { useState } from 'react';
import Radio from '@/components/radio/Radio';

/* MIH RadioGroup — Figma "Radio Group" (node 314:76). Group label
   (with optional required asterisk) + multiple Radio rows + optional
   error message at bottom.

   The Figma property panel exposes:
     • State : Default / WithDescription / Error / WithDescription-error
     • Show *: boolean — toggle the required asterisk after the legend

   Those collapse to two orthogonal flags in this API:
     • withDescription  — rows render an extra `description` line; row gap = 16
     • error            — string. When set, shows the error message at bottom
                          in `--text-danger-secondary` (Figma node 314:62).

   `options` shape: `{ value, label, description?, disabled? }`.
   Single-selection — `value` holds one value (controlled), `defaultValue`
   for uncontrolled. Default direction is column (Figma stacks vertically);
   pass `direction='row'` to render horizontally.                          */

const RadioGroup = ({
  legend,
  required = false,
  options = [],
  value,
  defaultValue,
  onChange,
  withDescription = false,
  error,
  name,
  direction = 'column',
  disabled = false,
  className = '',
  style = {},
}) => {
  const [internal, setInternal] = useState(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;

  const handleSelect = (next) => {
    if (!isControlled) setInternal(next);
    onChange && onChange(next);
  };

  const rowGap = withDescription ? 'var(--dim-space-400)' : 'var(--dim-space-300)';

  return (
    <fieldset
      className={`flex flex-col items-start w-full ${className}`}
      style={{
        gap: 'var(--dim-space-400)',
        border: 'none',
        padding: 'var(--dim-space-0)',
        margin: 'var(--dim-space-0)',
        ...style,
      }}
    >
      {legend != null && (
        <legend
          className='flex items-center w-full'
          style={{
            gap: 'var(--dim-space-100)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-regular)',
            lineHeight: 1.5,
            color: 'var(--text-neutral-default)',
            padding: 'var(--dim-space-0)',
          }}
        >
          <span>{legend}</span>
          {required && (
            <span style={{ color: 'var(--text-input-require, #DC2626)' }} aria-hidden>*</span>
          )}
        </legend>
      )}
      <div
        className={`flex ${direction === 'row' ? 'flex-row flex-wrap' : 'flex-col'} w-full`}
        style={{ gap: rowGap }}
      >
        {options.map((opt) => (
          <Radio
            key={String(opt.value)}
            name={name}
            value={opt.value}
            label={opt.label}
            description={withDescription ? opt.description : undefined}
            showDescription={withDescription}
            disabled={disabled || opt.disabled}
            checked={current === opt.value}
            onChange={() => handleSelect(opt.value)}
          />
        ))}
      </div>
      {error && (
        <p
          role='alert'
          style={{
            color: 'var(--text-danger-secondary, #DC2626)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
            fontWeight: 'var(--type-weight-regular)',
            lineHeight: 1.5,
            margin: 'var(--dim-space-0)',
            width: '100%',
          }}
        >
          {error}
        </p>
      )}
    </fieldset>
  );
};

export default RadioGroup;
