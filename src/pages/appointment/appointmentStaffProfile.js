/* Staff profile presets — Figma Appointment 1:38622 (DoctorG) + generated hospital portraits. */

import {
  DOCTOR_PROFILE_AVATAR_CROP_STYLE,
  DOCTOR_PROFILE_AVATAR_SRC,
} from '@/components/layout/DoctorProfileAvatar';
import { STAFF_AVATAR } from './appointmentStaffAvatars';

/** @typedef {'photo' | 'collage' | 'icon'} StaffProfileKind */

/**
 * @param {{ id?: number, role?: string, groupPolicy?: string, icon?: string, avatarSrc?: string, avatarObjectPosition?: string }} staff
 * @returns {{ kind: StaffProfileKind, src?: string, background: string, imgStyle?: object, objectPosition?: string, icon?: string }}
 */
export function resolveStaffProfile(staff) {
  const icon = staff.icon || 'person';

  if (staff.avatarSrc) {
    return {
      kind: 'photo',
      src: staff.avatarSrc,
      background: 'var(--surface-profile-avatar-default, #CFE6F7)',
      objectPosition: staff.avatarObjectPosition || 'center center',
    };
  }

  const variant = (staff.id || 0) % 4;

  if (staff.role === 'doctor') {
    if (variant === 1) {
      return {
        kind: 'collage',
        src: DOCTOR_PROFILE_AVATAR_SRC,
        background: 'var(--surface-profile-avatar-secondary, #E7F1F8)',
        imgStyle: DOCTOR_PROFILE_AVATAR_CROP_STYLE,
      };
    }
    return {
      kind: 'photo',
      src: STAFF_AVATAR.doctorLegacy,
      background: 'var(--surface-profile-avatar-default, #CFE6F7)',
    };
  }

  if (staff.role === 'nurse') {
    return {
      kind: 'photo',
      src: STAFF_AVATAR.nurseOpd,
      background: 'var(--surface-profile-avatar-default, #CFE6F7)',
      objectPosition: '58% 12%',
    };
  }

  if (staff.groupPolicy === 'admin' || staff.groupPolicy === 'registrar' || staff.groupPolicy === 'reception') {
    return {
      kind: 'photo',
      src: STAFF_AVATAR.registrar,
      background: 'var(--surface-profile-avatar-default, #CFE6F7)',
      objectPosition: `${35 + (variant * 12) % 30}% ${18 + variant * 8}%`,
    };
  }

  return {
    kind: 'icon',
    icon,
    background: 'var(--surface-profile-avatar-secondary, #E7F1F8)',
  };
}

/** PrimarySearch recent-avatar pile — photo/collage src only. */
export function staffProfileSearchSrc(staff) {
  const profile = resolveStaffProfile(staff);
  return profile.kind === 'icon' ? null : profile.src;
}
