import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import SidebarProfileMenu from '@/components/layout/SidebarProfileMenu';
import SideSubMenu from '@/components/layout/SideSubMenu';
import Icon from '@/components/icons/Icon';
import { FilterDropdown } from '@/components/forms/FilterTag';
import { useClinicFilter } from '@/components/layout/HeaderClinicContext';
import FontSizeControls from '@/components/layout/FontSizeControls';
import DoctorProfileAvatar from '@/components/layout/DoctorProfileAvatar';

const OFFICE_HEALTH_LOGO = '/images/office-health-logo.png';

/* Soft drop-inner-shadow fades at the top/bottom of the nav scroller —
   appear only when the menu items overflow the viewport and the user has
   scrolled past the corresponding edge. Mirrors the pattern used by
   <HistoryTimeline> ("ประวัติการวัด") so the visual language is identical
   across scrollable surfaces.

   Brand-aware tint — `--PrimaryShadow-602/600` resolve to
   `rgb(var(--brand-p600-rgb) / α)`, so the fade retints automatically when
   the brand mode flips. Stacked /602 (12%) over /600 (8%) for a slightly
   stronger near-edge falloff, matching --shadow-header. */
const NAV_FADE_HEIGHT = 4;
const NAV_FADE_TOP =
  'linear-gradient(to bottom, var(--PrimaryShadow-602) 0%, var(--PrimaryShadow-600) 50%, transparent 100%)';
const NAV_FADE_BOTTOM =
  'linear-gradient(to top, var(--PrimaryShadow-602) 0%, var(--PrimaryShadow-600) 50%, transparent 100%)';

// Icon names = Material Symbols Outlined glyphs (loaded in index.html).
// Mapped from Figma SideMenu (node 1:2363, PHCIS · Open=Yes) —
// shell border + nav items + bottom user area.
//
// `subItems` (optional) — list of sub-departments rendered in a
// <SideSubMenu> panel to the right of the rail when this primary menu
// is clicked (Figma "Show SideSubMenu" node 299:4913). Currently the
// only menu wired with sub-departments is `treat`.
const ITEMS = [
  { key: 'dashboard', label: 'แดชบอร์ด',                  icon: 'bar_chart_4_bars', path: '/dashboard'   },
  { key: 'consent',   label: 'คลังแบบฟอร์ม',              icon: 'assignment_add',   path: '/forms'        },
  {
    key: 'registration', label: 'งานเวชระเบียน', icon: 'assignment',
    subItems: [
      { key: 'registration-queue', label: 'งานเวชระเบียน',      path: '/registration/queue' },
      { key: 'observation',        label: 'ระบบสังเกตอาการ',    path: '/observation'        },
    ],
  },
  { key: 'opd',       label: 'ระบบงานผู้รับบริการนอก',    icon: 'face',             path: '/opd/queue'   },
  {
    key: 'treat', label: 'ระบบบันทึกการรักษา', icon: 'stethoscope',
    subItems: [
      { key: 'opd-treat',  label: 'ตรวจรักษาทั่วไป (OPD)',                    path: '/treat/queue' },
      { key: 'family',     label: 'แผนกส่งเสริมสุขภาพ(วางแผนครอบครัว)' },
      { key: 'std',        label: 'แผนกโรคติดต่อทางเพศสัมพันธ์และโรคเอดส์' },
      { key: 'drug',       label: 'แผนกบำบัดและรักษาผู้ป่วยติดสารเสพติด' },
      { key: 'anc',        label: 'แผนกฝากครรภ์' },
      { key: 'wellness',   label: 'แผนกส่งเสริมสุขภาพเฉพาะกลุ่มที่สำคัญ' },
      { key: 'vaccine',    label: 'แผนกสร้างเสริมภูมิคุ้มกันโรค' },
      { key: 'dental',     label: 'แผนกทันตกรรม' },
      { key: 'tb',         label: 'แผนกวัณโรค' },
      { key: 'mental',     label: 'แผนกสุขภาพจิตและคลินิกสุขภาพจิต' },
    ],
  },
  { key: 'radiology', label: 'แผนกรังสีวินิจฉัย',         icon: 'radiology', iconSize: 18                },
  { key: 'lab',       label: 'ห้องปฏิบัติการ',            icon: 'biotech',   iconSize: 18                },
  { key: 'pharmacy',  label: 'ระบบงานเภสัชกรรม',          icon: 'pill'                                   },
  { key: 'finance',   label: 'งานการเงิน',                icon: 'baht'                                   },
  { key: 'appoint',   label: 'ระบบนัดหมาย',               icon: 'calendar_clock', path: '/appointment'       },
  /* 'ประวัติการใช้งาน' (log) และ 'ผู้ใช้และสิทธิ์การเข้าถึง' (users) ถูกย้ายไป
     แสดงเป็น "ระบบกลาง" บน System Hub แทน — จึงไม่อยู่ในเมนู PHCIS แล้ว. */
];

