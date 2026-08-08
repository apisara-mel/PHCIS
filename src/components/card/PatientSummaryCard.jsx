import React from 'react';

/* MIH PatientSummaryCard — Figma node 145:6155 ("Popup Large" patient
   summary card used by ScreeningConfirmPopup, the "ยืนยันรับผู้ป่วย"
   popup shown when clicking a row in the OPD screening worklist).
   Extracted so any other popup needing the same avatar + label/value
   cell row (e.g. ObservationQueuePage's quick vitals log modal) stays
   visually identical instead of hand-rolling its own info bar.

   Props:
     avatarUrl   — optional; when the prop is passed at all (even null/
                   undefined string), the 68px avatar circle renders.
                   Omit the prop entirely to skip the avatar altogether.
     avatarAlt   — alt text for the avatar image
     cells       — array of { label, value, valueColor?, children? }
                   rendered as InfoCell, separated by a vertical Divider
     variant     — 'default' (light mint bar) | 'gradient' (PatientCard
                   teal/green gradient — Consent Timeline Figma 270:72714) */

export const Divider = ({ tone = 'default' }) => (
  <span
    aria-hidden
    style={{
      width: 1,
      height: 48,
      background: tone === 'gradient'
        ? 'color-mix(in srgb, var(--text-brandPrimary-on-brand, #FFFFFF) 35%, transparent)'
        : 'var(--border-neutral-tertiary, #E2E4E6)',
      flexShrink: 0,
    }}
  />
);

export const InfoCell = ({
  label,
  value,
  valueColor = 'var(--text-brandPrimary-default)',
  labelColor = 'var(--text-content-tertiary, #858C92)',
  children,
}) => (
  <div
    className='flex flex-col min-w-0 shrink-0'
    style={{ gap: 'var(--dim-space-100, 4px)' }}
  >
    <span
      style={{
        color: labelColor,
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs, 12px)',
        lineHeight: 1.5,
      }}
    >
      {label}
    </span>
    {children ?? (
      <span
        className='truncate'
        style={{
          color: valueColor,
          fontFamily: 'var(--type-family-heading-content)',
          fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
          fontSize: 'var(--type-size-base, 16px)',
          lineHeight: 1.5,
        }}
      >
        {value}
      </span>
    )}
  </div>
);

const PatientSummaryCard = ({ avatarUrl, avatarAlt = '', cells = [], variant = 'default' }) => {
  const isGradient = variant === 'gradient';
  const labelColor = isGradient
    ? 'color-mix(in srgb, var(--text-brandPrimary-on-brand, #FFFFFF) 90%, transparent)'
    : 'var(--text-content-tertiary, #858C92)';
  const valueColorDefault = isGradient
    ? 'var(--text-brandPrimary-on-brand, #FFFFFF)'
    : 'var(--text-brandPrimary-default)';

  return (
    <div
      className='flex items-center flex-wrap'
      style={{
        gap: 'var(--dim-space-600, 24px)',
        padding: 'var(--dim-space-400, 16px)',
        borderRadius: 'var(--dim-radius-400)',
        ...(isGradient
          ? {
              backgroundImage:
                'linear-gradient(94.93deg, var(--patient-card-grad-start) 0.67%, var(--patient-card-grad-end) 100.76%)',
              border: 'none',
            }
          : {
              background: 'var(--surface-brandprimary-quaternary, #F4FBF8)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-brandprimary-quaternary, #E2F3EB)',
            }),
      }}
    >
      {avatarUrl !== undefined && (
        <div
          className='shrink-0 overflow-hidden'
          style={{
            width: 68,
            height: 68,
            borderRadius: 'var(--dim-radius-full)',
            border: 'var(--dim-stroke-400, 4px) solid var(--border-image-default, #FFFFFF)',
            boxShadow: 'var(--shadow-card, 0 1px 4px rgba(100,116,139,0.10))',
            background: 'var(--patient-card-avatar-bg, #6EBBD0)',
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={avatarAlt}
              className='w-full h-full object-cover'
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : null}
        </div>
      )}

      {cells.map((cell, i) => (
        <React.Fragment key={cell.label || i}>
          {i > 0 && <Divider tone={isGradient ? 'gradient' : 'default'} />}
          <InfoCell
            label={cell.label}
            value={cell.value}
            labelColor={labelColor}
            valueColor={cell.valueColor ?? valueColorDefault}
          >
            {cell.children}
          </InfoCell>
        </React.Fragment>
      ))}
    </div>
  );
};

export default PatientSummaryCard;
