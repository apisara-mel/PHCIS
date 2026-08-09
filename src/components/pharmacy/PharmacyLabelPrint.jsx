import React from 'react';
import { translatePharmacyPrintPhrase } from '@/components/pharmacy/pharmacyPrintUtils';

/* Printable medication-label sheet — one label per prescribed item.
   Mounted at all times on PharmacyDispensePage but visually hidden;
   `.mih-pharmacy-print-only` / `.mih-pharmacy-no-print` (injected once
   below, mirrors the idempotent module-load stylesheet pattern used by
   `Table.jsx`'s skeleton styles) flip visibility only inside `@media
   print`, so `window.print()` — no barcode/PDF library needed — prints
   just the labels and none of the app chrome.

   `data-pharmacy-print-mode` (set by `pharmacyPrintUtils.js` right before
   `window.print()`) picks which print-only document actually shows —
   labels (this component + the mail-delivery address slip) vs. the
   single-sheet full prescription (`PharmacyPrescriptionPrint`) — so the
   two "print" buttons on the dispense page never print each other's
   content. Falls back to label mode if the attribute was never set. */
if (typeof document !== 'undefined' && !document.getElementById('mih-pharmacy-print-style')) {
  const css = document.createElement('style');
  css.id = 'mih-pharmacy-print-style';
  css.textContent = `
    .mih-pharmacy-print-only { display: none; }
    @media print {
      .mih-pharmacy-no-print { display: none !important; }
      html:not([data-pharmacy-print-mode]) .mih-pharmacy-print-only.mih-pharmacy-print-label { display: block !important; }
      html[data-pharmacy-print-mode="label"] .mih-pharmacy-print-only.mih-pharmacy-print-label { display: block !important; }
      html[data-pharmacy-print-mode="prescription"] .mih-pharmacy-print-only.mih-pharmacy-print-prescription { display: block !important; }
      html[data-pharmacy-print-mode="auxlabel"] .mih-pharmacy-print-only.mih-pharmacy-print-auxlabel { display: block !important; }
      html[data-pharmacy-print-mode="med-history"] .mih-pharmacy-print-only.mih-pharmacy-print-med-history { display: block !important; }
    }
  `;
  document.head.appendChild(css);
}

const PharmacyLabelPrint = ({ patientName, hn, items = [], pharmacistName = 'ภก.สิทธิชัย พรหมจันทร์', lang = 'th' }) => {
  const printedAt = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });
  const tr = (s) => translatePharmacyPrintPhrase(s, lang);
  const L = lang === 'en'
    ? { take: 'Take', qty: 'Quantity', patient: 'Patient', pharmacist: 'Pharmacist', date: 'Dispensed on' }
    : { take: 'รับประทานครั้งละ', qty: 'จำนวน', patient: 'ผู้ป่วย', pharmacist: 'เภสัชกร', date: 'วันที่จ่ายยา' };
  return (
    <div className='mih-pharmacy-print-only mih-pharmacy-print-label'>
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            width: '100%',
            maxWidth: 384,
            padding: 'var(--dim-space-400)',
            border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
            borderRadius: 'var(--dim-radius-300)',
            marginBottom: 'var(--dim-space-400)',
            pageBreakInside: 'avoid',
            fontFamily: 'var(--type-family-body)',
            color: 'var(--text-content-default)',
          }}
        >
          <div style={{ fontSize: 'var(--type-size-lg)', fontFamily: 'var(--type-family-heading-content)', fontWeight: 'var(--type-weight-heading-strong, var(--type-weight-medium, 500))', marginBottom: 'var(--dim-space-100)' }}>
            {item.name}
          </div>
          <div style={{ fontSize: 'var(--type-size-sm)', marginBottom: 'var(--dim-space-200)' }}>
            {L.take} {item.dosePerTake} {tr(item.unit)} · {tr(item.frequency)} · {tr(item.when)}
          </div>
          {item.instructions && (
            <div style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)', marginBottom: 'var(--dim-space-200)' }}>
              {tr(item.instructions)}
            </div>
          )}
          <div style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)' }}>
            {L.qty} {item.quantity} {tr(item.unit)}
          </div>
          <hr style={{ margin: 'var(--dim-space-200) 0', border: 0, borderTop: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)' }} />
          <div style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}>
            {L.patient}: {patientName} (HN {hn})<br />
            {L.pharmacist}: {pharmacistName}<br />
            {L.date}: {printedAt}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PharmacyLabelPrint;
