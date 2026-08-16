import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  MobileShell,
  Sym,
  BrandButton,
  BrandSubdueButton,
  ServiceRequestCard,
} from '@/components/mobile';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import { CURRENT_USER, BILLS, REQUEST_TYPES, resolveDoctorAvatar } from '@/data/mobileMock';
import { usePhcisLink } from '@/data/phcisLink';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import { MOBILE_ICON_TONES, MOBILE_SERVICE_META } from '@/components/mobile/mobileIconTones';
import ColorfulIconBadge from '@/components/badge/ColorfulIconBadge';
import MobileIconBadge from '@/components/mobile/MobileIconBadge';
import { getConsentRecords, subscribeConsentStore, MOBILE_DEMO_HN } from '@/data/consentWorkflowStore';
import { CONSENT_TYPE_TONE } from '@/data/consentRecords';

/* BMA Health · Home — Archive Figma 4WXeI8fgBLQGgQ9VheM2yD · 124:6012
   (also mirrored in Mobile Application 6dCDQkwc8DhvyovBbDTyp5 · 2042:27492).
   Cases:
   · มีนัด 1 ใบ / หลายใบ → แสดงการ์ดตามจำนวน (carousel ถ้า >1)
   · ไม่มีนัด → Hide Appointment Section
   · Online + ใกล้ถึง ≤15 นาที → countdown + เข้าห้องวิดีโอคอล
   · ไม่ใช่ online ใกล้ถึง → แสดงสถานะใกล้ถึงนัด โดยไม่มีปุ่มวิดีโอ */

const THAI_MONTHS_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const THAI_WEEKDAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

const C = {
  brand: 'var(--text-brandPrimary-default, #007549)',
  ink: 'var(--text-content-default, #111314)',
  muted: 'var(--text-content-tertiary, #858C92)',
  card: 'var(--surface-card-100, #FFFFFF)',
  white: 'var(--text-content-on-content, #FFFFFF)',
  borderBrand: 'var(--border-brandPrimary-quaternary, #E2F3EB)',
  borderApt: 'var(--border-brandPrimary-secondary, #6AD6A5)',
};

const todayThaiFull = () => {
  const d = new Date();
  return `${THAI_WEEKDAYS[d.getDay()]}ที่ ${d.getDate()} ${THAI_MONTHS_FULL[d.getMonth()]} ${d.getFullYear() + 543}`;
};

const formatCountdown = (sec) => {
  const s = Math.max(0, Math.floor(sec));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

/* Demo: first upcoming video apt is treated as "within 15 minutes". */
const NEAR_WINDOW_SEC = 15 * 60;

const Avatar = ({ src, alt, size = 56, fallback, ring = true }) => (
  <div
    className='overflow-hidden shrink-0'
    style={{
      width: size,
      height: size,
      borderRadius: 'var(--dim-radius-full)',
      border: ring ? `var(--dim-stroke-200, 2px) solid ${C.white}` : 'none',
      background: 'var(--surface-neutral-tertiary, #F4F5F5)',
    }}
  >
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      onError={(e) => {
        if (fallback && e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
        else e.currentTarget.style.display = 'none';
      }}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  </div>
);

/* ─── Hero ──────────────────────────────────────────────────────────── */
const Hero = () => {
  const history = useHistory();
  const hn = CURRENT_USER.centers?.[0]?.hn || '67-004321';

  return (
    <div
      className='flex items-start'
      style={{
        /* Figma 124:5378 — pl-400 · pr-200 · gap-300 */
        padding: '0 var(--dim-space-200, 8px) 0 var(--dim-space-400, 16px)',
        gap: 'var(--dim-space-300, 12px)',
        color: C.white,
      }}
    >
      <Avatar
        src={CURRENT_USER.avatar || '/illustration/mobile/user-a.png'}
        fallback='/illustration/mobile/user-a.png'
        alt={CURRENT_USER.firstName}
        size={56}
      />
      <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-base, 16px)',
              fontWeight: 'var(--type-weight-bold, 700)',
              lineHeight: 1.5,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            สวัสดี, {CURRENT_USER.prefix}{CURRENT_USER.firstName}
          </p>
          <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug'>
            HN: {hn}
          </ColorfulBadge>
        </div>
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs, 12px)',
            fontWeight: 'var(--type-weight-regular, 400)',
            lineHeight: 1.5,
            color: C.white,
          }}
        >
          {todayThaiFull()}
        </p>
      </div>
      {/* Figma 124:5564 — Brand Circle Subdue on teal = white glyph, no fill */}
      <button
        type='button'
        aria-label='การแจ้งเตือน'
        onClick={() => history.push('/m/notifications')}
        className='inline-flex items-center justify-center shrink-0'
        style={{
          position: 'relative',
          width: 48,
          height: 48,
          borderRadius: 'var(--dim-radius-full)',
          border: 0,
          background: 'transparent',
          color: C.white,
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <Sym name='notifications' size={20} color={C.white} />
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 8,
            height: 8,
            borderRadius: 'var(--dim-radius-full)',
            background: 'var(--surface-danger-default, #DC2626)',
            pointerEvents: 'none',
          }}
        />
      </button>
    </div>
  );
};

