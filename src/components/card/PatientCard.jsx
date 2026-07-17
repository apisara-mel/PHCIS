import React, { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { resolveSeverityBadgeStyle } from '@/components/badge/clinicalBadgeStyles';
import { DEFAULT_PATIENT } from '@/data/patientProfiles';

/* Derive 1-2 character initials from the patient's name. Prefers the
   first two Thai given-name graphemes ("นายสมชาย มั่นใจดี" → "สม"),
   then falls back to the English first/last initials ("Somchai
   Manjaidee" → "SM"), then to "—". The pattern matches the avatar
   conventions used by RegistrationStep1 and the screening header. */
const getInitials = (patient) => {
  const stripPrefix = (s = '') =>
    s
      .replace(/^(นาย|นาง|นางสาว|เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.)\s*/u, '')
      .trim();
  const th = stripPrefix(patient?.fullName || '');
  if (th) {
    const firstWord = th.split(/\s+/)[0] || '';
    const chars = Array.from(firstWord).filter((c) => /\S/.test(c));
    if (chars.length >= 2) return chars.slice(0, 2).join('');
    if (chars.length === 1) return chars[0];
  }
  const en = (patient?.englishName || '').trim();
  if (en) {
    const parts = en.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  }
  return '—';
};

const Field = ({ label, value }) => (
  <div className='flex flex-col text-white'>
    <span className='text-xs leading-snug opacity-90'>{label}</span>
    <span className='text-sm font-bold leading-snug -tracking-[0.28px]'>{value}</span>
  </div>
);

/* แพ้ยา / โรคประจำตัว row beneath the gradient card.
   • Full layout (Figma 150:33649) — label sits ABOVE its badges in a
     stacked column.
   • Compact / parallax-stuck layout (Figma 343:5629) — label sits
     INLINE on the same row as the badges, hugging its content.
   Each entry resolves to a severity-coded ColorfulBadge via
   resolveSeverityBadgeStyle (red / orange / blue / teal / yellow). */
const AlertBadgeColumn = ({ label, items, compact = false }) => {
  const labelEl = (
    <span
      style={{
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs, 12px)',
        lineHeight: 1.5,
        color: 'var(--text-content-tertiary, #858c92)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
  const badgesEl = (
    <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
      {items.length === 0 ? (
        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs, 12px)',
            color: 'var(--text-content-tertiary, #858c92)',
          }}
        >
          —
        </span>
      ) : (
        items.map((item, idx) => (
          <ColorfulBadge
            key={`${item.name}-${idx}`}
            style={resolveSeverityBadgeStyle(item.severity)}
            size='small'
            width='hug'
          >
            {item.name}
          </ColorfulBadge>
        ))
      )}
    </div>
  );
  return (
    <div
      className={`flex-1 min-w-0 flex ${compact ? 'flex-row flex-wrap items-center' : 'flex-col'}`}
      style={{ gap: compact ? 'var(--dim-space-200, 8px)' : 'var(--dim-space-100, 4px)' }}
    >
      {labelEl}
      {badgesEl}
    </div>
  );
};

