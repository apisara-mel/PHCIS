import React from 'react';
import { useHistory } from 'react-router-dom';
import { Sym } from './Sym';
import BrandButton from '@/components/button/BrandButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import MobileIconBadge from './MobileIconBadge';

/* Figma Mobile Application · Booking wizard shell (6dCDQkwc8DhvyovBbDTyp5).
   Shared chrome for the 5-step appointment booking flow:
   ศูนย์บริการ → แพทย์ → วันที่/เวลา → ยืนยัน → สำเร็จ */

export const BOOKING_TOTAL = 5;

export const BOOKING_STEP_META = {
  service:  { n: 1, label: 'ประเภทบริการ', title: 'เลือกประเภทการรับบริการ' },
  centre:   { n: 2, label: 'ศูนย์บริการ', title: 'เลือกศูนย์บริการ' },
  doctor:   { n: 3, label: 'เลือกแพทย์', title: 'เลือกแพทย์' },
  datetime: { n: 4, label: 'วันและเวลา', title: 'เลือกวันและเวลา' },
  confirm:  { n: 5, label: 'ยืนยัน', title: 'ยืนยันการจอง' },
};

const SCREEN_BG = 'var(--background-screen-brand-100)';

export const BookingStepper = ({ stepKey }) => {
  const meta = BOOKING_STEP_META[stepKey];
  if (!meta) return null;
  return (
    <div style={{ padding: '0 0 var(--dim-space-300, 12px)' }}>
      <div className='flex items-end justify-between' style={{ marginBottom: 'var(--dim-space-300, 12px)' }}>
        <span style={{
          fontFamily: 'var(--type-family-heading-graphic2)',
          fontSize: 'var(--type-size-sm)',
          color: 'var(--text-brandPrimary-default)',
        }}
        >
          ขั้นตอนที่ {meta.n} จาก {BOOKING_TOTAL}
        </span>
        <span style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
          fontWeight: 'var(--type-weight-medium)',
          color: 'var(--text-brandPrimary-default)',
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
                ? 'var(--surface-positive-default)'
                : 'var(--surface-brandPrimary-tertiary)',
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
        background: 'var(--surface-navigation-default)',
        borderBottom: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
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
        fontSize: 'var(--type-size-base)',
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
      background: 'var(--surface-card-100)',
      borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
      boxShadow: 'var(--shadow-brand-drop-top-100)',
    }}
  >
    <BrandButton
      variant='fill'
      size='lg'
      className='w-full'
      trailingIcon='chevron_right'
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </BrandButton>
  </div>
);

export const BookingPanel = ({ title, children }) => (
  <div
    style={{
      background: 'var(--surface-card-100)',
      borderRadius: 'var(--dim-radius-600, 24px)',
      boxShadow: 'var(--shadow-card)',
      padding: 'var(--dim-space-400, 16px)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--dim-space-400, 16px)',
    }}
  >
    {title && (
      <h2 style={{
        margin: 0,
        textAlign: 'center',
        fontFamily: 'var(--type-family-heading-graphic2)',
        fontSize: 'var(--type-size-xl)',
        fontWeight: 'var(--type-weight-medium)',
        color: 'var(--text-brandPrimary-default)',
        lineHeight: 1.375,
      }}
      >
        {title}
      </h2>
    )}
    {children}
  </div>
);

