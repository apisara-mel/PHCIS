import React, { useMemo, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import Badge from '@/components/badge/Badge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandButton from '@/components/button/BrandButton';
import SuccessToast from '@/components/toast/SuccessToast';
import { FilterDropdown } from '@/components/forms/FilterTag';
import {
  MAIN_WAREHOUSE_STOCK,
  SUB_PHARMACY_STOCK,
  BORROW_RETURN_RECORDS,
  BORROW_RETURN_TYPES,
  confirmBorrowReturnRequest,
  createBorrowReturnRequest,
  nearExpiryEntries,
  WAREHOUSE_STATUS_OPTIONS,
  WAREHOUSE_OPERATING_STATUS,
  setWarehouseOperatingStatus,
  reorderNeededEntries,
  REQUISITION_TARGETS,
  createRequisition,
} from '@/data/pharmacyQueue';
import { DRUG_CLASSIFICATIONS, getRegistryDrug } from '@/data/pharmacyRegistry';
import { DEFAULT_CLINIC_VALUE, CLINIC_OPTIONS } from '@/components/layout/HeaderClinicContext';
import PharmacySubNav, { PharmacyAddDrugButton } from '@/components/pharmacy/PharmacySubNav';
import TabPill, { TabBar } from '@/components/tab/TabPill';
import { buildStockSummaryCards } from '@/pages/pharmacy/pharmacySummaryCards';
import { PHARMACY_NESTED_PANEL, PHARMACY_WORKLIST_CARD, PHARMACY_WORKLIST_CARD_BODY } from '@/pages/pharmacy/pharmacyContentCard';

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

/* จุดสั่งซื้อ (reorder point — ToR §1.9.8.3 "รายการที่ต้องทำการเบิกกับกอง
   เภสัชกรรมเพิ่มเติม... จะมีการอ้างอิงจากการตั้งค่า minimum ของยาและ
   เวชภัณฑ์แต่ละรายการ") — flags stock below the registry's usageRate.reorderPoint. */
const isBelowReorderPoint = (name, stock) => {
  const reg = getRegistryDrug(name);
  return !!reg && stock < reg.usageRate.reorderPoint;
};

const BASE_COLUMNS = [
  { key: 'name', label: 'ชื่อยา', flex: true, minWidth: 220 },
  { key: 'lot', label: 'Lot No.' },
  {
    key: 'stock', label: 'คงคลัง', align: 'center',
    render: (r) => (
      <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-050)' }}>
        <span>{r.stock.toLocaleString()} {r.unit}</span>
        {isBelowReorderPoint(r.name, r.stock) && <Badge style='error' size='small'>ต่ำกว่าจุดสั่งซื้อ</Badge>}
      </div>
    ),
  },
  { key: 'unitPrice', label: 'ราคา/หน่วย', align: 'center', render: (r) => `฿${r.unitPrice}` },
  {
    key: 'expiryDate', label: 'วันหมดอายุ',
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
  { key: 'receivedFrom', label: 'รับจาก' },
  { key: 'receivedAt', label: 'วันที่รับเข้า', render: (r) => formatThaiDate(r.receivedAt) },
];

const BORROW_RETURN_STATUS_PILL = {
  pending:   { style: 'warning', label: 'รอดำเนินการ' },
  completed: { style: 'success', label: 'เสร็จสิ้น'    },
};

const WAREHOUSE_STATUS_PILL = {
  open:        { style: 'success', label: 'เปิดดำเนินการ' },
  maintenance: { style: 'warning', label: 'ปิดปรับปรุง'    },
  suspended:   { style: 'error',   label: 'ระงับชั่วคราว'  },
};

const REORDER_CHANNEL_LABEL = Object.fromEntries(REQUISITION_TARGETS.map((t) => [t.key, t.label]));
const BORROW_RETURN_TYPE_LABEL = Object.fromEntries(BORROW_RETURN_TYPES.map((t) => [t.key, t.label]));

/* Counterpart-center dropdown for new ยืม/คืน/แลกล็อต requests — every
   center except this one (`DEFAULT_CLINIC_VALUE`), labeled to match the
   "ศูนย์บริการสาธารณสุข N ชื่อ" convention `BORROW_RETURN_RECORDS` seed
   rows already use (CLINIC_OPTIONS' own label is the shorter "ศูนย์ N ชื่อ"
   used for the Header clinic switcher, not this ToR-facing form). */
const COUNTERPART_CENTER_OPTIONS = CLINIC_OPTIONS
  .filter((c) => c.value !== DEFAULT_CLINIC_VALUE)
  .map((c) => ({ value: c.label.replace(/^ศูนย์/, 'ศูนย์บริการสาธารณสุข'), label: c.label.replace(/^ศูนย์/, 'ศูนย์บริการสาธารณสุข') }));

const INPUT_STYLE = {
  padding: 'var(--dim-space-150) var(--dim-space-300)',
  background: 'var(--surface-input-default)',
  border: 'var(--dim-stroke-100) solid var(--border-input-default)',
  borderRadius: 'var(--dim-radius-200)',
  fontSize: 'var(--type-size-sm)',
  outline: 'none',
};

const CLASSIFICATION_OPTIONS = [{ value: 'all', label: 'ทุกประเภทยา' }, ...DRUG_CLASSIFICATIONS.map((c) => ({ value: c.key, label: c.label }))];
const EXPIRY_OPTIONS = [
  { value: 'all', label: 'ทุกช่วงเวลาหมดอายุ' },
  { value: '3',   label: 'หมดอายุภายใน 3 เดือน' },
  { value: '6',   label: 'หมดอายุภายใน 6 เดือน' },
  { value: '12',  label: 'หมดอายุภายใน 12 เดือน' },
];

const PharmacyStockPage = () => {
  const [activeTab, setActiveTab] = useState('main');
  const [search, setSearch] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('all');
  const [expiryFilter, setExpiryFilter] = useState('all');
  const [, forceRender] = useState(0);
  const [requestedNames, setRequestedNames] = useState(() => new Set());
  const [toastMessage, setToastMessage] = useState('');
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const [newRequest, setNewRequest] = useState({ type: 'borrow', drugName: '', quantity: '', counterpartCenter: COUNTERPART_CENTER_OPTIONS[0]?.value || '' });

  const mainRows = useMemo(() => toRows(MAIN_WAREHOUSE_STOCK), []);
  const subRows = useMemo(() => toRows(SUB_PHARMACY_STOCK), []);
  const rows = activeTab === 'main' ? mainRows : subRows;
  const columns = activeTab === 'main' ? MAIN_COLUMNS : BASE_COLUMNS;

  const filteredRows = useMemo(() => {
    let result = rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((r) => r.name.toLowerCase().includes(q) || r.lot.toLowerCase().includes(q) || (getRegistryDrug(r.name)?.code || '').toLowerCase().includes(q));
    }
    if (classificationFilter !== 'all') {
      result = result.filter((r) => getRegistryDrug(r.name)?.classification === classificationFilter);
    }
    if (expiryFilter !== 'all') {
      result = result.filter((r) => isNearExpiry(r.expiryDate, Number(expiryFilter)));
    }
    return result;
  }, [rows, search, classificationFilter, expiryFilter]);

  const nearExpiryMain = useMemo(() => nearExpiryEntries(MAIN_WAREHOUSE_STOCK).length, []);
  const nearExpirySub = useMemo(() => nearExpiryEntries(SUB_PHARMACY_STOCK).length, []);

  const belowReorderMain = useMemo(
    () => mainRows.filter((r) => isBelowReorderPoint(r.name, r.stock)).length,
    [mainRows],
  );
  const belowReorderSub = useMemo(
    () => subRows.filter((r) => isBelowReorderPoint(r.name, r.stock)).length,
    [subRows],
  );

  /* §1.9.8.1/§1.9.9.1 — editable operating status per warehouse tier. */
  const operatingStatus = WAREHOUSE_OPERATING_STATUS[activeTab];
  const handleChangeOperatingStatus = (status) => { setWarehouseOperatingStatus(activeTab, status); forceRender((n) => n + 1); };

  /* §1.9.8.3/§1.9.9.3 — items below reorder point, split by requisition
     channel (NLEM → กองเภสัชกรรม, non-NLEM → สปสช.). */
  const reorderNeeded = useMemo(
    () => reorderNeededEntries(activeTab === 'main' ? MAIN_WAREHOUSE_STOCK : SUB_PHARMACY_STOCK),
    [activeTab],
  );

  /* §1.9.8.3/§1.9.9.3 — "สามารถทำการเบิกกับกองเภสัชกรรมผ่านระบบอัตโนมัติ".
     Creates a real requisition line straight from the below-reorder-point
     row instead of only displaying which channel it would route to; the
     row is then tracked as requested so the action doesn't fire twice in
     the same session (requisition status/approval is tracked from
     PharmacyRequisitionPage as usual afterwards). */
  const handleAutoReorder = (row) => {
    const drug = getRegistryDrug(row.name);
    createRequisition({
      items: [{ drugName: row.name, quantity: Math.max(drug?.usageRate?.maxQty || row.reorderPoint * 2, row.reorderPoint) - row.stock, unit: row.unit }],
      requisitionType: 'urgent',
      notes: 'สร้างอัตโนมัติจากรายการต่ำกว่าจุดสั่งซื้อ (คลังยาและเวชภัณฑ์)',
      requestingCenter: DEFAULT_CLINIC_VALUE,
      targetUnit: row.channel,
    });
    setRequestedNames((prev) => new Set(prev).add(row.name));
    setToastMessage(`สร้างใบเบิก${REORDER_CHANNEL_LABEL[row.channel]}สำหรับ ${row.name} แล้ว`);
  };

  /* §1.9.9.4 — "ผู้ส่งคำร้อง" creating a NEW ยืม/คืน/แลกล็อต request. */
  const handleCreateBorrowReturn = () => {
    if (!newRequest.drugName.trim() || !newRequest.quantity || !newRequest.counterpartCenter) return;
    const drug = getRegistryDrug(newRequest.drugName);
    createBorrowReturnRequest({
      type: newRequest.type,
      drugName: newRequest.drugName.trim(),
      quantity: newRequest.quantity,
      unit: drug?.unit === 'capsule' ? 'แคปซูล' : 'เม็ด',
      counterpartCenter: newRequest.counterpartCenter,
    });
    setToastMessage('ส่งคำร้องแล้ว');
    setNewRequest({ type: 'borrow', drugName: '', quantity: '', counterpartCenter: COUNTERPART_CENTER_OPTIONS[0]?.value || '' });
    setShowNewRequestForm(false);
    forceRender((n) => n + 1);
  };

  const summaryCards = useMemo(
    () => buildStockSummaryCards({
      mainRows,
      subRows,
      nearExpiryMain,
      nearExpirySub,
      belowReorderMain,
      belowReorderSub,
    }),
    [mainRows, subRows, nearExpiryMain, nearExpirySub, belowReorderMain, belowReorderSub],
  );

  const tabCounts = useMemo(() => ({ main: mainRows.length, sub: subRows.length }), [mainRows.length, subRows.length]);

  return (
    <QueuePageShell
      activeKey='pharmacy'
      breadcrumb={breadcrumb}
      title='ระบบงานเภสัชกรรม'
      summaryCards={summaryCards}
      actions={<PharmacyAddDrugButton />}
      belowSummary={<PharmacySubNav />}
    >
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-600)' }}
      >
        <div
          className='w-full flex flex-col'
          style={PHARMACY_WORKLIST_CARD_BODY}
        >
          <TabBar aria-label='เลือกคลังยา' align='center' className='self-center shrink-0 max-w-full'>
            {TABS.map((t) => (
              <TabPill
                key={t.key}
                size='large'
                selected={activeTab === t.key}
                leadingIcon={t.icon}
                count={tabCounts[t.key]}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </TabPill>
            ))}
          </TabBar>

          {/* §1.9.8.1/§1.9.9.1 — สถานะการทำงานของคลัง (editable, per tier). */}
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
            <span className='text-sm' style={{ color: 'var(--text-content-secondary)' }}>สถานะคลัง:</span>
            <Badge style={WAREHOUSE_STATUS_PILL[operatingStatus.status].style} size='small'>
              {WAREHOUSE_STATUS_PILL[operatingStatus.status].label}
            </Badge>
            <span className='text-xs' style={{ color: 'var(--text-content-tertiary)' }}>
              อัปเดตล่าสุดโดย {operatingStatus.updatedBy} ({formatThaiDate(operatingStatus.updatedAt)})
            </span>
            <div className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
              {WAREHOUSE_STATUS_OPTIONS.filter((o) => o.key !== operatingStatus.status).map((o) => (
                <NeutralSubdueButton key={o.key} size='sm' variant='outline' onClick={() => handleChangeOperatingStatus(o.key)}>
                  {o.label}
                </NeutralSubdueButton>
              ))}
            </div>
          </div>
          <input
            type='text'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='ค้นหาชื่อยา / รหัสยา / Lot No.'
            style={{
              width: '100%', maxWidth: 'var(--dim-size-2600, 384px)', padding: 'var(--dim-space-150) var(--dim-space-300)',
              background: 'var(--surface-input-default)',
              border: 'var(--dim-stroke-100) solid var(--border-input-default)',
              borderRadius: 'var(--dim-radius-200)', fontSize: 'var(--type-size-sm)', outline: 'none',
            }}
          />
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
            <FilterDropdown prefix='ประเภทยา:' options={CLASSIFICATION_OPTIONS} value={classificationFilter} onChange={setClassificationFilter} />
            <FilterDropdown prefix='วันหมดอายุ:' options={EXPIRY_OPTIONS} value={expiryFilter} onChange={setExpiryFilter} />
          </div>
          <Table columns={columns} rows={filteredRows} rowKey={(r) => r.name} stickyColCount={1} emptyMessage='ไม่พบรายการยาที่ตรงกับเงื่อนไข' />
        </div>

        {/* §1.9.8.3/§1.9.9.3 — รายการที่ต้องเบิกเพิ่มเติม, split by channel:
            NLEM → กองเภสัชกรรม (the standard §1.9.6 requisition flow),
            non-NLEM → สปสช. (extra funding request). */}
        <div
          className='w-full flex flex-col'
          style={{ ...PHARMACY_WORKLIST_CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-300)' }}
        >
          <h2 style={{ margin: 0, fontFamily: 'var(--type-family-heading-content)', fontWeight: 'var(--type-weight-bold)', fontSize: 'var(--type-size-base)', color: 'var(--text-content-default)' }}>
            รายการที่ต้องเบิกเพิ่มเติม
          </h2>
          <Table
            columns={[
              { key: 'name', label: 'ชื่อยา', flex: true, minWidth: 220 },
              { key: 'stock', label: 'คงคลัง', align: 'center', render: (r) => `${r.stock.toLocaleString()} ${r.unit}` },
              { key: 'reorderPoint', label: 'จุดสั่งซื้อ', align: 'center', render: (r) => r.reorderPoint.toLocaleString() },
              { key: 'channel', label: 'เบิกจาก', render: (r) => <Badge style='warning' size='small'>{REORDER_CHANNEL_LABEL[r.channel]}</Badge> },
              {
                key: 'autoReorder', label: 'ดำเนินการ', align: 'center', sortable: false,
                render: (r) => requestedNames.has(r.name) ? (
                  <Badge style='success' size='small'>ส่งใบเบิกแล้ว</Badge>
                ) : (
                  <NeutralSubdueButton size='sm' variant='outline' leadingIcon='bolt' onClick={() => handleAutoReorder(r)}>เบิกอัตโนมัติ</NeutralSubdueButton>
                ),
              },
            ]}
            rows={reorderNeeded}
            rowKey={(r) => r.name}
            emptyMessage='ไม่มีรายการที่ต่ำกว่าจุดสั่งซื้อ'
          />
        </div>

        {activeTab === 'sub' && (
          <>
            {/* §1.9.9.4 — ผู้ส่งคำร้อง: requests THIS center made to others
                (ยืม/คืน/แลกล็อต), with history. */}
            <div
              className='w-full flex flex-col'
              style={{ ...PHARMACY_WORKLIST_CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-300)' }}
            >
              <div className='flex items-center justify-between w-full flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                <h2 style={{ margin: 0, fontFamily: 'var(--type-family-heading-content)', fontWeight: 'var(--type-weight-bold)', fontSize: 'var(--type-size-base)', color: 'var(--text-content-default)' }}>
                  ผู้ส่งคำร้อง — ยืม/คืน/แลกล็อตยาที่ศูนย์นี้ร้องขอ
                </h2>
                <NeutralSubdueButton size='sm' variant='outline' leadingIcon={showNewRequestForm ? 'close' : 'add'} onClick={() => setShowNewRequestForm((v) => !v)}>
                  {showNewRequestForm ? 'ยกเลิก' : 'สร้างคำร้อง'}
                </NeutralSubdueButton>
              </div>

              {showNewRequestForm && (
                <div className='flex flex-wrap items-end w-full' style={{ gap: 'var(--dim-space-300)', padding: 'var(--dim-space-400)', ...PHARMACY_NESTED_PANEL }}>
                  <label className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                    <span className='text-xs' style={{ color: 'var(--text-content-tertiary)' }}>ประเภท</span>
                    <select value={newRequest.type} onChange={(e) => setNewRequest((p) => ({ ...p, type: e.target.value }))} style={{ ...INPUT_STYLE, appearance: 'none' }}>
                      {BORROW_RETURN_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                    </select>
                  </label>
                  <label className='flex flex-col flex-1' style={{ gap: 'var(--dim-space-150)', minWidth: 200 }}>
                    <span className='text-xs' style={{ color: 'var(--text-content-tertiary)' }}>ชื่อยา</span>
                    <input type='text' value={newRequest.drugName} onChange={(e) => setNewRequest((p) => ({ ...p, drugName: e.target.value }))} placeholder='เช่น Ibuprofen 400 mg' style={INPUT_STYLE} list='stock-drug-options' />
                    <datalist id='stock-drug-options'>
                      {Object.keys(SUB_PHARMACY_STOCK).map((name) => <option key={name} value={name} />)}
                    </datalist>
                  </label>
                  <label className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                    <span className='text-xs' style={{ color: 'var(--text-content-tertiary)' }}>จำนวน</span>
                    <input type='number' min='1' value={newRequest.quantity} onChange={(e) => setNewRequest((p) => ({ ...p, quantity: e.target.value }))} style={{ ...INPUT_STYLE, width: 'var(--dim-size-1800, 96px)' }} />
                  </label>
                  <label className='flex flex-col flex-1' style={{ gap: 'var(--dim-space-150)', minWidth: 220 }}>
                    <span className='text-xs' style={{ color: 'var(--text-content-tertiary)' }}>ศูนย์บริการคู่กรณี</span>
                    <select value={newRequest.counterpartCenter} onChange={(e) => setNewRequest((p) => ({ ...p, counterpartCenter: e.target.value }))} style={{ ...INPUT_STYLE, appearance: 'none' }}>
                      {COUNTERPART_CENTER_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </label>
                  <BrandButton size='md' leadingIcon='send' onClick={handleCreateBorrowReturn} disabled={!newRequest.drugName.trim() || !newRequest.quantity}>ส่งคำร้อง</BrandButton>
                </div>
              )}

              <Table
                columns={[
                  { key: 'type', label: 'ประเภท', render: (r) => <Badge style={r.type === 'borrow' ? 'info' : r.type === 'return' ? 'success' : 'warning'} size='small'>{BORROW_RETURN_TYPE_LABEL[r.type]}</Badge> },
                  { key: 'drugName', label: 'ชื่อยา', flex: true, minWidth: 200 },
                  { key: 'quantity', label: 'จำนวน', align: 'center', render: (r) => `${r.quantity} ${r.unit}` },
                  { key: 'counterpartCenter', label: 'ศูนย์บริการคู่กรณี', flex: true, minWidth: 220 },
                  { key: 'requestedAt', label: 'วันที่ทำรายการ', render: (r) => formatThaiDate(r.requestedAt) },
                  { key: 'status', label: 'สถานะ', render: (r) => <Badge style={BORROW_RETURN_STATUS_PILL[r.status].style} size='small'>{BORROW_RETURN_STATUS_PILL[r.status].label}</Badge> },
                ]}
                rows={BORROW_RETURN_RECORDS.filter((r) => r.direction === 'outgoing')}
                rowKey={(r) => r.id}
                emptyMessage='ไม่มีรายการที่ส่งคำร้อง'
              />
            </div>

            {/* §1.9.9.5 — ผู้รับคำร้อง: requests OTHER centers sent here;
                pending ones can be confirmed. */}
            <div
              className='w-full flex flex-col'
              style={{ ...PHARMACY_WORKLIST_CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-300)' }}
            >
              <h2 style={{ margin: 0, fontFamily: 'var(--type-family-heading-content)', fontWeight: 'var(--type-weight-bold)', fontSize: 'var(--type-size-base)', color: 'var(--text-content-default)' }}>
                ผู้รับคำร้อง — คำร้องจากศูนย์อื่น
              </h2>
              <Table
                columns={[
                  { key: 'type', label: 'ประเภท', render: (r) => <Badge style={r.type === 'borrow' ? 'info' : r.type === 'return' ? 'success' : 'warning'} size='small'>{BORROW_RETURN_TYPE_LABEL[r.type]}</Badge> },
                  { key: 'drugName', label: 'ชื่อยา', flex: true, minWidth: 200 },
                  { key: 'quantity', label: 'จำนวน', align: 'center', render: (r) => `${r.quantity} ${r.unit}` },
                  { key: 'counterpartCenter', label: 'ศูนย์บริการคู่กรณี', flex: true, minWidth: 220 },
                  { key: 'requestedAt', label: 'วันที่ทำรายการ', render: (r) => formatThaiDate(r.requestedAt) },
                  { key: 'status', label: 'สถานะ', render: (r) => <Badge style={BORROW_RETURN_STATUS_PILL[r.status].style} size='small'>{BORROW_RETURN_STATUS_PILL[r.status].label}</Badge> },
                  {
                    key: 'itemActions', label: 'ดำเนินการ', align: 'center', sortable: false,
                    render: (r) => r.status === 'pending' ? (
                      <NeutralSubdueButton size='sm' variant='outline' onClick={() => { confirmBorrowReturnRequest(r.id); forceRender((n) => n + 1); }}>
                        ยืนยัน
                      </NeutralSubdueButton>
                    ) : '—',
                  },
                ]}
                rows={BORROW_RETURN_RECORDS.filter((r) => r.direction === 'incoming')}
                rowKey={(r) => r.id}
                emptyMessage='ไม่มีคำร้องจากศูนย์อื่น'
              />
            </div>
          </>
        )}
      </div>
      <SuccessToast open={!!toastMessage} message={toastMessage} onClose={() => setToastMessage('')} />
    </QueuePageShell>
  );
};

export default PharmacyStockPage;
