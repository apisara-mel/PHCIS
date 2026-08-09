import React from 'react';
import Barcode128 from '@/components/lab/Barcode128';
import {
  PrintSheetFrame, PrintBlock, PrintCell, PrintSignatureLine,
  PRINT_LABEL_STYLE, PRINT_VALUE_STYLE, PRINT_TITLE_STYLE, usePrintSheet,
} from '@/pages/treat/printKit';
import {
  facilityMeta, centerMeta, COMMUNICABLE_NOTIFY_OPTIONS,
} from '@/data/treatmentRefer';

/* PHCIS | EMR §1.4.6.1 — ใบส่งตัวสำหรับพิมพ์ (แบบ ศบส. ตามคู่มือ HCIS
   §2.5.1). แผ่นนี้เคยเป็นเจ้าของกฎ @media print + Cell/Block/SignatureLine
   ของตัวเอง ตอนนี้ย้ายมาใช้ `printKit` ชุดเดียวกับใบส่งต่อภายใน / ใบคำขอ
   Lab / ใบคำขอ X-ray แล้ว — กฎการพิมพ์ (A4 12mm, thead ซ้ำหัวตาราง,
   .mih-print-keep) จึงมีที่เดียว ไม่ต้องดูแล 2 ชุดอีกต่อไป.

   ข้อจำกัดที่ต้องรายงานตามจริง: ไม่มี PDF engine ฝั่ง server — "พิมพ์" /
   "บันทึกเป็น PDF" คือ window.print() + ปลายทาง Save as PDF ของเบราว์เซอร์
   (printKit.printWithFilename ตั้งชื่อไฟล์ให้ผ่าน document.title เท่านั้น). */

const addressText = (a = {}) => [
  a.houseNo ? `เลขที่ ${a.houseNo}` : '',
  a.moo && a.moo !== '-' ? `หมู่ ${a.moo}` : '',
  a.soi ? `ซอย${a.soi}` : '',
  a.road ? `ถนน${a.road}` : '',
  a.subDistrict ? `แขวง${a.subDistrict}` : '',
  a.district ? `เขต${a.district}` : '',
  a.province || '',
  a.zipcode || '',
].filter(Boolean).join(' ') || '—';

const ReferralPrintSheet = ({ row, copies = 1 }) => {
  usePrintSheet({ styleId: 'mih-refer-print-style', bodyClass: 'mih-printing-refer' });
  if (!row) return null;

  const to = facilityMeta(row.toFacility);
  const from = centerMeta(row.fromCenter);
  const notify = COMMUNICABLE_NOTIFY_OPTIONS.find((o) => o.value === row.communicableNotify);
  /* ใบที่ยังไม่ได้บันทึกจะยังไม่มีเลขที่ — ห้ามยัดข้อความไทยลงบาร์โค้ด
     (Barcode128 แปลงอักษรนอก ASCII เป็นช่องว่าง จะสแกนได้เป็นค่าว่าง) */
  const hasReferNo = !!String(row.referNo || '').trim();

  return (
    <PrintSheetFrame>
      {/* Masthead */}
      <header className='flex items-start justify-between w-full mih-print-keep' style={{ gap: 'var(--dim-space-400, 16px)' }}>
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={PRINT_TITLE_STYLE}>แบบส่งต่อผู้รับบริการ (Referral Form)</span>
          <span style={PRINT_LABEL_STYLE}>{from?.label || 'ศูนย์บริการสาธารณสุข'} · สำนักอนามัย กรุงเทพมหานคร</span>
          <span style={PRINT_LABEL_STYLE}>โทร. {from?.phone || '—'} · โทรสาร {from?.fax || '—'}</span>
        </div>
        <div className='flex flex-col items-end shrink-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={{ ...PRINT_VALUE_STYLE, fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))' }}>
            {hasReferNo ? row.referNo : 'ยังไม่ออกเลขที่'}
          </span>
          {hasReferNo
            ? <Barcode128 value={row.referNo} height={36} />
            : <span style={PRINT_LABEL_STYLE}>บันทึกร่างก่อน ระบบจึงออกเลขที่และบาร์โค้ดให้</span>}
          {copies > 1 ? <span style={PRINT_LABEL_STYLE}>พิมพ์ {copies} ชุด</span> : null}
        </div>
      </header>

      <PrintBlock title='๑. ข้อมูลผู้รับบริการ'>
        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <PrintCell label='ชื่อ - นามสกุล' value={row.name} flex={2} />
          <PrintCell label='HN' value={row.hn} />
          <PrintCell label='เลขประจำตัวประชาชน' value={row.cid} />
          <PrintCell label='สิทธิการรักษา' value={`${row.rights || '—'}${row.rightsExpired ? ' (สิทธิหมดอายุ)' : ''}`} />
          <PrintCell label='โทรศัพท์' value={row.patientPhone} />
        </div>
        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <PrintCell label='ที่อยู่' value={addressText(row.patientAddress)} flex={3} minWidth={280} />
          <PrintCell label='วันที่รับบริการครั้งล่าสุด' value={row.lastVisitDate} />
        </div>
      </PrintBlock>

      <PrintBlock title='๒. สถานพยาบาลต้นทาง / ปลายทาง'>
        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <PrintCell label='ส่งจาก' value={from?.label} flex={2} />
          <PrintCell label='ศบส. ที่เรียกเก็บ' value={centerMeta(row.billingCenter)?.label} flex={2} />
        </div>
        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <PrintCell label='ส่งไปยัง' value={to?.label || row.toFacilityOther} flex={2} />
          <PrintCell label='โทรศัพท์ปลายทาง' value={to?.phone} />
          <PrintCell label='ใบส่งต่อมีอายุถึง' value={row.validUntil} />
        </div>
      </PrintBlock>

      <PrintBlock title='๓. ข้อมูลทางคลินิก'>
        <PrintCell label='ประวัติการเจ็บป่วย' value={row.history} minWidth={0} />
        <PrintCell label='อาการสำคัญ / อาการปัจจุบัน' value={row.symptom} minWidth={0} />
        <PrintCell label='ผลการตรวจทางห้องปฏิบัติการ / รังสีวิทยา' value={row.labResult} minWidth={0} />
        <PrintCell label='การรักษาที่ให้ไปแล้ว' value={row.treatmentGiven} minWidth={0} />
        <PrintCell label='เหตุผลที่ส่งต่อ / สิ่งที่ต้องการให้ช่วยเหลือ' value={row.requirement} minWidth={0} />
        <PrintCell label='หมายเหตุโรคติดต่อที่ต้องแจ้ง' value={notify?.label} minWidth={0} />
        {row.note ? <PrintCell label='หมายเหตุเพิ่มเติม' value={row.note} minWidth={0} /> : null}
      </PrintBlock>

      <div
        className='flex flex-wrap items-end justify-around w-full'
        style={{ gap: 'var(--dim-space-500, 20px)', marginTop: 'var(--dim-space-600, 24px)' }}
      >
        <PrintSignatureLine role='แพทย์ผู้ส่งต่อ' name={row.sender} />
        <PrintSignatureLine role='ผู้รับบริการ / ผู้แทนโดยชอบธรรม' name={row.name} />
      </div>

      <span style={{ ...PRINT_LABEL_STYLE, marginTop: 'var(--dim-space-300, 12px)' }}>
        วันที่ส่ง {row.sentDate || '—'} · ออกโดย {row.createdBy || '—'} · จำนวนครั้งที่พิมพ์ {row.printCount || 0} ครั้ง
      </span>
    </PrintSheetFrame>
  );
};

export default ReferralPrintSheet;
