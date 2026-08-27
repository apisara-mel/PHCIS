import React, { useMemo, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import Badge from '@/components/badge/Badge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import SuccessToast from '@/components/toast/SuccessToast';
import FilterDateTag from '@/components/forms/FilterDateTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import Dropdown from '@/components/forms/Dropdown';
import { screenValue } from '@/components/dashboard/DashboardTemplateSwitcher';
import { DashboardHeaderActions, DashboardHeaderFilters } from '@/components/dashboard/DashboardPageHeader';
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
  ICD10_DISEASE_GROUPS,
  RIGHT_TYPES,
  centerLabel,
  diseaseCode,
  diseaseLabel,
  formatIsoDateThai,
  formatIsoMonthThai,
  rightLabel,
  safePct,
  serviceUnitLabel,
} from '@/data/dashboardCommon';
import {
  CENTER_OPTIONS,
  SERVICE_VISIT_RECORDS,
  UNIT_OPTIONS,
  averageWaitByUnit,
  buildDailyDiseaseRows,
  buildDailyRightsRows,
  countMissingWaitStamp,
  dailyDiseaseSummary,
  dailyRightsSummary,
  rankDiseases,
  todayIso,
  visitTypeLabel,
} from '@/data/dashboardServiceReports';

/* TOR §1.20.5 รายงานผู้รับบริการ + §1.20.4 สรุปประจำวัน
   mih-report-page layout: one scrolling page, four domain cards, charts on the
   page, detail tables inside ดูรายงาน, export through the shared
   ExportFormatPopup. Everything is driven by the FilterDateTag range plus the
   ศูนย์บริการ / หน่วยบริการ chips. */

const breadcrumb = ['แดชบอร์ด', 'รายงานผู้รับบริการ'];

const DEFAULT_DATE_FILTER = { quick: 'thismonth' };
const DEFAULT_CENTER = 'all';
const DEFAULT_UNIT = 'all';

const EXPORT_GROUP_KEYS = {
  visits: ['visit-detail', 'visit-summary', 'noshow-detail'],
  disease: ['disease-rank', 'disease-monthly'],
  wait: ['wait-detail', 'wait-summary'],
  daily: ['daily-rights', 'daily-disease'],
};

const VISIT_TYPE_COLOR = {
  appointment: PHCIS_CHART.teal,
  walkin: PHCIS_CHART.indigo,
  noshow: PHCIS_CHART.pink,
};

const VISIT_TYPE_BADGE = {
  appointment: 'success',
  walkin: 'info',
  noshow: 'warning',
};

/* ── column definitions (render for UI · csv for export) ─────────────────── */

const VISIT_COLUMNS = [
  { key: 'iso', label: 'วันที่', render: (r) => formatIsoDateThai(r.iso), csv: (r) => r.iso },
  { key: 'arrivedAt', label: 'เวลามาถึง' },
  { key: 'hn', label: 'HN' },
  { key: 'patientName', label: 'ชื่อ-สกุล', flex: true, minWidth: 200 },
  { key: 'age', label: 'อายุ', align: 'center' },
  { key: 'gender', label: 'เพศ', align: 'center' },
  {
    key: 'center', label: 'ศูนย์บริการ', flex: true, minWidth: 200,
    render: (r) => centerLabel(r.center), csv: (r) => centerLabel(r.center),
  },
  {
    key: 'unit', label: 'หน่วยบริการ', flex: true, minWidth: 180,
    render: (r) => serviceUnitLabel(r.unit), csv: (r) => serviceUnitLabel(r.unit),
  },
  {
    key: 'visitType', label: 'ประเภทการมา',
    render: (r) => (
      <Badge style={VISIT_TYPE_BADGE[r.visitType] || 'neutral'} size='small'>
        {visitTypeLabel(r.visitType)}
      </Badge>
    ),
    csv: (r) => visitTypeLabel(r.visitType),
  },
  {
    key: 'right', label: 'สิทธิการรักษา', flex: true, minWidth: 180,
    render: (r) => rightLabel(r.right), csv: (r) => rightLabel(r.right),
  },
  {
    key: 'disease', label: 'การวินิจฉัย', flex: true, minWidth: 200,
    render: (r) => `${diseaseCode(r.disease)} ${diseaseLabel(r.disease)}`,
    csv: (r) => `${diseaseCode(r.disease)} ${diseaseLabel(r.disease)}`,
  },
  { key: 'doctor', label: 'แพทย์ผู้ตรวจ', flex: true, minWidth: 180 },
];

