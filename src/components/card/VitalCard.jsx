import React, { useEffect, useState } from 'react';
import Icon from '@/components/icons/Icon';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import SharedBadge from '@/components/badge/Badge';

/* Figma node 80:12916 — Vitals card (sub-component "Vitals" 160:24891)
   Tokens (design.md §4·§6):
     surface/card/100        → #FFFFFF
     border/card/default     → #E2E4E6   (1px)
     dimension/radius/500    → 16px
     dimension/space/400     → 16px (padding)
     dimension/space/100     → 4px  (vertical gap)
     dimension/space/300     → 12px (header gap)
     dimension/space/600     → 24px (value-row gap)
     dimension/space/150     → 6px  (gap between ± buttons)
     dimension/radius/200    → 8px  (stepper radius)
     text/content/default    → #363B3F (label · value)
     text/input/require      → --text-input-require (red/600 · design.md row 1205) — required asterisk
     text/content/tertiary   → #858C92 (hint, 9px Regular)

   ± stepper is the Figma "Neutral Subdue Icon Button" — Fill / Small
   (MIH DS Foundation node 2024-4516, design.md §7f rows 3080-3095).
   Aliased in code as `<NeutralSubdueIconButton variant='fill' size='sm'>`
   so radius (8 px) + the secondary/200 surface stay in sync with the
   design system. Default bg = surface.neutralButton.secondary (#E2E4E6). */

/* Colorful tone → StatusBadge style alias. The VitalCard public API still
   accepts orange/teal/green/blue/red for backwards compat; we route them
   through the shared Badge component (Figma 302:73). */
const VITAL_TONE_TO_BADGE_STYLE = {
  orange: 'warning',
  teal:   'success',
  green:  'success',
  blue:   'info',
  red:    'error',
};
const Badge = ({ tone = 'orange', children }) => (
  <SharedBadge style={VITAL_TONE_TO_BADGE_STYLE[tone] || 'success'} size='small'>
    {children}
  </SharedBadge>
);

/* ค่าที่อยู่ในเกณฑ์ไม่ต้องติดป้าย (มติผู้ใช้ 28 ส.ค. 69) — ป้าย "ปกติ" เต็มกริด
   ทำให้ตาต้องกวาดหาป้ายที่ไม่ใช่สีเขียวเอง ปล่อยว่างไว้แล้วป้ายที่โผล่มาคือสิ่งผิดปกติ
   จริง ๆ ตัวเดียว ตัวกรองอยู่ที่ <Header> จุดเดียวจึงคุมทั้ง VitalCard ·
   PressureCard · BMICard ที่เรียกใช้หัวการ์ดร่วมกัน */
const NORMAL_BADGE_LABEL = 'ปกติ';

