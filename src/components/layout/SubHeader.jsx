import React from 'react';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';

/* MIH SubHeader — design-system page sub-header.
   Shares the SAME 1px brand-quaternary bottom border and brand-tinted
   drop-shadow as the top-level Header (Topbar). Used directly under
   Header for in-page action rows like:
     • "ระบบงานเวชระเบียน" + การคัดกรอง / อ่านบัตร  (RegistrationQueuePage)
     • back ← "ข้อมูลผู้รับบริการ" + 4 action buttons  (FormShell)

   Back button — Figma PHCIS-ALL 2373:119045 (Title+Button · node 96:4343):
     Neutral Subdue Button · outline · md · leading chevron_left · "กลับ"
     https://www.figma.com/design/h0fghZdYHA7HRJcjmRsUmF/PHCIS-ALL?node-id=2373-119045

   Visual contract — exactly mirrors layout/Header.jsx:
     border-bottom : 1px var(--border-brandPrimary-quaternary)  (brand-p100)
     box-shadow    : var(--shadow-header)                       (brand-tinted)
     background    : var(--surface-navigation-default)          (white)
     padding       : var(--dim-space-600) 24 / var(--dim-space-400) 16

   Props:
     title    — required label (rendered bold/heading family on the left)
     onBack   — when provided, renders the Figma back button before the title
     backLabel — label of the back button (default 'กลับ')
     children — right-aligned action slot (gap-12 between siblings)
     flushSummaryCardsBelow — when true, removes bottom border + drop-shadow so
       SummaryCardsBar can sit flush with no visible “top stroke” on the panel.
     hideBottomBorder — when true, omits only the 1px bottom border (keeps shadow). */

const SubHeader = ({ title, onBack, backLabel = 'กลับ', children, flushSummaryCardsBelow = false, hideBottomBorder = false }) => (
  <div
    className='flex items-center w-full shrink-0'
    style={{
      gap: 'var(--dim-space-400)',
      paddingLeft: 'var(--dim-space-600)',
      paddingRight: 'var(--dim-space-600)',
      paddingTop: 'var(--dim-space-400)',
      paddingBottom: 'var(--dim-space-400)',
      background: 'var(--surface-navigation-default)',
      /* Same chrome as layout/Header — see index.css §header */
      borderBottom: flushSummaryCardsBelow || hideBottomBorder
        ? 'none'
        : 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
      /* Flush SummaryCardsBar: omit shadow + bottom border so no line sits on the summary “top edge”. */
      boxShadow: flushSummaryCardsBelow ? 'none' : 'var(--shadow-header)',
    }}
  >
    {onBack && (
      <NeutralSubdueButton
        variant='outline'
        size='md'
        leadingIcon='chevron_left'
        onClick={onBack}
      >
        {backLabel}
      </NeutralSubdueButton>
    )}
    <span style={{
      color: 'var(--text-content-default)',
      fontFamily: 'var(--type-family-heading-content)',
      fontWeight: 'var(--type-weight-bold)',
      fontSize: 'var(--type-size-base)',
      lineHeight: 1.5,
    }}>
      {title}
    </span>
    <div className='flex-1' />
    {children && (
      <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-300)' }}>
        {children}
      </div>
    )}
  </div>
);

export default SubHeader;
