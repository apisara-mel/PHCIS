import React, { useEffect, useMemo, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import Badge from '@/components/badge/Badge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import SuccessToast from '@/components/toast/SuccessToast';
import Popup from '@/components/popup/Popup';
import Pagination from '@/components/pagination/Pagination';
import FilterDateTag from '@/components/forms/FilterDateTag';
import FilterTag from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import PharmacySubNav, { PharmacyHeaderActions } from '@/components/pharmacy/PharmacySubNav';
import PharmacySectionTopic from '@/components/pharmacy/PharmacySectionTopic';
import { DonutWithLegend, HBarList, VBars, Reveal } from '@/components/graph/Charts';
import PHCIS_CHART, { PHCIS_CHART_PALETTE } from '@/data/phcisChartPalette';
import {
  ExportFormatPopup,
  DateInputBox,
  buildReportTableColumns,
} from '@/pages/consent/consentExportPopup';
import { sanitizeExportReportMeta } from '@/utils/exportPiiSanitize';
import { buildUnifiedPharmacyReportSummaryCards } from '@/pages/pharmacy/pharmacySummaryCards';
import {
  PHARMACY_QUEUE,
  PHARMACY_USAGE_HISTORY,
  DISPENSE_STATUS,
  REQUISITIONS,
  RECEIVING_RECORDS,
  RECEIVING_TYPES,
  REQUISITION_TYPES,
  REQUISITION_ITEM_CATEGORIES,
  REQUISITION_TARGETS,
  MAIN_WAREHOUSE_STOCK,
  allSubWarehouseRows,
  getSubStockMap,
  nearExpiryEntries,
  reorderNeededEntries,
  listSubWarehouses,
} from '@/data/pharmacyQueue';
import {
  DRUG_REGISTRY,
  DRUG_CLASSIFICATIONS,
  UNIT_TYPES,
  getRegistryDrug,
  currentPrice,
} from '@/data/pharmacyRegistry';
import { MR_PATIENTS, lifeStatusLabel } from '@/data/mrPatients';
import { CLINIC_OPTIONS } from '@/components/layout/HeaderClinicContext';
import { computeQuickRange, computeQuickSingle } from '@/components/popup/DateFilterPopup';

/* รายงานระบบงานเภสัชกรรม — หน้าเดียวรวมทุกโดเมน (PharmacySubNav → /pharmacy/reports):
   จ่ายยา · ผู้รับบริการ · ทะเบียนยา · เบิกจ่าย · รับเข้าคลัง · คลังยา
   ใช้ FilterDateTag (default เดือนนี้) — กราฟ/สรุปด้านล่างตามช่วงวัน
   + นำส่งออกรายงานรายหัวข้อ/ทั้งหมดผ่าน ExportFormatPopup (แบบ consent). */

const REPORT_SOURCE_ROWS = [...PHARMACY_QUEUE, ...PHARMACY_USAGE_HISTORY];

const breadcrumb = ['ระบบงานเภสัชกรรม', 'รายงาน'];

const DEFAULT_DATE_FILTER = { quick: 'thismonth' };

const EXPORT_GROUP_KEYS = {
  dispense: ['dispense-detail', 'dispense-summary'],
  patients: ['patients-roster', 'patients-service'],
  registry: ['registry-new', 'registry-all'],
  requisition: ['requisition'],
  receiving: ['receiving'],
  stock: ['stock'],
};

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const toIsoDate = (d) => {
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

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

const matchesIsoDateFilter = (iso, value) => {
  const range = resolveDateFilterRange(value);
  if (!range) return true;
  if (!iso) return false;
  const d = startOfDay(new Date(`${String(iso).slice(0, 10)}T00:00:00`));
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() >= range.start.getTime() && d.getTime() <= range.end.getTime();
};

const rangeBoundsIso = (value) => {
  const range = resolveDateFilterRange(value);
  if (!range) {
    /* "ทั้งหมด" — wide window so dispense builders still work with ISO compare. */
    return { from: '2000-01-01', to: '2100-12-31' };
  }
  return {
    from: toIsoDate(range.start),
    to: toIsoDate(range.end),
  };
};

const PHARMACY_EXPORT_FOOTER = 'ออกเอกสารโดยระบบงานเภสัชกรรม (PHCIS)';

/** Flatten table columns/rows into ExportFormatPopup catalog shape (plain values + optional _iso). */
const buildExportReport = (key, title, columns, rows, isoOf) => ({
  key,
  title,
  table: {
    columns: columns.map((c) => ({ key: c.key, header: c.label || c.header || c.key })),
    rows: (rows || []).map((r) => {
      const out = {};
      const iso = typeof isoOf === 'function' ? isoOf(r) : '';
      if (iso) out._iso = String(iso).slice(0, 10);
      columns.forEach((c) => {
        if (typeof c.csv === 'function') out[c.key] = c.csv(r);
        else if (r[c.key] == null || r[c.key] === '') out[c.key] = '';
        else if (typeof r[c.key] === 'object') out[c.key] = '';
        else out[c.key] = r[c.key];
      });
      return out;
    }),
  },
});

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const formatIsoDateThai = (iso) => {
  if (!iso) return '—';
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
};
const formatRangeLabel = (from, to, dateFilter) => {
  if (!dateFilter?.quick || dateFilter.quick === 'all') return 'ทั้งหมด';
  if (from === to) return `วันที่ ${formatIsoDateThai(from)}`;
  return `${formatIsoDateThai(from)} – ${formatIsoDateThai(to)}`;
};

const STATUS_PILL = {
  [DISPENSE_STATUS.WAITING]:   { style: 'warning', label: 'รอเรียก'      },
  [DISPENSE_STATUS.CALLED]:    { style: 'info',    label: 'เรียกแล้ว'    },
  [DISPENSE_STATUS.PREPARING]: { style: 'info',    label: 'จัดยา'        },
  [DISPENSE_STATUS.DISPENSED]: { style: 'success', label: 'จ่ายแล้ว'     },
  [DISPENSE_STATUS.PARTIAL]:   { style: 'warning', label: 'จ่ายบางส่วน'  },
  [DISPENSE_STATUS.NO_SHOW]:   { style: 'neutral', label: 'ไม่มารับยา'   },
  [DISPENSE_STATUS.PROBLEM]:   { style: 'error',   label: 'มีปัญหา'      },
  [DISPENSE_STATUS.CANCELLED]: { style: 'neutral', label: 'ยกเลิก'       },
};

const REQ_STATUS_PILL = {
  pending:   { style: 'warning', label: 'รอดำเนินการ' },
  approved:  { style: 'info',    label: 'อนุมัติแล้ว'  },
  fulfilled: { style: 'success', label: 'เบิกจ่ายแล้ว' },
  cancelled: { style: 'error',   label: 'ยกเลิกแล้ว'   },
};

const REQUISITION_TYPE_LABEL = Object.fromEntries(REQUISITION_TYPES.map((t) => [t.key, t.label]));
const ITEM_CATEGORY_LABEL = Object.fromEntries(REQUISITION_ITEM_CATEGORIES.map((c) => [c.key, c.label]));
const REQUISITION_TARGET_LABEL = Object.fromEntries(REQUISITION_TARGETS.map((t) => [t.key, t.label]));
const CLINIC_LABEL = Object.fromEntries(CLINIC_OPTIONS.map((c) => [c.value, c.label]));
const RECEIVING_TYPE_LABEL = Object.fromEntries(RECEIVING_TYPES.map((t) => [t.key, t.label]));

const PATIENT_STATUS_PILL = {
  active:   { style: 'success', label: 'Active' },
  inactive: { style: 'neutral', label: 'Inactive' },
  pending:  { style: 'warning', label: 'รอลงทะเบียน' },
  draft:    { style: 'info',    label: 'ที่ร่างไว้' },
};

const CLASSIFICATION_LABEL = Object.fromEntries(DRUG_CLASSIFICATIONS.map((c) => [c.key, c.label]));
const UNIT_LABEL = Object.fromEntries(UNIT_TYPES.map((u) => [u.key, u.label]));

const formatMrPatientName = (p) => `${p.prefixTh || ''}${p.firstNameTh || ''} ${p.lastNameTh || ''}`.trim();

/* Match consent dashboard ReportCard chrome (border + soft shadow). */
const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600)',
};

