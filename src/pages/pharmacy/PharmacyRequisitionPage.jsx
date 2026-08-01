import React, { useMemo, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import Badge from '@/components/badge/Badge';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Icon from '@/components/icons/Icon';
import {
  REQUISITIONS, RECEIVING_RECORDS, REQUISITION_TYPES, RECEIVING_TYPES,
  REQUISITION_ITEM_CATEGORIES, REQUISITION_TARGETS,
  createRequisition, createReceivingRecord,
  updateRequisition, cancelRequisition, approveRequisition,
  updateReceivingRecord, cancelReceivingRecord,
  estimateDaysUntilNextRequisition,
} from '@/data/pharmacyQueue';
import { DRUG_REGISTRY } from '@/data/pharmacyRegistry';
import { CLINIC_OPTIONS, DEFAULT_CLINIC_VALUE } from '@/components/layout/HeaderClinicContext';
import PharmacySubNav, { PharmacyAddDrugButton } from '@/components/pharmacy/PharmacySubNav';
import TabPill, { TabBar } from '@/components/tab/TabPill';
import PharmacyRequisitionPrint from '@/components/pharmacy/PharmacyRequisitionPrint';
import { buildRequisitionSummaryCards } from '@/pages/pharmacy/pharmacySummaryCards';
import { PHARMACY_NESTED_PANEL, PHARMACY_WORKLIST_CARD_BODY } from '@/pages/pharmacy/pharmacyContentCard';

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
  cancelled: { style: 'error',   label: 'ยกเลิกแล้ว'   },
};

const REQUISITION_TYPE_LABEL = {
  regular: 'ปกติ', urgent: 'ด่วน', 'other-unit': 'จ่ายให้หน่วยงานอื่น',
};

const ITEM_CATEGORY_LABEL = Object.fromEntries(REQUISITION_ITEM_CATEGORIES.map((c) => [c.key, c.label]));
const REQUISITION_TARGET_LABEL = Object.fromEntries(REQUISITION_TARGETS.map((t) => [t.key, t.label]));
const CLINIC_LABEL = Object.fromEntries(CLINIC_OPTIONS.map((c) => [c.value, c.label]));

const RECEIVING_TYPE_LABEL = {
  purchase: 'จัดซื้อ', transfer: 'โอนจากหน่วยงานอื่น', donation: 'รับบริจาค',
};

const formatThaiDate = (iso) => new Date(iso).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });

const inputStyle = {
  padding: 'var(--dim-space-150) var(--dim-space-300)',
  background: 'var(--surface-input-default)',
  border: 'var(--dim-stroke-100) solid var(--border-input-default)',
  borderRadius: 'var(--dim-radius-200)',
  fontSize: 'var(--type-size-sm)',
};

const blankRequisitionLine = () => ({ drugName: DRUG_REGISTRY[0]?.name || '', quantity: 100, packSize: '' });

/* §1.9.6.9 — one requisition document, many drug lines (add/remove).
   §1.9.6.3/.5/.7/.8 — requesting center + target unit + item category +
   live usage-rate/days-of-stock context per line, all captured up front. */
