import React, { useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
  MobileShell,
  MobileHeader,
  MobileCard,
  MobileButton,
  MobileBadge,
  MobileInput,
  MobileField,
  Sym,
} from '@/components/mobile/MobileShell';
import { BILLS, findBill } from '@/data/mobileMock';
import { FakeQR } from '@/pages/mobile/MobileRegisterPage';

/* MIH PHCIS Mobile · Payment & receipts — TOR §4.12.
   List of bills (pending + paid + UC-covered) with a detail/checkout
   flow that supports QR PromptPay (4.12.3), credit/debit (4.12.3), and
   "shows an e-receipt" (4.12.2) after payment is confirmed.              */

const STATUS_META = {
  pending: { label: 'รอชำระ', tone: 'warning' },
  paid:    { label: 'ชำระแล้ว', tone: 'success' },
  covered: { label: 'สิทธิครอบคลุม', tone: 'info' },
};

const MobilePaymentListInner = () => {
  const history = useHistory();
  const totalPending = BILLS.filter((b) => b.status === 'pending').reduce((s, b) => s + b.amount, 0);
  return (
    <>
      <MobileHeader title='ชำระเงินและใบเสร็จ' subtitle='TOR §4.12' onBack={() => history.push('/m/home')} />
      <div style={{ padding: 'var(--dim-space-400, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
        {/* Pending banner */}
        {totalPending > 0 && (
          <MobileCard padding='var(--dim-space-500, 20px)'
            style={{ background: 'linear-gradient(135deg, #D43838 0%, #FFA67E 100%)', borderColor: 'transparent', color: 'var(--text-content-on-content)' }}>
            <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', opacity: 0.9, fontWeight: 700 }}>ยอดค้างชำระทั้งหมด</p>
            <p style={{
              margin: '4px 0 0',
              fontFamily: 'var(--type-family-display)',
              fontSize: 28,
              fontWeight: 'var(--type-weight-bold, 700)',
            }}>฿{totalPending.toLocaleString()}</p>
            <p style={{ margin: '4px 0 0', fontSize: 'var(--type-size-xs, 12px)', opacity: 0.9 }}>
              ชำระผ่านแอปได้ทันที (QR / บัตร) หรือไปที่ตู้ Kiosk
            </p>
          </MobileCard>
        )}

        <div>
          <h3 style={sectionTitle}>รายการบิล ({BILLS.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-300, 12px)' }}>
            {BILLS.map((b) => {
              const m = STATUS_META[b.status] || STATUS_META.pending;
              return (
                <MobileCard key={b.id} onClick={() => history.push(`/m/payment/${b.id}`)} padding='var(--dim-space-400, 16px)'>
                  <div className='flex items-start' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                    <span style={{
                      width: 40, height: 40, borderRadius: 'var(--dim-radius-300, 10px)',
                      background: b.status === 'pending' ? 'var(--surface-warning-quaternary, #FDECEC)' : 'var(--surface-success-quaternary, #E9F8EF)',
                      color: b.status === 'pending' ? 'var(--text-warning-default, #D43838)' : 'var(--text-success-default, #1F9D55)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Sym name={b.status === 'pending' ? 'receipt_long' : 'verified'} size={22} fill />
                    </span>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center' style={{ gap: 6 }}>
                        <MobileBadge tone={m.tone}>{m.label}</MobileBadge>
                      </div>
                      <p style={{ margin: '4px 0 0', fontWeight: 700, color: 'var(--text-content-primary)' }}>
                        ฿{b.amount.toLocaleString()}
                      </p>
                      <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>
                        {b.date} · {b.id}
                      </p>
                    </div>
                    <Sym name='chevron_right' size={20} color='var(--text-content-tertiary)' />
                  </div>
                </MobileCard>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

const MobilePaymentDetailInner = () => {
  const history = useHistory();
  const { id } = useParams();
  const bill = findBill(id);

  const [method, setMethod] = useState('qr');     /* qr | card */
  const [card, setCard] = useState({ no: '', name: '', exp: '', cvv: '' });
  const [paid, setPaid] = useState(false);

  if (!bill) {
    return (
      <>
        <MobileHeader title='ไม่พบรายการ' onBack={() => history.push('/m/payment')} />
      </>
    );
  }

  const m = STATUS_META[bill.status];
  const isOpen = bill.status === 'pending' && !paid;
  const onPay = () => {
    setPaid(true);
  };

  return (
    <>
      <MobileHeader title='รายละเอียดการชำระเงิน' onBack={() => history.push('/m/payment')} />
      <div style={{ padding: 'var(--dim-space-400, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
        {/* Bill card */}
        <MobileCard padding='var(--dim-space-500, 20px)'>
          <div className='flex items-center' style={{ gap: 12, marginBottom: 'var(--dim-space-300, 12px)' }}>
            <MobileBadge tone={paid ? 'success' : m.tone}>{paid ? 'ชำระแล้ว' : m.label}</MobileBadge>
          </div>
          <p style={{
            margin: 0,
            fontFamily: 'var(--type-family-display)',
            fontSize: 32,
            fontWeight: 'var(--type-weight-bold, 700)',
            color: 'var(--text-content-primary)',
          }}>฿{bill.amount.toLocaleString()}</p>
          <p style={{ margin: 0, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary)' }}>
            {bill.date} · {bill.id}
          </p>
          <hr style={{ border: 'none', borderTop: '1px dashed var(--border-content-tertiary)', margin: 'var(--dim-space-400, 16px) 0' }} />
          {bill.items.map((it, i) => (
            <div key={i} className='flex items-center justify-between' style={{ padding: '6px 0', fontSize: 'var(--type-size-sm, 14px)' }}>
              <span style={{ color: 'var(--text-content-secondary)' }}>{it.label}</span>
              <span style={{ fontWeight: 700, color: it.amount < 0 ? 'var(--text-success-default)' : 'var(--text-content-primary)' }}>
                {it.amount < 0 ? '−' : ''}฿{Math.abs(it.amount).toLocaleString()}
              </span>
            </div>
          ))}
        </MobileCard>

        {/* Payment methods */}
        {isOpen && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {[
                { k: 'qr',   l: 'QR PromptPay', i: 'qr_code_2' },
                { k: 'card', l: 'บัตรเครดิต/เดบิต', i: 'credit_card' },
              ].map((opt) => {
                const active = opt.k === method;
                return (
                  <button key={opt.k} type='button' onClick={() => setMethod(opt.k)}
                    style={{
                      padding: 'var(--dim-space-400, 16px)',
                      borderRadius: 'var(--dim-radius-300, 10px)',
                      background: active ? 'var(--surface-brandPrimary-quaternary, #F4FBF8)' : 'var(--surface-content-default)',
                      border: '1.5px solid ' + (active ? 'var(--border-brandPrimary-default)' : 'var(--border-content-tertiary)'),
                      color: active ? 'var(--text-brandPrimary-default)' : 'var(--text-content-primary)',
                      cursor: 'pointer', textAlign: 'center',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    }}>
                    <Sym name={opt.i} size={28} fill={active} />
                    <span style={{ fontWeight: 700 }}>{opt.l}</span>
                  </button>
                );
              })}
            </div>

            {method === 'qr' ? (
              <MobileCard padding='var(--dim-space-500, 20px)' style={{ textAlign: 'center' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #0F3D7A 0%, #074594 100%)',
                  padding: 'var(--dim-space-400, 16px)',
                  borderTopLeftRadius: 'var(--dim-radius-500, 16px)',
                  borderTopRightRadius: 'var(--dim-radius-500, 16px)',
                  marginTop: 'calc(-1 * var(--dim-space-500, 20px))',
                  marginLeft: 'calc(-1 * var(--dim-space-500, 20px))',
                  marginRight: 'calc(-1 * var(--dim-space-500, 20px))',
                  color: 'var(--text-content-on-content)',
                  fontWeight: 700,
                }}>
                  PromptPay · พร้อมเพย์
                </div>
                <div style={{ background: '#FFFFFF', padding: 'var(--dim-space-400, 16px)', display: 'inline-block', marginTop: 'var(--dim-space-300, 12px)', borderRadius: 12 }}>
                  <FakeQR seed={bill.id} size={200} />
                </div>
                <p style={{ margin: 'var(--dim-space-300, 12px) 0 0', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary)' }}>
                  เปิดแอปธนาคารและสแกน QR เพื่อชำระ ฿{bill.amount.toLocaleString()}
                </p>
                <MobileButton style={{ marginTop: 'var(--dim-space-400, 16px)' }} onClick={onPay} icon='check_circle'>
                  ยืนยันชำระเงินเรียบร้อย
                </MobileButton>
              </MobileCard>
            ) : (
              <MobileCard padding='var(--dim-space-500, 20px)'>
                <h3 style={sectionTitle}>กรอกข้อมูลบัตร</h3>
                <MobileField label='หมายเลขบัตร'>
                  <MobileInput inputMode='numeric' placeholder='4242 4242 4242 4242'
                    value={card.no}
                    onChange={(e) => setCard({ ...card, no: e.target.value.replace(/\D/g, '').slice(0, 16) })} />
                </MobileField>
                <MobileField label='ชื่อบนบัตร'>
                  <MobileInput placeholder='SOMCHAI MISUK' value={card.name}
                    onChange={(e) => setCard({ ...card, name: e.target.value.toUpperCase() })} />
                </MobileField>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <MobileField label='วันหมดอายุ'>
                    <MobileInput placeholder='MM/YY' value={card.exp}
                      onChange={(e) => setCard({ ...card, exp: e.target.value.replace(/[^\d/]/g, '').slice(0, 5) })} />
                  </MobileField>
                  <MobileField label='CVV'>
                    <MobileInput inputMode='numeric' placeholder='123' value={card.cvv}
                      onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
                  </MobileField>
                </div>
                <MobileButton style={{ marginTop: 'var(--dim-space-300, 12px)' }} icon='lock' onClick={onPay}>
                  ชำระ ฿{bill.amount.toLocaleString()} ผ่านบัตร
                </MobileButton>
                <p style={{ margin: 'var(--dim-space-200, 8px) 0 0', textAlign: 'center', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>
                  เชื่อมต่อผ่าน Payment Gateway ของธนาคารที่สำนักอนามัยกำหนด
                </p>
              </MobileCard>
            )}
          </>
        )}

        {/* e-Receipt (post-pay) */}
        {(paid || bill.status === 'paid') && (
          <MobileCard padding='var(--dim-space-500, 20px)' style={{ borderColor: 'var(--border-success-default)', background: 'var(--surface-success-quaternary, #E9F8EF)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, margin: '0 auto var(--dim-space-200, 8px)',
                background: 'var(--surface-success-default, #1F9D55)',
                color: 'var(--text-content-on-content)', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sym name='check' size={32} />
              </div>
              <h3 style={{ ...sectionTitle, color: 'var(--text-success-default)', margin: 0 }}>ชำระเรียบร้อย</h3>
              <p style={{ margin: '4px 0 var(--dim-space-300, 12px)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary)' }}>
                ใบเสร็จในรูปแบบ e-Document พร้อมดาวน์โหลด
              </p>
              <MobileButton variant='secondary' icon='download'
                onClick={() => alert('ดาวน์โหลด e-Receipt-' + bill.id + '.pdf')}>
                ดาวน์โหลด e-Receipt
              </MobileButton>
            </div>
          </MobileCard>
        )}
      </div>
    </>
  );
};

const sectionTitle = {
  margin: '0 0 var(--dim-space-200, 8px)',
  fontFamily: 'var(--type-family-display)',
  fontSize: 'var(--type-size-base, 16px)',
  fontWeight: 'var(--type-weight-bold, 700)',
  color: 'var(--text-content-primary)',
};

export const MobilePaymentPage = () => (
  <MobileShell>
    <MobilePaymentListInner />
  </MobileShell>
);

export const MobilePaymentDetailPage = () => (
  <MobileShell>
    <MobilePaymentDetailInner />
  </MobileShell>
);

export default MobilePaymentPage;
