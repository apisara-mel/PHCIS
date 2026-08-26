import React, { useState } from 'react';
import InputField from '@/components/forms/InputField';
import BrandIconButton from '@/components/button/BrandIconButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import Icon from '@/components/icons/Icon';

/* แก้ชื่อ inline — Enter/ปุ่ม ✓ บันทึก · Esc/ปุ่ม ✕ ยกเลิก.
   onSave คืน true = สำเร็จ (ผู้เรียกปิดโหมดแก้) · false = ไม่ผ่าน validation (แก้ต่อ)

   ย้ายออกมาจาก ActivityPage เพื่อให้หน้า "ตำแหน่ง" ใช้ตัวเดียวกัน (26 ส.ค. 2569
   มติผู้ใช้ — ดินสอต่อท้ายชื่อเหมือนหน้าบทบาท) แก้ที่นี่ที่เดียวมีผลทั้งสองหน้า */
export default function InlineNameEditor({ initial, onSave, onCancel, ariaLabel, minWidth = 240 }) {
  const [draft, setDraft] = useState(initial);
  const submit = (e) => {
    e.preventDefault();
    onSave(draft);
  };
  return (
    <form
      onSubmit={submit}
      onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
      className='inline-flex items-center'
      style={{ gap: 'var(--dim-space-200)', minWidth }}
    >
      <InputField
        autoFocus
        showLabel={false}
        showHelperText={false}
        showLeadingIcon={false}
        size='medium'
        value={draft}
        onChange={setDraft}
        aria-label={ariaLabel}
      />
      {/* ปุ่ม alias จาก DS Icon Button ขนาดเท่ากัน (sm 36×36) —
          ✓ Brand fill (ยืนยัน) · ✕ Neutral Subdue outline */}
      <BrandIconButton icon='check' variant='fill' size='sm' aria-label='บันทึกชื่อ' onClick={submit} />
      <NeutralSubdueIconButton variant='outline' size='sm' aria-label='ยกเลิกการแก้ไขชื่อ' onClick={onCancel}>
        <Icon name='close' size={16} />
      </NeutralSubdueIconButton>
    </form>
  );
}
