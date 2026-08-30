import React, { useEffect, useMemo, useState } from 'react';
import Topic from '@/components/topic/Topic';
import Table from '@/components/table/Table';
import Popup from '@/components/popup/Popup';
import Pagination from '@/components/pagination/Pagination';
import Icon from '@/components/icons/Icon';
import FilterTag from '@/components/forms/FilterTag';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import { Reveal } from '@/components/graph/Charts';
import { computeQuickRange, computeQuickSingle } from '@/components/popup/DateFilterPopup';
import {
  DateInputBox,
  buildReportTableColumns,
} from '@/pages/consent/consentExportPopup';
import { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import { sanitizeExportReportMeta } from '@/utils/exportPiiSanitize';
import { formatIsoDateThai, toIsoDate } from '@/data/dashboardCommon';

/* ── Shared building blocks for every §1.20 report page ──────────────────────
   Extracted from the canonical mih-report-page implementation
   (src/pages/pharmacy/PharmacyReportsPage.jsx) so the six dashboard report
   screens stay byte-for-byte consistent without editing another module's file.

   Everything here is token-only (design.md) — no hex, no px literals except
   inside SVG viewBox math (there is none in this file). */

export const DASHBOARD_EXPORT_FOOTER =
  'ออกเอกสารโดยระบบรายงานและแพลตฟอร์มวิเคราะห์ข้อมูล สำนักอนามัย กรุงเทพมหานคร (PHCIS)';

export const VIEW_PAGE_SIZE = 20;

/** Cell values kept in CSV form ("2026-08-10") — reformatted for the screen. */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* ── Date-filter helpers (same semantics as the pharmacy report page) ─────── */

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/* ── ปีงบประมาณ (1 ต.ค. – 30 ก.ย.) ───────────────────────────────────────
   ทุกหน้าแดชบอร์ดต้องมีทั้งตัวกรอง "วัน" และ "ปีงบประมาณ" (มติผู้ใช้ 27 ส.ค. 69)
   ปีงบไม่ได้เป็น state แยก แต่ "เซ็ตช่วงวัน" ให้ — ตัวกรองจึงมีชุดเดียว
   ไม่ขัดกันเอง และตัวเลขบนหน้าเปลี่ยนตามจริง ไม่ใช่แค่เปลี่ยนป้ายกำกับ */
export const FISCAL_YEARS_BE = [2569, 2568, 2567, 2566];

export const FISCAL_YEAR_OPTIONS = FISCAL_YEARS_BE.map((be) => ({
  value: String(be),
  label: `ปีงบประมาณ ${be}`,
}));

/** ปีงบ (พ.ศ.) → ช่วงวันแบบ custom ที่ FilterDateTag / matchesIsoDateFilter เข้าใจ */
export const fiscalYearDateFilter = (be) => {
  const ce = Number(be) - 543;
  if (!Number.isFinite(ce)) return { quick: 'thisyear' };
  return {
    quick: 'custom',
    tab: 'range',
    range: { start: new Date(ce - 1, 9, 1), end: new Date(ce, 8, 30) },
  };
};

/** ช่วงวันปัจจุบันตรงกับปีงบไหน — ไม่ตรงเลยคืน '' (Dropdown แสดง placeholder) */
export const fiscalYearOf = (value) => {
  const range = resolveDateFilterRange(value);
  if (!range) return '';
  const match = FISCAL_YEARS_BE.find((be) => {
    const want = resolveDateFilterRange(fiscalYearDateFilter(be));
    return want
      && want.start.getTime() === range.start.getTime()
      && want.end.getTime() === range.end.getTime();
  });
  return match ? String(match) : '';
};

export const resolveDateFilterRange = (value) => {
  if (!value?.quick || value.quick === 'all') return null;
  if (value.quick === 'custom') {
    if (value.tab === 'single' && value.single) {
      const day = startOfDay(value.single);
      return { start: day, end: day };
    }
    if (value.tab === 'range' && value.range?.start && value.range?.end) {
      return { start: startOfDay(value.range.start), end: startOfDay(value.range.end) };
    }
    return null;
  }
  const single = computeQuickSingle(value.quick);
  if (single) return { start: single, end: single };
  const range = computeQuickRange(value.quick);
  if (!range) return null;
  return { start: startOfDay(range.start), end: startOfDay(range.end) };
};

export const matchesIsoDateFilter = (iso, value) => {
  const range = resolveDateFilterRange(value);
  if (!range) return true;
  if (!iso) return false;
  const d = startOfDay(new Date(`${String(iso).slice(0, 10)}T00:00:00`));
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() >= range.start.getTime() && d.getTime() <= range.end.getTime();
};

export const rangeBoundsIso = (value) => {
  const range = resolveDateFilterRange(value);
  if (!range) return { from: '2000-01-01', to: '2100-12-31' };
  return { from: toIsoDate(range.start), to: toIsoDate(range.end) };
};

export const formatRangeLabel = (from, to, dateFilter) => {
  if (!dateFilter?.quick || dateFilter.quick === 'all') return 'ทั้งหมด';
  if (from === to) return `วันที่ ${formatIsoDateThai(from)}`;
  return `${formatIsoDateThai(from)} – ${formatIsoDateThai(to)}`;
};

/* ── Card chrome ─────────────────────────────────────────────────────────── */

/** Outer domain card — consent/pharmacy report chrome (brand border + shadow). */
export const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
  paddingTop: 'var(--dim-space-600)',
  paddingRight: 'var(--dim-space-600)',
  paddingBottom: 'var(--dim-space-600)',
  paddingLeft: 'var(--dim-space-600)',
};

