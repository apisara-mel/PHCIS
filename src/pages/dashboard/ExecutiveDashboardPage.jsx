import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Popup from '@/components/popup/Popup';
import Table from '@/components/table/Table';
import Badge from '@/components/badge/Badge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Icon from '@/components/icons/Icon';
import Dropdown from '@/components/forms/Dropdown';
import FilterDateTag from '@/components/forms/FilterDateTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandButton from '@/components/button/BrandButton';
import SuccessToast from '@/components/toast/SuccessToast';
import { screenValue } from '@/components/dashboard/DashboardTemplateSwitcher';
import { DashboardHeaderActions, DashboardHeaderFilters } from '@/components/dashboard/DashboardPageHeader';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import AreaHealthMapPanel from '@/components/dashboard/AreaHealthMapPanel';
import { AreaLineChart, DonutWithLegend, HBarList, PyramidPct, VBars } from '@/components/graph/Charts';
import PHCIS_CHART, { PHCIS_CHART_PALETTE } from '@/data/phcisChartPalette';
import { ExportFormatPopup } from '@/pages/consent/consentExportPopup';
import { PHCIS_CURRENT_USER } from '@/data/phcisCurrentUser';
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
  formatRangeLabel,
  hbarRows,
  matchesIsoDateFilter,
  rangeBoundsIso,
} from '@/pages/dashboard/dashboardReportKit';
import { formatIsoDateThai, safePct, toIsoDate } from '@/data/dashboardCommon';
import {
  ANOMALY_EVENTS,
  ANOMALY_LAST_EVALUATED,
  ANOMALY_RULES,
  ANOMALY_SEVERITY,
  AREA_OPTIONS,
  DRUG_FORECASTS,
  EXECUTIVE_ROLES,
  FORECAST_SEVERITY_LABEL,
  POPULATION_PYRAMID,
  REGISTRATION_TREND,
  REVENUE_CHANNEL_SPLIT,
  REVENUE_TREND,
  acknowledgeAnomaly,
  areaRows,
  centerOptionsForArea,
  districtSummaries,
  listAnomalyAcks,
  revokeAnomalyAck,
  subDistrictOptions,
  defaultAreaForScope,
  scopeNoticeForUser,
  scopedAreaOptions,
} from '@/data/dashboardExecutive';

/* TOR §1.20.10 — Dashboard ผู้บริหาร (Area Health Analytics)
   10.1 ภาพรวมสุขภาพรายพื้นที่ + แผนที่ · 10.2 แนวโน้มผู้ป่วยใหม่ + โครงสร้างประชากร
   10.3 แนวโน้มความต้องการยาล่วงหน้า · 10.4 แนวโน้มรายรับ · 10.5 แจ้งเตือนความผิดปกติ
   + แถบแหล่งข้อมูล Read Replica (§1.20.9)

   หน้านี้จำกัดสิทธิ์: ผู้ที่ไม่ใช่ผู้บริหารจะเห็นสถานะ “ไม่มีสิทธิ์เข้าถึง” และ
   ระบบไม่ประมวลผลข้อมูลใด ๆ ให้ */

const breadcrumb = ['แดชบอร์ด', 'Dashboard ผู้บริหาร'];

const DEFAULT_DATE_FILTER = { quick: 'thisyear' };
const DEFAULT_AREA = 'all';
const DEFAULT_SUB = 'all';
const DEFAULT_CENTER = 'all';

const EXPORT_GROUP_KEYS = {
  area: ['area-health', 'area-district'],
  population: ['registration-trend'],
  drug: ['drug-forecast'],
  finance: ['revenue-trend'],
  anomaly: ['anomaly-events'],
};

const AREA_COLUMNS = [
  { key: 'district', label: 'เขต', flex: true, minWidth: 160 },
  { key: 'subDistrict', label: 'แขวง', flex: true, minWidth: 180 },
  { key: 'center', label: 'สถานบริการ', flex: true, minWidth: 220 },
  { key: 'population', label: 'ประชากร (คน)', align: 'center', render: (r) => r.population.toLocaleString('th-TH'), csv: (r) => r.population },
  { key: 'dm', label: 'เบาหวาน (ราย)', align: 'center', render: (r) => r.dm.toLocaleString('th-TH'), csv: (r) => r.dm },
  { key: 'ht', label: 'ความดันโลหิตสูง (ราย)', align: 'center', render: (r) => r.ht.toLocaleString('th-TH'), csv: (r) => r.ht },
  { key: 'elderly', label: 'ผู้สูงอายุ (คน)', align: 'center', render: (r) => r.elderly.toLocaleString('th-TH'), csv: (r) => r.elderly },
  {
    key: 'prevalence', label: 'ความชุก NCD (%)', align: 'right',
    render: (r) => (
      <Badge style={r.prevalence >= 6.5 ? 'error' : r.prevalence >= 5.5 ? 'warning' : 'success'} size='small'>
        {r.prevalence}%
      </Badge>
    ),
    csv: (r) => r.prevalence,
  },
];

const DISTRICT_COLUMNS = [
  { key: 'district', label: 'เขต', flex: true, minWidth: 180 },
  { key: 'center', label: 'สถานบริการหลัก', flex: true, minWidth: 220 },
  { key: 'population', label: 'ประชากร (คน)', align: 'center', render: (r) => r.population.toLocaleString('th-TH'), csv: (r) => r.population },
  { key: 'ncdTotal', label: 'ผู้ป่วย NCD (ราย)', align: 'center', render: (r) => r.ncdTotal.toLocaleString('th-TH'), csv: (r) => r.ncdTotal },
  { key: 'prevalence', label: 'ความชุก (%)', align: 'right', render: (r) => `${r.prevalence}%`, csv: (r) => r.prevalence },
];

const REGISTRATION_COLUMNS = [
  { key: 'month', label: 'เดือน', flex: true, minWidth: 160 },
  { key: 'newPatients', label: 'ผู้ป่วยใหม่ (ราย)', align: 'center', render: (r) => r.newPatients.toLocaleString('th-TH'), csv: (r) => r.newPatients },
  { key: 'returningPatients', label: 'ผู้ป่วยเดิม (ราย)', align: 'center', render: (r) => r.returningPatients.toLocaleString('th-TH'), csv: (r) => r.returningPatients },
  { key: 'share', label: 'สัดส่วนผู้ป่วยใหม่ (%)', align: 'right', render: (r) => `${r.share}%`, csv: (r) => r.share },
];

