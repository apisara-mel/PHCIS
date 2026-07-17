import React, { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  MobileShell,
  MobileBadge,
  MobileInputField,
  Password,
  Sym,
  BrandButton,
  BrandSubdueButton,
  NeutralButton,
  SmsPush,
  EmailPush,
} from '@/components/mobile';
import { CURRENT_USER } from '@/data/mobileMock';

/* BMA Health · Forgot Password — Figma Mobile Application 6dCDQkwc8DhvyovBbDTyp5 · 2042:27642.
   Flow: Account Input → OTP → New Password → Success → Login
   Screens: 2042:27643 · 2042:27750 · 2042:27663 · 2042:27695
   OTP is minted per send and surfaced via SmsPush (SMS) or EmailPush (email) ·
   Ref BMA7K · หมดอายุ 5 นาที */

const OTP_REF = 'BMA7K';
const OTP_COOLDOWN_SEC = 60;
const OTP_EXPIRE_SEC = 300;

const C = {
  brand: 'var(--text-brandPrimary-default, #007549)',
  brandSoft: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
  brandTertiary: 'var(--surface-brandPrimary-tertiary, #E2F3EB)',
  borderBrand: 'var(--border-brandPrimary-quaternary, #E2F3EB)',
  teal: 'var(--mobile-surface-brandPrimaryButton-default, #08A768)',
  ink: 'var(--text-content-default, #111314)',
  sub: 'var(--text-content-secondary, #636B72)',
  muted: 'var(--text-content-tertiary, #858C92)',
  neutral: 'var(--text-neutral-default, #4D5358)',
  card: 'var(--surface-card-100, #FFFFFF)',
  screen: 'var(--background-screen-brand-100, #F4FBF8)',
  border: 'var(--border-content-tertiary, #E1E3E5)',
  infoBg: 'var(--surface-alert-info, #F0F6FF)',
  infoBorder: 'var(--border-alert-info, #DBEAFE)',
  infoText: 'var(--text-alert-info, #1D4ED8)',
  danger: 'var(--text-danger-default, #DC2626)',
  require: 'var(--text-danger-default, #DC2626)',
  white: 'var(--text-content-on-content, #FFFFFF)',
};

const digits = (v) => String(v || '').replace(/\D/g, '');
const DEMO_PHONE = digits(CURRENT_USER.phone);
const isEmailContact = (value) => String(value).trim().includes('@');
const maskEmail = (email) => {
  const raw = String(email).trim();
  const at = raw.indexOf('@');
  if (at <= 0) return '***@***';
  const local = raw.slice(0, at);
  const domain = raw.slice(at + 1);
  return `${local[0] || ''}***@${domain}`;
};

