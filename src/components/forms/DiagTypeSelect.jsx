import React, { useEffect, useRef, useState } from 'react';
import Popover from '@/components/popup/Popover';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { DIAGNOSIS_TYPE_OPTIONS, resolveDiagnosisType } from '@/data/treatmentVisits';

/* MIH DiagTypeSelect — Figma PHCIS | Medical-examination
   347:42762 (open dropdown) + 348:34475 (picked trigger).

   Domain-specific Select used inside the Re-Diagnosis popup so each
   selected past-visit row can be tagged with one of the seven backend
   `DIAGTYPE` rows (PRINCIPLE DX … MORPHOLOGY CODE). Built bespoke
   because the project's generic <Select> doesn't ship a render-option
   hook for two-line rows or a custom-badge trigger.

   Trigger:
     • No value  → "เลือก Diag Type" placeholder + chevron (matches
                   FieldShell-driven Select chrome from Figma 155:20747).
     • Has value → small ColorfulBadge with the picked Diag Type's
                   English label (palette per the type's `badgeStyle`)
                   + chevron. No additional placeholder text.

   Dropdown (Figma 347:42762):
     • One row per DIAGTYPE entry.
     • Leading circular numbered badge — primary-fill ColorfulBadge
       with the row's `code` ("1"…"7"). The fill colour matches the
       option's `badgeStyle` so the dropdown reads as the same colour
       coding the ICD table uses.
     • Two-line label — English `labelEn` on top (medium), Thai
       `labelTh` below (muted body text).

   API:
     • value      — option `value` key (e.g. "principle")
     • onChange   — fired with the selected value
     • options    — defaults to DIAGNOSIS_TYPE_OPTIONS
     • placeholder — defaults to "เลือก Diag Type"
     • label      — optional "Diag Type" caption above the trigger */

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

const DiagTypeSelect = ({
  value,
  onChange,
  options = DIAGNOSIS_TYPE_OPTIONS,
  placeholder = 'เลือก Diag Type',
  /** Text shown to the right of the picked badge — typically the
      diagnosis name of the row this Select belongs to (Figma 348:34476).
      Falls back to `placeholder` when the field is empty or no
      `pickedText` is supplied. */
  pickedText,
  label = 'Diag Type',
  disabled = false,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);

  /* Close on Escape — matches Select.jsx behaviour. */
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const picked = !!selected;

  const choose = (next) => {
    onChange?.(next);
    setOpen(false);
  };

  return (
    <div className={`flex flex-col w-full ${className}`} style={{ gap: 'var(--dim-space-150, 6px)' }}>
      {label && (
        <label
          style={{
            color: 'var(--text-content-secondary, #636B72)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            fontWeight: 'var(--type-weight-medium)',
            lineHeight: 1.5,
          }}
        >
          {label}
        </label>
      )}
      <div style={{ position: 'relative', width: '100%' }}>
        <button
          ref={triggerRef}
          type='button'
          role='combobox'
          aria-haspopup='listbox'
          aria-expanded={open}
          disabled={disabled}
          onClick={() => !disabled && setOpen((o) => !o)}
          /* Stop propagation so a click on the trigger doesn't bubble
             to any parent row toggle (e.g. ReDiagnosisPopup's row
             checkbox toggle). */
          onMouseDown={(e) => e.stopPropagation()}
          className='inline-flex items-center w-full text-left'
          style={{
            minHeight: 40,
            gap: 'var(--dim-space-200, 8px)',
            paddingLeft: 'var(--dim-space-300, 12px)',
            paddingRight: 'var(--dim-space-300, 12px)',
            paddingTop: 'var(--dim-space-200, 8px)',
            paddingBottom: 'var(--dim-space-200, 8px)',
            borderRadius: 'var(--dim-radius-200, 8px)',
            border: open
              ? 'var(--dim-stroke-100, 1px) solid var(--border-input-typing, #007549)'
              : 'var(--dim-stroke-100, 1px) solid var(--border-input-default, #C9CDD0)',
            background: 'var(--surface-input-default, #FFFFFF)',
            color: picked
              ? 'var(--text-input-filled, #4D5358)'
              : 'var(--text-input-placeholder, #ADB2B7)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            lineHeight: 1.5,
            cursor: disabled ? 'not-allowed' : 'pointer',
            boxSizing: 'border-box',
            transition: 'border-color 160ms ease',
          }}
        >
          {picked && (
            /* Picked badge — Figma 348:34476. Secondary ColorfulBadge:
               light `--surface-colorfulbadge-{style}` fill + saturated
               700-shade `--text-colorfulbadge-{style}` label. Matches
               the ICD table's `ประเภท` column treatment, so picking a
               type here previews exactly what the committed table row
               will look like. The placeholder text below stays visible
               next to the badge per Figma — acts as a hint that this
               field accepts Diag Type values. */
            <ColorfulBadge
              style={selected.badgeStyle}
              size='small'
              width='hug'
              hierarchy='secondary'
            >
              {selected.labelEn}
            </ColorfulBadge>
          )}
          <span
            className='flex-1 min-w-0 truncate'
            style={{
              /* Picked → disease name (Figma 348:34476 — caller passes
                 the row's diagnosis name via `pickedText`); unpicked →
                 placeholder "เลือก Diag Type". Either way the text sits
                 in `--text-input-placeholder` (muted grey) so the
                 ColorfulBadge stays the dominant signal. */
              color: 'var(--text-input-placeholder, #ADB2B7)',
            }}
          >
            {picked ? (pickedText ?? placeholder) : placeholder}
          </span>
          <span
            className='inline-flex items-center justify-center shrink-0 transition-transform duration-200 ease-out'
            style={{
              width: 16,
              height: 16,
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              color: 'var(--icon-input-default, #4D5358)',
            }}
          >
            <Sym name='expand_more' size={16} color='currentColor' />
          </span>
        </button>

        <Popover
          open={open && !disabled}
          onClose={() => setOpen(false)}
          anchorRef={triggerRef}
          /* `mih-diag-type-popover` is the escape-hatch class the
             parent Popup's outside-click handler looks for so clicks
             inside this portaled popover don't dismiss the host modal
             (Re-Diagnosis popup keeps its checked rows + selections). */
          className='mih-diag-type-popover'
          style={{
            minWidth: triggerRef.current?.getBoundingClientRect().width,
            background: 'var(--surface-dropdown-default, #FFFFFF)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-dropdown-default, #EBEBEB)',
            borderRadius: 'var(--dim-radius-500, 16px)',
            boxShadow: 'var(--shadow-dropdown, 0 16px 16px rgba(100,116,139,0.15))',
            padding: 'var(--dim-space-100, 4px)',
            display: 'flex',
            flexDirection: 'column',
            /* Must sit ABOVE the host Popup overlay (z-index 1400 via
               --sm-z-modal). The project's generic Select uses 1100,
               but this one is portaled out of a modal and would
               otherwise be occluded by the dialog's white background.
               1500 keeps it stacked correctly on both bare pages and
               inside any Popup-based modal. */
            zIndex: 1500,
          }}
        >
          <div role='listbox' className='flex flex-col w-full'>
            {options.map((opt) => (
              <DiagTypeRow
                key={opt.value}
                option={opt}
                selected={opt.value === value}
                onSelect={() => choose(opt.value)}
              />
            ))}
          </div>
        </Popover>
      </div>
    </div>
  );
};

