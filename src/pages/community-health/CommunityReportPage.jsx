import React, { useMemo, useState } from 'react';
import CommunityLayout from './CommunityLayout';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import FilterDateTag from '@/components/forms/FilterDateTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import SuccessToast from '@/components/toast/SuccessToast';
import { DonutWithLegend, HBarList, VBars } from '@/components/graph/Charts';
import PHCIS_CHART, { PHCIS_CHART_PALETTE } from '@/data/phcisChartPalette';
import { formatIsoDateThai } from '@/data/dashboardCommon';
import {
  ReportGroupCard,
  ChartPanel,
  ChartsRow,
  EmptyChartNote,
  countBy,
  donutFromCounts,
  hbarRows,
  buildExportReport,
  ReportViewPopup,
  matchesIsoDateFilter,
  CARD,
} from '@/pages/dashboard/dashboardReportKit';
import { ExportFormatPopup } from '@/pages/consent/consentExportPopup';
import {
  COMMUNITIES,
  HOUSES,
  SURVEYS,
  ASSESSMENTS,
  HEALTH_CENTERS,
  VOLUNTEERS,
  VOLUNTEER_STATUS_LABEL,
  ACTIVITIES,
} from './communityReportData';

/* รายงาน — ported from claude/Community community-report.html.
   The prototype only lists 7 report categories with a bare "ดูรายงาน" stub
   (no charts, no export, no real dataset) — the on-page report shell from
   src/pages/pharmacy/PharmacyReportsPage.jsx / src/pages/dashboard's §1.20
   report kit (dashboardReportKit.jsx) is reused instead of inventing a new
   page shape, per mih-report-page skill: domain-grouped cards, on-page
   charts, ดูรายงาน table popup, นำส่งออกรายงาน via ExportFormatPopup.
   Row-level mock data for the 7 domains lives in ./communityReportData.js. */

const breadcrumb = ['รายงาน'];
const DEFAULT_DATE_FILTER = { quick: 'thismonth' };
const COMMUNITY_EXPORT_FOOTER =
  'ออกเอกสารโดยระบบงานสาธารณสุขและระบบงานควบคุมป้องกันและส่งเสริมสุขภาพในชุมชน (PHCIS)';

/* 1 report key per domain group (no chip switcher needed in ดูรายงาน). */
const EXPORT_GROUP_KEYS = {
  community: ['community'],
  houses: ['houses'],
  surveys: ['surveys'],
  assessment: ['assessment'],
  centers: ['centers'],
  volunteers: ['volunteers'],
  activities: ['activities'],
};

const COMMUNITY_COLUMNS = [
  { key: 'code', label: 'รหัสชุมชน' },
  { key: 'name', label: 'ชื่อชุมชน' },
  { key: 'district', label: 'เขต' },
  { key: 'type', label: 'ประเภทชุมชน' },
  { key: 'houseCount', label: 'จำนวนบ้าน' },
  { key: 'memberCount', label: 'จำนวนสมาชิก' },
  { key: 'registeredDate', label: 'วันที่ขึ้นทะเบียน' },
];

const HOUSE_COLUMNS = [
  { key: 'houseNo', label: 'บ้านเลขที่' },
  { key: 'community', label: 'ชุมชน' },
  { key: 'district', label: 'เขต' },
  { key: 'memberCount', label: 'จำนวนสมาชิก' },
  { key: 'children', label: 'เด็ก (0-14 ปี)' },
  { key: 'working', label: 'วัยทำงาน (15-59 ปี)' },
  { key: 'elderly', label: 'ผู้สูงอายุ (60 ปีขึ้นไป)' },
  { key: 'registeredDate', label: 'วันที่สำรวจ/บันทึก' },
];

const SURVEY_COLUMNS = [
  { key: 'targetType', label: 'ประเภทเป้าหมาย' },
  { key: 'targetName', label: 'ชื่อ/รายการ' },
  { key: 'district', label: 'เขต' },
  { key: 'status', label: 'สถานะการสำรวจ' },
  { key: 'surveyor', label: 'ผู้สำรวจ' },
  { key: 'surveyDate', label: 'วันที่สำรวจ' },
];

