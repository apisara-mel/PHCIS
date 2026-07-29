import React, { useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import Badge from '@/components/badge/Badge';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import { REQUISITIONS, RECEIVING_RECORDS, createRequisition, createReceivingRecord } from '@/data/pharmacyQueue';
import { DRUG_REGISTRY } from '@/data/pharmacyRegistry';
import PharmacySubNav from '@/components/pharmacy/PharmacySubNav';

/* เบิกจ่ายยา/เวชภัณฑ์ + บันทึกรับยาเข้าคลังใหญ่ (ToR §1.9.6-1.9.7) — two-tab
   record list (เบิกจ่าย / รับเข้าคลังใหญ่) with a mock "new" action for
   each, matching the same QueuePageShell + Table chrome as the rest of
   the pharmacy module. */

const breadcrumb = ['ระบบงานเภสัชกรรม', 'เบิกจ่าย/รับเข้าคลังยา'];

const TABS = [
  { key: 'requisition', label: 'เบิกจ่าย',        icon: 'move_down' },
  { key: 'receiving',   label: 'รับเข้าคลังใหญ่',  icon: 'move_up'   },
];

const REQ_STATUS_PILL = {
  pending:   { style: 'warning', label: 'รอดำเนินการ' },
  approved:  { style: 'info',    label: 'อนุมัติแล้ว'  },
  fulfilled: { style: 'success', label: 'เบิกจ่ายแล้ว' },
};

const formatThaiDate = (iso) => new Date(iso).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });

const inputStyle = {
  padding: 'var(--dim-space-150) var(--dim-space-300)',
  background: 'var(--surface-input-default)',
  border: 'var(--dim-stroke-100) solid var(--border-input-default)',
  borderRadius: 'var(--dim-radius-200)',
  fontSize: 'var(--type-size-sm)',
};

const NewRequisitionForm = ({ onCreate, onCancel }) => {
  const [drugName, setDrugName] = useState(DRUG_REGISTRY[0]?.name || '');
  const [quantity, setQuantity] = useState(100);
  return (
    <div className='flex flex-wrap items-end w-full' style={{ gap: 'var(--dim-space-300)', padding: 'var(--dim-space-400)', background: 'var(--surface-card-100)', border: 'var(--dim-stroke-100) solid var(--border-card-default)', borderRadius: 'var(--dim-radius-200)' }}>
      <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
        <span className='text-xs text-ink-tertiary'>ชื่อยา</span>
        <select value={drugName} onChange={(e) => setDrugName(e.target.value)} style={{ ...inputStyle, minWidth: 'var(--dim-size-2280, 218px)', appearance: 'none' }}>
          {DRUG_REGISTRY.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
      </label>
      <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
        <span className='text-xs text-ink-tertiary'>จำนวน</span>
        <input type='number' min='1' value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} style={{ ...inputStyle, width: 'var(--dim-size-1800, 96px)' }} />
      </label>
      <BrandButton size='sm' leadingIcon='send' onClick={() => onCreate({ drugName, quantity, unit: DRUG_REGISTRY.find((d) => d.name === drugName)?.unit === 'capsule' ? 'แคปซูล' : 'เม็ด' })}>
        ส่งคำขอเบิก
      </BrandButton>
      <NeutralSubdueButton size='sm' variant='outline' onClick={onCancel}>ยกเลิก</NeutralSubdueButton>
    </div>
  );
};

const NewReceivingForm = ({ onCreate, onCancel }) => {
  const [drugName, setDrugName] = useState(DRUG_REGISTRY[0]?.name || '');
  const [quantity, setQuantity] = useState(500);
  const [lot, setLot] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [receivedFrom, setReceivedFrom] = useState('องค์การเภสัชกรรม (GPO)');
  return (
    <div className='flex flex-wrap items-end w-full' style={{ gap: 'var(--dim-space-300)', padding: 'var(--dim-space-400)', background: 'var(--surface-card-100)', border: 'var(--dim-stroke-100) solid var(--border-card-default)', borderRadius: 'var(--dim-radius-200)' }}>
      <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
        <span className='text-xs text-ink-tertiary'>ชื่อยา</span>
        <select value={drugName} onChange={(e) => setDrugName(e.target.value)} style={{ ...inputStyle, minWidth: 'var(--dim-size-2200, 192px)', appearance: 'none' }}>
          {DRUG_REGISTRY.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
      </label>
      <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
        <span className='text-xs text-ink-tertiary'>จำนวน</span>
        <input type='number' min='1' value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} style={{ ...inputStyle, width: 'var(--dim-size-1800, 96px)' }} />
      </label>
      <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
        <span className='text-xs text-ink-tertiary'>Lot No.</span>
        <input type='text' value={lot} onChange={(e) => setLot(e.target.value)} placeholder='LOT-XXX-26' style={{ ...inputStyle, width: 'var(--dim-size-2050, 144px)' }} />
      </label>
      <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
        <span className='text-xs text-ink-tertiary'>วันหมดอายุ</span>
        <input type='date' value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} style={inputStyle} />
      </label>
      <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
        <span className='text-xs text-ink-tertiary'>รับจาก</span>
        <input type='text' value={receivedFrom} onChange={(e) => setReceivedFrom(e.target.value)} style={{ ...inputStyle, minWidth: 'var(--dim-size-2170, 177px)' }} />
      </label>
      <BrandButton
        size='sm'
        leadingIcon='inventory'
        disabled={!lot || !expiryDate}
        onClick={() => onCreate({ drugName, quantity, unit: DRUG_REGISTRY.find((d) => d.name === drugName)?.unit === 'capsule' ? 'แคปซูล' : 'เม็ด', lot, expiryDate, receivedFrom })}
      >
        บันทึกรับเข้าคลัง
      </BrandButton>
      <NeutralSubdueButton size='sm' variant='outline' onClick={onCancel}>ยกเลิก</NeutralSubdueButton>
    </div>
  );
};

