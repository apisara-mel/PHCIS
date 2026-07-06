import React from 'react';
import { useHistory } from 'react-router-dom';
import {
  MobileShell,
  Sym,
} from '@/components/mobile/MobileShell';
import { CURRENT_USER } from '@/data/mobileMock';
import { usePhcisLink } from '@/data/phcisLink';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import { MOBILE_ICON_TONES, MOBILE_SERVICE_META } from '@/components/mobile/mobileIconTones';
import MobileIconBadge from '@/components/mobile/MobileIconBadge';

/* MIH PHCIS Mobile · Home — Figma Mobile Application 6dCDQkwc8DhvyovBbDTyp5 · 124:6012.
   Hero · 4 quick actions · next appointment (online) · ส่งคำขอ carousel · ประวัติการรักษา */

const THAI_MONTHS_FULL  = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                           'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const THAI_MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
                           'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const THAI_WEEKDAYS = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];

/* Use today's date for the hero (Thai full format e.g. "พุธที่ 6 พฤษภาคม 2569"). */
const todayThaiFull = () => {
  const d = new Date();
  return `${THAI_WEEKDAYS[d.getDay()]}ที่ ${d.getDate()} ${THAI_MONTHS_FULL[d.getMonth()]} ${d.getFullYear() + 543}`;
};

/* ─── Hero ───────────────────────────────────────────────────────────── */
const Hero = () => {
  const history = useHistory();
  return (
    <div
      style={{
        padding: 'var(--dim-space-500, 20px) var(--dim-space-500, 20px) calc(var(--dim-space-700, 28px) + var(--dim-space-500, 20px))',
        background: 'linear-gradient(160deg, #0A8268 0%, #18A688 45%, #4CC6AE 100%)',
        color: '#FFFFFF',
        borderBottomLeftRadius: 'var(--dim-radius-500, 16px)',
        borderBottomRightRadius: 'var(--dim-radius-500, 16px)',
        position: 'relative',
      }}
    >
      <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <img
            src={CURRENT_USER.avatar}
            alt={CURRENT_USER.firstName}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
            style={{
              width: 52, height: 52,
              borderRadius: 'var(--dim-radius-full)',
              objectFit: 'cover',
              border: '2px solid rgba(255,255,255,0.85)',
            }}
          />
          <span style={{
            position: 'absolute', bottom: -2, right: -2,
            width: 14, height: 14, borderRadius: '50%',
            background: '#3DD49F',
            border: '2px solid #FFFFFF',
          }} />
        </div>

        <div className='flex-1 min-w-0'>
          <p style={{
            margin: 0,
            fontFamily: 'var(--type-family-display)',
            fontSize: 'var(--type-size-lg, 18px)',
            fontWeight: 'var(--type-weight-bold, 700)',
            lineHeight: 1.25,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            สวัสดี, {CURRENT_USER.prefix}{CURRENT_USER.firstName}
          </p>
          <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug'>
            HN: {CURRENT_USER.centers[0].hn}
          </ColorfulBadge>
          <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', opacity: 0.92 }}>
            {todayThaiFull()}
          </p>
        </div>

        <button
          type='button'
          onClick={() => history.push('/m/news')}
          aria-label='การแจ้งเตือน'
          style={{
            width: 40, height: 40,
            background: 'rgba(255,255,255,0.18)',
            border: '1px solid rgba(255,255,255,0.35)',
            borderRadius: 'var(--dim-radius-full)',
            color: '#FFFFFF', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <Sym name='notifications' size={20} fill />
          <span style={{
            position: 'absolute', top: 6, right: 8,
            width: 8, height: 8, borderRadius: '50%',
            background: '#FF5A5F',
            border: '1.5px solid #FFFFFF',
          }} />
        </button>
      </div>

      {/* Info chip — dark teal pill below the greeting row. Wraps if Thai
          fits onto two lines on narrow widths. */}
      <div
        className='flex items-center'
        style={{
          marginTop: 'var(--dim-space-400, 16px)',
          background: 'rgba(0,0,0,0.22)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 'var(--dim-radius-full)',
          padding: '6px var(--dim-space-400, 16px)',
          color: '#FFFFFF',
          fontSize: 'var(--type-size-xs, 12px)',
          fontWeight: 'var(--type-weight-medium, 500)',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ width: 6, height: 6, background: '#7AF0C8', borderRadius: '50%', flexShrink: 0 }} />
        <span>HN {CURRENT_USER.centers[0].hn}</span>
        <span style={{ opacity: 0.55 }}>·</span>
        <span>สิทธิ์ {CURRENT_USER.centers[0].rights.replace('บัตรทอง (UC)', 'สปสช.')}</span>
        <span style={{ opacity: 0.55 }}>·</span>
        <span>โลหิต B+</span>
      </div>
    </div>
  );
};

/* ─── Quick actions ──────────────────────────────────────────────────── */
const QUICK_ACTIONS = [
  { key: 'meds',    icon: 'pill',            label: 'ยาของฉัน',     path: '/m/records', tone: 'purple' },
  { key: 'book',    icon: 'calendar_add_on', label: 'จองนัดหมาย',   path: '/m/book',    tone: 'blue' },
  { key: 'records', icon: 'description',     label: 'ผลการรักษา',  path: '/m/records', tone: 'green' },
  { key: 'clinics', icon: 'location_on',     label: 'ศูนย์บริการ', path: '/m/clinics', tone: 'pink' },
];

const QuickActions = () => {
  const history = useHistory();
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 'var(--dim-space-200, 8px)',
        padding: 'var(--dim-space-400, 16px) var(--dim-space-200, 8px) 0',
      }}
    >
      {QUICK_ACTIONS.map((a) => {
        const palette = MOBILE_ICON_TONES[a.tone];
        return (
          <button
            key={a.key}
            type='button'
            onClick={() => history.push(a.path)}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 'var(--dim-space-150, 6px)', padding: 'var(--dim-space-200, 8px) 0',
              color: 'var(--text-content-default)',
            }}
          >
            <span
              style={{
                width: 64, height: 64, borderRadius: 'var(--dim-radius-full)',
                background: palette.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Sym name={a.icon} size={24} color={palette.fg} fill />
            </span>
            <span style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs, 12px)',
              fontWeight: 'var(--type-weight-medium, 500)',
              textAlign: 'center',
              lineHeight: 1.3,
            }}>{a.label}</span>
          </button>
        );
      })}
    </div>
  );
};

