import React, { useEffect, useMemo, useState } from 'react';
import Calendar from '@/components/forms/Calendar';
import Timeslot from '@/components/timeslot/Timeslot';
import Alert from '@/components/alert/Alert';
import Badge from '@/components/badge/Badge';
import Icon from '@/components/icons/Icon';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import {
  roomsForExams, daySchedule, dayAvailability, firstAvailable,
  totalDurationOf, toDateISO, formatThaiDateTime, thaiWeekdayOf,
} from '@/data/xraySchedule';

/* ปฏิทินจองคิวตรวจรังสี — TOR §1.12.3 "การนัดตรวจ"
   ────────────────────────────────────────────────────────────────────────
   Composes two design-system parts rather than inventing a third:
     • Calendar (forms/Calendar.jsx) already renders a "เต็ม" day state via
       its `isFull` prop — exactly the day-level roll-up this needs,
     • Timeslot (timeslot/Timeslot.jsx) already renders a time-range pill
       with a disabled "(เต็ม)" suffix.
   Everything else here is layout + wiring to xraySchedule.js.

   Why a room picker at all: the basket decides which rooms are eligible
   (see roomsForExams), and a plain film can be shot in either XR room —
   letting the user move rooms is often the difference between "นัดพรุ่งนี้"
   and "นัดสัปดาห์หน้า". When only one room qualifies it is auto-selected
   and the chips read as a label.                                          */

const HALF_LABEL = { am: 'ช่วงเช้า', pm: 'ช่วงบ่าย' };

const SectionCard = ({ children, style }) => (
  <div
    className='flex flex-col w-full'
    style={{
      gap: 'var(--dim-space-300)',
      backgroundColor: 'var(--surface-card-default, #FFFFFF)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default, #EDEFF1)',
      borderRadius: 'var(--dim-radius-300, 12px)',
      paddingTop: 'var(--dim-space-400)',
      paddingRight: 'var(--dim-space-400)',
      paddingBottom: 'var(--dim-space-400)',
      paddingLeft: 'var(--dim-space-400)',
      ...style,
    }}
  >
    {children}
  </div>
);

const RoomChip = ({ room, selected, onClick, hint }) => (
  <button
    type='button'
    onClick={onClick}
    className='flex flex-col items-start text-left transition-colors'
    style={{
      gap: 'var(--dim-space-50)',
      minWidth: 'var(--dim-size-2400, 160px)',
      borderRadius: 'var(--dim-radius-200, 8px)',
      paddingTop: 'var(--dim-space-200)',
      paddingRight: 'var(--dim-space-300)',
      paddingBottom: 'var(--dim-space-200)',
      paddingLeft: 'var(--dim-space-300)',
      backgroundColor: selected
        ? 'var(--surface-brandPrimary-quaternary, #E2F3EB)'
        : 'var(--surface-card-default, #FFFFFF)',
      border: `${selected ? 'var(--dim-stroke-200, 2px)' : 'var(--dim-stroke-100, 1px)'} solid ${
        selected ? 'var(--border-brandPrimary-primary, #007549)' : 'var(--border-card-default, #EDEFF1)'
      }`,
    }}
    aria-pressed={selected}
  >
    <span
      className='flex items-center'
      style={{
        gap: 'var(--dim-space-100)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-bold)',
        color: selected ? 'var(--text-brandPrimary-primary, #007549)' : 'var(--text-content-primary, #21272A)',
      }}
    >
      <Icon name='radiology' size={16} />
      {room.name}
    </span>
    <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #697077)' }}>
      {hint ?? room.note}
    </span>
  </button>
);