const PharmacyRequisitionPage = () => {
  const [activeTab, setActiveTab] = useState('requisition');
  const [showForm, setShowForm] = useState(false);
  const [, forceRender] = useState(0);

  const summaryCards = [
    { key: 'pending',   label: 'รอดำเนินการ',  value: REQUISITIONS.filter((r) => r.status === 'pending').length,  indicator: 'คำขอเบิกจ่าย', color: 'inprogress', icon: 'hourglass_top' },
    { key: 'fulfilled', label: 'เบิกจ่ายแล้ว',  value: REQUISITIONS.filter((r) => r.status === 'fulfilled').length, indicator: 'เดือนนี้',     color: 'positive',   icon: 'move_down'     },
    { key: 'received',  label: 'รับเข้าคลังใหญ่', value: RECEIVING_RECORDS.length,                                   indicator: 'รายการทั้งหมด', color: 'brand',      icon: 'move_up'       },
  ];

  return (
    <QueuePageShell
      activeKey='pharmacy'
      breadcrumb={breadcrumb}
      title='เบิกจ่ายยา/เวชภัณฑ์ และรับเข้าคลังใหญ่'
      actions={<PharmacySubNav />}
      summaryCards={summaryCards}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={(k) => { setActiveTab(k); setShowForm(false); }}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-600)' }}>
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
          <div className='flex items-center justify-between'>
            <h2 style={{ margin: 0, fontFamily: 'var(--type-family-heading-content)', fontWeight: 'var(--type-weight-bold)', fontSize: 'var(--type-size-base)', color: 'var(--text-content-default)' }}>
              {activeTab === 'requisition' ? 'รายการเบิกจ่ายยา/เวชภัณฑ์' : 'รายการรับยาเข้าคลังใหญ่'}
            </h2>
            {!showForm && (
              <BrandButton size='sm' leadingIcon='add' onClick={() => setShowForm(true)}>
                {activeTab === 'requisition' ? 'สร้างคำขอเบิก' : 'บันทึกรับเข้าคลัง'}
              </BrandButton>
            )}
          </div>

          {showForm && activeTab === 'requisition' && (
            <NewRequisitionForm
              onCreate={(payload) => { createRequisition(payload); setShowForm(false); forceRender((n) => n + 1); }}
              onCancel={() => setShowForm(false)}
            />
          )}
          {showForm && activeTab === 'receiving' && (
            <NewReceivingForm
              onCreate={(payload) => { createReceivingRecord(payload); setShowForm(false); forceRender((n) => n + 1); }}
              onCancel={() => setShowForm(false)}
            />
          )}

          {activeTab === 'requisition' ? (
            <Table
              columns={[
                { key: 'requisitionNo', label: 'เลขที่คำขอ', width: 160 },
                { key: 'drugName', label: 'ชื่อยา', flex: true, minWidth: 220 },
                { key: 'quantity', label: 'จำนวน', width: 100, align: 'center', render: (r) => `${r.quantity} ${r.unit}` },
                { key: 'requestedBy', label: 'ผู้ขอเบิก', flex: true, minWidth: 180 },
                { key: 'requestedAt', label: 'วันที่ขอเบิก', width: 140, render: (r) => formatThaiDate(r.requestedAt) },
                { key: 'status', label: 'สถานะ', width: 130, render: (r) => <Badge style={REQ_STATUS_PILL[r.status].style} size='small'>{REQ_STATUS_PILL[r.status].label}</Badge> },
              ]}
              rows={REQUISITIONS}
              rowKey={(r) => r.id}
              emptyMessage='ไม่มีคำขอเบิกจ่าย'
            />
          ) : (
            <Table
              columns={[
                { key: 'receiptNo', label: 'เลขที่ใบรับ', width: 160 },
                { key: 'drugName', label: 'ชื่อยา', flex: true, minWidth: 200 },
                { key: 'quantity', label: 'จำนวน', width: 100, align: 'center', render: (r) => `${r.quantity} ${r.unit}` },
                { key: 'lot', label: 'Lot No.', width: 140 },
                { key: 'expiryDate', label: 'วันหมดอายุ', width: 130, render: (r) => formatThaiDate(r.expiryDate) },
                { key: 'receivedFrom', label: 'รับจาก', flex: true, minWidth: 180 },
                { key: 'receivedAt', label: 'วันที่รับเข้า', width: 140, render: (r) => formatThaiDate(r.receivedAt) },
              ]}
              rows={RECEIVING_RECORDS}
              rowKey={(r) => r.id}
              emptyMessage='ไม่มีรายการรับเข้าคลัง'
            />
          )}
        </div>
      </div>
    </QueuePageShell>
  );
};

export default PharmacyRequisitionPage;
