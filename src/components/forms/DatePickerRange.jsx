import React from 'react';
import DatePicker from '@/components/forms/DatePicker';
import { FieldShell } from '@/components/forms/_inputBox';

/* MIH DatePickerRange — Figma "Input Field Range" (2496:5498) with two
   DatePicker triggers instead of plain text inputs. Used for paired dates
   such as certificate rest start / end (Step 7). */

export default function DatePickerRange(
  {
    label,
    required = false,
    helperText,
    error,
    size = 'lg',
    placeholders = ['เลือกวันที่เริ่มต้น', 'เลือกวันที่สิ้นสุด'],
    value = ['', ''],
    onChange,
    format,
    parse,
    leadingIcon = 'calendar_today',
    showLabel = true,
    showHelperText = true,
    showLeadingIcon = true,
    disabled = false,
    endMinFromStart = true,
    /** วันแรกสุดที่เลือกได้ — ส่ง `minDate={new Date()}` เพื่อห้ามเลือกวันย้อนหลัง
        (ช่องสิ้นสุดจะใช้ค่าที่มากกว่าระหว่าง minDate กับวันเริ่มต้นเสมอ) */
    minDate,
    className = '',
    style = {},
  },
) {
  const [startRaw, endRaw] = value;
  const startDate = parse ? parse(startRaw) : null;
  const endDate = parse ? parse(endRaw) : null;

  /* ช่องสิ้นสุดต้องไม่ต่ำกว่าทั้ง minDate และวันเริ่มต้น — ถ้าใช้แค่ startDate
     ผู้ใช้จะเลือกวันสิ้นสุดย้อนหลังได้ตอนที่ยังไม่ได้เลือกวันเริ่มต้น */
  const endMin = (() => {
    const floor = minDate ? new Date(minDate) : null;
    const fromStart = endMinFromStart ? startDate : null;
    if (floor && fromStart) return floor > fromStart ? floor : fromStart;
    return fromStart || floor || undefined;
  })();

  const emit = (idx, d) => {
    const formatted = d && format ? format(d) : '';
    const out = idx === 0 ? [formatted, endRaw] : [startRaw, formatted];
    onChange && onChange(out);
  };

  const pickerShell = { width: '100%', minWidth: 0 };

  return (
    <FieldShell
      label={label}
      required={required}
      helperText={helperText}
      error={error}
      showLabel={showLabel}
      showHelperText={showHelperText}
      className={className}
      style={{ minWidth: 320, ...style }}
    >
      <div
        className='grid w-full min-w-0 items-center'
        style={{
          gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
          gap: 'var(--dim-space-150)',
        }}
      >
        <div style={pickerShell}>
          <DatePicker
            size={size}
            value={startDate}
            onChange={(d) => emit(0, d)}
            format={format}
            placeholder={placeholders[0]}
            minDate={minDate}
            leadingIcon={showLeadingIcon ? leadingIcon : undefined}
            showFieldName={false}
            showLabel={false}
            showHelperText={false}
            showLeadingIcon={showLeadingIcon}
            disabled={disabled}
            error={!!error}
          />
        </div>
        <span
          aria-hidden
          style={{
            color: 'var(--text-content-default)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-base)',
            fontWeight: 'var(--type-weight-regular)',
            lineHeight: 1.5,
            flexShrink: 0,
          }}
        >
          -
        </span>
        <div style={pickerShell}>
          <DatePicker
            size={size}
            value={endDate}
            onChange={(d) => emit(1, d)}
            format={format}
            placeholder={placeholders[1]}
            leadingIcon={showLeadingIcon ? leadingIcon : undefined}
            minDate={endMin}
            showFieldName={false}
            showLabel={false}
            showHelperText={false}
            showLeadingIcon={showLeadingIcon}
            disabled={disabled}
            error={!!error}
          />
        </div>
      </div>
    </FieldShell>
  );
}
