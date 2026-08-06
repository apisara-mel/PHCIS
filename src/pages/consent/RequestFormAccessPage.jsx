import React, { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import AccessRequestForm from '@/pages/consent/AccessRequestForm';
import { enqueueAccessImport } from '@/data/accessRecords';
import CONSENT_NAV from '@/pages/consent/consentNav';

/* PHCIS | Consent — ขอสิทธิ์การเข้าถึงแบบฟอร์ม (ด.1.1.17.1).
   อัปโหลด/ถ่ายภาพแบบฟอร์มขอเข้าถึง → OCR → ตรวจแก้ → ส่งเข้าคิวรออนุมัติ
   ที่ /consent/access */

const breadcrumb = ['ขอสิทธิ์การเข้าถึงแบบฟอร์ม'];

const CARD_STYLE = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600)',
  gap: 'var(--dim-space-400)',
  width: 'fit-content',
  maxWidth: '100%',
};

export default function RequestFormAccessPage() {
  const navigate = useHistory();
  const location = useLocation();
  const prefill = location.state || {};
  const [toast, setToast] = useState(null);

  return (
    <>
      <QueuePageShell
        activeKey='consent-request-access'
        sidebarItems={CONSENT_NAV}
        sidebarFallbackKey='consent-request-access'
        brandTitle='ระบบจัดการความยินยอม'
        breadcrumb={breadcrumb}
        title='ขอสิทธิ์การเข้าถึงแบบฟอร์ม'
      >
        <div
          className='flex flex-col flex-1 min-w-0 items-center w-full'
          style={{ padding: 'var(--dim-space-600)' }}
        >
          <section className='flex flex-col max-w-full' style={CARD_STYLE}>
            <AccessRequestForm
              key={`${prefill.formId || 'new'}-${prefill.accessType || 'none'}`}
              initialAccessType={prefill.accessType || ''}
              initialFormId={prefill.formId ? String(prefill.formId) : ''}
              submitLabel='ส่งคำขอสิทธิ์'
              cancelLabel='ยกเลิก'
              onCancel={() => navigate.push('/consent/forms')}
              onSubmit={(payload) => {
                const rec = enqueueAccessImport(payload);
                setToast({
                  id: Date.now(),
                  variant: 'success',
                  message: `ส่งคำขอสิทธิ์ของ ${rec.name} แล้ว — รออนุมัติที่เมนูจัดการสิทธิ์การเข้าถึงแบบฟอร์ม`,
                });
                navigate.push('/consent/access');
              }}
            />
          </section>
        </div>
      </QueuePageShell>

      <PhcisTopToast session={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
