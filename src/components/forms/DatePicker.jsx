import React, { useEffect, useRef, useState } from 'react';
import Popover from '@/components/popup/Popover';
import Popup from '@/components/popup/Popup';
import Calendar, { startOfDay, sameDay } from '@/components/forms/Calendar';
import { FieldShell, useFieldId, Sym } from '@/components/forms/_inputBox';

/* MIH DatePicker — Figma "Date Picker" (node 341:6345).
   Select-style trigger that opens a single-date Calendar popup.

   `modal` — PHCIS | Appointment 4047:6466: full `Popup` with title, subtitle,
   "ตัวเลือกด่วน" forward shortcuts, dual-month `Calendar`, ยกเลิก / ตกลง.

   Properties (matches Figma Property panel):
     • size            'lg' (40) | 'md' (40) | 'sm' (36)
     • state           force visual: default | hover | open | filled | error | disabled
     • value / defaultValue / onChange — Date or null
     • placeholder      placeholder string when no value
     • leadingIcon      Material Symbols name (default 'calendar_today')
     • format          (date) => string — value rendering (default 'DD/MM/YYYY')
     • required, error, disabled, helperText, label
     • showFieldName, showLabel, showRequired, showHelperText, showLeadingIcon
     • modal, modalSubtitle — optional full-screen-style date dialog (4047:6466);
       modal mode defaults to no past dates (today = min unless `minDate` is later).

   The trigger visuals re-use the same token contract as <Select> so a
   DatePicker reads visually identical to a Select in a form. Tokens alias
   from design.md; brand-aware tokens retint via <html data-brand>.
*/

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
    disabled ? 'disabled' :
    error    ? 'error'    :
    hasValue ? 'filled'   :
    'default'
  );
  switch (effective) {
    case 'hover':
      return { bg: 'var(--surface-input-default)', borderW: 'var(--dim-stroke-200)', borderC: 'var(--border-input-hover)',  ring: '0 0 0 var(--dim-stroke-400, 4px) var(--primaryBorder-600)', iconColor: 'var(--icon-input-hover)',  textColor: 'var(--text-input-hover)'  };
    case 'open':
      return { bg: 'var(--surface-input-default)', borderW: 'var(--dim-stroke-200)', borderC: 'var(--border-input-typing)', ring: '0 0 0 var(--dim-stroke-400, 4px) var(--primaryBorder-600)', iconColor: 'var(--icon-input-typing)', textColor: 'var(--text-input-typing)' };
    case 'filled':
      return { bg: 'var(--surface-input-default)', borderW: 'var(--dim-stroke-100)', borderC: 'var(--border-input-filled)', ring: 'none', iconColor: 'var(--icon-input-filled)', textColor: 'var(--text-input-filled)' };
    case 'error':
      return { bg: 'var(--surface-input-default)', borderW: 'var(--dim-stroke-200)', borderC: 'var(--border-input-error)',  ring: 'none', iconColor: 'var(--icon-input-error)',  textColor: hasValue ? 'var(--text-input-filled)' : 'var(--text-input-error)' };
    case 'disabled':
      return { bg: 'var(--surface-disabled-tertiary)', borderW: 'var(--dim-stroke-100)', borderC: 'var(--border-input-disabled)', ring: 'none', iconColor: 'var(--icon-input-disabled)', textColor: 'var(--text-input-disabled)' };
    default:
      return { bg: 'var(--surface-input-default)', borderW: 'var(--dim-stroke-100)', borderC: 'var(--border-input-default)', ring: 'none', iconColor: 'var(--icon-input-default)', textColor: hasValue ? 'var(--text-input-filled)' : 'var(--text-input-default)' };
  }
};

const defaultFormat = (d) => {
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
};

/** Calendar lower bound: in `modal` mode (appointment popup), past dates
 *  are never selectable — floor is today unless `minDate` is later. */
const resolveActiveMinDate = (minDate, modal) => {
  if (!modal) {
    return minDate != null ? startOfDay(new Date(minDate)) : null;
  }
  const todayStart = startOfDay(new Date());
  if (minDate == null) return todayStart;
  const propMin = startOfDay(new Date(minDate));
  return propMin.getTime() > todayStart.getTime() ? propMin : todayStart;
};

