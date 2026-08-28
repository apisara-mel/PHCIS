import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Icon from '@/components/icons/Icon';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import SuccessToast from '@/components/toast/SuccessToast';
import { DonutWithLegend, HBarList, VBars } from '@/components/graph/Charts';
import PHCIS_CHART, { PHCIS_CHART_PALETTE } from '@/data/phcisChartPalette';
import { ExportFormatPopup } from '@/pages/consent/consentExportPopup';
import { sanitizeExportReportMeta } from '@/utils/exportPiiSanitize';
import {
  CARD, ChartPanel, ChartsRow, EmptyChartNote, ReportGroupCard,
  ReportViewPopup, StatTile, StatTileRow, buildExportReport,
} from '@/pages/dashboard/dashboardReportKit';
import { SwField, SwBanner, toLocalIso } from '@/pages/clinic/social-work/SocialWorkShared';
import {
  SW_CURRENT_USER, SW_HOME_CENTER, SW_FISCAL_YEARS, CURRENT_SW_FISCAL_YEAR,
  SW_CHILD_RISK_LEVELS, SW_VIOLENCE_LEVELS,
  formatSwDate, formatSwDateTime, formatCid, resolveSwWelfareCard,
  resolveSwDisabilityType, resolveSwDisabilityCard,
} from '@/data/socialWorkClinic';
import {
  SW_REPORT_ROLES, SW_RANGE_MODES, SW_REPORT_TARGET_OPTIONS,
  getSwReportViewer, setSwReportViewer, swPiiHidden, sanitizeSwRows, anonCode,
  resolveSwRange, validateSwRange,
  swIntakeRegisterRows, swServiceVisitRows, swReferralRows, swActivityRows,
  swWorkloadRows, swChildRiskRows, swViolenceRows, swDisabilityRows, swElderlyRows,
  swSupplyIssueRows, swNutritionRows, swProblemSituation, swReportSummary,
} from '@/data/socialWorkReporting';
import { SW_NUTRI_GROUPS } from '@/data/socialWorkNutrition';

/* SocialWorkReportsPage — เมนูที่ 4 "รายงานที่เกี่ยวข้องทางสังคมสงเคราะห์"
   (TOR §1.10.11.5 · มติ คทง.10 ครั้งที่ 4–5 — รายงาน 12 ฉบับ).

   ยึด pattern mih-report-page: หน้าเดียวเลื่อนยาว · หนึ่งการ์ดขาวต่อหนึ่งกลุ่ม
   รายงาน · กราฟอยู่บนหน้า ตารางอยู่ใน "ดูรายงาน" · ส่งออกผ่าน ExportFormatPopup
   ที่ใช้ร่วมกันทั้งระบบ.

   ตัวกรองช่วงเวลาตามแบบฟอร์มรายงาน: ช่วงวันที่ · รายเดือน · ช่วงเดือน ·
   ปีงบประมาณไทย (ต.ค.–ก.ย.) — from > to แจ้ง validation ก่อนคำนวณ.

   PDPA 3 ระดับ: ระดับ ศบส. เห็น PII · ระดับสำนักงาน(กอง) และผู้บริหารไม่เห็น PII
   drill-down ใช้รหัสนิรนามเท่านั้น และไฟล์ export ถูก sanitize ซ้ำอีกชั้นด้วย
   sanitizeExportReportMeta ก่อนส่งเข้า ExportFormatPopup. */

const breadcrumb = ['บันทึกการรักษา', 'งานสังคมสงเคราะห์', 'รายงาน'];

const EXPORT_FOOTER =
  'ออกเอกสารโดยงานสังคมสงเคราะห์ ศูนย์บริการสาธารณสุข สำนักอนามัย กรุงเทพมหานคร (PHCIS)';

const thNum = (n) => Number(n || 0).toLocaleString('th-TH');

const TH_MONTH_OPTIONS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
].map((label, i) => ({ value: String(i + 1), label }));

const EXPORT_GROUPS = {
  core: ['ss1-register', 'ss2-visits'],
  outreach: ['ss3-referral', 'ss4-activity'],
  workload: ['ss5-workload'],
  screening: ['scr-child', 'scr-violence', 'scr-disability', 'scr-elderly'],
  material: ['sup-issue', 'nut-help'],
  situation: ['sit-problem'],
};

const countBy = (rows, keyFn) => {
  const map = new Map();
  (rows || []).forEach((r) => {
    const k = keyFn(r);
    if (k == null || k === '') return;
    map.set(k, (map.get(k) || 0) + 1);
  });
  return map;
};

