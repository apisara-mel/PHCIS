import React from 'react';

/* MIH RadioBox — Figma "Radio" (node 328:5812). The 16×16 atom.
   6 states matching Figma property panel:
     default / hover / selected / selected-hover /
     disabled-unchecked / selected-disabled (a.k.a. disabled-checked).
   Tokens alias from design.md — no hex literals.

   Used as the building block for <Radio> and <RadioGroup>. Stateless:
   parent owns checked + hover. Mirrors the CheckboxBox atom pattern so
   both groups stay visually consistent.                                */

const resolveBox = ({ checked, hover, disabled }) => {
  if (disabled) {
    if (checked) {
      /* Selected-disabled — solid neutral fill, no border, dot shown */
      return {
        bg: 'var(--surface-disabled-secondary-hover)',
        border: 'none',
        showDot: true,
        dotColor: 'var(--surface-switch-default)',
      };
    }
    /* Disabled-unchecked — white bg + neutral-200 border, no dot */
    return {
      bg: 'var(--surface-switch-default)',
      border: 'var(--dim-stroke-150) solid var(--border-switch-disabled)',
      showDot: false,
    };
  }
  if (checked) {
    /* Selected / Selected-Hover — Figma PHCIS Appointment 4046:18305
       (Radio 2250:8272): fill background/screen/default + stroke
       surface/switch/on (brand p600). Dot uses same on-colour. */
    return {
      bg: 'var(--surface-switch-default)',
      border: `var(--dim-stroke-150) solid ${
        hover ? 'var(--surface-switch-checkbox-hover)' : 'var(--surface-switch-on)'
      }`,
      showDot: true,
      dotColor: hover
        ? 'var(--surface-switch-checkbox-hover)'
        : 'var(--surface-switch-on)',
    };
  }
  if (hover) {
    /* Unchecked-hover — light brand border preview, no dot yet.
       Figma token name in source is "radio-dedault-hover" (typo) →
       maps to the same brand/p500 alias the checkbox preview uses. */
    return {
      bg: 'var(--surface-switch-default)',
      border: 'var(--dim-stroke-150) solid var(--surface-switch-checkbox-default-hover)',
      showDot: false,
    };
  }
  /* Default — white bg + neutral-300 border, no dot */
  return {
    bg: 'var(--surface-switch-default)',
    border: 'var(--dim-stroke-150) solid var(--border-switch-default)',
    showDot: false,
  };
};

const RadioBox = ({ checked = false, hover = false, disabled = false, className = '', style = {} }) => {
  const s = resolveBox({ checked, hover, disabled });
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 overflow-hidden ${className}`}
      style={{
        width: 16,
        height: 16,
        borderRadius: 'var(--dim-radius-full)',
        background: s.bg,
        border: s.border,
        boxSizing: 'border-box',
        transition: 'background 120ms ease, border-color 120ms ease',
        ...style,
      }}
    >
      {s.showDot && (
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: 'var(--dim-radius-full)',
            background: s.dotColor,
          }}
        />
      )}
    </span>
  );
};

export default RadioBox;
