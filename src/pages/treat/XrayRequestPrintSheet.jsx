import React from 'react';
import Barcode128 from '@/components/lab/Barcode128';
import {
  PrintSheetFrame, PrintBlock, PrintCell, PrintSignatureLine, PrintTable,
  PRINT_LABEL_STYLE, PRINT_VALUE_STYLE, PRINT_TITLE_STYLE, usePrintSheet,
} from '@/pages/treat/printKit';
import {
  XRAY_EXAM_BY_ID, XRAY_VIEWS, getModality, getRegion,
} from '@/data/xrayCatalog';
import { centerMeta } from '@/data/treatmentRefer';
import { TREATMENT_DOCTOR_OPTIONS } from '@/data/treatmentVisits';
import { CURRENT_CLINICIAN } from '@/data/treatmentAudit';

/* PHCIS | CPOE §1.5.10.2 — ใบคำขอตรวจทางรังสีวิทยา (แผ่นพิมพ์ A4 จริง).

   ดึงรายการจาก `form.xrayOrders` ([{ examId, view, urgency }]) มาเรียงพร้อม
   ท่าถ่าย/ตำแหน่ง และรวมคำแนะนำการเตรียมตัวจากฟิลด์ `prep` ของแต่ละ exam.

   เฉพาะฝั่งรังสี: ต้องมีช่องคำถามการตั้งครรภ์ (ANC screening) บนแผ่นพิมพ์
   เสมอสำหรับผู้รับบริการเพศหญิงวัยเจริญพันธุ์ — เป็นข้อบังคับด้านความปลอดภัย
   จากรังสี ไม่ใช่ของตกแต่ง. */

const viewLabel = (key) => XRAY_VIEWS.find((v) => v.key === key)?.thai || key || '—';

const URGENCY_LABEL = {
  stat: 'ด่วนมาก (STAT)',
  urgent: 'ด่วน',
  routine: 'ปกติ (Routine)',
};

/* ผู้รับบริการหญิงอายุ 12–55 ปี ต้องคัดกรองการตั้งครรภ์ก่อนฉายรังสี */
export const needsPregnancyScreening = (patient = {}, exams = []) => {
  const female = /หญิง|female|^F$/i.test(String(patient.gender || ''));
  const age = Number(patient.age);
  const inRange = Number.isFinite(age) ? age >= 12 && age <= 55 : true;
  return (female && inRange) || exams.some((e) => e?.femaleScreening);
};

