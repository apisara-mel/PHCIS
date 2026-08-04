import React from 'react';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import InputField from '@/components/forms/InputField';
import { Field, FieldGrid } from '@/components/forms/Fields';
import { formatThaiBuddhistDate } from '@/data/registrationForm';
import { isoKey } from './appointmentShared';

/* TOR 1.6.2.4 / 1.6.2.5 — ตัวสร้างกติกา "นัดต่อเนื่อง / นัดซ้ำ".
   HCIS §2.3 บล็อก "นัดต่อเนื่อง" แนะนำช่วง "ทุก 7–15 วัน" — preset จึงตั้งไว้ที่
   7 / 14 / 15 / 28 / 30 วัน และเพิ่มแบบ "ทุกสัปดาห์วัน X" กับกำหนดเอง. */

export const RECURRENCE_MIN_INTERVAL = 1;
export const RECURRENCE_MAX_INTERVAL = 180;
export const RECURRENCE_MIN_COUNT = 1;
export const RECURRENCE_MAX_COUNT = 52;

export const RECURRENCE_MODES = [
  { value: 'everyN', label: 'ทุก N วัน (นัดต่อเนื่องตามแผนการรักษา)' },
  { value: 'weekly', label: 'ทุกสัปดาห์ ในวันที่กำหนด' },
];

export const INTERVAL_PRESETS = [
  { value: '7', label: 'ทุก 7 วัน' },
  { value: '14', label: 'ทุก 14 วัน' },
  { value: '15', label: 'ทุก 15 วัน' },
  { value: '28', label: 'ทุก 28 วัน' },
  { value: '30', label: 'ทุก 30 วัน' },
  { value: 'custom', label: 'กำหนดเอง' },
];

export const WEEKDAY_OPTIONS = [
  { value: '1', label: 'ทุกวันจันทร์' },
  { value: '2', label: 'ทุกวันอังคาร' },
  { value: '3', label: 'ทุกวันพุธ' },
  { value: '4', label: 'ทุกวันพฤหัสบดี' },
  { value: '5', label: 'ทุกวันศุกร์' },
  { value: '6', label: 'ทุกวันเสาร์' },
  { value: '0', label: 'ทุกวันอาทิตย์' },
];

export const END_MODES = [
  { value: 'count', label: 'จบเมื่อครบจำนวนครั้ง' },
  { value: 'until', label: 'จบเมื่อถึงวันที่กำหนด' },
];

export const DEFAULT_RECURRENCE = {
  mode: 'everyN',
  intervalPreset: '14',
  intervalDays: 14,
  weekday: '1',
  endMode: 'count',
  count: 4,
  untilDate: null,
  startDate: null,
};

/** ตรวจกติกาก่อนสร้าง occurrence — คืน array ของข้อความ error (ว่าง = ผ่าน). */
export function validateRecurrence(cfg) {
  const errors = [];
  if (!cfg.startDate) errors.push('กรุณาเลือกวันที่นัดครั้งแรก');
  if (cfg.mode === 'everyN') {
    const n = Number(cfg.intervalDays);
    if (!Number.isFinite(n) || n < RECURRENCE_MIN_INTERVAL || n > RECURRENCE_MAX_INTERVAL) {
      errors.push(`ช่วงห่างต้องอยู่ระหว่าง ${RECURRENCE_MIN_INTERVAL}–${RECURRENCE_MAX_INTERVAL} วัน`);
    }
  }
  if (cfg.endMode === 'count') {
    const c = Number(cfg.count);
    if (!Number.isFinite(c) || c < RECURRENCE_MIN_COUNT || c > RECURRENCE_MAX_COUNT) {
      errors.push(`จำนวนครั้งต้องอยู่ระหว่าง ${RECURRENCE_MIN_COUNT}–${RECURRENCE_MAX_COUNT} ครั้ง`);
    }
  } else {
    if (!cfg.untilDate) errors.push('กรุณาเลือกวันสิ้นสุด');
    else if (cfg.startDate && cfg.untilDate <= cfg.startDate) {
      errors.push('วันสิ้นสุดต้องอยู่หลังวันที่นัดครั้งแรก');
    }
  }
  return errors;
}

/** สร้างรายการวันที่ของชุดนัด (ISO key) ตามกติกา — จำกัดไม่เกิน 52 ครั้ง. */
export function buildOccurrenceDates(cfg) {
  if (!cfg?.startDate) return [];
  const out = [];
  const start = new Date(cfg.startDate.getFullYear(), cfg.startDate.getMonth(), cfg.startDate.getDate());
  const limit = cfg.endMode === 'count'
    ? Math.min(RECURRENCE_MAX_COUNT, Math.max(1, Number(cfg.count) || 1))
    : RECURRENCE_MAX_COUNT;
  const until = cfg.endMode === 'until' && cfg.untilDate
    ? new Date(cfg.untilDate.getFullYear(), cfg.untilDate.getMonth(), cfg.untilDate.getDate())
    : null;

  if (cfg.mode === 'weekly') {
    const targetDow = Number(cfg.weekday);
    const cursor = new Date(start);
    /* เลื่อนไปวันแรกที่ตรงกับวันในสัปดาห์ที่เลือก */
    while (cursor.getDay() !== targetDow) cursor.setDate(cursor.getDate() + 1);
    for (let i = 0; i < limit; i += 1) {
      if (until && cursor.getTime() > until.getTime()) break;
      out.push(isoKey(cursor));
      cursor.setDate(cursor.getDate() + 7);
    }
    return out;
  }

  const step = Math.max(1, Number(cfg.intervalDays) || 1);
  const cursor = new Date(start);
  for (let i = 0; i < limit; i += 1) {
    if (until && cursor.getTime() > until.getTime()) break;
    out.push(isoKey(cursor));
    cursor.setDate(cursor.getDate() + step);
  }
  return out;
}

