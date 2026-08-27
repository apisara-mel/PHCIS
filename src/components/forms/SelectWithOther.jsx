import React from 'react';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';

/* ดรอปดาวน์ที่มีตัวเลือก "อื่นๆ" แล้วต้องระบุเอง (มติผู้ใช้ 27 ส.ค. 69)

   ทะเบียนตัวเลือกไม่มีทางครอบคลุมทุกกรณี — อาชีพแปลก ๆ หรือสถานพยาบาลนอก
   ทะเบียน ถ้าไม่มีทางพิมพ์เองเจ้าหน้าที่จะเลือกอะไรก็ได้ที่ใกล้เคียงแล้วข้อมูล
   ก็เพี้ยนเงียบ ๆ. เลือก "อื่นๆ" แล้วช่องพิมพ์จึงโผล่ขึ้นมาใต้ดรอปดาวน์และ
   บังคับกรอก (ไม่ได้แยกไปอยู่คนละคอลัมน์ เพื่อไม่ให้กริดของฟอร์มขยับ)

   `value` เก็บค่าที่เลือก ส่วน `otherValue` เก็บข้อความที่พิมพ์เอง — แยกกันไว้
   เพื่อให้ยังนับสถิติจาก `value` ได้ และรู้ว่าอันไหนเป็นค่านอกทะเบียน */

export const OTHER_OPTION_VALUE = 'อื่นๆ';

export const isOtherSelected = (value, otherOption = OTHER_OPTION_VALUE) =>
  String(value ?? '') === String(otherOption);

export default function SelectWithOther({
  value,
  onChange,
  otherValue = '',
  onOtherChange,
  options = [],
  otherOption = OTHER_OPTION_VALUE,
  placeholder,
  otherPlaceholder = 'ระบุ',
  otherLabel,
  size = 'lg',
  disabled = false,
  error,
}) {
  const showOther = isOtherSelected(value, otherOption);

  return (
    <div className='flex w-full min-w-0 flex-col' style={{ gap: 'var(--dim-space-200)' }}>
      <Select
        size={size}
        value={value}
        onChange={(next) => {
          onChange?.(next);
          /* เปลี่ยนไปเลือกตัวเลือกในทะเบียน = ข้อความที่พิมพ์ไว้ไม่เกี่ยวแล้ว
             ล้างทิ้ง ไม่งั้นจะถูกบันทึกติดไปทั้งที่ไม่ได้เลือก "อื่นๆ" */
          if (!isOtherSelected(next, otherOption)) onOtherChange?.('');
        }}
        options={options}
        placeholder={placeholder}
        disabled={disabled}
        showLabel={false}
        showHelperText={false}
      />
      {showOther && (
        <InputField
          size={size}
          value={otherValue}
          onChange={onOtherChange}
          placeholder={otherPlaceholder}
          aria-label={otherLabel || otherPlaceholder}
          disabled={disabled}
          error={error}
          showLabel={false}
          showLeadingIcon={false}
          showHelperText={!!error}
        />
      )}
    </div>
  );
}
