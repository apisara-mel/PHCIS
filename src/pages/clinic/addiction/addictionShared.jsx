import React, { useState } from 'react';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import {
  resolveProgram,
  getAddictionAccess,
  setAddictionAccess,
} from '@/data/addictionVisits';

/* Shared building blocks for the งานบำบัดสารเสพติด module (TOR §1.10.5).
   TopicHeader / Field / StepCard mirror the ANC conventions in
   `AncSteps.jsx` verbatim; AddictionAccessGate implements the §1.4.2
   "ข้อมูลลับ" masked state every addiction screen must expose. */

export const TopicHeader = ({ icon, children }) => (
  <div className='flex items-center gap-2 w-full'>
    <span className='text-brand-500'><Icon name={icon} size={20} /></span>
    <h2 className='text-base font-bold text-brand-500'>{children}</h2>
  </div>
);

export const Field = ({ label, required, children, hint, error }) => (
  <div className='flex-1 flex flex-col gap-1.5 min-w-0'>
    <div className='flex items-center text-sm text-ink leading-snug'>
      <span>{label}</span>
      {required && <span className='ml-0.5' style={{ color: 'var(--text-input-require)' }}>*</span>}
    </div>
    {children}
    {error ? (
      <span style={{ color: 'var(--text-input-errorHelper, #DC2626)', fontSize: 'var(--type-size-xs)' }}>
        {error}
      </span>
    ) : hint ? (
      <span style={{ color: 'var(--text-content-quaternary, #ADB2B7)', fontSize: 'var(--type-size-xs)' }}>
        {hint}
      </span>
    ) : null}
  </div>
);

export const StepCard = ({ children }) => (
  <section className='flex flex-col' style={{ gap: 'var(--dim-space-600)' }}>{children}</section>
);

export const ProgramBadge = ({ program, size = 'small' }) => {
  const p = resolveProgram(program);
  if (!p) return <span>—</span>;
  return (
    <ColorfulBadge style={p.badge} size={size} hierarchy='secondary'>{p.short}</ColorfulBadge>
  );
};

/** Inline notice band — warning / danger / info flat bar (same visual
    convention as ANC's mental-health and danger-sign callouts). */
