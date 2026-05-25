import React, { useState } from 'react';
import Badge from '@/components/badge/Badge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Switch from '@/components/switch/Switch';

/* MIH ActionList (a.k.a. List) — Figma 382:14360 / 382:14361 (MIH
   Design System Foundation · "List"). Single-row list item used inside
   dropdowns, menus, and side panels. The Figma property panel ships
   with eleven knobs which this component mirrors 1:1:

     • state              'default' | 'hover' | 'selected' | 'selected-hover'
     • iconWeight         'default' | 'darker'        (Figma calls it "Icon")
     • showLeadingIcon    boolean (default true)
     • showSubtext        boolean (default false)
     • showSwitch         boolean (default true)
     • showBadge          boolean (default true)
     • showCheck          boolean (default true)
     • showChevronRight   boolean (default true)
     • showLeadingBadge   boolean (default false) — colorful pill before the text
     • showLeadingBadge2  boolean (default false) — second colorful pill (e.g. HN)
     • showLeadingBadge3  boolean (default false) — Figma 382:14361 slot:
                                         a colorful pill sitting in a 64 px
                                         fixed-width column so codes of
                                         varying length (e.g. "I10" vs
                                         "M54.9") keep labels vertically
                                         aligned across rows. Used by the
                                         AISearch recent-history dropdown
                                         (Figma 3396:1627).

   Each `show*` flag is AND-gated with the corresponding content prop —
   passing `showBadge` without a `badge` payload still renders nothing.
   This keeps the API forgiving: callers can drop the flags they don't
   need and the row collapses to whatever content they actually supplied.

   Token contract (all brand-aware unless noted):
     surface/list/{default,hover,selected,selected-hover}
     text/list/{default,hover,selected,selected-hover}
     text/list/{subtext,subtext-hover}
     dimension/size/1000      → 48 px min-height
     dimension/space/200      → 8  px gap + vertical padding
     dimension/space/300      → 12 px horizontal padding
     dimension/radius/100     → 4  px radius (all states)

   Backward compatibility:
     • Legacy `active={true}` keeps working — it maps to `state='hover'`
       so older call sites don't break.
     • Legacy `showChevron` keeps working — falls back to
       `showChevronRight` when both unset.                              */

const Sym = ({ name, size = 16, color, weight = 400, fill = 0 }) => (
  <span
    className='material-symbols-outlined'
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontSize: size,
      color,
      lineHeight: 1,
      display: 'inline-flex',
      fontVariationSettings: `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' 0, 'opsz' 24`,
    }}
    aria-hidden
  >
    {name}
  </span>
);

/* Leading badge slots — Figma 382:14360 exposes `showLeadingBadge` +
   `showLeadingBadge2` as toggles in the property panel. The pills alias
   `<ColorfulBadge>` directly (Figma node 2076:8413) so style/size/fill/
   hierarchy stay consistent with the rest of the badge family. Per
   Figma 3345:2981 the queue pill is `teal` and the HN pill is `indigo`,
   both rendered as Small / Default fill / Secondary hierarchy. */

/* 36×36 brand-tinted tile. Figma node 2796:5522. */
const CircleIconTile = ({ name }) => (
  <div
    className='shrink-0 inline-flex items-center justify-center'
    style={{
      width: 36,
      height: 36,
      borderRadius: 'var(--dim-radius-full, 9999px)',
      background: 'var(--surface-brandPrimary-quaternary)',
      color: 'var(--text-brandPrimary-default)',
    }}
  >
    <Sym name={name} size={20} color='currentColor' />
  </div>
);

const BADGE_TONE_TO_STYLE = {
  warning: 'warning',
  success: 'success',
  info:    'info',
  error:   'error',
  neutral: 'neutral',
};

/* 18×18 tick-on-circle (success) — Figma node 2798:5280.
   Bg uses `icon/positive/success` (teal/500 fixed, non-brand-responsive)
   per design.md §10229; tick stays white in both modes.                  */