const PW_RULES = [
  { key: 'len', label: 'ความยาวอย่างน้อย 8 ตัวอักษร', test: (p) => p.length >= 8 },
  { key: 'case', label: 'มีทั้งตัวอักษรพิมพ์ใหญ่และพิมพ์เล็ก (A-Z, a-z)', test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { key: 'num', label: 'มีตัวเลขอย่างน้อย 1 ตัว (0-9)', test: (p) => /\d/.test(p) },
];

if (typeof document !== 'undefined' && !document.getElementById('mih-reset-input-chrome')) {
  const style = document.createElement('style');
  style.id = 'mih-reset-input-chrome';
  style.textContent = `
    .mih-reset-input,
    .mih-reset-input:focus,
    .mih-reset-input:focus-visible {
      caret-color: var(--text-content-default, #111314);
      border: 0 !important;
      outline: none !important;
      box-shadow: none !important;
      background: transparent !important;
      -webkit-appearance: none !important;
      appearance: none !important;
    }
    .mih-reset-input::placeholder {
      color: var(--text-content-tertiary, #858C92);
      opacity: 1;
    }
    .mih-reset-otp,
    .mih-reset-otp:focus,
    .mih-reset-otp:focus-visible {
      /* Figma 5016:2216 State=Press shows a visible caret in the focused cell. */
      caret-color: var(--text-input-typing, #4D5358);
      border: 0 !important;
      outline: none !important;
      box-shadow: none !important;
      background: transparent !important;
      -webkit-appearance: none !important;
      appearance: none !important;
    }
  `;
  document.head.appendChild(style);
}

const PageHeader = ({ title, onBack }) => (
  <div
    className='flex items-center shrink-0'
    style={{
      height: 68,
      padding: '0 var(--dim-space-200, 8px)',
      borderBottom: `var(--dim-stroke-100) solid ${C.borderBrand}`,
      background: 'var(--surface-navigation-default, #FFFFFF)',
      boxShadow: 'var(--shadow-brand-drop-bottom-100, 0 1px 2px rgba(8,167,104,0.08))',
    }}
  >
    {onBack ? (
      <button
        type='button'
        onClick={onBack}
        aria-label='ย้อนกลับ'
        className='inline-flex items-center justify-center'
        style={{
          width: 40,
          height: 40,
          border: 0,
          background: 'transparent',
          cursor: 'pointer',
          color: C.ink,
          borderRadius: 'var(--dim-radius-full)',
        }}
      >
        <Sym name='chevron_left' size={24} />
      </button>
    ) : (
      <span style={{ width: 40 }} aria-hidden />
    )}
    <span
      style={{
        flex: 1,
        textAlign: 'center',
        fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
        fontSize: 'var(--type-size-base, 16px)',
        color: C.ink,
      }}
    >
      {title}
    </span>
    <span style={{ width: 40 }} aria-hidden />
  </div>
);

const Card = ({ children, style }) => (
  <div
    style={{
      background: C.card,
      borderRadius: 'var(--dim-radius-500, 16px)',
      boxShadow: 'var(--shadow-brand-drop-bottom-100, 0 1px 2px rgba(8,167,104,0.08))',
      padding: 'var(--dim-space-600, 24px)',
      width: '100%',
      ...style,
    }}
  >
    {children}
  </div>
);

const Title = ({ children }) => (
  <h1
    style={{
      margin: 0,
      textAlign: 'center',
      fontFamily: 'var(--type-family-heading-graphic2)',
      fontSize: 'var(--type-size-2xl, 24px)',
      fontWeight: 'var(--type-weight-regular, 400)',
      color: C.brand,
      lineHeight: 1.375,
    }}
  >
    {children}
  </h1>
);

const Subtitle = ({ children }) => (
  <p
    style={{
      margin: 'var(--dim-space-150, 6px) 0 0',
      textAlign: 'center',
      fontSize: 'var(--type-size-sm, 14px)',
      color: C.muted,
      lineHeight: 1.5,
    }}
  >
    {children}
  </p>
);

const PillField = ({
  label,
  required,
  icon,
  trailing,
  type = 'text',
  value,
  onChange,
  placeholder,
  inputMode,
  maxLength,
  autoComplete,
}) => (
  <label className='flex flex-col' style={{ gap: 'var(--dim-space-150, 6px)', width: '100%' }}>
    <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: C.ink }}>
      {label}
      {required && <span style={{ color: C.require }}> *</span>}
    </span>
    <div
      className='flex items-center'
      style={{
        minHeight: 56,
        padding: '0 var(--dim-space-600, 24px)',
        gap: 'var(--dim-space-200, 8px)',
        border: `var(--dim-stroke-100, 1px) solid ${C.border}`,
        borderRadius: 'var(--dim-radius-full, 9999px)',
        background: C.card,
      }}
    >
      {icon && (
        <span className='inline-flex shrink-0' style={{ color: C.muted }}>
          <Sym name={icon} size={20} />
        </span>
      )}
      <input
        className='mih-reset-input'
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        autoComplete={autoComplete}
        style={{
          flex: 1,
          minWidth: 0,
          height: '100%',
          padding: 0,
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-base, 16px)',
          color: C.ink,
        }}
      />
      {trailing}
    </div>
  </label>
);

const StickyFooter = ({ children }) => (
  <div
    style={{
      background: C.card,
      borderTop: `var(--dim-stroke-100) solid ${C.borderBrand}`,
      boxShadow: 'var(--shadow-brand-drop-top-100, 0 -1px 2px rgba(8,167,104,0.08))',
      padding: 'var(--dim-space-400, 16px)',
    }}
  >
    {children}
  </div>
);