const XraySlotPicker = ({
  examIds = [],
  patient,
  value,                 /* { dateISO, time, roomId } | null */
  onChange,              /* (selection | null) => void */
  minDate,               /* Date — earliest bookable day (default: today) */
}) => {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const floor = minDate ?? today;

  const { rooms, blockReason } = useMemo(() => roomsForExams(examIds), [examIds]);
  const duration = useMemo(() => totalDurationOf(examIds), [examIds]);

  const [roomId, setRoomId] = useState(value?.roomId ?? null);
  const [viewMonth, setViewMonth] = useState(() =>
    value?.dateISO ? new Date(`${value.dateISO}T00:00:00`) : new Date(floor));
  const [dateISO, setDateISO] = useState(value?.dateISO ?? null);

  /* Keep the room valid as the basket changes — an exam added mid-flow can
     make the current room ineligible, and a stale roomId would render an
     empty grid with no explanation. */
  useEffect(() => {
    if (!rooms.length) {
      if (roomId) setRoomId(null);
      return;
    }
    if (!roomId || !rooms.some((r) => r.id === roomId)) setRoomId(rooms[0].id);
  }, [rooms, roomId]);

  const day = useMemo(
    () => (roomId && dateISO ? daySchedule({ dateISO, roomId, examIds }) : null),
    [roomId, dateISO, examIds],
  );

  const isFull = useMemo(() => {
    if (!roomId) return () => true;
    return (d) => dayAvailability({ dateISO: toDateISO(d), roomId, examIds }).full;
  }, [roomId, examIds]);

  /* "เต็ม" and "ปิด" are different facts. A Sunday labelled เต็ม tells the
     clerk to try the next day at the same room; ปิด tells them to change
     room (or accept the room's open days), which is the real fix. */
  const fullLabelOf = useMemo(() => {
    if (!roomId) return () => 'เต็ม';
    return (d) => (dayAvailability({ dateISO: toDateISO(d), roomId, examIds }).closed ? 'ปิด' : 'เต็ม');
  }, [roomId, examIds]);

  const emit = (next) => {
    if (!onChange) return;
    onChange(next);
  };

  const pickDate = (d) => {
    const iso = toDateISO(d);
    setDateISO(iso);
    /* Changing the day drops the time — a slot number means nothing on a
       different day, and silently keeping it would book the wrong hour. */
    if (value?.time) emit(null);
  };

  const pickSlot = (slot) => {
    if (!slot.fits || !day?.room) return;
    emit({
      dateISO,
      time: slot.time,
      roomId,
      room: day.room,
      durationMin: slot.durationMin,
      label: slot.label,
      scheduledAt: formatThaiDateTime(dateISO, slot.time),
      /* what the datetime-local field in the order form expects */
      isoLocal: `${dateISO}T${slot.time}`,
    });
  };

  const jumpToFirst = () => {
    if (!roomId) return;
    const hit = firstAvailable({ fromISO: toDateISO(floor), roomId, examIds });
    if (!hit) return;
    setDateISO(hit.dateISO);
    setViewMonth(new Date(`${hit.dateISO}T00:00:00`));
    const sched = daySchedule({ dateISO: hit.dateISO, roomId, examIds });
    const slot = sched.slots.find((s) => s.time === hit.time);
    if (slot) {
      emit({
        dateISO: hit.dateISO,
        time: slot.time,
        roomId,
        room: sched.room,
        durationMin: slot.durationMin,
        label: slot.label,
        scheduledAt: formatThaiDateTime(hit.dateISO, slot.time),
        isoLocal: `${hit.dateISO}T${slot.time}`,
      });
    }
  };

  /* ── basket cannot be booked here at all ── */
  if (blockReason) {
    return (
      <Alert
        type='warning'
        iconName='event_busy'
        title='จองคิวตรวจในระบบนี้ไม่ได้'
        subtext={blockReason}
        showBadge={false}
        showIndicator={false}
        showDetail={false}
      />
    );
  }

  const halves = ['am', 'pm'];
  const slotsOfHalf = (half) =>
    (day?.slots ?? []).filter((s) => (half === 'am' ? s.start < 12 * 60 : s.start >= 12 * 60));

  return (
    <SectionCard>
      {/* ── header: what is being booked ── */}
      <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200)' }}>
        <span
          className='flex items-center'
          style={{
            gap: 'var(--dim-space-100)',
            fontSize: 'var(--type-size-base)',
            fontWeight: 'var(--type-weight-bold)',
            color: 'var(--text-content-primary, #21272A)',
          }}
        >
          <Icon name='event_available' size={18} style={{ color: 'var(--text-brandPrimary-primary, #007549)' }} />
          ปฏิทินจองคิวตรวจรังสี
        </span>
        <Badge style='neutral' size='small'>{examIds.length} รายการ · ใช้เวลา {duration} นาที</Badge>
        {patient?.fullName ? <Badge style='neutral' size='small'>{patient.fullName}</Badge> : null}
        <div className='flex-1' />
        <BrandSubdueButton size='sm' leadingIcon='bolt' onClick={jumpToFirst} disabled={!roomId}>
          นัดว่างเร็วที่สุด
        </BrandSubdueButton>
      </div>

      {/* ── ห้องตรวจ ── */}
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
        <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-secondary, #4D5358)' }}>
          ห้องตรวจ {rooms.length > 1 ? '(เลือกได้)' : ''}
        </span>
        <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
          {rooms.map((r) => (
            <RoomChip
              key={r.id}
              room={r}
              selected={r.id === roomId}
              onClick={() => {
                setRoomId(r.id);
                /* a slot belongs to one room — moving room invalidates it */
                if (value?.time) emit(null);
              }}
            />
          ))}
        </div>
      </div>

      {/* ── calendar + slots ── */}
      <div className='flex flex-col lg:flex-row w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <div style={{ flexShrink: 0 }}>
          <Calendar
            viewMonth={viewMonth}
            mode='single'
            selection={dateISO ? new Date(`${dateISO}T00:00:00`) : null}
            onSelect={pickDate}
            onNavigate={(delta) => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))}
            minDate={floor}
            isFull={isFull}
            fullLabel={fullLabelOf}
            locale='th'
          />
        </div>

        <div className='flex flex-col flex-1' style={{ gap: 'var(--dim-space-250)', minWidth: 0 }}>
          {!dateISO ? (
            <Alert
              type='info'
              iconName='calendar_month'
              title='เลือกวันที่ต้องการนัดจากปฏิทิน'
              subtext='วันที่ขึ้น "เต็ม" คือไม่มีช่วงเวลาต่อเนื่องพอสำหรับรายการที่เลือก · วันที่ห้องตรวจปิดจะเลือกไม่ได้'
              showBadge={false}
              showIndicator={false}
              showDetail={false}
            />
          ) : day?.closed ? (
            <Alert
              type='warning'
              iconName='event_busy'
              title={`${new Date(`${dateISO}T00:00:00`).getDate()} ${formatThaiDateTime(dateISO).split(' ').slice(1).join(' ')} — จองไม่ได้`}
              subtext={day.closedReason}
              showBadge={false}
              showIndicator={false}
              showDetail={false}
            />
          ) : (
            <>
              <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200)' }}>
                <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-primary, #21272A)' }}>
                  วัน{thaiWeekdayOf(dateISO)}ที่ {formatThaiDateTime(dateISO)}
                </span>
                <Badge style={day.free > 0 ? 'success' : 'error'} size='small'>
                  {day.free > 0 ? `ว่าง ${day.free} ช่วง` : 'เต็มทั้งวัน'}
                </Badge>
                <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #697077)' }}>
                  {day.room.name} · ช่วงละ {day.room.slotMinutes} นาที
                  {day.slotsNeeded > 1 ? ` · รายการนี้ต้องใช้ ${day.slotsNeeded} ช่วงติดกัน` : ''}
                </span>
              </div>

              {halves.map((half) => {
                const list = slotsOfHalf(half);
                if (!list.length) return null;
                return (
                  <div key={half} className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                    <span style={{ fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-tertiary, #697077)' }}>
                      {HALF_LABEL[half]}
                    </span>
                    <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
                      {list.map((s) => (
                        <Timeslot
                          key={s.time}
                          value={s.label}
                          size='sm'
                          selected={value?.time === s.time && value?.dateISO === dateISO && value?.roomId === roomId}
                          disabled={!s.fits}
                          disabledLabel={s.remaining <= 0 ? '(เต็ม)' : '(ไม่พอ)'}
                          onClick={() => pickSlot(s)}
                          aria-label={s.fits ? `จอง ${s.label}` : `${s.label} ${s.blockReason ?? ''}`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              {day.free === 0 && (
                <Alert
                  type='warning'
                  iconName='event_busy'
                  title='วันนี้ไม่มีช่วงเวลาว่างพอ'
                  subtext={
                    day.slotsNeeded > 1
                      ? `รายการที่เลือกต้องใช้เวลาต่อเนื่อง ${day.duration} นาที (${day.slotsNeeded} ช่วง) — ลองเปลี่ยนวัน เปลี่ยนห้องตรวจ หรือแยกนัดเป็นสองใบ`
                      : 'ลองเปลี่ยนวันหรือเปลี่ยนห้องตรวจ'
                  }
                  showBadge={false}
                  showIndicator={false}
                  showDetail={false}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* ── confirmation strip ── */}
      {value?.time && value?.dateISO && (
        <div
          className='flex flex-wrap items-center w-full'
          style={{
            gap: 'var(--dim-space-200)',
            borderRadius: 'var(--dim-radius-200, 8px)',
            backgroundColor: 'var(--surface-brandPrimary-quaternary, #E2F3EB)',
            paddingTop: 'var(--dim-space-250)',
            paddingRight: 'var(--dim-space-300)',
            paddingBottom: 'var(--dim-space-250)',
            paddingLeft: 'var(--dim-space-300)',
          }}
        >
          <Icon name='event_available' size={18} style={{ color: 'var(--text-brandPrimary-primary, #007549)' }} />
          <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-brandPrimary-primary, #007549)' }}>
            นัดตรวจ {formatThaiDateTime(value.dateISO, value.time)} น.
          </span>
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary, #4D5358)' }}>
            {value.room?.name ?? ''} · {value.label ?? value.time} · {value.durationMin ?? duration} นาที
          </span>
          <div className='flex-1' />
          <BrandSubdueButton size='sm' leadingIcon='close' onClick={() => emit(null)}>
            ยกเลิกช่วงเวลานี้
          </BrandSubdueButton>
        </div>
      )}
    </SectionCard>
  );
};

export default XraySlotPicker;
