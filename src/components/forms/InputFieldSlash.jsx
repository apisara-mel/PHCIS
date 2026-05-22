import React from 'react';
import { FieldShell, InputBox, useFieldId } from '@/components/forms/_inputBox';

/* MIH InputFieldSlash — Figma "Input Field Slash" (node 2496:5327). Two
   inputs separated by a literal "/" character. Used for paired values like
   numerator/denominator or filename/extension.

   • Sizes: lg (40h), sm (36h)
   • States: default / hover / filled / error / disabled — applied to the
     whole row (both inputs share the state).
   • Slots: showLabel, showLeadingIcon (applied to each input), required,
     showHelperText.

   `value` and `onChange` operate on a two-tuple `[before, after]`. Pass
   `leadingIcon` (string) to use the same glyph in both inputs, or pass
   `leadingIcons={[firstIcon, secondIcon]}` for distinct glyphs.        */

const InputFieldSlash = React.forwardRef(function InputFieldSlash(
  {
    label,
    required = false,
    helperText,
    error,
    size = 'lg',
    placeholders = ['Placeholder', 'Placeholder'],
    value = ['', ''],
    onChange,
    leadingIcon,
    leadingIcons,
    showLabel = true,
    showHelperText = true,
    showLeadingIcon = true,
    separator = '/',
    state,
    disabled = false,
    name,
    className = '',
    style = {},
    ...rest
  },
  ref,
) {
  const idA = useFieldId('slashA');
  const idB = useFieldId('slashB');
  const [a, b] = value;
  const [iconA, iconB] = leadingIcons || [leadingIcon, leadingIcon];

  const update = (idx) => (next) => {
    const out = idx === 0 ? [next, b] : [a, next];
    onChange && onChange(out);
  };

  return (
    <FieldShell
      label={label}
      required={required}
      helperText={helperText}
      error={error}
      showLabel={showLabel}
      showHelperText={showHelperText}
      htmlFor={idA}
      className={className}
      style={{ minWidth: 320, ...style }}
    >
      <div
        className='flex items-center w-full'
        style={{ gap: 'var(--dim-space-150)' }}
      >
        <InputBox
          ref={ref}
          id={idA}
          name={name ? `${name}-a` : undefined}
          size={size}
          value={a}
          onChange={update(0)}
          placeholder={placeholders[0]}
          leadingIcon={showLeadingIcon ? iconA : undefined}
          state={state}
          error={!!error}
          disabled={disabled}
          required={required}
          {...rest}
        />
        <span
          aria-hidden
          style={{
            color: 'var(--text-content-default)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-base)',
            fontWeight: 'var(--type-weight-regular)',
            lineHeight: 1.5,
          }}
        >
          {separator}
        </span>
        <InputBox
          id={idB}
          name={name ? `${name}-b` : undefined}
          size={size}
          value={b}
          onChange={update(1)}
          placeholder={placeholders[1]}
          leadingIcon={showLeadingIcon ? iconB : undefined}
          state={state}
          error={!!error}
          disabled={disabled}
        />
      </div>
    </FieldShell>
  );
});

export default InputFieldSlash;
