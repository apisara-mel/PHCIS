import React, { useEffect, useMemo, useRef, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import Badge from '@/components/badge/Badge';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import FilterDateTag from '@/components/forms/FilterDateTag';
import { computeQuickRange, computeQuickSingle } from '@/components/popup/DateFilterPopup';
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
import { DRUG_REGISTRY, UNIT_TYPES, SUPPLIER_OPTIONS, getRegistryDrug } from '@/data/pharmacyRegistry';
import { resolveMedicationImage } from '@/data/medicationCatalog';
import { CLINIC_OPTIONS, DEFAULT_CLINIC_VALUE, useClinicFilter } from '@/components/layout/HeaderClinicContext';
import PharmacySubNav, { PharmacyHeaderActions } from '@/components/pharmacy/PharmacySubNav';
import PharmacySectionTopic from '@/components/pharmacy/PharmacySectionTopic';
import StickyStatusTabBar, { QUEUE_STICKY_UNDER_STATUS_TABS } from '@/components/tab/StickyStatusTabBar';
import PharmacyRequisitionPrint from '@/components/pharmacy/PharmacyRequisitionPrint';
import PharmacyReceivingScanPopup from '@/components/pharmacy/PharmacyReceivingScanPopup';
import Alert from '@/components/alert/Alert';
import AlertDialog from '@/components/popup/AlertDialog';
import Popup from '@/components/popup/Popup';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import Textarea from '@/components/forms/Textarea';
import DatePicker from '@/components/forms/DatePicker';
import { Field } from '@/components/forms/Fields';
import Stepper from '@/components/stepper/Stepper';
import { resolveReceivingScan } from '@/data/pharmacyReceivingScan';
import { buildRequisitionSummaryCards } from '@/pages/pharmacy/pharmacySummaryCards';
import {
  PHARMACY_INSET_GROUP,
  PHARMACY_INSET_GROUP_HOVERABLE_CLASS,
  PHARMACY_WORKLIST_CARD_BODY,
} from '@/pages/pharmacy/pharmacyContentCard';

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

const RCV_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'received', label: 'รับเข้าแล้ว' },
  { value: 'cancelled', label: 'ยกเลิกแล้ว' },
];

const RCV_TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  ...RECEIVING_TYPES.map((t) => ({ value: t.key, label: t.label })),
];

const RCV_DRUG_TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'GPO', label: 'GPO' },
  { value: 'GPU', label: 'GPU' },
  { value: 'TPU', label: 'TPU' },
];

const DEFAULT_DATE_FILTER = { quick: 'all' };

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/* Resolve FilterDateTag value → { start, end } (inclusive day bounds). */
const resolveDateFilterRange = (value) => {
  if (!value?.quick || value.quick === 'all') return null;
  if (value.quick === 'custom') {
    if (value.tab === 'single' && value.single) {
      const day = startOfDay(value.single);
      return { start: day, end: day };
    }
    if (value.tab === 'range' && value.range?.start && value.range?.end) {
      return { start: startOfDay(value.range.start), end: startOfDay(value.range.end) };
    }
    return null;
  }
  const single = computeQuickSingle(value.quick);
  if (single) return { start: single, end: single };
  const range = computeQuickRange(value.quick);
  if (!range) return null;
  return { start: startOfDay(range.start), end: startOfDay(range.end) };
};

const matchesRequestedAtFilter = (requestedAt, value) => {
  const range = resolveDateFilterRange(value);
  if (!range) return true;
  const d = startOfDay(new Date(requestedAt));
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() >= range.start.getTime() && d.getTime() <= range.end.getTime();
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

/** First unused registry drug — keeps multi-line requisitions free of duplicates. */
const firstAvailableDrugName = (takenNames = []) => {
  const taken = new Set((takenNames || []).filter(Boolean));
  const free = DRUG_REGISTRY.find((d) => d?.name && !taken.has(d.name));
  return free?.name || '';
};

const blankRequisitionLine = (takenNames = []) => {
  const name = firstAvailableDrugName(takenNames);
  return name ? lineFromDrugName(name, 100) : lineFromDrugName('', 100);
};

/* Shared 4-col grid so line fields line up with header Selects:
   col1–2 ชื่อยา · col3 จำนวนที่ขอเบิก (= ประเภทรายการ) · col4 หน่วยนับ (= ประเภทการเบิก). */
const REQ_FORM_COL_GAP = 'var(--dim-space-400)';
const REQ_FORM_LINE_INSET = 'var(--dim-space-400)';
const REQ_FORM_GRID = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  columnGap: REQ_FORM_COL_GAP,
  width: '100%',
  alignItems: 'start',
  boxSizing: 'border-box',
};

/* §1.9.6.9 — one requisition document, many drug lines (add/remove).
   §1.9.6.3/.5/.7/.8 — requesting center + target unit + item category +
   live usage-rate/days-of-stock context per line, all captured up front.
   Opens as Popup (same chrome as แก้ไขคำขอเบิก). */
