import React, { useEffect, useMemo, useState } from 'react';
import BrandButton from '@/components/button/BrandButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DatePicker from '@/components/forms/DatePicker';
import Select from '@/components/forms/Select';
import { Field, FieldGrid } from '@/components/forms/Fields';
import { formatThaiBuddhistDate } from '@/data/registrationForm';
import {
  DEFAULT_RESOURCE_PATTERN,
  addFacilityHoliday,
  addResourceClosedDate,
  canCancelDaySchedule,
  getCancelAuditLog,
  getFacilityHolidays,
  getResourceClosedDates,
  getResourcePatternOrDefault,
  removeFacilityHoliday,
  removeResourceClosedDate,
  setResourcePattern,
  subscribeApptSettings,
} from './appointmentSettingsStore';
import { STAFF, isoKey, findEarliestFreeSlot } from './appointmentShared';

/* TOR 1.6.1.3 / 1.6.4 / 1.6.2.1 / 1.6.2.7 — settings + earliest-slot search + cancel audit. */

const WEEKDAY_OPTS = [
  { value: 'mon', label: 'จ' },
  { value: 'tue', label: 'อ' },
  { value: 'wed', label: 'พ' },
  { value: 'thu', label: 'พฤ' },
  { value: 'fri', label: 'ศ' },
  { value: 'sat', label: 'ส' },
  { value: 'sun', label: 'อา' },
];

const RESOURCE_TYPE_OPTS = [
  { value: 'all', label: 'ทุก Resource' },
  { value: 'internal', label: 'อายุรกรรม' },
  { value: 'dental', label: 'ทันตกรรม' },
];

const cardStyle = {
  gap: 'var(--dim-space-400)',
  padding: 'var(--dim-space-600)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  background: 'var(--surface-card-100)',
  boxShadow: 'var(--shadow-card)',
};

const titleStyle = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-base)',
  fontWeight: 'var(--type-weight-medium)',
};

const hintStyle = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
};

