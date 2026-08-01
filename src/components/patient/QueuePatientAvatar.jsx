import React, { useState } from 'react';
import { NEW_USER_AVATAR } from '@/data/avatarAssets';
import { getPatientByHN } from '@/data/patientProfiles';

/* Queue-table patient avatar — same contract as RegistrationQueuePage.jsx
   (Figma Register Home UserA / New User 3891:7747):
     photo → colored initial circle (HN-seeded hue) → New User silhouette. */

const DEFAULT_SIZE = 36;

/* Registration queue palette — deterministic background per HN. */
const HUES = ['#F472B6', '#A78BFA', '#60A5FA', '#34D399', '#FBBF24', '#FB7185'];

const stripHonorific = (name = '') =>
  String(name)
    .replace(/^(นาย|นาง|นางสาว|เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.)\s*/u, '')
    .trim();

const initialGlyph = (name) => {
  const base = stripHonorific(name) || String(name ?? '').trim();
  const chars = Array.from(base).filter((c) => /\S/.test(c));
  return chars[0] || '?';
};

/** Mirror RegistrationQueuePage `renderName` avatar inputs. */
export const resolveQueuePatientAvatarProps = ({
  hn,
  displayName,
  profile = getPatientByHN(hn),
  newUser = false,
  /** When true, skip profile portrait and fall back to initials (not the New User silhouette). */
  noProfilePhoto = false,
}) => {
  if (newUser || (!displayName?.trim() && !profile?.avatarUrl)) {
    return { newUser: true };
  }
  return {
    hn,
    name: profile?.shortName ?? displayName,
    avatarUrl: noProfilePhoto ? undefined : profile?.avatarUrl,
  };
};

export const InitialsPatientAvatar = ({ name, hn, size = DEFAULT_SIZE }) => {
  const seed = hn ? parseInt(String(hn).replace(/\D/g, ''), 10) : 0;
  const bg = HUES[Number.isFinite(seed) ? seed % HUES.length : 0];
  const ch = initialGlyph(name);
  return (
    <span
      className='shrink-0 inline-flex items-center justify-center rounded-full overflow-hidden'
      style={{
        width: size,
        height: size,
        background: bg,
        color: 'var(--text-content-on-content)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-medium)',
      }}
      aria-hidden
    >
      {ch}
    </span>
  );
};

/** Figma MIH DS Foundation · New User · 3891:7747 */
export const NewUserAvatar = ({ size = DEFAULT_SIZE }) => (
  <img
    src={NEW_USER_AVATAR}
    alt=''
    className='shrink-0 rounded-full object-cover'
    style={{ width: size, height: size }}
    aria-hidden
  />
);

const QueuePatientAvatar = ({
  name,
  hn,
  avatarUrl,
  size = DEFAULT_SIZE,
  /** Walk-in / no identity yet — registration "New User" silhouette. */
  newUser = false,
}) => {
  const [broken, setBroken] = useState(false);

  if (newUser || (!name?.trim() && !avatarUrl)) {
    return <NewUserAvatar size={size} />;
  }

  if (avatarUrl && !broken) {
    return (
      <img
        src={avatarUrl}
        alt={name || ''}
        loading='lazy'
        onError={() => setBroken(true)}
        className='shrink-0 rounded-full object-cover overflow-hidden'
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      />
    );
  }

  return <InitialsPatientAvatar name={name} hn={hn} size={size} />;
};

export { resolveQueuePatientAvatarProps as resolveQueueAvatarProps };

export default QueuePatientAvatar;
