import React, { useMemo, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import Badge from '@/components/badge/Badge';
import {
  MAIN_WAREHOUSE_STOCK,
  SUB_PHARMACY_STOCK,
  BORROW_RETURN_RECORDS,
  nearExpiryEntries,
} from '@/data/pharmacyQueue';
import PharmacySubNav from '@/components/pharmacy/PharmacySubNav';

/* คลังยาและเวชภัณฑ์ (ToR §1.9.8-1.9.9) — two-tier warehouse view: คลังยาใหญ่
   (per-center bulk store) and คลังยาย่อย (counter stock dispensing draws
   from), each showing near-expiry (3-6 month) items. Reached from the
   System Hub's "คลังยาและเวชภัณฑ์" tile (previously a dead `route: null`
   card, see systemCatalog.js) and from the Sidebar pharmacy sub-menu. */

const breadcrumb = ['ระบบงานเภสัชกรรม', 'คลังยาและเวชภัณฑ์'];

const TABS = [
  { key: 'main', label: 'คลังยาใหญ่', icon: 'warehouse'     },
  { key: 'sub',  label: 'คลังยาย่อย', icon: 'inventory_2'   },
];

const toRows = (stockMap) => Object.entries(stockMap).map(([name, entry]) => ({ name, ...entry }));

const isNearExpiry = (expiryDate, monthsAhead = 6) => {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() + monthsAhead);
  return expiryDate <= cutoff.toISOString().slice(0, 10);
};

const formatThaiDate = (iso) => new Date(iso).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });

const BASE_COLUMNS = [
  { key: 'name', label: 'ชื่อยา', flex: true, minWidth: 220 },
  { key: 'lot', label: 'Lot No.', width: 140 },
  { key: 'stock', label: 'คงคลัง', width: 120, align: 'center', render: (r) => `${r.stock.toLocaleString()} ${r.unit}` },
  { key: 'unitPrice', label: 'ราคา/หน่วย', width: 100, align: 'center', render: (r) => `฿${r.unitPrice}` },
  {
    key: 'expiryDate', label: 'วันหมดอายุ', width: 160,
    render: (r) => (
      <div className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
        <span>{formatThaiDate(r.expiryDate)}</span>
        {isNearExpiry(r.expiryDate) && <Badge style='warning' size='small'>ใกล้หมดอายุ</Badge>}
      </div>
    ),
  },
];

const MAIN_COLUMNS = [
  ...BASE_COLUMNS,
  { key: 'receivedFrom', label: 'รับจาก', width: 200 },
  { key: 'receivedAt', label: 'วันที่รับเข้า', width: 120, render: (r) => formatThaiDate(r.receivedAt) },
];

const BORROW_RETURN_STATUS_PILL = {
  pending:   { style: 'warning', label: 'รอดำเนินการ' },
  completed: { style: 'success', label: 'เสร็จสิ้น'    },
};

const PharmacyStockPage = () => {
  const [activeTab, setActiveTab] = useState('main');
  const [search, setSearch] = useState('');

  const mainRows = useMemo(() => toRows(MAIN_WAREHOUSE_STOCK), []);
  const subRows = useMemo(() => toRows(SUB_PHARMACY_STOCK), []);
  const rows = activeTab === 'main' ? mainRows : subRows;
  const columns = activeTab === 'main' ? MAIN_COLUMNS : BASE_COLUMNS;

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.lot.toLowerCase().includes(q));
  }, [rows, search]);

  const nearExpiryCount = useMemo(
    () => nearExpiryEntries(activeTab === 'main' ? MAIN_WAREHOUSE_STOCK : SUB_PHARMACY_STOCK).length,
    [activeTab],
  );

  const summaryCards = [
    { key: 'total',      label: 'รายการยาทั้งหมด',       value: rows.length,       indicator: activeTab === 'main' ? 'คลังยาใหญ่' : 'คลังยาย่อย', color: 'brand',      icon: 'inventory_2' },
    { key: 'nearExpiry',  label: 'ใกล้หมดอายุ (≤6 เดือน)', value: nearExpiryCount,   indicator: 'ควรเบิกจ่าย/ใช้ก่อน',                             color: 'inprogress', icon: 'schedule'    },
    { key: 'totalUnits',  label: 'จำนวนคงคลังรวม',        value: rows.reduce((s, r) => s + r.stock, 0).toLocaleString(), indicator: 'ทุกรายการ', color: 'positive',   icon: 'warehouse'   },
  ];

  return (
    <QueuePageShell
      activeKey='pharmacy'
      breadcrumb={breadcrumb}
      title='ระบบคลังยาและเวชภัณฑ์'
      actions={<PharmacySubNav />}
      summaryCards={summaryCards}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-600)' }}
      >
        <div
          className='w-full flex flex-col'
          style={{
            background: 'var(--surface-card-100)',
            borderRadius: 'var(--dim-radius-500)',
            border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            boxShadow: 'var(--shadow-card-strong)',
            padding: 'var(--dim-space-600)',
            gap: 'var(--dim-space-400)',
          }}
        >
          <input
            type='text'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='ค้นหาชื่อยา / Lot No.'
            style={{
              width: '100%', maxWidth: 'var(--dim-size-2600, 384px)', padding: 'var(--dim-space-150) var(--dim-space-300)',
              background: 'var(--surface-input-default)',
              border: 'var(--dim-stroke-100) solid var(--border-input-default)',
              borderRadius: 'var(--dim-radius-200)', fontSize: 'var(--type-size-sm)', outline: 'none',
            }}
          />
          <Table columns={columns} rows={filteredRows} rowKey={(r) => r.name} stickyColCount={1} emptyMessage='ไม่พบรายการยาที่ตรงกับเงื่อนไข' />
        </div>

        {activeTab === 'sub' && (
          <div
            className='w-full flex flex-col'
            style={{
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-500)',
              border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
              boxShadow: 'var(--shadow-card-strong)',
              padding: 'var(--dim-space-600)',
              gap: 'var(--dim-space-300)',
            }}
          >
            <h2 style={{ margin: 0, fontFamily: 'var(--type-family-heading-content)', fontWeight: 'var(--type-weight-bold)', fontSize: 'var(--type-size-base)', color: 'var(--text-content-default)' }}>
              ยืม-คืนยาระหว่างศูนย์บริการสาธารณสุข
            </h2>
            <Table
              columns={[
                { key: 'type', label: 'ประเภท', width: 100, render: (r) => <Badge style={r.type === 'borrow' ? 'info' : 'success'} size='small'>{r.type === 'borrow' ? 'ยืม' : 'คืน'}</Badge> },
                { key: 'drugName', label: 'ชื่อยา', flex: true, minWidth: 200 },
                { key: 'quantity', label: 'จำนวน', width: 120, align: 'center', render: (r) => `${r.quantity} ${r.unit}` },
                { key: 'counterpartCenter', label: 'ศูนย์บริการคู่กรณี', flex: true, minWidth: 220 },
                { key: 'requestedAt', label: 'วันที่ทำรายการ', width: 140, render: (r) => formatThaiDate(r.requestedAt) },
                { key: 'status', label: 'สถานะ', width: 130, render: (r) => <Badge style={BORROW_RETURN_STATUS_PILL[r.status].style} size='small'>{BORROW_RETURN_STATUS_PILL[r.status].label}</Badge> },
              ]}
              rows={BORROW_RETURN_RECORDS}
              rowKey={(r) => r.id}
              emptyMessage='ไม่มีรายการยืม-คืนยา'
            />
          </div>
        )}
      </div>
    </QueuePageShell>
  );
};

export default PharmacyStockPage;
