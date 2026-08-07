import React from 'react';
import { EWS_SCALES } from '@/data/observationMock';

const TIER_SURFACE = {
  low: 'var(--surface-colorfulbadge-green-bold, #00875A)',
  medium: 'var(--surface-colorfulbadge-orange-bold, #F97316)',
  high: 'var(--surface-colorfulbadge-red-bold, #EF4444)',
};

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

/**
 * Stacked score badge — NEWS / PEWS on top, score below (observation bed cards).
 * System prose elsewhere uses EWS_SYSTEM_LABEL ("คะแนนเตือนภัย (EWS)").
 */
export default function EwsScoreBadge({
  score = 0,
  tier,
  scale,
  size = 'md',
  className = '',
  style: styleProp,
}) {
  const level = tier?.level || (score >= 5 ? 'high' : score >= 2 ? 'medium' : 'low');
  const tokens = SIZE_TOKENS[size] || SIZE_TOKENS.md;
  const label = scale?.short || EWS_SCALES.ADULT.short;

  return (
    <span
      className={`inline-flex flex-col items-center justify-center shrink-0 ${className}`}
      title={`${scale?.label || 'Early Warning Score'}: ${score}`}
      style={{
        width: tokens.box,
        height: tokens.box,
        gap: 'var(--dim-space-050, 2px)',
        background: TIER_SURFACE[level] || TIER_SURFACE.low,
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
        {score}
      </span>
    </span>
  );
}
