import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Stepper from '@/components/stepper/Stepper';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import Checkbox from '@/components/checkbox/Checkbox';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import XCloseButton from '@/components/button/XCloseButton';
import StaffProfileAvatar from '@/components/appointment/StaffProfileAvatar';
import { THAI_MONTHS, CAL_DAY_HEADERS_LONG, buildMonthGrid } from '../appointment/appointmentShared';
import SuccessToast from '@/components/toast/SuccessToast';
import Header from '@/components/layout/Header';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import ScheduleSidebar from './ScheduleSidebar';
import ScheduleFooter from './ScheduleFooter';
import { buildScheduleStaff } from './scheduleStaff';

/* MIH · ระบบจัดการตารางเวร · Editor (Figma 35:7311).
   Page B per skill — hero gradient + month nav + time/booking + shift chips
   + calendar grid + sticky action bar. */

/* SHIFT_TYPES — pill labels + subtexts + tones match Figma 35:7682.
   The `time` field carries either a clock window (เวรเช้า/บ่าย/ดึก) or the
   English subtitle (เวรเสริม → "On-call", วันหยุด → "Day Off"). Each tone
   maps directly to a `ColorfulBadge` style — no brand→green remap needed. */
const SHIFT_TYPES = [
  { key: 'morning',  label: 'เวรเช้า',  time: '08:00 - 12:00', tone: 'orange' },
  { key: 'noon',     label: 'เวรบ่าย',  time: '13:00 - 16:00', tone: 'blue'   },
  { key: 'evening',  label: 'เวรดึก',   time: '16:00 - 20:00', tone: 'purple' },
  { key: 'oncall',   label: 'เวรเสริม', time: 'On-call',       tone: 'teal'   },
  { key: 'dayoff',   label: 'วันหยุด',  time: 'Day Off',       tone: 'red'    },
];

/* Lookup by key so a calendar cell can render the badge for an assigned shift
   without re-doing a find() per cell render. */
const SHIFT_LOOKUP = SHIFT_TYPES.reduce((acc, s) => { acc[s.key] = s; return acc; }, {});

/* Every SHIFT_TYPES tone now maps 1:1 to a ColorfulBadge style — kept as a
   thin passthrough so the existing call-sites (`shiftBadgeStyle(...)`) stay
   stable and any future tone remap has one place to live. */
const shiftBadgeStyle = (tone) => tone;

/* Quick-pick booking-mix presets per Figma 29:4788. Each preset sets the
   3 sliders (โรงพยาบาล / ออนไลน์ / พิเศษ/ฉุกเฉิน) to a fixed ratio. The
   `custom` row lets the clinician drag the sliders manually.

   `icon: 'person'` + `subtext: "..."` render in the shared Select dropdown
   as a 2-line row (label on top, gray ratio summary below) with a User
   glyph on the left — matches the Figma 29:4788 picker exactly. */
const BOOKING_TYPE_OPTIONS = [
  { value: 'equal',      label: 'ทุกแบบเท่ากัน',                  icon: 'person', subtext: 'โรงพยาบาล 34%, ออนไลน์ 33%, พิเศษ/ฉุกเฉิน 33%', mix: [34, 33, 33] },
  { value: 'hospital',   label: 'เน้นที่โรงพยาบาล',               icon: 'person', subtext: 'โรงพยาบาล 70%, ออนไลน์ 20%, พิเศษ/ฉุกเฉิน 10%', mix: [70, 20, 10] },
  { value: 'online',     label: 'เน้นออนไลน์',                    icon: 'person', subtext: 'โรงพยาบาล 20%, ออนไลน์ 70%, พิเศษ/ฉุกเฉิน 10%', mix: [20, 70, 10] },
  { value: 'mixedequal', label: 'ที่โรงพยาบาลและออนไลน์เท่ากัน',  icon: 'person', subtext: 'โรงพยาบาล 40%, ออนไลน์ 40%, พิเศษ/ฉุกเฉิน 20%', mix: [40, 40, 20] },
  { value: 'custom',     label: 'ระบุเอง',                         icon: 'person', subtext: 'สามารถกำหนดได้ที่สไลด์ด้านล่างด้วยตนเอง',       mix: null  },
];

function bookingMix(value) {
  const opt = BOOKING_TYPE_OPTIONS.find(o => o.value === value);
  return (opt && opt.mix) || [70, 20, 10];
}

/* Reverse lookup: given a `[hospital, online, special]` triple, find the
   preset whose mix matches exactly — used after the user drags any slider
   so the dropdown auto-snaps back to that preset's label, or falls through
   to `custom` when no preset is hit. */
function detectBookingPreset(mix) {
  for (const opt of BOOKING_TYPE_OPTIONS) {
    if (!opt.mix) continue;
    if (opt.mix[0] === mix[0] && opt.mix[1] === mix[1] && opt.mix[2] === mix[2]) {
      return opt.value;
    }
  }
  return 'custom';
}

/* PressableButton — wraps a native <button> with the shared MIH lift-and-press
   interaction (same pattern as BrandButton / NeutralSubdueButton):
   · hover  → translateY(-1px)
   · active → translateY(1px) scale(0.97)
   · disabled → no transform (visual flat)
   All visual properties transition 200ms ease-out. Consumers pass their own
   `style` for the resting look (background, border, padding, font, …); the
   wrapper layers transition + transform on top so existing inline-styled
   buttons can adopt the motion without restructuring. */
const PressableButton = React.forwardRef(function PressableButton(
  { children, style = {}, disabled = false, ...rest },
  ref,
) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const transform = disabled
    ? 'none'
    : pressed
      ? 'translateY(1px) scale(0.97)'
      : hovered
        ? 'translateY(-1px)'
        : 'translateY(0)';
  return (
    <button
      ref={ref}
      type='button'
      disabled={disabled}
      onMouseEnter={() => { if (!disabled) setHovered(true); }}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => { if (!disabled) setPressed(true); }}
      onMouseUp={() => setPressed(false)}
      style={{
        transition: 'transform 200ms ease-out, box-shadow 200ms ease-out, background 200ms ease-out, border-color 200ms ease-out, color 200ms ease-out',
        ...style,
        transform,
      }}
      {...rest}
    >
      {children}
    </button>
  );
});

const BACK_BUTTON_STYLE = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--dim-space-150, 6px)',
  padding: 'var(--dim-space-150, 6px) var(--dim-space-300, 12px)',
  borderRadius: 'var(--dim-radius-200, 8px)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-neutralButton-tertiary, #E2E4E6)',
  background: 'transparent',
  color: 'var(--text-neutralButton-default, #4D5358)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm, 14px)',
  fontWeight: 'var(--type-weight-medium, 500)',
  lineHeight: 1.5,
  cursor: 'pointer',
};

/* Back-button row — sits at the TOP of the combined hero panel (Figma 21:12395).
   No own background/border — inherits white from the EditorHeroPanel wrapper. */
const BackRow = ({ onBack }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--dim-space-300, 12px)',
  }}>
    <PressableButton onClick={onBack} style={BACK_BUTTON_STYLE}>
      <Icon name='chevron-left' size={16} style={{ color: 'currentColor' }} />
      กลับ
    </PressableButton>
    <h1 style={{
      margin: 0,
      fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
      fontSize: 'var(--type-size-base, 16px)',
      fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
      lineHeight: 1.5,
      color: 'var(--text-topic-tertiary-title, #363B3F)',
    }}>
      จัดการตารางเวร
    </h1>
  </div>
);

/* HeroPill — label (Sarabun 12) over value (Mitr Medium 14). Plain text on
   the gradient, not a ColorfulBadge (per Figma 21:12404 spec). */
const HeroPill = ({ label, value }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
    <span style={{
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-xs, 12px)',
      fontWeight: 'var(--type-weight-regular, 400)',
      lineHeight: 1.5,
    }}>
      {label}
    </span>
    <span style={{
      fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
      fontSize: 'var(--type-size-sm, 14px)',
      fontWeight: 'var(--type-weight-medium, 500)',
      lineHeight: 1.25,
      letterSpacing: '-0.28px',
      whiteSpace: 'nowrap',
    }}>
      {value}
    </span>
  </div>
);

const HeroCard = ({ staff }) => (
  <section
    style={{
      /* Teal gradient per Figma 21:12404 — 97.85deg, #0093B7 → #06B2BA.
         Gradients are the only token-rule exception (per CLAUDE.md). */
      background: 'linear-gradient(98deg, #0093B7 0%, #06B2BA 100%)',
      borderRadius: 'var(--dim-radius-500, 16px)',
      padding: 'var(--dim-space-400, 16px) var(--dim-space-600, 24px) var(--dim-space-400, 16px) var(--dim-space-400, 16px)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--dim-space-600, 24px)',
      color: 'var(--text-content-on-content, #FFFFFF)',
    }}
  >
    {/* Avatar — 68×68, 4px white border, faded blue fallback bg */}
    <div style={{
      width: 'var(--dim-size-1500, 68px)',
      height: 'var(--dim-size-1500, 68px)',
      borderRadius: 'var(--dim-radius-full, 9999px)',
      overflow: 'hidden',
      border: 'var(--dim-stroke-400, 4px) solid var(--border-image-default, #FFFFFF)',
      background: '#CFE6F7',
      flexShrink: 0,
      boxShadow: 'var(--shadow-drop-bottom-100, 0 1px 4px rgba(100,116,139,0.10))',
    }}>
      <StaffProfileAvatar staff={staff} size={60} />
    </div>

    {/* Name column — Mitr 16 + Sarabun 14 */}
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <span style={{
        fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
        fontSize: 'var(--type-size-base, 16px)',
        fontWeight: 'var(--type-weight-regular, 400)',
        lineHeight: 1.5,
        whiteSpace: 'nowrap',
      }}>
        {staff.name}
      </span>
      <span style={{
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-regular, 400)',
        lineHeight: 1.5,
        whiteSpace: 'nowrap',
      }}>
        {staff.nameEn}
      </span>
    </div>

    {/* Vertical divider — 1×32, faded brand-50 white-ish */}
    <div style={{
      width: 'var(--dim-stroke-100, 1px)',
      height: 'var(--dim-size-600, 32px)',
      background: 'var(--border-table-line, #F4FBF8)',
      opacity: 0.5,
      flexShrink: 0,
    }} />

    {/* Pills — 3 columns of plain text (no ColorfulBadge) */}
    <div style={{
      flex: '1 1 0',
      minWidth: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--dim-space-600, 24px)',
    }}>
      <HeroPill label='กิจกรรม' value={staff.groupPolicyLabel || staff.groupPolicy} />
      <HeroPill label='กิจกรรมย่อย'      value={staff.subDivision} />
      <HeroPill label='แผนก'         value={staff.dept} />
    </div>

    {/* Right card — "เวลาตรวจโดยเฉลี่ย" · gray label · brand-green value */}
    <div style={{
      background: 'var(--surface-card-100, #FFFFFF)',
      borderRadius: 'var(--dim-radius-200, 8px)',
      padding: 'var(--dim-space-200, 8px) var(--dim-space-300, 12px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 0,
      flexShrink: 0,
    }}>
      <span style={{
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs, 12px)',
        fontWeight: 'var(--type-weight-regular, 400)',
        color: 'var(--text-neutral-default, #4D5358)',
        lineHeight: 1.5,
        whiteSpace: 'nowrap',
      }}>
        เวลาตรวจโดยเฉลี่ย
      </span>
      <span style={{
        fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
        fontSize: 'var(--type-size-lg, 18px)',
        fontWeight: 'var(--type-weight-regular, 400)',
        color: 'var(--text-brandPrimary-default, var(--brand-p700, #007549))',
        lineHeight: 1.5,
        whiteSpace: 'nowrap',
      }}>
        {staff.avgExamMin ?? 15} นาที
      </span>
    </div>
  </section>
);