/* ─── Step 1 · Account Input (2042:27643) ───────────────────────────── */
const FORGOT_ACCOUNT_HERO_SIZE = 128;

const AccountStep = ({ cid, setCid, contact, setContact, error, onSubmit, onBack }) => {
  const canSubmit = digits(cid).length === 13 && String(contact).trim().length > 0;

  return (
    <div className='flex flex-col' style={{ minHeight: '100%', background: C.screen }}>
      <PageHeader title='ลืมรหัสผ่าน' onBack={onBack} />
      <div
        className='flex-1 flex flex-col min-h-0'
        style={{ padding: 'var(--dim-space-400, 16px)' }}
      >
        <div
          className='flex flex-col flex-1 min-h-0 items-center justify-center'
          style={{
            width: '100%',
            background: C.card,
            borderRadius: 'var(--dim-radius-600, 24px)',
            boxShadow: 'var(--shadow-brand-drop-top-100, 0 -1px 2px rgba(8,167,104,0.08))',
            padding: 'var(--dim-space-600, 24px)',
            gap: 'var(--dim-space-600, 24px)',
          }}
        >
          <div
            className='flex flex-col items-center w-full'
            style={{ gap: 'var(--dim-space-200, 8px)' }}
          >
            <div
              className='flex flex-col items-center w-full'
              style={{ gap: 'var(--dim-space-150, 6px)' }}
            >
              <img
                src='/illustration/mobile/forgot-account-hero.png'
                alt=''
                aria-hidden
                width={FORGOT_ACCOUNT_HERO_SIZE}
                height={FORGOT_ACCOUNT_HERO_SIZE}
                style={{
                  width: FORGOT_ACCOUNT_HERO_SIZE,
                  height: FORGOT_ACCOUNT_HERO_SIZE,
                  objectFit: 'contain',
                  flexShrink: 0,
                }}
              />
              <Title>ลืมรหัสผ่านใช่หรือไม่?</Title>
              <div
                style={{
                  width: '100%',
                  textAlign: 'center',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm, 14px)',
                  fontWeight: 'var(--type-weight-regular, 400)',
                  lineHeight: 1.5,
                  color: C.muted,
                }}
              >
                <p style={{ margin: 0 }}>กรุณากรอกข้อมูลบัญชีของคุณเพื่อรับรหัสผ่าน</p>
                <p style={{ margin: 0 }}>แบบใช้ครั้งเดียว (OTP)</p>
              </div>
            </div>
          </div>

          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600, 24px)' }}>
            <MobileInputField
              size='lg'
              label='เลขประจำตัวประชาชน'
              leadingIcon='person'
              placeholder='กรอกเลขประจำตัวประชาชน'
              value={cid}
              inputMode='numeric'
              maxLength={13}
              autoComplete='username'
              onChange={(e) => setCid(digits(e.target.value).slice(0, 13))}
            />
            <MobileInputField
              size='lg'
              label='อีเมลหรือเบอร์โทรศัพท์'
              leadingIcon='mail'
              placeholder='กรอกอีเมลหรือเบอร์โทรศัพท์'
              value={contact}
              autoComplete='email'
              onChange={(e) => setContact(e.target.value)}
            />

            {error ? (
              <p style={{ margin: 0, fontSize: 'var(--type-size-sm, 14px)', color: C.danger }}>{error}</p>
            ) : null}

            <div
              className='flex items-start w-full'
              style={{
                gap: 'var(--dim-space-300, 12px)',
                padding: 'var(--dim-space-400, 16px)',
                background: C.infoBg,
                border: `var(--dim-stroke-100) solid ${C.infoBorder}`,
                borderRadius: 'var(--dim-radius-600, 24px)',
              }}
            >
              <span
                className='inline-flex shrink-0'
                style={{ color: C.infoText, paddingTop: 'var(--dim-space-050, 2px)' }}
              >
                <Sym name='info' size={16} />
              </span>
              <p
                style={{
                  margin: 0,
                  flex: 1,
                  fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
                  fontSize: 'var(--type-size-sm, 14px)',
                  fontWeight: 'var(--type-weight-regular, 400)',
                  color: C.infoText,
                  lineHeight: 1.5,
                }}
              >
                หากข้อมูลตรงกับระบบจะได้รับรหัสยืนยัน ทาง SMS ส่งไปยังเบอร์โทรศัพท์ที่ท่านได้
                {' '}
                ลงทะเบียนไว้
              </p>
            </div>
          </div>
        </div>
      </div>
      <StickyFooter>
        <BrandButton
          type='button'
          size='lg'
          tailingIcon='chevron_right'
          disabled={!canSubmit}
          onClick={onSubmit}
        >
          ส่งรหัสยืนยัน
        </BrandButton>
      </StickyFooter>
    </div>
  );
};

