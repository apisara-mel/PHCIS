import React, { useEffect, useState } from 'react';
import Popup from '@/components/popup/Popup';
import Calendar, { sameDay } from '@/components/forms/Calendar';
import { TabBar, TabPillLarge } from '@/components/tab/TabPill';
import FilterTag from '@/components/forms/FilterTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';

/* MIH DateFilterPopup — responsive to Figma Popup specs:
   • Range mode (lg+): node 74:7078 — left column "ตัวเลือกด่วน" (range
     quick-options + กำหนดเอง) + dual calendars (side-by-side).
   • Single mode (lg+): node 154:7060 — same shell but the sidebar swaps
     in single-day quick-options (วันนี้/เมื่อวาน/พรุ่งนี้, ต้นเดือน-
     สิ้นเดือนนี้/ที่แล้ว, วันนี้เมื่อปีที่แล้ว).
   • Small (<lg): compact — horizontal quick chips + "More" when row
     overflows (node 144:7112) + calendars (same wrap rule).
   https://www.figma.com/design/I1pQchHR7IwrX6ZIBZRt6e/MIH-Design-System---Popup?node-id=74-7078
   https://www.figma.com/design/I1pQchHR7IwrX6ZIBZRt6e/MIH-Design-System---Popup?node-id=154-7060 */

const TABS = [
  { value: 'single', label: 'วันเดียว' },
  { value: 'range',  label: 'ช่วงวันที่' },
];

/* Quick-options shown only on the `single` tab. Maps to single-day
   shortcuts per Figma 154:7060 — each value resolves through
   `computeQuickSingle` to a single Date. */
const QUICK_OPTIONS_SINGLE = [
  { value: 'today',          label: 'วันนี้',                group: 0 },
  { value: 'yesterday',      label: 'เมื่อวาน',              group: 0 },
  { value: 'tomorrow',       label: 'พรุ่งนี้',              group: 0 },
  { value: 'monthStart',     label: 'ต้นเดือนนี้',           group: 1 },
  { value: 'monthEnd',       label: 'สิ้นเดือนนี้',          group: 1 },
  { value: 'lastMonthStart', label: 'ต้นเดือนที่แล้ว',       group: 1 },
  { value: 'lastMonthEnd',   label: 'สิ้นเดือนที่แล้ว',      group: 1 },
  { value: 'todayLastYear',  label: 'วันนี้เมื่อปีที่แล้ว',  group: 2 },
];

/* Quick-options shown only on the `range` tab — each value resolves
   through `computeQuickRange` to a {start, end} pair. */
const QUICK_OPTIONS_RANGE = [
  { value: '7days',     label: '7 วันที่ผ่านมา',  group: 0 },
  { value: '30days',    label: '30 วันที่ผ่านมา', group: 0 },
  { value: 'thisweek',  label: 'สัปดาห์นี้',      group: 1 },
  { value: 'thismonth', label: 'เดือนนี้',        group: 1 },
  { value: 'lastmonth', label: 'เดือนที่แล้ว',    group: 1 },
  { value: 'thisyear',  label: 'ปีนี้',           group: 1 },
  { value: 'lastyear',  label: 'ปีที่แล้ว',       group: 1 },
  { value: 'custom',    label: 'กำหนดเอง',        group: 2 },
];

/* Combined export for label lookup (e.g. FilterDateTag chip captions).
   The popup itself selects the right subset based on the active tab. */
const QUICK_OPTIONS = [...QUICK_OPTIONS_SINGLE, ...QUICK_OPTIONS_RANGE];

const SINGLE_QUICK_VALUES = new Set(QUICK_OPTIONS_SINGLE.map((o) => o.value));
const RANGE_QUICK_VALUES  = new Set(QUICK_OPTIONS_RANGE.map((o) => o.value));

const Sym = ({ name, size = 16, color }) => (
  <span
    className='material-symbols-outlined'
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontSize: size,
      color,
      lineHeight: 1,
      display: 'inline-flex',
    }}
    aria-hidden
  >
    {name}
  </span>
);

/* Desktop sidebar row — list + check (Figma 74:7078). */
const QuickOptionRow = ({ option, selected, onClick }) => {
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
        borderRadius: 6,
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
      {selected && <Sym name='check' size={16} color='var(--icon-brandPrimary-default)' />}
    </button>
  );
};

/* Small screens — same Brand tag as queue FilterTag (Figma FilterTag lg);
   horizontal gap matches toolbar (--dim-space-200). Overflow → More (144:7112). */

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const addDays = (d, n) => {
  const x = startOfDay(d);
  x.setDate(x.getDate() + n);
  return x;
};
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth   = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const addMonths    = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const startOfWeek  = (d) => addDays(d, -d.getDay());
const endOfWeek    = (d) => addDays(startOfWeek(d), 6);
const startOfYear  = (d) => new Date(d.getFullYear(), 0, 1);
const endOfYear    = (d) => new Date(d.getFullYear(), 11, 31);

