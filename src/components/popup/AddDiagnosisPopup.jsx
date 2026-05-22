import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import DiagTypeSelect from '@/components/forms/DiagTypeSelect';
import { DEFAULT_ICD_SUGGESTIONS } from '@/data/treatmentVisits';

/* MIH AddDiagnosisPopup — Figma PHCIS | Medical-examination 350:35255.

   Opens from the Step-4 "เพิ่มรหัสการวินิจฉัย" CTA when the clinician
   wants to add an ICD-10 diagnosis row by hand (the Doctor AI search +
   Re-Diagnosis flow cover the typeahead / past-visit cases).

   ALSO drives the row-edit flow (EditDiagnosisPopup is a thin wrapper)
   so add + edit share the exact same chrome — only the title + the
   initial field values differ.

   Fields (all required):
     • รหัส (ICD10)  — VoiceTextarea, supports dictation (มก ภาษาไทย /
                       ภาษาอังกฤษ).
     • โรค          — VoiceTextarea (diagnosis name / longer free text).
     • Diag Type    — DiagTypeSelect (the seven backend DIAGTYPE rows).

   Footer:
     • "ล้างค่า"  → resets the three fields to empty (always — even in
                    edit mode the clear button clears, not "reset to
                    initial"; the X button discards instead).
     • "ตกลง"     → commits one diagnosis row via `onConfirm`. Stays
                    disabled until all three fields are filled, matching
                    the Figma disabled-button state. In edit mode it
                    ALSO requires at least one field to differ from the
                    initial value — so re-confirming an unchanged row
                    is gated.

   Closing the popup (X / Escape / overlay click) discards the form.

   `initialValue` (optional) pre-fills the three fields when the popup
   opens — used by the edit flow to seed the inputs from the row the
   clinician clicked. Reset every re-open so a previous session's
   typing never bleeds across opens. */
/* Static suggestion pools derived from the project's ICD-10 catalog
   (src/data/treatmentVisits.js). Module-scope memoisation: derived
   once at import-time so the popup mounts don't re-compute the lists
   on every keystroke. */
const ICD_CODE_SUGGESTIONS = DEFAULT_ICD_SUGGESTIONS.map((c) => c.code);
const ICD_NAME_SUGGESTIONS = DEFAULT_ICD_SUGGESTIONS.map((c) => c.name);

const AddDiagnosisPopup = ({
  open,
  onClose,
  onConfirm,
  /** Pre-fill the three editable fields when opened (edit mode). */
  initialValue,
  title = 'เพิ่มรหัสการวินิจฉัย (ICD10)',
  clearLabel = 'ล้างค่า',
  confirmLabel = 'ตกลง',
}) => {
  const [code, setCode] = useState(initialValue?.code ?? '');
  const [name, setName] = useState(initialValue?.name ?? '');
  const [type, setType] = useState(initialValue?.type);

  /* If the doctor types or picks a code that matches a catalog row,
     auto-resolve the matching diagnosis name into the second field
     (and vice-versa) — small UX nicety so a single field-pick fills
     the whole code+name pair. Either field still accepts free text;
     auto-fill only triggers on a clean catalog match. */
  const autoFillFromCode = (next) => {
    setCode(next);
    const hit = DEFAULT_ICD_SUGGESTIONS.find(
      (c) => c.code.toLowerCase() === next.trim().toLowerCase(),
    );
    if (hit && !name) setName(hit.name);
  };
  const autoFillFromName = (next) => {
    setName(next);
    const hit = DEFAULT_ICD_SUGGESTIONS.find(
      (c) => c.name.toLowerCase() === next.trim().toLowerCase(),
    );
    if (hit && !code) setCode(hit.code);
  };

  /* Reset every time the popup re-opens so the next visit starts fresh
     (previous in-popup typing doesn't bleed across sessions). When
     `initialValue` is supplied (edit mode) the fields seed from it
     instead of going blank. */
  useEffect(() => {
    if (open) {
      setCode(initialValue?.code ?? '');
      setName(initialValue?.name ?? '');
      setType(initialValue?.type);
    }
  }, [open, initialValue]);

  /* Edit mode dirty check — when `initialValue` is supplied, require
     at least one field to differ from the original so confirming an
     untouched row is gated. Add mode (no initialValue) treats every
     filled state as dirty. Compare trimmed strings so a stray trailing
     space doesn't count as a real edit. */
  const isDirty = !initialValue
    || code.trim() !== (initialValue.code ?? '').trim()
    || name.trim() !== (initialValue.name ?? '').trim()
    || type !== initialValue.type;
  const allFilled = code.trim() !== '' && name.trim() !== '' && !!type;
  const canConfirm = allFilled && isDirty;
  const handleClear = () => {
    setCode('');
    setName('');
    setType(undefined);
  };
  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm?.({ code: code.trim(), name: name.trim(), type });
    onClose?.();
  };

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='large'
      title={title}
      tertiaryAction={{ label: clearLabel, onClick: handleClear }}
      primaryAction={{ label: confirmLabel, onClick: handleConfirm, disabled: !canConfirm }}
      bodyStyle={{ gap: 'var(--dim-space-500, 20px)' }}
    >
      {/* Voice + Suggestible — typing any of the ~80 ICD-10 codes in
          the catalog opens a popover with matching rows. Picking one
          fills this field AND auto-resolves the matching diagnosis
          name into the second textarea below (and vice-versa). The
          mic icon still dictates speech, same as a plain VoiceTextarea. */}
      <SuggestibleTextarea
        voice
        label='รหัส (ICD10)'
        required
        value={code}
        onChange={(e) => autoFillFromCode(e?.target?.value ?? '')}
        suggestions={ICD_CODE_SUGGESTIONS}
        /* ICD codes are short (`I10`, `M54.9`, `A90`) so suggestions
           must appear after a single character. */
        minChars={1}
      />
      <SuggestibleTextarea
        voice
        label='โรค'
        required
        value={name}
        onChange={(e) => autoFillFromName(e?.target?.value ?? '')}
        suggestions={ICD_NAME_SUGGESTIONS}
        /* Disease names are long — keep the default 3-character
           threshold so suggestions only surface after a meaningful
           prefix. */
        minChars={3}
      />
      <DiagTypeSelect
        value={type}
        onChange={setType}
        /* Required asterisk inlined in the label so the existing
           DiagTypeSelect (which renders a plain label) shows the same
           red `*` indicator the VoiceTextarea fields above use. */
        label='Diag Type *'
      />
    </Popup>
  );
};

export default AddDiagnosisPopup;
