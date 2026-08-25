import React, { useMemo, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import Table from '@/components/table/Table';
import Select from '@/components/forms/Select';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Icon from '@/components/icons/Icon';
import { Donut, DonutLegend, HBarList, VBars } from '@/components/graph/Charts';
import { PHCIS_CHART_PALETTE } from '@/data/phcisChartPalette';
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
  MONTH_LABELS,
  REPORT_CENTERS,
  buildUsageReport,
  exportSpreadsheet,
  printReport,
  formatMinutes,
} from '@/data/userUsageReports';

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
  const [scopeCenter, setScopeCenter] = useState('all');

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

  const barSeries = useMemo(
    () => ([{ name: 'ผู้ใช้งานรายเดือน', color: colorAt(0), values: report.monthly }]),
    [report.monthly],
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

  const exportMeta = () => ([
    ['ขอบเขต', scopeLabel],
    ['ช่วงเวลา', `${MONTH_LABELS[0]} – ${MONTH_LABELS[MONTH_LABELS.length - 1]}`],
    ['ผู้ออกรายงาน', 'ผู้ดูแลระบบ PHCIS'],
    ['วันเวลาที่ออก', new Date().toLocaleString('th-TH')],
  ]);

  const doExportXls = () => {
    exportSpreadsheet({
      title: 'รายงานภาพรวมระบบจัดการระบบ PHCIS',
      meta: exportMeta(),
      columns: [
        { label: 'ทะเบียน', value: (r) => r.name },
        { label: 'จำนวน', value: (r) => r.count },
        { label: 'หน่วย', value: (r) => r.unit },
        { label: 'รายละเอียด', value: (r) => r.detail },
      ],
      rows: registryRows,
      filename: 'phcis-system-overview.xls',
    });
  };

  return (
    <QueuePageShell
      activeKey={activeKey}
      sidebarItems={SYSTEM_NAV}
      sidebarFallbackKey='system-overview'
      brandTitle='ระบบ PHCIS'
      breadcrumb={breadcrumb}
      title='แดชบอร์ด'
      /* ขอบเขตศูนย์อยู่ติดชื่อหน้า — เปลี่ยนแล้วการ์ดการใช้งานเปลี่ยนตามทันที */
      afterTitle={(
        <span className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
          <div style={{ width: 'var(--dim-size-2600, 384px)', minWidth: 0 }}>
            <Select
              label='ขอบเขตรายงาน'
              prefix='ขอบเขต:'
              showFieldName={false}
              showHelperText={false}
              leadingIcon='domain'
              options={scopeOptions}
              value={scopeCenter}
              onChange={setScopeCenter}
              searchable={false}
            />
          </div>
        </span>
      )}
      actions={(
        <>
          <NeutralSubdueButton leadingIcon='ios_share' size='md' onClick={doExportXls}>
            นำส่งออกรายงาน (XLS)
          </NeutralSubdueButton>
          <NeutralSubdueButton leadingIcon='print' size='md' onClick={() => printReport('mih-report-print-area')}>
            พิมพ์ / PDF
          </NeutralSubdueButton>
        </>
      )}
      headerInfo={(
        <section className='flex items-stretch flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
          {kpiCards.map((c) => <SummaryCard key={c.key} card={c} variant='panel' />)}
        </section>
      )}
    >
      <div
        id='mih-report-print-area'
        className='flex flex-col flex-1 min-w-0'
        style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}
      >
        {/* ── ทะเบียนของจัดการระบบ ─────────────────────────────────────── */}
        <section className='flex flex-col w-full' style={{ ...CARD, gap: 'var(--dim-space-400)' }}>
          <SectionHead
            title='ภาพรวมทะเบียนจัดการระบบ'
            subtitle='อ่านจากทะเบียนจริงของแต่ละหน้า — ตัวเลขตรงกับหน้าที่ใช้แก้ไขเสมอ'
            right={(
              <ColorfulBadge style='indigo' size='small' hierarchy='secondary' width='hug'>
                {`${num(registryRows.length)} ทะเบียน`}
              </ColorfulBadge>
            )}
          />
          <div
            className='w-full'
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'var(--dim-space-400)' }}
          >
            <WidgetCard
              title='สถานะการอนุมัติแม่แบบสิทธิ์'
              subtitle='TOR §1.17.4.2 — การอนุมัติสิทธิ์'
            >
              {approvalSegments.length === 0 ? (
                <span style={MUTED_XS}>ยังไม่มีแม่แบบสิทธิ์ในระบบ</span>
              ) : (
                <div className='flex items-center justify-center w-full flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
                  <Donut
                    segments={approvalSegments}
                    size={148}
                    centerLabel={num(accessControls.length)}
                    centerSub='แม่แบบ'
                  />
                  <DonutLegend segments={approvalSegments} />
                </div>
              )}
            </WidgetCard>

            <WidgetCard title='บุคลากรตามตำแหน่ง' subtitle='นับจากหน่วยงานหลักของแต่ละคน'>
              {usersByPosition.length === 0 ? (
                <span style={MUTED_XS}>ยังไม่มีบุคลากรในทะเบียน</span>
              ) : (
                <div className='flex items-center justify-center w-full flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
                  <Donut
                    segments={usersByPosition}
                    size={148}
                    centerLabel={num(users.length)}
                    centerSub='คน'
                  />
                  <DonutLegend segments={usersByPosition} />
                </div>
              )}
            </WidgetCard>

            <WidgetCard title='บุคลากรตามศูนย์บริการ' subtitle='เรียงจากมากไปน้อย'>
              {usersByCenter.length === 0 ? (
                <span style={MUTED_XS}>ยังไม่มีบุคลากรในทะเบียน</span>
              ) : (
                <HBarList rows={usersByCenter} valueLabel='คน' maxVisibleRows={4.5} />
              )}
            </WidgetCard>
          </div>
        </section>

        {/* ── การใช้งานระบบ (TOR §1.17.4.3) ────────────────────────────── */}
        <section className='flex flex-col w-full' style={{ ...CARD, gap: 'var(--dim-space-400)' }}>
          <SectionHead
            title='การใช้งานระบบ'
            subtitle={`TOR §1.17.4.3 — ${scopeLabel} · ระยะเวลาเฉลี่ยต่อครั้ง ${report.summary.avgSessionMinutes} นาที · เฉลี่ยต่อคน ${formatMinutes(report.summary.avgPerUserMinutes)}`}
            right={(
              <ColorfulBadge style={report.hasData ? 'green' : 'grey'} size='small' hierarchy='secondary' width='hug'>
                {report.hasData ? `${num(report.summary.totalSessions)} ครั้งการใช้งาน` : 'ไม่มีข้อมูลในขอบเขตนี้'}
              </ColorfulBadge>
            )}
          />
          {!report.hasData ? (
            <span style={MUTED_XS}>ศูนย์นี้ยังไม่เปิดใช้ระบบ จึงยังไม่มีสถิติการใช้งาน — เลือกขอบเขตอื่นเพื่อดูรายงาน</span>
          ) : (
            <div
              className='w-full'
              style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'var(--dim-space-400)' }}
            >
              <WidgetCard
                title='ยอดผู้ใช้งานรายเดือน'
                subtitle={`${MONTH_LABELS[0]} – ${MONTH_LABELS[MONTH_LABELS.length - 1]}`}
                span={2}
              >
                <VBars months={MONTH_LABELS} series={barSeries} height={200} barMaxWidth={18} />
              </WidgetCard>

              <WidgetCard title='ช่วงเวลาการใช้งาน' subtitle='ชั่วโมงที่ระบบถูกใช้หนักที่สุด'>
                <HBarList rows={hourlyRows} valueLabel='ครั้ง' maxVisibleRows={4.5} />
              </WidgetCard>

              <WidgetCard title='ปริมาณการใช้งานแต่ละฟังก์ชัน' subtitle='นับตามจำนวนครั้งที่เรียกใช้' span={3}>
                <HBarList rows={functionRows} valueLabel='ครั้ง' maxVisibleRows={5.5} />
              </WidgetCard>
            </div>
          )}
        </section>

        {/* ── ทะเบียนที่ต้องดูแล ───────────────────────────────────────── */}
        <section className='flex flex-col w-full' style={{ ...CARD, gap: 'var(--dim-space-300)' }}>
          <SectionHead
            title='ทะเบียนที่ต้องดูแล'
            subtitle='กด "จัดการ" เพื่อไปหน้าที่แก้ไขทะเบียนนั้นโดยตรง'
          />
          <Table columns={registryCols} rows={registryRows} rowKey={(r) => r.id} />
        </section>
      </div>
    </QueuePageShell>
  );
}
