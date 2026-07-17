import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  MobileShell,
  useMobileApp,
  Sym,
  BrandButton,
  BrandSubdueButton,
  NeutralButton,
  MobileInputField,
  Password,
} from '@/components/mobile';
import Checkbox from '@/components/checkbox/Checkbox';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import { CURRENT_USER } from '@/data/mobileMock';

/* BMA Health · Sign In — Archive Figma 4WXeI8fgBLQGgQ9VheM2yD · Login 147:27384
   Branching (artboard Title Annotations):
   · เคย set PIN ไว้ → Unlock PIN / Biometric ก่อน → Home
   · ไม่เคย set PIN → หน้า Login (รหัสผ่าน)
   Annotation Thai ID: deep-link ThaID app หรือส่งไปสโตร์ถ้ายังไม่ติดตั้ง
   PIN lock: ผิด 5 ครั้ง → ล็อก 2 ชม. (แจ้งหลังผิด 3 ครั้ง) */

/* Sign-in hero — Figma 147:27384 "Man visiting Hospital" (also Lottie). */
const SIGNIN_HERO_LOTTIE = '/illustration/mobile/man-visiting-hospital.json';
const SIGNIN_HERO_FALLBACK = '/illustration/mobile/signin-hero.png';
const SIGNIN_HERO_SIZE = 128;

/* Unlock-PIN artwork — Figma 2042:27787 "Mobile security" at 112px. Reuses the
   welcome-4 asset (same illustration in the Figma library). */
const UNLOCK_ART_LOTTIE = '/illustration/mobile/mobile-security-recolored.json';
const UNLOCK_ART_FALLBACK = '/illustration/mobile/welcome-4-mobile-security.png';
const UNLOCK_ART_SIZE = 112;

/* Keypad key — Figma 2042:27804 (KeypadButton). 72px disc, 1px primary/400
   ring. Shared by the digits and the delete key so they can't drift apart. */
