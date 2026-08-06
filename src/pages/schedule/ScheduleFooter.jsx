import React from 'react';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import { MIH_FOOTER_LEGAL_AUTOHIDE } from '@/components/layout/wizardChromeMorphStyles';

/* MIH · Schedule footer per Figma 16:54432 — two stacked rows:
   1. Action row (only when `type === 'btn'`): right-aligned Neutral
      Subdue (ยกเลิก) + Brand (บันทึก) at 44px height each.
   2. Legal row: copyright on the left + Privacy Policy / Terms of
      Service on the right. Always rendered. Border-top divider sits
      between the two rows when both are visible.

   Outer chrome: `surface-navigation-default` bg + 1px brand-quaternary
   top border + brand-tinted drop-shadow (--shadow-brand-drop-top-100).

   Usage:
     <ScheduleFooter />                         // legal row only
     <ScheduleFooter type='btn' onSave={...} /> // with action buttons */

const LEGAL_TEXT = '© 2026 ศูนย์บริการสาธารณสุข สำนักอนามัย กรุงเทพมหานคร';

const LegalLink = ({ children, href = '#', onClick }) => (
  <a
    href={href}
    onClick={onClick}
    style={{
      color: 'inherit',
      textDecoration: 'none',
      cursor: 'pointer',
      transition: 'color 150ms ease-out',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-brandPrimary-default, var(--brand-p700, #007549))'; }}
    onMouseLeave={(e) => { e.currentTarget.style.color = 'inherit'; }}
  >
    {children}
  </a>
);

const ScheduleFooter = ({
  type = 'no',
  onCancel,
  onSave,
  onSaveDraft,
  cancelLabel = 'ยกเลิก',
  draftLabel = 'บันทึกร่าง',
  saveLabel = 'บันทึก',
  saveDisabled = false,
  draftDisabled = false,
  onPrivacy,
  onTerms,
}) => {
  const showActions = type === 'btn';
  return (
    <footer
      style={{
        background: 'var(--surface-navigation-default, #FFFFFF)',
        borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
        boxShadow: 'var(--shadow-brand-drop-top-100, 0 -1px 2px rgba(8,167,104,0.08))',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {showActions && (
        /* Action row — right-aligned ยกเลิก · บันทึกร่าง · บันทึก per
            Figma 16:54432. All three use the Large variant (h-44, Mitr 16).
            · ยกเลิก       Neutral Subdue Outline
            · บันทึกร่าง   Brand Subdue Outline + save icon
            · บันทึก       Brand Fill (disabled until isDirty per Figma
                          annotation "remains disabled if no changes"). */
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 'var(--dim-space-300, 12px)',
          padding: 'var(--dim-space-400, 16px) var(--dim-space-600, 24px)',
        }}>
          <NeutralSubdueButton size='lg' onClick={onCancel}>{cancelLabel}</NeutralSubdueButton>
          {onSaveDraft && (
            <BrandSubdueButton
              size='lg'
              leadingIcon='save'
              onClick={onSaveDraft}
              disabled={draftDisabled}
            >
              {draftLabel}
            </BrandSubdueButton>
          )}
          <BrandButton size='lg' onClick={onSave} disabled={saveDisabled}>{saveLabel}</BrandButton>
        </div>
      )}
      {/* Legal row — copyright left + Privacy / Terms right. Subtle
          divider only appears when the action row sits above it. */}
      <div className={MIH_FOOTER_LEGAL_AUTOHIDE} style={{
        height: 'var(--dim-size-1200, 56px)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--dim-space-600, 24px)',
        padding: '14px var(--dim-space-600, 24px)',
        borderTop: showActions
          ? 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)'
          : 0,
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs, 12px)',
        fontWeight: 'var(--type-weight-regular, 400)',
        lineHeight: 1.5,
        color: 'var(--text-content-secondary, #636B72)',
        boxSizing: 'border-box',
      }}>
        <span style={{ flex: '1 1 0', minWidth: 0 }}>
          {LEGAL_TEXT}
        </span>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--dim-space-600, 24px)',
          whiteSpace: 'nowrap',
        }}>
          <LegalLink onClick={onPrivacy}>Privacy Policy</LegalLink>
          <LegalLink onClick={onTerms}>Terms of Service</LegalLink>
        </div>
      </div>
    </footer>
  );
};

export default ScheduleFooter;
