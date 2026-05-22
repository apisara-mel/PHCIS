import React from 'react';
import AlertDialog from '@/components/popup/AlertDialog';

/* MIH DeleteAdvanceOrderConfirmPopup — Figma PHCIS | Appointment
   4054:5628 (Alert Dialog · Destructive · Center).

   Shown when the clinician taps the row delete (NeutralSubdueIconButton
   `delete_outline`) on a picked advance-order line in Step 6.

   Thin wrapper around `AlertDialog` — same chrome as DeleteDiagnosisConfirmPopup /
   DeleteMedicationConfirmPopup (448px card, destructive tone, DS tokens).

   Action handlers:
     • onConfirm — removes the advance-order id from the selection
     • onClose   — dismiss (overlay / Esc / ยกเลิก) */
const DeleteAdvanceOrderConfirmPopup = ({
  open,
  onClose,
  onConfirm,
  orderLabel,
  title = 'ยืนยันการลบรายการคำสั่งล่วงหน้า',
  message,
  cancelLabel = 'ยกเลิก',
  confirmLabel = 'ลบรายการ',
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
      ?? (orderLabel
        ? `คุณต้องการลบ ${orderLabel}`
        : 'คุณต้องการลบรายการคำสั่งล่วงหน้า')
    }
    cancelLabel={cancelLabel}
    confirmLabel={confirmLabel}
  />
);

export default DeleteAdvanceOrderConfirmPopup;
