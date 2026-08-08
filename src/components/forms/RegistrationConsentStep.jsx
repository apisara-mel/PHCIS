import React, { useState } from 'react';
import Alert from '@/components/alert/Alert';
import { SectionTitle } from '@/components/forms/Fields';
import { FormCard } from '@/components/forms/FormsLibrary';
import ConsentFormFillPopup from '@/components/popup/ConsentFormFillPopup';
import ConsentQrSendPopup from '@/components/popup/ConsentQrSendPopup';
import { REGISTRATION_CONSENT_FORMS, getConsentSummary } from '@/data/registrationForm';
import { consentTypeFromMrForm, recordMrConsentSigning } from '@/data/consentWorkflowStore';
import { DEFAULT_SERVICE_CENTER_CHANNEL, MOBILE_APP_CHANNEL } from '@/data/consentChannels';

/* Registration Step 0 — "แบบฟอร์มยินยอม" (Figma PHCIS | Registration ·
   node 292:104252 "Step 1 - Patient Record (Consent Pending)"). Three list
   states driven by `getConsentSummary`:
     'none-signed' → "ยังไม่เคยยินยอม"
     'partial'     → "มีบาง Form ที่ยังไม่ยินยอม / หรืออัปเดท"
     'all-signed'  → "ไม่มี Form ที่ต้องขอยินยอมใหม่"
   Each consent form is a reused `FormCard` (src/components/forms/FormsLibrary.jsx)
   sourced from the same `formsLibrary.js` catalog OPD's Step 5 reads from. */

const BANNER_COPY = {
  'none-signed': {
    title: (n) => `ยังไม่เคยได้รับความยินยอมทั้ง ${n} แบบฟอร์ม`,
    subtext: 'กรุณาให้ผู้รับบริการกรอกแบบฟอร์มยินยอมการเข้ารับบริการให้ครบถ้วนก่อนดำเนินการขั้นถัดไป',
  },
  partial: {
    title: (n) => `มี ${n} แบบฟอร์มที่ยังไม่ได้รับการยินยอม`,
    subtext: 'กรุณาให้ผู้รับบริการกรอกแบบฟอร์มยินยอมการเข้ารับบริการให้ครบถ้วน',
  },
  'all-signed': {
    title: () => 'ไม่มีแบบฟอร์มที่ต้องขอความยินยอมใหม่',
    subtext: 'ผู้รับบริการให้ความยินยอมครบทุกแบบฟอร์มแล้ว',
  },
};

