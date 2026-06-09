import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  MobileShell,
  MobileHeader,
  MobileCard,
  MobileButton,
  MobileBadge,
  MobileInput,
  MobileField,
  Sym,
  useMobileApp,
} from '@/components/mobile/MobileShell';
import { CURRENT_USER } from '@/data/mobileMock';

/* MIH PHCIS Mobile · Profile screen — TOR §4.5.
   Cards arranged top-down so the reviewer can tick each TOR sub-req:
     • 4.5.1 — face / citizen ID / DoB / age / address
     • 4.5.2 — log self vitals (BP/weight/height)  → /m/profile/vitals
     • 4.5.3 — center / HN / rights / chronic / allergies
     • 4.5.4 — request medical certificate         → /m/requests?type=cert
   The big Settings + Sign out CTAs live in the More tab (§4.10/§4.11).  */

const Row = ({ label, value, mono = false }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--dim-space-300, 12px)', padding: '10px 0', borderBottom: '1px solid var(--border-content-quaternary, #F0F1F3)' }}>
    <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary)' }}>{label}</span>
    <span style={{
      fontSize: 'var(--type-size-sm, 14px)',
      fontWeight: 'var(--type-weight-bold, 700)',
      color: 'var(--text-content-primary)',
      fontFamily: mono ? 'ui-monospace, monospace' : 'inherit',
      textAlign: 'right',
      flex: 1,
    }}>{value}</span>
  </div>
);

