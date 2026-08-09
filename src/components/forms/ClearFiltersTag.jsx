import React from 'react';
import FilterTag from '@/components/forms/FilterTag';

/* Animated "ล้างตัวกรอง" chip — shows when filters are active, fades/collapses
   on clear. Pair with useSmoothClearFilters + SmoothFilterResults. */

export function SmoothFilterResults({ opaque = true, children, style, className = '' }) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--dim-space-300)',
        opacity: opaque ? 1 : 0,
        transform: opaque
          ? 'translateY(0)'
          : 'translateY(var(--motion-panel-offset-y, 8px))',
        transition: [
          'opacity var(--motion-duration-popover, 160ms) var(--motion-easing-standard)',
          'transform var(--motion-duration-popover, 160ms) var(--motion-easing-standard)',
        ].join(', '),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default function ClearFiltersTag({
  active = false,
  onClear,
  value = 'ล้างตัวกรอง',
  size = 'lg',
}) {
  return (
    <span
      aria-hidden={!active}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        overflow: 'hidden',
        maxWidth: active ? 'var(--dim-size-2280, 218px)' : 0,
        opacity: active ? 1 : 0,
        transform: active
          ? 'translateY(0)'
          : 'translateY(var(--motion-panel-offset-y, 8px))',
        pointerEvents: active ? 'auto' : 'none',
        transition: [
          'opacity var(--motion-duration-popover, 160ms) var(--motion-easing-standard)',
          'transform var(--motion-duration-popover, 160ms) var(--motion-easing-standard)',
          'max-width var(--motion-duration-popover, 160ms) var(--motion-easing-standard)',
        ].join(', '),
      }}
    >
      <FilterTag
        variant='neutral'
        size={size}
        leadingIcon='close'
        value={value}
        showTitle={false}
        onClick={onClear}
      />
    </span>
  );
}
