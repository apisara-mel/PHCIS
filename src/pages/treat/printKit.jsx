import React, { useEffect } from 'react';

/* PHCIS | EMR §1.4.6.1–.4 / CPOE §1.5.10.2 / §1.5.11.4 — ชุด primitive
   สำหรับ "แผ่นพิมพ์ A4" ทุกชนิดในโมดูลบันทึกการรักษา.

   เดิม ReferralPrintSheet.jsx ฝัง @media print + Cell/Block/SignatureLine
   ไว้ในไฟล์ตัวเอง พอเวฟนี้ต้องมีใบคำขอตรวจ Lab / X-ray เพิ่มอีก 2 แผ่น
   ก็จะ copy กติกาการพิมพ์ไปอีก 2 ชุด ไฟล์นี้จึงยกกฎออกมาไว้ที่เดียว.

   ข้อจำกัดที่ต้องรายงานตามจริง (TOR §1.4.6.x / §1.5.11.4):
   **ยังไม่มี PDF engine ฝั่ง server** — "บันทึกเป็น PDF" คือการใช้
   ปลายทาง "Save as PDF" ของ print dialog เบราว์เซอร์ ระบบทำได้แค่
   จัด @page ให้ถูกและตั้งชื่อไฟล์ผ่าน document.title ชั่วคราว. */

export const PRINT_LABEL_STYLE = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs, 12px)',
  lineHeight: 1.5,
};

export const PRINT_VALUE_STYLE = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm, 14px)',
  lineHeight: 1.6,
};

export const PRINT_TITLE_STYLE = {
  color: 'var(--text-topic-primary-title)',
  fontFamily: 'var(--type-family-heading-content)',
  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
  fontSize: 'var(--type-size-lg, 18px)',
  lineHeight: 1.4,
};

/* ── stylesheet injection แบบ idempotent (pattern AISearch.jsx) ────
   scope ทุกกฎด้วย body.<bodyClass> และถอดคลาสออกตอน unmount เพื่อไม่ให้
   `visibility: hidden` ค้างทั้ง SPA แล้วทำให้หน้าพิมพ์อื่นออกมาเป็นหน้าว่าง.

   `.mih-print-sheet` ใช้ร่วมกันทุกแผ่น: หัวตารางซ้ำเมื่อขึ้นหน้าใหม่
   (thead display: table-header-group) และบล็อกที่ห้ามฉีกกลางหน้า
   (.mih-print-keep). */
export const usePrintSheet = ({ styleId, bodyClass }) => {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const prev = document.getElementById(styleId);
    if (prev) prev.remove();
    const el = document.createElement('style');
    el.id = styleId;
    el.textContent = `
@media print {
  body.${bodyClass} * { visibility: hidden !important; }
  body.${bodyClass} .mih-print-sheet,
  body.${bodyClass} .mih-print-sheet * { visibility: visible !important; }
  body.${bodyClass} .mih-print-sheet {
    position: absolute !important;
    top: 0 !important; left: 0 !important;
    width: 100% !important;
    box-shadow: none !important;
    border: 0 !important;
  }
  body.${bodyClass} .mih-print-noprint { display: none !important; }
  body.${bodyClass} .mih-print-sheet thead { display: table-header-group !important; }
  body.${bodyClass} .mih-print-sheet tr,
  body.${bodyClass} .mih-print-sheet .mih-print-keep { break-inside: avoid !important; page-break-inside: avoid !important; }
  body.${bodyClass} .mih-print-sheet .mih-print-break { break-before: page !important; page-break-before: always !important; }
  @page { size: A4 portrait; margin: 12mm; }
}
`;
    document.head.appendChild(el);
    document.body.classList.add(bodyClass);
    return () => {
      const node = document.getElementById(styleId);
      if (node) node.remove();
      document.body.classList.remove(bodyClass);
    };
  }, [styleId, bodyClass]);
};

/* "บันทึกเป็น PDF" — ไม่มี PDF engine จริง จึงตั้งชื่อไฟล์ผ่าน
   document.title (เบราว์เซอร์ใช้ค่านี้เป็นชื่อไฟล์เริ่มต้นของ Save as PDF)
   แล้วคืนค่าเดิมหลังปิด dialog. คืนค่า false ถ้าเรียกใช้ไม่ได้. */
