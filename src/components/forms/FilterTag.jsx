import React, { useRef, useState } from 'react';
import Popover from '@/components/popup/Popover';
import ActionList from '@/components/list/ActionList';
import { Icon } from '@/components/icons/Icon';

/* MIH FilterTag — Figma "Tag" (node 2056:4263). Pill-style filter chip.

   Property panel (per Figma):
     • Style:           Neutral / Brand
     • Size:            Small (32) / Medium (36) / Large (40)
     • State:           Default / Hover / Selected / Selected-Hover / Open
     • Show Leading icon (bool)
     • Show Tailing icon (bool — the chevron-down)
     • Show Title       (bool — the gray prefix text before `value`)

   Tokens (all alias from design.md — no hex literals):
     • Brand chip   → --surface-brandtag-*, --border-brandtag-*,
                       --text-brandtag-*, --icon-brandtag-*
                       brand-aware (retints via <html data-brand>).
     • Neutral chip → --surface-neutraltag-*, --border-neutraltag-*,
                       --text-neutraltag-*, --icon-neutraltag-*
                       always neutral grays — does NOT retint per brand. */

const SIZES = {
  /* h-32 / 36 / 40 per Figma dimension/size/600 / 700 / 800. */
  sm:     { height: 'var(--dim-size-600)', iconSize: 16 },
  small:  { height: 'var(--dim-size-600)', iconSize: 16 },
  md:     { height: 'var(--dim-size-700)', iconSize: 16 },
  medium: { height: 'var(--dim-size-700)', iconSize: 16 },
  lg:     { height: 'var(--dim-size-800)', iconSize: 16 },
  large:  { height: 'var(--dim-size-800)', iconSize: 16 },
};

const Sym = ({ name, size = 16, color }) => (
  <span
    className='material-symbols-outlined transition-colors duration-200 ease-out'
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontSize: size,
      color,
      lineHeight: 1,
      display: 'inline-flex',
    }}
    aria-hidden
  >
    {name}
  </span>
);

/* Resolve a leadingIcon prop into a rendered node. Accepts:
   • string  — Material Symbols name → rendered via Sym
   • element — cloned with size+style.color
   • function — render prop receiving { size, color }                    */
const renderLeadingIcon = (leadingIcon, color, size = 16) => {
  if (leadingIcon == null || leadingIcon === false) return null;
  if (typeof leadingIcon === 'string') {
    if (leadingIcon === 'language') {
      return <Icon name='language' size={size} className='' style={{ color }} />;
    }
    return <Sym name={leadingIcon} size={size} color={color} />;
  }
  if (typeof leadingIcon === 'function') {
    return leadingIcon({ size, color });
  }
  return React.cloneElement(leadingIcon, {
    size,
    style: { color, ...(leadingIcon.props?.style || {}) },
  });
};

/* Resolve the {bg, border, text, icon} bundle for a (variant, state)
   tuple. State precedence: Selected-Hover > Selected/Open > Hover > Default. */
const resolveTag = ({ variant, state }) => {
  const v = variant === 'neutral' ? 'neutraltag' : 'brandtag';
  return {
    bg:        `var(--surface-${v}-${state})`,
    border:    `var(--border-${v}-${state})`,
    text:      `var(--text-${v}-${state})`,
    icon:      `var(--icon-${v}-${state})`,
    /* Title (prefix) — gray secondary text, shared across variants. */
    title:     'var(--text-brandtag-title)',
    /* Tailing chevron — neutral/300 regardless of variant per Figma. */
    tailing:   `var(--icon-${v}-tailing)`,
  };
};

