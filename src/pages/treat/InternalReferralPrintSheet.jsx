import React from 'react';
import Barcode128 from '@/components/lab/Barcode128';
import {
  PrintSheetFrame, PrintBlock, PrintCell, PrintSignatureLine,
  PRINT_LABEL_STYLE, PRINT_VALUE_STYLE, PRINT_TITLE_STYLE, usePrintSheet,
} from '@/pages/treat/printKit';
import { centerMeta, internalDestinationMeta } from '@/data/treatmentRefer';

/* PHCIS | CPOE §1.5.8.3 — ใบส่งต่อภายในหน่วยงาน (แบบมอบหมายงาน).
   ต่างจากใบส่งต่อภายนอกตรงที่ไม่มีสถานพยาบาลปลายทาง/สิทธิเรียกเก็บ แต่มี
   ผู้รับมอบหมาย · กำหนดวันเยี่ยม/วันนัด · เป้าหมายการติดตาม และช่องเซ็น
   "ผู้รับมอบหมาย" แทน "ผู้รับบริการ" ตามคู่มือ HCIS §2.1.17 / §2.1.19. */

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

const InternalReferralPrintSheet = ({ row, copies = 1 }) => {
  usePrintSheet({ styleId: 'mih-internal-refer-print-style', bodyClass: 'mih-printing-internal-refer' });
  if (!row) return null;

  const from = centerMeta(row.fromCenter);
  const dest = internalDestinationMeta(row.internalDestination);

  return (
    <PrintSheetFrame>
      <header className='flex items-start justify-between w-full mih-print-keep' style={{ gap: 'var(--dim-space-400, 16px)' }}>
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={PRINT_TITLE_STYLE}>ใบส่งต่อภายในหน่วยงาน (Internal Referral / งานเยี่ยมบ้าน)</span>
          <span style={PRINT_LABEL_STYLE}>{from?.label || 'ศูนย์บริการสาธารณสุข'} · สำนักอนามัย กรุงเทพมหานคร</span>
          <span style={PRINT_LABEL_STYLE}>โทร. {from?.phone || '—'} · โทรสาร {from?.fax || '—'}</span>
        </div>
        <div className='flex flex-col items-end shrink-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={{ ...PRINT_VALUE_STYLE, fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))' }}>
            {row.referNo}
          </span>
          <Barcode128 value={row.referNo} height={36} />
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
        <PrintCell label='ที่อยู่สำหรับติดตาม / ออกเยี่ยม' value={addressText(row.patientAddress)} minWidth={0} />
      </PrintBlock>

      <PrintBlock title='๒. หน่วยงานปลายทางภายในและการมอบหมาย'>
        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <PrintCell label='ส่งจาก' value={from?.label} flex={2} />
          <PrintCell label='หน่วยงานปลายทาง' value={dest?.label} flex={2} />
        </div>
        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <PrintCell label='สังกัดหน่วยงานปลายทาง' value={dest?.unit} flex={2} />
          <PrintCell label='ผู้รับมอบหมาย' value={row.assignee} flex={2} />
          <PrintCell label={dest?.dueLabel || 'กำหนดวันเยี่ยม / วันนัด'} value={row.dueDate} />
        </div>
      </PrintBlock>

      <PrintBlock title='๓. ข้อมูลทางคลินิกและเป้าหมายการติดตาม'>
        <PrintCell label='ประวัติการเจ็บป่วย' value={row.history} minWidth={0} />
        <PrintCell label='อาการสำคัญ / สภาพปัจจุบัน' value={row.symptom} minWidth={0} />
        <PrintCell label='การรักษาที่ให้ไปแล้ว' value={row.treatmentGiven} minWidth={0} />
        <PrintCell label='เหตุผลที่ส่งต่อภายใน' value={row.requirement} minWidth={0} />
        <PrintCell label='เป้าหมายการติดตาม' value={row.followUpGoal} minWidth={0} />
        {row.note ? <PrintCell label='หมายเหตุเพิ่มเติม' value={row.note} minWidth={0} /> : null}
      </PrintBlock>

      {row.status === 'cancelled' ? (
        <span style={{ ...PRINT_VALUE_STYLE, color: 'var(--text-alert-error, #B91C1C)' }}>
          ** ใบส่งต่อฉบับนี้ถูกยกเลิกเมื่อ {row.cancelledAt || '—'} — เหตุผล: {row.cancelReason || '—'} **
        </span>
      ) : null}

      <div
        className='flex flex-wrap items-end justify-around w-full'
        style={{ gap: 'var(--dim-space-500, 20px)', marginTop: 'var(--dim-space-600, 24px)' }}
      >
        <PrintSignatureLine role='แพทย์ / ผู้ส่งต่อภายใน' name={row.sender} />
        <PrintSignatureLine
          role='ผู้รับมอบหมาย'
          name={row.assignee}
          note={row.assignmentAcceptedAt ? `ตอบรับงานเมื่อ ${row.assignmentAcceptedAt}` : 'ลงชื่อเมื่อรับงาน'}
        />
      </div>

      <span style={{ ...PRINT_LABEL_STYLE, marginTop: 'var(--dim-space-300, 12px)' }}>
        วันที่มอบหมาย {row.assignedAt || row.sentDate || '—'} · ออกโดย {row.createdBy || '—'} ·
        จำนวนครั้งที่พิมพ์ {row.printCount || 0} ครั้ง
      </span>
    </PrintSheetFrame>
  );
};

export default InternalReferralPrintSheet;
