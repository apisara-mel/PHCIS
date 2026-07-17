import React, { useRef, useState } from 'react';

/* MIH Mobile · Textarea — 1:1 with Figma component set
   "Textarea" (MIH Design System Foundation (App) · opz7X9AAKGQf5prHhsPDGn
   node 268:26). Press / Hover = node 268:13.

   Figma props → React props:
     • State             → derived, or forced via `state`
                           'default' | 'press' | 'hover' | 'filled' | 'error' | 'disabled'
     • Show Field Name   → `showFieldName`     (default true)
     • Show *            → `required`          (default false)
     • Show Helper text  → `helperText` / `showHelperText`

   Geometry (Figma): min-height 96 · pad 12×8 · radius-200 · gap-150.

   Press (268:13): 2px --border-input-hover + 4px --primaryBorder-600 ring.
   Border + ring drawn via box-shadow (inset + outer) so they sit flush —
   same anti-gap technique as web forms/Textarea.jsx. Figma "Press" =
   pointer hover OR focus.

   Inner <textarea> chrome stripped via .mih-mobile-textarea-input (CLAUDE.md). */

const STYLE_ID = 'mih-mobile-textarea-style';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.mih-mobile-textarea-input,
.mih-mobile-textarea-input:focus,
.mih-mobile-textarea-input:focus-visible {
  border: 0 !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
.mih-mobile-textarea-input::placeholder {
  color: var(--mih-textarea-placeholder, var(--text-input-default, #ADB2B7));
  opacity: 1;
}
.mih-mobile-textarea-input:disabled { cursor: not-allowed; }
`;
  document.head.appendChild(style);
}

const normalizeState = (state) => {
  if (!state) return null;
  const key = String(state).toLowerCase();
  if (key === 'hover' || key === 'focus') return 'press';
  if (key === 'disable') return 'disabled';
  return key;
};

/* Visible stroke is always an inset shadow (not CSS border) so width
   swaps 1↔2px never reflow content, and the outer ring sits flush. */
const STATES = {
  default: {
    bg: 'var(--surface-input-default, #FFFFFF)',
    borderShadow: 'inset 0 0 0 var(--dim-stroke-100, 1px) var(--border-input-default, #E2E4E6)',
    ring: 'none',
    placeholder: 'var(--text-input-default, #ADB2B7)',
    value: 'var(--text-input-filled, #4D5358)',
    label: 'var(--text-content-default, #111314)',
    labelWeight: 'var(--type-weight-regular, 400)',
    helper: 'var(--text-content-tertiary, #858C92)',
  },
  /* Figma 268:13 State=Press (= Hover): brand 2px stroke + input/100 ring */
  press: {
    bg: 'var(--surface-input-default, #FFFFFF)',
    borderShadow: 'inset 0 0 0 var(--dim-stroke-200, 2px) var(--border-input-hover, #08A768)',
    ring: '0 0 0 var(--dim-stroke-400, 4px) var(--primaryBorder-600, rgba(8, 167, 104, 0.15))',
    placeholder: 'var(--text-input-hover, #ADB2B7)',
    value: 'var(--text-input-typing, #4D5358)',
    label: 'var(--text-content-default, #111314)',
    labelWeight: 'var(--type-weight-regular, 400)',
    helper: 'var(--text-content-quaternary, #ADB2B7)',
  },
  filled: {
    bg: 'var(--surface-input-default, #FFFFFF)',
    borderShadow: 'inset 0 0 0 var(--dim-stroke-100, 1px) var(--border-input-filled, #E2E4E6)',
    ring: 'none',
    placeholder: 'var(--text-input-default, #ADB2B7)',
    value: 'var(--text-input-filled, #4D5358)',
    label: 'var(--text-content-default, #111314)',
    labelWeight: 'var(--type-weight-regular, 400)',
    helper: 'var(--text-content-quaternary, #ADB2B7)',
  },
  error: {
    bg: 'var(--surface-input-default, #FFFFFF)',
    borderShadow: 'inset 0 0 0 var(--dim-stroke-200, 2px) var(--border-input-error, #DC2626)',
    ring: 'none',
    placeholder: 'var(--text-input-error, #ADB2B7)',
    value: 'var(--text-input-filled, #4D5358)',
    label: 'var(--text-content-default, #111314)',
    labelWeight: 'var(--type-weight-regular, 400)',
    helper: 'var(--text-danger-secondary, #DC2626)',
  },
  disabled: {
    bg: 'var(--surface-input-disabled, #F4F5F5)',
    borderShadow: 'inset 0 0 0 var(--dim-stroke-100, 1px) var(--border-input-disabled, #E2E4E6)',
    ring: 'none',
    placeholder: 'var(--text-input-disabled, #ADB2B7)',
    value: 'var(--text-input-disabled, #ADB2B7)',
    label: 'var(--text-disabled-secondary, #636B72)',
    labelWeight: 'var(--type-weight-regular, 400)',
    helper: 'var(--text-disabled-tertiary, #ADB2B7)',
  },
};

const composeShadow = (V) => (
  V.ring && V.ring !== 'none'
    ? `${V.borderShadow}, ${V.ring}`
    : V.borderShadow
);

const Textarea = React.forwardRef(function Textarea({
  label,
  showFieldName = true,
  required = false,
  helperText,
  showHelperText = true,
  error,
  state,
  disabled = false,
  value,
  onChange,
  placeholder = 'Placeholder',
  rows = 3,
  minHeight = 96,
  resize = 'none',
  className = '',
  style,
  onFocus: onFocusProp,
  onBlur: onBlurProp,
  ...rest
}, ref) {
  const [focused, setFocused] = useState(false);
  const [mouseHover, setMouseHover] = useState(false);
  const innerRef = useRef(null);
  const taRef = ref || innerRef;

  const hasValue = value != null && String(value) !== '';
  /* Figma Press = Hover: pointer hover OR keyboard/tap focus */
  const engaged = focused || mouseHover;
  const forced = normalizeState(state);
  const resolved = forced || (
    disabled ? 'disabled'
      : error ? 'error'
        : engaged ? 'press'
          : hasValue ? 'filled'
            : 'default'
  );
  const V = STATES[resolved] || STATES.default;
  const boxShadow = composeShadow(V);

  const helper = (error && typeof error === 'string')
    ? error
    : (showHelperText ? helperText : undefined);

  /* Press + empty → placeholder (text-input-hover); typed → text-input-typing */
  const textColor = hasValue ? V.value : V.placeholder;

  const focusField = (e) => {
    if (disabled) return;
    const ta = typeof taRef === 'object' ? taRef?.current : null;
    if (!ta || e.target === ta) return;
    e.preventDefault();
    ta.focus();
  };

  return (
    <label
      className={`flex flex-col items-start ${className}`}
      style={{
        gap: 'var(--dim-space-150, 6px)',
        width: '100%',
        maxWidth: 'var(--dim-size-2900, 640px)',
        minWidth: 'var(--dim-size-2000, 128px)',
        ...style,
      }}
    >
      {showFieldName && label && (
        <span
          className='flex items-center w-full whitespace-nowrap'
          style={{
            gap: 'var(--dim-space-050, 2px)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            fontWeight: V.labelWeight,
            lineHeight: 1.5,
            color: V.label,
          }}
        >
          {label}
          {required && (
            <span
              style={{
                color: 'var(--text-input-require, #DC2626)',
                fontSize: 'var(--type-size-sm, 14px)',
                fontWeight: 'var(--type-weight-regular, 400)',
              }}
            >
              *
            </span>
          )}
        </span>
      )}

      <span
        className='flex flex-col items-start w-full overflow-hidden'
        onMouseEnter={() => !disabled && setMouseHover(true)}
        onMouseLeave={() => setMouseHover(false)}
        onMouseDown={focusField}
        style={{
          boxSizing: 'border-box',
          minHeight,
          paddingLeft: 'var(--dim-space-300, 12px)',
          paddingRight: 'var(--dim-space-300, 12px)',
          paddingTop: 'var(--dim-space-200, 8px)',
          paddingBottom: 'var(--dim-space-200, 8px)',
          background: V.bg,
          /* No CSS border — inset stroke + outer ring via box-shadow (Figma 268:13) */
          border: 'none',
          borderRadius: 'var(--dim-radius-200, 8px)',
          boxShadow,
          cursor: disabled ? 'not-allowed' : 'text',
          transition: 'box-shadow 160ms cubic-bezier(0.4, 0, 0.2, 1), background 160ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <textarea
          ref={taRef}
          className='mih-mobile-textarea-input'
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          rows={rows}
          aria-invalid={resolved === 'error' || undefined}
          onFocus={(e) => {
            setFocused(true);
            onFocusProp?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlurProp?.(e);
          }}
          style={{
            width: '100%',
            flex: 1,
            padding: 0,
            margin: 0,
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-base, 16px)',
            fontWeight: 'var(--type-weight-regular, 400)',
            lineHeight: 1.5,
            color: textColor,
            caretColor: 'var(--brand-p600, #08A768)',
            resize,
            ['--mih-textarea-placeholder']: V.placeholder,
          }}
          {...rest}
        />
      </span>

      {helper ? (
        <span
          className='w-full'
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            fontWeight: 'var(--type-weight-regular, 400)',
            lineHeight: 1.5,
            color: V.helper,
          }}
        >
          {helper}
        </span>
      ) : null}
    </label>
  );
});

export default Textarea;
