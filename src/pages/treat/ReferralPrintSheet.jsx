import React, { useEffect } from 'react';
import Barcode128 from '@/components/lab/Barcode128';
import {
  facilityMeta, centerMeta, COMMUNICABLE_NOTIFY_OPTIONS,
} from '@/data/treatmentRefer';

/* PHCIS | EMR §1.4.6.1 — ใบส่งตัวสำหรับพิมพ์ (แบบ ศบส. ตามคู่มือ HCIS
   §2.5.1). ใช้ pattern เดียวกับ XrayReportSheet: masthead + ตารางข้อมูล +
   SignatureLine + @media print ที่ซ่อน chrome ทุกอย่างนอกใบ.

   ข้อจำกัดที่ต้องรายงานตามจริง: ไม่มี PDF engine — การ "พิมพ์" คือ
   window.print() ผ่าน @media print เท่านั้น. */

const PRINT_STYLE_ID = 'mih-refer-print-style';
const PRINT_BODY_CLASS = 'mih-printing-refer';

/* Idempotent stylesheet injection (pattern เดียวกับ AISearch.jsx) เพื่อให้
   HMR แก้แล้วไม่ทิ้ง <style> เก่าค้างไว้.

   ทุกกฎถูก scope ด้วย `body.mih-printing-refer` และคลาสนั้นถูกใส่เฉพาะ
   ตอนใบส่งตัวยัง mount อยู่ — ไม่งั้น `body * { visibility: hidden }`
   จะค้างทั้ง SPA แล้วทำให้ window.print() ของศูนย์เอกสาร (ใบรับรองแพทย์ /
   Clinical Summary) พิมพ์ออกมาเป็นหน้าว่าง. */
const ensurePrintStyle = () => {
  if (typeof document === 'undefined') return;
  const prev = document.getElementById(PRINT_STYLE_ID);
  if (prev) prev.remove();
  const el = document.createElement('style');
  el.id = PRINT_STYLE_ID;
  el.textContent = `
@media print {
  body.${PRINT_BODY_CLASS} * { visibility: hidden !important; }
  body.${PRINT_BODY_CLASS} .mih-refer-sheet,
  body.${PRINT_BODY_CLASS} .mih-refer-sheet * { visibility: visible !important; }
  body.${PRINT_BODY_CLASS} .mih-refer-sheet {
    position: absolute !important;
    top: 0 !important; left: 0 !important;
    width: 100% !important;
    box-shadow: none !important;
    border: 0 !important;
  }
  body.${PRINT_BODY_CLASS} .mih-refer-noprint { display: none !important; }
  @page { size: A4 portrait; margin: 12mm; }
}
`;
  document.head.appendChild(el);
  document.body.classList.add(PRINT_BODY_CLASS);
};

const teardownPrintStyle = () => {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(PRINT_STYLE_ID);
  if (el) el.remove();
  document.body.classList.remove(PRINT_BODY_CLASS);
};

const LABEL = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs, 12px)',
  lineHeight: 1.5,
};

const VALUE = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm, 14px)',
  lineHeight: 1.6,
};

const Cell = ({ label, value, flex = 1, minWidth = 150 }) => (
  <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)', flex, minWidth }}>
    <span style={LABEL}>{label}</span>
    <span style={VALUE}>{value == null || value === '' ? '—' : value}</span>
  </div>
);

const Block = ({ title, children }) => (
  <section
    className='flex flex-col w-full'
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
        fontWeight: 'var(--type-weight-bold)',
        fontSize: 'var(--type-size-sm, 14px)',
        lineHeight: 1.5,
      }}
    >
      {title}
    </span>
    {children}
  </section>
);

