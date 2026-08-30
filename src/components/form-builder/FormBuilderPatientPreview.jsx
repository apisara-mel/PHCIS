import React, { useEffect, useRef } from 'react';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Textarea from '@/components/forms/Textarea';
import Select from '@/components/forms/Select';
import Radio from '@/components/radio/Radio';
import Checkbox from '@/components/checkbox/Checkbox';
import BrandButton from '@/components/button/BrandButton';
import FormBuilderSignature from '@/components/form-builder/Signature';
import FormBuilderDragAndDrop from '@/components/form-builder/DragAndDrop';
import { useFormBuilderContext } from '@/components/form-builder/FormBuilderContext';
import { PREVIEW_CONSENT_BODY } from '@/utils/formBuilderModel';

/* Live patient-view preview — syncs with canvas state.

   กรอบมือถือใช้รูปแบบเดียวกับ preview ของการสร้างแบบฟอร์มความยินยอม
   (มติผู้ใช้ 30 ส.ค. 69) — ขอบเครื่องสีเข้ม dynamic island แถบหัวแอป และปุ่ม
   ยืนยันติดขอบล่าง ต่างกันแค่เนื้อหาข้างในซึ่งมาจาก canvas ของ form builder */

const PHONE_W = 300;      /* ความกว้างรวมขอบเครื่อง */
const PHONE_H = 580;      /* ความสูงจอด้านใน */
const PHONE_BEZEL = 10;

const PreviewBlock = ({ block }) => {
  const { type, title, required, fields, options, max } = block;

  if (type === 'divider') {
    return <div style={{ height: 1, background: 'var(--border-neutral-quaternary)', width: '100%' }} />;
  }

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }} data-preview-block={block.id}>
      {title && (
        <span
          style={{
            color: 'var(--text-content-default)',
            fontFamily: 'var(--type-family-heading-content)',
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
            lineHeight: 1.5,
          }}
        >
          {title}
          {required && (
            <span style={{ color: 'var(--text-input-require)', marginLeft: 'var(--dim-space-050)' }}>*</span>
          )}
        </span>
      )}

      {type === 'fields' && fields.map((field) => (
        field.inputType === 'textarea' ? (
          <Textarea
            key={field.id}
            label={field.label}
            required={field.required}
            placeholder={field.placeholder}
            showLeadingIcon={false}
            showHelperText={false}
            size='md'
          />
        ) : (
          <InputField
            key={field.id}
            label={field.label}
            required={field.required}
            placeholder={field.placeholder}
            showLeadingIcon={false}
            showHelperText={false}
            size='md'
            type={field.inputType === 'number' ? 'number' : field.inputType === 'date' ? 'date' : 'text'}
          />
        )
      ))}

      {type === 'radio' && options.map((opt) => (
        <Radio key={opt.id} name={`preview-${block.id}`} label={opt.label} />
      ))}

      {type === 'checkbox' && options.map((opt) => (
        <Checkbox key={opt.id} label={opt.label} />
      ))}

      {type === 'dropdown' && (
        <Select
          label='เลือก'
          placeholder='เลือกตัวเลือก'
          options={options.map((o) => ({ value: o.id, label: o.label }))}
          showHelperText={false}
        />
      )}

      {type === 'rating' && (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-100)' }}>
          {Array.from({ length: max || 5 }, (_, i) => (
            <button
              key={i}
              type='button'
              aria-label={`${i + 1} ดาว`}
              style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
            >
              <Icon name='star' size={28} color='var(--text-content-quaternary)' />
            </button>
          ))}
        </div>
      )}

      {type === 'file' && <FormBuilderDragAndDrop size='sm' />}

      {type === 'signature' && (
        <FormBuilderSignature showFooter={false} style={{ width: '100%' }} />
      )}
    </div>
  );
};

