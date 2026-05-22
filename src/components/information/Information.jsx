import React from 'react';
import ColorfulBadge from '@/components/badge/ColorfulBadge';

/* MIH Information — Figma "Infotmation" (node 2550:10442).

   Property panel (matches Figma 1:1):
     • Hierarchy   'secondary'  (only one variant in Figma)
     • State       'default'    (only one state in Figma)
     • Show Sub Text
     • Show Text
     • Show Badge  — trailing green ColorfulBadge (secondary, no dot/icon)
     • Show Badge2 — inline red ColorfulBadge below the text (with dot + icon)

   Layout:
     Vertical text column on the left (Subtext xs medium gray on top,
     Topic sm regular default beneath, optional red Badge2 below those),
     trailing green Badge aligned to the row start.

   Used for compact key/value blocks in patient cards, list rows, etc.
   Tokens alias from design.md; badge surfaces retint with [data-brand].  */

const Information = React.forwardRef(function Information(
  {
    hierarchy = 'secondary',
    state = 'default',
    subText = 'Subtext',
    text = 'Topic',
    badge = 'Text',                          /* trailing green badge label */
    badge2 = 'Text',                         /* inline red badge label */
    badge2Icon = 'priority_high',
    /* Show flags — mirror Figma property panel */
    showSubText = true,
    showText = true,
    showBadge = true,
    showBadge2 = false,
    maxWidth = 640,
    className = '',
    style = {},
    ...rest
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`inline-flex items-start ${className}`}
      style={{
        gap: 'var(--dim-space-400, 16px)',
        maxWidth,
        ...style,
      }}
      data-hierarchy={hierarchy}
      data-state={state}
      {...rest}
    >
      {/* Left text column */}
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{ gap: 'var(--dim-space-100, 4px)' }}
      >
        {showSubText && subText != null && (
          <span
            className='whitespace-nowrap'
            style={{
              color: 'var(--text-content-tertiary, #858C92)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              fontWeight: 'var(--type-weight-medium)',
              lineHeight: 1.5,
            }}
          >
            {subText}
          </span>
        )}
        {showText && text != null && (
          <span
            className='whitespace-nowrap'
            style={{
              color: 'var(--text-content-default, #363B3F)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              fontWeight: 'var(--type-weight-regular)',
              lineHeight: 1.5,
            }}
          >
            {text}
          </span>
        )}
        {showBadge2 && (
          <ColorfulBadge
            style='red'
            size='small'
            hierarchy='secondary'
            width='hug'
            className='self-start'
            showDot
            icon={badge2Icon}
          >
            {badge2}
          </ColorfulBadge>
        )}
      </div>

      {/* Trailing green badge */}
      {showBadge && (
        <ColorfulBadge
          style='green'
          size='small'
          hierarchy='secondary'
          width='hug'
          className='shrink-0'
          showDot={false}
          showIcon={false}
        >
          {badge}
        </ColorfulBadge>
      )}
    </div>
  );
});

export default Information;
