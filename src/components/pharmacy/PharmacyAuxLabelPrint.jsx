import React from 'react';

/* ฉลากช่วย (auxiliary label) print sheet — ToR §1.9.2.11 "พิมพ์ข้อมูล
   เพิ่มเติม วิธีการใช้ ฉลากช่วย เพื่อให้ปรากฏบนฉลากได้". One small sticker
   per (item × selected aux-label phrase), separate from the main drug
   label (`PharmacyLabelPrint`) so either can be printed independently —
   the print-mode CSS switch lives in `PharmacyLabelPrint.jsx` alongside
   the other two document modes. */
const PharmacyAuxLabelPrint = ({ items = [] }) => {
  const stickers = items.flatMap((item) => (item.auxLabels || []).map((label) => ({ id: `${item.id}-${label}`, name: item.name, label })));
  return (
    <div className='mih-pharmacy-print-only mih-pharmacy-print-auxlabel'>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--dim-space-300)' }}>
        {stickers.map((s) => (
          <div
            key={s.id}
            style={{
              width: 220,
              padding: 'var(--dim-space-300)',
              border: 'var(--dim-stroke-200) solid var(--text-alert-warning, #C2410C)',
              borderRadius: 'var(--dim-radius-300)',
              pageBreakInside: 'avoid',
              fontFamily: 'var(--type-family-body)',
              color: 'var(--text-content-default)',
            }}
          >
            <div style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)', marginBottom: 'var(--dim-space-050)' }}>{s.name}</div>
            <div style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PharmacyAuxLabelPrint;
