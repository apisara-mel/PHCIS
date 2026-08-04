import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Icon from '@/components/icons/Icon';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import Alert from '@/components/alert/Alert';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import PrimarySearch from '@/components/search/PrimarySearch';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import { VBars, Donut, HBarList } from '@/components/graph/Charts';
import { PALETTE } from '@/pages/audit/auditData';
import {
  MONTH_LABELS,
  THAI_MONTHS,
  buildUsageReport,
  exportSpreadsheet,
  formatMinutes,
  printReport,
} from '@/data/userUsageReports';
import { getAuditLog, subscribeAuditLog } from '@/pages/audit/auditData';
import {
  EmptyState,
  ModuleCard,
  PermissionGate,
  ReadOnlyNotice,
  SectionTitle,
  auditAdmin,
  centerLabel,
  currentUserName,
  isBureauAdmin,
  useActiveCenter,
} from '@/pages/users/usersShared';

/* UserUsageReportPage — TOR §1.17.4.3 "รายงานยอดผู้ใช้งานระบบแบบ realtime
   ประวัติการใช้งาน และส่งออกเป็น XLS / PDF".

   แถบเงื่อนไขด้านบนเลียนแบบคู่มือระบบสารสนเทศส่วนกลาง (MIS/EIS) หน้า 1-4:
   ขอบเขต "ทุกศูนย์ / ศูนย์บริการสาธารณสุข: [ศูนย์]" + ช่วงเวลา "เดือน/พ.ศ."
   หรือ "ตั้งแต่วันที่–ถึงวันที่" และหัวเอกสารของไฟล์ที่ส่งออกต้องมี
   ชื่อรายงาน · ขอบเขต · ช่วงเวลา · ผู้ออกรายงาน · วันเวลาที่ออก. */

const breadcrumb = ['ระบบงานผู้ดูแลระบบ', 'ผู้ใช้และสิทธิ์การเข้าถึง', 'รายงานการใช้งาน'];
const PRINT_AREA_ID = 'mih-report-print-area';
const PAGE_SIZE = 20;

const TABS = [
  { key: 'overview',  label: 'ภาพรวม',            icon: 'monitoring' },
  { key: 'people',    label: 'รายบุคคล',          icon: 'group' },
  { key: 'functions', label: 'รายฟังก์ชัน',        icon: 'donut_small' },
  { key: 'history',   label: 'ประวัติการใช้งาน',   icon: 'history' },
];

const PERIOD_MODES = [
  { value: 'month', label: 'เดือน / พ.ศ.' },
  { value: 'range', label: 'ตั้งแต่วันที่ – ถึงวันที่' },
];

const YEARS = [2567, 2568, 2569].map((y) => ({ value: String(y), label: `พ.ศ. ${y}` }));
const MONTH_OPTIONS = THAI_MONTHS.map((m, i) => ({ value: String(i), label: m }));

