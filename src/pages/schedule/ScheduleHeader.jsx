import React from 'react';
import Icon from '@/components/icons/Icon';

/* MIH · ระบบจัดตารางเวร · Header (Figma Schedule-Management 16:52473).
   64px top bar — apps · program name + breadcrumb · location pill · spacer
   · date · font-size controls · manual button. */

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

function formatThaiDate(d) {
  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth()];
  const year = d.getFullYear() + 543; /* Buddhist year */
  return `${day} ${month} ${year}`;
}

const AppsButton = ({ onClick }) => (
  <button
    type='button'
    onClick={onClick}
    title='เปลี่ยนระบบ'
    aria-label='เปลี่ยนระบบ'
    style={{
      boxSizing: 'border-box',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 'var(--dim-size-800, 40px)',
      height: 'var(--dim-size-800, 40px)',
      borderRadius: 'var(--dim-radius-200, 8px)',
      border: 0,
      background: 'var(--surface-brandPrimaryButton-tertiary, var(--brand-p100, #E2F3EB))',
      color: 'var(--text-brandPrimary-default, var(--brand-p700, #007549))',
      cursor: 'pointer',
    }}
  >
    <Icon name='apps' size={20} style={{ color: 'currentColor' }} />
  </button>
);

const ProgramName = ({ onHomeClick }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
    <span
      style={{
        fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
        fontSize: 'var(--type-size-base, 16px)',
        fontWeight: 'var(--type-weight-regular, 400)',
        lineHeight: 1.5,
        color: 'var(--text-navigation-title, var(--brand-p700, #007549))',
        whiteSpace: 'nowrap',
      }}
    >
      ระบบจัดตารางเวร
    </span>
    <nav
      aria-label='breadcrumb'
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--dim-space-200, 8px)',
      }}
    >
      <button
        type='button'
        onClick={onHomeClick}
        title='หน้าหลัก'
        aria-label='หน้าหลัก'
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--dim-space-100, 4px) 0',
          background: 'transparent',
          border: 0,
          color: 'var(--text-breadcrumb-pagename, #858C92)',
          cursor: 'pointer',
        }}
      >
        <Icon name='home' size={16} style={{ color: 'currentColor' }} />
      </button>
      <span
        style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm, 14px)',
          color: 'var(--text-breadcrumb-pagename, #858C92)',
          lineHeight: 1.5,
        }}
        aria-hidden
      >
        /
      </span>
      <span
        style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm, 14px)',
          fontWeight: 'var(--type-weight-regular, 400)',
          lineHeight: 1.5,
          color: 'var(--text-breadcrumb-current, #363B3F)',
          whiteSpace: 'nowrap',
        }}
      >
        จัดการตารางเวร
      </span>
    </nav>
  </div>
);

const LocationTag = ({ label = 'ศูนย์ 4 ดินแดง', onClick }) => (
  <button
    type='button'
    onClick={onClick}
    title='เลือกสาขา/ศูนย์บริการ'
    style={{
      boxSizing: 'border-box',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--dim-space-150, 6px)',
      height: 'var(--dim-size-800, 40px)',
      minWidth: 'var(--dim-size-800, 40px)',
      maxWidth: 192,
      padding: 'var(--dim-space-100, 4px) var(--dim-space-300, 12px)',
      borderRadius: 'var(--dim-radius-full, 9999px)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-brandTag-default, #E2E4E6)',
      background: 'var(--surface-brandTag-default, #FFFFFF)',
      color: 'var(--text-brandTag-default, #4D5358)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-sm, 14px)',
      fontWeight: 'var(--type-weight-medium, 500)',
      lineHeight: 1.5,
      cursor: 'pointer',
    }}
  >
    <Icon name='location_on' size={16} style={{ color: 'currentColor' }} />
    <span style={{
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }}>{label}</span>
    <Icon name='expand_more' size={16} style={{ color: 'currentColor' }} />
  </button>
);