const XrayRequestPrintSheet = ({
  row, patient = {}, form = {}, copies = 1, confidential = false,
}) => {
  usePrintSheet({ styleId: 'mih-xray-request-print-style', bodyClass: 'mih-printing-xray-request' });

  const header = form?.xrayRequest || {};
  const orders = (form?.xrayOrders || []).filter((o) => !o.cancelledAt);
  const exams = orders.map((o) => XRAY_EXAM_BY_ID[o.examId]).filter(Boolean);
  const from = centerMeta(header.fromCenter || 'center-4');
  const reqNo = row?.docNo || header.requestNo || '';
  const screenPregnancy = needsPregnancyScreening(patient, exams);
  /* ชื่อแพทย์ผู้สั่ง: ฟอร์มเก็บเป็นคีย์ (`form.orderingDoctor`) ต้องแปลงเป็น
     ชื่อจริงก่อนพิมพ์ ไม่งั้นทั้งช่องข้อมูลและช่องลงนามจะว่าง */
  const orderingDoctor = header.orderingDoctor
    || TREATMENT_DOCTOR_OPTIONS.find((o) => o.value === form.orderingDoctor)?.label
    || row?.issuedBy
    || CURRENT_CLINICIAN.name;

  const columns = [
    { key: 'no', header: 'ลำดับ', width: '8%', render: (r, i) => i + 1 },
    { key: 'code', header: 'รหัส', width: '12%' },
    { key: 'name', header: 'รายการตรวจ', width: '34%' },
    { key: 'view', header: 'ท่าถ่าย / ตำแหน่ง', width: '24%' },
    { key: 'urgency', header: 'ความเร่งด่วน', width: '22%' },
  ];

  const tableRows = orders.map((o) => {
    const e = XRAY_EXAM_BY_ID[o.examId];
    return {
      key: `${o.examId}-${o.view || ''}`,
      code: e?.code || '—',
      name: e ? `${e.name}${e.nameEn ? ` (${e.nameEn})` : ''}` : o.examId,
      view: [viewLabel(o.view), getRegion(e)?.thai].filter(Boolean).join(' · '),
      urgency: URGENCY_LABEL[o.urgency] || URGENCY_LABEL.routine,
    };
  });

  /* รวมคำแนะนำการเตรียมตัวแบบไม่ซ้ำ */
  const prepList = [...new Set(exams.map((e) => e?.prep).filter(Boolean))];

  return (
    <PrintSheetFrame>
      <header className='flex items-start justify-between w-full mih-print-keep' style={{ gap: 'var(--dim-space-400, 16px)' }}>
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={PRINT_TITLE_STYLE}>ใบคำขอตรวจทางรังสีวิทยา (Radiology Request)</span>
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
          <PrintCell label='ชนิดเครื่องตรวจ' value={[...new Set(exams.map((e) => getModality(e)?.thai).filter(Boolean))].join(' · ')} minWidth={180} />
        </div>
        <PrintCell label='ข้อบ่งชี้ในการส่งตรวจ / ประวัติที่เกี่ยวข้อง' value={header.indication || form.diagnosisNote} minWidth={0} />
      </PrintBlock>

      <PrintBlock title={`๒. รายการที่ขอตรวจ (${orders.length} รายการ)`}>
        <PrintTable
          columns={columns}
          rows={tableRows}
          emptyText='ยังไม่มีรายการตรวจในใบคำขอนี้ — กลับไปสั่งตรวจในขั้นตอนสั่งการรักษาก่อนพิมพ์'
        />
      </PrintBlock>

      {/* ข้อบังคับด้านความปลอดภัยจากรังสี — ต้องถามก่อนฉายเสมอ */}
      {screenPregnancy ? (
        <PrintBlock title='๓. การคัดกรองการตั้งครรภ์ (ต้องกรอกก่อนฉายรังสี)'>
          <span style={PRINT_VALUE_STYLE}>
            ท่านกำลังตั้งครรภ์ หรือมีความเป็นไปได้ว่าอาจตั้งครรภ์หรือไม่?
          </span>
          <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-600, 24px)' }}>
            <span style={PRINT_VALUE_STYLE}>☐ ไม่ตั้งครรภ์</span>
            <span style={PRINT_VALUE_STYLE}>☐ ตั้งครรภ์ / อาจตั้งครรภ์</span>
            <span style={PRINT_VALUE_STYLE}>☐ ไม่แน่ใจ</span>
          </div>
          <PrintCell label='ประจำเดือนครั้งสุดท้าย (LMP)' value={header.lmp || '.........................................'} minWidth={0} />
          <span style={{ ...PRINT_LABEL_STYLE, color: 'var(--text-alert-error, #B91C1C)' }}>
            หากตั้งครรภ์หรือไม่แน่ใจ ต้องแจ้งเจ้าหน้าที่รังสีก่อนเข้ารับการตรวจทุกครั้ง
          </span>
        </PrintBlock>
      ) : null}

      <PrintBlock title={`${screenPregnancy ? '๔' : '๓'}. การเตรียมตัวก่อนตรวจ`}>
        {prepList.length > 0 ? (
          prepList.map((p, i) => (
            <PrintCell key={i} label={`คำแนะนำที่ ${i + 1}`} value={p} minWidth={0} />
          ))
        ) : (
          <PrintCell label='คำแนะนำสำหรับผู้รับบริการ' value='ไม่มีข้อกำหนดการเตรียมตัวเป็นพิเศษสำหรับรายการที่สั่ง' minWidth={0} />
        )}
        <PrintCell
          label='ข้อควรปฏิบัติเพิ่มเติม'
          value={header.preparationNote
            || 'นำบัตรประจำตัวประชาชนและใบคำขอฉบับนี้มาแสดงที่ห้องรังสี · ถอดเครื่องประดับโลหะทุกชิ้นก่อนเข้ารับการตรวจ'}
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
        <PrintSignatureLine role='นักรังสีการแพทย์ผู้ตรวจ' note='ลงชื่อเมื่อทำการตรวจ' />
      </div>

      <span style={{ ...PRINT_LABEL_STYLE, marginTop: 'var(--dim-space-300, 12px)' }}>
        ออกโดย {row?.issuedBy || '—'} · จำนวนครั้งที่พิมพ์ {row?.printCount || 0} ครั้ง
      </span>
    </PrintSheetFrame>
  );
};

export default XrayRequestPrintSheet;
