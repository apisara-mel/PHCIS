import React, { useState, useRef, forwardRef } from 'react';
import { useHistory } from 'react-router-dom';
import Icon from '@/components/icons/Icon';
import DoctorProfileAvatar from '@/components/layout/DoctorProfileAvatar';
import SidebarProfileMenu from '@/components/layout/SidebarProfileMenu';

/* MIH PHCIS · System Hub sidebar (Figma PHCIS-Signin 6:1474).
   Slim 64px rail that HOVER-EXPANDS to 320px — same behaviour as the PHCIS
   shell <Sidebar>: collapsed shows logo + bell + avatar centred; on hover the
   rail widens and reveals the brand title + user name/role. The profile photo
   is the shared <DoctorProfileAvatar> (doctor-a.png) so the logged-in user is
   the SAME person across every system and the hub. */

const MIH_LOGO = '/images/office-health-logo.png';

/* Same easing/widths as src/components/layout/Sidebar.jsx so the two rails feel
   identical. closed = --sm-width-closed (64), open = --sm-width-open (320). */
const REVEAL = 'opacity 160ms ease, max-width 220ms ease';

const NotificationBell = ({ onClick, expanded, hasUnread = true }) => (
  <button
    type='button'
    onClick={onClick}
    title='การแจ้งเตือน'
    aria-label='การแจ้งเตือน'
    style={{
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      gap: expanded ? 'var(--sm-space-300, 12px)' : 0,
      justifyContent: expanded ? 'flex-start' : 'center',
      width: '100%',
      minHeight: 'var(--dim-size-1000, 48px)',
      padding: '0 var(--sm-space-300, 12px)',
      background: 'transparent',
      border: 0,
      borderRadius: 'var(--dim-radius-150, 6px)',
      color: 'var(--text-content-secondary, #565D6D)',
      cursor: 'pointer',
    }}
  >
    <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0, color: 'currentColor' }}>
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
    <span
      className='whitespace-nowrap overflow-hidden'
      style={{
        opacity: expanded ? 1 : 0,
        maxWidth: expanded ? 'calc(var(--sm-width-open, 320px) - 100px)' : 0,
        fontSize: 'var(--type-size-sm, 14px)',
        color: 'var(--text-sidemenu-default, #4D5358)',
        transition: REVEAL,
      }}
    >
      การแจ้งเตือน
    </span>
  </button>
);

const UserTile = forwardRef(({ onClick, expanded, active }, ref) => (
  <button
    ref={ref}
    type='button'
    onClick={onClick}
    aria-haspopup='menu'
    aria-expanded={active}
    title='โปรไฟล์ผู้ใช้'
    aria-label='โปรไฟล์ผู้ใช้'
    style={{
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      gap: expanded ? 'var(--sm-space-300, 12px)' : 0,
      justifyContent: expanded ? 'flex-start' : 'center',
      width: '100%',
      height: 'var(--dim-size-1200, 56px)',
      padding: '0 var(--sm-space-300, 12px)',
      background: 'transparent',
      border: 0,
      borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
      cursor: 'pointer',
    }}
  >
    <DoctorProfileAvatar className='shrink-0' />
    <div
      className='flex-1 min-w-0 flex flex-col overflow-hidden text-left'
      style={{
        opacity: expanded ? 1 : 0,
        maxWidth: expanded ? 'calc(var(--sm-width-open, 320px) - 116px)' : 0,
        transition: REVEAL,
      }}
    >
      <span
        className='whitespace-nowrap overflow-hidden'
        style={{ fontSize: 'var(--type-size-sm, 14px)', lineHeight: 1.25, color: 'var(--text-sidemenu-default, #4D5358)' }}
      >
        พญ.สมหญิง รักษ์ดี
      </span>
      <span
        className='whitespace-nowrap overflow-hidden'
        style={{ fontSize: 'var(--type-size-xs, 12px)', lineHeight: 1.25, color: 'var(--text-content-tertiary, #8A9099)' }}
      >
        อายุรกรรม
      </span>
    </div>
    {/* switch-user glyph — same as the PHCIS shell sidebar profile row. */}
    <span
      aria-hidden
      className='shrink-0 inline-flex items-center justify-center'
      style={{ width: 24, height: 24, color: 'var(--text-content-secondary)', opacity: expanded ? 1 : 0, maxWidth: expanded ? 24 : 0, transition: REVEAL }}
    >
      <Icon name='unfold_more' size={20} />
    </span>
  </button>
));

