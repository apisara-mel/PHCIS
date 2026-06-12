import React, { useState } from 'react';
import InputField from '@/components/forms/InputField';
import { Sym } from '@/components/forms/_inputBox';

/* MIH PasswordField — Figma "Password Field" (Foundation node 3647:681).
   The canonical masked-credential input: a leading `lock` glyph, the masked
   value, and a trailing `visibility` / `visibility_off` toggle that reveals
   the text. Built on top of InputField so every state (default · focus ·
   filled · error · disabled) and all token aliases come for free.

   States mirror the Figma component set:
     • default / focus(hover) / filled / error / disabled

   Controlled (`value` + `onChange`) or uncontrolled (`defaultValue`).
   `onChange` receives (value, event) — same contract as InputField.        */

const PasswordField = React.forwardRef(function PasswordField(
  {
    label = 'รหัสผ่าน',
    placeholder = '********',
    leadingIcon = 'lock',
    disabled = false,
    error,
    ...rest
  },
  ref,
) {
  const [revealed, setRevealed] = useState(false);

  /* The reveal toggle lives in InputField's `trailing` slot. It's a real
     <button> so InputBox's gutter-click forwarder leaves it alone, and so
     keyboard users can tab to it. Icon color tracks the same input icon
     token used by the leading glyph. */
  const toggle = (
    <button
      type='button'
      tabIndex={disabled ? -1 : 0}
      aria-label={revealed ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
      aria-pressed={revealed}
      onClick={() => !disabled && setRevealed((v) => !v)}
      disabled={disabled}
      className='inline-flex items-center justify-center shrink-0 bg-transparent border-0 p-0'
      style={{ cursor: disabled ? 'not-allowed' : 'pointer', lineHeight: 0 }}
    >
      <Sym
        name={revealed ? 'visibility_off' : 'visibility'}
        size={'var(--dim-size-400)'}
        color={disabled ? 'var(--icon-input-disabled)' : 'var(--icon-input-default)'}
      />
    </button>
  );

  return (
    <InputField
      ref={ref}
      type={revealed ? 'text' : 'password'}
      label={label}
      placeholder={placeholder}
      leadingIcon={leadingIcon}
      trailing={toggle}
      disabled={disabled}
      error={error}
      {...rest}
    />
  );
});

export default PasswordField;
