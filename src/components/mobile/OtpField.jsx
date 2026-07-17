import React, { useRef } from 'react';

/* MIH Mobile · OTP Field — 1:1 with Figma component set "OTP Field"
   (MIH Design System Foundation (App) · opz7X9AAKGQf5prHhsPDGn node 5016:2041).

   Figma props → React props:
     • Size            → `size`           'lg' | 'md' | 'Large' | 'Medium'
     • State           → derived, or forced via `state`
                         'default' | 'press' | 'filled' | 'error' | 'disabled'
     • Show Field Name → `showFieldName`  (default true)
     • Show *          → `required`       (default false)
     • Show Helper text→ `helperText` / `showHelperText`

   Precedence mirrors how the board reads: disabled ⟩ error ⟩ press ⟩ filled ⟩
   default. `press` is the tapped/focused cell — Figma's variant is named Press
   even though its inner cell still says state="Hover" (source drift).

   Digits auto-advance; Backspace on an empty cell steps back. `onComplete`
   fires once the last digit lands — the Figma screens have no confirm CTA.

   Inner <input> chrome is stripped via .mih-mobile-otpfield-cell per CLAUDE.md:
   the cell owns its border, so the native control must contribute none. */

const STYLE_ID = 'mih-mobile-otpfield-style';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.mih-mobile-otpfield-cell,
.mih-mobile-otpfield-cell:focus,
.mih-mobile-otpfield-cell:focus-visible {
  outline: none !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
.mih-mobile-otpfield-cell::-webkit-outer-spin-button,
.mih-mobile-otpfield-cell::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.mih-mobile-otpfield-cell:disabled { cursor: not-allowed; }
`;
  document.head.appendChild(style);
}

export const OTP_LEN = 6;

const normalizeSize = (size) => {
  if (size === 'Large' || size === 'lg') return 'lg';
  if (size === 'Medium' || size === 'md') return 'md';
  return 'lg';
};

const normalizeState = (state) => {
  if (!state) return null;
  const key = String(state).toLowerCase();
  if (key === 'hover') return 'press';   /* Figma's inner cell still says Hover */
  if (key === 'disable') return 'disabled';
  return key;
};

/* Size=Large 5016:2042 · Size=Medium 5016:2082.
   Medium shrinks the cell and the label but NOT the helper text or the 24px
   glyph — that's what the board ships, mirrored here rather than "corrected". */
const SIZES = {
  lg: {
    rowGap:    'var(--dim-space-150, 6px)',
    cellW:     'var(--dim-size-1000, 48px)',
    cellH:     'var(--dim-size-1200, 56px)',
    labelSize: 'var(--type-size-sm, 14px)',
  },
  md: {
    rowGap:    'var(--dim-space-100, 4px)',
    cellW:     'var(--dim-size-800, 40px)',
    cellH:     'var(--dim-size-1000, 48px)',
    labelSize: 'var(--type-size-xs, 12px)',
  },
};

/* Several states swap the TOKEN while the light-mode literal stays put
   (border/input/filled = border/input/default = #E2E4E6, etc). Bind the
   state-specific token anyway — they diverge in dark mode. */
const STATES = {
  default: {
    bg:          'var(--surface-input-default, #FFFFFF)',
    borderW:     'var(--dim-stroke-100, 1px)',
    borderC:     'var(--border-input-default, #E2E4E6)',
    ring:        'none',
    value:       'var(--text-input-default, #ADB2B7)',
    label:       'var(--text-content-default, #363B3F)',
    labelWeight: 'var(--type-weight-regular, 400)',
    helper:      'var(--text-content-tertiary, #858C92)',
  },
  press: {
    bg:          'var(--surface-input-default, #FFFFFF)',
    borderW:     'var(--dim-stroke-200, 2px)',
    borderC:     'var(--border-input-hover, #08A768)',
    /* Figma effect style "input/100" — 4px spread, no offset/blur. */
    ring:        '0 0 0 var(--dim-stroke-400, 4px) var(--primaryBorder-600)',
    value:       'var(--text-input-typing, #4D5358)',
    label:       'var(--text-content-default, #363B3F)',
    labelWeight: 'var(--type-weight-regular, 400)',
    helper:      'var(--text-content-tertiary, #858C92)',
  },
  filled: {
    bg:          'var(--surface-input-default, #FFFFFF)',
    borderW:     'var(--dim-stroke-100, 1px)',
    borderC:     'var(--border-input-filled, #E2E4E6)',
    ring:        'none',
    value:       'var(--text-input-filled, #4D5358)',
    label:       'var(--text-content-default, #363B3F)',
    labelWeight: 'var(--type-weight-regular, 400)',
    helper:      'var(--text-content-tertiary, #858C92)',
  },
  error: {
    bg:          'var(--surface-input-default, #FFFFFF)',
    borderW:     'var(--dim-stroke-200, 2px)',
    borderC:     'var(--border-input-error, #DC2626)',
    ring:        'none',
    /* Figma names this text/input/error-otp — OTP is the only field whose VALUE
       turns red on error (a normal input keeps its ink and only reddens the
       helper). No such token exists here yet; text/danger/secondary is the same
       red/600 and is already dark-mapped, so it stands in rather than minting a
       near-duplicate. */
    value:       'var(--text-danger-secondary, #DC2626)',
    label:       'var(--text-content-default, #363B3F)',
    /* Error is the only variant that shifts the label to Medium (Figma 5016:2066). */
    labelWeight: 'var(--type-weight-medium, 500)',
    helper:      'var(--text-danger-secondary, #DC2626)',
  },
  disabled: {
    bg:          'var(--surface-input-disabled, #F4F5F5)',
    borderW:     'var(--dim-stroke-100, 1px)',
    borderC:     'var(--border-input-disabled, #E2E4E6)',
    ring:        'none',
    value:       'var(--text-input-disabled, #ADB2B7)',
    label:       'var(--text-disabled-secondary, #636B72)',
    labelWeight: 'var(--type-weight-regular, 400)',
    helper:      'var(--text-disabled-tertiary, #ADB2B7)',
  },
};

const MobileOtpField = ({
  label,
  showFieldName = true,
  required = false,
  helperText,
  showHelperText = true,
  error,
  size = 'lg',
  state,
  disabled = false,
  value = '',
  onChange,
  onComplete,
  length = OTP_LEN,
  className = '',
  style,
}) => {
  const refs = useRef([]);
  const [focused, setFocused] = React.useState(false);

  const S = SIZES[normalizeSize(size)] || SIZES.lg;
  const digits = String(value || '');

  const forced = normalizeState(state);
  const resolved = forced || (
    disabled ? 'disabled'
      : error ? 'error'
        : focused ? 'press'
          : digits.length > 0 ? 'filled'
            : 'default'
  );
  const V = STATES[resolved] || STATES.default;

  const helper = (error && typeof error === 'string')
    ? error
    : (showHelperText ? helperText : undefined);

  const setDigit = (i, raw) => {
    if (disabled) return;
    const d = raw.replace(/\D/g, '').slice(-1);
    const next = digits.padEnd(length, ' ').split('');
    next[i] = d || ' ';
    const joined = next.join('').replace(/\s+$/, '');
    onChange && onChange(joined);
    if (d && refs.current[i + 1]) refs.current[i + 1].focus();
    /* Fire once the field is genuinely full — no confirm CTA on these screens. */
    if (d && i === length - 1 && joined.replace(/\s/g, '').length === length) {
      onComplete && onComplete(joined);
    }
  };

  const onKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && refs.current[i - 1]) {
      refs.current[i - 1].focus();
    }
  };

  return (
    <div
      className={`flex flex-col items-center ${className}`}
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
          className='flex items-center justify-center w-full whitespace-nowrap'
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
          {/* Asterisk holds size/sm even at Medium — per Figma 5016:2082. */}
          {required && (
            <span style={{ color: 'var(--text-input-require, #DC2626)', fontSize: 'var(--type-size-sm, 14px)' }}>*</span>
          )}
        </span>
      )}

      <div className='flex items-center justify-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            className='mih-mobile-otpfield-cell'
            inputMode='numeric'
            autoComplete='one-time-code'
            maxLength={1}
            disabled={disabled}
            aria-label={`หลักที่ ${i + 1}`}
            aria-invalid={resolved === 'error' || undefined}
            value={(digits[i] || '').trim()}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKey(i, e)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
              width: S.cellW,
              height: S.cellH,
              padding: 'var(--dim-space-200, 8px) var(--dim-space-100, 4px)',
              textAlign: 'center',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-2xl, 24px)',
              fontWeight: 'var(--type-weight-bold, 700)',
              lineHeight: 1.5,
              color: V.value,
              background: V.bg,
              border: `${V.borderW} solid ${V.borderC}`,
              borderRadius: 'var(--dim-radius-200, 8px)',
              boxShadow: V.ring,
              transition: 'border-color .15s ease, box-shadow .15s ease',
            }}
          />
        ))}
      </div>

      {helper && (
        <span
          className='w-full'
          style={{
            fontFamily: 'var(--type-family-body)',
            /* Helper stays size/sm at Medium — Figma does not scale it. */
            fontSize: 'var(--type-size-sm, 14px)',
            lineHeight: 1.5,
            textAlign: 'center',
            color: V.helper,
          }}
        >
          {helper}
        </span>
      )}
    </div>
  );
};

export default MobileOtpField;
