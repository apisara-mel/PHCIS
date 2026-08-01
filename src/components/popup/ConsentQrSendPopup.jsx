import React, { useEffect, useState } from 'react';
import Popup from '@/components/popup/Popup';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Icon from '@/components/icons/Icon';
import { FakeQR } from '@/pages/mobile/MobileRegisterPage';

/* Registration · "แบบฟอร์มยินยอม" step — "ส่งไปที่มือถือผู้รับบริการ" path.
   Figma annotation: "ต้องสร้างหน้า consent เปิดในโทรศัพทย์" (must build a
   consent page that opens on the patient's phone). End-to-end this is mock
   data, so the phone side is simulated here with a progress timer rather
   than a second real page — same simulation pattern as
   IdentityVerificationPopup's biometric-scan progress bar. */

const STAGES = [
  { key: 'waiting', label: 'รอผู้รับบริการสแกน QR' },
  { key: 'filling', label: 'ผู้รับบริการกำลังกรอกแบบฟอร์มบนมือถือ' },
  { key: 'submitted', label: 'ส่งแบบฟอร์มยินยอมสำเร็จ' },
];

const ConsentQrSendPopup = ({ open, form, onClose, onSubmitted }) => {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (!open) return undefined;
    setStageIndex(0);
    const t1 = setTimeout(() => setStageIndex(1), 1800);
    const t2 = setTimeout(() => setStageIndex(2), 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [open]);

  if (!open || !form) return null;

  const stage = STAGES[stageIndex];
  const submitted = stage.key === 'submitted';

  return (
    <Popup
      open={open}
      onClose={onClose}
      title='ส่งแบบฟอร์มยินยอมไปที่มือถือผู้รับบริการ'
      subtitle={form.name}
      size='default'
      primaryAction={
        submitted
          ? { label: 'เสร็จสิ้น', onClick: () => onSubmitted?.({ slug: form.slug, signedAt: new Date().toISOString() }) }
          : undefined
      }
      secondaryAction={{ label: submitted ? 'ปิด' : 'ยกเลิก', onClick: onClose }}
    >
      <div className='flex flex-col items-center w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <FakeQR seed={form.slug} size={220} framed />

        <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-150)' }}>
          {submitted ? (
            <ColorfulBadge style='teal' size='default'>
              <span className='inline-flex items-center gap-1'>
                <Icon name='check_circle' size={16} />
                {stage.label}
              </span>
            </ColorfulBadge>
          ) : (
            <span
              className='inline-flex items-center gap-2 text-sm'
              style={{ color: 'var(--text-content-secondary)' }}
            >
              <span
                className='inline-block rounded-full animate-pulse'
                style={{ width: 8, height: 8, background: 'var(--surface-brandPrimary-default)' }}
              />
              {stage.label}
            </span>
          )}
        </div>

        <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
          {STAGES.map((s, i) => (
            <span
              key={s.key}
              className='inline-block rounded-full transition-colors'
              style={{
                width: 8,
                height: 8,
                background: i <= stageIndex
                  ? 'var(--surface-brandPrimary-default)'
                  : 'var(--surface-neutral-tertiary, #E9ECEF)',
              }}
            />
          ))}
        </div>

        <p
          className='text-xs text-center'
          style={{ color: 'var(--text-content-tertiary)', maxWidth: 320 }}
        >
          ให้ผู้รับบริการใช้กล้องมือถือสแกน QR นี้เพื่อเปิดแบบฟอร์มยินยอมและลงลายเซ็นด้วยตนเอง
        </p>
      </div>
    </Popup>
  );
};

export default ConsentQrSendPopup;
