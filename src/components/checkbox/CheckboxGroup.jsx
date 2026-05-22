import React, { useState } from 'react';
import Checkbox from '@/components/checkbox/Checkbox';

/* MIH CheckboxGroup — Figma "Checkbox Group" (node 328:5438). Group label
   (with optional required asterisk) + multiple Checkbox rows + optional
   error message at bottom.

   States from Figma collapse to two orthogonal flags:
     • withDescription  — rows render an extra `description` line; row gap = 16
     • error            — show error message at bottom in danger/secondary

   `options` is an array of:
     { value, label, description?, badge?, disabled? }
   `value` is an array of selected values (controlled). Use `defaultValue`
   for uncontrolled.                                                     */

const CheckboxGroup = ({
  legend,
  required = false,
  options = [],
  value,
  defaultValue,
  onChange,
  withDescription = false,
  error,                /* string — when set, also styles label/asterisk */
  name,
  className = '',
  style = {},
}) => {
  const [internal, setInternal] = useState(() => defaultValue || []);
  const isControlled = value !== undefined;
  const selected = isControlled ? value : internal;

  const toggle = (val) => {
    const next = selected.includes(val)
      ? selected.filter((v) => v !== val)
      : [...selected, val];
    if (!isControlled) setInternal(next);
    onChange && onChange(next);
  };

  return (
    <fieldset
      className={`flex flex-col items-start w-full ${className}`}
      style={{
        gap: withDescription ? 'var(--dim-space-400)' : 'var(--dim-space-300)',
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
            <span style={{ color: 'var(--text-input-require, #DC2626)' }}>*</span>
          )}
        </legend>
      )}
      <div className='flex flex-col w-full' style={{ gap: withDescription ? 'var(--dim-space-400)' : 'var(--dim-space-300)' }}>
        {options.map((opt) => (
          <Checkbox
            key={opt.value}
            name={name}
            value={opt.value}
            label={opt.label}
            description={withDescription ? opt.description : undefined}
            badge={opt.badge}
            disabled={opt.disabled}
            checked={selected.includes(opt.value)}
            onChange={() => toggle(opt.value)}
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

export default CheckboxGroup;
