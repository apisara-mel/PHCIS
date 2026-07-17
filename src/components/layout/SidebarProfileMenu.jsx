import React, { useState, useEffect } from 'react';
import ProfilePopover from '@/components/popup/ProfilePopover';
import SettingsModal from '@/components/popup/SettingsModal';

/* MIH · Shared sidebar profile menu.
   The SINGLE source of the profile/setting popover used by EVERY system shell
   (PHCIS <Sidebar>, System Hub, ระบบจัดการตารางเวร, …). It bundles:
     • <ProfilePopover>  — ภาษา · โหมดและธีม · เปลี่ยนรหัสผ่าน · แจ้งเตือน · Log out
     • <SettingsModal>   — Mode (light/dark) + Theme (brand keys)

   Theme/mode are GLOBAL: theme writes <html data-brand="..."> so every semantic
   token aliased through --brand-p* re-tints atomically across the WHOLE app, no
   matter which system opened the menu. Both prefs persist to localStorage under
   the shared 'phcis.*' keys, so the choice survives navigation between systems.

   Props: open · anchorRect · anchorRef · onClose · onLogout. */

const readPref = (k, fallback) => {
  if (typeof window === 'undefined') return fallback;
  try { return window.localStorage.getItem(k) ?? fallback; } catch { return fallback; }
};

export default function SidebarProfileMenu({ open, anchorRect, anchorRef, onClose, onLogout }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [appliedMode,  setAppliedMode]  = useState(() => readPref('phcis.mode',  'light'));
  const [appliedTheme, setAppliedTheme] = useState(() => readPref('phcis.theme', 'default'));

  // Apply persisted theme on mount (and whenever it changes) — affects the
  // whole document, so the tint is consistent across every system.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (appliedTheme && appliedTheme !== 'default') {
      document.documentElement.setAttribute('data-brand', appliedTheme);
    } else {
      document.documentElement.removeAttribute('data-brand');
    }
  }, [appliedTheme]);

  // Apply Light/Dark/System mode → <html data-mode="dark">. 'system' follows
  // the OS prefers-color-scheme and live-updates while selected. The dark
  // token overrides live under [data-mode="dark"] in index.css.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const root = document.documentElement;
    const setDark = (on) => {
      if (on) root.setAttribute('data-mode', 'dark');
      else root.removeAttribute('data-mode');
    };
    if (appliedMode === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const sync = () => setDark(mq.matches);
      sync();
      if (mq.addEventListener) mq.addEventListener('change', sync);
      else mq.addListener(sync);
      return () => {
        if (mq.removeEventListener) mq.removeEventListener('change', sync);
        else mq.removeListener(sync);
      };
    }
    setDark(appliedMode === 'dark');
    return undefined;
  }, [appliedMode]);

  const applySettings = ({ mode, theme }) => {
    setAppliedMode(mode);
    if (theme !== undefined) setAppliedTheme(theme);
    try {
      window.localStorage.setItem('phcis.mode', mode);
      if (theme !== undefined) window.localStorage.setItem('phcis.theme', theme);
    } catch (_e) { /* storage unavailable — non-fatal */ }
    setSettingsOpen(false);
  };

  const handleSelect = (key) => {
    if (key === 'theme') {
      setSettingsOpen(true);
    } else if (key === 'logout') {
      onClose && onClose();
      if (onLogout) onLogout();
    }
  };

  return (
    <>
      <ProfilePopover
        open={open}
        anchorRect={anchorRect}
        anchorRef={anchorRef}
        onClose={onClose}
        onSelect={handleSelect}
      />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onApply={applySettings}
        initialMode={appliedMode}
        initialTheme={appliedTheme}
      />
    </>
  );
}