/* Row: circular numbered badge (primary-fill ColorfulBadge in the
   option's palette) + two-line text (English / Thai). Hover paints
   the brand-green list tokens, same as every other dropdown row in
   the design system. */
const DiagTypeRow = ({ option, selected, onSelect }) => {
  const [hover, setHover] = useState(false);
  const active = hover || selected;
  return (
    <button
      type='button'
      role='option'
      aria-selected={selected}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className='w-full flex items-center text-left'
      style={{
        gap: 'var(--dim-space-300, 12px)',
        minHeight: 56,
        padding: 'var(--dim-space-200, 8px) var(--dim-space-300, 12px)',
        background: active ? 'var(--surface-list-hover, #F4FBF8)' : 'transparent',
        border: 'none',
        borderRadius: 'var(--dim-radius-150, 6px)',
        color: active ? 'var(--text-list-hover, #007549)' : 'var(--text-list-default, #4D5358)',
        cursor: 'pointer',
        fontFamily: 'var(--type-family-body)',
        transition: 'background-color 120ms ease, color 120ms ease',
      }}
    >
      {/* Numbered circular badge — Figma 347:42762. Perfect 24 × 24
          circle (border-radius 50%) aliasing the SECONDARY ColorfulBadge
          tokens: light `--surface-colorfulbadge-{style}` fill + saturated
          `--text-colorfulbadge-{style}` number. Hand-rolled instead of
          reusing <ColorfulBadge> because the badge has a min-width of
          40 px (pill default) that prevents a true circle at 24 px. */}
      <span
        className='inline-flex items-center justify-center shrink-0'
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: `var(--surface-colorfulbadge-${option.badgeStyle})`,
          color: `var(--text-colorfulbadge-${option.badgeStyle})`,
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs, 12px)',
          fontWeight: 'var(--type-weight-medium, 500)',
          lineHeight: 1,
        }}
        aria-hidden
      >
        {option.code}
      </span>
      <span className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-0, 0)' }}>
        <span
          style={{
            color: 'inherit',
            fontWeight: 'var(--type-weight-medium, 500)',
            fontSize: 'var(--type-size-sm, 14px)',
            lineHeight: 1.5,
          }}
        >
          {option.labelEn}
        </span>
        <span
          style={{
            /* Thai sub-line uses tertiary text whether hovered or not —
               Figma 347:42762 keeps it as the muted "supplementary"
               label even on the hovered row. */
            color: 'var(--text-content-tertiary, #858C92)',
            fontWeight: 'var(--type-weight-regular, 400)',
            fontSize: 'var(--type-size-xs, 12px)',
            lineHeight: 1.5,
          }}
        >
          {option.labelTh}
        </span>
      </span>
    </button>
  );
};

/* Helper consumers can reuse to read the picked badge metadata
   without re-importing DIAGNOSIS_TYPE_OPTIONS. */
export const getDiagType = (value) => resolveDiagnosisType(value);

export default DiagTypeSelect;
