import React, { useMemo, useState } from 'react';
import { Icon } from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import { PAYMENT_METHODS, formatBaht } from '@/data/financePaymentPrototype';

/* ตัดยอด/นำส่งเงิน (Daily Cutoff & Remittance) — TOR §2.2. Closes out the
   cashier's shift: totals today's paid receipts by method, then requires
   the closing cashier's name before locking the day. Voided receipts are
   shown for reconciliation but excluded from the remittance total. */

const CutoffSection = ({ queue, cutoff, onCutoff }) => {
  const [signer, setSigner] = useState('');

  const paidRows = useMemo(() => queue.filter((r) => r.status === 'paid'), [queue]);
  const voidedRows = useMemo(() => queue.filter((r) => r.status === 'voided'), [queue]);

  const methodTotals = PAYMENT_METHODS.map((m) => ({
    ...m,
    total: paidRows.filter((r) => r.paymentMethod === m.key).reduce((s, r) => s + (r.amountReceived || 0), 0),
  }));
  const grandTotal = paidRows.reduce((s, r) => s + (r.amountReceived || 0), 0);

  if (cutoff) {
    return (
      <div
        className='flex flex-col'
        style={{
          gap: 'var(--dim-space-200)',
          background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
          borderRadius: 'var(--dim-radius-400)',
          padding: 'var(--dim-space-500)',
        }}
      >
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <Icon name='check_circle' size={20} />
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-base)', fontWeight: 'var(--type-weight-bold)' }}>ปิดยอดประจำวันแล้ว</span>
        </div>
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>
          นำส่งยอด {formatBaht(cutoff.total)} โดย {cutoff.closedBy} เมื่อ {cutoff.closedAt}
        </span>
      </div>
    );
  }

  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
        {methodTotals.map((m) => (
          <div key={m.key} className='flex items-center justify-between' style={{ padding: 'var(--dim-space-200) 0', borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)' }}>
            <span className='flex items-center' style={{ gap: 'var(--dim-space-150)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
              <Icon name={m.icon} size={16} /> {m.label}
            </span>
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)' }}>{formatBaht(m.total)}</span>
          </div>
        ))}
        <div className='flex items-center justify-between'>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-base)', fontWeight: 'var(--type-weight-bold)' }}>ยอดนำส่งรวม</span>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-base)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-brandPrimary-default)' }}>{formatBaht(grandTotal)}</span>
        </div>
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
          ใบเสร็จที่ยกเลิกวันนี้ {voidedRows.length} รายการ (ไม่รวมในยอดนำส่ง)
        </span>
      </div>

      <div className='flex items-end' style={{ gap: 'var(--dim-space-300)' }}>
        <InputField label='ผู้ปิดยอด / นำส่งเงิน' value={signer} onChange={setSigner} placeholder='ชื่อ-นามสกุล เจ้าหน้าที่การเงิน' />
        <BrandSubdueButton
          disabled={signer.trim().length === 0}
          onClick={() => onCutoff({ closedBy: signer.trim(), total: grandTotal, closedAt: new Date().toLocaleString('th-TH') })}
        >
          ปิดยอดประจำวัน
        </BrandSubdueButton>
      </div>
    </div>
  );
};

export default CutoffSection;
