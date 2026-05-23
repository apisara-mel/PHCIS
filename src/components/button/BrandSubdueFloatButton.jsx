import React, { useState } from 'react';

/* MIH BrandSubdueFloatButton — Figma "Brand Subdue Float Button" (node 2293:11088).
   Floating action button — circular brand-tinted bg with subdued shadow. Only
   default + hover states (no disabled / variant axes per Figma). Uses
   brand-p100 fill + brand-p700 icon, drop-shadow tinted to brand. Designed
   for FAB-style placement (e.g. fixed bottom-right of a page).      */

const Sym = ({ name, size, color }) => (
  <span
    className='material-symbols-outlined transition-colors duration-200 ease-out'
    style={{ fontFamily: 'Material Symbols Outlined', fontSize: size, color, lineHeight: 1, display: 'inline-flex' }}
    aria-hidden
  >
    {name}
  </span>
);

const BrandSubdueFloatButton = React.forwardRef(function BrandSubdueFloatButton(
  {
    icon,
    onClick,
    type = 'button',
    size = 56,
    /* Controlled hover override — when omitted the component tracks its
       own hover state. Used by the design-system state-matrix table. */
    hovered: hoveredProp,
    'aria-label': ariaLabel,
    className = '',
    style = {},
    ...rest
  },
  ref,
) {
  const [hoveredState, setHoveredState] = useState(false);
  const [pressed, setPressed] = useState(false);
  const hovered = hoveredProp ?? hoveredState;
  return (
    <button
      ref={ref}
      type={type}
      aria-label={ariaLabel}
      onClick={onClick}
      onMouseEnter={() => setHoveredState(true)}
      onMouseLeave={() => { setHoveredState(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      className={`inline-flex items-center justify-center transition-all duration-200 ease-out ${className}`}
      style={{
        width: size, height: size,
        borderRadius: '50%',
        border: 'none',
        background: hovered ? 'var(--surface-brandPrimaryButton-tertiary-hover)' : 'var(--surface-brandPrimaryButton-tertiary)',
        boxShadow: 'var(--shadow-card, 0 4px 12px rgba(8,167,104,0.20))',
        cursor: 'pointer',
        transform: pressed
          ? 'translateY(1px) scale(0.97)'
          : (hovered ? 'translateY(-1px)' : 'translateY(0)'),
        ...style,
      }}
      {...rest}
    >
      {icon && (
        <Sym
          name={icon}
          size={Math.round(size * 0.4)}
          color={hovered
            ? 'var(--icon-brandPrimaryButton-default-hover, var(--brand-p800))'
            : 'var(--icon-brandprimarybutton-default, var(--brand-p700))'}
        />
      )}
    </button>
  );
});

export default BrandSubdueFloatButton;
