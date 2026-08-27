import React from 'react';
import Information from '@/components/information/Information';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { FieldGrid } from '@/components/forms/Fields';
import {
  formatApptListDate,
  formatApptExamModeLabel,
  formatApptPreOrderLabel,
  getAppointmentDisplayStatus,
  APPT_STATUS_NO_SHOW,
  APPT_STATUS_CANCELLED,
  timeToSlotRange,
  SLOT_MINUTES,
} from './appointmentShared';

/* MIH PHCIS · Read-only appointment detail cards — Figma Appointment
   29:13306 / 29:13492 / 29:13839 (past detail popup). */

export const APPT_READONLY_CARD_TITLE_STYLE = {
  color: 'var(--text-topic-tertiary-title, #363B3F)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontWeight: 'var(--type-weight-regular)',
  fontSize: 'var(--type-size-base)',
  lineHeight: 1.5,
};

export const ApptReadOnlyCard = ({ title, children, gap = 'var(--dim-space-400)' }) => (
  <div
    className='flex flex-col w-full'
    style={{
      gap,
      padding: 'var(--dim-space-600)',
      borderRadius: 'var(--dim-radius-400)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
      background: 'var(--surface-card-200, #FDFDFD)',
    }}
  >
    <span style={APPT_READONLY_CARD_TITLE_STYLE}>{title}</span>
    {children}
  </div>
);

export const ApptReadOnlyField = ({ label, value }) => (
  <Information
    className='flex-1 min-w-0 w-full'
    style={{ maxWidth: 640 }}
    subText={label}
    text={value || '—'}
    showBadge={false}
    showBadge2={false}
  />
);

/** Normalize form row or stored appointment into read-only card source. */
export function toReadOnlyApptSource(source) {
  if (!source) return null;
  const slotRange = source.slotRange
    || (source.time ? timeToSlotRange(source.time, SLOT_MINUTES) : '');
  return {
    clinic: source.clinic,
    orderingUnit: source.orderingUnit || source.site,
    type: source.type,
    doctor: source.doctor,
    reason: source.reason,
    prep: source.prep,
    preOrder: source.preOrder,
    preOrderNote: source.preOrderNote,
    advance: source.advance,
    condition: source.condition,
    examMode: source.examMode,
    date: source.date,
    time: source.time || slotRange,
    slotRange,
  };
}

export const AppointmentReadOnlyStatusBadge = ({ appt }) => {
  const status = getAppointmentDisplayStatus(appt);
  const label = status === APPT_STATUS_NO_SHOW
    ? 'ไม่มาตามนัด'
    : status === APPT_STATUS_CANCELLED
      ? 'ยกเลิก'
      : 'นัดที่ผ่านมาแล้ว';
  return (
    <ColorfulBadge
      style='grey'
      size='small'
      hierarchy='secondary'
      width='hug'
    >
      {label}
    </ColorfulBadge>
  );
};

/** Three read-only cards — detail / pre-order / date-time. */
export const AppointmentReadOnlyCards = ({ appt }) => {
  const row = toReadOnlyApptSource(appt);
  if (!row) return null;

  const slotRange = row.slotRange || timeToSlotRange(row.time, SLOT_MINUTES);
  const preOrderNote = row.preOrderNote || row.condition || '';

  return (
    <>
      <ApptReadOnlyCard title='รายละเอียดการนัดหมาย'>
        <FieldGrid cols={2} rowGap='var(--dim-space-400)' columnGap='var(--dim-space-1200)'>
          <ApptReadOnlyField label='หน่วยงานที่สั่งนัด' value={row.orderingUnit} />
          <ApptReadOnlyField label='คลินิกที่นัดตรวจ' value={row.clinic} />
        </FieldGrid>
        <FieldGrid cols={2} rowGap='var(--dim-space-400)' columnGap='var(--dim-space-1200)'>
          <ApptReadOnlyField label='ลักษณะการนัดหมาย' value={row.type} />
          <ApptReadOnlyField label='แพทย์ผู้ตรวจ' value={row.doctor} />
        </FieldGrid>
        <FieldGrid cols={2} rowGap='var(--dim-space-400)' columnGap='var(--dim-space-1200)'>
          <ApptReadOnlyField label='เหตุผลการนัดหมาย / อาการเบื้องต้น' value={row.reason} />
          <ApptReadOnlyField label='การเตรียมตัวก่อนตรวจ' value={row.prep} />
        </FieldGrid>
      </ApptReadOnlyCard>

      <ApptReadOnlyCard title='คำสั่งล่วงหน้า' gap='var(--dim-space-300)'>
        <ApptReadOnlyField label='คำสั่งล่วงหน้า' value={formatApptPreOrderLabel(row)} />
        {(row.preOrder === 'has' || row.advance === 'has') && preOrderNote && (
          <ApptReadOnlyField label='เงื่อนไขก่อนทำ' value={preOrderNote} />
        )}
      </ApptReadOnlyCard>

      <ApptReadOnlyCard title='วันเวลาที่นัด' gap='var(--dim-space-300)'>
        <ApptReadOnlyField label='ประเภทการรับตรวจ' value={formatApptExamModeLabel(row.examMode)} />
        <FieldGrid cols={2} rowGap='var(--dim-space-400)' columnGap='var(--dim-space-1200)'>
          <ApptReadOnlyField label='วันที่นัดหมาย' value={formatApptListDate(row.date)} />
          <ApptReadOnlyField label='ช่วงเวลานัดหมาย' value={slotRange} />
        </FieldGrid>
      </ApptReadOnlyCard>
    </>
  );
};

/** History rail detail pane — badge + cards. */
export const AppointmentReadOnlyDetailPane = ({ appt }) => (
  <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
    <AppointmentReadOnlyStatusBadge appt={appt} />
    <AppointmentReadOnlyCards appt={appt} />
  </div>
);
