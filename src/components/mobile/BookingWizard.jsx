import React from 'react';
import { useHistory } from 'react-router-dom';
import { Sym } from './Sym';
import { BrandButton, BrandSubdueButton } from '@/components/mobile';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Icon from '@/components/icons/Icon';
import MobileIconBadge from './MobileIconBadge';
import { resolveDoctorAvatar } from '@/data/mobileMock';

/* Figma Mobile Application · Booking wizard
   Archive 4WXeI8fgBLQGgQ9VheM2yD · 173:82969
   Pre-step (no stepper): ประเภทบริการ 58:26028
   Then 5-step: แผนก → ศูนย์ → แพทย์ → วัน/เวลา → ยืนยัน */

export const BOOKING_TOTAL = 5;

export const BOOKING_STEP_META = {
  dept:     { n: 1, label: 'แผนก', title: 'เลือกแผนก' },
  centre:   { n: 2, label: 'ศูนย์บริการ', title: 'เลือกศูนย์บริการ' },
  doctor:   { n: 3, label: 'เลือกแพทย์', title: 'เลือกแพทย์' },
  date:     { n: 4, label: 'เลือกวันที่', title: 'เลือกวันที่' },
  time:     { n: 4, label: 'เลือกเวลา', title: 'เลือกเวลา' },
  datetime: { n: 4, label: 'เลือกเวลา', title: 'เลือกวันและเวลา' },
  confirm:  { n: 5, label: 'ยืนยัน', title: 'ยืนยันการจอง' },
};

const SCREEN_BG = 'var(--background-screen-brand-100, #F4FBF8)';

export const BookingStepper = ({ stepKey }) => {
  const meta = BOOKING_STEP_META[stepKey];
  if (!meta) return null;
  return (
    <div style={{ padding: '0 0 var(--dim-space-400, 16px)' }}>
      <div className='flex items-end justify-between' style={{ marginBottom: 'var(--dim-space-300, 12px)' }}>
        <span style={{
          fontFamily: 'var(--type-family-heading-graphic2)',
          fontSize: 'var(--type-size-sm, 14px)',
          color: 'var(--text-brandPrimary-default, #007549)',
        }}
        >
          ขั้นตอนที่ {meta.n} จาก {BOOKING_TOTAL}
        </span>
        <span style={{
          fontFamily: 'var(--type-family-heading-graphic2)',
          fontSize: 'var(--type-size-xs, 12px)',
          color: 'var(--text-brandPrimary-default, #007549)',
        }}
        >
          {meta.label}
        </span>
      </div>
      <div className='flex' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        {Array.from({ length: BOOKING_TOTAL }).map((_, i) => (
          <span
            key={i}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 'var(--dim-radius-100, 4px)',
              background: i < meta.n
                ? 'var(--surface-positive-default, #196C65)'
                : 'var(--surface-brandPrimary-tertiary, #E2F3EB)',
            }}
          />
        ))}
      </div>
    </div>
  );
};

export const BookingHeader = ({ title, onBack }) => {
  const history = useHistory();
  const handleBack = onBack || (() => history.goBack());
  return (
    <div
      className='flex items-center shrink-0'
      style={{
        height: 68,
        padding: '0 var(--dim-space-200, 8px)',
        background: 'var(--surface-navigation-default, #FFFFFF)',
        borderBottom: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
        boxShadow: 'var(--shadow-brand-drop-bottom-100)',
        gap: 'var(--dim-space-300, 12px)',
      }}
    >
      <button
        type='button'
        onClick={handleBack}
        aria-label='ย้อนกลับ'
        style={{
          width: 40, height: 40, borderRadius: 'var(--dim-radius-full)',
          border: 0, background: 'transparent', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-content-default)',
        }}
      >
        <Sym name='chevron_left' size={24} />
      </button>
      <span style={{
        flex: 1,
        textAlign: 'center',
        fontFamily: 'var(--type-family-heading-graphic2)',
        fontSize: 'var(--type-size-base, 16px)',
        color: 'var(--text-content-default)',
      }}
      >
        {title}
      </span>
      <span style={{ width: 40 }} aria-hidden />
    </div>
  );
};

