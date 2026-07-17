import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { Sym } from './Sym';
import NavigationMenu from './NavigationMenu';

/* MIH PHCIS · Mobile App shell.

   Wraps every /m/* page with:
     • 402×874 iPhone 17 viewport (centered on desktop background; matches Figma)
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
/* Mobile appearance only — never writes <html data-mode> (PHCIS web owns that). */
const STORAGE_THEME = 'phcis_mobile_theme_v1';

const MobileAppContext = createContext({
  isAuthed: false,
  signIn: () => {},
  signOut: () => {},
  lang: 'th',
  setLang: () => {},
  theme: 'light', /* 'light' | 'dark' — scoped to MobileShell via data-mobile-theme */
  setTheme: () => {},
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

/* Re-apply PHCIS web appearance from its own storage — mobile must never
   own <html data-mode>. Also undoes any accidental pollution from an
   earlier mobile settings build that wrote documentElement. */
const restorePhcisDocumentMode = () => {
  try {
    const root = document.documentElement;
    const mode = window.localStorage.getItem('phcis.mode') || 'light';
    const prefersDark = window.matchMedia
      && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = mode === 'dark' || (mode === 'system' && prefersDark);
    if (dark) root.setAttribute('data-mode', 'dark');
    else root.removeAttribute('data-mode');
  } catch (_e) { /* noop */ }
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
  const [theme, setThemeState] = useState(() => {
    try {
      const t = localStorage.getItem(STORAGE_THEME);
      if (t === 'dark' || t === 'light') return t;
      /* One-time migrate from older settings blob that wrongly coupled theme. */
      const raw = localStorage.getItem('phcis_mobile_settings_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.theme === 'dark' || parsed?.theme === 'light') {
          localStorage.setItem(STORAGE_THEME, parsed.theme);
          return parsed.theme;
        }
      }
    } catch (e) { /* noop */ }
    return 'light';
  });

  useEffect(() => {
    restorePhcisDocumentMode();
  }, []);

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
  const setTheme = (next) => {
    const value = next === 'dark' ? 'dark' : 'light';
    setThemeState(value);
    try { localStorage.setItem(STORAGE_THEME, value); } catch (e) { /* noop */ }
    /* Never touch <html data-mode> — PHCIS web stays independent. */
    restorePhcisDocumentMode();
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
    () => ({ isAuthed, signIn, signOut, lang, setLang, theme, setTheme, t }),
    [isAuthed, lang, theme],
  );
  return <MobileAppContext.Provider value={value}>{children}</MobileAppContext.Provider>;
};

export const useMobileApp = () => useContext(MobileAppContext);

/* ─── Status bar (clock + dummy radio glyphs) ────────────────────────── */
/* tone: default = dark on white · onBrand = white/transparent ·
   transparentDark = dark/transparent (booking success 175:94673). */
const StatusBar = ({ tone = 'default', style }) => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(id);
  }, []);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const onBrand = tone === 'onBrand';
  const transparentDark = tone === 'transparentDark';
  const ink = onBrand
    ? 'var(--text-content-on-content, #FFFFFF)'
    : 'var(--text-content-primary)';
  return (
    <div
      className='flex items-center justify-between shrink-0'
      style={{
        height: 'var(--mobile-status-bar-height, 44px)',
        padding: '0 var(--dim-space-400, 16px)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-bold, 700)',
        color: ink,
        background: onBrand || transparentDark
          ? 'transparent'
          : 'var(--surface-card-100, #FFFFFF)',
        ...style,
      }}
    >
      <span>{hh}:{mm}</span>
      <div className='flex items-center' style={{ gap: 4, color: ink }}>
        <Sym name='signal_cellular_alt' size={16} color={ink} />
        <Sym name='wifi' size={16} color={ink} />
        <Sym name='battery_full' size={16} color={ink} />
      </div>
    </div>
  );
};

