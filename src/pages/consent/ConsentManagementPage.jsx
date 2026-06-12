import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import NeutralButton from '@/components/button/NeutralButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import AlertDialog from '@/components/popup/AlertDialog';
import ConsentHistoryPopup from '@/components/popup/ConsentHistoryPopup';
import {
  CONSENT_RECORDS, CONSENT_SUMMARY, CONSENT_TABS,
  CONSENT_STATUS, CONSENT_TYPE_TONE, CONSENT_CONFIRM,
} from '@/data/consentRecords';
import CONSENT_NAV from '@/pages/consent/consentNav';

/* PHCIS | Consent — ระบบจัดการความยินยอม (Figma node 1:4).
   Consent registry: summary cards · tabs · search · filters · table with a
   STATUS-DEPENDENT action column (annotation 277:65195 — "แต่ละ Status, CTA
   ใน Column การดำเนินการจะต่างกัน"), the Consent History popup (299:86535),
   and per-action confirm AlertDialogs (277:84661 …).

   All values alias design.md tokens; UI copy is Thai; data is local mock. */

const PAGE_SIZE = 10;
const breadcrumb = ['จัดการความยินยอม'];

const TEXT_CELL = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};
const MUTED_CELL = { ...TEXT_CELL, color: 'var(--text-content-tertiary)' };

const Cell = ({ value }) =>
  value && value !== '-'
    ? <span style={TEXT_CELL}>{value}</span>
    : <span style={MUTED_CELL}>-</span>;

const Initials = ({ name }) => (
  <span
    className='inline-flex items-center justify-center shrink-0'
    style={{
      width: 'var(--dim-size-700, 36px)', height: 'var(--dim-size-700, 36px)',
      borderRadius: 'var(--dim-radius-600)',
      background: 'var(--surface-brandPrimary-quaternary)',
      color: 'var(--text-brandPrimary-default)',
      fontFamily: 'var(--type-family-heading-graphic2)',
      fontSize: 'var(--type-size-sm)', lineHeight: 1,
    }}
    aria-hidden
  >
    {(name || '?').trim().charAt(0)}
  </span>
);

