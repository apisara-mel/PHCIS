import React, { useEffect, useState } from 'react';
import Popup from '@/components/popup/Popup';
import Select from '@/components/forms/Select';
import { Field } from '@/components/forms/Fields';

const DELETE_REASON_OPTIONS = [
  { value: 'สั่งยาผิดรายการ', label: 'สั่งยาผิดรายการ' },
  { value: 'รายการยาซ้ำซ้อน', label: 'รายการยาซ้ำซ้อน' },
  { value: 'ผู้ป่วยมีประวัติแพ้ยาหรือมีข้อห้ามใช้', label: 'ผู้ป่วยมีประวัติแพ้ยาหรือมีข้อห้ามใช้' },
  { value: 'เปลี่ยนแผนการรักษา', label: 'เปลี่ยนแผนการรักษา' },
  { value: 'เปลี่ยนเป็นยารายการอื่น', label: 'เปลี่ยนเป็นยารายการอื่น' },
  { value: 'ผู้ป่วยปฏิเสธยา', label: 'ผู้ป่วยปฏิเสธยา' },
  { value: 'อื่น ๆ', label: 'อื่น ๆ' },
];

/* Deletion is an audited medication-order action. The destructive CTA
   remains disabled until the clinician records a reason. */
const DeleteMedicationConfirmPopup = ({
  open,
  onClose,
  onConfirm,
  medicationName,
  title = 'ยืนยันการลบรายการยา',
  message,
  cancelLabel = 'ยกเลิก',
  confirmLabel = 'ลบรายการยา',
}) => {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open, medicationName]);

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='default'
      title={title}
      subtitle={message ?? (medicationName ? `คุณต้องการลบ ${medicationName}` : 'คุณต้องการลบรายการยานี้')}
      secondaryAction={{ label: cancelLabel, onClick: onClose }}
      primaryAction={{
        label: confirmLabel,
        tone: 'danger',
        disabled: !reason,
        onClick: () => onConfirm?.(reason),
      }}
    >
      <Field label='เหตุผลที่ลบรายการยา' required>
        <Select
          value={reason}
          onChange={setReason}
          options={DELETE_REASON_OPTIONS}
          placeholder='เลือกเหตุผล'
        />
      </Field>
    </Popup>
  );
};

export default DeleteMedicationConfirmPopup;
