import React from 'react';
import FormBuilderPalette from '@/components/form-builder/FormBuilderPalette';
import FormBuilderCanvas from '@/components/form-builder/FormBuilderCanvas';
import FormBuilderPatientPreview from '@/components/form-builder/FormBuilderPatientPreview';

/* Three-column Form Builder workspace — Figma "Form Buider" (24:10443). */

const FormBuilderWorkspace = () => (
  <div className='w-full overflow-x-auto'>
    <div
      className='flex items-start'
      style={{
        gap: 'var(--dim-space-600)',
        padding: 'var(--dim-space-600)',
        width: 'max-content',
        maxWidth: '100%',
        minWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      <FormBuilderPalette />
      <FormBuilderCanvas />
      <FormBuilderPatientPreview />
    </div>
  </div>
);

export default FormBuilderWorkspace;
