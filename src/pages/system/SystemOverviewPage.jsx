import React, { useMemo, useState } from 'react';
import { ALL_CLINICS_VALUE, useClinicFilter } from '@/components/layout/HeaderClinicContext';
import QueuePageShell from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import Select from '@/components/forms/Select';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Icon from '@/components/icons/Icon';
import { Donut, DonutLegend, HBarList, VBars } from '@/components/graph/Charts';
import { PHCIS_CHART_PALETTE } from '@/data/phcisChartPalette';
import FilterDateTag from '@/components/forms/FilterDateTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import { matchesDateFilter } from '@/data/financePaymentPrototype';
import SYSTEM_NAV from '@/pages/system/systemNav';
import { useHistory } from 'react-router-dom';

import { readCenters } from '@/data/centerStore';
import { readStructures } from '@/data/centerStructure';
import { readActivities } from '@/data/activityStore';
import { readPositions } from '@/data/positionStore';
import { readDepartments } from '@/data/departmentStore';
import { readHolidays } from '@/data/holidayStore';
import {
  readAccessControls,
  APPROVAL_META,
  APPROVAL_APPROVED,
  APPROVAL_PENDING,
  APPROVAL_DRAFT,
  APPROVAL_REJECTED,
} from '@/data/accessControlStore';
import {
  readAssessUsers,
  primaryAssignment,
  centerLabel as centerLabelOf,
} from '@/data/assessUserStore';
import {
  THAI_MONTHS,
  THAI_MONTHS_SHORT,
  MONTH_LABELS,
  REPORT_CENTERS,
  buildUsageReport,
  formatMinutes,
} from '@/data/userUsageReports';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ConsentDashboardTemplatePopup from '@/pages/consent/ConsentDashboardTemplatePopup';
import {
  DASHBOARD_LAYOUTS as SYS_LAYOUTS,
  WIDGET_TYPES as SYS_WIDGET_TYPES,
  WIDGET_DATASETS as SYS_DATASETS,
  WIDGET_TYPE_DATASETS as SYS_TYPE_DATASETS,
  WIDGET_DEFAULT_SPAN as SYS_DEFAULT_SPAN,
  listDashboardTemplates,
  getDefaultDashboardTemplateId,
  setDefaultDashboardTemplate,
  saveDashboardTemplate,
} from '@/data/systemDashboardTemplates';
import {
  SystemDashboardWidget,
  buildSystemWidgetContext,
} from '@/data/systemDashboardWidgets';
import { ExportFormatPopup } from '@/pages/consent/consentExportPopup';
import SuccessToast from '@/components/toast/SuccessToast';

/* ระบบจัดการระบบ · แดชบอร์ด — ล้อโครงหน้าจากแดชบอร์ดระบบความยินยอม
   (KPI strip → การ์ดกราฟในกริด → การ์ดตาราง) แต่ข้อมูลมาจากทะเบียนของ
   "จัดการระบบ" จริงทั้งหมด ไม่มีตัวเลข hardcode เหมือนหน้าเดิม

   ยึด TOR §1.17 ระบบงานผู้ดูแลระบบ เป็นหลัก:
     §1.17.4.2 — บริหารจัดการสิทธิ์: จัดกลุ่ม/อนุมัติสิทธิ์/เวอร์ชันของการกำหนดสิทธิ์
                 → การ์ด "สถานะการอนุมัติแม่แบบสิทธิ์" + KPI คิวรออนุมัติ
     §1.17.4.3 — ยอดผู้ใช้งานรายเดือน · ช่วงเวลาการใช้งาน · ระยะเวลาเฉลี่ย ·
                 ปริมาณการใช้งานแต่ละฟังก์ชัน แบบ realtime + export XLS/PDF
                 → การ์ดการใช้งานระบบทั้งชุด + ปุ่มส่งออก
     §1.17.2.1/2.2 — ทะเบียน Department / Healthcare Service ใต้ศูนย์
                 → ตาราง "ทะเบียนที่ต้องดูแล" นับของจริงจากแต่ละ store

   ตัวเลขทุกตัวอ่านจาก store เดียวกับหน้าที่ใช้แก้ไข จึงไม่มีทางเห็นไม่ตรงกัน */

