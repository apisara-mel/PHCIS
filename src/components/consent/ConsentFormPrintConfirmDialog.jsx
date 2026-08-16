import React from 'react';
import AlertDialog from '@/components/popup/AlertDialog';

/* ยืนยันก่อนพิมพ์แบบฟอร์มยินยอมเปล่า (ปุ่มไอคอนพิมพ์บนการ์ด)

   ใช้ AlertDialog `type='info'` — เป็นการแจ้งให้ทราบว่ากำลังจะสั่งพิมพ์ ไม่ใช่
   การเตือนอันตราย (การพิมพ์ย้อนกลับได้ ไม่กระทบข้อมูล)

   ทำไมต้องถาม: ปุ่มพิมพ์เป็นไอคอนเปล่าอยู่ข้างปุ่ม "กรอกแบบฟอร์ม" กดพลาดง่าย
   และผลของมันคือคำสั่งพิมพ์ที่ขัดจังหวะผู้ใช้ (dialog ของเบราว์เซอร์)
   ด.1.1.15 — พิมพ์เอกสารให้ลงนามบนกระดาษ · การพิมพ์ไม่เก็บ log
   (annotation 414:123633 ต่างจากการส่งออกไฟล์) */

const ConsentFormPrintConfirmDialog = ({ form, onCancel, onConfirm }) => (
  <AlertDialog
    open={!!form}
    type='info'
    title='พิมพ์แบบฟอร์มความยินยอม'
    description={form
      ? `ระบบจะพิมพ์ ${form.title} (${form.code || form.id}) แบบยังไม่กรอก เพื่อให้ผู้รับบริการลงนามบนกระดาษ`
      : ''}
    confirmLabel='พิมพ์'
    cancelLabel='ยกเลิก'
    onConfirm={onConfirm}
    onCancel={onCancel}
    onClose={onCancel}
  />
);

export default ConsentFormPrintConfirmDialog;
