import React, { useState } from 'react';
import ColorfulBadge from '@/components/badge/ColorfulBadge';

/* MIH TabCapsule — Figma "Tab Capsule" (component 236:37451 · spec 2612:7791).
   Treatment history filter row: CPOE [`176:38632`](https://www.figma.com/design/cOjwwHvgGURA3IEuls8RT5/PHCIS-%7C-CPOE?node-id=176-38632)
   — `variant="filter"`: label-only, width hugs text, row gap `space/200` (8px).

   Capsule-shaped tab/chip with leading indicator + label + trailing chevron.
   3 types × 4 states × 1 size (Default 40h).

   Types (each carries its own leading indicator):
     • default      — link icon (Material Symbols "link")
     • in-progress  — orange dot indicator
     • success      — green filled check icon

   States: default · hover · active (selected) · disabled
     "active" is the Figma "Active" state (selected appearance).
     "in-progress" type keeps the dot in every state but the border/bg
     follow the same default→hover→active progression.

   Tokens (alias from design.md §6.x):
     surface/tabcapsule/{default,hover,selected,success,disabled}
     border/tabcapsule/{default,hover,selected,inprogress,success,disabled}
     text/tabcapsule/{default,hover,selected,inprogress,success,disabled}

   Layout matches Figma: h=40, px=12, py=4, gap=6, rounded-full, 1px stroke.
   Width hugs label text by default (filter-tag rows). Pass `minWidth` /
   `maxWidth` only when a fixed or capped width is required.

   Optional badge + add-icon slots (Figma `Show Badge` / `Show Add` props
   from `2612:7791`). When provided, the capsule renders an inline
   ColorfulBadge before the label (typical use: ICD code prefix) and
   swaps the trailing chevron for an `add_circle` action icon. Both are
   opt-in via `badge` / `showAddIcon`. See [Doctor AI suggestion chips]
   (src/components/forms/TreatmentSteps.jsx) for the canonical usage.
*/

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

const Sym = ({ name, size = 16, color }) => (
  <span
    className='material-symbols-outlined'
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontSize: size,
      color,
      lineHeight: 1,
      display: 'inline-flex',
      flexShrink: 0,
    }}
    aria-hidden
  >
    {name}
  </span>
);

const Dot = ({ color }) => (
  <span
    aria-hidden
    style={{
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: color,
      display: 'inline-block',
      flexShrink: 0,
    }}
  />
);

const TYPE_LEADING_ICON = {
  default:       'link',
  success:       'check_circle',
  'in-progress': 'dot',   /* sentinel — rendered as a colored Dot */
};

/* The "in-progress" dot color stays orange (Figma indicator color) across
   all states — semantic colour, not state colour. */
const IN_PROGRESS_DOT_COLOR = 'var(--icon-tabcapsule-inprogress, #F08C29)';

const resolveTone = ({ type, state }) => {
  if (state === 'disabled') {
    return {
      bg:     'var(--surface-tabcapsule-disabled)',
      border: 'var(--border-tabcapsule-disabled)',
      text:   'var(--text-tabcapsule-disabled)',
      icon:   'var(--icon-tabcapsule-disabled)',
    };
  }
  if (state === 'active') {
    return {
      bg:     'var(--surface-tabcapsule-selected)',
      border: 'var(--border-tabcapsule-selected)',
      text:   'var(--text-tabcapsule-selected)',
      icon:   'var(--icon-tabcapsule-selected)',
    };
  }
  if (state === 'hover') {
    return {
      bg:     'var(--surface-tabcapsule-hover)',
      border: 'var(--border-tabcapsule-hover)',
      text:   'var(--text-tabcapsule-hover)',
      icon:   'var(--icon-tabcapsule-hover)',
    };
  }
  /* default state — type-specific surface (default / success share white). */
  if (type === 'success') {
    return {
      bg:     'var(--surface-tabcapsule-success)',
      border: 'var(--border-tabcapsule-success)',
      text:   'var(--text-tabcapsule-success)',
      icon:   'var(--icon-tabcapsule-success)',
    };
  }
  if (type === 'in-progress') {
    return {
      bg:     'var(--surface-tabcapsule-success)',
      border: 'var(--border-tabcapsule-inprogress)',
      text:   'var(--text-tabcapsule-inprogress)',
      icon:   'var(--icon-tabcapsule-default)',
    };
  }
  return {
    bg:     'var(--surface-tabcapsule-default)',
    border: 'var(--border-tabcapsule-default)',
    text:   'var(--text-tabcapsule-default)',
    icon:   'var(--icon-tabcapsule-default)',
  };
};

