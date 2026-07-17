import React, { useState } from 'react';
import { Sym } from '@/components/mobile/Sym';

/* MIH Mobile · KeypadButton — Archive Figma 314:43835
   Variants: Type = Number | icon · State = Default | Pressed
   72×72 circle · brand-p400/p300 ring · white digit / Delete (backspace) glyph.
   Used on Set PIN (314:43232) and any numeric PIN / OTP keypad. */

export const KEYPAD_BUTTON_SIZE = 72;

/**
 * @param {object} props
 * @param {'Number'|'icon'|'number'} [props.type]
 * @param {'Default'|'Pressed'|'default'|'pressed'} [props.state] — force for demos
 * @param {React.ReactNode} [props.children] — digit when type=Number
 * @param {string} [props.digit] — alias for children when type=Number
 * @param {string} [props.icon] — Material Symbol for type=icon (default backspace)
 * @param {() => void} [props.onClick]
 * @param {boolean} [props.disabled]
 * @param {string} [props['aria-label']]
 * @param {string} [props.className]
 * @param {React.CSSProperties} [props.style]
 */
export const KeypadButton = ({
  type = 'Number',
  state,
  children,
  digit,
  icon = 'backspace',
  onClick,
  disabled = false,
  className = '',
  style,
  'aria-label': ariaLabel,
  ...rest
}) => {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const isIcon = String(type).toLowerCase() === 'icon';
  const forced = state
    ? String(state).toLowerCase() === 'pressed'
    : null;
  const isPressed = forced != null ? forced : (!disabled && (pressed || hovered));

  const label = ariaLabel
    || (isIcon ? 'ลบ' : String(digit ?? children ?? ''));

  return (
    <button
      type='button'
      className={className}
      disabled={disabled}
      aria-label={label}
      onClick={onClick}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => { setHovered(false); setPressed(false); }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        boxSizing: 'border-box',
        width: 'var(--dim-size-1600, 72px)',
        height: 'var(--dim-size-1600, 72px)',
        minWidth: 'var(--mobile-touch-target-min, 44px)',
        minHeight: 'var(--mobile-touch-target-min, 44px)',
        padding: 0,
        margin: 0,
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        borderRadius: 'var(--dim-radius-full, 9999px)',
        borderStyle: 'solid',
        borderWidth: isPressed
          ? 'var(--dim-stroke-150, 1.5px)'
          : 'var(--dim-stroke-100, 1px)',
        borderColor: isPressed
          ? 'var(--brand-p300, #91DFBB)'
          : 'var(--brand-p400, #6AD6A5)',
        background: isPressed
          ? 'var(--mobile-surface-keypadButton-pressed, color-mix(in srgb, var(--text-content-on-content, #FFFFFF) 20%, transparent))'
          : 'transparent',
        color: 'var(--text-content-on-content, #FFFFFF)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        WebkitTapHighlightColor: 'transparent',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-2xl, 24px)',
        fontWeight: 'var(--type-weight-bold, 700)',
        lineHeight: 1.5,
        textAlign: 'center',
        ...style,
      }}
      {...rest}
    >
      {isIcon ? (
        <Sym
          name={icon}
          size={24}
          color='var(--text-content-on-content, #FFFFFF)'
        />
      ) : (
        <span style={{ width: '100%', textAlign: 'center' }}>
          {digit ?? children}
        </span>
      )}
    </button>
  );
};

export default KeypadButton;
