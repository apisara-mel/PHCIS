import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import FormBuilderDragAndDrop from '@/components/form-builder/DragAndDrop';
import FormBuilderWorkspace from '@/components/form-builder/FormBuilderWorkspace';
import { FormBuilderProvider, useFormBuilderContext } from '@/components/form-builder/FormBuilderContext';
import useFormBuilder from '@/hooks/useFormBuilder';
import { formatLastSaved } from '@/utils/formBuilderModel';
import SuccessScreen from '@/components/layout/SuccessScreen';

/* PHCIS | Assess-control — สร้างแบบฟอร์มใหม่ (Figma 0EDfjwf1 · 26:1747).
   Interactive form builder: palette drag/click · canvas reorder · live preview. */

const breadcrumb = ['คลังแบบฟอร์ม', 'สร้างแบบฟอร์มใหม่'];

const COVER_CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-400, 12px)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600)',
  gap: 'var(--dim-space-400)',
};

const SECTION_TITLE = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-heading-content)',
  fontSize: 'var(--type-size-base)',
  fontWeight: 'var(--type-weight-bold)',
  lineHeight: 1.5,
};

function CreateDocTemplatePageInner() {
  const history = useHistory();
  const {
    coverFiles, setCoverFiles, lastSaved, saveDraft, publish,
    scrollPreviewToBlock, selectedId,
  } = useFormBuilderContext();
  const [published, setPublished] = useState(false);
  const [publishResult, setPublishResult] = useState(null);

  const handleSave = () => saveDraft();

  const handlePublish = () => {
    const result = publish();
    setPublishResult(result);
    setPublished(true);
  };

  if (published) {
    return (
      <SuccessScreen
        title={publishResult?.formName
          ? `คุณเผยแพร่แบบฟอร์ม “${publishResult.formName}” สำเร็จ`
          : 'คุณเผยแพร่แบบฟอร์มสำเร็จ'}
        buttonLabel='คลังแบบฟอร์ม'
        lottieSize={256}
        onDone={() => history.push('/forms')}
      />
    );
  }

  return (
    <QueuePageShell
      activeKey='consent'
      brandTitle='ระบบ PHCIS'
      breadcrumb={breadcrumb}
      title='สร้างแบบฟอร์มใหม่'
      onBack={() => history.push('/forms')}
      actions={(
        <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>
          V 1.2
        </ColorfulBadge>
      )}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ paddingBottom: 96 }}>
        <section
          className='flex flex-col w-full'
          style={{
            ...COVER_CARD,
            margin: 'var(--dim-space-600)',
            marginBottom: 0,
          }}
        >
          <span style={SECTION_TITLE}>รูปหน้าปก</span>
          <FormBuilderDragAndDrop
            value={coverFiles}
            onChange={setCoverFiles}
            preview
            multiple={false}
            accept='image/png,image/jpeg,application/pdf'
            style={{ maxWidth: 640 }}
          />
        </section>

        <FormBuilderWorkspace />

        <div
          className='sticky bottom-0 z-10 flex items-center w-full'
          style={{
            background: 'var(--surface-navigation-default)',
            borderTop: 'var(--dim-stroke-100) solid var(--border-brandSecondary-quaternary)',
            boxShadow: 'var(--shadow-header)',
            padding: 'var(--dim-space-400) var(--dim-space-600)',
            gap: 'var(--dim-space-600)',
          }}
        >
          <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 'var(--dim-radius-100, 4px)',
                background: 'var(--surface-positive-secondary)',
                opacity: 0.74,
                flexShrink: 0,
              }}
            />
            <span
              className='truncate'
              style={{
                color: 'var(--text-content-secondary)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
                lineHeight: 1.5,
              }}
            >
              ร่างแบบฟอร์ม (บันทึกล่าสุด: {formatLastSaved(lastSaved)})
            </span>
          </div>
          <div className='flex-1' />
          <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-300)' }}>
            <BrandSubdueButton
              variant='outline'
              size='lg'
              leadingIcon='visibility'
              onClick={() => { if (selectedId) scrollPreviewToBlock(selectedId); }}
            >
              ดูตัวอย่าง
            </BrandSubdueButton>
            <BrandSubdueButton variant='outline' size='lg' leadingIcon='save' onClick={handleSave}>
              บันทึกร่าง
            </BrandSubdueButton>
            <BrandButton variant='fill' size='lg' leadingIcon='send' onClick={handlePublish}>
              เผยแพร่
            </BrandButton>
          </div>
        </div>
      </div>
    </QueuePageShell>
  );
}

export default function CreateDocTemplatePage() {
  const builder = useFormBuilder();
  return (
    <FormBuilderProvider value={builder}>
      <CreateDocTemplatePageInner />
    </FormBuilderProvider>
  );
}
