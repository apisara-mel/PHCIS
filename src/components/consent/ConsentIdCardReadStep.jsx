import React from 'react';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import BrandButton from '@/components/button/BrandButton';
import Icon from '@/components/icons/Icon';
import insertCardAnimation from '@/assets/illustrations/insert-card.json';

/* ด.1.1.1 — พิสูจน์ตัวตนเจ้าของข้อมูลก่อนกรอกใบยินยอมแทน (ระบบจัดการความยินยอม)

   ที่นี่เจ้าหน้าที่เป็นคนเปิดฟอร์มให้ ระบบจึงต้องยืนยันก่อนว่าผู้รับบริการอยู่ตรง
   หน้าจริง — เสียบบัตรประชาชนที่เครื่องอ่าน (mock: กด "อ่านบัตร" แล้วหน่วง)
   ฝั่งเวชระเบียนไม่มีขั้นนี้ เพราะผู้รับบริการเสียบบัตรมาแล้วที่ตู้ Kiosk

   ภาพเคลื่อนไหวใช้ `insert-card.json` ชุดเดียวกับขั้นตรวจสอบสิทธิของงานการเงิน */

const LABEL = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.4,
};
const VALUE = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-medium)',
  lineHeight: 1.5,
};

const Row = ({ label, value }) => (
  <div className='flex items-center justify-between w-full min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
    <span style={LABEL}>{label}</span>
    <span className='truncate' style={VALUE}>{value || '—'}</span>
  </div>
);

/** `status`: 'idle' | 'reading' — ตัวจับเวลาอ่านบัตรอยู่ที่ผู้เรียก (popup) */
const ConsentIdCardReadStep = ({ formTitle, status = 'idle', verified = false, onRead }) => (
  <div className='flex flex-col w-full flex-1' style={{ gap: 'var(--dim-space-500)' }}>
    <div
      className='flex flex-col items-center justify-center text-center w-full'
      style={{
        flex: 1,
        gap: 'var(--dim-space-300)',
        padding: 'var(--dim-space-600, 24px)',
        background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
        borderRadius: 'var(--dim-radius-300)',
      }}
    >
      <LottieIllustration
        animationData={insertCardAnimation}
        /* 104 — ขนาดเดียวกับ Lottie สแกนลายนิ้วมือ ให้สามแท็บดูสมดุลกัน */
        size={104}
        ariaLabel='ภาพเคลื่อนไหวการเสียบบัตรประชาชน'
      />
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
        <span style={{
          fontFamily: 'var(--type-family-heading-content, "Mitr", sans-serif)',
          fontSize: 'var(--type-size-base)',
          fontWeight: 'var(--type-weight-medium)',
          color: 'var(--text-brandPrimary-default)',
        }}>
          {status === 'reading'
            ? 'กำลังอ่านบัตรประชาชน…'
            : 'กรุณาเสียบบัตรประชาชนของผู้รับบริการ'}
        </span>
        <span style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          color: 'var(--text-content-tertiary)',
        }}>
          {status === 'reading'
            ? 'ห้ามดึงบัตรออกจนกว่าระบบจะอ่านข้อมูลเสร็จ'
            : `ยืนยันตัวตนก่อนกรอก ${formTitle || 'แบบฟอร์มความยินยอม'}`}
        </span>
      </div>

      {/* ปุ่มลงมืออยู่ในกล่องของวิธีนี้ — footer เหลือแต่ "ต่อไป" ที่พาไปกรอกฟอร์ม */}
      {verified ? (
        <span className='inline-flex items-center' style={{
          gap: 'var(--dim-space-150)',
          color: 'var(--text-brandPrimary-default, #007549)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          fontWeight: 'var(--type-weight-medium)',
        }}>
          <Icon name='check_circle' size={18} color='currentColor' />
          ยืนยันตัวตนด้วยบัตรประชาชนแล้ว
        </span>
      ) : (
        <BrandButton
          type='button'
          variant='fill'
          size='md'
          leadingIcon='credit_card'
          disabled={status === 'reading'}
          onClick={onRead}
        >
          {status === 'reading' ? 'กำลังอ่านบัตร…' : 'อ่านบัตร'}
        </BrandButton>
      )}
    </div>

  </div>
);

export default ConsentIdCardReadStep;