const RegistrationConsentStep = ({ form, setForm, patient }) => {
  /** `{ slug } | null` — which record's chooser (in-clinic vs QR) is open. */
  const [chooserSlug, setChooserSlug] = useState(null);
  const [fillSlug, setFillSlug] = useState(null);
  const [qrSlug, setQrSlug] = useState(null);

  const records = form.consentRecords || [];
  const summary = getConsentSummary(records);
  const banner = summary.total > 0 ? BANNER_COPY[summary.state] : null;

  const patientDisplayName = [patient?.prefixTh, patient?.firstNameTh, patient?.lastNameTh]
    .filter(Boolean)
    .join(' ')
    || patient?.fullName
    || '';

  const markSigned = ({ slug, channel = DEFAULT_SERVICE_CENTER_CHANNEL }) => {
    const catalog = findCatalogForm(slug);
    if (patient?.hn && patientDisplayName) {
      recordMrConsentSigning({
        hn: patient.hn,
        name: patientDisplayName,
        formCode: slug,
        formId: catalog?.code,
        formTitle: catalog?.name || catalog?.title,
        type: consentTypeFromMrForm({ slug }),
        version: catalog?.version,
        channel,
        outcome: 'signed',
      });
    }
    setForm((s) => ({
      ...s,
      consentRecords: (s.consentRecords || []).map((r) =>
        r.slug === slug ? { ...r, status: 'signed', signedAt: new Date().toISOString() } : r,
      ),
    }));
  };

  const findCatalogForm = (slug) => REGISTRATION_CONSENT_FORMS.find((f) => f.slug === slug);

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
      {banner && (
        <Alert
          type={summary.state === 'all-signed' ? 'success' : 'warning'}
          title={banner.title(summary.pendingCount || summary.total)}
          subtext={banner.subtext}
          showCloseButton={false}
        />
      )}

      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <SectionTitle icon='assignment'>
          {summary.state === 'all-signed' ? 'แบบฟอร์มยินยอมทั้งหมด' : 'แบบฟอร์มที่ยังไม่ขอความยินยอม'}
        </SectionTitle>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch'>
          {records.map((r) => (
            <FormCard
              key={r.slug}
              category='consent'
              status='assessed'
              showStatusBadge={r.status === 'signed'}
              title={r.title}
              code={r.code}
              isOpen={r.status === 'signed'}
              actionLabel='กรอกแบบฟอร์ม'
              onEdit={() => setChooserSlug(r.slug)}
              onPreview={() => setChooserSlug(r.slug)}
            />
          ))}
        </div>
      </div>

      {/* Fill-method chooser — reuses the same warning-alert card chrome as
          the banner above so it reads as part of the same surface. */}
      {chooserSlug && (
        <div
          role='dialog'
          aria-label='เลือกวิธีกรอกแบบฟอร์มยินยอม'
          className='fixed inset-0 z-[1300] flex items-center justify-center'
          style={{ background: 'rgba(15, 23, 42, 0.4)' }}
          onClick={() => setChooserSlug(null)}
        >
          <div
            role='presentation'
            onClick={(e) => e.stopPropagation()}
            className='flex flex-col w-full'
            style={{
              maxWidth: 420,
              gap: 'var(--dim-space-300)',
              padding: 'var(--dim-space-600)',
              borderRadius: 'var(--dim-radius-500)',
              background: 'var(--surface-card-100)',
              boxShadow: 'var(--shadow-brand-drop-bottom-200)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--type-family-heading-content)',
                fontSize: 'var(--type-size-base)',
                fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                color: 'var(--text-content-default)',
              }}
            >
              เลือกวิธีกรอกแบบฟอร์มยินยอม
            </span>
            <button
              type='button'
              className='text-left w-full transition-colors'
              style={{
                padding: 'var(--dim-space-400)',
                borderRadius: 'var(--dim-radius-200)',
                border: 'var(--dim-stroke-100) solid var(--border-brandPrimaryButton-tertiary)',
                background: 'var(--surface-brandPrimary-quaternary)',
                color: 'var(--text-brandPrimary-default)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
              }}
              onClick={() => { setFillSlug(chooserSlug); setChooserSlug(null); }}
            >
              ให้เจ้าหน้าที่กรอกแทน (ในคลินิก)
            </button>
            <button
              type='button'
              className='text-left w-full transition-colors'
              style={{
                padding: 'var(--dim-space-400)',
                borderRadius: 'var(--dim-radius-200)',
                border: 'var(--dim-stroke-100) solid var(--border-card-default)',
                background: 'var(--surface-card-100)',
                color: 'var(--text-content-default)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
              }}
              onClick={() => { setQrSlug(chooserSlug); setChooserSlug(null); }}
            >
              ส่งไปที่มือถือผู้รับบริการ (QR)
            </button>
          </div>
        </div>
      )}

      <ConsentFormFillPopup
        open={Boolean(fillSlug)}
        form={findCatalogForm(fillSlug)}
        patient={patient}
        onClose={() => setFillSlug(null)}
        onConfirm={(payload) => { markSigned({ ...payload, channel: DEFAULT_SERVICE_CENTER_CHANNEL }); setFillSlug(null); }}
      />

      <ConsentQrSendPopup
        open={Boolean(qrSlug)}
        form={findCatalogForm(qrSlug)}
        onClose={() => setQrSlug(null)}
        onSubmitted={(payload) => { markSigned({ ...payload, channel: MOBILE_APP_CHANNEL }); setQrSlug(null); }}
      />
    </div>
  );
};

export default RegistrationConsentStep;
