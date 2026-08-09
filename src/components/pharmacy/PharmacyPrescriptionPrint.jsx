import React from 'react';
import { translatePharmacyPrintPhrase } from '@/components/pharmacy/pharmacyPrintUtils';

/* Full prescription printout — one sheet listing every prescribed item
   together (ToR §1.9.2.12 "พิมพ์ใบสั่งยาได้"), distinct from
   `PharmacyLabelPrint`'s one-label-per-drug sheets. Mounted at all times
   on `PharmacyDispensePage` but hidden until `triggerPharmacyPrint
   ('prescription')` flips `data-pharmacy-print-mode` on `<html>` — see
   the shared stylesheet injected by `PharmacyLabelPrint.jsx`.

   `lang` mirrors label print (ToR §1.9.2.5) so usage directions can be
   Thai or English when the pharmacist picks from พิมพ์ใบสั่งยา. */

const PharmacyPrescriptionPrint = ({
  patient,
  hn,
  diagnosis,
  doctor,
  items = [],
  pharmacistName = 'ภก.สิทธิชัย พรหมจันทร์',
  lang = 'th',
}) => {
  const printedAt = new Date().toLocaleString(
    lang === 'en' ? 'en-GB' : 'th-TH',
    { dateStyle: 'long', timeStyle: 'short' },
  );
  const tr = (s) => translatePharmacyPrintPhrase(s, lang);
  const L = lang === 'en'
    ? {
      title: 'Prescription',
      clinic: 'Health Center 4 Din Daeng, Bangkok Metropolitan Administration',
      patient: 'Patient',
      diagnosis: 'Diagnosis',
      doctor: 'Prescribing physician',
      no: 'No.',
      drug: 'Medication',
      usage: 'Directions',
      qty: 'Qty',
      pharmacist: 'Dispensing pharmacist',
      printed: 'Printed on',
    }
    : {
      title: 'ใบสั่งยา',
      clinic: 'ศูนย์บริการสาธารณสุข 4 ดินแดง สำนักอนามัย กรุงเทพมหานคร',
      patient: 'ผู้ป่วย',
      diagnosis: 'การวินิจฉัย',
      doctor: 'แพทย์ผู้สั่ง',
      no: 'ลำดับ',
      drug: 'ชื่อยา',
      usage: 'วิธีใช้',
      qty: 'จำนวน',
      pharmacist: 'เภสัชกรผู้จ่ายยา',
      printed: 'วันที่พิมพ์',
    };

  return (
    <div className='mih-pharmacy-print-only mih-pharmacy-print-prescription'>
      <div style={{ maxWidth: 640, padding: 'var(--dim-space-500)', fontFamily: 'var(--type-family-body)', color: 'var(--text-content-default)' }}>
        <div style={{ fontSize: 'var(--type-size-xl)', fontFamily: 'var(--type-family-heading-content)', fontWeight: 'var(--type-weight-heading-strong, var(--type-weight-medium, 500))', marginBottom: 'var(--dim-space-100)' }}>
          {L.title}
        </div>
        <div style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)', marginBottom: 'var(--dim-space-400)' }}>
          {L.clinic}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--dim-space-100)', fontSize: 'var(--type-size-sm)', marginBottom: 'var(--dim-space-400)' }}>
          <div>{L.patient}: {patient}</div>
          <div>HN: {hn}</div>
          <div>{L.diagnosis}: {diagnosis?.icd10} — {diagnosis?.name}</div>
          <div>{L.doctor}: {doctor}</div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--type-size-sm)' }}>
          <thead>
            <tr style={{ borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)', textAlign: 'left' }}>
              <th style={{ padding: 'var(--dim-space-150) 0' }}>{L.no}</th>
              <th style={{ padding: 'var(--dim-space-150) 0' }}>{L.drug}</th>
              <th style={{ padding: 'var(--dim-space-150) 0' }}>{L.usage}</th>
              <th style={{ padding: 'var(--dim-space-150) 0' }}>{L.qty}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} style={{ borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)' }}>
                <td style={{ padding: 'var(--dim-space-150) 0' }}>{i + 1}</td>
                <td style={{ padding: 'var(--dim-space-150) 0', fontWeight: 'var(--type-weight-medium)' }}>{item.name}</td>
                <td style={{ padding: 'var(--dim-space-150) 0' }}>
                  {item.dosePerTake} {tr(item.unit)} · {tr(item.frequency)} · {tr(item.when)}
                </td>
                <td style={{ padding: 'var(--dim-space-150) 0' }}>{item.quantity} {tr(item.unit)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 'var(--dim-space-500)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}>
          {L.pharmacist}: {pharmacistName}<br />
          {L.printed}: {printedAt}
        </div>
      </div>
    </div>
  );
};

export default PharmacyPrescriptionPrint;
