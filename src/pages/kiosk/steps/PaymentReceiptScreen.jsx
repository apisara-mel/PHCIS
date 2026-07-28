import React, { useEffect, useState } from 'react';
import { MOCK_BILL, PAYMENT_CHANNELS } from '@/data/kioskMock';
import { Sym, cardSurface, primaryBtn, ghostBtn } from '@/pages/kiosk/kioskUi';

/* Stitch: payment-receipt — TOR 1.16.3.1–1.16.3.3 (EDC/QR + e-Receipt mock)
   Ref: docs/kiosk/stitch/images/payment-receipt.png */

const fmtBaht = (n) => `${Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`;

const PaymentReceiptScreen = ({
  channelKey,
  bill = MOCK_BILL,
  onDone,
  onBack,
}) => {
  const [phase, setPhase] = useState('paying'); // paying → paid
  const channel = PAYMENT_CHANNELS.find((c) => c.key === channelKey) || PAYMENT_CHANNELS[0];
  const total = typeof bill.total === 'number' ? bill.total : bill.lines.reduce((s, l) => s + l.amount, 0);

  useEffect(() => {
    if (channelKey === 'counter') {
      setPhase('paid');
      return undefined;
    }
    const t = setTimeout(() => setPhase('paid'), 2800);
    return () => clearTimeout(t);
  }, [channelKey]);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`promptpay://pay?amount=${total}&ref=${bill.id}`)}`;

  return (
    <div
      style={{
        flex: '1 1 0%',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '1fr 1.4fr',
        gap: 'var(--dim-space-600, 24px)',
        fontFamily: 'var(--type-family-body)',
        minHeight: 0,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
        <div style={{ ...cardSurface, padding: 'var(--dim-space-800, 32px)', textAlign: 'center' }}>
          <Sym name='qr_code_2' size={40} color='var(--icon-brandPrimary-default, #007549)' />
          <div style={{ marginTop: 12, fontSize: 'var(--type-size-xl, 20px)', fontWeight: 'var(--type-weight-bold, 700)' }}>
            {channelKey === 'counter' ? 'ชำระที่เคาน์เตอร์' : 'สแกนเพื่อชำระเงิน'}
          </div>
          <p style={{ margin: '8px 0 0', color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-sm, 14px)' }}>
            {channel.desc}
          </p>
          {channelKey !== 'counter' && (
            <div style={{ marginTop: 'var(--dim-space-600, 24px)' }}>
              <img
                src={qrUrl}
                alt='QR PromptPay สำหรับชำระเงิน'
                width={220}
                height={220}
                style={{ borderRadius: 'var(--dim-radius-400, 12px)', border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default)' }}
              />
              <div style={{ marginTop: 12, fontSize: 'var(--type-size-base, 16px)', color: phase === 'paid' ? 'var(--text-alert-success, #196C65)' : 'var(--text-content-secondary)' }}>
                {phase === 'paying' ? 'รอการชำระผ่าน EDC / Mobile Banking…' : 'ชำระเงินสำเร็จ (จำลอง)'}
              </div>
            </div>
          )}
          {channelKey === 'counter' && (
            <div style={{ marginTop: 24, padding: 16, background: 'var(--surface-brandPrimary-quaternary)', borderRadius: 'var(--dim-radius-400, 12px)' }}>
              กรุณานำรหัสใบสั่งจ่ายไปชำระที่เคาน์เตอร์การเงิน
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 16 }}>
            {['PromptPay', 'Visa/Mastercard', 'EDC'].map((tag) => (
              <span
                key={tag}
                style={{
                  padding: '4px 12px',
                  borderRadius: 'var(--dim-radius-full, 9999px)',
                  background: 'var(--surface-info-tertiary, #DBEAFE)',
                  color: 'var(--text-info-default, #1D4ED8)',
                  fontSize: 'var(--type-size-xs, 12px)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Sym name='check_circle' size={14} color='var(--icon-brandPrimary-default)' />
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div style={{ ...cardSurface, padding: 'var(--dim-space-600, 24px)', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <Sym name='smartphone' size={28} color='var(--icon-brandPrimary-default)' />
          <div>
            <div style={{ fontWeight: 'var(--type-weight-bold, 700)' }}>พบปัญหาในการใช้งาน?</div>
            <div style={{ marginTop: 4, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary)' }}>
              กดปุ่มช่วยเหลือด้านล่างเพื่อเรียกเจ้าหน้าที่
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...cardSurface, padding: 'var(--dim-space-800, 32px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 'var(--type-size-xl, 20px)', fontWeight: 'var(--type-weight-bold, 700)' }}>สรุปรายละเอียดบริการ</div>
            <div style={{ marginTop: 4, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary)' }}>
              รหัสใบสั่งจ่าย: #{bill.id}
            </div>
          </div>
          {phase === 'paid' && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 'var(--dim-radius-full, 9999px)',
                background: 'var(--surface-positive-tertiary, #D1F6EE)',
                color: 'var(--text-alert-success, #196C65)',
                fontSize: 'var(--type-size-sm, 14px)',
                fontWeight: 'var(--type-weight-medium, 500)',
              }}
            >
              <Sym name='check_circle' size={18} />
              ชำระแล้ว · e-Receipt
            </span>
          )}
        </div>

        {bill.lines.map((line) => (
          <div key={line.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '12px 0', borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-card-default)' }}>
            <div>
              <div style={{ fontWeight: 'var(--type-weight-bold, 700)' }}>{line.label}</div>
              <div style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary)' }}>{line.sub}</div>
            </div>
            <div style={{ fontWeight: 'var(--type-weight-medium, 500)', whiteSpace: 'nowrap' }}>{fmtBaht(line.amount)}</div>
          </div>
        ))}

        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 'var(--type-size-lg, 18px)' }}>ยอดรวมสุทธิ</span>
            <span style={{ fontSize: 'var(--type-size-3xl, 30px)', fontWeight: 'var(--type-weight-bold, 700)', color: 'var(--text-brandPrimary-default, #007549)' }}>
              {fmtBaht(total)}
            </span>
          </div>
          <div style={{ marginTop: 4, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>
            รวมภาษีมูลค่าเพิ่ม 7% (จำลอง)
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            {onBack && phase === 'paying' && (
              <button type='button' onClick={onBack} style={ghostBtn}>ย้อนกลับ</button>
            )}
            <button
              type='button'
              onClick={onDone}
              disabled={phase !== 'paid' && channelKey !== 'counter'}
              style={{
                ...primaryBtn,
                flex: 1,
                opacity: phase === 'paid' || channelKey === 'counter' ? 1 : 0.5,
              }}
            >
              {channelKey === 'counter' ? 'รับบัตรคิว / เสร็จสิ้น' : 'ดาวน์โหลด e-Receipt · เสร็จสิ้น'}
              <Sym name='check' size={22} color='#FFFFFF' />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentReceiptScreen;