const Header = ({ label, unit, required, badge: rawBadge, labelAction }) => {
  const badge = rawBadge && rawBadge.label !== NORMAL_BADGE_LABEL ? rawBadge : undefined;
  return (
  <div className='flex items-center gap-3 w-full'>
    <div className='flex-1 flex items-center gap-2 leading-snug min-w-0'>
      <p
        className='text-xs font-medium whitespace-nowrap'
        style={{ color: 'var(--text-content-default)' }}
      >
        {label}{unit && ` (${unit})`}{' '}
      </p>
      {required && (
        /* design.md row 1205 · text.input.require → --text-input-require
           (light red/600 #DC2626 / dark red/400 #F87171). Inline style so
           Tailwind v2 JIT can't inline a fallback hex at build-time. */
        <span
          className='text-sm font-normal ml-0.5'
          style={{ color: 'var(--text-input-require)' }}
          aria-hidden
        >
          *
        </span>
      )}
      {/* ตัวสลับ (เส้นรอบเอว ↔ เส้นรอบหัว) วางติดชื่อช่อง ไม่ใช่ชิดขอบขวา —
          อ่านเป็นส่วนขยายของชื่อว่ากำลังวัดอะไรอยู่ (มติผู้ใช้ 28 ส.ค. 69) */}
      {labelAction}
    </div>
    {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
  </div>
  );
};

const VitalCard = ({
  label,
  required = false,
  unit = '',
  value: initial = '',
  step = 1,
  hint,
  badge, // {tone, label}
  children, // overrides input area (e.g. BMI gradient)
  onChange,
  /* Optional validity hook — parent forms (e.g. VitalsForm) wire this
     to aggregate per-field validity into an overall "required fields
     complete" flag that gates the Screening footer's "ถัดไป" button.
     We report `hasMeasurement` (value > 0) which is also the same flag
     that gates the in-card status badge, so card UI and form gate
     stay in lockstep.                                                 */
  onValidityChange,
  /** node เล็ก ๆ ที่วางข้างชื่อช่อง (เช่น ปุ่มสลับชนิดการวัด) */
  labelAction,
}) => {
  const [value, setValue] = useState(initial);
  /* Vital signs cannot be negative — clamp at 0 for both the stepper
     and any keyboard input. The native input also gets `min={0}`. */
  const clampNonNeg = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return v;
    return n < 0 ? '0' : v;
  };
  const update = (v) => {
    const next = clampNonNeg(v);
    setValue(next);
    onChange?.(next);
  };
  const fmt = (n) => (step < 1 ? n.toFixed(1).replace(/\.0$/, '') : String(Math.round(n)));
  const inc = () => update(fmt(Number(value || 0) + step));
  const dec = () => update(fmt(Math.max(0, Number(value || 0) - step)));
  /* Decrement disabled at the floor (0) — and while the field is empty,
     so the stepper doesn't silently seed "−1" on first click. */
  const decDisabled = value === '' || value === null || Number(value) <= 0;
  /* Status badge ("ปกติ", "สูง" …) only renders once the card holds a
     real measurement. Placeholder / first-visit states (value === '' or
     0) are intentionally un-badged so the panel doesn't certify an
     unmeasured field as "ปกติ" — clinician must enter a value first.
     Mirrors PressureCard's and BMICard's positive-value gates so the
     three card variants behave consistently. */
  const numeric = Number(value);
  const hasMeasurement =
    value !== '' && value !== null && value !== undefined && Number.isFinite(numeric) && numeric > 0;
  const visibleBadge = hasMeasurement ? badge : undefined;

  /* Bubble validity up to the parent form. Deps intentionally exclude
     `onValidityChange` — parents often pass an inline closure (one per
     field key), and including it would re-fire the effect on every
     parent render. The setter on the parent side is idempotent
     (no-ops when the value is unchanged) so the worst case is a single
     extra setState compare per `hasMeasurement` flip.                 */
  useEffect(() => {
    onValidityChange?.(hasMeasurement);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMeasurement]);

  return (
    <div className='bg-surface-card border border-ink-line rounded-card p-4 flex flex-col gap-1 w-full'>
      <Header label={label} unit={unit} required={required} badge={visibleBadge} labelAction={labelAction} />

      {children ? (
        children
      ) : (
        <div className='flex items-center gap-6 w-full'>
          <input
            type='number'
            min={0}
            step={step}
            value={value}
            onChange={(e) => update(e.target.value)}
            className='flex-1 min-w-0 text-base font-bold bg-transparent border-0 focus:ring-0 px-0 leading-snug'
            style={{ color: 'var(--text-content-default)' }}
            placeholder='0'
          />
          <div className='flex items-center gap-1.5 shrink-0'>
            <NeutralSubdueIconButton
              variant='outlined'
              size='sm'
              onClick={dec}
              disabled={decDisabled}
              aria-label='decrement'
            >
              <Icon name='minus' size={16} />
            </NeutralSubdueIconButton>
            <NeutralSubdueIconButton variant='outlined' size='sm' onClick={inc} aria-label='increment'>
              <Icon name='plus' size={16} />
            </NeutralSubdueIconButton>
          </div>
        </div>
      )}

      {hint && (
        <p
          className='text-[9px] leading-normal w-full'
          style={{ color: 'var(--text-content-tertiary)' }}
        >
          {hint}
        </p>
      )}
    </div>
  );
};

/* Pressure (sys/dia) — Figma OPD Vitals 80:12916.
   Each value has its own ± stepper (same Neutral Icon Button · sm as
   VitalCard 160:24891). Layout per Figma:
     [sys input] [− +]   /   [dia input] [− +]
   "/" separator stays in the row (text/content/tertiary) and reuses the
   danger tone when systolic/diastolic crosses the threshold. */
