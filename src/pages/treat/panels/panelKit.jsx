import React from 'react';
import StatusBadge from '@/components/badge/StatusBadge';

/* PHCIS | EMR §1.4 — chrome ที่ใช้ซ้ำในทุก panel ของโมดูลนี้.
   ไม่ใช่ component ใหม่ของ design system — เป็นแค่ตัวห่อ layout ที่ alias
   token ชุดเดียวกับ SummaryPanel ใน TreatmentSteps เพื่อไม่ให้แต่ละ panel
   เขียน inline style ซ้ำกัน 8 รอบ. ทุกค่า padding เป็น longhand เพราะ
   inline shorthand + var() render เป็น 0 (บันทึกไว้ใน CLAUDE.md). */

export const PANEL_SURFACE = {
  borderRadius: 'var(--dim-radius-400, 12px)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
  background: 'var(--surface-card-100)',
  paddingTop: 'var(--dim-space-400, 16px)',
  paddingRight: 'var(--dim-space-400, 16px)',
  paddingBottom: 'var(--dim-space-400, 16px)',
  paddingLeft: 'var(--dim-space-400, 16px)',
};

export const PANEL_TITLE_STYLE = {
  color: 'var(--text-topic-tertiary-title)',
  fontFamily: 'var(--type-family-heading-content)',
  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
  fontSize: 'var(--type-size-sm, 14px)',
  lineHeight: 1.5,
};

export const PANEL_LABEL_STYLE = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs, 12px)',
  lineHeight: 1.5,
};

export const PANEL_VALUE_STYLE = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm, 14px)',
  lineHeight: 1.5,
};

/* ขนาด glyph ทุกจุดในโมดูลนี้ผ่านตารางเดียวเพื่อ alias token แทน px ดิบ
   (ตัวเลขที่ยังไม่มี token — 28 — คงไว้ตามเดิมและระบุไว้ตรงนี้) */
const SYM_SIZE_TOKEN = {
  10: 'var(--type-size-xxs, 10px)',
  12: 'var(--type-size-xs, 12px)',
  14: 'var(--type-size-sm, 14px)',
  16: 'var(--type-size-base, 16px)',
  18: 'var(--type-size-lg, 18px)',
  20: 'var(--type-size-xl, 20px)',
  24: 'var(--type-size-2xl, 24px)',
  32: 'var(--dim-size-600, 32px)',
  36: 'var(--type-size-4xl, 36px)',
};

export const symSize = (size) => (
  typeof size === 'string' ? size : (SYM_SIZE_TOKEN[size] || size)
);

/* Material Symbols glyph — ตัวเดียวกับที่ Fields.jsx / StatusBadge ใช้
   (ไม่ inline SVG, ไม่ดึง icon set อื่น) */
export const Sym = ({ name, size = 16, color = 'currentColor', fill = 0, weight = 500 }) => (
  <span
    className='material-symbols-outlined'
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontSize: symSize(size),
      color,
      lineHeight: 1,
      display: 'inline-flex',
      fontVariationSettings: `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' 0, 'opsz' 24`,
    }}
    aria-hidden
  >
    {name}
  </span>
);

export const PanelCard = ({ title, subtitle, action, children, tone }) => (
  <section
    className='flex flex-col w-full min-w-0'
    style={{
      ...PANEL_SURFACE,
      gap: 'var(--dim-space-300, 12px)',
      ...(tone === 'quaternary'
        ? { background: 'var(--surface-neutral-quaternary, #F9FBFB)' }
        : null),
    }}
  >
    {(title || action) ? (
      <header className='flex items-start justify-between w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          {title ? <span style={PANEL_TITLE_STYLE}>{title}</span> : null}
          {subtitle ? <span style={PANEL_LABEL_STYLE}>{subtitle}</span> : null}
        </div>
        {action ? (
          <div className='shrink-0 flex items-center flex-wrap justify-end' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {action}
          </div>
        ) : null}
      </header>
    ) : null}
    {children}
  </section>
);

/* Empty state เฉพาะของแต่ละแท็บ — ต้องมีข้อความของตัวเอง + CTA ถ้าทำได้
   (playbook §5: ห้ามปล่อยแท็บว่าง) */
export const PanelEmptyState = ({ icon = 'inbox', title, subtitle, action }) => (
  <div
    className='flex flex-col items-center justify-center w-full text-center'
    style={{
      gap: 'var(--dim-space-200, 8px)',
      paddingTop: 'var(--dim-size-800, 40px)',
      paddingBottom: 'var(--dim-size-800, 40px)',
      paddingLeft: 'var(--dim-space-400, 16px)',
      paddingRight: 'var(--dim-space-400, 16px)',
      borderRadius: 'var(--dim-radius-400, 12px)',
      background: 'var(--surface-neutral-quaternary, #F9FBFB)',
    }}
  >
    <Sym name={icon} size={32} color='var(--icon-neutral-tertiary, #ADB2B7)' />
    <span style={{ ...PANEL_VALUE_STYLE, fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))' }}>{title}</span>
    {subtitle ? <span style={PANEL_LABEL_STYLE}>{subtitle}</span> : null}
    {action ? <div style={{ marginTop: 'var(--dim-space-200, 8px)' }}>{action}</div> : null}
  </div>
);

export const InfoPair = ({ label, value, minWidth = 140 }) => (
  <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)', minWidth }}>
    <span style={PANEL_LABEL_STYLE}>{label}</span>
    <span style={PANEL_VALUE_STYLE}>{value == null || value === '' ? '—' : value}</span>
  </div>
);

/* แถบสรุปเล็ก ๆ ที่ใช้ทั้งใน Med Rec และ ไฟล์แนบ (n/N + progress) */
export const MeterBar = ({ ratio = 0, tone = 'brand' }) => {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  const fill = tone === 'error'
    ? 'var(--surface-dangerButton-default, #B91C1C)'
    : tone === 'warning'
      ? 'var(--surface-colorfulbadge-yellow-bold, #EAB308)'
      : 'var(--surface-brandPrimary-default, #007549)';
  return (
    <div
      className='w-full overflow-hidden'
      style={{
        height: 'var(--dim-size-100, 8px)',
        borderRadius: 'var(--dim-radius-full)',
        background: 'var(--surface-neutral-quaternary, #F9FBFB)',
      }}
      role='progressbar'
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div style={{ width: `${pct}%`, height: '100%', background: fill }} />
    </div>
  );
};

/* ป้ายกำกับ "ยกเลิกแล้ว / ระบุว่าลงข้อมูลผิด" ที่ทุก panel ใช้เหมือนกัน:
   ขีดฆ่าแถวแต่ยังอ่านได้ ไม่ลบทิ้ง */
export const CancelledMark = ({ at, reason, label = 'ยกเลิกแล้ว' }) => (
  <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
    <StatusBadge style='error' size='small' icon='block'>{label}</StatusBadge>
    <span style={PANEL_LABEL_STYLE}>{at}</span>
    {reason ? <span style={PANEL_LABEL_STYLE}>เหตุผล: {reason}</span> : null}
  </div>
);

export const strikeIf = (on) => (on ? { textDecoration: 'line-through', opacity: 0.7 } : null);

export default PanelCard;
