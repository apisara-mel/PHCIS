import React, { useEffect, useState } from 'react';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import ColorfulIconBadge from '@/components/badge/ColorfulIconBadge';
import {
  formatTelemedBadgeLabel,
  getTelemedAppointmentState,
} from '@/utils/telemedAppointmentState';

/* Figma PHCIS | Telemed 78:16524 — telemedicine column badge states (70:7129):
   early (>15 min, blue icon) · countdown (≤15 min, blue pill)
   · due (teal pill + blink) · overdue (orange pill + blink) · expired (grey icon).
   Click opens /telemed in a new browser tab. */

const BLINK_BORDER = {
  teal: 'var(--border-telemed-queue-teal-blink, rgba(209, 246, 238, 0.4))',
  orange: 'var(--border-telemed-queue-orange-blink, rgba(254, 215, 170, 0.4))',
};

/* Figma Colorful icon Badge · Size=Medium in queue table = 32×32. */
const ICON_BADGE_SIZE = {
  width: 'var(--dim-size-600, 32px)',
  height: 'var(--dim-size-600, 32px)',
};

const linkStyle = {
  display: 'inline-flex',
  border: 'none',
  padding: 0,
  background: 'transparent',
  cursor: 'pointer',
  textDecoration: 'none',
  color: 'inherit',
};

const disabledWrapStyle = {
  display: 'inline-flex',
  border: 'none',
  padding: 0,
  background: 'transparent',
  cursor: 'not-allowed',
};

const buildTelemedHref = (visitId) => (
  visitId ? `/telemed/${encodeURIComponent(visitId)}` : '/telemed'
);

const TelemedicineQueueBadge = ({ appointmentAt, visitId, className = '' }) => {
  const [now, setNow] = useState(() => Date.now());

  const { state, minutesUntil, minutesPast } = getTelemedAppointmentState(appointmentAt, now);
  const needsFastTick = state === 'countdown' || state === 'due' || state === 'overdue';

  useEffect(() => {
    const ms = needsFastTick ? 10_000 : 60_000;
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [needsFastTick]);

  const clickable = state !== 'expired';
  const ariaLabel = state === 'early'
    ? 'Telemedicine — ก่อนเวลานัด'
    : state === 'expired'
      ? 'Telemedicine — เลยเวลานัดแล้ว'
      : formatTelemedBadgeLabel(state, { minutesUntil, minutesPast }) || 'Telemedicine';

  const badgeContent = state === 'early' || state === 'expired' ? (
    <ColorfulIconBadge
      style={state === 'expired' ? 'grey' : 'blue'}
      size='medium'
      fill='default'
      icon='videocam'
      iconFill={0}
      styleProp={ICON_BADGE_SIZE}
    />
  ) : (() => {
    const badgeStyle = state === 'due' ? 'teal' : state === 'overdue' ? 'orange' : 'blue';
    const blinkClass = state === 'due'
      ? 'mih-telemed-queue-badge--blink-teal'
      : state === 'overdue'
        ? 'mih-telemed-queue-badge--blink-orange'
        : '';
    const blinkBorder = state === 'due'
      ? BLINK_BORDER.teal
      : state === 'overdue'
        ? BLINK_BORDER.orange
        : undefined;

    return (
      <ColorfulBadge
        style={badgeStyle}
        size='default'
        hierarchy='secondary'
        width='hug'
        icon='videocam'
        iconFill={0}
        className={blinkClass}
        styleProp={blinkBorder ? {
          border: `var(--dim-stroke-400, 4px) solid ${blinkBorder}`,
          boxSizing: 'border-box',
        } : undefined}
      >
        {formatTelemedBadgeLabel(state, { minutesUntil, minutesPast })}
      </ColorfulBadge>
    );
  })();

  if (!clickable) {
    return (
      <span className={className} style={disabledWrapStyle} aria-label={ariaLabel} aria-disabled>
        {badgeContent}
      </span>
    );
  }

  return (
    <a
      href={buildTelemedHref(visitId)}
      target='_blank'
      rel='noopener noreferrer'
      className={className}
      style={linkStyle}
      aria-label={ariaLabel}
      title='เปิด Telemedicine ในแท็บใหม่'
      onClick={(e) => e.stopPropagation()}
    >
      {badgeContent}
    </a>
  );
};

export default TelemedicineQueueBadge;
