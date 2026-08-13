---
name: mih-table
description: >-
  MIH PHCIS shared <Table> rules — content-fit column widths
  (max of header vs longest cell/badge), column config, StatusBadge/
  ColorfulBadge in cells, sticky cols/header, HeaderCell typography.
  Use when building or fixing any queue/list table, column widths,
  truncated headers/badges ("…"), Table.jsx, or pages that import
  @/components/table/Table across OPD, pharmacy, observation, clinics,
  finance, registration, lab, xray, and related modules.
---

# MIH Table (shared)

Canonical orchestrator: [`src/components/table/Table.jsx`](../../../src/components/table/Table.jsx).  
Design docs: [`design.md`](../../../design.md) §6.34.

**Not this skill:** syncing a new Figma table atom → [sync-mih-component](../sync-mih-component/SKILL.md). Full screen from Figma → [prototype-from-figma](../prototype-from-figma/SKILL.md).

## Hard rules

1. **Always use `<Table>`** from `@/components/table/Table` for data lists — do not invent a parallel HTML `<table>` or flex-grid “table”.
2. **`columnFit='content'` is the default** for every consumer. Do not author fixed `column.width` unless the page opts into `columnFit='fixed'`.
3. **Column width = max(header text + sort icon, longest cell)** — includes StatusBadge / ColorfulBadge / Pill labels at full length (no `…` from under-measure).
4. Tokens only (`design.md` / `tokens.css`). Header title uses `--type-size-table-title` (fixed 12px Mitr) — never fall back to `--type-size-xs`.
5. Icons via `<Icon>` / Material Symbols (or Lucide if not in Figma).

## Column config

```js
const COLUMNS = [
  { key: 'queueNo', label: 'คิว', render: (row) => <Badge style='success' size='small'>{row.queueNo}</Badge> },
  { key: 'hn', label: 'HN' },
  /* Grow + truncate long text — keep flex + minWidth only */
  { key: 'patient', label: 'ผู้ป่วย', flex: true, minWidth: 200, render: (row) => /* … */ },
  { key: 'status', label: 'สถานะ', render: (row) => <Badge style={…} size='small'>{label}</Badge> },
  { key: 'actions', label: 'การดำเนินการ', sortable: false, align: 'center', render: makeRenderActions(…) },
];
```

| Prop | Use |
|------|-----|
| `key` | Required. Row field / stable id |
| `label` / `header` | Header text (`label` preferred; both supported) |
| `render(row, index, ctx)` | Custom cell; else `EllipsisText` / `row[key]` |
| `flex: true` + `minWidth` | Column that should grow (names, free text) |
| `minWidth` | Floor under content-fit |
| `sortable: false` | Disable sort when `onSort` is passed |
| `align: 'center'` | Center cell + header |
| `headerWrap: true` | Allow header to wrap (rare) |
| ~~`width: N`~~ | **Do not use** under content-fit (ignored) |

### Opt out (legacy fixed widths)

```jsx
<Table columnFit='fixed' columns={COLUMNS_WITH_WIDTH} rows={rows} … />
```

Only when a screen explicitly needs pixel-locked columns (rare). Prefer content-fit.

## Content-fit behavior (implemented in Table.jsx)

1. First paint: header-text floor (`headerFloorPx` — Mitr 12px + pad + sort icon).
2. `useLayoutEffect`: unwrap ellipsis / badge caps → measure each `[data-mih-col]` (live + off-DOM clone, **keep cell padding**).
3. Lock every header + body cell to `max(header, longest cell, minWidth)`.
4. Sticky `left` offsets use measured widths — do not hardcode sticky pixel widths.
5. CSS `[data-mih-table-fit="content"]` forces StatusBadge / ColorfulBadge to full label width.

### Badge / Pill in cells

- Prefer `<Badge>` (= StatusBadge) or `<ColorfulBadge width='hug'>` for status pills.
- Do not wrap badges in `truncate` / `min-w-0` containers that collapse measure.
- Allergy / multi-badge cells: `flexWrap: 'nowrap'` so measure sees full row width.

