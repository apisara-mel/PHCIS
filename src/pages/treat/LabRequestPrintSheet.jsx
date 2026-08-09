import React from 'react';
import Barcode128 from '@/components/lab/Barcode128';
import {
  PrintSheetFrame, PrintBlock, PrintCell, PrintSignatureLine, PrintTable,
  PRINT_LABEL_STYLE, PRINT_VALUE_STYLE, PRINT_TITLE_STYLE, usePrintSheet,
} from '@/pages/treat/printKit';
import { LAB_TESTS, LAB_GROUP_LABEL } from '@/data/labCatalog';
import { centerMeta } from '@/data/treatmentRefer';
import { TREATMENT_DOCTOR_OPTIONS } from '@/data/treatmentVisits';
import { CURRENT_CLINICIAN } from '@/data/treatmentAudit';

/* PHCIS | CPOE §1.5.10.2 — ใบคำขอตรวจทางห้องปฏิบัติการ (แผ่นพิมพ์ A4 จริง).

   เดิมขั้นตอนศูนย์เอกสารมีแค่ตัวเลือกเทมเพลต + preview รวม ไม่มีแผ่นกระดาษ
   ของใบคำขอออกมา. แผ่นนี้ดึงรายการที่สั่งจริงจาก `form.labs` มาเรียงเป็น
   ตารางพร้อมสิ่งส่งตรวจ (หลอด) และสรุปการเตรียมตัวก่อนตรวจ.

   กติกาที่ต้องคงไว้:
     • ไม่มีรายการสั่ง → ผู้เรียกต้องเตือนก่อนพิมพ์ (§1.4.6.3) แผ่นนี้เอง
       ก็ขึ้นข้อความ "ไม่มีรายการ" ไม่ปล่อยหน้าเปล่า
     • เกิน 1 หน้า A4 → PrintTable ใช้ <thead> จริง หัวตารางจึงซ้ำอัตโนมัติ
     • ผลเป็นข้อมูลลับ → แผ่นพิมพ์เตือนระดับชั้นความลับไว้ที่หัวกระดาษ */

const tubeLabel = (test) => {
  if (!test) return '—';
  const t = test.tubeKey ? String(test.tubeKey).toUpperCase() : '';
  const n = test.tubeCount || 1;
  return t ? `${t} × ${n}` : `${n} หลอด`;
};

/* สรุปการเตรียมตัวก่อนตรวจจาก fastingHours ของรายการที่สั่ง —
   หยิบค่าที่เข้มที่สุด (งดนานที่สุด) มาเป็นคำสั่งหลัก */
export const fastingSummary = (tests) => {
  const hours = tests.map((t) => t?.fastingHours || 0);
  const max = hours.length ? Math.max(...hours) : 0;
  if (max <= 0) return 'ไม่ต้องงดอาหารและเครื่องดื่มก่อนตรวจ';
  return `ต้องงดอาหารและเครื่องดื่ม (ยกเว้นน้ำเปล่า) อย่างน้อย ${max} ชั่วโมงก่อนเจาะเลือด`;
};

