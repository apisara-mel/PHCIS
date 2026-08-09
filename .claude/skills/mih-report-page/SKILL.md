---
name: mih-report-page
description: >-
  Build MIH PHCIS module report pages — domain grouping, FilterDateTag,
  DonutWithLegend / HBarList / VBars charts, ดูรายงาน table popup, and
  นำส่งออกรายงาน via ExportFormatPopup. Use when creating or refactoring
  a reports page (pharmacy, consent, checkup, telemed, finance, lab, or
  any new module), or when the user mentions หน้ารายงาน, report groups,
  chart panels, view report popup, or export reports.
---

# MIH Report Page

Canonical pattern for **module report pages**: one scrollable page, data
grouped by domain, charts on-page, tables in “ดูรายงาน”, export via shared
popup.

**Reference implementations**
- Full multi-domain: [`PharmacyReportsPage.jsx`](../../../src/pages/pharmacy/PharmacyReportsPage.jsx)
- Consent variant: [`ConsentReportPage.jsx`](../../../src/pages/consent/ConsentReportPage.jsx), [`ConsentDashboardPage.jsx`](../../../src/pages/consent/ConsentDashboardPage.jsx)
- Export shell: [`consentExportPopup.jsx`](../../../src/pages/consent/consentExportPopup.jsx)
- Charts: [`Charts.jsx`](../../../src/components/graph/Charts.jsx) (`DonutWithLegend`, `HBarList`, `VBars`, `Reveal`)
- Tables: [mih-table](../mih-table/SKILL.md)

Detail / file map: [REFERENCE.md](REFERENCE.md)

## When to use

| Scenario | Use |
|----------|-----|
| New `/…/reports` page for a module | ✅ |
| Split queue data into report domains + charts | ✅ |
| Wire ดูรายงาน / นำส่งออกรายงาน | ✅ |
| Align an older report page to pharmacy/consent pattern | ✅ |

## When NOT to use

| Scenario | Use instead |
|----------|-------------|
| Queue / worklist table page | [mih-table](../mih-table/SKILL.md) + existing queue shell |
| Dashboard KPI-only (no export/view tables) | Chart cards only — still reuse `DonutWithLegend` |
| Figma → full screen from scratch | [prototype-from-figma](../prototype-from-figma/SKILL.md) then apply this skill |

## Page anatomy (hard rules)

```
QueuePageShell
├── summaryCards (optional KPI strip)
├── toolbar card: FilterDateTag (+ ClearFilters) · นำส่งออกรายงานทั้งหมด
└── ReportGroupCard × N   ← one white card per domain
    ├── PharmacySectionTopic (or module SectionTopic): title + ดูรายงาน + นำส่งออกรายงาน
    └── ChartsRow → ChartPanel × 1–3
        ├── DonutWithLegend  (every pie)
        ├── VBars
        └── HBarList         (Top-N lists)
```

1. **One page, no tabs** for domains — scroll through grouped cards.
2. **Graphs on page; tables in popup** — never dump full detail tables in the group body.
3. **No chart/group subtitles** under titles (title only) unless product explicitly asks.
4. **Tokens only** — `design.md` / `tokens.css`. No raw hex / px fonts.
5. **Every pie uses `DonutWithLegend`** — colored ● + label + `value · pct%` (text color = segment color).
6. **Outer card chrome** = consent-style brand border + shadow; **inner chart panels** = `border-card-default`.
7. **FilterDateTag** drives all charts/KPIs. On report pages pass `showResolvedDate` so the chip shows e.g. `เดือนนี้ · 1 ส.ค. – 31 ส.ค. 2569`.
8. **Reuse export popup** — `ExportFormatPopup` from `@/pages/consent/consentExportPopup` with module `documentFooter` / `logExportFn` (or `null`).

## 1. Group data by domain

Split the module into **stable domain keys** (export + view share the same keys):

```js
const EXPORT_GROUP_KEYS = {
  dispense: ['dispense-detail', 'dispense-summary'],
  patients: ['patients-roster', 'patients-service'],
  // …
};
```

| Layer | Responsibility |
|-------|----------------|
| Raw rows | Filter by `FilterDateTag` → ISO range (`resolveDateFilterRange` / `matchesIsoDateFilter`) |
| Chart series | Aggregate filtered rows → donut segments / HBar rows / VBars months |
| Export catalog | `buildExportReport(key, title, columns, rows, isoOf?)` — plain values + optional `_iso` for popup re-scope |
| View popup | Same catalog keys; chips switch report when a group has >1 table |