const FORECAST_COLUMNS = [
  { key: 'name', label: 'รายการยา', flex: true, minWidth: 220 },
  { key: 'stock', label: 'คงคลัง', align: 'center', render: (r) => `${r.stock.toLocaleString('th-TH')} ${r.unit}`, csv: (r) => `${r.stock} ${r.unit}` },
  { key: 'dailyUse', label: 'ใช้เฉลี่ย/วัน', align: 'center', render: (r) => `${r.dailyUse.toLocaleString('th-TH')} ${r.unit}`, csv: (r) => `${r.dailyUse} ${r.unit}` },
  { key: 'daysToStockout', label: 'คาดว่าจะหมดใน (วัน)', align: 'center' },
  { key: 'nextMonth', label: 'พยากรณ์เดือนหน้า', align: 'center', render: (r) => r.nextMonth.toLocaleString('th-TH'), csv: (r) => r.nextMonth },
  {
    key: 'severity', label: 'ข้อเสนอแนะ',
    render: (r) => (
      <Badge style={r.severity === 'critical' ? 'error' : r.severity === 'watch' ? 'warning' : 'success'} size='small'>
        {FORECAST_SEVERITY_LABEL[r.severity]}
      </Badge>
    ),
    csv: (r) => FORECAST_SEVERITY_LABEL[r.severity],
  },
];

const REVENUE_COLUMNS = [
  { key: 'month', label: 'เดือน', flex: true, minWidth: 160 },
  { key: 'revenue', label: 'รายรับ (บาท)', align: 'right', render: (r) => r.revenue.toLocaleString('th-TH'), csv: (r) => r.revenue },
  { key: 'diff', label: 'เทียบเดือนก่อน (%)', align: 'right', render: (r) => (r.diff == null ? '—' : `${r.diff > 0 ? '+' : ''}${r.diff}%`), csv: (r) => (r.diff == null ? '' : r.diff) },
];

const ANOMALY_COLUMNS = [
  { key: 'detectedIso', label: 'วันที่ตรวจพบ', render: (r) => formatIsoDateThai(r.detectedIso), csv: (r) => r.detectedIso },
  {
    key: 'severity', label: 'ความรุนแรง',
    render: (r) => (
      <Badge style={r.severity === 'critical' ? 'error' : r.severity === 'high' ? 'warning' : r.severity === 'medium' ? 'yellow' : 'info'} size='small'>
        {ANOMALY_SEVERITY[r.severity].label}
      </Badge>
    ),
    csv: (r) => ANOMALY_SEVERITY[r.severity].label,
  },
  { key: 'metric', label: 'ด้าน', flex: true, minWidth: 160 },
  { key: 'area', label: 'พื้นที่/หน่วยงาน', flex: true, minWidth: 200 },
  { key: 'title', label: 'สิ่งที่ตรวจพบ', flex: true, minWidth: 300 },
  { key: 'delta', label: 'ค่าที่เปลี่ยนแปลง', align: 'center' },
  { key: 'detail', label: 'รายละเอียด', flex: true, minWidth: 320 },
];

/* ── access-denied state ─────────────────────────────────────────────────── */

const AccessDenied = ({ role }) => (
  <div
    className='w-full flex flex-col items-center text-center'
    style={{
      ...CARD,
      gap: 'var(--dim-space-300)',
      paddingTop: 'var(--dim-space-800, 32px)',
      paddingBottom: 'var(--dim-space-800, 32px)',
    }}
  >
    <span style={{ color: 'var(--text-warning-default, #C2410C)' }}>
      <Icon name='lock_person' size={40} />
    </span>
    <span
      style={{
        color: 'var(--text-content-default)',
        fontFamily: 'var(--type-family-heading-graphic2)',
        fontSize: 'var(--type-size-lg, 18px)',
      }}
    >
      ไม่มีสิทธิ์เข้าถึง Dashboard ผู้บริหาร
    </span>
    <span
      style={{
        color: 'var(--text-content-secondary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        lineHeight: 1.6,
        maxWidth: 'var(--dim-size-2600, 384px)',
      }}
    >
      หน้านี้เปิดให้เฉพาะสิทธิ์ {EXECUTIVE_ROLES.join(' · ')} เท่านั้น
      สิทธิ์ปัจจุบันของคุณคือ “{role}” ระบบจึงไม่ประมวลผลและไม่แสดงข้อมูลใด ๆ
      หากต้องการเข้าถึง กรุณาขอสิทธิ์ผ่านผู้ดูแลระบบของสำนักอนามัย
    </span>
    <div className='flex items-center flex-wrap justify-center' style={{ gap: 'var(--dim-space-200)' }}>
      <Link to='/dashboard/reports'>
        <NeutralSubdueButton size='md' leadingIcon='lab_profile'>ไปที่ศูนย์รวมรายงาน</NeutralSubdueButton>
      </Link>
      <Link to='/dashboard'>
        <NeutralSubdueButton size='md' leadingIcon='dashboard'>ไปที่แดชบอร์ดภาพรวม</NeutralSubdueButton>
      </Link>
    </div>
  </div>
);

/* ── page ────────────────────────────────────────────────────────────────── */

