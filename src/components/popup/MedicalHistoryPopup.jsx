import React from 'react';
import Popup from '@/components/popup/Popup';
import { MedicalHistoryReadOnlyLayout } from '@/components/forms/TreatmentSteps';

/* MIH PHCIS · ประวัติการรักษา popup — Figma Appointment 23:10946 /
   PHCIS | CPOE Step 1 + Step 6 (4034:3723). Reuses the same read-only
   layout as the treatment record page. */

const MedicalHistoryPopup = ({ open, onClose, patient }) => (
  <Popup
    open={open}
    onClose={onClose}
    title='ดูข้อมูลทางการแพทย์'
    subtitle='แสดงรายละเอียดประวัติการรักษาของผู้ป่วย รวมถึงการวินิจฉัย การสั่งยา และบันทึกทางการแพทย์'
    size='extraLarge'
    bodyScrollable={false}
    primaryAction={{ label: 'ปิด', onClick: onClose }}
  >
    <MedicalHistoryReadOnlyLayout patient={patient} hideSectionTitle independentScroll viewModes />
  </Popup>
);

export default MedicalHistoryPopup;
