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
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import AlertDialog from '@/components/popup/AlertDialog';
import Popup from '@/components/popup/Popup';
import Switch from '@/components/switch/Switch';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import ConsentIdentityVerifyPopup from '@/components/popup/ConsentIdentityVerifyPopup';
import {
  ACCESS_RECORDS, ACCESS_SUMMARY, ACCESS_TABS, ACCESS_STATUS,
  thaiDateOfIso, daysLeftOfIso,
} from '@/data/accessRecords';
import { ScanImportPopup, ApprovePeriodPopup, AccessDetailPopup } from '@/pages/consent/accessPopups';
import CONSENT_NAV from '@/pages/consent/consentNav';

/* PHCIS | Consent — จัดการสิทธิ์การเข้าถึงแบบฟอร์ม (Figma node 363:122327).
   Access-request registry: summary cards · tabs · search · filters · table
   with a STATUS-DEPENDENT action column (✓ approve / ✗ reject, one disabled
   per status) and per-action confirm AlertDialogs. Mirrors the consent
   registry page (ConsentManagementPage) so the system stays consistent.
   All values alias design.md tokens; UI copy is Thai; data is local mock. */

const PAGE_SIZE = 10;
const breadcrumb = ['จัดการสิทธิ์การเข้าถึงแบบฟอร์ม'];

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

/* Two-line cell: primary line + muted sub line (date/time, range/days). */
const StackCell = ({ top, bottom }) => (
  <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-0)' }}>
    <span className='truncate' style={TEXT_CELL}>{top}</span>
    {bottom ? <span className='truncate' style={{ ...MUTED_CELL, fontSize: 'var(--type-size-xs)' }}>{bottom}</span> : null}
  </div>
);

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

/* File chip — exported Figma PDF glyph + filename over its size. The whole
   cell is a button: clicking opens the attached document in a popup
   (Figma DataCell annotation "Users can click to view the document"). */
const PDF_ICON = '/illustration/pdf-file.svg';
const FileCell = ({ name, size, onClick }) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      type='button'
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title='ดูเอกสารที่แนบ'
      className='flex items-center min-w-0 text-left'
      style={{ gap: 'var(--dim-space-200)', background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', padding: 0 }}
    >
      <img
        src={PDF_ICON}
        alt=''
        aria-hidden
        width={18}
        height={24}
        style={{ display: 'block', flexShrink: 0, opacity: hover ? 0.85 : 1, transition: 'opacity 120ms ease' }}
      />
      <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-0)' }}>
        <span
          className='truncate'
          style={{
            ...TEXT_CELL,
            color: hover ? 'var(--text-brandPrimary-default)' : TEXT_CELL.color,
            textDecoration: hover ? 'underline' : 'none',
            textUnderlineOffset: 2,
            transition: 'color 120ms ease',
          }}
        >
          {name}
        </span>
        <span className='truncate' style={{ ...MUTED_CELL, fontSize: 'var(--type-size-xs)' }}>{size}</span>
      </div>
    </button>
  );
};