/* print stylesheet — พิมพ์เฉพาะเนื้อรายงาน ตัด sidebar/header/nav ออก */
const PRINT_STYLE_ID = 'mih-report-print-style';
const ensurePrintStyle = () => {
  if (typeof document === 'undefined') return;
  let el = document.getElementById(PRINT_STYLE_ID);
  if (!el) {
    el = document.createElement('style');
    el.id = PRINT_STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = `
    @media print {
      body * { visibility: hidden !important; }
      #${PRINT_AREA_ID}, #${PRINT_AREA_ID} * { visibility: visible !important; }
      #${PRINT_AREA_ID} {
        position: absolute !important;
        left: 0; top: 0; width: 100%;
        box-shadow: none !important;
        border: 0 !important;
      }
      .mih-report-no-print { display: none !important; }
    }
  `;
};

const UserUsageReportPage = () => {
  const history = useHistory();
  const { center, label: centerName } = useActiveCenter();
  const bureau = isBureauAdmin();

  const [activeTab, setActiveTab] = useState('overview');
  const [scope, setScope] = useState(bureau ? 'all' : 'center');
  const [periodMode, setPeriodMode] = useState('month');
  const [month, setMonth] = useState('7');            /* สิงหาคม */
  const [year, setYear] = useState('2569');
  const [from, setFrom] = useState('2026-08-01');
  const [to, setTo] = useState('2026-08-03');
  const [peopleQ, setPeopleQ] = useState('');
  const [peoplePage, setPeoplePage] = useState(1);
  const [logFilters, setLogFilters] = useState({ user: 'all', mod: 'all', ok: 'all' });
  const [logQ, setLogQ] = useState('');
  const [logRows, setLogRows] = useState(() => getAuditLog());
  const [exported, setExported] = useState('');

  useEffect(() => { ensurePrintStyle(); }, []);

  /* realtime feed — useEffect + useState ธรรมดา (React 17: ห้าม useSyncExternalStore) */
  useEffect(() => {
    const unsubscribe = subscribeAuditLog(() => setLogRows(getAuditLog()));
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, []);

  useEffect(() => { setPeoplePage(1); }, [peopleQ, scope, center]);

  const rangeInvalid = periodMode === 'range' && from && to && new Date(from) > new Date(to);

  const periodLabel = periodMode === 'month'
    ? `${THAI_MONTHS[Number(month)]} ${year}`
    : `${from || '—'} ถึง ${to || '—'}`;
  const scopeLabel = scope === 'all' ? 'ทุกศูนย์บริการสาธารณสุข' : `ศูนย์บริการสาธารณสุข: ${centerName}`;

  const report = useMemo(
    () => buildUsageReport({ scope, center }),
    [scope, center],
  );

  const summaryCards = useMemo(() => ([
    { key: 'total',   label: 'ผู้ใช้ทั้งหมดในขอบเขต', value: report.summary.total,   color: 'brand',    icon: 'group' },
    { key: 'active',  label: 'ใช้งานในเดือนนี้',      value: report.summary.active,  color: 'positive', icon: 'trending_up' },
    { key: 'new',     label: 'ผู้ใช้ใหม่เดือนนี้',     value: report.summary.newThisMonth, color: 'info', icon: 'person_add' },
    { key: 'dormant', label: 'ไม่ได้ใช้งาน > 90 วัน',  value: report.summary.dormant, color: report.summary.dormant ? 'destructive' : 'positive', icon: 'schedule' },
  ]), [report]);

  const barSeries = useMemo(() => ([
    { name: 'ผู้ใช้งานรายเดือน', color: PALETTE[0], values: report.monthly },
  ]), [report.monthly]);

  const donutSegments = useMemo(
    () => report.functions.map((f, i) => ({ label: f.label, value: f.value, color: PALETTE[i % PALETTE.length] })),
    [report.functions],
  );
  const donutTotal = donutSegments.reduce((a, s) => a + s.value, 0);

  /* ── รายบุคคล ─────────────────────────────────────────────────────── */
  const peopleRows = useMemo(() => {
    const q = peopleQ.trim().toLowerCase();
    if (!q) return report.rows;
    return report.rows.filter((r) => [r.name, r.roleLabel, r.deptLabel].some((f) => f && f.toLowerCase().includes(q)));
  }, [report.rows, peopleQ]);

  const peopleTotalPages = Math.max(1, Math.ceil(peopleRows.length / PAGE_SIZE));
  const peopleSafePage = Math.min(peoplePage, peopleTotalPages);
  const peoplePageRows = peopleRows.slice((peopleSafePage - 1) * PAGE_SIZE, peopleSafePage * PAGE_SIZE);

  const peopleColumns = useMemo(() => ([
    { key: 'name', label: 'ชื่อเจ้าหน้าที่', flex: true, minWidth: 200 },
    { key: 'roleLabel', label: 'บทบาท', width: 150 },
    { key: 'deptLabel', label: 'แผนก', width: 210 },
    { key: 'center', label: 'ศูนย์', width: 190, render: (r) => centerLabel(r.center) },
    { key: 'sessions', label: 'จำนวนครั้ง', width: 120, render: (r) => r.sessions.toLocaleString('th-TH') },
    { key: 'minutes', label: 'ระยะเวลารวม', width: 150, render: (r) => formatMinutes(r.minutes) },
    { key: 'avgMinutes', label: 'เฉลี่ย/ครั้ง', width: 130, render: (r) => `${r.avgMinutes} นาที` },
    { key: 'lastActive', label: 'เข้าใช้ล่าสุด', width: 170 },
    {
      key: 'status', label: 'สถานะ', width: 130, sortable: false,
      render: (r) => <ColorfulBadge style={r.status === 'active' ? 'green' : 'grey'} size='small' showDot>{r.status === 'active' ? 'ใช้งาน' : 'ปิดใช้งาน'}</ColorfulBadge>,
    },
  ]), []);

  /* ── ประวัติการใช้งาน ─────────────────────────────────────────────── */
  const userOptions = useMemo(() => ([
    { value: 'all', label: 'ทุกผู้ใช้' },
    ...[...new Set(logRows.map((r) => r.user))].map((u) => ({ value: u, label: u })),
  ]), [logRows]);
  const modOptions = useMemo(() => ([
    { value: 'all', label: 'ทุกโมดูล' },
    ...[...new Set(logRows.map((r) => r.mod))].map((m) => ({ value: m, label: m })),
  ]), [logRows]);

  const filteredLog = useMemo(() => {
    let rows = logRows;
    if (logFilters.user !== 'all') rows = rows.filter((r) => r.user === logFilters.user);
    if (logFilters.mod !== 'all') rows = rows.filter((r) => r.mod === logFilters.mod);
    if (logFilters.ok !== 'all') rows = rows.filter((r) => (logFilters.ok === 'ok' ? r.ok : !r.ok));
    const q = logQ.trim().toLowerCase();
    if (q) rows = rows.filter((r) => [r.user, r.action, r.mod].some((f) => f && f.toLowerCase().includes(q)));
    return rows;
  }, [logRows, logFilters, logQ]);

  const logColumns = useMemo(() => ([
    { key: 'time', label: 'เวลา', width: 170 },
    { key: 'user', label: 'ผู้ใช้', flex: true, minWidth: 180 },
    { key: 'action', label: 'การกระทำ', flex: true, minWidth: 200 },
    { key: 'mod', label: 'โมดูล', width: 180 },
    {
      key: 'ok', label: 'ผล', width: 120, sortable: false,
      render: (r) => <ColorfulBadge style={r.ok ? 'green' : 'red'} size='small' icon={r.ok ? 'check_circle' : 'cancel'}>{r.ok ? 'สำเร็จ' : 'ล้มเหลว'}</ColorfulBadge>,
    },
  ]), []);

  /* ── export ───────────────────────────────────────────────────────── */
  const exportMeta = () => ([
    ['ขอบเขต', scopeLabel],
    ['ช่วงเวลา', periodLabel],
    ['ผู้ออกรายงาน', currentUserName()],
    ['วันเวลาที่ออกรายงาน', new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })],
  ]);

  const canExport = report.hasData && !rangeInvalid;

  const doExportXls = () => {
    const isHistory = activeTab === 'history';
    exportSpreadsheet({
      title: isHistory ? 'รายงานประวัติการใช้งานระบบ (History Log)' : 'รายงานยอดผู้ใช้งานระบบ PHCIS',
      meta: exportMeta(),
      columns: isHistory
        ? [
          { label: 'เวลา', value: (r) => r.time },
          { label: 'ผู้ใช้', value: (r) => r.user },
          { label: 'การกระทำ', value: (r) => r.action },
          { label: 'โมดูล', value: (r) => r.mod },
          { label: 'ผล', value: (r) => (r.ok ? 'สำเร็จ' : 'ล้มเหลว') },
        ]
        : [
          { label: 'ชื่อเจ้าหน้าที่', value: (r) => r.name },
          { label: 'บทบาท', value: (r) => r.roleLabel },
          { label: 'แผนก', value: (r) => r.deptLabel },
          { label: 'ศูนย์', value: (r) => centerLabel(r.center) },
          { label: 'จำนวนครั้ง', value: (r) => r.sessions },
          { label: 'ระยะเวลารวม (นาที)', value: (r) => r.minutes },
          { label: 'เฉลี่ยต่อครั้ง (นาที)', value: (r) => r.avgMinutes },
          { label: 'เข้าใช้ล่าสุด', value: (r) => r.lastActive },
          { label: 'สถานะ', value: (r) => (r.status === 'active' ? 'ใช้งาน' : 'ปิดใช้งาน') },
        ],
      rows: isHistory ? filteredLog : peopleRows,
      filename: isHistory ? 'phcis-history-log.xls' : 'phcis-user-usage.xls',
    });
    auditAdmin(`ส่งออกรายงาน${isHistory ? 'ประวัติการใช้งาน' : 'การใช้งานผู้ใช้'} เป็นไฟล์ XLS (${scopeLabel} · ${periodLabel})`);
    setExported('ส่งออกไฟล์ตาราง (.xls) เรียบร้อยแล้ว');
    setTimeout(() => setExported(''), 4000);
  };

  const doPrintPdf = () => {
    auditAdmin(`พิมพ์/บันทึกรายงานเป็น PDF (${scopeLabel} · ${periodLabel})`);
    printReport(PRINT_AREA_ID);
  };

  /* ── เงื่อนไขรายงาน (คู่มือ MIS หน้า 1-4) ──────────────────────────── */
  const conditionBar = (
    <ModuleCard className='mih-report-no-print'>
      <SectionTitle
        icon='filter_alt'
        title='เงื่อนไขรายงาน'
        subtitle='เลือกขอบเขตศูนย์และช่วงเวลา — ค่านี้จะถูกพิมพ์ลงหัวเอกสารของไฟล์ที่ส่งออกทุกครั้ง'
      />
      <div className='grid grid-cols-1 md:grid-cols-4 w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <Select
          label='ขอบเขตข้อมูล'
          searchable={false}
          value={scope}
          onChange={setScope}
          options={[
            { value: 'all', label: 'ทุกศูนย์บริการสาธารณสุข' },
            { value: 'center', label: `ศูนย์บริการสาธารณสุข: ${centerName}` },
          ]}
          disabled={!bureau}
          helperText={bureau
            ? 'ผู้ดูแลระดับสำนักเลือกดูได้ทุกศูนย์'
            : 'ตามกติกาของระบบ ผู้ใช้ระดับศูนย์ดูได้เฉพาะข้อมูลของศูนย์ตัวเองเท่านั้น'}
        />
        <Select
          label='รูปแบบช่วงเวลา'
          searchable={false}
          value={periodMode}
          onChange={setPeriodMode}
          options={PERIOD_MODES}
        />
        {periodMode === 'month' ? (
          <>
            <Select label='เดือน' searchable={false} value={month} onChange={setMonth} options={MONTH_OPTIONS} />
            <Select label='ปี พ.ศ.' searchable={false} value={year} onChange={setYear} options={YEARS} />
          </>
        ) : (
          <>
            <InputField label='ตั้งแต่วันที่' type='date' value={from} onChange={setFrom} error={rangeInvalid ? 'วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด' : undefined} />
            <InputField label='ถึงวันที่' type='date' value={to} onChange={setTo} />
          </>
        )}
      </div>
      {rangeInvalid ? (
        <Alert type='error' title='ช่วงวันที่ไม่ถูกต้อง' subtext='วันที่เริ่มต้นอยู่หลังวันที่สิ้นสุด — แก้ไขก่อนออกรายงานหรือส่งออกไฟล์' />
      ) : null}
      {!bureau ? (
        <Alert
          type='info'
          title='ขอบเขตถูกล็อกไว้ที่ศูนย์ของคุณ'
          subtext={`บัญชีระดับศูนย์ดูได้เฉพาะข้อมูลของ ${centerName} — ตัวเลือก "ทุกศูนย์บริการสาธารณสุข" จึงถูกปิดไว้`}
        />
      ) : null}
      <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <ColorfulBadge style='teal' size='small' icon='sensors'>{`ออนไลน์ตอนนี้ ${report.summary.onlineNow} คน`}</ColorfulBadge>
        <ColorfulBadge style='grey' size='small' icon='history'>{`เหตุการณ์ล่าสุด ${logRows.length} รายการ`}</ColorfulBadge>
        <div className='flex-1' />
        <BrandSubdueButton variant='outline' size='md' leadingIcon='table_view' disabled={!canExport} onClick={doExportXls}>
          ส่งออก Excel (XLS)
        </BrandSubdueButton>
        <NeutralSubdueButton variant='outline' size='md' leadingIcon='picture_as_pdf' disabled={!canExport} onClick={doPrintPdf}>
          พิมพ์ / บันทึก PDF
        </NeutralSubdueButton>
      </div>
      {!canExport ? (
        <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs, 12px)' }}>
          ปุ่มส่งออกถูกปิดเพราะยังไม่มีข้อมูลในเงื่อนไขที่เลือก
        </span>
      ) : null}
      {exported ? <Alert type='success' title='ส่งออกสำเร็จ' subtext={exported} onClose={() => setExported('')} /> : null}
    </ModuleCard>
  );

  const printHeader = (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-050, 2px)' }}>
      <span style={{ color: 'var(--text-content-primary)', fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-bold, 700)' }}>
        รายงานยอดผู้ใช้งานระบบ PHCIS
      </span>
      <span style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-xs, 12px)' }}>
        {scopeLabel} · ช่วงเวลา {periodLabel}
      </span>
      <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs, 12px)' }}>
        ผู้ออกรายงาน {currentUserName()} · ออกเมื่อ {new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })}
      </span>
    </div>
  );

  const noData = !report.hasData;

  const renderOverview = () => (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500, 20px)' }}>
      <ModuleCard>
        {printHeader}
        <SectionTitle icon='bar_chart' title='ยอดผู้ใช้งานรายเดือน' subtitle='12 เดือนย้อนหลัง (ก.ย. 2568 – ส.ค. 2569)' />
        {noData ? (
          <EmptyState icon='bar_chart' title='ไม่มีข้อมูลในช่วงเวลาที่เลือก' subtitle='ลองขยายช่วงเวลา หรือเปลี่ยนขอบเขตศูนย์' />
        ) : (
          <VBars months={MONTH_LABELS} series={barSeries} height={200} barMaxWidth={18} />
        )}
      </ModuleCard>

      <ModuleCard>
        <SectionTitle
          icon='schedule'
          title='ช่วงเวลาการใช้งาน'
          subtitle={`ระยะเวลาเฉลี่ยต่อครั้ง ${report.summary.avgSessionMinutes} นาที · เฉลี่ยต่อคน ${formatMinutes(report.summary.avgPerUserMinutes)}`}
        />
        {noData ? (
          <EmptyState icon='schedule' title='ไม่มีข้อมูลช่วงเวลาการใช้งาน' subtitle='ยังไม่มี session ในเงื่อนไขที่เลือก' />
        ) : (
          <HBarList rows={report.hourly.map((h) => ({ label: h.label, value: h.value, second: h.value }))} valueLabel='ครั้ง' secondLabel='ครั้ง' />
        )}
      </ModuleCard>
    </div>
  );

  const renderPeople = () => (
    <ModuleCard>
      {printHeader}
      <SectionTitle icon='group' title='การใช้งานของเจ้าหน้าที่' subtitle='คลิกแถวเพื่อไปหน้าข้อมูลผู้ใช้รายนั้น' />
      <div className='w-full flex items-start justify-center mih-report-no-print'>
        <PrimarySearch value={peopleQ} onChange={setPeopleQ} onSubmit={setPeopleQ} placeholder='ค้นหาชื่อ / บทบาท / แผนก' width={560} />
      </div>
      {peopleRows.length === 0 ? (
        <EmptyState
          icon='search_off'
          title={peopleQ ? 'ไม่พบเจ้าหน้าที่ที่ตรงกับคำค้น' : 'ไม่มีข้อมูลการใช้งานในขอบเขตนี้'}
          subtitle={peopleQ ? 'ลองพิมพ์คำค้นอื่นหรือล้างคำค้น' : 'เปลี่ยนขอบเขตศูนย์หรือช่วงเวลาแล้วลองใหม่'}
          action={peopleQ ? <NeutralSubdueButton variant='outline' size='md' onClick={() => setPeopleQ('')}>ล้างคำค้น</NeutralSubdueButton> : null}
        />
      ) : (
        <>
          <Table
            columns={peopleColumns}
            rows={peoplePageRows}
            rowKey={(r) => r.id}
            onRowClick={(r) => history.push(`/users/${r.id}`)}
            stickyColCount={1}
            emptyMessage='ไม่พบข้อมูล'
          />
          <div className='flex items-center w-full mih-report-no-print' style={{ gap: 'var(--dim-space-200, 8px)', paddingTop: 'var(--dim-space-200, 8px)', borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary)' }}>
            <span style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-sm, 14px)' }}>
              {`แสดง ${(peopleSafePage - 1) * PAGE_SIZE + 1}–${Math.min(peopleSafePage * PAGE_SIZE, peopleRows.length)} จาก ${peopleRows.length} รายการ`}
            </span>
            <div className='flex-1' />
            <Pagination currentPage={peopleSafePage} pageCount={peopleTotalPages} onPageChange={setPeoplePage} />
          </div>
        </>
      )}
    </ModuleCard>
  );

  const renderFunctions = () => (
    <ModuleCard>
      {printHeader}
      <SectionTitle icon='donut_small' title='ปริมาณการใช้งานรายฟังก์ชัน' subtitle='นับจากจำนวนครั้งที่เปิดใช้แต่ละโมดูลในช่วงเวลาที่เลือก' />
      {noData ? (
        <EmptyState icon='donut_small' title='ไม่มีข้อมูลการใช้งานรายฟังก์ชัน' subtitle='ยังไม่มีเหตุการณ์ในเงื่อนไขที่เลือก' />
      ) : (
        <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-600, 24px)' }}>
          <Donut segments={donutSegments} size={180} thickness={26} centerLabel={donutTotal.toLocaleString('th-TH')} centerSub='ครั้ง' />
          <div className='flex-1' style={{ minWidth: 'min(100%, 360px)' }}>
            <HBarList rows={report.functions.map((f) => ({ label: f.label, value: f.value, second: f.value }))} valueLabel='ครั้ง' secondLabel='ครั้ง' />
          </div>
        </div>
      )}
    </ModuleCard>
  );

  const renderHistory = () => (
    <ModuleCard>
      {printHeader}
      <SectionTitle
        icon='history'
        title='ประวัติการใช้งาน (History Log)'
        subtitle='ไหลเข้าแบบ realtime จากระบบประวัติการใช้งานกลาง — ทุกการกระทำของผู้ดูแลระบบถูกบันทึกที่นี่'
        action={<ColorfulBadge style='teal' size='small' icon='sensors'>realtime</ColorfulBadge>}
      />
      <div className='flex flex-wrap items-start w-full mih-report-no-print' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <OverflowFlexRow itemGap='var(--dim-space-200, 8px)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
          <FilterTag
            value='ทั้งหมด'
            selected={logFilters.user === 'all' && logFilters.mod === 'all' && logFilters.ok === 'all' && !logQ}
            onClick={() => { setLogFilters({ user: 'all', mod: 'all', ok: 'all' }); setLogQ(''); }}
          />
          <FilterDropdown prefix='ผู้ใช้:' options={userOptions} value={logFilters.user} onChange={(v) => setLogFilters((p) => ({ ...p, user: v }))} />
          <FilterDropdown prefix='โมดูล:' options={modOptions} value={logFilters.mod} onChange={(v) => setLogFilters((p) => ({ ...p, mod: v }))} />
          <FilterDropdown
            prefix='ผล:'
            options={[{ value: 'all', label: 'ทั้งหมด' }, { value: 'ok', label: 'สำเร็จ' }, { value: 'fail', label: 'ล้มเหลว' }]}
            value={logFilters.ok}
            onChange={(v) => setLogFilters((p) => ({ ...p, ok: v }))}
          />
        </OverflowFlexRow>
      </div>
      <div className='w-full flex items-start justify-center mih-report-no-print'>
        <PrimarySearch value={logQ} onChange={setLogQ} onSubmit={setLogQ} placeholder='ค้นหาผู้ใช้ / การกระทำ / โมดูล' width={560} />
      </div>
      {filteredLog.length === 0 ? (
        <EmptyState
          icon='search_off'
          title='ไม่พบเหตุการณ์ที่ตรงกับเงื่อนไข'
          subtitle='ลองล้างตัวกรองเพื่อดูประวัติทั้งหมด'
          action={(
            <NeutralSubdueButton variant='outline' size='md' leadingIcon='filter_alt_off' onClick={() => { setLogFilters({ user: 'all', mod: 'all', ok: 'all' }); setLogQ(''); }}>
              ล้างตัวกรอง
            </NeutralSubdueButton>
          )}
        />
      ) : (
        <Table
          columns={logColumns}
          rows={filteredLog.slice(0, 100).map((r, i) => ({ ...r, rowId: `log-${i}` }))}
          rowKey={(r) => r.rowId}
          emptyMessage='ไม่พบเหตุการณ์'
        />
      )}
    </ModuleCard>
  );

  return (
    <QueuePageShell
      activeKey='users'
      breadcrumb={breadcrumb}
      title='รายงานการใช้งานระบบ'
      onBack={() => history.push('/users')}
      backLabel='กลับไปหน้าผู้ใช้'
      summaryCards={summaryCards}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ paddingTop: 'var(--dim-space-600, 24px)', paddingRight: 'var(--dim-space-600, 24px)', paddingBottom: 'var(--dim-space-600, 24px)', paddingLeft: 'var(--dim-space-600, 24px)', gap: 'var(--dim-space-500, 20px)' }}>
        <PermissionGate feature='users.manage' featureLabel='จัดการผู้ใช้และสิทธิ์'>
          {(readOnly) => (
            <>
              {readOnly ? <ReadOnlyNotice feature='รายงานการใช้งาน' /> : null}
              {conditionBar}
              <div id={PRINT_AREA_ID} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500, 20px)' }}>
                {activeTab === 'overview' ? renderOverview() : null}
                {activeTab === 'people' ? renderPeople() : null}
                {activeTab === 'functions' ? renderFunctions() : null}
                {activeTab === 'history' ? renderHistory() : null}
              </div>
              <span className='mih-report-no-print inline-flex items-center' style={{ gap: 'var(--dim-space-150, 6px)', color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs, 12px)' }}>
                <Icon name='info' size={14} />
                ไฟล์ที่ส่งออกเป็น .xls (CSV/SpreadsheetML) และ PDF ผ่านหน้าต่างพิมพ์ของเบราว์เซอร์ — ไม่ใช้ไลบรารีภายนอกเพิ่ม
              </span>
            </>
          )}
        </PermissionGate>
      </div>
    </QueuePageShell>
  );
};

export default UserUsageReportPage;
