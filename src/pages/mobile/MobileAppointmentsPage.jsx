import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  MobileShell,
  MobileHeader,
  Sym,
  BrandButton,
  BrandSubdueButton,
  BrandSubdueIconButton,
} from '@/components/mobile';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import MobileIconBadge from '@/components/mobile/MobileIconBadge';
import { MOBILE_SERVICE_META } from '@/components/mobile/mobileIconTones';
import { BookingCalendarSheet } from '@/components/mobile/BookingSheets';
import { usePhcisLink } from '@/data/phcisLink';
import { resolveDoctorAvatar } from '@/data/mobileMock';

/* BMA Health · Appointments list — Archive Figma 151:42896 (Appointment_coming).
   Filters: BrandTag ทั้งหมด | ออนไลน์ | ที่ศูนย์ + calendar Subdue Icon Button.
   Cards match Home appointment card detail layout (Calendar · Clock · Map pin · Video). */

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const FILTERS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'video', label: 'เข้ารับบริการออนไลน์' },
  { key: 'visit', label: 'เข้ารับที่ศูนย์บริการ' },
  { key: 'homevisit', label: 'เยี่ยมบ้าน' },
];

const APT_STATUS_META = {
  confirmed: { style: 'success', label: 'ยืนยันแล้ว' },
  pending: { style: 'warning', label: 'รอยืนยัน' },
  noshow: { style: 'neutral', label: 'ไม่มาตามนัด' },
  completed: { style: 'neutral', label: 'เข้ารับบริการแล้ว' },
  cancelled: { style: 'neutral', label: 'ยกเลิกแล้ว' },
};

const isSameCalendarDay = (yyyyMmDd) => {
  const parts = String(yyyyMmDd || '').split('-').map(Number);
  if (parts.length < 3) return false;
  const [y, mm, dd] = parts;
  const today = new Date();
  return y === today.getFullYear() && mm === today.getMonth() + 1 && dd === today.getDate();
};

const formatThaiDate = (yyyyMmDd, { withToday } = {}) => {
  const parts = String(yyyyMmDd || '').split('-').map(Number);
  if (parts.length < 3) return yyyyMmDd;
  const [, mm, dd] = parts;
  const short = `${dd} ${THAI_MONTHS_SHORT[mm - 1]}`;
  if (withToday && isSameCalendarDay(yyyyMmDd)) return `วันนี้, ${short}`;
  return short;
};

const formatCountdown = (sec) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/* Figma Colorful icon Badge Medium — size 600 (32) · glyph 300 (16) · green #08A768 */
const DetailCell = ({ icon, label, value, flex = 1 }) => (
  <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)', flex, minWidth: 0 }}>
    <MobileIconBadge
      icon={icon}
      tone='green'
      size='var(--dim-size-600, 32px)'
      iconSize='var(--dim-size-300, 16px)'
    />
    <div className='min-w-0' style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-050, 2px)' }}>
      <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)', lineHeight: 1.5 }}>
        {label}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: 'var(--type-size-sm, 14px)',
          fontWeight: 'var(--type-weight-bold, 700)',
          color: 'var(--text-content-default, #111314)',
          lineHeight: 1.5,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </p>
    </div>
  </div>
);