const computeQuickRange = (key, today = new Date()) => {
  const t = startOfDay(today);
  switch (key) {
    case '7days':     return { start: addDays(t, -6), end: t };
    case '30days':    return { start: addDays(t, -29), end: t };
    case 'thisweek':  return { start: startOfWeek(t), end: endOfWeek(t) };
    case 'thismonth': return { start: startOfMonth(t), end: endOfMonth(t) };
    case 'lastmonth': {
      const prev = addMonths(t, -1);
      return { start: startOfMonth(prev), end: endOfMonth(prev) };
    }
    case 'thisyear':  return { start: startOfYear(t), end: endOfYear(t) };
    case 'lastyear': {
      const prev = new Date(t.getFullYear() - 1, 0, 1);
      return { start: startOfYear(prev), end: endOfYear(prev) };
    }
    default: return null;
  }
};

/* Resolves a single-mode quick key to one Date (the value that should
   be reflected on the calendar + emitted via onApply). Returns null
   when the key isn't a recognised single-day shortcut. */
const computeQuickSingle = (key, today = new Date()) => {
  const t = startOfDay(today);
  switch (key) {
    case 'today':          return t;
    case 'yesterday':      return addDays(t, -1);
    case 'tomorrow':       return addDays(t, 1);
    case 'monthStart':     return startOfMonth(t);
    case 'monthEnd':       return endOfMonth(t);
    case 'lastMonthStart': return startOfMonth(addMonths(t, -1));
    case 'lastMonthEnd':   return endOfMonth(addMonths(t, -1));
    case 'todayLastYear':  return new Date(t.getFullYear() - 1, t.getMonth(), t.getDate());
    default: return null;
  }
};

/* Choose a sensible default quick key for the given tab — used when the
   popup opens or the user switches tabs and the previous `quick` value
   doesn't apply to the new mode. */
const defaultQuickForTab = (tab) => (tab === 'single' ? 'today' : '7days');

