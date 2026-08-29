import React from 'react';
import Icon from '@/components/icons/Icon';

/* tbShared — layout + banner primitives shared by the 5 TB-clinic pages
   (same role hivStiShared.jsx plays for the HIV/STI module). Visual-only:
   data/rights helpers live in src/data/tbVisits.js. Every value aliases a
   design.md token with its truthful fallback. */

export const TopicHeader = ({ icon, children, trailing }) => (
  <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
    <span style={{ color: 'var(--text-brandPrimary-default, #007549)' }}>
      <Icon name={icon} size={20} />
    </span>
    <h2
      className='flex-1 min-w-0'
      style={{
        color: 'var(--text-brandPrimary-default, #007549)',
        fontSize: 'var(--type-size-base, 16px)',
        fontWeight: 'var(--type-weight-bold, 700)',
      }}
    >
      {children}
    </h2>
    {trailing}
  </div>
);

export const Field = ({ label, required, children, hint, error, flex = true }) => (
  <div className={`${flex ? 'flex-1' : ''} flex flex-col min-w-0`} style={{ gap: 'var(--dim-space-150, 6px)', minWidth: 180 }}>
    <div
      className='flex items-center'
      style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-default, #363B3F)' }}
    >
      <span>{label}</span>
      {required && (
        <span style={{ marginLeft: 'var(--dim-space-050, 2px)', color: 'var(--text-input-require, #DC2626)' }}>*</span>
      )}
    </div>
    {children}
    {error ? (
      <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)', color: 'var(--text-danger-default, #B91C1C)', fontSize: 'var(--type-size-xs, 12px)' }}>
        <Icon name='error' size={13} />
        {error}
      </span>
    ) : hint ? (
      <span style={{ color: 'var(--text-content-quaternary, #ADB2B7)', fontSize: 'var(--type-size-xs, 12px)' }}>
        {hint}
      </span>
    ) : null}
  </div>
);

export const StepCard = ({ children }) => (
  <section className='flex flex-col' style={{ gap: 'var(--dim-space-600, 24px)' }}>{children}</section>
);

/* Banner — warning / danger / info context strip (NcdFormPage pattern). */
export const Banner = ({ tone = 'warning', icon = 'error', children, action }) => {
  const palette = tone === 'danger'
    ? { bg: 'var(--surface-danger-quaternary, #FFF0F0)', fg: 'var(--text-danger-default, #B91C1C)' }
    : tone === 'info'
      ? { bg: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', fg: 'var(--text-brandPrimary-default, #007549)' }
      : { bg: 'var(--surface-alert-warning, #FFF9F0)', fg: 'var(--text-warning-default, #C2410C)' };
  return (
    <div
      className='flex items-center flex-wrap'
      style={{
        gap: 'var(--dim-space-300, 12px)',
        paddingTop: 'var(--dim-space-300, 12px)',
        paddingBottom: 'var(--dim-space-300, 12px)',
        paddingLeft: 'var(--dim-space-400, 16px)',
        paddingRight: 'var(--dim-space-400, 16px)',
        borderRadius: 'var(--dim-radius-200, 8px)',
        background: palette.bg,
        color: palette.fg,
        fontSize: 'var(--type-size-sm, 14px)',
      }}
    >
      <Icon name={icon} size={18} />
      <span className='flex-1 min-w-0'>{children}</span>
      {action}
    </div>
  );
};

export const ErrorNote = ({ children }) => (
  <div
    className='flex items-center'
    style={{
      gap: 'var(--dim-space-200, 8px)',
      paddingTop: 'var(--dim-space-200, 8px)',
      paddingBottom: 'var(--dim-space-200, 8px)',
      paddingLeft: 'var(--dim-space-300, 12px)',
      paddingRight: 'var(--dim-space-300, 12px)',
      borderRadius: 'var(--dim-radius-200, 8px)',
      background: 'var(--surface-danger-quaternary, #FFF0F0)',
      color: 'var(--text-danger-default, #B91C1C)',
      fontSize: 'var(--type-size-sm, 14px)',
    }}
  >
    <Icon name='error' size={16} />
    <span>{children}</span>
  </div>
);

export const ReadOnlyBanner = () => null;

/* Empty-state block used inside cards/tabs (list empty / no linked result). */
export const EmptyPanel = ({ icon = 'folder_open', title, subtitle, action }) => (
  <div
    className='flex flex-col items-center text-center w-full'
    style={{
      gap: 'var(--dim-space-300, 12px)',
      paddingTop: 'var(--dim-space-800, 32px)',
      paddingBottom: 'var(--dim-space-800, 32px)',
      borderRadius: 'var(--dim-radius-400, 12px)',
      border: 'var(--dim-stroke-100, 1px) dashed var(--border-neutral-tertiary, #E2E4E6)',
      color: 'var(--text-content-tertiary, #858C92)',
    }}
  >
    <Icon name={icon} size={36} style={{ color: 'var(--text-content-quaternary, #ADB2B7)' }} />
    <span style={{ fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)', color: 'var(--text-content-secondary, #636B72)' }}>
      {title}
    </span>
    {subtitle && <span style={{ fontSize: 'var(--type-size-xs, 12px)' }}>{subtitle}</span>}
    {action}
  </div>
);

/* แถบ audit ต่อรายการ — ผู้บันทึก + เวลา (+ แก้ไข/ยกเลิก) (playbook §5). */
export const RowAuditNote = ({ row }) => (
  <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
    {row.status === 'cancelled'
      ? `ยกเลิกโดย ${row.cancelledBy || row.recordedBy}${row.cancelledAt ? ` · ${row.cancelledAt}` : ''}${row.cancelReason ? ` · เหตุผล: ${row.cancelReason}` : ''}`
      : row.editedAt
        ? `แก้ไขล่าสุด ${row.editedAt} · ${row.editedBy}`
        : `บันทึกโดย ${row.recordedBy}${row.recordedAt ? ` · ${row.recordedAt}` : ''}`}
  </span>
);
