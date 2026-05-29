import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  MobileShell,
  MobileHeader,
  MobileButton,
  MobileInput,
  MobileField,
  Sym,
} from '@/components/mobile/MobileShell';

/* MIH PHCIS Mobile · Password reset — TOR §4.1.2.3 + §4.11.1.
   3-step:
     1. citizen ID → triggers SMS code
     2. OTP        → verifies the SMS
     3. new pw     → password + confirm, success → back to login            */

const MobileResetInner = () => {
  const history = useHistory();
  const [step, setStep] = useState(1);
  const [citizenId, setCitizenId] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (step !== 2) return undefined;
    setOtpSecondsLeft(120);
    const id = setInterval(() => setOtpSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [step]);

  const submit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError(null);
    if (step === 1) {
      if (citizenId.length !== 13) return setError('กรุณากรอกเลขประจำตัวประชาชน 13 หลัก');
      return setStep(2);
    }
    if (step === 2) {
      if (otp.length !== 6) return setError('กรุณากรอกรหัส OTP 6 หลัก');
      if (otpSecondsLeft <= 0) return setError('รหัสหมดอายุ กรุณากดส่งใหม่');
      return setStep(3);
    }
    if (step === 3) {
      if (pw.length < 8) return setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
      if (pw !== pw2) return setError('รหัสผ่านยืนยันไม่ตรงกัน');
      return setStep(4);
    }
    if (step === 4) {
      history.replace('/m/login');
    }
  };

  const goBack = () => {
    if (step <= 1) return history.push('/m/login');
    setStep(step - 1);
  };

  return (
    <>
      <MobileHeader
        title={step === 4 ? 'ตั้งรหัสผ่านสำเร็จ' : 'ลืมรหัสผ่าน'}
        subtitle={step === 4 ? undefined : `ขั้นที่ ${step} จาก 3`}
        onBack={goBack}
      />
      <div style={{ padding: 'var(--dim-space-400, 16px)' }}>
        <form onSubmit={submit} style={{
          background: 'var(--surface-content-default, #FFFFFF)',
          borderRadius: 'var(--dim-radius-500, 16px)',
          border: '1px solid var(--border-content-tertiary)',
          padding: 'var(--dim-space-500, 20px)',
          display: 'flex', flexDirection: 'column',
          gap: 'var(--dim-space-300, 12px)',
        }}>
          {step === 1 && (
            <>
              <h2 style={titleStyle}>ส่งรหัส SMS</h2>
              <p style={subStyle}>กรอกเลขบัตรประชาชน เราจะส่งรหัสไปยังเบอร์ที่ลงทะเบียนไว้</p>
              <MobileField label='เลขประจำตัวประชาชน' required>
                <MobileInput inputMode='numeric' maxLength={13} value={citizenId}
                  onChange={(e) => setCitizenId(e.target.value.replace(/\D/g, '').slice(0, 13))}
                  placeholder='1-2345-67890-12-3' />
              </MobileField>
              {error && <ErrorBox>{error}</ErrorBox>}
              <MobileButton type='submit'>ส่งรหัสยืนยัน</MobileButton>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ textAlign: 'center' }}>
                <Sym name='sms' size={48} color='var(--text-brandPrimary-default)' fill />
              </div>
              <h2 style={titleStyle}>ใส่รหัส OTP</h2>
              <p style={subStyle}>รหัส 6 หลักถูกส่งไปยังเบอร์ที่ผูกกับบัญชี<br />
                <strong style={{ color: 'var(--text-content-primary)' }}>(สาธิต: 123456)</strong></p>
              <MobileField label='รหัส OTP' hint={otpSecondsLeft > 0 ? `หมดอายุใน ${otpSecondsLeft} วินาที` : 'รหัสหมดอายุ'}>
                <MobileInput inputMode='numeric' maxLength={6} value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', letterSpacing: 12 }} />
              </MobileField>
              {error && <ErrorBox>{error}</ErrorBox>}
              <MobileButton type='submit' disabled={otp.length !== 6 || otpSecondsLeft <= 0}>ยืนยัน</MobileButton>
            </>
          )}

          {step === 3 && (
            <>
              <h2 style={titleStyle}>ตั้งรหัสผ่านใหม่</h2>
              <p style={subStyle}>รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร</p>
              <MobileField label='รหัสผ่านใหม่' required>
                <MobileInput type='password' value={pw} onChange={(e) => setPw(e.target.value)} />
              </MobileField>
              <MobileField label='ยืนยันรหัสผ่าน' required>
                <MobileInput type='password' value={pw2} onChange={(e) => setPw2(e.target.value)} />
              </MobileField>
              {error && <ErrorBox>{error}</ErrorBox>}
              <MobileButton type='submit'>บันทึก</MobileButton>
            </>
          )}

          {step === 4 && (
            <div style={{ textAlign: 'center', padding: 'var(--dim-space-400, 16px) 0' }}>
              <div style={{
                width: 64, height: 64, margin: '0 auto var(--dim-space-300, 12px)',
                background: 'linear-gradient(135deg, #007549 0%, #4CC6AE 100%)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#FFFFFF',
              }}>
                <Sym name='check' size={40} />
              </div>
              <h2 style={titleStyle}>ตั้งรหัสผ่านสำเร็จ</h2>
              <p style={subStyle}>คุณสามารถใช้รหัสผ่านใหม่เพื่อเข้าสู่ระบบได้แล้ว</p>
              <div style={{ marginTop: 'var(--dim-space-400, 16px)' }}>
                <MobileButton type='submit'>กลับสู่หน้าเข้าสู่ระบบ</MobileButton>
              </div>
            </div>
          )}
        </form>
      </div>
    </>
  );
};

const titleStyle = {
  margin: 0,
  fontFamily: 'var(--type-family-display)',
  fontSize: 'var(--type-size-lg, 18px)',
  fontWeight: 'var(--type-weight-bold, 700)',
  color: 'var(--text-content-primary)',
};

const subStyle = {
  margin: 0,
  fontSize: 'var(--type-size-sm, 14px)',
  color: 'var(--text-content-tertiary, #858C92)',
  lineHeight: 1.5,
};

const ErrorBox = ({ children }) => (
  <div style={{
    padding: 'var(--dim-space-300, 12px)',
    background: 'var(--surface-warning-quaternary, #FDECEC)',
    border: '1px solid var(--border-warning-default, #D43838)',
    borderRadius: 'var(--dim-radius-300, 10px)',
    color: 'var(--text-warning-default, #D43838)',
    fontSize: 'var(--type-size-sm, 14px)',
  }}>{children}</div>
);

const MobileResetPage = () => (
  <MobileShell requireAuth={false} showStatusBar showBottomNav={false}>
    <MobileResetInner />
  </MobileShell>
);

export default MobileResetPage;
