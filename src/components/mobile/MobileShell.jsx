import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { Sym } from './Sym';

/* MIH PHCIS · Mobile App shell.

   Wraps every /m/* page with:
     • 390×844 iPhone-shaped viewport (centered on desktop background)
     • status bar (time + signal/wifi/battery glyphs)
     • per-page header (provided by `<MobileHeader>` — see Header.jsx)
     • bottom tab nav (Home · Appointments · Records · Profile · More)
     • auth gate — pushes to /m/login if no session
     • Language context (TH/EN) used by Settings + page strings

   Mobile primitives (Button, Card, Input, Field, Badge, Header,
   SectionLabel) live in their own files now — see design.md §7. This
   file re-exports them so pages that `import { ... } from './MobileShell'`
   keep working without churn. New code should import from
   `'src/components/mobile'` (the barrel) instead. */

/* ─── Re-exports for backward compatibility ──────────────────────────── */
export { Sym } from './Sym';
export { MobileButton } from './MobileButton';
export { MobileCard } from './Card';
export { MobileInput } from './Input';
export { MobileField } from './Field';
export { MobileBadge } from './Badge';
export { MobileHeader } from './Header';
export { MobileSectionLabel } from './SectionLabel';

/* ─── Auth + Language context (single provider) ──────────────────────── */
const STORAGE_AUTH = 'phcis_mobile_auth_v1';
const STORAGE_LANG = 'phcis_mobile_lang_v1';

const MobileAppContext = createContext({
  isAuthed: false,
  signIn: () => {},
  signOut: () => {},
  lang: 'th',
  setLang: () => {},
  t: (th) => th,
});

const STRINGS = {
  th: {
    home: 'หน้าหลัก',
    appointments: 'นัดหมาย',
    records: 'ประวัติ',
    profile: 'โปรไฟล์',
    more: 'เพิ่มเติม',
    signIn: 'เข้าสู่ระบบ',
    signOut: 'ออกจากระบบ',
    back: 'ย้อนกลับ',
  },
  en: {
    home: 'Home',
    appointments: 'Appointments',
    records: 'Records',
    profile: 'Profile',
    more: 'More',
    signIn: 'Sign in',
    signOut: 'Sign out',
    back: 'Back',
  },
};

export const MobileAppProvider = ({ children }) => {
  const [isAuthed, setIsAuthed] = useState(() => {
    try { return Boolean(JSON.parse(localStorage.getItem(STORAGE_AUTH) || 'false')); }
    catch (e) { return false; }
  });
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem(STORAGE_LANG) || 'th'; }
    catch (e) { return 'th'; }
  });

  const signIn = () => {
    setIsAuthed(true);
    try { localStorage.setItem(STORAGE_AUTH, 'true'); } catch (e) { /* noop */ }
  };
  const signOut = () => {
    setIsAuthed(false);
    try { localStorage.setItem(STORAGE_AUTH, 'false'); } catch (e) { /* noop */ }
  };
  const setLang = (l) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_LANG, l); } catch (e) { /* noop */ }
  };

  /* `t(thai, english?)` — quick translator. The mock app keeps strings
     inline in pages (Thai); pages that want bilingual support pass the
     EN string as second arg. `STRINGS` covers the shell only. */
  const t = (th, en) => {
    if (lang === 'en' && en !== undefined) return en;
    if (lang === 'en' && STRINGS.en[th]) return STRINGS.en[th];
    return th;
  };

  const value = useMemo(
    () => ({ isAuthed, signIn, signOut, lang, setLang, t }),
    [isAuthed, lang],
  );
  return <MobileAppContext.Provider value={value}>{children}</MobileAppContext.Provider>;
};

export const useMobileApp = () => useContext(MobileAppContext);

/* ─── Status bar (clock + dummy radio glyphs) ────────────────────────── */
const StatusBar = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(id);
  }, []);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return (
    <div
      className='flex items-center justify-between'
      style={{
        height: 'var(--mobile-status-bar-height, 44px)',
        padding: '0 var(--dim-space-500, 20px)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-bold, 700)',
        color: 'var(--text-content-primary)',
      }}
    >
      <span>{hh}:{mm}</span>
      <div className='flex items-center' style={{ gap: 4 }}>
        <Sym name='signal_cellular_alt' size={16} />
        <Sym name='wifi' size={16} />
        <Sym name='battery_full' size={16} />
      </div>
    </div>
  );
};

/* ─── Bottom tab nav ─────────────────────────────────────────────────── */
const TABS = [
  { key: 'home',         path: '/m/home',         icon: 'home',           iconActive: 'home',           labelTh: 'หน้าแรก',  labelEn: 'Home' },
  { key: 'appointments', path: '/m/appointments', icon: 'calendar_clock', iconActive: 'calendar_clock', labelTh: 'นัดหมาย',  labelEn: 'Appointments' },
  { key: 'requests',     path: '/m/requests',     icon: 'send',           iconActive: 'send',           labelTh: 'ส่งคำขอ',  labelEn: 'Requests' },
  { key: 'profile',      path: '/m/profile',      icon: 'face',           iconActive: 'face',           labelTh: 'โปรไฟล์',  labelEn: 'Profile' },
];

