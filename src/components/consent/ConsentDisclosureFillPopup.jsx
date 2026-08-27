import React, { useEffect, useMemo, useRef, useState } from 'react';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import Alert from '@/components/alert/Alert';
import ConsentFormFillBody from '@/components/consent/ConsentFormFillBody';
import ConsentIdCardReadStep from '@/components/consent/ConsentIdCardReadStep';
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

/** บันทึกผลการกรอกใบยินยอมเข้า consent store — export ไว้ให้ popup เลือกใบของ
    ระบบจัดการความยินยอมใช้ด้วย เพราะที่นั่นกรอกใน Popup ชั้นเดียวกัน
    (กติกา DS: ไม่เปิด Popup ซ้อน Popup — ดู NestedPopupPanel) */
export const recordDisclosureFill = ({ outcome, fullName, hn, meta: formMeta }, patient) => {
  recordMrConsentSigning({
    hn: hn || patient?.hn,
    name: fullName,
    formId: formMeta.id,
    /* ส่ง formCode ไปด้วย ไม่งั้น `recordMrConsentSigning` จะไปเดาชื่อใบจาก
       หัวข้อหลัก แล้วได้ '-' ทั้งรหัสและชื่อเมื่อหัวข้อไม่ตรงทะเบียน */
    formCode: formMeta.id,
    formTitle: formMeta.title,
    type: formMeta.categoryLabel,
    version: formMeta.version,
    channel: DEFAULT_SERVICE_CENTER_CHANNEL,
    outcome,
  });
  return { formId: formMeta.id, meta: formMeta, outcome, hn: hn || patient?.hn, name: fullName };
};