export const NoticeBand = ({ tone = 'warning', icon = 'warning', children }) => {
  const TONES = {
    warning: { bg: 'var(--surface-warning-quaternary, #FFF9F0)', fg: 'var(--text-warning-default, #C2410C)' },
    danger:  { bg: 'var(--surface-danger-quaternary, #FFF0F0)',  fg: 'var(--text-danger-default, #B91C1C)'  },
    info:    { bg: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', fg: 'var(--text-brandPrimary-default, #007549)' },
  };
  const t = TONES[tone] || TONES.warning;
  return (
    <div
      className='flex items-start gap-2 w-full'
      style={{
        paddingTop: 'var(--dim-space-300, 12px)',
        paddingBottom: 'var(--dim-space-300, 12px)',
        paddingLeft: 'var(--dim-space-400, 16px)',
        paddingRight: 'var(--dim-space-400, 16px)',
        borderRadius: 'var(--dim-radius-200, 8px)',
        background: t.bg,
        color: t.fg,
        fontSize: 'var(--type-size-sm)',
      }}
    >
      <Icon name={icon} size={18} />
      <span>{children}</span>
    </div>
  );
};

/** White panel used by the registry / follow-up / community screens —
    same chrome as the sibling clinic registries (MentalHealth*). */
export const SectionCard = ({ icon, title, aside, children }) => (
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
    {(icon || title || aside) && (
      <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        {icon && <span className='text-brand-500'><Icon name={icon} size={20} /></span>}
        {title && <h2 className='text-base font-bold text-brand-500'>{title}</h2>}
        <div className='flex-1' />
        {aside}
      </div>
    )}
    {children}
  </section>
);

/** Centered empty / no-result block. `action` renders a CTA underneath so
    "ว่างจริง" and "กรองแล้วไม่เจอ" can offer different next steps. */
export const EmptyHint = ({ icon = 'search_off', children, action }) => (
  <div
    className='flex flex-col items-center justify-center w-full text-center'
    style={{
      gap: 'var(--dim-space-300, 12px)',
      paddingTop: 'var(--dim-space-1200, 48px)',
      paddingBottom: 'var(--dim-space-1200, 48px)',
      color: 'var(--text-content-tertiary, #858C92)',
      fontSize: 'var(--type-size-sm)',
    }}
  >
    <Icon name={icon} size={32} />
    <span style={{ maxWidth: 520 }}>{children}</span>
    {action}
  </div>
);

/* ── FilterDateTag → ISO range ─────────────────────────────────────
   FilterDateTag emits only `{ quick }` for its preset keys (the computed
   dates stay inside DateFilterPopup), so every consumer has to resolve
   the key itself. `null` means "ไม่กรองตามวันที่". */

const isoOf = (d) => {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0); /* midday → toISOString never rolls back a day */
  return x.toISOString().slice(0, 10);
};

const shiftDays = (base, days) => {
  const x = new Date(base);
  x.setDate(x.getDate() + days);
  return x;
};

export const dateFilterToIsoRange = (value) => {
  const quick = value?.quick || 'all';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = (d) => ({ from: isoOf(d), to: isoOf(d) });

  switch (quick) {
    case 'all': return null;
    case 'today': return day(today);
    case 'yesterday': return day(shiftDays(today, -1));
    case 'tomorrow': return day(shiftDays(today, 1));
    case 'monthStart': return day(new Date(today.getFullYear(), today.getMonth(), 1));
    case 'monthEnd': return day(new Date(today.getFullYear(), today.getMonth() + 1, 0));
    case 'lastMonthStart': return day(new Date(today.getFullYear(), today.getMonth() - 1, 1));
    case 'lastMonthEnd': return day(new Date(today.getFullYear(), today.getMonth(), 0));
    case 'todayLastYear': return day(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()));
    case '7days': return { from: isoOf(shiftDays(today, -6)), to: isoOf(today) };
    case '30days': return { from: isoOf(shiftDays(today, -29)), to: isoOf(today) };
    case 'thisweek': return { from: isoOf(shiftDays(today, -today.getDay())), to: isoOf(shiftDays(today, 6 - today.getDay())) };
    case 'thismonth': return {
      from: isoOf(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: isoOf(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
    };
    case 'lastmonth': return {
      from: isoOf(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      to: isoOf(new Date(today.getFullYear(), today.getMonth(), 0)),
    };
    case 'thisyear': return {
      from: isoOf(new Date(today.getFullYear(), 0, 1)),
      to: isoOf(new Date(today.getFullYear(), 11, 31)),
    };
    case 'lastyear': return {
      from: isoOf(new Date(today.getFullYear() - 1, 0, 1)),
      to: isoOf(new Date(today.getFullYear() - 1, 11, 31)),
    };
    case 'custom': {
      if (value?.tab === 'single' && value.single) return day(value.single);
      if (value?.tab === 'range' && value.range?.start && value.range?.end) {
        return { from: isoOf(value.range.start), to: isoOf(value.range.end) };
      }
      return null;
    }
    default: return null;
  }
};

/** Audit stamp row — ผู้บันทึก + เวลา (and ผู้แก้ไข when present). */
export const AuditStamp = ({ by, at, editedBy, editedAt }) => (
  <div
    className='flex items-center gap-2 flex-wrap'
    style={{ color: 'var(--text-content-tertiary, #858C92)', fontSize: 'var(--type-size-xs)' }}
  >
    <Icon name='history_edu' size={14} />
    <span>บันทึกโดย {by} · {at}</span>
    {editedBy && <span>· แก้ไขล่าสุดโดย {editedBy} · {editedAt}</span>}
  </div>
);

/* ── §1.4.2 ข้อมูลลับ — clinic-rights gate ─────────────────────────
   Addiction records are confidential: users outside งานบำบัดสารเสพติด
   see a locked state instead of any patient data. Access is mocked as a
   session flag (`addictionVisits.getAddictionAccess`) so the masked
   state is demonstrable on every screen via the demo toggle below. */

export const AddictionAccessGate = ({ children }) => {
  /* Read the flag on every render (sessionStorage is synchronous) — the
     tick only forces a re-render after the demo grant button flips it. */
  const [, setTick] = useState(0);
  const access = getAddictionAccess();

  if (access) return children;

  return (
    <div
      className='flex flex-col flex-1 min-w-0'
      style={{
        paddingTop: 'var(--dim-space-600, 24px)',
        paddingBottom: 'var(--dim-space-600, 24px)',
        paddingLeft: 'var(--dim-space-600, 24px)',
        paddingRight: 'var(--dim-space-600, 24px)',
      }}
    >
      <div
        className='w-full flex flex-col items-center text-center'
        style={{
          background: 'var(--surface-card-100)',
          borderRadius: 'var(--dim-radius-500)',
          border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
          boxShadow: 'var(--shadow-card-strong)',
          paddingTop: 'var(--dim-space-800, 32px)',
          paddingBottom: 'var(--dim-space-800, 32px)',
          paddingLeft: 'var(--dim-space-600)',
          paddingRight: 'var(--dim-space-600)',
          gap: 'var(--dim-space-300)',
        }}
      >
        <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>
          <Icon name='lock_person' size={48} />
        </span>
        <span style={{ fontSize: 'var(--type-size-lg)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default, #363B3F)' }}>
          ข้อมูลงานบำบัดสารเสพติดเป็นข้อมูลลับ
        </span>
        <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)', maxWidth: 520 }}>
          บัญชีของคุณไม่มีสิทธิ์เข้าถึงข้อมูลผู้รับบริการของงานบำบัดสารเสพติด (ตามข้อกำหนดข้อมูลลับ §1.4.2)
          หากต้องเข้าถึงเพื่อการรักษา โปรดติดต่อหัวหน้างานเพื่อขอสิทธิ์เข้าใช้งาน
        </span>
        <BrandSubdueButton
          variant='outline'
          size='md'
          leadingIcon='key'
          onClick={() => { setAddictionAccess(true); setTick((t) => t + 1); }}
        >
          จำลองการได้รับสิทธิ์ (สำหรับเดโม)
        </BrandSubdueButton>
      </div>
    </div>
  );
};

/** Header action that revokes the mock clinic rights, so reviewers can
    reach the masked state from any addiction screen in one click. */
export const AccessDemoToggle = ({ onRevoked }) => (
  <NeutralSubdueButton
    variant='outline'
    size='sm'
    leadingIcon='lock'
    onClick={() => { setAddictionAccess(false); onRevoked?.(); }}
  >
    จำลองผู้ใช้ไม่มีสิทธิ์
  </NeutralSubdueButton>
);
