import React from 'react';
import InputField from '@/components/forms/InputField';
import Textarea from '@/components/forms/Textarea';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import Checkbox from '@/components/checkbox/Checkbox';
import RadioGroup from '@/components/radio/RadioGroup';
import ESignatureField from '@/components/form-builder/ESignatureField';

/* ── ตัวควบคุมช่องกรอก — ใช้คอมโพเนนต์จาก design system ทั้งหมด ──────────
   (มติผู้ใช้ 30 ส.ค. 69) เดิมเป็น <input>/<select>/<textarea> เปล่าที่ทาสีเอง
   จาก token ทำให้ไม่มี state hover/focus/error ป้ายกำกับ และ dropdown แบบ
   เดียวกับที่อื่นในระบบ · ตอนนี้ทุกชนิดช่อง map ไปที่คอมโพเนนต์ DS:
     text → InputField · textarea → Textarea · date → DatePicker
     select → Select · checkbox → Checkbox · radio → RadioGroup
     signature → ESignatureField
   เหลือเพียง slider 0-10 ที่ยังไม่มีคอมโพเนนต์ใน DS จึงใช้ <input type=range>
   ที่ทาสีด้วย token แล้วครอบด้วยหัวข้อชุดเดียวกับช่องอื่น */

export const RADIO_4_OPTIONS = [
  { value: 0, label: 'ไม่เลย' },
  { value: 1, label: 'บางวัน' },
  { value: 2, label: 'มากกว่าครึ่ง' },
  { value: 3, label: 'เกือบทุกวัน' },
];

export const RADIO_5_OPTIONS = [
  { value: 1, label: 'น้อยที่สุด' },
  { value: 2, label: 'น้อย' },
  { value: 3, label: 'ปานกลาง' },
  { value: 4, label: 'มาก' },
  { value: 5, label: 'มากที่สุด' },
];

export const SELECT_FALLBACK = [
  { value: 'option1', label: 'ตัวเลือกที่ 1' },
  { value: 'option2', label: 'ตัวเลือกที่ 2' },
  { value: 'option3', label: 'ตัวเลือกที่ 3' },
];

/* ช่องที่ต้องกินเต็มแถวในกริดสองคอลัมน์ — ข้อความยาว กลุ่มตัวเลือก และลายเซ็น */
export const FULL_WIDTH_TYPES = new Set(['textarea', 'signature', 'radio-4', 'radio-5', 'slider-0-10']);

const toDateValue = (v) => {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

const toISODate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
};

/* หัวข้อของช่องที่คอมโพเนนต์ DS ไม่ได้วาดป้ายกำกับให้เอง (ลายเซ็น · สไลเดอร์) */
export const FieldLabel = ({ field }) => (
  <span
    className='text-sm'
    style={{
      color: 'var(--text-input-label, var(--text-content-primary))',
      fontFamily: 'var(--type-family-body)',
      fontWeight: 'var(--type-weight-medium)',
    }}
  >
    {field.label}
    {field.required && (
      <span style={{ color: 'var(--text-input-require)', marginLeft: 'var(--dim-space-050)' }}>*</span>
    )}
  </span>
);

const PainSlider = ({ value, onChange }) => {
  const num = typeof value === 'number' ? value : 0;
  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
      <div className='flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
        <span className='text-xs text-ink-tertiary' style={{ minWidth: 24 }}>0</span>
        <input
          type='range'
          min={0}
          max={10}
          step={1}
          value={num}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ flex: 1, accentColor: 'var(--surface-brandPrimary-default)' }}
        />
        <span className='text-xs text-ink-tertiary' style={{ minWidth: 24, textAlign: 'right' }}>10</span>
      </div>
      <span className='text-sm font-bold' style={{ color: 'var(--text-brandPrimary-default)' }}>
        ระดับที่เลือก: {num}
      </span>
    </div>
  );
};

export default function FieldControl({ field, fieldKey, value, onChange }) {
  const shared = {
    label: field.label,
    required: field.required,
    showHelperText: false,
    size: 'md',
  };

  switch (field.type) {
    case 'textarea':
      return (
        <Textarea
          {...shared}
          placeholder={field.placeholder || `กรอก${field.label}`}
          value={value || ''}
          onChange={(next) => onChange(typeof next === 'string' ? next : next?.target?.value ?? '')}
          rows={3}
        />
      );

    case 'date':
      return (
        <DatePicker
          {...shared}
          placeholder='วัน เดือน ปี'
          value={toDateValue(value)}
          onChange={(d) => onChange(toISODate(d))}
        />
      );

    case 'datetime':
      return (
        <InputField
          {...shared}
          showLeadingIcon={false}
          type='datetime-local'
          value={value || ''}
          onChange={(next) => onChange(typeof next === 'string' ? next : next?.target?.value ?? '')}
        />
      );

    case 'select':
      return (
        <Select
          {...shared}
          placeholder='เลือกตัวเลือก'
          /* ตัวเลือกส่วนใหญ่เป็นข้อความยาวและมีไม่กี่ข้อ — ปิดช่องพิมพ์ค้นหา
             เพื่อให้กดเลือกอย่างเดียว ไม่หลงพิมพ์ทับค่าที่เลือกไว้ */
          searchable={(field.options || SELECT_FALLBACK).length > 8}
          options={field.options || SELECT_FALLBACK}
          value={value ?? ''}
          onChange={(next) => onChange(typeof next === 'string' ? next : next?.target?.value ?? '')}
        />
      );

    case 'checkbox':
      return (
        <span className='inline-flex items-start' style={{ gap: 'var(--dim-space-050)' }}>
          <Checkbox
            label={field.label}
            checked={!!value}
            onChange={(next) => onChange(typeof next === 'boolean' ? next : !!next?.target?.checked)}
          />
          {field.required && (
            <span style={{ color: 'var(--text-input-require)' }}>*</span>
          )}
        </span>
      );

    case 'radio-4':
    case 'radio-5':
      return (
        <RadioGroup
          legend={field.label}
          required={field.required}
          name={fieldKey}
          direction='row'
          options={field.type === 'radio-4' ? RADIO_4_OPTIONS : RADIO_5_OPTIONS}
          value={value}
          onChange={(next) => onChange(next)}
        />
      );

    case 'signature':
      return (
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <FieldLabel field={field} />
          <ESignatureField value={typeof value === 'string' ? value : ''} onChange={onChange} />
        </div>
      );

    case 'slider-0-10':
      return (
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <FieldLabel field={field} />
          <PainSlider value={value} onChange={onChange} />
        </div>
      );

    default:
      return (
        <InputField
          {...shared}
          showLeadingIcon={false}
          placeholder={field.placeholder || `กรอก${field.label}`}
          value={value || ''}
          onChange={(next) => onChange(typeof next === 'string' ? next : next?.target?.value ?? '')}
        />
      );
  }
}

