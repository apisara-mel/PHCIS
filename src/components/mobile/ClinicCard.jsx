import React from 'react';
import { Sym } from './Sym';
import { BrandSubdueButton } from '@/components/mobile';
import ColorfulBadge from '@/components/badge/ColorfulBadge';

/* MIH Mobile · Clinic Card — Figma DS "Card / Clinic" (E5DppVK8yi0EKJp1SUuKa9 · 39:197).

   A selectable service-centre row: [ศูนย์ number badge] · Title + distance +
   คิวว่าง badge + checkbox, an indented เวลาทำการ block (3 labelled rows), and a
   ดูแผนที่ action. Toggles mirror the Figma component props (showNumber,
   showTextGroupAndBadge, showTitle, showSubtext, showBadge, plus showCheckbox /
   showMap which the booking flow drives).

   States (Figma Card state set):
     Default  — surface/card/100        · 1px border/brandprimary/quaternary (#E2F3EB)
     Pressed  — surface/card/brand-100  · 1px border/brandprimary/tertiary   (#C5EDDA)  ← tap-down
     Selected — surface/card/100        · 2px border/brandprimary/default    (#007549)
   `selected` drives Selected; the internal pointer state drives Pressed and wins
   while held (same contract as OptionCard / NavigationMenu).

   Tokens: dim/radius/500 (16 — card) · dim/radius/500 (16 — number badge) ·
   dim/space/{400,200,150,100} · dim/stroke/{100,150,200} · type/size/{base,sm,lg,xs} ·
   type/family/{heading-graphic2 (title), body (rest)} · text/content/{default,secondary,tertiary} ·
   color/sky-cyan/700 (badge number). Number-badge fill is a gradient (token exception). */

/* Figma "Container Text 400" — 141° cyan gradient behind the ศูนย์ number. */
const NUMBER_BADGE_GRADIENT =
  'linear-gradient(141.34deg, #D2F6FB 14.844%, #ABDDE4 86.024%)';

const stateStyle = ({ selected, pressed }) => {
  if (pressed) {
    return {
      background: 'var(--surface-card-brand-100, #F4FBF8)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-tertiary, #C5EDDA)',
    };
  }
  if (selected) {
    return {
      background: 'var(--surface-card-100, #FFFFFF)',
      border: 'var(--dim-stroke-200, 2px) solid var(--border-brandPrimary-default, #007549)',
    };
  }
  return {
    background: 'var(--surface-card-100, #FFFFFF)',
    border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
  };
};

/* 52×52 gradient tile: "ศูนย์" over the centre number. */
const NumberBadge = ({ number }) => (
  <div
    className='flex flex-col items-center justify-center overflow-hidden shrink-0'
    style={{
      width: 52,
      height: 52,
      borderRadius: 'var(--dim-radius-500, 16px)',
      padding: 'var(--dim-space-100, 4px)',
      background: NUMBER_BADGE_GRADIENT,
      color: 'var(--color-sky-cyan-700, #0859A8)',
      lineHeight: 1.5,
    }}
  >
    <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', fontWeight: 'var(--type-weight-medium, 500)', marginBottom: -4 }}>
      ศูนย์
    </span>
    <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-lg, 18px)', fontWeight: 'var(--type-weight-bold, 700)' }}>
      {number}
    </span>
  </div>
);

/* Figma Checkbox 6:104 (Default) — unchecked box; checked shows the brand tick. */
const CardCheckbox = ({ checked }) => (
  <span
    className='inline-flex items-center justify-center shrink-0'
    aria-hidden
    style={{
      width: 'var(--dim-size-400, 20px)',
      height: 'var(--dim-size-400, 20px)',
      borderRadius: 'var(--dim-radius-100, 4px)',
      border: checked
        ? 'var(--dim-stroke-150, 1.5px) solid var(--border-brandPrimary-default, #007549)'
        : 'var(--dim-stroke-150, 1.5px) solid var(--border-switch-default, #C9CDD0)',
      background: checked
        ? 'var(--surface-brandPrimary-default, #007549)'
        : 'var(--surface-switch-default, #FFFFFF)',
    }}
  >
    {checked && <Sym name='check' size={14} color='#FFFFFF' fill />}
  </span>
);