**Column defs** carry both UI `render` and `csv` (export):

```js
{ key: 'status', label: 'สถานะ',
  render: (r) => <Badge …>{label}</Badge>,
  csv: (r) => labelOf(r.status) }
```

## 2. Charts

| Chart | Component | Rules |
|-------|-----------|--------|
| Pie / share | `DonutWithLegend` | Always with legend; `size={180}` typical |
| Ranked list | `HBarList` | Top 6: no `maxVisibleRows` (show all); give ChartPanel `alignContent='start'` + minHeight so stretch doesn’t clip |
| Trend / categories | `VBars` | Widen `barMaxWidth` when few categories |
| Enter animation | wrap panels in `Reveal` | Already inside ChartPanel pattern |

**ChartPanel**
- Title only (no subtitle).
- `alignContent='start'` for HBar lists; default `center` for donut/bars.
- HBar panels: `minHeight` tall enough for 6 rows; `overflow: 'visible'`; do **not** put list body in `flex-1 min-h-0` (that clips under sibling donuts).

**Palette:** `@/data/phcisChartPalette` (`PHCIS_CHART`, `PHCIS_CHART_PALETTE`).

## 3. ดูรายงาน (view popup)

Pattern from pharmacy:

```text
Popup size='extraLarge'
├── title = domain title (no subtitle)
├── optional chip switcher if group has multiple tables
├── DateInputBox start–end (re-filter rows via row._iso)
├── NeutralSubdueButton นำส่งออกรายงาน → ExportFormatPopup for active report
├── Table pagination={false}  ← avoid double pager
└── Pagination below table
```

- Build columns with `buildReportTableColumns` from export meta, or map page columns → sanitized plain table.
- Use `sanitizeExportReportMeta` before showing/exporting PII-sensitive fields.
- `VIEW_PAGE_SIZE` ≈ 20.

## 4. นำส่งออกรายงาน (export)

```jsx
import { ExportFormatPopup } from '@/pages/consent/consentExportPopup';

<ExportFormatPopup
  open={!!exportReport}
  report={exportReport}          // single catalog item OR { key:'all', title }
  catalog={scopedCatalog}        // full or group-scoped list
  topics={scopedTopics}          // { value, label }[]
  onClose={() => setExportReport(null)}
  documentFooter='ออกเอกสารโดยระบบ… (PHCIS)'
  logExportFn={null}             // or module logger
/>
```

| Action | Behavior |
|--------|----------|
| Per-group นำส่งออกรายงาน | If 1 key → open that report; if many → open `all` scoped to group keys |
| นำส่งออกรายงานทั้งหมด | `openExport('all')` with full catalog |
| From view popup | Export the **active** table report |

Download pipeline: `@/utils/consentReportExport` (`downloadConsentReport` / sections) — already supports optional `documentFooter`.

## 5. Scaffold checklist

Copy and track:

```
Report page
- [ ] Route + QueuePageShell (breadcrumb, title, optional summaryCards, subnav)
- [ ] FilterDateTag showResolvedDate + clear-filters
- [ ] Domain list + EXPORT_GROUP_KEYS
- [ ] Filtered row builders + chart aggregations
- [ ] ReportGroupCard × domains (ดูรายงาน + นำส่งออกรายงาน)
- [ ] ChartPanel: DonutWithLegend / VBars / HBarList
- [ ] reportsCatalog via buildExportReport
- [ ] View popup (dates, table, pagination={false}, export)
- [ ] ExportFormatPopup (footer + logExportFn)
- [ ] Tokens only; no chart subtitles unless requested
```

## Anti-patterns

- ❌ Tabs for each report domain on the same reports route
- ❌ Full data `<Table>` inside the group card (belongs in ดูรายงาน)
- ❌ Bare `<Donut>` without legend on report pies
- ❌ `justify-center` + `min-h-0` clipping HBar Top-6 under short sibling panels
- ❌ Inventing a second export popup — extend `ExportFormatPopup` props instead
- ❌ Chip label `เดือนนี้` alone on report pages — use `showResolvedDate`

## Related skills

- [mih-table](../mih-table/SKILL.md) — view-popup tables
- [prototype-from-figma](../prototype-from-figma/SKILL.md) — Figma → page shell
- [ux-assessment](../ux-assessment/SKILL.md) — a11y pass after build