export const BookingFooter = ({ label, disabled, onClick }) => (
  <div
    className='shrink-0'
    style={{
      padding: 'var(--dim-space-400, 16px)',
      background: 'var(--surface-card-100, #FFFFFF)',
      borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
      boxShadow: 'var(--shadow-brand-drop-top-100)',
    }}
  >
    <BrandButton
      variant='fill'
      size='lg'
      trailingIcon='chevron_right'
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </BrandButton>
  </div>
);

/* Booking white card panel — Figma booking-flow "Search Header" / "Latest
   location" containers (246:30618 / 246:30622). Two title variants:
     • hero    (default) — centered xl-20 Medium green heading (search header)
     • section           — left lg-18 Regular green heading + optional right slot
                           (list sections: "…ที่ใช้บริการล่าสุด" / "…ทั้งหมด")
   Section panels carry a 12px inner gap (Figma dimension/space/300); hero
   keeps the 16px gap. */
export const BookingPanel = ({
  title,
  variant = 'hero',
  titleRight,
  titleWeight = 'medium',
  gap,
  children,
  style,
}) => {
  const section = variant === 'section';
  return (
    <div
      style={{
        background: 'var(--surface-card-100, #FFFFFF)',
        borderRadius: 'var(--dim-radius-600, 24px)',
        boxShadow: 'var(--shadow-brand-drop-bottom-200)',
        padding: 'var(--dim-space-400, 16px)',
        display: 'flex',
        flexDirection: 'column',
        gap: gap || (section ? 'var(--dim-space-300, 12px)' : 'var(--dim-space-400, 16px)'),
        ...style,
      }}
    >
      {title && !section && (
        <h2 style={{
          margin: 0,
          textAlign: 'center',
          fontFamily: 'var(--type-family-heading-graphic2)',
          fontSize: 'var(--type-size-xl, 20px)',
          fontWeight: titleWeight === 'regular'
            ? 'var(--type-weight-regular, 400)'
            : 'var(--type-weight-medium, 500)',
          color: 'var(--text-brandPrimary-default, #007549)',
          lineHeight: 1.375,
        }}
        >
          {title}
        </h2>
      )}
      {title && section && (
        <div className='flex items-center justify-between' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <h3 style={{
            margin: 0,
            fontFamily: 'var(--type-family-heading-graphic2)',
            fontSize: 'var(--type-size-lg, 18px)',
            fontWeight: 'var(--type-weight-regular, 400)',
            color: 'var(--text-brandPrimary-default, #007549)',
            lineHeight: 1.5,
          }}
          >
            {title}
          </h3>
          {titleRight}
        </div>
      )}
      {children}
    </div>
  );
};

export const SectionLabel = ({ children, right }) => (
  <div className='flex items-center justify-between' style={{ gap: 'var(--dim-space-200, 8px)' }}>
    <h3 style={{
      margin: 0,
      fontFamily: 'var(--type-family-heading-graphic2)',
      fontSize: 'var(--type-size-sm, 14px)',
      color: 'var(--text-brandPrimary-default, #007549)',
    }}
    >
      {children}
    </h3>
    {right}
  </div>
);