/** Inner chart panel — plain card border, never the brand border. */
export const CHART_PANEL = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--dim-space-400)',
  minHeight: '100%',
  minWidth: 'min(100%, 280px)',
  flex: '1 1 280px',
  paddingTop: 'var(--dim-space-400)',
  paddingRight: 'var(--dim-space-400)',
  paddingBottom: 'var(--dim-space-400)',
  paddingLeft: 'var(--dim-space-400)',
  borderRadius: 'var(--dim-radius-400)',
  background: 'var(--surface-card-100)',
  border: 'var(--dim-stroke-100) solid var(--border-card-default)',
  boxSizing: 'border-box',
  /* visible ไม่ใช่ hidden — tooltip ของ VBars/LineChart ลอยขึ้นเหนือขอบบนของกราฟ
     (anchor top, translate -100%) ถ้าแผงตัดขอบ ค่าที่ hover จะโดนบังทันที
     (มติผู้ใช้ 30 ส.ค. 69) กราฟทุกตัวคุมความกว้างด้วยกล่องของตัวเองอยู่แล้ว */
  overflow: 'visible',
};

/** Min height so Top-N HBar panels aren't clipped under shorter sibling donuts. */
export const CHART_PANEL_HBAR_MIN_HEIGHT =
  'calc(var(--dim-size-1600, 72px) + (6 * (var(--dim-size-1100, 52px) + var(--dim-space-300, 12px))))';

/** Flat brand section title (same chrome as pharmacy section topics). */
export const SectionTopic = ({ title, subtitle, trailing, style }) => (
  <Topic
    hierarchy='primary'
    state='default'
    title={title}
    subText={subtitle || null}
    showLeadingIcon={false}
    showSubText={Boolean(subtitle)}
    showBadge={false}
    showChevron={false}
    showSuccess={false}
    trailing={trailing}
    style={{
      paddingLeft: 'var(--dim-space-0)',
      paddingRight: 'var(--dim-space-0)',
      paddingTop: 'var(--dim-space-0)',
      paddingBottom: 'var(--dim-space-0)',
      background: 'transparent',
      ...style,
    }}
  />
);

/** One domain group = one white card (graphs only); tables live in ดูรายงาน. */
export const ReportGroupCard = ({ title, subtitle, onView, onExport, extraActions, children }) => (
  <section className='w-full flex flex-col' style={{ ...CARD, gap: 'var(--dim-space-500)' }}>
    <SectionTopic
      title={title}
      subtitle={subtitle}
      trailing={(
        <div className='flex items-center shrink-0 flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
          {extraActions}
          {onView ? (
            <NeutralSubdueButton leadingIcon='visibility' size='sm' collapseLabelBelow='lg' onClick={onView}>
              ดูรายงาน
            </NeutralSubdueButton>
          ) : null}
          {onExport ? (
            <NeutralSubdueButton leadingIcon='ios_share' size='sm' collapseLabelBelow='lg' onClick={onExport}>
              นำส่งออกรายงาน
            </NeutralSubdueButton>
          ) : null}
        </div>
      )}
    />
    {children}
  </section>
);

