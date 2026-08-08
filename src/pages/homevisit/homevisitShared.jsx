import React, { useState } from 'react';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import {
  resolveGroup,
  resolveSource,
  resolveFlag,
  resolveProfession,
  getHomeVisitAccess,
  setHomeVisitAccess,
  PERSISTENT_FLAG_GROUPS,
} from '@/data/homevisitVisits';

/* Shared building blocks for งานเยี่ยมบ้าน (TOR §1.10.12 + §1.18).
   TopicHeader / Field / StepCard / SectionCard / EmptyHint mirror the
   conventions already used by ANC (`AncSteps.jsx`) and the sibling
   clinic modules verbatim — same flat sections, same card chrome — so
   the module reads as one system with the rest of PHCIS.

   HomeVisitAccessGate implements the §1.18.3 "ดูข้อมูลย้อนหลังตามสิทธิ
   ผู้ใช้" / §1.4.2 ข้อมูลลับ locked state that every เยี่ยมบ้าน screen
   must be able to show. */

export const TopicHeader = ({ icon, children, aside }) => (
  <div className='flex items-center gap-2 w-full flex-wrap'>
    <span className='text-brand-500'><Icon name={icon} size={20} /></span>
    <h2 className='text-base font-bold text-brand-500'>{children}</h2>
    {aside && <><div className='flex-1' />{aside}</>}
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

/** Flat section inside a step body — no card chrome, only a scroll anchor
    (same convention as AncSteps' AssessmentCard). */
export const StepSection = React.forwardRef(({ children }, ref) => (
  <div
    ref={ref}
    className='flex flex-col w-full'
    style={{ gap: 'var(--dim-space-300, 12px)', scrollMarginTop: 110 }}
  >
    {children}
  </div>
));
StepSection.displayName = 'StepSection';

/** White panel used by the queue / registry / follow-up screens. */
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

/** Inline notice band. Tones alias the semantic pill token pairs — there is
    no `--surface-warning-*` family in tokens.css, so warning/danger borrow
    the pill orange / pill red pairs (their true values). */
const NOTICE_TONES = {
  info:    { bg: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', fg: 'var(--text-brandPrimary-default, #007549)' },
  warning: { bg: 'var(--surface-pill-orange, #FFEDD5)',             fg: 'var(--text-pill-orange, #C2410C)'          },
  danger:  { bg: 'var(--surface-pill-red, #FEE2E2)',                fg: 'var(--text-pill-red, #B91C1C)'             },
  neutral: { bg: 'var(--surface-neutral-quaternary, #F9FBFB)',      fg: 'var(--text-content-secondary, #636B72)'    },
};

export const NoticeBand = ({ tone = 'warning', icon = 'warning', children, action }) => {
  const t = NOTICE_TONES[tone] || NOTICE_TONES.warning;
  return (
    <div
      className='flex items-start w-full flex-wrap'
      style={{
        gap: 'var(--dim-space-200, 8px)',
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
      <span className='flex-1 min-w-0'>{children}</span>
      {action}
    </div>
  );
};

/** Centered empty / no-result block with an optional CTA. */
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

/** Audit stamp row — ผู้บันทึก + เวลา (และผู้แก้ไขเมื่อมี). */
export const AuditStamp = ({ by, at, editedBy, editedAt, prefix = 'บันทึกโดย' }) => (
  <div
    className='flex items-center gap-2 flex-wrap'
    style={{ color: 'var(--text-content-tertiary, #858C92)', fontSize: 'var(--type-size-xs)' }}
  >
    <Icon name='history_edu' size={14} />
    <span>{prefix} {by || '—'} · {at || '—'}</span>
    {editedBy && <span>· แก้ไขล่าสุดโดย {editedBy} · {editedAt}</span>}
  </div>
);

/* ─── Badges ─────────────────────────────────────────────────────── */

export const GroupBadge = ({ group, size = 'small', full = false }) => {
  const g = resolveGroup(group);
  if (!g) return <span>—</span>;
  return (
    <ColorfulBadge style={g.badge} size={size} hierarchy='secondary' width='hug' maxWidth={360}>
      {full ? g.label : g.short}
    </ColorfulBadge>
  );
};

export const SourceBadge = ({ source, size = 'small' }) => {
  const s = resolveSource(source);
  if (!s) return <span>—</span>;
  return (
    <ColorfulBadge style={s.badge} size={size} hierarchy='secondary' width='hug' maxWidth={320}>
      {s.short}
    </ColorfulBadge>
  );
};

export const ProfessionBadge = ({ profession, size = 'small' }) => {
  const p = resolveProfession(profession);
  if (!p) return <span>—</span>;
  return <ColorfulBadge style={p.badge} size={size} hierarchy='secondary'>{p.label}</ColorfulBadge>;
};

/** ธงสถานะติดตัวผู้รับบริการ — กลุ่มระยะสุดท้าย/กลุ่มพิเศษจะมีธงกลุ่มนำหน้า
    เสมอ (edge case: flag ต้องติดตามไปทุกหน้าจอ). */
export const FlagBadges = ({ group, flags = [], size = 'small' }) => {
  const g = resolveGroup(group);
  const showGroupFlag = g && PERSISTENT_FLAG_GROUPS.includes(group);
  if (!showGroupFlag && (!flags || flags.length === 0)) return null;
  return (
    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100, 4px)' }}>
      {showGroupFlag && (
        <ColorfulBadge style={g.badge} size={size} hierarchy='primary' icon='flag' width='hug' maxWidth={220}>
          {g.short}
        </ColorfulBadge>
      )}
      {(flags || []).map((key) => {
        const f = resolveFlag(key);
        if (!f) return null;
        return (
          <ColorfulBadge key={key} style={f.badge} size={size} hierarchy='secondary' width='hug' maxWidth={220}>
            {f.label}
          </ColorfulBadge>
        );
      })}
    </div>
  );
};

/** Greyed cell style for cancelled rows (kept visible, never deleted). */
export const GREYED = { color: 'var(--text-content-tertiary, #858C92)' };

/* ─── FilterDateTag → ISO range ──────────────────────────────────────
   FilterDateTag emits only `{ quick }` for its preset keys, so every
   consumer resolves the key itself. `null` = ไม่กรองตามวันที่. */

const isoOf = (d) => {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
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
    case '7days': return { from: isoOf(shiftDays(today, -6)), to: isoOf(today) };
    case '30days': return { from: isoOf(shiftDays(today, -29)), to: isoOf(today) };
    case 'thisweek': return {
      from: isoOf(shiftDays(today, -today.getDay())),
      to: isoOf(shiftDays(today, 6 - today.getDay())),
    };
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

export const isoToday = () => isoOf(new Date());
export const isoMonthsAgo = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return isoOf(d);
};
export const isoDate = isoOf;

/* ─── §1.18.3 / §1.4.2 — สิทธิเข้าถึงข้อมูลเยี่ยมบ้าน ─────────────── */

/** Wraps a screen body: users without สิทธิสำนักอนามัย see a locked panel
    instead of any patient content (never an empty list). */
export const HomeVisitAccessGate = ({ children, subject = 'ข้อมูลการเยี่ยมบ้าน' }) => {
  const [, setTick] = useState(0);
  const access = getHomeVisitAccess();

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
        <span style={{
          fontSize: 'var(--type-size-lg)',
          fontWeight: 'var(--type-weight-bold)',
          color: 'var(--text-content-default, #363B3F)',
        }}>
          บัญชีของคุณไม่มีสิทธิ์เข้าถึง{subject}
        </span>
        <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)', maxWidth: 560 }}>
          การดูข้อมูลผู้รับบริการเยี่ยมบ้านและประวัติย้อนหลังต้องมีสิทธิ์ของสำนักอนามัย
          (TOR §1.18.3 · ข้อมูลลับ §1.4.2) — ข้อมูลถูกซ่อนไว้ทั้งหมด ไม่ใช่ “ไม่มีข้อมูล”
          หากต้องเข้าถึงเพื่อการดูแลผู้ป่วย โปรดติดต่อหัวหน้างานเพื่อขอสิทธิ์
        </span>
        <BrandSubdueButton
          variant='outline'
          size='md'
          leadingIcon='key'
          onClick={() => { setHomeVisitAccess(true); setTick((t) => t + 1); }}
        >
          จำลองการได้รับสิทธิ์ (สำหรับเดโม)
        </BrandSubdueButton>
      </div>
    </div>
  );
};

/** Header action that revokes the mock rights so reviewers can reach the
    locked state from any เยี่ยมบ้าน screen in one click. */
export const AccessDemoToggle = ({ onRevoked }) => (
  <NeutralSubdueButton
    variant='outline'
    size='sm'
    leadingIcon='lock'
    onClick={() => { setHomeVisitAccess(false); onRevoked?.(); }}
  >
    จำลองผู้ใช้ไม่มีสิทธิ์
  </NeutralSubdueButton>
);