const VISIT_SUMMARY_COLUMNS = [
  { key: 'monthLabel', label: 'เดือน', flex: true, minWidth: 140 },
  {
    key: 'centerName', label: 'ศูนย์บริการ', flex: true, minWidth: 200,
  },
  { key: 'unitName', label: 'หน่วยบริการ', flex: true, minWidth: 180 },
  { key: 'appointment', label: 'นัดหมาย', align: 'center' },
  { key: 'walkin', label: 'Walk-in', align: 'center' },
  { key: 'noshow', label: 'ไม่มาตามนัด', align: 'center' },
  { key: 'total', label: 'รวม', align: 'center' },
  {
    key: 'noShowRate', label: 'อัตราไม่มาตามนัด (%)', align: 'right',
    render: (r) => `${r.noShowRate}%`, csv: (r) => r.noShowRate,
  },
];

const NOSHOW_COLUMNS = [
  { key: 'iso', label: 'วันที่นัด', render: (r) => formatIsoDateThai(r.iso), csv: (r) => r.iso },
  { key: 'hn', label: 'HN' },
  { key: 'patientName', label: 'ชื่อ-สกุล', flex: true, minWidth: 200 },
  {
    key: 'center', label: 'ศูนย์บริการ', flex: true, minWidth: 200,
    render: (r) => centerLabel(r.center), csv: (r) => centerLabel(r.center),
  },
  {
    key: 'unit', label: 'หน่วยบริการ', flex: true, minWidth: 180,
    render: (r) => serviceUnitLabel(r.unit), csv: (r) => serviceUnitLabel(r.unit),
  },
  { key: 'noShowReason', label: 'เหตุผลที่ไม่มา', flex: true, minWidth: 180 },
  { key: 'doctor', label: 'แพทย์ผู้นัด', flex: true, minWidth: 180 },
];

const DISEASE_RANK_COLUMNS = [
  { key: 'rank', label: 'อันดับ', align: 'center' },
  { key: 'code', label: 'รหัส ICD-10' },
  { key: 'label', label: 'กลุ่มโรค', flex: true, minWidth: 240 },
  { key: 'value', label: 'จำนวน (ครั้ง)', align: 'center' },
  { key: 'pct', label: 'สัดส่วน (%)', align: 'right', render: (r) => `${r.pct}%`, csv: (r) => r.pct },
];

const DISEASE_MONTHLY_COLUMNS = [
  { key: 'monthLabel', label: 'เดือน', flex: true, minWidth: 140 },
  { key: 'label', label: 'กลุ่มโรค', flex: true, minWidth: 240 },
  { key: 'code', label: 'รหัส ICD-10' },
  { key: 'value', label: 'จำนวน (ครั้ง)', align: 'center' },
];

const WAIT_DETAIL_COLUMNS = [
  { key: 'iso', label: 'วันที่', render: (r) => formatIsoDateThai(r.iso), csv: (r) => r.iso },
  { key: 'arrivedAt', label: 'เวลามาถึง' },
  { key: 'hn', label: 'HN' },
  {
    key: 'center', label: 'ศูนย์บริการ', flex: true, minWidth: 200,
    render: (r) => centerLabel(r.center), csv: (r) => centerLabel(r.center),
  },
  {
    key: 'unit', label: 'หน่วยบริการ', flex: true, minWidth: 180,
    render: (r) => serviceUnitLabel(r.unit), csv: (r) => serviceUnitLabel(r.unit),
  },
  {
    key: 'waitMinutes', label: 'ระยะเวลารอคอย (นาที)', align: 'center',
    render: (r) => (r.waitMinutes == null ? '—' : `${r.waitMinutes}`),
    csv: (r) => (r.waitMinutes == null ? '' : r.waitMinutes),
  },
  {
    key: 'stamp', label: 'ความครบถ้วนของเวลา',
    render: (r) => (r.waitMinutes == null
      ? <Badge style='warning' size='small'>ไม่มีเวลาสิ้นสุด</Badge>
      : <Badge style='success' size='small'>ครบถ้วน</Badge>),
    csv: (r) => (r.waitMinutes == null ? 'ไม่มีเวลาสิ้นสุด' : 'ครบถ้วน'),
  },
];

const WAIT_SUMMARY_COLUMNS = [
  { key: 'label', label: 'หน่วยบริการ', flex: true, minWidth: 220 },
  { key: 'avg', label: 'เฉลี่ย (นาที)', align: 'center' },
  { key: 'max', label: 'สูงสุด (นาที)', align: 'center' },
  { key: 'samples', label: 'จำนวนตัวอย่าง', align: 'center' },
];

