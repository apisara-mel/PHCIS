import React from 'react';
import AlertDialog from '@/components/popup/AlertDialog';

/* MIH DeleteDrugAllergyConfirmPopup — Figma PHCIS | Registration
   211:23046 (Alert Dialog · Destructive · Center).

   Shown when the clinician deletes a drug-allergy SubCard (Step 5) that
   has any field filled. Empty cards skip this dialog and remove instantly.

   Action handlers:
     • onConfirm — removes the drug-allergy row (ลบข้อมูลยา)
     • onClose   — dismiss (overlay / Esc / ยกเลิก) */
const DeleteDrugAllergyConfirmPopup = ({
  open,
  onClose,
  onConfirm,
  title = 'ยืนยันการลบยา',
  message = 'คุณต้องการลบข้อมูลยาของผู้ป่วย',
  cancelLabel = 'ยกเลิก',
  confirmLabel = 'ลบข้อมูลยา',
}) => (
  <AlertDialog
    open={open}
    onClose={onClose}
    onConfirm={onConfirm}
    type='destructive'
    alignment='center'
    title={title}
    description={message}
    cancelLabel={cancelLabel}
    confirmLabel={confirmLabel}
  />
);

export default DeleteDrugAllergyConfirmPopup;
