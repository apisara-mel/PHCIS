import React, { useEffect, useMemo, useState } from 'react';
import { Sym } from './Sym';
import { BrandButton, BrandSubdueButton } from '@/components/mobile';
import { InfoAlert } from './BookingWizard';
import DoctorCard from './DoctorCard';
import ClinicCard from './ClinicCard';

/* Booking bottom sheets — Archive Figma 4WXeI8fgBLQGgQ9VheM2yD · Booking 173:82969
   Annotation cases:
   · ดูแผนที่ · Sorting · เปลี่ยนวัน · Slot เต็ม · เปลี่ยนแพทย์ */

const OVERLAY = 'var(--surface-overlay-default, rgba(100,116,139,0.4))';
const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

export const BookingSheet = ({
  open,
  title,
  onClose,
  children,
  footer,
  tall = false,
}) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-label={title}
      className='flex flex-col justify-end'
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        background: OVERLAY,
      }}
      onClick={onClose}
    >
      <div
        className='flex flex-col'
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxHeight: tall ? '92%' : '70%',
          background: 'var(--surface-card-100, #FFFFFF)',
          borderTopLeftRadius: 'var(--dim-radius-600, 24px)',
          borderTopRightRadius: 'var(--dim-radius-600, 24px)',
          boxShadow: 'var(--shadow-brand-drop-top-200)',
          overflow: 'hidden',
        }}
      >
        <div
          className='flex items-center shrink-0'
          style={{
            position: 'relative',
            padding: 'var(--dim-space-400, 16px)',
            gap: 'var(--dim-space-300, 12px)',
            borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
          }}
        >
          <h2
            style={{
              margin: 0,
              flex: 1,
              textAlign: 'center',
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-base, 16px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.5,
              letterSpacing: 0,
              color: 'var(--text-content-default, #363B3F)',
            }}
          >
            {title}
          </h2>
          <button
            type='button'
            aria-label='ปิด'
            onClick={onClose}
            className='inline-flex items-center justify-center shrink-0'
            style={{
              position: 'absolute',
              right: 'var(--dim-space-400, 16px)',
              width: 40,
              height: 40,
              border: 0,
              borderRadius: 'var(--dim-radius-full)',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--text-content-default)',
            }}
          >
            <Sym name='close' size={22} />
          </button>
        </div>
        <div className='flex-1 min-h-0 overflow-y-auto' style={{ padding: 'var(--dim-space-400, 16px)' }}>
          {children}
        </div>
        {footer && (
          <div
            className='shrink-0'
            style={{
              padding: 'var(--dim-space-400, 16px)',
              borderTop: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

/* Case: ดูแผนที่ — Figma 253:26766 */
export const BookingMapSheet = ({ open, clinic, hoursRows, onClose }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!clinic) return null;
  const lat = clinic.lat || 13.67;
  const lng = clinic.lng || 100.6;
  const mapsUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.02}%2C${lat - 0.015}%2C${lng + 0.02}%2C${lat + 0.015}&layer=mapnik&marker=${lat}%2C${lng}`;

  if (!open) return null;

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-label='แผนที่ศูนย์บริการ'
      className='flex flex-col justify-end'
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        background: OVERLAY,
      }}
    >
      <div
        className='flex flex-col'
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          height: 'calc(100% - var(--dim-space-800, 32px))',
          minHeight: 0,
          overflow: 'hidden',
          background: 'var(--surface-card-100, #FFFFFF)',
          borderTopLeftRadius: 'var(--dim-radius-700, 38px)',
          borderTopRightRadius: 'var(--dim-radius-700, 38px)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div
          className='flex flex-col items-center shrink-0'
          style={{
            paddingBottom: 'var(--dim-space-200, 8px)',
            background: 'var(--surface-card-100, #FFFFFF)',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 'var(--dim-size-700, 36px)',
              height: 'var(--dim-space-100, 4px)',
              marginTop: 'var(--dim-space-100, 4px)',
              marginBottom: 'var(--dim-space-200, 8px)',
              borderRadius: 'var(--dim-radius-full, 9999px)',
              background: 'var(--border-switch-default, #C9CDD0)',
            }}
          />
          <div
            className='flex items-center w-full'
            style={{
              paddingInline: 'var(--dim-space-400, 16px)',
            }}
          >
            <span aria-hidden style={{ width: 'var(--dim-size-800, 40px)', flexShrink: 0 }} />
            <h2
              style={{
                flex: 1,
                margin: 0,
                textAlign: 'center',
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-base, 16px)',
                fontWeight: 'var(--type-weight-regular, 400)',
                lineHeight: 1.5,
                color: 'var(--text-content-default, #111314)',
              }}
            >
              แผนที่ศูนย์บริการ
            </h2>
            <button
              type='button'
              aria-label='ปิดแผนที่'
              onClick={onClose}
              className='inline-flex items-center justify-center shrink-0'
              style={{
                width: 'var(--dim-size-800, 40px)',
                height: 'var(--dim-size-800, 40px)',
                padding: 0,
                border: 0,
                borderRadius: 'var(--dim-radius-full, 9999px)',
                background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                color: 'var(--icon-brandPrimary-default, #007549)',
                cursor: 'pointer',
              }}
            >
              <Sym name='close' size={16} />
            </button>
          </div>
        </div>

        <div
          className='flex-1 min-h-0'
          style={{
            overflow: 'hidden',
            background: 'var(--surface-neutral-tertiary, #F4F5F5)',
            position: 'relative',
          }}
        >
          <iframe
            title={`แผนที่ ${clinic.name}`}
            src={mapsUrl}
            style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
          />
          <div
            className='flex flex-col'
            style={{
              position: 'absolute',
              top: 'var(--dim-size-1100, 52px)',
              right: 'var(--dim-space-300, 12px)',
              borderRadius: 'var(--dim-radius-300, 10px)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {[
              { name: 'map', label: 'รูปแบบแผนที่' },
              { name: 'near_me', label: 'ตำแหน่งของฉัน' },
            ].map((control, index) => (
              <button
                key={control.name}
                type='button'
                aria-label={control.label}
                className='inline-flex items-center justify-center'
                style={{
                  width: 'var(--dim-size-900, 44px)',
                  height: 'var(--dim-size-900, 44px)',
                  padding: 0,
                  border: 0,
                  borderBottom: index === 0
                    ? 'var(--dim-stroke-100, 1px) solid var(--border-content-tertiary, #E1E3E5)'
                    : 0,
                  background: 'var(--surface-card-100, #FFFFFF)',
                  color: 'var(--text-content-secondary, #636B72)',
                  cursor: 'pointer',
                }}
              >
                <Sym name={control.name} size={20} />
              </button>
            ))}
          </div>
        </div>

        <div
          className='shrink-0'
          style={{
            padding: 'var(--dim-space-400, 16px) var(--dim-space-400, 16px) var(--dim-space-800, 32px)',
            background: 'var(--surface-card-100, #FFFFFF)',
          }}
        >
          <ClinicCard
            number={clinic.number}
            name={clinic.shortName || clinic.name}
            distanceKm={clinic.distanceKm}
            hoursRows={hoursRows}
            showBadge={false}
            showCheckbox={false}
            showMap={false}
            style={{
              padding: 0,
              border: 0,
              borderRadius: 0,
              cursor: 'default',
              background: 'transparent',
              transition: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export const SORT_OPTIONS = [
  {
    key: 'nearest',
    label: 'ใกล้ฉัน',
    triggerLabel: 'ใกล้ที่สุด',
    description: 'ตามระยะทางจากตำแหน่งปัจจุบัน',
  },
  { key: 'name', label: 'เรียงตาม ก–ฮ' },
  { key: 'number', label: 'เรียงตามตัวเลขศูนย์' },
];

/* Case: Sorting — Figma 253:29630 */
export const BookingSortSheet = ({ open, value, onSelect, onClose }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-label='คัดกรอง'
      className='flex flex-col justify-end'
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        background: OVERLAY,
      }}
    >
      <div
        className='flex flex-col'
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          paddingBottom: 'var(--dim-space-800, 32px)',
          overflow: 'hidden',
          background: 'var(--surface-card-100, #FFFFFF)',
          borderTopLeftRadius: 'var(--dim-radius-700, 38px)',
          borderTopRightRadius: 'var(--dim-radius-700, 38px)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div
          className='flex flex-col items-center shrink-0'
          style={{
            paddingBottom: 'var(--dim-space-200, 8px)',
            borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 'var(--dim-size-700, 36px)',
              height: 'var(--dim-space-100, 4px)',
              marginTop: 'var(--dim-space-100, 4px)',
              marginBottom: 'var(--dim-space-200, 8px)',
              borderRadius: 'var(--dim-radius-full, 9999px)',
              background: 'var(--border-switch-default, #C9CDD0)',
            }}
          />
          <div
            className='flex items-center w-full'
            style={{ paddingInline: 'var(--dim-space-400, 16px)' }}
          >
            <span aria-hidden style={{ width: 'var(--dim-size-800, 40px)', flexShrink: 0 }} />
            <h2
              style={{
                flex: 1,
                margin: 0,
                textAlign: 'center',
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-base, 16px)',
                fontWeight: 'var(--type-weight-regular, 400)',
                lineHeight: 1.5,
                color: 'var(--text-content-default, #111314)',
              }}
            >
              คัดกรอง
            </h2>
            <button
              type='button'
              aria-label='ปิดคัดกรอง'
              onClick={onClose}
              className='inline-flex items-center justify-center shrink-0'
              style={{
                width: 'var(--dim-size-800, 40px)',
                height: 'var(--dim-size-800, 40px)',
                padding: 0,
                border: 0,
                borderRadius: 'var(--dim-radius-full, 9999px)',
                background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                color: 'var(--icon-brandPrimary-default, #007549)',
                cursor: 'pointer',
              }}
            >
              <Sym name='close' size={16} />
            </button>
          </div>
        </div>

        {SORT_OPTIONS.map((option, index) => (
          <button
            key={option.key}
            type='button'
            aria-pressed={value === option.key}
            onClick={() => {
              onSelect?.(option.key);
              onClose?.();
            }}
            className='flex flex-col items-start w-full text-left'
            style={{
              minHeight: 'var(--dim-size-1200, 56px)',
              padding: 'var(--dim-space-200, 8px) var(--dim-space-400, 16px)',
              border: 0,
              borderBottom: index < SORT_OPTIONS.length - 1
                ? 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)'
                : 0,
              background: 'var(--surface-list-default, #FFFFFF)',
              cursor: 'pointer',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm, 14px)',
                fontWeight: 'var(--type-weight-regular, 400)',
                lineHeight: 1.5,
                color: 'var(--text-list-default, #4D5358)',
              }}
            >
              {option.label}
            </span>
            {option.description && (
              <span
                style={{
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xs, 12px)',
                  fontWeight: 'var(--type-weight-regular, 400)',
                  lineHeight: 1.5,
                  color: 'var(--text-list-subtext, #858C92)',
                }}
              >
                {option.description}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

/* Case: user ต้องการเปลี่ยนวัน — Figma 173:82996 */
export const BookingCalendarSheet = ({
  open,
  selectedKey,
  availableKeys,
  onSelect,
  onClose,
}) => {
  /* Booking gates bookable days with a 3-day lead; a plain picker opens on the current month. */
  const base = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (Array.isArray(availableKeys)) d.setDate(d.getDate() + 3);
    return d;
  }, [availableKeys]);
  const [cursor, setCursor] = useState(() => new Date(base.getFullYear(), base.getMonth(), 1));

  useEffect(() => {
    if (open) setCursor(new Date(base.getFullYear(), base.getMonth(), 1));
  }, [open, base]);

  /* When availableKeys is provided the calendar gates bookable days (others → "เต็ม").
     When omitted it acts as a plain date picker: every non-past day is selectable. */
  const gated = Array.isArray(availableKeys);
  const available = useMemo(() => new Set(availableKeys || []), [availableKeys]);
  const todayKey = useMemo(() => toBeKey(new Date()), []);
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const cells = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const firstDow = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const out = [];
    for (let i = 0; i < firstDow; i += 1) out.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      const d = new Date(y, m, day);
      const key = toBeKey(d);
      out.push({ day, key, past: d.getTime() < todayStart, disabled: gated ? !available.has(key) : false });
    }
    return out;
  }, [cursor, available, gated, todayStart]);

  const monthLabel = `${THAI_MONTHS[cursor.getMonth()]} ${cursor.getFullYear() + 543}`;

  return (
    <BookingSheet
      open={open}
      title='เลือกวัน'
      onClose={onClose}
    >
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-400, 16px)' }}>
        <div className='flex items-center justify-between'>
          <button type='button' aria-label='เดือนก่อน' onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))} style={navBtn}>
            <Sym name='chevron_left' size={22} />
          </button>
          <span style={{ fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base, 16px)', color: 'var(--text-content-default)' }}>
            {monthLabel}
          </span>
          <button type='button' aria-label='เดือนถัดไป' onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))} style={navBtn}>
            <Sym name='chevron_right' size={22} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--dim-space-100, 4px)' }}>
          {WEEKDAYS.map((w) => (
            <span key={w} style={{ textAlign: 'center', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)', padding: 'var(--dim-space-100, 4px)' }}>
              {w}
            </span>
          ))}
          {cells.map((cell, i) => {
            if (!cell) return <span key={`e-${i}`} />;
            const selected = cell.key === selectedKey;
            const past = cell.past;   // before today → disabled number
            const current = !selected && !past && !cell.disabled && cell.key === todayKey;   // today
            const full = cell.disabled && !past;   // today/future, no slots left → "เต็ม"
            const inactive = past || full;
            return (
              <button
                key={cell.key}
                type='button'
                disabled={inactive}
                /* Figma 173:82996 interaction — picking a date auto-dismisses the sheet */
                onClick={() => { onSelect?.(cell.key); onClose?.(); }}
                title={past ? 'วันที่ผ่านมาแล้ว' : full ? 'วันที่เต็ม' : undefined}
                aria-current={selected ? 'date' : undefined}
                style={{
                  height: 40,
                  border: 0,
                  borderRadius: 'var(--dim-radius-full)',
                  background: selected
                    ? 'var(--surface-calendar-selected-mobile, #08A768)'
                    : current
                      ? 'var(--surface-calendar-current, #E2F3EB)'
                      : 'transparent',
                  color: selected
                    ? 'var(--text-calendar-selected, #FFFFFF)'
                    : current
                      ? 'var(--text-calendar-current, #007549)'
                      : inactive
                        ? 'var(--text-calendar-disabled, #CBD5E1)'
                        : 'var(--text-calendar-default, #4D5358)',
                  fontSize: full ? 'var(--type-size-xs, 12px)' : 'var(--type-size-sm, 14px)',
                  fontWeight: (selected || current) ? 'var(--type-weight-medium, 500)' : 'var(--type-weight-regular, 400)',
                  cursor: inactive ? 'not-allowed' : 'pointer',
                }}
              >
                {full ? 'เต็ม' : cell.day}
              </button>
            );
          })}
        </div>

        {gated && (
          <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)', textAlign: 'center' }}>
            วันที่ระบุ “เต็ม” = วันที่ไม่พร้อมให้บริการ · จองล่วงหน้าอย่างน้อย 3 วัน
          </p>
        )}
      </div>
    </BookingSheet>
  );
};

const navBtn = {
  width: 40,
  height: 40,
  border: 0,
  borderRadius: 'var(--dim-radius-full)',
  background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
  color: 'var(--text-brandPrimary-default, #007549)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export const toBeKey = (d) => {
  const y = d.getFullYear() + 543;
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/* Case: Slot เต็ม — Figma 371:43803 */
export const BookingSlotFullSheet = ({ open, onChangeDate, onChangeDoctor, onClose }) => (
  <BookingSheet open={open} title='ไม่พบช่วงเวลาว่าง' onClose={onClose}>
    <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-400, 16px)', padding: 'var(--dim-space-400, 16px) 0', textAlign: 'center' }}>
      <span
        className='inline-flex items-center justify-center'
        style={{
          width: 72,
          height: 72,
          borderRadius: 'var(--dim-radius-full)',
          background: 'var(--surface-warning-quaternary, #FFF7ED)',
          color: 'var(--text-warning-default, #C2410C)',
        }}
      >
        <Sym name='event_busy' size={36} />
      </span>
      <div>
        <p style={{ margin: 0, fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-lg, 18px)', color: 'var(--text-content-default)' }}>
          Slot เต็มแล้ว
        </p>
        <p style={{ margin: 'var(--dim-space-200, 8px) 0 0', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary)', lineHeight: 1.5 }}>
          วันที่เลือกไม่มีช่วงเวลาว่าง
          <br />
          ลองเปลี่ยนวันหรือเปลี่ยนแพทย์
        </p>
      </div>
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <BrandButton size='lg' leadingIcon='calendar_month' onClick={onChangeDate} showTailingIcon={false}>
          เปลี่ยนวัน
        </BrandButton>
        <BrandSubdueButton variant='outline' size='md' leadingIcon='swap_horiz' onClick={onChangeDoctor}>
          เปลี่ยนแพทย์
        </BrandSubdueButton>
      </div>
    </div>
  </BookingSheet>
);

/* Case: เปลี่ยนแพทย์ — Figma 262:36280 */
export const BookingChangeDoctorSheet = ({
  open,
  doctors,
  currentDoctor: currentDoctorProp,
  selectedId,
  centreName,
  onSelect,
  onClose,
}) => {
  const [pendingId, setPendingId] = useState(null);
  const currentDoctor = currentDoctorProp
    || (doctors || []).find((doctor) => doctor.id === selectedId);
  const otherDoctors = (doctors || []).filter((doctor) => doctor.id !== currentDoctor?.id);
  const pendingDoctor = otherDoctors.find((doctor) => doctor.id === pendingId);

  useEffect(() => {
    if (open) setPendingId(null);
  }, [open, selectedId]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const confirmChange = () => {
    if (!pendingDoctor) return;
    onSelect?.(pendingDoctor);
    onClose?.();
  };

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-label='เปลี่ยนแพทย์'
      className='flex flex-col justify-end'
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        background: OVERLAY,
      }}
    >
      <div
        className='flex flex-col'
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          height: 'calc(100% - var(--dim-space-800, 32px))',
          minHeight: 0,
          overflow: 'hidden',
          background: 'var(--surface-card-100, #FFFFFF)',
          borderTopLeftRadius: 'var(--dim-radius-700, 38px)',
          borderTopRightRadius: 'var(--dim-radius-700, 38px)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <header
          className='flex flex-col items-center shrink-0'
          style={{
            paddingBottom: 'calc(var(--dim-space-200, 8px) + var(--dim-space-050, 2px))',
            borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
            background: 'var(--surface-card-100, #FFFFFF)',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 'var(--dim-size-700, 36px)',
              height: 'var(--dim-space-100, 4px)',
              marginTop: 'var(--dim-space-100, 4px)',
              marginBottom: 'var(--dim-space-200, 8px)',
              borderRadius: 'var(--dim-radius-full, 9999px)',
              background: 'var(--border-switch-default, #C9CDD0)',
            }}
          />
          <div
            className='flex items-center w-full'
            style={{ paddingInline: 'var(--dim-space-400, 16px)' }}
          >
            <span aria-hidden style={{ width: 'var(--dim-size-800, 40px)', flexShrink: 0 }} />
            <h2
              style={{
                flex: 1,
                margin: 0,
                textAlign: 'center',
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-base, 16px)',
                fontWeight: 'var(--type-weight-regular, 400)',
                lineHeight: 1.5,
                color: 'var(--text-content-default, #111314)',
              }}
            >
              เปลี่ยนแพทย์
            </h2>
            <button
              type='button'
              aria-label='ปิดหน้าต่างเปลี่ยนแพทย์'
              onClick={onClose}
              className='inline-flex items-center justify-center shrink-0'
              style={{
                width: 'var(--dim-size-800, 40px)',
                height: 'var(--dim-size-800, 40px)',
                padding: 0,
                border: 0,
                borderRadius: 'var(--dim-radius-600, 24px)',
                background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                color: 'var(--icon-brandPrimary-default, #007549)',
                cursor: 'pointer',
              }}
            >
              <Sym name='close' size={16} />
            </button>
          </div>
        </header>

        <div
          className='flex-1 min-h-0 overflow-y-auto'
          style={{
            padding: 'var(--dim-space-400, 16px)',
            background: 'var(--surface-card-100, #FFFFFF)',
          }}
        >
          <div
            className='flex flex-col'
            style={{ gap: 'var(--dim-space-400, 16px)' }}
          >
            <InfoAlert icon='info'>
              การเปลี่ยนแพทย์อาจทำให้วันและเวลาที่ว่างเปลี่ยนไป โปรดเลือกเวลาอีกครั้งหลังยืนยัน
            </InfoAlert>

            <section
              className='flex flex-col'
              style={{ gap: 'var(--dim-space-300, 12px)' }}
            >
              <h3
                style={{
                  margin: 0,
                  fontFamily: 'var(--type-family-heading-graphic2)',
                  fontSize: 'var(--type-size-base, 16px)',
                  fontWeight: 'var(--type-weight-regular, 400)',
                  lineHeight: 1.5,
                  color: 'var(--text-brandPrimary-default, #007549)',
                }}
              >
                แพทย์ปัจจุบัน
              </h3>
              <DoctorCard
                anyone={Boolean(currentDoctor?.anyone) || !currentDoctor}
                name={currentDoctor?.name || 'ไม่ระบุแพทย์'}
                subtitle={!currentDoctor ? 'ระบบจะเลือกแพทย์ที่ว่างให้' : undefined}
                dept={currentDoctor?.specialty}
                license={currentDoctor?.license}
                centre={centreName}
                centreLabel='ศูนย์ให้บริการ:'
                avatar={currentDoctor?.avatar}
                selected
                style={{ cursor: 'default', boxShadow: 'var(--shadow-brand-drop-bottom-200)' }}
              />
            </section>

            <section
              className='flex flex-col'
              style={{ gap: 'var(--dim-space-300, 12px)' }}
            >
              <h3
                style={{
                  margin: 0,
                  fontFamily: 'var(--type-family-heading-graphic2)',
                  fontSize: 'var(--type-size-base, 16px)',
                  fontWeight: 'var(--type-weight-regular, 400)',
                  lineHeight: 1.5,
                  color: 'var(--text-brandPrimary-default, #007549)',
                }}
              >
                แพทย์ท่านอื่นในแผนกนี้
              </h3>
              <div
                className='flex flex-col'
                style={{ gap: 'var(--dim-space-150, 6px)' }}
              >
                {otherDoctors.map((doctor) => {
                  const selected = pendingId === doctor.id;
                  return (
                    <DoctorCard
                      key={doctor.id}
                      name={doctor.name}
                      dept={doctor.specialty}
                      license={doctor.license}
                      centre={centreName}
                      centreLabel='ศูนย์ให้บริการ:'
                      avatar={doctor.avatar}
                      selected={selected}
                      onClick={() => setPendingId(doctor.id)}
                      style={{
                        border: selected
                          ? 'var(--dim-stroke-200, 2px) solid var(--border-brandPrimary-default, #007549)'
                          : 0,
                        boxShadow: 'var(--shadow-brand-drop-bottom-200)',
                      }}
                    />
                  );
                })}
              </div>
            </section>
          </div>
        </div>

        <footer
          className='flex flex-col shrink-0'
          style={{
            gap: 'var(--dim-space-300, 12px)',
            padding: 'var(--dim-space-400, 16px) var(--dim-space-400, 16px) var(--dim-space-800, 32px)',
            borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
            background: 'var(--surface-card-100, #FFFFFF)',
            boxShadow: 'var(--shadow-brand-drop-top-100)',
          }}
        >
          <BrandButton
            size='Large'
            disabled={!pendingDoctor}
            onClick={confirmChange}
          >
            ยืนยันการเปลี่ยนแพทย์
          </BrandButton>
          <BrandButton
            variant='outline'
            size='Medium'
            onClick={onClose}
          >
            ไม่เปลี่ยนแพทย์
          </BrandButton>
        </footer>
      </div>
    </div>
  );
};