const SignatureLine = ({ role, name }) => (
  <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-100, 4px)', minWidth: 220 }}>
    <div
      style={{
        width: '100%',
        borderBottom: 'var(--dim-stroke-100, 1px) dotted var(--border-neutral-tertiary)',
        height: 'var(--dim-size-800, 40px)',
      }}
    />
    <span style={LABEL}>({name || '.................................................'})</span>
    <span style={LABEL}>{role}</span>
  </div>
);

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
  useEffect(() => {
    ensurePrintStyle();
    return teardownPrintStyle;
  }, []);
  if (!row) return null;

  const to = facilityMeta(row.toFacility);
  const from = centerMeta(row.fromCenter);
  const notify = COMMUNICABLE_NOTIFY_OPTIONS.find((o) => o.value === row.communicableNotify);

  return (
    <div
      className='mih-refer-sheet flex flex-col w-full'
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
      {/* Masthead */}
      <header className='flex items-start justify-between w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span
            style={{
              color: 'var(--text-topic-primary-title)',
              fontFamily: 'var(--type-family-heading-content)',
              fontWeight: 'var(--type-weight-bold)',
              fontSize: 'var(--type-size-lg, 18px)',
              lineHeight: 1.4,
            }}
          >
            แบบส่งต่อผู้รับบริการ (Referral Form)
          </span>
          <span style={LABEL}>{from?.label || 'ศูนย์บริการสาธารณสุข'} · สำนักอนามัย กรุงเทพมหานคร</span>
          <span style={LABEL}>โทร. {from?.phone || '—'} · โทรสาร {from?.fax || '—'}</span>
        </div>
        <div className='flex flex-col items-end shrink-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={{ ...VALUE, fontWeight: 'var(--type-weight-bold)' }}>{row.referNo}</span>
          <Barcode128 value={row.referNo} height={36} />
          {copies > 1 ? <span style={LABEL}>พิมพ์ {copies} ชุด</span> : null}
        </div>
      </header>

      <Block title='๑. ข้อมูลผู้รับบริการ'>
        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <Cell label='ชื่อ - นามสกุล' value={row.name} flex={2} />
          <Cell label='HN' value={row.hn} />
          <Cell label='เลขประจำตัวประชาชน' value={row.cid} />
          <Cell label='สิทธิการรักษา' value={`${row.rights || '—'}${row.rightsExpired ? ' (สิทธิหมดอายุ)' : ''}`} />
          <Cell label='โทรศัพท์' value={row.patientPhone} />
        </div>
        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <Cell label='ที่อยู่' value={addressText(row.patientAddress)} flex={3} minWidth={280} />
          <Cell label='วันที่รับบริการครั้งล่าสุด' value={row.lastVisitDate} />
        </div>
      </Block>

      <Block title='๒. สถานพยาบาลต้นทาง / ปลายทาง'>
        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <Cell label='ส่งจาก' value={from?.label} flex={2} />
          <Cell label='ศบส. ที่เรียกเก็บ' value={centerMeta(row.billingCenter)?.label} flex={2} />
        </div>
        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <Cell label='ส่งไปยัง' value={to?.label || row.toFacilityOther} flex={2} />
          <Cell label='โทรศัพท์ปลายทาง' value={to?.phone} />
          <Cell label='ใบส่งต่อมีอายุถึง' value={row.validUntil} />
        </div>
      </Block>

      <Block title='๓. ข้อมูลทางคลินิก'>
        <Cell label='ประวัติการเจ็บป่วย' value={row.history} minWidth={0} />
        <Cell label='อาการสำคัญ / อาการปัจจุบัน' value={row.symptom} minWidth={0} />
        <Cell label='ผลการตรวจทางห้องปฏิบัติการ / รังสีวิทยา' value={row.labResult} minWidth={0} />
        <Cell label='การรักษาที่ให้ไปแล้ว' value={row.treatmentGiven} minWidth={0} />
        <Cell label='เหตุผลที่ส่งต่อ / สิ่งที่ต้องการให้ช่วยเหลือ' value={row.requirement} minWidth={0} />
        <Cell label='หมายเหตุโรคติดต่อที่ต้องแจ้ง' value={notify?.label} minWidth={0} />
        {row.note ? <Cell label='หมายเหตุเพิ่มเติม' value={row.note} minWidth={0} /> : null}
      </Block>

      <div
        className='flex flex-wrap items-end justify-around w-full'
        style={{ gap: 'var(--dim-space-500, 20px)', marginTop: 'var(--dim-space-600, 24px)' }}
      >
        <SignatureLine role='แพทย์ผู้ส่งต่อ' name={row.sender} />
        <SignatureLine role='ผู้รับบริการ / ผู้แทนโดยชอบธรรม' name={row.name} />
      </div>

      <span style={{ ...LABEL, marginTop: 'var(--dim-space-300, 12px)' }}>
        วันที่ส่ง {row.sentDate || '—'} · ออกโดย {row.createdBy || '—'} · จำนวนครั้งที่พิมพ์ {row.printCount || 0} ครั้ง
      </span>
    </div>
  );
};

export default ReferralPrintSheet;
