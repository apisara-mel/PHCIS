import React, { useState } from 'react';

/* MIH Calendar — Figma node 238:39268 (Calendar/Default subnode 74:5708)
   Single-month grid showing 6 weeks (42 cells) with weekday header.
   DateFilterPopup renders two instances: side-by-side when the container is wide
   enough (flex-wrap row); stacked when narrow.

   Cell visual states (from Figma):
     • default     — white bg · text #4D5358 · rounded-full hover halo
     • current     — today: surface-calendar-current (#E2F3EB) · text-calendar-current (#007549)
     • full         — fully-booked: renders "เต็ม" (text-calendar-disabled), non-selectable
     • disabled    — white bg · text #ADB2B7 (days outside the visible month)
     • selected    — bg brand-p700 · text white · rounded-full
                     (range endpoints get rounded-l-full or rounded-r-full only)
     • range       — bg brand-p100 · text brand-p700 · no rounding
   Header chevrons appear only on the outer edges in a 2-month layout. */

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/* `locale='th'` — Thai weekday initials + Buddhist-era month label. Added
   for the radiology booking calendar (TOR §1.12.3), where the calendar is
   read by front-desk staff and shown to patients; English month names next
   to Thai slot labels read as a half-translated screen. Default stays 'en'
   so every existing caller (DateFilterPopup, DatePicker) is unchanged. */
const TH_WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const TH_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const Sym = ({ name, size = 16, color }) => (
  <span
    className='material-symbols-outlined'
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontSize: size,
      color,
      lineHeight: 1,
      display: 'inline-flex',
    }}
    aria-hidden
  >
    {name}
  </span>
);

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const sameDay = (a, b) =>
  a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const isBefore = (a, b) => startOfDay(a).getTime() < startOfDay(b).getTime();
const isBetween = (d, a, b) => {
  const t = startOfDay(d).getTime();
  return t > startOfDay(a).getTime() && t < startOfDay(b).getTime();
};

/* Build a 6×7 grid of Date objects starting from the Sunday on or before
   the first day of `viewMonth`. */
const buildGrid = (viewMonth) => {
  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const start = new Date(firstOfMonth);
  start.setDate(start.getDate() - start.getDay()); // back to Sunday
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
};

const ChevronButton = ({ direction, onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type='button'
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className='shrink-0 flex items-center justify-center cursor-pointer'
      style={{
        width: 24,
        height: 24,
        borderRadius: 'var(--dim-radius-200)',
        background: hovered ? 'var(--surface-list-hover)' : 'transparent',
        border: 'none',
        color: 'var(--text-content-default)',
      }}
      aria-label={direction === 'left' ? 'เดือนก่อน' : 'เดือนถัดไป'}
    >
      <Sym name={direction === 'left' ? 'chevron_left' : 'chevron_right'} size={16} color='currentColor' />
    </button>
  );
};

