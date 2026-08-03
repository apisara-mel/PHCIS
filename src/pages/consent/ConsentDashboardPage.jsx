import React, { useMemo, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import FilterDateTag from '@/components/forms/FilterDateTag';
import Icon from '@/components/icons/Icon';
import { Donut } from '@/components/graph/Charts';
import { CONSENT_RECORDS, CONSENT_STATUS, CONSENT_SUMMARY, CONSENT_TYPE_TONE } from '@/data/consentRecords';
import { CONSENT_REPORTS } from '@/data/consentReports';
import {
  DASHBOARD_LAYOUTS, WIDGET_TYPES,
  getDefaultDashboardTemplate,
} from '@/data/consentDashboardTemplates';
import CONSENT_NAV from '@/pages/consent/consentNav';
import { ConsentReportSections, ReportCard, scaleForQuick } from '@/pages/consent/ConsentReportPage';
import { CONSENT_DASHBOARD_REPORTS } from '@/data/consentReports';

/* PHCIS | Consent — แดชบอร์ด (TOR ด.1.1.12 + ด.1.1.9).
   /consent/dashboard → widget grid จาก template มาตรฐาน + สถิติและรายงาน.
   Filter วัน + นำส่งออกรายงาน อยู่แถว SubHeader ขวา (เดียวกับชื่อ "แดชบอร์ด"). */

const PIE_PALETTE = ['#14B8A6', '#EC4899', '#6366F1', '#F59E0B'];

const CARD_STYLE = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600)',
};
const TITLE_TEXT = {
  color: 'var(--text-brandPrimary-default)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-base)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.4,
};
const BODY_TEXT = {
  color: 'var(--text-content-secondary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.6,
};
const MUTED_XS = { ...BODY_TEXT, color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)' };

const WIDGET_TYPE_DATASETS = {
  stat:  ['summary', 'reports'],
  donut: ['records', 'reports'],
  bars:  ['reports', 'records'],
  table: ['records', 'reports'],
};

const defaultDatasetFor = (type) => (WIDGET_TYPE_DATASETS[type] || ['records'])[0];
const effectiveDataset = (widget) =>
  ((WIDGET_TYPE_DATASETS[widget.type] || []).includes(widget.dataset)
    ? widget.dataset
    : defaultDatasetFor(widget.type));

const parseStatNum = (v) => Number(String(v).replace(/[^0-9.]/g, '')) || 0;

const donutSegments = () => {
  const buckets = [
    { label: 'ยินยอมแล้ว', match: ['ยินยอมแล้ว'] },
    { label: 'รอดำเนินการ', match: ['รอลงนาม', 'อยู่ระหว่างลงนาม', 'มีเวอร์ชันใหม่', 'ขอเพิกถอน'] },
    { label: 'ปฏิเสธ / ถอน', match: ['ปฏิเสธ', 'ถอนความยินยอม', 'ยกเลิกคำขอ'] },
    { label: 'หมดอายุ / ใกล้หมด', match: ['หมดอายุ', 'ใกล้หมดอายุ', 'หมดอายุ-Reconsent'] },
  ];
  return buckets.map((b, i) => ({
    label: b.label,
    color: PIE_PALETTE[i % PIE_PALETTE.length],
    value: CONSENT_RECORDS.filter((r) => b.match.includes(r.status)).length,
  })).filter((s) => s.value > 0);
};

const reportDonutSegments = () => (CONSENT_REPORTS[0].stats || [])
  .filter((s) => !String(s.value).includes('%'))
  .map((s, i) => ({ label: s.label, color: PIE_PALETTE[i % PIE_PALETTE.length], value: parseStatNum(s.value) }))
  .filter((s) => s.value > 0);

const RECENT_COLUMNS = [
  { key: 'hn', header: 'HN', width: 100, render: (r) => <span style={BODY_TEXT}>{r.hn}</span> },
  { key: 'name', header: 'ชื่อ-นามสกุล', width: 180, render: (r) => <span className='truncate' style={{ ...BODY_TEXT, color: 'var(--text-content-default)' }}>{r.name}</span> },
  { key: 'type', header: 'ประเภท', width: 120, render: (r) => <ColorfulBadge style={CONSENT_TYPE_TONE[r.type] || 'grey'} size='small' hierarchy='secondary' width='hug'>{r.type}</ColorfulBadge> },
  { key: 'status', header: 'สถานะ', width: 140, render: (r) => <ColorfulBadge style={(CONSENT_STATUS[r.status] || {}).tone || 'grey'} size='small' hierarchy='secondary' width='hug'>{r.status}</ColorfulBadge> },
  { key: 'createdDate', header: 'วันที่สร้าง', width: 150, render: (r) => <span style={MUTED_XS}>{r.createdDate}</span> },
];

const statCardFor = (title) =>
  CONSENT_SUMMARY.find((c) => title && title.includes(c.label)) || CONSENT_SUMMARY[0];

const REPORT_STAT_TILES = {
  positive: { tileBg: 'var(--surface-statussummarycard-positive, #D1F6EE)', iconInk: 'var(--text-statussummarycard-positive-number, #196C65)' },
  danger:   { tileBg: 'var(--surface-danger-tertiary, #FEE2E2)',            iconInk: 'var(--text-danger-default, #B91C1C)' },
  info:     { tileBg: 'var(--surface-statussummarycard-info, #DBEAFE)',     iconInk: 'var(--text-statussummarycard-info-number, #1D4ED8)' },
};
const reportStatCardFor = (title) => {
  const stats = CONSENT_REPORTS[0].stats || [];
  const s = stats.find((x) => title && title.includes(x.label)) || stats[0];
  return {
    icon: s.icon, value: s.value, label: `${s.label} (รายงาน 16.1)`,
    indicatorIcon: null,
    ...(REPORT_STAT_TILES[s.tone] || REPORT_STAT_TILES.info),
  };
};

