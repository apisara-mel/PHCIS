import React, { useMemo } from 'react';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import {
  appointmentStatusLabel,
  appointmentStatusTone,
} from '@/pages/appointment/appointmentCreationHistory';

/* ประวัติสร้างการนัดหมาย — ตารางปกติ (มติผู้ใช้ 25 ส.ค. 69)
   เหตุผลเดียวกับประวัติคำขอเข้าถึงข้อมูล: timeline แบ่งกลุ่มรายเดือนอ่านยาก
   กว่าตารางธรรมดาเมื่อข้อมูลมีหลายคอลัมน์ให้เทียบ

   "สร้างเมื่อ" กับ "วันนัด" แยกคอลัมน์กันเสมอ — ถ้าปนกันจะอ่านไม่ออกว่าเลขไหน
   คืออะไร */

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

export default function AppointmentCreationHistoryTimeline({ records = [] }) {
  const columns = useMemo(() => [
    {
      key: 'created',
      header: 'สร้างเมื่อ',
      render: (r) => <Stacked primary={r.createdDate} secondary={r.createdTime} />,
    },
    {
      key: 'appt',
      header: 'วันนัด / เวลา',
      render: (r) => <Stacked primary={r.apptDateLabel} secondary={r.time} />,
    },
    {
      key: 'patient',
      header: 'ผู้รับบริการ',
      render: (r) => <Stacked primary={r.patient} secondary={r.hn ? `HN ${r.hn}` : ''} />,
    },
    {
      key: 'clinic',
      header: 'คลินิก / แพทย์',
      render: (r) => <Stacked primary={r.clinic} secondary={r.doctor} />,
    },
    {
      key: 'reason',
      header: 'เหตุผลการนัด',
      render: (r) => <Stacked primary={r.reason || r.type} secondary={r.orderingUnit || r.site} />,
    },
    {
      key: 'status',
      header: 'สถานะ',
      render: (r) => (
        <ColorfulBadge style={appointmentStatusTone(r.status)} size='small' showDot width='hug'>
          {appointmentStatusLabel(r.status)}
        </ColorfulBadge>
      ),
    },
  ], []);

  return (
    <Table
      columns={columns}
      rows={records}
      rowKey={(r, i) => r.id ?? i}
      emptyMessage='ยังไม่มีประวัติสร้างการนัดหมาย'
      emptySubtext='นัดหมายที่คุณสร้างจากเมนู “สร้างการนัดหมาย” จะมาแสดงที่นี่'
    />
  );
}
