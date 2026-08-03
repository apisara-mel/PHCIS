import React, { useMemo, useState } from 'react';
import Icon from '@/components/icons/Icon';
import { DOT_DAY_STATUSES, dateKey } from '@/data/tbDotLog';

/* DotCalendarLog — เดือนละตาราง (month grid) บันทึกการกำกับการกินยา DOT
   (TOR §1.10.4.7). ยังไม่มี component นี้ใน DS — สร้างใหม่บนโครง grid
   6×7 ของ forms/Calendar (weekday header + 42 cells) แต่ cell แสดง
   "สถานะการกินยารายวัน" แทนการเลือกวันที่:

     taken   → กินยาต่อหน้าผู้กำกับ (brand surface + check)
     vot     → กินยาผ่าน VOT/Telemedicine (info surface + videocam)
     self    → กินยาเอง รายงานภายหลัง (warning surface)
     missed  → ขาดยา (danger surface + cancel) — spec: danger token
     holiday → วันหยุดตาม DOT schedule (neutral, muted)
     (no entry) → อนาคต / ก่อนเริ่มยา — เซลล์ว่าง

   รายงานผ่าน manifest `newComponents` (DotCalendarLog) — integrator เป็น
   ผู้ลงทะเบียนใน docs/awaiting-components.md (playbook §2.8). */

const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

/* Visual spec per day status — every value aliases a design token. */
const STATUS_VISUALS = {
  taken: {
    bg: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
    border: 'var(--border-brandPrimary-tertiary, #C5EDDA)',
    fg: 'var(--text-brandPrimary-default, #007549)',
    icon: 'check_circle',
  },
  vot: {
    bg: 'var(--surface-alert-info, #F0F6FF)',
    border: 'var(--border-alert-info, #DBEAFE)',
    fg: 'var(--text-info-default, #1D4ED8)',
    icon: 'videocam',
  },
  self: {
    bg: 'var(--surface-alert-warning, #FFF9F0)',
    border: 'var(--border-alert-warning, #FFEDD5)',
    fg: 'var(--text-warning-default, #C2410C)',
    icon: 'how_to_reg',
  },
  missed: {
    bg: 'var(--surface-danger-quaternary, #FFF0F0)',
    border: 'var(--border-alert-error, #FEE2E2)',
    fg: 'var(--text-danger-default, #B91C1C)',
    icon: 'cancel',
  },
  holiday: {
    bg: 'var(--surface-neutral-quaternary, #F9FBFB)',
    border: 'var(--border-neutral-quaternary, #F4F5F5)',
    fg: 'var(--text-content-quaternary, #ADB2B7)',
    icon: 'event_busy',
  },
};

const monthStart = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const sameMonth = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

const buildGrid = (viewMonth) => {
  const first = monthStart(viewMonth);
  const start = new Date(first);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
};

