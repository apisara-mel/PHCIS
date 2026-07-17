import React, { useEffect, useState } from 'react';
import { BrandButton } from '@/components/mobile';
import LottieIllustration from '@/components/illustrations/LottieIllustration';

/* Popup: Location Permission — Archive Figma 4WXeI8fgBLQGgQ9VheM2yD · 253:35159
   Shown when the patient picks "เข้ารับบริการที่ศูนย์" before department
   selection, so nearby centres can be sorted by distance.
   Allow → proceed (grant); Deny → dismiss (proceed without location sort).

   Same DS as Camera Permission (178:122748): white card r16 · p24 · gap24 ·
   popover-grey border · Drop Shadow Bottom/400 · 96px illustration ·
   xl green Mitr title · sm tertiary Sarabun body · Button Group w261
   (BrandButton fill + outline). */

const ILLUS = '/illustration/mobile/Location.json';
const ILLUS_SIZE = 96;

const LocationPermissionPopup = ({ onAllow, onDeny }) => {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch(ILLUS)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => { if (alive) setAnimationData(data); })
      .catch(() => { /* Keep the reserved illustration space. */ });
    return () => { alive = false; };
  }, []);

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-labelledby='mih-location-perm-title'
      className='flex items-center justify-center'
      style={{
        position: 'fixed',
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
        <LottieIllustration
          animationData={animationData}
          size={ILLUS_SIZE}
          loop
          style={{ flexShrink: 0 }}
        />

        <div
          className='flex flex-col items-center w-full'
          style={{ gap: 'var(--dim-space-300, 12px)', textAlign: 'center' }}
        >
          <p
            id='mih-location-perm-title'
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
            อนุญาตให้เข้าตำแหน่งปัจจุบัน
          </p>
          <p
            style={{
              margin: 0,
              width: '100%',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.5,
              color: 'var(--text-content-tertiary, #858C92)',
            }}
          >
            แอปพลิเคชันจำเป็นต้องเข้าถึงตำแหน่งปัจจุบันของคุณ เพื่อใช้ในค้นหาสถานอนามัยใกล้บ้านท่าน
          </p>
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
};

export default LocationPermissionPopup;
