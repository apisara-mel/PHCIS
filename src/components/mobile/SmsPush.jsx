import React, { useEffect, useState } from 'react';
import { Sym } from './Sym';

/* MIH Mobile · SmsPush — a simulated incoming-SMS push notification banner.
   Demo aid for OTP flows: when a screen "sends" an OTP we surface the code
   here (iOS/Android lock-screen push style) so the tester can read it and
   type it into the OTP field. Not a Figma component — a dev/demo affordance;
   still built entirely on design tokens per project rules.

   Slides down from the top, auto-dismisses after `duration` ms, and can be
   tapped to dismiss early. Mount it conditionally (render only while a push
   is active) and clear the owning state via `onDismiss`. */

const SmsPush = ({
  code,
  reference,
  appName = 'ข้อความ',
  sender = 'BMA Health',
  duration = 9000,
  onDismiss,
}) => {
  /* Off-screen on first paint, then slide in on the next tick. */
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
      {/* App icon tile */}
      <span
        className='inline-flex items-center justify-center shrink-0'
        style={{
          width: 'var(--dim-size-800, 40px)',
          height: 'var(--dim-size-800, 40px)',
          borderRadius: 'var(--dim-radius-400, 12px)',
          background: 'var(--surface-brandPrimary-default, #007549)',
          color: 'var(--text-content-on-content, #FFFFFF)',
        }}
      >
        <Sym name='sms' size={22} fill color='var(--text-content-on-content, #FFFFFF)' />
      </span>

      <div className='flex flex-col' style={{ flex: 1, minWidth: 0, gap: 'var(--dim-space-050, 2px)' }}>
        {/* Header row: sender + timestamp */}
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
            {sender}
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

        {/* App name line (like iOS: the app that delivered the message) */}
        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs, 12px)',
            color: 'var(--text-content-tertiary, #858C92)',
          }}
        >
          {appName}
        </span>

        {/* Body: the OTP code, emphasised for easy reading */}
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

export default SmsPush;