const NewRequisitionForm = ({ onCreate, onCancel }) => {
  const [requestingCenter, setRequestingCenter] = useState(DEFAULT_CLINIC_VALUE);
  const [targetUnit, setTargetUnit] = useState(REQUISITION_TARGETS[0].key);
  const [itemCategory, setItemCategory] = useState(REQUISITION_ITEM_CATEGORIES[0].key);
  const [requisitionType, setRequisitionType] = useState('regular');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([blankRequisitionLine()]);

  const updateLine = (idx, patch) => setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const addLine = () => setLines((ls) => [...ls, blankRequisitionLine()]);
  const removeLine = (idx) => setLines((ls) => ls.filter((_, i) => i !== idx));

  const handleSubmit = () => onCreate({
    items: lines.map((l) => ({
      drugName: l.drugName, quantity: l.quantity, packSize: l.packSize,
      unit: DRUG_REGISTRY.find((d) => d.name === l.drugName)?.unit === 'capsule' ? 'แคปซูล' : 'เม็ด',
    })),
    requisitionType, notes, requestingCenter, targetUnit, itemCategory,
  });

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)', padding: 'var(--dim-space-400)', ...PHARMACY_NESTED_PANEL }}>
      <div className='flex flex-wrap items-end' style={{ gap: 'var(--dim-space-300)' }}>
        <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span className='text-xs text-ink-tertiary'>ศูนย์บริการสาธารณสุขผู้ขอเบิก</span>
          <select value={requestingCenter} onChange={(e) => setRequestingCenter(e.target.value)} style={{ ...inputStyle, minWidth: 'var(--dim-size-2280, 218px)', appearance: 'none' }}>
            {CLINIC_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span className='text-xs text-ink-tertiary'>หน่วยงานที่ส่งคำร้องไป</span>
          <select value={targetUnit} onChange={(e) => setTargetUnit(e.target.value)} style={{ ...inputStyle, minWidth: 'var(--dim-size-2280, 218px)', appearance: 'none' }}>
            {REQUISITION_TARGETS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </label>
        <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span className='text-xs text-ink-tertiary'>ประเภทรายการ</span>
          <select value={itemCategory} onChange={(e) => setItemCategory(e.target.value)} style={{ ...inputStyle, minWidth: 'var(--dim-size-2050, 144px)', appearance: 'none' }}>
            {REQUISITION_ITEM_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </label>
        <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span className='text-xs text-ink-tertiary'>ประเภทการเบิก</span>
          <select value={requisitionType} onChange={(e) => setRequisitionType(e.target.value)} style={{ ...inputStyle, minWidth: 'var(--dim-size-2050, 144px)', appearance: 'none' }}>
            {REQUISITION_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </label>
        <label className='flex flex-col flex-1' style={{ gap: 'var(--dim-space-100, 4px)', minWidth: 'var(--dim-size-2170, 177px)' }}>
          <span className='text-xs text-ink-tertiary'>หมายเหตุ</span>
          <input type='text' value={notes} onChange={(e) => setNotes(e.target.value)} placeholder='(ถ้ามี)' style={inputStyle} />
        </label>
      </div>

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
        {lines.map((line, idx) => {
          const days = estimateDaysUntilNextRequisition(line.drugName);
          const usage = DRUG_REGISTRY.find((d) => d.name === line.drugName)?.usageRate;
          return (
            <div key={idx} className='flex flex-wrap items-end' style={{ gap: 'var(--dim-space-300)' }}>
              <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                <span className='text-xs text-ink-tertiary'>ชื่อยา</span>
                <select value={line.drugName} onChange={(e) => updateLine(idx, { drugName: e.target.value })} style={{ ...inputStyle, minWidth: 'var(--dim-size-2280, 218px)', appearance: 'none' }}>
                  {DRUG_REGISTRY.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </label>
              <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                <span className='text-xs text-ink-tertiary'>ขอเบิกใหม่</span>
                <input type='number' min='1' value={line.quantity} onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) })} style={{ ...inputStyle, width: 'var(--dim-size-1800, 96px)' }} />
              </label>
              <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                <span className='text-xs text-ink-tertiary'>บรรจุ</span>
                <input type='text' value={line.packSize} onChange={(e) => updateLine(idx, { packSize: e.target.value })} placeholder='เช่น ขวดละ 500 เม็ด' style={{ ...inputStyle, minWidth: 'var(--dim-size-2050, 144px)' }} />
              </label>
              <span className='text-xs' style={{ color: 'var(--text-content-tertiary)', paddingBottom: 'var(--dim-space-200)' }}>
                ใช้เฉลี่ย/เดือน: {usage?.avgPerMonth ?? '—'} · เหลือถึงวันเบิกใหม่: {days != null ? `~${days} วัน` : '—'}
              </span>
              {lines.length > 1 && (
                <button
                  type='button' onClick={() => removeLine(idx)} aria-label='ลบรายการ'
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-content-tertiary)', paddingBottom: 'var(--dim-space-200)' }}
                >
                  <Icon name='close' size={18} />
                </button>
              )}
            </div>
          );
        })}
        <NeutralSubdueButton size='sm' variant='outline' leadingIcon='add' onClick={addLine} className='self-start'>
          เพิ่มรายการยา
        </NeutralSubdueButton>
      </div>

      <div className='flex items-center justify-end' style={{ gap: 'var(--dim-space-200)' }}>
        <NeutralSubdueButton size='sm' variant='outline' onClick={onCancel}>ยกเลิก</NeutralSubdueButton>
        <BrandButton size='sm' leadingIcon='send' onClick={handleSubmit}>ส่งคำขอเบิก</BrandButton>
      </div>
    </div>
  );
};