const DAILY_RIGHTS_COLUMNS = [
  { key: 'iso', label: 'วันที่', render: (r) => formatIsoDateThai(r.iso), csv: (r) => r.iso },
  {
    key: 'center', label: 'ศูนย์บริการ', flex: true, minWidth: 200,
    render: (r) => centerLabel(r.center), csv: (r) => centerLabel(r.center),
  },
  {
    key: 'right', label: 'สิทธิการรักษา', flex: true, minWidth: 200,
    render: (r) => rightLabel(r.right), csv: (r) => rightLabel(r.right),
  },
  { key: 'count', label: 'จำนวนที่เปิดสิทธิ', align: 'center' },
  { key: 'newRegistration', label: 'เปิดสิทธิใหม่ (Walk-in)', align: 'center' },
];

const DAILY_DISEASE_COLUMNS = [
  { key: 'iso', label: 'วันที่', render: (r) => formatIsoDateThai(r.iso), csv: (r) => r.iso },
  {
    key: 'disease', label: 'กลุ่มโรค', flex: true, minWidth: 240,
    render: (r) => `${diseaseCode(r.disease)} ${diseaseLabel(r.disease)}`,
    csv: (r) => `${diseaseCode(r.disease)} ${diseaseLabel(r.disease)}`,
  },
  { key: 'count', label: 'จำนวน (ครั้ง)', align: 'center' },
  { key: 'unitCount', label: 'จำนวนหน่วยบริการที่พบ', align: 'center' },
];

/* ── month bucketing helpers ─────────────────────────────────────────────── */

const monthKeysOf = (rows) => {
  const set = new Set(rows.map((r) => String(r.iso).slice(0, 7)));
  return [...set].sort();
};

