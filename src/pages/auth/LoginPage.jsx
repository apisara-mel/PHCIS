import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import InputField from '@/components/forms/InputField';
import PasswordField from '@/components/forms/PasswordField';
import Checkbox from '@/components/checkbox/Checkbox';
import BrandButton from '@/components/button/BrandButton';
import { Sym } from '@/components/forms/_inputBox';
import { FakeQR } from '@/pages/mobile/MobileRegisterPage';
/* PHCIS Sign-in — Figma "PHCIS-Signin" Bg + login card (nodes 32:2131 / 40:10656).
   First screen of the auth flow (1st/2nd-time user). Two-column layout:
   isometric healthcare illustration on the left, brand seal + sign-in card
   on the right. Stacks to a single centered column below the lg breakpoint.

   Flow annotations honoured (from the Figma flow notes):
     • "ติดต่อฝ่ายไอทีโรงพยาบาล" opens a prefilled IT-support email — subject
       "[PHCIS] แจ้งปัญหา - เข้าสู่ระบบไม่ได้", body auto-fills the typed
       username + a timestamp, matching the Email annotation (node 57:14843).
     • Submitting credentials (or Thai ID) advances to OTP verification.

   Every visual value aliases a design.md token via the CSS custom properties
   in src/index.css — no hex / px literals (gradients excepted per project rule). */

const IT_SUPPORT_EMAIL = 'it-support@hospital.go.th';

/* Figma 79:14353 Bg — inline SVG so gradients always paint (no CSS url / <img> issues). */
const SignInBackground = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 1440 1024'
    preserveAspectRatio='xMidYMid slice'
    aria-hidden
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 0,
      display: 'block',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
    }}
  >
    <rect width='1440' height='1024' fill='#FFFFFF' />
    <defs>
      <radialGradient id='mih-signin-sky' cx='50%' cy='50%' r='50%'>
        <stop offset='0%' stopColor='#40AAF2' stopOpacity='0.2' />
        <stop offset='100%' stopColor='#FFFFFF' stopOpacity='0' />
      </radialGradient>
      <radialGradient id='mih-signin-mint' cx='50%' cy='50%' r='50%'>
        <stop offset='0%' stopColor='#3EC3B2' stopOpacity='0.2' />
        <stop offset='100%' stopColor='#FFFFFF' stopOpacity='0' />
      </radialGradient>
    </defs>
    <ellipse cx='628' cy='413.5' rx='647' ry='646.5' fill='url(#mih-signin-sky)' />
    <circle cx='188' cy='699' r='539' fill='url(#mih-signin-mint)' />
  </svg>
);

/* Layout + spacing: src/index.css (.mih-signin-screen / -content / -panel). */
if (typeof document !== 'undefined') {
  document.getElementById('mih-signin-panel-style')?.remove();
}

/* ThaID brand mark — Thailand Digital ID app icon (a brand logo, not a
   design-system glyph, so it is rendered as a self-contained badge). Swap
   for the official asset when available. */
const ThaIdLogo = ({ size = 'var(--dim-size-600)' }) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 32 32'
    role='img'
    aria-label='Thai ID'
    className='shrink-0'
  >
    <defs>
      <linearGradient id='mih-thaid-grad' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stopColor='#1B2A6B' />
        <stop offset='1' stopColor='#2E46A8' />
      </linearGradient>
    </defs>
    <rect width='32' height='32' rx='4' fill='url(#mih-thaid-grad)' />
    <text
      x='16' y='21' textAnchor='middle'
      fontFamily="'Mitr', system-ui, sans-serif" fontSize='11' fontWeight='600'
    >
      <tspan fill='#46C2FF'>Tha</tspan><tspan fill='#FFFFFF'>ID</tspan>
    </text>
  </svg>
);

/* ThaID wordmark badge that sits in the centre of the QR — a white disc with
   the "ThaiD" lockup (brand colours, like <ThaIdLogo>, are the official app's
   palette, not design-system tokens). Real QR error-correction tolerates a
   centred logo, so it overlays the FakeQR without breaking the pattern. */
const ThaIdQrBadge = () => (
  <span
    className='absolute inline-flex items-center justify-center'
    style={{
      width: 'var(--dim-size-1000, 56px)',
      height: 'var(--dim-size-1000, 56px)',
      borderRadius: 'var(--dim-radius-full)',
      background: 'var(--surface-card-100, #FFFFFF)',
      boxShadow: 'var(--shadow-card)',
    }}
  >
    <span
      style={{
        fontFamily: "'Mitr', system-ui, sans-serif",
        fontSize: 'var(--type-size-base)',
        fontWeight: 'var(--type-weight-medium)',
        lineHeight: 1,
        letterSpacing: '-0.02em',
      }}
    >
      <span style={{ color: '#1F4FA8' }}>Thai</span>
      <span style={{ color: '#F08A1D' }}>D</span>
    </span>
  </span>
);

/* Thai ID sign-in QR — Figma "PHCIS-Signin" thaiID (57:8699 / 57:8570).
   Shown when the user picks "ดำเนินการต่อด้วย Thai ID": a centred card with a
   live, auto-rotating QR (the citizen scans it in the ThaID app). The
   countdown mirrors the real one-minute QR lifetime; on expiry the seed
   rotates and the timer resets so the code is never stale. Scanning is
   simulated by clicking the QR, which advances to OTP verification. */