const MonthNav = ({ year, month, onPrev, onNext, canPrev, canNext }) => {
  /* Slide chevron button — disabled at the editable window edges per
     Figma 51:17697 (only this month ↔ next month is navigable). Disabled
     state fades the border/icon and PressableButton kills the press
     transform via its built-in `disabled` branch. */
  const navBtnStyle = (enabled) => ({
    width: 'var(--dim-size-800, 40px)',
    height: 'var(--dim-size-800, 40px)',
    borderRadius: 'var(--dim-radius-200, 8px)',
    border: enabled
      ? 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimaryButton-tertiary, var(--brand-p200, #C5EDDA))'
      : 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
    background: 'var(--surface-brandPrimaryButton-quinary, #FFFFFF)',
    color: enabled
      ? 'var(--text-brandPrimary-default, var(--brand-p700, #007549))'
      : 'var(--text-neutral-disabled, #CBD5E1)',
    cursor: enabled ? 'pointer' : 'not-allowed',
    opacity: enabled ? 1 : 0.5,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  });
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      /* No internal padding per Figma 35:7314 — frame height = 40px from
         the chevron buttons alone. Bottom spacing between MonthNav and
         the next element comes from the parent section's gap (12px,
         space-300), giving the 12px bottom margin Figma expects. */
      padding: 0,
    }}>
      <PressableButton
        onClick={onPrev}
        disabled={!canPrev}
        aria-label='เดือนก่อน'
        style={navBtnStyle(canPrev)}
      >
        <Icon name='chevron-left' size={16} style={{ color: 'currentColor' }} />
      </PressableButton>
      <span style={{
        fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
        /* 18px per Figma 35:7316 — month label uses --type-size-lg
           (was xl/20px). Family + weight + color remain on brand. */
        fontSize: 'var(--type-size-lg, 18px)',
        fontWeight: 'var(--type-weight-regular, 400)',
        color: 'var(--text-navigation-title, var(--brand-p700, #007549))',
        lineHeight: 1.375,
      }}>
        {THAI_MONTHS[month]} {year + 543}
      </span>
      <PressableButton
        onClick={onNext}
        disabled={!canNext}
        aria-label='เดือนถัดไป'
        style={navBtnStyle(canNext)}
      >
        <Icon name='chevron-right' size={16} style={{ color: 'currentColor' }} />
      </PressableButton>
    </div>
  );
};

const PanelLabel = ({ children }) => (
  <span style={{
    fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
    fontSize: 'var(--type-size-base, 16px)',
    fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
    color: 'var(--text-topic-tertiary-title, #363B3F)',
    lineHeight: 1.5,
  }}>
    {children}
  </span>
);

/* Slider tone palette per Figma 35:7682. Each tone has bar/pill/border tokens.
   Tokens are not yet in src/index.css — fallback hex values aliased from the
   matching primitive palette steps (100 for bar, 500 for pill). */
const SLIDER_TONES = {
  sakura: {
    bar:    'var(--surface-slider-sakura-bar, #FFEDF3)',
    pill:   'var(--surface-slider-sakura-pill, #F5AFCA)',
    border: 'var(--border-slider-sakura, #F5AFCA)',
  },
  lavender: {
    bar:    'var(--surface-slider-lavender-bar, #EDE7FF)',
    pill:   'var(--surface-slider-lavender-pill, #C8B6FF)',
    border: 'var(--border-slider-lavender, #C8B6FF)',
  },
  indigo: {
    bar:    'var(--surface-slider-indigo-bar, #EEF2FF)',
    pill:   'var(--surface-slider-indigo-pill, #818CF8)',
    border: 'var(--border-slider-indigo, #818CF8)',
  },
};

/* Slider — draggable when `onChange` is supplied (โรงพยาบาล / ออนไลน์),
   read-only when omitted (พิเศษ/ฉุกเฉิน — value derives from the other two).
   Pointer events use setPointerCapture so the drag survives the cursor
   leaving the track. `max` caps the writable range — used by the parent
   to enforce that `hospital + online ≤ 100` (i.e. special ≥ 0).

   Smooth interactivity (Figma 35:7682 hover spec):
   - Knob enlarges 20 → 24px on hover/drag with a soft brand-tinted ring
   - Track grows 8 → 10px on hover so the user can tell it's hot
   - Visual properties (size, shadow, border, track height) transition
     150ms; position properties (`left`/`width`) stay immediate so the
     knob locks to the cursor during drag instead of lagging behind. */
const Slider = ({ label, value, tone, onChange, max = 100 }) => {
  const t = SLIDER_TONES[tone] || SLIDER_TONES.indigo;
  const trackRef = useRef(null);
  /* Ref for the actual drag check (synchronous, used in pointermove);
     state for visual re-render. Keeping both avoids the closure race
     where the first pointermove right after pointerdown still sees the
     pre-update state. */
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState(false);
  const readOnly = !onChange;
  const enlarged = !readOnly && (hover || dragging);

  const commitFromClientX = (clientX) => {
    const track = trackRef.current;
    if (!track || readOnly) return;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = (clientX - rect.left) / rect.width;
    const next = Math.round(Math.max(0, Math.min(max, ratio * 100)));
    if (next !== value) onChange(next);
  };

  const onPointerDown = (e) => {
    if (readOnly) return;
    draggingRef.current = true;
    setDragging(true);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
    commitFromClientX(e.clientX);
  };
  const onPointerMove = (e) => {
    if (!draggingRef.current) return;
    commitFromClientX(e.clientX);
  };
  const onPointerUp = (e) => {
    draggingRef.current = false;
    setDragging(false);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) { /* noop */ }
  };

  /* Per user direction: only the knob's dimensions animate on hover/drag.
     Track height and knob border stay constant — no track growth, no halo
     ring. Shadow stays at the resting drop-shadow always. */
  const knobSize = enlarged ? 'var(--dim-size-500, 24px)' : 'var(--dim-size-400, 20px)';

  return (
    <div style={{
      flex: '1 1 0',
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--dim-space-200, 8px)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm, 14px)',
          fontWeight: 'var(--type-weight-regular, 400)',
          color: 'var(--text-list-default, #4D5358)',
        }}>
          {label}
        </span>
        <span style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm, 14px)',
          fontWeight: 'var(--type-weight-medium, 500)',
          color: 'var(--text-list-default, #4D5358)',
        }}>
          {value}%
        </span>
      </div>
      {/* Outer wrapper widens the pointer hit-area to cover the knob's
          enlarged hover ring without making the visual track taller. The
          negative top/bottom margins keep the surrounding layout flow
          unchanged (no extra vertical space between sliders). */}
      <div
        onPointerEnter={() => { if (!readOnly) setHover(true); }}
        onPointerLeave={() => setHover(false)}
        style={{
          position: 'relative',
          paddingTop: 'var(--dim-space-300, 12px)',
          paddingBottom: 'var(--dim-space-300, 12px)',
          marginTop: 'calc(-1 * var(--dim-space-300, 12px))',
          marginBottom: 'calc(-1 * var(--dim-space-300, 12px))',
        }}
      >
        <div
          ref={trackRef}
          role={readOnly ? undefined : 'slider'}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={value}
          aria-label={label}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            position: 'relative',
            height: 'var(--dim-size-100, 8px)',
            borderRadius: 'var(--dim-radius-full, 9999px)',
            background: t.bar,
            cursor: readOnly ? 'default' : (dragging ? 'grabbing' : 'pointer'),
            touchAction: 'none',
          }}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: `${value}%`,
            background: t.pill,
            borderRadius: 'var(--dim-radius-full, 9999px)',
            pointerEvents: 'none',
            /* No transition on width — pill must follow cursor 1:1 during
               drag, otherwise the fill visibly lags behind the knob. */
          }} />
          {/* Knob hidden in read-only mode per Figma 51:17697 — the static
              pill-on-bar visual carries the percentage on its own without
              the interactive thumb. */}
          {!readOnly && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: `${value}%`,
              transform: 'translate(-50%, -50%)',
              width: knobSize,
              height: knobSize,
              borderRadius: 'var(--dim-radius-full, 9999px)',
              background: 'var(--surface-card-100, #FFFFFF)',
              border: `var(--dim-stroke-200, 2px) solid ${t.border}`,
              boxShadow: 'var(--shadow-drop-bottom-100, 0 1px 4px rgba(100,116,139,0.10))',
              cursor: dragging ? 'grabbing' : 'grab',
              pointerEvents: 'none',
              /* Animate knob size ONLY — `left` stays immediate so the knob
                 locks to the cursor during drag instead of trailing behind. */
              transition: 'width 150ms ease, height 150ms ease',
            }} />
          )}
        </div>
      </div>
    </div>
  );
};

/* DATE_PILL_TOKENS — 24×24 circular pill at the top of every cell, one
   entry per state from MIH Design System "calendar date state" (Figma
   node 3592:1326). State priority resolved in CalendarCell below. */