const DRUG_TYPE_OPTIONS = ['GPO', 'GPU', 'TPU'];

const blankReceivingLine = () => ({
  drugName: DRUG_REGISTRY[0]?.name || '', quantity: 500, packSize: '',
  lot: '', expiryDate: '', receivedFrom: 'องค์การเภสัชกรรม (GPO)',
  drugType: 'GPO', costPrice: 1, salePrice: 1.5, claimablePrice: 1.5,
});

/* §1.9.7.2/.4 — document-level header (หน่วยงาน/ประเภทการรับ/เลขที่ใบสั่งซื้อ/
   วันที่ซื้อ/เลขที่ใบส่งของ/วันที่ส่งของ + a mock scan-entry field) plus
   multiple lines, each with its OWN "รับจาก" (manufacturer/supplier) so one
   receiving document can cover several manufacturers at once. */
const NewReceivingForm = ({ onCreate, onCancel }) => {
  const [department, setDepartment] = useState('คลังยาใหญ่ศูนย์ 4 ดินแดง');
  const [receivingType, setReceivingType] = useState('purchase');
  const [poNumber, setPoNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [scanCode, setScanCode] = useState('');
  const [lines, setLines] = useState([blankReceivingLine()]);

  const updateLine = (idx, patch) => setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const addLine = () => setLines((ls) => [...ls, blankReceivingLine()]);
  const removeLine = (idx) => setLines((ls) => ls.filter((_, i) => i !== idx));

  const linesValid = lines.every((l) => l.lot && l.expiryDate);

  const handleSubmit = () => onCreate({
    receivingType, department, poNumber, scanCode,
    purchaseDate: purchaseDate || undefined, deliveryNoteNumber, deliveryDate: deliveryDate || undefined,
    items: lines.map((l) => ({
      ...l,
      unit: DRUG_REGISTRY.find((d) => d.name === l.drugName)?.unit === 'capsule' ? 'แคปซูล' : 'เม็ด',
    })),
  });

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)', padding: 'var(--dim-space-400)', ...PHARMACY_NESTED_PANEL }}>
      <div className='flex flex-wrap items-end' style={{ gap: 'var(--dim-space-300)' }}>
        <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span className='text-xs text-ink-tertiary'>หน่วยงาน</span>
          <input type='text' value={department} onChange={(e) => setDepartment(e.target.value)} style={{ ...inputStyle, minWidth: 'var(--dim-size-2280, 218px)' }} />
        </label>
        <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span className='text-xs text-ink-tertiary'>ประเภทการรับ</span>
          <select value={receivingType} onChange={(e) => setReceivingType(e.target.value)} style={{ ...inputStyle, minWidth: 'var(--dim-size-2050, 144px)', appearance: 'none' }}>
            {RECEIVING_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </label>
        <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span className='text-xs text-ink-tertiary'>เลขที่ใบสั่งซื้อ</span>
          <input type='text' value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder='PO-2026-XXXX' style={{ ...inputStyle, width: 'var(--dim-size-2050, 144px)' }} />
        </label>
        <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span className='text-xs text-ink-tertiary'>วันที่ซื้อ</span>
          <input type='date' value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} style={inputStyle} />
        </label>
        <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span className='text-xs text-ink-tertiary'>เลขที่ใบส่งของ</span>
          <input type='text' value={deliveryNoteNumber} onChange={(e) => setDeliveryNoteNumber(e.target.value)} placeholder='DN-2026-XXXX' style={{ ...inputStyle, width: 'var(--dim-size-2050, 144px)' }} />
        </label>
        <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span className='text-xs text-ink-tertiary'>วันที่ส่งของ</span>
          <input type='date' value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} style={inputStyle} />
        </label>
        <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span className='text-xs text-ink-tertiary'>สแกนเลขที่เอกสาร</span>
          <input type='text' value={scanCode} onChange={(e) => setScanCode(e.target.value)} placeholder='สแกนบาร์โค้ด/พิมพ์เลขที่' style={{ ...inputStyle, minWidth: 'var(--dim-size-2170, 177px)' }} />
        </label>
      </div>

      <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
        {lines.map((line, idx) => (
          <div key={idx} className='flex flex-wrap items-end' style={{ gap: 'var(--dim-space-300)', paddingTop: 'var(--dim-space-200)', borderTop: idx > 0 ? 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)' : 'none' }}>
            <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <span className='text-xs text-ink-tertiary'>ชื่อยา</span>
              <select value={line.drugName} onChange={(e) => updateLine(idx, { drugName: e.target.value })} style={{ ...inputStyle, minWidth: 'var(--dim-size-2200, 192px)', appearance: 'none' }}>
                {DRUG_REGISTRY.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </label>
            <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <span className='text-xs text-ink-tertiary'>GPO/GPU/TPU</span>
              <select value={line.drugType} onChange={(e) => updateLine(idx, { drugType: e.target.value })} style={{ ...inputStyle, width: 'var(--dim-size-1800, 96px)', appearance: 'none' }}>
                {DRUG_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <span className='text-xs text-ink-tertiary'>จำนวน</span>
              <input type='number' min='1' value={line.quantity} onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) })} style={{ ...inputStyle, width: 'var(--dim-size-1800, 96px)' }} />
            </label>
            <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <span className='text-xs text-ink-tertiary'>บรรจุ</span>
              <input type='text' value={line.packSize} onChange={(e) => updateLine(idx, { packSize: e.target.value })} placeholder='เช่น ขวดละ 1000 เม็ด' style={{ ...inputStyle, minWidth: 'var(--dim-size-2050, 144px)' }} />
            </label>
            <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <span className='text-xs text-ink-tertiary'>Lot No.</span>
              <input type='text' value={line.lot} onChange={(e) => updateLine(idx, { lot: e.target.value })} placeholder='LOT-XXX-26' style={{ ...inputStyle, width: 'var(--dim-size-2050, 144px)' }} />
            </label>
            <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <span className='text-xs text-ink-tertiary'>วันหมดอายุ</span>
              <input type='date' value={line.expiryDate} onChange={(e) => updateLine(idx, { expiryDate: e.target.value })} style={inputStyle} />
            </label>
            <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <span className='text-xs text-ink-tertiary'>ราคาทุน/หน่วย</span>
              <input type='number' min='0' step='0.1' value={line.costPrice} onChange={(e) => updateLine(idx, { costPrice: Number(e.target.value) })} style={{ ...inputStyle, width: 'var(--dim-size-1800, 96px)' }} />
            </label>
            <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <span className='text-xs text-ink-tertiary'>ราคาขาย/หน่วย</span>
              <input type='number' min='0' step='0.1' value={line.salePrice} onChange={(e) => updateLine(idx, { salePrice: Number(e.target.value) })} style={{ ...inputStyle, width: 'var(--dim-size-1800, 96px)' }} />
            </label>
            <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <span className='text-xs text-ink-tertiary'>ราคาที่เบิกได้</span>
              <input type='number' min='0' step='0.1' value={line.claimablePrice} onChange={(e) => updateLine(idx, { claimablePrice: Number(e.target.value) })} style={{ ...inputStyle, width: 'var(--dim-size-1800, 96px)' }} />
            </label>
            <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <span className='text-xs text-ink-tertiary'>รับจาก (ผู้ผลิต/ผู้จำหน่าย)</span>
              <input type='text' value={line.receivedFrom} onChange={(e) => updateLine(idx, { receivedFrom: e.target.value })} style={{ ...inputStyle, minWidth: 'var(--dim-size-2170, 177px)' }} />
            </label>
            {lines.length > 1 && (
              <button
                type='button' onClick={() => removeLine(idx)} aria-label='ลบรายการ'
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-content-tertiary)', paddingBottom: 'var(--dim-space-200)' }}
              >
                <Icon name='close' size={18} />
              </button>
            )}
          </div>
        ))}
        <NeutralSubdueButton size='sm' variant='outline' leadingIcon='add' onClick={addLine} className='self-start'>
          เพิ่มรายการยา (ผู้ผลิต/ผู้จำหน่ายรายอื่น)
        </NeutralSubdueButton>
      </div>

      <div className='flex items-center justify-end' style={{ gap: 'var(--dim-space-200)' }}>
        <NeutralSubdueButton size='sm' variant='outline' onClick={onCancel}>ยกเลิก</NeutralSubdueButton>
        <BrandButton size='sm' leadingIcon='inventory' disabled={!linesValid} onClick={handleSubmit}>
          บันทึกรับเข้าคลัง
        </BrandButton>
      </div>
    </div>
  );
};