/* Mock document preview shown inside the file popup. */
const DocRow = ({ label, value }) => (
  <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
    <span style={{ width: 150, flexShrink: 0, color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>{label}</span>
    <span style={{ flex: 1, color: 'var(--text-content-default)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)' }}>{value}</span>
  </div>
);
const DocPreview = ({ row }) => (
  <div className='flex justify-center w-full' style={{ background: 'var(--surface-neutral-quaternary, #F9FBFB)', padding: 'var(--dim-space-500)', borderRadius: 'var(--dim-radius-400)' }}>
    <div
      className='flex flex-col w-full'
      style={{ maxWidth: 540, background: 'var(--surface-card-100)', border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)', borderRadius: 'var(--dim-radius-400)', boxShadow: 'var(--shadow-card)', padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}
    >
      <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300)', paddingBottom: 'var(--dim-space-300)', borderBottom: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)' }}>
        <img src={PDF_ICON} alt='' aria-hidden width={26} height={35} style={{ display: 'block', flexShrink: 0 }} />
        <div className='flex flex-col min-w-0'>
          <span style={{ color: 'var(--text-brandPrimary-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)' }}>แบบฟอร์มขอเข้าถึงข้อมูลผู้ป่วย</span>
          <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>{row.file} · {row.fileSize}</span>
        </div>
      </div>
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <DocRow label='เลขที่คำขอ' value={row.reqNo} />
        <DocRow label='ผู้ขอ (เจ้าหน้าที่)' value={row.name} />
        <DocRow label='รหัสพนักงาน' value={row.empCode} />
        <DocRow label='HN ผู้รับบริการ' value={row.hn} />
        <DocRow label='วัตถุประสงค์' value={row.purpose} />
        <DocRow label='ช่วงเวลาที่ขอเข้าถึง' value={`${row.period} (${row.periodDays})`} />
      </div>
      <p style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', lineHeight: 1.6, margin: 0 }}>
        ข้าพเจ้าขออนุญาตเข้าถึงข้อมูลของผู้รับบริการตามรายละเอียดข้างต้น เพื่อใช้ในวัตถุประสงค์ที่ระบุไว้เท่านั้น และยินยอมให้มีการบันทึกการเข้าถึงตามนโยบายความเป็นส่วนตัวของหน่วยงาน
      </p>
    </div>
  </div>
);

/* ด.1.1.17.2 — หมดช่วงเวลา → Inactive อัตโนมัติ + ย้ายไปแท็บหมดช่วงเวลา */
const autoExpire = (r) => {
  if (r.status === 'อนุมัติแล้ว' && r.periodEnd && (daysLeftOfIso(r.periodEnd) ?? 1) < 0) {
    return { ...r, status: 'หมดอายุ', active: false, expiredByPeriod: true };
  }
  return { ...r };
};

