import React from 'react';
import FieldControl, { FULL_WIDTH_TYPES } from '@/components/forms/FormFieldControl';

/* ตัวอย่างโครงสร้างแบบฟอร์ม — วาดด้วยคอมโพเนนต์ฟอร์มของ design system ชุด
   เดียวกับหน้ากรอกจริง (มติผู้ใช้ 30 ส.ค. 69) ของเดิมเป็นลิสต์ทำมือ: แถวสีเทา
   + พิลล์ TEXT/DATE/CHECKBOX ซึ่งไม่ได้บอกว่าผู้ใช้จะเจอหน้าตาแบบไหนจริง ๆ
   และไอคอน `form` ก็ไม่มีในชุดไอคอน เลยขึ้นเป็นคำว่า "FORM" ทับป้ายกำกับ

   ตัวอย่างนี้กดไม่ได้ (`pointer-events: none` + `aria-hidden`) เหมือนตัวอย่าง
   ในเครื่องมือถือของใบยินยอม — ดูเหมือนของจริงแต่ไม่รับค่า
   ใช้ร่วมกันระหว่างป๊อปอัปรายละเอียดกับหน้า `/forms/:slug` */

/** สรุปจำนวนช่องทั้งหมดของแบบฟอร์ม */
export const countFields = (form) =>
  (form?.sections ?? []).reduce((sum, s) => sum + (s.fields?.length ?? 0), 0);

export const SectionBlock = ({ section, index }) => (
  <section className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
    <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
      <span
        className='inline-flex items-center justify-center shrink-0'
        style={{
          width: 28,
          height: 28,
          borderRadius: 'var(--dim-radius-full)',
          background: 'var(--surface-brandPrimary-default)',
          color: 'var(--text-brandPrimary-on-brand, #FFFFFF)',
          fontFamily: 'var(--type-family-body)',
          fontWeight: 'var(--type-weight-bold)',
          fontSize: 'var(--type-size-xs)',
        }}
      >
        {index + 1}
      </span>
      <h3 className='text-base font-bold text-ink'>{section.title}</h3>
      <span className='text-xs text-ink-tertiary'>{section.fields.length} ช่อง</span>
    </div>

    <div
      aria-hidden
      className='grid w-full grid-cols-1 md:grid-cols-2'
      style={{
        columnGap: 'var(--dim-space-500)',
        rowGap: 'var(--dim-space-400)',
        pointerEvents: 'none',
      }}
    >
      {section.fields.map((field, i) => (
        <div
          key={`${index}-${i}`}
          className={`flex flex-col min-w-0 ${FULL_WIDTH_TYPES.has(field.type) ? 'md:col-span-2' : ''}`}
        >
          <FieldControl
            field={field}
            fieldKey={`preview-s${index}-f${i}`}
            value={undefined}
            onChange={() => {}}
          />
        </div>
      ))}
    </div>
  </section>
);

/** บล็อก "โครงสร้างแบบฟอร์ม" ทั้งก้อน — หัวข้อ + คำอธิบาย + ทุกส่วน */
export default function FormStructurePreview({ form, heading = 'โครงสร้างแบบฟอร์ม' }) {
  if (!form) return null;
  const fieldCount = countFields(form);
  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
        <h2 className='text-base font-bold text-brand-500'>{heading}</h2>
        <p className='text-xs text-ink-tertiary'>
          หน้าตาช่องกรอกที่ผู้ป่วยและเจ้าหน้าที่จะเห็นจริง ทั้งหมด {fieldCount} ช่อง
          แบ่งเป็น {form.sections.length} ส่วน (ตัวอย่าง — กรอกไม่ได้)
        </p>
      </div>
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>
        {form.sections.map((section, i) => (
          <SectionBlock key={i} section={section} index={i} />
        ))}
      </div>
    </div>
  );
}
