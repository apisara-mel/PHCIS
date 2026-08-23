import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Icon from '@/components/icons/Icon';
import FilterDateTag from '@/components/forms/FilterDateTag';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import SuccessToast from '@/components/toast/SuccessToast';
import { DonutWithLegend, HBarList, VBars } from '@/components/graph/Charts';
import PHCIS_CHART, { PHCIS_CHART_PALETTE } from '@/data/phcisChartPalette';
import { ExportFormatPopup } from '@/pages/consent/consentExportPopup';
import {
  CARD, ChartPanel, ChartsRow, EmptyChartNote, ReportGroupCard, ReportToolbar,
  ReportViewPopup, StatTile, StatTileRow, buildExportReport,
  formatRangeLabel, rangeBoundsIso,
} from '@/pages/dashboard/dashboardReportKit';
import {
  SH_ACADEMIC_YEARS, CURRENT_ACADEMIC_YEAR, SH_CENTER, gradeLabel,
  formatShDate, formatShDateTime, todayIso, thNum, pct, SH_CURRENT_USER,
} from '@/data/schoolHealthCore';
import { schoolOptions, gradeOptionsForSchool, getSchoolById } from '@/data/schoolHealthSchools';
import { getReportDataset, summarizeBy, getDashboardData } from '@/data/schoolHealthServices';
import {
  NUTRITION_BANDS, nutritionBand, OFF_TARGET_BANDS, classifyAnemia,
  VISION_RESULTS, LICE_RESULTS, DEV_RESULTS, MENTAL_RESULTS, optionLabel,
} from '@/data/schoolHealthGrowthRef';

/* SchoolHealthReportsPage — ศูนย์รายงานงานอนามัยโรงเรียน (TOR §3.6.1–3.6.8)

   ยึด pattern mih-report-page: หน้าเดียวเลื่อนยาว · หนึ่งการ์ดขาวต่อหนึ่งกลุ่มรายงาน ·
   กราฟอยู่บนหน้า ตารางอยู่ใน "ดูรายงาน" · ส่งออกผ่าน ExportFormatPopup ที่ใช้ร่วมกัน
   ตัวเลขทั้งหมดคำนวณจาก mock data ชุดเดียวกับหน้าคิว/Dashboard เพื่อความสอดคล้อง */

const breadcrumb = ['ระบบบันทึกการรักษา', 'งานอนามัยโรงเรียน', 'รายงาน'];

const EXPORT_FOOTER =
  'ออกเอกสารโดยระบบงานอนามัยโรงเรียน ศูนย์บริการสาธารณสุข สำนักอนามัย กรุงเทพมหานคร (PHCIS)';

const EXPORT_GROUP_KEYS = {
  checkup: ['checkup-detail', 'checkup-summary'],
  nutrition: ['nutrition-detail', 'nutrition-summary'],
  vision: ['vision-detail'],
  vaccine: ['vaccine-detail', 'vaccine-coverage'],
  anemia: ['anemia-detail'],
  lice: ['lice-detail'],
  development: ['development-detail'],
  other: ['school-overview', 'mental-detail'],
};

const STUDENT_COLUMNS = [
  { key: 'date', label: 'วันที่', csv: (r) => r.date },
  { key: 'hn', label: 'HN' },
  { key: 'studentName', label: 'ชื่อ-นามสกุล' },
  { key: 'sex', label: 'เพศ' },
  { key: 'schoolName', label: 'โรงเรียน' },
  { key: 'gradeName', label: 'ชั้น' },
  { key: 'roomName', label: 'ห้อง' },
];