/* ─── Step 2 · OTP (2042:27750) ─────────────────────────────────────── */
const maskPhone = (phone) => {
  const d = digits(phone);
  if (d.length < 4) return 'xxx-xxx-xxxx';
  return `xxx-xxx-${d.slice(-4)}`;
};
const maskContact = (contact) => (
  isEmailContact(contact) ? maskEmail(contact) : maskPhone(contact)
);

const OtpStep = ({
  contact,
  otp,
  setOtp,
  cooldown,
  onResend,
  onChangeContact,
  onBack,
  error,
  onComplete,
  otpChannel = 'sms',
}) => {
  const inputsRef = useRef([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const chars = Array.from({ length: 6 }, (_, i) => otp[i] || '');

  const setAt = (index, digit) => {
    const next = chars.map((c, i) => (i === index ? digit : c)).join('').replace(/\D/g, '').slice(0, 6);
    setOtp(next);
    if (digit && index < 5) inputsRef.current[index + 1]?.focus();
    if (next.length === 6) window.setTimeout(() => onComplete(next), 60);
  };

  const onKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !chars[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const onPaste = (e) => {
    e.preventDefault();
    const pasted = digits(e.clipboardData.getData('text')).slice(0, 6);
    setOtp(pasted);
    inputsRef.current[Math.min(pasted.length, 5)]?.focus();
    if (pasted.length === 6) window.setTimeout(() => onComplete(pasted), 60);
  };

  const mm = String(Math.floor(cooldown / 60));
  const ss = String(cooldown % 60).padStart(2, '0');

  return (
    <div className='flex flex-col' style={{ minHeight: '100%', background: C.screen }}>
      <PageHeader title='ยืนยัน OTP' onBack={onBack} />
      <div className='flex-1' style={{ padding: 'var(--dim-space-400, 16px)' }}>
        <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, minHeight: '70%' }}>
          <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-150, 6px)', width: '100%' }}>
            <img
              src='/illustration/mobile/forgot-otp-lock.svg'
              alt=''
              width={36}
              height={36}
              style={{ width: 36, height: 36 }}
            />
            <Title>ยืนยันตัวตน</Title>
            <p style={{ margin: 0, textAlign: 'center', fontSize: 'var(--type-size-base, 16px)', color: C.muted, lineHeight: 1.5 }}>
              กรุณากรอกรหัส 6 หลักที่เราได้ส่งไปยัง
            </p>
            <p style={{ margin: 0, textAlign: 'center', fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-bold, 700)', color: C.neutral }}>
              {maskContact(contact)}
            </p>
            <p style={{ margin: 0, textAlign: 'center', fontSize: 'var(--type-size-base, 16px)', color: C.muted }}>
              (อ้างอิง: {OTP_REF})
            </p>
          </div>

          <div className='flex justify-center' style={{ gap: 'var(--dim-space-100, 4px)' }} onPaste={onPaste}>
            {chars.map((ch, i) => (
              <div
                key={i}
                className='inline-flex items-center justify-center'
                style={{
                  boxSizing: 'border-box',
                  width: 48,
                  height: 56,
                  /* State=Press (Figma 5016:2216): 2px border/input/hover edge +
                     the input/100 ring (0 0 0 4px @ primaryBorder/600). */
                  border: focusedIndex === i
                    ? 'var(--dim-stroke-200, 2px) solid var(--border-input-hover, #08A768)'
                    : `var(--dim-stroke-100, 1px) solid ${C.border}`,
                  borderRadius: 'var(--dim-radius-200, 8px)',
                  background: C.card,
                  boxShadow: focusedIndex === i
                    ? '0 0 0 var(--dim-stroke-400, 4px) var(--primaryBorder-600)'
                    : 'none',
                  transition: 'border-color .15s ease, box-shadow .15s ease',
                }}
              >
                <input
                  ref={(el) => { inputsRef.current[i] = el; }}
                  className='mih-reset-otp'
                  inputMode='numeric'
                  maxLength={1}
                  value={ch}
                  aria-label={`OTP หลักที่ ${i + 1}`}
                  onChange={(e) => setAt(i, digits(e.target.value).slice(-1))}
                  onKeyDown={(e) => onKeyDown(i, e)}
                  onFocus={() => setFocusedIndex(i)}
                  onBlur={() => setFocusedIndex((cur) => (cur === i ? -1 : cur))}
                  style={{
                    width: '100%',
                    height: '100%',
                    textAlign: 'center',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-2xl, 24px)',
                    fontWeight: 'var(--type-weight-bold, 700)',
                    color: 'var(--text-input-typing, #4D5358)',
                    padding: 0,
                  }}
                />
              </div>
            ))}
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: 'var(--type-size-sm, 14px)', color: C.danger, textAlign: 'center' }}>{error}</p>
          )}

          <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-200, 8px)', width: '100%' }}>
            {cooldown > 0 ? (
              <MobileBadge size='md' tone='neutral' icon='schedule'>
                ขอรหัสใหม่ได้ใน {mm}:{ss}
              </MobileBadge>
            ) : null}
            <BrandSubdueButton
              variant='outline'
              size='lg'
              leadingIcon='refresh'
              disabled={cooldown > 0}
              onClick={onResend}
              style={{ width: 'auto', minWidth: 200 }}
            >
              ส่งรหัสอีกครั้ง
            </BrandSubdueButton>
            <NeutralButton variant='ghost' size='sm' onClick={onChangeContact}>
              เปลี่ยนเบอร์โทรศัพท์หรืออีเมล
            </NeutralButton>
          </div>

          <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: C.muted, textAlign: 'center' }}>
            {otpChannel === 'email'
              ? 'รหัส OTP จะแสดงในการแจ้งเตือนอีเมล (จำลอง) ด้านบน'
              : 'รหัส OTP จะแสดงในการแจ้งเตือน SMS (จำลอง) ด้านบน'}
          </p>
        </Card>
      </div>
    </div>
  );
};

