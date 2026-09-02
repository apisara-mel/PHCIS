import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Popover from '@/components/popup/Popover';
import BrandButton from '@/components/button/BrandButton';
import Badge from '@/components/badge/Badge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Icon from '@/components/icons/Icon';
import CheckboxBox from '@/components/checkbox/CheckboxBox';
import { Sym, FieldShell, useFieldId } from '@/components/forms/_inputBox';

/* Chrome-strip stylesheet for the typeable trigger input — CLAUDE.md
   rule: when a wrapper owns its own border / focus / shadow, the inner
   native <input> must NOT leak browser-default outlines or appearance
   lines. Same idempotent pattern AISearch uses; HMR replaces the
   <style> body on edit without leaving stale rules behind. */
if (typeof document !== 'undefined') {
  const styleId = 'mih-select-input-style';
  const css = `
.mih-select-input,
.mih-select-input:focus,
.mih-select-input:focus-visible {
  border: 0 !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
.mih-select-input::placeholder { color: var(--text-input-default, #ADB2B7); opacity: 1; }
`;
  let el = document.getElementById(styleId);
  if (!el) {
    el = document.createElement('style');
    el.id = styleId;
    document.head.appendChild(el);
  }
  if (el.textContent !== css) el.textContent = css;
}

/* MIH Select — Figma "Default Select" (node 268:55). The single canonical
   select component for the whole app — `SelectInput` from Fields.jsx has
   been removed, every caller (MR Steps, Treatment Steps, Component Library)
   now uses this one implementation.

   Built to the Figma Property panel:

     Properties:
       • Size:               Small / Medium / Large
       • State:              Default / Hover / Open / Filled / Error / Disabled
       • Show Field name     (label row visibility)
       • Show *              (required asterisk)
       • Show Helper Text
       • Show leading icon
       • Show Label          (the "Label" text inside Field name row)
       • Show Badge          (optional StatusBadge slot inside the trigger)

   Every visual aliases design.md tokens (no hex literals). Brand-aware
   tokens (--border-input-hover, --primaryBorder-600, --icon-input-hover)
   retint via <html data-brand>. Dropdown rows may render ColorfulBadge +
   success check when options carry `colorfulBadgeStyle` (see BadgeSelectForm
   · severity / Figma 334:56417).                                          */

const SIZES = {
  /* Per Figma 268:55 — Small uses 12px icons + 12px Medium text;
     Medium uses 16px icons + 14px Regular text;
     Large uses 20px icons + 14px Regular text and larger horizontal padding. */
  sm:     { height: 'var(--dim-size-600)', paddingX: 'var(--dim-space-300)', gap: 'var(--dim-space-150)', fontSize: 'var(--type-size-xs)',   fontWeight: 'var(--type-weight-medium)',  iconSize: 'var(--dim-size-200, 12px)' },
  small:  { height: 'var(--dim-size-600)', paddingX: 'var(--dim-space-300)', gap: 'var(--dim-space-150)', fontSize: 'var(--type-size-xs)',   fontWeight: 'var(--type-weight-medium)',  iconSize: 'var(--dim-size-200, 12px)' },
  md:     { height: 'var(--dim-size-700)', paddingX: 'var(--dim-space-300)', gap: 'var(--dim-space-150)', fontSize: 'var(--type-size-sm)',   fontWeight: 'var(--type-weight-regular)', iconSize: 'var(--dim-size-300, 16px)' },
  medium: { height: 'var(--dim-size-700)', paddingX: 'var(--dim-space-300)', gap: 'var(--dim-space-150)', fontSize: 'var(--type-size-sm)',   fontWeight: 'var(--type-weight-regular)', iconSize: 'var(--dim-size-300, 16px)' },
  lg:     { height: 'var(--dim-size-800)', paddingX: 'var(--dim-space-400)', gap: 'var(--dim-space-200)', fontSize: 'var(--type-size-sm)',   fontWeight: 'var(--type-weight-regular)', iconSize: 'var(--dim-size-400)' },
  large:  { height: 'var(--dim-size-800)', paddingX: 'var(--dim-space-400)', gap: 'var(--dim-space-200)', fontSize: 'var(--type-size-sm)',   fontWeight: 'var(--type-weight-regular)', iconSize: 'var(--dim-size-400)' },
};

/* Chevron is 16 on Medium/Large, 12 on Small. */
const chevronSize = (size) => (size === 'sm' || size === 'small'
  ? 'var(--dim-size-200, 12px)'
  : 'var(--dim-size-300, 16px)');

/* Resolve the trigger's state-driven visuals. `state` overrides the
   auto-detection (hover/focus/value/error/disabled). */
