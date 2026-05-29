import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  MobileShell,
  MobileHeader,
  MobileCard,
  MobileButton,
  MobileBadge,
  Sym,
} from '@/components/mobile/MobileShell';
import { APPOINTMENTS, CLINICS } from '@/data/mobileMock';

/* MIH PHCIS Mobile · Appointments list — TOR §4.2.4 / §4.2.6.
   Tab between upcoming/past. Each row shows type icon, date/time, dept,
   doctor, and a chevron into the detail screen where reschedule + cancel
   live (§4.2.2 / §4.2.3). "+ ทำนัดหมายใหม่" routes to the booking flow
   that covers §4.2.1 / §4.2.6.4. */

const formatThaiDate = (yyyy_mm_dd) => {
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const [y, m, d] = yyyy_mm_dd.split('-').map(Number);
  return `${d} ${months[m - 1]} ${y}`;
};

const typeMeta = {
  visit:     { icon: 'medical_services', label: 'พบแพทย์',   tone: 'brand' },
  video:     { icon: 'video_camera_front', label: 'วิดีโอคอล', tone: 'info' },
  homevisit: { icon: 'home_health', label: 'เยี่ยมบ้าน',     tone: 'success' },
};

const Tab = ({ active, onClick, children }) => (
  <button type='button' onClick={onClick}
    style={{
      flex: 1, height: 40,
      background: active ? 'var(--surface-content-default, #FFFFFF)' : 'transparent',
      border: 'none',
      borderRadius: 'var(--dim-radius-300, 10px)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-sm, 14px)',
      fontWeight: active ? 'var(--type-weight-bold, 700)' : 'var(--type-weight-medium, 500)',
      color: active ? 'var(--text-brandPrimary-default, #007549)' : 'var(--text-content-tertiary)',
      cursor: 'pointer',
      boxShadow: active ? 'var(--shadow-brand-drop-bottom-100)' : 'none',
    }}>{children}</button>
);

const Row = ({ a, onClick }) => {
  const meta = typeMeta[a.type] || typeMeta.visit;
  const clinic = CLINICS.find((c) => c.code === a.clinic);
  return (
    <MobileCard onClick={onClick} padding='var(--dim-space-400, 16px)'>
      <div className='flex items-start' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <span style={{
          width: 40, height: 40, borderRadius: 'var(--dim-radius-300, 10px)',
          background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
          color: 'var(--text-brandPrimary-default, #007549)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Sym name={meta.icon} size={22} fill />
        </span>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center' style={{ gap: 6, marginBottom: 4 }}>
            <MobileBadge tone={meta.tone}>{meta.label}</MobileBadge>
            {a.status === 'past' && <MobileBadge>เสร็จสิ้น</MobileBadge>}
          </div>
          <p style={{
            margin: 0,
            fontFamily: 'var(--type-family-display)',
            fontSize: 'var(--type-size-base, 16px)',
            fontWeight: 'var(--type-weight-bold, 700)',
            color: 'var(--text-content-primary)',
          }}>{formatThaiDate(a.date)} · {a.time} น.</p>
          <p style={{ margin: 0, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary)' }}>{a.deptLabel}</p>
          <p style={{ margin: '2px 0 0', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>
            {a.doctor} · {clinic ? clinic.name : ''}
          </p>
        </div>
        <Sym name='chevron_right' size={20} color='var(--text-content-tertiary)' />
      </div>
    </MobileCard>
  );
};

const MobileAppointmentsInner = () => {
  const history = useHistory();
  const [tab, setTab] = useState('upcoming');

  const list = useMemo(() => {
    return APPOINTMENTS
      .filter((a) => a.status === tab)
      .sort((a, b) => a.date.localeCompare(b.date) * (tab === 'upcoming' ? 1 : -1));
  }, [tab]);

  return (
    <>
      <MobileHeader title='นัดหมาย' subtitle='TOR §4.2 · นัดหมายและการเข้ารับบริการ' onBack={() => history.push('/m/home')} />
      <div style={{ padding: 'var(--dim-space-400, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
        {/* Tabs */}
        <div style={{
          display: 'flex', padding: 4,
          background: 'var(--surface-content-secondary, #F5F6F7)',
          borderRadius: 'var(--dim-radius-300, 10px)',
          gap: 4,
        }}>
          <Tab active={tab === 'upcoming'} onClick={() => setTab('upcoming')}>กำลังจะมาถึง</Tab>
          <Tab active={tab === 'past'}     onClick={() => setTab('past')}>ผ่านมาแล้ว</Tab>
        </div>

        {/* New booking CTA */}
        {tab === 'upcoming' && (
          <MobileButton icon='add_circle' onClick={() => history.push('/m/book')}>
            ทำนัดหมายใหม่
          </MobileButton>
        )}

        {/* List */}
        {list.length === 0 ? (
          <MobileCard>
            <div style={{ textAlign: 'center', padding: 'var(--dim-space-500, 20px) 0' }}>
              <Sym name='event_busy' size={48} color='var(--text-content-tertiary)' />
              <p style={{ margin: '8px 0 0', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary)' }}>
                ยังไม่มีรายการในหมวดนี้
              </p>
            </div>
          </MobileCard>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-300, 12px)' }}>
            {list.map((a) => (
              <Row key={a.id} a={a} onClick={() => history.push(`/m/appointments/${a.id}`)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

const MobileAppointmentsPage = () => (
  <MobileShell>
    <MobileAppointmentsInner />
  </MobileShell>
);

export default MobileAppointmentsPage;
