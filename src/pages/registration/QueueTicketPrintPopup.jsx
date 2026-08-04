import React from 'react';
import { createPortal } from 'react-dom';
import Popup from '@/components/popup/Popup';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { printRegistrationDoc } from './registrationPrint';

/* MIH QueueTicketPrintPopup — TOR 1.1.1.9 (kiosk-fallback half):
   "กรณีตู้ Kiosk ขัดข้อง เจ้าหน้าที่พิมพ์บัตรคิวแทนได้". Small preview
   modal + @media-print template (คิว / HN / วันเวลา / จุดบริการ) using the
   registrationPrint.js visibility switch (labPrintSettings pattern).

   Module-owned (src/pages/registration) — not a DS popup; report via the
   manifest if it should ever be promoted. */

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

const nowStampLabel = () => {
  const d = new Date();
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543} · ${hm} น.`;
};

const SERVICE_POINT = 'งานเวชระเบียน (ห้องบัตร) · ศูนย์บริการสาธารณสุข';

/* The ticket itself — reused for the on-screen preview and the print
   root, so what the staff sees is exactly what prints. */
const TicketSheet = ({ row, stamp, forPrint = false }) => (
  <div
    className='mih-reg-print-sheet'
    style={{
      width: forPrint ? '72mm' : 280,
      marginLeft: 'auto',
      marginRight: 'auto',
      background: 'var(--surface-card-100, #FFFFFF)',
      border: 'var(--dim-stroke-100, 1px) dashed var(--border-neutral-tertiary, #E2E4E6)',
      borderRadius: forPrint ? 0 : 'var(--dim-radius-400, 12px)',
      paddingTop: 'var(--dim-space-500, 20px)',
      paddingBottom: 'var(--dim-space-500, 20px)',
      paddingLeft: 'var(--dim-space-400, 16px)',
      paddingRight: 'var(--dim-space-400, 16px)',
      textAlign: 'center',
      fontFamily: 'var(--type-family-body)',
      color: 'var(--text-content-default, #363B3F)',
    }}
  >
    <div style={{
      fontSize: 'var(--type-size-sm, 14px)',
      fontWeight: 'var(--type-weight-bold, 700)',
      lineHeight: 1.5,
    }}>
      บัตรคิว — ระบบงานเวชระเบียน
    </div>
    <div style={{
      fontSize: 'var(--type-size-xs, 12px)',
      color: 'var(--text-content-tertiary, #858C92)',
      lineHeight: 1.5,
    }}>
      พิมพ์โดยเจ้าหน้าที่ (ตู้ Kiosk ขัดข้อง)
    </div>
    <div style={{
      fontSize: 'var(--type-size-3xl, 30px)',
      fontWeight: 'var(--type-weight-bold, 700)',
      lineHeight: 1.3,
      marginTop: 'var(--dim-space-300, 12px)',
      marginBottom: 'var(--dim-space-300, 12px)',
    }}>
      {row?.queue || '—'}
    </div>
    <div style={{ fontSize: 'var(--type-size-sm, 14px)', lineHeight: 1.6 }}>
      HN: {row?.hn || '— (ผู้รับบริการใหม่)'}
    </div>
    <div style={{ fontSize: 'var(--type-size-sm, 14px)', lineHeight: 1.6 }}>
      {stamp}
    </div>
    <div style={{
      fontSize: 'var(--type-size-xs, 12px)',
      color: 'var(--text-content-secondary, #636B72)',
      lineHeight: 1.5,
      marginTop: 'var(--dim-space-200, 8px)',
    }}>
      จุดบริการ: {SERVICE_POINT}
    </div>
  </div>
);

const QueueTicketPrintPopup = ({ open, onClose, row }) => {
  const stamp = nowStampLabel();
  return (
    <>
      <Popup
        open={open}
        onClose={onClose}
        title='พิมพ์บัตรคิว (Kiosk ขัดข้อง)'
        subtitle='ตรวจสอบข้อมูลคิวก่อนสั่งพิมพ์ — เอกสารจะพิมพ์ตามตัวอย่างนี้'
        size='default'
        secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
        primaryAction={{
          label: 'พิมพ์บัตรคิว',
          onClick: () => printRegistrationDoc('queue-ticket'),
        }}
      >
        <div className='flex flex-col w-full items-center' style={{ gap: 'var(--dim-space-300)' }}>
          <ColorfulBadge style='orange' size='small' hierarchy='secondary'>
            โหมดสำรอง — ใช้เมื่อตู้ Kiosk ใช้งานไม่ได้
          </ColorfulBadge>
          <TicketSheet row={row} stamp={stamp} />
        </div>
      </Popup>

      {/* Print root — portalled to <body> so the @media-print body>* switch
          can isolate it from the app shell. */}
      {open && typeof document !== 'undefined' && createPortal(
        <div className='mih-reg-print-root mih-reg-print-queue-ticket'>
          <TicketSheet row={row} stamp={stamp} forPrint />
        </div>,
        document.body,
      )}
    </>
  );
};

export default QueueTicketPrintPopup;
