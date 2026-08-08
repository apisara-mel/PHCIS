import React from 'react';

/* Shared count chip for TabUnderline + TabPill — brandTag tokens
   (design.md § Brand Tag). Small framed number next to the tab label.

   `tone`:
     • `brandtag` (default) — grey idle → green on selected/hover (UnderlineTab)
     • `green` — always green surface / border / number (TabPill) */

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

const toneStyles = (tone, selected, hovered) => {
  if (tone === 'green') {
    /* Always brand-green chip — matches TabPill label/icon (primary/700). */
    return {
      background: hovered || selected
        ? 'var(--surface-brandtag-selected-hover, var(--brand-p100, #E2F3EB))'
        : 'var(--surface-brandtag-selected, var(--brand-p50, #F4FBF8))',
      color: 'var(--text-brandtag-selected, var(--brand-p700, #007549))',
      border: 'var(--dim-stroke-100) solid var(--border-brandtag-selected, var(--brand-p200, #C5EDDA))',
    };
  }

  return {
    background: selected
      ? (hovered ? 'var(--surface-brandtag-selected-hover)' : 'var(--surface-brandtag-selected)')
      : (hovered ? 'var(--surface-brandtag-hover)' : 'var(--surface-brandtag-default)'),
    color: selected
      ? (hovered ? 'var(--text-brandtag-selected-hover)' : 'var(--text-brandtag-selected)')
      : (hovered ? 'var(--text-brandtag-hover)' : 'var(--text-brandtag-title)'),
    border: 'var(--dim-stroke-100) solid ' + (selected
      ? (hovered ? 'var(--border-brandtag-selected-hover)' : 'var(--border-brandtag-selected)')
      : (hovered ? 'var(--border-brandtag-hover)' : 'var(--border-brandtag-default)')),
  };
};

const TabCountBadge = ({
  count,
  selected = false,
  hovered = false,
  tone = 'brandtag',
  className = '',
  style = {},
}) => {
  if (typeof count !== 'number') return null;
  const t = toneStyles(tone, selected, hovered);
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{
        minWidth: 24,
        height: 20,
        paddingLeft: 'var(--dim-space-200)',
        paddingRight: 'var(--dim-space-200)',
        borderRadius: 'var(--dim-radius-full)',
        background: t.background,
        color: t.color,
        border: t.border,
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        fontWeight: 'var(--type-weight-medium)',
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1,
        transition: [
          `background-color 200ms ${EASE}`,
          `color 200ms ${EASE}`,
          `border-color 200ms ${EASE}`,
        ].join(', '),
        ...style,
      }}
    >
      {count}
    </span>
  );
};

export default TabCountBadge;
