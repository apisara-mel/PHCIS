import React, { useMemo, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import Badge from '@/components/badge/Badge';
import SuccessToast from '@/components/toast/SuccessToast';
import FilterDateTag from '@/components/forms/FilterDateTag';
import FilterTag from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import Dropdown from '@/components/forms/Dropdown';
import { screenValue } from '@/components/dashboard/DashboardTemplateSwitcher';
import { DashboardExportButton, DashboardHeaderFilters } from '@/components/dashboard/DashboardPageHeader';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import { DonutWithLegend, HBarList, VBars } from '@/components/graph/Charts';
import PHCIS_CHART, { PHCIS_CHART_PALETTE } from '@/data/phcisChartPalette';
import { ExportFormatPopup } from '@/pages/consent/consentExportPopup';
import {
  CARD,
  ChartPanel,
  ChartsRow,
  DASHBOARD_EXPORT_FOOTER,
  EmptyChartNote,
  ReportGroupCard,
  FISCAL_YEAR_OPTIONS,
  fiscalYearDateFilter,
  fiscalYearOf,
  ReportToolbar,
  ReportViewPopup,
  StatTile,
  StatTileRow,
  buildExportReport,
  countBy,
  donutFromCounts,
  formatRangeLabel,
  hbarRows,
  matchesIsoDateFilter,
  rangeBoundsIso,
} from '@/pages/dashboard/dashboardReportKit';
import {
  BMA_SERVICE_CENTERS,
  SERVICE_UNITS,
  centerLabel,
  formatIsoDateThai,
  formatIsoMonthThai,
  safePct,
  serviceUnitLabel,
} from '@/data/dashboardCommon';
import {
  MED_ERROR_INCIDENTS,
  MED_ERROR_TYPES,
  medErrorLevelLabel,
  medErrorTypeLabel,
} from '@/data/dashboardMedicationError';
import {
  GRANULARITY_OPTIONS,
  MONTH_BUCKETS,
  PRESCRIPTION_STATS,
  REQUISITION_SPLIT,
  RX_REJECTIONS,
  RX_REJECT_REASONS,
  SUPPLY_CATEGORIES,
  SUPPLY_USAGE,
  rxRejectReasonLabel,
  supplyCategoryLabel,
} from '@/data/dashboardPrescriptionStats';
/* READ-ONLY imports from the pharmacy module's mock data. This Dashboard page
   never touches src/pages/pharmacy — it is the cross-centre analytics view the
   TOR asks for in §1.20.2 / §1.20.6, not a copy of the operational
   /pharmacy/reports page owned by the pharmacy module. */
import { PHARMACY_QUEUE, PHARMACY_USAGE_HISTORY } from '@/data/pharmacyQueue';
import { DRUG_CLASSIFICATIONS, getRegistryDrug } from '@/data/pharmacyRegistry';

const breadcrumb = ['แดชบอร์ด', 'รายงานเภสัชกรรม'];

const DEFAULT_DATE_FILTER = { quick: 'thisyear' };
const DEFAULT_CENTER = 'all';
const DEFAULT_CLASS = 'all';
const DEFAULT_GRANULARITY = 'month';

const EXPORT_GROUP_KEYS = {
  usage: ['drug-usage', 'drug-usage-class'],
  supply: ['supply-usage'],
  requisition: ['requisition-split'],
  error: ['med-error'],
  prescription: ['rx-stats', 'rx-reject'],
};

const CLASSIFICATION_LABEL = Object.fromEntries(DRUG_CLASSIFICATIONS.map((c) => [c.key, c.label]));

const CENTER_OPTIONS = [
  { value: 'all', label: 'ทุกศูนย์บริการ' },
  ...BMA_SERVICE_CENTERS.map((c) => ({ value: c.key, label: c.name })),
];

const CLASS_OPTIONS = [
  { value: 'all', label: 'ทุกประเภทยา' },
  ...DRUG_CLASSIFICATIONS.map((c) => ({ value: c.key, label: c.label })),
];

const MED_ERROR_TYPE_COLOR = {
  prescribing: PHCIS_CHART.pink,
  'pre-dispensing': PHCIS_CHART.yellow,
  dispensing: PHCIS_CHART.indigo,
  administration: PHCIS_CHART.teal,
};

/* ── columns ─────────────────────────────────────────────────────────────── */

const DRUG_USAGE_COLUMNS = [
  { key: 'name', label: 'ชื่อยา', flex: true, minWidth: 240 },
  {
    key: 'classification', label: 'ประเภทยา', flex: true, minWidth: 180,
    render: (r) => CLASSIFICATION_LABEL[r.classification] || r.classification || '—',
    csv: (r) => CLASSIFICATION_LABEL[r.classification] || r.classification || '',
  },
  { key: 'prescriptionCount', label: 'จำนวนใบสั่งยา', align: 'center' },
  {
    key: 'totalQuantity', label: 'จำนวนที่สั่ง', align: 'center',
    render: (r) => `${r.totalQuantity.toLocaleString('th-TH')} ${r.unit || ''}`.trim(),
    csv: (r) => `${r.totalQuantity} ${r.unit || ''}`.trim(),
  },
  {
    key: 'totalDispensed', label: 'จำนวนที่จ่ายจริง', align: 'center',
    render: (r) => `${r.totalDispensed.toLocaleString('th-TH')} ${r.unit || ''}`.trim(),
    csv: (r) => `${r.totalDispensed} ${r.unit || ''}`.trim(),
  },
];

const DRUG_CLASS_COLUMNS = [
  { key: 'label', label: 'ประเภทยา', flex: true, minWidth: 220 },
  { key: 'items', label: 'จำนวนรายการยา', align: 'center' },
  { key: 'quantity', label: 'จำนวนที่ใช้รวม', align: 'center', render: (r) => r.quantity.toLocaleString('th-TH'), csv: (r) => r.quantity },
  { key: 'pct', label: 'สัดส่วน (%)', align: 'right', render: (r) => `${r.pct}%`, csv: (r) => r.pct },
];

const SUPPLY_COLUMNS = [
  { key: 'iso', label: 'เดือน', render: (r) => formatIsoMonthThai(r.iso), csv: (r) => r.iso.slice(0, 7) },
  { key: 'name', label: 'รายการเวชภัณฑ์', flex: true, minWidth: 240 },
  {
    key: 'category', label: 'ประเภท', flex: true, minWidth: 180,
    render: (r) => supplyCategoryLabel(r.category), csv: (r) => supplyCategoryLabel(r.category),
  },
  {
    key: 'quantity', label: 'จำนวนที่ใช้', align: 'center',
    render: (r) => `${r.quantity.toLocaleString('th-TH')} ${r.unit}`, csv: (r) => `${r.quantity} ${r.unit}`,
  },
];

const REQUISITION_SPLIT_COLUMNS = [
  { key: 'iso', label: 'เดือน', render: (r) => formatIsoMonthThai(r.iso), csv: (r) => r.iso.slice(0, 7) },
  { key: 'nhso', label: 'เบิกกับ สปสช. (รายการ)', align: 'center', render: (r) => r.nhso.toLocaleString('th-TH'), csv: (r) => r.nhso },
  { key: 'pharmacyDivision', label: 'เบิกกับกองเภสัชกรรม (รายการ)', align: 'center', render: (r) => r.pharmacyDivision.toLocaleString('th-TH'), csv: (r) => r.pharmacyDivision },
  { key: 'total', label: 'รวม', align: 'center', render: (r) => (r.nhso + r.pharmacyDivision).toLocaleString('th-TH'), csv: (r) => r.nhso + r.pharmacyDivision },
];

const MED_ERROR_COLUMNS = [
  { key: 'iso', label: 'วันที่พบ', render: (r) => formatIsoDateThai(r.iso), csv: (r) => r.iso },
  {
    key: 'center', label: 'ศูนย์บริการ', flex: true, minWidth: 200,
    render: (r) => centerLabel(r.center), csv: (r) => centerLabel(r.center),
  },
  {
    key: 'type', label: 'ประเภทความคลาดเคลื่อน', flex: true, minWidth: 220,
    render: (r) => medErrorTypeLabel(r.type), csv: (r) => medErrorTypeLabel(r.type),
  },
  {
    key: 'level', label: 'ระดับความรุนแรง', flex: true, minWidth: 200,
    render: (r) => (
      <Badge style={['d', 'e'].includes(r.level) ? 'error' : r.level === 'c' ? 'warning' : 'neutral'} size='small'>
        {medErrorLevelLabel(r.level)}
      </Badge>
    ),
    csv: (r) => medErrorLevelLabel(r.level),
  },
  { key: 'drug', label: 'รายการยา', flex: true, minWidth: 200 },
  { key: 'detail', label: 'รายละเอียด', flex: true, minWidth: 260 },
  { key: 'reporter', label: 'ผู้รายงาน', flex: true, minWidth: 180 },
  {
    key: 'resolved', label: 'สถานะ',
    render: (r) => <Badge style={r.resolved ? 'success' : 'warning'} size='small'>{r.resolved ? 'แก้ไขแล้ว' : 'อยู่ระหว่างแก้ไข'}</Badge>,
    csv: (r) => (r.resolved ? 'แก้ไขแล้ว' : 'อยู่ระหว่างแก้ไข'),
  },
];

const RX_STATS_COLUMNS = [
  { key: 'iso', label: 'เดือน', render: (r) => formatIsoMonthThai(r.iso), csv: (r) => r.iso.slice(0, 7) },
  { key: 'quarterLabel', label: 'ไตรมาส' },
  { key: 'year', label: 'ปี ค.ศ.', align: 'center' },
  {
    key: 'center', label: 'ศูนย์บริการ', flex: true, minWidth: 200,
    render: (r) => centerLabel(r.center), csv: (r) => centerLabel(r.center),
  },
  {
    key: 'unit', label: 'หน่วยบริการ', flex: true, minWidth: 180,
    render: (r) => serviceUnitLabel(r.unit), csv: (r) => serviceUnitLabel(r.unit),
  },
  { key: 'rxCount', label: 'จำนวนใบสั่งยา', align: 'center', render: (r) => r.rxCount.toLocaleString('th-TH'), csv: (r) => r.rxCount },
  { key: 'itemCount', label: 'จำนวนรายการยา', align: 'center', render: (r) => r.itemCount.toLocaleString('th-TH'), csv: (r) => r.itemCount },
];

const RX_REJECT_COLUMNS = [
  { key: 'iso', label: 'วันที่ตีกลับ', render: (r) => formatIsoDateThai(r.iso), csv: (r) => r.iso },
  { key: 'rxNo', label: 'เลขที่ใบสั่งยา' },
  {
    key: 'center', label: 'ศูนย์บริการ', flex: true, minWidth: 200,
    render: (r) => centerLabel(r.center), csv: (r) => centerLabel(r.center),
  },
  {
    key: 'unit', label: 'หน่วยบริการ', flex: true, minWidth: 180,
    render: (r) => serviceUnitLabel(r.unit), csv: (r) => serviceUnitLabel(r.unit),
  },
  {
    key: 'reason', label: 'เหตุผลที่ตีกลับ', flex: true, minWidth: 220,
    render: (r) => rxRejectReasonLabel(r.reason), csv: (r) => rxRejectReasonLabel(r.reason),
  },
  { key: 'doctor', label: 'แพทย์ผู้สั่ง', flex: true, minWidth: 180 },
  { key: 'pharmacist', label: 'เภสัชกรผู้ตีกลับ', flex: true, minWidth: 180 },
  {
    key: 'resolvedSameDay', label: 'แก้ไขภายในวัน',
    render: (r) => <Badge style={r.resolvedSameDay ? 'success' : 'warning'} size='small'>{r.resolvedSameDay ? 'ภายในวัน' : 'เกินวัน'}</Badge>,
    csv: (r) => (r.resolvedSameDay ? 'ภายในวัน' : 'เกินวัน'),
  },
];

/* ── drug usage aggregation from the pharmacy module's dispense rows ─────── */

const DISPENSE_SOURCE = [...PHARMACY_QUEUE, ...PHARMACY_USAGE_HISTORY];

const buildDrugUsageRows = (predicate) => {
  const byDrug = new Map();
  DISPENSE_SOURCE.filter(predicate).forEach((row) => {
    (row.items || []).forEach((item) => {
      const drug = getRegistryDrug(item.name);
      const entry = byDrug.get(item.name) || {
        id: item.name,
        name: item.name,
        unit: item.unit,
        classification: drug?.classification || 'other',
        prescriptionCount: 0,
        totalQuantity: 0,
        totalDispensed: 0,
      };
      entry.prescriptionCount += 1;
      entry.totalQuantity += Number(item.quantity) || 0;
      entry.totalDispensed += Number(item.quantityDispensed) || 0;
      byDrug.set(item.name, entry);
    });
  });
  return [...byDrug.values()].sort((a, b) => b.totalQuantity - a.totalQuantity);
};

const quarterLabelOf = (row) => `Q${row.quarter}/${row.year + 543}`;

const PharmacyAnalyticsPage = () => {
  const [dateFilter, setDateFilter] = useState(DEFAULT_DATE_FILTER);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [drugClass, setDrugClass] = useState(DEFAULT_CLASS);
  const [granularity, setGranularity] = useState(DEFAULT_GRANULARITY);
  const [viewBundle, setViewBundle] = useState(null);
  const [exportReport, setExportReport] = useState(null);
  const [exportScopeKeys, setExportScopeKeys] = useState(null);
  const [exported, setExported] = useState(false);

  const { from, to } = rangeBoundsIso(dateFilter);
  const rangeLabel = formatRangeLabel(from, to, dateFilter);

  /* ── 1.20.2.1 / 2.5 / 2.6 — drug usage ────────────────────────────────── */
  const drugUsageRows = useMemo(() => {
    const rows = buildDrugUsageRows((r) => matchesIsoDateFilter(r.issuedDate, dateFilter));
    if (drugClass === 'all') return rows;
    return rows.filter((r) => r.classification === drugClass);
  }, [dateFilter, drugClass]);

  const totalDispensedItems = drugUsageRows.reduce((s, r) => s + r.totalDispensed, 0);
  const totalOrderedItems = drugUsageRows.reduce((s, r) => s + r.totalQuantity, 0);

  const classDonut = useMemo(() => {
    const map = new Map();
    drugUsageRows.forEach((r) => {
      map.set(r.classification, (map.get(r.classification) || 0) + r.totalQuantity);
    });
    return [...map.entries()]
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([key, value], i) => ({
        label: CLASSIFICATION_LABEL[key] || key,
        value,
        color: PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length],
      }));
  }, [drugUsageRows]);

  const topDrugHbar = useMemo(
    () => hbarRows(
      drugUsageRows.slice(0, 10).map((r) => ({ label: r.name, value: r.totalQuantity })),
      PHCIS_CHART.teal,
      'หน่วย',
    ),
    [drugUsageRows],
  );

  /* ── 1.20.2.2 — medical supplies ──────────────────────────────────────── */
  const supplyRows = useMemo(
    () => SUPPLY_USAGE.filter((r) => matchesIsoDateFilter(r.iso, dateFilter)),
    [dateFilter],
  );

  const supplyMonths = useMemo(() => {
    const set = new Set(supplyRows.map((r) => r.iso.slice(0, 7)));
    return [...set].sort();
  }, [supplyRows]);

  const supplySeries = useMemo(() => SUPPLY_CATEGORIES.map((cat, i) => ({
    label: cat.label,
    color: PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length],
    values: supplyMonths.map((m) => supplyRows
      .filter((r) => r.category === cat.key && r.iso.startsWith(m))
      .reduce((s, r) => s + r.quantity, 0)),
  })), [supplyMonths, supplyRows]);

  const supplyTopHbar = useMemo(() => {
    const map = new Map();
    supplyRows.forEach((r) => map.set(r.name, (map.get(r.name) || 0) + r.quantity));
    return hbarRows(
      [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value })),
      PHCIS_CHART.indigo,
      'หน่วย',
    );
  }, [supplyRows]);

  const supplyTotal = supplyRows.reduce((s, r) => s + r.quantity, 0);

  /* ── 1.20.2.3 / 2.4 — requisition split ───────────────────────────────── */
  const requisitionRows = useMemo(
    () => REQUISITION_SPLIT.filter((r) => matchesIsoDateFilter(r.iso, dateFilter)),
    [dateFilter],
  );
  const nhsoTotal = requisitionRows.reduce((s, r) => s + r.nhso, 0);
  const divisionTotal = requisitionRows.reduce((s, r) => s + r.pharmacyDivision, 0);

  /* ── 1.20.2.7 — medication error ──────────────────────────────────────── */
  const medErrorRows = useMemo(() => MED_ERROR_INCIDENTS.filter((r) => {
    if (!matchesIsoDateFilter(r.iso, dateFilter)) return false;
    if (center !== 'all' && r.center !== center) return false;
    return true;
  }), [dateFilter, center]);

  /* keepZero — a category with zero incidents must still show "0 · 0%". */
  const medErrorDonut = useMemo(() => {
    const map = new Map(MED_ERROR_TYPES.map((t) => [t.key, 0]));
    medErrorRows.forEach((r) => map.set(r.type, (map.get(r.type) || 0) + 1));
    return donutFromCounts(
      map,
      (key) => MED_ERROR_TYPE_COLOR[key] || PHCIS_CHART.indigo,
      (key) => medErrorTypeLabel(key),
      true,
    );
  }, [medErrorRows]);

  const medErrorMonths = useMemo(() => {
    const set = new Set(medErrorRows.map((r) => r.iso.slice(0, 7)));
    return [...set].sort();
  }, [medErrorRows]);

  const medErrorSeries = useMemo(() => ([{
    label: 'จำนวนเหตุการณ์',
    color: PHCIS_CHART.pink,
    values: medErrorMonths.map((m) => medErrorRows.filter((r) => r.iso.startsWith(m)).length),
  }]), [medErrorMonths, medErrorRows]);

  const severeErrors = medErrorRows.filter((r) => ['d', 'e'].includes(r.level)).length;

  /* ── 1.20.6.1 / 6.2 — prescriptions + rejects ─────────────────────────── */
  const rxRows = useMemo(() => PRESCRIPTION_STATS.filter((r) => {
    if (!matchesIsoDateFilter(r.iso, dateFilter)) return false;
    if (center !== 'all' && r.center !== center) return false;
    return true;
  }), [dateFilter, center]);

  const rxBuckets = useMemo(() => {
    const map = new Map();
    rxRows.forEach((r) => {
      const key = granularity === 'year'
        ? String(r.year + 543)
        : granularity === 'quarter'
          ? quarterLabelOf(r)
          : r.prefix;
      const e = map.get(key) || { key, sortKey: `${r.year}-${String(r.quarter).padStart(2, '0')}-${r.prefix}`, rxCount: 0, itemCount: 0 };
      e.rxCount += r.rxCount;
      e.itemCount += r.itemCount;
      if (granularity === 'month') e.sortKey = r.prefix;
      if (granularity === 'year') e.sortKey = String(r.year);
      map.set(key, e);
    });
    return [...map.values()].sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey)));
  }, [rxRows, granularity]);

  const rxBucketLabels = rxBuckets.map((b) => (granularity === 'month' ? formatIsoMonthThai(b.key) : b.key));
  const rxSeries = useMemo(() => ([
    { label: 'จำนวนใบสั่งยา', color: PHCIS_CHART.teal, values: rxBuckets.map((b) => b.rxCount) },
    { label: 'จำนวนรายการยา', color: PHCIS_CHART.indigo, values: rxBuckets.map((b) => b.itemCount) },
  ]), [rxBuckets]);

  const rxByUnit = useMemo(() => {
    const map = new Map();
    rxRows.forEach((r) => map.set(r.unit, (map.get(r.unit) || 0) + r.rxCount));
    return hbarRows(
      SERVICE_UNITS
        .map((u) => ({ label: u.label, value: map.get(u.key) || 0 }))
        .filter((r) => r.value > 0)
        .sort((a, b) => b.value - a.value),
      PHCIS_CHART.teal,
      'ใบ',
    );
  }, [rxRows]);

  const rejectRows = useMemo(() => RX_REJECTIONS.filter((r) => {
    if (!matchesIsoDateFilter(r.iso, dateFilter)) return false;
    if (center !== 'all' && r.center !== center) return false;
    return true;
  }), [dateFilter, center]);

  const rejectReasonHbar = useMemo(() => {
    const counts = countBy(rejectRows, (r) => r.reason);
    return hbarRows(
      RX_REJECT_REASONS
        .map((rr) => ({ label: rr.label, value: counts.get(rr.key) || 0 }))
        .filter((r) => r.value > 0)
        .sort((a, b) => b.value - a.value),
      PHCIS_CHART.pink,
      'ใบ',
    );
  }, [rejectRows]);

  const rejectMonths = useMemo(() => {
    const set = new Set(rejectRows.map((r) => r.iso.slice(0, 7)));
    return [...set].sort();
  }, [rejectRows]);

  const rejectSeries = useMemo(() => ([{
    label: 'ใบสั่งยาที่ตีกลับ',
    color: PHCIS_CHART.yellow,
    values: rejectMonths.map((m) => rejectRows.filter((r) => r.iso.startsWith(m)).length),
  }]), [rejectMonths, rejectRows]);

  const totalRx = rxBuckets.reduce((s, b) => s + b.rxCount, 0);

  /* ── summary cards ────────────────────────────────────────────────────── */
  const summaryCards = useMemo(() => ([
    { key: 'items',   label: 'จำนวนยาที่จ่ายทั้งหมด', value: totalDispensedItems.toLocaleString('th-TH'), indicator: rangeLabel,         color: 'brand',       icon: 'medication'  },
    { key: 'drugs',   label: 'รายการยาที่มีการใช้',    value: drugUsageRows.length.toLocaleString('th-TH'), indicator: 'TOR 1.20.2.1',    color: 'info',        icon: 'pill'        },
    { key: 'supply',  label: 'เวชภัณฑ์ที่ใช้ (หน่วย)',  value: supplyTotal.toLocaleString('th-TH'),         indicator: 'TOR 1.20.2.2',    color: 'positive',    icon: 'inventory_2' },
    { key: 'req',     label: 'เบิกยารวม (รายการ)',      value: (nhsoTotal + divisionTotal).toLocaleString('th-TH'), indicator: 'สปสช. + กองเภสัชกรรม', color: 'brand', icon: 'move_down' },
    { key: 'error',   label: 'Medication Error',        value: medErrorRows.length.toLocaleString('th-TH'), indicator: severeErrors > 0 ? `ระดับ D ขึ้นไป ${severeErrors} ครั้ง` : 'ไม่พบระดับ D ขึ้นไป', color: 'destructive', icon: 'report' },
    { key: 'reject',  label: 'ใบสั่งยาที่ตีกลับ',       value: rejectRows.length.toLocaleString('th-TH'),   indicator: `จากใบสั่งยา ${totalRx.toLocaleString('th-TH')} ใบ`, color: 'inprogress', icon: 'undo' },
  ]), [
    totalDispensedItems, drugUsageRows, supplyTotal, nhsoTotal, divisionTotal,
    medErrorRows, severeErrors, rejectRows, totalRx, rangeLabel,
  ]);

  /* ── export catalog ───────────────────────────────────────────────────── */

  const exportDrugUsageRows = useMemo(() => buildDrugUsageRows(() => true), []);

  const exportDrugClassRows = useMemo(() => {
    const map = new Map();
    exportDrugUsageRows.forEach((r) => {
      const e = map.get(r.classification) || { id: r.classification, label: CLASSIFICATION_LABEL[r.classification] || r.classification, items: 0, quantity: 0 };
      e.items += 1;
      e.quantity += r.totalQuantity;
      map.set(r.classification, e);
    });
    const total = [...map.values()].reduce((s, e) => s + e.quantity, 0);
    return [...map.values()]
      .map((e) => ({ ...e, pct: safePct(e.quantity, total) }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [exportDrugUsageRows]);

  const exportRxRows = useMemo(
    () => PRESCRIPTION_STATS.map((r) => ({ ...r, quarterLabel: quarterLabelOf(r) })),
    [],
  );

  const reportsCatalog = useMemo(() => [
    buildExportReport('drug-usage', 'รายงานสถิติการใช้ยารายรายการ', DRUG_USAGE_COLUMNS, exportDrugUsageRows),
    buildExportReport('drug-usage-class', 'รายงานสถิติการใช้ยาแยกตามประเภท', DRUG_CLASS_COLUMNS, exportDrugClassRows),
    buildExportReport('supply-usage', 'รายงานสถิติการใช้เวชภัณฑ์', SUPPLY_COLUMNS, SUPPLY_USAGE, (r) => r.iso),
    buildExportReport('requisition-split', 'รายงานการเบิกยากับ สปสช. และกองเภสัชกรรม', REQUISITION_SPLIT_COLUMNS, REQUISITION_SPLIT, (r) => r.iso),
    buildExportReport('med-error', 'รายงาน Medication Error', MED_ERROR_COLUMNS, MED_ERROR_INCIDENTS, (r) => r.iso),
    buildExportReport('rx-stats', 'รายงานจำนวนใบสั่งยาและรายการยาตามหน่วยบริการ', RX_STATS_COLUMNS, exportRxRows, (r) => r.iso),
    buildExportReport('rx-reject', 'รายงานการตีกลับใบสั่งยาให้แพทย์', RX_REJECT_COLUMNS, RX_REJECTIONS, (r) => r.iso),
  ], [exportDrugUsageRows, exportDrugClassRows, exportRxRows]);

  const exportTopics = useMemo(
    () => reportsCatalog.map((r) => ({ value: r.key, label: r.title })),
    [reportsCatalog],
  );

  const openExport = (keyOrReport, scopeKeys = null) => {
    setExportScopeKeys(scopeKeys);
    if (keyOrReport === 'all' || keyOrReport?.key === 'all') {
      setExportReport({ key: 'all', title: keyOrReport?.title || 'รายงานเภสัชกรรมทั้งหมด' });
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
    if (keys.length === 1) { openExport(keys[0]); return; }
    openExport({ key: 'all', title }, keys);
  };

  const openViewGroup = (groupKey, title) => {
    const keys = EXPORT_GROUP_KEYS[groupKey] || [];
    const reports = keys.map((k) => reportsCatalog.find((r) => r.key === k)).filter(Boolean);
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

  const filtersActive = (dateFilter?.quick || DEFAULT_DATE_FILTER.quick) !== DEFAULT_DATE_FILTER.quick
    || center !== DEFAULT_CENTER
    || drugClass !== DEFAULT_CLASS
    || granularity !== DEFAULT_GRANULARITY;

  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => {
      setDateFilter(DEFAULT_DATE_FILTER);
      setCenter(DEFAULT_CENTER);
      setDrugClass(DEFAULT_CLASS);
      setGranularity(DEFAULT_GRANULARITY);
    },
  );

  const scopeLabel = `${center === 'all' ? 'ทุกศูนย์บริการ' : centerLabel(center)} · ${rangeLabel} · ข้อมูลย้อนหลังสูงสุด ${MONTH_BUCKETS.length} เดือน`;

  return (
    <QueuePageShell
      activeKey='dashboard'
      breadcrumb={breadcrumb}
      title='รายงานเภสัชกรรม'
      afterTitle={(
        <DashboardHeaderFilters
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          defaultQuick='thisyear'
          templateValue={screenValue('pharmacy')}
        ></DashboardHeaderFilters>
      )}
      /* ปุ่มนำส่งออกอยู่หน้าปุ่ม "คำขอเข้าถึงข้อมูล" (มติผู้ใช้ 30 ส.ค. 69) —
         SubHeader วาง leadingActions ก่อน CreateConsentRequestHeaderAction เสมอ */
      leadingActions={(
        <DashboardExportButton label='นำส่งออกรายงานทั้งหมด' onClick={() => openExport('all')} />
      )}
    >
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600)',
          paddingRight: 'var(--dim-space-600)',
          paddingBottom: 'var(--dim-space-600)',
          paddingLeft: 'var(--dim-space-600)',
          gap: 'var(--dim-space-600)',
        }}
      >
        {/* การ์ดสรุปอยู่ใต้แถบ Tab (มติผู้ใช้ 27 ส.ค. 69) — `summaryCards` ของ
            QueuePageShell ถูกวางเหนือ tab เสมอ จึง render เองตรงนี้แทน */}
        <section className='w-full flex items-stretch flex-wrap' style={{ ...CARD, gap: 'var(--dim-space-400)' }}>
          {summaryCards.map((card) => (
            <SummaryCard key={card.key} card={card} variant='panel' />
          ))}
        </section>

        <ReportToolbar>
          <div style={{ width: 'var(--dim-size-2200, 192px)' }}>
            <Dropdown size='md' value={center} onChange={setCenter} options={CENTER_OPTIONS} placeholder='ศูนย์บริการ' />
          </div>
          <div style={{ width: 'var(--dim-size-2200, 192px)' }}>
            <Dropdown size='md' value={drugClass} onChange={setDrugClass} options={CLASS_OPTIONS} placeholder='ประเภทยา' />
          </div>
          <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
        </ReportToolbar>

        <SmoothFilterResults opaque={resultsOpaque}>
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>

            {/* ── 1.20.2.1 / 2.5 / 2.6 ───────────────────────────────────
                การ์ดนี้อ่านจากคิว + ประวัติการจ่ายยาของระบบเภสัชกรรม ซึ่งมี
                เฉพาะ 7 วันล่าสุด (ต่างจากการ์ดอื่นในหน้านี้ที่มีย้อนหลัง 24
                เดือนตามแถบแหล่งข้อมูล) จึงต้องประกาศช่วงจริงไว้ที่หัวการ์ด
                และตอนว่างต้องไม่บอกให้ผู้ใช้ “ขยายช่วงวันที่” ซึ่งไม่ช่วยอะไร */}
            <ReportGroupCard
              title='สถิติการใช้ยา'
              onView={() => openViewGroup('usage', 'สถิติการใช้ยา')}
              onExport={() => openExportGroup('usage', 'รายงานสถิติการใช้ยา')}
            >
              <StatTileRow columns={3}>
                <StatTile label='จำนวนยาที่จ่ายจริง' value={totalDispensedItems.toLocaleString('th-TH')} unit='หน่วย' hint='TOR 1.20.2.1' />
                <StatTile label='จำนวนที่สั่งจ่าย' value={totalOrderedItems.toLocaleString('th-TH')} unit='หน่วย' tone='info' />
                <StatTile
                  label='อัตราการจ่ายสำเร็จ'
                  value={`${safePct(totalDispensedItems, totalOrderedItems)}%`}
                  hint={totalOrderedItems === 0 ? 'ชุดข้อมูลใบสั่งยามีเฉพาะ 7 วันล่าสุด' : undefined}
                />
              </StatTileRow>
              <ChartsRow>
                <ChartPanel title='สัดส่วนการใช้ยาแต่ละประเภท'>
                  {classDonut.length ? (
                    <DonutWithLegend
                      segments={classDonut}
                      size={180}
                      centerLabel={totalOrderedItems.toLocaleString('th-TH')}
                      centerSub='หน่วย'
                    />
                  ) : (
                    <EmptyChartNote
                      text='ชุดข้อมูลใบสั่งยามีเฉพาะ 7 วันล่าสุด'
                      hint='เลือกช่วงเวลาที่ครอบคลุมสัปดาห์ปัจจุบัน'
                    />
                  )}
                </ChartPanel>
                <ChartPanel title='สถิติการใช้ยาแต่ละรายการ (Top 10)' alignContent='start'>
                  {topDrugHbar.length ? (
                    <div className='w-full'>
                      <HBarList valueLabel='หน่วย' maxVisibleRows={6.5} rows={topDrugHbar} />
                    </div>
                  ) : (
                    <EmptyChartNote
                      text='ชุดข้อมูลใบสั่งยามีเฉพาะ 7 วันล่าสุด'
                      hint='เลือกช่วงเวลาที่ครอบคลุมสัปดาห์ปัจจุบัน'
                    />
                  )}
                </ChartPanel>
              </ChartsRow>
            </ReportGroupCard>

            {/* ── 1.20.2.2 ─────────────────────────────────────────────── */}
            <ReportGroupCard
              title='สถิติการใช้เวชภัณฑ์'
              onView={() => openViewGroup('supply', 'สถิติการใช้เวชภัณฑ์')}
              onExport={() => openExportGroup('supply', 'รายงานสถิติการใช้เวชภัณฑ์')}
            >
              <ChartsRow>
                <ChartPanel title='ปริมาณการใช้เวชภัณฑ์รายเดือน'>
                  {supplyMonths.length ? (
                    <div className='w-full' style={{ paddingTop: 'var(--dim-space-200)' }}>
                      <VBars
                        months={supplyMonths.map((m) => formatIsoMonthThai(m))}
                        series={supplySeries}
                        height={220}
                        stacked
                        barMaxWidth={supplyMonths.length <= 6 ? 28 : 14}
                      />
                    </div>
                  ) : <EmptyChartNote />}
                </ChartPanel>
                <ChartPanel title='เวชภัณฑ์ที่ใช้มากที่สุด (Top 6)' alignContent='start'>
                  {supplyTopHbar.length ? (
                    <div className='w-full'><HBarList valueLabel='หน่วย' rows={supplyTopHbar} /></div>
                  ) : <EmptyChartNote />}
                </ChartPanel>
              </ChartsRow>
            </ReportGroupCard>

            {/* ── 1.20.2.3 / 2.4 ───────────────────────────────────────── */}
            <ReportGroupCard
              title='การเบิกยา (สปสช. / กองเภสัชกรรม)'
              onView={() => openViewGroup('requisition', 'การเบิกยา')}
              onExport={() => openExportGroup('requisition', 'รายงานการเบิกยา')}
            >
              <StatTileRow columns={3}>
                <StatTile label='เบิกกับ สปสช.' value={nhsoTotal.toLocaleString('th-TH')} unit='รายการ' hint='TOR 1.20.2.3' />
                <StatTile label='เบิกกับกองเภสัชกรรม' value={divisionTotal.toLocaleString('th-TH')} unit='รายการ' tone='info' hint='TOR 1.20.2.4' />
                <StatTile
                  label='สัดส่วนที่เบิกกับ สปสช.'
                  value={`${safePct(nhsoTotal, nhsoTotal + divisionTotal)}%`}
                  hint={nhsoTotal + divisionTotal === 0 ? 'ไม่มีการเบิกในช่วงนี้' : undefined}
                />
              </StatTileRow>
              <ChartsRow>
                <ChartPanel title='จำนวนยาที่เบิกรายเดือน แยกตามแหล่งเบิก'>
                  {requisitionRows.length ? (
                    <div className='w-full' style={{ paddingTop: 'var(--dim-space-200)' }}>
                      <VBars
                        months={requisitionRows.map((r) => formatIsoMonthThai(r.iso))}
                        series={[
                          { label: 'เบิกกับ สปสช.', color: PHCIS_CHART.teal, values: requisitionRows.map((r) => r.nhso) },
                          { label: 'เบิกกับกองเภสัชกรรม', color: PHCIS_CHART.indigo, values: requisitionRows.map((r) => r.pharmacyDivision) },
                        ]}
                        height={220}
                        barMaxWidth={requisitionRows.length <= 6 ? 24 : 12}
                      />
                    </div>
                  ) : <EmptyChartNote />}
                </ChartPanel>
                <ChartPanel title='สัดส่วนแหล่งเบิกยา'>
                  {nhsoTotal + divisionTotal > 0 ? (
                    <DonutWithLegend
                      segments={[
                        { label: 'สปสช.', value: nhsoTotal, color: PHCIS_CHART.teal },
                        { label: 'กองเภสัชกรรม', value: divisionTotal, color: PHCIS_CHART.indigo },
                      ]}
                      size={180}
                      centerLabel={(nhsoTotal + divisionTotal).toLocaleString('th-TH')}
                      centerSub='รายการ'
                    />
                  ) : <EmptyChartNote />}
                </ChartPanel>
              </ChartsRow>
            </ReportGroupCard>

            {/* ── 1.20.2.7 ─────────────────────────────────────────────── */}
            <ReportGroupCard
              title='ความคลาดเคลื่อนทางยา (Medication Error)'
              onView={() => openViewGroup('error', 'ความคลาดเคลื่อนทางยา (Medication Error)')}
              onExport={() => openExportGroup('error', 'รายงาน Medication Error')}
            >
              <ChartsRow>
                <ChartPanel
                  title='สัดส่วนตามประเภทความคลาดเคลื่อน'
                  hint='แสดงครบทั้ง 4 ประเภทเสมอ แม้บางประเภทจะไม่พบเหตุการณ์'
                >
                  {medErrorRows.length ? (
                    <DonutWithLegend
                      segments={medErrorDonut}
                      size={180}
                      centerLabel={medErrorRows.length.toLocaleString('th-TH')}
                      centerSub='เหตุการณ์'
                    />
                  ) : (
                    <EmptyChartNote
                      text='ไม่พบความคลาดเคลื่อนทางยาในช่วงเวลาที่เลือก'
                      hint='ลองขยายช่วงวันที่ หรือเลือกศูนย์บริการอื่น'
                      icon='verified'
                    />
                  )}
                </ChartPanel>
                <ChartPanel title='แนวโน้มรายเดือน'>
                  {medErrorMonths.length ? (
                    <div className='w-full' style={{ paddingTop: 'var(--dim-space-200)' }}>
                      <VBars
                        months={medErrorMonths.map((m) => formatIsoMonthThai(m))}
                        series={medErrorSeries}
                        height={200}
                        barMaxWidth={medErrorMonths.length <= 6 ? 32 : 14}
                      />
                    </div>
                  ) : <EmptyChartNote />}
                </ChartPanel>
                <ChartPanel title='ระดับความรุนแรงที่พบ' alignContent='start'>
                  {medErrorRows.length ? (
                    <div className='w-full'>
                      <HBarList
                        valueLabel='ครั้ง'
                        rows={hbarRows(
                          [...countBy(medErrorRows, (r) => r.level).entries()]
                            .map(([key, value]) => ({ label: medErrorLevelLabel(key), value }))
                            .sort((a, b) => b.value - a.value),
                          PHCIS_CHART.yellow,
                          'ครั้ง',
                        )}
                      />
                    </div>
                  ) : <EmptyChartNote text='ไม่มีเหตุการณ์ให้จำแนกระดับ' icon='verified' />}
                </ChartPanel>
              </ChartsRow>
            </ReportGroupCard>

            {/* ── 1.20.6.1 / 6.2 ───────────────────────────────────────── */}
            {/* ชิปช่วงเวลาอยู่ที่การ์ดนี้ ไม่ใช่แถบตัวกรองรวมด้านบน (มติผู้ใช้ 30 ส.ค. 69)
                — มันคุมเฉพาะกราฟแท่งสองใบในการ์ดนี้ ไม่ได้คุมทั้งหน้า */}
            <ReportGroupCard
              title='ใบสั่งยาและการตีกลับใบสั่งยา'
              subtitle={center === 'all' ? 'ทุกศูนย์บริการ' : centerLabel(center)}
              extraActions={(
                <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
                  {GRANULARITY_OPTIONS.map((g) => (
                    <FilterTag
                      key={g.key}
                      value={g.label}
                      selected={granularity === g.key}
                      onClick={() => setGranularity(g.key)}
                    />
                  ))}
                </div>
              )}
              onView={() => openViewGroup('prescription', 'ใบสั่งยาและการตีกลับใบสั่งยา')}
              onExport={() => openExportGroup('prescription', 'รายงานใบสั่งยา')}
            >
              <StatTileRow>
                <StatTile label='จำนวนใบสั่งยา' value={totalRx.toLocaleString('th-TH')} unit='ใบ' hint='TOR 1.20.6.1' />
                <StatTile
                  label='จำนวนรายการยา'
                  value={rxBuckets.reduce((s, b) => s + b.itemCount, 0).toLocaleString('th-TH')}
                  unit='รายการ'
                  tone='info'
                />
                <StatTile label='ใบสั่งยาที่ตีกลับ' value={rejectRows.length.toLocaleString('th-TH')} unit='ใบ' tone='warning' hint='TOR 1.20.6.2' />
                <StatTile
                  label='อัตราการตีกลับ'
                  value={`${safePct(rejectRows.length, totalRx)}%`}
                  tone='warning'
                  hint={totalRx === 0 ? 'ไม่มีใบสั่งยาในช่วงนี้' : undefined}
                />
              </StatTileRow>
              <ChartsRow>
                <ChartPanel title='จำนวนใบสั่งยาและรายการยา'>
                  {rxBuckets.length ? (
                    <div className='w-full' style={{ paddingTop: 'var(--dim-space-200)' }}>
                      <VBars
                        months={rxBucketLabels}
                        series={rxSeries}
                        height={220}
                        barMaxWidth={rxBucketLabels.length <= 6 ? 24 : 12}
                      />
                    </div>
                  ) : <EmptyChartNote />}
                </ChartPanel>
                <ChartPanel title='ใบสั่งยาตามหน่วยบริการ' alignContent='start'>
                  {rxByUnit.length ? (
                    <div className='w-full'><HBarList valueLabel='ใบ' rows={rxByUnit} /></div>
                  ) : <EmptyChartNote />}
                </ChartPanel>
                <ChartPanel title='เหตุผลการตีกลับใบสั่งยา' alignContent='start'>
                  {rejectReasonHbar.length ? (
                    <div className='w-full'><HBarList valueLabel='ใบ' rows={rejectReasonHbar} /></div>
                  ) : (
                    <EmptyChartNote
                      text='ไม่มีการตีกลับใบสั่งยาในช่วงนี้'
                      hint='ลองขยายช่วงวันที่'
                      icon='verified'
                    />
                  )}
                </ChartPanel>
              </ChartsRow>
              <ChartsRow>
                <ChartPanel title='แนวโน้มการตีกลับใบสั่งยารายเดือน'>
                  {rejectMonths.length ? (
                    <div className='w-full' style={{ paddingTop: 'var(--dim-space-200)' }}>
                      <VBars
                        months={rejectMonths.map((m) => formatIsoMonthThai(m))}
                        series={rejectSeries}
                        height={200}
                        barMaxWidth={rejectMonths.length <= 6 ? 32 : 14}
                      />
                    </div>
                  ) : <EmptyChartNote />}
                </ChartPanel>
              </ChartsRow>
            </ReportGroupCard>

          </div>
        </SmoothFilterResults>

        <section className='w-full flex flex-col' style={{ ...CARD, gap: 'var(--dim-space-200)' }}>
          <span
            style={{
              color: 'var(--text-content-tertiary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              lineHeight: 1.6,
            }}
          >
            หน้านี้เป็นรายงานระดับ Dashboard (ข้ามศูนย์บริการ) ตาม TOR §1.20.2 และ §1.20.6
            อ่านข้อมูลจากชุดข้อมูลของระบบงานเภสัชกรรมแบบอ่านอย่างเดียว —
            รายงานเชิงปฏิบัติการรายวันของศูนย์อยู่ที่เมนู “ระบบงานเภสัชกรรม › รายงาน”
          </span>
        </section>
      </div>

      <ReportViewPopup
        open={!!viewBundle}
        bundle={viewBundle}
        onClose={() => setViewBundle(null)}
        onExportReport={(report) => { if (report) openExport(report); }}
      />

      <ExportFormatPopup
        open={!!exportReport}
        report={exportReport}
        reportsCatalog={scopedCatalog}
        topics={scopedTopics}
        onClose={() => { setExportReport(null); setExportScopeKeys(null); }}
        onExported={() => setExported(true)}
        documentFooter={DASHBOARD_EXPORT_FOOTER}
        logExportFn={null}
        topicsFieldName='dashboard-pharmacy-export-topics'
      />

      <SuccessToast
        open={exported}
        message='นำส่งออกรายงานเภสัชกรรมแล้ว'
        onClose={() => setExported(false)}
      />
    </QueuePageShell>
  );
};

export default PharmacyAnalyticsPage;
