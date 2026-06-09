import React from 'react';
import Icon from '@/components/icons/Icon';

/* MIH PHCIS · System Hub sidebar (Figma PHCIS-Signin 6:1474).
   64px slim rail — logo, empty nav spacer, notification bell + user avatar. */

const SIDEBAR_WIDTH = 64;
const MIH_LOGO = '/images/office-health-logo.png';
const DEFAULT_AVATAR = '/images/staff/doctors/doctor-portrait-01.png';

const NotificationBell = ({ onClick, hasUnread = true }) => (
  <button
    type='button'
    onClick={onClick}
    title='การแจ้งเตือน'
    aria-label='การแจ้งเตือน'
    style={{
      boxSizing: 'border-box',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      minHeight: 'var(--dim-size-1000, 48px)',
      padding: 'var(--dim-space-200, 8px) var(--dim-space-600, 24px)',
      background: 'transparent',
      border: 0,
      borderRadius: 'var(--dim-radius-150, 6px)',
      color: 'var(--text-content-secondary, #565D6D)',
      cursor: 'pointer',
      position: 'relative',
    }}
  >
    <span style={{ position: 'relative', display: 'inline-flex', color: 'currentColor' }}>
      <Icon name='notifications' size={16} style={{ color: 'currentColor' }} />
      {hasUnread && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 'var(--dim-size-100, 8px)',
            height: 'var(--dim-size-100, 8px)',
            borderRadius: 'var(--dim-radius-full, 9999px)',
            background: 'var(--surface-danger-default, var(--color-red-500, #EF4444))',
            border: 'var(--dim-stroke-100, 1px) solid var(--surface-card-default, #FFFFFF)',
          }}
        />
      )}
    </span>
  </button>
);

const UserTile = ({ avatarSrc = DEFAULT_AVATAR, onClick }) => (
  <button
    type='button'
    onClick={onClick}
    title='โปรไฟล์ผู้ใช้'
    aria-label='โปรไฟล์ผู้ใช้'
    style={{
      boxSizing: 'border-box',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: 'var(--dim-size-1200, 56px)',
      padding: 'var(--dim-space-200, 8px) var(--dim-space-300, 12px)',
      background: 'transparent',
      border: 0,
      borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
      cursor: 'pointer',
    }}
  >
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: 'var(--dim-size-800, 40px)',
        height: 'var(--dim-size-800, 40px)',
        borderRadius: 'var(--dim-radius-full, 9999px)',
        background: 'var(--surface-info-quaternary, #E7F1F8)',
        backgroundImage: `url(${avatarSrc})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        overflow: 'hidden',
      }}
    />
  </button>
);

const HubSidebar = ({ onNotificationClick, onProfileClick, avatarSrc }) => (
  <aside
    style={{
      boxSizing: 'border-box',
      flexShrink: 0,
      width: SIDEBAR_WIDTH,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      background: 'var(--surface-navigation-default, #FFFFFF)',
      borderRight: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
      boxShadow: 'var(--shadow-brand-drop-bottom-200, 0 1px 4px rgba(8,167,104,0.10), 0 1px 2px rgba(8,167,104,0.08))',
    }}
  >
    <div
      style={{
        boxSizing: 'border-box',
        height: 'var(--dim-size-1400, 64px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--dim-space-300, 12px)',
        borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
      }}
    >
      <img
        src={MIH_LOGO}
        alt='MIH'
        style={{
          width: 'var(--dim-size-800, 40px)',
          height: 'var(--dim-size-800, 40px)',
          objectFit: 'contain',
        }}
      />
    </div>

    {/* Figma keeps top nav hidden (opacity-0 placeholder) on the hub screen. */}
    <div style={{ flex: '1 0 0', minHeight: 0 }} aria-hidden />

    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 'var(--dim-space-200, 8px)',
      }}
    >
      <NotificationBell onClick={onNotificationClick} />
      <UserTile avatarSrc={avatarSrc} onClick={onProfileClick} />
    </div>
  </aside>
);

export default HubSidebar;