export default function AccessManagementPage() {
  const navigate = useHistory();
  /* rows เป็น state จริง (mock mutate ใน session) */
  const [rows, setRows] = useState(() => ACCESS_RECORDS.map(autoExpire));
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [filterRequester, setFilterRequester] = useState('');
  const [filterPurpose, setFilterPurpose] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [dialog, setDialog] = useState(null); // { record, kind: 'reject' }
  const [previewFile, setPreviewFile] = useState(null); // row whose attached doc is open
  /* ด.1.1.17 workflow */
  const [scanOpen, setScanOpen] = useState(false);        // 17.1 สแกนนำเข้า
  const [approveFor, setApproveFor] = useState(null);     // 17.2 อนุมัติ + ช่วงเวลา
  const [detailFor, setDetailFor] = useState(null);       // detail + audit
  const [toggleFor, setToggleFor] = useState(null);       // 17.3 confirm Active switch
  const [verifyFor, setVerifyFor] = useState(null);       // ด.1.1.1 gate ก่อนอนุมัติ
  const [toast, setToast] = useState(null);

  const patchRow = (id, patch) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const pushToast = (message) => setToast({ id: Date.now(), variant: 'success', message });
  const nowThai = () => new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });
  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory('mih:primarysearch-history:access');

  const tabs = useMemo(() => ACCESS_TABS.map((t) => ({
    key: t.value,
    label: t.label,
    icon: t.icon,
    count: t.value === 'all'
      ? rows.length
      : rows.filter((r) => (ACCESS_STATUS[r.status] || {}).tab === t.value).length,
  })), [rows]);

  const requesterOptions = useMemo(() => [
    { value: '', label: 'ทุกคน' },
    ...[...new Set(rows.map((r) => r.name))].map((n) => ({ value: n, label: n })),
  ], [rows]);
  const purposeOptions = useMemo(() => [
    { value: '', label: 'ทุกวัตถุประสงค์' },
    ...[...new Set(rows.map((r) => r.purpose))].map((p) => ({ value: p, label: p })),
  ], [rows]);
  const statusOptions = useMemo(() => [
    { value: '', label: 'ทุกสถานะ' },
    ...Object.keys(ACCESS_STATUS).map((s) => ({ value: s, label: s })),
  ], []);
  const dateOptions = [
    { value: '', label: 'ทุกวัน' },
    { value: 'today', label: 'วันนี้' },
    { value: '7', label: '7 วันล่าสุด' },
    { value: '30', label: '30 วันล่าสุด' },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const meta = ACCESS_STATUS[r.status] || {};
      return (
        (activeTab === 'all' || meta.tab === activeTab) &&
        (!filterRequester || r.name === filterRequester) &&
        (!filterPurpose || r.purpose === filterPurpose) &&
        (!filterStatus || r.status === filterStatus) &&
        (!q || r.reqNo.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.empCode.toLowerCase().includes(q))
      );
    });
  }, [rows, activeTab, search, filterRequester, filterPurpose, filterStatus]);

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
  const isAllFilters = !filterRequester && !filterPurpose && !filterStatus && !filterDate;

  const resetFilters = () => {
    setFilterRequester(''); setFilterPurpose(''); setFilterStatus(''); setFilterDate(''); setPage(1);
  };

  const handleSubmit = (value) => {
    const q = (value || '').trim();
    if (q) pushHistory({ label: q, value: q });
    setSearch(q); setPage(1);
  };

  /* Status-dependent action column — ✓ approve / ✗ reject, one disabled per
     status (Figma 363:122327) + ปุ่มดูรายละเอียด (audit).
     อนุมัติ = ให้สิทธิแทนเจ้าของข้อมูล → ผ่าน ConsentIdentityVerifyPopup ก่อน
     (ด.1.1.1) แล้วจึงระบุช่วงเวลาสิทธิ (ด.1.1.17.2). */
  const renderAction = (row) => {
    const meta = ACCESS_STATUS[row.status] || {};
    return (
      <div className='flex items-center justify-end' style={{ gap: 'var(--dim-space-150)' }}>
        <NeutralSubdueIconButton
          icon='visibility'
          variant='outline'
          size='sm'
          aria-label='ดูรายละเอียดและ audit'
          title='รายละเอียด / audit'
          onClick={() => setDetailFor(row)}
        />
        {(meta.canApprove || meta.canReject) && (
          <>
            <NeutralSubdueIconButton
              icon='check'
              variant='outline'
              size='sm'
              disabled={!meta.canApprove}
              aria-label='อนุมัติคำขอ'
              title='อนุมัติ (ระบุช่วงเวลาสิทธิ)'
              onClick={() => meta.canApprove && setVerifyFor(row)}
            />
            <NeutralSubdueIconButton
              icon='close'
              variant='outline'
              size='sm'
              disabled={!meta.canReject}
              aria-label='ปฏิเสธคำขอ'
              title='ปฏิเสธ'
              onClick={() => meta.canReject && setDialog({ record: row, kind: 'reject' })}
            />
          </>
        )}
      </div>
    );
  };

  /* ด.1.1.17.3 — คอลัมน์ Active: Switch เปิด/ปิดการให้สิทธิตามเอกสาร */
  const renderActive = (row) => {
    if (row.status !== 'อนุมัติแล้ว' && row.status !== 'หมดอายุ') {
      return <span style={MUTED_CELL}>-</span>;
    }
    /* หมดช่วงเวลา → ห้าม re-activate จนกว่าจะตั้งช่วงใหม่ (อนุมัติใหม่) */
    const periodOver = row.periodEnd && (daysLeftOfIso(row.periodEnd) ?? 1) < 0;
    return (
      <span title={periodOver ? 'หมดช่วงเวลาแล้ว — ต้องอนุมัติพร้อมตั้งช่วงเวลาใหม่ก่อนจึงเปิดได้' : (row.active ? 'ปิดการให้สิทธิ' : 'เปิดการให้สิทธิ')}>
        <Switch
          checked={!!row.active}
          disabled={periodOver}
          onChange={() => !periodOver && setToggleFor(row)}
          aria-label={`สถานะ Active ของ ${row.reqNo}`}
        />
      </span>
    );
  };

  /* ด.1.1.17.2 — คอลัมน์ช่วงเวลาสิทธิ + วันคงเหลือ */
  const renderPeriod = (row) => {
    if (!row.periodStart) return <StackCell top={row.period} bottom='ยังไม่กำหนดช่วงสิทธิ' />;
    const left = daysLeftOfIso(row.periodEnd);
    return (
      <StackCell
        top={`${thaiDateOfIso(row.periodStart)} – ${thaiDateOfIso(row.periodEnd)}`}
        bottom={left != null && left >= 0 ? `เหลืออีก ${left} วัน` : 'หมดช่วงเวลาแล้ว'}
      />
    );
  };

  const columns = useMemo(() => [
    { key: 'reqNo', header: 'เลขที่คำขอ', width: 150, sortable: true, render: (r) => <Cell value={r.reqNo} /> },
    {
      key: 'name', header: 'ผู้ขอ (เจ้าหน้าที่)', width: 220, sortable: true,
      render: (r) => (
        <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
          <Initials name={r.name} />
          <span className='truncate' style={TEXT_CELL}>{r.name}</span>
        </div>
      ),
    },
    { key: 'empCode', header: 'รหัสพนักงาน', width: 130, sortable: true, render: (r) => <Cell value={r.empCode} /> },
    { key: 'createdDate', header: 'วันที่สร้างคำขอ', width: 160, sortable: true, render: (r) => <StackCell top={r.createdDate} bottom={r.createdTime} /> },
    { key: 'hn', header: 'HN ผู้รับบริการ', width: 140, render: (r) => <Cell value={r.hn} /> },
    { key: 'purpose', header: 'วัตถุประสงค์', width: 170, render: (r) => <Cell value={r.purpose} /> },
    { key: 'period', header: 'ช่วงเวลาสิทธิ (เริ่ม-สิ้นสุด)', width: 230, render: renderPeriod },
    { key: 'file', header: 'แบบฟอร์มขอเข้าถึงข้อมูล', width: 200, render: (r) => <FileCell name={r.file} size={r.fileSize} onClick={() => setPreviewFile(r)} /> },
    {
      key: 'status', header: 'สถานะ', width: 140, sortable: true,
      render: (r) => (
        <div className='flex flex-col items-start' style={{ gap: 'var(--dim-space-050)' }}>
          <ColorfulBadge style={(ACCESS_STATUS[r.status] || {}).tone || 'grey'} size='small' hierarchy='secondary' width='hug'>{r.status}</ColorfulBadge>
          {r.expiredByPeriod && (
            <span style={{ ...MUTED_CELL, fontSize: 'var(--type-size-xs)' }}>Inactive อัตโนมัติ (หมดช่วงเวลา)</span>
          )}
        </div>
      ),
    },
    /* ด.1.1.17.3 — เปิด/ปิดการให้สิทธิตามที่ระบุในเอกสาร */
    { key: 'active', header: 'Active', width: 90, render: renderActive },
    { key: 'action', header: 'การจัดการ', width: 150, render: renderAction },
  ], []);

  return (
    <>
      <QueuePageShell
        activeKey='consent-access'
        sidebarItems={CONSENT_NAV}
        sidebarFallbackKey='consent-access'
        brandTitle='ระบบจัดการความยินยอม'
        breadcrumb={breadcrumb}
        title='จัดการสิทธิ์การเข้าถึงแบบฟอร์ม'
        headerInfo={(
          <section className='flex items-stretch flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
            {ACCESS_SUMMARY.map((c) => (
              <SummaryCard key={c.key} card={c} variant='panel' />
            ))}
          </section>
        )}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(key) => { setActiveTab(key); setPage(1); }}
      >
        <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)' }}>
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
                placeholder='ค้นหาเลขที่คำขอ / ชื่อเจ้าหน้าที่...'
                width={640}
                history={searchHistory}
                onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
              />
            </div>

            <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
              <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <div className='flex items-center flex-wrap min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
                  <FilterTag value='ทั้งหมด' selected={isAllFilters} onClick={resetFilters} />
                  <FilterDropdown prefix='ผู้ขอ:' options={requesterOptions} value={filterRequester} onChange={(v) => { setFilterRequester(v); setPage(1); }} />
                  <FilterDropdown prefix='วัตถุประสงค์:' options={purposeOptions} value={filterPurpose} onChange={(v) => { setFilterPurpose(v); setPage(1); }} />
                  <FilterDropdown prefix='สถานะ:' options={statusOptions} value={filterStatus} onChange={(v) => { setFilterStatus(v); setPage(1); }} />
                  <FilterDropdown prefix='วันที่สร้าง:' options={dateOptions} value={filterDate} onChange={(v) => { setFilterDate(v); setPage(1); }} />
                </div>
                <div className='flex-1' />
                <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-200)' }}>
                  <BrandButton variant='outline' size='sm' leadingIcon='add' onClick={() => navigate.push('/consent/forms/new')}>
                    สร้างแบบฟอร์มใหม่
                  </BrandButton>
                  {/* ด.1.1.17.1 — สแกนแบบฟอร์มขอเข้าถึงข้อมูลนำเข้าระบบ */}
                  <BrandButton variant='fill' size='sm' leadingIcon='document_scanner' onClick={() => setScanOpen(true)}>
                    สแกนแบบฟอร์มนำเข้า
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
                emptyMessage='ไม่พบคำขอสิทธิ์การเข้าถึง'
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

      {/* ปฏิเสธคำขอ — confirm แล้ว mutate จริง (mock) */}
      <AlertDialog
        open={!!dialog}
        type='warning'
        title='ปฏิเสธคำขอเข้าถึงข้อมูล?'
        description={dialog ? `ยืนยันปฏิเสธคำขอ ${dialog.record.reqNo} ของ ${dialog.record.name}` : ''}
        confirmLabel='ปฏิเสธ'
        cancelLabel='ยกเลิก'
        onConfirm={() => {
          if (dialog) {
            patchRow(dialog.record.id, { status: 'ปฏิเสธ', active: false, audit: { by: 'ลดา ดีงาม', at: nowThai() } });
            pushToast(`ปฏิเสธคำขอ ${dialog.record.reqNo} แล้ว — บันทึกผู้ทำและเวลาใน audit`);
          }
          setDialog(null);
        }}
        onCancel={() => setDialog(null)}
        onClose={() => setDialog(null)}
      />

      {/* ด.1.1.1 — พิสูจน์ตัวตนก่อนอนุมัติสิทธิแทนเจ้าของข้อมูล */}
      <ConsentIdentityVerifyPopup
        open={!!verifyFor}
        onClose={() => setVerifyFor(null)}
        onVerified={() => {
          const rec = verifyFor;
          setVerifyFor(null);
          if (rec) setApproveFor(rec);
        }}
        actionLabel='อนุมัติสิทธิเข้าถึงข้อมูลผู้รับบริการ'
        patientName={verifyFor ? `ผู้รับบริการ HN ${verifyFor.hn}` : undefined}
        hn={verifyFor?.hn}
      />

      {/* ด.1.1.17.2 — อนุมัติพร้อมระบุช่วงเวลาสิทธิ */}
      <ApprovePeriodPopup
        open={!!approveFor}
        record={approveFor}
        onClose={() => setApproveFor(null)}
        onApprove={({ periodStart, periodEnd }) => {
          const rec = approveFor;
          setApproveFor(null);
          if (rec) {
            patchRow(rec.id, {
              status: 'อนุมัติแล้ว',
              active: true,
              periodStart,
              periodEnd,
              expiredByPeriod: false,
              audit: { by: 'ลดา ดีงาม', at: nowThai() },
            });
            pushToast(`อนุมัติ ${rec.reqNo} แล้ว — สิทธิ Active ${thaiDateOfIso(periodStart)} ถึง ${thaiDateOfIso(periodEnd)}`);
          }
        }}
      />

      {/* ด.1.1.17.3 — ยืนยันเปิด/ปิด Active (destructive เมื่อปิดสิทธิที่ใช้อยู่) */}
      <AlertDialog
        open={!!toggleFor}
        type={toggleFor && toggleFor.active ? 'destructive' : 'info'}
        title={toggleFor && toggleFor.active ? 'ปิดการให้สิทธิ (Inactive)?' : 'เปิดการให้สิทธิ (Active)?'}
        description={toggleFor
          ? `${toggleFor.reqNo} ของ ${toggleFor.name} — ${toggleFor.active
            ? 'สิทธินี้กำลังใช้งานอยู่ การปิดจะมีผลทันที และบันทึกผู้ทำ/เวลาไว้ใน audit (ไม่มีการลบประวัติ)'
            : 'เปิดการให้สิทธิตามช่วงเวลาที่ระบุไว้ในเอกสาร'}`
          : ''}
        confirmLabel={toggleFor && toggleFor.active ? 'ปิดสิทธิ' : 'เปิดสิทธิ'}
        cancelLabel='ยกเลิก'
        onConfirm={() => {
          if (toggleFor) {
            const next = !toggleFor.active;
            patchRow(toggleFor.id, { active: next, audit: { by: 'ลดา ดีงาม', at: nowThai() } });
            pushToast(`${next ? 'เปิด' : 'ปิด'}การให้สิทธิ ${toggleFor.reqNo} แล้ว — บันทึก audit ผู้ทำ/เวลา`);
          }
          setToggleFor(null);
        }}
        onCancel={() => setToggleFor(null)}
        onClose={() => setToggleFor(null)}
      />

      {/* ด.1.1.17.1 — สแกนแบบฟอร์มนำเข้า → คำขอใหม่พร้อมไฟล์แนบ */}
      <ScanImportPopup
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onImported={({ name, empCode, unit, hn, purpose, scopes, fileName }) => {
          setScanOpen(false);
          const id = rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
          setRows((prev) => [...prev, {
            id,
            reqNo: `REQ-2569-${String(40 + id).padStart(4, '0')}`,
            name,
            empCode: empCode || '-',
            unit,
            createdDate: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }),
            createdTime: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
            hn,
            purpose,
            scopes,
            period: '-',
            periodDays: '-',
            file: fileName || 'scanned-form.pdf',
            fileSize: '1.2 MB',
            status: 'รออนุมัติ',
            periodStart: null,
            periodEnd: null,
            active: false,
            audit: { by: 'ลดา ดีงาม', at: nowThai() },
          }]);
          pushToast(`นำเข้าคำขอจากเอกสารสแกนของ ${name} แล้ว — สถานะรออนุมัติ`);
        }}
      />

      {/* รายละเอียด + audit */}
      <AccessDetailPopup
        open={!!detailFor}
        record={detailFor}
        onClose={() => setDetailFor(null)}
        thaiDateOfIso={thaiDateOfIso}
      />

      <PhcisTopToast session={toast} onDismiss={() => setToast(null)} />

      {/* Attached-document preview (Figma DataCell click annotation) */}
      <Popup
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        size='large'
        title={previewFile ? previewFile.file : 'เอกสารที่แนบ'}
        subtitle={previewFile ? `แบบฟอร์มขอเข้าถึงข้อมูล · ${previewFile.fileSize}` : undefined}
        primaryAction={{ label: 'ปิด', onClick: () => setPreviewFile(null) }}
      >
        {previewFile && <DocPreview row={previewFile} />}
      </Popup>
    </>
  );
}