function WidgetBody({ widget, compact = false }) {
  const dataset = effectiveDataset(widget);
  if (widget.type === 'stat') {
    return <SummaryCard card={dataset === 'reports' ? reportStatCardFor(widget.title) : statCardFor(widget.title)} variant='panel' />;
  }
  if (widget.type === 'donut') {
    const segments = dataset === 'reports' ? reportDonutSegments() : donutSegments();
    const total = segments.reduce((a, s) => a + s.value, 0);
    return (
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
        <Donut segments={segments} size={compact ? 110 : 150} thickness={compact ? 16 : 22} centerLabel={total.toLocaleString('th-TH')} centerSub='รายการ' />
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
          {segments.map((s) => (
            <div key={s.label} className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
              <span aria-hidden style={{ width: 10, height: 10, borderRadius: 'var(--dim-radius-full)', background: s.color, flexShrink: 0 }} />
              <span style={MUTED_XS}>{s.label}</span>
              <span style={{ ...MUTED_XS, color: s.color }}>{s.value.toLocaleString('th-TH')}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (dataset === 'reports') {
    const report = CONSENT_REPORTS[0];
    return <Table columns={report.table.columns} rows={report.table.rows.slice(0, compact ? 3 : 5)} rowKey={(r) => `${r.hn}-${r.date}`} />;
  }
  const rows = CONSENT_RECORDS.slice(0, compact ? 3 : 5);
  return <Table columns={RECENT_COLUMNS} rows={rows} rowKey={(r) => r.id} />;
}

const widgetMeta = (type) => WIDGET_TYPES.find((w) => w.key === type) || WIDGET_TYPES[0];

export default function ConsentDashboardPage() {
  const [pageDate, setPageDate] = useState({ quick: 'thismonth' });
  const [exportReport, setExportReport] = useState(null);
  const [viewReport, setViewReport] = useState(null);

  const consentStatsReport = useMemo(
    () => CONSENT_DASHBOARD_REPORTS.find((r) => r.key === 'consent-stats'),
    [],
  );
  const dateScale = scaleForQuick(pageDate.quick);

  const template = getDefaultDashboardTemplate();
  const layout = DASHBOARD_LAYOUTS.find((l) => l.key === template.layout) || DASHBOARD_LAYOUTS[1];
  const widgets = useMemo(
    () => template.widgets.filter((w) => w.type !== 'bars'),
    [template.widgets],
  );

  return (
    <QueuePageShell
      activeKey='consent-dashboard'
      sidebarItems={CONSENT_NAV}
      sidebarFallbackKey='consent-dashboard'
      brandTitle='ระบบจัดการความยินยอม'
      breadcrumb={['แดชบอร์ด']}
      title='แดชบอร์ด'
      actions={(
        <>
          <FilterDateTag prefix='วัน:' value={pageDate} onChange={setPageDate} defaultQuick='thismonth' />
          <NeutralSubdueButton
            leadingIcon='ios_share'
            size='md'
            onClick={() => setExportReport({ key: 'all', title: 'รายงานทั้งหมด' })}
          >
            นำส่งออกรายงาน
          </NeutralSubdueButton>
        </>
      )}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
        {consentStatsReport && (
          <ReportCard
            report={consentStatsReport}
            scale={dateScale}
            onExport={setExportReport}
            onView={setViewReport}
          />
        )}

        {widgets.length === 0 ? (
          <section className='flex flex-col items-center justify-center' style={{ ...CARD_STYLE, minHeight: 220, gap: 'var(--dim-space-300)' }}>
            <Icon name='dashboard' size={32} color='var(--text-content-tertiary)' />
            <span style={BODY_TEXT}>ยังไม่มี widget บนแดชบอร์ด</span>
          </section>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
              gap: 'var(--dim-space-400)',
            }}
          >
            {widgets.map((w) => (
              <section
                key={w.id}
                className='flex flex-col min-w-0'
                style={{
                  ...CARD_STYLE,
                  gap: 'var(--dim-space-300)',
                  gridColumn: w.type === 'table' ? `span ${Math.min(2, layout.columns)}` : 'auto',
                }}
              >
                <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                  <Icon name={widgetMeta(w.type).icon} size={18} color='var(--text-brandPrimary-default)' />
                  <h2 style={TITLE_TEXT}>{w.title}</h2>
                </div>
                <WidgetBody widget={w} />
              </section>
            ))}
          </div>
        )}

        <section className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)', paddingTop: 'var(--dim-space-400)', borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)' }}>
          <h2 style={TITLE_TEXT}>สถิติและรายงาน</h2>
          <ConsentReportSections
            pageDate={pageDate}
            onPageDateChange={setPageDate}
            hideToolbar
            exportReport={exportReport}
            onExportReportChange={setExportReport}
            viewReport={viewReport}
            onViewReportChange={setViewReport}
            excludeKeys={['consent-stats']}
          />
        </section>
      </div>
    </QueuePageShell>
  );
}
