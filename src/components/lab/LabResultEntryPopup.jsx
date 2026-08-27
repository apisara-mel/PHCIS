import React from 'react';
import Popup from '@/components/popup/Popup';
import { LabResultEntryBody } from '@/pages/lab/LabResultEntryPage';

/* บันทึกผลตรวจ as a popup over the worklist (มติผู้ใช้ 28 ส.ค. 69).

   Result entry used to be a route of its own because it needs one input per
   analyte plus the critical-value block — room a row action does not have.
   `extraLarge` gives it that room without sending the bench to another
   screen and back, which cost them their scroll position, their filters and
   their scan focus every time. The route `/lab/result/:id` still exists for
   deep links; both render the same `LabResultEntryBody`.

   The body carries its own sticky footer (บันทึกร่าง / รับรองและรายงานผล), so
   no `primaryAction` is passed — a second action bar underneath would be two
   sets of buttons for one form. */
const LabResultEntryPopup = ({ open, orderId, onClose }) => (
  <Popup
    open={open}
    onClose={onClose}
    size='extraLarge'
    title='บันทึกผลตรวจ'
    subtitle='กรอกผลรายค่า ตรวจสอบค่าวิกฤต แล้วบันทึกร่างหรือรับรองรายงานผล'
  >
    {/* Mount only while open so the draft state seeds fresh for each order
        rather than carrying the previous specimen's values over. */}
    {open && orderId ? (
      <LabResultEntryBody orderId={orderId} onDone={onClose} />
    ) : null}
  </Popup>
);

export default LabResultEntryPopup;
