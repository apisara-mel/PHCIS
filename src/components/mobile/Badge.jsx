import React from 'react';

const PALETTE = {
  neutral: { bg: 'var(--surface-content-secondary, #F5F6F7)',       color: 'var(--text-content-secondary, #565D6D)' },
  brand:   { bg: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', color: 'var(--text-brandPrimary-default, #007549)' },
  success: { bg: 'var(--surface-success-quaternary, #E9F8EF)',      color: 'var(--text-success-default, #1F9D55)' },
  warning: { bg: 'var(--surface-warning-quaternary, #FDECEC)',      color: 'var(--text-warning-default, #D43838)' },
  info:    { bg: 'var(--surface-info-quaternary, #ECF4FE)',         color: 'var(--text-info-default, #1F6FEB)' },
};

/* MIH Mobile · Badge.
   Always pill (radius-full). Lives next to titles, list items, and
   status indicators — smaller and softer than the web ColorfulBadge
   so it doesn't dominate a 390-wide layout. */
export const MobileBadge = ({ children, tone = 'neutral' }) => {
  const palette = PALETTE[tone] || PALETTE.neutral;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: 'var(--mobile-badge-padding-y, 2px) var(--mobile-badge-padding-x, 8px)',
      background: palette.bg,
      color: palette.color,
      borderRadius: 'var(--mobile-badge-radius, 9999px)',
      fontSize: 'var(--mobile-badge-type-size, 12px)',
      fontWeight: 'var(--type-weight-bold, 700)',
      fontFamily: 'var(--type-family-body)',
      whiteSpace: 'nowrap',
    }}>{children}</span>
  );
};

export default MobileBadge;