/* ─── Step 3 · New Password (2042:27663) ────────────────────────────── */
const PasswordStep = ({ pw, setPw, confirm, setConfirm, error, onSubmit }) => {
  const rules = PW_RULES.map((r) => ({ ...r, ok: r.test(pw) }));
  const strength = rules.filter((r) => r.ok).length;
  const allOk = rules.every((r) => r.ok);
  const matchOk = confirm.length > 0 && confirm === pw;
  const canSubmit = allOk && matchOk;

  return (
    <div className='flex flex-col' style={{ minHeight: '100%', background: C.screen }}>
      <PageHeader title='ตั้งรหัสผ่านใหม่' />
      <div className='flex-1' style={{ padding: 'var(--dim-space-400, 16px)' }}>
        <Card style={{ borderRadius: 'var(--dim-radius-600, 24px)' }}>
          <Title>สร้างรหัสผ่านใหม่</Title>
          <Subtitle>
            ตั้งรหัสผ่านที่คาดเดาได้ยาก
            <br />
            เพื่อปกป้องข้อมูลสุขภาพของคุณ
          </Subtitle>

          <div className='flex flex-col' style={{ gap: 'var(--dim-space-600, 24px)', marginTop: 'var(--dim-space-800, 32px)' }}>
            <Password
              label='รหัสผ่านใหม่'
              required
              placeholder='กรอกรหัสผ่าน'
              value={pw}
              autoComplete='new-password'
              onChange={(e) => setPw(e.target.value)}
            />

            <div
              style={{
                background: 'var(--surface-card-brand-100, #F4FBF8)',
                border: `var(--dim-stroke-100) solid ${C.borderBrand}`,
                borderRadius: 'var(--dim-radius-500, 16px)',
                padding: 'var(--dim-space-400, 16px)',
              }}
            >
              <span style={{ fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-sm, 14px)', color: C.ink }}>
                ความปลอดภัยของรหัสผ่าน
              </span>
              <div className='flex' style={{ gap: 'var(--dim-space-200, 8px)', margin: 'var(--dim-space-300, 12px) 0' }}>
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    style={{
                      flex: 1,
                      height: 6,
                      borderRadius: 3,
                      background: i < strength ? C.brand : C.brandTertiary,
                    }}
                  />
                ))}
              </div>
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-150, 6px)' }}>
                {rules.map((r) => (
                  <div
                    key={r.key}
                    className='flex items-center'
                    style={{ gap: 'var(--dim-space-300, 12px)', fontSize: 'var(--type-size-sm, 14px)', color: r.ok ? C.brand : C.muted }}
                  >
                    <Sym name={r.ok ? 'check_circle' : 'radio_button_unchecked'} size={14} />
                    {r.label}
                  </div>
                ))}
              </div>
            </div>

            <Password
              label='ยืนยันรหัสผ่านใหม่'
              required
              placeholder='กรอกรหัสผ่านอีกครั้ง'
              value={confirm}
              autoComplete='new-password'
              error={
                error
                  || (confirm.length > 0 && !matchOk ? 'รหัสผ่านไม่ตรงกัน' : undefined)
              }
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </Card>
      </div>
      <StickyFooter>
        <BrandButton type='button' size='lg' disabled={!canSubmit} onClick={onSubmit}>
          ตั้งรหัสผ่านใหม่
        </BrandButton>
      </StickyFooter>
    </div>
  );
};