export const printWithFilename = (filename) => {
  if (typeof window === 'undefined' || !window.print) return false;
  const prev = document.title;
  if (filename) document.title = filename;
  try {
    window.print();
  } finally {
    /* Chrome/Safari คืน control หลัง print dialog ปิด — ตั้งกลับทันที
       และกันเคสที่ dialog เป็น async ด้วย timeout อีกชั้น */
    document.title = prev;
    window.setTimeout(() => { document.title = prev; }, 0);
  }
  return true;
};

export const PrintCell = ({ label, value, flex = 1, minWidth = 150 }) => (
  <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)', flex, minWidth }}>
    <span style={PRINT_LABEL_STYLE}>{label}</span>
    <span style={PRINT_VALUE_STYLE}>{value == null || value === '' ? '—' : value}</span>
  </div>
);

export const PrintBlock = ({ title, children }) => (
  <section
    className='flex flex-col w-full mih-print-keep'
    style={{
      gap: 'var(--dim-space-200, 8px)',
      borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
      paddingTop: 'var(--dim-space-300, 12px)',
    }}
  >
    <span
      style={{
        color: 'var(--text-topic-tertiary-title)',
        fontFamily: 'var(--type-family-heading-content)',
        fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
        fontSize: 'var(--type-size-sm, 14px)',
        lineHeight: 1.5,
      }}
    >
      {title}
    </span>
    {children}
  </section>
);

export const PrintSignatureLine = ({ role, name, note }) => (
  <div className='flex flex-col items-center mih-print-keep' style={{ gap: 'var(--dim-space-100, 4px)', minWidth: 220 }}>
    <div
      style={{
        width: '100%',
        borderBottom: 'var(--dim-stroke-100, 1px) dotted var(--border-neutral-tertiary)',
        height: 'var(--dim-size-800, 40px)',
      }}
    />
    <span style={PRINT_LABEL_STYLE}>({name || '.................................................'})</span>
    <span style={PRINT_LABEL_STYLE}>{role}</span>
    {note ? <span style={PRINT_LABEL_STYLE}>{note}</span> : null}
  </div>
);

/* กรอบกระดาษ A4 ที่ทุกแผ่นใช้ร่วมกัน */
export const PrintSheetFrame = ({ children }) => (
  <div
    className='mih-print-sheet flex flex-col w-full'
    style={{
      gap: 'var(--dim-space-300, 12px)',
      background: 'var(--surface-card-100)',
      borderRadius: 'var(--dim-radius-400, 12px)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
      paddingTop: 'var(--dim-space-600, 24px)',
      paddingRight: 'var(--dim-space-600, 24px)',
      paddingBottom: 'var(--dim-space-600, 24px)',
      paddingLeft: 'var(--dim-space-600, 24px)',
    }}
  >
    {children}
  </div>
);

/* ตารางรายการคำสั่งบนแผ่นพิมพ์ — ใช้ <table> จริง (ไม่ใช่ <Table> ของ DS)
   เพราะต้องอาศัย thead ซ้ำหัวตารางตอนขึ้นหน้าใหม่ ซึ่งเป็นพฤติกรรมของ
   ตาราง HTML ล้วน ๆ ที่ component ของ DS ไม่ได้ออกแบบมาให้ */
export const PrintTable = ({ columns, rows, emptyText = 'ไม่มีรายการ' }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
    <thead>
      <tr>
        {columns.map((c) => (
          <th
            key={c.key}
            style={{
              ...PRINT_LABEL_STYLE,
              textAlign: 'left',
              borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-tertiary)',
              paddingTop: 'var(--dim-space-200, 8px)',
              paddingBottom: 'var(--dim-space-200, 8px)',
              paddingRight: 'var(--dim-space-200, 8px)',
              width: c.width,
            }}
          >
            {c.header}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.length === 0 ? (
        <tr>
          <td colSpan={columns.length} style={{ ...PRINT_LABEL_STYLE, paddingTop: 'var(--dim-space-300, 12px)' }}>
            {emptyText}
          </td>
        </tr>
      ) : rows.map((r, i) => (
        <tr key={r.key || i}>
          {columns.map((c) => (
            <td
              key={c.key}
              style={{
                ...PRINT_VALUE_STYLE,
                verticalAlign: 'top',
                borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
                paddingTop: 'var(--dim-space-200, 8px)',
                paddingBottom: 'var(--dim-space-200, 8px)',
                paddingRight: 'var(--dim-space-200, 8px)',
              }}
            >
              {c.render ? c.render(r, i) : r[c.key]}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

export default PrintSheetFrame;
