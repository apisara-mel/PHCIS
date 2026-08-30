import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import FormCoverPicker, { OFFICIAL_COVER_KEY } from '@/components/forms/FormCoverPicker';
import FormBuilderWorkspace from '@/components/form-builder/FormBuilderWorkspace';
import { FormBuilderProvider, useFormBuilderContext } from '@/components/form-builder/FormBuilderContext';
import useFormBuilder from '@/hooks/useFormBuilder';
import { formatLastSaved } from '@/utils/formBuilderModel';
import SuccessScreen from '@/components/layout/SuccessScreen';
import { MIH_CHROME_MORPH_FOOTER } from '@/components/layout/wizardChromeMorphStyles';
import EDOCUMENT_NAV, { EDOCUMENT_BRAND_TITLE } from '@/pages/forms/edocumentNav';

/* PHCIS | Assess-control — สร้างแบบฟอร์มใหม่ (Figma 0EDfjwf1 · 26:1747).
   Interactive form builder: palette drag/click · canvas reorder · live preview. */

const breadcrumb = ['คลังเอกสาร e-document', 'สร้างเอกสาร e-document ใหม่'];

const COVER_CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-400, 12px)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600)',
  gap: 'var(--dim-space-400)',
};

function CreateDocTemplatePageInner() {
  const history = useHistory();
  const {
    setCoverFiles, lastSaved, saveDraft, publish,
    scrollPreviewToBlock, selectedId,
  } = useFormBuilderContext();
  const [published, setPublished] = useState(false);
  const [publishResult, setPublishResult] = useState(null);
  /* หน้าปกที่เลือก — ค่าเริ่มต้นคือตราสำนักอนามัย เหมือนการสร้างใบยินยอม */
  const [cover, setCover] = useState(OFFICIAL_COVER_KEY);

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
        buttonLabel='คลังเอกสาร e-document'
        lottieSize={256}
        onDone={() => history.push('/forms')}
      />
    );
  }

  return (
    <QueuePageShell
      activeKey='edocument-new'
      sidebarItems={EDOCUMENT_NAV}
      sidebarFallbackKey='edocument-dashboard'
      brandTitle={EDOCUMENT_BRAND_TITLE}
      breadcrumb={breadcrumb}
      title='สร้างเอกสาร e-document ใหม่'
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
          <FormCoverPicker
            value={cover}
            onChange={setCover}
            onFilesChange={setCoverFiles}
          />
        </section>

        <FormBuilderWorkspace />

        <div
          className={`sticky bottom-0 z-10 flex items-center w-full ${MIH_CHROME_MORPH_FOOTER}`}
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