/** Inner chart panel — same border as consent donut/hbar panels. */
const CHART_PANEL = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--dim-space-400)',
  minHeight: '100%',
  minWidth: 'min(100%, 280px)',
  flex: '1 1 280px',
  padding: 'var(--dim-space-400)',
  borderRadius: 'var(--dim-radius-400)',
  background: 'var(--surface-card-100)',
  border: 'var(--dim-stroke-100) solid var(--border-card-default)',
  boxSizing: 'border-box',
  overflow: 'hidden',
};

const DETAIL_COLUMNS = [
  { key: 'queueNo', label: 'เลขที่ใบสั่งยา', render: (r) => <Badge style='success' size='small'>{r.queueNo}</Badge>, csv: (r) => r.queueNo },
  {
    key: 'patient', label: 'ผู้ป่วย', flex: true, minWidth: 200,
    render: (r) => (
      <div className='flex flex-col min-w-0'>
        <span>{r.patientName}</span>
        <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>HN {r.hn}</span>
      </div>
    ),
    csv: (r) => `${r.patientName} (HN ${r.hn})`,
  },
  { key: 'items', label: 'รายการยา', flex: true, minWidth: 220, render: (r) => r.items.map((i) => i.name).join(', '), csv: (r) => r.items.map((i) => i.name).join('; ') },
  { key: 'issuedDate', label: 'วันที่สั่งยา', render: (r) => formatIsoDateThai(r.issuedDate), csv: (r) => r.issuedDate },
  { key: 'issuedAt', label: 'เวลาสั่งยา' },
  { key: 'dispensedAt', label: 'เวลาจ่ายยา', render: (r) => r.dispensedAt || '—', csv: (r) => r.dispensedAt || '' },
  { key: 'verifiedBy', label: 'เภสัชกรผู้ตรวจสอบ', render: (r) => r.verifiedBy || '—', csv: (r) => r.verifiedBy || '' },
  { key: 'status', label: 'สถานะ', render: (r) => <Badge style={(STATUS_PILL[r.status] || STATUS_PILL[DISPENSE_STATUS.WAITING]).style} size='small'>{(STATUS_PILL[r.status] || { label: r.status }).label}</Badge>, csv: (r) => (STATUS_PILL[r.status] || { label: r.status }).label },
];

