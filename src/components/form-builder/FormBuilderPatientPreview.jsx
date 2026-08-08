import React, { useEffect, useRef } from 'react';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Textarea from '@/components/forms/Textarea';
import Select from '@/components/forms/Select';
import Radio from '@/components/radio/Radio';
import Checkbox from '@/components/checkbox/Checkbox';
import BrandButton from '@/components/button/BrandButton';
import StatusBadge from '@/components/badge/StatusBadge';
import FormBuilderSignature from '@/components/form-builder/Signature';
import FormBuilderDragAndDrop from '@/components/form-builder/DragAndDrop';
import { useFormBuilderContext } from '@/components/form-builder/FormBuilderContext';
import { PREVIEW_CONSENT_BODY } from '@/utils/formBuilderModel';

/* Live patient-view preview — syncs with canvas state. */

const PHONE_W = 320;
const PHONE_H = 654;

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
        minHeight: 829,
        background: 'var(--surface-card-100)',
        borderLeft: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
        borderRadius: 'var(--dim-radius-400, 12px)',
        boxShadow: 'var(--shadow-card)',
        padding: 'var(--dim-space-600)',
        gap: 'var(--dim-space-600)',
      }}
    >
      <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-600)' }}>
        <div className='flex items-center flex-1 min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
          <Icon name='visibility' size={16} color='var(--text-brandSecondary-default)' />
          <span
            style={{
              color: 'var(--text-brandSecondary-default)',
              fontFamily: 'var(--type-family-heading-content)',
              fontSize: 'var(--type-size-sm)',
              fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
              lineHeight: 1.5,
            }}
          >
            ตัวอย่างผลลัพธ์ (Patient View)
          </span>
        </div>
        <StatusBadge style='success' size='small'>Live</StatusBadge>
      </div>

      <div
        style={{
          width: PHONE_W,
          height: PHONE_H,
          borderRadius: 'var(--dim-radius-500, 16px)',
          border: 'var(--dim-stroke-200, 2px) solid var(--border-neutral-tertiary)',
          background: 'var(--surface-card-100)',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ height: 44, background: 'var(--surface-brandPrimary-default)', flexShrink: 0 }} />

        <div
          ref={scrollRef}
          className='flex flex-col flex-1 min-h-0 overflow-y-auto'
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
          style={{
            padding: 'var(--dim-space-400)',
            borderTop: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
            background: 'var(--surface-card-100)',
            flexShrink: 0,
          }}
        >
          <BrandButton variant='fill' size='md' className='w-full'>
            ยืนยันความยินยอม
          </BrandButton>
        </div>
      </div>
    </aside>
  );
};

export default FormBuilderPatientPreview;
