import React from 'react';
import ColumnTimeline from '@/components/timeline/ColumnTimeline';
import { ACCESS_STATUS } from '@/data/accessRecords';

/* ประวัติคำขอเข้าถึงข้อมูล — config ของ ColumnTimeline (มติผู้ใช้ 25 ส.ค. 69)

   ไม่มีคอลัมน์ "ผู้ขอ" — popup นี้แสดงเฉพาะคำขอของผู้ใช้ที่ล็อกอินอยู่
   ผู้ขอจึงเป็นคนเดิมทุกแถว ไม่มีข้อมูลให้เทียบ

   "ผู้รับบริการ" คือคนไข้ที่ถูกขอเข้าถึง ไม่ใช่ผู้ขอ — ของเดิมใช้
   `patientName || name` ช่องเดียวทั้งที่เป็นคนละคน */

const COLUMNS = [
  {
    key: 'when',
    label: 'วันที่ / เวลา',
    track: 'var(--dim-size-2000, 128px)',
    primary: (r) => r.createdTime,
    secondary: (r) => r.createdDate,
  },
  {
    key: 'reqNo',
    label: 'เลขคำขอ',
    track: 'var(--dim-size-2000, 128px)',
    primary: (r) => r.reqNo,
    secondary: (r) => r.formCode,
  },
  {
    key: 'patient',
    label: 'ผู้รับบริการ',
    track: 'minmax(var(--dim-size-2100, 160px), 1.3fr)',
    primary: (r) => r.patientName || '—',
    secondary: (r) => (r.hn ? `HN ${r.hn}` : '—'),
  },
  {
    key: 'reason',
    label: 'วัตถุประสงค์',
    track: 'minmax(var(--dim-size-2100, 160px), 1.7fr)',
    primary: (r) => r.reason,
    secondary: (r) => r.purpose,
  },
  {
    key: 'status',
    label: 'สถานะ',
    track: 'var(--dim-size-2000, 128px)',
    align: 'end',
    badge: true,
    primary: (r) => r.status,
  },
];

const getDateTime = (r) => `${r.createdDate} · ${r.createdTime}`;
const getTone = (r) => ACCESS_STATUS[r.status]?.tone || 'grey';

export default function AccessRequestHistoryTimeline({ records = [] }) {
  return (
    <ColumnTimeline
      rows={records}
      columns={COLUMNS}
      getDateTime={getDateTime}
      getTone={getTone}
      getKey={(r, i) => r.id ?? r.reqNo ?? i}
      countLabel='คำขอ'
      ariaLabel='ประวัติคำขอเข้าถึงข้อมูล'
      emptyTitle='ยังไม่มีคำขอเข้าถึงข้อมูล'
      emptyHint='คำขอที่คุณสร้างจากเมนู “สร้างคำขอเข้าถึงข้อมูล” จะมาแสดงที่นี่'
    />
  );
}
