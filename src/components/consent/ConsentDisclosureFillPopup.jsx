import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import ConsentFormFillBody from '@/components/consent/ConsentFormFillBody';
import { getRegistrationConsentForm } from '@/data/registrationConsentForms';
import { recordMrConsentSigning } from '@/data/consentWorkflowStore';
import { DEFAULT_SERVICE_CENTER_CHANNEL } from '@/data/consentChannels';

/* กรอกใบยินยอมเปิดเผยข้อมูล (PD-1011 / TX-1011 / CL-1011) แบบ popup

   ใช้ 2 ที่:
     • เวชระเบียน — Step 1 "แบบฟอร์มยินยอม" กดกรอกบนการ์ด
     • ระบบจัดการความยินยอม — แท็บผู้รับบริการทั้งหมด → popup เลือกแบบฟอร์ม
       → กรอก (nested popup ซ้อนบน popup เลือกใบ · `Popup` จัด z-index ให้เอง)

   เนื้อเอกสารมาจาก `ConsentFormFillBody` ตัวเดียวกับหน้าเต็ม
   `/registration/consent/:formId` — บันทึกแล้วเข้า consent store ผ่าน
   `recordMrConsentSigning` เหมือนกันทุกทาง */

export default function ConsentDisclosureFillPopup({
  open,
  formId,
  /** { hn, fullName, nationalId } — ค่าตั้งต้นของช่องข้อมูลผู้ป่วย */
  patient,
  onClose,
  onSaved,
}) {
  const [formApi, setFormApi] = useState({ ready: false, submit: () => {} });
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const meta = useMemo(() => (formId ? getRegistrationConsentForm(formId) : null), [formId]);

  useEffect(() => {
    if (!open) {
      setFormApi({ ready: false, submit: () => {} });
      setConfirmDiscard(false);
    }
  }, [open]);

  if (!open || !meta) return null;

  const handleSubmit = ({ outcome, fullName, hn, meta: formMeta }) => {
    recordMrConsentSigning({
      hn: hn || patient?.hn,
      name: fullName,
      formId: formMeta.id,
      formTitle: formMeta.title,
      type: formMeta.categoryLabel,
      version: formMeta.version,
      channel: DEFAULT_SERVICE_CENTER_CHANNEL,
      outcome,
    });
    onSaved?.({ formId: formMeta.id, meta: formMeta, outcome, hn: hn || patient?.hn, name: fullName });
  };

  /* กรอกไปแล้วบางส่วนแล้วกดปิด — เตือนก่อนทิ้ง เหมือน popup อื่นในโมดูลนี้ */
  const requestClose = () => (formApi.ready ? setConfirmDiscard(true) : onClose?.());

  return (
    <>
      <Popup
        open={open}
        onClose={requestClose}
        size='extraLarge'
        title={meta.title}
        subtitle={`${meta.categoryLabel} · ${meta.id} · V ${meta.version}`}
        primaryAction={{ label: 'บันทึก', onClick: () => formApi.submit(), disabled: !formApi.ready }}
        secondaryAction={{ label: 'ยกเลิก', onClick: requestClose }}
      >
        <ConsentFormFillBody
          key={formId}
          formId={formId}
          initialFullName={patient?.fullName || ''}
          initialNationalId={patient?.nationalId || ''}
          initialHn={patient?.hn || ''}
          onStateChange={setFormApi}
          onSubmit={handleSubmit}
        />
      </Popup>

      <AlertDialog
        open={confirmDiscard}
        type='warning'
        title='ละทิ้งการกรอกแบบฟอร์ม?'
        description={`ข้อมูลที่กรอกใน ${meta.title} จะไม่ถูกบันทึก`}
        confirmLabel='ละทิ้ง'
        cancelLabel='กรอกต่อ'
        onConfirm={() => { setConfirmDiscard(false); onClose?.(); }}
        onCancel={() => setConfirmDiscard(false)}
        onClose={() => setConfirmDiscard(false)}
      />
    </>
  );
}
