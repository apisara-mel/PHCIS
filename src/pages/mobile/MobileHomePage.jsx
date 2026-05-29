import React from 'react';
import { useHistory } from 'react-router-dom';
import {
  MobileShell,
  MobileBadge,
  Sym,
} from '@/components/mobile/MobileShell';
import { CURRENT_USER, APPOINTMENTS, NEWS, BILLS, VISIT_HISTORY } from '@/data/mobileMock';

/* MIH PHCIS Mobile · Home — visual mood follows Figma 2153:47728.
   Sections (top-to-bottom):
     1. Gradient hero    — avatar + greeting + Thai-date + bell pill
                          + dark info chip (HN · สิทธิ์ · โลหิต)
     2. Quick actions    — 6 pastel circular icons in 3×2 grid
     3. Health stats     — 3 pale-mint vital tiles (BP / weight / pulse)
     4. Next appointment — white card w/ coral left-bar, date column,
                          status pill on right
     5. Pending bill     — vibe-specific warning banner
     6. Recent visit     — most recent visit card (TOR §4.6)
     7. News strip       — 3 latest announcements (TOR §4.9)
   Six menu items stay (book, telemed, records, clinics, requests, payment).  */

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

/* Parse the appointment "YYYY-MM-DD" (already Buddhist year in mock) into
   a `{ day, monthShort }` pair for the date column. */
const apptDateParts = (yyyyMmDd) => {
  const [, mm, dd] = yyyyMmDd.split('-').map((p) => Number(p));
  return { day: dd, monthShort: THAI_MONTHS_SHORT[mm - 1] };
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
  { key: 'book',     icon: 'event_available',    label: 'นัดหมาย',         path: '/m/appointments', tone: 'brand' },
  { key: 'telemed',  icon: 'video_camera_front', label: 'Telemedicine',    path: '/m/telemed',      tone: 'info' },
  { key: 'records',  icon: 'description',        label: 'ผลการรักษา',     path: '/m/records',      tone: 'success' },
  { key: 'clinics',  icon: 'place',              label: 'ใกล้บ้าน',       path: '/m/clinics',      tone: 'pink' },
  { key: 'requests', icon: 'send',               label: 'ส่งคำขอ',        path: '/m/requests',     tone: 'lemon' },
  { key: 'payment',  icon: 'payments',           label: 'ชำระเงิน',        path: '/m/payment',      tone: 'lilac' },
];

const TONE_PALETTE = {
  brand:   { bg: '#D4F0E5', fg: '#0A8268' },     /* mint */
  info:    { bg: '#CFE7F6', fg: '#1F6FEB' },     /* sky blue */
  success: { bg: '#E1EFB5', fg: '#5A8A1F' },     /* lime */
  pink:    { bg: '#FBD6D9', fg: '#D43838' },     /* coral pink */
  lemon:   { bg: '#FFE9B8', fg: '#A66D00' },     /* lemon */
  lilac:   { bg: '#E4DCFB', fg: '#6A4FE4' },     /* lilac */
};