const addDays = (d, n) => {
  const x = startOfDay(new Date(d));
  x.setDate(x.getDate() + n);
  return x;
};

const firstOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonthsFirst = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);

const addCalendarMonthsKeepDay = (d, n) => {
  const x = new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
  return startOfDay(x);
};

/* Forward-looking shortcuts — PHCIS | Appointment 4047:6466 + 4048:4421
   ("ตัวเลือกด่วน" + กำหนดเอง). Preset keys feed `handleModalQuick`; `custom`
   only toggles highlight — date comes from the dual calendars. */
const DATE_MODAL_QUICK = [
  { key: 'd7',  label: 'อีก 7 วันข้างหน้า',  resolve: (t) => addDays(t, 7) },
  { key: 'd14', label: 'อีก 14 วันข้างหน้า', resolve: (t) => addDays(t, 14) },
  { key: 'm1',  label: 'อีก 1 เดือนข้างหน้า', resolve: (t) => addCalendarMonthsKeepDay(t, 1) },
  { key: 'm3',  label: 'อีก 3 เดือนข้างหน้า', resolve: (t) => addCalendarMonthsKeepDay(t, 3) },
  { key: 'm6',  label: 'อีก 6 เดือนข้างหน้า', resolve: (t) => addCalendarMonthsKeepDay(t, 6) },
];
const DATE_MODAL_QUICK_CUSTOM = { key: 'custom', label: 'กำหนดเอง' };

const matchModalQuickKey = (date) => {
  if (!date) return 'custom';
  const t = startOfDay(new Date());
  for (const o of DATE_MODAL_QUICK) {
    if (sameDay(o.resolve(t), date)) return o.key;
  }
  return 'custom';
};