const breadcrumb = ['จัดการระบบ', 'แดชบอร์ด'];

/* รายงานที่ป้อนให้ ExportFormatPopup — ตัวเดียวกับหน้าจัดการความยินยอมและ
   ทะเบียนศูนย์บริการ (เลือกหัวข้อ · ช่วงวันที่ · PDF/CSV/XLSX + เก็บ log)
   แทนปุ่มส่งออก XLS / พิมพ์ PDF สองปุ่มที่ทำเองแยก (26 ส.ค. 2569 มติผู้ใช้) */
const SYSTEM_EXPORT_REPORT = {
  key: 'system-overview',
  title: 'รายงานภาพรวมระบบจัดการระบบ',
  subtitle: 'ทะเบียนทั้งหมดของระบบจัดการระบบ พร้อมจำนวนที่นับจากทะเบียนจริง',
  table: {
    columns: [
      { key: 'name', header: 'ทะเบียน', width: 220 },
      { key: 'count', header: 'จำนวน', width: 110 },
      { key: 'unit', header: 'หน่วย', width: 100 },
      { key: 'detail', header: 'รายละเอียด', width: 360 },
    ],
    rows: [],
  },
};

const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600)',
};
const INNER_CARD = {
  padding: 'var(--dim-space-400)',
  borderRadius: 'var(--dim-radius-400)',
  background: 'var(--surface-card-100)',
  border: 'var(--dim-stroke-100) solid var(--border-card-default)',
  boxSizing: 'border-box',
  minWidth: 0,
};
const TITLE_TEXT = {
  color: 'var(--text-brandPrimary-default)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-base)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.4,
  margin: 0,
};
const SUB_TITLE = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.4,
  margin: 0,
};
const MUTED_XS = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.5,
};
const VAL = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
};

const colorAt = (i) => PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length];

/* 'ก.ย.68' → '15 กันยายน 2568' — matchesDateFilter รับวันที่ไทยเป็นสตริง
   ใช้วันที่ 15 เป็นตัวแทนของเดือน (ตัวกรองที่ละเอียดกว่ารายเดือนไม่มีข้อมูลรองรับ
   อยู่แล้ว เพราะยอดผู้ใช้งานเก็บเป็นรายเดือน) */
const monthLabelToThaiDate = (label) => {
  const idx = THAI_MONTHS_SHORT.findIndex((m) => label.startsWith(m));
  if (idx < 0) return '';
  const yy = Number(label.slice(-2));
  return `15 ${THAI_MONTHS[idx]} ${2500 + yy}`;
};

const MONTH_THAI_DATES = MONTH_LABELS.map(monthLabelToThaiDate);
const num = (n) => Number(n || 0).toLocaleString('th-TH');

/* สีของสถานะอนุมัติให้ตรงกับความหมาย ไม่ใช่ลำดับใน palette */
const APPROVAL_COLOR = {
  [APPROVAL_APPROVED]: 'var(--text-statussummarycard-positive-number, #1F8A5B)',
  [APPROVAL_PENDING]: 'var(--text-statussummarycard-warning-number, #B26A00)',
  [APPROVAL_DRAFT]: 'var(--text-content-tertiary, #6B7280)',
  [APPROVAL_REJECTED]: 'var(--text-danger-default, #B91C1C)',
};

const statCard = ({ key, icon, label, value, tone }) => ({
  key,
  icon,
  label,
  value,
  tileBg: `var(--surface-statussummarycard-${tone})`,
  iconInk: `var(--text-statussummarycard-${tone}-number)`,
});

function SectionHead({ title, subtitle, right }) {
  return (
    <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
      <div className='flex flex-col' style={{ flex: '1 1 auto', minWidth: 0 }}>
        <h2 style={TITLE_TEXT}>{title}</h2>
        {subtitle ? <span style={MUTED_XS}>{subtitle}</span> : null}
      </div>
      {right ? <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-200)' }}>{right}</div> : null}
    </div>
  );
}