const QuickActions = () => {
  const history = useHistory();
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 'var(--dim-space-300, 12px)',
        padding: 'var(--dim-space-400, 16px) var(--dim-space-200, 8px) 0',
      }}
    >
      {QUICK_ACTIONS.map((a) => {
        const palette = TONE_PALETTE[a.tone];
        return (
          <button
            key={a.key}
            type='button'
            onClick={() => history.push(a.path)}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 6, padding: 'var(--dim-space-200, 8px) 0',
              color: 'var(--text-content-primary)',
            }}
          >
            <span
              style={{
                width: 60, height: 60, borderRadius: 'var(--dim-radius-full)',
                background: palette.bg,
                color: palette.fg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(8,167,104,0.08)',
              }}
            >
              <Sym name={a.icon} size={28} fill />
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
        fontFamily: 'var(--type-family-display)',
        fontSize: 'var(--type-size-base, 16px)',
        fontWeight: 'var(--type-weight-bold, 700)',
        color: 'var(--text-content-primary)',
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

/* ─── Vitals snapshot (3 pale-mint tiles) ────────────────────────────── */
const VitalsSnapshot = () => {
  const latest = CURRENT_USER.selfVitals[0];
  return (
    <div>
      <SectionHead title='ข้อมูลสุขภาพ' viewAllPath='/m/profile/vitals' />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--dim-space-300, 12px)' }}>
        <VitalTile big={latest.bp}     unit='mmHg' label='ความดัน' />
        <VitalTile big={latest.weight} unit='kg'   label='น้ำหนัก' />
        <VitalTile big='95'            unit='mg/dL' label='น้ำตาล' />
      </div>
    </div>
  );
};

const VitalTile = ({ big, unit, label }) => (
  <div
    style={{
      background: 'var(--surface-success-quaternary, #E8F6EC)',
      border: '1px solid rgba(8,167,104,0.10)',
      borderRadius: 'var(--dim-radius-500, 16px)',
      padding: 'var(--dim-space-400, 16px) var(--dim-space-200, 8px)',
      textAlign: 'center',
    }}
  >
    <p style={{
      margin: 0,
      fontFamily: 'var(--type-family-display)',
      fontSize: 22,
      fontWeight: 'var(--type-weight-bold, 700)',
      color: 'var(--text-content-primary)',
      lineHeight: 1.1,
    }}>{big}</p>
    <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>{unit}</p>
    <p style={{ margin: '4px 0 0', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #565D6D)', fontWeight: 'var(--type-weight-medium, 500)' }}>{label}</p>
  </div>
);

/* ─── Next appointment (coral left-bar card) ─────────────────────────── */
const NextAppointmentCard = () => {
  const history = useHistory();
  const next = APPOINTMENTS.find((a) => a.status === 'upcoming');
  if (!next) return null;
  const { day, monthShort } = apptDateParts(next.date);
  const center = next.clinic === 'BNA' ? 'ศูนย์บริการสาธารณสุข 8 บางนา' : 'ศูนย์บริการ';
  return (
    <div>
      <SectionHead title='นัดหมายถัดไป' />
      <div
        onClick={() => history.push(`/m/appointments/${next.id}`)}
        role='button' tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); history.push(`/m/appointments/${next.id}`); } }}
        style={{
          display: 'flex', alignItems: 'stretch',
          background: 'var(--surface-content-default, #FFFFFF)',
          borderRadius: 'var(--dim-radius-500, 16px)',
          border: '1px solid var(--border-content-tertiary, #E1E3E5)',
          overflow: 'hidden',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-brand-drop-bottom-100)',
        }}
      >
        <span style={{ width: 5, background: '#FA6B7B', flexShrink: 0 }} />
        <div style={{
          padding: 'var(--dim-space-400, 16px) var(--dim-space-300, 12px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minWidth: 56,
          borderRight: '1px solid var(--border-content-quaternary, #F0F1F3)',
        }}>
          <span style={{
            fontFamily: 'var(--type-family-display)',
            fontSize: 22,
            fontWeight: 'var(--type-weight-bold, 700)',
            color: 'var(--text-content-primary)',
            lineHeight: 1,
          }}>{day}</span>
          <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary)' }}>{monthShort}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0, padding: 'var(--dim-space-400, 16px) var(--dim-space-300, 12px)' }}>
          <p style={{
            margin: 0,
            fontFamily: 'var(--type-family-display)',
            fontSize: 'var(--type-size-base, 16px)',
            fontWeight: 'var(--type-weight-bold, 700)',
            color: 'var(--text-content-primary)',
            lineHeight: 1.3,
          }}>{next.note || next.deptLabel}</p>
          <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <MetaLine icon='place' text={center} />
            <MetaLine icon='schedule' text={`${next.time} น. · ${next.deptLabel}`} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', padding: 'var(--dim-space-400, 16px) var(--dim-space-300, 12px) var(--dim-space-400, 16px) 0' }}>
          <span style={{
            padding: '4px var(--dim-space-300, 12px)',
            background: 'var(--surface-success-quaternary, #E8F6EC)',
            color: 'var(--text-success-default, #1F9D55)',
            borderRadius: 'var(--dim-radius-full)',
            fontSize: 'var(--type-size-xs, 12px)',
            fontWeight: 'var(--type-weight-bold, 700)',
            whiteSpace: 'nowrap',
          }}>ยืนยันแล้ว</span>
        </div>
      </div>
    </div>
  );
};

