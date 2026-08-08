import React from 'react';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';

/* dentalShared — chrome ที่ทั้ง DentalFormPage และ DentalSteps ใช้ร่วมกัน
   (pattern เดียวกับ hivStiShared / addictionShared): การ์ดหัวข้อ, แถบเตือน,
   แถบ error, ป้ายสิทธิ, ตัวจัดรูปแบบเงิน/ตำแหน่งฟัน และการ์ด "ไม่มีสิทธิ์
   เข้าถึง". แยกไฟล์เพื่อไม่ให้ DentalSteps.jsx บวมเกิน (playbook §3 —
   ANC/NCD แยก shared เมื่อสเต็ปมีตารางหลายชุด).

   ทุกค่า visual alias token จาก design.md พร้อม fallback ที่ตรงค่าจริง
   และใช้ inline padding แบบ longhand เท่านั้น (CLAUDE.md — shorthand ที่มี
   var() จะ render เป็น 0). */

/* ── หัวข้อของแต่ละบล็อกในสเต็ป ───────────────────────────────────── */
export const TopicHeader = ({ icon = 'dentistry', children, action }) => (
  <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
    <span style={{ color: 'var(--text-brandPrimary-default, #007549)', display: 'inline-flex' }}>
      <Icon name={icon} size={20} />
    </span>
    <h2
      className='flex-1 min-w-0'
      style={{
        color: 'var(--text-brandPrimary-default, #007549)',
        fontFamily: 'var(--type-family-heading-content)',
        fontSize: 'var(--type-size-base)',
        fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
      }}
    >
      {children}
    </h2>
    {action}
  </div>
);

/* ── ตัวห่อสเต็ป (ระยะห่างระหว่างบล็อก) ────────────────────────────── */
export const StepCard = ({ children }) => (
  <section className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-600)' }}>
    {children}
  </section>
);

