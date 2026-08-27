import React from 'react';
import Popup from '@/components/popup/Popup';
import { LabReportBody } from '@/pages/lab/LabReportPage';

/* ใบรายงานผลสำหรับผู้ป่วย as a popup over the worklist (มติผู้ใช้ 28 ส.ค. 69).

   Same body the `/lab/report/:orderId` route renders — the A4 sheet at its
   real 210mm width plus the print button — so the preview stays exactly what
   the printer will produce. `extraLarge` is what makes 210mm fit without the
   sheet being scaled down to something you cannot proofread. */
const LabReportPopup = ({ open, orderId, onClose }) => (
  <Popup
    open={open}
    onClose={onClose}
    size='extraLarge'
    title='ใบรายงานผลสำหรับผู้ป่วย'
    subtitle='ตรวจทานใบรายงานผลก่อนพิมพ์ — สิ่งที่เห็นคือสิ่งที่ออกจากเครื่องพิมพ์'
  >
    {open && orderId ? <LabReportBody orderId={orderId} onDone={onClose} /> : null}
  </Popup>
);

export default LabReportPopup;