const MetaLine = ({ icon, text }) => (
  <div className='flex items-center' style={{ gap: 4 }}>
    <Sym name={icon} size={14} color='var(--text-content-tertiary, #858C92)' />
    <span style={{
      fontSize: 'var(--type-size-xs, 12px)',
      color: 'var(--text-content-tertiary, #858C92)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}>{text}</span>
  </div>
);

/* ─── Pending bill (vibe-specific) ───────────────────────────────────── */
const PendingBillBanner = () => {
  const history = useHistory();
  const pending = BILLS.find((b) => b.status === 'pending');
  if (!pending) return null;
  return (
    <div
      onClick={() => history.push(`/m/payment/${pending.id}`)}
      role='button' tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); history.push(`/m/payment/${pending.id}`); } }}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--dim-space-300, 12px)',
        padding: 'var(--dim-space-400, 16px)',
        background: 'linear-gradient(135deg, #FFF1D6 0%, #FBD6D9 100%)',
        border: '1px solid rgba(212,56,56,0.18)',
        borderRadius: 'var(--dim-radius-500, 16px)',
        cursor: 'pointer',
      }}
    >
      <span style={{
        width: 40, height: 40, borderRadius: 'var(--dim-radius-full)',
        background: '#FFFFFF',
        color: '#D43838',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Sym name='receipt_long' size={22} fill />
      </span>
      <div className='flex-1 min-w-0'>
        <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', fontWeight: 700, color: 'var(--text-warning-default, #D43838)' }}>
          มีบิลค้างชำระ
        </p>
        <p style={{ margin: 0, fontFamily: 'var(--type-family-display)', fontSize: 'var(--type-size-lg, 18px)', fontWeight: 'var(--type-weight-bold, 700)', color: 'var(--text-content-primary)' }}>
          ฿{pending.amount.toLocaleString()} · {pending.date}
        </p>
      </div>
      <Sym name='chevron_right' size={20} color='var(--text-warning-default, #D43838)' />
    </div>
  );
};

/* ─── Recent visit (top of history) ──────────────────────────────────── */
const RecentVisitCard = () => {
  const history = useHistory();
  const latest = VISIT_HISTORY[0];
  if (!latest) return null;
  return (
    <div>
      <SectionHead title='ประวัติการรักษาล่าสุด' viewAllPath='/m/records' />
      <div
        onClick={() => history.push(`/m/visit/${latest.id}`)}
        role='button' tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); history.push(`/m/visit/${latest.id}`); } }}
        style={{
          display: 'flex', alignItems: 'center', gap: 'var(--dim-space-300, 12px)',
          padding: 'var(--dim-space-400, 16px)',
          background: 'var(--surface-content-default, #FFFFFF)',
          border: '1px solid var(--border-content-tertiary, #E1E3E5)',
          borderRadius: 'var(--dim-radius-500, 16px)',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-brand-drop-bottom-100)',
        }}
      >
        <span style={{
          width: 48, height: 48, borderRadius: 'var(--dim-radius-full)',
          background: 'var(--surface-success-quaternary, #E8F6EC)',
          color: 'var(--text-brandPrimary-default, #007549)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Sym name='medical_services' size={22} fill />
        </span>
        <div className='flex-1 min-w-0'>
          <p style={{ margin: 0, fontFamily: 'var(--type-family-display)', fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-bold, 700)', color: 'var(--text-content-primary)' }}>
            {latest.dept}
          </p>
          <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>
            <Sym name='stethoscope' size={12} /> {latest.doctor}
          </p>
          <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>{latest.date}</p>
        </div>
        <span style={{
          padding: '4px var(--dim-space-300, 12px)',
          background: 'var(--surface-success-quaternary, #E8F6EC)',
          color: 'var(--text-success-default, #1F9D55)',
          borderRadius: 'var(--dim-radius-full)',
          fontSize: 'var(--type-size-xs, 12px)',
          fontWeight: 'var(--type-weight-bold, 700)',
          whiteSpace: 'nowrap',
        }}>เสร็จสิ้น</span>
      </div>
    </div>
  );
};

/* ─── News strip (vibe-specific) ─────────────────────────────────────── */
const NewsStrip = () => {
  const history = useHistory();
  const top = NEWS.slice(0, 3);
  return (
    <div>
      <SectionHead title='ข่าวสารและประกาศ' viewAllPath='/m/news' />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-300, 12px)' }}>
        {top.map((n) => (
          <div
            key={n.id}
            onClick={() => history.push(`/m/news/${n.id}`)}
            role='button' tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); history.push(`/m/news/${n.id}`); } }}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--dim-space-300, 12px)',
              padding: 'var(--dim-space-300, 12px)',
              background: 'var(--surface-content-default, #FFFFFF)',
              border: '1px solid var(--border-content-tertiary, #E1E3E5)',
              borderRadius: 'var(--dim-radius-500, 16px)',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 'var(--dim-radius-300, 10px)',
              background: 'linear-gradient(135deg, #54AA8C 0%, #4CC6AE 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#FFFFFF', flexShrink: 0,
            }}>
              <Sym
                name={n.type === 'video' ? 'play_circle' : n.type === 'audio' ? 'graphic_eq' : 'article'}
                size={28}
              />
            </div>
            <div className='flex-1 min-w-0'>
              <MobileBadge tone='brand'>{n.tag}</MobileBadge>
              <p style={{
                margin: '4px 0 4px',
                fontSize: 'var(--type-size-sm, 14px)',
                fontWeight: 'var(--type-weight-bold, 700)',
                color: 'var(--text-content-primary)',
                lineHeight: 1.4,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>{n.title}</p>
              <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>
                {n.publishedAt} · {n.duration || `อ่าน ${n.readMinutes} นาที`}
              </p>
            </div>
          </div>
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
        background: 'var(--surface-content-default, #FFFFFF)',
        border: '1px solid var(--border-content-tertiary, #E1E3E5)',
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
      <VitalsSnapshot />
      <NextAppointmentCard />
      <PendingBillBanner />
      <RecentVisitCard />
      <NewsStrip />
    </div>
  </MobileShell>
);

export default MobileHomePage;