/* ─── Quick actions ───────────────────────────────────────────────────
   Archive Figma quick menu 189:142123
   · Medications / Booking / Results / Centre (ศูนย์บริการ)
   · + Centre ส่งคำขอ 519:54748 (Send)
   Press: Booking 519:54747 pattern — art tiles swap SVG; solid tiles swap bg. */
const QUICK_ACTIONS = [
  {
    key: 'meds',
    icon: 'pill',
    label: 'ยาของฉัน',
    path: '/m/records',
    tone: 'purple',
    art: '/illustration/mobile/home-qa-meds.svg',
    artPressed: '/illustration/mobile/home-qa-meds-pressed.svg',
  },
  {
    key: 'book',
    icon: 'calendar_add_on',
    label: 'จองนัดหมาย',
    path: '/m/book',
    tone: 'blue',
    art: '/illustration/mobile/home-qa-book.svg',
    artPressed: '/illustration/mobile/home-qa-book-pressed.svg',
  },
  /* Figma Home 2042:26021 — File text (not Material description) */
  { key: 'records', icon: 'file-text', label: 'ผลการรักษา', path: '/m/records', tone: 'green', art: null },
  {
    key: 'clinics',
    icon: 'map-pin',
    label: 'ศูนย์บริการ',
    path: '/m/clinics',
    tone: 'pink',
    art: '/illustration/mobile/home-qa-clinics.svg',
    artPressed: '/illustration/mobile/home-qa-clinics-pressed.svg',
  },
  /* Archive Figma 519:54748 — Quick Action Centre · ส่งคำขอ · Send */
  {
    key: 'requests',
    icon: 'send',
    label: 'ส่งคำขอ',
    path: '/m/requests',
    tone: 'purple',
    art: '/illustration/mobile/home-qa-request.svg',
    artPressed: '/illustration/mobile/home-qa-request-pressed.svg',
  },
];