/* ─── Step 4 · Success (2042:27695) ─────────────────────────────────── */
const SuccessStep = ({ onLogin }) => (
  <div
    className='flex flex-col items-center justify-center'
    style={{
      minHeight: '100%',
      background: C.teal,
      padding: 'var(--dim-space-600, 24px)',
    }}
  >
    <div
      className='flex flex-col items-center'
      style={{
        width: '100%',
        maxWidth: 340,
        background: C.card,
        borderRadius: 'var(--dim-radius-600, 24px)',
        padding: 'var(--dim-space-800, 32px) var(--dim-space-600, 24px)',
        boxShadow: 'var(--shadow-brand-drop-bottom-300, 0 4px 12px rgba(8,167,104,0.12))',
        gap: 'var(--dim-space-400, 16px)',
      }}
    >
      <img
        src='/illustration/mobile/forgot-success-hero.png'
        alt=''
        width={180}
        height={144}
        style={{ width: 180, height: 'auto', objectFit: 'contain' }}
      />
      <Title>รีเซ็ตรหัสผ่านสำเร็จ</Title>
      <p style={{ margin: 0, textAlign: 'center', fontSize: 'var(--type-size-sm, 14px)', color: C.muted, lineHeight: 1.5 }}>
        ออกจากระบบอุปกรณ์อื่นๆ เรียบร้อยแล้ว
        <br />
        โปรดเข้าสู่ระบบด้วยรหัสใหม่
      </p>
      <BrandButton type='button' size='lg' onClick={onLogin} style={{ marginTop: 'var(--dim-space-200, 8px)' }}>
        เข้าสู่ระบบ
      </BrandButton>
    </div>
  </div>
);

