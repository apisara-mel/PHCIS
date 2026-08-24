import React, { useState } from 'react';
import { morphPanelPaddingStyle, morphStepScaleStyle } from '@/components/layout/headerMorphStyles';

/* Figma node 2709:6562 — Step Indicator (MIH Design System Foundation)
   Variants: type (Default | Current | Success) × state (Default | Hover)
   Per Figma source code:
     Default + Default : bg surface/steps/default        · num text/steps/default     · title text/steps/title           (50% opacity)
     Default + Hover   : bg surface/steps/hover          · num text/steps/default     · title text/steps/title-hover
     Current + Default : bg surface/steps/selected       · 4px border primaryborder/600 (inside 28px box)
                         num text/steps/select (white)   · title text/steps/title-select  (Bold)
     Success + Default : bg surface/steps/success        · check icon white            · title text/steps/title-success
     Success + Hover   : bg surface/steps/success-hover  · check icon white            · title text/steps/title-success
   Product density aliases: Step item 128px · Circle 24×24 · Indicator gap 4px
   · Column gap 4px. The interactive button remains 44×44 for touch access. */

const TYPE = { DEFAULT: 'default', CURRENT: 'current', SUCCESS: 'success' };

const normalizeStep = (step) =>
  typeof step === 'string'
    ? { title: step, subtitle: null }
    : { title: step.title, subtitle: step.subtitle ?? null };

/* Settle-don't-snap easing (out-quint). Shared across the circle, the
   title, the connector, and the success-check fade so every chrome
   change in the stepper travels on the same curve. */
const SMOOTH_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const CIRCLE_TRANSITION =
  `background-color 220ms ${SMOOTH_EASE},`
  + ` color 220ms ${SMOOTH_EASE},`
  + ` border-color 220ms ${SMOOTH_EASE},`
  + ` box-shadow 220ms ${SMOOTH_EASE},`
  + ` transform 200ms ${SMOOTH_EASE}`;
const TITLE_TRANSITION =
  `color 220ms ${SMOOTH_EASE}, font-weight 220ms ${SMOOTH_EASE}`;
const CONNECTOR_TRANSITION = `background-color 220ms ${SMOOTH_EASE}`;

/* AnimatedCheck — 16-px check that "draws itself" when `active` flips true.
   The path total length is ~14 SVG units; we set `strokeDasharray` to that
   length and run `strokeDashoffset` from full → 0 under SMOOTH_EASE, so the
   stroke appears to be sketched in rather than fading on as a finished
   glyph. When `active` flips back to false the offset resets to full
   length (the line "uncurls") so the transition is symmetric if the user
   walks the step backwards. */
