import React from 'react';
import AlertDialog from '@/components/popup/AlertDialog';

/* MIH DeleteMedicationConfirmPopup — Figma PHCIS|CPOE 280:28154 (Alert Dialog
   · Destructive · Center).

   Destructive confirmation when the clinician clicks the row-action
   delete (NeutralSubdueIconButton) in the Step-5 medication order table.
   Thin wrapper around `AlertDialog` so chrome matches DeleteDiagnosisConfirmPopup
   and the DS alertdialog/* token family verbatim.

   Action handlers:
     • onConfirm — removes the medication row (red fill button)
     • onClose   — dismiss (overlay / Esc / ยกเลิก) */
const DeleteMedicationConfirmPopup = ({
  open,
  onClose,
  onConfirm,
  medicationName,
  title = 'ยืนยันการลบรายการยา',
  message,
  cancelLabel = 'ยกเลิก',
  confirmLabel = 'ลบรายการยา',
}) => (
  <AlertDialog
    open={open}
    onClose={onClose}
    onConfirm={onConfirm}
    type='destructive'
    alignment='center'
    title={title}
    description={
      message
      ?? (medicationName
        ? `คุณต้องการลบ ${medicationName}`
        : 'คุณต้องการลบรายการยานี้')
    }
    cancelLabel={cancelLabel}
    confirmLabel={confirmLabel}
  />
);

export default DeleteMedicationConfirmPopup;
