import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_TABLE_PAGE_SIZE,
  shouldShowTablePagination,
  sliceTablePage,
} from '@/utils/tablePagination';

/**
 * Client-side table paging — default 20 rows/page; show pager only when
 * `rows.length > pageSize`. Prefer letting `<Table pagination>` own this;
 * use the hook when the page needs the slice/footer outside Table.
 *
 * @param {Array} rows full (filtered/sorted) list
 * @param {{ pageSize?: number, enabled?: boolean, page?: number, onPageChange?: (n:number)=>void }} [options]
 */
export default function useClientPagination(rows, options = {}) {
  const {
    pageSize = DEFAULT_TABLE_PAGE_SIZE,
    enabled = true,
    page: controlledPage,
    onPageChange,
  } = options;

  const isControlled = controlledPage !== undefined;
  const [innerPage, setInnerPage] = useState(1);
  const page = isControlled ? controlledPage : innerPage;
  const onPageChangeRef = useRef(onPageChange);
  onPageChangeRef.current = onPageChange;

  const setPage = (next) => {
    if (!isControlled) setInnerPage(next);
    onPageChangeRef.current?.(next);
  };

  const showPagination = enabled && shouldShowTablePagination(rows?.length ?? 0, pageSize);
  const sliced = sliceTablePage(rows, page, pageSize, showPagination);

  /* Clamp when filters shrink the list below the current page. */
  useEffect(() => {
    if (sliced.page !== page) {
      if (!isControlled) setInnerPage(sliced.page);
      onPageChangeRef.current?.(sliced.page);
    }
  }, [sliced.page, page, isControlled]);

  return {
    pageRows: sliced.pageRows,
    page: sliced.page,
    setPage,
    totalPages: sliced.totalPages,
    total: sliced.total,
    pageSize,
    rangeStart: sliced.rangeStart,
    rangeEnd: sliced.rangeEnd,
    showPagination,
  };
}

export { DEFAULT_TABLE_PAGE_SIZE, shouldShowTablePagination };
