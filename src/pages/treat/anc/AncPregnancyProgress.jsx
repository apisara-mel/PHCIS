import React from 'react';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Tooltip from '@/components/tooltip/Tooltip';
import {
  calculateGestationalAge, calculateEDC, formatAncDate, resolveAncRiskLevel,
} from '@/data/ancVisits';

/* Recommended activities per gestational-age band — same tier boundaries
   as `getAncVisitTier` (ancVisits.js) and the official manual's trimester
   activity table (pp.4-8), condensed to a hover suggestion rather than
   every catalog item verbatim. */
const PERIOD_SUGGESTIONS = [
  {
    from: 0, to: 12, label: 'ก่อน 12 สัปดาห์',
    items: [
      'Lab ครั้งที่ 1 (CBC/หมู่เลือด/VDRL/Anti-HIV/HBsAg)',
      'ตรวจปัสสาวะ',
      'คัดกรองดาวน์ซินโดรม + ธาลัสซีเมีย',
    ],
  },
  {
    from: 12, to: 20, label: '12-19 สัปดาห์',
    items: [
      'คัดกรองดาวน์ซินโดรม (14-18 สัปดาห์)',
      'Ultrasound ครั้งที่ 2 (20 สัปดาห์)',
    ],
  },
  {
    from: 20, to: 28, label: '20-27 สัปดาห์',
    items: [
      'คัดกรองเบาหวาน GCT (24-28 สัปดาห์)',
    ],
  },
  {
    from: 28, to: 40, label: '28-40 สัปดาห์',
    items: [
      'Lab ครั้งที่ 2',
      'ยืนยันเบาหวาน OGTT (30 สัปดาห์)',
      'วัคซีน dT/Tdap, ไข้หวัดใหญ่, Covid-19',
      'ยาเสริมธาตุเหล็ก/โฟลิก/ไอโอดีน/แคลเซียม',
      'Ultrasound ครั้งที่ 3 (34 สัปดาห์)',
      'NST + ตรวจน้ำคร่ำ (40 สัปดาห์)',
    ],
  },
];

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
          {/* Thin weekly tick marks — a ruler reading of the 0-40 week
              scale, on top of both the filled and unfilled portions.
              `multiply` blend keeps them visible against the green fill
              AND the light grey track without needing two tick colours. */}
          {Array.from({ length: 39 }, (_, i) => i + 1).map((w) => (
            <div
              key={w}
              className='absolute'
              style={{
                left: pctOf(w),
                top: 0,
                width: 1,
                height: '100%',
                background: 'rgba(0, 0, 0, 0.16)',
                mixBlendMode: 'multiply',
                transform: 'translateX(-50%)',
                pointerEvents: 'none',
              }}
            />
          ))}
        </div>

        {/* Hover suggestion zones — one per gestational-age band, each
            showing what should be checked/ordered during that period
            (matches getAncVisitTier's boundaries). Spans the full row
            height (not just the thin track) so the hit target is easy
            to land on, not just an 8px-tall strip. */}
        {PERIOD_SUGGESTIONS.map((p) => (
          <div
            key={p.label}
            className='absolute'
            style={{
              left: pctOf(p.from),
              width: `${((Math.min(p.to, 40) - p.from) / 40) * 100}%`,
              top: 0,
              height: 44,
              cursor: 'help',
            }}
          >
            <Tooltip
              position='top'
              maxWidth={280}
              className='w-full h-full'
              content={
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 'var(--type-weight-bold, 700)', marginBottom: 4 }}>
                    {p.label} — แนะนำตรวจ
                  </div>
                  {p.items.map((item) => (
                    <div key={item}>• {item}</div>
                  ))}
                </div>
              }
            >
              <div style={{ width: '100%', height: '100%' }} />
            </Tooltip>
          </div>
        ))}

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
