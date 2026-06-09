import React, { useMemo } from 'react';
import Popup from '@/components/popup/Popup';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import AppointmentCalendarSlot from '@/components/appointment/AppointmentCalendarSlot';
import {
  TIME_SLOTS,
  parseDateKey,
  isStaffClosedDay,
  getNationalHoliday,
  isSlotDisabled,
  THAI_MONTHS,
} from './appointmentShared';

/* MIH PHCIS · Appointment day slots popup — Figma 20:8381 (Popup Large).
   Opens from month cell “ดูทั้งหมด”. Height follows Popup large: max viewport
   inset with scrollable body (same flex/maxHeight contract as other large modals). */

const DATE_PILL_SIZE = 'var(--dim-size-500, 24px)';

function DayDatePill({ day, isToday }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: DATE_PILL_SIZE,
        height: DATE_PILL_SIZE,
        borderRadius: 'var(--dim-radius-full)',
        background: 'var(--surface-calendar-slot-date-default)',
        color: isToday
          ? 'var(--text-calendar-slot-date-current)'
          : 'var(--text-calendar-slot-date-default)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        fontWeight: 'var(--type-weight-medium)',
        lineHeight: 1.5,
        flexShrink: 0,
      }}
    >
      {day}
    </span>
  );
}

const AppointmentDaySlotsPopup = ({
  open,
  dateKey,
  todayKey,
  appointments,
  staffId,
  onClose,
  onBookSlot,
  onOpenDetail,
}) => {
  const apptByTime = useMemo(() => {
    if (!dateKey) return {};
    const map = {};
    appointments
      .filter((a) => a.staffId === staffId && a.date === dateKey)
      .forEach((a) => { map[a.time] = a; });
    return map;
  }, [appointments, staffId, dateKey]);

  const dayMeta = useMemo(() => {
    if (!dateKey) return null;
    const d = parseDateKey(dateKey);
    return {
      day: d.getDate(),
      isToday: dateKey === todayKey,
      holiday: getNationalHoliday(dateKey),
      closed: isStaffClosedDay(dateKey),
      title: `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`,
    };
  }, [dateKey, todayKey]);

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='large'
      title='ตารางนัดหมาย'
      subtitle='แสดงตารางนัดหมายทั้งวัน'
      primaryAction={{ label: 'ปิด', onClick: onClose }}
    >
      {dayMeta && (
        <div
          style={{
            width: '100%',
            minWidth: 0,
            borderRadius: 'var(--dim-radius-200)',
            border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            background: 'var(--surface-card-100)',
            padding: 'var(--dim-space-200)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--dim-space-200)',
            minHeight: 'var(--dim-size-1000, 160px)',
          }}
        >
          <div
            className='flex items-center min-w-0 w-full'
            style={{ gap: 'var(--dim-space-200)' }}
          >
            <DayDatePill day={dayMeta.day} isToday={dayMeta.isToday} />
            {dayMeta.holiday && (
              <span
                style={{
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xxs, 10px)',
                  fontWeight: 'var(--type-weight-bold)',
                  color: 'var(--text-calendar-slot-text)',
                  lineHeight: 1.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {dayMeta.holiday.name}
              </span>
            )}
          </div>

          {dayMeta.closed ? (
            <div
              className='flex flex-col w-full'
              style={{ gap: 'var(--dim-space-050)', alignItems: 'flex-start' }}
            >
              <ColorfulBadge style='red' size='small' hierarchy='secondary' width='hug'>
                วันหยุด
              </ColorfulBadge>
            </div>
          ) : (
            <div
              className='flex flex-col w-full'
              style={{ gap: 'var(--dim-space-050)' }}
            >
              {TIME_SLOTS.map((time) => {
                const appt = apptByTime[time];
                if (appt) {
                  return (
                    <AppointmentCalendarSlot
                      key={time}
                      size='medium'
                      booked
                      patient={appt.patient}
                      patientAvatar={appt.patientAvatar}
                      onClick={() => onOpenDetail(appt)}
                    />
                  );
                }
                const disabled = isSlotDisabled(dateKey, time);
                return (
                  <AppointmentCalendarSlot
                    key={time}
                    size='medium'
                    time={time}
                    disabled={disabled}
                    onClick={disabled ? undefined : () => onBookSlot({ date: dateKey, time })}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </Popup>
  );
};

export default AppointmentDaySlotsPopup;
