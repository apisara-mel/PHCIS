import React from 'react';

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
    }
  `;
  document.head.appendChild(css);
}

/* Minimal EN phrase dictionary — covers the frequency/when/unit vocabulary
   actually used by this mock dataset (ToR §1.9.2.5 "พิมพ์วิธีใช้ยาภาษา
   อังกฤษ"). Falls back to the Thai source string for anything not in the
   table rather than pretending to be a full translation engine. */
const EN_PHRASES = {
  'วันละ 3 ครั้ง': '3 times daily',
  'วันละ 2 ครั้ง': 'twice daily',
  'วันละ 1 ครั้ง': 'once daily',
  'ทุก 6 ชั่วโมงเมื่อมีอาการ': 'every 6 hours as needed',
  'หลังอาหาร': 'after meals',
  'หลังอาหารทันที': 'immediately after meals',
  'ก่อนนอน': 'at bedtime',
  'ก่อนอาหารเช้า': 'before breakfast 30 min',
  'เม็ด': 'tablet(s)',
  'แคปซูล': 'capsule(s)',
  'รับประทานจนยาหมด แม้อาการดีขึ้น': 'Complete the full course even if symptoms improve.',
  'รับประทานเมื่อมีไข้หรือปวด': 'Take when fever or pain occurs.',
  'งดใช้ร่วมกับยาแก้ปวดกลุ่มเดียวกัน': 'Do not combine with other drugs of the same class.',
  'อาจทำให้ง่วงซึม': 'May cause drowsiness.',
  'รับประทานต่อเนื่องตามแพทย์สั่ง': 'Take continuously as prescribed.',
  'รับประทานก่อนอาหาร 30 นาที': 'Take 30 minutes before meals.',
  'ยานอกบัญชี — ตรวจสอบสิทธิก่อนจ่าย': 'Non-formulary item — verify coverage before dispensing.',
};

const PharmacyLabelPrint = ({ patientName, hn, items = [], pharmacistName = 'ภก.สิทธิชัย พรหมจันทร์', lang = 'th' }) => {
  const printedAt = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });
  const tr = (s) => (lang === 'en' ? (EN_PHRASES[s] || s) : s);
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
          <div style={{ fontSize: 'var(--type-size-lg)', fontWeight: 'var(--type-weight-bold)', marginBottom: 'var(--dim-space-100)' }}>
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