const DateFilterPopup = ({
  open,
  onClose,
  initialQuick = 'today',
  initialTab = 'single',
  onApply,
}) => {
  const today = startOfDay(new Date());

  /* Normalise the caller's initialQuick against the tab — keeps the
     sidebar selection in sync with whichever option group is visible. */
  const resolveInitialQuick = (tab, q) => {
    if (tab === 'single' && SINGLE_QUICK_VALUES.has(q)) return q;
    if (tab === 'range'  && RANGE_QUICK_VALUES.has(q))  return q;
    return defaultQuickForTab(tab);
  };

  const [tab, setTab] = useState(initialTab);
  const [quick, setQuick] = useState(() => resolveInitialQuick(initialTab, initialQuick));
  const [single, setSingle] = useState(
    () => computeQuickSingle(resolveInitialQuick(initialTab, initialQuick), today) || today,
  );
  const [range, setRange] = useState(
    () => computeQuickRange(resolveInitialQuick(initialTab, initialQuick), today) || { start: today, end: today },
  );
  const [viewMonth, setViewMonth] = useState(today);
  const [rangeStep, setRangeStep] = useState('start');

  useEffect(() => {
    if (!open) return;
    const q0 = resolveInitialQuick(initialTab, initialQuick);
    setTab(initialTab);
    setQuick(q0);
    const s = computeQuickSingle(q0, today);
    if (s) setSingle(s);
    else setSingle(today);
    const r = computeQuickRange(q0, today);
    if (r) setRange(r);
    setViewMonth(s ? startOfMonth(s) : today);
    setRangeStep('start');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeQuickOptions = tab === 'single' ? QUICK_OPTIONS_SINGLE : QUICK_OPTIONS_RANGE;
  const grouped = [0, 1, 2].map((g) => activeQuickOptions.filter((o) => o.group === g));

  /* Tab toggle — when the user flips between single/range, snap the
     sidebar selection to the new tab's default so the highlighted row
     always reflects something pickable in the visible list. */
  const handleTabChange = (next) => {
    setTab(next);
    setRangeStep('start');
    const q0 = defaultQuickForTab(next);
    setQuick(q0);
    if (next === 'single') {
      const s = computeQuickSingle(q0, today);
      if (s) {
        setSingle(s);
        setViewMonth(startOfMonth(s));
      }
    } else {
      const r = computeQuickRange(q0, today);
      if (r) {
        setRange(r);
        setViewMonth(startOfMonth(r.start));
      }
    }
  };

  const handleQuickClick = (key) => {
    setQuick(key);
    if (tab === 'single') {
      const d = computeQuickSingle(key, today);
      if (d) {
        setSingle(d);
        setViewMonth(startOfMonth(d));
      }
      return;
    }
    /* range tab */
    if (key === 'custom') return;
    const r = computeQuickRange(key, today);
    if (r) {
      setRange(r);
      setViewMonth(startOfMonth(r.start));
      setRangeStep('start');
    }
  };

  const handleDayClick = (d) => {
    setQuick('custom');
    if (tab === 'single') {
      setSingle(d);
      return;
    }
    if (rangeStep === 'start') {
      setRange({ start: d, end: d });
      setRangeStep('end');
    } else {
      const start = range.start;
      if (d.getTime() < start.getTime()) {
        setRange({ start: d, end: start });
      } else {
        setRange({ start, end: d });
      }
      setRangeStep('start');
    }
  };

  const handleApply = () => {
    onApply && onApply({
      tab,
      quick,
      single: tab === 'single' ? single : null,
      range:  tab === 'range'  ? range  : null,
    });
    onClose && onClose();
  };

  const rightMonth = addMonths(viewMonth, 1);
  const calendarSelection = tab === 'single'
    ? (sameDay(single, single) ? single : null)
    : range;

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
          mode={tab}
          selection={calendarSelection}
          onSelect={handleDayClick}
          onNavigate={(delta) => setViewMonth((m) => addMonths(m, delta))}
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
          mode={tab}
          selection={calendarSelection}
          onSelect={handleDayClick}
          onNavigate={(delta) => setViewMonth((m) => addMonths(m, delta))}
          showLeftChevron={false}
          showRightChevron
        />
      </div>
    </div>
  );

  return (
    <Popup
      open={open}
      onClose={onClose}
      title='เลือกวันที่'
      subtitle='เลือกได้ทั้งแบบวันเดียวและแบบช่วงวันที่'
      width={1024}
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
      primaryAction={{ label: 'ตกลง', onClick: handleApply }}
    >
      <div className='flex w-full flex-col items-center' style={{ gap: 'var(--dim-space-400)' }}>
        <div className='flex w-full justify-center'>
            <TabBar align='center'>
              {TABS.map((t) => (
                <TabPillLarge
                  key={t.value}
                  showIcon={false}
                  selected={tab === t.value}
                  onClick={() => handleTabChange(t.value)}
                >
                  {t.label}
                </TabPillLarge>
              ))}
            </TabBar>
        </div>

        <div
          className='flex min-h-0 w-full min-w-0 flex-col overflow-hidden lg:flex-row lg:items-stretch'
          style={{
            border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            borderRadius: 'var(--dim-radius-400)',
            maxHeight: 'min(620px, calc(100dvh - 9rem))',
          }}
        >
          {/* ——— Large (lg+): Figma 74:7078 — sidebar list ——— */}
          <div
            className='hidden min-h-0 w-full shrink-0 flex-col overflow-hidden border-b border-solid lg:flex lg:w-64 lg:border-b-0 lg:border-r'
            style={{
              gap: 'var(--dim-space-300)',
              padding: 'var(--dim-space-300)',
              background: 'var(--surface-popup-quickoptions)',
              borderColor: 'var(--border-popup-quickoptions)',
            }}
          >
            <div
              className='w-full shrink-0'
              style={{
                paddingTop: 'var(--dim-space-300)',
                paddingLeft: 'var(--dim-space-300)',
                paddingRight: 'var(--dim-space-300)',
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
            </div>
            <div className='scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden' style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className='flex w-full flex-col' style={{ gap: 'var(--dim-space-300)' }}>
                {grouped.map((opts, i) => (
                  <div
                    key={i}
                    className='flex w-full flex-col'
                    style={{ gap: 'var(--dim-space-050)' }}
                  >
                    {opts.map((opt) => (
                      <QuickOptionRow
                        key={opt.value}
                        option={opt}
                        selected={quick === opt.value}
                        onClick={() => handleQuickClick(opt.value)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ——— Small: chip row (hidden on lg+) ——— */}
          <div
            className='flex w-full shrink-0 flex-col lg:hidden'
            style={{
              gap: 'var(--dim-space-200)',
              padding: 'var(--dim-space-300)',
              background: 'var(--surface-modal-default)',
              borderBottom: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            }}
          >
            <p
              className='w-full'
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
            <OverflowFlexRow
              className='w-full min-w-0'
              itemGap='var(--dim-space-200)'
              moreAriaLabel='แสดงตัวเลือกด่วนที่ซ่อน'
              menuZIndex='var(--sm-z-modal-popover, 1450)'
              style={{ paddingBottom: 'var(--dim-space-050)' }}
            >
              {activeQuickOptions.map((opt) => (
                <FilterTag
                  key={opt.value}
                  variant='brand'
                  size='lg'
                  value={opt.label}
                  selected={quick === opt.value}
                  onClick={() => handleQuickClick(opt.value)}
                  showLeadingIcon={false}
                  showTitle={false}
                />
              ))}
            </OverflowFlexRow>
          </div>

          {/* Calendars: full width; lg sits right of sidebar */}
          {calendarPair}
        </div>
      </div>
    </Popup>
  );
};

export { QUICK_OPTIONS, QUICK_OPTIONS_SINGLE, QUICK_OPTIONS_RANGE };
export default DateFilterPopup;