/* ─── Wizard ────────────────────────────────────────────────────────── */
const MobileResetInner = () => {
  const history = useHistory();
  const [step, setStep] = useState('account'); // account | otp | password | success
  const [cid, setCid] = useState('');
  const [contact, setContact] = useState('');
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [expireAt, setExpireAt] = useState(0);
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  /* The OTP we sent this session — shown via SmsPush or EmailPush and the only
     value verifyOtp accepts. `null` = no push on screen. */
  const [sentOtp, setSentOtp] = useState('');
  const [otpPush, setOtpPush] = useState(null); // { channel: 'sms'|'email', code, reference }
  const otpBusy = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = window.setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  /* Simulate the OTP gateway: mint a fresh 6-digit code, remember it for
     verification, surface the right push (SMS vs email), and restart timers. */
  const startOtpTimers = () => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const channel = isEmailContact(contact) ? 'email' : 'sms';
    setSentOtp(code);
    setOtpPush({ channel, code, reference: OTP_REF });
    setCooldown(OTP_COOLDOWN_SEC);
    setExpireAt(Date.now() + OTP_EXPIRE_SEC * 1000);
  };

  const contactMatches = () => {
    const raw = String(contact).trim().toLowerCase();
    if (!raw) return false;
    if (raw === String(CURRENT_USER.email).toLowerCase()) return true;
    const d = digits(raw);
    if (d && d === DEMO_PHONE) return true;
    return false;
  };

  const submitAccount = () => {
    setError('');
    if (digits(cid) !== CURRENT_USER.citizenId) {
      setError('ไม่พบข้อมูลบัญชี กรุณาตรวจสอบเลขบัตรประชาชน');
      return;
    }
    if (!contactMatches()) {
      setError('อีเมลหรือเบอร์โทรศัพท์ไม่ตรงกับบัญชี');
      return;
    }
    setOtp('');
    otpBusy.current = false;
    startOtpTimers();
    setStep('otp');
  };

  const verifyOtp = (value) => {
    if (otpBusy.current) return;
    otpBusy.current = true;
    setError('');
    if (Date.now() > expireAt) {
      setError('รหัส OTP หมดอายุ กรุณาขอรหัสใหม่');
      setOtp('');
      otpBusy.current = false;
      return;
    }
    if (value !== sentOtp) {
      setError('รหัส OTP ไม่ถูกต้อง');
      setOtp('');
      otpBusy.current = false;
      return;
    }
    setOtpPush(null);
    setStep('password');
  };

  const submitPassword = () => {
    setError('');
    if (!PW_RULES.every((r) => r.test(pw))) {
      setError('รหัสผ่านยังไม่ครบเงื่อนไข');
      return;
    }
    if (pw !== confirm) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }
    try {
      localStorage.setItem('phcis_mobile_demo_password_v1', pw);
    } catch { /* noop */ }
    setStep('success');
  };

  if (step === 'success') {
    return <SuccessStep onLogin={() => history.replace('/m/login')} />;
  }

  if (step === 'password') {
    return (
      <PasswordStep
        pw={pw}
        setPw={setPw}
        confirm={confirm}
        setConfirm={setConfirm}
        error={error}
        onSubmit={submitPassword}
      />
    );
  }

  if (step === 'otp') {
    return (
      <>
        {otpPush?.channel === 'email' && (
          <EmailPush
            code={otpPush.code}
            reference={otpPush.reference}
            onDismiss={() => setOtpPush(null)}
          />
        )}
        {otpPush?.channel === 'sms' && (
          <SmsPush
            code={otpPush.code}
            reference={otpPush.reference}
            onDismiss={() => setOtpPush(null)}
          />
        )}
        <OtpStep
          contact={contact}
          otp={otp}
          setOtp={setOtp}
          cooldown={cooldown}
          error={error}
          otpChannel={otpPush?.channel || (isEmailContact(contact) ? 'email' : 'sms')}
          onResend={() => {
            setOtp('');
            setError('');
            startOtpTimers();
          }}
          onChangeContact={() => {
            setOtp('');
            setError('');
            setOtpPush(null);
            setStep('account');
          }}
          onBack={() => {
            setOtp('');
            setError('');
            setOtpPush(null);
            setStep('account');
          }}
          onComplete={verifyOtp}
        />
      </>
    );
  }

  return (
    <AccountStep
      cid={cid}
      setCid={setCid}
      contact={contact}
      setContact={setContact}
      error={error}
      onSubmit={submitAccount}
      onBack={() => history.push('/m/login')}
    />
  );
};

const MobileResetPage = () => (
  <MobileShell requireAuth={false} showStatusBar showBottomNav={false}>
    <MobileResetInner />
  </MobileShell>
);

export default MobileResetPage;
