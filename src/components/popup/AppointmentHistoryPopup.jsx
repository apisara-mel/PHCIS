import React from 'react';
import Popup from '@/components/popup/Popup';
import { AppointmentHistoryReadOnlyLayout } from '@/pages/appointment/AppointmentHistoryReadOnlyLayout';

/* MIH PHCIS · ประวัติการนัด popup — Figma Appointment 29:13306 / 29:13492.
   Left rail lists past/upcoming appointments; right pane badge + cards follow selection. */

const AppointmentHistoryPopup = ({
  open,
  onClose,
  hn = '',
  appointments = [],
  highlightId,
}) => (
  <Popup
    open={open}
    onClose={onClose}
    title='ประวัติการนัด'
    subtitle='แสดงรายละเอียดการนัดหมายของผู้ป่วย รวมทั้งนัดที่ผ่านมาและนัดที่กำลังจะมาถึง'
    size='extraLarge'
    bodyScrollable={false}
    bodyStyle={{
      paddingLeft: 'var(--dim-space-600)',
      paddingRight: 'var(--dim-space-200)',
      /* Figma Title+Body gap-400 (16px) between header and body — header pb is space-600. */
      marginTop: 'calc(-1 * var(--dim-space-200))',
    }}
    primaryAction={{ label: 'ปิด', onClick: onClose }}
  >
    <AppointmentHistoryReadOnlyLayout
      hn={hn}
      appointments={appointments}
      highlightId={highlightId}
      independentScroll
    />
  </Popup>
);

export default AppointmentHistoryPopup;