export default function AppointmentSettingsPanel({
  appointments = [],
  onBookEarliest,
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => subscribeApptSettings(() => setTick((n) => n + 1)), []);

  const [staffId, setStaffId] = useState(STAFF[0]?.id || '');
  const [holidayDate, setHolidayDate] = useState(null);
  const [holidayName, setHolidayName] = useState('');
  const [closedDate, setClosedDate] = useState(null);
  const [cancelDate, setCancelDate] = useState(null);
  const [resourceType, setResourceType] = useState('all');
  const [earliestMsg, setEarliestMsg] = useState('');

  const pattern = useMemo(
    () => getResourcePatternOrDefault(staffId),
    [staffId, tick],
  );
  const facility = getFacilityHolidays();
  const closed = getResourceClosedDates(staffId);
  const audit = getCancelAuditLog();
  void tick;
  const staffOpts = STAFF.slice(0, 12).map((s) => ({
    value: s.id,
    label: s.name,
  }));

  const updatePattern = (patch) => {
    setResourcePattern(staffId, { ...pattern, ...patch });
  };

  const toggleWeekday = (key) => {
    const set = new Set(pattern.weekdays || []);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    updatePattern({ weekdays: WEEKDAY_OPTS.map((w) => w.value).filter((k) => set.has(k)) });
  };

  const tryCancelSchedule = () => {
    const key = cancelDate ? isoKey(cancelDate) : '';
    if (!key || !staffId) return;
    const { ok, activeCount } = canCancelDaySchedule(appointments, staffId, key);
    if (!ok) {
      setEarliestMsg(`ยกเลิกตารางไม่ได้ — ยังมีนัด Active ${activeCount} รายการในวันนี้`);
      return;
    }
    addResourceClosedDate(staffId, key);
    setEarliestMsg(`ยกเลิกตาราง ${key} สำเร็จ (ไม่มี Active slot)`);
  };

  const searchEarliest = () => {
    const hit = findEarliestFreeSlot({
      staffList: STAFF,
      appointments,
      resourceType,
      fromDate: isoKey(new Date()),
      days: 21,
    });
    if (!hit) {
      setEarliestMsg('ไม่พบ Slot ว่างในช่วง 21 วัน');
      return;
    }
    setEarliestMsg(
      `Slot ว่างเร็วสุด: ${hit.date} ${hit.time} · ${hit.staff.name}${hit.queueNo != null ? ` · คิว ${hit.queueNo}` : ''}`,
    );
    onBookEarliest?.(hit);
  };

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>
      <section className='flex flex-col w-full' style={cardStyle}>
        <span style={titleStyle}>ค้นหา Slot ว่างเร็วสุด</span>
        <span style={hintStyle}>เลือกประเภท Resource แล้วค้นหาวัน–เวลาที่ว่างเร็วที่สุด</span>
        <div className='flex flex-wrap items-end' style={{ gap: 'var(--dim-space-300)' }}>
          <div style={{ minWidth: 220 }}>
            <Select
              options={RESOURCE_TYPE_OPTS}
              value={resourceType}
              onChange={setResourceType}
              size='sm'
            />
          </div>
          <BrandButton size='sm' leadingIcon='search' onClick={searchEarliest}>
            ค้นหา Slot ว่าง
          </BrandButton>
        </div>
        {earliestMsg ? <span style={{ ...hintStyle, color: 'var(--text-brandPrimary-default)' }}>{earliestMsg}</span> : null}
      </section>

      <section className='flex flex-col w-full' style={cardStyle}>
        <span style={titleStyle}>วันหยุดสถานพยาบาล (TOR 1.6.4.1)</span>
        <FieldGrid cols={2} columnGap='var(--dim-space-400)' rowGap='var(--dim-space-300)'>
          <Field label='วันที่'>
            <DatePicker
              size='large'
              value={holidayDate}
              format={formatThaiBuddhistDate}
              onChange={setHolidayDate}
              placeholder='เลือกวันที่'
              showLabel={false}
              showHelperText={false}
            />
          </Field>
          <Field label='ชื่อวันหยุด'>
            <input
              className='mih-appt-settings-input w-full'
              value={holidayName}
              onChange={(e) => setHolidayName(e.target.value)}
              placeholder='เช่น วันหยุดชดเชย'
              style={{
                height: 40,
                padding: '0 var(--dim-space-300)',
                borderRadius: 'var(--dim-radius-200)',
                border: 'var(--dim-stroke-100) solid var(--border-neutral-tertiary)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
              }}
            />
          </Field>
        </FieldGrid>
        <BrandButton
          size='sm'
          leadingIcon='add'
          onClick={() => {
            if (!holidayDate) return;
            addFacilityHoliday(isoKey(holidayDate), holidayName.trim() || 'วันหยุดสถานพยาบาล');
            setHolidayDate(null);
            setHolidayName('');
          }}
        >
          เพิ่มวันหยุด
        </BrandButton>
        <ul className='flex flex-col m-0 p-0 list-none' style={{ gap: 'var(--dim-space-200)' }}>
          {facility.map((h) => (
            <li key={h.date} className='flex items-center justify-between' style={{ gap: 'var(--dim-space-300)' }}>
              <span style={{ fontSize: 'var(--type-size-sm)' }}>{h.date} · {h.name}</span>
              <NeutralSubdueButton size='sm' variant='outline' onClick={() => removeFacilityHoliday(h.date)}>
                ลบ
              </NeutralSubdueButton>
            </li>
          ))}
        </ul>
      </section>

      <section className='flex flex-col w-full' style={cardStyle}>
        <span style={titleStyle}>รูปแบบตาราง Resource + วันหยุด Resource (TOR 1.6.1.3 / 1.6.4.2)</span>
        <div style={{ maxWidth: 360 }}>
          <Select options={staffOpts} value={staffId} onChange={setStaffId} size='sm' />
        </div>
        <span style={hintStyle}>วันเปิดบริการ</span>
        <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
          {WEEKDAY_OPTS.map((w) => {
            const on = (pattern.weekdays || []).includes(w.value);
            return (
              <BrandButton
                key={w.value}
                size='sm'
                variant={on ? 'fill' : 'outline'}
                onClick={() => toggleWeekday(w.value)}
              >
                {w.label}
              </BrandButton>
            );
          })}
        </div>
        <FieldGrid cols={4} columnGap='var(--dim-space-300)' rowGap='var(--dim-space-300)'>
          <Field label='เริ่ม'>
            <input
              type='time'
              value={pattern.start || DEFAULT_RESOURCE_PATTERN.start}
              onChange={(e) => updatePattern({ start: e.target.value })}
              style={{ height: 40, padding: '0 8px', borderRadius: 6, border: '1px solid var(--border-neutral-tertiary)' }}
            />
          </Field>
          <Field label='สิ้นสุด'>
            <input
              type='time'
              value={pattern.end || DEFAULT_RESOURCE_PATTERN.end}
              onChange={(e) => updatePattern({ end: e.target.value })}
              style={{ height: 40, padding: '0 8px', borderRadius: 6, border: '1px solid var(--border-neutral-tertiary)' }}
            />
          </Field>
          <Field label='Major (นาที)'>
            <input
              type='number'
              min={30}
              step={30}
              value={pattern.majorMinutes}
              onChange={(e) => updatePattern({ majorMinutes: Number(e.target.value) || 60 })}
              style={{ height: 40, padding: '0 8px', borderRadius: 6, border: '1px solid var(--border-neutral-tertiary)', width: '100%' }}
            />
          </Field>
          <Field label='Minor / ความจุ'>
            <div className='flex' style={{ gap: 8 }}>
              <input
                type='number'
                min={5}
                value={pattern.minorMinutes}
                onChange={(e) => updatePattern({ minorMinutes: Number(e.target.value) || 6 })}
                style={{ height: 40, padding: '0 8px', borderRadius: 6, border: '1px solid var(--border-neutral-tertiary)', width: '50%' }}
                title='นาทีต่อ slot ย่อย'
              />
              <input
                type='number'
                min={1}
                value={pattern.capacityPerMajor}
                onChange={(e) => updatePattern({ capacityPerMajor: Number(e.target.value) || 10 })}
                style={{ height: 40, padding: '0 8px', borderRadius: 6, border: '1px solid var(--border-neutral-tertiary)', width: '50%' }}
                title='จำนวนคิวต่อ major'
              />
            </div>
          </Field>
        </FieldGrid>
        <span style={hintStyle}>
          บันทึก pattern แล้วปฏิทิน/ฟอร์มนัดของแพทย์คนนี้จะใช้ Slot ซ้อนชั้น + เลขคิว (เช่น คิว 1–10 ในชั่วโมงแรก)
        </span>

        <Field label='เพิ่มวันหยุด Resource'>
          <div className='flex flex-wrap items-end' style={{ gap: 'var(--dim-space-300)' }}>
            <DatePicker
              size='large'
              value={closedDate}
              format={formatThaiBuddhistDate}
              onChange={setClosedDate}
              placeholder='เลือกวันที่'
              showLabel={false}
              showHelperText={false}
            />
            <BrandButton
              size='sm'
              leadingIcon='event_busy'
              onClick={() => {
                if (!closedDate) return;
                addResourceClosedDate(staffId, isoKey(closedDate));
                setClosedDate(null);
              }}
            >
              ปิดวัน
            </BrandButton>
          </div>
        </Field>
        <ul className='flex flex-col m-0 p-0 list-none' style={{ gap: 'var(--dim-space-200)' }}>
          {closed.map((d) => (
            <li key={d} className='flex items-center justify-between'>
              <span style={{ fontSize: 'var(--type-size-sm)' }}>{d}</span>
              <NeutralSubdueButton size='sm' variant='outline' onClick={() => removeResourceClosedDate(staffId, d)}>
                ลบ
              </NeutralSubdueButton>
            </li>
          ))}
        </ul>

        <Field label='ยกเลิกตารางทั้งวัน (TOR 1.6.1.6 — ต้องไม่มี Active slot)'>
          <div className='flex flex-wrap items-end' style={{ gap: 'var(--dim-space-300)' }}>
            <DatePicker
              size='large'
              value={cancelDate}
              format={formatThaiBuddhistDate}
              onChange={setCancelDate}
              placeholder='เลือกวันที่'
              showLabel={false}
              showHelperText={false}
            />
            <DangerSubdueButton size='sm' variant='outline' onClick={tryCancelSchedule}>
              ยกเลิกตารางวันนั้น
            </DangerSubdueButton>
          </div>
        </Field>
      </section>

      <section className='flex flex-col w-full' style={cardStyle}>
        <span style={titleStyle}>ประวัติการยกเลิกนัด (TOR 1.6.2.7)</span>
        <span style={hintStyle}>เหตุผล + ผู้ดำเนินการ + เวลายกเลิก</span>
        {audit.length === 0 ? (
          <span style={hintStyle}>ยังไม่มีรายการ — ยกเลิกนัดจากฟอร์มแล้วจะปรากฏที่นี่</span>
        ) : (
          <ul className='flex flex-col m-0 p-0 list-none' style={{ gap: 'var(--dim-space-200)' }}>
            {audit.slice(0, 12).map((row) => (
              <li
                key={row.id}
                style={{
                  padding: 'var(--dim-space-300)',
                  borderRadius: 'var(--dim-radius-200)',
                  background: 'var(--surface-brandPrimary-quaternary)',
                  fontSize: 'var(--type-size-sm)',
                }}
              >
                <strong>{row.at}</strong> · {row.actor} ยกเลิก {row.patient} ({row.date} {row.time})
                <div style={hintStyle}>เหตุผล: {row.reason}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