const QuickActions = () => {
  const history = useHistory();
  const [pressedKey, setPressedKey] = useState(null);

  const clearPress = () => setPressedKey(null);

  return (
    /* Figma 189:142123 — quick menu sits directly on the white sheet:
       fixed 64px actions; the viewport reveals about 4½ actions and the
       remaining item is reached by horizontal touch scrolling. */
    <div
      className='scrollbar-hide-native flex items-center overflow-x-auto'
      aria-label='เมนูทางลัด'
      style={{
        /* 402px frame − 24px left inset: show 4 full 64px actions +
           four 16px gaps + half of the fifth action. The 8px inner gutters
           keep the edge item from being clipped while scrolling. */
        width: 'calc(100% - var(--dim-space-500, 20px) + var(--dim-space-050, 2px))',
        marginLeft: 'calc(-1 * var(--dim-space-200, 8px))',
        paddingInline: 'var(--dim-space-200, 8px)',
        gap: 'var(--dim-space-400, 16px)',
        scrollSnapType: 'x proximity',
        scrollPaddingLeft: 'var(--dim-space-200, 8px)',
        WebkitOverflowScrolling: 'touch',
        overscrollBehaviorInline: 'contain',
      }}
    >
      {QUICK_ACTIONS.map((a) => {
        const palette = MOBILE_ICON_TONES[a.tone];
        const pressed = pressedKey === a.key;
        const artSrc = pressed && a.artPressed ? a.artPressed : a.art;
        return (
          <button
            key={a.key}
            type='button'
            onClick={() => history.push(a.path)}
            onPointerDown={() => setPressedKey(a.key)}
            onPointerUp={clearPress}
            onPointerCancel={clearPress}
            onPointerLeave={clearPress}
            style={{
              flex: '0 0 var(--dim-size-1400, 64px)',
              width: 'var(--dim-size-1400, 64px)',
              minWidth: 'var(--dim-size-1400, 64px)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--dim-space-100, 4px)',
              padding: 0,
              color: C.ink,
              WebkitTapHighlightColor: 'transparent',
              scrollSnapAlign: 'start',
            }}
          >
            <span
              className='inline-flex items-center justify-center overflow-hidden'
              style={{
                width: 'var(--dim-size-1400, 64px)',
                height: 'var(--dim-size-1400, 64px)',
                borderRadius: 'var(--dim-radius-full, 9999px)',
                background: a.art
                  ? 'transparent'
                  : (pressed ? (palette.bgPressed || palette.bg) : palette.bg),
                flexShrink: 0,
                transition: 'background-color 80ms ease',
              }}
            >
              {artSrc ? (
                <img
                  src={artSrc}
                  alt=''
                  width={64}
                  height={64}
                  draggable={false}
                  style={{
                    width: 'var(--dim-size-1400, 64px)',
                    height: 'var(--dim-size-1400, 64px)',
                    objectFit: 'contain',
                    display: 'block',
                    pointerEvents: 'none',
                  }}
                />
              ) : (
                <Sym name={a.icon} size={24} color={palette.fg} fill />
              )}
            </span>
            <span
              style={{
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-xs, 12px)',
                textAlign: 'center',
                lineHeight: 1.5,
                whiteSpace: 'nowrap',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {a.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

/* ─── Payment banner — Archive Figma 284:39950 ──────────────────────── */
const PAYMENT_HERO_LOTTIE = '/illustration/mobile/home-payment-health-insurance.json';
const PAYMENT_HERO_FALLBACK = '/illustration/mobile/home-payment-hero.png';
const PAYMENT_HERO_SIZE = 80;

const PaymentBanner = () => {
  const history = useHistory();
  const { appointments } = usePhcisLink();
  const pending = BILLS.find((b) => b.status === 'pending');
  const hasCompletedTelemed = appointments.some((appointment) => appointment.telemedDone);
  const [heroAnim, setHeroAnim] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch(PAYMENT_HERO_LOTTIE)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setHeroAnim(d); })
      .catch(() => { /* PNG fallback */ });
    return () => { alive = false; };
  }, []);

  if (!hasCompletedTelemed || !pending) return null;

  const goPay = () => history.push(`/m/payment/${pending.id}`);

  return (
    <div
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: 'var(--dim-space-400, 16px)',
        borderRadius: 'var(--dim-radius-600, 24px)',
        background: 'linear-gradient(146.05deg, rgb(243, 132, 161) 1.19%, rgb(214, 128, 182) 128.22%)',
        boxShadow: 'var(--shadow-brand-drop-bottom-200)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--dim-space-200, 8px)',
        overflow: 'hidden',
      }}
    >
      {/* Payment Banner row — gap-200 · illus 80 · text gap-150 */}
      <div
        className='flex items-start w-full'
        style={{ gap: 'var(--dim-space-200, 8px)' }}
      >
        <span
          className='overflow-hidden shrink-0'
          style={{ width: PAYMENT_HERO_SIZE, height: PAYMENT_HERO_SIZE }}
        >
          {heroAnim ? (
            <LottieIllustration
              animationData={heroAnim}
              size={PAYMENT_HERO_SIZE}
              loop
              ariaLabel=''
            />
          ) : (
            <img
              src={PAYMENT_HERO_FALLBACK}
              alt=''
              width={PAYMENT_HERO_SIZE}
              height={PAYMENT_HERO_SIZE}
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
          )}
        </span>
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{ gap: 'var(--dim-space-150, 6px)' }}
        >
          {/* Figma text style h5-emphasis — Archive 284:39953 */}
          <p
            style={{
              margin: 0,
              width: '100%',
              fontFamily: 'var(--type-h5-emphasis-family, var(--type-family-heading-graphic2))',
              fontSize: 'var(--type-h5-emphasis-size, var(--type-size-lg, 18px))',
              fontWeight: 'var(--type-h5-emphasis-weight, var(--type-weight-medium, 500))',
              lineHeight: 'var(--type-h5-emphasis-leading, 1.5)',
              letterSpacing: 0,
              color: 'var(--text-content-on-content, #FFFFFF)',
            }}
          >
            พร้อมชำระเงินแล้ว
          </p>
          {/* Figma text style label1 — Archive 284:39954 */}
          <p
            style={{
              margin: 0,
              width: '100%',
              fontFamily: 'var(--type-label1-family, var(--type-family-body))',
              fontSize: 'var(--type-label1-size, var(--type-size-sm, 14px))',
              fontWeight: 'var(--type-label1-weight, var(--type-weight-medium, 500))',
              lineHeight: 'var(--type-label1-leading, 1.5)',
              letterSpacing: 0,
              color: 'color-mix(in srgb, var(--text-content-on-content, #FFFFFF) 80%, transparent)',
            }}
          >
            เภสัชกรจัดยาสำหรับการปรึกษาวันที่ 1 ก.ค. 2569 เรียบร้อยแล้ว
          </p>
        </div>
      </div>

      {/* Brand Button · Medium · white fill — Figma 284:39955 (48h · hug · chevron 20) */}
      <BrandButton
        size='Medium'
        buttonStyle='Fill'
        showLeadingIcon={false}
        showTailingIcon
        trailingIcon='chevron_right'
        fullWidth={false}
        onClick={goPay}
        style={{
          background: 'var(--surface-card-100, #FFFFFF)',
          color: 'var(--text-neutral-default, #4D5358)',
          width: 'auto',
          minWidth: 'var(--dim-size-1700, 80px)',
          maxWidth: 'var(--dim-size-2600, 384px)',
          flexShrink: 0,
          boxShadow: 'var(--mobile-button-shadow-fill)',
        }}
      >
        ชำระเงิน
      </BrandButton>
    </div>
  );
};

/* ─── Section head ──────────────────────────────────────────────────── */
/* Figma Home sections: title + optional count badge only (no ดูทั้งหมด).
   Count = Status Badge 371:44807 — hug · h18 · px-200 · py-0 · type xs medium */
const SectionHead = ({ title, count }) => (
  <div className='flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
    <h3
      style={{
        margin: 0,
        fontFamily: 'var(--type-family-heading-graphic2)',
        fontSize: 'var(--type-size-lg, 18px)',
        fontWeight: 'var(--type-weight-regular, 400)',
        color: C.brand,
        lineHeight: 1.5,
      }}
    >
      {title}
    </h3>
    {count != null && count > 0 && (
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
        {String(count)}
      </StatusBadge>
    )}
  </div>
);

/* Horizontal carousel track — overflow-x clips box-shadow on the first/last
   card. Bleed space-200 outside via negative margin, then pad the same amount
   so cards stay aligned with the section title while Brand Drop Bottom/200
   (blur ≤8px) paints inside the scrollport. */
const carouselTrackStyle = (gap) => ({
  gap,
  marginInline: 'calc(-1 * var(--dim-space-200, 8px))',
  paddingInline: 'var(--dim-space-200, 8px)',
  paddingBottom: 'var(--dim-space-200, 8px)',
});

const DetailCell = ({ icon, label, value, flex = 1 }) => (
  <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)', flex, minWidth: 0 }}>
    <MobileIconBadge
      icon={icon}
      tone='green'
      size='var(--dim-size-600, 32px)'
      iconSize={16}
    />
    <div className='min-w-0' style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-050, 2px)' }}>
      <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: C.muted, lineHeight: 1.5 }}>{label}</p>
      <p
        style={{
          margin: 0,
          fontSize: 'var(--type-size-sm, 14px)',
          fontWeight: 'var(--type-weight-bold, 700)',
          color: C.ink,
          lineHeight: 1.5,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </p>
    </div>
  </div>
);

/* ─── Appointment card ────────────────────────────────────────────────
   Archive Figma Home 369:42229 · Group card_more than 1 (367:41054)
   · Default cards: no top stroke · status from aptStatus · divider +
     ยกเลิก (Subdue outline) / เลื่อนนัด (Brand outline)
   · nearOnline + video: top brand stroke · countdown · เข้าห้องวิดีโอคอล */
const HOME_APT_STATUS = {
  confirmed: { style: 'success', label: 'ยืนยันแล้ว' },
  pending: { style: 'warning', label: 'รอยืนยัน' },
};

const isTodayBeDate = (beDate) => {
  const [year, month, day] = String(beDate || '').split('-').map(Number);
  if (!year || !month || !day) return false;
  const today = new Date();
  return (
    year === today.getFullYear() + 543
    && month === today.getMonth() + 1
    && day === today.getDate()
  );
};

const AppointmentCard = ({ apt, nearOnline, countdownSec, width = '100%' }) => {
  const history = useHistory();
  const isOnline = apt.type === 'video';
  const serviceMeta = MOBILE_SERVICE_META[apt.type] || MOBILE_SERVICE_META.visit;
  const location = apt.locationLabel || (apt.clinic === 'BNA' ? 'ศูนย์ 08, บางนา' : 'ศูนย์บริการ');
  const dateLabel = (() => {
    const parts = String(apt.date || '').split('-').map(Number);
    if (parts.length < 3) return apt.date;
    const [, mm, dd] = parts;
    const short = `${dd} ${THAI_MONTHS_SHORT[mm - 1]}`;
    return nearOnline || isTodayBeDate(apt.date) ? `วันนี้, ${short}` : short;
  })();
  const statusMeta = (() => {
    if (nearOnline && !isOnline) return { style: 'warning', label: 'ใกล้ถึงนัด' };
    return HOME_APT_STATUS[apt.aptStatus] || HOME_APT_STATUS.confirmed;
  })();
  const serviceTypeLabel = isOnline
    ? 'ออนไลน์ (Telemedicine)'
    : apt.type === 'homevisit'
      ? 'เยี่ยมบ้าน'
      : 'ที่ศูนย์บริการ';

  return (
    <div
      style={{
        width,
        flexShrink: 0,
        background: C.card,
        borderRadius: 'var(--dim-radius-500, 16px)',
        borderTop: nearOnline
          ? `var(--dim-stroke-500, 5px) solid ${C.borderApt}`
          : undefined,
        boxShadow: 'var(--shadow-brand-drop-bottom-200)',
        padding: 'var(--dim-space-400, 16px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--dim-space-300, 12px)',
      }}
    >
      <div className='flex items-center justify-between' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <ColorfulBadge style={serviceMeta.badgeStyle} size='small' hierarchy='secondary' width='hug' showIcon icon={serviceMeta.icon}>
          {serviceMeta.badgeLabel}
        </ColorfulBadge>
        <StatusBadge style={statusMeta.style} size='small'>
          {statusMeta.label}
        </StatusBadge>
      </div>

      <div
        className='flex items-start'
        style={{
          gap: 'var(--dim-space-200, 8px)',
          padding: 'var(--dim-space-300, 12px)',
          background: 'var(--surface-info-quaternary, #F4F9FD)',
          borderRadius: 'var(--dim-radius-400, 12px)',
        }}
      >
        <Avatar
          src={apt.doctorAvatar || resolveDoctorAvatar(apt.doctor)}
          alt={apt.doctor}
          size={40}
          ring={false}
        />
        <div
          className='flex flex-col min-w-0'
          style={{ gap: 'var(--dim-space-050, 2px)', lineHeight: 1.5 }}
        >
          <p style={{ margin: 0, fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-sm, 14px)', color: C.ink, lineHeight: 1.5 }}>
            {apt.doctor}
          </p>
          <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: C.muted, lineHeight: 1.5 }}>{apt.deptLabel}</p>
        </div>
      </div>

      {/* Figma Home 2042:26021 — Calendar · Clock · Map pin · Video */}
      <div className='flex items-center' style={{ gap: 'var(--dim-space-400, 16px)', width: '100%' }}>
        <DetailCell icon='calendar' label='วันที่' value={dateLabel} />
        <DetailCell icon='clock' label='เวลา' value={`${apt.time} น.`} />
      </div>

      <DetailCell icon='map-pin' label='ศูนย์ให้บริการ' value={location} />
      <DetailCell
        icon={serviceMeta.icon}
        label='ประเภทการเข้ารับบริการ'
        value={serviceTypeLabel}
      />

      {nearOnline && (
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
              color: C.brand,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--dim-space-150, 6px)',
              padding: 'var(--dim-space-200, 8px) 0',
              lineHeight: 1.5,
            }}
          >
            {/* Figma countdown Clock fill #08A768; label stays brand/700 */}
            <Sym name='clock' size={16} color='var(--text-brandPrimary-secondary, #08A768)' />
            เริ่มใน {formatCountdown(countdownSec)} นาที
          </p>
        </>
      )}

      {/* Figma 149:35429 + 153:50935 — near-online video:
          Brand Button (เข้าห้อง) then Brand Subdue Outline (ยกเลิก) */}
      {nearOnline && isOnline ? (
        <>
          <BrandButton
            variant='fill'
            size='md'
            leadingIcon='video'
            onClick={() => history.push('/m/telemed')}
          >
            เข้าห้องวิดีโอคอล
          </BrandButton>
          <BrandSubdueButton
            variant='outline'
            size='md'
            fullWidth
            onClick={() => history.push(`/m/appointments/${apt.id}`)}
          >
            ยกเลิก
          </BrandSubdueButton>
        </>
      ) : (
        <>
          {/* Figma 367:41054 / 369:42229 — Brand Subdue Outline ยกเลิก + Brand Outline เลื่อนนัด */}
          {!nearOnline && (
            <div
              aria-hidden
              style={{
                width: '100%',
                height: 'var(--dim-stroke-100, 1px)',
                background: 'var(--border-neutral-quaternary, #F4F5F5)',
              }}
            />
          )}
          <div className='flex' style={{ gap: 'var(--dim-space-300, 12px)', width: '100%' }}>
            <BrandSubdueButton
              variant='outline'
              size='md'
              style={{ flex: 1 }}
              onClick={() => history.push(`/m/appointments/${apt.id}`)}
            >
              ยกเลิก
            </BrandSubdueButton>
            <BrandButton
              variant='outline'
              size='md'
              style={{ flex: 1 }}
              onClick={() => history.push(`/m/book?reschedule=${apt.id}`)}
            >
              เลื่อนนัด
            </BrandButton>
          </div>
        </>
      )}
    </div>
  );
};