/** Chart block inside a group. `alignContent='start'` for HBar lists. */
export const ChartPanel = ({ title, hint, children, alignContent = 'center' }) => {
  const isList = alignContent === 'start';
  return (
    <Reveal className='flex flex-col min-w-0 flex-1'>
      <div
        className='w-full h-full'
        style={{
          ...CHART_PANEL,
          ...(isList ? { minHeight: CHART_PANEL_HBAR_MIN_HEIGHT, overflow: 'visible' } : null),
        }}
      >
        <div className='flex flex-col min-w-0 shrink-0' style={{ gap: 'var(--dim-space-100)' }}>
          <span
            style={{
              color: 'var(--text-content-default)',
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-sm)',
              lineHeight: 1.4,
            }}
          >
            {title}
          </span>
          {hint ? (
            <span
              style={{
                color: 'var(--text-content-tertiary)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
                lineHeight: 1.4,
              }}
            >
              {hint}
            </span>
          ) : null}
        </div>
        <div
          className={`flex w-full min-w-0 ${isList ? '' : 'flex-1 min-h-0'}`}
          style={{
            alignItems: isList ? 'flex-start' : 'center',
            justifyContent: isList ? 'flex-start' : 'center',
          }}
        >
          {children}
        </div>
      </div>
    </Reveal>
  );
};

export const ChartsRow = ({ children }) => (
  <div className='flex items-stretch flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
    {children}
  </div>
);

/** Canonical empty state for a chart panel — icon + reason + how to fix. */
export const EmptyChartNote = ({
  text = 'ไม่พบข้อมูลในช่วงเวลาที่เลือก',
  hint = 'ลองขยายช่วงวันที่ในตัวกรอง “ช่วงเวลา” ด้านบน',
  icon = 'search_off',
}) => (
  <div
    className='flex flex-col items-center justify-center w-full text-center'
    style={{
      gap: 'var(--dim-space-200)',
      paddingTop: 'var(--dim-space-600)',
      paddingBottom: 'var(--dim-space-600)',
      paddingLeft: 'var(--dim-space-400)',
      paddingRight: 'var(--dim-space-400)',
    }}
  >
    <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>
      <Icon name={icon} size={28} />
    </span>
    <span
      style={{
        color: 'var(--text-content-secondary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
      }}
    >
      {text}
    </span>
    {hint ? (
      <span
        style={{
          color: 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
        }}
      >
        {hint}
      </span>
    ) : null}
  </div>
);

/** KPI tile — value + label (+ optional unit/tone). */
export const StatTile = ({ label, value, unit, tone, hint }) => {
  const color = tone === 'warning'
    ? 'var(--text-warning-default, #C2410C)'
    : tone === 'danger'
      ? 'var(--text-danger-default, #B91C1C)'
      : tone === 'info'
        ? 'var(--text-info-default, #1D4ED8)'
        /* success + default share the brand green — design.md has no
           text/success token, brandPrimary IS the positive ink. */
        : 'var(--text-brandPrimary-default, #007549)';
  return (
    <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100)' }}>
      <span className='inline-flex items-baseline min-w-0' style={{ gap: 'var(--dim-space-100)' }}>
        <span
          className='tabular-nums truncate'
          /* ตัวเลขล้วนไม่ใช้ Mitr — Mitr เรนเดอร์เลข 0 เป็น *slashed zero* และที่
             24px มันอ่านเป็นสัญลักษณ์ 🚫 "ห้าม" ไม่ใช่ศูนย์ (ยืนยันบนหน้าจริง
             25 ส.ค. 69: การ์ด "ถึงกำหนดวันนี้ 0 รายการ" ดูเหมือนแจ้งเตือน)
             Mitr ไม่มี OpenType feature `zero` ให้ปิดขีดทับ จึงต้องเปลี่ยน
             family เฉพาะ "ตัวเลขที่ยืนเดี่ยว" — หัวข้อ/ข้อความยังใช้ Mitr ตามเดิม.
             ระยะยาวควรแก้ที่ token ใน mih-design (ดู docs/awaiting-components.md) */
          style={{
            color,
            fontFamily: 'var(--type-family-heading-content)',
            fontWeight: 'var(--type-weight-bold)',
            fontSize: 'var(--type-size-2xl, 24px)',
            lineHeight: 1.2,
          }}
        >
          {value}
        </span>
        {unit ? (
          <span
            style={{
              color: 'var(--text-content-tertiary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
            }}
          >
            {unit}
          </span>
        ) : null}
      </span>
      <span
        style={{
          color: 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
          lineHeight: 1.4,
        }}
      >
        {label}
      </span>
      {hint ? (
        <span
          style={{
            color: 'var(--text-content-quaternary, #ADB2B7)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
          }}
        >
          {hint}
        </span>
      ) : null}
    </div>
  );
};

export const StatTileRow = ({ children, columns = 4 }) => (
  <div
    className={`grid grid-cols-2 ${columns >= 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'} w-full`}
    style={{ gap: 'var(--dim-space-400)' }}
  >
    {children}
  </div>
);

/* ── Aggregation helpers ─────────────────────────────────────────────────── */

