import React from 'react';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import successAnimation from '@/assets/illustrations/consent-success.json';

/* สถานะ "ยืนยันตัวตนสำเร็จ" — ใช้แทนกล่องของทุกวิธี (เสียบบัตร / ตรวจเอกสาร /
   สแกนลายนิ้วมือ) เมื่อยืนยันผ่านแล้ว เพื่อให้เจ้าหน้าที่รู้ทันทีว่าไปกด "ต่อไป" ได้

   ใช้ Lottie ชุด consent-success (ชุดเดียวกับหน้าสำเร็จของโมดูลความยินยอม)
   แทนภาพเสียบบัตร/ลายนิ้วมือของขั้นก่อนหน้า */

const ConsentIdentitySuccessStep = ({ method, verifiedAt }) => (
  <div
    className='flex flex-col items-center justify-center text-center w-full flex-1'
    style={{
      gap: 'var(--dim-space-300)',
      padding: 'var(--dim-space-600, 24px)',
      background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
      borderRadius: 'var(--dim-radius-300)',
    }}
  >
    <LottieIllustration
      animationData={successAnimation}
      size={168}
      loop={false}
      ariaLabel='ภาพเคลื่อนไหวยืนยันตัวตนสำเร็จ'
    />
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
      <span style={{
        fontFamily: 'var(--type-family-heading-content, "Mitr", sans-serif)',
        fontSize: 'var(--type-size-base)',
        fontWeight: 'var(--type-weight-medium)',
        color: 'var(--text-brandPrimary-default)',
      }}>
        ยืนยันตัวตนสำเร็จ
      </span>
      <span style={{
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        color: 'var(--text-content-tertiary)',
      }}>
        {method || 'ยืนยันตัวตนผู้รับบริการแล้ว'}
      </span>
      {verifiedAt && (
        <span style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
          color: 'var(--text-content-tertiary)',
        }}>
          {verifiedAt}
        </span>
      )}
    </div>
  </div>
);

export default ConsentIdentitySuccessStep;
