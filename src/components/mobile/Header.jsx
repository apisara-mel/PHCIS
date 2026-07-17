import React from 'react';
import { useHistory } from 'react-router-dom';
import { Sym } from './Sym';

/* MIH Mobile · Header.
   56h app-bar pattern. Back button defaults to history.goBack() — pass
   `onBack` to override (e.g. when a multi-step wizard wants to retreat
   one step instead of leaving the page). `right` slot accepts any node
   (icon button, badge, link). `transparent` mode is used by hero
   screens where the header sits over a gradient. */
export const MobileHeader = ({
  title,
  subtitle,
  onBack,
  right,
  transparent = false,
  hideBack = false,
  reserveBackSpace = false,
  backIcon = 'arrow_back',
  containerStyle,
  titleStyle,
  rightContainerStyle,
}) => {
  const history = useHistory();
  const handleBack = onBack || (() => history.goBack());
  return (
    <div
      className='flex items-center'
      style={{
        height: 'var(--mobile-header-height, 56px)',
        padding: '0 var(--dim-space-300, 12px)',
        background: transparent ? 'transparent' : 'var(--surface-content-default, #FFFFFF)',
        borderBottom: transparent ? 'none' : 'var(--dim-stroke-100, 1px) solid var(--border-content-tertiary, #E1E3E5)',
        gap: 'var(--dim-space-200, 8px)',
        ...containerStyle,
      }}
    >
      {!hideBack && (
        <button
          type='button'
          onClick={handleBack}
          aria-label='ย้อนกลับ'
          style={{
            width: 'var(--dim-size-800, 40px)',
            height: 'var(--dim-size-800, 40px)',
            borderRadius: 'var(--dim-radius-full, 9999px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--icon-neutral-default, #4D5358)',
          }}
        >
          <Sym name={backIcon} size='var(--dim-size-500, 24px)' />
        </button>
      )}
      {hideBack && reserveBackSpace && (
        <span
          aria-hidden
          className='shrink-0'
          style={{
            width: 'var(--dim-size-800, 40px)',
            height: 'var(--dim-size-800, 40px)',
          }}
        />
      )}
      <div className='flex-1 min-w-0'>
        <p style={{
          margin: 0,
          fontFamily: 'var(--type-family-display)',
          fontSize: 'var(--type-size-lg, 18px)',
          fontWeight: 'var(--type-weight-bold, 700)',
          color: 'var(--text-content-primary)',
          lineHeight: 1.3,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          ...titleStyle,
        }}>{title}</p>
        {subtitle && (
          <p style={{
            margin: 0,
            fontSize: 'var(--type-size-xs, 12px)',
            color: 'var(--text-content-tertiary, #858C92)',
            lineHeight: 1.3,
          }}>{subtitle}</p>
        )}
      </div>
      {right && <div className='flex items-center' style={rightContainerStyle}>{right}</div>}
    </div>
  );
};

/* MIH Mobile · Navigation header — Figma 154:54548.
   Back chevron in a 40×40 Neutral Icon Button, a centered Mitr title, and a
   symmetric 40×40 slot on the right (a hidden spacer when no `right` node is
   given) so the title stays optically centered. Brand-tinted divider + drop
   shadow. Used by detail / sheet-style screens (appointment detail, etc.). */
const NAV_ICON_BTN = {
  width: 'var(--dim-size-800, 40px)',
  height: 'var(--dim-size-800, 40px)',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 'var(--dim-radius-full, 9999px)',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--icon-neutral-default, #4D5358)',
};

export const MobileNavHeader = ({
  title,
  onBack,
  right,
  backIcon = 'chevron_left',
  containerStyle,
  titleStyle,
}) => {
  const history = useHistory();
  const handleBack = onBack || (() => history.goBack());
  return (
    <div
      className='flex items-center shrink-0'
      style={{
        height: 'var(--dim-size-1500, 68px)',
        padding: '0 var(--dim-space-200, 8px)',
        gap: 'var(--dim-space-300, 12px)',
        background: 'var(--surface-navigation-default, #FFFFFF)',
        borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
        boxShadow: 'var(--shadow-brand-drop-bottom-100)',
        ...containerStyle,
      }}
    >
      <button type='button' onClick={handleBack} aria-label='ย้อนกลับ' style={NAV_ICON_BTN}>
        <Sym name={backIcon} size='var(--dim-size-500, 24px)' />
      </button>
      <p
        className='flex-1 min-w-0'
        style={{
          margin: 0,
          textAlign: 'center',
          fontFamily: 'var(--type-family-heading-graphic2)',
          fontSize: 'var(--type-size-base, 16px)',
          fontWeight: 'var(--type-weight-regular, 400)',
          lineHeight: 1.5,
          color: 'var(--text-content-default, #111314)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          ...titleStyle,
        }}
      >
        {title}
      </p>
      {right
        ? <div className='flex items-center justify-center' style={NAV_ICON_BTN}>{right}</div>
        : <span aria-hidden className='shrink-0' style={{ width: 'var(--dim-size-800, 40px)', height: 'var(--dim-size-800, 40px)' }} />}
    </div>
  );
};

export default MobileHeader;