const ServiceReportsPage = () => {
  const [dateFilter, setDateFilter] = useState(DEFAULT_DATE_FILTER);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [unit, setUnit] = useState(DEFAULT_UNIT);
  const [viewBundle, setViewBundle] = useState(null);
  const [exportReport, setExportReport] = useState(null);
  const [exportScopeKeys, setExportScopeKeys] = useState(null);
  const [exported, setExported] = useState(false);

  const { from, to } = rangeBoundsIso(dateFilter);
  const rangeLabel = formatRangeLabel(from, to, dateFilter);

  /* Rows filtered by every active control — the single source for all charts. */
  const rows = useMemo(() => SERVICE_VISIT_RECORDS.filter((r) => {
    if (!matchesIsoDateFilter(r.iso, dateFilter)) return false;
    if (center !== 'all' && r.center !== center) return false;
    if (unit !== 'all' && r.unit !== unit) return false;
    return true;
  }), [dateFilter, center, unit]);

  const attended = useMemo(() => rows.filter((r) => r.visitType !== 'noshow'), [rows]);
  const noShowRows = useMemo(() => rows.filter((r) => r.visitType === 'noshow'), [rows]);
  const appointmentRows = useMemo(() => rows.filter((r) => r.visitType === 'appointment'), [rows]);
  const walkinRows = useMemo(() => rows.filter((r) => r.visitType === 'walkin'), [rows]);

  /* §1.20.5.1–5.3 — visit-type mix + monthly trend */
  const visitDonut = useMemo(() => donutFromCounts(
    countBy(rows, (r) => r.visitType),
    (key, i) => VISIT_TYPE_COLOR[key] || PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length],
    (key) => visitTypeLabel(key),
  ), [rows]);

  const monthKeys = useMemo(() => monthKeysOf(rows), [rows]);
  const monthlySeries = useMemo(() => ([
    {
      label: 'นัดหมาย',
      color: PHCIS_CHART.teal,
      values: monthKeys.map((m) => appointmentRows.filter((r) => r.iso.startsWith(m)).length),
    },
    {
      label: 'Walk-in',
      color: PHCIS_CHART.indigo,
      values: monthKeys.map((m) => walkinRows.filter((r) => r.iso.startsWith(m)).length),
    },
    {
      label: 'ไม่มาตามนัด',
      color: PHCIS_CHART.pink,
      values: monthKeys.map((m) => noShowRows.filter((r) => r.iso.startsWith(m)).length),
    },
  ]), [monthKeys, appointmentRows, walkinRows, noShowRows]);

  const centerBars = useMemo(() => {
    const list = BMA_SERVICE_CENTERS
      .map((c) => ({ label: c.code, value: rows.filter((r) => r.center === c.key).length }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);
    return hbarRows(list, PHCIS_CHART.teal, 'ครั้ง');
  }, [rows]);

  /* §1.20.5.4–5.5 — disease ranking + monthly disease bars */
  const diseaseRank = useMemo(() => rankDiseases(attended, 10), [attended]);
  const diseaseTotal = attended.length;
  const diseaseHbar = useMemo(
    () => hbarRows(diseaseRank.map((d) => ({ label: `${d.code} ${d.label}`, value: d.value })), PHCIS_CHART.indigo, 'ครั้ง'),
    [diseaseRank],
  );
  const topFiveDiseases = diseaseRank.slice(0, 5);
  const diseaseMonthlySeries = useMemo(() => topFiveDiseases.map((d, i) => ({
    label: d.label,
    color: PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length],
    values: monthKeys.map((m) => attended.filter((r) => r.disease === d.key && r.iso.startsWith(m)).length),
  })), [topFiveDiseases, monthKeys, attended]);

  /* §1.20.5.6 — waiting time */
  const waitByUnit = useMemo(() => averageWaitByUnit(rows), [rows]);
  const waitHbar = useMemo(
    () => hbarRows(waitByUnit.map((w) => ({ label: w.label, value: w.avg })), PHCIS_CHART.yellow, 'นาที'),
    [waitByUnit],
  );
  const missingWaitCount = useMemo(() => countMissingWaitStamp(rows), [rows]);
  const waitSamples = useMemo(() => rows.filter((r) => r.waitMinutes != null), [rows]);
  const avgWaitAll = waitSamples.length
    ? Math.round(waitSamples.reduce((s, r) => s + r.waitMinutes, 0) / waitSamples.length)
    : 0;
  const waitTrendSeries = useMemo(() => ([{
    label: 'ระยะเวลารอคอยเฉลี่ย (นาที)',
    color: PHCIS_CHART.yellow,
    values: monthKeys.map((m) => {
      const bucket = waitSamples.filter((r) => r.iso.startsWith(m));
      if (!bucket.length) return 0;
      return Math.round(bucket.reduce((s, r) => s + r.waitMinutes, 0) / bucket.length);
    }),
  }]), [monthKeys, waitSamples]);

  /* §1.20.4.1 / §1.20.4.2 — today's snapshot (always "วันนี้", never the range) */
  const today = todayIso();
  const rightsToday = useMemo(() => dailyRightsSummary(today), [today]);
  const diseaseToday = useMemo(() => dailyDiseaseSummary(today), [today]);

  const rightsTodayDonut = useMemo(() => donutFromCounts(
    rightsToday.counts,
    (_k, i) => PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length],
    (key) => rightLabel(key),
  ), [rightsToday]);

  const diseaseTodayDonut = useMemo(() => donutFromCounts(
    diseaseToday.counts,
    (_k, i) => PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length],
    (key) => diseaseLabel(key),
  ).slice(0, 8), [diseaseToday]);

  /* ── summary cards ─────────────────────────────────────────────────────── */
  const summaryCards = useMemo(() => ([
    { key: 'total',  label: 'ผู้รับบริการทั้งหมด', value: rows.length.toLocaleString('th-TH'), indicator: rangeLabel, color: 'brand',       icon: 'groups'        },
    { key: 'appt',   label: 'มาตามนัดหมาย',        value: appointmentRows.length.toLocaleString('th-TH'), indicator: 'TOR 1.20.5.1', color: 'positive',    icon: 'event_available' },
    { key: 'walkin', label: 'Walk-in',              value: walkinRows.length.toLocaleString('th-TH'), indicator: 'TOR 1.20.5.3', color: 'info',        icon: 'directions_walk' },
    { key: 'noshow', label: 'ไม่มาตามนัดหมาย',     value: noShowRows.length.toLocaleString('th-TH'), indicator: `อัตรา ${safePct(noShowRows.length, appointmentRows.length + noShowRows.length)}%`, color: 'destructive', icon: 'event_busy' },
    { key: 'wait',   label: 'รอคอยเฉลี่ย (นาที)',   value: avgWaitAll, indicator: `จาก ${waitSamples.length.toLocaleString('th-TH')} ครั้ง`, color: 'inprogress',  icon: 'timer' },
    { key: 'disease', label: 'อันดับโรคที่พบมากสุด', value: diseaseRank[0]?.code || '—', indicator: diseaseRank[0]?.label || 'ไม่มีข้อมูล', color: 'brand', icon: 'coronavirus' },
  ]), [rows, appointmentRows, walkinRows, noShowRows, avgWaitAll, waitSamples, diseaseRank, rangeLabel]);

  /* ── export catalog (wide date window; popup re-scopes via _iso) ───────── */

  const exportVisitRows = SERVICE_VISIT_RECORDS;
  const exportNoShowRows = useMemo(
    () => SERVICE_VISIT_RECORDS.filter((r) => r.visitType === 'noshow'),
    [],
  );

  const exportVisitSummaryRows = useMemo(() => {
    const map = new Map();
    SERVICE_VISIT_RECORDS.forEach((r) => {
      const monthKey = r.iso.slice(0, 7);
      const key = `${monthKey}|${r.center}|${r.unit}`;
      const e = map.get(key) || {
        id: key,
        iso: `${monthKey}-01`,
        monthLabel: formatIsoMonthThai(monthKey),
        centerName: centerLabel(r.center),
        unitName: serviceUnitLabel(r.unit),
        appointment: 0, walkin: 0, noshow: 0, total: 0,
      };
      e[r.visitType] += 1;
      e.total += 1;
      map.set(key, e);
    });
    return [...map.values()]
      .map((e) => ({ ...e, noShowRate: safePct(e.noshow, e.appointment + e.noshow) }))
      .sort((a, b) => String(b.iso).localeCompare(String(a.iso)) || b.total - a.total);
  }, []);

  const exportDiseaseRankRows = useMemo(() => {
    const ranked = rankDiseases(SERVICE_VISIT_RECORDS, ICD10_DISEASE_GROUPS.length);
    const total = ranked.reduce((s, r) => s + r.value, 0);
    return ranked.map((r, i) => ({
      id: r.key, rank: i + 1, code: r.code, label: r.label, value: r.value, pct: safePct(r.value, total),
    }));
  }, []);

  const exportDiseaseMonthlyRows = useMemo(() => {
    const map = new Map();
    SERVICE_VISIT_RECORDS.forEach((r) => {
      if (r.visitType === 'noshow') return;
      const monthKey = r.iso.slice(0, 7);
      const key = `${monthKey}|${r.disease}`;
      const e = map.get(key) || {
        id: key,
        iso: `${monthKey}-01`,
        monthLabel: formatIsoMonthThai(monthKey),
        label: diseaseLabel(r.disease),
        code: diseaseCode(r.disease),
        value: 0,
      };
      e.value += 1;
      map.set(key, e);
    });
    return [...map.values()].sort(
      (a, b) => String(b.iso).localeCompare(String(a.iso)) || b.value - a.value,
    );
  }, []);

  const exportWaitSummaryRows = useMemo(
    () => averageWaitByUnit(SERVICE_VISIT_RECORDS).map((w) => ({ ...w, id: w.key })),
    [],
  );

  const exportDailyRightsRows = useMemo(() => buildDailyRightsRows(), []);
  const exportDailyDiseaseRows = useMemo(() => buildDailyDiseaseRows(), []);

  const reportsCatalog = useMemo(() => [
    buildExportReport('visit-detail', 'รายงานรายละเอียดการมารับบริการ', VISIT_COLUMNS, exportVisitRows, (r) => r.iso),
    buildExportReport('visit-summary', 'รายงานสรุปการมารับบริการตามหน่วยบริการ', VISIT_SUMMARY_COLUMNS, exportVisitSummaryRows, (r) => r.iso),
    buildExportReport('noshow-detail', 'รายงานผู้ไม่มาตามนัดหมาย', NOSHOW_COLUMNS, exportNoShowRows, (r) => r.iso),
    buildExportReport('disease-rank', 'รายงานอันดับโรคของผู้รับบริการ', DISEASE_RANK_COLUMNS, exportDiseaseRankRows),
    buildExportReport('disease-monthly', 'รายงานผู้รับบริการจำแนกตามโรครายเดือน', DISEASE_MONTHLY_COLUMNS, exportDiseaseMonthlyRows, (r) => r.iso),
    buildExportReport('wait-detail', 'รายงานระยะเวลารอคอยรายครั้ง', WAIT_DETAIL_COLUMNS, exportVisitRows.filter((r) => r.visitType !== 'noshow'), (r) => r.iso),
    buildExportReport('wait-summary', 'รายงานสรุประยะเวลารอคอยตามหน่วยบริการ', WAIT_SUMMARY_COLUMNS, exportWaitSummaryRows),
    buildExportReport('daily-rights', 'รายงานสรุปการเปิดสิทธิรายวัน', DAILY_RIGHTS_COLUMNS, exportDailyRightsRows, (r) => r.iso),
    buildExportReport('daily-disease', 'รายงานสรุปโรคของผู้รับบริการประจำวัน', DAILY_DISEASE_COLUMNS, exportDailyDiseaseRows, (r) => r.iso),
  ], [
    exportVisitRows, exportVisitSummaryRows, exportNoShowRows, exportDiseaseRankRows,
    exportDiseaseMonthlyRows, exportWaitSummaryRows, exportDailyRightsRows, exportDailyDiseaseRows,
  ]);

  const exportTopics = useMemo(
    () => reportsCatalog.map((r) => ({ value: r.key, label: r.title })),
    [reportsCatalog],
  );

  const openExport = (keyOrReport, scopeKeys = null) => {
    setExportScopeKeys(scopeKeys);
    if (keyOrReport === 'all' || keyOrReport?.key === 'all') {
      setExportReport({ key: 'all', title: keyOrReport?.title || 'รายงานผู้รับบริการทั้งหมด' });
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

  const filtersActive = (dateFilter?.quick || 'thismonth') !== 'thismonth'
    || center !== DEFAULT_CENTER
    || unit !== DEFAULT_UNIT;

  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => {
      setDateFilter(DEFAULT_DATE_FILTER);
      setCenter(DEFAULT_CENTER);
      setUnit(DEFAULT_UNIT);
    },
  );

  const scopeLabel = `${center === 'all' ? 'ทุกศูนย์บริการ' : centerLabel(center)} · ${unit === 'all' ? 'ทุกหน่วยบริการ' : serviceUnitLabel(unit)} · ${rangeLabel}`;

  return (
    <QueuePageShell
      activeKey='dashboard'
      breadcrumb={breadcrumb}
      title='รายงานผู้รับบริการ'
      afterTitle={(
        <DashboardHeaderFilters
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          defaultQuick='thismonth'
          templateValue={screenValue('reports')}
        ></DashboardHeaderFilters>
      )}
      actions={<DashboardHeaderActions />}
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

        <ReportToolbar
          trailing={(
            <NeutralSubdueButton leadingIcon='ios_share' size='md' onClick={() => openExport('all')}>
              นำส่งออกรายงานทั้งหมด
            </NeutralSubdueButton>
          )}
        >
          <div style={{ width: 'var(--dim-size-2200, 192px)' }}>
            <Dropdown
              size='md'
              value={center}
              onChange={setCenter}
              options={CENTER_OPTIONS}
              placeholder='ศูนย์บริการ'
            />
          </div>
          <div style={{ width: 'var(--dim-size-2200, 192px)' }}>
            <Dropdown
              size='md'
              value={unit}
              onChange={setUnit}
              options={UNIT_OPTIONS}
              placeholder='หน่วยบริการ'
            />
          </div>
          <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
        </ReportToolbar>

        <SmoothFilterResults opaque={resultsOpaque}>
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>

            {/* ── 1.20.5.1 / 5.2 / 5.3 ─────────────────────────────────── */}
            <ReportGroupCard
              title='นัดหมายและการมารับบริการ'
              onView={() => openViewGroup('visits', 'นัดหมายและการมารับบริการ')}
              onExport={() => openExportGroup('visits', 'รายงานการมารับบริการ')}
            >
              <StatTileRow>
                <StatTile label='มาตามนัดหมาย' value={appointmentRows.length.toLocaleString('th-TH')} unit='ครั้ง' hint='TOR 1.20.5.1' />
                <StatTile label='ไม่มาตามนัดหมาย' value={noShowRows.length.toLocaleString('th-TH')} unit='ครั้ง' tone='warning' hint='TOR 1.20.5.2' />
                <StatTile label='Walk-in' value={walkinRows.length.toLocaleString('th-TH')} unit='ครั้ง' tone='info' hint='TOR 1.20.5.3' />
                <StatTile
                  label='อัตราไม่มาตามนัด'
                  value={`${safePct(noShowRows.length, appointmentRows.length + noShowRows.length)}%`}
                  tone='warning'
                  hint={appointmentRows.length + noShowRows.length === 0 ? 'ไม่มีนัดหมายในช่วงนี้' : `จากนัดหมาย ${(appointmentRows.length + noShowRows.length).toLocaleString('th-TH')} ครั้ง`}
                />
              </StatTileRow>
              <ChartsRow>
                <ChartPanel title='สัดส่วนประเภทการมารับบริการ'>
                  {visitDonut.length ? (
                    <DonutWithLegend
                      segments={visitDonut}
                      size={180}
                      centerLabel={rows.length.toLocaleString('th-TH')}
                      centerSub='ครั้ง'
                    />
                  ) : <EmptyChartNote />}
                </ChartPanel>
                <ChartPanel title='แนวโน้มรายเดือน'>
                  {monthKeys.length ? (
                    <div className='w-full' style={{ paddingTop: 'var(--dim-space-200)' }}>
                      <VBars
                        months={monthKeys.map((m) => formatIsoMonthThai(m))}
                        series={monthlySeries}
                        height={200}
                        barMaxWidth={monthKeys.length <= 6 ? 24 : 12}
                      />
                    </div>
                  ) : <EmptyChartNote />}
                </ChartPanel>
                <ChartPanel title='จำนวนตามศูนย์บริการ' alignContent='start'>
                  {centerBars.length ? (
                    <div className='w-full'><HBarList valueLabel='ครั้ง' rows={centerBars} /></div>
                  ) : <EmptyChartNote />}
                </ChartPanel>
              </ChartsRow>
            </ReportGroupCard>

            {/* ── 1.20.5.4 / 5.5 ───────────────────────────────────────── */}
            <ReportGroupCard
              title='โรคของผู้รับบริการ'
              onView={() => openViewGroup('disease', 'โรคของผู้รับบริการ')}
              onExport={() => openExportGroup('disease', 'รายงานโรคของผู้รับบริการ')}
            >
              <ChartsRow>
                <ChartPanel title='อันดับโรคของผู้รับบริการ (Top 10 · ICD-10)' alignContent='start'>
                  {diseaseHbar.length ? (
                    <div className='w-full'>
                      <HBarList valueLabel='ครั้ง' maxVisibleRows={6.5} rows={diseaseHbar} />
                    </div>
                  ) : <EmptyChartNote />}
                </ChartPanel>
                <ChartPanel title='สัดส่วน 5 อันดับแรก'>
                  {topFiveDiseases.length ? (
                    <DonutWithLegend
                      segments={topFiveDiseases.map((d, i) => ({
                        label: d.label,
                        value: d.value,
                        color: PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length],
                      }))}
                      size={180}
                      centerLabel={`${safePct(topFiveDiseases.reduce((s, d) => s + d.value, 0), diseaseTotal)}%`}
                      centerSub='ของผู้รับบริการ'
                    />
                  ) : <EmptyChartNote />}
                </ChartPanel>
                <ChartPanel title='จำแนกตามโรครายเดือน (5 อันดับแรก)'>
                  {monthKeys.length && diseaseMonthlySeries.length ? (
                    <div className='w-full' style={{ paddingTop: 'var(--dim-space-200)' }}>
                      <VBars
                        months={monthKeys.map((m) => formatIsoMonthThai(m))}
                        series={diseaseMonthlySeries}
                        height={200}
                        stacked
                        barMaxWidth={monthKeys.length <= 6 ? 24 : 12}
                      />
                    </div>
                  ) : <EmptyChartNote />}
                </ChartPanel>
              </ChartsRow>
            </ReportGroupCard>

            {/* ── 1.20.5.6 ─────────────────────────────────────────────── */}
            <ReportGroupCard
              title='ระยะเวลารอคอยผู้รับบริการ'
              onView={() => openViewGroup('wait', 'ระยะเวลารอคอยผู้รับบริการ')}
              onExport={() => openExportGroup('wait', 'รายงานระยะเวลารอคอย')}
            >
              <StatTileRow columns={3}>
                <StatTile label='รอคอยเฉลี่ยทุกหน่วยบริการ' value={avgWaitAll} unit='นาที' tone={avgWaitAll > 45 ? 'warning' : undefined} />
                <StatTile label='จำนวนครั้งที่นำมาคำนวณ' value={waitSamples.length.toLocaleString('th-TH')} unit='ครั้ง' />
                <StatTile
                  label='ไม่มีเวลาสิ้นสุด (ตัดออกจากค่าเฉลี่ย)'
                  value={missingWaitCount.toLocaleString('th-TH')}
                  unit='ครั้ง'
                  tone={missingWaitCount > 0 ? 'warning' : undefined}
                />
              </StatTileRow>
              <ChartsRow>
                <ChartPanel
                  title='ระยะเวลารอคอยเฉลี่ยตามหน่วยบริการ'
                  hint={missingWaitCount > 0 ? `ไม่รวม ${missingWaitCount} ครั้งที่ไม่มีเวลาสิ้นสุด` : undefined}
                  alignContent='start'
                >
                  {waitHbar.length ? (
                    <div className='w-full'><HBarList valueLabel='นาที' rows={waitHbar} /></div>
                  ) : <EmptyChartNote />}
                </ChartPanel>
                <ChartPanel title='แนวโน้มระยะเวลารอคอยรายเดือน'>
                  {monthKeys.length ? (
                    <div className='w-full' style={{ paddingTop: 'var(--dim-space-200)' }}>
                      <VBars
                        months={monthKeys.map((m) => formatIsoMonthThai(m))}
                        series={waitTrendSeries}
                        height={200}
                        barMaxWidth={monthKeys.length <= 6 ? 32 : 14}
                      />
                    </div>
                  ) : <EmptyChartNote />}
                </ChartPanel>
              </ChartsRow>
            </ReportGroupCard>

            {/* ── 1.20.4.1 / 4.2 ───────────────────────────────────────── */}
            <ReportGroupCard
              title={`สรุปประจำวัน · ${formatIsoDateThai(today)}`}
              subtitle='สรุปนี้ยึด “วันนี้” เสมอ ไม่ขึ้นกับช่วงเวลาที่เลือกด้านบน (TOR 1.20.4.1 / 1.20.4.2)'
              onView={() => openViewGroup('daily', 'สรุปประจำวัน')}
              onExport={() => openExportGroup('daily', 'รายงานสรุปประจำวัน')}
            >
              <ChartsRow>
                <ChartPanel title='สรุปการเปิดสิทธิรายวัน'>
                  {rightsTodayDonut.length ? (
                    <DonutWithLegend
                      segments={rightsTodayDonut}
                      size={180}
                      centerLabel={rightsToday.total.toLocaleString('th-TH')}
                      centerSub='ครั้ง'
                    />
                  ) : (
                    <EmptyChartNote
                      text='วันนี้ยังไม่มีการเปิดสิทธิ'
                      hint='ข้อมูลจะปรากฏเมื่อมีผู้รับบริการรายแรกของวัน'
                      icon='badge'
                    />
                  )}
                </ChartPanel>
                <ChartPanel title='โรคของผู้รับบริการประจำวัน'>
                  {diseaseTodayDonut.length ? (
                    <DonutWithLegend
                      segments={diseaseTodayDonut}
                      size={180}
                      centerLabel={diseaseToday.total.toLocaleString('th-TH')}
                      centerSub='ครั้ง'
                    />
                  ) : (
                    <EmptyChartNote
                      text='วันนี้ยังไม่มีการวินิจฉัย'
                      hint='ข้อมูลจะปรากฏเมื่อมีการบันทึกการวินิจฉัยรายแรกของวัน'
                      icon='clinical_notes'
                    />
                  )}
                </ChartPanel>
                <ChartPanel title='สิทธิที่เปิดมากที่สุดวันนี้' alignContent='start'>
                  {rightsToday.total > 0 ? (
                    <div className='w-full'>
                      <HBarList
                        valueLabel='ครั้ง'
                        rows={hbarRows(
                          RIGHT_TYPES
                            .map((rt) => ({ label: rt.label, value: rightsToday.counts.get(rt.key) || 0 }))
                            .filter((r) => r.value > 0)
                            .sort((a, b) => b.value - a.value),
                          PHCIS_CHART.teal,
                          'ครั้ง',
                        )}
                      />
                    </div>
                  ) : (
                    <EmptyChartNote
                      text='วันนี้ยังไม่มีการเปิดสิทธิ'
                      hint='ดูย้อนหลังได้จากปุ่ม ดูรายงาน'
                      icon='badge'
                    />
                  )}
                </ChartPanel>
              </ChartsRow>
            </ReportGroupCard>

          </div>
        </SmoothFilterResults>

        <section
          className='w-full flex flex-col'
          style={{ ...CARD, gap: 'var(--dim-space-200)' }}
        >
          <span
            style={{
              color: 'var(--text-content-tertiary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              lineHeight: 1.6,
            }}
          >
            ขอบเขตข้อมูล: {scopeLabel} · จำนวนที่นำมาคำนวณ {rows.length.toLocaleString('th-TH')} ครั้ง
            {missingWaitCount > 0 ? ` · ตัดออกจากค่าเฉลี่ยเวลารอคอย ${missingWaitCount} ครั้ง (ไม่มีเวลาสิ้นสุด)` : ''}
          </span>
        </section>
      </div>

      <ReportViewPopup
        open={!!viewBundle}
        bundle={viewBundle}
        onClose={() => setViewBundle(null)}
        onExportReport={(report) => { if (report) openExport(report); }}
        footnote={viewBundle?.key === 'wait' && missingWaitCount > 0
          ? `หมายเหตุ: ${missingWaitCount} ครั้งไม่มีเวลาสิ้นสุดการรับบริการ จึงไม่ถูกนำมาคำนวณค่าเฉลี่ย`
          : null}
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
        topicsFieldName='dashboard-service-export-topics'
      />

      <SuccessToast
        open={exported}
        message='นำส่งออกรายงานผู้รับบริการแล้ว'
        onClose={() => setExported(false)}
      />
    </QueuePageShell>
  );
};

export default ServiceReportsPage;
