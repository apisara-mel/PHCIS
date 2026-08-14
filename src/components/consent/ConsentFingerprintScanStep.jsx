import React from 'react';
import BrandButton from '@/components/button/BrandButton';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import fingerprintAnimation from '@/assets/illustrations/fingerprint-scanning.json';

/* ยืนยันตัวตนด้วยลายนิ้วมือ — สำหรับผู้รับบริการที่ไม่มีบัตรประชาชน
   (ผู้เยาว์ที่ยังไม่ทำบัตร · บุคคลต่างด้าว · บุคคลไม่มีสถานะทางทะเบียน)

   ใช้แทนการเสียบบัตรในขั้น ด.1.1.1 ของระบบจัดการความยินยอม — mock เหมือนขั้น
   เสียบบัตร คือกดปุ่มแล้วหน่วง ของจริงเป็น event จากเครื่องสแกนลายนิ้วมือ

   ภาพเคลื่อนไหวใช้ `fingerprint-scanning.json` (Lottie ที่อัปโหลดเข้า repo
   14 ส.ค. 2569) — โครงเดียวกับขั้นเสียบบัตรที่ใช้ insert-card.json */

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

/** `status`: 'idle' | 'scanning' — ตัวจับเวลาอยู่ที่ผู้เรียก (popup) */
const ConsentFingerprintScanStep = ({ formTitle, status = 'idle', verified = false, onScan }) => {
  const scanning = status === 'scanning';

  return (
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
          animationData={fingerprintAnimation}
          size={104}
          ariaLabel='ภาพเคลื่อนไหวการสแกนลายนิ้วมือ'
        />
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
          <span style={{
            fontFamily: 'var(--type-family-heading-content, "Mitr", sans-serif)',
            fontSize: 'var(--type-size-base)',
            fontWeight: 'var(--type-weight-medium)',
            color: 'var(--text-brandPrimary-default)',
          }}>
            {scanning
              ? 'กำลังอ่านลายนิ้วมือ…'
              : 'ให้ผู้รับบริการวางนิ้วบนเครื่องสแกนลายนิ้วมือ'}
          </span>
          <span style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
            color: 'var(--text-content-tertiary)',
          }}>
            {scanning
              ? 'ห้ามยกนิ้วจนกว่าระบบจะอ่านเสร็จ'
              : `ยืนยันตัวตนก่อนกรอก ${formTitle || 'แบบฟอร์มความยินยอม'}`}
          </span>
        </div>

        {/* ปุ่มลงมืออยู่ในกล่องของวิธีนี้ — footer เหลือแต่ "ต่อไป" */}
        {verified ? (
          <span className='inline-flex items-center' style={{
            gap: 'var(--dim-space-150)',
            color: 'var(--text-brandPrimary-default, #007549)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-medium)',
          }}>
            <Icon name='check_circle' size={18} color='currentColor' />
            ยืนยันตัวตนด้วยลายนิ้วมือแล้ว
          </span>
        ) : (
          <BrandButton
            type='button'
            variant='fill'
            size='md'
            leadingIcon='fingerprint'
            disabled={scanning}
            onClick={onScan}
          >
            {scanning ? 'กำลังสแกน…' : 'สแกนลายนิ้วมือ'}
          </BrandButton>
        )}
      </div>

    </div>
  );
};

export default ConsentFingerprintScanStep;
