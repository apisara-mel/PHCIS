import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/* MIH Spotlight — TOR Compliance Checklist deep-link helper.

   Reads `?spotlight=<key>&label=<text>` from the URL on every route change.
   When a key is present:
     1. Polls the DOM up to 4 s for an element matching:
          - `[data-spotlight="<key>"]`  (preferred)
          - `#<key>`                    (fallback)
     2. Scrolls the match into view, pulses a brand-tinted glow on it
        (CSS class `.mih-spotlight` defined in src/index.css).
     3. Renders a corner banner showing the label so the visitor knows
        which TOR requirement led them here.

   The banner stays until the visitor clicks ✕ or navigates away. The glow
   fades after 6 s but the banner persists so it can still serve as a
   visual reference for the rest of the session.

   Mounted inside App.jsx so it's available on every routed page. Costs
   nothing when the URL has no `spotlight` param.                         */

const Spotlight = () => {
  const { search, pathname } = useLocation();
  const [active, setActive] = useState(null);

  useEffect(() => {
    let target = null;
    let label = '';
    try {
      const params = new URLSearchParams(search || '');
      target = params.get('spotlight');
      label = params.get('label') || '';
    } catch (e) {
      return undefined;
    }
    if (!target) {
      setActive(null);
      return undefined;
    }

    /* `CSS.escape` is unavailable in some embedded webviews. Fall back
       to a manual sanitiser that keeps only the safe subset we use
       (alphanumerics, dash, underscore, dot) so the attribute selector
       never throws even if the param contains punctuation. */
    const safeAttr = (typeof CSS !== 'undefined' && CSS.escape)
      ? CSS.escape(target)
      : String(target).replace(/[^a-zA-Z0-9_\-.]/g, '');

    /* React routes mount async — element may not be in DOM yet on the
       very first useEffect tick. Poll for up to 4 s before giving up.   */
    let elapsed = 0;
    let touchedEl = null;
    const id = setInterval(() => {
      elapsed += 100;
      let el = null;
      try {
        el = document.querySelector(`[data-spotlight="${safeAttr}"]`)
          || document.getElementById(target);
      } catch (e) {
        clearInterval(id);
        return;
      }
      if (el) {
        clearInterval(id);
        setActive({ target, label, found: true });
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (e) {
          try { el.scrollIntoView(); } catch (e2) { /* noop */ }
        }
        el.classList.add('mih-spotlight');
        touchedEl = el;
        setTimeout(() => {
          try { el.classList.remove('mih-spotlight'); } catch (e) { /* noop */ }
        }, 6000);
      } else if (elapsed > 4000) {
        clearInterval(id);
        setActive({ target, label, found: false });
      }
    }, 100);

    return () => {
      clearInterval(id);
      if (touchedEl) {
        try { touchedEl.classList.remove('mih-spotlight'); } catch (e) { /* noop */ }
      }
    };
  }, [search, pathname]);

  if (!active) return null;
  return (
    <div
      role='status'
      aria-live='polite'
      style={{
        position: 'fixed',
        top: 84,
        right: 24,
        zIndex: 9999,
        maxWidth: 380,
        background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
        border: '2px solid var(--border-brandPrimary-quaternary, #B1E6CD)',
        borderRadius: 'var(--dim-radius-450, 14px)',
        padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)',
        boxShadow: 'var(--shadow-brand-drop-bottom-200)',
        fontFamily: 'var(--type-family-body)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--dim-space-200, 8px)',
        animation: 'mih-spotlight-slidein 220ms cubic-bezier(0.32, 0.72, 0, 1)',
      }}
    >
      <span aria-hidden style={{ fontSize: 20, lineHeight: 1.1, flexShrink: 0 }}>
        📍
      </span>
      <div style={{ flex: '1 1 auto', minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--type-size-xs, 12px)',
            color: 'var(--text-content-tertiary, #858C92)',
            fontWeight: 'var(--type-weight-bold, 700)',
            letterSpacing: 0.3,
            textTransform: 'uppercase',
          }}
        >
          TOR Spotlight
        </p>
        <p
          style={{
            margin: '2px 0 0',
            fontSize: 'var(--type-size-base, 16px)',
            color: 'var(--text-brandPrimary-default, #007549)',
            fontWeight: 'var(--type-weight-bold, 700)',
            lineHeight: 1.35,
          }}
        >
          {active.label || active.target}
        </p>
        {!active.found && (
          <p
            style={{
              margin: '6px 0 0',
              fontSize: 'var(--type-size-xs, 12px)',
              color: 'var(--text-content-secondary, #565D6D)',
            }}
          >
            ไม่พบ element <code style={{ fontFamily: 'ui-monospace, monospace' }}>{active.target}</code> ในหน้านี้
          </p>
        )}
      </div>
      <button
        type='button'
        onClick={() => setActive(null)}
        aria-label='ปิด TOR Spotlight'
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 4,
          color: 'var(--text-content-tertiary, #858C92)',
          fontSize: 18,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
};

export default Spotlight;
