import React from 'react';
import Icon from '@/components/icons/Icon';
import SharedBadge from '@/components/badge/Badge';

/* MIH VitalReadingCard — read-only display variant of the vital card family,
   covering Figma "MIH Design System · Card" nodes:
     • 17:1504 "vital card"            — borderless / no padding (used inside other panels)
     • 17:1458 "vital card with Border" — 1px border + 12px padding (standalone card)
   Each set has 4 prop combinations: horizontal × type (vital card | vitalCard-bmi).

   This component is intentionally distinct from the interactive `<VitalCard>`
   (which embeds an input + ± stepper for clinician data entry). VitalReadingCard
   is for display surfaces: dashboards, summary panels, the Step 2 read-only
   header in Treatment, etc.

   Tokens (design.md §3/§4):
     surface/card/100              → --surface-card-100 (#FFFFFF)
     border/card/default           → --border-card-default (#E2E4E6)
     surface/brandprimary/quaternary → --surface-brandPrimary-quaternary (icon circle)
     dimension/radius/400          → --dim-radius-400 (12 px — Figma --sds-size-radius-200)
     dimension/space/200           → --dim-space-200 (8 px — gap between icon/reading/badge)
     dimension/space/300           → --dim-space-300 (12 px — inner padding when bordered)
     dimension/size/700            → --dim-size-700 (36 px — icon circle size)
     dimension/size/400            → --dim-size-400 (20 px — icon glyph)
     text/content/tertiary         → --text-content-tertiary (#858C92 — label)
     text/content/default          → --text-content-default (#363B3F — value)
     type/size/xs                  → --type-size-xs (12 px — label)
     type/size/base                → --type-size-base (16 px — value) */

const ICON_CIRCLE_STYLE = {
  width: 'var(--dim-size-700, 36px)',
  height: 'var(--dim-size-700, 36px)',
  borderRadius: 'var(--dim-radius-full, 9999px)',
  background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const READING_LABEL_STYLE = {
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs, 12px)',
  fontWeight: 'var(--type-weight-medium, 500)',
  lineHeight: 1.5,
  color: 'var(--text-content-tertiary, #858C92)',
};

const READING_VALUE_STYLE = {
  fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
  fontSize: 'var(--type-size-base, 16px)',
  fontWeight: 'var(--type-weight-bold, 700)',
  lineHeight: 1.5,
  color: 'var(--text-content-default, #363B3F)',
};

const Reading = ({ label, value, align = 'start' }) => (
  <div
    className='flex flex-col min-w-0'
    style={{ alignItems: align === 'center' ? 'center' : 'flex-start', flex: '1 1 0%' }}
  >
    <span style={{ ...READING_LABEL_STYLE, textAlign: align }}>{label}</span>
    <span style={{ ...READING_VALUE_STYLE, textAlign: align }}>{value}</span>
  </div>
);

/* Gauge bar with marker for BMI variants. The gradient maps to the
   clinical BMI scale (blue=underweight → red=obese). Marker position
   is a percentage of the bar width. */
const GaugeBar = ({ markerPercent = 50, labels }) => (
  <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-100, 4px)' }}>
    <div
      className='relative w-full'
      style={{
        height: 'var(--dim-space-200, 8px)',
        borderRadius: 'var(--dim-radius-100, 4px)',
        background:
          'linear-gradient(90deg, rgb(37,128,234) 0%, rgb(5,182,152) 25%, rgb(240,192,61) 55%, rgb(244,105,40) 75%, rgb(199,33,33) 100%)',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: `calc(${markerPercent}% - 5px)`,
          top: -1,
          width: 10,
          height: 10,
          borderRadius: 'var(--dim-radius-full, 9999px)',
          background: 'var(--surface-card-100)',
          border: '2px solid var(--text-content-default, #363B3F)',
          boxSizing: 'border-box',
        }}
      />
    </div>
    {labels && (
      <div
        className='flex justify-between w-full'
        style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: '9px',
          lineHeight: 'normal',
          color: 'var(--text-content-tertiary, #858C92)',
        }}
      >
        {labels.map((l) => <span key={l}>{l}</span>)}
      </div>
    )}
  </div>
);

const VitalReadingCard = ({
  /* Figma toggles */
  horizontal = true,
  bordered = true,
  showIcon = true,
  showBadge = true,
  type = 'reading', // 'reading' | 'bmi'

  /* Content */
  iconName = 'thermometer',
  label = 'อุณหภูมิ',
  value = '36.8',
  badge, // { tone: 'success' | 'warning' | 'error' | 'info', label: 'ปกติ' }

  /* BMI-only */
  bmiMarkerPercent = 50,
  bmiLabels = ['ผอม', 'ปกติ', 'น้ำหนักเกิน', 'อ้วน'],

  className = '',
  style = {},
}) => {
  const containerStyle = {
    background: 'var(--surface-card-100, #FFFFFF)',
    borderRadius: 'var(--dim-radius-400, 12px)',
    display: 'flex',
    flexDirection: horizontal ? 'row' : 'column',
    alignItems: horizontal ? 'center' : 'center',
    gap: 'var(--dim-space-200, 8px)',
    boxSizing: 'border-box',
    width: horizontal ? 215 : 130,
    ...(bordered && {
      border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default, #E2E4E6)',
      padding: 'var(--dim-space-300, 12px)',
    }),
    ...style,
  };

  const renderIcon = showIcon && (
    <span aria-hidden style={ICON_CIRCLE_STYLE}>
      <Icon name={iconName} size={20} color='var(--text-brandPrimary-default)' />
    </span>
  );

  const renderBadge = showBadge && badge && (
    <SharedBadge style={badge.tone || 'success'} size='small'>
      {badge.label || 'ปกติ'}
    </SharedBadge>
  );

  /* Layout matrix (matches Figma 17:1504 / 17:1458 variants):
       reading + horizontal      → [icon] [label/value flex-1] [badge]
       reading + vertical        → centered stack: icon → label → value → badge
       bmi     + horizontal      → row: [icon] [label/value] [badge]
                                   + GaugeBar across full width below
       bmi     + vertical        → centered stack: icon → label → value → GaugeBar → badge */
  if (type === 'bmi' && horizontal) {
    return (
      <div className={className} style={{ ...containerStyle, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
        <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {renderIcon}
          <Reading label={label} value={value} />
          {renderBadge}
        </div>
        <GaugeBar markerPercent={bmiMarkerPercent} labels={bmiLabels} />
      </div>
    );
  }

  if (type === 'bmi' && !horizontal) {
    return (
      <div className={className} style={containerStyle}>
        {renderIcon}
        <Reading label={label} value={value} align='center' />
        <GaugeBar markerPercent={bmiMarkerPercent} />
        {renderBadge}
      </div>
    );
  }

  /* type === 'reading' */
  return (
    <div className={className} style={containerStyle}>
      {renderIcon}
      <Reading label={label} value={value} align={horizontal ? 'start' : 'center'} />
      {horizontal ? renderBadge : <div>{renderBadge}</div>}
    </div>
  );
};

export default VitalReadingCard;