/** สรุปกติกาเป็นข้อความสำหรับใบนัด / audit. */
export function describeRecurrence(cfg) {
  const every = cfg.mode === 'weekly'
    ? (WEEKDAY_OPTIONS.find((w) => w.value === String(cfg.weekday))?.label || 'ทุกสัปดาห์')
    : `ทุก ${cfg.intervalDays} วัน`;
  const end = cfg.endMode === 'count'
    ? `จำนวน ${cfg.count} ครั้ง`
    : `จนถึง ${cfg.untilDate ? formatThaiBuddhistDate(cfg.untilDate) : '—'}`;
  return `${every} · ${end}`;
}

const AppointmentRecurrenceBuilder = ({ value, onChange, disabled = false }) => {
  const cfg = { ...DEFAULT_RECURRENCE, ...(value || {}) };
  const patch = (next) => onChange?.({ ...cfg, ...next });

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
      <FieldGrid cols={3} columnGap='var(--dim-space-400)' rowGap='var(--dim-space-300)'>
        <Field label='วันที่นัดครั้งแรก' required>
          <DatePicker
            size='md'
            value={cfg.startDate}
            format={formatThaiBuddhistDate}
            onChange={(d) => patch({ startDate: d })}
            placeholder='เลือกวันที่'
            showLabel={false}
            showHelperText={false}
            disabled={disabled}
          />
        </Field>
        <Field label='รูปแบบการนัดซ้ำ' required>
          <Select
            options={RECURRENCE_MODES}
            value={cfg.mode}
            onChange={(v) => patch({ mode: v })}
            size='md'
            searchable={false}
            showLabel={false}
            showHelperText={false}
            disabled={disabled}
          />
        </Field>
        {cfg.mode === 'weekly' ? (
          <Field label='วันในสัปดาห์' required>
            <Select
              options={WEEKDAY_OPTIONS}
              value={String(cfg.weekday)}
              onChange={(v) => patch({ weekday: v })}
              size='md'
              searchable={false}
              showLabel={false}
              showHelperText={false}
              disabled={disabled}
            />
          </Field>
        ) : (
          <Field label='ช่วงห่างระหว่างครั้ง' required>
            <Select
              options={INTERVAL_PRESETS}
              value={cfg.intervalPreset}
              onChange={(v) => patch({
                intervalPreset: v,
                intervalDays: v === 'custom' ? cfg.intervalDays : Number(v),
              })}
              size='md'
              searchable={false}
              showLabel={false}
              showHelperText={false}
              disabled={disabled}
            />
          </Field>
        )}
      </FieldGrid>

      <FieldGrid cols={3} columnGap='var(--dim-space-400)' rowGap='var(--dim-space-300)'>
        {cfg.mode === 'everyN' && cfg.intervalPreset === 'custom' ? (
          <Field label={`ช่วงห่าง (วัน) — ${RECURRENCE_MIN_INTERVAL}–${RECURRENCE_MAX_INTERVAL}`} required>
            <InputField
              type='number'
              size='md'
              value={String(cfg.intervalDays)}
              onChange={(e) => patch({ intervalDays: Number(e.target.value) })}
              showLabel={false}
              showHelperText={false}
              disabled={disabled}
              placeholder='เช่น 21'
            />
          </Field>
        ) : null}

        <Field label='เงื่อนไขการสิ้นสุด' required>
          <Select
            options={END_MODES}
            value={cfg.endMode}
            onChange={(v) => patch({ endMode: v })}
            size='md'
            searchable={false}
            showLabel={false}
            showHelperText={false}
            disabled={disabled}
          />
        </Field>

        {cfg.endMode === 'count' ? (
          <Field label={`จำนวนครั้ง (${RECURRENCE_MIN_COUNT}–${RECURRENCE_MAX_COUNT})`} required>
            <InputField
              type='number'
              size='md'
              value={String(cfg.count)}
              onChange={(e) => patch({ count: Number(e.target.value) })}
              showLabel={false}
              showHelperText={false}
              disabled={disabled}
              placeholder='เช่น 4'
            />
          </Field>
        ) : (
          <Field label='นัดจนถึงวันที่' required>
            <DatePicker
              size='md'
              value={cfg.untilDate}
              format={formatThaiBuddhistDate}
              onChange={(d) => patch({ untilDate: d })}
              placeholder='เลือกวันสิ้นสุด'
              showLabel={false}
              showHelperText={false}
              minDate={cfg.startDate || undefined}
              disabled={disabled}
            />
          </Field>
        )}
      </FieldGrid>

      <span
        style={{
          color: 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs, 12px)',
        }}
      >
        สรุปกติกา: {describeRecurrence(cfg)} — ระบบจะสร้างรายการล่วงหน้าให้ตรวจสอบทีละครั้งก่อนบันทึก
      </span>
    </div>
  );
};

export default AppointmentRecurrenceBuilder;