const ASSESSMENT_COLUMNS = [
  { key: 'houseNo', label: 'บ้านเลขที่' },
  { key: 'community', label: 'ชุมชน' },
  { key: 'district', label: 'เขต' },
  { key: 'result', label: 'ผลการประเมิน' },
  { key: 'score', label: 'คะแนน', csv: (r) => (r.score == null ? '-' : String(r.score)) },
  { key: 'assessor', label: 'ผู้ประเมิน' },
  { key: 'assessDate', label: 'วันที่ประเมิน' },
];

const CENTER_COLUMNS = [
  { key: 'name', label: 'ชื่อศูนย์' },
  { key: 'district', label: 'เขต' },
  { key: 'type', label: 'ประเภท' },
  { key: 'staffCount', label: 'จำนวนบุคลากร' },
  { key: 'coverageHouses', label: 'บ้านในพื้นที่รับผิดชอบ' },
  { key: 'coverageMembers', label: 'สมาชิกในพื้นที่รับผิดชอบ' },
  { key: 'openDate', label: 'วันที่เปิดให้บริการ' },
];

const VOLUNTEER_COLUMNS = [
  { key: 'name', label: 'ชื่อ อสส.' },
  { key: 'community', label: 'ชุมชนที่รับผิดชอบ' },
  { key: 'district', label: 'เขต' },
  { key: 'houseCount', label: 'จำนวนบ้านที่รับผิดชอบ' },
  { key: 'status', label: 'สถานะ', csv: (r) => VOLUNTEER_STATUS_LABEL[r.status] || r.status },
  { key: 'joinDate', label: 'วันที่เริ่มปฏิบัติงาน' },
];

const ACTIVITY_COLUMNS = [
  { key: 'title', label: 'กิจกรรม' },
  { key: 'type', label: 'ประเภทกิจกรรม' },
  { key: 'community', label: 'ชุมชน' },
  { key: 'district', label: 'เขต' },
  { key: 'participantCount', label: 'จำนวนผู้เข้าร่วม' },
  { key: 'responsible', label: 'ผู้รับผิดชอบ' },
  { key: 'activityDate', label: 'วันที่จัดกิจกรรม' },
];

/** Sum a numeric field grouped by a key, top-N descending — for HBarList rows. */
const topSumBy = (rows, keyFn, valFn, n = 6) => {
  const map = new Map();
  rows.forEach((row) => {
    const key = keyFn(row);
    if (key == null || key === '') return;
    map.set(key, (map.get(key) || 0) + (Number(valFn(row)) || 0));
  });
  return [...map.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, value]) => ({ label, value }));
};

/** Count occurrences grouped by a key, top-N descending — for HBarList rows. */
const topCountBy = (rows, keyFn, n = 6) => {
  const map = countBy(rows, keyFn);
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, value]) => ({ label, value }));
};

/** Daily count trend within the currently filtered range — same shape as
    PharmacyReportsPage's "แนวโน้มใบสั่งยารายวัน" panel. */
const dailyTrend = (rows, isoOf) => {
  const map = new Map();
  rows.forEach((row) => {
    const iso = isoOf(row);
    if (!iso) return;
    map.set(iso, (map.get(iso) || 0) + 1);
  });
  const days = [...map.keys()].sort();
  return {
    months: days.map((d) => formatIsoDateThai(d).replace(/\s\d{4}$/, '')),
    values: days.map((d) => map.get(d) || 0),
  };
};

const STATUS_COLOR = {
  'สำรวจแล้ว': PHCIS_CHART.teal,
  'กำลังสำรวจ': PHCIS_CHART.yellow,
  'ยังไม่สำรวจ': PHCIS_CHART.pink,
  'ผ่านเกณฑ์': PHCIS_CHART.teal,
  'ต้องปรับปรุง': PHCIS_CHART.pink,
  'ยังไม่ได้ประเมิน': PHCIS_CHART.yellow,
};

