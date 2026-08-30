import React, { useMemo, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import Badge from '@/components/badge/Badge';
import SuccessToast from '@/components/toast/SuccessToast';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import Dropdown from '@/components/forms/Dropdown';
import FilterTag from '@/components/forms/FilterTag';
import { DashboardExportButton, DashboardHeaderActions, DashboardHeaderFilters } from '@/components/dashboard/DashboardPageHeader';
import { screenValue } from '@/components/dashboard/DashboardTemplateSwitcher';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import { DonutWithLegend, HBarList, LineChart, VBars } from '@/components/graph/Charts';
import PHCIS_CHART, { PHCIS_CHART_PALETTE } from '@/data/phcisChartPalette';
import { ExportFormatPopup } from '@/pages/consent/consentExportPopup';
import {
  CARD,
  ChartPanel,
  ChartsRow,
  DASHBOARD_EXPORT_FOOTER,
  EmptyChartNote,
  ReportGroupCard,
  ReportToolbar,
  ReportViewPopup,
  StatTile,
  StatTileRow,
  buildExportReport,
  countBy,
  donutFromCounts,
  formatRangeLabel,
  matchesIsoDateFilter,
  rangeBoundsIso,
} from '@/pages/dashboard/dashboardReportKit';
import {
  centerLabel,
  diseaseCode,
  diseaseLabel,
  formatIsoDateThai,
  formatIsoMonthThai,
  rightLabel,
  safePct,
  serviceUnitLabel,
} from '@/data/dashboardCommon';
import { rankDiseases, visitTypeLabel } from '@/data/dashboardServiceReports';
import {
  MY_UNIT_OPTIONS,
  MY_VISIT_RECORDS,
  PRACTICE_VISIT_RECORDS,
  TREND_GRANULARITY_OPTIONS,
  attendedOf,
  averageOf,
  bucketRowsByGranularity,
  hourlyWorkload,
  myOrderSets,
  peerAveragePerDoctor,
  prescriptionSummary,
} from '@/data/myPracticeStats';

/* สถิติการตรวจรักษาของฉัน — หนึ่งในหน้าจอของระบบแดชบอร์ด (§1.20) เลือกได้จากชิป
   Template เหมือนหน้าจอมาตรฐานหน้าอื่น ทะเบียนหน้าจออยู่ที่ DASHBOARD_NAV_LINKS
   ที่เดียว (มติผู้ใช้ 30 ส.ค. 69 — ย้ายมาจากเมนูโปรไฟล์)

   ฐานอ้างอิง: ToR ไม่มีข้อสั่ง "แดชบอร์ดรายบุคคลของผู้ให้บริการ" โดยตรง หน้านี้
   จึงยืนบน §1.20.11 (Dashboard อื่น ๆ ตามที่สำนักอนามัยกำหนด) + มติ คทง.3
   ครั้งที่ 7 (10 พ.ย. 68) ที่ระบุว่ารายงาน/Dashboard ต้องให้ "ผู้ใช้งานทุกระดับ
   เข้าถึงได้ เพื่อนำไปปรับปรุงงานคุณภาพ" และให้เลือกช่วงเวลาได้ตามตัวแปรมาตรฐาน
   ตัวเลขทุกใบเป็น slice เฉพาะของผู้ใช้ที่ล็อกอิน จากข้อที่ ToR สั่งไว้แล้ว
   (ผูกไว้ที่ hint ของ StatTile แต่ละใบ)

   PDPA / จรรยาบรรณ: ไม่มีจุดใดเปิดผลงานรายคนของแพทย์คนอื่น เส้นเทียบในกราฟ
   แนวโน้มเป็น "ค่าเฉลี่ยต่อแพทย์หนึ่งคน" แบบไม่ระบุชื่อเท่านั้น */

const breadcrumb = ['แดชบอร์ด', 'สถิติการตรวจรักษาของฉัน'];

const DEFAULT_DATE_FILTER = { quick: 'thismonth' };
const DEFAULT_UNIT = 'all';
const DEFAULT_GRANULARITY = 'month';
/* รายเดือนตัดที่ 12 ช่วง ไม่งั้นแกนแน่นจนอ่านไม่ออก · ไตรมาส/ปี/ปีงบมีไม่กี่แท่งอยู่แล้ว */
const TREND_LIMIT = { month: 12 };

const EXPORT_GROUP_KEYS = {
  workload: ['my-visit-detail', 'my-visit-monthly'],
  disease: ['my-disease-rank'],
  time: ['my-time-detail'],
  quality: ['my-rx-returned', 'my-order-sets'],
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

/* ── column definitions (render สำหรับ ดูรายงาน · csv สำหรับส่งออก) ───────── */

const MY_VISIT_COLUMNS = [
  { key: 'iso', label: 'วันที่', render: (r) => formatIsoDateThai(r.iso), csv: (r) => r.iso },
  { key: 'arrivedAt', label: 'เวลามาถึง' },
  { key: 'hn', label: 'HN' },
  { key: 'patientName', label: 'ชื่อ-สกุล', flex: true, minWidth: 200 },
  { key: 'age', label: 'อายุ', align: 'center' },
  { key: 'gender', label: 'เพศ', align: 'center' },
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
  {
    key: 'center', label: 'ศูนย์บริการ', flex: true, minWidth: 200,
    render: (r) => centerLabel(r.center), csv: (r) => centerLabel(r.center),
  },
];

const MY_VISIT_MONTHLY_COLUMNS = [
  { key: 'monthLabel', label: 'เดือน', flex: true, minWidth: 140 },
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

const MY_DISEASE_COLUMNS = [
  { key: 'rank', label: 'อันดับ', align: 'center' },
  { key: 'code', label: 'รหัส ICD-10' },
  { key: 'label', label: 'กลุ่มโรค', flex: true, minWidth: 240 },
  { key: 'value', label: 'จำนวน (ครั้ง)', align: 'center' },
  { key: 'pct', label: 'สัดส่วน (%)', align: 'right', render: (r) => `${r.pct}%`, csv: (r) => r.pct },
];

const MY_TIME_COLUMNS = [
  { key: 'iso', label: 'วันที่', render: (r) => formatIsoDateThai(r.iso), csv: (r) => r.iso },
  { key: 'arrivedAt', label: 'เวลามาถึง' },
  { key: 'hn', label: 'HN' },
  {
    key: 'unit', label: 'หน่วยบริการ', flex: true, minWidth: 180,
    render: (r) => serviceUnitLabel(r.unit), csv: (r) => serviceUnitLabel(r.unit),
  },
  {
    key: 'waitMinutes', label: 'รอคอย (นาที)', align: 'center',
    render: (r) => (r.waitMinutes == null ? '—' : `${r.waitMinutes}`),
    csv: (r) => (r.waitMinutes == null ? '' : r.waitMinutes),
  },
  {
    key: 'examMinutes', label: 'เวลาตรวจ (นาที)', align: 'center',
    render: (r) => (r.examMinutes == null ? '—' : `${r.examMinutes}`),
    csv: (r) => (r.examMinutes == null ? '' : r.examMinutes),
  },
  {
    key: 'stamp', label: 'ความครบถ้วนของเวลา',
    render: (r) => (r.waitMinutes == null
      ? <Badge style='warning' size='small'>ไม่มีเวลาสิ้นสุด</Badge>
      : <Badge style='success' size='small'>ครบถ้วน</Badge>),
    csv: (r) => (r.waitMinutes == null ? 'ไม่มีเวลาสิ้นสุด' : 'ครบถ้วน'),
  },
];

const MY_RETURNED_COLUMNS = [
  { key: 'iso', label: 'วันที่สั่ง', render: (r) => formatIsoDateThai(r.iso), csv: (r) => r.iso },
  { key: 'hn', label: 'HN' },
  { key: 'patientName', label: 'ชื่อ-สกุล', flex: true, minWidth: 200 },
  {
    key: 'unit', label: 'หน่วยบริการ', flex: true, minWidth: 180,
    render: (r) => serviceUnitLabel(r.unit), csv: (r) => serviceUnitLabel(r.unit),
  },
  { key: 'rxItems', label: 'จำนวนรายการ', align: 'center' },
  { key: 'returnReason', label: 'เหตุผลที่ตีกลับ', flex: true, minWidth: 260 },
];

const MY_ORDER_SET_COLUMNS = [
  { key: 'name', label: 'ชื่อชุดคำสั่ง', flex: true, minWidth: 260 },
  { key: 'classificationLabel', label: 'การจำแนก', flex: true, minWidth: 220 },
  { key: 'itemCount', label: 'จำนวนรายการ', align: 'center' },
  { key: 'useCount', label: 'จำนวนครั้งที่ใช้', align: 'center' },
  { key: 'lastUsedAt', label: 'ใช้ล่าสุด', flex: true, minWidth: 180 },
  {
    key: 'active', label: 'สถานะ',
    render: (r) => (
      <Badge style={r.active ? 'success' : 'neutral'} size='small'>
        {r.active ? 'ใช้งาน' : 'ปิดใช้งาน'}
      </Badge>
    ),
    csv: (r) => (r.active ? 'ใช้งาน' : 'ปิดใช้งาน'),
  },
];

const MyPracticeStatsPage = () => {
  const [dateFilter, setDateFilter] = useState(DEFAULT_DATE_FILTER);
  const [unit, setUnit] = useState(DEFAULT_UNIT);
  const [granularity, setGranularity] = useState(DEFAULT_GRANULARITY);
  const [viewBundle, setViewBundle] = useState(null);
  const [exportReport, setExportReport] = useState(null);
  const [exportScopeKeys, setExportScopeKeys] = useState(null);
  const [exported, setExported] = useState(false);

  const { from, to } = rangeBoundsIso(dateFilter);
  const rangeLabel = formatRangeLabel(from, to, dateFilter);

  const inScope = (r) => matchesIsoDateFilter(r.iso, dateFilter)
    && (unit === 'all' || r.unit === unit);

  /* เคสของฉัน — แหล่งเดียวของทุกการ์ดในหน้า */
  const rows = useMemo(
    () => MY_VISIT_RECORDS.filter(inScope),
    [dateFilter, unit],
  );

  const attended = useMemo(() => attendedOf(rows), [rows]);
  const noShowRows = useMemo(() => rows.filter((r) => r.visitType === 'noshow'), [rows]);
  const appointmentRows = useMemo(() => rows.filter((r) => r.visitType === 'appointment'), [rows]);
  const walkinRows = useMemo(() => rows.filter((r) => r.visitType === 'walkin'), [rows]);

  /* กราฟ "แนวโน้มรายเดือน" ยึด 12 เดือนล่าสุดเสมอ ไม่ขึ้นกับชิปช่วงเวลา — ค่าเริ่มต้น
     ของหน้าคือ "เดือนนี้" ซึ่งเหลือข้อมูลเดือนเดียว กราฟแนวโน้มจะไม่มีอะไรให้ดู
     ตัวกรองหน่วยบริการยังมีผลกับกราฟชุดนี้ตามปกติ */
  const trendRows = useMemo(
    () => attendedOf(MY_VISIT_RECORDS.filter((r) => unit === 'all' || r.unit === unit)),
    [unit],
  );
  const trendPeerRows = useMemo(
    () => PRACTICE_VISIT_RECORDS.filter((r) => unit === 'all' || r.unit === unit),
    [unit],
  );
  /* ช่วงเวลาของกราฟมาจากชิป รายเดือน/ไตรมาส/ปี/ปีงบ (ToR §1.20.6.1–6.2
     "ตามช่วงระยะเวลา") ป้ายแกนเป็นแบบสั้น เช่น 'ก.ย.68' เพื่อไม่ให้ทับกัน */
  const trendBuckets = useMemo(
    () => bucketRowsByGranularity(trendRows, granularity, TREND_LIMIT[granularity] || null),
    [trendRows, granularity],
  );
  const trendPeerBuckets = useMemo(
    () => bucketRowsByGranularity(trendPeerRows, granularity, TREND_LIMIT[granularity] || null),
    [trendPeerRows, granularity],
  );
  const trendLabels = useMemo(() => trendBuckets.map((b) => b.label), [trendBuckets]);
  const granularityLabel = TREND_GRANULARITY_OPTIONS.find((g) => g.key === granularity)?.label || '';
  const TREND_HINT = `${granularityLabel} · ข้อมูล 12 เดือนล่าสุด — ไม่ขึ้นกับชิปช่วงเวลาด้านบน`;

  /* ── §1.20.1.1 / 1.20.5.1–5.3 ภาระงาน ─────────────────────────────────── */
  const visitDonut = useMemo(() => donutFromCounts(
    countBy(rows, (r) => r.visitType),
    (key, i) => VISIT_TYPE_COLOR[key] || PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length],
    (key) => visitTypeLabel(key),
  ), [rows]);

  const trendSeries = useMemo(() => ([
    {
      label: 'ของฉัน',
      color: PHCIS_CHART.teal,
      values: trendBuckets.map((b) => b.rows.length),
    },
    {
      label: 'ค่าเฉลี่ยต่อแพทย์ 1 คน',
      color: PHCIS_CHART.indigo,
      /* จับคู่ตามช่วงเดียวกัน ไม่ใช่ตามลำดับ — ช่วงที่ฉันไม่มีเคสจะไม่มีอยู่ในลิสต์ของฉัน */
      values: trendBuckets.map(
        (b) => peerAveragePerDoctor(trendPeerBuckets.find((p) => p.key === b.key)?.rows || []),
      ),
    },
  ]), [trendBuckets, trendPeerBuckets]);

  const hourlyRows = useMemo(
    () => hourlyWorkload(attended)
      .filter((b) => b.value > 0)
      .map((b) => ({ label: b.label, value: b.value, color: PHCIS_CHART.teal })),
    [attended],
  );

  /* ── §1.20.5.4 / 5.5 โรคที่ฉันวินิจฉัย ─────────────────────────────────── */
  const diseaseRank = useMemo(() => rankDiseases(rows, 10), [rows]);
  const diseaseTotal = useMemo(() => diseaseRank.reduce((s, d) => s + d.value, 0), [diseaseRank]);
  const diseaseHbar = useMemo(
    () => diseaseRank.map((d) => ({
      label: `${d.code} ${d.label}`, value: d.value, color: PHCIS_CHART.teal,
    })),
    [diseaseRank],
  );
  const topFiveDiseases = useMemo(() => diseaseRank.slice(0, 5), [diseaseRank]);

  /* ── §1.20.5.6 เวลาตรวจและระยะเวลารอคอย ───────────────────────────────── */
  const avgExam = useMemo(() => averageOf(attended, (r) => r.examMinutes), [attended]);
  const avgWait = useMemo(() => averageOf(attended, (r) => r.waitMinutes), [attended]);
  const waitSamples = useMemo(() => attended.filter((r) => r.waitMinutes != null), [attended]);
  const missingWaitCount = attended.length - waitSamples.length;
  const maxWait = useMemo(
    () => waitSamples.reduce((m, r) => Math.max(m, r.waitMinutes), 0),
    [waitSamples],
  );

  const timeTrendSeries = useMemo(() => ([
    {
      label: 'เวลาตรวจเฉลี่ย (นาที)',
      color: PHCIS_CHART.teal,
      values: trendBuckets.map((b) => averageOf(b.rows, (r) => r.examMinutes)),
    },
    {
      label: 'รอคอยเฉลี่ย (นาที)',
      color: PHCIS_CHART.yellow,
      values: trendBuckets.map((b) => averageOf(b.rows, (r) => r.waitMinutes)),
    },
  ]), [trendBuckets]);

  const examByUnit = useMemo(() => {
    const keys = [...new Set(attended.map((r) => r.unit))];
    return keys
      .map((key) => ({
        label: serviceUnitLabel(key),
        value: averageOf(attended.filter((r) => r.unit === key), (r) => r.examMinutes),
        color: PHCIS_CHART.indigo,
      }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [attended]);

  /* ── §1.20.6.1 / 6.2 + §1.5.9.1 คุณภาพการสั่งการรักษา ──────────────────── */
  const rx = useMemo(() => prescriptionSummary(attended), [attended]);
  const orderSets = useMemo(() => myOrderSets(), []);

  const returnTrendSeries = useMemo(() => ([
    {
      label: 'ใบสั่งยาที่ถูกตีกลับ',
      color: PHCIS_CHART.pink,
      values: trendBuckets.map((b) => prescriptionSummary(b.rows).returned),
    },
  ]), [trendBuckets]);

  const orderSetHbar = useMemo(
    () => orderSets
      .filter((s) => s.useCount > 0)
      .map((s) => ({ label: s.name, value: s.useCount, color: PHCIS_CHART.teal })),
    [orderSets],
  );

  /* ── การ์ดสรุปด้านบน ──────────────────────────────────────────────────── */
  const summaryCards = useMemo(() => ([
    { key: 'seen',    label: 'ผู้รับบริการที่ฉันตรวจ', value: attended.length.toLocaleString('th-TH'), indicator: rangeLabel,        color: 'brand',       icon: 'stethoscope' },
    { key: 'exam',    label: 'เวลาตรวจเฉลี่ย (นาที)',  value: avgExam,                                 indicator: `จาก ${attended.length.toLocaleString('th-TH')} ครั้ง`, color: 'positive', icon: 'timer' },
    { key: 'wait',    label: 'รอคอยเฉลี่ย (นาที)',     value: avgWait,                                 indicator: 'TOR 1.20.5.6',    color: 'inprogress',  icon: 'hourglass_top' },
    { key: 'noshow',  label: 'ไม่มาตามนัดหมาย',        value: noShowRows.length.toLocaleString('th-TH'), indicator: `อัตรา ${safePct(noShowRows.length, appointmentRows.length + noShowRows.length)}%`, color: 'destructive', icon: 'event_busy' },
    { key: 'rx',      label: 'ใบสั่งยาที่ฉันสั่ง',       value: rx.prescriptions.toLocaleString('th-TH'), indicator: `เฉลี่ย ${rx.itemsPerRx} รายการ/ใบ`, color: 'info',   icon: 'prescriptions' },
    { key: 'disease', label: 'โรคที่ฉันวินิจฉัยมากสุด',  value: diseaseRank[0]?.code || '—',              indicator: diseaseRank[0]?.label || 'ไม่มีข้อมูล', color: 'brand', icon: 'coronavirus' },
  ]), [attended, avgExam, avgWait, noShowRows, appointmentRows, rx, diseaseRank, rangeLabel]);

  /* ── export catalog (ช่วงกว้าง — popup ตัดช่วงเองด้วย _iso) ─────────────── */

  const exportVisitRows = MY_VISIT_RECORDS;

  const exportMonthlyRows = useMemo(() => {
    const map = new Map();
    MY_VISIT_RECORDS.forEach((r) => {
      const monthKey = r.iso.slice(0, 7);
      const key = `${monthKey}|${r.unit}`;
      const e = map.get(key) || {
        id: key,
        iso: `${monthKey}-01`,
        monthLabel: formatIsoMonthThai(monthKey),
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

  const exportDiseaseRows = useMemo(() => {
    const ranked = rankDiseases(MY_VISIT_RECORDS, 99);
    const total = ranked.reduce((s, r) => s + r.value, 0);
    return ranked.map((r, i) => ({
      id: r.key, rank: i + 1, code: r.code, label: r.label, value: r.value, pct: safePct(r.value, total),
    }));
  }, []);

  const exportTimeRows = useMemo(
    () => MY_VISIT_RECORDS.filter((r) => r.visitType !== 'noshow'),
    [],
  );

  const exportReturnedRows = useMemo(
    () => prescriptionSummary(attendedOf(MY_VISIT_RECORDS)).returnedRows,
    [],
  );

  const reportsCatalog = useMemo(() => [
    buildExportReport('my-visit-detail', 'รายงานการตรวจรักษาของฉัน (รายครั้ง)', MY_VISIT_COLUMNS, exportVisitRows, (r) => r.iso),
    buildExportReport('my-visit-monthly', 'รายงานสรุปการตรวจรักษาของฉันรายเดือน', MY_VISIT_MONTHLY_COLUMNS, exportMonthlyRows, (r) => r.iso),
    buildExportReport('my-disease-rank', 'รายงานอันดับโรคที่ฉันวินิจฉัย', MY_DISEASE_COLUMNS, exportDiseaseRows),
    buildExportReport('my-time-detail', 'รายงานเวลาตรวจและระยะเวลารอคอยของฉัน', MY_TIME_COLUMNS, exportTimeRows, (r) => r.iso),
    buildExportReport('my-rx-returned', 'รายงานใบสั่งยาของฉันที่ถูกตีกลับ', MY_RETURNED_COLUMNS, exportReturnedRows, (r) => r.iso),
    buildExportReport('my-order-sets', 'รายงานชุดคำสั่งการรักษาส่วนตัวของฉัน', MY_ORDER_SET_COLUMNS, orderSets),
  ], [exportVisitRows, exportMonthlyRows, exportDiseaseRows, exportTimeRows, exportReturnedRows, orderSets]);

  const exportTopics = useMemo(
    () => reportsCatalog.map((r) => ({ value: r.key, label: r.title })),
    [reportsCatalog],
  );

  const openExport = (keyOrReport, scopeKeys = null) => {
    setExportScopeKeys(scopeKeys);
    if (keyOrReport === 'all' || keyOrReport?.key === 'all') {
      setExportReport({ key: 'all', title: keyOrReport?.title || 'สถิติการตรวจรักษาของฉันทั้งหมด' });
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
    || unit !== DEFAULT_UNIT
    || granularity !== DEFAULT_GRANULARITY;

  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => {
      setDateFilter(DEFAULT_DATE_FILTER);
      setUnit(DEFAULT_UNIT);
      setGranularity(DEFAULT_GRANULARITY);
    },
  );

  return (
    <QueuePageShell
      activeKey='dashboard'
      breadcrumb={breadcrumb}
      title='สถิติการตรวจรักษาของฉัน'
      afterTitle={(
        <DashboardHeaderFilters
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          defaultQuick='thismonth'
          templateValue={screenValue('mystats')}
        ></DashboardHeaderFilters>
      )}
      /* ปุ่มนำส่งออกอยู่หน้าปุ่ม "คำขอเข้าถึงข้อมูล" (มติผู้ใช้ 30 ส.ค. 69) —
         SubHeader วาง leadingActions ก่อน CreateConsentRequestHeaderAction เสมอ */
      leadingActions={(
        <DashboardExportButton label='นำส่งออกรายงานทั้งหมด' onClick={() => openExport('all')} />
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
        <section className='w-full flex items-stretch flex-wrap' style={{ ...CARD, gap: 'var(--dim-space-400)' }}>
          {summaryCards.map((card) => (
            <SummaryCard key={card.key} card={card} variant='panel' />
          ))}
        </section>

        <ReportToolbar>
          <div style={{ width: 'var(--dim-size-2200, 192px)' }}>
            <Dropdown
              size='md'
              value={unit}
              onChange={setUnit}
              options={MY_UNIT_OPTIONS}
              placeholder='หน่วยบริการ'
            />
          </div>
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
            {TREND_GRANULARITY_OPTIONS.map((g) => (
              <FilterTag
                key={g.key}
                value={g.label}
                selected={granularity === g.key}
                onClick={() => setGranularity(g.key)}
              />
            ))}
          </div>
          <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
        </ReportToolbar>

        <SmoothFilterResults opaque={resultsOpaque}>
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>

            {/* ── ภาระงานของฉัน · §1.20.1.1 / 1.20.5.1–5.3 ─────────────── */}
            <ReportGroupCard
              title='ภาระงานของฉัน'
              subtitle='จำนวนผู้รับบริการที่ฉันเป็นผู้ตรวจ แยกตามประเภทการมาและช่วงเวลาในวัน'
              onView={() => openViewGroup('workload', 'ภาระงานของฉัน')}
              onExport={() => openExportGroup('workload', 'รายงานภาระงานของฉัน')}
            >
              <StatTileRow>
                <StatTile label='ตรวจแล้ว' value={attended.length.toLocaleString('th-TH')} unit='ครั้ง' hint='TOR 1.20.1.1' />
                <StatTile label='มาตามนัดหมาย' value={appointmentRows.length.toLocaleString('th-TH')} unit='ครั้ง' hint='TOR 1.20.5.1' />
                <StatTile label='Walk-in' value={walkinRows.length.toLocaleString('th-TH')} unit='ครั้ง' tone='info' hint='TOR 1.20.5.3' />
                <StatTile
                  label='ไม่มาตามนัดหมาย'
                  value={noShowRows.length.toLocaleString('th-TH')}
                  unit='ครั้ง'
                  tone='warning'
                  hint={`อัตรา ${safePct(noShowRows.length, appointmentRows.length + noShowRows.length)}% · TOR 1.20.5.2`}
                />
              </StatTileRow>
              {/* แถวนี้มีสองใบ ไม่ใช่สาม — กราฟเส้น 12 เดือนต้องการความกว้างครึ่งแถว
                  ขึ้นไป ป้ายเดือนจึงไม่ทับกัน */}
              <ChartsRow>
                <ChartPanel
                  title='แนวโน้มรายเดือน เทียบค่าเฉลี่ยต่อแพทย์'
                  hint={`${TREND_HINT} · เส้นเทียบเป็นค่าเฉลี่ยต่อแพทย์ 1 คน ไม่ระบุชื่อผู้ใด`}
                >
                  {trendBuckets.length > 1 ? (
                    <div className='w-full' style={{ paddingTop: 'var(--dim-space-200)' }}>
                      <LineChart months={trendLabels} series={trendSeries} height={200} />
                    </div>
                  ) : (
                    <EmptyChartNote
                      text='ช่วงที่เลือกมีข้อมูลช่วงเดียว'
                      hint='เลือก "รายเดือน" หรือ "รายไตรมาส" เพื่อดูแนวโน้ม'
                      icon='show_chart'
                    />
                  )}
                </ChartPanel>
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
              </ChartsRow>
              <ChartsRow>
                <ChartPanel title='ภาระงานตามช่วงเวลาในวัน' alignContent='start'>
                  {hourlyRows.length ? (
                    <div className='w-full'><HBarList valueLabel='ครั้ง' rows={hourlyRows} /></div>
                  ) : <EmptyChartNote />}
                </ChartPanel>
              </ChartsRow>
            </ReportGroupCard>

            {/* ── โรคที่ฉันวินิจฉัย · §1.20.5.4 / 5.5 ───────────────────── */}
            <ReportGroupCard
              title='โรคที่ฉันวินิจฉัย'
              subtitle='อันดับกลุ่มโรคตาม ICD-10 ของเคสที่ฉันเป็นผู้ตรวจ'
              onView={() => openViewGroup('disease', 'โรคที่ฉันวินิจฉัย')}
              onExport={() => openExportGroup('disease', 'รายงานอันดับโรคที่ฉันวินิจฉัย')}
            >
              <ChartsRow>
                <ChartPanel title='อันดับโรคที่ฉันวินิจฉัย (Top 10 · ICD-10)' alignContent='start'>
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
                      centerSub='ของเคสที่ฉันตรวจ'
                    />
                  ) : <EmptyChartNote />}
                </ChartPanel>
              </ChartsRow>
            </ReportGroupCard>

            {/* ── เวลาตรวจและระยะเวลารอคอย · §1.20.5.6 ──────────────────── */}
            <ReportGroupCard
              title='เวลาตรวจและระยะเวลารอคอย'
              subtitle='ใช้ดูจังหวะการออกตรวจของตัวเอง — ค่าเฉลี่ยตัดเคสที่ไม่มีเวลาสิ้นสุดออกแล้ว'
              onView={() => openViewGroup('time', 'เวลาตรวจและระยะเวลารอคอย')}
              onExport={() => openExportGroup('time', 'รายงานเวลาตรวจและระยะเวลารอคอยของฉัน')}
            >
              <StatTileRow>
                <StatTile label='เวลาตรวจเฉลี่ยต่อราย' value={avgExam} unit='นาที' />
                <StatTile label='รอคอยเฉลี่ยของคิวฉัน' value={avgWait} unit='นาที' tone={avgWait > 45 ? 'warning' : undefined} hint='TOR 1.20.5.6' />
                <StatTile label='รอคอยสูงสุด' value={maxWait} unit='นาที' tone={maxWait > 90 ? 'warning' : undefined} />
                <StatTile
                  label='ไม่มีเวลาสิ้นสุด (ตัดออกจากค่าเฉลี่ย)'
                  value={missingWaitCount.toLocaleString('th-TH')}
                  unit='ครั้ง'
                  tone={missingWaitCount > 0 ? 'warning' : undefined}
                />
              </StatTileRow>
              <ChartsRow>
                <ChartPanel
                  title='แนวโน้มเวลาตรวจและเวลารอคอยรายเดือน'
                  hint={`${TREND_HINT}${missingWaitCount > 0 ? ` · ไม่รวมครั้งที่ไม่มีเวลาสิ้นสุด` : ''}`}
                >
                  {trendBuckets.length ? (
                    <div className='w-full' style={{ paddingTop: 'var(--dim-space-200)' }}>
                      <VBars
                        months={trendLabels}
                        series={timeTrendSeries}
                        height={200}
                        barMaxWidth={trendBuckets.length <= 6 ? 24 : 12}
                      />
                    </div>
                  ) : <EmptyChartNote />}
                </ChartPanel>
                <ChartPanel title='เวลาตรวจเฉลี่ยตามหน่วยบริการ' alignContent='start'>
                  {examByUnit.length ? (
                    <div className='w-full'><HBarList valueLabel='นาที' rows={examByUnit} /></div>
                  ) : <EmptyChartNote />}
                </ChartPanel>
              </ChartsRow>
            </ReportGroupCard>

            {/* ── คุณภาพการสั่งการรักษา · §1.20.6.1 / 6.2 + §1.5.9.1 ────── */}
            <ReportGroupCard
              title='คุณภาพการสั่งการรักษา'
              subtitle='ใบสั่งยาที่ฉันสั่ง การตีกลับใบยาจากห้องยา และชุดคำสั่งการรักษาส่วนตัว'
              onView={() => openViewGroup('quality', 'คุณภาพการสั่งการรักษา')}
              onExport={() => openExportGroup('quality', 'รายงานคุณภาพการสั่งการรักษาของฉัน')}
            >
              <StatTileRow>
                <StatTile label='ใบสั่งยา' value={rx.prescriptions.toLocaleString('th-TH')} unit='ใบ' hint='TOR 1.20.6.1' />
                <StatTile label='รายการยาเฉลี่ยต่อใบ' value={rx.itemsPerRx} unit='รายการ' hint={`รวม ${rx.items.toLocaleString('th-TH')} รายการ`} />
                <StatTile
                  label='ใบที่ถูกตีกลับ'
                  value={rx.returned.toLocaleString('th-TH')}
                  unit='ใบ'
                  tone={rx.returned > 0 ? 'warning' : undefined}
                  hint='TOR 1.20.6.2'
                />
                <StatTile
                  label='อัตราตีกลับต่อ 100 ใบ'
                  value={rx.returnedPer100}
                  unit='ใบ'
                  tone={rx.returnedPer100 > 5 ? 'warning' : undefined}
                  hint='เทียบข้ามเดือนได้แม้ปริมาณงานต่างกัน'
                />
              </StatTileRow>
              <ChartsRow>
                <ChartPanel title='แนวโน้มการตีกลับใบยารายเดือน' hint={TREND_HINT}>
                  {trendBuckets.length ? (
                    <div className='w-full' style={{ paddingTop: 'var(--dim-space-200)' }}>
                      <VBars
                        months={trendLabels}
                        series={returnTrendSeries}
                        height={200}
                        barMaxWidth={trendBuckets.length <= 6 ? 32 : 14}
                      />
                    </div>
                  ) : <EmptyChartNote />}
                </ChartPanel>
                <ChartPanel
                  title='ชุดคำสั่งการรักษาส่วนตัวที่ฉันใช้บ่อย'
                  hint='TOR 1.5.9.1 · จัดการได้ที่ ตั้งค่ารายการสั่งการรักษาและ CDSS'
                  alignContent='start'
                >
                  {orderSetHbar.length ? (
                    <div className='w-full'><HBarList valueLabel='ครั้ง' rows={orderSetHbar} /></div>
                  ) : (
                    <EmptyChartNote
                      text='ยังไม่มีชุดคำสั่งการรักษาส่วนตัว'
                      hint='สร้างได้ที่ /treat/order-sets'
                      icon='list_alt'
                    />
                  )}
                </ChartPanel>
              </ChartsRow>
            </ReportGroupCard>

          </div>
        </SmoothFilterResults>

      </div>

      <ReportViewPopup
        open={!!viewBundle}
        bundle={viewBundle}
        onClose={() => setViewBundle(null)}
        onExportReport={(report) => { if (report) openExport(report); }}
        footnote={viewBundle?.key === 'time' && missingWaitCount > 0
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
        topicsFieldName='my-practice-stats-export-topics'
      />

      <SuccessToast
        open={exported}
        message='นำส่งออกรายงานสถิติการตรวจรักษาของฉันแล้ว'
        onClose={() => setExported(false)}
      />
    </QueuePageShell>
  );
};

export default MyPracticeStatsPage;
