import React from 'react';
import AlertDialog from '@/components/popup/AlertDialog';

/* MIH DeleteEmergencyContactConfirmPopup — Figma PHCIS | Registration
   207:19089 (Alert Dialog · Destructive · Center).

   Shown when the clinician taps delete on an emergency-contact SubCard
   (BrandSubdueIconButton). Prevents accidental removal of ผู้ติดต่อฉุกเฉิน.

   Action handlers:
     • onConfirm — removes the emergency-contact row (ลบข้อมูล)
     • onClose   — dismiss (overlay / Esc / ยกเลิก) */
const DeleteEmergencyContactConfirmPopup = ({
  open,
  onClose,
  onConfirm,
  title = 'ยืนยันการลบผู้ติดต่อฉุกเฉิน',
  message = 'คุณต้องการลบผู้ติดต่อฉุกเฉิน',
  cancelLabel = 'ยกเลิก',
  confirmLabel = 'ลบข้อมูล',
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

export default DeleteEmergencyContactConfirmPopup;