const TabCapsule = React.forwardRef(function TabCapsule(
  {
    variant = 'default',               /* 'default' | 'filter' — filter = CPOE 176:38632 label-only chips */
    type = 'default',                  /* 'default' | 'in-progress' | 'success' */
    state,                              /* force visual: 'default' | 'hover' | 'active' | 'disabled' */
    selected = false,                   /* convenience alias for state='active' */
    disabled = false,
    label = 'Outline',
    leadingIcon,                        /* override the type's default leading icon */
    showLeadingIcon,
    showTrailingIcon,
    showText = true,
    /* Figma 2612:7791 "Show Badge" — when truthy, renders a leading
       ColorfulBadge (indigo-bold by default). Pass a string to fill the
       badge label, or an object `{ label, style, hierarchy }` to override
       the badge style. The leading icon is suppressed automatically when
       a badge is shown. */
    badge,
    badgeStyle = 'indigo',
    badgeHierarchy = 'primary',
    /* Figma 2612:7791 "Show Add" — swaps the trailing chevron for an
       `add_circle` action glyph (Doctor AI suggestion chips). Only one
       trailing affordance renders at a time; passing `showAddIcon`
       implicitly turns off the chevron. */
    showAddIcon = false,
    minWidth,
    maxWidth,
    onClick,
    className = '',
    style = {},
    ...rest
  },
  ref,
) {
  const isFilter = variant === 'filter';
  /* Badge fills the leading slot — suppress the type icon when one is
     supplied, even if the caller didn't explicitly opt out. */
  const hasBadge = badge != null && badge !== false && badge !== '';
  const resolvedShowLeading = hasBadge ? false : (showLeadingIcon ?? !isFilter);
  /* `showAddIcon` wins over the chevron; both can never coexist (the
     Figma spec only ships one trailing affordance per chip). */
  const resolvedShowTrailing = !showAddIcon && (showTrailingIcon ?? !isFilter);
  const badgeProps = typeof badge === 'object' && badge !== null
    ? { style: badgeStyle, hierarchy: badgeHierarchy, ...badge }
    : { style: badgeStyle, hierarchy: badgeHierarchy, label: badge };
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const effectiveState =
    state
    || (disabled ? 'disabled'
      : selected ? 'active'
      : hovered  ? 'hover'
      : 'default');
  const isDisabled = effectiveState === 'disabled';
  const tone = resolveTone({ type, state: effectiveState });

  const iconSource = leadingIcon ?? TYPE_LEADING_ICON[type] ?? 'link';

  const renderLeading = () => {
    if (!resolvedShowLeading) return null;
    if (iconSource === 'dot' || (type === 'in-progress' && !leadingIcon)) {
      return <Dot color={isDisabled ? 'var(--icon-tabcapsule-disabled)' : IN_PROGRESS_DOT_COLOR} />;
    }
    if (typeof iconSource === 'string') {
      return <Sym name={iconSource} size={16} color={tone.icon} />;
    }
    if (typeof iconSource === 'function') return iconSource({ size: 16, color: tone.icon });
    return iconSource;
  };

  return (
    <button
      ref={ref}
      type='button'
      onClick={isDisabled ? undefined : onClick}
      onMouseEnter={() => !isDisabled && setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => !isDisabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      aria-pressed={effectiveState === 'active' || undefined}
      className={`inline-flex items-center justify-center whitespace-nowrap ${className}`}
      style={{
        boxSizing: 'border-box',
        height: 'var(--dim-size-800, 40px)',
        width: 'auto',
        ...(minWidth != null ? { minWidth } : {}),
        ...(maxWidth != null ? { maxWidth } : {}),
        gap: isFilter ? 0 : 'var(--dim-space-150, 6px)',
        paddingLeft:  'var(--dim-space-300, 12px)',
        paddingRight: 'var(--dim-space-300, 12px)',
        paddingTop:    'var(--dim-space-100, 4px)',
        paddingBottom: 'var(--dim-space-100, 4px)',
        borderRadius: 'var(--dim-radius-full)',
        background: tone.bg,
        border: `var(--dim-stroke-100, 1px) solid ${tone.border}`,
        color: tone.text,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-medium)',
        lineHeight: 1.5,
        transform: pressed && !isDisabled ? 'scale(0.97)' : 'scale(1)',
        transition: [
          `background-color 200ms ${EASE}`,
          `border-color 200ms ${EASE}`,
          `color 200ms ${EASE}`,
          `transform 140ms ${EASE}`,
        ].join(', '),
        ...style,
      }}
      {...rest}
    >
      {renderLeading()}
      {hasBadge && (
        <ColorfulBadge
          style={badgeProps.style}
          hierarchy={badgeProps.hierarchy}
          size='small'
          width='hug'
          showDot={false}
          showIcon={false}
        >
          {badgeProps.label}
        </ColorfulBadge>
      )}
      {showText && (
        <span
          style={{
            flexShrink: 0,
            whiteSpace: 'nowrap',
            textAlign: 'center',
            wordBreak: 'break-word',
            color: 'inherit',
            transition: `color 200ms ${EASE}`,
            ...(maxWidth != null ? {
              flexShrink: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            } : {}),
          }}
        >
          {label}
        </span>
      )}
      {showAddIcon && (
        /* Figma 3394:1154 — Plus-circle action glyph. Default + disabled
           keep the neutral tertiary (#ADB2B7) "add affordance" tint;
           hover/active retint to the brand tab-capsule icon tokens so
           the chip-as-whole feels cohesive when interacted with:
             default  → `--icon-neutral-tertiary`
             hover    → `--icon-tabcapsule-hover`
             active   → `--icon-tabcapsule-selected`
             disabled → `--icon-tabcapsule-disabled` */
        <Sym
          name='add_circle'
          size={20}
          color={
            effectiveState === 'hover'    ? 'var(--icon-tabcapsule-hover)'
            : effectiveState === 'active' ? 'var(--icon-tabcapsule-selected)'
            : effectiveState === 'disabled' ? 'var(--icon-tabcapsule-disabled)'
            : 'var(--icon-neutral-tertiary)'
          }
        />
      )}
      {resolvedShowTrailing && (
        <Sym name='keyboard_arrow_down' size={16} color={tone.icon} />
      )}
    </button>
  );
});

TabCapsule.displayName = 'TabCapsule';

export default TabCapsule;
