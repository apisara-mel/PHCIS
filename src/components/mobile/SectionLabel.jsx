import React from 'react';

/* MIH Mobile · SectionLabel.
   Bold sm label with optional right-aligned action (usually a "ดูทั้งหมด"
   text link). Sits above content blocks inside a screen body. */
export const MobileSectionLabel = ({ children, action }) => (
  <div
    className='flex items-center justify-between'
    style={{ marginBottom: 'var(--dim-space-200, 8px)' }}
  >
    <span style={{
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-sm, 14px)',
      fontWeight: 'var(--type-weight-bold, 700)',
      color: 'var(--text-content-primary)',
    }}>{children}</span>
    {action}
  </div>
);

export default MobileSectionLabel;
