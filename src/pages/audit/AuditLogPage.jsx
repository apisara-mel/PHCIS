import React, { useEffect, useMemo, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import AUDIT_NAV from '@/pages/audit/auditNav';
import { getAuditLog, subscribeAuditLog } from '@/pages/audit/auditData';

/* ระบบประวัติการใช้งาน · บันทึกการใช้งาน / History Log (Figma 0EDfjwf1 · 12:1624).
   Every action in the system is logged automatically. Reuses Table /
   ColorfulBadge / FilterDropdown + design tokens.
   Includes Telemedicine login / join / recording (TOR 1.13.11). */

const breadcrumb = ['ประวัติการใช้งาน', 'บันทึกการใช้งาน'];

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

const Avatar = ({ name }) => (
  <span className='inline-flex items-center justify-center shrink-0' style={{ width: 28, height: 28, borderRadius: 'var(--dim-radius-full)', background: 'var(--surface-brandPrimary-quaternary)', color: 'var(--text-brandPrimary-default)', fontSize: 'var(--type-size-xs)' }}>
    {(name || '?').replace(/^(นพ\.|พญ\.|ภก\.|ภญ\.|น\.ส\.|นาย|นาง)\s?/, '').trim().charAt(0)}
  </span>
);

const matchesSystemFilter = (row, system) => {
  if (!system) return true;
  const mod = String(row.mod || '').toLowerCase();
  if (system === 'telemed') return mod.includes('telemed');
  if (system === 'opd') return mod.includes('opd') || mod.includes('cpoe') || mod.includes('ตรวจ');
  if (system === 'pharm') return mod.includes('ยา');
  if (system === 'finance') return mod.includes('การเงิน') || mod.includes('เคลม');
  return true;
};

export default function AuditLogPage() {
  const [logScope, setLogScope] = useState('today');
  const [logSystem, setLogSystem] = useState('');
  const [rows, setRows] = useState(() => getAuditLog());

  useEffect(() => subscribeAuditLog(() => setRows(getAuditLog())), []);

  const filtered = useMemo(
    () => rows.filter((r) => matchesSystemFilter(r, logSystem)),
    [rows, logSystem, logScope],
  );

  const logCols = [
    { key: 'time', header: 'เวลา', width: 140, render: (r) => <span style={LABEL}>{r.time}</span> },
    { key: 'user', header: 'ผู้ใช้งาน', width: 200, render: (r) => <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}><Avatar name={r.user} /><span style={VAL}>{r.user}</span></div> },
    { key: 'action', header: 'การกระทำ', width: 180, render: (r) => <span style={VAL}>{r.action}</span> },
    { key: 'mod', header: 'ระบบ / โมดูล', width: 180, render: (r) => <span style={LABEL}>{r.mod}</span> },
    { key: 'status', header: 'สถานะ', width: 120, render: (r) => <ColorfulBadge style={r.ok ? 'green' : 'red'} size='small' hierarchy='secondary' width='hug'>{r.ok ? 'สำเร็จ' : 'ถูกปฏิเสธ'}</ColorfulBadge> },
  ];

  return (
    <QueuePageShell
      activeKey='audit-log'
      sidebarItems={AUDIT_NAV}
      sidebarFallbackKey='audit-log'
      brandTitle='ระบบประวัติการใช้งาน'
      breadcrumb={breadcrumb}
      title='บันทึกการใช้งาน'
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
        <section className='w-full flex flex-col' style={{ ...CARD, gap: 'var(--dim-space-300)' }}>
          <div className='flex items-center justify-between flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <div className='flex flex-col'>
              <span style={H}>บันทึกการใช้งานล่าสุด (History Log)</span>
              <span style={LABEL}>บันทึกทุกการกระทำในระบบ · รวม Telemedicine · เก็บย้อนหลัง 90 วัน</span>
            </div>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
              <FilterDropdown prefix='ช่วง:' options={[{ value: 'today', label: 'วันนี้' }, { value: '7', label: '7 วัน' }, { value: '30', label: '30 วัน' }]} value={logScope} onChange={setLogScope} />
              <FilterDropdown
                prefix='ระบบ:'
                options={[
                  { value: '', label: 'ทุกระบบ' },
                  { value: 'telemed', label: 'Telemedicine' },
                  { value: 'opd', label: 'OPD' },
                  { value: 'pharm', label: 'ห้องยา' },
                  { value: 'finance', label: 'การเงิน' },
                ]}
                value={logSystem}
                onChange={setLogSystem}
              />
            </div>
          </div>
          <Table columns={logCols} rows={filtered} rowKey={(r, i) => `${r.time}-${r.action}-${i}`} />
        </section>
      </div>
    </QueuePageShell>
  );
}
