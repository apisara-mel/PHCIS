import React from 'react';
import FormBuilderContent from '@/components/form-builder/Content';
import { useFormBuilderContext } from '@/components/form-builder/FormBuilderContext';
import { FORM_BUILDER_PALETTE, DND_KIND } from '@/utils/formBuilderModel';

/* Left palette — drag or click to insert blocks onto the canvas. */

const GROUP_LABEL = {
  color: 'var(--text-content-secondary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};

const startPaletteDrag = (e, kind) => {
  e.dataTransfer.setData(DND_KIND, kind);
  e.dataTransfer.effectAllowed = 'copy';
};

const FormBuilderPalette = () => {
  const { insertBlock } = useFormBuilderContext();

  return (
    <aside
      className='flex flex-col shrink-0'
      style={{
        width: 256,
        background: 'var(--surface-card-100)',
        borderRight: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
        padding: 'var(--dim-space-600) var(--dim-space-400)',
        gap: 'var(--dim-space-400)',
      }}
    >
      <span
        style={{
          color: 'var(--text-content-default)',
          fontFamily: 'var(--type-family-heading-content)',
          fontSize: 'var(--type-size-base)',
          fontWeight: 'var(--type-weight-bold)',
          lineHeight: 1.5,
        }}
      >
        ส่วนประกอบ
      </span>

      {FORM_BUILDER_PALETTE.map((section) => (
        <div key={section.group} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <span style={GROUP_LABEL}>{section.group}</span>
          {section.items.map((item) => (
            <FormBuilderContent
              key={`${section.group}-${item.kind}`}
              icon={item.icon}
              label={item.label}
              sublabel={item.sublabel}
              width='100%'
              draggable
              onDragStart={(e) => startPaletteDrag(e, item.kind)}
              onClick={() => insertBlock(item.kind)}
            />
          ))}
        </div>
      ))}
    </aside>
  );
};

export default FormBuilderPalette;
