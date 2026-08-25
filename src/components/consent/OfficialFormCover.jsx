import React from 'react';

/* หน้าปกราชการ — ตราสำนักอนามัย กรุงเทพมหานคร (มติผู้ใช้ 25 ส.ค. 69)

   ใบยินยอมทุกใบในระบบออกในนามสำนักอนามัย หน้าปกจึงต้องเป็นตราหน่วยงาน
   เหมือนกันหมด ไม่ใช่ภาพประกอบสต็อกคนละแบบต่อใบซึ่งไม่ได้สื่ออะไรเลย

   แยกเป็นคอมโพเนนต์กลางเพราะมีสองที่ที่ต้องวาดหน้าปกนี้ — ตัวเลือกหน้าปกใน
   wizard สร้างแบบฟอร์ม และการ์ดแบบฟอร์มที่โผล่ในระบบเวชระเบียน/ความยินยอม */

export const OFFICIAL_COVER_LOGO_SRC = '/images/office-health-logo.png';
export const OFFICIAL_COVER_ORG = 'สำนักอนามัย';
export const OFFICIAL_COVER_ORG_SUB = 'กรุงเทพมหานคร';

export default function OfficialFormCover({ compact = false, className = '', style }) {
  return (
    <span
      className={`flex flex-col items-center justify-center w-full h-full ${className}`}
      style={{
        gap: 'var(--dim-space-150)',
        background: 'var(--surface-card-100)',
        borderRadius: 'inherit',
        ...(style || {}),
      }}
    >
      <img
        src={OFFICIAL_COVER_LOGO_SRC}
        alt=''
        aria-hidden
        draggable={false}
        loading='lazy'
        decoding='async'
        style={{ height: compact ? '40%' : '46%', width: 'auto', objectFit: 'contain', display: 'block' }}
      />
      <span
        style={{
          color: 'var(--text-content-default)',
          fontFamily: 'var(--type-family-heading-graphic2)',
          fontSize: 'var(--type-size-xs)',
          lineHeight: 1.3,
        }}
      >
        {OFFICIAL_COVER_ORG}
      </span>
      <span
        style={{
          color: 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
          lineHeight: 1.3,
        }}
      >
        {OFFICIAL_COVER_ORG_SUB}
      </span>
    </span>
  );
}