const KEY_STYLE = {
  width: 'var(--dim-size-1600, 72px)',
  height: 'var(--dim-size-1600, 72px)',
  margin: '0 auto',
  border: 'var(--dim-stroke-100, 1px) solid var(--brand-p400, #6AD6A5)',
  borderRadius: 'var(--dim-radius-full, 9999px)',
  background: 'transparent',
  color: 'var(--text-content-on-content, #FFFFFF)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const STORAGE_PIN = 'phcis_mobile_pin_v1';
const STORAGE_PIN_LOCK = 'phcis_mobile_pin_lock_until_v1';
const STORAGE_REMEMBER = 'phcis_mobile_remember_id_v1';
const STORAGE_BIO = 'phcis_mobile_biometric_enabled_v1';
const PIN_LEN = 6;
const PIN_MAX_ATTEMPTS = 5;
const PIN_WARN_AT = 3;
const PIN_LOCK_MS = 2 * 60 * 60 * 1000;

const C = {
  teal: 'var(--mobile-surface-brandPrimaryButton-default, #08A768)',
  brand: 'var(--text-brandPrimary-default, #007549)',
  brandSoft: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
  ink: 'var(--text-content-default, #111314)',
  sub: 'var(--text-content-secondary, #636B72)',
  muted: 'var(--text-content-tertiary, #858C92)',
  card: 'var(--surface-card-100, #FFFFFF)',
  border: 'var(--border-content-tertiary, #E1E3E5)',
  danger: 'var(--text-alert-error, #B91C1C)',
  dangerBg: 'var(--surface-alert-error, #FFF0F0)',
  dangerBorder: 'var(--border-alert-error, #FEE2E2)',
  white: 'var(--text-content-on-content, #FFFFFF)',
};

/* Figma 147:27384 Login fill — Linear exact:
   155.55deg, #13B292 0% → #00A08E 120.93% */
const LOGIN_BG = 'linear-gradient(155.55deg, #13B292 0%, #00A08E 120.93%)';

const digits = (v) => String(v || '').replace(/\D/g, '');

const DEMO_PHONE = digits(CURRENT_USER.phone);

const passwordMatches = (password) => {
  if (password === CURRENT_USER.password) return true;
  try {
    const reset = localStorage.getItem('phcis_mobile_demo_password_v1');
    return Boolean(reset) && password === reset;
  } catch {
    return false;
  }
};

const readPin = () => {
  try { return localStorage.getItem(STORAGE_PIN) || ''; } catch { return ''; }
};

const readRememberedId = () => {
  try { return localStorage.getItem(STORAGE_REMEMBER) || ''; } catch { return ''; }
};

const pinLockUntil = () => {
  try {
    const raw = localStorage.getItem(STORAGE_PIN_LOCK);
    return raw ? Number(raw) : 0;
  } catch { return 0; }
};

const hasBiometric = () => {
  try { return localStorage.getItem(STORAGE_BIO) === '1'; } catch { return false; }
};

/* Strip native chrome from pill fields (project rule for wrapped inputs). */
if (typeof document !== 'undefined' && !document.getElementById('mih-signin-input-chrome')) {
  const style = document.createElement('style');
  style.id = 'mih-signin-input-chrome';
  style.textContent = `
    .mih-signin-input,
    .mih-signin-input:focus,
    .mih-signin-input:focus-visible {
      caret-color: var(--text-content-default, #111314);
      border: 0 !important;
      outline: none !important;
      box-shadow: none !important;
      background: transparent !important;
      -webkit-appearance: none !important;
      appearance: none !important;
    }
    .mih-signin-input::placeholder {
      color: var(--text-content-tertiary, #858C92);
      opacity: 1;
    }
  `;
  document.head.appendChild(style);
}

const ErrorAlert = ({ message, onClose }) => (
  <div
    className='flex items-start'
    role='alert'
    style={{
      gap: 'var(--dim-space-300, 12px)',
      padding: 'var(--dim-space-400, 16px)',
      background: C.dangerBg,
      border: `var(--dim-stroke-100, 1px) solid ${C.dangerBorder}`,
      borderRadius: 'var(--dim-radius-600, 24px)',
      width: '100%',
    }}
  >
    <span className='inline-flex shrink-0' style={{ color: C.danger, marginTop: 2 }}>
      <Sym name='cancel' size={20} />
    </span>
    <p
      style={{
        flex: 1,
        margin: 0,
        fontSize: 'var(--type-size-xs, 12px)',
        fontWeight: 'var(--type-weight-medium, 500)',
        color: C.danger,
        lineHeight: 1.5,
      }}
    >
      {message}
    </p>
    {onClose && (
      <button
        type='button'
        onClick={onClose}
        aria-label='ปิด'
        style={{
          border: 0,
          background: 'transparent',
          cursor: 'pointer',
          padding: 0,
          color: C.danger,
          display: 'inline-flex',
        }}
      >
        <Sym name='close' size={18} />
      </button>
    )}
  </div>
);

/* ─── Unlock PIN (2042:27780) ───────────────────────────────────────── */
export const UnlockPinView = ({
  onSuccess,
  onForgot,
  onClose,
  onUseBiometric,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(pinLockUntil);

  /* Same contract as the sign-in hero: fetch the JSON and hand the parsed
     object to <LottieIllustration animationData> — `path:` races the container. */
  const [pinAnim, setPinAnim] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch(UNLOCK_ART_LOTTIE)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setPinAnim(d); })
      .catch(() => { /* keep the static PNG fallback */ });
    return () => { alive = false; };
  }, []);

  const locked = lockedUntil > Date.now();

  useEffect(() => {
    if (!locked) return undefined;
    const id = window.setInterval(() => {
      if (pinLockUntil() <= Date.now()) {
        setLockedUntil(0);
        setError('');
        try { localStorage.removeItem(STORAGE_PIN_LOCK); } catch { /* noop */ }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [locked]);

  const press = (n) => {
    if (locked) return;
    if (pin.length >= PIN_LEN) return;
    const next = pin + n;
    setPin(next);
    setError('');
    if (next.length === PIN_LEN) {
      window.setTimeout(() => verify(next), 80);
    }
  };

  const backspace = () => {
    if (locked) return;
    setPin((p) => p.slice(0, -1));
    setError('');
  };

  const verify = (value) => {
    const stored = readPin();
    if (!stored || value === stored) {
      setAttempts(0);
      onSuccess();
      return;
    }
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setPin('');
    if (nextAttempts >= PIN_MAX_ATTEMPTS) {
      const until = Date.now() + PIN_LOCK_MS;
      try { localStorage.setItem(STORAGE_PIN_LOCK, String(until)); } catch { /* noop */ }
      setLockedUntil(until);
      setError('กรอกรหัส PIN ผิดครบ 5 ครั้ง — ล็อกไว้ 2 ชั่วโมง หรือรีเซ็ต PIN');
      return;
    }
    if (nextAttempts >= PIN_WARN_AT) {
      setError(`รหัส PIN ไม่ถูกต้อง (เหลืออีก ${PIN_MAX_ATTEMPTS - nextAttempts} ครั้ง)`);
      return;
    }
    setError('รหัส PIN ไม่ถูกต้อง');
  };

  return (
    <div
      className='flex flex-col'
      style={{
        minHeight: '100%',
        background: LOGIN_BG,
        color: C.white,
        position: 'relative',
      }}
    >
      <button
        type='button'
        onClick={onClose}
        aria-label='ปิด'
        className='inline-flex items-center justify-center'
        style={{
          position: 'absolute',
          top: 'var(--dim-space-400, 16px)',
          right: 'var(--dim-space-400, 16px)',
          width: 40,
          height: 40,
          borderRadius: 'var(--dim-radius-full)',
          border: 0,
          background: C.white,
          color: C.teal,
          cursor: 'pointer',
          zIndex: 2,
        }}
      >
        <Sym name='close' size={22} />
      </button>

      <div
        className='flex-1 flex flex-col items-center'
        style={{
          padding: 'var(--dim-space-800, 32px) var(--dim-space-500, 20px) var(--dim-space-400, 16px)',
          gap: 'var(--dim-space-400, 16px)',
        }}
      >
        {/* Figma 2042:27787 "Mobile security", 112px. The old signin-pin-hero.png
            was a cropped screenshot with the title AND the six PIN dots baked
            into it, so the screen drew both twice — once flat in the image and
            once live below. Same artwork as the welcome-4 slide. */}
        {pinAnim ? (
          <LottieIllustration
            animationData={pinAnim}
            size={UNLOCK_ART_SIZE}
            loop
            ariaLabel=''
          />
        ) : (
          <img
            src={UNLOCK_ART_FALLBACK}
            alt=''
            width={UNLOCK_ART_SIZE}
            height={UNLOCK_ART_SIZE}
            style={{ width: UNLOCK_ART_SIZE, height: UNLOCK_ART_SIZE, objectFit: 'contain' }}
          />
        )}
        {/* Text style "h3" — heading-graphic2 Regular 24/1.375 (Figma 2042:27790).
            Not bold: the Figma style is weight/regular. */}
        <h1
          style={{
            margin: 0,
            textAlign: 'center',
            fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
            fontSize: 'var(--type-size-2xl, 24px)',
            fontWeight: 'var(--type-weight-regular, 400)',
            color: C.white,
            lineHeight: 1.375,
          }}
        >
          กรอกรหัส PIN เพื่อเข้าสู่ระบบ
        </h1>

        <div className='flex justify-center' style={{ gap: 'var(--dim-space-300, 12px)', marginTop: 'var(--dim-space-200, 8px)' }}>
          {Array.from({ length: PIN_LEN }).map((_, i) => (
            <span
              key={i}
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: i < pin.length ? C.white : 'transparent',
                border: `2px solid ${C.white}`,
                boxSizing: 'border-box',
              }}
            />
          ))}
        </div>

        {error && (
          <p
            style={{
              margin: 0,
              textAlign: 'center',
              fontSize: 'var(--type-size-sm, 14px)',
              color: C.white,
              opacity: 0.95,
              maxWidth: 280,
            }}
          >
            {error}
          </p>
        )}

        {hasBiometric() && !locked && (
          <button
            type='button'
            onClick={onUseBiometric}
            style={{
              border: 0,
              background: 'transparent',
              color: C.white,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--dim-space-200, 8px)',
              fontSize: 'var(--type-size-sm, 14px)',
              padding: 'var(--dim-space-200, 8px)',
            }}
          >
            <Sym name='fingerprint' size={22} />
            ใช้ลายนิ้วมือ / Face ID
          </button>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'var(--dim-space-400, 16px)',
          padding: 'var(--dim-space-400, 16px) var(--dim-space-600, 24px)',
          maxWidth: 360,
          width: '100%',
          margin: '0 auto',
        }}
      >
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k) => {
          if (k === '') return <span key='empty' />;
          if (k === 'del') {
            /* Delete shares the number keys' disc + hairline ring (Figma
               2042:27817) — it is a keypad key, not a bare glyph. */
            return (
              <button
                key='del'
                type='button'
                onClick={backspace}
                aria-label='ลบ'
                disabled={locked}
                style={{ ...KEY_STYLE, cursor: locked ? 'not-allowed' : 'pointer' }}
              >
                <Sym name='backspace' size={24} />
              </button>
            );
          }
          return (
            <button
              key={k}
              type='button'
              onClick={() => press(k)}
              disabled={locked}
              style={{
                ...KEY_STYLE,
                /* Digits are body/Sarabun Bold 24, not the heading face
                   (Figma text style "body1-emphasis"). */
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-2xl, 24px)',
                fontWeight: 'var(--type-weight-bold, 700)',
                cursor: locked ? 'not-allowed' : 'pointer',
                opacity: locked ? 0.5 : 1,
              }}
            >
              {k}
            </button>
          );
        })}
      </div>

      <div style={{ padding: 'var(--dim-space-300, 12px) var(--dim-space-500, 20px) var(--dim-space-600, 24px)' }}>
        {/* Figma 2042:27819 — Brand Subdue Button, Style=Outline Size=Medium.
            On the teal wash the ring is brand/200, not white, and the label is
            on-content white (the component's own brand ink would vanish). */}
        <BrandSubdueButton
          variant='outline'
          size='md'
          onClick={onForgot}
          style={{
            background: 'transparent',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimaryButton-tertiary, #C5EDDA)',
            color: 'var(--text-content-on-content, #FFFFFF)',
          }}
        >
          ลืมรหัส PIN?
        </BrandSubdueButton>
      </div>
    </div>
  );
};

