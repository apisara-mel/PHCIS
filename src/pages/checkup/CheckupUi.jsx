import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Pagination from '@/components/pagination/Pagination';
import ConsentAuditBar from '@/components/forms/ConsentAuditBar';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import {
  REF_SOURCES, formatRange, formatThaiDateTime, CHECKUP_STAFF,
} from '@/data/checkupStore';

/* CheckupUi — layout atoms shared by the 10 ระบบงานตรวจสุขภาพ screens.

   Deliberately NOT design-system components: each one is a thin arrangement
   of existing DS pieces (ColorfulBadge / Pagination / ConsentAuditBar / Icon)
   plus token-only chrome, scoped to this module. Anything genuinely new
   (comparison table, group-screening panel, one-page report editor) lives in
   its own file and is reported through the manifest.

   Every inline padding/margin uses LONGHAND — React drops a shorthand that
   carries var() (see CLAUDE.md / project memory). */

/** White rounded page card — the standard body container on every screen. */
export const PageCard = ({ children, className = '', style = {}, gap = 'var(--dim-space-600)' }) => (
  <div
    className={`w-full flex flex-col ${className}`}
    style={{
      background: 'var(--surface-card-100)',
      borderRadius: 'var(--dim-radius-500)',
      border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
      boxShadow: 'var(--shadow-card-strong)',
      paddingTop: 'var(--dim-space-600)',
      paddingBottom: 'var(--dim-space-600)',
      paddingLeft: 'var(--dim-space-600)',
      paddingRight: 'var(--dim-space-600)',
      gap,
      ...style,
    }}
  >
    {children}
  </div>
);

/** Outer page padding wrapper (matches AncQueuePage body rhythm). */
export const PageBody = ({ children, gap = 'var(--dim-space-600)' }) => (
  <div
    className='flex flex-col flex-1 min-w-0'
    style={{
      paddingTop: 'var(--dim-space-600)',
      paddingBottom: 'var(--dim-space-600)',
      paddingLeft: 'var(--dim-space-600)',
      paddingRight: 'var(--dim-space-600)',
      gap,
    }}
  >
    {children}
  </div>
);

/** Section header row inside a card: icon + title + optional trailing slot. */
export const SectionHeader = ({ icon, title, subtitle, trailing, required = false }) => (
  <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
    {icon ? (
      <span
        className='inline-flex items-center justify-center shrink-0'
        style={{
          width: 'var(--dim-size-600, 32px)',
          height: 'var(--dim-size-600, 32px)',
          borderRadius: 'var(--dim-radius-200, 8px)',
          background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
          color: 'var(--icon-brandPrimary-default, #007549)',
        }}
      >
        <Icon name={icon} size={18} />
      </span>
    ) : null}
    <div className='flex flex-col min-w-0 flex-1' style={{ gap: 'var(--dim-space-050, 2px)' }}>
      <span
        style={{
          fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
          fontSize: 'var(--type-size-base, 16px)',
          fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
          color: 'var(--text-content-default, #363B3F)',
        }}
      >
        {title}
        {required ? (
          <span style={{ color: 'var(--text-danger-default, #B91C1C)' }}> *</span>
        ) : null}
      </span>
      {subtitle ? (
        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs, 12px)',
            color: 'var(--text-content-tertiary, #858C92)',
          }}
        >
          {subtitle}
        </span>
      ) : null}
    </div>
    {trailing}
  </div>
);