const SuccessTick = () => (
  <span
    aria-hidden
    className='shrink-0 inline-flex items-center justify-center'
    style={{
      width: 18,
      height: 18,
      borderRadius: 'var(--dim-radius-150, 6px)',
      background: 'var(--icon-positive-success)',
      color: 'var(--text-positive-success-tick)',
    }}
  >
    <Sym name='check' size={12} color='currentColor' weight={700} />
  </span>
);

/* Resolve a row's tone tokens from the explicit `state` prop. Hover-based
   tones are also picked when `active` is true (legacy ergonomic). */
const STATE_TONES = {
  default: {
    bg:        'var(--surface-list-default)',
    text:      'var(--text-list-default)',
    subtext:   'var(--text-list-subtext)',
  },
  hover: {
    bg:        'var(--surface-list-hover)',
    text:      'var(--text-list-hover)',
    subtext:   'var(--text-list-subtext-hover)',
  },
  selected: {
    bg:        'var(--surface-list-selected)',
    text:      'var(--text-list-selected)',
    subtext:   'var(--text-list-subtext)',
  },
  'selected-hover': {
    bg:        'var(--surface-list-selected-hover)',
    text:      'var(--text-list-selected-hover)',
    subtext:   'var(--text-list-subtext-hover)',
  },
};

