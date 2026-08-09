import React from 'react';
import Pagination from '@/components/pagination/Pagination';
import { tablePaginationRangeLabel } from '@/utils/tablePagination';

/* Sticky footer under a list <Table> — range label left, Pagination right.
   Matches queue-page chrome (PharmacyQueuePage / OPD QueuePage). Renders
   nothing when `show` is false (result set fits on one page). */

const TablePaginationBar = ({
  show = true,
  total = 0,
  rangeStart = 0,
  rangeEnd = 0,
  page = 1,
  pageCount = 1,
  onPageChange,
  className = '',
  style = {},
}) => {
  if (!show || pageCount < 1) return null;

  return (
    <div
      className={`flex items-center w-full ${className}`}
      style={{
        gap: 'var(--dim-space-200)',
        position: 'sticky',
        bottom: 'var(--dim-space-0)',
        zIndex: 50,
        background: 'var(--surface-card-100)',
        paddingTop: 'var(--dim-space-200)',
        borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
        ...style,
      }}
    >
      <span
        style={{
          color: 'var(--text-content-secondary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
        }}
      >
        {tablePaginationRangeLabel(rangeStart, rangeEnd, total)}
      </span>
      <div className='flex-1' />
      <Pagination
        currentPage={page}
        pageCount={pageCount}
        onPageChange={onPageChange}
      />
    </div>
  );
};

export default TablePaginationBar;
