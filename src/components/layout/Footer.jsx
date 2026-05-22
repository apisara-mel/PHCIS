import React from 'react';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import Pagination from '@/components/pagination/Pagination';

/* MIH Footer — Figma "Footer" (node 1:2629).

   Property panel (matches Figma 1:1):
     • Type            'No' | 'with BTN' | 'with Pagination'
     • Show Button 1   bool — rightmost (primary brand fill, with leading icon)
     • Show Button 2   bool — middle (outline subdue)
     • Show Button 3   bool — leftmost (outline subdue)
     • Show Auto Save  bool — left-side draft indicator (green dot + status text)

   Variants:
     • 'No'              — legal container only (56h · © + Privacy + Terms)
     • 'with BTN'        — key-action row (auto-save + up to 3 buttons) + legal row
     • 'with Pagination' — pagination row ("X-Y of Z" + page numbers) + legal row

   All buttons alias canonical components (BrandPrimaryButton ·
   BrandSubdueButton); pagination aliases <Pagination>. Visuals retint via
   [data-brand] through --surface-navigation-default / --border-*-quaternary
   / --primaryshadow-* tokens. */

const Footer = ({
  type = 'No',
  /* Positioning — when true the shell pins to bottom of its scroll container
     via position: sticky. Useful for form pages where the action row needs
     to stay visible. Off by default — page chrome typically lays the
     footer at the end of the flow. */
  sticky = false,
  /* with BTN slots */
  showAutoSave = true,
  autoSaveText = 'ร่างแบบฟอร์ม (บันทึกล่าสุด: 2 นาทีที่แล้ว)',
  /* Each button slot accepts EITHER a `xxxIcon` (leading) OR a
     `xxxTrailingIcon` (icon after the label). Per Figma "Brand Button"
     (231:29), forward-action labels like "ถัดไป" put the chevron / arrow
     on the trailing side; back actions keep the icon leading. No default
     icon — callers pass exactly the slot they want. */
  showButton1 = true, button1Label = 'Button', button1Icon, button1TrailingIcon, onButton1Click, button1Disabled = false,
  showButton2 = true, button2Label = 'Button', button2Icon, button2TrailingIcon, onButton2Click, button2Disabled = false,
  showButton3 = true, button3Label = 'Button', button3Icon, button3TrailingIcon, onButton3Click, button3Disabled = false,
  /* with Pagination slots */
  paginationLabel = 'แสดง 1-20 จาก 248 รายการ',
  currentPage = 1,
  pageCount = 20,
  onPageChange,
  /* Legal row */
  copyright = '© 2026 ศูนย์บริการสาธารณสุข สำนักอนามัย กรุงเทพมหานคร',
  links = [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
  ],
  className = '',
  style = {},
}) => {
  const isNo            = type === 'No';
  const isWithBtn       = type === 'with BTN';
  const isWithPagi      = type === 'with Pagination';

  const LegalRow = (
    <div
      className='w-full flex items-center shrink-0'
      style={{
        minHeight: 56,
        background: 'var(--surface-navigation-default)',
        /* The top divider only appears when stacked under another row.
           Stand-alone (type=No) → no inner divider; the outer top border
           on the <footer> shell already separates it from page content. */
        borderTop: isNo
          ? 'none'
          : 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
        paddingTop: 14,
        paddingBottom: 14,
        paddingLeft: 'var(--dim-space-600)',
        paddingRight: 'var(--dim-space-600)',
        gap: 'var(--dim-space-600)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        lineHeight: 1.5,
        color: 'var(--text-content-secondary)',
      }}
    >
      <span className='flex-1 min-w-0 truncate'>{copyright}</span>
      {links.map((l, i) => (
        <a
          key={i}
          href={l.href}
          className='whitespace-nowrap hover:underline'
          style={{ color: 'inherit', textDecoration: 'none' }}
        >
          {l.label}
        </a>
      ))}
    </div>
  );

  return (
    <footer
      className={`w-full flex flex-col shrink-0 ${className}`}
      style={{
        background: 'var(--surface-navigation-default)',
        borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
        /* Soft brand-tinted shadow above the footer — retints via [data-brand]. */
        boxShadow: '0 -1px 2px var(--PrimaryShadow-600, rgba(8, 167, 104, 0.08))',
        ...(sticky ? { position: 'sticky', bottom: 'var(--dim-space-0)', zIndex: 40 } : null),
        ...style,
      }}
    >
      {/* Row 1 (variant-dependent) — Key actions or Pagination */}
      {isWithBtn && (
        <div
          className='w-full flex items-center justify-end'
          style={{
            paddingTop: 'var(--dim-space-400)',
            paddingBottom: 'var(--dim-space-400)',
            paddingLeft: 'var(--dim-space-600)',
            paddingRight: 'var(--dim-space-600)',
            gap: 'var(--dim-space-600)',
          }}
        >
          {showAutoSave && (
            <div
              className='flex-1 min-w-0 flex items-center'
              style={{ gap: 'var(--dim-space-200)' }}
              role='status'
              aria-live='polite'
            >
              <span
                aria-hidden
                style={{
                  width: 8, height: 8, borderRadius: 'var(--dim-radius-100)', flexShrink: 0,
                  background: 'var(--surface-positive-secondary, #A2EDDE)',
                  opacity: 0.74,
                }}
              />
              <span
                style={{
                  color: 'var(--text-content-secondary)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                  lineHeight: 1.5,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {autoSaveText}
              </span>
            </div>
          )}
          {/* When auto-save is hidden, push the buttons to the right via
              an empty 1fr spacer so they don't recentre. */}
          {!showAutoSave && <div className='flex-1' />}
          <div className='inline-flex items-center shrink-0' style={{ gap: 'var(--dim-space-300)' }}>
            {showButton3 && (
              <BrandSubdueButton
                variant='outline' size='lg'
                leadingIcon={button3Icon}
                trailingIcon={button3TrailingIcon}
                disabled={button3Disabled}
                onClick={onButton3Click}
              >
                {button3Label}
              </BrandSubdueButton>
            )}
            {showButton2 && (
              <BrandSubdueButton
                variant='outline' size='lg'
                leadingIcon={button2Icon}
                trailingIcon={button2TrailingIcon}
                disabled={button2Disabled}
                onClick={onButton2Click}
              >
                {button2Label}
              </BrandSubdueButton>
            )}
            {showButton1 && (
              <BrandPrimaryButton
                variant='fill'
                size='lg'
                leadingIcon={button1Icon}
                trailingIcon={button1TrailingIcon}
                disabled={button1Disabled}
                onClick={onButton1Click}
              >
                {button1Label}
              </BrandPrimaryButton>
            )}
          </div>
        </div>
      )}
      {isWithPagi && (
        <div
          className='w-full flex items-center'
          style={{
            paddingTop: 'var(--dim-space-400)',
            paddingBottom: 'var(--dim-space-400)',
            paddingLeft: 'var(--dim-space-600)',
            paddingRight: 'var(--dim-space-600)',
            gap: 'var(--dim-space-600)',
          }}
        >
          <span
            className='flex-1 min-w-0'
            style={{
              color: 'var(--text-content-secondary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              lineHeight: 1.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {paginationLabel}
          </span>
          <Pagination
            currentPage={currentPage}
            pageCount={pageCount}
            onPageChange={onPageChange}
          />
        </div>
      )}

      {/* Row 2 — Legal container (always present) */}
      {LegalRow}
    </footer>
  );
};

export default Footer;