const DATE_PILL_TOKENS = {
  default:  {
    bg:   'var(--surface-calendar-slot-date-default, #FFFFFF)',
    text: 'var(--text-calendar-slot-date-default, #4D5358)',
  },
  current:  {
    bg:   'var(--surface-calendar-slot-date-current, #08A768)',
    text: 'var(--text-calendar-slot-date-current, #FFFFFF)',
  },
  hover:    {
    bg:   'var(--surface-calendar-slot-date-hover, #E2F3EB)',
    text: 'var(--text-calendar-slot-date-hover, var(--brand-p700, #007549))',
  },
  selected: {
    bg:   'var(--surface-calendar-slot-date-selected, var(--brand-p700, #007549))',
    text: 'var(--text-calendar-slot-date-selected, #FFFFFF)',
  },
  disabled: {
    bg:   'var(--surface-calendar-slot-date-disabled, #FFFFFF)',
    text: 'var(--text-calendar-slot-date-disabled, #CBD5E1)',
  },
};

/* Date pill — 24×24 rounded-full per Figma node 3592:1326 with state-driven
   bg + text tokens. Renders inside every CalendarCell. */
const DatePill = ({ day, state }) => {
  const t = DATE_PILL_TOKENS[state] || DATE_PILL_TOKENS.default;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 'var(--dim-size-500, 24px)',
        height: 'var(--dim-size-500, 24px)',
        borderRadius: 'var(--dim-radius-full, 9999px)',
        background: t.bg,
        color: t.text,
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs, 12px)',
        fontWeight: 'var(--type-weight-medium, 500)',
        lineHeight: 1.5,
        flexShrink: 0,
        transition: 'background 150ms ease-out, color 150ms ease-out',
      }}
    >
      {day}
    </span>
  );
};

/* CalendarCell — Figma MIH-DS "calendar slot small" (node 3593:365) with
   the full state set: default / hover / current (today) / selected /
   disabled. Hover is tracked locally; current = the cell that matches
   today's date; selected = multi-day buffer or active assignment; disabled
   = past date or outside the editable window.

   State priority for the inner date pill:
     disabled > selected > hover > current > default
   Cell wrapper border/shadow follows: disabled > selected > hover > default
   (current does not affect the wrapper — only the date pill). */