const REQUISITION_COLUMNS = [
  { key: 'seq', label: 'ลำดับ', width: 60, align: 'center', render: (r) => r.seq ?? '-', print: (r) => r.seq ?? '-' },
  { key: 'requisitionNo', label: 'เลขที่คำขอ', width: 150 },
  { key: 'drugName', label: 'ชื่อยา', flex: true, minWidth: 200 },
  { key: 'itemCategory', label: 'ประเภทรายการ', width: 110, render: (r) => ITEM_CATEGORY_LABEL[r.itemCategory] || '-', print: (r) => ITEM_CATEGORY_LABEL[r.itemCategory] || '-' },
  { key: 'packSize', label: 'บรรจุ', width: 140, render: (r) => r.packSize || '-', print: (r) => r.packSize || '-' },
  { key: 'requisitionType', label: 'ประเภทการเบิก', width: 130, render: (r) => <Badge style={r.requisitionType === 'urgent' ? 'error' : 'neutral'} size='small'>{REQUISITION_TYPE_LABEL[r.requisitionType]}</Badge>, print: (r) => REQUISITION_TYPE_LABEL[r.requisitionType] },
  { key: 'quantity', label: 'ขอเบิกใหม่', width: 110, align: 'center', render: (r) => `${r.quantity} ${r.unit}`, print: (r) => `${r.quantity} ${r.unit}` },
  { key: 'requisitionCount', label: 'เบิกครั้งที่', width: 90, align: 'center', render: (r) => r.requisitionCount ?? '-', print: (r) => r.requisitionCount ?? '-' },
  { key: 'previous', label: 'เบิกครั้งที่แล้ว', width: 160, render: (r) => r.previousRequestQty != null ? `${r.previousRequestQty} ${r.unit} (${formatThaiDate(r.previousRequestAt)})` : '—', print: (r) => r.previousRequestQty != null ? `${r.previousRequestQty} ${r.unit} (${formatThaiDate(r.previousRequestAt)})` : '—' },
  {
    key: 'daysUntilNext', label: 'เหลือถึงวันเบิกใหม่', width: 140, align: 'center',
    render: (r) => { const d = estimateDaysUntilNextRequisition(r.drugName); return d != null ? `~${d} วัน` : '—'; },
    print: (r) => { const d = estimateDaysUntilNextRequisition(r.drugName); return d != null ? `~${d} วัน` : '—'; },
  },
  { key: 'approvedQuantity', label: 'จำนวนอนุมัติ', width: 110, align: 'center', render: (r) => r.approvedQuantity != null ? `${r.approvedQuantity} ${r.unit}` : '—', print: (r) => r.approvedQuantity != null ? `${r.approvedQuantity} ${r.unit}` : '—' },
  {
    key: 'requestedBy', label: 'ผู้ขอเบิก', flex: true, minWidth: 200,
    render: (r) => (
      <div className='flex flex-col min-w-0'>
        <span>{r.requestedBy}</span>
        <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)' }}>{r.requestedByPosition}</span>
      </div>
    ),
    print: (r) => `${r.requestedBy} (${r.requestedByPosition})`,
  },
  { key: 'requestingCenter', label: 'ศูนย์ที่ขอเบิก', flex: true, minWidth: 200, render: (r) => CLINIC_LABEL[r.requestingCenter] || '-', print: (r) => CLINIC_LABEL[r.requestingCenter] || '-' },
  { key: 'targetUnit', label: 'ส่งไปยัง', flex: true, minWidth: 180, render: (r) => REQUISITION_TARGET_LABEL[r.targetUnit] || '-', print: (r) => REQUISITION_TARGET_LABEL[r.targetUnit] || '-' },
  { key: 'notes', label: 'หมายเหตุ', flex: true, minWidth: 160, render: (r) => r.notes || '—', print: (r) => r.notes || '—' },
  { key: 'requestedAt', label: 'วันที่ขอเบิก', width: 130, render: (r) => formatThaiDate(r.requestedAt), print: (r) => formatThaiDate(r.requestedAt) },
  { key: 'status', label: 'สถานะ', width: 130, render: (r) => <Badge style={REQ_STATUS_PILL[r.status].style} size='small'>{REQ_STATUS_PILL[r.status].label}</Badge>, print: (r) => REQ_STATUS_PILL[r.status].label },
];

