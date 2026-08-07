import React from 'react';

/** Split "เตียง 01" / "เตียง 07-Extra" into label + number for stacked badges. */
export function parseBedNo(bedNo) {
  const raw = String(bedNo || '').trim();
  const match = raw.match(/^เตียง\s+(.+)$/i);
  return { label: 'เตียง', number: match ? match[1] : (raw || '-') };
}

const SIZE_TOKENS = {
  sm: {
    box: 'var(--dim-size-800, 40px)',
    label: 'var(--type-size-xxs, 10px)',
    number: 'var(--type-size-base, 16px)',
    radius: 'var(--dim-radius-300, 10px)',
  },
  md: {
    box: 'var(--dim-size-1200, 56px)',
    label: 'var(--type-size-xxs, 10px)',
    number: 'var(--type-size-lg, 18px)',
    radius: 'var(--dim-radius-400, 16px)',
  },
  lg: {
    box: 'var(--dim-size-1200, 56px)',
    label: 'var(--type-size-xs, 12px)',
    number: 'var(--type-size-xl, 20px)',
    radius: 'var(--dim-radius-400, 16px)',
  },
};

const TONE_SURFACE = {
  brand: 'var(--brand-p600, #08A768)',
  orange: 'var(--surface-colorfulbadge-orange-bold, #F97316)',
};

/**
 * Stacked bed-number badge — "เตียง" on top, number below (observation bed cards).
 * `tone="orange"` for cleaning beds; default brand green for active/empty beds.
 */
export default function BedNumberBadge({
  bedNo,
  size = 'md',
  tone = 'brand',
  className = '',
  style: styleProp,
}) {
  const { label, number } = parseBedNo(bedNo);
  const tokens = SIZE_TOKENS[size] || SIZE_TOKENS.md;
  const background = TONE_SURFACE[tone] || TONE_SURFACE.brand;

  return (
    <span
      className={`inline-flex flex-col items-center justify-center shrink-0 ${className}`}
      style={{
        width: tokens.box,
        height: tokens.box,
        gap: 'var(--dim-space-050, 2px)',
        background,
        color: 'var(--text-colorfulbadge-badge-on, #FFFFFF)',
        borderRadius: tokens.radius,
        lineHeight: 1,
        ...styleProp,
      }}
    >
      <span
        style={{
          fontSize: tokens.label,
          fontWeight: 'var(--type-weight-medium)',
          lineHeight: 1,
          opacity: 0.92,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: tokens.number,
          fontWeight: 'var(--type-weight-bold)',
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        {number}
      </span>
    </span>
  );
}
