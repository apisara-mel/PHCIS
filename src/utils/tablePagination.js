/* Shared client-side table pagination — design.md §6.30.16 + mih-table skill.
   Default page size is 20; the pager UI shows only when row count exceeds
   that size (hide when the set fits on one page). */

export const DEFAULT_TABLE_PAGE_SIZE = 20;

/** True when the list needs a pager (more than one page). */
export function shouldShowTablePagination(rowCount, pageSize = DEFAULT_TABLE_PAGE_SIZE) {
  const n = Number(rowCount) || 0;
  const size = Number(pageSize) > 0 ? Number(pageSize) : DEFAULT_TABLE_PAGE_SIZE;
  return n > size;
}

/** Slice rows for a 1-based page. When `enabled` is false, returns all rows. */
export function sliceTablePage(rows, page, pageSize = DEFAULT_TABLE_PAGE_SIZE, enabled = true) {
  const list = Array.isArray(rows) ? rows : [];
  if (!enabled || !shouldShowTablePagination(list.length, pageSize)) {
    return {
      pageRows: list,
      total: list.length,
      totalPages: 1,
      page: 1,
      rangeStart: list.length === 0 ? 0 : 1,
      rangeEnd: list.length,
    };
  }
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = list.slice(start, start + pageSize);
  return {
    pageRows,
    total,
    totalPages,
    page: safePage,
    rangeStart: total === 0 ? 0 : start + 1,
    rangeEnd: Math.min(start + pageSize, total),
  };
}

/** Thai range label: "แสดง X–Y จาก Z รายการ" */
export function tablePaginationRangeLabel(rangeStart, rangeEnd, total) {
  return `แสดง ${rangeStart}–${rangeEnd} จาก ${total} รายการ`;
}
