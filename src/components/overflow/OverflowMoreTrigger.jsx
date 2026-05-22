import React, { useState } from 'react';

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

const Sym = ({ name, size = 16, color }) => (
  <span
    className='material-symbols-outlined'
    style={{ fontFamily: 'Material Symbols Outlined', fontSize: size, color, lineHeight: 1, display: 'inline-flex' }}
    aria-hidden
  >
    {name}
  </span>
);

/* Figma 2867:4170 — TabUnderline overflow + filter toolbar overflow share this control:
   more_horiz + keyboard_arrow_down, tab-underline tokens, list hover surface. */
const OverflowMoreTrigger = React.forwardRef(function OverflowMoreTrigger(
  { open, accent = false, onClick, ariaLabel = 'แสดงรายการที่ซ่อน' },
  ref,
) {
  const [hovered, setHovered] = useState(false);
  const active = open || accent;
  const color = active
    ? 'var(--icon-tabunderline-selected)'
    : hovered
      ? 'var(--icon-tabunderline-hover)'
      : 'var(--icon-tabunderline-default)';
  const background = hovered || open ? 'var(--surface-list-hover, transparent)' : 'transparent';
  return (
    <button
      ref={ref}
      type='button'
      aria-haspopup='menu'
      aria-expanded={open ? 'true' : 'false'}
      aria-label={ariaLabel}
      onMouseDown={(e) => { e.stopPropagation(); }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className='inline-flex items-center justify-center shrink-0'
      style={{
        gap: 'var(--dim-space-150, 6px)',
        minWidth: 80,
        minHeight: 'var(--dim-size-700, 36px)',
        paddingLeft:  'var(--dim-space-300, 12px)',
        paddingRight: 'var(--dim-space-300, 12px)',
        paddingTop:    'var(--dim-space-150, 6px)',
        paddingBottom: 'var(--dim-space-150, 6px)',
        borderRadius: 'var(--dim-radius-200, 8px)',
        background,
        border: 'none',
        cursor: 'pointer',
        transition: `background-color 160ms ${EASE}, color 160ms ${EASE}`,
        color,
        alignSelf: 'center',
      }}
    >
      <Sym name='more_horiz' size={16} color={color} />
      <Sym name='keyboard_arrow_down' size={16} color={color} />
    </button>
  );
});

export default OverflowMoreTrigger;
