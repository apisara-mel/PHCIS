import React, { useEffect, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  MobileShell,
  MobileButton,
  MobileBadge,
  Sym,
} from '@/components/mobile/MobileShell';
import { CURRENT_USER, findAppointment } from '@/data/mobileMock';

/* MIH PHCIS Mobile · Telemedicine room — TOR §4.3.
   Three modes share one screen: video call (4.3.1), chat (4.3.1), and a
   "doc dropped by doctor" feed (4.3.2 — screen-share / lab images / Rx
   from 4.3.3). The whole screen is dark to read as an immersive room.
   "ออกจากห้อง" routes back to /m/home.

   The doctor / patient video tiles are simulated with avatars + a
   pulse to imply "live"; this stub doesn't need WebRTC to demo the
   product surface. */

const ELAPSED_TICK = 1000;

const formatElapsed = (s) => {
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
};

const MOCK_CHAT = [
  { id: 'm1', from: 'doctor', name: 'นพ.ปรีชา', text: 'สวัสดีครับ ขอถามข้อมูลก่อนนะครับ — วันนี้รู้สึกอย่างไรบ้าง?', at: '14:30' },
  { id: 'm2', from: 'me',     name: 'คุณ',       text: 'ความดันยังขึ้น ๆ ลง ๆ ครับ',                                     at: '14:31' },
  { id: 'm3', from: 'doctor', name: 'นพ.ปรีชา', text: 'รับยา Amlodipine ครบทุกวันไหมครับ?',                              at: '14:31' },
  { id: 'm4', from: 'doctor', name: 'นพ.ปรีชา', text: 'จะเปิดผลแลบล่าสุดให้ดูประกอบนะครับ',                              at: '14:32', attach: 'lab-2569-04-02.pdf' },
];

