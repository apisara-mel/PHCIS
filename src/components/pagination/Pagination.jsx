import React, { useState } from 'react';

/* MIH Pagination — Figma 328:4734 (MIH Design System Foundation).
   See design.md §6.19. All visual values come from semantic tokens
   (`--surface-pagination-*`, `--text-pagination-*`, `--text-neutral-tertiary`,
   `--dimension/space/100`, `--dimension/radius/200`, `--typograpphy/family/body`,
   `--typograpphy/size/sm`) — no hardcoded brand colours.

   API
   ───
   currentPage   1-based current page (clamped to [1, pageCount])
   pageCount     total page count (>= 1)
   onPageChange  (page: number) => void · fired with the next page (1-based)
   siblingCount  pages shown either side of the current page (default 1)
   className     forwarded to the outer flex row */

const PREV_NEXT_SIZE = 36;
const ROUNDED = 'var(--dim-radius-200, 8px)';

/* Inline chevron — same SVG path used in design.md §6.19.5. Stroke
   inherits from `currentColor` so it tints with the button text token. */
const Chevron = ({ direction = 'left' }) => (
  <svg
    width='16'
    height='16'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='1.8'
    strokeLinecap='round'
    strokeLinejoin='round'
    style={{ transform: direction === 'right' ? 'rotate(180deg)' : 'none' }}
    aria-hidden
  >
    <polyline points='15 18 9 12 15 6' />
  </svg>
);

const PageButton = ({ page, active, onClick }) => {
  const [hover, setHover] = useState(false);
  const bg = active
    ? 'var(--surface-pagination-selected)'
    : hover
      ? 'var(--surface-pagination-hover)'
      : 'var(--surface-pagination-default)';
  const color = active
    ? 'var(--text-pagination-selected)'
    : hover
      ? 'var(--text-pagination-hover)'
      : 'var(--text-pagination-default)';
  return (
    <button
      type='button'
      aria-label={`Page ${page}`}
      aria-current={active ? 'page' : undefined}
      onClick={() => onClick(page)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      style={{
        minWidth: PREV_NEXT_SIZE,
        height: PREV_NEXT_SIZE,
        paddingLeft: 'var(--dim-space-200, 8px)',
        paddingRight: 'var(--dim-space-200, 8px)',
        borderRadius: ROUNDED,
        border: 'none',
        background: bg,
        color,
        fontFamily: "var(--type-family-body, 'Sarabun', sans-serif)",
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-regular, 400)',
        lineHeight: 1.5,
        cursor: 'pointer',
        transition: 'background-color 150ms ease, color 150ms ease',
      }}
    >
      {page}
    </button>
  );
};

const ArrowButton = ({ direction, onClick, disabled, ariaLabel }) => {
  const [hover, setHover] = useState(false);
  const interactive = hover && !disabled;
  return (
    <button
      type='button'
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      style={{
        width: PREV_NEXT_SIZE,
        height: PREV_NEXT_SIZE,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: ROUNDED,
        border: 'none',
        background: interactive
          ? 'var(--surface-pagination-hover)'
          : 'var(--surface-pagination-default)',
        color: 'var(--text-pagination-default)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background-color 150ms ease, opacity 150ms ease',
      }}
    >
      <Chevron direction={direction} />
    </button>
  );
};

const Ellipsis = () => (
  <span
    aria-hidden
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: PREV_NEXT_SIZE,
      minWidth: PREV_NEXT_SIZE,
      color: 'var(--text-neutral-tertiary)',
      fontFamily: "var(--type-family-body, 'Sarabun', sans-serif)",
      fontSize: 'var(--type-size-sm, 14px)',
      lineHeight: 1.5,
    }}
  >
    …
  </span>
);

/* Build the visible page list with ellipsis truncation, e.g. for siblingCount=1:
   pageCount=20, current=10  →  [1, …, 9, 10, 11, …, 20]
   pageCount=20, current=2   →  [1, 2, 3, 4, 5, …, 20]
   pageCount=20, current=19  →  [1, …, 16, 17, 18, 19, 20] */
const buildPages = (currentPage, pageCount, siblingCount) => {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const left = Math.max(currentPage - siblingCount, 2);
  const right = Math.min(currentPage + siblingCount, pageCount - 1);
  const out = [1];
  if (left > 2) out.push('left-ellipsis');
  for (let p = left; p <= right; p++) out.push(p);
  if (right < pageCount - 1) out.push('right-ellipsis');
  out.push(pageCount);
  return out;
};

const Pagination = ({
  currentPage = 1,
  pageCount = 1,
  onPageChange,
  siblingCount = 1,
  className = '',
}) => {
  if (pageCount < 1) return null;
  const safePageCount = Math.max(1, pageCount);
  const safeCurrent = Math.min(Math.max(1, currentPage), safePageCount);
  const pages = buildPages(safeCurrent, safePageCount, siblingCount);
  const goTo = (p) => {
    const next = Math.min(Math.max(1, p), safePageCount);
    if (next !== safeCurrent && onPageChange) onPageChange(next);
  };

  return (
    <nav
      aria-label='Pagination'
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--dim-space-100, 4px)',
      }}
    >
      <ArrowButton
        direction='left'
        ariaLabel='Previous page'
        onClick={() => goTo(safeCurrent - 1)}
        disabled={safeCurrent === 1}
      />
      {pages.map((p, idx) =>
        typeof p === 'string'
          ? <Ellipsis key={`${p}-${idx}`} />
          : <PageButton key={p} page={p} active={p === safeCurrent} onClick={goTo} />,
      )}
      <ArrowButton
        direction='right'
        ariaLabel='Next page'
        onClick={() => goTo(safeCurrent + 1)}
        disabled={safeCurrent === safePageCount}
      />
    </nav>
  );
};

export default Pagination;