const LabRequestPrintSheet = ({
  row, patient = {}, form = {}, copies = 1, confidential = false,
}) => {
  usePrintSheet({ styleId: 'mih-lab-request-print-style', bodyClass: 'mih-printing-lab-request' });

  const header = form?.labRequest || {};
  const orders = (form?.labs || []).filter((r) => !r.cancelledAt);
  const tests = orders.map((o) => LAB_TESTS.find((t) => t.id === o.testId)).filter(Boolean);
  const from = centerMeta(header.fromCenter || 'center-4');
  const reqNo = row?.docNo || header.requestNo || '';
  /* ชื่อแพทย์ผู้สั่ง: ฟอร์มเก็บเป็น "คีย์" (`form.orderingDoctor` เช่น 'somying')
     ต้องแปลงเป็นชื่อจริงก่อนพิมพ์ ไม่งั้นช่องนี้และช่องลงนามจะว่างเปล่า */
  const orderingDoctor = header.orderingDoctor
    || TREATMENT_DOCTOR_OPTIONS.find((o) => o.value === form.orderingDoctor)?.label
    || row?.issuedBy
    || CURRENT_CLINICIAN.name;

  const columns = [
    { key: 'no', header: 'ลำดับ', width: '8%', render: (r, i) => i + 1 },
    { key: 'code', header: 'รหัส', width: '14%' },
    { key: 'name', header: 'รายการตรวจ', width: '38%' },
    { key: 'group', header: 'กลุ่มงาน', width: '20%' },
    { key: 'tube', header: 'สิ่งส่งตรวจ', width: '20%' },
  ];

  const tableRows = orders.map((o) => {
    const t = LAB_TESTS.find((x) => x.id === o.testId);
    return {
      key: o.testId,
      code: t?.code || '—',
      name: t ? `${t.nameEn}${t.nameTh ? ` (${t.nameTh})` : ''}` : o.testId,
      group: LAB_GROUP_LABEL?.[t?.group] || t?.group || '—',
      tube: tubeLabel(t),
    };
  });

  return (
    <PrintSheetFrame>
      <header className='flex items-start justify-between w-full mih-print-keep' style={{ gap: 'var(--dim-space-400, 16px)' }}>
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={PRINT_TITLE_STYLE}>ใบคำขอตรวจทางห้องปฏิบัติการ (Laboratory Request)</span>
          <span style={PRINT_LABEL_STYLE}>{from?.label || 'ศูนย์บริการสาธารณสุข'} · สำนักอนามัย กรุงเทพมหานคร</span>
          <span style={PRINT_LABEL_STYLE}>โทร. {from?.phone || '—'} · โทรสาร {from?.fax || '—'}</span>
        </div>
        <div className='flex flex-col items-end shrink-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={{ ...PRINT_VALUE_STYLE, fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))' }}>
            {reqNo || 'ยังไม่ออกเลขที่'}
          </span>
          {/* ห้ามยัดข้อความไทยลง Barcode128 (อักขระนอก ASCII กลายเป็นช่องว่าง
              → บาร์โค้ดสแกนได้เป็นค่าว่างบนเอกสารที่ใช้จริง) */}
          {reqNo
            ? <Barcode128 value={reqNo} height={36} />
            : <span style={PRINT_LABEL_STYLE}>ระบบจะออกเลขที่และบาร์โค้ดเมื่อมีรายการสั่งตรวจ</span>}
          {copies > 1 ? <span style={PRINT_LABEL_STYLE}>พิมพ์ {copies} ชุด</span> : null}
        </div>
      </header>

      {confidential ? (
        <span style={{ ...PRINT_VALUE_STYLE, color: 'var(--text-alert-error, #B91C1C)' }}>
          ** เอกสารชั้นความลับ — ผลการตรวจของผู้รับบริการรายนี้ถูกทำเครื่องหมายเป็นข้อมูลลับ
          ห้ามเปิดเผยต่อผู้ไม่มีสิทธิ์ และต้องส่งมอบด้วยมือเท่านั้น **
        </span>
      ) : null}

      <PrintBlock title='๑. ข้อมูลผู้รับบริการ'>
        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <PrintCell label='ชื่อ - นามสกุล' value={patient.name || `${patient.firstNameTh || ''} ${patient.lastNameTh || ''}`.trim()} flex={2} />
          <PrintCell label='HN' value={patient.hn} />
          <PrintCell label='เพศ / อายุ' value={[patient.gender, patient.age ? `${patient.age} ปี` : ''].filter(Boolean).join(' · ')} />
          <PrintCell label='สิทธิการรักษา' value={patient.rights} />
        </div>
        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <PrintCell label='วัน-เวลาที่บันทึกขอ' value={header.requestedAt} minWidth={200} />
          <PrintCell label='แพทย์ผู้สั่งตรวจ' value={orderingDoctor} minWidth={220} />
          <PrintCell label='ความเร่งด่วน' value={header.urgency === 'stat' ? 'ด่วนมาก (STAT)' : header.urgency === 'urgent' ? 'ด่วน' : 'ปกติ (Routine)'} />
        </div>
        <PrintCell label='การวินิจฉัย / ข้อบ่งชี้ในการส่งตรวจ' value={header.indication || form.diagnosisNote} minWidth={0} />
      </PrintBlock>

      <PrintBlock title={`๒. รายการที่ขอตรวจ (${orders.length} รายการ)`}>
        <PrintTable
          columns={columns}
          rows={tableRows}
          emptyText='ยังไม่มีรายการตรวจในใบคำขอนี้ — กลับไปสั่งตรวจในขั้นตอนสั่งการรักษาก่อนพิมพ์'
        />
      </PrintBlock>

      <PrintBlock title='๓. การเตรียมตัวก่อนตรวจ'>
        <PrintCell label='คำแนะนำสำหรับผู้รับบริการ' value={fastingSummary(tests)} minWidth={0} />
        <PrintCell
          label='ข้อควรปฏิบัติเพิ่มเติม'
          value={header.preparationNote
            || 'นำบัตรประจำตัวประชาชนและใบคำขอฉบับนี้มาแสดงที่จุดเจาะเลือด · แจ้งเจ้าหน้าที่ทุกครั้งหากกำลังตั้งครรภ์หรือรับประทานยาต้านการแข็งตัวของเลือด'}
          minWidth={0}
        />
      </PrintBlock>

      <div
        className='flex flex-wrap items-end justify-around w-full'
        style={{ gap: 'var(--dim-space-500, 20px)', marginTop: 'var(--dim-space-600, 24px)' }}
      >
        <PrintSignatureLine
          role='แพทย์ผู้สั่งตรวจ'
          name={orderingDoctor}
          note={header.requestedAt ? `สั่งเมื่อ ${header.requestedAt}` : ''}
        />
        <PrintSignatureLine role='เจ้าหน้าที่ผู้รับสิ่งส่งตรวจ' note='ลงชื่อเมื่อรับสิ่งส่งตรวจ' />
      </div>

      <span style={{ ...PRINT_LABEL_STYLE, marginTop: 'var(--dim-space-300, 12px)' }}>
        ออกโดย {row?.issuedBy || '—'} · จำนวนครั้งที่พิมพ์ {row?.printCount || 0} ครั้ง
      </span>
    </PrintSheetFrame>
  );
};

export default LabRequestPrintSheet;
