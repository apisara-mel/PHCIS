import React from 'react';
import { createPortal } from 'react-dom';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import useModalMotion, { MODAL_MOTION_MS } from '@/components/popup/useModalMotion';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import healthMedicineAnimation from '@/assets/illustrations/Health and medicine.json';
/* Figma PHCIS | Telemedicine · NEW/Loading · Connecting (154:30106)
   Shown after "เข้าสู่ห้องรอตรวจ" while the room handshake runs.
   Cancel → ConfirmAbortJoin (94:48768).
   Icon = "Health and medicine" Lottie (MIH-Design-System-Popup 343:16302),
   rendered via LottieIllustration/lottie-web like the other MIH empty-state
   animations. */

/**
 * @param {boolean} open
 * @param {() => void} onCancel — ยกเลิกการเข้าห้อง (shows ConfirmAbortJoin upstream)
 * @param {{ name?: string, avatar?: string }} [patient] — mocked as a 28-year-old
 *   Thai male patient (avatars/telemed/patient.png) so the "who am I connecting
 *   to" context reads clearly on the loading screen.
 */
const TelemedConnectingPopup = ({ open, onCancel, patient }) => {
  const { mounted, motionState } = useModalMotion(open, MODAL_MOTION_MS);
  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role='presentation'
      className='mih-popup-overlay'
      data-state={motionState}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483640,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--dim-space-600, 24px)',
        background: 'var(--surface-overlay-default, rgb(100 116 139 / 0.40))',
      }}
    >
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby='mih-telemed-connecting-title'
        aria-describedby='mih-telemed-connecting-desc'
        data-state={motionState}
        className='mih-popup-dialog'
        style={{
          width: 'min(448px, calc(100vw - 48px))',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
          padding: 'var(--dim-space-600, 24px)',
          borderRadius: 'var(--dim-radius-500, 16px)',
          border: 'var(--dim-stroke-100, 1px) solid var(--border-popover-grey, #E2E4E6)',
          background: 'var(--surface-modal-default, #FFFFFF)',
          boxShadow: 'var(--shadow-drop-bottom-400)',
        }}
      >
        <LottieIllustration
          animationData={healthMedicineAnimation}
          size={96}
          style={{ flexShrink: 0 }}
        />

        {patient?.avatar && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--dim-space-200, 8px)',
              paddingBottom: 'var(--dim-space-400, 16px)',
            }}
          >
            <img
              src={patient.avatar}
              alt=''
              style={{
                width: 'var(--dim-size-1400, 64px)',
                height: 'var(--dim-size-1400, 64px)',
                borderRadius: 'var(--dim-radius-full, 9999px)',
                objectFit: 'cover',
                border: 'var(--dim-stroke-200, 2px) solid var(--border-image-default, #FFFFFF)',
                boxShadow: 'var(--shadow-card)',
              }}
            />
            {patient.name && (
              <span
                style={{
                  fontFamily: 'var(--type-family-body, "Sarabun", sans-serif)',
                  fontSize: 'var(--type-size-sm, 14px)',
                  fontWeight: 'var(--type-weight-medium, 500)',
                  color: 'var(--text-content-default, #363B3F)',
                }}
              >
                {patient.name}
              </span>
            )}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--dim-space-200, 8px)',
            paddingBottom: 'var(--dim-space-600, 24px)',
            width: '100%',
            textAlign: 'center',
            overflow: 'hidden',
          }}
        >
          <p
            id='mih-telemed-connecting-title'
            style={{
              margin: 0,
              width: '100%',
              fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)',
              fontSize: 'var(--type-size-lg, 18px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              color: 'var(--text-alertdialog-text, #4D5358)',
              lineHeight: 1.5,
            }}
          >
            กำลังเข้าสู่ห้องปรึกษา...
          </p>
          <p
            id='mih-telemed-connecting-desc'
            style={{
              margin: 0,
              width: '100%',
              fontFamily: 'var(--type-family-body, "Sarabun", sans-serif)',
              fontSize: 'var(--type-size-sm, 14px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              color: 'var(--text-alertdialog-subtext, #636B72)',
              lineHeight: 1.5,
            }}
          >
            โปรดรอสักครู่ ระบบกำลังเชื่อมต่อกับห้องปรึกษาออนไลน์
          </p>
        </div>

        <NeutralSubdueButton
          variant='outline'
          size='lg'
          onClick={onCancel}
          style={{ minWidth: 'var(--dim-size-1600, 80px)', maxWidth: 'var(--dim-size-2600, 384px)' }}
        >
          ยกเลิก
        </NeutralSubdueButton>
      </div>
    </div>,
    document.body,
  );
};

export default TelemedConnectingPopup;