const ModalQuickRow = ({ option, selected, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const tinted = selected || hovered;
  return (
    <button
      type='button'
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className='flex w-full cursor-pointer items-center text-left'
      style={{
        minHeight: 48,
        gap: 'var(--dim-space-200)',
        paddingLeft: 'var(--dim-space-300)',
        paddingRight: 'var(--dim-space-300)',
        paddingTop: 'var(--dim-space-200)',
        paddingBottom: 'var(--dim-space-200)',
        borderRadius: 'var(--dim-radius-150, 6px)',
        background: tinted
          ? 'var(--surface-popup-listitem-hover)'
          : 'var(--surface-list-default)',
        color: tinted
          ? 'var(--text-popup-listitem-hover)'
          : 'var(--text-list-default)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        lineHeight: 1.5,
        border: 'none',
      }}
    >
      <span className='min-w-0 flex-1'>{option.label}</span>
      {selected && (
        <Sym name='check' size={16} color='var(--icon-brandPrimary-default)' />
      )}
    </button>
  );
};

const DatePicker = React.forwardRef(function DatePicker(
  {
    label = 'Label',
    required = false,
    helperText,
    error,
    placeholder = 'Day Month Year',
    value,
    defaultValue,
    onChange,
    format = defaultFormat,
    minDate,
    leadingIcon = 'calendar_today',
    /* Show/hide flags — match Figma Property panel exactly. */
    showFieldName = true,
    showLabel = true,
    showRequired = true,
    showHelperText = true,
    showLeadingIcon = true,
    size = 'md',
    state,
    disabled = false,
    id: idProp,
    name,
    className = '',
    style = {},
    /** Full `Popup` date dialog (Figma 4047:6466) instead of anchored `Popover`. */
    modal = false,
    modalSubtitle = 'เลือกวันที่ต้องการนัดหมายล่วงหน้า',
    ...rest
  },
  ref,
) {
  const autoId = useFieldId('datepicker');
  const id = idProp || autoId;
  const [internal, setInternal] = useState(defaultValue ?? null);
  const isControlled = value !== undefined;
  const v = isControlled ? value : internal;
  const activeMinDate = resolveActiveMinDate(minDate, modal);
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => v || new Date());
  const [draft, setDraft] = useState(null);
  const [quickKey, setQuickKey] = useState('custom');
  const triggerRef = useRef(null);
  const setTriggerRef = (node) => {
    triggerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const autoState = disabled ? 'disabled'
                  : error    ? 'error'
                  : open     ? 'open'
                  : hovered  ? 'hover'
                  : v        ? 'filled'
                  : 'default';
  const effState = state || autoState;
  const s = resolveTrigger({ state: effState, hasValue: !!v, error: !!error, disabled });
  const dim = SIZES[size] || SIZES.md;

  const displayText = v ? format(v) : placeholder;
  const isPlaceholder = !v;

  const pick = (date) => {
    const next = startOfDay(date);
    if (activeMinDate && next.getTime() < activeMinDate.getTime()) return;
    if (!isControlled) setInternal(next);
    onChange && onChange(next);
    setOpen(false);
  };

  /* Close on Escape (popover path — modal uses Popup's handler). */
  useEffect(() => {
    if (!open || modal) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, modal]);

  /* Popover: sync month to value when opening. */
  useEffect(() => {
    if (!open || modal) return;
    if (v) setViewMonth(firstOfMonth(v));
  }, [open, v, modal]);

  /* Modal: initialise draft + month + quick highlight when dialog opens. */
  useEffect(() => {
    if (!open || !modal) return;
    const floor = resolveActiveMinDate(minDate, modal);
    const initial = v ? startOfDay(new Date(v)) : null;
    let nextDraft = initial;
    if (nextDraft && floor && nextDraft.getTime() < floor.getTime()) {
      nextDraft = floor;
    }
    setDraft(nextDraft);
    setQuickKey(nextDraft ? matchModalQuickKey(nextDraft) : 'custom');
    const base = nextDraft ? firstOfMonth(nextDraft) : firstOfMonth(new Date());
    setViewMonth(base);
  }, [open, modal, v, minDate]);

  const rightMonth = addMonthsFirst(viewMonth, 1);

  const handleModalDay = (d) => {
    const next = startOfDay(d);
    if (activeMinDate && next.getTime() < activeMinDate.getTime()) return;
    setDraft(next);
    setQuickKey('custom');
  };

  const handleModalQuick = (key) => {
    if (key === 'custom') {
      setQuickKey('custom');
      return;
    }
    const opt = DATE_MODAL_QUICK.find((o) => o.key === key);
    if (!opt) return;
    const t = startOfDay(new Date());
    let next = startOfDay(opt.resolve(t));
    const floor = resolveActiveMinDate(minDate, modal);
    if (floor && next.getTime() < floor.getTime()) next = floor;
    setDraft(next);
    setQuickKey(key);
    setViewMonth(firstOfMonth(next));
  };

  const commitModal = () => {
    if (!draft) return;
    pick(draft);
  };

  const calendarPair = (
    <div
      className='scrollbar-thin flex min-h-0 w-full min-w-0 flex-1 flex-row flex-wrap content-start items-stretch justify-center overflow-x-hidden overflow-y-auto'
      style={{
        background: 'var(--surface-card-100)',
        gap: 'var(--dim-space-200)',
      }}
    >
      <div
        className='flex min-w-0 justify-center'
        style={{ flex: '0 1 320px', maxWidth: '100%' }}
      >
        <Calendar
          viewMonth={viewMonth}
          mode='single'
          selection={draft}
          minDate={activeMinDate ?? undefined}
          onSelect={handleModalDay}
          onNavigate={(delta) => setViewMonth((m) => addMonthsFirst(m, delta))}
          showLeftChevron
          showRightChevron={false}
        />
      </div>
      <div
        className='flex min-w-0 justify-center'
        style={{ flex: '0 1 320px', maxWidth: '100%' }}
      >
        <Calendar
          viewMonth={rightMonth}
          mode='single'
          selection={draft}
          minDate={activeMinDate ?? undefined}
          onSelect={handleModalDay}
          onNavigate={(delta) => setViewMonth((m) => addMonthsFirst(m, delta))}
          showLeftChevron={false}
          showRightChevron
        />
      </div>
    </div>
  );

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
          role={modal ? 'button' : 'combobox'}
          aria-haspopup='dialog'
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
            paddingLeft:   dim.paddingX,
            paddingRight:  dim.paddingX,
            paddingTop:    'var(--dim-space-200)',
            paddingBottom: 'var(--dim-space-200)',
            borderRadius:  'var(--dim-radius-200)',
            border:        `${s.borderW} solid ${s.borderC}`,
            background:    s.bg,
            boxShadow:     s.ring,
            color:         s.textColor,
            fontFamily:    'var(--type-family-body)',
            fontSize:      dim.fontSize,
            lineHeight:    1.5,
            cursor:        disabled ? 'not-allowed' : 'pointer',
            boxSizing:     'border-box',
            outline:       'none',
            transition:    'border-color 160ms cubic-bezier(0.4,0,0.2,1), box-shadow 160ms cubic-bezier(0.4,0,0.2,1), background 160ms cubic-bezier(0.4,0,0.2,1)',
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
              width:  chevronSize(size),
              height: chevronSize(size),
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              color: s.iconColor,
            }}
          >
            <Sym name='expand_more' size={chevronSize(size)} color='currentColor' />
          </span>
        </button>

        {modal ? (
          <Popup
            open={open && !disabled}
            onClose={() => setOpen(false)}
            title='เลือกวันที่'
            subtitle={modalSubtitle}
            width={1024}
            secondaryAction={{ label: 'ยกเลิก', onClick: () => setOpen(false) }}
            primaryAction={{
              label: 'ตกลง',
              disabled: !draft,
              onClick: commitModal,
            }}
          >
            <div
              className='flex min-h-0 w-full min-w-0 flex-col overflow-hidden lg:flex-row lg:items-stretch'
              style={{
                border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                borderRadius: 'var(--dim-radius-400)',
                maxHeight: 'min(620px, calc(100dvh - 9rem))',
              }}
            >
              <div
                className='flex w-full shrink-0 flex-col overflow-hidden border-b border-solid lg:w-64 lg:border-b-0 lg:border-r'
                style={{
                  gap: 'var(--dim-space-300)',
                  padding: 'var(--dim-space-300)',
                  background: 'var(--surface-popup-quickoptions)',
                  borderColor: 'var(--border-popup-quickoptions)',
                }}
              >
                <p
                  style={{
                    color: 'var(--brand-p600)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-xs)',
                    fontWeight: 'var(--type-weight-medium)',
                    lineHeight: 1.5,
                    margin: 'var(--dim-space-0)',
                  }}
                >
                  ตัวเลือกด่วน
                </p>
                <div className='scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden' style={{ WebkitOverflowScrolling: 'touch' }}>
                  <div className='flex w-full flex-col' style={{ gap: 'var(--dim-space-050)' }}>
                    {DATE_MODAL_QUICK.map((opt) => (
                      <ModalQuickRow
                        key={opt.key}
                        option={opt}
                        selected={quickKey === opt.key}
                        onClick={() => handleModalQuick(opt.key)}
                      />
                    ))}
                    <ModalQuickRow
                      option={DATE_MODAL_QUICK_CUSTOM}
                      selected={quickKey === 'custom'}
                      onClick={() => handleModalQuick('custom')}
                    />
                  </div>
                </div>
              </div>
              {calendarPair}
            </div>
          </Popup>
        ) : (
          <Popover
            open={open && !disabled}
            onClose={() => setOpen(false)}
            anchorRef={triggerRef}
            style={{
              background: 'var(--surface-dropdown-default)',
              border: 'var(--dim-stroke-100) solid var(--border-dropdown-default)',
              borderRadius: 'var(--dim-radius-500)',
              boxShadow: 'var(--shadow-dropdown)',
              padding: 'var(--dim-space-0)',
              zIndex: 'var(--sm-z-modal-popover, 1450)',
            }}
          >
            <Calendar
              viewMonth={viewMonth}
              mode='single'
              selection={v}
              minDate={activeMinDate ?? undefined}
              onSelect={pick}
              onNavigate={(delta) =>
                setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))
              }
            />
          </Popover>
        )}
      </div>
    </FieldShell>
  );
});

export default DatePicker;
export { defaultFormat, sameDay };