const resolveTrigger = ({ state, hasValue, error, disabled }) => {
  const effective = state || (
    disabled ? 'disabled' :
    error    ? 'error'    :
    hasValue ? 'filled'   :
    'default'
  );
  switch (effective) {
    case 'hover':
      return {
        bg:        'var(--surface-input-default)',
        borderW:   'var(--dim-stroke-200)',
        borderC:   'var(--border-input-hover)',
        ring:      '0 0 0 var(--dim-stroke-400, 4px) var(--primaryBorder-600)',
        iconColor: 'var(--icon-input-hover)',
        textColor: 'var(--text-input-hover)',
      };
    case 'open':
      return {
        bg:        'var(--surface-input-default)',
        borderW:   'var(--dim-stroke-200)',
        borderC:   'var(--border-input-typing)',
        ring:      '0 0 0 var(--dim-stroke-400, 4px) var(--primaryBorder-600)',
        iconColor: 'var(--icon-input-typing)',
        textColor: 'var(--text-input-typing)',
      };
    case 'filled':
      return {
        bg:        'var(--surface-input-default)',
        borderW:   'var(--dim-stroke-100)',
        borderC:   'var(--border-input-filled)',
        ring:      'none',
        iconColor: 'var(--icon-input-filled)',
        textColor: 'var(--text-input-filled)',
      };
    case 'error':
      return {
        bg:        'var(--surface-input-default)',
        borderW:   'var(--dim-stroke-200)',
        borderC:   'var(--border-input-error)',
        ring:      'none',
        iconColor: 'var(--icon-input-error)',
        textColor: hasValue ? 'var(--text-input-filled)' : 'var(--text-input-error)',
      };
    case 'disabled':
      return {
        bg:        'var(--surface-disabled-tertiary)',
        borderW:   'var(--dim-stroke-100)',
        borderC:   'var(--border-input-disabled)',
        ring:      'none',
        iconColor: 'var(--icon-input-disabled)',
        /* เหมือน _inputBox: disabled ที่มีค่าแล้วใช้สี filled ให้อ่านออก
           (มติผู้ใช้ 27 ส.ค. 69 · design.md §6.4.2) */
        textColor: hasValue ? 'var(--text-input-filled)' : 'var(--text-input-disabled)',
      };
    default:
      return {
        bg:        'var(--surface-input-default)',
        borderW:   'var(--dim-stroke-100)',
        borderC:   'var(--border-input-default)',
        ring:      'none',
        iconColor: 'var(--icon-input-default)',
        textColor: hasValue ? 'var(--text-input-filled)' : 'var(--text-input-default)',
      };
  }
};

/* Label cell — horizontal ellipsis without clipping Thai below-line marks
   (sara u / yo ying / etc.). `truncate` sets overflow:hidden which crops
   descenders when line-height is tight. */
const dropdownRowLabelStyle = {
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  lineHeight: 1.75,
  paddingTop: 2,
  paddingBottom: 2,
};

/* One row in the dropdown — Figma 328:3863; severity pills + check: 334:56417.
   `badge` is the new prefix variant (Figma 4025:14538 advance-order
   picker) — accepts `{ style, label }` and renders a small
   ColorfulBadge BEFORE the option label so the row reads as
   "[category-pill] · [item label]". Separate from `colorfulBadgeStyle`
   which keeps the older "entire-label-as-badge" treatment for severity
   pills etc. */