const BottomNav = () => {
  const history = useHistory();
  const { pathname } = useLocation();
  const { lang } = useMobileApp();
  const activeKey = (() => {
    if (pathname.startsWith('/m/home') || pathname === '/m') return 'home';
    if (pathname.startsWith('/m/appointments') || pathname.startsWith('/m/book') || pathname.startsWith('/m/telemed')) return 'appointments';
    if (pathname.startsWith('/m/requests')) return 'requests';
    if (pathname.startsWith('/m/profile')) return 'profile';
    return null;
  })();
  return (
    <div
      className='flex items-stretch'
      style={{
        height: 'var(--mobile-bottom-nav-height, 80px)',
        background: 'var(--surface-card-100)',
        borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
        boxShadow: 'var(--shadow-brand-drop-top-200)',
        paddingBottom: 16,
      }}
    >
      {TABS.map((tab) => {
        const active = tab.key === activeKey;
        const label = lang === 'en' ? tab.labelEn : tab.labelTh;
        return (
          <button
            key={tab.key}
            type='button'
            onClick={() => history.push(tab.path)}
            className='flex-1 flex flex-col items-center justify-center'
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: active ? 'var(--text-brandPrimary-default, #007549)' : 'var(--text-content-tertiary, #858C92)',
              gap: 2,
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs, 12px)',
              fontWeight: active ? 'var(--type-weight-bold, 700)' : 'var(--type-weight-medium, 500)',
            }}
          >
            <Sym name={active ? tab.iconActive : tab.icon} size={24} fill={active} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
};

/* ─── Frame wrapper ──────────────────────────────────────────────────── */
const PHONE_W = 390;
const PHONE_H = 844;

export const MobileShell = ({
  children,
  showStatusBar = true,
  showBottomNav = true,
  requireAuth = true,
  background = 'var(--surface-content-secondary, #F5F6F7)',
}) => {
  const history = useHistory();
  const { pathname } = useLocation();
  const { isAuthed } = useMobileApp();

  /* Auth gate — redirect to /m/login if user isn't signed in. We do it
     in an effect so we can render a brief loader instead of throwing
     during render (which would trip the ErrorBoundary).                */
  useEffect(() => {
    if (requireAuth && !isAuthed) {
      const params = new URLSearchParams({ next: pathname });
      history.replace(`/m/login?${params.toString()}`);
    }
  }, [requireAuth, isAuthed, pathname, history]);

  if (requireAuth && !isAuthed) {
    return (
      <PhoneFrame>
        <div className='flex items-center justify-center h-full'
             style={{ color: 'var(--text-content-tertiary)' }}>
          กำลังพาไปหน้าเข้าสู่ระบบ…
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame background={background}>
      {showStatusBar && <StatusBar />}
      <div className='flex-1 min-h-0 overflow-y-auto' style={{ background }}>
        {children}
      </div>
      {showBottomNav && <BottomNav />}
    </PhoneFrame>
  );
};

const PhoneFrame = ({ children, background }) => (
  <div
    style={{
      minHeight: '100vh',
      width: '100%',
      background: 'linear-gradient(180deg, #0F1B17 0%, #1F3D33 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--dim-space-500, 20px) 0',
    }}
  >
    <div
      style={{
        width: PHONE_W,
        height: PHONE_H,
        borderRadius: 48,
        background: '#000',
        padding: 12,
        boxShadow: '0 30px 80px rgba(0,0,0,0.45), 0 0 0 2px rgba(255,255,255,0.06)',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {/* Side buttons (cosmetic) */}
      <div style={{ position: 'absolute', left: -3, top: 120, width: 3, height: 32, background: '#222', borderRadius: 2 }} />
      <div style={{ position: 'absolute', left: -3, top: 180, width: 3, height: 56, background: '#222', borderRadius: 2 }} />
      <div style={{ position: 'absolute', left: -3, top: 248, width: 3, height: 56, background: '#222', borderRadius: 2 }} />
      <div style={{ position: 'absolute', right: -3, top: 180, width: 3, height: 88, background: '#222', borderRadius: 2 }} />
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 38,
          background,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Dynamic-island notch (cosmetic) */}
        <div
          style={{
            position: 'absolute',
            top: 8, left: '50%',
            transform: 'translateX(-50%)',
            width: 124, height: 30,
            background: '#000',
            borderRadius: 999,
            zIndex: 10,
            pointerEvents: 'none',
          }}
        />
        {children}
      </div>
    </div>
  </div>
);
