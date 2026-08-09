# MIH Report Page — Reference

Companion to [SKILL.md](SKILL.md). Read when implementing a new module report page and you need exact imports / chrome / catalog shape.

## Canonical files

| Role | Path |
|------|------|
| Multi-domain report page | `src/pages/pharmacy/PharmacyReportsPage.jsx` |
| Consent report sections | `src/pages/consent/ConsentReportPage.jsx` |
| Consent dashboard charts | `src/pages/consent/ConsentDashboardPage.jsx` |
| Export + view helpers | `src/pages/consent/consentExportPopup.jsx` |
| PDF/CSV/XLSX download | `src/utils/consentReportExport.js` |
| PII sanitize for export | `src/utils/exportPiiSanitize.js` |
| Chart primitives | `src/components/graph/Charts.jsx` |
| Chart colors | `src/data/phcisChartPalette.js` |
| Date filter chip | `src/components/forms/FilterDateTag.jsx` (`showResolvedDate`, `formatThaiDateRange`) |
| Date popup math | `src/components/popup/DateFilterPopup.jsx` (`computeQuickRange`, `computeQuickSingle`) |
| Section title + actions | `src/components/pharmacy/PharmacySectionTopic.jsx` (or module equivalent) |
| Page shell | `src/templates/QueuePageShell.jsx` |
| Summary card builders | e.g. `src/pages/pharmacy/pharmacySummaryCards.js` |

Other report-ish pages (adapt toward this skill when touching them):

- `src/pages/checkup/CheckupReportsPage.jsx`
- `src/pages/telemed/TelemedReportPage.jsx`
- `src/pages/finance/sections/FinanceReportsSection.jsx`
- `src/pages/users/UserUsageReportPage.jsx`

## Card chrome

**Outer domain card** (group):

```js
const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600)',
};
```

**Inner chart panel**:

```js
const CHART_PANEL = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--dim-space-400)',
  minHeight: '100%',
  minWidth: 'min(100%, 280px)',
  flex: '1 1 280px',
  padding: 'var(--dim-space-400)',
  borderRadius: 'var(--dim-radius-400)',
  background: 'var(--surface-card-100)',
  border: 'var(--dim-stroke-100) solid var(--border-card-default)',
  boxSizing: 'border-box',
  overflow: 'hidden', // list panels: override to visible + minHeight for Top-6
};
```

HBar Top-6 min height (approx):

```js
const CHART_PANEL_HBAR_MIN_HEIGHT =
  'calc(var(--dim-size-1600, 72px) + (6 * (var(--dim-size-1100, 52px) + var(--dim-space-300, 12px))))';
```

## Export catalog shape

```js
const buildExportReport = (key, title, columns, rows, isoOf) => ({
  key,
  title,
  table: {
    columns: columns.map((c) => ({
      key: c.key,
      header: c.label || c.header || c.key,
    })),
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
```

Topics for the popup checkbox list:

```js
const exportTopics = reportsCatalog.map((r) => ({ value: r.key, label: r.title }));
```

## FilterDateTag on reports

```jsx
<FilterDateTag
  prefix='วัน:'
  value={dateFilter}
  onChange={setDateFilter}
  defaultQuick='thismonth'
  showResolvedDate
/>
```

Resolve bounds for chart filtering (module-local helpers are fine; keep ISO `YYYY-MM-DD`):

- Prefer one `resolveDateFilterRange(value) → { start, end } | null`
- `null` / `all` → wide window or skip filter consistently for charts + export catalog

## Chart helpers

```js
const countBy = (rows, keyFn) => { /* Map key → count */ };

const donutFromCounts = (countMap, colorFor, labelFor = (k) => k) =>
  [...countMap.entries()]
    .filter(([, n]) => n > 0)
    .map(([key, value], i) => ({
      label: labelFor(key),
      value,
      color: colorFor(key, i),
    }));
```

```jsx
import { DonutWithLegend, HBarList, VBars, Reveal } from '@/components/graph/Charts';

<DonutWithLegend
  segments={statusDonut}
  size={180}
  centerLabel={String(total)}
  centerSub='รายการ'
/>

<HBarList valueLabel='หน่วย' rows={topSix} />

<VBars
  months={labels}
  series={[{ label: '…', color: PHCIS_CHART.indigo, values }]}
  height={180}
/>
```

## View popup gotchas

- `Table` with `pagination={false}` — page owns `<Pagination />`
- No period chips (รายวัน/สัปดาห์) unless product asks — date range boxes are enough
- Multi-table groups: chip / `FilterTag` row to switch `activeKey`
- Export button exports **active** sanitized report only

## ExportFormatPopup props (non-consent modules)

```jsx
<ExportFormatPopup
  open={!!exportReport}
  report={exportReport}
  catalog={scopedCatalog}
  topics={scopedTopics}
  onClose={() => { setExportReport(null); setExportScopeKeys(null); }}
  documentFooter='ออกเอกสารโดยระบบงาน… (PHCIS)'
  logExportFn={null}
/>
```

Pass `scopeKeys` when opening a group with multiple tables so the topic checklist is limited to that group.

## Minimal domain card JSX

```jsx
<ReportGroupCard
  title='จ่ายยา'
  onView={() => openViewGroup('dispense', 'จ่ายยา')}
  onExport={() => openExportGroup('dispense', 'รายงานจ่ายยา')}
>
  <ReportOverviewCharts mode='dispense' {...chartProps} />
</ReportGroupCard>
```

Keep `ReportOverviewCharts` as a pure switch on `mode` so adding a domain = new branch + one card + catalog keys.
