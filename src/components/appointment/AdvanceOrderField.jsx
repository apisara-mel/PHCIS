import React, { useMemo, useState } from 'react';
import BrandButton from '@/components/button/BrandButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import AdvanceOrderPickerPopup from '@/components/popup/AdvanceOrderPickerPopup';
import DeleteAdvanceOrderConfirmPopup from '@/components/popup/DeleteAdvanceOrderConfirmPopup';
import { APPT_ADVANCE_ORDER_OPTIONS } from '@/data/treatmentVisits';

/* ช่อง "คำสั่ง" ของคำสั่งล่วงหน้า — Figma PHCIS | Appointment
   4025:14538 (ว่าง) · 4053:7794 (มีรายการ) · 4053:6953 (popup เลือก)

   แยกออกมาเป็น component กลาง (มติผู้ใช้ 27 ส.ค. 69) เพราะปุ่มตัวนี้บนฟอร์ม
   นัดหมายของเวชระเบียนเป็นปุ่มตาย — ไม่มี onClick เลย กดแล้วไม่เกิดอะไร ทั้งที่
   ขั้นตอนที่ 6 ของบันทึกการรักษามีกลไกครบอยู่แล้ว (popup เลือก + ลิสต์ + ยืนยันลบ)
   ที่นี่จึงห่อกลไกเดียวกันไว้ให้ทั้งสองที่เรียกใช้ได้เหมือนกัน

   ⚠️ `TreatmentSteps.jsx` ยังมีสำเนาของ UI ชุดนี้ฝังอยู่ในตัวเอง — ยังไม่ย้ายมา
   ใช้ตัวนี้เพราะไฟล์นั้นยาว 4,000 บรรทัดและมี session อื่นแก้ค้างอยู่ ควรตามไป
   ยุบให้เหลือชุดเดียวเมื่อไฟล์นั้นว่าง */

const ROW = {
  gap: 'var(--dim-space-200, 8px)',
  minHeight: 48,
  padding: 'var(--dim-space-200, 8px) var(--dim-space-300, 12px)',
  background: 'var(--surface-list-default, #FFFFFF)',
  borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
};

const LABEL = {
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm, 14px)',
  lineHeight: 1.5,
  color: 'var(--text-list-default, #4D5358)',
};

export default function AdvanceOrderField({
  /** ids ของคำสั่งที่เลือกไว้ */
  value = [],
  onChange,
  options = APPT_ADVANCE_ORDER_OPTIONS,
  disabled = false,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  /* ถือ id ไว้ระหว่างเปิดกล่องยืนยัน — ถังขยะบนแถวไม่ลบทันที (Figma 4054:5628) */
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const ids = Array.isArray(value) ? value : [];

  const selected = useMemo(
    () => ids.map((id) => options.find((o) => o.value === id)).filter(Boolean),
    [ids, options],
  );

  const pendingLabel = useMemo(
    () => (pendingDeleteId == null
      ? undefined
      : options.find((o) => o.value === pendingDeleteId)?.label),
    [pendingDeleteId, options],
  );

  const confirmDelete = () => {
    if (pendingDeleteId != null) onChange?.(ids.filter((id) => id !== pendingDeleteId));
    setPendingDeleteId(null);
  };

  return (
    <>
      {selected.length === 0 ? (
        <BrandButton
          type='button'
          variant='outline'
          size='sm'
          leadingIcon='add'
          disabled={disabled}
          onClick={() => setPickerOpen(true)}
        >
          เลือกคำสั่งล่วงหน้า
        </BrandButton>
      ) : (
        <div className='flex w-full flex-col' style={{ gap: 'var(--dim-space-150, 6px)' }}>
          <div
            className='flex w-full flex-col overflow-hidden'
            style={{ borderRadius: 'var(--dim-radius-400, 12px)' }}
          >
            {selected.map((opt) => (
              <div key={opt.value} className='flex w-full min-w-0 items-center' style={ROW}>
                {opt.badge?.style && opt.badge?.label && (
                  <ColorfulBadge
                    style={opt.badge.style}
                    size='small'
                    width='hug'
                    minWidth={72}
                    hierarchy='secondary'
                  >
                    {opt.badge.label}
                  </ColorfulBadge>
                )}
                <span className='min-w-0 flex-1 truncate' style={LABEL}>{opt.label}</span>
                <NeutralSubdueIconButton
                  type='button'
                  variant='outline'
                  size='sm'
                  icon='delete_outline'
                  disabled={disabled}
                  aria-label={`ลบ ${opt.label}`}
                  onClick={() => setPendingDeleteId(opt.value)}
                />
              </div>
            ))}
          </div>
          <BrandButton
            type='button'
            variant='outline'
            size='sm'
            leadingIcon='add'
            disabled={disabled}
            onClick={() => setPickerOpen(true)}
          >
            เลือกคำสั่งล่วงหน้าเพิ่ม
          </BrandButton>
        </div>
      )}

      <AdvanceOrderPickerPopup
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={(next) => onChange?.(next)}
        options={options}
        value={ids}
      />

      <DeleteAdvanceOrderConfirmPopup
        open={pendingDeleteId != null}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={confirmDelete}
        orderLabel={pendingLabel}
      />
    </>
  );
}