const MobileTelemedInner = () => {
  const history = useHistory();
  const { search } = useLocation();
  const aptId = new URLSearchParams(search).get('apt');
  const apt = aptId ? findAppointment(aptId) : null;

  const [tab, setTab] = useState('video');   /* video | chat */
  const [elapsed, setElapsed] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [chat, setChat]   = useState(MOCK_CHAT);
  const [input, setInput] = useState('');
  const [ended, setEnded] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (ended) return undefined;
    const id = setInterval(() => setElapsed((s) => s + 1), ELAPSED_TICK);
    return () => clearInterval(id);
  }, [ended]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat, tab]);

  const sendMsg = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setChat((prev) => [...prev, {
      id: `m-${Date.now()}`, from: 'me', name: 'คุณ', text,
      at: new Date().toTimeString().slice(0, 5),
    }]);
    setInput('');
    setTimeout(() => {
      setChat((prev) => [...prev, {
        id: `m-${Date.now() + 1}`,
        from: 'doctor', name: 'นพ.ปรีชา',
        text: 'รับทราบครับ ขออัปเดตข้อมูลในระบบและจะแจ้งกลับให้ทราบนะครับ',
        at: new Date().toTimeString().slice(0, 5),
      }]);
    }, 1200);
  };

  const endCall = () => {
    setEnded(true);
    setTimeout(() => history.push(apt ? `/m/appointments/${apt.id}` : '/m/home'), 800);
  };

  return (
    <div style={{ background: '#0F1B17', color: '#FFFFFF', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top bar */}
      <div className='flex items-center' style={{
        padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)',
        background: 'rgba(255,255,255,0.04)',
        gap: 'var(--dim-space-300, 12px)',
      }}>
        <span style={{
          width: 36, height: 36, borderRadius: 'var(--dim-radius-full)',
          background: 'rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#FFFFFF',
        }}>
          <Sym name='medical_services' size={20} />
        </span>
        <div className='flex-1 min-w-0'>
          <p style={{ margin: 0, fontWeight: 700 }}>{apt ? apt.doctor : 'นพ.ปรีชา ปรารถนา'}</p>
          <div className='flex items-center' style={{ gap: 6, fontSize: 'var(--type-size-xs, 12px)', opacity: 0.8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: ended ? '#888' : '#4CC6AE', boxShadow: ended ? 'none' : '0 0 0 4px rgba(76,198,174,0.25)' }} />
            <span>{ended ? 'จบการสนทนาแล้ว' : `กำลังคุย · ${formatElapsed(elapsed)}`}</span>
          </div>
        </div>
        <button type='button' onClick={() => history.push('/m/home')} aria-label='ย่อหน้าจอ'
          style={{ width: 36, height: 36, borderRadius: 'var(--dim-radius-full)', background: 'rgba(255,255,255,0.12)', border: 'none', color: '#FFFFFF', cursor: 'pointer' }}>
          <Sym name='close_fullscreen' size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', padding: '8px var(--dim-space-400, 16px) 0', gap: 8 }}>
        {[{ k: 'video', l: 'วิดีโอคอล', i: 'videocam' }, { k: 'chat', l: 'แชท', i: 'chat' }].map((it) => {
          const active = it.k === tab;
          return (
            <button key={it.k} type='button' onClick={() => setTab(it.k)}
              style={{
                flex: 1, height: 36, borderRadius: 'var(--dim-radius-full)',
                background: active ? 'rgba(255,255,255,0.16)' : 'transparent',
                color: '#FFFFFF',
                border: active ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontSize: 'var(--type-size-sm, 14px)', fontWeight: active ? 700 : 500,
                cursor: 'pointer',
              }}>
              <Sym name={it.i} size={18} />
              {it.l}
            </button>
          );
        })}
      </div>

      {/* Main pane */}
      {tab === 'video' && (
        <div style={{ flex: 1, padding: 'var(--dim-space-400, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-300, 12px)' }}>
          {/* Doctor (remote) tile */}
          <div style={{
            flex: 1, minHeight: 220,
            background: 'linear-gradient(135deg, #1F3D33 0%, #0F1B17 100%)',
            borderRadius: 'var(--dim-radius-500, 16px)',
            position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            <div style={{
              width: 120, height: 120, borderRadius: '50%',
              background: 'linear-gradient(135deg, #4CC6AE 0%, #007549 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#FFFFFF', fontSize: 40, fontWeight: 700,
              boxShadow: '0 0 0 6px rgba(76,198,174,0.2), 0 0 0 14px rgba(76,198,174,0.08)',
            }}>นพ</div>
            <div style={{ position: 'absolute', bottom: 12, left: 12, fontSize: 'var(--type-size-xs, 12px)', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: 999 }}>
              {apt ? apt.doctor : 'นพ.ปรีชา ปรารถนา'}
            </div>
            <div style={{ position: 'absolute', top: 12, right: 12 }}>
              <MobileBadge tone='success'>HD</MobileBadge>
            </div>
          </div>
          {/* Local (me) PiP */}
          <div style={{
            width: 96, height: 128,
            position: 'absolute', bottom: 130, right: 28,
            background: camOn ? 'linear-gradient(135deg, #0F1B17 0%, #1F3D33 100%)' : '#000',
            borderRadius: 'var(--dim-radius-300, 10px)',
            border: '2px solid rgba(255,255,255,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#FFFFFF', overflow: 'hidden',
          }}>
            {camOn ? (
              <img src={CURRENT_USER.avatar} alt='you' style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            ) : (
              <Sym name='videocam_off' size={28} />
            )}
          </div>

          {/* Bottom-attached doc list — simulates "doctor shared a doc"
              (TOR §4.3.2) */}
          <div style={{
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 'var(--dim-radius-400, 12px)',
            padding: 'var(--dim-space-300, 12px)',
          }}>
            <p style={{ margin: '0 0 6px', fontSize: 'var(--type-size-xs, 12px)', opacity: 0.7, fontWeight: 700 }}>
              เอกสารที่แพทย์แชร์ในห้องนี้
            </p>
            <div className='flex items-center' style={{ gap: 8, padding: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
              <Sym name='picture_as_pdf' size={22} />
              <span style={{ flex: 1, fontSize: 'var(--type-size-sm, 14px)' }}>lab-2569-04-02.pdf</span>
              <button type='button' style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 6, color: '#FFFFFF', padding: '4px 10px', cursor: 'pointer' }}>
                เปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'chat' && (
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 'var(--dim-space-400, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-300, 12px)' }}>
          {chat.map((m) => {
            const mine = m.from === 'me';
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '78%',
                  padding: 'var(--dim-space-200, 8px) var(--dim-space-300, 12px)',
                  borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: mine ? 'var(--surface-brandPrimary-default, #007549)' : 'rgba(255,255,255,0.1)',
                  color: '#FFFFFF',
                  fontSize: 'var(--type-size-sm, 14px)',
                  lineHeight: 1.45,
                }}>
                  {!mine && <p style={{ margin: '0 0 2px', fontSize: 'var(--type-size-xs, 12px)', opacity: 0.7, fontWeight: 700 }}>{m.name}</p>}
                  <p style={{ margin: 0 }}>{m.text}</p>
                  {m.attach && (
                    <div style={{ marginTop: 6, padding: '6px 8px', background: 'rgba(255,255,255,0.12)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Sym name='attach_file' size={16} />
                      <span style={{ fontSize: 'var(--type-size-xs, 12px)' }}>{m.attach}</span>
                    </div>
                  )}
                  <p style={{ margin: '4px 0 0', fontSize: 10, opacity: 0.6, textAlign: 'right' }}>{m.at}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Composer (chat only) */}
      {tab === 'chat' && (
        <form onSubmit={sendMsg} style={{ padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)', display: 'flex', gap: 8, background: 'rgba(0,0,0,0.4)' }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder='พิมพ์ข้อความ…'
            style={{
              flex: 1, height: 40,
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 'var(--dim-radius-full)',
              color: '#FFFFFF', padding: '0 16px', outline: 'none',
              fontSize: 'var(--type-size-sm, 14px)',
            }} />
          <button type='submit' aria-label='ส่ง'
            style={{
              width: 40, height: 40, borderRadius: 'var(--dim-radius-full)',
              background: 'var(--surface-brandPrimary-default, #007549)',
              border: 'none', color: '#FFFFFF', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <Sym name='send' size={20} />
          </button>
        </form>
      )}

      {/* Action bar */}
      <div style={{ padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px) calc(var(--dim-space-500, 20px) + 4px)', display: 'flex', justifyContent: 'space-around', gap: 8, background: 'rgba(0,0,0,0.4)' }}>
        <CallBtn icon={micOn ? 'mic' : 'mic_off'} label={micOn ? 'ปิดไมค์' : 'เปิดไมค์'} onClick={() => setMicOn((v) => !v)} on={micOn} />
        <CallBtn icon={camOn ? 'videocam' : 'videocam_off'} label={camOn ? 'ปิดกล้อง' : 'เปิดกล้อง'} onClick={() => setCamOn((v) => !v)} on={camOn} />
        <CallBtn icon='screen_share' label='แชร์จอ' onClick={() => alert('แพทย์เป็นผู้แชร์หน้าจอ — ผู้รับบริการดูได้อย่างเดียว')} />
        <CallBtn icon='call_end' label='วางสาย' danger onClick={endCall} />
      </div>
    </div>
  );
};

const CallBtn = ({ icon, label, onClick, danger = false, on = true }) => (
  <button type='button' onClick={onClick}
    style={{
      background: 'transparent', border: 'none', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 4, color: '#FFFFFF', flex: 1, padding: 4,
    }}>
    <span style={{
      width: 48, height: 48, borderRadius: '50%',
      background: danger ? '#D43838' : on ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.32)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Sym name={icon} size={22} />
    </span>
    <span style={{ fontSize: 10, opacity: 0.85 }}>{label}</span>
  </button>
);

const MobileTelemedPage = () => (
  <MobileShell showBottomNav={false} background='#0F1B17'>
    <MobileTelemedInner />
  </MobileShell>
);

export default MobileTelemedPage;
