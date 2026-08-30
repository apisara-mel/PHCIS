import React from 'react';
import AlertDialog from '@/components/popup/AlertDialog';

/* MIH UnsavedChangesPopup — confirmation shown when the user tries to
   navigate away from a form that has unsaved input. Aliases the DS
   <AlertDialog type='warning'> per Figma "Alert Dialog · Warning"
   (PHCIS-ALL node 3106:136000) — borderless centered card with a
   warning triangle, title, supporting text, and a 2-button action row.

   Two actions, ordered LEFT → RIGHT in the footer per Figma:
     cancel             "ไม่บันทึก"         → discard input, leave the page
     primary  (right)   "บันทึกร่างและออก" → save draft, then leave

   Action mapping into AlertDialog:
     • onClose   = stay on page  (overlay click / Esc — keeps form data)
     • onCancel  = onDiscard     (secondary button; leave without saving)
     • onConfirm = onSave        (primary button; persist draft + leave)

   Props:
     • open        boolean
     • onClose     () => void  — overlay / Esc. Stay; data untouched.
     • onSave      () => void  — primary; persist draft then navigate.
     • onDiscard   () => void  — secondary; navigate without saving.
     • title       override the default header title
     • description override the default supporting copy                  */

const UnsavedChangesPopup = ({
  open,
  onClose,
  onSave,
  onDiscard,
  title = 'ต้องการบันทึกข้อมูลที่กรอกไว้หรือไม่ ?',
  description = 'คุณสามารถกลับมาทำต่อจากที่ค้างไว้ได้จากเมนู "ที่ร่างไว้" และสามารถกลับมาแก้ไขต่อได้ภายหลัง',
  /** ปรับคำปุ่มได้ตามบริบท เช่น สลับไปคิวคนถัดไปแทนการออกจากหน้า */
  discardLabel = 'ไม่บันทึก',
  saveLabel = 'บันทึกร่างและออก',
}) => (
  <AlertDialog
    open={open}
    onClose={onClose}
    onCancel={onDiscard}
    onConfirm={onSave}
    type='warning'
    alignment='center'
    title={title}
    description={description}
    cancelLabel={discardLabel}
    confirmLabel={saveLabel}
  />
);

export default UnsavedChangesPopup;
