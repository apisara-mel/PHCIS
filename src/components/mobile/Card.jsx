import React from 'react';

/* MIH Mobile · Card.
   Container surface for list rows, info blocks, and section groupings.
   Radius is intentionally larger than the web Card (16 vs 8) to read
   as "tappable chip" on small viewports. */
export const MobileCard = ({
  children,
  style,
  onClick,
  padding,
  interactive = false,
  elevated = false,
}) => (
  <div
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); } } : undefined}
    style={{
      background: 'var(--surface-content-default, #FFFFFF)',
      borderRadius: 'var(--mobile-card-radius, 16px)',
      border: '1px solid var(--border-content-tertiary, #E1E3E5)',
      padding: padding || 'var(--mobile-card-padding, 16px)',
      cursor: onClick || interactive ? 'pointer' : 'default',
      boxShadow: elevated
        ? 'var(--shadow-brand-drop-bottom-200, 0 4px 12px rgba(0,0,0,0.06))'
        : 'none',
      transition: 'transform 160ms ease, box-shadow 160ms ease',
      ...(style || {}),
    }}
  >
    {children}
  </div>
);

export default MobileCard;
