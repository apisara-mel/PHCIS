import React, { useState } from 'react';

/* MIH SelectableCardButton — Figma PHCIS-OPD 160:26432 (Pain / Triage /
   Care Orders / Cert chip rows in SymptomStep). Bordered card-style
   "radio button" — 3 states:
     • Default  → 1px `--border-neutralbutton-tertiary`, no shadow.
     • Hover    → 2px `--border-brandprimarybutton-tertiary` (#C5EDDA)
                  + Brand Drop Shadow Top/200.
     • Selected → 2px `--border-brandprimarybutton-default` (#007549)
                  + Brand Drop Shadow Top/200 (same elevation cue as
                  hover so engaged buttons read as one family).

   Stroke uses OUTSET box-shadow (spread only, 0 offset) instead of a
   real CSS border so the 1px ↔ 2px transition on hover/selected does
   not nudge sibling buttons and does not leave the white "gap" the
   inset technique produces when the parent surface is also white. */
const SelectableCardButton = ({
  selected,
  onClick,
  ariaLabel,
  minHeight = 56,
  padX = 'var(--dim-space-400, 16px)',
  children,
}) => {
  const [hover, setHover] = useState(false);
  /* Selected wins over hover when both are true so the dark
     brand-p700 stroke remains visible while the cursor is still over
     the active button. */
  const state = selected ? 'selected' : hover ? 'hover' : 'default';

  let strokeShadow;
  if (state === 'selected') {
    strokeShadow =
      '0 0 0 var(--dim-stroke-200, 2px) var(--border-brandprimarybutton-default, #007549)';
  } else if (state === 'hover') {
    strokeShadow =
      '0 0 0 var(--dim-stroke-200, 2px) var(--border-brandprimarybutton-tertiary, #C5EDDA)';
  } else {
    strokeShadow =
      '0 0 0 var(--dim-stroke-100, 1px) var(--border-neutralbutton-tertiary, #E2E4E6)';
  }

  /* Drop shadow stack — `none` keyword on default so the shadow
     transition starts from a clean baseline. Hover + selected share
     the same Brand Drop Shadow Top/200 token. */
  const dropShadow =
    state === 'default'
      ? 'none'
      : 'var(--shadow-brand-top-200, 0px -1px 4px rgba(8, 167, 104, 0.08), 0px -1px 8px rgba(8, 167, 104, 0.10))';

  return (
    <button
      type='button'
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      aria-pressed={selected}
      aria-label={ariaLabel}
      className='inline-flex items-center'
      style={{
        minHeight,
        minWidth: 40,
        paddingLeft: padX,
        paddingRight: padX,
        paddingTop: 'var(--dim-space-200, 8px)',
        paddingBottom: 'var(--dim-space-200, 8px)',
        gap: 'var(--dim-space-200, 8px)',
        borderRadius: 'var(--dim-radius-200, 8px)',
        background: 'var(--surface-neutralbutton-quinary, #FFFFFF)',
        border: 'none',
        boxShadow:
          dropShadow === 'none' ? strokeShadow : `${strokeShadow}, ${dropShadow}`,
        color: 'var(--text-content-default, #363B3F)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        lineHeight: 1.5,
        cursor: 'pointer',
        outline: 'none',
        userSelect: 'none',
        boxSizing: 'border-box',
        transition: 'background 120ms ease, box-shadow 120ms ease',
      }}
    >
      {children}
    </button>
  );
};

export default SelectableCardButton;
