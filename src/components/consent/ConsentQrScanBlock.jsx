import React from 'react';

/* บล็อก "ให้ผู้รับบริการยินยอมเองผ่านมือถือ" — ภาพประกอบ + คำอธิบาย + QR
   Figma Registration 295:41105 (แผงขวาของหน้ากรอกใบยินยอม)

   ย้ายออกมาจาก RegistrationConsentFillPage เพราะ popup ดูแบบฟอร์มความยินยอม
   (/consent/forms → StepReview) ต้องแสดงชุดเดียวกันเหนือเครื่องมือถือตัวอย่าง
   — คนละหน้าแต่เป็นข้อเสนอเดียวกันกับผู้รับบริการ จึงต้องหน้าตาเหมือนกัน

   ส่ง QR มาได้สองทาง: `qrSrc` (URL รูป) หรือ `qrNode` (เช่น <FakeQR />) */
const ConsentQrScanBlock = ({
  qrSrc,
  qrNode,
  qrSize = 160,
  illustrationSize = 112,
  illustrationSrc = '/illustration/registration/consent-qr-scan.png',
  alt = 'QR Code สำหรับยินยอมผ่านมือถือ',
}) => (
  <div className='flex flex-col items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
    <img
      src={illustrationSrc}
      alt=''
      width={illustrationSize}
      height={illustrationSize}
      style={{ width: illustrationSize, height: illustrationSize, objectFit: 'contain' }}
    />
    <p style={{
      margin: 0,
      width: '100%',
      textAlign: 'center',
      color: 'var(--text-content-default)',
      fontFamily: 'var(--type-family-heading-graphic2)',
      fontSize: 'var(--type-size-base, 16px)',
      fontWeight: 'var(--type-weight-regular)',
      lineHeight: 1.5,
    }}>
      หรือให้ผู้รับบริการยินยอมด้วยตนเองผ่านโทรศัพท์
      <br aria-hidden />
      Application
      <br aria-hidden />
      โดยสแกน QR Code ด้านล่างนี้
    </p>
    <div
      style={{
        background: 'var(--surface-card-100)',
        border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
        borderRadius: 'var(--dim-radius-200)',
        padding: 'var(--dim-space-300)',
      }}
    >
      {qrNode || (
        <img
          src={qrSrc}
          alt={alt}
          width={qrSize}
          height={qrSize}
          style={{ display: 'block', width: qrSize, height: qrSize }}
        />
      )}
    </div>
  </div>
);

export default ConsentQrScanBlock;
