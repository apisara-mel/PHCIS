import React from 'react';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import {
  calculateGestationalAge, calculateEDC, formatAncDate, resolveAncRiskLevel,
} from '@/data/ancVisits';

/* AncPregnancyProgress — sits between PatientCard and the step shell on
   every ANC step, so gestational-age context (คิวคิ trimester 1/2/3, current
   GA marker, EDC) never scrolls out of view while charting. Matches the
   card-mockup layout: G/P/A + GA + PDPA/risk badges above a 0-40 week
   trimester timeline (boundaries at 12/28 wks per the official manual's
   trimester table, pp.4-8). Renders nothing until an LMP is on file — there
   is no gestational age to show before then. */

const parseAgeYears = (ageStr) => {
  const m = /(\d+)\s*ปี/.exec(ageStr || '');
  return m ? Number(m[1]) : null;
};

const clampWeeks = (w) => Math.max(0, Math.min(40, w));
const pctOf = (w) => `${(clampWeeks(w) / 40) * 100}%`;

const tickLabelStyle = {
  position: 'absolute',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs, 12px)',
  color: 'var(--text-content-tertiary, #858c92)',
  whiteSpace: 'nowrap',
};

const AncPregnancyProgress = ({ form, cardPatient }) => {
  const ga = calculateGestationalAge(form?.lmp);
  if (!ga) return null;

  const edc = calculateEDC(form?.lmp);
  const gestWeeks = ga.weeks + ga.days / 7;

  const ageYears = parseAgeYears(cardPatient?.age);
  const isMinor = ageYears !== null && ageYears < 18;
  const riskInfo = resolveAncRiskLevel(form?.riskLevel);
  const dangerActive = Object.values(form?.dangerSigns || {}).some(Boolean);
  const gdmConfirmed = !!form?.gdmConfirmed;

  const gpaLabel = `G${form?.gravida || '-'} P${form?.para || '-'} A${form?.abortion || '0'}`;
  const gaLabel = `GA ${ga.weeks}${ga.days ? `+${ga.days}` : ''} สัปดาห์`;

  return (
    <div
      className='w-full'
      style={{
        background: 'var(--surface-card-100, #FFFFFF)',
        borderRadius: 'var(--dim-radius-300, 10px)',
        boxShadow: 'var(--shadow-card)',
        padding: 'var(--dim-space-400, 16px) var(--dim-space-600, 24px)',
        margin: 'var(--dim-space-400, 16px) var(--dim-space-600, 24px) 0',
        width: 'auto',
      }}
    >
      {/* Badges — G/P/A · GA · minor-consent (PDPA) · risk level · danger signs · GDM */}
      <div
        className='flex flex-wrap items-center'
        style={{ gap: 'var(--dim-space-200, 8px)', marginBottom: 'var(--dim-space-500, 20px)' }}
      >
        <ColorfulBadge style='green' width='hug'>{gpaLabel}</ColorfulBadge>
        <ColorfulBadge style='blue' width='hug'>{gaLabel}</ColorfulBadge>
        {isMinor && (
          <ColorfulBadge style='yellow' width='hug'>
            อายุ &lt;18 → ยินยอมโดยผู้ปกครอง (PDPA)
          </ColorfulBadge>
        )}
        {riskInfo && riskInfo.value !== 'low' && (
          <ColorfulBadge style={riskInfo.value === 'high' ? 'red' : 'yellow'} width='hug'>
            {riskInfo.label}
          </ColorfulBadge>
        )}
        {dangerActive && (
          <ColorfulBadge style='red' width='hug' showDot>พบสัญญาณอันตราย — ควรส่งต่อ</ColorfulBadge>
        )}
        {gdmConfirmed && (
          <ColorfulBadge style='red' width='hug'>GDM+</ColorfulBadge>
        )}
      </div>

      {/* Trimester timeline — 0 to 40 weeks, marker at current GA */}
      <div className='relative w-full' style={{ height: 44 }}>
        <div
          className='absolute flex flex-col items-center'
          style={{ left: pctOf(gestWeeks), transform: 'translateX(-50%)', top: 0 }}
        >
          <span
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs, 12px)',
              fontWeight: 'var(--type-weight-bold, 700)',
              color: 'var(--text-brandPrimary-default, #007549)',
              whiteSpace: 'nowrap',
            }}
          >
            ▲ {gaLabel}
          </span>
        </div>

        <div
          className='absolute w-full'
          style={{
            top: 24,
            height: 8,
            borderRadius: 'var(--dim-radius-full, 9999px)',
            background: 'var(--surface-neutralButton-tertiary, #F4F5F5)',
          }}
        >
          <div
            style={{
              height: '100%',
              width: pctOf(gestWeeks),
              borderRadius: 'var(--dim-radius-full, 9999px)',
              background: 'var(--surface-brandPrimary-default, #007549)',
              transition: 'width 300ms ease',
            }}
          />
        </div>

        <span style={{ ...tickLabelStyle, top: 36, left: pctOf(0) }}>ไตรมาส 1</span>
        <span style={{ ...tickLabelStyle, top: 36, left: pctOf(12), transform: 'translateX(-50%)' }}>12</span>
        <span style={{ ...tickLabelStyle, top: 36, left: pctOf(28), transform: 'translateX(-50%)' }}>28</span>
        <span style={{ ...tickLabelStyle, top: 36, left: pctOf(30), transform: 'translateX(-50%)' }}>ไตรมาส 3</span>
        <span style={{ ...tickLabelStyle, top: 36, left: pctOf(40), transform: 'translateX(-100%)' }}>
          ครบกำหนด {edc ? formatAncDate(edc) : '—'}
        </span>
      </div>
    </div>
  );
};

export default AncPregnancyProgress;
