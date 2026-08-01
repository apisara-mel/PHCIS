import React, { useState } from 'react';
import { MOCK_BILL, PAYMENT_CHANNELS } from '@/data/kioskMock';
import { Sym, cardSurface, primaryBtn } from '@/pages/kiosk/kioskUi';

/* Stitch: payment-channel — TOR 1.16.3.1
   Ref: docs/kiosk/stitch/images/payment-channel.png */

const fmtBaht = (n) => `${Number(n).toLocaleString('th-TH')} บาท`;

const PaymentChannelScreen = ({ onConfirm, bill = MOCK_BILL }) => {
  const [selected, setSelected] = useState(null);
  const total = typeof bill.total === 'number' ? bill.total : bill.lines.reduce((s, l) => s + l.amount, 0);

  return (
    <div
      style={{
        flex: '1 1 0%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--dim-space-600, 24px)',
        fontFamily: 'var(--type-family-body)',
        minHeight: 0,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 'var(--type-size-3xl, 30px)', fontWeight: 'var(--type-weight-bold, 700)', color: 'var(--text-content-default)' }}>
          เลือกช่องทางการชำระเงิน
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: 'var(--type-size-lg, 18px)', color: 'var(--text-content-secondary)' }}>
          โปรดเลือกช่องทางที่คุณสะดวกเพื่อดำเนินการต่อ
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 'var(--dim-space-600, 24px)', flex: 1, minHeight: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
          {PAYMENT_CHANNELS.map((ch) => {
            const active = selected === ch.key;
            return (
              <button
                key={ch.key}
                type='button'
                onClick={() => setSelected(ch.key)}
                style={{
                  ...cardSurface,
                  padding: 'var(--dim-space-600, 24px)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--dim-space-600, 24px)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: active
                    ? 'var(--dim-stroke-400, 4px) solid var(--border-brandPrimary-default, #007549)'
                    : cardSurface.border,
                  background: active
                    ? 'var(--surface-brandPrimary-quaternary, #F4FBF8)'
                    : cardSurface.background,
                }}
              >
                <span
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 'var(--dim-radius-full, 9999px)',
                    background: 'var(--surface-brandPrimary-secondary, #C5EDDA)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Sym name={ch.icon} size={32} color='var(--icon-brandPrimary-default, #007549)' />
                </span>
                <div>
                  <div style={{ fontSize: 'var(--type-size-xl, 20px)', fontWeight: 'var(--type-weight-bold, 700)' }}>{ch.label}</div>
                  <div style={{ marginTop: 4, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary)' }}>{ch.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ ...cardSurface, padding: 'var(--dim-space-600, 24px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
          <div style={{ fontSize: 'var(--type-size-lg, 18px)', fontWeight: 'var(--type-weight-bold, 700)' }}>สรุปยอดชำระ</div>
          {bill.lines.map((line) => (
            <div key={line.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--type-size-base, 16px)', color: 'var(--text-content-secondary)' }}>
              <span>{line.label}</span>
              <span>{fmtBaht(line.amount)}</span>
            </div>
          ))}
          <div style={{ borderTop: 'var(--dim-stroke-100, 1px) dashed var(--border-card-default, #E2E4E6)', paddingTop: 'var(--dim-space-400, 16px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 'var(--type-weight-medium, 500)' }}>ยอดรวมสุทธิ</span>
              <span style={{ fontSize: 'var(--type-size-2xl, 24px)', fontWeight: 'var(--type-weight-bold, 700)', color: 'var(--text-brandPrimary-default, #007549)' }}>
                {fmtBaht(total)}
              </span>
            </div>
          </div>
          <button
            type='button'
            disabled={!selected}
            onClick={() => onConfirm(selected)}
            style={{
              ...primaryBtn,
              marginTop: 'auto',
              opacity: selected ? 1 : 0.45,
              cursor: selected ? 'pointer' : 'not-allowed',
                background: selected
                ? 'var(--surface-brandPrimaryButton-default, #007549)'
                : 'var(--surface-disabledButton-default, #4D5358)',
            }}
          >
            ยืนยันการชำระเงิน
            <Sym name='arrow_forward' size={22} color='#FFFFFF' />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentChannelScreen;