const NextAppointments = () => {
  const { appointments } = usePhcisLink();
  const upcoming = useMemo(
    () => appointments.filter((a) => a.status === 'upcoming'),
    [appointments],
  );

  const [countdownSec, setCountdownSec] = useState(NEAR_WINDOW_SEC);

  useEffect(() => {
    if (!upcoming.length) return undefined;
    const id = window.setInterval(() => {
      setCountdownSec((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [upcoming.length]);

  if (!upcoming.length) return null;

  const first = upcoming[0];
  const nearOnline = first.type === 'video' && !!first.nearStart;
  const multi = upcoming.length > 1;

  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)', width: '100%' }}>
      <SectionHead title='นัดหมายถัดไป' count={upcoming.length} />
      {multi ? (
        <div className='flex overflow-x-auto' style={carouselTrackStyle('var(--dim-space-400, 16px)')}>
          {upcoming.map((apt, i) => (
            <AppointmentCard
              key={apt.id}
              apt={apt}
              nearOnline={i === 0 && nearOnline}
              countdownSec={countdownSec}
              width='var(--dim-size-2500, 320px)'
            />
          ))}
        </div>
      ) : (
        <AppointmentCard
          apt={first}
          nearOnline={nearOnline}
          countdownSec={countdownSec}
        />
      )}
    </div>
  );
};

/* ─── ส่งคำขอ — Archive Figma card group 194:153207 ─────────────────── */
/* Figma SVG icons for the first three; remaining use Material via `icon`. */
const REQUEST_ICON_SRC = {
  sanitizer: '/illustration/mobile/request-sanitizer.svg',
  diapers: '/illustration/mobile/request-diaper.svg',
};

const RequestsCarousel = () => {
  const history = useHistory();
  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)', width: '100%' }}>
      <SectionHead title='ส่งคำขอ' count={REQUEST_TYPES.length} />
      <div className='flex overflow-x-auto' style={carouselTrackStyle('var(--dim-space-300, 12px)')}>
        {REQUEST_TYPES.map((card) => (
          <ServiceRequestCard
            key={card.key}
            label={card.label}
            badgeStyle={card.tone}
            icon={card.icon}
            iconSrc={REQUEST_ICON_SRC[card.key]}
            onClick={() => history.push(`/m/requests?type=${card.key}`)}
          />
        ))}
      </div>
    </div>
  );
};

/* ─── ประวัติการรักษา ───────────────────────────────────────────────── */
const VisitHistoryCard = ({ visit, onClick }) => {
  const meta = MOBILE_SERVICE_META[visit.type] || MOBILE_SERVICE_META.visit;
  return (
    <div
      onClick={onClick}
      role='button'
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        flex: '0 0 320px',
        width: 320,
        padding: 'var(--dim-space-400, 16px)',
        background: C.card,
        borderRadius: 'var(--dim-radius-500, 16px)',
        boxShadow: 'var(--shadow-brand-drop-bottom-200)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--dim-space-300, 12px)',
      }}
    >
      <div className='flex items-center' style={{ gap: 'var(--dim-space-150, 6px)' }}>
        {/* Archive Figma 194:153538 — Colorful icon Badge · Purple · Medium · Calendar */}
        <ColorfulIconBadge style='purple' size='medium' icon='calendar' />
        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            fontWeight: 'var(--type-weight-bold, 700)',
            color: C.ink,
            lineHeight: 1.5,
          }}
        >
          {visit.date}
        </span>
      </div>

      <div
        aria-hidden
        style={{
          width: '100%',
          height: 'var(--dim-stroke-100, 1px)',
          background: 'var(--border-neutral-quaternary, #F4F5F5)',
        }}
      />

      <div className='flex items-center justify-between' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <span
          className='inline-flex items-center'
          style={{
            gap: 'var(--dim-space-100, 4px)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            fontWeight: 'var(--type-weight-medium, 500)',
            color: C.muted,
            lineHeight: 1.5,
          }}
        >
          <Sym name='clock' size={14} color={C.muted} />
          {visit.time} น.
        </span>
        <ColorfulBadge
          style={meta.badgeStyle}
          size='small'
          hierarchy='secondary'
          width='hug'
          showIcon
          icon={meta.icon}
        >
          {meta.badgeLabel}
        </ColorfulBadge>
      </div>

      <p
        style={{
          margin: 0,
          fontFamily: 'var(--type-family-heading-graphic2)',
          fontSize: 'var(--type-size-sm, 14px)',
          fontWeight: 'var(--type-weight-regular, 400)',
          color: C.ink,
          lineHeight: 1.5,
        }}
      >
        {visit.title || visit.cc || visit.dept}
      </p>

      <div
        className='flex items-start'
        style={{
          gap: 'var(--dim-space-200, 8px)',
          padding: 'var(--dim-space-300, 12px)',
          background: 'var(--surface-info-quaternary, #F4F9FD)',
          borderRadius: 'var(--dim-radius-400, 12px)',
        }}
      >
        <Avatar src={visit.doctorAvatar || resolveDoctorAvatar(visit.doctor)} alt={visit.doctor} size={40} ring={false} />
        <div className='min-w-0' style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-050, 2px)' }}>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-sm, 14px)',
              color: C.ink,
              lineHeight: 1.5,
            }}
          >
            {visit.doctor}
          </p>
          <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: C.muted, lineHeight: 1.5 }}>
            {visit.dept}
          </p>
        </div>
      </div>

      <div
        className='flex items-center'
        style={{
          gap: 'var(--dim-space-200, 8px)',
          minHeight: 56,
          padding: 'var(--dim-space-200, 8px) var(--dim-space-300, 12px)',
          background: 'var(--surface-list-default, #FFFFFF)',
          borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
          borderRadius: 'var(--dim-radius-150, 6px)',
        }}
      >
        {/* Figma List 194:153552 — text/list/default (#4D5358) · body sm regular */}
        <span
          className='flex-1 min-w-0'
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            fontWeight: 'var(--type-weight-regular, 400)',
            lineHeight: 1.5,
            color: 'var(--text-list-default, #4D5358)',
          }}
        >
          ดูผลตรวจหรือบันทึกการรักษา
        </span>
        <Sym name='chevron-right' size={16} color='var(--icon-list-secondary, #858C92)' />
      </div>
    </div>
  );
};