const MobileProfileInner = () => {
  const history = useHistory();
  const { signOut } = useMobileApp();
  return (
    <>
      <MobileHeader title='โปรไฟล์' subtitle='TOR §4.5' onBack={() => history.push('/m/home')} />
      <div style={{ padding: 'var(--dim-space-400, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
        {/* Hero — face + identifiers */}
        <MobileCard padding='var(--dim-space-500, 20px)'>
          <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <img src={CURRENT_USER.avatar} alt={CURRENT_USER.firstName}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
              style={{
                width: 72, height: 72, borderRadius: 'var(--dim-radius-full)',
                objectFit: 'cover',
                border: '3px solid var(--surface-brandPrimary-default, #007549)',
              }} />
            <div className='flex-1 min-w-0'>
              <p style={{
                margin: 0,
                fontFamily: 'var(--type-family-display)',
                fontSize: 'var(--type-size-xl, 20px)',
                fontWeight: 'var(--type-weight-bold, 700)',
                color: 'var(--text-content-primary)',
              }}>{CURRENT_USER.prefix}{CURRENT_USER.firstName} {CURRENT_USER.lastName}</p>
              <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>{CURRENT_USER.englishName}</p>
              <p style={{ margin: '2px 0 0', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary)' }}>
                อายุ {CURRENT_USER.age} ปี · เพศ{CURRENT_USER.sex}
              </p>
            </div>
            <button type='button' onClick={() => history.push('/m/profile/qr')}
              aria-label='แสดง QR'
              style={{
                width: 44, height: 44, borderRadius: 'var(--dim-radius-300, 10px)',
                background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                border: '1px solid var(--border-brandPrimary-default)',
                color: 'var(--text-brandPrimary-default)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <Sym name='qr_code_2' size={22} />
            </button>
          </div>
        </MobileCard>

        {/* 4.5.1 — Identity */}
        <MobileCard>
          <h3 style={sectionTitle}>ข้อมูลส่วนตัว</h3>
          <Row label='เลขประจำตัวประชาชน' value={CURRENT_USER.citizenId} mono />
          <Row label='วันเดือนปีเกิด' value={CURRENT_USER.birthDate} />
          <Row label='เพศ' value={CURRENT_USER.sex} />
          <Row label='เบอร์โทรศัพท์' value={CURRENT_USER.phone} mono />
          <Row label='อีเมล' value={CURRENT_USER.email} />
          <Row label='ที่อยู่' value={CURRENT_USER.address} />
        </MobileCard>

        {/* 4.5.3 — Centers + rights */}
        <MobileCard>
          <h3 style={sectionTitle}>ศูนย์บริการที่ลงทะเบียน</h3>
          {CURRENT_USER.centers.map((c, i) => (
            <div key={c.code} style={{ padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border-content-quaternary)' }}>
              <div className='flex items-center' style={{ gap: 8, marginBottom: 4 }}>
                <Sym name='local_hospital' size={18} color='var(--text-brandPrimary-default)' fill />
                <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-content-primary)' }}>{c.name}</p>
              </div>
              <div className='flex items-center' style={{ gap: 8 }}>
                <MobileBadge tone='brand'>HN {c.hn}</MobileBadge>
                <MobileBadge tone='info'>{c.rights}</MobileBadge>
              </div>
            </div>
          ))}
        </MobileCard>

        {/* 4.5.3 — Allergies / chronic */}
        <MobileCard>
          <h3 style={sectionTitle}>ข้อมูลสุขภาพ</h3>
          <Block title='โรคประจำตัว' icon='monitor_heart' tone='warning' items={CURRENT_USER.chronicDx} />
          <Block title='แพ้ยา / แพ้อาหาร' icon='emergency' tone='danger' items={CURRENT_USER.allergies} />
          <Block title='ภาวะเสี่ยง' icon='warning' tone='info' items={CURRENT_USER.riskFactors} />
        </MobileCard>

        {/* 4.5.2 — Self-logged vitals shortcut */}
        <MobileCard onClick={() => history.push('/m/profile/vitals')}>
          <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <span style={{
              width: 44, height: 44, borderRadius: 'var(--dim-radius-300, 10px)',
              background: 'var(--surface-success-quaternary, #E9F8EF)',
              color: 'var(--text-success-default, #1F9D55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sym name='monitor_heart' size={22} fill />
            </span>
            <div className='flex-1 min-w-0'>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-content-primary)' }}>บันทึกค่าสุขภาพประจำวัน</p>
              <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>ความดัน น้ำหนัก ส่วนสูง · ดูประวัติย้อนหลัง</p>
            </div>
            <Sym name='chevron_right' size={20} color='var(--text-content-tertiary)' />
          </div>
        </MobileCard>

        {/* 4.5.4 — Request medical certificate */}
        <MobileButton variant='secondary' icon='description'
          onClick={() => history.push('/m/requests?type=cert')}>
          ขอใบรับรองแพทย์ (e-Document)
        </MobileButton>

        <MobileButton variant='danger' icon='logout' onClick={() => { signOut(); history.replace('/m/login'); }}>
          ออกจากระบบ
        </MobileButton>
      </div>
    </>
  );
};

const Block = ({ title, icon, tone, items }) => {
  const palette = {
    warning: { bg: 'var(--surface-warning-quaternary, #FDECEC)', color: 'var(--text-warning-default, #D43838)' },
    danger:  { bg: 'var(--surface-warning-quaternary, #FDECEC)', color: 'var(--text-warning-default, #D43838)' },
    info:    { bg: 'var(--surface-info-quaternary, #ECF4FE)', color: 'var(--text-info-default, #1F6FEB)' },
  }[tone] || { bg: '#F5F6F7', color: '#565D6D' };
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border-content-quaternary, #F0F1F3)' }}>
      <div className='flex items-center' style={{ gap: 8, marginBottom: 4 }}>
        <Sym name={icon} size={18} color={palette.color} fill />
        <span style={{ fontSize: 'var(--type-size-sm, 14px)', fontWeight: 700, color: 'var(--text-content-primary)' }}>{title}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.length === 0 ? (
          <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>— ไม่มี —</span>
        ) : items.map((it) => (
          <span key={it} style={{
            padding: '4px 10px', borderRadius: 'var(--dim-radius-full)',
            background: palette.bg, color: palette.color,
            fontSize: 'var(--type-size-xs, 12px)', fontWeight: 700,
          }}>{it}</span>
        ))}
      </div>
    </div>
  );
};

const sectionTitle = {
  margin: '0 0 var(--dim-space-200, 8px)',
  fontFamily: 'var(--type-family-display)',
  fontSize: 'var(--type-size-base, 16px)',
  fontWeight: 'var(--type-weight-bold, 700)',
  color: 'var(--text-content-primary)',
};

const MobileProfilePage = () => (
  <MobileShell>
    <MobileProfileInner />
  </MobileShell>
);

export default MobileProfilePage;
