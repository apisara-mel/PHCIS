import React, { useMemo, useState } from 'react';
import { Sym } from './Sym';
import { toBeKey } from './BookingSheets';

/* MIH Mobile · inline month calendar — Figma DS "Calendar / Single" (152:46901),
   day-cell states 143:23705. Used by the booking date step (140:9464): month
   header with chevron nav, Su–Sa weekday row, and a 7-column day grid whose
   cells are round selection targets.

   Cell states → tokens (Figma action sheet 173:82996 · full state 140:9320):
     Default   surface/calendar/default (white)   · text/calendar/default (#4D5358)
     Current   surface/calendar/current (#E2F3EB) · text/calendar/current (#007549) — today
     Selected  surface/calendar/selected-mobile   · text/calendar/selected (#FFFFFF)
               (mobile brighter emerald #08A768 — design.md §12889)
     Full      renders "เต็ม" · text/calendar/disabled (#CBD5E1), non-interactive
     Disabled  (outside month) · text/neutral/tertiary (#ADB2B7)

   Keys use toBeKey (BE year) so `availableKeys` lines up with buildDateOptions. */

const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const chevBtn = {
  width: 'var(--dim-size-800, 40px)',
  height: 'var(--dim-size-800, 40px)',
  borderRadius: 'var(--dim-radius-200, 8px)',
  border: 0,
  background: 'transparent',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text-calendar-month, #4D5358)',
  flexShrink: 0,
};

const BookingCalendar = ({ selectedKey, availableKeys, onSelect, fullLabel = 'เต็ม' }) => {
  const available = useMemo(() => new Set(availableKeys || []), [availableKeys]);
  const initial = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, []);
  const todayKey = useMemo(() => toBeKey(new Date()), []);
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const [cursor, setCursor] = useState(initial);

  const rows = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const firstDow = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const prevDays = new Date(y, m, 0).getDate();
    const cells = [];
    /* leading days from the previous month (shown muted / non-interactive) */
    for (let i = 0; i < firstDow; i += 1) {
      cells.push({ day: prevDays - firstDow + 1 + i, outside: true });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = toBeKey(new Date(y, m, day));
      const past = new Date(y, m, day).getTime() < todayStart;   // before today → disabled number
      cells.push({ day, key, past, disabled: !available.has(key) });
    }
    /* trailing days from the next month to complete the final week */
    let next = 1;
    while (cells.length % 7 !== 0) {
      cells.push({ day: next, outside: true });
      next += 1;
    }
    const out = [];
    for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
    return out;
  }, [cursor, available, todayStart]);

  const monthLabel = `${EN_MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
      {/* month header */}
      <div className='flex items-center' style={{ padding: '0 4px var(--dim-space-300, 12px)' }}>
        <button
          type='button'
          aria-label='เดือนก่อนหน้า'
          style={chevBtn}
          onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
        >
          <Sym name='chevron_left' size={16} />
        </button>
        <span
          style={{
            flex: 1,
            textAlign: 'center',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-base, 16px)',
            fontWeight: 'var(--type-weight-medium, 500)',
            color: 'var(--text-calendar-month, #4D5358)',
          }}
        >
          {monthLabel}
        </span>
        <button
          type='button'
          aria-label='เดือนถัดไป'
          style={chevBtn}
          onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
        >
          <Sym name='chevron_right' size={16} />
        </button>
      </div>

      {/* weekday labels */}
      <div className='flex' style={{ gap: 2 }}>
        {WEEKDAYS.map((w) => (
          <span
            key={w}
            className='flex items-center justify-center'
            style={{
              flex: 1,
              height: 28,
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs, 12px)',
              fontWeight: 'var(--type-weight-medium, 500)',
              color: 'var(--text-content-secondary, #636B72)',
            }}
          >
            {w}
          </span>
        ))}
      </div>

      {/* day grid */}
      {rows.map((row, ri) => (
        <div key={ri} className='flex' style={{ gap: 2 }}>
          {row.map((cell, ci) => {
            const selected = cell.key && cell.key === selectedKey;
            const clickable = cell.key && !cell.disabled && !cell.past && !cell.outside;
            /* today (only when it is a selectable day and not itself the picked date) */
            const current = clickable && !selected && cell.key === todayKey;
            /* past days (before today) → disabled number · in-month full days → "เต็ม" */
            const past = cell.past && !cell.outside;
            const full = cell.disabled && !cell.past && !cell.outside;
            return (
              <button
                key={ci}
                type='button'
                disabled={!clickable}
                onClick={clickable ? () => onSelect?.(cell.key) : undefined}
                aria-current={selected ? 'date' : undefined}
                className='flex items-center justify-center'
                style={{
                  flex: 1,
                  minWidth: 0,
                  aspectRatio: '1 / 1',
                  border: 0,
                  borderRadius: 'var(--dim-radius-full)',
                  background: selected
                    ? 'var(--surface-calendar-selected-mobile, #08A768)'
                    : current
                      ? 'var(--surface-calendar-current, #E2F3EB)'
                      : 'transparent',
                  color: selected
                    ? 'var(--text-calendar-selected, #FFFFFF)'
                    : current
                      ? 'var(--text-calendar-current, #007549)'
                      : (full || past)
                        ? 'var(--text-calendar-disabled, #CBD5E1)'
                        : cell.outside
                          ? 'var(--text-neutral-tertiary, #ADB2B7)'
                          : 'var(--text-calendar-default, #4D5358)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: full ? 'var(--type-size-xs, 12px)' : 'var(--type-size-sm, 14px)',
                  fontWeight: (selected || current) ? 'var(--type-weight-medium, 500)' : 'var(--type-weight-regular, 400)',
                  cursor: clickable ? 'pointer' : 'default',
                }}
              >
                {full ? fullLabel : cell.day}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default BookingCalendar;