export default function ConsentManagementPage() {
  const navigate = useHistory();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterChannel, setFilterChannel] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [dialog, setDialog] = useState(null);      // { record, confirmKey }
  const [historyRecord, setHistoryRecord] = useState(null);
  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory('mih:primarysearch-history:consent');

  /* ── Tabs with live counts ──────────────────────────────────────── */
  const tabs = useMemo(() => CONSENT_TABS.map((t) => ({
    key: t.value,
    label: t.label,
    icon: t.icon,
    count: t.value === 'all'
      ? CONSENT_RECORDS.length
      : CONSENT_RECORDS.filter((r) => (CONSENT_STATUS[r.status] || {}).tab === t.value).length,
  })), []);

  const typeOptions = useMemo(() => [
    { value: '', label: 'ทั้งหมด' },
    ...[...new Set(CONSENT_RECORDS.map((r) => r.type))].map((t) => ({ value: t, label: t })),
  ], []);
  const channelOptions = useMemo(() => [
    { value: '', label: 'ทุกช่องทาง' },
    ...[...new Set(CONSENT_RECORDS.map((r) => r.signChannel).filter((c) => c && c !== '-'))]
      .map((c) => ({ value: c, label: c })),
  ], []);
  const statusOptions = useMemo(() => [
    { value: '', label: 'ทุกสถานะ' },
    ...Object.keys(CONSENT_STATUS).map((s) => ({ value: s, label: s })),
  ], []);
  const dateOptions = [
    { value: '', label: 'ทุกวัน' },
    { value: 'today', label: 'วันนี้' },
    { value: '7', label: '7 วันล่าสุด' },
    { value: '30', label: '30 วันล่าสุด' },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return CONSENT_RECORDS.filter((r) => {
      const meta = CONSENT_STATUS[r.status] || {};
      return (
        (activeTab === 'all' || meta.tab === activeTab) &&
        (!filterType || r.type === filterType) &&
        (!filterChannel || r.signChannel === filterChannel) &&
        (!filterStatus || r.status === filterStatus) &&
        (!q || r.name.toLowerCase().includes(q) || r.hn.toLowerCase().includes(q))
      );
    });
  }, [activeTab, search, filterType, filterChannel, filterStatus]);

  const handleSort = (key) => setSortConfig((prev) => (
    prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' }
  ));

  const sorted = useMemo(() => {
    const { key, direction } = sortConfig;
    const sign = direction === 'desc' ? -1 : 1;
    const copy = filtered.slice();
    if (!key) return copy.sort((a, b) => a.id - b.id);
    copy.sort((a, b) => {
      const av = String(a[key] ?? ''); const bv = String(b[key] ?? '');
      const primary = av.localeCompare(bv, 'th');
      return primary !== 0 ? sign * primary : a.id - b.id;
    });
    return copy;
  }, [filtered, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = sorted.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, sorted.length);
  const isAllFilters = !filterType && !filterChannel && !filterStatus && !filterDate;

  const resetFilters = () => {
    setFilterType(''); setFilterChannel(''); setFilterStatus(''); setFilterDate(''); setPage(1);
  };

  const handleSubmit = (value) => {
    const q = (value || '').trim();
    if (q) pushHistory({ label: q, value: q });
    setSearch(q); setPage(1);
  };

  /* ── Status-dependent action column ─────────────────────────────── */
  const renderAction = (row) => {
    const action = (CONSENT_STATUS[row.status] || {}).action;
    return (
      <div className='flex items-center justify-end' style={{ gap: 'var(--dim-space-200)' }}>
        <NeutralSubdueIconButton
          icon='history'
          variant='outline'
          size='sm'
          aria-label='ดูประวัติความยินยอม'
          title='ประวัติความยินยอม'
          onClick={() => setHistoryRecord(row)}
        />
        {action && (action.kind === 'brand' ? (
          <BrandButton variant='fill' size='sm' onClick={() => setDialog({ record: row, confirmKey: action.confirm })}>
            {action.label}
          </BrandButton>
        ) : (
          <NeutralButton variant='outline' size='sm' onClick={() => setDialog({ record: row, confirmKey: action.confirm })}>
            {action.label}
          </NeutralButton>
        ))}
      </div>
    );
  };

  const columns = useMemo(() => [
    { key: 'hn', header: 'HN', width: 110, sortable: true, render: (r) => <Cell value={r.hn} /> },
    {
      key: 'name', header: 'ชื่อ-นามสกุล', width: 220, sortable: true,
      render: (r) => (
        <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
          <Initials name={r.name} />
          <span className='truncate' style={TEXT_CELL}>{r.name}</span>
        </div>
      ),
    },
    {
      key: 'type', header: 'ประเภท Consent', width: 150, sortable: true,
      render: (r) => <ColorfulBadge style={CONSENT_TYPE_TONE[r.type] || 'grey'} size='small' hierarchy='secondary' width='hug'>{r.type}</ColorfulBadge>,
    },
    {
      key: 'version', header: 'เวอร์ชั่น', width: 104,
      render: (r) => <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>{r.version}</ColorfulBadge>,
    },
    {
      key: 'status', header: 'สถานะ', width: 160, sortable: true,
      render: (r) => <ColorfulBadge style={(CONSENT_STATUS[r.status] || {}).tone || 'grey'} size='small' hierarchy='secondary' width='hug'>{r.status}</ColorfulBadge>,
    },
    { key: 'signChannel', header: 'ช่องทางที่ลงนาม', width: 150, render: (r) => <Cell value={r.signChannel} /> },
    { key: 'requester', header: 'ผู้สร้างคำขอ', width: 140, render: (r) => <Cell value={r.requester} /> },
    { key: 'createdDate', header: 'วันที่สร้างคำขอ/Reconsent', width: 210, sortable: true, render: (r) => <Cell value={r.createdDate} /> },
    { key: 'signedDate', header: 'วันที่ลงนาม', width: 150, render: (r) => <Cell value={r.signedDate} /> },
    { key: 'withdrawnDate', header: 'วันที่ถอนความยินยอม', width: 180, render: (r) => <Cell value={r.withdrawnDate} /> },
    { key: 'action', header: 'การดำเนินการ', width: 210, render: renderAction },
  ], []);

  const confirm = dialog ? CONSENT_CONFIRM[dialog.confirmKey] : null;

  return (
    <>
      <QueuePageShell
        activeKey='consent-manage'
        sidebarItems={CONSENT_NAV}
        sidebarFallbackKey='consent-manage'
        brandTitle='ระบบจัดการความยินยอม'
        breadcrumb={breadcrumb}
        title='จัดการความยินยอม'
        actions={(
          <BrandButton
            variant='outline'
            size='md'
            trailingIcon='chevron_right'
            onClick={() => navigate.push('/forms')}
          >
            ดูแบบฟอร์มความยินยอมทั้งหมด
          </BrandButton>
        )}
        headerInfo={(
          <section className='flex items-stretch flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
            {CONSENT_SUMMARY.map((c) => (
              <SummaryCard key={c.key} card={c} variant='panel' hover />
            ))}
          </section>
        )}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(key) => { setActiveTab(key); setPage(1); }}
      >
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{ padding: 'var(--dim-space-600)' }}
        >
          <section
            className='w-full flex flex-col'
            style={{
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-500)',
              border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
              boxShadow: 'var(--shadow-card)',
              padding: 'var(--dim-space-600)',
              gap: 'var(--dim-space-600)',
            }}
          >
            <div className='w-full flex items-start justify-center'>
              <PrimarySearch
                value={search}
                onChange={(v) => { setSearch(v); setPage(1); }}
                onSubmit={handleSubmit}
                placeholder='ค้นหาชื่อผู้ป่วย, HN...'
                width={640}
                history={searchHistory}
                onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
              />
            </div>

            <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
              <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <div className='flex items-center flex-wrap min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
                  <FilterTag value='ทั้งหมด' selected={isAllFilters} onClick={resetFilters} />
                  <FilterDropdown prefix='ประเภท:' options={typeOptions} value={filterType} onChange={(v) => { setFilterType(v); setPage(1); }} />
                  <FilterDropdown prefix='ช่องทาง:' options={channelOptions} value={filterChannel} onChange={(v) => { setFilterChannel(v); setPage(1); }} />
                  <FilterDropdown prefix='สถานะ:' options={statusOptions} value={filterStatus} onChange={(v) => { setFilterStatus(v); setPage(1); }} />
                  <FilterDropdown prefix='วันที่:' options={dateOptions} value={filterDate} onChange={(v) => { setFilterDate(v); setPage(1); }} />
                </div>
                <div className='flex-1' />
                <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-200)' }}>
                  <NeutralSubdueButton leadingIcon='ios_share' size='sm' collapseLabelBelow='lg'>
                    นำส่งออกรายงาน
                  </NeutralSubdueButton>
                  <BrandButton variant='fill' size='sm' leadingIcon='add' onClick={() => navigate.push('/consent/forms/new')}>
                    สร้างแบบฟอร์มใหม่
                  </BrandButton>
                </div>
              </div>

              <Table
                columns={columns}
                rows={pageRows}
                rowKey={(row) => row.id}
                sortConfig={sortConfig}
                onSort={handleSort}
                stickyColCount={2}
                emptyMessage='ไม่พบรายการความยินยอม'
                emptySubtext='ลองปรับตัวกรองหรือคำค้นหา'
                style={{ maxHeight: 604, overflow: 'auto' }}
              />

              <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-600)', paddingTop: 'var(--dim-space-400)' }}>
                <span style={{ flex: 1, color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', lineHeight: 1.5 }}>
                  แสดง {rangeStart}-{rangeEnd} จาก {sorted.length} รายการ
                </span>
                <Pagination currentPage={safePage} pageCount={totalPages} onPageChange={setPage} />
              </div>
            </div>
          </section>
        </div>
      </QueuePageShell>

      {/* Per-status confirm dialog */}
      <AlertDialog
        open={!!dialog}
        type={confirm ? confirm.type : 'info'}
        title={confirm ? confirm.title : ''}
        description={confirm ? confirm.description : ''}
        confirmLabel={confirm ? confirm.confirmLabel : 'ตกลง'}
        cancelLabel='ยกเลิก'
        onConfirm={() => setDialog(null)}
        onCancel={() => setDialog(null)}
        onClose={() => setDialog(null)}
      />

      {/* Consent history */}
      <ConsentHistoryPopup
        open={!!historyRecord}
        record={historyRecord}
        onClose={() => setHistoryRecord(null)}
      />
    </>
  );
}
