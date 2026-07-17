import React from 'react';
import { BrandButton } from '@/components/mobile';

/* Popup: Camera Permission — Archive Figma 4WXeI8fgBLQGgQ9VheM2yD · 178:122748
   Used from registration face-scan step. Allow → proceed; Deny → dismiss. */

const ILLUS = '/illustration/mobile/camera-permission-hero.png';
const ILLUS_SIZE = 96;

const CameraPermissionPopup = ({
  onAllow,
  onDeny,
  description,
  positioning = 'fixed',
}) => (
  <div
    role='dialog'
    aria-modal='true'
    aria-labelledby='mih-camera-perm-title'
    className='flex items-center justify-center'
    style={{
      position: positioning,
      inset: 0,
      zIndex: 70,
      background: 'var(--surface-overlay-default, rgba(100,116,139,0.4))',
      padding: 'var(--dim-space-600, 24px)',
    }}
    onClick={onDeny}
  >
    <div
      className='flex flex-col items-center'
      onClick={(e) => e.stopPropagation()}
      style={{
        width: '100%',
        maxWidth: 371,
        background: 'var(--surface-card-100, #FFFFFF)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-popover-grey, #E2E4E6)',
        borderRadius: 'var(--dim-radius-500, 16px)',
        padding: 'var(--dim-space-600, 24px)',
        gap: 'var(--dim-space-600, 24px)',
        boxShadow:
          'var(--shadow-drop-bottom-400, 0 4px 4px rgba(100,116,139,0.10), 0 16px 32px rgba(100,116,139,0.15))',
      }}
    >
      <img
        src={ILLUS}
        alt=''
        aria-hidden
        width={ILLUS_SIZE}
        height={ILLUS_SIZE}
        style={{
          width: ILLUS_SIZE,
          height: ILLUS_SIZE,
          objectFit: 'contain',
          flexShrink: 0,
        }}
      />

      <div
        className='flex flex-col items-center w-full'
        style={{ gap: 'var(--dim-space-300, 12px)', textAlign: 'center' }}
      >
        <p
          id='mih-camera-perm-title'
          style={{
            margin: 0,
            width: '100%',
            fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
            fontSize: 'var(--type-size-xl, 20px)',
            fontWeight: 'var(--type-weight-regular, 400)',
            lineHeight: 1.375,
            color: 'var(--text-brandPrimary-default, #007549)',
          }}
        >
          อนุญาตให้เข้าถึงกล้อง
        </p>
        <div
          style={{
            width: '100%',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            fontWeight: 'var(--type-weight-regular, 400)',
            lineHeight: 1.5,
            color: 'var(--text-content-tertiary, #858C92)',
          }}
        >
          <p style={{ margin: 0 }}>
            {description || (
              <>
                แอปพลิเคชันจำเป็นต้องเข้าถึงกล้องถ่ายรูปของคุณ เพื่อใช้ในการสแกนใบหน้า (Face Capture)
                {' '}สำหรับยืนยันตัวตนในขั้นตอนการลงทะเบียน
              </>
            )}
          </p>
          {!description && <p style={{ margin: 0 }}>ให้เสร็จสมบูรณ์</p>}
        </div>
      </div>

      <div
        className='flex flex-col w-full'
        style={{ gap: 'var(--dim-space-300, 12px)', maxWidth: 261 }}
      >
        <BrandButton
          type='button'
          size='lg'
          variant='fill'
          showLeadingIcon={false}
          showTailingIcon={false}
          onClick={onAllow}
        >
          อนุญาต
        </BrandButton>
        <BrandButton
          type='button'
          size='lg'
          variant='outline'
          showLeadingIcon={false}
          showTailingIcon={false}
          onClick={onDeny}
        >
          ไม่อนุญาต
        </BrandButton>
      </div>
    </div>
  </div>
);

export default CameraPermissionPopup;