const PatientCard = ({
  patient = DEFAULT_PATIENT,
  onBack,
  title = 'คัดกรองและซักประวัติ',
  actions,
  drugAllergies,
  chronicDiseases,
  /* Figma 343:5629 — compact / scrolled-up state. Single-row gradient
     card with 44px avatar, 24h HN/VIP pills, four right-aligned summary
     fields (สิทธิ์ · หมู่เลือด · ประเภท · แพทย์), title row collapsed,
     and the แพ้ยา / โรคประจำตัว labels inline with their badges. Drops
     เพศ / อายุ / เลขบัตรประชาชน / ที่อยู่ to keep the header tight. */
  compact: compactProp,
  /* Figma 343:1926 parallax header. When true, PatientCard owns the
     sticky chrome: it renders a 1px sentinel above itself, observes
     when the sentinel leaves the viewport, and automatically toggles
     `compact` true/false. Pass `stickyTop` (px) to offset the sticky
     position below an app header — defaults to 64 to clear the
     PHCIS app `Header` (h-16, sticky, z-1200). Callers may still pass
     `compact` directly to force a static state (Components Library). */
  sticky = false,
  stickyTop = 64,
}) => {
  const history = useHistory();
  const [imgError, setImgError] = useState(false);
  const sentinelRef = useRef(null);
  const [stuck, setStuck] = useState(false);

  /* When `sticky` mode is enabled, derive `compact` from the sentinel's
     intersection. When disabled, defer to the `compact` prop so the
     Components Library demos can still pin a static compact view. */
  const compact = sticky ? stuck : !!compactProp;

  useEffect(() => {
    setImgError(false);
  }, [patient?.avatarUrl]);

  useEffect(() => {
    if (!sticky || typeof IntersectionObserver === 'undefined') return undefined;
    const node = sentinelRef.current;
    if (!node) return undefined;
    /* Observe the sentinel against the viewport with a top rootMargin
       equal to `stickyTop`, so the compact swap fires the moment the
       card tucks under the app header. */
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { threshold: 0, rootMargin: `-${stickyTop}px 0px 0px 0px` },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [sticky, stickyTop]);

  /* Default — navigate one step back. The page can intercept (e.g. to
     show an unsaved-changes confirmation) by passing its own `onBack`. */
  const handleBack = () => {
    if (onBack) onBack();
    else history.goBack();
  };

  const allergiesList = drugAllergies ?? patient?.drugAllergies ?? [];
  const diseasesList = chronicDiseases ?? patient?.chronicDiseases ?? [];
  const showAlertRow = allergiesList.length > 0 || diseasesList.length > 0;

  /* Tunable parallax timing — kept short so the user feels the snap but
     long enough that label/title fades read as graceful (Figma 343:5629). */
  const T = '300ms cubic-bezier(0.4, 0, 0.2, 1)';

  const cardStyle = {
    paddingTop: 'var(--dim-space-400, 16px)',
    /* Compact bottom space:
       • With alert row → 0 here (the alert row owns its 16 px pb).
       • Without alert row → 16 px here so the sticky bar still has the
         Figma 343:5629 breathing room above page content (the OPD
         ScreeningPage header has no alert row). */
    paddingBottom: compact
      ? (showAlertRow ? 0 : 'var(--dim-space-400, 16px)')
      : 'var(--dim-space-600, 24px)',
    transition: `padding-bottom ${T}`,
    ...(sticky
      ? {
          position: 'sticky',
          top: stickyTop,
          /* Stack above page content but below the app header (z-1200)
             and modals (z-1400). The dropdown popover tokens
             (--sm-z-popover 1199) already sit just below the header — a
             lightly lower 1100 keeps this from competing with menus. */
          zIndex: 1100,
        }
      : null),
  };

  return (
    <>
      {/* Sentinel — sits at the natural top of the card so the
         IntersectionObserver can detect when the card has scrolled
         under the app header. Rendered only in sticky mode. */}
      {sticky && <div ref={sentinelRef} aria-hidden style={{ height: 1 }} />}
    <div
      className='w-full bg-surface-card px-6 border-b border-brand-200 shadow-card'
      style={cardStyle}
    >
      {/* Top row (back · title · actions). Figma 343:5629 drops this row
          entirely in the stuck/compact state, so we collapse height +
          fade in lockstep to keep the parallax smooth. `aria-hidden` and
          `pointer-events: none` lock the buttons out while invisible. */}
      <div
        aria-hidden={compact}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--dim-space-400, 16px)',
          /* Collapse animation needs hidden; expanded row must stay visible so
             header actions (BrandSubdueButton hover lift / focus ring) are not cropped. */
          overflow: compact ? 'hidden' : 'visible',
          maxHeight: compact ? 0 : 56,
          opacity: compact ? 0 : 1,
          marginBottom: compact ? 0 : 'var(--dim-space-400, 16px)',
          pointerEvents: compact ? 'none' : 'auto',
          transition: `max-height ${T}, opacity ${T}, margin-bottom ${T}`,
        }}
      >
        {/* Back button — aliases Neutral Subdue Button (Figma PHCIS-ALL
            2373:119045: outline variant, leading chevron_left). */}
        <NeutralSubdueButton
          variant='outline'
          size='md'
          leadingIcon='chevron_left'
          onClick={handleBack}
        >
          กลับ
        </NeutralSubdueButton>
        <h1 className='text-base font-bold text-ink'>{title}</h1>
        {actions && (
          <div className='ml-auto flex items-center gap-2'>{actions}</div>
        )}
      </div>

      {/* Patient info gradient card — compact (Figma 343:5629 mini) or
          full (Figma 150:33649). Compact: single row, 44px avatar, 24h
          HN/VIP pills, four right-aligned summary fields. Full: 68px
          avatar, 32h pills, multi-row grid. Padding + gap + child
          dimensions all transition in lockstep with the title row above. */}
      <div
        className='w-full rounded-card flex'
        style={{
          backgroundImage:
            'linear-gradient(94.93deg, var(--patient-card-grad-start) 0.67%, var(--patient-card-grad-end) 100.76%)',
          flexDirection: compact ? 'row' : 'column',
          flexWrap: compact ? 'wrap' : 'nowrap',
          alignItems: compact ? 'center' : 'stretch',
          paddingLeft: 'var(--dim-space-400, 16px)',
          paddingRight: 'var(--dim-space-400, 16px)',
          paddingTop: compact ? 'var(--dim-space-200, 8px)' : 'var(--dim-space-400, 16px)',
          paddingBottom: compact ? 'var(--dim-space-200, 8px)' : 'var(--dim-space-400, 16px)',
          gap: compact ? 'var(--dim-space-600, 24px)' : 'var(--dim-space-600, 24px)',
          transition: `padding ${T}, gap ${T}, flex-direction ${T}`,
        }}
      >
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <div
            className='rounded-full overflow-hidden border-4 border-white bg-[color:var(--patient-card-avatar-bg)] shrink-0 flex items-center justify-center text-white'
            style={{
              /* Figma 343:1288 (compact stuck) = size-[44px] outer; full
                 Figma 150:33649 = size-[68px] outer. `border-box` so the
                 `width` value matches Figma's total dimension and the
                 4 px white ring eats into it (image renders inside). */
              width: compact ? 44 : 68,
              height: compact ? 44 : 68,
              boxSizing: 'border-box',
              transition: `width ${T}, height ${T}`,
            }}
          >
            {!imgError && patient?.avatarUrl ? (
              <img
                src={patient.avatarUrl}
                alt={patient.fullName}
                onError={() => setImgError(true)}
                className='w-full h-full object-cover'
              />
            ) : (
              <span
                aria-hidden
                style={{
                  fontFamily: 'var(--type-family-heading-content)',
                  fontWeight: 'var(--type-weight-bold, 700)',
                  fontSize: compact ? 18 : 24,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  transition: `font-size ${T}`,
                }}
              >
                {getInitials(patient)}
              </span>
            )}
          </div>
          <div className='flex flex-col text-white' style={{ width: compact ? 'auto' : 180 }}>
            <p className='font-bold text-base leading-snug'>{patient.fullName}</p>
            <p className='text-sm leading-snug'>{patient.englishName}</p>
          </div>
          <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <span
              className='inline-flex items-center rounded-full bg-badge-greenBg text-badge-greenText font-medium'
              style={{
                height: compact ? 24 : 32,
                paddingLeft: compact ? 'var(--dim-space-200, 8px)' : 'var(--dim-space-300, 12px)',
                paddingRight: compact ? 'var(--dim-space-200, 8px)' : 'var(--dim-space-300, 12px)',
                fontSize: compact ? 'var(--type-size-xs, 12px)' : 'var(--type-size-sm, 14px)',
                transition: `height ${T}, padding ${T}, font-size ${T}`,
              }}
            >
              HN: {patient.hn}
            </span>
            {patient.vip && (
              <span
                className='inline-flex items-center rounded-full bg-badge-redBg text-badge-redText font-medium'
                style={{
                  height: compact ? 24 : 32,
                  paddingLeft: compact ? 8 : 12,
                  paddingRight: compact ? 8 : 12,
                  fontSize: compact ? 12 : 14,
                  transition: `height ${T}, padding ${T}, font-size ${T}`,
                }}
              >
                VIP / ผู้ป่วยพิเศษ
              </span>
            )}
          </div>
        </div>

        {compact ? (
          <div className='flex flex-1 min-w-0 flex-wrap items-center justify-end gap-x-6 gap-y-2 text-white'>
            <Field label='สิทธิ์การรักษา' value={patient.insurance} />
            <Field label='หมู่เลือด' value={patient.bloodType} />
            <Field label='ประเภท' value={patient.patientType} />
            <Field label='แพทย์เจ้าของคนไข้' value={patient.doctor} />
          </div>
        ) : (
          <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-x-6 gap-y-4'>
            <Field label='เพศ' value={patient.sex} />
            <Field label='อายุ' value={patient.age} />
            <Field label='เลขบัตรประชาชน' value={patient.nationalId} />
            <Field label='หมู่เลือด' value={patient.bloodType} />
            <Field label='ประเภท' value={patient.patientType} />
            <Field label='แพทย์เจ้าของคนไข้' value={patient.doctor} />
            <div className='col-span-2 lg:col-span-3 xl:col-span-4'>
              <Field label='สิทธิ์การรักษา' value={patient.insurance} />
            </div>
            <div className='col-span-2 lg:col-span-3 xl:col-span-2'>
              <Field label='ที่อยู่' value={patient.address} />
            </div>
          </div>
        )}
      </div>

      {/* Figma 150:33649 / 343:5629 — แพ้ยา + โรคประจำตัว row stays
         visible across all 7 treatment steps and across the parallax
         compact/full swap so clinicians never lose sight of allergies
         and chronic conditions while charting. */}
      {showAlertRow && (
        <div
          className='flex w-full flex-wrap'
          style={{
            gap: 'var(--dim-space-600, 24px)',
            marginTop: compact ? 'var(--dim-space-300, 12px)' : 'var(--dim-space-400, 16px)',
            paddingBottom: compact ? 'var(--dim-space-400, 16px)' : 0,
            transition: `margin-top ${T}, padding-bottom ${T}`,
          }}
        >
          <AlertBadgeColumn label='แพ้ยา' items={allergiesList} compact={compact} />
          <AlertBadgeColumn label='โรคประจำตัว' items={diseasesList} compact={compact} />
        </div>
      )}
    </div>
    </>
  );
};

export default PatientCard;
