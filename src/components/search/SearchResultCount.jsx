import React from 'react';

/* Shared “พบ N รายการ จาก M รายการ” line under patient / roster search.
   Used across modules after PrimarySearch + filters (NcdRegistry pattern). */

const SearchResultCount = ({
  found = 0,
  total = 0,
  unit = 'รายการ',
  className = '',
  style = {},
}) => (
  <div
    className={`text-xs text-ink-tertiary ${className}`.trim()}
    style={style}
    aria-live='polite'
  >
    พบ <strong className='text-ink-secondary'>{found}</strong> {unit} จาก {total} {unit}
  </div>
);

export default SearchResultCount;
