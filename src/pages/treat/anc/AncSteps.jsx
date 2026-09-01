import React from 'react';
import Icon from '@/components/icons/Icon';

/* คลินิกฝากครรภ์ — โครง 7 ขั้น (เนื้อในถูกล้าง 1 ก.ย. 69 ตามมติผู้ใช้)
   ══════════════════════════════════════════════════════════════════════
   ไฟล์นี้เคยมีเนื้อหาของทั้งเจ็ดขั้นราว 1,440 บรรทัด — ประวัติการรักษา (ครรภ์ที่ ·
   LMP → EDC/อายุครรภ์ · ประวัติทางสูติกรรม · สุขภาพของสามี) · แบบประเมิน (ST-5 ·
   2Q · ความเสี่ยงตั้งครรภ์ · สัญญาณอันตราย · การสูบบุหรี่ · สุขภาพช่องปาก) ·
   ตรวจร่างกาย · วินิจฉัย · สั่งการรักษา (Lab ครั้งที่ 1/2 · วัคซีนบาดทะยัก) ·
   นัดหมาย · ใบฝากครรภ์

   **ของเดิมไม่ได้หายไปไหน** — อยู่ในประวัติ git ทั้งหมด ดึงกลับได้ด้วย
   `git show <commit-ก่อนหน้า>:src/pages/treat/anc/AncSteps.jsx`
   (ล่าสุดก่อนล้างคือคอมมิตบน `main` ของวันที่ 1 ก.ย. 69)

   ที่เหลือไว้คือ **ชื่อ export และ signature ของ props เดิมทุกตัว** เพื่อให้
   `AncFormPage` (ลำดับขั้น · footer · การบันทึกร่าง · แถบขั้นตอน) ยังทำงานได้
   ครบโดยไม่ต้องแก้ตาม — เขียนเนื้อในของขั้นไหนก็แทนที่ `<EmptyStepBody>`
   ของขั้นนั้นได้เลย */

const EmptyStepBody = ({ title, subtitle }) => (
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
export const AncStep1History = ({
  form, setForm, cardPatient, ancHn, visitNo = 1, isFollowUp = false, carriedFields = [],
}) => {
  void form; void setForm; void cardPatient; void ancHn;
  void visitNo; void isFollowUp; void carriedFields;
  return <EmptyStepBody title='ประวัติการรักษา' subtitle='Medical History — ยังไม่มีเนื้อหา' />;
};

/* ── Step 2 — แบบประเมิน ──────────────────────────────────────────── */
export const AncStep2Screening = ({ form, setForm }) => {
  void form; void setForm;
  return <EmptyStepBody title='แบบประเมิน' subtitle='Assessment — ยังไม่มีเนื้อหา' />;
};

/* ── Step 3 — ตรวจร่างกาย ─────────────────────────────────────────── */
export const AncStep3Examination = ({ form, setForm, ancHn, cardPatient }) => {
  void form; void setForm; void ancHn; void cardPatient;
  return <EmptyStepBody title='ตรวจร่างกาย' subtitle='Physical Examination — ยังไม่มีเนื้อหา' />;
};

/* ── Step 4 — วินิจฉัย ────────────────────────────────────────────── */
export const AncStep4Diagnosis = ({ form, setForm }) => {
  void form; void setForm;
  return <EmptyStepBody title='วินิจฉัย' subtitle='Diagnosis — ยังไม่มีเนื้อหา' />;
};

/* ── Step 5 — สั่งการรักษา ────────────────────────────────────────── */
export const AncStep5Orders = ({ form, setForm }) => {
  void form; void setForm;
  return <EmptyStepBody title='สั่งการรักษา' subtitle='Treatment Order — ยังไม่มีเนื้อหา' />;
};

/* ── Step 6 — นัดหมาย ─────────────────────────────────────────────── */
export const AncStep6Appointment = ({ form, setForm }) => {
  void form; void setForm;
  return <EmptyStepBody title='นัดหมาย' subtitle='Appointment — ยังไม่มีเนื้อหา' />;
};

/* ── Step 7 — ใบฝากครรภ์ ──────────────────────────────────────────── */
export const AncStep7Card = ({
  form, setForm, patient, cardPatient, ancHn, visitNo = 1,
}) => {
  void form; void setForm; void patient; void cardPatient; void ancHn; void visitNo;
  return <EmptyStepBody title='ใบฝากครรภ์' subtitle='ANC Card — ยังไม่มีเนื้อหา' />;
};