const SchoolHealthReportsPage = () => {
  const history = useHistory();
  const [dateFilter, setDateFilter] = useState({ quick: 'thisyear' });
  const [school, setSchool] = useState('all');
  const [grade, setGrade] = useState('all');
  const [academicYear, setAcademicYear] = useState(CURRENT_ACADEMIC_YEAR);
  const [viewBundle, setViewBundle] = useState(null);
  const [exportReport, setExportReport] = useState(null);
  const [exportScopeKeys, setExportScopeKeys] = useState(null);
  const [exported, setExported] = useState(false);

  const { from, to } = rangeBoundsIso(dateFilter);
  const rangeLabel = formatRangeLabel(from, to, dateFilter);

  const dataset = useMemo(
    () => getReportDataset({ schoolId: school, grade, dateFrom: from, dateTo: to }),
    [school, grade, from, to],
  );

  const dashboard = useMemo(
    () => getDashboardData({ schoolId: school, grade, roomId: 'all' }),
    [school, grade],
  );

  const filtersActive = (dateFilter?.quick || 'thisyear') !== 'thisyear'
    || school !== 'all' || grade !== 'all' || academicYear !== CURRENT_ACADEMIC_YEAR;
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(filtersActive, () => {
    setDateFilter({ quick: 'thisyear' });
    setSchool('all');
    setGrade('all');
    setAcademicYear(CURRENT_ACADEMIC_YEAR);
  });

  /* ── 3.6.1 สรุปผลการตรวจสุขภาพ ── */
  const checkups = dataset.checkups;
  const bySchoolCounts = summarizeBy(checkups, (r) => r.schoolName);
  const byGradeCounts = summarizeBy(checkups, (r) => r.gradeName);

  /* ── 3.6.2 ภาวะโภชนาการ ── */
  const nutritionCounts = summarizeBy(
    checkups.filter((r) => r.nutritionKey && r.nutritionKey !== 'out-of-range'),
    (r) => r.nutritionKey,
  );
  const offTarget = checkups.filter((r) => OFF_TARGET_BANDS.includes(r.nutritionKey));
  const nutritionSegments = NUTRITION_BANDS
    .map((b, i) => ({ label: b.label, value: nutritionCounts.get(b.key) || 0, color: PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length] }))
    .filter((s) => s.value > 0);

  /* ── 3.6.3 ปัญหาสายตา ── */
  const visionAbnormal = checkups.filter((r) => r.vision && r.vision !== 'normal');
  const visionCounts = summarizeBy(checkups, (r) => r.vision);
  const visionSegments = VISION_RESULTS
    .map((o, i) => ({ label: o.label, value: visionCounts.get(o.value) || 0, color: PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length] }))
    .filter((s) => s.value > 0);

  /* ── 3.6.4 บริการสร้างเสริมภูมิคุ้มกันโรค ── */
  const vaccineRows = dataset.vaccines.filter((r) => r.type === 'vaccineGive');
  const vaccineCounts = summarizeBy(vaccineRows, (r) => r.vaccineAbbr);
  const vaccineBars = [...vaccineCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, segments: [{ value, color: PHCIS_CHART.indigo, label: 'ครั้ง' }] }));
  const coverageRows = dashboard.bySchool.map((s) => ({
    id: s.id,
    schoolName: s.schoolName,
    total: s.total,
    vaccineCoverage: s.vaccineCoverage,
    served: s.served,
    coverage: s.coverage,
  }));

  /* ── 3.6.5 ผลตรวจภาวะซีด ── */
  const anemiaRows = checkups.filter((r) => r.hct);
  const anemiaCounts = summarizeBy(anemiaRows, (r) => r.anemiaKey || 'normal');
  const anemiaSegments = [
    { key: 'normal', label: 'ปกติ', color: PHCIS_CHART.teal },
    { key: 'anemic', label: 'ซีด', color: PHCIS_CHART.yellow },
    { key: 'severe', label: 'ซีดมาก', color: PHCIS_CHART.pink },
  ].map((s) => ({ label: s.label, value: anemiaCounts.get(s.key) || 0, color: s.color })).filter((s) => s.value > 0);

  /* ── 3.6.6 ผลตรวจเหา ── */
  const liceCounts = summarizeBy(checkups, (r) => r.lice);
  const liceSegments = LICE_RESULTS
    .map((o, i) => ({ label: o.label, value: liceCounts.get(o.value) || 0, color: PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length] }))
    .filter((s) => s.value > 0);
  const liceFound = checkups.filter((r) => r.lice && r.lice !== 'none');

  /* ── 3.6.7 คัดกรองพัฒนาการ ── */
  const devRows = dataset.development;
  const devCounts = summarizeBy(devRows, (r) => r.result);
  const devSegments = DEV_RESULTS
    .map((o, i) => ({ label: o.label, value: devCounts.get(o.value) || 0, color: PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length] }))
    .filter((s) => s.value > 0);

  /* ── 3.6.8 รายงาน/Dashboard อื่น ── */
  const mentalRows = dataset.mental;
  const mentalCounts = summarizeBy(mentalRows, (r) => r.result);
  const mentalSegments = MENTAL_RESULTS
    .map((o, i) => ({ label: o.label, value: mentalCounts.get(o.value) || 0, color: PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length] }))
    .filter((s) => s.value > 0);

  /* ── catalog สำหรับ ดูรายงาน + นำส่งออกรายงาน ── */

  const checkupDetailColumns = [
    ...STUDENT_COLUMNS,
    { key: 'weightKg', label: 'น้ำหนัก (กก.)' },
    { key: 'heightCm', label: 'ส่วนสูง (ซม.)' },
    { key: 'bmi', label: 'BMI' },
    { key: 'nutrition', label: 'แปลผลโภชนาการ', csv: (r) => (r.nutritionKey === 'out-of-range' ? 'เกณฑ์ไม่ครอบคลุม' : (nutritionBand(r.nutritionKey)?.label || '-')) },
    { key: 'visionLabel', label: 'ผลตรวจสายตา', csv: (r) => optionLabel(VISION_RESULTS, r.vision) },
    { key: 'liceLabel', label: 'ผลตรวจเหา', csv: (r) => optionLabel(LICE_RESULTS, r.lice) },
    { key: 'advice', label: 'คำแนะนำ' },
    { key: 'recordedBy', label: 'ผู้บันทึก' },
  ];

  const checkupSummaryRows = [...bySchoolCounts.entries()].map(([schoolName, count]) => {
    const scoped = checkups.filter((r) => r.schoolName === schoolName);
    return {
      id: schoolName,
      schoolName,
      count,
      offTarget: scoped.filter((r) => OFF_TARGET_BANDS.includes(r.nutritionKey)).length,
      vision: scoped.filter((r) => r.vision && r.vision !== 'normal').length,
      lice: scoped.filter((r) => r.lice && r.lice !== 'none').length,
      anemia: scoped.filter((r) => r.anemiaKey && r.anemiaKey !== 'normal').length,
    };
  });

  const reportsCatalog = useMemo(() => [
    buildExportReport('checkup-detail', 'รายงานสรุปผลการตรวจสุขภาพนักเรียน (รายบุคคล)', checkupDetailColumns, checkups, (r) => r.date),
    buildExportReport('checkup-summary', 'รายงานสรุปผลการตรวจสุขภาพรายโรงเรียน', [
      { key: 'schoolName', label: 'โรงเรียน' },
      { key: 'count', label: 'จำนวนที่ตรวจ (ครั้ง)' },
      { key: 'offTarget', label: 'น้ำหนักไม่ตรงเกณฑ์ (ราย)' },
      { key: 'vision', label: 'สายตาผิดปกติ (ราย)' },
      { key: 'lice', label: 'พบเหา (ราย)' },
      { key: 'anemia', label: 'ภาวะซีด (ราย)' },
    ], checkupSummaryRows),
    buildExportReport('nutrition-detail', 'รายงานเด็กน้ำหนักไม่ตรงเกณฑ์ (ภาวะโภชนาการ)', [
      ...STUDENT_COLUMNS,
      { key: 'weightKg', label: 'น้ำหนัก (กก.)' },
      { key: 'heightCm', label: 'ส่วนสูง (ซม.)' },
      { key: 'bmi', label: 'BMI' },
      { key: 'nutrition', label: 'แปลผล', csv: (r) => (nutritionBand(r.nutritionKey)?.label || '-') },
      { key: 'obesityPlan', label: 'แผนคัดกรองภาวะอ้วน' },
    ], offTarget, (r) => r.date),
    buildExportReport('nutrition-summary', 'รายงานสรุปภาวะโภชนาการตามแถบเกณฑ์', [
      { key: 'band', label: 'แถบภาวะโภชนาการ' },
      { key: 'count', label: 'จำนวน (ราย)' },
      { key: 'percent', label: 'สัดส่วน (%)' },
    ], NUTRITION_BANDS.map((b) => ({
      id: b.key,
      band: b.label,
      count: nutritionCounts.get(b.key) || 0,
      percent: pct(nutritionCounts.get(b.key) || 0, checkups.length),
    }))),
    buildExportReport('vision-detail', 'รายงานปัญหาสายตาของนักเรียน', [
      ...STUDENT_COLUMNS,
      { key: 'visionLabel', label: 'ผลตรวจสายตา', csv: (r) => optionLabel(VISION_RESULTS, r.vision) },
      { key: 'visionNote', label: 'รายละเอียด' },
      { key: 'recordedBy', label: 'ผู้บันทึก' },
    ], visionAbnormal, (r) => r.date),
    buildExportReport('vaccine-detail', 'รายงานบริการสร้างเสริมภูมิคุ้มกันโรค (รายเข็ม)', [
      ...STUDENT_COLUMNS,
      { key: 'vaccineAbbr', label: 'วัคซีน' },
      { key: 'vaccineName', label: 'ชื่อวัคซีน' },
      { key: 'lotNo', label: 'Lot No.' },
      { key: 'channel', label: 'ช่องทางบันทึก', csv: (r) => (r.batch ? 'Batch รายห้อง' : 'รายบุคคล') },
      { key: 'recordedBy', label: 'ผู้บันทึก' },
    ], vaccineRows, (r) => r.date),
    buildExportReport('vaccine-coverage', 'รายงานความครอบคลุมวัคซีนรายโรงเรียน', [
      { key: 'schoolName', label: 'โรงเรียน' },
      { key: 'total', label: 'นักเรียน (คน)' },
      { key: 'vaccineCoverage', label: 'วัคซีนครบตามชั้น (%)' },
      { key: 'served', label: 'ตรวจสุขภาพแล้ว (คน)' },
      { key: 'coverage', label: 'ความครอบคลุมการตรวจ (%)' },
    ], coverageRows),
    buildExportReport('anemia-detail', 'รายงานผลตรวจภาวะซีด (ป.3 และ ม.2 นักเรียนหญิง)', [
      ...STUDENT_COLUMNS,
      { key: 'hct', label: 'Hct (%)' },
      { key: 'anemiaLabel', label: 'แปลผล', csv: (r) => (classifyAnemia(r.hct, 12)?.label || '-') },
      { key: 'advised', label: 'ให้คำแนะนำแล้ว', csv: (r) => (r.anemiaAdvised ? 'ใช่' : 'ยังไม่ได้ระบุ') },
      { key: 'recordedBy', label: 'ผู้บันทึก' },
    ], anemiaRows, (r) => r.date),
    buildExportReport('lice-detail', 'รายงานผลตรวจเหา', [
      ...STUDENT_COLUMNS,
      { key: 'liceLabel', label: 'ผลตรวจเหา', csv: (r) => optionLabel(LICE_RESULTS, r.lice) },
      { key: 'advice', label: 'คำแนะนำ' },
      { key: 'recordedBy', label: 'ผู้บันทึก' },
    ], liceFound, (r) => r.date),
    buildExportReport('development-detail', 'รายงานผลคัดกรองพัฒนาการ', [
      ...STUDENT_COLUMNS,
      { key: 'tool', label: 'เครื่องมือที่ใช้' },
      { key: 'resultLabel', label: 'ผลการประเมิน', csv: (r) => optionLabel(DEV_RESULTS, r.result) },
      { key: 'note', label: 'แนวทางการดูแล' },
      { key: 'recordedBy', label: 'ผู้บันทึก' },
    ], devRows, (r) => r.date),
    buildExportReport('school-overview', 'รายงานภาพรวมสุขภาพนักเรียนรายโรงเรียน (Dashboard)', [
      { key: 'schoolName', label: 'โรงเรียน' },
      { key: 'total', label: 'นักเรียน (คน)' },
      { key: 'served', label: 'ตรวจแล้ว (คน)' },
      { key: 'coverage', label: 'ความครอบคลุม (%)' },
      { key: 'passed', label: 'ผ่านเกณฑ์ (คน)' },
      { key: 'failed', label: 'ไม่ผ่านเกณฑ์ (คน)' },
      { key: 'offTarget', label: 'โภชนาการไม่ตรงเกณฑ์ (คน)' },
      { key: 'visionAbn', label: 'สายตาผิดปกติ (คน)' },
      { key: 'anemic', label: 'ภาวะซีด (คน)' },
      { key: 'liceFound', label: 'พบเหา (คน)' },
      { key: 'devDelay', label: 'พัฒนาการต้องติดตาม (คน)' },
    ], dashboard.bySchool),
    buildExportReport('mental-detail', 'รายงานผลคัดกรองสุขภาพจิตนักเรียน', [
      ...STUDENT_COLUMNS,
      { key: 'tool', label: 'แบบประเมิน' },
      { key: 'score', label: 'คะแนนรวม' },
      { key: 'resultLabel', label: 'ผลการประเมิน', csv: (r) => optionLabel(MENTAL_RESULTS, r.result) },
      { key: 'recordedBy', label: 'ผู้บันทึก' },
    ], mentalRows, (r) => r.date),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [dataset, dashboard, checkups, offTarget, visionAbnormal, vaccineRows, anemiaRows, liceFound, devRows, mentalRows]);

  const exportTopics = useMemo(
    () => reportsCatalog.map((r) => ({ value: r.key, label: r.title })),
    [reportsCatalog],
  );

  const openExport = (keyOrReport, scopeKeys = null) => {
    setExportScopeKeys(scopeKeys);
    if (keyOrReport === 'all' || keyOrReport?.key === 'all') {
      setExportReport({ key: 'all', title: keyOrReport?.title || 'รายงานงานอนามัยโรงเรียนทั้งหมด' });
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

  const scopeLabel = `${school === 'all' ? 'ทุกโรงเรียน' : (getSchoolById(school)?.name || '—')} · ${grade === 'all' ? 'ทุกชั้น' : gradeLabel(grade)} · ปีการศึกษา ${academicYear} · ${rangeLabel}`;

  const summaryCards = useMemo(() => ([
    { key: 'checkup', label: 'ผลตรวจสุขภาพในช่วงที่เลือก', value: thNum(checkups.length), color: 'info', icon: 'stethoscope' },
    { key: 'offTarget', label: 'น้ำหนักไม่ตรงเกณฑ์', value: thNum(offTarget.length), color: 'warning', icon: 'monitor_weight' },
    { key: 'vision', label: 'สายตาผิดปกติ', value: thNum(visionAbnormal.length), color: 'warning', icon: 'visibility' },
    { key: 'vaccine', label: 'เข็มวัคซีนที่ให้บริการ', value: thNum(vaccineRows.length), color: 'positive', icon: 'vaccines' },
    { key: 'anemia', label: 'ผลคัดกรองซีดผิดปกติ', value: thNum(anemiaRows.filter((r) => r.anemiaKey && r.anemiaKey !== 'normal').length), color: 'warning', icon: 'water_drop' },
  ]), [checkups, offTarget, visionAbnormal, vaccineRows, anemiaRows]);

  return (
    <QueuePageShell
      activeKey='school-health'
      breadcrumb={breadcrumb}
      title='รายงานงานอนามัยโรงเรียน'
      summaryCards={summaryCards}
      onBack={() => history.push('/clinic/school-health')}
      backLabel='กลับหน้าคิว'
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <NeutralSubdueButton size='sm' leadingIcon='monitoring' onClick={() => history.push('/clinic/school-health/dashboard')}>
            Dashboard
          </NeutralSubdueButton>
          <NeutralSubdueButton size='sm' leadingIcon='print' onClick={() => { if (typeof window !== 'undefined') window.print(); }}>
            พิมพ์หน้านี้
          </NeutralSubdueButton>
          <BrandSubdueButton variant='fill' size='sm' leadingIcon='ios_share' onClick={() => openExport('all')}>
            นำส่งออกรายงานทั้งหมด
          </BrandSubdueButton>
        </div>
      )}
    >
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600, 24px)',
          paddingRight: 'var(--dim-space-600, 24px)',
          paddingBottom: 'var(--dim-space-600, 24px)',
          paddingLeft: 'var(--dim-space-600, 24px)',
          gap: 'var(--dim-space-600, 24px)',
        }}
      >
        <ReportToolbar
          trailing={(
            <NeutralSubdueButton leadingIcon='ios_share' size='md' onClick={() => openExport('all')}>
              นำส่งออกรายงานทั้งหมด
            </NeutralSubdueButton>
          )}
        >
          <FilterDateTag prefix='ช่วงเวลา:' value={dateFilter} onChange={setDateFilter} defaultQuick='thisyear' showResolvedDate />
          <FilterDropdown prefix='โรงเรียน:' options={schoolOptions()} value={school} onChange={(v) => { setSchool(v); setGrade('all'); }} />
          <FilterDropdown prefix='ชั้น:' options={gradeOptionsForSchool(school === 'all' ? null : school)} value={grade} onChange={setGrade} />
          <FilterDropdown prefix='ปีการศึกษา:' options={SH_ACADEMIC_YEARS} value={academicYear} onChange={setAcademicYear} />
          <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
        </ReportToolbar>

        <section className='w-full flex items-center flex-wrap' style={{ ...CARD, gap: 'var(--dim-space-300, 12px)' }}>
          <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}><Icon name='info' size={16} /></span>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
            {`ขอบเขต: ${scopeLabel}`}
          </span>
          <div className='flex-1' />
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {`${SH_CENTER.name} · ผู้ออกรายงาน ${SH_CURRENT_USER.name} · พิมพ์เมื่อ ${formatShDateTime(new Date().toISOString())}`}
          </span>
        </section>

        <SmoothFilterResults opaque={resultsOpaque}>
          {/* ── 3.6.1 ── */}
          <ReportGroupCard
            title='สรุปผลการตรวจสุขภาพนักเรียน (TOR 3.6.1)'
            onView={() => openViewGroup('checkup', 'สรุปผลการตรวจสุขภาพนักเรียน')}
            onExport={() => openExportGroup('checkup', 'รายงานสรุปผลการตรวจสุขภาพ')}
          >
            <StatTileRow>
              <StatTile label='ผลตรวจทั้งหมด' value={thNum(checkups.length)} unit='ครั้ง' />
              <StatTile label='โรงเรียนที่มีผลตรวจ' value={thNum(bySchoolCounts.size)} unit='แห่ง' />
              <StatTile label='ชั้นเรียนที่มีผลตรวจ' value={thNum(byGradeCounts.size)} unit='ชั้น' />
              <StatTile label='ผ่านเกณฑ์รวม' value={`${pct(dashboard.passed, dashboard.total)}%`} tone={pct(dashboard.passed, dashboard.total) >= 80 ? undefined : 'warning'} />
            </StatTileRow>
            <ChartsRow>
              <ChartPanel title='จำนวนการตรวจตามโรงเรียน' alignContent='start'>
                {bySchoolCounts.size ? (
                  <div className='w-full'>
                    <HBarList
                      valueLabel='ครั้ง'
                      rows={[...bySchoolCounts.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({
                        label, value, segments: [{ value, color: PHCIS_CHART.teal, label: 'ครั้ง' }],
                      }))}
                    />
                  </div>
                ) : <EmptyChartNote />}
              </ChartPanel>
              <ChartPanel title='จำนวนการตรวจตามชั้นเรียน'>
                {byGradeCounts.size ? (
                  <div className='w-full' style={{ paddingTop: 'var(--dim-space-200, 8px)' }}>
                    <VBars
                      months={[...byGradeCounts.keys()]}
                      series={[{ label: 'ครั้ง', color: PHCIS_CHART.indigo, values: [...byGradeCounts.values()] }]}
                      height={200}
                      barMaxWidth={byGradeCounts.size <= 6 ? 28 : 14}
                    />
                  </div>
                ) : <EmptyChartNote />}
              </ChartPanel>
              <ChartPanel title='สัดส่วนผ่าน/ไม่ผ่านเกณฑ์'>
                {dashboard.total ? (
                  <DonutWithLegend
                    segments={[
                      { label: 'ผ่านเกณฑ์', value: dashboard.passed, color: PHCIS_CHART.teal },
                      { label: 'ไม่ผ่านเกณฑ์', value: dashboard.failed, color: PHCIS_CHART.pink },
                      { label: 'ยังไม่ได้รับบริการ', value: dashboard.notServed, color: PHCIS_CHART.yellow },
                    ].filter((s) => s.value > 0)}
                    size={180}
                    centerLabel={`${pct(dashboard.passed, dashboard.total)}%`}
                    centerSub='ผ่านเกณฑ์'
                  />
                ) : <EmptyChartNote />}
              </ChartPanel>
            </ChartsRow>
          </ReportGroupCard>

          {/* ── 3.6.2 ── */}
          <ReportGroupCard
            title='เด็กน้ำหนักไม่ตรงเกณฑ์ / ภาวะโภชนาการ (TOR 3.6.2)'
            onView={() => openViewGroup('nutrition', 'ภาวะโภชนาการนักเรียน')}
            onExport={() => openExportGroup('nutrition', 'รายงานภาวะโภชนาการ')}
          >
            <StatTileRow>
              <StatTile label='แปลผลโภชนาการแล้ว' value={thNum(checkups.filter((r) => r.nutritionKey && r.nutritionKey !== 'out-of-range').length)} unit='ครั้ง' />
              <StatTile label='น้ำหนักไม่ตรงเกณฑ์' value={thNum(offTarget.length)} unit='ราย' tone='warning' />
              <StatTile label='เริ่มอ้วน / อ้วน' value={thNum(checkups.filter((r) => ['over', 'obese'].includes(r.nutritionKey)).length)} unit='ราย' tone='danger' />
              <StatTile label='ผอม / ค่อนข้างผอม' value={thNum(checkups.filter((r) => ['thin', 'riskThin'].includes(r.nutritionKey)).length)} unit='ราย' tone='warning' />
            </StatTileRow>
            <ChartsRow>
              <ChartPanel title='สัดส่วนแถบภาวะโภชนาการ'>
                {nutritionSegments.length ? (
                  <DonutWithLegend
                    segments={nutritionSegments}
                    size={180}
                    centerLabel={thNum(nutritionSegments.reduce((s, x) => s + x.value, 0))}
                    centerSub='ครั้งที่แปลผล'
                  />
                ) : <EmptyChartNote />}
              </ChartPanel>
              <ChartPanel title='น้ำหนักไม่ตรงเกณฑ์ตามโรงเรียน' alignContent='start'>
                {offTarget.length ? (
                  <div className='w-full'>
                    <HBarList
                      valueLabel='ราย'
                      rows={[...summarizeBy(offTarget, (r) => r.schoolName).entries()]
                        .sort((a, b) => b[1] - a[1])
                        .map(([label, value]) => ({ label, value, segments: [{ value, color: PHCIS_CHART.pink, label: 'ราย' }] }))}
                    />
                  </div>
                ) : <EmptyChartNote text='ไม่พบเด็กน้ำหนักไม่ตรงเกณฑ์ในช่วงที่เลือก' hint='ผลทุกรายอยู่ในเกณฑ์สมส่วน' icon='check_circle' />}
              </ChartPanel>
            </ChartsRow>
          </ReportGroupCard>

          {/* ── 3.6.3 ── */}
          <ReportGroupCard
            title='ปัญหาสายตาของนักเรียน (TOR 3.6.3)'
            onView={() => openViewGroup('vision', 'ปัญหาสายตาของนักเรียน')}
            onExport={() => openExportGroup('vision', 'รายงานปัญหาสายตา')}
          >
            <StatTileRow columns={3}>
              <StatTile label='ตรวจสายตาแล้ว' value={thNum(checkups.length)} unit='ครั้ง' />
              <StatTile label='พบความผิดปกติ' value={thNum(visionAbnormal.length)} unit='ราย' tone='warning' />
              <StatTile label='สัดส่วนผิดปกติ' value={`${pct(visionAbnormal.length, checkups.length)}%`} tone='warning' />
            </StatTileRow>
            <ChartsRow>
              <ChartPanel title='สัดส่วนผลตรวจสายตา'>
                {visionSegments.length ? (
                  <DonutWithLegend segments={visionSegments} size={180} centerLabel={`${pct(visionAbnormal.length, checkups.length)}%`} centerSub='ผิดปกติ' />
                ) : <EmptyChartNote />}
              </ChartPanel>
              <ChartPanel title='สายตาผิดปกติตามชั้นเรียน' alignContent='start'>
                {visionAbnormal.length ? (
                  <div className='w-full'>
                    <HBarList
                      valueLabel='ราย'
                      rows={[...summarizeBy(visionAbnormal, (r) => r.gradeName).entries()]
                        .sort((a, b) => b[1] - a[1])
                        .map(([label, value]) => ({ label, value, segments: [{ value, color: PHCIS_CHART.yellow, label: 'ราย' }] }))}
                    />
                  </div>
                ) : <EmptyChartNote text='ไม่พบปัญหาสายตาในช่วงที่เลือก' hint='ผลทุกรายอยู่ในเกณฑ์ปกติ' icon='check_circle' />}
              </ChartPanel>
            </ChartsRow>
          </ReportGroupCard>

          {/* ── 3.6.4 ── */}
          <ReportGroupCard
            title='บริการสร้างเสริมภูมิคุ้มกันโรค (TOR 3.6.4)'
            onView={() => openViewGroup('vaccine', 'บริการสร้างเสริมภูมิคุ้มกันโรค')}
            onExport={() => openExportGroup('vaccine', 'รายงานบริการสร้างเสริมภูมิคุ้มกันโรค')}
          >
            <StatTileRow>
              <StatTile label='เข็มที่ให้บริการ' value={thNum(vaccineRows.length)} unit='เข็ม' />
              <StatTile label='ชนิดวัคซีนที่ใช้' value={thNum(vaccineCounts.size)} unit='ชนิด' />
              <StatTile label='บันทึกผ่าน Batch รายห้อง' value={thNum(vaccineRows.filter((r) => r.batch).length)} unit='เข็ม' />
              <StatTile
                label='ความครอบคลุมวัคซีนเฉลี่ย'
                value={`${coverageRows.length ? Math.round(coverageRows.reduce((s, r) => s + r.vaccineCoverage, 0) / coverageRows.length) : 0}%`}
              />
            </StatTileRow>
            <ChartsRow>
              <ChartPanel title='จำนวนเข็มตามชนิดวัคซีน' alignContent='start'>
                {vaccineBars.length ? (
                  <div className='w-full'><HBarList valueLabel='เข็ม' rows={vaccineBars} /></div>
                ) : <EmptyChartNote text='ยังไม่มีการให้บริการวัคซีนในช่วงที่เลือก' hint='บันทึกจากหน้า Batch entry หรือหน้าข้อมูลนักเรียน' />}
              </ChartPanel>
              <ChartPanel title='ความครอบคลุมวัคซีนรายโรงเรียน'>
                {coverageRows.length ? (
                  <div className='w-full' style={{ paddingTop: 'var(--dim-space-200, 8px)' }}>
                    <VBars
                      months={coverageRows.map((r) => r.schoolName)}
                      series={[{ label: 'วัคซีนครบตามชั้น (%)', color: PHCIS_CHART.teal, values: coverageRows.map((r) => r.vaccineCoverage) }]}
                      height={200}
                      barMaxWidth={coverageRows.length <= 5 ? 28 : 14}
                    />
                  </div>
                ) : <EmptyChartNote />}
              </ChartPanel>
            </ChartsRow>
          </ReportGroupCard>

          {/* ── 3.6.5 ── */}
          <ReportGroupCard
            title='ผลตรวจภาวะซีด (TOR 3.6.5)'
            subtitle='คัดกรองเฉพาะนักเรียนหญิงชั้น ป.3 และ ม.2 ตามมติ คทง.5'
            onView={() => openViewGroup('anemia', 'ผลตรวจภาวะซีด')}
            onExport={() => openExportGroup('anemia', 'รายงานผลตรวจภาวะซีด')}
          >
            <StatTileRow columns={3}>
              <StatTile label='คัดกรองแล้ว' value={thNum(anemiaRows.length)} unit='ราย' />
              <StatTile label='ผลผิดปกติ (ซีด/ซีดมาก)' value={thNum(anemiaRows.filter((r) => r.anemiaKey && r.anemiaKey !== 'normal').length)} unit='ราย' tone='danger' />
              <StatTile label='ให้คำแนะนำแล้ว' value={thNum(anemiaRows.filter((r) => r.anemiaAdvised).length)} unit='ราย' />
            </StatTileRow>
            <ChartsRow>
              <ChartPanel title='สัดส่วนผลคัดกรองภาวะซีด'>
                {anemiaSegments.length ? (
                  <DonutWithLegend
                    segments={anemiaSegments}
                    size={180}
                    centerLabel={thNum(anemiaRows.length)}
                    centerSub='รายที่คัดกรอง'
                  />
                ) : <EmptyChartNote text='ยังไม่มีผลคัดกรองภาวะซีดในช่วงที่เลือก' hint='คัดกรองเฉพาะนักเรียนหญิง ป.3 และ ม.2' />}
              </ChartPanel>
              <ChartPanel title='ภาวะซีดตามโรงเรียน' alignContent='start'>
                {anemiaRows.length ? (
                  <div className='w-full'>
                    <HBarList
                      valueLabel='ราย'
                      rows={[...summarizeBy(anemiaRows.filter((r) => r.anemiaKey && r.anemiaKey !== 'normal'), (r) => r.schoolName).entries()]
                        .sort((a, b) => b[1] - a[1])
                        .map(([label, value]) => ({ label, value, segments: [{ value, color: PHCIS_CHART.pink, label: 'ราย' }] }))}
                    />
                  </div>
                ) : <EmptyChartNote />}
              </ChartPanel>
            </ChartsRow>
          </ReportGroupCard>

          {/* ── 3.6.6 ── */}
          <ReportGroupCard
            title='ผลตรวจเหา (TOR 3.6.6)'
            onView={() => openViewGroup('lice', 'ผลตรวจเหา')}
            onExport={() => openExportGroup('lice', 'รายงานผลตรวจเหา')}
          >
            <StatTileRow columns={3}>
              <StatTile label='ตรวจเหาแล้ว' value={thNum(checkups.length)} unit='ครั้ง' />
              <StatTile label='พบเหา/ไข่เหา' value={thNum(liceFound.length)} unit='ราย' tone='warning' />
              <StatTile label='สัดส่วนที่พบ' value={`${pct(liceFound.length, checkups.length)}%`} tone='warning' />
            </StatTileRow>
            <ChartsRow>
              <ChartPanel title='สัดส่วนผลตรวจเหา'>
                {liceSegments.length ? (
                  <DonutWithLegend segments={liceSegments} size={180} centerLabel={`${pct(liceFound.length, checkups.length)}%`} centerSub='พบเหา' />
                ) : <EmptyChartNote />}
              </ChartPanel>
              <ChartPanel title='พบเหาตามห้องเรียน' alignContent='start'>
                {liceFound.length ? (
                  <div className='w-full'>
                    <HBarList
                      valueLabel='ราย'
                      rows={[...summarizeBy(liceFound, (r) => `${r.schoolName} ${r.roomName}`).entries()]
                        .sort((a, b) => b[1] - a[1])
                        .map(([label, value]) => ({ label, value, segments: [{ value, color: PHCIS_CHART.yellow, label: 'ราย' }] }))}
                    />
                  </div>
                ) : <EmptyChartNote text='ไม่พบเหาในช่วงที่เลือก' hint='ผลทุกรายอยู่ในเกณฑ์ปกติ' icon='check_circle' />}
              </ChartPanel>
            </ChartsRow>
          </ReportGroupCard>

          {/* ── 3.6.7 ── */}
          <ReportGroupCard
            title='คัดกรองพัฒนาการ (TOR 3.6.7)'
            onView={() => openViewGroup('development', 'ผลคัดกรองพัฒนาการ')}
            onExport={() => openExportGroup('development', 'รายงานผลคัดกรองพัฒนาการ')}
          >
            <StatTileRow columns={3}>
              <StatTile label='ประเมินแล้ว' value={thNum(devRows.length)} unit='ราย' />
              <StatTile label='ต้องเฝ้าระวัง/สงสัยล่าช้า' value={thNum(devRows.filter((r) => r.result !== 'normal').length)} unit='ราย' tone='warning' />
              <StatTile label='สมวัย' value={`${pct(devCounts.get('normal') || 0, devRows.length)}%`} />
            </StatTileRow>
            <ChartsRow>
              <ChartPanel title='สัดส่วนผลคัดกรองพัฒนาการ'>
                {devSegments.length ? (
                  <DonutWithLegend segments={devSegments} size={180} centerLabel={thNum(devRows.length)} centerSub='รายที่ประเมิน' />
                ) : <EmptyChartNote text='ยังไม่มีผลคัดกรองพัฒนาการในช่วงที่เลือก' hint='บันทึกจากแท็บ "ประเมินพัฒนาการ" ในหน้าข้อมูลนักเรียน' />}
              </ChartPanel>
              <ChartPanel title='ผลที่ต้องติดตามตามโรงเรียน' alignContent='start'>
                {devRows.filter((r) => r.result !== 'normal').length ? (
                  <div className='w-full'>
                    <HBarList
                      valueLabel='ราย'
                      rows={[...summarizeBy(devRows.filter((r) => r.result !== 'normal'), (r) => r.schoolName).entries()]
                        .sort((a, b) => b[1] - a[1])
                        .map(([label, value]) => ({ label, value, segments: [{ value, color: PHCIS_CHART.indigo, label: 'ราย' }] }))}
                    />
                  </div>
                ) : <EmptyChartNote text='ไม่มีผลที่ต้องติดตาม' hint='ทุกรายประเมินแล้วสมวัย' icon='check_circle' />}
              </ChartPanel>
            </ChartsRow>
          </ReportGroupCard>

          {/* ── 3.6.8 ── */}
          <ReportGroupCard
            title='รายงาน / Dashboard อื่นตามที่สำนักอนามัยกำหนด (TOR 3.6.8)'
            subtitle='ภาพรวมสุขภาพนักเรียนรายโรงเรียน และผลคัดกรองสุขภาพจิต (ข้อมูลอ่อนไหวถูกปิดบังชื่อในรายงานกลุ่ม)'
            onView={() => openViewGroup('other', 'รายงานภาพรวมและสุขภาพจิต')}
            onExport={() => openExportGroup('other', 'รายงานภาพรวมและสุขภาพจิต')}
          >
            <StatTileRow>
              <StatTile label='โรงเรียนในความดูแล' value={thNum(dashboard.bySchool.length)} unit='แห่ง' />
              <StatTile label='นักเรียนทั้งหมด' value={thNum(dashboard.total)} unit='คน' />
              <StatTile label='คัดกรองสุขภาพจิตแล้ว' value={thNum(mentalRows.length)} unit='ราย' />
              <StatTile label='สุขภาพจิตมีความเสี่ยง/มีปัญหา' value={thNum(mentalRows.filter((r) => r.result !== 'normal').length)} unit='ราย' tone='danger' />
            </StatTileRow>
            <ChartsRow>
              <ChartPanel title='ผ่าน/ไม่ผ่านเกณฑ์รายโรงเรียน'>
                {dashboard.bySchool.length ? (
                  <div className='w-full' style={{ paddingTop: 'var(--dim-space-200, 8px)' }}>
                    <VBars
                      months={dashboard.bySchool.map((s) => s.schoolName)}
                      series={[
                        { label: 'ผ่านเกณฑ์', color: PHCIS_CHART.teal, values: dashboard.bySchool.map((s) => s.passed) },
                        { label: 'ไม่ผ่านเกณฑ์', color: PHCIS_CHART.pink, values: dashboard.bySchool.map((s) => s.failed) },
                      ]}
                      height={200}
                      stacked
                      barMaxWidth={dashboard.bySchool.length <= 5 ? 24 : 12}
                    />
                  </div>
                ) : <EmptyChartNote />}
              </ChartPanel>
              <ChartPanel title='สัดส่วนผลคัดกรองสุขภาพจิต'>
                {mentalSegments.length ? (
                  <DonutWithLegend segments={mentalSegments} size={180} centerLabel={thNum(mentalRows.length)} centerSub='รายที่คัดกรอง' />
                ) : <EmptyChartNote text='ยังไม่มีผลคัดกรองสุขภาพจิตในช่วงที่เลือก' hint='คัดกรองนักเรียนตั้งแต่ชั้น ป.6 ขึ้นไป' />}
              </ChartPanel>
            </ChartsRow>
          </ReportGroupCard>
        </SmoothFilterResults>

        <section className='w-full flex items-center flex-wrap' style={{ ...CARD, gap: 'var(--dim-space-300, 12px)' }}>
          <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}><Icon name='info' size={14} /></span>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {`รายงานทุกฉบับระบุผู้ออกรายงาน (${SH_CURRENT_USER.name}) และเวลาที่พิมพ์ · ชื่อนักเรียนในรายงานกลุ่มถูกปิดบังตามข้อกำหนดข้อมูลลับ §1.4.2 · ข้อมูล ณ ${formatShDate(todayIso())}`}
          </span>
        </section>
      </div>

      <ReportViewPopup
        open={!!viewBundle}
        bundle={viewBundle}
        onClose={() => setViewBundle(null)}
        onExportReport={(report) => { if (report) openExport(report); }}
        footnote='ตัวเลขคำนวณจากผลตรวจที่บันทึกในระบบและยังไม่ถูกยกเลิก — รายการที่ยกเลิกแล้วไม่ถูกนับ'
      />

      <ExportFormatPopup
        open={!!exportReport}
        report={exportReport}
        reportsCatalog={scopedCatalog}
        topics={scopedTopics}
        onClose={() => { setExportReport(null); setExportScopeKeys(null); }}
        onExported={() => setExported(true)}
        documentFooter={EXPORT_FOOTER}
        logExportFn={null}
        topicsFieldName='school-health-export-topics'
      />

      <SuccessToast open={exported} message='นำส่งออกรายงานงานอนามัยโรงเรียนแล้ว' onClose={() => setExported(false)} />
    </QueuePageShell>
  );
};

export default SchoolHealthReportsPage;