const RECEIVING_STATUS_PILL = {
  cancelled: { style: 'error', label: 'ยกเลิกแล้ว' },
};

const RECEIVING_COLUMNS = [
  { key: 'seq', label: 'ลำดับ', width: 60, align: 'center', render: (r) => r.seq ?? '-', print: (r) => r.seq ?? '-' },
  { key: 'receiptNo', label: 'เลขที่ใบรับ', width: 150 },
  { key: 'department', label: 'หน่วยงาน', flex: true, minWidth: 180, render: (r) => r.department || '—', print: (r) => r.department || '—' },
  { key: 'drugName', label: 'ชื่อยา', flex: true, minWidth: 200 },
  { key: 'drugType', label: 'แหล่งยา', width: 90, align: 'center' },
  { key: 'packSize', label: 'บรรจุ', width: 140, render: (r) => r.packSize || '-', print: (r) => r.packSize || '-' },
  { key: 'receivingType', label: 'ประเภทการรับ', width: 140, render: (r) => RECEIVING_TYPE_LABEL[r.receivingType], print: (r) => RECEIVING_TYPE_LABEL[r.receivingType] },
  { key: 'quantity', label: 'จำนวน', width: 100, align: 'center', render: (r) => `${r.quantity} ${r.unit}`, print: (r) => `${r.quantity} ${r.unit}` },
  { key: 'lot', label: 'Lot No.', width: 140 },
  { key: 'expiryDate', label: 'วันหมดอายุ', width: 120, render: (r) => formatThaiDate(r.expiryDate), print: (r) => formatThaiDate(r.expiryDate) },
  { key: 'costPrice', label: 'ราคาทุน/หน่วย', width: 110, align: 'center', render: (r) => `฿${r.costPrice}`, print: (r) => `฿${r.costPrice}` },
  { key: 'salePrice', label: 'ราคาขาย/หน่วย', width: 110, align: 'center', render: (r) => `฿${r.salePrice}`, print: (r) => `฿${r.salePrice}` },
  { key: 'claimablePrice', label: 'ราคาที่เบิกได้', width: 110, align: 'center', render: (r) => r.claimablePrice != null ? `฿${r.claimablePrice}` : '—', print: (r) => r.claimablePrice != null ? `฿${r.claimablePrice}` : '—' },
  { key: 'poNumber', label: 'เลขที่ใบสั่งซื้อ', width: 150, render: (r) => r.poNumber || '—', print: (r) => r.poNumber || '—' },
  { key: 'deliveryNoteNumber', label: 'เลขที่ใบส่งของ', width: 150, render: (r) => r.deliveryNoteNumber || '—', print: (r) => r.deliveryNoteNumber || '—' },
  { key: 'receivedFrom', label: 'รับจาก', flex: true, minWidth: 180 },
  { key: 'receivedAt', label: 'วันที่รับเข้า', width: 130, render: (r) => formatThaiDate(r.receivedAt), print: (r) => formatThaiDate(r.receivedAt) },
  { key: 'status', label: 'สถานะ', width: 120, render: (r) => r.status === 'cancelled' ? <Badge style='error' size='small'>{RECEIVING_STATUS_PILL.cancelled.label}</Badge> : <Badge style='success' size='small'>รับเข้าแล้ว</Badge>, print: (r) => r.status === 'cancelled' ? RECEIVING_STATUS_PILL.cancelled.label : 'รับเข้าแล้ว' },
];

