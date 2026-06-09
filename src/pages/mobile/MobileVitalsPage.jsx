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
} from '@/components/mobile/MobileShell';
import { CURRENT_USER } from '@/data/mobileMock';

/* MIH PHCIS Mobile · Self-vitals log — TOR §4.5.2.
   Add a new self-logged vital row (BP / pulse / weight / height) and
   browse the trailing list. State is in-memory only — refresh resets
   to the mock seed.                                                      */

const MobileVitalsInner = () => {
  const history = useHistory();
  const [bp, setBp] = useState('');
  const [pulse, setPulse] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [vitals, setVitals] = useState(CURRENT_USER.selfVitals);
  const [success, setSuccess] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (!bp && !weight && !pulse) return;
    const now = new Date();
    const date = now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
      + ' · ' + now.toTimeString().slice(0, 5);
    setVitals([
      { date, bp: bp || '-', pulse: Number(pulse) || '-', weight: Number(weight) || '-', height: Number(height) || vitals[0]?.height || 172 },
      ...vitals,
    ]);
    setBp(''); setPulse(''); setWeight(''); setHeight('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  };

  return (
    <>
      <MobileHeader title='บันทึกค่าสุขภาพ' subtitle='TOR §4.5.2' onBack={() => history.push('/m/profile')} />
      <div style={{ padding: 'var(--dim-space-400, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
        <MobileCard>
          <h3 style={sectionTitle}>เพิ่มค่าสุขภาพวันนี้</h3>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-300, 12px)' }}>
            <MobileField label='ความดันโลหิต (mmHg)'>
              <MobileInput placeholder='128/82' value={bp} onChange={(e) => setBp(e.target.value)} />
            </MobileField>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <MobileField label='ชีพจร'>
                <MobileInput inputMode='numeric' value={pulse} onChange={(e) => setPulse(e.target.value.replace(/\D/g, ''))} />
              </MobileField>
              <MobileField label='น้ำหนัก (kg)'>
                <MobileInput inputMode='decimal' value={weight} onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, ''))} />
              </MobileField>
              <MobileField label='ส่วนสูง (cm)'>
                <MobileInput inputMode='decimal' value={height} onChange={(e) => setHeight(e.target.value.replace(/[^\d.]/g, ''))} />
              </MobileField>
            </div>
            <MobileButton type='submit' icon='add'>บันทึก</MobileButton>
            {success && (
              <div style={{
                padding: 'var(--dim-space-300, 12px)',
                background: 'var(--surface-success-quaternary, #E9F8EF)',
                color: 'var(--text-success-default, #1F9D55)',
                borderRadius: 'var(--dim-radius-300, 10px)',
                fontSize: 'var(--type-size-sm, 14px)',
                textAlign: 'center', fontWeight: 700,
              }}>บันทึกค่าสุขภาพแล้ว</div>
            )}
          </form>
        </MobileCard>

        <MobileCard>
          <h3 style={sectionTitle}>ประวัติ {vitals.length} รายการ</h3>
          <div>
            {vitals.map((v, i) => (
              <div key={i} className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)', padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border-content-quaternary)' }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 'var(--dim-radius-300, 10px)',
                  background: 'var(--surface-brandPrimary-quaternary)', color: 'var(--text-brandPrimary-default)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Sym name='monitor_heart' size={18} fill />
                </span>
                <div className='flex-1 min-w-0'>
                  <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>{v.date}</p>
                  <p style={{ margin: 0, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-primary)', fontWeight: 700 }}>
                    BP {v.bp} · {v.pulse} bpm · {v.weight} kg
                  </p>
                </div>
              </div>
            ))}
          </div>
        </MobileCard>
      </div>
    </>
  );
};

const sectionTitle = {
  margin: '0 0 var(--dim-space-200, 8px)',
  fontFamily: 'var(--type-family-display)',
  fontSize: 'var(--type-size-base, 16px)',
  fontWeight: 'var(--type-weight-bold, 700)',
  color: 'var(--text-content-primary)',
};

const MobileVitalsPage = () => (
  <MobileShell>
    <MobileVitalsInner />
  </MobileShell>
);

export default MobileVitalsPage;
