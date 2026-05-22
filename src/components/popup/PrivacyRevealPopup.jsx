import React, { useEffect, useState } from 'react';
import Popup from '@/components/popup/Popup';
import InputField from '@/components/forms/InputField';

/* MIH PrivacyRevealPopup — gate for unmasking PII in queue tables (วันเกิด,
   เลขบัตรประชาชน, โทรศัพท์). Registration queue opens this when the user
   clicks a masked cell; on success the caller reveals that field for the row.

   Props:
     • open
     • fieldLabel   Thai label for the field being revealed (subtitle copy)
     • onClose      cancel / overlay / Esc / X
     • onConfirm    () => void — fires after non-empty username + password */

const PrivacyRevealPopup = ({
  open,
  fieldLabel = 'ข้อมูลส่วนบุคคล',
  onClose,
  onConfirm,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setUsername('');
      setPassword('');
      setError('');
    }
  }, [open]);

  const handleConfirm = () => {
    if (!username.trim() || !password.trim()) {
      setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }
    onConfirm?.();
  };

  return (
    <Popup
      open={open}
      onClose={onClose}
      title='ยืนยันตัวตน'
      subtitle={`กรุณากรอกชื่อผู้ใช้และรหัสผ่านเพื่อแสดง${fieldLabel}`}
      primaryAction={{ label: 'ยืนยัน', onClick: handleConfirm }}
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
    >
      <div
        className='flex flex-col w-full'
        style={{ gap: 'var(--dim-space-400)' }}
      >
        <InputField
          label='ชื่อผู้ใช้'
          placeholder='กรอกชื่อผู้ใช้'
          value={username}
          onChange={setUsername}
          showLeadingIcon={false}
          autoComplete='username'
        />
        <InputField
          label='รหัสผ่าน'
          type='password'
          placeholder='กรอกรหัสผ่าน'
          value={password}
          onChange={setPassword}
          showLeadingIcon={false}
          autoComplete='current-password'
        />
        {error ? (
          <span
            style={{
              color: 'var(--text-input-error, #DC2626)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              lineHeight: 1.5,
            }}
          >
            {error}
          </span>
        ) : null}
      </div>
    </Popup>
  );
};

export default PrivacyRevealPopup;