const SocialWorkReportsPage = () => {
  const history = useHistory();

  const [viewerTick, setViewerTick] = useState(0);
  const [range, setRange] = useState({
    mode: 'fiscal',
    fiscalYear: CURRENT_SW_FISCAL_YEAR,
    from: '',
    to: '',
    month: String(new Date().getMonth() + 1),
    monthFrom: '1',
    monthTo: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear() + 543),
  });
  const [targetFilter, setTargetFilter] = useState('all');
  const [viewBundle, setViewBundle] = useState(null);
  const [exportReport, setExportReport] = useState(null);
  const [exportScopeKeys, setExportScopeKeys] = useState(null);
  const [toast, setToast] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const viewer = useMemo(() => getSwReportViewer(), [viewerTick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const piiHidden = useMemo(() => swPiiHidden(), [viewerTick]);

  const rangeError = validateSwRange(range);
  const bounds = useMemo(() => resolveSwRange(range), [range]);
  const { from, to } = rangeError ? { from: '', to: '' } : bounds;

  const matchesTarget = (r) => targetFilter === 'all' || r.targetGroup === targetFilter;

  /* ── datasets ────────────────────────────────────────────────── */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const registerRows = useMemo(() => swIntakeRegisterRows(from, to).filter(matchesTarget), [from, to, targetFilter, viewerTick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const visitRows = useMemo(() => swServiceVisitRows(from, to).filter(matchesTarget), [from, to, targetFilter, viewerTick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const referralRows = useMemo(() => swReferralRows(from, to), [from, to, viewerTick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const activityRows = useMemo(() => swActivityRows(from, to), [from, to, viewerTick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const workloadRows = useMemo(() => swWorkloadRows(from, to), [from, to, viewerTick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const childRows = useMemo(() => swChildRiskRows(from, to), [from, to, viewerTick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const violenceRows = useMemo(() => swViolenceRows(from, to), [from, to, viewerTick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const disabilityRows = useMemo(() => swDisabilityRows(from, to), [from, to, viewerTick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const elderlyRows = useMemo(() => swElderlyRows(from, to), [from, to, viewerTick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const supplyRows = useMemo(() => swSupplyIssueRows(from, to), [from, to, viewerTick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const nutritionRows = useMemo(() => swNutritionRows(from, to), [from, to, viewerTick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const situation = useMemo(() => swProblemSituation(from, to), [from, to, viewerTick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const summary = useMemo(() => swReportSummary(from, to), [from, to, viewerTick]);

  /* ── ชุดคอลัมน์ ───────────────────────────────────────────────── */
  const personColumns = piiHidden
    ? [
      { key: 'hn', label: 'รหัสนิรนาม' },
      { key: 'date', label: 'วันที่', csv: (r) => r.date },
    ]
    : [
      { key: 'date', label: 'วันที่', csv: (r) => r.date },
      { key: 'hn', label: 'HN' },
      { key: 'sn', label: 'SN' },
      { key: 'name', label: 'ชื่อ-นามสกุล' },
      { key: 'cid', label: 'เลขประจำตัวประชาชน', csv: (r) => formatCid(r.cid) },
    ];

  const reportsCatalog = useMemo(() => [
    buildExportReport('ss1-register', '1) ทะเบียนรับเรื่องผู้ใช้บริการสังคมสงเคราะห์ (ส.ส.1)', [
      ...personColumns,
      { key: 'caseNo', label: 'เลขที่สังคมสงเคราะห์' },
      { key: 'clientTypeLabel', label: 'ประเภทผู้ใช้บริการ' },
      { key: 'intakeChannelLabel', label: 'การรับเรื่อง' },
      { key: 'targetGroupLabel', label: 'กลุ่มเป้าหมาย' },
      { key: 'problemLabel', label: 'ปัญหาแรกรับ' },
      { key: 'owner', label: 'เจ้าของเคส' },
      { key: 'statusLabel', label: 'สถานะทะเบียน' },
    ], sanitizeSwRows(registerRows), (r) => r.date),

    buildExportReport('ss2-visits', '2) รายงานผู้ใช้บริการสังคมสงเคราะห์ (ส.ส.2)', [
      ...personColumns,
      { key: 'age', label: 'อายุ (ปี)' },
      { key: 'sex', label: 'เพศ' },
      { key: 'targetGroupLabel', label: 'กลุ่มเป้าหมาย' },
      { key: 'intakeChannelLabel', label: 'การรับเรื่อง' },
      { key: 'clientTypeLabel', label: 'ประเภทผู้ใช้บริการ' },
      { key: 'problemLabel', label: 'รหัสปัญหาหลัก' },
      { key: 'worker', label: 'ผู้ให้บริการ' },
    ], sanitizeSwRows(visitRows), (r) => r.date),

    buildExportReport('ss3-referral', '3) รายงานการส่งต่อผู้ใช้บริการสังคมสงเคราะห์ (ส.ส.3)', [
      { key: 'docNo', label: 'เลขที่หนังสือ' },
      ...personColumns,
      { key: 'subject', label: 'เรื่อง' },
      { key: 'agencyLabel', label: 'หน่วยงานปลายทาง' },
      { key: 'problemLabel', label: 'รหัสปัญหาที่ส่งต่อ' },
      { key: 'statusLabel', label: 'สถานะตอบกลับ' },
      { key: 'replyCount', label: 'จำนวนครั้งที่ตอบกลับ' },
      { key: 'recordedBy', label: 'ผู้บันทึก' },
    ], sanitizeSwRows(referralRows), (r) => r.date),

    buildExportReport('ss4-activity', '4) รายงานกิจกรรมทางสังคมสงเคราะห์ (ส.ส.4)', [
      { key: 'date', label: 'วันที่', csv: (r) => r.date },
      { key: 'activityLabel', label: 'กิจกรรม' },
      { key: 'subActivityLabel', label: 'กิจกรรมย่อย' },
      { key: 'venue', label: 'สถานที่' },
      { key: 'channelLabel', label: 'ช่องทาง' },
      { key: 'count', label: 'จำนวน' },
      { key: 'unit', label: 'หน่วยนับ' },
      { key: 'teamLabel', label: 'ทีมสหวิชาชีพ' },
      { key: 'imageCount', label: 'จำนวนภาพแนบ' },
      { key: 'statusLabel', label: 'สถานะ' },
      { key: 'recordedBy', label: 'ผู้บันทึก' },
    ], activityRows, (r) => r.date),

    buildExportReport('ss5-workload', '5) สรุปรายงานทางสังคมสงเคราะห์ (Workload) (ส.ส.5)', [
      { key: 'item', label: 'รายการงาน' },
      { key: 'count', label: 'จำนวน' },
      { key: 'unit', label: 'หน่วยนับ' },
      { key: 'newCount', label: 'จำนวนราย/รายใหม่' },
    ], workloadRows),

    buildExportReport('scr-child', '6) รายงานคัดกรองและเฝ้าระวังภาวะเสี่ยงในกลุ่มเด็ก', [
      ...personColumns,
      { key: 'riskCount', label: 'จำนวนข้อเสี่ยงที่พบ', csv: (r) => (r.risks || []).length },
      { key: 'levelLabel', label: 'ระดับความเสี่ยง', csv: (r) => (SW_CHILD_RISK_LEVELS.find((l) => l.key === r.level)?.label || '—') },
      { key: 'plan', label: 'แผนการช่วยเหลือ' },
      { key: 'by', label: 'ผู้ประเมิน' },
    ], sanitizeSwRows(childRows.map((r) => ({
      ...r,
      riskCount: (r.risks || []).length,
      levelLabel: SW_CHILD_RISK_LEVELS.find((l) => l.key === r.level)?.label || '—',
    }))), (r) => r.date),

    buildExportReport('scr-violence', '7) รายงานความรุนแรงในครอบครัว', [
      ...personColumns,
      { key: 'typeLabel', label: 'ประเภทความรุนแรง' },
      { key: 'levelLabel', label: 'ระดับความเสี่ยง' },
      { key: 'plan', label: 'แผนช่วยเหลือ / วางแผนความปลอดภัย' },
      { key: 'by', label: 'ผู้ประเมิน' },
    ], sanitizeSwRows(violenceRows.map((r) => ({
      ...r,
      typeLabel: (r.types || []).join(', '),
      levelLabel: SW_VIOLENCE_LEVELS.find((l) => l.key === r.level)?.label || '—',
    }))), (r) => r.date),

    buildExportReport('scr-disability', '8) รายงานการประเมินความพิการ', [
      ...personColumns,
      { key: 'typeLabel', label: 'ประเภทความพิการ' },
      { key: 'cardLabel', label: 'สถานะบัตรคนพิการ' },
      { key: 'adl', label: 'คะแนน ADL' },
      { key: 'need', label: 'ความต้องการช่วยเหลือ' },
      { key: 'by', label: 'ผู้ประเมิน' },
    ], sanitizeSwRows(disabilityRows.map((r) => ({
      ...r,
      typeLabel: (r.types || []).map(resolveSwDisabilityType).join(', '),
      cardLabel: resolveSwDisabilityCard(r.card),
    }))), (r) => r.date),

    buildExportReport('scr-elderly', '9) รายงานการคัดกรองผู้สูงอายุ (ADL)', [
      ...personColumns,
      { key: 'adl', label: 'คะแนน Barthel ADL' },
      { key: 'band', label: 'กลุ่มผู้สูงอายุ' },
      { key: 'by', label: 'ผู้ประเมิน' },
    ], sanitizeSwRows(elderlyRows), (r) => r.date),

    buildExportReport('sup-issue', '10) รายงานการช่วยเหลือวัสดุและอุปกรณ์ทางการแพทย์', [
      ...personColumns,
      { key: 'materialLabel', label: 'รายการวัสดุ/อุปกรณ์' },
      { key: 'lot', label: 'Lot' },
      { key: 'qty', label: 'จำนวน' },
      { key: 'unit', label: 'หน่วย' },
      { key: 'statusLabel', label: 'สถานะ' },
      { key: 'issuedBy', label: 'ผู้จ่าย' },
    ], sanitizeSwRows(supplyRows), (r) => r.date),

    buildExportReport('sit-problem', '11) รายงานสถานการณ์ปัญหาทางสังคม', [
      { key: 'code', label: 'รหัสหมวดปัญหา' },
      { key: 'label', label: 'หมวดปัญหาทางสังคม' },
      { key: 'count', label: 'จำนวน (ครั้ง)' },
      { key: 'percent', label: 'สัดส่วน (%)' },
    ], situation.categoryRows),

    buildExportReport('nut-help', '12) รายงานการช่วยเหลือด้านโภชนาการ', [
      ...personColumns,
      { key: 'groupLabel', label: 'กลุ่มการช่วยเหลือ' },
      { key: 'materialLabel', label: 'วัสดุที่ให้การช่วยเหลือ' },
      { key: 'size', label: 'ขนาด' },
      { key: 'qty', label: 'จำนวน' },
      { key: 'unit', label: 'หน่วย' },
      { key: 'assessment', label: 'ผลประเมินภาวะโภชนาการ' },
      { key: 'statusLabel', label: 'สถานะการช่วยเหลือ' },
      { key: 'endedReason', label: 'เหตุผลการยุติ' },
      { key: 'by', label: 'ผู้บันทึก' },
    ], sanitizeSwRows(nutritionRows), (r) => r.date),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [registerRows, visitRows, referralRows, activityRows, workloadRows, childRows,
    violenceRows, disabilityRows, elderlyRows, supplyRows, nutritionRows, situation, piiHidden]);

  const exportTopics = useMemo(
    () => reportsCatalog.map((r) => ({ value: r.key, label: r.title })),
    [reportsCatalog],
  );

  const openExport = (keyOrReport, scopeKeys = null) => {
    setExportScopeKeys(scopeKeys);
    if (keyOrReport === 'all' || keyOrReport?.key === 'all') {
      setExportReport({ key: 'all', title: keyOrReport?.title || 'รายงานงานสังคมสงเคราะห์ทั้งหมด' });
      return;
    }
    if (typeof keyOrReport === 'string') {
      const found = reportsCatalog.find((r) => r.key === keyOrReport);
      setExportReport(piiHidden && found ? sanitizeExportReportMeta(found) : (found || { key: keyOrReport, title: 'รายงาน' }));
      return;
    }
    setExportReport(piiHidden ? sanitizeExportReportMeta(keyOrReport) : keyOrReport);
  };

  const openExportGroup = (groupKey, title) => {
    const keys = EXPORT_GROUPS[groupKey] || [];
    if (keys.length === 1) { openExport(keys[0]); return; }
    openExport({ key: 'all', title }, keys);
  };

  const openViewGroup = (groupKey, title) => {
    const keys = EXPORT_GROUPS[groupKey] || [];
    const reports = keys.map((k) => reportsCatalog.find((r) => r.key === k)).filter(Boolean);
    if (!reports.length) return;
    setViewBundle({ key: groupKey, title, reports });
  };

  const scopedCatalog = useMemo(() => {
    const base = piiHidden ? reportsCatalog.map(sanitizeExportReportMeta) : reportsCatalog;
    if (!exportScopeKeys?.length) return base;
    return base.filter((r) => exportScopeKeys.includes(r.key));
  }, [reportsCatalog, exportScopeKeys, piiHidden]);

  const scopedTopics = useMemo(() => {
    if (!exportScopeKeys?.length) return exportTopics;
    return exportTopics.filter((t) => exportScopeKeys.includes(t.value));
  }, [exportTopics, exportScopeKeys]);

  /* ── ชุดกราฟ ─────────────────────────────────────────────────── */
  const targetCounts = countBy(visitRows, (r) => r.targetGroupLabel);
  const channelCounts = countBy(visitRows, (r) => r.intakeChannelLabel);
  const targetSegments = [...targetCounts.entries()]
    .map(([label, value], i) => ({ label, value, color: PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length] }));
  const channelBars = [...channelCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, segments: [{ value, color: PHCIS_CHART.teal, label: 'ครั้ง' }] }));

  const referralStatusSegments = [...countBy(referralRows, (r) => r.statusLabel).entries()]
    .map(([label, value], i) => ({ label, value, color: PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length] }));
  const activityBars = [...countBy(activityRows.filter((r) => r.status !== 'cancelled'), (r) => r.activityLabel).entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, segments: [{ value, color: PHCIS_CHART.indigo, label: 'ครั้ง' }] }));

  const workloadBars = workloadRows
    .map((r) => ({ label: r.item, value: r.count, segments: [{ value: r.count, color: PHCIS_CHART.teal, label: r.unit }] }))
    .filter((r) => r.value > 0);

  const childLevelSegments = SW_CHILD_RISK_LEVELS
    .map((l, i) => ({ label: l.label, value: childRows.filter((r) => r.level === l.key).length, color: PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length] }))
    .filter((s) => s.value > 0);
  const violenceLevelSegments = SW_VIOLENCE_LEVELS
    .map((l, i) => ({ label: l.label, value: violenceRows.filter((r) => r.level === l.key).length, color: PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length] }))
    .filter((s) => s.value > 0);

  const nutritionSegments = SW_NUTRI_GROUPS
    .map((g, i) => ({ label: g.label, value: nutritionRows.filter((r) => r.group === g.value).length, color: PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length] }))
    .filter((s) => s.value > 0);
  const supplyBars = [...countBy(supplyRows.filter((r) => r.status !== 'cancelled'), (r) => r.materialLabel).entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value, segments: [{ value, color: PHCIS_CHART.yellow, label: 'รายการ' }] }));

  const problemBars = situation.categoryRows
    .slice(0, 10)
    .map((r) => ({ label: r.label, value: r.count, segments: [{ value: r.count, color: PHCIS_CHART.pink, label: 'ครั้ง' }] }));

  const summaryCards = useMemo(() => ([
    { key: 'visits', label: 'การให้บริการในช่วงที่เลือก', value: thNum(summary.visits), color: 'info', icon: 'support_agent' },
    { key: 'people', label: 'ผู้ใช้บริการ (ไม่ซ้ำราย)', value: thNum(summary.people), color: 'positive', icon: 'groups' },
    { key: 'referrals', label: 'การส่งต่อ (ส.ส.3)', value: thNum(summary.referrals), color: 'info', icon: 'forward_to_inbox' },
    { key: 'activities', label: 'กิจกรรม (ส.ส.4)', value: thNum(summary.activities), color: 'positive', icon: 'diversity_3' },
    { key: 'highRisk', label: 'ผลคัดกรองเสี่ยงสูง', value: thNum(summary.highRisk), color: 'danger', icon: 'e911_emergency' },
  ]), [summary]);

  const scopeLabel = `${viewer.value === 'center' ? SW_HOME_CENTER.name : 'ทุกศูนย์บริการสาธารณสุข'} · ${targetFilter === 'all' ? 'ทุกกลุ่มเป้าหมาย' : (SW_REPORT_TARGET_OPTIONS.find((o) => o.value === targetFilter)?.label || '')} · ${bounds.label}`;

  const changeViewer = (value) => {
    setSwReportViewer(value);
    setViewerTick((t) => t + 1);
    setToast(`สลับมุมมองเป็น ${SW_REPORT_ROLES.find((r) => r.value === value)?.label}`);
  };

  const setRangeField = (key) => (value) => setRange((r) => ({ ...r, [key]: value }));

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='รายงานที่เกี่ยวข้องทางสังคมสงเคราะห์'
      onBack={() => history.push('/clinic/social-work')}
      backLabel='กลับหน้าแรก'
      summaryCards={summaryCards}
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
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
        {/* ── ตัวกรอง ────────────────────────────────────────────── */}
        <section className='w-full flex flex-col' style={{ ...CARD, gap: 'var(--dim-space-400, 16px)' }}>
          <div className='flex w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <SwField label='รูปแบบช่วงเวลา' minWidth={200}>
              <Select
                showLabel={false}
                searchable={false}
                size='lg'
                value={range.mode}
                onChange={setRangeField('mode')}
                options={SW_RANGE_MODES}
                placeholder='เลือกรูปแบบ'
              />
            </SwField>

            {range.mode === 'date' && (
              <>
                <SwField label='ตั้งแต่วันที่' minWidth={200}>
                  <DatePicker
                    showLabel={false}
                    value={range.from ? new Date(range.from) : null}
                    onChange={(d) => setRangeField('from')(d ? toLocalIso(d) : '')}
                    placeholder='เลือกวันที่'
                  />
                </SwField>
                <SwField label='ถึงวันที่' minWidth={200}>
                  <DatePicker
                    showLabel={false}
                    value={range.to ? new Date(range.to) : null}
                    onChange={(d) => setRangeField('to')(d ? toLocalIso(d) : '')}
                    placeholder='เลือกวันที่'
                  />
                </SwField>
              </>
            )}

            {range.mode === 'month' && (
              <>
                <SwField label='เดือน' minWidth={180}>
                  <Select showLabel={false} searchable={false} size='lg' value={range.month} onChange={setRangeField('month')} options={TH_MONTH_OPTIONS} placeholder='เลือกเดือน' />
                </SwField>
                <SwField label='พ.ศ.' minWidth={150}>
                  <Select showLabel={false} searchable={false} size='lg' value={range.year} onChange={setRangeField('year')} options={[2567, 2568, 2569, 2570].map((y) => ({ value: String(y), label: String(y) }))} placeholder='เลือกปี' />
                </SwField>
              </>
            )}

            {range.mode === 'monthRange' && (
              <>
                <SwField label='ตั้งแต่เดือน' minWidth={180}>
                  <Select showLabel={false} searchable={false} size='lg' value={range.monthFrom} onChange={setRangeField('monthFrom')} options={TH_MONTH_OPTIONS} placeholder='เลือกเดือน' />
                </SwField>
                <SwField label='ถึงเดือน' minWidth={180}>
                  <Select showLabel={false} searchable={false} size='lg' value={range.monthTo} onChange={setRangeField('monthTo')} options={TH_MONTH_OPTIONS} placeholder='เลือกเดือน' />
                </SwField>
                <SwField label='พ.ศ.' minWidth={150}>
                  <Select showLabel={false} searchable={false} size='lg' value={range.year} onChange={setRangeField('year')} options={[2567, 2568, 2569, 2570].map((y) => ({ value: String(y), label: String(y) }))} placeholder='เลือกปี' />
                </SwField>
              </>
            )}

            {range.mode === 'fiscal' && (
              <SwField label='ปีงบประมาณ (ต.ค.–ก.ย.)' minWidth={220}>
                <Select showLabel={false} searchable={false} size='lg' value={range.fiscalYear} onChange={setRangeField('fiscalYear')} options={SW_FISCAL_YEARS} placeholder='เลือกปีงบประมาณ' />
              </SwField>
            )}

            <SwField label='กลุ่มเป้าหมาย' minWidth={220}>
              <Select
                showLabel={false}
                searchable
                size='lg'
                value={targetFilter}
                onChange={setTargetFilter}
                options={SW_REPORT_TARGET_OPTIONS}
                placeholder='ทุกกลุ่มเป้าหมาย'
              />
            </SwField>

            <SwField label='ระดับสิทธิผู้ดูรายงาน (PDPA)' minWidth={280} hint={viewer.hint}>
              <Select
                showLabel={false}
                searchable={false}
                size='lg'
                value={viewer.value}
                onChange={changeViewer}
                options={SW_REPORT_ROLES}
                placeholder='เลือกระดับ'
              />
            </SwField>
          </div>

          {rangeError && <SwBanner tone='danger' icon='error'>{rangeError}</SwBanner>}

          <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}><Icon name='info' size={16} /></span>
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
              {`ขอบเขต: ${scopeLabel}`}
            </span>
            <ColorfulBadge style={piiHidden ? 'red' : 'teal'} size='small' hierarchy='secondary'>
              {piiHidden ? 'ปิดบัง PII — drill-down ใช้รหัสนิรนาม' : 'แสดง PII (HN/ชื่อ/เลขบัตร)'}
            </ColorfulBadge>
            <ColorfulBadge style='grey' size='small' hierarchy='secondary'>
              {`ดาวน์โหลดได้: ${viewer.downloads.join(' / ')}`}
            </ColorfulBadge>
            <div className='flex-1' />
            <NeutralSubdueButton size='sm' leadingIcon='ios_share' onClick={() => openExport('all')}>
              นำส่งออกรายงานทั้งหมด
            </NeutralSubdueButton>
          </div>

          {piiHidden && (
            <SwBanner tone='warning' icon='shield_person'>
              {`มุมมองนี้เป็นระดับ${viewer.label} — ตาราง drill-down และไฟล์ที่ส่งออกจะแทน HN / ชื่อ / เลขบัตร ด้วยรหัสนิรนาม (เช่น ${anonCode('67-00012')}) ตามข้อกำหนด PDPA ของแบบฟอร์มรายงานทั้ง 12 ฉบับ`}
            </SwBanner>
          )}
        </section>

        {rangeError ? (
          <section className='w-full' style={CARD}>
            <EmptyChartNote
              text='ยังแสดงรายงานไม่ได้'
              hint='กรุณาแก้ไขช่วงเวลาให้ถูกต้องก่อน แล้วรายงานทั้ง 12 ฉบับจะคำนวณใหม่อัตโนมัติ'
              icon='event_busy'
            />
          </section>
        ) : (
          <>
            {/* ── กลุ่ม 1: แบบฟอร์มหลัก ─────────────────────────── */}
            <ReportGroupCard
              title='แบบฟอร์มหลัก — ทะเบียนรับเรื่อง (ส.ส.1) และผู้ใช้บริการ (ส.ส.2)'
              subtitle='ฉบับที่ 1–2 ของชุดรายงานตามมติ คทง.10 ครั้งที่ 4'
              onView={() => openViewGroup('core', 'ทะเบียนรับเรื่องและผู้ใช้บริการ')}
              onExport={() => openExportGroup('core', 'รายงาน ส.ส.1 และ ส.ส.2')}
            >
              <StatTileRow>
                <StatTile label='เรื่องที่รับไว้ (ส.ส.1)' value={thNum(registerRows.length)} unit='เรื่อง' />
                <StatTile label='ผู้ใช้บริการรายใหม่' value={thNum(registerRows.filter((r) => r.clientType === 'new').length)} unit='ราย' />
                <StatTile label='การให้บริการ (ส.ส.2)' value={thNum(visitRows.length)} unit='ครั้ง' />
                <StatTile label='ผู้ใช้บริการไม่ซ้ำราย' value={thNum(summary.people)} unit='ราย' />
              </StatTileRow>
              <ChartsRow>
                <ChartPanel title='สัดส่วนกลุ่มเป้าหมายที่รับบริการ'>
                  {targetSegments.length ? (
                    <DonutWithLegend segments={targetSegments} size={180} centerLabel={thNum(visitRows.length)} centerSub='ครั้งที่ให้บริการ' />
                  ) : <EmptyChartNote text='ไม่มีข้อมูลในช่วงที่เลือก' hint='ลองขยายช่วงเวลาหรือเปลี่ยนกลุ่มเป้าหมาย' />}
                </ChartPanel>
                <ChartPanel title='ช่องทางการรับเรื่อง' alignContent='start'>
                  {channelBars.length ? (
                    <div className='w-full'><HBarList valueLabel='ครั้ง' rows={channelBars} /></div>
                  ) : <EmptyChartNote text='ไม่มีข้อมูลในช่วงที่เลือก' />}
                </ChartPanel>
              </ChartsRow>
            </ReportGroupCard>

            {/* ── กลุ่ม 2: ส่งต่อและกิจกรรม ─────────────────────── */}
            <ReportGroupCard
              title='การส่งต่อ (ส.ส.3) และกิจกรรมทางสังคมสงเคราะห์ (ส.ส.4)'
              subtitle='ฉบับที่ 3–4 — ข้อมูลตรงจากหน้าแบบส่งต่อและหน้าบันทึกกิจกรรม'
              onView={() => openViewGroup('outreach', 'การส่งต่อและกิจกรรม')}
              onExport={() => openExportGroup('outreach', 'รายงาน ส.ส.3 และ ส.ส.4')}
            >
              <StatTileRow>
                <StatTile label='ใบส่งต่อที่ออก' value={thNum(referralRows.filter((r) => r.status !== 'cancelled').length)} unit='เรื่อง' />
                <StatTile label='รอตอบกลับ' value={thNum(referralRows.filter((r) => r.status === 'pending').length)} unit='เรื่อง' tone='warning' />
                <StatTile label='กิจกรรมที่จัด' value={thNum(activityRows.filter((r) => r.status !== 'cancelled').length)} unit='ครั้ง' />
                <StatTile label='กิจกรรมที่มีทีมสหวิชาชีพ ≥ 2 สาขา' value={thNum(activityRows.filter((r) => (r.team || []).length >= 2).length)} unit='ครั้ง' />
              </StatTileRow>
              <ChartsRow>
                <ChartPanel title='สถานะการตอบกลับของใบส่งต่อ'>
                  {referralStatusSegments.length ? (
                    <DonutWithLegend segments={referralStatusSegments} size={180} centerLabel={thNum(referralRows.length)} centerSub='ใบส่งต่อ' />
                  ) : <EmptyChartNote text='ยังไม่มีใบส่งต่อในช่วงที่เลือก' />}
                </ChartPanel>
                <ChartPanel title='กิจกรรมแยกตามประเภท' alignContent='start'>
                  {activityBars.length ? (
                    <div className='w-full'><HBarList valueLabel='ครั้ง' rows={activityBars} /></div>
                  ) : <EmptyChartNote text='ยังไม่มีกิจกรรมในช่วงที่เลือก' />}
                </ChartPanel>
              </ChartsRow>
            </ReportGroupCard>

            {/* ── กลุ่ม 3: Workload ─────────────────────────────── */}
            <ReportGroupCard
              title='สรุปรายงานทางสังคมสงเคราะห์ — Workload (ส.ส.5)'
              subtitle='ฉบับที่ 5 — รวมปริมาณงานข้ามทุกหน้าของโมดูล (ส.ส.2 + ส.ส.3 + ส.ส.4 + วัสดุ + โภชนาการ + คัดกรอง)'
              onView={() => openViewGroup('workload', 'สรุป Workload (ส.ส.5)')}
              onExport={() => openExportGroup('workload', 'รายงาน Workload (ส.ส.5)')}
            >
              <ChartsRow>
                <ChartPanel title='ปริมาณงานรายรายการ' alignContent='start'>
                  {workloadBars.length ? (
                    <div className='w-full'><HBarList valueLabel='' rows={workloadBars} /></div>
                  ) : <EmptyChartNote text='ยังไม่มีปริมาณงานในช่วงที่เลือก' />}
                </ChartPanel>
                <ChartPanel title='เปรียบเทียบจำนวนรวมกับจำนวนราย'>
                  {workloadRows.some((r) => r.count > 0) ? (
                    <div className='w-full' style={{ paddingTop: 'var(--dim-space-200, 8px)' }}>
                      <VBars
                        months={workloadRows.map((r) => r.item.replace(/\s*\(.*\)$/, ''))}
                        series={[
                          { label: 'จำนวนรวม', color: PHCIS_CHART.teal, values: workloadRows.map((r) => r.count) },
                          { label: 'จำนวนราย/รายใหม่', color: PHCIS_CHART.pink, values: workloadRows.map((r) => r.newCount) },
                        ]}
                        height={220}
                        barMaxWidth={12}
                      />
                    </div>
                  ) : <EmptyChartNote text='ยังไม่มีข้อมูล Workload ในช่วงที่เลือก' />}
                </ChartPanel>
              </ChartsRow>
            </ReportGroupCard>

            {/* ── กลุ่ม 4: คัดกรองเฉพาะกลุ่ม ─────────────────────── */}
            <ReportGroupCard
              title='รายงานคัดกรองเฉพาะกลุ่ม — เด็ก · ความรุนแรงในครอบครัว · ความพิการ · ผู้สูงอายุ'
              subtitle='ฉบับที่ 6–9 — ข้อมูลจากแบบย่อยของ ส.ส.2 (ข้อมูลอ่อนไหว §1.4.2)'
              onView={() => openViewGroup('screening', 'รายงานคัดกรองเฉพาะกลุ่ม')}
              onExport={() => openExportGroup('screening', 'รายงานคัดกรองเฉพาะกลุ่ม')}
            >
              <StatTileRow>
                <StatTile label='คัดกรองเด็กเสี่ยง' value={thNum(childRows.length)} unit='ราย' />
                <StatTile label='เด็กเสี่ยงสูง' value={thNum(childRows.filter((r) => r.level === 'high').length)} unit='ราย' tone='danger' />
                <StatTile label='คัดกรองความรุนแรงในครอบครัว' value={thNum(violenceRows.length)} unit='ราย' />
                <StatTile label='ผู้สูงอายุที่ประเมิน ADL' value={thNum(elderlyRows.length)} unit='ราย' />
              </StatTileRow>
              <ChartsRow>
                <ChartPanel title='ระดับความเสี่ยงของเด็กที่คัดกรอง'>
                  {childLevelSegments.length ? (
                    <DonutWithLegend segments={childLevelSegments} size={180} centerLabel={thNum(childRows.length)} centerSub='รายที่คัดกรอง' />
                  ) : <EmptyChartNote text='ยังไม่มีผลคัดกรองเด็กในช่วงที่เลือก' />}
                </ChartPanel>
                <ChartPanel title='ระดับความเสี่ยงความรุนแรงในครอบครัว'>
                  {violenceLevelSegments.length ? (
                    <DonutWithLegend segments={violenceLevelSegments} size={180} centerLabel={thNum(violenceRows.length)} centerSub='รายที่คัดกรอง' />
                  ) : <EmptyChartNote text='ยังไม่มีผลคัดกรองความรุนแรงในช่วงที่เลือก' />}
                </ChartPanel>
              </ChartsRow>
            </ReportGroupCard>

            {/* ── กลุ่ม 5: วัสดุและโภชนาการ ─────────────────────── */}
            <ReportGroupCard
              title='การช่วยเหลือวัสดุ-อุปกรณ์ทางการแพทย์ และการช่วยเหลือด้านโภชนาการ'
              subtitle='ฉบับที่ 10 และ 12 — เชื่อมบัญชีจ่ายออกของหน้ารับ-จ่ายวัสดุและเคสโภชนาการ'
              onView={() => openViewGroup('material', 'วัสดุ-อุปกรณ์ และโภชนาการ')}
              onExport={() => openExportGroup('material', 'รายงานวัสดุ-อุปกรณ์ และโภชนาการ')}
            >
              <StatTileRow>
                <StatTile label='รายการวัสดุที่จ่ายออก' value={thNum(supplyRows.filter((r) => r.status !== 'cancelled').length)} unit='รายการ' />
                <StatTile label='ผู้รับวัสดุ (ไม่ซ้ำราย)' value={thNum(new Set(supplyRows.map((r) => r.hn)).size)} unit='ราย' />
                <StatTile label='ครั้งที่ช่วยเหลือด้านโภชนาการ' value={thNum(nutritionRows.length)} unit='ครั้ง' />
                <StatTile label='เคสที่ยุติการช่วยเหลือแล้ว' value={thNum(nutritionRows.filter((r) => r.status === 'ended').length)} unit='ครั้ง' />
              </StatTileRow>
              <ChartsRow>
                <ChartPanel title='วัสดุที่จ่ายออกมากที่สุด' alignContent='start'>
                  {supplyBars.length ? (
                    <div className='w-full'><HBarList valueLabel='รายการ' rows={supplyBars} /></div>
                  ) : <EmptyChartNote text='ยังไม่มีการจ่ายวัสดุในช่วงที่เลือก' />}
                </ChartPanel>
                <ChartPanel title='การช่วยเหลือด้านโภชนาการแยกตามกลุ่ม'>
                  {nutritionSegments.length ? (
                    <DonutWithLegend segments={nutritionSegments} size={180} centerLabel={thNum(nutritionRows.length)} centerSub='ครั้งที่ช่วยเหลือ' />
                  ) : <EmptyChartNote text='ยังไม่มีการช่วยเหลือด้านโภชนาการในช่วงที่เลือก' />}
                </ChartPanel>
              </ChartsRow>
            </ReportGroupCard>

            {/* ── กลุ่ม 6: สถานการณ์ปัญหาทางสังคม ───────────────── */}
            <ReportGroupCard
              title='รายงานสถานการณ์ปัญหาทางสังคม'
              subtitle='ฉบับที่ 11 — นับตามบัญชีปัญหาทางสังคม (Social Problem List) หมวด 01–17'
              onView={() => openViewGroup('situation', 'สถานการณ์ปัญหาทางสังคม')}
              onExport={() => openExportGroup('situation', 'รายงานสถานการณ์ปัญหาทางสังคม')}
            >
              <StatTileRow>
                <StatTile label='ปัญหาที่บันทึกทั้งหมด' value={thNum(situation.total)} unit='ครั้ง' />
                <StatTile label='หมวดปัญหาที่พบ' value={thNum(situation.categoryRows.length)} unit='หมวด' />
                <StatTile label='รหัสปัญหาย่อยที่พบ' value={thNum(situation.codeRows.length)} unit='รหัส' />
                <StatTile
                  label='รหัสปัญหาที่เป็นข้อมูลลับ'
                  value={thNum(situation.codeRows.filter((r) => r.sensitive).length)}
                  unit='รหัส'
                  tone='warning'
                />
              </StatTileRow>
              <ChartsRow>
                <ChartPanel title='หมวดปัญหาทางสังคมที่พบมากที่สุด' alignContent='start'>
                  {problemBars.length ? (
                    <div className='w-full'><HBarList valueLabel='ครั้ง' rows={problemBars} /></div>
                  ) : <EmptyChartNote text='ยังไม่มีการบันทึกรหัสปัญหาในช่วงที่เลือก' />}
                </ChartPanel>
                <ChartPanel title='สัดส่วน 4 หมวดปัญหาแรก'>
                  {situation.categoryRows.length ? (
                    <DonutWithLegend
                      segments={situation.categoryRows.slice(0, 4).map((r, i) => ({
                        label: r.label,
                        value: r.count,
                        color: PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length],
                      }))}
                      size={180}
                      centerLabel={thNum(situation.total)}
                      centerSub='ครั้ง'
                    />
                  ) : <EmptyChartNote text='ยังไม่มีข้อมูลปัญหาทางสังคม' />}
                </ChartPanel>
              </ChartsRow>
            </ReportGroupCard>
          </>
        )}

        <section className='w-full flex items-center flex-wrap' style={{ ...CARD, gap: 'var(--dim-space-300, 12px)' }}>
          <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}><Icon name='info' size={14} /></span>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {`รายงานทุกฉบับประทับผู้ออกรายงาน (${SW_CURRENT_USER}) และเวลาที่พิมพ์ · ${formatSwDateTime(new Date().toISOString())} · รายการที่ถูกยกเลิกไม่ถูกนับในตัวชี้วัด · ${resolveSwWelfareCard('holder')}ใช้เป็นเกณฑ์อ้างอิงสถานะรายได้น้อย (มติข้อ 16)`}
          </span>
        </section>
      </div>

      <ReportViewPopup
        open={!!viewBundle}
        bundle={viewBundle}
        onClose={() => setViewBundle(null)}
        onExportReport={(report) => { if (report) openExport(report); }}
        footnote={piiHidden
          ? 'มุมมองระดับสำนักงาน/ผู้บริหาร — ตาราง drill-down แสดงรหัสนิรนามแทน HN ชื่อ และเลขบัตรประชาชนตามข้อกำหนด PDPA'
          : `ข้อมูล ณ ${formatSwDate(new Date().toISOString().slice(0, 10))} — รายการที่ยกเลิกแล้วไม่ถูกนับในตัวชี้วัด`}
      />

      <ExportFormatPopup
        open={!!exportReport}
        report={exportReport}
        reportsCatalog={scopedCatalog}
        topics={scopedTopics}
        onClose={() => { setExportReport(null); setExportScopeKeys(null); }}
        onExported={() => setToast('นำส่งออกรายงานงานสังคมสงเคราะห์แล้ว')}
        documentFooter={EXPORT_FOOTER}
        logExportFn={null}
        topicsFieldName='social-work-export-topics'
      />

      <SuccessToast open={!!toast} message={toast} onClose={() => setToast('')} />
    </QueuePageShell>
  );
};

export default SocialWorkReportsPage;
