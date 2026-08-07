import React, { useEffect, useRef, useState } from 'react';
import Popover from '@/components/popup/Popover';
import { FieldShell, useFieldId, Sym } from '@/components/forms/_inputBox';

/* MIH TimePicker — Select-style trigger + dual-column HH:MM popover.
   Replaces native `<input type="time">` chrome (browser-blue picker)
   with design-system tokens (brand selected / list hover).

   Value contract: string `HH:MM` (24h) or '' / null.
   onChange(next: string) — same shape as InputField string onChange. */

const SIZES = {
  sm:     { height: 'var(--dim-size-700)', paddingX: 'var(--dim-space-300)', gap: 'var(--dim-space-150)', fontSize: 'var(--type-size-xs)', iconSize: 'var(--dim-size-200, 12px)' },
  small:  { height: 'var(--dim-size-700)', paddingX: 'var(--dim-space-300)', gap: 'var(--dim-space-150)', fontSize: 'var(--type-size-xs)', iconSize: 'var(--dim-size-200, 12px)' },
  md:     { height: 'var(--dim-size-800)', paddingX: 'var(--dim-space-300)', gap: 'var(--dim-space-150)', fontSize: 'var(--type-size-sm)', iconSize: 'var(--dim-size-300, 16px)' },
  medium: { height: 'var(--dim-size-800)', paddingX: 'var(--dim-space-300)', gap: 'var(--dim-space-150)', fontSize: 'var(--type-size-sm)', iconSize: 'var(--dim-size-300, 16px)' },
  lg:     { height: 'var(--dim-size-800)', paddingX: 'var(--dim-space-400)', gap: 'var(--dim-space-200)', fontSize: 'var(--type-size-sm)', iconSize: 'var(--dim-size-400)' },
  large:  { height: 'var(--dim-size-800)', paddingX: 'var(--dim-space-400)', gap: 'var(--dim-space-200)', fontSize: 'var(--type-size-sm)', iconSize: 'var(--dim-size-400)' },
};

const chevronSize = (size) => (size === 'sm' || size === 'small'
  ? 'var(--dim-size-200, 12px)'
  : 'var(--dim-size-300, 16px)');

const resolveTrigger = ({ state, hasValue, error, disabled }) => {
  const effective = state || (
    disabled ? 'disabled'
      : error ? 'error'
        : hasValue ? 'filled'
          : 'default'
  );
  switch (effective) {
    case 'hover':
      return { bg: 'var(--surface-input-default)', borderW: 'var(--dim-stroke-200)', borderC: 'var(--border-input-hover)', ring: '0 0 0 var(--dim-stroke-400, 4px) var(--primaryBorder-600)', iconColor: 'var(--icon-input-hover)', textColor: 'var(--text-input-hover)' };
    case 'open':
      return { bg: 'var(--surface-input-default)', borderW: 'var(--dim-stroke-200)', borderC: 'var(--border-input-typing)', ring: '0 0 0 var(--dim-stroke-400, 4px) var(--primaryBorder-600)', iconColor: 'var(--icon-input-typing)', textColor: 'var(--text-input-typing)' };
    case 'filled':
      return { bg: 'var(--surface-input-default)', borderW: 'var(--dim-stroke-100)', borderC: 'var(--border-input-filled)', ring: 'none', iconColor: 'var(--icon-input-filled)', textColor: 'var(--text-input-filled)' };
    case 'error':
      return { bg: 'var(--surface-input-default)', borderW: 'var(--dim-stroke-200)', borderC: 'var(--border-input-error)', ring: 'none', iconColor: 'var(--icon-input-error)', textColor: hasValue ? 'var(--text-input-filled)' : 'var(--text-input-error)' };
    case 'disabled':
      return { bg: 'var(--surface-disabled-tertiary)', borderW: 'var(--dim-stroke-100)', borderC: 'var(--border-input-disabled)', ring: 'none', iconColor: 'var(--icon-input-disabled)', textColor: 'var(--text-input-disabled)' };
    default:
      return { bg: 'var(--surface-input-default)', borderW: 'var(--dim-stroke-100)', borderC: 'var(--border-input-default)', ring: 'none', iconColor: 'var(--icon-input-default)', textColor: hasValue ? 'var(--text-input-filled)' : 'var(--text-input-default)' };
  }
};

const pad2 = (n) => String(n).padStart(2, '0');

