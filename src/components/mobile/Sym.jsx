import React from 'react';
import { FigmaIcon, resolveFigmaIconKey } from './figmaIcons';

/* Icon helper for mobile tree.
   Priority: Figma Mobile Application Feather glyphs (Home 2042:26021) →
   Material Symbols Outlined. Same public API as before so callers stay
   unchanged (`name` · `size` · `color` · `fill` · `weight`). */

export const Sym = ({ name, size = 24, color, fill = false, weight = 400, style }) => {
  if (resolveFigmaIconKey(name)) {
    return <FigmaIcon name={name} size={size} color={color} style={style} />;
  }
  return (
    <span
      aria-hidden
      className='material-symbols-outlined'
      style={{
        fontFamily: 'Material Symbols Outlined',
        fontSize: size,
        lineHeight: 1,
        color: color || 'inherit',
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${size}`,
        userSelect: 'none',
        ...(style || {}),
      }}
    >
      {name}
    </span>
  );
};

export default Sym;
