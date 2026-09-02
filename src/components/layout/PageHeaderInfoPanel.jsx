import React from 'react';

/* MIH PageHeaderInfoPanel — Figma Appointment 1:38611 (PHCIS_Header_Info).
   White band flush under SubHeader (hero / user info). SubHeader must use
   flushSummaryCardsBelow when this panel is rendered.

   `--header-morph` (0→1) on `:root` — set by HeaderMorphRoot from window
   scroll. Do NOT set a local override here or morph styles freeze at 0. */

/* `flat` — สำหรับหน้าที่วางการ์ดที่มีพื้น/เงา/เส้นขอบของตัวเองไว้ในแผงนี้
   (เช่น PatientCard) แผงจะโปร่งใสและไม่มี padding เพื่อไม่ให้เกิดการ์ดขาว
   ซ้อนหลังการ์ดอีกชั้น (มติผู้ใช้ 3 ก.ย. 69) */
const PageHeaderInfoPanel = ({ children, dense = false, flat = false }) => (
  <section
    className='w-full flex flex-col shrink-0'
    style={{
      background: flat ? 'transparent' : 'var(--surface-card-100)',
      borderTop: 'none',
      borderBottom: flat ? 'none' : 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
      boxShadow: flat ? 'none' : 'var(--shadow-brand-drop-bottom-100)',
      overflow: dense ? 'hidden' : undefined,
      paddingTop: dense
        ? 'calc(var(--dim-space-0) + var(--dim-space-200) * var(--header-morph))'
        : 'var(--dim-space-0)',
      paddingLeft: flat
        ? 'var(--dim-space-0)'
        : 'calc(var(--dim-space-600) + (var(--dim-space-400) - var(--dim-space-600)) * var(--header-morph))',
      paddingRight: flat
        ? 'var(--dim-space-0)'
        : 'calc(var(--dim-space-600) + (var(--dim-space-400) - var(--dim-space-600)) * var(--header-morph))',
      paddingBottom: flat
        ? 'var(--dim-space-0)'
        : 'calc(var(--dim-space-600) + (var(--dim-space-200) - var(--dim-space-600)) * var(--header-morph))',
      gap:
        'calc(var(--dim-space-400) + (var(--dim-space-0) - var(--dim-space-400)) * var(--header-morph))',
    }}
  >
    {children}
  </section>
);

export default PageHeaderInfoPanel;
