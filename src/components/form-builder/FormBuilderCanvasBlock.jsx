import React from 'react';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Textarea from '@/components/forms/Textarea';
import Radio from '@/components/radio/Radio';
import Checkbox from '@/components/checkbox/Checkbox';
import Switch from '@/components/switch/Switch';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import FormBuilderSignature from '@/components/form-builder/Signature';
import FormBuilderDragAndDrop from '@/components/form-builder/DragAndDrop';
import { useFormBuilderContext } from '@/components/form-builder/FormBuilderContext';

/* Interactive canvas block — edit, duplicate, delete, reorder handle. */

const BLOCK_SHADOW = 'var(--shadow-card)';

const BuilderBadge = ({ children }) => (
  <span
    className='inline-flex items-center justify-center shrink-0'
    style={{
      height: 'var(--dim-size-500, 24px)',
      maxWidth: 224,
      padding: 'var(--dim-space-100) var(--dim-space-200)',
      borderRadius: 'var(--dim-radius-full)',
      background: 'var(--surface-brandPrimary-tertiary)',
      color: 'var(--text-brandPrimary-default)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-xs)',
      fontWeight: 'var(--type-weight-medium)',
      lineHeight: 1.5,
    }}
  >
    {children}
  </span>
);

const BlockDivider = () => (
  <div style={{ height: 1, width: '100%', background: 'var(--border-neutral-quaternary)' }} />
);

