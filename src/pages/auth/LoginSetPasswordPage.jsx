import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import PasswordField from '@/components/forms/PasswordField';
import BrandButton from '@/components/button/BrandButton';
import Icon from '@/components/icons/Icon';

/* PHCIS Sign-in · Create password — Figma "PHCIS-Signin" SetPassword
   (node 57:6086). Reached after a successful OTP verification: the user
   sets an account password that must satisfy four rules, surfaced live via
   a strength meter + checklist. The primary action stays disabled until all
   rules pass AND the confirmation matches. Tokens alias design.md — no
   literals (gradients excepted; ThaID/brand-external hex follow precedent). */

const REQUIREMENTS = [
  { key: 'len',     label: 'ความยาวอย่างน้อย 8 ตัวอักษร',                  test: (p) => p.length >= 8 },
  { key: 'case',    label: 'มีทั้งตัวอักษรพิมพ์ใหญ่และพิมพ์เล็ก (A-Z, a-z)', test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { key: 'number',  label: 'มีตัวเลขอย่างน้อย 1 ตัว (0-9)',                test: (p) => /\d/.test(p) },
  { key: 'special', label: 'มีอักขระพิเศษอย่างน้อย 1 ตัว (เช่น @, #, $, %)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

/* One checklist row — radio dot turns into a filled green check once met. */
function RequirementRow({ met, label }) {
  return (
    <div className='flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
      <span
        className='inline-flex items-center justify-center shrink-0'
        style={{
          width: 'var(--dim-size-300)',
          height: 'var(--dim-size-300)',
          borderRadius: 'var(--dim-radius-full)',
          border: met ? 'none' : 'var(--dim-stroke-150) solid var(--border-switch-default, #C9CDD0)',
          background: met ? 'var(--brand-p600)' : 'var(--surface-input-default, #FFFFFF)',
        }}
      >
        {met && <Icon name='check' size={11} style={{ color: 'var(--text-brandPrimaryButton-onBrand, #FFFFFF)' }} />}
      </span>
      <span
        style={{
          color: met ? 'var(--text-content-default)' : 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          fontWeight: 'var(--type-weight-regular)',
          lineHeight: 1.5,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export default function LoginSetPasswordPage() {
  const history = useHistory();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const met = useMemo(
    () => REQUIREMENTS.map((r) => r.test(password)),
    [password],
  );
  const metCount = met.filter(Boolean).length;
  const allMet = metCount === REQUIREMENTS.length;
  const passwordsMatch = confirm.length > 0 && password === confirm;
  const confirmError = confirm.length > 0 && password !== confirm ? 'รหัสผ่านไม่ตรงกัน' : undefined;
  const canSubmit = allMet && passwordsMatch;

  const finish = () => {
    if (!canSubmit) return;
    history.push('/login/success'); // password set → success screen (Figma 112:10776)
  };

  return (
    <div
      className='relative w-full min-h-screen overflow-hidden flex items-center justify-center'
      style={{
        background:
          'radial-gradient(120% 120% at 0% 100%, var(--brand-p100) 0%, rgba(255,255,255,0) 55%),' +
          'radial-gradient(90% 90% at 18% 78%, var(--brand-p50) 0%, rgba(255,255,255,0) 60%),' +
          'var(--surface-card-100)',
        padding: 'var(--dim-space-800)',
      }}
    >
      {/* Floating card — Figma 57:6086: py-48 px-32 · gap 32 · radius 24 ·
          Brand Drop Shadow Bottom/400. Matches the OTP card width. */}
      <div
        className='flex flex-col items-stretch w-full'
        style={{
          maxWidth: 'var(--dim-size-2900)',
          gap: 'var(--dim-space-800)',
          padding: 'var(--dim-space-1200) var(--dim-space-800)',
          borderRadius: 'var(--dim-radius-600)',
          background: 'var(--surface-card-100)',
          boxShadow: 'var(--shadow-brand-drop-bottom-400, 0 4px 4px -4px rgba(8,167,104,0.08), 0 16px 32px -4px rgba(8,167,104,0.10))',
        }}
      >
        {/* Heading */}
        <div className='flex flex-col items-center text-center' style={{ gap: 'var(--dim-space-200)' }}>
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
            สร้างรหัสผ่านของคุณ
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
            ตั้งรหัสผ่านที่คาดเดาได้ยาก<br />เพื่อปกป้องการเข้าถึงระบบ
          </p>
        </div>

        {/* Fields + strength */}
        <div className='flex flex-col items-stretch w-full' style={{ gap: 'var(--dim-space-400)' }}>
          <PasswordField
            label='รหัสผ่าน'
            required
            value={password}
            onChange={(v) => setPassword(v)}
            autoComplete='new-password'
            style={{ width: '100%' }}
          />

          {/* Strength container — brand-tinted card with meter + checklist. */}
          <div
            className='flex flex-col items-stretch'
            style={{
              gap: 'var(--dim-space-300)',
              padding: 'var(--dim-space-400)',
              borderRadius: 'var(--dim-radius-500)',
              background: 'var(--surface-brandPrimary-quaternary)',
              border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            }}
          >
            <span
              style={{
                color: 'var(--text-content-default)',
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-sm)',
                fontWeight: 'var(--type-weight-regular)',
                lineHeight: 1.5,
              }}
            >
              ความปลอดภัยของรหัสผ่าน
            </span>
            {/* Meter — one segment fills per satisfied rule. */}
            <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
              {REQUIREMENTS.map((r, i) => (
                <span
                  key={r.key}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: 'var(--dim-space-150)',
                    borderRadius: 'var(--dim-radius-full)',
                    background: i < metCount ? 'var(--brand-p600)' : 'var(--surface-brandPrimary-tertiary)',
                    transition: 'background 160ms ease',
                  }}
                />
              ))}
            </div>
            {/* Checklist */}
            <div className='flex flex-col items-stretch' style={{ gap: 'var(--dim-space-150)' }}>
              {REQUIREMENTS.map((r, i) => (
                <RequirementRow key={r.key} met={met[i]} label={r.label} />
              ))}
            </div>
          </div>

          <PasswordField
            label='ยืนยันรหัสผ่าน'
            required
            value={confirm}
            onChange={(v) => setConfirm(v)}
            error={confirmError}
            autoComplete='new-password'
            style={{ width: '100%' }}
          />
        </div>

        {/* Primary action — disabled until all rules pass + confirm matches. */}
        <div className='flex justify-center'>
          <BrandButton
            variant='fill'
            size='lg'
            trailingIcon='arrow_forward'
            disabled={!canSubmit}
            onClick={finish}
          >
            ต่อไป
          </BrandButton>
        </div>

        {/* Support */}
        <div className='flex justify-center'>
          <BrandButton variant='ghost' size='sm'>
            ติดต่อฝ่ายไอทีโรงพยาบาล
          </BrandButton>
        </div>
      </div>
    </div>
  );
}