/* แบบฟอร์มที่รอผู้ใช้ลงนาม (สถานะ รอลงนาม / อยู่ระหว่างลงนาม) — TOR 1.5.11
   ซ่อนทั้ง section เมื่อไม่มีรายการ · กดแล้วไปทำต่อที่ /m/consent
   (ยืนยันตัวตน + กรอกเอกสารอยู่ที่นั่น ไม่ทำซ้ำบน Home) */
const PendingConsentSection = () => {
  const history = useHistory();
  const myHns = useMemo(
    () => [...new Set([...(CURRENT_USER.centers || []).map((c) => c.hn), MOBILE_DEMO_HN])],
    [],
  );
  const readPending = () => getConsentRecords()
    .filter((r) => myHns.includes(r.hn) && ['รอลงนาม', 'อยู่ระหว่างลงนาม'].includes(r.status))
    .sort((a, b) => b.id - a.id);
  const [pending, setPending] = useState(readPending);
  useEffect(() => subscribeConsentStore(() => setPending(readPending())), []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!pending.length) return null;
  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)', paddingRight: 'var(--dim-space-600, 24px)' }}>
      <SectionHead title='แบบฟอร์มที่ต้องให้ความยินยอม' count={pending.length} />
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        {pending.slice(0, 3).map((r) => (
          <button
            key={r.id}
            type='button'
            onClick={() => history.push('/m/consent')}
            className='flex items-center text-left w-full'
            style={{
              gap: 'var(--dim-space-300, 12px)',
              padding: 'var(--dim-space-300, 12px)',
              background: C.card,
              border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
              borderRadius: 'var(--dim-radius-400, 12px)',
              boxShadow: 'var(--shadow-brand-drop-bottom-200)',
              cursor: 'pointer',
            }}
          >
            <MobileIconBadge icon='contract_edit' tone='green' size={40} iconSize={20} />
            <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <ColorfulBadge style={CONSENT_TYPE_TONE[r.type] || 'teal'} size='small' hierarchy='secondary' width='hug'>
                  {r.type}
                </ColorfulBadge>
                <ColorfulBadge style='orange' size='small' hierarchy='secondary' width='hug'>
                  รอลงนาม
                </ColorfulBadge>
              </div>
              <span style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm, 14px)',
                lineHeight: 1.5,
                color: C.ink,
              }}
              >
                {r.formName}
              </span>
            </div>
            <Sym name='chevron_right' size={20} color='var(--icon-list-secondary, #858C92)' />
          </button>
        ))}
      </div>
    </div>
  );
};

