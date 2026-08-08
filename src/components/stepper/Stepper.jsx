import React, { useRef, useState } from 'react';

/* MIH Stepper — Figma "Stepper" (MIH Design System Foundation, node 2709:6338).
   Numeric +/- input with two flanking buttons and a centered value field.

   Sizes:  large (40h × 128w · 36px buttons) — default
           small (36h × 112w · 32px buttons)
   States: default · hover · filled · disabled
     • default  — empty input, neutral 1px border
     • hover    — empty input, brand 2px border
     • filled   — typed value, neutral 1px border
     • disabled — locked value, neutral border, surface tinted
   `state` overrides the auto-resolved state for design-system demos.

   Tokens alias from design.md §6.x — no hex literals. */

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

const SIZE = {
  large: { h: 40, w: 128, btn: 36, font: 'var(--type-size-base)' },
  small: { h: 36, w: 112, btn: 32, font: 'var(--type-size-sm)'   },
};

const PlusIcon = ({ size = 14, color }) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' aria-hidden>
    <path d='M12 5v14M5 12h14' stroke={color} strokeWidth='2.5' strokeLinecap='round' />
  </svg>
);
const MinusIcon = ({ size = 14, color }) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' aria-hidden>
    <path d='M5 12h14' stroke={color} strokeWidth='2.5' strokeLinecap='round' />
  </svg>
);

const StepperButton = ({ side, dim, disabled, onClick, ariaLabel }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type='button'
      aria-label={ariaLabel}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={disabled}
      style={{
        width: dim.btn,
        height: '100%',
        background: hovered && !disabled
          ? 'var(--surface-brandPrimaryButton-quinary-hover, var(--brand-p100))'
          : 'var(--surface-brandPrimaryButton-quinary, transparent)',
        border: 'none',
        outline: 'none',
        boxShadow: 'none',
        WebkitTapHighlightColor: 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: disabled ? 'var(--text-input-disabled, #ADB2B7)' : 'var(--text-input-filled, #4D5358)',
        borderTopLeftRadius:    side === 'left'  ? 'var(--dim-radius-200, 8px)' : 0,
        borderBottomLeftRadius: side === 'left'  ? 'var(--dim-radius-200, 8px)' : 0,
        borderTopRightRadius:   side === 'right' ? 'var(--dim-radius-200, 8px)' : 0,
        borderBottomRightRadius:side === 'right' ? 'var(--dim-radius-200, 8px)' : 0,
        transition: `background-color 200ms ${EASE}, color 200ms ${EASE}`,
      }}
    >
      {side === 'left' ? <MinusIcon color='currentColor' /> : <PlusIcon color='currentColor' />}
    </button>
  );
};

const Stepper = React.forwardRef(function Stepper(
  {
    value,
    defaultValue,
    onChange,
    min,
    max,
    step = 1,
    size = 'large',                       /* 'large' | 'small' */
    state: stateProp,                     /* force 'default' | 'hover' | 'filled' | 'disabled' */
    disabled = false,
    placeholder = '',
    'aria-label': ariaLabel,
    className = '',
    style = {},
    ...rest
  },
  ref,
) {
  const isControlled = value !== undefined;
  const [innerValue, setInnerValue] = useState(
    defaultValue !== undefined ? String(defaultValue) : '',
  );
  const v = isControlled ? (value === null || value === undefined ? '' : String(value)) : innerValue;

  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef(null);

  const dim = SIZE[size] || SIZE.large;
  const filled = v !== '' && v !== null && v !== undefined;
  const computedState = disabled
    ? 'disabled'
    : (focused || hovered)
    ? 'hover'
    : filled
    ? 'filled'
    : 'default';
  const effectiveState = stateProp || computedState;
  const isDisabled = effectiveState === 'disabled';
  const isHover    = effectiveState === 'hover';

  /* Boundary-aware button disabling — the matching button greys out when
     value sits at its min/max bound so users get clear visual feedback. */
  const numericValue = v === '' ? null : Number(v);
  const safeValue    = Number.isNaN(numericValue) ? null : numericValue;
  const atMin = safeValue !== null && typeof min === 'number' && safeValue <= min;
  const atMax = safeValue !== null && typeof max === 'number' && safeValue >= max;
  const minusDisabled = isDisabled || atMin;
  const plusDisabled  = isDisabled || atMax;

  const setVal = (next) => {
    const str = next === '' ? '' : String(next);
    if (!isControlled) setInnerValue(str);
    onChange && onChange(str === '' ? null : Number(str), str);
  };
  const clamp = (n) => {
    let x = n;
    if (typeof min === 'number') x = Math.max(min, x);
    if (typeof max === 'number') x = Math.min(max, x);
    return x;
  };
  const bump = (dir) => {
    if (isDisabled) return;
    const current = v === '' ? 0 : Number(v);
    if (Number.isNaN(current)) return;
    setVal(clamp(current + dir * step));
    inputRef.current && inputRef.current.focus();
  };
  const handleChange = (e) => {
    const raw = e.target.value;
    if (raw === '' || /^-?\d*\.?\d*$/.test(raw)) setVal(raw);
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`inline-flex items-center ${className}`}
      style={{
        width:  dim.w,
        height: dim.h,
        borderRadius: 'var(--dim-radius-200, 8px)',
        background: isDisabled
          ? 'var(--surface-input-disabled, #F4F5F5)'
          : 'var(--surface-input-default, #FFFFFF)',
        border: isHover
          ? 'var(--dim-stroke-200, 2px) solid var(--border-input-hover, var(--brand-p600))'
          : `var(--dim-stroke-100, 1px) solid var(--border-input-default, #E2E4E6)`,
        boxSizing: 'border-box',
        overflow: 'hidden',
        transition: `border-color 200ms ${EASE}, background-color 200ms ${EASE}`,
        ...style,
      }}
      {...rest}
    >
      <StepperButton
        side='left'
        dim={dim}
        disabled={minusDisabled}
        onClick={() => bump(-1)}
        ariaLabel='decrement'
      />
      <input
        ref={(node) => {
          inputRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        type='text'
        inputMode='decimal'
        value={v}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={isDisabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className='flex-1 min-w-0 bg-transparent outline-none border-0 p-0 text-center'
        style={{
          height: '100%',
          /* Numbers use Sarabun (body) — not Mitr heading — for tabular digits. */
          fontFamily: 'var(--type-family-body)',
          fontSize: dim.font,
          fontWeight: 'var(--type-weight-medium, 500)',
          color: isDisabled
            ? 'var(--text-input-disabled, #ADB2B7)'
            : 'var(--text-input-filled, #4D5358)',
          /* `auto` lets the native blinking caret render on focus so the
             field reads as typeable (Figma 35:7682). Previously this was
             `transparent` for visual minimalism, but that masked the fact
             that the input is editable. Other states are unaffected — the
             caret only renders while focused. */
          caretColor: 'auto',
          outline: 'none',
          boxShadow: 'none',
          WebkitTapHighlightColor: 'transparent',
          appearance: 'none',
          WebkitAppearance: 'none',
        }}
      />
      <StepperButton
        side='right'
        dim={dim}
        disabled={plusDisabled}
        onClick={() => bump(1)}
        ariaLabel='increment'
      />
    </div>
  );
});

export default Stepper;
