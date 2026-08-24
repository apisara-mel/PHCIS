import React from 'react';

/* MIH PageHeaderInfoPanel — Figma Appointment 1:38611 (PHCIS_Header_Info).
   White band flush under SubHeader (hero / user info). SubHeader must use
   flushSummaryCardsBelow when this panel is rendered.

   `--header-morph` (0→1) on `:root` — set by HeaderMorphRoot from window
   scroll. Do NOT set a local override here or morph styles freeze at 0. */

const PageHeaderInfoPanel = ({ children, dense = false }) => (
  <section
    className='w-full flex flex-col shrink-0'
    style={{
      background: 'var(--surface-card-100)',
      borderTop: 'none',
      borderBottom: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
      boxShadow: 'var(--shadow-brand-drop-bottom-100)',
      overflow: dense ? 'hidden' : undefined,
      paddingTop: dense
        ? 'calc(var(--dim-space-0) + var(--dim-space-200) * var(--header-morph))'
        : 'var(--dim-space-0)',
      paddingLeft:
        'calc(var(--dim-space-600) + (var(--dim-space-400) - var(--dim-space-600)) * var(--header-morph))',
      paddingRight:
        'calc(var(--dim-space-600) + (var(--dim-space-400) - var(--dim-space-600)) * var(--header-morph))',
      paddingBottom:
        'calc(var(--dim-space-600) + (var(--dim-space-200) - var(--dim-space-600)) * var(--header-morph))',
      gap:
        'calc(var(--dim-space-400) + (var(--dim-space-0) - var(--dim-space-400)) * var(--header-morph))',
    }}
  >
    {children}
  </section>
);

export default PageHeaderInfoPanel;
