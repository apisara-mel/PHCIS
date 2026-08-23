import React, { useState } from 'react';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Icon from '@/components/icons/Icon';

/* Shared drug identity strip for pharmacy registry popups
   (กิจกรรม / Position restrictors). */

const META_LABEL = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.4,
};

const DRUG_NAME = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-medium)',
  lineHeight: 1.5,
};

/** Square drug photo tile — used in registry form + popup meta banner.
   Empty / not-uploaded state matches Form Builder Content icon box
   (`medication` on `--icon-formbuilder-iconbox-*`). */
export const PharmacyDrugImage = ({
  src,
  alt,
  size = 'var(--dim-size-1000, 48px)',
  iconSize = 24,
  radius = 'var(--dim-radius-200, 8px)',
}) => {
  const [broken, setBroken] = useState(false);
  const tile = {
    width: size,
    height: size,
    borderRadius: radius,
    flexShrink: 0,
    boxSizing: 'border-box',
  };
  if (src && !broken) {
    return (
      <img
        src={src}
        alt={alt || 'medication'}
        loading='lazy'
        onError={() => setBroken(true)}
        style={{
          ...tile,
          objectFit: 'cover',
          border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
          background: 'var(--surface-card-quaternary, #F9FBFB)',
        }}
      />
    );
  }
  return (
    <span
      className='inline-flex items-center justify-center'
      style={{
        ...tile,
        border: 'none',
        background: 'var(--icon-formbuilder-iconbox-default, #E2F3EB)',
        color: 'var(--text-formbuilder-text, #007549)',
      }}
      aria-hidden
    >
      <Icon name='medication' size={iconSize} color='currentColor' />
    </span>
  );
};

const PharmacyDrugMetaBanner = ({
  drugCode = '',
  drugName = '',
  drugImage = '',
}) => {
  /* Only the uploaded image — no catalog resolve. Empty → form-builder tile. */
  const src = String(drugImage || '').trim();

  return (
    <div
      className='flex flex-wrap items-center w-full min-w-0 shrink-0'
      style={{
        gap: 'var(--dim-space-400)',
        padding: 'var(--dim-space-300) var(--dim-space-400)',
        background: 'var(--surface-brandPrimary-quaternary)',
        borderRadius: 'var(--dim-radius-200, 8px)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
      }}
    >
      <PharmacyDrugImage src={src} alt={drugName} />
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
        <span style={META_LABEL}>รหัสยา</span>
        <ColorfulBadge style='teal' size='small' hierarchy='secondary' width='hug'>
          {drugCode || '—'}
        </ColorfulBadge>
      </div>
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{ gap: 'var(--dim-space-100)', minWidth: 'min(100%, 240px)' }}
      >
        <span style={META_LABEL}>ชื่อยา</span>
        <span style={DRUG_NAME}>{drugName || 'ยังไม่ระบุชื่อยา'}</span>
      </div>
    </div>
  );
};

export default PharmacyDrugMetaBanner;
