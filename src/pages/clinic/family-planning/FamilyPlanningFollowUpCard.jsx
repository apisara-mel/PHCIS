import React from 'react';
import { createPortal } from 'react-dom';
import { formatFpDate } from '@/data/familyPlanningVisits';

/* FamilyPlanningFollowUpCard — "บัตรติดตามวางแผนครอบครัว" (คู่มือระบบงาน
   คลินิกส่งเสริมสุขภาพ วางแผนครอบครัว หน้า 2-8/2-9).

   ใช้ 2 ที่: ตัวอย่างก่อนพิมพ์ในหน้าบันทึก (ขั้นตอนที่ 7) และปุ่มพิมพ์บัตร
   ในหน้าทะเบียนผู้รับบริการ — พิมพ์ผ่าน `window.print()` ล้วน ๆ ไม่พึ่ง PDF
   library ตาม pattern เดียวกับ PharmacyLabelPrint / LabSpecimenLabel:

     • `preview` = แสดงบนจอ (ในตัวอย่างก่อนพิมพ์ของ Popup)
     • ไม่ใส่ `preview` = render ผ่าน portal ไปเป็นลูกตรงของ <body> พร้อม
       class `.mih-fp-card-print-only` ซึ่งซ่อนบนจอ และใน @media print จะ
       ซ่อนลูกอื่นทั้งหมดของ body ให้เหลือเฉพาะบัตร
     • stylesheet ฉีดครั้งเดียวตอน module load (idempotent — HMR ไม่ทิ้ง
       <style> ค้าง) ตามกติกาใน CLAUDE.md */

if (typeof document !== 'undefined' && !document.getElementById('mih-fp-card-print-style')) {
  const css = document.createElement('style');
  css.id = 'mih-fp-card-print-style';
  css.textContent = `
    .mih-fp-card-print-only { display: none; }
    @media print {
      body > *:not(.mih-fp-card-print-only) { display: none !important; }
      .mih-fp-card-print-only { display: block !important; }
    }
  `;
  document.head.appendChild(css);
}

const cellBase = {
  paddingTop: 'var(--dim-space-200, 8px)',
  paddingBottom: 'var(--dim-space-200, 8px)',
  paddingLeft: 'var(--dim-space-300, 12px)',
  paddingRight: 'var(--dim-space-300, 12px)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-tertiary, #E2E4E6)',
  fontSize: 'var(--type-size-sm)',
  color: 'var(--text-content-default, #363B3F)',
  textAlign: 'left',
};

const InfoRow = ({ label, children }) => (
  <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
    <span style={{ width: 190, flexShrink: 0, fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>{label}</span>
    <span className='min-w-0' style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)', fontWeight: 'var(--type-weight-medium)' }}>
      {children}
    </span>
  </div>
);

const CardBody = ({ card, centerName }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--dim-space-400, 16px)',
      paddingTop: 'var(--dim-space-600, 24px)',
      paddingBottom: 'var(--dim-space-600, 24px)',
      paddingLeft: 'var(--dim-space-600, 24px)',
      paddingRight: 'var(--dim-space-600, 24px)',
      borderRadius: 'var(--dim-radius-400, 12px)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-tertiary, #E2E4E6)',
      background: 'var(--surface-card-100, #FFFFFF)',
    }}
  >
    <div className='flex flex-col items-center w-full' style={{ gap: 'var(--dim-space-100, 4px)' }}>
      <span style={{ fontSize: 'var(--type-size-base)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default, #363B3F)' }}>
        บัตรติดตามวางแผนครอบครัว
      </span>
      <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>{centerName}</span>
    </div>

    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
      <InfoRow label='เลขที่วางแผนครอบครัว'>{card.fpNumber}</InfoRow>
      <InfoRow label='ชื่อ-สกุล'>{card.name}</InfoRow>
      <InfoRow label='HN'>{card.hn}</InfoRow>
      <InfoRow label='ชนิดบริการ'>{card.services}</InfoRow>
      <InfoRow label='วันเริ่มบริการครั้งแรก'>{formatFpDate(card.firstServiceDate)}</InfoRow>
      <InfoRow label='นัดหมายครั้งถัดไป'>{card.nextAppointment}</InfoRow>
    </div>

    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ ...cellBase, background: 'var(--surface-card-quaternary, #F9FBFB)', width: 72 }}>ครั้งที่</th>
          <th style={{ ...cellBase, background: 'var(--surface-card-quaternary, #F9FBFB)' }}>วันที่รับบริการ</th>
          <th style={{ ...cellBase, background: 'var(--surface-card-quaternary, #F9FBFB)' }}>บริการที่ได้รับ</th>
          <th style={{ ...cellBase, background: 'var(--surface-card-quaternary, #F9FBFB)' }}>ผู้ให้บริการ</th>
        </tr>
      </thead>
      <tbody>
        {(card.rows || []).length > 0 ? (
          card.rows.map((r) => (
            <tr key={`fp-card-${r.no}`}>
              <td style={cellBase}>{r.no}</td>
              <td style={cellBase}>{formatFpDate(r.date)}</td>
              <td style={cellBase}>{r.service}</td>
              <td style={cellBase}>{r.by}</td>
            </tr>
          ))
        ) : (
          /* บัตรเปล่าสำหรับกรอกด้วยมือ — คู่มือ หน้า 2-9 พิมพ์บัตรได้แม้ยัง
             ไม่มีประวัติ เพื่อให้เจ้าหน้าที่กรอกครั้งต่อไปลงบนบัตร */
          [1, 2, 3, 4, 5, 6].map((n) => (
            <tr key={`fp-card-blank-${n}`}>
              <td style={cellBase}>{n}</td>
              <td style={{ ...cellBase, height: 28 }} />
              <td style={cellBase} />
              <td style={cellBase} />
            </tr>
          ))
        )}
      </tbody>
    </table>

    <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
      กรุณานำบัตรนี้มาแสดงทุกครั้งที่มารับบริการ · หากมีอาการผิดปกติ เช่น ปวดศีรษะรุนแรง
      ตาพร่ามัว เจ็บแน่นหน้าอก ปวดน่อง ให้มาพบแพทย์ทันทีโดยไม่ต้องรอวันนัด
    </span>
  </div>
);

const FamilyPlanningFollowUpCard = ({
  card,
  centerName = 'ศูนย์บริการสาธารณสุข สำนักอนามัย กรุงเทพมหานคร',
  preview = false,
}) => {
  if (!card) return null;
  if (preview) return <CardBody card={card} centerName={centerName} />;
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className='mih-fp-card-print-only'>
      <CardBody card={card} centerName={centerName} />
    </div>,
    document.body,
  );
};

export default FamilyPlanningFollowUpCard;