const NewRequisitionPopup = ({ open, onClose, onCreate }) => {
  const clinicCtx = useClinicFilter();
  /* Filled from Hub header clinic — not editable on this form. */
  const requestingCenter = clinicCtx?.clinic || DEFAULT_CLINIC_VALUE;
  const [targetUnit, setTargetUnit] = useState(REQUISITION_TARGETS[0].key);
  const [itemCategory, setItemCategory] = useState(REQUISITION_ITEM_CATEGORIES[0].key);
  const [requisitionType, setRequisitionType] = useState('regular');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([blankRequisitionLine()]);
  const [pendingRemoveIdx, setPendingRemoveIdx] = useState(null);

  useEffect(() => {
    if (!open) return;
    setTargetUnit(REQUISITION_TARGETS[0].key);
    setItemCategory(REQUISITION_ITEM_CATEGORIES[0].key);
    setRequisitionType('regular');
    setNotes('');
    setLines([blankRequisitionLine()]);
    setPendingRemoveIdx(null);
  }, [open]);

  const updateLine = (idx, patch) => setLines((ls) => ls.map((l, i) => {
    if (i !== idx) return l;
    if (patch.drugName != null && patch.drugName !== l.drugName) {
      const taken = ls.filter((_, j) => j !== idx).map((x) => x.drugName);
      if (taken.includes(patch.drugName)) return l;
      return lineFromDrugName(patch.drugName, l.quantity);
    }
    return { ...l, ...patch };
  }));
  const addLine = () => setLines((ls) => {
    const next = blankRequisitionLine(ls.map((l) => l.drugName));
    if (!next.drugName) return ls;
    return [...ls, next];
  });
  const removeLine = (idx) => setLines((ls) => ls.filter((_, i) => i !== idx));
  const pendingRemoveLine = pendingRemoveIdx != null ? lines[pendingRemoveIdx] : null;
  const confirmRemoveLine = () => {
    if (pendingRemoveIdx == null) return;
    removeLine(pendingRemoveIdx);
    setPendingRemoveIdx(null);
  };

  const selectedDrugNames = new Set(lines.map((l) => l.drugName).filter(Boolean));
  const canAddLine = DRUG_REGISTRY.some((d) => d?.name && !selectedDrugNames.has(d.name));

  const headerComplete = Boolean(targetUnit && itemCategory && requisitionType);
  const canSubmit = headerComplete
    && lines.length > 0
    && lines.every((l) => l.drugName && Number(l.packQty) > 0);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onCreate({
      items: lines.map((l) => {
        const qty = Number(l.packQty) || 0;
        return {
          drugName: l.drugName,
          quantity: qty,
          packSize: qty > 0 ? String(qty) : '',
          unit: registryUnitLabel(l.unitKey || getRegistryDrug(l.drugName)?.unit),
        };
      }),
      requisitionType, notes, requestingCenter, targetUnit, itemCategory,
    });
  };

  return (
    <>
    <Popup
      open={open}
      onClose={onClose}
      size='extraLarge'
      title='สร้างคำขอเบิก'
      subtitle='ระบุศูนย์ผู้ขอเบิก หน่วยงานปลายทาง และรายการยาที่ต้องการเบิก'
      primaryAction={{
        label: 'ส่งคำขอเบิก',
        onClick: handleSubmit,
        disabled: !canSubmit,
        leadingIcon: 'send',
      }}
      secondaryAction={{
        label: 'ปิด',
        onClick: onClose,
      }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <div
          style={{
            ...REQ_FORM_GRID,
            paddingLeft: REQ_FORM_LINE_INSET,
            paddingRight: REQ_FORM_LINE_INSET,
          }}
        >
          <div className='min-w-0'>
            <Select
              label='ศูนย์บริการสาธารณสุขผู้ขอเบิก'
              value={requestingCenter}
              onChange={() => {}}
              options={CLINIC_OPTIONS.map((c) => ({ value: c.value, label: c.label }))}
              searchable={false}
              showHelperText={false}
              disabled
              className='w-full'
              style={{ width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <div className='min-w-0'>
            <Select
              label='หน่วยงานที่ส่งคำร้องไป'
              value={targetUnit}
              onChange={setTargetUnit}
              options={REQUISITION_TARGETS.map((t) => ({ value: t.key, label: t.label }))}
              searchable={false}
              showHelperText={false}
              required
              className='w-full'
              style={{ width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <div className='min-w-0'>
            <Select
              label='ประเภทรายการ'
              value={itemCategory}
              onChange={setItemCategory}
              options={REQUISITION_ITEM_CATEGORIES.map((c) => ({ value: c.key, label: c.label }))}
              searchable={false}
              showHelperText={false}
              required
              className='w-full'
              style={{ width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <div className='min-w-0'>
            <Select
              label='ประเภทการเบิก'
              value={requisitionType}
              onChange={setRequisitionType}
              options={REQUISITION_TYPES.map((t) => ({ value: t.key, label: t.label }))}
              searchable={false}
              showHelperText={false}
              required
              className='w-full'
              style={{ width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}
            />
          </div>
        </div>
        <div
          style={{
            ...REQ_FORM_GRID,
            paddingLeft: REQ_FORM_LINE_INSET,
            paddingRight: REQ_FORM_LINE_INSET,
          }}
        >
          <div className='min-w-0' style={{ gridColumn: '1 / span 2', maxWidth: '100%' }}>
            <Textarea
              label='หมายเหตุ'
              value={notes}
              onChange={setNotes}
              placeholder='(ถ้ามี)'
              rows={3}
              showHelperText={false}
              style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <PharmacySectionTopic
            title='รายการยาที่ต้องการขอเบิก'
            hierarchy='secondary'
            style={{
              paddingTop: 'var(--dim-space-400)',
              paddingLeft: REQ_FORM_LINE_INSET,
              paddingRight: REQ_FORM_LINE_INSET,
            }}
          />
          <div
            className='flex flex-col w-full'
            style={{
              gap: 'var(--dim-space-300)',
              paddingLeft: REQ_FORM_LINE_INSET,
              paddingRight: REQ_FORM_LINE_INSET,
            }}
          >
            {lines.map((line, idx) => {
              const showFieldLabels = idx === 0;
              const takenElsewhere = new Set(
                lines.filter((_, i) => i !== idx).map((l) => l.drugName).filter(Boolean),
              );
              const drugOptions = DRUG_REGISTRY
                .filter((d) => d?.name && (d.name === line.drugName || !takenElsewhere.has(d.name)))
                .map((d) => ({
                  value: d.name,
                  label: d.name,
                  image: d.image || resolveMedicationImage(d.name, null) || undefined,
                }));
              return (
                <div key={idx} className='w-full' style={{ ...REQ_FORM_GRID, maxWidth: '100%' }}>
                  <div className='min-w-0' style={{ gridColumn: '1 / span 2', maxWidth: '100%' }}>
                    <Select
                      label='ชื่อยา'
                      value={line.drugName}
                      onChange={(v) => updateLine(idx, { drugName: v })}
                      options={drugOptions}
                      searchable
                      required
                      showLabel={showFieldLabels}
                      showHelperText={false}
                      className='w-full'
                      style={{ width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div className='min-w-0 w-full' style={{ maxWidth: '100%' }}>
                    <Field
                      label={showFieldLabels ? 'จำนวนที่ขอเบิก' : null}
                      required={showFieldLabels}
                    >
                      <Stepper
                        min={1}
                        value={line.packQty === '' || line.packQty == null ? null : Number(line.packQty)}
                        onChange={(n) => updateLine(idx, {
                          packQty: n == null || Number.isNaN(n) ? '' : n,
                        })}
                        aria-label='จำนวนที่ขอเบิก'
                        className='w-full'
                        style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
                      />
                    </Field>
                  </div>
                  <div
                    className='min-w-0 flex items-start'
                    style={{ gap: 'var(--dim-space-200)', maxWidth: '100%' }}
                  >
                    <div className='min-w-0 flex-1'>
                      <InputField
                        label='หน่วยนับ'
                        value={registryUnitLabel(line.unitKey)}
                        onChange={() => {}}
                        disabled
                        showLabel={showFieldLabels}
                        showHelperText={false}
                        style={{ width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                    {lines.length > 1 ? (
                      <NeutralSubdueButton
                        size='sm'
                        variant='outline'
                        leadingIcon='delete'
                        onClick={() => setPendingRemoveIdx(idx)}
                        className='shrink-0'
                        aria-label='ลบรายการ'
                        style={showFieldLabels
                          ? { marginTop: 'var(--dim-space-700, 28px)' }
                          : undefined}
                      >
                        ลบ
                      </NeutralSubdueButton>
                    ) : null}
                  </div>
                </div>
              );
            })}
            <NeutralSubdueButton
              size='sm'
              variant='outline'
              leadingIcon='add'
              onClick={addLine}
              disabled={!canAddLine}
              className='self-start'
            >
              เพิ่มรายการยา
            </NeutralSubdueButton>
          </div>
        </div>
      </div>
    </Popup>
    <AlertDialog
      open={pendingRemoveIdx != null && pendingRemoveLine != null}
      type='destructive'
      alignment='center'
      title='ลบรายการนี้?'
      description={pendingRemoveLine
        ? `ยืนยันลบรายการที่ ${pendingRemoveIdx + 1}${pendingRemoveLine.drugName ? ` «${pendingRemoveLine.drugName}»` : ''} — ข้อมูลในรายการนี้จะหายไป`
        : ''}
      confirmLabel='ลบ'
      cancelLabel='ยกเลิก'
      onConfirm={confirmRemoveLine}
      onCancel={() => setPendingRemoveIdx(null)}
      onClose={() => setPendingRemoveIdx(null)}
    />
    </>
  );
};

const DRUG_TYPE_OPTIONS = [
  { value: 'GPO', label: 'GPO' },
  { value: 'GPU', label: 'GPU' },
  { value: 'TPU', label: 'TPU' },
];

const FIELD_FULL = { width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' };

/** Parse YYYY-MM-DD → local Date (avoids UTC day-shift). */
const parseIsoDate = (iso) => {
  if (!iso) return null;
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};
const toIsoDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

let receivingLineSeq = 0;
/* Demo-seeded first line when the popup opens. */
const blankReceivingLine = () => {
  const drug = DRUG_REGISTRY[0];
  return {
    id: `recv-line-${++receivingLineSeq}`,
    drugName: drug?.name || '',
    quantity: 500,
    unitKey: drug?.unit || 'tablet',
    lot: '',
    expiryDate: '',
    receivedFrom: 'องค์การเภสัชกรรม (GPO)',
    drugType: 'GPO',
    costPrice: 1,
    salePrice: 1.5,
    claimablePrice: 1.5,
  };
};
/* Extra lines from «รายการยา» start empty — user fills every field. */
const emptyReceivingLine = () => ({
  id: `recv-line-${++receivingLineSeq}`,
  drugName: '',
  quantity: '',
  unitKey: '',
  lot: '',
  expiryDate: '',
  receivedFrom: '',
  drugType: '',
  costPrice: '',
  salePrice: '',
  claimablePrice: '',
});

/* §1.9.7.2/.4 — document-level header (หน่วยงาน/ประเภทการรับ/เลขที่ใบสั่งซื้อ/
   วันที่ซื้อ/เลขที่ใบส่งของ/วันที่ส่งของ) + barcode/camera scan that fills
   header fields or appends a drug line — plus multiple lines, each with its
   OWN "รับจาก" (manufacturer/supplier) so one receiving document can cover
   several manufacturers at once. Opens as Popup (same chrome as สร้างคำขอเบิก).
   All fields alias MIH DS: InputField · Select · DatePicker · Stepper · Alert. */
const NewReceivingPopup = ({ open, onClose, onCreate }) => {
  const clinicCtx = useClinicFilter();
  /* Filled from Hub header clinic — not editable (same contract as ศูนย์ผู้ขอเบิก). */
  const clinicLabel = CLINIC_OPTIONS.find((c) => c.value === (clinicCtx?.clinic || DEFAULT_CLINIC_VALUE))?.label
    || CLINIC_OPTIONS.find((c) => c.value === DEFAULT_CLINIC_VALUE)?.label
    || 'ศูนย์ 4 ดินแดง';
  const department = `คลังยาใหญ่${clinicLabel}`;
  const [receivingType, setReceivingType] = useState('purchase');
  const [poNumber, setPoNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [scanCode, setScanCode] = useState('');
  const [scanHint, setScanHint] = useState(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [lines, setLines] = useState([blankReceivingLine()]);
  /* ids in this set are collapsed; everything else stays expanded. */
  const [collapsedLineIds, setCollapsedLineIds] = useState(() => new Set());
  const [pendingRemoveId, setPendingRemoveId] = useState(null);
  const scanInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setReceivingType('purchase');
    setPoNumber('');
    setPurchaseDate('');
    setDeliveryNoteNumber('');
    setDeliveryDate('');
    setScanCode('');
    setScanHint(null);
    setScanOpen(false);
    setLines([blankReceivingLine()]);
    setCollapsedLineIds(new Set());
    setPendingRemoveId(null);
  }, [open]);

  const updateLine = (idx, patch) => setLines((ls) => ls.map((l, i) => {
    if (i !== idx) return l;
    if (patch.drugName != null && patch.drugName !== l.drugName) {
      const drug = getRegistryDrug(patch.drugName);
      return {
        ...l,
        ...patch,
        unitKey: drug?.unit || '',
        /* Keep an already-chosen supplier; otherwise suggest from registry. */
        receivedFrom: l.receivedFrom
          || drug?.manufacturer
          || drug?.distributor
          || '',
      };
    }
    return { ...l, ...patch };
  }));
  const addLine = () => {
    const next = emptyReceivingLine();
    setLines((ls) => [...ls, next]);
    setCollapsedLineIds((prev) => {
      if (!prev.has(next.id)) return prev;
      const n = new Set(prev);
      n.delete(next.id);
      return n;
    });
  };
  const removeLine = (idx) => {
    const removedId = lines[idx]?.id;
    setLines((ls) => ls.filter((_, i) => i !== idx));
    if (removedId == null) return;
    setCollapsedLineIds((prev) => {
      if (!prev.has(removedId)) return prev;
      const n = new Set(prev);
      n.delete(removedId);
      return n;
    });
  };
  const toggleLineCollapsed = (id) => {
    setCollapsedLineIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };
  const pendingRemoveIdx = pendingRemoveId == null
    ? -1
    : lines.findIndex((l) => l.id === pendingRemoveId);
  const pendingRemoveLine = pendingRemoveIdx >= 0 ? lines[pendingRemoveIdx] : null;
  const confirmRemoveLine = () => {
    if (pendingRemoveIdx < 0) {
      setPendingRemoveId(null);
      return;
    }
    removeLine(pendingRemoveIdx);
    setPendingRemoveId(null);
  };

  const applyScan = (raw) => {
    const result = resolveReceivingScan(raw);
    setScanCode(result.code || String(raw || '').trim());
    if (result.type === 'document') {
      const f = result.fields || {};
      if (f.receivingType != null) setReceivingType(f.receivingType);
      if (f.poNumber != null) setPoNumber(f.poNumber);
      if (f.purchaseDate != null) setPurchaseDate(f.purchaseDate);
      if (f.deliveryNoteNumber != null) setDeliveryNoteNumber(f.deliveryNoteNumber);
      if (f.deliveryDate != null) setDeliveryDate(f.deliveryDate);
      setScanHint({ type: 'success', text: `ดึงข้อมูลเอกสารแล้ว: ${result.label}` });
    } else if (result.type === 'drug' && result.line) {
      const nextLine = {
        id: `recv-line-${++receivingLineSeq}`,
        ...result.line,
        unitKey: result.drug?.unit || getRegistryDrug(result.line.drugName)?.unit || 'tablet',
      };
      setLines((ls) => {
        const emptyOnly = ls.length === 1 && !ls[0].lot && !ls[0].expiryDate
          && ls[0].drugName === (DRUG_REGISTRY[0]?.name || '');
        return emptyOnly ? [nextLine] : [...ls, nextLine];
      });
      setCollapsedLineIds((prev) => {
        if (!prev.has(nextLine.id)) return prev;
        const n = new Set(prev);
        n.delete(nextLine.id);
        return n;
      });
      setScanHint({ type: 'success', text: `เพิ่มรายการยาจากบาร์โค้ด: ${result.label}` });
    } else {
      setScanHint({ type: 'error', text: `ไม่พบบาร์โค้ด "${result.code}" ในทะเบียนยาหรือใบเอกสารตัวอย่าง` });
    }
    requestAnimationFrame(() => scanInputRef.current?.focus?.());
  };

  const linesValid = lines.length > 0
    && lines.every((l) => l.drugName && l.lot && l.expiryDate && Number(l.quantity) > 0);

  const handleSubmit = () => {
    if (!linesValid) return;
    onCreate({
      receivingType, department, poNumber, scanCode,
      purchaseDate: purchaseDate || undefined, deliveryNoteNumber, deliveryDate: deliveryDate || undefined,
      items: lines.map((l) => {
        const unit = registryUnitLabel(l.unitKey || getRegistryDrug(l.drugName)?.unit);
        const { id: _lineId, ...rest } = l;
        return {
          ...rest,
          unit,
          packSize: unit,
        };
      }),
    });
  };

  const drugOptions = DRUG_REGISTRY.map((d) => ({
    value: d.name,
    label: d.name,
    image: d.image || resolveMedicationImage(d.name, null) || undefined,
  }));

  return (
    <>
    <Popup
      open={open}
      onClose={onClose}
      size='extraLarge'
      title='บันทึกรับเข้าคลัง'
      subtitle='ระบุข้อมูลเอกสารรับเข้าและรายการยา พร้อม Lot / วันหมดอายุ'
      primaryAction={{
        label: 'บันทึกรับเข้าคลัง',
        onClick: handleSubmit,
        disabled: !linesValid,
        leadingIcon: 'inventory',
      }}
      secondaryAction={{
        label: 'ปิด',
        onClick: onClose,
      }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <div
          style={{
            ...REQ_FORM_GRID,
            paddingLeft: REQ_FORM_LINE_INSET,
            paddingRight: REQ_FORM_LINE_INSET,
          }}
        >
          <div className='min-w-0'>
            <InputField
              label='หน่วยงาน'
              value={department}
              onChange={() => {}}
              disabled
              showLeadingIcon={false}
              showHelperText={false}
              style={FIELD_FULL}
            />
          </div>
          <div className='min-w-0'>
            <Select
              label='ประเภทการรับ'
              value={receivingType}
              onChange={setReceivingType}
              options={RECEIVING_TYPES.map((t) => ({ value: t.key, label: t.label }))}
              searchable={false}
              showHelperText={false}
              required
              style={FIELD_FULL}
            />
          </div>
          <div className='min-w-0'>
            <InputField
              label='เลขที่ใบรับ'
              value='ออกอัตโนมัติเมื่อบันทึก'
              onChange={() => {}}
              disabled
              showLeadingIcon={false}
              showHelperText={false}
              style={FIELD_FULL}
            />
          </div>
          <div className='min-w-0'>
            <InputField
              label='เลขที่ใบสั่งซื้อ'
              value={poNumber}
              onChange={setPoNumber}
              placeholder='PO-2026-XXXX'
              showLeadingIcon={false}
              showHelperText={false}
              style={FIELD_FULL}
            />
          </div>
        </div>

        <div
          style={{
            ...REQ_FORM_GRID,
            paddingLeft: REQ_FORM_LINE_INSET,
            paddingRight: REQ_FORM_LINE_INSET,
          }}
        >
          <div className='min-w-0'>
            <DatePicker
              label='วันที่ซื้อ'
              value={parseIsoDate(purchaseDate)}
              onChange={(d) => setPurchaseDate(toIsoDate(d))}
              placeholder='เลือกวันที่'
              showHelperText={false}
              showLeadingIcon
              leadingIcon='calendar_today'
              style={FIELD_FULL}
            />
          </div>
          <div className='min-w-0'>
            <InputField
              label='เลขที่ใบส่งของ'
              value={deliveryNoteNumber}
              onChange={setDeliveryNoteNumber}
              placeholder='DN-2026-XXXX'
              showLeadingIcon={false}
              showHelperText={false}
              style={FIELD_FULL}
            />
          </div>
          <div className='min-w-0'>
            <DatePicker
              label='วันที่ส่งของ'
              value={parseIsoDate(deliveryDate)}
              onChange={(d) => setDeliveryDate(toIsoDate(d))}
              placeholder='เลือกวันที่'
              showHelperText={false}
              showLeadingIcon
              leadingIcon='calendar_today'
              style={FIELD_FULL}
            />
          </div>
        </div>

        <div
          className='flex flex-wrap items-end w-full'
          style={{
            gap: 'var(--dim-space-200)',
            paddingLeft: REQ_FORM_LINE_INSET,
            paddingRight: REQ_FORM_LINE_INSET,
          }}
        >
          <div className='min-w-0 flex-1' style={{ minWidth: 'var(--dim-size-2400, 240px)' }}>
            <InputField
              ref={scanInputRef}
              label='สแกนบาร์โค้ด / เลขที่เอกสาร'
              value={scanCode}
              onChange={(v) => { setScanCode(v); setScanHint(null); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applyScan(scanCode);
                }
              }}
              placeholder='สแกนหรือพิมพ์บาร์โค้ดยา / PO-… / DN-… แล้วกด Enter'
              leadingIcon='barcode_scanner'
              showLeadingIcon
              showHelperText={false}
              style={FIELD_FULL}
            />
          </div>
          <BrandButton size='sm' leadingIcon='barcode_scanner' onClick={() => applyScan(scanCode)}>
            ใช้รหัสนี้
          </BrandButton>
          <BrandButton size='sm' variant='outline' leadingIcon='photo_camera' onClick={() => setScanOpen(true)}>
            เปิดกล้องสแกน
          </BrandButton>
        </div>

        {scanHint && (
          <div style={{ paddingLeft: REQ_FORM_LINE_INSET, paddingRight: REQ_FORM_LINE_INSET }}>
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
          </div>
        )}

        <PharmacyReceivingScanPopup
          open={scanOpen}
          onClose={() => setScanOpen(false)}
          onScan={applyScan}
        />

        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <PharmacySectionTopic
            title='รายการยารับเข้า'
            hierarchy='secondary'
            style={{
              paddingTop: 'var(--dim-space-400)',
              paddingLeft: REQ_FORM_LINE_INSET,
              paddingRight: REQ_FORM_LINE_INSET,
            }}
          />
          <div
            className='flex flex-col w-full'
            style={{
              gap: 'var(--dim-space-400)',
              paddingLeft: REQ_FORM_LINE_INSET,
              paddingRight: REQ_FORM_LINE_INSET,
            }}
          >
            {lines.map((line, idx) => {
              const lineId = line.id || `recv-fallback-${idx}`;
              const expanded = !collapsedLineIds.has(lineId);
              const collapsedDrugSrc = !expanded && line.drugName ? drugImageSrc(line.drugName) : '';
              const { background: insetBg, ...insetRest } = PHARMACY_INSET_GROUP;
              return (
                <div
                  key={lineId}
                  className={[
                    'flex flex-col w-full min-w-0',
                    expanded ? '' : PHARMACY_INSET_GROUP_HOVERABLE_CLASS,
                  ].filter(Boolean).join(' ')}
                  style={{
                    ...insetRest,
                    ...(expanded ? { background: insetBg } : null),
                    gap: expanded ? 'var(--dim-space-400)' : 'var(--dim-space-0)',
                    padding: 'var(--dim-space-400)',
                  }}
                >
                  <div
                    className='flex items-center w-full min-w-0'
                    style={{ gap: 'var(--dim-space-300)' }}
                  >
                    <button
                      type='button'
                      onClick={() => toggleLineCollapsed(lineId)}
                      aria-expanded={expanded}
                      aria-controls={`receiving-line-body-${lineId}`}
                      aria-label={expanded
                        ? `ย่อรายการที่ ${idx + 1}`
                        : `ขยายรายการที่ ${idx + 1}${line.drugName ? ` ${line.drugName}` : ''}`}
                      className='flex items-center flex-1 min-w-0'
                      style={{
                        gap: 'var(--dim-space-300)',
                        padding: 'var(--dim-space-0)',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {expanded ? (
                        <span
                          className='truncate flex-1 min-w-0'
                          style={{
                            color: 'var(--text-topic-tertiary-title, #363B3F)',
                            fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
                            fontSize: 'var(--type-size-base)',
                            fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                            lineHeight: 1.5,
                          }}
                        >
                          {`รายการที่ ${idx + 1}`}
                        </span>
                      ) : (
                        <div
                          className='flex items-center flex-1 min-w-0'
                          style={{ gap: 'var(--dim-space-300)' }}
                        >
                          <div
                            className='shrink-0 rounded-full overflow-hidden'
                            style={{
                              width: 'var(--dim-size-900, 36px)',
                              height: 'var(--dim-size-900, 36px)',
                              background: 'var(--surface-card-quaternary)',
                            }}
                            aria-hidden
                          >
                            {collapsedDrugSrc ? (
                              <img src={collapsedDrugSrc} alt='' className='w-full h-full object-cover' />
                            ) : null}
                          </div>
                          <div className='flex flex-col flex-1 min-w-0'>
                            <span
                              className='truncate'
                              style={{
                                color: 'var(--text-content-tertiary, #858C92)',
                                fontFamily: 'var(--type-family-body)',
                                fontSize: 'var(--type-size-xs)',
                                fontWeight: 'var(--type-weight-regular, 400)',
                                lineHeight: 1.5,
                              }}
                            >
                              {`รายการที่ ${idx + 1}`}
                            </span>
                            <span
                              className='truncate'
                              style={{
                                color: 'var(--text-topic-tertiary-title, #363B3F)',
                                fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
                                fontSize: 'var(--type-size-base)',
                                fontWeight: 'var(--type-weight-medium, 500)',
                                lineHeight: 1.5,
                              }}
                            >
                              {line.drugName || 'ยังไม่ระบุชื่อยา'}
                            </span>
                          </div>
                        </div>
                      )}
                      <Icon
                        name={expanded ? 'expand_less' : 'expand_more'}
                        size={24}
                        style={{ color: 'var(--icon-content-secondary, #636B72)', flexShrink: 0 }}
                      />
                    </button>
                    {lines.length > 1 ? (
                      <NeutralSubdueButton
                        size='sm'
                        variant='outline'
                        leadingIcon='delete'
                        onClick={() => setPendingRemoveId(lineId)}
                        className='shrink-0'
                        aria-label={`ลบรายการที่ ${idx + 1}`}
                      >
                        ลบ
                      </NeutralSubdueButton>
                    ) : null}
                  </div>
                  {expanded ? (
                    <div
                      id={`receiving-line-body-${lineId}`}
                      className='flex flex-col w-full min-w-0'
                      style={{ gap: 'var(--dim-space-400)' }}
                    >
                      <div className='w-full' style={{ ...REQ_FORM_GRID, maxWidth: '100%' }}>
                        <div className='min-w-0' style={{ gridColumn: '1 / span 2', maxWidth: '100%' }}>
                          <Select
                            label='ชื่อยา'
                            value={line.drugName}
                            onChange={(v) => updateLine(idx, { drugName: v })}
                            options={drugOptions}
                            searchable
                            required
                            showHelperText={false}
                            style={FIELD_FULL}
                          />
                        </div>
                        <div className='min-w-0' style={{ gridColumn: '3 / span 2', maxWidth: '100%' }}>
                          <Select
                            label='GPO/GPU/TPU'
                            value={line.drugType}
                            onChange={(v) => updateLine(idx, { drugType: v })}
                            options={DRUG_TYPE_OPTIONS}
                            searchable={false}
                            showHelperText={false}
                            style={FIELD_FULL}
                          />
                        </div>
                      </div>
                      <div className='w-full' style={{ ...REQ_FORM_GRID, maxWidth: '100%' }}>
                        <div className='min-w-0'>
                          <Field label='จำนวน' required>
                            <Stepper
                              min={1}
                              value={line.quantity == null || line.quantity === '' ? null : Number(line.quantity)}
                              onChange={(n) => updateLine(idx, {
                                quantity: n == null || Number.isNaN(n) ? '' : n,
                              })}
                              aria-label='จำนวน'
                              className='w-full'
                              style={FIELD_FULL}
                            />
                          </Field>
                        </div>
                        <div className='min-w-0'>
                          <InputField
                            label='หน่วยนับ'
                            value={registryUnitLabel(line.unitKey || getRegistryDrug(line.drugName)?.unit)}
                            onChange={() => {}}
                            disabled
                            showLeadingIcon={false}
                            showHelperText={false}
                            style={FIELD_FULL}
                          />
                        </div>
                      </div>
                      <div className='w-full' style={{ ...REQ_FORM_GRID, maxWidth: '100%' }}>
                        <div className='min-w-0'>
                          <InputField
                            label='Lot No.'
                            value={line.lot}
                            onChange={(v) => updateLine(idx, { lot: v })}
                            placeholder='LOT-XXX-26'
                            required
                            showLeadingIcon={false}
                            showHelperText={false}
                            style={FIELD_FULL}
                          />
                        </div>
                        <div className='min-w-0'>
                          <DatePicker
                            label='วันหมดอายุ'
                            value={parseIsoDate(line.expiryDate)}
                            onChange={(d) => updateLine(idx, { expiryDate: toIsoDate(d) })}
                            placeholder='เลือกวันที่'
                            required
                            showHelperText={false}
                            showLeadingIcon
                            leadingIcon='calendar_today'
                            style={FIELD_FULL}
                          />
                        </div>
                        <div className='min-w-0' style={{ gridColumn: '3 / span 2', maxWidth: '100%' }}>
                          <Select
                            label='รับจาก (ผู้ผลิต/ผู้จำหน่าย)'
                            value={line.receivedFrom}
                            onChange={(v) => updateLine(idx, { receivedFrom: v })}
                            options={SUPPLIER_OPTIONS.map((name) => ({ value: name, label: name }))}
                            searchable
                            showHelperText={false}
                            style={FIELD_FULL}
                          />
                        </div>
                      </div>
                      <div className='w-full' style={{ ...REQ_FORM_GRID, maxWidth: '100%' }}>
                        <div className='min-w-0'>
                          <InputField
                            label='ราคาทุน/หน่วย (บาท)'
                            type='number'
                            value={line.costPrice == null ? '' : String(line.costPrice)}
                            onChange={(v) => updateLine(idx, { costPrice: v === '' ? '' : Number(v) })}
                            showLeadingIcon={false}
                            showHelperText={false}
                            style={FIELD_FULL}
                          />
                        </div>
                        <div className='min-w-0'>
                          <InputField
                            label='ราคาขาย/หน่วย (บาท)'
                            type='number'
                            value={line.salePrice == null ? '' : String(line.salePrice)}
                            onChange={(v) => updateLine(idx, { salePrice: v === '' ? '' : Number(v) })}
                            showLeadingIcon={false}
                            showHelperText={false}
                            style={FIELD_FULL}
                          />
                        </div>
                        <div className='min-w-0'>
                          <InputField
                            label='ราคาที่เบิกได้ (บาท)'
                            type='number'
                            value={line.claimablePrice == null ? '' : String(line.claimablePrice)}
                            onChange={(v) => updateLine(idx, { claimablePrice: v === '' ? '' : Number(v) })}
                            showLeadingIcon={false}
                            showHelperText={false}
                            style={FIELD_FULL}
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
            <NeutralSubdueButton
              size='sm'
              variant='outline'
              leadingIcon='add'
              onClick={addLine}
              className='self-start'
            >
              รายการยา
            </NeutralSubdueButton>
          </div>
        </div>
      </div>
    </Popup>
    <AlertDialog
      open={pendingRemoveId != null && pendingRemoveLine != null}
      type='destructive'
      alignment='center'
      title='ลบรายการนี้?'
      description={pendingRemoveLine
        ? `ยืนยันลบรายการที่ ${pendingRemoveIdx + 1}${pendingRemoveLine.drugName ? ` «${pendingRemoveLine.drugName}»` : ''} — ข้อมูลในรายการนี้จะหายไป`
        : ''}
      confirmLabel='ลบ'
      cancelLabel='ยกเลิก'
      onConfirm={confirmRemoveLine}
      onCancel={() => setPendingRemoveId(null)}
      onClose={() => setPendingRemoveId(null)}
    />
    </>
  );
};

const REQUISITION_COLUMNS = [
  /* Sticky lead cols — no flex on these; flex sticky cols drift vs stickyLeft and overlap. */
  { key: 'seq', label: 'ลำดับ', align: 'center', render: (r) => r.seq ?? '-', print: (r) => r.seq ?? '-' },
  { key: 'requisitionNo', label: 'เลขที่คำขอ' },
  { key: 'requestedAt', label: 'วันที่ขอเบิก', render: (r) => formatThaiDate(r.requestedAt), print: (r) => formatThaiDate(r.requestedAt) },
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
  { key: 'status', label: 'สถานะ', render: (r) => <Badge style={REQ_STATUS_PILL[r.status].style} size='small'>{REQ_STATUS_PILL[r.status].label}</Badge>, print: (r) => REQ_STATUS_PILL[r.status].label },
];

const RECEIVING_STATUS_PILL = {
  cancelled: { style: 'error', label: 'ยกเลิกแล้ว' },
};

const RECEIVING_COLUMNS = [
  /* Sticky lead cols — no flex on these; flex sticky cols drift vs stickyLeft and overlap. */
  { key: 'seq', label: 'ลำดับ', align: 'center', render: (r) => r.seq ?? '-', print: (r) => r.seq ?? '-' },
  { key: 'receiptNo', label: 'เลขที่ใบรับ' },
  { key: 'department', label: 'หน่วยงาน', minWidth: 180, render: (r) => r.department || '—', print: (r) => r.department || '—' },
  { key: 'drugName', label: 'ชื่อยา', minWidth: 200 },
  { key: 'drugType', label: 'แหล่งยา', align: 'center' },
  { key: 'unit', label: 'หน่วยนับ', align: 'center', render: (r) => r.unit || resolveUnitLabel(r), print: (r) => r.unit || resolveUnitLabel(r) },
  { key: 'receivingType', label: 'ประเภทการรับ', render: (r) => RECEIVING_TYPE_LABEL[r.receivingType], print: (r) => RECEIVING_TYPE_LABEL[r.receivingType] },
  { key: 'quantity', label: 'จำนวน', align: 'center', render: (r) => `${r.quantity}`, print: (r) => `${r.quantity}` },
  { key: 'lot', label: 'Lot No.' },
  { key: 'expiryDate', label: 'วันหมดอายุ', render: (r) => formatThaiDate(r.expiryDate), print: (r) => formatThaiDate(r.expiryDate) },
  { key: 'costPrice', label: 'ราคาทุน/หน่วย (บาท)', align: 'center', render: (r) => `฿${r.costPrice}`, print: (r) => `฿${r.costPrice}` },
  { key: 'salePrice', label: 'ราคาขาย/หน่วย (บาท)', align: 'center', render: (r) => `฿${r.salePrice}`, print: (r) => `฿${r.salePrice}` },
  { key: 'claimablePrice', label: 'ราคาที่เบิกได้ (บาท)', align: 'center', render: (r) => r.claimablePrice != null ? `฿${r.claimablePrice}` : '—', print: (r) => r.claimablePrice != null ? `฿${r.claimablePrice}` : '—' },
  { key: 'poNumber', label: 'เลขที่ใบสั่งซื้อ', render: (r) => r.poNumber || '—', print: (r) => r.poNumber || '—' },
  { key: 'deliveryNoteNumber', label: 'เลขที่ใบส่งของ', render: (r) => r.deliveryNoteNumber || '—', print: (r) => r.deliveryNoteNumber || '—' },
  { key: 'receivedFrom', label: 'รับจาก', flex: true, minWidth: 180 },
  { key: 'receivedAt', label: 'วันที่รับเข้า', render: (r) => formatThaiDate(r.receivedAt), print: (r) => formatThaiDate(r.receivedAt) },
  { key: 'status', label: 'สถานะ', render: (r) => r.status === 'cancelled' ? <Badge style='error' size='small'>{RECEIVING_STATUS_PILL.cancelled.label}</Badge> : <Badge style='success' size='small'>รับเข้าแล้ว</Badge>, print: (r) => r.status === 'cancelled' ? RECEIVING_STATUS_PILL.cancelled.label : 'รับเข้าแล้ว' },
];

const PharmacyRequisitionPage = () => {
  const [activeTab, setActiveTab] = useState('requisition');
  const [showCreateReq, setShowCreateReq] = useState(false);
  const [showCreateRecv, setShowCreateRecv] = useState(false);
  const [renderTick, forceRender] = useState(0);
  const bump = () => forceRender((n) => n + 1);

  /* §1.9.6 list filters — search + date + FilterDropdown chips. */
  const [searchQ, setSearchQ] = useState('');
  const [dateFilter, setDateFilter] = useState(DEFAULT_DATE_FILTER);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  /* §1.9.7 list filters — mirror เบิกจ่าย chrome on รับเข้าคลังใหญ่. */
  const [recvSearchQ, setRecvSearchQ] = useState('');
  const [recvDateFilter, setRecvDateFilter] = useState(DEFAULT_DATE_FILTER);
  const [recvStatusFilter, setRecvStatusFilter] = useState('all');
  const [recvTypeFilter, setRecvTypeFilter] = useState('all');
  const [recvDrugTypeFilter, setRecvDrugTypeFilter] = useState('all');

  const requisitionFiltersActive = searchQ.trim() !== ''
    || (dateFilter?.quick && dateFilter.quick !== 'all')
    || statusFilter !== 'all'
    || typeFilter !== 'all'
    || categoryFilter !== 'all';

  const receivingFiltersActive = recvSearchQ.trim() !== ''
    || (recvDateFilter?.quick && recvDateFilter.quick !== 'all')
    || recvStatusFilter !== 'all'
    || recvTypeFilter !== 'all'
    || recvDrugTypeFilter !== 'all';

  const { showClearChip, resultsOpaque, clearFilters: clearRequisitionFilters } = useSmoothClearFilters(
    requisitionFiltersActive,
    () => {
      setSearchQ('');
      setDateFilter(DEFAULT_DATE_FILTER);
      setStatusFilter('all');
      setTypeFilter('all');
      setCategoryFilter('all');
    },
  );

  const {
    showClearChip: showRecvClearChip,
    resultsOpaque: recvResultsOpaque,
    clearFilters: clearReceivingFilters,
  } = useSmoothClearFilters(
    receivingFiltersActive,
    () => {
      setRecvSearchQ('');
      setRecvDateFilter(DEFAULT_DATE_FILTER);
      setRecvStatusFilter('all');
      setRecvTypeFilter('all');
      setRecvDrugTypeFilter('all');
    },
  );

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const handleSort = (key) => {
    setSortConfig((prev) => (
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    ));
  };

  const [recvSortConfig, setRecvSortConfig] = useState({ key: null, direction: 'asc' });
  const handleRecvSort = (key) => {
    setRecvSortConfig((prev) => (
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    ));
  };

  const filteredRequisitions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return REQUISITIONS.filter((r) => {
      if (!matchesRequestedAtFilter(r.requestedAt, dateFilter)) return false;
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
  }, [renderTick, searchQ, dateFilter, statusFilter, typeFilter, categoryFilter]);

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

  const filteredReceiving = useMemo(() => {
    const q = recvSearchQ.trim().toLowerCase();
    return RECEIVING_RECORDS.filter((r) => {
      if (!matchesRequestedAtFilter(r.receivedAt, recvDateFilter)) return false;
      if (recvStatusFilter === 'cancelled' && r.status !== 'cancelled') return false;
      if (recvStatusFilter === 'received' && r.status === 'cancelled') return false;
      if (recvTypeFilter !== 'all' && r.receivingType !== recvTypeFilter) return false;
      if (recvDrugTypeFilter !== 'all' && r.drugType !== recvDrugTypeFilter) return false;
      if (!q) return true;
      return (
        (r.drugName || '').toLowerCase().includes(q)
        || (r.receiptNo || '').toLowerCase().includes(q)
        || (r.lot || '').toLowerCase().includes(q)
        || (r.poNumber || '').toLowerCase().includes(q)
        || (r.deliveryNoteNumber || '').toLowerCase().includes(q)
        || (r.receivedFrom || '').toLowerCase().includes(q)
        || (r.department || '').toLowerCase().includes(q)
        || (r.scanCode || '').toLowerCase().includes(q)
      );
    });
  }, [renderTick, recvSearchQ, recvDateFilter, recvStatusFilter, recvTypeFilter, recvDrugTypeFilter]);

  const sortedReceiving = useMemo(() => {
    if (!recvSortConfig.key) return filteredReceiving;
    const sign = recvSortConfig.direction === 'desc' ? -1 : 1;
    const normalize = (row, key) => {
      switch (key) {
        case 'receivingType': return RECEIVING_TYPE_LABEL[row.receivingType] || '';
        case 'unit': return row.unit || resolveUnitLabel(row) || '';
        case 'status': return row.status === 'cancelled'
          ? RECEIVING_STATUS_PILL.cancelled.label
          : 'รับเข้าแล้ว';
        case 'expiryDate':
        case 'receivedAt': return row[key] || '';
        case 'seq':
        case 'quantity':
        case 'costPrice':
        case 'salePrice':
        case 'claimablePrice': return typeof row[key] === 'number' ? row[key] : Number(row[key]) || 0;
        default: return row[key] ?? '';
      }
    };
    const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
    return [...filteredReceiving].sort((a, b) => {
      const av = normalize(a, recvSortConfig.key);
      const bv = normalize(b, recvSortConfig.key);
      const primary = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : collator.compare(String(av), String(bv));
      return sign * primary;
    });
  }, [filteredReceiving, recvSortConfig]);

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
    const qty = Number(editForm.packQty) || 0;
    const packQty = editForm.packQty === '' ? '' : String(qty || '');
    updateRequisition(editingReq.id, {
      drugName: editForm.drugName,
      quantity: qty,
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

  const statusTabs = useMemo(
    () => TABS.map((t) => ({ ...t, count: tabCounts[t.key] })),
    [tabCounts],
  );

  const handleTabChange = (key) => {
    setActiveTab(key);
    setShowCreateReq(false);
    setShowCreateRecv(false);
  };

  const printRows = activeTab === 'requisition' ? sortedRequisitions : sortedReceiving;

  return (
    <>
      <PharmacyRequisitionPrint
        title={activeTab === 'requisition' ? 'ใบเบิกยา/เวชภัณฑ์' : 'ใบรับยา/เวชภัณฑ์เข้าคลังใหญ่'}
        columns={activeTab === 'requisition' ? REQUISITION_COLUMNS : RECEIVING_COLUMNS}
        rows={printRows}
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
            <StickyStatusTabBar
              aria-label='เลือกประเภทรายการ'
              tabs={statusTabs}
              value={activeTab}
              onChange={handleTabChange}
            />

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
                  <FilterDateTag
                    prefix='วันที่ขอเบิก:'
                    value={dateFilter}
                    onChange={setDateFilter}
                    defaultQuick='all'
                    quickLabels={{ all: 'ทั้งหมด' }}
                    placeholder='ทั้งหมด'
                    selectedWhen={(v) => v?.quick && v.quick !== 'all'}
                  />
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
                  <ClearFiltersTag active={showClearChip} onClear={clearRequisitionFilters} />
                  <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)', marginLeft: 'auto' }}>
                    <NeutralSubdueButton size='sm' variant='outline' leadingIcon='print' onClick={() => window.print()}>
                      พิมพ์ใบเบิกยา
                    </NeutralSubdueButton>
                    <BrandButton size='sm' leadingIcon='add' onClick={() => setShowCreateReq(true)}>
                      สร้างคำขอเบิก
                    </BrandButton>
                  </div>
                </div>
                <SmoothFilterResults opaque={resultsOpaque}>
                  <SearchResultCount found={sortedRequisitions.length} total={REQUISITIONS.length} />
                  <Table
                    columns={[...REQUISITION_COLUMNS, REQUISITION_ACTIONS_COLUMN]}
                    rows={sortedRequisitions}
                    rowKey={(r) => r.id}
                    stickyColCount={4}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    stickyHeaderTop={QUEUE_STICKY_UNDER_STATUS_TABS}
                    emptyMessage={requisitionFiltersActive ? 'ไม่พบรายการที่ตรงกับเงื่อนไข' : 'ไม่มีคำขอเบิกจ่าย'}
                  />
                </SmoothFilterResults>
              </div>
            ) : (
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <div className='w-full flex items-start justify-center'>
                  <PrimarySearch
                    value={recvSearchQ}
                    onChange={setRecvSearchQ}
                    onSubmit={(v) => setRecvSearchQ(v)}
                    placeholder='ค้นหาเลขที่ใบรับ / ชื่อยา / Lot / เลขที่ใบสั่งซื้อ'
                    width={640}
                  />
                </div>
                <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
                  <FilterDateTag
                    prefix='วันที่รับเข้า:'
                    value={recvDateFilter}
                    onChange={setRecvDateFilter}
                    defaultQuick='all'
                    quickLabels={{ all: 'ทั้งหมด' }}
                    placeholder='ทั้งหมด'
                    selectedWhen={(v) => v?.quick && v.quick !== 'all'}
                  />
                  <FilterDropdown
                    prefix='สถานะ:'
                    options={RCV_STATUS_FILTER_OPTIONS}
                    value={recvStatusFilter}
                    onChange={setRecvStatusFilter}
                  />
                  <FilterDropdown
                    prefix='ประเภทการรับ:'
                    options={RCV_TYPE_FILTER_OPTIONS}
                    value={recvTypeFilter}
                    onChange={setRecvTypeFilter}
                  />
                  <FilterDropdown
                    prefix='แหล่งยา:'
                    options={RCV_DRUG_TYPE_FILTER_OPTIONS}
                    value={recvDrugTypeFilter}
                    onChange={setRecvDrugTypeFilter}
                  />
                  <ClearFiltersTag active={showRecvClearChip} onClear={clearReceivingFilters} />
                  <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)', marginLeft: 'auto' }}>
                    <NeutralSubdueButton size='sm' variant='outline' leadingIcon='print' onClick={() => window.print()}>
                      พิมพ์ใบรับยา
                    </NeutralSubdueButton>
                    <BrandButton size='sm' leadingIcon='add' onClick={() => setShowCreateRecv(true)}>
                      บันทึกรับเข้าคลัง
                    </BrandButton>
                  </div>
                </div>
                <SmoothFilterResults opaque={recvResultsOpaque}>
                  <SearchResultCount found={sortedReceiving.length} total={RECEIVING_RECORDS.length} />
                  <Table
                    columns={[...RECEIVING_COLUMNS, RECEIVING_ACTIONS_COLUMN]}
                    rows={sortedReceiving}
                    rowKey={(r) => r.id}
                    stickyColCount={4}
                    sortConfig={recvSortConfig}
                    onSort={handleRecvSort}
                    stickyHeaderTop={QUEUE_STICKY_UNDER_STATUS_TABS}
                    emptyMessage={receivingFiltersActive ? 'ไม่พบรายการที่ตรงกับเงื่อนไข' : 'ไม่มีรายการรับเข้าคลัง'}
                  />
                </SmoothFilterResults>
              </div>
            )}
          </div>
        </div>
      </QueuePageShell>
      </div>
      <NewRequisitionPopup
        open={showCreateReq}
        onClose={() => setShowCreateReq(false)}
        onCreate={(payload) => {
          createRequisition(payload);
          setShowCreateReq(false);
          bump();
        }}
      />
      <NewReceivingPopup
        open={showCreateRecv}
        onClose={() => setShowCreateRecv(false)}
        onCreate={(payload) => {
          createReceivingRecord(payload);
          setShowCreateRecv(false);
          bump();
        }}
      />
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
          disabled: !editForm?.drugName
            || !(Number(editForm?.packQty) > 0)
            || !editForm?.targetUnit
            || !editForm?.itemCategory
            || !editForm?.requisitionType,
        }}
        secondaryAction={{
          label: 'ปิด',
          onClick: closeEditReq,
        }}
      >
        {editForm && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <div
              style={{
                ...REQ_FORM_GRID,
                paddingLeft: REQ_FORM_LINE_INSET,
                paddingRight: REQ_FORM_LINE_INSET,
              }}
            >
              <div className='min-w-0'>
                <Select
                  label='ศูนย์บริการสาธารณสุขผู้ขอเบิก'
                  value={editForm.requestingCenter}
                  onChange={() => {}}
                  options={CLINIC_OPTIONS.map((c) => ({ value: c.value, label: c.label }))}
                  searchable={false}
                  showHelperText={false}
                  disabled
                  className='w-full'
                  style={{ width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div className='min-w-0'>
                <Select
                  label='หน่วยงานที่ส่งคำร้องไป'
                  value={editForm.targetUnit}
                  onChange={(v) => patchEditForm({ targetUnit: v })}
                  options={REQUISITION_TARGETS.map((t) => ({ value: t.key, label: t.label }))}
                  searchable={false}
                  showHelperText={false}
                  required
                  className='w-full'
                  style={{ width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div className='min-w-0'>
                <Select
                  label='ประเภทรายการ'
                  value={editForm.itemCategory}
                  onChange={(v) => patchEditForm({ itemCategory: v })}
                  options={REQUISITION_ITEM_CATEGORIES.map((c) => ({ value: c.key, label: c.label }))}
                  searchable={false}
                  showHelperText={false}
                  required
                  className='w-full'
                  style={{ width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div className='min-w-0'>
                <Select
                  label='ประเภทการเบิก'
                  value={editForm.requisitionType}
                  onChange={(v) => patchEditForm({ requisitionType: v })}
                  options={REQUISITION_TYPES.map((t) => ({ value: t.key, label: t.label }))}
                  searchable={false}
                  showHelperText={false}
                  required
                  className='w-full'
                  style={{ width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div
              className='w-full'
              style={{
                ...REQ_FORM_GRID,
                paddingLeft: REQ_FORM_LINE_INSET,
                paddingRight: REQ_FORM_LINE_INSET,
              }}
            >
              <div className='min-w-0' style={{ gridColumn: '1 / span 2', maxWidth: '100%' }}>
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
                  className='w-full'
                  style={{ width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div className='min-w-0' style={{ maxWidth: '100%' }}>
                <Field label='จำนวนที่ขอเบิก'>
                  <Stepper
                    min={1}
                    value={editForm.packQty === '' || editForm.packQty == null
                      ? null
                      : Number(editForm.packQty)}
                    onChange={(n) => patchEditForm({
                      packQty: n == null || Number.isNaN(n) ? '' : String(n),
                    })}
                    aria-label='จำนวนที่ขอเบิก'
                  />
                </Field>
              </div>
              <div className='min-w-0' style={{ maxWidth: '100%' }}>
                <InputField
                  label='หน่วยนับ'
                  value={registryUnitLabel(editForm.unitKey)}
                  onChange={() => {}}
                  disabled
                  showHelperText={false}
                  style={{ width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ paddingLeft: REQ_FORM_LINE_INSET, paddingRight: REQ_FORM_LINE_INSET }}>
              <Textarea
                label='หมายเหตุ'
                value={editForm.notes}
                onChange={(v) => patchEditForm({ notes: v })}
                placeholder='(ถ้ามี)'
                rows={3}
                showHelperText={Boolean(editingReq?.status === 'approved')}
                helperText={editingReq?.status === 'approved'
                  ? 'รายการนี้อนุมัติแล้ว — เมื่อบันทึกจะกลับเป็นรอดำเนินการและล้างจำนวนอนุมัติ'
                  : undefined}
                style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}
              />
            </div>
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
