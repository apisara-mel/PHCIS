import React, { useMemo } from 'react';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { ACCESS_STATUS } from '@/data/accessRecords';

/* ประวัติคำขอเข้าถึงข้อมูล — ตารางปกติ (มติผู้ใช้ 25 ส.ค. 69)

   ของเดิมเป็น ColumnTimeline: หัวข้อเดือนคั่นกลางทุกกลุ่ม + สองบรรทัดต่อช่อง
   ทำให้กวาดตาลงคอลัมน์เดียวไม่ได้ ต้องข้ามหัวข้อเดือนตลอด อ่านยากกว่าตาราง
   ธรรมดาทั้งที่ข้อมูลเป็นตารางอยู่แล้ว

   ใช้ <Table> ตัวเดียวกับทะเบียนอื่นในระบบ จะได้ sticky header · ellipsis ·
   empty state เหมือนกันหมด ไม่ต้องดูแลสองชุด */

const MUTED = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.4,
};

const TEXT = {
  color: 'var(--text-content-primary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.45,
};

const Stacked = ({ primary, secondary }) => (
  <div className='flex flex-col min-w-0 w-full'>
    <span className='truncate' style={TEXT} title={typeof primary === 'string' ? primary : undefined}>
      {primary || '—'}
    </span>
    {secondary ? (
      <span className='truncate' style={MUTED} title={typeof secondary === 'string' ? secondary : undefined}>
        {secondary}
      </span>
    ) : null}
  </div>
);

/* วัตถุประสงค์มาจากตอนสร้างคำขอ — ฟอร์มส่ง `reason` (เหตุผลที่เลือก/พิมพ์เอง)
   ส่วนบรรทัดรองคือแบบฟอร์มที่ขอเข้าถึงซึ่งผู้ขอเลือกไว้ในฟอร์มเดียวกัน */
const purposeSecondary = (r) => (
  Array.isArray(r.scopes) && r.scopes.length
    ? r.scopes.join(' · ')
    : (r.purpose && r.purpose !== r.reason ? r.purpose : '')
);

export default function AccessRequestHistoryTimeline({ records = [] }) {
  const columns = useMemo(() => [
    { key: 'createdDate', header: 'วันที่', render: (r) => <span style={TEXT}>{r.createdDate}</span> },
    { key: 'createdTime', header: 'เวลา', render: (r) => <span style={TEXT}>{r.createdTime}</span> },
    {
      key: 'reqNo',
      header: 'เลขคำขอ',
      render: (r) => <Stacked primary={r.reqNo} secondary={r.formCode} />,
    },
    {
      key: 'patient',
      header: 'ผู้รับบริการ',
      render: (r) => <Stacked primary={r.patientName} secondary={r.hn ? `HN ${r.hn}` : ''} />,
    },
    {
      key: 'reason',
      header: 'วัตถุประสงค์',
      render: (r) => <Stacked primary={r.reason || r.purpose} secondary={purposeSecondary(r)} />,
    },
    {
      key: 'status',
      header: 'สถานะ',
      render: (r) => (
        <ColorfulBadge style={ACCESS_STATUS[r.status]?.tone || 'grey'} size='small' showDot width='hug'>
          {r.status}
        </ColorfulBadge>
      ),
    },
  ], []);

  return (
    <Table
      columns={columns}
      rows={records}
      rowKey={(r, i) => r.id ?? r.reqNo ?? i}
      emptyMessage='ยังไม่มีคำขอเข้าถึงข้อมูล'
      emptySubtext='คำขอที่คุณสร้างจากเมนู “สร้างคำขอเข้าถึงข้อมูล” จะมาแสดงที่นี่'
    />
  );
}