const CalendarCell = ({ day, inMonth, isToday, holiday, shifts, appointmentCount, selected, disabled, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const interactive = !disabled && inMonth;

  /* Date pill state priority — `current` outranks `hover` per Figma
     135:20161: when the user hovers today's cell, the pill stays green
     (current) and the only added affordance is the cell's brand
     drop-shadow (applied separately below). Out-of-month overflow days
     fold into the `disabled` state per Figma 39:13082 — same faded date
     text + slot-disabled border treatment as past-date cells. */
  const pillState = !inMonth || disabled
    ? 'disabled'
    : selected
      ? 'selected'
      : isToday
        ? 'current'
        : hovered
          ? 'hover'
          : 'default';

  /* Cell wrapper styling per state (Figma "calendar slot small" 3593:365). */
  const cellBorder = !inMonth || disabled
    ? `var(--dim-stroke-100, 1px) solid var(--border-calendar-slot-slot-disabled, #F5F7F9)`
    : selected
      ? `var(--dim-stroke-200, 2px) solid var(--border-brandPrimary-default, var(--brand-p700, #007549))`
      : `var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, var(--brand-p100, #E2F3EB))`;

  /* Brand drop-shadow when interactive cell is hovered OR selected — gives
     it the "lifted" affordance per Figma's Brand Drop Shadow Bottom/200. */
  const cellShadow = inMonth && !disabled && (hovered || selected)
    ? 'var(--shadow-brand-drop-bottom-200, 0 1px 8px rgba(8,167,104,0.10), 0 1px 4px rgba(8,167,104,0.08))'
    : 'none';

  return (
    <button
      type='button'
      onClick={interactive ? onClick : undefined}
      disabled={!interactive}
      onMouseEnter={() => interactive && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        gap: 'var(--dim-space-150, 6px)',
        minHeight: 140,
        padding: 'var(--dim-space-300, 12px)',
        border: cellBorder,
        borderRadius: 'var(--dim-radius-200, 8px)',
        background: 'var(--surface-card-100, #FFFFFF)',
        boxShadow: cellShadow,
        color: inMonth
          ? 'var(--text-calendar-slot-date-default, #4D5358)'
          : 'var(--text-calendar-slot-slot-disabled, #CBD5E1)',
        cursor: interactive ? 'pointer' : 'default',
        textAlign: 'left',
        fontFamily: 'var(--type-family-body)',
        /* Smooth border + shadow transitions on hover/selection. */
        transition: 'border 150ms ease-out, box-shadow 150ms ease-out, background 150ms ease-out',
      }}
    >
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--dim-space-200, 8px)',
      }}>
        <DatePill day={day} state={pillState} />
        {holiday && inMonth && (
          <span style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs, 10px)',
            fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
            color: disabled
              ? 'var(--text-calendar-slot-slot-disabled, #CBD5E1)'
              : 'var(--text-calendar-slot-text, var(--brand-p700, #007549))',
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
          }}>
            {holiday}
          </span>
        )}
      </div>
      {/* Existing-appointment chip per Figma 52:22411 — teal "นัดหมาย"
          badge with count, surfaces cells that already have advance
          bookings so the user can spot them before changing slot duration
          (which would trigger the confirm-rescheduling popup 54:16508). */}
      {inMonth && !disabled && appointmentCount > 0 && (
        <ColorfulBadge
          style='teal'
          size='small'
          hierarchy='secondary'
          width='hug'
        >
          นัดหมาย {appointmentCount}
        </ColorfulBadge>
      )}
      {/* Assigned shift indicators — one ColorfulBadge per shift key,
          stacked vertically. Time subtitle only renders when a SINGLE
          shift is assigned (compact mode for multi-shift days). */}
      {shifts && shifts.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 'var(--dim-space-100, 4px)',
        }}>
          {shifts.map(key => {
            const meta = SHIFT_LOOKUP[key];
            if (!meta) return null;
            return (
              <div
                key={`shift-${key}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 'var(--dim-space-050, 2px)',
                }}
              >
                <ColorfulBadge
                  style={shiftBadgeStyle(meta.tone)}
                  size='small'
                  hierarchy='secondary'
                  width='hug'
                >
                  {meta.label}
                </ColorfulBadge>
                {shifts.length === 1 && meta.time && (
                  <span style={{
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-xs, 12px)',
                    fontWeight: 'var(--type-weight-regular, 400)',
                    color: 'var(--text-content-secondary, #565D6D)',
                    lineHeight: 1.4,
                    whiteSpace: 'nowrap',
                  }}>
                    {meta.time}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </button>
  );
};

/* Static holiday demo — first day of the displayed month shows the
   national holiday banner per Figma 35:7311 (e.g. วันแม่แห่งชาติ in สิงหาคม). */
/* Demo holiday matching Figma 35:7682 calendar snapshot (Aug 2026). */
const DEMO_HOLIDAYS = {
  '2026-08-01': 'วันมาฆบูชา',
};

/* Mock existing appointments per Figma 52:22411 — used to trigger the
   confirm popup (54:16508) whenever the user changes the slot duration
   (Stepper). One demo day in the next month carries 7 entries so the
   user can see the cascade table populated. Each entry: ISO date · time
   slot · staff (the appointment holder).
   Schedule date (cell.key) drives matching: cells whose date is in this
   map render an extra appointment chip on the calendar cell. */
const EXISTING_APPOINTMENTS = (() => {
  const d = new Date();
  /* Pin to the 10th of next month so the demo lands inside the editable
     window regardless of today's date. */
  const y = d.getFullYear();
  const m = d.getMonth() + 1; // next month
  const month = m > 11 ? 0 : m;
  const year = m > 11 ? y + 1 : y;
  const pad = (n) => String(n).padStart(2, '0');
  const dateKey = `${year}-${pad(month + 1)}-10`;
  const start = '08:00';
  const end15 = '08:15';
  return Array.from({ length: 7 }, (_, i) => ({
    id: `appt-${i + 1}`,
    cellKey: dateKey,
    patientName: 'สมชาย มั่นใจดี',
    patientAvatar: '/images/staff/staff-doctor-male-01.png',
    oldStart: start,
    oldEnd: end15,
  }));
})();

/* Thai full-month date formatter — "2 มิถุนายน 2569". Used for the date
   pill row at the top of the DutyPickerSheet body. */
function formatDatePill(key) {
  const [y, m, d] = key.split('-').map(Number);
  return `${d} ${THAI_MONTHS[m - 1]} ${y + 543}`;
}

/* DutyPickerSheet — centered modal popup per Figma 39:8250 ("Popup
   ExtraLarge"). Opens when:
   (a) single-mode click on a cell without an active chip → target = [cellKey], or
   (b) multi-mode "เลือกเวร" CTA → target = selectedDays buffer.

   UX: user picks ONE shift via single-select checkbox, then commits with
   "บันทึก". Day Off and the four shifts are mutually exclusive (single
   select), per Figma annotation. "ลบเวร" only appears when at least one
   target cell already carries an assigned shift. Close X + backdrop both
   dismiss without writing. */
/* Enter/exit animation timing for DutyPickerSheet. iOS-style ease for the
   sheet slide; standard ease for modal fade+scale. 300ms feels brisk yet
   readable; bumping past 350ms makes Save feel sluggish. */
const PICKER_ANIM_MS = 300;
const PICKER_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

const DutyPickerSheet = ({
  open,
  variant = 'modal',
  targets,
  dayShifts,
  /** TOR 1.6.1.6 — Day Off locked when any target day still has active appointments. */
  hasActiveAppointments = false,
  onSelect,
  onClear,
  onClose,
}) => {
  /* Multi-select state per Figma 39:9542 — array of selected shift keys.
     Day Off ('dayoff') and the four work shifts are mutually exclusive:
     · Day Off disabled (cannot be clicked) when ANY shift is checked
     · Day Off disabled when the day still has active appointment slots
     · Clicking a shift while Day Off is checked auto-clears Day Off */
  const [selectedShifts, setSelectedShifts] = useState([]);

  /* Animation state — keeps the sheet mounted during the exit transition
     so the user sees it slide down (or modal fade) before it disappears.
     · `mounted`  → true while the component should render at all
     · `visible`  → true when the sheet should be at its rest position;
                     false during enter (before first paint) or exit. */
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  /* When the modal opens, pre-select the existing shifts IFF every target
     cell shares the same set — otherwise leave the selection blank so the
     user makes an explicit choice. Targets/dayShifts only matter at the
     moment of open; further changes happen via the parent's onSelect. */
  useEffect(() => {
    if (!open || !targets || targets.length === 0) {
      setSelectedShifts([]);
      return;
    }
    const sets = targets.map(k => (dayShifts[k] || []).slice().sort());
    const first = sets[0];
    const allSame = first.length > 0 && sets.every(s =>
      s.length === first.length && s.every((v, i) => v === first[i])
    );
    const next = allSame ? first : [];
    /* Never pre-select Day Off when active appointments still block it. */
    setSelectedShifts(
      hasActiveAppointments ? next.filter((k) => k !== 'dayoff') : next,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hasActiveAppointments]);

  /* Mount + animation lifecycle:
     · open=true  → mount immediately, then flip `visible` to true on the
                    NEXT frame so the browser registers the rest position
                    after the initial off-screen layout (slide-up effect).
     · open=false → flip `visible` to false (slide-down) and unmount after
                    the transition finishes so the sheet's exit is seen. */
  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), PICKER_ANIM_MS);
    return () => clearTimeout(t);
  }, [open]);

  if (!mounted || !targets || targets.length === 0) return null;

  const anyAssigned = targets.some(k => (dayShifts[k] || []).length > 0);
  const canSave = selectedShifts.length > 0;
  const hasShifts = selectedShifts.some(k => k !== 'dayoff');

  /* Day Off disabled when:
     · any work shift is selected (Figma asymmetric mutex), OR
     · the day still has active appointment slots (cannot close the day). */
  const isOptionDisabled = (key) => (
    key === 'dayoff' && (hasShifts || hasActiveAppointments)
  );

  const handleSave = () => {
    if (!canSave) return;
    const next = hasActiveAppointments
      ? selectedShifts.filter((k) => k !== 'dayoff')
      : selectedShifts.slice();
    if (next.length === 0) return;
    onSelect(next);
  };

  const toggleShift = (key) => {
    if (isOptionDisabled(key)) return;
    setSelectedShifts(prev => {
      if (prev.includes(key)) {
        return prev.filter(k => k !== key);
      }
      if (key === 'dayoff') {
        /* Adding Day Off — defensive clear of any shifts (shouldn't be
           possible since Day Off is disabled when shifts are checked,
           but keeps state internally consistent). */
        return ['dayoff'];
      }
      /* Adding a shift — auto-clear Day Off if it was checked. */
      return [...prev.filter(k => k !== 'dayoff'), key];
    });
  };

  /* Variant switches the entire chrome: 'modal' (Figma 39:8250) = centered
     popup with vertical shift list; 'sheet' (Figma 39:12343) = bottom-
     anchored sheet with a 3-column grid of shifts. Both share the same
     header / body / footer markup — only positioning + shift-list layout
     differ. */
  const isSheet = variant === 'sheet';

  return (
    <div
      role='dialog'
      aria-modal={isSheet ? 'false' : 'true'}
      style={{
        position: 'fixed',
        /* Modal fills the viewport (and a backdrop scrim below); sheet
           sits as a strip pinned to the bottom edge so the rest of the
           page (calendar grid above) stays interactive. */
        inset: isSheet ? 'auto 0 0 0' : 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: isSheet ? 'column' : 'row',
        alignItems: isSheet ? 'stretch' : 'center',
        justifyContent: isSheet ? 'flex-end' : 'center',
        padding: isSheet ? 0 : 'var(--dim-space-400, 16px)',
        /* Container itself never blocks clicks in sheet variant — only
           the section card below opts back in with `pointerEvents: auto`,
           so clicks on the calendar passes straight through. */
        pointerEvents: isSheet ? 'none' : 'auto',
      }}
    >
      {/* Backdrop — semi-transparent dark scrim. Click dismisses. Omitted
          in 'sheet' variant per Figma 39:12343 — sheet is non-modal so
          the user can keep clicking calendar days to grow the selection.
          Backdrop fades in/out smoothly via opacity transition. */}
      {!isSheet && (
        <button
          type='button'
          onClick={onClose}
          aria-label='ปิด'
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            border: 0,
            padding: 0,
            cursor: 'pointer',
            opacity: visible ? 1 : 0,
            transition: `opacity ${PICKER_ANIM_MS}ms ease-out`,
          }}
        />
      )}

      {/* Card — switches shape between variants:
          · modal (39:8250)  520px / centered, all corners radius-500
          · sheet (39:12343) full-width / bottom, top corners radius-500
                              + brand drop-top shadow
          Animated transform:
          · sheet  slides up from translateY(100%) → 0 on enter and
                   reverses on exit (iOS-style ease).
          · modal  fades + scales 0.96 → 1 on enter; reverses on exit. */}
      <section
        style={{
          position: 'relative',
          width: isSheet ? '100%' : 520,
          maxWidth: isSheet ? '100%' : '90vw',
          maxHeight: isSheet ? '85vh' : '90vh',
          background: 'var(--surface-modal-default, #FFFFFF)',
          border: isSheet
            ? 0
            : 'var(--dim-stroke-100, 1px) solid var(--border-popover-grey, #E2E4E6)',
          borderTopLeftRadius: 'var(--dim-radius-500, 16px)',
          borderTopRightRadius: 'var(--dim-radius-500, 16px)',
          borderBottomLeftRadius: isSheet ? 0 : 'var(--dim-radius-500, 16px)',
          borderBottomRightRadius: isSheet ? 0 : 'var(--dim-radius-500, 16px)',
          boxShadow: isSheet
            ? 'var(--shadow-brand-drop-top-200, 0 -1px 8px rgba(8,167,104,0.10), 0 -1px 4px rgba(8,167,104,0.08))'
            : 'var(--shadow-drop-bottom-400, 0 4px 16px rgba(100,116,139,0.10), 0 16px 32px rgba(100,116,139,0.15))',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          /* Re-enable pointer events on the card so clicks on its content
             still work even when the outer container is set to ignore. */
          pointerEvents: 'auto',
          /* Enter / exit motion. Sheet slides; modal fades + scales. */
          transform: isSheet
            ? (visible ? 'translateY(0)' : 'translateY(100%)')
            : (visible ? 'scale(1)' : 'scale(0.96)'),
          opacity: isSheet ? 1 : (visible ? 1 : 0),
          transition: isSheet
            ? `transform ${PICKER_ANIM_MS}ms ${PICKER_EASE}`
            : `transform ${PICKER_ANIM_MS}ms ${PICKER_EASE}, opacity ${PICKER_ANIM_MS}ms ease-out`,
          willChange: 'transform, opacity',
        }}
      >
        {/* Title + Body — separated from footer by a hairline divider. */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--dim-space-400, 16px)',
          padding: 'var(--dim-space-600, 24px)',
          borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
          overflowY: 'auto',
        }}>
          {/* Header — title + subtitle (left) + close X (right). */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 'var(--dim-space-200, 8px)',
          }}>
            <div style={{
              flex: '1 1 0',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--dim-space-100, 4px)',
            }}>
              <span style={{
                fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
                fontSize: 'var(--type-size-base, 16px)',
                fontWeight: 'var(--type-weight-regular, 400)',
                color: 'var(--text-modal-text, #4D5358)',
                lineHeight: 1.5,
              }}>
                กำหนดเวร / วันหยุด
              </span>
              <span style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm, 14px)',
                fontWeight: 'var(--type-weight-medium, 500)',
                color: 'var(--text-modal-subtext, #ADB2B7)',
                lineHeight: 1.5,
              }}>
                เลือกเวรหรือวันหยุด
              </span>
            </div>
            <XCloseButton onClick={onClose} />
          </div>

          {/* Date pills — one indigo badge per target date. Wraps to
              next row when many days selected. Hidden in 'sheet' variant
              per Figma 39:12343 (body shows only the shift grid). */}
          {!isSheet && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 'var(--dim-space-200, 8px)',
            paddingRight: 'var(--dim-space-200, 8px)',
          }}>
            {targets.map(k => (
              <span
                key={`pill-${k}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 'var(--dim-size-600, 32px)',
                  minWidth: 40,
                  maxWidth: 224,
                  padding: 'var(--dim-space-100, 4px) var(--dim-space-300, 12px)',
                  borderRadius: 'var(--dim-radius-full, 9999px)',
                  background: 'var(--surface-colorfulbadge-indigo, #EEF2FF)',
                  color: 'var(--text-colorfulbadge-indigo, #4F46E5)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm, 14px)',
                  fontWeight: 'var(--type-weight-medium, 500)',
                  lineHeight: 1.5,
                  whiteSpace: 'nowrap',
                }}
              >
                {formatDatePill(k)}
              </span>
            ))}
          </div>
          )}

          {/* Shift list — multi-select via checkbox. Layout depends on
              variant: modal → single vertical column; sheet → 3-column
              grid with column-flow auto-placement (Figma 39:12343:
              row 1 = morning · evening · dayoff, row 2 = noon · oncall). */}
          <div style={isSheet ? {
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gridTemplateRows: 'repeat(2, auto)',
            gridAutoFlow: 'column',
            columnGap: 'var(--dim-space-250, 10px)',
            rowGap: 'var(--dim-space-200, 8px)',
          } : {
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--dim-space-200, 8px)',
          }}>
            {SHIFT_TYPES.map(s => {
              const checked = selectedShifts.includes(s.key);
              const rowDisabled = isOptionDisabled(s.key);
              const dayOffBlockedByAppointments = (
                s.key === 'dayoff' && hasActiveAppointments && !hasShifts
              );
              return (
                <PressableButton
                  key={s.key}
                  onClick={() => toggleShift(s.key)}
                  disabled={rowDisabled}
                  aria-pressed={checked}
                  aria-disabled={rowDisabled || undefined}
                  title={dayOffBlockedByAppointments
                    ? 'ไม่สามารถตั้งวันหยุดได้ เนื่องจากยังมีนัดหมายที่ Active อยู่'
                    : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--dim-space-200, 8px)',
                    minHeight: 48,
                    padding: 'var(--dim-space-200, 8px) var(--dim-space-300, 12px)',
                    background: 'var(--surface-card-100, #FFFFFF)',
                    border: 'var(--dim-stroke-200, 2px) solid var(--border-modal-cardborder, #F5F6FA)',
                    borderRadius: 'var(--dim-radius-400, 12px)',
                    textAlign: 'left',
                    cursor: rowDisabled ? 'not-allowed' : 'pointer',
                    opacity: rowDisabled ? 0.5 : 1,
                  }}
                >
                  {/* BadgeWrapper — fixed 112px so badges line up across rows. */}
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    width: 112,
                    flexShrink: 0,
                  }}>
                    <ColorfulBadge
                      style={shiftBadgeStyle(s.tone)}
                      size='small'
                      hierarchy='secondary'
                      width='hug'
                    >
                      {s.label}
                    </ColorfulBadge>
                  </span>
                  <span style={{
                    flex: '1 1 0',
                    minWidth: 0,
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm, 14px)',
                    fontWeight: 'var(--type-weight-regular, 400)',
                    color: 'var(--text-list-default, #4D5358)',
                    lineHeight: 1.5,
                  }}>
                    {s.time || s.label}
                  </span>
                  <Checkbox
                    checked={checked}
                    onChange={() => toggleShift(s.key)}
                    disabled={rowDisabled}
                  />
                </PressableButton>
              );
            })}
          </div>
        </div>

        {/* Footer — ลบเวร (only when targets have assignments) +
            บันทึก (disabled until a shift is selected). */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 'var(--dim-space-300, 12px)',
          padding: 'var(--dim-space-600, 24px)',
        }}>
          {anyAssigned && (
            <NeutralSubdueButton onClick={onClear}>ลบเวร</NeutralSubdueButton>
          )}
          <BrandButton onClick={handleSave} disabled={!canSave}>บันทึก</BrandButton>
        </div>
      </section>
    </div>
  );
};

