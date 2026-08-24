import React from 'react';
import { useLocation } from 'react-router-dom';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import CreateConsentRequestHeaderAction from '@/components/consent/CreateConsentRequestHeaderAction';
import { canCreateConsentRequest } from '@/data/consentPermissions';
import { shouldShowCreateConsentRequestAction } from '@/data/consentRequestActionVisibility';
import { morphSubHeaderPaddingStyle, morphTitleStyle } from '@/components/layout/headerMorphStyles';
import { MIH_CHROME_MORPH_SUBHEADER } from '@/components/layout/wizardChromeMorphStyles';
import { ButtonSizeAliasProvider } from '@/components/button/ButtonSizeAliasContext';

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

/* Density contract: every button rendered in this page-title row inherits the
   existing `sm` size alias (36px) through ButtonSizeAliasProvider. This also
   reaches buttons nested inside compound header actions without page-by-page
   overrides. */

const SubHeader = ({ title, afterTitle, onBack, backLabel = 'กลับ', children, flushSummaryCardsBelow = false, hideBottomBorder = false }) => {
  const { pathname } = useLocation();
  const showConsentAction = canCreateConsentRequest() && shouldShowCreateConsentRequestAction(pathname);
  const hasActions = children || showConsentAction;

  return (
  <ButtonSizeAliasProvider size='sm'>
  <div
    className={`flex items-start w-full shrink-0 ${MIH_CHROME_MORPH_SUBHEADER}`}
    style={{
      gap: 'var(--dim-space-300)',
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
        size='sm'
        leadingIcon='chevron_left'
        onClick={onBack}
      >
        {backLabel}
      </NeutralSubdueButton>
    )}
    {/* Match md button height so title stays on the same vertical axis as
        the action row (items-center on a wrapping button group would pull
        the title down to the mid-point of multiple rows). */}
    {/* min-w-0 + truncate, not shrink-0: titles carry patient name / HN
        (CheckupScreeningPage, CheckupRecordPage), so an unshrinkable nowrap
        span pushes the shrink-0 action group past the right edge on a narrow
        viewport and the sticky bar scrolls sideways. */}
    <h1
      className='min-w-0 inline-flex items-center'
      title={typeof title === 'string' ? title : undefined}
      style={{
        color: 'var(--text-content-default)',
        fontFamily: 'var(--type-family-heading-content)',
        fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
        lineHeight: 1.5,
        fontSize: 'var(--type-size-title, var(--type-size-base, 16px))',
        minHeight: 'var(--dim-size-700, 36px)',
        margin: 0,
        ...morphTitleStyle,
      }}
    >
      <span
        className='min-w-0'
        style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {title}
      </span>
    </h1>
    {afterTitle != null && afterTitle !== false && (
      <div className='shrink-0 inline-flex items-center' style={{ minHeight: 'var(--dim-size-700, 36px)' }}>
        {afterTitle}
      </div>
    )}
    <div className='flex-1 min-w-0' style={{ minHeight: 'var(--dim-size-700, 36px)' }} />
    {hasActions && (
      <div className='flex items-center shrink-0 flex-wrap justify-end' style={{ gap: 'var(--dim-space-200)' }}>
        {showConsentAction && <CreateConsentRequestHeaderAction />}
        {children}
      </div>
    )}
  </div>
  </ButtonSizeAliasProvider>
  );
};

export default SubHeader;