const FormBuilderCanvasBlock = ({
  block,
  focused,
  isDragging,
  draggable,
  onSelect,
  onGrabStart,
  onGrabEnd,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}) => {
  const {
    blocks,
    updateBlock,
    removeBlock,
    duplicateBlock,
    addOption,
    updateOption,
    removeOption,
  } = useFormBuilderContext();

  const {
    id, badge, title, required, type, fields, options, showAddOption, max,
  } = block;

  if (type === 'divider') {
    return (
      <div
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={onSelect}
        className='flex flex-col w-full'
        style={{
          padding: 'var(--dim-space-200) 0',
          opacity: isDragging ? 0.45 : 1,
          borderLeft: focused ? '6px solid var(--border-brandPrimary-default)' : 'none',
          paddingLeft: focused ? 'var(--dim-space-200)' : 0,
        }}
      >
        <div className='flex justify-center w-full' style={{ marginBottom: 'var(--dim-space-100)' }}>
          <span
            role='button'
            tabIndex={0}
            title='ลากเพื่อจัดลำดับ'
            onMouseDown={(e) => { e.stopPropagation(); onGrabStart(); }}
            onMouseUp={(e) => { e.stopPropagation(); onGrabEnd(); }}
            onMouseLeave={onGrabEnd}
            onTouchStart={(e) => { e.stopPropagation(); onGrabStart(); }}
            onTouchEnd={onGrabEnd}
            style={{ color: 'var(--text-content-quaternary)', cursor: 'grab', lineHeight: 0, touchAction: 'none' }}
          >
            <Icon name='drag_indicator' size={20} className='rotate-90' />
          </span>
        </div>
        <div style={{ height: 1, background: 'var(--border-neutral-quaternary)' }} />
      </div>
    );
  }

  return (
    <article
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onSelect}
      className='flex flex-col w-full'
      style={{
        background: 'var(--surface-card-100)',
        borderRadius: 'var(--dim-radius-400, 12px)',
        boxShadow: BLOCK_SHADOW,
        borderLeft: focused ? '6px solid var(--border-brandPrimary-default)' : 'none',
        paddingTop: 'var(--dim-space-400)',
        paddingBottom: 'var(--dim-space-600)',
        paddingLeft: 'var(--dim-space-600)',
        paddingRight: 'var(--dim-space-600)',
        gap: 'var(--dim-space-400)',
        opacity: isDragging ? 0.45 : 1,
        transition: 'opacity 120ms ease, border-color 120ms ease',
        cursor: 'default',
      }}
    >
      <div className='flex justify-center w-full'>
        <span
          role='button'
          tabIndex={0}
          title='ลากเพื่อจัดลำดับ'
          onMouseDown={(e) => { e.stopPropagation(); onGrabStart(); }}
          onMouseUp={(e) => { e.stopPropagation(); onGrabEnd(); }}
          onMouseLeave={onGrabEnd}
          onTouchStart={(e) => { e.stopPropagation(); onGrabStart(); }}
          onTouchEnd={onGrabEnd}
          style={{ color: 'var(--text-content-quaternary)', cursor: 'grab', lineHeight: 0, touchAction: 'none' }}
        >
          <Icon name='drag_indicator' size={24} className='rotate-90' />
        </span>
      </div>

      <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-600)' }}>
        <div className='flex-1 min-w-0'>
          <BuilderBadge>{badge}</BuilderBadge>
        </div>
        <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-200)' }}>
          <NeutralSubdueIconButton
            icon='content_copy'
            variant='outline'
            size='sm'
            aria-label='คัดลอก'
            onClick={(e) => { e.stopPropagation(); duplicateBlock(id); }}
          />
          <NeutralSubdueIconButton
            icon='delete'
            variant='outline'
            size='sm'
            aria-label='ลบ'
            disabled={blocks.length <= 1}
            onClick={(e) => { e.stopPropagation(); removeBlock(id); }}
          />
        </div>
      </div>

      <BlockDivider />

      {focused ? (
        <InputField
          label='หัวข้อคำถาม'
          value={title}
          onChange={(v) => updateBlock(id, { title: v })}
          showLeadingIcon={false}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-100)' }}>
          <span
            style={{
              color: 'var(--text-content-default)',
              fontFamily: 'var(--type-family-heading-content)',
              fontSize: 'var(--type-size-base)',
              fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
              lineHeight: 1.5,
            }}
          >
            {title || 'ไม่มีหัวข้อ'}
          </span>
          <Icon name='edit' size={16} color='var(--text-content-tertiary)' />
        </div>
      )}

      {type === 'fields' && (
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
          {fields.map((field) => (
            field.inputType === 'textarea' ? (
              <Textarea
                key={field.id}
                label={field.label}
                required={field.required}
                placeholder={field.placeholder}
                value=''
                readOnly
                showHelperText={false}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <InputField
                key={field.id}
                label={field.label}
                required={field.required}
                placeholder={field.placeholder}
                showLeadingIcon={false}
                type={field.inputType === 'number' ? 'number' : field.inputType === 'date' ? 'date' : 'text'}
                value=''
                readOnly
                onClick={(e) => e.stopPropagation()}
              />
            )
          ))}
        </div>
      )}

      {type === 'radio' && (
        <div className='flex flex-col w-full' onClick={(e) => e.stopPropagation()}>
          {options.map((opt) => (
            <OptionRow
              key={opt.id}
              type='radio'
              label={opt.label}
              editable={focused}
              onLabelChange={(label) => updateOption(id, opt.id, label)}
              onRemove={() => removeOption(id, opt.id)}
              canRemove={options.length > 1}
            />
          ))}
          <BrandSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='add'
            className='self-start'
            style={{ marginTop: 'var(--dim-space-200)' }}
            onClick={() => addOption(id)}
          >
            เพิ่มตัวเลือก
          </BrandSubdueButton>
        </div>
      )}

      {(type === 'checkbox' || type === 'dropdown') && (
        <div className='flex flex-col w-full' onClick={(e) => e.stopPropagation()}>
          {options.map((opt) => (
            <OptionRow
              key={opt.id}
              type={type === 'dropdown' ? 'radio' : 'checkbox'}
              label={opt.label}
              editable={focused}
              onLabelChange={(label) => updateOption(id, opt.id, label)}
              onRemove={() => removeOption(id, opt.id)}
              canRemove={options.length > 1}
            />
          ))}
          {(showAddOption || type === 'dropdown') && (
            <BrandSubdueButton
              variant='outline'
              size='sm'
              leadingIcon='add'
              className='self-start'
              style={{ marginTop: 'var(--dim-space-200)' }}
              onClick={() => addOption(id)}
            >
              เพิ่มตัวเลือก
            </BrandSubdueButton>
          )}
        </div>
      )}

      {type === 'rating' && (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-100)' }} onClick={(e) => e.stopPropagation()}>
          {Array.from({ length: max || 5 }, (_, i) => (
            <Icon key={i} name='star' size={24} color='var(--text-content-quaternary)' />
          ))}
        </div>
      )}

      {type === 'file' && (
        <div onClick={(e) => e.stopPropagation()}>
          <FormBuilderDragAndDrop />
        </div>
      )}

      {type === 'signature' && (
        <div onClick={(e) => e.stopPropagation()}>
          <FormBuilderSignature showFooter={false} style={{ width: 323, maxWidth: '100%' }} />
        </div>
      )}

      <BlockDivider />

      <div
        className='flex items-center justify-end w-full'
        style={{ gap: 'var(--dim-space-600)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <NeutralSubdueIconButton
            icon='content_copy'
            variant='outline'
            size='sm'
            aria-label='คัดลอก'
            onClick={() => duplicateBlock(id)}
          />
          <NeutralSubdueIconButton
            icon='delete'
            variant='outline'
            size='sm'
            aria-label='ลบ'
            disabled={blocks.length <= 1}
            onClick={() => removeBlock(id)}
          />
        </div>
        <div style={{ width: 1, height: 24, background: 'var(--background-screen-300)' }} />
        <div className='flex items-end' style={{ gap: 'var(--dim-space-300)' }}>
          <Switch
            checked={required}
            onChange={(v) => updateBlock(id, { required: v })}
            aria-label='จำเป็นต้องระบุ'
          />
          <span
            style={{
              color: 'var(--text-content-default)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              lineHeight: 1.5,
            }}
          >
            จำเป็นต้องระบุ
          </span>
        </div>
      </div>
    </article>
  );
};

const OptionRow = ({
  type, label, editable, onLabelChange, onRemove, canRemove,
}) => (
  <div
    className='flex items-start w-full'
    style={{
      gap: 'var(--dim-space-400)',
      paddingTop: 'var(--dim-space-400)',
      paddingBottom: 'var(--dim-space-400)',
      borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
    }}
  >
    <div className='flex flex-1 min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
      {editable ? (
        <InputField
          value={label}
          onChange={(v) => onLabelChange(v)}
          showLabel={false}
          showHelperText={false}
          showLeadingIcon={false}
          placeholder='ชื่อตัวเลือก'
        />
      ) : type === 'radio' ? (
        <Radio label={label} disabled />
      ) : (
        <Checkbox label={label} disabled />
      )}
    </div>
    {editable && canRemove && (
      <NeutralSubdueIconButton
        icon='delete'
        variant='outline'
        size='sm'
        aria-label='ลบตัวเลือก'
        onClick={onRemove}
      />
    )}
    <Icon name='drag_indicator' size={20} color='var(--text-content-quaternary)' />
  </div>
);

export default FormBuilderCanvasBlock;