const PharmacyRequisitionPage = () => {
  const [activeTab, setActiveTab] = useState('requisition');
  const [showForm, setShowForm] = useState(false);
  const [renderTick, forceRender] = useState(0);
  const bump = () => forceRender((n) => n + 1);

  /* §1.9.6.1 — edit/cancel/approve an existing requisition line. Edit is
     a lightweight inline quantity override (double-click-to-edit style
     already used elsewhere in this module) rather than reopening the
     whole multi-line form. */
  const [editingReqId, setEditingReqId] = useState(null);
  const [editQuantity, setEditQuantity] = useState('');
  const startEditReq = (r) => { setEditingReqId(r.id); setEditQuantity(String(r.quantity)); };
  const saveEditReq = () => {
    updateRequisition(editingReqId, { quantity: Number(editQuantity) || 0 });
    setEditingReqId(null);
    bump();
  };

  const REQUISITION_ACTIONS_COLUMN = {
    key: 'itemActions', label: 'ดำเนินการ', width: 150, align: 'center', sortable: false,
    render: (r) => {
      if (editingReqId === r.id) {
        return (
          <div className='flex items-center justify-center' style={{ gap: 'var(--dim-space-100)' }}>
            <input
              type='number' min='1' value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)}
              style={{ ...inputStyle, width: 'var(--dim-size-1800, 96px)' }}
            />
            <button type='button' aria-label='บันทึก' onClick={saveEditReq} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-brandPrimary-default)' }}>
              <Icon name='check' size={16} />
            </button>
            <button type='button' aria-label='ยกเลิกการแก้ไข' onClick={() => setEditingReqId(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-content-tertiary)' }}>
              <Icon name='close' size={16} />
            </button>
          </div>
        );
      }
      const locked = r.status === 'cancelled' || r.status === 'fulfilled';
      return (
        <div className='flex items-center justify-center' style={{ gap: 'var(--dim-space-150)' }}>
          {r.status === 'pending' && (
            <button
              type='button' aria-label={`อนุมัติ ${r.drugName}`}
              onClick={() => { approveRequisition(r.id, r.quantity); bump(); }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-alert-success, #1B8E5A)' }}
            >
              <Icon name='task_alt' size={16} />
            </button>
          )}
          <button
            type='button' aria-label={`แก้ไข ${r.drugName}`} disabled={locked}
            onClick={() => startEditReq(r)}
            style={{ background: 'transparent', border: 'none', cursor: locked ? 'not-allowed' : 'pointer', color: 'var(--text-brandPrimary-default)', opacity: locked ? 0.4 : 1 }}
          >
            <Icon name='edit' size={16} />
          </button>
          <button
            type='button' aria-label={`ยกเลิก ${r.drugName}`} disabled={locked}
            onClick={() => { cancelRequisition(r.id, 'ยกเลิกโดยเภสัชกร'); bump(); }}
            style={{ background: 'transparent', border: 'none', cursor: locked ? 'not-allowed' : 'pointer', color: 'var(--text-content-tertiary)', opacity: locked ? 0.4 : 1 }}
          >
            <Icon name='close' size={16} />
          </button>
        </div>
      );
    },
  };

  /* §1.9.7.1 — edit/cancel an existing receiving line, mirroring the
     requisition actions above. */
  const [editingRcvId, setEditingRcvId] = useState(null);
  const [editRcvQuantity, setEditRcvQuantity] = useState('');
  const startEditRcv = (r) => { setEditingRcvId(r.id); setEditRcvQuantity(String(r.quantity)); };
  const saveEditRcv = () => {
    updateReceivingRecord(editingRcvId, { quantity: Number(editRcvQuantity) || 0 });
    setEditingRcvId(null);
    bump();
  };

  const RECEIVING_ACTIONS_COLUMN = {
    key: 'itemActions', label: 'ดำเนินการ', width: 120, align: 'center', sortable: false,
    render: (r) => {
      if (editingRcvId === r.id) {
        return (
          <div className='flex items-center justify-center' style={{ gap: 'var(--dim-space-100)' }}>
            <input
              type='number' min='1' value={editRcvQuantity} onChange={(e) => setEditRcvQuantity(e.target.value)}
              style={{ ...inputStyle, width: 'var(--dim-size-1800, 96px)' }}
            />
            <button type='button' aria-label='บันทึก' onClick={saveEditRcv} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-brandPrimary-default)' }}>
              <Icon name='check' size={16} />
            </button>
            <button type='button' aria-label='ยกเลิกการแก้ไข' onClick={() => setEditingRcvId(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-content-tertiary)' }}>
              <Icon name='close' size={16} />
            </button>
          </div>
        );
      }
      const locked = r.status === 'cancelled';
      return (
        <div className='flex items-center justify-center' style={{ gap: 'var(--dim-space-150)' }}>
          <button
            type='button' aria-label={`แก้ไข ${r.drugName}`} disabled={locked}
            onClick={() => startEditRcv(r)}
            style={{ background: 'transparent', border: 'none', cursor: locked ? 'not-allowed' : 'pointer', color: 'var(--text-brandPrimary-default)', opacity: locked ? 0.4 : 1 }}
          >
            <Icon name='edit' size={16} />
          </button>
          <button
            type='button' aria-label={`ยกเลิก ${r.drugName}`} disabled={locked}
            onClick={() => { cancelReceivingRecord(r.id, 'ยกเลิกโดยเภสัชกร'); bump(); }}
            style={{ background: 'transparent', border: 'none', cursor: locked ? 'not-allowed' : 'pointer', color: 'var(--text-content-tertiary)', opacity: locked ? 0.4 : 1 }}
          >
            <Icon name='close' size={16} />
          </button>
        </div>
      );
    },
  };

  const summaryCards = useMemo(
    () => buildRequisitionSummaryCards(REQUISITIONS, RECEIVING_RECORDS),
    [renderTick],
  );

  const tabCounts = useMemo(
    () => ({ requisition: REQUISITIONS.length, receiving: RECEIVING_RECORDS.length }),
    [renderTick],
  );

  const handleTabChange = (key) => {
    setActiveTab(key);
    setShowForm(false);
  };

  return (
    <>
      <PharmacyRequisitionPrint
        title={activeTab === 'requisition' ? 'ใบเบิกยา/เวชภัณฑ์' : 'ใบรับยา/เวชภัณฑ์เข้าคลังใหญ่'}
        columns={activeTab === 'requisition' ? REQUISITION_COLUMNS : RECEIVING_COLUMNS}
        rows={activeTab === 'requisition' ? REQUISITIONS : RECEIVING_RECORDS}
      />
      <div className='mih-requisition-no-print'>
      <QueuePageShell
        activeKey='pharmacy'
        breadcrumb={breadcrumb}
        title='เบิกจ่ายยา/เวชภัณฑ์ และรับเข้าคลังใหญ่'
        summaryCards={summaryCards}
        actions={<PharmacyAddDrugButton />}
        belowSummary={<PharmacySubNav />}
      >
        <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-600)' }}>
          <div
            className='w-full flex flex-col'
            style={PHARMACY_WORKLIST_CARD_BODY}
          >
            <TabBar aria-label='เลือกประเภทรายการ' align='center' className='self-center shrink-0 max-w-full'>
              {TABS.map((t) => (
                <TabPill
                  key={t.key}
                  size='large'
                  selected={activeTab === t.key}
                  leadingIcon={t.icon}
                  onClick={() => handleTabChange(t.key)}
                >
                  {t.label}
                  <span
                    className='tabular-nums'
                    style={{ marginLeft: 'var(--dim-space-200)', fontWeight: 'var(--type-weight-bold)' }}
                  >
                    {tabCounts[t.key]}
                  </span>
                </TabPill>
              ))}
            </TabBar>

            <div className='flex items-center justify-between'>
              <h2 style={{ margin: 0, fontFamily: 'var(--type-family-heading-content)', fontWeight: 'var(--type-weight-bold)', fontSize: 'var(--type-size-base)', color: 'var(--text-content-default)' }}>
                {activeTab === 'requisition' ? 'รายการเบิกจ่ายยา/เวชภัณฑ์' : 'รายการรับยาเข้าคลังใหญ่'}
              </h2>
              <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                <NeutralSubdueButton size='sm' variant='outline' leadingIcon='print' onClick={() => window.print()}>
                  {activeTab === 'requisition' ? 'พิมพ์ใบเบิกยา' : 'พิมพ์ใบรับยา'}
                </NeutralSubdueButton>
                {!showForm && (
                  <BrandButton size='sm' leadingIcon='add' onClick={() => setShowForm(true)}>
                    {activeTab === 'requisition' ? 'สร้างคำขอเบิก' : 'บันทึกรับเข้าคลัง'}
                  </BrandButton>
                )}
              </div>
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
              <Table columns={[...REQUISITION_COLUMNS, REQUISITION_ACTIONS_COLUMN]} rows={REQUISITIONS} rowKey={(r) => r.id} emptyMessage='ไม่มีคำขอเบิกจ่าย' />
            ) : (
              <Table columns={[...RECEIVING_COLUMNS, RECEIVING_ACTIONS_COLUMN]} rows={RECEIVING_RECORDS} rowKey={(r) => r.id} emptyMessage='ไม่มีรายการรับเข้าคลัง' />
            )}
          </div>
        </div>
      </QueuePageShell>
      </div>
    </>
  );
};

export default PharmacyRequisitionPage;