const ActionList = ({
  /* Content */
  label = 'List',
  subtext,                       // string shown under the label when showSubtext
  leadingIcon,                   // material symbol name (16px)
  leadingBadge,                  // { tone, label } — colorful pill before the text
  leadingBadge2,                 // { tone, label } — second colorful pill
  leadingBadge3,                 // { tone, label } — fixed 64 px column pill (Figma 382:14361)
  circleIcon,                    // material symbol name inside 36×36 brand tile
  badge,                         // { tone, label } | null  (trailing pill)
  showSuccess = false,           // legacy SuccessTick
  switchProps,                   // { checked, onChange, disabled } | undefined
  trailing,                      // free slot rendered at the very end

  /* Figma property panel (382:14360) */
  state,                         // 'default' | 'hover' | 'selected' | 'selected-hover'
  iconWeight = 'default',        // 'default' (400) | 'darker' (700) — Figma "Icon"
  showLeadingIcon = true,
  showLeadingBadge = false,
  showLeadingBadge2 = false,
  showLeadingBadge3 = false,
  showSubtext = false,
  showSwitch = true,
  showBadge = true,
  showCheck = true,
  showChevronRight,              // boolean — defaults true via showChevron fallback
  showChevron,                   // legacy alias

  /* Legacy state shortcut — sticks around so existing call sites keep
     working. `active=true` → state='hover' (unless `state` is set). */
  active = false,

  onClick,
  className = '',
  /* `as='button'` + `role='menuitem'` for menu rows; default div + role=button when onClick */
  as = 'div',
  role,
  style: styleProp = {},
}) => {
  const [hover, setHover] = useState(false);

  /* Resolve the effective state. Explicit `state` wins; otherwise fall
     back to hover semantics driven by the legacy `active` flag and the
     internal hover-tracking. Selected variants must be opt-in via
     `state` — there's no boolean shortcut because the four-way matrix
     can't fit one. */
  const effectiveState =
    state
    ?? (hover || active ? 'hover' : 'default');
  const tone = STATE_TONES[effectiveState] || STATE_TONES.default;
  const wght = iconWeight === 'darker' ? 700 : 400;

  /* Resolve show* flags — legacy `showChevron` wins when set, otherwise
     fall back to the canonical `showChevronRight` (defaults true). */
  const chevronVisible = showChevron ?? showChevronRight ?? true;

  const boxStyle = {
    minHeight: 'var(--dim-size-1000, 48px)',
    gap: 'var(--dim-space-200)',
    paddingLeft:   'var(--dim-space-300)',
    paddingRight:  'var(--dim-space-300)',
    paddingTop:    'var(--dim-space-200)',
    paddingBottom: 'var(--dim-space-200)',
    background: tone.bg,
    color:      tone.text,
    borderRadius: 'var(--dim-radius-100, 4px)',
    cursor: onClick ? 'pointer' : 'default',
    fontFamily: 'var(--type-family-body)',
    fontSize:   'var(--type-size-sm)',
    fontWeight: 'var(--type-weight-regular, 400)',
    lineHeight: 1.5,
    transition: 'background-color 150ms ease, color 150ms ease',
    ...styleProp,
  };

  const handlers = {
    onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => { setHover(false); },
    onFocus: () => setHover(true),
    onBlur: () => setHover(false),
  };

  /* overflow-x only: row must not clip Thai diacritics on trailing pills
     (ColorfulBadge); label column still truncates via its own `truncate`. */
  const rowClass = `flex items-center w-full min-w-0 text-left overflow-x-hidden overflow-y-visible ${className}`;

  const inner = (
    <>
      {showLeadingIcon && leadingIcon && (
        <Sym name={leadingIcon} size={16} color='currentColor' weight={wght} />
      )}
      {showLeadingBadge && leadingBadge && (
        <ColorfulBadge
          style={leadingBadge.tone}
          size='small'
          fill='default'
          hierarchy='secondary'
        >
          {leadingBadge.label}
        </ColorfulBadge>
      )}
      {showLeadingBadge2 && leadingBadge2 && (
        <ColorfulBadge
          style={leadingBadge2.tone}
          size='small'
          fill='default'
          hierarchy='secondary'
        >
          {leadingBadge2.label}
        </ColorfulBadge>
      )}
      {/* Figma 382:14361 `showLeadingBadge3` — pill in a 64 px fixed
          column so codes of varying length keep label text aligned
          across rows. Reuses the bold-fill primary hierarchy that
          Figma 3401:4293 publishes. */}
      {showLeadingBadge3 && leadingBadge3 && (
        <div className='shrink-0 flex items-center' style={{ width: 64 }}>
          <ColorfulBadge
            style={leadingBadge3.tone}
            size='small'
            fill='default'
            hierarchy='primary'
          >
            {leadingBadge3.label}
          </ColorfulBadge>
        </div>
      )}
      {circleIcon && <CircleIconTile name={circleIcon} />}

      {/* Label + optional subtext stack. When `showSubtext` is true the
          column lays out label above subtext; otherwise the row collapses
          to a single inline label. */}
      <span
        className='flex-1 min-w-0 text-left flex flex-col'
        style={{ gap: 'var(--dim-space-0)' }}
      >
        <span className='truncate' style={{ color: 'inherit' }}>{label}</span>
        {showSubtext && subtext && (
          <span
            className='truncate'
            style={{
              color: tone.subtext,
              fontSize: 'var(--type-size-xs, 12px)',
              lineHeight: 1.5,
              transition: 'color 150ms ease',
            }}
          >
            {subtext}
          </span>
        )}
      </span>

      {showBadge && badge && (
        <Badge style={BADGE_TONE_TO_STYLE[badge.tone] || 'neutral'} size='small'>
          {badge.label}
        </Badge>
      )}
      {showSuccess && <SuccessTick />}
      {showSwitch && switchProps && <Switch {...switchProps} />}
      {showCheck && <Sym name='check' size={16} color='currentColor' weight={wght} />}
      {chevronVisible && <Sym name='chevron_right' size={16} color='currentColor' weight={wght} />}
      {trailing}
    </>
  );

  if (as === 'button') {
    return (
      <button
        type='button'
        {...(role != null ? { role } : {})}
        {...handlers}
        className={rowClass}
        style={{
          ...boxStyle,
          border: 'none',
          width: '100%',
        }}
      >
        {inner}
      </button>
    );
  }

  return (
    <div
      role={role ?? (onClick ? 'button' : undefined)}
      tabIndex={onClick ? 0 : undefined}
      {...handlers}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); }
      }}
      className={rowClass}
      style={boxStyle}
    >
      {inner}
    </div>
  );
};

export default ActionList;
