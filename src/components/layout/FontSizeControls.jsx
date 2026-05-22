import React from 'react';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';

/* Touch target sizing.
   • DRAWER_TOUCH — 48 px (mobile Sidebar / off-canvas; thumb-friendly).
   • HEADER_TOUCH — 36 px square (tablet/iPad landscape inside the 64 px
     Header bar; finger-tap accuracy without making the header feel cramped). */
const DRAWER_TOUCH = { minWidth: 48, minHeight: 48, paddingLeft: 'var(--dim-space-200)', paddingRight: 'var(--dim-space-200)' };
const HEADER_TOUCH = { minWidth: 36, maxWidth: 36, paddingLeft: 'var(--dim-space-150)', paddingRight: 'var(--dim-space-150)' };

/** “ขนาดตัวอักษร” row.
 *
 * Variants:
 *   • `header` — <Header /> bar. Shows compact text-only buttons on `xl+`
 *     (laptop / desktop, where mouse precision makes 12 px hit targets fine)
 *     and switches to DS NeutralSubdueButton 36 px squares from `md` to
 *     `lg` (iPad portrait / landscape, where the row is finger-tapped).
 *   • `drawer` — mobile <Sidebar /> off-canvas. Always DS buttons at
 *     48 px touch targets per WCAG 2.5.5.
 */
const FontSizeControls = ({ className = '', variant = 'header' }) => {
  if (variant === 'drawer') {
    return (
      <div className={`flex flex-col flex-nowrap items-start justify-start gap-x-2 gap-y-2 text-sm ${className}`}>
        <span className='text-xs shrink-0 w-full sm:w-auto' style={{ color: 'var(--text-content-secondary)' }}>
          ขนาดตัวอักษร:
        </span>
        <div className='flex items-center gap-2'>
          <NeutralSubdueButton variant='outline' size='md' aria-label='ขนาดตัวอักษรเล็ก' style={DRAWER_TOUCH}>
            <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)' }}>ก</span>
          </NeutralSubdueButton>
          <NeutralSubdueButton variant='outline' size='md' aria-label='ขนาดตัวอักษรกลาง' style={DRAWER_TOUCH}>
            <span style={{ fontSize: 'var(--type-size-base)', fontWeight: 'var(--type-weight-medium)' }}>ก</span>
          </NeutralSubdueButton>
          <NeutralSubdueButton variant='outline' size='md' aria-label='ขนาดตัวอักษรใหญ่' style={DRAWER_TOUCH}>
            <span style={{ fontSize: '1.125rem', fontWeight: 'var(--type-weight-medium)' }}>ก</span>
          </NeutralSubdueButton>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 xl:gap-3 text-sm text-ink-secondary ${className}`}>
      <span className='text-xs shrink-0'>ขนาดตัวอักษร:</span>

      {/* md–lg (iPad portrait + landscape): DS NeutralSubdueButton, 36 px
          square — touch-friendly. Hidden on xl+. */}
      <div className='flex items-center gap-1.5 xl:hidden'>
        <NeutralSubdueButton variant='outline' size='sm' aria-label='ขนาดตัวอักษรเล็ก' style={HEADER_TOUCH}>
          <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)' }}>ก</span>
        </NeutralSubdueButton>
        <NeutralSubdueButton variant='outline' size='sm' aria-label='ขนาดตัวอักษรกลาง' style={HEADER_TOUCH}>
          <span style={{ fontSize: 'var(--type-size-base)', fontWeight: 'var(--type-weight-medium)' }}>ก</span>
        </NeutralSubdueButton>
        <NeutralSubdueButton variant='outline' size='sm' aria-label='ขนาดตัวอักษรใหญ่' style={HEADER_TOUCH}>
          <span style={{ fontSize: '1.125rem', fontWeight: 'var(--type-weight-medium)' }}>ก</span>
        </NeutralSubdueButton>
      </div>

      {/* xl+ (laptop/desktop): compact text-only — saves header space when
          a mouse pointer is the primary input. */}
      <div className='hidden xl:flex items-center gap-3'>
        <button type='button' aria-label='ขนาดตัวอักษรเล็ก' className='text-sm hover:text-brand-500'>ก</button>
        <button type='button' aria-label='ขนาดตัวอักษรกลาง' className='text-base hover:text-brand-500'>ก</button>
        <button type='button' aria-label='ขนาดตัวอักษรใหญ่' className='text-lg hover:text-brand-500'>ก</button>
      </div>
    </div>
  );
};

export default FontSizeControls;
