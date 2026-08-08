import React, { useEffect, useState } from 'react';
import Popup from '@/components/popup/Popup';
import Checkbox from '@/components/checkbox/Checkbox';
import ColorfulBadge from '@/components/badge/ColorfulBadge';

/* Module-load stylesheet injection — gives each list-row <button> its
   own hover / focus / selected affordance. Matches the CLAUDE.md
   pattern (idempotent <style> tag keyed by id, HMR-safe).

   Spec — Figma PHCIS | CPOE node 277:28073 (Re-Medicine List · Default /
   Selected variant matrix):

     • Default       — `--surface-card-quaternary` (#F9FBFB) tint,
                       2 px TRANSPARENT border so the row reserves the
                       same footprint it will use when selected (no
                       layout shift on toggle).
     • Hover         — `--surface-list-hover` (#F4FBF8 / brand-p50) so
                       the row pops slightly when the mouse enters.
     • Selected      — `aria-pressed="true"` paints a `--surface-list-
                       hover` (#F4FBF8) background + a 2 px solid
                       `--border-brandPrimary-tertiary` (#C5EDDA, soft
                       mint) border. Same soft mint Figma uses for
                       selected list rows in OPD pickers — read as
                       "ticked" without overwhelming the surface.
     • Selected hover — bumps to `--surface-brandPrimary-quaternary`
                       (#E6F4EE) for a subtle "I'll still de-select on
                       click" affordance.
     • Focus-visible — 2 px brand-quaternary-hover outer ring for
                       keyboard navigation (works on top of the inline
                       transparent / selected border below).

   Selecting still piggybacks on the underlying onClick handler — the
   styles are purely visual feedback. */
const REMED_ROW_STYLE_ID = 'mih-remed-row-styles';
if (typeof document !== 'undefined' && !document.getElementById(REMED_ROW_STYLE_ID)) {
  const sheet = document.createElement('style');
  sheet.id = REMED_ROW_STYLE_ID;
  sheet.textContent = `
    .mih-remed-row {
      transition:
        background-color 150ms ease-out,
        border-color 150ms ease-out,
        box-shadow 150ms ease-out;
    }
    .mih-remed-row:hover {
      background: var(--surface-list-hover, #F4FBF8) !important;
    }
    .mih-remed-row[aria-pressed="true"] {
      background: var(--surface-list-hover, #F4FBF8) !important;
      border-color: var(--border-brandPrimary-tertiary, #C5EDDA) !important;
    }
    .mih-remed-row[aria-pressed="true"]:hover {
      background: var(--surface-brandPrimary-quaternary, #E6F4EE) !important;
    }
    .mih-remed-row:focus-visible {
      outline: none !important;
      /* Same brand-tertiary mint as the Selected border, just rendered
         as a ring so the row can still own its own border colour while
         signalling keyboard focus. Aliased from the proper border token
         (was --surface-brandPrimary-quaternary-hover, the wrong type
         for a border-like outline). */
      box-shadow: 0 0 0 2px var(--border-brandPrimary-tertiary, #C5EDDA);
    }
  `;
  document.head.appendChild(sheet);
}

/* Drug-image avatar — mirrors the `MedImageTile` pattern used in the
   Step-5 medication table (TreatmentSteps.jsx). Circular 40 × 40 px
   tile so the row reads as "[date] · [drug avatar] · [drug + details]"
   per the Figma 271:194 edit (clinician identifies drugs by photo
   instead of by ICD code, which already appeared in the date column's
   surrounding visit context). Falls back to a brand-tinted medication
   pictogram if the row has no `image` path. */
const DrugImageTile = ({ src, alt }) => {
  /* Per Figma 277:28073 / `aciclovir` tile: 36 × 36 circular avatar
     with a 1 px --border-neutral-quaternary hairline so the image
     reads as a tile even when the photo's edges are near-white
     against the row's #F9FBFB / #F4FBF8 surface. */
  const baseStyle = {
    width: 36,
    height: 36,
    borderRadius: 'var(--dim-radius-full, 9999px)',
    border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
    flexShrink: 0,
    overflow: 'hidden',
  };
  if (src) {
    return (
      <img
        src={src}
        alt={alt || 'medication'}
        loading='lazy'
        style={{
          ...baseStyle,
          objectFit: 'cover',
          background: 'var(--surface-card-quaternary, #F9FBFB)',
        }}
      />
    );
  }
  return (
    <span
      className='inline-flex items-center justify-center material-symbols-outlined'
      style={{
        ...baseStyle,
        background: 'var(--surface-brandPrimary-quaternary, #E6F4EE)',
        color: 'var(--text-brandPrimary-default, #007549)',
        fontFamily: 'Material Symbols Outlined',
        fontSize: 20,
      }}
      aria-hidden
    >
      medication
    </span>
  );
};

