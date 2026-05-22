import React, { useState } from 'react';

/* MIH Step — Figma "Step" (MIH Design System Foundation, node 2709:6562).
   Standalone single step item with number/check indicator + title + description.
   Used inside <StepProgress> rows or directly for state-matrix design docs.

   Props:
     • type        'default' | 'current' | 'success'
     • state       'default' | 'hover'                     — force visual state
     • number      step number to display (when type !== 'success')
     • label       title text (default 'Step')
     • description body text under title (default 'This is a description text.')
     • showConnector  draw the trailing rail line          (default true)
     • showDescription  toggle the subtitle row            (default true)
     • onClick     when set, the indicator becomes clickable (cursor-pointer)

   Tokens alias from design.md §6.x — no hex literals. */

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

const CheckIcon = ({ size = 16, color }) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' aria-hidden>
    <path
      d='M5 12.5 10 17.5 19 6.5'
      stroke={color}
      strokeWidth='3'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

const resolveTone = ({ type, state }) => {
  const isHover = state === 'hover';
  if (type === 'current') {
    return {
      bg:           'var(--surface-steps-selected)',
      ring:         '0 0 0 4px var(--primaryBorder-600, var(--brand-p100))',
      numberColor:  'var(--text-steps-select)',
      titleColor:   'var(--text-steps-title-select)',
      titleWeight:  'var(--type-weight-bold)',
    };
  }
  if (type === 'success') {
    return {
      bg:           isHover ? 'var(--surface-steps-success-hover)' : 'var(--surface-steps-success)',
      ring:         'none',
      numberColor:  'var(--icon-steps-success-on)',
      titleColor:   'var(--text-steps-title-success)',
      titleWeight:  'var(--type-weight-medium)',
    };
  }
  return {
    bg:           isHover ? 'var(--surface-steps-hover)' : 'var(--surface-steps-default)',
    ring:         'none',
    numberColor:  'var(--text-steps-default)',
    titleColor:   isHover ? 'var(--text-steps-title-hover)' : 'var(--text-steps-title)',
    titleWeight:  'var(--type-weight-medium)',
  };
};

const Step = React.forwardRef(function Step(
  {
    type = 'default',
    state,                                /* force 'default' | 'hover' */
    number = 1,
    label = 'Step',
    description = 'This is a description text.',
    showConnector = true,
    showDescription = true,
    onClick,
    width = 160,
    className = '',
    style = {},
    ...rest
  },
  ref,
) {
  const [hovered, setHovered] = useState(false);
  const effectiveState = state || (hovered ? 'hover' : 'default');
  const tone = resolveTone({ type, state: effectiveState });
  const isClickable = Boolean(onClick) && type !== 'current';

  return (
    <div
      ref={ref}
      className={`flex flex-col items-start shrink-0 ${className}`}
      style={{
        width,
        gap: 'var(--dim-space-200, 8px)',
        ...style,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...rest}
    >
      {/* Indicator row */}
      <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-150, 6px)' }}>
        <button
          type='button'
          onClick={isClickable ? onClick : undefined}
          aria-disabled={!isClickable || undefined}
          className='inline-flex items-center justify-center shrink-0'
          style={{
            width: 28,
            height: 28,
            borderRadius: 'var(--dim-radius-full)',
            background: tone.bg,
            color: tone.numberColor,
            border: 'none',
            boxShadow: tone.ring,
            cursor: isClickable ? 'pointer' : 'default',
            fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-bold)',
            lineHeight: 1,
            transition: [
              `background-color 200ms ${EASE}`,
              `color 200ms ${EASE}`,
              `box-shadow 200ms ${EASE}`,
            ].join(', '),
          }}
        >
          {type === 'success'
            ? <CheckIcon size={16} color={tone.numberColor} />
            : number}
        </button>
        {showConnector && (
          <div
            className='flex-1 min-w-0'
            style={{
              height: 1,
              background: 'var(--border-steps-default)',
            }}
          />
        )}
      </div>

      {/* Title */}
      <p
        style={{
          margin: 'var(--dim-space-0)',
          color: tone.titleColor,
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          fontWeight: tone.titleWeight,
          lineHeight: 1.5,
          transition: `color 200ms ${EASE}`,
        }}
      >
        {label}
      </p>

      {/* Description */}
      {showDescription && description && (
        <p
          style={{
            margin: 'var(--dim-space-0)',
            color: 'var(--text-steps-subtitle)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
            fontWeight: 'var(--type-weight-regular)',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
});

export default Step;
