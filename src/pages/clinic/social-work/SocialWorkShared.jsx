import React from 'react';
import Icon from '@/components/icons/Icon';

/* SocialWorkShared — presentational primitives shared by the five
   งานสังคมสงเคราะห์ screens (§1.10.11).

   None of these exist in the DS yet (design.md §6 / src/components):
     • SwConfidentialMask — the §1.4.2 "สิทธิไม่เพียงพอ" placeholder. The
       mental-health module has its own copy inside MentalHealthSteps.jsx;
       duplicating it locally keeps the two modules decoupled (a shared
       `ConfidentialMask` is reported as a DS candidate via the manifest
       instead of editing another module's file).
     • SwSectionCard / SwSectionHeader / SwField / SwEmptyHint /
       SwAuditLine / SwBanner — the same card + label + empty-state chrome
       AncSteps and MentalHealthSteps each re-declare privately. Kept in one
       module file here so the five social-work screens stay consistent.

   Every value aliases a design.md token with a truthful fallback; inline
   padding/margin are written longhand (CSSOM drops var() shorthands). */

export const SwSectionHeader = ({ icon, children, aside }) => (
  <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
    <span className='text-brand-500'><Icon name={icon} size={20} /></span>
    <h2 className='text-base font-bold text-brand-500'>{children}</h2>
    <div className='flex-1' />
    {aside}
  </div>
);

export const SwSectionCard = ({ icon, title, aside, children }) => (
  <section
    className='w-full flex flex-col'
    style={{
      background: 'var(--surface-card-100, #FFFFFF)',
      borderRadius: 'var(--dim-radius-500, 16px)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
      boxShadow: 'var(--shadow-card-strong)',
      paddingTop: 'var(--dim-space-600, 24px)',
      paddingBottom: 'var(--dim-space-600, 24px)',
      paddingLeft: 'var(--dim-space-600, 24px)',
      paddingRight: 'var(--dim-space-600, 24px)',
      gap: 'var(--dim-space-400, 16px)',
    }}
  >
    {title && <SwSectionHeader icon={icon} aside={aside}>{title}</SwSectionHeader>}
    {children}
  </section>
);

export const SwField = ({ label, required, children, hint, hintTone, minWidth = 200, grow = true }) => (
  <div
    className={`${grow ? 'flex-1 ' : ''}flex flex-col gap-1.5 min-w-0`}
    style={{ minWidth }}
  >
    {label && (
      <div className='flex items-center text-sm text-ink leading-snug'>
        <span>{label}</span>
        {required && <span className='ml-0.5' style={{ color: 'var(--text-input-require)' }}>*</span>}
      </div>
    )}
    {children}
    {hint && (
      <span
        style={{
          color: hintTone === 'error'
            ? 'var(--text-danger-default, #B91C1C)'
            : 'var(--text-content-quaternary, #ADB2B7)',
          fontSize: 'var(--type-size-xs)',
        }}
      >
        {hint}
      </span>
    )}
  </div>
);

export const SwEmptyHint = ({ icon = 'search_off', children }) => (
  <div
    className='flex flex-col items-center justify-center w-full text-center'
    style={{
      gap: 'var(--dim-space-200, 8px)',
      paddingTop: 'var(--dim-space-800, 48px)',
      paddingBottom: 'var(--dim-space-800, 48px)',
      paddingLeft: 'var(--dim-space-600, 24px)',
      paddingRight: 'var(--dim-space-600, 24px)',
      color: 'var(--text-content-tertiary, #858C92)',
      fontSize: 'var(--type-size-sm)',
    }}
  >
    <Icon name={icon} size={32} />
    <span style={{ maxWidth: 520 }}>{children}</span>
  </div>
);

const BANNER_TONES = {
  brand: {
    background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
    color: 'var(--text-brandPrimary-default, #007549)',
  },
  warning: {
    background: 'var(--surface-warning-quaternary, #FFF9F0)',
    color: 'var(--text-warning-default, #C2410C)',
  },
  danger: {
    background: 'var(--surface-danger-quaternary, #FFF0F0)',
    color: 'var(--text-danger-default, #B91C1C)',
  },
  neutral: {
    background: 'var(--surface-card-quaternary, #F9FBFB)',
    color: 'var(--text-content-secondary, #636B72)',
  },
};

