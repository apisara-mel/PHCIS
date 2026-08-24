import React, { createContext, useContext } from 'react';

/* Page-title rows use the existing `sm` button alias regardless of the size
   requested by a page. Keeping this as context lets compound actions (split
   buttons, role switchers, consent actions) inherit the same density without
   reaching into their internal markup. */
const ButtonSizeAliasContext = createContext(null);

export const ButtonSizeAliasProvider = ({ size, children }) => (
  <ButtonSizeAliasContext.Provider value={size}>
    {children}
  </ButtonSizeAliasContext.Provider>
);

export const useAliasedButtonSize = (requestedSize) => {
  const alias = useContext(ButtonSizeAliasContext);
  return alias || requestedSize;
};

export default ButtonSizeAliasContext;