const Calendar = ({
  viewMonth,
  mode = 'single',         // 'single' | 'range'
  selection,               // Date (single) | { start, end } (range)
  onSelect,                // (Date) => void
  onNavigate,              // (delta: number) => void
  showLeftChevron = true,
  showRightChevron = true,
  minDate,                 // dates strictly before this are disabled (inclusive lower bound)
  isFull,                  // (Date) => boolean — mark fully-booked days (render "เต็ม", non-selectable)
  /* string, or (Date) => string when the reason differs per day — a room
     that is CLOSED on Sunday is not the same as one that is fully booked,
     and labelling both "เต็ม" tells the user something untrue. */
  fullLabel = 'เต็ม',
  locale = 'en',           // 'en' (default) | 'th'
  /* กดที่ชื่อเดือน/ปี แล้วเลือกปีจากตารางได้ — จำเป็นกับวันเกิดที่ต้องย้อนหลาย
     สิบปี กดลูกศรทีละเดือนไม่ไหว (26 ส.ค. 2569 มติผู้ใช้) */
  onPickYear,
}) => {
  const isThai = locale === 'th';
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const grid = buildGrid(viewMonth);
  const weekdays = isThai ? TH_WEEKDAYS : WEEKDAYS;
  const monthLabel = isThai
    ? `${TH_MONTHS[viewMonth.getMonth()]} ${viewMonth.getFullYear() + 543}`
    : `${MONTH_NAMES[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`;
  const minTs = minDate ? startOfDay(minDate).getTime() : null;

  const stateOf = (d) => {
    const inMonth = d.getMonth() === viewMonth.getMonth();
    if (!inMonth) return { kind: 'disabled' };
    if (minTs !== null && startOfDay(d).getTime() < minTs) return { kind: 'disabled' };
    if (isFull && isFull(d)) return { kind: 'full' };

    if (mode === 'range' && selection && selection.start && selection.end) {
      const { start, end } = selection;
      const lo = isBefore(start, end) ? start : end;
      const hi = isBefore(start, end) ? end : start;
      if (sameDay(d, lo) && sameDay(d, hi)) return { kind: 'selected', radius: 'full' };
      if (sameDay(d, lo)) return { kind: 'selected', radius: 'left' };
      if (sameDay(d, hi)) return { kind: 'selected', radius: 'right' };
      if (isBetween(d, lo, hi)) return { kind: 'range' };
      return { kind: 'default' };
    }
    if (mode === 'single' && selection && sameDay(d, selection)) {
      return { kind: 'selected', radius: 'full' };
    }
    if (mode === 'range' && selection && selection.start && sameDay(d, selection.start)) {
      return { kind: 'selected', radius: 'full' };
    }
    // today — only when the cell isn't part of a selection/range (those win visually)
    if (sameDay(d, new Date())) return { kind: 'current' };
    return { kind: 'default' };
  };

  const cellStyleFor = (state, hovered) => {
    const radius =
      state.radius === 'full' ? 9999
        : state.radius === 'left' ? '9999px 0 0 9999px'
          : state.radius === 'right' ? '0 9999px 9999px 0'
            : 0;
    if (state.kind === 'selected') {
      return {
        background: 'var(--brand-p700)',
        color: 'var(--text-content-on-content)',
        borderRadius: radius,
      };
    }
    if (state.kind === 'current') {
      return {
        background: 'var(--surface-calendar-current)',
        color: 'var(--text-calendar-current)',
        borderRadius: 'var(--dim-radius-full)',
      };
    }
    if (state.kind === 'range') {
      return {
        background: 'var(--brand-p100)',
        color: 'var(--brand-p700)',
        borderRadius: 0,
      };
    }
    if (state.kind === 'full') {
      return {
        background: 'var(--surface-calendar-disabled)',
        color: 'var(--text-calendar-disabled)',
        borderRadius: 'var(--dim-radius-full)',
        fontSize: 'var(--type-size-xs)',
      };
    }
    if (state.kind === 'disabled') {
      return {
        background: 'var(--surface-card-100)',
        color: '#ADB2B7',
        borderRadius: 'var(--dim-radius-full)',
      };
    }
    return {
      background: hovered ? 'var(--brand-p100)' : '#FFFFFF',
      color: hovered ? 'var(--brand-p700)' : '#4D5358',
      borderRadius: 'var(--dim-radius-full)',
    };
  };

  return (
    <div
      className='flex w-full max-w-[320px] flex-col items-center'
      style={{
        width: 'min(320px, 100%)',
        gap: 'var(--dim-space-100)',
        padding: 'var(--dim-space-400)',
      }}
    >
      {/* Header — month label + chevrons (left/right depending on which side) */}
      <div className='flex items-center w-full' style={{ height: 32, gap: 'var(--dim-space-100)' }}>
        {showLeftChevron ? <ChevronButton direction='left' onClick={() => onNavigate?.(-1)} /> : <span style={{ width: 24 }} />}
        {onPickYear ? (
          <button
            type='button'
            className='flex-1 text-center'
            aria-label='เลือกปี'
            onClick={() => setYearPickerOpen((v) => !v)}
            style={{
              color: '#4D5358',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-base)',
              fontWeight: 'var(--type-weight-medium)',
              margin: 'var(--dim-space-0)',
              cursor: 'pointer',
              background: 'transparent',
              border: 'none',
            }}
          >
            {monthLabel}
          </button>
        ) : (
          <p
            className='flex-1 text-center'
            style={{
              color: '#4D5358',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-base)',
              fontWeight: 'var(--type-weight-medium)',
              margin: 'var(--dim-space-0)',
            }}
          >
            {monthLabel}
          </p>
        )}
        {showRightChevron ? <ChevronButton direction='right' onClick={() => onNavigate?.(1)} /> : <span style={{ width: 24 }} />}
      </div>

      {yearPickerOpen ? (
        /* ตารางปี 12 ช่อง เลื่อนดูย้อนหลังได้ถึง 100 ปี — พอสำหรับวันเกิด */
        <div
          className='w-full'
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 'var(--dim-space-150)',
            maxHeight: 240,
            overflowY: 'auto',
            paddingTop: 'var(--dim-space-200)',
          }}
        >
          {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map((y) => {
            const selected = y === viewMonth.getFullYear();
            return (
              <button
                key={y}
                type='button'
                onClick={() => { onPickYear?.(y); setYearPickerOpen(false); }}
                style={{
                  padding: 'var(--dim-space-200)',
                  borderRadius: 'var(--dim-radius-200)',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                  background: selected ? 'var(--surface-brandPrimary-default, #046A38)' : 'transparent',
                  color: selected ? '#FFFFFF' : '#4D5358',
                }}
              >
                {isThai ? y + 543 : y}
              </button>
            );
          })}
        </div>
      ) : (
      <>
      {/* Weekday row */}
      <div className='flex w-full' style={{ gap: 'var(--dim-space-050)' }}>
        {weekdays.map((w) => (
          <div
            key={w}
            className='flex-1 flex items-center justify-center'
            style={{
              height: 28,
              color: '#636B72',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              fontWeight: 'var(--type-weight-medium)',
              lineHeight: 'normal',
            }}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Day grid — 6 rows × 7 cells */}
      {Array.from({ length: 6 }, (_, row) => (
        <div key={row} className='flex w-full' style={{ gap: 'var(--dim-space-050)' }}>
          {grid.slice(row * 7, row * 7 + 7).map((d, i) => (
            <DayCell
              key={i}
              date={d}
              state={stateOf(d)}
              cellStyleFor={cellStyleFor}
              onSelect={onSelect}
              fullLabel={typeof fullLabel === 'function' ? fullLabel(d) : fullLabel}
            />
          ))}
        </div>
      ))}
      </>
      )}
    </div>
  );
};

