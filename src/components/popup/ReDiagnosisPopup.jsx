import React, { useEffect, useState } from 'react';
import Popup from '@/components/popup/Popup';
import Checkbox from '@/components/checkbox/Checkbox';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import DiagTypeSelect from '@/components/forms/DiagTypeSelect';

/* MIH ReDiagnosisPopup — Figma PHCIS | Medical-examination 161:42074
   ("Popup Large" base, default state) + 347:42231 (post-pick "Diag
   Type" expansion).

   Opens from the Step-4 "Re-Diagnosis" CTA so the clinician can pick
   previously-recorded ICD codes off this patient's prior visits without
   retyping them. Each row shows:
     • 112 px fixed column — visit date in blue colorful badge
     • blue-bold ICD code badge
     • diagnosis name (flex 1)
     • 16 px checkbox (right edge)

   When a row is checked, an inline "Diag Type" sub-card appears below
   the row content (Figma 347:42231) with a Select dropdown so the
   clinician assigns the diagnosis line type (Principle / Co-morbidity /
   Complication / External Cause). The picked type stamps the commit
   record's `type` field so the ICD table renders the correct
   ColorfulBadge palette on first paint.

   Selection state is `Map<id, type>` — entries exist iff the row is
   checked. `type` may be undefined when the doctor hasn't opened the
   Select yet. Per product spec the Diag Type field is OPTIONAL inside
   this popup (it can be filled in later from the table's edit step),
   so the primary action ("ตกลง") only requires ≥1 row picked —
   untyped picks fall back to a `'principle'` default on commit.

   "ล้างค่า" wipes the in-popup selection (does NOT commit). Closing
   the popup (X / Escape / outside click) discards selection. */
const ReDiagnosisPopup = ({
  open,
  onClose,
  onConfirm,
  /** Past visits to pick from. Each: `{ id, date, code, name }`. */
  items = [],
  title = 'เลือกการวินิจฉัยซ้ำ (Re-Diagnosis)',
  subtitle = 'เลือกการวินิจฉัยจากประวัติการรักษาที่ผ่านมา',
  clearLabel = 'ล้างค่า',
  confirmLabel = 'ตกลง',
}) => {
  /* `selections` is a Map<id, type | undefined> — key present iff the
     row is checked. Encoded as a plain object on state so React's
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
    else next[id] = undefined;
    return next;
  });

  const setType = (id, type) => setSelections((prev) => ({ ...prev, [id]: type }));

  /* Diag Type is optional in this popup — picks without a type still
     commit (the table's edit step can set the type later). Primary
     action enables as soon as the doctor ticks ≥1 row. */
  const canConfirm = Object.keys(selections).length > 0;

  const handleConfirm = () => {
    const picked = items
      .filter((it) => isChecked(it.id))
      .map((it) => ({ ...it, type: selections[it.id] }));
    onConfirm?.(picked);
    onClose?.();
  };

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='large'
      title={title}
      subtitle={subtitle}
      tertiaryAction={{ label: clearLabel, onClick: () => setSelections({}) }}
      primaryAction={{ label: confirmLabel, onClick: handleConfirm, disabled: !canConfirm }}
      bodyStyle={{ gap: 0 }}
    >
      {items.map((it, i) => {
        const isLast = i === items.length - 1;
        const checked = isChecked(it.id);
        const type = selections[it.id];
        return (
          <div
            key={it.id}
            style={{
              borderBottom: isLast
                ? 'none'
                : 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
            }}
          >
            <button
              type='button'
              onClick={() => toggle(it.id)}
              className='w-full flex items-center text-left'
              style={{
                gap: 'var(--dim-space-200, 8px)',
                minHeight: 48,
                padding: 'var(--dim-space-200, 8px) var(--dim-space-300, 12px)',
                background: 'var(--surface-list-default, #FFFFFF)',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--type-family-body)',
              }}
            >
              {/* Visit date — 112 px fixed column so date strings of
                  varying length stay column-aligned across rows. */}
              <div className='shrink-0 flex items-center' style={{ width: 112 }}>
                <ColorfulBadge style='blue' size='small' width='hug' hierarchy='secondary'>
                  {it.date}
                </ColorfulBadge>
              </div>
              {/* ICD code badge — blue-bold per Figma 161:42074 (matches
                  AISearch recent-history + Doctor AI surface). */}
              <ColorfulBadge style='blue' size='small' width='hug' hierarchy='primary'>
                {it.code}
              </ColorfulBadge>
              <span
                className='flex-1 min-w-0'
                style={{
                  color: 'var(--text-list-default, #4D5358)',
                  fontSize: 'var(--type-size-sm, 14px)',
                  lineHeight: 1.5,
                }}
              >
                {it.name}
              </span>
              <Checkbox
                checked={checked}
                onChange={() => toggle(it.id)}
                /* `onClick` stop-propagation so toggling the checkbox doesn't
                   double-fire through the row's button onClick. */
                onClick={(e) => e.stopPropagation()}
                aria-label={`เลือก ${it.code} ${it.name}`}
              />
            </button>
            {/* Inline Diag Type panel — Figma 347:42231. Appears only
                when the row is checked; clinician must pick a type
                before the primary action (ตกลง) is enabled. Tinted
                quaternary surface separates it visually from the rest
                of the list. */}
            {checked && (
              <div
                style={{
                  padding: 'var(--dim-space-400, 16px) var(--dim-space-400, 16px) var(--dim-space-400, 16px) var(--dim-space-400, 16px)',
                  background: 'var(--surface-card-quaternary, #F9FBFB)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--dim-space-200, 8px)',
                }}
              >
                <DiagTypeSelect
                  value={type}
                  onChange={(next) => setType(it.id, next)}
                  /* After a Diag Type is picked, the trigger reads
                     "[badge] [disease name]" — the row's own ICD label
                     so the field reinforces what's being categorized
                     (Figma 348:34476). */
                  pickedText={it.name}
                />
              </div>
            )}
          </div>
        );
      })}
    </Popup>
  );
};

export default ReDiagnosisPopup;
