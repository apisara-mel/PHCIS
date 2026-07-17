import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import lottie from 'lottie-web';
import {
  MobileShell,
  MobileHeader,
  Sym,
  BrandButton,
  BrandSubdueButton,
  DangerButton,
  NeutralSubdueButton,
  CameraPermissionPopup,
  Textarea,
  BrandCircleSubdueIconButton,
} from '@/components/mobile';
import Alert from '@/components/alert/Alert';
import StatusBadge from '@/components/badge/StatusBadge';
import MobileIconBadge from '@/components/mobile/MobileIconBadge';
import { CURRENT_USER } from '@/data/mobileMock';
import { usePhcisLink, updateAppointment } from '@/data/phcisLink';

/* BMA Health · Telemed — Figma Mobile Application 2042:26776
   Flow: รอพบแพทย์ → วิดีโอ/เสียง → ให้คะแนน → สำเร็จ → ชำระเงิน */

const WAIT_JOIN_MS = 3500;

const MOCK_CHAT = [
  { id: 'm1', from: 'doctor', text: 'สวัสดีครับ วันนี้รู้สึกอย่างไรบ้าง?', at: '10:31' },
  { id: 'm2', from: 'me', text: 'มีอาการเจ็บหน้าอกแปลบๆ เป็นบางครั้งครับ', at: '10:32' },
];

const formatElapsed = (s) => {
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
};

const formatDurationThai = (s) => {
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm} นาที ${ss} วินาที`;
};

const ControlBtn = ({ icon, onClick, danger, badge, active = true, ariaLabel }) => (
  <button
    type='button'
    aria-label={ariaLabel}
    onClick={onClick}
    style={{
      position: 'relative',
      width: danger
        ? 'calc(var(--dim-size-1300, 60px) + var(--dim-space-050, 2px))'
        : 'calc(var(--dim-size-1100, 52px) + var(--dim-space-050, 2px))',
      height: danger
        ? 'calc(var(--dim-size-1300, 60px) + var(--dim-space-050, 2px))'
        : 'calc(var(--dim-size-1100, 52px) + var(--dim-space-050, 2px))',
      borderRadius: danger
        ? 'calc(var(--dim-radius-600, 24px) + var(--dim-space-100, 4px))'
        : 'var(--dim-radius-600, 24px)',
      border: danger
        ? 'var(--dim-stroke-100) solid rgba(239, 68, 68, 0.5)'
        : 'var(--dim-stroke-100) solid rgba(255,255,255,0.1)',
      background: danger
        ? 'var(--surface-danger-default, #DC2626)'
        : active
          ? 'rgba(39, 39, 42, 0.6)'
          : 'rgba(39, 39, 42, 0.85)',
      color: 'var(--text-content-on-content, #FFFFFF)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: danger
        ? '0 20px 25px rgba(220, 38, 38, 0.2)'
        : '0 10px 15px rgba(0, 0, 0, 0.1)',
      backdropFilter: 'blur(6px)',
    }}
  >
    <Sym
      name={icon}
      size={danger ? 'var(--dim-size-500, 24px)' : 'var(--dim-size-400, 20px)'}
    />
    {badge && (
      <span
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 10,
          height: 10,
          borderRadius: 'var(--dim-radius-full)',
          background: 'var(--surface-danger-default, #EF4444)',
          border: '2px solid #18181B',
        }}
      />
    )}
  </button>
);

const CallControls = ({
  micOn, camOn, chatBadge, onMic, onCam, onShare, onChat, onEnd,
}) => (
  <div
    className='flex items-center justify-between shrink-0'
    style={{
      height: 'calc(var(--dim-size-1800, 96px) + var(--dim-space-600, 24px))',
      padding: '0 var(--dim-space-600, 24px)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <ControlBtn icon={micOn ? 'mic' : 'mic_off'} active={micOn} onClick={onMic} ariaLabel='ไมโครโฟน' />
    <ControlBtn icon={camOn ? 'videocam' : 'videocam_off'} active={camOn} onClick={onCam} ariaLabel='กล้อง' />
    <ControlBtn icon='screen_share' onClick={onShare} ariaLabel='แชร์หน้าจอ' />
    <ControlBtn icon='chat' onClick={onChat} badge={chatBadge} ariaLabel='แชท' />
    <ControlBtn icon='call_end' danger onClick={onEnd} ariaLabel='วางสาย' />
  </div>
);

const SoundBars = () => {
  const heights = [
    'var(--dim-size-200, 12px)',
    'calc(var(--dim-size-300, 16px) + var(--dim-space-050, 2px))',
    'calc(var(--dim-size-500, 24px) + var(--dim-space-100, 4px) + var(--dim-stroke-100, 1px))',
    'var(--dim-size-700, 36px)',
    'calc(var(--dim-size-500, 24px) + var(--dim-space-050, 2px))',
    'calc(var(--dim-size-200, 12px) + var(--dim-space-050, 2px) + var(--dim-stroke-100, 1px))',
    'calc(var(--dim-size-600, 32px) + var(--dim-stroke-100, 1px))',
    'calc(var(--dim-size-300, 16px) + var(--dim-space-150, 6px))',
    'calc(var(--dim-size-200, 12px) + var(--dim-space-050, 2px) + var(--dim-stroke-100, 1px))',
  ];
  return (
    <div
      className='flex items-center justify-center'
      style={{
        gap: 'var(--dim-space-100, 4px)',
        height: 'var(--dim-size-700, 36px)',
      }}
    >
      {heights.map((h, i) => (
        <span
          key={i}
          style={{
            width: 'calc(var(--dim-space-100, 4px) + var(--dim-stroke-100, 1px))',
            height: h,
            borderRadius: 'var(--dim-radius-150, 6px)',
            background: 'var(--surface-info-default, #3B82F6)',
            animation: `mih-telemed-bar 0.9s ease-in-out ${i * 0.08}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
};

const ChatPanel = ({ open, onClose, chat, input, setInput, onSend, scrollRef }) => {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        background: 'rgba(15, 27, 23, 0.4)',
      }}
      onClick={onClose}
      role='presentation'
    >
      <div
        role='dialog'
        aria-label='แชท'
        onClick={(e) => e.stopPropagation()}
        style={{
          height: '62%',
          background: 'var(--surface-card-100)',
          borderTopLeftRadius: 'var(--dim-radius-600, 24px)',
          borderTopRightRadius: 'var(--dim-radius-600, 24px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div className='flex items-center' style={{ padding: 'var(--dim-space-400, 16px)', borderBottom: 'var(--dim-stroke-100) solid var(--border-content-tertiary)' }}>
          <p style={{ flex: 1, margin: 0, fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)' }}>แชทกับแพทย์</p>
          <button type='button' onClick={onClose} aria-label='ปิด' style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--text-content-default)' }}>
            <Sym name='close' size={22} />
          </button>
        </div>
        <div ref={scrollRef} className='flex-1 overflow-y-auto' style={{ padding: 'var(--dim-space-400, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-300, 12px)' }}>
          {chat.map((m) => {
            const mine = m.from === 'me';
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '78%',
                  padding: 'var(--dim-space-200, 8px) var(--dim-space-300, 12px)',
                  borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: mine ? 'var(--surface-brandPrimary-default, #007549)' : 'var(--surface-neutral-tertiary, #F4F5F5)',
                  color: mine ? 'var(--text-content-on-content, #FFF)' : 'var(--text-content-default)',
                  fontSize: 'var(--type-size-sm, 14px)',
                }}
                >
                  <p style={{ margin: 0 }}>{m.text}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 'var(--type-size-xs, 12px)', opacity: 0.65, textAlign: 'right' }}>{m.at}</p>
                </div>
              </div>
            );
          })}
        </div>
        <form
          onSubmit={onSend}
          className='flex'
          style={{ gap: 'var(--dim-space-200, 8px)', padding: 'var(--dim-space-300, 12px)', borderTop: 'var(--dim-stroke-100) solid var(--border-content-tertiary)' }}
        >
          <input
            className='mih-telemed-chat-input'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='พิมพ์ข้อความ…'
            style={{
              flex: 1,
              height: 44,
              borderRadius: 'var(--dim-radius-full)',
              border: 'var(--dim-stroke-100) solid var(--border-input-default)',
              padding: '0 var(--dim-space-400, 16px)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-base)',
            }}
          />
          <button
            type='submit'
            aria-label='ส่ง'
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--dim-radius-full)',
              border: 0,
              background: 'var(--surface-brandPrimary-default)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sym name='send' size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