const ThaIdQrCard = ({ onBack, onScanned }) => {
  const [secondsLeft, setSecondsLeft] = useState(59);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          /* QR expired — rotate to a fresh code and restart the minute. */
          setNonce((n) => n + 1);
          return 59;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  /* Deterministic per-rotation payload (a mock DOPA ThaID auth ref). */
  const qrSeed = `https://imauth.bora.dopa.go.th/phcis/login?ref=PHCIS-${nonce}`;

  return (
    <div
      className='relative z-[1] w-full flex flex-col items-center'
      style={{ maxWidth: 'var(--dim-size-2700)', gap: 'var(--dim-space-400)' }}
    >
      <div
        className='mih-signin-panel flex flex-col items-center text-center'
        style={{
          background: 'var(--surface-card-100)',
          boxShadow: 'var(--shadow-brand-drop-bottom-400)',
          gap: 'var(--dim-space-800)',
        }}
      >
        {/* Heading + countdown */}
        <div className='flex flex-col items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <h1
            style={{
              margin: 0,
              color: 'var(--text-brandPrimary-default)',
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-2xl)',
              fontWeight: 'var(--type-weight-regular)',
              lineHeight: 1.375,
            }}
          >
            ลงชื่อเข้าใช้งานระบบ
          </h1>
          <p
            style={{
              margin: 0,
              color: 'var(--text-content-secondary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-base)',
              fontWeight: 'var(--type-weight-regular)',
              lineHeight: 1.5,
            }}
          >
            {`หมดเวลาใน: ${mm}:${ss}`}
          </p>
        </div>

        {/* QR with the ThaID badge centred. Clicking simulates a successful
            scan and advances to OTP verification. */}
        <button
          type='button'
          onClick={onScanned}
          title='จำลองการสแกน ThaiID สำเร็จ'
          className='relative inline-flex items-center justify-center'
          style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer' }}
        >
          <FakeQR seed={qrSeed} size={288} />
          <ThaIdQrBadge />
        </button>

        {/* Issuer note */}
        <div
          style={{
            color: 'var(--text-content-secondary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-base)',
            lineHeight: 1.5,
          }}
        >
          <p style={{ margin: 0 }}>คิวอาร์โค้ดนี้เป็นสิ่งยืนยันตนทางดิจิทัล ออกให้โดย</p>
          <p style={{ margin: 0 }}>กรมการปกครอง กระทรวงมหาดไทย</p>
        </div>
      </div>

      {/* Back to the credentials form */}
      <button
        type='button'
        onClick={onBack}
        className='inline-flex items-center'
        style={{
          background: 'transparent',
          border: 0,
          padding: 0,
          cursor: 'pointer',
          gap: 'var(--dim-space-100)',
          color: 'var(--text-brandPrimary-default)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          fontWeight: 'var(--type-weight-medium)',
          lineHeight: 1.5,
        }}
      >
        <Sym name='chevron_left' size={'var(--dim-size-400)'} color='currentColor' />
        ย้อนกลับ
      </button>
    </div>
  );
};

