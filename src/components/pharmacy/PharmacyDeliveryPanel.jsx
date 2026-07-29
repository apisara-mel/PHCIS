import React, { useState } from 'react';
import { updatePharmacyRow } from '@/data/pharmacyQueue';

/* วิธีรับยา — pickup vs. mail delivery (ToR §1.9.4.8 "บันทึกข้อมูลการ
   จัดส่งยาทางไปรษณีย์ได้" + §1.9.5 "พิมพ์ที่อยู่จัดส่งยาได้"). Field set
   mirrors the mobile citizen-facing `PostalAddressSheet` in
   `MobilePharmacyPaymentPage.jsx` (postalCode/province/district/
   subdistrict/road/soi/houseNumber) — desktop staff form instead of a
   mobile sheet, plus recipientName/phone which that mobile form doesn't
   carry but a staff-facing packing slip needs.

   The address slip below renders with the SAME `.mih-pharmacy-print-only`
   class `PharmacyLabelPrint.jsx` already injects — printing from the
   dispense page's "พิมพ์ฉลากยา" action prints the full packet (drug
   labels + shipping address) together when mail delivery is selected,
   rather than needing a second dedicated print button. */

const inputStyle = {
  width: '100%', padding: 'var(--dim-space-150) var(--dim-space-300)',
  background: 'var(--surface-input-default)',
  border: 'var(--dim-stroke-100) solid var(--border-input-default)',
  borderRadius: 'var(--dim-radius-200)',
  fontSize: 'var(--type-size-sm)',
};

const Field = ({ label, ...props }) => (
  <label className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
    <span className='text-xs' style={{ color: 'var(--text-content-tertiary)' }}>{label}</span>
    <input style={inputStyle} {...props} />
  </label>
);

const PharmacyDeliveryPanel = ({ queueNo, row, onChange }) => {
  const [address, setAddress] = useState(row.deliveryAddress || {
    recipientName: row.patientName, phone: '', postalCode: '', province: 'กรุงเทพมหานคร', district: '', subdistrict: '', road: '', soi: '', houseNumber: '',
  });

  const setMethod = (method) => {
    updatePharmacyRow(queueNo, { deliveryMethod: method, deliveryAddress: method === 'mail' ? address : null });
    onChange?.();
  };

  const setAddressField = (key, value) => {
    const next = { ...address, [key]: value };
    setAddress(next);
    updatePharmacyRow(queueNo, { deliveryAddress: next });
    onChange?.();
  };

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <h3 style={{ margin: 0, fontFamily: 'var(--type-family-heading-content)', fontWeight: 'var(--type-weight-bold)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
        วิธีรับยา
      </h3>
      <div className='flex' style={{ gap: 'var(--dim-space-200)' }}>
        {[{ key: 'pickup', label: 'รับด้วยตนเองที่ศูนย์บริการ', icon: 'storefront' }, { key: 'mail', label: 'จัดส่งทางไปรษณีย์', icon: 'local_shipping' }].map((opt) => (
          <button
            key={opt.key}
            type='button'
            onClick={() => setMethod(opt.key)}
            className='flex-1 inline-flex items-center justify-center'
            style={{
              gap: 'var(--dim-space-200)', height: 'var(--dim-size-800, 40px)',
              background: row.deliveryMethod === opt.key ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100)',
              border: `var(--dim-stroke-100) solid ${row.deliveryMethod === opt.key ? 'var(--border-brandPrimary-default)' : 'var(--border-card-default)'}`,
              borderRadius: 'var(--dim-radius-200)',
              color: row.deliveryMethod === opt.key ? 'var(--text-brandPrimary-default)' : 'var(--text-content-secondary)',
              fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)', cursor: 'pointer',
            }}
          >
            <span className='material-symbols-outlined' style={{ fontSize: 18 }} aria-hidden>{opt.icon}</span>
            {opt.label}
          </button>
        ))}
      </div>

      {row.deliveryMethod === 'mail' && (
        <div className='grid grid-cols-1 md:grid-cols-3 gap-3 w-full' style={{ padding: 'var(--dim-space-300)', background: 'var(--surface-card-100)', border: 'var(--dim-stroke-100) solid var(--border-card-default)', borderRadius: 'var(--dim-radius-200)' }}>
          <Field label='ชื่อผู้รับ' value={address.recipientName} onChange={(e) => setAddressField('recipientName', e.target.value)} />
          <Field label='เบอร์โทรศัพท์' value={address.phone} onChange={(e) => setAddressField('phone', e.target.value)} placeholder='0XX-XXX-XXXX' />
          <Field label='รหัสไปรษณีย์' value={address.postalCode} onChange={(e) => setAddressField('postalCode', e.target.value)} />
          <Field label='จังหวัด' value={address.province} onChange={(e) => setAddressField('province', e.target.value)} />
          <Field label='เขต/อำเภอ' value={address.district} onChange={(e) => setAddressField('district', e.target.value)} />
          <Field label='แขวง/ตำบล' value={address.subdistrict} onChange={(e) => setAddressField('subdistrict', e.target.value)} />
          <Field label='ถนน' value={address.road} onChange={(e) => setAddressField('road', e.target.value)} />
          <Field label='ซอย (ถ้ามี)' value={address.soi} onChange={(e) => setAddressField('soi', e.target.value)} />
          <Field label='บ้านเลขที่' value={address.houseNumber} onChange={(e) => setAddressField('houseNumber', e.target.value)} />
        </div>
      )}

      {row.deliveryMethod === 'mail' && (
        <div className='mih-pharmacy-print-only mih-pharmacy-print-label'>
          <div style={{ maxWidth: 'var(--dim-size-2600, 384px)', padding: 'var(--dim-space-400)', border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)', borderRadius: 'var(--dim-radius-300)', fontFamily: 'var(--type-family-body)' }}>
            <div style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)', marginBottom: 'var(--dim-space-100)' }}>ที่อยู่จัดส่ง</div>
            <div style={{ fontSize: 'var(--type-size-sm)' }}>
              {address.recipientName}<br />
              {address.houseNumber} {address.soi ? `ซอย${address.soi} ` : ''}ถนน{address.road}<br />
              แขวง/ตำบล{address.subdistrict} เขต/อำเภอ{address.district} {address.province} {address.postalCode}<br />
              โทร {address.phone}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacyDeliveryPanel;