export const BookingSearchRow = ({ placeholder, value = '', onChange, onFilter }) => {
  const interactive = typeof onChange === 'function';
  return (
  <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
    <div
      className='flex flex-1 items-center min-w-0'
      style={{
        height: 56,
        padding: '0 var(--dim-size-500, 24px)',
        borderRadius: 'var(--dim-radius-full)',
        border: 'var(--dim-stroke-200) solid var(--border-primarysearch-default)',
        background: 'var(--surface-search-default)',
        boxShadow: 'var(--shadow-card)',
        gap: 'var(--dim-space-400, 16px)',
      }}
    >
      <Sym name='search' size={20} color='var(--text-primarysearch-default)' />
      {interactive ? (
        <input
          type='search'
          className='mih-booking-search-input'
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          style={{
            flex: 1,
            minWidth: 0,
            border: 0,
            outline: 'none',
            background: 'transparent',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
            color: 'var(--text-content-default)',
          }}
        />
      ) : (
        <span style={{
          flex: 1,
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          color: 'var(--text-primarysearch-default)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        >
          {placeholder}
        </span>
      )}
    </div>
    {onFilter && (
      <button
        type='button'
        onClick={onFilter}
        aria-label='ตัวกรอง'
        style={{
          width: 56, height: 56, flexShrink: 0,
          borderRadius: 'var(--dim-radius-full)',
          border: 0,
          background: 'var(--surface-brandPrimaryButton-tertiary)',
          color: 'var(--text-brandPrimaryButton-default)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <Sym name='filter_list' size={24} />
      </button>
    )}
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
  caret-color: transparent;
  border: 0 !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
.mih-booking-search-input::placeholder {
  color: var(--text-primarysearch-default);
  opacity: 1;
}`;
  document.head.appendChild(style);
}

export const CentreNumberBadge = ({ number }) => (
  <div
    className='flex flex-col items-center justify-center shrink-0'
    style={{
      width: 'var(--dim-size-1100, 52px)',
      height: 'var(--dim-size-1100, 52px)',
      borderRadius: 'var(--dim-radius-200, 8px)',
      background: 'var(--surface-brandPrimary-quaternary)',
      color: 'var(--text-brandPrimary-default)',
      padding: 'var(--dim-space-100, 4px)',
    }}
  >
    <span style={{ fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)' }}>ศูนย์</span>
    <span style={{ fontSize: 'var(--type-size-lg)', fontWeight: 'var(--type-weight-bold)', lineHeight: 1.2 }}>{number}</span>
  </div>
);

export const CentreListCard = ({ number, name, distanceKm, selected, onClick }) => (
  <button
    type='button'
    onClick={onClick}
    className='flex items-center w-full text-left'
    style={{
      gap: 'var(--dim-space-400, 16px)',
      padding: 'var(--dim-space-400, 16px)',
      borderRadius: 'var(--dim-radius-600, 24px)',
      border: selected
        ? 'var(--dim-stroke-200) solid var(--border-brandPrimary-default)'
        : 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
      background: 'var(--surface-card-100)',
      cursor: 'pointer',
    }}
  >
    <CentreNumberBadge number={number} />
    <div className='flex-1 min-w-0'>
      <p style={{
        margin: 0,
        fontFamily: 'var(--type-family-heading-graphic2)',
        fontSize: 'var(--type-size-base)',
        color: 'var(--text-content-default)',
      }}
      >
        {name}
      </p>
      <div className='flex items-center' style={{ gap: 'var(--dim-space-100, 4px)', marginTop: 2 }}>
        <Sym name='location_on' size={14} color='var(--text-content-tertiary)' />
        <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>
          {distanceKm} กม.
        </span>
      </div>
    </div>
  </button>
);

export const DoctorListCard = ({
  name, specialty, availableToday, selected, onClick,
}) => (
  <button
    type='button'
    onClick={onClick}
    className='flex items-center w-full text-left'
    style={{
      gap: 'var(--dim-space-400, 16px)',
      padding: 'var(--dim-space-400, 16px)',
      borderRadius: selected ? 'var(--dim-radius-600, 24px)' : 'var(--dim-radius-500, 16px)',
      border: selected
        ? 'var(--dim-stroke-200) solid var(--border-brandPrimary-default)'
        : 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
      background: 'var(--surface-card-100)',
      cursor: 'pointer',
    }}
  >
    <span
      className='inline-flex items-center justify-center shrink-0'
      style={{
        width: 48, height: 48, borderRadius: 'var(--dim-radius-full)',
        background: 'var(--surface-brandPrimary-default)',
        color: 'var(--text-brandPrimary-on-brand)',
        fontFamily: 'var(--type-family-heading-graphic2)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-bold)',
      }}
    >
      {name.replace(/[นพ\.พญ\.พ\.ว\.\s]/g, '').slice(0, 2)}
    </span>
    <div className='flex-1 min-w-0' style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-200, 8px)' }}>
      <div>
        <p style={{
          margin: 0,
          fontFamily: 'var(--type-family-heading-graphic2)',
          fontSize: 'var(--type-size-base)',
          color: 'var(--text-content-default)',
        }}
        >
          {name}
        </p>
        <div className='flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <Sym name='stethoscope' size={14} color='var(--text-content-tertiary)' />
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>{specialty}</span>
        </div>
      </div>
      <ColorfulBadge
        style={availableToday ? 'teal' : 'grey'}
        size='small'
        hierarchy='secondary'
        width='hug'
        showIcon
        icon='schedule'
      >
        {availableToday ? 'คิวว่างวันนี้' : 'คิวเต็มวันนี้'}
      </ColorfulBadge>
    </div>
  </button>
);

export const BookingTagRow = ({ tags, value, onChange }) => (
  <div className='flex overflow-x-auto' style={{ gap: 'var(--dim-space-200, 8px)', paddingBottom: 2 }}>
    {tags.map((tag) => {
      const active = tag === value;
      return (
        <button
          key={tag}
          type='button'
          onClick={() => onChange(tag)}
          style={{
            flexShrink: 0,
            height: 40,
            padding: 'var(--dim-space-100, 4px) var(--dim-space-300, 12px)',
            borderRadius: 'var(--dim-radius-full)',
            border: active
              ? 'var(--dim-stroke-100) solid var(--border-brandTag-selected)'
              : 'var(--dim-stroke-100) solid var(--border-brandTag-default)',
            background: active ? 'var(--surface-brandTag-selected)' : 'var(--surface-brandTag-default)',
            color: active ? 'var(--text-brandTag-selected)' : 'var(--text-brandTag-default)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-medium)',
            cursor: 'pointer',
          }}
        >
          {tag}
        </button>
      );
    })}
  </div>
);

export const ConfirmDetailRow = ({ icon, label, value, tone = 'green' }) => (
  <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
    <MobileIconBadge icon={icon} tone={tone} size={40} iconSize={16} />
    <div>
      <p style={{ margin: 0, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>{label}</p>
      <p style={{
        margin: 0,
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-bold)',
        color: 'var(--text-content-default)',
      }}
      >
        {value}
      </p>
    </div>
  </div>
);

export const BookingWizardShell = ({
  stepKey, title, onBack, footerLabel, footerDisabled, onFooter, children,
}) => (
  <div className='flex flex-col' style={{ minHeight: '100%', background: SCREEN_BG }}>
    <BookingHeader title={title} onBack={onBack} />
    <div className='flex-1 min-h-0 overflow-y-auto' style={{ padding: 'var(--dim-space-600, 24px) var(--dim-space-400, 16px)' }}>
      <BookingStepper stepKey={stepKey} />
      {children}
    </div>
    {footerLabel && (
      <BookingFooter label={footerLabel} disabled={footerDisabled} onClick={onFooter} />
    )}
  </div>
);

export default BookingWizardShell;
