import React, { useState } from 'react';
import Icon from '@/components/icons/Icon';

/* MIH SelectableCardButton — Figma PHCIS-OPD 160:26432 (Pain / Triage /
   Care Orders / Cert chip rows in SymptomStep). Bordered card-style
   "radio button" — 3 states:
     • Default  → 1px `--border-neutralbutton-tertiary`, no shadow.
     • Hover    → 2px `--border-brandprimarybutton-tertiary` (#C5EDDA)
                  + Brand Drop Shadow Top/200.
     • Selected → 2px `--brand-p600` (same stroke the search family uses
                  when typing; the *.search.focus tokens were retired)
                  + `--shadow-secondarysearch` (same elevation cue as search
                  focus so selected cards read as one family with search)
                  + trailing `check_circle` (showTrailingCheck, default on).

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
  padY = 'var(--dim-space-200, 8px)',
  showTrailingCheck = true,
  className = '',
  children,
}) => {
  const [hover, setHover] = useState(false);
  /* Selected wins over hover when both are true so the search-focus
     brand-p600 stroke remains visible while the cursor is still over
     the active button. */
  const state = selected ? 'selected' : hover ? 'hover' : 'default';

  let strokeShadow;
  if (state === 'selected') {
    strokeShadow =
      '0 0 0 var(--dim-stroke-200, 2px) var(--brand-p600, #08A768)';
  } else if (state === 'hover') {
    strokeShadow =
      '0 0 0 var(--dim-stroke-200, 2px) var(--border-brandprimarybutton-tertiary, #C5EDDA)';
  } else {
    strokeShadow =
      '0 0 0 var(--dim-stroke-100, 1px) var(--border-neutralbutton-tertiary, #E2E4E6)';
  }

  /* Drop shadow — default has none. Hover keeps Brand Drop Shadow Top/200;
     selected keeps the search-family elevation (`--shadow-primarysearch`;
     the secondarysearch alias was retired with the §6.17.5 redesign). */
  const dropShadow =
    state === 'default'
      ? 'none'
      : state === 'selected'
        ? 'var(--shadow-primarysearch)'
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
      className={`inline-flex items-center ${className}`.trim()}
      style={{
        minHeight,
        minWidth: 40,
        paddingLeft: padX,
        paddingRight: padX,
        paddingTop: padY,
        paddingBottom: padY,
        gap: 'var(--dim-space-200, 8px)',
        borderRadius: 'var(--dim-radius-200, 8px)',
        background: 'var(--surface-neutralbutton-quinary, #FFFFFF)',
        border: 'none',
        boxShadow:
          dropShadow === 'none' ? strokeShadow : `${strokeShadow}, ${dropShadow}`,
        color: selected
          ? 'var(--text-brandPrimary-default, #007549)'
          : 'var(--text-content-default, #363B3F)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        lineHeight: 1.5,
        cursor: 'pointer',
        outline: 'none',
        userSelect: 'none',
        boxSizing: 'border-box',
        transition: 'background 120ms ease, box-shadow 120ms ease, color 120ms ease',
      }}
    >
      {children}
      {showTrailingCheck && selected ? (
        <Icon
          name='check_circle'
          size={18}
          className='shrink-0'
          style={{
            marginLeft: 'auto',
            color: 'var(--text-brandPrimary-default, #007549)',
          }}
          aria-hidden
        />
      ) : null}
    </button>
  );
};

export default SelectableCardButton;
