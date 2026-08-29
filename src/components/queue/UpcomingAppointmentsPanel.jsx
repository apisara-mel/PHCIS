import React, { useMemo, useState } from 'react';
import Table, { EllipsisText as TableEllipsisText } from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import TabPill, { TabBar } from '@/components/tab/TabPill';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import { EmrRowAction } from '@/components/patient/EmrRowAction';
import { getPatientByHN } from '@/data/patientProfiles';
import DatePicker from '@/components/forms/DatePicker';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import {
  UPCOMING_RANGES, DEFAULT_UPCOMING_RANGE, upcomingDateBounds,
  getUpcomingAppointments, formatUpcomingDate, upcomingDayLabel,
} from '@/data/upcomingAppointments';

/* Date → 'YYYY-MM-DD' ตามเวลาเครื่อง (ห้ามใช้ toISOString ซึ่งเป็น UTC
   แล้วทำให้วันเลื่อนไปหนึ่งวันในโซนเวลาไทย) */
const toDateKey = (d) => (
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null
);

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
  /* เลือกวันเดียว — มาก่อนชิปช่วงเวลาเสมอ กดชิปเมื่อไหร่ถือว่าเลิกเจาะจงวัน
     (มติผู้ใช้ 29 ส.ค. 69) สองตัวกรองนี้ตอบคนละคำถาม จึงไม่ควรทำงานพร้อมกัน
     แล้วให้ผู้ใช้เดาว่าอันไหนชนะ */
  const [pickedDate, setPickedDate] = useState(null);
  const days = UPCOMING_RANGES.find((r) => r.key === rangeKey)?.days ?? 7;
  const bounds = useMemo(() => upcomingDateBounds(), []);

  /* เรียงคอลัมน์ได้ (มติผู้ใช้ 29 ส.ค. 69) — ค่าเริ่มต้นคือวัน+เวลาจากน้อยไปมาก
     ตามที่ getUpcomingAppointments คืนมา กดหัวคอลัมน์แล้วค่อยเปลี่ยน */
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const handleSort = (key) => setSortConfig((prev) => (
    prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' }
  ));

  const baseRows = useMemo(
    () => getUpcomingAppointments({ days, depts, date: toDateKey(pickedDate) }),
    [days, depts, pickedDate],
  );

  const rows = useMemo(() => {
    if (!sortConfig.key) return baseRows;
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    /* คอลัมน์วันนัดเรียงด้วย date+time ไม่ใช่ข้อความที่แสดง ("30 ส.ค. 69"
       เรียงตามตัวอักษรจะได้ลำดับผิดข้ามเดือน) */
    const valueOf = (r) => (sortConfig.key === 'date'
      ? `${r.date} ${r.time}`
      : String(r[sortConfig.key] ?? ''));
    return [...baseRows].sort((a, b) => sign * valueOf(a).localeCompare(valueOf(b), 'th'));
  }, [baseRows, sortConfig]);

  /* จำนวนต่อช่วง — ติดบนชิปเพื่อไม่ให้กดเข้าไปเจอรายการว่าง */
  const counts = useMemo(
    () => Object.fromEntries(UPCOMING_RANGES.map((r) => [
      r.key, getUpcomingAppointments({ days: r.days, depts }).length,
    ])),
    [depts],
  );

  const columns = useMemo(() => ([
    {
      key: 'date', label: 'วันนัด', sortable: true,
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
    { key: 'time', label: 'เวลา', sortable: true },
    { key: 'hn', label: 'HN', sortable: true },
    {
      key: 'patient', label: 'ชื่อ-นามสกุล', flex: true, minWidth: 170, sortable: true,
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
    { key: 'clinic', label: 'คลินิก', flex: true, minWidth: 150, sortable: true, render: (row) => <TableEllipsisText text={row.clinic || row.dept || '—'} /> },
    { key: 'doctor', label: 'แพทย์', flex: true, minWidth: 140, sortable: true, render: (row) => <TableEllipsisText text={row.doctor || '—'} /> },
    {
      key: 'type', label: 'ประเภทนัด', sortable: true,
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
              /* เจาะจงวันอยู่ = ไม่มีชิปไหนถูกเลือก ป้องกันการอ่านผิดว่าตาราง
                 กำลังแสดงช่วงนั้นอยู่ */
              selected={!pickedDate && rangeKey === r.key}
              /* ตัวเลขใช้ prop `count` ของ TabPill ให้เป็นชิปตัวเลขทรงเดียวกับ
                 แท็บ "คิววันนี้ (83)" ด้านบน — เดิมต่อเป็นข้อความ "(11)" ในป้าย
                 ซึ่งอ่านเป็นคนละระบบทั้งที่อยู่จอเดียวกัน (มติผู้ใช้ 29 ส.ค. 69) */
              count={counts[r.key] ?? 0}
              onClick={() => { setRangeKey(r.key); setPickedDate(null); }}
            >
              {r.label}
            </TabPill>
          ))}
        </TabBar>

        {/* เลือกวันที่เจาะจง — ตอบคำถาม "วันที่ 12 มีใครบ้าง" ซึ่งชิปช่วงเวลา
            ตอบไม่ได้ ต้องเลือก 3 เดือนแล้วไล่หาเอง · กรอบวันที่ = พรุ่งนี้ ถึง
            ขอบบนของชิปที่ไกลที่สุด เลือกนอกกรอบแล้วจะได้ตารางว่างโดยไม่รู้สาเหตุ */}
        <span
          className='whitespace-nowrap'
          style={{
            color: 'var(--text-brandtag-title)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
            fontWeight: 'var(--type-weight-medium)',
            marginLeft: 'var(--dim-space-200)',
          }}
        >
          หรือเลือกวันที่:
        </span>
        {/* กว้างพอสำหรับ "30 ส.ค. 69" เท่านั้น — ปล่อยเต็มความกว้างแล้วมันจะกิน
            ทั้งบรรทัดจนชิปช่วงเวลาถูกดันขึ้นไปอยู่คนละแถว */}
        <span className='inline-flex' style={{ width: 'var(--dim-size-2100, 160px)' }}>
          <DatePicker
            size='sm'
            value={pickedDate}
            onChange={setPickedDate}
            minDate={bounds.min}
            maxDate={bounds.max}
            placeholder='เลือกวันที่'
            showLabel={false}
            showFieldName={false}
            showHelperText={false}
          />
        </span>
        {pickedDate && (
          <NeutralSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='close'
            onClick={() => setPickedDate(null)}
          >
            ล้างวันที่
          </NeutralSubdueButton>
        )}
      </div>

      <Table
        columns={columns}
        rows={rows}
        sortConfig={sortConfig}
        onSort={handleSort}
        rowKey={(row) => row.id || `${row.hn}-${row.date}-${row.time}`}
        /* ปักถึงคอลัมน์ชื่อ (วันนัด · เวลา · HN · ชื่อ-นามสกุล) — ตารางนี้กว้าง
           เกินจอ พอเลื่อนไปอ่านคลินิก/แพทย์/สถานะแล้วไม่รู้ว่าเป็นนัดของใคร
           (มติผู้ใช้ 29 ส.ค. 69) */
        stickyColCount={4}
        emptyMessage={emptyMessage}
      />
    </div>
  );
};

export default UpcomingAppointmentsPanel;