/* ConfirmAppointmentPopup — Figma 54:16508. Shown when the user changes
   slot duration (Stepper) while one or more cells in the editable months
   carry advance appointments. Lists every affected appointment with its
   original date/time and the recomputed new time slot. Footer "ตกลง"
   commits the new slotMin; "ล้างค่า" / close X reverts. */
const ConfirmAppointmentPopup = ({ open, appointments, oldSlotMin, newSlotMin, onConfirm, onCancel }) => {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  /* Per-row date + time selection state — keyed by appointment id.
     Each row defaults to the originally affected date + the recomputed
     new time slot. Users can pick alternates from each Select. */
  const [rowEdits, setRowEdits] = useState({});

  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), PICKER_ANIM_MS);
    return () => clearTimeout(t);
  }, [open]);

  if (!mounted || !appointments || appointments.length === 0) return null;

  /* Recompute end-of-slot from new slot duration. Example: old 08:00-08:15
     (15-min slot) + newSlotMin=8 → new end = 08:00 + 8 min = 08:08. */
  const computeNewEnd = (start, mins) => {
    const [h, m] = start.split(':').map(Number);
    const total = h * 60 + m + (Number(mins) || 0);
    const nh = Math.floor(total / 60) % 24;
    const nm = total % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
  };

  const formatDateKey = (key) => {
    const [y, m, d] = key.split('-').map(Number);
    return `${d} ${THAI_MONTHS[m - 1]} ${y + 543}`;
  };

  return (
    <div
      role='dialog'
      aria-modal='true'
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 55,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--dim-space-400, 16px)',
      }}
    >
      <button
        type='button'
        onClick={onCancel}
        aria-label='ปิด'
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          border: 0,
          padding: 0,
          cursor: 'pointer',
          opacity: visible ? 1 : 0,
          transition: `opacity ${PICKER_ANIM_MS}ms ease-out`,
        }}
      />
      <section
        style={{
          position: 'relative',
          width: 920,
          maxWidth: '95vw',
          maxHeight: '90vh',
          background: 'var(--surface-modal-default, #FFFFFF)',
          border: 'var(--dim-stroke-100, 1px) solid var(--border-popover-grey, #E2E4E6)',
          borderRadius: 'var(--dim-radius-500, 16px)',
          boxShadow: 'var(--shadow-drop-bottom-400, 0 4px 16px rgba(100,116,139,0.10), 0 16px 32px rgba(100,116,139,0.15))',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          pointerEvents: 'auto',
          transform: visible ? 'scale(1)' : 'scale(0.96)',
          opacity: visible ? 1 : 0,
          transition: `transform ${PICKER_ANIM_MS}ms ${PICKER_EASE}, opacity ${PICKER_ANIM_MS}ms ease-out`,
        }}
      >
        {/* Title + Body */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--dim-space-400, 16px)',
          padding: 'var(--dim-space-600, 24px)',
          overflowY: 'auto',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 'var(--dim-space-200, 8px)',
          }}>
            <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-100, 4px)' }}>
              <span style={{
                fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
                fontSize: 'var(--type-size-base, 16px)',
                fontWeight: 'var(--type-weight-regular, 400)',
                color: 'var(--text-modal-text, #4D5358)',
                lineHeight: 1.5,
              }}>
                ยืนยันเวลานัดหมายล่วงหน้าของผู้รับบริการ
              </span>
              <span style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm, 14px)',
                fontWeight: 'var(--type-weight-medium, 500)',
                color: 'var(--text-modal-subtext, #ADB2B7)',
                lineHeight: 1.5,
              }}>
                การปรับเวลาใน Slot จะส่งผลต่อเวลานัดหมายของผู้รับบริการดังนี้
              </span>
            </div>
            <XCloseButton onClick={onCancel} />
          </div>

          {/* Info banner — phone reminder */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--dim-space-200, 8px)',
            padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)',
            background: 'var(--surface-info-quaternary, #EFF6FF)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-info-tertiary, #BFDBFE)',
            borderRadius: 'var(--dim-radius-200, 8px)',
          }}>
            <Icon name='info' size={20} style={{ color: 'var(--text-info-default, #1D4ED8)', flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-050, 2px)' }}>
              <span style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm, 14px)',
                fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                color: 'var(--text-info-default, #1D4ED8)',
                lineHeight: 1.5,
              }}>
                กรุณาโทรแจ้งผู้รับบริการ
              </span>
              <span style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs, 12px)',
                fontWeight: 'var(--type-weight-regular, 400)',
                color: 'var(--text-info-default, #1D4ED8)',
                lineHeight: 1.5,
              }}>
                กรุณาโทรแจ้งผู้รับบริการ หากเวลานัดหมายมีการเปลี่ยนแปลง
              </span>
            </div>
          </div>

          {/* Table */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--surface-card-200, #FDFDFD)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
            borderRadius: 'var(--dim-radius-200, 8px)',
            overflow: 'hidden',
          }}>
            {/* Header row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '180px 1fr 28px 1fr',
              gap: 'var(--dim-space-300, 12px)',
              padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)',
              borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
              fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
              fontSize: 'var(--type-size-sm, 14px)',
              fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
              color: 'var(--text-table-title, var(--brand-p800, #004C31))',
              background: 'var(--surface-table-header, var(--brand-p50, #F4FBF8))',
            }}>
              <span>ผู้รับบริการ</span>
              <span>วันและเวลาเดิม</span>
              <span />
              <span>วันและเวลาใหม่</span>
            </div>
            {/* Rows */}
            {appointments.map((appt) => {
              const newEnd = computeNewEnd(appt.oldStart, newSlotMin);
              const dateLabel = formatDateKey(appt.cellKey);
              return (
                <div
                  key={appt.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '180px 1fr 28px 1fr',
                    gap: 'var(--dim-space-300, 12px)',
                    padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)',
                    borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
                    alignItems: 'center',
                    background: 'var(--surface-card-100, #FFFFFF)',
                  }}
                >
                  {/* Patient */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)' }}>
                    <span style={{
                      width: 'var(--dim-size-700, 32px)',
                      height: 'var(--dim-size-700, 32px)',
                      borderRadius: 'var(--dim-radius-full, 9999px)',
                      background: 'var(--brand-p100, #E2F3EB)',
                      backgroundImage: `url(${appt.patientAvatar})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      flexShrink: 0,
                    }} />
                    <span style={{
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-sm, 14px)',
                      color: 'var(--text-list-default, #4D5358)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {appt.patientName}
                    </span>
                  </div>
                  {/* Old date + time — 24px (space-600) between the two
                      pieces of info per Figma 54:16508 layout. */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--dim-space-600, 24px)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm, 14px)',
                    color: 'var(--text-list-default, #4D5358)',
                  }}>
                    <span>{dateLabel}</span>
                    <span>{appt.oldStart} - {appt.oldEnd}</span>
                  </div>
                  {/* Forward-arrow between old + new times — Material
                      Symbols `arrow_forward` per Figma 54:16508 row spec.
                      `chevron-right` was previously used but is the wrong
                      glyph for "X → Y" transitions. */}
                  <Icon
                    name='arrow_forward'
                    size={20}
                    style={{ color: 'var(--text-content-secondary, #565D6D)' }}
                  />
                  {/* New date + time — two Select dropdowns with 12px gap
                      per Figma (file MIH-Popup, node 246:10210). The date
                      picker stays on the original day by default; the
                      time picker defaults to the recomputed slot derived
                      from the new slotMin. */}
                  {(() => {
                    const edit = rowEdits[appt.id] || {};
                    /* Parse cellKey 'YYYY-MM-DD' → Date object for the
                       DatePicker `value` prop. Avoid 'YYYY-MM-DD'.parse
                       directly (timezone-shifts to UTC); construct via
                       (y, m-1, d) so the date stays local. */
                    const [cy, cm, cd] = appt.cellKey.split('-').map(Number);
                    const defaultDate = new Date(cy, cm - 1, cd);
                    const dateValue = edit.date instanceof Date ? edit.date : defaultDate;
                    const defaultTimeKey = `${appt.oldStart}-${newEnd}`;
                    const timeValue = edit.time || defaultTimeKey;
                    /* Generate ~10 successive slots of `newSlotMin` minutes
                       starting from oldStart so the time dropdown is rich
                       enough to pick a fresh slot for the patient. The
                       first row is "ทั้งวัน" (all-day) per Figma 154:22012. */
                    const timeOptions = [{ value: 'all-day', label: 'ทั้งวัน' }];
                    const [sh, sm] = appt.oldStart.split(':').map(Number);
                    const startMin = sh * 60 + sm;
                    const fmt = (t) => `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
                    for (let i = 0; i < 10; i++) {
                      const a = startMin + i * newSlotMin;
                      const b = a + newSlotMin;
                      const slot = `${fmt(a)}-${fmt(b)}`;
                      timeOptions.push({ value: slot, label: `${fmt(a)} - ${fmt(b)}` });
                    }
                    const setEdit = (patch) => setRowEdits(prev => ({
                      ...prev,
                      [appt.id]: { ...(prev[appt.id] || {}), ...patch },
                    }));
                    return (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--dim-space-300, 12px)',
                      }}>
                        <div style={{ flex: '1 1 0', minWidth: 0 }}>
                          {/* Date picker — opens a single-month calendar
                              popover (Figma 154:21031). Today is the min
                              date so users can't pick a date in the past. */}
                          <DatePicker
                            value={dateValue}
                            onChange={(d) => setEdit({ date: d })}
                            size='lg'
                            minDate={new Date()}
                            showLabel={false}
                            showHelperText={false}
                            showLeadingIcon={false}
                          />
                        </div>
                        <div style={{ flex: '1 1 0', minWidth: 0 }}>
                          {/* Time dropdown — vertical list of slots in
                              `newSlotMin` increments per Figma 154:22012.
                              "ทั้งวัน" is the always-first option. */}
                          <Select
                            value={timeValue}
                            onChange={(v) => setEdit({ time: v })}
                            options={timeOptions}
                            size='lg'
                            searchable={false}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 'var(--dim-space-300, 12px)',
          padding: 'var(--dim-space-400, 16px) var(--dim-space-600, 24px)',
          borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
        }}>
          <NeutralSubdueButton onClick={onCancel}>ล้างค่า</NeutralSubdueButton>
          <BrandButton
            onClick={() => onConfirm(newSlotMin)}
            disabled={newSlotMin === oldSlotMin}
          >
            ตกลง
          </BrandButton>
        </div>
      </section>
    </div>
  );
};

