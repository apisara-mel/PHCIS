import React from 'react';
import { useLocation } from 'react-router-dom';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import CreateConsentRequestHeaderAction from '@/components/consent/CreateConsentRequestHeaderAction';
import { canCreateConsentRequest } from '@/data/consentPermissions';
import { shouldShowCreateConsentRequestAction } from '@/data/consentRequestActionVisibility';
import { morphSubHeaderPaddingStyle, morphTitleStyle } from '@/components/layout/headerMorphStyles';
import { MIH_CHROME_MORPH_SUBHEADER } from '@/components/layout/wizardChromeMorphStyles';

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
     afterTitle — optional node rendered immediately after the title (e.g. badges)
     onBack   — when provided, renders the Figma back button before the title
     backLabel — label of the back button (default 'กลับ')
     children — right-aligned action slot (gap-12 between siblings)
     flushSummaryCardsBelow — when true, removes bottom border + drop-shadow so
       SummaryCardsBar can sit flush with no visible “top stroke” on the panel.
     hideBottomBorder — when true, omits only the 1px bottom border (keeps shadow). */

const SubHeader = ({ title, afterTitle, onBack, backLabel = 'กลับ', children, flushSummaryCardsBelow = false, hideBottomBorder = false }) => {
  const { pathname } = useLocation();
  const showConsentAction = canCreateConsentRequest() && shouldShowCreateConsentRequestAction(pathname);
  const hasActions = children || showConsentAction;

  return (
  <div
    className={`flex items-start w-full shrink-0 ${MIH_CHROME_MORPH_SUBHEADER}`}
    style={{
      gap: 'var(--dim-space-400)',
      paddingLeft: 'var(--dim-space-600)',
      paddingRight: 'var(--dim-space-600)',
      ...morphSubHeaderPaddingStyle,
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
    {/* Match md button height so title stays on the same vertical axis as
        the action row (items-center on a wrapping button group would pull
        the title down to the mid-point of multiple rows). */}
    <span
      className='shrink-0 inline-flex items-center'
      style={{
        color: 'var(--text-content-default)',
        fontFamily: 'var(--type-family-heading-content)',
        fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
        lineHeight: 1.5,
        fontSize: 'var(--type-size-title, var(--type-size-base, 16px))',
        whiteSpace: 'nowrap',
        minHeight: 'var(--dim-size-800, 40px)',
        ...morphTitleStyle,
      }}
    >
      {title}
    </span>
    {afterTitle != null && afterTitle !== false && (
      <div className='shrink-0 inline-flex items-center' style={{ minHeight: 'var(--dim-size-800, 40px)' }}>
        {afterTitle}
      </div>
    )}
    <div className='flex-1 min-w-0' style={{ minHeight: 'var(--dim-size-800, 40px)' }} />
    {hasActions && (
      <div className='flex items-center shrink-0 flex-wrap justify-end' style={{ gap: 'var(--dim-space-300)' }}>
        {showConsentAction && <CreateConsentRequestHeaderAction />}
        {children}
      </div>
    )}
  </div>
  );
};

export default SubHeader;