/* ─── Section header (title + "ดูทั้งหมด ›" link) ─────────────────────── */
const SectionHead = ({ title, viewAllPath }) => {
  const history = useHistory();
  return (
    <div className='flex items-center justify-between' style={{ marginBottom: 'var(--dim-space-200, 8px)' }}>
      <h3 style={{
        margin: 0,
        fontFamily: 'var(--type-family-heading-graphic2)',
        fontSize: 'var(--type-size-base, 16px)',
        fontWeight: 'var(--type-weight-bold, 700)',
        color: 'var(--text-brandPrimary-default)',
      }}>{title}</h3>
      {viewAllPath && (
        <button type='button' onClick={() => history.push(viewAllPath)}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
            color: 'var(--text-brandPrimary-default, #007549)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            fontWeight: 'var(--type-weight-bold, 700)',
            display: 'inline-flex', alignItems: 'center', gap: 2,
          }}>
          ดูทั้งหมด <Sym name='chevron_right' size={16} />
        </button>
      )}
    </div>
  );
};

/* ─── Next appointment — Figma 124:6012 appointment card ─────────────── */
const NextAppointmentCard = () => {
  const history = useHistory();
  const { appointments } = usePhcisLink();
  const next = appointments.find((a) => a.status === 'upcoming');
  if (!next) return null;
  const isOnline = next.type === 'video';
  const serviceMeta = MOBILE_SERVICE_META[next.type] || MOBILE_SERVICE_META.visit;
  const location = next.locationLabel || (next.clinic === 'BNA' ? 'ศูนย์ 4, ดินแดง' : 'ศูนย์บริการ');
  const dateLabel = (() => {
    const [, mm, dd] = next.date.split('-').map(Number);
    return `วันนี้, ${dd} ${THAI_MONTHS_SHORT[mm - 1]}`;
  })();

  return (
    <div>
      <SectionHead title='นัดหมายถัดไป' />
      <div
        style={{
          background: 'var(--surface-card-100)',
          borderRadius: 'var(--dim-radius-500, 16px)',
          borderTop: 'var(--dim-stroke-500, 5px) solid var(--border-brandPrimary-secondary)',
          boxShadow: 'var(--shadow-card)',
          padding: 'var(--dim-space-400, 16px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--dim-space-300, 12px)',
        }}
      >
        <div className='flex items-center justify-between'>
          <ColorfulBadge style={serviceMeta.badgeStyle} size='small' hierarchy='secondary' width='hug' showIcon icon={serviceMeta.icon}>
            {serviceMeta.badgeLabel}
          </ColorfulBadge>
          <StatusBadge style='success' size='small'>ยืนยันแล้ว</StatusBadge>
        </div>

        <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <span
            className='inline-flex items-center justify-center shrink-0'
            style={{
              width: 48, height: 48, borderRadius: 'var(--dim-radius-full)',
              background: 'var(--surface-brandPrimary-default)',
              color: 'var(--text-brandPrimary-on-brand)',
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-sm)',
              fontWeight: 'var(--type-weight-bold)',
            }}
          >
            {next.doctor.replace(/[นพ\.พญ\.พ\.ว\.\s]/g, '').slice(0, 2)}
          </span>
          <div>
            <p style={{ margin: 0, fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)', color: 'var(--text-content-default)' }}>
              {next.doctor}
            </p>
            <p style={{ margin: 0, fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>{next.deptLabel}</p>
          </div>
        </div>

        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <DetailRow icon='calendar_today' label='วันที่' value={dateLabel} />
          <DetailRow icon='schedule' label='เวลา' value={`${next.time} น.`} />
          <DetailRow icon='location_on' label='สถานที่' value={location} />
        </div>

        {isOnline && (
          <>
            <p style={{ margin: 0, fontSize: 'var(--type-size-sm)', color: 'var(--text-brandPrimary-default)', display: 'flex', alignItems: 'center', gap: 'var(--dim-space-100, 4px)' }}>
              <Sym name='schedule' size={16} color='var(--text-brandPrimary-default)' />
              เริ่มใน 14:59 นาที
            </p>
            <BrandButton variant='fill' size='md' className='w-full' leadingIcon='videocam' onClick={() => history.push('/m/telemed')}>
              เข้าห้องวิดีโอคอล
            </BrandButton>
            <div className='flex' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <BrandSubdueButton variant='outline' size='md' className='flex-1' onClick={() => history.push(`/m/appointments/${next.id}`)}>ยกเลิก</BrandSubdueButton>
              <BrandSubdueButton variant='outline' size='md' className='flex-1' onClick={() => history.push(`/m/book?reschedule=${next.id}`)}>เลื่อนนัด</BrandSubdueButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const DetailRow = ({ icon, label, value }) => (
  <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
    <MobileIconBadge icon={icon} tone='green' size={40} iconSize={16} />
    <div>
      <p style={{ margin: 0, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default)' }}>{value}</p>
    </div>
  </div>
);

/* ─── ส่งคำขอ carousel — Figma 194:153207 ───────────────────────────── */
const REQUEST_CARDS = [
  { label: 'ขอน้ำยาฆ่าเชื้อผู้ใหญ่', icon: 'location_on', tone: 'green', path: '/m/requests' },
  { label: 'นัดเยี่ยมบ้าน', icon: 'home', tone: 'blue', path: '/m/requests' },
];

const RequestsCarousel = () => {
  const history = useHistory();
  return (
    <div>
      <SectionHead title='ส่งคำขอ' viewAllPath='/m/requests' />
      <div className='flex overflow-x-auto' style={{ gap: 'var(--dim-space-300, 12px)', paddingBottom: 4 }}>
        {REQUEST_CARDS.map((card) => (
          <button
            key={card.label}
            type='button'
            onClick={() => history.push(card.path)}
            style={{
              flex: '0 0 160px',
              background: 'var(--surface-card-100)',
              border: 0,
              borderRadius: 'var(--dim-radius-600, 24px)',
              boxShadow: 'var(--shadow-card)',
              padding: 'var(--dim-space-300, 12px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--dim-space-200, 8px)',
              cursor: 'pointer',
            }}
          >
            <MobileIconBadge icon={card.icon} tone={card.tone} size={40} iconSize={16} />
            <span style={{
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-sm)',
              color: 'var(--text-content-default)',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
            >
              {card.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

/* ─── ประวัติการรักษา carousel — Figma 194:153538 ──────────────────── */
const VisitHistoryCard = ({ visit, onClick }) => {
  const meta = MOBILE_SERVICE_META[visit.type] || MOBILE_SERVICE_META.visit;
  return (
    <div
      onClick={onClick}
      role='button' tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      style={{
        flex: '0 0 280px',
        padding: 'var(--dim-space-400, 16px)',
        background: 'var(--surface-card-100)',
        borderRadius: 'var(--dim-radius-500, 16px)',
        boxShadow: 'var(--shadow-card)',
        cursor: 'pointer',
      }}
    >
      <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)', marginBottom: 'var(--dim-space-300, 12px)' }}>
        <MobileIconBadge icon='calendar_today' tone='purple' size={32} iconSize={16} />
        <span style={{ fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
          {visit.date}
        </span>
      </div>
      <p style={{ margin: '0 0 var(--dim-space-200, 8px)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
        {visit.time} น.
      </p>
      <ColorfulBadge style={meta.badgeStyle} size='small' hierarchy='secondary' width='hug' showIcon icon={meta.icon}>
        {meta.badgeLabel}
      </ColorfulBadge>
      <p style={{
        margin: 'var(--dim-space-200, 8px) 0',
        fontFamily: 'var(--type-family-heading-graphic2)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-bold)',
        color: 'var(--text-content-default)',
      }}
      >
        {visit.dept}
      </p>
      <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <span
          className='inline-flex items-center justify-center shrink-0'
          style={{
            width: 28, height: 28, borderRadius: 'var(--dim-radius-full)',
            background: 'var(--surface-brandPrimary-default)',
            color: 'var(--text-brandPrimary-on-brand)',
            fontSize: 'var(--type-size-xs)',
            fontWeight: 'var(--type-weight-bold)',
          }}
        >
          {visit.doctor.replace(/[นพ\.พญ\.พ\.ว\.\s]/g, '').slice(0, 2)}
        </span>
        <div>
          <p style={{ margin: 0, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-default)' }}>{visit.doctor}</p>
          <p style={{ margin: 0, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>{visit.center}</p>
        </div>
      </div>
      <button
        type='button'
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        style={{
          marginTop: 'var(--dim-space-300, 12px)',
          border: 0,
          background: 'transparent',
          padding: 0,
          color: 'var(--text-brandPrimary-default)',
          fontSize: 'var(--type-size-sm)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--dim-space-100, 4px)',
          cursor: 'pointer',
        }}
      >
        ดูผลตรวจหรือบันทึกการรักษา
        <Sym name='chevron_right' size={16} color='var(--text-brandPrimary-default)' />
      </button>
    </div>
  );
};

const HistoryCarousel = () => {
  const history = useHistory();
  const { visits } = usePhcisLink();
  if (!visits.length) return null;
  return (
    <div>
      <SectionHead title='ประวัติการรักษา' viewAllPath='/m/records' />
      <div className='flex overflow-x-auto' style={{ gap: 'var(--dim-space-300, 12px)', paddingBottom: 4 }}>
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

/* ─── Page ───────────────────────────────────────────────────────────── */
const MobileHomePage = () => (
  <MobileShell background='var(--surface-content-secondary, #F5F6F7)'>
    <Hero />
    {/* Quick actions overlap the hero by ~28px so they read as "floating
        on top" — matches the Figma's visual rhythm. The negative margin
        pulls the block up; the surrounding wrapper still owns side
        padding so content remains on-grid. */}
    <div style={{ marginTop: 'calc(-1 * var(--dim-space-700, 28px))', padding: '0 var(--dim-space-200, 8px)' }}>
      <div style={{
        background: 'var(--surface-card-brand100, #F4FBF8)',
        border: '1px solid var(--border-brandPrimary-quaternary, #E2F3EB)',
        borderRadius: 'var(--dim-radius-500, 16px)',
        boxShadow: 'var(--shadow-brand-drop-bottom-100)',
        paddingBottom: 'var(--dim-space-300, 12px)',
        marginLeft: 'var(--dim-space-200, 8px)',
        marginRight: 'var(--dim-space-200, 8px)',
      }}>
        <QuickActions />
      </div>
    </div>

    <div style={{ padding: 'var(--dim-space-500, 20px) var(--dim-space-400, 16px) var(--dim-space-500, 20px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-500, 20px)' }}>
      <NextAppointmentCard />
      <RequestsCarousel />
      <HistoryCarousel />
    </div>
  </MobileShell>
);

export default MobileHomePage;
