import React, { useState } from 'react';
import Icon from '@/components/icons/Icon';

/* SelectableTag — pill-style toggle chip used for selectable
   presets / multi-select filters. Default tokens follow the NotePreset
   chips; hover uses brandTag aliases to match the design-system Tag
   interaction model.

   `leadingGlyph='plus'` keeps a leading + even when selected (Figma
   PHCIS OPD 333:54594 shortcut row). Default `toggle` swaps to a check
   when selected for ordinary filter chips.

   Size axis (Figma 3362:3326 — MIH Design System Foundation · Tag):
     • 'sm' — 28h · 12/font, 12px icon  (existing default)
     • 'md' — 32h · 12/font, 14px icon  (--dim-size-600)
     • 'lg' — 40h · 14/font, 16px icon  (--dim-size-800)
   The Large variant mirrors FilterTag's `lg` height so a SelectableTag
   and a FilterTag can sit on the same toolbar row without one looking
   smaller than the other. */

const SIZE_TOKENS = {
  sm: {
    height: 28,
    paddingX: 'var(--dim-space-300)',
    gap:      'var(--dim-space-100)',
    fontSize: 'var(--type-size-xs)',
    iconSize: 12,
  },
  md: {
    height: 32,
    paddingX: 'var(--dim-space-300)',
    gap:      'var(--dim-space-150)',
    fontSize: 'var(--type-size-xs)',
    iconSize: 14,
  },
  lg: {
    /* Figma 3362:3326 — size=Large: h-40, gap 6, px 12, font 14, icon 16. */
    height: 40,
    paddingX: 'var(--dim-space-300)',
    gap:      'var(--dim-space-150)',
    fontSize: 'var(--type-size-sm)',
    iconSize: 16,
  },
};

const SelectableTag = ({
  label,
  selected = false,
  size = 'sm',
  /* 'toggle' → plus when idle, check when selected (filters).
     'plus' → always plus (Figma PHCIS OPD 333:54594 shortcut chips). */
  leadingGlyph = 'toggle',
  onClick,
  className = '',
  style = {},
  ariaLabel,
  children,
}) => {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const state = selected
    ? 'selected'
    : hovered
      ? 'hover'
      : 'default';

  const palette = {
    default: {
      background: 'var(--surface-neutralbutton-quinary)',
      border: 'var(--border-neutralbutton-tertiary)',
      text: 'var(--text-content-secondary)',
      icon: 'var(--text-content-tertiary)',
    },
    hover: {
      background: 'var(--surface-brandtag-hover, var(--surface-neutralbutton-quinary))',
      border: 'var(--border-brandtag-hover, var(--border-neutralbutton-tertiary))',
      text: 'var(--text-brandtag-hover, var(--text-content-secondary))',
      icon: 'var(--icon-brandtag-hover, var(--text-content-tertiary))',
    },
    selected: {
      background: 'var(--surface-brandPrimary-quaternary)',
      border: 'var(--border-brandPrimary-tertiary)',
      text: 'var(--text-brandprimarybutton-default)',
      icon: 'var(--text-brandprimarybutton-default)',
    },
  }[state];

  const dim = SIZE_TOKENS[size] || SIZE_TOKENS.sm;

  return (
    <button
      type='button'
      aria-label={ariaLabel}
      aria-pressed={selected}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      className={`inline-flex items-center transition-colors duration-150 ease-out ${className}`}
      style={{
        height: dim.height,
        gap: dim.gap,
        paddingLeft: dim.paddingX,
        paddingRight: dim.paddingX,
        borderRadius: 'var(--dim-radius-full)',
        background: palette.background,
        border: `var(--dim-stroke-100) solid ${palette.border}`,
        color: palette.text,
        fontFamily: 'var(--type-family-body)',
        fontSize: dim.fontSize,
        fontWeight: selected
          ? 'var(--type-weight-medium)'
          : 'var(--type-weight-regular)',
        lineHeight: 1.5,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transform: pressed ? 'translateY(1px)' : 'translateY(0)',
        ...style,
      }}
    >
      <span style={{ color: palette.icon, display: 'inline-flex' }} aria-hidden>
        <Icon
          name={leadingGlyph === 'plus' ? 'plus' : (selected ? 'check' : 'plus')}
          size={dim.iconSize}
        />
      </span>
      {label ?? children}
    </button>
  );
};

export default SelectableTag;
