import React from 'react';
import ReactDOM from 'react-dom';
import { Helmet } from 'react-helmet';

import '@/index.css';
import App from '@/App';

const rootEl = document.getElementById('root');

/* Apply the persisted appearance (mode + theme) to <html> BEFORE first paint,
   so every page — including standalone surfaces that don't mount the profile
   menu — follows the choice and there's no light flash. SidebarProfileMenu
   still handles live changes while the app runs. */
try {
  const root = document.documentElement;
  const mode = window.localStorage.getItem('phcis.mode') || 'light';
  const theme = window.localStorage.getItem('phcis.theme') || 'default';
  const prefersDark = window.matchMedia
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = mode === 'dark' || (mode === 'system' && prefersDark);
  if (dark) root.setAttribute('data-mode', 'dark');
  else root.removeAttribute('data-mode');
  if (theme && theme !== 'default') root.setAttribute('data-brand', theme);
  else root.removeAttribute('data-brand');
  /* "ขนาดตัวอักษร" — remaps --type-size-* one step along the design.md scale. */
  const fontSize = window.localStorage.getItem('phcis.fontSize');
  if (fontSize === 'sm' || fontSize === 'lg') root.setAttribute('data-font-size', fontSize);
  else root.removeAttribute('data-font-size');
} catch (_e) { /* storage unavailable — fall back to light/default */ }

try {
  ReactDOM.render(
    <React.StrictMode>
      <Helmet
        defaultTitle='PHCIS'
        titleTemplate='%s | PHCIS'
      >
        <meta charSet='utf-8' />
      </Helmet>
      <App />
    </React.StrictMode>,
    rootEl,
  );
} catch (err) {
  console.error(err);
  if (rootEl) {
    rootEl.innerHTML = `<pre style="padding:24px;color:#7F1D1D;white-space:pre-wrap">${err.stack || err.message}</pre>`;
  }
}
