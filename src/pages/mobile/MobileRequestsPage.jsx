import React, { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  MobileShell,
  MobileHeader,
  MobileCard,
  MobileButton,
  MobileBadge,
  MobileInput,
  MobileField,
  Sym,
} from '@/components/mobile/MobileShell';
import { REQUEST_TYPES, REQUESTS_HISTORY, findRequestType } from '@/data/mobileMock';
import MobileIconBadge from '@/components/mobile/MobileIconBadge';

/* MIH PHCIS Mobile · Send Requests — TOR §4.8.
   Lists request types as cards. Clicking a card opens a compose sheet
   (in-screen) where the citizen can type a note + qty + submit. The new
   request is added to the in-memory history so reviewers can see it. The
   `?type=<key>` param pre-selects a type — used by Records / Profile to
   route to "ขอเติมยา" / "ขอใบรับรอง" / "ขอประวัติการรักษา".              */

const MobileRequestsInner = () => {
  const history = useHistory();
  const { search } = useLocation();
  const initialType = new URLSearchParams(search).get('type');

  const [picked, setPicked] = useState(initialType ? findRequestType(initialType) : null);
  const [note, setNote] = useState('');
  const [qty, setQty] = useState('1');
  const [items, setItems] = useState(REQUESTS_HISTORY);
  const [submitted, setSubmitted] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const id = `REQ-${Math.floor(Math.random() * 9000 + 1000)}`;
    setItems([
      { id, type: picked.key, date: new Date().toLocaleDateString('th-TH'), status: 'submitted', statusLabel: 'รอเจ้าหน้าที่รับเรื่อง', note: note || '—' },
      ...items,
    ]);
    setNote(''); setQty('1'); setPicked(null);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2500);
  };

  return (
    <>
      <MobileHeader title='ส่งคำขอ' subtitle='TOR §4.8' onBack={() => history.push(picked ? '/m/requests' : '/m/home')} />
      <div style={{ padding: 'var(--dim-space-400, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
        {!picked ? (
          <>
            <p style={{ margin: 0, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary)' }}>
              เลือกประเภทคำขอที่ต้องการส่งให้ศูนย์บริการ
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--dim-space-300, 12px)' }}>
              {REQUEST_TYPES.map((r) => (
                <MobileCard key={r.key} onClick={() => setPicked(r)} padding='var(--dim-space-400, 16px)'>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8 }}>
                    <MobileIconBadge icon={r.icon} tone={r.tone || 'green'} size={48} iconSize={24} />
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-content-primary)', fontSize: 'var(--type-size-sm, 14px)' }}>{r.label}</p>
                    <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>{r.desc}</p>
                  </div>
                </MobileCard>
              ))}
            </div>

            {submitted && (
              <MobileCard style={{ background: 'var(--surface-success-quaternary, #E9F8EF)', borderColor: 'var(--border-success-default, #1F9D55)' }}>
                <div className='flex items-center' style={{ gap: 8 }}>
                  <Sym name='check_circle' size={24} color='var(--text-success-default, #1F9D55)' fill />
                  <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-success-default, #1F9D55)' }}>ส่งคำขอเรียบร้อย</p>
                </div>
              </MobileCard>
            )}

            <div>
              <h3 style={sectionTitle}>ประวัติคำขอ ({items.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-300, 12px)' }}>
                {items.map((r) => {
                  const meta = findRequestType(r.type);
                  const tone = meta?.tone || 'green';
                  return (
                    <MobileCard key={r.id} padding='var(--dim-space-400, 16px)'>
                      <div className='flex items-start' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                        <MobileIconBadge icon={meta ? meta.icon : 'help'} tone={tone} size={36} iconSize={18} />
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center' style={{ gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-content-primary)' }}>{meta ? meta.label : r.type}</span>
                            <MobileBadge tone={r.status === 'completed' ? 'success' : r.status === 'in-progress' ? 'info' : 'neutral'}>
                              {r.statusLabel}
                            </MobileBadge>
                          </div>
                          <p style={{ margin: '2px 0 0', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>
                            {r.date} · {r.id}
                          </p>
                          <p style={{ margin: '4px 0 0', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary)' }}>
                            {r.note}
                          </p>
                          {r.status === 'completed' && r.eDocUrl && (
                            <button type='button'
                              style={{ marginTop: 8, background: 'transparent', border: '1px solid var(--border-brandPrimary-default)', color: 'var(--text-brandPrimary-default)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 'var(--type-size-xs, 12px)', fontWeight: 700 }}
                              onClick={(e) => { e.stopPropagation(); alert('เปิด ' + r.eDocUrl); }}
                            >
                              ⬇ ดาวน์โหลด e-Document
                            </button>
                          )}
                        </div>
                      </div>
                    </MobileCard>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <MobileCard padding='var(--dim-space-500, 20px)'>
            <div className='flex items-start' style={{ gap: 'var(--dim-space-300, 12px)', marginBottom: 'var(--dim-space-300, 12px)' }}>
              <span style={{
                width: 48, height: 48, borderRadius: 'var(--dim-radius-300, 10px)',
                background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                color: 'var(--text-brandPrimary-default, #007549)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sym name={picked.icon} size={28} fill />
              </span>
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-content-primary)', fontSize: 'var(--type-size-base, 16px)' }}>{picked.label}</p>
                <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>{picked.desc}</p>
              </div>
            </div>

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-300, 12px)' }}>
              {picked.key === 'diapers' && (
                <MobileField label='จำนวน (แพ็ก)' required>
                  <MobileInput inputMode='numeric' value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))} />
                </MobileField>
              )}
              <MobileField label='รายละเอียดเพิ่มเติม'>
                <textarea
                  value={note} onChange={(e) => setNote(e.target.value)}
                  rows={4} placeholder='ระบุข้อมูลเพิ่มเติม เช่น ขนาด เบอร์ติดต่อ ฯลฯ'
                  style={{
                    width: '100%',
                    padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)',
                    background: 'var(--surface-content-default, #FFFFFF)',
                    border: '1.5px solid var(--border-content-tertiary, #E1E3E5)',
                    borderRadius: 'var(--dim-radius-300, 10px)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-base, 16px)',
                    color: 'var(--text-content-primary)',
                    outline: 'none', resize: 'vertical',
                  }}
                />
              </MobileField>

              <div style={{ display: 'flex', gap: 8 }}>
                <MobileButton variant='neutral' onClick={() => setPicked(null)} fullWidth={false} style={{ flex: 1 }}>
                  ยกเลิก
                </MobileButton>
                <MobileButton type='submit' fullWidth={false} style={{ flex: 1 }}>
                  ส่งคำขอ
                </MobileButton>
              </div>
            </form>
          </MobileCard>
        )}
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

const MobileRequestsPage = () => (
  <MobileShell>
    <MobileRequestsInner />
  </MobileShell>
);

export default MobileRequestsPage;
