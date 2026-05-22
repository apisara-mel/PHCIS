import React from 'react';
import Popup from '@/components/popup/Popup';
import { DEFAULT_PATIENT } from '@/data/patientProfiles';

/* MIH ScreeningConfirmPopup — Figma "Popup Large" (MIH DS · Popup
   node 145:6101). Subtitle lives inside the header (alongside the title),
   so the body holds only the patient summary card (Figma node 145:6155).

   Aliases the design-system <Popup size='large'> shell so header/footer/
   buttons all inherit the canonical chrome (close X, BrandSubdueButton
   "ยกเลิก", BrandPrimaryButton "ยืนยัน"). The patient card is the only
   piece unique to this template.

   Props:
     • open                boolean
     • onConfirm           () => void  — primary "ยืนยัน" action
     • onCancel            () => void  — secondary "ยกเลิก" action (also fires
                                          on overlay click + close X + Esc)
     • patient             { fullName, hn, insurance, avatarUrl }
     • description         optional override for the header subtitle line */

const INSURANCE_TAGS = [
  { match: /ประกันสังคม/,            label: 'ประกันสังคม',     tone: 'blue'   },
  { match: /บัตรทอง|หลักประกันสุขภาพ/, label: 'บัตรทอง',         tone: 'orange' },
  { match: /ข้าราชการ/,               label: 'ข้าราชการ',       tone: 'purple' },
  { match: /ชำระเอง/,                  label: 'ชำระเอง',         tone: 'red'    },
];

const TONE = {
  blue:   { bg: 'var(--surface-pill-blue)',   ink: 'var(--text-pill-blue)'   },
  orange: { bg: 'var(--surface-pill-orange)', ink: 'var(--text-pill-orange)' },
  purple: { bg: 'var(--surface-pill-purple)', ink: 'var(--text-pill-purple)' },
  red:    { bg: 'var(--surface-pill-red)',    ink: 'var(--text-pill-red)'    },
};

const resolveInsurance = (raw) => {
  if (!raw) return { label: '—', tone: 'blue' };
  const hit = INSURANCE_TAGS.find((t) => t.match.test(raw));
  return hit || { label: raw, tone: 'blue' };
};

const Divider = () => (
  <span
    aria-hidden
    style={{
      width: 1,
      height: 48,
      background: 'var(--border-neutral-tertiary, #E2E4E6)',
      flexShrink: 0,
    }}
  />
);

const InfoCell = ({ label, value, valueColor = 'var(--text-brandPrimary-default)', children }) => (
  <div
    className='flex flex-col min-w-0 shrink-0'
    style={{ gap: 'var(--dim-space-100, 4px)' }}
  >
    <span
      style={{
        color: 'var(--text-content-tertiary, #858C92)',
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
          fontWeight: 'var(--type-weight-bold, 700)',
          fontSize: 'var(--type-size-base, 16px)',
          lineHeight: 1.5,
        }}
      >
        {value}
      </span>
    )}
  </div>
);

const ScreeningConfirmPopup = ({
  open,
  onConfirm,
  onCancel,
  patient = DEFAULT_PATIENT,
  description = 'ยืนยันการรับผู้ป่วยเข้าสู่ขั้นตอนคัดกรองและซักประวัติ',
}) => {
  const insurance = resolveInsurance(patient?.insurance);
  const insTone   = TONE[insurance.tone] || TONE.blue;

  return (
    <Popup
      open={open}
      onClose={onCancel}
      title='ยืนยันรับผู้ป่วย'
      subtitle={description}
      size='large'
      secondaryAction={{ label: 'ยกเลิก', onClick: onCancel }}
      primaryAction={{   label: 'ยืนยัน', onClick: onConfirm }}
    >
      {/* Patient summary card — Figma node 145:6155.
          Brand-quaternary surface, 12px radius, 16px padding, 24px gap.
          Wraps on narrow viewports so the popup remains usable below md. */}
      <div
        className='flex items-center flex-wrap'
        style={{
          gap: 'var(--dim-space-600, 24px)',
          padding: 'var(--dim-space-400, 16px)',
          borderRadius: 'var(--dim-radius-400)',
          background: 'var(--surface-brandprimary-quaternary, #F4FBF8)',
          border: 'var(--dim-stroke-100, 1px) solid var(--border-brandprimary-quaternary, #E2F3EB)',
        }}
      >
        {/* Avatar — 68×68 round, 4px white border, soft shadow */}
        <div
          className='shrink-0 overflow-hidden'
          style={{
            width: 68,
            height: 68,
            borderRadius: 'var(--dim-radius-full)',
            border: 'var(--dim-stroke-400, 4px) solid var(--border-image-default, #FFFFFF)',
            boxShadow: 'var(--shadow-card, 0 1px 4px rgba(100,116,139,0.10))',
            background: '#6EBBD0',
          }}
        >
          {patient?.avatarUrl ? (
            <img
              src={patient.avatarUrl}
              alt={patient.fullName || ''}
              className='w-full h-full object-cover'
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : null}
        </div>

        <InfoCell
          label='ชื่อ-นามสกุล ผู้ป่วย'
          value={patient?.fullName || patient?.shortName || '—'}
        />
        <Divider />
        <InfoCell label='HN (Hospital Number)' value={patient?.hn || '—'} />
        <Divider />
        <InfoCell label='สิทธิ์การรักษา'>
          <span
            className='inline-flex items-center justify-center whitespace-nowrap'
            style={{
              minWidth: 40,
              maxWidth: 224,
              height: 24,
              paddingLeft:  'var(--dim-space-200, 8px)',
              paddingRight: 'var(--dim-space-200, 8px)',
              paddingTop:    'var(--dim-space-100, 4px)',
              paddingBottom: 'var(--dim-space-100, 4px)',
              borderRadius: 'var(--dim-radius-full)',
              border: 'var(--dim-stroke-100) solid var(--border-image-default, #FFFFFF)',
              background: insTone.bg,
              color:      insTone.ink,
              fontFamily: 'var(--type-family-body)',
              fontWeight: 'var(--type-weight-medium, 500)',
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            {insurance.label}
          </span>
        </InfoCell>
      </div>
    </Popup>
  );
};

export default ScreeningConfirmPopup;
