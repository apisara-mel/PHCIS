import React, { useEffect, useState } from 'react';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';

/* Touch target sizing.
   • DRAWER_TOUCH — 48 px (mobile Sidebar / off-canvas; thumb-friendly).
   • HEADER_TOUCH — 36 px square (tablet/iPad landscape inside the 64 px
     Header bar; finger-tap accuracy without making the header feel cramped). */
const DRAWER_TOUCH = { minWidth: 48, minHeight: 48, paddingLeft: 'var(--dim-space-200)', paddingRight: 'var(--dim-space-200)' };
const HEADER_TOUCH = { minWidth: 36, maxWidth: 36, paddingLeft: 'var(--dim-space-150)', paddingRight: 'var(--dim-space-150)' };

export const FONT_SIZE_KEY = 'phcis.fontSize';
const SIZES = ['sm', 'base', 'lg'];

export const readFontSize = () => {
  if (typeof window === 'undefined') return 'base';
  try {
    const v = window.localStorage.getItem(FONT_SIZE_KEY);
    return SIZES.includes(v) ? v : 'base';
  } catch { return 'base'; }
};

/* Paint the choice on <html> — `[data-font-size]` remaps every --type-size-*
   one step along the design.md type scale (see src/index.css), so all content
   sized through the token follows. 'base' = default → no attribute.
   Broadcasts so any other mounted control (header + mobile drawer) syncs. */
export const applyFontSize = (size) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (size && size !== 'base') root.setAttribute('data-font-size', size);
  else root.removeAttribute('data-font-size');
  try { window.localStorage.setItem(FONT_SIZE_KEY, size); } catch { /* storage off */ }
  window.dispatchEvent(new CustomEvent('mih:font-size', { detail: size }));
};

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
  const [size, setSize] = useState(readFontSize);

  /* Keep every mounted instance (header + drawer) on the same choice. */
  useEffect(() => {
    const sync = (e) => setSize(e.detail);
    window.addEventListener('mih:font-size', sync);
    return () => window.removeEventListener('mih:font-size', sync);
  }, []);

  const pick = (next) => { setSize(next); applyFontSize(next); };

  /* Selected glyph gets brand ink + bold so the active step is obvious. */
  const glyph = (s, fontSize) => ({
    fontSize,
    fontWeight: size === s ? 'var(--type-weight-bold)' : 'var(--type-weight-medium)',
    color: size === s ? 'var(--text-brandPrimary-default)' : 'inherit',
  });

  if (variant === 'drawer') {
    return (
      <div className={`flex flex-col flex-nowrap items-start justify-start gap-x-2 gap-y-2 text-sm ${className}`}>
        <span className='text-xs shrink-0 w-full sm:w-auto' style={{ color: 'var(--text-content-secondary)' }}>
          ขนาดตัวอักษร:
        </span>
        <div className='flex items-center gap-2' role='radiogroup' aria-label='ขนาดตัวอักษร'>
          {SIZES.map((s) => (
            <NeutralSubdueButton
              key={s}
              variant={size === s ? 'fill' : 'outline'}
              size='md'
              aria-label={`ขนาดตัวอักษร${s === 'sm' ? 'เล็ก' : s === 'base' ? 'กลาง' : 'ใหญ่'}`}
              aria-pressed={size === s}
              onClick={() => pick(s)}
              style={DRAWER_TOUCH}
            >
              <span style={{ fontSize: `var(--type-size-${s === 'lg' ? 'lg' : s})`, fontWeight: 'var(--type-weight-medium)' }}>ก</span>
            </NeutralSubdueButton>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 xl:gap-3 text-sm text-ink-secondary ${className}`}>
      <span className='text-xs shrink-0'>ขนาดตัวอักษร:</span>

      {/* md–lg (iPad portrait + landscape): DS NeutralSubdueButton, 36 px
          square — touch-friendly. Hidden on xl+. */}
      <div className='flex items-center gap-1.5 xl:hidden' role='radiogroup' aria-label='ขนาดตัวอักษร'>
        {SIZES.map((s) => (
          <NeutralSubdueButton
            key={s}
            variant={size === s ? 'fill' : 'outline'}
            size='sm'
            aria-label={`ขนาดตัวอักษร${s === 'sm' ? 'เล็ก' : s === 'base' ? 'กลาง' : 'ใหญ่'}`}
            aria-pressed={size === s}
            onClick={() => pick(s)}
            style={HEADER_TOUCH}
          >
            <span style={{ fontSize: `var(--type-size-${s === 'lg' ? 'lg' : s})`, fontWeight: 'var(--type-weight-medium)' }}>ก</span>
          </NeutralSubdueButton>
        ))}
      </div>

      {/* xl+ (laptop/desktop): compact text-only — saves header space when
          a mouse pointer is the primary input. */}
      <div className='hidden xl:flex items-center gap-3' role='radiogroup' aria-label='ขนาดตัวอักษร'>
        <button type='button' aria-label='ขนาดตัวอักษรเล็ก' aria-pressed={size === 'sm'}
          onClick={() => pick('sm')} className='hover:text-brand-500' style={glyph('sm', 'var(--type-size-sm)')}>ก</button>
        <button type='button' aria-label='ขนาดตัวอักษรกลาง' aria-pressed={size === 'base'}
          onClick={() => pick('base')} className='hover:text-brand-500' style={glyph('base', 'var(--type-size-base)')}>ก</button>
        <button type='button' aria-label='ขนาดตัวอักษรใหญ่' aria-pressed={size === 'lg'}
          onClick={() => pick('lg')} className='hover:text-brand-500' style={glyph('lg', 'var(--type-size-lg)')}>ก</button>
      </div>
    </div>
  );
};

export default FontSizeControls;
