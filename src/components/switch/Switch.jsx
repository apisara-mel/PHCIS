import React, { useEffect, useState } from 'react';

/* MIH Switch — Figma "Switch" (node 368:31).

   Property panel (matches Figma 1:1):
     • Checked   false | true
     • State     'default' | 'hover' | 'disabled'

   2 × 3 = 6 visual variants. Pass `state` to force the visual for design-
   system grids; in real use state auto-resolves from disabled + hover.

   Layout (per Figma):
     • Track   32w × 18h, fully rounded
     • Knob    14×14 white disc, 2px inset, translateX(14) when checked

   Interactions:
     • Hover     — track tints darker brand-p800 (on) / neutral-300 (off)
     • Press     — knob stretches (14 → 18 wide) toward its destination,
                   giving iOS-style tactile feedback that a toggle is
                   imminent. Releases back to round shape at the new edge.
     • Focus     — brand-p600-15% ring around the track (keyboard-only via
                   `:focus-visible` semantics tracked in React state).
     • Keyboard  — Space / Enter toggle (native <button> behavior).
     • Disabled  — pointer/keyboard blocked, dimmed tint, no shadow.

   Tokens alias from design.md; surfaces retint via [data-brand].          */

const EASE        = 'cubic-bezier(0.32, 0.72, 0, 1)';
const EASE_SPRING = 'cubic-bezier(0.16, 1, 0.3, 1)';

const TRACK_W = 32;
const TRACK_H = 18;
const TRACK_PAD = 2;
const KNOB = 14;
const KNOB_PRESSED = 18;       /* iOS-style stretch on active */
const KNOB_TRAVEL = TRACK_W - 2 * TRACK_PAD - KNOB; /* 14 px */

const resolveTone = ({ checked, state }) => {
  if (state === 'disabled') {
    return {
      track: checked
        ? 'var(--surface-switch-checked-disabled, var(--brand-p200))'
        : 'var(--surface-switch-unchecked-disabled, #F4F5F5)',
      knob: 'var(--surface-switch-knob-disabled, #FFFFFF)',
      knobShadow: 'none',
    };
  }
  if (state === 'hover') {
    return {
      track: checked
        ? 'var(--surface-switch-checked-hover, var(--brand-p800))'
        : 'var(--surface-switch-unchecked-hover, #C9CDD0)',
      knob: '#FFFFFF',
      knobShadow: '0 1px 2px rgba(0,0,0,0.18), 0 2px 4px rgba(0,0,0,0.08)',
    };
  }
  return {
    track: checked
      ? 'var(--surface-switch-checked-default, var(--brand-p600))'
      : 'var(--surface-switch-unchecked-default, #E2E4E6)',
    knob: '#FFFFFF',
    knobShadow: '0 1px 2px rgba(0,0,0,0.12)',
  };
};

const Switch = React.forwardRef(function Switch(
  {
    checked,
    defaultChecked = false,
    onChange,
    disabled = false,
    state,                                  /* force 'default' | 'hover' | 'disabled' */
    'aria-label': ariaLabel,
    name,
    value,
    className = '',
    style = {},
    ...rest
  },
  ref,
) {
  const isControlled = checked !== undefined;
  const [internal, setInternal] = useState(defaultChecked);
  const isChecked = isControlled ? checked : internal;

  const [internalHover, setInternalHover] = useState(false);
  const [pressed, setPressed]             = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);

  const effectiveState = state
    || (disabled ? 'disabled' : internalHover ? 'hover' : 'default');
  const isDisabled = effectiveState === 'disabled';
  const tone = resolveTone({ checked: isChecked, state: effectiveState });

  const toggle = () => {
    if (isDisabled) return;
    const next = !isChecked;
    if (!isControlled) setInternal(next);
    onChange && onChange(next);
  };

  /* Cancel pressed state if the pointer leaves while held — otherwise
     the knob stays stretched until the user clicks elsewhere. Also
     reset on global pointerup so dragging off the control commits the
     release visual. */
  useEffect(() => {
    if (!pressed) return undefined;
    const onUp = () => setPressed(false);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    return () => {
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    };
  }, [pressed]);

  /* Press stretch: when pressed (and not disabled) the knob grows from
     14 → 18 px wide. The X offset adjusts so the knob anchors to its
     leading edge — i.e. growing toward the destination, not centred. */
  const knobWidth = pressed && !isDisabled ? KNOB_PRESSED : KNOB;
  const knobX = isChecked
    ? (TRACK_W - 2 * TRACK_PAD - knobWidth)    /* 14 (idle) → 10 (pressed) */
    : 0;

  return (
    <button
      ref={ref}
      type='button'
      role='switch'
      aria-checked={isChecked}
      aria-disabled={isDisabled || undefined}
      aria-label={ariaLabel}
      name={name}
      value={value}
      disabled={isDisabled}
      onClick={toggle}
      onMouseEnter={() => !state && !disabled && setInternalHover(true)}
      onMouseLeave={() => { if (!state) setInternalHover(false); setPressed(false); }}
      onPointerDown={() => !isDisabled && setPressed(true)}
      onKeyDown={(e) => {
        if (isDisabled) return;
        /* Space / Enter activation matches the native <button> contract.
           We also engage the press stretch on keydown for keyboard parity
           with mouse press. */
        if (e.key === ' ' || e.key === 'Enter') setPressed(true);
      }}
      onKeyUp={(e) => {
        if (e.key === ' ' || e.key === 'Enter') setPressed(false);
      }}
      onFocus={(e) => {
        /* Only paint a focus ring when focus came from the keyboard.
           `e.target.matches(':focus-visible')` is the canonical check
           in browsers that support it; falls back to true otherwise so
           the ring still appears on older browsers. */
        try {
          setKeyboardFocus(e.target.matches(':focus-visible'));
        } catch {
          setKeyboardFocus(true);
        }
      }}
      onBlur={() => setKeyboardFocus(false)}
      className={`inline-flex items-center shrink-0 ${className}`}
      style={{
        width: TRACK_W,
        height: TRACK_H,
        padding: TRACK_PAD,
        borderRadius: 'var(--dim-radius-full)',
        background: tone.track,
        border: 'none',
        outline: 'none',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        position: 'relative',
        WebkitTapHighlightColor: 'transparent',
        transition: [
          `background-color 220ms ${EASE_SPRING}`,
          `box-shadow 180ms ${EASE}`,
        ].join(', '),
        /* Keyboard focus ring — brand-tinted, aliased so it retints with
           [data-brand]. The fallback rgba uses brand-p600 @ 15%. */
        boxShadow: keyboardFocus && !isDisabled
          ? '0 0 0 3px var(--primaryBorder-600, rgba(8,167,104,0.30))'
          : 'none',
        ...style,
      }}
      {...rest}
    >
      <span
        aria-hidden
        style={{
          width: knobWidth,
          height: KNOB,
          borderRadius: 'var(--dim-radius-full)',
          background: tone.knob,
          boxShadow: tone.knobShadow,
          transform: `translateX(${knobX}px)`,
          /* Spring easing on transform + width gives the stretch a soft
             land. box-shadow + background still use the gentle EASE so
             hover/disabled transitions stay calm. */
          transition: [
            `transform 240ms ${EASE_SPRING}`,
            `width 220ms ${EASE_SPRING}`,
            `box-shadow 180ms ${EASE}`,
            `background-color 180ms ${EASE}`,
          ].join(', '),
          willChange: 'transform, width',
        }}
      />
    </button>
  );
});

export default Switch;
