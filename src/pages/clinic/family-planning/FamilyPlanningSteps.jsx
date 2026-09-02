import React from 'react';
import Icon from '@/components/icons/Icon';

/* คลินิกวางแผนครอบครัว — โครง 7 ขั้น (เนื้อในถูกล้าง 2 ก.ย. 69 ตามมติผู้ใช้)
   ══════════════════════════════════════════════════════════════════════
   ไฟล์นี้เคยมีเนื้อหาของทั้งเจ็ดขั้น — ประวัติการรักษา · แบบประเมิน 11 ข้อ ·
   วางแผนครอบครัว (วิธีคุมกำเนิด) · ตรวจสตรี (เต้านม / ภายใน / Pap) ·
   ดูแลหลังคลอด · คำสั่งทางการแพทย์ · เอกสารและนัดหมาย

   **ของเดิมไม่ได้หายไปไหน** — อยู่ในประวัติ git ทั้งหมด ดึงกลับได้ด้วย
   `git show HEAD:src/pages/clinic/family-planning/FamilyPlanningSteps.jsx`
   (ล่าสุดก่อนล้างคือคอมมิตบนสาขาปัจจุบันของวันที่ 2 ก.ย. 69)

   ที่เหลือไว้คือ `EmptyStepBody` ที่หน้าบันทึกใช้เป็นพื้นที่ว่าง และ
   **ชื่อ export + signature ของ props เดิมทั้งเจ็ดขั้น** เพื่อให้เติมเนื้อกลับ
   ทีละขั้นได้โดยไม่ต้องไล่แก้ FormPage ตาม — เขียนเนื้อในของขั้นไหนก็แทนที่
   `<EmptyStepBody>` ของขั้นนั้นได้เลย */

export const EmptyStepBody = ({ title, subtitle }) => (
  <section
    className='flex flex-col items-center justify-center w-full text-center'
    style={{
      gap: 'var(--dim-space-300)',
      padding: 'var(--dim-space-800) var(--dim-space-600)',
      borderRadius: 'var(--dim-radius-500)',
      border: 'var(--dim-stroke-100) dashed var(--border-neutral-tertiary)',
      background: 'var(--surface-card-100)',
      minHeight: 'var(--dim-size-2600, 384px)',
    }}
  >
    <Icon name='draft' size={40} color='var(--icon-neutral-quaternary, #C6CBD0)' />
    <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-100)' }}>
      <span style={{
        color: 'var(--text-content-default)',
        fontFamily: 'var(--type-family-heading-content)',
        fontSize: 'var(--type-size-base)',
        fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
        lineHeight: 1.5,
      }}
      >
        {title}
      </span>
      <span style={{
        color: 'var(--text-content-tertiary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        lineHeight: 1.5,
      }}
      >
        {subtitle}
      </span>
    </div>
  </section>
);

/* ── Step 1 — ประวัติการรักษา ─────────────────────────────────────── */
export const FpStep1History = ({
  form, setForm, fpHn, registration, queueRow, locked, onGoRegistry,
}) => {
  void form; void setForm; void fpHn; void registration; void queueRow;
  void locked; void onGoRegistry;
  return <EmptyStepBody title='ประวัติการรักษา' subtitle='Medical History — ยังไม่มีเนื้อหา' />;
};

/* ── Step 2 — แบบประเมิน ──────────────────────────────────────────── */
export const FpStep2Screening = ({ form, setForm, locked }) => {
  void form; void setForm; void locked;
  return <EmptyStepBody title='แบบประเมิน' subtitle='Assessment (11 items) — ยังไม่มีเนื้อหา' />;
};

/* ── Step 3 — วางแผนครอบครัว ──────────────────────────────────────── */
export const FpStep3Plan = ({ form, setForm, locked }) => {
  void form; void setForm; void locked;
  return <EmptyStepBody title='วางแผนครอบครัว' subtitle='Family Planning — ยังไม่มีเนื้อหา' />;
};

/* ── Step 4 — ตรวจสตรี ────────────────────────────────────────────── */
export const FpStep4WomenExam = ({ form, setForm, fpHn, locked }) => {
  void form; void setForm; void fpHn; void locked;
  return <EmptyStepBody title='ตรวจสตรี' subtitle='Breast & PV Exam — ยังไม่มีเนื้อหา' />;
};

/* ── Step 5 — ดูแลหลังคลอด ────────────────────────────────────────── */
export const FpStep5Postpartum = ({ form, setForm, locked }) => {
  void form; void setForm; void locked;
  return <EmptyStepBody title='ดูแลหลังคลอด' subtitle='Postpartum Care — ยังไม่มีเนื้อหา' />;
};

/* ── Step 6 — คำสั่งทางการแพทย์ ───────────────────────────────────── */
export const FpStep6Orders = ({ form, setForm, locked }) => {
  void form; void setForm; void locked;
  return <EmptyStepBody title='คำสั่งทางการแพทย์' subtitle='Orders & Refer — ยังไม่มีเนื้อหา' />;
};

/* ── Step 7 — เอกสารและนัดหมาย ────────────────────────────────────── */
export const FpStep7Documents = ({
  form, setForm, fpHn, registration, cardPatient, locked, saved, onConfirmSave,
}) => {
  void form; void setForm; void fpHn; void registration; void cardPatient;
  void locked; void saved; void onConfirmSave;
  return <EmptyStepBody title='เอกสารและนัดหมาย' subtitle='Documents & Appointment — ยังไม่มีเนื้อหา' />;
};
