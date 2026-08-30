import React, { useMemo, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Icon from '@/components/icons/Icon';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Popup from '@/components/popup/Popup';
import FormStructurePreview, { countFields } from '@/components/forms/FormStructurePreview';
import {
  getFormBySlug,
  getCategory,
  CATEGORY_PALETTE,
} from '@/data/formsLibrary';
import EDOCUMENT_NAV, { EDOCUMENT_BRAND_TITLE } from '@/pages/forms/edocumentNav';

/* QR popup — Figma 1:1159 style sheet not used; this is a lightweight
   prototype QR. URL is encoded via api.qrserver.com so we don't add a
   dependency. The same URL works on desktop + mobile because the
   detail page is responsive. */
const QrPopup = ({ open, onClose, form, shareUrl }) => {
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(shareUrl)}`;
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — fall back to selecting the text */
    }
  };
  return (
    <Popup
      open={open}
      onClose={onClose}
      title='แสกนเพื่อกรอกแบบฟอร์มในโทรศัพท์'
      subtitle={form.name}
      size='default'
      secondaryAction={{ label: 'ปิด', onClick: onClose }}
      primaryAction={{
        label: copied ? 'คัดลอกแล้ว ✓' : 'คัดลอกลิงก์',
        onClick: handleCopy,
      }}
    >
      <div className='flex flex-col items-center w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <div
          className='inline-flex items-center justify-center'
          style={{
            padding: 'var(--dim-space-300)',
            borderRadius: 'var(--dim-radius-400)',
            background: 'var(--surface-card-100)',
            border: 'var(--dim-stroke-100) solid var(--border-card-default)',
          }}
        >
          <img src={qrSrc} alt={`QR สำหรับแบบฟอร์ม ${form.name}`} width={240} height={240} />
        </div>
        <div
          className='flex items-center w-full'
          style={{
            gap: 'var(--dim-space-200)',
            padding: 'var(--dim-space-300)',
            borderRadius: 'var(--dim-radius-200)',
            background: 'var(--surface-brandPrimary-quaternary)',
            border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
          }}
        >
          <Icon name='link' size={16} />
          <span
            className='flex-1 min-w-0 truncate'
            style={{
              color: 'var(--text-brandPrimary-default)',
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              fontSize: 'var(--type-size-xs)',
            }}
          >
            {shareUrl}
          </span>
        </div>
        <p className='text-xs text-ink-tertiary text-center' style={{ margin: 'var(--dim-space-0)' }}>
          เปิดกล้องบนโทรศัพท์ของผู้ป่วย แล้วชี้ไปที่ QR เพื่อเปิดแบบฟอร์ม
          <br />
          (Prototype: ลิงก์เปิด URL เดียวกัน — รองรับการเปิดบนทั้ง Desktop และ Mobile)
        </p>
      </div>
    </Popup>
  );
};

const FormDetailPage = () => {
  const { slug } = useParams();
  const history = useHistory();
  const form = getFormBySlug(slug);
  const category = form ? getCategory(form.category) : null;
  const tone = category ? CATEGORY_PALETTE[category.color] : null;
  const [qrOpen, setQrOpen] = useState(false);

  /* QR target = the fill page in patient mode. Phone scan lands on a
     patient-facing fillable form (Sidebar collapses < md), same surface
     that staff uses on desktop without the `?role=patient` flag. */
  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/forms/${slug}/fill?role=patient`;
  }, [slug]);

  if (!form) {
    return (
      <div className='min-h-screen w-full flex bg-brand-50'>
        <Sidebar
          activeKey='edocument-catalog'
          items={EDOCUMENT_NAV}
          fallbackKey='edocument-dashboard'
        />
        <main className='flex-1 flex flex-col min-w-0'>
          <Header breadcrumb={['คลังเอกสาร e-document', 'ไม่พบแบบฟอร์ม']} brandTitle={EDOCUMENT_BRAND_TITLE} />
          <div className='flex flex-1 items-center justify-center text-ink-tertiary'>
            ไม่พบแบบฟอร์มที่ตรงกับลิงก์นี้
          </div>
        </main>
      </div>
    );
  }

  const fieldCount = countFields(form);
  const breadcrumb = ['คลังเอกสาร e-document', category?.label || '', form.name].filter(Boolean);

  return (
    <div className='min-h-screen w-full flex bg-brand-50'>
      <Sidebar
        activeKey='edocument-catalog'
        items={EDOCUMENT_NAV}
        fallbackKey='edocument-dashboard'
      />
      <main className='flex-1 flex flex-col min-w-0'>
        <Header breadcrumb={breadcrumb} brandTitle={EDOCUMENT_BRAND_TITLE} />
        <div className='p-3 md:p-6 flex-1 flex flex-col' style={{ gap: 'var(--dim-space-500)' }}>
          {/* Back link */}
          <div>
            <button
              type='button'
              onClick={() => history.push('/forms')}
              className='inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-brand-500'
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 'var(--dim-space-0)' }}
            >
              <Icon name='chevron-left' size={16} />
              กลับไปยังคลังเอกสาร e-document
            </button>
          </div>

          {/* Hero card */}
          <section
            className='bg-surface-card rounded-card shadow-card flex items-start w-full flex-col md:flex-row'
            style={{ gap: 'var(--dim-space-500)', padding: 'var(--dim-space-600)' }}
          >
            <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
              <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                {tone && (
                  <span
                    className='inline-flex items-center'
                    style={{
                      gap: 'var(--dim-space-150)',
                      height: 24,
                      paddingLeft: 'var(--dim-space-200)',
                      paddingRight: 'var(--dim-space-200)',
                      borderRadius: 'var(--dim-radius-full)',
                      background: tone.surface,
                      color: tone.text,
                      fontFamily: 'var(--type-family-body)',
                      fontWeight: 'var(--type-weight-medium)',
                      fontSize: 'var(--type-size-xs)',
                      lineHeight: 1.5,
                    }}
                  >
                    <Icon name={category.icon} size={14} />
                    {category.label}
                  </span>
                )}
                <span className='text-xs text-ink-tertiary'>เวอร์ชัน {form.version}</span>
              </div>
              <h1 className='text-xl font-bold text-ink leading-tight' style={{ margin: 'var(--dim-space-0)' }}>
                {form.name}
              </h1>
              <p className='text-sm text-ink-secondary' style={{ margin: 'var(--dim-space-0)' }}>{form.summary}</p>

              <div className='flex flex-wrap items-center text-sm text-ink-tertiary' style={{ gap: 'var(--dim-space-400)' }}>
                <span className='inline-flex items-center gap-1'>
                  <Icon name='description' size={16} />
                  {fieldCount} ช่อง
                </span>
                <span className='inline-flex items-center gap-1'>
                  <Icon name='clock' size={16} />
                  ใช้เวลา ~{form.estimatedMinutes} นาที
                </span>
                <span className='inline-flex items-center gap-1'>
                  <Icon name='translate' size={16} />
                  {form.language}
                </span>
                <span className='inline-flex items-center gap-1'>
                  <Icon name='layers' size={16} />
                  {form.sections.length} ส่วน
                </span>
              </div>
            </div>

            <div className='flex flex-col shrink-0' style={{ gap: 'var(--dim-space-200)', minWidth: 240 }}>
              <BrandButton
                size='md'
                leadingIcon='edit'
                onClick={() => history.push(`/forms/${slug}/fill`)}
              >
                เจ้าหน้าที่กรอกในเครื่องนี้
              </BrandButton>
              <BrandButton
                size='md'
                variant='outline'
                leadingIcon='qr_code_2'
                onClick={() => setQrOpen(true)}
              >
                แสดง QR ให้ผู้ป่วยแสกน
              </BrandButton>
              <NeutralSubdueButton
                variant='outline'
                size='sm'
                onClick={() => {
                  if (typeof window === 'undefined') return;
                  navigator.clipboard?.writeText(shareUrl);
                }}
              >
                คัดลอกลิงก์สำหรับผู้ป่วย
              </NeutralSubdueButton>
            </div>
          </section>

          {/* Sections + fields */}
          <section
            className='bg-surface-card rounded-card shadow-card flex flex-col w-full'
            style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-500)' }}
          >
            <FormStructurePreview form={form} />
          </section>
        </div>

        <Footer copyright='© 2026 ศูนย์การพยาบาลคุณภาพ ดินแดง กรุงเทพมหานคร' />
      </main>

      <QrPopup
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        form={form}
        shareUrl={shareUrl}
      />
    </div>
  );
};

export default FormDetailPage;
