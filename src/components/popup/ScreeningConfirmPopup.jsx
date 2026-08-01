import React from 'react';
import Popup from '@/components/popup/Popup';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import { DEFAULT_PATIENT } from '@/data/patientProfiles';

/* MIH ScreeningConfirmPopup — Figma "Popup Large" (MIH DS · Popup
   node 145:6101). Subtitle lives inside the header (alongside the title),
   so the body holds only the patient summary card (Figma node 145:6155,
   now shared via PatientSummaryCard — see that file for the other caller).

   Aliases the design-system <Popup size='large'> shell so header/footer/
   buttons all inherit the canonical chrome (close X, BrandSubdueButton
   "ยกเลิก", BrandPrimaryButton "ยืนยัน"). The insurance-tag resolution is
   the only piece unique to this template.

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

const InsurancePill = ({ label, tone }) => (
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
      background: tone.bg,
      color:      tone.ink,
      fontFamily: 'var(--type-family-body)',
      fontWeight: 'var(--type-weight-medium, 500)',
      fontSize: 12,
      lineHeight: 1.5,
    }}
  >
    {label}
  </span>
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
      <PatientSummaryCard
        avatarUrl={patient?.avatarUrl}
        avatarAlt={patient?.fullName || ''}
        cells={[
          { label: 'ชื่อ-นามสกุล ผู้ป่วย', value: patient?.fullName || patient?.shortName || '—' },
          { label: 'HN (Hospital Number)', value: patient?.hn || '—' },
          { label: 'สิทธิ์การรักษา', children: <InsurancePill label={insurance.label} tone={insTone} /> },
        ]}
      />
    </Popup>
  );
};

export default ScreeningConfirmPopup;
