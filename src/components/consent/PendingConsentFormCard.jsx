import React from 'react';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueIconButton from '@/components/button/BrandSubdueIconButton';
import BrandButton from '@/components/button/BrandButton';
import OfficialFormCover from '@/components/consent/OfficialFormCover';

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
  /** ดาวน์โหลดใบเป็น PDF ลงเครื่อง — ไม่ส่งมาก็ไม่มีปุ่ม */
  onDownload,
  onFill,
  fillLabel = 'กรอกแบบฟอร์ม',
  /* ใบที่เคยขอความยินยอมไปแล้ว — ไม่มีปุ่มกรอก แต่ติดป้ายสถานะล่าสุดแทน
     ({ label, tone }) เพื่อให้เห็นในหน้าเดียวว่าใบไหนทำไปแล้ว/ผลเป็นอย่างไร */
  status = null,
  showFill = true,
  /* ใบที่ทำไปแล้ว — ปุ่มดูเอกสารที่ลงนามไว้ (แทนปุ่มกรอก) */
  onView,
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
    {/* หน้าปกเป็นตราสำนักอนามัยทุกใบ (มติผู้ใช้ 25 ส.ค. 69) — `cover` ยังรับไว้
        เพื่อไม่ให้ผู้เรียกเดิมพัง แต่ไม่ได้ใช้วาดแล้ว */}
    <div
      className='relative w-full shrink-0 overflow-hidden'
      style={{
        aspectRatio: '227 / 113',
        background: 'var(--surface-card-100)',
        borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)',
      }}
    >
      <OfficialFormCover compact />
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
      className='flex items-center w-full'
      style={{
        gap: 'var(--dim-space-200)',
        padding: 'var(--dim-space-400)',
        borderTop: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
      }}
    >
      {status && (
        <ColorfulBadge
          style={status.tone || 'green'}
          size='small'
          hierarchy='secondary'
          width='hug'
          showDot={false}
          showIcon={false}
        >
          {status.label}
        </ColorfulBadge>
      )}
      <div className='flex-1' />
      {onView && (
        <BrandSubdueIconButton
          type='button'
          size='sm'
          variant='outline'
          icon='visibility'
          aria-label='ดูแบบฟอร์มที่ลงนามแล้ว'
          onClick={onView}
        />
      )}
      {onDownload && (
        <BrandSubdueIconButton
          type='button'
          size='sm'
          variant='outline'
          icon='download'
          aria-label='ดาวน์โหลดแบบฟอร์มเป็น PDF'
          onClick={onDownload}
        />
      )}
      <BrandSubdueIconButton
        type='button'
        size='sm'
        variant='outline'
        icon='print'
        aria-label='พิมพ์แบบฟอร์ม'
        onClick={onPrint}
      />
      {showFill && (
        <BrandButton
          type='button'
          size='sm'
          variant='fill'
          leadingIcon='edit'
          onClick={onFill}
        >
          {fillLabel}
        </BrandButton>
      )}
    </div>
  </div>
);

export default PendingConsentFormCard;