const DotCalendarLog = ({
  log = {},              // { 'YYYY-MM-DD': { status, note, recordedBy, ... } }
  startDate = '',        // ISO วันเริ่มยา — bound การเลื่อนเดือนย้อนหลัง
  onDayClick,            // (dateKey, entry|null) — parent เปิด popup บันทึก/แก้ไข
  readOnly = false,
}) => {
  const today = useMemo(() => new Date(), []);
  const start = useMemo(() => (startDate ? new Date(startDate) : null), [startDate]);
  const [viewMonth, setViewMonth] = useState(() => monthStart(today));

  const grid = useMemo(() => buildGrid(viewMonth), [viewMonth]);
  const todayKey = dateKey(today);

  const canGoPrev = start ? viewMonth > monthStart(start) : true;
  const canGoNext = viewMonth < monthStart(today);
  const shiftMonth = (delta) =>
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  /* จำนวนตาม status ของเดือนที่เปิดอยู่ — โชว์ใต้ปฏิทิน. */
  const monthCounts = useMemo(() => {
    const counts = {};
    grid.forEach((d) => {
      if (!sameMonth(d, viewMonth)) return;
      const entry = log[dateKey(d)];
      if (entry) counts[entry.status] = (counts[entry.status] || 0) + 1;
    });
    return counts;
  }, [grid, viewMonth, log]);

  const monthHasEntries = Object.keys(monthCounts).length > 0;

  return (
    <div
      className='flex flex-col w-full'
      style={{
        gap: 'var(--dim-space-300, 12px)',
        padding: 'var(--dim-space-400, 16px)',
        borderRadius: 'var(--dim-radius-400, 12px)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
        background: 'var(--surface-card-100, #FFFFFF)',
      }}
    >
      {/* Header — month navigation */}
      <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <button
          type='button'
          aria-label='เดือนก่อนหน้า'
          disabled={!canGoPrev}
          onClick={() => canGoPrev && shiftMonth(-1)}
          style={{
            background: 'transparent', border: 'none',
            cursor: canGoPrev ? 'pointer' : 'not-allowed',
            color: canGoPrev ? 'var(--text-content-secondary, #636B72)' : 'var(--text-content-quaternary, #ADB2B7)',
            display: 'inline-flex',
          }}
        >
          <Icon name='chevron_left' size={22} />
        </button>
        <span
          className='flex-1 text-center'
          style={{
            fontSize: 'var(--type-size-base, 16px)',
            fontWeight: 'var(--type-weight-bold, 700)',
            color: 'var(--text-content-default, #363B3F)',
          }}
        >
          {THAI_MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear() + 543}
        </span>
        <button
          type='button'
          aria-label='เดือนถัดไป'
          disabled={!canGoNext}
          onClick={() => canGoNext && shiftMonth(1)}
          style={{
            background: 'transparent', border: 'none',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            color: canGoNext ? 'var(--text-content-secondary, #636B72)' : 'var(--text-content-quaternary, #ADB2B7)',
            display: 'inline-flex',
          }}
        >
          <Icon name='chevron_right' size={22} />
        </button>
      </div>

      {/* Weekday header */}
      <div className='grid w-full' style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 'var(--dim-space-100, 4px)' }}>
        {WEEKDAYS.map((w) => (
          <span
            key={w}
            className='text-center'
            style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)', paddingBottom: 'var(--dim-space-100, 4px)' }}
          >
            {w}
          </span>
        ))}

        {/* Day cells */}
        {grid.map((d) => {
          const key = dateKey(d);
          const inMonth = sameMonth(d, viewMonth);
          const entry = inMonth ? log[key] : null;
          const visual = entry ? STATUS_VISUALS[entry.status] : null;
          const isToday = key === todayKey;
          const isFuture = key > todayKey;
          const beforeStart = start ? d < start : false;
          const clickable = !readOnly && inMonth && !isFuture && !beforeStart && onDayClick;

          return (
            <button
              key={key}
              type='button'
              disabled={!clickable}
              onClick={() => clickable && onDayClick(key, entry || null)}
              title={entry
                ? `${key} · ${DOT_DAY_STATUSES.find((s) => s.value === entry.status)?.label || entry.status}${entry.note ? ` · ${entry.note}` : ''}`
                : key}
              className='flex flex-col items-center justify-center'
              style={{
                minHeight: 52,
                gap: 'var(--dim-space-050, 2px)',
                borderRadius: 'var(--dim-radius-200, 8px)',
                border: isToday
                  ? 'var(--dim-stroke-200, 2px) solid var(--border-brandPrimary-default, #007549)'
                  : `var(--dim-stroke-100, 1px) solid ${visual ? visual.border : 'var(--border-neutral-quaternary, #F4F5F5)'}`,
                background: visual ? visual.bg : 'var(--surface-card-100, #FFFFFF)',
                color: !inMonth
                  ? 'var(--text-content-quaternary, #ADB2B7)'
                  : visual ? visual.fg : 'var(--text-content-secondary, #636B72)',
                opacity: inMonth ? 1 : 0.45,
                cursor: clickable ? 'pointer' : 'default',
              }}
            >
              <span style={{ fontSize: 'var(--type-size-xs, 12px)', fontWeight: isToday ? 'var(--type-weight-bold, 700)' : 'var(--type-weight-regular, 400)' }}>
                {d.getDate()}
              </span>
              {visual && inMonth && <Icon name={visual.icon} size={16} />}
            </button>
          );
        })}
      </div>

      {/* Legend + month tally */}
      <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        {DOT_DAY_STATUSES.map((s) => {
          const visual = STATUS_VISUALS[s.value];
          return (
            <span key={s.value} className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)', fontSize: 'var(--type-size-xs, 12px)', color: visual.fg }}>
              <Icon name={visual.icon} size={14} />
              {s.label}
              {monthCounts[s.value] ? ` (${monthCounts[s.value]})` : ''}
            </span>
          );
        })}
      </div>

      {!monthHasEntries && (
        <div
          className='flex items-center justify-center w-full'
          style={{
            gap: 'var(--dim-space-200, 8px)',
            paddingTop: 'var(--dim-space-300, 12px)',
            paddingBottom: 'var(--dim-space-300, 12px)',
            color: 'var(--text-content-tertiary, #858C92)',
            fontSize: 'var(--type-size-sm, 14px)',
          }}
        >
          <Icon name='event_available' size={16} />
          เดือนนี้ยังไม่มีบันทึกการกินยา — คลิกวันที่ผ่านมาแล้วเพื่อบันทึกย้อนหลัง (ต้องระบุเหตุผล)
        </div>
      )}
    </div>
  );
};

export default DotCalendarLog;
