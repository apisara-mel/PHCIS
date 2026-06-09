import React from 'react';

/* MIH PageHeaderInfoPanel — Figma Appointment 1:38611 (PHCIS_Header_Info).
   White band flush under SubHeader (hero / user info). SubHeader must use
   flushSummaryCardsBelow when this panel is rendered. */

const PageHeaderInfoPanel = ({ children }) => (
  <section
    className='w-full flex flex-col shrink-0'
    style={{
      background: 'var(--surface-card-100)',
      borderTop: 'none',
      borderBottom: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
      boxShadow: 'var(--shadow-brand-drop-bottom-100)',
      paddingTop: 'var(--dim-space-0)',
      paddingLeft: 'var(--dim-space-600)',
      paddingRight: 'var(--dim-space-600)',
      paddingBottom: 'var(--dim-space-600)',
      gap: 'var(--dim-space-400)',
    }}
  >
    {children}
  </section>
);

export default PageHeaderInfoPanel;
