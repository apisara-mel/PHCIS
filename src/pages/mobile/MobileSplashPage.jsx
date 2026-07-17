import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { MobileShell, useMobileApp } from '@/components/mobile';

/* BMA Health · Splash — Figma Mobile Application 2042:28039 (frame "Register
   Intro"). The first thing the app paints: brand seal + wordmark centred on the
   teal gradient, no chrome.

   It hands off on its own — a splash the user has to tap is not a splash. After
   SPLASH_MS it replaces (not pushes) itself so Back never lands here again:
     • signed in  → /m/home
     • otherwise  → /m/login
   Routing on isAuthed rather than always sending to /m/login avoids the
   "กำลังพาไปหน้าเข้าสู่ระบบ…" flash that MobileShell's auth gate would show. */

const SPLASH_MS = 2000;

/* Figma 2042:28040 — the one value CLAUDE.md exempts from tokens. Angle/stops
   verbatim from Figma; rgb(19,178,146) → #13B292, rgb(0,160,142) → #00A08E. */
const SPLASH_BG = 'linear-gradient(154.708deg, #13B292 0%, #00A08E 125.29%)';

const LOGO = '/images/office-health-logo.png';

const MobileSplashPage = () => {
  const history = useHistory();
  const { isAuthed } = useMobileApp();

  useEffect(() => {
    const id = setTimeout(() => {
      history.replace(isAuthed ? '/m/home' : '/m/login');
    }, SPLASH_MS);
    return () => clearTimeout(id);
  }, [history, isAuthed]);

  return (
    <MobileShell
      requireAuth={false}
      showStatusBar={false}
      showBottomNav={false}
      background={SPLASH_BG}
    >
      <div
        className='flex flex-col items-center justify-center overflow-hidden'
        style={{ height: '100%', width: '100%', gap: 'var(--dim-space-600, 24px)' }}
      >
        {/* Logo — 82px disc, 4px white ring (Figma 2042:28041). */}
        <div
          className='relative shrink-0 overflow-hidden'
          style={{
            width: 'var(--dim-size-1750, 82px)',
            height: 'var(--dim-size-1750, 82px)',
            borderRadius: 'var(--dim-radius-full, 9999px)',
            background: 'var(--surface-card-100, #FFFFFF)',
            border: 'var(--dim-stroke-400, 4px) solid var(--border-image-default, #FFFFFF)',
          }}
        >
          <img
            src={LOGO}
            alt='ตราสัญลักษณ์สำนักอนามัย กรุงเทพมหานคร'
            className='absolute inset-0 pointer-events-none'
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            draggable={false}
          />
        </div>

        {/* Wordmark — text style "display graphic5" (Figma 2042:28043). The line
            break is hard-coded, not width-driven: it sits between หน่วยงาน and
            จังหวัด and must not move with the viewport. */}
        <div
          className='flex flex-col items-center shrink-0 w-full'
          style={{ gap: 'var(--dim-space-150, 6px)' }}
        >
          <p
            className='w-full text-center'
            style={{
              margin: 0,
              fontFamily: 'var(--type-family-heading-graphic)',
              fontSize: 'var(--type-size-2xl, 24px)',
              fontWeight: 'var(--type-weight-bold, 700)',
              lineHeight: 1.25,
              color: 'var(--text-brandPrimary-on-brand, #FFFFFF)',
            }}
          >
            สำนักอนามัย
            <br />
            กรุงเทพมหานคร
          </p>
        </div>
      </div>
    </MobileShell>
  );
};

export default MobileSplashPage;
