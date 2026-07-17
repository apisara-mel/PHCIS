import React from 'react';
import { useHistory } from 'react-router-dom';
import { BrandButton, BrandSubdueButton, MobileShell } from '@/components/mobile';
import StatusBadge from '@/components/badge/StatusBadge';

/* Pharmacy: Payment success — Figma 185:133654.
   Teal-gradient screen · award illustration · itemised receipt (ใบเสร็จรับเงิน) with a
   torn bottom edge · save-PDF / view-meds / home actions. */

const SUCCESS_BG = 'linear-gradient(149.33deg, rgb(19 178 146) 0%, rgb(1 180 160) 100%)';

const MEDS = [
  { name: 'Amlodipine 5 mg (30 เม็ด)', price: '฿120' },
  { name: 'Metformin 500 mg (60 เม็ด)', price: '฿180' },
  { name: 'Atorvastatin 20 mg (30 เม็ด)', price: '฿250' },
];

const DashDivider = () => (
  <span
    aria-hidden
    style={{ width: '100%', height: 0, borderTop: 'var(--dim-stroke-100, 1px) dashed var(--border-neutral-secondary, #D0D5DA)' }}
  />
);

const InfoRow = ({ label, value }) => (
  <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-100, 4px)' }}>
    <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)' }}>
      {label}
    </span>
    <strong style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-default, #111314)', whiteSpace: 'nowrap' }}>
      {value}
    </strong>
  </div>
);

const CostRow = ({ label, value, danger = false }) => (
  <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-100, 4px)' }}>
    <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)' }}>
      {label}
    </span>
    <strong style={{
      fontSize: 'var(--type-size-sm, 14px)',
      color: danger ? 'var(--text-danger-secondary, #DC2626)' : 'var(--text-content-default, #111314)',
      whiteSpace: 'nowrap',
    }}
    >
      {value}
    </strong>
  </div>
);

