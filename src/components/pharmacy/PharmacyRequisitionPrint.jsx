import React from 'react';

/* Printable ใบเบิกยา/ใบรับยา sheet (ToR §1.9.6.10 "สามารถพิมพ์ใบเบิกยาได้").
   Independent print-only surface from the dispense page's label/prescription/
   auxlabel print system (different route, no shared print-mode state) —
   toggles visibility only inside `@media print` via its own idempotent
   stylesheet injection, same convention as `PharmacyLabelPrint.jsx`. */
if (typeof document !== 'undefined' && !document.getElementById('mih-pharmacy-requisition-print-style')) {
  const css = document.createElement('style');
  css.id = 'mih-pharmacy-requisition-print-style';
  css.textContent = `
    .mih-requisition-print-only { display: none; }
    @media print {
      .mih-requisition-no-print { display: none !important; }
      .mih-requisition-print-only { display: block !important; }
    }
  `;
  document.head.appendChild(css);
}

const PharmacyRequisitionPrint = ({ title, columns = [], rows = [] }) => {
  const printedAt = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });
  return (
    <div className='mih-requisition-print-only' style={{ padding: 'var(--dim-space-600)', fontFamily: 'var(--type-family-body)', color: 'var(--text-content-default)' }}>
      <h1 style={{ fontSize: 'var(--type-size-lg)', fontWeight: 'var(--type-weight-heading-strong, var(--type-weight-medium, 500))', marginBottom: 'var(--dim-space-100)' }}>{title}</h1>
      <p style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)', marginBottom: 'var(--dim-space-400)' }}>พิมพ์เมื่อ {printedAt}</p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ textAlign: 'left', padding: 'var(--dim-space-200)', borderBottom: 'var(--dim-stroke-200) solid var(--border-card-default)', fontSize: 'var(--type-size-xs)' }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key} style={{ padding: 'var(--dim-space-200)', borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)', fontSize: 'var(--type-size-sm)' }}>{c.print ? c.print(r) : r[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PharmacyRequisitionPrint;
