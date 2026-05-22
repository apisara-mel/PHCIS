import React from 'react';
import AddDiagnosisPopup from '@/components/popup/AddDiagnosisPopup';

/* MIH EditDiagnosisPopup — paired with the ICD-10 table row-edit
   action in TreatmentSteps Step 4. Reuses `AddDiagnosisPopup` verbatim
   (Figma PHCIS | Medical-examination 350:35255) so add + edit share
   the exact same chrome — only the title and seed values differ.

   Differences vs add mode:
     • title       → "แก้ไขรหัสการวินิจฉัย (ICD10)"
     • fields      → pre-filled from `diagnosis` (code / name / type)
     • onConfirm   → merges the edited fields back onto the original
                     row so non-editable metadata (`date`, `time`)
                     survives the edit. */
const EditDiagnosisPopup = ({
  open,
  onClose,
  onConfirm,
  /** The diagnosis row being edited: { date, time, code, name, type } */
  diagnosis,
  title = 'แก้ไขรหัสการวินิจฉัย (ICD10)',
}) => (
  <AddDiagnosisPopup
    open={open}
    onClose={onClose}
    title={title}
    initialValue={diagnosis}
    onConfirm={(patch) => onConfirm?.({ ...diagnosis, ...patch })}
  />
);

export default EditDiagnosisPopup;