const CommunityReportCharts = ({ mode, rows }) => {
  if (mode === 'community') {
    const typeDonut = donutFromCounts(
      countBy(rows, (r) => r.type),
      (_k, i) => PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length],
    );
    const topDistricts = topSumBy(rows, (r) => r.district, (r) => r.memberCount);
    return (
      <ChartsRow>
        <ChartPanel title='สัดส่วนประเภทชุมชน'>
          {typeDonut.length ? (
            <DonutWithLegend segments={typeDonut} size={180} centerLabel={String(rows.length)} centerSub='ชุมชน' />
          ) : <EmptyChartNote text='ไม่พบข้อมูลชุมชนในช่วงที่เลือก' />}
        </ChartPanel>
        <ChartPanel title='เขตที่มีสมาชิกมากสุด (Top 6)' alignContent='start'>
          {topDistricts.length ? (
            <div className='w-full'><HBarList valueLabel='คน' rows={hbarRows(topDistricts, PHCIS_CHART.indigo, 'สมาชิก')} /></div>
          ) : <EmptyChartNote text='ไม่พบข้อมูลสมาชิกในช่วงที่เลือก' />}
        </ChartPanel>
      </ChartsRow>
    );
  }

  if (mode === 'houses') {
    const ageTotals = rows.reduce((acc, r) => ({
      children: acc.children + (r.children || 0),
      working: acc.working + (r.working || 0),
      elderly: acc.elderly + (r.elderly || 0),
    }), { children: 0, working: 0, elderly: 0 });
    const ageDonut = [
      { label: 'เด็ก (0-14 ปี)', value: ageTotals.children, color: PHCIS_CHART.pink },
      { label: 'วัยทำงาน (15-59 ปี)', value: ageTotals.working, color: PHCIS_CHART.teal },
      { label: 'ผู้สูงอายุ (60 ปีขึ้นไป)', value: ageTotals.elderly, color: PHCIS_CHART.yellow },
    ].filter((s) => s.value > 0);
    const topCommunities = topCountBy(rows, (r) => r.community);
    return (
      <ChartsRow>
        <ChartPanel title='จำนวนสมาชิกตามกลุ่มอายุ'>
          {ageDonut.length ? (
            <DonutWithLegend segments={ageDonut} size={180} />
          ) : <EmptyChartNote text='ไม่พบข้อมูลสมาชิกในช่วงที่เลือก' />}
        </ChartPanel>
        <ChartPanel title='ชุมชนที่มีบ้านมากสุด (Top 6)' alignContent='start'>
          {topCommunities.length ? (
            <div className='w-full'><HBarList valueLabel='หลัง' rows={hbarRows(topCommunities, PHCIS_CHART.indigo, 'บ้าน')} /></div>
          ) : <EmptyChartNote text='ไม่พบข้อมูลบ้านในช่วงที่เลือก' />}
        </ChartPanel>
      </ChartsRow>
    );
  }

  if (mode === 'surveys') {
    const statusDonut = donutFromCounts(
      countBy(rows, (r) => r.status),
      (key, i) => STATUS_COLOR[key] || PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length],
    );
    const trend = dailyTrend(rows, (r) => r.surveyDate);
    return (
      <ChartsRow>
        <ChartPanel title='สัดส่วนสถานะการสำรวจ'>
          {statusDonut.length ? (
            <DonutWithLegend segments={statusDonut} size={180} centerLabel={String(rows.length)} centerSub='รายการ' />
          ) : <EmptyChartNote text='ไม่พบข้อมูลการสำรวจในช่วงที่เลือก' />}
        </ChartPanel>
        <ChartPanel title='แนวโน้มการสำรวจรายวัน'>
          {trend.months.length > 1 ? (
            <div className='w-full' style={{ paddingTop: 'var(--dim-space-200)' }}>
              <VBars months={trend.months} series={[{ label: 'รายการสำรวจ', color: PHCIS_CHART.indigo, values: trend.values }]} height={180} />
            </div>
          ) : <EmptyChartNote text='ไม่พบแนวโน้มรายวันในช่วงที่เลือก' />}
        </ChartPanel>
      </ChartsRow>
    );
  }

  if (mode === 'assessment') {
    const resultDonut = donutFromCounts(
      countBy(rows, (r) => r.result),
      (key, i) => STATUS_COLOR[key] || PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length],
    );
    const topNeedsImprove = topCountBy(rows.filter((r) => r.result === 'ต้องปรับปรุง'), (r) => r.district);
    return (
      <ChartsRow>
        <ChartPanel title='สัดส่วนผลการประเมิน'>
          {resultDonut.length ? (
            <DonutWithLegend segments={resultDonut} size={180} centerLabel={String(rows.length)} centerSub='รายการ' />
          ) : <EmptyChartNote text='ไม่พบข้อมูลการประเมินในช่วงที่เลือก' />}
        </ChartPanel>
        <ChartPanel title='เขตที่ต้องปรับปรุงมากสุด (Top 6)' alignContent='start'>
          {topNeedsImprove.length ? (
            <div className='w-full'><HBarList valueLabel='รายการ' rows={hbarRows(topNeedsImprove, PHCIS_CHART.pink, 'ต้องปรับปรุง')} /></div>
          ) : <EmptyChartNote text='ไม่พบรายการที่ต้องปรับปรุงในช่วงที่เลือก' />}
        </ChartPanel>
      </ChartsRow>
    );
  }

  if (mode === 'centers') {
    const typeDonut = donutFromCounts(
      countBy(rows, (r) => r.type),
      (_k, i) => PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length],
    );
    const topByCoverage = topSumBy(rows, (r) => r.name, (r) => r.coverageMembers);
    return (
      <ChartsRow>
        <ChartPanel title='สัดส่วนประเภทศูนย์'>
          {typeDonut.length ? (
            <DonutWithLegend segments={typeDonut} size={180} centerLabel={String(rows.length)} centerSub='ศูนย์' />
          ) : <EmptyChartNote text='ไม่พบข้อมูลศูนย์สุขภาพชุมชนในช่วงที่เลือก' />}
        </ChartPanel>
        <ChartPanel title='ศูนย์ที่ดูแลสมาชิกมากสุด (Top 6)' alignContent='start'>
          {topByCoverage.length ? (
            <div className='w-full'><HBarList valueLabel='คน' rows={hbarRows(topByCoverage, PHCIS_CHART.teal, 'สมาชิกในพื้นที่')} /></div>
          ) : <EmptyChartNote text='ไม่พบข้อมูลพื้นที่รับผิดชอบในช่วงที่เลือก' />}
        </ChartPanel>
      </ChartsRow>
    );
  }

  if (mode === 'volunteers') {
    const statusDonut = donutFromCounts(
      countBy(rows, (r) => r.status),
      (key) => (key === 'active' ? PHCIS_CHART.teal : 'var(--surface-neutral-tertiary, #E2E4E6)'),
      (key) => VOLUNTEER_STATUS_LABEL[key] || key,
    );
    const topCommunities = topCountBy(rows, (r) => r.community);
    return (
      <ChartsRow>
        <ChartPanel title='สัดส่วนสถานะ อสส.'>
          {statusDonut.length ? (
            <DonutWithLegend segments={statusDonut} size={180} centerLabel={String(rows.length)} centerSub='อสส.' />
          ) : <EmptyChartNote text='ไม่พบข้อมูล อสส. ในช่วงที่เลือก' />}
        </ChartPanel>
        <ChartPanel title='ชุมชนที่มี อสส. มากสุด (Top 6)' alignContent='start'>
          {topCommunities.length ? (
            <div className='w-full'><HBarList valueLabel='คน' rows={hbarRows(topCommunities, PHCIS_CHART.indigo, 'อสส.')} /></div>
          ) : <EmptyChartNote text='ไม่พบข้อมูล อสส. ในช่วงที่เลือก' />}
        </ChartPanel>
      </ChartsRow>
    );
  }

  if (mode === 'activities') {
    const typeDonut = donutFromCounts(
      countBy(rows, (r) => r.type),
      (_k, i) => PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length],
    );
    const topCommunities = topSumBy(rows, (r) => r.community, (r) => r.participantCount);
    const trend = dailyTrend(rows, (r) => r.activityDate);
    return (
      <ChartsRow>
        <ChartPanel title='สัดส่วนกิจกรรมตามประเภท'>
          {typeDonut.length ? (
            <DonutWithLegend segments={typeDonut} size={180} centerLabel={String(rows.length)} centerSub='กิจกรรม' />
          ) : <EmptyChartNote text='ไม่พบข้อมูลกิจกรรมในช่วงที่เลือก' />}
        </ChartPanel>
        <ChartPanel title='ชุมชนที่มีผู้เข้าร่วมมากสุด (Top 6)' alignContent='start'>
          {topCommunities.length ? (
            <div className='w-full'><HBarList valueLabel='คน' rows={hbarRows(topCommunities, PHCIS_CHART.teal, 'ผู้เข้าร่วม')} /></div>
          ) : <EmptyChartNote text='ไม่พบข้อมูลผู้เข้าร่วมในช่วงที่เลือก' />}
        </ChartPanel>
        <ChartPanel title='แนวโน้มกิจกรรมรายวัน'>
          {trend.months.length > 1 ? (
            <div className='w-full' style={{ paddingTop: 'var(--dim-space-200)' }}>
              <VBars months={trend.months} series={[{ label: 'กิจกรรม', color: PHCIS_CHART.indigo, values: trend.values }]} height={180} />
            </div>
          ) : <EmptyChartNote text='ไม่พบแนวโน้มรายวันในช่วงที่เลือก' />}
        </ChartPanel>
      </ChartsRow>
    );
  }

  return null;
};

