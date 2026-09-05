import React from 'react';
import Icon from '@/components/icons/Icon';
import CommunityLayout from './CommunityLayout';

/* Shared building blocks for the Community module while pages are being
   ported from claude/Community's static prototype one at a time. */

/** Card shell — Figma-standard surface-card-100 · radius-500 · brand shadow,
    matching the content card every other top-level system (Schedule, …)
    wraps its page body in. */
export const CommunityCard = ({ children, style }) => (
  <section
    style={{
      background: 'var(--surface-card-100, #FFFFFF)',
      borderRadius: 'var(--dim-radius-500, 16px)',
      boxShadow: 'var(--shadow-brand-drop-bottom-200, 0 1px 4px rgba(8,167,104,0.10), 0 1px 2px rgba(8,167,104,0.08))',
      padding: 'var(--dim-space-600, 24px)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--dim-space-600, 24px)',
      alignItems: 'stretch',
      ...style,
    }}
  >
    {children}
  </section>
);

/** ยังไม่พอร์ตจาก static prototype — placeholder ที่คงเส้นทาง/เมนูไว้ให้ครบ
    ระหว่างทยอยแปลงแต่ละหน้าเป็น React ตามกฎ token ของ CLAUDE.md. */
export const CommunityComingSoon = ({ title }) => (
  <div
    className='flex flex-col items-center justify-center w-full text-center'
    style={{
      gap: 'var(--dim-space-300, 12px)',
      paddingTop: 'var(--dim-space-800, 32px)',
      paddingBottom: 'var(--dim-space-800, 32px)',
    }}
  >
    <span
      className='inline-flex items-center justify-center'
      style={{
        width: 'var(--dim-size-900, 44px)',
        height: 'var(--dim-size-900, 44px)',
        borderRadius: 'var(--dim-radius-full)',
        background: 'var(--surface-brandPrimary-quaternary)',
        color: 'var(--text-brandPrimary-default)',
      }}
    >
      <Icon name='construction' size={24} />
    </span>
    <span
      style={{
        color: 'var(--text-content-primary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-medium, 500)',
      }}
    >
      {title} — อยู่ระหว่างพอร์ตจากต้นแบบ
    </span>
  </div>
);

/** Minimal stub page — keeps every sidebar/breadcrumb route reachable while
    its content is queued for conversion (see TaskList). */
export const CommunityStubPage = ({ activeKey, breadcrumb, title }) => (
  <CommunityLayout activeKey={activeKey} breadcrumb={breadcrumb}>
    <CommunityCard>
      <CommunityComingSoon title={title} />
    </CommunityCard>
  </CommunityLayout>
);
