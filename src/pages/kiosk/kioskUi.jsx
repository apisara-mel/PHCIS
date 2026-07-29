import React from 'react';

/* Shared kiosk primitives — Material Symbols + touch-friendly buttons.
   Tokens alias design.md / src/index.css (CLAUDE.md). */

export const Sym = ({ name, size = 24, color, fill = false }) => (
  <span
    aria-hidden
    className='material-symbols-outlined'
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontSize: size,
      lineHeight: 1,
      color: color || 'inherit',
      fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
      userSelect: 'none',
    }}
  >
    {name}
  </span>
);

export const cardSurface = {
  background: 'var(--surface-card-100, #FFFFFF)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #B1E6CD)',
  borderRadius: 'var(--dim-radius-600, 24px)',
  boxShadow: 'var(--shadow-brand-drop-bottom-200)',
  boxSizing: 'border-box',
};

export const primaryBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--dim-space-200, 8px)',
  minHeight: 'var(--dim-size-1000, 48px)',
  padding: 'var(--dim-space-400, 16px) var(--dim-space-800, 32px)',
  borderRadius: 'var(--dim-radius-450, 14px)',
  background: 'var(--surface-brandPrimaryButton-default, #007549)',
  color: 'var(--text-content-on-content, #FFFFFF)',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xl, 20px)',
  fontWeight: 'var(--type-weight-bold, 700)',
  boxShadow: 'var(--shadow-brand-drop-bottom-100)',
};

export const ghostBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--dim-space-200, 8px)',
  minHeight: 'var(--dim-size-900, 44px)',
  padding: 'var(--dim-space-300, 12px) var(--dim-space-600, 24px)',
  borderRadius: 'var(--dim-radius-450, 14px)',
  background: 'var(--surface-card-100, #FFFFFF)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default, #E2E4E6)',
  cursor: 'pointer',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-lg, 18px)',
  fontWeight: 'var(--type-weight-medium, 500)',
  color: 'var(--text-content-default, #171A1F)',
};
