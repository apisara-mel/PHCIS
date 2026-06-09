import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import Icon from '@/components/icons/Icon';

/* MIH · ระบบจัดการตารางเวร · Side Menu (Figma Schedule-Management 15:3758).
   64px slim sidebar — collapsed (icon-only) variant.

   Structure (top → bottom):
     · Logo area (64h) — MIH mark, bottom hairline border
     · Top nav (flex 1) — 3 icon items, gap 6px
         · bar_chart_4_bars → /dashboard
         · calendar_today  → /appointment
         · edit_calendar   → /schedule (active when on /schedule/*)
     · Bottom — notification bell (with red dot) + user avatar tile (56h)

   Active item styling per Figma:
     · surface = --surface-brandPrimary-quaternary
     · left border = 4px --surface-brandPrimary-default
     · icon color = --text-brandPrimary-default
     · no rounded corners (full-bleed strip)
*/

const SIDEBAR_WIDTH = 64;

const MIH_LOGO = '/images/office-health-logo.png';

const NAV_ITEMS = [
  { key: 'dashboard',   icon: 'bar_chart_4_bars', route: '/dashboard',   label: 'Dashboard' },
  { key: 'appointment', icon: 'calendar_today',   route: '/appointment', label: 'นัดหมาย' },
  { key: 'schedule',    icon: 'edit_calendar',    route: '/schedule',    label: 'จัดการตารางเวร' },
];

const SideMenuItem = ({ item, active, onClick }) => (
  <button
    type='button'
    onClick={onClick}
    title={item.label}
    aria-label={item.label}
    aria-current={active ? 'page' : undefined}
    style={{
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      minHeight: 'var(--dim-size-1000, 48px)',
      padding: 'var(--dim-space-200, 8px) var(--dim-space-600, 24px)',
      background: active ? 'var(--surface-brandPrimary-quaternary, #F4FBF8)' : 'transparent',
      border: 0,
      borderLeft: active
        ? 'var(--dim-stroke-400, 4px) solid var(--surface-brandPrimary-default, var(--brand-p700, #007549))'
        : 'var(--dim-stroke-400, 4px) solid transparent',
      borderRadius: 0,
      color: active
        ? 'var(--text-brandPrimary-default, var(--brand-p700, #007549))'
        : 'var(--text-content-secondary, #565D6D)',
      cursor: 'pointer',
      transition: 'background-color 120ms ease, color 120ms ease',
    }}
  >
    <Icon name={item.icon} size={16} style={{ color: 'currentColor' }} />
  </button>
);

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

const UserTile = ({ avatarSrc = 'https://api.dicebear.com/9.x/lorelei/svg?seed=DoctorA', onClick }) => (
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

const ScheduleSidebar = ({ activeKey, onNavigate, onNotificationClick, onProfileClick }) => {
  const history = useHistory();
  const location = useLocation();

  /* Determine active item from prop, falling back to current path */
  const resolvedActive = activeKey || (() => {
    const path = location?.pathname || '';
    const match = NAV_ITEMS.find(n => path === n.route || path.startsWith(n.route + '/'));
    return match ? match.key : null;
  })();

  const go = (item) => {
    if (onNavigate) { onNavigate(item); return; }
    if (item.route) history.push(item.route);
  };

  return (
    <aside
      style={{
        boxSizing: 'border-box',
        flexShrink: 0,
        width: SIDEBAR_WIDTH,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        background: 'var(--surface-card-default, #FFFFFF)',
        borderRight: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
        boxShadow: 'var(--shadow-brand-drop-bottom-200, 0 1px 4px rgba(8,167,104,0.10), 0 1px 2px rgba(8,167,104,0.08))',
      }}
    >
      {/* Logo area */}
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

      {/* Top nav — 3 items, fills remaining vertical space */}
      <nav
        role='navigation'
        style={{
          flex: '1 0 0',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 'var(--dim-space-150, 6px)',
          padding: 'var(--dim-space-400, 16px) 0',
          overflow: 'hidden',
        }}
      >
        {NAV_ITEMS.map(item => (
          <SideMenuItem
            key={item.key}
            item={item}
            active={resolvedActive === item.key}
            onClick={() => go(item)}
          />
        ))}
      </nav>

      {/* Bottom — notification + user */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 'var(--dim-space-200, 8px)',
        }}
      >
        <NotificationBell onClick={onNotificationClick} />
        <UserTile onClick={onProfileClick} />
      </div>
    </aside>
  );
};

export default ScheduleSidebar;
