import React from 'react';

/* MIH CheckboxBox — Figma "Checkbox" (node 306:1099). The 16×16 atom.
   6 states: default / hover / selected / selected-hover / disabled /
   checked-disabled. Tokens alias from design.md — no hex literals.

   Used as the building block for <Checkbox>, <CheckboxButton>, and
   <CheckboxGroup>. Stateless: parent owns checked + hover.            */

const Tick = () => (
  <svg
    width='8'
    height='6.3'
    viewBox='0 0 8 6.3'
    fill='none'
    aria-hidden
    xmlns='http://www.w3.org/2000/svg'
  >
    <path
      d='M1 3.3 L3 5.3 L7 1'
      stroke='var(--icon-switch-checkbox-tick)'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

/* Figma dimension/stroke/150 — keep 1.5px in every state; swap colour only. */
const BOX_BORDER = (color) => `var(--dim-stroke-150) solid ${color}`;

const resolveBox = ({ checked, hover, disabled }) => {
  if (disabled) {
    if (checked) {
      return {
        bg: 'var(--surface-disabled-secondary-hover)',
        border: BOX_BORDER('transparent'),
        showTick: true,
      };
    }
    return {
      bg: 'var(--surface-switch-default)',
      border: BOX_BORDER('var(--border-switch-disabled)'),
      showTick: false,
    };
  }
  if (checked) {
    return {
      bg: hover
        ? 'var(--surface-switch-checkbox-hover)'
        : 'var(--surface-switch-checkbox)',
      border: BOX_BORDER('transparent'),
      showTick: true,
    };
  }
  if (hover) {
    /* Unchecked hover + CheckboxButton card row — brand primary preview (p500) + tick. */
    return {
      bg: 'var(--surface-switch-checkbox-default-hover)',
      border: BOX_BORDER('transparent'),
      showTick: true,
    };
  }
  return {
    bg: 'var(--surface-switch-default)',
    border: BOX_BORDER('var(--border-switch-default)'),
    showTick: false,
  };
};

/* Smoother easing curve than `ease` — settles instead of snapping. Used
   for the tick fade so it feels like the check is "drawing in" on hover
   rather than appearing on a hard frame boundary. */
const SMOOTH_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

const CheckboxBox = ({ checked = false, hover = false, disabled = false, className = '', style = {} }) => {
  const s = resolveBox({ checked, hover, disabled });
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 overflow-hidden ${className}`}
      style={{
        width: 16,
        height: 16,
        borderRadius: 'var(--dim-radius-100)',
        background: s.bg,
        border: s.border,
        boxSizing: 'border-box',
        /* Background + border ease independently of the tick so the colour
           change feels tight while the glyph drawing-in is gentler. */
        transition: `background-color 160ms ${SMOOTH_EASE}, border-color 160ms ${SMOOTH_EASE}`,
        ...style,
      }}
    >
      {/* Always mount the Tick so its opacity/scale can transition.
          Mount-on-toggle would make the check pop in on a hard frame. */}
      <span
        aria-hidden
        className='inline-flex items-center justify-center'
        style={{
          opacity: s.showTick ? 1 : 0,
          transform: s.showTick ? 'scale(1)' : 'scale(0.6)',
          transition: `opacity 180ms ${SMOOTH_EASE}, transform 220ms ${SMOOTH_EASE}`,
        }}
      >
        <Tick />
      </span>
    </span>
  );
};

export default CheckboxBox;
