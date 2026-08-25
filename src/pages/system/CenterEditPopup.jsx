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

/* ระบบจัดการระบบ · เพิ่ม/แก้ไขศูนย์บริการ (popup แบบ step)
   ══════════════════════════════════════════════════════════════════════
   กด "เพิ่มศูนย์บริการ" หรือ "แก้ไข" ในทะเบียนศูนย์แล้วเปิดเป็น popup แทน
   การเปลี่ยนหน้า (25 ส.ค. 2569 — ปุ่มเพิ่มเดิมพาไป /admin/centers/new) —
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
  /* ไม่มี center ที่ส่งเข้ามา = โหมดเพิ่มศูนย์ใหม่ */
  const isCreate = !center;

  return (
    <>
      <Popup
        open={open}
        onClose={onClose}
        size='extraLarge'
        title={isCreate ? 'เพิ่มศูนย์บริการ' : `แก้ไขศูนย์บริการ${center?.name ? ` · ${center.name}` : ''}`}
        /* โหมดเพิ่มไม่มี subtitle — หัวข้อ "เพิ่มศูนย์บริการ" กับแถบ step
           บอกครบอยู่แล้ว (25 ส.ค. 2569) */
        subtitle={isCreate
          ? undefined
          : (center?.hcode9 ? `รหัสหน่วยบริการ ${center.hcode9}` : undefined)}
        /* ปุ่มหลักเดินไป step ถัดไป จนถึง step สุดท้ายจึงเป็น "บันทึก" */
        primaryAction={{
          label: isLast
            ? (isCreate ? 'สร้างศูนย์บริการนี้' : 'บันทึกการแก้ไข')
            : footerPrimary.label,
          disabled: footerPrimary.disabled,
          onClick: isLast ? form.handleCreate : form.goNext,
        }}
        /* step อยู่บรรทัดเดียวกับหัวข้อ popup (25 ส.ค. 2569) — เดิมเป็นแถบ
           framed ใต้หัวข้อ ทำให้ "ข้อความ" กับ "step" คนละบรรทัด */
        headerTrailing={(
          /* ดันแถบ step ลงมาหนึ่งบรรทัด (24px) — หัวข้อ popup อยู่บรรทัดบน
             แถวเลข step จะได้ไม่ชนระดับเดียวกับตัวหนังสือพอดี (25 ส.ค. 2569) */
          <div style={{ paddingTop: 'var(--dim-space-600, 24px)' }}>
            <StepProgress
              steps={CENTER_FORM_STEPS.map((st) => st.label)}
              current={idx}
              onStepClick={(i) => { if (i < idx) setStep(CENTER_FORM_STEPS[i].key); }}
              labelNoWrap
            />
          </div>
        )}
        secondaryAction={idx > 0
          ? { label: 'ย้อนกลับ', onClick: form.goPrev }
          : { label: 'ยกเลิก', onClick: onClose }}
        tertiaryAction={{ label: 'บันทึกร่าง', onClick: form.handleSaveDraft }}
      >
        <CenterFormBody form={form} />
      </Popup>

      <DeleteCenterContactConfirmPopup
        open={form.contactDelete !== null}
        kind={form.contactDelete?.kind ?? 'phone'}
        onClose={() => form.setContactDelete(null)}
        onConfirm={form.confirmContactDelete}
      />
      <ExistingCodesPopup
        open={form.showCodeList}
        mode={form.codeListMode}
        centers={form.existingCenters}
        onClose={() => form.setShowCodeList(false)}
      />
    </>
  );
}