export const SwBanner = ({ tone = 'brand', icon = 'info', children, action, onClose }) => {
  const palette = BANNER_TONES[tone] || BANNER_TONES.brand;
  return (
    <div
      className='flex items-center w-full'
      style={{
        gap: 'var(--dim-space-200, 8px)',
        paddingTop: 'var(--dim-space-300, 12px)',
        paddingBottom: 'var(--dim-space-300, 12px)',
        paddingLeft: 'var(--dim-space-400, 16px)',
        paddingRight: 'var(--dim-space-400, 16px)',
        borderRadius: 'var(--dim-radius-200, 8px)',
        border: tone === 'neutral'
          ? 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #EEF0F1)'
          : undefined,
        background: palette.background,
        color: palette.color,
        fontSize: 'var(--type-size-sm)',
      }}
    >
      <Icon name={icon} size={18} />
      <span className='min-w-0'>{children}</span>
      <div className='flex-1' />
      {action}
      {onClose && (
        <button
          type='button'
          onClick={onClose}
          aria-label='ปิดการแจ้งเตือน'
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: palette.color }}
        >
          <Icon name='close' size={16} />
        </button>
      )}
    </div>
  );
};

/* ผู้บันทึก + วันเวลา — playbook §5 audit trail (แสดงบนทุก step / ทุกแถว) */
export const SwAuditLine = ({ by, at, label = 'บันทึกโดย', extra, formatDateTime }) => (
  <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
    {label} {by || '—'}{at ? ` · ${formatDateTime ? formatDateTime(at) : at}` : ''}{extra ? ` · ${extra}` : ''}
  </span>
);

/* ข้อมูลลับ §1.4.2 — masked placeholder for the social-work module. */
export const SwConfidentialMask = ({ what = 'ข้อมูลของงานสังคมสงเคราะห์' }) => (
  <div
    className='flex flex-col items-center justify-center w-full text-center'
    style={{
      gap: 'var(--dim-space-300, 12px)',
      paddingTop: 'var(--dim-space-800, 48px)',
      paddingBottom: 'var(--dim-space-800, 48px)',
      paddingLeft: 'var(--dim-space-600, 24px)',
      paddingRight: 'var(--dim-space-600, 24px)',
      borderRadius: 'var(--dim-radius-400, 12px)',
      border: 'var(--dim-stroke-100, 1px) dashed var(--border-neutral-tertiary, #E2E4E6)',
      background: 'var(--surface-card-quaternary, #F9FBFB)',
    }}
  >
    <Icon name='lock_person' size={32} />
    <span style={{ fontWeight: 'var(--type-weight-bold)', fontSize: 'var(--type-size-base)', color: 'var(--text-content-default, #363B3F)' }}>
      สิทธิการเข้าถึงไม่เพียงพอ
    </span>
    <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)', maxWidth: 480 }}>
      {what}เป็นข้อมูลลับ (ตามข้อกำหนด §1.4.2) — แสดงเฉพาะผู้ใช้ที่ได้รับสิทธิ
      งานสังคมสงเคราะห์เท่านั้น หากต้องการเข้าถึงโปรดติดต่อผู้ดูแลระบบ
    </span>
  </div>
);

/* Chrome-free native input inside a wrapper that owns the border
   (CLAUDE.md "No browser-default input chrome"). Idempotent module-load
   injection so HMR never leaves a stale <style> behind. */
export const SW_SEARCH_INPUT_CLASS = 'mih-social-work-search-input';

if (typeof document !== 'undefined' && !document.getElementById('mih-social-work-search-style')) {
  const style = document.createElement('style');
  style.id = 'mih-social-work-search-style';
  style.textContent = `
.${SW_SEARCH_INPUT_CLASS},
.${SW_SEARCH_INPUT_CLASS}:focus,
.${SW_SEARCH_INPUT_CLASS}:focus-visible {
  caret-color: transparent;
  border: 0 !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
.${SW_SEARCH_INPUT_CLASS}::placeholder {
  color: var(--text-input-placeholder, #ADB2B7);
  opacity: 1;
}`;
  document.head.appendChild(style);
}

export const SwInlineSearch = ({ value, onChange, placeholder, minWidth = 240 }) => (
  <div
    className='flex items-center flex-1'
    style={{
      minWidth,
      gap: 'var(--dim-space-200, 8px)',
      height: 'var(--dim-size-800, 40px)',
      paddingLeft: 'var(--dim-space-300, 12px)',
      paddingRight: 'var(--dim-space-300, 12px)',
      borderRadius: 'var(--dim-radius-200, 8px)',
      background: 'var(--surface-input-default)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-input-default)',
    }}
  >
    <Icon name='search' size={18} />
    <input
      type='text'
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${SW_SEARCH_INPUT_CLASS} flex-1 text-sm`}
      style={{ color: 'var(--text-content-primary)' }}
    />
    {value && (
      <button
        type='button'
        onClick={() => onChange('')}
        aria-label='ล้างคำค้นหา'
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-content-tertiary, #858C92)' }}
      >
        <Icon name='close' size={16} />
      </button>
    )}
  </div>
);

export const SwPagerBar = ({ total, page, pageSize, children }) => (
  <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
    <span
      style={{
        color: 'var(--text-content-secondary, #636B72)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
      }}
    >
      {`แสดง ${total === 0 ? 0 : (page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} จาก ${total} รายการ`}
    </span>
    <div className='flex-1' />
    {children}
  </div>
);
