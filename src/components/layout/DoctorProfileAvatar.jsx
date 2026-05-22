import React from 'react';

/** Collage PNG used for the logged-in doctor in Sidebar / ProfilePopover. */
export const DOCTOR_PROFILE_AVATAR_SRC = '/images/doctor-a.png';

/** Figma crops the collage to the bottom-left doctor portrait inside a circle. */
export const DOCTOR_PROFILE_AVATAR_CROP_STYLE = {
  width: '203.9%',
  height: '204.23%',
  left: '-1.3%',
  top: '-103.09%',
};

/**
 * Circular doctor profile — matches Sidebar user row (40×40, #e7f1f8, collage crop).
 */
export default function DoctorProfileAvatar({
  src = DOCTOR_PROFILE_AVATAR_SRC,
  alt = 'Doctor avatar',
  size = 40,
  className = '',
}) {
  return (
    <div
      className={`shrink-0 overflow-hidden relative ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: 'var(--dim-radius-full)',
        background: '#e7f1f8',
      }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className='absolute max-w-none pointer-events-none'
        style={DOCTOR_PROFILE_AVATAR_CROP_STYLE}
      />
    </div>
  );
}
