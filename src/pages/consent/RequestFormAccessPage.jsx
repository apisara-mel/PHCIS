import React, { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import SuccessScreen from '@/components/layout/SuccessScreen';
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
  paddingTop: 'var(--dim-space-600)',
  paddingRight: 'var(--dim-space-600)',
  paddingBottom: 'var(--dim-space-600)',
  paddingLeft: 'var(--dim-space-600)',
  gap: 'var(--dim-space-400)',
  /* กว้างพอให้ตารางขอบเขตข้อมูล 2 คอลัมน์อยู่ในบรรทัดเดียว (มติผู้ใช้
     25 ส.ค. 69) — 'fit-content' เดิมกว้างตาม FieldShell (640px) ทำให้กลุ่ม
     "ข้อมูลอ่อนไหว" ตกลงไปข้างล่างเสมอ · ไม่มี token ขนาด 960px จึงประกอบจาก
     สองตัวที่มีอยู่ (640 + 320) แทนการใส่ตัวเลขดิบ */
  width: '100%',
  maxWidth: 'calc(var(--dim-size-2900, 640px) + var(--dim-size-2500, 320px))',
};

export default function RequestFormAccessPage() {
  const navigate = useHistory();
  const location = useLocation();
  const prefill = location.state || {};
  const [submittedRequest, setSubmittedRequest] = useState(null);

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
              submitLabel='ส่งคำขอสิทธิ์เข้าถึงแบบฟอร์ม'
              cancelLabel='ยกเลิก'
              onCancel={() => navigate.push('/consent/forms')}
              onSubmit={(payload) => {
                const rec = enqueueAccessImport(payload);
                setSubmittedRequest(rec);
              }}
            />
          </section>
        </div>
      </QueuePageShell>

      {submittedRequest && (
        <SuccessScreen
          title='ส่งคำขอสิทธิ์เข้าถึงแบบฟอร์มสำเร็จ'
          buttonLabel='ดูรายการคำขอของฉัน'
          onDone={() => navigate.push('/consent/access/my-requests')}
        />
      )}
    </>
  );
}
