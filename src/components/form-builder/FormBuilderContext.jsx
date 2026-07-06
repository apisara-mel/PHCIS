import React, { createContext, useContext } from 'react';

const FormBuilderContext = createContext(null);

export const FormBuilderProvider = ({ value, children }) => (
  <FormBuilderContext.Provider value={value}>{children}</FormBuilderContext.Provider>
);

export const useFormBuilderContext = () => {
  const ctx = useContext(FormBuilderContext);
  if (!ctx) throw new Error('useFormBuilderContext must be used within FormBuilderProvider');
  return ctx;
};

export default FormBuilderContext;