const SUMMARY_COLUMNS = [
  { key: 'name', label: 'ชื่อยา', flex: true, minWidth: 220 },
  { key: 'prescriptionCount', label: 'จำนวนใบสั่งยา', align: 'center' },
  { key: 'totalQuantity', label: 'จำนวนสั่ง', align: 'center', render: (r) => `${r.totalQuantity.toLocaleString()} ${r.unit}`, csv: (r) => `${r.totalQuantity} ${r.unit}` },
  { key: 'totalDispensed', label: 'จำนวนจ่ายแล้ว', align: 'center', render: (r) => `${r.totalDispensed.toLocaleString()} ${r.unit}`, csv: (r) => `${r.totalDispensed} ${r.unit}` },
  { key: 'totalValue', label: 'มูลค่ารวม (โดยประมาณ)', align: 'right', render: (r) => `฿${r.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, csv: (r) => r.totalValue.toFixed(2) },
];

const REQUISITION_REPORT_COLUMNS = [
  { key: 'requisitionNo', label: 'เลขที่คำขอ' },
  { key: 'requestedAt', label: 'วันที่ขอเบิก', render: (r) => formatIsoDateThai(r.requestedAt), csv: (r) => r.requestedAt },
  { key: 'drugName', label: 'ชื่อยา', flex: true, minWidth: 200 },
  { key: 'itemCategory', label: 'ประเภทรายการ', render: (r) => ITEM_CATEGORY_LABEL[r.itemCategory] || '—', csv: (r) => ITEM_CATEGORY_LABEL[r.itemCategory] || '' },
  { key: 'quantity', label: 'จำนวน', align: 'center', render: (r) => `${Number(r.quantity || 0).toLocaleString()} ${r.unit || ''}`.trim(), csv: (r) => `${r.quantity} ${r.unit || ''}`.trim() },
  { key: 'requisitionType', label: 'ประเภทการเบิก', render: (r) => REQUISITION_TYPE_LABEL[r.requisitionType] || '—', csv: (r) => REQUISITION_TYPE_LABEL[r.requisitionType] || '' },
  { key: 'requestingCenter', label: 'ศูนย์ที่ขอเบิก', flex: true, minWidth: 180, render: (r) => CLINIC_LABEL[r.requestingCenter] || r.requestingCenter || '—', csv: (r) => CLINIC_LABEL[r.requestingCenter] || r.requestingCenter || '' },
  { key: 'targetUnit', label: 'ส่งไปยัง', flex: true, minWidth: 160, render: (r) => REQUISITION_TARGET_LABEL[r.targetUnit] || '—', csv: (r) => REQUISITION_TARGET_LABEL[r.targetUnit] || '' },
  { key: 'requestedBy', label: 'ผู้ขอเบิก', flex: true, minWidth: 160 },
  { key: 'status', label: 'สถานะ', render: (r) => <Badge style={(REQ_STATUS_PILL[r.status] || REQ_STATUS_PILL.pending).style} size='small'>{(REQ_STATUS_PILL[r.status] || { label: r.status }).label}</Badge>, csv: (r) => (REQ_STATUS_PILL[r.status] || { label: r.status }).label },
];

const RECEIVING_REPORT_COLUMNS = [
  { key: 'receiptNo', label: 'เลขที่ใบรับ' },
  { key: 'receivedAt', label: 'วันที่รับเข้า', render: (r) => formatIsoDateThai(r.receivedAt), csv: (r) => r.receivedAt },
  { key: 'drugName', label: 'ชื่อยา', flex: true, minWidth: 200 },
  { key: 'drugType', label: 'แหล่งยา', align: 'center' },
  { key: 'quantity', label: 'จำนวน', align: 'center', render: (r) => `${Number(r.quantity || 0).toLocaleString()} ${r.unit || ''}`.trim(), csv: (r) => `${r.quantity} ${r.unit || ''}`.trim() },
  { key: 'lot', label: 'Lot No.' },
  { key: 'expiryDate', label: 'วันหมดอายุ', render: (r) => formatIsoDateThai(r.expiryDate), csv: (r) => r.expiryDate },
  { key: 'receivingType', label: 'ประเภทการรับ', render: (r) => RECEIVING_TYPE_LABEL[r.receivingType] || '—', csv: (r) => RECEIVING_TYPE_LABEL[r.receivingType] || '' },
  { key: 'receivedFrom', label: 'รับจาก', flex: true, minWidth: 180 },
  { key: 'poNumber', label: 'เลขที่ใบสั่งซื้อ', render: (r) => r.poNumber || '—', csv: (r) => r.poNumber || '' },
  {
    key: 'status',
    label: 'สถานะ',
    render: (r) => (r.status === 'cancelled'
      ? <Badge style='error' size='small'>ยกเลิกแล้ว</Badge>
      : <Badge style='success' size='small'>รับเข้าแล้ว</Badge>),
    csv: (r) => (r.status === 'cancelled' ? 'ยกเลิกแล้ว' : 'รับเข้าแล้ว'),
  },
];

const PATIENT_ROSTER_COLUMNS = [
  { key: 'hn', label: 'HN' },
  {
    key: 'name',
    label: 'ชื่อ-นามสกุล',
    flex: true,
    minWidth: 200,
    render: (r) => r.name,
    csv: (r) => r.name,
  },
  { key: 'age', label: 'อายุ', align: 'center', render: (r) => (r.age != null ? `${r.age}` : '—'), csv: (r) => r.age ?? '' },
  { key: 'gender', label: 'เพศ', align: 'center', render: (r) => r.gender || '—', csv: (r) => r.gender || '' },
  { key: 'rights', label: 'สิทธิการรักษา', flex: true, minWidth: 140, render: (r) => r.rights || '—', csv: (r) => r.rights || '' },
  { key: 'phone', label: 'เบอร์โทร', render: (r) => r.phone || '—', csv: (r) => r.phone || '' },
  {
    key: 'lifeStatus',
    label: 'สถานะชีวิต',
    render: (r) => <Badge style={r.lifeStatus === 'deceased' ? 'neutral' : 'success'} size='small'>{lifeStatusLabel(r.lifeStatus)}</Badge>,
    csv: (r) => lifeStatusLabel(r.lifeStatus),
  },
  {
    key: 'status',
    label: 'สถานะทะเบียน',
    render: (r) => <Badge style={(PATIENT_STATUS_PILL[r.status] || PATIENT_STATUS_PILL.active).style} size='small'>{(PATIENT_STATUS_PILL[r.status] || { label: r.status }).label}</Badge>,
    csv: (r) => (PATIENT_STATUS_PILL[r.status] || { label: r.status }).label,
  },
  {
    key: 'allergies',
    label: 'แพ้ยา',
    flex: true,
    minWidth: 160,
    render: (r) => (r.allergyCount > 0 ? <Badge style='error' size='small'>{r.allergyCount} รายการ</Badge> : '—'),
    csv: (r) => (r.allergyLabels || ''),
  },
  {
    key: 'chronic',
    label: 'โรคเรื้อรัง',
    flex: true,
    minWidth: 160,
    render: (r) => (r.chronicCount > 0 ? <Badge style='warning' size='small'>{r.chronicCount} รายการ</Badge> : '—'),
    csv: (r) => (r.chronicLabels || ''),
  },
];

const REGISTRY_REPORT_COLUMNS = [
  { key: 'code', label: 'รหัสยา' },
  { key: 'name', label: 'ชื่อยา', flex: true, minWidth: 220 },
  { key: 'genericName', label: 'ชื่อสามัญ', flex: true, minWidth: 160, render: (r) => r.genericName || '—', csv: (r) => r.genericName || '' },
  { key: 'classification', label: 'ประเภท', flex: true, minWidth: 180, render: (r) => CLASSIFICATION_LABEL[r.classification] || r.classification || '—', csv: (r) => CLASSIFICATION_LABEL[r.classification] || r.classification || '' },
  { key: 'unit', label: 'หน่วยนับ', align: 'center', render: (r) => UNIT_LABEL[r.unit] || r.unit || '—', csv: (r) => UNIT_LABEL[r.unit] || r.unit || '' },
  { key: 'price', label: 'ราคาปัจจุบัน', align: 'right', render: (r) => `฿${Number(r.price || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, csv: (r) => Number(r.price || 0).toFixed(2) },
  {
    key: 'highAlert',
    label: 'High Alert',
    align: 'center',
    render: (r) => (r.highAlert ? <Badge style='error' size='small'>High Alert</Badge> : '—'),
    csv: (r) => (r.highAlert ? 'Yes' : 'No'),
  },
  {
    key: 'active',
    label: 'สถานะ',
    render: (r) => <Badge style={r.active ? 'success' : 'neutral'} size='small'>{r.active ? 'ใช้งาน' : 'ปิดใช้งาน'}</Badge>,
    csv: (r) => (r.active ? 'ใช้งาน' : 'ปิดใช้งาน'),
  },
  { key: 'activeFrom', label: 'วันที่เพิ่ม/เริ่มจำหน่าย', render: (r) => formatIsoDateThai(r.activeFrom), csv: (r) => r.activeFrom || '' },
  { key: 'manufacturer', label: 'ผู้ผลิต', flex: true, minWidth: 180, render: (r) => r.manufacturer || '—', csv: (r) => r.manufacturer || '' },
];

const PATIENT_SERVICE_COLUMNS = [
  { key: 'hn', label: 'HN' },
  { key: 'patientName', label: 'ชื่อ-นามสกุล', flex: true, minWidth: 200 },
  { key: 'visitCount', label: 'จำนวนใบสั่งยา', align: 'center' },
  { key: 'dispensedCount', label: 'จ่ายแล้ว/บางส่วน', align: 'center' },
  { key: 'problemCount', label: 'มีปัญหา/ไม่มารับ', align: 'center' },
  { key: 'drugItemCount', label: 'รายการยาทั้งหมด', align: 'center' },
  { key: 'lastIssuedDate', label: 'วันล่าสุด', render: (r) => formatIsoDateThai(r.lastIssuedDate), csv: (r) => r.lastIssuedDate || '' },
  {
    key: 'lastStatus',
    label: 'สถานะล่าสุด',
    render: (r) => <Badge style={(STATUS_PILL[r.lastStatus] || STATUS_PILL[DISPENSE_STATUS.WAITING]).style} size='small'>{(STATUS_PILL[r.lastStatus] || { label: r.lastStatus }).label}</Badge>,
    csv: (r) => (STATUS_PILL[r.lastStatus] || { label: r.lastStatus }).label,
  },
];

const STOCK_ALERT_COLUMNS = [
  { key: 'tier', label: 'ชั้นคลัง', render: (r) => <Badge style={r.tier === 'main' ? 'info' : 'neutral'} size='small'>{r.tierLabel}</Badge>, csv: (r) => r.tierLabel },
  { key: 'warehouseName', label: 'คลัง', flex: true, minWidth: 180, render: (r) => r.warehouseName || '—', csv: (r) => r.warehouseName || '' },
  { key: 'name', label: 'ชื่อยา', flex: true, minWidth: 220 },
  { key: 'stock', label: 'คงคลัง', align: 'center', render: (r) => `${Number(r.stock || 0).toLocaleString()} ${r.unit || ''}`.trim(), csv: (r) => `${r.stock} ${r.unit || ''}`.trim() },
  { key: 'expiryDate', label: 'วันหมดอายุ', render: (r) => formatIsoDateThai(r.expiryDate), csv: (r) => r.expiryDate || '' },
  { key: 'reorderPoint', label: 'จุดสั่งซื้อ', align: 'center', render: (r) => (r.reorderPoint != null ? String(r.reorderPoint) : '—'), csv: (r) => r.reorderPoint ?? '' },
  {
    key: 'alerts',
    label: 'การแจ้งเตือน',
    flex: true,
    minWidth: 200,
    sortable: false,
    render: (r) => (
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
        {r.nearExpiry ? <Badge style='warning' size='small'>ใกล้หมดอายุ</Badge> : null}
        {r.needsReorder ? <Badge style='error' size='small'>ต่ำกว่าจุดสั่งซื้อ</Badge> : null}
      </div>
    ),
    csv: (r) => [r.nearExpiry ? 'ใกล้หมดอายุ' : null, r.needsReorder ? 'ต่ำกว่าจุดสั่งซื้อ' : null].filter(Boolean).join('; '),
  },
];

const buildDetailRows = (from, to) => REPORT_SOURCE_ROWS.filter((r) => r.issuedDate >= from && r.issuedDate <= to);

const buildPatientRosterRows = () => (
  MR_PATIENTS.map((p) => ({
    id: p.hn,
    hn: p.hn,
    name: formatMrPatientName(p),
    age: p.age,
    gender: p.gender,
    rights: p.rights,
    phone: p.phone,
    lifeStatus: p.lifeStatus || 'alive',
    status: p.status,
    allergyCount: (p.drugAllergies || []).length,
    allergyLabels: (p.drugAllergies || []).map((a) => a.name).join('; '),
    chronicCount: (p.chronicDiseases || []).length,
    chronicLabels: (p.chronicDiseases || []).map((c) => c.name).join('; '),
    drugAllergies: p.drugAllergies,
    chronicDiseases: p.chronicDiseases,
    flags: p.flags,
  }))
);

const buildRegistryReportRows = () => (
  DRUG_REGISTRY
    .map((d) => ({
      id: d.id,
      code: d.code,
      name: d.name,
      genericName: d.genericName,
      classification: d.classification,
      unit: d.unit,
      price: currentPrice(d),
      highAlert: Boolean(d.highAlert),
      active: Boolean(d.active),
      activeFrom: d.activeFrom || '',
      manufacturer: d.manufacturer,
    }))
    .sort((a, b) => String(b.activeFrom || '').localeCompare(String(a.activeFrom || ''))
      || a.name.localeCompare(b.name, 'th'))
);

const buildPatientServiceRows = (from, to) => {
  const byHn = new Map();
  buildDetailRows(from, to).forEach((row) => {
    const hn = row.hn || '—';
    const entry = byHn.get(hn) || {
      id: hn,
      hn,
      patientName: row.patientName || hn,
      visitCount: 0,
      dispensedCount: 0,
      problemCount: 0,
      drugItemCount: 0,
      lastIssuedDate: '',
      lastStatus: row.status,
    };
    entry.visitCount += 1;
    entry.drugItemCount += (row.items || []).length;
    if (row.status === DISPENSE_STATUS.DISPENSED || row.status === DISPENSE_STATUS.PARTIAL) {
      entry.dispensedCount += 1;
    }
    if (row.status === DISPENSE_STATUS.PROBLEM || row.status === DISPENSE_STATUS.NO_SHOW) {
      entry.problemCount += 1;
    }
    if (!entry.lastIssuedDate || row.issuedDate >= entry.lastIssuedDate) {
      entry.lastIssuedDate = row.issuedDate;
      entry.lastStatus = row.status;
      entry.patientName = row.patientName || entry.patientName;
    }
    byHn.set(hn, entry);
  });
  return Array.from(byHn.values()).sort((a, b) => b.visitCount - a.visitCount);
};

const buildSummaryRows = (from, to) => {
  const byDrug = new Map();
  REPORT_SOURCE_ROWS.filter((r) => r.issuedDate >= from && r.issuedDate <= to).forEach((row) => {
    (row.items || []).forEach((item) => {
      const entry = byDrug.get(item.name) || {
        name: item.name, unit: item.unit, prescriptionCount: 0, totalQuantity: 0, totalDispensed: 0, totalValue: 0,
      };
      entry.prescriptionCount += 1;
      entry.totalQuantity += item.quantity;
      entry.totalDispensed += item.quantityDispensed || 0;
      const drug = getRegistryDrug(item.name);
      entry.totalValue += item.quantity * currentPrice(drug);
      byDrug.set(item.name, entry);
    });
  });
  return Array.from(byDrug.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
};

const buildStockAlertRows = () => {
  const nearMain = new Set(nearExpiryEntries(MAIN_WAREHOUSE_STOCK).map((e) => e.name));
  const reorderMain = new Map(reorderNeededEntries(MAIN_WAREHOUSE_STOCK).map((e) => [e.name, e]));
  const mainNames = new Set([...nearMain, ...reorderMain.keys()]);
  const mainRows = [...mainNames].map((name) => {
    const entry = MAIN_WAREHOUSE_STOCK[name] || {};
    const reorder = reorderMain.get(name);
    return {
      id: `main-${name}`,
      tier: 'main',
      tierLabel: 'คลังใหญ่',
      warehouseName: 'คลังยาใหญ่ของศูนย์',
      name,
      stock: entry.stock,
      unit: entry.unit,
      expiryDate: entry.expiryDate,
      reorderPoint: reorder?.reorderPoint ?? getRegistryDrug(name)?.usageRate?.reorderPoint ?? null,
      nearExpiry: nearMain.has(name),
      needsReorder: reorderMain.has(name),
    };
  });

  const subRows = listSubWarehouses().flatMap((w) => {
    const map = getSubStockMap(w.id) || {};
    const near = new Set(nearExpiryEntries(map).map((e) => e.name));
    const reorder = new Map(reorderNeededEntries(map).map((e) => [e.name, e]));
    const names = new Set([...near, ...reorder.keys()]);
    return [...names].map((name) => {
      const entry = map[name] || {};
      const reorderRow = reorder.get(name);
      return {
        id: `${w.id}-${name}`,
        tier: 'sub',
        tierLabel: 'คลังย่อย',
        warehouseName: w.name,
        name,
        stock: entry.stock,
        unit: entry.unit,
        expiryDate: entry.expiryDate,
        reorderPoint: reorderRow?.reorderPoint ?? getRegistryDrug(name)?.usageRate?.reorderPoint ?? null,
        nearExpiry: near.has(name),
        needsReorder: reorder.has(name),
      };
    });
  });

  return [...mainRows, ...subRows].sort((a, b) => a.name.localeCompare(b.name, 'th'));
};

const VIEW_PAGE_SIZE = 20;


/** One domain group = one white card (graphs only); ดูรายงาน opens table popup. */
const ReportGroupCard = ({ title, onView, onExport, children }) => (
  <section className='w-full flex flex-col' style={{ ...CARD, gap: 'var(--dim-space-500)' }}>
    <PharmacySectionTopic
      title={title}
      trailing={(
        <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-200)' }}>
          {onView ? (
            <NeutralSubdueButton leadingIcon='visibility' size='sm' collapseLabelBelow='lg' onClick={onView}>
              ดูรายงาน
            </NeutralSubdueButton>
          ) : null}
          {onExport ? (
            <NeutralSubdueButton leadingIcon='ios_share' size='sm' collapseLabelBelow='lg' onClick={onExport}>
              นำส่งออกรายงาน
            </NeutralSubdueButton>
          ) : null}
        </div>
      )}
    />
    {children}
  </section>
);

/** "ดูรายงาน" — table popup like consent (date range · export · pagination). */
const PharmacyReportViewPopup = ({
  open,
  bundle,
  onClose,
  onExportReport,
}) => {
  const reports = bundle?.reports || [];
  const [activeKey, setActiveKey] = useState('');
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState(() => {
    const y = new Date().getFullYear();
    return { start: new Date(y, 0, 1), end: new Date(y, 11, 31) };
  });

  useEffect(() => {
    if (!open || !reports.length) return;
    setActiveKey(reports[0].key);
    setPage(1);
  }, [open, bundle?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeReport = useMemo(
    () => reports.find((r) => r.key === activeKey) || reports[0] || null,
    [reports, activeKey],
  );
  const sanitized = useMemo(
    () => (activeReport ? sanitizeExportReportMeta(activeReport) : null),
    [activeReport],
  );

  const allRows = useMemo(() => {
    if (!sanitized?.table?.rows) return [];
    return sanitized.table.rows.map((r, i) => ({ ...r, _id: i }));
  }, [sanitized]);

  const rows = useMemo(() => {
    const startIso = dateRange.start ? toIsoDate(dateRange.start) : null;
    const endIso = dateRange.end ? toIsoDate(dateRange.end) : null;
    return allRows.filter((r) => {
      if (r._iso && startIso && endIso && (r._iso < startIso || r._iso > endIso)) return false;
      return true;
    });
  }, [allRows, dateRange]);

  useEffect(() => { setPage(1); }, [activeKey, dateRange.start, dateRange.end]);

  const pageCount = Math.max(1, Math.ceil(rows.length / VIEW_PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = rows.slice((safePage - 1) * VIEW_PAGE_SIZE, safePage * VIEW_PAGE_SIZE);
  const columns = sanitized?.table ? buildReportTableColumns(sanitized.table.columns) : [];

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='extraLarge'
      title={bundle?.title || sanitized?.title || 'รายงาน'}
      primaryAction={{ label: 'ปิด', onClick: onClose }}
    >
      {sanitized?.table ? (
        <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
          <div className='flex items-center justify-between flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
              <div className='flex items-end' style={{ gap: 'var(--dim-space-200)' }}>
                <DateInputBox
                  label='วันที่เริ่มต้น'
                  placeholder='เลือกวันที่'
                  value={dateRange.start}
                  onChange={(d) => {
                    setDateRange((prev) => ({
                      start: d,
                      end: prev.end && d && prev.end.getTime() < d.getTime() ? d : prev.end,
                    }));
                  }}
                />
                <span style={{ color: 'var(--text-content-tertiary)', flexShrink: 0 }}>-</span>
                <DateInputBox
                  label='วันที่สิ้นสุด'
                  placeholder='เลือกวันที่'
                  value={dateRange.end}
                  onChange={(d) => setDateRange((prev) => ({ ...prev, end: d }))}
                  minDate={dateRange.start || undefined}
                />
              </div>
            </div>
            <NeutralSubdueButton
              leadingIcon='ios_share'
              size='sm'
              onClick={() => onExportReport?.(activeReport)}
            >
              นำส่งออกรายงาน
            </NeutralSubdueButton>
          </div>

          {reports.length > 1 ? (
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
              {reports.map((r) => (
                <FilterTag
                  key={r.key}
                  value={r.title}
                  selected={activeKey === r.key}
                  onClick={() => setActiveKey(r.key)}
                />
              ))}
            </div>
          ) : null}

          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)', maxHeight: '58vh', overflowY: 'auto' }}>
            <span
              style={{
                color: 'var(--text-brandPrimary-default)',
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-base)',
                lineHeight: 1.4,
              }}
            >
              รายการ
            </span>
            <Table
              columns={columns}
              rows={pageRows}
              rowKey={(r) => r._id}
              emptyMessage='ไม่พบข้อมูลในช่วงที่เลือก'
              emptySubtext='ลองขยายช่วงวันที่'
              pagination={false}
            />
            <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-600)' }}>
              <span
                style={{
                  flex: 1,
                  color: 'var(--text-content-secondary)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                  lineHeight: 1.5,
                }}
              >
                แสดง {rows.length === 0 ? 0 : (safePage - 1) * VIEW_PAGE_SIZE + 1}
                -{Math.min(safePage * VIEW_PAGE_SIZE, rows.length)} จาก {rows.length} รายการ
              </span>
              <Pagination currentPage={safePage} pageCount={pageCount} onPageChange={setPage} />
            </div>
          </div>
        </div>
      ) : null}
    </Popup>
  );
};

/** Min height so Top-6 HBar panels aren't clipped by shorter sibling donuts. */
const CHART_PANEL_HBAR_MIN_HEIGHT =
  'calc(var(--dim-size-1600, 72px) + (6 * (var(--dim-size-1100, 52px) + var(--dim-space-300, 12px))))';

/** Chart block inside a group — bordered panel like consent dashboard.
 *  `alignContent='start'` for HBar lists (center overlaps title); default center for donut/bars. */
const ChartPanel = ({ title, children, alignContent = 'center' }) => {
  const isList = alignContent === 'start';
  return (
    <Reveal className='flex flex-col min-w-0 flex-1'>
      <div
        className='w-full h-full'
        style={{
          ...CHART_PANEL,
          ...(isList
            ? {
                minHeight: CHART_PANEL_HBAR_MIN_HEIGHT,
                overflow: 'visible',
              }
            : null),
        }}
      >
        <div className='flex flex-col min-w-0 shrink-0'>
          <span
            style={{
              color: 'var(--text-content-default)',
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-sm)',
              lineHeight: 1.4,
            }}
          >
            {title}
          </span>
        </div>
        <div
          className={`flex w-full min-w-0 ${isList ? '' : 'flex-1 min-h-0'}`}
          style={{
            alignItems: isList ? 'flex-start' : 'center',
            justifyContent: isList ? 'flex-start' : 'center',
          }}
        >
          {children}
        </div>
      </div>
    </Reveal>
  );
};

const ChartsRow = ({ children }) => (
  <div className='flex items-stretch flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
    {children}
  </div>
);

const countBy = (rows, keyFn) => {
  const map = new Map();
  rows.forEach((row) => {
    const key = keyFn(row);
    if (key == null || key === '') return;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return map;
};

const donutFromCounts = (countMap, colorFor, labelFor = (k) => k) => (
  [...countMap.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value], i) => ({
      label: labelFor(key),
      value,
      color: colorFor(key, i),
    }))
);

const emptyChartNote = (text) => (
  <span
    style={{
      color: 'var(--text-content-tertiary)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-sm)',
      textAlign: 'center',
      padding: 'var(--dim-space-600)',
    }}
  >
    {text}
  </span>
);

const ReportOverviewCharts = ({
  mode,
  detailRows,
  summaryRows,
  patientRosterRows,
  patientServiceRows,
  registryRows,
  newlyAddedRegistryRows,
  requisitionRows,
  receivingRows,
  nearExpiryRows,
  reorderRows,
  filteredStockRows,
  stockAlertRows,
}) => {
  if (mode === 'dispense') {
    const statusCounts = countBy(detailRows, (r) => r.status);
    const statusDonut = donutFromCounts(
      statusCounts,
      (key, i) => ({
        [DISPENSE_STATUS.DISPENSED]: PHCIS_CHART.teal,
        [DISPENSE_STATUS.PARTIAL]: PHCIS_CHART.yellow,
        [DISPENSE_STATUS.WAITING]: PHCIS_CHART.indigo,
        [DISPENSE_STATUS.CALLED]: PHCIS_CHART.indigo,
        [DISPENSE_STATUS.PREPARING]: PHCIS_CHART.indigo,
        [DISPENSE_STATUS.PROBLEM]: PHCIS_CHART.pink,
        [DISPENSE_STATUS.NO_SHOW]: PHCIS_CHART.pink,
        [DISPENSE_STATUS.CANCELLED]: 'var(--surface-neutral-tertiary, #E2E4E6)',
      }[key] || PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length]),
      (key) => (STATUS_PILL[key] || { label: key }).label,
    );
    const dayMap = new Map();
    detailRows.forEach((r) => {
      const d = r.issuedDate || '';
      if (!d) return;
      dayMap.set(d, (dayMap.get(d) || 0) + 1);
    });
    const days = [...dayMap.keys()].sort();
    const topDrugs = summaryRows.slice(0, 6).map((r) => ({
      label: r.name,
      value: r.totalDispensed || r.totalQuantity || 0,
      segments: [{
        value: r.totalDispensed || r.totalQuantity || 0,
        color: PHCIS_CHART.teal,
        label: 'จำนวนจ่าย',
      }],
    }));
    return (
      <ChartsRow>
        <ChartPanel title='สัดส่วนสถานะการจ่ายยา'>
          {statusDonut.length ? (
            <DonutWithLegend
              segments={statusDonut}
              size={180}
              centerLabel={String(detailRows.length)}
              centerSub='ใบสั่งยา'
            />
          ) : emptyChartNote('ยังไม่มีข้อมูลสถานะในช่วงนี้')}
        </ChartPanel>
        <ChartPanel title='แนวโน้มใบสั่งยารายวัน'>
          {days.length ? (
            <div className='w-full' style={{ paddingTop: 'var(--dim-space-200)' }}>
              <VBars
                months={days.map((d) => formatIsoDateThai(d).replace(/\s\d{4}$/, ''))}
                series={[{ label: 'ใบสั่งยา', color: PHCIS_CHART.indigo, values: days.map((d) => dayMap.get(d) || 0) }]}
                height={180}
              />
            </div>
          ) : emptyChartNote('ยังไม่มีแนวโน้มรายวัน')}
        </ChartPanel>
        <ChartPanel title='ยาที่จ่ายมากสุด (Top 6)' alignContent='start'>
          {topDrugs.length ? (
            <div className='w-full'>
              <HBarList valueLabel='หน่วย' rows={topDrugs} />
            </div>
          ) : emptyChartNote('ยังไม่มีสรุปการจ่ายยา')}
        </ChartPanel>
      </ChartsRow>
    );
  }

  if (mode === 'patients') {
    const statusDonut = donutFromCounts(
      countBy(patientRosterRows, (r) => r.status),
      (key, i) => ({
        active: PHCIS_CHART.teal,
        inactive: 'var(--surface-neutral-tertiary, #E2E4E6)',
        pending: PHCIS_CHART.yellow,
        draft: PHCIS_CHART.indigo,
      }[key] || PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length]),
      (key) => (PATIENT_STATUS_PILL[key] || { label: key }).label,
    );
    const riskRows = [
      {
        label: 'มีประวัติแพ้ยา',
        value: patientRosterRows.filter((r) => r.allergyCount > 0).length,
        segments: [{ value: patientRosterRows.filter((r) => r.allergyCount > 0).length, color: PHCIS_CHART.pink, label: 'แพ้ยา' }],
      },
      {
        label: 'โรคเรื้อรัง',
        value: patientRosterRows.filter((r) => r.chronicCount > 0).length,
        segments: [{ value: patientRosterRows.filter((r) => r.chronicCount > 0).length, color: PHCIS_CHART.yellow, label: 'เรื้อรัง' }],
      },
      {
        label: 'มารับยาในช่วงที่เลือก',
        value: patientServiceRows.length,
        segments: [{ value: patientServiceRows.length, color: PHCIS_CHART.teal, label: 'มารับยา' }],
      },
    ].filter((r) => r.value > 0);
    const topVisitors = patientServiceRows.slice(0, 6).map((r) => ({
      label: r.patientName || r.hn,
      value: r.visitCount,
      segments: [{ value: r.visitCount, color: PHCIS_CHART.indigo, label: 'ใบสั่งยา' }],
    }));
    return (
      <ChartsRow>
        <ChartPanel title='สัดส่วนสถานะทะเบียน'>
          {statusDonut.length ? (
            <DonutWithLegend segments={statusDonut} size={180} centerLabel={String(patientRosterRows.length)} centerSub='ผู้รับบริการ' />
          ) : emptyChartNote('ยังไม่มีข้อมูลทะเบียน')}
        </ChartPanel>
        <ChartPanel title='กลุ่มเสี่ยง / การมารับยา' alignContent='start'>
          {riskRows.length ? (
            <div className='w-full'><HBarList valueLabel='ราย' maxVisibleRows={4} rows={riskRows} /></div>
          ) : emptyChartNote('ยังไม่มีข้อมูลกลุ่มเสี่ยง')}
        </ChartPanel>
        <ChartPanel title='ผู้รับบริการที่มารับยาบ่อย (Top 6)' alignContent='start'>
          {topVisitors.length ? (
            <div className='w-full'><HBarList valueLabel='ใบสั่ง' rows={topVisitors} /></div>
          ) : emptyChartNote('ยังไม่มีผู้มารับยาในช่วงนี้')}
        </ChartPanel>
      </ChartsRow>
    );
  }

  if (mode === 'registry') {
    const classDonut = donutFromCounts(
      countBy(registryRows, (r) => r.classification),
      (_key, i) => PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length],
      (key) => CLASSIFICATION_LABEL[key] || key,
    );
    const activeDonut = donutFromCounts(
      countBy(registryRows, (r) => (r.active ? 'active' : 'inactive')),
      (key) => (key === 'active' ? PHCIS_CHART.teal : PHCIS_CHART.pink),
      (key) => (key === 'active' ? 'ใช้งาน' : 'ปิดใช้งาน'),
    );
    const newRows = newlyAddedRegistryRows.slice(0, 6).map((r) => ({
      label: r.name,
      value: 1,
      segments: [{ value: 1, color: PHCIS_CHART.indigo, label: formatIsoDateThai(r.activeFrom) }],
    }));
    /* Show count of new vs rest as bars */
    const newOverview = [
      {
        label: 'เพิ่มใหม่ในช่วงที่เลือก',
        value: newlyAddedRegistryRows.length,
        segments: [{ value: newlyAddedRegistryRows.length, color: PHCIS_CHART.indigo, label: 'ใหม่' }],
      },
      {
        label: 'รายการอื่นในตัวกรอง',
        value: Math.max(0, registryRows.length - newlyAddedRegistryRows.length),
        segments: [{ value: Math.max(0, registryRows.length - newlyAddedRegistryRows.length), color: PHCIS_CHART.teal, label: 'อื่น' }],
      },
    ].filter((r) => r.value > 0);
    return (
      <ChartsRow>
        <ChartPanel title='สัดส่วนประเภทยา'>
          {classDonut.length ? (
            <DonutWithLegend segments={classDonut} size={180} centerLabel={String(registryRows.length)} centerSub='ทะเบียน' />
          ) : emptyChartNote('ยังไม่มีข้อมูลประเภทยา')}
        </ChartPanel>
        <ChartPanel title='สถานะการใช้งาน'>
          {activeDonut.length ? (
            <DonutWithLegend segments={activeDonut} size={180} centerLabel={String(registryRows.filter((r) => r.active).length)} centerSub='ใช้งาน' />
          ) : emptyChartNote('ยังไม่มีข้อมูลสถานะ')}
        </ChartPanel>
        <ChartPanel title='ยาที่เพิ่มเข้ามาใหม่' alignContent='start'>
          {newOverview.length ? (
            <div className='w-full'><HBarList valueLabel='รายการ' maxVisibleRows={4} rows={newOverview} /></div>
          ) : newRows.length ? (
            <div className='w-full'><HBarList valueLabel='รายการ' rows={newRows} /></div>
          ) : emptyChartNote('ไม่มีรายการใหม่ในช่วงนี้')}
        </ChartPanel>
      </ChartsRow>
    );
  }

  if (mode === 'requisition') {
    const statusDonut = donutFromCounts(
      countBy(requisitionRows, (r) => r.status),
      (key) => ({
        pending: PHCIS_CHART.yellow,
        approved: PHCIS_CHART.indigo,
        fulfilled: PHCIS_CHART.teal,
        cancelled: PHCIS_CHART.pink,
      }[key] || PHCIS_CHART.indigo),
      (key) => (REQ_STATUS_PILL[key] || { label: key }).label,
    );
    const typeDonut = donutFromCounts(
      countBy(requisitionRows, (r) => r.requisitionType),
      (_k, i) => PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length],
      (key) => REQUISITION_TYPE_LABEL[key] || key,
    );
    const byDrug = new Map();
    requisitionRows.forEach((r) => {
      const name = r.drugName || '—';
      byDrug.set(name, (byDrug.get(name) || 0) + (Number(r.quantity) || 0));
    });
    const topDrugs = [...byDrug.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({
        label,
        value,
        segments: [{ value, color: PHCIS_CHART.teal, label: 'จำนวนขอ' }],
      }));
    return (
      <ChartsRow>
        <ChartPanel title='สัดส่วนสถานะคำขอเบิก'>
          {statusDonut.length ? (
            <DonutWithLegend segments={statusDonut} size={180} centerLabel={String(requisitionRows.length)} centerSub='คำขอ' />
          ) : emptyChartNote('ยังไม่มีคำขอเบิก')}
        </ChartPanel>
        <ChartPanel title='ประเภทการเบิก'>
          {typeDonut.length ? (
            <DonutWithLegend segments={typeDonut} size={180} centerLabel={String(typeDonut.length)} centerSub='ประเภท' />
          ) : emptyChartNote('ยังไม่มีประเภทการเบิก')}
        </ChartPanel>
        <ChartPanel title='ยาที่ขอเบิกมากสุด (Top 6)' alignContent='start'>
          {topDrugs.length ? (
            <div className='w-full'><HBarList valueLabel='หน่วย' rows={topDrugs} /></div>
          ) : emptyChartNote('ยังไม่มีรายการยา')}
        </ChartPanel>
      </ChartsRow>
    );
  }

  if (mode === 'receiving') {
    const typeDonut = donutFromCounts(
      countBy(receivingRows, (r) => r.receivingType),
      (key) => ({
        purchase: PHCIS_CHART.teal,
        transfer: PHCIS_CHART.indigo,
        donation: PHCIS_CHART.yellow,
      }[key] || PHCIS_CHART.pink),
      (key) => RECEIVING_TYPE_LABEL[key] || key,
    );
    const statusDonut = donutFromCounts(
      countBy(receivingRows, (r) => (r.status === 'cancelled' ? 'cancelled' : 'received')),
      (key) => (key === 'cancelled' ? PHCIS_CHART.pink : PHCIS_CHART.teal),
      (key) => (key === 'cancelled' ? 'ยกเลิกแล้ว' : 'รับเข้าแล้ว'),
    );
    const byDrug = new Map();
    receivingRows.forEach((r) => {
      if (r.status === 'cancelled') return;
      const name = r.drugName || '—';
      byDrug.set(name, (byDrug.get(name) || 0) + (Number(r.quantity) || 0));
    });
    const topDrugs = [...byDrug.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({
        label,
        value,
        segments: [{ value, color: PHCIS_CHART.indigo, label: 'จำนวนรับ' }],
      }));
    return (
      <ChartsRow>
        <ChartPanel title='ประเภทการรับเข้า'>
          {typeDonut.length ? (
            <DonutWithLegend segments={typeDonut} size={180} centerLabel={String(receivingRows.length)} centerSub='รายการ' />
          ) : emptyChartNote('ยังไม่มีรายการรับเข้า')}
        </ChartPanel>
        <ChartPanel title='สถานะรายการรับเข้า'>
          {statusDonut.length ? (
            <DonutWithLegend segments={statusDonut} size={180} centerLabel={String(receivingRows.filter((r) => r.status !== 'cancelled').length)} centerSub='รับเข้าแล้ว' />
          ) : emptyChartNote('ยังไม่มีสถานะ')}
        </ChartPanel>
        <ChartPanel title='ยารับเข้ามากสุด (Top 6)' alignContent='start'>
          {topDrugs.length ? (
            <div className='w-full'><HBarList valueLabel='หน่วย' rows={topDrugs} /></div>
          ) : emptyChartNote('ยังไม่มีปริมาณรับเข้า')}
        </ChartPanel>
      </ChartsRow>
    );
  }

  if (mode === 'stock') {
    const alertDonut = [
      { label: 'ใกล้หมดอายุ', value: nearExpiryRows.length, color: PHCIS_CHART.yellow },
      { label: 'ต่ำกว่าจุดสั่งซื้อ', value: reorderRows.length, color: PHCIS_CHART.pink },
      {
        label: 'นอกเงื่อนไขแจ้งเตือน',
        value: Math.max(0, stockAlertRows.length === 0
          ? 0
          : (Object.keys(MAIN_WAREHOUSE_STOCK).length + allSubWarehouseRows().length) - stockAlertRows.length),
        color: PHCIS_CHART.teal,
      },
    ].filter((s) => s.value > 0);
    const tierDonut = donutFromCounts(
      countBy(filteredStockRows, (r) => r.tier),
      (key) => (key === 'main' ? PHCIS_CHART.indigo : PHCIS_CHART.teal),
      (key) => (key === 'main' ? 'คลังใหญ่' : 'คลังย่อย'),
    );
    const topNear = nearExpiryRows
      .slice()
      .sort((a, b) => String(a.expiryDate || '').localeCompare(String(b.expiryDate || '')))
      .slice(0, 6)
      .map((r) => ({
        label: r.name,
        value: Number(r.stock || 0),
        segments: [{ value: Number(r.stock || 0), color: PHCIS_CHART.yellow, label: 'คงคลัง' }],
      }));
    return (
      <ChartsRow>
        <ChartPanel title='การแจ้งเตือนคลัง'>
          {alertDonut.length ? (
            <DonutWithLegend
              segments={alertDonut}
              size={180}
              centerLabel={String(nearExpiryRows.length + reorderRows.length)}
              centerSub='ต้องติดตาม'
            />
          ) : emptyChartNote('ไม่มีรายการแจ้งเตือน')}
        </ChartPanel>
        <ChartPanel title='สัดส่วนชั้นคลังที่แจ้งเตือน'>
          {tierDonut.length ? (
            <DonutWithLegend segments={tierDonut} size={180} centerLabel={String(filteredStockRows.length)} centerSub='รายการ' />
          ) : emptyChartNote('ยังไม่มีข้อมูลชั้นคลัง')}
        </ChartPanel>
        <ChartPanel title='ใกล้หมดอายุเร็วสุด (Top 6)' alignContent='start'>
          {topNear.length ? (
            <div className='w-full'><HBarList valueLabel='คงคลัง' rows={topNear} /></div>
          ) : emptyChartNote('ไม่มีรายการใกล้หมดอายุ')}
        </ChartPanel>
      </ChartsRow>
    );
  }

  return null;
};

