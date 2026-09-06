import React, { useState, useRef, forwardRef } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import Icon from '@/components/icons/Icon';
import DoctorProfileAvatar from '@/components/layout/DoctorProfileAvatar';
import SidebarProfileMenu from '@/components/layout/SidebarProfileMenu';
import SideSubMenu from '@/components/layout/SideSubMenu';
import { PHCIS_CURRENT_USER } from '@/data/phcisCurrentUser';

/* MIH · ระบบงานสาธารณสุขและระบบงานควบคุมป้องกันและส่งเสริมสุขภาพในชุมชน
   (Community) · Side Menu — mirrors the hover-expand rail of
   <ScheduleSidebar> (same shell contract as every top-level system sibling
   of PHCIS), with the flyout <SideSubMenu> from the PHCIS shell reused for
   "ข้อมูลชุมชน" sub-departments — same pattern as ระบบบันทึกการรักษา's
   clinic flyout in Sidebar.jsx.

   Ported from the static prototype's side-menu (claude/Community ·
   community/*.html <nav class="side-menu__top">): แดชบอร์ด → ข้อมูลชุมชน
   (flyout: ทะเบียนชุมชน / ทะเบียนบ้านและสมาชิก / ศูนย์สุขภาพชุมชน /
   อาสาสมัครชุมชน) → การประเมิน → แผนที่ภูมิศาสตร์ (GIS) → รายงาน. */

const MIH_LOGO = '/images/office-health-logo.png';
const REVEAL = 'opacity 160ms ease, max-width 220ms ease';
const SIDEMENU_LABEL_SIZE = 'var(--type-size-base, 16px)';

const NAV_ITEMS = [
  { key: 'dashboard', icon: 'bar_chart_4_bars', route: '/community-health/dashboard', label: 'แดชบอร์ด' },
  {
    key: 'community',
    icon: 'groups',
    label: 'ข้อมูลชุมชน',
    subItems: [
      { key: 'register', label: 'ข้อมูลทะเบียนชุมชน', path: '/community-health/register' },
      { key: 'household', label: 'ทะเบียนบ้านและสมาชิก', path: '/community-health/household' },
      { key: 'chc', label: 'ข้อมูลศูนย์สุขภาพชุมชน', path: '/community-health/chc' },
      { key: 'volunteer', label: 'อาสาสมัครชุมชน', path: '/community-health/volunteer' },
    ],
  },
  { key: 'assess', icon: 'fact_check', route: '/community-health/assess', label: 'การประเมิน' },
  { key: 'gis', icon: 'travel_explore', route: '/community-health/gis', label: 'แผนที่ภูมิศาสตร์ (GIS)' },
  { key: 'report', icon: 'receipt_long', route: '/community-health/report', label: 'รายงาน' },
];

const SideMenuItem = ({ item, active, expanded, hasSubmenuOpen, onClick }) => {
  const [hover, setHover] = useState(false);
  const tinted = active || hover || hasSubmenuOpen;
  return (
    <button
      type='button'
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={item.label}
      aria-label={item.label}
      aria-haspopup={item.subItems ? 'true' : undefined}
      aria-expanded={item.subItems ? hasSubmenuOpen : undefined}
      aria-current={active ? 'page' : undefined}
      style={{
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: expanded ? 'var(--sm-space-300, 12px)' : 0,
        justifyContent: expanded ? 'flex-start' : 'center',
        width: '100%',
        minHeight: 'var(--dim-size-1000, 48px)',
        padding: '0 var(--sm-space-300, 12px)',
        background: tinted ? 'var(--surface-brandPrimary-quaternary, #F4FBF8)' : 'transparent',
        border: 0,
        borderLeft: tinted
          ? 'var(--dim-stroke-400, 4px) solid var(--surface-brandPrimary-default, var(--brand-p700, #007549))'
          : 'var(--dim-stroke-400, 4px) solid transparent',
        borderRadius: 0,
        color: tinted
          ? 'var(--text-brandPrimary-default, var(--brand-p700, #007549))'
          : 'var(--text-sidemenu-default, #4D5358)',
        cursor: 'pointer',
        transition: 'background-color 120ms ease, color 120ms ease',
      }}
    >
      <Icon name={item.icon} size={16} style={{ color: 'currentColor', flexShrink: 0 }} />
      <span
        className='whitespace-nowrap overflow-hidden text-left'
        style={{
          flex: 1,
          opacity: expanded ? 1 : 0,
          maxWidth: expanded ? 'calc(var(--sm-width-open, 320px) - 100px)' : 0,
          fontSize: SIDEMENU_LABEL_SIZE,
          transition: REVEAL,
        }}
      >
        {item.label}
      </span>
      {item.subItems && (
        <Icon
          name='chevron_right'
          size={16}
          style={{
            color: 'var(--text-content-quaternary, #ADB2B7)',
            flexShrink: 0,
            opacity: expanded ? 1 : 0,
            maxWidth: expanded ? 16 : 0,
            transition: REVEAL,
          }}
        />
      )}
    </button>
  );
};

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
      color: 'var(--text-sidemenu-default, #4D5358)',
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
        fontSize: SIDEMENU_LABEL_SIZE,
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
        {PHCIS_CURRENT_USER.displayName}
      </span>
      <span
        className='whitespace-nowrap overflow-hidden'
        style={{ fontSize: 'var(--type-size-xs, 12px)', lineHeight: 1.25, color: 'var(--text-content-tertiary, #8A9099)' }}
      >
        {PHCIS_CURRENT_USER.department}
      </span>
    </div>
    <span
      aria-hidden
      className='shrink-0 inline-flex items-center justify-center'
      style={{ width: 24, height: 24, color: 'var(--text-content-secondary)', opacity: expanded ? 1 : 0, maxWidth: expanded ? 24 : 0, transition: REVEAL }}
    >
      <Icon name='unfold_more' size={20} />
    </span>
  </button>
));