const ScheduleEditorPage = () => {
  const history = useHistory();
  const { id } = useParams();
  const staffId = Number(id);

  const staff = useMemo(() => {
    const list = buildScheduleStaff();
    return list.find(s => s.id === staffId) || list[0];
  }, [staffId]);

  /* Editable + viewable windows per Figma 51:17697:
     · EDITABLE  = [thisMonth, nextMonth]      — cells, chips, slot-mix
     · VIEWABLE  = [unlimited past, today+6mo] — slide-only, read-only
     Slide outside the viewable window is blocked at MonthNav. Months that
     are slide-reachable but outside the editable window render in the
     same read-only treatment as past months (Stepper → text, Select →
     inline, slider knob hidden). `viewEndExclusive` is the exclusive
     forward cap — cursor can land at most 6 months ahead of today. */
  const editableWindow = useMemo(() => {
    const d = new Date();
    const todayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const thisMonthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const nextMonthStart = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    /* `+7` so that cursor can include the month that's 6 ahead of today. */
    const viewEndExclusive = new Date(d.getFullYear(), d.getMonth() + 7, 1);
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return { todayStart, thisMonthStart, nextMonthStart, viewEndExclusive, todayStr };
  }, []);

  /* Default cursor lands on the upcoming month — that's the primary
     scheduling target per the Figma workflow. User can step back to the
     current month but not into the past or beyond next month. */
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 1);
  });
  const [slotMin, setSlotMin] = useState(staff?.avgExamMin ?? 15);
  /* Pending slot-mix change awaiting user confirmation per Figma
     54:16508. When the user changes the Stepper while advance
     appointments exist, we hold the new value here and show the popup
     so they can review the cascading impact before committing. */
  const [pendingSlotMin, setPendingSlotMin] = useState(null);
  const [bookingType, setBookingType] = useState('hospital');
  /* Slider values are the source of truth — `bookingType` is derived from
     them via `detectBookingPreset()` on every drag. Picking a preset from
     the dropdown does the inverse (rewrites `sliderMix` to that preset's
     fixed ratio). Initialized in sync with the default `bookingType`. */
  const [sliderMix, setSliderMix] = useState(() => bookingMix('hospital'));
  const [multiDay, setMultiDay] = useState(false);
  /* Assigned shifts keyed by ISO date — `{ '2026-08-04': 'morning' }`. */
  const [dayShifts, setDayShifts] = useState({});
  /* Phase 3 — multi-day buffer (array of cell keys). Filled when `multiDay`
     mode is on and the user clicks cells; cleared when they apply a chip or
     leave multi-day mode. */
  const [selectedDays, setSelectedDays] = useState([]);
  /* Phase 3 — DutyPickerSheet target. `null` → sheet closed; array of cell
     keys → sheet open, applying the picked shift to all of them. Opens when:
     (a) single-mode click on a cell without an active chip, or
     (b) multi-mode "เลือกเวร" CTA after the buffer has at least one cell. */
  const [pickerTarget, setPickerTarget] = useState(null);

  /* Toggling multi-day OFF discards the in-progress selection — otherwise
     ghost-selected cells would silently apply on the next chip click. */
  useEffect(() => {
    if (!multiDay) setSelectedDays([]);
  }, [multiDay]);

  const grid = useMemo(
    () => buildMonthGrid(cursor.getFullYear(), cursor.getMonth(), 'sunday'),
    [cursor],
  );

  /* Shift counts for the summary strip — counts only cells that belong
     to the cursor's month. Each cell can carry multiple shifts (Figma
     39:9542 multi-select), so iterate the shift array per cell. */
  const shiftCounts = useMemo(() => {
    const counts = {};
    SHIFT_TYPES.forEach(s => { counts[s.key] = 0; });
    grid.forEach(cell => {
      if (!cell.inMonth) return;
      const shifts = dayShifts[cell.key] || [];
      shifts.forEach(shift => {
        if (counts[shift] !== undefined) counts[shift] += 1;
      });
    });
    return counts;
  }, [grid, dayShifts]);

  /* Editable-window flags — derived from the cursor + memoized window.
     · `canPrev` is always true: user can slide back into past months for
       VIEWING (cells render read-only via the cursorOutsideWindow flag).
     · `canNext` is false past the next-month boundary: forward slide
       beyond the editable window stays blocked (per Figma 51:17697 —
       "dates beyond the next month are disabled").
     · `cursorOutsideWindow` flips read-only for past months — disables
       every cell, the chip toolbar, and the Save button, while still
       letting the user view whatever shifts were already scheduled. */
  const { canPrev, canNext, cursorOutsideWindow, canEditMix } = useMemo(() => {
    const cursorM = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    return {
      /* Backward slide is unlimited — past months are view-only. */
      canPrev: true,
      /* Forward slide caps at +6 months from today (inclusive). The
         exclusive boundary (`viewEndExclusive` = month+7 from today)
         keeps the cursor inside the viewable window. */
      canNext: cursorM < editableWindow.viewEndExclusive,
      /* Read-only treatment per Figma 51:17697 applies ONLY to past
         months. Current month allows cell-level editing for future
         dates (past dates of the same month still disabled via
         per-cell `cellPast`). Future months (next + 2–6 ahead) are
         fully editable. The variable name is kept for clarity even
         though it now strictly means "past month". */
      cursorOutsideWindow: cursorM < editableWindow.thisMonthStart,
      /* Slot-mix controls (Stepper + Select + 3 Sliders) are editable
         for ANY month that hasn't started yet — next month + all
         further-ahead months. Past + current month keep the read-only
         layout to protect already-booked appointments from a mid-month
         config change. */
      canEditMix: cursorM >= editableWindow.nextMonthStart,
    };
  }, [cursor, editableWindow]);

  const onPrev = () => {
    if (!canPrev) return;
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  };
  const onNext = () => {
    if (!canNext) return;
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
  };
  const onBack = () => history.push('/schedule');

  /* Picking a preset from the dropdown rewrites the slider mix. Picking
     `custom` keeps the slider mix where it is — the user is signalling
     "I'll drive the sliders myself", not "reset". */
  const onBookingTypeChange = (val) => {
    setBookingType(val);
    const opt = BOOKING_TYPE_OPTIONS.find(o => o.value === val);
    if (opt && opt.mix) setSliderMix(opt.mix);
  };

  /* Stepper change interceptor per Figma 54:16508 — if any advance
     appointments live inside the editable window, hold the new value in
     `pendingSlotMin` and show the confirm popup. Without advance
     appointments, commit immediately. */
  const affectedAppointments = EXISTING_APPOINTMENTS.filter(a => a.cellKey >= editableWindow.todayStr);
  const onSlotMinChange = (next) => {
    if (next === slotMin) return;
    if (affectedAppointments.length === 0) {
      setSlotMin(next);
      return;
    }
    setPendingSlotMin(next);
  };
  const onConfirmSlotMin = (next) => {
    setSlotMin(next);
    setPendingSlotMin(null);
  };
  const onCancelSlotMin = () => setPendingSlotMin(null);

  /* Dragging slider 1 (โรงพยาบาล) or slider 2 (ออนไลน์) recomputes the
     other side so the three values still sum to 100. The pair is clamped
     such that hospital + online ≤ 100 (i.e. special ≥ 0). After updating,
     auto-detect which preset (if any) matches — falls through to `custom`
     when the user has drifted off every preset. */
  const onHospitalChange = (next) => {
    setSliderMix(prev => {
      const online = prev[1];
      const hospital = Math.max(0, Math.min(100 - online, next));
      const special = 100 - hospital - online;
      const mix = [hospital, online, special];
      setBookingType(detectBookingPreset(mix));
      return mix;
    });
  };
  const onOnlineChange = (next) => {
    setSliderMix(prev => {
      const hospital = prev[0];
      const online = Math.max(0, Math.min(100 - hospital, next));
      const special = 100 - hospital - online;
      const mix = [hospital, online, special];
      setBookingType(detectBookingPreset(mix));
      return mix;
    });
  };

  /* Cell click — single source of truth for opening the picker. The legacy
     "active chip" mode is gone (chip strip removed); every shift assignment
     now routes through the DutyPickerSheet.
     · multiDay ON  → toggle the cell in `selectedDays` buffer. Bulk apply
                      happens via the "เลือกเวร" CTA which opens the picker
                      with the whole buffer as target.
     · multiDay OFF → open the DutyPickerSheet for that single cell. */
  const onCellClick = (cellKey) => {
    if (cursorOutsideWindow) return;
    if (cellKey < editableWindow.todayStr) return;

    if (multiDay) {
      setSelectedDays(prev =>
        prev.includes(cellKey)
          ? prev.filter(k => k !== cellKey)
          : [...prev, cellKey]
      );
      return;
    }

    setPickerTarget([cellKey]);
  };

  /* Resolve commit targets — in single-day mode the picker comes from
     `pickerTarget`, in multi-day mode it comes from `selectedDays` (the
     bottom-sheet variant auto-opens off the buffer). Both handlers below
     must consult both sources, otherwise multi-day Save / Clear no-op. */
  const resolvePickerTargets = () => {
    if (pickerTarget !== null && pickerTarget.length > 0) return pickerTarget;
    if (selectedDays.length > 0) return selectedDays;
    return null;
  };

  /* DutyPickerSheet → user picked a set of shifts. Apply to every target
     cell, then dismiss the sheet (closes both single-day pickerTarget and
     multi-day selectedDays buffer so the sheet's `open` prop flips false
     → smooth slide-down animation). `shiftKeys` is an array per Figma
     39:9542 multi-select. */
  const onPickerSelect = (shiftKeys) => {
    const targets = resolvePickerTargets();
    if (!targets) return;
    const safeKeys = Array.isArray(shiftKeys) ? shiftKeys.slice() : [shiftKeys];
    setDayShifts(prev => {
      const next = { ...prev };
      targets.forEach(k => { next[k] = safeKeys; });
      return next;
    });
    setPickerTarget(null);
    setSelectedDays([]);
  };

  /* DutyPickerSheet → "ลบเวร" cleared the cell(s). Same dismiss flow. */
  const onPickerClear = () => {
    const targets = resolvePickerTargets();
    if (!targets) return;
    setDayShifts(prev => {
      const next = { ...prev };
      targets.forEach(k => { delete next[k]; });
      return next;
    });
    setPickerTarget(null);
    setSelectedDays([]);
  };

  /* Close — clears whichever path opened the picker. In multi-day mode the
     sheet auto-opens off `selectedDays.length > 0`, so closing must clear
     that buffer too; otherwise the sheet would immediately reappear. */
  const onPickerClose = () => {
    setPickerTarget(null);
    if (multiDay) setSelectedDays([]);
  };

  /* Multi-day picker visibility derives from the buffer per Figma 39:12343
     annotation ("sheet shown when ≥1 item selected, hidden when nothing").
     Combined with the single-day `pickerTarget`, gives one open flag and a
     resolved targets array passed down to DutyPickerSheet. */
  const pickerOpen = pickerTarget !== null || (multiDay && selectedDays.length > 0);
  const pickerTargets = pickerTarget !== null ? pickerTarget : selectedDays;
  const pickerHasActiveAppointments = (pickerTargets || []).some((key) => (
    EXISTING_APPOINTMENTS.some((a) => a.cellKey === key)
  ));
  const pickerVariant = multiDay && pickerTarget === null ? 'sheet' : 'modal';

  /* Success toast + navigation timing. After "บันทึก" we want the user
     to see the toast briefly before the page navigates away — otherwise
     the success feedback flashes off-screen immediately. */
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('สร้างตารางเวรสำเร็จ');

  /* `isDirty` per Figma 16:54432 footer annotation — "remains disabled
     if no changes have been made". Save + draft buttons should both
     reflect whether the user has touched anything since mount. Any
     change to dayShifts / slotMin / bookingType / sliderMix counts as a
     dirty edit. */
  const initialSlotRef = useRef(slotMin);
  const initialBookingTypeRef = useRef(bookingType);
  const initialSliderMixRef = useRef(sliderMix);
  const isDirty =
    Object.keys(dayShifts).length > 0 ||
    slotMin !== initialSlotRef.current ||
    bookingType !== initialBookingTypeRef.current ||
    sliderMix.some((v, i) => v !== initialSliderMixRef.current[i]);

  /* Toast → navigate flow. Show the toast immediately, then push back to
     the list page after the toast's read time (~1.2s) so the user reads
     the success message before the route change happens. */
  const commitAndExit = (message) => {
    // eslint-disable-next-line no-console
    console.log('Save schedule', { staffId, month: cursor, dayShifts, slotMin, bookingType, sliderMix });
    setToastMessage(message);
    setToastOpen(true);
    setTimeout(() => history.push('/schedule'), 1200);
  };

  const onSave = () => {
    if (!isDirty) return;
    commitAndExit('สร้างตารางเวรสำเร็จ');
  };
  const onSaveDraft = () => {
    if (!isDirty) return;
    commitAndExit('บันทึกร่างสำเร็จ');
  };
  const onCancel = () => {
    setDayShifts({});
    history.push('/schedule');
  };

  if (!staff) return null;

  return (
    <ClinicFilterProvider>
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'var(--background-screen-brand-100, var(--brand-p50, #F4FBF8))',
        fontFamily: 'var(--type-family-body)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        boxSizing: 'border-box',
      }}
    >
      <ScheduleSidebar activeKey='schedule' />

      <div style={{
        flex: '1 1 auto',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
      }}>
        <Header
          brandTitle='ระบบจัดตารางเวร'
          breadcrumb={['จัดการตารางเวร', 'แก้ไขตารางเวร']}
          standalone={false}
        />

        {/* Combined hero panel (Figma 21:12395) — back-row + hero gradient
            sit INSIDE one white panel with shared bottom border + shadow. */}
        <div style={{
          background: 'var(--surface-card-100, #FFFFFF)',
          borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
          boxShadow: 'var(--shadow-brand-drop-bottom-100, 0 1px 2px rgba(8,167,104,0.08))',
          padding: 'var(--dim-space-300, 12px) var(--dim-space-600, 24px) var(--dim-space-400, 16px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--dim-space-300, 12px)',
        }}>
          <BackRow onBack={onBack} />
          <HeroCard staff={staff} />
        </div>

        <main style={{
          flex: '1 1 auto',
          minWidth: 0,
          padding: 'var(--dim-space-600, 24px)',
          paddingBottom: 'var(--dim-size-1700, 80px)', /* leave room for sticky action bar */
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--dim-space-600, 24px)',
        }}>

          <section style={{
            background: 'var(--surface-card-100, #FFFFFF)',
            borderRadius: 'var(--dim-radius-500, 16px)',
            boxShadow: 'var(--shadow-brand-drop-bottom-200, 0 1px 4px rgba(8,167,104,0.10), 0 1px 2px rgba(8,167,104,0.08))',
            padding: 'var(--dim-space-600, 24px)',
            display: 'flex',
            flexDirection: 'column',
            /* Figma 35:7682 — main card content uses space-300 (12px) gap
               between MonthNav · divider · time+booking · chip row · calendar. */
            gap: 'var(--dim-space-300, 12px)',
          }}>
            <MonthNav
              year={cursor.getFullYear()}
              month={cursor.getMonth()}
              onPrev={onPrev}
              onNext={onNext}
              canPrev={canPrev}
              canNext={canNext}
            />

            {/* Hairline divider between Month nav and panels (Figma). */}
            <div style={{
              height: 'var(--dim-stroke-100, 1px)',
              width: '100%',
              background: 'var(--border-neutral-quaternary, #F4F5F5)',
            }} />

            {/* Time + Booking row — panels styled per Figma 35:7682:
                bg surface-card-200 · 1px neutral-quaternary border · 24px pad · 16px radius */}
            <div style={{ display: 'flex', gap: 'var(--dim-space-600, 24px)', alignItems: 'stretch' }}>
              <div style={{
                flex: '0 0 256px',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--dim-space-400, 16px)',
                padding: 'var(--dim-space-600, 24px)',
                background: 'var(--surface-card-200, #FDFDFD)',
                border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
                borderRadius: 'var(--dim-radius-500, 16px)',
              }}>
                <PanelLabel>ระยะเวลาตรวจ</PanelLabel>
                {canEditMix ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)' }}>
                    {/* step=1 per Figma 35:7682 — user adjusts minutes per slot
                        by ±1 each tap. Range stays at 5–120 min. */}
                    <Stepper value={slotMin} onChange={onSlotMinChange} min={5} max={120} step={1} size='small' />
                    <span style={{
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-sm, 14px)',
                      color: 'var(--text-content-secondary, #565D6D)',
                    }}>
                      นาที ต่อ slot
                    </span>
                  </div>
                ) : (
                  /* Read-only past/current month per Figma 51:17697 — Stepper
                     swap for a single line of plain text. Slot duration can't
                     change retroactively without breaking existing slots. */
                  <span style={{
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm, 14px)',
                    fontWeight: 'var(--type-weight-regular, 400)',
                    color: 'var(--text-content-default, #363B3F)',
                    lineHeight: 1.5,
                  }}>
                    {slotMin} นาทีต่อ Slot
                  </span>
                )}
              </div>

              <div style={{
                flex: '1 1 0',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--dim-space-400, 16px)',
                padding: 'var(--dim-space-600, 24px)',
                background: 'var(--surface-card-200, #FDFDFD)',
                border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
                borderRadius: 'var(--dim-radius-500, 16px)',
              }}>
                {canEditMix ? (
                  <PanelLabel>ประเภทการรับตรวจ</PanelLabel>
                ) : (
                  /* Inline label + value per Figma 51:17697 read-only state.
                     Drops the Select trigger + chevron + helper text — just
                     the type name appended after a bold colon. */
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--dim-space-200, 8px)' }}>
                    <PanelLabel>ประเภทการรับตรวจ:</PanelLabel>
                    <span style={{
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-sm, 14px)',
                      fontWeight: 'var(--type-weight-regular, 400)',
                      color: 'var(--text-content-default, #363B3F)',
                      lineHeight: 1.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {(BOOKING_TYPE_OPTIONS.find(o => o.value === bookingType) || {}).label}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 'var(--dim-space-400, 16px)', alignItems: 'flex-start' }}>
                  {canEditMix && (
                    <div style={{ flex: '0 0 260px', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-150, 6px)' }}>
                      {/* Field label per Figma 29:4788 — "ตัวเลือกด่วน *" (required). */}
                      <span style={{
                        fontFamily: 'var(--type-family-body)',
                        fontSize: 'var(--type-size-sm, 14px)',
                        fontWeight: 'var(--type-weight-medium, 500)',
                        color: 'var(--text-input-label, var(--text-content-primary, #171A1F))',
                        lineHeight: 1.5,
                      }}>
                        ตัวเลือกด่วน <span style={{
                          color: 'var(--text-input-require, var(--text-danger-default, #DC2626))',
                        }}>*</span>
                      </span>
                      <Select
                        value={bookingType}
                        onChange={onBookingTypeChange}
                        options={BOOKING_TYPE_OPTIONS}
                        /* Trigger is 260px wide but the option rows carry long
                           ratio subtext — open the popover at 640px to match
                           Figma 29:4788 layout. */
                        dropdownWidth={640}
                      />
                      <span style={{
                        fontFamily: 'var(--type-family-body)',
                        fontSize: 'var(--type-size-xs, 12px)',
                        fontWeight: 'var(--type-weight-regular, 400)',
                        color: 'var(--text-input-helper, #ADB2B7)',
                        lineHeight: 1.5,
                      }}>
                        ปริมาณของประเภทการตรวจต่อวัน
                      </span>
                    </div>
                  )}
                  {/* Sliders are the source of truth — drag hospital/online
                      (slider 1 + 2), special auto-derives. Any drift off
                      every preset auto-switches the dropdown to "ระบุเอง".
                      Hospital/online sliders fall back to read-only (no
                      `onChange`) when the cursor isn't on a still-future
                      month — Slider treats missing onChange as readOnly. */}
                  <div style={{
                    flex: '1 1 0',
                    display: 'flex',
                    gap: 'var(--dim-space-400, 16px)',
                    /* Sliders align with the Select trigger (offset by label
                       + trigger row). In read-only mode the Select column is
                       gone, so drop the offset and let sliders ride the
                       baseline of the inline "ประเภทการรับตรวจ: ..." label. */
                    paddingTop: canEditMix ? 'var(--dim-space-1200, 48px)' : 0,
                  }}>
                    <Slider
                      label='โรงพยาบาล'
                      value={sliderMix[0]}
                      tone='sakura'
                      onChange={canEditMix ? onHospitalChange : undefined}
                      max={100 - sliderMix[1]}
                    />
                    <Slider
                      label='ออนไลน์'
                      value={sliderMix[1]}
                      tone='lavender'
                      onChange={canEditMix ? onOnlineChange : undefined}
                      max={100 - sliderMix[0]}
                    />
                    <Slider
                      label='พิเศษ/ฉุกเฉิน (auto)'
                      value={sliderMix[2]}
                      tone='indigo'
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* เลือกตารางเวร — brand green header per Figma 35:7682 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--dim-space-400, 16px)',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-050, 2px)' }}>
                <span style={{
                  fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
                  fontSize: 'var(--type-size-base, 16px)',
                  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                  color: 'var(--text-topic-secondary-title, var(--brand-p700, #007549))',
                  lineHeight: 1.5,
                }}>
                  เลือกตารางเวร
                </span>
                <span style={{
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xs, 12px)',
                  color: 'var(--text-topic-tertiary-subtext, #ADB2B7)',
                }}>
                  คลิกเพื่อเลือกวันเวลาเข้าเวร
                </span>
              </div>
              {/* Checkbox Button per Figma — white bg + neutral border, h-56. */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--dim-space-200, 8px)',
                height: 'var(--dim-size-1200, 56px)',
                minWidth: 80,
                padding: 'var(--dim-space-200, 8px) var(--dim-space-400, 16px)',
                background: 'var(--surface-neutralButton-quinary, #FFFFFF)',
                border: 'var(--dim-stroke-100, 1px) solid var(--border-neutralButton-tertiary, #E2E4E6)',
                borderRadius: 'var(--dim-radius-200, 8px)',
              }}>
                <Checkbox checked={multiDay} onChange={setMultiDay} label='เลือกหลายวัน' />
              </div>
            </div>

            {/* Multi-day alert — Figma 39:8517. Shown above the calendar
                grid when multi-day mode is ON and no day has been picked
                yet. Once the user clicks the first day, the alert is
                replaced by the bottom-sheet DutyPickerSheet (which auto-
                opens via the same `selectedDays.length > 0` condition). */}
            {multiDay && selectedDays.length === 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--dim-space-300, 12px)',
                padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)',
                background: 'var(--surface-brandPrimary-quaternary, var(--brand-p50, #F4FBF8))',
                border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-tertiary, var(--brand-p200, #C5EDDA))',
                borderRadius: 'var(--dim-radius-200, 8px)',
              }}>
                <Icon
                  name='check_circle'
                  size={20}
                  style={{ color: 'var(--text-success-default, var(--brand-p600, #08A768))', flexShrink: 0 }}
                />
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--dim-space-050, 2px)',
                  minWidth: 0,
                }}>
                  <span style={{
                    fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
                    fontSize: 'var(--type-size-sm, 14px)',
                    fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                    color: 'var(--text-content-default, #363B3F)',
                    lineHeight: 1.5,
                  }}>
                    เลือกหลายวันพร้อมกัน
                  </span>
                  <span style={{
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-xs, 12px)',
                    fontWeight: 'var(--type-weight-regular, 400)',
                    color: 'var(--text-content-secondary, #565D6D)',
                    lineHeight: 1.5,
                  }}>
                    คลิกวันที่ต้องการเลือก แล้วกำหนดเวรพร้อมกัน
                  </span>
                </div>
              </div>
            )}

            {/* Summary strip — Figma 35:7682 node I35:7682;41:17176 — sits
                ABOVE the calendar grid. Replaces the legacy chip-legend row.
                · card-200 bg · neutral-quaternary border · radius-150 (6px)
                · padding 12/16 · gap 24 between items
                · Title "สรุปการเข้าเวร" — Mitr 16 · fixed 101px
                · 5 list items, each flex:1 with badge + "N วัน" text */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--dim-space-600, 24px)',
              padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)',
              background: 'var(--surface-card-200, #FDFDFD)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
              borderRadius: 'var(--dim-radius-150, 6px)',
            }}>
              <span style={{
                flex: '0 0 101px',
                height: 'var(--dim-size-500, 24px)',
                fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
                fontSize: 'var(--type-size-base, 16px)',
                fontWeight: 'var(--type-weight-regular, 400)',
                color: 'var(--text-topic-tertiary-title, #363B3F)',
                lineHeight: 1.5,
              }}>
                สรุปการเข้าเวร
              </span>
              {SHIFT_TYPES.map(s => (
                <div
                  key={`sum-${s.key}`}
                  style={{
                    flex: '1 1 0',
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--dim-space-200, 8px)',
                  }}
                >
                  <ColorfulBadge
                    style={shiftBadgeStyle(s.tone)}
                    size='small'
                    hierarchy='secondary'
                    width='hug'
                  >
                    {s.label}
                  </ColorfulBadge>
                  <span style={{
                    flex: '1 1 0',
                    minWidth: 0,
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm, 14px)',
                    fontWeight: 'var(--type-weight-regular, 400)',
                    color: 'var(--text-list-default, #4D5358)',
                    lineHeight: 1.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {shiftCounts[s.key]} วัน
                  </span>
                </div>
              ))}
            </div>

            {/* Calendar grid · 7 cols Sun-first × N rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-200, 8px)' }}>
              {/* Calendar header row — brand-tinted bg + dark-brand text per Figma. */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                background: 'var(--surface-table-header, var(--brand-p50, #F4FBF8))',
                borderRadius: 'var(--dim-radius-200, 8px)',
                border: 'var(--dim-stroke-100, 1px) solid var(--border-table-default, var(--brand-p100, #E2F3EB))',
              }}>
                {CAL_DAY_HEADERS_LONG.map((h, idx) => (
                  <div key={`hdr-${idx}`} style={{
                    padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)',
                    textAlign: 'left',
                    fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
                    fontSize: 'var(--type-size-sm, 14px)',
                    fontWeight: 'var(--type-weight-medium, 500)',
                    color: 'var(--text-table-title, var(--brand-p800, #004C31))',
                  }}>
                    {h}
                  </div>
                ))}
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                gap: 'var(--dim-space-150, 6px)',
              }}>
                {grid.map((cell, idx) => {
                  /* Per-cell disabled — outside the editable window OR the
                     cell's date has already passed. The cursor itself is
                     pinned inside the window by MonthNav, so practically
                     the only disabled cells inside a normal view are the
                     past-date cells inside the current month. */
                  const cellPast = cell.key < editableWindow.todayStr;
                  const cellDisabled = cursorOutsideWindow || cellPast;
                  /* `isToday` highlights the date pill in success-green
                     per Figma 3592:1329 ("current" state) so the user can
                     locate today at a glance — independent of whether it
                     is editable. */
                  const isToday = cell.key === editableWindow.todayStr;
                  return (
                    <CalendarCell
                      key={`cell-${idx}-${cell.key}`}
                      day={cell.day}
                      inMonth={cell.inMonth}
                      isToday={isToday}
                      holiday={DEMO_HOLIDAYS[cell.key]}
                      shifts={dayShifts[cell.key]}
                      appointmentCount={EXISTING_APPOINTMENTS.filter(a => a.cellKey === cell.key).length}
                      selected={selectedDays.includes(cell.key)}
                      disabled={cellDisabled}
                      onClick={() => onCellClick(cell.key)}
                    />
                  );
                })}
              </div>
            </div>
          </section>
        </main>

        {/* Footer — Figma 16:54432 "with BTN" variant. Sticky to the
            viewport bottom so the action row stays reachable on
            long-calendar months. Per Figma annotation:
            · Save + Draft both disabled until isDirty (no changes made).
            · Save fires the success toast then routes back to the list. */}
        <div style={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
          <ScheduleFooter
            type='btn'
            onCancel={onCancel}
            onSaveDraft={onSaveDraft}
            onSave={onSave}
            saveDisabled={!isDirty}
            draftDisabled={!isDirty}
          />
        </div>
      </div>

      {/* Success toast — Figma 139:20246. Anchored at the TOP of the
          viewport per Figma annotation ("appears at the top of the
          screen"). Sits just below the 64px-tall ScheduleHeader so it
          doesn't overlap the program name + breadcrumb. Auto-dismisses
          after ~2.4s. */}
      <SuccessToast
        open={toastOpen}
        message={toastMessage}
        onClose={() => setToastOpen(false)}
        topOffset='var(--dim-space-1700, 80px)'
      />

      {/* ConfirmAppointmentPopup — Figma 54:16508. Pops when the user
          changes the slot duration Stepper and there are advance
          appointments that will be rescheduled. */}
      <ConfirmAppointmentPopup
        open={pendingSlotMin !== null}
        appointments={affectedAppointments}
        oldSlotMin={slotMin}
        newSlotMin={pendingSlotMin !== null ? pendingSlotMin : slotMin}
        onConfirm={onConfirmSlotMin}
        onCancel={onCancelSlotMin}
      />

      {/* DutyPickerSheet — two variants per Figma:
          · 'modal' (39:8250)  — centered popup for single-day click
          · 'sheet' (39:12343) — bottom anchored, 3-col grid, auto-opens
                                  when multi-day buffer has ≥1 day. */}
      <DutyPickerSheet
        open={pickerOpen}
        variant={pickerVariant}
        targets={pickerTargets}
        dayShifts={dayShifts}
        hasActiveAppointments={pickerHasActiveAppointments}
        onSelect={onPickerSelect}
        onClear={onPickerClear}
        onClose={onPickerClose}
      />
    </div>
    </ClinicFilterProvider>
  );
};

export default ScheduleEditorPage;