const DropdownRow = ({ label, subtext, icon, image, colorfulBadgeStyle, badge, selected, onClick }) => {
  const [hover, setHover] = useState(false);
  const tinted = hover || selected;
  const hasBadge = !!colorfulBadgeStyle;
  const hasPrefixBadge = !!(badge && badge.style);
  return (
    <button
      type='button'
      role='option'
      aria-selected={selected}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className='inline-flex items-center w-full text-left'
      style={{
        gap: 'var(--dim-space-200)',
        minHeight: 48,
        paddingLeft:   'var(--dim-space-300)',
        paddingRight:  'var(--dim-space-300)',
        paddingTop:    'var(--dim-space-200)',
        paddingBottom: 'var(--dim-space-200)',
        borderRadius:  'var(--dim-radius-150, 6px)',
        background: tinted
          ? 'var(--surface-list-hover, var(--surface-brandPrimary-quaternary))'
          : 'var(--surface-list-default)',
        color: hasBadge
          ? 'var(--text-list-default)'
          : tinted
            ? 'var(--text-list-hover, var(--text-brandPrimary-default))'
            : 'var(--text-list-default)',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-regular)',
        lineHeight: 1.75,
        transition: 'background 120ms ease, color 120ms ease',
      }}
    >
      {hasBadge ? (
        <>
          <ColorfulBadge style={colorfulBadgeStyle} size='small' hierarchy='secondary'>
            {label}
          </ColorfulBadge>
          <span className='flex-1 min-w-0' aria-hidden />
          {selected && (
            <span
              className='shrink-0 inline-flex items-center justify-center'
              style={{ color: 'var(--icon-positive-success)' }}
              aria-hidden
            >
              <Icon name='check' size={16} />
            </span>
          )}
        </>
      ) : hasPrefixBadge ? (
        /* Prefix-badge + optional two-line label/subtext — same shape as
           PrimarySearch SuggestionRow (Figma 3345:2981): HN indigo pill
           + name + "เลขบัตร …" for patient pickers. */
        <>
          <ColorfulBadge style={badge.style} size='small' hierarchy='secondary' showDot={!badge.label} showText={!!badge.label} width='hug'>
            {badge.label || undefined}
          </ColorfulBadge>
          {subtext ? (
            <span
              className='flex-1 min-w-0'
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
            >
              <span style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm, 14px)',
                fontWeight: 'var(--type-weight-regular, 400)',
                lineHeight: 1.5,
                color: 'inherit',
                width: '100%',
              }}
              >
                {label}
              </span>
              <span style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs, 12px)',
                fontWeight: 'var(--type-weight-regular, 400)',
                lineHeight: 1.5,
                color: tinted
                  ? 'var(--text-list-subtext-hover, #54CF97)'
                  : 'var(--text-list-subtext, #858C92)',
                width: '100%',
              }}
              >
                {subtext}
              </span>
            </span>
          ) : (
            <span style={dropdownRowLabelStyle}>{label}</span>
          )}
          {selected && (
            <span
              className='shrink-0 inline-flex items-center justify-center'
              style={{ color: 'var(--icon-positive-success)' }}
              aria-hidden
            >
              <Icon name='check' size={16} />
            </span>
          )}
        </>
      ) : (
        <>
          {image && (
            /* 32 px circular tile — same shape as MedImageTile in the
               Step-5 medication table so the option preview matches
               what the doctor will see once they pick the row. */
            <span
              className='shrink-0 inline-flex items-center justify-center overflow-hidden'
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--surface-card-100, #F4FBF8)',
              }}
              aria-hidden
            >
              <img
                src={image}
                alt=''
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </span>
          )}
          {icon && !image && (
            <Sym
              name={icon}
              size='var(--dim-size-300, 16px)'
              color='var(--icon-list-secondary-default, var(--text-content-tertiary))'
            />
          )}
          {subtext ? (
            /* Two-line option per Figma 29:4788 — label on top, gray subtext
               below. Subtext color tints brand-green when the row is the
               selected/hovered state (text-list-subtext-hover). */
            <span
              className='flex-1 min-w-0'
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
            >
              <span style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm, 14px)',
                fontWeight: 'var(--type-weight-regular, 400)',
                lineHeight: 1.5,
                color: 'inherit',
                width: '100%',
              }}>
                {label}
              </span>
              <span style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs, 12px)',
                fontWeight: 'var(--type-weight-regular, 400)',
                lineHeight: 1.5,
                color: tinted
                  ? 'var(--text-list-subtext-hover, #54CF97)'
                  : 'var(--text-list-subtext, #858C92)',
                width: '100%',
              }}>
                {subtext}
              </span>
            </span>
          ) : (
            <span style={dropdownRowLabelStyle}>{label}</span>
          )}
          {/* Selected-state tick — mirrors the badge branch's check icon
              so plain (image/icon/text-only) options also show a visual
              confirmation in the listbox after the doctor picks one
              (e.g. ชื่อยา in AddMedicationPopup). Without this the
              dropdown only highlighted the row via background tint,
              which the user couldn't always see when the popover
              closed-and-reopened. */}
          {selected && (
            <span
              className='shrink-0 inline-flex items-center justify-center'
              style={{ color: 'var(--icon-positive-success)' }}
              aria-hidden
            >
              <Icon name='check' size={16} />
            </span>
          )}
        </>
      )}
    </button>
  );
};

/* Multi-select dropdown row — Figma "List" 271:12592. Flat (no border, no
   shadow): label on the left, checkbox on the right. Hover tints the row with
   the brand list-hover surface (#F4FBF8); disabled fades to 50%. The checkbox
   glyph (shared CheckboxBox) reflects `selected`. */
