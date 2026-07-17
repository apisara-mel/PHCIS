import React, { useRef, useState } from 'react';
import { Sym } from '@/components/mobile/Sym';

/* MIH Mobile · Password — 1:1 with Figma component set
   "Password" (MIH Design System Foundation (App) · opz7X9AAKGQf5prHhsPDGn
   node 5021:1008).

   Figma props → React props:
     • Size              → `size`              'lg' | 'md' | 'Large' | 'Medium'
     • State             → derived, or forced via `state`
                           'default' | 'press' | 'hover' | 'filled' | 'error' | 'disabled'
     • Show Field Name   → `showFieldName`     (default true)
     • Show *            → `required`          (default false)
     • Show leading icon → `showLeadingIcon`   (default true) · glyph = lock
     • Show Password     → `showPassword`      (default true) · eye toggle
     • Show Helper text  → `helperText` / `showHelperText`

   Figma "Press" = Hover/focus ring (same tokens as Input Field).
   Leading icon defaults to `lock`; override with `leadingIcon` if needed.

   Inner <input> chrome stripped via .mih-mobile-password-input (CLAUDE.md). */

const STYLE_ID = 'mih-mobile-password-style';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.mih-mobile-password-input,
.mih-mobile-password-input:focus,
.mih-mobile-password-input:focus-visible {
  border: 0 !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
.mih-mobile-password-input::placeholder {
  color: var(--mih-password-placeholder, var(--text-input-default, #ADB2B7));
  opacity: 1;
}
.mih-mobile-password-input:disabled { cursor: not-allowed; }
`;
  document.head.appendChild(style);
}

const normalizeSize = (size) => {
  if (size === 'Large' || size === 'lg') return 'lg';
  if (size === 'Medium' || size === 'md') return 'md';
  return 'lg';
};

const normalizeState = (state) => {
  if (!state) return null;
  const key = String(state).toLowerCase();
  if (key === 'hover') return 'press';
  if (key === 'disable') return 'disabled';
  return key;
};

/* Size=Large 5021:1009 · Size=Medium 5021:1049 */
const SIZES = {
  lg: {
    rowGap: 'var(--dim-space-150, 6px)',
    height: 56,
    padX: 'var(--dim-space-600, 24px)',
    padY: 'var(--dim-space-200, 8px)',
    innerGap: 'var(--dim-space-200, 8px)',
    icon: 20,
    labelSize: 'var(--type-size-sm, 14px)',
    valueSize: 'var(--type-size-base, 16px)',
  },
  md: {
    rowGap: 'var(--dim-space-100, 4px)',
    height: 48,
    padX: 'var(--dim-space-400, 16px)',
    padY: 'var(--dim-space-150, 6px)',
    innerGap: 'var(--dim-space-150, 6px)',
    icon: 16,
    labelSize: 'var(--type-size-xs, 12px)',
    valueSize: 'var(--type-size-sm, 14px)',
  },
};

const STATES = {
  default: {
    bg: 'var(--surface-input-default, #FFFFFF)',
    borderW: 'var(--dim-stroke-100, 1px)',
    borderC: 'var(--border-input-default, #E2E4E6)',
    ring: 'none',
    placeholder: 'var(--text-input-default, #ADB2B7)',
    value: 'var(--text-input-filled, #4D5358)',
    icon: 'var(--icon-input-default, #ADB2B7)',
    label: 'var(--text-content-default, #111314)',
    labelWeight: 'var(--type-weight-regular, 400)',
    helper: 'var(--text-content-tertiary, #858C92)',
  },
  press: {
    bg: 'var(--surface-input-default, #FFFFFF)',
    borderW: 'var(--dim-stroke-200, 2px)',
    borderC: 'var(--border-input-hover, #08A768)',
    ring: '0 0 0 var(--dim-stroke-400, 4px) var(--primaryBorder-600, rgba(8, 167, 104, 0.15))',
    placeholder: 'var(--text-input-hover, #ADB2B7)',
    value: 'var(--text-input-filled, #4D5358)',
    /* Figma Press: eye turns brand green */
    icon: 'var(--icon-input-hover, #08A768)',
    label: 'var(--text-content-default, #111314)',
    labelWeight: 'var(--type-weight-regular, 400)',
    helper: 'var(--text-content-tertiary, #858C92)',
  },
  filled: {
    bg: 'var(--surface-input-default, #FFFFFF)',
    borderW: 'var(--dim-stroke-100, 1px)',
    borderC: 'var(--border-input-filled, #E2E4E6)',
    ring: 'none',
    placeholder: 'var(--text-input-default, #ADB2B7)',
    value: 'var(--text-input-filled, #4D5358)',
    icon: 'var(--icon-input-filled, #4D5358)',
    label: 'var(--text-content-default, #111314)',
    labelWeight: 'var(--type-weight-regular, 400)',
    helper: 'var(--text-content-tertiary, #858C92)',
  },
  error: {
    bg: 'var(--surface-input-default, #FFFFFF)',
    borderW: 'var(--dim-stroke-200, 2px)',
    borderC: 'var(--border-input-error, #DC2626)',
    ring: 'none',
    placeholder: 'var(--text-input-error, #ADB2B7)',
    value: 'var(--text-input-filled, #4D5358)',
    icon: 'var(--icon-input-error, #ADB2B7)',
    label: 'var(--text-content-default, #111314)',
    labelWeight: 'var(--type-weight-medium, 500)',
    helper: 'var(--text-danger-secondary, #DC2626)',
  },
  disabled: {
    bg: 'var(--surface-input-disabled, #F4F5F5)',
    borderW: 'var(--dim-stroke-100, 1px)',
    borderC: 'var(--border-input-disabled, #E2E4E6)',
    ring: 'none',
    placeholder: 'var(--text-input-disabled, #ADB2B7)',
    value: 'var(--text-input-disabled, #ADB2B7)',
    icon: 'var(--icon-input-disabled, #ADB2B7)',
    label: 'var(--text-disabled-secondary, #636B72)',
    labelWeight: 'var(--type-weight-regular, 400)',
    helper: 'var(--text-disabled-tertiary, #ADB2B7)',
  },
};

const Password = React.forwardRef(function Password({
  label,
  showFieldName = true,
  required = false,
  showLeadingIcon = true,
  leadingIcon = 'lock',
  showPassword = true,
  helperText,
  showHelperText = true,
  error,
  size = 'lg',
  state,
  disabled = false,
  value,
  onChange,
  placeholder,
  autoComplete = 'current-password',
  className = '',
  style,
  defaultRevealed = false,
  ...rest
}, ref) {
  const [engaged, setEngaged] = useState(false);
  const [revealed, setRevealed] = useState(defaultRevealed);
  const innerRef = useRef(null);
  const inputRef = ref || innerRef;

  const S = SIZES[normalizeSize(size)] || SIZES.lg;
  const hasValue = value != null && String(value) !== '';

  const forced = normalizeState(state);
  const resolved = forced || (
    disabled ? 'disabled'
      : error ? 'error'
        : engaged ? 'press'
          : hasValue ? 'filled'
            : 'default'
  );
  const V = STATES[resolved] || STATES.default;

  const helper = (error && typeof error === 'string')
    ? error
    : (showHelperText ? helperText : undefined);

  const ink = hasValue || resolved === 'filled' ? V.value : V.placeholder;
  const canToggle = showPassword && !disabled;

  return (
    <label
      className={`flex flex-col items-start ${className}`}
      style={{
        gap: S.rowGap,
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
            fontSize: S.labelSize,
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
        className='flex items-center w-full overflow-hidden'
        style={{
          boxSizing: 'border-box',
          height: S.height,
          gap: S.innerGap,
          paddingLeft: S.padX,
          paddingRight: S.padX,
          paddingTop: S.padY,
          paddingBottom: S.padY,
          background: V.bg,
          border: `${V.borderW} solid ${V.borderC}`,
          borderRadius: 'var(--dim-radius-full, 9999px)',
          boxShadow: V.ring,
          transition: 'border-color .15s ease, box-shadow .15s ease',
        }}
      >
        {showLeadingIcon && leadingIcon ? (
          <span className='inline-flex shrink-0' style={{ color: V.icon }} aria-hidden>
            <Sym name={leadingIcon} size={S.icon} />
          </span>
        ) : null}

        <input
          ref={inputRef}
          className='mih-mobile-password-input'
          type={revealed ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={resolved === 'error' || undefined}
          onPointerDown={() => setEngaged(true)}
          onFocus={() => setEngaged(true)}
          onBlur={() => setEngaged(false)}
          style={{
            flex: 1,
            minWidth: 0,
            height: '100%',
            padding: 0,
            fontFamily: 'var(--type-family-body)',
            fontSize: S.valueSize,
            lineHeight: 1.5,
            color: ink,
            textOverflow: 'ellipsis',
            ['--mih-password-placeholder']: V.placeholder,
          }}
          {...rest}
        />

        {showPassword ? (
          <button
            type='button'
            tabIndex={canToggle ? 0 : -1}
            disabled={!canToggle}
            aria-label={revealed ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
            aria-pressed={revealed}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              if (!canToggle) return;
              setRevealed((v) => !v);
            }}
            className='inline-flex items-center justify-center shrink-0'
            style={{
              width: S.icon,
              height: S.icon,
              padding: 0,
              border: 0,
              background: 'transparent',
              color: V.icon,
              cursor: canToggle ? 'pointer' : 'not-allowed',
            }}
          >
            <Sym name={revealed ? 'visibility_off' : 'visibility'} size={S.icon} />
          </button>
        ) : null}
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

export default Password;