/* ─── Bottom tab nav ─────────────────────────────────────────────────── */
const TABS = [
  { key: 'home',         path: '/m/home',         icon: 'home',           iconActive: 'home',           labelTh: 'หน้าแรก',  labelEn: 'Home' },
  { key: 'appointments', path: '/m/appointments', icon: 'calendar_clock', iconActive: 'calendar_clock', labelTh: 'นัดหมาย',  labelEn: 'Appointments' },
  { key: 'requests',     path: '/m/requests',     icon: 'send',           iconActive: 'send',           labelTh: 'ส่งคำขอ',  labelEn: 'Requests' },
  { key: 'history',      path: '/m/records',      icon: 'history',        iconActive: 'history',        labelTh: 'ประวัติ',  labelEn: 'History' },
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
    if (pathname.startsWith('/m/records') || pathname.startsWith('/m/visit')) return 'history';
    if (pathname.startsWith('/m/profile') || pathname.startsWith('/m/settings')) return 'profile';
    return null;
  })();
  /* Render via the DS NavigationMenu (Figma L8AlrWha3QNKcxaVCH1UFE 3:555). */
  const items = TABS.map((tab) => ({
    key: tab.key,
    icon: tab.icon,
    label: lang === 'en' ? tab.labelEn : tab.labelTh,
    path: tab.path,
  }));
  return (
    <NavigationMenu
      items={items}
      activeKey={activeKey}
      onSelect={(item) => history.push(item.path)}
    />
  );
};

/* ─── Frame wrapper ──────────────────────────────────────────────────── */
/* iPhone 17 — 402×874 CSS points (6.3" @3x). Same artboard as Figma Mobile. */
const PHONE_W = 402;
const PHONE_H = 874;
const PHONE_BEZEL = 12;

export const MobileHomeIndicator = ({
  background = 'var(--surface-card-100, #FFFFFF)',
}) => (
  <div
    aria-hidden
    className='flex items-end justify-center shrink-0 w-full'
    style={{
      height: 'calc(var(--dim-size-600, 32px) + var(--dim-space-050, 2px))',
      paddingBottom: 'var(--dim-space-200, 8px)',
      background,
    }}
  >
    <span
      style={{
        width: 'var(--dim-size-2050, 144px)',
        height: 'calc(var(--dim-space-100, 4px) + var(--dim-stroke-100, 1px))',
        borderRadius: 'var(--dim-radius-full, 9999px)',
        background: 'var(--labels-primary, #000000)',
      }}
    />
  </div>
);

export const MobileShell = ({
  children,
  showStatusBar = true,
  showBottomNav = true,
  homeIndicatorOverlay = false,
  homeIndicatorBackground,
  requireAuth = true,
  background = 'var(--surface-content-secondary, #F5F6F7)',
  statusBarTone = 'default', /* 'default' | 'onBrand' | 'transparentDark' */
  statusBarStyle,
}) => {
  const history = useHistory();
  const { pathname } = useLocation();
  const { isAuthed, theme } = useMobileApp();

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
      <PhoneFrame theme={theme}>
        <div className='flex flex-1 items-center justify-center min-h-0'
             style={{ color: 'var(--text-content-tertiary)' }}>
          กำลังพาไปหน้าเข้าสู่ระบบ…
        </div>
        <MobileHomeIndicator />
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame background={background} theme={theme}>
      {showStatusBar && <StatusBar tone={statusBarTone} style={statusBarStyle} />}
      <div className='flex-1 min-h-0 overflow-y-auto' style={{ background }}>
        {children}
      </div>
      {showBottomNav && <BottomNav />}
      {homeIndicatorOverlay ? (
        <div
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          <MobileHomeIndicator background={homeIndicatorBackground} />
        </div>
      ) : <MobileHomeIndicator background={homeIndicatorBackground} />}
    </PhoneFrame>
  );
};

const PhoneFrame = ({ children, background, theme = 'light' }) => (
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
        width: PHONE_W + PHONE_BEZEL * 2,
        height: PHONE_H + PHONE_BEZEL * 2,
        borderRadius: 48,
        background: '#000',
        padding: PHONE_BEZEL,
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
      {/* data-mobile-theme scopes dark tokens to this phone only — not PHCIS web. */}
      <div
        data-mobile-theme={theme === 'dark' ? 'dark' : undefined}
        style={{
          width: PHONE_W,
          height: PHONE_H,
          borderRadius: 38,
          background,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          colorScheme: theme === 'dark' ? 'dark' : 'light',
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