/* Booking search box — Archive Mobile Application 127:8070. */
export const BookingSearchRow = ({
  placeholder,
  value = '',
  onChange,
  onFocus,
  onKeyDown,
  autoFocus = false,
  focused = false,
}) => {
  const inputRef = React.useRef(null);
  const filled = Boolean(String(value).trim());
  /* Figma Primary Search 2056:4074 / 4105 / 4183 / 4212:
     empty focused = Pressed (hover tokens), focused value = Typing. */
  const visualState = focused
    ? (filled ? 'typing' : 'hover')
    : filled
    ? 'filled'
    : 'default';
  const brandFallback = visualState === 'hover' || visualState === 'typing'
    ? '#007549'
    : '#08A768';
  const inputColor = `var(--text-primarysearch-${visualState}, ${visualState === 'default' ? '#ADB2B7' : '#4D5358'})`;

  return (
    <div
      className='flex items-center'
      onClick={() => inputRef.current?.focus()}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        height: 'var(--dim-size-1200, 56px)',
        padding: '0 var(--dim-space-600, 24px)',
        borderRadius: 'var(--dim-radius-full)',
        border: `var(--dim-stroke-200, 2px) solid var(--border-primarysearch-${visualState}, ${brandFallback})`,
        background: 'var(--surface-search-default, #FFFFFF)',
        boxShadow: 'var(--shadow-primarysearch, var(--shadow-brand-drop-bottom-200))',
        gap: 'var(--dim-space-400, 16px)',
        cursor: 'text',
      }}
    >
      <Icon
        name='search'
        size={20}
        style={{
          color: `var(--icon-primarysearch-${visualState}, ${brandFallback})`,
        }}
      />
      <input
        ref={inputRef}
        type='search'
        inputMode='search'
        enterKeyHint='search'
        className='mih-booking-search-input'
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={placeholder}
        style={{
          flex: 1,
          minWidth: 0,
          border: 0,
          outline: 'none',
          background: 'transparent',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm, 14px)',
          fontWeight: 'var(--type-weight-regular, 400)',
          lineHeight: 1.5,
          color: inputColor,
          '--booking-search-input-color': inputColor,
        }}
      />
    </div>
  );
};

if (typeof document !== 'undefined' && !document.getElementById('mih-booking-search-input-css')) {
  const style = document.createElement('style');
  style.id = 'mih-booking-search-input-css';
  style.textContent = `
.mih-booking-search-input,
.mih-booking-search-input:focus,
.mih-booking-search-input:focus-visible {
  caret-color: var(--text-content-default, #111314);
  border: 0 !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
.mih-booking-search-input::placeholder {
  color: var(--booking-search-input-color, var(--text-primarysearch-default, #ADB2B7));
  opacity: 1;
}`;
  document.head.appendChild(style);
}

export const InfoAlert = ({ children, icon = 'stethoscope' }) => (
  <div
    className='flex items-start'
    style={{
      gap: 'var(--dim-space-300, 12px)',
      padding: 'var(--dim-space-400, 16px)',
      background: 'var(--surface-alert-info, #F0F6FF)',
      border: 'var(--dim-stroke-100) solid var(--border-alert-info, #DBEAFE)',
      borderRadius: 'var(--dim-radius-600, 24px)',
    }}
  >
    <span className='inline-flex shrink-0' style={{ paddingTop: 'var(--dim-space-050, 2px)' }}>
      <Sym name={icon} size={16} color='var(--text-alert-info, #1D4ED8)' />
    </span>
    <p style={{
      margin: 0,
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-xs, 12px)',
      fontWeight: 'var(--type-weight-medium, 500)',
      color: 'var(--text-alert-info, #1D4ED8)',
      lineHeight: 1.5,
    }}
    >
      {children}
    </p>
  </div>
);

export const DeptCard = ({ title, subtitle, selected, onClick, compact }) => (
  <button
    type='button'
    onClick={onClick}
    className='text-left'
    style={{
      width: compact ? undefined : '100%',
      flex: compact ? '0 0 200px' : undefined,
      padding: 'var(--dim-space-400, 16px)',
      borderRadius: 'var(--dim-radius-500, 16px)',
      border: selected
        ? 'var(--dim-stroke-200) solid var(--border-brandPrimary-default, #007549)'
        : 'var(--dim-stroke-100) solid var(--border-content-tertiary, #E1E3E5)',
      background: 'var(--surface-card-100, #FFFFFF)',
      boxShadow: 'var(--shadow-brand-drop-bottom-100)',
      cursor: 'pointer',
    }}
  >
    <p style={{
      margin: 0,
      fontFamily: 'var(--type-family-heading-graphic2)',
      fontSize: 'var(--type-size-base, 16px)',
      fontWeight: 'var(--type-weight-bold, 700)',
      color: 'var(--text-content-default)',
    }}
    >
      {title}
    </p>
    <p style={{
      margin: 'var(--dim-space-100, 4px) 0 0',
      fontSize: 'var(--type-size-sm, 14px)',
      color: 'var(--text-content-tertiary, #858C92)',
      lineHeight: 1.4,
    }}
    >
      {subtitle}
    </p>
  </button>
);

