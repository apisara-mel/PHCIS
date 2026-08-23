import React from 'react';
import Icon from '@/components/icons/Icon';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';

/* schoolHealthShared.jsx — ชุด layout primitive ที่ใช้ซ้ำใน 7 หน้าของ
   งานอนามัยโรงเรียน (การ์ดขาว · หัวข้อ · empty state · แถบแจ้งเตือน ·
   แถวเลขหน้า · ช่องอ่านอย่างเดียว)

   ทำไมไม่ import จากโมดูลอื่น: `CheckupUi.jsx` ให้ชุดเดียวกันแต่เป็นไฟล์ของ
   โมดูลตรวจสุขภาพ — playbook §4 ห้าม builder แก้ไฟล์โมดูลอื่น ถ้าต้องปรับ
   prop ในอนาคตจะแก้ไม่ได้ จึงคัดลอกโครง (ไม่ใช่โค้ดตกแต่งใหม่) มาไว้ใน
   โฟลเดอร์โมดูลตัวเอง และรายงานผ่าน manifest → newComponents

   ทุกค่า visual alias token จาก design.md; padding/margin ใช้ longhand
   เสมอ (React inline shorthand + var() จะ render เป็น 0) */

export const CARD_STYLE = {
  background: 'var(--surface-card-100, #FFFFFF)',
  borderRadius: 'var(--dim-radius-500, 16px)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
  boxShadow: 'var(--shadow-card-strong)',
  paddingTop: 'var(--dim-space-600, 24px)',
  paddingRight: 'var(--dim-space-600, 24px)',
  paddingBottom: 'var(--dim-space-600, 24px)',
  paddingLeft: 'var(--dim-space-600, 24px)',
};

export const PageBody = ({ children }) => (
  <div
    className='flex flex-col flex-1 min-w-0'
    style={{
      paddingTop: 'var(--dim-space-600, 24px)',
      paddingRight: 'var(--dim-space-600, 24px)',
      paddingBottom: 'var(--dim-space-600, 24px)',
      paddingLeft: 'var(--dim-space-600, 24px)',
      gap: 'var(--dim-space-600, 24px)',
    }}
  >
    {children}
  </div>
);

export const PageCard = ({ children, gap = 'var(--dim-space-500, 20px)', style = {} }) => (
  <section className='w-full flex flex-col min-w-0' style={{ ...CARD_STYLE, gap, ...style }}>
    {children}
  </section>
);

export const SubCard = ({ children, tone = 'default', style = {} }) => (
  <div
    className='w-full flex flex-col min-w-0'
    style={{
      background: tone === 'brand'
        ? 'var(--surface-brandPrimary-quaternary, #F4FBF8)'
        : 'var(--surface-card-100, #FFFFFF)',
      borderRadius: 'var(--dim-radius-400, 12px)',
      border: `var(--dim-stroke-100, 1px) solid ${tone === 'brand'
        ? 'var(--border-brandPrimary-quaternary, #E2F3EB)'
        : 'var(--border-card-default, #E2E4E6)'}`,
      paddingTop: 'var(--dim-space-400, 16px)',
      paddingRight: 'var(--dim-space-400, 16px)',
      paddingBottom: 'var(--dim-space-400, 16px)',
      paddingLeft: 'var(--dim-space-400, 16px)',
      gap: 'var(--dim-space-300, 12px)',
      ...style,
    }}
  >
    {children}
  </div>
);

