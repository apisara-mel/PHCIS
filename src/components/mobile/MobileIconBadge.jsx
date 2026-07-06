import React from 'react';
import { Sym } from './Sym';
import { MOBILE_ICON_TONES } from './mobileIconTones';

/* Figma Colorful icon Badge — circular icon holder (Home quick menu · cards). */

export const MobileIconBadge = ({
  icon,
  tone = 'green',
  size = 40,
  iconSize = 16,
  filled = true,
}) => {
  const palette = MOBILE_ICON_TONES[tone] || MOBILE_ICON_TONES.green;
  return (
    <span
      className='inline-flex items-center justify-center shrink-0'
      style={{
        width: size,
        height: size,
        borderRadius: 'var(--dim-radius-full)',
        background: palette.bg,
      }}
    >
      <Sym name={icon} size={iconSize} color={palette.fg} fill={filled} />
    </span>
  );
};

export default MobileIconBadge;
