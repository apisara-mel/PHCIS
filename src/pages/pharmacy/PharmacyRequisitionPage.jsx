import React, { useMemo, useRef, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import Badge from '@/components/badge/Badge';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import Icon from '@/components/icons/Icon';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import {
  REQUISITIONS, RECEIVING_RECORDS, REQUISITION_TYPES, RECEIVING_TYPES,
  REQUISITION_ITEM_CATEGORIES, REQUISITION_TARGETS,
  createRequisition, createReceivingRecord,
  updateRequisition, cancelRequisition,
  updateReceivingRecord, deleteReceivingRecord,
  estimateDaysUntilNextRequisition,
} from '@/data/pharmacyQueue';
import { DRUG_REGISTRY, UNIT_TYPES, getRegistryDrug } from '@/data/pharmacyRegistry';
import { resolveMedicationImage } from '@/data/medicationCatalog';
import { CLINIC_OPTIONS, DEFAULT_CLINIC_VALUE } from '@/components/layout/HeaderClinicContext';
import PharmacySubNav, { PharmacyHeaderActions } from '@/components/pharmacy/PharmacySubNav';
import PharmacySectionTopic from '@/components/pharmacy/PharmacySectionTopic';
import TabPill, { TabBar } from '@/components/tab/TabPill';
import PharmacyRequisitionPrint from '@/components/pharmacy/PharmacyRequisitionPrint';
import PharmacyReceivingScanPopup from '@/components/pharmacy/PharmacyReceivingScanPopup';
import Alert from '@/components/alert/Alert';
import AlertDialog from '@/components/popup/AlertDialog';
import Popup from '@/components/popup/Popup';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import { resolveReceivingScan } from '@/data/pharmacyReceivingScan';
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

const REQ_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  ...Object.entries(REQ_STATUS_PILL).map(([value, { label }]) => ({ value, label })),
];

const REQ_TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  ...REQUISITION_TYPES.map((t) => ({ value: t.key, label: t.label })),
];

const REQ_CATEGORY_FILTER_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  ...REQUISITION_ITEM_CATEGORIES.map((c) => ({ value: c.key, label: c.label })),
];

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

const registryUnitLabel = (unitKey) => UNIT_TYPES.find((u) => u.key === unitKey)?.label || unitKey || '—';

/* §1.9.6.9 บรรจุ → หน่วยนับ + จำนวน (นับต่อหน่วยบรรจุ). */
const resolvePackCount = (row) => {
  if (typeof row.packSize === 'number' && row.packSize > 0) return row.packSize;
  const fromRow = String(row.packSize || '').match(/(\d+)/);
  if (fromRow) return Number(fromRow[1]);
  const reg = getRegistryDrug(row.drugName);
  if (reg?.packSize != null && Number(reg.packSize) > 0) return Number(reg.packSize);
  return null;
};

const resolveUnitLabel = (row) => {
  if (row.unit) return row.unit;
  const reg = getRegistryDrug(row.drugName);
  return registryUnitLabel(reg?.unit);
};

const lineFromDrugName = (drugName, quantity = 100) => {
  const drug = getRegistryDrug(drugName) || DRUG_REGISTRY[0];
  return {
    drugName: drug?.name || '',
    quantity,
    packQty: drug?.packSize > 0 ? Number(drug.packSize) : '',
    unitKey: drug?.unit || 'tablet',
  };
};

const drugImageSrc = (name) => {
  const reg = getRegistryDrug(name);
  return reg?.image || resolveMedicationImage(name, null) || '';
};

/* Sticky name cell — thumbnail + label (same contract as คลังยา / ทะเบียนยา). */
const RequisitionDrugNameCell = ({ name }) => {
  const src = drugImageSrc(name);
  return (
    <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
      <div
        className='shrink-0 rounded-full overflow-hidden'
        style={{
          width: 'var(--dim-size-900, 36px)',
          height: 'var(--dim-size-900, 36px)',
          background: 'var(--surface-card-quaternary)',
        }}
      >
        {src ? <img src={src} alt='' className='w-full h-full object-cover' /> : null}
      </div>
      <span className='truncate min-w-0' style={{ fontWeight: 'var(--type-weight-medium, 500)' }}>
        {name}
      </span>
    </div>
  );
};