const CheckboxListRow = ({ label, subtext, selected, disabled, onClick }) => {
  const [hover, setHover] = useState(false);
  const active = hover && !disabled;
  return (
    <button
      type='button'
      role='option'
      aria-selected={selected}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className='w-full text-left'
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--dim-space-200)',
        minHeight: 48,
        padding: 'var(--dim-space-200) var(--dim-space-300)',
        background: active ? 'var(--surface-list-hover)' : 'var(--surface-list-default, #FFFFFF)',
        borderRadius: 'var(--dim-radius-400)',
        border: 'none',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        outline: 'none',
        transition: 'background-color 120ms ease',
      }}
    >
      <span style={{ flex: '1 0 0', minWidth: 0 }}>
        <span style={{ display: 'block', color: 'var(--text-list-default, #4D5358)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', lineHeight: 1.5 }}>
          {label}
        </span>
        {subtext && (
          <span style={{ display: 'block', color: 'var(--text-list-subtext, #858C92)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', lineHeight: 1.5 }}>
            {subtext}
          </span>
        )}
      </span>
      <CheckboxBox checked={selected} hover={active} disabled={disabled} />
    </button>
  );
};

const Select = React.forwardRef(function Select(
  {
    /* No literal default label — Figma 155:20747 expects the caller to
       supply the field name (e.g. "แพทย์ผู้สั่ง"). Defaulting to a
       placeholder string like "Label" caused a double-label bug whenever
       Select was nested in a <Field> wrapper (Step 4 doctor select,
       Registration form selects, etc.): both the outer Field label AND
       the FieldShell label rendered, stacking "Label" between the real
       label and the trigger. Leaving this undefined makes FieldShell skip
       the inner label row when it isn't explicitly set. */
    label,
    required = false,
    helperText,
    error,
    placeholder = 'Select option',
    /* คำนำหน้าค่าที่เลือกในช่อง trigger — สีจาง เช่น prefix='Template:'
       ให้ขึ้นเป็น "Template: แดชบอร์ดมาตรฐาน" (ไม่โชว์ตอนยังไม่ได้เลือก) */
    prefix,
    value,
    defaultValue,
    onChange,
    /* Fired with the trigger DOM node each time the dropdown opens. Lets a
       caller scroll the field into view so a downward-opening popover that
       would otherwise fall behind a sticky footer becomes fully visible. */
    onOpen,
    /* When true the field selects MANY options: `value` is an array, rows
       toggle in/out, the dropdown stays open after each pick, and the
       trigger shows the joined labels. Default false keeps the original
       single-select behaviour so every existing caller is unaffected. */
    multiple = false,
    /* When set (multiple only), a "select all" row with this label sits at the
       top of the dropdown. Clicking it selects every option; clicking again
       when all are already selected clears them. */
    selectAllLabel,
    multipleConfirmLabel,
    onConfirmSelection,
    options = [],
    leadingIcon,
    badge,
    /* Show/hide flags — match Figma Property panel exactly. */
    showFieldName = true,
    showLabel = true,
    showRequired = true,
    showHelperText = true,
    showLeadingIcon = true,
    showBadge = false,
    size = 'lg',
    state,
    disabled = false,
    /* When false, the trigger renders a static <span> (not a typeable
       <input>), so the field behaves as a pure dropdown — click to
       open, click a row to commit. No in-trigger filter. Used by
       Selects whose option lists are short or whose UX should not
       invite free-text entry (e.g. AddMedicationPopup's ชื่อยา). */
    searchable = true,
    /* Optional fixed dropdown width (px or any CSS length). When set, the
       popover ignores the measured trigger width and renders at this size
       — used by the Schedule editor's "ตัวเลือกด่วน" field where the
       trigger is only 260px wide but the dropdown rows carry long subtext
       (Figma 29:4788 = 640px). When unset (default) the popover continues
       to match the trigger width so existing callers are unaffected. */
    dropdownWidth,
    id: idProp,
    name,
    className = '',
    style = {},
    ...rest
  },
  ref,
) {
  const autoId = useFieldId('select');
  const id = idProp || autoId;
  const [internal, setInternal] = useState(defaultValue ?? (multiple ? [] : ''));
  const isControlled = value !== undefined;
  const v = isControlled ? value : internal;
  /* Normalised array view of the value when multiple — tolerant of a stray
     scalar/empty so the field never crashes on a mis-typed initial value. */
  const arr = multiple ? (Array.isArray(v) ? v : (v == null || v === '' ? [] : [v])) : null;
  const hasValue = multiple ? arr.length > 0 : (v != null && v !== '');
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);
  /* The trigger doubles as a combobox input — typing into it filters
     `options` without committing. Selection still has to come from
     clicking a dropdown row (Enter / keyboard nav intentionally do not
     auto-commit so a stray keystroke can't change the value). */
  const [searchQuery, setSearchQuery] = useState('');
  const triggerRef = useRef(null);
  const inputRef = useRef(null);
  /* Cap the dropdown's width to the trigger's measured width so the
     popover can never extend past the field — important when Select
     lives inside a Popup (long option labels would otherwise push the
     dropdown wider than the popup itself). Re-measure whenever the
     popover opens. */
  const [triggerWidth, setTriggerWidth] = useState(null);
  useLayoutEffect(() => {
    if (!open) return undefined;
    const measure = () => {
      const node = triggerRef.current;
      if (!node) return;
      setTriggerWidth(node.offsetWidth);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    if (triggerRef.current) ro.observe(triggerRef.current);
    return () => ro.disconnect();
  }, [open]);
  const setTriggerRef = (node) => {
    triggerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  /* Notify the caller when the dropdown opens (e.g. to scroll the field
     into view). Fires on the open→true edge only. */
  useEffect(() => {
    if (open && onOpen) onOpen(triggerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const autoState = disabled ? 'disabled'
                  : error    ? 'error'
                  : open     ? 'open'
                  : hovered  ? 'hover'
                  : hasValue ? 'filled'
                  : 'default';
  const effState = state || autoState;
  const s = resolveTrigger({ state: effState, hasValue, error: !!error, disabled });
  const dim = SIZES[size] || SIZES.lg;

  const selected = hasValue ? options.find((o) => (o.value ?? o) === v) : null;
  /* Sentinel option (`value: ''`) carries the placeholder copy in many
     forms (e.g. Add Center Step 2 — Figma 3:9187). When the field is
     empty, render that label in `--text-input-default`, not as filled
     value text. */
  const emptyOption = options.find((o) => {
    const ov = o?.value ?? o;
    return ov === '' || ov == null;
  });
  const emptyOptionLabel = emptyOption
    ? (emptyOption.label ?? (typeof emptyOption === 'string' ? emptyOption : ''))
    : '';
  /* `displayLabel` lets the trigger reflect ANY value the caller has
     set on the field, not just values that match an entry in
     `options`. Without this fallback, seeding a value that isn't in
     the catalog (e.g. FrequentOrdersCard chip names that aren't in
     AddMedicationPopup's MEDICATION_NAME_OPTIONS, free-text
     dictation, or custom entries) leaves the trigger blank even
     though the field actually holds the value — confusing the
     doctor who clicked a chip expecting to see its name prefilled.
     Order of precedence: matched option's `label` → primitive option
     string → raw `v` → empty (renders placeholder). */
  const displayLabel = (() => {
    if (multiple) {
      if (!arr.length) return '';
      return arr
        .map((vv) => {
          const o = options.find((op) => (op.value ?? op) === vv);
          return o ? (o.label ?? o) : String(vv);
        })
        .join(', ');
    }
    if (!hasValue) return '';
    if (selected) return selected.label ?? (typeof selected === 'string' ? selected : '');
    if (v != null && v !== '') return String(v);
    return '';
  })();
  const isPlaceholder = !hasValue;
  const triggerText = displayLabel || emptyOptionLabel || placeholder;

  const choose = (next) => {
    if (multiple) {
      const exists = arr.includes(next);
      const updated = exists ? arr.filter((x) => x !== next) : [...arr, next];
      if (!isControlled) setInternal(updated);
      onChange && onChange(updated);
      setSearchQuery('');
      /* Keep the dropdown open so several options can be toggled in a row. */
      return;
    }
    if (!isControlled) setInternal(next);
    onChange && onChange(next);
    setOpen(false);
  };

  /* "Select all" row (multi only) — operates on the ENABLED options only, so a
     disabled row (e.g. a กิจกรรมย่อย whose กิจกรรม isn't selected) is never
     force-selected. Toggles: select every enabled option, or clear them. */
  const selectableValues = options.filter((o) => !(o && o.disabled)).map((o) => o.value ?? o);
  const allSelected = multiple && selectableValues.length > 0 && selectableValues.every((vv) => arr.includes(vv));
  const toggleAll = () => {
    const next = allSelected
      ? arr.filter((x) => !selectableValues.includes(x))
      : Array.from(new Set([...arr, ...selectableValues]));
    if (!isControlled) setInternal(next);
    onChange && onChange(next);
  };

  /* Reset the search query whenever the popover closes so the next open
     starts with the full option list, not the prior filter. */
  useEffect(() => {
    if (!open) setSearchQuery('');
  }, [open]);

  /* Filtered option list — narrows whenever the trigger input has a
     non-whitespace query. Empty query returns the full options array
     untouched. Filtering is case-insensitive `includes` across both
     label and value so callers can search either. When `searchable`
     is false the trigger is a plain <span> and `searchQuery` can
     never be populated, so the filter short-circuits to the full
     options list. */
  const visibleOptions = (() => {
    if (!searchable) return options;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const lbl = (o.label ?? (typeof o === 'string' ? o : '')) + '';
      const val = (o.value ?? o) + '';
      const sub = (o.subtext ?? '') + '';
      const badgeLbl = (o.badge?.label ?? '') + '';
      const suffixLbl = (o.suffixBadge?.label ?? '') + '';
      const code = (o.code ?? '') + '';
      const name = (o.name ?? '') + '';
      const hay = `${lbl} ${val} ${sub} ${badgeLbl} ${suffixLbl} ${code} ${name}`.toLowerCase();
      return hay.includes(q);
    });
  })();

  /* Close on Escape. */
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <FieldShell
      label={showLabel ? label : undefined}
      required={showRequired && required}
      helperText={helperText}
      error={error}
      showLabel={showFieldName && showLabel}
      showHelperText={showHelperText}
      htmlFor={id}
      className={className}
      style={style}
    >
      <div style={{ position: 'relative', width: '100%' }}>
        {/* Trigger — wrapper div that doubles as a combobox (when
            `searchable`) or a plain dropdown button (when not). In the
            combobox form, the inner <input> shows the selected
            option's label when closed and switches to the live
            `searchQuery` when open. In the dropdown form, a static
            <span> renders the selected label or placeholder — typing
            is physically impossible. Click anywhere on the wrapper to
            toggle; selection still requires clicking a row in the
            dropdown — typing never commits. */}
        <div
          ref={setTriggerRef}
          role='combobox'
          aria-haspopup='listbox'
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-disabled={disabled || undefined}
          onMouseEnter={() => !disabled && setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={(e) => {
            if (disabled) return;
            /* Toggle on the chevron / wrapper, but DON'T close when the
               click target is the inner input itself — typing should
               keep the popover open. (When not searchable, inputRef is
               null so this branch is skipped.) */
            if (searchable && e.target === inputRef.current) {
              setOpen(true);
              return;
            }
            setOpen((o) => !o);
            if (searchable) inputRef.current?.focus();
          }}
          className='inline-flex items-center w-full text-left'
          style={{
            height: dim.height,
            gap: dim.gap,
            paddingLeft:   dim.paddingX,
            paddingRight:  dim.paddingX,
            paddingTop:    'var(--dim-space-200)',
            paddingBottom: 'var(--dim-space-200)',
            borderRadius:  'var(--dim-radius-200)',
            border:        `${s.borderW} solid ${s.borderC}`,
            background:    s.bg,
            boxShadow:     s.ring,
            color:         s.textColor,
            fontFamily:    'var(--type-family-body)',
            fontSize:      dim.fontSize,
            fontWeight:    dim.fontWeight,
            lineHeight:    1.5,
            cursor:        disabled ? 'not-allowed' : (searchable ? 'text' : 'pointer'),
            boxSizing:     'border-box',
            transition:    'border-color 160ms cubic-bezier(0.4,0,0.2,1), box-shadow 160ms cubic-bezier(0.4,0,0.2,1), background 160ms cubic-bezier(0.4,0,0.2,1)',
            ...rest.style,
          }}
        >
          {showLeadingIcon && leadingIcon && (
            <Sym name={leadingIcon} size={dim.iconSize} color={s.iconColor} />
          )}
          {/* Selected option image (e.g. ชื่อยา blister) — same 32px circle
              as DropdownRow; hide while searchable typing so the filter
              input stays uncluttered. */}
          {selected?.image && !(searchable && open) && (
            <span
              className='shrink-0 inline-flex items-center justify-center overflow-hidden'
              style={{
                width: 'var(--dim-size-600, 32px)',
                height: 'var(--dim-size-600, 32px)',
                borderRadius: '50%',
                background: 'var(--surface-card-100, #F4FBF8)',
              }}
              aria-hidden
            >
              <img
                src={selected.image}
                alt=''
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </span>
          )}
          {showBadge && (badge ?? <Badge size='small'>Neutral</Badge>)}
          {/* Selected-option prefix badge — Figma 4025:14538 shows the
              category pill (Lab / Imaging / Vital / Procedure / Med)
              inside the trigger alongside the item label. Hidden while
              the user is actively typing in the searchable variant so
              the filter input isn't cluttered. */}
          {selected?.badge?.style && selected?.badge?.label && !(searchable && open) && (
            <ColorfulBadge
              style={selected.badge.style}
              size='small'
              hierarchy='secondary'
              width='hug'
            >
              {selected.badge.label}
            </ColorfulBadge>
          )}
          {prefix && !isPlaceholder && (
            <span
              className='shrink-0'
              style={{
                color: 'var(--text-content-tertiary)',
                fontFamily: 'var(--type-family-body)',
                fontSize: dim.fontSize,
                fontWeight: dim.fontWeight,
                lineHeight: 1.5,
              }}
            >
              {prefix}
            </span>
          )}
          {searchable ? (
            <input
              ref={inputRef}
              id={id}
              name={name}
              type='text'
              autoComplete='off'
              disabled={disabled}
              aria-invalid={!!error || undefined}
              /* Value flips on open/close: typing the filter while open,
                 showing the selected option's label when closed. The
                 placeholder shows when no option is selected AND the
                 user hasn't typed anything. */
              value={open ? searchQuery : displayLabel}
              /* Placeholder while typing/searching: prefer the currently
                 selected option's label (so the doctor doesn't lose
                 context of what was already picked); fall back to the
                 caller's placeholder for the empty state. Uses
                 `displayLabel` so off-options values (chip seeds,
                 dictation, free-text) keep their context visible as
                 ghost text when the doctor opens the popover. */
              placeholder={
                open
                  ? (displayLabel || emptyOptionLabel || placeholder)
                  : (isPlaceholder ? triggerText : undefined)
              }
              onFocus={() => { if (!disabled) setOpen(true); }}
              onChange={(e) => {
                if (disabled) return;
                setOpen(true);
                setSearchQuery(e.target.value);
              }}
              /* `mih-select-input` triggers the module-load stylesheet
                 above that strips every browser-default chrome
                 (`outline` / `box-shadow` / `border` / `background` /
                 `appearance`) — the wrapper div owns those visuals so
                 the inner <input> must stay invisible chrome-wise. */
              className='mih-select-input flex-1 min-w-0 truncate'
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                padding: 0,
                color: open
                  ? 'var(--text-input-filled, #4D5358)'
                  : (isPlaceholder
                      ? 'var(--text-input-default, #ADB2B7)'
                      : 'var(--text-input-filled)'),
                fontFamily: 'var(--type-family-body)',
                fontSize:   dim.fontSize,
                fontWeight: dim.fontWeight,
                lineHeight: 1.5,
                cursor: disabled ? 'not-allowed' : 'text',
                width: '100%',
                minWidth: 0,
              }}
              {...rest}
            />
          ) : (
            <span
              id={id}
              aria-invalid={!!error || undefined}
              className='flex-1 min-w-0 truncate'
              style={{
                color: disabled || effState === 'disabled'
                  ? s.textColor
                  : (isPlaceholder
                      ? 'var(--text-input-default, #ADB2B7)'
                      : 'var(--text-input-filled)'),
                fontFamily: 'var(--type-family-body)',
                fontSize:   dim.fontSize,
                fontWeight: dim.fontWeight,
                lineHeight: 1.5,
              }}
            >
              {triggerText}
            </span>
          )}
          {selected?.suffixBadge?.style && selected?.suffixBadge?.label && !(searchable && open) && (
            <ColorfulBadge
              style={selected.suffixBadge.style}
              size='small'
              hierarchy='secondary'
              width='hug'
              className='shrink-0'
            >
              {selected.suffixBadge.label}
            </ColorfulBadge>
          )}
          <span
            className='inline-flex items-center justify-center shrink-0 transition-transform duration-200 ease-out'
            style={{
              width:  chevronSize(size),
              height: chevronSize(size),
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              color: s.iconColor,
            }}
            aria-hidden
          >
            <Sym name='expand_more' size={chevronSize(size)} color='currentColor' />
          </span>
        </div>

        <Popover
          open={open && !disabled}
          onClose={() => setOpen(false)}
          anchorRef={triggerRef}
          /* `mih-select-popover` lets ancestor click-outside handlers
             (e.g. Popup's overlay onMouseDown) distinguish clicks on
             this portaled dropdown from real outside-the-modal clicks.
             Without it, picking a Select option inside a Popup would
             close the parent modal because the dropdown lives outside
             the dialog rectangle. */
          className='mih-select-popover'
          style={{
            /* Match the trigger's measured width (and cap any
               option-driven intrinsic growth) so the dropdown never
               extends past the field's right edge — critical inside
               popups where the parent modal is the hard width
               boundary. Fallback `minWidth: 200` only kicks in before
               the first measurement.

               When `dropdownWidth` is supplied by the caller, it
               overrides the trigger-width clamp on all three axes —
               used by Selects whose option rows carry richer content
               (icon + label + subtext, Figma 29:4788) and need to
               break out of a narrow trigger. */
            width:    dropdownWidth ?? triggerWidth ?? undefined,
            maxWidth: dropdownWidth ?? triggerWidth ?? undefined,
            minWidth: dropdownWidth ?? triggerWidth ?? 200,
            /* Cap dropdown height — Figma "Select / Open" spec + Treatment
               Order popup constraint. Bounded by an absolute 480 px and
               by the viewport minus a 64 px breathing buffer (32 px top
               inset + 32 px bottom buffer), so the listbox never grows
               taller than the parent Popup (which is itself capped at
               `100vh - 48px`). Rows scroll inside via the listbox's
               own `overflowY: auto`. Without this the ชื่อยา dropdown's
               15+ options pushed the popover past the modal's bottom
               edge (~778 px > ~614 px modal height). */
            maxHeight: 'min(480px, calc(100vh - 64px))',
            background: 'var(--surface-dropdown-default)',
            border: 'var(--dim-stroke-100) solid var(--border-dropdown-default)',
            borderRadius: 'var(--dim-radius-500)',
            boxShadow: 'var(--shadow-dropdown)',
            padding: 'var(--dim-space-100)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--dim-space-0)',
            /* Hide the outer overflow so the listbox's scrollbar lives
               flush with the popover's rounded corners. */
            overflow: 'hidden',
            /* Sit above modals (--sm-z-modal 1400) so the popover still
               shows when the Select lives inside a Popup (e.g. the
               AddMedicationPopup's วิธีใช้ / หน่วย / ความถี่ / เวลาใช้ยา
               selects). Same token used by other portal'd menus opened
               from inside a modal. */
            zIndex: 'var(--sm-z-modal-popover, 1450)',
          }}
        >
          {/* Search input has moved into the trigger itself — typing
              there filters this listbox in place. Listbox is the
              scroll container — `flex: 1 1 auto` + `overflowY: auto`
              lets the rows scroll inside the height-capped popover. */}
          <div
            role='listbox'
            id={`${id}-listbox`}
            className='scrollbar-thin'
            style={{
              flex: '1 1 auto',
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              /* Checkbox-card rows (multi) need breathing room between cards. */
              ...(multiple ? { display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-100)' } : {}),
            }}
          >
            {multiple && selectAllLabel && options.length > 0 && !searchQuery.trim() && (
              <CheckboxListRow
                key='__select_all__'
                label={selectAllLabel}
                selected={allSelected}
                onClick={toggleAll}
              />
            )}
            {visibleOptions.length === 0 ? (
              <div
                style={{
                  padding: 'var(--dim-space-300, 12px)',
                  color: 'var(--text-content-tertiary, #ADB2B7)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm, 14px)',
                  textAlign: 'center',
                }}
              >
                ไม่พบรายการที่ค้นหา
              </div>
            ) : (
              visibleOptions.map((opt) => {
                const val = opt.value ?? opt;
                const lbl = opt.label ?? opt;
                const ic  = opt.icon;
                const img = opt.image;
                const isSel = multiple ? arr.includes(val) : val === v;
                return multiple ? (
                  <CheckboxListRow
                    key={val}
                    label={lbl}
                    subtext={opt.subtext}
                    selected={isSel}
                    disabled={opt.disabled}
                    onClick={() => choose(val)}
                  />
                ) : (
                  <DropdownRow
                    key={val}
                    label={lbl}
                    subtext={opt.subtext}
                    icon={ic}
                    image={img}
                    colorfulBadgeStyle={opt.colorfulBadgeStyle}
                    badge={opt.badge}
                    selected={isSel}
                    onClick={() => choose(val)}
                  />
                );
              })
            )}
          </div>
          {multiple && multipleConfirmLabel ? (
            <BrandButton
              type='button'
              disabled={!arr.length}
              onClick={() => { onConfirmSelection?.(arr); setOpen(false); }}
              variant='fill'
              size='sm'
              style={{
                margin: 'var(--dim-space-200)',
                marginLeft: 'auto',
              }}
            >{multipleConfirmLabel}</BrandButton>
          ) : null}
        </Popover>
      </div>
    </FieldShell>
  );
});

export default Select;