/* Figma BrandTag — Filter Tabs 371:43962 / 371:43963 */
const FilterChip = ({ active, onClick, children }) => (
  <button
    type='button'
    onClick={onClick}
    style={{
      boxSizing: 'border-box',
      flexShrink: 0,
      height: 'var(--dim-size-800, 40px)',
      minWidth: 'var(--dim-size-800, 40px)',
      maxWidth: 192,
      padding: 'var(--dim-space-100, 4px) var(--dim-space-300, 12px)',
      borderRadius: 'var(--dim-radius-full, 9999px)',
      border: active
        ? 'var(--dim-stroke-100, 1px) solid var(--border-brandtag-selected, #C5EDDA)'
        : 'var(--dim-stroke-100, 1px) solid var(--border-brandtag-default, #E2E4E6)',
      background: active
        ? 'var(--surface-brandtag-selected, #F4FBF8)'
        : 'var(--surface-brandtag-default, #FFFFFF)',
      color: active
        ? 'var(--text-brandtag-selected, #007549)'
        : 'var(--text-brandtag-default, #4D5358)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-sm, 14px)',
      fontWeight: 'var(--type-weight-medium, 500)',
      lineHeight: 1.5,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}
  >
    {children}
  </button>
);

const AppointmentCard = ({
  apt, nearOnline, countdownSec, onCancel, onReschedule, onJoin, onOpen,
}) => {
  const isOnline = apt.type === 'video';
  const serviceMeta = MOBILE_SERVICE_META[apt.type] || MOBILE_SERVICE_META.visit;
  const statusMeta = APT_STATUS_META[apt.aptStatus || (apt.status === 'past' ? 'completed' : 'confirmed')]
    || APT_STATUS_META.confirmed;
  const canAct = apt.status === 'upcoming' && apt.aptStatus !== 'cancelled' && apt.aptStatus !== 'noshow';
  const showJoin = canAct && nearOnline && isOnline;
  const showReschedule = canAct && !showJoin;
  const location = apt.locationLabel || (apt.clinic === 'BNA' ? 'ศูนย์ 08, บางนา' : 'ศูนย์บริการ');
  const serviceTypeLabel = isOnline
    ? 'ออนไลน์ (Telemedicine)'
    : apt.type === 'homevisit'
      ? 'เยี่ยมบ้าน'
      : 'ที่ศูนย์บริการ';

  return (
    <div
      role='button'
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen?.(); }}
      style={{
        background: 'var(--surface-card-100, #FFFFFF)',
        borderRadius: 'var(--dim-radius-500, 16px)',
        /* Figma: top stroke only on near-online (border/brandPrimary/secondary) */
        borderTop: nearOnline
          ? 'var(--dim-stroke-500, 5px) solid var(--border-brandPrimary-secondary, #6AD6A5)'
          : undefined,
        boxShadow: 'var(--shadow-brand-drop-bottom-200)',
        padding: 'var(--dim-space-400, 16px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--dim-space-300, 12px)',
        cursor: 'pointer',
      }}
    >
      <div className='flex items-center justify-between' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <ColorfulBadge style={serviceMeta.badgeStyle} size='small' hierarchy='secondary' width='hug' showIcon icon={serviceMeta.icon}>
          {serviceMeta.badgeLabel}
        </ColorfulBadge>
        <StatusBadge style={statusMeta.style} size='small'>{statusMeta.label}</StatusBadge>
      </div>

      <div
        className='flex items-start'
        style={{
          gap: 'var(--dim-space-200, 8px)',
          padding: 'var(--dim-space-300, 12px)',
          background: 'var(--surface-card-skycyan-100, #F4F9FD)',
          borderRadius: 'var(--dim-radius-400, 12px)',
        }}
      >
        <span
          className='overflow-hidden shrink-0'
          style={{
            width: 'var(--dim-size-800, 40px)',
            height: 'var(--dim-size-800, 40px)',
            borderRadius: 'var(--dim-radius-full, 9999px)',
          }}
        >
          <img
            src={apt.doctorAvatar || resolveDoctorAvatar(apt.doctor)}
            alt=''
            width={40}
            height={40}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </span>
        <div className='min-w-0' style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-050, 2px)' }}>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-sm, 14px)',
              color: 'var(--text-content-default, #111314)',
              lineHeight: 1.5,
            }}
          >
            {apt.doctor}
          </p>
          <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)', lineHeight: 1.5 }}>
            {apt.specialty || apt.deptLabel}
          </p>
        </div>
      </div>

      {/* Figma: date | time row · then location · type (gap 400 between those two) */}
      <div className='flex items-center' style={{ gap: 'var(--dim-space-400, 16px)', width: '100%' }}>
        <DetailCell
          icon='calendar'
          label='วันที่'
          value={formatThaiDate(apt.date, { withToday: nearOnline || isSameCalendarDay(apt.date) })}
        />
        <DetailCell icon='clock' label='เวลา' value={`${apt.time} น.`} />
      </div>
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-400, 16px)', width: '100%' }}>
        <DetailCell icon='map-pin' label='ศูนย์ให้บริการ' value={location} />
        <DetailCell icon={serviceMeta.icon} label='ประเภทการเข้ารับบริการ' value={serviceTypeLabel} />
      </div>

      {showJoin && (
        <>
          <div
            aria-hidden
            style={{
              width: '100%',
              height: 'var(--dim-stroke-100, 1px)',
              background: 'var(--border-neutral-quaternary, #F4F5F5)',
            }}
          />
          <p
            style={{
              margin: 0,
              width: '100%',
              fontSize: 'var(--type-size-sm, 14px)',
              fontWeight: 'var(--type-weight-bold, 700)',
              color: 'var(--text-brandPrimary-default, #007549)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--dim-space-150, 6px)',
              padding: 'var(--dim-space-200, 8px) 0',
              lineHeight: 1.5,
            }}
          >
            <Sym name='clock' size={16} color='var(--text-brandPrimary-secondary, #08A768)' />
            เริ่มใน {formatCountdown(countdownSec)} นาที
          </p>
          {/* Figma Brand Button Large (48) — fill + Subdue outline ยกเลิก */}
          <BrandButton
            variant='fill'
            size='lg'
            leadingIcon='video'
            onClick={(e) => { e.stopPropagation(); onJoin?.(); }}
          >
            เข้าห้องวิดีโอคอล
          </BrandButton>
          <BrandSubdueButton
            variant='outline'
            size='lg'
            fullWidth
            onClick={(e) => { e.stopPropagation(); onCancel?.(); }}
          >
            ยกเลิก
          </BrandSubdueButton>
        </>
      )}

      {canAct && showReschedule && (
        <>
          <div
            aria-hidden
            style={{
              width: '100%',
              height: 'var(--dim-stroke-100, 1px)',
              background: 'var(--border-neutral-quaternary, #F4F5F5)',
            }}
          />
          <div className='flex' style={{ gap: 'var(--dim-space-300, 12px)', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            {/* Figma: Brand Subdue Outline ยกเลิก + Brand Outline เลื่อนนัด (Large) */}
            <BrandSubdueButton variant='outline' size='lg' style={{ flex: 1 }} onClick={onCancel}>
              ยกเลิก
            </BrandSubdueButton>
            <BrandButton variant='outline' size='lg' style={{ flex: 1 }} onClick={onReschedule}>
              เลื่อนนัด
            </BrandButton>
          </div>
        </>
      )}
    </div>
  );
};

