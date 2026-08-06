import React, { useState } from 'react';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import { CreateConsentRequestPopup } from '@/pages/consent/consentWorkflowPopups';
import { enqueueAccessImport } from '@/data/accessRecords';
import { canCreateConsentRequest } from '@/data/consentPermissions';

/** Material Symbols — เอกสาร + plus (Figma consent access-request action). */
export const CREATE_CONSENT_REQUEST_ICON = 'note_add';

/** SubHeader action — ด.1.1.4 / ด.1.1.6 สร้างคำขอเข้าถึงแบบฟอร์มยินยอม (แถวเดียวกับ page title). */
export default function CreateConsentRequestHeaderAction({ className = '' }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(null);

  if (!canCreateConsentRequest()) return null;

  return (
    <>
      <BrandSubdueButton
        variant='outline'
        size='md'
        leadingIcon={CREATE_CONSENT_REQUEST_ICON}
        className={`shrink-0 ${className}`.trim()}
        aria-label='สร้างคำขอเข้าถึงแบบฟอร์มยินยอม'
        onClick={() => setOpen(true)}
      >
        สร้างคำขอเข้าถึงแบบฟอร์มยินยอม
      </BrandSubdueButton>

      <CreateConsentRequestPopup
        open={open}
        onClose={() => setOpen(false)}
        onCreate={(payload) => {
          const rec = enqueueAccessImport(payload);
          setOpen(false);
          setToast({
            id: Date.now(),
            variant: 'success',
            message: `ส่งคำขอสิทธิ์ของ ${rec.name} แล้ว — รออนุมัติที่เมนูจัดการสิทธิ์การเข้าถึงแบบฟอร์ม`,
          });
        }}
      />

      <PhcisTopToast session={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