// Glyphs missing from the Material Symbols font (e.g. Thai Baht ฿) fall back
// to inline SVG icons from <Icon>. Keep this set tight — adding a name here
// silently skips the font path.
const CUSTOM_ICONS = new Set(['baht']);

const Sym = ({ name, size = 20, color, className = '' }) => {
  if (CUSTOM_ICONS.has(name)) {
    return (
      <span className={`inline-flex ${className}`} style={{ color }} aria-hidden>
        <Icon name={name} size={size} />
      </span>
    );
  }
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontSize: size, color }}
      aria-hidden
    >
      {name}
    </span>
  );
};

/* `items` defaults to the PHCIS nav (ITEMS) but can be overridden so a
   separate top-level system (e.g. Consent Management — Figma PHCIS|Consent
   Side Menu 270:95324) reuses the exact same shell/header/footer with its
   own menu. `fallbackKey` is the derived-active key when no path matches. */
const Sidebar = ({ activeKey, defaultSubmenuKey = null, items = ITEMS, fallbackKey = 'opd' }) => {
  const history = useHistory();
  const location = useLocation();
  const clinicFilter = useClinicFilter();
  // Derive active item from current pathname when not explicitly set
  const derivedKey = (() => {
    const match = items.find((it) => it.path && location.pathname.startsWith(it.path));
    return match ? match.key : fallbackKey;
  })();
  const currentKey = activeKey || derivedKey;

  const initialOpen =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('sidebarOpen') === '1';
  const [open, setOpen] = useState(initialOpen);
  const [hovered, setHovered] = useState(false);
  const [hoverItem, setHoverItem] = useState(null);

  // Responsive: below md (768px) the sidebar becomes an off-canvas drawer
  // triggered by Header's hamburger via `mih:toggle-mobile-sidebar` event.
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const open = () => setMobileOpen(true);
    const close = () => setMobileOpen(false);
    const toggle = () => setMobileOpen((v) => !v);
    window.addEventListener('mih:open-mobile-sidebar', open);
    window.addEventListener('mih:close-mobile-sidebar', close);
    window.addEventListener('mih:toggle-mobile-sidebar', toggle);
    return () => {
      window.removeEventListener('mih:open-mobile-sidebar', open);
      window.removeEventListener('mih:close-mobile-sidebar', close);
      window.removeEventListener('mih:toggle-mobile-sidebar', toggle);
    };
  }, []);
  // Close drawer when crossing back to desktop
  useEffect(() => { if (!isMobile) setMobileOpen(false); }, [isMobile]);

  // SideSubMenu — open when a primary menu with `subItems` is clicked.
  // submenuKey       = source of truth (which primary menu owns the panel)
  // renderSubmenuKey = lags submenuKey so the panel keeps rendering during
  //                    the exit animation, then unmounts
  // submenuMounted   = controls render lifecycle (true while panel is in
  //                    the DOM, including the exit animation)
  // submenuVisible   = controls the enter/exit transition (transform/opacity)
  // submenuItem      = which sub-department is selected inside the panel
  const [submenuKey, setSubmenuKey] = useState(defaultSubmenuKey);
  const [submenuItem, setSubmenuItem] = useState(null);
  const [submenuVisible, setSubmenuVisible] = useState(!!defaultSubmenuKey);
  const [submenuMounted, setSubmenuMounted] = useState(!!defaultSubmenuKey);
  const [renderSubmenuKey, setRenderSubmenuKey] = useState(defaultSubmenuKey);
  const submenu       = items.find((it) => it.key === submenuKey       && it.subItems);
  const renderSubmenu = items.find((it) => it.key === renderSubmenuKey && it.subItems);
  const sidebarRef  = useRef(null);
  const submenuRef  = useRef(null);

  // Slide-in / fade enter, slide-out / fade exit. Mount before showing so the
  // browser paints the initial (hidden) state, then flip visible on the next
  // frame to trigger the transition. On exit, wait for the transition to
  // finish before unmounting so the panel doesn't pop out.
  const SUBMENU_TRANSITION_MS = 280;
  useEffect(() => {
    if (submenuKey) {
      setRenderSubmenuKey(submenuKey);
      setSubmenuMounted(true);
      const id = requestAnimationFrame(() => setSubmenuVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setSubmenuVisible(false);
    const id = setTimeout(() => {
      setSubmenuMounted(false);
      setRenderSubmenuKey(null);
    }, SUBMENU_TRANSITION_MS);
    return () => clearTimeout(id);
  }, [submenuKey]);

  // Profile popover anchor + open state
  const userAreaRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileRect, setProfileRect] = useState(null);
  const [userHover, setUserHover] = useState(false);
  // While the popover or a sub-menu is open, force the sidebar into expanded
  // state so the anchor stays fixed even if the cursor is over the panel
  // (which lives outside the aside DOM). The popover itself fires `onClose`
  // on mouseLeave, which then allows expanded to relax back to (open || hovered).
  const expanded = isMobile
    ? mobileOpen
    : (open || hovered || profileOpen || !!submenu);
  const userActive = userHover || profileOpen;

  // Close submenu on outside click — clicks inside the sidebar or submenu
  // are ignored so the user can switch between items without losing the panel.
  useEffect(() => {
    if (!submenu) return undefined;
    const onDocMouseDown = (e) => {
      const t = e.target;
      if (sidebarRef.current && sidebarRef.current.contains(t)) return;
      if (submenuRef.current && submenuRef.current.contains(t)) return;
      setSubmenuKey(null);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [submenu]);

  // Escape closes the submenu.
  useEffect(() => {
    if (!submenu) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setSubmenuKey(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [submenu]);

  // Nav scroll-shadow — when the menu items overflow the viewport, fade
  // overlays appear at the top/bottom edges of the scroller. Mirrors the
  // <HistoryTimeline> implementation: track scrollTop / clientHeight /
  // scrollHeight to derive `overflow`, `shadowTop`, `shadowBottom`, then
  // toggle gradient sash opacity. Re-measured on resize via ResizeObserver
  // (collapsed → expanded sidebar resize triggers a fresh measure).
  const navScrollRef = useRef(null);
  const [navScroll, setNavScroll] = useState({
    overflow: false,
    shadowTop: false,
    shadowBottom: false,
  });
  const updateNavScrollShadow = useCallback(() => {
    const el = navScrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const overflow = scrollHeight > clientHeight + 2;
    if (!overflow) {
      setNavScroll({ overflow: false, shadowTop: false, shadowBottom: false });
      return;
    }
    const eps = 2;
    setNavScroll({
      overflow: true,
      shadowTop: scrollTop > eps,
      shadowBottom: scrollTop < scrollHeight - clientHeight - eps,
    });
  }, []);
  useLayoutEffect(() => { updateNavScrollShadow(); }, [expanded, updateNavScrollShadow]);
  useLayoutEffect(() => {
    const el = navScrollRef.current;
    if (typeof ResizeObserver === 'undefined' || !el) return undefined;
    const ro = new ResizeObserver(() => updateNavScrollShadow());
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateNavScrollShadow]);
  const toggleProfile = () => {
    if (profileOpen) { setProfileOpen(false); return; }
    if (userAreaRef.current) setProfileRect(userAreaRef.current.getBoundingClientRect());
    setProfileOpen(true);
  };

  // Profile menu (popover + Mode/Theme settings) is the shared
  // <SidebarProfileMenu> — same component every system shell uses, so theme
  // changes apply globally and the menu stays identical across systems.

  const ease = 'opacity 160ms ease, max-width 220ms ease';

  return (
    <>
      {/* ── Layout placeholder — reserves collapsed width so content
            doesn't reflow when sidebar expands. The aside below is
            position:fixed and overlays content on hover/lock.
            Below md the sidebar becomes an off-canvas drawer, so the
            placeholder collapses to 0 and the main column gets full width. */}
      <div
        aria-hidden
        className='shrink-0'
        style={{ width: isMobile ? 0 : 'var(--sm-width-closed)' }}
      />
      {/* Backdrop — only on mobile when drawer is open */}
      {isMobile && (
        <div
          aria-hidden
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.32)',
            opacity: mobileOpen ? 1 : 0,
            pointerEvents: mobileOpen ? 'auto' : 'none',
            transition: 'opacity 200ms ease',
            zIndex: 'calc(var(--sm-z-overlay) - 2)',
          }}
        />
      )}
    <aside
      ref={sidebarRef}
      onMouseEnter={() => !isMobile && setHovered(true)}
      onMouseLeave={() => !isMobile && setHovered(false)}
      style={{
        width: isMobile
          ? 'var(--sm-width-open)'
          : expanded ? 'var(--sm-width-open)' : 'var(--sm-width-closed)',
        background: 'var(--surface-navigation-default)',
        /* Figma Design Template 1:2447 — SideMenu shell:
             border-r  = border/brandprimary/quaternary @ stroke/100
             box-shadow = effect "Brand Drop Shadow Top/200"
                          (var(--shadow-sidemenu) — brand-aware, follows
                          [data-brand] across all modes) */
        borderRight: 'var(--dim-stroke-100) solid var(--border-sidemenu-shell)',
        boxShadow:   'var(--shadow-sidemenu)',
        transform: isMobile && !mobileOpen ? 'translateX(-100%)' : 'translateX(0)',
        transition: 'width 220ms cubic-bezier(.4,0,.2,1), transform 220ms cubic-bezier(.4,0,.2,1), box-shadow 220ms ease',
        position: 'fixed',
        left: 'var(--dim-space-0)',
        top: 'var(--dim-space-0)',
        bottom: 'var(--dim-space-0)',
        zIndex: 'var(--sm-z-overlay)',
      }}
      className='flex flex-col overflow-hidden'
    >
      {/* ── Logo area · 64px · logo true-centers when collapsed ─
           Click → System Hub (Figma 291:113045 nav behaviour). */}
      <div
        role='button'
        tabIndex={0}
        onClick={() => history.push('/hub')}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') history.push('/hub'); }}
        title='ไปยังหน้าเลือกระบบ'
        className='flex items-center shrink-0 overflow-hidden cursor-pointer'
        style={{
          height: 64,
          padding: '0 var(--sm-space-300)',
          gap: expanded ? 'var(--sm-space-300)' : 0,
          justifyContent: expanded ? 'flex-start' : 'center',
          borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
        }}
      >
        <div
          className='w-10 h-10 rounded-full shrink-0 overflow-hidden flex items-center justify-center'
          style={{ background: 'var(--surface-brandprimary-quaternary)' }}
        >
          <img
            src={OFFICE_HEALTH_LOGO}
            alt='โลโก้สำนักอนามัย'
            className='w-full h-full object-cover'
          />
        </div>
        <div
          className='flex-1 min-w-0 flex flex-col overflow-hidden'
          style={{
            opacity: expanded ? 1 : 0,
            maxWidth: expanded ? 'calc(var(--sm-width-open) - 100px)' : 0,
            transition: ease,
          }}
        >
          <div
            className='font-bold text-base leading-tight whitespace-nowrap'
            style={{ color: 'var(--text-brand-name)' }}
          >
            สำนักอนามัย
          </div>
          <div
            className='text-xs whitespace-nowrap'
            style={{ color: 'var(--text-brand-sub)' }}
          >
            ศูนย์ 4 ดินแดง
          </div>
        </div>
        <button
          type='button'
          onClick={() => setOpen((v) => !v)}
          aria-label='Toggle lock'
          title={open ? 'ปลดล็อค' : 'ล็อคเปิด'}
          className='shrink-0 rounded flex items-center justify-center'
          style={{
            width: 24, height: 24,
            background: 'transparent',
            color: 'var(--text-content-secondary)',
            opacity: expanded ? 1 : 0,
            maxWidth: expanded ? 32 : 0,
            transition: ease,
          }}
        >
          <Sym name='swap_horiz' size={20} />
        </button>
      </div>

      {clinicFilter && isMobile && (
        <div
          className='shrink-0 w-full md:hidden'
          style={{
            paddingTop: 'var(--dim-space-200)',
            paddingBottom: 'var(--dim-space-200)',
            paddingLeft: 'var(--sm-space-300)',
            paddingRight: 'var(--sm-space-300)',
            borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
          }}
        >
          <FilterDropdown
            className='w-full min-w-0 inline-flex'
            leadingIcon='location_on'
            options={clinicFilter.options}
            value={clinicFilter.clinic}
            onChange={clinicFilter.setClinic}
          />
        </div>
      )}

      {isMobile && (
        <div
          className='shrink-0 w-full md:hidden flex flex-col'
          style={{
            paddingTop: 'var(--dim-space-200)',
            paddingBottom: 'var(--dim-space-200)',
            paddingLeft: 'var(--sm-space-300)',
            paddingRight: 'var(--sm-space-300)',
            borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
            color: 'var(--text-content-secondary)',
          }}
        >
          <FontSizeControls variant='drawer' />
        </div>
      )}

      {/* ── Top nav items ───────────────────────────────────── */}
      <div className='relative flex-1 min-h-0 flex flex-col'>
      <nav
        ref={navScrollRef}
        onScroll={updateNavScrollShadow}
        className='flex-1 min-h-0 flex flex-col gap-1.5 py-4 overflow-y-auto overflow-x-hidden scrollbar-thin'
      >
        {items.map((it) => {
          // While a sub-menu panel is open the owning primary menu wins the
          // "active" visual (brand-p50 bg + 4px left border + chevron),
          // even if the URL doesn't match its path.
          const active = submenu ? it.key === submenu.key : it.key === currentKey;
          const isHover = hoverItem === it.key && !active;
          const tinted = active || isHover;
          const itemColor = tinted
            ? 'var(--text-sidemenu-selected)'
            : 'var(--text-sidemenu-default)';
          const onActivate = () => {
            if (it.subItems && it.subItems.length > 0) {
              // Toggle the sub-menu panel — same key closes, new key swaps.
              setSubmenuKey((k) => (k === it.key ? null : it.key));
              return;
            }
            // No subItems — close any open panel and navigate if a path exists.
            setSubmenuKey(null);
            if (it.path) {
              history.push(it.path);
              if (isMobile) setMobileOpen(false);
            }
          };
          return (
            <div
              key={it.key}
              role='menuitem'
              tabIndex={0}
              data-spotlight={`sidebar-${it.key}`}
              onClick={onActivate}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate(); } }}
              onMouseEnter={() => setHoverItem(it.key)}
              onMouseLeave={() => setHoverItem(null)}
              className='cursor-pointer flex items-center w-full shrink-0'
              style={{
                minHeight: 48,
                gap: expanded ? 'var(--sm-space-300)' : 0,
                justifyContent: expanded ? 'flex-start' : 'center',
                paddingTop: 'var(--dim-space-200)',
                paddingBottom: 'var(--dim-space-200)',
                // The 4px left border is always present but transparent when
                // not active — keeps the icon column stable across the
                // hover/active transition (no width shift on state change).
                paddingLeft: 'var(--dim-space-500)',
                paddingRight: active && expanded ? 'var(--sm-space-300)' : 'var(--sm-space-600)',
                borderLeft: `var(--sm-stroke-400) solid ${active ? 'var(--border-sidemenu-active)' : 'transparent'}`,
                background: tinted ? 'var(--surface-sidemenu-active)' : 'transparent',
                borderRadius: active ? 0 : 'var(--sm-radius-100)',
                transition: 'background 200ms cubic-bezier(0.32, 0.72, 0, 1), border-color 200ms cubic-bezier(0.32, 0.72, 0, 1)',
              }}
            >
              <Sym name={it.icon} size={it.iconSize ?? 16} color={itemColor} />
              <span
                className='flex-1 min-w-0 text-base whitespace-nowrap overflow-hidden'
                style={{
                  color: itemColor,
                  opacity: expanded ? 1 : 0,
                  maxWidth: expanded ? 'calc(var(--sm-width-open) - 100px)' : 0,
                  pointerEvents: expanded ? 'auto' : 'none',
                  transition: ease,
                }}
              >
                {it.label}
              </span>
              {active && (
                <span
                  className='shrink-0 overflow-hidden flex items-center justify-center'
                  style={{
                    width: 20, height: 20,
                    opacity: expanded ? 1 : 0,
                    maxWidth: expanded ? 24 : 0,
                    transition: ease,
                  }}
                >
                  <Sym name='chevron_right' size={20} color='var(--text-sidemenu-selected)' />
                </span>
              )}
            </div>
          );
        })}
      </nav>

      {/* Top/bottom fade — toggled by scroll position. pointer-events:none
          so it never blocks menu-item clicks. Sits above the scrolling nav
          via absolute positioning on the static wrapper, identical to the
          pattern in <HistoryTimeline> ("ประวัติการวัด"). */}
      <div
        aria-hidden
        className='pointer-events-none absolute left-0 right-0 top-0 transition-opacity duration-150'
        style={{
          height: NAV_FADE_HEIGHT,
          background: NAV_FADE_TOP,
          opacity: navScroll.overflow && navScroll.shadowTop ? 1 : 0,
        }}
      />
      <div
        aria-hidden
        className='pointer-events-none absolute left-0 right-0 bottom-0 transition-opacity duration-150'
        style={{
          height: NAV_FADE_HEIGHT,
          background: NAV_FADE_BOTTOM,
          opacity: navScroll.overflow && navScroll.shadowBottom ? 1 : 0,
        }}
      />
      </div>

      {/* ── Bottom: Notification + User ─────────────────────── */}
      <div className='flex flex-col gap-2 shrink-0'>
        {/* Notification */}
        <div
          className='cursor-pointer flex items-center w-full'
          style={{
            minHeight: 48,
            gap: expanded ? 'var(--sm-space-300)' : 0,
            justifyContent: expanded ? 'flex-start' : 'center',
            padding: '8px var(--sm-space-600)',
            borderRadius: 'var(--sm-radius-100)',
            transition: 'background .12s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-sidemenu-active)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <span className='relative inline-flex shrink-0' style={{ width: 16, height: 16 }}>
            <Sym name='notifications' size={16} color='var(--text-sidemenu-default)' />
            {/* red dot */}
            <span
              className='absolute rounded-full'
              style={{
                top: 'var(--dim-space-0)', right: 'var(--dim-space-0)',
                width: 6, height: 6,
                background: 'var(--surface-notification-default)',
                border: '1.5px solid var(--surface-navigation-default)',
              }}
            />
          </span>
          <span
            className='flex-1 min-w-0 text-base whitespace-nowrap overflow-hidden'
            style={{
              color: 'var(--text-sidemenu-default)',
              opacity: expanded ? 1 : 0,
              maxWidth: expanded ? 'calc(var(--sm-width-open) - 100px)' : 0,
              transition: ease,
            }}
          >
            แจ้งเตือน
          </span>
          <span
            className='shrink-0 inline-flex items-center justify-center text-xs font-medium whitespace-nowrap rounded-full overflow-hidden'
            style={{
              background: 'var(--surface-notification-default)',
              color: 'var(--text-danger-on-default)',
              opacity: expanded ? 1 : 0,
              maxWidth: expanded ? 60 : 0,
              padding: expanded ? '2px 8px' : 0,
              transition: 'opacity 160ms ease, max-width 220ms ease, padding 220ms ease',
            }}
          >
            99+
          </span>
        </div>

        {/* User area · avatar true-centers when collapsed */}
        <div
          ref={userAreaRef}
          role='button'
          tabIndex={0}
          aria-haspopup='menu'
          aria-expanded={profileOpen}
          onClick={toggleProfile}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleProfile(); } }}
          onMouseEnter={() => setUserHover(true)}
          onMouseLeave={() => setUserHover(false)}
          className='flex items-center cursor-pointer overflow-hidden shrink-0'
          style={{
            height: 56,
            padding: '8px var(--sm-space-300)',
            gap: expanded ? 'var(--sm-space-300)' : 0,
            justifyContent: expanded ? 'flex-start' : 'center',
            borderTop: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
            background: userActive ? 'var(--surface-sidemenu-hover)' : 'transparent',
            transition: 'background .12s',
          }}
        >
          <DoctorProfileAvatar className='shrink-0' />
          <div
            className='flex-1 min-w-0 flex flex-col overflow-hidden'
            style={{
              opacity: expanded ? 1 : 0,
              maxWidth: expanded ? 'calc(var(--sm-width-open) - 116px)' : 0,
              transition: ease,
            }}
          >
            <div
              className='text-sm leading-tight whitespace-nowrap overflow-hidden'
              style={{
                color: userActive
                  ? 'var(--text-sidemenu-hover)'
                  : 'var(--text-sidemenu-default)',
                transition: 'color .12s',
              }}
            >
              พญ.สมหญิง รักษ์ดี
            </div>
            <div
              className='text-xs whitespace-nowrap overflow-hidden'
              style={{ color: 'var(--text-content-tertiary)' }}
            >
              อายุรกรรม
            </div>
          </div>
          <button
            type='button'
            aria-label='switch user'
            className='shrink-0 overflow-hidden flex items-center justify-center'
            style={{
              width: 24, height: 24,
              color: 'var(--text-content-secondary)',
              opacity: expanded ? 1 : 0,
              maxWidth: expanded ? 24 : 0,
              transition: ease,
            }}
          >
            <Sym name='unfold_more' size={20} />
          </button>
        </div>
      </div>
    </aside>
    {/* SideSubMenu — opens to the right of the rail when the active
        primary menu has sub-departments (Figma node 299:4913).
        Enter: slide in from the left (-16px) + fade in over 280ms.
        Exit:  reverse — slide back + fade out, then unmount. */}
    {submenuMounted && renderSubmenu && (
      <SideSubMenu
        ref={submenuRef}
        header={renderSubmenu.label}
        items={renderSubmenu.subItems}
        selectedKey={submenuItem}
        onSelect={(k) => {
          setSubmenuItem(k);
          const sub = renderSubmenu.subItems.find((s) => s.key === k);
          if (sub && sub.path) {
            history.push(sub.path);
            setSubmenuKey(null);
          }
        }}
        showBottomSpacer={false}
        aria-hidden={!submenuVisible || undefined}
        style={{
          position: 'fixed',
          top: 'var(--dim-space-0)',
          bottom: 'var(--dim-space-0)',
          left: 'var(--sm-width-open)',
          /* SideSubMenu's internal nav already scrolls when items overflow
             the panel height (short viewport). */
          zIndex: 'calc(var(--sm-z-overlay) - 1)',
          transform: submenuVisible ? 'translateX(0)' : 'translateX(-16px)',
          opacity:   submenuVisible ? 1 : 0,
          pointerEvents: submenuVisible ? 'auto' : 'none',
          transition: [
            `transform ${SUBMENU_TRANSITION_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
            `opacity ${Math.round(SUBMENU_TRANSITION_MS * 0.8)}ms cubic-bezier(0.32, 0.72, 0, 1)`,
            `box-shadow ${SUBMENU_TRANSITION_MS}ms ease`,
          ].join(', '),
          willChange: 'transform, opacity',
        }}
      />
    )}
    <SidebarProfileMenu
      open={profileOpen}
      anchorRect={profileRect}
      anchorRef={userAreaRef}
      onClose={() => setProfileOpen(false)}
      onLogout={() => history.push('/login')}
    />
    </>
  );
};

export default Sidebar;
