import React from 'react';

/* MIH Mobile · Field.
   Wraps an input with label, required mark, hint, and error.
   Pairs with MobileInput / MobileTextarea / MobileSelect (any control
   passed as children). */
export const MobileField = ({ label, hint, error, children, required }) => (
  <label style={{ display: 'block' }}>
    {label && (
      <span style={{
        display: 'block',
        marginBottom: 'var(--dim-space-100, 4px)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-medium, 500)',
        color: 'var(--text-content-secondary, #565D6D)',
      }}>
        {label}
        {required && <span style={{ color: 'var(--text-warning-default, #D43838)' }}> *</span>}
      </span>
    )}
    {children}
    {hint && !error && (
      <span style={{
        display: 'block',
        marginTop: 'var(--dim-space-100, 4px)',
        fontSize: 'var(--type-size-xs, 12px)',
        color: 'var(--text-content-tertiary, #858C92)',
      }}>{hint}</span>
    )}
    {error && (
      <span style={{
        display: 'block',
        marginTop: 'var(--dim-space-100, 4px)',
        fontSize: 'var(--type-size-xs, 12px)',
        color: 'var(--text-warning-default, #D43838)',
      }}>{error}</span>
    )}
  </label>
);

export default MobileField;