const HistoryCarousel = () => {
  const history = useHistory();
  const { visits } = usePhcisLink();
  if (!visits.length) return null;
  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)', width: '100%' }}>
      <SectionHead title='ประวัติการรักษา' />
      <div className='flex overflow-x-auto' style={carouselTrackStyle('var(--dim-space-300, 12px)')}>
        {visits.slice(0, 4).map((visit) => (
          <VisitHistoryCard
            key={visit.id}
            visit={visit}
            onClick={() => history.push(`/m/visit/${visit.id}`)}
          />
        ))}
      </div>
    </div>
  );
};

/* ─── Page ──────────────────────────────────────────────────────────── */
const HOME_HERO_GRADIENT = 'linear-gradient(71.27deg, #13B292 58.07%, #00A08E 83.06%)';

const MobileHomeInner = () => (
  <div
    className='flex flex-col'
    style={{
      minHeight: '100%',
      /* Figma 124:6012 — gap-400 between hero + sheet */
      gap: 'var(--dim-space-400, 16px)',
      backgroundImage: HOME_HERO_GRADIENT,
    }}
  >
    <Hero />
    <div
      style={{
        flex: 1,
        /* Figma 189:142122 — radius-600 top corners · white → brand soft */
        background: 'linear-gradient(180deg, var(--surface-card-100, #FFFFFF) 0%, var(--surface-card-brand-100, #F4FBF8) 100%)',
        borderTopLeftRadius: 'var(--dim-radius-600, 24px)',
        borderTopRightRadius: 'var(--dim-radius-600, 24px)',
        /* Full-bleed sheet; section content owns its 24px left inset. */
        padding: 'var(--dim-space-600, 24px) 0',
        boxShadow: '0 -16px 16px rgba(100, 116, 139, 0.25)',
      }}
    >
      <div
        className='flex flex-col'
        style={{
          width: '100%',
          paddingLeft: 'var(--dim-space-600, 24px)',
          gap: 'var(--dim-space-600, 24px)',
        }}
      >
        <QuickActions />
        <div
          style={{
            width: 'calc(100% - var(--dim-space-400, 16px))',
            marginLeft: 'calc(-1 * var(--dim-space-100, 4px))',
          }}
        >
          <PaymentBanner />
        </div>
        <PendingConsentSection />
        <NextAppointments />
        <RequestsCarousel />
        <HistoryCarousel />
      </div>
    </div>
  </div>
);

const MobileHomePage = () => (
  <MobileShell
    requireAuth
    showStatusBar
    showBottomNav
    statusBarTone='onBrand'
    background={HOME_HERO_GRADIENT}
  >
    <MobileHomeInner />
  </MobileShell>
);

export default MobileHomePage;
