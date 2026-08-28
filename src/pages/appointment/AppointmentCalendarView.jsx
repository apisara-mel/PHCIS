import React, { useMemo, useState, useCallback } from 'react';
import AppointmentDaySlotsPopup from './AppointmentDaySlotsPopup';
import AppointmentListView from './AppointmentListView';
import TabPill, { TabBar } from '@/components/tab/TabPill';
import Topic from '@/components/topic/Topic';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueIconButton from '@/components/button/BrandSubdueIconButton';
import AppointmentCalendarSlot, {
  AppointmentCalendarSeeAll,
} from '@/components/appointment/AppointmentCalendarSlot';
import {
  calendarContentKey,
  calendarViewSlideDirection,
} from './calendarSlideTransition';
import {
  THAI_MONTHS,
  THAI_MONTHS_SHORT,
  CAL_DAY_HEADERS_LONG,
  TIME_SLOTS,
  buildMonthWeekRows,
  startOfWeekSunday,
  isoKey,
  parseDateKey,
  isSlotDisabled,
  isStaffClosedDay,
  getNationalHoliday,
  MONTH_PREVIEW_TIMES,
} from './appointmentShared';

/* Figma Appointment · 6:11075 — doctor calendar month card */

const CAL_VIEWS = [
  { key: 'month', label: 'เดือน' },
  { key: 'week', label: 'สัปดาห์' },
  { key: 'day', label: 'วัน' },
];

const VIEW_ICON_SIZE = 14;

const viewToggleIcon = (name) => ({ color }) => (
  <span
    aria-hidden
    className='material-symbols-outlined'
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontSize: 'var(--type-size-sm, 14px)',
      lineHeight: 1,
      color: color || 'inherit',
      fontVariationSettings: `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' ${VIEW_ICON_SIZE}`,
      userSelect: 'none',
    }}
  >
    {name}
  </span>
);

const DATE_PILL_SIZE = 'var(--dim-size-500, 24px)';

function MonthDatePill({ day, isToday, inMonth }) {
  const bg = 'var(--surface-calendar-slot-date-default)';
  const color = !inMonth
    ? 'var(--text-calendar-slot-date-disabled)'
    : isToday
      ? 'var(--text-calendar-slot-date-current)'
      : 'var(--text-calendar-slot-date-default)';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: DATE_PILL_SIZE,
        height: DATE_PILL_SIZE,
        borderRadius: 'var(--dim-radius-full)',
        background: bg,
        color,
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

function MonthDayCell({
  cell,
  todayKey,
  apptByDateTime,
  onBookSlot,
  onOpenDetail,
  onSeeAllDay,
}) {
  const { key, day, inMonth } = cell;
  const closed = inMonth && isStaffClosedDay(key);
  const holiday = inMonth ? getNationalHoliday(key) : null;
  const isToday = key === todayKey;
  const dayAppts = inMonth ? apptByDateTime[key] || {} : {};

  const cellBorder = inMonth
    ? 'var(--border-brandPrimary-quaternary)'
    : 'var(--border-calendar-slot-slot-disabled)';

  return (
    <div
      style={{
        flex: '1 1 0',
        minWidth: 0,
        minHeight: 160,
        padding: 'var(--dim-space-200)',
        borderRadius: 'var(--dim-radius-200)',
        border: `var(--dim-stroke-100) solid ${cellBorder}`,
        background: 'var(--surface-card-100)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 'var(--dim-space-200)',
        overflow: 'hidden',
      }}
    >
      <div
        className='flex items-center min-w-0 w-full'
        style={{ gap: 'var(--dim-space-200)' }}
      >
        <MonthDatePill day={day} isToday={isToday} inMonth={inMonth} />
        {holiday && (
          <span
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xxs, 10px)',
              fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
              color: 'var(--text-calendar-slot-text)',
              lineHeight: 1.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {holiday.name}
          </span>
        )}
      </div>

      {inMonth && closed && (
        <div
          className='flex flex-col w-full'
          style={{ gap: 'var(--dim-space-050)', alignItems: 'center' }}
        >
          <ColorfulBadge style='red' size='small' hierarchy='secondary' width='hug'>
            วันหยุด
          </ColorfulBadge>
        </div>
      )}

      {inMonth && !closed && (
        <>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--dim-space-050)',
              width: '100%',
            }}
          >
            {MONTH_PREVIEW_TIMES.map((t) => {
              const appt = dayAppts[t];
              if (appt) {
                return (
                  <AppointmentCalendarSlot
                    key={`${key}-${t}`}
                    booked
                    patient={appt.patient}
                    patientAvatar={appt.patientAvatar}
                    onClick={() => onOpenDetail(appt)}
                  />
                );
              }
              const disabled = isSlotDisabled(key, t);
              return (
                <AppointmentCalendarSlot
                  key={`${key}-${t}`}
                  time={t}
                  disabled={disabled}
                  onClick={disabled ? undefined : () => onBookSlot({ date: key, time: t })}
                />
              );
            })}
          </div>
          <AppointmentCalendarSeeAll onClick={() => onSeeAllDay(key)} />
        </>
      )}
    </div>
  );
}

