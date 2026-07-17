import React from 'react';
import { Sym } from './Sym';
import { BrandSubdueButton } from '@/components/mobile';
import ColorfulBadge from '@/components/badge/ColorfulBadge';

/* MIH Mobile · Doctor Card — Figma DS "Card / Doctor" (E5DppVK8yi0EKJp1SUuKa9 · 1:703).

   A doctor row/summary: optional "แพทย์ผู้รักษา" header · 48px avatar ·
   Title + up to three labelled subtexts (แผนก / เลขใบประกอบวิชาชีพ / ศูนย์) ·
   teal คิวว่าง badge · "เปลี่ยน" action · selection checkbox. Every part is a
   toggle so the same component serves the doctor-selection list (no header /
   no button) and the chosen-doctor summary (header + เปลี่ยน).

   The "ไม่ระบุแพทย์" variant (Figma 371:42789) sets `anyone` — swaps in the
   curated no-doctor avatar and a plain helper subtitle instead of the labelled
   rows.

   States (Figma Card state set):
     Default  — surface/card/100        · 1px border/brandprimary/quaternary (#E2F3EB)
     Pressed  — surface/card/brand-100  · 1px border/brandprimary/tertiary   (#C5EDDA)  ← tap-down
     Selected — surface/card/100        · 2px border/brandprimary/default    (#007549)

   Tokens: dim/radius/600 (24) · dim/space/{400,200,100,050} · dim/stroke/{100,150,200} ·
   dim/size/{1000 (48 avatar),400 (20 checkbox)} · type/size/{base,sm} ·
   type/family/{heading-graphic2 (title), body (rest)} ·
   text/content/{default,secondary,tertiary}. */

const NO_DOCTOR_AVATAR = '/illustration/mobile/no-doctor-avatar.png';

const stateStyle = ({ selected, pressed }) => {
  if (pressed) {
    return {
      background: 'var(--surface-card-brand100, #F4FBF8)',
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

const Avatar = ({ src, anyone }) => (
  <span
    className='overflow-hidden shrink-0 inline-flex items-center justify-center'
    style={{
      width: 'var(--dim-size-1000, 48px)',
      height: 'var(--dim-size-1000, 48px)',
      borderRadius: 'var(--dim-radius-full)',
      background: 'var(--surface-neutral-tertiary, #F4F5F5)',
    }}
  >
    {src || anyone ? (
      <img
        src={src || NO_DOCTOR_AVATAR}
        alt=''
        width={48}
        height={48}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    ) : (
      <Sym name='stethoscope' size={24} color='var(--text-brandPrimary-default, #007549)' />
    )}
  </span>
);

/* Labelled subtext row — icon · "label:" (tertiary) · value (secondary). */
const SubRow = ({ icon, label, value }) => (
  <span className='flex items-center w-full min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
    <Sym name={icon} size={12} color='var(--text-content-tertiary, #858C92)' />
    {label && (
      <span
        className='shrink-0'
        style={{
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
      className='truncate'
      style={{
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-regular, 400)',
        color: 'var(--text-content-secondary, #636B72)',
        lineHeight: 1.5,
      }}
    >
      {value}
    </span>
  </span>
);

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

const DoctorCard = ({
  name,
  subtitle,          /* plain helper line (no icon) — used by the ไม่ระบุแพทย์ variant */
  dept,              /* แผนก: value */
  license,           /* เลขใบประกอบวิชาชีพ: value */
  centre,            /* ศูนย์: value */
  centreLabel = 'ศูนย์:',
  avatar,
  anyone = false,
  badgeLabel = 'คิวว่างวันนี้',
  changeLabel = 'เปลี่ยน',
  selected = false,
  checked = false,
  onClick,
  onChange,
  headerLabel = 'แพทย์ผู้รักษา',
  showHeader = false,
  showProfile = true,
  showTitle = true,
  showBadge = false,
  showButton = false,
  showCheckbox = false,
  className = '',
  style,
}) => {
  const [pressed, setPressed] = React.useState(false);
  const clear = () => setPressed(false);

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
        gap: 'var(--dim-space-100, 4px)',
        padding: 'var(--dim-space-400, 16px)',
        borderRadius: 'var(--dim-radius-600, 24px)',
        cursor: 'pointer',
        transition: 'background 120ms ease, border-color 120ms ease',
        ...stateStyle({ selected, pressed }),
        ...style,
      }}
    >
      {showHeader && (
        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            fontWeight: 'var(--type-weight-regular, 400)',
            color: 'var(--text-content-tertiary, #858C92)',
            lineHeight: 1.5,
          }}
        >
          {headerLabel}
        </span>
      )}

      <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
        {showProfile && <Avatar src={avatar} anyone={anyone} />}

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
            {subtitle && (
              <span
                style={{
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm, 14px)',
                  fontWeight: 'var(--type-weight-regular, 400)',
                  color: 'var(--text-content-tertiary, #858C92)',
                  lineHeight: 1.5,
                }}
              >
                {subtitle}
              </span>
            )}
            {dept && <SubRow icon='stethoscope' label='แผนก:' value={dept} />}
            {license && <SubRow icon='description' label='เลขใบประกอบวิชาชีพ:' value={license} />}
            {centre && <SubRow icon='location_on' label={centreLabel} value={centre} />}
          </div>

          {showBadge && (
            <span>
              <ColorfulBadge style='teal' size='small' hierarchy='secondary' width='hug' icon='schedule'>
                {badgeLabel}
              </ColorfulBadge>
            </span>
          )}

          {showButton && (
            <span>
              <BrandSubdueButton
                variant='outline'
                size='sm'
                leadingIcon='swap_horiz'
                onClick={(e) => { e.stopPropagation(); onChange?.(); }}
              >
                {changeLabel}
              </BrandSubdueButton>
            </span>
          )}
        </div>

        {showCheckbox && <CardCheckbox checked={checked || selected} />}
      </div>
    </button>
  );
};

export default DoctorCard;