/* MIH ReMedicinePopup — Figma PHCIS|CPOE 200:23111 ("Popup ExtraLarge"
   / "Re-Medicine"). Opens from the Step-5 "Re-Diagnosis" CTA — the
   button label is kept per Figma 269:32427 even though the popup
   itself is titled Re-Medicine — so the clinician can scan past-visit
   prescriptions and re-issue them without retyping each row.

   Each row renders the past prescription as a single tinted
   (surface/card/quaternary) card with:
     • 112 px fixed column — visit date (blue colorful badge,
       secondary hierarchy)
     • blue-bold ICD code badge (the diagnosis the script was issued
       under)
     • Drug name (bold, label/h7 type)
     • 8 label/value information blocks laid out horizontally:
         วิธีใช้ · ทานครั้งละ · ความถี่ · เวลาใช้ยา · คำเตือน · จำนวน · เบิกได้ · การใช้
     • 16 px checkbox (right edge)

   Selection state is a plain object keyed by `id` — entries exist iff
   the row is checked. `onConfirm` is called with the full picked row
   objects so the caller can map them onto its own form shape (the
   Step-5 medication-row spec) and assign fresh ids.

   "ล้างค่า" wipes the in-popup selection (does NOT commit). Closing
   the popup (X / Escape / outside click) discards selection. */

/* Single label-value pair inside a row. Label uses
   text/content/tertiary + xs (12 px); value uses text/content/default
   + sm (14 px). `whiteSpace: nowrap` so each pair stays on a single
   line — the parent flex wraps as needed. */
const InfoBlock = ({ label, value }) => (
  <div
    className='flex flex-col shrink-0'
    style={{
      gap: 'var(--dim-space-100, 4px)',
      whiteSpace: 'nowrap',
    }}
  >
    <span
      style={{
        color: 'var(--text-content-tertiary, #858C92)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs, 12px)',
        fontWeight: 'var(--type-weight-medium, 500)',
        lineHeight: 1.5,
      }}
    >
      {label}
    </span>
    <span
      style={{
        color: 'var(--text-content-default, #363B3F)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-regular, 400)',
        lineHeight: 1.5,
      }}
    >
      {value || '—'}
    </span>
  </div>
);