const inputStyle = {
  padding: 'var(--dim-space-150) var(--dim-space-300)',
  background: 'var(--surface-input-default)',
  border: 'var(--dim-stroke-100) solid var(--border-input-default)',
  borderRadius: 'var(--dim-radius-200)',
  fontSize: 'var(--type-size-sm)',
};

const blankRequisitionLine = () => lineFromDrugName(DRUG_REGISTRY[0]?.name || '', 100);

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

  const updateLine = (idx, patch) => setLines((ls) => ls.map((l, i) => {
    if (i !== idx) return l;
    if (patch.drugName != null && patch.drugName !== l.drugName) {
      return lineFromDrugName(patch.drugName, l.quantity);
    }
    return { ...l, ...patch };
  }));
  const addLine = () => setLines((ls) => [...ls, blankRequisitionLine()]);
  const removeLine = (idx) => setLines((ls) => ls.filter((_, i) => i !== idx));

  const handleSubmit = () => onCreate({
    items: lines.map((l) => ({
      drugName: l.drugName,
      quantity: l.quantity,
      packSize: l.packQty !== '' && l.packQty != null ? String(l.packQty) : '',
      unit: registryUnitLabel(l.unitKey || getRegistryDrug(l.drugName)?.unit),
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
                <span className='text-xs text-ink-tertiary'>จำนวนที่ขอเบิก</span>
                <input
                  type='number'
                  min='1'
                  value={line.packQty}
                  onChange={(e) => updateLine(idx, { packQty: e.target.value === '' ? '' : Number(e.target.value) })}
                  placeholder='เช่น 500'
                  style={{ ...inputStyle, width: 'var(--dim-size-1800, 96px)' }}
                />
              </label>
              <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                <span className='text-xs text-ink-tertiary'>หน่วยนับ</span>
                <input
                  type='text'
                  readOnly
                  value={registryUnitLabel(line.unitKey)}
                  style={{ ...inputStyle, width: 'var(--dim-size-1800, 96px)', color: 'var(--text-content-secondary)' }}
                />
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
   วันที่ซื้อ/เลขที่ใบส่งของ/วันที่ส่งของ) + barcode/camera scan that fills
   header fields or appends a drug line — plus multiple lines, each with its
   OWN "รับจาก" (manufacturer/supplier) so one receiving document can cover
   several manufacturers at once. */
const NewReceivingForm = ({ onCreate, onCancel }) => {
  const [department, setDepartment] = useState('คลังยาใหญ่ศูนย์ 4 ดินแดง');
  const [receivingType, setReceivingType] = useState('purchase');
  const [poNumber, setPoNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [scanCode, setScanCode] = useState('');
  const [scanHint, setScanHint] = useState(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [lines, setLines] = useState([blankReceivingLine()]);
  const scanInputRef = useRef(null);

  const updateLine = (idx, patch) => setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const addLine = () => setLines((ls) => [...ls, blankReceivingLine()]);
  const removeLine = (idx) => setLines((ls) => ls.filter((_, i) => i !== idx));

  const applyScan = (raw) => {
    const result = resolveReceivingScan(raw);
    setScanCode(result.code || String(raw || '').trim());
    if (result.type === 'document') {
      const f = result.fields || {};
      if (f.department != null) setDepartment(f.department);
      if (f.receivingType != null) setReceivingType(f.receivingType);
      if (f.poNumber != null) setPoNumber(f.poNumber);
      if (f.purchaseDate != null) setPurchaseDate(f.purchaseDate);
      if (f.deliveryNoteNumber != null) setDeliveryNoteNumber(f.deliveryNoteNumber);
      if (f.deliveryDate != null) setDeliveryDate(f.deliveryDate);
      setScanHint({ type: 'success', text: `ดึงข้อมูลเอกสารแล้ว: ${result.label}` });
    } else if (result.type === 'drug' && result.line) {
      setLines((ls) => {
        const emptyOnly = ls.length === 1 && !ls[0].lot && !ls[0].expiryDate
          && ls[0].drugName === (DRUG_REGISTRY[0]?.name || '');
        return emptyOnly ? [result.line] : [...ls, result.line];
      });
      setScanHint({ type: 'success', text: `เพิ่มรายการยาจากบาร์โค้ด: ${result.label}` });
    } else {
      setScanHint({ type: 'error', text: `ไม่พบบาร์โค้ด "${result.code}" ในทะเบียนยาหรือใบเอกสารตัวอย่าง` });
    }
    requestAnimationFrame(() => scanInputRef.current?.focus?.());
  };

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
          <span className='text-xs text-ink-tertiary'>เลขที่ใบรับ</span>
          <input type='text' value='ออกอัตโนมัติเมื่อบันทึก' readOnly disabled style={{ ...inputStyle, width: 'var(--dim-size-2200, 192px)', opacity: 0.7 }} />
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
      </div>

      <div className='flex flex-wrap items-end' style={{ gap: 'var(--dim-space-200)' }}>
        <label className='flex flex-col flex-1' style={{ gap: 'var(--dim-space-100, 4px)', minWidth: 'var(--dim-size-2400, 240px)' }}>
          <span className='text-xs text-ink-tertiary'>สแกนบาร์โค้ด / เลขที่เอกสาร</span>
          <input
            ref={scanInputRef}
            type='text'
            value={scanCode}
            onChange={(e) => { setScanCode(e.target.value); setScanHint(null); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyScan(scanCode);
              }
            }}
            placeholder='สแกนหรือพิมพ์บาร์โค้ดยา / PO-… / DN-… แล้วกด Enter'
            style={{ ...inputStyle, width: '100%' }}
          />
        </label>
        <BrandButton size='sm' leadingIcon='barcode_scanner' onClick={() => applyScan(scanCode)}>
          ใช้รหัสนี้
        </BrandButton>
        <BrandButton size='sm' variant='outline' leadingIcon='photo_camera' onClick={() => setScanOpen(true)}>
          เปิดกล้องสแกน
        </BrandButton>
      </div>

      {scanHint && (
        <Alert
          type={scanHint.type === 'error' ? 'destructive' : 'success'}
          iconName={scanHint.type === 'error' ? 'search_off' : 'check_circle'}
          iconFill={1}
          title={scanHint.text}
          showSubtext={false}
          showBadge={false}
          showIndicator={false}
          showDetail={false}
          onClose={() => setScanHint(null)}
        />
      )}

      <PharmacyReceivingScanPopup
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={applyScan}
      />

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
  /* Sticky trio — no flex on these; flex sticky cols drift vs stickyLeft and overlap. */
  { key: 'seq', label: 'ลำดับ', align: 'center', render: (r) => r.seq ?? '-', print: (r) => r.seq ?? '-' },
  { key: 'requisitionNo', label: 'เลขที่คำขอ' },
  {
    key: 'drugName',
    label: 'ชื่อยา',
    minWidth: 220,
    render: (r) => <RequisitionDrugNameCell name={r.drugName} />,
    print: (r) => r.drugName,
  },
  { key: 'itemCategory', label: 'ประเภทรายการ', render: (r) => ITEM_CATEGORY_LABEL[r.itemCategory] || '-', print: (r) => ITEM_CATEGORY_LABEL[r.itemCategory] || '-' },
  /* §1.9.6.9 บรรจุ — จำนวนที่ขอเบิก + หน่วยนับ */
  { key: 'packSize', label: 'จำนวนที่ขอเบิก', align: 'center', render: (r) => { const n = resolvePackCount(r); return n != null ? n.toLocaleString() : '—'; }, print: (r) => { const n = resolvePackCount(r); return n != null ? String(n) : '—'; } },
  { key: 'unit', label: 'หน่วยนับ', align: 'center', render: (r) => resolveUnitLabel(r), print: (r) => resolveUnitLabel(r) },
  { key: 'requisitionType', label: 'ประเภทการเบิก', render: (r) => <Badge style={r.requisitionType === 'urgent' ? 'error' : 'neutral'} size='small'>{REQUISITION_TYPE_LABEL[r.requisitionType]}</Badge>, print: (r) => REQUISITION_TYPE_LABEL[r.requisitionType] },
  { key: 'requisitionCount', label: 'เบิกครั้งที่', align: 'center', render: (r) => r.requisitionCount ?? '-', print: (r) => r.requisitionCount ?? '-' },
  { key: 'previous', label: 'เบิกครั้งที่แล้ว', render: (r) => r.previousRequestQty != null ? `${r.previousRequestQty} ${r.unit} (${formatThaiDate(r.previousRequestAt)})` : '—', print: (r) => r.previousRequestQty != null ? `${r.previousRequestQty} ${r.unit} (${formatThaiDate(r.previousRequestAt)})` : '—' },
  {
    key: 'daysUntilNext', label: 'เหลือถึงวันเบิกใหม่', align: 'center',
    render: (r) => { const d = estimateDaysUntilNextRequisition(r.drugName); return d != null ? `~${d} วัน` : '—'; },
    print: (r) => { const d = estimateDaysUntilNextRequisition(r.drugName); return d != null ? `~${d} วัน` : '—'; },
  },
  { key: 'approvedQuantity', label: 'จำนวนอนุมัติ', align: 'center', render: (r) => r.approvedQuantity != null ? `${r.approvedQuantity} ${r.unit}` : '—', print: (r) => r.approvedQuantity != null ? `${r.approvedQuantity} ${r.unit}` : '—' },
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
  { key: 'requestedAt', label: 'วันที่ขอเบิก', render: (r) => formatThaiDate(r.requestedAt), print: (r) => formatThaiDate(r.requestedAt) },
  { key: 'status', label: 'สถานะ', render: (r) => <Badge style={REQ_STATUS_PILL[r.status].style} size='small'>{REQ_STATUS_PILL[r.status].label}</Badge>, print: (r) => REQ_STATUS_PILL[r.status].label },
];

const RECEIVING_STATUS_PILL = {
  cancelled: { style: 'error', label: 'ยกเลิกแล้ว' },
};

const RECEIVING_COLUMNS = [
  { key: 'seq', label: 'ลำดับ', align: 'center', render: (r) => r.seq ?? '-', print: (r) => r.seq ?? '-' },
  { key: 'receiptNo', label: 'เลขที่ใบรับ' },
  { key: 'department', label: 'หน่วยงาน', flex: true, minWidth: 180, render: (r) => r.department || '—', print: (r) => r.department || '—' },
  { key: 'drugName', label: 'ชื่อยา', flex: true, minWidth: 200 },
  { key: 'drugType', label: 'แหล่งยา', align: 'center' },
  { key: 'packSize', label: 'บรรจุ', render: (r) => r.packSize || '-', print: (r) => r.packSize || '-' },
  { key: 'receivingType', label: 'ประเภทการรับ', render: (r) => RECEIVING_TYPE_LABEL[r.receivingType], print: (r) => RECEIVING_TYPE_LABEL[r.receivingType] },
  { key: 'quantity', label: 'จำนวน', align: 'center', render: (r) => `${r.quantity} ${r.unit}`, print: (r) => `${r.quantity} ${r.unit}` },
  { key: 'lot', label: 'Lot No.' },
  { key: 'expiryDate', label: 'วันหมดอายุ', render: (r) => formatThaiDate(r.expiryDate), print: (r) => formatThaiDate(r.expiryDate) },
  { key: 'costPrice', label: 'ราคาทุน/หน่วย', align: 'center', render: (r) => `฿${r.costPrice}`, print: (r) => `฿${r.costPrice}` },
  { key: 'salePrice', label: 'ราคาขาย/หน่วย', align: 'center', render: (r) => `฿${r.salePrice}`, print: (r) => `฿${r.salePrice}` },
  { key: 'claimablePrice', label: 'ราคาที่เบิกได้', align: 'center', render: (r) => r.claimablePrice != null ? `฿${r.claimablePrice}` : '—', print: (r) => r.claimablePrice != null ? `฿${r.claimablePrice}` : '—' },
  { key: 'poNumber', label: 'เลขที่ใบสั่งซื้อ', render: (r) => r.poNumber || '—', print: (r) => r.poNumber || '—' },
  { key: 'deliveryNoteNumber', label: 'เลขที่ใบส่งของ', render: (r) => r.deliveryNoteNumber || '—', print: (r) => r.deliveryNoteNumber || '—' },
  { key: 'receivedFrom', label: 'รับจาก', flex: true, minWidth: 180 },
  { key: 'receivedAt', label: 'วันที่รับเข้า', render: (r) => formatThaiDate(r.receivedAt), print: (r) => formatThaiDate(r.receivedAt) },
  { key: 'status', label: 'สถานะ', render: (r) => r.status === 'cancelled' ? <Badge style='error' size='small'>{RECEIVING_STATUS_PILL.cancelled.label}</Badge> : <Badge style='success' size='small'>รับเข้าแล้ว</Badge>, print: (r) => r.status === 'cancelled' ? RECEIVING_STATUS_PILL.cancelled.label : 'รับเข้าแล้ว' },
];

const PharmacyRequisitionPage = () => {
  const [activeTab, setActiveTab] = useState('requisition');
  const [showForm, setShowForm] = useState(false);
  const [renderTick, forceRender] = useState(0);
  const bump = () => forceRender((n) => n + 1);

  /* §1.9.6 list filters — search + FilterDropdown chips (สถานะ / ประเภทเบิก / ประเภทรายการ). */
  const [searchQ, setSearchQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const requisitionFiltersActive = searchQ.trim() !== ''
    || statusFilter !== 'all'
    || typeFilter !== 'all'
    || categoryFilter !== 'all';

  const clearRequisitionFilters = () => {
    setSearchQ('');
    setStatusFilter('all');
    setTypeFilter('all');
    setCategoryFilter('all');
  };

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const handleSort = (key) => {
    setSortConfig((prev) => (
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    ));
  };

  const filteredRequisitions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return REQUISITIONS.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (typeFilter !== 'all' && r.requisitionType !== typeFilter) return false;
      if (categoryFilter !== 'all' && r.itemCategory !== categoryFilter) return false;
      if (!q) return true;
      return (
        (r.drugName || '').toLowerCase().includes(q)
        || (r.requisitionNo || '').toLowerCase().includes(q)
        || (r.requestedBy || '').toLowerCase().includes(q)
        || (r.notes || '').toLowerCase().includes(q)
      );
    });
  }, [renderTick, searchQ, statusFilter, typeFilter, categoryFilter]);

  /* Column-header sort — same pattern as PharmacyQueuePage / OPD worklist. */
  const sortedRequisitions = useMemo(() => {
    if (!sortConfig.key) return filteredRequisitions;
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    const normalize = (row, key) => {
      switch (key) {
        case 'itemCategory': return ITEM_CATEGORY_LABEL[row.itemCategory] || '';
        case 'packSize': return resolvePackCount(row) ?? -1;
        case 'unit': return resolveUnitLabel(row) || '';
        case 'requisitionType': return REQUISITION_TYPE_LABEL[row.requisitionType] || '';
        case 'previous': return row.previousRequestQty ?? -1;
        case 'daysUntilNext': return estimateDaysUntilNextRequisition(row.drugName) ?? Number.POSITIVE_INFINITY;
        case 'approvedQuantity': return row.approvedQuantity ?? -1;
        case 'requestedBy': return row.requestedBy || '';
        case 'requestingCenter': return CLINIC_LABEL[row.requestingCenter] || '';
        case 'targetUnit': return REQUISITION_TARGET_LABEL[row.targetUnit] || '';
        case 'status': return REQ_STATUS_PILL[row.status]?.label || '';
        case 'requestedAt':
        case 'previousRequestAt': return row[key] || '';
        case 'seq':
        case 'quantity':
        case 'requisitionCount': return typeof row[key] === 'number' ? row[key] : Number(row[key]) || 0;
        default: return row[key] ?? '';
      }
    };
    const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
    return [...filteredRequisitions].sort((a, b) => {
      const av = normalize(a, sortConfig.key);
      const bv = normalize(b, sortConfig.key);
      const primary = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : collator.compare(String(av), String(bv));
      return sign * primary;
    });
  }, [filteredRequisitions, sortConfig]);

  /* §1.9.6.1 — edit opens Popup; saving resets status → รอดำเนินการ.
     Cancel allowed while pending or approved (ยังไม่เบิกจ่าย). */
  const [editingReq, setEditingReq] = useState(null);
  const [editForm, setEditForm] = useState(null);
  /* Destructive confirm — { kind: 'cancel-req' | 'delete-rcv', row } */
  const [pendingDestructive, setPendingDestructive] = useState(null);

  const startEditReq = (r) => {
    const reg = getRegistryDrug(r.drugName);
    setEditingReq(r);
    setEditForm({
      drugName: r.drugName,
      quantity: String(r.quantity ?? ''),
      packQty: (() => { const n = resolvePackCount(r); return n != null ? String(n) : ''; })(),
      unitKey: reg?.unit || 'tablet',
      requisitionType: r.requisitionType || 'regular',
      itemCategory: r.itemCategory || 'drug',
      requestingCenter: r.requestingCenter || DEFAULT_CLINIC_VALUE,
      targetUnit: r.targetUnit || REQUISITION_TARGETS[0].key,
      notes: r.notes || '',
    });
  };

  const closeEditReq = () => {
    setEditingReq(null);
    setEditForm(null);
  };

  const saveEditReq = () => {
    if (!editingReq || !editForm) return;
    const packQty = editForm.packQty === '' ? '' : String(Number(editForm.packQty) || '');
    updateRequisition(editingReq.id, {
      drugName: editForm.drugName,
      quantity: Number(editForm.quantity) || 0,
      packSize: packQty,
      unit: registryUnitLabel(editForm.unitKey || getRegistryDrug(editForm.drugName)?.unit),
      requisitionType: editForm.requisitionType,
      itemCategory: editForm.itemCategory,
      requestingCenter: editForm.requestingCenter,
      targetUnit: editForm.targetUnit,
      notes: editForm.notes,
      /* แก้ไขแล้วกลับไปรออนุมัติใหม่ */
      status: 'pending',
      approvedQuantity: null,
    });
    closeEditReq();
    bump();
  };

  const patchEditForm = (patch) => {
    setEditForm((prev) => {
      if (!prev) return prev;
      if (patch.drugName != null && patch.drugName !== prev.drugName) {
        const next = lineFromDrugName(patch.drugName, Number(prev.quantity) || 100);
        return {
          ...prev,
          drugName: next.drugName,
          packQty: next.packQty === '' ? '' : String(next.packQty),
          unitKey: next.unitKey,
        };
      }
      return { ...prev, ...patch };
    });
  };

  const handleConfirmDestructive = () => {
    if (!pendingDestructive?.row) return;
    const { kind, row } = pendingDestructive;
    if (kind === 'cancel-req') cancelRequisition(row.id, 'ยกเลิกโดยเภสัชกร');
    if (kind === 'delete-rcv') deleteReceivingRecord(row.id);
    setPendingDestructive(null);
    bump();
  };

  const REQUISITION_ACTIONS_COLUMN = {
    key: 'itemActions', label: 'ดำเนินการ', align: 'center', sortable: false,
    render: (r) => {
      /* รอดำเนินการ / อนุมัติแล้ว → แก้ไข+ยกเลิกได้; เบิกจ่ายแล้ว / ยกเลิกแล้ว → ล็อก */
      const canMutate = r.status === 'pending' || r.status === 'approved';
      return (
        <div className='flex items-center justify-center' style={{ gap: 'var(--dim-space-200)' }}>
          <NeutralSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='edit'
            disabled={!canMutate}
            aria-label={`แก้ไข ${r.drugName}`}
            onClick={() => startEditReq(r)}
          >
            แก้ไข
          </NeutralSubdueButton>
          <NeutralSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='block'
            disabled={!canMutate}
            aria-label={`ยกเลิก ${r.drugName}`}
            onClick={() => setPendingDestructive({ kind: 'cancel-req', row: r })}
          >
            ยกเลิก
          </NeutralSubdueButton>
        </div>
      );
    },
  };

  /* §1.9.7.1 — edit / delete an existing receiving line. */
  const [editingRcvId, setEditingRcvId] = useState(null);
  const [editRcvQuantity, setEditRcvQuantity] = useState('');
  const startEditRcv = (r) => { setEditingRcvId(r.id); setEditRcvQuantity(String(r.quantity)); };
  const saveEditRcv = () => {
    updateReceivingRecord(editingRcvId, { quantity: Number(editRcvQuantity) || 0 });
    setEditingRcvId(null);
    bump();
  };

  const RECEIVING_ACTIONS_COLUMN = {
    key: 'itemActions', label: 'ดำเนินการ', align: 'center', sortable: false,
    render: (r) => {
      if (editingRcvId === r.id) {
        return (
          <div className='flex items-center justify-center' style={{ gap: 'var(--dim-space-200)' }}>
            <input
              type='number' min='1' value={editRcvQuantity} onChange={(e) => setEditRcvQuantity(e.target.value)}
              style={{ ...inputStyle, width: 'var(--dim-size-1800, 96px)' }}
            />
            <NeutralSubdueButton variant='outline' size='sm' leadingIcon='check' onClick={saveEditRcv}>
              บันทึก
            </NeutralSubdueButton>
            <NeutralSubdueButton variant='outline' size='sm' leadingIcon='close' onClick={() => setEditingRcvId(null)}>
              ยกเลิก
            </NeutralSubdueButton>
          </div>
        );
      }
      const locked = r.status === 'cancelled';
      return (
        <div className='flex items-center justify-center' style={{ gap: 'var(--dim-space-200)' }}>
          <NeutralSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='edit'
            disabled={locked}
            aria-label={`แก้ไข ${r.drugName}`}
            onClick={() => startEditRcv(r)}
          >
            แก้ไข
          </NeutralSubdueButton>
          <NeutralSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='delete'
            disabled={locked}
            aria-label={`ลบ ${r.drugName}`}
            onClick={() => setPendingDestructive({ kind: 'delete-rcv', row: r })}
          >
            ลบ
          </NeutralSubdueButton>
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
        title='ระบบงานเภสัชกรรม'
        summaryCards={summaryCards}
        actions={<PharmacyHeaderActions />}
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
                  count={tabCounts[t.key]}
                  onClick={() => handleTabChange(t.key)}
                >
                  {t.label}
                </TabPill>
              ))}
            </TabBar>

            <PharmacySectionTopic
              title={activeTab === 'requisition' ? 'รายการเบิกจ่ายยา/เวชภัณฑ์' : 'รายการรับยาเข้าคลังใหญ่'}
              trailing={(
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
              )}
            />

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
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <div className='w-full flex items-start justify-center'>
                  <PrimarySearch
                    value={searchQ}
                    onChange={setSearchQ}
                    onSubmit={(v) => setSearchQ(v)}
                    placeholder='ค้นหาเลขที่คำขอ / ชื่อยา / ผู้ขอเบิก'
                    width={640}
                  />
                </div>
                <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
                  <FilterDropdown
                    prefix='สถานะ:'
                    options={REQ_STATUS_FILTER_OPTIONS}
                    value={statusFilter}
                    onChange={setStatusFilter}
                  />
                  <FilterDropdown
                    prefix='ประเภทการเบิก:'
                    options={REQ_TYPE_FILTER_OPTIONS}
                    value={typeFilter}
                    onChange={setTypeFilter}
                  />
                  <FilterDropdown
                    prefix='ประเภทรายการ:'
                    options={REQ_CATEGORY_FILTER_OPTIONS}
                    value={categoryFilter}
                    onChange={setCategoryFilter}
                  />
                  {requisitionFiltersActive ? (
                    <FilterTag
                      variant='neutral'
                      leadingIcon='close'
                      value='ล้างตัวกรอง'
                      showTitle={false}
                      onClick={clearRequisitionFilters}
                    />
                  ) : null}
                </div>
                <SearchResultCount found={sortedRequisitions.length} total={REQUISITIONS.length} />
                <Table
                  columns={[...REQUISITION_COLUMNS, REQUISITION_ACTIONS_COLUMN]}
                  rows={sortedRequisitions}
                  rowKey={(r) => r.id}
                  stickyColCount={3}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  emptyMessage={requisitionFiltersActive ? 'ไม่พบรายการที่ตรงกับเงื่อนไข' : 'ไม่มีคำขอเบิกจ่าย'}
                />
              </div>
            ) : (
              <Table columns={[...RECEIVING_COLUMNS, RECEIVING_ACTIONS_COLUMN]} rows={RECEIVING_RECORDS} rowKey={(r) => r.id} emptyMessage='ไม่มีรายการรับเข้าคลัง' />
            )}
          </div>
        </div>
      </QueuePageShell>
      </div>
      <Popup
        open={Boolean(editingReq && editForm)}
        onClose={closeEditReq}
        size='large'
        title='แก้ไขคำขอเบิก'
        subtitle={editingReq
          ? `${editingReq.requisitionNo} · บันทึกแล้วสถานะจะกลับเป็นรอดำเนินการ`
          : ''}
        primaryAction={{
          label: 'บันทึกการแก้ไข',
          onClick: saveEditReq,
          disabled: !editForm?.drugName || !editForm?.quantity,
        }}
        secondaryAction={{
          label: 'ปิด',
          onClick: closeEditReq,
        }}
      >
        {editForm && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
              <div className='flex-1 min-w-0' style={{ minWidth: 'var(--dim-size-2280, 218px)' }}>
                <Select
                  label='ศูนย์บริการสาธารณสุขผู้ขอเบิก'
                  value={editForm.requestingCenter}
                  onChange={(v) => patchEditForm({ requestingCenter: v })}
                  options={CLINIC_OPTIONS.map((c) => ({ value: c.value, label: c.label }))}
                  searchable={false}
                  showHelperText={false}
                />
              </div>
              <div className='flex-1 min-w-0' style={{ minWidth: 'var(--dim-size-2280, 218px)' }}>
                <Select
                  label='หน่วยงานที่ส่งคำร้องไป'
                  value={editForm.targetUnit}
                  onChange={(v) => patchEditForm({ targetUnit: v })}
                  options={REQUISITION_TARGETS.map((t) => ({ value: t.key, label: t.label }))}
                  searchable={false}
                  showHelperText={false}
                />
              </div>
            </div>
            <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
              <div className='flex-1 min-w-0' style={{ minWidth: 'var(--dim-size-2050, 144px)' }}>
                <Select
                  label='ประเภทรายการ'
                  value={editForm.itemCategory}
                  onChange={(v) => patchEditForm({ itemCategory: v })}
                  options={REQUISITION_ITEM_CATEGORIES.map((c) => ({ value: c.key, label: c.label }))}
                  searchable={false}
                  showHelperText={false}
                />
              </div>
              <div className='flex-1 min-w-0' style={{ minWidth: 'var(--dim-size-2050, 144px)' }}>
                <Select
                  label='ประเภทการเบิก'
                  value={editForm.requisitionType}
                  onChange={(v) => patchEditForm({ requisitionType: v })}
                  options={REQUISITION_TYPES.map((t) => ({ value: t.key, label: t.label }))}
                  searchable={false}
                  showHelperText={false}
                />
              </div>
            </div>
            <Select
              label='ชื่อยา'
              value={editForm.drugName}
              onChange={(v) => patchEditForm({ drugName: v })}
              options={DRUG_REGISTRY.map((d) => ({
                value: d.name,
                label: d.name,
                image: d.image || resolveMedicationImage(d.name, null) || undefined,
              }))}
              searchable
              showHelperText={false}
            />
            <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
              <div className='flex-1 min-w-0' style={{ minWidth: 'var(--dim-size-1800, 96px)' }}>
                <InputField
                  label='จำนวนที่ขอเบิก'
                  type='number'
                  value={editForm.packQty}
                  onChange={(v) => patchEditForm({ packQty: v })}
                  placeholder='เช่น 500'
                  showHelperText={false}
                />
              </div>
              <div className='flex-1 min-w-0' style={{ minWidth: 'var(--dim-size-1800, 96px)' }}>
                <InputField
                  label='หน่วยนับ'
                  value={registryUnitLabel(editForm.unitKey)}
                  onChange={() => {}}
                  disabled
                  showHelperText={false}
                />
              </div>
              <div className='flex-1 min-w-0' style={{ minWidth: 'var(--dim-size-1800, 96px)' }}>
                <InputField
                  label='ขอเบิกใหม่'
                  type='number'
                  value={editForm.quantity}
                  onChange={(v) => patchEditForm({ quantity: v })}
                  placeholder='เช่น 500'
                  showHelperText={false}
                />
              </div>
            </div>
            <InputField
              label='หมายเหตุ'
              value={editForm.notes}
              onChange={(v) => patchEditForm({ notes: v })}
              placeholder='(ถ้ามี)'
              showHelperText={Boolean(editingReq?.status === 'approved')}
              helperText={editingReq?.status === 'approved'
                ? 'รายการนี้อนุมัติแล้ว — เมื่อบันทึกจะกลับเป็นรอดำเนินการและล้างจำนวนอนุมัติ'
                : undefined}
            />
          </div>
        )}
      </Popup>
      <AlertDialog
        open={Boolean(pendingDestructive)}
        type='destructive'
        alignment='center'
        title={pendingDestructive?.kind === 'delete-rcv' ? 'ลบรายการนี้?' : 'ยกเลิกรายการนี้?'}
        description={pendingDestructive?.row
          ? (pendingDestructive.kind === 'delete-rcv'
            ? `ยืนยันลบรายการรับเข้า «${pendingDestructive.row.drugName}» (${pendingDestructive.row.receiptNo}) — การดำเนินการนี้ไม่สามารถย้อนกลับได้`
            : `ยืนยันยกเลิกคำขอเบิก «${pendingDestructive.row.drugName}» (${pendingDestructive.row.requisitionNo})`)
          : ''}
        confirmLabel={pendingDestructive?.kind === 'delete-rcv' ? 'ลบ' : 'ยกเลิกคำขอ'}
        cancelLabel='ปิด'
        onConfirm={handleConfirmDestructive}
        onCancel={() => setPendingDestructive(null)}
        onClose={() => setPendingDestructive(null)}
      />
    </>
  );
};

export default PharmacyRequisitionPage;
