import React from 'react';
import { Sym } from './Sym';

/* MIH Mobile · Badge.
   Always pill (radius-full). Lives next to titles, list items, and
   status indicators — smaller and softer than the web ColorfulBadge
   so it doesn't dominate a 390-wide layout.

   Sizes (Figma Mobile Application):
     · sm — compact chip (12px bold · pad 2/8) — titles / list tags
     · md — soft info / countdown pill (Figma 2119:51196 Countdown Row)
            14px regular · pad 6/12 · gap 6 · optional 16px leading icon
            · surface-neutral-quaternary + text-content-tertiary          */

const PALETTE = {
  neutral: {
    sm: {
      bg: 'var(--surface-content-secondary, #F5F6F7)',
      color: 'var(--text-content-secondary, #565D6D)',
    },
    md: {
      bg: 'var(--surface-neutral-quaternary, #F9FBFB)',
      color: 'var(--text-content-tertiary, #858C92)',
    },
  },
  brand: {
    sm: {
      bg: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
      color: 'var(--text-brandPrimary-default, #007549)',
    },
    md: {
      bg: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
      color: 'var(--text-brandPrimary-default, #007549)',
    },
  },
  success: {
    sm: {
      bg: 'var(--surface-success-quaternary, #E9F8EF)',
      color: 'var(--text-success-default, #1F9D55)',
    },
    md: {
      bg: 'var(--surface-success-quaternary, #E9F8EF)',
      color: 'var(--text-success-default, #1F9D55)',
    },
  },
  warning: {
    sm: {
      bg: 'var(--surface-warning-quaternary, #FDECEC)',
      color: 'var(--text-warning-default, #D43838)',
    },
    md: {
      bg: 'var(--surface-warning-quaternary, #FDECEC)',
      color: 'var(--text-warning-default, #D43838)',
    },
  },
  info: {
    sm: {
      bg: 'var(--surface-info-quaternary, #ECF4FE)',
      color: 'var(--text-info-default, #1F6FEB)',
    },
    md: {
      bg: 'var(--surface-info-quaternary, #ECF4FE)',
      color: 'var(--text-info-default, #1F6FEB)',
    },
  },
};

const SIZE = {
  sm: {
    padding: 'var(--mobile-badge-padding-y, 2px) var(--mobile-badge-padding-x, 8px)',
    gap: 'var(--dim-space-100, 4px)',
    fontSize: 'var(--mobile-badge-type-size, 12px)',
    fontWeight: 'var(--type-weight-bold, 700)',
    iconSize: 14,
  },
  md: {
    padding: 'var(--dim-space-150, 6px) var(--dim-space-300, 12px)',
    gap: 'var(--dim-space-150, 6px)',
    fontSize: 'var(--type-size-sm, 14px)',
    fontWeight: 'var(--type-weight-regular, 400)',
    iconSize: 16,
  },
};

export const MobileBadge = ({
  children,
  tone = 'neutral',
  size = 'sm',
  icon,
}) => {
  const resolvedSize = size === 'md' ? 'md' : 'sm';
  const palette = (PALETTE[tone] || PALETTE.neutral)[resolvedSize];
  const sizeStyles = SIZE[resolvedSize];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sizeStyles.gap,
        padding: sizeStyles.padding,
        background: palette.bg,
        color: palette.color,
        borderRadius: 'var(--mobile-badge-radius, 9999px)',
        fontSize: sizeStyles.fontSize,
        fontWeight: sizeStyles.fontWeight,
        fontFamily: 'var(--type-family-body)',
        lineHeight: 1.5,
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
      }}
    >
      {icon ? (
        <Sym name={icon} size={sizeStyles.iconSize} fill={false} weight={400} />
      ) : null}
      {children}
    </span>
  );
};

export default MobileBadge;
