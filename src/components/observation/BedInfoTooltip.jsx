import React from 'react';
import Tooltip from '@/components/tooltip/Tooltip';
import { MOCK_PATIENT_BEDS } from '@/data/mockPatientBeds';

function matchCatalogueByType(bedType = '') {
  return MOCK_PATIENT_BEDS.find((b) => {
    const th = b.titleTh || b.title.split(' (')[0];
    return bedType.includes(th);
  });
}

/** Resolve catalogue entry for an observation bed (photo id, then type name). */
export function resolveBedCatalogue(patient) {
  if (!patient) return null;
  return (
    MOCK_PATIENT_BEDS.find((b) => b.id === patient.bedPhotoId)
    || matchCatalogueByType(patient.bedType || '')
    || null
  );
}

export function resolveBedImage(patient) {
  return (
    resolveBedCatalogue(patient)?.imageSrc
    || MOCK_PATIENT_BEDS.find((b) => b.id === 'bed04')?.imageSrc
  );
}

/** Catalogue product blurb (คำอธิบายเตียง from MOCK_PATIENT_BEDS). */
export function resolveBedCatalogueDescription(patient) {
  return String(resolveBedCatalogue(patient)?.description ?? '').trim();
}

/** Ward free-text note from "เพิ่มเตียง" popup (จุดสังเกต / สถานที่). */
export function resolveBedWardNote(patient) {
  return String(patient?.bedDescription ?? '').trim();
}

/** Prefer ward note, else catalogue blurb, else "-". */
export function resolveBedDescription(patient) {
  return resolveBedWardNote(patient)
    || resolveBedCatalogueDescription(patient)
    || '-';
}

export function resolveBedTitleTh(patient) {
  const cat = resolveBedCatalogue(patient);
  return cat?.titleTh || patient?.bedType || patient?.bedNo || 'เตียง';
}

export function resolveBedTitleEn(patient) {
  return resolveBedCatalogue(patient)?.titleEn || '';
}

function BedInfoTooltipContent({ patient }) {
  const titleTh = resolveBedTitleTh(patient);
  const titleEn = resolveBedTitleEn(patient);
  const catalogueDesc = resolveBedCatalogueDescription(patient) || '-';
  const wardNote = resolveBedWardNote(patient);
  const imageSrc = resolveBedImage(patient);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--dim-space-200, 8px)',
        fontFamily: 'var(--type-family-body)',
        textAlign: 'left',
        minWidth: 'var(--dim-size-2100, 160px)',
      }}
    >
      <div
        style={{
          width: '100%',
          aspectRatio: '227 / 180',
          borderRadius: 'var(--dim-radius-300, 10px)',
          background: 'var(--surface-neutral-tertiary, #F4F5F5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <img
          src={imageSrc}
          alt={titleTh}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--dim-space-100, 4px)',
        }}
      >
        <strong
          style={{
            fontWeight: 'var(--type-weight-bold)',
            fontSize: 'var(--type-size-sm, 14px)',
            color: 'var(--text-content-default)',
            lineHeight: 1.5,
          }}
        >
          {titleTh}
        </strong>
        {titleEn ? (
          <span
            style={{
              fontWeight: 'var(--type-weight-regular)',
              fontSize: 'var(--type-size-xs, 12px)',
              color: 'var(--text-content-tertiary)',
              lineHeight: 1.5,
            }}
          >
            {titleEn}
          </span>
        ) : null}
        <span
          style={{
            fontWeight: 'var(--type-weight-regular)',
            fontSize: 'var(--type-size-xs, 12px)',
            color: 'var(--text-content-secondary)',
            lineHeight: 1.5,
          }}
        >
          คำอธิบาย: {catalogueDesc}
        </span>
        <span
          style={{
            fontWeight: 'var(--type-weight-regular)',
            fontSize: 'var(--type-size-xs, 12px)',
            color: 'var(--text-content-secondary)',
            lineHeight: 1.5,
          }}
        >
          จุดสังเกต: {wardNote || '-'}
        </span>
      </div>
    </div>
  );
}

/**
 * Hover / focus on a bed badge → tooltip with photo, Thai/EN name, description.
 */
export default function BedInfoTooltip({
  patient,
  position = 'bottom',
  children,
  className = '',
}) {
  if (!patient) return children;

  return (
    <Tooltip
      variant='light'
      position={position}
      maxWidth={280}
      wrap
      className={className}
      content={<BedInfoTooltipContent patient={patient} />}
    >
      <span className='inline-flex h-full items-center'>{children}</span>
    </Tooltip>
  );
}