export const SectionHeader = ({ icon, title, subtitle, trailing }) => (
  <div className='flex items-start w-full min-w-0' style={{ gap: 'var(--dim-space-300, 12px)' }}>
    {icon ? (
      <span
        className='inline-flex items-center justify-center shrink-0'
        style={{ color: 'var(--text-brandPrimary-default, #007549)' }}
      >
        <Icon name={icon} size={20} />
      </span>
    ) : null}
    <div className='flex flex-col min-w-0 flex-1' style={{ gap: 'var(--dim-space-100, 4px)' }}>
      <span
        style={{
          color: 'var(--text-brandPrimary-default, #007549)',
          fontFamily: 'var(--type-family-heading-graphic2)',
          fontSize: 'var(--type-size-base, 16px)',
          lineHeight: 1.4,
        }}
      >
        {title}
      </span>
      {subtitle ? (
        <span
          style={{
            color: 'var(--text-content-tertiary, #858C92)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs, 12px)',
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </span>
      ) : null}
    </div>
    {trailing ? <div className='flex items-center shrink-0 flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>{trailing}</div> : null}
  </div>
);

const TONE_SURFACE = {
  info: 'var(--surface-alert-info, #F0F6FF)',
  brand: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
  warning: 'var(--surface-alert-warning, #FFF9F0)',
  danger: 'var(--surface-alert-error, #FFF0F0)',
};

const TONE_TEXT = {
  info: 'var(--text-alert-info, #1D4ED8)',
  brand: 'var(--text-brandPrimary-default, #007549)',
  warning: 'var(--text-alert-warning, #C2410C)',
  danger: 'var(--text-alert-error, #B91C1C)',
};

export const NoticeBar = ({ tone = 'info', icon = 'info', children, trailing, onClose }) => (
  <div
    className='flex items-start w-full min-w-0'
    style={{
      gap: 'var(--dim-space-300, 12px)',
      paddingTop: 'var(--dim-space-300, 12px)',
      paddingRight: 'var(--dim-space-400, 16px)',
      paddingBottom: 'var(--dim-space-300, 12px)',
      paddingLeft: 'var(--dim-space-400, 16px)',
      borderRadius: 'var(--dim-radius-200, 8px)',
      background: TONE_SURFACE[tone] || TONE_SURFACE.info,
      color: TONE_TEXT[tone] || TONE_TEXT.info,
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-sm, 14px)',
      lineHeight: 1.5,
    }}
  >
    <span className='shrink-0' style={{ marginTop: 'var(--dim-space-050, 2px)' }}><Icon name={icon} size={18} /></span>
    <div className='flex-1 min-w-0'>{children}</div>
    {trailing}
    {onClose ? (
      <button
        type='button'
        aria-label='ปิดการแจ้งเตือน'
        onClick={onClose}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}
      >
        <Icon name='close' size={16} />
      </button>
    ) : null}
  </div>
);

/** รายการ error ก่อนบันทึก — นับจำนวนไว้ด้านบนเพื่อให้ผู้ใช้รู้ขอบเขต */
export const ErrorList = ({ errors = [] }) => {
  if (!errors.length) return null;
  return (
    <div
      className='flex flex-col w-full'
      style={{
        gap: 'var(--dim-space-100, 4px)',
        paddingTop: 'var(--dim-space-300, 12px)',
        paddingRight: 'var(--dim-space-400, 16px)',
        paddingBottom: 'var(--dim-space-300, 12px)',
        paddingLeft: 'var(--dim-space-400, 16px)',
        borderRadius: 'var(--dim-radius-200, 8px)',
        background: 'var(--surface-alert-error, #FFF0F0)',
        color: 'var(--text-alert-error, #B91C1C)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
      }}
      role='alert'
    >
      <span className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)', fontWeight: 'var(--type-weight-medium)' }}>
        <Icon name='error' size={18} />
        {`ต้องแก้ไข ${errors.length} รายการก่อนบันทึก`}
      </span>
      {errors.map((e) => <span key={e}>• {e}</span>)}
    </div>
  );
};

export const EmptyState = ({
  icon = 'search_off',
  title,
  subtitle,
  actionLabel,
  onAction,
  compact = false,
}) => (
  <div
    className='flex flex-col items-center justify-center w-full text-center'
    style={{
      gap: 'var(--dim-space-200, 8px)',
      paddingTop: compact ? 'var(--dim-space-500, 20px)' : 'var(--dim-space-800, 32px)',
      paddingBottom: compact ? 'var(--dim-space-500, 20px)' : 'var(--dim-space-800, 32px)',
      paddingLeft: 'var(--dim-space-400, 16px)',
      paddingRight: 'var(--dim-space-400, 16px)',
      borderRadius: 'var(--dim-radius-300, 10px)',
      border: 'var(--dim-stroke-100, 1px) dashed var(--border-neutral-tertiary, #E2E4E6)',
    }}
  >
    <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}><Icon name={icon} size={28} /></span>
    <span
      style={{
        color: 'var(--text-content-default, #363B3F)',
        fontFamily: 'var(--type-family-heading-graphic2)',
        fontSize: 'var(--type-size-sm, 14px)',
      }}
    >
      {title}
    </span>
    {subtitle ? (
      <span
        style={{
          color: 'var(--text-content-tertiary, #858C92)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs, 12px)',
          lineHeight: 1.6,
          maxWidth: 'var(--dim-size-2700, 448px)',
        }}
      >
        {subtitle}
      </span>
    ) : null}
    {actionLabel && onAction ? (
      <BrandSubdueButton variant='outline' size='sm' leadingIcon='arrow_forward' onClick={onAction}>
        {actionLabel}
      </BrandSubdueButton>
    ) : null}
  </div>
);

/** แถวเลขหน้ามาตรฐาน "แสดง X–Y จาก Z รายการ" */
export const PagerRow = ({ page, pageSize, total, onPageChange, unit = 'รายการ', sticky = false }) => {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);
  return (
    <div
      className='flex items-center w-full'
      style={{
        gap: 'var(--dim-space-200, 8px)',
        ...(sticky
          ? {
            position: 'sticky',
            bottom: 'var(--dim-space-0, 0px)',
            zIndex: 50,
            background: 'var(--surface-card-100, #FFFFFF)',
            paddingTop: 'var(--dim-space-200, 8px)',
            borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
          }
          : null),
      }}
    >
      <span
        style={{
          color: 'var(--text-content-secondary, #636B72)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm, 14px)',
        }}
      >
        {`แสดง ${start}–${end} จาก ${total} ${unit}`}
      </span>
      <div className='flex-1' />
      <Pagination currentPage={safePage} pageCount={pageCount} onPageChange={onPageChange} />
    </div>
  );
};

