import React, { createContext, useContext } from 'react';
import { useHeaderAutoHideState } from '@/hooks/useHeaderAutoHide';

const HeaderAutoHideContext = createContext(null);

/** Mount once inside `<Router>` — drives header + sticky-footer collapse app-wide. */
export function HeaderAutoHideProvider({ children }) {
  const value = useHeaderAutoHideState();
  return (
    <HeaderAutoHideContext.Provider value={value}>
      {children}
    </HeaderAutoHideContext.Provider>
  );
}

export function useHeaderAutoHide() {
  return useContext(HeaderAutoHideContext);
}

export default HeaderAutoHideContext;
