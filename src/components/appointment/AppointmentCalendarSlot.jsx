import React, { useState } from 'react';
import { DEFAULT_PATIENT_AVATAR } from '@/pages/appointment/appointmentShared';

/* MIH AppointmentCalendarSlot — Figma Appointment 6:11075 calendar slot / cta.
   Aliases design.md calendar slot tokens (index.css --*-calendar-slot-*). */

const SLOT_HEIGHTS = {
  compact: 'var(--dim-size-500, 24px)',
  medium: 'var(--dim-size-600, 32px)',
};

function PatientSlotAvatar({ src = DEFAULT_PATIENT_AVATAR, alt = '' }) {
  const [errored, setErrored] = useState(false);
  if (errored) return null;
  return (
    <span
      style={{
        width: 'var(--dim-size-300)',
        height: 'var(--dim-size-300)',
        flexShrink: 0,
        borderRadius: 'var(--dim-radius-full)',
        border: 'var(--dim-stroke-100) solid var(--border-image-default)',
        overflow: 'hidden',
        position: 'relative',
        display: 'inline-block',
      }}
    >
      <img
        src={src}
        alt={alt}
        onError={() => setErrored(true)}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          pointerEvents: 'none',
        }}
      />
    </span>
  );
}

const AppointmentCalendarSlot = ({
  booked = false,
  time,
  patient,
  patientAvatar,
  disabled = false,
  size = 'compact',
  onClick,
}) => {
  const [hover, setHover] = useState(false);
  const interactive = !disabled && onClick;
  const slotHeight = SLOT_HEIGHTS[size] ?? SLOT_HEIGHTS.compact;
  const timeAlignStart = size === 'medium' && !booked;

  const bg = booked
    ? 'var(--surface-calendar-slot-slot-selected)'
    : disabled
      ? 'var(--surface-calendar-slot-slot-disabled)'
      : hover && interactive
        ? 'var(--surface-calendar-slot-slot-hover)'
        : 'var(--surface-calendar-slot-slot-default)';

  const border = booked
    ? 'var(--border-calendar-slot-slot-selected)'
    : disabled
      ? 'var(--border-calendar-slot-slot-disabled)'
      : hover && interactive
        ? 'var(--border-calendar-slot-slot-hover)'
        : 'var(--border-calendar-slot-slot-default)';

  const color = booked
    ? 'var(--text-calendar-slot-date-selected)'
    : disabled
      ? 'var(--text-calendar-slot-date-disabled)'
      : hover && interactive
        ? 'var(--text-calendar-slot-slot-hover)'
        : 'var(--text-calendar-slot-slot-default)';

  return (
    <button
      type='button'
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: booked || timeAlignStart ? 'flex-start' : 'center',
        gap: 'var(--dim-space-100)',
        width: '100%',
        minHeight: slotHeight,
        height: slotHeight,
        padding: 'var(--dim-space-100) var(--dim-space-200)',
        borderRadius: 'var(--dim-radius-100)',
        border: `var(--dim-stroke-100) solid ${border}`,
        background: bg,
        color,
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xxs, 10px)',
        fontWeight: 'var(--type-weight-regular)',
        lineHeight: 1.5,
        cursor: disabled ? 'not-allowed' : onClick ? 'pointer' : 'default',
        opacity: disabled && !booked ? 0.55 : 1,
        textAlign: booked || timeAlignStart ? 'left' : 'center',
        transition: 'background-color 150ms ease, border-color 150ms ease, color 150ms ease',
      }}
    >
      {booked && (
        <PatientSlotAvatar src={patientAvatar} alt={patient} />
      )}
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: booked || timeAlignStart ? 1 : undefined,
          minWidth: booked || timeAlignStart ? 0 : undefined,
          width: timeAlignStart ? '100%' : undefined,
        }}
      >
        {booked ? patient : time}
      </span>
    </button>
  );
};

/** Figma 6:11075 — “ดูทั้งหมด” CTA (text only) */
export const AppointmentCalendarSeeAll = ({ onClick }) => {
  const [hover, setHover] = useState(false);
  const ctaHeight = SLOT_HEIGHTS.compact;
  return (
    <button
      type='button'
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        minHeight: ctaHeight,
        height: ctaHeight,
        padding: 'var(--dim-space-100) var(--dim-space-200)',
        borderRadius: 'var(--dim-radius-100)',
        border: 'none',
        background: hover
          ? 'var(--surface-calendar-slot-cta-hover)'
          : 'var(--surface-calendar-slot-cta-default)',
        color: 'var(--text-calendar-slot-cta-default)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xxs, 10px)',
        fontWeight: 'var(--type-weight-regular)',
        lineHeight: 1.5,
        cursor: 'pointer',
      }}
    >
      ดูทั้งหมด
    </button>
  );
};

export default AppointmentCalendarSlot;
