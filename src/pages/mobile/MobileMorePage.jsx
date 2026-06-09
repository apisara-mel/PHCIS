import React from 'react';
import { useHistory } from 'react-router-dom';
import {
  MobileShell,
  MobileHeader,
  MobileCard,
  MobileBadge,
  Sym,
  useMobileApp,
} from '@/components/mobile/MobileShell';
import { CURRENT_USER } from '@/data/mobileMock';

/* MIH PHCIS Mobile · More tab — index of secondary surfaces.
   Bottom-nav fifth slot. Hosts the entry points that don't belong on the
   four primary tabs:
     • Telemedicine room          (TOR §4.3)
     • Find clinic                (TOR §4.7)
     • Send requests              (TOR §4.8)
     • News & announcements       (TOR §4.9)
     • Payment & receipts         (TOR §4.12)
     • Settings (language/pw)     (TOR §4.10/§4.11)
   Plus a small profile pill at the top + a sign-out shortcut at the
   bottom.                                                                */

const Item = ({ icon, label, badge, to, tone = 'brand' }) => {
  const history = useHistory();
  const palette = {
    brand: { bg: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', color: 'var(--text-brandPrimary-default, #007549)' },
    info:  { bg: 'var(--surface-info-quaternary, #ECF4FE)', color: 'var(--text-info-default, #1F6FEB)' },
    success: { bg: 'var(--surface-success-quaternary, #E9F8EF)', color: 'var(--text-success-default, #1F9D55)' },
    warn:  { bg: 'var(--surface-warning-quaternary, #FDECEC)', color: 'var(--text-warning-default, #D43838)' },
  }[tone];
  return (
    <button type='button' onClick={() => history.push(to)}
      style={{
        width: '100%',
        background: 'var(--surface-content-default)',
        border: '1px solid var(--border-content-tertiary)',
        borderRadius: 'var(--dim-radius-400, 12px)',
        padding: 'var(--dim-space-300, 12px)',
        display: 'flex', alignItems: 'center', gap: 'var(--dim-space-300, 12px)',
        cursor: 'pointer', textAlign: 'left',
      }}>
      <span style={{
        width: 40, height: 40, borderRadius: 'var(--dim-radius-300, 10px)',
        background: palette.bg, color: palette.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Sym name={icon} size={22} fill />
      </span>
      <span style={{
        flex: 1,
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-bold, 700)',
        color: 'var(--text-content-primary)',
      }}>{label}</span>
      {badge && <MobileBadge tone={tone === 'warn' ? 'warning' : tone}>{badge}</MobileBadge>}
      <Sym name='chevron_right' size={18} color='var(--text-content-tertiary)' />
    </button>
  );
};

const MobileMoreInner = () => {
  const history = useHistory();
  const { signOut, t, lang } = useMobileApp();
  return (
    <>
      <MobileHeader title='เพิ่มเติม' onBack={() => history.push('/m/home')} />
      <div style={{ padding: 'var(--dim-space-400, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
        {/* Profile pill */}
        <MobileCard onClick={() => history.push('/m/profile')}>
          <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <img src={CURRENT_USER.avatar} alt='me' onError={(e) => { e.currentTarget.style.display = 'none'; }}
              style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
            <div className='flex-1 min-w-0'>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-content-primary)' }}>
                {CURRENT_USER.firstName} {CURRENT_USER.lastName}
              </p>
              <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>
                HN {CURRENT_USER.centers[0].hn} · {CURRENT_USER.centers[0].name}
              </p>
            </div>
            <Sym name='chevron_right' size={20} color='var(--text-content-tertiary)' />
          </div>
        </MobileCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-200, 8px)' }}>
          <h3 style={sectionTitle}>บริการ</h3>
          <Item icon='video_camera_front' label='Telemedicine' to='/m/telemed' tone='info' />
          <Item icon='place' label='ค้นหาศูนย์บริการ' to='/m/clinics' />
          <Item icon='send' label='ส่งคำขอ' to='/m/requests' tone='success' />
          <Item icon='campaign' label='ข่าวสารและประกาศ' to='/m/news' tone='info' />
          <Item icon='payments' label='ชำระเงินและใบเสร็จ' to='/m/payment' tone='warn' badge='1' />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-200, 8px)' }}>
          <h3 style={sectionTitle}>ตั้งค่า</h3>
          <Item icon='translate'  label={`ภาษา · ${lang === 'th' ? 'ไทย' : 'English'}`}  to='/m/settings' />
          <Item icon='lock'       label='เปลี่ยนรหัสผ่าน'         to='/m/settings#password' />
          <Item icon='notifications' label='การแจ้งเตือน'         to='/m/settings#notifications' />
          <Item icon='shield'     label='ความเป็นส่วนตัว (PDPA)' to='/m/settings#privacy' />
        </div>

        <button type='button' onClick={() => { signOut(); history.replace('/m/login'); }}
          style={{
            minHeight: 48,
            background: 'var(--surface-warning-quaternary, #FDECEC)',
            color: 'var(--text-warning-default, #D43838)',
            border: '1.5px solid var(--surface-warning-default, #D43838)',
            borderRadius: 'var(--dim-radius-300, 10px)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-base, 16px)',
            fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          <Sym name='logout' size={20} />
          ออกจากระบบ
        </button>

        <p style={{ margin: 0, textAlign: 'center', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>
          PHCIS Mobile · v1.0 (สาธิต TOR §4)
        </p>
      </div>
    </>
  );
};

const sectionTitle = {
  margin: 0,
  fontFamily: 'var(--type-family-display)',
  fontSize: 'var(--type-size-sm, 14px)',
  fontWeight: 'var(--type-weight-bold, 700)',
  color: 'var(--text-content-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const MobileMorePage = () => (
  <MobileShell>
    <MobileMoreInner />
  </MobileShell>
);

export default MobileMorePage;
