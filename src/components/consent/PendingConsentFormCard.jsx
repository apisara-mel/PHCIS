import React from 'react';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueIconButton from '@/components/button/BrandSubdueIconButton';
import BrandButton from '@/components/button/BrandButton';

/* การ์ด "แบบฟอร์มที่ยังไม่ขอความยินยอม" — Figma Registration 292:104252.
   ย้ายออกมาจาก RegistrationSteps.jsx (StepConsent) เพราะระบบจัดการความยินยอม
   ใช้การ์ดใบเดียวกันใน popup กรอกแบบฟอร์มความยินยอม (แท็บผู้รับบริการทั้งหมด)
   — คนละหน้าแต่ต้องหน้าตาเหมือนกันเป๊ะ ไม่งั้นการ์ดสองใบจะ drift แยกกัน */
const PendingConsentFormCard = ({
  categoryLabel,
  categoryStyle,
  version,
  title,
  code,
  cover,
  onPrint,
  onFill,
  fillLabel = 'กรอกแบบฟอร์ม',
}) => (
  <div
    className='flex w-full min-w-0 flex-col h-full'
    style={{
      borderRadius: 'var(--dim-radius-400)',
      background: 'var(--surface-card-100)',
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      overflow: 'hidden',
    }}
  >
    <div
      className='relative w-full shrink-0 overflow-hidden'
      style={{
        aspectRatio: '227 / 113',
        background: 'var(--surface-info-tertiary, #DBEAFE)',
      }}
    >
      <img
        src={cover}
        alt=''
        className='absolute inset-0 h-full w-full object-cover object-center'
        loading='lazy'
        decoding='async'
      />
    </div>
    <div
      className='flex flex-col w-full flex-1'
      style={{
        gap: 'var(--dim-space-150, 6px)',
        padding: 'var(--dim-space-400)',
      }}
    >
      <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
        <ColorfulBadge
          style={categoryStyle}
          size='small'
          hierarchy='secondary'
          showDot={false}
          showIcon={false}
        >
          {categoryLabel}
        </ColorfulBadge>
        <ColorfulBadge
          style='magenta'
          size='small'
          hierarchy='secondary'
          showDot={false}
          showIcon={false}
        >
          {version}
        </ColorfulBadge>
      </div>
      <p style={{
        margin: 0,
        color: 'var(--text-content-default)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
        lineHeight: 1.5,
      }}>
        {title}
      </p>
      <p style={{
        margin: 0,
        color: 'var(--text-content-tertiary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-regular)',
        lineHeight: 1.5,
      }}>
        {code}
      </p>
    </div>
    <div
      className='flex items-center justify-end w-full'
      style={{
        gap: 'var(--dim-space-200)',
        padding: 'var(--dim-space-400)',
        borderTop: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
      }}
    >
      <BrandSubdueIconButton
        type='button'
        size='sm'
        variant='outline'
        icon='print'
        aria-label='พิมพ์แบบฟอร์ม'
        onClick={onPrint}
      />
      <BrandButton
        type='button'
        size='sm'
        variant='fill'
        leadingIcon='edit'
        onClick={onFill}
      >
        {fillLabel}
      </BrandButton>
    </div>
  </div>
);

export default PendingConsentFormCard;
