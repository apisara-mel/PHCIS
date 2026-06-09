import { isoKey, startOfWeekSunday } from './appointmentShared';

/** Stable React `key` for calendar body — remount triggers `.mih-calendar-slide`. */
export function calendarContentKey(calView, cursor) {
  if (calView === 'month') {
    return `month-${cursor.getFullYear()}-${cursor.getMonth()}`;
  }
  if (calView === 'week') {
    return `week-${isoKey(startOfWeekSunday(cursor))}`;
  }
  return `day-${isoKey(cursor)}`;
}

const VIEW_ORDER = { month: 0, week: 1, day: 2 };

/** Direction when switching month / week / day tabs. */
export function calendarViewSlideDirection(fromView, toView) {
  return (VIEW_ORDER[toView] ?? 0) >= (VIEW_ORDER[fromView] ?? 0) ? 'forward' : 'backward';
}