const ReviewSheet = ({ open, doctorName, specialty, onClose, onSubmit }) => {
  const [stars, setStars] = useState(0);
  const [note, setNote] = useState('');
  if (!open) return null;
  const canSubmit = stars > 0 && note.trim().length > 0;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'flex-end',
        background: 'var(--surface-overlay-default, rgb(100 116 139 / 0.40))',
      }}
      onClick={onClose}
      role='presentation'
    >
      <div
        role='dialog'
        aria-modal='true'
        aria-label='ให้คะแนนการปรึกษา'
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxHeight: '92%',
          overflowY: 'auto',
          background: 'var(--surface-card-100)',
          borderTopLeftRadius: 'var(--dim-radius-700, 38px)',
          borderTopRightRadius: 'var(--dim-radius-700, 38px)',
          boxShadow: 'var(--shadow-drop-bottom-400)',
        }}
      >
        <div className='flex flex-col items-center' style={{ paddingTop: 'var(--dim-space-200, 8px)' }}>
          <span style={{ width: 36, height: 5, borderRadius: 'var(--dim-radius-full)', background: 'var(--border-content-tertiary)' }} />
          <div className='flex items-center w-full' style={{ padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)' }}>
            <span style={{ width: 40 }} aria-hidden />
            <p style={{
              flex: 1,
              margin: 0,
              textAlign: 'center',
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-base, 16px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.5,
            }}
            >
              ให้คะแนนการปรึกษา
            </p>
            <button
              type='button'
              aria-label='ปิด'
              onClick={onClose}
              style={{
                width: 40, height: 40, borderRadius: 'var(--dim-radius-full)', border: 0,
                background: 'var(--surface-brandPrimary-quaternary)', color: 'var(--text-brandPrimary-default)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Sym name='close' size='var(--dim-size-300, 16px)' />
            </button>
          </div>
        </div>

        <div
          className='flex flex-col'
          style={{
            gap: 'var(--dim-space-400, 16px)',
            padding: 'var(--dim-space-400, 16px) var(--dim-space-400, 16px) var(--dim-space-800, 32px)',
          }}
        >
          <div>
            <p style={{ margin: 0, fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)', color: 'var(--text-brandPrimary-default)' }}>
              ประสบการณ์โดยรวมของคุณเป็นอย่างไร?
            </p>
            <p style={{ margin: 'var(--dim-space-100, 4px) 0 0', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
              ความคิดเห็นของคุณจะช่วยให้เราปรับปรุงบริการให้ดียิ่งขึ้น
            </p>
          </div>

          <div
            className='flex items-center'
            style={{
              gap: 'var(--dim-space-200, 8px)',
              padding: 'var(--dim-space-300, 12px)',
              background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
              borderRadius: 'var(--dim-radius-400, 12px)',
            }}
          >
            <span className='overflow-hidden shrink-0' style={{ width: 40, height: 40, borderRadius: 'var(--dim-radius-full)' }}>
              <img
                src='/illustration/mobile/doctor-h.png'
                alt=''
                width={40}
                height={40}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scale(1.18)',
                }}
              />
            </span>
            <div>
              <p style={{ margin: 0, fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-sm)' }}>{doctorName}</p>
              <p style={{ margin: 0, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>{specialty}</p>
            </div>
          </div>

          <div className='flex justify-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            {[1, 2, 3, 4, 5].map((n) => {
              const on = n <= stars;
              return (
                <BrandCircleSubdueIconButton
                  key={n}
                  icon='star'
                  iconFill={on ? 1 : 0}
                  size='Large'
                  aria-label={`${n} ดาว`}
                  aria-pressed={on}
                  onClick={() => {
                    setStars(n);
                    setNote((currentNote) => currentNote || 'คุณหมอให้คำปรึกษาดีมาก');
                  }}
                />
              );
            })}
          </div>

          <Textarea
            label='ประสบการณ์โดยรวม'
            required
            showHelperText={false}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder='คุณหมอให้คำปรึกษาดีมาก'
            rows={4}
          />

          <BrandButton size='lg' trailingIcon='chevron_right' disabled={!canSubmit} onClick={() => onSubmit({ stars, note })}>
            ส่งรีวิว
          </BrandButton>
        </div>
      </div>
    </div>
  );
};

/* ─── Steps ─────────────────────────────────────────────────────────── */

const PdpaIllustration = () => {
  const hostRef = useRef(null);

  useEffect(() => {
    if (!hostRef.current) return undefined;
    const animation = lottie.loadAnimation({
      container: hostRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: '/illustration/mobile/Password-security-with-REC.json',
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
    });
    return () => animation.destroy();
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden
      style={{
        width: 'var(--dim-size-2000, 128px)',
        height: 'var(--dim-size-2000, 128px)',
      }}
    />
  );
};

const MicrophoneIllustration = () => {
  const hostRef = useRef(null);

  useEffect(() => {
    if (!hostRef.current) return undefined;
    const animation = lottie.loadAnimation({
      container: hostRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: '/illustration/mobile/Microphone.json',
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
    });
    return () => animation.destroy();
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden
      style={{
        width: 'var(--dim-size-1800, 96px)',
        height: 'var(--dim-size-1800, 96px)',
      }}
    />
  );
};

const MicrophonePermissionPopup = ({ onAllow, onDeny }) => (
  <div
    role='presentation'
    style={{
      position: 'absolute',
      inset: 0,
      zIndex: 90,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--surface-overlay-default, rgb(100 116 139 / 0.40))',
    }}
  >
    <section
      role='dialog'
      aria-modal='true'
      aria-labelledby='microphone-permission-title'
      className='flex flex-col items-center'
      style={{
        width: 'calc(100% - var(--dim-size-1200, 56px))',
        gap: 'var(--dim-space-600, 24px)',
        padding: 'var(--dim-space-600, 24px)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-popover-grey, #E2E4E6)',
        borderRadius: 'var(--dim-radius-500, 16px)',
        background: 'var(--surface-card-100, #FFFFFF)',
        boxShadow: 'var(--shadow-drop-bottom-400)',
      }}
    >
      <MicrophoneIllustration />

      <div
        className='flex flex-col items-center w-full'
        style={{ gap: 'var(--dim-space-300, 12px)', textAlign: 'center' }}
      >
        <h2
          id='microphone-permission-title'
          style={{
            width: '100%',
            margin: 0,
            fontFamily: 'var(--type-family-heading-graphic2)',
            fontSize: 'var(--type-size-xl, 20px)',
            fontWeight: 'var(--type-weight-regular, 400)',
            lineHeight: 1.375,
            color: 'var(--text-brandPrimary-default, #007549)',
          }}
        >
          อนุญาตให้เข้าถึงไมโครโฟน
        </h2>
        <p
          style={{
            width: '100%',
            margin: 0,
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            fontWeight: 'var(--type-weight-regular, 400)',
            lineHeight: 1.5,
            color: 'var(--text-content-tertiary, #858C92)',
          }}
        >
          แอปพลิเคชันจำเป็นต้องเข้าถึงไมโครโฟนของคุณ เพื่อใช้สื่อสารด้วยเสียงกับแพทย์ระหว่างการตรวจแบบออนไลน์ (Telemedicine)
        </p>
      </div>

      <div
        className='flex flex-col w-full'
        style={{
          maxWidth: 'calc(var(--dim-size-2450, 280px) - var(--dim-space-500, 20px) + var(--dim-stroke-100, 1px))',
          gap: 'var(--dim-space-300, 12px)',
        }}
      >
        <BrandButton size='Large' onClick={onAllow}>อนุญาต</BrandButton>
        <BrandButton size='Large' variant='Outline' onClick={onDeny}>ไม่อนุญาต</BrandButton>
      </div>
    </section>
  </div>
);

const CancelAppointmentPopup = ({ onConfirm, onClose }) => (
  <div
    role='presentation'
    style={{
      position: 'absolute',
      inset: 0,
      zIndex: 90,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--surface-overlay-default, rgb(100 116 139 / 0.40))',
    }}
  >
    <section
      role='dialog'
      aria-modal='true'
      aria-labelledby='cancel-appointment-title'
      className='flex flex-col items-center'
      style={{
        width: 'calc(100% - var(--dim-size-1200, 56px))',
        gap: 'var(--dim-space-600, 24px)',
        padding: 'var(--dim-space-600, 24px)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-popover-grey, #E2E4E6)',
        borderRadius: 'var(--dim-radius-500, 16px)',
        background: 'var(--surface-card-100, #FFFFFF)',
        boxShadow: 'var(--shadow-drop-bottom-400)',
      }}
    >
      <span
        className='inline-flex items-center justify-center'
        style={{
          width: 'var(--dim-size-1400, 64px)',
          height: 'var(--dim-size-1400, 64px)',
          borderRadius: 'var(--dim-radius-full, 9999px)',
          background: 'var(--surface-danger-quaternary, #FFF0F0)',
        }}
      >
        <img
          src='/illustration/mobile/alert-octagon.png'
          alt=''
          aria-hidden
          style={{
            width: 'var(--dim-size-500, 24px)',
            height: 'var(--dim-size-500, 24px)',
          }}
        />
      </span>

      <div
        className='flex flex-col items-center w-full'
        style={{ gap: 'var(--dim-space-300, 12px)', textAlign: 'center' }}
      >
        <h2
          id='cancel-appointment-title'
          style={{
            width: '100%',
            margin: 0,
            fontFamily: 'var(--type-family-heading-graphic2)',
            fontSize: 'var(--type-size-xl, 20px)',
            fontWeight: 'var(--type-weight-regular, 400)',
            lineHeight: 1.375,
            color: 'var(--text-content-default, #363B3F)',
          }}
        >
          ต้องการยกเลิกการนัดหมาย
        </h2>
        <p
          style={{
            width: '100%',
            margin: 0,
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            fontWeight: 'var(--type-weight-regular, 400)',
            lineHeight: 1.5,
            color: 'var(--text-content-tertiary, #858C92)',
          }}
        >
          คุณยืนยันต้องการยกเลิกการนัดหมายนี้
        </p>
      </div>

      <div
        className='flex flex-col w-full'
        style={{
          maxWidth: 'calc(var(--dim-size-2450, 280px) - var(--dim-space-500, 20px) + var(--dim-stroke-100, 1px))',
          gap: 'var(--dim-space-300, 12px)',
        }}
      >
        <DangerButton size='Large' onClick={onConfirm}>ยืนยัน</DangerButton>
        <NeutralSubdueButton size='Large' variant='Outline' onClick={onClose}>
          ยกเลิก
        </NeutralSubdueButton>
      </div>
    </section>
  </div>
);

const PdpaConsent = ({ onAccept, onCancel }) => (
  <div
    className='flex flex-col'
    style={{
      height: '100%',
      minHeight: 0,
      background: 'var(--background-screen-brand-100, #F4FBF8)',
    }}
  >
    <MobileHeader
      title='ขออนุญาตบันทึก'
      backIcon='chevron_left'
      onBack={onCancel}
      right={<span aria-hidden style={{ width: 'var(--dim-size-800, 40px)', height: 'var(--dim-size-800, 40px)' }} />}
      containerStyle={{
        height: 'var(--dim-size-1500, 68px)',
        padding: '0 var(--dim-space-200, 8px)',
        gap: 'var(--dim-space-300, 12px)',
        background: 'var(--surface-navigation-default, #FFFFFF)',
        borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
        boxShadow: 'var(--shadow-brand-drop-bottom-100)',
      }}
      titleStyle={{
        fontFamily: 'var(--type-family-heading-graphic2)',
        fontSize: 'var(--type-size-base, 16px)',
        fontWeight: 'var(--type-weight-regular, 400)',
        lineHeight: 1.5,
        textAlign: 'center',
        color: 'var(--text-content-default, #363B3F)',
      }}
    />

    <main
      className='flex-1 min-h-0'
      style={{ padding: 'var(--dim-space-400, 16px)' }}
    >
      <section
        className='flex flex-col items-center justify-center'
        style={{
          width: '100%',
          height: '100%',
          paddingInline: 'var(--dim-space-400, 16px)',
          borderRadius: 'var(--dim-radius-600, 24px)',
          background: 'var(--surface-card-100, #FFFFFF)',
          boxShadow: 'var(--shadow-brand-drop-bottom-200)',
        }}
      >
        <PdpaIllustration />

        <div
          className='flex flex-col items-center w-full'
          style={{
            gap: 'var(--dim-space-150, 6px)',
            paddingBottom: 'var(--dim-space-600, 24px)',
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              width: '100%',
              margin: 0,
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-xl, 20px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.375,
              color: 'var(--text-brandPrimary-default, #007549)',
            }}
          >
            ขออนุญาตบันทึกภาพและเสียง
          </h1>
          <p
            style={{
              width: '100%',
              margin: 0,
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.5,
              color: 'var(--text-content-tertiary, #858C92)',
            }}
          >
            การสนทนานี้อาจถูกบันทึกภาพและเสียงเพื่อใช้เป็น
            <br aria-hidden />
            หลักฐานทางการแพทย์และพัฒนาคุณภาพการบริการ
          </p>
        </div>

        <p
          style={{
            width: '100%',
            margin: 0,
            textAlign: 'center',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs, 12px)',
            fontWeight: 'var(--type-weight-regular, 400)',
            lineHeight: 1.5,
            color: 'var(--text-content-tertiary, #858C92)',
          }}
        >
          ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA)
        </p>
      </section>
    </main>

    <footer
      className='flex flex-col shrink-0'
      style={{
        gap: 'var(--dim-space-300, 12px)',
        padding: 'var(--dim-space-400, 16px)',
        background: 'var(--surface-card-100, #FFFFFF)',
        borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
        boxShadow: 'var(--shadow-brand-drop-top-100)',
      }}
    >
      <BrandButton size='Large' onClick={onAccept}>
        ข้าพเจ้ายินยอมให้บันทึกภาพและเสียง
      </BrandButton>
      <BrandButton size='Medium' variant='Ghost' onClick={onCancel}>
        ยกเลิก
      </BrandButton>
    </footer>
  </div>
);

