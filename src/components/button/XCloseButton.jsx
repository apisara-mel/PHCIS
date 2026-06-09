import React, { useState } from 'react';
import { Icon } from '@/components/icons/Icon';

/* MIH · XCloseButton — close (×) icon button for popup / dialog headers.
   Mirrors Figma MIH Design-System Popup node 104:5369 exactly:
   · Container 32×32, radius-200 (8px), transparent by default
   · 16×16 X icon, color inherits from `--text-neutralButton-default`
   · Hover  → background `--background-neutral-tertiary` (#F4F5F5)
   · Smooth bg transition (150ms ease-out)
   Use this everywhere a popup needs a close X in the header. */

const XCloseButton = ({
  onClick,
  ariaLabel = 'ปิด',
  className = '',
  style = {},
  disabled = false,
}) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      onMouseEnter={() => { if (!disabled) setHovered(true); }}
      onMouseLeave={() => setHovered(false)}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 'var(--dim-size-600, 32px)',
        height: 'var(--dim-size-600, 32px)',
        padding: 0,
        borderRadius: 'var(--dim-radius-200, 8px)',
        border: 0,
        background: hovered && !disabled
          ? 'var(--background-neutral-tertiary, #F4F5F5)'
          : 'transparent',
        color: 'var(--text-neutralButton-default, #4D5358)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 150ms ease-out',
        ...style,
      }}
    >
      <Icon name='close' size={16} style={{ color: 'currentColor' }} />
    </button>
  );
};

export default XCloseButton;