const PressureValue = ({ value, onChange, ariaLabel, danger, step, fmt }) => {
  /* mmHg is non-negative — clamp typed input + stepper at 0. */
  const handleType = (raw) => {
    const n = Number(raw);
    if (!Number.isFinite(n) || n >= 0) onChange(raw);
    else onChange('0');
  };
  const dec = () => onChange(fmt(Math.max(0, Number(value || 0) - step)));
  const inc = () => onChange(fmt(Number(value || 0) + step));
  const decDisabled = value === '' || value === null || Number(value) <= 0;
  return (
    <div className='flex-1 min-w-0 flex items-center gap-1.5'>
      <input
        type='number'
        min={0}
        step={step}
        value={value}
        onChange={(e) => handleType(e.target.value)}
        aria-label={ariaLabel}
        className={`flex-1 min-w-0 text-base font-bold bg-transparent border-0 focus:ring-0 px-0 ${danger ? 'text-badge-redText' : ''}`}
        style={danger ? undefined : { color: 'var(--text-content-default)' }}
      />
      <div className='flex items-center gap-1.5 shrink-0'>
        <NeutralSubdueIconButton variant='outlined' size='sm' onClick={dec} disabled={decDisabled} aria-label={`ลด${ariaLabel}`}>
          <Icon name='minus' size={16} />
        </NeutralSubdueIconButton>
        <NeutralSubdueIconButton variant='outlined' size='sm' onClick={inc} aria-label={`เพิ่ม${ariaLabel}`}>
          <Icon name='plus' size={16} />
        </NeutralSubdueIconButton>
      </div>
    </div>
  );
};

export const PressureCard = ({ sys = '128', dia = '80', step = 1, onChange, onValidityChange }) => {
  const [s, setS] = useState(sys);
  const [d, setD] = useState(dia);
  const updateS = (next) => {
    setS(next);
    onChange?.({ sys: next, dia: d });
  };
  const updateD = (next) => {
    setD(next);
    onChange?.({ sys: s, dia: next });
  };

  const systolic = Number(s);
  const diastolic = Number(d);
  /* `hasMeasurement` requires BOTH numbers to be finite AND positive.
     Pre-measurement / first-visit placeholders ('' or '0') therefore
     never trip the badge classifier — a fresh round shouldn't proudly
     announce "ปกติ" before the cuff has even been put on the patient,
     and 0 mmHg isn't a physically meaningful reading on a living
     person. (Figma 293:65594 — first-visit empty state.) */
  const hasMeasurement =
    Number.isFinite(systolic) &&
    Number.isFinite(diastolic) &&
    systolic > 0 &&
    diastolic > 0;

  /* Mirror VitalCard's validity hook — fires when BOTH sys+dia hold a
     positive number. See note above for the dep-array choice. */
  useEffect(() => {
    onValidityChange?.(hasMeasurement);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMeasurement]);

  let tone = 'teal';
  let label = 'ปกติ';
  if (hasMeasurement) {
    if (systolic >= 140 || diastolic >= 90) {
      tone = 'red'; label = 'สูงมาก';
    } else if (systolic >= 120 || diastolic >= 80) {
      tone = 'orange'; label = 'สูงเล็กน้อย';
    }
  }
  const badge = hasMeasurement ? { tone, label } : undefined;
  const danger = tone === 'orange' || tone === 'red';

  const fmt = (n) => (step < 1 ? n.toFixed(1).replace(/\.0$/, '') : String(Math.round(n)));

  return (
    <div className='bg-surface-card border border-ink-line rounded-card p-4 flex flex-col gap-1 w-full'>
      <Header label='ความดัน (BP)' unit='mmHg' required badge={badge} />
      <div className='flex items-center gap-3 w-full flex-wrap'>
        <PressureValue
          value={s}
          onChange={updateS}
          ariaLabel='ความดันตัวบน'
          danger={danger}
          step={step}
          fmt={fmt}
        />
        <span
          aria-hidden
          className={`text-base font-bold ${danger ? 'text-badge-redText' : ''}`}
          style={danger ? undefined : { color: 'var(--text-content-tertiary)' }}
        >
          /
        </span>
        <PressureValue
          value={d}
          onChange={updateD}
          ariaLabel='ความดันตัวล่าง'
          danger={danger}
          step={step}
          fmt={fmt}
        />
      </div>
      <p
        className='text-[9px] leading-normal w-full'
        style={{ color: 'var(--text-content-tertiary)' }}
      >
        ปกติ &lt; 120/80 mmHg
      </p>
    </div>
  );
};

