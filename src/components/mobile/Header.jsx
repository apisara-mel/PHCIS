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
        borderBottom: transparent ? 'none' : '1px solid var(--border-content-tertiary, #E1E3E5)',
        gap: 'var(--dim-space-200, 8px)',
      }}
    >
      {!hideBack && (
        <button
          type='button'
          onClick={handleBack}
          aria-label='ย้อนกลับ'
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--dim-radius-full, 9999px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-content-primary)',
          }}
        >
          <Sym name='arrow_back' size={24} />
        </button>
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
      {right && <div className='flex items-center'>{right}</div>}
    </div>
  );
};

export default MobileHeader;
