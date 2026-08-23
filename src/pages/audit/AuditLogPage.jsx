import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import PrimarySearch from '@/components/search/PrimarySearch';
import FilterTag from '@/components/forms/FilterTag';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import { ExportFormatPopup } from '@/pages/consent/consentExportPopup';
import AUDIT_NAV from '@/pages/audit/auditNav';
import { getAuditLog, subscribeAuditLog } from '@/pages/audit/auditData';
import { AUDIT_HISTORY_TABS } from '@/pages/audit/AuditHistoryTabs';
import AuditUsageSummary from '@/pages/audit/AuditUsageSummary';

/* ระบบประวัติการใช้งาน · ประวัติการใช้งาน / History Log (Figma 0EDfjwf1 · 12:1624).
   Every action in the system is logged automatically. Reuses Table /
   ColorfulBadge / FilterDropdown + design tokens.
   Includes Telemedicine login / join / recording (TOR 1.13.11). */

const breadcrumb = ['ประวัติการใช้งาน', 'ประวัติการใช้งาน'];
const MOCK_AUDIT_SEARCH_HISTORY = [
  { label: 'นพ.กิตติ สุขใจ', value: 'นพ.กิตติ สุขใจ' },
  { label: 'บันทึกการตรวจ', value: 'บันทึกการตรวจ' },
  { label: 'ห้องยา', value: 'ห้องยา' },
];

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

const Avatar = ({ name, avatarUrl }) => (
  <span className='inline-flex items-center justify-center shrink-0 overflow-hidden' style={{ width: 28, height: 28, borderRadius: 'var(--dim-radius-full)', background: 'var(--surface-brandPrimary-quaternary)', color: 'var(--text-brandPrimary-default)', fontSize: 'var(--type-size-xs)' }}>
    {avatarUrl ? <img src={avatarUrl} alt='' aria-hidden style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (name || '?').replace(/^(นพ\.|พญ\.|ภก\.|ภญ\.|น\.ส\.|นาย|นาง)\s?/, '').trim().charAt(0)}
  </span>
);

const matchesSystemFilter = (row, system) => {
  if (!system) return true;
  const mod = String(row.mod || '').toLowerCase();
  if (system === 'telemed') return mod.includes('telemed');
  if (system === 'opd') return mod.includes('opd') || mod.includes('cpoe') || mod.includes('ตรวจ');
  if (system === 'pharm') return mod.includes('ยา');
  if (system === 'lab') return mod.includes('lab') || mod.includes('ปฏิบัติการ');
  if (system === 'xray') return mod.includes('x-ray') || mod.includes('xray') || mod.includes('รังสี');
  if (system === 'finance') return mod.includes('การเงิน') || mod.includes('เคลม');
  return true;
};

