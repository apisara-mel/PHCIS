import React from 'react';
import AlertDialog from '@/components/popup/AlertDialog';

/* PHCIS | Assess-control — Delete contact field confirm (Figma 4D3nTx53).
   • 3:15319 — phone (ยืนยันการลบเบอร์โทรศัพท์)
   • 3:15293 — email (ยืนยันการลบอีเมล)

   Shown when removing a filled phone/email row on Add Center Step 3. */

const COPY = {
  phone: {
    title: 'ยืนยันการลบเบอร์โทรศัพท์',
    message: 'คุณต้องการลบเบอร์โทรศัพท์',
    confirmLabel: 'ลบเบอร์โทร',
  },
  email: {
    title: 'ยืนยันการลบอีเมล',
    message: 'คุณต้องการลบอีเมล',
    confirmLabel: 'ลบอีเมล',
  },
};

const DeleteCenterContactConfirmPopup = ({
  open,
  kind = 'phone',
  onClose,
  onConfirm,
  cancelLabel = 'ยกเลิก',
}) => {
  const copy = COPY[kind] || COPY.phone;
  return (
    <AlertDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      type='destructive'
      alignment='center'
      title={copy.title}
      description={copy.message}
      cancelLabel={cancelLabel}
      confirmLabel={copy.confirmLabel}
    />
  );
};

export default DeleteCenterContactConfirmPopup;
