import React from 'react';
import AlertDialog from '@/components/popup/AlertDialog';

/* MIH DeleteDiagnosisConfirmPopup — Figma PHCIS | Medical-examination
   348:50870 (Alert Dialog · Destructive · Center).

   Destructive confirmation that fires when the clinician clicks the
   row-action delete (NeutralSubdueIconButton 'delete') in the Step-4
   รหัสการวินิจฉัย (ICD10) table.

   Thin wrapper around the design-system `AlertDialog` (centred,
   destructive variant) so this confirmation inherits the canonical
   chrome verbatim:
     • 448 px card width
     • 32 px uniform padding
     • 24 px gap between content + actions
     • 32 px red destructive icon (Material `cancel`)
     • h5 (lg/18 Bold) title + body4 (sm/14 Regular) subtext
     • h44 (size='lg') action row with 12 px gap
     • alertdialog/* token family (--surface, --border, --text aliases)
       — different from the generic Popup's modal/* tokens.

   Action handlers:
     • onConfirm — fires the destructive delete (red fill button)
     • onClose   — dismiss (overlay click / Esc / ยกเลิก button)
*/
const DeleteDiagnosisConfirmPopup = ({
  open,
  onClose,
  onConfirm,
  title = 'ยืนยันการลบการวินิจฉัย',
  message = 'คุณต้องการลบการวินิจฉัย',
  cancelLabel = 'ยกเลิก',
  confirmLabel = 'ลบการวินิจฉัย',
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

export default DeleteDiagnosisConfirmPopup;