const Receipt = () => (
  <div
    className='flex flex-col'
    style={{
      width: '100%',
      gap: 'var(--dim-space-300, 12px)',
      padding: 'var(--dim-space-450, 18px)',
      paddingBottom: 'calc(var(--dim-space-450, 18px) + var(--dim-space-300, 12px))',
      borderRadius: 'var(--dim-radius-500, 16px)',
      background: 'var(--surface-card-100, #FFFFFF)',
      boxShadow: 'var(--shadow-brand-drop-bottom-200)',
      /* torn / scalloped bottom edge like a printed receipt */
      WebkitMaskImage: 'radial-gradient(circle 8px at 50% 100%, transparent 0 8px, #000 8px) bottom left / 16px 16px repeat-x, linear-gradient(#000, #000) top / 100% calc(100% - 8px) no-repeat',
      maskImage: 'radial-gradient(circle 8px at 50% 100%, transparent 0 8px, #000 8px) bottom left / 16px 16px repeat-x, linear-gradient(#000, #000) top / 100% calc(100% - 8px) no-repeat',
    }}
  >
    <div className='flex items-center justify-between w-full'>
      <div className='flex flex-col'>
        <p style={{ margin: 0, fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-medium, 500)', lineHeight: 1.5, color: 'var(--text-content-default, #111314)' }}>
          ใบเสร็จรับเงิน
        </p>
        <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', fontWeight: 'var(--type-weight-medium, 500)', lineHeight: 1.5, color: 'var(--text-content-secondary, #636B72)' }}>
          สำนักอนามัย กรุงเทพมหานคร
        </p>
      </div>
      <StatusBadge style='success' size='small'>ชำระแล้ว</StatusBadge>
    </div>

    <DashDivider />

    <InfoRow label='เลขที่ใบเสร็จ' value='RC-25690701-017' />
    <InfoRow label='วันที่ / เวลา' value='1 ก.ค. 2569, 14:32 น.' />
    <InfoRow label='วิธีชำระเงิน' value='PromptPay QR' />
    <InfoRow label='ผู้ป่วย' value='สมชาย รักดี · HN 67-004321' />

    <DashDivider />

    <p style={{ margin: 0, fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-bold, 700)', color: 'var(--text-content-default, #111314)' }}>
      รายการยา
    </p>
    {MEDS.map((m) => (
      <div key={m.name} className='flex items-center w-full' style={{ gap: 'var(--dim-space-100, 4px)' }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--type-size-xs, 12px)', fontWeight: 'var(--type-weight-medium, 500)', color: 'var(--text-content-secondary, #636B72)' }}>
          {m.name}
        </span>
        <strong style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-default, #111314)', whiteSpace: 'nowrap' }}>
          {m.price}
        </strong>
      </div>
    ))}

    <DashDivider />

    <CostRow label='รวมค่ายา' value='฿550' />
    <CostRow label='หักสิทธิ์เบิกจ่าย / เคลม' value='−฿400' danger />
    <CostRow label='ค่าธรรมเนียมบริการ' value='฿20' />

    <DashDivider />

    <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-100, 4px)' }}>
      <strong style={{ flex: 1, minWidth: 0, fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-medium, 500)', color: 'var(--text-content-default, #111314)' }}>
        ยอดชำระสุทธิ
      </strong>
      <strong style={{ fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-bold, 700)', color: 'var(--text-payment-total, #24A899)', whiteSpace: 'nowrap' }}>
        ฿170.00
      </strong>
    </div>
  </div>
);

const PharmacySuccessInner = () => {
  const history = useHistory();

  return (
    <div
      className='flex-1 min-h-0 overflow-y-auto'
      style={{ padding: 'var(--dim-space-600, 24px) var(--dim-space-400, 16px)' }}
    >
      <div
        className='flex flex-col items-center'
        style={{
          width: '100%',
          gap: 'var(--dim-space-400, 16px)',
          padding: 'var(--dim-space-600, 24px) var(--dim-space-400, 16px)',
          background: 'var(--surface-card-100, #FFFFFF)',
          borderTopLeftRadius: 'calc(var(--dim-size-1500, 68px) + var(--dim-size-600, 32px))',
          borderTopRightRadius: 'calc(var(--dim-size-1500, 68px) + var(--dim-size-600, 32px))',
          borderBottomLeftRadius: 'var(--dim-radius-600, 24px)',
          borderBottomRightRadius: 'var(--dim-radius-600, 24px)',
        }}
      >
        <img
          src='/illustration/mobile/booking-success-award.png'
          alt=''
          aria-hidden
          width={80}
          height={80}
          style={{ width: 'var(--dim-size-1700, 80px)', height: 'var(--dim-size-1700, 80px)', objectFit: 'contain', flexShrink: 0 }}
        />

        <h1 style={{
          margin: 0,
          textAlign: 'center',
          fontFamily: 'var(--type-family-heading-graphic2)',
          fontSize: 'var(--type-size-2xl, 24px)',
          fontWeight: 'var(--type-weight-regular, 400)',
          lineHeight: 1.375,
          color: 'var(--text-brandPrimary-default, #007549)',
        }}
        >
          ชำระเงินสำเร็จ
        </h1>
        <p style={{
          margin: 0,
          textAlign: 'center',
          fontFamily: 'var(--type-family-heading-graphic2)',
          fontSize: 'var(--type-size-base, 16px)',
          lineHeight: 1.5,
          color: 'var(--text-content-secondary, #636B72)',
        }}
        >
          ระบบได้รับการชำระเงินของคุณเรียบร้อยแล้ว
        </p>

        <Receipt />

        <div className='flex flex-col items-center w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <BrandButton size='lg' leadingIcon='download' style={{ width: '100%' }}>
            บันทึกใบเสร็จ (PDF)
          </BrandButton>
          <BrandSubdueButton size='lg' variant='fill' onClick={() => history.push('/m/records')} style={{ width: '100%' }}>
            ดูรายการยา
          </BrandSubdueButton>
          <BrandButton size='lg' variant='outline' onClick={() => history.push('/m/home')} style={{ width: '100%' }}>
            กลับสู่หน้าหลัก
          </BrandButton>
        </div>
      </div>
    </div>
  );
};

const MobilePharmacySuccessPage = () => (
  <MobileShell
    requireAuth
    showBottomNav={false}
    homeIndicatorOverlay
    homeIndicatorBackground='transparent'
    background={SUCCESS_BG}
    statusBarTone='transparentDark'
    statusBarStyle={{ height: 'var(--dim-size-1050, 50px)' }}
  >
    <PharmacySuccessInner />
  </MobileShell>
);

export default MobilePharmacySuccessPage;