const CommunitySidebar = ({ activeKey, onNotificationClick }) => {
  const history = useHistory();
  const location = useLocation();
  const [hovered, setHovered] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileRect, setProfileRect] = useState(null);
  const [submenuKey, setSubmenuKey] = useState(null);
  const userRef = useRef(null);
  const expanded = hovered || profileOpen;

  const toggleProfile = () => {
    if (profileOpen) { setProfileOpen(false); return; }
    if (userRef.current) setProfileRect(userRef.current.getBoundingClientRect());
    setProfileOpen(true);
  };

  const resolvedActive = activeKey || (() => {
    const path = location?.pathname || '';
    for (const item of NAV_ITEMS) {
      if (item.route && (path === item.route || path.startsWith(item.route + '/'))) return item.key;
      if (item.subItems?.some((s) => path === s.path || path.startsWith(s.path + '/'))) return item.key;
    }
    return null;
  })();

  const submenuItemKey = (() => {
    const path = location?.pathname || '';
    const owner = NAV_ITEMS.find((it) => it.subItems);
    return owner?.subItems.find((s) => path === s.path || path.startsWith(s.path + '/'))?.key ?? null;
  })();

  const submenu = NAV_ITEMS.find((it) => it.key === submenuKey && it.subItems);

  const go = (item) => {
    if (item.subItems) { setSubmenuKey((k) => (k === item.key ? null : item.key)); return; }
    setSubmenuKey(null);
    if (item.route) history.push(item.route);
  };

  return (
    <>
      <div style={{ width: 'var(--sm-width-closed, 64px)', flexShrink: 0 }} aria-hidden />

      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setSubmenuKey(null); }}
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
          boxShadow: 'var(--shadow-brand-drop-bottom-200, 0 1px 4px rgba(8,167,104,0.10), 0 1px 2px rgba(8,167,104,0.08))',
          transition: 'width 220ms cubic-bezier(.4,0,.2,1), box-shadow 220ms ease',
          overflow: 'hidden',
        }}
      >
        <div
          role='button'
          tabIndex={0}
          onClick={() => history.push('/hub')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') history.push('/hub'); }}
          title='ไปยังหน้าเลือกระบบ'
          style={{
            boxSizing: 'border-box',
            height: 'var(--dim-size-1400, 64px)',
            display: 'flex',
            alignItems: 'center',
            gap: expanded ? 'var(--sm-space-300, 12px)' : 0,
            justifyContent: expanded ? 'flex-start' : 'center',
            padding: '0 var(--sm-space-300, 12px)',
            borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
            cursor: 'pointer',
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
          </div>
        </div>

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
          {NAV_ITEMS.map((item) => (
            <SideMenuItem
              key={item.key}
              item={item}
              active={resolvedActive === item.key && !item.subItems}
              hasSubmenuOpen={item.subItems ? resolvedActive === item.key : false}
              expanded={expanded}
              onClick={() => go(item)}
            />
          ))}
        </nav>

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

      {submenu && (
        <SideSubMenu
          header={submenu.label}
          items={submenu.subItems}
          selectedKey={submenuItemKey}
          onSelect={(k) => {
            const sub = submenu.subItems.find((s) => s.key === k);
            if (sub?.path) { history.push(sub.path); setSubmenuKey(null); }
          }}
          showBottomSpacer={false}
          style={{
            position: 'fixed',
            top: 'var(--dim-space-0)',
            bottom: 'var(--dim-space-0)',
            left: 'var(--sm-width-open, 320px)',
            zIndex: 'calc(var(--sm-z-overlay, 40) - 1)',
          }}
        />
      )}

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

export default CommunitySidebar;
