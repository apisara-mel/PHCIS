import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  MobileShell,
  MobileButton,
  MobileInput,
  MobileField,
  useMobileApp,
  Sym,
} from '@/components/mobile/MobileShell';

/* MIH PHCIS Mobile · Registration — TOR §4.1.1, redesigned to match the
   Home page's Figma mood/tone (teal→mint gradient hero, pastel circles,
   large numerals, rounded chrome).

   6-step wizard:
     1. welcome      (4.1.1.4)  — gradient hero + benefits + step list
     2. citizenId    (4.1.1.1)  — ID + phone fields
     3. otp          (4.1.1.2)  — boxed 6-digit OTP input
     4. face         (4.1.1.3   — camera viewfinder + tips
                      + 4.1.1.5)
     5. password     (4.1.1.6)  — password + strength meter + confirm
     6. done         (4.1.4)    — success state + generated QR proof */

const STEPS = ['welcome', 'citizenId', 'otp', 'face', 'password', 'done'];

/* ─── Shared hero — gradient block w/ glyph + title + step counter ─── */
const GradientHero = ({ icon, title, subtitle, stepIdx, totalSteps = 5 }) => (
  <div
    style={{
      padding: 'var(--dim-space-500, 20px)',
      paddingBottom: 'calc(var(--dim-space-700, 28px) + var(--dim-space-300, 12px))',
      background: 'linear-gradient(160deg, #0A8268 0%, #18A688 45%, #4CC6AE 100%)',
      color: '#FFFFFF',
      borderBottomLeftRadius: 'var(--dim-radius-500, 16px)',
      borderBottomRightRadius: 'var(--dim-radius-500, 16px)',
      position: 'relative',
    }}
  >
    {/* Step pill */}
    {stepIdx != null && stepIdx < totalSteps && (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px var(--dim-space-300, 12px)',
          background: 'rgba(0,0,0,0.22)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 'var(--dim-radius-full, 9999px)',
          fontSize: 'var(--type-size-xs, 12px)',
          fontWeight: 'var(--type-weight-bold, 700)',
          color: '#FFFFFF',
          letterSpacing: 0.3,
        }}
      >
        ขั้นที่ {stepIdx + 1} จาก {totalSteps}
      </div>
    )}

    {/* Glyph + title */}
    <div style={{ marginTop: 'var(--dim-space-400, 16px)', display: 'flex', alignItems: 'flex-start', gap: 'var(--dim-space-400, 16px)' }}>
      {icon && (
        <div
          style={{
            width: 56, height: 56, borderRadius: 'var(--dim-radius-500, 16px)',
            background: 'rgba(255,255,255,0.16)',
            border: '1px solid rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#FFFFFF', flexShrink: 0,
          }}
        >
          <Sym name={icon} size={28} fill />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0,
          fontFamily: 'var(--type-family-display)',
          fontSize: 'var(--type-size-xl, 22px)',
          fontWeight: 'var(--type-weight-bold, 700)',
          lineHeight: 1.25,
        }}>{title}</p>
        {subtitle && (
          <p style={{ margin: '4px 0 0', fontSize: 'var(--type-size-sm, 14px)', opacity: 0.92, lineHeight: 1.4 }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>

    {/* Progress dots — floats on the bottom curve of the hero */}
    {stepIdx != null && (
      <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span
            key={i}
            style={{
              width: i === stepIdx ? 24 : 6,
              height: 6,
              borderRadius: 999,
              background: i <= stepIdx ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.32)',
              transition: 'all 220ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        ))}
      </div>
    )}
  </div>
);

/* ─── Top bar — minimal back+spacer, sits on bg above the hero ───────── */
const TopBar = ({ onBack }) => (
  <div
    className='flex items-center'
    style={{ padding: 'var(--dim-space-200, 8px) var(--dim-space-300, 12px)', background: 'transparent' }}
  >
    <button
      type='button'
      onClick={onBack}
      aria-label='ย้อนกลับ'
      style={{
        width: 40, height: 40, borderRadius: 'var(--dim-radius-full)',
        background: 'rgba(255,255,255,0.6)',
        border: '1px solid var(--border-content-tertiary, #E1E3E5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-content-primary)', cursor: 'pointer',
      }}
    >
      <Sym name='arrow_back' size={22} />
    </button>
  </div>
);

/* ─── Tinted card — content surface that "floats" below the hero ─────── */
const Card = ({ children, padding = 20, gap = 16, style }) => (
  <div
    style={{
      background: 'var(--surface-content-default, #FFFFFF)',
      borderRadius: 'var(--dim-radius-500, 16px)',
      border: '1px solid var(--border-content-tertiary, #E1E3E5)',
      padding,
      display: 'flex', flexDirection: 'column', gap,
      boxShadow: 'var(--shadow-brand-drop-bottom-100)',
      ...(style || {}),
    }}
  >
    {children}
  </div>
);

const ErrorBox = ({ children }) => (
  <div style={{
    padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)',
    background: 'var(--surface-warning-quaternary, #FDECEC)',
    border: '1px solid var(--border-warning-default, #D43838)',
    borderRadius: 'var(--dim-radius-300, 10px)',
    color: 'var(--text-warning-default, #D43838)',
    fontSize: 'var(--type-size-sm, 14px)',
    display: 'flex', alignItems: 'flex-start', gap: 8,
  }}>
    <Sym name='error' size={18} />
    <span style={{ flex: 1 }}>{children}</span>
  </div>
);

/* ─── Body wrapper — overlaps the hero by 28px so cards "float up" ──── */
const Body = ({ children }) => (
  <div
    style={{
      flex: 1,
      padding: 'var(--dim-space-500, 20px) var(--dim-space-400, 16px) var(--dim-space-600, 24px)',
      marginTop: 'calc(-1 * var(--dim-space-700, 28px))',
      display: 'flex', flexDirection: 'column',
      gap: 'var(--dim-space-400, 16px)',
    }}
  >
    {children}
  </div>
);

const MobileRegisterInner = () => {
  const history = useHistory();
  const { signIn } = useMobileApp();
  const [step, setStep] = useState('welcome');

  const goNext = () => {
    const i = STEPS.indexOf(step);
    if (i < STEPS.length - 1) setStep(STEPS[i + 1]);
  };
  const goBack = () => {
    const i = STEPS.indexOf(step);
    if (i > 0) setStep(STEPS[i - 1]);
    else history.push('/m/login');
  };

  /* Field state */
  const [citizenId, setCitizenId] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const [faceCaptured, setFaceCaptured] = useState(false);
  const [faceCountdown, setFaceCountdown] = useState(0);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState(null);

  /* Timers */
  useEffect(() => {
    if (step !== 'otp') return undefined;
    setOtpSecondsLeft(120);
    const id = setInterval(() => setOtpSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (step !== 'face' || faceCaptured) return undefined;
    if (faceCountdown <= 0) return undefined;
    const id = setTimeout(() => {
      setFaceCountdown((c) => {
        if (c <= 1) { setFaceCaptured(true); return 0; }
        return c - 1;
      });
    }, 800);
    return () => clearTimeout(id);
  }, [faceCountdown, faceCaptured, step]);

  const startFaceCapture = () => {
    setFaceCaptured(false);
    setFaceCountdown(3);
  };

  /* Password strength — 4 levels */
  const pwStrength = (s) => {
    let score = 0;
    if (s.length >= 8) score += 1;
    if (/[A-Z]/.test(s)) score += 1;
    if (/[0-9]/.test(s)) score += 1;
    if (/[^A-Za-z0-9]/.test(s)) score += 1;
    return score;
  };
  const strength = pwStrength(pw);

  const onSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError(null);
    if (step === 'citizenId') {
      if (citizenId.length !== 13) return setError('กรุณากรอกเลขประจำตัวประชาชน 13 หลัก');
      if (phone.length < 9) return setError('กรุณากรอกเบอร์โทรศัพท์');
      return goNext();
    }
    if (step === 'otp') {
      if (otp.length !== 6) return setError('กรุณากรอกรหัส OTP 6 หลัก');
      if (otpSecondsLeft <= 0) return setError('รหัสหมดอายุ กรุณากดส่งใหม่');
      return goNext();
    }
    if (step === 'face') {
      if (!faceCaptured) return setError('กรุณาถ่ายภาพใบหน้าเพื่อยืนยันตัวตน');
      return goNext();
    }
    if (step === 'password') {
      if (strength < 3) return setError('รหัสผ่านอ่อนเกินไป ต้องมีตัวอักษรใหญ่ ตัวเลข และความยาว ≥ 8');
      if (pw !== pw2) return setError('รหัสผ่านยืนยันไม่ตรงกัน');
      return goNext();
    }
    if (step === 'done') {
      signIn();
      history.replace('/m/home');
    }
  };

  /* ============ STEP 1 · WELCOME ============ */
  const renderWelcome = () => (
    <>
      <TopBar onBack={goBack} />
      <GradientHero
        icon='waving_hand'
        title='ยินดีต้อนรับสู่ PHCIS'
        subtitle='ลงทะเบียนใช้งานครั้งแรก ใช้เวลาประมาณ 3 นาที'
        stepIdx={0}
      />
      <Body>
        {/* Time-to-finish chip */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px var(--dim-space-400, 16px)',
            background: 'var(--surface-success-quaternary, #E8F6EC)',
            color: 'var(--text-success-default, #1F9D55)',
            borderRadius: 'var(--dim-radius-full)',
            fontSize: 'var(--type-size-xs, 12px)',
            fontWeight: 700,
          }}>
            <Sym name='timer' size={14} fill /> ใช้เวลาประมาณ 3 นาที
          </span>
        </div>

        {/* Steps list — pastel circles per step */}
        <Card>
          <p style={{
            margin: 0,
            fontFamily: 'var(--type-family-display)',
            fontSize: 'var(--type-size-base, 16px)',
            fontWeight: 'var(--type-weight-bold, 700)',
            color: 'var(--text-content-primary)',
          }}>ขั้นตอนการลงทะเบียน</p>

          {[
            { n: 1, icon: 'badge',         label: 'กรอกเลขบัตรประชาชนและเบอร์โทรศัพท์', bg: '#D4F0E5', fg: '#0A8268' },
            { n: 2, icon: 'sms',           label: 'ยืนยันด้วยรหัส OTP ที่ส่งทาง SMS',     bg: '#CFE7F6', fg: '#1F6FEB' },
            { n: 3, icon: 'face',          label: 'ถ่ายภาพใบหน้าเพื่อพิสูจน์ตัวตน',      bg: '#FBD6D9', fg: '#D43838' },
            { n: 4, icon: 'lock',          label: 'กำหนดรหัสผ่านสำหรับเข้าใช้งาน',        bg: '#E4DCFB', fg: '#6A4FE4' },
          ].map((s) => (
            <div key={s.n} className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <span style={{
                width: 44, height: 44, borderRadius: 'var(--dim-radius-full)',
                background: s.bg, color: s.fg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Sym name={s.icon} size={22} fill />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-content-tertiary)', fontWeight: 700, letterSpacing: 0.3 }}>
                  ขั้นที่ {s.n}
                </p>
                <p style={{ margin: 0, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-primary)', fontWeight: 500, lineHeight: 1.4 }}>
                  {s.label}
                </p>
              </div>
            </div>
          ))}
        </Card>

        {/* PDPA note */}
        <div style={{
          padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)',
          background: 'var(--surface-info-quaternary, #ECF4FE)',
          borderRadius: 'var(--dim-radius-400, 12px)',
          display: 'flex', alignItems: 'flex-start', gap: 'var(--dim-space-200, 8px)',
        }}>
          <Sym name='verified_user' size={18} color='var(--text-info-default, #1F6FEB)' />
          <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary)', lineHeight: 1.5 }}>
            ภาพใบหน้าและข้อมูลส่วนตัวจะถูกตรวจสอบกับฐานข้อมูลของหน่วยบริการ
            ตามนโยบายการคุ้มครองข้อมูลส่วนบุคคล (PDPA)
          </p>
        </div>

        <MobileButton icon='arrow_forward' onClick={goNext}>เริ่มลงทะเบียน</MobileButton>
      </Body>
    </>
  );

  /* ============ STEP 2 · CITIZEN ID + PHONE ============ */
  const renderCitizenId = () => (
    <>
      <TopBar onBack={goBack} />
      <GradientHero
        icon='badge'
        title='ข้อมูลผู้ลงทะเบียน'
        subtitle='ใช้เลขประจำตัวประชาชน 13 หลักตามที่ระบุในบัตรประชาชน'
        stepIdx={1}
      />
      <Body>
        <Card>
          <MobileField label='เลขประจำตัวประชาชน' required>
            <MobileInput
              inputMode='numeric' maxLength={13}
              value={citizenId}
              onChange={(e) => setCitizenId(e.target.value.replace(/\D/g, '').slice(0, 13))}
              placeholder='1 2345 67890 12 3'
              style={{ letterSpacing: 1, fontFamily: 'ui-monospace, monospace' }}
            />
          </MobileField>
          <MobileField label='เบอร์โทรศัพท์ (สำหรับรับ OTP)' required hint='ต้องเป็นเบอร์ที่เปิดใช้งานปัจจุบัน'>
            <MobileInput
              inputMode='tel' maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder='081 234 5678'
            />
          </MobileField>
          {error && <ErrorBox>{error}</ErrorBox>}
        </Card>

        <MobileButton icon='sms' onClick={onSubmit}>ส่งรหัส OTP</MobileButton>
      </Body>
    </>
  );

  /* ============ STEP 3 · OTP ============ */
  const renderOtp = () => {
    const masked = phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3') || '—';
    const otpDigits = otp.padEnd(6, ' ').split('');
    return (
      <>
        <TopBar onBack={goBack} />
        <GradientHero
          icon='mark_email_unread'
          title='ใส่รหัส OTP'
          subtitle={`เราส่งรหัสไปยังเบอร์ ${masked}`}
          stepIdx={2}
        />
        <Body>
          <Card>
            <p style={{ margin: 0, textAlign: 'center', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary)' }}>
              รหัสสาธิต: <strong style={{ color: 'var(--text-content-primary)' }}>123456</strong>
            </p>
            {/* 6-box OTP input — wraps a single hidden input behind 6 visual boxes */}
            <div style={{ position: 'relative' }}>
              <input
                inputMode='numeric'
                maxLength={6}
                value={otp}
                autoFocus
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  opacity: 0, zIndex: 2, cursor: 'pointer',
                  border: 'none', background: 'transparent', outline: 'none',
                }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                {otpDigits.map((d, i) => {
                  const active = i === otp.length;
                  return (
                    <div
                      key={i}
                      style={{
                        height: 56,
                        background: 'var(--surface-content-default, #FFFFFF)',
                        border: `1.5px solid ${active ? 'var(--border-brandPrimary-default, #007549)' : 'var(--border-content-tertiary, #E1E3E5)'}`,
                        borderRadius: 'var(--dim-radius-400, 12px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--type-family-display)',
                        fontSize: 24,
                        fontWeight: 'var(--type-weight-bold, 700)',
                        color: 'var(--text-content-primary)',
                        boxShadow: active ? '0 0 0 4px rgba(8,167,104,0.15)' : 'none',
                        transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    >
                      {d.trim() || ''}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Countdown row */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, fontSize: 'var(--type-size-xs, 12px)', color: otpSecondsLeft > 0 ? 'var(--text-content-tertiary)' : 'var(--text-warning-default)' }}>
              <Sym name='timer' size={14} />
              {otpSecondsLeft > 0
                ? <span>รหัสจะหมดอายุใน <strong>{otpSecondsLeft}</strong> วินาที</span>
                : <span>รหัสหมดอายุแล้ว</span>}
            </div>

            {error && <ErrorBox>{error}</ErrorBox>}
          </Card>

          <MobileButton onClick={onSubmit} disabled={otp.length !== 6 || otpSecondsLeft <= 0}>
            ยืนยันรหัส
          </MobileButton>

          <button type='button' onClick={() => setOtpSecondsLeft(120)}
            style={{
              background: 'transparent', border: 'none', color: 'var(--text-brandPrimary-default)',
              fontSize: 'var(--type-size-sm, 14px)', cursor: 'pointer', fontWeight: 700,
              padding: 'var(--dim-space-200, 8px)', textAlign: 'center',
            }}>
            ส่งรหัสอีกครั้ง
          </button>
        </Body>
      </>
    );
  };

  /* ============ STEP 4 · FACE CAPTURE ============ */
  const renderFace = () => (
    <>
      <TopBar onBack={goBack} />
      <GradientHero
        icon='face_retouching_natural'
        title='ถ่ายภาพใบหน้า'
        subtitle='จัดให้ใบหน้าอยู่ในวงกลม อยู่ในที่ที่มีแสงสว่างเพียงพอ'
        stepIdx={3}
      />
      <Body>
        <Card padding={16} gap={16}>
          {/* Viewfinder */}
          <div
            style={{
              width: '100%',
              aspectRatio: '1 / 1',
              borderRadius: 'var(--dim-radius-500, 16px)',
              background: faceCaptured
                ? 'linear-gradient(135deg, #007549 0%, #4CC6AE 100%)'
                : 'linear-gradient(135deg, #1F3D33 0%, #0F1B17 100%)',
              position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {/* Corner brackets */}
            {!faceCaptured && [
              { top: 16, left: 16, t: '1px solid rgba(255,255,255,0.6)', l: '1px solid rgba(255,255,255,0.6)' },
              { top: 16, right: 16, t: '1px solid rgba(255,255,255,0.6)', r: '1px solid rgba(255,255,255,0.6)' },
              { bottom: 16, left: 16, b: '1px solid rgba(255,255,255,0.6)', l: '1px solid rgba(255,255,255,0.6)' },
              { bottom: 16, right: 16, b: '1px solid rgba(255,255,255,0.6)', r: '1px solid rgba(255,255,255,0.6)' },
            ].map((c, i) => (
              <span key={i} style={{
                position: 'absolute', width: 24, height: 24,
                top: c.top, left: c.left, right: c.right, bottom: c.bottom,
                borderTop: c.t, borderRight: c.r, borderBottom: c.b, borderLeft: c.l,
              }} />
            ))}

            {/* Inner circle viewfinder */}
            <div style={{
              width: 220, height: 220, borderRadius: '50%',
              border: `3px dashed ${faceCaptured ? '#FFFFFF' : 'rgba(255,255,255,0.85)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: faceCaptured ? 'rgba(255,255,255,0.08)' : 'transparent',
            }}>
              {faceCaptured ? (
                <div style={{ textAlign: 'center', color: '#FFFFFF' }}>
                  <Sym name='verified' size={72} fill />
                  <p style={{ margin: '8px 0 0', fontWeight: 700, fontSize: 'var(--type-size-base, 16px)' }}>ตรวจสอบสำเร็จ</p>
                </div>
              ) : faceCountdown > 0 ? (
                <span style={{
                  color: '#FFFFFF',
                  fontFamily: 'var(--type-family-display)',
                  fontSize: 96, fontWeight: 700,
                  textShadow: '0 4px 24px rgba(0,0,0,0.4)',
                }}>{faceCountdown}</span>
              ) : (
                <Sym name='face' size={120} color='rgba(255,255,255,0.6)' />
              )}
            </div>
          </div>

          {/* Tips */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { icon: 'visibility_off', label: 'ถอดแว่นและหมวก' },
              { icon: 'group_remove',   label: 'พื้นหลังว่าง' },
              { icon: 'visibility',     label: 'มองตรงกล้อง' },
            ].map((t) => (
              <div key={t.label} style={{
                padding: 'var(--dim-space-200, 8px) 4px',
                background: 'var(--surface-content-secondary, #F5F6F7)',
                borderRadius: 'var(--dim-radius-300, 10px)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}>
                <Sym name={t.icon} size={20} color='var(--text-brandPrimary-default)' />
                <span style={{ fontSize: 11, color: 'var(--text-content-secondary)', textAlign: 'center', fontWeight: 500 }}>{t.label}</span>
              </div>
            ))}
          </div>

          {error && <ErrorBox>{error}</ErrorBox>}

          {!faceCaptured ? (
            <MobileButton icon='photo_camera' onClick={startFaceCapture} disabled={faceCountdown > 0}>
              {faceCountdown > 0 ? `เริ่มถ่ายใน ${faceCountdown}…` : 'เริ่มถ่ายภาพ'}
            </MobileButton>
          ) : (
            <>
              <MobileButton onClick={onSubmit}>ใช้ภาพนี้</MobileButton>
              <MobileButton variant='secondary' icon='replay' onClick={() => { setFaceCaptured(false); setFaceCountdown(0); }}>
                ถ่ายใหม่
              </MobileButton>
            </>
          )}
        </Card>
      </Body>
    </>
  );

  /* ============ STEP 5 · PASSWORD ============ */
  const renderPassword = () => {
    const strengthMeta = [
      { label: 'อ่อน',      color: '#D43838' },
      { label: 'อ่อน',      color: '#D43838' },
      { label: 'พอใช้',     color: '#F2A93B' },
      { label: 'ดี',        color: '#1F9D55' },
      { label: 'ดีมาก',     color: '#0A8268' },
    ][strength];

    /* Checklist requirements */
    const reqs = [
      { ok: pw.length >= 8,          label: 'อย่างน้อย 8 ตัวอักษร' },
      { ok: /[A-Z]/.test(pw),        label: 'ตัวพิมพ์ใหญ่ (A–Z)' },
      { ok: /[0-9]/.test(pw),        label: 'มีตัวเลข (0–9)' },
      { ok: /[^A-Za-z0-9]/.test(pw), label: 'อักขระพิเศษ (!@#$…)' },
    ];

    return (
      <>
        <TopBar onBack={goBack} />
        <GradientHero
          icon='lock'
          title='ตั้งรหัสผ่าน'
          subtitle='รหัสนี้จะใช้สำหรับเข้าใช้งานแอป — เก็บเป็นความลับ'
          stepIdx={4}
        />
        <Body>
          <Card>
            <MobileField label='รหัสผ่านใหม่' required>
              <MobileInput type='password' value={pw}
                onChange={(e) => setPw(e.target.value)} placeholder='••••••••' autoComplete='new-password' />
            </MobileField>

            {/* Strength meter */}
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {[1, 2, 3, 4].map((i) => (
                  <span key={i}
                    style={{
                      height: 6, borderRadius: 999,
                      background: i <= strength ? strengthMeta.color : 'var(--surface-content-secondary, #E1E3E5)',
                      transition: 'background 220ms cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>ระดับความแข็งแกร่ง</span>
                <span style={{ fontSize: 'var(--type-size-xs, 12px)', fontWeight: 700, color: strengthMeta.color }}>{strengthMeta.label}</span>
              </div>
            </div>

            {/* Requirements checklist */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {reqs.map((r) => (
                <div key={r.label} className='flex items-center' style={{ gap: 6 }}>
                  <Sym
                    name={r.ok ? 'check_circle' : 'radio_button_unchecked'}
                    size={16}
                    color={r.ok ? 'var(--text-success-default, #1F9D55)' : 'var(--text-content-tertiary)'}
                    fill={r.ok}
                  />
                  <span style={{ fontSize: 11, color: r.ok ? 'var(--text-content-primary)' : 'var(--text-content-tertiary)' }}>{r.label}</span>
                </div>
              ))}
            </div>

            <MobileField label='ยืนยันรหัสผ่าน' required>
              <MobileInput type='password' value={pw2}
                onChange={(e) => setPw2(e.target.value)} placeholder='••••••••' autoComplete='new-password' />
            </MobileField>

            {error && <ErrorBox>{error}</ErrorBox>}
          </Card>

          <MobileButton onClick={onSubmit}>ลงทะเบียน</MobileButton>
        </Body>
      </>
    );
  };

  /* ============ STEP 6 · DONE ============ */
  const renderDone = () => (
    <>
      {/* Celebration hero — taller, ornamental dots */}
      <div
        style={{
          padding: 'var(--dim-space-700, 28px) var(--dim-space-500, 20px) var(--dim-space-700, 28px)',
          background: 'linear-gradient(160deg, #0A8268 0%, #18A688 45%, #4CC6AE 100%)',
          color: '#FFFFFF',
          borderBottomLeftRadius: 'var(--dim-radius-500, 16px)',
          borderBottomRightRadius: 'var(--dim-radius-500, 16px)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Confetti-ish dots */}
        {[
          { top: 30,  left: 40,  size: 8,  c: '#FFE9B8' },
          { top: 50,  right: 60, size: 12, c: '#FBD6D9' },
          { top: 88,  left: 80,  size: 6,  c: '#E4DCFB' },
          { top: 80,  right: 30, size: 10, c: '#CFE7F6' },
          { top: 140, left: 30,  size: 8,  c: '#E1EFB5' },
          { top: 150, right: 80, size: 6,  c: '#7AF0C8' },
        ].map((d, i) => (
          <span key={i} style={{
            position: 'absolute', width: d.size, height: d.size, borderRadius: '50%',
            background: d.c, top: d.top, left: d.left, right: d.right,
            opacity: 0.85,
          }} />
        ))}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--dim-space-300, 12px)' }}>
          <div style={{
            width: 96, height: 96, borderRadius: '50%',
            background: '#FFFFFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
          }}>
            <Sym name='check' size={56} color='#0A8268' weight={500} />
          </div>
          <p style={{
            margin: 0,
            fontFamily: 'var(--type-family-display)',
            fontSize: 'var(--type-size-2xl, 26px)',
            fontWeight: 'var(--type-weight-bold, 700)',
            textAlign: 'center',
          }}>ลงทะเบียนสำเร็จ!</p>
          <p style={{ margin: 0, fontSize: 'var(--type-size-sm, 14px)', opacity: 0.92, textAlign: 'center', lineHeight: 1.4 }}>
            ระบบจะเชื่อมข้อมูลของคุณไปยังศูนย์บริการสาธารณสุข<br />ที่คุณลงทะเบียนไว้
          </p>
        </div>
      </div>

      <Body>
        {/* QR proof card */}
        <Card padding={20} gap={12} style={{ alignItems: 'center' }}>
          <p style={{
            margin: 0, alignSelf: 'flex-start',
            fontFamily: 'var(--type-family-display)',
            fontSize: 'var(--type-size-base, 16px)',
            fontWeight: 'var(--type-weight-bold, 700)',
            color: 'var(--text-content-primary)',
          }}>หลักฐานการลงทะเบียน</p>
          <p style={{ margin: 0, alignSelf: 'flex-start', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>
            แสดง QR นี้ที่จุดลงทะเบียน เพื่อยืนยันการลงทะเบียนล่วงหน้า
          </p>
          <div style={{
            background: 'var(--surface-content-secondary, #F5F6F7)',
            borderRadius: 'var(--dim-radius-400, 12px)',
            padding: 'var(--dim-space-400, 16px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            alignSelf: 'stretch',
          }}>
            <FakeQR seed={citizenId || 'PHCIS'} size={180} />
          </div>
          <div style={{
            padding: '8px var(--dim-space-400, 16px)',
            background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
            border: '1px solid var(--border-brandPrimary-default, #007549)',
            borderRadius: 'var(--dim-radius-full)',
            fontFamily: 'ui-monospace, monospace',
            fontSize: 'var(--type-size-sm, 14px)',
            fontWeight: 'var(--type-weight-bold, 700)',
            color: 'var(--text-brandPrimary-default)',
            letterSpacing: 1,
          }}>
            PHCIS-{(citizenId || '000000000000').slice(-6)}-NEW
          </div>
        </Card>

        <MobileButton icon='login' onClick={onSubmit}>เข้าใช้งานแอป</MobileButton>
      </Body>
    </>
  );

  const stepRenderers = { welcome: renderWelcome, citizenId: renderCitizenId, otp: renderOtp, face: renderFace, password: renderPassword, done: renderDone };
  return stepRenderers[step]();
};

/* ─── FakeQR — pseudo-random 21×21 grid w/ corner finders. Deterministic
   from the seed string so the same citizen ID always renders the same
   QR. No real QR encoding — visual placeholder until a real qrcode lib
   is wired in. */
const FakeQR = ({ seed = 'PHCIS', size = 160 }) => {
  const cells = 21;
  const grid = [];
  let h = 2166136261;
  const eat = (n) => { h ^= n; h = Math.imul(h, 16777619) >>> 0; };
  for (let i = 0; i < seed.length; i += 1) eat(seed.charCodeAt(i));
  for (let r = 0; r < cells; r += 1) {
    const row = [];
    for (let c = 0; c < cells; c += 1) {
      eat(r * cells + c);
      row.push((h & 1) === 1);
    }
    grid.push(row);
  }
  const finder = (rr, cc) => {
    for (let r = 0; r < 7; r += 1) for (let c = 0; c < 7; c += 1) {
      const onEdge = r === 0 || r === 6 || c === 0 || c === 6;
      const innerSquare = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      grid[rr + r][cc + c] = onEdge || innerSquare;
    }
  };
  finder(0, 0); finder(0, cells - 7); finder(cells - 7, 0);
  const cell = size / cells;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label='QR Code'>
      <rect width={size} height={size} fill='#FFFFFF' rx={8} />
      {grid.map((row, r) => row.map((on, c) => on ? (
        <rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill='#0F1B17' />
      ) : null))}
    </svg>
  );
};

const MobileRegisterPage = () => (
  <MobileShell requireAuth={false} showStatusBar showBottomNav={false}>
    <MobileRegisterInner />
  </MobileShell>
);

export default MobileRegisterPage;
export { FakeQR };