/** Bordered sub-section used inside wizard steps / form pages. */
export const SubCard = ({ children, tone = 'neutral', className = '', style = {} }) => {
  const tones = {
    neutral: { bg: 'var(--surface-card-100, #FFFFFF)', border: 'var(--border-neutral-tertiary, #E2E4E6)' },
    brand: { bg: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', border: 'var(--border-brandPrimary-quaternary, #E2F3EB)' },
    warning: { bg: 'var(--surface-alert-warning, #FFF9F0)', border: 'var(--border-alert-warning, #FFEDD5)' },
    danger: { bg: 'var(--surface-alert-error, #FFF0F0)', border: 'var(--border-alert-error, #FEE2E2)' },
    info: { bg: 'var(--surface-alert-info, #F0F6FF)', border: 'var(--border-alert-info, #DBEAFE)' },
    success: { bg: 'var(--surface-alert-success, #F4FBFA)', border: 'var(--border-alert-success, #D1F6EE)' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <div
      className={`flex flex-col w-full ${className}`}
      style={{
        background: t.bg,
        border: `var(--dim-stroke-100) solid ${t.border}`,
        borderRadius: 'var(--dim-radius-300, 10px)',
        paddingTop: 'var(--dim-space-400)',
        paddingBottom: 'var(--dim-space-400)',
        paddingLeft: 'var(--dim-space-400)',
        paddingRight: 'var(--dim-space-400)',
        gap: 'var(--dim-space-300)',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Inline notice strip (สิทธิหมดอายุ / read-only / ฉบับร่าง …). */
export const NoticeBar = ({ tone = 'info', icon, children, trailing }) => {
  const tones = {
    info: { bg: 'var(--surface-alert-info, #F0F6FF)', fg: 'var(--text-alert-info, #1D4ED8)', bd: 'var(--border-alert-info, #DBEAFE)' },
    warning: { bg: 'var(--surface-alert-warning, #FFF9F0)', fg: 'var(--text-alert-warning, #C2410C)', bd: 'var(--border-alert-warning, #FFEDD5)' },
    danger: { bg: 'var(--surface-alert-error, #FFF0F0)', fg: 'var(--text-alert-error, #B91C1C)', bd: 'var(--border-alert-error, #FEE2E2)' },
    success: { bg: 'var(--surface-alert-success, #F4FBFA)', fg: 'var(--text-alert-success, #196C65)', bd: 'var(--border-alert-success, #D1F6EE)' },
    brand: { bg: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', fg: 'var(--text-brandPrimary-default, #007549)', bd: 'var(--border-brandPrimary-quaternary, #E2F3EB)' },
    neutral: { bg: 'var(--surface-card-200, #FDFDFD)', fg: 'var(--text-content-secondary, #636B72)', bd: 'var(--border-neutral-tertiary, #E2E4E6)' },
  };
  const t = tones[tone] || tones.info;
  return (
    <div
      className='flex items-center w-full'
      style={{
        gap: 'var(--dim-space-300)',
        background: t.bg,
        color: t.fg,
        border: `var(--dim-stroke-100) solid ${t.bd}`,
        borderRadius: 'var(--dim-radius-200, 8px)',
        paddingTop: 'var(--dim-space-300)',
        paddingBottom: 'var(--dim-space-300)',
        paddingLeft: 'var(--dim-space-400)',
        paddingRight: 'var(--dim-space-400)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        lineHeight: 1.5,
      }}
    >
      {icon ? <Icon name={icon} size={18} /> : null}
      <span className='flex-1 min-w-0'>{children}</span>
      {trailing}
    </div>
  );
};

/** Empty state with optional CTA — used by every list/panel. */
export const EmptyState = ({
  icon = 'inbox',
  title,
  subtitle,
  actionLabel,
  onAction,
  compact = false,
}) => (
  <div
    className='flex flex-col items-center justify-center text-center w-full'
    style={{
      gap: 'var(--dim-space-200)',
      paddingTop: compact ? 'var(--dim-space-500)' : 'var(--dim-space-800)',
      paddingBottom: compact ? 'var(--dim-space-500)' : 'var(--dim-space-800)',
      paddingLeft: 'var(--dim-space-400)',
      paddingRight: 'var(--dim-space-400)',
      borderRadius: 'var(--dim-radius-300, 10px)',
      border: 'var(--dim-stroke-100) dashed var(--border-neutral-tertiary, #E2E4E6)',
      background: 'var(--surface-card-200, #FDFDFD)',
      fontFamily: 'var(--type-family-body)',
    }}
  >
    <span style={{ color: 'var(--icon-brandSecondary-quaternary, #ADB2B7)' }}>
      <Icon name={icon} size={compact ? 24 : 32} />
    </span>
    <span
      style={{
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-medium, 500)',
        color: 'var(--text-content-secondary, #636B72)',
      }}
    >
      {title}
    </span>
    {subtitle ? (
      <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)', maxWidth: 'var(--dim-size-2900, 640px)' }}>
        {subtitle}
      </span>
    ) : null}
    {actionLabel && onAction ? (
      <BrandSubdueButton variant='fill' size='sm' leadingIcon='add' onClick={onAction}>
        {actionLabel}
      </BrandSubdueButton>
    ) : null}
  </div>
);

/** "แสดง X–Y จาก Z รายการ" + Pagination (ANC pager contract). */
export const PagerRow = ({ page, pageSize, total, onPageChange, unit = 'รายการ' }) => {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div
      className='flex items-center w-full'
      style={{
        gap: 'var(--dim-space-200)',
        position: 'sticky',
        bottom: 'var(--dim-space-0)',
        zIndex: 50,
        background: 'var(--surface-card-100)',
        paddingTop: 'var(--dim-space-200)',
        borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
      }}
    >
      <span
        style={{
          color: 'var(--text-content-secondary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
        }}
      >
        {`แสดง ${from}–${to} จาก ${total} ${unit}`}
      </span>
      <div className='flex-1' />
      <Pagination currentPage={page} pageCount={pageCount} onPageChange={onPageChange} />
    </div>
  );
};

/** ปกติ / ผิดปกติ / ยังไม่ตั้งเกณฑ์ badge for an interpreted value. */
export const ResultBadge = ({ verdict, size = 'small' }) => {
  if (!verdict) return null;
  const map = {
    normal: { style: 'green', label: 'ปกติ', icon: 'check_circle' },
    abnormal: { style: 'red', label: 'ผิดปกติ', icon: 'error' },
    'no-criteria': { style: 'grey', label: 'ยังไม่ตั้งเกณฑ์', icon: 'help' },
    implausible: { style: 'yellow', label: 'ค่าไม่สมเหตุสมผล', icon: 'warning' },
    empty: null,
  };
  const cfg = map[verdict.status];
  if (!cfg) return null;
  return (
    <ColorfulBadge style={cfg.style} size={size} hierarchy='secondary' icon={cfg.icon}>
      {cfg.label}
    </ColorfulBadge>
  );
};

/** Which of the 3 reference levels produced the interpretation (§1.19.18). */
export const RefSourceBadge = ({ sourceKey, range, size = 'small' }) => {
  if (!sourceKey) return null;
  const src = REF_SOURCES[sourceKey];
  if (!src) return null;
  return (
    <span
      className='inline-flex items-center'
      style={{ gap: 'var(--dim-space-100)' }}
      title={`${src.label} · ค่าอ้างอิง ${formatRange(range)}`}
    >
      <ColorfulBadge style={src.badge} size={size} hierarchy='secondary'>
        {`ค่าอ้างอิง: ${src.short}`}
      </ColorfulBadge>
      <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
        {formatRange(range)}
      </span>
    </span>
  );
};

/** ปกติ / ผิดปกติ overall verdict badge (สรุปผลการตรวจ). */
export const VerdictBadge = ({ verdict, size = 'small' }) => {
  if (verdict === 'normal') {
    return <ColorfulBadge style='green' size={size} hierarchy='secondary' icon='check_circle'>สรุปผล: ปกติ</ColorfulBadge>;
  }
  if (verdict === 'abnormal') {
    return <ColorfulBadge style='red' size={size} hierarchy='secondary' icon='error'>สรุปผล: ผิดปกติ</ColorfulBadge>;
  }
  return <ColorfulBadge style='grey' size={size} hierarchy='secondary'>ยังไม่สรุปผล</ColorfulBadge>;
};

/** Label/value pair used in read-only detail grids. */
export const ReadField = ({ label, value, minWidth = 160 }) => (
  <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)', minWidth }}>
    <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
      {label}
    </span>
    <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-default, #363B3F)', fontWeight: 'var(--type-weight-medium, 500)' }}>
      {value ?? '—'}
    </span>
  </div>
);

/** Audit line (ผู้บันทึก + วันเวลา สร้าง/แก้ล่าสุด) via the DS ConsentAuditBar. */
export const CheckupAuditBar = ({ record, fallbackBy = CHECKUP_STAFF.name }) => (
  <ConsentAuditBar
    recordedBy={record?.savedBy || record?.createdBy || fallbackBy}
    recordedAt={formatThaiDateTime(record?.savedAt || record?.createdAt)}
    editedAt={record?.editedAt || record?.updatedAt ? formatThaiDateTime(record.editedAt || record.updatedAt) : undefined}
    groupPolicy={CHECKUP_STAFF.groupPolicy}
    showFlag={false}
  />
);

/** Read-only cross-module link row (EMR / Lab / X-ray / CPOE). */
export const ReadOnlyLinkRow = ({ to, icon, label, note }) => (
  <Link
    to={to}
    className='flex items-center w-full no-underline'
    style={{
      gap: 'var(--dim-space-300)',
      borderRadius: 'var(--dim-radius-200, 8px)',
      border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
      background: 'var(--surface-card-100)',
      paddingTop: 'var(--dim-space-300)',
      paddingBottom: 'var(--dim-space-300)',
      paddingLeft: 'var(--dim-space-300)',
      paddingRight: 'var(--dim-space-300)',
      color: 'var(--text-content-default, #363B3F)',
      textDecoration: 'none',
    }}
  >
    <span style={{ color: 'var(--icon-brandPrimary-default, #007549)' }}>
      <Icon name={icon} size={18} />
    </span>
    <span className='flex flex-col min-w-0 flex-1' style={{ gap: 'var(--dim-space-050, 2px)' }}>
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
        {note}
      </span>
    </span>
    <ColorfulBadge style='grey' size='small' hierarchy='secondary'>อ่านอย่างเดียว</ColorfulBadge>
    <Icon name='open_in_new' size={16} />
  </Link>
);

/** Confidential gate (§1.4.2) — masks a panel until the user reveals it. */
export const ConfidentialGate = ({ what, allowed, revealed, onReveal, children }) => {
  if (!allowed) {
    return (
      <SubCard tone='danger'>
        <div className='flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
          <Icon name='lock' size={18} />
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-alert-error, #B91C1C)' }}>
            {`${what} เป็นข้อมูลลับตามข้อกำหนด §1.4.2 — บัญชีผู้ใช้ของคุณไม่มีสิทธิ์เข้าถึง โปรดติดต่อผู้ดูแลระบบ`}
          </span>
        </div>
      </SubCard>
    );
  }
  if (!revealed) {
    return (
      <SubCard tone='warning'>
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
          <Icon name='visibility_off' size={18} />
          <span className='flex-1 min-w-0' style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)' }}>
            {`${what} ถูกปิดบังไว้ (ข้อมูลลับ §1.4.2) — การเปิดดูจะถูกบันทึกใน access log`}
          </span>
          <BrandSubdueButton variant='outline' size='sm' leadingIcon='visibility' onClick={onReveal}>
            เปิดดูข้อมูล
          </BrandSubdueButton>
        </div>
      </SubCard>
    );
  }
  return children;
};

/** Small key-figure tile used by report dashboards. */
export const StatTile = ({ label, value, unit, tone = 'brand', icon }) => {
  const tones = {
    brand: { bg: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', fg: 'var(--text-brandPrimary-default, #007549)' },
    danger: { bg: 'var(--surface-alert-error, #FFF0F0)', fg: 'var(--text-alert-error, #B91C1C)' },
    warning: { bg: 'var(--surface-alert-warning, #FFF9F0)', fg: 'var(--text-alert-warning, #C2410C)' },
    info: { bg: 'var(--surface-alert-info, #F0F6FF)', fg: 'var(--text-alert-info, #1D4ED8)' },
  };
  const t = tones[tone] || tones.brand;
  return (
    <div
      className='flex flex-col'
      style={{
        gap: 'var(--dim-space-100)',
        background: t.bg,
        borderRadius: 'var(--dim-radius-300, 10px)',
        paddingTop: 'var(--dim-space-400)',
        paddingBottom: 'var(--dim-space-400)',
        paddingLeft: 'var(--dim-space-400)',
        paddingRight: 'var(--dim-space-400)',
        minWidth: 'var(--dim-size-2100, 160px)',
      }}
    >
      <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)', color: t.fg }}>
        {icon ? <Icon name={icon} size={16} /> : null}
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)' }}>{label}</span>
      </span>
      <span style={{ fontFamily: 'var(--type-family-heading-content, var(--type-family-body))', fontSize: 'var(--type-size-2xl, 24px)', fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))', color: t.fg }}>
        {value}
        {unit ? <span style={{ fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-regular, 400)' }}>{` ${unit}`}</span> : null}
      </span>
    </div>
  );
};

/** Horizontal step tracker used in the คิว "ติดตามสิ่งส่งตรวจ" tab. */
export const StepTrackerRow = ({ steps, state = {}, compact = true }) => (
  <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100)' }}>
    {steps.map((s, idx) => {
      const status = state[s.key] || 'pending';
      const palette = {
        done: { bg: 'var(--surface-brandPrimary-tertiary, #E2F3EB)', fg: 'var(--text-brandPrimary-default, #007549)' },
        active: { bg: 'var(--surface-alert-warning, #FFF9F0)', fg: 'var(--text-alert-warning, #C2410C)' },
        pending: { bg: 'var(--surface-card-200, #FDFDFD)', fg: 'var(--text-content-quaternary, #ADB2B7)' },
      }[status] || { bg: 'var(--surface-card-200, #FDFDFD)', fg: 'var(--text-content-quaternary, #ADB2B7)' };
      return (
        <React.Fragment key={s.key}>
          <span
            className='inline-flex items-center'
            title={`${s.label} — ${status === 'done' ? 'เสร็จแล้ว' : status === 'active' ? 'กำลังดำเนินการ' : 'รอดำเนินการ'}`}
            style={{
              gap: 'var(--dim-space-100)',
              background: palette.bg,
              color: palette.fg,
              borderRadius: 'var(--dim-radius-full)',
              paddingTop: 'var(--dim-space-100)',
              paddingBottom: 'var(--dim-space-100)',
              paddingLeft: 'var(--dim-space-200)',
              paddingRight: 'var(--dim-space-200)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xxs, 10px)',
              whiteSpace: 'nowrap',
            }}
          >
            <Icon name={status === 'done' ? 'check_circle' : s.icon} size={compact ? 12 : 14} />
            {s.label}
          </span>
          {idx < steps.length - 1 ? (
            <span
              aria-hidden
              style={{
                width: 'var(--dim-space-300, 12px)',
                height: 'var(--dim-stroke-200, 2px)',
                background: state[steps[idx + 1].key] === 'pending'
                  ? 'var(--border-neutral-tertiary, #E2E4E6)'
                  : 'var(--surface-brandPrimary-secondary, #C5EDDA)',
                borderRadius: 'var(--dim-radius-full)',
              }}
            />
          ) : null}
        </React.Fragment>
      );
    })}
  </div>
);

export default PageCard;