const HubSidebar = ({ onNotificationClick }) => {
  const history = useHistory();
  const [hovered, setHovered] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileRect, setProfileRect] = useState(null);
  const userRef = useRef(null);
  const expanded = hovered || profileOpen;

  const toggleProfile = () => {
    if (profileOpen) { setProfileOpen(false); return; }
    if (userRef.current) setProfileRect(userRef.current.getBoundingClientRect());
    setProfileOpen(true);
  };
  return (
    <>
      {/* Placeholder keeps a 64px column in the flex flow so the hub content
          doesn't reflow when the fixed rail expands on hover. */}
      <div style={{ width: 'var(--sm-width-closed, 64px)', flexShrink: 0 }} aria-hidden />

      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          boxSizing: 'border-box',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 'var(--sm-z-overlay, 40)',
          width: expanded ? 'var(--sm-width-open, 320px)' : 'var(--sm-width-closed, 64px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          background: 'var(--surface-navigation-default, #FFFFFF)',
          borderRight: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
          boxShadow: 'var(--shadow-brand-drop-bottom-200)',
          transition: 'width 220ms cubic-bezier(.4,0,.2,1), box-shadow 220ms ease',
          overflow: 'hidden',
        }}
      >
        {/* ── Logo area · 64px · brand text reveals on hover ── */}
        <div
          style={{
            boxSizing: 'border-box',
            height: 'var(--dim-size-1400, 64px)',
            display: 'flex',
            alignItems: 'center',
            gap: expanded ? 'var(--sm-space-300, 12px)' : 0,
            justifyContent: expanded ? 'flex-start' : 'center',
            padding: '0 var(--sm-space-300, 12px)',
            borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
          }}
        >
          <img
            src={MIH_LOGO}
            alt='MIH'
            style={{ width: 'var(--dim-size-800, 40px)', height: 'var(--dim-size-800, 40px)', objectFit: 'contain', flexShrink: 0 }}
          />
          <div
            className='flex-1 min-w-0 flex flex-col overflow-hidden'
            style={{
              opacity: expanded ? 1 : 0,
              maxWidth: expanded ? 'calc(var(--sm-width-open, 320px) - 100px)' : 0,
              transition: REVEAL,
            }}
          >
            <span
              className='font-bold whitespace-nowrap overflow-hidden'
              style={{ fontSize: 'var(--type-size-base, 16px)', lineHeight: 1.25, color: 'var(--text-brand-name, #007549)' }}
            >
              สำนักอนามัย
            </span>
            <span
              className='whitespace-nowrap overflow-hidden'
              style={{ fontSize: 'var(--type-size-xs, 12px)', lineHeight: 1.25, color: 'var(--text-brand-sub, #8A9099)' }}
            >
              ศูนย์ 4 ดินแดง
            </span>
          </div>
        </div>

        {/* Figma keeps top nav hidden (opacity-0 placeholder) on the hub screen. */}
        <div style={{ flex: '1 0 0', minHeight: 0 }} aria-hidden />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 'var(--dim-space-200, 8px)',
            paddingBottom: 'var(--dim-space-200, 8px)',
          }}
        >
          <NotificationBell onClick={onNotificationClick} expanded={expanded} />
          <UserTile ref={userRef} onClick={toggleProfile} expanded={expanded} active={profileOpen} />
        </div>
      </aside>

      {/* Shared profile menu — same component/behaviour as every system shell
          (ภาษา · โหมดและธีม · รหัสผ่าน · แจ้งเตือน · Log out); theme is global. */}
      <SidebarProfileMenu
        open={profileOpen}
        anchorRect={profileRect}
        anchorRef={userRef}
        onClose={() => setProfileOpen(false)}
        onLogout={() => history.push('/login')}
      />
    </>
  );
};

export default HubSidebar;