const parseTime = (value) => {
  if (!value || typeof value !== 'string') return { hour: null, minute: null };
  const m = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return { hour: null, minute: null };
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return { hour: null, minute: null };
  return { hour, minute };
};

const formatTime = (hour, minute) => {
  if (hour == null || minute == null) return '';
  return `${pad2(hour)}:${pad2(minute)}`;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const minutesForStep = (step) => {
  const list = [];
  for (let m = 0; m < 60; m += step) list.push(m);
  return list;
};

const TimeCell = ({ label, selected, onClick }) => {
  const [hover, setHover] = useState(false);
  const bg = selected
    ? 'var(--surface-calendar-slot-date-current, var(--brand-p600))'
    : hover
      ? 'var(--surface-list-hover, var(--surface-brandPrimary-quaternary))'
      : 'transparent';
  const color = selected
    ? 'var(--text-calendar-slot-date-current, #FFFFFF)'
    : hover
      ? 'var(--text-list-hover, var(--text-brandPrimary-default))'
      : 'var(--text-list-default, #4D5358)';

  return (
    <button
      type='button'
      role='option'
      aria-selected={selected}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className='w-full text-center'
      style={{
        minHeight: 'var(--dim-size-800, 40px)',
        paddingLeft: 'var(--dim-space-300, 12px)',
        paddingRight: 'var(--dim-space-300, 12px)',
        borderRadius: 'var(--dim-radius-150, 6px)',
        border: 'none',
        background: bg,
        color,
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: selected ? 'var(--type-weight-medium)' : 'var(--type-weight-regular)',
        lineHeight: 1.5,
        cursor: 'pointer',
        outline: 'none',
        transition: 'background 120ms ease, color 120ms ease',
      }}
    >
      {label}
    </button>
  );
};

const ScrollColumn = ({ values, selected, onSelect, ariaLabel }) => {
  const listRef = useRef(null);
  const selectedRef = useRef(null);

  useEffect(() => {
    if (!selectedRef.current || !listRef.current) return;
    const list = listRef.current;
    const el = selectedRef.current;
    const top = el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2;
    list.scrollTop = Math.max(0, top);
  }, [selected]);

  return (
    <div
      ref={listRef}
      role='listbox'
      aria-label={ariaLabel}
      className='scrollbar-thin flex flex-col min-h-0 overflow-y-auto'
      style={{
        width: 'var(--dim-size-1600, 72px)',
        maxHeight: 'calc(var(--dim-size-800, 40px) * 6)',
        gap: 'var(--dim-space-050, 2px)',
        padding: 'var(--dim-space-100, 4px)',
      }}
    >
      {values.map((n) => {
        const isSelected = selected === n;
        return (
          <div key={n} ref={isSelected ? selectedRef : undefined}>
            <TimeCell
              label={pad2(n)}
              selected={isSelected}
              onClick={() => onSelect(n)}
            />
          </div>
        );
      })}
    </div>
  );
};

const TimePicker = React.forwardRef(function TimePicker(
  {
    label = 'เวลา',
    required = false,
    helperText,
    error,
    size = 'md',
    placeholder = 'HH:MM',
    value,
    defaultValue = '',
    onChange,
    leadingIcon = 'schedule',
    showLabel = true,
    showHelperText = true,
    showFieldName = true,
    showRequired = true,
    showLeadingIcon = true,
    state,
    disabled = false,
    minuteStep = 1,
    id: idProp,
    name,
    className = '',
    style = {},
    ...rest
  },
  ref,
) {
  const autoId = useFieldId('time');
  const id = idProp || autoId;
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue || '');
  const v = isControlled ? (value || '') : internal;
  const { hour, minute } = parseTime(v);

  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [draftHour, setDraftHour] = useState(hour ?? 0);
  const [draftMinute, setDraftMinute] = useState(minute ?? 0);
  const triggerRef = useRef(null);
  const setTriggerRef = (node) => {
    triggerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const minutes = minutesForStep(Math.max(1, Math.min(30, minuteStep)));

  useEffect(() => {
    if (!open) return;
    setDraftHour(hour ?? 0);
    const m = minute ?? 0;
    const snapped = minutes.includes(m)
      ? m
      : minutes.reduce((best, cur) => (Math.abs(cur - m) < Math.abs(best - m) ? cur : best), minutes[0]);
    setDraftMinute(snapped);
  }, [open, hour, minute]); // eslint-disable-line react-hooks/exhaustive-deps

  const autoState = disabled ? 'disabled'
    : error ? 'error'
      : open ? 'open'
        : hovered ? 'hover'
          : v ? 'filled'
            : 'default';
  const effState = state || autoState;
  const s = resolveTrigger({ state: effState, hasValue: !!v, error: !!error, disabled });
  const dim = SIZES[size] || SIZES.md;
  const displayText = v || placeholder;
  const isPlaceholder = !v;

  const commit = (h, m) => {
    const next = formatTime(h, m);
    if (!isControlled) setInternal(next);
    onChange && onChange(next);
  };

  const pickHour = (h) => {
    setDraftHour(h);
    commit(h, draftMinute);
  };

  const pickMinute = (m) => {
    setDraftMinute(m);
    commit(draftHour, m);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <FieldShell
      label={showLabel ? label : undefined}
      required={showRequired && required}
      helperText={helperText}
      error={error}
      showLabel={showFieldName && showLabel}
      showHelperText={showHelperText}
      htmlFor={id}
      className={className}
      style={style}
    >
      <div style={{ position: 'relative', width: '100%' }}>
        <button
          ref={setTriggerRef}
          id={id}
          name={name}
          type='button'
          role='combobox'
          aria-haspopup='listbox'
          aria-expanded={open}
          aria-invalid={!!error || undefined}
          aria-disabled={disabled || undefined}
          disabled={disabled}
          onClick={() => !disabled && setOpen((o) => !o)}
          onMouseEnter={() => !disabled && setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className='inline-flex items-center w-full text-left'
          style={{
            height: dim.height,
            gap: dim.gap,
            paddingLeft: dim.paddingX,
            paddingRight: dim.paddingX,
            paddingTop: 'var(--dim-space-200)',
            paddingBottom: 'var(--dim-space-200)',
            borderRadius: 'var(--dim-radius-200)',
            border: `${s.borderW} solid ${s.borderC}`,
            background: s.bg,
            boxShadow: s.ring,
            color: s.textColor,
            fontFamily: 'var(--type-family-body)',
            fontSize: dim.fontSize,
            lineHeight: 1.5,
            cursor: disabled ? 'not-allowed' : 'pointer',
            boxSizing: 'border-box',
            outline: 'none',
            transition: 'border-color 160ms cubic-bezier(0.4,0,0.2,1), box-shadow 160ms cubic-bezier(0.4,0,0.2,1), background 160ms cubic-bezier(0.4,0,0.2,1)',
          }}
          {...rest}
        >
          {showLeadingIcon && leadingIcon && (
            <Sym name={leadingIcon} size={dim.iconSize} color={s.iconColor} />
          )}
          <span
            className='flex-1 min-w-0 truncate'
            style={{ color: isPlaceholder ? s.textColor : 'var(--text-input-filled)' }}
          >
            {displayText}
          </span>
          <span
            className='inline-flex items-center justify-center shrink-0 transition-transform duration-200 ease-out'
            style={{
              width: chevronSize(size),
              height: chevronSize(size),
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              color: s.iconColor,
            }}
          >
            <Sym name='expand_more' size={chevronSize(size)} color='currentColor' />
          </span>
        </button>

        <Popover
          open={open && !disabled}
          onClose={() => setOpen(false)}
          anchorRef={triggerRef}
          className='mih-timepicker-popover'
          style={{
            background: 'var(--surface-dropdown-default)',
            border: 'var(--dim-stroke-100) solid var(--border-dropdown-default)',
            borderRadius: 'var(--dim-radius-500)',
            boxShadow: 'var(--shadow-dropdown)',
            padding: 'var(--dim-space-100, 4px)',
            zIndex: 'var(--sm-z-modal-popover, 1450)',
          }}
        >
          <div
            className='flex flex-row items-stretch'
            style={{ gap: 'var(--dim-space-100, 4px)' }}
          >
            <ScrollColumn
              values={HOURS}
              selected={draftHour}
              onSelect={pickHour}
              ariaLabel='ชั่วโมง'
            />
            <div
              aria-hidden
              style={{
                width: 0,
                borderLeft: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                marginTop: 'var(--dim-space-100, 4px)',
                marginBottom: 'var(--dim-space-100, 4px)',
              }}
            />
            <ScrollColumn
              values={minutes}
              selected={draftMinute}
              onSelect={pickMinute}
              ariaLabel='นาที'
            />
          </div>
        </Popover>
      </div>
    </FieldShell>
  );
});

export default TimePicker;
