import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import Popup from '@/components/popup/Popup';
import InputField from '@/components/forms/InputField';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import NestedPopupPanel, {
  hasVisiblePopupOverlay,
  portalNestedToTopPopup,
} from '@/components/popup/NestedPopupPanel';

/* MIH PrivacyRevealPopup — gate for unmasking PII in queue tables (วันเกิด,
   เลขบัตรประชาชน, โทรศัพท์, ชื่อใน worklist). When opened inside another
   popup, renders as nested overlay instead of stacking a second modal. */

const FORGOT_PASSWORD_PATH = '/login/verify';

const ForgotPasswordButton = ({ onClick }) => (
  <div className='flex justify-center w-full' style={{ paddingTop: 'var(--dim-space-600, 24px)' }}>
    <BrandSubdueButton variant='outline' size='md' onClick={onClick}>
      ลืมรหัสผ่าน?
    </BrandSubdueButton>
  </div>
);

const PrivacyRevealForm = ({ fieldLabel, password, setPassword, onConfirm, onClose, onForgotPassword }) => {
  const ready = Boolean(password.trim());

  return (
    <>
      <div className='flex flex-col w-full' style={{ padding: 'var(--dim-space-400) var(--dim-space-600)' }}>
        <InputField
          label='รหัสผ่าน'
          type='password'
          placeholder='กรอกรหัสผ่าน'
          value={password}
          onChange={setPassword}
          showLeadingIcon={false}
          autoComplete='current-password'
        />
        <ForgotPasswordButton onClick={onForgotPassword} />
      </div>
      <div
        className='shrink-0 flex w-full items-center justify-end'
        style={{
          gap: 'var(--dim-space-300)',
          padding: 'var(--dim-space-400) var(--dim-space-600)',
          borderTop: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
        }}
      >
        <NeutralSubdueButton onClick={onClose}>ยกเลิก</NeutralSubdueButton>
        <BrandPrimaryButton onClick={onConfirm} disabled={!ready}>ยืนยัน</BrandPrimaryButton>
      </div>
    </>
  );
};

const NestedPrivacyReveal = ({
  open,
  fieldLabel,
  password,
  setPassword,
  onConfirm,
  onClose,
  onForgotPassword,
}) => (
  portalNestedToTopPopup(
    <NestedPopupPanel open={open} direction='forward'>
      <div
        className='shrink-0 flex flex-col w-full'
        style={{
          gap: 'var(--dim-space-100)',
          padding: 'var(--dim-space-600) var(--dim-space-600) var(--dim-space-200)',
          borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
        }}
      >
        <p style={{
          color: 'var(--text-modal-text)',
          fontFamily: 'var(--type-family-heading-content)',
          fontSize: 'var(--type-size-base)',
          fontWeight: 'var(--type-weight-bold)',
          lineHeight: 1.5,
          margin: 0,
        }}
        >
          ยืนยันตัวตน
        </p>
        <p style={{
          color: 'var(--text-modal-subtext)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          fontWeight: 'var(--type-weight-medium)',
          lineHeight: 1.5,
          margin: 0,
        }}
        >
          {`กรุณากรอกรหัสผ่านเพื่อแสดง${fieldLabel}`}
        </p>
      </div>
      <PrivacyRevealForm
        fieldLabel={fieldLabel}
        password={password}
        setPassword={setPassword}
        onConfirm={onConfirm}
        onClose={onClose}
        onForgotPassword={onForgotPassword}
      />
    </NestedPopupPanel>,
    open,
  )
);

const PrivacyRevealPopup = ({
  open,
  fieldLabel = 'ข้อมูลส่วนบุคคล',
  onClose,
  onConfirm,
}) => {
  const history = useHistory();
  const [password, setPassword] = useState('');
  const [nested, setNested] = useState(false);

  useEffect(() => {
    if (!open) {
      setPassword('');
      setNested(false);
      return;
    }
    setNested(hasVisiblePopupOverlay());
  }, [open]);

  const ready = Boolean(password.trim());

  const handleConfirm = () => {
    if (!ready) return;
    onConfirm?.();
  };

  const handleForgotPassword = () => {
    onClose?.();
    history.push(FORGOT_PASSWORD_PATH, { from: 'privacy-reveal' });
  };

  if (nested) {
    return (
      <NestedPrivacyReveal
        open={open}
        fieldLabel={fieldLabel}
        password={password}
        setPassword={setPassword}
        onConfirm={handleConfirm}
        onClose={onClose}
        onForgotPassword={handleForgotPassword}
      />
    );
  }

  return (
    <Popup
      open={open}
      onClose={onClose}
      title='ยืนยันตัวตน'
      subtitle={`กรุณากรอกรหัสผ่านเพื่อแสดง${fieldLabel}`}
      primaryAction={{
        label: 'ยืนยัน',
        onClick: handleConfirm,
        disabled: !ready,
      }}
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
    >
      <div className='flex flex-col w-full'>
        <InputField
          label='รหัสผ่าน'
          type='password'
          placeholder='กรอกรหัสผ่าน'
          value={password}
          onChange={setPassword}
          showLeadingIcon={false}
          autoComplete='current-password'
        />
        <ForgotPasswordButton onClick={handleForgotPassword} />
      </div>
    </Popup>
  );
};

export default PrivacyRevealPopup;