/* Live self-view — actually opens the device camera so the readiness check verifies
   the real camera works. Falls back to the mock self-view image when no camera is
   available (no device / OS-denied / headless). Mirrored like a front-facing selfie. */
const SelfCameraView = ({ active = true, mirrored = true, fallbackSrc = '/illustration/mobile/telemed-camera-preview.png' }) => {
  const videoRef = useRef(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!active) { setLive(false); return undefined; }
    let stream = null;
    let cancelled = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices?.getUserMedia?.({ video: { facingMode: 'user' }, audio: false });
        if (cancelled || !stream) return;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setLive(true);
      } catch {
        setLive(false); /* keep the mock fallback so the preview is never empty */
      }
    })();
    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [active]);

  const fill = { width: '100%', height: '100%', objectFit: 'cover' };
  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ ...fill, transform: mirrored ? 'scaleX(-1)' : 'none', display: live ? 'block' : 'none' }}
      />
      {!live && <img src={fallbackSrc} alt='ภาพตัวอย่างจากกล้องวิดีโอ' style={fill} />}
    </>
  );
};

const ReadinessCheck = ({
  micOn,
  camOn,
  onCancel,
  onContinue,
  onRetest,
}) => (
  <div
    className='flex flex-col'
    style={{ height: '100%', minHeight: 0, background: 'var(--background-screen-brand-100, #F4FBF8)' }}
  >
    <MobileHeader
      title='ตรวจสอบความพร้อม'
      backIcon='chevron_left'
      onBack={onCancel}
      right={<span aria-hidden style={{ width: 'var(--dim-size-800, 40px)', height: 'var(--dim-size-800, 40px)' }} />}
      containerStyle={{
        height: 'var(--dim-size-1500, 68px)',
        padding: '0 var(--dim-space-200, 8px)',
        gap: 'var(--dim-space-300, 12px)',
        background: 'var(--surface-navigation-default, #FFFFFF)',
        borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
        boxShadow: 'var(--shadow-brand-drop-bottom-100)',
      }}
      titleStyle={{
        fontFamily: 'var(--type-family-heading-graphic2)',
        fontSize: 'var(--type-size-base, 16px)',
        fontWeight: 'var(--type-weight-regular, 400)',
        lineHeight: 1.5,
        textAlign: 'center',
        color: 'var(--text-content-default, #363B3F)',
      }}
    />
    <div
      className='flex-1 min-h-0'
      style={{
        padding: 'var(--dim-space-400, 16px)',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          background: 'var(--surface-card-100)',
          borderRadius: 'var(--dim-radius-600, 24px)',
          boxShadow: 'var(--shadow-brand-drop-bottom-200)',
          paddingTop: 'var(--dim-space-600, 24px)',
          paddingBottom: 'var(--dim-space-400, 16px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          className='flex flex-col items-center w-full'
          style={{
            gap: 'var(--dim-space-150, 6px)',
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              width: '100%',
              margin: 0,
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-xl, 20px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.375,
              color: 'var(--text-brandPrimary-default, #007549)',
            }}
          >
            ตรวจสอบความพร้อม
          </h1>
          <p
            style={{
              width: '100%',
              margin: 0,
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.5,
              color: 'var(--text-content-tertiary, #858C92)',
            }}
          >
            กรุณาตรวจสอบกล้อง ไมโครโฟน และอินเทอร์เน็ตของท่าน เพื่อให้การสนทนากับแพทย์เป็นไปอย่างราบรื่น
          </p>
        </div>

        <div
          className='flex flex-col w-full'
          style={{
            gap: 'var(--dim-space-200, 8px)',
            padding: 'var(--dim-space-600, 24px) var(--dim-space-400, 16px) var(--dim-space-400, 16px)',
          }}
        >
          <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <p style={{
              flex: 1,
              margin: 0,
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-sm, 14px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.5,
              color: 'var(--text-content-default, #363B3F)',
            }}
            >
              กล้องวิดีโอ
            </p>
            <StatusBadge style={camOn ? 'success' : 'error'} size='small'>
              {camOn ? 'พร้อมใช้งาน' : 'ไม่พร้อมใช้งาน'}
            </StatusBadge>
          </div>
          <div
            style={{
              width: '100%',
              aspectRatio: '356 / 199.375',
              overflow: 'hidden',
              borderRadius: 'var(--dim-radius-500, 16px)',
              background: 'var(--surface-neutral-tertiary, #F4F5F5)',
            }}
          >
            <SelfCameraView active={camOn} />
          </div>
        </div>

        <div
          className='flex flex-col w-full'
          style={{
            gap: 'var(--dim-space-200, 8px)',
            padding: '0 var(--dim-space-400, 16px) var(--dim-space-400, 16px)',
          }}
        >
          <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <p style={{
              flex: 1,
              margin: 0,
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-sm, 14px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.5,
              color: 'var(--text-content-default, #363B3F)',
            }}
            >
              ไมโครโฟน
            </p>
            <StatusBadge style={micOn ? 'success' : 'error'} size='small'>
              {micOn ? 'พร้อมใช้งาน' : 'ไม่พร้อมใช้งาน'}
            </StatusBadge>
          </div>
          <SoundBars />
        </div>

        <div style={{ width: '100%', padding: '0 var(--dim-space-400, 16px)' }}>
          <Alert
            type='warning'
            title='หากพบปัญหาในการเชื่อมต่อ'
            subtext='หากพบปัญหาในการเชื่อมต่อ หรือไม่ได้ยินเสียง กรุณากด "ทดสอบอีกครั้ง" หรือตรวจสอบการตั้งค่าของอุปกรณ์'
            showDetail={false}
            showBadge={false}
            showIndicator={false}
            showCloseButton={false}
            iconSize={16}
            titleStyle={{
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-sm, 14px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.5,
            }}
            subtextStyle={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs, 12px)',
              fontWeight: 'var(--type-weight-medium, 500)',
              lineHeight: 1.5,
            }}
            textGap='var(--dim-space-050, 2px)'
          />
        </div>
      </div>
    </div>
    <footer
      className='flex flex-col shrink-0 w-full'
      style={{
        gap: 'var(--dim-space-300, 12px)',
        padding: 'var(--dim-space-400, 16px)',
        boxSizing: 'border-box',
        background: 'var(--surface-card-100, #FFFFFF)',
        borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
        boxShadow: 'var(--shadow-brand-drop-top-100)',
      }}
    >
      <div
        className='flex flex-col items-start w-full'
        style={{ gap: 'var(--dim-space-300, 12px)' }}
      >
        <BrandButton size='Large' onClick={onContinue} style={{ width: '100%' }}>
          เข้าสู่ห้องรอตรวจ
        </BrandButton>
        <BrandButton
          size='Medium'
          variant='Ghost'
          leadingIcon='refresh'
          onClick={onRetest}
          style={{ width: '100%' }}
        >
          ทดสอบอุปกรณ์อีกครั้ง
        </BrandButton>
      </div>
    </footer>
  </div>
);

