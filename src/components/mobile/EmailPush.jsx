import React, { useEffect, useState } from 'react';
import { Sym } from './Sym';

/* MIH Mobile · EmailPush — a simulated incoming-email push notification banner.
   Demo aid for OTP flows sent via email: mirrors SmsPush slide-in behaviour
   but styled like a mail-app notification (blue tile, subject line, from line).
   Built entirely on design tokens per project rules. */

const EmailPush = ({
  code,
  reference,
  subject = 'รหัส OTP รีเซ็ตรหัสผ่าน',
  sender = 'BMA Health',
  fromAddress = 'noreply@bmahealth.go.th',
  appName = 'อีเมล',
  duration = 9000,
  onDismiss,
}) => {
  const [shown, setShown] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const raf = window.setTimeout(() => setShown(true), 20);
    return () => window.clearTimeout(raf);
  }, []);

  useEffect(() => {
    if (!duration) return undefined;
    const t = window.setTimeout(() => setLeaving(true), duration);
    return () => window.clearTimeout(t);
  }, [duration]);

  useEffect(() => {
    if (!leaving) return undefined;
    const t = window.setTimeout(() => { onDismiss && onDismiss(); }, 240);
    return () => window.clearTimeout(t);
  }, [leaving, onDismiss]);

  const visible = shown && !leaving;

  return (
    <div
      role='status'
      aria-live='polite'
      onClick={() => setLeaving(true)}
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + var(--dim-space-300, 12px))',
        left: '50%',
        transform: `translateX(-50%) translateY(${visible ? '0' : '-140%'})`,
        opacity: visible ? 1 : 0,
        width: 'min(92%, var(--dim-size-2900, 640px))',
        maxWidth: 'calc(100% - var(--dim-space-500, 20px))',
        zIndex: 60,
        cursor: 'pointer',
        transition: 'transform .28s cubic-bezier(.2,.8,.2,1), opacity .28s ease',
        display: 'flex',
        gap: 'var(--dim-space-300, 12px)',
        alignItems: 'flex-start',
        padding: 'var(--dim-space-300, 12px)',
        background: 'var(--surface-card-100, #FFFFFF)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-content-tertiary, #E1E3E5)',
        borderRadius: 'var(--dim-radius-500, 16px)',
        boxShadow:
          'var(--shadow-drop-bottom-400, 0 4px 4px rgba(100,116,139,0.10), 0 16px 32px rgba(100,116,139,0.15))',
      }}
    >
      <span
        className='inline-flex items-center justify-center shrink-0'
        style={{
          width: 'var(--dim-size-800, 40px)',
          height: 'var(--dim-size-800, 40px)',
          borderRadius: 'var(--dim-radius-400, 12px)',
          background: 'var(--surface-alert-info, #F0F6FF)',
          color: 'var(--text-alert-info, #1D4ED8)',
        }}
      >
        <Sym name='mail' size={22} color='var(--text-alert-info, #1D4ED8)' />
      </span>

      <div className='flex flex-col' style={{ flex: 1, minWidth: 0, gap: 'var(--dim-space-050, 2px)' }}>
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <span
            style={{
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
              fontWeight: 'var(--type-weight-bold, 700)',
              color: 'var(--text-content-default, #111314)',
            }}
          >
            {subject}
          </span>
          <span
            style={{
              flexShrink: 0,
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs, 12px)',
              color: 'var(--text-content-tertiary, #858C92)',
            }}
          >
            ตอนนี้
          </span>
        </div>

        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs, 12px)',
            color: 'var(--text-content-tertiary, #858C92)',
          }}
        >
          {sender}
          {' · '}
          {fromAddress}
        </span>

        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs, 12px)',
            color: 'var(--text-content-tertiary, #858C92)',
          }}
        >
          {appName}
        </span>

        <p
          style={{
            margin: 0,
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            lineHeight: 1.5,
            color: 'var(--text-content-secondary, #636B72)',
          }}
        >
          รหัส OTP ของคุณคือ{' '}
          <strong
            style={{
              fontWeight: 'var(--type-weight-bold, 700)',
              letterSpacing: '0.12em',
              color: 'var(--text-brandPrimary-default, #007549)',
            }}
          >
            {code}
          </strong>
          {reference ? ` (อ้างอิง: ${reference})` : ''} · ใช้ได้ภายใน 5 นาที ห้ามเปิดเผยกับผู้อื่น
        </p>
      </div>
    </div>
  );
};

export default EmailPush;