const DayCell = ({ date, state, cellStyleFor, onSelect, fullLabel }) => {
  const [hovered, setHovered] = useState(false);
  const visual = cellStyleFor(state, hovered);
  const clickable = state.kind !== 'disabled' && state.kind !== 'full';
  const select = () => {
    if (clickable && onSelect) onSelect(date);
  };
  return (
    <button
      type='button'
      disabled={!clickable}
      /* Prefer mousedown so the parent DatePicker can close before the
         click falls through to the trigger (common inside Popup portals). */
      onMouseDown={(e) => {
        if (!clickable) return;
        e.preventDefault();
        select();
      }}
      onClick={(e) => {
        e.preventDefault();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className='flex items-center justify-center transition-colors'
      style={{
        width: 40,
        height: 40,
        border: 'none',
        cursor: clickable ? 'pointer' : 'default',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        lineHeight: 1.5,
        ...visual,
      }}
    >
      {state.kind === 'full' ? fullLabel : date.getDate()}
    </button>
  );
};

export default Calendar;
export { startOfDay, sameDay };

/* ── Preview helpers for state-matrix demos ──────────────────────
   These render a single day cell / chevron with explicit visual state,
   matching Figma 325:3609 (day cell) and 3070:4061 (chevron) so the
   design-system docs can display each state side-by-side.        */

const DAY_PREVIEW_STATES = {
  default:  { bg: '#FFFFFF',           color: '#4D5358',          radius: 9999, opacity: 1 },
  current:  { bg: 'var(--surface-calendar-current)', color: 'var(--text-calendar-current)', radius: 9999, opacity: 1 },
  full:     { bg: 'var(--surface-calendar-disabled)', color: 'var(--text-calendar-disabled)', radius: 9999, opacity: 1, label: 'เต็ม', fontSize: 'var(--type-size-xs)' },
  hover:    { bg: 'var(--brand-p100)', color: 'var(--brand-p700)',radius: 9999, opacity: 1 },
  range:    { bg: 'var(--brand-p100)', color: 'var(--brand-p700)',radius: 0,    opacity: 1 },
  selected: { bg: 'var(--brand-p700)', color: 'var(--text-content-on-content)',          radius: 9999, opacity: 1 },
  disabled: { bg: '#FFFFFF',           color: '#ADB2B7',          radius: 9999, opacity: 1 },
};

export const CalendarDayPreview = ({ state = 'default', day = 15 }) => {
  const s = DAY_PREVIEW_STATES[state] || DAY_PREVIEW_STATES.default;
  return (
    <div
      className='inline-flex items-center justify-center'
      style={{
        width: 40,
        height: 40,
        background: s.bg,
        color: s.color,
        borderRadius: s.radius,
        opacity: s.opacity,
        fontFamily: 'var(--type-family-body)',
        fontSize: s.fontSize || 'var(--type-size-sm)',
        lineHeight: 1.5,
      }}
    >
      {s.label || day}
    </div>
  );
};

const CHEV_PREVIEW_STATES = {
  default: { bg: 'transparent',                  color: 'var(--text-content-default)' },
  hover:   { bg: 'var(--surface-list-hover)',    color: 'var(--brand-p700)' },
};

export const CalendarChevronPreview = ({ state = 'default', direction = 'left' }) => {
  const s = CHEV_PREVIEW_STATES[state] || CHEV_PREVIEW_STATES.default;
  return (
    <div
      className='inline-flex items-center justify-center'
      style={{
        width: 24,
        height: 24,
        borderRadius: 'var(--dim-radius-200)',
        background: s.bg,
        color: s.color,
      }}
    >
      <Sym name={direction === 'left' ? 'chevron_left' : 'chevron_right'} size={16} color='currentColor' />
    </div>
  );
};
