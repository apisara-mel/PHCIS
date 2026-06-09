import React, { useState } from 'react';
import Icon from '@/components/icons/Icon';
import { resolveStaffProfile } from '@/pages/appointment/appointmentStaffProfile';

/* MIH StaffProfileAvatar — Figma Appointment 1:38622 (Profile / DoctorG).
   Circular photo on profile surface, optional white ring + shadow (hero). */

const PROFILE_RING_SHADOW =
  '0 var(--dim-space-025, 1px) var(--dim-space-100, 4px) 0 rgba(100, 116, 139, 0.1)';

function toPx(size) {
  if (typeof size === 'number') return size;
  return 56;
}

const StaffProfileAvatar = ({ staff, size = 36, ring = false, alt }) => {
  const profile = resolveStaffProfile(staff);
  const px = toPx(size);
  const label = alt || staff?.name || '';

  return (
    <ProfileInner profile={profile} px={px} label={label} ring={ring} />
  );
};

function shellStyle(px, ring, background) {
  return {
    width: px,
    height: px,
    flexShrink: 0,
    borderRadius: 'var(--dim-radius-full)',
    background,
    overflow: 'hidden',
    ...(ring
      ? {
        border: 'var(--dim-stroke-400) solid var(--border-image-default)',
        boxShadow: PROFILE_RING_SHADOW,
      }
      : {}),
  };
}

function ProfileInner({ profile, px, label, ring = false }) {
  const [errored, setErrored] = useState(false);

  if (profile.kind === 'icon' || (profile.src && errored)) {
    return (
      <div
        style={{
          ...shellStyle(px, ring, profile.background),
          color: 'var(--text-brandPrimary-default)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={profile.icon || 'person'} size={Math.round(px * 0.45)} color='currentColor' />
      </div>
    );
  }

  if (profile.kind === 'collage') {
    return (
      <div
        style={{
          ...shellStyle(px, ring, profile.background),
          position: 'relative',
        }}
      >
        <img
          src={profile.src}
          alt={label}
          draggable={false}
          onError={() => setErrored(true)}
          className='absolute max-w-none pointer-events-none'
          style={profile.imgStyle}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        ...shellStyle(px, ring, profile.background),
        position: 'relative',
      }}
    >
      <img
        src={profile.src}
        alt={label}
        draggable={false}
        onError={() => setErrored(true)}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: profile.objectPosition || 'center center',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

/** Generic avatar for patients / ad-hoc (not roster staff). */
const StaffAvatar = ({ name, src, fallbackIcon = 'person', size = 56, ring = false }) => {
  const px = toPx(size);
  const [errored, setErrored] = useState(false);
  const showImg = src && !errored;

  const inner = (
    <div
      style={{
        width: px,
        height: px,
        flexShrink: 0,
        borderRadius: 'var(--dim-radius-full)',
        background: 'var(--surface-profile-avatar-default, #CFE6F7)',
        color: 'var(--text-brandPrimary-default)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {showImg ? (
        <img
          src={src}
          alt={name || ''}
          onError={() => setErrored(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <Icon name={fallbackIcon} size={Math.round(px * 0.45)} color='currentColor' />
      )}
    </div>
  );

  if (!ring) return inner;

  return (
    <div
      style={{
        width: px,
        height: px,
        borderRadius: 'var(--dim-radius-full)',
        border: 'var(--dim-stroke-400) solid var(--border-image-default)',
        boxShadow: PROFILE_RING_SHADOW,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {inner}
    </div>
  );
};

export { StaffAvatar };
export default StaffProfileAvatar;