export const countBy = (rows, keyFn) => {
  const map = new Map();
  (rows || []).forEach((row) => {
    const key = keyFn(row);
    if (key == null || key === '') return;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return map;
};

/** Donut segments from a count map. `keepZero` keeps 0-count legend entries. */
export const donutFromCounts = (countMap, colorFor, labelFor = (k) => k, keepZero = false) => (
  [...countMap.entries()]
    .filter(([, v]) => (keepZero ? true : v > 0))
    .sort((a, b) => b[1] - a[1])
    .map(([key, value], i) => ({
      label: labelFor(key),
      value,
      color: typeof colorFor === 'function' ? colorFor(key, i) : colorFor,
    }))
);

/** HBarList rows from [{label,value}] with one colored segment each. */
export const hbarRows = (items, color, segmentLabel = '') => (
  (items || []).map((it) => ({
    label: it.label,
    value: Number(it.value) || 0,
    segments: [{ value: Number(it.value) || 0, color, label: segmentLabel || it.label }],
  }))
);

/** Flatten table columns/rows into ExportFormatPopup catalog shape. */
export const buildExportReport = (key, title, columns, rows, isoOf) => ({
  key,
  title,
  table: {
    columns: columns.map((c) => ({ key: c.key, header: c.label || c.header || c.key })),
    rows: (rows || []).map((r) => {
      const out = {};
      const iso = typeof isoOf === 'function' ? isoOf(r) : '';
      if (iso) out._iso = String(iso).slice(0, 10);
      columns.forEach((c) => {
        if (typeof c.csv === 'function') out[c.key] = c.csv(r);
        else if (r[c.key] == null || r[c.key] === '') out[c.key] = '';
        else if (typeof r[c.key] === 'object') out[c.key] = '';
        else out[c.key] = r[c.key];
      });
      return out;
    }),
  },
});

/* ── ดูรายงาน popup ──────────────────────────────────────────────────────── */

/** Table popup: chip switcher · date re-scope (validated) · export · pagination. */
export const ReportViewPopup = ({ open, bundle, onClose, onExportReport, footnote }) => {
  const reports = bundle?.reports || [];
  const [activeKey, setActiveKey] = useState('');
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState(() => {
    const y = new Date().getFullYear();
    return { start: new Date(y - 1, 0, 1), end: new Date(y, 11, 31) };
  });

  useEffect(() => {
    if (!open || !reports.length) return;
    setActiveKey(reports[0].key);
    setPage(1);
  }, [open, bundle?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeReport = useMemo(
    () => reports.find((r) => r.key === activeKey) || reports[0] || null,
    [reports, activeKey],
  );
  const sanitized = useMemo(
    () => (activeReport ? sanitizeExportReportMeta(activeReport) : null),
    [activeReport],
  );

  const allRows = useMemo(() => {
    if (!sanitized?.table?.rows) return [];
    return sanitized.table.rows.map((r, i) => ({ ...r, _id: i }));
  }, [sanitized]);

  /* Start > end is rejected inline instead of silently returning zero rows. */
  const invalidRange = !!(dateRange.start && dateRange.end
    && dateRange.start.getTime() > dateRange.end.getTime());

  const rows = useMemo(() => {
    if (invalidRange) return [];
    const startIso = dateRange.start ? toIsoDate(dateRange.start) : null;
    const endIso = dateRange.end ? toIsoDate(dateRange.end) : null;
    return allRows.filter((r) => {
      if (r._iso && startIso && endIso && (r._iso < startIso || r._iso > endIso)) return false;
      return true;
    });
  }, [allRows, dateRange, invalidRange]);

  useEffect(() => { setPage(1); }, [activeKey, dateRange.start, dateRange.end]);

  const pageCount = Math.max(1, Math.ceil(rows.length / VIEW_PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = rows.slice((safePage - 1) * VIEW_PAGE_SIZE, safePage * VIEW_PAGE_SIZE);
  /* Rows come from `buildExportReport`, which stores each cell in its CSV form
     (ISO dates) so exports stay machine-readable. On screen that surfaced as
     "2025-08-10" inside an otherwise Thai UI — reformat ISO dates at render
     time and leave the exported value untouched. */
  const columns = sanitized?.table
    ? buildReportTableColumns(sanitized.table.columns).map((col) => {
      const base = col.render;
      return {
        ...col,
        /* Swap the value *before* the shared renderer runs — it wraps some
           columns in JSX (nowrap / badge), so post-processing its output
           would miss exactly the date columns that need reformatting. */
        render: (r) => {
          const v = r?.[col.key];
          if (typeof v === 'string' && ISO_DATE_RE.test(v)) {
            const thai = formatIsoDateThai(v);
            return base ? base({ ...r, [col.key]: thai }) : thai;
          }
          return base ? base(r) : v;
        },
      };
    })
    : [];

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='extraLarge'
      title={bundle?.title || sanitized?.title || 'รายงาน'}
      primaryAction={{ label: 'ปิด', onClick: onClose }}
    >
      {sanitized?.table ? (
        <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
          <div className='flex items-start justify-between flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
              <div className='flex items-end flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                <DateInputBox
                  label='วันที่เริ่มต้น'
                  placeholder='เลือกวันที่'
                  value={dateRange.start}
                  onChange={(d) => setDateRange((prev) => ({ ...prev, start: d }))}
                />
                <span style={{ color: 'var(--text-content-tertiary)', flexShrink: 0 }}>-</span>
                <DateInputBox
                  label='วันที่สิ้นสุด'
                  placeholder='เลือกวันที่'
                  value={dateRange.end}
                  onChange={(d) => setDateRange((prev) => ({ ...prev, end: d }))}
                />
              </div>
              {invalidRange ? (
                <span
                  style={{
                    color: 'var(--text-danger-default, #B91C1C)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-xs)',
                  }}
                >
                  วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด — แก้ไขช่วงวันที่เพื่อดูข้อมูล
                </span>
              ) : null}
            </div>
            <NeutralSubdueButton
              leadingIcon='ios_share'
              size='sm'
              disabled={invalidRange}
              onClick={() => onExportReport?.(activeReport)}
            >
              นำส่งออกรายงาน
            </NeutralSubdueButton>
          </div>

          {reports.length > 1 ? (
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
              {reports.map((r) => (
                <FilterTag
                  key={r.key}
                  value={r.title}
                  selected={activeKey === r.key}
                  onClick={() => setActiveKey(r.key)}
                />
              ))}
            </div>
          ) : null}

          {/* No inner scroller — `Popup` already scrolls its own body. A second
              `maxHeight: 58vh` box nested inside it clipped the "แสดง 1-20 จาก
              N รายการ" row + pager against the popup's bottom edge, and left
              two scrollbars fighting over the same table. */}
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <span
              style={{
                color: 'var(--text-brandPrimary-default)',
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-base)',
                lineHeight: 1.4,
              }}
            >
              รายการ
            </span>
            <Table
              columns={columns}
              rows={pageRows}
              rowKey={(r) => r._id}
              emptyMessage={invalidRange ? 'ช่วงวันที่ไม่ถูกต้อง' : 'ไม่พบข้อมูลในช่วงเวลาที่เลือก'}
              emptySubtext={invalidRange ? 'วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด' : 'ลองขยายช่วงวันที่'}
              pagination={false}
            />
            {footnote ? (
              <span
                style={{
                  color: 'var(--text-content-tertiary)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xs)',
                }}
              >
                {footnote}
              </span>
            ) : null}
            <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-600)' }}>
              <span
                style={{
                  flex: 1,
                  color: 'var(--text-content-secondary)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                  lineHeight: 1.5,
                }}
              >
                แสดง {rows.length === 0 ? 0 : (safePage - 1) * VIEW_PAGE_SIZE + 1}
                -{Math.min(safePage * VIEW_PAGE_SIZE, rows.length)} จาก {rows.length} รายการ
              </span>
              <Pagination currentPage={safePage} pageCount={pageCount} onPageChange={setPage} />
            </div>
          </div>
        </div>
      ) : null}
    </Popup>
  );
};

/** Toolbar card that hosts FilterDateTag + chips + the page-level export button.
 *  Sticks under the page chrome so the active period and filters stay visible
 *  while scrolling through a long stack of report cards (Nielsen #1). */
export const ReportToolbar = ({ children, trailing }) => (
  <section
    className='w-full flex items-center justify-between flex-wrap'
    style={{
      ...CARD,
      gap: 'var(--dim-space-300)',
      paddingTop: 'var(--dim-space-300)',
      paddingBottom: 'var(--dim-space-300)',
      paddingLeft: 'var(--dim-space-400)',
      paddingRight: 'var(--dim-space-400)',
      position: 'sticky',
      /* ใช้ค่าเดียวกับหัวตาราง sticky ของ QueuePageShell — ห้ามเขียน px เอง
         (fallback ของ shell คือ 64+72+49 = 185px ไม่ใช่ 113px) */
      top: QUEUE_STICKY_UNDER_TABS,
      zIndex: 20,
    }}
  >
    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
      {children}
    </div>
    {trailing}
  </section>
);

export default ReportGroupCard;