const WaitingRoom = ({
  doctorName,
  specialty,
  waitSec,
  micOn,
  camOn,
  onToggleMic,
  onToggleCam,
  onCancel,
}) => {
  const [waitMinutes, waitSeconds] = formatElapsed(waitSec).split(':');

  return (
    <div
      className='flex flex-col'
      style={{
        height: '100%',
        minHeight: 0,
        background: 'var(--background-screen-brand-100, #F4FBF8)',
      }}
    >
      <MobileHeader
        title='รอพบแพทย์'
        backIcon='chevron_left'
        onBack={onCancel}
        right={<span aria-hidden style={{ width: 'var(--dim-size-800, 40px)', height: 'var(--dim-size-800, 40px)' }} />}
        containerStyle={{
          height: 'var(--dim-size-1500, 68px)',
          padding: '0 var(--dim-space-200, 8px)',
          background: 'var(--surface-navigation-default, #FFFFFF)',
          borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
          boxShadow: 'var(--shadow-brand-drop-bottom-100)',
        }}
        titleStyle={{
          textAlign: 'center',
          fontSize: 'var(--type-size-base, 16px)',
          fontWeight: 'var(--type-weight-regular, 400)',
          lineHeight: 1.5,
        }}
      />

      <main
        className='flex-1 min-h-0 overflow-y-auto'
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--dim-space-400, 16px)',
          padding: 'var(--dim-space-400, 16px)',
        }}
      >
        <div
          style={{
            width: '100%',
            padding: 'var(--dim-space-400, 16px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--dim-space-300, 12px)',
            borderRadius: 'var(--dim-radius-600, 24px)',
            background: 'var(--surface-card-100, #FFFFFF)',
            boxShadow: 'var(--shadow-brand-drop-bottom-200)',
          }}
        >
          <section
            aria-label='สถานะการรอพบแพทย์'
            style={{
              width: '100%',
              padding: 'var(--dim-space-400, 16px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--dim-space-200, 8px)',
              borderRadius: 'var(--dim-radius-600, 24px)',
              background: 'var(--surface-card-skycyan-100, #F4F9FD)',
            }}
          >
            <span
              className='relative inline-flex items-center justify-center'
              style={{
                width: 'calc(var(--dim-size-1700, 80px) + var(--dim-space-200, 8px) + var(--dim-space-050, 2px))',
                height: 'calc(var(--dim-size-1700, 80px) + var(--dim-space-200, 8px) + var(--dim-space-050, 2px))',
              }}
            >
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 'var(--dim-radius-full, 9999px)',
                  border: 'var(--dim-stroke-100, 1px) solid var(--border-info-quaternary, #DBEAFE)',
                }}
              />
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 'calc(var(--dim-space-200, 8px) + var(--dim-stroke-100, 1px))',
                  borderRadius: 'var(--dim-radius-full, 9999px)',
                  border: 'var(--dim-stroke-100, 1px) solid var(--border-info-tertiary, #BFDBFE)',
                }}
              />
              <span
                className='overflow-hidden'
                style={{
                  width: 'var(--dim-size-1300, 60px)',
                  height: 'var(--dim-size-1300, 60px)',
                  borderRadius: 'var(--dim-radius-full, 9999px)',
                  border: 'var(--dim-stroke-400, 4px) solid var(--border-image-default, #FFFFFF)',
                  boxShadow: 'var(--shadow-brand-drop-bottom-200)',
                  zIndex: 1,
                }}
              >
                <img
                  src='/illustration/mobile/doctor-h.png'
                  alt=''
                  width={60}
                  height={60}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </span>
            </span>

            <StatusBadge style='success' size='small' showDot>
              กำลังรอแพทย์เข้าร่วม
            </StatusBadge>

            <div className='flex flex-col items-center w-full' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <h1
                style={{
                  width: '100%',
                  margin: 0,
                  fontFamily: 'var(--type-family-heading-graphic2)',
                  fontSize: 'var(--type-size-lg, 18px)',
                  fontWeight: 'var(--type-weight-regular, 400)',
                  lineHeight: 1.5,
                  color: 'var(--text-brandPrimary-default, #007549)',
                  textAlign: 'center',
                }}
              >
                {doctorName}
              </h1>
              <p
                className='inline-flex items-center'
                style={{
                  margin: 0,
                  gap: 'var(--dim-space-100, 4px)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm, 14px)',
                  fontWeight: 'var(--type-weight-regular, 400)',
                  lineHeight: 1.5,
                  color: 'var(--text-content-tertiary, #858C92)',
                }}
              >
                <Sym name='stethoscope' size='var(--dim-size-200, 12px)' />
                {specialty}
              </p>
            </div>

            <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <p
                style={{
                  margin: 0,
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xs, 12px)',
                  fontWeight: 'var(--type-weight-medium, 500)',
                  lineHeight: 1.5,
                  color: 'var(--text-content-tertiary, #858C92)',
                }}
              >
                ระยะเวลาที่รอ
              </p>
              <div
                className='inline-flex items-center'
                style={{
                  gap: 'var(--dim-space-100, 4px)',
                  padding: 'var(--dim-space-100, 4px) var(--dim-space-300, 12px)',
                  borderRadius: 'var(--dim-radius-600, 24px)',
                  border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-tertiary, #C5EDDA)',
                  background: 'var(--surface-card-100, #FFFFFF)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-2xl, 24px)',
                  lineHeight: 1.5,
                  whiteSpace: 'nowrap',
                }}
              >
                <strong style={{ fontWeight: 'var(--type-weight-bold, 700)', color: 'var(--text-brandPrimary-secondary, #08A768)' }}>
                  {waitMinutes}
                </strong>
                <span style={{ fontWeight: 'var(--type-weight-regular, 400)', color: 'var(--border-brandPrimary-tertiary, #C5EDDA)' }}>:</span>
                <strong style={{ fontWeight: 'var(--type-weight-bold, 700)', color: 'var(--text-brandPrimary-secondary, #08A768)' }}>
                  {waitSeconds}
                </strong>
              </div>
            </div>
          </section>

          <section
            aria-label='ตัวควบคุมไมโครโฟนและกล้อง'
            className='flex flex-col items-center w-full'
            style={{
              gap: 'calc(var(--dim-space-200, 8px) + var(--dim-space-050, 2px))',
              padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)',
              borderRadius: 'calc(var(--dim-radius-500, 16px) + var(--dim-space-050, 2px))',
              background: 'var(--surface-card-100, #FFFFFF)',
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs, 12px)',
                fontWeight: 'var(--type-weight-medium, 500)',
                lineHeight: 1.5,
                color: 'var(--text-content-tertiary, #858C92)',
              }}
            >
              ตรวจสอบไมค์และกล้องก่อนเข้าห้องตรวจ
            </p>
            <div className='flex items-start' style={{ gap: 'var(--dim-size-1000, 48px)' }}>
              {[
                { on: micOn, icon: micOn ? 'mic' : 'mic_off', label: micOn ? 'ไมค์เปิด' : 'ไมค์ปิด', toggle: onToggleMic },
                { on: camOn, icon: camOn ? 'videocam' : 'videocam_off', label: camOn ? 'กล้องเปิด' : 'กล้องปิด', toggle: onToggleCam },
              ].map((control) => (
                <button
                  key={control.label}
                  type='button'
                  onClick={control.toggle}
                  aria-pressed={control.on}
                  className='flex flex-col items-center'
                  style={{
                    gap: 'var(--dim-space-150, 6px)',
                    padding: 0,
                    border: 0,
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    className='inline-flex items-center justify-center'
                    style={{
                      width: 'var(--dim-size-1200, 56px)',
                      height: 'var(--dim-size-1200, 56px)',
                      borderRadius: 'var(--dim-radius-full, 9999px)',
                      background: control.on
                        ? 'var(--surface-brandPrimaryButton-tertiary, #E2F3EB)'
                        : 'var(--surface-danger-quaternary, #FEF2F2)',
                      color: control.on
                        ? 'var(--text-brandPrimary-default, #007549)'
                        : 'var(--text-danger-default, #DC2626)',
                    }}
                  >
                    <Sym name={control.icon} size='var(--dim-size-500, 24px)' />
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-xs, 12px)',
                      fontWeight: 'var(--type-weight-medium, 500)',
                      lineHeight: 1.5,
                      color: 'var(--text-content-default, #363B3F)',
                    }}
                  >
                    {control.label}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <Alert
            type='info'
            title='หากแพทย์ไม่สามารถเข้าร่วมห้องสนทนาได้ภายใน 15 นาที ระบบจะทำการยกเลิกนัดหมายนี้ และ คืนค่าบริการเต็มจำนวน กลับเข้าสู่บัญชีของคุณ'
            showSubtext={false}
            showDetail={false}
            showBadge={false}
            showIndicator={false}
            showCloseButton={false}
            iconName='shield'
            iconSize={16}
            titleStyle={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs, 12px)',
              fontWeight: 'var(--type-weight-medium, 500)',
              lineHeight: 1.5,
            }}
          />
        </div>
      </main>

      <footer
        style={{
          padding: 'var(--dim-space-400, 16px)',
          background: 'var(--surface-card-100, #FFFFFF)',
          borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
          boxShadow: 'var(--shadow-brand-drop-top-100)',
        }}
      >
        <BrandSubdueButton variant='outline' size='lg' onClick={onCancel}>
          ยกเลิกการนัดหมายนี้
        </BrandSubdueButton>
      </footer>
    </div>
  );
};

