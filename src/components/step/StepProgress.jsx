import React, { useState } from 'react';

/* Figma node 2709:6562 — Step Indicator (MIH Design System Foundation)
   Variants: type (Default | Current | Success) × state (Default | Hover)
   Per Figma source code:
     Default + Default : bg surface/steps/default        · num text/steps/default     · title text/steps/title           (50% opacity)
     Default + Hover   : bg surface/steps/hover          · num text/steps/default     · title text/steps/title-hover
     Current + Default : bg surface/steps/selected       · 4px border primaryborder/600 (inside 28px box)
                         num text/steps/select (white)   · title text/steps/title-select  (Bold)
     Success + Default : bg surface/steps/success        · check icon white            · title text/steps/title-success
     Success + Hover   : bg surface/steps/success-hover  · check icon white            · title text/steps/title-success
   Sizes: Step item 160px · Circle 28×28 (border-box, so Current's inner becomes 20×20) · Indicator gap 6px · Column gap 8px */

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
const AnimatedCheck = ({ active }) => (
  <svg
    width='16'
    height='16'
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

const StepItem = ({ label, subtitle, idx, type, isLast, onStepClick }) => {
  const [hovered, setHovered] = useState(false);
  const isClickable = Boolean(onStepClick) && type !== TYPE.CURRENT;
  const showHover = hovered && isClickable;

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
    <div className='w-[160px] shrink-0 flex flex-col gap-2 items-start'>
      {/* Indicator row: circle + connector */}
      <div className='flex items-center gap-1.5 w-full'>
        <button
          type='button'
          onClick={() => isClickable && onStepClick(idx)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={[
            'relative box-border rounded-full flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden',
            isClickable ? 'cursor-pointer' : 'cursor-default',
          ].join(' ')}
          style={{
            width: 28,
            height: 28,
            background: bg,
            color: numberColor,
            border:
              type === TYPE.CURRENT
                ? '4px solid var(--primaryBorder-600)'
                : 'none',
            boxShadow:
              type === TYPE.CURRENT
                ? '0 0 0 4px var(--primaryBorder-600)'
                : 'none',
            /* `translateZ(0)` + `willChange: transform` promote the button
               to its own GPU layer so the scale-on-hover renders without
               re-rasterising the inner number on every animation frame —
               which is what was causing the text inside to look jittery
               during the transition. `backfaceVisibility: hidden` also
               stabilises subpixel snapping on WebKit. */
            transform: `scale(${circleScale}) translateZ(0)`,
            transformOrigin: 'center',
            transition: CIRCLE_TRANSITION,
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            outline: 'none',
          }}
        >
          {/* Always render both glyphs so they cross-fade between the
              numeric "upcoming" state and the check-mark "success" state
              instead of popping. Both are absolutely centred inside the
              button (which is `position: relative`); the check uses an
              inline SVG so we can animate its stroke length, making it
              "draw itself" when the step transitions to success. */}
          <span
            className='absolute inset-0 inline-flex items-center justify-center'
            style={{
              opacity: type === TYPE.SUCCESS ? 1 : 0,
              transition: `opacity 220ms ${SMOOTH_EASE}`,
            }}
          >
            <AnimatedCheck active={type === TYPE.SUCCESS} />
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
      <div className='flex flex-col items-start w-full' style={{ gap: 'var(--dim-space-050)' }}>
        <p
          className='text-sm leading-[1.5] text-left m-0'
          style={{
            color: titleColor,
            fontWeight: type === TYPE.CURRENT ? 700 : 400,
            transition: TITLE_TRANSITION,
          }}
        >
          {label}
        </p>
        {subtitle && (
          <p
            className='text-xs leading-[1.5] text-left m-0'
            style={{
              color: 'var(--text-steps-subtitle)',
              fontFamily: 'var(--type-family-body)',
              transition: TITLE_TRANSITION,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

/* `framed` wraps the row in a white card chrome (top-rounded card surface +
   brand-quaternary bottom border + 24px padding) — the variant used inside
   form pages (OPD Screening etc.) where the stepper sits flush above the
   body. Default (`framed={false}`) renders plain — used inside FormShell /
   TreatmentFormShell that supply their own chrome. */
/* `completedSteps` — opt-in validation gate. When provided (array of
   booleans aligned to `steps`), a step renders SUCCESS only if its
   entry is `true`. The current step still renders CURRENT regardless,
   and steps that are neither current nor complete render DEFAULT. When
   the prop is omitted we keep the original behaviour (`idx < current`
   ⇒ SUCCESS) so existing callers don't change. */
const StepProgress = ({
  steps,
  current = 0,
  completedSteps,
  onStepClick,
  className = '',
  framed = false,
}) => {
  const row = (
    <div className={`flex items-start gap-1.5 ${className}`}>
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
          />
        );
      })}
    </div>
  );

  if (!framed) return row;

  return (
    <div
      /* Bottom hairline is aliased from `--border-brandPrimary-quaternary`
         (brand-aware) via inline style — Tailwind v2.1 JIT parses
         `border-[var(...)]` as border-width rather than border-color, so
         the arbitrary class can't reliably tint the rule. Pairing
         `border-b` (width + style) with an explicit `borderColor`
         matches how Popup / Calendar / DateFilterPopup tint their own
         chrome from the same token. */
      className='w-full bg-white border-b rounded-t-card flex items-center justify-center px-6 py-6'
      style={{ borderBottomColor: 'var(--border-brandPrimary-quaternary)' }}
    >
      {row}
    </div>
  );
};

export default StepProgress;