const ExecutiveDashboardPage = () => {
  /* Mock role switch — โปรโตไทป์ยังไม่มีระบบสิทธิ์จริง จึงให้สลับดูได้ทั้งสองสถานะ
     แต่ค่าเริ่มต้นยึดตามสิทธิ์ของผู้ใช้ที่ล็อกอินอยู่ */
  const [asExecutive, setAsExecutive] = useState(true);
  const currentRole = asExecutive ? EXECUTIVE_ROLES[0] : PHCIS_CURRENT_USER.groupPolicy;
  const allowed = EXECUTIVE_ROLES.includes(currentRole);

  /* มติ คทง.11 ครั้งที่ 2 — ขอบเขตข้อมูลต้องมาจากแม่แบบสิทธิ์ของผู้ใช้
     ไม่ใช่เปิดทั้งสำนักอนามัยให้ทุกคน: ตัวเลือกเขต/สถานบริการถูกจำกัดตาม
     dataScope และค่าเริ่มต้นล็อกไว้ที่เขตของตนเองเมื่อ scope แคบ
     (ผู้บริหารที่สลับโหมดดูภาพรวมได้ scope='all' จึงเห็นครบเหมือนเดิม) */
  const scopeUser = useMemo(
    () => (asExecutive ? { ...PHCIS_CURRENT_USER, dataScope: 'all' } : PHCIS_CURRENT_USER),
    [asExecutive],
  );
  const areaOptions = useMemo(() => scopedAreaOptions(scopeUser), [scopeUser]);
  const scopeNotice = useMemo(() => scopeNoticeForUser(scopeUser), [scopeUser]);
  const scopedDefaultArea = useMemo(() => defaultAreaForScope(scopeUser), [scopeUser]);

  const [dateFilter, setDateFilter] = useState(DEFAULT_DATE_FILTER);
  const [area, setArea] = useState(DEFAULT_AREA);
  const [subDistrict, setSubDistrict] = useState(DEFAULT_SUB);
  const [center, setCenter] = useState(DEFAULT_CENTER);

  /* ถ้าเขตที่เลือกอยู่นอกขอบเขตของผู้ใช้ (เช่น สลับโหมดกลับมาเป็นเจ้าหน้าที่)
     ให้ดีดกลับมาที่ค่าเริ่มต้นของ scope ทันที ไม่ปล่อยให้ค้างดูข้อมูลนอกสิทธิ์ */
  useEffect(() => {
    if (!areaOptions.some((o) => o.value === area)) {
      setArea(scopedDefaultArea);
      setSubDistrict(DEFAULT_SUB);
      setCenter(DEFAULT_CENTER);
    }
  }, [areaOptions, area, scopedDefaultArea]);

  /* §1.20.10.5 — อ่านจาก log ระดับโมดูล เพื่อให้การรับทราบไม่หายเมื่อออกจากหน้า
     แล้วกลับเข้ามาใหม่ (state ของ component หายตอน unmount) */
  const [acknowledged, setAcknowledged] = useState(() => listAnomalyAcks());
  const [ackTarget, setAckTarget] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [viewBundle, setViewBundle] = useState(null);
  const [exportReport, setExportReport] = useState(null);
  const [exportScopeKeys, setExportScopeKeys] = useState(null);
  const [exported, setExported] = useState(false);
  const [toast, setToast] = useState('');

  const { from, to } = rangeBoundsIso(dateFilter);
  const rangeLabel = formatRangeLabel(from, to, dateFilter);

  const rows = useMemo(
    () => areaRows({ area, subDistrict, center }),
    [area, subDistrict, center],
  );
  const districts = useMemo(
    () => districtSummaries({ area, subDistrict, center }),
    [area, subDistrict, center],
  );

  const totalPopulation = rows.reduce((s, r) => s + r.population, 0);
  const totalDm = rows.reduce((s, r) => s + r.dm, 0);
  const totalHt = rows.reduce((s, r) => s + r.ht, 0);
  const totalElderly = rows.reduce((s, r) => s + r.elderly, 0);

  const ncdHbar = useMemo(() => districts.map((d) => ({
    label: d.district,
    value: d.ncdTotal,
    segments: [
      { value: d.dm, color: PHCIS_CHART.teal, label: 'เบาหวาน' },
      { value: d.ht, color: PHCIS_CHART.indigo, label: 'ความดันโลหิตสูง' },
    ],
  })), [districts]);

  const centerCompare = useMemo(
    () => hbarRows(
      districts.map((d) => ({ label: d.center, value: d.prevalence })),
      PHCIS_CHART.pink,
      '%',
    ),
    [districts],
  );

  /* ── ตัวกรองช่วงเวลา (§1.20.10) ────────────────────────────────────────
     ชุดข้อมูลแนวโน้มเป็นราย “เดือน” (12 เดือนล่าสุด) จึงตัดตามเดือนที่อยู่ใน
     ช่วงที่เลือก — เดือนถือว่าอยู่ในช่วงเมื่อ YYYY-MM ของเดือนนั้นอยู่ระหว่าง
     เดือนของวันเริ่มต้นและวันสิ้นสุด */
  const monthIndexesInRange = useMemo(() => {
    const fromMonth = String(from).slice(0, 7);
    const toMonth = String(to).slice(0, 7);
    return (monthsIso = []) => monthsIso.reduce((acc, iso, i) => {
      const m = String(iso).slice(0, 7);
      if (m >= fromMonth && m <= toMonth) acc.push(i);
      return acc;
    }, []);
  }, [from, to]);

  const registrationTrend = useMemo(() => {
    const idx = monthIndexesInRange(REGISTRATION_TREND.monthsIso);
    return {
      months: idx.map((i) => REGISTRATION_TREND.months[i]),
      newPatients: idx.map((i) => REGISTRATION_TREND.newPatients[i]),
      returningPatients: idx.map((i) => REGISTRATION_TREND.returningPatients[i]),
      indexes: idx,
    };
  }, [monthIndexesInRange]);

  const revenueTrend = useMemo(() => {
    const idx = monthIndexesInRange(REVENUE_TREND.monthsIso);
    return {
      months: idx.map((i) => REVENUE_TREND.months[i]),
      values: idx.map((i) => REVENUE_TREND.values[i]),
      indexes: idx,
    };
  }, [monthIndexesInRange]);

  /* 10.2 */
  const registrationSeries = useMemo(() => ([
    { label: 'ผู้ป่วยใหม่', color: PHCIS_CHART.teal, values: registrationTrend.newPatients },
    { label: 'ผู้ป่วยเดิม', color: PHCIS_CHART.indigo, values: registrationTrend.returningPatients },
  ]), [registrationTrend]);

  const newPatientTotal = registrationTrend.newPatients.reduce((s, v) => s + v, 0);

  /* 10.3 */
  const [forecastDrug, setForecastDrug] = useState(DRUG_FORECASTS[0]?.id || '');
  const activeForecast = DRUG_FORECASTS.find((d) => d.id === forecastDrug) || DRUG_FORECASTS[0];

  /* แท่งค่าจริงและแท่งพยากรณ์แยกซีรีส์ — เดือนที่ไม่ใช่ของซีรีส์นั้นเป็น 0
     (VBars ไม่วาดแท่งความสูง 0) จึงไม่มีเส้นลากผ่านช่วงที่ยังไม่มีข้อมูล */
  const forecastSeries = useMemo(() => {
    if (!activeForecast) return [];
    const actualLen = activeForecast.actual.length;
    const forecastLen = activeForecast.forecast.length;
    return [
      {
        label: 'การใช้จริง',
        color: PHCIS_CHART.teal,
        values: [...activeForecast.actual, ...new Array(forecastLen).fill(0)],
      },
      {
        label: 'พยากรณ์ล่วงหน้า',
        color: PHCIS_CHART.pink,
        values: [...new Array(actualLen).fill(0), ...activeForecast.forecast],
      },
    ];
  }, [activeForecast]);

  const forecastMonthLabels = activeForecast
    ? [...activeForecast.months, ...activeForecast.forecastMonths]
    : [];

  const reorderHbar = useMemo(() => hbarRows(
    [...DRUG_FORECASTS]
      .sort((a, b) => a.daysToStockout - b.daysToStockout)
      .slice(0, 6)
      .map((d) => ({ label: `${d.name} · เหลือ ${d.daysToStockout} วัน`, value: d.daysToStockout })),
    PHCIS_CHART.yellow,
    'วัน',
  ), []);

  const criticalDrugs = DRUG_FORECASTS.filter((d) => d.severity === 'critical');

  /* 10.4 */
  const revenueSeries = useMemo(() => ([
    { label: 'รายรับจากการให้บริการ (บาท)', color: PHCIS_CHART.teal, values: revenueTrend.values },
  ]), [revenueTrend]);
  const revenueTotal = revenueTrend.values.reduce((s, v) => s + v, 0);
  const revenueAvg = revenueTrend.values.length
    ? Math.round(revenueTotal / revenueTrend.values.length)
    : 0;
  const revenueLatest = revenueTrend.values.length
    ? revenueTrend.values[revenueTrend.values.length - 1]
    : 0;
  const revenueDonut = REVENUE_CHANNEL_SPLIT.map((c, i) => ({
    label: c.label,
    value: c.value,
    color: PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length],
  }));

  /* 10.5 — แจ้งเตือนที่ตรวจพบในช่วงเวลาที่เลือกเท่านั้น */
  const alertsInRange = useMemo(
    () => ANOMALY_EVENTS.filter((a) => matchesIsoDateFilter(a.detectedIso, dateFilter)),
    [dateFilter],
  );
  const openAlerts = alertsInRange.filter((a) => !acknowledged[a.id]);
  const ackedAlerts = alertsInRange.filter((a) => acknowledged[a.id]);

  const acknowledgeAlert = (alert, note) => {
    const now = new Date();
    const stamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setAcknowledged(acknowledgeAnomaly(alert.id, {
      by: PHCIS_CURRENT_USER.displayName,
      at: `${formatIsoDateThai(toIsoDate(now))} ${stamp}`,
      note: note || '',
    }));
    setAckTarget(null);
    setToast(`รับทราบการแจ้งเตือน “${alert.title}” แล้ว`);
  };

  /* ยกเลิกการรับทราบ — รายการกลับไปอยู่ในคิวที่ต้องตรวจสอบ */
  const undoAcknowledge = (alert) => {
    setAcknowledged(revokeAnomalyAck(alert.id));
    setToast(`ยกเลิกการรับทราบ “${alert.title}” แล้ว`);
  };

  /* ── export catalog ───────────────────────────────────────────────────── */
  const exportRegistrationRows = useMemo(
    () => registrationTrend.months.map((m, i) => {
      const nw = registrationTrend.newPatients[i];
      const rt = registrationTrend.returningPatients[i];
      return { id: `${m}-${i}`, month: m, newPatients: nw, returningPatients: rt, share: safePct(nw, nw + rt) };
    }),
    [registrationTrend],
  );

  const exportForecastRows = useMemo(
    () => DRUG_FORECASTS.map((d) => ({
      ...d,
      nextMonth: d.forecast[0] || 0,
    })),
    [],
  );

  const exportRevenueRows = useMemo(
    () => revenueTrend.months.map((m, i) => {
      const value = revenueTrend.values[i];
      const prev = i > 0 ? revenueTrend.values[i - 1] : null;
      return {
        id: `${m}-${i}`,
        month: m,
        revenue: value,
        diff: prev ? Math.round(((value - prev) / prev) * 1000) / 10 : null,
      };
    }),
    [revenueTrend],
  );

  const reportsCatalog = useMemo(() => [
    buildExportReport('area-health', 'รายงานภาพรวมสุขภาพรายแขวง', AREA_COLUMNS, areaRows()),
    buildExportReport('area-district', 'รายงานภาพรวมสุขภาพรายเขต', DISTRICT_COLUMNS, districtSummaries().map((d) => ({ ...d, id: d.key }))),
    buildExportReport('registration-trend', 'รายงานแนวโน้มการลงทะเบียนผู้ป่วยใหม่', REGISTRATION_COLUMNS, exportRegistrationRows),
    buildExportReport('drug-forecast', 'รายงานแนวโน้มความต้องการยาล่วงหน้า', FORECAST_COLUMNS, exportForecastRows),
    buildExportReport('revenue-trend', 'รายงานแนวโน้มรายรับจากการให้บริการ', REVENUE_COLUMNS, exportRevenueRows),
    buildExportReport('anomaly-events', 'รายงานการแจ้งเตือนความผิดปกติ', ANOMALY_COLUMNS, alertsInRange, (r) => r.detectedIso),
  ], [exportRegistrationRows, exportForecastRows, exportRevenueRows, alertsInRange]);

  const exportTopics = useMemo(
    () => reportsCatalog.map((r) => ({ value: r.key, label: r.title })),
    [reportsCatalog],
  );

  const openExport = (keyOrReport, scopeKeys = null) => {
    setExportScopeKeys(scopeKeys);
    if (keyOrReport === 'all' || keyOrReport?.key === 'all') {
      setExportReport({ key: 'all', title: keyOrReport?.title || 'ข้อมูลผู้บริหารทั้งหมด' });
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
    || area !== DEFAULT_AREA || subDistrict !== DEFAULT_SUB || center !== DEFAULT_CENTER;

  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => {
      setDateFilter(DEFAULT_DATE_FILTER);
      setArea(DEFAULT_AREA);
      setSubDistrict(DEFAULT_SUB);
      setCenter(DEFAULT_CENTER);
    },
  );

  const areaLabel = area === 'all' ? 'ทุกเขต' : AREA_OPTIONS.find((o) => o.value === area)?.label || area;
  const subLabel = subDistrict === 'all'
    ? 'ทุกแขวง'
    : subDistrictOptions(area).find((o) => o.value === subDistrict)?.label || subDistrict;
  const scopeLabel = `${areaLabel} · ${subLabel} · ${center === 'all' ? 'ทุกสถานบริการ' : center} · ${rangeLabel}`;

  const summaryCards = useMemo(() => {
    if (!allowed) return undefined;
    return [
      { key: 'pop',     label: 'ประชากรในพื้นที่ (คน)', value: totalPopulation.toLocaleString('th-TH'), indicator: areaLabel, color: 'brand', icon: 'groups' },
      { key: 'ncd',     label: 'ผู้ป่วย NCD (ราย)',      value: (totalDm + totalHt).toLocaleString('th-TH'), indicator: `ความชุก ${safePct(totalDm + totalHt, totalPopulation)}%`, color: 'destructive', icon: 'monitor_heart' },
      { key: 'elderly', label: 'ผู้สูงอายุ (คน)',        value: totalElderly.toLocaleString('th-TH'), indicator: `${safePct(totalElderly, totalPopulation)}% ของประชากร`, color: 'inprogress', icon: 'elderly' },
      { key: 'newpat',  label: `ผู้ป่วยใหม่ (${registrationTrend.months.length} เดือน)`, value: newPatientTotal.toLocaleString('th-TH'), indicator: rangeLabel, color: 'info', icon: 'person_add' },
      { key: 'revenue', label: 'รายรับเฉลี่ย/เดือน (บาท)', value: revenueAvg.toLocaleString('th-TH'), indicator: rangeLabel, color: 'positive', icon: 'payments' },
      { key: 'alerts',  label: 'แจ้งเตือนที่ยังไม่รับทราบ', value: openAlerts.length, indicator: openAlerts.length ? 'ต้องตรวจสอบ' : 'ไม่มีรายการค้าง', color: openAlerts.length ? 'destructive' : 'positive', icon: 'notifications_active' },
    ];
  }, [allowed, totalPopulation, totalDm, totalHt, totalElderly, newPatientTotal, revenueAvg, openAlerts, areaLabel, rangeLabel, registrationTrend]);

  const roleSwitch = (
    <NeutralSubdueButton
      size='md'
      leadingIcon={asExecutive ? 'admin_panel_settings' : 'person'}
      onClick={() => setAsExecutive((v) => !v)}
    >
      {asExecutive ? `สิทธิ์: ${EXECUTIVE_ROLES[0]}` : `สิทธิ์: ${PHCIS_CURRENT_USER.groupPolicy}`}
    </NeutralSubdueButton>
  );

  if (!allowed) {
    return (
      <QueuePageShell
        activeKey='dashboard'
        breadcrumb={breadcrumb}
        title='Dashboard ผู้บริหาร'
        actions={<DashboardHeaderActions>{roleSwitch}</DashboardHeaderActions>}
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
          <AccessDenied role={currentRole} />
        </div>
      </QueuePageShell>
    );
  }

  return (
    <QueuePageShell
      activeKey='dashboard'
      breadcrumb={breadcrumb}
      title='Dashboard ผู้บริหาร'
      afterTitle={(
        <DashboardHeaderFilters
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          defaultQuick='thisyear'
          templateValue={screenValue('executive')}
        ></DashboardHeaderFilters>
      )}
      actions={<DashboardHeaderActions>{roleSwitch}</DashboardHeaderActions>}
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

        {/* มติ คทง.11 — บอกผู้ใช้ตรง ๆ ว่าตัวเลือกถูกจำกัดเพราะขอบเขตข้อมูล
            ไม่ใช่ระบบเสียหรือข้อมูลหาย */}
        {scopeNotice && (
          <div
            className='flex items-center w-full'
            style={{
              gap: 'var(--dim-space-200)',
              paddingTop: 'var(--dim-space-300)',
              paddingBottom: 'var(--dim-space-300)',
              paddingLeft: 'var(--dim-space-400)',
              paddingRight: 'var(--dim-space-400)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
              color: 'var(--text-brandPrimary-default, #007549)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
            }}
          >
            <Icon name='shield_person' size={18} />
            <span className='flex-1 min-w-0'>{scopeNotice}</span>
          </div>
        )}

        <ReportToolbar
          trailing={(
            <NeutralSubdueButton leadingIcon='ios_share' size='md' onClick={() => openExport('all')}>
              ส่งออกข้อมูลผู้บริหาร
            </NeutralSubdueButton>
          )}
        >
          <div style={{ width: 'var(--dim-size-2200, 192px)' }}>
            <Dropdown
              size='md'
              value={area}
              onChange={(next) => { setArea(next); setSubDistrict('all'); setCenter('all'); }}
              options={areaOptions}
              placeholder='เขต'
            />
          </div>
          <div style={{ width: 'var(--dim-size-2200, 192px)' }}>
            <Dropdown
              size='md'
              value={subDistrict}
              onChange={setSubDistrict}
              options={subDistrictOptions(area)}
              placeholder='แขวง'
            />
          </div>
          <div style={{ width: 'var(--dim-size-2200, 192px)' }}>
            <Dropdown
              size='md'
              value={center}
              onChange={setCenter}
              options={centerOptionsForArea(area)}
              placeholder='สถานบริการ'
            />
          </div>
          <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
        </ReportToolbar>

        <SmoothFilterResults opaque={resultsOpaque}>
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>

            {/* ── 1.20.10.5 — anomaly alerts (บนสุด: ผู้บริหารต้องเห็นก่อน) ── */}
            <ReportGroupCard
              title='การแจ้งเตือนความผิดปกติ'
              subtitle={`TOR 1.20.10.5 · ประเมินกติกาล่าสุด ${ANOMALY_LAST_EVALUATED} · แสดงเฉพาะที่ตรวจพบใน ${rangeLabel}`}
              onView={() => openViewGroup('anomaly', 'การแจ้งเตือนความผิดปกติ')}
              onExport={() => openExportGroup('anomaly', 'รายงานการแจ้งเตือนความผิดปกติ')}
              extraActions={(
                <>
                  <NeutralSubdueButton size='sm' leadingIcon='rule' collapseLabelBelow='lg' onClick={() => setRulesOpen(true)}>
                    กติกาการแจ้งเตือน
                  </NeutralSubdueButton>
                  <NeutralSubdueButton size='sm' leadingIcon='history' collapseLabelBelow='lg' onClick={() => setHistoryOpen(true)}>
                    ประวัติ ({ackedAlerts.length})
                  </NeutralSubdueButton>
                </>
              )}
            >
              {openAlerts.length === 0 ? (
                <EmptyChartNote
                  text={alertsInRange.length === 0
                    ? `ไม่พบความผิดปกติที่ตรวจพบใน ${rangeLabel}`
                    : 'รับทราบครบทุกการแจ้งเตือนในช่วงนี้แล้ว'}
                  hint={`ประเมินกติกาทั้งหมด ${ANOMALY_RULES.length} ข้อ เมื่อ ${ANOMALY_LAST_EVALUATED} · รายการที่รับทราบแล้วดูได้จากปุ่ม “ประวัติ”`}
                  icon='verified'
                />
              ) : (
                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
                  {openAlerts.map((a) => (
                    <div
                      key={a.id}
                      className='flex items-start justify-between w-full flex-wrap'
                      style={{
                        gap: 'var(--dim-space-300)',
                        border: 'var(--dim-stroke-100) solid var(--border-card-default)',
                        borderLeft: `var(--dim-stroke-500) solid ${a.severity === 'critical'
                          ? 'var(--surface-colorfulbadge-red-bold, #EF4444)'
                          : a.severity === 'high'
                            ? 'var(--surface-colorfulbadge-orange-bold, #F97316)'
                            : a.severity === 'medium'
                              ? 'var(--surface-colorfulbadge-yellow-bold, #EAB308)'
                              : 'var(--surface-colorfulbadge-blue-bold, #3B82F6)'}`,
                        borderRadius: 'var(--dim-radius-300, 10px)',
                        paddingTop: 'var(--dim-space-300)',
                        paddingBottom: 'var(--dim-space-300)',
                        paddingLeft: 'var(--dim-space-400)',
                        paddingRight: 'var(--dim-space-400)',
                      }}
                    >
                      <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-150)', flex: '1 1 320px' }}>
                        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                          <ColorfulBadge style={ANOMALY_SEVERITY[a.severity].badge} size='small' hierarchy='secondary'>
                            {ANOMALY_SEVERITY[a.severity].label}
                          </ColorfulBadge>
                          <Badge style='neutral' size='small'>{a.metric}</Badge>
                          <span
                            style={{
                              color: 'var(--text-content-tertiary)',
                              fontFamily: 'var(--type-family-body)',
                              fontSize: 'var(--type-size-xs)',
                            }}
                          >
                            {a.area} · ตรวจพบ {formatIsoDateThai(a.detectedIso)}
                          </span>
                        </div>
                        <span
                          style={{
                            color: 'var(--text-content-default)',
                            fontFamily: 'var(--type-family-heading-graphic2)',
                            fontSize: 'var(--type-size-sm)',
                            lineHeight: 1.4,
                          }}
                        >
                          {a.title}
                        </span>
                        <span
                          style={{
                            color: 'var(--text-content-secondary)',
                            fontFamily: 'var(--type-family-body)',
                            fontSize: 'var(--type-size-xs)',
                            lineHeight: 1.5,
                          }}
                        >
                          {a.detail}
                        </span>
                      </div>
                      <div className='flex items-center shrink-0 flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                        {a.link ? (
                          <Link to={a.link}>
                            <NeutralSubdueButton size='sm' trailingIcon='arrow_forward'>{a.linkLabel}</NeutralSubdueButton>
                          </Link>
                        ) : null}
                        <BrandButton size='sm' variant='fill' leadingIcon='check' onClick={() => setAckTarget(a)}>
                          รับทราบ
                        </BrandButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ReportGroupCard>

            {/* ── 1.20.10.1 ────────────────────────────────────────────── */}
            <ReportGroupCard
              title='ภาพรวมสุขภาพรายพื้นที่ (Area Health Analytics)'
              subtitle='TOR 1.20.10.1 · แยกตามเขต แขวง และรายสถานบริการ — ทะเบียนประชากรและผู้ป่วยสะสม ณ ปัจจุบัน (ไม่ขึ้นกับตัวกรองช่วงเวลา)'
              onView={() => openViewGroup('area', 'ภาพรวมสุขภาพรายพื้นที่')}
              onExport={() => openExportGroup('area', 'รายงานภาพรวมสุขภาพรายพื้นที่')}
            >
              <StatTileRow>
                <StatTile label='ประชากรในพื้นที่' value={totalPopulation.toLocaleString('th-TH')} unit='คน' />
                <StatTile label='ผู้ป่วยเบาหวาน' value={totalDm.toLocaleString('th-TH')} unit='ราย' tone='warning' />
                <StatTile label='ผู้ป่วยความดันโลหิตสูง' value={totalHt.toLocaleString('th-TH')} unit='ราย' tone='warning' />
                <StatTile
                  label='ความชุกโรคไม่ติดต่อเรื้อรัง'
                  value={`${safePct(totalDm + totalHt, totalPopulation)}%`}
                  tone='danger'
                  hint={totalPopulation === 0 ? 'ไม่พบพื้นที่ตามตัวกรอง' : undefined}
                />
              </StatTileRow>
              <ChartsRow>
                <ChartPanel title='แผนที่ความชุกโรคไม่ติดต่อเรื้อรังรายเขต'>
                  <AreaHealthMapPanel
                    districts={districts}
                    selectedKey={area}
                    onSelect={(next) => { setArea(next); setSubDistrict('all'); setCenter('all'); }}
                  />
                </ChartPanel>
              </ChartsRow>
              <ChartsRow>
                <ChartPanel title='ผู้ป่วย NCD แยกตามเขต (เบาหวาน / ความดัน)' alignContent='start'>
                  {ncdHbar.length ? (
                    <div className='w-full'><HBarList valueLabel='ราย' rows={ncdHbar} /></div>
                  ) : <EmptyChartNote text='ไม่พบพื้นที่ตามตัวกรองที่เลือก' hint='ลองเลือก “ทุกเขต” หรือเปลี่ยนแขวง' />}
                </ChartPanel>
                <ChartPanel title='เปรียบเทียบความชุกรายสถานบริการ' alignContent='start'>
                  {centerCompare.length ? (
                    <div className='w-full'><HBarList valueLabel='%' rows={centerCompare} /></div>
                  ) : <EmptyChartNote text='ไม่พบสถานบริการตามตัวกรอง' />}
                </ChartPanel>
              </ChartsRow>
            </ReportGroupCard>

            {/* ── 1.20.10.2 ────────────────────────────────────────────── */}
            <ReportGroupCard
              title='แนวโน้มการลงทะเบียนผู้ป่วยใหม่และโครงสร้างประชากร'
              subtitle='TOR 1.20.10.2 · กราฟแนวโน้มตัดตามตัวกรองช่วงเวลา (ชุดข้อมูลมี 12 เดือนล่าสุด)'
              onView={() => openViewGroup('population', 'แนวโน้มการลงทะเบียนผู้ป่วยใหม่')}
              onExport={() => openExportGroup('population', 'รายงานแนวโน้มการลงทะเบียนผู้ป่วยใหม่')}
            >
              <ChartsRow>
                <ChartPanel
                  title={`แนวโน้มผู้ป่วยใหม่เทียบผู้ป่วยเดิม (${registrationTrend.months.length} เดือน)`}
                  hint={`ช่วงที่เลือก: ${rangeLabel}`}
                >
                  <div className='w-full'>
                    {registrationTrend.months.length >= 2 ? (
                      <AreaLineChart months={registrationTrend.months} series={registrationSeries} height={260} />
                    ) : (
                      <EmptyChartNote
                        text='ช่วงเวลาที่เลือกครอบคลุมน้อยกว่า 2 เดือน'
                        hint='ชุดข้อมูลแนวโน้มเป็นรายเดือน (ย้อนหลัง 12 เดือน) — เลือกช่วงที่กว้างขึ้นเพื่อดูกราฟ'
                      />
                    )}
                  </div>
                </ChartPanel>
              </ChartsRow>
              <ChartsRow>
                <ChartPanel
                  title='การกระจายตัวของประชากรตามเพศและอายุ (%)'
                  hint='ภาพนิ่งจากทะเบียนประชากรล่าสุด — ไม่ขึ้นกับตัวกรองช่วงเวลา'
                >
                  <div className='w-full'>
                    <PyramidPct
                      groups={POPULATION_PYRAMID}
                      maleColor={PHCIS_CHART.indigo}
                      femaleColor={PHCIS_CHART.pink}
                    />
                  </div>
                </ChartPanel>
              </ChartsRow>
            </ReportGroupCard>

            {/* ── 1.20.10.3 ────────────────────────────────────────────── */}
            <ReportGroupCard
              title='แนวโน้มความต้องการยาล่วงหน้า'
              subtitle='TOR 1.20.10.3 · แท่งสีชมพูคือค่าพยากรณ์ 3 เดือนข้างหน้า — ใช้การใช้จริง 12 เดือนล่าสุดเสมอ (ไม่ขึ้นกับตัวกรองช่วงเวลา)'
              onView={() => openViewGroup('drug', 'แนวโน้มความต้องการยาล่วงหน้า')}
              onExport={() => openExportGroup('drug', 'รายงานแนวโน้มความต้องการยาล่วงหน้า')}
            >
              <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <div style={{ width: 'var(--dim-size-2500, 320px)', maxWidth: '100%' }}>
                  <Dropdown
                    size='md'
                    value={forecastDrug}
                    onChange={setForecastDrug}
                    options={DRUG_FORECASTS.map((d) => ({ value: d.id, label: d.name }))}
                    placeholder='เลือกรายการยา'
                  />
                </div>
                {criticalDrugs.length ? (
                  <ColorfulBadge style='red' size='small' hierarchy='secondary'>
                    {criticalDrugs.length} รายการควรเติมสต็อกภายใน 30 วัน
                  </ColorfulBadge>
                ) : (
                  <ColorfulBadge style='green' size='small' hierarchy='secondary'>
                    สต็อกทุกรายการเพียงพอเกิน 30 วัน
                  </ColorfulBadge>
                )}
              </div>
              <ChartsRow>
                <ChartPanel
                  title={activeForecast ? `${activeForecast.name} — การใช้จริงและค่าพยากรณ์` : 'ความต้องการยา'}
                  hint={activeForecast
                    ? `คงคลัง ${activeForecast.stock.toLocaleString('th-TH')} ${activeForecast.unit} · ใช้เฉลี่ย ${activeForecast.dailyUse.toLocaleString('th-TH')} ${activeForecast.unit}/วัน · คาดว่าจะหมดใน ${activeForecast.daysToStockout} วัน`
                    : undefined}
                >
                  {forecastMonthLabels.length ? (
                    <div className='w-full' style={{ paddingTop: 'var(--dim-space-200)' }}>
                      <VBars
                        months={forecastMonthLabels}
                        series={forecastSeries}
                        height={220}
                        barMaxWidth={12}
                      />
                    </div>
                  ) : <EmptyChartNote />}
                </ChartPanel>
                <ChartPanel title='ยาที่ควรเติมสต็อกก่อน (เรียงตามวันที่เหลือ)' alignContent='start'>
                  {reorderHbar.length ? (
                    <div className='w-full'><HBarList valueLabel='วัน' rows={reorderHbar} /></div>
                  ) : <EmptyChartNote />}
                </ChartPanel>
              </ChartsRow>
            </ReportGroupCard>

            {/* ── 1.20.10.4 ────────────────────────────────────────────── */}
            <ReportGroupCard
              title='แนวโน้มรายรับจากการให้บริการ'
              subtitle='TOR 1.20.10.4'
              onView={() => openViewGroup('finance', 'แนวโน้มรายรับจากการให้บริการ')}
              onExport={() => openExportGroup('finance', 'รายงานแนวโน้มรายรับ')}
              extraActions={(
                <Link to='/finance'>
                  <NeutralSubdueButton size='sm' trailingIcon='chevron_right' collapseLabelBelow='lg'>
                    ไปที่ระบบการเงิน
                  </NeutralSubdueButton>
                </Link>
              )}
            >
              <StatTileRow columns={3}>
                <StatTile
                  label={`รายรับรวม (${revenueTrend.months.length} เดือน)`}
                  value={revenueTotal.toLocaleString('th-TH')}
                  unit='บาท'
                  hint={revenueTrend.months.length === 0 ? 'ไม่มีเดือนใดอยู่ในช่วงที่เลือก' : undefined}
                />
                <StatTile label='เฉลี่ยต่อเดือน' value={revenueAvg.toLocaleString('th-TH')} unit='บาท' tone='info' />
                <StatTile
                  label='เดือนล่าสุดในช่วงที่เลือก'
                  value={revenueLatest.toLocaleString('th-TH')}
                  unit='บาท'
                  tone={revenueLatest < revenueAvg ? 'warning' : undefined}
                />
              </StatTileRow>
              <ChartsRow>
                <ChartPanel title='รายรับรายเดือน (บาท)' hint={`ช่วงที่เลือก: ${rangeLabel}`}>
                  <div className='w-full'>
                    {revenueTrend.months.length >= 2 ? (
                      <AreaLineChart months={revenueTrend.months} series={revenueSeries} height={260} />
                    ) : (
                      <EmptyChartNote
                        text='ช่วงเวลาที่เลือกครอบคลุมน้อยกว่า 2 เดือน'
                        hint='ชุดข้อมูลรายรับเป็นรายเดือน (ย้อนหลัง 12 เดือน) — เลือกช่วงที่กว้างขึ้นเพื่อดูกราฟ'
                      />
                    )}
                  </div>
                </ChartPanel>
              </ChartsRow>
              <ChartsRow>
                <ChartPanel
                  title='สัดส่วนรายรับตามช่องทาง'
                  hint='ยอดสะสมทั้งปีงบประมาณ — ไม่ขึ้นกับตัวกรองช่วงเวลา'
                >
                  <DonutWithLegend
                    segments={revenueDonut}
                    size={180}
                    centerLabel={`${Math.round(REVENUE_CHANNEL_SPLIT.reduce((s, c) => s + c.value, 0) / 1000000 * 10) / 10} ล.`}
                    centerSub='บาท'
                  />
                </ChartPanel>
              </ChartsRow>
            </ReportGroupCard>

          </div>
        </SmoothFilterResults>
      </div>

      {/* รับทราบการแจ้งเตือน (audit: ผู้รับทราบ + เวลา) */}
      <Popup
        open={!!ackTarget}
        onClose={() => setAckTarget(null)}
        title='รับทราบการแจ้งเตือน'
        subtitle={ackTarget?.title}
        primaryAction={{ label: 'รับทราบ', onClick: () => ackTarget && acknowledgeAlert(ackTarget) }}
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setAckTarget(null) }}
      >
        <span
          style={{
            color: 'var(--text-content-secondary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
            lineHeight: 1.6,
          }}
        >
          ระบบจะบันทึกว่า {PHCIS_CURRENT_USER.displayName} รับทราบการแจ้งเตือนนี้พร้อมวันเวลา
          และย้ายรายการไปยัง “ประวัติการแจ้งเตือน” — สามารถเปิดดูย้อนหลังได้เสมอ
        </span>
      </Popup>

      {/* ประวัติการแจ้งเตือนที่รับทราบแล้ว */}
      <Popup
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        size='large'
        title='ประวัติการแจ้งเตือนที่รับทราบแล้ว'
        primaryAction={{ label: 'ปิด', onClick: () => setHistoryOpen(false) }}
      >
        <Table
          columns={[
            { key: 'title', label: 'การแจ้งเตือน', flex: true, minWidth: 300 },
            {
              key: 'severity', label: 'ความรุนแรง',
              render: (r) => <Badge style={r.severity === 'critical' ? 'error' : r.severity === 'high' ? 'warning' : 'info'} size='small'>{ANOMALY_SEVERITY[r.severity].label}</Badge>,
              csv: (r) => ANOMALY_SEVERITY[r.severity].label,
            },
            { key: 'ackBy', label: 'ผู้รับทราบ', flex: true, minWidth: 200 },
            { key: 'ackAt', label: 'เวลาที่รับทราบ', flex: true, minWidth: 220 },
            {
              key: 'undo', label: 'จัดการ',
              render: (r) => (
                <NeutralSubdueButton size='sm' leadingIcon='undo' onClick={() => undoAcknowledge(r)}>
                  ยกเลิกการรับทราบ
                </NeutralSubdueButton>
              ),
              csv: () => '',
            },
          ]}
          rows={ackedAlerts.map((a) => ({
            ...a,
            ackBy: acknowledged[a.id]?.by || '—',
            ackAt: acknowledged[a.id]?.at || '—',
          }))}
          rowKey={(r) => r.id}
          emptyMessage='ยังไม่มีการแจ้งเตือนที่รับทราบ'
          emptySubtext='รายการที่กด “รับทราบ” จะย้ายมาอยู่ที่นี่'
          pagination={false}
        />
      </Popup>

      {/* กติกาการแจ้งเตือน */}
      <Popup
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        size='large'
        title='กติกาการตรวจจับความผิดปกติ'
        subtitle={`ประเมินทุกวัน · ครั้งล่าสุด ${ANOMALY_LAST_EVALUATED}`}
        primaryAction={{ label: 'ปิด', onClick: () => setRulesOpen(false) }}
      >
        <Table
          columns={[
            { key: 'metric', label: 'ด้าน', flex: true, minWidth: 180 },
            { key: 'label', label: 'เงื่อนไขที่ทำให้เกิดการแจ้งเตือน', flex: true, minWidth: 420 },
          ]}
          rows={ANOMALY_RULES.map((r) => ({ ...r, id: r.key }))}
          rowKey={(r) => r.id}
          emptyMessage='ยังไม่มีกติกาการแจ้งเตือน'
          pagination={false}
        />
      </Popup>

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
        topicsFieldName='dashboard-executive-export-topics'
      />

      <SuccessToast open={exported} message='ส่งออกข้อมูลผู้บริหารแล้ว' onClose={() => setExported(false)} />
      <SuccessToast open={!!toast} message={toast} onClose={() => setToast('')} />
    </QueuePageShell>
  );
};

export default ExecutiveDashboardPage;