const VideoCall = ({
  doctorName, micOn, camOn, elapsed, chatBadge,
  onMic, onCam, onShare, onChat, onEnd, chatOpen, chatProps,
}) => (
  <div
    className='flex flex-col'
    style={{
      height: '100%',
      minHeight: 0,
      position: 'relative',
      background: 'var(--background-screen-brand-100)',
    }}
  >
    <div
      className='flex items-center justify-center shrink-0'
      style={{
        height: 'var(--dim-size-1500, 68px)',
        background: 'var(--surface-navigation-default)',
        boxShadow: 'var(--shadow-brand-drop-bottom-100)',
        fontFamily: 'var(--type-family-heading-graphic2)',
        fontSize: 'var(--type-size-base, 16px)',
        fontWeight: 'var(--type-weight-regular, 400)',
        lineHeight: 1.5,
        color: 'var(--text-content-default)',
      }}
    >
      {doctorName}
    </div>

    <div className='flex-1 relative overflow-hidden' style={{ background: 'var(--surface-neutral-tertiary, #27272A)' }}>
      {/* Doctor feed — a slow ken-burns loop + faint vignette make the still read as a
         live webcam rather than a frozen photo (เหมือนคุย video call). */}
      <img
        src='/illustration/mobile/doctor-h.png'
        alt={doctorName}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', filter: 'saturate(1.05)',
          transformOrigin: '52% 42%',
          animation: 'mih-telemed-live 16s ease-in-out infinite',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(120% 90% at 50% 38%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.28) 100%)',
        }}
      />
      {/* LIVE pill — top-left */}
      <div
        className='inline-flex items-center'
        style={{
          position: 'absolute',
          top: 'var(--dim-space-300, 12px)',
          left: 'var(--dim-space-300, 12px)',
          gap: 'var(--dim-space-100, 4px)',
          padding: 'var(--dim-space-050, 2px) var(--dim-space-200, 8px)',
          borderRadius: 'var(--dim-radius-full, 9999px)',
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(6px)',
          color: '#FFFFFF',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs, 12px)',
          fontWeight: 'var(--type-weight-medium, 500)',
          letterSpacing: '0.04em',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 'var(--dim-space-150, 6px)',
            height: 'var(--dim-space-150, 6px)',
            borderRadius: 'var(--dim-radius-full, 9999px)',
            background: 'var(--surface-danger-default, #EF4444)',
            animation: 'mih-telemed-livedot 1.4s ease-in-out infinite',
          }}
        />
        LIVE
      </div>
      <div
        style={{
          position: 'absolute',
          top: 'var(--dim-space-200, 8px)',
          right: 'var(--dim-space-200, 8px)',
          width: 'calc(var(--dim-size-1500, 68px) + var(--dim-size-600, 32px))',
          height: 'calc(var(--dim-size-2000, 128px) + var(--dim-space-300, 12px))',
          borderRadius: 'var(--dim-radius-450, 14px)',
          overflow: 'hidden',
          border: 'var(--dim-stroke-100) solid rgba(255,255,255,0.2)',
          background: '#27272A',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
        }}
      >
        {camOn ? (
          <SelfCameraView active={camOn} />
        ) : (
          <div className='flex items-center justify-center h-full' style={{ color: 'rgba(255,255,255,0.7)' }}>
            <Sym name='videocam_off' size={28} />
          </div>
        )}
      </div>
    </div>

    <CallControls
      micOn={micOn}
      camOn={camOn}
      chatBadge={chatBadge}
      onMic={onMic}
      onCam={onCam}
      onShare={onShare}
      onChat={onChat}
      onEnd={onEnd}
    />
    <ChatPanel open={chatOpen} {...chatProps} />
  </div>
);

