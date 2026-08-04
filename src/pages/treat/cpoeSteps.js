/* PHCIS | CPOE §1.5 — ลำดับขั้นของ /treat/record เมื่อมี SOAP Note.

   ⚠ ห้ามแก้ `TREATMENT_STEPS` ใน `src/templates/TreatmentFormShell.jsx`
   เด็ดขาด — เป็น template กลางที่คลินิกอื่น (ANC / NCD / HIV-STI /
   Mental Health / Addiction / Dental) ใช้เป็น default. `TreatmentFormShell`
   รับ prop `steps` อยู่แล้ว จึงประกาศชุด 8 ขั้นของ CPOE ไว้ที่นี่แทน แล้ว
   `TreatmentFormPage` ส่งเข้า shell เอง.

   ทำนองเดียวกัน `getTreatmentCompletedSteps` (7 ช่อง) เป็น contract ที่
   ancVisits / dentalVisits / ncdVisits อ้างถึง — จึงเพิ่ม
   `getCpoeCompletedSteps` (8 ช่อง) ตัวใหม่ แทนการแก้ signature เดิม. */

import { getTreatmentCompletedSteps } from '@/data/treatmentVisits';
import { soapHasContent } from '@/data/treatmentSoap';

export const CPOE_TREATMENT_STEPS = [
  { key: 'history',     title: 'ประวัติการรักษา',      subtitle: 'Medical History' },
  { key: 'screening',   title: 'คัดกรองและซักประวัติ',  subtitle: 'Screening' },
  { key: 'examination', title: 'ตรวจร่างกาย',          subtitle: 'Physical Examination' },
  { key: 'soap',        title: 'SOAP Note',            subtitle: 'Doctor Record' },
  { key: 'diagnosis',   title: 'วินิจฉัย',              subtitle: 'Diagnosis' },
  { key: 'orders',      title: 'สั่งการรักษา',          subtitle: 'Treatment Order' },
  { key: 'appointment', title: 'นัดหมาย',              subtitle: 'Appointment' },
  { key: 'documents',   title: 'เอกสาร/ใบรับรองแพทย์',  subtitle: 'Documents' },
];

export const CPOE_STEP_LABELS = CPOE_TREATMENT_STEPS.map((s) => s.title);

/* ค้น index จาก key แทน magic number — ปุ่ม "ไปสั่งตรวจ" / "แก้ไข
   ตรวจร่างกาย" ที่กระโดดข้าม step ต้องใช้ตัวนี้ เพราะ index เลื่อนไปแล้ว
   หลังแทรก SOAP (orders 4→5, doctor record 3→4). */
export const cpoeStepIndex = (key) => {
  const i = CPOE_TREATMENT_STEPS.findIndex((s) => s.key === key);
  return i < 0 ? 0 : i;
};

export const CPOE_STEP_HISTORY     = cpoeStepIndex('history');
export const CPOE_STEP_SCREENING   = cpoeStepIndex('screening');
export const CPOE_STEP_EXAMINATION = cpoeStepIndex('examination');
export const CPOE_STEP_SOAP        = cpoeStepIndex('soap');
export const CPOE_STEP_DIAGNOSIS   = cpoeStepIndex('diagnosis');
export const CPOE_STEP_ORDERS      = cpoeStepIndex('orders');
export const CPOE_STEP_APPOINTMENT = cpoeStepIndex('appointment');
export const CPOE_STEP_DOCUMENTS   = cpoeStepIndex('documents');

/* SOAP ถือว่าครบเมื่อมีอย่างน้อย 1 ใน 4 ช่องยาวพอจะเป็นโน้ตจริง
   (ล้อ MIN_NOTE_CHARS ของ ClinicalNotesPanel ผ่าน soapHasContent) */
export const isCpoeSoapComplete = (form) => soapHasContent(form?.soap);

/* 8 ช่อง — แปลงจากผลลัพธ์ 7 ช่องของ getTreatmentCompletedSteps โดยแทรก
   SOAP ไว้ที่ตำแหน่ง 4 และเลื่อนที่เหลือลง. legacyIndex คือ index ที่
   ฟังก์ชันเดิมคาดหวัง (ก่อนแทรก SOAP). */
export const getCpoeCompletedSteps = (form, stepIndex = 0) => {
  const legacyIndex = stepIndex <= CPOE_STEP_SOAP ? stepIndex : stepIndex - 1;
  const legacy = getTreatmentCompletedSteps(form, legacyIndex);
  return [
    legacy[0],                        /* 1 ประวัติ            */
    legacy[1],                        /* 2 คัดกรอง            */
    legacy[2],                        /* 3 ตรวจร่างกาย        */
    isCpoeSoapComplete(form),         /* 4 SOAP Note          */
    legacy[3],                        /* 5 วินิจฉัย            */
    stepIndex > CPOE_STEP_ORDERS,     /* 6 สั่งการรักษา (ไม่บังคับ) */
    legacy[5],                        /* 7 นัดหมาย            */
    legacy[6],                        /* 8 เอกสาร/ใบรับรองแพทย์ */
  ];
};

export default CPOE_TREATMENT_STEPS;
