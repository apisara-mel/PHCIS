import React from 'react';
import Popup from '@/components/popup/Popup';
import StepProgress from '@/components/step/StepProgress';
import DeleteCenterContactConfirmPopup from '@/components/popup/DeleteCenterContactConfirmPopup';
import {
  useCenterForm,
  CenterFormBody,
  ExistingCodesPopup,
  CENTER_FORM_STEPS,
} from '@/pages/system/centerForm';

/* ระบบจัดการระบบ · แก้ไขศูนย์บริการ (popup แบบ step)
   ══════════════════════════════════════════════════════════════════════
   กด "แก้ไข" ในตารางทะเบียนศูนย์แล้วเปิดเป็น popup แทนการเปลี่ยนหน้า —
   รูปแบบเดียวกับ "แก้ไขแบบฟอร์มความยินยอม" คือ Popup extraLarge +
   แถบ step ด้านบน + ปุ่มเดินหน้า/ถอยหลังที่ footer ของ popup

   เนื้อฟอร์มใช้ <CenterFormBody> ตัวเดียวกับหน้า "เพิ่มศูนย์บริการ"
   ต่างกันแค่เปลือก — แก้ฟอร์มที่เดียวแล้วมีผลทั้งสองทาง */

export default function CenterEditPopup({ open, center, onClose, onSaved }) {
  /* remount ฟอร์มใหม่ทุกครั้งที่เปลี่ยนศูนย์/เปิดใหม่ ผ่าน key ที่ผู้เรียกส่งมา
     (ดู SystemCentersPage) — hook จึงอ่านค่าเริ่มต้นจาก center ได้ตรง ๆ */
  const form = useCenterForm({
    existing: center,
    onSaved: () => { onSaved?.(); onClose?.(); },
  });
  const { idx, setStep, footerPrimary } = form;

  const isLast = idx === CENTER_FORM_STEPS.length - 1;

  return (
    <>
      <Popup
        open={open}
        onClose={onClose}
        size='extraLarge'
        title={`แก้ไขศูนย์บริการ${center?.name ? ` · ${center.name}` : ''}`}
        subtitle={center?.hcode9 ? `รหัสหน่วยบริการ ${center.hcode9}` : undefined}
        /* ปุ่มหลักเดินไป step ถัดไป จนถึง step สุดท้ายจึงเป็น "บันทึก" */
        primaryAction={{
          label: isLast ? 'บันทึกการแก้ไข' : footerPrimary.label,
          disabled: footerPrimary.disabled,
          onClick: isLast ? form.handleCreate : form.goNext,
        }}
        secondaryAction={idx > 0
          ? { label: 'ย้อนกลับ', onClick: form.goPrev }
          : { label: 'ยกเลิก', onClick: onClose }}
        tertiaryAction={{ label: 'บันทึกร่าง', onClick: form.handleSaveDraft }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>
          {/* แถบ step — คลิกย้อนกลับไป step ที่ผ่านมาแล้วได้ เหมือนหน้าเต็ม */}
          <StepProgress
            steps={CENTER_FORM_STEPS.map((s) => s.label)}
            current={idx}
            onStepClick={(i) => { if (i < idx) setStep(CENTER_FORM_STEPS[i].key); }}
            framed
          />
          <CenterFormBody form={form} />
        </div>
      </Popup>

      <DeleteCenterContactConfirmPopup
        open={form.contactDelete !== null}
        kind={form.contactDelete?.kind ?? 'phone'}
        onClose={() => form.setContactDelete(null)}
        onConfirm={form.confirmContactDelete}
      />
      <ExistingCodesPopup
        open={form.showCodeList}
        centers={form.existingCenters}
        onClose={() => form.setShowCodeList(false)}
      />
    </>
  );
}