const ReMedicinePopup = ({
  open,
  onClose,
  onConfirm,
  /** Past prescriptions to pick from. Each: `{ id, date, code, name,
   *  usage, dosePerTake, unit, frequency, when, warning, quantity,
   *  totalPrice, reimbursable, purpose }`. */
  items = [],
  title = 'Re-Medicine',
  subtitle = 'เลือกรายการยาจากการรักษาที่ผ่านมาเพื่อสั่งซ้ำ',
  clearLabel = 'ล้างค่า',
  confirmLabel = 'ตกลง',
}) => {
  /* `selections` is a plain object keyed by item id — entry present
     iff the row is checked. Plain object (not Map) so React's
     setState shallow-compare picks up edits without manual cloning. */
  const [selections, setSelections] = useState({});

  /* Reset every time the popup re-opens so a previous session's pick
     state doesn't carry over. */
  useEffect(() => {
    if (open) setSelections({});
  }, [open]);

  const isChecked = (id) => Object.prototype.hasOwnProperty.call(selections, id);

  const toggle = (id) => setSelections((prev) => {
    const next = { ...prev };
    if (isChecked(id)) delete next[id];
    else next[id] = true;
    return next;
  });

  const canConfirm = Object.keys(selections).length > 0;

  const handleConfirm = () => {
    const picked = items.filter((it) => isChecked(it.id));
    onConfirm?.(picked);
    onClose?.();
  };

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='extraLarge'
      title={title}
      subtitle={subtitle}
      tertiaryAction={{ label: clearLabel, onClick: () => setSelections({}) }}
      primaryAction={{ label: confirmLabel, onClick: handleConfirm, disabled: !canConfirm }}
      bodyStyle={{ gap: 'var(--dim-space-200, 8px)' }}
    >
      {items.map((it) => {
        const checked = isChecked(it.id);
        /* Compose display values from the raw row fields so the popup
           can present unit-suffixed quantities ("35 เม็ด") without
           the caller pre-formatting. `เบิกได้` shows the
           reimbursable price when applicable; "ไม่เบิก" otherwise. */
        const dosePerTakeText = [it.dosePerTake, it.unit].filter(Boolean).join(' ');
        const quantityText = it.quantity != null
          ? `${it.quantity}${it.unit ? ` ${it.unit}` : ''}`
          : '—';
        const reimburseText = it.reimbursable
          ? `${Number(it.totalPrice || 0).toLocaleString('th-TH')} บาท`
          : 'ไม่เบิก';
        return (
          <button
            key={it.id}
            type='button'
            onClick={() => toggle(it.id)}
            /* `mih-remed-row` is the hook for the module-load stylesheet
               above — it owns the row's hover / focus / selected
               affordance. `aria-pressed` doubles as the selection-state
               CSS selector AND the canonical ARIA toggle-state hint so
               screen readers announce "checked / not checked" without
               needing a redundant `role` on top of the native button.
               The whole row is clickable (button onClick → toggle); the
               trailing Checkbox stops propagation so toggling it doesn't
               double-fire. */
            aria-pressed={checked}
            className='mih-remed-row w-full flex items-start text-left'
            style={{
              gap: 'var(--dim-space-200, 8px)',
              /* `height: fit-content` so each row owns its natural
                 height — drug name + 8 wrapped info blocks need ~100 px
                 in practice and the old `min-height: 48` was visually
                 clamping the row to the 48 px floor on layouts where
                 the inner flex column compressed (per the in-browser
                 edit on cursor-el-741). With `fit-content`, the row
                 grows to whatever its content needs, which is what the
                 Figma 200:23111 popup reads as. */
              height: 'fit-content',
              padding: 'var(--dim-space-300, 12px) var(--dim-space-300, 12px)',
              background: 'var(--surface-card-quaternary, #F9FBFB)',
              /* 2 px transparent border reserves the exact footprint
                 used by the Selected state (Figma 277:28073). When
                 `aria-pressed="true"` flips on, the stylesheet above
                 swaps `border-color` to `--border-brandPrimary-tertiary`
                 and the row gains the mint outline without any
                 surrounding layout shift. */
              border: 'var(--dim-stroke-200, 2px) solid transparent',
              borderRadius: 'var(--dim-radius-200, 8px)',
              cursor: 'pointer',
              fontFamily: 'var(--type-family-body)',
            }}
          >
            {/* Visit date — 112 px fixed column so date strings of
                varying length stay column-aligned across rows.
                `paddingTop: 2` nudges the badge so its baseline lines
                up with the bold drug-name row to its right. */}
            <div
              className='shrink-0 flex items-center'
              style={{ width: 112, paddingTop: 2 }}
            >
              <ColorfulBadge style='blue' size='small' width='hug' hierarchy='secondary'>
                {it.date}
              </ColorfulBadge>
            </div>
            {/* Drug photo (Figma 271:194). Replaces the earlier
                blue-bold ICD code badge — the diagnosis context is
                already conveyed by the date column's visit grouping,
                and a drug photo lets the clinician identify familiar
                prescriptions at a glance. 40 × 40 circular tile so it
                visually peers with the date badge to its left without
                dominating the row. */}
            <DrugImageTile src={it.image} alt={it.name} />
            {/* Drug name + info-block grid. Flex 1 so the row consumes
                remaining width; min-w-0 so flex children that overflow
                don't break the layout. */}
            <div
              className='flex-1 min-w-0 flex flex-col'
              style={{ gap: 'var(--dim-space-200, 8px)' }}
            >
              <span
                style={{
                  color: 'var(--text-list-default, #4D5358)',
                  fontFamily: 'var(--type-family-heading-content)',
                  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                  fontSize: 'var(--type-size-sm, 14px)',
                  lineHeight: 1.5,
                }}
              >
                {it.name}
              </span>
              {/* Info-block row — `flex-wrap` so the 8 pairs fall to a
                  second line on narrower screens; `gap-y` = 16 keeps
                  the second-line spacing readable. */}
              <div
                className='flex flex-wrap items-start'
                style={{ columnGap: 'var(--dim-space-600, 24px)', rowGap: 'var(--dim-space-400, 16px)' }}
              >
                <InfoBlock label='วิธีใช้'      value={it.usage} />
                <InfoBlock label='ทานครั้งละ'   value={dosePerTakeText} />
                <InfoBlock label='ความถี่'       value={it.frequency} />
                <InfoBlock label='เวลาใช้ยา'    value={it.when} />
                <InfoBlock label='คำเตือน'      value={it.warning} />
                <InfoBlock label='จำนวน'        value={quantityText} />
                <InfoBlock label='เบิกได้'       value={reimburseText} />
                <InfoBlock label='การใช้'        value={it.purpose} />
              </div>
            </div>
            {/* Checkbox — stops propagation so the row-level onClick
                doesn't double-fire when the checkbox is the actual
                target. */}
            <div className='shrink-0' style={{ paddingTop: 2 }}>
              <Checkbox
                checked={checked}
                onChange={() => toggle(it.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label={`เลือก ${it.code} ${it.name}`}
              />
            </div>
          </button>
        );
      })}
    </Popup>
  );
};

export default ReMedicinePopup;