const HoursRow = ({ label, time }) => (
  <div className='flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
    <Sym name='schedule' size={12} color='var(--text-content-tertiary, #858C92)' />
    {label && (
      <span
        style={{
          minWidth: 76,
          whiteSpace: 'nowrap',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm, 14px)',
          fontWeight: 'var(--type-weight-regular, 400)',
          color: 'var(--text-content-tertiary, #858C92)',
          lineHeight: 1.5,
        }}
      >
        {label}
      </span>
    )}
    <span
      style={{
        flex: 1,
        minWidth: 0,
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-regular, 400)',
        color: 'var(--text-content-tertiary, #858C92)',
        lineHeight: 1.5,
      }}
    >
      {time}
    </span>
  </div>
);

const ClinicCard = ({
  number,
  name,
  distanceKm,
  hoursRows,
  badgeLabel = 'พรุ่งนี้มีคิวว่าง',
  selected = false,
  checked = false,
  onClick,
  onMap,
  mapLabel = 'ดูแผนที่',
  showNumber = true,
  showTextGroupAndBadge = true,
  showTitle = true,
  showSubtext = true,
  showBadge = true,
  showCheckbox = true,
  showHours = true,
  showMap = true,
  className = '',
  style,
}) => {
  const [pressed, setPressed] = React.useState(false);
  const clear = () => setPressed(false);
  /* Time + map blocks align under the title — 52px badge + 16px gap = 68px. */
  const indent = showNumber ? 68 : 0;

  return (
    <button
      type='button'
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
      aria-pressed={selected}
      className={`flex flex-col w-full text-left ${className}`.trim()}
      style={{
        gap: 'var(--dim-space-200, 8px)',
        padding: 'var(--dim-space-400, 16px)',
        borderRadius: 'var(--dim-radius-500, 16px)',
        cursor: 'pointer',
        transition: 'background 120ms ease, border-color 120ms ease',
        ...stateStyle({ selected, pressed }),
        ...style,
      }}
    >
      {/* Top group: number · text+badge · checkbox */}
      <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
        {showNumber && <NumberBadge number={number} />}

        {showTextGroupAndBadge && (
          <div className='flex flex-col min-w-0' style={{ flex: 1, gap: 'var(--dim-space-200, 8px)' }}>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
              {showTitle && (
                <span
                  style={{
                    fontFamily: 'var(--type-family-heading-graphic2)',
                    fontSize: 'var(--type-size-base, 16px)',
                    fontWeight: 'var(--type-weight-regular, 400)',
                    color: 'var(--text-content-default, #111314)',
                    lineHeight: 1.5,
                  }}
                >
                  {name}
                </span>
              )}
              {showSubtext && distanceKm != null && (
                <span className='flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                  <Sym name='location_on' size={12} color='var(--text-content-tertiary, #858C92)' />
                  <span
                    style={{
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-sm, 14px)',
                      fontWeight: 'var(--type-weight-regular, 400)',
                      color: 'var(--text-content-tertiary, #858C92)',
                      lineHeight: 1.5,
                    }}
                  >
                    {distanceKm} กม.
                  </span>
                </span>
              )}
            </div>
          </div>
        )}

        {showBadge && badgeLabel && (
          <span className='shrink-0'>
            <ColorfulBadge style='teal' size='small' hierarchy='secondary' width='hug'>
              {badgeLabel}
            </ColorfulBadge>
          </span>
        )}

        {showCheckbox && <CardCheckbox checked={checked || selected} />}
      </div>

      {/* เวลาทำการ — indented under the title */}
      {showHours && hoursRows && hoursRows.length > 0 && (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)', paddingLeft: indent }}>
          <span
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
              fontWeight: 'var(--type-weight-bold, 700)',
              color: 'var(--text-content-secondary, #636B72)',
              lineHeight: 1.5,
            }}
          >
            เวลาทำการ
          </span>
          {hoursRows.map((row) => {
            const label = typeof row === 'object' ? row.label : null;
            const time = typeof row === 'object' ? row.time : row;
            return <HoursRow key={`${label || ''}-${time}`} label={label} time={time} />;
          })}
        </div>
      )}

      {/* ดูแผนที่ */}
      {showMap && (
        <div style={{ paddingLeft: indent }}>
          <BrandSubdueButton
            variant='outline'
            size='Small'
            fullWidth={false}
            leadingIcon='location_on'
            onClick={(e) => { e.stopPropagation(); onMap?.(); }}
          >
            {mapLabel}
          </BrandSubdueButton>
        </div>
      )}
    </button>
  );
};

export default ClinicCard;
