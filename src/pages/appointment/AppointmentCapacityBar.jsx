import React, { useEffect, useMemo, useState } from 'react';
import StatusBadge from '@/components/badge/StatusBadge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import { Sym } from '@/components/forms/_inputBox';
import {
  AVAILABILITY,
  countActiveAppointmentsOnDate,
  evaluateDayAvailability,
  subscribeApptSettings,
} from './appointmentSettingsStore';
import { THAI_MONTHS_SHORT, isoKey, parseDateKey } from './appointmentShared';

/* TOR 1.6.2.8 — "จำนวนผู้รับบริการที่นัดในแต่ละวัน + สถานะ Available / Non-available".
   แถบความจุคิวรายวันใต้ SummaryCardsBar ของหน้า /appointment.
   โควตาต่อวันอ่านจาก appointmentSettingsStore (override รายวัน ทับ pattern). */

const DAY_HEADERS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

const dotColor = (status) => {
  if (status === AVAILABILITY.AVAILABLE) return 'var(--surface-alert-success)';
  if (status === AVAILABILITY.FULL) return 'var(--surface-alert-error)';
  if (status === AVAILABILITY.FACILITY_HOLIDAY || status === AVAILABILITY.RESOURCE_CLOSED) {
    return 'var(--surface-alert-warning)';
  }
  return 'var(--surface-neutral-quaternary)';
};

const DayCard = ({ day, onSelect, selected }) => {
  const [hover, setHover] = useState(false);
  const d = parseDateKey(day.key);
  const isAvailable = day.status === AVAILABILITY.AVAILABLE;
  const ratio = day.quota > 0 ? Math.min(1, day.booked / day.quota) : 1;

  return (
    <button
      type='button'
      onClick={() => onSelect?.(day)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={`${day.label} · ${day.reason} · จองแล้ว ${day.booked}/${day.quota} คิว`}
      className='flex flex-col shrink-0 text-left cursor-pointer'
      style={{
        minWidth: 116,
        gap: 'var(--dim-space-100, 4px)',
        paddingTop: 'var(--dim-space-300, 12px)',
        paddingBottom: 'var(--dim-space-300, 12px)',
        paddingLeft: 'var(--dim-space-300, 12px)',
        paddingRight: 'var(--dim-space-300, 12px)',
        borderRadius: 'var(--dim-radius-300, 10px)',
        border: `var(--dim-stroke-100, 1px) solid ${
          selected ? 'var(--border-brandPrimary-default)' : 'var(--border-neutral-tertiary)'
        }`,
        background: hover || selected
          ? 'var(--surface-brandPrimary-quaternary)'
          : 'var(--surface-card-100)',
      }}
    >
      <span
        style={{
          color: 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs, 12px)',
        }}
      >
        {DAY_HEADERS[d.getDay()]} {d.getDate()} {THAI_MONTHS_SHORT[d.getMonth()]}
      </span>
      <span
        style={{
          color: 'var(--text-content-default)',
          fontFamily: 'var(--type-family-heading-graphic2)',
          fontSize: 'var(--type-size-base, 16px)',
          fontWeight: 'var(--type-weight-medium)',
        }}
      >
        {day.booked}/{day.quota} คิว
      </span>
      <span
        aria-hidden
        style={{
          height: 'var(--dim-space-100, 4px)',
          width: '100%',
          borderRadius: 'var(--dim-radius-full)',
          background: 'var(--surface-neutral-quaternary)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${Math.round(ratio * 100)}%`,
            borderRadius: 'var(--dim-radius-full)',
            background: dotColor(day.status),
          }}
        />
      </span>
      <StatusBadge style={day.style} size='small' showDot>
        {isAvailable ? 'Available' : 'Non-available'}
      </StatusBadge>
      <span
        className='truncate'
        style={{
          color: 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs, 12px)',
          maxWidth: 132,
        }}
      >
        {day.reason}
      </span>
    </button>
  );
};

const AppointmentCapacityBar = ({
  appointments = [],
  staffId = null,
  days = 14,
  selectedDate = null,
  onSelectDate,
  onOpenSettings,
}) => {
  const [tick, setTick] = useState(0);
  useEffect(() => subscribeApptSettings(() => setTick((n) => n + 1)), []);

  const rows = useMemo(() => {
    const out = [];
    const base = new Date();
    for (let i = 0; i < days; i += 1) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const key = isoKey(d);
      const booked = countActiveAppointmentsOnDate(appointments, key, staffId);
      const verdict = evaluateDayAvailability({ dateKey: key, staffId, bookedCount: booked });
      out.push({
        key,
        label: `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]}`,
        ...verdict,
      });
    }
    return out;
    /* `tick` re-derives after any settings change (React 17 subscribe pattern). */
  }, [appointments, staffId, days, tick]);

  const availableCount = rows.filter((r) => r.status === AVAILABILITY.AVAILABLE).length;

  return (
    <section
      className='flex flex-col w-full'
      style={{
        gap: 'var(--dim-space-300, 12px)',
        paddingTop: 'var(--dim-space-400, 16px)',
        paddingBottom: 'var(--dim-space-400, 16px)',
        paddingLeft: 'var(--dim-space-500, 20px)',
        paddingRight: 'var(--dim-space-500, 20px)',
        borderRadius: 'var(--dim-radius-500, 16px)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary)',
        background: 'var(--surface-card-100)',
        boxShadow: 'var(--shadow-brand-top-200)',
      }}
    >
      <div className='flex flex-wrap items-center justify-between' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span
            className='flex items-center'
            style={{
              gap: 'var(--dim-space-200, 8px)',
              color: 'var(--text-content-default)',
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-base, 16px)',
              fontWeight: 'var(--type-weight-medium)',
            }}
          >
            <Sym name='event_seat' size={20} color='var(--icon-brandPrimary-default)' />
            ความจุคิวรายวัน · {days} วันข้างหน้า
          </span>
          <span
            style={{
              color: 'var(--text-content-tertiary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs, 12px)',
            }}
          >
            เปิดรับนัด {availableCount} วัน · เต็ม/ปิด {rows.length - availableCount} วัน — เกณฑ์: โควตาคิว ·
            วันหยุดสถานพยาบาล · วันหยุด Resource · ช่วงรับนัดล่วงหน้า (TOR 1.6.1.2 / 1.6.2.8)
          </span>
        </div>
        {onOpenSettings ? (
          <NeutralSubdueButton size='sm' variant='outline' leadingIcon='tune' onClick={onOpenSettings}>
            ปรับโควตาคิวรายวัน
          </NeutralSubdueButton>
        ) : null}
      </div>

      <div
        className='flex w-full'
        style={{ gap: 'var(--dim-space-200, 8px)', overflowX: 'auto', paddingBottom: 'var(--dim-space-100, 4px)' }}
      >
        {rows.map((day) => (
          <DayCard
            key={day.key}
            day={day}
            selected={selectedDate === day.key}
            onSelect={onSelectDate}
          />
        ))}
      </div>
    </section>
  );
};

export default AppointmentCapacityBar;
