import React, { useMemo } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import AUDIT_NAV from '@/pages/audit/auditNav';
import { PALETTE, FUNCTION_USAGE, PEAK_HOURS } from '@/pages/audit/auditData';

/* ระบบประวัติการใช้งาน · ภาพรวมการใช้งาน (Figma 0EDfjwf1 · 12:1624).
   Usage dashboard: activity summary · usage tiles · 2 charts. The detailed
   History Log lives on its sibling page (/audit/log). Reuses SummaryCard +
   design tokens. */

const breadcrumb = ['ประวัติการใช้งาน', 'ภาพรวมการใช้งาน'];

const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600)',
};
const LABEL = { color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' };
const VAL = { color: 'var(--text-content-default)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' };
const H = { color: 'var(--text-content-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)', lineHeight: 1.4 };

const SUMMARY = [
  { key: 'users',   icon: 'group',         color: 'info',     value: '248',   label: 'ผู้ใช้งานวันนี้' },
  { key: 'session', icon: 'sensors',       color: 'positive', value: '1,032', label: 'เซสชันวันนี้' },
  { key: 'events',  icon: 'history',       color: 'info',     value: '5,418', label: 'เหตุการณ์ 7 วัน' },
  { key: 'denied',  icon: 'gpp_maybe',     value: '14', label: 'การเข้าถึงปฏิเสธ', tileBg: 'var(--surface-neutral-tertiary, #F4F5F5)', iconInk: 'var(--text-neutral-default, #4D5358)' },
];

const Tile = ({ label, value, sub, subColor }) => (
  <div className='flex flex-col flex-1' style={{ ...CARD, padding: 'var(--dim-space-400)', gap: 'var(--dim-space-100)', minWidth: 'min(100%, 200px)' }}>
    <span style={LABEL}>{label}</span>
    <span style={{ color: 'var(--text-content-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-lg)' }}>{value}</span>
    {sub && <span style={{ ...LABEL, color: subColor || 'var(--text-content-tertiary)' }}>{sub}</span>}
  </div>
);

const HBar = ({ label, value, max, color, right }) => (
  <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
    <span className='truncate' style={{ ...VAL, width: 150, flexShrink: 0 }}>{label}</span>
    <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--border-content-quaternary, #EEF0F2)', overflow: 'hidden' }}>
      <span style={{ display: 'block', height: '100%', width: `${Math.round((value / max) * 100)}%`, background: color, borderRadius: 999 }} />
    </div>
    <span style={{ ...LABEL, width: 56, textAlign: 'right', flexShrink: 0 }}>{right}</span>
  </div>
);

export default function AuditOverviewPage() {
  const usageMax = useMemo(() => Math.max(...FUNCTION_USAGE.map((f) => f.value)), []);
  const peakMax = useMemo(() => Math.max(...PEAK_HOURS.map((p) => p.value)), []);

  return (
    <QueuePageShell
      activeKey='audit-overview'
      sidebarItems={AUDIT_NAV}
      sidebarFallbackKey='audit-overview'
      brandTitle='ระบบประวัติการใช้งาน'
      breadcrumb={breadcrumb}
      title='ภาพรวมการใช้งาน'
      headerInfo={(
        <section className='flex items-stretch flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
          {SUMMARY.map((c) => <SummaryCard key={c.key} card={c} variant='panel' />)}
        </section>
      )}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
        {/* usage tiles */}
        <section className='flex items-stretch flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
          <Tile label='ผู้ใช้งานวันนี้' value='248' sub='+12 จากเมื่อวาน' subColor='var(--text-brandPrimary-default)' />
          <Tile label='เซสชันวันนี้' value='1,032' sub='ออนไลน์ 86' />
          <Tile label='ระยะเวลาเฉลี่ย' value='3.2 ชม./วัน' />
          <Tile label='การเข้าถึงข้อมูลปฏิเสธ' value='14' sub='7 วันล่าสุด' subColor='var(--text-danger-default, #B91C1C)' />
        </section>

        {/* charts */}
        <div className='flex items-stretch flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
          <section className='flex flex-col' style={{ ...CARD, flex: '1.4 1 0', minWidth: 'min(100%, 360px)', gap: 'var(--dim-space-300)' }}>
            <span style={H}>ปริมาณการใช้งานตามฟังก์ชัน</span>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
              {FUNCTION_USAGE.map((f, i) => <HBar key={f.label} label={f.label} value={f.value} max={usageMax} color={PALETTE[i % PALETTE.length]} right={f.value} />)}
            </div>
          </section>
          <section className='flex flex-col' style={{ ...CARD, flex: '1 1 0', minWidth: 'min(100%, 300px)', gap: 'var(--dim-space-300)' }}>
            <span style={H}>ช่วงเวลาที่ใช้งานสูงสุด</span>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
              {PEAK_HOURS.map((p, i) => <HBar key={p.label} label={p.label} value={p.value} max={peakMax} color={i === 1 ? '#08A768' : '#14B8A6'} right={p.tag} />)}
            </div>
          </section>
        </div>
      </div>
    </QueuePageShell>
  );
}
