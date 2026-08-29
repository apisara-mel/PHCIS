import React, { useMemo, useState } from 'react';
import Table, { EllipsisText as TableEllipsisText } from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import TabPill, { TabBar } from '@/components/tab/TabPill';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import { EmrRowAction } from '@/components/patient/EmrRowAction';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  UPCOMING_RANGES, DEFAULT_UPCOMING_RANGE,
  getUpcomingAppointments, formatUpcomingDate, upcomingDayLabel,
} from '@/data/upcomingAppointments';

/* แท็บ "นัดล่วงหน้า" ของหน้า worklist ทุกโมดูล
   ══════════════════════════════════════════════════════════════════════════
   ตัวเดียวใช้ทุกหน้า ต่างกันแค่ `depts` ที่หน้านั้นส่งมา — เจ้าหน้าที่แต่ละจุดงาน
   จึงเห็นเฉพาะคิวนัดของงานตัวเอง (มติผู้ใช้ 29 ส.ค. 69)

   ช่วงเวลาเป็นชิปเลือกได้ พรุ่งนี้ → 3 เดือน · เริ่มพรุ่งนี้เสมอเพราะคิวของวันนี้
   อยู่แท็บ "คิววันนี้" แล้ว (ดูเหตุผลเต็มใน `src/data/upcomingAppointments.js`) */

const UpcomingAppointmentsPanel = ({
  /* แผนกที่หน้านี้รับผิดชอบ — ไม่ส่ง = เห็นทุกแผนก (ใช้กับหน้าที่เป็นจุดรวม) */
  depts = null,
  /* ป้ายเมื่อไม่มีนัดในช่วงที่เลือก — หน้าที่ต่างกันพูดคนละคำ */
  emptyMessage = 'ยังไม่มีนัดล่วงหน้าในช่วงนี้',
}) => {
  const [rangeKey, setRangeKey] = useState(DEFAULT_UPCOMING_RANGE);
  const days = UPCOMING_RANGES.find((r) => r.key === rangeKey)?.days ?? 7;

  const rows = useMemo(
    () => getUpcomingAppointments({ days, depts }),
    [days, depts],
  );

  /* จำนวนต่อช่วง — ติดบนชิปเพื่อไม่ให้กดเข้าไปเจอรายการว่าง */
  const counts = useMemo(
    () => Object.fromEntries(UPCOMING_RANGES.map((r) => [
      r.key, getUpcomingAppointments({ days: r.days, depts }).length,
    ])),
    [depts],
  );

  const columns = useMemo(() => ([
    {
      key: 'date', label: 'วันนัด',
      render: (row) => (
        <div className='flex flex-col' style={{ gap: 2 }}>
          <span style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-medium)',
            color: 'var(--text-content-default)',
          }}
          >
            {formatUpcomingDate(row.date)}
          </span>
          {/* "พรุ่งนี้" ต้องอ่านออกทันที เพราะเป็นวันที่ต้องเตรียมของวันนี้ */}
          <span style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
            color: 'var(--text-content-tertiary)',
          }}
          >
            {upcomingDayLabel(row.date)}
          </span>
        </div>
      ),
    },
    { key: 'time', label: 'เวลา' },
    { key: 'hn', label: 'HN' },
    {
      key: 'patient', label: 'ชื่อ-นามสกุล', flex: true, minWidth: 170,
      render: (row) => (
        <div className='flex items-center gap-2 min-w-0'>
          <img
            src={row.patientAvatar || getPatientByHN(row.hn)?.avatarUrl || '/avatars/patient-female-a.png'}
            alt=''
            width={32}
            height={32}
            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          />
          <MaskedWorklistName name={row.patient} recordKey={row.hn} />
        </div>
      ),
    },
    { key: 'clinic', label: 'คลินิก', flex: true, minWidth: 150, render: (row) => <TableEllipsisText text={row.clinic || row.dept || '—'} /> },
    { key: 'doctor', label: 'แพทย์', flex: true, minWidth: 140, render: (row) => <TableEllipsisText text={row.doctor || '—'} /> },
    {
      key: 'type', label: 'ประเภทนัด',
      render: (row) => (
        <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>
          {row.type || 'นัดหมาย'}
        </ColorfulBadge>
      ),
    },
    {
      key: 'note', label: 'สิ่งที่ต้องเตรียม', flex: true, minWidth: 220,
      render: (row) => <TableEllipsisText text={row.note || '—'} />,
    },
    {
      key: 'actions', label: 'การดำเนินการ', sortable: false, align: 'center',
      /* อ่านประวัติได้จากแท็บนี้เลย — เตรียมคนไข้ล่วงหน้าคือการเปิดดูว่าเขา
         ค้างอะไรอยู่ ไม่ใช่แค่รู้ว่าเขาจะมา */
      render: (row) => <EmrRowAction hn={row.hn} name={row.patient} />,
    },
  ]), []);

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        <span
          className='whitespace-nowrap'
          style={{
            color: 'var(--text-brandtag-title)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
            fontWeight: 'var(--type-weight-medium)',
          }}
        >
          ช่วงเวลา:
        </span>
        <TabBar aria-label='ช่วงเวลาของนัดล่วงหน้า'>
          {UPCOMING_RANGES.map((r) => (
            <TabPill
              key={r.key}
              size='small'
              selected={rangeKey === r.key}
              onClick={() => setRangeKey(r.key)}
            >
              {`${r.label} (${counts[r.key] ?? 0})`}
            </TabPill>
          ))}
        </TabBar>
      </div>

      <Table
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id || `${row.hn}-${row.date}-${row.time}`}
        emptyMessage={emptyMessage}
      />
    </div>
  );
};

export default UpcomingAppointmentsPanel;
