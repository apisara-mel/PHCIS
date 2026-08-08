import React from 'react';

/* Full prescription printout — one sheet listing every prescribed item
   together (ToR §1.9.2.12 "พิมพ์ใบสั่งยาได้"), distinct from
   `PharmacyLabelPrint`'s one-label-per-drug sheets. Mounted at all times
   on `PharmacyDispensePage` but hidden until `triggerPharmacyPrint
   ('prescription')` flips `data-pharmacy-print-mode` on `<html>` — see
   the shared stylesheet injected by `PharmacyLabelPrint.jsx`. */

const PharmacyPrescriptionPrint = ({ patient, hn, diagnosis, doctor, items = [], pharmacistName = 'ภก.สิทธิชัย พรหมจันทร์' }) => {
  const printedAt = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });
  return (
    <div className='mih-pharmacy-print-only mih-pharmacy-print-prescription'>
      <div style={{ maxWidth: 640, padding: 'var(--dim-space-500)', fontFamily: 'var(--type-family-body)', color: 'var(--text-content-default)' }}>
        <div style={{ fontSize: 'var(--type-size-xl)', fontFamily: 'var(--type-family-heading-content)', fontWeight: 'var(--type-weight-heading-strong, var(--type-weight-medium, 500))', marginBottom: 'var(--dim-space-100)' }}>
          ใบสั่งยา
        </div>
        <div style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)', marginBottom: 'var(--dim-space-400)' }}>
          ศูนย์บริการสาธารณสุข 4 ดินแดง สำนักอนามัย กรุงเทพมหานคร
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--dim-space-100)', fontSize: 'var(--type-size-sm)', marginBottom: 'var(--dim-space-400)' }}>
          <div>ผู้ป่วย: {patient}</div>
          <div>HN: {hn}</div>
          <div>การวินิจฉัย: {diagnosis?.icd10} — {diagnosis?.name}</div>
          <div>แพทย์ผู้สั่ง: {doctor}</div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--type-size-sm)' }}>
          <thead>
            <tr style={{ borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)', textAlign: 'left' }}>
              <th style={{ padding: 'var(--dim-space-150) 0' }}>ลำดับ</th>
              <th style={{ padding: 'var(--dim-space-150) 0' }}>ชื่อยา</th>
              <th style={{ padding: 'var(--dim-space-150) 0' }}>วิธีใช้</th>
              <th style={{ padding: 'var(--dim-space-150) 0' }}>จำนวน</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} style={{ borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)' }}>
                <td style={{ padding: 'var(--dim-space-150) 0' }}>{i + 1}</td>
                <td style={{ padding: 'var(--dim-space-150) 0', fontWeight: 'var(--type-weight-medium)' }}>{item.name}</td>
                <td style={{ padding: 'var(--dim-space-150) 0' }}>{item.dosePerTake} {item.unit} · {item.frequency} · {item.when}</td>
                <td style={{ padding: 'var(--dim-space-150) 0' }}>{item.quantity} {item.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 'var(--dim-space-500)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}>
          เภสัชกรผู้จ่ายยา: {pharmacistName}<br />
          วันที่พิมพ์: {printedAt}
        </div>
      </div>
    </div>
  );
};

export default PharmacyPrescriptionPrint;