const CHECK_PATH_LENGTH = 14;
const AnimatedCheck = ({ active, size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 16 16'
    fill='none'
    aria-hidden
    xmlns='http://www.w3.org/2000/svg'
  >
    <path
      d='M3.5 8.2 L6.8 11.4 L12.6 5'
      stroke='var(--icon-steps-success-on, #FFFFFF)'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeDasharray={CHECK_PATH_LENGTH}
      strokeDashoffset={active ? 0 : CHECK_PATH_LENGTH}
      style={{ transition: `stroke-dashoffset 360ms ${SMOOTH_EASE}` }}
    />
  </svg>
);

const StepItem = ({ label, subtitle, idx, type, isLast, onStepClick, compact = false, labelNoWrap = false, hideLabels = false }) => {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const isClickable = Boolean(onStepClick) && type !== TYPE.CURRENT;
  const showHover = hovered && isClickable;
  const circleSize = compact
    ? 'var(--dim-size-400, 20px)'
    : 'var(--dim-size-500, 24px)';
  const currentRing = 'var(--dim-stroke-200, 2px)';
  const checkSize = compact
    ? 'var(--dim-size-200, 12px)'
    : 'var(--dim-size-250, 14px)';
  const stepWidth = compact
    ? 'var(--dim-size-1800, 96px)'
    : 'var(--dim-size-2000, 128px)';

  let bg, numberColor, titleColor;
  if (type === TYPE.CURRENT) {
    bg = 'var(--surface-steps-selected)';
    numberColor = 'var(--text-steps-select)';
    titleColor = 'var(--text-steps-title-select)';
  } else if (type === TYPE.SUCCESS) {
    bg = showHover ? 'var(--surface-steps-success-hover)' : 'var(--surface-steps-success)';
    numberColor = 'var(--icon-steps-success-on)';
    titleColor = 'var(--text-steps-title-success)';
  } else {
    bg = showHover ? 'var(--surface-steps-hover)' : 'var(--surface-steps-default)';
    numberColor = 'var(--text-steps-default)';
    titleColor = showHover ? 'var(--text-steps-title-hover)' : 'var(--text-steps-title)';
  }

  /* Hover lift — clickable steps grow ~6% on pointer enter so the cursor
     feels "magnetic". Current step keeps a 1.04 baseline to read as
     the active focus point even without a hover. Disabled / non-clickable
     steps stay 1.0. */
  const circleScale = type === TYPE.CURRENT
    ? 1.04
    : showHover
      ? 1.08
      : 1;

  /* Connector tone — completed steps run a brand-quaternary line, upcoming
     stays neutral. Both transition through CONNECTOR_TRANSITION so the
     line tints smoothly when the user nudges step → step. */
  const connectorBg = type === TYPE.SUCCESS
    ? 'var(--surface-steps-success, var(--border-steps-default))'
    : 'var(--border-steps-default)';

  return (
    <div
      className='shrink-0 flex flex-col items-start'
      style={{
        width: hideLabels ? 'auto' : (labelNoWrap ? 'auto' : stepWidth),
        minWidth: hideLabels ? undefined : (labelNoWrap ? stepWidth : undefined),
        gap: hideLabels ? 'var(--dim-space-0)' : (compact ? 'var(--dim-space-050)' : 'var(--dim-space-100)'),
        transition: `width 220ms ${SMOOTH_EASE}, gap 220ms ${SMOOTH_EASE}`,
      }}
      title={hideLabels ? label : undefined}
    >
      {/* Indicator row: circle + connector */}
      <div
        className='flex items-center w-full'
        style={{ gap: 'var(--dim-space-100, 4px)' }}
        data-spotlight={`step-${idx + 1}`}
      >
        <button
          type='button'
          onClick={() => isClickable && onStepClick(idx)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-label={`ขั้นตอนที่ ${idx + 1}: ${label}`}
          aria-current={type === TYPE.CURRENT ? 'step' : undefined}
          className={[
            'relative box-border rounded-full flex items-center justify-center shrink-0',
            isClickable ? 'cursor-pointer' : 'cursor-default',
          ].join(' ')}
          style={{
            width: 'var(--dim-size-900, 44px)',
            height: 'var(--dim-size-900, 44px)',
            padding: 'var(--dim-space-0)',
            background: 'transparent',
            border: 'none',
            outline: focused
              ? 'var(--dim-stroke-400, 4px) solid var(--border-brandPrimaryButton-tertiary)'
              : 'none',
            outlineOffset: 'var(--dim-space-0)',
          }}
        >
          <span
            className={[
              'relative box-border rounded-full flex items-center justify-center font-bold shrink-0 overflow-hidden',
            ].join(' ')}
            style={{
              width: circleSize,
              height: circleSize,
              background: bg,
              color: numberColor,
              border:
                type === TYPE.CURRENT
                  ? `${currentRing} solid var(--primaryBorder-600)`
                  : 'none',
              boxShadow:
                type === TYPE.CURRENT
                  ? `0 0 0 ${currentRing} var(--primaryBorder-600)`
                  : 'none',
              fontSize: compact ? 'var(--type-size-xxs, 10px)' : 'var(--type-size-xs, 12px)',
              transform: `scale(${circleScale}) translateZ(0)`,
              transformOrigin: 'center',
              transition: `${CIRCLE_TRANSITION}, width 220ms ${SMOOTH_EASE}, height 220ms ${SMOOTH_EASE}`,
              willChange: 'transform',
              backfaceVisibility: 'hidden',
            }}
          >
          {/* Always render both glyphs so they cross-fade between the
              numeric "upcoming" state and the check-mark "success" state
              instead of popping. Both are absolutely centred inside the
              visual circle (which is `position: relative`); the check uses an
              inline SVG so we can animate its stroke length, making it
              "draw itself" when the step transitions to success. */}
          <span
            className='absolute inset-0 inline-flex items-center justify-center'
            style={{
              opacity: type === TYPE.SUCCESS ? 1 : 0,
              transition: `opacity 220ms ${SMOOTH_EASE}`,
            }}
          >
            <AnimatedCheck active={type === TYPE.SUCCESS} size={checkSize} />
          </span>
          <span
            className='absolute inset-0 inline-flex items-center justify-center'
            style={{
              opacity: type === TYPE.SUCCESS ? 0 : 1,
              transform: type === TYPE.SUCCESS ? 'scale(0.5)' : 'scale(1)',
              transition: `opacity 200ms ${SMOOTH_EASE}, transform 240ms ${SMOOTH_EASE}`,
            }}
          >
            {idx + 1}
          </span>
          </span>
        </button>
        {!isLast && (
          <div
            className='flex-1 h-px min-w-0'
            style={{
              background: connectorBg,
              transition: CONNECTOR_TRANSITION,
            }}
          />
        )}
      </div>

      {/* Title + optional English subtitle (CPOE bilingual stepper) */}
      {!hideLabels && (
        <div className='flex flex-col items-start w-full' style={{ gap: 'var(--dim-space-050)' }}>
          <p
            className='leading-[1.5] text-left m-0'
            data-step-label
            style={{
              color: titleColor,
              fontFamily: 'var(--type-family-body)',
              fontSize: compact ? 'var(--type-size-xxs, 10px)' : 'var(--type-size-xs, 12px)',
              fontWeight: type === TYPE.CURRENT ? 'var(--type-weight-bold, 700)' : 'var(--type-weight-regular, 400)',
              lineHeight: compact ? 1.3 : 1.35,
              whiteSpace: labelNoWrap ? 'nowrap' : 'normal',
              transition: `${TITLE_TRANSITION}, font-size 220ms ${SMOOTH_EASE}, line-height 220ms ${SMOOTH_EASE}`,
            }}
          >
            {label}
          </p>
          {subtitle && !compact && (
            <p
              className='text-left m-0'
              style={{
                color: 'var(--text-steps-subtitle)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xxs, 10px)',
                lineHeight: 1.3,
                transition: TITLE_TRANSITION,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

/* `framed` wraps the row in a white card chrome (top-rounded card surface +
   brand-quaternary bottom border + compact token-based padding) — the variant used inside
   form pages (OPD Screening etc.) where the stepper sits flush above the
   body. Default (`framed={false}`) renders plain — used inside FormShell /
   TreatmentFormShell that supply their own chrome. */
/* `completedSteps` — opt-in validation gate. When provided (array of
   booleans aligned to `steps`), a step renders SUCCESS whenever its
   entry is `true` (even if the user jumped ahead/out of order). The
   current step always renders CURRENT. When the prop is omitted we
   keep the original behaviour (`idx < current` ⇒ SUCCESS). */
const StepProgress = ({
  steps,
  current = 0,
  completedSteps,
  onStepClick,
  className = '',
  framed = false,
  compact = false,
  labelNoWrap = false,
  hideLabels = false,
  morph = false,
}) => {
  const row = (
    <div
      className={`flex items-start ${className}`}
      style={{
        gap: compact || hideLabels ? 'var(--dim-space-050, 2px)' : 'var(--dim-space-100, 4px)',
        transition: 'gap 200ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {steps.map((raw, idx) => {
        const { title, subtitle } = normalizeStep(raw);
        const isComplete = completedSteps
          ? Boolean(completedSteps[idx])
          : idx < current;
        const type = idx === current
          ? TYPE.CURRENT
          : isComplete
            ? TYPE.SUCCESS
            : TYPE.DEFAULT;
        return (
          <StepItem
            key={idx}
            label={title}
            subtitle={subtitle}
            idx={idx}
            type={type}
            isLast={idx === steps.length - 1}
            onStepClick={onStepClick}
            compact={compact}
            labelNoWrap={labelNoWrap}
            hideLabels={hideLabels}
          />
        );
      })}
    </div>
  );

  const morphedRow = (framed || morph) ? (
    <div style={morphStepScaleStyle}>{row}</div>
  ) : row;

  if (!framed) return morphedRow;

  return (
    <div
      className='w-full bg-surface-card border-b rounded-t-card flex items-center justify-center'
      style={{
        borderBottomColor: 'var(--border-brandPrimary-quaternary)',
        ...(compact
          ? {
              paddingLeft: 'var(--dim-space-400, 16px)',
              paddingRight: 'var(--dim-space-400, 16px)',
              paddingTop: 'var(--dim-space-200, 8px)',
              paddingBottom: 'var(--dim-space-200, 8px)',
            }
          : morphPanelPaddingStyle),
      }}
    >
      {morphedRow}
    </div>
  );
};

export default StepProgress;
