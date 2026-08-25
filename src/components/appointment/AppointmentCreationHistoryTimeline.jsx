import React from 'react';
import ColumnTimeline from '@/components/timeline/ColumnTimeline';
import {
  appointmentStatusLabel,
  appointmentStatusTone,
} from '@/pages/appointment/appointmentCreationHistory';

/* ประวัติสร้างการนัดหมาย — config ของ ColumnTimeline (มติผู้ใช้ 25 ส.ค. 69)

   จัดกลุ่มตาม **วันที่กดสร้าง** ไม่ใช่วันนัด เพราะนี่คือ "ประวัติการสร้าง"
   ของผู้ใช้ วันนัดจริงจึงแยกเป็นคอลัมน์ของตัวเอง — ถ้าเอาสองอย่างมาปนกัน
   จะอ่านไม่ออกว่าเลขไหนคืออะไร */

const COLUMNS = [
  {
    key: 'created',
    label: 'สร้างเมื่อ',
    track: 'var(--dim-size-2000, 128px)',
    primary: (r) => r.createdTime,
    secondary: (r) => r.createdDate,
  },
  {
    key: 'appt',
    label: 'วันนัด / เวลา',
    track: 'var(--dim-size-2000, 128px)',
    primary: (r) => r.time,
    secondary: (r) => r.apptDateLabel,
  },
  {
    key: 'patient',
    label: 'ผู้รับบริการ',
    track: 'minmax(var(--dim-size-2100, 160px), 1.3fr)',
    primary: (r) => r.patient || '—',
    secondary: (r) => (r.hn ? `HN ${r.hn}` : '—'),
  },
  {
    key: 'clinic',
    label: 'คลินิก / แพทย์',
    track: 'minmax(var(--dim-size-2100, 160px), 1.3fr)',
    primary: (r) => r.clinic || '—',
    secondary: (r) => r.doctor || '—',
  },
  {
    key: 'reason',
    label: 'เหตุผลการนัด',
    track: 'minmax(var(--dim-size-2100, 160px), 1.4fr)',
    primary: (r) => r.reason || r.type || '—',
    secondary: (r) => r.orderingUnit || r.site || '—',
  },
  {
    key: 'status',
    label: 'สถานะ',
    track: 'var(--dim-size-2000, 128px)',
    align: 'end',
    badge: true,
    primary: (r) => appointmentStatusLabel(r.status),
  },
];

const getDateTime = (r) => `${r.createdDate} · ${r.createdTime}`;
const getTone = (r) => appointmentStatusTone(r.status);

export default function AppointmentCreationHistoryTimeline({ records = [] }) {
  return (
    <ColumnTimeline
      rows={records}
      columns={COLUMNS}
      getDateTime={getDateTime}
      getTone={getTone}
      getKey={(r, i) => r.id ?? i}
      countLabel='นัดหมาย'
      ariaLabel='ประวัติสร้างการนัดหมาย'
      emptyTitle='ยังไม่มีประวัติสร้างการนัดหมาย'
      emptyHint='นัดหมายที่คุณสร้างจากเมนู “สร้างการนัดหมาย” จะมาแสดงที่นี่'
    />
  );
}