/* ─── Password login (Figma 147:27384) ──────────────────────────────── */
const LoginFormView = ({ onSignedIn, onBackToPin, showPinReturn }) => {
  const history = useHistory();
  const remembered = readRememberedId();
  const [identifier, setIdentifier] = useState(remembered);
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(Boolean(remembered));
  const [error, setError] = useState('');
  const [thaiIdMsg, setThaiIdMsg] = useState('');

  /* Hero Lottie lives in public/, so fetch the JSON and hand the parsed object
     to <LottieIllustration animationData> — same contract as <SuccessScreen>.
     Passing `path:` instead would hit the empty-container race the component
     documents. Until it resolves, the PNG still renders (no layout jump). */
  const [heroAnim, setHeroAnim] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch(SIGNIN_HERO_LOTTIE)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setHeroAnim(d); })
      .catch(() => { /* keep the static PNG fallback */ });
    return () => { alive = false; };
  }, []);

  const idDigits = digits(identifier);
  const canSubmit = idDigits.length >= 10 && password.length > 0;

  const matchesIdentity = () => {
    if (idDigits === CURRENT_USER.citizenId) return true;
    if (idDigits === DEMO_PHONE) return true;
    return false;
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setError('');
    setThaiIdMsg('');
    if (!canSubmit) return;
    if (!matchesIdentity() || !passwordMatches(password)) {
      setError('เลขบัตรประชาชนหรือเบอร์โทรศัพท์ไม่ถูกต้อง');
      return;
    }
    try {
      if (remember) localStorage.setItem(STORAGE_REMEMBER, identifier);
      else localStorage.removeItem(STORAGE_REMEMBER);
    } catch { /* noop */ }
    onSignedIn({ via: 'password' });
  };

  const openThaiId = () => {
    /* Figma annotation 149:29339 — deep-link ThaID; store fallback if missing.
       Demo: surface a short note until the native bridge lands. */
    const thaidScheme = 'thaid://';
    try {
      window.location.href = thaidScheme;
    } catch { /* noop */ }
    setThaiIdMsg('Thai ID จะเชื่อมต่อในรอบถัดไป — ใช้เลขบัตร/เบอร์ + รหัสผ่านได้ในโหมดสาธิต');
  };

  return (
    <div
      className='flex flex-col'
      style={{
        minHeight: '100%',
        backgroundImage: LOGIN_BG,
      }}
    >
      {/* Hero sits on the teal band, overlapping the white sheet (Figma). */}
      <div
        className='flex justify-center shrink-0'
        style={{
          paddingTop: 'var(--dim-space-600, 24px)',
          marginBottom: -20,
          position: 'relative',
          zIndex: 2,
        }}
      >
        {heroAnim ? (
          <LottieIllustration
            animationData={heroAnim}
            size={SIGNIN_HERO_SIZE}
            loop
            ariaLabel='ผู้ใช้เดินทางมาโรงพยาบาล'
            style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))' }}
          />
        ) : (
          <img
            src={SIGNIN_HERO_FALLBACK}
            alt=''
            width={SIGNIN_HERO_SIZE}
            height={SIGNIN_HERO_SIZE}
            style={{
              width: SIGNIN_HERO_SIZE,
              height: SIGNIN_HERO_SIZE,
              objectFit: 'contain',
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))',
            }}
          />
        )}
      </div>

      {/* Figma 147:27162 — 16px side inset around the white card */}
      <div
        className='flex-1 flex flex-col'
        style={{
          paddingLeft: 'var(--dim-space-400, 16px)',
          paddingRight: 'var(--dim-space-400, 16px)',
          marginTop: 0,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          className='flex flex-col'
          style={{
            flex: 1,
            background: C.card,
            borderTopLeftRadius: 100,
            borderTopRightRadius: 100,
            borderBottomLeftRadius: 'var(--dim-radius-600, 24px)',
            borderBottomRightRadius: 'var(--dim-radius-600, 24px)',
            padding: 'var(--dim-space-600, 24px)',
            boxShadow: 'var(--shadow-brand-drop-bottom-400)',
            gap: 'var(--dim-space-600, 24px)',
          }}
        >
          <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-150, 6px)', textAlign: 'center' }}>
            <h1
              style={{
                margin: 0,
                width: '100%',
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-2xl, 24px)',
                fontWeight: 'var(--type-weight-regular, 400)',
                color: C.brand,
                lineHeight: 1.375,
              }}
            >
              เข้าสู่ระบบ
            </h1>
            <p
              style={{
                margin: 0,
                width: '100%',
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-base, 16px)',
                color: C.sub,
                lineHeight: 1.5,
              }}
            >
              จัดการสุขภาพของคุณง่ายๆ ผ่านสมาร์ทโฟน
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            className='flex flex-col'
            style={{ gap: 'var(--dim-space-600, 24px)', flex: 1 }}
          >
            <NeutralButton
              variant='outline'
              size='Large'
              trailingIcon='arrow_forward'
              showLeadingIcon={false}
              showTailingIcon
              type='button'
              onClick={openThaiId}
              style={{ justifyContent: 'center' }}
            >
              <img
                src='/illustration/mobile/thai-id-logo.png'
                alt=''
                width={32}
                height={32}
                style={{
                  width: 32,
                  height: 32,
                  objectFit: 'cover',
                  borderRadius: 'var(--dim-radius-100, 4px)',
                  flexShrink: 0,
                }}
              />
              เข้าสู่ระบบด้วย Thai ID
            </NeutralButton>

            {thaiIdMsg && (
              <p style={{ margin: '-12px 0 0', fontSize: 'var(--type-size-xs, 12px)', color: C.sub, textAlign: 'center' }}>
                {thaiIdMsg}
              </p>
            )}

            {error && <ErrorAlert message={error} onClose={() => setError('')} />}

            <MobileInputField
              label='เลขบัตรประชาชน / เบอร์โทรศัพท์'
              required
              size='Large'
              leadingIcon='person'
              placeholder='กรอกเลขบัตรประชาชนหรือเบอร์โทร'
              value={identifier}
              inputMode='numeric'
              maxLength={13}
              autoComplete='username'
              onChange={(e) => {
                setIdentifier(digits(e.target.value).slice(0, 13));
                setError('');
              }}
            />

            <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <Password
                label='รหัสผ่าน'
                required
                size='Large'
                placeholder='กรอกรหัสผ่านอีกครั้ง'
                value={password}
                autoComplete='current-password'
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
              />

              <div className='flex items-center' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                <div className='flex-1 min-w-0'>
                  <Checkbox
                    checked={remember}
                    onChange={setRemember}
                    label='จดจำฉันไว้'
                  />
                </div>
                <BrandButton
                  variant='ghost'
                  size='Small'
                  type='button'
                  showLeadingIcon={false}
                  showTailingIcon={false}
                  onClick={() => history.push('/m/reset')}
                  style={{ width: 'auto', flexShrink: 0 }}
                >
                  ลืมรหัสผ่าน?
                </BrandButton>
              </div>
            </div>

            <BrandButton
              type='submit'
              size='Large'
              disabled={!canSubmit}
              showLeadingIcon={false}
              showTailingIcon={false}
            >
              เข้าสู่ระบบ
            </BrandButton>

            <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border-neutral-quaternary, #F4F5F5)' }} />
                <span
                  style={{
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm, 14px)',
                    color: C.muted,
                  }}
                >
                  หรือ
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--border-neutral-quaternary, #F4F5F5)' }} />
              </div>

              <div className='flex items-center justify-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <span
                  style={{
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm, 14px)',
                    color: C.muted,
                    lineHeight: 1.5,
                  }}
                >
                  ยังไม่มีบัญชีผู้ใช้?
                </span>
                <BrandButton
                  variant='ghost'
                  size='Small'
                  type='button'
                  showLeadingIcon={false}
                  showTailingIcon={false}
                  onClick={() => history.push('/m/register')}
                  style={{ width: 'auto', flexShrink: 0 }}
                >
                  ลงทะเบียนใหม่
                </BrandButton>
              </div>
            </div>

            {showPinReturn && (
              <button
                type='button'
                onClick={onBackToPin}
                style={{
                  border: 0,
                  background: 'transparent',
                  cursor: 'pointer',
                  color: C.brand,
                  fontSize: 'var(--type-size-sm, 14px)',
                  padding: 'var(--dim-space-200, 8px)',
                }}
              >
                ← กลับไปปลดล็อกด้วย PIN
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

const MobileLoginInner = () => {
  const history = useHistory();
  const { search } = useLocation();
  const { signIn } = useMobileApp();
  const next = new URLSearchParams(search).get('next') || '/m/home';

  const [mode, setMode] = useState(() => (readPin() ? 'pin' : 'login'));

  const finish = () => {
    signIn();
    history.replace(next);
  };

  if (mode === 'pin') {
    return (
      <UnlockPinView
        onSuccess={finish}
        onForgot={() => history.push('/m/reset')}
        onClose={() => setMode('login')}
        onUseBiometric={() => {
          window.setTimeout(finish, 500);
        }}
      />
    );
  }

  return (
    <LoginFormView
      showPinReturn={Boolean(readPin())}
      onBackToPin={() => setMode('pin')}
      onSignedIn={() => {
        finish();
      }}
    />
  );
};

const MobileLoginPage = () => (
  <MobileShell
    requireAuth={false}
    showStatusBar
    showBottomNav={false}
    background={LOGIN_BG}
  >
    <MobileLoginInner />
  </MobileShell>
);

export default MobileLoginPage;