export const CentreNumberBadge = ({ number }) => (
  <div
    className='flex flex-col items-center justify-center shrink-0'
    style={{
      width: 52,
      height: 52,
      borderRadius: 'var(--dim-radius-200, 8px)',
      background: 'var(--surface-alert-info, #F0F6FF)',
      color: 'var(--text-alert-info, #1D4ED8)',
      padding: 'var(--dim-space-100, 4px)',
    }}
  >
    <span style={{ fontSize: 'var(--type-size-xs, 12px)', fontWeight: 'var(--type-weight-medium, 500)' }}>ศูนย์</span>
    <span style={{ fontSize: 'var(--type-size-lg, 18px)', fontWeight: 'var(--type-weight-bold, 700)', lineHeight: 1.2 }}>{number}</span>
  </div>
);

export const CentreListCard = ({
  number, name, distanceKm, hoursRows, availableTomorrow, selected, onClick, onMap,
}) => (
  <button
    type='button'
    onClick={onClick}
    className='flex flex-col w-full text-left'
    style={{
      gap: 'var(--dim-space-300, 12px)',
      padding: 'var(--dim-space-400, 16px)',
      borderRadius: 'var(--dim-radius-600, 24px)',
      border: selected
        ? 'var(--dim-stroke-200) solid var(--border-brandPrimary-default, #007549)'
        : 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
      background: 'var(--surface-card-100, #FFFFFF)',
      boxShadow: 'var(--shadow-brand-drop-bottom-200)',
      cursor: 'pointer',
      position: 'relative',
    }}
  >
    {availableTomorrow && (
      <span style={{ position: 'absolute', top: 12, right: 12 }}>
        <ColorfulBadge style='teal' size='small' hierarchy='secondary' width='hug'>
          พรุ่งนี้มีคิวว่าง
        </ColorfulBadge>
      </span>
    )}
    <div className='flex items-start' style={{ gap: 'var(--dim-space-300, 12px)' }}>
      <CentreNumberBadge number={number} />
      <div className='flex-1 min-w-0'>
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)', flexWrap: 'wrap' }}>
          <p style={{
            margin: 0,
            fontFamily: 'var(--type-family-heading-graphic2)',
            fontSize: 'var(--type-size-lg, 18px)',
            fontWeight: 'var(--type-weight-bold, 700)',
            color: 'var(--text-content-default)',
          }}
          >
            {name}
          </p>
          <span className='inline-flex items-center' style={{ gap: 2, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary)' }}>
            <Sym name='location_on' size={14} />
            {distanceKm} กม.
          </span>
        </div>
        <p style={{ margin: 'var(--dim-space-200, 8px) 0 var(--dim-space-100, 4px)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>
          เวลาทำการ
        </p>
        {(hoursRows || ['08.00-16.00น.']).map((row) => {
          /* Rows may be a plain time string, or { label, time } — Figma 125:5748
             aligns the times in a column after the period label. */
          const label = typeof row === 'object' ? row.label : null;
          const time = typeof row === 'object' ? row.time : row;
          return (
            <div key={`${label || ''}-${time}`} className='flex items-center' style={{ gap: 'var(--dim-space-150, 6px)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
              <Sym name='schedule' size={14} />
              {label && <span style={{ minWidth: 76 }}>{label}</span>}
              <span>{time}</span>
            </div>
          );
        })}
      </div>
    </div>
    <BrandSubdueButton
      variant='outline'
      size='sm'
      leadingIcon='location_on'
      onClick={(e) => { e.stopPropagation(); onMap?.(); }}
      style={{ width: '100%' }}
    >
      ดูแผนที่
    </BrandSubdueButton>
  </button>
);

export const DoctorListCard = ({
  name, specialty, license, centreName, avatar, selected, onClick, anyone,
}) => {
  const DetailLine = ({ icon, label, value }) => (
    <span
      className='flex items-center'
      style={{
        width: '100%',
        minWidth: 0,
        gap: 'var(--dim-space-100, 4px)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        lineHeight: 1.5,
      }}
    >
      <Sym name={icon} size={12} color='var(--text-content-tertiary, #858C92)' />
      {label && <span className='shrink-0' style={{ color: 'var(--text-content-tertiary, #858C92)' }}>{label}</span>}
      <span className='truncate' style={{ color: 'var(--text-content-secondary, #636B72)' }}>{value}</span>
    </span>
  );

  return (
    <button
      type='button'
      onClick={onClick}
      className='flex items-start w-full text-left'
      style={{
        gap: 'var(--dim-space-400, 16px)',
        padding: 'var(--dim-space-400, 16px)',
        borderRadius: 'var(--dim-radius-600, 24px)',
        border: selected
          ? 'var(--dim-stroke-200) solid var(--border-brandPrimary-default, #007549)'
          : 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
        background: 'var(--surface-card-100, #FFFFFF)',
        cursor: 'pointer',
      }}
    >
      <span
        className='inline-flex items-center justify-center shrink-0 overflow-hidden'
        style={{
          width: 'var(--dim-size-1000, 48px)',
          height: 'var(--dim-size-1000, 48px)',
          borderRadius: 'var(--dim-radius-full)',
          background: anyone ? 'var(--surface-colorfulbadge-pink, #FCE7F3)' : 'var(--surface-neutral-tertiary, #F4F5F5)',
        }}
      >
        {avatar ? (
          <img src={avatar} alt='' width={48} height={48} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Sym name={anyone ? 'person' : 'stethoscope'} size={24} color={anyone ? 'var(--text-colorfulbadge-pink, #BE185D)' : 'var(--text-brandPrimary-default)'} />
        )}
      </span>
      <span className='flex flex-1 flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
        <span style={{
          fontFamily: 'var(--type-family-heading-graphic2)',
          fontSize: 'var(--type-size-base, 16px)',
          color: 'var(--text-content-default)',
          lineHeight: 1.5,
        }}
        >
          {name}
        </span>
        {anyone ? (
          <>
            <span style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
              color: 'var(--text-content-tertiary, #858C92)',
              lineHeight: 1.5,
            }}
            >
              ระบบจะเลือกแพทย์ให้โดยอัตโนมัติ
            </span>
            {centreName && <DetailLine icon='location_on' label='ศูนย์:' value={centreName} />}
          </>
        ) : (
          <>
            {specialty && <DetailLine icon='stethoscope' label='แผนก:' value={specialty} />}
            {license && <DetailLine icon='description' label='เลขใบประกอบวิชาชีพ:' value={license} />}
            {centreName && <DetailLine icon='location_on' label='ศูนย์:' value={centreName} />}
          </>
        )}
      </span>
    </button>
  );
};

const DoctorSummaryDetail = ({ icon, label, value }) => (
  <span className='flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
    <Sym name={icon} size='var(--dim-size-200, 12px)' color='var(--text-content-tertiary, #858C92)' />
    <span
      style={{
        flexShrink: 0,
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-regular, 400)',
        color: 'var(--text-content-tertiary, #858C92)',
        lineHeight: 1.5,
      }}
    >
      {label}
    </span>
    <span
      style={{
        minWidth: 0,
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

export const DoctorSummaryCard = ({ doctor, centreName, onChange }) => {
  const avatarSrc = doctor?.anyone
    ? null
    : (doctor?.avatar || resolveDoctorAvatar(doctor?.name));

  return (
  <div
    style={{
      background: 'var(--surface-card-100, #FFFFFF)',
      borderRadius: 'var(--dim-radius-600, 24px)',
      boxShadow: 'var(--shadow-brand-drop-bottom-200)',
      padding: 'var(--dim-space-400, 16px)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--dim-space-100, 4px)',
    }}
  >
    <p style={{
      margin: 0,
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-sm, 14px)',
      fontWeight: 'var(--type-weight-regular, 400)',
      lineHeight: 1.5,
      color: 'var(--text-content-tertiary, #858C92)',
    }}
    >
      แพทย์ผู้รักษา
    </p>
    <div className='flex items-start' style={{ gap: 'var(--dim-space-400, 16px)' }}>
      <span
        className='overflow-hidden shrink-0'
        style={{
          width: 'var(--dim-size-1000, 48px)',
          height: 'var(--dim-size-1000, 48px)',
          borderRadius: 'var(--dim-radius-full, 9999px)',
        }}
      >
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt=''
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span
            className='inline-flex items-center justify-center'
            style={{
              width: 'var(--dim-size-1000, 48px)',
              height: 'var(--dim-size-1000, 48px)',
              background: 'var(--surface-colorfulbadge-pink, #FCE7F3)',
            }}
          >
            <Sym name='person' size={24} />
          </span>
        )}
      </span>
      <div
        className='flex flex-col min-w-0 flex-1'
        style={{ gap: 'var(--dim-space-200, 8px)' }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <p style={{
            margin: 0,
            fontFamily: 'var(--type-family-heading-graphic2)',
            fontSize: 'var(--type-size-base, 16px)',
            fontWeight: 'var(--type-weight-regular, 400)',
            lineHeight: 1.5,
            color: 'var(--text-content-default, #111314)',
          }}
          >
            {doctor?.name}
          </p>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
            <DoctorSummaryDetail icon='stethoscope' label='แผนก:' value={doctor?.specialty || '—'} />
            {doctor?.license && (
              <DoctorSummaryDetail icon='description' label='เลขใบประกอบวิชาชีพ:' value={doctor.license} />
            )}
            <DoctorSummaryDetail icon='location_on' label='ศูนย์:' value={centreName} />
          </div>
        </div>
        {onChange && (
          <BrandSubdueButton
            variant='Outline'
            size='Small'
            fullWidth={false}
            leadingIcon='swap_horiz'
            onClick={onChange}
            style={{ alignSelf: 'flex-start' }}
          >
            เปลี่ยน
          </BrandSubdueButton>
        )}
      </div>
    </div>
  </div>
  );
};

export const ConfirmDetailRow = ({ icon, label, value, tone = 'green' }) => (
  <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
    <MobileIconBadge icon={icon} tone={tone} size={40} iconSize={16} />
    <div>
      <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>{label}</p>
      <p style={{
        margin: 0,
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-bold, 700)',
        color: 'var(--text-content-default)',
      }}
      >
        {value}
      </p>
    </div>
  </div>
);

export const BookingWizardShell = ({
  stepKey, title, onBack, footerLabel, footerDisabled, onFooter, children, contentStyle,
}) => (
  <div className='flex flex-col' style={{ height: '100%', minHeight: '100%', background: SCREEN_BG }}>
    <BookingHeader title={title} onBack={onBack} />
    <div
      className='flex-1 min-h-0 overflow-y-auto flex flex-col'
      style={{
        /* Longhand — a `padding` SHORTHAND carrying var() is dropped by the CSSOM
           when React assigns it inline (steps that relied on it rendered with 0
           padding). Longhand var() applies correctly. */
        paddingTop: 'var(--dim-space-600, 24px)',
        paddingBottom: 'var(--dim-space-600, 24px)',
        paddingLeft: 'var(--dim-space-400, 16px)',
        paddingRight: 'var(--dim-space-400, 16px)',
        ...contentStyle,
      }}
    >
      <BookingStepper stepKey={stepKey} />
      {children}
    </div>
    {footerLabel && (
      <BookingFooter label={footerLabel} disabled={footerDisabled} onClick={onFooter} />
    )}
  </div>
);

export default BookingWizardShell;