/* Parse a scalar BMI from props (number or numeric string). */
const parseBmiScalar = (v) => {
  if (v == null || v === '') return undefined;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(String(v).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};

/* BMI from anthropometry (kg, cm) — same formula as clinical BMI. */
const bmiFromAnthro = (weightKg, heightCm) => {
  const w = parseBmiScalar(weightKg);
  const h = parseBmiScalar(heightCm);
  if (w == null || h == null || w <= 0 || h <= 0) return undefined;
  const bmi = w / ((h / 100) ** 2);
  return Math.round(bmi * 10) / 10;
};

/* Map BMI → 0–100% along the 5-stop gradient bar (PHCIS / Figma 2745:104612
   legend: ผอม | ปกติ | น้ำหนักเกิน | อ้วน | อ้วนมาก). Stops sit at 0 / 25 / 55 /
   75 / 100 % — piecewise linear segments approximate Thai cutoffs so the
   thumb sits over the matching colour band. */
const bmiToGradientPercent = (bmi) => {
  if (bmi < 18.5) return Math.max(0, (bmi / 18.5) * 25);
  if (bmi < 23) return 25 + ((bmi - 18.5) / (23 - 18.5)) * 30;
  if (bmi < 25) return 55 + ((bmi - 23) / (25 - 23)) * 20;
  if (bmi < 30) return 75 + ((bmi - 25) / (30 - 25)) * 20;
  return Math.min(100, 95 + ((bmi - 30) / 15) * 5);
};

const bmiCategoryBadge = (bmi) => {
  /* BMI ≤ 0 is a first-visit / no-measurement placeholder (the rest of
     the panel forces 0 / 0 weight & height on Figma 293:65594's empty
     state). No clinical category applies — suppress the badge so the
     card doesn't mislabel an unmeasured patient as "ผอม". */
  if (!Number.isFinite(bmi) || bmi <= 0) return undefined;
  if (bmi < 18.5) return { tone: 'blue', label: 'ผอม' };
  if (bmi < 23) return { tone: 'teal', label: 'ปกติ' };
  if (bmi < 25) return { tone: 'orange', label: 'น้ำหนักเกิน' };
  if (bmi < 30) return { tone: 'orange', label: 'อ้วน' };
  return { tone: 'red', label: 'อ้วนมาก' };
};

/* BMI — value + multi-stop gradient bar (Vitals 1:2235 in Figma).
   Prefer live `weight` + `height` (kg / cm) when both are valid — matches
   PHCIS frame 2745:104612. Otherwise falls back to explicit `value` (number
   or numeric string). Missing data → no marker, em-dash value, legend only. */
export const BMICard = ({ value, weight, height }) => {
  const fromAnthro = bmiFromAnthro(weight, height);
  const fromProp = parseBmiScalar(value);
  const numeric = fromAnthro ?? fromProp;
  const hasValue = numeric !== undefined;
  const pct = hasValue ? Math.max(0, Math.min(100, bmiToGradientPercent(numeric))) : 0;
  const badge = hasValue ? bmiCategoryBadge(numeric) : undefined;
  const display = hasValue
    ? (Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1).replace(/\.0$/, ''))
    : '—';

  return (
    <div className='bg-surface-card border border-ink-line rounded-card p-4 flex flex-col gap-1 w-full'>
      <Header label='BMI' required badge={badge} />
      <div className='flex items-center w-full'>
        <p
          className='flex-1 min-w-0 text-base font-bold leading-snug'
          style={{ color: 'var(--text-content-default)' }}
        >
          {display}
        </p>
      </div>
      <div
        className='relative h-2 rounded w-full mt-0.5'
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgb(37,128,234) 0%, rgb(5,182,152) 25%, rgb(240,192,61) 55%, rgb(244,105,40) 75%, rgb(199,33,33) 100%)',
        }}
      >
        {hasValue && numeric > 0 && (
          /* Marker is hidden when bmi ≤ 0 (first-visit placeholder) so
             the gradient bar reads as an unfilled legend rather than
             implying the patient is at the extreme-thin end. */
          <div
            className='absolute top-1/2 z-[1] rounded-full bg-surface-card pointer-events-none'
            style={{
              width: 16,
              height: 16,
              left: `${pct}%`,
              transform: 'translate(-50%, -50%)',
              borderWidth: 'var(--dim-stroke-200, 2px)',
              borderStyle: 'solid',
              borderColor: 'var(--border-brandPrimary-default)',
              boxShadow: 'var(--shadow-card)',
            }}
            title={`BMI ${display}`}
          />
        )}
      </div>
      <div
        className='flex justify-between text-[9px] w-full'
        style={{ color: 'var(--text-content-tertiary)' }}
      >
        <span>ผอม</span>
        <span>ปกติ</span>
        <span>น้ำหนักเกิน</span>
        <span>อ้วน</span>
        <span>อ้วนมาก</span>
      </div>
    </div>
  );
};

export default VitalCard;
