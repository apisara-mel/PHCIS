import React, { useMemo, useState } from 'react';
import FilterTag from '@/components/forms/FilterTag';
import DateFilterPopup, { QUICK_OPTIONS as POPUP_QUICK_OPTIONS } from '@/components/popup/DateFilterPopup';

/* MIH FilterDateTag — Figma 115:35757 (Tag group) + 238:39268 (DateFilterPopup).
   Composite of <FilterTag dropdown> trigger + <DateFilterPopup>.
   Click the chip → popup opens; pick a quick option or custom range → chip
   label updates and onChange fires.

   Value shape: { quick, tab?, single?, range? }
     • quick      — the currently selected quick-option key
                     (e.g. 'today', 'yesterday', '7days', '30days',
                      'thisweek', 'thismonth', 'lastmonth', 'thisyear',
                      'lastyear', 'custom').
     • tab/single/range — only present when quick === 'custom'; mirrors the
                     payload emitted by DateFilterPopup.onApply.

   Chip label resolution:
     • quick !== 'custom'  → quickLabels[quick] (caller-provided extras
                              merged on top of popup's own QUICK_OPTIONS)
     • quick === 'custom' → Thai-formatted date / range
                              (single → "5 พ.ค. 2569"; range → "5 พ.ค. – 12 พ.ค. 2569")     */

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const sameDay = (a, b) =>
  a && b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/* Calendar picks emit quick:'custom' even when the day matches a preset.
   Collapse back to the preset key so queue chips stay on "วันนี้" / "เมื่อวาน". */
const resolveEffectiveQuick = (current, defaultQuick) => {
  const quick = current?.quick ?? defaultQuick;
  if (quick !== 'custom' || !current) return quick;
  if (current.tab === 'single' && current.single) {
    const today = startOfDay(new Date());
    if (sameDay(current.single, today)) return 'today';
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (sameDay(current.single, yesterday)) return 'yesterday';
  }
  return 'custom';
};

const sameYear = (a, b) =>
  a && b && a.getFullYear() === b.getFullYear();

const fmtDate = (d, withYear = true) =>
  withYear
    ? `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`
    : `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]}`;

/* Format a custom DateFilterPopup payload into a Thai chip label.
   Single-day range collapses to one date (no en-dash). Same-year ranges
   omit the start year for a tighter label. */
export const formatThaiDateRange = (selection) => {
  if (!selection) return '';
  if (selection.tab === 'single' && selection.single) {
    return fmtDate(selection.single);
  }
  if (selection.tab === 'range' && selection.range) {
    const { start, end } = selection.range;
    if (!start || !end) return '';
    if (sameDay(start, end)) return fmtDate(start);
    const showStartYear = !sameYear(start, end);
    return `${fmtDate(start, showStartYear)} – ${fmtDate(end)}`;
  }
  return '';
};

/* Built-in label map sourced from the popup's own QUICK_OPTIONS so the chip
   stays in sync with whatever the popup offers. Callers can add more keys
   via the `quickLabels` prop (e.g. 'today' / 'yesterday' that aren't in the
   popup sidebar). */
const POPUP_QUICK_LABELS = Object.fromEntries(
  POPUP_QUICK_OPTIONS.map((o) => [o.value, o.label]),
);

/* Quick-keys that resolve to a single calendar day. Anything else (7days,
   thismonth, lastyear, …) is a span and reopens on the range tab. */
const SINGLE_DAY_QUICKS = new Set(['today', 'yesterday']);

/* Pick which tab the popup should land on when reopened, given the chip's
   current value. Custom selections carry their own `tab`; for quick keys we
   infer single vs range. */
const tabForValue = (current) => {
  if (!current) return 'single';
  if (current.quick === 'custom') return current.tab || 'single';
  return SINGLE_DAY_QUICKS.has(current.quick) ? 'single' : 'range';
};

const FilterDateTag = ({
  prefix = 'วัน:',
  value,                  // controlled: { quick, tab?, single?, range? }
  defaultValue,           // uncontrolled initial: same shape OR a quick-key string
  onChange,
  defaultQuick = 'today', // fallback when no value/defaultValue provided
  quickLabels,            // extra labels merged over POPUP_QUICK_LABELS
  placeholder = 'เลือกวันที่',
  selectedWhen,           // (value) => boolean — overrides "selected" chip styling
  className = '',
  style,
}) => {
  const isControlled = value !== undefined;
  const initial = useMemo(() => {
    if (typeof defaultValue === 'string') return { quick: defaultValue };
    if (defaultValue && typeof defaultValue === 'object') return defaultValue;
    return { quick: defaultQuick };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [internal, setInternal] = useState(initial);
  const current = isControlled ? value : internal;
  const effectiveQuick = resolveEffectiveQuick(current, defaultQuick);

  const [open, setOpen] = useState(false);

  const allLabels = useMemo(
    () => ({ ...POPUP_QUICK_LABELS, ...(quickLabels || {}) }),
    [quickLabels],
  );

  const label = (() => {
    if (effectiveQuick !== 'custom') return allLabels[effectiveQuick] || placeholder;
    const formatted = formatThaiDateRange(current);
    return formatted || (allLabels.custom || 'กำหนดเอง');
  })();

  /* Queue pages default to วันนี้ — still show the brand selected chip. */
  const isSelected = typeof selectedWhen === 'function'
    ? !!selectedWhen(current)
    : !!effectiveQuick;

  const handleApply = ({ tab, quick: nextQuick, single, range }) => {
    let resolvedQuick = nextQuick;
    if (nextQuick === 'custom' && tab === 'single' && single) {
      const today = startOfDay(new Date());
      if (sameDay(single, today)) resolvedQuick = 'today';
      else {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (sameDay(single, yesterday)) resolvedQuick = 'yesterday';
      }
    }
    const next = resolvedQuick === 'custom'
      ? { quick: 'custom', tab, single, range }
      : { quick: resolvedQuick };
    if (!isControlled) setInternal(next);
    onChange && onChange(next);
  };

  return (
    <>
      <FilterTag
        prefix={prefix}
        value={label}
        dropdown
        selected={isSelected}
        open={open}
        onClick={() => setOpen(true)}
        className={className}
        style={style}
      />
      <DateFilterPopup
        open={open}
        onClose={() => setOpen(false)}
        initialQuick={effectiveQuick}
        initialTab={tabForValue(current)}
        onApply={handleApply}
      />
    </>
  );
};

export default FilterDateTag;
