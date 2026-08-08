import React, { useEffect } from 'react';
import {
  clinicMeta, doctorMeta, consultTypeMeta, consultUrgencyMeta, consultStatusMeta,
} from '@/data/treatmentConsult';

/* PHCIS | CPOE §1.5.6.7 — ใบส่งปรึกษาแพทย์สำหรับพิมพ์.
   ล้อ ReferralPrintSheet ทุกประการ (masthead + block ข้อมูล + ช่องลงนาม +
   @media print ที่ scope ด้วยคลาสบน <body> เฉพาะตอน sheet ยัง mount อยู่
   ไม่งั้น `body * { visibility: hidden }` จะค้างทั้ง SPA แล้วทำให้
   window.print() ของหน้าอื่นพิมพ์ออกมาเป็นหน้าว่าง).

   ข้อจำกัดตามจริง: ไม่มี PDF engine — "พิมพ์" คือ window.print() ผ่าน
   @media print เท่านั้น. */

const PRINT_STYLE_ID = 'mih-consult-print-style';
const PRINT_BODY_CLASS = 'mih-printing-consult';

const ensurePrintStyle = () => {
  if (typeof document === 'undefined') return;
  const prev = document.getElementById(PRINT_STYLE_ID);
  if (prev) prev.remove();
  const el = document.createElement('style');
  el.id = PRINT_STYLE_ID;
  el.textContent = `
@media print {
  body.${PRINT_BODY_CLASS} * { visibility: hidden !important; }
  body.${PRINT_BODY_CLASS} .mih-consult-sheet,
  body.${PRINT_BODY_CLASS} .mih-consult-sheet * { visibility: visible !important; }
  body.${PRINT_BODY_CLASS} .mih-consult-sheet {
    position: absolute !important;
    top: 0 !important; left: 0 !important;
    width: 100% !important;
    box-shadow: none !important;
    border: 0 !important;
  }
  body.${PRINT_BODY_CLASS} .mih-consult-noprint { display: none !important; }
  body.${PRINT_BODY_CLASS} .mih-consult-sheet thead { display: table-header-group !important; }
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
  whiteSpace: 'pre-wrap',
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
      gap: 'var(--dim-space-300, 12px)',
      borderTop: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
      paddingTop: 'var(--dim-space-300, 12px)',
    }}
  >
    <span style={{
      color: 'var(--text-topic-tertiary-title)',
      fontFamily: 'var(--type-family-heading-content)',
      fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
      fontSize: 'var(--type-size-sm, 14px)',
    }}>
      {title}
    </span>
    {children}
  </section>
);

const SignatureLine = ({ role, name, at }) => (
  <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-100, 4px)', minWidth: 220 }}>
    <div
      style={{
        width: '100%',
        borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-tertiary, #E2E4E6)',
        height: 'var(--dim-size-800, 40px)',
      }}
      aria-hidden
    />
    <span style={LABEL}>({name || 'ลงชื่อ'})</span>
    <span style={LABEL}>{role}</span>
    <span style={LABEL}>{at || 'วันที่ ......../......../........'}</span>
  </div>
);

const ConsultPrintSheet = ({ row }) => {
  useEffect(() => {
    ensurePrintStyle();
    return teardownPrintStyle;
  }, []);

  if (!row) return null;

  const clinic = clinicMeta(row.toClinic);
  const doctor = doctorMeta(row.toDoctor);

  return (
    <article
      className='mih-consult-sheet flex flex-col w-full'
      style={{
        gap: 'var(--dim-space-400, 16px)',
        background: 'var(--surface-card-100)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
        borderRadius: 'var(--dim-radius-400, 12px)',
        paddingTop: 'var(--dim-space-600, 24px)',
        paddingRight: 'var(--dim-space-600, 24px)',
        paddingBottom: 'var(--dim-space-600, 24px)',
        paddingLeft: 'var(--dim-space-600, 24px)',
      }}
    >
      {/* masthead */}
      <header className='flex flex-col items-center w-full' style={{ gap: 'var(--dim-space-100, 4px)' }}>
        <span style={{
          color: 'var(--text-content-default)',
          fontFamily: 'var(--type-family-heading-content)',
          fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
          fontSize: 'var(--type-size-lg, 18px)',
        }}>
          ใบส่งปรึกษาแพทย์ (Consultation Request)
        </span>
        <span style={LABEL}>{row.fromCenter || 'ศูนย์บริการสาธารณสุข สำนักอนามัย กรุงเทพมหานคร'}</span>
        <span style={LABEL}>
          เลขที่คำขอ {row.consultNo || '—'} · สถานะ {consultStatusMeta(row.status).label}
          {row.printCount ? ` · พิมพ์แล้ว ${row.printCount} ครั้ง` : ''}
        </span>
      </header>

      <Block title='๑. ข้อมูลผู้รับบริการ'>
        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <Cell label='HN' value={row.hn} minWidth={120} />
          <Cell label='เลขประจำตัวประชาชน' value={row.cid} minWidth={200} />
          <Cell label='ชื่อ - นามสกุล' value={row.name} flex={2} minWidth={240} />
        </div>
        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <Cell label='อายุ' value={row.age} minWidth={120} />
          <Cell label='เพศ' value={row.gender} minWidth={120} />
          <Cell label='สิทธิการรักษา' value={row.rights} minWidth={200} />
          <Cell label='Trauma / NonTrauma' value={row.trauma === 'trauma' ? 'Trauma' : 'NonTrauma'} minWidth={200} />
        </div>
      </Block>

      <Block title='๒. ผู้ขอปรึกษาและปลายทาง'>
        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <Cell label='วัน-เวลาที่บันทึกคำขอ' value={row.requestedAt} minWidth={220} />
          <Cell label='แพทย์ผู้ขอปรึกษา' value={row.requestedBy} minWidth={220} />
          <Cell label='หน่วยงานผู้ขอ' value={row.fromClinic} minWidth={220} />
        </div>
        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <Cell label='คลินิกที่ส่งปรึกษา' value={clinic?.label} minWidth={240} />
          <Cell label='แพทย์ที่ปรึกษา' value={doctor ? `${doctor.name} (${doctor.specialty})` : 'ยังไม่ระบุแพทย์'} minWidth={260} />
        </div>
        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <Cell label='ประเภทการปรึกษา' value={consultTypeMeta(row.consultType).label} minWidth={260} />
          <Cell label='ความเร่งด่วน' value={consultUrgencyMeta(row.urgency).label} minWidth={160} />
          <Cell label='วัน-เวลาที่ส่ง' value={row.sentAt} minWidth={200} />
        </div>
      </Block>

      <Block title='๓. ข้อมูลทางคลินิก'>
        <Cell label='ผลการวินิจฉัยเบื้องต้น' value={row.provisionalDx} />
        <Cell label='ประเด็นที่ต้องการปรึกษา' value={row.question} />
        <Cell label='ข้อมูลประกอบ (สัญญาณชีพ / ผลตรวจ / ยาที่ใช้อยู่)' value={row.context} />
        <Cell label='สิ่งที่ต้องการให้ดำเนินการ' value={row.request} />
        {row.doctorNote ? <Cell label='Doctor Note' value={row.doctorNote} /> : null}
      </Block>

      {row.status === 'replied' ? (
        <Block title='๔. ความเห็นและคำแนะนำของแพทย์ผู้รับปรึกษา'>
          <Cell label='ความเห็น' value={row.replyBody} />
          <Cell label='คำแนะนำ' value={row.replyAdvice} />
          <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <Cell label='ผู้ตอบกลับ' value={row.repliedBy} minWidth={220} />
            <Cell label='วัน-เวลาที่ตอบกลับ' value={row.repliedAt} minWidth={220} />
          </div>
        </Block>
      ) : (
        <Block title='๔. ความเห็นและคำแนะนำของแพทย์ผู้รับปรึกษา'>
          {/* ยังไม่ตอบกลับ — เว้นเส้นให้เขียนมือ ไม่ปล่อยเป็นช่องว่างเปล่า */}
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: '100%',
                borderBottom: 'var(--dim-stroke-100, 1px) dotted var(--border-neutral-tertiary, #E2E4E6)',
                height: 'var(--dim-size-700, 36px)',
              }}
              aria-hidden
            />
          ))}
        </Block>
      )}

      <Block title='๕. ลงนาม'>
        <div className='flex flex-wrap items-start justify-between w-full' style={{ gap: 'var(--dim-space-600, 24px)' }}>
          <SignatureLine role='แพทย์ผู้ขอปรึกษา' name={row.requestedBy} at={row.requestedAt} />
          <SignatureLine
            role='แพทย์ผู้รับปรึกษา'
            name={row.repliedBy || doctor?.name}
            at={row.repliedAt}
          />
        </div>
        <span style={LABEL}>
          เอกสารนี้พิมพ์จากระบบสารสนเทศศูนย์บริการสาธารณสุข (PHCIS) — หากไม่มีลายเซ็นอิเล็กทรอนิกส์
          ให้ลงลายมือชื่อในช่องด้านบน
        </span>
      </Block>
    </article>
  );
};

export default ConsultPrintSheet;