const CommunityReportPage = () => {
  const [dateFilter, setDateFilter] = useState(DEFAULT_DATE_FILTER);
  const [exported, setExported] = useState(false);
  const [exportReport, setExportReport] = useState(null);
  const [viewBundle, setViewBundle] = useState(null);

  const communityRows = useMemo(
    () => COMMUNITIES.filter((r) => matchesIsoDateFilter(r.registeredDate, dateFilter)),
    [dateFilter],
  );
  const houseRows = useMemo(
    () => HOUSES.filter((r) => matchesIsoDateFilter(r.registeredDate, dateFilter)),
    [dateFilter],
  );
  const surveyRows = useMemo(
    () => SURVEYS.filter((r) => matchesIsoDateFilter(r.surveyDate, dateFilter)),
    [dateFilter],
  );
  const assessmentRows = useMemo(
    () => ASSESSMENTS.filter((r) => matchesIsoDateFilter(r.assessDate, dateFilter)),
    [dateFilter],
  );
  const centerRows = useMemo(
    () => HEALTH_CENTERS.filter((r) => matchesIsoDateFilter(r.openDate, dateFilter)),
    [dateFilter],
  );
  const volunteerRows = useMemo(
    () => VOLUNTEERS.filter((r) => matchesIsoDateFilter(r.joinDate, dateFilter)),
    [dateFilter],
  );
  const activityRows = useMemo(
    () => ACTIVITIES.filter((r) => matchesIsoDateFilter(r.activityDate, dateFilter)),
    [dateFilter],
  );

  const filtersActive = (dateFilter?.quick || 'thismonth') !== 'thismonth';
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => setDateFilter(DEFAULT_DATE_FILTER),
  );

  /* Export/view catalog carries the full history (not the page-level date
     filter) so ดูรายงาน / นำส่งออกรายงาน can re-scope independently — same
     convention as PharmacyReportsPage / ConsentReportPage. */
  const reportsCatalog = useMemo(() => [
    buildExportReport('community', 'รายงานข้อมูลชุมชน', COMMUNITY_COLUMNS, COMMUNITIES, (r) => r.registeredDate),
    buildExportReport('houses', 'รายงานข้อมูลบ้านและสมาชิก', HOUSE_COLUMNS, HOUSES, (r) => r.registeredDate),
    buildExportReport('surveys', 'รายงานการสำรวจชุมชนและบ้าน', SURVEY_COLUMNS, SURVEYS, (r) => r.surveyDate),
    buildExportReport('assessment', 'รายงานการประเมินสภาพแวดล้อมและสุขาภิบาล', ASSESSMENT_COLUMNS, ASSESSMENTS, (r) => r.assessDate),
    buildExportReport('centers', 'รายงานข้อมูลศูนย์สุขภาพชุมชน', CENTER_COLUMNS, HEALTH_CENTERS, (r) => r.openDate),
    buildExportReport('volunteers', 'รายงานข้อมูล อสส.', VOLUNTEER_COLUMNS, VOLUNTEERS, (r) => r.joinDate),
    buildExportReport('activities', 'รายงานกิจกรรม', ACTIVITY_COLUMNS, ACTIVITIES, (r) => r.activityDate),
  ], []);

  const exportTopics = useMemo(
    () => reportsCatalog.map((r) => ({ value: r.key, label: r.title })),
    [reportsCatalog],
  );

  const openExport = (keyOrReport) => {
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

  const openViewGroup = (groupKey, title) => {
    const keys = EXPORT_GROUP_KEYS[groupKey] || [];
    const reports = keys.map((k) => reportsCatalog.find((r) => r.key === k)).filter(Boolean);
    if (!reports.length) return;
    setViewBundle({ key: groupKey, title, reports });
  };

  return (
    <CommunityLayout activeKey='report' breadcrumb={breadcrumb}>
      <section
        className='w-full flex items-center justify-between flex-wrap'
        style={{ ...CARD, gap: 'var(--dim-space-300)', paddingTop: 'var(--dim-space-300)', paddingBottom: 'var(--dim-space-300)', paddingLeft: 'var(--dim-space-400)', paddingRight: 'var(--dim-space-400)' }}
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
            title='ข้อมูลชุมชน'
            onView={() => openViewGroup('community', 'ข้อมูลชุมชน')}
            onExport={() => openExport('community')}
          >
            <CommunityReportCharts mode='community' rows={communityRows} />
          </ReportGroupCard>

          <ReportGroupCard
            title='ข้อมูลบ้านและสมาชิก'
            onView={() => openViewGroup('houses', 'ข้อมูลบ้านและสมาชิก')}
            onExport={() => openExport('houses')}
          >
            <CommunityReportCharts mode='houses' rows={houseRows} />
          </ReportGroupCard>

          <ReportGroupCard
            title='การสำรวจชุมชนและบ้าน'
            onView={() => openViewGroup('surveys', 'การสำรวจชุมชนและบ้าน')}
            onExport={() => openExport('surveys')}
          >
            <CommunityReportCharts mode='surveys' rows={surveyRows} />
          </ReportGroupCard>

          <ReportGroupCard
            title='การประเมินสภาพแวดล้อมและสุขาภิบาล'
            onView={() => openViewGroup('assessment', 'การประเมินสภาพแวดล้อมและสุขาภิบาล')}
            onExport={() => openExport('assessment')}
          >
            <CommunityReportCharts mode='assessment' rows={assessmentRows} />
          </ReportGroupCard>

          <ReportGroupCard
            title='ข้อมูลศูนย์สุขภาพชุมชน'
            onView={() => openViewGroup('centers', 'ข้อมูลศูนย์สุขภาพชุมชน')}
            onExport={() => openExport('centers')}
          >
            <CommunityReportCharts mode='centers' rows={centerRows} />
          </ReportGroupCard>

          <ReportGroupCard
            title='ข้อมูล อสส.'
            onView={() => openViewGroup('volunteers', 'ข้อมูล อสส.')}
            onExport={() => openExport('volunteers')}
          >
            <CommunityReportCharts mode='volunteers' rows={volunteerRows} />
          </ReportGroupCard>

          <ReportGroupCard
            title='กิจกรรม'
            onView={() => openViewGroup('activities', 'กิจกรรม')}
            onExport={() => openExport('activities')}
          >
            <CommunityReportCharts mode='activities' rows={activityRows} />
          </ReportGroupCard>
        </div>
      </SmoothFilterResults>

      <ReportViewPopup
        open={!!viewBundle}
        bundle={viewBundle}
        onClose={() => setViewBundle(null)}
        onExportReport={(report) => { if (report) openExport(report); }}
      />

      <ExportFormatPopup
        open={!!exportReport}
        report={exportReport}
        reportsCatalog={reportsCatalog}
        topics={exportTopics}
        onClose={() => setExportReport(null)}
        onExported={() => setExported(true)}
        documentFooter={COMMUNITY_EXPORT_FOOTER}
        logExportFn={null}
        topicsFieldName='community-report-export-topics'
      />

      <SuccessToast open={exported} message='นำส่งออกรายงานแล้ว' onClose={() => setExported(false)} />
    </CommunityLayout>
  );
};

export default CommunityReportPage;