const FormBuilderPatientPreview = () => {
  const { formName, blocks, selectedId, previewScrollKey } = useFormBuilderContext();
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!selectedId || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(`[data-preview-block="${selectedId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedId, previewScrollKey]);

  return (
    <aside
      className='flex flex-col shrink-0 items-center'
      style={{
        width: 448,
        background: 'var(--surface-card-100)',
        borderLeft: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
        borderRadius: 'var(--dim-radius-400, 12px)',
        boxShadow: 'var(--shadow-card)',
        padding: 'var(--dim-space-600)',
        gap: 'var(--dim-space-600)',
      }}
    >
      <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
        <Icon name='visibility' size={16} color='var(--text-topic-tertiary-title)' />
        <span
          style={{
            color: 'var(--text-topic-tertiary-title)',
            fontFamily: 'var(--type-family-heading-content)',
            fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
            fontSize: 'var(--type-size-base)',
          }}
        >
          ตัวอย่างผลลัพธ์ (Patient View)
        </span>
        <div className='flex-1' />
        <span
          className='inline-flex items-center'
          style={{
            gap: 'var(--dim-space-100)',
            paddingTop: '2px', paddingBottom: '2px',
            paddingRight: 'var(--dim-space-200)', paddingLeft: 'var(--dim-space-200)',
            borderRadius: 'var(--dim-radius-full)',
            background: 'var(--surface-statussummarycard-positive, #D1F6EE)',
            color: 'var(--text-statussummarycard-positive-number, #196C65)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
            fontWeight: 'var(--type-weight-medium)',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 'var(--dim-radius-full)', background: 'currentColor' }} />
          Live
        </span>
      </div>

      {/* กรอบเครื่อง — ค่าตัวเลข (มุม 44/34, สีตัวเครื่อง #1D1D1F, เงา) ยกมาจาก
          preview ของใบยินยอมทั้งชุดโดยตั้งใจ เพื่อให้สองที่เป็นเครื่องเดียวกันเป๊ะ
          ตัวเครื่องเป็น device chrome ของภาพจำลอง ไม่ใช่พื้นผิวของ design system
          จึงไม่มี token รองรับ (เช่นเดียวกับต้นฉบับใน CreateConsentFormPage) */}
      <div
        style={{
          width: PHONE_W,
          borderRadius: 44,
          background: '#1D1D1F',
          padding: PHONE_BEZEL,
          boxShadow: '0 20px 48px rgba(8,167,104,0.14)',
        }}
      >
      <div
        style={{
          position: 'relative',
          height: PHONE_H,
          borderRadius: 34,
          background: 'var(--surface-card-100)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* dynamic island */}
        <div
          aria-hidden
          style={{
            position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
            width: 96, height: 24, borderRadius: 'var(--dim-radius-full)',
            background: '#1D1D1F', zIndex: 2,
          }}
        />
        {/* แถบหัวแอป */}
        <div
          className='flex items-center shrink-0'
          style={{
            gap: 'var(--dim-space-200)',
            paddingTop: '40px', paddingBottom: 'var(--dim-space-300)',
            paddingRight: 'var(--dim-space-400)', paddingLeft: 'var(--dim-space-400)',
            borderBottom: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
          }}
        >
          <Icon name='arrow_back_ios_new' size={16} color='var(--text-content-secondary)' />
          <span
            style={{
              flex: 1,
              textAlign: 'center',
              color: 'var(--text-content-default)',
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-sm)',
            }}
          >
            เอกสาร e-document
          </span>
          <span style={{ width: 16 }} />
        </div>

        <div
          ref={scrollRef}
          className='flex flex-col flex-1 min-h-0 overflow-y-auto scrollbar-thin'
          style={{
            padding: 'var(--dim-space-400)',
            gap: 'var(--dim-space-400)',
            background: 'var(--background-screen-brand-100)',
          }}
        >
          <div
            style={{
              background: 'var(--surface-brandPrimary-default)',
              borderRadius: 'var(--dim-radius-300)',
              padding: 'var(--dim-space-400)',
            }}
          >
            <span
              style={{
                color: 'var(--text-brandPrimary-on-brand)',
                fontFamily: 'var(--type-family-heading-content)',
                fontSize: 'var(--type-size-sm)',
                fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                lineHeight: 1.5,
              }}
            >
              {formName || 'ชื่อแบบฟอร์ม'}
            </span>
          </div>

          <p
            style={{
              color: 'var(--text-content-secondary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {PREVIEW_CONSENT_BODY}
          </p>

          {blocks.map((block) => (
            <PreviewBlock key={block.id} block={block} />
          ))}
        </div>

        <div
          className='shrink-0'
          style={{
            paddingTop: 'var(--dim-space-300)', paddingBottom: 'var(--dim-space-300)',
            paddingRight: 'var(--dim-space-400)', paddingLeft: 'var(--dim-space-400)',
            borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            background: 'var(--surface-card-100)',
          }}
        >
          {/* ตัวอย่างในเครื่องมือถือ — ปุ่มกดไม่ได้ (ดูเหมือนของจริงแต่ inert) */}
          <BrandButton
            variant='fill'
            size='md'
            tabIndex={-1}
            aria-hidden
            style={{ width: '100%', pointerEvents: 'none' }}
          >
            ยืนยันความยินยอม
          </BrandButton>
        </div>
      </div>
      </div>

      <span
        style={{
          color: 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
          textAlign: 'center',
        }}
      >
        มุมมองที่ผู้ป่วยจะเห็นบนอุปกรณ์มือถือ
      </span>
    </aside>
  );
};

export default FormBuilderPatientPreview;
