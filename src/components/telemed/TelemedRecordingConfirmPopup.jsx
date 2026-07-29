import React from 'react';
import { createPortal } from 'react-dom';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import useModalMotion, { MODAL_MOTION_MS } from '@/components/popup/useModalMotion';

/* Figma PHCIS | Telemedicine · Recording Confirm Modal (123:56678)
   Doctor confirms patient PDPA consent is in place, then starts recording.
   Annotation (215:23380): ผู้รับบริการยินยอมการบันทึกภาพและเสียงก่อนเข้า meeting. */

const Sym = ({ name, size = 48, color, fill = 1 }) => (
  <span
    className='material-symbols-outlined'
    aria-hidden
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
      fontSize: size,
      lineHeight: 1,
      color,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}
  >
    {name}
  </span>
);

/**
 * @param {boolean} open
 * @param {() => void} onClose — ยกเลิก
 * @param {() => void} onConfirm — เริ่มบันทึก
 */
const TelemedRecordingConfirmPopup = ({ open, onClose, onConfirm }) => {
  const { mounted, motionState } = useModalMotion(open, MODAL_MOTION_MS);
  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role='presentation'
      className='mih-popup-overlay'
      data-state={motionState}
      onClick={onClose}
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
        aria-labelledby='mih-telemed-rec-title'
        aria-describedby='mih-telemed-rec-desc'
        data-state={motionState}
        className='mih-popup-dialog'
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(448px, calc(100vw - 48px))',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          borderRadius: 'var(--dim-radius-500, 16px)',
          border: 'var(--dim-stroke-100, 1px) solid var(--border-popover-grey, #E2E4E6)',
          background: 'var(--surface-modal-default, #FFFFFF)',
          boxShadow: 'var(--shadow-drop-bottom-400)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 'var(--dim-space-600, 24px)',
            borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
          }}
        >
          <div
            style={{
              width: 'var(--dim-size-1800, 96px)',
              height: 'var(--dim-size-1800, 96px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              flexShrink: 0,
            }}
          >
            <Sym name='videocam' size={56} fill={0} color='var(--icon-brandPrimary-default, #007549)' />
            <span
              aria-hidden
              style={{
                position: 'absolute',
                right: 'var(--dim-space-400, 16px)',
                top: 'var(--dim-space-500, 20px)',
                width: 'var(--dim-size-400, 20px)',
                height: 'var(--dim-size-400, 20px)',
                borderRadius: 'var(--dim-radius-full, 9999px)',
                background: 'var(--surface-dangerButton-default, #B91C1C)',
                border: 'var(--dim-stroke-200, 2px) solid var(--surface-modal-default, #FFFFFF)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--dim-space-200, 8px)',
              paddingBottom: 'var(--dim-space-600, 24px)',
              width: '100%',
              textAlign: 'center',
            }}
          >
            <p
              id='mih-telemed-rec-title'
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
              ระบบจะเริ่มบันทึกการสนทนาโดยอัตโนมัติ
            </p>
            <p
              id='mih-telemed-rec-desc'
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
              การปรึกษานี้ได้รับความยินยอมให้บันทึกภาพและเสียง
              <br aria-hidden />
              จากผู้รับบริการแล้ว ระบบจะบันทึกโดยอัตโนมัติตลอดการสนทนา
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 'var(--dim-space-300, 12px)',
            padding: 'var(--dim-space-600, 24px)',
          }}
        >
          <NeutralSubdueButton variant='outline' size='md' onClick={onClose}>
            ยกเลิก
          </NeutralSubdueButton>
          <BrandButton size='md' onClick={onConfirm}>
            เริ่มบันทึก
          </BrandButton>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default TelemedRecordingConfirmPopup;