### Truncation policy

| Surface | Truncate? |
|---------|-----------|
| Header title (content-fit) | **Never** — column grows |
| StatusBadge / ColorfulBadge in table | **Never** under content-fit |
| Long free text (`flex` name cols) | Yes — `EllipsisText` / `truncate` inside the flex cell |

## Common `<Table>` props

```jsx
<Table
  columns={columns}
  rows={pageRows}
  rowKey={(row) => row.id}
  sortConfig={sortConfig}
  onSort={handleSort}
  stickyColCount={2}                 /* pin first N cols */
  stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}  /* page-sticky header */
  onRowClick={handleRowClick}
  emptyMessage='ไม่พบรายการ'
  emptySubtext='ลองล้างตัวกรอง'
  loading={isLoading}
/>
```

| Prop | Notes |
|------|--------|
| `stickyColCount` | Number of left-pinned columns |
| `stickyHeaderTop` | CSS length / var — header sticks to page (not table scroller) |
| `trailingInset` | Extra right pad for action buttons at scroll end |
| `editMode` + DnD handlers | Row reorder |
| `pagination` | Default `true` — client pager when `rows.length > pageSize`. Set `false` to opt out (forms, or pages that already slice + render their own `<Pagination>`). Forced off in `editMode`. |
| `pageSize` | Default `20` (`DEFAULT_TABLE_PAGE_SIZE` from `@/utils/tablePagination`) |
| `page` / `onPageChange` | Optional controlled page (1-based) |

## Pagination (system default)

- **Page size 20.** Show sticky range label + `<Pagination>` only when the full `rows` list has **more than 20** items (design.md §6.30.16 — hide when one page fits).
- Built into `<Table>` — pass the full filtered/sorted list; do not hand-roll a second pager unless you opt out with `pagination={false}`.
- Shared pieces: [`src/utils/tablePagination.js`](../../../src/utils/tablePagination.js), [`src/hooks/useClientPagination.js`](../../../src/hooks/useClientPagination.js), [`src/components/table/TablePaginationBar.jsx`](../../../src/components/table/TablePaginationBar.jsx).

## Checklist — new or edited table page

```
- [ ] Import Table from @/components/table/Table
- [ ] No column.width under default content-fit
- [ ] flex + minWidth only on columns that should grow
- [ ] Badges/Pills not clipped; longest label drives width
- [ ] stickyColCount without hardcoded sticky pixel widths
- [ ] HeaderCell title stays --type-size-table-title (12px)
- [ ] Empty / loading states via emptyMessage / loading props
- [ ] Pass full filtered rows; rely on Table pagination (>20) OR set pagination={false} if owning an external pager
- [ ] Dev app path: if UI runs from MIH-PHCIS-local, sync src/ there too
```

## Do not

- Reintroduce `width: 96` (etc.) on queue/list column configs “for alignment”.
- Measure columns while badges still have `maxWidth` + ellipsis without unwrap.
- Clone-measure cells after wiping `padding` (under-measures ~32px).
- Use `--type-size-xs` as HeaderCell font fallback (breaks under `data-font-size="sm"`).
- Build a one-off table chrome that bypasses `<Table>`.

## Related files

| File | Role |
|------|------|
| `src/components/table/Table.jsx` | Orchestrator + HeaderCell / DataCell / measure + default paging |
| `src/components/table/TablePaginationBar.jsx` | Sticky “แสดง X–Y จาก Z” + Pagination |
| `src/utils/tablePagination.js` | `DEFAULT_TABLE_PAGE_SIZE = 20` + slice helpers |
| `src/hooks/useClientPagination.js` | Hook for pages that own the footer outside Table |
| `src/components/badge/StatusBadge.jsx` | `data-mih-status-badge` |
| `src/components/badge/ColorfulBadge.jsx` | `data-mih-colorful-badge` |
| `src/styles/tokens.css` / `design.md` §6.34 / §6.30.16 | Tokens + docs |
| `src/pages/pharmacy/PharmacyQueuePage.jsx` | Reference consumer (content-fit + badges) |
