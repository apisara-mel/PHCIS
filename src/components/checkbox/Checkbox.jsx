import React, { useState } from 'react';
import CheckboxBox from '@/components/checkbox/CheckboxBox';

/* MIH Checkbox — Figma "Checkbox" (node 269:28). Box + Label + optional
   description, with optional trailing badge slot. 5 states:
     default / hover / selected / disabled-unchecked / disabled-checked.

   Controlled: pass `checked` + `onChange`. Uncontrolled: `defaultChecked`.
   Tokens alias from design.md.                                          */

const Checkbox = React.forwardRef(function Checkbox(
  {
    checked,
    defaultChecked = false,
    onChange,
    label,
    description,
    disabled = false,
    badge,            /* optional ReactNode rendered after content (Figma showBadge) */
    children,         /* optional expanded body shown when selected (type="other")   */
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

  const handleToggle = () => {
    if (disabled) return;
    const next = !isChecked;
    if (!isControlled) setInternal(next);
    onChange && onChange(next);
  };

  const labelColor = disabled && !isChecked
    ? 'var(--text-content-quaternary)'
    : 'var(--text-content-default)';
  const descColor = 'var(--text-content-tertiary)';

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
      {/* Hidden native input for forms + a11y */}
      <input
        type='checkbox'
        name={name}
        value={value}
        checked={isChecked}
        disabled={disabled}
        onChange={handleToggle}
        className='sr-only'
        aria-describedby={description ? undefined : undefined}
      />
      {/* Vertically align the box with the first text line (4px top inset) */}
      <span
        className='inline-flex flex-col items-start shrink-0'
        style={{ paddingTop: 'var(--dim-space-100)' }}
      >
        <CheckboxBox checked={isChecked} hover={hover && !disabled} disabled={disabled} />
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
        {description != null && (
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
        {/* Expanded body when selected (Figma type="Other" — Selected/Other) */}
        {isChecked && children}
      </span>

      {badge && <span className='shrink-0'>{badge}</span>}
    </label>
  );
});

export default Checkbox;