export default function LoginPage() {
  const history = useHistory();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [thaiIdOpen, setThaiIdOpen] = useState(false);

  const goToOtp = (e) => {
    e && e.preventDefault();
    /* Real auth wiring lands here; the flow continues to OTP verification. */
    history.push('/login/verify');
  };

  const contactIt = () => {
    const stamp = new Date().toLocaleString('th-TH');
    const subject = '[PHCIS] แจ้งปัญหา - เข้าสู่ระบบไม่ได้';
    const body =
      'เรียน ทีมสนับสนุนไอทีโรงพยาบาล\n\n' +
      'ไม่สามารถเข้าสู่ระบบ PHCIS ได้ กรุณาช่วยตรวจสอบด้วย\n\n' +
      `Username : ${username || '(โปรดระบุ)'}\n` +
      `เวลา : ${stamp}\n` +
      'ปัญหา : (โปรดระบุ)\n\n' +
      'ขอบคุณครับ/ค่ะ';
    window.location.href = `mailto:${IT_SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  /* Centered green text link used for "ลืมรหัสผ่าน?" + "ติดต่อฝ่ายไอที". */
  const linkStyle = {
    background: 'transparent',
    border: 0,
    padding: 0,
    cursor: 'pointer',
    color: 'var(--text-brandPrimary-default)',
    fontFamily: 'var(--type-family-body)',
    fontSize: 'var(--type-size-sm)',
    fontWeight: 'var(--type-weight-medium)',
    lineHeight: 1.5,
  };

  const submitDisabled = !username || !password;

  return (
    <div className='mih-signin-screen'>
      <SignInBackground />

      {thaiIdOpen ? (
        <ThaIdQrCard onBack={() => setThaiIdOpen(false)} onScanned={goToOtp} />
      ) : (
      /* Figma 79:15265 — padded row: illustration flex-grows, card fixed 448px. */
      <div className='mih-signin-content'>
        {/* Left — isometric healthcare illustration (Figma 79:14357). */}
        <div className='mih-signin-illus'>
          <img
            src='/illustration/signin-consultation.png'
            alt='ระบบบริการสุขภาพปฐมภูมิ PHCIS'
            className='w-full h-auto select-none pointer-events-none'
            style={{ maxWidth: 'var(--dim-size-2900)' }}
            draggable={false}
          />
        </div>

        {/* Right — sign-in card (Figma 40:10656 inside 79:15268). */}
        <form
          onSubmit={goToOtp}
          className='mih-signin-panel flex flex-col justify-center items-stretch'
          style={{
            gap: 'var(--dim-space-800)',
            background: 'var(--surface-card-100)',
            boxShadow: 'var(--shadow-brand-drop-bottom-400)',
          }}
        >
          {/* Heading — brand seal sits inside the header group (Figma 32:2129). */}
          <div className='flex flex-col items-center text-center' style={{ gap: 'var(--dim-space-200)' }}>
            <img
              src='/images/office-health-logo.png'
              alt='ตราสัญลักษณ์โรงพยาบาล'
              style={{ width: 'var(--dim-size-1100)', height: 'var(--dim-size-1100)' }}
              draggable={false}
            />
              <h1
                style={{
                  margin: 0,
                  color: 'var(--text-brandPrimary-default)',
                  fontFamily: 'var(--type-family-heading-graphic2)',
                  fontSize: 'var(--type-size-2xl)',
                  fontWeight: 'var(--type-weight-regular)',
                  lineHeight: 1.375,
                }}
              >
                ลงชื่อเข้าใช้งานระบบ
              </h1>
              <p
                style={{
                  margin: 0,
                  color: 'var(--text-content-secondary)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-base)',
                  fontWeight: 'var(--type-weight-regular)',
                  lineHeight: 1.5,
                }}
              >
                กรุณาระบุข้อมูลประจำตัวเพื่อเข้าสู่ระบบ
              </p>
            </div>

            {/* Thai ID — neutral outline button with the ThaID brand mark.
               Built inline (not <NeutralButton>) so the brand badge can sit
               in the leading slot; tokens mirror NeutralButton/outline. */}
            <button
              type='button'
              onClick={() => setThaiIdOpen(true)}
              className='flex items-center w-full transition-colors duration-200 ease-out'
              style={{
                gap: 'var(--dim-space-200)',
                height: 'var(--dim-size-900, 44px)',
                paddingLeft: 'var(--dim-space-400)',
                paddingRight: 'var(--dim-space-400)',
                borderRadius: 'var(--dim-radius-200)',
                border: 'var(--dim-stroke-100) solid var(--border-neutralButton-default)',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              <ThaIdLogo />
              <span
                className='flex-1 text-center'
                style={{
                  color: 'var(--text-neutralButton-default)',
                  fontFamily: 'var(--type-family-heading-graphic2)',
                  fontSize: 'var(--type-size-base)',
                  fontWeight: 'var(--type-weight-regular)',
                  lineHeight: 1.5,
                }}
              >
                ดำเนินการต่อด้วย Thai ID
              </span>
              <Sym name='arrow_forward' size={'var(--dim-size-400)'} color='var(--icon-neutralButton-default)' />
            </button>

            {/* Credentials */}
            <div className='flex flex-col items-stretch' style={{ gap: 'var(--dim-space-400)' }}>
              <InputField
                label='อีเมลหรือชื่อผู้ใช้'
                leadingIcon='person'
                placeholder='example@hospital.com หรือชื่อผู้ใช้'
                value={username}
                onChange={(v) => setUsername(v)}
                autoComplete='username'
                style={{ width: '100%' }}
              />
              <PasswordField
                label='รหัสผ่าน'
                value={password}
                onChange={(v) => setPassword(v)}
                autoComplete='current-password'
                style={{ width: '100%' }}
              />
              <Checkbox
                label='จำข้อมูลนี้ในการเข้าใช้ครั้งถัดไป'
                checked={remember}
                onChange={setRemember}
              />
            </div>

            {/* Submit — disabled until both credentials are entered (Figma
               default/empty state shows the neutral disabled fill). */}
            <BrandButton
              variant='fill'
              size='lg'
              type='submit'
              trailingIcon='arrow_forward'
              disabled={submitDisabled}
              style={{ width: '100%', maxWidth: 'none' }}
            >
              เข้าสู่ระบบ
            </BrandButton>

            {/* Forgot password */}
            <div className='flex justify-center'>
              <button type='button' style={linkStyle} onClick={() => history.push('/login/verify')}>
                ลืมรหัสผ่าน?
              </button>
            </div>

            {/* Help / IT support */}
            <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-300)' }}>
              <span
                style={{
                  color: 'var(--text-content-secondary)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                  lineHeight: 1.5,
                }}
              >
                ต้องการความช่วยเหลือ?
              </span>
              <button type='button' style={linkStyle} onClick={contactIt}>
                ติดต่อฝ่ายไอทีโรงพยาบาล
              </button>
            </div>
        </form>
      </div>
      )}
    </div>
  );
}
