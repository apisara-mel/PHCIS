---
name: mih-filter-bar
description: >-
  MIH PHCIS shared search + filter bar — PrimarySearch, FilterDropdown /
  FilterDateTag chips inside OverflowFlexRow, the "ล้างตัวกรอง" chip driven by
  useSmoothClearFilters, SearchResultCount, and SmoothFilterResults. Use when
  building or fixing any worklist/registry/report filter row, a filter bar
  inside a Popup, a clear-filters chip that shows when nothing is selected,
  a filter chip whose dropdown does not appear, or an empty "ค้นหาล่าสุด"
  dropdown — across OPD, registration, pharmacy, clinics, lab, xray, finance,
  consent, telemed, appointment, system and dashboard pages.
---

# MIH Filter Bar (shared)

Canonical pieces:

| Piece | File |
|---|---|
| Search box | [`src/components/search/PrimarySearch.jsx`](../../../src/components/search/PrimarySearch.jsx) |
| Recent-search store | [`src/components/search/useSearchHistory.js`](../../../src/components/search/useSearchHistory.js) |
| Recent-search mocks | [`src/data/primarySearchHistorySeeds.js`](../../../src/data/primarySearchHistorySeeds.js) |
| Filter chips | [`src/components/forms/FilterTag.jsx`](../../../src/components/forms/FilterTag.jsx) (`FilterTag`, `FilterDropdown`) |
| Date chip | [`src/components/forms/FilterDateTag.jsx`](../../../src/components/forms/FilterDateTag.jsx) → `DateFilterPopup` |
| Clear chip + fade | [`src/components/forms/ClearFiltersTag.jsx`](../../../src/components/forms/ClearFiltersTag.jsx) (`ClearFiltersTag`, `SmoothFilterResults`) |
| Clear-chip state | [`src/hooks/useSmoothClearFilters.js`](../../../src/hooks/useSmoothClearFilters.js) |
| Overflow row | [`src/components/overflow/OverflowFlexRow.jsx`](../../../src/components/overflow/OverflowFlexRow.jsx) |
| Result count | [`src/components/search/SearchResultCount.jsx`](../../../src/components/search/SearchResultCount.jsx) |

Reference implementation: [`src/pages/appointment/AppointmentListView.jsx`](../../../src/pages/appointment/AppointmentListView.jsx).

**Not this skill:** the table itself → [mih-table](../mih-table/SKILL.md). A whole report page → [mih-report-page](../mih-report-page/SKILL.md).

## Hard rules

1. **"ล้างตัวกรอง" ขึ้นเฉพาะเมื่อมีตัวกรองถูกเลือกจริง.** Never render `ClearFiltersTag` with a hard-coded `active`. Drive it from `useSmoothClearFilters(filtersActive, reset)` and compute `filtersActive` from *every* control in the row — including the search box and any chip whose default is not the empty string. A chip put back to its default by hand must make the clear chip disappear, exactly like pressing ล้างตัวกรอง.
2. **กด chip แล้วต้องเห็น dropdown ทุกที่ รวมทั้งใน Popup.** `FilterDropdown` defaults `menuZIndex` to `--sm-z-modal-popover` (1450), above `--sm-z-modal` (1400). Do not lower it to `--sm-z-popover-nested` (1302) — that puts the menu *behind* the modal, so the chip looks dead. Same rule for `OverflowFlexRow`'s hidden-filters menu.
3. **Chips live inside `OverflowFlexRow`** so a narrow viewport collapses the tail into a "…" menu instead of wrapping or clipping.
4. **The results block is wrapped in `SmoothFilterResults`** with `opaque={resultsOpaque}` so clearing fades instead of snapping.
5. **`SearchResultCount` sits above the table**, never inside it.
6. **The recent-search dropdown is never empty.** `PrimarySearch` falls back to a mock list from `resolveSearchHistoryFallback`. Pass `historyKind` only when the placeholder-based guess is wrong; pass `historyKind='none'` to deliberately show the empty message.
7. **Tokens only** for gaps/dividers (`--dim-space-*`, `--border-neutral-tertiary`).

## Canonical shape

