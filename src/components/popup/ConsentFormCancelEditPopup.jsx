import React from 'react';
import AlertDialog from '@/components/popup/AlertDialog';

/* MIH ConsentFormCancelEditPopup — Figma MIH Design System · Popup
   node 1:1187 (Alert Dialog · Warning · Center).

   Discard guard when closing the consent-form edit / create wizard.
   Inherits AlertDialog chrome verbatim:
     • 448 px centered card · 32 px padding · 24 px content/actions gap
     • 32 px orange outline warning icon (Material `warning`, FILL 0)
     • h5 title + body4 description
     • DangerSubdueButton outline + DangerButton fill (h44) */

const ConsentFormCancelEditPopup = ({
  open,
  onClose,
  onConfirm,
  title = 'ยืนยันการยกเลิกการแก้ไขแบบฟอร์ม',
  description = 'ข้อมูลที่ยังไม่ได้บันทึกจะหายไป ต้องการปิดหน้าต่างนี้หรือไม่',
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ทำต่อ',
}) => (
  <AlertDialog
    open={open}
    onClose={onClose}
    onCancel={onClose}
    onConfirm={onConfirm}
    type='warning'
    alignment='center'
    title={title}
    description={description}
    cancelLabel={cancelLabel}
    confirmLabel={confirmLabel}
  />
);

export default ConsentFormCancelEditPopup;
