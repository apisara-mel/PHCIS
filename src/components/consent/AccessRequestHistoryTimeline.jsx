import React from 'react';
import ColumnTimeline from '@/components/timeline/ColumnTimeline';
import { ACCESS_STATUS } from '@/data/accessRecords';

/* ประวัติคำขอเข้าถึงข้อมูล — config ของ ColumnTimeline (มติผู้ใช้ 25 ส.ค. 69)

   ไม่มีคอลัมน์ "ผู้ขอ" — popup นี้แสดงเฉพาะคำขอของผู้ใช้ที่ล็อกอินอยู่
   ผู้ขอจึงเป็นคนเดิมทุกแถว ไม่มีข้อมูลให้เทียบ

   "ผู้รับบริการ" คือคนไข้ที่ถูกขอเข้าถึง ไม่ใช่ผู้ขอ — ของเดิมใช้
   `patientName || name` ช่องเดียวทั้งที่เป็นคนละคน */

const COLUMNS = [
  /* วันที่กับเวลาแยกคอลัมน์ (มติผู้ใช้ 25 ส.ค. 69) — ของเดิมซ้อนกันสองบรรทัด
     ในคอลัมน์เดียว ทำให้กวาดตาหาเวลาข้ามแถวไม่ได้ */
  {
    key: 'date',
    label: 'วันที่',
    track: 'var(--dim-size-2000, 128px)',
    primary: (r) => r.createdDate,
  },
  {
    key: 'time',
    label: 'เวลา',
    track: 'var(--dim-size-1700, 80px)',
    primary: (r) => r.createdTime,
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
  /* วัตถุประสงค์ต้องมาจากตอนสร้างคำขอ (มติผู้ใช้ 25 ส.ค. 69)
     ฟอร์มสร้างคำขอส่ง `reason` (= เหตุผลที่เลือก/พิมพ์เอง) และ `purpose`
     เป็นค่าเดียวกัน — เอามาแสดงซ้อนกันจึงเป็นข้อความซ้ำในของจริง
     บรรทัดรองเปลี่ยนไปใช้ `scopes` = "ขอบเขตข้อมูลที่ขอเข้าถึง" ที่ผู้ขอเลือก
     ไว้ในฟอร์มเดียวกัน (ถ้าไม่มี ค่อย fallback เป็น purpose ของข้อมูลเก่า) */
  {
    key: 'reason',
    label: 'วัตถุประสงค์',
    track: 'minmax(var(--dim-size-2100, 160px), 1.7fr)',
    primary: (r) => r.reason || r.purpose || '—',
    secondary: (r) => (
      Array.isArray(r.scopes) && r.scopes.length
        ? r.scopes.join(' · ')
        : (r.purpose && r.purpose !== r.reason ? r.purpose : '—')
    ),
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