const AudioCall = ({
  doctorName, specialty, micOn, camOn, elapsed, chatBadge,
  onMic, onCam, onShare, onChat, onEnd, onBack, chatOpen, chatProps,
}) => (
  <div className='flex flex-col' style={{ height: '100%', minHeight: 0, position: 'relative', background: 'var(--surface-card-100)' }}>
    <MobileHeader title={doctorName} onBack={onBack} />
    <div className='flex-1 flex flex-col items-center justify-center' style={{ gap: 'var(--dim-space-400, 16px)', padding: 'var(--dim-space-400, 16px)' }}>
      <span className='relative inline-flex items-center justify-center' style={{ width: 90, height: 90 }}>
        <span style={{ position: 'absolute', inset: 0, borderRadius: 'var(--dim-radius-full)', border: 'var(--dim-stroke-100) solid var(--border-info-quaternary, #DBEAFE)' }} />
        <span style={{ position: 'absolute', inset: '9%', borderRadius: 'var(--dim-radius-full)', border: 'var(--dim-stroke-100) solid var(--border-info-tertiary, #BFDBFE)' }} />
        <span className='overflow-hidden' style={{
          width: 60, height: 60, borderRadius: 'var(--dim-radius-full)',
          border: 'var(--dim-stroke-400, 4px) solid #fff', zIndex: 1,
        }}
        >
          <img src='/illustration/mobile/doctor-h.png' alt='' width={60} height={60} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </span>
      </span>

      <StatusBadge style='info' size='small' showDot>โหมดเสียง (สัญญาณอินเทอร์เน็ตต่ำ)</StatusBadge>

      <div className='flex flex-col items-center' style={{ gap: 6 }}>
        <p style={{
          margin: 0,
          fontFamily: 'var(--type-family-heading-graphic2)',
          fontSize: 'var(--type-size-xl, 20px)',
          color: 'var(--text-brandPrimary-default)',
        }}
        >
          {doctorName}
        </p>
        <p className='inline-flex items-center' style={{ margin: 0, gap: 4, fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>
          <Sym name='stethoscope' size={14} />
          {specialty}
        </p>
      </div>

      <p style={{ margin: 0, fontSize: 'var(--type-size-xl, 20px)', color: 'var(--text-content-default)' }}>
        {formatElapsed(elapsed)}
      </p>
      <SoundBars />
    </div>

    <CallControls
      micOn={micOn}
      camOn={camOn}
      chatBadge={chatBadge}
      onMic={onMic}
      onCam={onCam}
      onShare={onShare}
      onChat={onChat}
      onEnd={onEnd}
    />
    <ChatPanel open={chatOpen} {...chatProps} />
  </div>
);

const DoneScreen = ({ doctorName, specialty, locationLabel, elapsed, onPay }) => (
  <div
    className='flex items-center justify-center'
    style={{
      height: '100%',
      minHeight: 0,
      padding: 'var(--dim-space-600, 24px) var(--dim-space-400, 16px)',
      background: 'linear-gradient(155.3deg, rgb(19 178 146) 0%, rgb(1 180 160) 100%)',
    }}
  >
    <div
      style={{
        width: '100%',
        background: 'var(--surface-card-100)',
        borderTopLeftRadius: 'calc(var(--dim-size-1500, 68px) + var(--dim-size-600, 32px))',
        borderTopRightRadius: 'calc(var(--dim-size-1500, 68px) + var(--dim-size-600, 32px))',
        borderBottomLeftRadius: 'var(--dim-radius-600, 24px)',
        borderBottomRightRadius: 'var(--dim-radius-600, 24px)',
        padding: 'var(--dim-space-1200, 48px) var(--dim-space-400, 16px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--dim-space-400, 16px)',
        alignItems: 'center',
      }}
    >
      <img
        src='/illustration/mobile/booking-success-award.png'
        alt=''
        aria-hidden
        width={160}
        height={160}
        style={{
          width: 'calc(var(--dim-size-2000, 128px) + var(--dim-size-600, 32px))',
          height: 'calc(var(--dim-size-2000, 128px) + var(--dim-size-600, 32px))',
          objectFit: 'contain',
          flexShrink: 0,
        }}
      />
      <h1 style={{
        margin: 0, textAlign: 'center',
        fontFamily: 'var(--type-family-heading-graphic2)',
        fontSize: 'var(--type-size-2xl, 24px)',
        fontWeight: 'var(--type-weight-regular, 400)',
        lineHeight: 1.375,
        color: 'var(--text-brandPrimary-default)',
      }}
      >
        การพบแพทย์ออนไลน์เสร็จสิ้น
      </h1>
      <p style={{
        margin: 0,
        textAlign: 'center',
        fontFamily: 'var(--type-family-heading-graphic2)',
        fontSize: 'var(--type-size-base, 16px)',
        lineHeight: 1.5,
        color: 'var(--text-content-secondary)',
      }}
      >
        คุณได้เข้ารับบริการพบแพทย์ออนไลน์
        <br />
        เรียบร้อยแล้ว
      </p>

      <div
        style={{
          width: '100%',
          padding: 'var(--dim-space-400, 16px)',
          borderRadius: 'var(--dim-radius-600, 24px)',
          border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
          background: 'var(--surface-card-100)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--dim-space-400, 16px)',
        }}
      >
        <div
          className='flex items-center'
          style={{
            width: '100%',
            gap: 'var(--dim-space-200, 8px)',
            padding: 'var(--dim-space-300, 12px)',
            borderRadius: 'var(--dim-radius-400, 12px)',
            background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
          }}
        >
          <span
            className='overflow-hidden shrink-0'
            style={{
              width: 'var(--dim-size-800, 40px)',
              height: 'var(--dim-size-800, 40px)',
              borderRadius: 'var(--dim-radius-full)',
            }}
          >
            <img
              src='/illustration/mobile/doctor-h.png'
              alt=''
              width={40}
              height={40}
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.18)' }}
            />
          </span>
          <div>
            <p style={{ margin: 0, fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)' }}>{doctorName}</p>
            <p style={{ margin: 0, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>{specialty}</p>
          </div>
        </div>
        <div className='flex items-start' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <MobileIconBadge icon='schedule' tone='green' size={40} iconSize={16} />
          <div>
            <p style={{ margin: 0, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>ระยะเวลาการสนทนา</p>
            <p style={{ margin: 0, fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold, 700)' }}>{formatDurationThai(elapsed)}</p>
          </div>
        </div>
        <div className='flex items-start' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <MobileIconBadge icon='location_on' tone='green' size={40} iconSize={16} />
          <div>
            <p style={{ margin: 0, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>ศูนย์ให้บริการ</p>
            <p style={{ margin: 0, fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold, 700)' }}>{locationLabel}</p>
          </div>
        </div>
      </div>

      <BrandButton
        size='lg'
        trailingIcon='chevron_right'
        onClick={onPay}
        style={{ width: 'var(--dim-size-2280, 218px)' }}
      >
        ดำเนินการชำระเงิน
      </BrandButton>
    </div>
  </div>
);

/* ─── Page ──────────────────────────────────────────────────────────── */

const MobileTelemedInner = ({ onStepChange }) => {
  const history = useHistory();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const aptId = params.get('apt');
  const requestedStage = params.get('stage');
  const { appointments } = usePhcisLink();
  const apt = useMemo(
    () => (aptId ? appointments.find((a) => a.id === aptId) : appointments.find((a) => a.type === 'video' && a.status === 'upcoming')) || null,
    [appointments, aptId],
  );

  const doctorName = apt?.doctor || 'นพ. สมชาย ใจดี';
  const specialty = apt?.specialty || apt?.deptLabel || 'อายุรกรรมทั่วไป';
  const locationLabel = apt?.locationLabel || 'ศูนย์ 4, ดินแดง';

  const initialStep = ['check', 'wait', 'call', 'done'].includes(requestedStage)
    ? requestedStage
    : 'consent';
  const [step, setStep] = useState(initialStep); /* consent | cameraPermission | micPermission | check | wait | call | done */
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [waitSec, setWaitSec] = useState(225);
  const [elapsed, setElapsed] = useState(requestedStage === 'done' ? 930 : 0);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatBadge, setChatBadge] = useState(true);
  const [chat, setChat] = useState(MOCK_CHAT);
  const [input, setInput] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    onStepChange?.(step);
  }, [step, onStepChange]);

  useEffect(() => {
    if (step !== 'wait') return undefined;
    const tick = window.setInterval(() => setWaitSec((seconds) => seconds + 1), 1000);
    const join = window.setTimeout(() => setStep('call'), WAIT_JOIN_MS);
    return () => {
      clearInterval(tick);
      clearTimeout(join);
    };
  }, [step]);

  useEffect(() => {
    if (step !== 'call') return undefined;
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat, chatOpen]);

  const sendMsg = (e) => {
    if (e?.preventDefault) e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setChat((prev) => [...prev, {
      id: `m-${Date.now()}`, from: 'me', text,
      at: new Date().toTimeString().slice(0, 5),
    }]);
    setInput('');
  };

  const endCall = () => setReviewOpen(true);

  const completeTelemed = () => {
    if (apt?.id) {
      updateAppointment(apt.id, { status: 'past', aptStatus: 'completed', telemedDone: true });
    }
    setStep('done');
  };

  const submitReview = () => {
    setReviewOpen(false);
    completeTelemed();
  };

  const chatProps = {
    onClose: () => setChatOpen(false),
    chat,
    input,
    setInput,
    onSend: sendMsg,
    scrollRef,
  };

  const openChat = () => {
    setChatBadge(false);
    setChatOpen(true);
  };

  const closeTelemed = () => history.push(apt ? `/m/appointments/${apt.id}` : '/m/appointments');

  const confirmCancellation = () => {
    setCancelConfirmOpen(false);
    if (apt?.id) {
      updateAppointment(apt.id, { status: 'cancelled', aptStatus: 'cancelled' });
    }
    closeTelemed();
  };

  const allowMicrophone = async () => {
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch {
      /* Mic may be unavailable in this environment — the readiness meter is a mock,
         so honour the user's consent and keep it on (matches the camera behaviour). */
    }
    setMicOn(true);
    setStep('check');
  };

  const allowCamera = async () => {
    try {
      const stream = await navigator.mediaDevices?.getUserMedia?.({ video: true });
      stream?.getTracks().forEach((track) => track.stop());
    } catch {
      /* A real camera may be unavailable (no device / OS-denied) — the preview is a
         mock self-view image, so honour the user's consent and keep the camera on. */
    }
    setCamOn(true);
    setStep('micPermission');
  };

  if (step === 'consent') {
    return (
      <PdpaConsent
        onAccept={() => setStep('cameraPermission')}
        onCancel={closeTelemed}
      />
    );
  }

  if (step === 'cameraPermission') {
    return (
      <div style={{ position: 'relative', height: '100%', minHeight: 0 }}>
        <PdpaConsent onAccept={() => {}} onCancel={closeTelemed} />
        <CameraPermissionPopup
          positioning='absolute'
          description='แอปพลิเคชันจำเป็นต้องเข้าถึงกล้องของคุณ เพื่อใช้สื่อสารด้วยเสียงกับแพทย์ระหว่างการตรวจแบบออนไลน์ (Telemedicine)'
          onAllow={allowCamera}
          onDeny={() => {
            /* The readiness screen uses the approved mock self-view so the camera
               check always starts in the required "พร้อมใช้งาน" state. */
            setCamOn(true);
            setStep('micPermission');
          }}
        />
      </div>
    );
  }

  if (step === 'micPermission') {
    return (
      <div style={{ position: 'relative', height: '100%', minHeight: 0 }}>
        <PdpaConsent onAccept={() => {}} onCancel={closeTelemed} />
        <MicrophonePermissionPopup
          onAllow={allowMicrophone}
          onDeny={() => {
            setMicOn(false);
            setStep('check');
          }}
        />
      </div>
    );
  }

  if (step === 'check') {
    return (
      <ReadinessCheck
        micOn={micOn}
        camOn={camOn}
        onCancel={closeTelemed}
        onContinue={() => setStep('wait')}
        onRetest={() => {
          setMicOn(true);
          setCamOn(true);
        }}
      />
    );
  }

  if (step === 'wait') {
    return (
      <div style={{ position: 'relative', height: '100%', minHeight: 0 }}>
        <WaitingRoom
          doctorName={doctorName}
          specialty={specialty}
          waitSec={waitSec}
          micOn={micOn}
          camOn={camOn}
          onToggleMic={() => setMicOn((value) => !value)}
          onToggleCam={() => setCamOn((value) => !value)}
          onCancel={() => setCancelConfirmOpen(true)}
        />
        {cancelConfirmOpen && (
          <CancelAppointmentPopup
            onConfirm={confirmCancellation}
            onClose={() => setCancelConfirmOpen(false)}
          />
        )}
      </div>
    );
  }

  if (step === 'done') {
    return (
      <DoneScreen
        doctorName={doctorName}
        specialty={specialty}
        locationLabel={locationLabel}
        elapsed={elapsed}
        onPay={() => history.push('/m/pharmacy/preparing')}
      />
    );
  }

  const callShared = {
    doctorName,
    specialty,
    micOn,
    camOn,
    elapsed,
    chatBadge,
    onMic: () => setMicOn((v) => !v),
    onCam: () => setCamOn((v) => !v),
    onShare: () => window.alert('แชร์หน้าจอ — สาธิต'),
    onChat: openChat,
    onEnd: endCall,
    chatOpen,
    chatProps,
  };

  return (
    /* Full-height flex column so the call fills the shell — a chain of min-height:100%
       against auto heights collapses (the video area would drop to 0px). */
    <div className='flex flex-col' style={{ height: '100%', minHeight: 0, position: 'relative' }}>
      {camOn
        ? <VideoCall {...callShared} />
        : <AudioCall {...callShared} onBack={() => setCamOn(true)} />}
      <ReviewSheet
        open={reviewOpen}
        doctorName={doctorName}
        specialty={specialty}
        onClose={() => {
          setReviewOpen(false);
          completeTelemed();
        }}
        onSubmit={submitReview}
      />
    </div>
  );
};

if (typeof document !== 'undefined' && !document.getElementById('mih-telemed-css')) {
  const style = document.createElement('style');
  style.id = 'mih-telemed-css';
  style.textContent = `
@keyframes mih-telemed-bar {
  from { transform: scaleY(0.45); }
  to { transform: scaleY(1); }
}
@keyframes mih-telemed-live {
  0%   { transform: scale(1.05) translate3d(0, 0, 0); }
  50%  { transform: scale(1.09) translate3d(-1.1%, -0.9%, 0); }
  100% { transform: scale(1.05) translate3d(0, 0, 0); }
}
@keyframes mih-telemed-livedot {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.3; }
}
.mih-telemed-chat-input,
.mih-telemed-chat-input:focus,
.mih-telemed-chat-input:focus-visible {
  outline: none !important;
  box-shadow: none !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
.mih-telemed-chat-input::placeholder {
  color: var(--text-content-tertiary, #858C92);
  opacity: 1;
}`;
  document.head.appendChild(style);
}

const MobileTelemedPage = () => {
  const [currentStep, setCurrentStep] = useState(null);
  const successBackground = 'linear-gradient(155.3deg, rgb(19 178 146) 0%, rgb(1 180 160) 100%)';
  const isDone = currentStep === 'done';

  return (
    <MobileShell
      requireAuth
      showBottomNav={false}
      homeIndicatorOverlay
      homeIndicatorBackground='transparent'
      background={isDone ? successBackground : 'var(--background-screen-brand-100, #F4FBF8)'}
      statusBarTone={isDone ? 'transparentDark' : 'default'}
      statusBarStyle={{ height: 'var(--dim-size-1050, 50px)' }}
    >
      <MobileTelemedInner onStepChange={setCurrentStep} />
    </MobileShell>
  );
};

export default MobileTelemedPage;
