import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { TelemedConsultOverlay } from '@/pages/telemed/TelemedConsultPage';

/*
  Global Telemedicine call state. Mounted ABOVE the route <Switch> so the call
  (and its live media streams) survive route changes — the doctor can minimise
  the call to a floating window and keep recording in ระบบบันทึกการรักษา while
  the video call keeps running.

  useTelemedCall().start() opens the call as a full-screen overlay over the
  current page; minimise() shrinks it to a corner widget, revealing the page
  underneath so the doctor can work; close() ends it.
*/
const Ctx = createContext(null);

export const useTelemedCall = () => useContext(Ctx) || {
  active: false, minimized: false, start: () => {}, close: () => {}, minimize: () => {}, maximize: () => {},
};

export function TelemedCallProvider({ children }) {
  const [active, setActive] = useState(false);
  const [minimized, setMinimized] = useState(false);

  const start = useCallback(() => { setActive(true); setMinimized(false); }, []);
  const close = useCallback(() => { setActive(false); setMinimized(false); }, []);
  const minimize = useCallback(() => setMinimized(true), []);
  const maximize = useCallback(() => setMinimized(false), []);

  return (
    <Ctx.Provider value={{ active, minimized, start, close, minimize, maximize }}>
      {children}
      {active && (
        <TelemedConsultOverlay
          minimized={minimized}
          onMinimize={minimize}
          onMaximize={maximize}
          onClose={close}
        />
      )}
    </Ctx.Provider>
  );
}

/* Route target for /telemed — starts the global call overlay then renders
   nothing (the overlay is drawn by the provider above the router). Lets the
   call be opened via a direct URL as well as the floating button. */
export function TelemedRouteTrigger() {
  const { start } = useTelemedCall();
  useEffect(() => { start(); }, [start]);
  return null;
}