export default function AuditLogPage() {
  const history = useHistory();
  const location = useLocation();
  const [logScope, setLogScope] = useState('today');
  const [logSystem, setLogSystem] = useState(() => new URLSearchParams(window.location.search).get('system') || '');
  const [rows, setRows] = useState(() => getAuditLog());
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => subscribeAuditLog(() => setRows(getAuditLog())), []);
  useEffect(() => {
    setLogSystem(new URLSearchParams(location.search).get('system') || '');
  }, [location.search]);

  const filtered = useMemo(
    () => rows.filter((r) => matchesSystemFilter(r, logSystem)
      && (!actionFilter || r.action === actionFilter)
      && (!search.trim() || [r.user, r.action, r.mod, r.time, r.target, r.detail, r.groupPolicy, r.position].some((v) => String(v).toLowerCase().includes(search.trim().toLowerCase())))),
    [rows, logSystem, logScope, actionFilter, search],
  );
  const sorted = useMemo(() => {
    const copy = filtered.slice();
    if (!sortConfig.key) return copy;
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    return copy.sort((a, b) => sign * String(a[sortConfig.key] ?? '').localeCompare(String(b[sortConfig.key] ?? ''), 'th'));
  }, [filtered, sortConfig]);

  const filtersActive = logScope !== 'today' || !!logSystem;
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => {
      setLogScope('today');
      setLogSystem('');
    },
  );

  const logCols = [
    { key: 'time', header: 'วันเวลา', sortable: true, render: (r) => <span style={LABEL}>{r.time}</span> },
    { key: 'startedAt', header: 'เริ่มต้น', sortable: true, render: (r) => <span style={LABEL}>{r.startedAt || '—'}</span> },
    { key: 'endedAt', header: 'สิ้นสุด', sortable: true, render: (r) => <span style={LABEL}>{r.endedAt || '—'}</span> },
    { key: 'user', header: 'ผู้ใช้งาน', sortable: true, render: (r) => <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}><Avatar name={r.user} avatarUrl={r.avatarUrl} /><span style={VAL}>{r.user}</span></div> },
    { key: 'action', header: 'การกระทำ', sortable: true, render: (r) => <span style={VAL}>{r.action}</span> },
    { key: 'mod', header: 'ระบบที่เข้าถึง', sortable: true, render: (r) => <span style={LABEL}>{r.mod}</span> },
    { key: 'target', header: 'ข้อมูลของใคร / รายการ', sortable: true, render: (r) => <span style={VAL}>{r.target || '—'}</span> },
    { key: 'detail', header: 'รายละเอียด', sortable: true, render: (r) => <span style={LABEL}>{r.detail || r.action}</span> },
    { key: 'groupPolicy', header: 'กิจกรรม', sortable: true, render: (r) => <span style={LABEL}>{r.groupPolicy || '—'}</span> },
    { key: 'position', header: 'ตำแหน่ง', sortable: true, render: (r) => <span style={LABEL}>{r.position || '—'}</span> },
    { key: 'status', header: 'สถานะ', render: (r) => <ColorfulBadge style={r.ok ? 'green' : 'red'} size='small' hierarchy='secondary' width='hug'>{r.ok ? 'สำเร็จ' : 'ถูกปฏิเสธ'}</ColorfulBadge> },
  ];
  const exportReport = { key: 'activity-history', title: 'ประวัติการใช้งานทั้งหมด', table: { columns: [{ key: 'time', header: 'วันเวลา' }, { key: 'startedAt', header: 'เริ่มต้น' }, { key: 'endedAt', header: 'สิ้นสุด' }, { key: 'user', header: 'ผู้ใช้งาน' }, { key: 'mod', header: 'ระบบที่เข้าถึง' }, { key: 'target', header: 'ข้อมูลของใคร / รายการ' }, { key: 'detail', header: 'รายละเอียด' }, { key: 'groupPolicy', header: 'กิจกรรม' }, { key: 'position', header: 'ตำแหน่ง' }, { key: 'status', header: 'สถานะ' }], rows: sorted.map((r) => ({ ...r, status: r.ok ? 'สำเร็จ' : 'ถูกปฏิเสธ' })) } };

  return (
    <QueuePageShell
      activeKey='audit-log'
      sidebarItems={AUDIT_NAV}
      sidebarFallbackKey='audit-log'
      brandTitle='ระบบประวัติการใช้งาน'
      breadcrumb={breadcrumb}
      title='ประวัติการใช้งาน'
      tabs={AUDIT_HISTORY_TABS}
      activeTab={location.pathname.startsWith('/audit/record-history') ? 'record' : location.pathname.startsWith('/audit/pii-access') ? 'pii' : new URLSearchParams(location.search).get('system') || 'activity'}
      onTabChange={(key) => history.push(AUDIT_HISTORY_TABS.find((tab) => tab.key === key)?.path || '/audit/log')}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
        <AuditUsageSummary />
        <section className='w-full flex flex-col' style={{ ...CARD, gap: 'var(--dim-space-300)' }}>
          <div className='flex items-center justify-between flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
          </div>
          <div className='flex flex-col items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <PrimarySearch value={search} onChange={(v) => setSearch(v)} placeholder='ค้นหาผู้ใช้งาน / การกระทำ / ระบบ' width={640} history={MOCK_AUDIT_SEARCH_HISTORY} />
            <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-200)' }}>
              <FilterDropdown prefix='วันที่:' options={[{ value: 'today', label: 'วันนี้' }, { value: '7', label: '7 วัน' }, { value: '30', label: '30 วัน' }]} value={logScope} onChange={setLogScope} />
              {!logSystem ? <FilterDropdown prefix='ระบบ:' options={[{ value: '', label: 'ทุกระบบ' }, { value: 'telemed', label: 'Telemedicine' }, { value: 'opd', label: 'OPD' }, { value: 'pharm', label: 'ห้องยา' }, { value: 'finance', label: 'การเงิน' }]} value={logSystem} onChange={setLogSystem} /> : null}
              {['ออกคำสั่งยา'].map((action) => <FilterTag key={action} value={action} selected={actionFilter === action} onClick={() => setActionFilter((v) => (v === action ? '' : action))} />)}
              <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
              <div className='flex-1' />
              <NeutralSubdueButton leadingIcon='ios_share' size='sm' onClick={() => setExportOpen(true)}>นำส่งออกรายงาน</NeutralSubdueButton>
            </div>
          </div>
          <SmoothFilterResults opaque={resultsOpaque}>
          <Table columns={logCols} rows={sorted} rowKey={(r, i) => `${r.time}-${r.action}-${i}`} sortConfig={sortConfig} onSort={(key) => setSortConfig((p) => (p.key === key ? { key, direction: p.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }))} />
          </SmoothFilterResults>
        </section>
      </div>
      <ExportFormatPopup open={exportOpen} report={exportReport} onClose={() => setExportOpen(false)} documentFooter='ออกเอกสารโดยระบบประวัติการใช้งาน (PHCIS)' />
    </QueuePageShell>
  );
}
