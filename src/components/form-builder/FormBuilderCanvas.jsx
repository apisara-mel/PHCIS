import React, { useState } from 'react';
import Textarea from '@/components/forms/Textarea';
import Icon from '@/components/icons/Icon';
import FormBuilderCanvasBlock from '@/components/form-builder/FormBuilderCanvasBlock';
import { useFormBuilderContext } from '@/components/form-builder/FormBuilderContext';
import { DND_BLOCK_ID, DND_KIND, parseDropPayload } from '@/utils/formBuilderModel';

/* Center canvas — drop targets, reorder, editable form name. */

const ADD_QUESTION_STYLE = {
  background: 'var(--surface-modal-default)',
  border: 'var(--dim-stroke-100) dashed var(--border-neutral-tertiary)',
  borderRadius: 'var(--dim-radius-200)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-300)',
  gap: 'var(--dim-space-200)',
  cursor: 'pointer',
};

const DropIndicator = ({ active }) => (
  <div
    aria-hidden
    style={{
      height: active ? 4 : 0,
      borderRadius: 'var(--dim-radius-full)',
      background: active ? 'var(--border-brandPrimary-default)' : 'transparent',
      transition: 'height 120ms ease',
      margin: active ? 'var(--dim-space-100) 0' : 0,
    }}
  />
);

const FormBuilderCanvas = () => {
  const {
    formName, setFormName, blocks, selectedId, setSelectedId,
    insertBlock, reorderBlocks,
  } = useFormBuilderContext();

  const [dropIndex, setDropIndex] = useState(null);
  const [grabBlockId, setGrabBlockId] = useState(null);
  const [dragBlockId, setDragBlockId] = useState(null);

  const resetDrag = () => {
    setDropIndex(null);
    setGrabBlockId(null);
    setDragBlockId(null);
  };

  const acceptDrop = (e) => {
    const types = Array.from(e.dataTransfer?.types || []);
    const ok = types.includes(DND_KIND) || types.includes(DND_BLOCK_ID);
    if (ok) {
      e.preventDefault();
      e.dataTransfer.dropEffect = types.includes(DND_KIND) ? 'copy' : 'move';
    }
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    const payload = parseDropPayload(e.dataTransfer);
    if (!payload) { resetDrag(); return; }
    if (payload.source === 'palette') insertBlock(payload.kind, index);
    else if (payload.source === 'reorder') reorderBlocks(payload.blockId, index);
    resetDrag();
  };

  return (
    <div
      className='flex flex-col flex-1 min-w-0'
      style={{ gap: 'var(--dim-space-400)', minWidth: 480 }}
      onDragOver={acceptDrop}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setDropIndex(null);
      }}
    >
      <section
        className='w-full'
        style={{
          background: 'var(--surface-card-100)',
          borderRadius: 'var(--dim-radius-400, 12px)',
          boxShadow: 'var(--shadow-card)',
          padding: 'var(--dim-space-600)',
        }}
      >
        <Textarea
          label='ชื่อแบบฟอร์ม'
          required
          value={formName}
          onChange={setFormName}
          showHelperText={false}
          minHeight={96}
          resize='none'
        />
      </section>

      <DropIndicator active={dropIndex === 0} />
      <div
        onDragOver={(e) => { acceptDrop(e); setDropIndex(0); }}
        onDrop={(e) => handleDrop(e, 0)}
        style={{ height: dropIndex === 0 ? undefined : 0 }}
      />

      {blocks.map((block, index) => (
        <React.Fragment key={block.id}>
          <FormBuilderCanvasBlock
            block={block}
            focused={selectedId === block.id}
            isDragging={dragBlockId === block.id}
            draggable={grabBlockId === block.id}
            onSelect={() => setSelectedId(block.id)}
            onGrabStart={() => setGrabBlockId(block.id)}
            onGrabEnd={() => setGrabBlockId(null)}
            onDragStart={(e) => {
              setDragBlockId(block.id);
              e.dataTransfer.setData(DND_BLOCK_ID, block.id);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragEnd={resetDrag}
            onDragOver={(e) => {
              acceptDrop(e);
              if (dropIndex !== index + 1) setDropIndex(index + 1);
            }}
            onDrop={(e) => handleDrop(e, index + 1)}
          />
          <DropIndicator active={dropIndex === index + 1} />
        </React.Fragment>
      ))}

      <button
        type='button'
        className='flex items-center justify-center w-full'
        style={ADD_QUESTION_STYLE}
        aria-label='เพิ่มคำถาม'
        onClick={() => insertBlock('text')}
        onDragOver={(e) => { acceptDrop(e); setDropIndex(blocks.length); }}
        onDrop={(e) => handleDrop(e, blocks.length)}
      >
        <Icon name='add_circle' size={24} color='var(--text-brandPrimary-default)' />
        <span
          style={{
            color: 'var(--text-brandPrimary-default)',
            fontFamily: 'var(--type-family-heading-content)',
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
            lineHeight: 1.5,
          }}
        >
          เพิ่มคำถาม
        </span>
      </button>
    </div>
  );
};

export default FormBuilderCanvas;
