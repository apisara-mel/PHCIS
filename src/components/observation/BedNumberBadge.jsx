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
    box: 'var(--dim-size-1700, 80px)',
    label: 'var(--type-size-xs, 12px)',
    number: 'var(--type-size-xl, 20px)',
    radius: 'var(--dim-radius-400, 16px)',
  },
  lg: {
    box: 'var(--dim-size-1200, 56px)',
    label: 'var(--type-size-xs, 12px)',
    number: 'var(--type-size-xl, 20px)',
    radius: 'var(--dim-radius-400, 16px)',
  },
};

const TONE_STYLES = {
  brand: {
    background: 'var(--brand-p600, #08A768)',
    color: 'var(--text-colorfulbadge-badge-on, #FFFFFF)',
    labelOpacity: 0.92,
  },
  grey: {
    background: 'var(--surface-colorfulbadge-grey, #F5F7F9)',
    color: 'var(--text-content-default, #363B3F)',
    labelOpacity: 1,
  },
  orange: {
    background: 'var(--surface-colorfulbadge-orange-bold, #F97316)',
    color: 'var(--text-colorfulbadge-badge-on, #FFFFFF)',
    labelOpacity: 0.92,
  },
};

const PLAIN_TONE_STYLES = {
  grey: {
    color: 'var(--text-content-default, #363B3F)',
    labelColor: 'var(--text-content-secondary, #636B72)',
  },
  orange: {
    color: 'var(--text-colorfulbadge-orange, #C2410C)',
    labelColor: 'var(--text-colorfulbadge-orange, #C2410C)',
  },
  brand: {
    color: 'var(--text-brandPrimary-default, #007549)',
    labelColor: 'var(--text-brandPrimary-secondary, #08A768)',
  },
};

/**
 * Stacked bed-number badge — "เตียง" on top, number below (observation bed cards).
 * `tone="orange"` for cleaning beds; default grey for active/empty beds.
 * `variant="plain"` drops the coloured surface (empty / cleaning bed tiles).
 */
export default function BedNumberBadge({
  bedNo,
  size = 'md',
  tone = 'grey',
  variant = 'badge',
  className = '',
  style: styleProp,
}) {
  const { label, number } = parseBedNo(bedNo);
  const tokens = SIZE_TOKENS[size] || SIZE_TOKENS.md;
  const isPlain = variant === 'plain';
  const toneStyle = isPlain
    ? (PLAIN_TONE_STYLES[tone] || PLAIN_TONE_STYLES.grey)
    : (TONE_STYLES[tone] || TONE_STYLES.grey);

  return (
    <span
      className={`inline-flex flex-col items-center justify-center shrink-0 ${className}`}
      style={{
        ...(isPlain
          ? {
              gap: 'var(--dim-space-050, 2px)',
              color: toneStyle.color,
              lineHeight: 1,
            }
          : {
              width: tokens.box,
              height: tokens.box,
              gap: 'var(--dim-space-050, 2px)',
              background: toneStyle.background,
              color: toneStyle.color,
              borderRadius: tokens.radius,
              lineHeight: 1,
            }),
        ...styleProp,
      }}
    >
      <span
        style={{
          fontSize: tokens.label,
          fontWeight: 'var(--type-weight-medium)',
          lineHeight: 1,
          ...(isPlain
            ? { color: toneStyle.labelColor }
            : { opacity: toneStyle.labelOpacity }),
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
