import React, { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import SelectableOptionCard from '@/components/card/SelectableOptionCard';
import OtpInput from '@/components/forms/OtpInput';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralButton from '@/components/button/NeutralButton';
import { Sym } from '@/components/forms/_inputBox';

/* PHCIS Sign-in · OTP verification — Figma flow "select" → "OPT" screens
   (PHCIS-Signin nodes 42:8722 / 43:10405). Two steps:
     1. choose a delivery channel (SMS / Email)  — SelectableOptionCard with
        Figma colored illustrations (public/illustration/auth/otp-*.png)
     2. enter the 6-digit one-time code           — OtpInput (xl · 52×60 cells),
        auto-verifies on the 6th digit (no submit button per Figma 43:10405)

   Flow annotations honoured:
     • OTP can be sent to SMS or Email (notes 57:16158 / 57:16159).
     • Code is 6 digits and "หมดอายุใน 5 นาที" (OTP email annotation 57:16161) —
       live countdown "รหัสจะหมดอายุภายใน mm:ss"; resend resets the clock.
   Tokens alias design.md — no literals (gradients excepted).                */

const CHANNELS = [
  { key: 'sms',   illustration: '/illustration/auth/otp-sms.png',   title: 'SMS (ข้อความมือถือ)', desc: 'ส่งรหัสยืนยัน 6 หลัก\nไปยังหมายเลขโทรศัพท์ที่ลงทะเบียนไว้\n(****1234)' },
  { key: 'email', illustration: '/illustration/auth/otp-email.png', title: 'อีเมล (Email)',       desc: 'ส่งรหัสยืนยันไปยังที่อยู่อีเมลที่ผูกกับบัญชี\n(e***@example.com)' },
];

/* Per-channel copy for the OTP step (Figma 43:10405 shows the SMS variant). */
const OTP_COPY = {
  sms:   { subtitle: 'เราได้ส่งรหัสยืนยัน 6 หลัก ไปยังหมายเลขโทรศัพท์ของคุณ', masked: '****-****-1234' },
  email: { subtitle: 'เราได้ส่งรหัสยืนยัน 6 หลัก ไปยังอีเมลของคุณ',           masked: 'e***@example.com' },
};

const OTP_TTL_SECONDS = 5 * 60; // "รหัสหมดอายุใน 5 นาที"

const formatCountdown = (s) => {
  const mm = String(Math.floor(Math.max(0, s) / 60)).padStart(2, '0');
  const ss = String(Math.max(0, s) % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

export default function LoginVerifyPage() {
  const history = useHistory();
  const [step, setStep] = useState('channel'); // 'channel' | 'code'
  const [channel, setChannel] = useState('');   // none selected by default
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_SECONDS);
  const timerRef = useRef(null);

  /* Countdown runs only while the code step is visible. */
  useEffect(() => {
    if (step !== 'code') return undefined;
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [step]);

  const goToCode = () => {
    setCode('');
    setError('');
    setSecondsLeft(OTP_TTL_SECONDS);
    setStep('code');
  };

  const resend = () => {
    setCode('');
    setError('');
    setSecondsLeft(OTP_TTL_SECONDS);
  };

  const verify = (value) => {
    const v = value || code;
    if (v.length < 6) { setError('กรุณากรอกรหัสยืนยันให้ครบ 6 หลัก'); return; }
    if (secondsLeft <= 0) { setError('รหัสหมดอายุแล้ว กรุณาส่งรหัสใหม่อีกครั้ง'); return; }
    setError('');
    history.push('/'); // verified → into the system hub
  };

  const otpCopy = OTP_COPY[channel] || OTP_COPY.sms;

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
      {/* Floating card — Figma 42:8722 / 43:10405: py-48 px-32 · gap 32 ·
          radius 24 · Brand Drop Shadow Bottom/400. */}
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
            {step === 'channel' ? 'เลือกวิธียืนยันตัวตน' : 'กรอกรหัสยืนยัน'}
          </h1>
          <p
            style={{
              margin: 0,
              color: 'var(--text-content-secondary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-base)',
              fontWeight: 'var(--type-weight-regular)',
              lineHeight: 1.5,
              whiteSpace: 'pre-line',
            }}
          >
            {step === 'channel'
              ? 'เพื่อความปลอดภัยของข้อมูลสถานพยาบาล โปรดเลือกช่องทางในการรับรหัสยืนยัน'
              : otpCopy.subtitle}
          </p>
          {step === 'code' && (
            /* Masked destination — Sarabun bold sm per Figma 41:12710. */
            <p
              style={{
                margin: 0,
                color: 'var(--text-content-default, #363B3F)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
                fontWeight: 'var(--type-weight-bold, 700)',
                lineHeight: 1.5,
              }}
            >
              {otpCopy.masked}
            </p>
          )}
        </div>

        {step === 'channel' ? (
          <>
            <div className='flex items-stretch' style={{ gap: 'var(--dim-space-400)' }} role='radiogroup'>
              {CHANNELS.map((c) => (
                <SelectableOptionCard
                  key={c.key}
                  illustration={c.illustration}
                  title={c.title}
                  description={c.desc}
                  selected={channel === c.key}
                  onSelect={() => setChannel(c.key)}
                  style={{ flex: 1, minWidth: 0 }}
                />
              ))}
            </div>
            {/* ถัดไป — Brand Fill Large, centered per Figma 42:8722 (hugs
                the component max-width, not the card width). */}
            <div className='flex justify-center'>
              <BrandButton
                variant='fill'
                size='lg'
                trailingIcon='arrow_forward'
                disabled={!channel}
                onClick={() => channel && goToCode()}
                style={{ width: '100%' }}
              >
                ถัดไป
              </BrandButton>
            </div>
            {/* Back — Neutral Ghost Large with chevron per Figma 42:8722. */}
            <div className='flex justify-center'>
              <NeutralButton
                variant='ghost'
                size='lg'
                leadingIcon='chevron_left'
                onClick={() => history.push('/login')}
              >
                ย้อนกลับ
              </NeutralButton>
            </div>
          </>
        ) : (
          <>
            {/* OTP cells — xl 52×60 per Figma OTP Field 55:8422. Auto-verifies
                on the 6th digit (no submit button on this screen). */}
            <div className='flex justify-center'>
              <OtpInput
                length={6}
                size='xl'
                value={code}
                onChange={(v) => { setCode(v); if (error) setError(''); }}
                onComplete={verify}
                error={error}
                autoFocus
              />
            </div>

            {/* Countdown + resend — Figma 43:10181. */}
            <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-300)' }}>
              <div className='inline-flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                <Sym name='schedule' size={'var(--dim-size-250, 14px)'} color='var(--icon-content-secondary, var(--text-content-secondary))' />
                <span
                  style={{
                    color: 'var(--text-content-secondary)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm)',
                    fontWeight: 'var(--type-weight-regular)',
                    lineHeight: 1.5,
                  }}
                >
                  รหัสจะหมดอายุภายใน {formatCountdown(secondsLeft)}
                </span>
              </div>
              <BrandSubdueButton
                variant='outline'
                size='sm'
                leadingIcon='refresh'
                onClick={resend}
              >
                ส่งรหัสใหม่อีกครั้ง
              </BrandSubdueButton>
            </div>

            {/* ย้อนกลับ (left) · ใช้วิธีการยืนยันอื่น (right) — Figma 43:10116. */}
            <div className='flex items-center justify-between w-full' style={{ gap: 'var(--dim-space-600)' }}>
              <NeutralButton
                variant='ghost'
                size='sm'
                leadingIcon='chevron_left'
                onClick={() => setStep('channel')}
              >
                ย้อนกลับ
              </NeutralButton>
              <NeutralButton
                variant='ghost'
                size='sm'
                onClick={() => setStep('channel')}
              >
                ใช้วิธีการยืนยันอื่น
              </NeutralButton>
            </div>

            {/* Support — Figma 43:10119. */}
            <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-300)' }}>
              <span
                style={{
                  color: 'var(--text-content-secondary)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                  fontWeight: 'var(--type-weight-regular)',
                  lineHeight: 1.5,
                }}
              >
                พบปัญหาในการยืนยันตัวตน?
              </span>
              <BrandButton variant='ghost' size='sm'>
                ติดต่อฝ่ายไอทีโรงพยาบาล
              </BrandButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
