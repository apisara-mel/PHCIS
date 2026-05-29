import React from 'react';

/* MIH Mobile · Input.
   16px body size is the iOS Safari "no auto-zoom on focus" threshold —
   anything <16 triggers the viewport zoom and breaks the layout.
   All visual values alias `--mobile-input-*` tokens (design.md §7.2). */
export const MobileInput = React.forwardRef(({ style, ...props }, ref) => (
  <input
    ref={ref}
    {...props}
    style={{
      width: '100%',
      minHeight: 'var(--mobile-input-height, 48px)',
      padding: '0 var(--mobile-input-padding-x, 16px)',
      background: 'var(--surface-content-default, #FFFFFF)',
      border: '1.5px solid var(--border-content-tertiary, #E1E3E5)',
      borderRadius: 'var(--mobile-input-radius, 12px)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--mobile-input-type-size, 16px)',
      color: 'var(--text-content-primary)',
      outline: 'none',
      ...(style || {}),
    }}
  />
));

MobileInput.displayName = 'MobileInput';

export default MobileInput;