```jsx
const [search, setSearch] = useState('');
const [status, setStatus] = useState('');            // '' = ทุกสถานะ
const [dateValue, setDateValue] = useState({ quick: 'all' });

const filtered = useMemo(() => rows.filter(/* … */), [rows, search, status, dateValue]);

/* ทุกตัวควบคุมในแถวต้องอยู่ในนิพจน์นี้ ไม่งั้นชิปล้างจะขึ้น/ไม่ขึ้นผิดจังหวะ */
const filtersActive = !!(search || status || (dateValue.quick && dateValue.quick !== 'all'));

const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
  filtersActive,
  () => { setSearch(''); setStatus(''); setDateValue({ quick: 'all' }); setPage(1); },
);

return (
  <>
    <div className='w-full flex items-start justify-center'>
      <PrimarySearch
        value={search}
        onChange={(v) => { setSearch(v); setPage(1); }}
        onSubmit={(v) => { setSearch(v); setPage(1); }}
        placeholder='ค้นหา ชื่อผู้รับบริการ / HN'
        width={640}
      />
    </div>

    <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
      <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
        <FilterDropdown prefix='สถานะ:' options={STATUS_OPTIONS} value={status}
                        onChange={(v) => { setStatus(v); setPage(1); }} />
        {FILTER_DIVIDER}
        <FilterDateTag
          prefix='วัน:'
          value={dateValue.quick === 'all' ? undefined : dateValue}
          defaultQuick='all'
          quickLabels={{ today: 'วันนี้', yesterday: 'เมื่อวาน', thismonth: 'เดือนนี้', lastmonth: 'เดือนที่แล้ว' }}
          placeholder='ทุกวัน'
          selectedWhen={(v) => v?.quick && v.quick !== 'all'}
          onChange={(v) => { setDateValue(v); setPage(1); }}
        />
        <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
      </OverflowFlexRow>

      <SmoothFilterResults opaque={resultsOpaque}>
        <SearchResultCount found={filtered.length} total={rows.length} />
        <Table columns={columns} rows={filtered} /* … */ />
      </SmoothFilterResults>
    </div>
  </>
);
```

`FILTER_DIVIDER` is a 1px `--border-neutral-tertiary` spacer used to group related chips — copy it from `AppointmentListView.jsx`.

## Options and labels

- Every `FilterDropdown` list starts with an **"all" sentinel** whose `value` is `''` and whose label reads `ทุก…` / `ทั้งหมด`. `FilterDropdown` treats "value equals the first option" as *not selected*, so the sentinel must be first.
- Prefer **deriving options from the rows on screen** (`[...new Set(rows.map(r => r.clinic))]`) over a master list, so no option filters down to zero.
- The chip label is `prefix` + selected label — keep `prefix` short and ending in `:` (`สถานะ:`, `แพทย์:`, `วัน:`).
- Reset `page` to 1 in every `onChange`.

## Recent search (ค้นหาล่าสุด)

Persist real history with `useSearchHistory('mih:primarysearch-history:<page-slug>')` and push on submit:

```jsx
const { history, push, clear } = useSearchHistory(SEARCH_HISTORY_KEY);
<PrimarySearch
  history={history}
  onHistoryClear={history.length > 0 ? clear : undefined}
  onSubmit={(v, item) => { setSearch(v); push(item || v); }}
/>
```

Pages with no history yet still show mock rows — `PrimarySearch` calls
`resolveSearchHistoryFallback(historyKind, placeholder)`, which infers the kind
(`patient` · `drug` · `staff` · `place` · `catalog`) from the placeholder text.
Add a new kind in `primarySearchHistorySeeds.js`, not at the call site.

## Pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| ล้างตัวกรอง ค้างอยู่ทั้งที่ทุก chip เป็นค่าเริ่มต้น | `filtersActive` ไม่ได้นับ chip ตัวนั้น หรือหน้าเก็บ `showClearChip` เอง | นับให้ครบใน `filtersActive` แล้วปล่อยให้ `useSmoothClearFilters` คุมชิป |
| กด chip แล้วไม่มีอะไรขึ้น (เฉพาะใน popup) | `menuZIndex` ต่ำกว่า `--sm-z-modal` | ใช้ค่า default ของ `FilterDropdown` อย่าทับให้ต่ำลง |
| ชิปเป็นสีขาวทั้งที่มีค่าเลือกอยู่ | ค่า default ตรงกับ `options[0]` พอดี (เช่น ปีงบประมาณ) | ส่ง `active` มาเอง |
| ตัวกรองล้นออกนอกจอ | ไม่ได้ห่อด้วย `OverflowFlexRow` | ห่อ แล้วตั้ง `moreAriaLabel` |
| ตารางกระตุกตอนกดล้าง | ไม่ได้ห่อด้วย `SmoothFilterResults` | ห่อผลลัพธ์ + ส่ง `opaque={resultsOpaque}` |
| ดรอปดาวน์ ค้นหาล่าสุด ว่างเปล่า | `historyKind='none'` หรือ mock kind ยังไม่มีข้อมูล | เพิ่มชุด mock ใน `primarySearchHistorySeeds.js` |
