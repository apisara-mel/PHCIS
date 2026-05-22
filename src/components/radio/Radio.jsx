import React, { useState } from 'react';
import RadioBox from '@/components/radio/RadioBox';

/* MIH Radio — Figma "Radio" (node 269:55). Box + Label + optional
   description. 5 states matching the Figma property panel:
     default / hover / selected / disabled-unchecked / disabled-checked.
   Plus `showDescription` boolean from the Figma property panel.

   Controlled: pass `checked` + `onChange`. Uncontrolled: `defaultChecked`.
   When used inside <RadioGroup>, the group injects checked/onChange.    */

const Radio = React.forwardRef(function Radio(
  {
    checked,
    defaultChecked = false,
    onChange,
    label,
    description,
    showDescription,        /* mirrors Figma `Show Description` property */
    disabled = false,
    name,
    value,
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

  /* `showDescription` defaults to "show when content provided" so callers
     who pass `description` don't need to also flip the flag. Pass `false`
     explicitly to hide. */
  const renderDescription = showDescription !== false && description != null;

  const handleSelect = () => {
    if (disabled || isChecked) return;
    if (!isControlled) setInternal(true);
    onChange && onChange(value !== undefined ? value : true);
  };

  const labelColor = disabled
    ? 'var(--text-content-quaternary)'
    : 'var(--text-content-default)';
  const descColor = disabled
    ? 'var(--text-content-quaternary)'
    : 'var(--text-content-tertiary)';

  return (
    <label
      ref={ref}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`inline-flex items-start ${className}`}
      style={{
        gap: 'var(--dim-space-200)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
      {...rest}
    >
      <input
        type='radio'
        name={name}
        value={value}
        checked={isChecked}
        disabled={disabled}
        onChange={handleSelect}
        className='sr-only'
      />
      {/* 4px top inset aligns the box with the first text line — same as Checkbox */}
      <span
        className='inline-flex flex-col items-start shrink-0'
        style={{ paddingTop: 'var(--dim-space-100)' }}
      >
        <RadioBox checked={isChecked} hover={hover && !disabled} disabled={disabled} />
      </span>

      <span
        className='flex flex-col items-start min-w-0'
        style={{
          gap: 'var(--dim-space-050)',
          fontFamily: 'var(--type-family-body)',
          lineHeight: 1.5,
        }}
      >
        {label != null && (
          <span
            style={{
              color: labelColor,
              fontSize: 'var(--type-size-sm)',
              fontWeight: 'var(--type-weight-regular)',
            }}
          >
            {label}
          </span>
        )}
        {renderDescription && (
          <span
            style={{
              color: descColor,
              fontSize: 'var(--type-size-xs)',
              fontWeight: 'var(--type-weight-regular)',
            }}
          >
            {description}
          </span>
        )}
      </span>
    </label>
  );
});

export default Radio;
