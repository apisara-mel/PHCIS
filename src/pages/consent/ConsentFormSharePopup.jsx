import React, { useEffect, useState } from 'react';
import Popup from '@/components/popup/Popup';
import InputField from '@/components/forms/InputField';
import { logExport } from '@/data/consentWorkflowStore';

/* PHCIS | Consent — แชร์แบบฟอร์มความยินยอมทางอีเมล (ด.1.1.x).
   กด "ส่งออก" → กรอกอีเมลผู้รับ → ยืนยัน → ระบบบันทึก log การส่งออก. */

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

export function ConsentFormSharePopup({ open, record, onClose, onShared }) {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail('');
      setTouched(false);
    }
  }, [open, record?.id]);

  const trimmed = email.trim();
  const valid = isEmail(trimmed);
  const showError = touched && trimmed.length > 0 && !valid;

  const confirm = () => {
    setTouched(true);
    if (!valid || !record) return;
    logExport({
      source: `แชร์แบบฟอร์ม ${record.code} ${record.name} → ${trimmed}`,
      format: 'email',
    });
    if (onShared) onShared({ email: trimmed, record });
    onClose();
  };

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='medium'
      title='ส่งออกแบบฟอร์มความยินยอม'
      subtitle={record ? `${record.code} · ${record.name}` : undefined}
      primaryAction={{ label: 'ยืนยันส่งออก', onClick: confirm, disabled: !valid }}
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <InputField
          label='อีเมลผู้รับ'
          required
          type='email'
          value={email}
          onChange={(v) => { setEmail(v); setTouched(true); }}
          placeholder='เช่น staff@health.go.th'
          leadingIcon='mail'
          helperText={showError ? 'กรุณากรอกอีเมลให้ถูกต้อง' : undefined}
          error={showError}
        />
      </div>
    </Popup>
  );
}

export default ConsentFormSharePopup;
