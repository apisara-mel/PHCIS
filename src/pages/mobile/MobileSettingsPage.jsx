import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  MobileShell,
  MobileHeader,
  MobileCard,
  MobileButton,
  MobileInput,
  MobileField,
  Sym,
  useMobileApp,
} from '@/components/mobile/MobileShell';

/* MIH PHCIS Mobile · Settings — TOR §4.10 (TH/EN language) + §4.11 (password change).
   One-screen settings list:
     • Language toggle (TH ↔ EN)
     • Password change (current + new + confirm)
     • Notification toggles (visual only)
     • PDPA / privacy info link                                            */

const MobileSettingsInner = () => {
  const history = useHistory();
  const { lang, setLang } = useMobileApp();

  /* Password change */
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwMsg, setPwMsg] = useState(null);
  const onSavePw = (e) => {
    e.preventDefault();
    if (cur.length < 4) return setPwMsg({ tone: 'warning', text: 'กรุณากรอกรหัสผ่านเดิม' });
    if (pw.length < 8) return setPwMsg({ tone: 'warning', text: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' });
    if (pw !== pw2)    return setPwMsg({ tone: 'warning', text: 'รหัสผ่านยืนยันไม่ตรงกัน' });
    setCur(''); setPw(''); setPw2('');
    setPwMsg({ tone: 'success', text: 'บันทึกรหัสผ่านใหม่เรียบร้อย' });
    setTimeout(() => setPwMsg(null), 2500);
  };

  /* Notification toggles */
  const [notify, setNotify] = useState({ appt: true, telemed: true, news: false });

  return (
    <>
      <MobileHeader title='ตั้งค่า' subtitle='TOR §4.10 / §4.11' onBack={() => history.push('/m/more')} />
      <div style={{ padding: 'var(--dim-space-400, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>

        {/* Language (4.10) */}
        <MobileCard id='language'>
          <h3 style={sectionTitle}>ภาษา (Language)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {[
              { k: 'th', l: 'ไทย', sub: 'Thai' },
              { k: 'en', l: 'English', sub: 'ภาษาอังกฤษ' },
            ].map((opt) => {
              const active = opt.k === lang;
              return (
                <button key={opt.k} type='button' onClick={() => setLang(opt.k)}
                  style={{
                    padding: 'var(--dim-space-400, 16px)',
                    borderRadius: 'var(--dim-radius-300, 10px)',
                    background: active ? 'var(--surface-brandPrimary-quaternary, #F4FBF8)' : 'var(--surface-content-default, #FFFFFF)',
                    border: '1.5px solid ' + (active ? 'var(--border-brandPrimary-default)' : 'var(--border-content-tertiary)'),
                    color: active ? 'var(--text-brandPrimary-default)' : 'var(--text-content-primary)',
                    cursor: 'pointer', textAlign: 'center',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  }}>
                  <Sym name='translate' size={24} fill={active} />
                  <span style={{ fontWeight: 700, fontSize: 'var(--type-size-base, 16px)' }}>{opt.l}</span>
                  <span style={{ fontSize: 'var(--type-size-xs, 12px)', opacity: 0.7 }}>{opt.sub}</span>
                </button>
              );
            })}
          </div>
        </MobileCard>

        {/* Password (4.11) */}
        <MobileCard id='password'>
          <h3 style={sectionTitle}>เปลี่ยนรหัสผ่าน</h3>
          <form onSubmit={onSavePw} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-300, 12px)' }}>
            <MobileField label='รหัสผ่านเดิม'><MobileInput type='password' value={cur} onChange={(e) => setCur(e.target.value)} /></MobileField>
            <MobileField label='รหัสผ่านใหม่'  hint='อย่างน้อย 8 ตัวอักษร'>
              <MobileInput type='password' value={pw} onChange={(e) => setPw(e.target.value)} />
            </MobileField>
            <MobileField label='ยืนยันรหัสผ่านใหม่'>
              <MobileInput type='password' value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </MobileField>
            {pwMsg && (
              <div style={{
                padding: 'var(--dim-space-300, 12px)',
                background: pwMsg.tone === 'success' ? 'var(--surface-success-quaternary, #E9F8EF)' : 'var(--surface-warning-quaternary, #FDECEC)',
                color: pwMsg.tone === 'success' ? 'var(--text-success-default, #1F9D55)' : 'var(--text-warning-default, #D43838)',
                borderRadius: 'var(--dim-radius-300, 10px)',
                fontSize: 'var(--type-size-sm, 14px)', fontWeight: 700,
              }}>{pwMsg.text}</div>
            )}
            <MobileButton type='submit'>บันทึก</MobileButton>
          </form>
        </MobileCard>

        {/* Notifications */}
        <MobileCard id='notifications'>
          <h3 style={sectionTitle}>การแจ้งเตือน</h3>
          <Toggle on={notify.appt}     onChange={(v) => setNotify({ ...notify, appt: v })}     icon='event_available'   label='นัดหมาย (ก่อน 1 วัน / 1 ชั่วโมง)' />
          <Toggle on={notify.telemed}  onChange={(v) => setNotify({ ...notify, telemed: v })}  icon='video_camera_front' label='วิดีโอคอล' />
          <Toggle on={notify.news}     onChange={(v) => setNotify({ ...notify, news: v })}     icon='campaign'          label='ข่าวสารและประกาศ' />
        </MobileCard>

        {/* PDPA */}
        <MobileCard id='privacy'>
          <h3 style={sectionTitle}>ความเป็นส่วนตัว (PDPA)</h3>
          <p style={{ margin: 0, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary)', lineHeight: 1.6 }}>
            ระบบ PHCIS Mobile จัดเก็บข้อมูลของผู้ใช้งานตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
            (PDPA) ผู้ใช้สามารถขอตรวจสอบ แก้ไข หรือลบข้อมูลของตนได้ที่ศูนย์บริการสาธารณสุข
          </p>
          <MobileButton variant='ghost' icon='open_in_new'
            onClick={() => alert('นโยบายความเป็นส่วนตัวฉบับเต็มจะเปิดในเบราว์เซอร์')}>
            อ่านนโยบายความเป็นส่วนตัวฉบับเต็ม
          </MobileButton>
        </MobileCard>
      </div>
    </>
  );
};

const Toggle = ({ on, onChange, icon, label }) => (
  <div className='flex items-center' style={{ gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-content-quaternary, #F0F1F3)' }}>
    <Sym name={icon} size={20} color='var(--text-content-secondary)' />
    <span style={{ flex: 1, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-primary)', fontWeight: 500 }}>{label}</span>
    <button type='button' onClick={() => onChange(!on)} aria-pressed={on}
      style={{
        width: 44, height: 26, borderRadius: 999,
        background: on ? 'var(--surface-brandPrimary-default, #007549)' : 'var(--surface-content-secondary, #E1E3E5)',
        position: 'relative', border: 'none', cursor: 'pointer',
        transition: 'background-color 160ms ease',
      }}>
      <span style={{
        position: 'absolute', top: 3,
        left: on ? 21 : 3,
        width: 20, height: 20, borderRadius: '50%',
        background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 160ms ease',
      }} />
    </button>
  </div>
);

const sectionTitle = {
  margin: '0 0 var(--dim-space-200, 8px)',
  fontFamily: 'var(--type-family-display)',
  fontSize: 'var(--type-size-base, 16px)',
  fontWeight: 'var(--type-weight-bold, 700)',
  color: 'var(--text-content-primary)',
};

const MobileSettingsPage = () => (
  <MobileShell>
    <MobileSettingsInner />
  </MobileShell>
);

export default MobileSettingsPage;
