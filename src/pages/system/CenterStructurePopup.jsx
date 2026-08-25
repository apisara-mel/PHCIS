import React from 'react';
import Popup from '@/components/popup/Popup';
import StepProgress from '@/components/step/StepProgress';
import { useStructureForm, StructureFormBody } from '@/pages/system/structureForm';

/* ระบบจัดการระบบ · สร้าง/แก้ไขรูปแบบโครงสร้างศูนย์ (popup แบบ step)
   ══════════════════════════════════════════════════════════════════════
   กด "สร้างรูปแบบโครงสร้างศูนย์ใหม่" ในทะเบียนแล้วเปิดเป็น popup แทนการ
   เปลี่ยนหน้า (25 ส.ค. 2569) — โครงเดียวกับ popup "เพิ่มศูนย์บริการ" คือ
   แถบ step อยู่บรรทัดล่างของหัวข้อ และปุ่มหลักเดินไป step ถัดไป

   เนื้อฟอร์มใช้ <StructureFormBody> ตัวเดียวกับหน้าเต็ม แก้ที่เดียวมีผลทั้งคู่ */

export default function CenterStructurePopup({ open, template = null, onClose, onSaved }) {
  const isCreate = !template;
  const form = useStructureForm({
    existing: template,
    onSaved: () => { onSaved?.(); onClose?.(); },
    /* โหมดแก้ไขมี step ผูกศูนย์ด้วย — ตอนสร้างไม่มี */
    withCenters: !isCreate,
  });
  const { idx, setStep, goNext, stepValid, valid, STEPS } = form;
  const isLast = idx === STEPS.length - 1;

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='extraLarge'
      title={isCreate ? 'สร้างรูปแบบโครงสร้างศูนย์ใหม่' : `แก้ไขรูปแบบ · ${template?.name || ''}`}
      /* แถบ step วางกึ่งกลางแถวหัวข้อ (25 ส.ค. 2569) — ใช้ headerCenter
         ไม่ใช่ headerTrailing ที่จะชิดขวาไปติดปุ่มปิด */
      headerCenter={(
        <StepProgress
          steps={STEPS.map((st) => st.label)}
          current={idx}
          onStepClick={(i) => { if (i < idx) setStep(STEPS[i].key); }}
          labelNoWrap
        />
      )}
      primaryAction={{
        label: isLast
          ? (isCreate ? 'สร้างรูปแบบนี้' : 'บันทึกรูปแบบ')
          : `ถัดไป: ${STEPS[idx + 1].label}`,
        disabled: isLast ? !valid : !stepValid,
        onClick: isLast ? form.handleSubmit : goNext,
      }}
      secondaryAction={idx > 0
        ? { label: 'ย้อนกลับ', onClick: form.goPrev }
        : { label: 'ยกเลิก', onClick: onClose }}
      tertiaryAction={{ label: 'บันทึกร่าง', onClick: form.handleSaveDraft }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        {/* popup ไม่ยุ่งกับการผูกศูนย์ — ทำที่หน้าเต็มหรือหน้าทะเบียนแทน */}
        <StructureFormBody form={form} stepped showAppliedCenters={!isCreate} />
      </div>
    </Popup>
  );
}