function WidgetCard({ title, subtitle, span = 1, children }) {
  return (
    <div
      className='flex flex-col'
      style={{ ...INNER_CARD, gap: 'var(--dim-space-300)', gridColumn: `span ${span} / span ${span}` }}
    >
      <div className='flex flex-col'>
        <h3 style={SUB_TITLE}>{title}</h3>
        {subtitle ? <span style={MUTED_XS}>{subtitle}</span> : null}
      </div>
      {children}
    </div>
  );
}

export default function SystemOverviewPage({ activeKey = 'system-overview' }) {
  const navigate = useHistory();
  /* ขอบเขตรายงานการใช้งาน — ยึดคู่มือ MIS: ทุกศูนย์ หรือเจาะรายศูนย์
     (ศูนย์ที่ยังไม่เปิดใช้ระบบไม่มีข้อมูลใช้งาน จึงมีแค่ REPORT_CENTERS) */
  /* ขอบเขตศูนย์อ่านจากชิปบน Header (แหล่งความจริงเดียวกับ PHCIS) — เดิมหน้านี้
     มีชิป `ศูนย์:` ของตัวเอง ย้ายขึ้นไปข้างบนแล้ว (มติผู้ใช้ 27 ส.ค. 69) */
  const { clinic } = useClinicFilter() || {};
  const scopeCenter = !clinic || clinic === ALL_CLINICS_VALUE ? 'all' : clinic;
  /* ตัวกรองวันที่ — ชุดเดียวกับแดชบอร์ดระบบความยินยอม ค่าเริ่มต้น "ปีนี้"
     เพราะยอดผู้ใช้งานเก็บย้อนหลัง 12 เดือน ถ้าตั้ง "เดือนนี้" กราฟจะเหลือแท่งเดียว */
  const [pageDate, setPageDate] = useState({ quick: 'thisyear' });
  /* หน้าจอรวมมาจาก "เทมเพลต" เหมือนแดชบอร์ดความยินยอม — เทมเพลตมาตรฐานให้ผล
     เหมือนหน้าเดิมทุกประการ (26 ส.ค. 2569 มติผู้ใช้) */
  const [templates, setTemplates] = useState(() => listDashboardTemplates());
  const [templateId, setTemplateId] = useState(() => getDefaultDashboardTemplateId());
  const [templatePopup, setTemplatePopup] = useState(false);
  const [exportReport, setExportReport] = useState(null);
  const [exportDone, setExportDone] = useState(false);
  const dateFiltersActive = (pageDate?.quick || 'thisyear') !== 'thisyear';
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    dateFiltersActive,
    () => setPageDate({ quick: 'thisyear' }),
  );

  const centers = useMemo(() => readCenters(), []);
  const structures = useMemo(() => readStructures(), []);
  const activities = useMemo(() => readActivities(), []);
  const positions = useMemo(() => readPositions(), []);
  const departments = useMemo(() => readDepartments(), []);
  const holidays = useMemo(() => readHolidays(), []);
  const accessControls = useMemo(() => readAccessControls(), []);
  const users = useMemo(() => readAssessUsers(), []);

  const centerStats = useMemo(() => {
    const active = centers.filter((c) => c.active !== false && !c.draft).length;
    const branches = centers.reduce((sum, c) => sum + (c.branches || []).length, 0);
    return { total: centers.length, active, branches };
  }, [centers]);

  const roleCount = useMemo(
    () => activities.reduce((sum, a) => sum + (a.subActivities || []).length, 0),
    [activities],
  );

  const approvalSegments = useMemo(() => {
    const order = [APPROVAL_APPROVED, APPROVAL_PENDING, APPROVAL_DRAFT, APPROVAL_REJECTED];
    return order
      .map((status) => ({
        label: APPROVAL_META[status]?.label || status,
        value: accessControls.filter((r) => (r.approvalStatus || APPROVAL_DRAFT) === status).length,
        color: APPROVAL_COLOR[status],
      }))
      .filter((s) => s.value > 0);
  }, [accessControls]);

  const pendingApproval = useMemo(
    () => accessControls.filter((r) => r.approvalStatus === APPROVAL_PENDING).length,
    [accessControls],
  );

  /* บุคลากรต่อศูนย์ — นับจาก assignment หลักของแต่ละคน คนที่อยู่สาขาย่อย
     นับรวมกับศูนย์แม่ (ป้ายบอกสาขาอยู่ในตารางบุคลากรแล้ว) */
  const usersByCenter = useMemo(() => {
    const map = new Map();
    users.forEach((u) => {
      const p = primaryAssignment(u);
      const label = centerLabelOf(p?.centerId) || p?.center || 'ยังไม่ระบุศูนย์';
      map.set(label, (map.get(label) || 0) + 1);
    });
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [users]);

  const usersByPosition = useMemo(() => {
    const map = new Map();
    users.forEach((u) => {
      const p = primaryAssignment(u);
      const label = p?.position || 'ยังไม่ระบุตำแหน่ง';
      map.set(label, (map.get(label) || 0) + 1);
    });
    return [...map.entries()]
      .map(([label, value], i) => ({ label, value, color: colorAt(i) }))
      .sort((a, b) => b.value - a.value);
  }, [users]);

  const activeUsers = useMemo(() => users.filter((u) => u.active !== false).length, [users]);

  /* TOR §1.17.4.3 — realtime + ย้อนหลัง 12 เดือน */
  const report = useMemo(
    () => buildUsageReport({
      scope: scopeCenter === 'all' ? 'all' : 'center',
      center: scopeCenter,
      monthIndex: null,
    }),
    [scopeCenter],
  );

  const scopeOptions = useMemo(() => ([
    { value: 'all', label: 'ทุกศูนย์บริการ' },
    ...REPORT_CENTERS.map((c) => ({ value: c, label: centerLabelOf(c) || c })),
  ]), []);
  const scopeLabel = scopeOptions.find((o) => o.value === scopeCenter)?.label || 'ทุกศูนย์บริการ';

  const kpiCards = useMemo(() => ([
    statCard({
      key: 'centers',
      icon: 'domain',
      tone: 'info',
      label: `ศูนย์บริการที่เปิดใช้งาน · สาขาย่อย ${num(centerStats.branches)}`,
      value: `${num(centerStats.active)} / ${num(centerStats.total)}`,
    }),
    statCard({
      key: 'staff',
      icon: 'group',
      tone: 'positive',
      label: `บุคลากรที่เปิดใช้งาน · ทั้งหมด ${num(users.length)} คน`,
      value: num(activeUsers),
    }),
    statCard({
      key: 'approval',
      icon: 'how_to_reg',
      tone: pendingApproval > 0 ? 'warning' : 'info',
      label: `แม่แบบสิทธิ์รออนุมัติ · ทั้งหมด ${num(accessControls.length)} แม่แบบ`,
      value: num(pendingApproval),
    }),
    statCard({
      key: 'online',
      icon: 'sensors',
      tone: 'positive',
      label: `ผู้ใช้ออนไลน์ตอนนี้ (realtime) · ${scopeLabel}`,
      value: num(report.summary.onlineNow),
    }),
  ]), [centerStats, users.length, activeUsers, pendingApproval, accessControls.length, report.summary.onlineNow, scopeLabel]);

  /* เดือนที่อยู่ในช่วงวันที่ที่เลือก — ตัวกรองต้องตัดแท่งกราฟจริง ไม่ใช่แค่
     เปลี่ยนป้ายของตัวเอง */
  const monthIdxInRange = useMemo(
    () => MONTH_THAI_DATES.map((d, i) => (matchesDateFilter(d, pageDate) ? i : -1)).filter((i) => i >= 0),
    [pageDate],
  );
  const shownMonths = monthIdxInRange.map((i) => MONTH_LABELS[i]);
  const shownValues = monthIdxInRange.map((i) => report.monthly[i]);
  const periodTotal = shownValues.reduce((sum, v) => sum + (v || 0), 0);

  const barSeries = useMemo(
    () => ([{ name: 'ผู้ใช้งานรายเดือน', color: colorAt(0), values: shownValues }]),
    [shownValues],
  );

  const functionRows = useMemo(
    () => report.functions
      .filter((f) => f.value > 0)
      .map((f) => ({ label: f.label, value: f.value }))
      .sort((a, b) => b.value - a.value),
    [report.functions],
  );

  const hourlyRows = useMemo(
    () => report.hourly.map((h) => ({ label: `${h.label} · ${h.tag}`, value: h.value })),
    [report.hourly],
  );

  /* ทะเบียนที่ผู้ดูแลระบบต้องคอยดูแล — นับของจริงจาก store เดียวกับหน้าแก้ไข */
  const registryRows = useMemo(() => ([
    { id: 'centers', icon: 'domain', name: 'ศูนย์บริการ', detail: `เปิดใช้งาน ${num(centerStats.active)} · สาขาย่อย ${num(centerStats.branches)}`, count: centerStats.total, unit: 'แห่ง', path: '/admin/centers' },
    { id: 'structures', icon: 'account_tree', name: 'รูปแบบโครงสร้างศูนย์', detail: 'แม่แบบแผนก/คลินิก/ห้องตรวจที่เลือกใช้ซ้ำได้', count: structures.length, unit: 'แม่แบบ', path: '/admin/structures' },
    { id: 'positions', icon: 'badge', name: 'ตำแหน่ง', detail: 'ทะเบียนตำแหน่งกลางของบุคลากร', count: positions.length, unit: 'ตำแหน่ง', path: '/assess/positions' },
    { id: 'roles', icon: 'business_center', name: 'บทบาท (Group Policy)', detail: `Group Policy ${num(activities.length)} กลุ่ม`, count: roleCount, unit: 'บทบาท', path: '/assess/activities' },
    { id: 'departments', icon: 'corporate_fare', name: 'แผนก', detail: 'ผูกกับศูนย์บริการ (TOR §1.17.2.1)', count: departments.length, unit: 'แผนก', path: '/assess/departments' },
    { id: 'access', icon: 'how_to_reg', name: 'สิทธิ์การเข้าถึงระบบ', detail: `รออนุมัติ ${num(pendingApproval)} แม่แบบ`, count: accessControls.length, unit: 'แม่แบบ', path: '/assess/access-control' },
    { id: 'staff', icon: 'group', name: 'บุคลากร', detail: `เปิดใช้งาน ${num(activeUsers)} คน`, count: users.length, unit: 'คน', path: '/assess/users' },
    { id: 'holidays', icon: 'event_busy', name: 'วันหยุดประจำปี', detail: 'ทะเบียนกลางใช้ร่วมกันทุกศูนย์', count: holidays.length, unit: 'วัน', path: '/admin/holidays' },
  ]), [centerStats, structures.length, positions.length, activities.length, roleCount, departments.length, accessControls.length, pendingApproval, users.length, activeUsers, holidays.length]);

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) || templates[0],
    [templates, templateId],
  );
  const templateColumns = (SYS_LAYOUTS.find((l) => l.key === activeTemplate?.layout) || { columns: 3 }).columns;

  /* KPI สองชุดให้ widget 'stat' เลือกผูก — ทะเบียน (การ์ดบนหัวหน้า) กับการใช้งาน */
  const usageKpi = useMemo(() => ([
    statCard({ key: 'sessions', icon: 'trending_up', tone: 'info', label: `ครั้งการใช้งาน · ${scopeLabel}`, value: num(report.summary.totalSessions) }),
    statCard({ key: 'avg', icon: 'timer', tone: 'positive', label: 'ระยะเวลาเฉลี่ยต่อครั้ง', value: `${report.summary.avgSessionMinutes} นาที` }),
    statCard({ key: 'dormant', icon: 'person_off', tone: 'warning', label: 'ผู้ใช้ที่ไม่ได้เข้าระบบเกิน 90 วัน', value: num(report.summary.dormant) }),
    statCard({ key: 'online2', icon: 'sensors', tone: 'positive', label: 'ผู้ใช้ออนไลน์ตอนนี้ (realtime)', value: num(report.summary.onlineNow) }),
  ]), [report.summary, scopeLabel]);

  const widgetCtx = useMemo(() => buildSystemWidgetContext({
    kpiRegistries: kpiCards,
    kpiUsage: usageKpi,
    approvalSegments,
    accessTotal: accessControls.length,
    usersByPosition,
    usersTotal: users.length,
    usersByCenter,
    monthLabels: shownMonths,
    monthSeries: barSeries,
    hourlyRows,
    functionRows,
    registryRows,
  }), [kpiCards, usageKpi, approvalSegments, accessControls.length, usersByPosition,
    users.length, usersByCenter, shownMonths, barSeries, hourlyRows, functionRows, registryRows]);

  const applyTemplate = (id) => {
    setTemplateId(id);
    setDefaultDashboardTemplate(id);
    setTemplates(listDashboardTemplates());
  };

  const registryCols = [
    {
      key: 'name',
      header: 'ทะเบียน',
      flex: 1,
      minWidth: 240,
      render: (r) => (
        <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
          <span
            className='inline-flex items-center justify-center shrink-0'
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--dim-radius-200)',
              background: 'var(--surface-brandPrimary-quaternary)',
              color: 'var(--text-brandPrimary-default)',
            }}
          >
            <Icon name={r.icon} size={18} />
          </span>
          <div className='flex flex-col min-w-0'>
            <span className='truncate' style={VAL}>{r.name}</span>
            <span className='truncate' style={MUTED_XS}>{r.detail}</span>
          </div>
        </div>
      ),
    },
    { key: 'count', header: 'จำนวน', render: (r) => <span style={VAL}>{`${num(r.count)} ${r.unit}`}</span> },
    {
      key: 'status',
      header: 'สถานะ',
      render: (r) => (
        <ColorfulBadge style={r.count > 0 ? 'green' : 'grey'} size='small' hierarchy='secondary' width='hug'>
          {r.count > 0 ? 'พร้อมใช้งาน' : 'ยังไม่มีข้อมูล'}
        </ColorfulBadge>
      ),
    },
    {
      key: 'action',
      header: 'จัดการ',
      render: (r) => (
        <NeutralSubdueButton
          leadingIcon='tune'
          size='sm'
          onClick={(e) => { e.stopPropagation(); navigate.push(r.path); }}
        >
          จัดการ
        </NeutralSubdueButton>
      ),
    },
  ];

  return (
    <QueuePageShell
      activeKey={activeKey}
      sidebarItems={SYSTEM_NAV}
      sidebarFallbackKey='system-overview'
      brandTitle='จัดการระบบ'
      breadcrumb={breadcrumb}
      title='แดชบอร์ด'
      /* ขอบเขตศูนย์อยู่ติดชื่อหน้า — เปลี่ยนแล้วการ์ดการใช้งานเปลี่ยนตามทันที */
      afterTitle={(
        <span className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
          <FilterDateTag prefix='วัน:' value={pageDate} onChange={setPageDate} defaultQuick='thisyear' />
          <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
        </span>
      )}
      actions={(
        <>
          <div style={{ width: 'var(--dim-size-2600, 384px)', minWidth: 0 }}>
            <Select
              label='เทมเพลตหน้าจอ'
              prefix='Template:'
              showFieldName={false}
              showHelperText={false}
              leadingIcon='dashboard'
              options={templates.map((t) => ({ value: t.id, label: t.name }))}
              value={activeTemplate?.id}
              onChange={applyTemplate}
              searchable={false}
            />
          </div>
          <NeutralSubdueButton
            leadingIcon='dashboard_customize'
            size='md'
            onClick={() => setTemplatePopup(true)}
          >
            สร้างเทมเพลท
          </NeutralSubdueButton>
          <NeutralSubdueButton
            leadingIcon='ios_share'
            size='md'
          onClick={() => setExportReport({
            ...SYSTEM_EXPORT_REPORT,
            table: { ...SYSTEM_EXPORT_REPORT.table, rows: registryRows },
          })}
        >
            นำส่งออกรายงาน
          </NeutralSubdueButton>
        </>
      )}
    >
      <div
        id='mih-report-print-area'
        className='flex flex-col flex-1 min-w-0'
        style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}
      >
        <SmoothFilterResults opaque={resultsOpaque} style={{ gap: 'var(--dim-space-400)' }}>
        {/* หน้าจอรวมตามเทมเพลต — การ์ด/ตำแหน่ง/ข้อมูล มาจากเทมเพลตที่เลือก
            (เทมเพลตมาตรฐาน = ภาพเดิมของแดชบอร์ดทุกประการ) โครงเดียวกับ
            แดชบอร์ดระบบความยินยอม (26 ส.ค. 2569 มติผู้ใช้) */}
        <section className='flex flex-col w-full' style={{ ...CARD, gap: 'var(--dim-space-400)' }}>
          <SectionHead
            title={activeTemplate?.name || 'แดชบอร์ด'}
            subtitle={`ศูนย์: ${scopeLabel} · ระยะเวลาเฉลี่ยต่อครั้ง ${report.summary.avgSessionMinutes} นาที · เฉลี่ยต่อคน ${formatMinutes(report.summary.avgPerUserMinutes)}`}
            right={(
              <ColorfulBadge style={report.hasData ? 'green' : 'grey'} size='small' hierarchy='secondary' width='hug'>
                {report.hasData ? `${num(report.summary.totalSessions)} ครั้งการใช้งาน` : 'ไม่มีข้อมูลในขอบเขตนี้'}
              </ColorfulBadge>
            )}
          />

          {!activeTemplate?.widgets?.length ? (
            <span style={MUTED_XS}>เทมเพลตนี้ยังไม่มีการ์ด — กด &quot;สร้างเทมเพลท&quot; เพื่อเลือกข้อมูลที่จะแสดง</span>
          ) : (
            <div
              className='w-full'
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${templateColumns}, minmax(0, 1fr))`,
                gap: 'var(--dim-space-400)',
              }}
            >
              {activeTemplate.widgets.map((w) => (
                <WidgetCard key={w.id} title={w.title} span={Math.min(w.span || 1, templateColumns)}>
                  <SystemDashboardWidget widget={w} ctx={widgetCtx} compact={(w.span || 1) < 2} />
                </WidgetCard>
              ))}
            </div>
          )}
        </section>
        </SmoothFilterResults>
      </div>

      {/* ตัวสร้างเทมเพลตหน้าจอรวม — ป๊อปอัปตัวเดียวกับระบบความยินยอม แค่ส่ง
          catalog + ตัวเรนเดอร์ตัวอย่างของจัดการระบบเข้าไป */}
      <ConsentDashboardTemplatePopup
        open={templatePopup}
        onClose={() => setTemplatePopup(false)}
        layouts={SYS_LAYOUTS}
        widgetTypes={SYS_WIDGET_TYPES}
        datasets={SYS_DATASETS}
        typeDatasets={SYS_TYPE_DATASETS}
        defaultSpan={SYS_DEFAULT_SPAN}
        onSaveTemplate={saveDashboardTemplate}
        fallbackDataset='registries'
        renderPreview={(w, compact) => (
          <SystemDashboardWidget widget={w} ctx={widgetCtx} compact={compact} />
        )}
        onSaved={() => {
          setTemplates(listDashboardTemplates());
          setTemplateId(getDefaultDashboardTemplateId());
        }}
      />

      <ExportFormatPopup
        open={!!exportReport}
        report={exportReport}
        onClose={() => setExportReport(null)}
        onExported={() => setExportDone(true)}
      />
      <SuccessToast
        open={exportDone}
        message='นำส่งออกรายงานแล้ว — ระบบบันทึก log การส่งออกข้อมูล'
        onClose={() => setExportDone(false)}
      />
    </QueuePageShell>
  );
}
