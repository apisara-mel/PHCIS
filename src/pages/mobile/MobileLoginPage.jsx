import React, { useEffect, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  MobileShell,
  MobileButton,
  MobileInput,
  MobileField,
  useMobileApp,
  Sym,
} from '@/components/mobile/MobileShell';
import { CURRENT_USER } from '@/data/mobileMock';

/* MIH PHCIS Mobile · Login screen — TOR §4.1.2.
   Accepts national ID + password. Demo creds shown in a hint card so
   reviewers can sign in without seeding state. After sign-in we redirect
   to `?next=` (typically the page that triggered the auth gate) or
   default to /m/home.

   The "ลงทะเบียน / Register" link routes to /m/register which walks the
   visitor through the §4.1.1 enrollment ceremony (citizen ID → OTP →
   face capture → password). Biometric (§4.1.2.6) is offered as a quick
   action that ends in the same authed state without a typed password. */

const MobileLoginInner = () => {
  const history = useHistory();
  const { search } = useLocation();
  const { signIn, lang, t } = useMobileApp();

  const next = new URLSearchParams(search).get('next') || '/m/home';

  const [citizenId, setCitizenId] = useState('');
  const [password,  setPassword]  = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [error,     setError]     = useState(null);

  /* OTP step — shown after the visitor taps "Sign in" if the citizen ID
     matches the mock user. Mirrors §4.1.2.4 (OTP within a time window). */
  const [otpRequired, setOtpRequired] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);

  useEffect(() => {
    if (!otpRequired) return undefined;
    setOtpSecondsLeft(120);
    const id = setInterval(() => {
      setOtpSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [otpRequired]);

  const onPasswordSubmit = (e) => {
    e.preventDefault();
    setError(null);
    if (citizenId.length !== 13) {
      setError('กรุณากรอกเลขประจำตัวประชาชน 13 หลัก');
      return;
    }
    if (citizenId !== CURRENT_USER.citizenId || password !== CURRENT_USER.password) {
      setError('เลขประจำตัวประชาชนหรือรหัสผ่านไม่ถูกต้อง (ลองใช้ข้อมูลสาธิตด้านล่าง)');
      return;
    }
    setOtpRequired(true);
  };

  const onOtpSubmit = (e) => {
    e.preventDefault();
    setError(null);
    if (otp.length !== 6) {
      setError('กรุณากรอกรหัส OTP 6 หลัก');
      return;
    }
    if (otpSecondsLeft <= 0) {
      setError('รหัส OTP หมดอายุ กรุณากดส่งใหม่');
      return;
    }
    signIn();
    history.replace(next);
  };

  const onBiometric = () => {
    /* Pretend Face ID succeeded after 600 ms */
    setTimeout(() => {
      signIn();
      history.replace(next);
    }, 600);
  };

  return (
    <div style={{ padding: 'var(--dim-space-500, 20px)', minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-500, 20px)' }}>
      {/* Brand + welcome */}
      <div style={{ textAlign: 'center', marginTop: 'var(--dim-space-600, 24px)' }}>
        <div
          style={{
            width: 72, height: 72,
            margin: '0 auto var(--dim-space-300, 12px)',
            background: 'linear-gradient(135deg, #54AA8C 0%, #4CC6AE 100%)',
            borderRadius: 'var(--dim-radius-450, 14px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#FFFFFF',
          }}
        >
          <Sym name='health_and_safety' size={40} fill />
        </div>
        <h1 style={{
          margin: 0,
          fontFamily: 'var(--type-family-display)',
          fontSize: 'var(--type-size-xl, 20px)',
          fontWeight: 'var(--type-weight-bold, 700)',
          color: 'var(--text-content-primary)',
        }}>
          {t('PHCIS Mobile', 'PHCIS Mobile')}
        </h1>
        <p style={{
          margin: '4px 0 0',
          fontSize: 'var(--type-size-sm, 14px)',
          color: 'var(--text-content-tertiary, #858C92)',
        }}>
          {t('สำนักอนามัย กรุงเทพมหานคร', 'Bangkok Health Department')}
        </p>
      </div>

      {!otpRequired ? (
        <form onSubmit={onPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
          <MobileField label={t('เลขประจำตัวประชาชน', 'Citizen ID')} required>
            <MobileInput
              inputMode='numeric'
              maxLength={13}
              placeholder='1-2345-67890-12-3'
              value={citizenId}
              onChange={(e) => setCitizenId(e.target.value.replace(/\D/g, '').slice(0, 13))}
            />
          </MobileField>
          <MobileField label={t('รหัสผ่าน', 'Password')} required>
            <div style={{ position: 'relative' }}>
              <MobileInput
                type={showPw ? 'text' : 'password'}
                placeholder='••••••••'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: 48 }}
              />
              <button
                type='button'
                onClick={() => setShowPw((v) => !v)}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  width: 36, height: 36, borderRadius: 'var(--dim-radius-full)',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--text-content-tertiary)',
                }}
                aria-label={showPw ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                <Sym name={showPw ? 'visibility_off' : 'visibility'} size={20} />
              </button>
            </div>
          </MobileField>

          {error && (
            <div style={{
              padding: 'var(--dim-space-300, 12px)',
              background: 'var(--surface-warning-quaternary, #FDECEC)',
              border: '1px solid var(--border-warning-default, #D43838)',
              borderRadius: 'var(--dim-radius-300, 10px)',
              color: 'var(--text-warning-default, #D43838)',
              fontSize: 'var(--type-size-sm, 14px)',
            }}>{error}</div>
          )}

          <MobileButton type='submit'>{t('เข้าสู่ระบบ', 'Sign in')}</MobileButton>

          <div className='flex items-center justify-between' style={{ marginTop: 'var(--dim-space-100, 4px)' }}>
            <button type='button' onClick={() => history.push('/m/reset')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer',
                       color: 'var(--text-brandPrimary-default)', fontSize: 'var(--type-size-sm, 14px)',
                       fontWeight: 'var(--type-weight-bold, 700)', padding: 0 }}>
              {t('ลืมรหัสผ่าน?', 'Forgot password?')}
            </button>
            <button type='button' onClick={() => history.push('/m/register')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer',
                       color: 'var(--text-brandPrimary-default)', fontSize: 'var(--type-size-sm, 14px)',
                       fontWeight: 'var(--type-weight-bold, 700)', padding: 0 }}>
              {t('ลงทะเบียนใหม่', 'Register')}
            </button>
          </div>

          {/* Biometric quick action — TOR §4.1.2.6 */}
          <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)', margin: 'var(--dim-space-400, 16px) 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border-content-tertiary)' }} />
            <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>
              {t('หรือ', 'or')}
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-content-tertiary)' }} />
          </div>
          <MobileButton variant='secondary' icon='face' onClick={onBiometric}>
            {t('เข้าสู่ระบบด้วย Face ID', 'Sign in with Face ID')}
          </MobileButton>

          {/* Demo creds hint */}
          <div style={{
            marginTop: 'var(--dim-space-300, 12px)',
            padding: 'var(--dim-space-300, 12px)',
            background: 'var(--surface-info-quaternary, #ECF4FE)',
            border: '1px dashed var(--border-info-default, #1F6FEB)',
            borderRadius: 'var(--dim-radius-300, 10px)',
            fontSize: 'var(--type-size-xs, 12px)',
            color: 'var(--text-content-secondary)',
            lineHeight: 1.5,
          }}>
            <strong style={{ display: 'block', marginBottom: 4 }}>ข้อมูลสาธิต</strong>
            เลขประจำตัวประชาชน <code>{CURRENT_USER.citizenId}</code><br />
            รหัสผ่าน <code>{CURRENT_USER.password}</code>
          </div>
        </form>
      ) : (
        <form onSubmit={onOtpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
          <div style={{ textAlign: 'center', padding: 'var(--dim-space-400, 16px) 0' }}>
            <Sym name='mark_email_unread' size={64} color='var(--text-brandPrimary-default)' />
            <h2 style={{
              margin: 'var(--dim-space-300, 12px) 0 4px',
              fontFamily: 'var(--type-family-display)',
              fontSize: 'var(--type-size-lg, 18px)',
              fontWeight: 'var(--type-weight-bold, 700)',
              color: 'var(--text-content-primary)',
            }}>
              ยืนยันด้วยรหัส OTP
            </h2>
            <p style={{ margin: 0, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary)' }}>
              เราส่งรหัส 6 หลักไปที่เบอร์ {CURRENT_USER.phone}<br />
              <strong style={{ color: 'var(--text-content-primary)' }}>(สาธิต: 123456)</strong>
            </p>
          </div>

          <MobileField label='รหัส OTP' hint={otpSecondsLeft > 0 ? `รหัสจะหมดอายุใน ${otpSecondsLeft} วินาที` : 'รหัสหมดอายุ'}>
            <MobileInput
              inputMode='numeric'
              maxLength={6}
              placeholder='123456'
              value={otp}
              autoFocus
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', letterSpacing: 12 }}
            />
          </MobileField>

          {error && (
            <div style={{
              padding: 'var(--dim-space-300, 12px)',
              background: 'var(--surface-warning-quaternary, #FDECEC)',
              border: '1px solid var(--border-warning-default, #D43838)',
              borderRadius: 'var(--dim-radius-300, 10px)',
              color: 'var(--text-warning-default, #D43838)',
              fontSize: 'var(--type-size-sm, 14px)',
            }}>{error}</div>
          )}

          <MobileButton type='submit' disabled={otp.length !== 6 || otpSecondsLeft <= 0}>
            ยืนยันรหัส OTP
          </MobileButton>

          <button type='button'
            onClick={() => { setOtpRequired(false); setOtp(''); setError(null); }}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-sm, 14px)',
              padding: 'var(--dim-space-200, 8px)',
            }}>
            ← ย้อนกลับไปกรอกรหัสผ่าน
          </button>
        </form>
      )}

      {/* Language toggle — TOR §4.10 */}
      <LangFooter />
    </div>
  );
};

const LangFooter = () => {
  const { lang, setLang } = useMobileApp();
  return (
    <div className='flex items-center justify-center' style={{ marginTop: 'auto', paddingTop: 'var(--dim-space-300, 12px)' }}>
      <button type='button' onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
        style={{
          background: 'transparent', border: '1px solid var(--border-content-tertiary)',
          borderRadius: 'var(--dim-radius-full, 9999px)',
          padding: '6px var(--dim-space-300, 12px)',
          fontSize: 'var(--type-size-xs, 12px)',
          color: 'var(--text-content-secondary)',
          cursor: 'pointer',
        }}>
        🌐 {lang === 'th' ? 'TH · ไทย' : 'EN · English'}
      </button>
    </div>
  );
};

const MobileLoginPage = () => (
  <MobileShell requireAuth={false} showStatusBar showBottomNav={false}>
    <MobileLoginInner />
  </MobileShell>
);

export default MobileLoginPage;
