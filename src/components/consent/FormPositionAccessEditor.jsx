import React, { useMemo } from 'react';
import CheckboxButton from '@/components/checkbox/CheckboxButton';
import FormPositionEditor from '@/components/consent/FormPositionEditor';
import { ALL_CONSENT_POSITION_VALUES } from '@/data/consentFormScopes';

/* Shared “ตำแหน่งที่มีสิทธิเข้าถึงได้” block — CreateConsentFormPage step 2
   and FormPositionViewPopup edit mode use the same layout (heading + select-all +
   2-column checkbox list). */

const COLUMN_HEADING_STYLE = {
  margin: 0,
  color: 'var(--text-brandPrimary-default, #007549)',
  fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
  fontSize: 'var(--type-size-base, 16px)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.4,
};

const SECTION_CARD_STYLE = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--surface-card-100, #FFFFFF)',
  borderRadius: 'var(--dim-radius-500, 16px)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600, 24px)',
  gap: 'var(--dim-space-400, 16px)',
};

export default function FormPositionAccessEditor({
  value = [],
  onChange,
  onToggleAll,
  columns = 2,
  variant = 'card',
  heading = 'ตำแหน่งที่มีสิทธิเข้าถึงได้',
  allLabel = 'ทุกตำแหน่ง',
  readOnly = false,
  showHeading = true,
  style,
}) {
  const allSelected = useMemo(
    () => ALL_CONSENT_POSITION_VALUES.length > 0
      && ALL_CONSENT_POSITION_VALUES.every((v) => value.includes(v)),
    [value],
  );

  const handleToggleAll = (select) => {
    if (readOnly) return;
    if (onToggleAll) {
      onToggleAll(select);
      return;
    }
    onChange?.(select ? [...ALL_CONSENT_POSITION_VALUES] : []);
  };

  const body = (
    <>
      {showHeading && heading ? (
        <h3 style={COLUMN_HEADING_STYLE}>{heading}</h3>
      ) : null}
      <CheckboxButton
        checked={allSelected}
        onChange={handleToggleAll}
        label={allLabel}
        border
        showCircleIcon={false}
        showIcon={false}
        showBadge={false}
        showBadge2={false}
        showDescription={false}
        disabled={readOnly}
        className='w-fit max-w-full shrink-0'
        style={{ width: 'fit-content' }}
      />
      <FormPositionEditor
        value={value}
        onChange={readOnly ? undefined : onChange}
        columns={columns}
        readOnly={readOnly}
      />
    </>
  );

  if (variant === 'plain') {
    return (
      <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400, 16px)', ...style }}>
        {body}
      </div>
    );
  }

  return (
    <section className='w-full flex flex-col min-w-0' style={{ ...SECTION_CARD_STYLE, ...style }}>
      {body}
    </section>
  );
}