const MobileAppointmentsInner = () => {
  const history = useHistory();
  const { appointments } = usePhcisLink();
  const [filter, setFilter] = useState('all');
  const [countdownSec, setCountdownSec] = useState(14 * 60 + 59);
  const [calOpen, setCalOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState(null);   // BE key 'YYYY-MM-DD' from the calendar sheet

  const list = useMemo(() => {
    let rows = [...appointments];
    if (filter === 'video') rows = rows.filter((a) => a.type === 'video');
    if (filter === 'visit') rows = rows.filter((a) => a.type === 'visit');
    if (filter === 'homevisit') rows = rows.filter((a) => a.type === 'homevisit');
    if (dateFilter) rows = rows.filter((a) => a.date === dateFilter);
    return rows.sort((a, b) => {
      const au = a.status === 'upcoming' ? 0 : 1;
      const bu = b.status === 'upcoming' ? 0 : 1;
      if (au !== bu) return au - bu;
      const dateOrder = String(a.date).localeCompare(String(b.date));
      return au === 0 ? dateOrder : -dateOrder;
    });
  }, [appointments, filter, dateFilter]);

  const nearId = useMemo(() => {
    const near = appointments.find((a) => a.status === 'upcoming' && a.type === 'video' && a.nearStart);
    return near?.id || null;
  }, [appointments]);

  useEffect(() => {
    if (!nearId) return undefined;
    const id = window.setInterval(() => {
      setCountdownSec((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [nearId]);

  const cancelQuick = (apt) => {
    history.push(`/m/appointments/${apt.id}?action=cancel`);
  };

  return (
    <div
      className='flex flex-col'
      style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}
    >
      <MobileHeader
        title='การนัดหมาย'
        hideBack
        reserveBackSpace
        containerStyle={{
          height: 'var(--dim-size-1500, 68px)',
          padding: '0 var(--dim-space-200, 8px)',
          gap: 'var(--dim-space-300, 12px)',
          background: 'var(--surface-navigation-default, #FFFFFF)',
          borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
          boxShadow: 'var(--shadow-brand-drop-bottom-100)',
        }}
        titleStyle={{
          fontFamily: 'var(--type-family-heading-graphic2)',
          fontSize: 'var(--type-size-base, 16px)',
          fontWeight: 'var(--type-weight-regular, 400)',
          lineHeight: 1.5,
          textAlign: 'center',
          color: 'var(--text-content-default, #111314)',
        }}
        rightContainerStyle={{
          width: 'var(--dim-size-800, 40px)',
          height: 'var(--dim-size-800, 40px)',
        }}
        right={(
          <button
            type='button'
            aria-label='การแจ้งเตือน'
            onClick={() => history.push('/m/notifications')}
            style={{
              position: 'relative',
              width: 'var(--dim-size-800, 40px)',
              height: 'var(--dim-size-800, 40px)',
              borderRadius: 'var(--dim-radius-full, 9999px)',
              border: 0,
              background: 'transparent',
              color: 'var(--text-content-default, #111314)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sym name='notifications' size='var(--dim-size-500, 24px)' />
            <span
              style={{
                position: 'absolute',
                top: 'var(--dim-space-150, 6px)',
                right: 'var(--dim-space-150, 6px)',
                width: 'var(--dim-space-200, 8px)',
                height: 'var(--dim-space-200, 8px)',
                borderRadius: 'var(--dim-radius-full, 9999px)',
                background: 'var(--surface-danger-default, #DC2626)',
              }}
            />
          </button>
        )}
      />

      {/* Filter Tabs — Figma 371:43959 (white bar · BrandTags · calendar 48) */}
      <div
        className='flex items-center shrink-0'
        style={{
          gap: 'var(--dim-space-400, 16px)',
          padding: 'var(--dim-space-200, 8px) var(--dim-space-400, 16px) var(--dim-space-200, 8px) 0',
          background: 'var(--surface-card-100, #FFFFFF)',
          boxShadow: 'var(--shadow-brand-drop-bottom-200)',
        }}
      >
        <div
          className='flex flex-1 min-w-0'
          style={{
            borderRight: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-secondary, #C5EDDA)',
            paddingRight: 0,
          }}
        >
          <div className='flex overflow-x-auto flex-1' style={{ gap: 'var(--dim-space-300, 12px)', padding: '0 var(--dim-space-400, 16px)' }}>
            {FILTERS.map((f) => (
              <FilterChip key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>
                {f.label}
              </FilterChip>
            ))}
          </div>
        </div>
        {/* Figma Brand Subdue Icon Button Medium — 48×48 · opens the calendar action sheet (371:43965 → 173:82996) */}
        <BrandSubdueIconButton
          icon='calendar'
          size='md'
          aria-label='เลือกวันที่'
          onClick={() => setCalOpen(true)}
          style={{ flexShrink: 0 }}
        />
      </div>

      <div
        className='flex-1 min-h-0 overflow-y-auto'
        style={{
          padding: 'var(--dim-space-400, 16px) var(--dim-space-400, 16px) var(--dim-space-600, 24px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--dim-space-400, 16px)',
          background: 'var(--background-screen-brand-100, #F4FBF8)',
        }}
      >
        {/* List Header — Figma 371:44749: title + Status Badge count (no จองนัด) */}
        <div className='flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-lg, 18px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              color: 'var(--text-brandPrimary-default, #007549)',
              lineHeight: 1.5,
            }}
          >
            นัดหมาย
          </p>
          <StatusBadge
            style='success'
            size='small'
            styleProp={{
              height: 'auto',
              minHeight: 0,
              minWidth: 0,
              paddingTop: 0,
              paddingBottom: 0,
              lineHeight: 1.5,
            }}
          >
            {String(list.length)}
          </StatusBadge>

          {dateFilter && (
            <button
              type='button'
              onClick={() => setDateFilter(null)}
              className='inline-flex items-center'
              style={{
                marginLeft: 'auto',
                gap: 'var(--dim-space-100, 4px)',
                padding: 'var(--dim-space-050, 2px) var(--dim-space-300, 12px)',
                border: 0,
                borderRadius: 'var(--dim-radius-full, 9999px)',
                background: 'var(--surface-brandPrimary-tertiary, #E2F3EB)',
                color: 'var(--text-brandPrimary-default, #007549)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs, 12px)',
                cursor: 'pointer',
              }}
            >
              {formatThaiDate(dateFilter, { withToday: true })}
              <Sym name='close' size='var(--dim-size-250, 14px)' />
            </button>
          )}
        </div>

        {list.length === 0 ? (
          <div
            style={{
              padding: 'var(--dim-space-800, 32px) var(--dim-space-400, 16px)',
              textAlign: 'center',
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-500, 16px)',
              boxShadow: 'var(--shadow-brand-drop-bottom-200)',
            }}
          >
            <p style={{ margin: 0, color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-sm, 14px)' }}>
              ยังไม่มีนัดหมายในหมวดนี้
            </p>
          </div>
        ) : (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            {list.map((a) => (
              <AppointmentCard
                key={a.id}
                apt={a}
                nearOnline={a.id === nearId}
                countdownSec={countdownSec}
                onOpen={() => history.push(`/m/appointments/${a.id}`)}
                onCancel={() => cancelQuick(a)}
                onReschedule={() => history.push(`/m/book?reschedule=${a.id}`)}
                onJoin={() => history.push(`/m/telemed?apt=${a.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Calendar action sheet — Figma 173:82996 · generic date picker (no availableKeys → every day selectable) */}
      <BookingCalendarSheet
        open={calOpen}
        selectedKey={dateFilter}
        onSelect={(key) => setDateFilter(key)}
        onClose={() => setCalOpen(false)}
      />
    </div>
  );
};

const MobileAppointmentsPage = () => (
  <MobileShell
    requireAuth
    background='var(--background-screen-brand-100, #F4FBF8)'
    statusBarStyle={{ height: 'var(--dim-size-1050, 50px)' }}
  >
    <MobileAppointmentsInner />
  </MobileShell>
);

export default MobileAppointmentsPage;