function MonthWeekdayHeader() {
  return (
    <div
      className='flex w-full'
      style={{ gap: 0 }}
    >
      {CAL_DAY_HEADERS_LONG.map((label, index) => (
        <div
          key={label}
          style={{
            flex: '1 1 0',
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            minHeight: 'var(--dim-size-900, 44px)',
            padding: 'var(--dim-space-200) var(--dim-space-400)',
            paddingLeft: index === 0 ? 'var(--dim-space-400)' : 'var(--dim-space-300)',
            background: 'var(--surface-table-header)',
            borderBottom: 'var(--dim-stroke-200) solid var(--border-table-default)',
            borderTopLeftRadius: index === 0 ? 'var(--dim-radius-400)' : 0,
            borderTopRightRadius: index === CAL_DAY_HEADERS_LONG.length - 1
              ? 'var(--dim-radius-400)'
              : 0,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--type-family-heading-content)',
              fontSize: 'var(--type-size-xs)',
              fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
              color: 'var(--text-table-title)',
              lineHeight: 1.5,
            }}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Figma 6:20201 — week column: duty-off badge, out-of-month disabled slots, or full day slots */
function WeekDayCell({
  dateKey,
  day,
  inMonth,
  isToday,
  apptByDateTime,
  onBookSlot,
  onOpenDetail,
}) {
  const closed = inMonth && isStaffClosedDay(dateKey);
  const holiday = inMonth ? getNationalHoliday(dateKey) : null;
  const dayAppts = apptByDateTime[dateKey] || {};

  const cellBorder = inMonth
    ? 'var(--border-brandPrimary-quaternary)'
    : 'var(--border-calendar-slot-slot-disabled)';

  return (
    <div
      style={{
        flex: '1 1 0',
        minWidth: 0,
        minHeight: 160,
        padding: 'var(--dim-space-200)',
        borderRadius: 'var(--dim-radius-200)',
        border: `var(--dim-stroke-100) solid ${cellBorder}`,
        background: 'var(--surface-card-100)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 'var(--dim-space-200)',
        overflow: 'hidden',
      }}
    >
      <div
        className='flex items-center min-w-0 w-full'
        style={{ gap: 'var(--dim-space-200)' }}
      >
        <MonthDatePill day={day} isToday={isToday} inMonth={inMonth} />
        {holiday && (
          <span
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xxs, 10px)',
              fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
              color: 'var(--text-calendar-slot-text)',
              lineHeight: 1.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {holiday.name}
          </span>
        )}
      </div>

      {closed && (
        <div
          className='flex flex-col w-full'
          style={{ gap: 'var(--dim-space-050)', alignItems: 'center' }}
        >
          <ColorfulBadge style='red' size='small' hierarchy='secondary' width='hug'>
            วันหยุด
          </ColorfulBadge>
        </div>
      )}

      {!closed && (
        <div
          className='flex flex-col w-full'
          style={{ gap: 'var(--dim-space-050)' }}
        >
          {TIME_SLOTS.map((time) => {
            if (!inMonth) {
              return (
                <AppointmentCalendarSlot
                  key={`${dateKey}-${time}`}
                  time={time}
                  disabled
                />
              );
            }
            const appt = dayAppts[time];
            if (appt) {
              return (
                <AppointmentCalendarSlot
                  key={`${dateKey}-${time}`}
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
                key={`${dateKey}-${time}`}
                time={time}
                disabled={disabled}
                onClick={disabled ? undefined : () => onBookSlot({ date: dateKey, time })}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Figma 6:22070 — single weekday header row for day view */
function DayWeekdayHeader({ label }) {
  return (
    <div className='flex w-full'>
      <div
        style={{
          flex: '1 1 0',
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          minHeight: 'var(--dim-size-900, 44px)',
          padding: 'var(--dim-space-200) var(--dim-space-400)',
          paddingLeft: 'var(--dim-space-300)',
          background: 'var(--surface-table-header)',
          borderBottom: 'var(--dim-stroke-200) solid var(--border-table-default)',
          borderTopLeftRadius: 'var(--dim-radius-400)',
          borderTopRightRadius: 'var(--dim-radius-400)',
        }}
      >
        <div className='flex flex-col items-start min-w-0 w-full'>
          <span
            style={{
              fontFamily: 'var(--type-family-heading-content)',
              fontSize: 'var(--type-size-xs)',
              fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
              color: 'var(--text-table-title)',
              lineHeight: 1.5,
            }}
          >
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Figma 6:22070 / 6:15479 — full-width day column with medium slots */
function DayViewPanel({
  dateKey,
  day,
  isToday,
  weekdayLabel,
  apptByDateTime,
  onBookSlot,
  onOpenDetail,
}) {
  const closed = isStaffClosedDay(dateKey);
  const holiday = getNationalHoliday(dateKey);
  const dayAppts = apptByDateTime[dateKey] || {};

  return (
    <div
      style={{
        borderRadius: 'var(--dim-radius-400)',
        border: 'var(--dim-stroke-100) solid var(--border-table-default)',
        overflow: 'hidden',
        width: '100%',
      }}
    >
      <DayWeekdayHeader label={weekdayLabel} />
      <div style={{ padding: 'var(--dim-space-400)' }}>
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
            alignItems: 'flex-start',
            gap: 'var(--dim-space-200)',
            minHeight: 'var(--dim-size-1000, 160px)',
          }}
        >
          <div
            className='flex items-center min-w-0 w-full'
            style={{ gap: 'var(--dim-space-200)' }}
          >
            <MonthDatePill day={day} isToday={isToday} inMonth />
            {holiday && (
              <span
                style={{
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xxs, 10px)',
                  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                  color: 'var(--text-calendar-slot-text)',
                  lineHeight: 1.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {holiday.name}
              </span>
            )}
          </div>

          {closed ? (
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
                const appt = dayAppts[time];
                if (appt) {
                  return (
                    <AppointmentCalendarSlot
                      key={`${dateKey}-${time}`}
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
                    key={`${dateKey}-${time}`}
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
      </div>
    </div>
  );
}

const AppointmentCalendarView = ({
  appointments,
  onBookSlot,
  onOpenDetail,
  staffId,
  staff,
  layoutMode = 'calendar',
  onLayoutModeChange,
  /* เดือนที่เปิดมาเจอเป็นอันแรก — ค่าเดิมคือ มิ.ย. 2569 ซึ่งเป็นเดือนที่ข้อมูล
     ตัวอย่างของหน้านัดหมายกระจุกอยู่ ผู้เรียกที่ต้องการ "เดือนนี้" (เช่น
     ป๊อปอัปดูตารางเวร) ส่ง `initialCursor` มาเองได้ */
  initialCursor = null,
  /* หัวข้อของตาราง — ค่าเดิมพูดกับคนที่กำลังจะลงนัด ผู้เรียกที่เปิดดูอย่างเดียว
     ต้องเปลี่ยนคำได้ ไม่งั้นจะชวนให้กดช่องว่างแล้วไม่มีอะไรเกิดขึ้น */
  sectionTitle = 'เลือก Slot',
  sectionSubText = 'คลิกเพื่อเลือก Slot ที่ว่างเพื่อทำการนัดหมาย',
}) => {
  const [calView, setCalView] = useState('month');
  const [cursor, setCursor] = useState(() => initialCursor ?? new Date(2026, 5, 1));
  const [slideDirection, setSlideDirection] = useState('forward');

  const staffAppts = useMemo(
    () => appointments.filter((a) => a.staffId === staffId),
    [appointments, staffId],
  );

  const apptByDateTime = useMemo(() => {
    const map = {};
    staffAppts.forEach((a) => {
      if (!map[a.date]) map[a.date] = {};
      map[a.date][a.time] = a;
    });
    return map;
  }, [staffAppts]);

  const monthWeekRows = useMemo(
    () => buildMonthWeekRows(cursor.getFullYear(), cursor.getMonth(), 'sunday'),
    [cursor],
  );
  const todayKey = isoKey(new Date());

  const weekDays = useMemo(() => {
    const sun = startOfWeekSunday(cursor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sun);
      d.setDate(sun.getDate() + i);
      return d;
    });
  }, [cursor]);

  const navLabel = calView === 'month'
    ? `${THAI_MONTHS[cursor.getMonth()]} ${cursor.getFullYear() + 543}`
    : calView === 'week'
      ? (() => {
        const sun = startOfWeekSunday(cursor);
        const sat = new Date(sun);
        sat.setDate(sun.getDate() + 6);
        return `${sun.getDate()} ${THAI_MONTHS_SHORT[sun.getMonth()]} – ${sat.getDate()} ${THAI_MONTHS_SHORT[sat.getMonth()]} ${sat.getFullYear() + 543}`;
      })()
      : `${cursor.getDate()} ${THAI_MONTHS[cursor.getMonth()]} ${cursor.getFullYear() + 543}`;

  const goPrev = () => {
    setSlideDirection('backward');
    const n = new Date(cursor);
    if (calView === 'month') { n.setDate(1); n.setMonth(n.getMonth() - 1); }
    else if (calView === 'week') n.setDate(n.getDate() - 7);
    else n.setDate(n.getDate() - 1);
    setCursor(n);
  };

  const goNext = () => {
    setSlideDirection('forward');
    const n = new Date(cursor);
    if (calView === 'month') { n.setDate(1); n.setMonth(n.getMonth() + 1); }
    else if (calView === 'week') n.setDate(n.getDate() + 7);
    else n.setDate(n.getDate() + 1);
    setCursor(n);
  };

  const handleCalViewChange = useCallback((nextView) => {
    setSlideDirection(calendarViewSlideDirection(calView, nextView));
    setCalView(nextView);
  }, [calView]);

  const calendarSlideKey = calendarContentKey(calView, cursor);

  const [daySlotsDate, setDaySlotsDate] = useState(null);
  const handleSeeAllDay = useCallback((dateKey) => {
    setDaySlotsDate(dateKey);
  }, []);

  return (
    <div className='flex flex-col flex-1 min-w-0'>
      <section
        className='w-full flex flex-col'
        style={{
          background: 'var(--surface-card-100)',
          borderRadius: 'var(--dim-radius-500)',
          border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
          boxShadow: 'var(--shadow-brand-top-200)',
          overflow: 'hidden',
          padding: 'var(--dim-space-600)',
          gap: 'var(--dim-space-600)',
        }}
      >
        <div
          className='flex items-center w-full min-w-0'
          style={{ gap: 'var(--dim-space-600)', flexWrap: 'nowrap' }}
        >
          <div
            className='inline-flex items-center shrink-0'
            style={{ gap: 'var(--dim-space-600)' }}
          >
            <BrandSubdueIconButton
              variant='outline'
              size='md'
              icon='chevron_left'
              aria-label='ช่วงก่อนหน้า'
              onClick={goPrev}
            />
            <span
              className='whitespace-nowrap'
              style={{
                textAlign: 'center',
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontWeight: 'var(--type-weight-regular)',
                fontSize: 'var(--type-size-xl)',
                color: 'var(--text-navigation-title)',
                lineHeight: 1.375,
              }}
            >
              {navLabel}
            </span>
            <BrandSubdueIconButton
              variant='outline'
              size='md'
              icon='chevron_right'
              aria-label='ช่วงถัดไป'
              onClick={goNext}
            />
          </div>

          {layoutMode === 'calendar' ? (
            <div
              className='flex flex-1 items-center min-w-0'
              style={{ gap: 'var(--dim-space-300)' }}
            >
              <TabBar ariaLabel='ช่วงเวลา'>
                {CAL_VIEWS.map((v) => (
                  <TabPill
                    key={v.key}
                    size='small'
                    selected={calView === v.key}
                    onClick={() => handleCalViewChange(v.key)}
                  >
                    {v.label}
                  </TabPill>
                ))}
              </TabBar>
            </div>
          ) : (
            <div className='flex-1 min-w-0' aria-hidden />
          )}

          <div
            className='inline-flex items-center shrink-0'
            style={{ gap: 'var(--dim-space-300)' }}
          >
            <span
              className='whitespace-nowrap'
              style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
                fontWeight: 'var(--type-weight-medium)',
                color: 'var(--text-content-tertiary)',
                lineHeight: 1.5,
              }}
            >
              มุมมอง
            </span>
            <TabBar ariaLabel='รูปแบบการแสดงผล'>
              <TabPill
                size='small'
                style='icon'
                selected={layoutMode === 'calendar'}
                onClick={() => onLayoutModeChange?.('calendar')}
                leadingIcon={viewToggleIcon('calendar_today')}
                aria-label='ปฏิทิน'
              />
              <TabPill
                size='small'
                style='icon'
                selected={layoutMode === 'list'}
                onClick={() => onLayoutModeChange?.('list')}
                leadingIcon={viewToggleIcon('format_list_bulleted')}
                aria-label='รายการ'
              />
            </TabBar>
          </div>
        </div>

        <div
          style={{
            height: 'var(--dim-stroke-100)',
            background: 'var(--border-neutral-quaternary)',
            width: '100%',
          }}
        />

        <div style={{ overflow: 'hidden', width: '100%' }}>
          {layoutMode === 'list' ? (
            <AppointmentListView
              embedded
              staff={staff}
              staffId={staffId}
              appointments={appointments}
              onOpenDetail={onOpenDetail}
            />
          ) : (
            <div
              key={calendarSlideKey}
              data-direction={slideDirection}
              className='mih-calendar-slide flex flex-col w-full'
              style={{ gap: 'var(--dim-space-300)' }}
            >
            <Topic
              hierarchy='secondary'
              title={sectionTitle}
              subText={sectionSubText}
              showBadge={false}
              showSuccess={false}
            />

            {calView === 'month' && (
              <div
                style={{
                  borderRadius: 'var(--dim-radius-400)',
                  border: 'var(--dim-stroke-100) solid var(--border-table-default)',
                  overflow: 'hidden',
                  width: '100%',
                }}
              >
                <MonthWeekdayHeader />
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--dim-space-150)',
                    padding: 'var(--dim-space-400)',
                  }}
                >
                  {monthWeekRows.map((row) => (
                    <div
                      key={row[0]?.key}
                      className='flex w-full'
                      style={{ gap: 'var(--dim-space-150)' }}
                    >
                      {row.map((cell) => (
                        <MonthDayCell
                          key={cell.key}
                          cell={cell}
                          todayKey={todayKey}
                          apptByDateTime={apptByDateTime}
                          onBookSlot={onBookSlot}
                          onOpenDetail={onOpenDetail}
                          onSeeAllDay={handleSeeAllDay}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {calView === 'week' && (
              <div
                style={{
                  borderRadius: 'var(--dim-radius-400)',
                  border: 'var(--dim-stroke-100) solid var(--border-table-default)',
                  overflow: 'hidden',
                  width: '100%',
                }}
              >
                <MonthWeekdayHeader />
                <div
                  className='flex w-full'
                  style={{
                    gap: 'var(--dim-space-150)',
                    padding: 'var(--dim-space-400)',
                  }}
                >
                  {weekDays.map((d) => {
                    const key = isoKey(d);
                    const inMonth = d.getMonth() === cursor.getMonth()
                      && d.getFullYear() === cursor.getFullYear();
                    return (
                      <WeekDayCell
                        key={key}
                        dateKey={key}
                        day={d.getDate()}
                        inMonth={inMonth}
                        isToday={key === todayKey}
                        apptByDateTime={apptByDateTime}
                        onBookSlot={onBookSlot}
                        onOpenDetail={onOpenDetail}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {calView === 'day' && (
              <DayViewPanel
                dateKey={isoKey(cursor)}
                day={cursor.getDate()}
                isToday={isoKey(cursor) === todayKey}
                weekdayLabel={CAL_DAY_HEADERS_LONG[cursor.getDay()]}
                apptByDateTime={apptByDateTime}
                onBookSlot={onBookSlot}
                onOpenDetail={onOpenDetail}
              />
            )}
            </div>
          )}
        </div>
      </section>

      <AppointmentDaySlotsPopup
        open={!!daySlotsDate}
        dateKey={daySlotsDate}
        todayKey={todayKey}
        appointments={appointments}
        staffId={staffId}
        onClose={() => setDaySlotsDate(null)}
        onBookSlot={(pick) => {
          setDaySlotsDate(null);
          onBookSlot(pick);
        }}
        onOpenDetail={(appt) => {
          setDaySlotsDate(null);
          onOpenDetail(appt);
        }}
      />
    </div>
  );
};

export default AppointmentCalendarView;
