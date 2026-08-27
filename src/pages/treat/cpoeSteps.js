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

/* "ประวัติการรักษา" ถูกเอาออกจากลำดับขั้น 28 ส.ค. 69 — เป็นหน้าอ่านอย่างเดียว
   ที่หมอเปิดดูตอนไหนก็ได้จากปุ่ม "ประวัติการรักษา" บนหัวการ์ดผู้ป่วย ไม่ใช่ขั้น
   ที่ต้องเดินผ่านก่อนถึงจะบันทึกอะไรได้ · component `Step1History` ยังอยู่
   เพราะคลินิก NCD / TB และ Components Library ใช้อยู่ */
/* SOAP Note ย้ายมาเป็นลำดับที่ 5 (หลังสั่งการรักษา) 28 ส.ค. 69 — หมอสรุป S/O/A/P
   หลังจากวินิจฉัยและสั่งการรักษาเสร็จแล้ว ไม่ใช่ก่อน */
export const CPOE_TREATMENT_STEPS = [
  { key: 'screening',   title: 'คัดกรองและซักประวัติ',  subtitle: 'Screening' },
  { key: 'examination', title: 'ตรวจร่างกาย',          subtitle: 'Physical Examination' },
  { key: 'diagnosis',   title: 'วินิจฉัย',              subtitle: 'Diagnosis' },
  { key: 'orders',      title: 'สั่งการรักษา',          subtitle: 'Treatment Order' },
  { key: 'soap',        title: 'SOAP Note',            subtitle: 'Doctor Record' },
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

/* 7 ช่อง — แปลงจากผลลัพธ์ 7 ช่องของ getTreatmentCompletedSteps โดยตัดช่อง
   "ประวัติ" ทิ้ง (ไม่เป็นขั้นแล้ว) และแทรก SOAP เข้ามาแทน. legacyIndex คือ
   index ที่ฟังก์ชันเดิมคาดหวัง — ชุดเดิมมี "ประวัติ" อยู่หน้าสุด ทุกขั้นก่อน
   ถึง SOAP จึงต้องบวกกลับหนึ่งช่อง ส่วนขั้นหลัง SOAP ชดเชยกันพอดี */
export const getCpoeCompletedSteps = (form, stepIndex = 0) => {
  /* ชุด legacy เรียง [ประวัติ, คัดกรอง, ตรวจร่างกาย, วินิจฉัย, —, นัดหมาย, เอกสาร]
     ขั้นก่อน SOAP จึงบวกกลับหนึ่งช่อง ส่วน SOAP เป็นต้นไปตรงกันพอดี */
  const legacyIndex = stepIndex < CPOE_STEP_SOAP ? stepIndex + 1 : stepIndex;
  const legacy = getTreatmentCompletedSteps(form, legacyIndex);
  return [
    legacy[1],                        /* 1 คัดกรอง            */
    legacy[2],                        /* 2 ตรวจร่างกาย        */
    legacy[3],                        /* 3 วินิจฉัย            */
    stepIndex > CPOE_STEP_ORDERS,     /* 4 สั่งการรักษา (ไม่บังคับ) */
    isCpoeSoapComplete(form),         /* 5 SOAP Note          */
    legacy[5],                        /* 6 นัดหมาย            */
    legacy[6],                        /* 7 เอกสาร/ใบรับรองแพทย์ */
  ];
};

export default CPOE_TREATMENT_STEPS;
