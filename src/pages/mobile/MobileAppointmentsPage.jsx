import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  MobileShell,
  MobileHeader,
  MobileCard,
  MobileButton,
  Sym,
} from '@/components/mobile/MobileShell';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import MobileIconBadge from '@/components/mobile/MobileIconBadge';
import { MOBILE_SERVICE_META } from '@/components/mobile/mobileIconTones';
import { CLINICS } from '@/data/mobileMock';
import { usePhcisLink } from '@/data/phcisLink';

/* MIH PHCIS Mobile · Appointments list — Figma Mobile Application 6dCDQkwc8DhvyovBbDTyp5.
   Tab between upcoming/past. Colorful icon badges per service type. */

const formatThaiDate = (yyyy_mm_dd) => {
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const [y, m, d] = yyyy_mm_dd.split('-').map(Number);
  return `${d} ${months[m - 1]} ${y}`;
};

const Tab = ({ active, onClick, children }) => (
  <button type='button' onClick={onClick}
    style={{
      flex: 1, height: 40,
      background: active ? 'var(--surface-card-100)' : 'transparent',
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
  const meta = MOBILE_SERVICE_META[a.type] || MOBILE_SERVICE_META.visit;
  const clinic = CLINICS.find((c) => c.code === a.clinic);
  return (
    <MobileCard onClick={onClick} padding='var(--dim-space-400, 16px)'>
      <div className='flex items-start' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <MobileIconBadge icon={meta.listIcon} tone={meta.tone} size={40} iconSize={20} />
        <div className='flex-1 min-w-0'>
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150, 6px)', marginBottom: 'var(--dim-space-150, 6px)' }}>
            <ColorfulBadge style={meta.badgeStyle} size='small' hierarchy='secondary' width='hug' showIcon icon={meta.icon}>
              {meta.badgeLabel}
            </ColorfulBadge>
            {a.status === 'past' && (
              <StatusBadge style='neutral' size='small'>เสร็จสิ้น</StatusBadge>
            )}
            {a.status === 'upcoming' && (
              <StatusBadge style='success' size='small'>ยืนยันแล้ว</StatusBadge>
            )}
          </div>
          <p style={{
            margin: 0,
            fontFamily: 'var(--type-family-heading-graphic2)',
            fontSize: 'var(--type-size-base, 16px)',
            fontWeight: 'var(--type-weight-bold, 700)',
            color: 'var(--text-content-default)',
          }}>{formatThaiDate(a.date)} · {a.time} น.</p>
          <p style={{ margin: 0, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary)' }}>{a.deptLabel}</p>
          <p style={{ margin: '2px 0 0', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>
            {a.doctor} · {clinic ? clinic.shortName || clinic.name : ''}
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
  const { appointments } = usePhcisLink();

  const list = useMemo(() => {
    return appointments
      .filter((a) => a.status === tab)
      .sort((a, b) => a.date.localeCompare(b.date) * (tab === 'upcoming' ? 1 : -1));
  }, [tab, appointments]);

  return (
    <>
      <MobileHeader title='นัดหมาย' onBack={() => history.push('/m/home')} />
      <div style={{ padding: 'var(--dim-space-400, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
        <div style={{
          display: 'flex', padding: 4,
          background: 'var(--surface-content-secondary, #F5F6F7)',
          borderRadius: 'var(--dim-radius-300, 10px)',
          gap: 4,
        }}>
          <Tab active={tab === 'upcoming'} onClick={() => setTab('upcoming')}>กำลังจะมาถึง</Tab>
          <Tab active={tab === 'past'}     onClick={() => setTab('past')}>ผ่านมาแล้ว</Tab>
        </div>

        {tab === 'upcoming' && (
          <MobileButton icon='add_circle' onClick={() => history.push('/m/book')}>
            ทำนัดหมายใหม่
          </MobileButton>
        )}

        {list.length === 0 ? (
          <MobileCard padding='var(--dim-space-500, 20px)'>
            <p style={{ margin: 0, textAlign: 'center', color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-sm, 14px)' }}>
              {tab === 'upcoming' ? 'ยังไม่มีนัดหมายที่กำลังจะมาถึง' : 'ยังไม่มีประวัตินัดหมาย'}
            </p>
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
