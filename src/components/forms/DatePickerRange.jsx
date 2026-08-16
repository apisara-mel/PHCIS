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
    className = '',
    style = {},
  },
) {
  const [startRaw, endRaw] = value;
  const startDate = parse ? parse(startRaw) : null;
  const endDate = parse ? parse(endRaw) : null;

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
            minDate={endMinFromStart ? startDate ?? undefined : undefined}
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