export default function ConsentDisclosureFillPopup({
  open,
  formId,
  /** { hn, fullName, nationalId } — ค่าตั้งต้นของช่องข้อมูลผู้ป่วย */
  patient,
  onClose,
  onSaved,
  /** มี popup แม่อยู่ข้างหลัง (เช่น popup เลือกใบ) — ใส่ปุ่ม ‹ ที่หัว popup
      ให้ย้อนกลับไปเลือกใบใหม่ได้ โดยไม่ต้องปิดทั้งกอง */
  onBack,
  /** ด.1.1.1 — บังคับเสียบบัตรประชาชนยืนยันตัวตนก่อนถึงจะกรอกได้
      เปิดในระบบจัดการความยินยอม · ปิดในเวชระเบียน (เสียบบัตรมาแล้วที่ Kiosk) */
  requireIdCard = false,
}) {
  const [formApi, setFormApi] = useState({ ready: false, submit: () => {} });
  /* null | 'close' | 'back' — ค้างไว้ว่าจะทำอะไรต่อหลังผู้ใช้ยืนยันละทิ้ง */
  const [confirmDiscard, setConfirmDiscard] = useState(null);
  /* 'card' → 'form' · ข้ามขั้นบัตรเมื่อ requireIdCard=false */
  const [step, setStep] = useState(requireIdCard ? 'card' : 'form');
  const [reading, setReading] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState(null);
  const readTimer = useRef(null);
  const meta = useMemo(() => (formId ? getRegistrationConsentForm(formId) : null), [formId]);

  /* เปิดใบใหม่ = เริ่มนับหนึ่งใหม่ทุกครั้ง — ห้ามให้การยืนยันของใบก่อนหน้าค้างมา */
  useEffect(() => {
    if (readTimer.current) { clearTimeout(readTimer.current); readTimer.current = null; }
    setReading(false);
    setVerifiedAt(null);
    setStep(requireIdCard ? 'card' : 'form');
    if (!open) {
      setFormApi({ ready: false, submit: () => {} });
      setConfirmDiscard(null);
    }
  }, [open, formId, requireIdCard]);

  useEffect(() => () => { if (readTimer.current) clearTimeout(readTimer.current); }, []);

  if (!open || !meta) return null;

  const handleSubmit = (payload) => onSaved?.(recordDisclosureFill(payload, patient));

  /* mock เครื่องอ่านบัตร — ของจริงคือ event จาก smart-card reader (backend) */
  const startCardRead = () => {
    if (reading) return;
    setReading(true);
    readTimer.current = setTimeout(() => {
      readTimer.current = null;
      setReading(false);
      setVerifiedAt(new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' }));
      setStep('form');
    }, 1400);
  };

  /* กรอกไปแล้วบางส่วนแล้วกดปิด/ย้อนกลับ — เตือนก่อนทิ้ง เหมือน popup อื่นในโมดูลนี้
     (ขั้นเสียบบัตรยังไม่มีอะไรให้ทิ้ง จึงออกได้เลย) */
  const runDiscard = (next) => (next === 'back' ? onBack?.() : onClose?.());
  const dirty = step === 'form' && formApi.ready;
  const request = (next) => () => (dirty ? setConfirmDiscard(next) : runDiscard(next));
  const requestClose = request('close');
  const isCardStep = step === 'card';

  return (
    <>
      <Popup
        open={open}
        onClose={requestClose}
        onBack={onBack ? request('back') : undefined}
        size={isCardStep ? 'large' : 'extraLarge'}
        width={isCardStep ? 640 : undefined}
        title={isCardStep ? 'ยืนยันตัวตนผู้รับบริการ' : meta.title}
        subtitle={isCardStep
          ? `เสียบบัตรประชาชนก่อนกรอก ${meta.title}`
          : `${meta.categoryLabel} · ${meta.id} · V ${meta.version}`}
        primaryAction={isCardStep
          ? { label: reading ? 'กำลังอ่านบัตร…' : 'อ่านบัตร', onClick: startCardRead, disabled: reading }
          : { label: 'บันทึก', onClick: () => formApi.submit(), disabled: !formApi.ready }}
        secondaryAction={{ label: 'ยกเลิก', onClick: requestClose }}
        /* ด.1.1.15 — พิมพ์ใบยินยอมให้ผู้รับบริการลงนามบนกระดาษ · ขั้นเสียบบัตร
           ยังไม่ต้องมีปุ่มพิมพ์ (ยังไม่รู้ว่าจะได้กรอกไหม) */
        tertiaryAction={isCardStep
          ? undefined
          : { label: 'พิมพ์', leadingIcon: 'print', onClick: () => window.print?.() }}
      >
        {isCardStep ? (
          <ConsentIdCardReadStep
            patient={patient}
            formTitle={meta.title}
            status={reading ? 'reading' : 'idle'}
          />
        ) : (
          <>
            {verifiedAt && (
              <Alert
                type='success'
                title='ยืนยันตัวตนด้วยบัตรประชาชนแล้ว'
                subtext={`${patient?.fullName || ''} · ${patient?.nationalId || ''} · ${verifiedAt}`}
                showCloseButton={false}
                showBadge={false}
                showIndicator={false}
              />
            )}
            <ConsentFormFillBody
              key={formId}
              formId={formId}
              initialFullName={patient?.fullName || ''}
              initialNationalId={patient?.nationalId || ''}
              initialHn={patient?.hn || ''}
              onStateChange={setFormApi}
              onSubmit={handleSubmit}
            />
          </>
        )}
      </Popup>

      <AlertDialog
        open={!!confirmDiscard}
        type='warning'
        title={confirmDiscard === 'back' ? 'ย้อนกลับไปเลือกแบบฟอร์ม?' : 'ละทิ้งการกรอกแบบฟอร์ม?'}
        description={`ข้อมูลที่กรอกใน ${meta.title} จะไม่ถูกบันทึก`}
        confirmLabel={confirmDiscard === 'back' ? 'ย้อนกลับ' : 'ละทิ้ง'}
        cancelLabel='กรอกต่อ'
        onConfirm={() => { const next = confirmDiscard; setConfirmDiscard(null); runDiscard(next); }}
        onCancel={() => setConfirmDiscard(null)}
        onClose={() => setConfirmDiscard(null)}
      />
    </>
  );
}
