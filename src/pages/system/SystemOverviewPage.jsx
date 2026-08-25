import React from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueIconButton from '@/components/button/DangerSubdueIconButton';
import Icon from '@/components/icons/Icon';
import SYSTEM_NAV from '@/pages/system/systemNav';

/* ระบบจัดการระบบ · แดชบอร์ด (Figma 0EDfjwf1 · 12:1624).
   Org structure landing: summary (offices · departments · positions · staff)
   + office table. The activity / usage history moved to its own system
   (ระบบประวัติการใช้งาน · /audit). Reuses SummaryCard / Table / ColorfulBadge. */

const breadcrumb = ['จัดการระบบ', 'แดชบอร์ด'];

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
  { key: 'office', icon: 'apartment',     color: 'info',     value: '4 แห่ง', label: 'สำนักงานอนามัย' },
  { key: 'dept',   icon: 'corporate_fare', color: 'positive', value: '8',     label: 'แผนกทั้งหมด' },
  { key: 'pos',    icon: 'badge',         color: 'info',     value: '6',     label: 'ตำแหน่งทั้งหมด' },
  { key: 'people', icon: 'group',         value: '248', label: 'บุคลากร', tileBg: 'var(--surface-neutral-tertiary, #F4F5F5)', iconInk: 'var(--text-neutral-default, #4D5358)' },
];
const OFFICES = [
  { id: 'phc04', name: 'ศูนย์บริการสาธารณสุข 4 ดินแดง',   code: 'PHC-04 · เขตดินแดง',   people: 120, status: 'open' },
  { id: 'phc21', name: 'ศูนย์บริการสาธารณสุข 21 วัดธาตุทอง', code: 'PHC-21 · เขตวัฒนา',   people: 86,  status: 'open' },
  { id: 'phc03', name: 'ศูนย์บริการสาธารณสุข 3 บางซื่อ',   code: 'PHC-03 · เขตบางซื่อ',  people: 42,  status: 'open' },
  { id: 'phc09', name: 'ศูนย์บริการสาธารณสุข 9 ประชาธิปไตย', code: 'PHC-09 · เขตพระนคร',  people: 0,   status: 'closed' },
];

export default function SystemOverviewPage({ activeKey = 'system-overview' }) {
  const officeCols = [
    { key: 'name', header: 'สำนักงานอนามัย', render: (o) => (
      <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
        <span className='inline-flex items-center justify-center shrink-0' style={{ width: 36, height: 36, borderRadius: 'var(--dim-radius-200)', background: 'var(--surface-brandPrimary-quaternary)', color: 'var(--text-brandPrimary-default)' }}><Icon name='apartment' size={18} /></span>
        <div className='flex flex-col min-w-0'><span className='truncate' style={VAL}>{o.name}</span><span className='truncate' style={LABEL}>{o.code}</span></div>
      </div>
    ) },
    { key: 'people', header: 'บุคลากร', render: (o) => <span style={VAL}>{o.people} คน</span> },
    { key: 'status', header: 'สถานะ', render: (o) => <ColorfulBadge style={o.status === 'open' ? 'green' : 'grey'} size='small' hierarchy='secondary' width='hug'>{o.status === 'open' ? 'เปิดให้บริการ' : 'ปิดชั่วคราว'}</ColorfulBadge> },
    { key: 'action', header: 'จัดการ', render: () => (
      <div className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
        <NeutralSubdueButton leadingIcon='tune' size='sm'>กำหนดสิทธิ์</NeutralSubdueButton>
        <DangerSubdueIconButton icon='delete' variant='ghost' size='sm' aria-label='ลบ' />
      </div>
    ) },
  ];

  return (
    <QueuePageShell
      activeKey={activeKey}
      sidebarItems={SYSTEM_NAV}
      sidebarFallbackKey='system-overview'
      brandTitle='ระบบ PHCIS'
      breadcrumb={breadcrumb}
      title='แดชบอร์ด'
      headerInfo={(
        <section className='flex items-stretch flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
          {SUMMARY.map((c) => <SummaryCard key={c.key} card={c} variant='panel' />)}
        </section>
      )}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
        <section className='w-full flex flex-col' style={{ ...CARD, gap: 'var(--dim-space-300)' }}>
          <span style={H}>สำนักงานอนามัย</span>
          <Table columns={officeCols} rows={OFFICES} rowKey={(o) => o.id} />
        </section>
      </div>
    </QueuePageShell>
  );
}