const PharmacyReportsPage = () => {
  const [dateFilter, setDateFilter] = useState(DEFAULT_DATE_FILTER);
  const [exported, setExported] = useState(false);
  const [exportReport, setExportReport] = useState(null);
  const [exportScopeKeys, setExportScopeKeys] = useState(null);
  const [viewBundle, setViewBundle] = useState(null);

  const { from: fromDate, to: toDate } = useMemo(() => rangeBoundsIso(dateFilter), [dateFilter]);
  const rangeLabel = formatRangeLabel(fromDate, toDate, dateFilter);

  const detailRows = useMemo(() => buildDetailRows(fromDate, toDate), [fromDate, toDate]);
  const summaryRows = useMemo(() => buildSummaryRows(fromDate, toDate), [fromDate, toDate]);

  const requisitionRows = useMemo(
    () => REQUISITIONS.filter((r) => matchesIsoDateFilter(r.requestedAt, dateFilter)),
    [dateFilter],
  );

  const receivingRows = useMemo(
    () => RECEIVING_RECORDS.filter((r) => matchesIsoDateFilter(r.receivedAt, dateFilter)),
    [dateFilter],
  );

  const stockAlertRows = useMemo(() => buildStockAlertRows(), []);
  const filteredStockRows = stockAlertRows;
  const nearExpiryRows = useMemo(() => stockAlertRows.filter((r) => r.nearExpiry), [stockAlertRows]);
  const reorderRows = useMemo(() => stockAlertRows.filter((r) => r.needsReorder), [stockAlertRows]);

  const patientRosterRows = useMemo(() => buildPatientRosterRows(), []);
  const patientServiceRows = useMemo(
    () => buildPatientServiceRows(fromDate, toDate),
    [fromDate, toDate],
  );

  const registryRows = useMemo(() => buildRegistryReportRows(), []);
  const newlyAddedRegistryRows = useMemo(
    () => registryRows.filter((r) => matchesIsoDateFilter(r.activeFrom, dateFilter)),
    [registryRows, dateFilter],
  );

  const dispensedCount = detailRows.filter((r) => r.status === DISPENSE_STATUS.DISPENSED || r.status === DISPENSE_STATUS.PARTIAL).length;

  const summaryCards = useMemo(() => buildUnifiedPharmacyReportSummaryCards({
    detailRows,
    dispensedCount,
    patientServiceRows,
    newlyAddedRows: newlyAddedRegistryRows,
    requisitionRows,
    receivingRows,
    stockAlertCount: filteredStockRows.length,
    rangeLabel,
  }), [
    detailRows, dispensedCount, patientServiceRows, newlyAddedRegistryRows,
    requisitionRows, receivingRows, filteredStockRows.length, rangeLabel,
  ]);

  const filtersActive = (dateFilter?.quick || 'thismonth') !== 'thismonth';
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => setDateFilter(DEFAULT_DATE_FILTER),
  );

  /* Export/view catalog keeps wide date + _iso so popup can re-scope independently. */
  const exportDetailRows = useMemo(() => buildDetailRows('2000-01-01', '2100-12-31'), []);
  const exportSummaryRows = useMemo(() => buildSummaryRows('2000-01-01', '2100-12-31'), []);
  const exportPatientServiceRows = useMemo(() => buildPatientServiceRows('2000-01-01', '2100-12-31'), []);

  const reportsCatalog = useMemo(() => [
    buildExportReport('dispense-detail', 'รายงานรายละเอียดใบสั่งยารายวัน', DETAIL_COLUMNS, exportDetailRows, (r) => r.issuedDate),
    buildExportReport('dispense-summary', 'รายงานสรุปการจ่ายยา', SUMMARY_COLUMNS, exportSummaryRows),
    buildExportReport('patients-roster', 'รายงานทะเบียนผู้รับบริการ', PATIENT_ROSTER_COLUMNS, patientRosterRows),
    buildExportReport('patients-service', 'รายงานผู้รับบริการที่มารับยา', PATIENT_SERVICE_COLUMNS, exportPatientServiceRows, (r) => r.lastIssuedDate),
    buildExportReport('registry-new', 'รายงานยาที่เพิ่มเข้ามาใหม่', REGISTRY_REPORT_COLUMNS, registryRows, (r) => r.activeFrom),
    buildExportReport('registry-all', 'รายงานทะเบียนยาทั้งหมด', REGISTRY_REPORT_COLUMNS, registryRows, (r) => r.activeFrom),
    buildExportReport('requisition', 'รายงานเบิกจ่ายยา/เวชภัณฑ์', REQUISITION_REPORT_COLUMNS, REQUISITIONS, (r) => r.requestedAt),
    buildExportReport('receiving', 'รายงานรับยาเข้าคลังใหญ่', RECEIVING_REPORT_COLUMNS, RECEIVING_RECORDS, (r) => r.receivedAt),
    buildExportReport('stock', 'รายงานแจ้งเตือนคลังยา', STOCK_ALERT_COLUMNS, filteredStockRows, (r) => r.expiryDate),
  ], [
    exportDetailRows, exportSummaryRows, patientRosterRows, exportPatientServiceRows,
    registryRows, filteredStockRows,
  ]);

  const exportTopics = useMemo(
    () => reportsCatalog.map((r) => ({ value: r.key, label: r.title })),
    [reportsCatalog],
  );

  const openExport = (keyOrReport, scopeKeys = null) => {
    setExportScopeKeys(scopeKeys);
    if (keyOrReport === 'all' || keyOrReport?.key === 'all') {
      setExportReport({ key: 'all', title: keyOrReport?.title || 'รายงานทั้งหมด' });
      return;
    }
    if (typeof keyOrReport === 'string') {
      setExportReport(reportsCatalog.find((r) => r.key === keyOrReport) || { key: keyOrReport, title: 'รายงาน' });
      return;
    }
    setExportReport(keyOrReport);
  };

  const openExportGroup = (groupKey, title) => {
    const keys = EXPORT_GROUP_KEYS[groupKey] || [];
    if (keys.length === 1) {
      openExport(keys[0]);
      return;
    }
    openExport({ key: 'all', title }, keys);
  };

  const openViewGroup = (groupKey, title) => {
    const keys = EXPORT_GROUP_KEYS[groupKey] || [];
    const reports = keys
      .map((k) => reportsCatalog.find((r) => r.key === k))
      .filter(Boolean);
    if (!reports.length) return;
    setViewBundle({ key: groupKey, title, reports });
  };

  const scopedCatalog = useMemo(() => {
    if (!exportScopeKeys?.length) return reportsCatalog;
    return reportsCatalog.filter((r) => exportScopeKeys.includes(r.key));
  }, [reportsCatalog, exportScopeKeys]);

  const scopedTopics = useMemo(() => {
    if (!exportScopeKeys?.length) return exportTopics;
    return exportTopics.filter((t) => exportScopeKeys.includes(t.value));
  }, [exportTopics, exportScopeKeys]);

  const chartProps = {
    detailRows,
    summaryRows,
    patientRosterRows,
    patientServiceRows,
    registryRows,
    newlyAddedRegistryRows,
    requisitionRows,
    receivingRows,
    nearExpiryRows,
    reorderRows,
    filteredStockRows,
    stockAlertRows,
  };

  return (
    <QueuePageShell
      activeKey='pharmacy'
      breadcrumb={breadcrumb}
      title='ระบบงานเภสัชกรรม'
      summaryCards={summaryCards}
      actions={<PharmacyHeaderActions />}
      belowSummary={<PharmacySubNav />}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-600)' }}>
        <section
          className='w-full flex items-center justify-between flex-wrap'
          style={{
            ...CARD,
            gap: 'var(--dim-space-300)',
            padding: 'var(--dim-space-300) var(--dim-space-400)',
          }}
        >
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
            <FilterDateTag
              prefix='วัน:'
              value={dateFilter}
              onChange={setDateFilter}
              defaultQuick='thismonth'
              showResolvedDate
            />
            <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
          </div>
          <NeutralSubdueButton leadingIcon='ios_share' size='md' onClick={() => openExport('all')}>
            นำส่งออกรายงานทั้งหมด
          </NeutralSubdueButton>
        </section>

        <SmoothFilterResults opaque={resultsOpaque}>
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>
            <ReportGroupCard
              title='จ่ายยา'
              onView={() => openViewGroup('dispense', 'จ่ายยา')}
              onExport={() => openExportGroup('dispense', 'รายงานจ่ายยา')}
            >
              <ReportOverviewCharts mode='dispense' {...chartProps} />
            </ReportGroupCard>

            <ReportGroupCard
              title='ผู้รับบริการ'
              onView={() => openViewGroup('patients', 'ผู้รับบริการ')}
              onExport={() => openExportGroup('patients', 'รายงานผู้รับบริการ')}
            >
              <ReportOverviewCharts mode='patients' {...chartProps} />
            </ReportGroupCard>

            <ReportGroupCard
              title='ทะเบียนยา'
              onView={() => openViewGroup('registry', 'ทะเบียนยา')}
              onExport={() => openExportGroup('registry', 'รายงานทะเบียนยา')}
            >
              <ReportOverviewCharts mode='registry' {...chartProps} />
            </ReportGroupCard>

            <ReportGroupCard
              title='เบิกจ่าย'
              onView={() => openViewGroup('requisition', 'เบิกจ่าย')}
              onExport={() => openExportGroup('requisition', 'รายงานเบิกจ่ายยา/เวชภัณฑ์')}
            >
              <ReportOverviewCharts mode='requisition' {...chartProps} />
            </ReportGroupCard>

            <ReportGroupCard
              title='รับเข้าคลัง'
              onView={() => openViewGroup('receiving', 'รับเข้าคลัง')}
              onExport={() => openExportGroup('receiving', 'รายงานรับยาเข้าคลังใหญ่')}
            >
              <ReportOverviewCharts mode='receiving' {...chartProps} />
            </ReportGroupCard>

            <ReportGroupCard
              title='คลังยา'
              onView={() => openViewGroup('stock', 'คลังยา')}
              onExport={() => openExportGroup('stock', 'รายงานแจ้งเตือนคลังยา')}
            >
              <ReportOverviewCharts mode='stock' {...chartProps} />
            </ReportGroupCard>
          </div>
        </SmoothFilterResults>
      </div>

      <PharmacyReportViewPopup
        open={!!viewBundle}
        bundle={viewBundle}
        onClose={() => setViewBundle(null)}
        onExportReport={(report) => {
          if (!report) return;
          openExport(report);
        }}
      />

      <ExportFormatPopup
        open={!!exportReport}
        report={exportReport}
        reportsCatalog={scopedCatalog}
        topics={scopedTopics}
        onClose={() => { setExportReport(null); setExportScopeKeys(null); }}
        onExported={() => setExported(true)}
        documentFooter={PHARMACY_EXPORT_FOOTER}
        logExportFn={null}
        topicsFieldName='pharmacy-export-topics'
      />

      <SuccessToast
        open={exported}
        message='นำส่งออกรายงานแล้ว'
        onClose={() => setExported(false)}
      />
    </QueuePageShell>
  );
};

export default PharmacyReportsPage;
