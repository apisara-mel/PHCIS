import React, { useRef, useState } from 'react';
import { FieldShell, useFieldId } from '@/components/forms/_inputBox';

/* MIH OtpInput — Figma "OTP / Verification Code" (Foundation node 3649:928).
   A fixed row of single-character cells for entering an n-digit one-time code
   (default 6). Mirrors the Figma state set per cell:
     • default · focus(brand) · filled · error · disabled
   plus two sizes (lg 44 / md 40).

   Behaviour:
     • typing a digit fills the cell and advances focus
     • Backspace clears the current cell, or steps back when already empty
     • ArrowLeft / ArrowRight move between cells
     • pasting a code distributes digits across the cells
   Calls `onChange(code)` on every edit and `onComplete(code)` once all cells
   are filled. All visual values alias input tokens from design.md.          */

const SIZES = {
  /* xl — PHCIS-Signin "OTP Field · Large" (55:8422): 52×60 cell, Sarabun bold 24. */
  xl: { w: 'var(--dim-size-1100, 52px)', h: 'var(--dim-size-1300, 60px)', font: 'var(--type-size-2xl)', weight: 'var(--type-weight-bold, 700)' },
  lg: { w: 'var(--dim-size-900, 44px)',  h: 'var(--dim-size-900, 44px)',  font: 'var(--type-size-xl)',  weight: 'var(--type-weight-medium, 500)' },
  md: { w: 'var(--dim-size-800, 40px)',  h: 'var(--dim-size-800, 40px)',  font: 'var(--type-size-lg)',  weight: 'var(--type-weight-medium, 500)' },
};

const cellVisual = ({ focused, filled, error, disabled }) => {
  if (disabled)
    return { shadow: 'inset 0 0 0 var(--dim-stroke-100) var(--border-input-disabled)', bg: 'var(--surface-input-disabled)', color: 'var(--text-input-disabled)', ring: 'none' };
  if (error)
    return { shadow: 'inset 0 0 0 var(--dim-stroke-200) var(--border-input-error)', bg: 'var(--surface-input-default)', color: 'var(--text-input-filled)', ring: focused ? '0 0 0 var(--dim-stroke-400, 4px) var(--focus-ring-input-error)' : 'none' };
  if (focused)
    return { shadow: 'inset 0 0 0 var(--dim-stroke-200) var(--border-input-hover)', bg: 'var(--surface-input-default)', color: 'var(--text-input-typing)', ring: '0 0 0 var(--dim-stroke-400, 4px) var(--primaryBorder-600)' };
  if (filled)
    return { shadow: 'inset 0 0 0 var(--dim-stroke-100) var(--border-input-filled)', bg: 'var(--surface-input-default)', color: 'var(--text-input-filled)', ring: 'none' };
  return { shadow: 'inset 0 0 0 var(--dim-stroke-100) var(--border-input-default)', bg: 'var(--surface-input-default)', color: 'var(--text-input-default)', ring: 'none' };
};

const OtpInput = React.forwardRef(function OtpInput(
  {
    length = 6,
    value,
    onChange,
    onComplete,
    label,
    required = false,
    helperText,
    error,
    size = 'lg',
    disabled = false,
    autoFocus = false,
    className = '',
    style = {},
  },
  ref,
) {
  const baseId = useFieldId('otp');
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState('');
  const code = (isControlled ? value : internal) || '';
  const [focusedIdx, setFocusedIdx] = useState(autoFocus ? 0 : -1);
  const refs = useRef([]);
  const dim = SIZES[size] || SIZES.lg;
  const digits = Array.from({ length }, (_, i) => code[i] || '');

  const commit = (next) => {
    const clean = next.slice(0, length);
    if (!isControlled) setInternal(clean);
    onChange && onChange(clean);
    if (clean.length === length && !clean.includes(' ')) onComplete && onComplete(clean);
  };

  const setDigit = (idx, ch) => {
    const arr = digits.slice();
    arr[idx] = ch;
    commit(arr.join('').replace(/\s+$/g, ''));
  };

  const focusCell = (idx) => {
    const el = refs.current[idx];
    if (el) { el.focus(); el.select && el.select(); }
  };

  const handleChange = (idx, raw) => {
    const ch = raw.replace(/\D/g, '').slice(-1); // keep last typed digit only
    if (!ch) { setDigit(idx, ''); return; }
    setDigit(idx, ch);
    if (idx < length - 1) focusCell(idx + 1);
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace') {
      if (digits[idx]) { setDigit(idx, ''); return; }
      if (idx > 0) { focusCell(idx - 1); setDigit(idx - 1, ''); }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      focusCell(idx - 1); e.preventDefault();
    } else if (e.key === 'ArrowRight' && idx < length - 1) {
      focusCell(idx + 1); e.preventDefault();
    }
  };

  const handlePaste = (e) => {
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, length);
    if (!text) return;
    e.preventDefault();
    commit(text);
    focusCell(Math.min(text.length, length - 1));
  };

  const row = (
    <div
      ref={ref}
      className={`flex items-center ${className}`}
      style={{ gap: 'var(--dim-space-200)', ...style }}
      onPaste={handlePaste}
    >
      {digits.map((d, i) => {
        const v = cellVisual({ focused: focusedIdx === i, filled: !!d, error: !!error, disabled });
        return (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            id={`${baseId}-${i}`}
            inputMode='numeric'
            type='text'
            maxLength={1}
            value={d}
            disabled={disabled}
            aria-label={`หลักที่ ${i + 1}`}
            aria-invalid={!!error || undefined}
            autoFocus={autoFocus && i === 0}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={() => setFocusedIdx(i)}
            onBlur={() => setFocusedIdx((cur) => (cur === i ? -1 : cur))}
            className='mih-otp-cell text-center'
            style={{
              width: dim.w,
              height: dim.h,
              borderRadius: 'var(--dim-radius-200)',
              border: 'none',
              outline: 'none',
              background: v.bg,
              color: v.color,
              caretColor: 'var(--brand-p600)',
              boxShadow: v.ring !== 'none' ? `${v.shadow}, ${v.ring}` : v.shadow,
              fontFamily: 'var(--type-family-body)',
              fontSize: dim.font,
              fontWeight: dim.weight,
              lineHeight: 1,
              transition: 'box-shadow 160ms cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: disabled ? 'not-allowed' : 'text',
              WebkitAppearance: 'none',
              appearance: 'none',
            }}
          />
        );
      })}
    </div>
  );

  if (label == null && !error && !helperText) return row;

  return (
    <FieldShell
      label={label}
      required={required}
      helperText={helperText}
      error={error}
      htmlFor={`${baseId}-0`}
    >
      {row}
    </FieldShell>
  );
});

export default OtpInput;