/* ── การ์ดย่อยแบบมีเส้นขอบ (ตาราง / สรุปยอด) ───────────────────────── */
export const SectionCard = ({ children, tone = 'default' }) => (
  <div
    className='flex flex-col w-full min-w-0'
    style={{
      gap: 'var(--dim-space-300)',
      paddingTop: 'var(--dim-space-400)',
      paddingBottom: 'var(--dim-space-400)',
      paddingLeft: 'var(--dim-space-400)',
      paddingRight: 'var(--dim-space-400)',
      borderRadius: 'var(--dim-radius-400)',
      border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
      background: tone === 'brand'
        ? 'var(--surface-brandPrimary-quaternary, #F4FBF8)'
        : 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    {children}
  </div>
);

/* ── ป้ายชื่อ + ค่า (สรุปข้อมูลอ่านอย่างเดียว) ─────────────────────── */
export const InfoPair = ({ label, value, minWidth = 160 }) => (
  <div className='flex flex-col' style={{ gap: 'var(--dim-space-050)', minWidth }}>
    <span style={{
      color: 'var(--text-content-tertiary, #858C92)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-xs)',
    }}>
      {label}
    </span>
    <span style={{
      color: 'var(--text-content-default, #363B3F)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-sm)',
      fontWeight: 'var(--type-weight-medium)',
    }}>
      {value ?? '—'}
    </span>
  </div>
);

/* ── ป้ายกำกับฟิลด์ในฟอร์ม ─────────────────────────────────────────── */
export const FieldLabel = ({ children, required }) => (
  <span style={{
    color: 'var(--text-content-default, #363B3F)',
    fontFamily: 'var(--type-family-body)',
    fontSize: 'var(--type-size-sm)',
    fontWeight: 'var(--type-weight-medium)',
  }}>
    {children}
    {required && <span style={{ color: 'var(--text-input-require, #C72121)' }}> *</span>}
  </span>
);

/* ── แถบเตือน / แถบ error / แถบข้อมูล ───────────────────────────────── */
const NOTE_PALETTE = {
  warning: { bg: 'var(--surface-alert-warning, #FFF9F0)', fg: 'var(--text-warning-default, #C2410C)', icon: 'warning' },
  danger: { bg: 'var(--surface-danger-quaternary, #FFF0F0)', fg: 'var(--text-danger-default, #C72121)', icon: 'error' },
  info: { bg: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', fg: 'var(--text-brandPrimary-default, #007549)', icon: 'info' },
};

export const Note = ({ tone = 'info', icon, children, action }) => {
  const p = NOTE_PALETTE[tone] || NOTE_PALETTE.info;
  return (
    <div
      className='flex items-center flex-wrap w-full'
      style={{
        gap: 'var(--dim-space-200)',
        paddingTop: 'var(--dim-space-300)',
        paddingBottom: 'var(--dim-space-300)',
        paddingLeft: 'var(--dim-space-400)',
        paddingRight: 'var(--dim-space-400)',
        borderRadius: 'var(--dim-radius-200, 8px)',
        background: p.bg,
        color: p.fg,
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
      }}
    >
      <Icon name={icon || p.icon} size={18} />
      <span className='flex-1 min-w-0'>{children}</span>
      {action}
    </div>
  );
};

/* ── Empty state ในสเต็ป ───────────────────────────────────────────── */
export const EmptyState = ({ icon = 'inbox', title, subtitle, action }) => (
  <div
    className='flex flex-col items-center w-full'
    style={{
      gap: 'var(--dim-space-200)',
      paddingTop: 'var(--dim-space-800)',
      paddingBottom: 'var(--dim-space-800)',
      paddingLeft: 'var(--dim-space-400)',
      paddingRight: 'var(--dim-space-400)',
      borderRadius: 'var(--dim-radius-400)',
      background: 'var(--surface-card-200, #FDFDFD)',
    }}
  >
    <span style={{ color: 'var(--text-content-quaternary, #ADB2B7)', display: 'inline-flex' }}>
      <Icon name={icon} size={32} />
    </span>
    <span style={{
      color: 'var(--text-content-default, #363B3F)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-sm)',
      fontWeight: 'var(--type-weight-medium)',
      textAlign: 'center',
    }}>
      {title}
    </span>
    {subtitle && (
      <span style={{
        color: 'var(--text-content-tertiary, #858C92)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        textAlign: 'center',
      }}>
        {subtitle}
      </span>
    )}
    {action}
  </div>
);

/* ── การ์ดไม่มีสิทธิ์เข้าถึง (HN ที่ตั้ง restricted: true) ──────────────
   ต้องแทนที่ฟอร์มทั้งหมด ไม่ใช่ฟอร์มเทา ๆ ที่ยังอ่านค่าได้ (spec). */
export const DentalAccessDeniedCard = ({ hn, name, onBack, onRequestAccess }) => (
  <div
    className='flex flex-col items-center w-full'
    style={{
      gap: 'var(--dim-space-300)',
      paddingTop: 'var(--dim-space-800)',
      paddingBottom: 'var(--dim-space-800)',
      paddingLeft: 'var(--dim-space-600)',
      paddingRight: 'var(--dim-space-600)',
      borderRadius: 'var(--dim-radius-500)',
      border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
      background: 'var(--surface-card-100, #FFFFFF)',
      boxShadow: 'var(--shadow-card-strong)',
    }}
  >
    <span style={{ color: 'var(--icon-alertdialog-warning, #C2410C)', display: 'inline-flex' }}>
      <Icon name='lock_person' size={40} />
    </span>
    <span style={{
      color: 'var(--text-content-default, #363B3F)',
      fontFamily: 'var(--type-family-heading-content)',
      fontSize: 'var(--type-size-lg)',
      fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
      textAlign: 'center',
    }}>
      ไม่มีสิทธิ์เข้าถึงข้อมูลผู้รับบริการรายนี้
    </span>
    <span style={{
      color: 'var(--text-content-secondary, #636B72)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-sm)',
      textAlign: 'center',
      maxWidth: 520,
    }}>
      {`ข้อมูลของ ${name || 'ผู้รับบริการ'} (HN ${hn || '—'}) ถูกกำหนดเป็นข้อมูลลับตามข้อ §1.4.2 `}
      และบัญชีผู้ใช้ปัจจุบันยังไม่ได้รับสิทธิ์คลินิกทันตกรรมสำหรับผู้รับบริการรายนี้ —
      การเข้าดูครั้งนี้ถูกบันทึกลง audit log แล้ว
    </span>
    <div className='flex items-center flex-wrap justify-center' style={{ gap: 'var(--dim-space-200)' }}>
      <BrandSubdueButton variant='outline' leadingIcon='arrow_back' onClick={onBack}>
        กลับไปหน้าคิวทันตกรรม
      </BrandSubdueButton>
      <BrandSubdueButton variant='fill' leadingIcon='key' onClick={onRequestAccess}>
        ขอสิทธิ์เข้าถึงข้อมูล
      </BrandSubdueButton>
    </div>
  </div>
);

/* ── ตัวช่วยจัดรูปแบบ ───────────────────────────────────────────────── */
export const formatBaht = (n) => {
  const value = Number(n);
  if (!Number.isFinite(value)) return '—';
  return `${value.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} บาท`;
};

export const toothListLabel = (teeth = []) =>
  (teeth.length === 0 ? '—' : teeth.map((t) => `#${t}`).join(', '));

/* ป้ายสิทธิ — เบิกได้ (เขียว) / เบิกไม่ได้ · ชำระเอง (ส้ม). ยอมให้บันทึกได้
   เสมอ ห้ามบล็อก (spec: RIGHTS/สิทธิ). */
export const ReimbursableBadge = ({ reimbursable }) => (
  <ColorfulBadge
    style={reimbursable ? 'green' : 'orange'}
    size='small'
    hierarchy='secondary'
  >
    {reimbursable ? 'เบิกได้' : 'เบิกไม่ได้ (ชำระเอง)'}
  </ColorfulBadge>
);

/* ผู้บันทึก + วัน-เวลา (พ.ศ.) ท้ายทุกตาราง — playbook §5 audit trail. */
export const AuditCell = ({ by, at }) => (
  <div className='flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
    <span style={{
      color: 'var(--text-content-default, #363B3F)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-xs)',
    }}>
      {by || '—'}
    </span>
    <span style={{
      color: 'var(--text-content-tertiary, #858C92)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-xs)',
    }}>
      {at || '—'}
    </span>
  </div>
);

export const MutedText = ({ children, size = 'xs' }) => (
  <span style={{
    color: 'var(--text-content-tertiary, #858C92)',
    fontFamily: 'var(--type-family-body)',
    fontSize: `var(--type-size-${size})`,
  }}>
    {children}
  </span>
);

export const BodyText = ({ children, weight = 'regular' }) => (
  <span style={{
    color: 'var(--text-content-default, #363B3F)',
    fontFamily: 'var(--type-family-body)',
    fontSize: 'var(--type-size-sm)',
    fontWeight: `var(--type-weight-${weight})`,
  }}>
    {children}
  </span>
);
