import React from 'react';

/* Material Symbols Outlined helper — used by every mobile component
   that renders a glyph. Same shape as the desktop `<Sym>` in
   src/components/icon — duplicated here so the mobile tree has no
   coupling to a web-only path. */
export const Sym = ({ name, size = 24, color, fill = false, weight = 400, style }) => (
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

export default Sym;