/** ช่องอ่านอย่างเดียว (label เล็ก + ค่า) */
export const ReadField = ({ label, value, minWidth = 180, valueColor }) => (
  <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)', minWidth }}>
    <span
      style={{
        color: 'var(--text-content-tertiary, #858C92)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs, 12px)',
      }}
    >
      {label}
    </span>
    <span
      style={{
        color: valueColor || 'var(--text-content-default, #363B3F)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        lineHeight: 1.5,
        wordBreak: 'break-word',
      }}
    >
      {value === '' || value == null ? '—' : value}
    </span>
  </div>
);

/** label + control สำหรับฟอร์มที่ซ่อน label ในตัว control */
export const Field = ({ label, required, hint, flex = '1 1 0', minWidth = 200, children }) => (
  <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-150, 6px)', flex, minWidth }}>
    <span
      style={{
        color: 'var(--text-content-default, #363B3F)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
      }}
    >
      {label}
      {required ? <span style={{ color: 'var(--text-input-require, #DC2626)' }}> *</span> : null}
    </span>
    {children}
    {hint ? (
      <span
        style={{
          color: 'var(--text-content-tertiary, #858C92)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs, 12px)',
        }}
      >
        {hint}
      </span>
    ) : null}
  </div>
);

export const FieldRow = ({ children, gap = 'var(--dim-space-400, 16px)' }) => (
  <div className='flex items-start w-full flex-wrap' style={{ gap }}>
    {children}
  </div>
);

/** KPI tile พร้อมไอคอน — ใช้ในหน้า Dashboard และหัวการ์ดสรุป */
export const StatTile = ({ label, value, unit, tone = 'brand', icon, hint }) => (
  <div
    className='flex items-start min-w-0'
    style={{
      gap: 'var(--dim-space-300, 12px)',
      flex: '1 1 var(--dim-size-2200, 192px)',
      minWidth: 'var(--dim-size-2200, 192px)',
      paddingTop: 'var(--dim-space-300, 12px)',
      paddingRight: 'var(--dim-space-400, 16px)',
      paddingBottom: 'var(--dim-space-300, 12px)',
      paddingLeft: 'var(--dim-space-400, 16px)',
      borderRadius: 'var(--dim-radius-300, 10px)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default, #E2E4E6)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    {icon ? (
      <span className='shrink-0' style={{ color: TONE_TEXT[tone] || TONE_TEXT.brand }}>
        <Icon name={icon} size={22} />
      </span>
    ) : null}
    <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
      <span className='inline-flex items-baseline' style={{ gap: 'var(--dim-space-100, 4px)' }}>
        <span
          className='tabular-nums'
          style={{
            color: TONE_TEXT[tone] || TONE_TEXT.brand,
            fontFamily: 'var(--type-family-heading-graphic2)',
            fontSize: 'var(--type-size-2xl, 24px)',
            lineHeight: 1.2,
          }}
        >
          {value}
        </span>
        {unit ? (
          <span style={{ color: 'var(--text-content-tertiary, #858C92)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)' }}>
            {unit}
          </span>
        ) : null}
      </span>
      <span style={{ color: 'var(--text-content-secondary, #636B72)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', lineHeight: 1.4 }}>
        {label}
      </span>
      {hint ? (
        <span style={{ color: 'var(--text-content-quaternary, #ADB2B7)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)' }}>
          {hint}
        </span>
      ) : null}
    </div>
  </div>
);

export const StatRow = ({ children }) => (
  <div className='flex items-stretch w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
    {children}
  </div>
);

/** บรรทัด audit "ผู้บันทึก · ตำแหน่ง · เวลา" ท้าย record ทุกใบ */
export const AuditLine = ({ children, icon = 'history' }) => (
  <span
    className='inline-flex items-center flex-wrap'
    style={{
      gap: 'var(--dim-space-150, 6px)',
      color: 'var(--text-content-tertiary, #858C92)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-xs, 12px)',
      lineHeight: 1.5,
    }}
  >
    <Icon name={icon} size={14} />
    {children}
  </span>
);

/** แถบสิทธิไม่เพียงพอ — ทุกหน้าที่มีปุ่มบันทึกต้องแสดงเมื่อ read-only */
export const ReadOnlyBanner = ({ show, message }) => {
  if (!show) return null;
  return (
    <NoticeBar tone='warning' icon='lock'>
      {message || 'บัญชีของคุณไม่มีสิทธิบันทึกข้อมูลงานอนามัยโรงเรียน — ดูข้อมูลได้อย่างเดียว ปุ่มบันทึก/นำเข้า/เลื่อนชั้นถูกปิดไว้'}
    </NoticeBar>
  );
};

/** badge สถานะทะเบียน/record มาตรฐาน */
export const StatusPill = ({ meta, children }) => (
  <ColorfulBadge style={meta?.style || 'grey'} size='small' hierarchy='secondary'>
    {children || meta?.label || '—'}
  </ColorfulBadge>
);

export default PageCard;