const DateDisplay = ({ date }) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--dim-space-200, 8px)',
      color: 'var(--text-content-secondary, #636B72)',
    }}
  >
    <Icon name='calendar_today' size={16} style={{ color: 'currentColor' }} />
    <span style={{
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-sm, 14px)',
      fontWeight: 'var(--type-weight-regular, 400)',
      lineHeight: 1.5,
      whiteSpace: 'nowrap',
    }}>
      {date}
    </span>
  </div>
);

const FontSizeRow = ({ value = 'base', onChange }) => {
  const sizes = [
    { key: 'sm',   label: 'ก', fontSize: 'var(--type-size-sm, 14px)' },
    { key: 'base', label: 'ก', fontSize: 'var(--type-size-base, 16px)' },
    { key: 'lg',   label: 'ก', fontSize: 'var(--type-size-lg, 18px)' },
  ];
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--dim-space-300, 12px)',
        color: 'var(--text-content-secondary, #636B72)',
        fontFamily: 'var(--type-family-body)',
      }}
    >
      <span style={{
        fontSize: 'var(--type-size-xs, 12px)',
        fontWeight: 'var(--type-weight-regular, 400)',
        lineHeight: 1.5,
        whiteSpace: 'nowrap',
      }}>
        ขนาดตัวอักษร:
      </span>
      {sizes.map(s => {
        const active = value === s.key;
        return (
          <button
            key={s.key}
            type='button'
            onClick={() => onChange && onChange(s.key)}
            title={`ขนาด ${s.label}`}
            style={{
              background: 'transparent',
              border: 0,
              padding: 0,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: s.fontSize,
              lineHeight: 1.5,
              color: active
                ? 'var(--text-brandPrimary-default, var(--brand-p700, #007549))'
                : 'var(--text-content-secondary, #636B72)',
              fontWeight: active
                ? 'var(--type-weight-bold, 700)'
                : 'var(--type-weight-regular, 400)',
            }}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
};

const ManualButton = ({ onClick }) => (
  <button
    type='button'
    onClick={onClick}
    style={{
      boxSizing: 'border-box',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--dim-space-150, 6px)',
      height: 'var(--dim-size-700, 36px)',
      minWidth: 80,
      maxWidth: 384,
      padding: 'var(--dim-space-150, 6px) var(--dim-space-300, 12px)',
      borderRadius: 'var(--dim-radius-200, 8px)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-neutralButton-tertiary, #E2E4E6)',
      background: 'transparent',
      color: 'var(--text-neutralButton-default, #4D5358)',
      fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
      fontSize: 'var(--type-size-sm, 14px)',
      fontWeight: 'var(--type-weight-regular, 400)',
      lineHeight: 1.5,
      whiteSpace: 'nowrap',
      cursor: 'pointer',
    }}
  >
    <Icon name='book' size={16} style={{ color: 'currentColor' }} />
    คู่มือใช้งานระบบ
  </button>
);

const ScheduleHeader = ({
  branch = 'ศูนย์ 4 ดินแดง',
  date,
  fontSize = 'base',
  onFontSizeChange,
  onAppsClick,
  onHomeClick,
  onBranchClick,
  onManualClick,
}) => {
  const dateLabel = date || formatThaiDate(new Date());

  return (
    <header
      style={{
        boxSizing: 'border-box',
        flex: '0 0 auto',
        width: '100%',
        height: 'var(--dim-size-1400, 64px)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--dim-space-800, 32px)',
        padding: '0 var(--dim-space-600, 24px)',
        background: 'var(--surface-navigation-default, #FFFFFF)',
        borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
        boxShadow: 'var(--shadow-brand-drop-bottom-100, 0 1px 2px rgba(8,167,104,0.08))',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--dim-space-300, 12px)',
        }}
      >
        <AppsButton onClick={onAppsClick} />
        <ProgramName onHomeClick={onHomeClick} />
      </div>

      <LocationTag label={branch} onClick={onBranchClick} />

      <div style={{ flex: '1 1 0', minWidth: 0 }} />

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--dim-space-800, 32px)',
        }}
      >
        <DateDisplay date={dateLabel} />
        <FontSizeRow value={fontSize} onChange={onFontSizeChange} />
        <ManualButton onClick={onManualClick} />
      </div>
    </header>
  );
};

export default ScheduleHeader;
