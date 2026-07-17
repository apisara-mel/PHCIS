import React, { useEffect, useState } from 'react';

/* MIH Mobile · AppNotification — Archive Figma 175:90671 (Notification).
   In-app iOS-style banner after booking success. Same slide-in / dismiss
   behaviour as SmsPush; content follows Figma title + preview body. */

const APP_ICON = '/images/office-health-logo.png';

const AppNotification = ({
  title = 'ยืนยันการนัดหมายแล้ว',
  body,
  timeLabel = 'now',
  iconSrc = APP_ICON,
  delay = 0,
  duration = 8000,
  onDismiss,
  onClick,
}) => {
  const [shown, setShown] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const raf = window.setTimeout(() => setShown(true), delay + 20);
    return () => window.clearTimeout(raf);
  }, [delay]);

  useEffect(() => {
    if (!duration) return undefined;
    const t = window.setTimeout(() => setLeaving(true), delay + duration);
    return () => window.clearTimeout(t);
  }, [delay, duration]);

  useEffect(() => {
    if (!leaving) return undefined;
    const t = window.setTimeout(() => { onDismiss?.(); }, 240);
    return () => window.clearTimeout(t);
  }, [leaving, onDismiss]);

  const visible = shown && !leaving;

  return (
    <div
      role='status'
      aria-live='polite'
      onClick={() => {
        onClick?.();
        setLeaving(true);
      }}
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
        borderRadius: 'var(--dim-radius-500, 16px)',
        boxShadow:
          'var(--shadow-drop-bottom-400, 0 4px 4px rgba(100,116,139,0.10), 0 16px 32px rgba(100,116,139,0.15))',
      }}
    >
      {/* Figma App Icon — Custom */}
      <span
        className='overflow-hidden shrink-0'
        style={{
          width: 'var(--dim-size-800, 40px)',
          height: 'var(--dim-size-800, 40px)',
          borderRadius: 'var(--dim-radius-400, 12px)',
          background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
        }}
      >
        <img
          src={iconSrc}
          alt=''
          width={40}
          height={40}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </span>

      <div className='flex flex-col' style={{ flex: 1, minWidth: 0, gap: 'var(--dim-space-050, 2px)' }}>
        {/* Title + now — Figma Subheadline / Primary */}
        <div className='flex items-start' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
              fontWeight: 'var(--type-weight-bold, 700)',
              lineHeight: 1.4,
              color: 'var(--text-content-default, #111314)',
            }}
          >
            {title}
          </span>
          <span
            style={{
              flexShrink: 0,
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs, 12px)',
              lineHeight: 1.2,
              fontWeight: 'var(--type-weight-regular, 400)',
              color: 'var(--text-content-tertiary, #858C92)',
            }}
          >
            {timeLabel}
          </span>
        </div>

        {/* Preview body — Figma 175:90671 */}
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            fontWeight: 'var(--type-weight-regular, 400)',
            lineHeight: 1.4,
            color: 'var(--text-content-default, #111314)',
          }}
        >
          {body}
        </p>
      </div>
    </div>
  );
};

/** Build Figma 175:90671 body copy from booking fields. */
export const buildAppointmentConfirmBody = ({ doctor, dateLabel, time }) => (
  `นัดกับ ${doctor} วันที่ ${dateLabel} เวลา ${time} น. ได้รับการยืนยันเรียบร้อย และกรุณาเตรียมตัวตามคำแนะนำ`
);

export default AppNotification;
