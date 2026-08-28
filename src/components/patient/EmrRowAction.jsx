import React, { useState } from 'react';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import { getPatientByHN } from '@/data/patientProfiles';

const MedicalHistoryPopupLazy = React.lazy(() => import('@/components/popup/MedicalHistoryPopup'));

/* ปุ่ม "ดูข้อมูลทางการแพทย์ (EMR)" ในคอลัมน์การดำเนินการของตาราง worklist
   ══════════════════════════════════════════════════════════════════════════
   ย้ายลงมาจากหัวหน้าจอ (มติผู้ใช้ 28 ส.ค. 69) — บนหัวหน้าจอปุ่มต้องถามก่อนว่า
   จะดูของใคร ทั้งที่ทุกแถวในตารางคือคำตอบของคำถามนั้นอยู่แล้ว อยู่ในแถวจึงไม่ต้อง
   ถาม กดแล้วเห็นประวัติของคนในแถวนั้นทันที

   เป็นปุ่มไอคอน ไม่ใช่ปุ่มมีคำ เพราะคอลัมน์การดำเนินการมีปุ่มของงานหลักอยู่แล้ว
   (ส่งตรวจ / การติดตาม / รับเคส) การใส่ปุ่มยาวอีกอันดันคอลัมน์อื่นจนตารางล้น
   ชื่อเต็มอยู่ใน title และ aria-label สำหรับ hover และ screen reader

   โหลด popup แบบ lazy เหมือน PatientCard — MedicalHistoryPopup ดึง
   TreatmentSteps ทั้งไฟล์ (~6000 บรรทัด) มาด้วย ไม่ควรติดไปกับ bundle ของทุก
   หน้าคิวตั้งแต่แรกโหลด */

export const EmrRowAction = ({ hn, name }) => {
  const [open, setOpen] = useState(false);
  const patient = getPatientByHN(hn);
  if (!patient) return null;

  const who = name || patient.shortName || `HN ${hn}`;
  return (
    <>
      <NeutralSubdueIconButton
        icon='history'
        variant='outline'
        size='sm'
        aria-label={`ดูข้อมูลทางการแพทย์ (EMR) ของ ${who}`}
        title='ดูข้อมูลทางการแพทย์ (EMR)'
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
      />
      {open && (
        <React.Suspense fallback={null}>
          <MedicalHistoryPopupLazy open onClose={() => setOpen(false)} patient={patient} />
        </React.Suspense>
      )}
    </>
  );
};

/** ห่อ `render` ของคอลัมน์การดำเนินการเดิม โดยเติมปุ่ม EMR ไว้หน้าสุด
    ผู้เรียกจึงแก้ที่เดียว: `render: withEmrRowAction(renderActions)` */
export const withEmrRowAction = (renderActions) => function ActionsWithEmr(row, index, ctx) {
  return (
    <div className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
      <EmrRowAction hn={row?.hn} name={row?.name} />
      {typeof renderActions === 'function' ? renderActions(row, index, ctx) : null}
    </div>
  );
};

export default EmrRowAction;