const FilterTag = React.forwardRef(function FilterTag(
  {
    /* Figma Property panel axes */
    variant = 'brand',           /* 'brand' | 'neutral' */
    size = 'lg',                 /* 'sm' | 'md' | 'lg' */
    state,                       /* override: 'default' | 'hover' | 'selected' | 'selected-hover' | 'open' */
    showLeadingIcon = true,
    showTailingIcon,             /* defaults to true when dropdown=true */
    showTitle = true,            /* gray prefix before value */
    /* Content */
    prefix,
    value,
    leadingIcon,
    /* Legacy state props (kept for back-compat — auto-resolve State axis) */
    selected,
    open,
    dropdown,
    /* Interaction */
    onClick,
    disabled = false,
    className = '',
    style = {},
  },
  ref,
) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  /* Auto-resolve from legacy props if `state` not provided. */
  const autoState = (() => {
    if (disabled) return 'default';
    const isSelected = selected || open;
    if (isSelected && hovered) return 'selected-hover';
    if (open)                  return 'open';
    if (isSelected)            return 'selected';
    if (hovered)               return 'hover';
    return 'default';
  })();
  /* Map 'open' to the same visual treatment as 'selected' (no separate
     Open tokens defined in Figma — the popover below is what changes). */
  const effState = (state || autoState) === 'open' ? 'selected' : (state || autoState);
  const s = resolveTag({ variant, state: effState });

  const dim = SIZES[size] || SIZES.lg;
  /* Chevron is shown when dropdown=true (legacy) OR showTailingIcon=true. */
  const renderTailing = showTailingIcon ?? !!dropdown;

  return (
    <button
      ref={ref}
      type='button'
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => { if (!disabled) setHovered(true); }}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => { if (!disabled) setPressed(true); }}
      onMouseUp={() => setPressed(false)}
      disabled={disabled}
      aria-pressed={selected || effState === 'selected' || effState === 'selected-hover'}
      aria-expanded={disabled ? false : open}
      aria-disabled={disabled}
      className={`inline-flex items-center justify-center shrink-0 transition-all duration-200 ease-out ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      style={{
        gap: 'var(--dim-space-150)',
        height: dim.height,
        minWidth: 40,
        paddingLeft:  'var(--dim-space-300)',
        paddingRight: 'var(--dim-space-300)',
        paddingTop:    'var(--dim-space-100)',
        paddingBottom: 'var(--dim-space-100)',
        borderRadius: 'var(--dim-radius-full)',
        background: s.bg,
        border: `var(--dim-stroke-100) solid ${s.border}`,
        fontFamily: 'var(--type-family-body)',
        lineHeight: 1.5,
        transform: disabled ? 'translateY(0)' : (pressed ? 'translateY(1px)' : (hovered ? 'translateY(-1px)' : 'translateY(0)')),
        opacity: disabled ? 0.5 : 1,
        ...style,
        /* Pill width follows content unless callers set `style.width` (e.g. date chip). */
        width: style?.width != null ? style.width : 'fit-content',
      }}
    >
      {showLeadingIcon && renderLeadingIcon(leadingIcon, s.icon, dim.iconSize)}
      {showTitle && prefix && (
        <span
          className='whitespace-nowrap'
          style={{
            color: s.title,
            fontSize: 'var(--type-size-xs)',
            fontWeight: 'var(--type-weight-medium)',
          }}
        >
          {prefix}
        </span>
      )}
      {value != null && (
        <span
          className='whitespace-nowrap transition-colors duration-200 ease-out'
          style={{
            color: s.text,
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-medium)',
          }}
        >
          {value}
        </span>
      )}
      {renderTailing && (
        <span
          className='inline-flex items-center justify-center transition-transform duration-200 ease-out'
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <Sym name='expand_more' size={dim.iconSize} color={s.tailing} />
        </span>
      )}
    </button>
  );
});

/* Horizontal rule — border/neutral/tertiary (#E2E4E6). Full width, 1px tall;
   flex so it lays out predictably in filter toolbars. */
export const TagDivider = ({ className = '', style = {} }) => (
  <span
    aria-hidden
    className={`flex h-px w-full shrink-0 ${className}`}
    style={{
      background: 'var(--border-neutral-tertiary)',
      ...style,
    }}
  />
);

/* FilterDropdown — wraps FilterTag with a popover menu of options.
   Uses design.md §6.14 dropdown tokens (surface/dropdown, border/dropdown,
   surface/list, text/list, etc.) so the popover matches global DS styling.
   Reuses the `mih-search-popover` keyframe for entrance animation. */
export const FilterDropdown = ({
  prefix,
  leadingIcon,
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  className = '',
  variant = 'brand',
  size = 'lg',
  /* Stack above modals / MarkNoteEditor when nested in portalled overlays. */
  menuZIndex = 'var(--sm-z-popover-nested, calc(1300 + 2))',
  /* Forwarded to the underlying FilterTag — lets callers override
     height, max-width, etc. (e.g. VoiceTextarea uses height:36 per
     Figma 3280:3807 vs FilterTag's default 40). */
  tagStyle,
}) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const selected = options.find((o) => o.value === value);
  const label = selected?.label || placeholder || options[0]?.label;
  const isActive = selected && options.length > 0 && value !== options[0].value;

  return (
    <div className={`relative shrink-0 ${className}`}>
      <FilterTag
        ref={triggerRef}
        prefix={prefix}
        leadingIcon={leadingIcon}
        value={label}
        variant={variant}
        size={size}
        dropdown
        selected={isActive}
        open={open}
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen((o) => !o); }}
        style={tagStyle}
      />
      <Popover
        open={open && !disabled}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        className='mih-search-popover'
        style={{
          minWidth: 200,
          zIndex: menuZIndex,
          background: 'var(--surface-dropdown-default)',
          border: 'var(--dim-stroke-100) solid var(--border-dropdown-default)',
          borderRadius: 'var(--dim-radius-500)',
          boxShadow: 'var(--shadow-dropdown)',
          padding: 'var(--dim-space-100)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Cap height so very long lists (e.g. 69 ศูนย์บริการสาธารณสุข กทม.
            in <HeaderClinicContext />) scroll inside the popover instead of
            running off the bottom of the viewport. Short lists fit naturally
            and never trigger the scrollbar. */}
        <div
          role='listbox'
          style={{
            maxHeight: 'min(60vh, 384px)',
            overflowY: 'auto',
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            /* Optional ColorfulBadge on the row — same contract as Select's
               `colorfulBadgeStyle` (severity/ESI severity pills). When set,
               the badge carries the option label; ActionList keeps a
               non-empty label slot so the trailing check still aligns. */
            const colorfulTone = opt.colorfulBadgeStyle || opt.leadingBadge?.tone;
            const colorfulLabel = opt.leadingBadge?.label || (opt.colorfulBadgeStyle ? opt.label : null);
            const leadingBadge = colorfulTone && colorfulLabel
              ? { tone: colorfulTone, label: colorfulLabel }
              : opt.leadingBadge;
            return (
              <ActionList
                key={opt.value}
                label={opt.colorfulBadgeStyle ? '\u00A0' : opt.label}
                image={opt.image}
                imageVariant={opt.imageVariant || 'avatar'}
                leadingIcon={opt.leadingIcon}
                leadingBadge={leadingBadge}
                showLeadingBadge={!!leadingBadge}
                showLeadingIcon={!!(opt.image || opt.leadingIcon)}
                badge={opt.badge}
                showBadge={!!opt.badge}
                active={isSelected}
                showCheck={isSelected}
                /* Filter options are leaf actions (no submenu) — the
                   chevron_right that `ActionList` ships by default would
                   imply drill-down navigation, so hide it for this
                   popover. Central ActionList defaults stay untouched. */
                showChevronRight={false}
                onClick={() => { onChange(opt.value); setOpen(false); }}
              />
            );
          })}
        </div>
      </Popover>
    </div>
  );
};

export default FilterTag;
