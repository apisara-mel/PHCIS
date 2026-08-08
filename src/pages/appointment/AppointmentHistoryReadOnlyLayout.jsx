import React, { useEffect, useMemo, useState } from 'react';
import ServiceDateList from '@/components/list/ServiceDateList';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import emptyApptAnim from '@/assets/illustrations/Medical checkup.json';
import { AppointmentReadOnlyDetailPane } from './AppointmentReadOnlyDetail';
import {
  findAppointmentsByHn,
  formatApptListDate,
} from './appointmentShared';

/* MIH PHCIS · ประวัติการนัด read-only layout — Figma Appointment
   29:13306 (upcoming · badge orange) · 29:13492 (past · badge grey). */

const EmptyHistory = () => (
  <div
    className='flex flex-1 flex-col items-center justify-center w-full text-center'
    style={{ gap: 'var(--dim-space-150, 6px)', minHeight: 0, padding: 'var(--dim-space-600)' }}
  >
    <LottieIllustration animationData={emptyApptAnim} size={112} />
    <p
      style={{
        margin: 'var(--dim-space-0)',
        color: 'var(--text-brandPrimary-default, #007549)',
        fontFamily: 'var(--type-family-heading-content)',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
        lineHeight: 1.5,
      }}
    >
      ยังไม่มีประวัติการนัดหมาย
    </p>
    <p
      style={{
        margin: 'var(--dim-space-0)',
        color: 'var(--text-content-quaternary, #ADB2B7)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-medium, 500)',
        lineHeight: 1.5,
      }}
    >
      รายการนัดหมายของผู้ป่วยจะแสดงที่นี่
    </p>
  </div>
);

export const AppointmentHistoryReadOnlyLayout = ({
  appointments = [],
  hn = '',
  highlightId,
  independentScroll = false,
}) => {
  const rows = useMemo(
    () => findAppointmentsByHn(appointments, hn),
    [appointments, hn],
  );

  const highlightIndex = useMemo(
    () => (highlightId ? rows.findIndex((a) => a.id === highlightId) : -1),
    [rows, highlightId],
  );

  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!rows.length) {
      setSelectedIndex(0);
      return;
    }
    if (highlightIndex >= 0) {
      setSelectedIndex(highlightIndex);
      return;
    }
    setSelectedIndex(0);
  }, [rows, highlightIndex, hn]);

  const dateItems = useMemo(
    () => rows.map((a) => ({
      id: a.id,
      date: formatApptListDate(a.date),
      center: a.site || a.center,
    })),
    [rows],
  );

  const selected = rows[selectedIndex] ?? rows[0];

  if (!rows.length) {
    return (
      <div
        className='flex w-full min-w-0'
        style={independentScroll ? { flex: 1, minHeight: 0, height: '100%' } : undefined}
      >
        <EmptyHistory />
      </div>
    );
  }

  return (
    <div
      className='flex w-full min-w-0'
      style={{
        gap: 'var(--dim-space-0)',
        alignItems: 'stretch',
        ...(independentScroll
          ? { flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }
          : null),
      }}
    >
      <div
        style={
          independentScroll
            ? { flexShrink: 0, height: '100%', minHeight: 720, overflowY: 'auto', overflowX: 'hidden' }
            : undefined
        }
      >
        <ServiceDateList
          title='วันที่นัดหมาย'
          items={dateItems}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          showRailShadow
          fillHeight={independentScroll}
        />
      </div>

      <section
        className='flex flex-col flex-1 min-w-0 bg-surface-card'
        style={{
          gap: 'var(--dim-space-300)',
          paddingTop: 'var(--dim-space-200)',
          paddingRight: 'var(--dim-space-400)',
          paddingBottom: 'var(--dim-space-600)',
          paddingLeft: 'var(--dim-space-600)',
          ...(independentScroll
            ? {
                height: '100%',
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
              }
            : null),
        }}
      >
        {selected && <AppointmentReadOnlyDetailPane appt={selected} />}
      </section>
    </div>
  );
};

export default AppointmentHistoryReadOnlyLayout;
